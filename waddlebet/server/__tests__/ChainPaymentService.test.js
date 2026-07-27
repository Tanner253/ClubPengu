import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/SolanaPaymentService.js', () => ({
    default: {
        checkMinimumBalance: vi.fn(),
        verifyRentPayment: vi.fn(),
        verifyTransaction: vi.fn(),
    },
}));

vi.mock('../services/EvmPaymentService.js', () => ({
    default: {
        checkMinimumBalance: vi.fn(),
        verifyRentPayment: vi.fn(),
        verifyTransaction: vi.fn(),
    },
}));

import solanaPaymentService from '../services/SolanaPaymentService.js';
import evmPaymentService from '../services/EvmPaymentService.js';
import chainPaymentService from '../services/ChainPaymentService.js';

const WADDLE = '0xcf83b446d4cf400b132538d7bb03e36bdbd3c8b8';
const CP_MINT = '9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump';
const EVM_WALLET = '0x1111111111111111111111111111111111111111';
const SOL_WALLET = 'TestWallet1234567890123456789012345678901234';

describe('ChainPaymentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.RENT_WALLET_ADDRESS = 'RentSol123';
        process.env.EVM_RENT_WALLET_ADDRESS = '0x2222222222222222222222222222222222222222';
        process.env.CPW3_TOKEN_ADDRESS = CP_MINT;
        process.env.WADDLE_TOKEN_ADDRESS = WADDLE;
    });

    describe('checkMinimumBalance', () => {
        it('routes ERC-20 gates to EVM RPC by contract address', async () => {
            evmPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: true, balance: 50000 });

            const result = await chainPaymentService.checkMinimumBalance(
                EVM_WALLET,
                WADDLE,
                10000,
                '4663'
            );

            expect(evmPaymentService.checkMinimumBalance).toHaveBeenCalledWith(
                EVM_WALLET,
                WADDLE,
                10000,
                '4663'
            );
            expect(solanaPaymentService.checkMinimumBalance).not.toHaveBeenCalled();
            expect(result.hasBalance).toBe(true);
        });

        it('routes SPL gates to Solana RPC by mint address', async () => {
            solanaPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: false, balance: 0 });

            await chainPaymentService.checkMinimumBalance(
                SOL_WALLET,
                CP_MINT,
                70000,
                'solana'
            );

            expect(solanaPaymentService.checkMinimumBalance).toHaveBeenCalledWith(
                SOL_WALLET,
                CP_MINT,
                70000
            );
            expect(evmPaymentService.checkMinimumBalance).not.toHaveBeenCalled();
        });

        it('supports arbitrary Robinhood ERC-20 contract for holder gates', async () => {
            const customToken = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
            evmPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: true, balance: 1 });

            await chainPaymentService.checkMinimumBalance(
                EVM_WALLET,
                customToken,
                1,
                '4663'
            );

            expect(evmPaymentService.checkMinimumBalance).toHaveBeenCalledWith(
                EVM_WALLET,
                customToken,
                1,
                '4663'
            );
        });
    });

    describe('verifyRentPayment', () => {
        it('uses $WADDLE treasury on EVM', async () => {
            evmPaymentService.verifyRentPayment.mockResolvedValue({ success: true, transactionHash: '0xabc' });

            const result = await chainPaymentService.verifyRentPayment(
                '0xabc',
                EVM_WALLET,
                '4663',
                { iglooId: 'igloo1', isRenewal: false }
            );

            expect(evmPaymentService.verifyRentPayment).toHaveBeenCalledWith(
                '0xabc',
                EVM_WALLET,
                process.env.EVM_RENT_WALLET_ADDRESS,
                10000,
                expect.objectContaining({
                    chainId: '4663',
                    tokenAddress: WADDLE,
                    iglooId: 'igloo1',
                })
            );
            expect(result.success).toBe(true);
        });

        it('uses $CP treasury on Solana', async () => {
            solanaPaymentService.verifyRentPayment.mockResolvedValue({ success: true, transactionHash: 'sig' });

            await chainPaymentService.verifyRentPayment(
                'sig'.repeat(20),
                SOL_WALLET,
                'solana',
                { iglooId: 'igloo2' }
            );

            expect(solanaPaymentService.verifyRentPayment).toHaveBeenCalledWith(
                expect.any(String),
                SOL_WALLET,
                process.env.RENT_WALLET_ADDRESS,
                10000,
                expect.objectContaining({ iglooId: 'igloo2' })
            );
        });
    });

    describe('verifyEntryFee', () => {
        it('verifies arbitrary ERC-20 entry fee to owner wallet', async () => {
            const owner = '0x3333333333333333333333333333333333333333';
            const customToken = '0x4444444444444444444444444444444444444444';
            evmPaymentService.verifyTransaction.mockResolvedValue({ success: true, transactionHash: '0xfee' });

            await chainPaymentService.verifyEntryFee(
                '0xfee',
                EVM_WALLET,
                owner,
                customToken,
                500,
                '4663',
                { iglooId: 'igloo3', tokenSymbol: 'MEME' }
            );

            expect(evmPaymentService.verifyTransaction).toHaveBeenCalledWith(
                '0xfee',
                EVM_WALLET,
                owner,
                customToken,
                500,
                expect.objectContaining({
                    chainId: '4663',
                    transactionType: 'igloo_entry_fee',
                    tokenSymbol: 'MEME',
                })
            );
        });

        it('verifies SPL entry fee on Solana', async () => {
            evmPaymentService.verifyTransaction.mockClear();
            solanaPaymentService.verifyTransaction.mockResolvedValue({ success: true });

            await chainPaymentService.verifyEntryFee(
                'sig'.repeat(20),
                SOL_WALLET,
                'OwnerWallet123',
                CP_MINT,
                1000,
                'solana'
            );

            expect(solanaPaymentService.verifyTransaction).toHaveBeenCalled();
            expect(evmPaymentService.verifyTransaction).not.toHaveBeenCalled();
        });
    });
});
