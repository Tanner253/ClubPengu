/**
 * Marketplace WebSocket Message Handlers
 * Open market for cosmetic trading (RuneScape GE / CS:GO style)
 * All trades in Pebbles (premium currency)
 * 
 * Features real-time updates - all players see new listings instantly
 */

import marketplaceService from '../services/MarketplaceService.js';
import OwnedCosmetic from '../db/models/OwnedCosmetic.js';
import User from '../db/models/User.js';

/**
 * Handle marketplace-related messages
 * @param {string} playerId - Player ID
 * @param {Object} player - Player state object
 * @param {Object} message - The message
 * @param {Function} sendToPlayer - Send message to specific player
 * @param {Function} broadcastToAll - Broadcast to all connected players
 * @param {Function} getPlayerByWallet - Get player by wallet address (for seller notifications)
 * @returns {boolean} - True if message was handled
 */
export async function handleMarketplaceMessage(playerId, player, message, sendToPlayer, broadcastToAll, getPlayerByWallet) {
    switch (message.type) {
        
        // ==================== BROWSE LISTINGS ====================
        case 'market_browse': {
            try {
                const { page, limit, category, rarity, templateId, minPrice, maxPrice, sortBy, search } = message;
                
                const result = await marketplaceService.browseListings({
                    page: page || 1,
                    limit: Math.min(limit || 20, 50),  // Cap at 50
                    category,
                    rarity,
                    templateId,
                    minPrice,
                    maxPrice,
                    sortBy,
                    search
                });
                
                sendToPlayer(playerId, {
                    type: 'market_listings',
                    ...result
                });
                
            } catch (error) {
                console.error('🏪 Error in market_browse:', error);
                sendToPlayer(playerId, {
                    type: 'market_listings',
                    listings: [],
                    total: 0,
                    error: 'Failed to fetch listings'
                });
            }
            return true;
        }
        
        // ==================== GET SINGLE LISTING ====================
        case 'market_get_listing': {
            try {
                const { listingId } = message;
                
                if (!listingId) {
                    sendToPlayer(playerId, {
                        type: 'market_listing_detail',
                        error: 'MISSING_ID',
                        message: 'Listing ID required'
                    });
                    return true;
                }
                
                const listing = await marketplaceService.getListing(listingId);
                
                sendToPlayer(playerId, {
                    type: 'market_listing_detail',
                    listing
                });
                
            } catch (error) {
                console.error('🏪 Error in market_get_listing:', error);
            }
            return true;
        }
        
        // ==================== LIST ITEM FOR SALE ====================
        case 'market_list_item': {
            try {
                // Must be authenticated
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'market_list_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'Please connect your wallet to list items'
                    });
                    return true;
                }
                
                const { itemInstanceId, price } = message;
                
                if (!itemInstanceId || !price) {
                    sendToPlayer(playerId, {
                        type: 'market_list_result',
                        success: false,
                        error: 'MISSING_PARAMS',
                        message: 'Item ID and price required'
                    });
                    return true;
                }
                
                const result = await marketplaceService.listItem(
                    player.walletAddress,
                    itemInstanceId,
                    price
                );
                
                // Send result to seller
                sendToPlayer(playerId, {
                    type: 'market_list_result',
                    ...result
                });
                
                // If successful, broadcast to ALL players for real-time updates
                if (result.success && result.listing) {
                    const listing = result.listing;
                    
                    // Broadcast new listing to all connected players
                    broadcastToAll({
                        type: 'market_new_listing',
                        listing: {
                            listingId: listing.listingId,
                            templateId: listing.templateId,
                            itemSnapshot: listing.itemSnapshot,
                            price: listing.price,
                            sellerId: listing.sellerId,
                            sellerUsername: listing.sellerUsername,
                            listedAt: listing.createdAt
                        }
                    });
                    
                    // Broadcast announcement for chat/notification
                    broadcastToAll({
                        type: 'market_announcement',
                        announcement: {
                            event: 'new_listing',
                            itemName: listing.itemSnapshot?.name || 'Unknown Item',
                            rarity: listing.itemSnapshot?.rarity || 'common',
                            price: listing.price,
                            sellerUsername: listing.sellerUsername || 'Someone',
                            serialNumber: listing.itemSnapshot?.serialNumber
                        }
                    });
                    
                    console.log(`🏪 Broadcasted new listing: ${listing.itemSnapshot?.name} by ${listing.sellerUsername}`);
                }
                
            } catch (error) {
                console.error('🏪 Error in market_list_item:', error);
                sendToPlayer(playerId, {
                    type: 'market_list_result',
                    success: false,
                    error: 'SERVER_ERROR',
                    message: 'Failed to list item'
                });
            }
            return true;
        }
        
        // ==================== CANCEL LISTING ====================
        case 'market_cancel_listing': {
            try {
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'market_cancel_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'Please connect your wallet'
                    });
                    return true;
                }
                
                const { listingId } = message;
                
                if (!listingId) {
                    sendToPlayer(playerId, {
                        type: 'market_cancel_result',
                        success: false,
                        error: 'MISSING_ID',
                        message: 'Listing ID required'
                    });
                    return true;
                }
                
                const result = await marketplaceService.cancelListing(
                    player.walletAddress,
                    listingId
                );
                
                sendToPlayer(playerId, {
                    type: 'market_cancel_result',
                    ...result
                });
                
                // Broadcast removal to all players for real-time updates
                if (result.success) {
                    broadcastToAll({
                        type: 'market_listing_removed',
                        listingId,
                        reason: 'cancelled'
                    });
                }
                
            } catch (error) {
                console.error('🏪 Error in market_cancel_listing:', error);
                sendToPlayer(playerId, {
                    type: 'market_cancel_result',
                    success: false,
                    error: 'SERVER_ERROR',
                    message: 'Failed to cancel listing'
                });
            }
            return true;
        }
        
        // ==================== BUY ITEM ====================
        case 'market_buy': {
            try {
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'market_buy_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'Please connect your wallet to purchase items'
                    });
                    return true;
                }
                
                const { listingId } = message;
                
                if (!listingId) {
                    sendToPlayer(playerId, {
                        type: 'market_buy_result',
                        success: false,
                        error: 'MISSING_ID',
                        message: 'Listing ID required'
                    });
                    return true;
                }
                
                const result = await marketplaceService.buyItem(
                    player.walletAddress,
                    listingId
                );
                
                sendToPlayer(playerId, {
                    type: 'market_buy_result',
                    ...result
                });
                
                // Update buyer's pebble balance in real-time
                if (result.success && result.newPebbleBalance !== undefined) {
                    sendToPlayer(playerId, {
                        type: 'pebbles_update',
                        pebbles: result.newPebbleBalance
                    });
                }
                
                // CRITICAL: Refresh buyer's inventory after purchase
                // This ensures the client knows they own the item before they try to equip it
                if (result.success && result.item) {
                    try {
                        const inventory = await OwnedCosmetic.getFullInventory(player.walletAddress, {
                            page: 1,
                            limit: 50
                        });
                        
                        const user = await User.findOne({ walletAddress: player.walletAddress });
                        
                        sendToPlayer(playerId, {
                            type: 'inventory_data',
                            items: inventory.items,
                            total: inventory.total,
                            page: inventory.page,
                            hasMore: inventory.hasMore,
                            maxSlots: user?.maxInventorySlots || 150,
                            upgradeInfo: user?.getInventoryUpgradeInfo() || null
                        });
                        
                        console.log(`🏪 Refreshed inventory for buyer ${player.name} after purchase`);
                    } catch (inventoryError) {
                        console.error('🏪 Error refreshing inventory after purchase:', inventoryError);
                        // Don't fail the purchase if inventory refresh fails
                    }
                }
                
                // Broadcast sale to all players for real-time updates
                if (result.success && result.item) {
                    // Remove listing from all clients
                    broadcastToAll({
                        type: 'market_listing_removed',
                        listingId,
                        reason: 'sold'
                    });
                    
                    // Announce the sale
                    broadcastToAll({
                        type: 'market_announcement',
                        announcement: {
                            event: 'sale',
                            itemName: result.item?.name || 'Unknown Item',
                            rarity: result.item?.rarity || 'common',
                            price: result.pebblesPaid,
                            buyerUsername: player.name || 'Someone'
                        }
                    });
                    
                    // Notify seller if they're online
                    if (result.sellerWallet && result.sellerNewPebbles !== undefined) {
                        const sellerPlayer = getPlayerByWallet?.(result.sellerWallet);
                        if (sellerPlayer) {
                            // Update seller's pebble balance
                            sendToPlayer(sellerPlayer.id, {
                                type: 'pebbles_update',
                                pebbles: result.sellerNewPebbles
                            });
                            
                            // Notify seller their item sold
                            sendToPlayer(sellerPlayer.id, {
                                type: 'market_item_sold',
                                itemName: result.item?.name,
                                price: result.pebblesPaid,
                                buyerUsername: player.name || 'Someone',
                                newPebbles: result.sellerNewPebbles
                            });
                            
                            console.log(`🏪 Notified seller ${sellerPlayer.name} of sale`);
                        }
                    }
                    
                    console.log(`🏪 Broadcasted sale: ${result.item?.name} purchased by ${player.name}`);
                }
                
            } catch (error) {
                console.error('🏪 Error in market_buy:', error);
                sendToPlayer(playerId, {
                    type: 'market_buy_result',
                    success: false,
                    error: 'SERVER_ERROR',
                    message: 'Failed to purchase item'
                });
            }
            return true;
        }
        
        // ==================== GET MY LISTINGS ====================
        case 'market_my_listings': {
            try {
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'market_my_listings',
                        listings: [],
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const listings = await marketplaceService.getUserListings(player.walletAddress);
                
                sendToPlayer(playerId, {
                    type: 'market_my_listings',
                    listings
                });
                
            } catch (error) {
                console.error('🏪 Error in market_my_listings:', error);
                sendToPlayer(playerId, {
                    type: 'market_my_listings',
                    listings: [],
                    error: 'Failed to fetch listings'
                });
            }
            return true;
        }
        
        // ==================== GET SALES HISTORY ====================
        case 'market_sales_history': {
            try {
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'market_sales_history',
                        sales: [],
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const sales = await marketplaceService.getUserSalesHistory(player.walletAddress);
                
                sendToPlayer(playerId, {
                    type: 'market_sales_history',
                    sales
                });
                
            } catch (error) {
                console.error('🏪 Error in market_sales_history:', error);
            }
            return true;
        }
        
        // ==================== GET PURCHASE HISTORY ====================
        case 'market_purchase_history': {
            try {
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'market_purchase_history',
                        purchases: [],
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const purchases = await marketplaceService.getUserPurchaseHistory(player.walletAddress);
                
                sendToPlayer(playerId, {
                    type: 'market_purchase_history',
                    purchases
                });
                
            } catch (error) {
                console.error('🏪 Error in market_purchase_history:', error);
            }
            return true;
        }
        
        // ==================== GET PRICE HISTORY FOR ITEM ====================
        case 'market_price_history': {
            try {
                const { templateId, days } = message;
                
                if (!templateId) {
                    sendToPlayer(playerId, {
                        type: 'market_price_history',
                        error: 'MISSING_ID',
                        message: 'Template ID required'
                    });
                    return true;
                }
                
                const history = await marketplaceService.getItemPriceHistory(templateId, days || 30);
                
                sendToPlayer(playerId, {
                    type: 'market_price_history',
                    templateId,
                    ...history
                });
                
            } catch (error) {
                console.error('🏪 Error in market_price_history:', error);
            }
            return true;
        }
        
        // ==================== GET MARKET STATS ====================
        case 'market_stats': {
            try {
                const stats = await marketplaceService.getMarketStats();
                
                sendToPlayer(playerId, {
                    type: 'market_stats',
                    ...stats
                });
                
            } catch (error) {
                console.error('🏪 Error in market_stats:', error);
            }
            return true;
        }
        
        // ==================== CHECK IF CAN LIST ITEM ====================
        case 'market_can_list': {
            try {
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'market_can_list',
                        canList: false,
                        reason: 'Not authenticated'
                    });
                    return true;
                }
                
                const { itemInstanceId } = message;
                
                if (!itemInstanceId) {
                    sendToPlayer(playerId, {
                        type: 'market_can_list',
                        canList: false,
                        reason: 'Item ID required'
                    });
                    return true;
                }
                
                const result = await marketplaceService.canListItem(
                    player.walletAddress,
                    itemInstanceId
                );
                
                sendToPlayer(playerId, {
                    type: 'market_can_list',
                    ...result
                });
                
            } catch (error) {
                console.error('🏪 Error in market_can_list:', error);
            }
            return true;
        }
        
        // ==================== GET ITEM OWNERSHIP HISTORY ====================
        case 'market_item_history': {
            try {
                const { itemInstanceId } = message;
                
                if (!itemInstanceId) {
                    sendToPlayer(playerId, {
                        type: 'market_item_history',
                        success: false,
                        error: 'Item ID required'
                    });
                    return true;
                }
                
                // Import OwnedCosmetic
                const { OwnedCosmetic, CosmeticTemplate } = await import('../db/models/index.js');
                
                const history = await OwnedCosmetic.getOwnershipHistory(itemInstanceId);
                
                if (!history) {
                    sendToPlayer(playerId, {
                        type: 'market_item_history',
                        success: false,
                        error: 'Item not found'
                    });
                    return true;
                }
                
                // Get template for item name
                const template = await CosmeticTemplate.findOne({ templateId: history.templateId }).select('name rarity category');
                
                sendToPlayer(playerId, {
                    type: 'market_item_history',
                    success: true,
                    item: {
                        instanceId: itemInstanceId,
                        templateId: history.templateId,
                        name: template?.name || 'Unknown Item',
                        rarity: template?.rarity || 'common',
                        category: template?.category || 'unknown',
                        serialNumber: history.serialNumber,
                        mintedAt: history.mintedAt,
                        originalOwner: history.originalOwner,
                        totalTrades: history.totalTrades,
                        lastSalePrice: history.lastSalePrice
                    },
                    history: history.history
                });
                
            } catch (error) {
                console.error('🏪 Error in market_item_history:', error);
                sendToPlayer(playerId, {
                    type: 'market_item_history',
                    success: false,
                    error: 'Failed to get item history'
                });
            }
            return true;
        }
        
        default:
            return false; // Message not handled
    }
}

