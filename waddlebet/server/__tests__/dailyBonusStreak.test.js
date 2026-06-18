import { describe, it, expect } from 'vitest';
import {
    DAILY_STREAK_REWARDS,
    getStreakReward,
    resolveNextStreakDay,
    utcDayDiff,
} from '../config/dailyBonusStreak.js';

describe('dailyBonusStreak', () => {
    it('escalates CP on non-gold days to 5k by day 7', () => {
        expect(getStreakReward(1).cp).toBe(1000);
        expect(getStreakReward(2).cp).toBe(2000);
        expect(getStreakReward(4).cp).toBe(3000);
        expect(getStreakReward(5).cp).toBe(4000);
        expect(getStreakReward(7).cp).toBe(5000);
    });

    it('gold-only days skip CP on days 3 and 6', () => {
        expect(getStreakReward(3).cp).toBe(0);
        expect(getStreakReward(3).gold).toBe(5);
        expect(getStreakReward(6).cp).toBe(0);
        expect(getStreakReward(6).gold).toBe(10);
    });

    it('advances streak on consecutive UTC days', () => {
        expect(resolveNextStreakDay(1, '2026-06-14', '2026-06-15')).toBe(2);
        expect(resolveNextStreakDay(7, '2026-06-14', '2026-06-15')).toBe(1);
    });

    it('resets streak after missed UTC day', () => {
        expect(resolveNextStreakDay(4, '2026-06-12', '2026-06-15')).toBe(1);
    });

    it('has seven reward entries', () => {
        expect(DAILY_STREAK_REWARDS).toHaveLength(7);
        expect(utcDayDiff('2026-06-14', '2026-06-15')).toBe(1);
    });
});
