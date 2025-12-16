/**
 * ChristmasTree - Decorated Christmas tree with lights and presents
 */

import BaseProp from './BaseProp';
import { getMaterialManager } from './PropMaterials';

class ChristmasTree extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     */
    constructor(THREE) {
        super(THREE);
        this.matManager = getMaterialManager(THREE);
        this.ornamentMeshes = [];
        this.starGlow = null;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'christmas_tree';
        group.position.set(x, y, z);
        
        const trunkHeight = 1.2;
        const trunkRadius = 0.4;
        const treeHeight = 9;
        const tiers = 5;
        
        // Trunk
        const trunkMat = this.matManager.get(0x4A3520, { roughness: 0.9 });
        const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 8);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        this.addMesh(trunk, group);
        
        // Foliage tiers
        const foliageColors = [0x1B5E20, 0x2E7D32, 0x388E3C, 0x43A047, 0x4CAF50];
        let currentY = trunkHeight;
        const tierData = [];
        
        for (let i = 0; i < tiers; i++) {
            const tierScale = 1 - (i / tiers) * 0.75;
            const baseRadius = 2.8 * tierScale;
            const tierHeight = (treeHeight / tiers) * 1.15;
            
            const mainMat = this.matManager.get(foliageColors[i], { roughness: 0.8 });
            const mainGeo = new THREE.ConeGeometry(baseRadius, tierHeight, 12);
            const mainCone = new THREE.Mesh(mainGeo, mainMat);
            mainCone.position.y = currentY + tierHeight / 2;
            mainCone.castShadow = true;
            mainCone.receiveShadow = true;
            this.addMesh(mainCone, group);
            
            tierData.push({ y: currentY + tierHeight * 0.4, radius: baseRadius * 0.85 });
            currentY += tierHeight * 0.5;
        }
        
        // Golden star on top
        this.createStar(group, currentY + 1.5);
        
        // Christmas lights
        this.createLights(group, tierData);
        
        // Decorative baubles
        this.createBaubles(group, tierData);
        
        // Presents around base
        this.createPresents(group);
        
        // Snow around base
        const snowMat = this.matManager.get(0xE8E8F0, { roughness: 1.0 });
        const snowGeo = new THREE.CylinderGeometry(3, 3.5, 0.15, 16);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 0.07;
        snow.receiveShadow = true;
        this.addMesh(snow, group);
        
        return this;
    }
    
    createStar(group, starY) {
        const THREE = this.THREE;
        
        const starCoreMat = this.matManager.get(0xFFD700, { 
            metalness: 0.9, 
            roughness: 0.1,
            emissive: 0xFFCC00,
            emissiveIntensity: 2.0
        });
        
        const starShape = new THREE.Shape();
        const starPoints = 5;
        const outerRadius = 0.6;
        const innerRadius = 0.25;
        
        for (let i = 0; i < starPoints * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i / (starPoints * 2)) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) starShape.moveTo(x, y);
            else starShape.lineTo(x, y);
        }
        starShape.closePath();
        
        const starGeo = new THREE.ExtrudeGeometry(starShape, { 
            depth: 0.15, 
            bevelEnabled: true, 
            bevelThickness: 0.03, 
            bevelSize: 0.02 
        });
        const star = new THREE.Mesh(starGeo, starCoreMat);
        star.position.y = starY;
        star.position.z = -0.07;
        this.addMesh(star, group);
        
        // Star glow light
        this.starGlow = new THREE.PointLight(0xFFDD88, 0.6, 15);
        this.starGlow.position.y = starY;
        this.starGlow.castShadow = false;
        this.starGlow.name = 'starGlow';
        this.addLight(this.starGlow, group);
    }
    
    createLights(group, tierData) {
        const THREE = this.THREE;
        const lightColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFF6600, 0xFF0066];
        
        tierData.forEach((tier, tierIdx) => {
            const lightsOnTier = 8;
            for (let i = 0; i < lightsOnTier; i++) {
                const angle = (i / lightsOnTier) * Math.PI * 2 + tierIdx * 0.4;
                const ox = Math.cos(angle) * tier.radius * 0.92;
                const oz = Math.sin(angle) * tier.radius * 0.92;
                const oy = tier.y + (Math.random() - 0.5) * 0.5;
                
                const color = lightColors[(tierIdx + i) % lightColors.length];
                
                const bulbMat = this.matManager.get(color, { 
                    metalness: 0.0, 
                    roughness: 0.2,
                    emissive: color,
                    emissiveIntensity: 2.5
                });
                const bulbGeo = new THREE.SphereGeometry(0.14, 8, 8);
                const bulb = new THREE.Mesh(bulbGeo, bulbMat);
                bulb.position.set(ox, oy, oz);
                bulb.userData.baseEmissive = 2.5;
                bulb.userData.phaseOffset = Math.random() * Math.PI * 2;
                bulb.userData.speed = 0.5 + Math.random() * 0.8;
                bulb.userData.color = color;
                this.addMesh(bulb, group);
                this.ornamentMeshes.push(bulb);
            }
        });
    }
    
    createBaubles(group, tierData) {
        const THREE = this.THREE;
        const baubleColors = [0xCC0000, 0xFFD700, 0x0055AA, 0x008800];
        
        tierData.slice(0, 3).forEach((tier, tidx) => {
            for (let i = 0; i < 2; i++) {
                const angle = (i / 2) * Math.PI * 2 + tidx * 1.2;
                const bx = Math.cos(angle) * tier.radius * 0.7;
                const bz = Math.sin(angle) * tier.radius * 0.7;
                
                const baubleMat = this.matManager.get(baubleColors[(tidx + i) % baubleColors.length], {
                    metalness: 0.7,
                    roughness: 0.15
                });
                const baubleGeo = new THREE.SphereGeometry(0.2, 10, 10);
                const bauble = new THREE.Mesh(baubleGeo, baubleMat);
                bauble.position.set(bx, tier.y, bz);
                this.addMesh(bauble, group);
                
                // Silver cap
                const capMat = this.matManager.get(0xC0C0C0, { metalness: 0.9, roughness: 0.1 });
                const capGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.08, 6);
                const cap = new THREE.Mesh(capGeo, capMat);
                cap.position.set(bx, tier.y + 0.22, bz);
                this.addMesh(cap, group);
            }
        });
    }
    
    createPresents(group) {
        const THREE = this.THREE;
        const presentColors = [
            { box: 0xCC0000, ribbon: 0xFFD700 },
            { box: 0x0055CC, ribbon: 0xFFFFFF },
            { box: 0x008833, ribbon: 0xCC0000 },
            { box: 0x9933CC, ribbon: 0xFFFFFF },
            { box: 0xFF6600, ribbon: 0x00CC00 },
        ];
        
        const presentPositions = [
            { x: 1.8, z: 0.6 },
            { x: -1.5, z: 1.0 },
            { x: 0.3, z: 1.8 },
            { x: -1.0, z: -1.3 },
            { x: 1.3, z: -1.0 },
        ];
        
        presentPositions.forEach((pos, idx) => {
            const colorSet = presentColors[idx % presentColors.length];
            const w = 0.5 + Math.random() * 0.3;
            const h = 0.35 + Math.random() * 0.25;
            const d = 0.5 + Math.random() * 0.3;
            
            // Present box
            const presentMat = this.matManager.get(colorSet.box, { roughness: 0.6 });
            const presentGeo = new THREE.BoxGeometry(w, h, d);
            const present = new THREE.Mesh(presentGeo, presentMat);
            present.position.set(pos.x, h / 2, pos.z);
            present.rotation.y = Math.random() * 0.5;
            present.castShadow = true;
            this.addMesh(present, group);
            
            // Ribbons
            const ribbonMat = this.matManager.get(colorSet.ribbon, { roughness: 0.4 });
            
            const ribbonHGeo = new THREE.BoxGeometry(w + 0.02, 0.05, 0.1);
            const ribbonH = new THREE.Mesh(ribbonHGeo, ribbonMat);
            ribbonH.position.set(pos.x, h + 0.02, pos.z);
            ribbonH.rotation.y = present.rotation.y;
            this.addMesh(ribbonH, group);
            
            const ribbonVGeo = new THREE.BoxGeometry(0.1, 0.05, d + 0.02);
            const ribbonV = new THREE.Mesh(ribbonVGeo, ribbonMat);
            ribbonV.position.set(pos.x, h + 0.02, pos.z);
            ribbonV.rotation.y = present.rotation.y;
            this.addMesh(ribbonV, group);
            
            // Bow
            const bowGeo = new THREE.SphereGeometry(0.08, 6, 6);
            const bow = new THREE.Mesh(bowGeo, ribbonMat);
            bow.position.set(pos.x, h + 0.1, pos.z);
            bow.scale.y = 0.6;
            this.addMesh(bow, group);
        });
    }
    
    update(time, delta, nightFactor = 0.5) {
        // Twinkle Christmas lights
        this.ornamentMeshes.forEach(mesh => {
            const twinkle = Math.sin(time * mesh.userData.speed + mesh.userData.phaseOffset);
            const baseBrightness = 0.6 + nightFactor * 0.4;
            const brightness = baseBrightness + twinkle * 0.3;
            if (mesh.material.emissiveIntensity !== undefined) {
                mesh.material.emissiveIntensity = mesh.userData.baseEmissive * brightness;
            }
        });
        
        // Star glow pulse
        if (this.starGlow) {
            const starPulse = Math.sin(time * 0.5) * 0.15 + 0.85;
            const baseIntensity = 0.5 + nightFactor * 0.5;
            this.starGlow.intensity = baseIntensity * starPulse;
        }
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        
        return {
            minX: x - 0.5,
            maxX: x + 0.5,
            minZ: z - 0.5,
            maxZ: z + 0.5,
            height: 10,
        };
    }
    
    getLights() {
        return this.starGlow ? [this.starGlow] : [];
    }
}

export default ChristmasTree;

