import { describe, it, expect } from 'vitest';
import { getTxExplorerUrl, getExplorerLabel } from '../utils/txExplorer.js';

describe('server txExplorer', () => {
    it('Solana → Solscan', () => {
        const sig = 'Abc123signature';
        expect(getTxExplorerUrl(sig, 'solana')).toBe(`https://solscan.io/tx/${sig}`);
        expect(getExplorerLabel('solana')).toBe('Solscan');
    });

    it('Robinhood mainnet → Blockscout', () => {
        const hash = '0x' + '11'.repeat(32);
        expect(getTxExplorerUrl(hash, '4663')).toBe(
            `https://robinhoodchain.blockscout.com/tx/${hash}`
        );
        expect(getExplorerLabel('4663')).toBe('Blockscout');
    });

    it('Robinhood testnet → test explorer', () => {
        const hash = '0x' + '22'.repeat(32);
        expect(getTxExplorerUrl(hash, '46630')).toContain('explorer.testnet');
    });
});
