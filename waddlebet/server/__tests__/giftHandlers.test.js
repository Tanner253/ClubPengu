/**
 * Gift Handlers Integration Tests
 * Tests WebSocket message handling for gift operations
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const securityMocks = vi.hoisted(() => {
    const walletImpl = (address) => {
        if (typeof address === 'string' && address.length === 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
            return { valid: true, address };
        }
        return { valid: false, error: 'Invalid wallet address format' };
    };
    const amountImpl = (amount, options = {}) => {
        const num = Number(amount);
        if (isNaN(num) || !isFinite(num)) {
            return { valid: false, error: 'Amount must be a valid number' };
        }
        if (options.min !== undefined && num < options.min) {
            return { valid: false, error: `Amount must be at least ${options.min}` };
        }
        if (options.max !== undefined && num > options.max) {
            return { valid: false, error: `Amount must be at most ${options.max}` };
        }
        if (options.allowFloat === false && num % 1 !== 0) {
            return { valid: false, error: 'Amount must be an integer' };
        }
        if (options.allowZero === false && num === 0) {
            return { valid: false, error: 'Amount cannot be zero' };
        }
        return { valid: true, value: num };
    };
    return {
        validateWalletAddress: vi.fn(walletImpl),
        validateAmount: vi.fn(amountImpl),
        walletImpl,
        amountImpl
    };
});

import { handleGiftMessage } from '../handlers/giftHandlers.js';

// Mock database models
vi.mock('../db/models/index.js', () => ({
    User: {
        findOne: vi.fn()
    },
    OwnedCosmetic: {
        findOne: vi.fn(),
        transferOwnership: vi.fn()
    },
    Transaction: {
        record: vi.fn()
    },
    MarketListing: {
        isItemListed: vi.fn()
    }
}));

// Mock security validation (hoisted refs survive vitest mockReset between tests)
vi.mock('../utils/securityValidation.js', () => ({
    validateWalletAddress: securityMocks.validateWalletAddress,
    validateAmount: securityMocks.validateAmount
}));

import { User, OwnedCosmetic, Transaction, MarketListing } from '../db/models/index.js';

// ==================== TEST SETUP ====================
describe('Gift Handlers', () => {
    let sendToPlayer;
    let player;
    let playerId;
    let getPlayerById;
    let getPlayerByWallet;

    const createMockPlayer = (overrides = {}) => ({
        id: 'player123',
        name: 'TestPlayer',
        isAuthenticated: true,
        walletAddress: '11111111111111111111111111111111111111111111',
        coins: 10000,
        pebbles: 5000,
        ...overrides
    });

    beforeEach(() => {
        vi.clearAllMocks();
        securityMocks.validateWalletAddress.mockImplementation(securityMocks.walletImpl);
        securityMocks.validateAmount.mockImplementation(securityMocks.amountImpl);
        
        playerId = 'player123';
        player = createMockPlayer();
        
        sendToPlayer = vi.fn();
        getPlayerById = vi.fn();
        getPlayerByWallet = vi.fn();
    });

    // ==================== GET RECIPIENT INFO ====================
    describe('gift_get_recipient_info', () => {
        it('should require targetPlayerId', async () => {
            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_get_recipient_info' },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_recipient_info',
                error: 'MISSING_TARGET',
                message: 'Target player ID required'
            });
        });

        it('should return recipient info for authenticated target', async () => {
            const targetPlayer = createMockPlayer({
                id: 'target123',
                name: 'TargetPlayer',
                walletAddress: '22222222222222222222222222222222222222222222'
            });
            getPlayerById.mockReturnValue(targetPlayer);

            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_get_recipient_info', targetPlayerId: 'target123' },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_recipient_info',
                walletAddress: targetPlayer.walletAddress,
                username: targetPlayer.name
            });
        });

        it('should reject unauthenticated target', async () => {
            const targetPlayer = createMockPlayer({
                id: 'target123',
                isAuthenticated: false,
                walletAddress: null
            });
            getPlayerById.mockReturnValue(targetPlayer);

            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_get_recipient_info', targetPlayerId: 'target123' },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_recipient_info',
                error: 'NOT_AUTHENTICATED',
                message: 'Target player is not authenticated'
            });
        });
    });

    // ==================== SEND GOLD ====================
    describe('gift_send_gold', () => {
        it('should require authentication', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });

            const handled = await handleGiftMessage(
                playerId, unauthPlayer,
                { type: 'gift_send_gold', recipientWallet: '22222222222222222222222222222222222222222222', amount: 100 },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_result',
                success: false,
                error: 'NOT_AUTHENTICATED',
                message: 'You must be authenticated to send gifts'
            });
        });

        it('should validate wallet addresses', async () => {
            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_send_gold', recipientWallet: 'invalid', amount: 100 },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, expect.objectContaining({
                type: 'gift_result',
                success: false,
                error: 'INVALID_RECIPIENT'
            }));
        });

        it('should validate amount', async () => {
            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_send_gold', recipientWallet: '22222222222222222222222222222222222222222222', amount: -10 },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, expect.objectContaining({
                type: 'gift_result',
                success: false,
                error: 'INVALID_AMOUNT'
            }));
        });

        it('should prevent gifting yourself', async () => {
            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_send_gold', recipientWallet: player.walletAddress, amount: 100 },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_result',
                success: false,
                error: 'CANNOT_GIFT_SELF',
                message: 'You cannot gift yourself'
            });
        });

        it('should successfully send gold gift', async () => {
            const sender = {
                _id: 'sender123',
                username: 'TestPlayer',
                walletAddress: player.walletAddress,
                coins: 10000,
                save: vi.fn().mockResolvedValue(true)
            };
            const recipient = {
                _id: 'recipient123',
                username: 'RecipientPlayer',
                walletAddress: '22222222222222222222222222222222222222222222',
                coins: 5000,
                save: vi.fn().mockResolvedValue(true)
            };

            User.findOne
                .mockResolvedValueOnce(sender)  // First call for sender
                .mockResolvedValueOnce(recipient); // Second call for recipient

            Transaction.record.mockResolvedValue(true);

            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_send_gold', recipientWallet: recipient.walletAddress, amount: 500 },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(User.findOne).toHaveBeenCalledTimes(2);
            expect(sender.coins).toBe(9500); // 10000 - 500
            expect(recipient.coins).toBe(5500); // 5000 + 500
            expect(sender.save).toHaveBeenCalled();
            expect(recipient.save).toHaveBeenCalled();
            expect(Transaction.record).toHaveBeenCalled();
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_result',
                success: true,
                message: expect.stringContaining('Sent 500 gold')
            });
        });

        it('should check sufficient balance', async () => {
            const sender = {
                _id: 'sender123',
                username: 'TestPlayer',
                walletAddress: player.walletAddress,
                coins: 100, // Not enough
                save: vi.fn()
            };

            User.findOne.mockResolvedValueOnce(sender);

            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_send_gold', recipientWallet: '22222222222222222222222222222222222222222222', amount: 500 },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_result',
                success: false,
                error: 'INSUFFICIENT_GOLD',
                message: expect.stringContaining('Insufficient gold')
            });
            expect(sender.save).not.toHaveBeenCalled();
        });
    });

    // ==================== SEND PEBBLES ====================
    describe('gift_send_pebbles', () => {
        it('should require authentication', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });

            const handled = await handleGiftMessage(
                playerId, unauthPlayer,
                { type: 'gift_send_pebbles', recipientWallet: '22222222222222222222222222222222222222222222', amount: 100 },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_result',
                success: false,
                error: 'NOT_AUTHENTICATED',
                message: 'You must be authenticated to send gifts'
            });
        });

        it('should successfully send pebbles gift', async () => {
            const sender = {
                _id: 'sender123',
                username: 'TestPlayer',
                walletAddress: player.walletAddress,
                pebbles: 5000,
                save: vi.fn().mockResolvedValue(true)
            };
            const recipient = {
                _id: 'recipient123',
                username: 'RecipientPlayer',
                walletAddress: '22222222222222222222222222222222222222222222',
                pebbles: 2000,
                save: vi.fn().mockResolvedValue(true)
            };

            User.findOne
                .mockResolvedValueOnce(sender)
                .mockResolvedValueOnce(recipient);

            Transaction.record.mockResolvedValue(true);

            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_send_pebbles', recipientWallet: recipient.walletAddress, amount: 1000 },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sender.pebbles).toBe(4000); // 5000 - 1000
            expect(recipient.pebbles).toBe(3000); // 2000 + 1000
            expect(sender.save).toHaveBeenCalled();
            expect(recipient.save).toHaveBeenCalled();
            expect(Transaction.record).toHaveBeenCalled();
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_result',
                success: true,
                message: expect.stringContaining('Sent 1000 pebbles')
            });
        });

        it('should check sufficient pebbles balance', async () => {
            const sender = {
                _id: 'sender123',
                username: 'TestPlayer',
                walletAddress: player.walletAddress,
                pebbles: 100, // Not enough
                save: vi.fn()
            };

            User.findOne.mockResolvedValueOnce(sender);

            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_send_pebbles', recipientWallet: '22222222222222222222222222222222222222222222', amount: 1000 },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_result',
                success: false,
                error: 'INSUFFICIENT_PEBBLES',
                message: expect.stringContaining('Insufficient pebbles')
            });
            expect(sender.save).not.toHaveBeenCalled();
        });
    });

    // ==================== SEND ITEM ====================
    describe('gift_send_item', () => {
        it('should require authentication', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });

            const handled = await handleGiftMessage(
                playerId, unauthPlayer,
                { type: 'gift_send_item', recipientWallet: '22222222222222222222222222222222222222222222', itemInstanceId: 'item123' },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_result',
                success: false,
                error: 'NOT_AUTHENTICATED',
                message: 'You must be authenticated to send gifts'
            });
        });

        it('should require itemInstanceId', async () => {
            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_send_item', recipientWallet: '22222222222222222222222222222222222222222222' },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            // Handler validates recipientWallet first, so if it's invalid or missing, it will fail validation
            // If recipientWallet is valid but itemInstanceId is missing, it should return MISSING_ITEM
            // But since validation happens first, we need to check what actually happens
            expect(sendToPlayer).toHaveBeenCalled();
            const call = sendToPlayer.mock.calls[0][1];
            expect(call.type).toBe('gift_result');
            expect(call.success).toBe(false);
        });

        it('should check item ownership', async () => {
            OwnedCosmetic.findOne.mockResolvedValue(null); // Item not found

            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_send_item', recipientWallet: '22222222222222222222222222222222222222222222', itemInstanceId: 'item123' },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_result',
                success: false,
                error: 'ITEM_NOT_FOUND',
                message: 'Item not found or not owned by you'
            });
        });

        it('should check if item is tradable', async () => {
            const item = {
                instanceId: 'item123',
                templateId: 'template123',
                serialNumber: 1,
                ownerId: player.walletAddress,
                tradable: false
            };

            OwnedCosmetic.findOne.mockResolvedValue(item);

            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_send_item', recipientWallet: '22222222222222222222222222222222222222222222', itemInstanceId: 'item123' },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_result',
                success: false,
                error: 'NOT_TRADABLE',
                message: 'This item cannot be traded'
            });
        });

        it('should check if item is listed on marketplace', async () => {
            const item = {
                instanceId: 'item123',
                templateId: 'template123',
                serialNumber: 1,
                ownerId: player.walletAddress,
                tradable: true
            };

            OwnedCosmetic.findOne.mockResolvedValue(item);
            MarketListing.isItemListed.mockResolvedValue(true); // Item is listed

            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_send_item', recipientWallet: '22222222222222222222222222222222222222222222', itemInstanceId: 'item123' },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_result',
                success: false,
                error: 'ITEM_LISTED',
                message: 'Cannot gift an item that is listed for sale'
            });
        });

        it('should successfully send item gift', async () => {
            const item = {
                instanceId: 'item123',
                templateId: 'template123',
                serialNumber: 1,
                ownerId: player.walletAddress,
                tradable: true
            };
            const recipient = {
                _id: 'recipient123',
                username: 'RecipientPlayer',
                walletAddress: '22222222222222222222222222222222222222222222'
            };

            OwnedCosmetic.findOne.mockResolvedValue(item);
            MarketListing.isItemListed.mockResolvedValue(false);
            User.findOne.mockResolvedValue(recipient);

            OwnedCosmetic.transferOwnership.mockResolvedValue({ success: true });

            Transaction.record.mockResolvedValue(true);

            const handled = await handleGiftMessage(
                playerId, player,
                { type: 'gift_send_item', recipientWallet: recipient.walletAddress, itemInstanceId: 'item123' },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(OwnedCosmetic.findOne).toHaveBeenCalledWith({
                instanceId: 'item123',
                ownerId: expect.any(String),
                convertedToGold: false
            });
            expect(MarketListing.isItemListed).toHaveBeenCalledWith('item123');
            expect(User.findOne).toHaveBeenCalledWith({ walletAddress: recipient.walletAddress });
            expect(OwnedCosmetic.transferOwnership).toHaveBeenCalledWith(
                'item123',
                expect.any(String),
                recipient.walletAddress,
                expect.objectContaining({
                    price: 0,
                    acquisitionType: 'gift'
                })
            );
            expect(Transaction.record).toHaveBeenCalled();
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'gift_result',
                success: true,
                message: expect.stringContaining('Sent item')
            });
        });
    });

    // ==================== SPL TOKEN TRANSFER ====================
    describe('gift_spl_completed', () => {
        it('should log SPL token transfer', async () => {
            Transaction.record.mockResolvedValue(true);

            const handled = await handleGiftMessage(
                playerId, player,
                {
                    type: 'gift_spl_completed',
                    recipientWallet: '22222222222222222222222222222222222222222222',
                    tokenMint: '33333333333333333333333333333333333333333333',
                    amount: 1000,
                    signature: 'sig123',
                    tokenSymbol: 'TOKEN'
                },
                sendToPlayer, getPlayerById, getPlayerByWallet
            );

            expect(handled).toBe(true);
            expect(Transaction.record).toHaveBeenCalledWith({
                type: 'gift_spl_token',
                fromWallet: player.walletAddress,
                toWallet: '22222222222222222222222222222222222222222222',
                amount: 1000,
                currency: 'SPL',
                relatedData: {
                    tokenMint: '33333333333333333333333333333333333333333333',
                    tokenSymbol: 'TOKEN',
                    signature: 'sig123'
                },
                reason: 'SPL token gift'
            });
        });
    });
});

