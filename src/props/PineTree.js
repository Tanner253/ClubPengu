/**
 * PineTree - Snow-covered pine tree prop
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class PineTree extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {string} size - 'small' | 'medium' | 'large'
     */
    constructor(THREE, size = 'medium') {
        super(THREE);
        this.size = size;
        this.matManager = getMaterialManager(THREE);
    }
    
    /**
     * Size configurations
     */
    static SIZES = {
        small:  { trunkH: 1.5, trunkR: 0.2, layers: 3, baseRadius: 1.5, layerH: 1.2, snowDepth: 0.15 },
        medium: { trunkH: 2.5, trunkR: 0.3, layers: 4, baseRadius: 2.2, layerH: 1.5, snowDepth: 0.2 },
        large:  { trunkH: 3.5, trunkR: 0.4, layers: 5, baseRadius: 3.0, layerH: 1.8, snowDepth: 0.25 },
    };
    
    /**
     * Layer color rotation
     */
    static LAYER_COLORS = [
        PropColors.pineDeep,
        PropColors.pineDark,
        PropColors.pineMedium,
        PropColors.pineLight,
        PropColors.pineMedium,
    ];
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const cfg = PineTree.SIZES[this.size] || PineTree.SIZES.medium;
        const group = this.createGroup(scene);
        group.name = `pine_tree_${this.size}`;
        group.position.set(x, y, z);
        
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(cfg.trunkR * 0.7, cfg.trunkR, cfg.trunkH, 8);
        const trunkMat = this.matManager.get(PropColors.barkMedium, { roughness: 0.95 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = cfg.trunkH / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.addMesh(trunk, group);
        
        // Pine layers (cones with snow caps)
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        let currentY = cfg.trunkH * 0.6;
        
        for (let i = 0; i < cfg.layers; i++) {
            const layerRatio = 1 - (i / cfg.layers) * 0.7;
            const radius = cfg.baseRadius * layerRatio;
            const height = cfg.layerH * layerRatio;
            
            // Pine cone layer
            const coneGeo = new THREE.ConeGeometry(radius, height, 8);
            const coneMat = this.matManager.get(PineTree.LAYER_COLORS[i % PineTree.LAYER_COLORS.length], { roughness: 0.9 });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.y = currentY + height / 2;
            cone.castShadow = true;
            cone.receiveShadow = true;
            this.addMesh(cone, group);
            
            // Snow cap on top of this layer
            const snowRadius = radius * 0.85;
            const snowGeo = new THREE.ConeGeometry(snowRadius, cfg.snowDepth, 8);
            const snow = new THREE.Mesh(snowGeo, snowMat);
            snow.position.y = currentY + height - cfg.snowDepth / 2;
            snow.castShadow = true;
            this.addMesh(snow, group);
            
            // Snow clumps on branches (only on larger trees, bottom 2 layers)
            if (this.size !== 'small' && i < 2) {
                const clumpCount = 2;
                for (let j = 0; j < clumpCount; j++) {
                    const angle = (j / clumpCount) * Math.PI * 2;
                    const dist = radius * 0.6;
                    const clumpGeo = new THREE.SphereGeometry(0.18, 4, 4);
                    const clump = new THREE.Mesh(clumpGeo, snowMat);
                    clump.position.set(
                        Math.cos(angle) * dist,
                        currentY + height * 0.4,
                        Math.sin(angle) * dist
                    );
                    clump.scale.y = 0.5;
                    this.addMesh(clump, group);
                }
            }
            
            currentY += height * 0.65;
        }
        
        // Top snow cap
        const topSnowGeo = new THREE.SphereGeometry(cfg.snowDepth * 2, 6, 6);
        const topSnow = new THREE.Mesh(topSnowGeo, this.matManager.get(PropColors.snowBright));
        topSnow.position.y = currentY + cfg.snowDepth;
        topSnow.scale.set(1, 0.6, 1);
        this.addMesh(topSnow, group);
        
        // Store collision data
        this.collisionData = {
            type: 'cylinder',
            radius: cfg.trunkR + 0.3,
            height: cfg.trunkH + cfg.layers * cfg.layerH * 0.65,
        };
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.collisionData || !this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = this.collisionData.radius;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: this.collisionData.height,
        };
    }
}

export default PineTree;

