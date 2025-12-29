/**
 * X402Service - Client-side x402 payment integration
 * Handles payment payload creation and wallet signing for Solana
 * 
 * x402 Protocol Flow:
 * 1. Client creates payment payload (signs intent, doesn't move funds)
 * 2. Server verifies payload with facilitator
 * 3. Upon condition met (rent due, entry fee), server settles with facilitator
 * 4. Facilitator executes on-chain transfer
 */

import PhantomWallet from './PhantomWallet.js';
import { 
    CURRENT_NETWORK_ID, 
    CPW3_TOKEN_ADDRESS,
    USDC_TOKEN_ADDRESS,
    X402_FACILITATOR_URL,
    RENT_WALLET_ADDRESS 
} from '../config/solana.js';

class X402Service {
    static instance = null;
    
    constructor() {
        if (X402Service.instance) {
            return X402Service.instance;
        }
        
        this.wallet = PhantomWallet.getInstance();
        this.networkId = CURRENT_NETWORK_ID;
        this.facilitatorUrl = X402_FACILITATOR_URL;
        
        X402Service.instance = this;
    }
    
    static getInstance() {
        if (!X402Service.instance) {
            X402Service.instance = new X402Service();
        }
        return X402Service.instance;
    }
    
    /**
     * Check if wallet is ready for x402 payments
     */
    isReady() {
        return this.wallet.isConnected();
    }
    
    /**
     * Get connected wallet address
     */
    getWalletAddress() {
        return this.wallet.getPublicKey();
    }
    
    /**
     * Create a payment authorization payload for igloo rent
     * This signs the intent but does NOT move funds
     * 
     * @param {Object} options - Payment options
     * @param {number} options.amount - Amount in token base units
     * @param {string} options.token - Token address (defaults to $WADDLE)
     * @param {string} options.recipient - Recipient wallet address
     * @param {string} options.memo - Transaction memo/reference
     * @param {number} options.validityMinutes - How long the payment is valid (default 30)
     * @returns {Promise<{success: boolean, payload?: string, error?: string}>}
     */
    async createPaymentPayload(options) {
        const {
            amount,
            token = CPW3_TOKEN_ADDRESS,
            recipient = RENT_WALLET_ADDRESS,
            memo = '',
            validityMinutes = 30
        } = options;
        
        if (!this.wallet.isConnected()) {
            return {
                success: false,
                error: 'WALLET_NOT_CONNECTED',
                message: 'Please connect your wallet first'
            };
        }
        
        try {
            const payer = this.wallet.getPublicKey();
            const validUntil = Date.now() + (validityMinutes * 60 * 1000);
            const nonce = this._generateNonce();
            
            // Parse memo for display (format: "type:reference:symbol")
            const memoParts = memo.split(':');
            const wagerType = memoParts[0] || 'payment';
            const tokenSymbol = memoParts[2] || 'tokens';
            
            // Format amount for display (assume 6 decimals if not specified)
            const decimals = 6;
            const displayAmount = (Number(amount) / Math.pow(10, decimals)).toFixed(2);
            
            // Create the payment intent message
            const paymentIntent = {
                version: '1.0',
                network: this.networkId,
                payer,
                recipient,
                token,
                amount: amount.toString(),
                validUntil,
                nonce,
                memo
            };
            
            // Create a human-readable message for signing
            // This is what the user sees in their wallet
            const humanReadableMessage = [
                '🎮 Web3 Wager Authorization',
                '─'.repeat(40),
                '',
                `Action: ${wagerType === 'wager' ? 'Game Wager' : 'Payment'}`,
                `Amount: ${displayAmount} ${tokenSymbol}`,
                `Recipient: ${recipient.slice(0, 8)}...${recipient.slice(-4)}`,
                '',
                'By signing, you authorize this payment to be',
                'transferred if you lose the match.',
                '',
                `Valid for: ${validityMinutes} minutes`,
                `Nonce: ${nonce.slice(0, 8)}...`,
                '',
                '─'.repeat(40),
                'This signature does NOT move funds immediately.',
                'Funds transfer only if you lose the game.',
            ].join('\n');
            
            // Sign the human-readable message (includes all data for verification)
            const signResult = await this.wallet.signMessage(humanReadableMessage);
            
            if (!signResult.success) {
                return {
                    success: false,
                    error: signResult.error,
                    message: signResult.message
                };
            }
            
            // Create the full payload (intent + signature)
            const payload = {
                ...paymentIntent,
                signature: signResult.signature
            };
            
            // Encode as base64 for transport
            const encodedPayload = btoa(JSON.stringify(payload));
            
            return {
                success: true,
                payload: encodedPayload,
                paymentDetails: paymentIntent
            };
            
        } catch (error) {
            console.error('x402 payment creation error:', error);
            return {
                success: false,
                error: 'PAYMENT_CREATION_FAILED',
                message: error.message || 'Failed to create payment'
            };
        }
    }
    
    /**
     * Create rent payment authorization
     * 
     * @param {string} iglooId - The igloo being rented
     * @param {number} days - Number of days (usually 1)
     * @param {number} dailyRentCpw3 - Daily rent in $WADDLE
     * @returns {Promise<Object>}
     */
    async createRentPayment(iglooId, days, dailyRentCpw3) {
        const amount = days * dailyRentCpw3;
        return this.createPaymentPayload({
            amount,
            token: CPW3_TOKEN_ADDRESS,
            recipient: RENT_WALLET_ADDRESS,
            memo: `rent:${iglooId}:${days}days`,
            validityMinutes: 60 // Rent payments valid for 1 hour
        });
    }
    
    /**
     * Create entry fee payment authorization
     * 
     * @param {string} iglooId - The igloo to enter
     * @param {number} entryFee - Entry fee amount
     * @param {string} ownerWallet - Igloo owner's wallet (receives fee)
     * @param {string} tokenAddress - Token address for the fee (defaults to $WADDLE)
     * @returns {Promise<Object>}
     */
    async createEntryFeePayment(iglooId, entryFee, ownerWallet, tokenAddress = null) {
        return this.createPaymentPayload({
            amount: entryFee,
            token: tokenAddress || CPW3_TOKEN_ADDRESS,
            recipient: ownerWallet,
            memo: `entry:${iglooId}`,
            validityMinutes: 10 // Entry fees valid for 10 minutes
        });
    }
    
    /**
     * Create wager payment authorization (for P2P matches)
     * Supports any SPL token for wagering
     * 
     * @param {Object} wagerDetails - Wager information
     * @param {string} wagerDetails.amount - Wager amount (raw, full precision)
     * @param {string} wagerDetails.challengeId - Challenge identifier (for pre-match)
     * @param {string} wagerDetails.matchId - Match identifier (optional, set after accept)
     * @param {string} wagerDetails.opponentWallet - Opponent's wallet
     * @param {string} wagerDetails.tokenAddress - SPL token mint address (defaults to $WADDLE)
     * @param {string} wagerDetails.tokenSymbol - Token symbol for display
     * @returns {Promise<Object>}
     */
    async createWagerPayment(wagerDetails) {
        const { 
            amount, 
            challengeId,
            matchId, 
            opponentWallet,
            tokenAddress = CPW3_TOKEN_ADDRESS,
            tokenSymbol = '$WADDLE'
        } = wagerDetails;
        
        // Use challengeId for pre-match, matchId once match starts
        const reference = matchId || challengeId || `wager_${Date.now()}`;
        
        return this.createPaymentPayload({
            amount,
            token: tokenAddress,
            recipient: opponentWallet, // Winner gets paid directly
            memo: `wager:${reference}:${tokenSymbol}`,
            validityMinutes: 30 // Wagers valid for 30 minutes (covers match duration)
        });
    }
    
    /**
     * Decode a payment payload (for display/verification)
     * 
     * @param {string} encodedPayload - Base64 encoded payload
     * @returns {Object|null}
     */
    decodePayload(encodedPayload) {
        try {
            const decoded = JSON.parse(atob(encodedPayload));
            return decoded;
        } catch (error) {
            console.error('Failed to decode payload:', error);
            return null;
        }
    }
    
    /**
     * Check if a payment payload has expired
     * 
     * @param {string} encodedPayload - Base64 encoded payload
     * @returns {boolean}
     */
    isPayloadExpired(encodedPayload) {
        const payload = this.decodePayload(encodedPayload);
        if (!payload || !payload.validUntil) return true;
        return Date.now() > payload.validUntil;
    }
    
    /**
     * Generate a unique nonce for payment
     */
    _generateNonce() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}

export default X402Service;


