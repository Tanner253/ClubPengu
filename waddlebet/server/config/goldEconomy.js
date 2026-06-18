/**
 * Gold scarcity tuning — single source of truth.
 * Gold is precious: earn slowly, spend on ferry/wagers/slots/puffles.
 * Progression (bait, tools, backpack, quests) uses materials.
 */

export const GOLD_ECONOMY_VERSION = 2;

/** One-time haircut for existing balances (keep 10% — relative wealth preserved). */
export const GOLD_BALANCE_RETENTION = 0.1;

export const STARTING_COINS = 10;

export const FERRY_GOLD_COST = 1;

/** Direct town ↔ forest route (skips snow forts) — premium fare. */
export const FERRY_FOREST_DIRECT_COST = 3;

export const BAIT_ITEM_ID = 'worm';
export const BAIT_PER_CAST = 1;

/** Starter rod pickup includes bait so first session works. */
export const STARTER_BAIT_QUANTITY = 12;

/** Worm bundle at Old Salty — buy with gold. */
export const BAIT_GOLD_BUNDLE = {
    itemId: 'worm',
    quantity: 5,
    goldCost: 1,
};

/** Extra worm lost on a missed catch (bait snapped off). */
export const BAIT_MISS_EXTRA_LOSS_CHANCE = 0.2;

export const GOLD_SLOT_BET_DEFAULT = 1;
export const GOLD_SLOT_BET_MIN = 1;
export const GOLD_SLOT_BET_MAX = 25;

/** Max gold stake per PvP wager (scarce gold — keeps wagers meaningful). */
export const MAX_WAGER_GOLD = 50;

/** PvE casino blackjack — same band as PvP wagers. */
export const PVE_BJ_MIN_BET = 1;
export const PVE_BJ_MAX_BET = MAX_WAGER_GOLD;

/** Gold drip when two active puffles interact (both owners). */
export const PUFFLE_SOCIAL_GOLD_REWARD = 2;

/** Emergency NPC sell — fraction of catalog npcValue (mint recipes pay better for wood). */
export const NPC_EMERGENCY_SELL_RATIO = 0.1;

/** Burn materials at merchants to mint gold intentionally (wood only — fish uses emergency sell). */
export const GOLD_MINT_RECIPES = [
    {
        itemId: 'gold_mint_wood_char',
        label: 'Charcoal bundle → 10g',
        description: '64 pine logs — bulk contractor payout',
        goldOutput: 10,
        materialCost: { pine_log: 64 },
    },
    {
        itemId: 'gold_mint_wood_lumber',
        label: 'Lumber crate → 28g',
        description: '48 birch + 32 pine + 16 oak — full mill run',
        goldOutput: 28,
        materialCost: { birch_log: 48, pine_log: 32, oak_log: 16 },
    },
    {
        itemId: 'gold_mint_wood_fine',
        label: 'Fine timber lot → 45g',
        description: '40 birch + 32 oak + 16 ironwood — premium bundle',
        goldOutput: 45,
        materialCost: { birch_log: 40, oak_log: 32, ironwood_log: 16 },
    },
];

export function clampGoldSlotBet(bet) {
    const n = Math.floor(Number(bet) || GOLD_SLOT_BET_DEFAULT);
    return Math.min(GOLD_SLOT_BET_MAX, Math.max(GOLD_SLOT_BET_MIN, n));
}

export function clampWagerGold(amount) {
    const n = Math.floor(Number(amount) || 0);
    if (n <= 0) return 0;
    return Math.min(MAX_WAGER_GOLD, n);
}

export function isValidWagerGold(amount) {
    const n = Math.floor(Number(amount) || 0);
    if (n === 0) return true;
    return n >= 1 && n <= MAX_WAGER_GOLD;
}

export function applyGoldBalanceRetention(coins, alreadyAppliedVersion) {
    if (alreadyAppliedVersion >= GOLD_ECONOMY_VERSION) {
        return { coins: Math.max(0, Math.floor(coins || 0)), applied: false };
    }
    const retained = Math.max(0, Math.floor((coins || 0) * GOLD_BALANCE_RETENTION));
    return { coins: retained, applied: true };
}

export default {
    GOLD_ECONOMY_VERSION,
    GOLD_BALANCE_RETENTION,
    STARTING_COINS,
    FERRY_GOLD_COST,
    BAIT_ITEM_ID,
    BAIT_PER_CAST,
    MAX_WAGER_GOLD,
    PVE_BJ_MIN_BET,
    PVE_BJ_MAX_BET,
    PUFFLE_SOCIAL_GOLD_REWARD,
    NPC_EMERGENCY_SELL_RATIO,
    GOLD_SLOT_BET_DEFAULT,
    GOLD_SLOT_BET_MIN,
    GOLD_SLOT_BET_MAX,
};
