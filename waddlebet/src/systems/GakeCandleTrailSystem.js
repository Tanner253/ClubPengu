/**
 * GakeCandleTrailSystem - Green trading candle trails for Gake character
 * 
 * Creates green candlestick shapes that sprout from the ground when Gake moves.
 * Candles grow upward, then fade out - like a field of green candles surrounding the player.
 * 
 * PERFORMANCE OPTIMIZED:
 * - Shared geometry across all candles
 * - Materials cached per shade
 * - Candles reuse mesh instances from pool
 */

const CANDLE_COUNT = 30;
const CANDLE_COLORS = {
    body: 0x00C853,
    bodyDark: 0x00A040,
    wick: 0x00E676,
};

class GakeCandleTrailSystem {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        this.pools = new Map();
        
        this.candleBodyGeometry = new THREE.BoxGeometry(0.15, 1, 0.15);
        this.wickGeometry = new THREE.BoxGeometry(0.03, 0.2, 0.03);
        
        this.bodyMaterial = new THREE.MeshBasicMaterial({ 
            color: CANDLE_COLORS.body, 
            transparent: true, 
            opacity: 0 
        });
        this.bodyDarkMaterial = new THREE.MeshBasicMaterial({ 
            color: CANDLE_COLORS.bodyDark, 
            transparent: true, 
            opacity: 0 
        });
        this.wickMaterial = new THREE.MeshBasicMaterial({ 
            color: CANDLE_COLORS.wick, 
            transparent: true, 
            opacity: 0 
        });
    }
    
    createCandle() {
        const THREE = this.THREE;
        const candleGroup = new THREE.Group();
        candleGroup.name = 'gake_candle';
        
        const bodyMat = this.bodyMaterial.clone();
        const body = new THREE.Mesh(this.candleBodyGeometry, bodyMat);
        body.name = 'candle_body';
        body.position.y = 0.5;
        candleGroup.add(body);
        
        const wickMat = this.wickMaterial.clone();
        const wick = new THREE.Mesh(this.wickGeometry, wickMat);
        wick.name = 'candle_wick';
        wick.position.y = 1.1;
        candleGroup.add(wick);
        
        candleGroup.visible = false;
        candleGroup.userData.active = false;
        candleGroup.userData.birthTime = 0;
        candleGroup.userData.lifespan = 2.5;
        candleGroup.userData.growDuration = 0.6;
        candleGroup.userData.targetHeight = 1;
        
        return candleGroup;
    }
    
    createPool() {
        const THREE = this.THREE;
        const poolGroup = new THREE.Group();
        poolGroup.name = 'gake_candle_pool';
        
        for (let i = 0; i < CANDLE_COUNT; i++) {
            const candle = this.createCandle();
            poolGroup.add(candle);
        }
        
        poolGroup.userData.lastSpawnTime = 0;
        poolGroup.userData.nextCandleIndex = 0;
        
        return poolGroup;
    }
    
    getOrCreatePool(poolKey) {
        let pool = this.pools.get(poolKey);
        
        if (!pool) {
            pool = this.createPool();
            this.pools.set(poolKey, pool);
            this.scene.add(pool);
        }
        
        return pool;
    }
    
    update(poolKey, position, isMoving, time, delta) {
        const pool = this.pools.get(poolKey);
        if (!pool) return;
        
        // Spawn candles at different rates: faster when moving, slower when idle
        const spawnInterval = isMoving ? (1 / 8) : (1 / 2); // 8/sec moving, 2/sec idle
        {
            const timeSinceLastSpawn = time - pool.userData.lastSpawnTime;
            
            if (timeSinceLastSpawn >= spawnInterval) {
                let spawned = false;
                for (let attempts = 0; attempts < pool.children.length && !spawned; attempts++) {
                    const idx = (pool.userData.nextCandleIndex + attempts) % pool.children.length;
                    const candle = pool.children[idx];
                    
                    if (!candle.userData.active) {
                        const offsetX = (Math.random() - 0.5) * 2.0;
                        const offsetZ = (Math.random() - 0.5) * 2.0;
                        
                        candle.position.set(
                            position.x + offsetX,
                            0,
                            position.z + offsetZ
                        );
                        
                        candle.userData.targetHeight = 0.5 + Math.random() * 1.0;
                        candle.userData.active = true;
                        candle.userData.birthTime = time;
                        candle.visible = true;
                        
                        candle.scale.set(1, 0.01, 1);
                        
                        candle.children.forEach(child => {
                            if (child.material) {
                                child.material.opacity = 0.9;
                            }
                        });
                        
                        pool.userData.nextCandleIndex = (idx + 1) % pool.children.length;
                        pool.userData.lastSpawnTime = time;
                        spawned = true;
                    }
                }
            }
        }
        
        pool.children.forEach((candle) => {
            if (candle.userData.active) {
                const age = time - candle.userData.birthTime;
                const lifeProgress = age / candle.userData.lifespan;
                const growProgress = Math.min(1, age / candle.userData.growDuration);
                
                if (lifeProgress < 1) {
                    const easeGrow = this.easeOutBack(growProgress);
                    const currentHeight = easeGrow * candle.userData.targetHeight;
                    candle.scale.set(1, Math.max(0.01, currentHeight), 1);
                    
                    let opacity = 0.9;
                    if (lifeProgress > 0.6) {
                        const fadeProgress = (lifeProgress - 0.6) / 0.4;
                        opacity = 0.9 * (1 - fadeProgress);
                    }
                    
                    candle.children.forEach(child => {
                        if (child.material) {
                            child.material.opacity = Math.max(0, opacity);
                        }
                    });
                } else {
                    candle.userData.active = false;
                    candle.visible = false;
                }
            }
        });
    }
    
    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    
    removePool(poolKey) {
        const pool = this.pools.get(poolKey);
        if (pool) {
            this.scene.remove(pool);
            pool.children.forEach(candle => {
                candle.children.forEach(child => {
                    if (child.material) {
                        child.material.dispose();
                    }
                });
            });
            this.pools.delete(poolKey);
        }
    }
    
    hasPool(poolKey) {
        return this.pools.has(poolKey);
    }
    
    dispose() {
        this.pools.forEach((pool, key) => {
            this.removePool(key);
        });
        this.pools.clear();
        
        if (this.candleBodyGeometry) {
            this.candleBodyGeometry.dispose();
            this.candleBodyGeometry = null;
        }
        if (this.wickGeometry) {
            this.wickGeometry.dispose();
            this.wickGeometry = null;
        }
        
        if (this.bodyMaterial) {
            this.bodyMaterial.dispose();
            this.bodyMaterial = null;
        }
        if (this.bodyDarkMaterial) {
            this.bodyDarkMaterial.dispose();
            this.bodyDarkMaterial = null;
        }
        if (this.wickMaterial) {
            this.wickMaterial.dispose();
            this.wickMaterial = null;
        }
    }
}

export default GakeCandleTrailSystem;
