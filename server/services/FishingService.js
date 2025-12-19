/**
 * FishingService - Simplified server-side fishing logic
 * 
 * The fishing minigame is client-side single-player.
 * Server responsibilities:
 * - Deduct bait cost (5 coins)
 * - Award coins when fish is caught
 * - Broadcast catch to room for UI bubble above player
 * 
 * No session tracking, no spot reservations, unlimited parallel games.
 */

const FISHING_COST = 5; // Bait cost per cast

// Fish types with weighted rarity (reference for validation)
const FISH_TYPES = [
    { id: 'gray_fish', emoji: '🐟', name: 'Gray Fish', weight: 40, coins: 5 },
    { id: 'yellow_fish', emoji: '🐠', name: 'Yellow Fish', weight: 25, coins: 15 },
    { id: 'blue_fish', emoji: '🐟', name: 'Blue Fish', weight: 15, coins: 30 },
    { id: 'orange_fish', emoji: '🐠', name: 'Orange Fish', weight: 10, coins: 50 },
    { id: 'golden_fish', emoji: '✨', name: 'Golden Fish', weight: 6, coins: 100 },
    { id: 'rainbow_fish', emoji: '🌈', name: 'Rainbow Fish', weight: 200 },
    { id: 'mullet', emoji: '🦈', name: 'The Mullet', weight: 1, coins: 500 }
];

class FishingService {
    constructor(userService, broadcastToRoom, sendToPlayer) {
        this.userService = userService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
    }
    
    /**
     * Start fishing - deduct bait cost
     * Returns immediately, client handles the minigame
     */
    async startFishing(playerId, walletAddress, room, spotId, playerName, guestCoins = 0, isDemo = false) {
        let newBalance;
        
        // Demo mode - no cost
        if (isDemo) {
            return {
                success: true,
                spotId,
                newBalance: guestCoins,
                baitCost: 0,
                isDemo: true
            };
        }
        
        // Authenticated user - deduct bait cost
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
            // Guest with coins
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
     * Handle minigame catch - award coins and broadcast to room
     */
    async handleCatch(playerId, walletAddress, room, playerName, fishData, depth = 0, isDemo = false, guestBalance = 0) {
        // Normalize fish data and cap coins to prevent abuse
        const fish = {
            id: fishData?.id || 'unknown',
            emoji: fishData?.emoji || '🐟',
            name: fishData?.name || 'Fish',
            type: fishData?.type || 'fish'
        };
        const coins = Math.min(Math.max(0, fishData?.coins || 0), 1000);
        
        let newBalance = null;
        
        if (isDemo) {
            // Demo - no real coins
            newBalance = guestBalance;
        } else if (walletAddress) {
            // Authenticated user - award coins
            try {
                const awardResult = await this.userService.addCoins(
                    walletAddress,
                    coins,
                    'fishing_catch',
                    { fishId: fish.id, depth },
                    `Caught ${fish.name}`
                );
                newBalance = awardResult?.newBalance;
            } catch (err) {
                console.error('🎣 Error awarding fishing coins:', err);
                newBalance = guestBalance;
            }
        } else {
            // Guest with coins
            newBalance = guestBalance + coins;
        }
        
        // Send result to the fishing player
        if (this.sendToPlayer) {
            this.sendToPlayer(playerId, {
                type: 'fishing_result',
                success: true,
                fish,
                coins: isDemo ? 0 : coins,
                newBalance,
                isDemo
            });
        }
        
        // Broadcast catch to everyone in room for UI bubble above player
        if (this.broadcastToRoom) {
            this.broadcastToRoom(room, {
                type: 'player_caught_fish',
                playerId,
                playerName,
                fish,
                coins: isDemo ? 0 : coins,
                depth,
                isDemo
            });
        }
        
        const isJellyfish = fish.type === 'jellyfish' || fish.id?.includes('jelly');
        const action = isJellyfish ? 'STUNG by' : 'caught';
        console.log(`🎣 ${playerName} ${action} ${fish.emoji} ${fish.name} at ${depth}m (+${coins}g)${isDemo ? ' [DEMO]' : ''}`);
        
        return { success: true, fish, coins, newBalance, isDemo };
    }
    
    /**
     * Handle player disconnect - no cleanup needed since we don't track sessions
     */
    handleDisconnect(playerId) {
        // No-op - fishing is stateless on server
    }
    
    /**
     * Get fishing info for UI
     */
    static getFishingInfo() {
        const totalWeight = FISH_TYPES.reduce((sum, f) => sum + f.weight, 0);
        return {
            cost: FISHING_COST,
            fish: FISH_TYPES.map(f => ({
                id: f.id,
                emoji: f.emoji,
                name: f.name,
                coins: f.coins,
                probability: ((f.weight / totalWeight) * 100).toFixed(1) + '%'
            }))
        };
    }
}

export default FishingService;
export { FISH_TYPES, FISHING_COST };
