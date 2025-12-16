/**
 * PropMaterials - Shared material caching for props
 * Reduces GPU memory and improves performance by reusing materials
 */

class PropMaterials {
    constructor(THREE) {
        this.THREE = THREE;
        this.cache = new Map();
    }
    
    /**
     * Get or create a cached material
     * @param {string|number} color - Color value
     * @param {Object} options - Material options
     * @returns {THREE.MeshStandardMaterial}
     */
    get(color, options = {}) {
        const key = this.createKey(color, options);
        
        if (!this.cache.has(key)) {
            const mat = this.create(color, options);
            this.cache.set(key, mat);
        }
        
        return this.cache.get(key);
    }
    
    /**
     * Create a unique cache key for material settings
     * @private
     */
    createKey(color, options) {
        return `${color}_${JSON.stringify(options)}`;
    }
    
    /**
     * Create a new material
     * @private
     */
    create(color, options = {}) {
        const config = {
            color: new this.THREE.Color(color),
            roughness: options.roughness ?? 0.8,
            metalness: options.metalness ?? 0,
            transparent: options.transparent ?? false,
            opacity: options.opacity ?? 1,
            side: options.doubleSided ? this.THREE.DoubleSide : this.THREE.FrontSide,
        };
        
        // Only add emissive properties if emissive color is provided
        if (options.emissive) {
            config.emissive = new this.THREE.Color(options.emissive);
            config.emissiveIntensity = options.emissiveIntensity ?? 0.5;
        }
        
        return new this.THREE.MeshStandardMaterial(config);
    }
    
    /**
     * Clear cache and dispose all materials
     */
    dispose() {
        this.cache.forEach(mat => {
            if (mat.dispose) mat.dispose();
            if (mat.map) mat.map.dispose();
            if (mat.normalMap) mat.normalMap.dispose();
            if (mat.emissiveMap) mat.emissiveMap.dispose();
        });
        this.cache.clear();
    }
    
    /**
     * Get cache size
     */
    get size() {
        return this.cache.size;
    }
}

// Singleton instance per THREE reference
const instances = new WeakMap();

export const getMaterialManager = (THREE) => {
    if (!instances.has(THREE)) {
        instances.set(THREE, new PropMaterials(THREE));
    }
    return instances.get(THREE);
};

export default PropMaterials;

