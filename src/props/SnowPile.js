/**
 * SnowPile - Decorative snow pile/drift
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class SnowPile extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {string} size - 'small' | 'medium' | 'large'
     */
    constructor(THREE, size = 'medium') {
        super(THREE);
        this.size = size;
        this.matManager = getMaterialManager(THREE);
    }
    
    static SIZES = {
        small: { scale: 0.5, mounds: 1 },
        medium: { scale: 1.0, mounds: 2 },
        large: { scale: 1.5, mounds: 3 },
    };
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const cfg = SnowPile.SIZES[this.size] || SnowPile.SIZES.medium;
        const group = this.createGroup(scene);
        group.name = `snow_pile_${this.size}`;
        group.position.set(x, y, z);
        
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.65 });
        const shadowMat = this.matManager.get(PropColors.snowShadow, { roughness: 0.7 });
        
        // Main mound
        const mainGeo = new THREE.SphereGeometry(1 * cfg.scale, 12, 8);
        const main = new THREE.Mesh(mainGeo, snowMat);
        main.scale.set(1.5, 0.4, 1.2);
        main.position.y = 0.2 * cfg.scale;
        main.receiveShadow = true;
        this.addMesh(main, group);
        
        // Additional mounds
        for (let i = 0; i < cfg.mounds; i++) {
            const moundGeo = new THREE.SphereGeometry(0.6 * cfg.scale, 8, 6);
            const mound = new THREE.Mesh(moundGeo, i % 2 === 0 ? snowMat : shadowMat);
            const angle = (i / cfg.mounds) * Math.PI * 2;
            mound.position.set(
                Math.cos(angle) * 0.8 * cfg.scale,
                0.15 * cfg.scale,
                Math.sin(angle) * 0.6 * cfg.scale
            );
            mound.scale.set(1.2, 0.5, 1);
            mound.receiveShadow = true;
            this.addMesh(mound, group);
        }
        
        return this;
    }
    
    // Decorative only - no collision
    getCollisionBounds() {
        return null;
    }
}

export default SnowPile;

