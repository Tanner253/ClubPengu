/**
 * DailyBonusService - Daily login bonus with WADDLE token rewards
 * 
 * REQUIREMENTS:
 * 1. User must spend 1 hour on server to be eligible
 * 2. Can claim once every 24 hours
 * 3. Claims 10,000 WADDLE from custodial wallet
 * 4. Protections against replay attacks and double claims
 */

import { User, Transaction } from '../db/models/index.js';
import { isDBConnected } from '../db/connection.js';
import custodialWalletService from './CustodialWalletService.js';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // Time requirements
    REQUIRED_SESSION_MINUTES: 60,           // 1 hour of play time required
    COOLDOWN_HOURS: 24,                     // 24 hour cooldown between claims
    
    // Reward amount
    REWARD_AMOUNT: 5000,                    // 5,000 WADDLE tokens ($CP)
    
    // Token config (loaded after env)
    getTokenAddress: () => process.env.CPW3_TOKEN_ADDRESS || '9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump',
    TOKEN_DECIMALS: 6,                      // WADDLE has 6 decimals
    
    // Security
    NONCE_EXPIRY_MINUTES: 5,                // Nonce expires after 5 minutes
};

// Track active sessions (walletAddress -> session info)
const _activeSessions = new Map();

// Track in-flight claims to prevent race conditions
const _claimsInProgress = new Set();

// Nonce storage for replay protection (nonce -> timestamp)
const _usedNonces = new Map();

class DailyBonusService {
    constructor() {
        // Clean up old nonces periodically
        setInterval(() => this._cleanupNonces(), 60 * 1000);
        console.log('🎁 DailyBonusService initialized');
    }
    
    /**
     * Start tracking session time for a player
     * Called when player authenticates
     */
    async startSession(walletAddress) {
        if (!walletAddress) return;
        
        const now = new Date();
        
        // Initialize session tracking
        _activeSessions.set(walletAddress, {
            startTime: now,
            lastUpdate: now,
            accumulatedMinutes: 0
        });
        
        // Update user's session start in DB
        if (isDBConnected()) {
            try {
                await User.updateOne(
                    { walletAddress },
                    { 
                        'dailyBonus.sessionStartTime': now,
                        'dailyBonus.currentSessionMinutes': 0
                    }
                );
            } catch (err) {
                console.error('[DailyBonus] Failed to update session start:', err.message);
            }
        }
        
        console.log(`🎁 [DailyBonus] Session started for ${walletAddress.slice(0, 8)}...`);
    }
    
    /**
     * Update session time (call periodically, e.g., every minute)
     */
    async updateSessionTime(walletAddress) {
        const session = _activeSessions.get(walletAddress);
        if (!session) return;
        
        const now = new Date();
        const minutesSinceLastUpdate = (now - session.lastUpdate) / (1000 * 60);
        
        // Only count if reasonable (< 2 minutes since last update - prevents manipulation)
        if (minutesSinceLastUpdate < 2) {
            session.accumulatedMinutes += minutesSinceLastUpdate;
        }
        session.lastUpdate = now;
        
        // Update DB periodically (every 5 minutes)
        if (session.accumulatedMinutes % 5 < 1) {
            if (isDBConnected()) {
                try {
                    await User.updateOne(
                        { walletAddress },
                        { 'dailyBonus.currentSessionMinutes': Math.floor(session.accumulatedMinutes) }
                    );
                } catch (err) {
                    // Silent fail - not critical
                }
            }
        }
    }
    
    /**
     * End session tracking for a player
     * Called when player disconnects
     */
    async endSession(walletAddress) {
        const session = _activeSessions.get(walletAddress);
        if (!session) return;
        
        // Final update to DB
        if (isDBConnected()) {
            try {
                await User.updateOne(
                    { walletAddress },
                    { 
                        'dailyBonus.currentSessionMinutes': Math.floor(session.accumulatedMinutes),
                        $inc: { 'stats.session.totalPlayTimeMinutes': Math.floor(session.accumulatedMinutes) }
                    }
                );
            } catch (err) {
                console.error('[DailyBonus] Failed to save session time:', err.message);
            }
        }
        
        _activeSessions.delete(walletAddress);
        console.log(`🎁 [DailyBonus] Session ended for ${walletAddress.slice(0, 8)}... (${Math.floor(session.accumulatedMinutes)} min)`);
    }
    
    /**
     * Get current session minutes for a player
     */
    getSessionMinutes(walletAddress) {
        const session = _activeSessions.get(walletAddress);
        if (!session) return 0;
        
        const now = new Date();
        const currentMinutes = (now - session.startTime) / (1000 * 60);
        return Math.floor(currentMinutes);
    }
    
    /**
     * Get daily bonus status for a player
     * Returns eligibility, time remaining, etc.
     */
    async getStatus(walletAddress) {
        if (!walletAddress) {
            return { error: 'NO_WALLET' };
        }
        
        if (!isDBConnected()) {
            return { error: 'DB_NOT_CONNECTED' };
        }
        
        try {
            const user = await User.findOne({ walletAddress });
            if (!user) {
                return { error: 'USER_NOT_FOUND' };
            }
            
            const now = new Date();
            const sessionMinutes = this.getSessionMinutes(walletAddress);
            
            // Check if 24h cooldown has passed
            const lastClaim = user.dailyBonus?.lastClaimAt;
            const cooldownMs = CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000;
            const cooldownExpired = !lastClaim || (now - lastClaim) >= cooldownMs;
            
            // Time until cooldown expires
            let timeUntilClaim = 0;
            if (lastClaim && !cooldownExpired) {
                timeUntilClaim = cooldownMs - (now - lastClaim);
            }
            
            // Check session time requirement
            const hasEnoughTime = sessionMinutes >= CONFIG.REQUIRED_SESSION_MINUTES;
            const minutesRemaining = Math.max(0, CONFIG.REQUIRED_SESSION_MINUTES - sessionMinutes);
            
            // Can claim if cooldown expired AND has enough session time
            const canClaim = cooldownExpired && hasEnoughTime;
            
            // Get custodial wallet balance
            let custodialBalance = null;
            if (custodialWalletService.isReady()) {
                const balanceResult = await custodialWalletService.getTokenBalance(CONFIG.getTokenAddress());
                if (balanceResult.success) {
                    custodialBalance = balanceResult.uiBalance;
                }
            }
            
            return {
                success: true,
                canClaim,
                cooldownExpired,
                timeUntilClaim,                                    // ms until can claim again
                sessionMinutes,                                    // current session time
                requiredMinutes: CONFIG.REQUIRED_SESSION_MINUTES,  // required time
                minutesRemaining,                                  // minutes until eligible
                rewardAmount: CONFIG.REWARD_AMOUNT,                // 10,000 WADDLE
                totalClaimed: user.dailyBonus?.totalClaimed || 0,
                totalWaddleEarned: user.dailyBonus?.totalWaddleEarned || 0,
                lastClaimAt: lastClaim,
                custodialBalance                                   // Show wallet balance
            };
            
        } catch (error) {
            console.error('[DailyBonus] getStatus error:', error.message);
            return { error: 'STATUS_CHECK_FAILED' };
        }
    }
    
    /**
     * Claim the daily bonus
     * Sends WADDLE tokens from custodial wallet to user
     * 
     * @param {string} walletAddress - User's wallet address
     * @param {string} clientNonce - Client-generated nonce for replay protection
     * @returns {Promise<{success: boolean, txSignature?: string, error?: string}>}
     */
    async claim(walletAddress, clientNonce) {
        // ═══════════════════════════════════════════════════════════════════
        // SECURITY CHECKS
        // ═══════════════════════════════════════════════════════════════════
        
        if (!walletAddress) {
            return { success: false, error: 'NO_WALLET' };
        }
        
        if (!clientNonce) {
            return { success: false, error: 'NO_NONCE', message: 'Request nonce required' };
        }
        
        // Check for replay attack (nonce already used)
        if (_usedNonces.has(clientNonce)) {
            console.warn(`🚨 [DailyBonus] Replay attack detected! Nonce: ${clientNonce.slice(0, 16)}...`);
            return { success: false, error: 'NONCE_REUSED', message: 'Request already processed' };
        }
        
        // Prevent concurrent claims for same wallet
        if (_claimsInProgress.has(walletAddress)) {
            return { success: false, error: 'CLAIM_IN_PROGRESS', message: 'Claim already being processed' };
        }
        
        if (!isDBConnected()) {
            return { success: false, error: 'DB_NOT_CONNECTED' };
        }
        
        if (!custodialWalletService.isReady()) {
            return { success: false, error: 'CUSTODIAL_NOT_READY', message: 'Reward system temporarily unavailable' };
        }
        
        // Mark claim in progress
        _claimsInProgress.add(walletAddress);
        
        try {
            // ═══════════════════════════════════════════════════════════════
            // ELIGIBILITY VERIFICATION (Double-check in DB)
            // ═══════════════════════════════════════════════════════════════
            
            const user = await User.findOne({ walletAddress });
            if (!user) {
                return { success: false, error: 'USER_NOT_FOUND' };
            }
            
            const now = new Date();
            const sessionMinutes = this.getSessionMinutes(walletAddress);
            
            // Check session time requirement
            if (sessionMinutes < CONFIG.REQUIRED_SESSION_MINUTES) {
                const remaining = CONFIG.REQUIRED_SESSION_MINUTES - sessionMinutes;
                return { 
                    success: false, 
                    error: 'INSUFFICIENT_TIME', 
                    message: `Need ${remaining} more minutes of play time`,
                    minutesRemaining: remaining
                };
            }
            
            // Check 24h cooldown
            const lastClaim = user.dailyBonus?.lastClaimAt;
            const cooldownMs = CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000;
            
            if (lastClaim && (now - lastClaim) < cooldownMs) {
                const timeRemaining = cooldownMs - (now - lastClaim);
                const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
                return { 
                    success: false, 
                    error: 'COOLDOWN_ACTIVE', 
                    message: `Can claim again in ${hoursRemaining} hours`,
                    timeRemaining
                };
            }
            
            // ═══════════════════════════════════════════════════════════════
            // ATOMIC CLAIM WITH NONCE PROTECTION
            // ═══════════════════════════════════════════════════════════════
            
            // Generate server-side claim ID
            const claimId = `daily_${walletAddress.slice(0, 8)}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            
            // Mark nonce as used BEFORE sending transaction
            _usedNonces.set(clientNonce, Date.now());
            
            // Update user BEFORE blockchain tx (marks as claimed to prevent double-spend)
            // Use atomic operation with nonce check
            const updateResult = await User.updateOne(
                { 
                    walletAddress,
                    // Ensure cooldown hasn't been bypassed by another request
                    $or: [
                        { 'dailyBonus.lastClaimAt': null },
                        { 'dailyBonus.lastClaimAt': { $lt: new Date(now - cooldownMs) } }
                    ]
                },
                {
                    'dailyBonus.lastClaimAt': now,
                    'dailyBonus.claimNonce': claimId,
                    $inc: {
                        'dailyBonus.totalClaimed': 1,
                        'dailyBonus.totalWaddleEarned': CONFIG.REWARD_AMOUNT
                    }
                }
            );
            
            // If no document was modified, another claim beat us
            if (updateResult.modifiedCount === 0) {
                _usedNonces.delete(clientNonce); // Allow retry
                return { success: false, error: 'ALREADY_CLAIMED', message: 'Bonus already claimed' };
            }
            
            console.log(`🎁 [DailyBonus] Processing claim for ${walletAddress.slice(0, 8)}...`);
            console.log(`   Claim ID: ${claimId}`);
            console.log(`   Reward: ${CONFIG.REWARD_AMOUNT} WADDLE`);
            
            // ═══════════════════════════════════════════════════════════════
            // SEND TOKENS FROM CUSTODIAL WALLET
            // ═══════════════════════════════════════════════════════════════
            
            const tokenAddress = CONFIG.getTokenAddress();
            const amountRaw = BigInt(CONFIG.REWARD_AMOUNT) * BigInt(10 ** CONFIG.TOKEN_DECIMALS);
            
            const txResult = await custodialWalletService._sendPayoutTransaction(
                walletAddress,
                tokenAddress,
                amountRaw,
                claimId
            );
            
            if (txResult.success) {
                console.log(`🎁 [DailyBonus] ✅ Claim successful!`);
                console.log(`   Tx: ${txResult.txId}`);
                
                // Record transaction
                if (isDBConnected()) {
                    try {
                        await Transaction.record({
                            type: 'daily_bonus',
                            fromWallet: 'custodial',
                            toWallet: walletAddress,
                            amount: CONFIG.REWARD_AMOUNT,
                            currency: 'WADDLE',
                            relatedData: {
                                claimId,
                                txSignature: txResult.txId,
                                sessionMinutes
                            },
                            reason: 'Daily login bonus claim'
                        });
                    } catch (txErr) {
                        // Non-critical - log but don't fail
                        console.warn('[DailyBonus] Failed to record transaction:', txErr.message);
                    }
                }
                
                return {
                    success: true,
                    txSignature: txResult.txId,
                    amount: CONFIG.REWARD_AMOUNT,
                    tokenSymbol: '$WADDLE',
                    claimId,
                    message: `Successfully claimed ${CONFIG.REWARD_AMOUNT.toLocaleString()} $WADDLE!`
                };
                
            } else {
                // Transaction failed - REVERT the DB update
                console.error(`🎁 [DailyBonus] ❌ Transaction failed: ${txResult.error}`);
                
                await User.updateOne(
                    { walletAddress, 'dailyBonus.claimNonce': claimId },
                    {
                        'dailyBonus.lastClaimAt': lastClaim, // Restore previous claim time
                        $inc: {
                            'dailyBonus.totalClaimed': -1,
                            'dailyBonus.totalWaddleEarned': -CONFIG.REWARD_AMOUNT
                        }
                    }
                );
                
                return {
                    success: false,
                    error: 'TRANSACTION_FAILED',
                    message: 'Token transfer failed. Please try again.'
                };
            }
            
        } catch (error) {
            console.error('[DailyBonus] Claim error:', error.message);
            return { success: false, error: 'CLAIM_FAILED', message: error.message };
            
        } finally {
            // Always release the claim lock
            _claimsInProgress.delete(walletAddress);
        }
    }
    
    /**
     * Clean up expired nonces
     * @private
     */
    _cleanupNonces() {
        const expiryMs = CONFIG.NONCE_EXPIRY_MINUTES * 60 * 1000;
        const now = Date.now();
        
        for (const [nonce, timestamp] of _usedNonces) {
            if (now - timestamp > expiryMs) {
                _usedNonces.delete(nonce);
            }
        }
    }
}

// Export singleton
const dailyBonusService = new DailyBonusService();
export default dailyBonusService;

