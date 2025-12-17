import CollisionSystem from '../engine/CollisionSystem';
import { createProp, PROP_TYPES, Billboard } from '../props';
import { createNightclubExterior } from '../props/NightclubExterior';
import { createDojoParkour } from '../props/DojoParkour';

/**
 * Helper: Attach collision/interaction data from a prop to its mesh
 * This bridges the new prop system with the collision system
 */
function attachPropData(prop, mesh) {
    // Attach collision bounds
    const collision = prop.getCollisionBounds && prop.getCollisionBounds();
    if (collision) {
        mesh.userData.collision = {
            type: 'box',
            size: { x: collision.maxX - collision.minX, z: collision.maxZ - collision.minZ },
            height: collision.height
        };
    }
    
    // Attach interaction trigger
    const trigger = prop.getTrigger && prop.getTrigger();
    if (trigger) {
        mesh.userData.interactionZone = {
            type: trigger.size ? 'box' : 'circle',
            position: { x: 0, z: 0 },
            size: trigger.size,
            radius: trigger.radius,
            action: trigger.type,
            message: trigger.message,
            emote: trigger.emote,
            seatHeight: trigger.seatHeight,
            benchDepth: trigger.benchDepth,
            platformHeight: trigger.platformHeight,  // For elevated benches
            snapPoints: trigger.snapPoints,
            maxOccupants: trigger.maxOccupants,
            data: trigger.data
        };
    }
    
    return mesh;
}

/**
 * TownCenter - Room definition for the main town hub
 * 
 * T-STREET LAYOUT:
 * - Dojo at the base of the T (south)
 * - Campfire at the T intersection
 * - Pizza & Gift Shop on sides of the stem
 * - Nightclub at the top of the T (north)
 * - Igloos in the "armpits" of the T
 */
class TownCenter {
    static ID = 'town';
    static NAME = 'Town Center';
    
    // EXPANDED World dimensions for T-street layout
    static WORLD_SIZE = 220; // Increased from 160
    static CENTER = TownCenter.WORLD_SIZE / 2; // 110
    
    // Building definitions - T-STREET LAYOUT (FULL MAP SCALE)
    // Positions are OFFSETS from center (110, 110)
    // Map is 220x220, so offsets range from -105 to +105
    // +Z = South (toward dojo), -Z = North (toward nightclub)
    static BUILDINGS = [
        { 
            id: 'dojo', 
            name: 'THE DOJO', 
            position: { x: 0, z: 70 },  // Far south - base of T stem
            size: { w: 14, h: 8, d: 14 },
            rotation: 0, // Door faces north (toward campfire)
        },
        { 
            id: 'market', 
            name: 'GIFT SHOP', 
            position: { x: 45, z: 35 },  // East side of T stem
            size: { w: 10, h: 6, d: 10 },
            rotation: -Math.PI / 2, // Door faces west (toward street)
        },
        { 
            id: 'plaza', 
            name: 'PIZZA PARLOR', 
            position: { x: -45, z: 35 },  // West side of T stem
            size: { w: 12, h: 7, d: 10 },
            rotation: Math.PI / 2, // Door faces east (toward street)
        }
    ];
    
    // Dojo position for parkour course binding
    static DOJO_OFFSET = { x: 0, z: 70 };

    constructor(THREE) {
        this.THREE = THREE;
        this.collisionSystem = new CollisionSystem(
            TownCenter.WORLD_SIZE,
            TownCenter.WORLD_SIZE,
            4
        );
        
        this.propMeshes = [];
        this.lights = [];
        this.propPlacements = this._generatePropPlacements();
    }

    /**
     * Generate prop placement positions - T-STREET LAYOUT
     */
    _generatePropPlacements() {
        const C = TownCenter.CENTER; // 110
        const SIZE = TownCenter.WORLD_SIZE; // 220
        const props = [];
        
        // ==================== T-INTERSECTION CAMPFIRE ====================
        const campfireX = C;
        const campfireZ = C + 10;

        props.push({ type: 'campfire', x: campfireX, z: campfireZ });

        // Log seats in a proper circle around the campfire
        const seatRadius = 5.5;
        const seatCount = 6;

        for (let i = 0; i < seatCount; i++) {
            const angle = (i / seatCount) * Math.PI * 2;

            const seatX = campfireX + Math.cos(angle) * seatRadius;
            const seatZ = campfireZ + Math.sin(angle) * seatRadius;

            // Tangent rotation (asset base orientation requires +90deg offset)
            const rotation = -angle + Math.PI / 2;

            props.push({
                type: 'log_seat',
                x: seatX,
                z: seatZ,
                rotation,
                bidirectionalSit: true,
                campfireCenter: { x: campfireX, z: campfireZ }
            });
        }
        
        // ==================== SIGNPOSTS ====================
        // Main intersection signpost
        props.push({
            type: 'signpost',
            x: C + 12,
            z: C + 15,
            signs: [
                { text: 'DOJO', direction: -90 },      // South
                { text: 'NIGHT CLUB', direction: 90 }, // North
                { text: 'PIZZA', direction: 180 },     // West
                { text: 'GIFT SHOP', direction: 0 },   // East
            ]
        });
        
        // ==================== CHRISTMAS TREE ====================
        // Positioned near the Gift Shop
        const treeX = C + 43.2;
        const treeZ = C + 6.8;
        props.push({ type: 'christmas_tree', x: treeX, z: treeZ });
        
        // Benches in a circle around the Christmas tree (4 benches at cardinal directions)
        const treeBenchRadius = 8;
        const treeBenchCount = 4;
        for (let i = 0; i < treeBenchCount; i++) {
            const angle = (i / treeBenchCount) * Math.PI * 2;
            const benchX = treeX + Math.cos(angle) * treeBenchRadius;
            const benchZ = treeZ + Math.sin(angle) * treeBenchRadius;
            // Benches at i=0 (east) and i=2 (west) need 180° flip to face tree
            const flipRotation = (i === 0 || i === 2) ? Math.PI : 0;
            props.push({ 
                type: 'bench', 
                x: benchX, 
                z: benchZ, 
                rotation: angle + Math.PI / 2 + flipRotation
            });
        }
        
        // ==================== NIGHTCLUB ====================
        // Epic nightclub at the north end of the T-bar street
        props.push({
            type: 'nightclub',
            x: C,
            z: C - 75,  // Far north, against world border
            width: 25,
            depth: 20,
            height: 12
        });
        
        // Nightclub entrance trigger (in front of the building)
        props.push({
            type: 'nightclub_entrance',
            x: C,
            z: C - 60,  // In front of nightclub entrance
        });
        
        // Nightclub roof ladder trigger (behind the building)
        // Nightclub collision is: center (C, C-75) with size (27, 22), so back wall collision is at z = C-75-11 = C-86
        // Trigger MUST be outside collision, so position at z = C-89 (3 units behind collision)
        props.push({
            type: 'nightclub_ladder',
            x: C + 6,        // Right side of building where ladder is (w/4 = 25/4 ≈ 6)
            z: C - 89,       // Behind building collision (collision ends at C-86, trigger at C-89)
        });
        
        // ==================== HIGHWAY BILLBOARD ====================
        // Tall illuminated billboard facing the main T-stem street
        // Positioned on the east side of town, facing west toward the street
        props.push({
            type: 'billboard',
            x: C + 80,      // East side of map
            z: C + 20,      // Near the T intersection
            rotation: Math.PI / 2 + Math.PI,  // Face west toward the street
            imagePath: '/advert.png'
        });
        
        // Second billboard on the west side (behind pizzeria) facing east toward town
        props.push({
            type: 'billboard',
            x: C - 80,      // West side of map
            z: C + 40,      // Along the stem
            rotation: Math.PI / 2,  // Face east toward the street (rotated 180 from before)
            imagePath: '/advert.png'
        });
        
        // ==================== GRAVEL ICE WALKING PATH (T-SHAPE) ====================
        // Dark blue gravel texture - NO OVERLAPPING to prevent z-fighting
        // Each piece connects edge-to-edge
        
        // T-stem (vertical part from dojo to T-junction)
        // Goes from z = C + 75 (dojo) to z = C - 29 (where T-bar starts)
        props.push({
            type: 'gravel_path',
            x: C,
            z: C + 23,    // Center: (75 + -29) / 2 = 23
            width: 28,
            depth: 104,   // From C+75 to C-29
        });
        
        // T-bar (horizontal street between igloo rows)
        // Goes from z = C - 29 to z = C - 61
        props.push({
            type: 'gravel_path',
            x: C,
            z: C - 45,    // Center of horizontal bar
            width: 190,
            depth: 32,    // From C-29 to C-61
        });
        
        // Path to Nightclub (north from T-bar)
        // Goes from z = C - 61 to z = C - 75 (nightclub entrance)
        props.push({
            type: 'gravel_path',
            x: C,
            z: C - 68,    // Center: (-61 + -75) / 2 = -68
            width: 28,
            depth: 14,    // From C-61 to C-75
        });
        
        // Path to Pizza Parlor (west branch from stem)
        // Starts at edge of stem (x = C - 14) and goes to pizza (x = C - 45)
        props.push({
            type: 'gravel_path',
            x: C - 30,    // Center: (-14 + -45) / 2 = -29.5 ≈ -30
            z: C + 35,
            width: 32,    // From stem edge to pizza
            depth: 18,
        });
        
        // Path to Gift Shop (east branch from stem)
        // Starts at edge of stem (x = C + 14) and goes to gift shop (x = C + 45)
        props.push({
            type: 'gravel_path',
            x: C + 30,    // Center: (14 + 45) / 2 = 29.5 ≈ 30
            z: C + 35,
            width: 32,    // From stem edge to gift shop
            depth: 18,
        });
        
        // ==================== IGLOOS - ALONG TOP STREET EDGES ====================
        // T-bar walkway is at z = C-29 to C-61
        // NORTH side of walkway (z < C-61, facing south toward street)
        // 10 total igloos: igloo1-10, each unique. igloo3 = SKNY GANG nightclub igloo
        props.push(
            { type: 'igloo', x: C - 75, z: C - 75, rotation: 0 },      // igloo1
            { type: 'igloo', x: C - 50, z: C - 78, rotation: 0 },      // igloo2
            { type: 'skny_igloo', x: C - 25, z: C - 75, rotation: 0 }, // igloo3 - SKNY GANG Nightclub
            { type: 'igloo', x: C + 25, z: C - 75, rotation: 0 },      // igloo4
            { type: 'igloo', x: C + 50, z: C - 78, rotation: 0 },      // igloo5
            { type: 'igloo', x: C + 75, z: C - 75, rotation: 0 },      // igloo6
        );
        
        // SOUTH side of walkway (z > C-29, facing north toward street)
        props.push(
            { type: 'igloo', x: C - 70, z: C - 15, rotation: Math.PI },  // igloo7
            { type: 'igloo', x: C - 40, z: C - 18, rotation: Math.PI },  // igloo8
            { type: 'igloo', x: C + 40, z: C - 18, rotation: Math.PI },  // igloo9
            { type: 'igloo', x: C + 70, z: C - 15, rotation: Math.PI },  // igloo10
        );
        
        // ==================== BENCHES - OUTSIDE WALKWAYS ====================
        // T-stem walkway is x = C ± 14, so benches at x = C ± 22
        props.push(
            { type: 'bench', x: C - 22, z: C + 20, rotation: Math.PI / 2 },   // West of stem, face east
            { type: 'bench', x: C + 22, z: C + 20, rotation: -Math.PI / 2 },  // East of stem, face west
            { type: 'bench', x: C - 22, z: C + 45, rotation: Math.PI / 2 },   // West of stem
            { type: 'bench', x: C + 22, z: C + 45, rotation: -Math.PI / 2 },  // East of stem
        );
        
        // T-bar walkway is z = C-29 to C-61, so benches outside those edges
        props.push(
            // South edge of T-bar (z = C - 22, just outside C-29) - face SOUTH toward street
            { type: 'bench', x: C - 35, z: C - 22, rotation: Math.PI },
            { type: 'bench', x: C + 35, z: C - 22, rotation: Math.PI },
            { type: 'bench', x: C - 65, z: C - 22, rotation: Math.PI },
            { type: 'bench', x: C + 65, z: C - 22, rotation: Math.PI },
            // North edge of T-bar (z = C - 68, just outside C-61) - face NORTH toward street
            { type: 'bench', x: C - 35, z: C - 68, rotation: 0 },
            { type: 'bench', x: C + 35, z: C - 68, rotation: 0 },
            { type: 'bench', x: C - 65, z: C - 68, rotation: 0 },
            { type: 'bench', x: C + 65, z: C - 68, rotation: 0 },
        );
        
        // Benches near buildings (outside pizza and gift shop paths)
        props.push(
            { type: 'bench', x: C - 55, z: C + 48, rotation: -Math.PI / 2 },  // Near pizza
            { type: 'bench', x: C + 55, z: C + 48, rotation: Math.PI / 2 },   // Near gift shop
        );
        
        // ==================== PINE TREES - FULL MAP PERIMETER ====================
        // Northern tree line (at map edge, behind nightclub area)
        const northTrees = [
            { x: C - 95, z: C - 95, size: 'large' },
            { x: C - 75, z: C - 90, size: 'medium' },
            { x: C - 55, z: C - 92, size: 'large' },
            { x: C - 35, z: C - 88, size: 'medium' },
            { x: C - 15, z: C - 95, size: 'large' },
            { x: C + 5, z: C - 90, size: 'medium' },
            { x: C + 25, z: C - 93, size: 'large' },
            { x: C + 45, z: C - 88, size: 'medium' },
            { x: C + 65, z: C - 92, size: 'large' },
            { x: C + 85, z: C - 90, size: 'medium' },
            { x: C + 95, z: C - 95, size: 'large' },
        ];
        
        // Western tree line (at map edge)
        const westTrees = [
            { x: C - 95, z: C - 70, size: 'large' },
            { x: C - 92, z: C - 40, size: 'medium' },
            { x: C - 95, z: C - 10, size: 'large' },
            { x: C - 90, z: C + 20, size: 'medium' },
            { x: C - 95, z: C + 50, size: 'large' },
            { x: C - 92, z: C + 75, size: 'medium' },
            { x: C - 95, z: C + 95, size: 'large' },
        ];
        
        // Eastern tree line (at map edge)
        const eastTrees = [
            { x: C + 95, z: C - 70, size: 'large' },
            { x: C + 92, z: C - 40, size: 'medium' },
            { x: C + 95, z: C - 10, size: 'large' },
            { x: C + 90, z: C + 20, size: 'medium' },
            { x: C + 95, z: C + 50, size: 'large' },
            { x: C + 92, z: C + 75, size: 'medium' },
            { x: C + 95, z: C + 95, size: 'large' },
        ];
        
        // Southern tree line (at map edge, behind dojo)
        const southTrees = [
            { x: C - 80, z: C + 95, size: 'large' },
            { x: C - 55, z: C + 92, size: 'medium' },
            { x: C - 30, z: C + 95, size: 'large' },
            { x: C, z: C + 90, size: 'medium' },
            { x: C + 30, z: C + 95, size: 'large' },
            { x: C + 55, z: C + 92, size: 'medium' },
            { x: C + 80, z: C + 95, size: 'large' },
        ];
        
        // Interior accent trees (between areas)
        const interiorTrees = [
            { x: C - 70, z: C + 10, size: 'medium' },   // West of pizza
            { x: C + 70, z: C + 10, size: 'medium' },   // East of gift shop
            { x: C - 25, z: C + 60, size: 'small' },    // Near dojo west
            { x: C + 25, z: C + 60, size: 'small' },    // Near dojo east
            { x: C - 60, z: C - 15, size: 'medium' },   // T armpit areas
            { x: C + 60, z: C - 15, size: 'medium' },
        ];
        
        [...northTrees, ...westTrees, ...eastTrees, ...southTrees, ...interiorTrees].forEach(tree => {
            props.push({
                type: 'pine_tree',
                ...tree,
                rotation: Math.random() * Math.PI * 2,
            });
        });
        
        // ==================== LAMP POSTS - ALONG OUTER STREET EDGES ====================
        // Posts are on the OUTSIDE of the walkway, lining the street edges
        // Based on layout image: many posts along both edges of T-bar and T-stem
        props.push(
            // ===== T-BAR SOUTH EDGE (z = C - 25) - Full row of posts =====
            { type: 'lamp_post', x: C - 95, z: C - 25, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C - 75, z: C - 25, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C - 55, z: C - 25, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C - 35, z: C - 25, isOn: true, castShadow: false },
            // Gap for T-stem entrance
            { type: 'lamp_post', x: C + 35, z: C - 25, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C + 55, z: C - 25, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C + 75, z: C - 25, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C + 95, z: C - 25, isOn: true, castShadow: false },
            
            // ===== T-BAR NORTH EDGE (z = C - 65) - Full row of posts =====
            { type: 'lamp_post', x: C - 95, z: C - 65, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C - 75, z: C - 65, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C - 55, z: C - 65, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C - 35, z: C - 65, isOn: true, castShadow: false },
            // Gap for nightclub entrance
            { type: 'lamp_post', x: C + 35, z: C - 65, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C + 55, z: C - 65, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C + 75, z: C - 65, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C + 95, z: C - 65, isOn: true, castShadow: false },
            
            // ===== T-STEM LEFT EDGE (x = C - 22) - Posts from T-junction to dojo =====
            { type: 'lamp_post', x: C - 22, z: C - 15, isOn: true, castShadow: false },  // Near T-junction
            { type: 'lamp_post', x: C - 22, z: C + 10, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C - 22, z: C + 35, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C - 22, z: C + 60, isOn: true, castShadow: false },  // Near dojo
            
            // ===== T-STEM RIGHT EDGE (x = C + 22) - Posts from T-junction to dojo =====
            { type: 'lamp_post', x: C + 22, z: C - 15, isOn: true, castShadow: false },  // Near T-junction
            { type: 'lamp_post', x: C + 22, z: C + 10, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C + 22, z: C + 35, isOn: true, castShadow: false },
            { type: 'lamp_post', x: C + 22, z: C + 60, isOn: true, castShadow: false },  // Near dojo
        );
        
        // ==================== CHRISTMAS LIGHT STRINGS (T-STREET ONLY) ====================
        // Light strings connecting lamp posts ALONG the outer street edges
        // NO crossing the street - lights run parallel on each side
        const lampHeight = 5.5; // Height where lights attach to lamp posts
        
        // ===== T-BAR SOUTH EDGE - WEST SIDE (connecting posts) =====
        props.push(
            { type: 'light_string', from: { x: C - 95, z: C - 25 }, to: { x: C - 75, z: C - 25 }, height: lampHeight },
            { type: 'light_string', from: { x: C - 75, z: C - 25 }, to: { x: C - 55, z: C - 25 }, height: lampHeight },
            { type: 'light_string', from: { x: C - 55, z: C - 25 }, to: { x: C - 35, z: C - 25 }, height: lampHeight },
        );
        
        // ===== T-BAR SOUTH EDGE - EAST SIDE (connecting posts) =====
        props.push(
            { type: 'light_string', from: { x: C + 35, z: C - 25 }, to: { x: C + 55, z: C - 25 }, height: lampHeight },
            { type: 'light_string', from: { x: C + 55, z: C - 25 }, to: { x: C + 75, z: C - 25 }, height: lampHeight },
            { type: 'light_string', from: { x: C + 75, z: C - 25 }, to: { x: C + 95, z: C - 25 }, height: lampHeight },
        );
        
        // ===== T-BAR NORTH EDGE - WEST SIDE (connecting posts) =====
        props.push(
            { type: 'light_string', from: { x: C - 95, z: C - 65 }, to: { x: C - 75, z: C - 65 }, height: lampHeight },
            { type: 'light_string', from: { x: C - 75, z: C - 65 }, to: { x: C - 55, z: C - 65 }, height: lampHeight },
            { type: 'light_string', from: { x: C - 55, z: C - 65 }, to: { x: C - 35, z: C - 65 }, height: lampHeight },
        );
        
        // ===== T-BAR NORTH EDGE - EAST SIDE (connecting posts) =====
        props.push(
            { type: 'light_string', from: { x: C + 35, z: C - 65 }, to: { x: C + 55, z: C - 65 }, height: lampHeight },
            { type: 'light_string', from: { x: C + 55, z: C - 65 }, to: { x: C + 75, z: C - 65 }, height: lampHeight },
            { type: 'light_string', from: { x: C + 75, z: C - 65 }, to: { x: C + 95, z: C - 65 }, height: lampHeight },
        );
        
        // ===== T-STEM LEFT EDGE (connecting posts down to dojo) =====
        props.push(
            { type: 'light_string', from: { x: C - 22, z: C - 15 }, to: { x: C - 22, z: C + 10 }, height: lampHeight },
            { type: 'light_string', from: { x: C - 22, z: C + 10 }, to: { x: C - 22, z: C + 35 }, height: lampHeight },
            { type: 'light_string', from: { x: C - 22, z: C + 35 }, to: { x: C - 22, z: C + 60 }, height: lampHeight },
        );
        
        // ===== T-STEM RIGHT EDGE (connecting posts down to dojo) =====
        props.push(
            { type: 'light_string', from: { x: C + 22, z: C - 15 }, to: { x: C + 22, z: C + 10 }, height: lampHeight },
            { type: 'light_string', from: { x: C + 22, z: C + 10 }, to: { x: C + 22, z: C + 35 }, height: lampHeight },
            { type: 'light_string', from: { x: C + 22, z: C + 35 }, to: { x: C + 22, z: C + 60 }, height: lampHeight },
        );
        
        // ==================== BUILDING ENTRANCE LIGHTS ====================
        props.push(
            // Pizza entrance (west side, door faces east) - UPDATED POSITION
            { type: 'building_light', x: C - 38, z: C + 35, color: 0xFFAA55, intensity: 3.5, distance: 15, height: 4 },
            
            // Gift Shop entrance (east side, door faces west) - UPDATED POSITION
            { type: 'building_light', x: C + 38, z: C + 35, color: 0xFFE4B5, intensity: 3.5, distance: 15, height: 4 },
            
            // Dojo entrance (south, door faces north) - UPDATED POSITION
            { type: 'building_light', x: C, z: C + 62, color: 0xFF8844, intensity: 3.5, distance: 18, height: 3 },
        );
        
        // ==================== SNOWMEN - SPREAD ACROSS MAP ====================
        props.push(
            { type: 'snowman', x: C - 40, z: C - 60 },  // Far west north
            { type: 'snowman', x: C + 40, z: C - 60 },  // Far east north
            { type: 'snowman', x: C, z: C + 85 },       // Near dojo (south)
            { type: 'snowman', x: C - 70, z: C + 5 },   // West side
            { type: 'snowman', x: C + 70, z: C + 5 },   // East side
        );
        
        // ==================== ROCKS - SPREAD ACROSS MAP ====================
        props.push(
            { type: 'rock', x: C - 85, z: C - 70, size: 'large' },
            { type: 'rock', x: C + 85, z: C - 70, size: 'large' },
            { type: 'rock', x: C - 80, z: C + 70, size: 'medium' },
            { type: 'rock', x: C + 80, z: C + 70, size: 'medium' },
            { type: 'rock', x: C - 60, z: C - 20, size: 'small' },
            { type: 'rock', x: C + 60, z: C - 20, size: 'small' },
        );
        
        // ==================== SNOW PILES - SPREAD ACROSS MAP ====================
        const snowPiles = [
            { x: C - 65, z: C + 40, size: 'medium' },
            { x: C + 65, z: C + 40, size: 'medium' },
            { x: C - 55, z: C - 65, size: 'large' },
            { x: C + 55, z: C - 65, size: 'large' },
            { x: C, z: C - 75, size: 'medium' },
            { x: C - 85, z: C + 15, size: 'small' },
            { x: C + 85, z: C + 15, size: 'small' },
            { x: C - 30, z: C + 80, size: 'medium' },
            { x: C + 30, z: C + 80, size: 'medium' },
        ];
        snowPiles.forEach(pile => props.push({ type: 'snow_pile', ...pile }));
        
        // ==================== FENCES - ALONG PERIMETER ====================
        props.push(
            { type: 'fence', x: C - 85, z: C - 60, rotation: Math.PI / 6, length: 5 },
            { type: 'fence', x: C + 85, z: C - 60, rotation: -Math.PI / 6, length: 5 },
            { type: 'fence', x: C - 85, z: C + 60, rotation: -Math.PI / 6, length: 4 },
            { type: 'fence', x: C + 85, z: C + 60, rotation: Math.PI / 6, length: 4 },
        );
        
        // ==================== DOJO PARKOUR COURSE ====================
        // Bound to dojo position - moves with dojo
        props.push({ type: 'dojo_parkour', x: 0, z: 0 });
        
        // ==================== MAILBOXES - NEAR IGLOOS & BUILDINGS ====================
        // Igloos need mail delivery!
        props.push(
            { type: 'mailbox', x: C - 70, z: C - 70, rotation: 0, style: 'classic' },      // Near igloo1
            { type: 'mailbox', x: C - 20, z: C - 70, rotation: 0, style: 'classic' },      // Near igloo3 (SKNY)
            { type: 'mailbox', x: C + 30, z: C - 70, rotation: 0, style: 'classic' },      // Near igloo4
            { type: 'mailbox', x: C + 80, z: C - 70, rotation: 0, style: 'classic' },      // Near igloo6
            { type: 'mailbox', x: C - 65, z: C - 10, rotation: Math.PI, style: 'classic' }, // Near igloo7
            { type: 'mailbox', x: C + 75, z: C - 10, rotation: Math.PI, style: 'classic' }, // Near igloo10
            { type: 'mailbox', x: C + 52, z: C + 28, rotation: -Math.PI / 2, style: 'modern' }, // Near gift shop
        );
        
        // ==================== TRASH CANS - NEAR PUBLIC AREAS ====================
        // Near benches and high-traffic areas (positioned OFF gravel paths)
        props.push(
            { type: 'trash_can', x: C - 18, z: C + 20 },    // Near stem bench west
            { type: 'trash_can', x: C + 18, z: C + 50 },    // Near stem bench east
            { type: 'trash_can', x: C - 32, z: C - 24 },    // Near T-bar bench south (above path)
            { type: 'trash_can', x: C + 32, z: C - 24 },    // Near T-bar bench south (above path)
            { type: 'trash_can', x: C - 32, z: C - 66 },    // Near T-bar bench north (below path)
            { type: 'trash_can', x: C + 32, z: C - 66 },    // Near T-bar bench north (below path)
            { type: 'trash_can', x: C - 50, z: C + 48 },    // Near pizza (outside path)
            { type: 'trash_can', x: C + 50, z: C + 48 },    // Near gift shop (outside path)
            { type: 'trash_can', x: C + 18, z: C + 12 },    // Near campfire (outside stem)
            { type: 'trash_can', x: C + 18, z: C - 66 },    // Nightclub corner (outside path)
        );
        
        // ==================== BARRELS - SUPPLY AREAS ====================
        // Near businesses and storage areas (positioned OFF gravel paths)
        props.push(
            // Pizza parlor - ingredient barrels
            { type: 'barrel', x: C - 52, z: C + 28, size: 'medium' },
            { type: 'barrel', x: C - 54, z: C + 30, size: 'small' },
            // Dojo - training supplies (outside stem path)
            { type: 'barrel', x: C + 18, z: C + 78, size: 'large' },
            { type: 'barrel', x: C - 18, z: C + 78, size: 'medium' },
            // Nightclub - equipment (behind building)
            { type: 'barrel', x: C - 18, z: C - 82, size: 'medium' },
            { type: 'barrel', x: C + 18, z: C - 82, size: 'medium' },
        );
        
        // ==================== FIRE HYDRANTS - SAFETY ALONG STREETS ====================
        // Positioned along path edges, NOT on the gravel
        props.push(
            { type: 'fire_hydrant', x: C - 48, z: C + 48, color: 0xCC2222 },  // Near pizza (outside path)
            { type: 'fire_hydrant', x: C + 48, z: C + 48, color: 0xCC2222 },  // Near gift shop (outside path)
            { type: 'fire_hydrant', x: C - 18, z: C - 26, color: 0xFFD700 },  // T-junction west (outside paths)
            { type: 'fire_hydrant', x: C + 18, z: C - 26, color: 0xFFD700 },  // T-junction east (outside paths)
            { type: 'fire_hydrant', x: C - 50, z: C - 26, color: 0xCC2222 },  // T-bar west (above path)
            { type: 'fire_hydrant', x: C + 50, z: C - 26, color: 0xCC2222 },  // T-bar east (above path)
            { type: 'fire_hydrant', x: C - 18, z: C - 66, color: 0x2288CC },  // Near nightclub (outside path)
        );
        
        // ==================== ICE SCULPTURES - DECORATIVE CENTERPIECES ====================
        // Large premium sculptures positioned in open areas away from paths and furniture
        props.push(
            { type: 'ice_sculpture', x: C - 55, z: C + 55, sculptureType: 'penguin' }, // Northwest open area
            { type: 'ice_sculpture', x: C + 55, z: C + 55, sculptureType: 'fish' },    // Northeast open area (near gift shop)
            { type: 'ice_sculpture', x: C - 85, z: C - 45, sculptureType: 'heart', rotation: Math.PI / 2 },   // Far west - rotated 90°
            { type: 'ice_sculpture', x: C + 85, z: C - 45, sculptureType: 'star', rotation: Math.PI / 2 },    // Far east - rotated 90°
        );
        
        // ==================== CRATES - LOADING/STORAGE AREAS ====================
        props.push(
            // Pizza supplies
            { type: 'crate', x: C - 56, z: C + 32, size: 'medium' },
            { type: 'crate', x: C - 58, z: C + 34, size: 'small' },
            // Gift shop merchandise
            { type: 'crate', x: C + 56, z: C + 32, size: 'large' },
            { type: 'crate', x: C + 58, z: C + 30, size: 'medium' },
            { type: 'crate', x: C + 54, z: C + 30, size: 'small' },
            // Nightclub equipment
            { type: 'crate', x: C - 20, z: C - 80, size: 'large' },
            { type: 'crate', x: C + 20, z: C - 80, size: 'large' },
        );
        
        // ==================== STREET SIGNS - KEY INTERSECTIONS ====================
        // Positioned along path edges, NOT on the gravel
        props.push(
            { type: 'street_sign', x: C - 18, z: C - 26, signType: 'arrow', rotation: Math.PI / 2 },   // T-junction west (outside)
            { type: 'street_sign', x: C + 18, z: C - 26, signType: 'arrow', rotation: -Math.PI / 2 }, // T-junction east (outside)
            { type: 'street_sign', x: C - 80, z: C - 26, signType: 'info', rotation: Math.PI / 2 },   // West end (above T-bar)
            { type: 'street_sign', x: C + 80, z: C - 26, signType: 'info', rotation: -Math.PI / 2 },  // East end (above T-bar)
            { type: 'street_sign', x: C - 18, z: C + 58, signType: 'stop', rotation: 0 },             // Near dojo (outside stem)
        );
        
        // ==================== WOODEN POSTS - PATH MARKERS ====================
        // Along path edges (outside the gravel, stem path is x: C-14 to C+14)
        props.push(
            // T-stem path edge markers (outside the path)
            { type: 'wooden_post', x: C - 18, z: C + 30, style: 'striped' },
            { type: 'wooden_post', x: C + 18, z: C + 30, style: 'striped' },
            { type: 'wooden_post', x: C - 18, z: C + 50, style: 'plain' },
            { type: 'wooden_post', x: C + 18, z: C + 50, style: 'plain' },
            // Near buildings (outside pizza/gift paths: C-46 to C-14 and C+14 to C+46)
            { type: 'wooden_post', x: C - 48, z: C + 28, style: 'topped' },  // Outside pizza path
            { type: 'wooden_post', x: C + 48, z: C + 28, style: 'topped' },  // Outside gift shop path
        );
        
        return props;
    }

    /**
     * Spawn all props into the scene
     */
    spawn(scene) {
        const C = TownCenter.CENTER;
        const dojoOffset = TownCenter.DOJO_OFFSET;
        
        this.cleanup();
        
        this.propPlacements.forEach(prop => {
            let mesh = null;
            
            switch (prop.type) {
                case 'pine_tree': {
                    // Use new modular prop system with auto-attached collision
                    const treeProp = createProp(this.THREE, null, PROP_TYPES.PINE_TREE, 0, 0, 0, { size: prop.size });
                    mesh = attachPropData(treeProp, treeProp.group);
                    break;
                }
                case 'igloo': {
                    // Use new modular prop system with auto-attached collision
                    const iglooProp = createProp(this.THREE, null, PROP_TYPES.IGLOO, 0, 0, 0, { withEntrance: true });
                    mesh = attachPropData(iglooProp, iglooProp.group);
                    break;
                }
                case 'skny_igloo': {
                    // SKNY GANG Nightclub Igloo - special animated nightclub-themed igloo
                    const sknyProp = createProp(this.THREE, null, PROP_TYPES.SKNY_IGLOO, 0, 0, 0, {});
                    mesh = attachPropData(sknyProp, sknyProp.group);
                    // Store the prop for animation updates
                    if (!this.sknyIgloos) this.sknyIgloos = [];
                    this.sknyIgloos.push(sknyProp);
                    break;
                }
                case 'lamp_post': {
                    // Use new modular prop system with auto-attached collision
                    const lampProp = createProp(this.THREE, null, PROP_TYPES.LAMP_POST, 0, 0, 0, { 
                        isOn: prop.isOn, 
                        castShadow: prop.castShadow || false 
                    });
                    mesh = attachPropData(lampProp, lampProp.group);
                    if (lampProp.getLight && lampProp.getLight()) {
                        this.lights.push(lampProp.getLight());
                    }
                    break;
                }
                case 'building_light':
                    // Apple (Mac + iOS) + Android: Skip expensive building lights for performance
                    const needsLightOpt = typeof window !== 'undefined' && (window._isAppleDevice || window._isAndroidDevice);
                    if (!needsLightOpt) {
                        const buildingLight = new this.THREE.PointLight(
                            prop.color || 0xFFE4B5,
                            prop.intensity || 2.5,
                            prop.distance || 15,
                            1.5
                        );
                        buildingLight.position.set(0, prop.height || 4, 0);
                        mesh = new this.THREE.Group();
                        mesh.add(buildingLight);
                        this.lights.push(buildingLight);
                    } else {
                        mesh = new this.THREE.Group(); // Empty group for mobile
                    }
                    break;
                case 'bench': {
                    // Use new modular prop system with auto-attached collision/interaction
                    const benchProp = createProp(this.THREE, null, PROP_TYPES.BENCH, 0, 0, 0, { withSnow: true });
                    mesh = attachPropData(benchProp, benchProp.group);
                    break;
                }
                case 'snowman': {
                    // Use new modular prop system with auto-attached collision
                    const snowmanProp = createProp(this.THREE, null, PROP_TYPES.SNOWMAN, 0, 0, 0);
                    mesh = attachPropData(snowmanProp, snowmanProp.group);
                    break;
                }
                case 'rock': {
                    // Use new modular prop system with auto-attached collision
                    const rockProp = createProp(this.THREE, null, PROP_TYPES.ROCK, 0, 0, 0, { size: prop.size });
                    mesh = attachPropData(rockProp, rockProp.group);
                    break;
                }
                case 'campfire': {
                    // Use new modular prop system with auto-attached collision/interaction
                    const campfireProp = createProp(this.THREE, null, PROP_TYPES.CAMPFIRE, 0, 0, 0, { isLit: true });
                    mesh = attachPropData(campfireProp, campfireProp.group);
                    if (campfireProp.getLight) mesh.userData.fireLight = campfireProp.getLight();
                    if (campfireProp.getParticles) mesh.userData.particles = campfireProp.getParticles();
                    mesh.userData.campfireUpdate = (time) => campfireProp.update && campfireProp.update(time);
                    break;
                }
                case 'christmas_tree': {
                    // Use new modular prop system with auto-attached collision
                    const xmasTreeProp = createProp(this.THREE, null, PROP_TYPES.CHRISTMAS_TREE, 0, 0, 0);
                    mesh = attachPropData(xmasTreeProp, xmasTreeProp.group);
                    mesh.userData.treeUpdate = (time, delta, nightFactor) => 
                        xmasTreeProp.update && xmasTreeProp.update(time, delta, nightFactor);
                    break;
                }
                case 'dojo_parkour':
                    // Parkour course is BOUND to dojo position
                    // mirrored: true rotates the course 180 degrees (goes on opposite side)
                    const parkourResult = createDojoParkour(this.THREE, {
                        dojoX: C + dojoOffset.x,
                        dojoZ: C + dojoOffset.z,
                        dojoWidth: 14,
                        dojoHeight: 8,
                        dojoDepth: 14,
                        mirrored: true  // Rotate parkour 180 degrees
                    });
                    mesh = parkourResult.mesh;
                    
                    // Add platform colliders
                    parkourResult.colliders.forEach((collider, idx) => {
                        this.collisionSystem.addCollider(
                            collider.x, collider.z,
                            { type: 'box', size: collider.size, height: collider.size.y },
                            1, { name: `parkour_plat_${idx}` },
                            collider.rotation || 0, collider.y
                        );
                    });
                    
                    // Spawn ACTUAL Bench props at VIP positions - uses unified Bench class
                    // This ensures consistent interactions across all benches in the game
                    parkourResult.benchSpawnPositions.forEach((benchPos, idx) => {
                        const benchProp = createProp(this.THREE, null, PROP_TYPES.BENCH, 0, 0, 0, { withSnow: true });
                        const benchMesh = attachPropData(benchProp, benchProp.group);
                        
                        // Position the bench at the VIP spot
                        benchMesh.position.set(benchPos.x, benchPos.y, benchPos.z);
                        benchMesh.rotation.y = benchPos.rotation || 0;
                        
                        // Update interaction zone with correct VIP message and platform height
                        // (attachPropData extracts trigger data at position 0,0,0 so we need to fix the heights)
                        if (benchMesh.userData.interactionZone) {
                            benchMesh.userData.interactionZone.message = `🪑 Sit (${benchPos.tier === 3 ? 'Ultimate VIP!' : 'Secret VIP Spot!'})`;
                            benchMesh.userData.interactionZone.platformHeight = benchPos.y;
                            benchMesh.userData.interactionZone.seatHeight = benchPos.y + 0.8;
                            benchMesh.userData.interactionZone.data = {
                                ...benchMesh.userData.interactionZone.data,
                                platformHeight: benchPos.y,
                                seatHeight: benchPos.y + 0.8
                            };
                        }
                        
                        scene.add(benchMesh);
                        this.propMeshes.push(benchMesh);
                        
                        // Register with collision system for interactions
                        this.collisionSystem.registerProp(
                            benchMesh,
                            (event, zoneData) => this._handleInteraction(event, zoneData)
                        );
                    });
                    
                    mesh.userData.parkourData = parkourResult;
                    mesh.position.set(0, 0, 0);
                    scene.add(mesh);
                    this.propMeshes.push(mesh);
                    mesh = null;
                    break;
                case 'log_seat': {
                    // Use new modular prop system with auto-attached collision/interaction
                    const logProp = createProp(this.THREE, null, PROP_TYPES.LOG_SEAT, 0, 0, 0, { rotation: prop.rotation || 0 });
                    mesh = attachPropData(logProp, logProp.group);
                    break;
                }
                case 'snow_pile': {
                    // Use new modular prop system with auto-attached collision
                    const snowPileProp = createProp(this.THREE, null, PROP_TYPES.SNOW_PILE, 0, 0, 0, { size: prop.size });
                    mesh = attachPropData(snowPileProp, snowPileProp.group);
                    break;
                }
                case 'signpost': {
                    // Use new modular prop system with auto-attached collision
                    const signProp = createProp(this.THREE, null, PROP_TYPES.SIGNPOST, 0, 0, 0, { signs: prop.signs });
                    mesh = attachPropData(signProp, signProp.group);
                    break;
                }
                case 'fence': {
                    // Use new modular prop system with auto-attached collision
                    const fenceProp = createProp(this.THREE, null, PROP_TYPES.FENCE, 0, 0, 0, { length: prop.length });
                    mesh = attachPropData(fenceProp, fenceProp.group);
                    break;
                }
                case 'nightclub':
                    // Epic nightclub with animated speakers and neon lights
                    const nightclubResult = createNightclubExterior(this.THREE, {
                        width: prop.width,
                        depth: prop.depth,
                        height: prop.height
                    });
                    mesh = nightclubResult.mesh;
                    mesh.userData.nightclubUpdate = nightclubResult.update;
                    mesh.userData.speakers = nightclubResult.speakers;
                    mesh.name = 'nightclub';
                    
                    // Add collision for the nightclub building walls (blocks walking through)
                    this.collisionSystem.addCollider(
                        prop.x, prop.z,
                        { type: 'box', size: { x: prop.width + 2, z: prop.depth + 2 }, height: prop.height },
                        1, // SOLID
                        { name: 'nightclub' }
                    );
                    
                    // Add roof as a landing surface (can walk/stand on top)
                    // Roof is at height h (12) + parapet (1) = 13
                    this.collisionSystem.addCollider(
                        prop.x, prop.z,
                        { type: 'box', size: { x: prop.width, z: prop.depth }, height: 0.5 },
                        1, // SOLID (landing surface)
                        { name: 'nightclub_roof' },
                        0, // rotation
                        prop.height + 1 // y position = roof height
                    );
                    
                    // Add roof couch collision (centered on nightclub roof)
                    this.collisionSystem.addCollider(
                        prop.x, prop.z, // Centered on nightclub
                        { type: 'box', size: { x: 5, z: 2 }, height: 1.5 },
                        1, // SOLID
                        { name: 'nightclub_roof_couch' },
                        0,
                        prop.height + 1 // On the roof (height 12 + 1 = 13)
                    );
                    
                    // Add collisions for the speakers (outside the building)
                    if (nightclubResult.speakerColliders) {
                        nightclubResult.speakerColliders.forEach((speaker, idx) => {
                            this.collisionSystem.addCollider(
                                prop.x + speaker.x,
                                prop.z + speaker.z,
                                { type: 'box', size: speaker.size, height: speaker.height },
                                1, // SOLID
                                { name: `nightclub_speaker_${idx}` },
                                0,
                                speaker.y || 0
                            );
                        });
                    }
                    break;
                    
                case 'billboard':
                    // Highway-style billboard with lit-up advertisement (using new Billboard prop)
                    const billboardProp = new Billboard(this.THREE);
                    billboardProp.spawn(scene, prop.x, prop.y ?? 0, prop.z, {
                        imagePath: prop.imagePath || '/advert.png',
                        width: 12,
                        height: 4,
                        poleHeight: 15,
                        rotation: prop.rotation ?? 0
                    });
                    mesh = billboardProp.group;
                    mesh.name = 'billboard';
                    // Store prop instance for cleanup
                    mesh.userData.propInstance = billboardProp;
                    
                    // Add collision for billboard poles
                    this.collisionSystem.addCollider(
                        prop.x, prop.z,
                        { type: 'box', size: { x: 2, z: 1 }, height: 20 },
                        1, // SOLID
                        { name: 'billboard' }
                    );
                    break;
                    
                case 'nightclub_entrance':
                    // Trigger zone for entering the nightclub interior
                    this.collisionSystem.addTrigger(
                        prop.x, prop.z,
                        {
                            type: 'box',
                            size: { x: 8, z: 5 },
                            action: 'enter_nightclub',
                            message: '🎵 Enter Nightclub (Press E)',
                            destination: 'nightclub'
                        },
                        (event) => this._handleInteraction(event, { 
                            action: 'enter_nightclub',
                            message: '🎵 Enter Nightclub (Press E)',
                            destination: 'nightclub'
                        }),
                        { name: 'nightclub_entrance' }
                    );
                    // No mesh for this - just a trigger
                    mesh = null;
                    break;
                    
                case 'nightclub_ladder':
                    // Trigger zone for climbing to nightclub roof
                    // Large trigger area positioned OUTSIDE building collision
                    this.collisionSystem.addTrigger(
                        prop.x, prop.z,
                        {
                            type: 'box',
                            size: { x: 8, z: 8 }, // Large trigger area for easy interaction
                            action: 'climb_roof',
                            message: '🪜 Climb to Roof (Press E)',
                            destination: 'nightclub_roof'
                        },
                        (event) => this._handleInteraction(event, { 
                            action: 'climb_roof',
                            message: '🪜 Climb to Roof (Press E)',
                            destination: 'nightclub_roof'
                        }),
                        { name: 'nightclub_ladder' }
                    );
                    // No mesh for this - ladder is part of nightclub building
                    mesh = null;
                    break;
                case 'light_string':
                    // Christmas light string connecting two points
                    mesh = this._createLightString(prop.from, prop.to, prop.height);
                    mesh.name = 'light_string';
                    // Light strings position themselves, don't use standard positioning
                    scene.add(mesh);
                    this.propMeshes.push(mesh);
                    mesh = null; // Skip standard positioning
                    break;
                case 'gravel_path':
                    // Create blue gravel ice texture for walking path
                    mesh = this._createGravelPath(prop.width, prop.depth);
                    mesh.position.y = 0.02; // Slightly above ground - low enough to blend, high enough to avoid z-fighting
                    mesh.name = 'gravel_path';
                    break;
                    
                // ==================== NEW QUALITY OF LIFE PROPS ====================
                case 'mailbox': {
                    const mailboxProp = createProp(this.THREE, null, PROP_TYPES.MAILBOX, 0, 0, 0, { style: prop.style || 'classic' });
                    mesh = attachPropData(mailboxProp, mailboxProp.group);
                    break;
                }
                case 'trash_can': {
                    const trashProp = createProp(this.THREE, null, PROP_TYPES.TRASH_CAN, 0, 0, 0, { withLid: true });
                    mesh = attachPropData(trashProp, trashProp.group);
                    break;
                }
                case 'barrel': {
                    const barrelProp = createProp(this.THREE, null, PROP_TYPES.BARREL, 0, 0, 0, { size: prop.size || 'medium' });
                    mesh = attachPropData(barrelProp, barrelProp.group);
                    break;
                }
                case 'fire_hydrant': {
                    const hydrantProp = createProp(this.THREE, null, PROP_TYPES.FIRE_HYDRANT, 0, 0, 0, { color: prop.color || 0xCC2222 });
                    mesh = attachPropData(hydrantProp, hydrantProp.group);
                    break;
                }
                case 'ice_sculpture': {
                    const sculptureProp = createProp(this.THREE, null, PROP_TYPES.ICE_SCULPTURE, 0, 0, 0, { 
                        sculptureType: prop.sculptureType || 'penguin',
                        rotation: prop.rotation || 0
                    });
                    mesh = attachPropData(sculptureProp, sculptureProp.group);
                    break;
                }
                case 'crate': {
                    const crateProp = createProp(this.THREE, null, PROP_TYPES.CRATE, 0, 0, 0, { size: prop.size || 'medium' });
                    mesh = attachPropData(crateProp, crateProp.group);
                    break;
                }
                case 'street_sign': {
                    const signProp = createProp(this.THREE, null, PROP_TYPES.STREET_SIGN, 0, 0, 0, { signType: prop.signType || 'arrow' });
                    mesh = attachPropData(signProp, signProp.group);
                    break;
                }
                case 'wooden_post': {
                    const postProp = createProp(this.THREE, null, PROP_TYPES.WOODEN_POST, 0, 0, 0, { style: prop.style || 'plain' });
                    mesh = attachPropData(postProp, postProp.group);
                    break;
                }
            }
            
            if (mesh) {
                mesh.position.set(prop.x, 0, prop.z);
                if (prop.rotation) mesh.rotation.y = prop.rotation;
                scene.add(mesh);
                this.propMeshes.push(mesh);
                this.collisionSystem.registerProp(
                    mesh,
                    (event, zoneData) => this._handleInteraction(event, zoneData)
                );
            }
        });
        
        // Add building collisions with NEW positions
        TownCenter.BUILDINGS.forEach(building => {
            const bx = C + building.position.x;
            const bz = C + building.position.z;
            
            this.collisionSystem.addCollider(
                bx, bz,
                { type: 'box', size: { x: building.size.w + 1, y: building.size.h, z: building.size.d + 1 } },
                CollisionSystem.TYPES.SOLID,
                { name: building.id, isBuilding: true }
            );
            
            // Dojo roof collision (3 tiers)
            if (building.id === 'dojo') {
                const h = building.size.h, w = building.size.w, d = building.size.d;
                const tierGaps = [0, 5.5, 11];
                const tierScales = [1, 0.75, 0.5];
                
                tierGaps.forEach((gap, tier) => {
                    const roofY = h + 1.2 + gap;
                    const scale = tierScales[tier];
                    this.collisionSystem.addCollider(
                        bx, bz,
                        { type: 'box', size: { x: (w + 4) * scale, y: 0.5, z: (d + 4) * scale }, height: 0.5 },
                        CollisionSystem.TYPES.SOLID,
                        { name: `dojo_roof_tier${tier}`, isRoof: true },
                        0, roofY
                    );
                });
                
                // Dojo steps
                for (let i = 0; i < 3; i++) {
                    const stepWidth = 4 - i * 0.4;
                    const stepY = 0.28 + i * 0.28;
                    const stepZ = bz - d / 2 - 1.5 - (2 - i) * 0.95; // Steps face NORTH now
                    this.collisionSystem.addCollider(
                        bx, stepZ,
                        { type: 'box', size: { x: stepWidth, y: 0.28, z: 0.9 }, height: 0.28 },
                        CollisionSystem.TYPES.SOLID,
                        { name: `dojo_step_${i}`, isStep: true },
                        0, stepY
                    );
                }
            }
            
            // Gift shop roof
            if (building.id === 'market') {
                const w = building.size.w, h = building.size.h, d = building.size.d;
                const roofEdgeY = h + 1;
                
                this.collisionSystem.addCollider(bx - w/4, bz,
                    { type: 'box', size: { x: w/2 + 1, y: 0.3, z: d + 2 }, height: 0.3 },
                    CollisionSystem.TYPES.SOLID, { name: 'gift_shop_roof_left', isRoof: true },
                    0, roofEdgeY + 0.8);
                this.collisionSystem.addCollider(bx + w/4, bz,
                    { type: 'box', size: { x: w/2 + 1, y: 0.3, z: d + 2 }, height: 0.3 },
                    CollisionSystem.TYPES.SOLID, { name: 'gift_shop_roof_right', isRoof: true },
                    0, roofEdgeY + 0.8);
                this.collisionSystem.addCollider(bx, bz,
                    { type: 'box', size: { x: 1, y: 0.4, z: d + 2.4 }, height: 0.4 },
                    CollisionSystem.TYPES.SOLID, { name: 'gift_shop_roof_ridge', isRoof: true },
                    0, h + 3);
            }
        });
        
        this._addWallBoundary(scene);
        
        return { meshes: this.propMeshes, lights: this.lights, collisionSystem: this.collisionSystem };
    }

    _addWallBoundary(scene) {
        const THREE = this.THREE;
        const C = TownCenter.CENTER;
        const SIZE = TownCenter.WORLD_SIZE;
        const WALL_HEIGHT = 50; // Super tall walls
        const WALL_THICKNESS = 4;
        const MARGIN = 5; // Distance from edge
        
        // Create invisible but solid wall colliders on all 4 sides
        // North wall (z = margin)
                this.collisionSystem.addCollider(
            C, MARGIN,
            { type: 'box', size: { x: SIZE, z: WALL_THICKNESS }, height: WALL_HEIGHT },
            CollisionSystem.TYPES.WALL,
            { name: 'wall_north' }
        );
        
        // South wall (z = SIZE - margin)
                this.collisionSystem.addCollider(
            C, SIZE - MARGIN,
            { type: 'box', size: { x: SIZE, z: WALL_THICKNESS }, height: WALL_HEIGHT },
            CollisionSystem.TYPES.WALL,
            { name: 'wall_south' }
        );
        
        // West wall (x = margin)
                this.collisionSystem.addCollider(
            MARGIN, C,
            { type: 'box', size: { x: WALL_THICKNESS, z: SIZE }, height: WALL_HEIGHT },
            CollisionSystem.TYPES.WALL,
            { name: 'wall_west' }
        );
        
        // East wall (x = SIZE - margin)
        this.collisionSystem.addCollider(
            SIZE - MARGIN, C,
            { type: 'box', size: { x: WALL_THICKNESS, z: SIZE }, height: WALL_HEIGHT },
            CollisionSystem.TYPES.WALL,
            { name: 'wall_east' }
        );
        
        // Walls are invisible - collision only, no visible meshes
    }

    /**
     * Create Christmas light string between two lamp posts
     * Features a curved catenary line with colorful bulbs
     */
    _createLightString(from, to, height) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Calculate distance and direction
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        
        // OPTIMIZED: Reduced bulb count for better performance
        const bulbCount = Math.max(6, Math.floor(distance / 4));
        const sagAmount = Math.min(distance * 0.15, 3); // Sag in the middle
        
        // Christmas light colors
        const lightColors = [
            0xFF0000, // Red
            0x00FF00, // Green
            0x0000FF, // Blue
            0xFFFF00, // Yellow
            0xFF00FF, // Magenta
            0x00FFFF, // Cyan
            0xFFAA00, // Orange
            0xFF6699, // Pink
        ];
        
        // OPTIMIZED: Create the wire/string with fewer points
        const wirePoints = [];
        for (let i = 0; i <= 8; i++) {
            const t = i / 8;
            const x = from.x + dx * t;
            const z = from.z + dz * t;
            // Catenary-like sag (parabola)
            const sag = sagAmount * (1 - Math.pow(2 * t - 1, 2));
            const y = height - sag;
            wirePoints.push(new THREE.Vector3(x, y, z));
        }
        
        const wireCurve = new THREE.CatmullRomCurve3(wirePoints);
        // OPTIMIZED: Reduced tube segments (8 instead of 20) and radial segments (3 instead of 4)
        const wireGeo = new THREE.TubeGeometry(wireCurve, 8, 0.02, 3, false);
        const wireMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        group.add(wire);
        
        // OPTIMIZED: Lower polygon bulbs (4 segments instead of 6)
        const bulbGeo = new THREE.SphereGeometry(0.12, 4, 4);
        
        for (let i = 0; i < bulbCount; i++) {
            const t = (i + 0.5) / bulbCount;
            const x = from.x + dx * t;
            const z = from.z + dz * t;
            const sag = sagAmount * (1 - Math.pow(2 * t - 1, 2));
            const y = height - sag - 0.1; // Slightly below wire
            
            const color = lightColors[i % lightColors.length];
            // OPTIMIZED: Use MeshBasicMaterial with emissive look (no lighting calculations)
            const bulbMat = new THREE.MeshBasicMaterial({
                color: color,
            });
            
            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
            bulb.position.set(x, y, z);
            group.add(bulb);
            
            // OPTIMIZED: Only add point light for 1st bulb per string (was every 3rd)
            // Apple (Mac + iOS) + Android: Skip point lights entirely (use emissive materials only)
            // The emissive bulbs provide visual glow, we only need 1 light per string for ambiance
            const skipLights = typeof window !== 'undefined' && (window._isAppleDevice || window._isAndroidDevice);
            if (!skipLights && i === Math.floor(bulbCount / 2)) {
                const light = new THREE.PointLight(0xFFFFAA, 0.4, 6); // Warm white, merged color
                light.position.set(x, y, z);
                group.add(light);
                this.lights.push(light);
            }
        }
        
        return group;
    }

    /**
     * Create a blue gravel ice texture for walking paths
     * Uses procedural canvas texture for icy gravel look
     */
    _createGravelPath(width, depth) {
        const THREE = this.THREE;
        
        // Create procedural canvas texture for blue gravel ice
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Base dark blue color
        ctx.fillStyle = '#1a3a4a';
        ctx.fillRect(0, 0, size, size);
        
        // Add gravel-like noise pattern in various blue shades
        const gravelColors = [
            '#0d2633', // Very dark blue
            '#1e4455', // Dark blue
            '#2a5566', // Medium dark blue
            '#163344', // Deep blue
            '#0f2d3d', // Darker blue
            '#234a5a', // Slightly lighter
            '#1a3f4f', // Base variation
            '#122838', // Near black blue
        ];
        
        // Draw many small irregular shapes for gravel effect
        for (let i = 0; i < 3000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const gravelSize = 1 + Math.random() * 3;
            
            ctx.fillStyle = gravelColors[Math.floor(Math.random() * gravelColors.length)];
            ctx.beginPath();
            // Irregular shapes for natural gravel look
            if (Math.random() > 0.5) {
                ctx.ellipse(x, y, gravelSize, gravelSize * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
            } else {
                ctx.arc(x, y, gravelSize, 0, Math.PI * 2);
            }
            ctx.fill();
        }
        
        // Add some icy highlights/sparkles
        ctx.fillStyle = 'rgba(180, 220, 255, 0.15)';
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            ctx.beginPath();
            ctx.arc(x, y, 0.5 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(width / 15, depth / 15); // Tile the texture
        
        // Create material with the gravel texture
        // Enhanced polygon offset to fix z-fighting when camera looks straight down
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.9,
            metalness: 0.1,
            depthWrite: true,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
        });
        
        // Create flat plane for the path
        const geometry = new THREE.PlaneGeometry(width, depth);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2; // Lay flat on ground
        mesh.receiveShadow = true;
        
        return mesh;
    }

    _handleInteraction(event, zone) {
        if (event.type === 'enter') {
            window.dispatchEvent(new CustomEvent('townInteraction', {
                detail: { action: zone.action, message: zone.message, emote: zone.emote, data: zone }
            }));
        } else if (event.type === 'exit') {
            window.dispatchEvent(new CustomEvent('townInteraction', {
                detail: { action: 'exit', exitedZone: zone.action, message: null, emote: null, data: zone }
            }));
        }
    }

    checkPlayerMovement(x, z, newX, newZ, radius = 0.8, y = 0) {
        return this.collisionSystem.checkMovement(x, z, newX, newZ, radius, y);
    }
    
    checkLanding(x, z, y, radius = 0.8) {
        return this.collisionSystem.checkLanding(x, z, y, radius);
    }

    checkTriggers(playerX, playerZ, playerY = 0) {
        return this.collisionSystem.checkTriggers(playerX, playerZ, 0.5, playerY);
    }

    getActiveTriggers(playerX, playerZ) {
        return this.collisionSystem.getActiveTriggers(playerX, playerZ);
    }

    update(time, delta, nightFactor = 0.5) {
        if (!this._animatedCache) {
            this._animatedCache = { campfires: [], christmasTrees: [], nightclubs: [], sknyIgloos: [], frameCounter: 0 };
            this.propMeshes.forEach(mesh => {
                if (mesh.name === 'campfire') {
                    const flames = [];
                    mesh.traverse(child => { if (child.userData.isFlame) flames.push(child); });
                    this._animatedCache.campfires.push({
                        flames, particles: mesh.userData.particles, light: mesh.userData.fireLight
                    });
                }
                if (mesh.name === 'christmas_tree' && mesh.userData.treeUpdate) {
                    this._animatedCache.christmasTrees.push(mesh);
                }
                if (mesh.name === 'nightclub' && mesh.userData.nightclubUpdate) {
                    this._animatedCache.nightclubs.push(mesh);
                }
            });
            // SKNY Igloos stored separately during spawn
            if (this.sknyIgloos) {
                this._animatedCache.sknyIgloos = this.sknyIgloos;
            }
        }
        
        this._animatedCache.frameCounter++;
        const frame = this._animatedCache.frameCounter;
        
        // OPTIMIZED: Nightclub speakers and neon - every 2nd frame (still smooth for bass pulse)
        if (frame % 2 === 0) {
            this._animatedCache.nightclubs.forEach(mesh => {
                if (mesh.userData.nightclubUpdate) {
                    mesh.userData.nightclubUpdate(time);
                }
            });
            
            // SKNY Igloo animations - same timing as nightclubs
            this._animatedCache.sknyIgloos.forEach(sknyProp => {
                if (sknyProp.update) {
                    sknyProp.update(time);
                }
            });
        }
        
        // OPTIMIZED: Campfire flames - every 2nd frame (still looks fluid)
        if (frame % 2 === 0) {
            this._animatedCache.campfires.forEach(({ flames, particles, light }) => {
                flames.forEach(flame => {
                    const offset = flame.userData.offset || 0;
                    flame.position.y = flame.userData.baseY + Math.sin(time * 8 + offset) * 0.1;
                    flame.scale.x = 0.8 + Math.sin(time * 10 + offset) * 0.2;
                    flame.scale.z = 0.8 + Math.cos(time * 10 + offset) * 0.2;
                    flame.rotation.y = time * 2 + offset;
                });
                
                // OPTIMIZED: Particles every 6th frame (was every 3rd)
                if (particles && frame % 6 === 0) {
                    const positions = particles.geometry.attributes.position.array;
                    const len = positions.length / 3;
                    for (let i = 0; i < len; i++) {
                        const idx = i * 3;
                        positions[idx + 1] += delta * 4 * (1 + Math.random() * 0.5); // Double speed to compensate
                        positions[idx] += (Math.random() - 0.5) * delta * 2;
                        positions[idx + 2] += (Math.random() - 0.5) * delta * 2;
                        if (positions[idx + 1] > 3) {
                            positions[idx] = (Math.random() - 0.5) * 0.8;
                            positions[idx + 1] = 0.2;
                            positions[idx + 2] = (Math.random() - 0.5) * 0.8;
                        }
                    }
                    particles.geometry.attributes.position.needsUpdate = true;
                }
                
                // OPTIMIZED: Light flicker every 6th frame
                if (light && frame % 6 === 0) {
                    light.intensity = 1.5 + Math.sin(time * 15) * 0.3 + Math.random() * 0.2;
                }
            });
        }
        
        // OPTIMIZED: Christmas trees every 12th frame (was every 6th)
        if (frame % 12 === 0) {
            this._animatedCache.christmasTrees.forEach(mesh => {
                if (mesh.userData.treeUpdate) mesh.userData.treeUpdate(time, nightFactor);
            });
        }
    }

    cleanup() {
        this.propMeshes.forEach(mesh => {
            if (mesh.parent) mesh.parent.remove(mesh);
            mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        });
        this.propMeshes = [];
        this.lights = [];
        this.collisionSystem.clear();
        this._animatedCache = null;
    }

    dispose() {
        this.cleanup();
        // PropsFactory dispose is handled by the singleton wrappers
    }

    getSpawnPosition() {
        // Spawn south of dojo, at the base of the T
        return {
            x: TownCenter.CENTER,
            z: TownCenter.CENTER + 50  // South of dojo
        };
    }

    getDebugMesh() {
        return this.collisionSystem.createDebugMesh(this.THREE);
    }
}

export default TownCenter;


