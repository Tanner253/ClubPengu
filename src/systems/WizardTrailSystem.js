/**
 * WizardTrailSystem - Magical particle trails for wizard hat wearers
 * 
 * Creates sparkly particle trails that spawn when moving and fade out over time.
 * Each player with a wizard hat gets their own particle pool.
 */

const WIZARD_PARTICLE_COUNT = 50;
const WIZARD_TRAIL_COLORS = [0xFF69B4, 0x9400D3, 0x8A2BE2, 0xFFD700, 0x00CED1, 0xFF1493];

class WizardTrailSystem {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        this.pools = new Map(); // poolKey -> trailGroup
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
            const size = 0.08 + Math.random() * 0.06;
            const pGeo = new THREE.SphereGeometry(size, 8, 8);
            const pMat = new THREE.MeshBasicMaterial({ 
                color: WIZARD_TRAIL_COLORS[Math.floor(Math.random() * WIZARD_TRAIL_COLORS.length)], 
                transparent: true, 
                opacity: 0
            });
            const pMesh = new THREE.Mesh(pGeo, pMat);
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
            pool.children.forEach(particle => {
                particle.geometry.dispose();
                particle.material.dispose();
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
     * Dispose all particle pools
     */
    dispose() {
        this.pools.forEach((pool, key) => {
            this.removePool(key);
        });
        this.pools.clear();
    }
}

export default WizardTrailSystem;

