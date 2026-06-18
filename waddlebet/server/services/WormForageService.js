/**
 * WormForageService — search fallen forest logs for worm bait.
 * Per-user per-log cooldown stored in user.scavengeSpotCooldowns.
 */

import {
    FORAGEABLE_LOGS,
    WORM_FORAGE_COOLDOWN_MS,
    WORM_FORAGE_MAX_WORMS,
    WORM_FORAGE_MIN_WORMS,
    WORM_FORAGE_SUCCESS_CHANCE,
    getForageableLog,
    isPlayerNearForageableLog,
} from '../config/forageableLogs.js';

class WormForageService {
    constructor(gameInventoryService) {
        this.gameInventoryService = gameInventoryService;
    }

    cooldownKey(logId) {
        return `forage_${logId}`;
    }

    getLastForageAt(user, logId) {
        const key = this.cooldownKey(logId);
        const cooldowns = user?.scavengeSpotCooldowns;
        if (!cooldowns) return 0;
        const raw = cooldowns instanceof Map ? cooldowns.get(key) : cooldowns[key];
        return raw ? new Date(raw).getTime() : 0;
    }

    getLogStatus(user, logId) {
        const log = getForageableLog(logId);
        if (!log) return { error: 'UNKNOWN_LOG' };

        const lastAt = this.getLastForageAt(user, logId);
        const elapsed = lastAt ? Date.now() - lastAt : WORM_FORAGE_COOLDOWN_MS;
        const canForage = !lastAt || elapsed >= WORM_FORAGE_COOLDOWN_MS;
        const displayRemainingMs = canForage
            ? 0
            : Math.max(0, WORM_FORAGE_COOLDOWN_MS - elapsed);

        return {
            logId,
            canForage,
            displayRemainingMs,
            displayRemainingSeconds: Math.ceil(displayRemainingMs / 1000),
        };
    }

    getAllLogStatuses(user) {
        const statuses = {};
        for (const log of FORAGEABLE_LOGS) {
            statuses[log.id] = this.getLogStatus(user, log.id);
        }
        return statuses;
    }

    async setLastForageAt(walletAddress, logId, when = new Date()) {
        const key = this.cooldownKey(logId);
        const { User } = await import('../db/models/index.js');
        await User.updateOne(
            { walletAddress },
            { $set: { [`scavengeSpotCooldowns.${key}`]: when } }
        );
    }

    rollWormQuantity() {
        if (Math.random() > WORM_FORAGE_SUCCESS_CHANCE) return 0;
        const span = WORM_FORAGE_MAX_WORMS - WORM_FORAGE_MIN_WORMS + 1;
        return WORM_FORAGE_MIN_WORMS + Math.floor(Math.random() * span);
    }

    /**
     * @param {string} walletAddress
     * @param {string} logId
     * @param {{ x: number, z: number, room?: string }} playerContext
     */
    async forage(walletAddress, logId, playerContext) {
        const log = getForageableLog(logId);
        if (!log) {
            return { error: 'UNKNOWN_LOG', message: 'Nothing to search here' };
        }
        if (playerContext?.room !== 'forest_trails') {
            return { error: 'WRONG_ROOM', message: 'Search mossy logs in the Forest Trails' };
        }
        if (!isPlayerNearForageableLog(playerContext, log)) {
            return { error: 'TOO_FAR', message: 'Move closer to the fallen log' };
        }

        const user = await this.gameInventoryService.userService.getUser(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };

        const status = this.getLogStatus(user.toObject(), logId);
        if (!status.canForage) {
            return {
                error: 'ON_COOLDOWN',
                message: `This log was picked over — try again in ${status.displayRemainingSeconds}s`,
                displayRemainingSeconds: status.displayRemainingSeconds,
            };
        }

        const quantity = this.rollWormQuantity();
        await this.setLastForageAt(walletAddress, logId);

        if (quantity <= 0) {
            return {
                success: true,
                logId,
                quantity: 0,
                message: 'No worms under this log — try another fallen log',
                displayRemainingSeconds: Math.ceil(WORM_FORAGE_COOLDOWN_MS / 1000),
            };
        }

        const addResult = await this.gameInventoryService.addItem(walletAddress, 'worm', quantity);
        if (addResult.error) {
            return addResult;
        }

        return {
            success: true,
            logId,
            itemId: 'worm',
            quantity,
            inventory: addResult.inventory,
            message: `Found ${quantity} worm${quantity === 1 ? '' : 's'}!`,
            displayRemainingSeconds: Math.ceil(WORM_FORAGE_COOLDOWN_MS / 1000),
        };
    }
}

export default WormForageService;
