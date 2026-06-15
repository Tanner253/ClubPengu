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

        UPGRADE_COST_MULTIPLIER: 3.5

    },

    FISHING: {

        BAIT_COST: 5,

        /** NPC pays this fraction of catalog npcValue (1.0 = full listed price) */

        NPC_SELL_RATIO: 1.0,

        XP_PER_CATCH: 10,

        XP_PER_GOLD_SOLD: 1

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

 * Next backpack upgrade (null if already maxed).

 * @param {number} unlockedSlots

 * @returns {{ nextSlots: number, cost: number, slotsAdded: number } | null}

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

        slotsAdded: nextSlots - unlockedSlots

    };

}



export default ECONOMY;


