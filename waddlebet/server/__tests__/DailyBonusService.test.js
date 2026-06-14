/**
 * DailyBonusService security tests — once per 24h, no replay loops
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const mockUserFindOne = vi.fn();
const mockUserUpdateOne = vi.fn();
const mockTransactionRecord = vi.fn();
const mockSendPayout = vi.fn();

vi.mock('../db/connection.js', () => ({
    isDBConnected: vi.fn(() => true)
}));

vi.mock('../db/models/index.js', () => ({
    User: {
        findOne: (...args) => mockUserFindOne(...args),
        updateOne: (...args) => mockUserUpdateOne(...args)
    },
    Transaction: {
        record: (...args) => mockTransactionRecord(...args)
    }
}));

vi.mock('../services/CustodialWalletService.js', () => ({
    default: {
        isReady: vi.fn(() => true),
        _sendPayoutTransaction: (...args) => mockSendPayout(...args)
    }
}));

vi.mock('../services/ReferralService.js', () => ({
    getReferralService: vi.fn(() => null)
}));

const dailyBonusService = (await import('../services/DailyBonusService.js')).default;

const WALLET = 'DailyBonusTestWallet111111111111111111111';
const makeNonce = () => crypto.randomBytes(32).toString('hex');

const eligibleUser = (overrides = {}) => ({
    walletAddress: WALLET,
    dailyBonus: {
        lastClaimAt: null,
        totalClaimed: 0,
        totalWaddleEarned: 0,
        processedClaimNonces: [],
        ...overrides.dailyBonus
    },
    ...overrides
});

describe('DailyBonusService.claim', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUserFindOne.mockReset();
        mockUserUpdateOne.mockReset();
        mockSendPayout.mockReset();
        mockTransactionRecord.mockResolvedValue(undefined);
        mockSendPayout.mockResolvedValue({ success: true, txId: 'tx_success_sig' });
        mockUserUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    });

    it('rejects invalid nonce format', async () => {
        const result = await dailyBonusService.claim(WALLET, 'not-a-valid-nonce');

        expect(result.success).toBe(false);
        expect(result.error).toBe('INVALID_NONCE');
        expect(mockUserFindOne).not.toHaveBeenCalled();
    });

    it('rejects missing nonce', async () => {
        const result = await dailyBonusService.claim(WALLET, null);

        expect(result.success).toBe(false);
        expect(result.error).toBe('NO_NONCE');
    });

    it('rejects when 24h cooldown is still active', async () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        mockUserFindOne.mockResolvedValue(eligibleUser({
            dailyBonus: { lastClaimAt: twoHoursAgo, processedClaimNonces: [] }
        }));

        vi.useFakeTimers();
        await dailyBonusService.startSession(WALLET);
        vi.advanceTimersByTime(61 * 60 * 1000);
        vi.useRealTimers();

        const result = await dailyBonusService.claim(WALLET, makeNonce());

        expect(result.success).toBe(false);
        expect(result.error).toBe('COOLDOWN_ACTIVE');
        expect(mockSendPayout).not.toHaveBeenCalled();
    });

    it('rejects reused client nonce stored in DB', async () => {
        const nonce = makeNonce();
        mockUserFindOne.mockResolvedValue(eligibleUser({
            dailyBonus: { processedClaimNonces: [nonce] }
        }));

        vi.useFakeTimers();
        await dailyBonusService.startSession(WALLET);
        vi.advanceTimersByTime(61 * 60 * 1000);
        vi.useRealTimers();

        const result = await dailyBonusService.claim(WALLET, nonce);

        expect(result.success).toBe(false);
        expect(result.error).toBe('NONCE_REUSED');
        expect(mockSendPayout).not.toHaveBeenCalled();
    });

    it('rejects when atomic DB update loses race (ALREADY_CLAIMED)', async () => {
        mockUserFindOne.mockResolvedValue(eligibleUser());
        mockUserUpdateOne.mockResolvedValue({ modifiedCount: 0 });

        vi.useFakeTimers();
        await dailyBonusService.startSession(WALLET);
        vi.advanceTimersByTime(61 * 60 * 1000);
        vi.useRealTimers();

        const result = await dailyBonusService.claim(WALLET, makeNonce());

        expect(result.success).toBe(false);
        expect(result.error).toBe('ALREADY_CLAIMED');
        expect(mockSendPayout).not.toHaveBeenCalled();
    });

    it('sends payout only once on successful claim', async () => {
        mockUserFindOne.mockResolvedValue(eligibleUser());

        vi.useFakeTimers();
        await dailyBonusService.startSession(WALLET);
        vi.advanceTimersByTime(61 * 60 * 1000);
        vi.useRealTimers();

        const nonce = makeNonce();
        const result = await dailyBonusService.claim(WALLET, nonce);

        expect(result.success).toBe(true);
        expect(result.txSignature).toBe('tx_success_sig');
        expect(mockSendPayout).toHaveBeenCalledTimes(1);
        expect(mockUserUpdateOne).toHaveBeenCalledWith(
            expect.objectContaining({
                walletAddress: WALLET,
                'dailyBonus.processedClaimNonces': { $nin: [nonce] }
            }),
            expect.objectContaining({
                'dailyBonus.lastClaimAt': expect.any(Date),
                $push: expect.objectContaining({
                    'dailyBonus.processedClaimNonces': { $each: [nonce], $slice: -50 }
                })
            })
        );
    });

    it('reverts DB reservation when payout fails before broadcast', async () => {
        mockUserFindOne.mockResolvedValue(eligibleUser());
        mockSendPayout.mockResolvedValue({ success: false, error: 'TRANSACTION_FAILED' });

        vi.useFakeTimers();
        await dailyBonusService.startSession(WALLET);
        vi.advanceTimersByTime(61 * 60 * 1000);
        vi.useRealTimers();

        const nonce = makeNonce();
        const result = await dailyBonusService.claim(WALLET, nonce);

        expect(result.success).toBe(false);
        expect(result.error).toBe('TRANSACTION_FAILED');
        expect(mockUserUpdateOne).toHaveBeenCalledTimes(2);
        expect(mockUserUpdateOne.mock.calls[1][1]).toMatchObject({
            $pull: { 'dailyBonus.processedClaimNonces': nonce },
            $inc: { 'dailyBonus.totalClaimed': -1 }
        });
    });

    it('does not double-pay when tx broadcast succeeds but confirmation is uncertain', async () => {
        mockUserFindOne.mockResolvedValue(eligibleUser());
        mockSendPayout.mockResolvedValue({
            success: false,
            txId: 'tx_broadcast_only',
            error: 'CONFIRMATION_UNCERTAIN'
        });

        vi.useFakeTimers();
        await dailyBonusService.startSession(WALLET);
        vi.advanceTimersByTime(61 * 60 * 1000);
        vi.useRealTimers();

        const result = await dailyBonusService.claim(WALLET, makeNonce());

        expect(result.success).toBe(true);
        expect(result.txSignature).toBe('tx_broadcast_only');
        expect(mockSendPayout).toHaveBeenCalledTimes(1);
        expect(mockUserUpdateOne).toHaveBeenCalledTimes(1);
    });
});
