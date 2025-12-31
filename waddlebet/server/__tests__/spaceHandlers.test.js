/**
 * Space Handlers Integration Tests
 * Tests WebSocket message handling for space operations
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock services
vi.mock('../services/SpaceService.js', () => ({
    default: {
        getAllSpaces: vi.fn(),
        getSpace: vi.fn(),
        getSpaceRaw: vi.fn(),
        getSpaceForOwner: vi.fn(),
        canRent: vi.fn(),
        canEnter: vi.fn(),
        startRental: vi.fn(),
        payRent: vi.fn(),
        payEntryFee: vi.fn(),
        updateSettings: vi.fn(),
        getUserSpaces: vi.fn(),
        leaveSpace: vi.fn(),
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

import spaceService from '../services/SpaceService.js';
import solanaPaymentService from '../services/SolanaPaymentService.js';
import { handleSpaceMessage } from '../handlers/spaceHandlers.js';

// ==================== TEST HELPERS ====================
const createMockPlayer = (overrides = {}) => ({
    isAuthenticated: true,
    walletAddress: 'TestWallet123',
    username: 'TestUser',
    ...overrides
});

const createMockSendToPlayer = () => vi.fn();

// ==================== TESTS ====================
describe('Space Handlers', () => {
    let sendToPlayer;
    let player;
    const playerId = 'player_123';
    
    beforeEach(() => {
        vi.clearAllMocks();
        sendToPlayer = createMockSendToPlayer();
        player = createMockPlayer();
    });
    
    describe('space_list', () => {
        it('should return all spaces', async () => {
            const mockSpaces = [
                { spaceId: 'space1', isRented: false },
                { spaceId: 'space2', isRented: true }
            ];
            spaceService.getAllSpaces.mockResolvedValue(mockSpaces);
            
            const handled = await handleSpaceMessage(playerId, player, { type: 'space_list' }, sendToPlayer);
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'space_list',
                spaces: mockSpaces
            });
        });
        
        it('should handle errors gracefully', async () => {
            spaceService.getAllSpaces.mockRejectedValue(new Error('DB Error'));
            
            const handled = await handleSpaceMessage(playerId, player, { type: 'space_list' }, sendToPlayer);
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'space_error',
                error: 'SERVER_ERROR',
                message: 'Failed to fetch space list'
            });
        });
    });
    
    describe('space_info', () => {
        it('should return single space info', async () => {
            const mockSpace = { spaceId: 'space1', isRented: false };
            spaceService.getSpace.mockResolvedValue(mockSpace);
            
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_info', spaceId: 'space1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'space_info',
                space: mockSpace
            });
        });
        
        it('should return error for non-existent space', async () => {
            spaceService.getSpace.mockResolvedValue(null);
            
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_info', spaceId: 'space99' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'space_error',
                error: 'SPACE_NOT_FOUND',
                message: 'Space not found'
            });
        });
    });
    
    describe('space_can_rent', () => {
        it('should require authentication', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });
            
            const handled = await handleSpaceMessage(
                playerId, unauthPlayer, 
                { type: 'space_can_rent', spaceId: 'space1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'space_can_rent',
                canRent: false,
                error: 'NOT_AUTHENTICATED',
                message: 'Please connect your wallet to rent'
            });
        });
        
        it('should return rent eligibility for authenticated user', async () => {
            spaceService.canRent.mockResolvedValue({ 
                canRent: true, 
                dailyRent: 10000,
                minimumBalance: 70000
            });
            
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_can_rent', spaceId: 'space1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(spaceService.canRent).toHaveBeenCalledWith('TestWallet123', 'space1');
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'space_can_rent',
                spaceId: 'space1',
                canRent: true,
                dailyRent: 10000,
                minimumBalance: 70000
            });
        });
    });
    
    describe('space_rent', () => {
        it('should require authentication', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });
            
            const handled = await handleSpaceMessage(
                playerId, unauthPlayer, 
                { type: 'space_rent', spaceId: 'space1', transactionSignature: 'txSig123456789012345678901234567890123456789012345678901234567890123456789012345678901234' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'space_rent_result',
                success: false,
                error: 'NOT_AUTHENTICATED'
            });
        });
        
        it('should require transaction signature', async () => {
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_rent', spaceId: 'space1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'space_rent_result',
                success: false,
                error: 'MISSING_PAYMENT',
                message: 'Transaction signature required'
            });
        });
        
        it('should complete rental with valid transaction signature', async () => {
            const txSig = 'txSig123456789012345678901234567890123456789012345678901234567890123456789012345678901234';
            
            spaceService.startRental.mockResolvedValue({
                success: true,
                spaceId: 'space1',
                transactionHash: 'tx123',
                rentDueDate: new Date(),
                message: 'Welcome to your new space!'
            });
            
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_rent', spaceId: 'space1', transactionSignature: txSig }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(spaceService.startRental).toHaveBeenCalledWith(
                'TestWallet123',
                'space1',
                txSig
            );
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, expect.objectContaining({
                type: 'space_rent_result',
                success: true,
                transactionHash: 'tx123'
            }));
        });
    });
    
    describe('space_can_enter', () => {
        it('should allow owner to enter', async () => {
            // Mock space with owner being the player
            spaceService.getSpaceRaw.mockResolvedValue({ 
                spaceId: 'space1', 
                ownerWallet: 'TestWallet123',
                ownerUsername: 'Owner',
                getPublicInfo: () => ({ spaceId: 'space1', ownerUsername: 'Owner' })
            });
            
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_can_enter', spaceId: 'space1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, expect.objectContaining({
                type: 'space_can_enter',
                spaceId: 'space1',
                canEnter: true,
                isOwner: true
            }));
        });
        
        it('should check entry requirements for non-owner', async () => {
            // Mock space with different owner and entry fee requirement
            spaceService.getSpaceRaw.mockResolvedValue({ 
                spaceId: 'space1', 
                ownerWallet: 'OtherWallet',
                ownerUsername: 'Owner',
                tokenGate: { enabled: false },
                entryFee: { enabled: true, amount: 500, tokenSymbol: 'TOKEN' },
                paidEntryFees: [],
                getPublicInfo: () => ({ spaceId: 'space1', ownerUsername: 'Owner' })
            });
            
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_can_enter', spaceId: 'space1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, expect.objectContaining({
                type: 'space_can_enter',
                spaceId: 'space1',
                canEnter: false,
                blockingReason: 'FEE_REQUIRED'
            }));
        });
    });
    
    describe('space_pay_entry', () => {
        it('should process entry fee payment with transaction signature', async () => {
            // Mock the space for recording payment
            const mockSpace = {
                spaceId: 'space1',
                ownerWallet: 'OwnerWallet',
                entryFee: { enabled: true, amount: 500, tokenAddress: 'TokenAddr' },
                tokenGate: { enabled: false },
                paidEntryFees: [],
                recordEntryFeePayment: vi.fn(),
                save: vi.fn().mockResolvedValue(true)
            };
            spaceService.getSpaceRaw.mockResolvedValue(mockSpace);
            
            // Mock the payEntryFee service call
            spaceService.payEntryFee.mockResolvedValue({
                success: true,
                transactionHash: 'tx456'
            });
            
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_pay_entry', spaceId: 'space1', transactionSignature: 'tx456' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, expect.objectContaining({
                type: 'space_pay_entry_result',
                success: true
            }));
        });
    });
    
    describe('space_update_settings', () => {
        it('should require authentication', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });
            
            const handled = await handleSpaceMessage(
                playerId, unauthPlayer, 
                { type: 'space_update_settings', spaceId: 'space1', settings: {} }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'space_settings_result',
                success: false,
                error: 'NOT_AUTHENTICATED'
            });
        });
        
        it('should update settings for owner', async () => {
            const newSettings = { accessType: 'public', banner: { title: 'My Space' } };
            spaceService.updateSettings.mockResolvedValue({
                success: true,
                space: { spaceId: 'space1', accessType: 'public' }
            });
            
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_update_settings', spaceId: 'space1', settings: newSettings }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(spaceService.updateSettings).toHaveBeenCalledWith(
                'TestWallet123',
                'space1',
                newSettings
            );
        });
    });
    
    describe('space_my_rentals', () => {
        it('should return user spaces when authenticated', async () => {
            const userSpaces = [{ spaceId: 'space5', ownerWallet: 'TestWallet123' }];
            spaceService.getUserSpaces.mockResolvedValue(userSpaces);
            
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_my_rentals' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'space_my_rentals',
                spaces: userSpaces
            });
        });
        
        it('should return empty for unauthenticated user', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });
            
            const handled = await handleSpaceMessage(
                playerId, unauthPlayer, 
                { type: 'space_my_rentals' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'space_my_rentals',
                spaces: [],
                error: 'NOT_AUTHENTICATED'
            });
        });
    });
    
    describe('space_leave', () => {
        it('should allow owner to leave space', async () => {
            spaceService.leaveSpace.mockResolvedValue({
                success: true,
                message: 'You have left the space'
            });
            
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_leave', spaceId: 'space1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(spaceService.leaveSpace).toHaveBeenCalledWith('TestWallet123', 'space1');
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'space_leave_result',
                success: true,
                message: 'You have left the space'
            });
        });
    });
    
    describe('space_visit', () => {
        it('should record visit silently', async () => {
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_visit', spaceId: 'space1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(spaceService.recordVisit).toHaveBeenCalledWith('TestWallet123', 'space1');
            // Should not send response
            expect(sendToPlayer).not.toHaveBeenCalled();
        });
        
        it('should use guest id for unauthenticated users', async () => {
            const guestPlayer = createMockPlayer({ walletAddress: null });
            
            const handled = await handleSpaceMessage(
                playerId, guestPlayer, 
                { type: 'space_visit', spaceId: 'space1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(spaceService.recordVisit).toHaveBeenCalledWith(`guest_${playerId}`, 'space1');
        });
    });
    
    describe('unhandled messages', () => {
        it('should return false for non-space messages', async () => {
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'chat_message', content: 'Hello' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(false);
        });
        
        it('should return false for unknown space message types', async () => {
            const handled = await handleSpaceMessage(
                playerId, player, 
                { type: 'space_unknown_action' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(false);
        });
    });
});



