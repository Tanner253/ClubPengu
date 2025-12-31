/**
 * SpaceService Unit Tests
 * Tests rental logic, access control, and settings management
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies before importing service
vi.mock('../db/models/Space.js', () => ({
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

vi.mock('../services/SolanaPaymentService.js', () => ({
    default: {
        checkMinimumBalance: vi.fn(),
        verifyRentPayment: vi.fn(),
        verifyTransaction: vi.fn()
    }
}));

// Import after mocks
import Space from '../db/models/Space.js';
import User from '../db/models/User.js';
import x402Service from '../services/X402Service.js';
import solanaPaymentService from '../services/SolanaPaymentService.js';

// ==================== TEST DATA ====================
const mockWallet = 'TestWallet123';
const mockSpaceId = 'space1';

const createMockSpace = (overrides = {}) => ({
    spaceId: mockSpaceId,
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
    getPublicInfo: vi.fn(() => ({ spaceId: mockSpaceId, isRented: false })),
    getOwnerInfo: vi.fn(() => ({ spaceId: mockSpaceId, ownerWallet: mockWallet })),
    markModified: vi.fn(), // For Mongoose change detection
    save: vi.fn().mockResolvedValue(true),
    ...overrides
});

// ==================== TESTS ====================
describe('SpaceService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    describe('canRent', () => {
        it('should allow renting available space with sufficient balance', async () => {
            const mockSpace = createMockSpace();
            Space.findOne.mockResolvedValue(mockSpace);
            solanaPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: true, balance: 100000 });
            
            // Import service (after mocks are set up)
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.canRent(mockWallet, mockSpaceId);
            
            expect(result.canRent).toBe(true);
            expect(result.dailyRent).toBe(10000);
        });
        
        it('should reject renting already rented space', async () => {
            const mockSpace = createMockSpace({ isRented: true, ownerUsername: 'OtherUser' });
            Space.findOne.mockResolvedValue(mockSpace);
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.canRent(mockWallet, mockSpaceId);
            
            expect(result.canRent).toBe(false);
            expect(result.error).toBe('ALREADY_RENTED');
        });
        
        it('should reject renting reserved space', async () => {
            const mockSpace = createMockSpace({ isReserved: true, ownerUsername: 'Reserved Owner' });
            Space.findOne.mockResolvedValue(mockSpace);
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.canRent(mockWallet, 'space3');
            
            expect(result.canRent).toBe(false);
            expect(result.error).toBe('RESERVED');
        });
        
        it('should reject when insufficient balance', async () => {
            const mockSpace = createMockSpace();
            Space.findOne.mockResolvedValue(mockSpace);
            solanaPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: false, balance: 5000 });
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.canRent(mockWallet, mockSpaceId);
            
            expect(result.canRent).toBe(false);
            expect(result.error).toBe('INSUFFICIENT_BALANCE');
        });
    });
    
    describe('canEnter', () => {
        it('should allow owner to enter private space', async () => {
            const mockSpace = createMockSpace({
                isRented: true,
                ownerWallet: mockWallet,
                accessType: 'private'
            });
            mockSpace.canEnter.mockReturnValue({ canEnter: true, isOwner: true });
            Space.findOne.mockResolvedValue(mockSpace);
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.canEnter(mockWallet, mockSpaceId);
            
            expect(result.canEnter).toBe(true);
            expect(result.isOwner).toBe(true);
        });
        
        it('should block non-owner from private space', async () => {
            const mockSpace = createMockSpace({
                isRented: true,
                ownerWallet: 'SomeOtherWallet',
                accessType: 'private'
            });
            mockSpace.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'SPACE_LOCKED', 
                message: 'This space is private' 
            });
            Space.findOne.mockResolvedValue(mockSpace);
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.canEnter(mockWallet, mockSpaceId);
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('SPACE_LOCKED');
        });
        
        it('should allow anyone to enter public space', async () => {
            const mockSpace = createMockSpace({
                isRented: true,
                ownerWallet: 'SomeOtherWallet',
                accessType: 'public'
            });
            mockSpace.canEnter.mockReturnValue({ canEnter: true });
            Space.findOne.mockResolvedValue(mockSpace);
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.canEnter(mockWallet, mockSpaceId);
            
            expect(result.canEnter).toBe(true);
        });
        
        it('should require entry fee when configured', async () => {
            const mockSpace = createMockSpace({
                isRented: true,
                ownerWallet: 'SomeOtherWallet',
                accessType: 'fee',
                entryFee: { enabled: true, amount: 1000 }
            });
            mockSpace.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'ENTRY_FEE_REQUIRED',
                requiresPayment: true,
                paymentAmount: 1000
            });
            Space.findOne.mockResolvedValue(mockSpace);
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.canEnter(mockWallet, mockSpaceId);
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('ENTRY_FEE_REQUIRED');
            expect(result.requiresPayment).toBe(true);
            expect(result.paymentAmount).toBe(1000);
        });
        
        it('should require token holding when configured', async () => {
            const mockSpace = createMockSpace({
                isRented: true,
                ownerWallet: 'SomeOtherWallet',
                accessType: 'token',
                tokenGate: { enabled: true, tokenAddress: 'TOKEN123', tokenSymbol: '$TEST', minimumBalance: 100 }
            });
            mockSpace.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'TOKEN_REQUIRED',
                tokenRequired: { address: 'TOKEN123', symbol: '$TEST', minimum: 100 }
            });
            Space.findOne.mockResolvedValue(mockSpace);
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.canEnter(mockWallet, mockSpaceId, 50); // Only has 50 tokens
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('TOKEN_REQUIRED');
        });
    });
    
    describe('updateSettings', () => {
        it('should allow owner to update settings', async () => {
            const mockSpace = createMockSpace({
                isRented: true,
                ownerWallet: mockWallet
            });
            Space.findOne.mockResolvedValue(mockSpace);
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.updateSettings(mockWallet, mockSpaceId, {
                accessType: 'public',
                banner: { title: 'My Cool Space' }
            });
            
            expect(result.success).toBe(true);
            expect(mockSpace.save).toHaveBeenCalled();
        });
        
        it('should reject non-owner updating settings', async () => {
            const mockSpace = createMockSpace({
                isRented: true,
                ownerWallet: 'DifferentWallet'
            });
            Space.findOne.mockResolvedValue(mockSpace);
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.updateSettings(mockWallet, mockSpaceId, {
                accessType: 'public'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('NOT_OWNER');
        });
        
        it('should reset entry fees when fee settings change', async () => {
            const mockSpace = createMockSpace({
                isRented: true,
                ownerWallet: mockWallet,
                entryFee: { enabled: false, amount: 0 }
            });
            Space.findOne.mockResolvedValue(mockSpace);
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.updateSettings(mockWallet, mockSpaceId, {
                entryFee: { enabled: true, amount: 500 }
            });
            
            expect(result.success).toBe(true);
            expect(result.entryFeesReset).toBe(true);
        });
        
        it('should allow updating custom banner colors and fonts', async () => {
            const mockSpace = createMockSpace({
                isRented: true,
                ownerWallet: mockWallet
            });
            Space.findOne.mockResolvedValue(mockSpace);
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.updateSettings(mockWallet, mockSpaceId, {
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
            expect(mockSpace.markModified).toHaveBeenCalledWith('banner');
            expect(mockSpace.save).toHaveBeenCalled();
        });
        
        it('should preserve existing banner fields when partially updating', async () => {
            const mockSpace = createMockSpace({
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
            Space.findOne.mockResolvedValue(mockSpace);
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            // Only update title, should preserve other fields
            const result = await spaceService.updateSettings(mockWallet, mockSpaceId, {
                banner: { 
                    title: 'New Title'
                }
            });
            
            expect(result.success).toBe(true);
            expect(mockSpace.banner.title).toBe('New Title');
            // Other fields should be preserved (the service merges them)
        });
    });
    
    describe('startRental', () => {
        it('should complete rental with valid payment', async () => {
            const mockSpace = createMockSpace();
            Space.findOne.mockResolvedValue(mockSpace);
            User.findOne.mockResolvedValue({ username: 'TestUser' });
            
            // Mock balance check (for canRent)
            solanaPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: true, balance: 100000 });
            // Mock rent payment verification
            solanaPaymentService.verifyRentPayment.mockResolvedValue({ 
                success: true, 
                transactionHash: 'tx123' 
            });
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.startRental(mockWallet, mockSpaceId, 'validTxSignature');
            
            expect(result.success).toBe(true);
            expect(result.transactionHash).toBe('tx123');
            expect(mockSpace.startRental).toHaveBeenCalledWith(mockWallet, 'TestUser', 10000);
            expect(mockSpace.save).toHaveBeenCalled();
        });
        
        it('should fail rental with invalid payment', async () => {
            const mockSpace = createMockSpace();
            Space.findOne.mockResolvedValue(mockSpace);
            
            // Mock balance check (for canRent) - pass
            solanaPaymentService.checkMinimumBalance.mockResolvedValue({ hasBalance: true, balance: 100000 });
            // Mock rent payment verification - fail
            solanaPaymentService.verifyRentPayment.mockResolvedValue({ 
                success: false, 
                error: 'INVALID_SIGNATURE' 
            });
            
            const { default: spaceService } = await import('../services/SpaceService.js');
            
            const result = await spaceService.startRental(mockWallet, mockSpaceId, 'invalidTxSignature');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('INVALID_SIGNATURE');
            expect(mockSpace.startRental).not.toHaveBeenCalled();
        });
    });
});


