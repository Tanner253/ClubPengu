import PropsFactory from '../engine/PropsFactory';
import CollisionSystem from '../engine/CollisionSystem';

/**
 * TownCenter - Room definition for the main town hub
 * 
 * Handles:
 * - Prop placement (trees, igloos, lamps, etc.)
 * - Collision setup
 * - Interactive zones
 * - Lighting
 */
class TownCenter {
    static ID = 'town';
    static NAME = 'Town Center';
    
    // World dimensions (in units, matches VoxelWorld CITY_SIZE * BUILDING_SCALE)
    static WORLD_SIZE = 160; // 40 * 4
    static CENTER = TownCenter.WORLD_SIZE / 2;
    
    // Building definitions (existing buildings from VoxelWorld)
    static BUILDINGS = [
        { 
            id: 'dojo', 
            name: 'THE DOJO', 
            position: { x: 0, z: -25 },
            size: { w: 14, h: 8, d: 14 },
        },
        { 
            id: 'market', 
            name: 'GIFT SHOP', 
            position: { x: -22, z: -8 },
            size: { w: 10, h: 6, d: 10 },
        },
        { 
            id: 'plaza', 
            name: 'PIZZA PARLOR', 
            position: { x: 25, z: 5 },
            size: { w: 12, h: 7, d: 10 },
        }
    ];

    constructor(THREE) {
        this.THREE = THREE;
        this.propsFactory = new PropsFactory(THREE);
        this.collisionSystem = new CollisionSystem(
            TownCenter.WORLD_SIZE,
            TownCenter.WORLD_SIZE,
            4 // Cell size for spatial hashing
        );
        
        // Track spawned objects for cleanup
        this.propMeshes = [];
        this.lights = [];
        
        // Generate prop placements
        this.propPlacements = this._generatePropPlacements();
    }

    /**
     * Generate prop placement positions
     * Creates a detailed, organic layout
     */
    _generatePropPlacements() {
        const C = TownCenter.CENTER;
        const props = [];
        
        // ==================== PINE TREES ====================
        // Strategic tree placement - clusters around perimeter and between buildings
        
        // Northern tree line (behind dojo)
        const northTrees = [
            { x: C - 30, z: C - 45, size: 'large' },
            { x: C - 20, z: C - 48, size: 'medium' },
            { x: C - 10, z: C - 50, size: 'large' },
            { x: C + 5, z: C - 48, size: 'medium' },
            { x: C + 15, z: C - 45, size: 'large' },
            { x: C + 25, z: C - 48, size: 'medium' },
            { x: C + 35, z: C - 45, size: 'large' },
        ];
        
        // Western tree cluster (near gift shop)
        const westTrees = [
            { x: C - 45, z: C - 20, size: 'large' },
            { x: C - 48, z: C - 5, size: 'medium' },
            { x: C - 45, z: C + 10, size: 'large' },
            { x: C - 50, z: C + 25, size: 'medium' },
            { x: C - 42, z: C, size: 'small' },
        ];
        
        // Eastern tree cluster
        const eastTrees = [
            { x: C + 45, z: C - 15, size: 'large' },
            { x: C + 48, z: C, size: 'medium' },
            { x: C + 45, z: C + 15, size: 'large' },
            { x: C + 42, z: C + 30, size: 'medium' },
        ];
        
        // Southern tree line (beach transition)
        const southTrees = [
            { x: C - 35, z: C + 40, size: 'medium' },
            { x: C - 15, z: C + 45, size: 'large' },
            { x: C + 5, z: C + 42, size: 'medium' },
            { x: C + 25, z: C + 45, size: 'large' },
            { x: C + 40, z: C + 40, size: 'medium' },
        ];
        
        // Interior decorative trees
        const interiorTrees = [
            { x: C - 35, z: C - 25, size: 'small' },  // Near gift shop
            { x: C + 38, z: C - 5, size: 'small' },   // Near pizza
            { x: C - 10, z: C + 20, size: 'medium' }, // Plaza area
            { x: C + 15, z: C + 25, size: 'medium' }, // Plaza area
        ];
        
        [...northTrees, ...westTrees, ...eastTrees, ...southTrees, ...interiorTrees].forEach(tree => {
            props.push({
                type: 'pine_tree',
                ...tree,
                rotation: Math.random() * Math.PI * 2,
            });
        });
        
        // ==================== IGLOOS ====================
        // Residential area - southwest
        props.push(
            // Igloos face forward (toward +Z) so entrances align with portal detection
            { type: 'igloo', x: C - 35, z: C + 20, rotation: 0 },
            { type: 'igloo', x: C - 25, z: C + 30, rotation: 0 },
        );
        
        // ==================== LAMP POSTS ====================
        // Path lighting - main walkways
        const lampPositions = [
            // Main plaza circle
            { x: C, z: C + 15 },
            { x: C + 12, z: C + 10 },
            { x: C - 12, z: C + 10 },
            { x: C + 10, z: C - 5 },
            { x: C - 10, z: C - 5 },
            
            // Path to dojo
            { x: C, z: C - 10 },
            
            // Near gift shop
            { x: C - 18, z: C },
            { x: C - 30, z: C - 15 },
            
            // Near pizza parlor
            { x: C + 20, z: C + 12 },
            { x: C + 35, z: C + 8 },
            
            // Southern path
            { x: C - 5, z: C + 30 },
            { x: C + 10, z: C + 35 },
        ];
        
        lampPositions.forEach(pos => {
            props.push({ type: 'lamp_post', ...pos, isOn: true });
        });
        
        // ==================== BENCHES ====================
        // Rest spots with scenic views
        props.push(
            // Central plaza benches
            { type: 'bench', x: C + 8, z: C + 5, rotation: -Math.PI / 4 },
            { type: 'bench', x: C - 8, z: C + 5, rotation: Math.PI / 4 },
            
            // Near gift shop
            { type: 'bench', x: C - 28, z: C + 5, rotation: Math.PI / 2 },
            
            // Near pizza parlor
            { type: 'bench', x: C + 30, z: C + 18, rotation: -Math.PI / 2 },
            
            // South scenic
            { type: 'bench', x: C, z: C + 35, rotation: 0 },
        );
        
        // ==================== SNOWMEN ====================
        // Fun interactive snowmen placed around town
        props.push(
            { type: 'snowman', x: C - 15, z: C + 15 },
            { type: 'snowman', x: C + 20, z: C - 15 },
        );
        
        // ==================== ROCKS ====================
        // Natural rock formations at edges
        props.push(
            { type: 'rock', x: C - 40, z: C - 35, size: 'large' },
            { type: 'rock', x: C + 42, z: C - 30, size: 'medium' },
            { type: 'rock', x: C - 45, z: C + 35, size: 'large' },
            { type: 'rock', x: C + 40, z: C + 38, size: 'medium' },
            { type: 'rock', x: C + 5, z: C - 40, size: 'small' },
        );
        
        // ==================== SNOW PILES ====================
        // Decorative snow drifts
        const snowPilePositions = [
            // Building edges
            { x: C - 28, z: C - 12, size: 'medium' },
            { x: C + 30, z: C, size: 'small' },
            { x: C + 5, z: C - 30, size: 'medium' },
            
            // Path edges
            { x: C - 5, z: C + 25, size: 'large' },
            { x: C + 15, z: C + 30, size: 'medium' },
            { x: C - 20, z: C + 35, size: 'small' },
            
            // Random natural drifts
            { x: C - 38, z: C + 5, size: 'medium' },
            { x: C + 38, z: C + 25, size: 'large' },
        ];
        
        snowPilePositions.forEach(pile => {
            props.push({ type: 'snow_pile', ...pile });
        });
        
        // ==================== SIGNPOSTS ====================
        // Directional signs at key intersections
        // Direction: 0=East(+X), 90=North(-Z), 180=West(-X), -90=South(+Z)
        props.push(
            {
                type: 'signpost',
                x: C,
                z: C + 8,
                signs: [
                    { text: 'DOJO', direction: 90 },       // North
                    { text: 'BEACH', direction: -90 },     // South
                    { text: 'GIFT SHOP', direction: 150 }, // West-Northwest
                    { text: 'PIZZA', direction: -15 },     // East-Southeast
                ]
            },
            {
                type: 'signpost',
                x: C - 30,
                z: C + 10,
                signs: [
                    { text: 'SKI VILLAGE', direction: 90 }, // North (mountains)
                    { text: 'TOWN', direction: 20 },        // East-Northeast
                ]
            },
        );
        
        // ==================== FENCES ====================
        // Boundary fences at water edge areas
        props.push(
            // Southwest fence section
            { type: 'fence', x: C - 48, z: C + 30, rotation: 0, length: 6 },
            { type: 'fence', x: C - 48, z: C + 38, rotation: Math.PI / 4, length: 4 },
            
            // Southeast fence section
            { type: 'fence', x: C + 48, z: C + 35, rotation: 0, length: 6 },
        );
        
        return props;
    }

    /**
     * Spawn all props into the scene
     * @param {THREE.Scene} scene - The Three.js scene
     * @returns {Object} { meshes, lights, collisionSystem }
     */
    spawn(scene) {
        const C = TownCenter.CENTER;
        
        // Clear previous spawns
        this.cleanup();
        
        // Spawn each prop
        this.propPlacements.forEach(prop => {
            let mesh = null;
            
            switch (prop.type) {
                case 'pine_tree':
                    mesh = this.propsFactory.createPineTree(prop.size);
                    break;
                case 'igloo':
                    mesh = this.propsFactory.createIgloo(true);
                    break;
                case 'lamp_post':
                    mesh = this.propsFactory.createLampPost(prop.isOn);
                    if (mesh.userData.light) {
                        this.lights.push(mesh.userData.light);
                    }
                    break;
                case 'bench':
                    mesh = this.propsFactory.createBench(true);
                    break;
                case 'snowman':
                    mesh = this.propsFactory.createSnowman();
                    break;
                case 'rock':
                    mesh = this.propsFactory.createRock(prop.size);
                    break;
                case 'snow_pile':
                    mesh = this.propsFactory.createSnowPile(prop.size);
                    break;
                case 'signpost':
                    mesh = this.propsFactory.createSignpost(prop.signs);
                    break;
                case 'fence':
                    mesh = this.propsFactory.createFence(prop.length);
                    break;
            }
            
            if (mesh) {
                // Position the mesh
                mesh.position.set(prop.x, 0, prop.z);
                if (prop.rotation) {
                    mesh.rotation.y = prop.rotation;
                }
                
                // Add to scene
                scene.add(mesh);
                this.propMeshes.push(mesh);
                
                // Register collision
                if (mesh.userData.collision) {
                    const col = mesh.userData.collision;
                    this.collisionSystem.addCollider(
                        prop.x,
                        prop.z,
                        col,
                        CollisionSystem.TYPES.SOLID,
                        { name: prop.type, mesh }
                    );
                }
                
                // Register interaction zones
                if (mesh.userData.interactionZone) {
                    const zone = mesh.userData.interactionZone;
                    const zoneX = prop.x + (zone.position?.x || 0);
                    const zoneZ = prop.z + (zone.position?.z || 0);
                    
                    // Include the prop's world position and rotation for snap point calculations
                    const zoneWithWorldPos = {
                        ...zone,
                        worldX: prop.x,
                        worldZ: prop.z,
                        worldRotation: prop.rotation || 0
                    };
                    
                    this.collisionSystem.addTrigger(
                        zoneX,
                        zoneZ,
                        { 
                            type: zone.type || 'sphere', 
                            radius: zone.radius || 2,
                            size: zone.size
                        },
                        (event) => this._handleInteraction(event, zoneWithWorldPos),
                        { action: zone.action, data: zoneWithWorldPos }
                    );
                }
            }
        });
        
        // Add building collisions
        TownCenter.BUILDINGS.forEach(building => {
            const bx = C + building.position.x;
            const bz = C + building.position.z;
            
            this.collisionSystem.addCollider(
                bx,
                bz,
                {
                    type: 'box',
                    size: {
                        x: building.size.w + 1,
                        y: building.size.h,
                        z: building.size.d + 1,
                    }
                },
                CollisionSystem.TYPES.SOLID,
                { name: building.id, isBuilding: true }
            );
        });
        
        // Add water boundary collision (circular perimeter)
        this._addWaterBoundary();
        
        return {
            meshes: this.propMeshes,
            lights: this.lights,
            collisionSystem: this.collisionSystem,
        };
    }

    /**
     * Add circular water boundary collision
     */
    _addWaterBoundary() {
        const C = TownCenter.CENTER;
        const radius = TownCenter.WORLD_SIZE / 2 - 8; // Island radius
        
        // Add ring of collision points around water edge - OPTIMIZED: fewer, larger segments
        const segments = 16; // Reduced from 32
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = C + Math.cos(angle) * (radius + 5);
            const z = C + Math.sin(angle) * (radius + 5);
            
            this.collisionSystem.addCollider(
                x,
                z,
                { type: 'cylinder', radius: 12, height: 2 }, // Larger radius to compensate
                CollisionSystem.TYPES.WATER,
                { name: 'water_boundary' }
            );
        }
    }

    /**
     * Handle interaction zone triggers
     */
    _handleInteraction(event, zone) {
        if (event.type === 'enter') {
            // Dispatch enter event for UI to handle
            window.dispatchEvent(new CustomEvent('townInteraction', {
                detail: {
                    action: zone.action,
                    message: zone.message,
                    emote: zone.emote,
                    data: zone
                }
            }));
        } else if (event.type === 'exit') {
            // Dispatch exit event to clear UI prompt
            window.dispatchEvent(new CustomEvent('townInteraction', {
                detail: {
                    action: 'exit',
                    exitedZone: zone.action,
                    message: null,
                    emote: null,
                    data: zone
                }
            }));
        }
    }

    /**
     * Update collision check for player
     * @param {number} x - Current X position
     * @param {number} z - Current Z position
     * @param {number} newX - Target X position
     * @param {number} newZ - Target Z position
     * @param {number} radius - Player collision radius
     * @returns {Object} { x, z, collided, collider }
     */
    checkPlayerMovement(x, z, newX, newZ, radius = 0.8) {
        return this.collisionSystem.checkMovement(x, z, newX, newZ, radius);
    }

    /**
     * Check triggers at player position
     */
    checkTriggers(playerX, playerZ) {
        return this.collisionSystem.checkTriggers(playerX, playerZ);
    }

    /**
     * Get active trigger zones player is inside
     */
    getActiveTriggers(playerX, playerZ) {
        return this.collisionSystem.getActiveTriggers(playerX, playerZ);
    }

    /**
     * Cleanup all spawned objects
     */
    cleanup() {
        this.propMeshes.forEach(mesh => {
            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }
            // Dispose geometry and materials
            mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });
        
        this.propMeshes = [];
        this.lights = [];
        this.collisionSystem.clear();
    }

    /**
     * Dispose all resources
     */
    dispose() {
        this.cleanup();
        this.propsFactory.dispose();
    }

    /**
     * Get room spawn position
     */
    getSpawnPosition() {
        return {
            x: TownCenter.CENTER,
            z: TownCenter.CENTER + 10
        };
    }

    /**
     * Get debug visualization
     */
    getDebugMesh() {
        return this.collisionSystem.createDebugMesh(this.THREE);
    }
}

export default TownCenter;

