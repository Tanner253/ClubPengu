/**
 * ChallengeService - Manages challenge creation, validation, and lifecycle
 * Handles sending challenges, responses, and expiration
 */

// Challenge expiration time (5 minutes)
const CHALLENGE_TIMEOUT_MS = 5 * 60 * 1000;

// Proximity required to start a match (in world units) - reduced by 25% for closer proximity
const MATCH_PROXIMITY = 8;

class ChallengeService {
    constructor(inboxService, statsService) {
        this.inboxService = inboxService;
        this.statsService = statsService;
        
        // Active challenges (challengeId -> challenge)
        this.challenges = new Map();
        this.nextChallengeId = 1;
        
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => this.cleanupExpired(), 30000);
    }

    /**
     * Create a new challenge
     */
    createChallenge(challenger, target, gameType, wagerAmount) {
        // Validation
        if (challenger.id === target.id) {
            return { error: 'SELF_CHALLENGE', message: 'Cannot challenge yourself' };
        }

        if (challenger.room !== target.room) {
            return { error: 'DIFFERENT_ROOM', message: 'Must be in the same room to challenge' };
        }

        if (wagerAmount <= 0) {
            return { error: 'INVALID_WAGER', message: 'Wager must be greater than 0' };
        }

        // Check CURRENT coin balance from statsService (not cached)
        const challengerStats = this.statsService.getStats(challenger.id);
        const challengerCoins = challengerStats?.coins ?? 0;
        if (challengerCoins < wagerAmount) {
            return { 
                error: 'INSUFFICIENT_FUNDS', 
                message: `You need ${wagerAmount} coins to wager (you have ${challengerCoins})` 
            };
        }

        // Also check target's balance so they can accept
        const targetStats = this.statsService.getStats(target.id);
        const targetCoins = targetStats?.coins ?? 0;
        if (targetCoins < wagerAmount) {
            return { 
                error: 'TARGET_INSUFFICIENT_FUNDS', 
                message: `${target.name} doesn't have enough coins to accept this wager` 
            };
        }

        // Check proximity
        if (!this._checkProximity(challenger.position, target.position)) {
            return { error: 'TOO_FAR', message: 'Too far away to challenge this player' };
        }

        // Check if challenger already has pending challenge to this target
        for (const [, challenge] of this.challenges) {
            if (challenge.challengerId === challenger.id && 
                challenge.targetId === target.id && 
                challenge.status === 'pending') {
                return { error: 'DUPLICATE', message: 'You already have a pending challenge to this player' };
            }
        }

        const challengeId = `ch_${this.nextChallengeId++}`;
        const now = Date.now();
        
        const challenge = {
            id: challengeId,
            challengerId: challenger.id,
            challengerName: challenger.name,
            challengerAppearance: challenger.appearance,
            targetId: target.id,
            targetName: target.name,
            targetAppearance: target.appearance,
            gameType,
            wagerAmount,
            status: 'pending',
            room: challenger.room,
            createdAt: now,
            expiresAt: now + CHALLENGE_TIMEOUT_MS
        };

        this.challenges.set(challengeId, challenge);

        // Add to target's inbox
        this.inboxService.addChallenge(target.id, challenge);

        console.log(`⚔️ Challenge created: ${challenger.name} -> ${target.name} (${gameType}, ${wagerAmount} coins)`);

        return { success: true, challenge };
    }

    /**
     * Get a challenge by ID
     */
    getChallenge(challengeId) {
        return this.challenges.get(challengeId);
    }

    /**
     * Accept a challenge
     */
    acceptChallenge(challengeId, acceptingPlayerId) {
        const challenge = this.challenges.get(challengeId);
        
        if (!challenge) {
            return { error: 'NOT_FOUND', message: 'Challenge not found' };
        }

        if (challenge.targetId !== acceptingPlayerId) {
            return { error: 'NOT_TARGET', message: 'You are not the target of this challenge' };
        }

        if (challenge.status !== 'pending') {
            return { error: 'NOT_PENDING', message: `Challenge is ${challenge.status}` };
        }

        if (Date.now() > challenge.expiresAt) {
            challenge.status = 'expired';
            return { error: 'EXPIRED', message: 'Challenge has expired' };
        }

        // Re-validate CURRENT balances before accepting (balances may have changed)
        const accepterStats = this.statsService.getStats(acceptingPlayerId);
        const accepterCoins = accepterStats?.coins ?? 0;
        if (accepterCoins < challenge.wagerAmount) {
            return { 
                error: 'INSUFFICIENT_FUNDS', 
                message: `You need ${challenge.wagerAmount} coins to accept (you have ${accepterCoins})` 
            };
        }

        const challengerStats = this.statsService.getStats(challenge.challengerId);
        const challengerCoins = challengerStats?.coins ?? 0;
        if (challengerCoins < challenge.wagerAmount) {
            challenge.status = 'cancelled';
            this.inboxService.deleteByChallengeId(acceptingPlayerId, challengeId);
            return { 
                error: 'CHALLENGER_INSUFFICIENT_FUNDS', 
                message: `${challenge.challengerName} no longer has enough coins for this wager` 
            };
        }

        challenge.status = 'accepted';
        
        // Remove from inbox
        this.inboxService.deleteByChallengeId(acceptingPlayerId, challengeId);

        // Notify challenger
        this.inboxService.addChallengeResponse(challenge.challengerId, {
            type: 'accepted',
            challengeId,
            otherPlayerName: challenge.targetName,
            gameType: challenge.gameType,
            wagerAmount: challenge.wagerAmount
        });

        console.log(`✅ Challenge accepted: ${challenge.targetName} accepted ${challenge.challengerName}'s challenge`);

        return { success: true, challenge };
    }

    /**
     * Deny a challenge
     */
    denyChallenge(challengeId, denyingPlayerId) {
        const challenge = this.challenges.get(challengeId);
        
        if (!challenge) {
            return { error: 'NOT_FOUND', message: 'Challenge not found' };
        }

        if (challenge.targetId !== denyingPlayerId) {
            return { error: 'NOT_TARGET', message: 'You are not the target of this challenge' };
        }

        if (challenge.status !== 'pending') {
            return { error: 'NOT_PENDING', message: `Challenge is ${challenge.status}` };
        }

        challenge.status = 'denied';
        
        // Remove from inbox
        this.inboxService.deleteByChallengeId(denyingPlayerId, challengeId);

        // Notify challenger
        this.inboxService.addChallengeResponse(challenge.challengerId, {
            type: 'denied',
            challengeId,
            otherPlayerName: challenge.targetName,
            gameType: challenge.gameType,
            wagerAmount: challenge.wagerAmount
        });

        console.log(`❌ Challenge denied: ${challenge.targetName} denied ${challenge.challengerName}'s challenge`);

        return { success: true };
    }

    /**
     * Delete/ignore a challenge (from target's perspective)
     */
    deleteChallenge(challengeId, deletingPlayerId) {
        const challenge = this.challenges.get(challengeId);
        
        if (!challenge) {
            return { error: 'NOT_FOUND', message: 'Challenge not found' };
        }

        if (challenge.targetId !== deletingPlayerId) {
            return { error: 'NOT_TARGET', message: 'You are not the target of this challenge' };
        }

        challenge.status = 'deleted';
        
        // Remove from inbox
        this.inboxService.deleteByChallengeId(deletingPlayerId, challengeId);

        // Notify challenger
        this.inboxService.addChallengeResponse(challenge.challengerId, {
            type: 'deleted',
            challengeId,
            otherPlayerName: challenge.targetName,
            gameType: challenge.gameType,
            wagerAmount: challenge.wagerAmount
        });

        console.log(`🗑️ Challenge deleted: ${challenge.targetName} deleted ${challenge.challengerName}'s challenge`);

        return { success: true };
    }

    /**
     * Cancel a challenge (from challenger's perspective)
     */
    cancelChallenge(challengeId, cancellingPlayerId) {
        const challenge = this.challenges.get(challengeId);
        
        if (!challenge) {
            return { error: 'NOT_FOUND', message: 'Challenge not found' };
        }

        if (challenge.challengerId !== cancellingPlayerId) {
            return { error: 'NOT_CHALLENGER', message: 'You are not the challenger' };
        }

        if (challenge.status !== 'pending') {
            return { error: 'NOT_PENDING', message: `Challenge is ${challenge.status}` };
        }

        challenge.status = 'cancelled';
        
        // Remove from target's inbox
        this.inboxService.deleteByChallengeId(challenge.targetId, challengeId);

        return { success: true };
    }

    /**
     * Check proximity between two positions
     */
    _checkProximity(pos1, pos2) {
        if (!pos1 || !pos2) return false;
        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return distance <= MATCH_PROXIMITY;
    }

    /**
     * Cleanup expired challenges
     */
    cleanupExpired() {
        const now = Date.now();
        const expired = [];

        for (const [challengeId, challenge] of this.challenges) {
            if (challenge.status === 'pending' && now > challenge.expiresAt) {
                challenge.status = 'expired';
                expired.push(challenge);
            }
        }

        // Notify challengers about expired challenges
        for (const challenge of expired) {
            this.inboxService.deleteByChallengeId(challenge.targetId, challenge.id);
            this.inboxService.addChallengeResponse(challenge.challengerId, {
                type: 'expired',
                challengeId: challenge.id,
                otherPlayerName: challenge.targetName,
                gameType: challenge.gameType,
                wagerAmount: challenge.wagerAmount
            });
            console.log(`⏰ Challenge expired: ${challenge.challengerName} -> ${challenge.targetName}`);
        }

        // Clean old completed challenges (older than 1 hour)
        const oneHourAgo = now - 60 * 60 * 1000;
        for (const [challengeId, challenge] of this.challenges) {
            if (challenge.status !== 'pending' && challenge.createdAt < oneHourAgo) {
                this.challenges.delete(challengeId);
            }
        }
    }

    /**
     * Get pending challenges for a player
     */
    getPendingChallengesFrom(playerId) {
        const challenges = [];
        for (const [, challenge] of this.challenges) {
            if (challenge.challengerId === playerId && challenge.status === 'pending') {
                challenges.push(challenge);
            }
        }
        return challenges;
    }

    /**
     * Cleanup on shutdown
     */
    dispose() {
        clearInterval(this.cleanupInterval);
    }
}

export default ChallengeService;

