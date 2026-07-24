import { describe, it, expect } from 'vitest';
import {
    getPlatformToken,
    getPlatformTokenSymbol,
    isEvmChainId,
    SOLANA_PLATFORM_TOKEN,
    EVM_PLATFORM_TOKEN,
} from '../config/tokens.js';

describe('tokens config', () => {
    it('identifies EVM chain ids', () => {
        expect(isEvmChainId('4663')).toBe(true);
        expect(isEvmChainId('46630')).toBe(true);
        expect(isEvmChainId('solana')).toBe(false);
        expect(isEvmChainId(undefined)).toBe(false);
    });

    it('returns Solana $CP for solana chain', () => {
        const token = getPlatformToken('solana');
        expect(token.symbol).toBe('CP');
        expect(token.displaySymbol).toBe('$CP');
        expect(token.decimals).toBe(6);
        expect(token.address).toBe(SOLANA_PLATFORM_TOKEN.address);
    });

    it('returns Robinhood $WADDLE for EVM chains', () => {
        const token = getPlatformToken('4663');
        expect(token.symbol).toBe('WADDLE');
        expect(token.displaySymbol).toBe('$WADDLE');
        expect(token.address).toBe(EVM_PLATFORM_TOKEN.address);
        expect(getPlatformTokenSymbol('4663')).toBe('$WADDLE');
    });
});
