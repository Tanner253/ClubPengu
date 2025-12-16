/**
 * Speaker - Large speaker cabinet with woofer animation
 */

import BaseProp from '../BaseProp';

class Speaker extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.woofer = null;
        this.scale = 1;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        
        const { scale = 1, rotation = 0 } = options;
        this.scale = scale;
        
        const sw = 2 * scale;
        const sh = 4 * scale;
        const sd = 1.5 * scale;
        
        // Cabinet
        const cabMat = this.createMaterial({ color: 0x1a1a1a, roughness: 0.7 });
        const cabGeo = new THREE.BoxGeometry(sw, sh, sd);
        const cab = new THREE.Mesh(cabGeo, cabMat);
        cab.position.y = sh / 2;
        cab.castShadow = true;
        this.addMesh(cab, group);
        
        // Grille
        const grilleMat = this.createMaterial({ color: 0x2a2a2a, roughness: 0.5 });
        const grilleGeo = new THREE.BoxGeometry(sw - 0.2, sh - 0.2, 0.1);
        const grille = new THREE.Mesh(grilleGeo, grilleMat);
        grille.position.set(0, sh / 2, sd / 2 + 0.05);
        this.addMesh(grille, group);
        
        // Woofer
        const wooferMat = this.createMaterial({ color: 0x333333, roughness: 0.4 });
        const wooferGeo = new THREE.CylinderGeometry(sw * 0.35, sw * 0.4, 0.3, 20);
        const woofer = new THREE.Mesh(wooferGeo, wooferMat);
        woofer.rotation.x = Math.PI / 2;
        woofer.position.set(0, sh * 0.35, sd / 2 + 0.2);
        woofer.userData.isWoofer = true;
        woofer.userData.baseZ = sd / 2 + 0.2;
        this.addMesh(woofer, group);
        this.woofer = woofer;
        
        // Tweeter
        const tweeterGeo = new THREE.SphereGeometry(sw * 0.1, 12, 12);
        const tweeter = new THREE.Mesh(tweeterGeo, wooferMat);
        tweeter.position.set(0, sh * 0.75, sd / 2 + 0.1);
        this.addMesh(tweeter, group);
        
        group.rotation.y = rotation;
        this.setPosition(x, y, z);
        
        return this;
    }
    
    update(time, delta) {
        if (this.woofer) {
            const bassIntensity = Math.sin(time * 15) * 0.5 + 0.5;
            this.woofer.position.z = this.woofer.userData.baseZ + bassIntensity * 0.15;
            const scale = 1 + bassIntensity * 0.05;
            this.woofer.scale.set(scale, scale, 1);
        }
    }
    
    getSize() {
        const sw = 2 * this.scale;
        const sh = 4 * this.scale;
        const sd = 1.5 * this.scale;
        return { width: sw, height: sh, depth: sd };
    }
    
    getLandingSurface() {
        const size = this.getSize();
        return {
            name: 'speaker',
            minX: -size.width / 2 - 0.3,
            maxX: size.width / 2 + 0.3,
            minZ: -size.depth / 2 - 0.3,
            maxZ: size.depth / 2 + 0.3,
            height: size.height
        };
    }
}

export default Speaker;

