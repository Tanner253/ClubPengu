/**
 * ParticleSystem - Manages particle effects (snow, fire, trails, etc.)
 */

class ParticleSystem {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        this.systems = new Map(); // name -> particle system data
    }
    
    /**
     * Create a snowfall system
     * @param {Object} config - { count, area, speed }
     */
    createSnowfall(config = {}) {
        const THREE = this.THREE;
        const count = config.count || 2000;
        const area = config.area || { x: 100, y: 50, z: 100 };
        const speed = config.speed || 0.5;
        
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * area.x;
            positions[i * 3 + 1] = Math.random() * area.y;
            positions[i * 3 + 2] = (Math.random() - 0.5) * area.z;
            
            velocities[i * 3] = (Math.random() - 0.5) * 0.2;
            velocities[i * 3 + 1] = -(speed + Math.random() * speed);
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
            
            sizes[i] = 0.5 + Math.random() * 1;
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.3,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
        });
        
        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        
        this.systems.set('snowfall', {
            points,
            geometry,
            velocities,
            area,
            count,
        });
        
        return points;
    }
    
    /**
     * Update snowfall particles
     */
    updateSnowfall(delta, playerPos = null) {
        const snow = this.systems.get('snowfall');
        if (!snow) return;
        
        const positions = snow.geometry.attributes.position.array;
        const velocities = snow.velocities;
        const area = snow.area;
        
        for (let i = 0; i < snow.count; i++) {
            // Update position
            positions[i * 3] += velocities[i * 3] * delta;
            positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
            positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
            
            // Reset if below ground
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3] = (Math.random() - 0.5) * area.x;
                positions[i * 3 + 1] = area.y;
                positions[i * 3 + 2] = (Math.random() - 0.5) * area.z;
                
                // Re-center on player if provided
                if (playerPos) {
                    positions[i * 3] += playerPos.x;
                    positions[i * 3 + 2] += playerPos.z;
                }
            }
        }
        
        snow.geometry.attributes.position.needsUpdate = true;
    }
    
    /**
     * Create a trail effect (for wizard hat, etc.)
     * @param {string} name - System name
     * @param {Object} config - { color, count, size, lifetime }
     */
    createTrail(name, config = {}) {
        const THREE = this.THREE;
        const count = config.count || 50;
        const color = config.color || 0xFF69B4;
        const size = config.size || 0.2;
        
        const positions = new Float32Array(count * 3);
        const ages = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -1000; // Start hidden
            positions[i * 3 + 2] = 0;
            ages[i] = 0;
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color,
            size,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        
        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        
        this.systems.set(name, {
            points,
            geometry,
            ages,
            count,
            nextIndex: 0,
            lifetime: config.lifetime || 1,
            color,
        });
        
        return points;
    }
    
    /**
     * Emit a particle from a trail system
     * @param {string} name - System name
     * @param {THREE.Vector3} position
     */
    emitTrailParticle(name, position) {
        const trail = this.systems.get(name);
        if (!trail) return;
        
        const positions = trail.geometry.attributes.position.array;
        const i = trail.nextIndex;
        
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;
        
        trail.ages[i] = trail.lifetime;
        trail.nextIndex = (trail.nextIndex + 1) % trail.count;
        
        trail.geometry.attributes.position.needsUpdate = true;
    }
    
    /**
     * Update trail system
     * @param {string} name - System name
     * @param {number} delta - Time since last frame
     */
    updateTrail(name, delta) {
        const trail = this.systems.get(name);
        if (!trail) return;
        
        const positions = trail.geometry.attributes.position.array;
        
        for (let i = 0; i < trail.count; i++) {
            if (trail.ages[i] > 0) {
                trail.ages[i] -= delta;
                
                // Fade up and out
                positions[i * 3 + 1] += delta * 0.5;
                
                // Hide when expired
                if (trail.ages[i] <= 0) {
                    positions[i * 3 + 1] = -1000;
                }
            }
        }
        
        trail.geometry.attributes.position.needsUpdate = true;
    }
    
    /**
     * Update all particle systems
     * @param {number} delta
     * @param {Object} playerPos - Optional player position for centering
     */
    update(delta, playerPos = null) {
        if (this.systems.has('snowfall')) {
            this.updateSnowfall(delta, playerPos);
        }
        
        // Update all trails
        this.systems.forEach((system, name) => {
            if (name.includes('trail')) {
                this.updateTrail(name, delta);
            }
        });
    }
    
    /**
     * Get a particle system by name
     * @param {string} name
     */
    get(name) {
        return this.systems.get(name);
    }
    
    /**
     * Remove a particle system
     * @param {string} name
     */
    remove(name) {
        const system = this.systems.get(name);
        if (system) {
            this.scene.remove(system.points);
            system.geometry.dispose();
            system.points.material.dispose();
            this.systems.delete(name);
        }
    }
    
    /**
     * Cleanup all particle systems
     */
    dispose() {
        this.systems.forEach((system, name) => {
            this.scene.remove(system.points);
            system.geometry.dispose();
            system.points.material.dispose();
        });
        this.systems.clear();
    }
}

export default ParticleSystem;

