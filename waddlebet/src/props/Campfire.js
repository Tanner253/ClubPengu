/**
 * Campfire - Animated campfire with light and ember particles
 */

import BaseProp from './BaseProp';
import { getMaterialManager } from './PropMaterials';

class Campfire extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {boolean} isLit - Whether the fire is burning
     */
    constructor(THREE, isLit = true) {
        super(THREE);
        this.isLit = isLit;
        this.matManager = getMaterialManager(THREE);
        this.fireLight = null;
        this.particles = null;
        this.flames = [];
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'campfire';
        group.position.set(x, y, z);
        
        const stoneMat = this.matManager.get(0x555555, { roughness: 0.9 });
        const logMat = this.matManager.get(0x4A3728, { roughness: 0.95 });
        const charMat = this.matManager.get(0x1A1A1A, { roughness: 1 });
        
        // Stone ring
        const stoneRingRadius = 1.2;
        const stoneCount = 10;
        
        for (let i = 0; i < stoneCount; i++) {
            const angle = (i / stoneCount) * Math.PI * 2;
            const stoneGeo = new THREE.DodecahedronGeometry(0.25, 0);
            const stone = new THREE.Mesh(stoneGeo, stoneMat);
            stone.position.set(
                Math.cos(angle) * stoneRingRadius,
                0.1,
                Math.sin(angle) * stoneRingRadius
            );
            stone.rotation.set(Math.random(), Math.random(), Math.random());
            stone.scale.set(1 + Math.random() * 0.3, 0.6 + Math.random() * 0.2, 1 + Math.random() * 0.3);
            this.addMesh(stone, group);
        }
        
        // Logs in center
        const logGeo = new THREE.CylinderGeometry(0.15, 0.18, 1.2, 8);
        
        for (let i = 0; i < 4; i++) {
            const log = new THREE.Mesh(logGeo, logMat);
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            log.position.set(
                Math.cos(angle) * 0.3,
                0.15,
                Math.sin(angle) * 0.3
            );
            log.rotation.z = Math.PI / 2;
            log.rotation.y = angle;
            this.addMesh(log, group);
        }
        
        // Charred center
        const charGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.1, 12);
        const char = new THREE.Mesh(charGeo, charMat);
        char.position.y = 0.05;
        this.addMesh(char, group);
        
        if (this.isLit) {
            this.createFire(group);
        }
        
        return this;
    }
    
    createFire(group) {
        const THREE = this.THREE;
        
        // Fire glow light
        this.fireLight = new THREE.PointLight(0xFF6600, 2, 8);
        this.fireLight.position.y = 1;
        this.addLight(this.fireLight, group);
        
        // Flame cones - Multiple layered flames for realistic fire effect
        const flameConfigs = [
            // Core flames (inner, brightest)
            { color: 0xFFDD44, baseY: 0.4, baseScale: 0.7, phase: 0, speed: 1.2, radius: 0.15 },
            { color: 0xFFCC22, baseY: 0.45, baseScale: 0.6, phase: 1.2, speed: 1.4, radius: 0.12 },
            { color: 0xFFBB00, baseY: 0.5, baseScale: 0.5, phase: 2.4, speed: 1.6, radius: 0.1 },
            // Middle flames (orange)
            { color: 0xFF8800, baseY: 0.35, baseScale: 0.9, phase: 0.5, speed: 1.0, radius: 0.25 },
            { color: 0xFF6600, baseY: 0.4, baseScale: 0.85, phase: 1.8, speed: 1.1, radius: 0.22 },
            { color: 0xFF5500, baseY: 0.45, baseScale: 0.75, phase: 3.0, speed: 1.3, radius: 0.18 },
            // Outer flames (red tips)
            { color: 0xFF4400, baseY: 0.3, baseScale: 1.0, phase: 0.8, speed: 0.9, radius: 0.3 },
            { color: 0xFF3300, baseY: 0.35, baseScale: 0.95, phase: 2.2, speed: 0.95, radius: 0.28 },
        ];
        
        const flameGeo = new THREE.ConeGeometry(0.25, 1.0, 6);
        
        flameConfigs.forEach((cfg, i) => {
            const flameMat = new THREE.MeshBasicMaterial({ 
                color: cfg.color, 
                transparent: true, 
                opacity: 0.85 - i * 0.03 // Inner flames more opaque
            });
            
            const flame = new THREE.Mesh(flameGeo, flameMat);
            
            // Deterministic starting position based on index
            const angle = (i / flameConfigs.length) * Math.PI * 2;
            flame.position.set(
                Math.cos(angle) * cfg.radius,
                cfg.baseY,
                Math.sin(angle) * cfg.radius
            );
            flame.scale.set(cfg.baseScale, cfg.baseScale, cfg.baseScale);
            
            // Store animation parameters
            flame.userData.isFlame = true;
            flame.userData.baseY = cfg.baseY;
            flame.userData.baseScale = cfg.baseScale;
            flame.userData.phase = cfg.phase;
            flame.userData.speed = cfg.speed;
            flame.userData.baseAngle = angle;
            flame.userData.radius = cfg.radius;
            flame.userData.flameIndex = i;
            
            this.flames.push(flame);
            this.addMesh(flame, group);
        });
        
        // Ember particles - 100% DETERMINISTIC: No randomness, pure math
        const particleCount = 24;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        // Store deterministic particle parameters (computed once, never changes)
        this.particleParams = [];
        for (let i = 0; i < particleCount; i++) {
            // Each particle has fixed parameters based on its index
            const phase = (i / particleCount) * Math.PI * 2; // Evenly spread around circle
            const spiralRadius = 0.12 + (i % 6) * 0.06; // 6 different spiral sizes
            const riseSpeed = 0.3 + (i % 4) * 0.1; // 4 different speeds
            const spiralSpeed = 0.6 + (i % 5) * 0.2; // 5 different rotation speeds
            
            this.particleParams.push({ phase, spiralRadius, riseSpeed, spiralSpeed });
            
            // Initial positions (will be set in update)
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            // Deterministic warm colors based on index
            const hue = 0.02 + (i % 8) * 0.01; // Orange to yellow gradient
            const lightness = 0.5 + (i % 4) * 0.1;
            const color = new THREE.Color().setHSL(hue, 1, lightness);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMat = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(particleGeo, particleMat);
        this.particles.userData.isEmbers = true;
        this.particles.userData.campfireRef = this; // Store reference for TownCenter
        this.addMesh(this.particles, group);
        
        // Store reference on the group too
        group.userData.campfireInstance = this;
    }
    
    update(time, delta = 0.016) {
        if (!this.isLit) return;
        
        // Animate flames - DRAMATIC grow/shrink like real fire
        this.flames.forEach(flame => {
            const phase = flame.userData.phase;
            const speed = flame.userData.speed;
            const baseY = flame.userData.baseY;
            const baseScale = flame.userData.baseScale;
            const baseAngle = flame.userData.baseAngle;
            const radius = flame.userData.radius;
            const idx = flame.userData.flameIndex;
            
            const t = time * speed + phase;
            
            // === DRAMATIC HEIGHT/SCALE GROW & SHRINK ===
            // This is the main "fire" effect - flames grow tall then shrink down
            
            // Primary breathing (BIG effect - flames double in height)
            const breathe = (Math.sin(t * 2.5) + 1) * 0.5; // 0 to 1
            
            // Secondary pulse (medium wobble)
            const pulse = (Math.sin(t * 4.0 + 1.0) + 1) * 0.5; // 0 to 1
            
            // Quick flicker
            const flicker = (Math.sin(t * 8.0 + idx * 0.5) + 1) * 0.5; // 0 to 1
            
            // Combine for dramatic height variation (0.4 to 1.8 range)
            const heightMultiplier = 0.5 + breathe * 0.8 + pulse * 0.3 + flicker * 0.2;
            
            // Y scale (height) - DRAMATIC grow/shrink
            flame.scale.y = baseScale * heightMultiplier * 1.5;
            
            // X/Z scale - when tall, get thinner (volume preservation)
            const widthMultiplier = 1 / Math.sqrt(heightMultiplier);
            const widthWobble = 1 + Math.sin(t * 3.5 + 0.5) * 0.2;
            flame.scale.x = baseScale * widthMultiplier * widthWobble;
            flame.scale.z = baseScale * widthMultiplier * (1 + Math.cos(t * 3.2) * 0.15);
            
            // Position Y - flames rise when growing
            const riseAmount = (heightMultiplier - 1) * 0.15;
            flame.position.y = baseY + riseAmount;
            
            // === SWAY ANIMATION (flames dance side to side) ===
            const swayX = Math.sin(t * 1.5) * 0.15;
            const swayZ = Math.cos(t * 1.8 + 0.5) * 0.12;
            
            // Orbit around center while swaying
            const orbitSpeed = 0.4;
            const currentAngle = baseAngle + time * orbitSpeed;
            const dynamicRadius = radius * (1 + Math.sin(t * 2) * 0.3);
            
            flame.position.x = Math.cos(currentAngle) * dynamicRadius + swayX;
            flame.position.z = Math.sin(currentAngle) * dynamicRadius + swayZ;
            
            // === TILT (flames lean as they sway) ===
            flame.rotation.x = swayZ * 0.4;
            flame.rotation.z = -swayX * 0.4;
            
            // Continuous rotation for flickering appearance
            flame.rotation.y += delta * (0.8 + idx * 0.15);
            
            // === OPACITY FLICKER ===
            if (flame.material) {
                const baseOpacity = 0.9 - idx * 0.02;
                flame.material.opacity = baseOpacity * (0.7 + flicker * 0.3);
            }
        });
        
        // Animate ember particles - 100% DETERMINISTIC: No randomness, smooth looping paths
        if (this.particles && this.particleParams) {
            const positions = this.particles.geometry.attributes.position.array;
            const maxHeight = 2.8;
            const cycleTime = 5.0; // Full cycle duration in seconds
            
            for (let i = 0; i < this.particleParams.length; i++) {
                const p = this.particleParams[i];
                
                // Progress through lifecycle (0 to 1), loops smoothly
                // Each particle starts at a different point based on its phase
                const rawProgress = ((time * p.riseSpeed / cycleTime) + (p.phase / (Math.PI * 2))) % 1.0;
                
                // Smooth ease-out: starts fast, slows at top (like real embers losing momentum)
                const easedProgress = 1 - Math.pow(1 - rawProgress, 2.5);
                
                // Height: smooth rise from base to max, then wrap
                const y = 0.3 + easedProgress * (maxHeight - 0.3);
                
                // Spiral path that expands as it rises (like smoke)
                const spiralAngle = time * p.spiralSpeed + p.phase;
                const expandFactor = 0.5 + easedProgress * 1.5; // Spiral widens as particle rises
                const x = Math.sin(spiralAngle) * p.spiralRadius * expandFactor;
                const z = Math.cos(spiralAngle) * p.spiralRadius * expandFactor;
                
                positions[i * 3] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = z;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Flicker light - SMOOTHED: Layered sine waves for natural flame glow
        if (this.fireLight) {
            // Multiple overlapping waves create organic flicker without jitter
            const flicker1 = Math.sin(time * 2.0) * 0.15;
            const flicker2 = Math.sin(time * 3.1 + 1.0) * 0.1;
            const flicker3 = Math.sin(time * 4.7 + 2.0) * 0.05;
            this.fireLight.intensity = 2 + flicker1 + flicker2 + flicker3;
        }
    }
    
    getLight() {
        return this.fireLight;
    }
    
    getParticles() {
        return this.particles;
    }
    
    getTrigger() {
        if (!this.group) return null;
        
        return {
            type: 'warm_campfire',
            x: this.group.position.x,
            z: this.group.position.z,
            radius: 3,
            message: '🔥 Warm yourself by the fire',
            emote: 'Sit'
        };
    }
}

export default Campfire;

