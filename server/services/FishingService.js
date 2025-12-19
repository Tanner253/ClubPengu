/**
 * FishingService - Server-authoritative ice fishing game logic
 * 
 * Features:
 * - Provably fair RNG for fish catches
 * - Timed bite mechanics (player must react)
 * - Multiplayer spectator broadcasts
 * - Demo mode for guests (always catch something)
 */

const FISHING_COST = 5; // Bait cost per cast
const MIN_BITE_TIME = 3000; // Minimum wait for bite (ms)
const MAX_BITE_TIME = 12000; // Maximum wait for bite (ms)
const CATCH_WINDOW = 1500; // Time to click after bite (ms)
const REEL_DURATION = 1000; // Reeling animation time (ms)

// Fish types with weighted rarity
const FISH_TYPES = [
    { id: 'gray_fish', emoji: '🐟', name: 'Gray Fish', weight: 40, coins: 5 },
    { id: 'yellow_fish', emoji: '🐠', name: 'Yellow Fish', weight: 25, coins: 15 },
    { id: 'blue_fish', emoji: '🐟', name: 'Blue Fish', weight: 15, coins: 30 },
    { id: 'orange_fish', emoji: '🐠', name: 'Orange Fish', weight: 10, coins: 50 },
    { id: 'golden_fish', emoji: '✨', name: 'Golden Fish', weight: 6, coins: 100 },
    { id: 'rainbow_fish', emoji: '🌈', name: 'Rainbow Fish', weight: 3, coins: 200 },
    { id: 'mullet', emoji: '🦈', name: 'The Mullet', weight: 1, coins: 500 }
];

const TOTAL_FISH_WEIGHT = FISH_TYPES.reduce((sum, f) => sum + f.weight, 0);

// Demo mode fish - always good catches for FOMO
const DEMO_FISH_TYPES = [
    { id: 'golden_fish', weight: 30 },
    { id: 'rainbow_fish', weight: 25 },
    { id: 'mullet', weight: 15 },
    { id: 'orange_fish', weight: 20 },
    { id: 'blue_fish', weight: 10 }
];
const DEMO_TOTAL_WEIGHT = DEMO_FISH_TYPES.reduce((sum, f) => sum + f.weight, 0);

class FishingService {
    constructor(userService, broadcastToRoom, sendToPlayer) {
        this.userService = userService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
        
        // Active fishing sessions: sessionKey -> session data
        this.activeSessions = new Map();
        
        // Spot states: spotKey (room:spotId) -> { playerId, state }
        this.spotStates = new Map();
        
        // Bite timers
        this.biteTimers = new Map();
        this.catchTimers = new Map();
    }
    
    /**
     * Generate session key
     */
    getSessionKey(playerId, spotId) {
        return `${playerId}:${spotId}`;
    }
    
    /**
     * Generate spot key
     */
    getSpotKey(room, spotId) {
        return `${room}:${spotId}`;
    }
    
    /**
     * Get random fish based on weights
     */
    getRandomFish(isDemo = false) {
        if (isDemo) {
            // Demo mode - better fish for FOMO
            let random = Math.random() * DEMO_TOTAL_WEIGHT;
            for (const demoFish of DEMO_FISH_TYPES) {
                random -= demoFish.weight;
                if (random <= 0) {
                    return FISH_TYPES.find(f => f.id === demoFish.id);
                }
            }
        }
        
        // Regular weighted random
        let random = Math.random() * TOTAL_FISH_WEIGHT;
        for (const fish of FISH_TYPES) {
            random -= fish.weight;
            if (random <= 0) {
                return fish;
            }
        }
        return FISH_TYPES[0];
    }
    
    /**
     * Get random bite time
     */
    getRandomBiteTime() {
        return MIN_BITE_TIME + Math.random() * (MAX_BITE_TIME - MIN_BITE_TIME);
    }
    
    /**
     * Check if player can start fishing
     */
    async canFish(playerId, walletAddress, spotId, room, guestCoins = 0, isDemo = false) {
        const spotKey = this.getSpotKey(room, spotId);
        
        // Check if spot is in use
        if (this.spotStates.has(spotKey)) {
            const spotState = this.spotStates.get(spotKey);
            if (spotState.playerId !== playerId) {
                return { allowed: false, error: 'SPOT_IN_USE', message: 'This spot is taken' };
            }
        }
        
        // Demo mode - always allowed
        if (isDemo) {
            return { allowed: true, isGuest: true, isDemo: true };
        }
        
        // Authenticated user check
        if (walletAddress) {
            const user = await this.userService.getUser(walletAddress);
            if (!user || user.coins < FISHING_COST) {
                return {
                    allowed: false,
                    error: 'INSUFFICIENT_FUNDS',
                    message: `Need ${FISHING_COST} coins for bait (you have ${user?.coins || 0})`
                };
            }
            return { allowed: true, isGuest: false, isDemo: false };
        }
        
        // Guest with coins
        if (guestCoins >= FISHING_COST) {
            return { allowed: true, isGuest: true, isDemo: false };
        }
        
        // Guest without coins gets demo
        return { allowed: true, isGuest: true, isDemo: true };
    }
    
    /**
     * Start fishing at a spot
     */
    async startFishing(playerId, walletAddress, room, spotId, playerName, playerPosition, guestCoins = 0, isDemo = false) {
        const canFishResult = await this.canFish(playerId, walletAddress, spotId, room, guestCoins, isDemo);
        if (!canFishResult.allowed) {
            return canFishResult;
        }
        
        // CRITICAL: Clean up any existing session for this player+spot before starting new one
        // This prevents stale state from previous games causing issues
        const existingSessionKey = this.getSessionKey(playerId, spotId);
        const existingSession = this.activeSessions.get(existingSessionKey);
        if (existingSession) {
            console.log(`🎣 Cleaning up existing session for ${playerName} at spot ${spotId}`);
            this.cleanupSession(existingSessionKey, existingSession);
        }
        
        const isDemoSession = canFishResult.isDemo;
        let newBalance;
        
        // Deduct bait cost
        if (isDemoSession) {
            newBalance = guestCoins;
        } else if (walletAddress && !canFishResult.isGuest) {
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
            newBalance = guestCoins - FISHING_COST;
        }
        
        // Pre-determine the fish (server authoritative)
        const fish = this.getRandomFish(isDemoSession);
        const biteTime = this.getRandomBiteTime();
        
        const sessionKey = this.getSessionKey(playerId, spotId);
        const spotKey = this.getSpotKey(room, spotId);
        
        const session = {
            playerId,
            walletAddress,
            spotId,
            spotKey,
            sessionKey,
            room,
            playerName,
            playerPosition,
            state: 'casting',
            startTime: Date.now(),
            biteTime,
            fish,
            isGuest: canFishResult.isGuest,
            isDemo: isDemoSession,
            guestBalance: newBalance
        };
        
        this.activeSessions.set(sessionKey, session);
        this.spotStates.set(spotKey, { playerId, state: 'fishing' });
        
        // Broadcast fishing start to room
        if (this.broadcastToRoom) {
            this.broadcastToRoom(room, {
                type: 'fishing_start',
                playerId,
                spotId,
                playerName,
                playerPosition,
                isDemo: isDemoSession
            });
        }
        
        // Schedule state transitions
        this.scheduleFishingStates(sessionKey, session);
        
        return {
            success: true,
            spotId,
            newBalance,
            baitCost: isDemoSession ? 0 : FISHING_COST,
            isDemo: isDemoSession
        };
    }
    
    /**
     * Schedule fishing state transitions
     */
    scheduleFishingStates(sessionKey, session) {
        // Cast complete -> waiting (1.5 seconds)
        setTimeout(() => {
            this.transitionToWaiting(sessionKey);
        }, 1500);
        
        // Schedule bite
        const biteTimer = setTimeout(() => {
            this.triggerBite(sessionKey);
        }, 1500 + session.biteTime);
        
        this.biteTimers.set(sessionKey, biteTimer);
    }
    
    /**
     * Transition to waiting state
     */
    transitionToWaiting(sessionKey) {
        const session = this.activeSessions.get(sessionKey);
        if (!session || session.state !== 'casting') return;
        
        session.state = 'waiting';
        
        // Broadcast state change
        if (this.broadcastToRoom) {
            this.broadcastToRoom(session.room, {
                type: 'fishing_state',
                playerId: session.playerId,
                spotId: session.spotId,
                state: 'waiting',
                playerName: session.playerName
            });
        }
    }
    
    /**
     * Trigger fish bite
     */
    triggerBite(sessionKey) {
        const session = this.activeSessions.get(sessionKey);
        if (!session || (session.state !== 'waiting' && session.state !== 'casting')) return;
        
        session.state = 'bite';
        session.biteTriggeredAt = Date.now();
        
        // Broadcast bite to all
        if (this.broadcastToRoom) {
            this.broadcastToRoom(session.room, {
                type: 'fishing_bite',
                playerId: session.playerId,
                spotId: session.spotId,
                playerName: session.playerName
            });
        }
        
        // Send urgent notification to fishing player
        if (this.sendToPlayer) {
            this.sendToPlayer(session.playerId, {
                type: 'fishing_bite_alert',
                spotId: session.spotId,
                catchWindow: CATCH_WINDOW
            });
        }
        
        // Schedule miss if not caught in time
        const catchTimer = setTimeout(() => {
            this.handleMiss(sessionKey, 'too_slow');
        }, CATCH_WINDOW);
        
        this.catchTimers.set(sessionKey, catchTimer);
    }
    
    /**
     * Player attempts to catch fish (old timing-based method - kept for compatibility)
     */
    async attemptCatch(playerId, spotId, room) {
        const sessionKey = this.getSessionKey(playerId, spotId);
        const session = this.activeSessions.get(sessionKey);
        
        if (!session) {
            return { error: 'NO_SESSION', message: 'Not fishing here' };
        }
        
        // Can only catch during bite state
        if (session.state !== 'bite') {
            if (session.state === 'waiting' || session.state === 'casting') {
                return { error: 'NO_BITE', message: 'Wait for a bite!' };
            }
            return { error: 'INVALID_STATE', message: 'Cannot catch now' };
        }
        
        // Clear miss timer
        const catchTimer = this.catchTimers.get(sessionKey);
        if (catchTimer) {
            clearTimeout(catchTimer);
            this.catchTimers.delete(sessionKey);
        }
        
        // Calculate reaction time bonus (faster = more coins)
        const reactionTime = Date.now() - session.biteTriggeredAt;
        let reactionBonus = 1.0;
        if (reactionTime < 300) {
            reactionBonus = 1.5; // Lightning fast!
        } else if (reactionTime < 600) {
            reactionBonus = 1.25; // Very quick
        } else if (reactionTime < 1000) {
            reactionBonus = 1.1; // Quick
        }
        
        session.state = 'reeling';
        
        // Broadcast reeling
        if (this.broadcastToRoom) {
            this.broadcastToRoom(session.room, {
                type: 'fishing_state',
                playerId: session.playerId,
                spotId: session.spotId,
                state: 'reeling',
                playerName: session.playerName
            });
        }
        
        // Complete catch after reel animation
        setTimeout(() => {
            this.completeCatch(sessionKey, reactionBonus);
        }, REEL_DURATION);
        
        return { success: true, state: 'reeling' };
    }
    
    /**
     * Handle minigame result - player caught a fish in the arcade game
     * @param {string} playerId 
     * @param {string} spotId 
     * @param {Object} fishData - { id, name, coins, emoji } from client
     * @param {number} depth - How deep player got (for validation)
     */
    async handleMinigameCatch(playerId, spotId, fishData, depth = 0) {
        const sessionKey = this.getSessionKey(playerId, spotId);
        const session = this.activeSessions.get(sessionKey);
        
        if (!session) {
            return { error: 'NO_SESSION', message: 'Not fishing here' };
        }
        
        // Accept fish data from minigame - the minigame has many fish types
        // Cap coins at reasonable maximum to prevent abuse (1000 max)
        const fish = {
            id: fishData?.id || 'unknown',
            emoji: fishData?.emoji || '🐟',
            name: fishData?.name || 'Fish',
            type: fishData?.type || 'fish' // Include type for jellyfish detection
        };
        // Use client coins but cap at 1000 to prevent cheating
        const coins = Math.min(Math.max(0, fishData?.coins || 0), 1000);
        
        const { isDemo, isGuest, walletAddress, guestBalance, room, playerName } = session;
        
        let newBalance = null;
        
        if (isDemo) {
            // Demo - no real coins
            newBalance = guestBalance || 0;
        } else if (isGuest) {
            // Guest with coins
            newBalance = (guestBalance || 0) + coins;
        } else if (walletAddress) {
            // Authenticated user - award coins
            try {
                const awardResult = await this.userService.addCoins(
                    walletAddress,
                    coins,
                    'fishing_catch',
                    { fishId: fish.id, spotId, depth },
                    `Caught ${fish.name}`
                );
                newBalance = awardResult?.newBalance;
            } catch (err) {
                console.error('🎣 Error awarding fishing coins:', err);
                newBalance = guestBalance || 0;
            }
        }
        
        // Send result to player
        if (this.sendToPlayer) {
            this.sendToPlayer(playerId, {
                type: 'fishing_result',
                spotId,
                success: true,
                fish: { id: fish.id, emoji: fish.emoji, name: fish.name, type: fish.type },
                coins: isDemo ? 0 : coins,
                hypotheticalCoins: isDemo ? coins : 0,
                depth,
                newBalance,
                isDemo
            });
        }
        
        // Broadcast catch to spectators
        if (this.broadcastToRoom) {
            this.broadcastToRoom(room, {
                type: 'fishing_catch',
                playerId,
                spotId,
                playerName,
                fish: { id: fish.id, emoji: fish.emoji, name: fish.name, type: fish.type },
                coins: isDemo ? 0 : coins,
                depth,
                isDemo
            }, playerId);
            
            // Schedule fishing_end broadcast to ensure all spectators dismiss their displays
            // This fires after result display time (3 seconds) as a safety net
            setTimeout(() => {
                if (this.broadcastToRoom) {
                    this.broadcastToRoom(room, {
                        type: 'fishing_end',
                        playerId,
                        spotId
                    });
                }
            }, 3500); // Slightly longer than RESULT_DISPLAY_TIME (3000ms)
        }
        
        // Cleanup session
        this.cleanupSession(sessionKey, session);
        
        const isJellyfish = fish.type === 'jellyfish' || fish.id?.includes('jelly');
        const action = isJellyfish ? 'STUNG by' : 'caught';
        console.log(`🎣 ${playerName} ${action} ${fish.emoji} ${fish.name} (type: ${fish.type}) at ${depth}m (+${coins}g)${isDemo ? ' [DEMO]' : ''}`);
        console.log(`🎣 Broadcasting fishing_catch to room ${room} for spot ${spotId}`);
        
        return { success: true, fish, coins, newBalance, isDemo };
    }
    
    /**
     * Handle minigame miss - player hit the bottom
     */
    async handleMinigameMiss(playerId, spotId, depth = 0) {
        const sessionKey = this.getSessionKey(playerId, spotId);
        const session = this.activeSessions.get(sessionKey);
        
        if (!session) {
            return { error: 'NO_SESSION', message: 'Not fishing here' };
        }
        
        const { room, playerName } = session;
        
        // Send miss result to player
        if (this.sendToPlayer) {
            this.sendToPlayer(playerId, {
                type: 'fishing_result',
                spotId,
                success: false,
                reason: 'hit_bottom',
                fish: null,
                coins: 0,
                depth
            });
        }
        
        // Broadcast miss to spectators AND immediately broadcast fishing_end
        // (no result to show for miss, so dismiss immediately)
        if (this.broadcastToRoom) {
            this.broadcastToRoom(room, {
                type: 'fishing_miss',
                playerId,
                spotId,
                playerName,
                reason: 'hit_bottom',
                depth
            }, playerId);
            
            // Broadcast fishing_end to dismiss spectator displays
            this.broadcastToRoom(room, {
                type: 'fishing_end',
                playerId,
                spotId
            });
        }
        
        // Cleanup session
        this.cleanupSession(sessionKey, session);
        
        console.log(`🎣 ${playerName} hit bottom at ${depth}ft - no catch`);
        
        return { success: true };
    }
    
    /**
     * Complete successful catch
     */
    async completeCatch(sessionKey, reactionBonus = 1.0) {
        try {
            const session = this.activeSessions.get(sessionKey);
            if (!session) return;
            
            const { fish, isDemo, isGuest, walletAddress, guestBalance } = session;
            
            // Calculate coins with bonus
            const baseCoins = fish.coins;
            const bonusCoins = Math.floor(baseCoins * reactionBonus);
            
            let newBalance = null;
            
            if (isDemo) {
                // Demo - no real coins
                newBalance = guestBalance || 0;
            } else if (isGuest) {
                // Guest with coins
                newBalance = (guestBalance || 0) + bonusCoins;
            } else if (walletAddress) {
                // Authenticated user - award coins
                try {
                    const awardResult = await this.userService.addCoins(
                        walletAddress,
                        bonusCoins,
                        'fishing_catch',
                        { fishId: fish.id, spotId: session.spotId },
                        `Caught ${fish.name}`
                    );
                    newBalance = awardResult?.newBalance;
                } catch (coinError) {
                    console.error('🎣 Error awarding fishing coins:', coinError);
                    newBalance = guestBalance || 0;
                }
            }
        
        // Send result to player
        if (this.sendToPlayer) {
            this.sendToPlayer(session.playerId, {
                type: 'fishing_result',
                spotId: session.spotId,
                success: true,
                fish: { id: fish.id, emoji: fish.emoji, name: fish.name },
                coins: isDemo ? 0 : bonusCoins,
                hypotheticalCoins: isDemo ? bonusCoins : 0,
                reactionBonus,
                newBalance,
                isDemo
            });
        }
        
        // Broadcast catch to spectators
        if (this.broadcastToRoom) {
            const room = session.room;
            const spotId = session.spotId;
            
            this.broadcastToRoom(room, {
                type: 'fishing_catch',
                playerId: session.playerId,
                spotId: spotId,
                playerName: session.playerName,
                fish: { id: fish.id, emoji: fish.emoji, name: fish.name },
                coins: isDemo ? 0 : bonusCoins,
                isDemo
            }, session.playerId); // Exclude fishing player
            
            // Schedule fishing_end broadcast to ensure all spectators dismiss their displays
            setTimeout(() => {
                if (this.broadcastToRoom) {
                    this.broadcastToRoom(room, {
                        type: 'fishing_end',
                        playerId: session.playerId,
                        spotId: spotId
                    });
                }
            }, 3500); // Slightly longer than RESULT_DISPLAY_TIME (3000ms)
        }
        
        // Cleanup session
        this.cleanupSession(sessionKey, session);
        
        console.log(`🎣 ${session.playerName} caught ${fish.emoji} ${fish.name} (+${bonusCoins}g)${isDemo ? ' [DEMO]' : ''}`);
        } catch (error) {
            console.error('🎣 Error in completeCatch:', error);
            // Try to cleanup the session even on error
            const session = this.activeSessions.get(sessionKey);
            if (session) {
                this.cleanupSession(sessionKey, session);
            }
        }
    }
    
    /**
     * Handle missed catch
     */
    handleMiss(sessionKey, reason = 'too_slow') {
        const session = this.activeSessions.get(sessionKey);
        if (!session || session.state !== 'bite') return;
        
        session.state = 'missed';
        
        // Send miss to player
        if (this.sendToPlayer) {
            this.sendToPlayer(session.playerId, {
                type: 'fishing_result',
                spotId: session.spotId,
                success: false,
                reason,
                fish: null,
                coins: 0
            });
        }
        
        // Broadcast miss to spectators
        if (this.broadcastToRoom) {
            this.broadcastToRoom(session.room, {
                type: 'fishing_miss',
                playerId: session.playerId,
                spotId: session.spotId,
                playerName: session.playerName,
                reason
            }, session.playerId);
        }
        
        console.log(`🎣 ${session.playerName} missed the catch (${reason})`);
        
        // Cleanup session
        this.cleanupSession(sessionKey, session);
    }
    
    /**
     * Player cancels fishing
     */
    cancelFishing(playerId, spotId, room) {
        const sessionKey = this.getSessionKey(playerId, spotId);
        const session = this.activeSessions.get(sessionKey);
        
        if (!session) return { error: 'NO_SESSION' };
        
        // Broadcast cancel
        if (this.broadcastToRoom) {
            this.broadcastToRoom(room, {
                type: 'fishing_cancel',
                playerId,
                spotId
            });
        }
        
        this.cleanupSession(sessionKey, session);
        
        return { success: true };
    }
    
    /**
     * Clean up a fishing session
     */
    cleanupSession(sessionKey, session) {
        // Clear timers
        const biteTimer = this.biteTimers.get(sessionKey);
        if (biteTimer) {
            clearTimeout(biteTimer);
            this.biteTimers.delete(sessionKey);
        }
        
        const catchTimer = this.catchTimers.get(sessionKey);
        if (catchTimer) {
            clearTimeout(catchTimer);
            this.catchTimers.delete(sessionKey);
        }
        
        // Clear states
        this.activeSessions.delete(sessionKey);
        if (session) {
            this.spotStates.delete(session.spotKey);
        }
    }
    
    /**
     * Handle player disconnect
     */
    handleDisconnect(playerId) {
        // Find all sessions for this player
        const toRemove = [];
        for (const [sessionKey, session] of this.activeSessions) {
            if (session.playerId === playerId) {
                toRemove.push({ sessionKey, session });
            }
        }
        
        // Remove each session
        for (const { sessionKey, session } of toRemove) {
            if (this.broadcastToRoom && session.room) {
                this.broadcastToRoom(session.room, {
                    type: 'fishing_cancel',
                    playerId,
                    spotId: session.spotId
                });
            }
            this.cleanupSession(sessionKey, session);
        }
    }
    
    /**
     * Get active fishing state for a room (for players joining)
     */
    getActiveFishing(room) {
        const active = [];
        
        for (const [sessionKey, session] of this.activeSessions) {
            if (session.room === room) {
                active.push({
                    playerId: session.playerId,
                    spotId: session.spotId,
                    playerName: session.playerName,
                    state: session.state,
                    isDemo: session.isDemo
                });
            }
        }
        
        return active;
    }
    
    /**
     * Check if a spot is in use
     */
    isSpotInUse(room, spotId) {
        const spotKey = this.getSpotKey(room, spotId);
        return this.spotStates.has(spotKey);
    }
    
    /**
     * Get fishing info for UI
     */
    static getFishingInfo() {
        return {
            cost: FISHING_COST,
            catchWindow: CATCH_WINDOW,
            minWait: MIN_BITE_TIME / 1000,
            maxWait: MAX_BITE_TIME / 1000,
            fish: FISH_TYPES.map(f => ({
                id: f.id,
                emoji: f.emoji,
                name: f.name,
                coins: f.coins,
                probability: ((f.weight / TOTAL_FISH_WEIGHT) * 100).toFixed(1) + '%'
            }))
        };
    }
}

export default FishingService;
export { FISH_TYPES, FISHING_COST, CATCH_WINDOW };

