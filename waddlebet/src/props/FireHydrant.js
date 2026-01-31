/**
 * FireHydrant - Classic red fire hydrant with snow cap
 * 
 * OPTIMIZED: All geometry merged into 4 meshes
 * - Previous: 19 meshes per hydrant
 * - Now: 4 meshes (red body + gold caps + metal + snow)
 * - 79% reduction in draw calls!
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

const _hydrantGeoCache = { body: null, caps: null, metal: null, snow: null };

class FireHydrant extends BaseProp {
    constructor(THREE, color = 0xCC2222) {
        super(THREE);
        this.color = color;
        this.matManager = getMaterialManager(THREE);
    }
    
    _buildMergedGeometry() {
        if (_hydrantGeoCache.body) return _hydrantGeoCache;
        
        const THREE = this.THREE;
        const bodyGeos = [];
        const capGeos = [];
        const metalGeos = [];
        const snowGeos = [];
        
        // Base
        const baseGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.12, 8);
        baseGeo.translate(0, 0.06, 0);
        bodyGeos.push(baseGeo);
        
        // Main body
        const mainBodyGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.5, 8);
        mainBodyGeo.translate(0, 0.37, 0);
        bodyGeos.push(mainBodyGeo);
        
        // Upper body
        const upperGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.25, 8);
        upperGeo.translate(0, 0.74, 0);
        bodyGeos.push(upperGeo);
        
        // Side outlets
        [-1, 1].forEach(side => {
            const outletGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 6);
            outletGeo.rotateZ(side * Math.PI / 2);
            outletGeo.translate(side * 0.22, 0.5, 0);
            bodyGeos.push(outletGeo);
        });
        
        // Front outlet
        const frontOutletGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 6);
        frontOutletGeo.rotateX(Math.PI / 2);
        frontOutletGeo.translate(0, 0.35, 0.2);
        bodyGeos.push(frontOutletGeo);
        
        // Top cap (gold)
        const topCapGeo = new THREE.SphereGeometry(0.16, 8, 6);
        topCapGeo.translate(0, 0.86, 0);
        capGeos.push(topCapGeo);
        
        // Side outlet caps (gold)
        [-1, 1].forEach(side => {
            const outCapGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.04, 6);
            outCapGeo.rotateZ(side * Math.PI / 2);
            outCapGeo.translate(side * 0.28, 0.5, 0);
            capGeos.push(outCapGeo);
        });
        
        // Front cap (gold)
        const frontCapGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.03, 6);
        frontCapGeo.rotateX(Math.PI / 2);
        frontCapGeo.translate(0, 0.35, 0.25);
        capGeos.push(frontCapGeo);
        
        // Top bolt (metal)
        const boltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 6);
        boltGeo.translate(0, 0.95, 0);
        metalGeos.push(boltGeo);
        
        // Pentagon nuts (metal)
        [-1, 1].forEach(side => {
            const nutGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 5);
            nutGeo.rotateZ(side * Math.PI / 2);
            nutGeo.translate(side * 0.31, 0.5, 0);
            metalGeos.push(nutGeo);
        });
        
        // Chains (metal)
        [-1, 1].forEach(side => {
            const chainGeo = new THREE.TorusGeometry(0.05, 0.008, 4, 8);
            chainGeo.rotateX(Math.PI / 2);
            chainGeo.rotateZ(side * 0.3);
            chainGeo.translate(side * 0.15, 0.65, 0.12);
            metalGeos.push(chainGeo);
        });
        
        // Top snow
        const topSnowGeo = new THREE.SphereGeometry(0.14, 8, 6);
        topSnowGeo.scale(1.3, 0.4, 1.3);
        topSnowGeo.translate(0, 1.0, 0);
        snowGeos.push(topSnowGeo);
        
        // Side snow
        [-1, 1].forEach(side => {
            const sideSnowGeo = new THREE.SphereGeometry(0.06, 6, 4);
            sideSnowGeo.scale(1, 0.5, 1);
            sideSnowGeo.translate(side * 0.28, 0.58, 0);
            snowGeos.push(sideSnowGeo);
        });
        
        _hydrantGeoCache.body = this._mergeGeos(bodyGeos);
        _hydrantGeoCache.caps = this._mergeGeos(capGeos);
        _hydrantGeoCache.metal = this._mergeGeos(metalGeos);
        _hydrantGeoCache.snow = this._mergeGeos(snowGeos);
        
        [...bodyGeos, ...capGeos, ...metalGeos, ...snowGeos].forEach(g => g.dispose());
        return _hydrantGeoCache;
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
        group.name = 'fire_hydrant';
        group.position.set(x, y, z);
        
        const geos = this._buildMergedGeometry();
        
        // ONLY 4 MESHES instead of 19!
        const bodyMesh = new THREE.Mesh(geos.body, this.matManager.get(this.color, { roughness: 0.4, metalness: 0.3 }));
        bodyMesh.castShadow = true;
        this.addMesh(bodyMesh, group);
        
        const capsMesh = new THREE.Mesh(geos.caps, this.matManager.get('#FFD700', { roughness: 0.3, metalness: 0.5 }));
        capsMesh.castShadow = true;
        this.addMesh(capsMesh, group);
        
        const metalMesh = new THREE.Mesh(geos.metal, this.matManager.get(PropColors.metalDark, { roughness: 0.5, metalness: 0.6 }));
        this.addMesh(metalMesh, group);
        
        const snowMesh = new THREE.Mesh(geos.snow, this.matManager.get(PropColors.snowLight, { roughness: 0.6 }));
        this.addMesh(snowMesh, group);
        
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


