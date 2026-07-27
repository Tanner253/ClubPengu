import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/models/Igloo.js', () => ({
    default: {
        findOne: vi.fn(),
        find: vi.fn(),
        countDocuments: vi.fn().mockResolvedValue(0),
    },
}));

vi.mock('../db/models/User.js', () => ({
    default: {
        findOne: vi.fn(),
    },
}));

vi.mock('../services/ChainPaymentService.js', () => ({
    default: {
        checkMinimumBalance: vi.fn(),
        verifyRentPayment: vi.fn(),
        verifyEntryFee: vi.fn(),
        isEvm: vi.fn((chainId) => chainId === '4663' || chainId === 4663),
    },
}));

import Igloo from '../db/models/Igloo.js';
import User from '../db/models/User.js';
import chainPaymentService from '../services/ChainPaymentService.js';
import iglooService from '../services/IglooService.js';

const EVM_WALLET = '0x1111111111111111111111111111111111111111';
const WADDLE = '0xcf83b446d4cf400b132538d7bb03e36bdbd3c8b8';
const CUSTOM_ERC20 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

describe('IglooService EVM parity', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.EVM_RENT_WALLET_ADDRESS = '0x2222222222222222222222222222222222222222';
        process.env.WADDLE_TOKEN_ADDRESS = WADDLE;
    });

    it('canRent checks $WADDLE minimum balance on EVM', async () => {
        Igloo.findOne.mockResolvedValue({
            iglooId: 'igloo1',
            isReserved: false,
            isRented: false,
        });
        Igloo.countDocuments.mockResolvedValue(0);
        chainPaymentService.checkMinimumBalance.mockResolvedValue({
            hasBalance: true,
            balance: 80000,
        });

        const result = await iglooService.canRent(EVM_WALLET, 'igloo1', '4663');

        expect(result.canRent).toBe(true);
        expect(chainPaymentService.checkMinimumBalance).toHaveBeenCalledWith(
            EVM_WALLET,
            WADDLE,
            70000,
            '4663'
        );
        expect(result.platformTokenSymbol).toBe('$WADDLE');
    });

    it('startRental verifies EVM rent payment', async () => {
        const mockIgloo = {
            iglooId: 'igloo1',
            isReserved: false,
            isRented: false,
            startRental: vi.fn(),
            getOwnerInfo: vi.fn().mockReturnValue({ iglooId: 'igloo1' }),
            save: vi.fn(),
        };
        Igloo.findOne.mockResolvedValue(mockIgloo);
        Igloo.countDocuments.mockResolvedValue(0);
        chainPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: true, balance: 80000 });
        chainPaymentService.verifyRentPayment.mockResolvedValue({
            success: true,
            transactionHash: '0xrent123',
        });
        User.findOne.mockResolvedValue({ username: 'EvmOwner', chainId: '4663' });

        const result = await iglooService.startRental(
            EVM_WALLET,
            'igloo1',
            '0xrent123',
            '4663'
        );

        expect(result.success).toBe(true);
        expect(chainPaymentService.verifyRentPayment).toHaveBeenCalledWith(
            '0xrent123',
            EVM_WALLET,
            '4663',
            expect.objectContaining({ iglooId: 'igloo1', isRenewal: false })
        );
        expect(User.findOne).toHaveBeenCalledWith({ walletAddress: EVM_WALLET, chainId: '4663' });
    });

    it('payEntryFee verifies arbitrary ERC-20 transfer to owner', async () => {
        const mockIgloo = {
            iglooId: 'igloo4',
            ownerWallet: '0x3333333333333333333333333333333333333333',
            entryFee: {
                enabled: true,
                amount: 250,
                tokenAddress: CUSTOM_ERC20,
                tokenSymbol: 'MEME',
            },
            paidEntryFees: [],
            recordEntryFeePayment: vi.fn(),
            save: vi.fn(),
        };
        Igloo.findOne.mockResolvedValue(mockIgloo);
        chainPaymentService.verifyEntryFee.mockResolvedValue({ success: true });

        const result = await iglooService.payEntryFee(
            EVM_WALLET,
            'igloo4',
            '0xentry456',
            '4663'
        );

        expect(result.success).toBe(true);
        expect(chainPaymentService.verifyEntryFee).toHaveBeenCalledWith(
            '0xentry456',
            EVM_WALLET,
            mockIgloo.ownerWallet,
            CUSTOM_ERC20,
            250,
            '4663',
            expect.objectContaining({ iglooId: 'igloo4', tokenSymbol: 'MEME' })
        );
    });
});
