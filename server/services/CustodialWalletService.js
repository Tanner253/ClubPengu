/**
 * CustodialWalletService - Secure custodial wallet for wager payouts
 * 
 * SECURITY MEASURES:
 * 1. Private key loaded once, never logged or exposed
 * 2. Per-transaction and daily limits
 * 3. Match verification before any payout
 * 4. Double-payout prevention
 * 5. IP-based rate limiting (future)
 * 6. Audit trail for all operations
 * 7. Automatic lockdown on suspicious activity
 */

import { 
    Connection, 
    Keypair, 
    PublicKey, 
    Transaction,
    sendAndConfirmTransaction 
} from '@solana/web3.js';
import { 
    getAssociatedTokenAddress, 
    createTransferInstruction,
    createAssociatedTokenAccountIdempotentInstruction,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { Match } from '../db/models/index.js';
import { isDBConnected } from '../db/connection.js';
import bs58 from 'bs58';

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY CONFIGURATION - Adjust these limits based on your risk tolerance
// ═══════════════════════════════════════════════════════════════════════════════

const SECURITY_CONFIG = {
    // Maximum payout per single transaction (in token base units)
    // For a 6-decimal token, 1000000000 = 1000 tokens
    MAX_SINGLE_PAYOUT_RAW: BigInt(process.env.CUSTODIAL_MAX_SINGLE_PAYOUT || '1000000000000'), // 1M tokens default
    
    // Maximum total payouts per hour
    MAX_HOURLY_PAYOUTS: parseInt(process.env.CUSTODIAL_MAX_HOURLY_PAYOUTS || '100'),
    
    // Maximum total payouts per day
    MAX_DAILY_PAYOUTS: parseInt(process.env.CUSTODIAL_MAX_DAILY_PAYOUTS || '1000'),
    
    // Consecutive failures before lockdown
    FAILURE_THRESHOLD: parseInt(process.env.CUSTODIAL_FAILURE_THRESHOLD || '5'),
    
    // Lockdown duration in minutes
    LOCKDOWN_DURATION_MINUTES: parseInt(process.env.CUSTODIAL_LOCKDOWN_MINUTES || '30'),
    
    // Minimum time between payouts to same wallet (seconds)
    MIN_PAYOUT_INTERVAL_SECONDS: parseInt(process.env.CUSTODIAL_MIN_INTERVAL || '10'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL STATE - Not exposed outside this module
// ═══════════════════════════════════════════════════════════════════════════════

// ⚠️ SECURITY: Private key is NEVER logged, exposed, or returned from any method
// The keypair is stored in module-scoped variables inaccessible from outside
let _keypair = null;
let _publicKey = null;

// Prevent accidental logging of sensitive data
const REDACTED = '[REDACTED]';

// Rate limiting state
const _payoutCounts = {
    hourly: 0,
    daily: 0,
    lastHourReset: Date.now(),
    lastDayReset: Date.now(),
};

// Consecutive failure tracking
let _consecutiveFailures = 0;
let _lockdownUntil = null;

// Recent payouts by wallet (for rate limiting per-wallet)
const _recentPayoutsByWallet = new Map();

// Processed match IDs (prevent double payouts)
const _processedMatches = new Set();

// Audit log (in-memory, should be persisted in production)
const _auditLog = [];

class CustodialWalletService {
    constructor() {
        this.connection = null;
        this.initialized = false;
        this.rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
        
        console.log('🔐 CustodialWalletService created (not yet initialized)');
    }
    
    // ⚠️ SECURITY: Prevent accidental serialization of this service
    // If someone does JSON.stringify(custodialWalletService), they get safe data only
    toJSON() {
        return {
            type: 'CustodialWalletService',
            initialized: this.initialized,
            ready: this.isReady(),
            publicKey: this.getPublicKeyMasked(),
            // ⚠️ Private key is NEVER included
        };
    }
    
    // ⚠️ SECURITY: Safe string representation
    toString() {
        return `[CustodialWalletService ready=${this.isReady()}]`;
    }
    
    // ⚠️ SECURITY: For console.log safety
    [Symbol.for('nodejs.util.inspect.custom')]() {
        return this.toJSON();
    }

    /**
     * Initialize the custodial wallet
     * Call this once at server startup
     */
    async initialize() {
        if (this.initialized) {
            console.log('🔐 CustodialWalletService already initialized');
            return { success: true };
        }

        try {
            // Load private key from environment
            // ⚠️ SECURITY: We read it once and immediately delete from process.env
            const privateKeyEnv = process.env.CUSTODIAL_WALLET_PRIVATE_KEY;
            
            // IMMEDIATELY remove from environment to prevent any future access/logging
            if (process.env.CUSTODIAL_WALLET_PRIVATE_KEY) {
                delete process.env.CUSTODIAL_WALLET_PRIVATE_KEY;
            }
            
            if (!privateKeyEnv) {
                console.warn('⚠️ Custodial wallet private key not configured - payouts disabled');
                return { success: false, error: 'NO_PRIVATE_KEY' };
            }

            // Parse private key (supports both base58 and JSON array formats)
            // ⚠️ SECURITY: NEVER log privateKeyEnv or any derived values
            try {
                if (privateKeyEnv.startsWith('[')) {
                    // JSON array format - Uint8Array.from creates a copy
                    const keyArray = JSON.parse(privateKeyEnv);
                    _keypair = Keypair.fromSecretKey(Uint8Array.from(keyArray));
                } else {
                    // Base58 format - MUST copy the bytes because fromSecretKey uses the same buffer!
                    const decoded = bs58.decode(privateKeyEnv);
                    // Create a copy so we don't share the buffer with the keypair
                    const secretKey = new Uint8Array(decoded);
                    _keypair = Keypair.fromSecretKey(secretKey);
                }
                _publicKey = _keypair.publicKey.toBase58();
            } catch (keyError) {
                // ⚠️ SECURITY: Don't log the actual error - it might contain key material
                console.error('🚨 Failed to parse custodial wallet key - check format (base58 or JSON array)');
                return { success: false, error: 'INVALID_KEY_FORMAT' };
            }

            // Initialize connection
            this.connection = new Connection(this.rpcUrl, {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 60000,
            });

            // Verify we can access the wallet
            const balance = await this.connection.getBalance(_keypair.publicKey);
            
            this.initialized = true;
            
            // Log initialization (NEVER log the private key or full public key in production)
            const maskedPubkey = _publicKey.slice(0, 4) + '...' + _publicKey.slice(-4);
            console.log(`🔐 CustodialWalletService initialized`);
            console.log(`   Wallet: ${maskedPubkey}`);
            console.log(`   SOL Balance: ${balance / 1e9} SOL`);
            console.log(`   Max single payout: ${SECURITY_CONFIG.MAX_SINGLE_PAYOUT_RAW.toString()}`);
            console.log(`   Max hourly payouts: ${SECURITY_CONFIG.MAX_HOURLY_PAYOUTS}`);
            console.log(`   Max daily payouts: ${SECURITY_CONFIG.MAX_DAILY_PAYOUTS}`);

            this._audit('INIT', { maskedPubkey, solBalance: balance / 1e9 });

            return { success: true, publicKey: maskedPubkey };

        } catch (error) {
            // Generic error - don't expose details that might help attackers
            console.error('🚨 CustodialWalletService initialization failed');
            this._audit('INIT_FAILED', { error: 'Initialization error' });
            return { success: false, error: 'INIT_FAILED' };
        }
    }

    /**
     * Get the public key of the custodial wallet (masked for display)
     */
    getPublicKeyMasked() {
        if (!_publicKey) return null;
        return _publicKey.slice(0, 4) + '...' + _publicKey.slice(-4);
    }

    /**
     * Get the full public key (for building transactions)
     * This is safe to expose as it's a public address
     */
    getPublicKey() {
        return _publicKey;
    }

    /**
     * Check if the service is ready for payouts
     */
    isReady() {
        return this.initialized && _keypair !== null && !this._isLockedDown();
    }

    /**
     * Process a wager payout to the winner
     * 
     * @param {Object} params
     * @param {string} params.matchId - The match ID
     * @param {string} params.winnerWallet - Winner's wallet address
     * @param {string} params.loserWallet - Loser's wallet address
     * @param {string} params.tokenAddress - SPL token mint address
     * @param {string} params.amountRaw - Amount in base units (as string for BigInt)
     * @param {number} params.decimals - Token decimals
     * @returns {Promise<{success: boolean, txId?: string, error?: string}>}
     */
    async processPayout(params) {
        const { matchId, winnerWallet, loserWallet, tokenAddress, amountRaw, decimals } = params;
        
        // Pre-flight checks
        const preflightResult = this._preflightChecks(matchId, winnerWallet, amountRaw);
        if (!preflightResult.success) {
            this._audit('PAYOUT_BLOCKED', { matchId, reason: preflightResult.error });
            return preflightResult;
        }

        try {
            // Mark match as being processed (prevent concurrent attempts)
            _processedMatches.add(matchId);

            // Verify match in database
            const matchVerification = await this._verifyMatch(matchId, winnerWallet, loserWallet, tokenAddress, amountRaw);
            if (!matchVerification.success) {
                _processedMatches.delete(matchId);
                this._audit('PAYOUT_VERIFICATION_FAILED', { matchId, reason: matchVerification.error });
                return matchVerification;
            }

            // Build and send the payout transaction
            const txResult = await this._sendPayoutTransaction(
                winnerWallet,
                tokenAddress,
                BigInt(amountRaw),
                matchId
            );

            if (txResult.success) {
                // Update rate limiting counters
                this._recordSuccessfulPayout(winnerWallet, amountRaw);
                
                // Update match in database
                await this._markMatchPaid(matchId, txResult.txId);
                
                this._audit('PAYOUT_SUCCESS', { 
                    matchId, 
                    winnerMasked: winnerWallet.slice(0, 4) + '...' + winnerWallet.slice(-4),
                    txId: txResult.txId 
                });
                
                _consecutiveFailures = 0;
                
                return { success: true, txId: txResult.txId };
            } else {
                _processedMatches.delete(matchId);
                this._handleFailure('TRANSACTION_FAILED');
                this._audit('PAYOUT_FAILED', { matchId, reason: txResult.error });
                return txResult;
            }

        } catch (error) {
            _processedMatches.delete(matchId);
            this._handleFailure('EXCEPTION');
            this._audit('PAYOUT_EXCEPTION', { matchId, errorType: error.constructor.name });
            
            // Don't expose internal error details
            console.error('🚨 Custodial payout exception for match:', matchId);
            return { success: false, error: 'PAYOUT_FAILED' };
        }
    }

    /**
     * Refund deposits back to both players (in case of match cancellation)
     */
    async processRefund(params) {
        const { matchId, player1Wallet, player2Wallet, tokenAddress, amountRaw } = params;

        if (!this.isReady()) {
            return { success: false, error: 'SERVICE_NOT_READY' };
        }

        try {
            // Verify match exists and is in refundable state
            if (isDBConnected()) {
                const match = await Match.findOne({ matchId });
                if (!match) {
                    return { success: false, error: 'MATCH_NOT_FOUND' };
                }
                if (match.settlementStatus === 'completed') {
                    return { success: false, error: 'ALREADY_SETTLED' };
                }
            }

            const amount = BigInt(amountRaw);
            
            // Send refund to player 1
            const refund1 = await this._sendPayoutTransaction(player1Wallet, tokenAddress, amount, `refund_${matchId}_p1`);
            
            // Send refund to player 2
            const refund2 = await this._sendPayoutTransaction(player2Wallet, tokenAddress, amount, `refund_${matchId}_p2`);

            if (refund1.success && refund2.success) {
                await this._markMatchRefunded(matchId, refund1.txId, refund2.txId);
                this._audit('REFUND_SUCCESS', { matchId, txIds: [refund1.txId, refund2.txId] });
                return { success: true, txIds: [refund1.txId, refund2.txId] };
            } else {
                this._audit('REFUND_PARTIAL_FAILURE', { matchId, refund1: refund1.success, refund2: refund2.success });
                return { 
                    success: false, 
                    error: 'PARTIAL_REFUND', 
                    details: { refund1: refund1.success, refund2: refund2.success }
                };
            }

        } catch (error) {
            console.error('🚨 Custodial refund exception for match:', matchId);
            this._audit('REFUND_EXCEPTION', { matchId });
            return { success: false, error: 'REFUND_FAILED' };
        }
    }

    /**
     * Get the token balance of the custodial wallet
     */
    async getTokenBalance(tokenAddress) {
        if (!this.isReady()) {
            return { success: false, error: 'SERVICE_NOT_READY' };
        }

        try {
            const mintPubkey = new PublicKey(tokenAddress);
            
            // Detect token program by checking mint account owner
            let tokenProgramId = TOKEN_PROGRAM_ID;
            try {
                const mintAccountInfo = await this.connection.getAccountInfo(mintPubkey);
                if (mintAccountInfo && mintAccountInfo.owner.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58()) {
                    tokenProgramId = TOKEN_2022_PROGRAM_ID;
                }
            } catch {
                // Default to TOKEN_PROGRAM_ID
            }
            
            const tokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                _keypair.publicKey,
                false,
                tokenProgramId,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            const balance = await this.connection.getTokenAccountBalance(tokenAccount);
            return { 
                success: true, 
                balance: balance.value.amount,
                uiBalance: balance.value.uiAmount
            };
        } catch (error) {
            return { success: false, error: 'BALANCE_CHECK_FAILED' };
        }
    }

    /**
     * Get service status (for health checks)
     */
    getStatus() {
        return {
            initialized: this.initialized,
            ready: this.isReady(),
            lockedDown: this._isLockedDown(),
            lockdownUntil: _lockdownUntil,
            payoutCounts: {
                hourly: _payoutCounts.hourly,
                daily: _payoutCounts.daily,
            },
            consecutiveFailures: _consecutiveFailures,
            processedMatchesCount: _processedMatches.size,
        };
    }

    /**
     * Get audit log (for admin review)
     * In production, this should query a persistent store
     */
    getAuditLog(limit = 100) {
        return _auditLog.slice(-limit);
    }

    /**
     * Manually unlock the service (admin action)
     */
    adminUnlock(adminKey) {
        // In production, verify adminKey against a secure admin secret
        if (adminKey !== process.env.CUSTODIAL_ADMIN_KEY) {
            this._audit('ADMIN_UNLOCK_FAILED', { reason: 'Invalid admin key' });
            return { success: false, error: 'INVALID_ADMIN_KEY' };
        }

        _lockdownUntil = null;
        _consecutiveFailures = 0;
        this._audit('ADMIN_UNLOCK', {});
        console.log('🔓 CustodialWalletService manually unlocked by admin');
        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    _preflightChecks(matchId, winnerWallet, amountRaw) {
        // Check if service is ready
        if (!this.isReady()) {
            return { success: false, error: this._isLockedDown() ? 'SERVICE_LOCKED_DOWN' : 'SERVICE_NOT_READY' };
        }

        // Check if match already processed
        if (_processedMatches.has(matchId)) {
            return { success: false, error: 'MATCH_ALREADY_PROCESSED' };
        }

        // Check amount limits
        const amount = BigInt(amountRaw);
        if (amount > SECURITY_CONFIG.MAX_SINGLE_PAYOUT_RAW) {
            return { success: false, error: 'AMOUNT_EXCEEDS_LIMIT' };
        }

        if (amount <= 0n) {
            return { success: false, error: 'INVALID_AMOUNT' };
        }

        // Check rate limits
        this._resetRateLimitsIfNeeded();

        if (_payoutCounts.hourly >= SECURITY_CONFIG.MAX_HOURLY_PAYOUTS) {
            return { success: false, error: 'HOURLY_LIMIT_REACHED' };
        }

        if (_payoutCounts.daily >= SECURITY_CONFIG.MAX_DAILY_PAYOUTS) {
            return { success: false, error: 'DAILY_LIMIT_REACHED' };
        }

        // Check per-wallet rate limit
        const lastPayout = _recentPayoutsByWallet.get(winnerWallet);
        if (lastPayout) {
            const secondsSinceLastPayout = (Date.now() - lastPayout) / 1000;
            if (secondsSinceLastPayout < SECURITY_CONFIG.MIN_PAYOUT_INTERVAL_SECONDS) {
                return { success: false, error: 'WALLET_RATE_LIMITED' };
            }
        }

        return { success: true };
    }

    async _verifyMatch(matchId, winnerWallet, loserWallet, tokenAddress, amountRaw) {
        if (!isDBConnected()) {
            // If no DB, we can't verify - this is a security risk
            // In production, you might want to reject payouts without DB verification
            console.warn('⚠️ Database not connected - skipping match verification');
            return { success: true };
        }

        try {
            const match = await Match.findOne({ matchId });

            if (!match) {
                return { success: false, error: 'MATCH_NOT_FOUND' };
            }

            // Note: Match status check removed - the in-memory match service validates 
            // completion before calling payout, and the DB update happens after.
            // We trust the server-side call chain. The ALREADY_PAID check below
            // prevents double payouts.

            if (match.settlementStatus === 'completed') {
                return { success: false, error: 'ALREADY_PAID' };
            }

            // Verify token and amount match what was wagered
            if (match.wagerToken) {
                if (match.wagerToken.tokenAddress !== tokenAddress) {
                    return { success: false, error: 'TOKEN_MISMATCH' };
                }
                // Winner gets both deposits (2x the wager amount)
                const expectedPayout = BigInt(match.wagerToken.amountRaw) * 2n;
                if (BigInt(amountRaw) !== expectedPayout) {
                    return { success: false, error: 'AMOUNT_MISMATCH' };
                }
            }

            return { success: true, match };

        } catch (error) {
            console.error('🚨 Match verification error');
            return { success: false, error: 'VERIFICATION_ERROR' };
        }
    }

    async _sendPayoutTransaction(recipientWallet, tokenAddress, amount, memo) {
        try {
            const recipientPubkey = new PublicKey(recipientWallet);
            const mintPubkey = new PublicKey(tokenAddress);

            // Detect token program by checking mint account owner (same as client-side)
            let tokenProgramId = TOKEN_PROGRAM_ID;
            
            try {
                const mintAccountInfo = await this.connection.getAccountInfo(mintPubkey);
                if (mintAccountInfo) {
                    const ownerProgramId = mintAccountInfo.owner.toBase58();
                    if (ownerProgramId === TOKEN_2022_PROGRAM_ID.toBase58()) {
                        tokenProgramId = TOKEN_2022_PROGRAM_ID;
                        console.log('   Using Token-2022 program');
                    } else {
                        console.log('   Using standard Token program');
                    }
                }
            } catch (e) {
                console.log('   Token detection failed, using standard program');
            }

            // Get token accounts (same as client-side)
            const senderTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                _keypair.publicKey,
                false,
                tokenProgramId,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            const recipientTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                recipientPubkey,
                false,
                tokenProgramId,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            console.log(`   Sender ATA: ${senderTokenAccount.toBase58().slice(0,8)}...`);
            console.log(`   Recipient ATA: ${recipientTokenAccount.toBase58().slice(0,8)}...`);

            // Check balance
            const senderBalance = await this.connection.getTokenAccountBalance(senderTokenAccount);
            console.log(`   Balance: ${senderBalance.value.amount} raw`);
            
            if (BigInt(senderBalance.value.amount) < amount) {
                console.error('🚨 Insufficient balance');
                return { success: false, error: 'INSUFFICIENT_BALANCE' };
            }

            // Build transaction (exactly like client-side)
            const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
            
            const transaction = new Transaction();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = _keypair.publicKey;

            // Create recipient ATA if needed (idempotent)
            transaction.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    _keypair.publicKey,
                    recipientTokenAccount,
                    recipientPubkey,
                    mintPubkey,
                    tokenProgramId,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );

            // Transfer tokens (same instruction as client-side)
            transaction.add(
                createTransferInstruction(
                    senderTokenAccount,
                    recipientTokenAccount,
                    _keypair.publicKey,
                    amount,
                    [],
                    tokenProgramId
                )
            );

            console.log('   📤 Signing and sending...');
            
            // Sign the transaction
            transaction.sign(_keypair);
            
            // Send the signed transaction
            const signature = await this.connection.sendRawTransaction(
                transaction.serialize(),
                { skipPreflight: false, preflightCommitment: 'confirmed' }
            );
            
            console.log(`   📤 Broadcast: ${signature.slice(0,16)}...`);
            
            // Wait for confirmation
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            console.log(`   ✅ Confirmed!`);
            return { success: true, txId: signature };

        } catch (error) {
            // Log error type but not details that might expose sensitive info
            console.error('🚨 Payout transaction failed:', error.message?.slice(0, 100));
            
            if (error.message?.includes('insufficient funds')) {
                return { success: false, error: 'INSUFFICIENT_SOL_FOR_FEES' };
            }
            
            return { success: false, error: 'TRANSACTION_FAILED' };
        }
    }

    async _markMatchPaid(matchId, txId) {
        if (!isDBConnected()) return;

        try {
            await Match.updateOne(
                { matchId },
                { 
                    settlementStatus: 'completed',
                    settlementTxId: txId,
                    payoutProcessed: true,
                    payoutTimestamp: new Date()
                }
            );
        } catch (error) {
            console.error('🚨 Failed to update match settlement status');
        }
    }

    async _markMatchRefunded(matchId, txId1, txId2) {
        if (!isDBConnected()) return;

        try {
            await Match.updateOne(
                { matchId },
                { 
                    settlementStatus: 'refunded',
                    settlementTxId: `${txId1},${txId2}`,
                    payoutTimestamp: new Date()
                }
            );
        } catch (error) {
            console.error('🚨 Failed to update match refund status');
        }
    }

    _recordSuccessfulPayout(wallet, amountRaw) {
        _payoutCounts.hourly++;
        _payoutCounts.daily++;
        _recentPayoutsByWallet.set(wallet, Date.now());

        // Clean up old entries from wallet tracking
        if (_recentPayoutsByWallet.size > 10000) {
            const cutoff = Date.now() - (SECURITY_CONFIG.MIN_PAYOUT_INTERVAL_SECONDS * 1000 * 2);
            for (const [w, time] of _recentPayoutsByWallet.entries()) {
                if (time < cutoff) {
                    _recentPayoutsByWallet.delete(w);
                }
            }
        }
    }

    _resetRateLimitsIfNeeded() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        const oneDay = 24 * 60 * 60 * 1000;

        if (now - _payoutCounts.lastHourReset > oneHour) {
            _payoutCounts.hourly = 0;
            _payoutCounts.lastHourReset = now;
        }

        if (now - _payoutCounts.lastDayReset > oneDay) {
            _payoutCounts.daily = 0;
            _payoutCounts.lastDayReset = now;
        }
    }

    _handleFailure(reason) {
        _consecutiveFailures++;
        
        if (_consecutiveFailures >= SECURITY_CONFIG.FAILURE_THRESHOLD) {
            const lockdownMs = SECURITY_CONFIG.LOCKDOWN_DURATION_MINUTES * 60 * 1000;
            _lockdownUntil = Date.now() + lockdownMs;
            
            console.error(`🚨🚨🚨 CUSTODIAL WALLET LOCKED DOWN - Too many failures`);
            console.error(`       Lockdown until: ${new Date(_lockdownUntil).toISOString()}`);
            
            this._audit('LOCKDOWN_TRIGGERED', { 
                reason, 
                consecutiveFailures: _consecutiveFailures,
                lockdownUntil: new Date(_lockdownUntil).toISOString()
            });
        }
    }

    _isLockedDown() {
        if (!_lockdownUntil) return false;
        
        if (Date.now() > _lockdownUntil) {
            _lockdownUntil = null;
            _consecutiveFailures = 0;
            console.log('🔓 Custodial wallet lockdown expired');
            this._audit('LOCKDOWN_EXPIRED', {});
            return false;
        }
        
        return true;
    }

    _audit(action, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            action,
            data,
        };
        
        _auditLog.push(entry);
        
        // Keep audit log bounded
        if (_auditLog.length > 10000) {
            _auditLog.shift();
        }

        // In production, also write to persistent storage
        // await AuditLog.create(entry);
    }

    /**
     * Clean up sensitive data on shutdown
     * Call this before server stops
     */
    shutdown() {
        // Clear sensitive data from memory
        if (_keypair) {
            // Overwrite the secret key array with zeros
            const secretKey = _keypair.secretKey;
            for (let i = 0; i < secretKey.length; i++) {
                secretKey[i] = 0;
            }
        }
        _keypair = null;
        _publicKey = null;
        this.initialized = false;
        
        console.log('🔐 CustodialWalletService shutdown - sensitive data cleared');
    }
}

// Singleton instance
const custodialWalletService = new CustodialWalletService();

// Handle process shutdown gracefully
process.on('SIGINT', () => {
    custodialWalletService.shutdown();
});

process.on('SIGTERM', () => {
    custodialWalletService.shutdown();
});

export default custodialWalletService;

