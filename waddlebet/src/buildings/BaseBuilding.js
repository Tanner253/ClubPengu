/**
 * BaseBuilding - Base class for all building generators
 * Buildings are large structures that contain multiple meshes and lights
 * 
 * PERFORMANCE: Uses geometry merging to reduce draw calls
 * Instead of adding many small meshes, collect geometries and merge by material
 */

import { getMaterialManager } from '../props/PropMaterials';

class BaseBuilding {
    constructor(THREE) {
        this.THREE = THREE;
        this.materialManager = getMaterialManager(THREE);
        this.group = new THREE.Group();
        this.lights = [];
        this.animatedParts = [];
        
        // Geometry collection for batching (keyed by material reference)
        this._geoCollections = new Map();
    }

    /**
     * Get a cached material
     * @param {number} color - Hex color
     * @param {Object} options - Material options
     * @returns {THREE.MeshStandardMaterial}
     */
    getMaterial(color, options = {}) {
        return this.materialManager.get(color, options);
    }

    /**
     * Collect a geometry for later merging (instead of adding individual mesh)
     * @param {THREE.BufferGeometry} geometry - The geometry to collect
     * @param {THREE.Material} material - The material (used as key)
     * @param {THREE.Matrix4} matrix - World transform matrix
     */
    collectGeometry(geometry, material, matrix) {
        if (!this._geoCollections.has(material)) {
            this._geoCollections.set(material, []);
        }
        // Clone and apply transform
        const cloned = geometry.clone();
        cloned.applyMatrix4(matrix);
        this._geoCollections.get(material).push(cloned);
    }

    /**
     * Add a mesh by position/rotation (collects for merging)
     * @param {THREE.BufferGeometry} geometry
     * @param {THREE.Material} material
     * @param {Object} position - {x, y, z}
     * @param {Object} rotation - {x, y, z} in radians (optional)
     * @param {Object} scale - {x, y, z} (optional)
     */
    collectMesh(geometry, material, position, rotation = {}, scale = {}) {
        const THREE = this.THREE;
        const matrix = new THREE.Matrix4();
        const pos = new THREE.Vector3(position.x || 0, position.y || 0, position.z || 0);
        const rot = new THREE.Euler(rotation.x || 0, rotation.y || 0, rotation.z || 0);
        const scl = new THREE.Vector3(scale.x || 1, scale.y || 1, scale.z || 1);
        const quat = new THREE.Quaternion().setFromEuler(rot);
        matrix.compose(pos, quat, scl);
        this.collectGeometry(geometry, material, matrix);
    }

    /**
     * Merge all collected geometries and add to group
     * Call this after collecting all static geometry
     * @param {boolean} castShadow
     * @param {boolean} receiveShadow
     */
    flushCollectedGeometry(castShadow = true, receiveShadow = true) {
        const THREE = this.THREE;
        
        this._geoCollections.forEach((geometries, material) => {
            if (geometries.length === 0) return;
            
            const merged = this._mergeGeometries(geometries);
            if (merged) {
                const mesh = new THREE.Mesh(merged, material);
                mesh.castShadow = castShadow;
                mesh.receiveShadow = receiveShadow;
                this.group.add(mesh);
            }
            
            // Dispose cloned geometries
            geometries.forEach(g => g.dispose());
        });
        
        // Clear collections
        this._geoCollections.clear();
    }

    /**
     * Merge multiple BufferGeometries into one
     * @private
     */
    _mergeGeometries(geometries) {
        if (!geometries || geometries.length === 0) return null;
        if (geometries.length === 1) return geometries[0].clone();
        
        const THREE = this.THREE;
        
        // Calculate totals
        let totalPositions = 0;
        let totalIndices = 0;
        let hasNormals = true;
        let hasUVs = false;
        
        geometries.forEach(g => {
            const pos = g.getAttribute('position');
            if (pos) totalPositions += pos.count;
            const idx = g.getIndex();
            if (idx) totalIndices += idx.count;
            if (!g.getAttribute('normal')) hasNormals = false;
            if (g.getAttribute('uv')) hasUVs = true;
        });
        
        if (totalPositions === 0) return null;
        
        // Allocate arrays
        const positions = new Float32Array(totalPositions * 3);
        const normals = hasNormals ? new Float32Array(totalPositions * 3) : null;
        const uvs = hasUVs ? new Float32Array(totalPositions * 2) : null;
        const indices = totalIndices > 0 ? new Uint32Array(totalIndices) : null;
        
        let posOffset = 0;
        let idxOffset = 0;
        let vertOffset = 0;
        
        geometries.forEach(g => {
            const pos = g.getAttribute('position');
            const norm = g.getAttribute('normal');
            const uv = g.getAttribute('uv');
            const idx = g.getIndex();
            
            if (pos) {
                positions.set(pos.array, posOffset * 3);
                if (normals && norm) {
                    normals.set(norm.array, posOffset * 3);
                }
                if (uvs && uv) {
                    uvs.set(uv.array, posOffset * 2);
                }
                
                if (idx && indices) {
                    for (let i = 0; i < idx.count; i++) {
                        indices[idxOffset + i] = idx.array[i] + vertOffset;
                    }
                    idxOffset += idx.count;
                }
                
                vertOffset += pos.count;
                posOffset += pos.count;
            }
        });
        
        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        if (normals) merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        if (uvs) merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        if (indices) merged.setIndex(new THREE.BufferAttribute(indices, 1));
        
        if (!normals) merged.computeVertexNormals();
        merged.computeBoundingSphere();
        
        return merged;
    }

    /**
     * Build the building - override in subclass
     * @param {Object} config - Building configuration
     * @returns {THREE.Group}
     */
    build(config = {}) {
        throw new Error('build() must be implemented by subclass');
    }

    /**
     * Get all lights in the building for day/night cycle
     * @returns {Array<THREE.Light>}
     */
    getLights() {
        return this.lights;
    }

    /**
     * Get animated parts for update loop
     * @returns {Array}
     */
    getAnimatedParts() {
        return this.animatedParts;
    }

    /**
     * Dispose of building resources
     */
    dispose() {
        this.group.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        this.lights = [];
        this.animatedParts = [];
    }
}

export default BaseBuilding;





