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
        
        // Interior decorative trees - frame key areas
        const interiorTrees = [
            { x: C - 32, z: C - 18, size: 'small' },  // Near gift shop
            { x: C + 35, z: C - 8, size: 'small' },   // Near pizza
            { x: C + 18, z: C + 20, size: 'medium' }, // East plaza
            { x: C - 42, z: C + 12, size: 'medium' }, // Frame igloo village
            { x: C - 48, z: C + 25, size: 'large' },  // Behind igloos
        ];
        
        [...northTrees, ...westTrees, ...eastTrees, ...southTrees, ...interiorTrees].forEach(tree => {
            props.push({
                type: 'pine_tree',
                ...tree,
                rotation: Math.random() * Math.PI * 2,
            });
        });
        
        // ==================== IGLOO VILLAGE ====================
        // Cozy residential cluster in the southwest with campsite
        const villageX = C - 32;
        const villageZ = C + 22;
        
        props.push(
            // Igloos with entrances facing toward town center (southeast direction)
            { type: 'igloo', x: villageX - 8, z: villageZ + 10, rotation: Math.PI * 0.7 },   // Back left igloo - faces town
            { type: 'igloo', x: villageX + 5, z: villageZ + 8, rotation: Math.PI * 0.6 },    // Back right igloo - faces town
        );
        
        // Campsite in front of the igloos - the village gathering spot
        const campsiteX = villageX;
        const campsiteZ = villageZ - 5;
        
        props.push(
            // Campfire in the center
            { type: 'campfire', x: campsiteX, z: campsiteZ },
            // Log seats arranged around the fire (3 seats, leaving opening toward igloos)
            { type: 'log_seat', x: campsiteX - 4, z: campsiteZ - 1, rotation: Math.PI / 2 },       // Left
            { type: 'log_seat', x: campsiteX + 4, z: campsiteZ - 1, rotation: -Math.PI / 2 },      // Right  
            { type: 'log_seat', x: campsiteX, z: campsiteZ - 4.5, rotation: 0 },                   // Front (facing fireplace)
        );
        
        // ==================== ROCKS ====================
        // Natural rock formations - one large rock by the campsite
        props.push(
            { type: 'rock', x: campsiteX + 8, z: campsiteZ + 2, size: 'large' },   // Scenic rock by campfire
            { type: 'rock', x: C + 42, z: C - 28, size: 'medium' },                 // Northeast corner
            { type: 'rock', x: C - 45, z: C - 30, size: 'large' },                  // Northwest corner
            { type: 'rock', x: C + 38, z: C + 35, size: 'medium' },                 // Southeast
            { type: 'rock', x: C, z: C - 38, size: 'small' },                       // Near dojo
        );
        
        // ==================== LAMP POSTS ====================
        // Reduced count - strategic placement for atmosphere and night lighting
        // Key lamps cast shadows, ambient lamps don't (performance)
        props.push(
            // Main plaza - key lights (cast shadows)
            { type: 'lamp_post', x: C + 8, z: C + 6, isOn: true, castShadow: true },
            { type: 'lamp_post', x: C - 8, z: C + 6, isOn: true, castShadow: true },
            
            // Path to dojo - additional lights for navigation
            { type: 'lamp_post', x: C, z: C - 10, isOn: true, castShadow: true },
            { type: 'lamp_post', x: C + 5, z: C - 18, isOn: true, castShadow: false },  // Extra dojo path
            { type: 'lamp_post', x: C - 5, z: C - 18, isOn: true, castShadow: false },  // Extra dojo path
            
            // Near buildings (ambient, no shadows)
            { type: 'lamp_post', x: C - 18, z: C - 5, isOn: true, castShadow: false },  // Gift shop
            { type: 'lamp_post', x: C - 25, z: C - 3, isOn: true, castShadow: false },  // Gift shop side
            { type: 'lamp_post', x: C + 28, z: C + 8, isOn: true, castShadow: false },  // Pizza
            { type: 'lamp_post', x: C + 20, z: C + 2, isOn: true, castShadow: false },  // Pizza entrance
            
            // Igloo village - warm lighting
            { type: 'lamp_post', x: campsiteX + 10, z: campsiteZ - 3, isOn: true, castShadow: true },  // Near campsite
            { type: 'lamp_post', x: campsiteX - 5, z: campsiteZ + 5, isOn: true, castShadow: false },  // Igloo area
        );
        
        // ==================== BUILDING LIGHTS ====================
        // Wall-mounted warm lights on building entrances for nighttime visibility
        props.push(
            // Gift Shop entrance lights
            { type: 'building_light', x: C - 22, z: C - 3, color: 0xFFE4B5, intensity: 3.0, distance: 15, height: 4 },
            
            // Pizza Parlor entrance lights  
            { type: 'building_light', x: C + 25, z: C + 10, color: 0xFFAA55, intensity: 3.5, distance: 18, height: 4 },
            { type: 'building_light', x: C + 28, z: C + 2, color: 0xFFAA55, intensity: 2.5, distance: 12, height: 4 },
            
            // Dojo entrance lights (warm torchlight)
            { type: 'building_light', x: C - 3, z: C - 20, color: 0xFF8844, intensity: 3.0, distance: 15, height: 3 },
            { type: 'building_light', x: C + 3, z: C - 20, color: 0xFF8844, intensity: 3.0, distance: 15, height: 3 },
            { type: 'building_light', x: C, z: C - 28, color: 0xFFCC77, intensity: 2.0, distance: 12, height: 5 },  // Rear dojo
        );
        
        // ==================== BENCHES ====================
        // Rest spots with scenic views
        props.push(
            // Central plaza benches - facing each other
            { type: 'bench', x: C + 6, z: C + 3, rotation: Math.PI },      // Faces south
            { type: 'bench', x: C - 6, z: C + 3, rotation: Math.PI },      // Faces south
            
            // Near gift shop - scenic view of plaza
            { type: 'bench', x: C - 25, z: C - 8, rotation: Math.PI / 3 },
            
            // Southern scenic overlook
            { type: 'bench', x: C + 8, z: C + 32, rotation: Math.PI / 6 },
        );
        
        // ==================== SNOWMEN ====================
        // Fun interactive snowmen in discoverable spots
        props.push(
            { type: 'snowman', x: C - 5, z: C + 18 },      // Plaza area
            { type: 'snowman', x: C + 25, z: C - 18 },     // Near pizza/dojo path
        );
        
        // ==================== CHRISTMAS TREE ====================
        // Festive Christmas tree with twinkling lights
        props.push(
            { type: 'christmas_tree', x: C - 10.3, z: C + 31.3 },
        );
        
        // ==================== DOJO PARKOUR COURSE ====================
        // Obstacle course behind the dojo leading to roof hangout spot
        props.push(
            { type: 'dojo_parkour', x: 0, z: 0 },  // Position is handled internally - don't offset
        );
        
        // ==================== SNOW PILES ====================
        // Decorative snow drifts scattered naturally
        const snowPilePositions = [
            // Near buildings
            { x: C - 28, z: C - 15, size: 'medium' },
            { x: C + 32, z: C - 5, size: 'small' },
            { x: C + 3, z: C - 32, size: 'medium' },
            
            // Around igloo village
            { x: villageX - 18, z: villageZ + 5, size: 'small' },
            { x: villageX + 10, z: villageZ + 15, size: 'medium' },
            
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
            // Main plaza signpost
            {
                type: 'signpost',
                x: C,
                z: C + 6,
                signs: [
                    { text: 'DOJO', direction: 90 },       // North
                    { text: 'BEACH', direction: -90 },     // South
                    { text: 'GIFT SHOP', direction: 160 }, // West
                    { text: 'PIZZA', direction: -20 },     // East
                ]
            },
            // Near igloo village - points to town and ski areas
            {
                type: 'signpost',
                x: campsiteX + 15,
                z: campsiteZ - 2,
                signs: [
                    { text: 'IGLOOS', direction: 140 },    // Southwest (toward igloos)
                    { text: 'TOWN CENTER', direction: 20 }, // Northeast (toward plaza)
                ]
            },
        );
        
        // ==================== FENCES ====================
        // Boundary fences near water edges - rustic village feel
        props.push(
            // Near igloo village (protective fencing)
            { type: 'fence', x: villageX - 15, z: villageZ + 18, rotation: -Math.PI / 6, length: 5 },
            { type: 'fence', x: villageX - 20, z: villageZ + 12, rotation: -Math.PI / 3, length: 4 },
            
            // Southeast corner
            { type: 'fence', x: C + 45, z: C + 38, rotation: Math.PI / 6, length: 5 },
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
                    mesh = this.propsFactory.createLampPost(prop.isOn, prop.castShadow || false);
                    if (mesh.userData.light) {
                        this.lights.push(mesh.userData.light);
                    }
                    break;
                case 'building_light':
                    // Create invisible point light for building illumination
                    const buildingLight = new this.THREE.PointLight(
                        prop.color || 0xFFE4B5,
                        prop.intensity || 2.5,
                        prop.distance || 15,
                        1.5 // decay
                    );
                    buildingLight.position.set(0, prop.height || 4, 0);
                    mesh = new this.THREE.Group();
                    mesh.add(buildingLight);
                    this.lights.push(buildingLight);
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
                case 'campfire':
                    const campfireResult = this.propsFactory.createCampfire(true);
                    mesh = campfireResult.mesh;
                    // Store light and particles for animation
                    if (campfireResult.light) {
                        mesh.userData.fireLight = campfireResult.light;
                    }
                    if (campfireResult.particles) {
                        mesh.userData.particles = campfireResult.particles;
                    }
                    break;
                case 'christmas_tree':
                    const treeResult = this.propsFactory.createChristmasTree();
                    mesh = treeResult.mesh;
                    // Store update function for twinkling animation
                    if (treeResult.update) {
                        mesh.userData.treeUpdate = treeResult.update;
                    }
                    break;
                case 'dojo_parkour':
                    // Create parkour course with dojo dimensions
                    const parkourResult = this.propsFactory.createDojoParkourCourse({
                        dojoX: C,           // Dojo at center X
                        dojoZ: C - 25,      // Dojo Z position
                        dojoWidth: 14,
                        dojoHeight: 8,
                        dojoDepth: 14
                    });
                    mesh = parkourResult.mesh;
                    
                    // Register collision for each platform with proper Y position
                    parkourResult.colliders.forEach((collider, idx) => {
                        this.collisionSystem.addCollider(
                            collider.x,                        // x position
                            collider.z,                        // z position
                            {                                  // shape
                                type: 'box', 
                                size: collider.size,
                                height: collider.size.y        // Platform thickness
                            },
                            1,                                 // type (SOLID)
                            { name: `parkour_plat_${idx}` },   // data
                            collider.rotation || 0,            // rotation
                            collider.y                         // Y position of platform base
                        );
                    });
                    
                    // Register bench interaction zones on the VIP platform (elevated)
                    parkourResult.roofBenches.forEach((bench, idx) => {
                        const benchZoneData = {
                            type: 'box',
                            position: { x: 0, z: 0.8 },
                            size: { x: 3, z: 2 },
                            action: 'sit',
                            message: '🪑 Sit (Secret VIP Spot!)',
                            emote: 'Sit',
                            seatHeight: 0.8,
                            benchDepth: 1,
                            worldX: bench.x,
                            worldZ: bench.z,
                            worldRotation: bench.rotation || 0,
                            snapPoints: [
                                { x: -0.6, z: 0 },
                                { x: 0, z: 0 },
                                { x: 0.6, z: 0 }
                            ],
                            data: { seatHeight: bench.y + 0.8 }
                        };
                        this.collisionSystem.addTrigger(
                            bench.x,
                            bench.z,
                            benchZoneData,
                            (event) => {
                                // Extract zone data from trigger shape and merge with event
                                const zoneData = event.trigger?.shape || benchZoneData;
                                this._handleInteraction(event, zoneData);
                            },
                            { name: `vip_bench_${idx}` },
                            bench.rotation || 0,
                            bench.y  // Pass the Y position for elevated trigger
                        );
                    });
                    
                    // Store parkour data for reference
                    mesh.userData.parkourData = parkourResult;
                    
                    // DON'T reposition this mesh - positions are already absolute
                    mesh.position.set(0, 0, 0);
                    scene.add(mesh);
                    this.propMeshes.push(mesh);
                    mesh = null;  // Prevent double-add in the generic handler below
                    break;
                case 'log_seat':
                    mesh = this.propsFactory.createLogSeat(prop.rotation || 0);
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
                // Position and rotate the mesh
                mesh.position.set(prop.x, 0, prop.z);
                if (prop.rotation) {
                    mesh.rotation.y = prop.rotation;
                }
                
                // Add to scene
                scene.add(mesh);
                this.propMeshes.push(mesh);
                
                // Register prop with collision system - handles everything automatically
                // The mesh already has position/rotation set, and userData contains collision/interaction data
                this.collisionSystem.registerProp(
                    mesh,
                    (event, zoneData) => this._handleInteraction(event, zoneData)
                );
            }
        });
        
        // Add building collisions (walls)
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
            
            // Add roof collision for dojo (tier 0 roof - walkable surface)
            if (building.id === 'dojo') {
                const roofY = building.size.h + 1.2; // First tier roof height
                this.collisionSystem.addCollider(
                    bx,
                    bz,
                    {
                        type: 'box',
                        size: {
                            x: building.size.w + 4, // Roof extends beyond walls
                            y: 0.5,                  // Roof thickness
                            z: building.size.d + 4,
                        },
                        height: 0.5
                    },
                    CollisionSystem.TYPES.SOLID,
                    { name: 'dojo_roof', isRoof: true },
                    0,
                    roofY  // Y position of roof
                );
                
                // Add step collision for dojo entrance (3 steps)
                const d = building.size.d;
                for (let i = 0; i < 3; i++) {
                    const stepWidth = 3.2 + (2 - i) * 0.4;
                    const stepY = 0.84 - i * 0.28;
                    const stepZ = bz + d / 2 + 1.5 + (2 - i) * 0.95;
                    this.collisionSystem.addCollider(
                        bx,
                        stepZ,
                        {
                            type: 'box',
                            size: { x: stepWidth, y: 0.28, z: 0.9 },
                            height: 0.28
                        },
                        CollisionSystem.TYPES.SOLID,
                        { name: `dojo_step_${i}`, isStep: true },
                        0,
                        stepY
                    );
                }
            }
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
     * @param {number} y - Player Y position for height-based collision
     * @returns {Object} { x, z, collided, collider }
     */
    checkPlayerMovement(x, z, newX, newZ, radius = 0.8, y = 0) {
        return this.collisionSystem.checkMovement(x, z, newX, newZ, radius, y);
    }
    
    /**
     * Check if player can land on any object at position
     * @returns {{ canLand: boolean, landingY: number, collider: Object|null }}
     */
    checkLanding(x, z, y, radius = 0.8) {
        return this.collisionSystem.checkLanding(x, z, y, radius);
    }

    /**
     * Check triggers at player position
     * @param {number} playerY - Player Y for height-based filtering (e.g., don't trigger "sit" when standing ON bench)
     */
    checkTriggers(playerX, playerZ, playerY = 0) {
        return this.collisionSystem.checkTriggers(playerX, playerZ, 0.5, playerY);
    }

    /**
     * Get active trigger zones player is inside
     */
    getActiveTriggers(playerX, playerZ) {
        return this.collisionSystem.getActiveTriggers(playerX, playerZ);
    }

    /**
     * Update animated elements (call every frame)
     * @param {number} time - Current time in seconds
     * @param {number} delta - Delta time since last frame
     */
    update(time, delta) {
        // Animate campfire flames and embers
        this.propMeshes.forEach(mesh => {
            if (mesh.name === 'campfire') {
                // Animate flames
                mesh.traverse(child => {
                    if (child.userData.isFlame) {
                        const offset = child.userData.offset || 0;
                        child.position.y = child.userData.baseY + Math.sin(time * 8 + offset) * 0.1;
                        child.scale.x = 0.8 + Math.sin(time * 10 + offset) * 0.2;
                        child.scale.z = 0.8 + Math.cos(time * 10 + offset) * 0.2;
                        child.rotation.y = time * 2 + offset;
                    }
                });
                
                // Animate ember particles
                const particles = mesh.userData.particles;
                if (particles) {
                    const positions = particles.geometry.attributes.position.array;
                    for (let i = 0; i < positions.length / 3; i++) {
                        // Rise upward
                        positions[i * 3 + 1] += delta * (1 + Math.random());
                        // Slight drift
                        positions[i * 3] += (Math.random() - 0.5) * delta * 0.5;
                        positions[i * 3 + 2] += (Math.random() - 0.5) * delta * 0.5;
                        
                        // Reset if too high
                        if (positions[i * 3 + 1] > 3) {
                            positions[i * 3] = (Math.random() - 0.5) * 0.8;
                            positions[i * 3 + 1] = 0.2;
                            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
                        }
                    }
                    particles.geometry.attributes.position.needsUpdate = true;
                }
                
                // Flicker light
                const light = mesh.userData.fireLight;
                if (light) {
                    light.intensity = 1.5 + Math.sin(time * 15) * 0.3 + Math.random() * 0.2;
                }
            }
            
            // Animate Christmas tree twinkling lights
            if (mesh.name === 'christmas_tree' && mesh.userData.treeUpdate) {
                mesh.userData.treeUpdate(time);
            }
        });
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

