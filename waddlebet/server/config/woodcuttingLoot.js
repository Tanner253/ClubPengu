/**
 * Wood chop loot — tree growth sets yield size; axe tier gates log species odds.
 * Keep in sync with src/config/woodcuttingLoot.js
 */

/** chopSpeedMultiplier mirror — keep in sync with economy.js TOOLS */
const AXE_CHOP_SPEED = {
    basic_axe: 1,
    iron_axe: 0.82,
    steel_axe: 0.68,
    master_axe: 0.55
};

export const MANUAL_WOOD_MULTIPLIER = 1.5;

export const WOOD_LOG_IDS = ['pine_log', 'birch_log', 'oak_log', 'ironwood_log'];

/** Base logs per chop before rarity / axe / manual modifiers. */
export const STAGE_YIELD_BASE = {
    sapling: 2,
    baby: 4,
    mature: 7,
    elder: 12
};

/** Rarer species drop smaller stacks (more grind, more value). */
export const LOG_RARITY_QTY_MULT = {
    pine_log: 1,
    birch_log: 0.8,
    oak_log: 0.6,
    ironwood_log: 0.4
};

/** Weighted roll per axe — better axes unlock higher-tier wood. */
export const AXE_WOOD_WEIGHTS = {
    basic_axe: { pine_log: 62, birch_log: 28, oak_log: 9, ironwood_log: 1 },
    iron_axe: { pine_log: 40, birch_log: 32, oak_log: 22, ironwood_log: 6 },
    steel_axe: { pine_log: 25, birch_log: 28, oak_log: 30, ironwood_log: 17 },
    master_axe: { pine_log: 15, birch_log: 22, oak_log: 30, ironwood_log: 33 }
};

/**
 * Roll one wood type + quantity for a completed chop.
 * @param {{ treeId: string, stage?: string, axeItemId?: string, chopMode?: string, rng?: () => number }} opts
 */
export function getWoodChopQuantityForLog(stage, logItemId, axeItemId = 'basic_axe', chopMode = 'hold') {
    let quantity = STAGE_YIELD_BASE[stage] || 2;
    quantity = Math.max(1, Math.round(quantity * (LOG_RARITY_QTY_MULT[logItemId] || 1)));

    const chopSpeed = AXE_CHOP_SPEED[axeItemId] ?? 1;
    const yieldBonus = 1 + (1 - chopSpeed) * 0.15;
    quantity = Math.max(1, Math.round(quantity * yieldBonus));

    if (chopMode === 'manual') {
        quantity = Math.max(1, Math.round(quantity * MANUAL_WOOD_MULTIPLIER));
    }

    return quantity;
}

export function rollWoodChopLoot({
    treeId,
    stage = 'mature',
    axeItemId = 'basic_axe',
    chopMode = 'hold',
    rng = Math.random
}) {
    const weights = AXE_WOOD_WEIGHTS[axeItemId] || AXE_WOOD_WEIGHTS.basic_axe;
    const total = WOOD_LOG_IDS.reduce((sum, id) => sum + (weights[id] || 0), 0);
    let pick = rng() * total;
    let logItemId = WOOD_LOG_IDS[0];
    for (const id of WOOD_LOG_IDS) {
        pick -= weights[id] || 0;
        if (pick <= 0) {
            logItemId = id;
            break;
        }
    }

    const quantity = getWoodChopQuantityForLog(stage, logItemId, axeItemId, chopMode);
    return { logItemId, quantity, stageHarvested: stage, treeId };
}

/** UI hint — typical yield for a tree stage (pine-equivalent stack size). */
export function getWoodYield(stage, chopMode = 'hold') {
    let base = STAGE_YIELD_BASE[stage] || 2;
    if (chopMode === 'manual') {
        base = Math.max(1, Math.round(base * MANUAL_WOOD_MULTIPLIER));
    }
    return base;
}

export default rollWoodChopLoot;
