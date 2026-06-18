/**
 * Wood chop loot — tree species determines log type; axe tier affects quantity only.
 * Keep in sync with src/config/woodcuttingLoot.js
 */

import { getHarvestableTree } from './harvestableTrees.js';

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

/**
 * Resolve loot for a chop — log type comes from the tree species, not a random roll.
 */
export function rollWoodChopLoot({
    treeId,
    stage = 'mature',
    axeItemId = 'basic_axe',
    chopMode = 'hold',
    woodType = null,
}) {
    const treeDef = treeId ? getHarvestableTree(treeId) : null;
    const logItemId = woodType || treeDef?.woodType || 'pine_log';
    const quantity = getWoodChopQuantityForLog(stage, logItemId, axeItemId, chopMode);
    return { logItemId, quantity, stageHarvested: stage, treeId, woodType: logItemId };
}

/** UI hint — typical yield for a tree stage (pine-equivalent stack size). */
export function getWoodYield(stage, chopMode = 'hold') {
    let base = STAGE_YIELD_BASE[stage] || 2;
    if (chopMode === 'manual') {
        base = Math.max(1, Math.round(base * MANUAL_WOOD_MULTIPLIER));
    }
    return base;
}

/** UI hint — logs for this specific tree species. */
export function getWoodYieldLabel(stage, chopMode = 'hold', axeItemId = 'basic_axe', woodType = 'pine_log') {
    const qty = getWoodChopQuantityForLog(stage, woodType, axeItemId, chopMode);
    return `${qty}`;
}

export default rollWoodChopLoot;
