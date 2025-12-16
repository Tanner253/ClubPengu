/**
 * BaseBuilding - Base class for all building generators
 * Buildings are large structures that contain multiple meshes and lights
 */

import { getMaterialManager } from '../props/PropMaterials';

class BaseBuilding {
    constructor(THREE) {
        this.THREE = THREE;
        this.materialManager = getMaterialManager(THREE);
        this.group = new THREE.Group();
        this.lights = [];
        this.animatedParts = [];
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

