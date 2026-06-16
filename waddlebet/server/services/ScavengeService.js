/**
 * ScavengeService — timed gold scavenging at world props (e.g. casino trash can).
 * Each spot id has an independent per-user cooldown.
 */

import { User } from '../db/models/index.js';
import {
    getScavengeSpot,
    SCAVENGE_SPOTS,
    SCAVENGE_COOLDOWN_MS,
    isPlayerNearScavengeSpot,
} from '../config/scavenge.js';

class ScavengeService {
    constructor(userService) {
        this.userService = userService;
    }

    /** @param {object} user */
    getLastScavengeAt(user, spotId) {
        const cooldowns = user?.scavengeSpotCooldowns;
        if (cooldowns) {
            const raw = cooldowns instanceof Map
                ? cooldowns.get(spotId)
                : cooldowns[spotId];
            if (raw) return new Date(raw).getTime();
        }
        if (spotId === 'casino_trash' && user?.lastCasinoTrashScavenge) {
            return new Date(user.lastCasinoTrashScavenge).getTime();
        }
        return 0;
    }

    async setLastScavengeAt(walletAddress, spotId, when = new Date()) {
        const update = {
            [`scavengeSpotCooldowns.${spotId}`]: when,
        };
        if (spotId === 'casino_trash') {
            update.lastCasinoTrashScavenge = when;
        }
        await User.updateOne({ walletAddress }, { $set: update });
    }

    /**
     * @param {object} user — lean user doc
     * @param {string} spotId
     */
    getSpotStatus(user, spotId) {
        const spot = getScavengeSpot(spotId);
        if (!spot) return { error: 'UNKNOWN_SPOT' };

        const lastAt = this.getLastScavengeAt(user, spotId);
        const elapsed = lastAt ? Date.now() - lastAt : SCAVENGE_COOLDOWN_MS;
        const canScavenge = !lastAt || elapsed >= SCAVENGE_COOLDOWN_MS;
        const displayRemainingMs = canScavenge
            ? 0
            : Math.max(0, SCAVENGE_COOLDOWN_MS - elapsed);

        return {
            spotId,
            canScavenge,
            displayRemainingMs,
            displayRemainingSeconds: Math.ceil(displayRemainingMs / 1000),
            goldReward: spot.goldReward,
            winChance: spot.winChance,
        };
    }

    getAllSpotStatuses(user) {
        const statuses = {};
        for (const spotId of Object.keys(SCAVENGE_SPOTS)) {
            statuses[spotId] = this.getSpotStatus(user, spotId);
        }
        return statuses;
    }

    rollGoldReward(spot) {
        if (spot.winChance == null) {
            return spot.goldReward ?? 0;
        }
        return Math.random() < spot.winChance ? (spot.goldReward ?? 0) : 0;
    }

    /**
     * @param {string} walletAddress
     * @param {string} spotId
     * @param {{ x: number, z: number, room?: string }} playerContext
     */
    async scavenge(walletAddress, spotId, playerContext) {
        const spot = getScavengeSpot(spotId);
        if (!spot) return { error: 'UNKNOWN_SPOT' };

        if (playerContext.room !== spot.room) {
            return { error: 'WRONG_ROOM', message: 'Nothing to search here.' };
        }

        if (!isPlayerNearScavengeSpot(playerContext, spot, 1)) {
            return { error: 'TOO_FAR', message: 'Move closer to search the trash.' };
        }

        const user = await User.findOne({ walletAddress }).lean();
        if (!user) return { error: 'USER_NOT_FOUND' };

        const status = this.getSpotStatus(user, spotId);
        if (!status.canScavenge) {
            const mins = Math.ceil(status.displayRemainingSeconds / 60);
            return {
                error: 'ON_COOLDOWN',
                message: `Already picked clean. Try again in ~${mins} min.`,
                displayRemainingSeconds: status.displayRemainingSeconds,
                spotId,
            };
        }

        await this.setLastScavengeAt(walletAddress, spotId);

        const goldEarned = this.rollGoldReward(spot);
        let newBalance = user.coins ?? 0;

        if (goldEarned > 0) {
            const coinResult = await this.userService.addCoins(
                walletAddress,
                goldEarned,
                'scavenge',
                { spotId, room: spot.room },
                `Scavenged ${goldEarned}g from ${spotId}`
            );

            if (!coinResult.success) {
                return coinResult;
            }
            newBalance = coinResult.newBalance;
        }

        return {
            success: true,
            spotId,
            goldEarned,
            newBalance,
            displayRemainingSeconds: Math.ceil(SCAVENGE_COOLDOWN_MS / 1000),
            message: goldEarned > 0
                ? `Found ${goldEarned} gold!`
                : 'Nothing but crumbs and lint.',
        };
    }
}

export default ScavengeService;
