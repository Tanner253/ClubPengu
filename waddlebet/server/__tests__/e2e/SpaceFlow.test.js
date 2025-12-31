/**
 * End-to-End Space Flow Tests
 * Tests complete user journeys through the space system
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all dependencies
vi.mock('../../db/models/Space.js', () => ({
    default: {
        findOne: vi.fn(),
        find: vi.fn(),
        countDocuments: vi.fn().mockResolvedValue(0)  // Default: user has no current rentals
    }
}));

vi.mock('../../db/models/User.js', () => ({
    default: {
        findOne: vi.fn()
    }
}));

vi.mock('../../services/X402Service.js', () => ({
    default: {
        verifyPayload: vi.fn(),
        settlePayment: vi.fn(),
        checkRentEligibility: vi.fn()
    }
}));

vi.mock('../../services/SolanaPaymentService.js', () => ({
    default: {
        checkMinimumBalance: vi.fn(),
        verifyRentPayment: vi.fn(),
        verifyTransaction: vi.fn()
    }
}));

import Space from '../../db/models/Space.js';
import User from '../../db/models/User.js';
import x402Service from '../../services/X402Service.js';
import solanaPaymentService from '../../services/SolanaPaymentService.js';

// ==================== TEST HELPERS ====================
const createMockSpace = (id, overrides = {}) => ({
    spaceId: id,
    position: { x: 0, z: 0, row: 'north' },
    isRented: false,
    isReserved: false,
    ownerWallet: null,
    ownerUsername: null,
    rentStartDate: null,
    lastRentPaidDate: null,
    rentDueDate: null,
    rentStatus: null,
    accessType: 'private',
    tokenGate: { enabled: false },
    entryFee: { enabled: false, amount: 0 },
    paidEntryFees: [],
    stats: { totalVisits: 0, uniqueVisitors: 0, totalRentPaid: 0, timesRented: 0 },
    banner: { 
        title: null, 
        ticker: null,
        shill: null,
        styleIndex: 0,
        useCustomColors: false,
        customGradient: ['#845EF7', '#BE4BDB', '#F06595'],
        textColor: '#FFFFFF',
        accentColor: '#00FFFF',
        font: 'Inter, system-ui, sans-serif',
        textAlign: 'center'
    },
    
    // Model methods
    canEnter: vi.fn(),
    startRental: vi.fn(),
    payRent: vi.fn(),
    evict: vi.fn(),
    recordVisit: vi.fn(),
    resetEntryFees: vi.fn(),
    recordEntryFeePayment: vi.fn(),
    markModified: vi.fn(), // For Mongoose change detection on nested objects
    getPublicInfo: vi.fn(() => ({ spaceId: id, isRented: overrides.isRented || false })),
    getOwnerInfo: vi.fn(() => ({ spaceId: id, ...overrides })),
    save: vi.fn().mockResolvedValue(true),
    ...overrides
});

// ==================== E2E FLOW TESTS ====================
describe('End-to-End Space Flows', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    describe('Complete Rental Flow', () => {
        it('should complete full rental journey: check -> rent -> customize -> leave', async () => {
            const walletAddress = 'NewTenant123';
            const spaceId = 'space1';
            
            // Step 1: User finds available space
            const availableSpace = createMockSpace(spaceId);
            Space.findOne.mockResolvedValue(availableSpace);
            solanaPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: true, balance: 100000 });
            
            const { default: spaceService } = await import('../../services/SpaceService.js');
            
            const canRentResult = await spaceService.canRent(walletAddress, spaceId);
            expect(canRentResult.canRent).toBe(true);
            
            // Step 2: User rents space
            User.findOne.mockResolvedValue({ username: 'CoolPenguin' });
            solanaPaymentService.verifyRentPayment.mockResolvedValue({ success: true, transactionHash: 'tx_rent' });
            
            const rentResult = await spaceService.startRental(walletAddress, spaceId, 'txSignature123');
            expect(rentResult.success).toBe(true);
            expect(availableSpace.startRental).toHaveBeenCalledWith(walletAddress, 'CoolPenguin', 10000);
            
            // Step 3: User customizes their space
            const rentedSpace = createMockSpace(spaceId, {
                isRented: true,
                ownerWallet: walletAddress,
                accessType: 'private'
            });
            Space.findOne.mockResolvedValue(rentedSpace);
            
            const settingsResult = await spaceService.updateSettings(walletAddress, spaceId, {
                accessType: 'public',
                banner: { title: 'My Cool Space', ticker: '$COOL' },
                entryFee: { enabled: true, amount: 100 }
            });
            expect(settingsResult.success).toBe(true);
            
            // Step 4: User decides to leave
            const leaveResult = await spaceService.leaveSpace(walletAddress, spaceId);
            expect(leaveResult.success).toBe(true);
            expect(rentedSpace.evict).toHaveBeenCalled();
        });
    });
    
    describe('Visitor Entry Flow', () => {
        it('should handle public space entry', async () => {
            const visitorWallet = 'Visitor123';
            const ownerWallet = 'Owner456';
            const spaceId = 'space1';
            
            const publicSpace = createMockSpace(spaceId, {
                isRented: true,
                ownerWallet: ownerWallet,
                accessType: 'public'
            });
            publicSpace.canEnter.mockReturnValue({ canEnter: true });
            Space.findOne.mockResolvedValue(publicSpace);
            
            const { default: spaceService } = await import('../../services/SpaceService.js');
            
            const canEnterResult = await spaceService.canEnter(visitorWallet, spaceId);
            expect(canEnterResult.canEnter).toBe(true);
        });
        
        it('should handle entry fee payment flow', async () => {
            const visitorWallet = 'Visitor123';
            const ownerWallet = 'Owner456';
            const spaceId = 'space1';
            
            // Step 1: Check entry - needs payment
            const feeSpace = createMockSpace(spaceId, {
                isRented: true,
                ownerWallet: ownerWallet,
                accessType: 'fee',
                entryFee: { enabled: true, amount: 500, tokenAddress: 'TOKEN123' }
            });
            feeSpace.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'ENTRY_FEE_REQUIRED',
                requiresPayment: true,
                paymentAmount: 500
            });
            Space.findOne.mockResolvedValue(feeSpace);
            
            const { default: spaceService } = await import('../../services/SpaceService.js');
            
            let canEnterResult = await spaceService.canEnter(visitorWallet, spaceId);
            expect(canEnterResult.canEnter).toBe(false);
            expect(canEnterResult.reason).toBe('ENTRY_FEE_REQUIRED');
            
            // Step 2: Pay entry fee with real transaction signature
            solanaPaymentService.verifyTransaction.mockResolvedValue({ 
                success: true, 
                transactionHash: 'tx_entry',
                amount: 500
            });
            
            const payResult = await spaceService.payEntryFee(visitorWallet, spaceId, 'txSignature456');
            expect(payResult.success).toBe(true);
            expect(feeSpace.recordEntryFeePayment).toHaveBeenCalledWith(
                visitorWallet, 500, 'txSignature456'
            );
            
            // Step 3: Now can enter
            feeSpace.canEnter.mockReturnValue({ canEnter: true });
            canEnterResult = await spaceService.canEnter(visitorWallet, spaceId);
            expect(canEnterResult.canEnter).toBe(true);
        });
        
        it('should handle token gate check', async () => {
            const visitorWallet = 'Visitor123';
            const spaceId = 'space1';
            
            const tokenSpace = createMockSpace(spaceId, {
                isRented: true,
                ownerWallet: 'Owner456',
                accessType: 'token',
                tokenGate: { 
                    enabled: true, 
                    tokenAddress: 'TOKEN123',
                    tokenSymbol: '$TEST',
                    minimumBalance: 1000
                }
            });
            
            // Without enough tokens
            tokenSpace.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'TOKEN_REQUIRED',
                tokenRequired: { symbol: '$TEST', minimum: 1000 }
            });
            Space.findOne.mockResolvedValue(tokenSpace);
            
            const { default: spaceService } = await import('../../services/SpaceService.js');
            
            let result = await spaceService.canEnter(visitorWallet, spaceId, 500);
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('TOKEN_REQUIRED');
            
            // With enough tokens
            tokenSpace.canEnter.mockReturnValue({ canEnter: true });
            result = await spaceService.canEnter(visitorWallet, spaceId, 2000);
            expect(result.canEnter).toBe(true);
        });
    });
    
    describe('Rent Payment Flow', () => {
        it('should handle daily rent payment', async () => {
            const ownerWallet = 'Owner123';
            const spaceId = 'space1';
            
            const rentedSpace = createMockSpace(spaceId, {
                isRented: true,
                ownerWallet: ownerWallet,
                rentStatus: 'current',
                rentDueDate: new Date(Date.now() + 1000) // Due soon
            });
            Space.findOne.mockResolvedValue(rentedSpace);
            
            solanaPaymentService.verifyRentPayment.mockResolvedValue({ 
                success: true, 
                transactionHash: 'tx_daily' 
            });
            
            const { default: spaceService } = await import('../../services/SpaceService.js');
            
            const result = await spaceService.payRent(ownerWallet, spaceId, 'txSignature789');
            expect(result.success).toBe(true);
            expect(rentedSpace.payRent).toHaveBeenCalledWith(10000);
        });
    });
    
    describe('Eviction Flow', () => {
        it('should process overdue rentals', async () => {
            const now = new Date();
            const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
            
            const overdueSpace = createMockSpace('space1', {
                isRented: true,
                isReserved: false,
                ownerWallet: 'OverdueOwner',
                ownerUsername: 'OverdueUser',
                rentDueDate: pastDate,
                rentStatus: 'grace_period'
            });
            
            Space.find.mockResolvedValue([overdueSpace]);
            
            const { default: spaceService } = await import('../../services/SpaceService.js');
            
            const result = await spaceService.processOverdueRentals();
            
            expect(result.evictions).toBeDefined();
            expect(overdueSpace.evict).toHaveBeenCalled();
        });
    });
    
    describe('Settings Change Impact', () => {
        it('should reset entry fees when fee settings change', async () => {
            const ownerWallet = 'Owner123';
            const spaceId = 'space1';
            
            const space = createMockSpace(spaceId, {
                isRented: true,
                ownerWallet: ownerWallet,
                entryFee: { enabled: true, amount: 100 },
                paidEntryFees: [{ walletAddress: 'User1' }, { walletAddress: 'User2' }]
            });
            Space.findOne.mockResolvedValue(space);
            
            const { default: spaceService } = await import('../../services/SpaceService.js');
            
            // Change entry fee amount
            const result = await spaceService.updateSettings(ownerWallet, spaceId, {
                entryFee: { enabled: true, amount: 200 } // Different amount
            });
            
            expect(result.success).toBe(true);
            expect(result.entryFeesReset).toBe(true);
            expect(space.resetEntryFees).toHaveBeenCalled();
        });
        
        it('should reset entry fees when token gate changes', async () => {
            const ownerWallet = 'Owner123';
            const spaceId = 'space1';
            
            const space = createMockSpace(spaceId, {
                isRented: true,
                ownerWallet: ownerWallet,
                accessType: 'both',
                tokenGate: { enabled: true, tokenAddress: 'TOKEN1', minimumBalance: 100 },
                entryFee: { enabled: true, amount: 100 }
            });
            Space.findOne.mockResolvedValue(space);
            
            const { default: spaceService } = await import('../../services/SpaceService.js');
            
            // Change token gate
            const result = await spaceService.updateSettings(ownerWallet, spaceId, {
                tokenGate: { enabled: true, tokenAddress: 'TOKEN2', minimumBalance: 200 }
            });
            
            expect(result.entryFeesReset).toBe(true);
        });
    });
    
    describe('Reserved Space Handling', () => {
        it('should not allow renting reserved spaces', async () => {
            const spaceId = 'space3'; // Reserved space
            
            const reservedSpace = createMockSpace(spaceId, {
                isReserved: true,
                ownerUsername: 'Reserved Owner',
                isRented: true // Reserved = always "rented" to owner
            });
            Space.findOne.mockResolvedValue(reservedSpace);
            
            const { default: spaceService } = await import('../../services/SpaceService.js');
            
            const result = await spaceService.canRent('SomeUser', spaceId);
            
            expect(result.canRent).toBe(false);
            expect(result.error).toBe('RESERVED');
            expect(result.message).toContain('Reserved Owner');
        });
        
        it('should not allow leaving reserved spaces', async () => {
            const spaceId = 'space3';
            
            const reservedSpace = createMockSpace(spaceId, {
                isReserved: true,
                ownerWallet: 'ReservedWallet'
            });
            Space.findOne.mockResolvedValue(reservedSpace);
            
            const { default: spaceService } = await import('../../services/SpaceService.js');
            
            const result = await spaceService.leaveSpace('ReservedWallet', spaceId);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('RESERVED_OWNER');
        });
    });
});


