/**
 * DailyBonusService security tests — once per 24h, no replay loops
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { getOnboardingStepIds } from '../config/onboardingQuest.js';

const mockUserFindOne = vi.fn();
const mockUserUpdateOne = vi.fn();
const mockTransactionRecord = vi.fn();
const mockSendPayout = vi.fn();

vi.mock('../db/connection.js', () => ({
    isDBConnected: () => true
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
        isReady: () => true,
        getTokenBalance: () => Promise.resolve({ success: true, uiBalance: 1_000_000 }),
        _sendPayoutTransaction: (...args) => mockSendPayout(...args)
    }
}));

vi.mock('../services/ReferralService.js', () => ({
    getReferralService: vi.fn(() => null)
}));

const dailyBonusService = (await import('../services/DailyBonusService.js')).default;

let walletCounter = 0;
const testWallet = () => `DailyBonusTestWallet${String(++walletCounter).padStart(2, '0')}111111111111111`;
const makeNonce = () => crypto.randomBytes(32).toString('hex');

const eligibleUser = (walletAddress, overrides = {}) => ({
    walletAddress,
    dailyBonus: {
        lastClaimAt: null,
        totalClaimed: 0,
        totalWaddleEarned: 0,
        processedClaimNonces: [],
        ...overrides.dailyBonus
    },
    onboardingQuest: {
        completedSteps: getOnboardingStepIds(),
        rewardClaimed: true,
        ...overrides.onboardingQuest
    },
    ...overrides
});

async function withEligibleSession(wallet, run) {
    vi.useFakeTimers();
    try {
        await dailyBonusService.startSession(wallet);
        vi.advanceTimersByTime(61 * 60 * 1000);
        return await run();
    } finally {
        vi.useRealTimers();
    }
}

describe('DailyBonusService.getStatus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUserFindOne.mockReset();
    });

    it('sets canClaim false when intro quest is incomplete', async () => {
        const wallet = testWallet();
        mockUserFindOne.mockResolvedValue(eligibleUser(wallet, {
            onboardingQuest: { completedSteps: [], rewardClaimed: false }
        }));

        const status = await withEligibleSession(wallet, () =>
            dailyBonusService.getStatus(wallet)
        );

        expect(status.onboardingComplete).toBe(false);
        expect(status.canClaim).toBe(false);
        expect(status.onboardingCompletedCount).toBe(0);
    });
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

    it('rejects when intro quest is incomplete', async () => {
        const wallet = testWallet();
        mockUserFindOne.mockResolvedValue(eligibleUser(wallet, {
            onboardingQuest: { completedSteps: ['dojo_gold'], rewardClaimed: false }
        }));

        const result = await withEligibleSession(wallet, () =>
            dailyBonusService.claim(wallet, makeNonce())
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('ONBOARDING_INCOMPLETE');
        expect(mockSendPayout).not.toHaveBeenCalled();
    });

    it('rejects invalid nonce format', async () => {
        const wallet = testWallet();
        const result = await dailyBonusService.claim(wallet, 'not-a-valid-nonce');

        expect(result.success).toBe(false);
        expect(result.error).toBe('INVALID_NONCE');
        expect(mockUserFindOne).not.toHaveBeenCalled();
    });

    it('rejects missing nonce', async () => {
        const wallet = testWallet();
        const result = await dailyBonusService.claim(wallet, null);

        expect(result.success).toBe(false);
        expect(result.error).toBe('NO_NONCE');
    });

    it('rejects when 24h cooldown is still active', async () => {
        const wallet = testWallet();
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        mockUserFindOne.mockResolvedValue(eligibleUser(wallet, {
            dailyBonus: { lastClaimAt: twoHoursAgo, processedClaimNonces: [] }
        }));

        const result = await withEligibleSession(wallet, () =>
            dailyBonusService.claim(wallet, makeNonce())
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('COOLDOWN_ACTIVE');
        expect(mockSendPayout).not.toHaveBeenCalled();
    });

    it('rejects reused client nonce stored in DB', async () => {
        const wallet = testWallet();
        const nonce = makeNonce();
        mockUserFindOne.mockResolvedValue(eligibleUser(wallet, {
            dailyBonus: { processedClaimNonces: [nonce] }
        }));

        const result = await withEligibleSession(wallet, () =>
            dailyBonusService.claim(wallet, nonce)
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('NONCE_REUSED');
        expect(mockSendPayout).not.toHaveBeenCalled();
    });

    it('rejects when atomic DB update loses race (ALREADY_CLAIMED)', async () => {
        const wallet = testWallet();
        mockUserFindOne.mockResolvedValue(eligibleUser(wallet));
        mockUserUpdateOne.mockResolvedValue({ modifiedCount: 0 });

        const result = await withEligibleSession(wallet, () =>
            dailyBonusService.claim(wallet, makeNonce())
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('ALREADY_CLAIMED');
        expect(mockSendPayout).not.toHaveBeenCalled();
    });

    it('sends payout only once on successful claim', async () => {
        const wallet = testWallet();
        mockUserFindOne.mockResolvedValue(eligibleUser(wallet));

        const nonce = makeNonce();
        const result = await withEligibleSession(wallet, () =>
            dailyBonusService.claim(wallet, nonce)
        );

        expect(result.success).toBe(true);
        expect(result.txSignature).toBe('tx_success_sig');
        expect(mockSendPayout).toHaveBeenCalledTimes(1);
        expect(mockUserUpdateOne).toHaveBeenCalledWith(
            expect.objectContaining({
                walletAddress: wallet,
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
        const wallet = testWallet();
        mockUserFindOne.mockResolvedValue(eligibleUser(wallet));
        mockSendPayout.mockResolvedValue({ success: false, error: 'TRANSACTION_FAILED' });

        const nonce = makeNonce();
        const result = await withEligibleSession(wallet, () =>
            dailyBonusService.claim(wallet, nonce)
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('TRANSACTION_FAILED');
        const revertCall = mockUserUpdateOne.mock.calls.find(([, update]) =>
            update?.$pull?.['dailyBonus.processedClaimNonces'] === nonce
        );
        expect(revertCall).toBeDefined();
        expect(revertCall[1]).toMatchObject({
            $pull: { 'dailyBonus.processedClaimNonces': nonce },
            $inc: { 'dailyBonus.totalClaimed': -1 }
        });
    });

    it('does not double-pay when tx broadcast succeeds but confirmation is uncertain', async () => {
        const wallet = testWallet();
        mockUserFindOne.mockResolvedValue(eligibleUser(wallet));
        mockSendPayout.mockResolvedValue({
            success: false,
            txId: 'tx_broadcast_only',
            error: 'CONFIRMATION_UNCERTAIN'
        });

        const result = await withEligibleSession(wallet, () =>
            dailyBonusService.claim(wallet, makeNonce())
        );

        expect(result.success).toBe(true);
        expect(result.txSignature).toBe('tx_broadcast_only');
        expect(mockSendPayout).toHaveBeenCalledTimes(1);
        expect(mockUserUpdateOne.mock.calls.some(([, update]) =>
            update?.$push?.['dailyBonus.processedClaimNonces']
        )).toBe(true);
    });
});
