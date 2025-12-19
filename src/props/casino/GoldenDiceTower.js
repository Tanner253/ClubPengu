/**
 * GoldenDiceTower - Decorative tower made of stacked golden dice
 * Features animated rotation and glow effects
 * 
 * OPTIMIZED VERSION:
 * - Shared geometry caching via PropGeometries
 * - Simplified pip geometry (reduced segments)
 * - Shared materials for same-colored elements
 * - Throttled animations with state caching
 */

import BaseProp from '../BaseProp';
import { getMaterialManager } from '../PropMaterials';
import { getGeometryManager } from '../PropGeometries';

class GoldenDiceTower extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.dice = [];
        this.glowRings = [];
        this.gem = null;
        this.matManager = getMaterialManager(THREE);
        this.geoManager = getGeometryManager(THREE);
        this.lastUpdateTime = 0;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'golden_dice_tower';
        
        const {
            diceCount = 5,
            diceSize = 1.5,
            baseRadius = 2.5,
            goldIntensity = 0.8
        } = options;
        
        // Shared materials
        const baseMat = this.matManager.get(0x1a0a2e, { roughness: 0.8, metalness: 0.2 });
        const goldMat = this.matManager.get(0xFFD700, {
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0xFFD700,
            emissiveIntensity: goldIntensity * 0.3
        });
        const pipMat = this.matManager.get(0x1a0a2e, { roughness: 0.5, metalness: 0.1 });
        
        // Shared geometries for base
        const baseGeo1 = this.geoManager.get('Cylinder', [baseRadius, baseRadius + 0.3, 0.5, 12]);
        const baseGeo2 = this.geoManager.get('Cylinder', [baseRadius - 0.3, baseRadius, 0.4, 12]);
        const baseGeo3 = this.geoManager.get('Cylinder', [baseRadius - 0.5, baseRadius - 0.3, 0.3, 12]);
        
        // Multi-tiered base
        const base1 = new THREE.Mesh(baseGeo1, goldMat);
        base1.position.y = 0.25;
        this.addMesh(base1, group);
        
        const base2 = new THREE.Mesh(baseGeo2, baseMat);
        base2.position.y = 0.7;
        this.addMesh(base2, group);
        
        const base3 = new THREE.Mesh(baseGeo3, goldMat);
        base3.position.y = 1.05;
        this.addMesh(base3, group);
        
        // Create stacked dice with shared geometries
        let currentY = 1.5;
        for (let d = 0; d < diceCount; d++) {
            const size = diceSize * (1 - d * 0.05);
            const dice = this.createDice(THREE, size, goldMat, pipMat);
            
            // Alternate rotations for visual interest
            dice.rotation.y = d * Math.PI / 6;
            dice.rotation.z = Math.sin(d * 0.5) * 0.1;
            
            dice.position.y = currentY + size / 2;
            dice.userData.diceIndex = d;
            dice.userData.baseY = currentY + size / 2;
            dice.userData.baseRotY = d * Math.PI / 6;
            
            this.dice.push(dice);
            group.add(dice);
            
            currentY += size * 0.9;
        }
        
        // Create glow rings between dice - shared geometry
        const ringGeo = this.geoManager.get('Torus', [diceSize * 0.6, 0.08, 6, 16]);
        
        for (let r = 0; r < diceCount - 1; r++) {
            // Clone material so each ring can animate independently
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0xFF1493,
                emissive: 0xFF1493,
                emissiveIntensity: 0.8,
                transparent: true,
                opacity: 0.8
            });
            this.materials.push(ringMat);
            
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 1.5 + (r + 1) * diceSize * 0.9;
            ring.userData.ringIndex = r;
            this.addMesh(ring, group);
            this.glowRings.push(ring);
        }
        
        // Top crown decoration
        this.createCrown(group, currentY, goldMat);
        
        // Add point light at top - skip on Apple/Mobile for performance
        const needsOptimization = typeof window !== 'undefined' && (window._isAppleDevice || window._isMobileGPU);
        if (!needsOptimization) {
            const topLight = new THREE.PointLight(0xFFD700, 1.5, 10);
            topLight.position.y = currentY + 1;
            this.addLight(topLight, group);
        }
        
        this.setPosition(x, y, z);
        return this;
    }
    
    createDice(THREE, size, goldMat, pipMat) {
        const diceGroup = new THREE.Group();
        
        // Main cube - cached geometry
        const cubeGeo = this.geoManager.get('Box', [size, size, size]);
        const cube = new THREE.Mesh(cubeGeo, goldMat);
        diceGroup.add(cube);
        
        // Dice pips - shared geometry with reduced segments
        const pipGeo = this.geoManager.get('Cylinder', [size * 0.08, size * 0.08, size * 0.05, 6]);
        
        // Face configurations (standard dice layout)
        const faces = [
            { normal: [0, 0, 1], pips: [[0, 0]] }, // 1
            { normal: [1, 0, 0], pips: [[-0.25, 0.25], [0.25, -0.25]] }, // 2
            { normal: [0, 1, 0], pips: [[-0.25, 0.25], [0, 0], [0.25, -0.25]] }, // 3
            { normal: [0, -1, 0], pips: [[-0.25, -0.25], [-0.25, 0.25], [0.25, -0.25], [0.25, 0.25]] }, // 4
            { normal: [-1, 0, 0], pips: [[-0.25, -0.25], [-0.25, 0.25], [0, 0], [0.25, -0.25], [0.25, 0.25]] }, // 5
            { normal: [0, 0, -1], pips: [[-0.25, -0.25], [-0.25, 0], [-0.25, 0.25], [0.25, -0.25], [0.25, 0], [0.25, 0.25]] } // 6
        ];
        
        faces.forEach(face => {
            const [nx, ny, nz] = face.normal;
            const faceOffset = size / 2 + size * 0.01;
            
            face.pips.forEach(([px, pz]) => {
                const pip = new THREE.Mesh(pipGeo, pipMat);
                
                // Position pip based on face normal
                if (nx !== 0) {
                    pip.rotation.z = Math.PI / 2;
                    pip.position.set(nx * faceOffset, px * size, pz * size);
                } else if (ny !== 0) {
                    pip.position.set(px * size, ny * faceOffset, pz * size);
                } else {
                    pip.rotation.x = Math.PI / 2;
                    pip.position.set(px * size, pz * size, nz * faceOffset);
                }
                
                diceGroup.add(pip);
            });
        });
        
        return diceGroup;
    }
    
    createCrown(group, currentY, goldMat) {
        const THREE = this.THREE;
        const crownGroup = new THREE.Group();
        crownGroup.position.y = currentY + 0.5;
        
        // Crown base - shared geometry
        const crownBaseGeo = this.geoManager.get('Cylinder', [0.4, 0.6, 0.3, 8]);
        const crownBaseMat = this.matManager.get(0xFFD700, {
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0xFFD700,
            emissiveIntensity: 0.5
        });
        const crownBase = new THREE.Mesh(crownBaseGeo, crownBaseMat);
        crownGroup.add(crownBase);
        
        // Crown points - shared geometry, reduced from 5 to 4
        const pointGeo = this.geoManager.get('Cone', [0.15, 0.6, 4]);
        for (let p = 0; p < 4; p++) {
            const angle = (p / 4) * Math.PI * 2;
            const point = new THREE.Mesh(pointGeo, crownBaseMat);
            point.position.set(
                Math.cos(angle) * 0.35,
                0.4,
                Math.sin(angle) * 0.35
            );
            crownGroup.add(point);
        }
        
        // Central gem - clone material for animation
        const gemMat = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 1.0,
            roughness: 0.1,
            metalness: 0.3
        });
        this.materials.push(gemMat);
        
        const gemGeo = this.geoManager.get('Icosahedron', [0.25, 0]);
        this.gem = new THREE.Mesh(gemGeo, gemMat);
        this.gem.position.y = 0.5;
        crownGroup.add(this.gem);
        
        group.add(crownGroup);
    }
    
    update(time, delta) {
        // Dice rotation ALWAYS updates (cheap operation, needs to be smooth)
        this.dice.forEach((dice) => {
            const idx = dice.userData.diceIndex;
            dice.position.y = dice.userData.baseY + Math.sin(time * 1.5 + idx * 0.8) * 0.1;
            dice.rotation.y = dice.userData.baseRotY + time * 0.3 + idx * 0.2;
            dice.rotation.x = Math.sin(time * 2 + idx) * 0.05;
            dice.rotation.z = Math.cos(time * 1.8 + idx * 0.5) * 0.05;
        });
        
        // Crown gem rotation ALWAYS updates (cheap, needs smooth spin)
        if (this.gem) {
            this.gem.rotation.y = time * 2;
            this.gem.rotation.x = Math.sin(time * 3) * 0.2;
        }
        
        // Throttle expensive material updates to every 80ms
        if (time - this.lastUpdateTime < 0.08) return;
        this.lastUpdateTime = time;
        
        // Animate glow rings (material updates are expensive - throttled)
        if (this.glowRings.length > 0) {
            this.glowRings.forEach((ring) => {
                const idx = ring.userData.ringIndex;
                const pulse = Math.sin(time * 4 + idx * Math.PI / 2) * 0.5 + 0.5;
                ring.material.emissiveIntensity = 0.5 + pulse * 0.5;
                ring.material.opacity = 0.5 + pulse * 0.3;
                ring.scale.setScalar(1 + pulse * 0.1);
                
                // Color shift - less frequently (expensive HSL conversion)
                if (Math.floor(time * 3) % 2 === 0) {
                    const hue = (time * 0.2 + idx * 0.15) % 1;
                    ring.material.emissive.setHSL(hue, 1, 0.5);
                    ring.material.color.setHSL(hue, 1, 0.5);
                }
            });
        }
        
        // Crown gem emissive pulse (throttled - material update)
        if (this.gem) {
            this.gem.material.emissiveIntensity = 0.8 + Math.sin(time * 5) * 0.2 + 0.2;
        }
    }
}

export default GoldenDiceTower;
