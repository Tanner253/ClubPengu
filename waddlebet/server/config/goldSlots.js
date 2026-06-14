/**
 * Gold lobby slot machine configuration (server-authoritative)
 * ~7% house edge (~93% RTP) via tuned symbol weights + paytable below
 */

export const GOLD_SLOT_BET = 25;
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

/** Payout multipliers (× bet) for 3-of-a-kind on center line */
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

/** Two cherries anywhere on the line (any position) */
export const GOLD_SLOT_TWO_CHERRY_MULT = 2;

/**
 * Weighted reel stops — tuned for ~93% RTP with paytable above.
 * Cherry weight is higher because 2-cherry partial wins drive most returns.
 */
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

export function calculateGoldSlotPayout(reels, bet = GOLD_SLOT_BET) {
    const [a, b, c] = reels;
    if (a === b && b === c) {
        const mult = GOLD_SLOT_PAYTABLE[a] || 0;
        return mult * bet;
    }
    const cherryCount = reels.filter(s => s === 'cherry').length;
    if (cherryCount >= 2) {
        return GOLD_SLOT_TWO_CHERRY_MULT * bet;
    }
    return 0;
}

/** Theoretical RTP (0–1) from weights + paytable — independent weighted reels */
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
        bet: GOLD_SLOT_BET,
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
