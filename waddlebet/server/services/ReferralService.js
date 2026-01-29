/**
 * ReferralService - Revenue sharing referral system
 * 
 * REFERRAL MODEL:
 * - Tier 1: 15% of platform revenue from direct referrals
 * - Tier 2: 3% of platform revenue from indirect referrals
 * - Payout threshold: 0.5 SOL
 * - No cap on earnings
 * 
 * LAUNCH PROMO:
 * - Referrer gets 1000 $CP when referred user plays 1 hour
 * - Referred user gets 1000 $CP when they play 1 hour
 * - Limited time promotion
 * 
 * REUSES:
 * - DailyBonusService playtime tracking (getSessionMinutes)
 * - CustodialWalletService for token payouts
 * - User model for balance/stats tracking
 */

import { User, Transaction } from '../db/models/index.js';
import { isDBConnected } from '../db/connection.js';
import custodialWalletService from './CustodialWalletService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // Revenue share percentages (as decimals)
    TIER_1_PERCENT: 0.15,           // 15% for direct referrals
    TIER_2_PERCENT: 0.03,           // 3% for indirect referrals
    
    // Payout threshold (in lamports)
    // 0.5 SOL = 500,000,000 lamports
    PAYOUT_THRESHOLD_LAMPORTS: BigInt(500_000_000),
    
    // Launch promo settings
    PROMO_ENABLED: true,
    PROMO_REWARD_AMOUNT: 1000,      // 1000 $CP tokens
    PROMO_REQUIRED_MINUTES: 60,     // 1 hour of playtime required
    
    // Token config
    getTokenAddress: () => process.env.CPW3_TOKEN_ADDRESS || '9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump',
    TOKEN_DECIMALS: 6,
    
    // Pebble to SOL conversion
    PEBBLES_PER_SOL: 1000,
    LAMPORTS_PER_SOL: 1_000_000_000
};

class ReferralService {
    constructor(dailyBonusService) {
        this.dailyBonusService = dailyBonusService;
        console.log('🔗 ReferralService initialized');
        console.log(`   Tier 1: ${CONFIG.TIER_1_PERCENT * 100}%`);
        console.log(`   Tier 2: ${CONFIG.TIER_2_PERCENT * 100}%`);
        console.log(`   Payout threshold: ${Number(CONFIG.PAYOUT_THRESHOLD_LAMPORTS) / CONFIG.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Promo: ${CONFIG.PROMO_ENABLED ? `${CONFIG.PROMO_REWARD_AMOUNT} $CP after ${CONFIG.PROMO_REQUIRED_MINUTES}min` : 'Disabled'}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // REFERRAL REGISTRATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Register a referral for a new user
     * Called during authentication when user has a referral code
     * 
     * @param {string} newUserWallet - New user's wallet address
     * @param {string} referralCode - Referral code (usually referrer's username)
     * @returns {Promise<{success: boolean, referrer?: object, error?: string}>}
     */
    async registerReferral(newUserWallet, referralCode) {
        if (!referralCode || !newUserWallet) {
            return { success: false, error: 'MISSING_PARAMS' };
        }
        
        if (!isDBConnected()) {
            return { success: false, error: 'DB_NOT_CONNECTED' };
        }
        
        try {
            // Find the new user
            const newUser = await User.findOne({ walletAddress: newUserWallet });
            if (!newUser) {
                return { success: false, error: 'USER_NOT_FOUND' };
            }
            
            // Check if user already has a referrer (can only use one code)
            if (newUser.referral?.referredBy) {
                console.log(`🔗 [Referral] User ${newUserWallet.slice(0, 8)}... already has referrer`);
                return { success: false, error: 'ALREADY_HAS_REFERRER' };
            }
            
            // Find referrer by referral code (username or custom code)
            // Try exact match on referralCode first, then username
            let referrer = await User.findOne({ 'referral.referralCode': referralCode });
            if (!referrer) {
                referrer = await User.findOne({ username: referralCode });
            }
            
            if (!referrer) {
                console.log(`🔗 [Referral] Invalid code: ${referralCode}`);
                return { success: false, error: 'INVALID_REFERRAL_CODE' };
            }
            
            // Can't refer yourself
            if (referrer.walletAddress === newUserWallet) {
                return { success: false, error: 'CANNOT_REFER_SELF' };
            }
            
            // Register the referral
            const now = new Date();
            
            // Update new user with referrer
            await User.updateOne(
                { walletAddress: newUserWallet },
                {
                    'referral.referredBy': referrer.walletAddress,
                    'referral.referredAt': now,
                    // Set their own referral code to their username by default
                    'referral.referralCode': newUser.username
                }
            );
            
            // Increment referrer's tier 1 count
            await User.updateOne(
                { walletAddress: referrer.walletAddress },
                {
                    $inc: { 'referral.stats.tier1Count': 1 },
                    // Set their referral code if not set
                    $setOnInsert: { 'referral.referralCode': referrer.username }
                }
            );
            
            // Also ensure referral code is set
            if (!referrer.referral?.referralCode) {
                await User.updateOne(
                    { walletAddress: referrer.walletAddress },
                    { 'referral.referralCode': referrer.username }
                );
            }
            
            console.log(`🔗 [Referral] ✅ ${newUser.username} referred by ${referrer.username}`);
            
            // Check for tier 2 (referrer's referrer)
            if (referrer.referral?.referredBy) {
                await User.updateOne(
                    { walletAddress: referrer.referral.referredBy },
                    { $inc: { 'referral.stats.tier2Count': 1 } }
                );
                console.log(`   └─ Tier 2 for ${referrer.referral.referredBy.slice(0, 8)}...`);
            }
            
            return {
                success: true,
                referrer: {
                    username: referrer.username,
                    walletAddress: referrer.walletAddress
                }
            };
            
        } catch (error) {
            console.error('[Referral] Registration error:', error.message);
            return { success: false, error: 'REGISTRATION_FAILED' };
        }
    }
    
    /**
     * Generate/get referral link for a user
     */
    async getReferralInfo(walletAddress) {
        const user = await User.findOne({ walletAddress });
        if (!user) {
            return { success: false, error: 'USER_NOT_FOUND' };
        }
        
        // Ensure referral code is set (default to username)
        let referralCode = user.referral?.referralCode;
        if (!referralCode) {
            referralCode = user.username;
            await User.updateOne(
                { walletAddress },
                { 'referral.referralCode': referralCode }
            );
        }
        
        const pendingLamports = BigInt(user.referral?.earnings?.pendingLamports || '0');
        const totalPaidLamports = BigInt(user.referral?.earnings?.totalPaidOutLamports || '0');
        const tier1Earnings = BigInt(user.referral?.stats?.tier1EarningsLamports || '0');
        const tier2Earnings = BigInt(user.referral?.stats?.tier2EarningsLamports || '0');
        
        return {
            success: true,
            referralCode,
            referralLink: `https://waddle.bet/ref/${referralCode}`,
            stats: {
                tier1Count: user.referral?.stats?.tier1Count || 0,
                tier1ActiveCount: user.referral?.stats?.tier1ActiveCount || 0,
                tier2Count: user.referral?.stats?.tier2Count || 0,
                totalNetworkRevenueSol: Number(BigInt(user.referral?.stats?.totalNetworkRevenueLamports || '0')) / CONFIG.LAMPORTS_PER_SOL
            },
            earnings: {
                pendingSol: Number(pendingLamports) / CONFIG.LAMPORTS_PER_SOL,
                pendingLamports: pendingLamports.toString(),
                totalPaidOutSol: Number(totalPaidLamports) / CONFIG.LAMPORTS_PER_SOL,
                tier1EarningsSol: Number(tier1Earnings) / CONFIG.LAMPORTS_PER_SOL,
                tier2EarningsSol: Number(tier2Earnings) / CONFIG.LAMPORTS_PER_SOL,
                thresholdSol: Number(CONFIG.PAYOUT_THRESHOLD_LAMPORTS) / CONFIG.LAMPORTS_PER_SOL,
                canCashOut: pendingLamports >= CONFIG.PAYOUT_THRESHOLD_LAMPORTS
            },
            lastPayout: user.referral?.earnings?.lastPayoutAt ? {
                at: user.referral.earnings.lastPayoutAt,
                tx: user.referral.earnings.lastPayoutTx,
                amountSol: Number(BigInt(user.referral.earnings.lastPayoutAmount || '0')) / CONFIG.LAMPORTS_PER_SOL
            } : null,
            promoStatus: {
                enabled: CONFIG.PROMO_ENABLED,
                rewardAmount: CONFIG.PROMO_REWARD_AMOUNT
            }
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // REVENUE TRACKING
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Record revenue contribution from a user's spending
     * Called when user spends pebbles on gacha, etc.
     * 
     * @param {string} spenderWallet - Wallet of user who spent
     * @param {number} pebbleAmount - Amount of pebbles spent
     * @returns {Promise<void>}
     */
    async recordRevenueContribution(spenderWallet, pebbleAmount) {
        if (!pebbleAmount || pebbleAmount <= 0) return;
        if (!isDBConnected()) return;
        
        try {
            // Get the spender to find their referrer
            const spender = await User.findOne(
                { walletAddress: spenderWallet },
                'referral.referredBy'
            );
            
            if (!spender?.referral?.referredBy) {
                // No referrer, nothing to credit
                return;
            }
            
            // Convert pebbles to lamports
            // pebbles * (lamports_per_sol / pebbles_per_sol) = lamports
            const lamportsSpent = BigInt(pebbleAmount) * BigInt(CONFIG.LAMPORTS_PER_SOL) / BigInt(CONFIG.PEBBLES_PER_SOL);
            
            // Calculate tier 1 earnings (15%)
            const tier1Earnings = lamportsSpent * BigInt(Math.floor(CONFIG.TIER_1_PERCENT * 100)) / 100n;
            
            if (tier1Earnings > 0n) {
                // Credit tier 1 referrer
                await this._creditReferralEarnings(
                    spender.referral.referredBy,
                    tier1Earnings,
                    lamportsSpent,
                    1, // tier
                    spenderWallet
                );
                
                // Check for tier 2 referrer
                const tier1Referrer = await User.findOne(
                    { walletAddress: spender.referral.referredBy },
                    'referral.referredBy'
                );
                
                if (tier1Referrer?.referral?.referredBy) {
                    // Calculate tier 2 earnings (3%)
                    const tier2Earnings = lamportsSpent * BigInt(Math.floor(CONFIG.TIER_2_PERCENT * 100)) / 100n;
                    
                    if (tier2Earnings > 0n) {
                        await this._creditReferralEarnings(
                            tier1Referrer.referral.referredBy,
                            tier2Earnings,
                            lamportsSpent,
                            2, // tier
                            spenderWallet
                        );
                    }
                }
            }
            
        } catch (error) {
            console.error('[Referral] Revenue tracking error:', error.message);
        }
    }
    
    /**
     * Credit referral earnings to a referrer
     * @private
     */
    async _creditReferralEarnings(referrerWallet, earningsLamports, revenueLamports, tier, spenderWallet) {
        const earningsStr = earningsLamports.toString();
        const revenueStr = revenueLamports.toString();
        
        const update = {
            $set: {},
            $inc: {
                'referral.earnings.pendingLamports': earningsStr,
                'referral.stats.totalNetworkRevenueLamports': revenueStr
            }
        };
        
        if (tier === 1) {
            update.$inc['referral.stats.tier1EarningsLamports'] = earningsStr;
        } else {
            update.$inc['referral.stats.tier2EarningsLamports'] = earningsStr;
        }
        
        // MongoDB doesn't support $inc on string fields for BigInt
        // So we need to do a read-modify-write
        const referrer = await User.findOne({ walletAddress: referrerWallet });
        if (!referrer) return;
        
        const currentPending = BigInt(referrer.referral?.earnings?.pendingLamports || '0');
        const currentTotalRevenue = BigInt(referrer.referral?.stats?.totalNetworkRevenueLamports || '0');
        const currentTierEarnings = tier === 1 
            ? BigInt(referrer.referral?.stats?.tier1EarningsLamports || '0')
            : BigInt(referrer.referral?.stats?.tier2EarningsLamports || '0');
        
        const updateFields = {
            'referral.earnings.pendingLamports': (currentPending + earningsLamports).toString(),
            'referral.stats.totalNetworkRevenueLamports': (currentTotalRevenue + revenueLamports).toString()
        };
        
        if (tier === 1) {
            updateFields['referral.stats.tier1EarningsLamports'] = (currentTierEarnings + earningsLamports).toString();
        } else {
            updateFields['referral.stats.tier2EarningsLamports'] = (currentTierEarnings + earningsLamports).toString();
        }
        
        await User.updateOne(
            { walletAddress: referrerWallet },
            { $set: updateFields }
        );
        
        const earningSol = Number(earningsLamports) / CONFIG.LAMPORTS_PER_SOL;
        console.log(`🔗 [Referral] Tier ${tier} earnings: ${referrerWallet.slice(0, 8)}... +${earningSol.toFixed(6)} SOL`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PAYOUT SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Request payout of referral earnings
     * Requires minimum 0.5 SOL balance
     * 
     * @param {string} walletAddress - Referrer's wallet
     * @returns {Promise<{success: boolean, txSignature?: string, amountSol?: number, error?: string}>}
     */
    async requestPayout(walletAddress) {
        if (!isDBConnected()) {
            return { success: false, error: 'DB_NOT_CONNECTED' };
        }
        
        if (!custodialWalletService.isReady()) {
            return { success: false, error: 'PAYOUT_SERVICE_UNAVAILABLE' };
        }
        
        try {
            const user = await User.findOne({ walletAddress });
            if (!user) {
                return { success: false, error: 'USER_NOT_FOUND' };
            }
            
            const pendingLamports = BigInt(user.referral?.earnings?.pendingLamports || '0');
            
            if (pendingLamports < CONFIG.PAYOUT_THRESHOLD_LAMPORTS) {
                const currentSol = Number(pendingLamports) / CONFIG.LAMPORTS_PER_SOL;
                const thresholdSol = Number(CONFIG.PAYOUT_THRESHOLD_LAMPORTS) / CONFIG.LAMPORTS_PER_SOL;
                return {
                    success: false,
                    error: 'BELOW_THRESHOLD',
                    message: `Need ${thresholdSol} SOL to cash out (current: ${currentSol.toFixed(4)} SOL)`
                };
            }
            
            console.log(`🔗 [Referral] Payout request: ${walletAddress.slice(0, 8)}... - ${Number(pendingLamports) / CONFIG.LAMPORTS_PER_SOL} SOL`);
            
            // Send native SOL payout
            const sendResult = await custodialWalletService.sendNativeSOL(
                walletAddress,
                pendingLamports,
                `referral_payout_${Date.now()}`
            );
            
            if (!sendResult.success) {
                console.error(`🔗 [Referral] Payout failed: ${sendResult.error}`);
                return { success: false, error: sendResult.error, message: 'Payout transaction failed' };
            }
            
            // Update user - clear pending, add to total paid
            const currentTotalPaid = BigInt(user.referral?.earnings?.totalPaidOutLamports || '0');
            
            await User.updateOne(
                { walletAddress },
                {
                    'referral.earnings.pendingLamports': '0',
                    'referral.earnings.totalPaidOutLamports': (currentTotalPaid + pendingLamports).toString(),
                    'referral.earnings.lastPayoutAt': new Date(),
                    'referral.earnings.lastPayoutTx': sendResult.txId,
                    'referral.earnings.lastPayoutAmount': pendingLamports.toString()
                }
            );
            
            // Record transaction
            await Transaction.record({
                type: 'referral_payout',
                toWallet: walletAddress,
                amount: Number(pendingLamports) / CONFIG.LAMPORTS_PER_SOL,
                currency: 'SOL',
                relatedData: {
                    txSignature: sendResult.txId,
                    lamports: pendingLamports.toString()
                },
                reason: 'Referral earnings payout'
            });
            
            const amountSol = Number(pendingLamports) / CONFIG.LAMPORTS_PER_SOL;
            console.log(`🔗 [Referral] ✅ Payout complete: ${amountSol.toFixed(4)} SOL to ${walletAddress.slice(0, 8)}...`);
            console.log(`   Tx: ${sendResult.txId}`);
            
            return {
                success: true,
                txSignature: sendResult.txId,
                amountSol,
                amountLamports: pendingLamports.toString()
            };
            
        } catch (error) {
            console.error('[Referral] Payout error:', error.message);
            return { success: false, error: 'PAYOUT_FAILED', message: error.message };
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // LAUNCH PROMO: 1000 $CP REWARDS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Check and award launch promo rewards
     * Called when user completes 1 hour of playtime
     * 
     * Awards:
     * - 1000 $CP to the referred user
     * - 1000 $CP to their referrer
     * 
     * @param {string} walletAddress - User who completed 1 hour
     * @param {number} sessionMinutes - Current session minutes
     */
    async checkAndAwardPromoReward(walletAddress, sessionMinutes) {
        if (!CONFIG.PROMO_ENABLED) return { awarded: false };
        if (sessionMinutes < CONFIG.PROMO_REQUIRED_MINUTES) return { awarded: false };
        if (!isDBConnected()) return { awarded: false };
        
        try {
            const user = await User.findOne({ walletAddress });
            if (!user) return { awarded: false };
            
            // Check if already awarded
            if (user.referral?.promoReward?.claimed) {
                return { awarded: false, reason: 'ALREADY_CLAIMED' };
            }
            
            // Must have been referred
            if (!user.referral?.referredBy) {
                return { awarded: false, reason: 'NO_REFERRER' };
            }
            
            // Mark as eligible first
            if (!user.referral?.promoReward?.eligible) {
                await User.updateOne(
                    { walletAddress },
                    { 'referral.promoReward.eligible': true }
                );
            }
            
            // Check if custodial service is ready
            if (!custodialWalletService.isReady()) {
                console.log(`🔗 [Referral] Promo: Custodial not ready, will retry later`);
                return { awarded: false, reason: 'SERVICE_UNAVAILABLE' };
            }
            
            const tokenAddress = CONFIG.getTokenAddress();
            const amountRaw = BigInt(CONFIG.PROMO_REWARD_AMOUNT) * BigInt(10 ** CONFIG.TOKEN_DECIMALS);
            
            // Award to referred user (the one who played 1 hour)
            console.log(`🔗 [Referral] Promo: Awarding ${CONFIG.PROMO_REWARD_AMOUNT} $CP to ${user.username}`);
            
            const userRewardResult = await custodialWalletService._sendPayoutTransaction(
                walletAddress,
                tokenAddress,
                amountRaw,
                `referral_promo_referred_${walletAddress.slice(0, 8)}_${Date.now()}`
            );
            
            if (!userRewardResult.success) {
                console.error(`🔗 [Referral] Promo: Failed to award referred user:`, userRewardResult.error);
                return { awarded: false, reason: 'REWARD_FAILED' };
            }
            
            // Update referred user
            await User.updateOne(
                { walletAddress },
                {
                    'referral.promoReward.claimed': true,
                    'referral.promoReward.claimedAt': new Date(),
                    'referral.promoReward.claimTxSignature': userRewardResult.txId
                }
            );
            
            // Log transaction
            await Transaction.record({
                type: 'referral_promo_reward',
                toWallet: walletAddress,
                amount: CONFIG.PROMO_REWARD_AMOUNT,
                currency: 'WADDLE',
                relatedData: {
                    txSignature: userRewardResult.txId,
                    referrer: user.referral.referredBy,
                    type: 'referred_user'
                },
                reason: 'Referral promo: 1 hour playtime bonus'
            });
            
            // Now award the referrer
            console.log(`🔗 [Referral] Promo: Awarding ${CONFIG.PROMO_REWARD_AMOUNT} $CP to referrer ${user.referral.referredBy.slice(0, 8)}...`);
            
            const referrerRewardResult = await custodialWalletService._sendPayoutTransaction(
                user.referral.referredBy,
                tokenAddress,
                amountRaw,
                `referral_promo_referrer_${user.referral.referredBy.slice(0, 8)}_${Date.now()}`
            );
            
            if (referrerRewardResult.success) {
                // Update referred user to mark referrer was rewarded
                await User.updateOne(
                    { walletAddress },
                    {
                        'referral.promoReward.referrerRewarded': true,
                        'referral.promoReward.referrerRewardedAt': new Date()
                    }
                );
                
                // Increment referrer's active count
                await User.updateOne(
                    { walletAddress: user.referral.referredBy },
                    { $inc: { 'referral.stats.tier1ActiveCount': 1 } }
                );
                
                // Log referrer transaction
                await Transaction.record({
                    type: 'referral_promo_reward',
                    toWallet: user.referral.referredBy,
                    amount: CONFIG.PROMO_REWARD_AMOUNT,
                    currency: 'WADDLE',
                    relatedData: {
                        txSignature: referrerRewardResult.txId,
                        referredUser: walletAddress,
                        type: 'referrer'
                    },
                    reason: `Referral promo: ${user.username} completed 1 hour`
                });
                
                console.log(`🔗 [Referral] Promo: ✅ Both rewards sent!`);
                console.log(`   Referred: ${userRewardResult.txId}`);
                console.log(`   Referrer: ${referrerRewardResult.txId}`);
            } else {
                console.error(`🔗 [Referral] Promo: Failed to award referrer:`, referrerRewardResult.error);
            }
            
            return {
                awarded: true,
                userRewardTx: userRewardResult.txId,
                referrerRewardTx: referrerRewardResult.success ? referrerRewardResult.txId : null
            };
            
        } catch (error) {
            console.error('[Referral] Promo award error:', error.message);
            return { awarded: false, reason: 'ERROR' };
        }
    }
    
    /**
     * Get list of users referred by this wallet
     */
    async getReferredUsers(walletAddress, limit = 50) {
        if (!isDBConnected()) return [];
        
        const referrals = await User.find(
            { 'referral.referredBy': walletAddress },
            'username walletAddress referral.referredAt referral.promoReward stats.session.totalPlayTimeMinutes pebbleStats.totalSpent'
        )
        .sort({ 'referral.referredAt': -1 })
        .limit(limit)
        .lean();
        
        return referrals.map(r => ({
            username: r.username,
            walletAddress: r.walletAddress.slice(0, 4) + '...' + r.walletAddress.slice(-4),
            referredAt: r.referral?.referredAt,
            isActive: r.referral?.promoReward?.eligible || false,
            playTimeMinutes: r.stats?.session?.totalPlayTimeMinutes || 0,
            pebbleSpent: r.pebbleStats?.totalSpent || 0
        }));
    }
    
    /**
     * Lookup referrer by referral code
     */
    async lookupReferralCode(code) {
        if (!code || !isDBConnected()) return null;
        
        // Try referral code first, then username
        let user = await User.findOne(
            { 'referral.referralCode': code },
            'username walletAddress'
        );
        
        if (!user) {
            user = await User.findOne(
                { username: code },
                'username walletAddress'
            );
        }
        
        if (!user) return null;
        
        return {
            username: user.username,
            walletAddress: user.walletAddress
        };
    }
}

// Export singleton - will be initialized in server/index.js with dailyBonusService
let referralService = null;

export function initializeReferralService(dailyBonusService) {
    referralService = new ReferralService(dailyBonusService);
    return referralService;
}

export function getReferralService() {
    return referralService;
}

export default ReferralService;
export { CONFIG as REFERRAL_CONFIG };

