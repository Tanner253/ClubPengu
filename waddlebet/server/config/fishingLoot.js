/**
 * Server-side fishing loot — depth tiers mirror IceFishingGame.jsx
 */

import { getFishByTier, getGameItem } from './gameItems.js';
import { getRodCatchConfig } from './economy.js';

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

function weightedPick(items, weights) {
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total <= 0) return items[0];
    let roll = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
}

export function computeCatchWeightKg(fishTier = 1, weightMultiplier = 1) {
    const base = 0.25 + (fishTier || 1) * 0.35;
    return Math.round(base * weightMultiplier * 10) / 10;
}

/**
 * @param {number} depthM
 * @param {string} [rodItemId='basic_rod']
 * @param {object|null} [catchConfigOverride] — from getEffectiveRodCatchConfig
 */
export function rollCatchAtDepth(depthM, rodItemId = 'basic_rod', catchConfigOverride = null, allowedTiers = null) {
    const rod = catchConfigOverride || getRodCatchConfig(rodItemId);
    const effectiveDepth = Math.max(0, (Number(depthM) || 0) + (rod.catchDepthBonusM || 0));
    let pool = getFishPoolAtDepth(effectiveDepth);

    if (allowedTiers && allowedTiers.size > 0) {
        pool = pool.filter((fish) => allowedTiers.has(fish.tier || 1));
    }

    const fallback = getGameItem('minnow');

    if (!pool.length) {
        const weightMultiplier = rod.catchWeightMin ?? 1;
        const npcValue = Math.max(1, Math.floor((fallback?.npcValue ?? 3) * weightMultiplier));
        return {
            fish: fallback,
            weightKg: computeCatchWeightKg(fallback?.tier, weightMultiplier),
            npcValue,
            caughtWithRod: rodItemId,
            weightMultiplier
        };
    }

    const tierBias = rod.catchTierBias ?? 0;
    const weights = pool.map((fish) => {
        const stockWeight = 1;
        return (1 + Math.max(0, (fish.tier || 1) - 1) * tierBias) * stockWeight;
    });
    const fish = weightedPick(pool, weights);

    const minW = rod.catchWeightMin ?? 1;
    const maxW = rod.catchWeightMax ?? minW;
    const weightMultiplier = minW + Math.random() * Math.max(0, maxW - minW);
    const npcValue = Math.max(1, Math.floor((fish.npcValue || 1) * weightMultiplier));
    const weightKg = computeCatchWeightKg(fish.tier, weightMultiplier);

    return {
        fish,
        weightKg,
        npcValue,
        caughtWithRod: rodItemId,
        weightMultiplier
    };
}

export function rollFishAtDepth(depthM) {
    return rollCatchAtDepth(depthM, 'basic_rod').fish;
}

export function isFishAllowedAtDepth(fishId, depthM) {
    if (!fishId) return false;
    return getFishPoolAtDepth(depthM).some((item) => item.id === fishId);
}

