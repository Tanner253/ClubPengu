/**
 * LocalizedParticleSystem - World-space particle rain that follows a target
 * 
 * PERFORMANCE OPTIMIZED:
 * - Minimal object creation in update loop
 * - Distance-based LOD (skip updates for far players)
 * - Throttled opacity updates
 * - Pre-cached config values
 * - Simplified shader
 */

// Preset configurations for different particle effects
const PRESETS = {
    goldRain: {
        particleCount: 25,     // Reduced for subtle effect
        spawnWidth: 3.5,
        spawnDepth: 2.0,
        spawnHeight: 3.8,
        fallDistance: 4.5,
        fallSpeed: 3.0,
        driftSpeed: 0.3,
        particleSize: 0.25,
        color: 0xFFD700,       // Gold
        minOpacity: 0.6,
        maxOpacity: 1.0,
        zOffset: 1.5,
        maxRenderDistance: 50,
    },
    whaleRain: {
        particleCount: 25,
        spawnWidth: 3.5,
        spawnDepth: 2.0,
        spawnHeight: 3.8,
        fallDistance: 4.5,
        fallSpeed: 2.5,        // Slightly slower, more elegant
        driftSpeed: 0.35,
        particleSize: 0.25,
        color: 0x06B6D4,       // Cyan (whale theme)
        minOpacity: 0.6,
        maxOpacity: 1.0,
        zOffset: 1.5,
        maxRenderDistance: 50,
    },
    sparkle: {
        particleCount: 20,
        spawnWidth: 3.0,
        spawnDepth: 1.0,
        spawnHeight: 4.5,
        fallDistance: 4.0,
        fallSpeed: 1.5,
        driftSpeed: 0.5,
        particleSize: 0.15,
        color: 0xFFFFFF,
        minOpacity: 0.4,
        maxOpacity: 0.9,
        maxRenderDistance: 50,
    }
};

class LocalizedParticleSystem {
    constructor(THREE, scene, preset = 'goldRain', options = {}) {
        this.THREE = THREE;
        this.scene = scene;
        
        // Cache config values as instance properties for faster access
        const config = PRESETS[preset] || PRESETS.goldRain;
        this.particleCount = config.particleCount;
        this.spawnWidth = config.spawnWidth;
        this.spawnDepth = config.spawnDepth;
        this.spawnHeight = config.spawnHeight;
        this.fallDistance = config.fallDistance;
        this.fallSpeed = config.fallSpeed;
        this.driftSpeed = config.driftSpeed;
        this.particleSize = config.particleSize;
        this.color = options.color ?? config.color;
        this.minOpacity = config.minOpacity;
        this.maxOpacity = config.maxOpacity;
        this.zOffset = config.zOffset || 0;
        this.maxRenderDistance = config.maxRenderDistance || 50;
        this.maxRenderDistanceSq = this.maxRenderDistance * this.maxRenderDistance;
        
        this.particles = null;
        this.geometry = null;
        this.material = null;
        this.velocities = null;
        this.visible = true;
        
        // Pre-allocate reusable values to avoid GC
        this.targetX = 0;
        this.targetY = 0;
        this.targetZ = 0;
        this.centerX = 0;
        this.centerZ = 0;
        
        // Throttling
        this.frameCount = 0;
        this.lastFullUpdate = 0;
    }
    
    /**
     * Create the particle system and add to scene
     */
    create(initialPos = { x: 0, y: 0, z: 0 }) {
        const THREE = this.THREE;
        
        this.targetX = initialPos.x || 0;
        this.targetY = initialPos.y || 0;
        this.targetZ = initialPos.z || 0;
        
        // Create geometry with positions in world space
        const positions = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);
        this.velocities = new Float32Array(this.particleCount * 3);
        
        // Pre-calculate random values
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = this.targetX + (Math.random() - 0.5) * this.spawnWidth;
            positions[i3 + 1] = this.targetY + this.spawnHeight - Math.random() * this.fallDistance;
            positions[i3 + 2] = this.targetZ + (Math.random() - 0.5) * this.spawnDepth + this.zOffset;
            
            this.velocities[i3] = (Math.random() - 0.5) * this.driftSpeed;
            this.velocities[i3 + 1] = -(this.fallSpeed + Math.random() * this.fallSpeed * 0.3);
            this.velocities[i3 + 2] = (Math.random() - 0.5) * this.driftSpeed;
            
            sizes[i] = this.particleSize * (0.6 + Math.random() * 0.8);
        }
        
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Optimized shader - removed per-particle opacity, use uniform instead
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(this.color) },
                opacity: { value: this.maxOpacity },
            },
            vertexShader: `
                attribute float size;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (250.0 / -mvPosition.z);
                    gl_PointSize = clamp(gl_PointSize, 1.0, 20.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float opacity;
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    float alpha = (1.0 - dist * 2.0) * opacity;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        
        this.particles = new THREE.Points(this.geometry, this.material);
        this.particles.frustumCulled = false; // Disable - particles move dynamically, bounding sphere gets stale
        this.particles.renderOrder = -1;
        this.particles.name = 'gold_rain';
        
        this.scene.add(this.particles);
        return this.particles;
    }
    
    /**
     * Update particles - OPTIMIZED
     */
    update(time, delta, targetPos, cameraPos) {
        if (!this.particles || !this.visible) return;
        
        // Distance-based culling - skip update if too far from camera
        if (cameraPos && targetPos) {
            const dx = cameraPos.x - targetPos.x;
            const dz = cameraPos.z - targetPos.z;
            const distSq = dx * dx + dz * dz;
            
            if (distSq > this.maxRenderDistanceSq) {
                this.particles.visible = false;
                return;
            }
            this.particles.visible = true;
        }
        
        // Update target position (avoid object creation)
        if (targetPos) {
            this.targetX = targetPos.x;
            this.targetY = targetPos.y;
            this.targetZ = targetPos.z;
        }
        
        // Calculate offset direction (behind player from camera)
        this.centerX = this.targetX;
        this.centerZ = this.targetZ + this.zOffset;
        
        if (cameraPos) {
            const dirX = cameraPos.x - this.targetX;
            const dirZ = cameraPos.z - this.targetZ;
            const dist = Math.sqrt(dirX * dirX + dirZ * dirZ);
            if (dist > 0.1) {
                const invDist = 2.0 / dist;
                this.centerX = this.targetX - dirX * invDist;
                this.centerZ = this.targetZ - dirZ * invDist;
            }
        }
        
        const positions = this.geometry.attributes.position.array;
        const spawnY = this.targetY + this.spawnHeight;
        const groundY = this.targetY - 0.5;
        
        // Simple wind (use time directly, avoid trig every frame for each particle)
        const windX = Math.sin(time * 0.8) * this.driftSpeed * 0.5;
        const windZ = Math.cos(time * 0.6) * this.driftSpeed * 0.3;
        
        // Bounds for respawn check
        const maxDx = this.spawnWidth * 1.5;
        const maxDz = this.spawnDepth * 1.5;
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Apply velocity + wind
            positions[i3] += (this.velocities[i3] + windX) * delta;
            positions[i3 + 1] += this.velocities[i3 + 1] * delta;
            positions[i3 + 2] += (this.velocities[i3 + 2] + windZ) * delta;
            
            // Check bounds and respawn
            const dx = positions[i3] - this.centerX;
            const dz = positions[i3 + 2] - this.centerZ;
            
            if (positions[i3 + 1] < groundY || 
                dx > maxDx || dx < -maxDx || 
                dz > maxDz || dz < -maxDz) {
                // Respawn
                positions[i3] = this.centerX + (Math.random() - 0.5) * this.spawnWidth;
                positions[i3 + 1] = spawnY + Math.random() * 0.5;
                positions[i3 + 2] = this.centerZ + (Math.random() - 0.5) * this.spawnDepth;
                
                this.velocities[i3] = (Math.random() - 0.5) * this.driftSpeed;
                this.velocities[i3 + 2] = (Math.random() - 0.5) * this.driftSpeed;
            }
        }
        
        this.geometry.attributes.position.needsUpdate = true;
    }
    
    setVisible(visible) {
        this.visible = visible;
        if (this.particles) {
            this.particles.visible = visible;
        }
    }
    
    dispose() {
        if (this.particles) {
            this.scene.remove(this.particles);
        }
        if (this.geometry) this.geometry.dispose();
        if (this.material) this.material.dispose();
        this.particles = null;
        this.geometry = null;
        this.material = null;
        this.velocities = null;
    }
}

export default LocalizedParticleSystem;
export { PRESETS };
