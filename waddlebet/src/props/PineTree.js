/**
 * PineTree - Snow-covered pine tree prop
 * 
 * HEAVILY OPTIMIZED FOR DRAW CALLS:
 * - Uses BufferGeometryUtils to merge all parts into just 2-3 meshes
 * - Previous: 14 meshes per tree = 14 draw calls
 * - Now: 3 meshes per tree = 3 draw calls (trunk + foliage + snow)
 * - 78% reduction in draw calls per tree!
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';
import { getGeometryManager } from './PropGeometries';

// Cache merged geometries per tree size to avoid recalculating
const _mergedGeoCache = new Map();

class PineTree extends BaseProp {
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
    
    /**
     * Size configurations
     */
    static SIZES = {
        small:  { trunkH: 1.5, trunkR: 0.2, layers: 3, baseRadius: 1.5, layerH: 1.2, snowDepth: 0.15 },
        medium: { trunkH: 2.5, trunkR: 0.3, layers: 4, baseRadius: 2.2, layerH: 1.5, snowDepth: 0.2 },
        large:  { trunkH: 3.5, trunkR: 0.4, layers: 5, baseRadius: 3.0, layerH: 1.8, snowDepth: 0.25 },
    };
    
    /**
     * Get or create merged geometry for this tree size
     * Returns { trunkGeo, foliageGeo, snowGeo } all pre-merged
     */
    _getMergedGeometry() {
        const cacheKey = this.size;
        if (_mergedGeoCache.has(cacheKey)) {
            return _mergedGeoCache.get(cacheKey);
        }
        
        const THREE = this.THREE;
        const cfg = PineTree.SIZES[this.size] || PineTree.SIZES.medium;
        
        // Collect geometries to merge
        const foliageGeos = [];
        const snowGeos = [];
        
        let currentY = cfg.trunkH * 0.6;
        
        for (let i = 0; i < cfg.layers; i++) {
            const layerRatio = 1 - (i / cfg.layers) * 0.7;
            const radius = cfg.baseRadius * layerRatio;
            const height = cfg.layerH * layerRatio;
            
            // Pine cone layer
            const coneGeo = new THREE.ConeGeometry(radius, height, 8);
            coneGeo.translate(0, currentY + height / 2, 0);
            foliageGeos.push(coneGeo);
            
            // Snow cap on top
            const snowCapGeo = new THREE.ConeGeometry(radius * 0.85, cfg.snowDepth, 8);
            snowCapGeo.translate(0, currentY + height - cfg.snowDepth / 2, 0);
            snowGeos.push(snowCapGeo);
            
            // Snow clumps (only on larger trees, bottom 2 layers)
            if (this.size !== 'small' && i < 2) {
                for (let j = 0; j < 2; j++) {
                    const angle = (j / 2) * Math.PI * 2;
                    const dist = radius * 0.6;
                    const clumpGeo = new THREE.SphereGeometry(0.18, 4, 4);
                    clumpGeo.scale(1, 0.5, 1);
                    clumpGeo.translate(
                        Math.cos(angle) * dist,
                        currentY + height * 0.4,
                        Math.sin(angle) * dist
                    );
                    snowGeos.push(clumpGeo);
                }
            }
            
            currentY += height * 0.65;
        }
        
        // Top snow cap
        const topSnowGeo = new THREE.SphereGeometry(cfg.snowDepth * 2, 6, 6);
        topSnowGeo.scale(1, 0.6, 1);
        topSnowGeo.translate(0, currentY + cfg.snowDepth, 0);
        snowGeos.push(topSnowGeo);
        
        // Trunk geometry
        const trunkGeo = new THREE.CylinderGeometry(cfg.trunkR * 0.7, cfg.trunkR, cfg.trunkH, 8);
        trunkGeo.translate(0, cfg.trunkH / 2, 0);
        
        // Merge geometries using BufferGeometryUtils if available, otherwise manual merge
        let mergedFoliage, mergedSnow;
        
        if (THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeGeometries) {
            mergedFoliage = THREE.BufferGeometryUtils.mergeGeometries(foliageGeos, false);
            mergedSnow = THREE.BufferGeometryUtils.mergeGeometries(snowGeos, false);
        } else {
            // Fallback: use mergeBufferGeometries from the global THREE (loaded via CDN usually includes it)
            // Or just use the first geometry if merging isn't available
            mergedFoliage = this._manualMergeGeometries(foliageGeos);
            mergedSnow = this._manualMergeGeometries(snowGeos);
        }
        
        // Dispose source geometries (they're now merged)
        foliageGeos.forEach(g => g.dispose());
        snowGeos.forEach(g => g.dispose());
        
        const result = { trunkGeo, foliageGeo: mergedFoliage, snowGeo: mergedSnow };
        _mergedGeoCache.set(cacheKey, result);
        
        return result;
    }
    
    /**
     * Manual geometry merge for when BufferGeometryUtils isn't available
     */
    _manualMergeGeometries(geometries) {
        if (geometries.length === 0) return null;
        if (geometries.length === 1) return geometries[0].clone();
        
        const THREE = this.THREE;
        
        // Count total vertices and indices
        let totalVertices = 0;
        let totalIndices = 0;
        
        geometries.forEach(geo => {
            const pos = geo.getAttribute('position');
            if (pos) totalVertices += pos.count;
            const idx = geo.getIndex();
            if (idx) totalIndices += idx.count;
        });
        
        // Create merged arrays
        const positions = new Float32Array(totalVertices * 3);
        const normals = new Float32Array(totalVertices * 3);
        const indices = totalIndices > 0 ? new Uint32Array(totalIndices) : null;
        
        let vertexOffset = 0;
        let indexOffset = 0;
        let indexVertexOffset = 0;
        
        geometries.forEach(geo => {
            const pos = geo.getAttribute('position');
            const norm = geo.getAttribute('normal');
            const idx = geo.getIndex();
            
            if (pos) {
                positions.set(pos.array, vertexOffset * 3);
                if (norm) normals.set(norm.array, vertexOffset * 3);
                
                if (idx && indices) {
                    for (let i = 0; i < idx.count; i++) {
                        indices[indexOffset + i] = idx.array[i] + indexVertexOffset;
                    }
                    indexOffset += idx.count;
                }
                
                indexVertexOffset += pos.count;
                vertexOffset += pos.count;
            }
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
        const cfg = PineTree.SIZES[this.size] || PineTree.SIZES.medium;
        const group = this.createGroup(scene);
        group.name = `pine_tree_${this.size}`;
        group.position.set(x, y, z);
        
        // Get merged geometries (cached per size)
        const { trunkGeo, foliageGeo, snowGeo } = this._getMergedGeometry();
        
        // Materials
        const trunkMat = this.matManager.get(PropColors.barkMedium, { roughness: 0.95 });
        const foliageMat = this.matManager.get(PropColors.pineMedium, { roughness: 0.9 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        // ONLY 3 MESHES instead of 14!
        // Trunk
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.addMesh(trunk, group);
        
        // Foliage (all cone layers merged)
        if (foliageGeo) {
            const foliage = new THREE.Mesh(foliageGeo, foliageMat);
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            this.addMesh(foliage, group);
        }
        
        // Snow (all snow parts merged)
        if (snowGeo) {
            const snow = new THREE.Mesh(snowGeo, snowMat);
            snow.castShadow = true;
            this.addMesh(snow, group);
        }
        
        // Store collision data
        this.collisionData = {
            type: 'cylinder',
            radius: cfg.trunkR + 0.3,
            height: cfg.trunkH + cfg.layers * cfg.layerH * 0.65,
        };
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.collisionData || !this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = this.collisionData.radius;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: this.collisionData.height,
        };
    }
}

export default PineTree;

