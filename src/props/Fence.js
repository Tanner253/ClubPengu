/**
 * Fence - Wooden fence section
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class Fence extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {number} length - Length of fence section
     */
    constructor(THREE, length = 4) {
        super(THREE);
        this.length = length;
        this.matManager = getMaterialManager(THREE);
        this.postHeight = 1.2;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'fence';
        group.position.set(x, y, z);
        
        const woodMat = this.matManager.get(PropColors.plankMedium, { roughness: 0.9 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        const postSpacing = 2;
        const postCount = Math.ceil(this.length / postSpacing) + 1;
        
        // Posts
        const postGeo = new THREE.BoxGeometry(0.12, this.postHeight, 0.12);
        for (let i = 0; i < postCount; i++) {
            const post = new THREE.Mesh(postGeo, woodMat);
            post.position.set(-this.length/2 + i * postSpacing, this.postHeight/2, 0);
            post.castShadow = true;
            this.addMesh(post, group);
            
            // Snow cap on post
            const capGeo = new THREE.SphereGeometry(0.1, 6, 6);
            const cap = new THREE.Mesh(capGeo, snowMat);
            cap.position.set(-this.length/2 + i * postSpacing, this.postHeight + 0.05, 0);
            cap.scale.set(1.2, 0.4, 1.2);
            this.addMesh(cap, group);
        }
        
        // Rails
        const railGeo = new THREE.BoxGeometry(this.length, 0.08, 0.06);
        [0.4, 0.8].forEach(h => {
            const rail = new THREE.Mesh(railGeo, woodMat);
            rail.position.y = h;
            rail.castShadow = true;
            this.addMesh(rail, group);
        });
        
        // Snow on top rail
        const snowGeo = new THREE.BoxGeometry(this.length - 0.2, 0.05, 0.12);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 0.88;
        this.addMesh(snow, group);
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        
        return {
            minX: x - this.length/2 - 0.1,
            maxX: x + this.length/2 + 0.1,
            minZ: z - 0.15,
            maxZ: z + 0.15,
            height: this.postHeight,
        };
    }
}

export default Fence;

