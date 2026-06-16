/**
 * Server-side fishing loot — depth tiers mirror IceFishingGame.jsx
 */

import { getFishByTier, getGameItem } from './gameItems.js';

export const TIER_UNLOCK_DEPTHS = {
    1: 0,
    2: 100,
    3: 200,
    4: 350,
    5: 500,
    6: 700,
    7: 900,
    8: 1050,
    9: 1200,
    10: 1350,
};

const MAX_DEPTH_M = 1500;

/**
 * All catalog fish unlocked at a given depth (cumulative tiers).
 * @param {number} depthM
 */
export function getFishPoolAtDepth(depthM) {
    const depth = Math.max(0, Math.min(Number(depthM) || 0, MAX_DEPTH_M));
    const pool = [];

    for (let tier = 1; tier <= 10; tier++) {
        if (depth >= TIER_UNLOCK_DEPTHS[tier]) {
            pool.push(...getFishByTier(tier));
        }
    }

    return pool;
}

/**
 * Server-authoritative catch roll for a successful reel.
 * @param {number} depthM
 * @returns {import('./gameItems.js').GameItem | null}
 */
export function rollFishAtDepth(depthM) {
    const pool = getFishPoolAtDepth(depthM);
    if (!pool.length) {
        return getGameItem('minnow');
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

export function isFishAllowedAtDepth(fishId, depthM) {
    if (!fishId) return false;
    return getFishPoolAtDepth(depthM).some((item) => item.id === fishId);
}
