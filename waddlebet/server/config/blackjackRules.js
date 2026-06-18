/**
 * Shared blackjack deck + scoring for PvE and table services.
 */

import {
    PVE_BJ_MIN_BET,
    PVE_BJ_MAX_BET,
} from './goldEconomy.js';

export const BJ_SUITS = ['♥', '♦', '♣', '♠'];
export const BJ_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export { PVE_BJ_MIN_BET, PVE_BJ_MAX_BET };

export function createShuffledDeck(numDecks = 6) {
    const deck = [];
    let uid = 0;
    for (let d = 0; d < numDecks; d++) {
        for (const suit of BJ_SUITS) {
            for (const value of BJ_VALUES) {
                deck.push({ suit, value, uid: uid++ });
            }
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

export function calculateBlackjackScore(hand) {
    let score = 0;
    let aces = 0;
    for (const card of hand) {
        if (['J', 'Q', 'K'].includes(card.value)) {
            score += 10;
        } else if (card.value === 'A') {
            score += 11;
            aces++;
        } else {
            score += parseInt(card.value, 10);
        }
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}

export function isNaturalBlackjack(hand) {
    return hand.length === 2 && calculateBlackjackScore(hand) === 21;
}

export function clampPveBet(amount) {
    const n = Math.floor(Number(amount) || 0);
    return Math.min(PVE_BJ_MAX_BET, Math.max(PVE_BJ_MIN_BET, n));
}

export function mapResultToClient(result) {
    switch (result) {
        case 'blackjack':
            return 'BLACKJACK';
        case 'win':
            return 'WIN';
        case 'push':
            return 'PUSH';
        case 'bust':
            return 'BUST';
        default:
            return 'LOSE';
    }
}

export function computePayout(bet, result) {
    switch (result) {
        case 'blackjack':
            return bet + Math.floor(bet * 1.5);
        case 'win':
            return bet * 2;
        case 'push':
            return bet;
        default:
            return 0;
    }
}
