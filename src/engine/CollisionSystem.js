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
     * Get AABB bounds for a collider (accounts for rotation)
     */
    _getColliderBounds(collider) {
        const { x, z, shape, rotation = 0 } = collider;
        
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
            
            // For rotated boxes, compute AABB of all 4 corners
            if (rotation !== 0) {
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                
                // The 4 corners in local space
                const corners = [
                    { lx: -hw, lz: -hd },
                    { lx:  hw, lz: -hd },
                    { lx:  hw, lz:  hd },
                    { lx: -hw, lz:  hd }
                ];
                
                // Transform to world space and find bounds
                let minX = Infinity, maxX = -Infinity;
                let minZ = Infinity, maxZ = -Infinity;
                
                for (const c of corners) {
                    const wx = x + c.lx * cos - c.lz * sin;
                    const wz = z + c.lx * sin + c.lz * cos;
                    minX = Math.min(minX, wx);
                    maxX = Math.max(maxX, wx);
                    minZ = Math.min(minZ, wz);
                    maxZ = Math.max(maxZ, wz);
                }
                
                return { minX, maxX, minZ, maxZ };
            }
            
            // No rotation - simple AABB
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
    addCollider(x, z, shape, type = CollisionSystem.TYPES.SOLID, data = {}, rotation = 0, y = 0) {
        const id = this.nextId++;
        
        const collider = {
            id,
            x,
            z,
            y, // Y position (base of collider)
            shape,
            type,
            data,
            rotation, // Rotation in radians (for box colliders)
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
    addTrigger(x, z, shape, callback, data = {}, rotation = 0, y = 0) {
        const id = this.nextId++;
        
        this.triggers.set(id, {
            id,
            x,
            z,
            y,  // Y position for elevated triggers
            shape,
            rotation,  // Support rotation for box-shaped triggers
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
     * @param {number} y - Optional Y position for height-based collision (default 0)
     * @returns {Object|null} First collider hit, or null
     */
    checkCollision(x, z, radius = 0.5, y = 0) {
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
            
            // Height-based collision check
            // Get height from either .height (cylinder) or .size.y (box)
            const colliderThickness = collider.shape.height || collider.shape.size?.y || 100; // Default to tall if not specified
            const colliderBase = collider.y || 0;
            const colliderTop = colliderBase + colliderThickness;
            
            // If player Y is above the collider, skip collision (player is on top)
            if (y >= colliderTop - 0.1) {
                continue; // Player is above this collider
            }
            
            // If player Y is below the collider base, skip collision (player is under it)
            if (y < colliderBase - 1.5) { // Player height is ~1.5
                continue;
            }
            
            if (this._testCollision(x, z, radius, collider)) {
                return collider;
            }
        }
        
        return null;
    }
    
    /**
     * Check if player can land on any collider at position
     * @returns {{ canLand: boolean, landingY: number, collider: Object|null }}
     */
    checkLanding(x, z, y, radius = 0.5) {
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
        
        let highestLanding = { canLand: false, landingY: 0, collider: null };
        
        for (const id of nearbyIds) {
            const collider = this.colliders.get(id);
            if (!collider || collider.type === CollisionSystem.TYPES.NONE) continue;
            if (collider.type === CollisionSystem.TYPES.WATER) continue; // Can't land on water
            
            // Check if player is within XZ bounds of this collider
            if (this._testCollision(x, z, radius, collider)) {
                // Get height from either .height (cylinder) or .size.y (box)
                const colliderThickness = collider.shape.height || collider.shape.size?.y || 0;
                const colliderBase = collider.y || 0;
                const colliderTop = colliderBase + colliderThickness;
                
                // Player can land if they're above the collider top (or close to it)
                if (y >= colliderTop - 0.5 && colliderTop > highestLanding.landingY) {
                    highestLanding = {
                        canLand: true,
                        landingY: colliderTop,
                        collider: collider
                    };
                }
            }
        }
        
        return highestLanding;
    }

    /**
     * Check if movement from (x, z) to (newX, newZ) would cause collision
     * Returns the position we can safely move to
     * @param {number} y - Player Y position for height-based collision
     * @returns {{ x: number, z: number, collided: boolean, collider: Object|null }}
     */
    checkMovement(x, z, newX, newZ, radius = 0.5, y = 0) {
        // First check if destination is clear
        const collision = this.checkCollision(newX, newZ, radius, y);
        
        if (!collision) {
            return { x: newX, z: newZ, collided: false, collider: null };
        }
        
        // Try sliding along walls (separate X and Z movement)
        const slideX = this.checkCollision(newX, z, radius, y);
        const slideZ = this.checkCollision(x, newZ, radius, y);
        
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
     * @param {number} playerY - Player Y position for height-based trigger filtering
     */
    checkTriggers(playerX, playerZ, playerRadius = 0.5, playerY = 0) {
        const triggered = [];
        
        this.triggers.forEach((trigger, id) => {
            // Height check for elevated triggers
            const triggerY = trigger.y || 0;
            
            // For ground-level triggers (y=0), prevent triggering when ON TOP of furniture
            // For elevated triggers (y>0), only trigger when player is at that elevation
            let heightOk;
            if (triggerY > 1) {
                // Elevated trigger - player must be within range of trigger's Y level
                heightOk = Math.abs(playerY - triggerY) < 3.0; // Increased tolerance
            } else {
                // Ground level trigger - player must not be standing on top
                const maxHeight = trigger.data?.data?.seatHeight || trigger.data?.seatHeight || 2;
                heightOk = playerY < maxHeight + 0.3;
            }
            
            const inXZ = this._testCollision(playerX, playerZ, playerRadius, trigger);
            const isInside = heightOk && inXZ;
            
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
     * @param {number} playerY - Player's Y position for height filtering
     */
    getActiveTriggers(playerX, playerZ, playerRadius = 0.5, playerY = 0) {
        const active = [];
        
        this.triggers.forEach(trigger => {
            // Height check for elevated triggers (same logic as checkTriggers)
            const triggerY = trigger.y || 0;
            let heightOk;
            if (triggerY > 1) {
                // Elevated trigger - player must be within range
                heightOk = Math.abs(playerY - triggerY) < 2.5;
            } else {
                // Ground level trigger
                const maxHeight = trigger.data?.data?.seatHeight || trigger.data?.seatHeight || 2;
                heightOk = playerY < maxHeight + 0.3;
            }
            
            if (heightOk && this._testCollision(playerX, playerZ, playerRadius, trigger)) {
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
            // Circle vs Oriented Box (OBB)
            const halfW = shape.size.x / 2;
            const halfD = shape.size.z / 2;
            const rotation = collider.rotation || 0;
            
            // Transform player position into box's local space
            const dx = x - collider.x;
            const dz = z - collider.z;
            
            // Rotate point by -rotation to get into box's local coordinate system
            const cos = Math.cos(-rotation);
            const sin = Math.sin(-rotation);
            const localX = dx * cos - dz * sin;
            const localZ = dx * sin + dz * cos;
            
            // Now do standard AABB test in local space
            const closestX = Math.max(-halfW, Math.min(localX, halfW));
            const closestZ = Math.max(-halfD, Math.min(localZ, halfD));
            
            // Check distance from closest point to circle center (in local space)
            const dist = Math.sqrt(
                (localX - closestX) ** 2 + (localZ - closestZ) ** 2
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
                { name: prop.name, propType: prop.type },
                prop.rotation || 0  // Support rotation for box colliders
            );
            ids.push(id);
        });
        
        return ids;
    }

    /**
     * Register a prop mesh - automatically extracts collision and interaction zones from userData
     * This is the preferred way to register props - handles all transformations automatically
     * @param {THREE.Object3D} mesh - The prop mesh (must have position and rotation set)
     * @param {Function} interactionCallback - Optional callback for interaction zones
     * @returns {{ colliderId: number|null, triggerId: number|null }}
     */
    registerProp(mesh, interactionCallback = null) {
        const result = { colliderId: null, triggerId: null };
        
        const worldX = mesh.position.x;
        const worldZ = mesh.position.z;
        const rotation = mesh.rotation.y || 0;
        
        // Register collision from userData.collision
        if (mesh.userData.collision) {
            const col = mesh.userData.collision;
            const colliderY = mesh.position.y || col.y || 0;  // Support elevated props
            result.colliderId = this.addCollider(
                worldX,
                worldZ,
                {
                    type: col.type,
                    radius: col.radius,
                    size: col.size,
                    height: col.height
                },
                CollisionSystem.TYPES.SOLID,
                { name: mesh.name, mesh },
                rotation,
                colliderY  // Y position for elevated props
            );
        }
        
        // Register interaction zone from userData.interactionZone
        if (mesh.userData.interactionZone) {
            const zone = mesh.userData.interactionZone;
            
            // Calculate zone position with rotation
            let zoneOffsetX = zone.position?.x || 0;
            let zoneOffsetZ = zone.position?.z || 0;
            
            if (rotation !== 0) {
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rotatedX = zoneOffsetX * cos - zoneOffsetZ * sin;
                const rotatedZ = zoneOffsetX * sin + zoneOffsetZ * cos;
                zoneOffsetX = rotatedX;
                zoneOffsetZ = rotatedZ;
            }
            
            const zoneX = worldX + zoneOffsetX;
            const zoneZ = worldZ + zoneOffsetZ;
            
            // Use mesh Y position for the trigger (same Y as the bench/prop)
            const triggerY = mesh.position.y || 0;
            
            // Calculate seat height - use zone's if already set (elevated benches), otherwise add triggerY
            const baseSeatHeight = zone.seatHeight || 0.8;
            const finalSeatHeight = baseSeatHeight > 1 ? baseSeatHeight : (triggerY + baseSeatHeight);
            
            // Create zone data with world transform info including correct Y
            const zoneData = {
                ...zone,
                worldX,
                worldZ,
                worldY: triggerY,
                worldRotation: rotation,
                platformHeight: zone.platformHeight || triggerY,
                seatHeight: finalSeatHeight,
                data: {
                    ...(zone.data || {}),
                    platformHeight: zone.platformHeight || triggerY,
                    seatHeight: finalSeatHeight
                }
            };
            
            result.triggerId = this.addTrigger(
                zoneX,
                zoneZ,
                {
                    type: zone.type || 'sphere',
                    radius: zone.radius || 2,
                    size: zone.size
                },
                interactionCallback ? (event) => interactionCallback(event, zoneData) : null,
                { action: zone.action, data: zoneData, seatHeight: zoneData.seatHeight, platformHeight: triggerY },
                rotation,
                triggerY
            );
        }
        
        return result;
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
        const elevatedMat = new THREE.MeshBasicMaterial({ 
            color: 0xffff00, 
            transparent: true, 
            opacity: 0.4,
            wireframe: true
        });
        
        // Visualize colliders
        this.colliders.forEach(collider => {
            let geo;
            const height = collider.shape.height || 2;
            const baseY = collider.y || 0;
            
            if (collider.shape.type === 'cylinder') {
                geo = new THREE.CylinderGeometry(
                    collider.shape.radius, 
                    collider.shape.radius, 
                    height, 
                    8
                );
            } else if (collider.shape.type === 'box') {
                geo = new THREE.BoxGeometry(
                    collider.shape.size.x,
                    collider.shape.size.y || height,
                    collider.shape.size.z
                );
            } else {
                geo = new THREE.SphereGeometry(collider.shape.radius || 1, 8, 8);
            }
            
            // Use yellow for elevated colliders (y > 0)
            const mat = baseY > 0 ? elevatedMat : solidMat;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(collider.x, baseY + height / 2, collider.z);
            
            // Apply rotation if present
            if (collider.rotation) {
                mesh.rotation.y = collider.rotation;
            }
            
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
    
    /**
     * Toggle debug visualization
     * @param {THREE.Scene} scene - Scene to add/remove debug mesh
     * @param {THREE} THREE - Three.js reference
     * @param {boolean} enabled - Whether to show debug
     */
    toggleDebug(scene, THREE, enabled) {
        // Remove existing debug mesh
        const existing = scene.getObjectByName('collision_debug');
        if (existing) {
            scene.remove(existing);
            existing.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
        }
        
        // Add new debug mesh if enabled
        if (enabled) {
            const debugMesh = this.createDebugMesh(THREE);
            scene.add(debugMesh);
            return debugMesh;
        }
        return null;
    }
}

export default CollisionSystem;




