/**
 * Fishing rod upgrades (client) — keep in sync with server/config/rodUpgrades.js
 */

export const ROD_TIER_CHAIN = ['basic_rod', 'iron_rod', 'pro_rod', 'master_rod'];

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

export function getRodCatchSummaryForTier(tierName) {
    const map = {
        Iron: { depthBonusM: 60, tierBias: 0.18, weightRange: '0.95–1.12×' },
        Pro: { depthBonusM: 140, tierBias: 0.35, weightRange: '1.0–1.25×' },
        Master: { depthBonusM: 250, tierBias: 0.55, weightRange: '1.08–1.38×' }
    };
    return map[tierName] || null;
}

export default ROD_UPGRADE_STEPS;
