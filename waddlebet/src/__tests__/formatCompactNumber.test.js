import { describe, it, expect } from 'vitest';
import { formatCompactNumber, formatFullNumber } from '../utils/formatCompactNumber';

describe('formatCompactNumber', () => {
    it('formats small numbers with locale grouping', () => {
        expect(formatCompactNumber(853)).toBe('853');
        expect(formatCompactNumber(9999)).toBe('9,999');
    });

    it('abbreviates thousands and millions', () => {
        expect(formatCompactNumber(12_500)).toBe('12.5K');
        expect(formatCompactNumber(6876829)).toBe('6.88M');
    });

    it('handles edge cases', () => {
        expect(formatCompactNumber(0)).toBe('0');
        expect(formatCompactNumber(NaN)).toBe('0');
        expect(formatCompactNumber(-15_000)).toBe('-15K');
    });
});

describe('formatFullNumber', () => {
    it('returns locale string', () => {
        expect(formatFullNumber(6876829)).toBe('6,876,829');
    });
});
