/**
 * BaseProp - Abstract base class for all 3D props
 * Provides common functionality for spawning, updating, and cleanup
 */

class BaseProp {
    constructor(THREE) {
        if (new.target === BaseProp) {
            throw new Error('BaseProp is abstract and cannot be instantiated directly');
        }
        
        this.THREE = THREE;
        this.meshes = [];      // All meshes created by this prop
        this.lights = [];      // All lights created by this prop
        this.materials = [];   // Track materials for disposal
        this.geometries = [];  // Track geometries for disposal
        this.group = null;     // Optional parent group
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = 0;
    }
    
    /**
     * Spawn the prop into the scene
     * @param {THREE.Scene} scene - The scene to add to
     * @param {number} x - X position
     * @param {number} y - Y position  
     * @param {number} z - Z position
     * @param {Object} options - Prop-specific options
     * @returns {BaseProp} - Returns this for chaining
     */
    spawn(scene, x, y, z, options = {}) {
        throw new Error('spawn() must be implemented by subclass');
    }
    
    /**
     * Update the prop (for animations)
     * @param {number} time - Current time in seconds
     * @param {number} delta - Time since last frame
     */
    update(time, delta) {
        // Optional - override in subclass for animated props
    }
    
    /**
     * Create a group for this prop
     * @param {THREE.Scene} scene - Optional scene to add to immediately
     * @returns {THREE.Group}
     */
    createGroup(scene = null) {
        const group = new this.THREE.Group();
        if (scene) {
            scene.add(group);
        }
        this.group = group;
        this.meshes.push(group);
        return group;
    }
    
    /**
     * Add a mesh to tracking and optionally to scene/group
     * @param {THREE.Mesh} mesh
     * @param {THREE.Scene|THREE.Group} parent
     */
    addMesh(mesh, parent = null) {
        if (parent) {
            parent.add(mesh);
        }
        this.meshes.push(mesh);
        
        // Track geometry and material for disposal
        if (mesh.geometry && !this.geometries.includes(mesh.geometry)) {
            this.geometries.push(mesh.geometry);
        }
        if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach(mat => {
                if (!this.materials.includes(mat)) {
                    this.materials.push(mat);
                }
            });
        }
        
        return mesh;
    }
    
    /**
     * Add a light to tracking
     * @param {THREE.Light} light
     * @param {THREE.Scene|THREE.Group} parent
     */
    addLight(light, parent = null) {
        if (parent) {
            parent.add(light);
        }
        this.lights.push(light);
        return light;
    }
    
    /**
     * Create a standard material with common settings
     * @param {Object} options - MeshStandardMaterial options
     * @returns {THREE.MeshStandardMaterial}
     */
    createMaterial(options = {}) {
        const mat = new this.THREE.MeshStandardMaterial(options);
        this.materials.push(mat);
        return mat;
    }
    
    /**
     * Set the position of the prop (if using a group)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setPosition(x, y, z) {
        this.position = { x, y, z };
        if (this.group) {
            this.group.position.set(x, y, z);
        }
    }
    
    /**
     * Set the rotation of the prop (if using a group)
     * @param {number} y - Y rotation in radians
     */
    setRotation(y) {
        this.rotation = y;
        if (this.group) {
            this.group.rotation.y = y;
        }
    }
    
    /**
     * Remove prop from scene and dispose resources
     */
    cleanup() {
        // Remove meshes from scene
        this.meshes.forEach(mesh => {
            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }
        });
        
        // Remove lights from scene
        this.lights.forEach(light => {
            if (light.parent) {
                light.parent.remove(light);
            }
        });
        
        // Dispose geometries
        this.geometries.forEach(geo => {
            if (geo.dispose) geo.dispose();
        });
        
        // Dispose materials
        this.materials.forEach(mat => {
            if (mat.dispose) mat.dispose();
            // Dispose textures if any
            if (mat.map) mat.map.dispose();
            if (mat.normalMap) mat.normalMap.dispose();
            if (mat.emissiveMap) mat.emissiveMap.dispose();
        });
        
        // Clear arrays
        this.meshes = [];
        this.lights = [];
        this.geometries = [];
        this.materials = [];
        this.group = null;
    }
    
    /**
     * Alias for cleanup
     */
    dispose() {
        this.cleanup();
    }
    
    /**
     * Get collision bounds for this prop
     * @returns {Object|null} - { minX, maxX, minZ, maxZ, height } or null
     */
    getCollisionBounds() {
        return null; // Override in subclass if prop has collision
    }
    
    /**
     * Get trigger zone for this prop (for interactions)
     * @returns {Object|null} - { x, z, radius, type, data } or null
     */
    getTrigger() {
        return null; // Override in subclass if prop has trigger
    }
    
    /**
     * Get landing surface for this prop (for jumping)
     * @returns {Object|null} - { minX, maxX, minZ, maxZ, height } or null
     */
    getLandingSurface() {
        return null; // Override in subclass if prop can be landed on
    }
    
    /**
     * Optimize static meshes for performance
     * Call this after spawn() for props that don't animate most of their meshes
     * @param {Set<THREE.Mesh>} excludeMeshes - Optional set of meshes to exclude (for animated parts)
     */
    optimizeStaticMeshes(excludeMeshes = new Set()) {
        if (!this.group) return;
        
        this.group.traverse(child => {
            if (child.isMesh && !excludeMeshes.has(child)) {
                // Disable matrix auto-update for static meshes
                child.updateMatrix();
                child.matrixAutoUpdate = false;
            }
        });
        
        // Update the group's world matrix once
        this.group.updateMatrixWorld(true);
    }
}

export default BaseProp;

