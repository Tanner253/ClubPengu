/**
 * Barrel - Wooden barrel with metal bands
 * OPTIMIZED: Uses cached geometries for all parts
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';
import { getGeometryManager } from './PropGeometries';

class Barrel extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {string} size - 'small' | 'medium' | 'large'
     */
    constructor(THREE, size = 'medium') {
        super(THREE);
        this.size = size;
        this.matManager = getMaterialManager(THREE);
        this.geoManager = getGeometryManager(THREE);
    }
    
    static SIZES = {
        small: { scale: 0.6, height: 0.7 },
        medium: { scale: 1.0, height: 1.0 },
        large: { scale: 1.3, height: 1.2 },
    };
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const geo = this.geoManager;
        const cfg = Barrel.SIZES[this.size] || Barrel.SIZES.medium;
        const group = this.createGroup(scene);
        group.name = `barrel_${this.size}`;
        group.position.set(x, y, z);
        
        const woodMat = this.matManager.get(PropColors.plankMedium, { roughness: 0.9 });
        const darkWoodMat = this.matManager.get(PropColors.plankDark, { roughness: 0.85 });
        const metalMat = this.matManager.get('#5A4A3A', { roughness: 0.5, metalness: 0.6 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        const s = cfg.scale;
        const h = cfg.height;
        
        // Round to nearest 0.01 for better cache hits across sizes
        const r1 = Math.round(0.35 * s * 100) / 100;
        const r2 = Math.round(0.32 * s * 100) / 100;
        const r3 = Math.round(0.38 * s * 100) / 100;
        
        // Main barrel body (bulging cylinder effect) (CACHED)
        const body = new THREE.Mesh(geo.cylinder(r1, r2, h, 12), woodMat);
        body.position.y = h / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        this.addMesh(body, group);
        
        // Bulge in middle (CACHED)
        const bulge = new THREE.Mesh(geo.cylinder(r3, r3, h * 0.4, 12), woodMat);
        bulge.position.y = h / 2;
        bulge.castShadow = true;
        this.addMesh(bulge, group);
        
        // Metal bands (CACHED where possible)
        const bandPositions = [0.12, 0.35, 0.65, 0.88];
        bandPositions.forEach(t => {
            const bandY = h * t;
            const radius = Math.round((0.36 * s + (Math.abs(t - 0.5) < 0.25 ? 0.03 * s : 0)) * 100) / 100;
            const tubeRadius = Math.round(0.02 * s * 100) / 100;
            const band = new THREE.Mesh(geo.torus(radius, tubeRadius, 6, 16), metalMat);
            band.position.y = bandY;
            band.rotation.x = Math.PI / 2;
            this.addMesh(band, group);
        });
        
        // Top lid (CACHED)
        const lidR = Math.round(0.33 * s * 100) / 100;
        const lidH = Math.round(0.04 * s * 100) / 100;
        const lid = new THREE.Mesh(geo.cylinder(lidR, lidR, lidH, 12), darkWoodMat);
        lid.position.y = h - 0.02 * s;
        this.addMesh(lid, group);
        
        // Vertical wood grain lines (subtle) (CACHED - all 8 share same geometry)
        const lineW = Math.round(0.01 * s * 100) / 100;
        const lineH = Math.round(h * 0.85 * 100) / 100;
        const lineGeo = geo.box(lineW, lineH, lineW);
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const line = new THREE.Mesh(lineGeo, darkWoodMat);
            line.position.set(
                Math.cos(angle) * 0.36 * s,
                h / 2,
                Math.sin(angle) * 0.36 * s
            );
            line.rotation.y = -angle;
            this.addMesh(line, group);
        }
        
        // Snow on top (CACHED)
        const snowR = Math.round(0.28 * s * 100) / 100;
        const snow = new THREE.Mesh(geo.sphere(snowR, 8, 6), snowMat);
        snow.position.y = h + 0.05 * s;
        snow.scale.set(1.2, 0.35, 1.2);
        this.addMesh(snow, group);
        
        this.collisionScale = s;
        this.collisionHeight = h;
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const s = this.collisionScale || 1;
        const r = 0.4 * s;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: this.collisionHeight || 1,
        };
    }
}

export default Barrel;


