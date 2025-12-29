/**
 * MultiplayerSync - Manages other player meshes, interpolation, and sync
 * Extracted from VoxelWorld.jsx for modularity
 */

// Emotes that don't auto-end (continuous/looping)
const CONTINUOUS_EMOTES = ['Sit', 'Breakdance', 'DJ', '67', 'Headbang', 'Dance'];

// Cosmetics that need per-frame animation
const ANIMATED_COSMETICS = {
    hats: ['propeller', 'flamingCrown', 'wizardHat'],
    mouths: ['cigarette', 'pipe', 'cigar', 'fireBreath', 'iceBreath', 'bubblegum'],
    eyes: ['laser', 'fire'],
    bodyItems: ['angelWings', 'demonWings', 'fireAura', 'lightningAura']
};

/**
 * Check if appearance has animated cosmetics
 * @param {Object} appearance - Player appearance data
 * @returns {boolean}
 */
export function hasAnimatedCosmetics(appearance) {
    if (!appearance) return false;
    
    return ANIMATED_COSMETICS.hats.includes(appearance.hat) ||
           ANIMATED_COSMETICS.mouths.includes(appearance.mouth) ||
           ANIMATED_COSMETICS.eyes.includes(appearance.eyes) ||
           ANIMATED_COSMETICS.bodyItems.includes(appearance.bodyItem);
}

/**
 * Interpolate between current and target position
 * @param {number} current - Current value
 * @param {number} target - Target value
 * @param {number} factor - Lerp factor (0-1)
 * @returns {number}
 */
export function lerp(current, target, factor) {
    return current + (target - current) * factor;
}

/**
 * Interpolate rotation with wraparound
 * @param {number} current - Current rotation (radians)
 * @param {number} target - Target rotation (radians)
 * @param {number} factor - Lerp factor (0-1)
 * @returns {number}
 */
export function lerpRotation(current, target, factor) {
    let diff = target - current;
    // Normalize to [-PI, PI]
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * factor;
}

/**
 * Calculate lerp factor based on delta time
 * @param {number} delta - Time since last frame (seconds)
 * @param {number} speed - Interpolation speed (higher = faster)
 * @returns {number}
 */
export function calculateLerpFactor(delta, speed = 10) {
    return Math.min(1, delta * speed);
}

class MultiplayerSync {
    constructor(options = {}) {
        this.THREE = options.THREE || window.THREE;
        this.scene = options.scene;
        this.playerMeshes = new Map(); // playerId -> { mesh, bubble, puffleMesh, nameSprite, ... }
        this.buildPenguinMesh = options.buildPenguinMesh;
        this.buildPuffleMesh = options.buildPuffleMesh;
        this.createNameSprite = options.createNameSprite;
        this.createChatBubble = options.createChatBubble;
        this.animateMesh = options.animateMesh;
        this.nameHeight = {
            penguin: options.nameHeightPenguin || 5,
            marcus: options.nameHeightMarcus || 6,
            whiteWhale: options.nameHeightWhale || 5.8
        };
    }

    /**
     * Set callbacks/functions after construction
     */
    setCallbacks(callbacks) {
        if (callbacks.buildPenguinMesh) this.buildPenguinMesh = callbacks.buildPenguinMesh;
        if (callbacks.buildPuffleMesh) this.buildPuffleMesh = callbacks.buildPuffleMesh;
        if (callbacks.createNameSprite) this.createNameSprite = callbacks.createNameSprite;
        if (callbacks.createChatBubble) this.createChatBubble = callbacks.createChatBubble;
        if (callbacks.animateMesh) this.animateMesh = callbacks.animateMesh;
    }

    /**
     * Set scene reference
     */
    setScene(scene) {
        this.scene = scene;
    }

    /**
     * Sync player list - create meshes for new players, remove for departed
     * @param {Array<string>} playerList - Array of player IDs
     * @param {Map} playersData - Map of playerId -> playerData
     */
    syncPlayerList(playerList, playersData) {
        if (!this.scene || !this.buildPenguinMesh) return;
        
        const currentPlayerIds = new Set(playerList);
        
        // Remove meshes for players who left
        for (const [id, data] of this.playerMeshes) {
            if (!currentPlayerIds.has(id)) {
                this.removePlayer(id);
            }
        }
        
        // Create meshes for new players
        for (const id of playerList) {
            if (this.playerMeshes.has(id)) continue;
            
            const playerData = playersData.get(id);
            if (!playerData || !playerData.appearance) continue;
            
            this.addPlayer(id, playerData);
        }
    }

    /**
     * Add a new player mesh
     * @param {string} id - Player ID
     * @param {Object} playerData - Player data from server
     */
    addPlayer(id, playerData) {
        if (!this.scene || !this.buildPenguinMesh) return null;
        
        console.log(`🐧 Creating mesh for ${playerData.name}`);
        
        const mesh = this.buildPenguinMesh(playerData.appearance);
        mesh.position.set(
            playerData.position?.x || 0,
            0,
            playerData.position?.z || 0
        );
        mesh.rotation.y = playerData.rotation || 0;
        this.scene.add(mesh);
        
        // Create name tag
        let nameSprite = null;
        if (this.createNameSprite) {
            nameSprite = this.createNameSprite(playerData.name || 'Player');
            if (nameSprite) {
                const charType = playerData.appearance?.characterType;
                const height = charType === 'marcus' 
                    ? this.nameHeight.marcus 
                    : charType?.includes('Whale')
                        ? this.nameHeight.whiteWhale
                    : this.nameHeight.penguin;
                nameSprite.position.set(0, height, 0);
                mesh.add(nameSprite);
            }
        }
        
        // Create puffle if player has one
        let puffleMesh = null;
        if (playerData.puffle && this.buildPuffleMesh) {
            puffleMesh = this.buildPuffleMesh(playerData.puffle);
            const pufflePos = playerData.pufflePosition || {
                x: (playerData.position?.x || 0) + 1.5,
                z: (playerData.position?.z || 0) + 1.5
            };
            puffleMesh.position.set(pufflePos.x, 0.5, pufflePos.z);
            this.scene.add(puffleMesh);
        }
        
        const meshData = {
            mesh,
            bubble: null,
            puffleMesh,
            nameSprite,
            currentEmote: playerData.emote || null,
            emoteStartTime: playerData.emoteStartTime || Date.now(),
            hasAnimatedCosmetics: hasAnimatedCosmetics(playerData.appearance)
        };
        
        this.playerMeshes.set(id, meshData);
        playerData.needsMesh = false;
        
        return meshData;
    }

    /**
     * Remove a player mesh
     * @param {string} id - Player ID
     */
    removePlayer(id) {
        const data = this.playerMeshes.get(id);
        if (!data) return;
        
        if (data.mesh) this.scene.remove(data.mesh);
        if (data.bubble) this.scene.remove(data.bubble);
        if (data.puffleMesh) this.scene.remove(data.puffleMesh);
        
        this.playerMeshes.delete(id);
    }

    /**
     * Update all player positions and animations
     * @param {Map} playersData - Map of playerId -> playerData
     * @param {number} delta - Time since last frame
     * @param {number} time - Total elapsed time
     */
    update(playersData, delta, time) {
        const lerpFactor = calculateLerpFactor(delta, 10);
        const yLerpFactor = calculateLerpFactor(delta, 15);
        
        for (const [id, meshData] of this.playerMeshes) {
            const playerData = playersData.get(id);
            if (!playerData || !meshData.mesh) continue;
            
            // Check if player is seated - if so, DON'T interpolate position
            // This fixes the bug where seated players appear to teleport to corners
            const isSeated = playerData.seatedOnFurniture || 
                            (meshData.currentEmote === 'Sit' && playerData.emote === 'Sit');
            
            // Position interpolation (skip if seated to prevent jitter/teleport)
            if (playerData.position && !isSeated) {
                meshData.mesh.position.x = lerp(meshData.mesh.position.x, playerData.position.x, lerpFactor);
                meshData.mesh.position.z = lerp(meshData.mesh.position.z, playerData.position.z, lerpFactor);
                meshData.mesh.position.y = lerp(meshData.mesh.position.y, playerData.position.y ?? 0, yLerpFactor);
            }
            
            // Rotation interpolation (also skip if seated)
            if (playerData.rotation !== undefined && !isSeated) {
                meshData.mesh.rotation.y = lerpRotation(meshData.mesh.rotation.y, playerData.rotation, lerpFactor);
            }
            
            // Handle puffle updates
            this.updatePuffle(meshData, playerData, lerpFactor);
            
            // Handle emote sync
            this.updateEmote(meshData, playerData);
            
            // Animate mesh
            if (this.animateMesh) {
                const isMoving = playerData.position && (
                    Math.abs(playerData.position.x - meshData.mesh.position.x) > 0.1 ||
                    Math.abs(playerData.position.z - meshData.mesh.position.z) > 0.1
                );
                const otherPlayerMounted = !!(meshData.mesh.userData?.mount && meshData.mesh.userData?.mountData);
                const isAirborne = (playerData.position?.y ?? 0) > 0.1;
                
                this.animateMesh(
                    meshData.mesh, 
                    isMoving, 
                    meshData.currentEmote, 
                    meshData.emoteStartTime, 
                    playerData.seatedOnFurniture || false,
                    playerData.appearance?.characterType || 'penguin',
                    otherPlayerMounted,
                    isAirborne
                );
            }
        }
    }

    /**
     * Update puffle for a player
     */
    updatePuffle(meshData, playerData, lerpFactor) {
        // Handle puffle creation/removal
        if (playerData.needsPuffleUpdate) {
            playerData.needsPuffleUpdate = false;
            
            // Remove old puffle mesh
            if (meshData.puffleMesh) {
                this.scene.remove(meshData.puffleMesh);
                meshData.puffleMesh = null;
            }
            
            // Create new puffle if player has one
            if (playerData.puffle && this.buildPuffleMesh) {
                meshData.puffleMesh = this.buildPuffleMesh(playerData.puffle);
                const pufflePos = playerData.pufflePosition || {
                    x: (playerData.position?.x || 0) + 1.5,
                    z: (playerData.position?.z || 0) + 1.5
                };
                meshData.puffleMesh.position.set(pufflePos.x, 0.5, pufflePos.z);
                this.scene.add(meshData.puffleMesh);
            }
        }
        
        // Update puffle position
        if (meshData.puffleMesh) {
            const targetPufflePos = playerData.pufflePosition || {
                x: (playerData.position?.x || 0) + 1.5,
                z: (playerData.position?.z || 0) + 1.5
            };
            meshData.puffleMesh.position.x = lerp(meshData.puffleMesh.position.x, targetPufflePos.x, lerpFactor);
            meshData.puffleMesh.position.z = lerp(meshData.puffleMesh.position.z, targetPufflePos.z, lerpFactor);
            meshData.puffleMesh.position.y = 0.5;
        }
    }

    /**
     * Update emote state for a player
     */
    updateEmote(meshData, playerData) {
        // Sync emote with playerData
        if (playerData.emote !== meshData.currentEmote) {
            meshData.currentEmote = playerData.emote;
            meshData.emoteStartTime = playerData.emoteStartTime || Date.now();
        }
        
        // Auto-end non-continuous emotes after 3.5 seconds
        if (meshData.currentEmote && !CONTINUOUS_EMOTES.includes(meshData.currentEmote)) {
            const emoteAge = (Date.now() - meshData.emoteStartTime) / 1000;
            if (emoteAge > 3.5) {
                meshData.currentEmote = null;
                playerData.emote = null;
            }
        }
    }

    /**
     * Get mesh data for a player
     * @param {string} id - Player ID
     */
    getPlayerMesh(id) {
        return this.playerMeshes.get(id);
    }

    /**
     * Get all player meshes
     */
    getAllPlayerMeshes() {
        return this.playerMeshes;
    }

    /**
     * Check if a player exists
     * @param {string} id - Player ID
     */
    hasPlayer(id) {
        return this.playerMeshes.has(id);
    }

    /**
     * Get player count
     */
    getPlayerCount() {
        return this.playerMeshes.size;
    }

    /**
     * Update player appearance (rebuild mesh)
     * @param {string} id - Player ID
     * @param {Object} appearance - New appearance data
     */
    updatePlayerAppearance(id, appearance) {
        const meshData = this.playerMeshes.get(id);
        if (!meshData || !this.buildPenguinMesh) return;
        
        // Store current position/rotation
        const pos = meshData.mesh.position.clone();
        const rot = meshData.mesh.rotation.y;
        
        // Remove old mesh
        this.scene.remove(meshData.mesh);
        
        // Build new mesh
        const newMesh = this.buildPenguinMesh(appearance);
        newMesh.position.copy(pos);
        newMesh.rotation.y = rot;
        
        // Transfer name sprite
        if (meshData.nameSprite) {
            newMesh.add(meshData.nameSprite);
        }
        
        this.scene.add(newMesh);
        meshData.mesh = newMesh;
        meshData.hasAnimatedCosmetics = hasAnimatedCosmetics(appearance);
    }

    /**
     * Cleanup all player meshes
     */
    dispose() {
        for (const [id] of this.playerMeshes) {
            this.removePlayer(id);
        }
        this.playerMeshes.clear();
    }
}

export default MultiplayerSync;

