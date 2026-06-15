/**
 * Igloo Handlers Integration Tests
 * Tests WebSocket message handling for igloo operations
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock services
vi.mock('../services/IglooService.js', () => ({
    default: {
        getAllIgloos: vi.fn(),
        getIgloo: vi.fn(),
        getIglooRaw: vi.fn(),
        getIglooForOwner: vi.fn(),
        canRent: vi.fn(),
        canEnter: vi.fn(),
        startRental: vi.fn(),
        payRent: vi.fn(),
        payEntryFee: vi.fn(),
        updateSettings: vi.fn(),
        getUserIgloos: vi.fn(),
        leaveIgloo: vi.fn(),
        recordVisit: vi.fn()
    }
}));

vi.mock('../services/X402Service.js', () => ({
    default: {
        verifyPayload: vi.fn(),
        settlePayment: vi.fn()
    }
}));

vi.mock('../services/SolanaPaymentService.js', () => ({
    default: {
        checkMinimumBalance: vi.fn(),
        verifyTransaction: vi.fn()
    }
}));

import iglooService from '../services/IglooService.js';
import solanaPaymentService from '../services/SolanaPaymentService.js';
import { handleIglooMessage } from '../handlers/iglooHandlers.js';

// ==================== TEST HELPERS ====================
const createMockPlayer = (overrides = {}) => ({
    isAuthenticated: true,
    walletAddress: 'TestWallet123',
    username: 'TestUser',
    ...overrides
});

const createMockSendToPlayer = () => vi.fn();

// ==================== TESTS ====================
describe('Igloo Handlers', () => {
    let sendToPlayer;
    let player;
    const playerId = 'player_123';
    
    beforeEach(() => {
        vi.clearAllMocks();
        sendToPlayer = createMockSendToPlayer();
        player = createMockPlayer();
    });
    
    describe('igloo_list', () => {
        it('should return all igloos', async () => {
            const mockIgloos = [
                { iglooId: 'igloo1', isRented: false },
                { iglooId: 'igloo2', isRented: true }
            ];
            iglooService.getAllIgloos.mockResolvedValue(mockIgloos);
            
            const handled = await handleIglooMessage(playerId, player, { type: 'igloo_list' }, sendToPlayer);
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_list',
                igloos: mockIgloos
            });
        });
        
        it('should handle errors gracefully', async () => {
            iglooService.getAllIgloos.mockRejectedValue(new Error('DB Error'));
            
            const handled = await handleIglooMessage(playerId, player, { type: 'igloo_list' }, sendToPlayer);
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_error',
                error: 'SERVER_ERROR',
                message: 'Failed to fetch igloo list'
            });
        });
    });
    
    describe('igloo_info', () => {
        it('should return single igloo info', async () => {
            const mockIgloo = { iglooId: 'igloo1', isRented: false };
            iglooService.getIgloo.mockResolvedValue(mockIgloo);
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_info', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_info',
                igloo: mockIgloo
            });
        });
        
        it('should return error for non-existent igloo', async () => {
            iglooService.getIgloo.mockResolvedValue(null);
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_info', iglooId: 'igloo99' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_error',
                error: 'IGLOO_NOT_FOUND',
                message: 'Igloo not found'
            });
        });
    });
    
    describe('igloo_can_rent', () => {
        it('should require authentication', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });
            
            const handled = await handleIglooMessage(
                playerId, unauthPlayer, 
                { type: 'igloo_can_rent', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_can_rent',
                canRent: false,
                error: 'NOT_AUTHENTICATED',
                message: 'Please connect your wallet to rent'
            });
        });
        
        it('should return rent eligibility for authenticated user', async () => {
            iglooService.canRent.mockResolvedValue({ 
                canRent: true, 
                dailyRent: 10000,
                minimumBalance: 70000
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_can_rent', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.canRent).toHaveBeenCalledWith('TestWallet123', 'igloo1');
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_can_rent',
                iglooId: 'igloo1',
                canRent: true,
                dailyRent: 10000,
                minimumBalance: 70000
            });
        });
    });
    
    describe('igloo_rent', () => {
        it('should require authentication', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });
            
            const handled = await handleIglooMessage(
                playerId, unauthPlayer, 
                { type: 'igloo_rent', iglooId: 'igloo1', transactionSignature: 'txSig123456789012345678901234567890123456789012345678901234567890123456789012345678901234' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_rent_result',
                success: false,
                error: 'NOT_AUTHENTICATED'
            });
        });
        
        it('should require transaction signature', async () => {
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_rent', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_rent_result',
                success: false,
                error: 'MISSING_PAYMENT',
                message: 'Transaction signature required'
            });
        });
        
        it('should complete rental with valid transaction signature', async () => {
            const txSig = 'txSig123456789012345678901234567890123456789012345678901234567890123456789012345678901234';
            
            iglooService.startRental.mockResolvedValue({
                success: true,
                iglooId: 'igloo1',
                transactionHash: 'tx123',
                rentDueDate: new Date(),
                message: 'Welcome to your new igloo!'
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_rent', iglooId: 'igloo1', transactionSignature: txSig }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.startRental).toHaveBeenCalledWith(
                'TestWallet123',
                'igloo1',
                txSig
            );
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, expect.objectContaining({
                type: 'igloo_rent_result',
                success: true,
                transactionHash: 'tx123'
            }));
        });
    });
    
    describe('igloo_can_enter', () => {
        it('should allow owner to enter', async () => {
            // Mock igloo with owner being the player
            iglooService.getIglooRaw.mockResolvedValue({ 
                iglooId: 'igloo1', 
                ownerWallet: 'TestWallet123',
                ownerUsername: 'Owner',
                getPublicInfo: () => ({ iglooId: 'igloo1', ownerUsername: 'Owner' })
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_can_enter', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, expect.objectContaining({
                type: 'igloo_can_enter',
                iglooId: 'igloo1',
                canEnter: true,
                isOwner: true
            }));
        });
        
        it('should check entry requirements for non-owner', async () => {
            // Mock igloo with different owner and entry fee requirement
            iglooService.getIglooRaw.mockResolvedValue({ 
                iglooId: 'igloo1', 
                ownerWallet: 'OtherWallet',
                ownerUsername: 'Owner',
                accessType: 'fee',
                tokenGate: { enabled: false },
                entryFee: { enabled: true, amount: 500, tokenSymbol: 'TOKEN' },
                paidEntryFees: [],
                getPublicInfo: () => ({ iglooId: 'igloo1', ownerUsername: 'Owner' })
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_can_enter', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, expect.objectContaining({
                type: 'igloo_can_enter',
                iglooId: 'igloo1',
                canEnter: false,
                blockingReason: 'FEE_REQUIRED'
            }));
        });
    });
    
    describe('igloo_pay_entry', () => {
        it('should process entry fee payment with transaction signature', async () => {
            // Mock the igloo for recording payment
            const mockIgloo = {
                iglooId: 'igloo1',
                ownerWallet: 'OwnerWallet',
                entryFee: { enabled: true, amount: 500, tokenAddress: 'TokenAddr' },
                tokenGate: { enabled: false },
                paidEntryFees: [],
                recordEntryFeePayment: vi.fn(),
                save: vi.fn().mockResolvedValue(true)
            };
            iglooService.getIglooRaw.mockResolvedValue(mockIgloo);
            
            // Mock the payEntryFee service call
            iglooService.payEntryFee.mockResolvedValue({
                success: true,
                transactionHash: 'tx456'
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_pay_entry', iglooId: 'igloo1', transactionSignature: 'tx456' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, expect.objectContaining({
                type: 'igloo_pay_entry_result',
                success: true
            }));
        });
    });
    
    describe('igloo_update_settings', () => {
        it('should require authentication', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });
            
            const handled = await handleIglooMessage(
                playerId, unauthPlayer, 
                { type: 'igloo_update_settings', iglooId: 'igloo1', settings: {} }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_settings_result',
                success: false,
                error: 'NOT_AUTHENTICATED'
            });
        });
        
        it('should update settings for owner', async () => {
            const newSettings = { accessType: 'public', banner: { title: 'My Igloo' } };
            iglooService.updateSettings.mockResolvedValue({
                success: true,
                igloo: { iglooId: 'igloo1', accessType: 'public' }
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_update_settings', iglooId: 'igloo1', settings: newSettings }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.updateSettings).toHaveBeenCalledWith(
                'TestWallet123',
                'igloo1',
                newSettings
            );
        });
    });
    
    describe('igloo_my_rentals', () => {
        it('should return user igloos when authenticated', async () => {
            const userIgloos = [{ iglooId: 'igloo5', ownerWallet: 'TestWallet123' }];
            iglooService.getUserIgloos.mockResolvedValue(userIgloos);
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_my_rentals' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_my_rentals',
                igloos: userIgloos
            });
        });
        
        it('should return empty for unauthenticated user', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });
            
            const handled = await handleIglooMessage(
                playerId, unauthPlayer, 
                { type: 'igloo_my_rentals' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_my_rentals',
                igloos: [],
                error: 'NOT_AUTHENTICATED'
            });
        });
    });
    
    describe('igloo_leave', () => {
        it('should allow owner to leave igloo', async () => {
            iglooService.leaveIgloo.mockResolvedValue({
                success: true,
                message: 'You have left the igloo'
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_leave', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.leaveIgloo).toHaveBeenCalledWith('TestWallet123', 'igloo1');
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_leave_result',
                success: true,
                message: 'You have left the igloo'
            });
        });
    });
    
    describe('igloo_visit', () => {
        it('should record visit silently', async () => {
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_visit', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.recordVisit).toHaveBeenCalledWith('TestWallet123', 'igloo1');
            // Should not send response
            expect(sendToPlayer).not.toHaveBeenCalled();
        });
        
        it('should use guest id for unauthenticated users', async () => {
            const guestPlayer = createMockPlayer({ walletAddress: null });
            
            const handled = await handleIglooMessage(
                playerId, guestPlayer, 
                { type: 'igloo_visit', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.recordVisit).toHaveBeenCalledWith(`guest_${playerId}`, 'igloo1');
        });
    });
    
    describe('unhandled messages', () => {
        it('should return false for non-igloo messages', async () => {
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'chat_message', content: 'Hello' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(false);
        });
        
        it('should return false for unknown igloo message types', async () => {
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_unknown_action' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(false);
        });
    });
});



