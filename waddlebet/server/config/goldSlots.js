/**
 * Gold lobby slot machine configuration (server-authoritative)
 * Player chooses bet (default 1g, max 25g) — caps jackpot exposure.
 */

import {
    GOLD_SLOT_BET_DEFAULT,
    GOLD_SLOT_BET_MIN,
    GOLD_SLOT_BET_MAX,
    clampGoldSlotBet,
} from './goldEconomy.js';

export const GOLD_SLOT_BET = GOLD_SLOT_BET_DEFAULT;
export { GOLD_SLOT_BET_DEFAULT, GOLD_SLOT_BET_MIN, GOLD_SLOT_BET_MAX, clampGoldSlotBet };
export const GOLD_SLOT_BET_MIN_EXPORT = GOLD_SLOT_BET_MIN;
export const GOLD_SLOT_BET_MAX_EXPORT = GOLD_SLOT_BET_MAX;

export const GOLD_SLOT_SPIN_MS = 2400;
export const GOLD_SLOT_TARGET_RTP = 0.93;

export const GOLD_SLOT_SYMBOLS = [
    'cherry',
    'lemon',
    'orange',
    'plum',
    'bell',
    'bar',
    'seven',
    'gold7'
];

export const GOLD_SLOT_PAYTABLE = {
    cherry: 3,
    lemon: 4,
    orange: 6,
    plum: 10,
    bell: 15,
    bar: 25,
    seven: 75,
    gold7: 200
};

export const GOLD_SLOT_TWO_CHERRY_MULT = 2;

export const GOLD_SLOT_WEIGHTS = {
    cherry: 53,
    lemon: 22,
    orange: 23,
    plum: 12,
    bell: 8,
    bar: 4,
    seven: 2,
    gold7: 0.5
};

export const GOLD_SLOT_MACHINE_IDS = [
    'casino_lobby_slot_0',
    'casino_lobby_slot_1',
    'casino_lobby_slot_2',
    'casino_lobby_slot_3',
    'casino_lobby_slot_4'
];

export const GOLD_SLOT_MACHINE_SET = new Set(GOLD_SLOT_MACHINE_IDS);

export function rollGoldSlotSymbol() {
    const entries = Object.entries(GOLD_SLOT_WEIGHTS);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [symbol, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return symbol;
    }
    return 'cherry';
}

export function calculateGoldSlotPayout(reels, bet = GOLD_SLOT_BET_DEFAULT) {
    const safeBet = clampGoldSlotBet(bet);
    const [a, b, c] = reels;
    if (a === b && b === c) {
        const mult = GOLD_SLOT_PAYTABLE[a] || 0;
        return mult * safeBet;
    }
    const cherryCount = reels.filter(s => s === 'cherry').length;
    if (cherryCount >= 2) {
        return GOLD_SLOT_TWO_CHERRY_MULT * safeBet;
    }
    return 0;
}

export function calculateGoldSlotRTP(
    weights = GOLD_SLOT_WEIGHTS,
    paytable = GOLD_SLOT_PAYTABLE,
    twoCherryMult = GOLD_SLOT_TWO_CHERRY_MULT
) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    const probs = Object.fromEntries(entries.map(([s, w]) => [s, w / total]));

    let ev = 0;
    for (const [symbol, p] of Object.entries(probs)) {
        ev += p ** 3 * (paytable[symbol] || 0);
    }

    const pCherry = probs.cherry || 0;
    ev += 3 * pCherry ** 2 * (1 - pCherry) * twoCherryMult;

    return ev;
}

export function getGoldSlotInfo() {
    const rtp = calculateGoldSlotRTP();
    return {
        bet: GOLD_SLOT_BET_DEFAULT,
        betMin: GOLD_SLOT_BET_MIN,
        betMax: GOLD_SLOT_BET_MAX,
        currency: 'gold',
        symbols: GOLD_SLOT_SYMBOLS,
        paytable: GOLD_SLOT_PAYTABLE,
        twoCherryMult: GOLD_SLOT_TWO_CHERRY_MULT,
        weights: GOLD_SLOT_WEIGHTS,
        rtp: Math.round(rtp * 10000) / 10000,
        houseEdge: Math.round((1 - rtp) * 10000) / 10000,
        mode: 'gold_lobby'
    };
}
