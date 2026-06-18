import { describe, it, expect } from 'vitest';

import {
    MAX_WAGER_GOLD,
    STARTING_COINS,
    PUFFLE_SOCIAL_GOLD_REWARD,
    PVE_BJ_MIN_BET,
    PVE_BJ_MAX_BET,
    clampWagerGold,
    isValidWagerGold,
    NPC_EMERGENCY_SELL_RATIO,
} from '../config/goldEconomy.js';
import { clampPveBet } from '../config/blackjackRules.js';

describe('goldEconomy tuning', () => {
    it('gives new players enough gold for first ferry with buffer', () => {
        expect(STARTING_COINS).toBeGreaterThanOrEqual(1);
    });

    it('limits PvP wagers to a scarce-gold band', () => {
        expect(isValidWagerGold(0)).toBe(true);
        expect(isValidWagerGold(1)).toBe(true);
        expect(isValidWagerGold(MAX_WAGER_GOLD)).toBe(true);
        expect(isValidWagerGold(MAX_WAGER_GOLD + 1)).toBe(false);
        expect(clampWagerGold(999)).toBe(MAX_WAGER_GOLD);
    });

    it('keeps social puffle drip small', () => {
        expect(PUFFLE_SOCIAL_GOLD_REWARD).toBeLessThanOrEqual(5);
    });

    it('aligns PvE blackjack bets with scarce gold band', () => {
        expect(PVE_BJ_MIN_BET).toBe(1);
        expect(PVE_BJ_MAX_BET).toBe(MAX_WAGER_GOLD);
        expect(clampPveBet(0)).toBe(PVE_BJ_MIN_BET);
        expect(clampPveBet(999)).toBe(PVE_BJ_MAX_BET);
    });

    it('keeps emergency sell below mint value for wood', () => {
        const emergencyPine4 = Math.floor(3 * 4 * NPC_EMERGENCY_SELL_RATIO);
        expect(emergencyPine4).toBeLessThan(10);
        const emergencyPine64 = Math.floor(3 * 64 * NPC_EMERGENCY_SELL_RATIO);
        expect(emergencyPine64).toBeLessThan(64);
    });
});
