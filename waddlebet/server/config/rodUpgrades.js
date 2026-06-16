/**
 * Fishing rod upgrades — 2 paid steps per tier at Old Salty.
 * Step 1: new wood type. Step 2: more of the same wood → next rod tier.
 * Keep in sync with src/config/rodUpgrades.js
 */

import { ECONOMY, getRodCatchConfig } from './economy.js';

export const ROD_TIER_CHAIN = ['basic_rod', 'iron_rod', 'pro_rod', 'master_rod'];

/** @typedef {{ id: string, tierName: string, stepInTier: 1|2, requiredRodId: string, grantsRodId: string|null, goldCost: number, woodRequired: Record<string, number>, label: string, sublabel: string }} RodUpgradeStep */

/** @type {RodUpgradeStep[]} */
export const ROD_UPGRADE_STEPS = [
    {
        id: 'iron_1',
        tierName: 'Iron',
        stepInTier: 1,
        requiredRodId: 'basic_rod',
        grantsRodId: null,
        goldCost: 140,
        woodRequired: { pine_log: 14 },
        label: 'Iron Rod — Step 1',
        sublabel: 'Wrap the blank in pine — lighter catches improve'
    },
    {
        id: 'iron_2',
        tierName: 'Iron',
        stepInTier: 2,
        requiredRodId: 'basic_rod',
        grantsRodId: 'iron_rod',
        goldCost: 260,
        woodRequired: { pine_log: 32 },
        label: 'Forge Iron Rod',
        sublabel: 'Full iron reel & guides — reach deeper tiers'
    },
    {
        id: 'pro_1',
        tierName: 'Pro',
        stepInTier: 1,
        requiredRodId: 'iron_rod',
        grantsRodId: null,
        goldCost: 520,
        woodRequired: { birch_log: 18 },
        label: 'Pro Rod — Step 1',
        sublabel: 'Birch-carbon wrap — better species at depth'
    },
    {
        id: 'pro_2',
        tierName: 'Pro',
        stepInTier: 2,
        requiredRodId: 'iron_rod',
        grantsRodId: 'pro_rod',
        goldCost: 920,
        woodRequired: { birch_log: 38 },
        label: 'Craft Pro Rod',
        sublabel: 'Full pro blank — heavy fish & deep pools'
    },
    {
        id: 'master_1',
        tierName: 'Master',
        stepInTier: 1,
        requiredRodId: 'pro_rod',
        grantsRodId: null,
        goldCost: 1600,
        woodRequired: { oak_log: 22 },
        label: 'Master Rod — Step 1',
        sublabel: 'Oak core reinforcement — mythic species bias'
    },
    {
        id: 'master_2',
        tierName: 'Master',
        stepInTier: 2,
        requiredRodId: 'pro_rod',
        grantsRodId: 'master_rod',
        goldCost: 2800,
        woodRequired: { oak_log: 50 },
        label: 'Complete Master Rod',
        sublabel: 'Legendary tackle — max weight & depth'
    }
];

export const ROD_UPGRADE_MAX_STEP = ROD_UPGRADE_STEPS.length;

export function getRodUpgradeStep(user) {
    const step = user?.fishingProgress?.rodUpgradeStep;
    if (typeof step !== 'number' || step < 0) return 0;
    return Math.min(step, ROD_UPGRADE_MAX_STEP);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpRodConfig(fromId, toId, t) {
    const from = getRodCatchConfig(fromId);
    const to = getRodCatchConfig(toId);
    return {
        id: from.id,
        catchDepthBonusM: Math.round(lerp(from.catchDepthBonusM || 0, to.catchDepthBonusM || 0, t)),
        catchTierBias: lerp(from.catchTierBias || 0, to.catchTierBias || 0, t),
        catchWeightMin: lerp(from.catchWeightMin ?? 1, to.catchWeightMin ?? 1, t),
        catchWeightMax: lerp(from.catchWeightMax ?? 1, to.catchWeightMax ?? 1, t),
        maxDurability: Math.round(lerp(from.maxDurability || 70, to.maxDurability || 70, t))
    };
}

/** Catch stats from owned rod + completed upgrade steps (partial tier = ~40% toward next). */
export function getEffectiveRodCatchConfig(rodItemId, completedSteps = 0) {
    const idx = ROD_TIER_CHAIN.indexOf(rodItemId);
    if (idx < 0) return getRodCatchConfig('basic_rod');

    if (completedSteps >= ROD_UPGRADE_MAX_STEP) {
        return getRodCatchConfig('master_rod');
    }

    if (completedSteps % 2 === 1 && idx < ROD_TIER_CHAIN.length - 1) {
        return lerpRodConfig(rodItemId, ROD_TIER_CHAIN[idx + 1], 0.4);
    }

    return getRodCatchConfig(rodItemId);
}

/**
 * @param {number} completedSteps
 * @param {(rodId: string) => boolean} ownsRod
 * @returns {RodUpgradeStep|null}
 */
export function getNextRodUpgrade(completedSteps, ownsRod) {
    if (completedSteps >= ROD_UPGRADE_MAX_STEP) return null;
    const step = ROD_UPGRADE_STEPS[completedSteps];
    if (!step || !ownsRod(step.requiredRodId)) return null;
    return step;
}

export function buildNextRodUpgradePreview(completedSteps, ownsRod) {
    const step = getNextRodUpgrade(completedSteps, ownsRod);
    if (!step) return null;
    return {
        stepIndex: completedSteps,
        ...step,
        grantsRodId: step.grantsRodId || step.requiredRodId,
        isPartialStep: !step.grantsRodId
    };
}

export default ROD_UPGRADE_STEPS;
