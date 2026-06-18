/** Client copy — keep in sync with server/config/goldEconomy.js */

export const FERRY_GOLD_COST = 1;

export const BAIT_ITEM_ID = 'worm';
export const BAIT_PER_CAST = 1;

export const GOLD_SLOT_BET_DEFAULT = 1;
export const GOLD_SLOT_BET_MIN = 1;
export const GOLD_SLOT_BET_MAX = 25;

/** Max gold stake per PvP wager — keep in sync with server/config/goldEconomy.js */
export const MAX_WAGER_GOLD = 50;

/** PvE casino blackjack — same band as PvP wagers. */
export const PVE_BJ_MIN_BET = 1;
export const PVE_BJ_MAX_BET = MAX_WAGER_GOLD;
/** Emergency NPC sell — fraction of catalog npcValue. */
export const NPC_EMERGENCY_SELL_RATIO = 0.1;

export function clampGoldSlotBet(bet) {
    const n = Math.floor(Number(bet) || GOLD_SLOT_BET_DEFAULT);
    return Math.min(GOLD_SLOT_BET_MAX, Math.max(GOLD_SLOT_BET_MIN, n));
}

export function clampWagerGold(amount) {
    const n = Math.floor(Number(amount) || 0);
    if (n <= 0) return 0;
    return Math.min(MAX_WAGER_GOLD, n);
}

