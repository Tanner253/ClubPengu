/**
 * IglooService Unit Tests
 * Tests rental logic, access control, and settings management
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies before importing service
vi.mock('../db/models/Igloo.js', () => ({
    default: {
        findOne: vi.fn(),
        find: vi.fn(),
        countDocuments: vi.fn().mockResolvedValue(0)  // Default: user has no current rentals
    }
}));

vi.mock('../db/models/User.js', () => ({
    default: {
        findOne: vi.fn()
    }
}));

vi.mock('../services/X402Service.js', () => ({
    default: {
        verifyPayload: vi.fn(),
        settlePayment: vi.fn(),
        checkRentEligibility: vi.fn()
    }
}));

vi.mock('../services/ChainPaymentService.js', () => ({
    default: {
        checkMinimumBalance: vi.fn(),
        verifyRentPayment: vi.fn(),
        verifyEntryFee: vi.fn(),
        isEvm: vi.fn(() => false),
    }
}));

// Import after mocks
import Igloo from '../db/models/Igloo.js';
import User from '../db/models/User.js';
import x402Service from '../services/X402Service.js';
import chainPaymentService from '../services/ChainPaymentService.js';

// ==================== TEST DATA ====================
const mockWallet = 'TestWallet123';
const mockIglooId = 'igloo1';

const createMockIgloo = (overrides = {}) => ({
    iglooId: mockIglooId,
    isRented: false,
    isReserved: false,
    ownerWallet: null,
    ownerUsername: null,
    accessType: 'private',
    tokenGate: { enabled: false, tokenAddress: null, minimumBalance: 1 },
    entryFee: { enabled: false, amount: 0 },
    paidEntryFees: [],
    stats: { totalVisits: 0, uniqueVisitors: 0, totalRentPaid: 0, timesRented: 0 },
    banner: { 
        title: null, 
        ticker: null, 
        shill: null, 
        styleIndex: 0,
        // New customization fields
        useCustomColors: false,
        customGradient: ['#845EF7', '#BE4BDB', '#F06595'],
        textColor: '#FFFFFF',
        accentColor: '#00FFFF',
        font: 'Inter, system-ui, sans-serif',
        textAlign: 'center'
    },
    
    // Methods
    canEnter: vi.fn(),
    startRental: vi.fn(),
    payRent: vi.fn(),
    evict: vi.fn(),
    recordVisit: vi.fn(),
    resetEntryFees: vi.fn(),
    recordEntryFeePayment: vi.fn(),
    getPublicInfo: vi.fn(() => ({ iglooId: mockIglooId, isRented: false })),
    getOwnerInfo: vi.fn(() => ({ iglooId: mockIglooId, ownerWallet: mockWallet })),
    markModified: vi.fn(), // For Mongoose change detection
    save: vi.fn().mockResolvedValue(true),
    ...overrides
});

// ==================== TESTS ====================
describe('IglooService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    describe('canRent', () => {
        it('should allow renting available igloo with sufficient balance', async () => {
            const mockIgloo = createMockIgloo();
            Igloo.findOne.mockResolvedValue(mockIgloo);
            chainPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: true, balance: 100000 });
            
            // Import service (after mocks are set up)
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canRent(mockWallet, mockIglooId);
            
            expect(result.canRent).toBe(true);
            expect(result.dailyRent).toBe(10000);
        });
        
        it('should reject renting already rented igloo', async () => {
            const mockIgloo = createMockIgloo({ isRented: true, ownerUsername: 'OtherUser' });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canRent(mockWallet, mockIglooId);
            
            expect(result.canRent).toBe(false);
            expect(result.error).toBe('ALREADY_RENTED');
        });
        
        it('should reject renting reserved igloo', async () => {
            const mockIgloo = createMockIgloo({ isReserved: true, ownerUsername: 'Reserved Owner' });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canRent(mockWallet, 'igloo3');
            
            expect(result.canRent).toBe(false);
            expect(result.error).toBe('RESERVED');
        });
        
        it('should reject when insufficient balance', async () => {
            const mockIgloo = createMockIgloo();
            Igloo.findOne.mockResolvedValue(mockIgloo);
            chainPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: false, balance: 5000 });
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canRent(mockWallet, mockIglooId);
            
            expect(result.canRent).toBe(false);
            expect(result.error).toBe('INSUFFICIENT_BALANCE');
        });
    });
    
    describe('canEnter', () => {
        it('should allow owner to enter private igloo', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: mockWallet,
                accessType: 'private'
            });
            mockIgloo.canEnter.mockReturnValue({ canEnter: true, isOwner: true });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canEnter(mockWallet, mockIglooId);
            
            expect(result.canEnter).toBe(true);
            expect(result.isOwner).toBe(true);
        });
        
        it('should block non-owner from private igloo', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: 'SomeOtherWallet',
                accessType: 'private'
            });
            mockIgloo.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'IGLOO_LOCKED', 
                message: 'This igloo is private' 
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canEnter(mockWallet, mockIglooId);
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('IGLOO_LOCKED');
        });
        
        it('should allow anyone to enter public igloo', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: 'SomeOtherWallet',
                accessType: 'public'
            });
            mockIgloo.canEnter.mockReturnValue({ canEnter: true });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canEnter(mockWallet, mockIglooId);
            
            expect(result.canEnter).toBe(true);
        });
        
        it('should require entry fee when configured', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: 'SomeOtherWallet',
                accessType: 'fee',
                entryFee: { enabled: true, amount: 1000 }
            });
            mockIgloo.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'ENTRY_FEE_REQUIRED',
                requiresPayment: true,
                paymentAmount: 1000
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canEnter(mockWallet, mockIglooId);
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('ENTRY_FEE_REQUIRED');
            expect(result.requiresPayment).toBe(true);
            expect(result.paymentAmount).toBe(1000);
        });
        
        it('should require token holding when configured', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: 'SomeOtherWallet',
                accessType: 'token',
                tokenGate: { enabled: true, tokenAddress: 'TOKEN123', tokenSymbol: '$TEST', minimumBalance: 100 }
            });
            mockIgloo.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'TOKEN_REQUIRED',
                tokenRequired: { address: 'TOKEN123', symbol: '$TEST', minimum: 100 }
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canEnter(mockWallet, mockIglooId, 50); // Only has 50 tokens
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('TOKEN_REQUIRED');
        });
    });
    
    describe('updateSettings', () => {
        it('should allow owner to update settings', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: mockWallet
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.updateSettings(mockWallet, mockIglooId, {
                accessType: 'public',
                banner: { title: 'My Cool Igloo' }
            });
            
            expect(result.success).toBe(true);
            expect(mockIgloo.save).toHaveBeenCalled();
        });
        
        it('should reject non-owner updating settings', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: 'DifferentWallet'
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.updateSettings(mockWallet, mockIglooId, {
                accessType: 'public'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('NOT_OWNER');
        });
        
        it('should reset entry fees when fee settings change', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: mockWallet,
                entryFee: { enabled: false, amount: 0 }
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.updateSettings(mockWallet, mockIglooId, {
                entryFee: { enabled: true, amount: 500 }
            });
            
            expect(result.success).toBe(true);
            expect(result.entryFeesReset).toBe(true);
        });
        
        it('should allow updating custom banner colors and fonts', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: mockWallet
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.updateSettings(mockWallet, mockIglooId, {
                banner: { 
                    title: 'Crypto Penguins HQ',
                    ticker: '$PENGU',
                    shill: 'Join the best crypto community!\nWe have cookies.',
                    useCustomColors: true,
                    customGradient: ['#9945FF', '#14F195', '#00C2FF'],
                    textColor: '#FFFFFF',
                    accentColor: '#14F195',
                    font: "'Orbitron', 'Courier New', monospace",
                    textAlign: 'center'
                }
            });
            
            expect(result.success).toBe(true);
            expect(mockIgloo.markModified).toHaveBeenCalledWith('banner');
            expect(mockIgloo.save).toHaveBeenCalled();
        });
        
        it('should preserve existing banner fields when partially updating', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: mockWallet,
                banner: {
                    title: 'Original Title',
                    ticker: '$OLD',
                    shill: 'Original shill',
                    styleIndex: 2,
                    useCustomColors: true,
                    customGradient: ['#FF0000', '#00FF00', '#0000FF'],
                    textColor: '#FFFFFF',
                    accentColor: '#FFFF00',
                    font: 'Inter, system-ui, sans-serif',
                    textAlign: 'left',
                    toObject: () => ({
                        title: 'Original Title',
                        ticker: '$OLD',
                        shill: 'Original shill',
                        styleIndex: 2,
                        useCustomColors: true,
                        customGradient: ['#FF0000', '#00FF00', '#0000FF'],
                        textColor: '#FFFFFF',
                        accentColor: '#FFFF00',
                        font: 'Inter, system-ui, sans-serif',
                        textAlign: 'left'
                    })
                }
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            // Only update title, should preserve other fields
            const result = await iglooService.updateSettings(mockWallet, mockIglooId, {
                banner: { 
                    title: 'New Title'
                }
            });
            
            expect(result.success).toBe(true);
            expect(mockIgloo.banner.title).toBe('New Title');
            // Other fields should be preserved (the service merges them)
        });
    });
    
    describe('startRental', () => {
        it('should complete rental with valid payment', async () => {
            const mockIgloo = createMockIgloo();
            Igloo.findOne.mockResolvedValue(mockIgloo);
            User.findOne.mockResolvedValue({ username: 'TestUser' });
            
            // Mock balance check (for canRent)
            chainPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: true, balance: 100000 });
            // Mock rent payment verification
            chainPaymentService.verifyRentPayment.mockResolvedValue({ 
                success: true, 
                transactionHash: 'tx123' 
            });
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.startRental(mockWallet, mockIglooId, 'validTxSignature');
            
            expect(result.success).toBe(true);
            expect(result.transactionHash).toBe('tx123');
            expect(mockIgloo.startRental).toHaveBeenCalledWith(mockWallet, 'TestUser', 10000);
            expect(mockIgloo.save).toHaveBeenCalled();
        });
        
        it('should fail rental with invalid payment', async () => {
            const mockIgloo = createMockIgloo();
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            // Mock balance check (for canRent) - pass
            chainPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: true, balance: 100000 });
            // Mock rent payment verification - fail
            chainPaymentService.verifyRentPayment.mockResolvedValue({ 
                success: false, 
                error: 'INVALID_SIGNATURE' 
            });
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.startRental(mockWallet, mockIglooId, 'invalidTxSignature');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('INVALID_SIGNATURE');
            expect(mockIgloo.startRental).not.toHaveBeenCalled();
        });
    });
});


