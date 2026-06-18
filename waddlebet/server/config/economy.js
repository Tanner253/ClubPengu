/**

 * Economy configuration — single source of truth for grind loop tuning.

 * Dev / QA / Prod share these defaults; override via env if needed later.

 */

import { STAGE_YIELD_BASE } from './woodcuttingLoot.js';

export const ECONOMY = {

    GAME_INVENTORY: {

        COLUMNS: 10,

        DISPLAY_ROWS: 6,

        DEFAULT_SLOTS: 5,

        MAX_SLOTS: 60,

        MAX_STACK: 64,

        /** Each upgrade unlocks +5 slots */

        SLOTS_PER_UPGRADE: 5,

        /** Backpack slot upgrades use wood only — no gold sink here. */

        UPGRADE_BASE_COST: 0,

        UPGRADE_COST_MULTIPLIER: 1,

        /** Wood types unlock one at a time on early tiers; later tiers need all four. */
        BACKPACK_WOOD_TYPES: ['pine_log', 'birch_log', 'oak_log', 'ironwood_log'],

        BACKPACK_WOOD_STACK: 64,

        /** Every backpack tier costs wood — gold is for bait, travel, wagers, puffles. */
        BACKPACK_WOOD_STARTS_AT_UPGRADE: 1,

        /**
         * Explicit wood cost per wood-gated tier (tier 1 = 10→15 slots).
         * Each row must fit in `unlockedSlots` at that stage (see slotsNeededToStoreWood).
         */
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

    },

    FISHING: {

        /** Bait consumed per cast from backpack (see goldEconomy.BAIT_ITEM_ID). */
        BAIT_ITEM_ID: 'worm',
        BAIT_PER_CAST: 1,

        /** @deprecated gold bait removed */
        BAIT_COST: 0,

        /** NPC pays this fraction of catalog npcValue (emergency sell — mint recipes are primary). */

        NPC_SELL_RATIO: 0.1,

        XP_PER_CATCH: 10,

        XP_PER_GOLD_SOLD: 1

    },

    WOODCUTTING: {

        CHOP_DURATION_MS: 2500,

        NPC_SELL_RATIO: 0.1,

        XP_PER_LOG: 8,

        XP_PER_GOLD_SOLD: 1,

        /**
         * Base durability loss per chop (before axe tier multiplier).
         * Bigger trees hit the axe harder — see getChopDurabilityLoss().
         */
        STAGE_DURABILITY_LOSS: {
            sapling: 1,
            baby: 3,
            mature: 6,
            elder: 12
        }

    },

    /**
     * Wood catalog tuning — npcValue = emergency sell at Clive.
     * craftValue = target worth when used in recipes (Phase 2+); not yet enforced in code.
     */
    WOOD: {
        pine_log: { npcValue: 3, craftValue: 5, tier: 1 },
        birch_log: { npcValue: 6, craftValue: 10, tier: 2 },
        oak_log: { npcValue: 10, craftValue: 18, tier: 3 },
        ironwood_log: { npcValue: 16, craftValue: 28, tier: 4 }
    },

    HOTBAR: {

        SIZE: 5

    },

    TOOLS: {

        basic_axe: {
            id: 'basic_axe',
            cost: 1,
            maxDurability: 80,
            /** @deprecated use getChopDurabilityLoss — kept for fallback */
            durabilityLossPerChop: 1,
            /** Higher = more wear per chop (basic is punishing on big trees) */
            durabilityDamageMultiplier: 1.35,
            chopSpeedMultiplier: 1
        },
        iron_axe: {
            id: 'iron_axe',
            cost: 0,
            woodRequired: { pine_log: 120, birch_log: 64 },
            maxDurability: 220,
            durabilityLossPerChop: 1,
            durabilityDamageMultiplier: 1.0,
            chopSpeedMultiplier: 0.82
        },
        steel_axe: {
            id: 'steel_axe',
            cost: 0,
            woodRequired: { pine_log: 160, birch_log: 96, oak_log: 48 },
            maxDurability: 400,
            durabilityLossPerChop: 1,
            durabilityDamageMultiplier: 0.75,
            chopSpeedMultiplier: 0.68
        },
        master_axe: {
            id: 'master_axe',
            cost: 0,
            woodRequired: { pine_log: 200, birch_log: 128, oak_log: 80, ironwood_log: 32 },
            maxDurability: 650,
            durabilityLossPerChop: 1,
            durabilityDamageMultiplier: 0.5,
            chopSpeedMultiplier: 0.55
        }

    },

    FISH_BUYER: {

        NPC_ID: 'fish_buyer',

        /** @deprecated use MERCHANTS.fish_buyer — kept for compat */

    },

    RODS: {
        basic_rod: {
            id: 'basic_rod',
            name: 'Basic Rod',
            tier: 1,
            cost: 0,
            maxDurability: 70,
            durabilityLossPerCast: 1,
            /** Extra effective depth (m) when rolling catch tier pool. */
            catchDepthBonusM: 0,
            /** Bias loot roll toward higher-tier fish already in the pool (0–1). */
            catchTierBias: 0,
            /** Random weight multiplier on catalog value — stored on fish at catch time. */
            catchWeightMin: 0.85,
            catchWeightMax: 1.0
        },
        iron_rod: {
            id: 'iron_rod',
            name: 'Iron Rod',
            tier: 2,
            maxDurability: 160,
            durabilityLossPerCast: 1,
            catchDepthBonusM: 60,
            catchTierBias: 0.18,
            catchWeightMin: 0.95,
            catchWeightMax: 1.12
        },
        pro_rod: {
            id: 'pro_rod',
            name: 'Pro Rod',
            tier: 3,
            maxDurability: 280,
            durabilityLossPerCast: 1,
            catchDepthBonusM: 140,
            catchTierBias: 0.35,
            catchWeightMin: 1.0,
            catchWeightMax: 1.25
        },
        master_rod: {
            id: 'master_rod',
            name: 'Master Rod',
            tier: 4,
            maxDurability: 500,
            durabilityLossPerCast: 1,
            catchDepthBonusM: 250,
            catchTierBias: 0.55,
            catchWeightMin: 1.08,
            catchWeightMax: 1.38
        }
    },

    BAIT: {

        worm: { id: 'worm', name: 'Worm Bait', cost: 5, tier: 1 }

    }

};



/** @returns {number} */

export function getMaxSlotCount() {

    return ECONOMY.GAME_INVENTORY.MAX_SLOTS;

}



/**
 * Backpack slots required to hold a wood cost (one stack = MAX_STACK per slot).
 * @param {Record<string, number> | null} woodRequired
 * @param {number} [maxStack]
 */
export function slotsNeededToStoreWood(woodRequired, maxStack = ECONOMY.GAME_INVENTORY.MAX_STACK) {
    if (!woodRequired) return 0;
    return Object.values(woodRequired).reduce(
        (sum, qty) => sum + Math.ceil(Math.max(0, qty) / maxStack),
        0
    );
}



/**

 * Wood cost for the next backpack upgrade (null = gold-only tier).

 * @param {number} unlockedSlots

 * @returns {Record<string, number> | null}

 */

export function getBackpackWoodRequirements(unlockedSlots) {

    const gi = ECONOMY.GAME_INVENTORY;

    if (unlockedSlots >= gi.MAX_SLOTS) return null;



    const completedUpgrades = Math.floor((unlockedSlots - gi.DEFAULT_SLOTS) / gi.SLOTS_PER_UPGRADE);

    const nextUpgradeNumber = completedUpgrades + 1;



    if (nextUpgradeNumber < gi.BACKPACK_WOOD_STARTS_AT_UPGRADE) return null;



    const woodTier = nextUpgradeNumber - gi.BACKPACK_WOOD_STARTS_AT_UPGRADE + 1;
    const tierCosts = gi.BACKPACK_WOOD_TIER_COSTS[woodTier];
    if (!tierCosts) return null;

    const woodRequired = { ...tierCosts };
    const slotsNeeded = slotsNeededToStoreWood(woodRequired, gi.MAX_STACK);
    if (slotsNeeded > unlockedSlots) {
        console.warn(
            `[economy] Backpack wood tier ${woodTier} needs ${slotsNeeded} slots at ${unlockedSlots} unlocked — check BACKPACK_WOOD_TIER_COSTS`
        );
    }

    return woodRequired;

}



/**

 * Next backpack upgrade (null if already maxed).

 * @param {number} unlockedSlots

 * @returns {{ nextSlots: number, cost: number, slotsAdded: number, upgradeNumber: number, woodRequired: Record<string, number> | null } | null}

 */

export function getBackpackUpgradeInfo(unlockedSlots) {

    const { DEFAULT_SLOTS, MAX_SLOTS, SLOTS_PER_UPGRADE, UPGRADE_BASE_COST, UPGRADE_COST_MULTIPLIER } = ECONOMY.GAME_INVENTORY;

    if (unlockedSlots >= MAX_SLOTS) return null;



    const tier = Math.max(0, Math.floor((unlockedSlots - DEFAULT_SLOTS) / SLOTS_PER_UPGRADE));

    const nextSlots = Math.min(unlockedSlots + SLOTS_PER_UPGRADE, MAX_SLOTS);

    const cost = Math.round(UPGRADE_BASE_COST * Math.pow(UPGRADE_COST_MULTIPLIER, tier));



    return {

        nextSlots,

        cost,

        slotsAdded: nextSlots - unlockedSlots,

        upgradeNumber: tier + 1,

        woodRequired: getBackpackWoodRequirements(unlockedSlots)

    };

}

/**
 * Durability loss for one successful chop.
 * @param {string} stage — sapling | baby | mature | elder
 * @param {string} axeItemId
 * @returns {number}
 */
export function getChopDurabilityLoss(stage, axeItemId = 'basic_axe') {
    const base = ECONOMY.WOODCUTTING.STAGE_DURABILITY_LOSS[stage] ?? 1;
    const mult = ECONOMY.TOOLS[axeItemId]?.durabilityDamageMultiplier ?? 1;
    return Math.max(1, Math.ceil(base * mult));
}

/**
 * Estimated NPC gold from selling one tree harvest (all logs at Clive).
 * @param {string} stage
 * @returns {number}
 */
export function getTreeHarvestNpcGold(stage) {
    const qty = STAGE_YIELD_BASE[stage] ?? 2;
    const wood = ECONOMY.WOOD.pine_log;
    return Math.floor(wood.npcValue * ECONOMY.WOODCUTTING.NPC_SELL_RATIO * qty);
}

export const ROD_ITEM_IDS = Object.keys(ECONOMY.RODS);

/** @returns {typeof ECONOMY.RODS.basic_rod} */
export function getRodCatchConfig(rodItemId = 'basic_rod') {
    return ECONOMY.RODS[rodItemId] || ECONOMY.RODS.basic_rod;
}

export default ECONOMY;


