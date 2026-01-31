/**
 * LampPost - Classic street lamp with warm glow
 * 
 * HEAVILY OPTIMIZED FOR DRAW CALLS:
 * - Previous: 10 meshes per lamp = 10 draw calls
 * - Now: 2 meshes per lamp = 2 draw calls (metal parts + glass globe)
 * - 80% reduction in draw calls per lamp!
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

// Cache merged geometry for all lamp posts (same structure)
let _cachedLampGeo = null;

class LampPost extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {boolean} isOn - Whether the lamp is lit
     * @param {boolean} castShadow - Whether the light casts shadows (performance impact)
     */
    constructor(THREE, isOn = true, castShadow = false) {
        super(THREE);
        this.isOn = isOn;
        this.castShadow = castShadow;
        this.matManager = getMaterialManager(THREE);
        this.light = null;
        this.postHeight = 5;
        this.postRadius = 0.12;
    }
    
    /**
     * Get or create merged geometry for the lamp post metal parts
     */
    _getMergedMetalGeometry() {
        if (_cachedLampGeo) return _cachedLampGeo;
        
        const THREE = this.THREE;
        const postHeight = this.postHeight;
        const postRadius = this.postRadius;
        const geometries = [];
        
        // Base plate
        const baseGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.25, 8);
        baseGeo.translate(0, 0.125, 0);
        geometries.push(baseGeo);
        
        // Base ring detail
        const baseRingGeo = new THREE.TorusGeometry(0.4, 0.04, 6, 16);
        baseRingGeo.rotateX(Math.PI / 2);
        baseRingGeo.translate(0, 0.25, 0);
        geometries.push(baseRingGeo);
        
        // Post - tapered
        const postGeo = new THREE.CylinderGeometry(postRadius * 0.9, postRadius * 1.1, postHeight, 8);
        postGeo.translate(0, postHeight / 2 + 0.25, 0);
        geometries.push(postGeo);
        
        // Decorative rings on post
        [0.4, 0.7].forEach(t => {
            const ringGeo = new THREE.TorusGeometry(postRadius * 1.4, 0.025, 6, 12);
            ringGeo.rotateX(Math.PI / 2);
            ringGeo.translate(0, postHeight * t, 0);
            geometries.push(ringGeo);
        });
        
        // Lamp arm bracket
        const bracketGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08);
        bracketGeo.translate(0, postHeight + 0.2, 0);
        geometries.push(bracketGeo);
        
        // Lamp housing (lantern style)
        const housingGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.35, 6);
        housingGeo.translate(0, postHeight + 0.55, 0);
        geometries.push(housingGeo);
        
        // Lamp roof (pointed)
        const roofGeo = new THREE.ConeGeometry(0.4, 0.35, 6);
        roofGeo.translate(0, postHeight + 0.9, 0);
        geometries.push(roofGeo);
        
        // Roof finial
        const finialGeo = new THREE.SphereGeometry(0.06, 6, 6);
        finialGeo.translate(0, postHeight + 1.1, 0);
        geometries.push(finialGeo);
        
        // Merge all metal parts
        _cachedLampGeo = this._manualMergeGeometries(geometries);
        
        // Dispose source geometries
        geometries.forEach(g => g.dispose());
        
        return _cachedLampGeo;
    }
    
    /**
     * Manual geometry merge
     */
    _manualMergeGeometries(geometries) {
        if (geometries.length === 0) return null;
        
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
        const group = this.createGroup(scene);
        group.name = 'lamp_post';
        group.position.set(x, y, z);
        
        // Get merged metal geometry (cached globally)
        const metalGeo = this._getMergedMetalGeometry();
        const metalMat = this.matManager.get(PropColors.metalDark, { roughness: 0.5, metalness: 0.4 });
        
        // ONLY 2 MESHES instead of 10!
        // All metal parts in one mesh
        const metalMesh = new THREE.Mesh(metalGeo, metalMat);
        metalMesh.castShadow = true;
        metalMesh.receiveShadow = true;
        this.addMesh(metalMesh, group);
        
        // Glass globe (separate for different material)
        const globeMat = this.matManager.get(
            this.isOn ? 0xFFF8E0 : PropColors.iceTranslucent,
            {
                roughness: 0.1,
                transparent: true,
                opacity: this.isOn ? 0.95 : 0.6,
                emissive: this.isOn ? 0xFFE4B5 : undefined,
                emissiveIntensity: this.isOn ? 1.2 : 0,
            }
        );
        const globeGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const globe = new THREE.Mesh(globeGeo, globeMat);
        globe.position.y = this.postHeight + 0.35;
        this.addMesh(globe, group);
        
        // Point light - skip on Apple (Mac + iOS) + Android for performance
        const skipPointLight = typeof window !== 'undefined' && (window._isAppleDevice || window._isAndroidDevice);
        if (this.isOn && !skipPointLight) {
            const intensity = this.castShadow ? 3.0 : 1.8;
            const distance = this.castShadow ? 20 : 12;
            
            this.light = new THREE.PointLight(0xFFE4B5, intensity, distance, 1.8);
            this.light.position.y = this.postHeight + 0.35;
            this.light.castShadow = this.castShadow;
            
            if (this.castShadow) {
                this.light.shadow.mapSize.width = 512;
                this.light.shadow.mapSize.height = 512;
                this.light.shadow.camera.near = 0.5;
                this.light.shadow.camera.far = 20;
                this.light.shadow.bias = -0.001;
            }
            
            this.addLight(this.light, group);
        }
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 0.35;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: this.postHeight + 1.2,
        };
    }
    
    /**
     * Get the light object for external control
     */
    getLight() {
        return this.light;
    }
}

export default LampPost;

