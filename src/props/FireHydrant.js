/**
 * FireHydrant - Classic red fire hydrant with snow cap
 * OPTIMIZED: Uses cached geometries for all parts
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';
import { getGeometryManager } from './PropGeometries';

class FireHydrant extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {number} color - Hex color for the hydrant body (default red)
     */
    constructor(THREE, color = 0xCC2222) {
        super(THREE);
        this.color = color;
        this.matManager = getMaterialManager(THREE);
        this.geoManager = getGeometryManager(THREE);
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const geo = this.geoManager;
        const group = this.createGroup(scene);
        group.name = 'fire_hydrant';
        group.position.set(x, y, z);
        
        const bodyMat = this.matManager.get(this.color, { roughness: 0.4, metalness: 0.3 });
        const capMat = this.matManager.get('#FFD700', { roughness: 0.3, metalness: 0.5 });
        const metalMat = this.matManager.get(PropColors.metalDark, { roughness: 0.5, metalness: 0.6 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        // Base (CACHED)
        const base = new THREE.Mesh(geo.cylinder(0.22, 0.25, 0.12, 8), bodyMat);
        base.position.y = 0.06;
        base.castShadow = true;
        this.addMesh(base, group);
        
        // Main body (CACHED)
        const body = new THREE.Mesh(geo.cylinder(0.18, 0.2, 0.5, 8), bodyMat);
        body.position.y = 0.37;
        body.castShadow = true;
        this.addMesh(body, group);
        
        // Upper body (narrower) (CACHED)
        const upper = new THREE.Mesh(geo.cylinder(0.15, 0.18, 0.25, 8), bodyMat);
        upper.position.y = 0.74;
        upper.castShadow = true;
        this.addMesh(upper, group);
        
        // Top cap (CACHED)
        const top = new THREE.Mesh(geo.sphere(0.16, 8, 6), capMat);
        top.position.y = 0.86;
        top.castShadow = true;
        this.addMesh(top, group);
        
        // Top bolt (CACHED)
        const bolt = new THREE.Mesh(geo.cylinder(0.04, 0.04, 0.06, 6), metalMat);
        bolt.position.y = 0.95;
        this.addMesh(bolt, group);
        
        // Side outlets (nozzles) (CACHED - both share same geometries)
        const outletGeo = geo.cylinder(0.08, 0.08, 0.12, 6);
        const outCapGeo = geo.cylinder(0.09, 0.09, 0.04, 6);
        const nutGeo = geo.cylinder(0.035, 0.035, 0.02, 5);
        [-1, 1].forEach(side => {
            // Outlet body
            const outlet = new THREE.Mesh(outletGeo, bodyMat);
            outlet.position.set(side * 0.22, 0.5, 0);
            outlet.rotation.z = side * Math.PI / 2;
            outlet.castShadow = true;
            this.addMesh(outlet, group);
            
            // Outlet cap
            const outCap = new THREE.Mesh(outCapGeo, capMat);
            outCap.position.set(side * 0.28, 0.5, 0);
            outCap.rotation.z = side * Math.PI / 2;
            this.addMesh(outCap, group);
            
            // Pentagon nut on cap
            const nut = new THREE.Mesh(nutGeo, metalMat);
            nut.position.set(side * 0.31, 0.5, 0);
            nut.rotation.z = side * Math.PI / 2;
            this.addMesh(nut, group);
        });
        
        // Front outlet (smaller, operating valve) (CACHED)
        const frontOutlet = new THREE.Mesh(geo.cylinder(0.06, 0.06, 0.1, 6), bodyMat);
        frontOutlet.position.set(0, 0.35, 0.2);
        frontOutlet.rotation.x = Math.PI / 2;
        this.addMesh(frontOutlet, group);
        
        const frontCap = new THREE.Mesh(geo.cylinder(0.07, 0.07, 0.03, 6), capMat);
        frontCap.position.set(0, 0.35, 0.25);
        frontCap.rotation.x = Math.PI / 2;
        this.addMesh(frontCap, group);
        
        // Decorative chains (CACHED - both share same geometry)
        const chainGeo = geo.torus(0.05, 0.008, 4, 8);
        [-1, 1].forEach(side => {
            const chain = new THREE.Mesh(chainGeo, metalMat);
            chain.position.set(side * 0.15, 0.65, 0.12);
            chain.rotation.x = Math.PI / 2;
            chain.rotation.z = side * 0.3;
            this.addMesh(chain, group);
        });
        
        // Snow cap on top (CACHED)
        const snow = new THREE.Mesh(geo.sphere(0.14, 8, 6), snowMat);
        snow.position.y = 1.0;
        snow.scale.set(1.3, 0.4, 1.3);
        this.addMesh(snow, group);
        
        // Snow on side outlets (CACHED - both share same geometry)
        const sideSnowGeo = geo.sphere(0.06, 6, 4);
        [-1, 1].forEach(side => {
            const sideSnow = new THREE.Mesh(sideSnowGeo, snowMat);
            sideSnow.position.set(side * 0.28, 0.58, 0);
            sideSnow.scale.y = 0.5;
            this.addMesh(sideSnow, group);
        });
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 0.3;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: 1.0,
        };
    }
}

export default FireHydrant;


