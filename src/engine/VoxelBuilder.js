import { VOXEL_SIZE, PALETTE } from '../constants';

/**
 * VoxelBuilder - Optimized voxel mesh construction
 * Merges voxels into single BufferGeometry for performance
 */
class VoxelBuilder {
    constructor(THREE) {
        this.THREE = THREE;
        this.geometryCache = new Map();
    }
    
    /**
     * Build optimized penguin mesh using merged geometry
     * Reduces draw calls by ~80% compared to individual voxel meshes
     */
    buildPenguinMesh(voxelData, palette = PALETTE) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Group voxels by color for batching
        const colorGroups = new Map();
        
        voxelData.forEach(v => {
            const colorHex = palette[v.c] || v.c;
            if (!colorGroups.has(colorHex)) {
                colorGroups.set(colorHex, []);
            }
            colorGroups.get(colorHex).push(v);
        });
        
        // Create merged geometry for each color group
        colorGroups.forEach((voxels, colorHex) => {
            const mesh = this.createMergedVoxelMesh(voxels, colorHex);
            if (mesh) group.add(mesh);
        });
        
        return group;
    }
    
    /**
     * Create a single merged mesh from multiple voxels of same color
     */
    createMergedVoxelMesh(voxels, colorHex) {
        const THREE = this.THREE;
        
        if (voxels.length === 0) return null;
        
        // Use BufferGeometry for performance
        const positions = [];
        const normals = [];
        const indices = [];
        
        let vertexOffset = 0;
        
        voxels.forEach(v => {
            const x = v.x * VOXEL_SIZE;
            const y = v.y * VOXEL_SIZE;
            const z = v.z * VOXEL_SIZE;
            const s = VOXEL_SIZE / 2;
            const scaleY = v.scaleY || 1;
            
            // Box vertices (8 corners)
            const boxVerts = [
                // Front face
                [x - s, y - s * scaleY, z + s],
                [x + s, y - s * scaleY, z + s],
                [x + s, y + s * scaleY, z + s],
                [x - s, y + s * scaleY, z + s],
                // Back face
                [x - s, y - s * scaleY, z - s],
                [x + s, y - s * scaleY, z - s],
                [x + s, y + s * scaleY, z - s],
                [x - s, y + s * scaleY, z - s],
            ];
            
            // Add vertices for all 6 faces
            const faces = [
                // Front
                { verts: [0, 1, 2, 3], normal: [0, 0, 1] },
                // Back
                { verts: [5, 4, 7, 6], normal: [0, 0, -1] },
                // Top
                { verts: [3, 2, 6, 7], normal: [0, 1, 0] },
                // Bottom
                { verts: [4, 5, 1, 0], normal: [0, -1, 0] },
                // Right
                { verts: [1, 5, 6, 2], normal: [1, 0, 0] },
                // Left
                { verts: [4, 0, 3, 7], normal: [-1, 0, 0] },
            ];
            
            faces.forEach(face => {
                const baseIndex = vertexOffset;
                
                face.verts.forEach(vi => {
                    positions.push(...boxVerts[vi]);
                    normals.push(...face.normal);
                });
                
                // Two triangles per face
                indices.push(
                    baseIndex, baseIndex + 1, baseIndex + 2,
                    baseIndex, baseIndex + 2, baseIndex + 3
                );
                
                vertexOffset += 4;
            });
        });
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();
        
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(colorHex),
            roughness: 0.4,
            metalness: 0.1
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    /**
     * Build optimized penguin with named parts for animation
     */
    buildAnimatedPenguin(skinColor, assets, palette = PALETTE) {
        const THREE = this.THREE;
        const wrapper = new THREE.Group();
        const innerGroup = new THREE.Group();
        
        // Import generators dynamically to avoid circular deps
        const { generateBaseBody, generateHead, generateFlippers, generateFoot } = require('../generators');
        
        const color = palette[skinColor] || skinColor;
        
        // Build each part with merged geometry
        const parts = {
            body: this.buildPenguinMesh(generateBaseBody(color), palette),
            head: this.buildPenguinMesh(generateHead(color), palette),
            flipper_l: this.buildFlipperMesh(generateFlippers(color, true), palette, { x: 5, y: 0, z: 0 }),
            flipper_r: this.buildFlipperMesh(generateFlippers(color, false), palette, { x: -5, y: 0, z: 0 }),
            foot_l: this.buildFlipperMesh(generateFoot(3), palette, { x: 3, y: -6, z: 1 }),
            foot_r: this.buildFlipperMesh(generateFoot(-3), palette, { x: -3, y: -6, z: 1 }),
        };
        
        // Add parts with names for animation access
        Object.entries(parts).forEach(([name, mesh]) => {
            mesh.name = name;
            innerGroup.add(mesh);
        });
        
        // Add accessories if provided
        if (assets) {
            if (assets.hat && assets.HATS[assets.hat]?.length > 0) {
                const hatMesh = this.buildPenguinMesh(assets.HATS[assets.hat], palette);
                hatMesh.name = 'hat';
                innerGroup.add(hatMesh);
            }
            
            if (assets.eyes && assets.EYES[assets.eyes]) {
                const eyesMesh = this.buildPenguinMesh(assets.EYES[assets.eyes], palette);
                eyesMesh.name = 'eyes';
                innerGroup.add(eyesMesh);
            }
            
            if (assets.mouth && assets.MOUTH[assets.mouth]) {
                const mouthMesh = this.buildPenguinMesh(assets.MOUTH[assets.mouth], palette);
                mouthMesh.name = 'mouth';
                innerGroup.add(mouthMesh);
            }
            
            if (assets.bodyItem && assets.BODY[assets.bodyItem]?.length > 0) {
                const bodyMesh = this.buildPenguinMesh(assets.BODY[assets.bodyItem], palette);
                bodyMesh.name = 'accessory';
                innerGroup.add(bodyMesh);
            }
        }
        
        innerGroup.scale.set(0.2, 0.2, 0.2);
        innerGroup.position.y = 1;
        wrapper.add(innerGroup);
        
        return wrapper;
    }
    
    /**
     * Build flipper/foot with pivot point for animation
     */
    buildFlipperMesh(voxels, palette, pivot) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Offset voxels by pivot
        const offsetVoxels = voxels.map(v => ({
            ...v,
            x: v.x - pivot.x,
            y: v.y - pivot.y,
            z: v.z - pivot.z
        }));
        
        const mesh = this.buildPenguinMesh(offsetVoxels, palette);
        group.add(mesh);
        
        // Position group at pivot
        group.position.set(
            pivot.x * VOXEL_SIZE,
            pivot.y * VOXEL_SIZE,
            pivot.z * VOXEL_SIZE
        );
        
        return group;
    }
    
    /**
     * Create instanced mesh for repeated objects (trees, lamps, etc.)
     */
    createInstancedMesh(geometry, material, matrices) {
        const THREE = this.THREE;
        const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
        
        matrices.forEach((matrix, i) => {
            mesh.setMatrixAt(i, matrix);
        });
        
        mesh.instanceMatrix.needsUpdate = true;
        mesh.frustumCulled = true;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    /**
     * Dispose of geometry and materials to prevent memory leaks
     */
    dispose(object) {
        if (object.geometry) {
            object.geometry.dispose();
        }
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(m => m.dispose());
            } else {
                object.material.dispose();
            }
        }
        if (object.children) {
            object.children.forEach(child => this.dispose(child));
        }
    }
}

export default VoxelBuilder;



