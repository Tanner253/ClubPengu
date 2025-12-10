/**
 * CollisionSystem - Spatial hashing collision detection
 * Optimized for large worlds with many colliders
 * 
 * Uses a grid-based spatial hash for O(1) collision lookups
 */
class CollisionSystem {
    // Collision types for different behaviors
    static TYPES = {
        NONE: 0,        // No collision (walkable)
        SOLID: 1,       // Full blocking collision
        WATER: 2,       // Special - slows/blocks player
        TRIGGER: 3,     // Triggers action but doesn't block
        DECORATION: 4,  // Partial collision (can walk close)
    };

    /**
     * @param {number} worldWidth - World width in units
     * @param {number} worldDepth - World depth in units
     * @param {number} cellSize - Size of each grid cell (larger = less memory, slower queries)
     */
    constructor(worldWidth = 200, worldDepth = 200, cellSize = 4) {
        this.worldWidth = worldWidth;
        this.worldDepth = worldDepth;
        this.cellSize = cellSize;
        
        // Spatial hash grid - Map<cellKey, Set<collider>>
        this.grid = new Map();
        
        // All colliders for iteration
        this.colliders = new Map(); // id -> collider
        
        // Trigger zones (checked separately)
        this.triggers = new Map(); // id -> trigger
        
        // Counter for unique IDs
        this.nextId = 0;
        
        // Cached results for performance
        this._nearbyCache = [];
    }

    // ==================== GRID HELPERS ====================
    
    /**
     * Get cell key from world position
     */
    _getCellKey(x, z) {
        const cellX = Math.floor(x / this.cellSize);
        const cellZ = Math.floor(z / this.cellSize);
        return `${cellX},${cellZ}`;
    }

    /**
     * Get all cell keys that a collider overlaps
     */
    _getOverlappingCells(collider) {
        const cells = [];
        const bounds = this._getColliderBounds(collider);
        
        const minCellX = Math.floor(bounds.minX / this.cellSize);
        const maxCellX = Math.floor(bounds.maxX / this.cellSize);
        const minCellZ = Math.floor(bounds.minZ / this.cellSize);
        const maxCellZ = Math.floor(bounds.maxZ / this.cellSize);
        
        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cz = minCellZ; cz <= maxCellZ; cz++) {
                cells.push(`${cx},${cz}`);
            }
        }
        
        return cells;
    }

    /**
     * Get AABB bounds for a collider
     */
    _getColliderBounds(collider) {
        const { x, z, shape } = collider;
        
        if (shape.type === 'cylinder' || shape.type === 'sphere') {
            const r = shape.radius;
            return {
                minX: x - r,
                maxX: x + r,
                minZ: z - r,
                maxZ: z + r,
            };
        } else if (shape.type === 'box') {
            const hw = shape.size.x / 2;
            const hd = shape.size.z / 2;
            return {
                minX: x - hw,
                maxX: x + hw,
                minZ: z - hd,
                maxZ: z + hd,
            };
        }
        
        // Default fallback
        return { minX: x - 1, maxX: x + 1, minZ: z - 1, maxZ: z + 1 };
    }

    // ==================== COLLIDER MANAGEMENT ====================
    
    /**
     * Add a collider to the system
     * @param {number} x - World X position
     * @param {number} z - World Z position
     * @param {Object} shape - Shape definition { type, radius/size, height }
     * @param {number} type - Collision type from CollisionSystem.TYPES
     * @param {Object} data - Optional extra data (name, mesh reference, etc.)
     * @returns {number} Collider ID for later removal
     */
    addCollider(x, z, shape, type = CollisionSystem.TYPES.SOLID, data = {}) {
        const id = this.nextId++;
        
        const collider = {
            id,
            x,
            z,
            shape,
            type,
            data,
            cells: [], // Track which cells this collider is in
        };
        
        // Add to spatial grid
        const cells = this._getOverlappingCells(collider);
        cells.forEach(cellKey => {
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, new Set());
            }
            this.grid.get(cellKey).add(id);
        });
        collider.cells = cells;
        
        // Store collider
        this.colliders.set(id, collider);
        
        return id;
    }

    /**
     * Add a trigger zone (doesn't block, fires callback)
     * @param {number} x - World X position
     * @param {number} z - World Z position
     * @param {Object} shape - Shape definition
     * @param {Function} callback - Called when player enters (player) => {}
     * @param {Object} data - Optional extra data
     * @returns {number} Trigger ID
     */
    addTrigger(x, z, shape, callback, data = {}) {
        const id = this.nextId++;
        
        this.triggers.set(id, {
            id,
            x,
            z,
            shape,
            callback,
            data,
            wasInside: false, // Track state for enter/exit events
        });
        
        return id;
    }

    /**
     * Remove a collider by ID
     */
    removeCollider(id) {
        const collider = this.colliders.get(id);
        if (!collider) return false;
        
        // Remove from grid cells
        collider.cells.forEach(cellKey => {
            const cell = this.grid.get(cellKey);
            if (cell) {
                cell.delete(id);
                if (cell.size === 0) {
                    this.grid.delete(cellKey);
                }
            }
        });
        
        this.colliders.delete(id);
        return true;
    }

    /**
     * Remove a trigger by ID
     */
    removeTrigger(id) {
        return this.triggers.delete(id);
    }

    /**
     * Update collider position (for moving objects)
     */
    updateCollider(id, newX, newZ) {
        const collider = this.colliders.get(id);
        if (!collider) return false;
        
        // Remove from old cells
        collider.cells.forEach(cellKey => {
            const cell = this.grid.get(cellKey);
            if (cell) cell.delete(id);
        });
        
        // Update position
        collider.x = newX;
        collider.z = newZ;
        
        // Add to new cells
        const newCells = this._getOverlappingCells(collider);
        newCells.forEach(cellKey => {
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, new Set());
            }
            this.grid.get(cellKey).add(id);
        });
        collider.cells = newCells;
        
        return true;
    }

    // ==================== COLLISION QUERIES ====================
    
    /**
     * Check if a point collides with any solid collider
     * @param {number} x - Test X position
     * @param {number} z - Test Z position
     * @param {number} radius - Player/object radius
     * @returns {Object|null} First collider hit, or null
     */
    checkCollision(x, z, radius = 0.5) {
        // Get nearby colliders from spatial hash
        const cellKey = this._getCellKey(x, z);
        const nearbyIds = new Set();
        
        // Check current cell and adjacent cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const cx = Math.floor(x / this.cellSize) + dx;
                const cz = Math.floor(z / this.cellSize) + dz;
                const key = `${cx},${cz}`;
                const cell = this.grid.get(key);
                if (cell) {
                    cell.forEach(id => nearbyIds.add(id));
                }
            }
        }
        
        // Test collision with each nearby collider
        for (const id of nearbyIds) {
            const collider = this.colliders.get(id);
            if (!collider || collider.type === CollisionSystem.TYPES.NONE) continue;
            
            if (this._testCollision(x, z, radius, collider)) {
                return collider;
            }
        }
        
        return null;
    }

    /**
     * Check if movement from (x, z) to (newX, newZ) would cause collision
     * Returns the position we can safely move to
     * @returns {{ x: number, z: number, collided: boolean, collider: Object|null }}
     */
    checkMovement(x, z, newX, newZ, radius = 0.5) {
        // First check if destination is clear
        const collision = this.checkCollision(newX, newZ, radius);
        
        if (!collision) {
            return { x: newX, z: newZ, collided: false, collider: null };
        }
        
        // Try sliding along walls (separate X and Z movement)
        const slideX = this.checkCollision(newX, z, radius);
        const slideZ = this.checkCollision(x, newZ, radius);
        
        // Prefer movement direction that works
        if (!slideX) {
            return { x: newX, z: z, collided: true, collider: collision };
        }
        if (!slideZ) {
            return { x: x, z: newZ, collided: true, collider: collision };
        }
        
        // Blocked in both directions
        return { x: x, z: z, collided: true, collider: collision };
    }

    /**
     * Get all colliders near a point
     * @param {number} x - Center X
     * @param {number} z - Center Z
     * @param {number} searchRadius - Search radius
     * @returns {Array<Object>} Array of nearby colliders
     */
    getNearbyColliders(x, z, searchRadius = 10) {
        const results = [];
        const cellRadius = Math.ceil(searchRadius / this.cellSize);
        const centerCellX = Math.floor(x / this.cellSize);
        const centerCellZ = Math.floor(z / this.cellSize);
        
        const checked = new Set();
        
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                const key = `${centerCellX + dx},${centerCellZ + dz}`;
                const cell = this.grid.get(key);
                if (cell) {
                    cell.forEach(id => {
                        if (!checked.has(id)) {
                            checked.add(id);
                            const collider = this.colliders.get(id);
                            if (collider) {
                                const dist = Math.sqrt(
                                    (collider.x - x) ** 2 + (collider.z - z) ** 2
                                );
                                if (dist <= searchRadius + (collider.shape.radius || 1)) {
                                    results.push(collider);
                                }
                            }
                        }
                    });
                }
            }
        }
        
        return results;
    }

    /**
     * Check triggers and fire callbacks for enter/exit events
     */
    checkTriggers(playerX, playerZ, playerRadius = 0.5) {
        const triggered = [];
        
        this.triggers.forEach((trigger, id) => {
            const isInside = this._testCollision(playerX, playerZ, playerRadius, trigger);
            
            if (isInside && !trigger.wasInside) {
                // Just entered
                trigger.wasInside = true;
                if (trigger.callback) {
                    trigger.callback({ type: 'enter', trigger, playerX, playerZ });
                }
                triggered.push({ ...trigger, event: 'enter' });
            } else if (!isInside && trigger.wasInside) {
                // Just exited
                trigger.wasInside = false;
                if (trigger.callback) {
                    trigger.callback({ type: 'exit', trigger, playerX, playerZ });
                }
                triggered.push({ ...trigger, event: 'exit' });
            }
        });
        
        return triggered;
    }

    /**
     * Get all active triggers the player is currently inside
     */
    getActiveTriggers(playerX, playerZ, playerRadius = 0.5) {
        const active = [];
        
        this.triggers.forEach(trigger => {
            if (this._testCollision(playerX, playerZ, playerRadius, trigger)) {
                active.push(trigger);
            }
        });
        
        return active;
    }

    // ==================== COLLISION TESTS ====================
    
    /**
     * Test collision between a circle and a collider shape
     */
    _testCollision(x, z, radius, collider) {
        const { shape } = collider;
        
        if (shape.type === 'cylinder' || shape.type === 'sphere') {
            // Circle vs Circle
            const dist = Math.sqrt(
                (x - collider.x) ** 2 + (z - collider.z) ** 2
            );
            return dist < (radius + shape.radius);
        } 
        else if (shape.type === 'box') {
            // Circle vs AABB
            const halfW = shape.size.x / 2;
            const halfD = shape.size.z / 2;
            
            // Find closest point on box to circle center
            const closestX = Math.max(collider.x - halfW, Math.min(x, collider.x + halfW));
            const closestZ = Math.max(collider.z - halfD, Math.min(z, collider.z + halfD));
            
            // Check distance from closest point to circle center
            const dist = Math.sqrt(
                (x - closestX) ** 2 + (z - closestZ) ** 2
            );
            return dist < radius;
        }
        
        return false;
    }

    // ==================== BULK OPERATIONS ====================
    
    /**
     * Add multiple colliders from prop definitions
     * @param {Array<Object>} props - Array of { x, z, collision, ... }
     * @returns {Array<number>} Array of collider IDs
     */
    addPropsColliders(props) {
        const ids = [];
        
        props.forEach(prop => {
            if (!prop.collision) return;
            
            const { collision } = prop;
            const shape = {
                type: collision.type,
                radius: collision.radius,
                size: collision.size,
                height: collision.height,
            };
            
            const id = this.addCollider(
                prop.x,
                prop.z,
                shape,
                CollisionSystem.TYPES.SOLID,
                { name: prop.name, propType: prop.type }
            );
            ids.push(id);
        });
        
        return ids;
    }

    /**
     * Clear all colliders and triggers
     */
    clear() {
        this.grid.clear();
        this.colliders.clear();
        this.triggers.clear();
    }

    // ==================== DEBUG ====================
    
    /**
     * Get stats for debugging
     */
    getStats() {
        return {
            colliderCount: this.colliders.size,
            triggerCount: this.triggers.size,
            gridCellCount: this.grid.size,
            avgCollidersPerCell: this.grid.size > 0 
                ? Array.from(this.grid.values()).reduce((sum, cell) => sum + cell.size, 0) / this.grid.size
                : 0,
        };
    }

    /**
     * Create debug visualization meshes (for development)
     * @param {THREE} THREE - Three.js reference
     * @returns {THREE.Group} Group containing debug visuals
     */
    createDebugMesh(THREE) {
        const group = new THREE.Group();
        group.name = 'collision_debug';
        
        const solidMat = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.3,
            wireframe: true
        });
        const triggerMat = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.3,
            wireframe: true
        });
        
        // Visualize colliders
        this.colliders.forEach(collider => {
            let geo;
            if (collider.shape.type === 'cylinder') {
                geo = new THREE.CylinderGeometry(
                    collider.shape.radius, 
                    collider.shape.radius, 
                    collider.shape.height || 2, 
                    8
                );
            } else if (collider.shape.type === 'box') {
                geo = new THREE.BoxGeometry(
                    collider.shape.size.x,
                    collider.shape.size.y || 2,
                    collider.shape.size.z
                );
            } else {
                geo = new THREE.SphereGeometry(collider.shape.radius || 1, 8, 8);
            }
            
            const mesh = new THREE.Mesh(geo, solidMat);
            mesh.position.set(collider.x, (collider.shape.height || 2) / 2, collider.z);
            group.add(mesh);
        });
        
        // Visualize triggers
        this.triggers.forEach(trigger => {
            let geo;
            if (trigger.shape.type === 'sphere') {
                geo = new THREE.SphereGeometry(trigger.shape.radius, 16, 16);
            } else if (trigger.shape.type === 'box') {
                geo = new THREE.BoxGeometry(
                    trigger.shape.size.x,
                    1,
                    trigger.shape.size.z
                );
            } else {
                geo = new THREE.CylinderGeometry(trigger.shape.radius, trigger.shape.radius, 0.5, 16);
            }
            
            const mesh = new THREE.Mesh(geo, triggerMat);
            mesh.position.set(trigger.x, 0.5, trigger.z);
            group.add(mesh);
        });
        
        return group;
    }
}

export default CollisionSystem;



