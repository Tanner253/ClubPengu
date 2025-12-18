/**
 * PropGeometries - Shared geometry caching for props
 * Reduces GPU memory and draw calls by reusing identical geometries
 * 
 * PERFORMANCE IMPACT: Geometry creation is expensive. Caching identical
 * geometries across all props can reduce memory usage by 60-80% and
 * improve load times significantly.
 */

class PropGeometries {
    constructor(THREE) {
        this.THREE = THREE;
        this.cache = new Map();
    }
    
    /**
     * Create a unique cache key for geometry
     * @private
     */
    _createKey(type, ...params) {
        return `${type}_${params.join('_')}`;
    }
    
    /**
     * Generic get method for any geometry type
     * @param {string} type - Geometry type ('Cylinder', 'Box', 'Sphere', 'Cone', 'Torus', 'Icosahedron')
     * @param {Array} args - Constructor arguments
     * @returns {THREE.BufferGeometry}
     */
    get(type, args = []) {
        const key = this._createKey(type, ...args);
        if (!this.cache.has(key)) {
            let geometry;
            switch (type) {
                case 'Cylinder':
                    geometry = new this.THREE.CylinderGeometry(...args);
                    break;
                case 'Box':
                    geometry = new this.THREE.BoxGeometry(...args);
                    break;
                case 'Sphere':
                    geometry = new this.THREE.SphereGeometry(...args);
                    break;
                case 'Cone':
                    geometry = new this.THREE.ConeGeometry(...args);
                    break;
                case 'Torus':
                    geometry = new this.THREE.TorusGeometry(...args);
                    break;
                case 'Icosahedron':
                    geometry = new this.THREE.IcosahedronGeometry(...args);
                    break;
                case 'Circle':
                    geometry = new this.THREE.CircleGeometry(...args);
                    break;
                case 'Plane':
                    geometry = new this.THREE.PlaneGeometry(...args);
                    break;
                case 'Ring':
                    geometry = new this.THREE.RingGeometry(...args);
                    break;
                default:
                    console.warn(`PropGeometries: Unknown geometry type: ${type}`);
                    geometry = new this.THREE.BufferGeometry();
            }
            this.cache.set(key, geometry);
        }
        return this.cache.get(key);
    }
    
    /**
     * Get or create a cached CylinderGeometry
     */
    cylinder(radiusTop, radiusBottom, height, radialSegments = 8, heightSegments = 1) {
        const key = this._createKey('cyl', radiusTop, radiusBottom, height, radialSegments, heightSegments);
        if (!this.cache.has(key)) {
            this.cache.set(key, new this.THREE.CylinderGeometry(
                radiusTop, radiusBottom, height, radialSegments, heightSegments
            ));
        }
        return this.cache.get(key);
    }
    
    /**
     * Get or create a cached ConeGeometry
     */
    cone(radius, height, radialSegments = 8) {
        const key = this._createKey('cone', radius, height, radialSegments);
        if (!this.cache.has(key)) {
            this.cache.set(key, new this.THREE.ConeGeometry(radius, height, radialSegments));
        }
        return this.cache.get(key);
    }
    
    /**
     * Get or create a cached SphereGeometry
     */
    sphere(radius, widthSegments = 16, heightSegments = 16) {
        const key = this._createKey('sphere', radius, widthSegments, heightSegments);
        if (!this.cache.has(key)) {
            this.cache.set(key, new this.THREE.SphereGeometry(radius, widthSegments, heightSegments));
        }
        return this.cache.get(key);
    }
    
    /**
     * Get or create a cached BoxGeometry
     */
    box(width, height, depth, widthSegments = 1, heightSegments = 1, depthSegments = 1) {
        const key = this._createKey('box', width, height, depth, widthSegments, heightSegments, depthSegments);
        if (!this.cache.has(key)) {
            this.cache.set(key, new this.THREE.BoxGeometry(
                width, height, depth, widthSegments, heightSegments, depthSegments
            ));
        }
        return this.cache.get(key);
    }
    
    /**
     * Get or create a cached TorusGeometry
     */
    torus(radius, tube, radialSegments = 8, tubularSegments = 16) {
        const key = this._createKey('torus', radius, tube, radialSegments, tubularSegments);
        if (!this.cache.has(key)) {
            this.cache.set(key, new this.THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments));
        }
        return this.cache.get(key);
    }
    
    /**
     * Get or create a cached CircleGeometry
     */
    circle(radius, segments = 16) {
        const key = this._createKey('circle', radius, segments);
        if (!this.cache.has(key)) {
            this.cache.set(key, new this.THREE.CircleGeometry(radius, segments));
        }
        return this.cache.get(key);
    }
    
    /**
     * Get or create a cached PlaneGeometry
     */
    plane(width, height, widthSegments = 1, heightSegments = 1) {
        const key = this._createKey('plane', width, height, widthSegments, heightSegments);
        if (!this.cache.has(key)) {
            this.cache.set(key, new this.THREE.PlaneGeometry(width, height, widthSegments, heightSegments));
        }
        return this.cache.get(key);
    }
    
    /**
     * Get or create a cached RingGeometry
     */
    ring(innerRadius, outerRadius, thetaSegments = 16) {
        const key = this._createKey('ring', innerRadius, outerRadius, thetaSegments);
        if (!this.cache.has(key)) {
            this.cache.set(key, new this.THREE.RingGeometry(innerRadius, outerRadius, thetaSegments));
        }
        return this.cache.get(key);
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            cachedGeometries: this.cache.size,
            types: [...new Set([...this.cache.keys()].map(k => k.split('_')[0]))]
        };
    }
    
    /**
     * Clear cache and dispose all geometries
     * Call this when changing scenes/rooms
     */
    dispose() {
        this.cache.forEach(geo => {
            if (geo.dispose) geo.dispose();
        });
        this.cache.clear();
    }
}

// Singleton instance per THREE reference
const instances = new WeakMap();

export const getGeometryManager = (THREE) => {
    if (!instances.has(THREE)) {
        instances.set(THREE, new PropGeometries(THREE));
    }
    return instances.get(THREE);
};

export default PropGeometries;

