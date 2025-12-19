/**
 * IceFishingSystem - Simplified fishing spot management
 * 
 * Shows:
 * - Simple "🎣" indicator over hole when someone is fishing
 * - Catch results only (fish caught, coins earned) - broadcasted from server
 * 
 * No live game spectator view - just results.
 */

const INTERACTION_RADIUS = 3;
const BUBBLE_HEIGHT_ABOVE_HOLE = 4;
const RESULT_DISPLAY_TIME = 3000; // Show results for 3 seconds

class IceFishingSystem {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        this.fishingSpots = [];
        this.spotDisplays = new Map(); // spotId -> display data
        this.nearbySpot = null;
        this.localFishingSpot = null;
        this.playerPosition = { x: 0, z: 0 };
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
        
        const display = this.spotDisplays.get(nearestSpot.id);
        const spotInUse = display && display.state === 'fishing';
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
        } else if (spotInUse) {
            prompt = `${display.playerName || 'Someone'} is fishing...`;
            canFish = false;
            reason = 'SPOT_IN_USE';
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
            isLocalFishing,
            currentState: display?.state || 'idle'
        };
    }
    
    /**
     * Mark a spot as in-use (fishing started)
     */
    startFishing(spotId, playerName, isDemo = false) {
        const spot = this.fishingSpots.find(s => s.id === spotId);
        if (!spot) return;
        
        this.localFishingSpot = spotId;
        
        let display = this.spotDisplays.get(spotId);
        if (!display) {
            display = this.createSpotDisplay(spot);
            this.spotDisplays.set(spotId, display);
        }
        
        // Clear any existing timeout
        if (display.dismissTimeout) {
            clearTimeout(display.dismissTimeout);
            display.dismissTimeout = null;
        }
        
        // Mark as fishing (simple state)
        display.playerName = playerName;
        display.isDemo = isDemo;
        display.state = 'fishing';
        display.fish = null;
        display.coins = 0;
        display.sprite.visible = true;
        
        this.drawSpotDisplay(spotId);
    }
    
    /**
     * Handle remote player starting to fish
     */
    handleRemoteFishingStart(spotId, playerName, isDemo = false) {
        const spot = this.fishingSpots.find(s => s.id === spotId);
        if (!spot) return;
        
        let display = this.spotDisplays.get(spotId);
        if (!display) {
            display = this.createSpotDisplay(spot);
            this.spotDisplays.set(spotId, display);
        }
        
        // Clear any existing timeout
        if (display.dismissTimeout) {
            clearTimeout(display.dismissTimeout);
            display.dismissTimeout = null;
        }
        
        // Mark as fishing
        display.playerName = playerName;
        display.isDemo = isDemo;
        display.state = 'fishing';
        display.fish = null;
        display.coins = 0;
        display.sprite.visible = true;
        
        this.drawSpotDisplay(spotId);
    }
    
    /**
     * Show catch result (fish caught!) - ALL clients see this from server broadcast
     */
    completeFishing(spotId, fish, coins, playerName, isDemo = false, isStung = false, depth = 0) {
        let display = this.spotDisplays.get(spotId);
        if (!display) {
            const spot = this.fishingSpots.find(s => s.id === spotId);
            if (!spot) return;
            display = this.createSpotDisplay(spot);
            this.spotDisplays.set(spotId, display);
        }
        
        // Clear any existing timeout
        if (display.dismissTimeout) {
            clearTimeout(display.dismissTimeout);
            display.dismissTimeout = null;
        }
        
        display.state = isStung ? 'stung' : 'caught';
        display.fish = fish;
        display.coins = isDemo ? 0 : coins;
        display.isDemo = isDemo;
        display.catchDepth = depth;
        display.playerName = playerName || display.playerName;
        display.sprite.visible = true;
        
        this.drawSpotDisplay(spotId);
        
        const stateText = isStung ? 'STUNG by' : 'caught';
        console.log(`🎣 ${playerName} ${stateText} ${fish?.emoji} ${fish?.name} (type: ${fish?.type || 'unknown'}) +${coins}g at ${depth}m`);
        
        // Auto-dismiss after showing result
        display.dismissTimeout = setTimeout(() => {
            this.dismissSpectatorDisplay(spotId);
        }, RESULT_DISPLAY_TIME);
    }
    
    /**
     * Dismiss display immediately
     */
    dismissSpectatorDisplay(spotId) {
        const display = this.spotDisplays.get(spotId);
        if (!display) return;
        
        if (display.dismissTimeout) {
            clearTimeout(display.dismissTimeout);
            display.dismissTimeout = null;
        }
        
        display.state = 'idle';
        display.sprite.visible = false;
        
        if (this.localFishingSpot === spotId) {
            this.localFishingSpot = null;
        }
    }
    
    /**
     * Create display sprite above fishing spot
     */
    createSpotDisplay(spot) {
        const THREE = this.THREE;
        
        if (!this.scene) {
            console.warn('🎣 IceFishingSystem: No scene reference');
            return null;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = 280;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(4.5, 5, 1);
        sprite.renderOrder = 10000;
        sprite.visible = false;
        sprite.position.set(spot.x, BUBBLE_HEIGHT_ABOVE_HOLE, spot.z);
        
        this.scene.add(sprite);
        
        return {
            sprite, canvas, ctx, texture, material,
            spotId: spot.id,
            spotX: spot.x,
            spotZ: spot.z,
            playerName: '',
            isDemo: false,
            state: 'idle', // idle, fishing, caught, stung
            fish: null,
            coins: 0,
            catchDepth: 0,
            dismissTimeout: null
        };
    }
    
    /**
     * Draw the display content
     */
    drawSpotDisplay(spotId) {
        const display = this.spotDisplays.get(spotId);
        if (!display || !display.ctx) return;
        
        const { ctx, canvas, texture, state } = display;
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        
        if (state === 'fishing') {
            this.drawFishingIndicator(ctx, display, w, h);
        } else if (state === 'caught') {
            this.drawCaughtState(ctx, display, w, h);
        } else if (state === 'stung') {
            this.drawStungState(ctx, display, w, h);
        }
        
        texture.needsUpdate = true;
    }
    
    /**
     * Draw simple "fishing in progress" indicator
     */
    drawFishingIndicator(ctx, display, w, h) {
        const { playerName, isDemo } = display;
        
        // Small bubble
        ctx.fillStyle = 'rgba(10, 30, 60, 0.9)';
        ctx.beginPath();
        ctx.roundRect(w/2 - 80, h/2 - 40, 160, 80, 12);
        ctx.fill();
        
        ctx.strokeStyle = '#4488FF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Fishing emoji
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎣', w/2, h/2 - 5);
        
        // Player name with animated dots
        const dots = '.'.repeat(Math.floor(Date.now() / 400) % 4);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`${playerName || 'Fishing'}${dots}`, w/2, h/2 + 25);
        
        if (isDemo) {
            ctx.fillStyle = '#44FF44';
            ctx.font = '9px Arial';
            ctx.fillText('DEMO', w/2, h/2 + 38);
        }
    }
    
    /**
     * Draw catch result
     */
    drawCaughtState(ctx, display, w, h) {
        const { fish, coins, playerName, isDemo, catchDepth } = display;
        
        // Background
        ctx.fillStyle = 'rgba(10, 30, 60, 0.92)';
        ctx.beginPath();
        ctx.roundRect(10, 10, w - 20, h - 20, 16);
        ctx.fill();
        
        // Green border
        ctx.strokeStyle = '#44FF44';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Success glow
        const glowGradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 120);
        glowGradient.addColorStop(0, 'rgba(68, 255, 68, 0.2)');
        glowGradient.addColorStop(1, 'rgba(68, 255, 68, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(10, 10, w - 20, h - 20);
        
        // Player name
        ctx.fillStyle = '#88CCFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(playerName || 'Fisher', w/2, 45);
        
        // CAUGHT header
        ctx.fillStyle = '#44FF44';
        ctx.font = 'bold 26px Arial';
        ctx.fillText('🎣 CAUGHT!', w/2, 85);
        
        if (fish) {
            // Fish emoji
            ctx.font = '56px Arial';
            ctx.fillText(fish.emoji || '🐟', w/2, 160);
            
            // Fish name
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(fish.name || 'Fish', w/2, 200);
            
            // Depth
            if (catchDepth > 0) {
                const depthStr = catchDepth >= 1000 ? `${(catchDepth/1000).toFixed(1)}km` : `${Math.floor(catchDepth)}m`;
                ctx.fillStyle = '#88CCFF';
                ctx.font = '14px Arial';
                ctx.fillText(`at ${depthStr} deep`, w/2, 225);
            }
            
            // Coins reward
            if (!isDemo && coins > 0) {
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 24px Arial';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 10;
                ctx.fillText(`+${coins}g 🪙`, w/2, 270);
                ctx.shadowBlur = 0;
            } else if (isDemo) {
                ctx.fillStyle = '#88AACC';
                ctx.font = '12px Arial';
                ctx.fillText('Demo - Connect wallet to earn!', w/2, 270);
            }
        }
    }
    
    /**
     * Draw jellyfish sting result
     */
    drawStungState(ctx, display, w, h) {
        const { fish, coins, playerName, isDemo, catchDepth } = display;
        
        // Background
        ctx.fillStyle = 'rgba(10, 30, 60, 0.92)';
        ctx.beginPath();
        ctx.roundRect(10, 10, w - 20, h - 20, 16);
        ctx.fill();
        
        // Pink border
        ctx.strokeStyle = '#FF88CC';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Sting glow
        const glowGradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 120);
        glowGradient.addColorStop(0, 'rgba(255, 100, 180, 0.2)');
        glowGradient.addColorStop(1, 'rgba(255, 100, 180, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(10, 10, w - 20, h - 20);
        
        // Player name
        ctx.fillStyle = '#FF88CC';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(playerName || 'Fisher', w/2, 45);
        
        // STUNG header
        ctx.fillStyle = '#FF88CC';
        ctx.font = 'bold 26px Arial';
        ctx.fillText('⚡ STUNG!', w/2, 85);
        
        if (fish) {
            // Fish emoji
            ctx.font = '56px Arial';
            ctx.fillText(fish.emoji || '🪼', w/2, 160);
            
            // Fish name
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(fish.name || 'Jellyfish', w/2, 200);
            
            // Depth
            if (catchDepth > 0) {
                const depthStr = catchDepth >= 1000 ? `${(catchDepth/1000).toFixed(1)}km` : `${Math.floor(catchDepth)}m`;
                ctx.fillStyle = '#FF88AA';
                ctx.font = '14px Arial';
                ctx.fillText(`at ${depthStr} deep`, w/2, 225);
            }
            
            // Coins
            if (!isDemo && coins > 0) {
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 24px Arial';
                ctx.fillText(`+${coins}g 🪙`, w/2, 270);
            } else if (isDemo) {
                ctx.fillStyle = '#88AACC';
                ctx.font = '12px Arial';
                ctx.fillText('Demo - Connect wallet to earn!', w/2, 270);
            }
        }
    }
    
    /**
     * Animation update - redraw fishing indicators for animation
     */
    update(deltaTime) {
        for (const [spotId, display] of this.spotDisplays) {
            if (display.state === 'fishing') {
                this.drawSpotDisplay(spotId);
            }
        }
    }
    
    /**
     * Clean up all resources
     */
    cleanup() {
        for (const [spotId, display] of this.spotDisplays) {
            if (display.dismissTimeout) {
                clearTimeout(display.dismissTimeout);
            }
            if (display.sprite) {
                this.scene?.remove(display.sprite);
                display.material?.dispose();
                display.texture?.dispose();
            }
        }
        this.spotDisplays.clear();
        this.fishingSpots = [];
        this.nearbySpot = null;
        this.localFishingSpot = null;
    }
}

const FISHING_COST = 5;

const FISH_TYPES = [
    { id: 'gray_fish', emoji: '🐟', name: 'Gray Fish', coins: 5 },
    { id: 'yellow_fish', emoji: '🐠', name: 'Yellow Fish', coins: 15 },
    { id: 'blue_fish', emoji: '🐟', name: 'Blue Fish', coins: 30 },
    { id: 'orange_fish', emoji: '🐠', name: 'Orange Fish', coins: 50 },
    { id: 'golden_fish', emoji: '✨', name: 'Golden Fish', coins: 100 },
    { id: 'rainbow_fish', emoji: '🌈', name: 'Rainbow Fish', coins: 200 },
    { id: 'mullet', emoji: '🦈', name: 'The Mullet', coins: 500 }
];

export default IceFishingSystem;
export { FISH_TYPES, FISHING_COST };
