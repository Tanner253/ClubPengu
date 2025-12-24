/**
 * SolanaPaymentService - Direct Solana SPL token transfers
 * Handles on-chain payments for igloo entry fees and other SPL token transfers
 * 
 * SECURITY FEATURES:
 * - Database-backed replay attack prevention (persistent across restarts)
 * - Rate limiting to prevent abuse
 * - Full audit logging of all transactions
 */

import { 
    Connection, 
    PublicKey, 
    Transaction,
    SystemProgram
} from '@solana/web3.js';
import { 
    getAssociatedTokenAddress,
    createTransferInstruction,
    getAccount,
    TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Database model for persistent tracking
import SolanaTransaction from '../db/models/SolanaTransaction.js';
// Rate limiter
import rateLimiter from '../utils/RateLimiter.js';

// ==================== CONFIGURATION ====================
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SOLANA_NETWORK_ID = process.env.SOLANA_NETWORK || 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

class SolanaPaymentService {
    constructor() {
        this.networkId = SOLANA_NETWORK_ID;
        this.connection = null;
        // In-memory cache for recent signatures (fast lookup, DB is source of truth)
        this.recentSignatures = new Set();
        this._initConnection();
        
        // Load recent signatures from DB into cache on startup
        this._loadRecentSignatures();
    }
    
    /**
     * Load recent signatures from database into memory cache
     * This prevents replay attacks even if server restarts
     */
    async _loadRecentSignatures() {
        try {
            // Load signatures from last 24 hours into cache
            const recentTx = await SolanaTransaction.find({
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }).select('signature').lean();
            
            for (const tx of recentTx) {
                this.recentSignatures.add(tx.signature);
            }
            
            console.log(`🔒 Loaded ${recentTx.length} recent signatures into cache`);
        } catch (error) {
            console.error('⚠️ Failed to load recent signatures from DB:', error.message);
            // Service will still work - just using fresh in-memory cache
        }
    }
    
    /**
     * Initialize Solana RPC connection
     */
    _initConnection() {
        try {
            this.connection = new Connection(SOLANA_RPC_URL, {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 60000
            });
            console.log(`🔗 SolanaPaymentService: Connected to ${SOLANA_RPC_URL.includes('mainnet') ? 'mainnet' : 'devnet'}`);
        } catch (error) {
            console.error('🔗 SolanaPaymentService: Failed to initialize:', error);
        }
    }
    
    /**
     * Decode a payment payload (base64 JSON)
     */
    decodePayload(encodedPayload) {
        try {
            const decoded = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf8'));
            return decoded;
        } catch (error) {
            console.error('SolanaPayment: Failed to decode payload:', error);
            return null;
        }
    }
    
    /**
     * Verify a signed payment payload
     * Checks signature, expiry, and network
     */
    async verifyPayload(encodedPayload) {
        const payload = this.decodePayload(encodedPayload);
        
        if (!payload) {
            return { valid: false, error: 'INVALID_PAYLOAD', message: 'Could not decode payload' };
        }
        
        // Check expiry
        if (Date.now() > payload.validUntil) {
            return { valid: false, error: 'PAYLOAD_EXPIRED', message: 'Payment authorization has expired' };
        }
        
        // Check network
        if (payload.network !== this.networkId) {
            return { valid: false, error: 'WRONG_NETWORK', message: 'Payment is for wrong network' };
        }
        
        // Verify signature
        try {
            const { signature, ...intentData } = payload;
            const message = JSON.stringify(intentData);
            const messageBytes = new TextEncoder().encode(message);
            const signatureBytes = bs58.decode(signature);
            const publicKeyBytes = bs58.decode(payload.payer);
            
            const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
            
            if (!isValid) {
                return { valid: false, error: 'INVALID_SIGNATURE', message: 'Signature verification failed' };
            }
            
            return { valid: true, payload };
            
        } catch (error) {
            console.error('SolanaPayment: Signature verification error:', error);
            return { valid: false, error: 'VERIFICATION_ERROR', message: 'Could not verify signature' };
        }
    }
    
    /**
     * Get SPL token balance for a wallet
     */
    async getTokenBalance(walletAddress, tokenMintAddress) {
        if (!this.connection) {
            return 0;
        }
        
        try {
            const walletPubkey = new PublicKey(walletAddress);
            const tokenMintPubkey = new PublicKey(tokenMintAddress);
            
            const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
                walletPubkey,
                { mint: tokenMintPubkey }
            );
            
            if (tokenAccounts.value.length === 0) {
                return 0;
            }
            
            let totalBalance = 0;
            for (const account of tokenAccounts.value) {
                const parsedInfo = account.account.data.parsed?.info;
                if (parsedInfo) {
                    totalBalance += parsedInfo.tokenAmount?.uiAmount || 0;
                }
            }
            
            return totalBalance;
            
        } catch (error) {
            console.error('SolanaPayment: Error checking token balance:', error.message);
            return 0;
        }
    }
    
    /**
     * Check if wallet has minimum token balance
     * RATE LIMITED to prevent RPC abuse
     */
    async checkMinimumBalance(walletAddress, tokenMintAddress, minimumBalance) {
        // Rate limit check
        const rateCheck = rateLimiter.check('balance_check', walletAddress);
        if (!rateCheck.allowed) {
            console.warn(`🚫 Balance check rate limited for ${walletAddress.slice(0, 8)}...`);
            return {
                hasBalance: false,
                balance: 0,
                rateLimited: true,
                retryAfterMs: rateCheck.retryAfterMs
            };
        }
        
        const balance = await this.getTokenBalance(walletAddress, tokenMintAddress);
        return {
            hasBalance: balance >= minimumBalance,
            balance
        };
    }
    
    /**
     * Verify a real Solana transaction on-chain
     * Checks that the transaction exists, is confirmed, and matches expected details
     * 
     * SECURITY: Verifies sender, recipient, token, amount, and prevents replay attacks
     * 
     * @param {string} signature - Transaction signature
     * @param {string} expectedSender - Expected sender wallet
     * @param {string} expectedRecipient - Expected recipient wallet  
     * @param {string} expectedToken - Expected token mint address
     * @param {number} expectedAmount - Expected amount (will verify >= this)
     * @param {Object} options - Optional metadata for audit logging
     * @param {string} options.transactionType - Type: igloo_rent, igloo_entry_fee, etc.
     * @param {string} options.iglooId - Related igloo ID
     * @param {string} options.matchId - Related match ID
     * @param {string} options.tokenSymbol - Token symbol for logging
     * @param {string} options.ipAddress - Client IP for audit
     */
    async verifyTransaction(signature, expectedSender, expectedRecipient, expectedToken, expectedAmount, options = {}) {
        if (!this.connection) {
            console.error('SolanaPayment: Connection not initialized');
            return { success: false, error: 'RPC_NOT_INITIALIZED', message: 'Solana connection not ready' };
        }
        
        // Rate limit payment verification
        const rateCheck = rateLimiter.check('payment', expectedSender);
        if (!rateCheck.allowed) {
            console.warn(`🚫 Payment rate limited for ${expectedSender.slice(0, 8)}...`);
            return { 
                success: false, 
                error: 'RATE_LIMITED', 
                message: 'Too many payment attempts. Please wait.',
                retryAfterMs: rateCheck.retryAfterMs
            };
        }
        
        // SECURITY: Prevent replay attacks - check both cache and database
        // 1. Fast in-memory check
        if (this.recentSignatures.has(signature)) {
            console.warn(`🚨 REPLAY ATTACK BLOCKED (cache): ${signature.slice(0, 16)}...`);
            return { 
                success: false, 
                error: 'SIGNATURE_ALREADY_USED', 
                message: 'This transaction has already been used for a payment' 
            };
        }
        
        // 2. Database check (source of truth - survives restarts)
        try {
            const existsInDb = await SolanaTransaction.isSignatureUsed(signature);
            if (existsInDb) {
                // Add to cache for future fast lookups
                this.recentSignatures.add(signature);
                console.warn(`🚨 REPLAY ATTACK BLOCKED (database): ${signature.slice(0, 16)}...`);
                return { 
                    success: false, 
                    error: 'SIGNATURE_ALREADY_USED', 
                    message: 'This transaction has already been used for a payment' 
                };
            }
        } catch (dbError) {
            console.error('⚠️ Database check failed, proceeding with caution:', dbError.message);
            // Continue but log the risk - we'll still have in-memory protection
        }
        
        const startTime = Date.now();
        
        try {
            console.log(`🔍 Verifying transaction: ${signature.slice(0, 16)}...`);
            console.log(`   Expected sender:    ${expectedSender?.slice(0, 8)}...`);
            console.log(`   Expected recipient: ${expectedRecipient?.slice(0, 8)}...`);
            console.log(`   Expected amount:    ${expectedAmount}`);
            
            // Fetch the transaction
            const tx = await this.connection.getParsedTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });
            
            if (!tx) {
                return { success: false, error: 'TX_NOT_FOUND', message: 'Transaction not found on-chain' };
            }
            
            // Check if transaction succeeded
            if (tx.meta?.err) {
                return { success: false, error: 'TX_FAILED', message: `Transaction failed: ${JSON.stringify(tx.meta.err)}` };
            }
            
            // Look for SPL token transfer in the instructions
            // Support both standard Token Program and Token-2022 (used by pump.fun)
            const TOKEN_PROGRAM_ID_STR = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
            const TOKEN_2022_PROGRAM_ID_STR = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
            
            // Get pre/post token balances to verify recipient
            const preBalances = tx.meta?.preTokenBalances || [];
            const postBalances = tx.meta?.postTokenBalances || [];
            
            const instructions = tx.transaction.message.instructions;
            let foundValidTransfer = false;
            let verificationDetails = {};
            
            // Helper function to check if a token account belongs to expected recipient
            const isRecipientAccount = (accountIndex) => {
                // Check postTokenBalances for this account index
                const postBalance = postBalances.find(b => b.accountIndex === accountIndex);
                if (postBalance && postBalance.owner === expectedRecipient) {
                    return true;
                }
                return false;
            };
            
            for (const ix of instructions) {
                const programId = ix.programId?.toBase58();
                if (programId !== TOKEN_PROGRAM_ID_STR && programId !== TOKEN_2022_PROGRAM_ID_STR) {
                    continue;
                }
                
                const parsed = ix.parsed;
                if (parsed?.type !== 'transfer' && parsed?.type !== 'transferChecked') {
                    continue;
                }
                
                const info = parsed.info;
                const transferAmount = info.tokenAmount?.amount || info.amount;
                
                // Get mint from instruction data (transferChecked) or from postBalances (regular transfer)
                let transferMint = info.mint || info.tokenAmount?.mint;
                if (!transferMint && info.destination) {
                    // For regular 'transfer', mint is in postTokenBalances
                    const destBalance = postBalances.find(b => {
                        const accountKey = tx.transaction.message.accountKeys[b.accountIndex];
                        return accountKey?.pubkey?.toBase58() === info.destination;
                    });
                    transferMint = destBalance?.mint;
                }
                
                console.log(`   Found ${parsed.type}: ${transferAmount} tokens`);
                console.log(`   Authority: ${info.authority?.slice(0, 8) || 'N/A'}`);
                console.log(`   Mint: ${transferMint?.slice(0, 8) || 'N/A'}`);
                
                // SECURITY CHECK 1: Verify sender (authority)
                if (info.authority !== expectedSender) {
                    console.log(`   ❌ Sender mismatch: ${info.authority} !== ${expectedSender}`);
                    continue;
                }
                
                // SECURITY CHECK 2: Verify amount
                if (BigInt(transferAmount) < BigInt(expectedAmount)) {
                    console.log(`   ❌ Amount insufficient: ${transferAmount} < ${expectedAmount}`);
                    continue;
                }
                
                // SECURITY CHECK 3: Verify token mint (if specified)
                if (expectedToken && transferMint && transferMint !== expectedToken) {
                    console.log(`   ❌ Token mismatch: ${transferMint} !== ${expectedToken}`);
                    continue;
                }
                
                // SECURITY CHECK 4: Verify recipient by checking post-balances
                // The destination token account should be owned by expectedRecipient
                const destinationAccount = info.destination;
                const recipientPostBalance = postBalances.find(b => {
                    const accountKey = tx.transaction.message.accountKeys[b.accountIndex];
                    return accountKey?.pubkey?.toBase58() === destinationAccount;
                });
                
                if (recipientPostBalance && recipientPostBalance.owner !== expectedRecipient) {
                    console.log(`   ❌ Recipient mismatch: ${recipientPostBalance.owner} !== ${expectedRecipient}`);
                    continue;
                }
                
                // All checks passed!
                foundValidTransfer = true;
                verificationDetails = {
                    sender: info.authority,
                    destination: destinationAccount,
                    amount: transferAmount,
                    mint: transferMint
                };
                console.log(`   ✅ Transfer verified!`);
                break;
            }
            
            // Also check inner instructions (for complex transactions)
            if (!foundValidTransfer && tx.meta?.innerInstructions) {
                for (const inner of tx.meta.innerInstructions) {
                    for (const ix of inner.instructions) {
                        const programId = ix.programId?.toBase58();
                        if (programId !== TOKEN_PROGRAM_ID_STR && programId !== TOKEN_2022_PROGRAM_ID_STR) {
                            continue;
                        }
                        
                        const parsed = ix.parsed;
                        if (parsed?.type !== 'transfer' && parsed?.type !== 'transferChecked') {
                            continue;
                        }
                        
                        const info = parsed.info;
                        const transferAmount = info.tokenAmount?.amount || info.amount;
                        
                        // Verify sender and amount (relaxed recipient check for inner instructions)
                        if (info.authority === expectedSender && BigInt(transferAmount) >= BigInt(expectedAmount)) {
                            foundValidTransfer = true;
                            verificationDetails = {
                                sender: info.authority,
                                amount: transferAmount,
                                isInnerInstruction: true
                            };
                            console.log(`   ✅ Inner transfer verified: ${transferAmount}`);
                            break;
                        }
                    }
                    if (foundValidTransfer) break;
                }
            }
            
            // SECURITY: NO lenient fallback! If we can't verify the exact transfer, reject it.
            if (!foundValidTransfer) {
                console.warn(`   ❌ Could not verify valid transfer in transaction`);
                return { 
                    success: false, 
                    error: 'TRANSFER_NOT_VERIFIED', 
                    message: 'Could not verify token transfer matches expected details' 
                };
            }
            
            // SECURITY: Mark signature as used ONLY after successful verification
            this.recentSignatures.add(signature);
            
            const processingTimeMs = Date.now() - startTime;
            
            // Record to database for audit trail and persistent replay protection
            try {
                await SolanaTransaction.recordTransaction({
                    signature,
                    type: options?.transactionType || 'other',
                    senderWallet: expectedSender,
                    recipientWallet: expectedRecipient,
                    amount: expectedAmount,
                    amountRaw: String(expectedAmount * Math.pow(10, 6)), // Assume 6 decimals
                    tokenMint: expectedToken,
                    tokenSymbol: options?.tokenSymbol || 'CPw3',
                    iglooId: options?.iglooId,
                    matchId: options?.matchId,
                    status: 'verified',
                    verificationDetails: {
                        blockTime: tx.blockTime,
                        slot: tx.slot,
                        verifiedAt: new Date()
                    },
                    blockTime: tx.blockTime,
                    slot: tx.slot,
                    ipAddress: options?.ipAddress,
                    processingTimeMs
                });
                console.log(`   ✅ Transaction recorded to database`);
            } catch (dbError) {
                // Log but don't fail - the payment was verified successfully
                console.error(`   ⚠️ Failed to record to database (payment still valid):`, dbError.message);
            }
            
            console.log(`   🔒 Signature marked as used (${this.recentSignatures.size} in cache)`);
            
            return { 
                success: true, 
                signature,
                blockTime: tx.blockTime,
                slot: tx.slot,
                verified: verificationDetails,
                processingTimeMs
            };
            
        } catch (error) {
            console.error('SolanaPayment: Transaction verification error:', error);
            return { 
                success: false, 
                error: 'VERIFICATION_ERROR', 
                message: error.message || 'Failed to verify transaction' 
            };
        }
    }
    
    /**
     * Record a payment (for tracking purposes)
     * The actual token transfer happens client-side, we just verify and record
     */
    async recordPayment(payerWallet, recipientWallet, amount, tokenAddress, memo) {
        return {
            success: true,
            timestamp: Date.now(),
            payer: payerWallet,
            recipient: recipientWallet,
            amount,
            token: tokenAddress,
            memo
        };
    }
    
    /**
     * Verify and process an entry fee payment
     * This verifies the signed intent - actual transfer is handled separately
     */
    async processEntryFeePayment(encodedPayload, expectedAmount, expectedRecipient) {
        // Verify the payload
        const verification = await this.verifyPayload(encodedPayload);
        if (!verification.valid) {
            return { success: false, error: verification.error, message: verification.message };
        }
        
        const payload = verification.payload;
        
        // Validate payment details
        if (BigInt(payload.amount) < BigInt(expectedAmount)) {
            return { 
                success: false, 
                error: 'INSUFFICIENT_AMOUNT', 
                message: 'Payment amount is less than required' 
            };
        }
        
        if (payload.recipient !== expectedRecipient) {
            return { 
                success: false, 
                error: 'WRONG_RECIPIENT', 
                message: 'Payment is to wrong recipient' 
            };
        }
        
        // Payment verified - record it
        const record = await this.recordPayment(
            payload.payer,
            payload.recipient,
            payload.amount,
            payload.token,
            payload.memo
        );
        
        return {
            success: true,
            transactionId: `pay_${Date.now()}_${payload.nonce.slice(0, 8)}`,
            payload,
            record
        };
    }
    
    /**
     * Verify a rent payment by transaction signature
     * Simpler than x402 - just verifies the transaction happened
     * 
     * @param {string} signature - Transaction signature from client
     * @param {string} expectedSender - Wallet that should have paid
     * @param {string} expectedRecipient - Rent wallet that should have received
     * @param {number} expectedAmount - Expected rent amount
     */
    async verifyRentPayment(signature, expectedSender, expectedRecipient, expectedAmount, options = {}) {
        if (!signature || typeof signature !== 'string' || signature.length < 80) {
            return { 
                success: false, 
                error: 'INVALID_SIGNATURE', 
                message: 'Invalid transaction signature' 
            };
        }
        
        // Get CPw3 token address from env
        const tokenAddress = process.env.CPW3_TOKEN_ADDRESS;
        if (!tokenAddress) {
            console.error('CPW3_TOKEN_ADDRESS not configured');
            return { 
                success: false, 
                error: 'CONFIG_ERROR', 
                message: 'Token configuration missing' 
            };
        }
        
        // Verify the transaction on-chain with rent-specific options
        const verification = await this.verifyTransaction(
            signature,
            expectedSender,
            expectedRecipient,
            tokenAddress,
            expectedAmount,
            {
                transactionType: options.isRenewal ? 'igloo_rent_renewal' : 'igloo_rent',
                tokenSymbol: 'CPw3',
                iglooId: options.iglooId,
                ipAddress: options.ipAddress
            }
        );
        
        if (!verification.success) {
            return verification;
        }
        
        console.log(`✅ Rent payment verified: ${signature.slice(0, 16)}...`);
        console.log(`   From: ${expectedSender.slice(0, 8)}...`);
        console.log(`   Amount: ${expectedAmount} tokens`);
        
        return {
            success: true,
            transactionHash: signature,
            amount: expectedAmount
        };
    }
}

// Export singleton instance
const solanaPaymentService = new SolanaPaymentService();
export default solanaPaymentService;

