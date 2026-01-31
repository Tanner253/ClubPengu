/**
 * Fence - Wooden fence section
 * 
 * OPTIMIZED: Merges all geometry into 2 meshes (wood + snow)
 * - Previous: 2*postCount + 3 meshes
 * - Now: 2 meshes regardless of length
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

// Cache by length
const _fenceGeoCache = new Map();

class Fence extends BaseProp {
    constructor(THREE, length = 4) {
        super(THREE);
        this.length = length;
        this.matManager = getMaterialManager(THREE);
        this.postHeight = 1.2;
    }
    
    _buildMergedGeometries() {
        const cacheKey = this.length;
        if (_fenceGeoCache.has(cacheKey)) return _fenceGeoCache.get(cacheKey);
        
        const THREE = this.THREE;
        const woodGeos = [];
        const snowGeos = [];
        
        const postSpacing = 2;
        const postCount = Math.ceil(this.length / postSpacing) + 1;
        
        // Posts and snow caps
        for (let i = 0; i < postCount; i++) {
            const xPos = -this.length/2 + i * postSpacing;
            
            const postGeo = new THREE.BoxGeometry(0.12, this.postHeight, 0.12);
            postGeo.translate(xPos, this.postHeight/2, 0);
            woodGeos.push(postGeo);
            
            const capGeo = new THREE.SphereGeometry(0.1, 6, 6);
            capGeo.scale(1.2, 0.4, 1.2);
            capGeo.translate(xPos, this.postHeight + 0.05, 0);
            snowGeos.push(capGeo);
        }
        
        // Rails
        [0.4, 0.8].forEach(h => {
            const railGeo = new THREE.BoxGeometry(this.length, 0.08, 0.06);
            railGeo.translate(0, h, 0);
            woodGeos.push(railGeo);
        });
        
        // Snow on top rail
        const topSnowGeo = new THREE.BoxGeometry(this.length - 0.2, 0.05, 0.12);
        topSnowGeo.translate(0, 0.88, 0);
        snowGeos.push(topSnowGeo);
        
        const result = {
            wood: this._mergeGeos(woodGeos),
            snow: this._mergeGeos(snowGeos)
        };
        
        [...woodGeos, ...snowGeos].forEach(g => g.dispose());
        _fenceGeoCache.set(cacheKey, result);
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
        const group = this.createGroup(scene);
        group.name = 'fence';
        group.position.set(x, y, z);
        
        const geos = this._buildMergedGeometries();
        
        // ONLY 2 MESHES instead of many!
        const woodMesh = new THREE.Mesh(geos.wood, this.matManager.get(PropColors.plankMedium, { roughness: 0.9 }));
        woodMesh.castShadow = true;
        this.addMesh(woodMesh, group);
        
        const snowMesh = new THREE.Mesh(geos.snow, this.matManager.get(PropColors.snowLight, { roughness: 0.6 }));
        this.addMesh(snowMesh, group);
        
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

