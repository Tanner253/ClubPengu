/**
 * Wood chop loot (client) — keep in sync with server/config/woodcuttingLoot.js
 */

export const MANUAL_WOOD_MULTIPLIER = 1.5;

export const WOOD_LOG_IDS = ['pine_log', 'birch_log', 'oak_log', 'ironwood_log'];

export const STAGE_YIELD_BASE = {
    sapling: 2,
    baby: 4,
    mature: 7,
    elder: 12
};

export const LOG_RARITY_QTY_MULT = {
    pine_log: 1,
    birch_log: 0.8,
    oak_log: 0.6,
    ironwood_log: 0.4
};

const AXE_CHOP_SPEED = {
    basic_axe: 1,
    iron_axe: 0.82,
    steel_axe: 0.68,
    master_axe: 0.55
};

export const AXE_WOOD_WEIGHTS = {
    basic_axe: { pine_log: 62, birch_log: 28, oak_log: 9, ironwood_log: 1 },
    iron_axe: { pine_log: 40, birch_log: 32, oak_log: 22, ironwood_log: 6 },
    steel_axe: { pine_log: 25, birch_log: 28, oak_log: 30, ironwood_log: 17 },
    master_axe: { pine_log: 15, birch_log: 22, oak_log: 30, ironwood_log: 33 }
};

export function getWoodYield(stage, chopMode = 'hold') {
    let base = STAGE_YIELD_BASE[stage] || 2;
    if (chopMode === 'manual') {
        base = Math.max(1, Math.round(base * MANUAL_WOOD_MULTIPLIER));
    }
    return base;
}

/** Quantity for a specific log type (mirrors server rollWoodChopLoot math). */
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
