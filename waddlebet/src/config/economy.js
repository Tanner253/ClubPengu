/**
 * Economy display helpers (client) — keep in sync with server/config/economy.js
 */

export const GAME_INVENTORY = {
    COLUMNS: 10,
    DISPLAY_ROWS: 6,
    DEFAULT_SLOTS: 5,
    MAX_SLOTS: 60,
    SLOTS_PER_UPGRADE: 5,
    UPGRADE_BASE_COST: 250,
    UPGRADE_COST_MULTIPLIER: 3.5
};

export function getBackpackUpgradeInfo(unlockedSlots) {
    if (unlockedSlots >= GAME_INVENTORY.MAX_SLOTS) return null;
    const tier = Math.max(0, Math.floor((unlockedSlots - GAME_INVENTORY.DEFAULT_SLOTS) / GAME_INVENTORY.SLOTS_PER_UPGRADE));
    const nextSlots = Math.min(unlockedSlots + GAME_INVENTORY.SLOTS_PER_UPGRADE, GAME_INVENTORY.MAX_SLOTS);
    const cost = Math.round(GAME_INVENTORY.UPGRADE_BASE_COST * Math.pow(GAME_INVENTORY.UPGRADE_COST_MULTIPLIER, tier));
    return { nextSlots, cost, slotsAdded: nextSlots - unlockedSlots };
}

export default GAME_INVENTORY;
