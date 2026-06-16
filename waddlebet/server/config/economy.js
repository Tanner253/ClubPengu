/**

 * Economy configuration — single source of truth for grind loop tuning.

 * Dev / QA / Prod share these defaults; override via env if needed later.

 */



export const ECONOMY = {

    GAME_INVENTORY: {

        COLUMNS: 10,

        DISPLAY_ROWS: 6,

        DEFAULT_SLOTS: 5,

        MAX_SLOTS: 60,

        MAX_STACK: 64,

        /** Each upgrade unlocks +5 slots */

        SLOTS_PER_UPGRADE: 5,

        /** Exponential gold cost: base × multiplier^tier (5→10, 10→15, …) */

        UPGRADE_BASE_COST: 250,

        UPGRADE_COST_MULTIPLIER: 3.5,

        /** All four tiers required once wood upgrades begin (upgrade #2+) */
        BACKPACK_WOOD_TYPES: ['pine_log', 'birch_log', 'oak_log', 'ironwood_log'],

        BACKPACK_WOOD_STACK: 64,

        /** Upgrade 5→10 is gold-only; 10→15+ needs every wood type */
        BACKPACK_WOOD_STARTS_AT_UPGRADE: 2,

        /** 50% of max stack per type on first wood upgrade (32 each) */
        BACKPACK_WOOD_BASE_RATIO: 0.5,

        /** Each later wood-gated upgrade scales quantity (32 → 40 → 50 → 64 cap) */
        BACKPACK_WOOD_SCALE: 1.25

    },

    FISHING: {

        BAIT_COST: 5,

        /** NPC pays this fraction of catalog npcValue (1.0 = full listed price) */

        NPC_SELL_RATIO: 1.0,

        XP_PER_CATCH: 10,

        XP_PER_GOLD_SOLD: 1

    },

    WOODCUTTING: {

        CHOP_DURATION_MS: 2500,

        NPC_SELL_RATIO: 1.0,

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
            cost: 100,
            maxDurability: 80,
            /** @deprecated use getChopDurabilityLoss — kept for fallback */
            durabilityLossPerChop: 1,
            /** Higher = more wear per chop (basic is punishing on big trees) */
            durabilityDamageMultiplier: 1.35,
            chopSpeedMultiplier: 1
        },
        iron_axe: {
            id: 'iron_axe',
            cost: 450,
            maxDurability: 220,
            durabilityLossPerChop: 1,
            durabilityDamageMultiplier: 1.0,
            chopSpeedMultiplier: 0.82
        },
        steel_axe: {
            id: 'steel_axe',
            cost: 1400,
            maxDurability: 400,
            durabilityLossPerChop: 1,
            durabilityDamageMultiplier: 0.75,
            chopSpeedMultiplier: 0.68
        },
        master_axe: {
            id: 'master_axe',
            cost: 3800,
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

        basic_rod: { id: 'basic_rod', name: 'Basic Rod', tier: 1 },

        pro_rod: { id: 'pro_rod', name: 'Pro Rod', tier: 2 },

        master_rod: { id: 'master_rod', name: 'Master Rod', tier: 3 }

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

    const baseQty = Math.round(gi.BACKPACK_WOOD_STACK * gi.BACKPACK_WOOD_BASE_RATIO);

    const qtyPerType = Math.min(

        gi.BACKPACK_WOOD_STACK,

        Math.round(baseQty * Math.pow(gi.BACKPACK_WOOD_SCALE, woodTier - 1))

    );



    /** @type {Record<string, number>} */

    const woodRequired = {};

    for (const itemId of gi.BACKPACK_WOOD_TYPES) {

        woodRequired[itemId] = qtyPerType;

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
    const yields = { sapling: 1, baby: 25, mature: 50, elder: 100 };
    const logs = {
        sapling: 'pine_log',
        baby: 'birch_log',
        mature: 'oak_log',
        elder: 'ironwood_log'
    };
    const qty = yields[stage] ?? 1;
    const wood = ECONOMY.WOOD[logs[stage]] || ECONOMY.WOOD.pine_log;
    return Math.floor(wood.npcValue * ECONOMY.WOODCUTTING.NPC_SELL_RATIO * qty);
}

export default ECONOMY;


