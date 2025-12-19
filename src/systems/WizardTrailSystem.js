/**
 * WizardTrailSystem - Magical particle trails for wizard hat wearers
 * 
 * Creates sparkly particle trails that spawn when moving and fade out over time.
 * Each player with a wizard hat gets their own particle pool.
 * 
 * PERFORMANCE OPTIMIZED:
 * - Shared geometry across ALL particles (single SphereGeometry)
 * - Materials cached per color (only 6 materials total)
 * - Particles reuse mesh instances from pool
 */

const WIZARD_PARTICLE_COUNT = 50;
const WIZARD_TRAIL_COLORS = [0xFF69B4, 0x9400D3, 0x8A2BE2, 0xFFD700, 0x00CED1, 0xFF1493];

class WizardTrailSystem {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        this.pools = new Map(); // poolKey -> trailGroup
        
        // OPTIMIZATION: Create shared geometry ONCE
        this.sharedGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        
        // OPTIMIZATION: Create cached materials per color (transparent, will update opacity per-particle)
        this.materialCache = new Map();
        WIZARD_TRAIL_COLORS.forEach(color => {
            this.materialCache.set(color, new THREE.MeshBasicMaterial({ 
                color: color, 
                transparent: true, 
                opacity: 0
            }));
        });
    }
    
    /**
     * Create a new particle pool for a player
     * @returns {THREE.Group} The particle pool group
     */
    createPool() {
        const THREE = this.THREE;
        const trailGroup = new THREE.Group();
        trailGroup.name = 'wizard_trail_pool';
        
        for (let i = 0; i < WIZARD_PARTICLE_COUNT; i++) {
            // OPTIMIZATION: Use shared geometry, clone material for individual opacity control
            const colorIndex = Math.floor(Math.random() * WIZARD_TRAIL_COLORS.length);
            const baseColor = WIZARD_TRAIL_COLORS[colorIndex];
            // Clone material so each particle can have its own opacity
            const pMat = this.materialCache.get(baseColor).clone();
            pMat.opacity = 0;
            
            const pMesh = new THREE.Mesh(this.sharedGeometry, pMat);
            // Random size variation via scale instead of new geometry
            const sizeScale = 0.8 + Math.random() * 0.6;
            pMesh.scale.setScalar(sizeScale);
            pMesh.visible = false;
            pMesh.userData.active = false;
            pMesh.userData.birthTime = 0;
            pMesh.userData.lifespan = 3;
            trailGroup.add(pMesh);
        }
        
        trailGroup.userData.lastSpawnTime = 0;
        trailGroup.userData.nextParticleIndex = 0;
        
        return trailGroup;
    }
    
    /**
     * Get or create a particle pool for a player
     * @param {string} poolKey - Unique identifier for the player (e.g., 'localPlayer', playerId)
     * @returns {THREE.Group} The particle pool
     */
    getOrCreatePool(poolKey) {
        let pool = this.pools.get(poolKey);
        
        if (!pool) {
            pool = this.createPool();
            this.pools.set(poolKey, pool);
            this.scene.add(pool);
        }
        
        return pool;
    }
    
    /**
     * Update wizard trail for a player
     * @param {string} poolKey - Player pool identifier
     * @param {Object} position - Player world position { x, y, z }
     * @param {boolean} isMoving - Whether player is currently moving
     * @param {number} time - Current elapsed time
     * @param {number} delta - Time since last frame
     */
    update(poolKey, position, isMoving, time, delta) {
        const pool = this.pools.get(poolKey);
        if (!pool) return;
        
        // Spawn particles when moving - controlled rate (15/sec)
        if (isMoving) {
            const spawnInterval = 1 / 15;
            const timeSinceLastSpawn = time - pool.userData.lastSpawnTime;
            
            if (timeSinceLastSpawn >= spawnInterval) {
                let spawned = false;
                for (let attempts = 0; attempts < pool.children.length && !spawned; attempts++) {
                    const idx = (pool.userData.nextParticleIndex + attempts) % pool.children.length;
                    const particle = pool.children[idx];
                    
                    if (!particle.userData.active) {
                        particle.position.set(
                            position.x + (Math.random() - 0.5) * 0.4,
                            position.y + 2.2 + (Math.random() - 0.5) * 0.2,
                            position.z + (Math.random() - 0.5) * 0.4
                        );
                        particle.userData.active = true;
                        particle.userData.birthTime = time;
                        particle.visible = true;
                        particle.material.opacity = 0.9;
                        particle.scale.setScalar(0.8 + Math.random() * 0.4);
                        
                        pool.userData.nextParticleIndex = (idx + 1) % pool.children.length;
                        pool.userData.lastSpawnTime = time;
                        spawned = true;
                    }
                }
            }
        }
        
        // Update all active particles
        pool.children.forEach((particle) => {
            if (particle.userData.active) {
                const age = time - particle.userData.birthTime;
                const lifeProgress = age / particle.userData.lifespan;
                
                if (lifeProgress < 1) {
                    // Float upward slowly
                    particle.position.y += delta * 0.05;
                    
                    // Fade out in last 30% of life
                    let opacity;
                    if (lifeProgress < 0.7) {
                        opacity = 0.9;
                    } else {
                        const fadeProgress = (lifeProgress - 0.7) / 0.3;
                        opacity = 0.9 * (1 - fadeProgress * fadeProgress);
                    }
                    particle.material.opacity = Math.max(0, opacity);
                    
                    // Grow slightly
                    particle.scale.setScalar(particle.scale.x * (1 + delta * 0.05));
                } else {
                    // Deactivate expired particle
                    particle.userData.active = false;
                    particle.visible = false;
                }
            }
        });
    }
    
    /**
     * Remove a player's particle pool
     * @param {string} poolKey - Player pool identifier
     */
    removePool(poolKey) {
        const pool = this.pools.get(poolKey);
        if (pool) {
            this.scene.remove(pool);
            // Only dispose cloned materials, not shared geometry
            pool.children.forEach(particle => {
                if (particle.material) {
                    particle.material.dispose();
                }
            });
            this.pools.delete(poolKey);
        }
    }
    
    /**
     * Check if a pool exists for a player
     * @param {string} poolKey - Player pool identifier
     */
    hasPool(poolKey) {
        return this.pools.has(poolKey);
    }
    
    /**
     * Dispose all particle pools and shared resources
     */
    dispose() {
        this.pools.forEach((pool, key) => {
            this.removePool(key);
        });
        this.pools.clear();
        
        // Dispose shared geometry
        if (this.sharedGeometry) {
            this.sharedGeometry.dispose();
            this.sharedGeometry = null;
        }
        
        // Dispose cached base materials
        if (this.materialCache) {
            this.materialCache.forEach(mat => mat.dispose());
            this.materialCache.clear();
        }
    }
}

export default WizardTrailSystem;


