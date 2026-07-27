import { describe, it, expect } from 'vitest';
import {
    isEvmTokenAddress,
    isTokenOnUserChain,
} from '../utils/tokenAddress.js';

describe('tokenAddress (client)', () => {
    const waddle = '0xcf83b446d4cf400b132538d7bb03e36bdbd3c8b8';

    it('detects ERC-20 contracts for paywall configuration', () => {
        expect(isEvmTokenAddress(waddle)).toBe(true);
        expect(isEvmTokenAddress('9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump')).toBe(false);
    });

    it('requires matching wallet chain for custom token gates', () => {
        expect(isTokenOnUserChain(waddle, '4663')).toBe(true);
        expect(isTokenOnUserChain(waddle, 'solana')).toBe(false);
    });
});
