import { describe, it, expect } from 'vitest';
import {
    isEvmTokenAddress,
    isSolanaTokenAddress,
    isTokenOnUserChain,
    resolveTokenChainId,
} from '../utils/tokenAddress.js';

describe('tokenAddress (server)', () => {
    const waddle = '0xcf83b446d4cf400b132538d7bb03e36bdbd3c8b8';
    const cpMint = '9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump';

    it('detects EVM ERC-20 contract addresses', () => {
        expect(isEvmTokenAddress(waddle)).toBe(true);
        expect(isEvmTokenAddress(cpMint)).toBe(false);
    });

    it('detects Solana mint addresses', () => {
        expect(isSolanaTokenAddress(cpMint)).toBe(true);
        expect(isSolanaTokenAddress(waddle)).toBe(false);
    });

    it('matches token format to user chain for paywalls', () => {
        expect(isTokenOnUserChain(waddle, '4663')).toBe(true);
        expect(isTokenOnUserChain(waddle, 'solana')).toBe(false);
        expect(isTokenOnUserChain(cpMint, 'solana')).toBe(true);
        expect(isTokenOnUserChain(cpMint, '4663')).toBe(false);
    });

    it('resolves RPC chain from token address', () => {
        expect(resolveTokenChainId(waddle, '4663')).toBe('4663');
        expect(resolveTokenChainId(waddle, 'solana')).toBe('4663');
        expect(resolveTokenChainId(cpMint, '4663')).toBe('solana');
    });
});
