/**
 * TrashCan - Metal trash can with lid and snow
 * OPTIMIZED: Uses cached geometries for all parts
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';
import { getGeometryManager } from './PropGeometries';

class TrashCan extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {boolean} withLid - Include lid on top
     */
    constructor(THREE, withLid = true) {
        super(THREE);
        this.withLid = withLid;
        this.matManager = getMaterialManager(THREE);
        this.geoManager = getGeometryManager(THREE);
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const geo = this.geoManager;
        const group = this.createGroup(scene);
        group.name = 'trash_can';
        group.position.set(x, y, z);
        
        const metalMat = this.matManager.get('#4A5A6A', { roughness: 0.6, metalness: 0.5 });
        const darkMat = this.matManager.get('#3A4A5A', { roughness: 0.7, metalness: 0.4 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        // Main body (tapered cylinder) (CACHED)
        const body = new THREE.Mesh(geo.cylinder(0.35, 0.3, 0.9, 12), metalMat);
        body.position.y = 0.45;
        body.castShadow = true;
        body.receiveShadow = true;
        this.addMesh(body, group);
        
        // Rim at top (CACHED)
        const rim = new THREE.Mesh(geo.torus(0.36, 0.03, 6, 16), darkMat);
        rim.position.y = 0.9;
        rim.rotation.x = Math.PI / 2;
        this.addMesh(rim, group);
        
        // Rim at bottom (CACHED)
        const bottomRim = new THREE.Mesh(geo.torus(0.31, 0.025, 6, 16), darkMat);
        bottomRim.position.y = 0.02;
        bottomRim.rotation.x = Math.PI / 2;
        this.addMesh(bottomRim, group);
        
        // Horizontal bands (CACHED - both share same geometry)
        const bandGeo = geo.torus(0.33, 0.015, 6, 16);
        [0.25, 0.55].forEach(yPos => {
            const band = new THREE.Mesh(bandGeo, darkMat);
            band.position.y = yPos;
            band.rotation.x = Math.PI / 2;
            this.addMesh(band, group);
        });
        
        // Handles on sides (CACHED - both share same geometry)
        const handleGeo = geo.torus(0.08, 0.015, 6, 8);
        [-1, 1].forEach(side => {
            const handle = new THREE.Mesh(handleGeo, darkMat);
            handle.position.set(side * 0.35, 0.7, 0);
            handle.rotation.y = side * Math.PI / 2;
            this.addMesh(handle, group);
        });
        
        // Lid
        if (this.withLid) {
            const lid = new THREE.Mesh(geo.cylinder(0.38, 0.36, 0.08, 12), metalMat);
            lid.position.y = 0.96;
            lid.castShadow = true;
            this.addMesh(lid, group);
            
            // Lid handle (CACHED)
            const lidHandle = new THREE.Mesh(geo.cylinder(0.05, 0.05, 0.08, 8), darkMat);
            lidHandle.position.y = 1.04;
            this.addMesh(lidHandle, group);
            
            // Snow on lid (CACHED)
            const snow = new THREE.Mesh(geo.sphere(0.25, 8, 6), snowMat);
            snow.position.y = 1.1;
            snow.scale.set(1.3, 0.35, 1.3);
            this.addMesh(snow, group);
        }
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 0.4;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: 1.1,
        };
    }
}

export default TrashCan;


