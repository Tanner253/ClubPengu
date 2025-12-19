/**
 * IceFishingSystem - Simple catch bubble display above players
 * 
 * When a player catches a fish, shows a small bubble above them
 * so nearby players can see what was caught.
 * 
 * No spectator feed, no live game updates - just catch notifications.
 */

const INTERACTION_RADIUS = 3;
const BUBBLE_DISPLAY_TIME = 4000; // Show catch bubble for 4 seconds
const BUBBLE_HEIGHT_ABOVE_PLAYER = 4;

class IceFishingSystem {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        this.fishingSpots = [];
        this.catchBubbles = new Map(); // playerId -> bubble data
        this.nearbySpot = null;
        this.localFishingSpot = null;
        this.playerPosition = { x: 0, z: 0 };
        this.playersRef = null; // Reference to players data for positioning bubbles
    }
    
    /**
     * Set reference to players data for positioning bubbles above players
     */
    setPlayersRef(playersRef) {
        this.playersRef = playersRef;
    }
    
    /**
     * Initialize fishing spots for the town
     */
    initForTown(spots, scene) {
        if (scene) {
            this.scene = scene;
        }
        
        this.cleanup();
        this.fishingSpots = spots.map((spot, idx) => ({
            id: spot.id || `fishing_${idx}`,
            x: spot.x,
            z: spot.z,
            rotation: spot.rotation || 0
        }));
    }
    
    /**
     * Update player position for interaction checking
     */
    setPlayerPosition(x, z) {
        this.playerPosition.x = x;
        this.playerPosition.z = z;
    }
    
    /**
     * Check if player is near a fishing spot
     */
    checkInteraction(playerX, playerZ, playerCoins, isAuthenticated) {
        let nearestSpot = null;
        let nearestDist = Infinity;
        
        for (const spot of this.fishingSpots) {
            const dx = playerX - spot.x;
            const dz = playerZ - spot.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < INTERACTION_RADIUS && dist < nearestDist) {
                nearestDist = dist;
                nearestSpot = spot;
            }
        }
        
        this.nearbySpot = nearestSpot;
        if (!nearestSpot) return null;
        
        const isLocalFishing = this.localFishingSpot === nearestSpot.id;
        
        const FISHING_COST = 5;
        let prompt = `Press E to Fish - Bait: ${FISHING_COST}g`;
        let canFish = true;
        let reason = null;
        let isDemo = false;
        
        if (isLocalFishing) {
            prompt = '🎣 Fishing...';
            canFish = false;
            reason = 'ALREADY_FISHING';
        } else if (!isAuthenticated) {
            prompt = '🎣 FREE DEMO! Press E to fish';
            canFish = true;
            isDemo = true;
        } else if (playerCoins < FISHING_COST) {
            prompt = `Need ${FISHING_COST}g bait (you have ${playerCoins}g)`;
            canFish = false;
            reason = 'INSUFFICIENT_FUNDS';
        }
        
        return { 
            spot: nearestSpot, 
            prompt, 
            canFish, 
            reason, 
            cost: isDemo ? 0 : FISHING_COST, 
            isDemo,
            isLocalFishing
        };
    }
    
    /**
     * Mark that local player started fishing (to show "Fishing..." prompt)
     */
    startLocalFishing(spotId) {
        this.localFishingSpot = spotId;
    }
    
    /**
     * Mark that local player stopped fishing
     */
    stopLocalFishing() {
        this.localFishingSpot = null;
    }
    
    /**
     * Show catch bubble above a player
     */
    showCatchBubble(playerId, playerName, fish, coins, isDemo = false, isStung = false) {
        // Remove existing bubble for this player
        this.dismissCatchBubble(playerId);
        
        if (!this.scene) {
            console.warn('🎣 IceFishingSystem: No scene reference');
            return;
        }
        
        const THREE = this.THREE;
        
        // Create canvas for bubble
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        
        // Draw bubble background
        ctx.fillStyle = isStung ? 'rgba(255, 100, 150, 0.95)' : 'rgba(40, 120, 80, 0.95)';
        ctx.beginPath();
        ctx.roundRect(10, 10, 180, 100, 12);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = isStung ? '#FF88CC' : '#66FF99';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Fish emoji
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(fish?.emoji || '🐟', 100, 55);
        
        // Fish name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(fish?.name || 'Fish', 100, 80);
        
        // Coins (if not demo)
        if (!isDemo && coins > 0) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(`+${coins}g 🪙`, 100, 98);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(3, 1.8, 1);
        sprite.renderOrder = 10000;
        
        this.scene.add(sprite);
        
        const bubble = {
            sprite,
            canvas,
            texture,
            material,
            playerId,
            playerName,
            createdAt: Date.now()
        };
        
        this.catchBubbles.set(playerId, bubble);
        
        // Auto-dismiss after timeout
        bubble.dismissTimeout = setTimeout(() => {
            this.dismissCatchBubble(playerId);
        }, BUBBLE_DISPLAY_TIME);
        
        const action = isStung ? 'STUNG by' : 'caught';
        console.log(`🎣 Showing catch bubble: ${playerName} ${action} ${fish?.emoji} ${fish?.name}`);
    }
    
    /**
     * Dismiss catch bubble for a player
     */
    dismissCatchBubble(playerId) {
        const bubble = this.catchBubbles.get(playerId);
        if (!bubble) return;
        
        if (bubble.dismissTimeout) {
            clearTimeout(bubble.dismissTimeout);
        }
        
        if (bubble.sprite) {
            this.scene?.remove(bubble.sprite);
            bubble.material?.dispose();
            bubble.texture?.dispose();
        }
        
        this.catchBubbles.delete(playerId);
    }
    
    /**
     * Update bubble positions to follow players
     */
    update(deltaTime) {
        if (!this.playersRef) return;
        
        const players = this.playersRef();
        if (!players) return;
        
        for (const [playerId, bubble] of this.catchBubbles) {
            const player = players.get(playerId);
            if (player && bubble.sprite) {
                bubble.sprite.position.set(
                    player.x,
                    BUBBLE_HEIGHT_ABOVE_PLAYER,
                    player.z
                );
            }
        }
    }
    
    /**
     * Clean up all resources
     */
    cleanup() {
        for (const [playerId, bubble] of this.catchBubbles) {
            if (bubble.dismissTimeout) {
                clearTimeout(bubble.dismissTimeout);
            }
            if (bubble.sprite) {
                this.scene?.remove(bubble.sprite);
                bubble.material?.dispose();
                bubble.texture?.dispose();
            }
        }
        this.catchBubbles.clear();
        this.fishingSpots = [];
        this.nearbySpot = null;
        this.localFishingSpot = null;
    }
}

// Constants for external use
const FISHING_COST = 5;

export default IceFishingSystem;
export { FISHING_COST };
