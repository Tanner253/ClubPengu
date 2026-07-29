import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindOneAndUpdate = vi.fn();
const mockUserFindOne = vi.fn();
const mockTransactionRecord = vi.fn();
const mockCreateRequest = vi.fn();
const mockVerifyNativeEth = vi.fn();
const mockSendNativeEth = vi.fn();
const mockGetNativeBalance = vi.fn();
const mockIsReady = vi.fn(() => true);
const mockIsChainFeatureLive = vi.fn(() => true);

vi.mock('../db/models/index.js', () => ({
    User: {
        findOne: (...args) => mockUserFindOne(...args),
        findOneAndUpdate: (...args) => mockFindOneAndUpdate(...args),
    },
    Transaction: {
        record: (...args) => mockTransactionRecord(...args),
    },
    PebbleWithdrawal: {
        createRequest: (...args) => mockCreateRequest(...args),
        find: vi.fn(() => ({ sort: () => ({ limit: () => Promise.resolve([]) }) })),
        markProcessing: vi.fn(),
        markCompleted: vi.fn(),
        markFailed: vi.fn(),
    },
}));

vi.mock('../services/EvmPaymentService.js', () => ({
    default: {
        verifyNativeEthTransfer: (...args) => mockVerifyNativeEth(...args),
    },
}));

vi.mock('../services/EvmCustodialWalletService.js', () => ({
    default: {
        isReady: () => mockIsReady(),
        sendNativeEth: (...args) => mockSendNativeEth(...args),
        getNativeBalance: (...args) => mockGetNativeBalance(...args),
    },
}));

vi.mock('../config/chainFeatures.js', () => ({
    isChainFeatureLive: (...args) => mockIsChainFeatureLive(...args),
}));

import priceOracleService from '../services/PriceOracleService.js';
import evmPebbleService, { WITHDRAWAL_RAKE_PERCENT } from '../services/EvmPebbleService.js';
import { PEBBLES_PER_SOL } from '../services/PebbleService.js';

const WALLET = '0x4B1234567890abcdef1234567890abcdef12f974';
const RAKE = '0x2222222222222222222222222222222222222222';
const TX = `0x${'ab'.repeat(32)}`;

describe('EvmPebbleService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsChainFeatureLive.mockReturnValue(true);
        mockIsReady.mockReturnValue(true);
        process.env.EVM_RAKE_WALLET_ADDRESS = RAKE;
        evmPebbleService._configured = false;

        priceOracleService._clearForTests();
        priceOracleService._setCacheForTests({
            solUsd: 100,
            ethUsd: 2000,
            pebbleUsd: 0.1,
            fetchedAt: Date.now(),
        });
    });

    it('keeps Solana deposit rate at 1 SOL = 1000 pebbles (regression)', () => {
        expect(PEBBLES_PER_SOL).toBe(1000);
    });

    it('rejects EVM pebble ops when pebblesRail feature flag is off', async () => {
        mockIsChainFeatureLive.mockReturnValue(false);
        const quote = await evmPebbleService.createQuote(WALLET, '4663', { targetPebbles: 1000 });
        expect(quote.success).toBe(false);
        expect(quote.error).toBe('FEATURE_DISABLED');

        const deposit = await evmPebbleService.depositPebbles(WALLET, TX, 'pq_x', '4663');
        expect(deposit.error).toBe('FEATURE_DISABLED');

        const withdraw = await evmPebbleService.withdrawPebbles(WALLET, 1000, '4663');
        expect(withdraw.error).toBe('FEATURE_DISABLED');
    });

    it('creates USD-pegged quotes with rake wallet attached', async () => {
        const result = await evmPebbleService.createQuote(WALLET, '4663', { targetPebbles: 1000 });
        expect(result.success).toBe(true);
        expect(result.quote.asset).toBe('ETH');
        expect(result.quote.rakeWallet).toBe(RAKE);
        expect(result.quote.pebbles).toBeGreaterThanOrEqual(100);
        // ~0.05 ETH at sol=100 eth=2000
        expect(result.quote.ethAmount).toBeCloseTo(0.05, 5);
    });

    it('credits pebbles from locked quote after ETH verify (no re-FX)', async () => {
        const created = await evmPebbleService.createQuote(WALLET, '4663', { targetPebbles: 1000 });
        const { quoteId, pebbles, ethAmount } = created.quote;

        mockVerifyNativeEth.mockResolvedValue({ success: true, transactionHash: TX });
        mockFindOneAndUpdate.mockResolvedValue({ pebbles: 5000 + pebbles });
        mockTransactionRecord.mockResolvedValue({});

        const result = await evmPebbleService.depositPebbles(WALLET, TX, quoteId, '4663');

        expect(result.success).toBe(true);
        expect(result.pebblesReceived).toBe(pebbles);
        expect(result.ethAmount).toBe(ethAmount);
        expect(mockVerifyNativeEth).toHaveBeenCalledWith(
            TX,
            expect.objectContaining({
                expectedSender: WALLET,
                expectedRecipient: RAKE,
                expectedEthAmount: ethAmount,
                transactionType: 'pebble_deposit',
            })
        );
        expect(mockFindOneAndUpdate).toHaveBeenCalled();
    });

    it('applies 5% rake on EVM withdraw and pays net ETH from inverse FX', async () => {
        mockUserFindOne.mockResolvedValue({
            pebbles: 2000,
            pebbleStats: { totalDeposited: 2000, totalWithdrawn: 0 },
        });
        mockFindOneAndUpdate.mockResolvedValue({ pebbles: 1000 });
        mockGetNativeBalance.mockResolvedValue({
            success: true,
            balance: (10n ** 18n * 10n).toString(), // 10 ETH
        });
        mockSendNativeEth.mockResolvedValue({ success: true, txId: TX });
        mockTransactionRecord.mockResolvedValue({});

        const result = await evmPebbleService.withdrawPebbles(WALLET, 1000, '4663');

        expect(WITHDRAWAL_RAKE_PERCENT).toBe(5);
        expect(result.success).toBe(true);
        expect(result.status).toBe('completed');
        expect(result.rakeAmount).toBe(50);
        expect(result.netPebbles).toBe(950);
        // net ETH = 950 * 100 / (1000 * 2000) = 0.0475
        expect(result.ethReceived).toBeCloseTo(0.0475, 6);
        expect(result.asset).toBe('ETH');
        expect(mockSendNativeEth).toHaveBeenCalled();
    });

    it('rejects withdraw when oracle is stale / unavailable', async () => {
        priceOracleService._setCacheForTests({
            solUsd: 100,
            ethUsd: 2000,
            pebbleUsd: 0.1,
            fetchedAt: Date.now() - 10 * 60_000,
        });
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

        const result = await evmPebbleService.withdrawPebbles(WALLET, 1000, '4663');
        expect(result.success).toBe(false);
        expect(result.error).toBe('ORACLE_UNAVAILABLE');

        fetchSpy.mockRestore();
    });
});
