/**
 * Pond - Serene pond with lily pads for frog spaces
 * Features floating lily pads, water ripples, and a peaceful entrance
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class Pond extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {boolean} withEntrance - Include the entrance (lily pad bridge)
     */
    constructor(THREE, withEntrance = true) {
        super(THREE);
        this.withEntrance = withEntrance;
        this.matManager = getMaterialManager(THREE);
        this.pondRadius = 3.2;
        this.pondDepth = 0.3;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'pond';
        group.position.set(x, y, z);
        
        // Materials
        const waterMat = this.matManager.get(0x4A90E2, { 
            roughness: 0.1, 
            metalness: 0.1,
            transparent: true,
            opacity: 0.7,
            emissive: 0x1A4A7A,
            emissiveIntensity: 0.2
        });
        const lilyPadMat = this.matManager.get(0x2D5016, { roughness: 0.8 });
        const lilyPadTopMat = this.matManager.get(0x4A7C2A, { roughness: 0.6 });
        const lilyFlowerMat = this.matManager.get(0xFFB6C1, { roughness: 0.4 });
        const mudMat = this.matManager.get(0x3E2723, { roughness: 0.9 });
        const reedsMat = this.matManager.get(0x558B2F, { roughness: 0.7 });
        
        // Main pond water (slightly depressed circular pool)
        const pondGeo = new THREE.CylinderGeometry(this.pondRadius, this.pondRadius, this.pondDepth, 32);
        const pond = new THREE.Mesh(pondGeo, waterMat);
        pond.position.y = -this.pondDepth / 2;
        pond.rotation.x = Math.PI / 2;
        pond.receiveShadow = true;
        this.addMesh(pond, group);
        
        // Mud bottom
        const mudGeo = new THREE.CylinderGeometry(this.pondRadius * 0.98, this.pondRadius * 0.98, 0.1, 32);
        const mud = new THREE.Mesh(mudGeo, mudMat);
        mud.position.y = -this.pondDepth / 2 - 0.05;
        mud.rotation.x = Math.PI / 2;
        this.addMesh(mud, group);
        
        // Lily pads around the pond
        this.createLilyPads(group, lilyPadMat, lilyPadTopMat, lilyFlowerMat);
        
        // Reeds around the edge
        this.createReeds(group, reedsMat);
        
        // Entrance bridge (lily pad path)
        if (this.withEntrance) {
            this.createLilyPadBridge(group, lilyPadMat, lilyPadTopMat, waterMat);
        }
        
        // Water ripples (subtle animated effect)
        this.createWaterRipples(group, waterMat);
        
        return this;
    }
    
    createLilyPads(group, lilyPadMat, lilyPadTopMat, lilyFlowerMat) {
        const THREE = this.THREE;
        const padCount = 8;
        const padPositions = [
            { angle: 0.3, radius: 2.0, hasFlower: true },
            { angle: 1.2, radius: 2.3, hasFlower: false },
            { angle: 2.1, radius: 2.1, hasFlower: true },
            { angle: 3.0, radius: 2.4, hasFlower: false },
            { angle: 4.2, radius: 2.2, hasFlower: true },
            { angle: 5.1, radius: 2.5, hasFlower: false },
            { angle: 5.8, radius: 2.0, hasFlower: true },
            { angle: 0.8, radius: 2.3, hasFlower: false },
        ];
        
        padPositions.forEach((pad, i) => {
            // Skip pads near entrance
            if (Math.abs(Math.sin(pad.angle)) < 0.3 && Math.cos(pad.angle) > 0) return;
            
            const x = Math.cos(pad.angle) * pad.radius;
            const z = Math.sin(pad.angle) * pad.radius;
            const padY = -this.pondDepth / 2 + 0.05;
            
            // Lily pad (circular leaf)
            const padSize = 0.4 + Math.random() * 0.2;
            const padGeo = new THREE.CircleGeometry(padSize, 16);
            const padMesh = new THREE.Mesh(padGeo, lilyPadTopMat);
            padMesh.position.set(x, padY, z);
            padMesh.rotation.x = -Math.PI / 2;
            padMesh.rotation.z = Math.random() * Math.PI * 2;
            this.addMesh(padMesh, group);
            
            // Underside of pad (darker)
            const padBottom = new THREE.Mesh(padGeo, lilyPadMat);
            padBottom.position.set(x, padY - 0.02, z);
            padBottom.rotation.x = Math.PI / 2;
            padBottom.rotation.z = padMesh.rotation.z;
            this.addMesh(padBottom, group);
            
            // Lily flower (if this pad has one)
            if (pad.hasFlower) {
                const flowerGeo = new THREE.ConeGeometry(0.08, 0.15, 8);
                const flower = new THREE.Mesh(flowerGeo, lilyFlowerMat);
                flower.position.set(x, padY + 0.1, z);
                this.addMesh(flower, group);
                
                // Petals
                for (let p = 0; p < 6; p++) {
                    const petalAngle = (p / 6) * Math.PI * 2;
                    const petalGeo = new THREE.SphereGeometry(0.06, 8, 6);
                    const petal = new THREE.Mesh(petalGeo, lilyFlowerMat);
                    petal.position.set(
                        x + Math.cos(petalAngle) * 0.1,
                        padY + 0.12,
                        z + Math.sin(petalAngle) * 0.1
                    );
                    petal.scale.set(1, 0.5, 1);
                    this.addMesh(petal, group);
                }
            }
        });
    }
    
    createReeds(group, reedsMat) {
        const THREE = this.THREE;
        const reedCount = 12;
        
        for (let i = 0; i < reedCount; i++) {
            const angle = (i / reedCount) * Math.PI * 2;
            // Skip reeds near entrance
            if (Math.abs(Math.sin(angle)) < 0.3 && Math.cos(angle) > 0) continue;
            
            const x = Math.cos(angle) * (this.pondRadius + 0.3);
            const z = Math.sin(angle) * (this.pondRadius + 0.3);
            const height = 0.4 + Math.random() * 0.3;
            
            // Reed stem
            const reedGeo = new THREE.CylinderGeometry(0.02, 0.02, height, 6);
            const reed = new THREE.Mesh(reedGeo, reedsMat);
            reed.position.set(x, height / 2, z);
            reed.rotation.z = (Math.random() - 0.5) * 0.3;
            reed.rotation.x = (Math.random() - 0.5) * 0.2;
            this.addMesh(reed, group);
            
            // Reed top (slight curve)
            const topGeo = new THREE.ConeGeometry(0.03, 0.1, 6);
            const top = new THREE.Mesh(topGeo, reedsMat);
            top.position.set(x, height + 0.05, z);
            top.rotation.z = reed.rotation.z + 0.2;
            this.addMesh(top, group);
        }
    }
    
    createLilyPadBridge(group, lilyPadMat, lilyPadTopMat, waterMat) {
        const THREE = this.THREE;
        const bridgeZ = this.pondRadius * 0.6;
        const bridgePadCount = 3;
        
        // Create a path of lily pads leading to entrance
        for (let i = 0; i < bridgePadCount; i++) {
            const padX = (i - 1) * 0.8;
            const padZ = bridgeZ + i * 0.3;
            const padY = -this.pondDepth / 2 + 0.05;
            
            // Larger bridge pad
            const padSize = 0.5;
            const padGeo = new THREE.CircleGeometry(padSize, 16);
            const padMesh = new THREE.Mesh(padGeo, lilyPadTopMat);
            padMesh.position.set(padX, padY, padZ);
            padMesh.rotation.x = -Math.PI / 2;
            this.addMesh(padMesh, group);
            
            // Underside
            const padBottom = new THREE.Mesh(padGeo, lilyPadMat);
            padBottom.position.set(padX, padY - 0.02, padZ);
            padBottom.rotation.x = Math.PI / 2;
            this.addMesh(padBottom, group);
        }
        
        // Entrance glow (warm light from interior)
        const glowGeo = new THREE.CircleGeometry(0.6, 16);
        const warmGlow = this.matManager.get(0x90EE90, { 
            emissive: 0x4A7C2A, 
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.5
        });
        const glow = new THREE.Mesh(glowGeo, warmGlow);
        glow.position.set(0, -this.pondDepth / 2 + 0.1, bridgeZ + 0.5);
        glow.rotation.x = -Math.PI / 2;
        this.addMesh(glow, group);
    }
    
    createWaterRipples(group, waterMat) {
        const THREE = this.THREE;
        // Subtle ripple rings for visual interest
        const rippleCount = 3;
        
        for (let i = 0; i < rippleCount; i++) {
            const radius = 1.5 + i * 0.5;
            const rippleGeo = new THREE.RingGeometry(radius - 0.05, radius + 0.05, 32);
            const rippleMat = this.matManager.get(0x4A90E2, {
                transparent: true,
                opacity: 0.3 - i * 0.1,
                side: THREE.DoubleSide
            });
            const ripple = new THREE.Mesh(rippleGeo, rippleMat);
            ripple.position.y = -this.pondDepth / 2 + 0.01;
            ripple.rotation.x = -Math.PI / 2;
            this.addMesh(ripple, group);
        }
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = this.pondRadius + 0.5;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: 0.5,
        };
    }
    
    getTrigger() {
        if (!this.group || !this.withEntrance) return null;
        
        return {
            x: this.group.position.x,
            z: this.group.position.z + this.pondRadius + 2.2,
            radius: 1.5,
            type: 'enter_space',
            data: {}
        };
    }
}

export default Pond;
