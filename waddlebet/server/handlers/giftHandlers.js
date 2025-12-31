/**
 * Gift Handlers - Handle player-to-player gifting
 * Supports: Gold, Pebbles, Items, SPL Tokens
 */

import { User, OwnedCosmetic, Transaction, MarketListing } from '../db/models/index.js';

/**
 * Handle gift-related WebSocket messages
 */
export async function handleGiftMessage(playerId, player, message, sendToPlayer, getPlayerById, getPlayerByWallet = null) {
    switch (message.type) {
        // ==================== GET RECIPIENT INFO ====================
        case 'gift_get_recipient_info': {
            try {
                const { targetPlayerId } = message;
                
                if (!targetPlayerId) {
                    sendToPlayer(playerId, {
                        type: 'gift_recipient_info',
                        error: 'MISSING_TARGET',
                        message: 'Target player ID required'
                    });
                    return true;
                }
                
                // Get target player info
                const targetPlayer = getPlayerById?.(targetPlayerId);
                
                if (!targetPlayer?.isAuthenticated || !targetPlayer?.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_recipient_info',
                        error: 'NOT_AUTHENTICATED',
                        message: 'Target player is not authenticated'
                    });
                    return true;
                }
                
                sendToPlayer(playerId, {
                    type: 'gift_recipient_info',
                    walletAddress: targetPlayer.walletAddress,
                    username: targetPlayer.name
                });
                
            } catch (error) {
                console.error('🎁 Error in gift_get_recipient_info:', error);
                sendToPlayer(playerId, {
                    type: 'gift_recipient_info',
                    error: 'SERVER_ERROR',
                    message: 'Failed to get recipient info'
                });
            }
            return true;
        }
        
        // ==================== SEND GOLD ====================
        case 'gift_send_gold': {
            try {
                const { recipientWallet, amount } = message;
                
                // Validate sender
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'You must be authenticated to send gifts'
                    });
                    return true;
                }
                
                // Can't gift yourself
                if (recipientWallet === player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'CANNOT_GIFT_SELF',
                        message: 'You cannot gift yourself'
                    });
                    return true;
                }
                
                // Validate amount
                const giftAmount = parseInt(amount);
                if (!giftAmount || giftAmount < 1) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'INVALID_AMOUNT',
                        message: 'Invalid gift amount'
                    });
                    return true;
                }
                
                // Get sender
                const sender = await User.findOne({ walletAddress: player.walletAddress });
                if (!sender) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'SENDER_NOT_FOUND',
                        message: 'Sender account not found'
                    });
                    return true;
                }
                
                // Check balance
                if (sender.coins < giftAmount) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'INSUFFICIENT_GOLD',
                        message: `Insufficient gold. You have ${sender.coins}`
                    });
                    return true;
                }
                
                // Get recipient
                const recipient = await User.findOne({ walletAddress: recipientWallet });
                if (!recipient) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'RECIPIENT_NOT_FOUND',
                        message: 'Recipient account not found'
                    });
                    return true;
                }
                
                // Transfer gold
                sender.coins -= giftAmount;
                recipient.coins += giftAmount;
                
                await Promise.all([
                    sender.save(),
                    recipient.save()
                ]);
                
                // Log transaction
                await Transaction.record({
                    type: 'gift_gold',
                    fromWallet: player.walletAddress,
                    toWallet: recipientWallet,
                    amount: giftAmount,
                    currency: 'coins',
                    reason: `Gift to ${recipient.username}`
                });
                
                console.log(`🎁 ${sender.username} gifted ${giftAmount} gold to ${recipient.username}`);
                
                // Update sender's coins in their UI
                sendToPlayer(playerId, {
                    type: 'coins_update',
                    coins: sender.coins,
                    isAuthenticated: true
                });
                
                // Notify recipient if they're online - update their coins balance immediately
                if (getPlayerByWallet && recipientWallet) {
                    const recipientPlayer = getPlayerByWallet(recipientWallet);
                    if (recipientPlayer && recipientPlayer.id) {
                        // Send coins_update to recipient so their UI updates immediately
                        sendToPlayer(recipientPlayer.id, {
                            type: 'coins_update',
                            coins: recipient.coins,
                            isAuthenticated: true
                        });
                        console.log(`🪙 Notified recipient ${recipient.username} of gold gift (new balance: ${recipient.coins})`);
                    }
                }
                
                // Notify recipient if they're online - show gift notification
                if (getPlayerByWallet && recipientWallet) {
                    const recipientPlayer = getPlayerByWallet(recipientWallet);
                    if (recipientPlayer && recipientPlayer.id) {
                        // Send gift_received message to recipient so they see a notification
                        sendToPlayer(recipientPlayer.id, {
                            type: 'gift_received',
                            giftType: 'gold',
                            from: {
                                username: player.name,
                                walletAddress: player.walletAddress
                            },
                            amount: giftAmount
                        });
                        console.log(`🎁 Notified recipient ${recipient.username} of gold gift`);
                    }
                }
                
                sendToPlayer(playerId, {
                    type: 'gift_result',
                    success: true,
                    message: `Sent ${giftAmount} gold to ${recipient.username}!`
                });
                
            } catch (error) {
                console.error('🎁 Error in gift_send_gold:', error);
                sendToPlayer(playerId, {
                    type: 'gift_result',
                    success: false,
                    error: 'SERVER_ERROR',
                    message: 'Failed to send gold'
                });
            }
            return true;
        }
        
        // ==================== SEND PEBBLES ====================
        case 'gift_send_pebbles': {
            try {
                const { recipientWallet, amount } = message;
                
                // Validate sender
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'You must be authenticated to send gifts'
                    });
                    return true;
                }
                
                // CRITICAL SECURITY: Validate wallet addresses to prevent injection
                const senderValidation = validateWalletAddress(player.walletAddress);
                const recipientValidation = validateWalletAddress(recipientWallet);
                
                if (!senderValidation.valid) {
                    console.error(`🚨 Security: Invalid sender wallet address: ${senderValidation.error}`);
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'INVALID_SENDER',
                        message: 'Invalid sender wallet address'
                    });
                    return true;
                }
                
                if (!recipientValidation.valid) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'INVALID_RECIPIENT',
                        message: recipientValidation.error || 'Invalid recipient wallet address'
                    });
                    return true;
                }
                
                // Can't gift yourself
                if (recipientValidation.address === senderValidation.address) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'CANNOT_GIFT_SELF',
                        message: 'You cannot gift yourself'
                    });
                    return true;
                }
                
                // CRITICAL SECURITY: Validate amount with strict type checking
                const amountValidation = validateAmount(amount, {
                    min: 1,
                    max: 1000000, // Reasonable maximum for gifts
                    allowFloat: false, // Must be integer
                    allowZero: false   // Cannot be zero
                });
                
                if (!amountValidation.valid) {
                    console.error(`🚨 Security: Invalid gift amount: ${amountValidation.error}`);
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'INVALID_AMOUNT',
                        message: amountValidation.error || 'Invalid gift amount'
                    });
                    return true;
                }
                
                const giftAmount = amountValidation.value;
                
                // Get sender (using sanitized address)
                const sender = await User.findOne({ walletAddress: senderValidation.address });
                if (!sender) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'SENDER_NOT_FOUND',
                        message: 'Sender account not found'
                    });
                    return true;
                }
                
                // Check balance (server-side authority - no client trust)
                const senderBalance = Number(sender.pebbles) || 0;
                if (senderBalance < giftAmount) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'INSUFFICIENT_PEBBLES',
                        message: `Insufficient pebbles. You have ${senderBalance}`
                    });
                    return true;
                }
                
                // Get recipient (using sanitized address)
                const recipient = await User.findOne({ walletAddress: recipientValidation.address });
                if (!recipient) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'RECIPIENT_NOT_FOUND',
                        message: 'Recipient account not found'
                    });
                    return true;
                }
                
                // Transfer pebbles
                sender.pebbles = (sender.pebbles || 0) - giftAmount;
                recipient.pebbles = (recipient.pebbles || 0) + giftAmount;
                
                await Promise.all([
                    sender.save(),
                    recipient.save()
                ]);
                
                // Log transaction
                await Transaction.record({
                    type: 'gift_pebbles',
                    fromWallet: player.walletAddress,
                    toWallet: recipientWallet,
                    amount: giftAmount,
                    currency: 'pebbles',
                    reason: `Gift to ${recipient.username}`
                });
                
                console.log(`🎁 ${sender.username} gifted ${giftAmount} pebbles to ${recipient.username}`);
                
                // Update sender's pebbles in their UI
                sendToPlayer(playerId, {
                    type: 'pebbles_update',
                    pebbles: sender.pebbles
                });
                
                // Notify recipient if they're online - update their pebbles balance immediately
                if (getPlayerByWallet && recipientWallet) {
                    const recipientPlayer = getPlayerByWallet(recipientWallet);
                    if (recipientPlayer && recipientPlayer.id) {
                        // Send pebbles_update to recipient so their UI updates immediately
                        sendToPlayer(recipientPlayer.id, {
                            type: 'pebbles_update',
                            pebbles: recipient.pebbles
                        });
                        console.log(`🪨 Notified recipient ${recipient.username} of pebbles gift (new balance: ${recipient.pebbles})`);
                    }
                }
                
                // Notify recipient if they're online - show gift notification
                if (getPlayerByWallet && recipientWallet) {
                    const recipientPlayer = getPlayerByWallet(recipientWallet);
                    if (recipientPlayer && recipientPlayer.id) {
                        // Send gift_received message to recipient so they see a notification
                        sendToPlayer(recipientPlayer.id, {
                            type: 'gift_received',
                            giftType: 'pebbles',
                            from: {
                                username: player.name,
                                walletAddress: player.walletAddress
                            },
                            amount: giftAmount
                        });
                        console.log(`🎁 Notified recipient ${recipient.username} of pebbles gift`);
                    }
                }
                
                sendToPlayer(playerId, {
                    type: 'gift_result',
                    success: true,
                    message: `Sent ${giftAmount} pebbles to ${recipient.username}!`
                });
                
            } catch (error) {
                console.error('🎁 Error in gift_send_pebbles:', error);
                sendToPlayer(playerId, {
                    type: 'gift_result',
                    success: false,
                    error: 'SERVER_ERROR',
                    message: 'Failed to send pebbles'
                });
            }
            return true;
        }
        
        // ==================== SEND ITEM ====================
        case 'gift_send_item': {
            try {
                const { recipientWallet, itemInstanceId } = message;
                
                // Validate sender
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'You must be authenticated to send gifts'
                    });
                    return true;
                }
                
                // Can't gift yourself
                if (recipientWallet === player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'CANNOT_GIFT_SELF',
                        message: 'You cannot gift yourself'
                    });
                    return true;
                }
                
                if (!itemInstanceId) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'MISSING_ITEM',
                        message: 'Item ID required'
                    });
                    return true;
                }
                
                // Get item
                const item = await OwnedCosmetic.findOne({
                    instanceId: itemInstanceId,
                    ownerId: player.walletAddress,
                    convertedToGold: false
                });
                
                if (!item) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'ITEM_NOT_FOUND',
                        message: 'Item not found or not owned by you'
                    });
                    return true;
                }
                
                // Check if tradable
                if (item.tradable === false) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'NOT_TRADABLE',
                        message: 'This item cannot be traded'
                    });
                    return true;
                }
                
                // Check if listed on marketplace
                const isListed = await MarketListing.isItemListed(itemInstanceId);
                if (isListed) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'ITEM_LISTED',
                        message: 'Cannot gift an item that is listed for sale'
                    });
                    return true;
                }
                
                // Get recipient
                const recipient = await User.findOne({ walletAddress: recipientWallet });
                if (!recipient) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'RECIPIENT_NOT_FOUND',
                        message: 'Recipient account not found'
                    });
                    return true;
                }
                
                // Transfer ownership using the history-tracking method
                // Args: instanceId, fromWallet, toWallet, options
                const transferResult = await OwnedCosmetic.transferOwnership(
                    itemInstanceId,
                    player.walletAddress,  // fromWallet
                    recipientWallet,       // toWallet
                    {
                        price: 0,
                        acquisitionType: 'gift'
                    }
                );
                
                if (!transferResult.success) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: transferResult.error,
                        message: transferResult.message
                    });
                    return true;
                }
                
                // Log transaction
                await Transaction.record({
                    type: 'gift_item',
                    fromWallet: player.walletAddress,
                    toWallet: recipientWallet,
                    amount: 1,
                    currency: 'item',
                    relatedData: {
                        instanceId: itemInstanceId,
                        templateId: item.templateId
                    },
                    reason: `Gifted item to ${recipient.username}`
                });
                
                console.log(`🎁 ${player.name} gifted item ${item.templateId} #${item.serialNumber} to ${recipient.username}`);
                
                // Notify recipient if they're online - show gift notification
                if (getPlayerByWallet && recipientWallet) {
                    const recipientPlayer = getPlayerByWallet(recipientWallet);
                    if (recipientPlayer && recipientPlayer.id) {
                        // Send gift_received message to recipient so they see a notification
                        sendToPlayer(recipientPlayer.id, {
                            type: 'gift_received',
                            giftType: 'item',
                            from: {
                                username: player.name,
                                walletAddress: player.walletAddress
                            },
                            item: {
                                templateId: item.templateId,
                                instanceId: itemInstanceId,
                                serialNumber: item.serialNumber,
                                name: item.name || item.templateId
                            }
                        });
                        console.log(`🎁 Notified recipient ${recipient.username} of cosmetic gift`);
                    }
                }
                
                sendToPlayer(playerId, {
                    type: 'gift_result',
                    success: true,
                    message: `Sent item to ${recipient.username}!`
                });
                return true; // Ensure we return true after successful gift
                
            } catch (error) {
                console.error('🎁 Error in gift_send_item:', error);
                console.error('🎁 Error stack:', error.stack);
                sendToPlayer(playerId, {
                    type: 'gift_result',
                    success: false,
                    error: 'SERVER_ERROR',
                    message: error.message || 'Failed to send item'
                });
                return true; // Ensure we return true to indicate message was handled
            }
            return true;
        }
        
        // ==================== SPL TOKEN TRANSFER COMPLETED (logging only) ====================
        case 'gift_spl_completed': {
            // SPL token transfers happen client-side via wallet
            // This handler just logs the completed transfer for record-keeping
            try {
                const { recipientWallet, tokenMint, amount, signature, tokenSymbol } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    return true; // Silently ignore
                }
                
                // Log the transfer
                console.log(`🎁 SPL Gift: ${player.name} sent ${amount} ${tokenSymbol || 'tokens'} to ${recipientWallet?.slice(0, 8)}...`);
                console.log(`   Token: ${tokenMint?.slice(0, 8)}...`);
                console.log(`   Tx: ${signature?.slice(0, 16)}...`);
                
                // Record transaction for history
                await Transaction.record({
                    type: 'gift_spl_token',
                    fromWallet: player.walletAddress,
                    toWallet: recipientWallet,
                    amount: amount,
                    currency: 'SPL',
                    relatedData: {
                        tokenMint,
                        tokenSymbol,
                        signature
                    },
                    reason: `SPL token gift`
                });
                
            } catch (error) {
                console.error('🎁 Error logging SPL gift:', error);
            }
            return true;
        }
        
        default:
            return false; // Message not handled
    }
}

export default handleGiftMessage;

