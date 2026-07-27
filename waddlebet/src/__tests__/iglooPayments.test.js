import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../wallet/SolanaPayment.js', () => ({
    payIglooRent: vi.fn(),
    payIglooEntryFee: vi.fn(),
}));

vi.mock('../wallet/EvmPayment.js', () => ({
    payIglooRent: vi.fn(),
    payIglooEntryFee: vi.fn(),
}));

vi.mock('../config/iglooEconomy.js', () => ({
    getIglooEconomy: (chainId) => ({
        dailyRent: 10000,
        minimumBalance: 70000,
        rentWallet: chainId === '4663' ? '0xRent' : 'SolRent',
        platformTokenAddress: chainId === '4663'
            ? '0xcf83b446d4cf400b132538d7bb03e36bdbd3c8b8'
            : '9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump',
        platformTokenSymbol: chainId === '4663' ? '$WADDLE' : '$CP',
    }),
}));

import * as SolanaPayment from '../wallet/SolanaPayment.js';
import * as EvmPayment from '../wallet/EvmPayment.js';
import { payIglooRent, payIglooEntryFee } from '../wallet/iglooPayments.js';

describe('iglooPayments', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('routes rent to EVM for Robinhood chain', async () => {
        EvmPayment.payIglooRent.mockResolvedValue({ success: true, signature: '0x1' });

        await payIglooRent('4663', 'igloo1');

        expect(EvmPayment.payIglooRent).toHaveBeenCalledWith(
            'igloo1',
            10000,
            '0xRent',
            '0xcf83b446d4cf400b132538d7bb03e36bdbd3c8b8'
        );
        expect(SolanaPayment.payIglooRent).not.toHaveBeenCalled();
    });

    it('routes rent to Solana for solana chain', async () => {
        SolanaPayment.payIglooRent.mockResolvedValue({ success: true, signature: 'sig' });

        await payIglooRent('solana', 'igloo2');

        expect(SolanaPayment.payIglooRent).toHaveBeenCalled();
        expect(EvmPayment.payIglooRent).not.toHaveBeenCalled();
    });

    it('routes entry fee by token contract address, not wallet chain alone', async () => {
        const custom = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
        EvmPayment.payIglooEntryFee.mockResolvedValue({ success: true, signature: '0x2' });

        await payIglooEntryFee('4663', 'igloo3', 100, '0xOwner', custom);

        expect(EvmPayment.payIglooEntryFee).toHaveBeenCalledWith(
            'igloo3',
            100,
            '0xOwner',
            custom
        );
    });

    it('blocks EVM wallet paying SPL entry fee', async () => {
        const result = await payIglooEntryFee(
            '4663',
            'igloo3',
            100,
            'OwnerSol',
            '9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump'
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('WRONG_CHAIN');
        expect(EvmPayment.payIglooEntryFee).not.toHaveBeenCalled();
    });

    it('blocks Solana wallet paying ERC-20 entry fee', async () => {
        const result = await payIglooEntryFee(
            'solana',
            'igloo3',
            100,
            '0xOwner',
            '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('WRONG_CHAIN');
    });
});
