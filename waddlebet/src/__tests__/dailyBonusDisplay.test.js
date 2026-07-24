import { describe, it, expect } from 'vitest';
import {
    getDailyBonusRequiredSeconds,
    getDailyBonusSessionSeconds,
    formatDailyBonusPlaytime,
} from '../utils/dailyBonusDisplay.js';

describe('dailyBonusDisplay', () => {
    it('prefers explicit second fields from status', () => {
        expect(getDailyBonusRequiredSeconds({ requiredSeconds: 30, requiredMinutes: 60 })).toBe(30);
        expect(getDailyBonusSessionSeconds({ sessionSeconds: 15, sessionMinutes: 0 })).toBe(15);
    });

    it('falls back to minute fields', () => {
        expect(getDailyBonusRequiredSeconds({ requiredMinutes: 60 })).toBe(3600);
        expect(getDailyBonusSessionSeconds({ sessionMinutes: 2 })).toBe(120);
    });

    it('formats playtime as m:ss', () => {
        expect(formatDailyBonusPlaytime(30)).toBe('0:30');
        expect(formatDailyBonusPlaytime(90)).toBe('1:30');
    });
});
