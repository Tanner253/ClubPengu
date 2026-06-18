/**
 * Economy display helpers (client) — keep in sync with server/config/economy.js
 */

export const GAME_INVENTORY = {
    COLUMNS: 10,
    DISPLAY_ROWS: 6,
    DEFAULT_SLOTS: 5,
    MAX_SLOTS: 60,
    SLOTS_PER_UPGRADE: 5,
    UPGRADE_BASE_COST: 0,
    UPGRADE_COST_MULTIPLIER: 1,
    BACKPACK_WOOD_TYPES: ['pine_log', 'birch_log', 'oak_log', 'ironwood_log'],
    BACKPACK_WOOD_STACK: 64,
    BACKPACK_WOOD_STARTS_AT_UPGRADE: 1,
    BACKPACK_WOOD_TIER_COSTS: {
        1: { pine_log: 32 },
        2: { pine_log: 64, birch_log: 40 },
        3: { pine_log: 64, birch_log: 64, oak_log: 40 },
        4: { pine_log: 96, birch_log: 96, oak_log: 64, ironwood_log: 40 },
        5: { pine_log: 128, birch_log: 128, oak_log: 96, ironwood_log: 64 },
        6: { pine_log: 160, birch_log: 160, oak_log: 128, ironwood_log: 96 },
        7: { pine_log: 192, birch_log: 192, oak_log: 160, ironwood_log: 128 },
        8: { pine_log: 256, birch_log: 256, oak_log: 224, ironwood_log: 160 },
        9: { pine_log: 320, birch_log: 320, oak_log: 256, ironwood_log: 192 },
        10: { pine_log: 384, birch_log: 384, oak_log: 320, ironwood_log: 256 }
    }
};

export function slotsNeededToStoreWood(woodRequired, maxStack = GAME_INVENTORY.BACKPACK_WOOD_STACK) {
    if (!woodRequired) return 0;
    return Object.values(woodRequired).reduce(
        (sum, qty) => sum + Math.ceil(Math.max(0, qty) / maxStack),
        0
    );
}

export function getBackpackWoodRequirements(unlockedSlots) {
    const gi = GAME_INVENTORY;
    if (unlockedSlots >= gi.MAX_SLOTS) return null;

    const completedUpgrades = Math.floor((unlockedSlots - gi.DEFAULT_SLOTS) / gi.SLOTS_PER_UPGRADE);
    const nextUpgradeNumber = completedUpgrades + 1;
    if (nextUpgradeNumber < gi.BACKPACK_WOOD_STARTS_AT_UPGRADE) return null;

    const woodTier = nextUpgradeNumber - gi.BACKPACK_WOOD_STARTS_AT_UPGRADE + 1;
    const tierCosts = gi.BACKPACK_WOOD_TIER_COSTS[woodTier];
    if (!tierCosts) return null;

    return { ...tierCosts };
}

export function getBackpackUpgradeInfo(unlockedSlots) {
    if (unlockedSlots >= GAME_INVENTORY.MAX_SLOTS) return null;
    const tier = Math.max(0, Math.floor((unlockedSlots - GAME_INVENTORY.DEFAULT_SLOTS) / GAME_INVENTORY.SLOTS_PER_UPGRADE));
    const nextSlots = Math.min(unlockedSlots + GAME_INVENTORY.SLOTS_PER_UPGRADE, GAME_INVENTORY.MAX_SLOTS);
    const cost = Math.round(GAME_INVENTORY.UPGRADE_BASE_COST * Math.pow(GAME_INVENTORY.UPGRADE_COST_MULTIPLIER, tier));
    return {
        nextSlots,
        cost,
        slotsAdded: nextSlots - unlockedSlots,
        upgradeNumber: tier + 1,
        woodRequired: getBackpackWoodRequirements(unlockedSlots)
    };
}

export const WOOD_LABELS = {
    pine_log: 'Pine',
    birch_log: 'Birch',
    oak_log: 'Oak',
    ironwood_log: 'Ironwood'
};

/** @deprecated Display from merchants.js listing cost / woodRequired */
export const MERCHANT_TOOL_COSTS = {
    basic_axe: 1,
    iron_axe: 450,
    steel_axe: 1400,
    master_axe: 3800
};

export const HOTBAR = {
    SIZE: 5
};

export const STAGE_DURABILITY_LOSS = {
    sapling: 1,
    baby: 3,
    mature: 6,
    elder: 12
};

export const AXE_DURABILITY_MULTIPLIER = {
    basic_axe: 1.35,
    iron_axe: 1.0,
    steel_axe: 0.75,
    master_axe: 0.5
};

export function getChopDurabilityLoss(stage, axeItemId = 'basic_axe') {
    const base = STAGE_DURABILITY_LOSS[stage] ?? 1;
    const mult = AXE_DURABILITY_MULTIPLIER[axeItemId] ?? 1;
    return Math.max(1, Math.ceil(base * mult));
}

export const TOOL_DURABILITY = {
    basic_axe: { max: 80, lossPerChop: 1 },
    iron_axe: { max: 220, lossPerChop: 1 },
    steel_axe: { max: 400, lossPerChop: 1 },
    master_axe: { max: 650, lossPerChop: 1 }
};

export const AXE_ITEM_IDS = ['basic_axe', 'iron_axe', 'steel_axe', 'master_axe'];

export const ROD_ITEM_IDS = ['basic_rod', 'iron_rod', 'pro_rod', 'master_rod'];

export { ROD_UPGRADE_STEPS, ROD_UPGRADE_MAX_STEP } from './rodUpgrades.js';

export const WOOD_NPC_VALUE = {
    pine_log: 3,
    birch_log: 6,
    oak_log: 10,
    ironwood_log: 16
};

export default GAME_INVENTORY;
