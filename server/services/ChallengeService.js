/**
 * ChallengeService - Manages P2P game challenges with MongoDB persistence
 * Server-authoritative challenge management
 */

import { Challenge } from '../db/models/index.js';
import { isDBConnected } from '../db/connection.js';

// Challenge expiry time (5 minutes)
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;

// Normalize game type for storage
const normalizeGameType = (gameType) => {
    const mapping = {
        'card_jitsu': 'cardJitsu',
        'tic_tac_toe': 'ticTacToe',
        'connect4': 'connect4',
        'monopoly': 'monopoly',
        'pong': 'pong'
    };
    return mapping[gameType] || gameType;
};

class ChallengeService {
    constructor(inboxService, statsService) {
        this.inboxService = inboxService;
        this.statsService = statsService;
        
        // In-memory challenges for fast lookup (synced with DB)
        this.challenges = new Map(); // challengeId -> challenge
        
        // Clean up expired challenges periodically
        setInterval(() => this.cleanupExpired(), 60000);
    }

    /**
     * Create a new challenge
     * @param {object} challenger - Challenger player data (with wallet)
     * @param {object} target - Target player data (with wallet)
     * @param {string} gameType - Game type
     * @param {number} wagerAmount - Coins wagered
     * @returns {object} Result with challenge or error
     */
    async createChallenge(challenger, target, gameType, wagerAmount) {
        // Validate both players have wallets if wager > 0
        if (wagerAmount > 0) {
            if (!challenger.walletAddress) {
                return { error: 'CHALLENGER_NO_WALLET', message: 'You must be logged in to wager' };
            }
            if (!target.walletAddress) {
                return { error: 'TARGET_NO_WALLET', message: 'Target player is not logged in and cannot wager' };
            }
        }

        // Check for existing challenge between these players
        if (challenger.walletAddress && target.walletAddress) {
            const existing = await Challenge.findExistingBetween(
                challenger.walletAddress,
                target.walletAddress
            );
            if (existing) {
                return { error: 'CHALLENGE_EXISTS', message: 'There is already a pending challenge between you' };
            }
        }
        
        // Also check in-memory for guest challenges (by playerId)
        for (const [id, existingChallenge] of this.challenges) {
            if (existingChallenge.status === 'pending' &&
                ((existingChallenge.challengerId === challenger.id && existingChallenge.targetId === target.id) ||
                 (existingChallenge.challengerId === target.id && existingChallenge.targetId === challenger.id))) {
                return { error: 'CHALLENGE_EXISTS', message: 'There is already a pending challenge between you' };
            }
        }

        const challengeId = `chal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const normalizedGameType = normalizeGameType(gameType);
        const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MS);

        const challengeData = {
            challengeId,
            challengerWallet: challenger.walletAddress || null,
            challengerName: challenger.name,
            challengerId: challenger.id,
            challengerAppearance: challenger.appearance,
            targetWallet: target.walletAddress || null,
            targetName: target.name,
            targetId: target.id,
            targetAppearance: target.appearance,
            gameType: normalizedGameType,
            wagerAmount,
            room: challenger.room,
            expiresAt
        };

        // Save to database if connected
        if (isDBConnected()) {
            try {
                const challenge = new Challenge(challengeData);
                await challenge.save();
            } catch (error) {
                console.error('Error saving challenge to DB:', error);
            }
        }

        // Store in memory for fast access
        this.challenges.set(challengeId, {
            id: challengeId,
            ...challengeData,
            status: 'pending',
            createdAt: Date.now()
        });

        // Add to target's inbox
        this.inboxService.addChallengeMessage(
            target.id,
            target.walletAddress,
            challengeId,
            challenger.name,
            normalizedGameType,
            wagerAmount
        );

        // Record stats
        if (challenger.walletAddress) {
            this.statsService.recordChallengeSent(challenger.walletAddress);
        }
        if (target.walletAddress) {
            this.statsService.recordChallengeReceived(target.walletAddress);
        }

        console.log(`⚔️ Challenge created: ${challenger.name} → ${target.name} (${normalizedGameType}, ${wagerAmount} coins)`);

        return { challenge: this.challenges.get(challengeId) };
    }

    /**
     * Get a challenge by ID
     */
    getChallenge(challengeId) {
        const challenge = this.challenges.get(challengeId);
        if (!challenge) return null;
        
        // Check if expired
        if (challenge.expiresAt < new Date()) {
            challenge.status = 'expired';
            return null;
        }
        
        return challenge;
    }

    /**
     * Accept a challenge
     */
    async acceptChallenge(challengeId, acceptorId) {
        const challenge = this.getChallenge(challengeId);
        if (!challenge) {
            return { error: 'NOT_FOUND', message: 'Challenge not found or expired' };
        }

        if (challenge.status !== 'pending') {
            return { error: 'ALREADY_RESPONDED', message: 'Challenge already responded to' };
        }

        // Verify the acceptor is the target
        if (challenge.targetId !== acceptorId) {
            return { error: 'NOT_TARGET', message: 'You are not the target of this challenge' };
        }

        challenge.status = 'accepted';
        challenge.respondedAt = new Date();

        // Update in database
        if (isDBConnected()) {
            try {
                await Challenge.updateOne(
                    { challengeId },
                    { status: 'accepted', respondedAt: challenge.respondedAt }
                );
            } catch (error) {
                console.error('Error updating challenge in DB:', error);
            }
        }

        // Update inbox
        this.inboxService.deleteByChallengeId(challenge.targetId, challengeId);
        this.inboxService.addMessage(
            challenge.challengerId,
            challenge.challengerWallet,
            'challenge_response',
            'Challenge Accepted',
            `${challenge.targetName} accepted your ${challenge.gameType} challenge!`,
            { challengeId, response: 'accepted' }
        );

        console.log(`✅ Challenge accepted: ${challenge.challengerName} vs ${challenge.targetName}`);

        return { success: true, challenge };
    }

    /**
     * Deny a challenge
     */
    async denyChallenge(challengeId, denierId) {
        const challenge = this.getChallenge(challengeId);
        if (!challenge) {
            return { error: 'NOT_FOUND', message: 'Challenge not found or expired' };
        }

        if (challenge.status !== 'pending') {
            return { error: 'ALREADY_RESPONDED', message: 'Challenge already responded to' };
        }

        if (challenge.targetId !== denierId) {
            return { error: 'NOT_TARGET', message: 'You are not the target of this challenge' };
        }

        challenge.status = 'declined';
        challenge.respondedAt = new Date();

        // Update in database
        if (isDBConnected()) {
            try {
                await Challenge.updateOne(
                    { challengeId },
                    { status: 'declined', respondedAt: challenge.respondedAt }
                );
            } catch (error) {
                console.error('Error updating challenge in DB:', error);
            }
        }

        // Update inbox
        this.inboxService.deleteByChallengeId(challenge.targetId, challengeId);
        this.inboxService.addMessage(
            challenge.challengerId,
            challenge.challengerWallet,
            'challenge_response',
            'Challenge Declined',
            `${challenge.targetName} declined your ${challenge.gameType} challenge.`,
            { challengeId, response: 'declined' }
        );

        console.log(`❌ Challenge declined: ${challenge.challengerName} vs ${challenge.targetName}`);

        return { success: true };
    }

    /**
     * Cancel a challenge (by challenger)
     */
    async deleteChallenge(challengeId, cancellerId) {
        const challenge = this.getChallenge(challengeId);
        if (!challenge) {
            return { error: 'NOT_FOUND', message: 'Challenge not found' };
        }

        if (challenge.challengerId !== cancellerId) {
            return { error: 'NOT_CHALLENGER', message: 'Only the challenger can cancel' };
        }

        challenge.status = 'cancelled';
        this.challenges.delete(challengeId);

        // Update in database
        if (isDBConnected()) {
            try {
                await Challenge.updateOne(
                    { challengeId },
                    { status: 'cancelled', respondedAt: new Date() }
                );
            } catch (error) {
                console.error('Error updating challenge in DB:', error);
            }
        }

        // Remove from target's inbox
        this.inboxService.deleteByChallengeId(challenge.targetId, challengeId);

        console.log(`🚫 Challenge cancelled: ${challenge.challengerName}`);

        return { success: true };
    }

    /**
     * Get pending challenges for a player
     */
    getPendingChallengesFor(playerId) {
        const result = [];
        for (const [id, challenge] of this.challenges) {
            if (challenge.targetId === playerId && challenge.status === 'pending') {
                if (challenge.expiresAt > new Date()) {
                    result.push(challenge);
                }
            }
        }
        return result;
    }

    /**
     * Clean up expired challenges
     */
    async cleanupExpired() {
        const now = new Date();
        let cleaned = 0;

        for (const [id, challenge] of this.challenges) {
            if (challenge.expiresAt < now && challenge.status === 'pending') {
                challenge.status = 'expired';
                this.challenges.delete(id);
                
                // Remove from inbox
                this.inboxService.deleteByChallengeId(challenge.targetId, id);
                
                cleaned++;
            }
        }

        // Also clean in database
        if (isDBConnected()) {
            try {
                await Challenge.updateMany(
                    { status: 'pending', expiresAt: { $lt: now } },
                    { status: 'expired' }
                );
            } catch (error) {
                console.error('Error cleaning expired challenges in DB:', error);
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} expired challenges`);
        }
    }
}

export default ChallengeService;
