import { describe, it, expect } from 'vitest';
import { displayTokenSymbol, formatTokenText } from '../utils/tokenDisplay.js';

describe('displayTokenSymbol', () => {
    it('maps legacy WADDLE symbols to $CP for display', () => {
        expect(displayTokenSymbol('$WADDLE')).toBe('$CP');
        expect(displayTokenSymbol('WADDLE')).toBe('CP');
        expect(displayTokenSymbol('CPw3')).toBe('CP');
        expect(displayTokenSymbol('$CP')).toBe('$CP');
    });

    it('passes through other token symbols unchanged', () => {
        expect(displayTokenSymbol('BONK')).toBe('BONK');
        expect(displayTokenSymbol('$SOL')).toBe('$SOL');
        expect(displayTokenSymbol('USDC')).toBe('USDC');
    });
});

describe('formatTokenText', () => {
    it('replaces legacy tickers in free-form strings', () => {
        expect(formatTokenText('Successfully claimed 5,000 $WADDLE!')).toBe('Successfully claimed 5,000 $CP!');
        expect(formatTokenText('Hold 1000 WADDLE to enter')).toBe('Hold 1000 CP to enter');
    });
});
