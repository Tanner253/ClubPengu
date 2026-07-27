import { describe, it, expect } from 'vitest';
import {
    getTxExplorerUrl,
    getExplorerLabelForTx,
    shortenTx,
    shortenWallet,
} from '../utils/txExplorer.js';

describe('txExplorer', () => {
    it('builds Solscan links for Solana signatures', () => {
        const sig = '5'.repeat(64);
        expect(getTxExplorerUrl(sig, 'solana')).toBe(`https://solscan.io/tx/${sig}`);
        expect(getExplorerLabelForTx(sig, 'solana')).toBe('Solscan');
    });

    it('builds Blockscout links for EVM hashes', () => {
        const hash = '0x' + 'ab'.repeat(32);
        expect(getTxExplorerUrl(hash, '4663')).toContain('blockscout.com/tx/');
        expect(getTxExplorerUrl(hash, '4663')).toContain(hash);
        expect(getExplorerLabelForTx(hash, '4663')).toBe('Blockscout');
    });

    it('treats 0x hashes as EVM even without chainId', () => {
        const hash = '0xdeadbeef';
        expect(getExplorerLabelForTx(hash, null)).toBe('Blockscout');
        expect(getTxExplorerUrl(hash, null)).toContain('blockscout.com');
    });

    it('shortens long hashes and wallets', () => {
        expect(shortenTx('0x' + 'aa'.repeat(32), 4)).toBe('0xaa…aaaa');
        expect(shortenWallet('0x1234567890abcdef1234567890abcdef12345678')).toContain('…');
    });
});
