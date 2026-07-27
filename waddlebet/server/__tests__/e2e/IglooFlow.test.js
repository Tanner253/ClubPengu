/**
 * End-to-End Igloo Flow Tests
 * Tests complete user journeys through the igloo system
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all dependencies
vi.mock('../../db/models/Igloo.js', () => ({
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

vi.mock('../../services/ChainPaymentService.js', () => ({
    default: {
        checkMinimumBalance: vi.fn(),
        verifyRentPayment: vi.fn(),
        verifyEntryFee: vi.fn(),
        isEvm: vi.fn(() => false),
    }
}));

import Igloo from '../../db/models/Igloo.js';
import User from '../../db/models/User.js';
import x402Service from '../../services/X402Service.js';
import chainPaymentService from '../../services/ChainPaymentService.js';

// ==================== TEST HELPERS ====================
const createMockIgloo = (id, overrides = {}) => ({
    iglooId: id,
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
    getPublicInfo: vi.fn(() => ({ iglooId: id, isRented: overrides.isRented || false })),
    getOwnerInfo: vi.fn(() => ({ iglooId: id, ...overrides })),
    save: vi.fn().mockResolvedValue(true),
    ...overrides
});

// ==================== E2E FLOW TESTS ====================
describe('End-to-End Igloo Flows', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    describe('Complete Rental Flow', () => {
        it('should complete full rental journey: check -> rent -> customize -> leave', async () => {
            const walletAddress = 'NewTenant123';
            const iglooId = 'igloo1';
            
            // Step 1: User finds available igloo
            const availableIgloo = createMockIgloo(iglooId);
            Igloo.findOne.mockResolvedValue(availableIgloo);
            chainPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: true, balance: 100000 });
            
            const { default: iglooService } = await import('../../services/IglooService.js');
            
            const canRentResult = await iglooService.canRent(walletAddress, iglooId);
            expect(canRentResult.canRent).toBe(true);
            
            // Step 2: User rents igloo
            User.findOne.mockResolvedValue({ username: 'CoolPenguin' });
            chainPaymentService.verifyRentPayment.mockResolvedValue({ success: true, transactionHash: 'tx_rent' });
            
            const rentResult = await iglooService.startRental(walletAddress, iglooId, 'txSignature123');
            expect(rentResult.success).toBe(true);
            expect(availableIgloo.startRental).toHaveBeenCalledWith(walletAddress, 'CoolPenguin', 10000);
            
            // Step 3: User customizes their igloo
            const rentedIgloo = createMockIgloo(iglooId, {
                isRented: true,
                ownerWallet: walletAddress,
                accessType: 'private'
            });
            Igloo.findOne.mockResolvedValue(rentedIgloo);
            
            const settingsResult = await iglooService.updateSettings(walletAddress, iglooId, {
                accessType: 'public',
                banner: { title: 'My Cool Igloo', ticker: '$COOL' },
                entryFee: { enabled: true, amount: 100 }
            });
            expect(settingsResult.success).toBe(true);
            
            // Step 4: User decides to leave
            const leaveResult = await iglooService.leaveIgloo(walletAddress, iglooId);
            expect(leaveResult.success).toBe(true);
            expect(rentedIgloo.evict).toHaveBeenCalled();
        });
    });
    
    describe('Visitor Entry Flow', () => {
        it('should handle public igloo entry', async () => {
            const visitorWallet = 'Visitor123';
            const ownerWallet = 'Owner456';
            const iglooId = 'igloo1';
            
            const publicIgloo = createMockIgloo(iglooId, {
                isRented: true,
                ownerWallet: ownerWallet,
                accessType: 'public'
            });
            publicIgloo.canEnter.mockReturnValue({ canEnter: true });
            Igloo.findOne.mockResolvedValue(publicIgloo);
            
            const { default: iglooService } = await import('../../services/IglooService.js');
            
            const canEnterResult = await iglooService.canEnter(visitorWallet, iglooId);
            expect(canEnterResult.canEnter).toBe(true);
        });
        
        it('should handle entry fee payment flow', async () => {
            const visitorWallet = 'Visitor123';
            const ownerWallet = 'Owner456';
            const iglooId = 'igloo1';
            
            // Step 1: Check entry - needs payment
            const feeIgloo = createMockIgloo(iglooId, {
                isRented: true,
                ownerWallet: ownerWallet,
                accessType: 'fee',
                entryFee: { enabled: true, amount: 500, tokenAddress: 'TOKEN123' }
            });
            feeIgloo.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'ENTRY_FEE_REQUIRED',
                requiresPayment: true,
                paymentAmount: 500
            });
            Igloo.findOne.mockResolvedValue(feeIgloo);
            
            const { default: iglooService } = await import('../../services/IglooService.js');
            
            let canEnterResult = await iglooService.canEnter(visitorWallet, iglooId);
            expect(canEnterResult.canEnter).toBe(false);
            expect(canEnterResult.reason).toBe('ENTRY_FEE_REQUIRED');
            
            // Step 2: Pay entry fee with real transaction signature
            chainPaymentService.verifyEntryFee.mockResolvedValue({
                success: true, 
                transactionHash: 'tx_entry',
                amount: 500
            });
            
            const payResult = await iglooService.payEntryFee(visitorWallet, iglooId, 'txSignature456');
            expect(payResult.success).toBe(true);
            expect(feeIgloo.recordEntryFeePayment).toHaveBeenCalledWith(
                visitorWallet, 500, 'txSignature456'
            );
            
            // Step 3: Now can enter
            feeIgloo.canEnter.mockReturnValue({ canEnter: true });
            canEnterResult = await iglooService.canEnter(visitorWallet, iglooId);
            expect(canEnterResult.canEnter).toBe(true);
        });
        
        it('should handle token gate check', async () => {
            const visitorWallet = 'Visitor123';
            const iglooId = 'igloo1';
            
            const tokenIgloo = createMockIgloo(iglooId, {
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
            tokenIgloo.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'TOKEN_REQUIRED',
                tokenRequired: { symbol: '$TEST', minimum: 1000 }
            });
            Igloo.findOne.mockResolvedValue(tokenIgloo);
            
            const { default: iglooService } = await import('../../services/IglooService.js');
            
            let result = await iglooService.canEnter(visitorWallet, iglooId, 500);
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('TOKEN_REQUIRED');
            
            // With enough tokens
            tokenIgloo.canEnter.mockReturnValue({ canEnter: true });
            result = await iglooService.canEnter(visitorWallet, iglooId, 2000);
            expect(result.canEnter).toBe(true);
        });
    });
    
    describe('Rent Payment Flow', () => {
        it('should handle daily rent payment', async () => {
            const ownerWallet = 'Owner123';
            const iglooId = 'igloo1';
            
            const rentedIgloo = createMockIgloo(iglooId, {
                isRented: true,
                ownerWallet: ownerWallet,
                rentStatus: 'current',
                rentDueDate: new Date(Date.now() + 1000) // Due soon
            });
            Igloo.findOne.mockResolvedValue(rentedIgloo);
            
            chainPaymentService.verifyRentPayment.mockResolvedValue({ 
                success: true, 
                transactionHash: 'tx_daily' 
            });
            
            const { default: iglooService } = await import('../../services/IglooService.js');
            
            const result = await iglooService.payRent(ownerWallet, iglooId, 'txSignature789');
            expect(result.success).toBe(true);
            expect(rentedIgloo.payRent).toHaveBeenCalledWith(10000);
        });
    });
    
    describe('Eviction Flow', () => {
        it('should process overdue rentals', async () => {
            const now = new Date();
            const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
            
            const overdueIgloo = createMockIgloo('igloo1', {
                isRented: true,
                isReserved: false,
                ownerWallet: 'OverdueOwner',
                ownerUsername: 'OverdueUser',
                rentDueDate: pastDate,
                rentStatus: 'grace_period'
            });
            
            Igloo.find.mockResolvedValue([overdueIgloo]);
            
            const { default: iglooService } = await import('../../services/IglooService.js');
            
            const result = await iglooService.processOverdueRentals();
            
            expect(result.evictions).toBeDefined();
            expect(overdueIgloo.evict).toHaveBeenCalled();
        });
    });
    
    describe('Settings Change Impact', () => {
        it('should reset entry fees when fee settings change', async () => {
            const ownerWallet = 'Owner123';
            const iglooId = 'igloo1';
            
            const igloo = createMockIgloo(iglooId, {
                isRented: true,
                ownerWallet: ownerWallet,
                entryFee: { enabled: true, amount: 100 },
                paidEntryFees: [{ walletAddress: 'User1' }, { walletAddress: 'User2' }]
            });
            Igloo.findOne.mockResolvedValue(igloo);
            
            const { default: iglooService } = await import('../../services/IglooService.js');
            
            // Change entry fee amount
            const result = await iglooService.updateSettings(ownerWallet, iglooId, {
                entryFee: { enabled: true, amount: 200 } // Different amount
            });
            
            expect(result.success).toBe(true);
            expect(result.entryFeesReset).toBe(true);
            expect(igloo.resetEntryFees).toHaveBeenCalled();
        });
        
        it('should reset entry fees when token gate changes', async () => {
            const ownerWallet = 'Owner123';
            const iglooId = 'igloo1';
            
            const igloo = createMockIgloo(iglooId, {
                isRented: true,
                ownerWallet: ownerWallet,
                accessType: 'both',
                tokenGate: { enabled: true, tokenAddress: 'TOKEN1', minimumBalance: 100 },
                entryFee: { enabled: true, amount: 100 }
            });
            Igloo.findOne.mockResolvedValue(igloo);
            
            const { default: iglooService } = await import('../../services/IglooService.js');
            
            // Change token gate
            const result = await iglooService.updateSettings(ownerWallet, iglooId, {
                tokenGate: { enabled: true, tokenAddress: 'TOKEN2', minimumBalance: 200 }
            });
            
            expect(result.entryFeesReset).toBe(true);
        });
    });
    
    describe('Reserved Igloo Handling', () => {
        it('should not allow renting reserved igloos', async () => {
            const iglooId = 'igloo3'; // Reserved igloo
            
            const reservedIgloo = createMockIgloo(iglooId, {
                isReserved: true,
                ownerUsername: 'Reserved Owner',
                isRented: true // Reserved = always "rented" to owner
            });
            Igloo.findOne.mockResolvedValue(reservedIgloo);
            
            const { default: iglooService } = await import('../../services/IglooService.js');
            
            const result = await iglooService.canRent('SomeUser', iglooId);
            
            expect(result.canRent).toBe(false);
            expect(result.error).toBe('RESERVED');
            expect(result.message).toContain('Reserved Owner');
        });
        
        it('should not allow leaving reserved igloos', async () => {
            const iglooId = 'igloo3';
            
            const reservedIgloo = createMockIgloo(iglooId, {
                isReserved: true,
                ownerWallet: 'ReservedWallet'
            });
            Igloo.findOne.mockResolvedValue(reservedIgloo);
            
            const { default: iglooService } = await import('../../services/IglooService.js');
            
            const result = await iglooService.leaveIgloo('ReservedWallet', iglooId);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('RESERVED_OWNER');
        });
    });
});


