import { describe, it, expect } from 'vitest';
import {
    isEvmTokenAddress,
    isTokenOnUserChain,
    getIglooChainKind,
    getCrossChainIglooDenialMessage,
} from '../utils/tokenAddress.js';

describe('tokenAddress (client)', () => {
    const waddle = '0xcf83b446d4cf400b132538d7bb03e36bdbd3c8b8';
    const evmOwner = '0x4B1234567890abcdef1234567890abcdef12f974';
    const solOwner = '9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump';

    it('detects ERC-20 contracts for paywall configuration', () => {
        expect(isEvmTokenAddress(waddle)).toBe(true);
        expect(isEvmTokenAddress('9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump')).toBe(false);
    });

    it('requires matching wallet chain for custom token gates', () => {
        expect(isTokenOnUserChain(waddle, '4663')).toBe(true);
        expect(isTokenOnUserChain(waddle, 'solana')).toBe(false);
    });

    it('infers igloo chain from owner wallet', () => {
        expect(getIglooChainKind({ ownerWallet: evmOwner })).toBe('evm');
        expect(getIglooChainKind({ ownerWallet: solOwner })).toBe('solana');
    });

    it('denies opposite-chain visitors with clear copy', () => {
        expect(getCrossChainIglooDenialMessage('solana', { ownerWallet: evmOwner }))
            .toBe('EVM igloo access denied');
        expect(getCrossChainIglooDenialMessage('4663', { ownerWallet: solOwner }))
            .toBe('Solana igloo access denied');
        expect(getCrossChainIglooDenialMessage('4663', { ownerWallet: evmOwner })).toBeNull();
        expect(getCrossChainIglooDenialMessage('solana', { ownerWallet: solOwner })).toBeNull();
    });
});
