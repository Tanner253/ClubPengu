import { describe, it, expect } from 'vitest';
import { displayTokenSymbol, formatTokenText } from '../utils/tokenDisplay.js';

describe('displayTokenSymbol', () => {
    it('shows $CP on Solana and $WADDLE on Robinhood EVM when chain-aware', () => {
        expect(displayTokenSymbol('$CP', 'solana')).toBe('$CP');
        expect(displayTokenSymbol('WADDLE', '4663')).toBe('$WADDLE');
        expect(displayTokenSymbol('$WADDLE', '46630')).toBe('$WADDLE');
        expect(displayTokenSymbol('CPw3', 'solana')).toBe('$CP');
        expect(displayTokenSymbol('CPw3', '4663')).toBe('$WADDLE');
    });

    it('preserves distinct tickers when chain is unknown', () => {
        expect(displayTokenSymbol('$CP')).toBe('$CP');
        expect(displayTokenSymbol('$WADDLE')).toBe('$WADDLE');
        expect(displayTokenSymbol('CPw3')).toBe('$CP');
    });

    it('passes through other token symbols unchanged', () => {
        expect(displayTokenSymbol('BONK')).toBe('BONK');
        expect(displayTokenSymbol('$SOL')).toBe('$SOL');
        expect(displayTokenSymbol('USDC')).toBe('USDC');
    });
});

describe('formatTokenText', () => {
    it('maps legacy server strings to the correct chain ticker', () => {
        expect(formatTokenText('Successfully claimed 5,000 $WADDLE!', 'solana')).toBe('Successfully claimed 5,000 $CP!');
        expect(formatTokenText('Hold 1000 WADDLE to enter', '4663')).toBe('Hold 1000 WADDLE to enter');
        expect(formatTokenText('Daily bonus: 5000 CP', '4663')).toBe('Daily bonus: 5000 WADDLE');
    });
});
