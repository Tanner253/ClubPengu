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
        
        // Flame cones
        const flameMat = new THREE.MeshBasicMaterial({ 
            color: 0xFF4500, 
            transparent: true, 
            opacity: 0.9 
        });
        const flameGeo = new THREE.ConeGeometry(0.3, 1.2, 8);
        
        for (let i = 0; i < 3; i++) {
            const flame = new THREE.Mesh(flameGeo, flameMat.clone());
            flame.material.color.setHex([0xFF4500, 0xFF6600, 0xFFAA00][i]);
            flame.position.set(
                (Math.random() - 0.5) * 0.4,
                0.5 + i * 0.15,
                (Math.random() - 0.5) * 0.4
            );
            flame.scale.set(1 - i * 0.2, 1, 1 - i * 0.2);
            flame.userData.isFlame = true;
            flame.userData.baseY = flame.position.y;
            flame.userData.offset = Math.random() * Math.PI * 2;
            this.flames.push(flame);
            this.addMesh(flame, group);
        }
        
        // Ember particles
        const particleCount = 30;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.8;
            positions[i * 3 + 1] = Math.random() * 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
            
            const color = new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMat = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(particleGeo, particleMat);
        this.particles.userData.isEmbers = true;
        this.addMesh(this.particles, group);
    }
    
    update(time) {
        if (!this.isLit) return;
        
        // Animate flames
        this.flames.forEach(flame => {
            const t = time + flame.userData.offset;
            flame.position.y = flame.userData.baseY + Math.sin(t * 5) * 0.05;
            flame.scale.x = 0.8 + Math.sin(t * 7) * 0.2;
            flame.scale.z = 0.8 + Math.cos(t * 6) * 0.2;
        });
        
        // Animate ember particles
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] += 0.01; // Rise up
                
                // Reset when too high
                if (positions[i * 3 + 1] > 2.5) {
                    positions[i * 3] = (Math.random() - 0.5) * 0.8;
                    positions[i * 3 + 1] = 0.5;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
                }
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Flicker light
        if (this.fireLight) {
            this.fireLight.intensity = 2 + Math.sin(time * 10) * 0.3;
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

