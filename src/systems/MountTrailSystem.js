/**
 * MountTrailSystem - Manages ground trails left by mounts
 * 
 * Features:
 * - Configurable trail types per mount (icy, fire, etc.)
 * - Visual particle/decal rendering
 * - Status effects when players walk on trails
 * - Server-synchronized for multiplayer
 * - Trails fade over time
 * 
 * Design: OOP with extensible trail types
 */

// Trail type configurations
const TRAIL_TYPES = {
    icy: {
        color: 0x87CEEB,          // Icy light blue (sky blue)
        emissive: 0xADD8E6,       // Light blue glow
        opacity: 1.0,             // Fully opaque
        fadeTime: 8000,           // 8 seconds to fully fade
        particleSize: 0.8,
        spawnInterval: 50,        // ms between trail points (smoother trail)
        effect: null,             // Visual only - no status effect
    },
    fire: {
        color: 0xFF4500,
        emissive: 0xFF6600,
        opacity: 0.8,
        fadeTime: 5000,
        particleSize: 0.6,
        spawnInterval: 80,
        effect: {
            type: 'fire',
            damagePerSecond: 5,
            duration: 300,
        }
    },
    sparkle: {
        color: 0xFFD700,
        emissive: 0xFFFF00,
        opacity: 0.6,
        fadeTime: 3000,
        particleSize: 0.4,
        spawnInterval: 50,
        effect: null, // Visual only, no status effect
    }
};

/**
 * Individual trail point with position, age, and visual mesh
 * 
 * PERFORMANCE OPTIMIZED:
 * - Uses shared geometry from MountTrailSystem (one per trail type)
 * - Clones material only for individual opacity control
 */
class TrailPoint {
    constructor(x, z, trailType, timestamp, THREE) {
        this.x = x;
        this.z = z;
        this.trailType = trailType;
        this.createdAt = timestamp;
        this.config = TRAIL_TYPES[trailType];
        this.mesh = null;
        this.THREE = THREE;
        this.tailFadeMultiplier = 1.0; // For end-of-trail fade effect
    }
    
    /**
     * Create the visual mesh for this trail point using shared geometry
     * @param {THREE.Scene} scene 
     * @param {THREE.BufferGeometry} sharedGeometry - Shared geometry from MountTrailSystem
     * @param {THREE.Material} baseMaterial - Base material to clone from MountTrailSystem
     */
    createMesh(scene, sharedGeometry, baseMaterial) {
        const THREE = this.THREE;
        
        // OPTIMIZATION: Clone only the material for individual opacity, reuse geometry
        const material = baseMaterial.clone();
        material.opacity = this.config.opacity;
        
        this.mesh = new THREE.Mesh(sharedGeometry, material);
        this.mesh.rotation.x = -Math.PI / 2; // Lay flat on ground
        this.mesh.position.set(this.x, 0.1, this.z); // Higher above ground to avoid z-fighting with textured surfaces
        this.mesh.renderOrder = 5; // Higher render order to ensure it draws on top
        
        scene.add(this.mesh);
        return this.mesh;
    }
    
    /**
     * Update trail point (fade effect)
     * @param {number} currentTime 
     * @returns {boolean} true if should be removed
     */
    update(currentTime) {
        const age = currentTime - this.createdAt;
        const fadeProgress = age / this.config.fadeTime;
        
        // Check if fully faded (either from age or tail fade)
        if (fadeProgress >= 1 || this.tailFadeMultiplier <= 0) {
            return true; // Should be removed
        }
        
        // Fade out opacity (combine age fade with tail fade)
        if (this.mesh && this.mesh.material) {
            this.mesh.material.opacity = this.config.opacity * (1 - fadeProgress) * this.tailFadeMultiplier;
        }
        
        return false;
    }
    
    /**
     * Apply tail fade effect (for smooth end-of-trail cleanup)
     * @param {number} fadeAmount - Amount to reduce tailFadeMultiplier
     */
    applyTailFade(fadeAmount) {
        this.tailFadeMultiplier = Math.max(0, this.tailFadeMultiplier - fadeAmount);
    }
    
    /**
     * Check if a position is within this trail point's effect radius
     * @param {number} px - Player X
     * @param {number} pz - Player Z
     * @returns {boolean}
     */
    containsPoint(px, pz) {
        const dx = px - this.x;
        const dz = pz - this.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        return dist < this.config.particleSize * 1.2;
    }
    
    /**
     * Clean up mesh from scene (only dispose cloned material, not shared geometry)
     * @param {THREE.Scene} scene 
     */
    dispose(scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
            // Only dispose material - geometry is shared
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}

/**
 * MountTrailSystem - Main system class
 * 
 * PERFORMANCE OPTIMIZED:
 * - Shared geometry per trail type (instead of new geometry per point)
 * - Base materials cached per trail type (cloned for individual opacity)
 */
class MountTrailSystem {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        
        // Trail points organized by owner ID (playerId or 'local')
        this.trails = new Map(); // Map<ownerId, TrailPoint[]>
        
        // Last spawn time per owner (for spawn interval)
        this.lastSpawnTime = new Map();
        
        // Tail fade tracking - when spawning stops, we fade the end of the trail
        this.tailFadeDelay = 200; // ms after last spawn before tail fade starts
        this.tailFadeSpeed = 0.08; // How fast the tail fades per frame
        
        // Active status effects on local player
        this.activeEffects = new Map(); // Map<effectType, { expiresAt, config }>
        
        // Server sync buffer (pending trails to send)
        this.pendingSync = [];
        
        // Configuration
        this.maxTrailPointsPerPlayer = 150; // Enough points for full 8 second trail
        this.enabled = true;
        
        // OPTIMIZATION: Shared geometry cache per trail type
        this.geometryCache = new Map();
        
        // OPTIMIZATION: Base material cache per trail type
        this.materialCache = new Map();
        
        // Pre-create shared resources for known trail types
        this._initSharedResources();
    }
    
    /**
     * Initialize shared geometry and materials for all trail types
     * @private
     */
    _initSharedResources() {
        const THREE = this.THREE;
        
        for (const [typeName, config] of Object.entries(TRAIL_TYPES)) {
            // Shared geometry per trail type
            const geometry = new THREE.CircleGeometry(config.particleSize, 12);
            this.geometryCache.set(typeName, geometry);
            
            // Base material per trail type (will be cloned per point)
            const material = new THREE.MeshBasicMaterial({
                color: config.color,
                transparent: true,
                opacity: config.opacity,
                side: THREE.DoubleSide,
                depthWrite: false,
                depthTest: true,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1,
            });
            this.materialCache.set(typeName, material);
        }
    }
    
    /**
     * Get shared geometry for a trail type
     * @param {string} trailType 
     * @returns {THREE.BufferGeometry}
     */
    getSharedGeometry(trailType) {
        return this.geometryCache.get(trailType);
    }
    
    /**
     * Get base material for a trail type
     * @param {string} trailType 
     * @returns {THREE.Material}
     */
    getBaseMaterial(trailType) {
        return this.materialCache.get(trailType);
    }
    
    /**
     * Get trail type for a mount
     * @param {string} mountName 
     * @returns {string|null} Trail type name or null
     */
    static getTrailTypeForMount(mountName) {
        const mountTrails = {
            'penguMount': 'icy',
            'minecraftBoat': null,  // No trail
            // Future mounts can be added here
        };
        return mountTrails[mountName] ?? null;
    }
    
    /**
     * Check if a mount has a trail
     * @param {string} mountName 
     * @returns {boolean}
     */
    static mountHasTrail(mountName) {
        return MountTrailSystem.getTrailTypeForMount(mountName) !== null;
    }
    
    /**
     * Spawn a trail point at position
     * @param {string} ownerId - Player ID or 'local'
     * @param {number} x 
     * @param {number} z 
     * @param {string} trailType 
     * @param {number} timestamp 
     * @param {boolean} fromServer - Whether this came from server (don't re-sync)
     */
    spawnTrailPoint(ownerId, x, z, trailType, timestamp = Date.now(), fromServer = false) {
        if (!this.enabled || !TRAIL_TYPES[trailType]) return;
        
        const config = TRAIL_TYPES[trailType];
        const lastSpawn = this.lastSpawnTime.get(ownerId) || 0;
        
        // Check spawn interval (skip for server-received trails)
        if (!fromServer && timestamp - lastSpawn < config.spawnInterval) {
            return;
        }
        
        this.lastSpawnTime.set(ownerId, timestamp);
        
        // Create trail point with SHARED geometry and base material
        const point = new TrailPoint(x, z, trailType, timestamp, this.THREE);
        const sharedGeometry = this.getSharedGeometry(trailType);
        const baseMaterial = this.getBaseMaterial(trailType);
        point.createMesh(this.scene, sharedGeometry, baseMaterial);
        
        // Add to trails map
        if (!this.trails.has(ownerId)) {
            this.trails.set(ownerId, []);
        }
        const ownerTrails = this.trails.get(ownerId);
        ownerTrails.push(point);
        
        // Limit trail points per player
        while (ownerTrails.length > this.maxTrailPointsPerPlayer) {
            const oldest = ownerTrails.shift();
            oldest.dispose(this.scene);
        }
        
        // Queue for server sync (only local trails)
        if (!fromServer && ownerId === 'local') {
            this.pendingSync.push({ x, z, trailType, timestamp });
        }
    }
    
    /**
     * Update from mounted player position
     * Called each frame when player is on a mount with a trail
     * @param {string} ownerId 
     * @param {number} x 
     * @param {number} z 
     * @param {string} mountName 
     * @param {boolean} isMoving 
     */
    updateFromMount(ownerId, x, z, mountName, isMoving) {
        if (!isMoving) return;
        
        const trailType = MountTrailSystem.getTrailTypeForMount(mountName);
        if (!trailType) return;
        
        this.spawnTrailPoint(ownerId, x, z, trailType);
    }
    
    /**
     * Main update loop - fade trails and check status effects
     * @param {number} currentTime 
     * @param {Object} playerPos - { x, z } local player position
     */
    update(currentTime, playerPos) {
        // Update all trail points (fade and remove expired)
        for (const [ownerId, points] of this.trails) {
            const lastSpawn = this.lastSpawnTime.get(ownerId) || 0;
            const timeSinceLastSpawn = currentTime - lastSpawn;
            
            // Check if we should start tail fade (spawning has stopped)
            if (timeSinceLastSpawn > this.tailFadeDelay && points.length > 0) {
                // Apply tail fade to the newest points (end of trail)
                // Fade from the end backwards, creating a smooth disappearing tail
                const fadeCount = Math.min(points.length, 20); // Fade last 20 points max
                for (let i = 0; i < fadeCount; i++) {
                    const pointIndex = points.length - 1 - i;
                    if (pointIndex >= 0) {
                        // Points closer to the end fade faster
                        const fadeIntensity = this.tailFadeSpeed * (1 - (i / fadeCount) * 0.7);
                        points[pointIndex].applyTailFade(fadeIntensity);
                    }
                }
            }
            
            for (let i = points.length - 1; i >= 0; i--) {
                const point = points[i];
                const shouldRemove = point.update(currentTime);
                
                if (shouldRemove) {
                    point.dispose(this.scene);
                    points.splice(i, 1);
                }
            }
            
            // Clean up empty trail arrays
            if (points.length === 0) {
                this.trails.delete(ownerId);
                this.lastSpawnTime.delete(ownerId);
            }
        }
        
        // Check if local player is standing on any trail
        if (playerPos) {
            this.checkPlayerOnTrail(playerPos.x, playerPos.z, currentTime);
        }
        
        // Clean up expired status effects
        this.cleanupExpiredEffects(currentTime);
    }
    
    /**
     * Check if player is on a trail and apply status effect
     * @param {number} px 
     * @param {number} pz 
     * @param {number} currentTime 
     */
    checkPlayerOnTrail(px, pz, currentTime) {
        for (const [ownerId, points] of this.trails) {
            for (const point of points) {
                if (point.containsPoint(px, pz) && point.config.effect) {
                    const effect = point.config.effect;
                    this.applyEffect(effect, currentTime);
                    return; // Only apply one effect at a time
                }
            }
        }
    }
    
    /**
     * Apply a status effect to local player
     * @param {Object} effectConfig 
     * @param {number} currentTime 
     */
    applyEffect(effectConfig, currentTime) {
        const expiresAt = currentTime + effectConfig.duration;
        
        // Update or add effect
        this.activeEffects.set(effectConfig.type, {
            expiresAt,
            config: effectConfig
        });
    }
    
    /**
     * Clean up expired effects
     * @param {number} currentTime 
     */
    cleanupExpiredEffects(currentTime) {
        for (const [type, effect] of this.activeEffects) {
            if (currentTime > effect.expiresAt) {
                this.activeEffects.delete(type);
            }
        }
    }
    
    /**
     * Get current speed multiplier from active effects
     * @returns {number}
     */
    getSpeedMultiplier() {
        let multiplier = 1.0;
        for (const [type, effect] of this.activeEffects) {
            if (effect.config.speedMultiplier) {
                multiplier *= effect.config.speedMultiplier;
            }
        }
        return multiplier;
    }
    
    /**
     * Get current friction multiplier from active effects
     * @returns {number}
     */
    getFrictionMultiplier() {
        let friction = 1.0;
        for (const [type, effect] of this.activeEffects) {
            if (effect.config.friction) {
                friction = Math.min(friction, effect.config.friction);
            }
        }
        return friction;
    }
    
    /**
     * Check if player has a specific effect active
     * @param {string} effectType 
     * @returns {boolean}
     */
    hasEffect(effectType) {
        return this.activeEffects.has(effectType);
    }
    
    /**
     * Get pending sync data and clear buffer
     * @returns {Array}
     */
    getPendingSyncAndClear() {
        const data = [...this.pendingSync];
        this.pendingSync = [];
        return data;
    }
    
    /**
     * Receive trail data from server (other players' trails)
     * @param {string} playerId 
     * @param {Array} trailPoints - [{ x, z, trailType, timestamp }, ...]
     */
    receiveServerTrails(playerId, trailPoints) {
        for (const point of trailPoints) {
            this.spawnTrailPoint(
                playerId,
                point.x,
                point.z,
                point.trailType,
                point.timestamp,
                true // fromServer
            );
        }
    }
    
    /**
     * Remove all trails for a specific player (e.g., when they disconnect)
     * @param {string} playerId 
     */
    removePlayerTrails(playerId) {
        const trails = this.trails.get(playerId);
        if (trails) {
            for (const point of trails) {
                point.dispose(this.scene);
            }
            this.trails.delete(playerId);
        }
    }
    
    /**
     * Clean up all trails and dispose resources
     */
    dispose() {
        for (const [ownerId, points] of this.trails) {
            for (const point of points) {
                point.dispose(this.scene);
            }
        }
        this.trails.clear();
        this.activeEffects.clear();
        this.pendingSync = [];
        
        // Dispose shared geometry cache
        if (this.geometryCache) {
            this.geometryCache.forEach(geo => geo.dispose());
            this.geometryCache.clear();
        }
        
        // Dispose base material cache
        if (this.materialCache) {
            this.materialCache.forEach(mat => mat.dispose());
            this.materialCache.clear();
        }
    }
}

export { MountTrailSystem, TRAIL_TYPES };
export default MountTrailSystem;

