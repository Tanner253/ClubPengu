/**
 * Rock - Snow-dusted rock
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class Rock extends BaseProp {
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
        small: { scale: 0.5, segments: 4 },
        medium: { scale: 1.0, segments: 5 },
        large: { scale: 1.8, segments: 6 },
    };
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const cfg = Rock.SIZES[this.size] || Rock.SIZES.medium;
        const group = this.createGroup(scene);
        group.name = `rock_${this.size}`;
        group.position.set(x, y, z);
        
        const rockMat = this.matManager.get(PropColors.rockMedium, { roughness: 0.95 });
        const darkMat = this.matManager.get(PropColors.rockDark, { roughness: 0.95 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.65 });
        
        // Main rock body - icosahedron for natural look
        const rockGeo = new THREE.IcosahedronGeometry(0.8 * cfg.scale, cfg.segments);
        
        // Distort vertices for natural look
        const posAttr = rockGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            const z = posAttr.getZ(i);
            
            // Random displacement
            const noise = 1 + (Math.random() - 0.5) * 0.3;
            posAttr.setXYZ(i, x * noise, y * 0.6 * noise, z * noise);
        }
        rockGeo.computeVertexNormals();
        
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.y = 0.3 * cfg.scale;
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.addMesh(rock, group);
        
        // Smaller attached rocks
        const numSmall = Math.floor(1 + Math.random() * 2);
        for (let i = 0; i < numSmall; i++) {
            const smallGeo = new THREE.IcosahedronGeometry(0.3 * cfg.scale, 2);
            const smallRock = new THREE.Mesh(smallGeo, i % 2 === 0 ? rockMat : darkMat);
            const angle = (i / numSmall) * Math.PI * 2;
            smallRock.position.set(
                Math.cos(angle) * 0.6 * cfg.scale,
                0.15 * cfg.scale,
                Math.sin(angle) * 0.4 * cfg.scale
            );
            smallRock.scale.y = 0.7;
            smallRock.castShadow = true;
            this.addMesh(smallRock, group);
        }
        
        // Snow cap
        const snowGeo = new THREE.SphereGeometry(0.5 * cfg.scale, 8, 6);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 0.5 * cfg.scale;
        snow.scale.set(1.2, 0.3, 1.2);
        this.addMesh(snow, group);
        
        this.collisionScale = cfg.scale;
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 0.7 * (this.collisionScale || 1);
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: 0.8 * (this.collisionScale || 1),
        };
    }
}

export default Rock;

