import { describe, it, expect } from 'vitest';
import { displayTokenSymbol } from '../utils/tokenDisplay.js';

describe('displayTokenSymbol', () => {
    it('maps legacy WADDLE symbols to $CP for display', () => {
        expect(displayTokenSymbol('$WADDLE')).toBe('$CP');
        expect(displayTokenSymbol('WADDLE')).toBe('CP');
        expect(displayTokenSymbol('CPw3')).toBe('CP');
    });

    it('passes through other token symbols unchanged', () => {
        expect(displayTokenSymbol('BONK')).toBe('BONK');
        expect(displayTokenSymbol('$SOL')).toBe('$SOL');
        expect(displayTokenSymbol('USDC')).toBe('USDC');
    });
});
