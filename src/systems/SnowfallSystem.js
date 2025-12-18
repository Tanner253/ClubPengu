/**
 * SnowfallSystem - Dynamic snowfall particle system that follows the player
 * 
 * Creates a realistic snow effect with particles that fall, drift, and respawn
 * around the player position. Intensity varies based on time of day.
 */

const DEFAULT_CONFIG = {
    particleCount: 800,
    areaSize: 60,          // Size of the snow area around player
    areaHeight: 35,        // Height of the snow spawn area
    fallSpeed: 2.0,        // Base fall speed
    driftSpeed: 0.5,       // Horizontal drift speed
    particleSize: 0.2,     // Base particle size
    minOpacity: 0.5,
    maxOpacity: 0.9,
};

const MOBILE_CONFIG = {
    particleCount: 400,
    areaSize: 45,
    areaHeight: 25,
    fallSpeed: 2.0,
    driftSpeed: 0.4,
    particleSize: 0.25,
    minOpacity: 0.6,
    maxOpacity: 0.9,
};

class SnowfallSystem {
    constructor(THREE, scene, options = {}) {
        this.THREE = THREE;
        this.scene = scene;
        this.isMobileGPU = options.isMobileGPU || false;
        
        this.config = this.isMobileGPU ? { ...MOBILE_CONFIG } : { ...DEFAULT_CONFIG };
        
        this.particles = null;
        this.geometry = null;
        this.material = null;
        this.velocities = null;
        this.visible = true;
        this.intensity = 0.7; // Default intensity (0-1)
        this.centerPosition = { x: 0, z: 0 };
        
        // Exclusion zones (areas where snow shouldn't fall, like inside buildings)
        this.exclusionZones = [];
    }
    
    /**
     * Add an exclusion zone where snow won't fall (e.g., inside buildings)
     * @param {Object} zone - { minX, maxX, minZ, maxZ, roofHeight }
     */
    addExclusionZone(zone) {
        this.exclusionZones.push(zone);
    }
    
    /**
     * Check if a position is inside any exclusion zone
     * @param {number} x - X position
     * @param {number} y - Y position  
     * @param {number} z - Z position
     * @returns {boolean} True if inside an exclusion zone
     */
    isInExclusionZone(x, y, z) {
        for (const zone of this.exclusionZones) {
            if (x >= zone.minX && x <= zone.maxX &&
                z >= zone.minZ && z <= zone.maxZ &&
                y < zone.roofHeight) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Create the snowfall particle system
     * @param {Object} playerPos - Initial player position { x, z }
     */
    create(playerPos = { x: 0, z: 0 }) {
        const THREE = this.THREE;
        const { particleCount, areaSize, areaHeight, particleSize } = this.config;
        
        this.centerPosition = { x: playerPos.x || 0, z: playerPos.z || 0 };
        
        // Create geometry with positions
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const opacities = new Float32Array(particleCount);
        this.velocities = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            // Random position in snow area
            positions[i * 3] = this.centerPosition.x + (Math.random() - 0.5) * areaSize;
            positions[i * 3 + 1] = Math.random() * areaHeight;
            positions[i * 3 + 2] = this.centerPosition.z + (Math.random() - 0.5) * areaSize;
            
            // Random velocities for natural movement
            this.velocities[i * 3] = (Math.random() - 0.5) * this.config.driftSpeed;
            this.velocities[i * 3 + 1] = -(this.config.fallSpeed + Math.random() * this.config.fallSpeed * 0.5);
            this.velocities[i * 3 + 2] = (Math.random() - 0.5) * this.config.driftSpeed;
            
            // Varied sizes for depth perception
            sizes[i] = particleSize * (0.5 + Math.random());
            opacities[i] = this.config.minOpacity + Math.random() * (this.config.maxOpacity - this.config.minOpacity);
        }
        
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        this.geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        
        // Custom shader material for better snow appearance
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0xFFFFFF) },
                globalOpacity: { value: this.intensity },
                time: { value: 0 },
            },
            vertexShader: `
                attribute float size;
                attribute float opacity;
                varying float vOpacity;
                
                void main() {
                    vOpacity = opacity;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float globalOpacity;
                varying float vOpacity;
                
                void main() {
                    // Circular snow particle
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    if (dist > 0.5) discard;
                    
                    // Soft edge falloff
                    float alpha = smoothstep(0.5, 0.2, dist) * vOpacity * globalOpacity;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
        });
        
        this.particles = new THREE.Points(this.geometry, this.material);
        this.particles.frustumCulled = false; // Always render snow
        this.particles.name = 'snowfall_system';
        
        this.scene.add(this.particles);
        
        return this.particles;
    }
    
    /**
     * Update snowfall particles each frame
     * @param {number} time - Total elapsed time
     * @param {number} delta - Time since last frame (seconds)
     * @param {Object} playerPos - Current player position { x, z }
     * @param {number} serverTime - Server world time (0-1) for day/night intensity
     */
    update(time, delta, playerPos, serverTime = 0.5) {
        if (!this.particles || !this.visible) return;
        
        const positions = this.geometry.attributes.position.array;
        const { particleCount, areaSize, areaHeight, driftSpeed } = this.config;
        
        // Update center position smoothly towards player
        const playerX = playerPos?.x || this.centerPosition.x;
        const playerZ = playerPos?.z || this.centerPosition.z;
        
        this.centerPosition.x += (playerX - this.centerPosition.x) * 0.02;
        this.centerPosition.z += (playerZ - this.centerPosition.z) * 0.02;
        
        // Calculate intensity based on time of day
        // More snow at night (0.0 = midnight, 0.5 = noon)
        const nightFactor = Math.abs(serverTime - 0.5) * 2; // 0 at noon, 1 at midnight
        const targetIntensity = 0.4 + nightFactor * 0.6; // 0.4 at noon, 1.0 at midnight
        this.intensity += (targetIntensity - this.intensity) * delta * 0.5;
        
        // Update shader uniforms
        this.material.uniforms.globalOpacity.value = this.intensity;
        this.material.uniforms.time.value = time;
        
        // Wind effect that changes over time
        const windX = Math.sin(time * 0.1) * driftSpeed * 0.5;
        const windZ = Math.cos(time * 0.15) * driftSpeed * 0.3;
        
        const halfArea = areaSize / 2;
        
        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3;
            
            // Apply velocity + wind
            positions[idx] += (this.velocities[idx] + windX) * delta;
            positions[idx + 1] += this.velocities[idx + 1] * delta;
            positions[idx + 2] += (this.velocities[idx + 2] + windZ) * delta;
            
            // Respawn particles that fall below ground, drift too far, or enter exclusion zones
            const dx = positions[idx] - this.centerPosition.x;
            const dz = positions[idx + 2] - this.centerPosition.z;
            
            const shouldRespawn = positions[idx + 1] < 0 || 
                Math.abs(dx) > halfArea || 
                Math.abs(dz) > halfArea ||
                this.isInExclusionZone(positions[idx], positions[idx + 1], positions[idx + 2]);
            
            if (shouldRespawn) {
                // Respawn at top with random position in area (outside exclusion zones)
                let newX, newZ;
                let attempts = 0;
                do {
                    newX = this.centerPosition.x + (Math.random() - 0.5) * areaSize;
                    newZ = this.centerPosition.z + (Math.random() - 0.5) * areaSize;
                    attempts++;
                } while (this.isInExclusionZone(newX, areaHeight, newZ) && attempts < 5);
                
                positions[idx] = newX;
                positions[idx + 1] = areaHeight + Math.random() * 5;
                positions[idx + 2] = newZ;
                
                // Randomize velocity slightly on respawn
                this.velocities[idx] = (Math.random() - 0.5) * driftSpeed;
                this.velocities[idx + 2] = (Math.random() - 0.5) * driftSpeed;
            }
        }
        
        this.geometry.attributes.position.needsUpdate = true;
    }
    
    /**
     * Set visibility of the snowfall system
     * @param {boolean} visible
     */
    setVisible(visible) {
        this.visible = visible;
        if (this.particles) {
            this.particles.visible = visible;
        }
    }
    
    /**
     * Get current intensity
     * @returns {number} Intensity value 0-1
     */
    getIntensity() {
        return this.intensity;
    }
    
    /**
     * Set intensity manually (0-1)
     * @param {number} intensity
     */
    setIntensity(intensity) {
        this.intensity = Math.max(0, Math.min(1, intensity));
        if (this.material) {
            this.material.uniforms.globalOpacity.value = this.intensity;
        }
    }
    
    /**
     * Clean up all resources
     */
    dispose() {
        if (this.particles) {
            this.scene.remove(this.particles);
        }
        if (this.geometry) {
            this.geometry.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
        this.particles = null;
        this.geometry = null;
        this.material = null;
        this.velocities = null;
    }
}

export default SnowfallSystem;

