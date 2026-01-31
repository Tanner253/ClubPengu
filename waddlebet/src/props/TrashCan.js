/**
 * TrashCan - Metal trash can with lid and snow
 * 
 * OPTIMIZED: All geometry merged into 2-3 meshes
 * - Previous: 11 meshes per trash can
 * - Now: 3 meshes (metal + dark trim + snow)
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

const _trashCanGeoCache = { metal: null, dark: null, snow: null };

class TrashCan extends BaseProp {
    constructor(THREE, withLid = true) {
        super(THREE);
        this.withLid = withLid;
        this.matManager = getMaterialManager(THREE);
    }
    
    _buildMergedGeometry() {
        if (_trashCanGeoCache.metal) return _trashCanGeoCache;
        
        const THREE = this.THREE;
        const metalGeos = [];
        const darkGeos = [];
        const snowGeos = [];
        
        // Main body
        const bodyGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.9, 12);
        bodyGeo.translate(0, 0.45, 0);
        metalGeos.push(bodyGeo);
        
        // Rim at top
        const rimGeo = new THREE.TorusGeometry(0.36, 0.03, 6, 16);
        rimGeo.rotateX(Math.PI / 2);
        rimGeo.translate(0, 0.9, 0);
        darkGeos.push(rimGeo);
        
        // Rim at bottom
        const bottomRimGeo = new THREE.TorusGeometry(0.31, 0.025, 6, 16);
        bottomRimGeo.rotateX(Math.PI / 2);
        bottomRimGeo.translate(0, 0.02, 0);
        darkGeos.push(bottomRimGeo);
        
        // Horizontal bands
        [0.25, 0.55].forEach(yPos => {
            const bandGeo = new THREE.TorusGeometry(0.33, 0.015, 6, 16);
            bandGeo.rotateX(Math.PI / 2);
            bandGeo.translate(0, yPos, 0);
            darkGeos.push(bandGeo);
        });
        
        // Handles
        [-1, 1].forEach(side => {
            const handleGeo = new THREE.TorusGeometry(0.08, 0.015, 6, 8);
            handleGeo.rotateY(side * Math.PI / 2);
            handleGeo.translate(side * 0.35, 0.7, 0);
            darkGeos.push(handleGeo);
        });
        
        // Lid
        const lidGeo = new THREE.CylinderGeometry(0.38, 0.36, 0.08, 12);
        lidGeo.translate(0, 0.96, 0);
        metalGeos.push(lidGeo);
        
        // Lid handle
        const lidHandleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8);
        lidHandleGeo.translate(0, 1.04, 0);
        darkGeos.push(lidHandleGeo);
        
        // Snow
        const snowGeo = new THREE.SphereGeometry(0.25, 8, 6);
        snowGeo.scale(1.3, 0.35, 1.3);
        snowGeo.translate(0, 1.1, 0);
        snowGeos.push(snowGeo);
        
        _trashCanGeoCache.metal = this._mergeGeos(metalGeos);
        _trashCanGeoCache.dark = this._mergeGeos(darkGeos);
        _trashCanGeoCache.snow = this._mergeGeos(snowGeos);
        
        [...metalGeos, ...darkGeos, ...snowGeos].forEach(g => g.dispose());
        return _trashCanGeoCache;
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
        group.name = 'trash_can';
        group.position.set(x, y, z);
        
        const geos = this._buildMergedGeometry();
        
        // ONLY 3 MESHES instead of 11!
        const metalMesh = new THREE.Mesh(geos.metal, this.matManager.get('#4A5A6A', { roughness: 0.6, metalness: 0.5 }));
        metalMesh.castShadow = true;
        metalMesh.receiveShadow = true;
        this.addMesh(metalMesh, group);
        
        const darkMesh = new THREE.Mesh(geos.dark, this.matManager.get('#3A4A5A', { roughness: 0.7, metalness: 0.4 }));
        this.addMesh(darkMesh, group);
        
        if (this.withLid) {
            const snowMesh = new THREE.Mesh(geos.snow, this.matManager.get(PropColors.snowLight, { roughness: 0.6 }));
            this.addMesh(snowMesh, group);
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


