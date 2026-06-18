/**
 * Gold lobby slot machine configuration (client display)
 */

import {
    GOLD_SLOT_BET_DEFAULT,
    GOLD_SLOT_BET_MIN,
    GOLD_SLOT_BET_MAX,
    clampGoldSlotBet,
} from './goldEconomy.js';

export const GOLD_SLOT_BET = GOLD_SLOT_BET_DEFAULT;
export { GOLD_SLOT_BET_MIN, GOLD_SLOT_BET_MAX, clampGoldSlotBet };

export const GOLD_SLOT_SYMBOLS = {
    cherry: { label: 'Cherry', color: '#e11d48', emoji: '🍒' },
    lemon: { label: 'Lemon', color: '#facc15', emoji: '🍋' },
    orange: { label: 'Orange', color: '#f97316', emoji: '🍊' },
    plum: { label: 'Plum', color: '#a855f7', emoji: '🍇' },
    bell: { label: 'Bell', color: '#fbbf24', emoji: '🔔' },
    bar: { label: 'BAR', color: '#fbbf24', emoji: 'BAR' },
    seven: { label: 'Seven', color: '#ef4444', emoji: '7' },
    gold7: { label: 'Gold 7', color: '#fde047', emoji: '7' }
};

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

export function formatGoldSlotPayout(mult, bet = GOLD_SLOT_BET_DEFAULT) {
    const safeBet = clampGoldSlotBet(bet);
    return `${mult}x (${mult * safeBet}g)`;
}
