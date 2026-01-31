/**
 * Rock - Snow-dusted rock
 * 
 * OPTIMIZED: Reduced meshes from 4-5 to 2
 * Uses deterministic placement instead of random
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

// Cache per size
const _rockGeoCache = new Map();

class Rock extends BaseProp {
    constructor(THREE, size = 'medium') {
        super(THREE);
        this.size = size;
        this.matManager = getMaterialManager(THREE);
    }
    
    static SIZES = {
        small: { scale: 0.5, segments: 4, smallRocks: 1 },
        medium: { scale: 1.0, segments: 5, smallRocks: 2 },
        large: { scale: 1.8, segments: 6, smallRocks: 2 },
    };
    
    _buildMergedGeometry() {
        const cacheKey = this.size;
        if (_rockGeoCache.has(cacheKey)) return _rockGeoCache.get(cacheKey);
        
        const THREE = this.THREE;
        const cfg = Rock.SIZES[this.size] || Rock.SIZES.medium;
        const rockGeos = [];
        
        // Main rock body
        const mainGeo = new THREE.IcosahedronGeometry(0.8 * cfg.scale, cfg.segments);
        const posAttr = mainGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const px = posAttr.getX(i);
            const py = posAttr.getY(i);
            const pz = posAttr.getZ(i);
            // Deterministic "noise" based on position
            const noise = 1 + (Math.sin(px * 10 + py * 7 + pz * 13) * 0.15);
            posAttr.setXYZ(i, px * noise, py * 0.6 * noise, pz * noise);
        }
        mainGeo.computeVertexNormals();
        mainGeo.translate(0, 0.3 * cfg.scale, 0);
        rockGeos.push(mainGeo);
        
        // Smaller attached rocks - deterministic positions
        for (let i = 0; i < cfg.smallRocks; i++) {
            const smallGeo = new THREE.IcosahedronGeometry(0.3 * cfg.scale, 2);
            const angle = (i / cfg.smallRocks) * Math.PI * 2;
            smallGeo.scale(1, 0.7, 1);
            smallGeo.translate(
                Math.cos(angle) * 0.6 * cfg.scale,
                0.15 * cfg.scale,
                Math.sin(angle) * 0.4 * cfg.scale
            );
            rockGeos.push(smallGeo);
        }
        
        // Snow cap
        const snowGeo = new THREE.SphereGeometry(0.5 * cfg.scale, 8, 6);
        snowGeo.scale(1.2, 0.3, 1.2);
        snowGeo.translate(0, 0.5 * cfg.scale, 0);
        
        const result = {
            rock: this._mergeGeos(rockGeos),
            snow: snowGeo
        };
        
        rockGeos.forEach(g => g.dispose());
        _rockGeoCache.set(cacheKey, result);
        return result;
    }
    
    _mergeGeos(geometries) {
        if (!geometries.length) return null;
        const THREE = this.THREE;
        let totalVerts = 0, totalIdx = 0;
        geometries.forEach(g => {
            totalVerts += g.getAttribute('position').count;
            if (g.getIndex()) totalIdx += g.getIndex().count;
        });
        const positions = new Float32Array(totalVerts * 3);
        const normals = new Float32Array(totalVerts * 3);
        const indices = totalIdx > 0 ? new Uint32Array(totalIdx) : null;
        let vOff = 0, iOff = 0, ivOff = 0;
        geometries.forEach(g => {
            const pos = g.getAttribute('position');
            const norm = g.getAttribute('normal');
            const idx = g.getIndex();
            positions.set(pos.array, vOff * 3);
            if (norm) normals.set(norm.array, vOff * 3);
            if (idx && indices) {
                for (let i = 0; i < idx.count; i++) indices[iOff + i] = idx.array[i] + ivOff;
                iOff += idx.count;
            }
            ivOff += pos.count;
            vOff += pos.count;
        });
        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        if (indices) merged.setIndex(new THREE.BufferAttribute(indices, 1));
        merged.computeVertexNormals();
        return merged;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const cfg = Rock.SIZES[this.size] || Rock.SIZES.medium;
        const group = this.createGroup(scene);
        group.name = `rock_${this.size}`;
        group.position.set(x, y, z);
        
        const geos = this._buildMergedGeometry();
        
        // ONLY 2 MESHES instead of 4-5!
        const rockMesh = new THREE.Mesh(geos.rock, this.matManager.get(PropColors.rockMedium, { roughness: 0.95 }));
        rockMesh.castShadow = true;
        rockMesh.receiveShadow = true;
        this.addMesh(rockMesh, group);
        
        const snowMesh = new THREE.Mesh(geos.snow, this.matManager.get(PropColors.snowLight, { roughness: 0.65 }));
        this.addMesh(snowMesh, group);
        
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

