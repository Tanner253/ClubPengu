/**
 * DailyBonusService - Daily login bonus with $CP token rewards
 *
 * REQUIREMENTS:
 * 1. User must accrue required play minutes within a per-user 24h window
 * 2. Playtime persists across logout/reconnect during that window
 * 3. Can claim once every 24 hours (rolling from last claim)
 * 4. Claims $CP from custodial wallet
 * 5. Protections against replay attacks and double claims
 */

import { User, Transaction } from '../db/models/index.js';
import { isDBConnected } from '../db/connection.js';
import custodialWalletService from './CustodialWalletService.js';
import crypto from 'crypto';
import { getReferralService } from './ReferralService.js';
import { getOnboardingProgress, isOnboardingQuestComplete } from '../config/onboardingQuest.js';
import {
    DAILY_STREAK_REWARDS,
    STREAK_LENGTH,
    getStreakReward,
    getUtcDayKey,
    utcDayDiff,
} from '../config/dailyBonusStreak.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // Time requirements
    REQUIRED_SESSION_MINUTES: 60,           // 1 hour of play time required
    COOLDOWN_HOURS: 24,                     // 24 hour cooldown between claims
    PROGRESS_WINDOW_MS: 24 * 60 * 60 * 1000, // Per-user window to finish daily playtime
    
    // Legacy max reference (day 5–7 rewards)
    MAX_REWARD_CP: 5000,
    
    // Token config (loaded after env)
    getTokenAddress: () => process.env.CPW3_TOKEN_ADDRESS || '9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump',
    TOKEN_DECIMALS: 6,                      // $CP has 6 decimals
    
    // Security
    NONCE_EXPIRY_MINUTES: 5,                // Legacy in-memory cleanup interval (see claim nonce retention)
    CLAIM_NONCE_RETENTION_MS: 24 * 60 * 60 * 1000, // Match cooldown — block replay for 24h
};

const CLIENT_NONCE_REGEX = /^[a-f0-9]{64}$/i;

// Track active sessions (walletAddress -> session info)
const _activeSessions = new Map();

// Track in-flight claims to prevent race conditions
const _claimsInProgress = new Set();

// Nonce storage for replay protection (nonce -> timestamp)
const _usedNonces = new Map();

// 🚨 CRITICAL: Rate limit per wallet (prevent rapid-fire claims)
// Maps walletAddress -> last claim attempt timestamp
const _claimAttempts = new Map();
const CLAIM_ATTEMPT_COOLDOWN_MS = 30 * 1000; // 30 seconds between attempts

class DailyBonusService {
    constructor() {
        this.userService = null;
        // Clean up old nonces periodically
        setInterval(() => this._cleanupNonces(), 60 * 1000);
        // Persist in-progress playtime so disconnects do not lose progress
        setInterval(() => this._flushActiveSessions(), 60 * 1000);
        console.log('🎁 DailyBonusService initialized');
    }

    /** @param {import('./UserService.js').default} userService */
    setUserService(userService) {
        this.userService = userService;
    }

    _resolveClaimStreakDay(user) {
        const today = getUtcDayKey();
        let claimDay = user.dailyBonus?.streakDay || 1;
        const lastStreakUtcDay = user.dailyBonus?.streakLastUtcDay || null;

        if (lastStreakUtcDay) {
            const gap = utcDayDiff(lastStreakUtcDay, today);
            if (gap > 1) claimDay = 1;
        }

        claimDay = Math.max(1, Math.min(STREAK_LENGTH, claimDay));
        const reward = getStreakReward(claimDay);
        const consecutive = !lastStreakUtcDay || utcDayDiff(lastStreakUtcDay, today) <= 1;
        const completedDays = consecutive ? Math.max(0, claimDay - 1) : 0;

        return {
            today,
            claimDay,
            reward,
            consecutive,
            completedDays,
            nextDayAfterClaim: claimDay >= STREAK_LENGTH ? 1 : claimDay + 1,
        };
    }

    _getWindowMs() {
        return CONFIG.PROGRESS_WINDOW_MS;
    }

    /**
     * Resolve per-user daily playtime window (rolling 24h from first login after cooldown).
     * @private
     */
    _resolveProgressState(user, now = new Date()) {
        const windowMs = this._getWindowMs();
        const lastClaim = user.dailyBonus?.lastClaimAt ? new Date(user.dailyBonus.lastClaimAt) : null;
        const cooldownExpired = !lastClaim || (now - lastClaim) >= windowMs;

        if (!cooldownExpired) {
            return {
                canAccumulate: false,
                needsNewWindow: false,
                accumulatedMinutes: 0,
                windowStartedAt: null,
                timeUntilCooldownEnds: windowMs - (now - lastClaim),
                timeUntilWindowEnds: 0,
            };
        }

        const windowStartedAt = user.dailyBonus?.progressWindowStartedAt
            ? new Date(user.dailyBonus.progressWindowStartedAt)
            : null;
        const accumulatedMinutes = user.dailyBonus?.currentSessionMinutes || 0;

        if (!windowStartedAt || (now - windowStartedAt) >= windowMs) {
            return {
                canAccumulate: true,
                needsNewWindow: true,
                accumulatedMinutes: 0,
                windowStartedAt: null,
                timeUntilCooldownEnds: 0,
                timeUntilWindowEnds: windowMs,
            };
        }

        return {
            canAccumulate: true,
            needsNewWindow: false,
            accumulatedMinutes,
            windowStartedAt,
            timeUntilCooldownEnds: 0,
            timeUntilWindowEnds: Math.max(0, windowMs - (now - windowStartedAt)),
        };
    }

    _segmentMinutes(session, now = new Date()) {
        if (!session) return 0;
        const raw = (now - session.segmentStart) / (1000 * 60);
        return Math.max(0, raw);
    }

    _effectiveMinutesFromSession(session, now = new Date()) {
        if (!session?.canAccumulate) return 0;
        return Math.floor(session.persistedMinutes + this._segmentMinutes(session, now));
    }

    async _maybeAwardReferralPromo(walletAddress, totalMinutes, session) {
        if (!session || session.promoAwardChecked || totalMinutes < CONFIG.REQUIRED_SESSION_MINUTES) return;
        session.promoAwardChecked = true;
        const referralService = getReferralService();
        if (!referralService) return;
        referralService.checkAndAwardPromoReward(walletAddress, totalMinutes).catch((err) => {
            console.error('[DailyBonus] Referral promo check error:', err.message);
        });
    }

    /**
     * Start tracking session time for a player.
     * Restores persisted playtime when still inside the user's 24h progress window.
     */
    async startSession(walletAddress) {
        if (!walletAddress) return;

        const now = new Date();
        let persistedMinutes = 0;
        let windowStartedAt = null;
        let canAccumulate = false;

        if (isDBConnected()) {
            try {
                const user = await User.findOne({ walletAddress });
                if (user) {
                    const progress = this._resolveProgressState(user, now);
                    canAccumulate = progress.canAccumulate;

                    if (canAccumulate) {
                        if (progress.needsNewWindow) {
                            windowStartedAt = now;
                            persistedMinutes = 0;
                            await User.updateOne(
                                { walletAddress },
                                {
                                    'dailyBonus.progressWindowStartedAt': now,
                                    'dailyBonus.currentSessionMinutes': 0,
                                    'dailyBonus.sessionStartTime': now,
                                }
                            );
                        } else {
                            windowStartedAt = progress.windowStartedAt;
                            persistedMinutes = progress.accumulatedMinutes;
                            await User.updateOne(
                                { walletAddress },
                                { 'dailyBonus.sessionStartTime': now }
                            );
                        }
                    }
                }
            } catch (err) {
                console.error('[DailyBonus] Failed to update session start:', err.message);
            }
        }

        _activeSessions.set(walletAddress, {
            segmentStart: now,
            persistedMinutes,
            windowStartedAt,
            canAccumulate,
            lastFlushAt: now,
            promoAwardChecked: persistedMinutes >= CONFIG.REQUIRED_SESSION_MINUTES,
        });

        console.log(
            `🎁 [DailyBonus] Session started for ${walletAddress.slice(0, 8)}...`
            + (canAccumulate ? ` (${persistedMinutes} min accrued in window)` : ' (claim cooldown active)')
        );
    }

    /**
     * Persist accrued playtime for an active session segment.
     * @private
     */
    async _persistSessionProgress(walletAddress, session, now = new Date()) {
        if (!session?.canAccumulate || !session.windowStartedAt || !isDBConnected()) return 0;

        const segmentMinutes = this._segmentMinutes(session, now);
        const totalMinutes = Math.floor(session.persistedMinutes + segmentMinutes);

        try {
            await User.updateOne(
                { walletAddress },
                { 'dailyBonus.currentSessionMinutes': totalMinutes }
            );
        } catch (err) {
            console.error('[DailyBonus] Failed to persist session progress:', err.message);
            return totalMinutes;
        }

        await this._maybeAwardReferralPromo(walletAddress, totalMinutes, session);

        session.persistedMinutes = totalMinutes;
        session.segmentStart = now;
        session.lastFlushAt = now;
        return totalMinutes;
    }

    async _flushActiveSessions() {
        const now = new Date();
        for (const [walletAddress, session] of _activeSessions) {
            if (!session.canAccumulate) continue;
            const minutesSinceFlush = (now - session.lastFlushAt) / (1000 * 60);
            if (minutesSinceFlush >= 1) {
                await this._persistSessionProgress(walletAddress, session, now);
            }
        }
    }

    /**
     * End session tracking for a player — saves accrued playtime for the progress window.
     */
    async endSession(walletAddress) {
        const session = _activeSessions.get(walletAddress);
        if (!session) return;

        const now = new Date();
        const segmentMinutes = Math.floor(this._segmentMinutes(session, now));

        if (isDBConnected()) {
            try {
                const updates = {};
                if (session.canAccumulate && session.windowStartedAt) {
                    const totalMinutes = Math.floor(session.persistedMinutes + this._segmentMinutes(session, now));
                    updates['dailyBonus.currentSessionMinutes'] = totalMinutes;
                    await this._maybeAwardReferralPromo(walletAddress, totalMinutes, session);
                }
                if (segmentMinutes > 0) {
                    updates.$inc = { 'stats.session.totalPlayTimeMinutes': segmentMinutes };
                }
                if (Object.keys(updates).length > 0) {
                    await User.updateOne({ walletAddress }, updates);
                }
            } catch (err) {
                console.error('[DailyBonus] Failed to save session time:', err.message);
            }
        }

        const loggedMinutes = session.canAccumulate
            ? Math.floor(session.persistedMinutes + this._segmentMinutes(session, now))
            : segmentMinutes;
        _activeSessions.delete(walletAddress);
        console.log(`🎁 [DailyBonus] Session ended for ${walletAddress.slice(0, 8)}... (${loggedMinutes} min in window)`);
    }

    /**
     * Total play minutes for the current daily progress window (persisted + live segment).
     */
    getSessionMinutes(walletAddress, user = null) {
        const session = _activeSessions.get(walletAddress);
        const now = new Date();

        if (session) {
            return this._effectiveMinutesFromSession(session, now);
        }

        if (!user) return 0;
        const progress = this._resolveProgressState(user, now);
        if (!progress.canAccumulate || progress.needsNewWindow) return 0;
        return Math.floor(progress.accumulatedMinutes);
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
            const progress = this._resolveProgressState(user, now);
            const sessionMinutes = this.getSessionMinutes(walletAddress, user);
            
            // Check if 24h cooldown has passed
            const lastClaim = user.dailyBonus?.lastClaimAt;
            const cooldownMs = CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000;
            const cooldownExpired = !lastClaim || (now - lastClaim) >= cooldownMs;
            
            // Time until cooldown expires
            let timeUntilClaim = 0;
            if (lastClaim && !cooldownExpired) {
                timeUntilClaim = cooldownMs - (now - lastClaim);
            }
            
            // Check playtime requirement (accrued across sessions in the progress window)
            const hasEnoughTime = cooldownExpired && sessionMinutes >= CONFIG.REQUIRED_SESSION_MINUTES;
            const minutesRemaining = cooldownExpired
                ? Math.max(0, CONFIG.REQUIRED_SESSION_MINUTES - sessionMinutes)
                : CONFIG.REQUIRED_SESSION_MINUTES;

            const onboardingProgress = getOnboardingProgress(user);
            const onboardingComplete = onboardingProgress.complete;

            const streak = this._resolveClaimStreakDay(user);
            
            // Can claim if cooldown expired AND has enough session time AND intro quest done
            const canClaim = cooldownExpired && hasEnoughTime && onboardingComplete;
            
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
                timeUntilWindowEnds: progress.timeUntilWindowEnds, // ms left to finish playtime window
                progressWindowStartedAt: progress.windowStartedAt,
                sessionMinutes,                                    // accrued playtime in current window
                requiredMinutes: CONFIG.REQUIRED_SESSION_MINUTES,  // required time
                minutesRemaining,                                  // minutes until eligible
                hasEnoughTime,
                onboardingComplete,
                onboardingCompletedCount: onboardingProgress.completedCount,
                onboardingTotalSteps: onboardingProgress.totalSteps,
                rewardAmount: streak.reward.cp,
                goldReward: streak.reward.gold,
                streakDay: streak.claimDay,
                streakCompletedDays: streak.completedDays,
                streakRewards: DAILY_STREAK_REWARDS,
                streakLastUtcDay: user.dailyBonus?.streakLastUtcDay || null,
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
     * Sends $CP tokens from custodial wallet to user
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

        if (!CLIENT_NONCE_REGEX.test(clientNonce)) {
            return { success: false, error: 'INVALID_NONCE', message: 'Invalid claim request' };
        }
        
        // 🚨 CRITICAL: Rate limit - prevent rapid-fire claim attempts
        const lastAttempt = _claimAttempts.get(walletAddress);
        const now = Date.now();
        if (lastAttempt && (now - lastAttempt) < CLAIM_ATTEMPT_COOLDOWN_MS) {
            const waitSeconds = Math.ceil((CLAIM_ATTEMPT_COOLDOWN_MS - (now - lastAttempt)) / 1000);
            console.warn(`🚨 [DailyBonus] Rate limit hit for ${walletAddress.slice(0, 8)}... (${waitSeconds}s remaining)`);
            return { 
                success: false, 
                error: 'RATE_LIMITED', 
                message: `Please wait ${waitSeconds} seconds before trying again` 
            };
        }
        _claimAttempts.set(walletAddress, now);
        
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

        let reservedClaimId = null;
        let previousLastClaim = null;
        let previousStreakDay = null;
        let previousStreakUtcDay = null;
        let cpAmount = 0;
        
        try {
            // ═══════════════════════════════════════════════════════════════
            // ELIGIBILITY VERIFICATION (Double-check in DB)
            // ═══════════════════════════════════════════════════════════════
            
            const user = await User.findOne({ walletAddress });
            if (!user) {
                return { success: false, error: 'USER_NOT_FOUND' };
            }

            const processedNonces = user.dailyBonus?.processedClaimNonces || [];
            if (processedNonces.includes(clientNonce)) {
                return {
                    success: false,
                    error: 'NONCE_REUSED',
                    message: 'This claim request was already processed'
                };
            }
            
            const now = new Date();
            const sessionMinutes = this.getSessionMinutes(walletAddress, user);

            if (!isOnboardingQuestComplete(user)) {
                const progress = getOnboardingProgress(user);
                return {
                    success: false,
                    error: 'ONBOARDING_INCOMPLETE',
                    message: 'Complete the Getting Started quest before claiming daily bonus',
                    onboardingCompletedCount: progress.completedCount,
                    onboardingTotalSteps: progress.totalSteps,
                };
            }

            // Check 24h cooldown before playtime (clearer when still on cooldown)
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
            
            // Check playtime requirement (accrued across sessions in the progress window)
            if (sessionMinutes < CONFIG.REQUIRED_SESSION_MINUTES) {
                const remaining = CONFIG.REQUIRED_SESSION_MINUTES - sessionMinutes;
                return { 
                    success: false, 
                    error: 'INSUFFICIENT_TIME', 
                    message: `Need ${remaining} more minutes of play time`,
                    minutesRemaining: remaining
                };
            }
            
            const streak = this._resolveClaimStreakDay(user);
            const reward = streak.reward;
            const cpAmount = reward.cp;
            const goldAmount = reward.gold || 0;
            
            // ═══════════════════════════════════════════════════════════════
            // ATOMIC CLAIM WITH NONCE PROTECTION
            // ═══════════════════════════════════════════════════════════════
            
            // Generate server-side claim ID
            const claimId = `daily_${walletAddress.slice(0, 8)}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            
            // Mark nonce as used BEFORE sending transaction
            _usedNonces.set(clientNonce, Date.now());
            
            // Update user BEFORE blockchain tx (marks claimed to prevent double-spend)
            const updateResult = await User.updateOne(
                { 
                    walletAddress,
                    'dailyBonus.processedClaimNonces': { $nin: [clientNonce] },
                    $or: [
                        { 'dailyBonus.lastClaimAt': null },
                        { 'dailyBonus.lastClaimAt': { $lt: new Date(now.getTime() - cooldownMs) } }
                    ]
                },
                {
                    'dailyBonus.lastClaimAt': now,
                    'dailyBonus.claimNonce': claimId,
                    $push: {
                        'dailyBonus.processedClaimNonces': {
                            $each: [clientNonce],
                            $slice: -50
                        }
                    },
                    $inc: {
                        'dailyBonus.totalClaimed': 1,
                        'dailyBonus.totalWaddleEarned': cpAmount
                    },
                    'dailyBonus.currentSessionMinutes': 0,
                    'dailyBonus.progressWindowStartedAt': null,
                    'dailyBonus.streakDay': streak.nextDayAfterClaim,
                    'dailyBonus.streakLastUtcDay': streak.today,
                }
            );
            
            // If no document was modified, another claim beat us
            if (updateResult.modifiedCount === 0) {
                _usedNonces.delete(clientNonce);
                return { success: false, error: 'ALREADY_CLAIMED', message: 'Bonus already claimed' };
            }

            const activeSession = _activeSessions.get(walletAddress);
            if (activeSession) {
                activeSession.persistedMinutes = 0;
                activeSession.windowStartedAt = null;
                activeSession.canAccumulate = false;
                activeSession.segmentStart = now;
                activeSession.promoAwardChecked = false;
            }

            reservedClaimId = claimId;
            previousLastClaim = lastClaim;
            previousStreakDay = user.dailyBonus?.streakDay ?? 1;
            previousStreakUtcDay = user.dailyBonus?.streakLastUtcDay ?? null;
            
            console.log(`🎁 [DailyBonus] Processing claim for ${walletAddress.slice(0, 8)}...`);
            console.log(`   Claim ID: ${claimId}`);
            console.log(`   Streak day ${streak.claimDay}: ${cpAmount} $CP${goldAmount > 0 ? ` + ${goldAmount}g` : ''}`);

            let goldNewBalance = null;
            if (goldAmount > 0 && this.userService) {
                const coinResult = await this.userService.addCoins(
                    walletAddress,
                    goldAmount,
                    'daily_streak_gold',
                    { claimId, streakDay: streak.claimDay },
                    `Day ${streak.claimDay} streak gold bonus`
                );
                if (coinResult.error) {
                    await User.updateOne(
                        { walletAddress, 'dailyBonus.claimNonce': claimId },
                        {
                            'dailyBonus.lastClaimAt': previousLastClaim,
                            'dailyBonus.streakDay': previousStreakDay,
                            'dailyBonus.streakLastUtcDay': previousStreakUtcDay,
                            $pull: { 'dailyBonus.processedClaimNonces': clientNonce },
                            $inc: {
                                'dailyBonus.totalClaimed': -1,
                                'dailyBonus.totalWaddleEarned': -cpAmount
                            }
                        }
                    );
                    _usedNonces.delete(clientNonce);
                    return {
                        success: false,
                        error: 'GOLD_GRANT_FAILED',
                        message: 'Could not grant gold bonus. Please try again.'
                    };
                }
                goldNewBalance = coinResult.newBalance;
            }

            // Gold-only streak days — skip on-chain $CP transfer
            if (cpAmount <= 0) {
                if (isDBConnected()) {
                    try {
                        await Transaction.record({
                            type: 'daily_streak_gold',
                            fromWallet: null,
                            toWallet: walletAddress,
                            amount: goldAmount,
                            currency: 'GOLD',
                            relatedData: {
                                claimId,
                                clientNonce,
                                sessionMinutes,
                                streakDay: streak.claimDay,
                                goldOnly: true,
                            },
                            reason: `Daily streak day ${streak.claimDay} (gold only)`
                        });
                    } catch (txErr) {
                        console.warn('[DailyBonus] Failed to record gold-only transaction:', txErr.message);
                    }
                }

                return {
                    success: true,
                    txSignature: null,
                    amount: 0,
                    goldReward: goldAmount,
                    goldNewBalance,
                    streakDay: streak.claimDay,
                    tokenSymbol: '$CP',
                    claimId,
                    message: `Day ${streak.claimDay} reward: ${goldAmount} gold!`
                };
            }

            // ═══════════════════════════════════════════════════════════════
            // SEND TOKENS FROM CUSTODIAL WALLET
            // ═══════════════════════════════════════════════════════════════
            
            const tokenAddress = CONFIG.getTokenAddress();
            const amountRaw = BigInt(cpAmount) * BigInt(10 ** CONFIG.TOKEN_DECIMALS);
            
            const txResult = await custodialWalletService._sendPayoutTransaction(
                walletAddress,
                tokenAddress,
                amountRaw,
                claimId
            );
            
            if (txResult.success || txResult.txId) {
                const txSignature = txResult.txId;
                if (!txResult.success) {
                    console.warn(`🎁 [DailyBonus] Tx broadcast but confirmation uncertain: ${txSignature}`);
                }
                console.log(`🎁 [DailyBonus] ✅ Claim successful!`);
                console.log(`   Tx: ${txSignature}`);

                if (goldAmount > 0 && this.userService && goldNewBalance == null) {
                    const coinResult = await this.userService.addCoins(
                        walletAddress,
                        goldAmount,
                        'daily_streak_gold',
                        { claimId, streakDay: streak.claimDay },
                        `Day ${streak.claimDay} streak gold bonus`
                    );
                    if (!coinResult.error) {
                        goldNewBalance = coinResult.newBalance;
                    }
                }
                
                // Record transaction
                if (isDBConnected()) {
                    try {
                        await Transaction.record({
                            type: 'daily_bonus',
                            fromWallet: 'custodial',
                            toWallet: walletAddress,
                            amount: cpAmount,
                            currency: 'WADDLE',
                            relatedData: {
                                claimId,
                                clientNonce,
                                txSignature,
                                sessionMinutes,
                                streakDay: streak.claimDay,
                                goldBonus: goldAmount,
                                confirmationUncertain: !txResult.success
                            },
                            reason: `Daily streak day ${streak.claimDay}`
                        });
                    } catch (txErr) {
                        console.warn('[DailyBonus] Failed to record transaction:', txErr.message);
                    }
                }
                
                const goldPart = goldAmount > 0 ? ` and ${goldAmount} gold` : '';
                return {
                    success: true,
                    txSignature,
                    amount: cpAmount,
                    goldReward: goldAmount,
                    goldNewBalance,
                    streakDay: streak.claimDay,
                    tokenSymbol: '$CP',
                    claimId,
                    message: `Day ${streak.claimDay} reward: ${cpAmount.toLocaleString()} $CP${goldPart}!`
                };
                
            } else {
                // Transaction failed - REVERT the DB update
                console.error(`🎁 [DailyBonus] ❌ Transaction failed: ${txResult.error}`);
                
                await User.updateOne(
                    { walletAddress, 'dailyBonus.claimNonce': claimId },
                    {
                        'dailyBonus.lastClaimAt': previousLastClaim,
                        'dailyBonus.streakDay': previousStreakDay,
                        'dailyBonus.streakLastUtcDay': previousStreakUtcDay,
                        $pull: { 'dailyBonus.processedClaimNonces': clientNonce },
                        $inc: {
                            'dailyBonus.totalClaimed': -1,
                            'dailyBonus.totalWaddleEarned': -cpAmount
                        }
                    }
                );
                
                _usedNonces.delete(clientNonce);
                
                return {
                    success: false,
                    error: 'TRANSACTION_FAILED',
                    message: 'Token transfer failed. Please try again.'
                };
            }
            
        } catch (error) {
            console.error('[DailyBonus] Claim error:', error.message);

            if (reservedClaimId) {
                try {
                    await User.updateOne(
                        { walletAddress, 'dailyBonus.claimNonce': reservedClaimId },
                        {
                            'dailyBonus.lastClaimAt': previousLastClaim,
                            'dailyBonus.streakDay': previousStreakDay,
                            'dailyBonus.streakLastUtcDay': previousStreakUtcDay,
                            $pull: { 'dailyBonus.processedClaimNonces': clientNonce },
                            $inc: {
                                'dailyBonus.totalClaimed': -1,
                                'dailyBonus.totalWaddleEarned': -cpAmount
                            }
                        }
                    );
                    _usedNonces.delete(clientNonce);
                } catch (revertErr) {
                    console.error('[DailyBonus] Failed to revert reserved claim:', revertErr.message);
                }
            }

            return { success: false, error: 'CLAIM_FAILED', message: error.message };
            
        } finally {
            // Always release the claim lock
            _claimsInProgress.delete(walletAddress);
        }
    }
    
    /**
     * Clean up expired nonces and rate limit entries
     * @private
     */
    _cleanupNonces() {
        const expiryMs = CONFIG.CLAIM_NONCE_RETENTION_MS;
        const now = Date.now();
        
        // Clean old nonces
        for (const [nonce, timestamp] of _usedNonces) {
            if (now - timestamp > expiryMs) {
                _usedNonces.delete(nonce);
            }
        }
        
        // Clean old rate limit entries (older than 5 minutes)
        for (const [wallet, timestamp] of _claimAttempts) {
            if (now - timestamp > 5 * 60 * 1000) {
                _claimAttempts.delete(wallet);
            }
        }
    }
}

// Export singleton
const dailyBonusService = new DailyBonusService();
export default dailyBonusService;

