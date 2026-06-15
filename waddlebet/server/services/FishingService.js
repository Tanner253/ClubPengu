/**
 * FishingService - Server-side fishing logic
 *
 * Client runs the ice fishing minigame. Server:
 * - Deducts bait cost (gold)
 * - Validates catches and adds fish to game inventory (no instant gold for authed users)
 * - Broadcasts catch bubbles to the room
 */

import { ECONOMY } from '../config/economy.js';
import {
    getGameItem,
    isInventoryCatch,
    isJellyfishId,
    getFishRarityLabel
} from '../config/gameItems.js';

const FISHING_COST = ECONOMY.FISHING.BAIT_COST;

// Legacy reference fish table (UI info endpoint)
const FISH_TYPES = [
    { id: 'minnow', emoji: '🐟', name: 'Minnow', weight: 40, coins: 3 },
    { id: 'clownfish', emoji: '🐠', name: 'Clownfish', weight: 25, coins: 10 },
    { id: 'reef_shark', emoji: '🦈', name: 'Reef Shark', weight: 15, coins: 40 },
    { id: 'giant_squid', emoji: '🦑', name: 'Giant Squid', weight: 10, coins: 100 },
    { id: 'leviathan', emoji: '🐋', name: 'Leviathan', weight: 1, coins: 1000 }
];

class FishingService {
    constructor(userService, gameInventoryService, broadcastToRoom, sendToPlayer) {
        this.userService = userService;
        this.gameInventoryService = gameInventoryService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
    }

    async startFishing(playerId, walletAddress, room, spotId, playerName, guestCoins = 0, isDemo = false) {
        let newBalance;

        if (isDemo) {
            return {
                success: true,
                spotId,
                newBalance: guestCoins,
                baitCost: 0,
                isDemo: true
            };
        }

        if (walletAddress) {
            const user = await this.userService.getUser(walletAddress);
            if (!user || user.coins < FISHING_COST) {
                return {
                    error: 'INSUFFICIENT_FUNDS',
                    message: `Need ${FISHING_COST} coins for bait (you have ${user?.coins || 0})`
                };
            }

            const deductResult = await this.userService.addCoins(
                walletAddress,
                -FISHING_COST,
                'fishing_bait',
                { spotId, room },
                'Fishing bait'
            );

            if (!deductResult.success) {
                return { error: 'DEDUCT_FAILED', message: 'Failed to buy bait' };
            }
            newBalance = deductResult.newBalance;
        } else {
            if (guestCoins < FISHING_COST) {
                return {
                    error: 'INSUFFICIENT_FUNDS',
                    message: `Need ${FISHING_COST} coins for bait`
                };
            }
            newBalance = guestCoins - FISHING_COST;
        }

        console.log(`🎣 ${playerName} started fishing at spot ${spotId}`);

        return {
            success: true,
            spotId,
            newBalance,
            baitCost: FISHING_COST,
            isDemo: false
        };
    }

    /**
     * Handle minigame catch — fish go to inventory; jellyfish are hazards only.
     */
    async handleCatch(playerId, walletAddress, room, playerName, fishData, depth = 0, isDemo = false, guestBalance = 0) {
        const fishId = fishData?.id || 'unknown';
        const catalogItem = getGameItem(fishId);
        const isJellyfish = isJellyfishId(fishId) || fishData?.type === 'jellyfish';
        const storable = isInventoryCatch(fishData);

        console.log(`[FISHING] handleCatch player=${playerId} name=${playerName} fish=${fishId} depth=${depth} isDemo=${isDemo} wallet=${walletAddress ? walletAddress.slice(0, 8) + '…' : 'NONE'} storable=${storable} jelly=${isJellyfish} catalog=${!!catalogItem}`);

        const npcValue = catalogItem?.npcValue ?? Math.min(Math.max(0, fishData?.coins || 0), 1000);

        const fish = {
            id: fishId,
            emoji: fishData?.emoji || catalogItem?.emoji || '🐟',
            name: fishData?.name || catalogItem?.name || 'Fish',
            category: catalogItem?.category || 'fish',
            rarity: getFishRarityLabel(fishId),
            npcValue,
            tier: catalogItem?.tier || 0
        };

        let newBalance = guestBalance;
        let inventoryAdded = false;
        let inventory = null;
        let inventoryError = null;

        if (isJellyfish) {
            console.log(`[FISHING] jellyfish hazard — no inventory player=${playerId} fish=${fishId}`);
        } else if (isDemo) {
            console.warn(`[FISHING] demo catch — skipping backpack player=${playerId} fish=${fishId}`);
            newBalance = guestBalance;
        } else if (walletAddress && isInventoryCatch(fishData)) {
            console.log(`[FISHING] adding to backpack player=${playerId} wallet=${walletAddress.slice(0, 8)}… fish=${fishId}`);
            const addResult = await this.gameInventoryService.addItem(
                walletAddress,
                fishId,
                1,
                {
                    caughtAt: new Date().toISOString(),
                    depth,
                    name: fish.name,
                    emoji: fish.emoji,
                    npcValue,
                    category: fish.category,
                    tier: fish.tier
                }
            );

            if (addResult.error) {
                inventoryError = addResult.error;
                console.warn(`[FISHING] backpack add FAILED player=${playerName} wallet=${walletAddress.slice(0, 8)}… fish=${fishId} error=${addResult.error} msg=${addResult.message || ''}`);
            } else {
                inventoryAdded = true;
                inventory = addResult.inventory;
                const user = await this.userService.getUser(walletAddress);
                newBalance = user?.coins ?? guestBalance;
                console.log(`[FISHING] backpack add OK player=${playerName} fish=${fishId} usedSlots=${inventory?.usedSlots ?? '?'} slot0=${inventory?.slots?.[0]?.itemId || 'empty'}`);
            }
        } else if (walletAddress) {
            console.warn(`[FISHING] catch NOT storable player=${playerName} fish=${fishId} storable=${storable} wallet=${walletAddress.slice(0, 8)}…`);
            const user = await this.userService.getUser(walletAddress);
            newBalance = user?.coins ?? guestBalance;
        } else {
            newBalance = guestBalance + npcValue;
        }

        if (this.sendToPlayer) {
            this.sendToPlayer(playerId, {
                type: 'fishing_result',
                success: true,
                fish,
                coins: 0,
                npcValue: isDemo ? 0 : npcValue,
                inventoryAdded,
                inventoryError,
                inventory,
                newBalance,
                isDemo,
                isJellyfish
            });
        }

        if (this.broadcastToRoom && !isJellyfish && (inventoryAdded || isDemo || !walletAddress)) {
            this.broadcastToRoom(room, {
                type: 'player_caught_fish',
                playerId,
                playerName,
                fish,
                coins: 0,
                npcValue,
                depth,
                isDemo,
                inventoryAdded
            });
        }

        const action = isJellyfish ? 'STUNG by' : 'caught';
        const reward = inventoryAdded ? '→inventory' : isJellyfish ? '' : `(~${npcValue}g NPC)`;
        console.log(`🎣 ${playerName} ${action} ${fish.emoji} ${fish.name} at ${depth}m ${reward}${isDemo ? ' [DEMO]' : ''}`);

        return {
            success: true,
            fish,
            npcValue,
            inventoryAdded,
            inventoryError,
            inventory,
            newBalance,
            isDemo,
            isJellyfish
        };
    }

    handleDisconnect(playerId) {
        // Stateless — no cleanup
    }

    static getFishingInfo() {
        const totalWeight = FISH_TYPES.reduce((sum, f) => sum + f.weight, 0);
        return {
            cost: FISHING_COST,
            sellAtNpc: true,
            fish: FISH_TYPES.map(f => ({
                id: f.id,
                emoji: f.emoji,
                name: f.name,
                npcValue: f.coins,
                probability: ((f.weight / totalWeight) * 100).toFixed(1) + '%'
            }))
        };
    }
}

export default FishingService;
export { FISH_TYPES, FISHING_COST };
