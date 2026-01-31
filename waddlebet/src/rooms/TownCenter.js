import CollisionSystem from '../engine/CollisionSystem';
import { createProp, PROP_TYPES, Billboard, IceFishingHole, ArcadeMachine, PuffleFoodVendingMachine, createIglooInfoBoard } from '../props';
import { createNightclubExterior } from '../props/NightclubExterior';
import { createDojoParkour } from '../props/DojoParkour';
import { createSkatePark } from '../props/SkatePark';
import { createPark } from '../props/Park';
import Lighthouse from '../props/Lighthouse';
import { createCasino } from '../buildings';
import { createCasinoTVSprite, updateCasinoTVSprite } from '../systems/CasinoTVSystem';

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
 * - Pizza & Puffle Shop on sides of the stem
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
            id: 'puffle_shop', 
            name: 'PUFFLE SHOP', 
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
        },
        { 
            id: 'casino', 
            name: 'CASINO', 
            position: { x: -50, z: 3 },  // Near pizza parlor, facing the street
            size: { w: 36, h: 14, d: 32 },
            rotation: Math.PI / 2, // Door faces east (toward street like pizza)
            walkable: true, // Interior is walkable
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
        
        // ==================== CARDINAL DIRECTION MARKERS ====================
        // Large floating letters to show N/S/E/W for debugging orientation
        // Coordinate system: +Z = South, -Z = North, +X = East, -X = West
        // World bounds: Town (0-220) + Snow Forts (220-440) = total 440 x 220
        const WORLD_WIDTH = 440; // Total expanded world width
        const WORLD_DEPTH = SIZE; // 220
        
        props.push({
            type: 'cardinal_marker',
            x: WORLD_WIDTH / 2,  // Center of expanded world (220)
            z: -20,              // North edge (above z=0)
            letter: 'N',
            color: 0x00AAFF      // Blue for North
        });
        props.push({
            type: 'cardinal_marker',
            x: WORLD_WIDTH / 2,  // Center of expanded world
            z: WORLD_DEPTH + 20, // South edge (below z=220)
            letter: 'S',
            color: 0xFF4444      // Red for South
        });
        props.push({
            type: 'cardinal_marker',
            x: -20,              // West edge (left of x=0)
            z: C,                // Center depth
            letter: 'W',
            color: 0xFFAA00      // Orange for West
        });
        props.push({
            type: 'cardinal_marker',
            x: WORLD_WIDTH + 20, // East edge (right of x=440)
            z: C,                // Center depth
            letter: 'E',
            color: 0x00FF00      // Green for East
        });
        
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
                { text: 'PUFFLE SHOP', direction: 0 },   // East
            ]
        });
        
        // ==================== CHRISTMAS TREE ====================
        // Positioned near the Puffle Shop
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
        
        // ==================== CASINO ====================
        // Walkable casino building beside pizza parlor
        // Open front entrance, interior with stairs to 2nd floor bar
        props.push({
            type: 'casino',
            x: C - 50,      // Near pizza parlor
            z: C + 3,       // Near pizza parlor
            width: 36,
            depth: 32,
            height: 14,
            rotation: Math.PI / 2  // Door faces east (toward street like pizza)
        });
        
        // ==================== SKATE PARK ====================
        // Behind the casino - half pipes, rails, and ramps for skateboarding
        // Positioned further west to avoid clipping with casino
        props.push({
            type: 'skate_park',
            x: C - 90,      // Further west, away from casino
            z: C + 30,      // South of T-bar street
            width: 30,      // Park width (smaller to fit)
            depth: 25,      // Park depth
            withLights: true
        });
        
        // ==================== GARDEN PARK ====================
        // Cozy green park with fountain, benches, flowers, and butterflies
        props.push({
            type: 'garden_park',
            x: C + 36,      // East side of map
            z: C + 81,      // Near dojo area
            radius: 10,     // Park size
            benchCount: 4,
            withFountain: true,
            withButterflies: true
        });
        
        // Garden park street lights (4 lamp posts around the park perimeter)
        const gardenParkX = C + 36;
        const gardenParkZ = C + 81;
        const gardenLampRadius = 13; // Just outside the park radius of 10
        props.push(
            { type: 'lamp_post', x: gardenParkX + gardenLampRadius, z: gardenParkZ, isOn: true, castShadow: false },  // East
            { type: 'lamp_post', x: gardenParkX - gardenLampRadius, z: gardenParkZ, isOn: true, castShadow: false },  // West
            { type: 'lamp_post', x: gardenParkX, z: gardenParkZ + gardenLampRadius, isOn: true, castShadow: false },  // South
            { type: 'lamp_post', x: gardenParkX, z: gardenParkZ - gardenLampRadius, isOn: true, castShadow: false }   // North
        );
        
        // ==================== LIGHTHOUSE ====================
        // Classic Club Penguin lighthouse with beacon and observation deck
        const lighthouseX = C + 80.5;
        const lighthouseZ = C + 52.7;
        props.push({
            type: 'lighthouse',
            x: lighthouseX,
            z: lighthouseZ,
            beaconOn: true
        });
        
        // Lighthouse entrance trigger (teleport to observation deck)
        // Centered on lighthouse with radius larger than collision (4) so players can interact from any side
        props.push({
            type: 'lighthouse_entrance',
            x: lighthouseX,
            z: lighthouseZ,  // Centered on lighthouse
        });
        
        // Lamp posts around lighthouse
        props.push(
            { type: 'lamp_post', x: lighthouseX - 8, z: lighthouseZ + 4, isOn: true, castShadow: false },
            { type: 'lamp_post', x: lighthouseX + 8, z: lighthouseZ + 4, isOn: true, castShadow: false }
        );
        
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
        // 3x board size for maximum visibility, normal pole height
        props.push({
            type: 'billboard',
            x: C + 80,      // East side of map
            z: C + 20,      // Near the T intersection
            rotation: Math.PI / 2 + Math.PI,  // Face west toward the street
            imagePath: '/advert.jpg',
            width: 36,      // 3x default (12)
            height: 12,     // 3x default (4)
            poleHeight: 15  // Keep normal height
        });
        
        // Second billboard on the west side (behind pizzeria) facing east toward town
        props.push({
            type: 'billboard',
            x: C - 80,      // West side of map
            z: C + 40,      // Along the stem
            rotation: Math.PI / 2,  // Face east toward the street (rotated 180 from before)
            imagePath: '/advert.jpg',
            width: 36,      // 3x default (12)
            height: 12,     // 3x default (4)
            poleHeight: 15  // Keep normal height
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
        
        // ==================== ZONE EXIT PATHS ====================
        // Extension path to Snow Forts (EAST only)
        
        // EAST ZONE EXIT PATH - extends T-bar to the east edge
        // Leads to Snow Forts zone
        props.push({
            type: 'gravel_path',
            x: SIZE - 8,   // Near east edge (204-220)
            z: C - 45,     // Same z as T-bar
            width: 16,     // From x=204 to x=220
            depth: 32,     // Same depth as T-bar
        });
        
        // ==================== ZONE EXIT SIGNS ====================
        // Directional signs pointing to adjacent zones
        
        // EAST EXIT - Sign pointing to Snow Forts / Ice Rink
        props.push({
            type: 'direction_sign',
            x: SIZE - 15,
            z: C - 45,
            text: 'SNOW FORTS →',
            rotation: 0
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
        
        // Path to Puffle Shop (east branch from stem)
        // Starts at edge of stem (x = C + 14) and goes to puffle shop (x = C + 45)
        props.push({
            type: 'gravel_path',
            x: C + 30,    // Center: (14 + 45) / 2 = 29.5 ≈ 30
            z: C + 35,
            width: 32,    // From stem edge to puffle shop
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
        // Slightly closer to street
        props.push(
            { type: 'igloo', x: C - 70, z: C - 18, rotation: Math.PI },  // igloo7
            { type: 'igloo', x: C - 40, z: C - 21, rotation: Math.PI },  // igloo8
            { type: 'igloo', x: C + 40, z: C - 21, rotation: Math.PI },  // igloo9
            { type: 'igloo', x: C + 70, z: C - 18, rotation: Math.PI },  // igloo10
        );
        
        // ==================== PERSONAL IGLOO - PENGUIN CREATOR ====================
        // Special igloo that opens the in-game penguin customizer
        props.push({
            type: 'personal_igloo',
            x: C + 67.6,
            z: C + 78.7,
            rotation: Math.PI  // Face north toward spawn
        });
        
        // Street lights near wardrobe igloo for visibility
        props.push(
            { type: 'lamp_post', x: C + 60, z: C + 72, isOn: true },   // Left of wardrobe
            { type: 'lamp_post', x: C + 75, z: C + 72, isOn: true },   // Right of wardrobe
            { type: 'lamp_post', x: C + 67.6, z: C + 86, isOn: true }  // Behind wardrobe
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
        
        // Benches near buildings (outside pizza and puffle shop paths)
        props.push(
            { type: 'bench', x: C - 55, z: C + 48, rotation: -Math.PI / 2 },  // Near pizza
            { type: 'bench', x: C + 55, z: C + 48, rotation: Math.PI / 2 },   // Near puffle shop
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
            // Moved this tree to avoid skate park overlap
            { x: C - 100, z: C + 15, size: 'medium' },
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
            { x: C + 70, z: C + 10, size: 'medium' },   // East of puffle shop
            { x: C - 25, z: C + 60, size: 'small' },    // Near dojo west
            { x: C + 25, z: C + 60, size: 'small' },    // Near dojo east
            // Removed tree at C - 60, C - 15 (was blocking casino area)
            { x: C + 60, z: C - 15, size: 'medium' },   // T armpit east
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
            
            // Puffle Shop entrance (east side, door faces west) - UPDATED POSITION (reduced glow)
            { type: 'building_light', x: C + 38, z: C + 35, color: 0xFFE4B5, intensity: 1.0, distance: 10, height: 4 },
            
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
            // Removed mailbox at C - 65, C - 10 (was blocking casino area)
            { type: 'mailbox', x: C + 75, z: C - 10, rotation: Math.PI, style: 'classic' }, // Near igloo10
            { type: 'mailbox', x: C + 52, z: C + 28, rotation: -Math.PI / 2, style: 'modern' }, // Near puffle shop
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
            { type: 'trash_can', x: C + 50, z: C + 48 },    // Near puffle shop (outside path)
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
            { type: 'fire_hydrant', x: C + 48, z: C + 48, color: 0xCC2222 },  // Near puffle shop (outside path)
            { type: 'fire_hydrant', x: C - 18, z: C - 26, color: 0xFFD700 },  // T-junction west (outside paths)
            { type: 'fire_hydrant', x: C + 18, z: C - 26, color: 0xFFD700 },  // T-junction east (outside paths)
            { type: 'fire_hydrant', x: C - 50, z: C - 26, color: 0xCC2222 },  // T-bar west (above path)
            { type: 'fire_hydrant', x: C + 50, z: C - 26, color: 0xCC2222 },  // T-bar east (above path)
            { type: 'fire_hydrant', x: C - 18, z: C - 66, color: 0x2288CC },  // Near nightclub (outside path)
        );
        
        // ==================== ICE SCULPTURES - DECORATIVE CENTERPIECES ====================
        // Large premium sculptures positioned in open areas away from paths and furniture
        // Lord Fishnu (the holy fish) is in the northwest, penguin in the northeast
        props.push(
            { type: 'ice_sculpture', x: C - 52.5, z: C + 54.7, sculptureType: 'fish', isLordFishnu: true, rotation: Math.PI }, // Northwest - LORD FISHNU (rotated 180°)
            { type: 'ice_sculpture', x: C + 52.7, z: C + 56.6, sculptureType: 'penguin' }, // Northeast open area (near puffle shop)
            { type: 'ice_sculpture', x: C - 85, z: C - 45, sculptureType: 'heart', rotation: Math.PI / 2 },   // Far west - rotated 90°
            { type: 'ice_sculpture', x: C + 85, z: C - 45, sculptureType: 'star', rotation: Math.PI / 2 },    // Far east - rotated 90°
        );
        
        // ==================== CRATES - LOADING/STORAGE AREAS ====================
        props.push(
            // Pizza supplies
            { type: 'crate', x: C - 56, z: C + 32, size: 'medium' },
            { type: 'crate', x: C - 58, z: C + 34, size: 'small' },
            // Puffle shop merchandise
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
            { type: 'wooden_post', x: C + 48, z: C + 28, style: 'topped' },  // Outside puffle shop path
        );
        
        // ==================== ICE FISHING POND ====================
        // Frozen pond area southwest of the dojo with multiple fishing spots
        // Main fishing hole at user-specified coordinates
        const fishingPondX = C - 70.4;
        const fishingPondZ = C + 78.5;
        
        props.push(
            // Primary fishing hole (main spot)
            { type: 'ice_fishing_hole', id: 'fishing_1', x: fishingPondX, z: fishingPondZ, rotation: 0 },
            // Secondary holes around the pond
            { type: 'ice_fishing_hole', id: 'fishing_2', x: fishingPondX + 8, z: fishingPondZ - 3, rotation: Math.PI / 6 },
            { type: 'ice_fishing_hole', id: 'fishing_3', x: fishingPondX - 6, z: fishingPondZ + 5, rotation: -Math.PI / 4 },
            { type: 'ice_fishing_hole', id: 'fishing_4', x: fishingPondX + 3, z: fishingPondZ + 9, rotation: Math.PI / 3 },
        );
        
        // ==================== ARCADE GAME ZONE ====================
        // Multiple arcade machines for different minigames!
        // Positioned in a small arcade area near the Puffle Shop
        const arcadeBaseX = C + 21.5;
        const arcadeBaseZ = C - 5.2;
        
        props.push(
            // Battleship - classic naval combat
            { type: 'arcade_machine', id: 'battleship_arcade', x: arcadeBaseX, z: arcadeBaseZ, game: 'battleship' },
            // Flappy Penguin - tap to fly!
            { type: 'arcade_machine', id: 'flappy_arcade', x: arcadeBaseX + 5, z: arcadeBaseZ, game: 'flappy_penguin' },
            // Snake - eat fish and grow!
            { type: 'arcade_machine', id: 'snake_arcade', x: arcadeBaseX + 10, z: arcadeBaseZ, game: 'snake' },
            // Pong - classic ice hockey pong
            { type: 'arcade_machine', id: 'pong_arcade', x: arcadeBaseX + 15, z: arcadeBaseZ, game: 'pong' },
            // Memory Match - flip and match cards
            { type: 'arcade_machine', id: 'memory_arcade', x: arcadeBaseX + 20, z: arcadeBaseZ, game: 'memory' },
            // Thin Ice - classic puffle puzzle game
            { type: 'arcade_machine', id: 'thinice_arcade', x: arcadeBaseX + 25, z: arcadeBaseZ, game: 'thin_ice' },
            // Avalanche Run - endless runner down a mountain
            { type: 'arcade_machine', id: 'avalanche_arcade', x: arcadeBaseX + 30, z: arcadeBaseZ, game: 'avalanche_run' }
        );
        
        // Floating title for the arcade area
        props.push(
            { type: 'floating_title', x: arcadeBaseX + 15, z: arcadeBaseZ - 3, text: '🎮 ARCADE ZONE', height: 8 }
        );
        
        // Pond area decorations - snowy surroundings
        props.push(
            // FLOATING TITLE SIGN - draws attention to the fishing area (raised high for visibility)
            { type: 'floating_title', x: fishingPondX, z: fishingPondZ, text: '🎣 ICE FISHING', height: 12 },
            // Snow piles around pond edge
            { type: 'snow_pile', x: fishingPondX - 10, z: fishingPondZ - 8, size: 'medium' },
            { type: 'snow_pile', x: fishingPondX + 12, z: fishingPondZ + 12, size: 'small' },
            // Lamp posts for nighttime fishing
            { type: 'lamp_post', x: fishingPondX - 8, z: fishingPondZ - 5, isOn: true, castShadow: false },
            { type: 'lamp_post', x: fishingPondX + 10, z: fishingPondZ + 8, isOn: true, castShadow: false },
            // Rocks around the frozen pond
            { type: 'rock', x: fishingPondX - 14, z: fishingPondZ + 10, size: 'medium' },
            { type: 'rock', x: fishingPondX + 15, z: fishingPondZ - 5, size: 'small' },
            // Barrel with fishing supplies/bait
            { type: 'barrel', x: fishingPondX - 5, z: fishingPondZ - 7, size: 'medium' },
            // Signpost pointing to the fishing area
            { type: 'signpost', x: fishingPondX + 18, z: fishingPondZ - 8, signs: [
                { text: 'FISHING', direction: 180 },
                { text: 'DOJO', direction: 45 },
            ]},
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
                case 'personal_igloo': {
                    // Personal Igloo - Special wardrobe igloo with floating cosmetics
                    const personalIglooProp = createProp(this.THREE, null, PROP_TYPES.IGLOO, 0, 0, 0, { withEntrance: true });
                    mesh = attachPropData(personalIglooProp, personalIglooProp.group);
                    
                    // Recolor the igloo to golden/legendary theme
                    mesh.traverse((child) => {
                        if (child.isMesh && child.material) {
                            // Clone material to not affect other igloos
                            child.material = child.material.clone();
                            // Give it a golden/purple legendary look
                            if (child.material.color) {
                                const originalColor = child.material.color.getHex();
                                // Make whites golden, grays purple-tinted
                                if (originalColor > 0xAAAAAA) {
                                    child.material.color.setHex(0xFFD700); // Gold
                                    child.material.emissive = new this.THREE.Color(0x332200);
                                    child.material.emissiveIntensity = 0.3;
                                } else if (originalColor > 0x555555) {
                                    child.material.color.setHex(0x9966FF); // Purple
                                    child.material.emissive = new this.THREE.Color(0x220033);
                                    child.material.emissiveIntensity = 0.2;
                                }
                            }
                        }
                    });
                    
                    // Mark this as a personal igloo for interaction handling
                    mesh.userData.isPersonalIgloo = true;
                    mesh.userData.interactionType = 'penguin_creator';
                    
                    // === FLOATING COSMETICS - OPTIMIZED ===
                    // OLD CODE created 1 mesh per voxel = 800+ draw calls for 4 hats!
                    // NEW: Simple orbiting gem indicators (4 meshes total)
                    const floatingGroup = new this.THREE.Group();
                    floatingGroup.position.set(0, 6, 0); // Above igloo
                    mesh.add(floatingGroup);
                    
                    // Simple orbiting indicators - just 4 simple meshes total
                    const colors = [0xFFD700, 0x9B59B6, 0x3498DB, 0xE74C3C]; // gold, purple, blue, red
                    const sharedGeo = new this.THREE.OctahedronGeometry(0.5, 0); // Simple diamond shape
                    
                    colors.forEach((color, i) => {
                        const mat = new this.THREE.MeshStandardMaterial({
                            color: color,
                            emissive: color,
                            emissiveIntensity: 0.5,
                            metalness: 0.8,
                            roughness: 0.2
                        });
                        const gem = new this.THREE.Mesh(sharedGeo, mat);
                        
                        // Create orbit container
                        const orbit = new this.THREE.Group();
                        orbit.userData.orbitSpeed = 0.3 + i * 0.1;
                        orbit.userData.yOffset = Math.sin(i * 1.5) * 0.3;
                        gem.position.set(3, 0, 0); // Orbit radius
                        orbit.add(gem);
                        orbit.rotation.y = (i / 4) * Math.PI * 2;
                        floatingGroup.add(orbit);
                    });
                    
                    // Store for animation
                    mesh.userData.floatingGroup = floatingGroup;
                    
                    // === SIGN BANNER ===
                    const signCanvas = document.createElement('canvas');
                    signCanvas.width = 800;
                    signCanvas.height = 200;
                    const ctx = signCanvas.getContext('2d');
                    
                    // Gradient background
                    const gradient = ctx.createLinearGradient(0, 0, 800, 0);
                    gradient.addColorStop(0, '#1a0a2e');
                    gradient.addColorStop(0.5, '#2d1b4e');
                    gradient.addColorStop(1, '#1a0a2e');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, 800, 200);
                    
                    // Golden border
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 8;
                    ctx.strokeRect(8, 8, 784, 184);
                    
                    // Inner glow border
                    ctx.strokeStyle = '#9966FF';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(16, 16, 768, 168);
                    
                    // Text with glow
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 20;
                    ctx.fillStyle = '#FFD700';
                    ctx.font = 'bold 56px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('✨ WARDROBE ✨', 400, 85);
                    
                    ctx.shadowColor = '#00FFFF';
                    ctx.shadowBlur = 15;
                    ctx.fillStyle = '#00FFFF';
                    ctx.font = 'bold 36px Arial';
                    ctx.fillText('Change Your Look', 400, 145);
                    ctx.shadowBlur = 0;
                    
                    const signTexture = new this.THREE.CanvasTexture(signCanvas);
                    const signMaterial = new this.THREE.SpriteMaterial({ map: signTexture, transparent: true });
                    const signSprite = new this.THREE.Sprite(signMaterial);
                    signSprite.scale.set(12, 3, 1);
                    signSprite.position.set(0, 12, 0);
                    mesh.add(signSprite);
                    
                    // === AMBIENT LIGHTS (subtle - no harsh glow) ===
                    // Single soft spotlight on igloo
                    const spotlight = new this.THREE.SpotLight(0xFFD700, 0.5, 15, Math.PI / 3, 0.8);
                    spotlight.position.set(0, 12, 5);
                    spotlight.target.position.set(0, 0, 0);
                    mesh.add(spotlight);
                    mesh.add(spotlight.target);
                    
                    // Store lights for potential animation (removed intense colored lights)
                    mesh.userData.wardrobeLights = { spotlight };
                    
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
                    // Store the Campfire instance directly for animation - this is the KEY reference
                    mesh.userData.campfireInstance = campfireProp;
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
                
                case 'casino':
                    // Walkable casino building with open front and 2nd floor bar
                    const casinoMesh = createCasino(this.THREE, {
                        w: prop.width,
                        h: prop.height,
                        d: prop.depth
                    });
                    mesh = casinoMesh;
                    mesh.name = 'casino';
                    mesh.rotation.y = prop.rotation || 0;
                    
                    // Get collision data from the casino building
                    const casinoColliders = casinoMesh.userData.getCollisionData(
                        prop.x, prop.z, prop.rotation || 0
                    );
                    
                    // Add wall collisions (allows walking inside through open front)
                    casinoColliders.forEach(collider => {
                        this.collisionSystem.addCollider(
                            collider.x, collider.z,
                            { type: 'box', size: collider.size, height: collider.height },
                            1, // SOLID
                            { name: collider.name },
                            collider.rotation || 0,
                            collider.y || 0
                        );
                    });
                    
                    // Get landing surfaces for storing bounds (NOT as colliders - handled dynamically)
                    const casinoSurfaces = casinoMesh.userData.getLandingSurfaces(
                        prop.x, prop.z, prop.rotation || 0
                    );
                    
                    // DON'T add 2nd floor as solid collider - it blocks horizontal movement!
                    // Instead, we handle landing dynamically in checkLanding() method
                    
                    // Store stair data for dynamic height calculation (like Nightclub)
                    this.casinoStairData = casinoMesh.userData.getStairData(
                        prop.x, prop.z, prop.rotation || 0
                    );
                    
                    // Store 2nd floor data for landing check (dynamic, not a collider)
                    const floor2 = casinoSurfaces.find(s => s.name === 'casino_second_floor');
                    if (floor2) {
                        this.casinoSecondFloor = {
                            minX: floor2.x - floor2.width / 2,
                            maxX: floor2.x + floor2.width / 2,
                            minZ: floor2.z - floor2.depth / 2,
                            maxZ: floor2.z + floor2.depth / 2,
                            height: floor2.height
                        };
                    }
                    
                    // Get furniture data for sitting interactions (stools, couch)
                    this.casinoFurniture = casinoMesh.userData.getFurnitureData(
                        prop.x, prop.z, prop.rotation || 0
                    );
                    
                    // Store casino bounds for visibility checks
                    // Casino is rotated, so width/depth swap in world space
                    const rot = prop.rotation || 0;
                    const isRotated90 = Math.abs(Math.abs(rot % Math.PI) - Math.PI / 2) < 0.1;
                    const worldWidth = isRotated90 ? prop.depth : prop.width;
                    const worldDepth = isRotated90 ? prop.width : prop.depth;
                    this.casinoBounds = {
                        minX: prop.x - worldWidth / 2,
                        maxX: prop.x + worldWidth / 2,
                        minZ: prop.z - worldDepth / 2,
                        maxZ: prop.z + worldDepth / 2
                    };
                    
                    // Store lights for day/night cycle
                    if (casinoMesh.userData.lights) {
                        casinoMesh.userData.lights.forEach(light => {
                            this.lights.push(light);
                        });
                    }
                    
                    // Add casino decoration colliders (chip stacks, dice in front)
                    if (casinoMesh.userData.getDecorationColliders) {
                        const decorationColliders = casinoMesh.userData.getDecorationColliders(
                            prop.x, prop.z, prop.rotation || 0
                        );
                        decorationColliders.forEach((collider, idx) => {
                            if (collider.type === 'cylinder') {
                                this.collisionSystem.addCollider(
                                    collider.worldX, collider.worldZ,
                                    { type: 'circle', radius: collider.radius, height: collider.height },
                                    1, // SOLID
                                    { name: `casino_decoration_${idx}` },
                                    0,
                                    0
                                );
                            } else if (collider.type === 'box') {
                                this.collisionSystem.addCollider(
                                    collider.worldX, collider.worldZ,
                                    { type: 'box', size: { x: collider.width, z: collider.depth }, height: collider.height },
                                    1, // SOLID
                                    { name: `casino_decoration_${idx}` },
                                    0,
                                    0
                                );
                            }
                        });
                        console.log(`🎰 Added ${decorationColliders.length} casino decoration colliders`);
                    }
                    
                    // Create Casino TV mesh with REAL data from DexScreener API
                    createCasinoTVSprite(this.THREE).then(casinoTVMesh => {
                        // Position at TV location in casino (centered on back wall)
                        const tvLocalX = 0;  // Centered
                        const tvLocalZ = -prop.depth / 2 + 1.2;
                        const tvWorldX = prop.x + tvLocalZ;
                        const tvWorldZ = prop.z - tvLocalX;
                        const tvWorldY = 5 + 4.2;
                        
                        casinoTVMesh.position.set(tvWorldX, tvWorldY, tvWorldZ);
                        casinoTVMesh.rotation.y = prop.rotation;
                        scene.add(casinoTVMesh);
                        this.casinoTVMesh = casinoTVMesh;
                        console.log('📺 Casino TV created with real $CP data');
                    });
                    break;
                
                case 'skate_park':
                    // Skate park with half pipes, rails, and ramps
                    const skateParkMesh = createSkatePark(this.THREE, {
                        width: prop.width || 30,
                        depth: prop.depth || 25,
                        withLights: prop.withLights !== false,
                        x: prop.x,
                        y: 0,
                        z: prop.z
                    });
                    mesh = skateParkMesh;
                    mesh.name = 'skate_park';
                    
                    // Add collision for all skate park elements
                    const skateColliders = skateParkMesh.userData.colliders || [];
                    let colliderCount = 0;
                    
                    skateColliders.forEach((collider, idx) => {
                        const rot = collider.rotation || 0;
                        const cos = Math.cos(rot);
                        const sin = Math.sin(rot);
                        
                        // Transform local position to world position
                        const localX = collider.x;
                        const localZ = collider.z;
                        const worldX = prop.x + localX;
                        const worldZ = prop.z + localZ;
                        
                        // Determine collision shape based on type
                        let collisionWidth = collider.width || 4;
                        let collisionDepth = collider.depth || 4;
                        let collisionHeight = collider.height || 2;
                        
                        if (collider.type === 'halfpipe') {
                            // Half pipe - wider collision box for the full structure
                            this.collisionSystem.addCollider(
                                worldX, worldZ,
                                { type: 'box', size: { x: collisionWidth, z: collisionDepth }, height: collisionHeight },
                                1, // SOLID - can't walk through the ramp walls
                                { name: `skatepark_halfpipe_${idx}` }
                            );
                            colliderCount++;
                        } else if (collider.type === 'quarterpipe') {
                            // Quarter pipe - account for rotation
                            const rotatedWidth = Math.abs(cos * collisionWidth) + Math.abs(sin * collisionDepth);
                            const rotatedDepth = Math.abs(sin * collisionWidth) + Math.abs(cos * collisionDepth);
                            
                            this.collisionSystem.addCollider(
                                worldX, worldZ,
                                { type: 'box', size: { x: rotatedWidth, z: rotatedDepth }, height: collisionHeight },
                                1, // SOLID
                                { name: `skatepark_qp_${idx}` }
                            );
                            colliderCount++;
                        } else if (collider.type === 'funbox') {
                            // Fun box - solid obstacle
                            this.collisionSystem.addCollider(
                                worldX, worldZ,
                                { type: 'box', size: { x: collisionWidth, z: collisionDepth }, height: collisionHeight },
                                1, // SOLID
                                { name: `skatepark_funbox_${idx}` }
                            );
                            colliderCount++;
                        } else if (collider.type === 'kicker') {
                            // Kicker ramps - smaller collision
                            const kickerRot = collider.rotation || 0;
                            const kCos = Math.cos(kickerRot);
                            const kSin = Math.sin(kickerRot);
                            const kRotatedW = Math.abs(kCos * collisionWidth) + Math.abs(kSin * collisionDepth);
                            const kRotatedD = Math.abs(kSin * collisionWidth) + Math.abs(kCos * collisionDepth);
                            
                            this.collisionSystem.addCollider(
                                worldX, worldZ,
                                { type: 'box', size: { x: kRotatedW + 0.5, z: kRotatedD + 0.5 }, height: collisionHeight },
                                1, // SOLID
                                { name: `skatepark_kicker_${idx}` }
                            );
                            colliderCount++;
                        }
                    });
                    
                    // Add light pole colliders (4 corners)
                    const parkW = prop.width || 30;
                    const parkD = prop.depth || 25;
                    [
                        [-parkW/2 + 2, -parkD/2 + 2],
                        [parkW/2 - 2, -parkD/2 + 2],
                        [-parkW/2 + 2, parkD/2 - 2],
                        [parkW/2 - 2, parkD/2 - 2]
                    ].forEach(([lx, lz], i) => {
                        this.collisionSystem.addCollider(
                            prop.x + lx, prop.z + lz,
                            { type: 'circle', radius: 0.3, height: 5 },
                            1, // SOLID
                            { name: `skatepark_light_${i}` }
                        );
                        colliderCount++;
                    });
                    
                    console.log(`🛹 Skate park created with ${colliderCount} colliders`);
                    break;
                
                case 'garden_park':
                    // Cozy garden park with fountain, benches, flowers, butterflies
                    // Benches use unified Bench prop and sitting is handled via VoxelWorld.jsx furniture array
                    const parkMesh = createPark(this.THREE, {
                        radius: prop.radius || 10,
                        benchCount: prop.benchCount || 4,
                        withFountain: prop.withFountain !== false,
                        withButterflies: prop.withButterflies !== false,
                        x: prop.x,
                        y: 0,
                        z: prop.z
                    });
                    mesh = parkMesh;
                    mesh.name = 'garden_park';
                    
                    // Store park instance for animation
                    this.parkInstance = parkMesh.userData.parkInstance;
                    
                    // Add collision for fountain (center)
                    if (prop.withFountain !== false) {
                        this.collisionSystem.addCollider(
                            prop.x, prop.z,
                            { type: 'circle', radius: 2.8, height: 2.5 },
                            1, // SOLID
                            { name: 'park_fountain' }
                        );
                    }
                    
                    // Add ambient light over the fountain for a warm evening glow
                    // Skip on mobile devices for performance
                    const skipParkLight = typeof window !== 'undefined' && (window._isAppleDevice || window._isAndroidDevice);
                    if (!skipParkLight) {
                        const parkAmbientLight = new this.THREE.PointLight(0xFFE4B5, 1.5, 18); // Warm white
                        parkAmbientLight.position.set(0, 3.5, 0); // Above fountain
                        mesh.add(parkAmbientLight);
                        this.lights.push(parkAmbientLight);
                        mesh.userData.parkLight = parkAmbientLight;
                    }
                    
                    // Note: Bench sitting interactions are handled in VoxelWorld.jsx furniture array
                    // using the same format as other town benches for consistency
                    
                    console.log(`🌳 Garden park created with fountain and ${prop.benchCount || 4} benches`);
                    break;
                    
                case 'billboard':
                    // Highway-style billboard with lit-up advertisement (using new Billboard prop)
                    const billboardProp = new Billboard(this.THREE);
                    billboardProp.spawn(scene, prop.x, prop.y ?? 0, prop.z, {
                        imagePath: prop.imagePath || '/advert.jpg',
                        width: prop.width || 12,
                        height: prop.height || 4,
                        poleHeight: prop.poleHeight || 15,
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
                    
                case 'lighthouse':
                    // Classic Club Penguin lighthouse with beacon
                    const lighthouseProp = new Lighthouse(this.THREE, prop.beaconOn !== false);
                    lighthouseProp.spawn(null, 0, 0, 0); // Spawn at origin, position set by generic code below
                    mesh = lighthouseProp.group;
                    mesh.name = 'lighthouse';
                    
                    // Store lighthouse instance for beacon animation
                    this.lighthouseInstance = lighthouseProp;
                    if (lighthouseProp.getLight) {
                        const beaconLight = lighthouseProp.getLight();
                        if (beaconLight) this.lights.push(beaconLight);
                    }
                    
                    // Add collision for lighthouse tower (cylinder)
                    this.collisionSystem.addCollider(
                        prop.x, prop.z,
                        { type: 'cylinder', radius: 4, height: 18 },
                        1, // SOLID
                        { name: 'lighthouse_tower' }
                    );
                    
                    // Add collision for observation deck (landing surface)
                    this.collisionSystem.addCollider(
                        prop.x, prop.z,
                        { type: 'cylinder', radius: 3.5, height: 0.5 },
                        1, // SOLID (landing surface)
                        { name: 'lighthouse_deck' },
                        0,
                        12.5 // Deck height (towerHeight + 0.5)
                    );
                    
                    console.log(`🔦 Lighthouse created at (${prop.x}, ${prop.z})`);
                    break;
                    
                case 'lighthouse_entrance':
                    // Trigger zone for teleporting to lighthouse observation deck
                    // Sphere trigger centered on lighthouse, radius 6 > collision radius 4
                    // This allows interaction from ANY side of the lighthouse
                    this.collisionSystem.addTrigger(
                        prop.x, prop.z,
                        {
                            type: 'sphere',
                            radius: 6, // Larger than collision radius (4) so player can reach from any side
                            action: 'climb_lighthouse',
                            message: '🔦 Climb to Beacon (Press E)',
                            destination: 'lighthouse_deck'
                        },
                        (event) => this._handleInteraction(event, {
                            action: 'climb_lighthouse',
                            message: '🔦 Climb to Beacon (Press E)',
                            destination: 'lighthouse_deck'
                        }),
                        { name: 'lighthouse_entrance' }
                    );
                    
                    // Exit trigger at the TOP of the lighthouse (for mobile users to see UI)
                    // Elevated sphere at deck height (~12.5) with small radius
                    this.collisionSystem.addTrigger(
                        prop.x, prop.z,
                        {
                            type: 'sphere',
                            radius: 4,
                            action: 'descend_lighthouse',
                            message: '🔦 Descend (Press E)',
                            minY: 10, // Only active when player Y > 10
                            elevated: true
                        },
                        (event) => this._handleInteraction(event, {
                            action: 'descend_lighthouse',
                            message: '🔦 Descend (Press E)'
                        }),
                        { name: 'lighthouse_exit', checkY: true, minY: 10 }
                    );
                    
                    console.log(`🔦 Lighthouse entrance trigger at (${prop.x}, ${prop.z}) with radius 6`);
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
                        rotation: prop.rotation || 0,
                        isLordFishnu: prop.isLordFishnu || false
                    });
                    mesh = attachPropData(sculptureProp, sculptureProp.group);
                    // Store Lord Fishnu reference for interaction
                    if (prop.isLordFishnu) {
                        mesh.userData.isLordFishnu = true;
                        mesh.userData.interactionType = 'lord_fishnu';
                    }
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
                
                case 'cardinal_marker': {
                    // Large floating cardinal direction letter for orientation
                    const THREE = this.THREE;
                    const markerGroup = new THREE.Group();
                    
                    // Create large 3D text using canvas texture on a plane
                    const canvas = document.createElement('canvas');
                    canvas.width = 256;
                    canvas.height = 256;
                    const ctx = canvas.getContext('2d');
                    
                    // Background (transparent)
                    ctx.clearRect(0, 0, 256, 256);
                    
                    // Draw letter with glow
                    ctx.shadowColor = `#${prop.color.toString(16).padStart(6, '0')}`;
                    ctx.shadowBlur = 30;
                    ctx.fillStyle = `#${prop.color.toString(16).padStart(6, '0')}`;
                    ctx.font = 'bold 200px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(prop.letter, 128, 128);
                    
                    // Second pass for extra glow
                    ctx.shadowBlur = 15;
                    ctx.fillText(prop.letter, 128, 128);
                    
                    const texture = new THREE.CanvasTexture(canvas);
                    const spriteMat = new THREE.SpriteMaterial({ 
                        map: texture, 
                        transparent: true,
                        depthTest: false  // Always visible
                    });
                    const sprite = new THREE.Sprite(spriteMat);
                    sprite.scale.set(40, 40, 1); // Large scale for visibility
                    sprite.position.y = 50; // High above ground
                    markerGroup.add(sprite);
                    
                    // Add point light for extra visibility
                    const light = new THREE.PointLight(prop.color, 1, 100);
                    light.position.y = 50;
                    markerGroup.add(light);
                    
                    mesh = markerGroup;
                    break;
                }
                
                case 'direction_sign': {
                    // Directional sign pointing to adjacent zones
                    const THREE = this.THREE;
                    const signGroup = new THREE.Group();
                    
                    // Wooden post (offset to the side so it doesn't go through sign)
                    const postGeo = new THREE.CylinderGeometry(0.12, 0.18, 5, 8);
                    const postMat = new THREE.MeshStandardMaterial({ color: 0x6B4423, roughness: 0.9 });
                    const post = new THREE.Mesh(postGeo, postMat);
                    post.position.set(-2.2, 2.5, 0); // Offset to the left side
                    post.castShadow = true;
                    signGroup.add(post);
                    
                    // Wooden sign board (arrow shape) - attached to side of post
                    const boardGeo = new THREE.BoxGeometry(4.5, 1.2, 0.2);
                    const boardMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.85 });
                    const board = new THREE.Mesh(boardGeo, boardMat);
                    board.position.set(0.3, 4.5, 0);
                    board.castShadow = true;
                    signGroup.add(board);
                    
                    // Arrow point (triangle on the right side)
                    const arrowShape = new THREE.Shape();
                    arrowShape.moveTo(0, 0.6);
                    arrowShape.lineTo(0.8, 0);
                    arrowShape.lineTo(0, -0.6);
                    arrowShape.lineTo(0, 0.6);
                    const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, { depth: 0.2, bevelEnabled: false });
                    const arrow = new THREE.Mesh(arrowGeo, boardMat);
                    arrow.position.set(2.55, 4.5, -0.1);
                    arrow.castShadow = true;
                    signGroup.add(arrow);
                    
                    // Bracket connecting post to sign
                    const bracketGeo = new THREE.BoxGeometry(0.6, 0.15, 0.15);
                    const bracket = new THREE.Mesh(bracketGeo, postMat);
                    bracket.position.set(-1.9, 4.5, 0);
                    signGroup.add(bracket);
                    
                    // Text on sign
                    const canvas = document.createElement('canvas');
                    canvas.width = 512;
                    canvas.height = 128;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#F5DEB3'; // Wheat color background
                    ctx.fillRect(0, 0, 512, 128);
                    ctx.fillStyle = '#2F1810';
                    ctx.font = 'bold 48px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(prop.text || 'ZONE', 256, 64);
                    
                    const texture = new THREE.CanvasTexture(canvas);
                    const textMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
                    const textMesh = new THREE.Mesh(
                        new THREE.PlaneGeometry(4, 1),
                        textMat
                    );
                    textMesh.position.set(0.3, 4.5, 0.11);
                    signGroup.add(textMesh);
                    
                    // Snow cap on top of post
                    const snowGeo = new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
                    const snowMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.9 });
                    const snow = new THREE.Mesh(snowGeo, snowMat);
                    snow.position.set(-2.2, 5.1, 0);
                    signGroup.add(snow);
                    
                    signGroup.rotation.y = prop.rotation || 0;
                    mesh = signGroup;
                    break;
                }
                
                case 'floating_title': {
                    // Animated floating 3D text sign
                    const THREE = this.THREE;
                    mesh = new THREE.Group();
                    
                    // Create canvas for text
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 512;
                    canvas.height = 128;
                    
                    // Draw background with gradient
                    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                    gradient.addColorStop(0, 'rgba(0, 100, 200, 0.9)');
                    gradient.addColorStop(0.5, 'rgba(0, 150, 255, 0.95)');
                    gradient.addColorStop(1, 'rgba(0, 100, 200, 0.9)');
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 20);
                    ctx.fill();
                    
                    // Border
                    ctx.strokeStyle = '#88DDFF';
                    ctx.lineWidth = 4;
                    ctx.stroke();
                    
                    // Text
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 48px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.shadowColor = '#000000';
                    ctx.shadowBlur = 8;
                    ctx.fillText(prop.text || '🎣 ICE FISHING', canvas.width / 2, canvas.height / 2);
                    
                    const texture = new THREE.CanvasTexture(canvas);
                    const material = new THREE.SpriteMaterial({ 
                        map: texture, 
                        transparent: true,
                        depthTest: true,
                        depthWrite: false
                    });
                    const sprite = new THREE.Sprite(material);
                    sprite.scale.set(10, 2.5, 1);
                    sprite.position.y = prop.height || 6;
                    mesh.add(sprite);
                    
                    // Store for animation
                    mesh.userData.floatingSign = sprite;
                    mesh.userData.floatingSignBaseY = prop.height || 6;
                    mesh.name = 'floating_title';
                    break;
                }
                
                case 'ice_fishing_hole': {
                    // Ice fishing spot - multiplayer visible activity
                    const fishingProp = new IceFishingHole(this.THREE);
                    fishingProp.spawn(scene, prop.x, 0, prop.z, { rotation: prop.rotation || 0 });
                    mesh = fishingProp.mesh;
                    mesh.name = prop.id || 'fishing_hole';
                    mesh.userData.fishingSpotId = prop.id;
                    mesh.userData.propInstance = fishingProp;
                    
                    // Store fishing spots for system initialization
                    if (!this.fishingSpots) this.fishingSpots = [];
                    this.fishingSpots.push({
                        id: prop.id,
                        x: prop.x,
                        z: prop.z,
                        rotation: prop.rotation || 0,
                        prop: fishingProp
                    });
                    
                    // Add collision (ice platform is solid)
                    this.collisionSystem.addCollider(
                        prop.x, prop.z,
                        { type: 'circle', radius: 2.5, height: 0.5 },
                        1, // SOLID but low
                        { name: prop.id || 'fishing_hole' }
                    );
                    
                    // Add interaction trigger zone
                    this.collisionSystem.addTrigger(
                        prop.x, prop.z,
                        {
                            type: 'circle',
                            radius: 3.0,
                            action: 'fishing',
                            message: '🎣 Press E to Fish',
                            fishingSpotId: prop.id
                        },
                        (event) => this._handleInteraction(event, { 
                            action: 'fishing',
                            message: '🎣 Press E to Fish',
                            fishingSpotId: prop.id
                        }),
                        { name: `${prop.id}_trigger` }
                    );
                    break;
                }
                
                case 'arcade_machine': {
                    // Arcade machine for playing minigames vs AI
                    const gameType = prop.game || 'battleship';
                    
                    // Game-specific configurations
                    const arcadeConfigs = {
                        battleship: {
                            title: 'BATTLESHIP',
                            message: '🚢 Press E to play Battleship',
                            accentColor: 0x3498db,
                            screenColor: 0x0a3d62
                        },
                        flappy_penguin: {
                            title: 'FLAPPY PENGUIN',
                            message: '🐧 Press E to play Flappy Penguin',
                            accentColor: 0x00ff88,
                            screenColor: 0x1a1a2e
                        },
                        snake: {
                            title: 'SNAKE',
                            message: '🐍 Press E to play Snake',
                            accentColor: 0x2ecc71,
                            screenColor: 0x0a3d62
                        },
                        pong: {
                            title: 'ICE PONG',
                            message: '🏒 Press E to play Ice Pong',
                            accentColor: 0x00d4ff,
                            screenColor: 0x0f5e7e
                        },
                        memory: {
                            title: 'MEMORY MATCH',
                            message: '🧠 Press E to play Memory Match',
                            accentColor: 0x9b59b6,
                            screenColor: 0x2c1654
                        },
                        thin_ice: {
                            title: 'THIN ICE',
                            message: '❄️ Press E to play Thin Ice',
                            accentColor: 0x00bcd4,
                            screenColor: 0x0a4a5c
                        },
                        avalanche_run: {
                            title: 'AVALANCHE RUN',
                            message: '🏔️ Press E to play Avalanche Run',
                            accentColor: 0xff6b35,
                            screenColor: 0x2d1810
                        }
                    };
                    
                    const config = arcadeConfigs[gameType] || arcadeConfigs.battleship;
                    
                    const arcadeProp = new ArcadeMachine(this.THREE);
                    arcadeProp.spawn(scene, prop.x, 0, prop.z, { 
                        gameType: gameType,
                        gameTitle: config.title,
                        accentColor: config.accentColor,
                        screenColor: config.screenColor
                    });
                    mesh = arcadeProp.mesh;
                    mesh.name = prop.id || 'arcade_machine';
                    mesh.userData.gameType = gameType;
                    mesh.userData.propInstance = arcadeProp;
                    
                    // Add collision (arcade machine is solid)
                    this.collisionSystem.addCollider(
                        prop.x, prop.z,
                        { type: 'box', size: { x: 2, y: 3, z: 2 } },
                        CollisionSystem.TYPES.SOLID,
                        { name: prop.id || 'arcade_machine' }
                    );
                    
                    // Add interaction trigger zone
                    this.collisionSystem.addTrigger(
                        prop.x, prop.z,
                        {
                            type: 'circle',
                            radius: 3.5,
                            action: 'play_arcade',
                            message: config.message,
                            gameType: gameType
                        },
                        (event) => this._handleInteraction(event, { 
                            action: 'play_arcade',
                            message: config.message,
                            gameType: gameType
                        }),
                        { name: `${prop.id}_trigger` }
                    );
                    break;
                }
                
                case 'puffle_food_vending': {
                    // Puffle food vending machine - gold sink for feeding puffles
                    const vendingProp = new PuffleFoodVendingMachine(this.THREE);
                    vendingProp.spawn(scene, prop.x, 0, prop.z, {
                        interactionRadius: 4
                    });
                    mesh = vendingProp.mesh;
                    mesh.name = prop.id || 'puffle_food_vending';
                    mesh.userData.propInstance = vendingProp;
                    
                    // Add collision (vending machine is solid)
                    this.collisionSystem.addCollider(
                        prop.x, prop.z,
                        { type: 'box', size: { x: 2.5, y: 4.5, z: 1.5 } },
                        CollisionSystem.TYPES.SOLID,
                        { name: prop.id || 'puffle_food_vending' }
                    );
                    
                    // Add interaction trigger zone
                    this.collisionSystem.addTrigger(
                        prop.x, prop.z,
                        {
                            type: 'circle',
                            radius: 4,
                            action: 'puffle_food_vending',
                            message: '🐾 Press E to buy Puffle Food'
                        },
                        (event) => this._handleInteraction(event, { 
                            action: 'puffle_food_vending',
                            message: '🐾 Press E to buy Puffle Food'
                        }),
                        { name: `${prop.id}_trigger` }
                    );
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
            
            // Skip walkable buildings - their collision is handled in spawn switch cases
            if (building.walkable) {
                return;
            }
            
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
            
            // Puffle Shop roof
            if (building.id === 'puffle_shop') {
                const w = building.size.w, h = building.size.h, d = building.size.d;
                const roofEdgeY = h + 1;
                
                this.collisionSystem.addCollider(bx - w/4, bz,
                    { type: 'box', size: { x: w/2 + 1, y: 0.3, z: d + 2 }, height: 0.3 },
                    CollisionSystem.TYPES.SOLID, { name: 'puffle_shop_roof_left', isRoof: true },
                    0, roofEdgeY + 0.8);
                this.collisionSystem.addCollider(bx + w/4, bz,
                    { type: 'box', size: { x: w/2 + 1, y: 0.3, z: d + 2 }, height: 0.3 },
                    CollisionSystem.TYPES.SOLID, { name: 'puffle_shop_roof_right', isRoof: true },
                    0, roofEdgeY + 0.8);
                this.collisionSystem.addCollider(bx, bz,
                    { type: 'box', size: { x: 1, y: 0.4, z: d + 2.4 }, height: 0.4 },
                    CollisionSystem.TYPES.SOLID, { name: 'puffle_shop_roof_ridge', isRoof: true },
                    0, h + 3);
            }
        });
        
        this._addWallBoundary(scene);
        
        // ==================== IGLOO INFO BOARDS ====================
        // Information boards explaining igloo rental mechanics - one on each side
        
        // Right side board (east of nightclub)
        const iglooInfoBoardRight = createIglooInfoBoard(
            this.THREE,
            { x: C + 63.1, y: 0, z: C - 85.3 },
            0  // Face north
        );
        scene.add(iglooInfoBoardRight.group);
        this.propMeshes.push(iglooInfoBoardRight.group);
        
        // Left side board (west of nightclub) - mirrored position
        const iglooInfoBoardLeft = createIglooInfoBoard(
            this.THREE,
            { x: C - 63.1, y: 0, z: C - 85.3 },
            0  // Face north
        );
        scene.add(iglooInfoBoardLeft.group);
        this.propMeshes.push(iglooInfoBoardLeft.group);
        
        this.iglooInfoBoards = [iglooInfoBoardRight, iglooInfoBoardLeft];
        
        return { meshes: this.propMeshes, lights: this.lights, collisionSystem: this.collisionSystem };
    }

    _addWallBoundary(scene) {
        const THREE = this.THREE;
        const C = TownCenter.CENTER;
        const SIZE = TownCenter.WORLD_SIZE;
        const WALL_HEIGHT = 50; // Super tall walls
        const WALL_THICKNESS = 4;
        const MARGIN = 5; // Distance from edge
        
        // ==================== ZONE BOUNDARY CONFIGURATION ====================
        // Town is connected to Snow Forts on the EAST (no wall there)
        // Other edges have solid walls
        
        // Create invisible but solid wall colliders on exterior edges only
        
        // North wall (z = margin) - FULL, no exit needed yet
        this.collisionSystem.addCollider(
            C, MARGIN,
            { type: 'box', size: { x: SIZE, z: WALL_THICKNESS }, height: WALL_HEIGHT },
            CollisionSystem.TYPES.WALL,
            { name: 'wall_north' }
        );
        
        // South wall (z = SIZE - margin) - FULL, no exit needed yet
        this.collisionSystem.addCollider(
            C, SIZE - MARGIN,
            { type: 'box', size: { x: SIZE, z: WALL_THICKNESS }, height: WALL_HEIGHT },
            CollisionSystem.TYPES.WALL,
            { name: 'wall_south' }
        );
        
        // ==================== WEST WALL (SOLID - no exit) ====================
        // Full wall on west side - no zone connection yet
        this.collisionSystem.addCollider(
            MARGIN, C,
            { type: 'box', size: { x: WALL_THICKNESS, z: SIZE }, height: WALL_HEIGHT },
            CollisionSystem.TYPES.WALL,
            { name: 'wall_west' }
        );
        
        // ==================== EAST WALL - REMOVED ====================
        // No east wall - Snow Forts zone is directly connected
        // Players can walk freely between Town and Snow Forts at x=220
        
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
        
        // Track bulbs for animation
        const stringBulbs = [];
        
        for (let i = 0; i < bulbCount; i++) {
            const t = (i + 0.5) / bulbCount;
            const x = from.x + dx * t;
            const z = from.z + dz * t;
            const sag = sagAmount * (1 - Math.pow(2 * t - 1, 2));
            const y = height - sag - 0.1; // Slightly below wire
            
            const color = lightColors[i % lightColors.length];
            
            // Use MeshStandardMaterial with emissive for GLOW effect
            const bulbMat = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 2.0, // Bright glow when "on"
                roughness: 0.3,
                metalness: 0.1
            });
            
            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
            bulb.position.set(x, y, z);
            
            // Store animation data for twinkle effect
            bulb.userData.isStreetLight = true;
            bulb.userData.lightIndex = i;
            bulb.userData.baseColor = color;
            bulb.userData.twinklePhase = (i / bulbCount) * Math.PI * 2;
            bulb.userData.twinkleSpeed = 2 + (i % 4) * 0.5;
            
            group.add(bulb);
            stringBulbs.push(bulb);
            
            // OPTIMIZED: Only add point light for 1st bulb per string (was every 3rd)
            // Apple (Mac + iOS) + Android: Skip point lights entirely (use emissive materials only)
            // The emissive bulbs provide visual glow, we only need 1 light per string for ambiance
            const skipLights = typeof window !== 'undefined' && (window._isAppleDevice || window._isAndroidDevice);
            if (!skipLights && i === Math.floor(bulbCount / 2)) {
                const light = new THREE.PointLight(0xFFFFAA, 0.5, 8); // Warm white, slightly stronger
                light.position.set(x, y, z);
                group.add(light);
                this.lights.push(light);
            }
        }
        
        // Store bulbs on group for animation access
        group.userData.streetLightBulbs = stringBulbs;
        
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
            console.log(`🎯 Trigger ENTER: ${zone.action} at player (${event.playerX?.toFixed(1)}, ${event.playerZ?.toFixed(1)})`);
            window.dispatchEvent(new CustomEvent('townInteraction', {
                detail: { action: zone.action, message: zone.message, emote: zone.emote, data: zone }
            }));
        } else if (event.type === 'exit') {
            console.log(`🎯 Trigger EXIT: ${zone.action}`);
            window.dispatchEvent(new CustomEvent('townInteraction', {
                detail: { action: 'exit', exitedZone: zone.action, message: null, emote: null, data: zone }
            }));
        }
    }

    checkPlayerMovement(x, z, newX, newZ, radius = 0.8, y = 0) {
        return this.collisionSystem.checkMovement(x, z, newX, newZ, radius, y);
    }
    
    checkLanding(x, z, y, radius = 0.8) {
        // First check standard collision system landing
        let result = this.collisionSystem.checkLanding(x, z, y, radius);
        let highestY = result.landingY;
        
        // Check casino 2nd floor (like Nightclub DJ booth)
        if (this.casinoSecondFloor) {
            const f2 = this.casinoSecondFloor;
            if (x >= f2.minX && x <= f2.maxX && z >= f2.minZ && z <= f2.maxZ) {
                // Player is above the 2nd floor bounds - land on it
                if (y >= f2.height - 1 && f2.height > highestY) {
                    highestY = f2.height;
                    result = {
                        canLand: true,
                        landingY: f2.height,
                        collider: { name: 'casino_second_floor' }
                    };
                }
            }
        }
        
        // Then check casino stairs (dynamic height like Nightclub)
        if (this.casinoStairData) {
            const st = this.casinoStairData;
            
            // For rotated stairs (runs along X axis in world space)
            if (st.runsAlongX) {
                // Check if player is within stair Z bounds (width becomes depth when rotated)
                const stairHalfDepth = st.depth / 2;
                const stairMinZ = st.z - stairHalfDepth;
                const stairMaxZ = st.z + stairHalfDepth;
                
                if (z >= stairMinZ && z <= stairMaxZ) {
                    // Calculate progress along stairs using X position
                    // Stairs run from startX to endX
                    const stairMinX = Math.min(st.startX, st.endX);
                    const stairMaxX = Math.max(st.startX, st.endX);
                    
                    if (x >= stairMinX && x <= stairMaxX) {
                        // Calculate which step we're on
                        const distFromStart = Math.abs(x - st.startX);
                        const stepIndex = Math.floor(distFromStart / st.stepDepth);
                        
                        if (stepIndex >= 0 && stepIndex < st.totalSteps) {
                            const stepY = (stepIndex + 1) * st.stepHeight;
                            
                            // If this step is higher than current landing, use it
                            if (stepY > highestY && y <= stepY + 0.5) {
                                return {
                                    canLand: true,
                                    landingY: stepY,
                                    collider: { name: `casino_stair_${stepIndex}` }
                                };
                            }
                        }
                    }
                }
            } else {
                // Standard Z-axis stairs
                const stairHalfWidth = st.width / 2;
                const stairMinX = st.x - stairHalfWidth;
                const stairMaxX = st.x + stairHalfWidth;
                
                if (x >= stairMinX && x <= stairMaxX) {
                    const stairMinZ = Math.min(st.startZ, st.endZ);
                    const stairMaxZ = Math.max(st.startZ, st.endZ);
                    
                    if (z >= stairMinZ && z <= stairMaxZ) {
                        const distFromStart = Math.abs(z - st.startZ);
                        const stepIndex = Math.floor(distFromStart / st.stepDepth);
                        
                        if (stepIndex >= 0 && stepIndex < st.totalSteps) {
                            const stepY = (stepIndex + 1) * st.stepHeight;
                            
                            if (stepY > highestY && y <= stepY + 0.5) {
                                return {
                                    canLand: true,
                                    landingY: stepY,
                                    collider: { name: `casino_stair_${stepIndex}` }
                                };
                            }
                        }
                    }
                }
            }
        }
        
        return result;
    }

    checkTriggers(playerX, playerZ, playerY = 0) {
        return this.collisionSystem.checkTriggers(playerX, playerZ, 0.5, playerY);
    }

    getActiveTriggers(playerX, playerZ) {
        return this.collisionSystem.getActiveTriggers(playerX, playerZ);
    }

    /**
     * Get casino furniture data for sitting interactions
     * Returns array of furniture objects with type, position, seatHeight, etc.
     */
    getCasinoFurniture() {
        return this.casinoFurniture || [];
    }
    
    /**
     * Check if player is inside the casino bounds
     * Returns true if player is within the casino walls
     */
    isPlayerInCasino(x, z) {
        if (!this.casinoBounds) return false;
        const b = this.casinoBounds;
        return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
    }

    /**
     * Toggle collision debug wireframe visualization
     * Red = ground-level solid colliders
     * Yellow = elevated colliders (e.g. bar counter on 2nd floor)
     * Green = triggers
     */
    toggleCollisionDebug(enabled) {
        if (!this.scene) return null;
        this._collisionDebugEnabled = enabled;
        return this.collisionSystem.toggleDebug(this.scene, this.THREE, enabled);
    }
    
    /**
     * Check if collision debug is currently enabled
     */
    isCollisionDebugEnabled() {
        return this._collisionDebugEnabled || false;
    }

    update(time, delta, nightFactor = 0.5, playerPos = null) {
        if (!this._animatedCache) {
            this._animatedCache = { campfires: [], christmasTrees: [], nightclubs: [], casinos: [], sknyIgloos: [], floatingSigns: [], wardrobeIgloos: [], streetLightStrings: [], frameCounter: 0 };
            // === VISIBILITY CULLING CACHE ===
            // Store elements that should be hidden at distance (with state tracking to avoid freeze)
            // Billboard STRUCTURE stays visible, only the ADVERT IMAGE is hidden at distance
            this._cullCache = {
                billboardAdverts: [], // Just the advertisement planes (not whole billboard)
                nightclubSign: null,  // Nightclub title sprite
                casinoSign: null,     // Casino title sprite
                floatingTitles: [],   // ARCADE, FISHING signs
                wardrobeGroup: null,  // Personal igloo floating cosmetics
            };
            
            this.propMeshes.forEach(mesh => {
                // Wardrobe/Personal igloo with floating cosmetics
                if (mesh.userData.isPersonalIgloo && mesh.userData.floatingGroup) {
                    this._animatedCache.wardrobeIgloos.push({
                        mesh: mesh,
                        floatingGroup: mesh.userData.floatingGroup,
                        lights: mesh.userData.wardrobeLights
                    });
                    // Cache for visibility culling
                    this._cullCache.wardrobeGroup = {
                        mesh: mesh,
                        floatingGroup: mesh.userData.floatingGroup,
                        wasVisible: true
                    };
                }
                if (mesh.name === 'campfire') {
                    // Store the Campfire instance reference for clean single-point animation
                    this._animatedCache.campfires.push({
                        instance: mesh.userData.campfireInstance, // The actual Campfire class instance
                        position: { x: mesh.position.x, z: mesh.position.z }
                    });
                }
                if (mesh.name === 'christmas_tree' && mesh.userData.treeUpdate) {
                    this._animatedCache.christmasTrees.push(mesh);
                }
                if (mesh.name === 'nightclub' && mesh.userData.nightclubUpdate) {
                    this._animatedCache.nightclubs.push(mesh);
                    // Cache nightclub sign for visibility culling
                    const sign = mesh.getObjectByName('nightclub_title_sign');
                    if (sign) {
                        this._cullCache.nightclubSign = { sprite: sign, parentMesh: mesh, wasVisible: true };
                    }
                }
                // Casino exterior animations (Vegas-style lights, slot machines, roulette, etc.)
                if (mesh.name === 'casino' && mesh.userData.update) {
                    this._animatedCache.casinos.push(mesh);
                    // Cache casino sign for visibility culling
                    const casinoSign = mesh.getObjectByName('casino_title_sign');
                    if (casinoSign) {
                        this._cullCache.casinoSign = { sprite: casinoSign, parentMesh: mesh, wasVisible: true };
                    }
                }
                // Floating title signs - cache for visibility culling
                if (mesh.name === 'floating_title' && mesh.userData.floatingSign) {
                    const sprite = mesh.userData.floatingSign;
                    this._animatedCache.floatingSigns.push({
                        sprite: sprite,
                        baseY: mesh.userData.floatingSignBaseY
                    });
                    // Also cache for visibility culling
                    this._cullCache.floatingTitles.push({
                        sprite: sprite,
                        parentMesh: mesh,
                        wasVisible: true
                    });
                }
                // Billboard/highway signs - cache just the ADVERT PLANE for visibility culling
                // Keep billboard structure (poles, frame) always visible - only hide the textured ad
                if (mesh.name === 'billboard') {
                    mesh.traverse(child => {
                        if (child.userData?.isBanner) {
                            this._cullCache.billboardAdverts.push({
                                advertMesh: child,
                                parentPos: mesh.position,
                                wasVisible: true
                            });
                        }
                    });
                }
                // Street light strings (Christmas lights between lamp posts)
                if (mesh.name === 'light_string' && mesh.userData.streetLightBulbs) {
                    this._animatedCache.streetLightStrings.push({
                        bulbs: mesh.userData.streetLightBulbs
                    });
                }
            });
            // SKNY Igloos stored separately during spawn
            if (this.sknyIgloos) {
                this._animatedCache.sknyIgloos = this.sknyIgloos;
            }
        }
        
        this._animatedCache.frameCounter++;
        const frame = this._animatedCache.frameCounter;
        
        // Distance-based animation culling thresholds (squared for performance)
        const ANIMATION_DISTANCE_SQ = 80 * 80; // Skip detailed animations beyond 80 units
        const px = playerPos?.x || 0;
        const pz = playerPos?.z || 0;
        
        // Nightclub animations - distance culled like other props for performance
        this._animatedCache.nightclubs.forEach(mesh => {
            if (mesh.userData.nightclubUpdate) {
                // Distance check for nightclub
                const dx = px - mesh.position.x;
                const dz = pz - mesh.position.z;
                if (dx * dx + dz * dz < ANIMATION_DISTANCE_SQ) {
                    mesh.userData.nightclubUpdate(time);
                }
            }
        });
        
        // Casino exterior animations - every 2nd frame with distance check
        if (frame % 2 === 0) {
            
            // Casino exterior animations - Vegas marquee, slot machines, searchlights, etc.
            this._animatedCache.casinos.forEach(mesh => {
                if (mesh.userData.update) {
                    // Distance check for casino
                    const dx = px - mesh.position.x;
                    const dz = pz - mesh.position.z;
                    if (dx * dx + dz * dz < ANIMATION_DISTANCE_SQ) {
                        mesh.userData.update(time, delta);
                    }
                }
            });
            
            // SKNY Igloo animations - same timing as nightclubs
            this._animatedCache.sknyIgloos.forEach(sknyProp => {
                if (sknyProp.update) {
                    sknyProp.update(time);
                }
            });
            
            // Wardrobe igloo floating cosmetics animation - DISTANCE CULLED like nightclub
            // NOTE: Do NOT toggle .visible - just skip animation updates
            this._animatedCache.wardrobeIgloos.forEach(({ mesh, floatingGroup, lights }) => {
                // Distance check - skip animation if too far (matches nightclub pattern)
                if (mesh) {
                    const dx = px - mesh.position.x;
                    const dz = pz - mesh.position.z;
                    if (dx * dx + dz * dz > ANIMATION_DISTANCE_SQ) {
                        return; // Skip animation, do NOT toggle visibility
                    }
                }
                
                if (floatingGroup) {
                    // Rotate each floating item in its orbit
                    floatingGroup.children.forEach((orbit, index) => {
                        const speed = orbit.userData.orbitSpeed || 0.5;
                        const yOffset = orbit.userData.yOffset || 0;
                        
                        // Rotate around center
                        orbit.rotation.y = time * speed + (index * Math.PI * 0.5);
                        
                        // Gentle vertical bobbing
                        orbit.position.y = yOffset + Math.sin(time * 2 + index) * 0.3;
                        
                        // Make each item spin on its own axis
                        if (orbit.children[0]) {
                            orbit.children[0].rotation.y = time * 2;
                            orbit.children[0].rotation.x = Math.sin(time + index) * 0.2;
                        }
                    });
                    
                    // Pulse the entire floating group
                    const pulse = 1 + Math.sin(time * 1.5) * 0.05;
                    floatingGroup.scale.setScalar(pulse);
                }
                
                // Animate lights
                if (lights) {
                    // Pulse purple light
                    if (lights.purpleLight) {
                        lights.purpleLight.intensity = 2 + Math.sin(time * 3) * 0.5;
                    }
                    // Pulse cyan light (offset)
                    if (lights.cyanLight) {
                        lights.cyanLight.intensity = 2 + Math.sin(time * 3 + Math.PI) * 0.5;
                    }
                    // Ground glow pulse
                    if (lights.groundGlow) {
                        lights.groundGlow.intensity = 1.5 + Math.sin(time * 2) * 0.3;
                    }
                }
            });
        }
        
        // CAMPFIRE ANIMATION - Single point of maintenance via Campfire.update()
        // Distance-culled for performance
        if (frame % 2 === 0) {
            const CAMPFIRE_ANIM_DIST_SQ = 60 * 60;
            
            this._animatedCache.campfires.forEach(({ instance, position }) => {
                // Distance check
                const cpos = position || { x: TownCenter.CENTER, z: TownCenter.CENTER };
                const cdx = px - cpos.x;
                const cdz = pz - cpos.z;
                if (cdx * cdx + cdz * cdz > CAMPFIRE_ANIM_DIST_SQ) return;
                
                // Call the Campfire's own update method - ONE source of truth
                if (instance && instance.update) {
                    instance.update(time, delta);
                }
            });
        }
        
        // OPTIMIZED: Christmas trees every 12th frame (was every 6th)
        if (frame % 12 === 0) {
            this._animatedCache.christmasTrees.forEach(mesh => {
                if (mesh.userData.treeUpdate) mesh.userData.treeUpdate(time, nightFactor);
            });
        }
        
        // Garden park animations (butterflies, fountain) every 2nd frame
        if (frame % 2 === 0 && this.parkInstance) {
            this.parkInstance.animate(delta);
        }
        
        // Floating signs - gentle bobbing animation every 2nd frame - DISTANCE CULLED
        // NOTE: Do NOT toggle .visible - that causes GPU recompilation freezes!
        // Instead, just skip animation updates like nightclub does
        const SIGN_ANIM_DISTANCE_SQ = 80 * 80;
        if (frame % 2 === 0) {
            this._animatedCache.floatingSigns.forEach(({ sprite, baseY }) => {
                // Distance check - skip animation if too far (DO NOT TOGGLE VISIBILITY)
                const dx = px - sprite.position.x;
                const dz = pz - sprite.position.z;
                const distSq = dx * dx + dz * dz;
                
                // Just skip animation if far away - no visibility toggle
                if (distSq > SIGN_ANIM_DISTANCE_SQ) {
                    return;
                }
                
                // Gentle floating bob
                sprite.position.y = baseY + Math.sin(time * 1.5) * 0.3;
                // Subtle scale pulse
                const pulse = 1 + Math.sin(time * 2) * 0.02;
                sprite.scale.set(10 * pulse, 2.5 * pulse, 1);
            });
        }
        
        // Street light strings - twinkle animation for Christmas ambiance
        if (frame % 3 === 0 && this._animatedCache.streetLightStrings.length > 0) {
            this._animatedCache.streetLightStrings.forEach(({ bulbs }) => {
                bulbs.forEach(bulb => {
                    const idx = bulb.userData.lightIndex;
                    const phase = bulb.userData.twinklePhase;
                    const speed = bulb.userData.twinkleSpeed;
                    
                    // Chase pattern - lights turn on/off in sequence
                    const chasePhase = (time * 2 + phase) % (Math.PI * 2);
                    const isOn = Math.sin(chasePhase) > -0.3;
                    
                    // Twinkle intensity variation
                    const twinkle = Math.sin(time * speed + phase);
                    
                    // Occasional sparkle (deterministic pseudo-random)
                    const sparkleTime = Math.floor(time * 3 + idx * 0.5);
                    const sparkleHash = Math.sin(sparkleTime * 12.9898 + idx * 78.233) * 43758.5453;
                    const sparkle = (sparkleHash % 1) > 0.9 ? 1.5 : 0;
                    
                    if (bulb.material && bulb.material.emissiveIntensity !== undefined) {
                        if (isOn) {
                            // Light is ON - glow with twinkle
                            const baseGlow = 1.5 + nightFactor * 1.0;
                            bulb.material.emissiveIntensity = baseGlow + twinkle * 0.5 + sparkle;
                        } else {
                            // Light is OFF - dim but not completely dark
                            bulb.material.emissiveIntensity = 0.3;
                        }
                    }
                });
            });
        }
        
        // ==================== VISIBILITY CULLING (every 15 frames to avoid freeze) ====================
        // Only update visibility when state actually changes - prevents GPU shader recompilation freeze
        // Uses hysteresis: hide at HIDE_DIST, show at SHOW_DIST (prevents flickering at boundary)
        // Billboard adverts visible from further (100 units), other UI from closer (75 units)
        if (frame % 15 === 0 && this._cullCache) {
            const HIDE_DIST_SQ = 75 * 75;           // Hide UI when > 75 units away
            const SHOW_DIST_SQ = 60 * 60;           // Show UI when < 60 units away
            const BILLBOARD_HIDE_SQ = 120 * 120;    // Billboards visible from further (120 units)
            const BILLBOARD_SHOW_SQ = 100 * 100;    // Show billboard when < 100 units
            
            // Helper: only toggle visibility if state changed
            const updateVisibility = (obj, shouldShow, cacheEntry) => {
                if (!obj) return;
                if (shouldShow && !cacheEntry.wasVisible) {
                    obj.visible = true;
                    cacheEntry.wasVisible = true;
                } else if (!shouldShow && cacheEntry.wasVisible) {
                    obj.visible = false;
                    cacheEntry.wasVisible = false;
                }
            };
            
            // Billboard ADVERTS only (structure stays visible, just hide the textured plane)
            // Billboards visible from FURTHER away than other UI elements
            this._cullCache.billboardAdverts.forEach(entry => {
                const dx = px - entry.parentPos.x;
                const dz = pz - entry.parentPos.z;
                const distSq = dx * dx + dz * dz;
                
                const shouldShow = entry.wasVisible 
                    ? distSq < BILLBOARD_HIDE_SQ 
                    : distSq < BILLBOARD_SHOW_SQ;
                updateVisibility(entry.advertMesh, shouldShow, entry);
            });
            
            // Nightclub title sign (sprite - safe to cull)
            if (this._cullCache.nightclubSign) {
                const entry = this._cullCache.nightclubSign;
                const dx = px - entry.parentMesh.position.x;
                const dz = pz - entry.parentMesh.position.z;
                const distSq = dx * dx + dz * dz;
                
                const shouldShow = entry.wasVisible 
                    ? distSq < HIDE_DIST_SQ 
                    : distSq < SHOW_DIST_SQ;
                updateVisibility(entry.sprite, shouldShow, entry);
            }
            
            // Casino title sign (sprite - safe to cull)
            if (this._cullCache.casinoSign) {
                const entry = this._cullCache.casinoSign;
                const dx = px - entry.parentMesh.position.x;
                const dz = pz - entry.parentMesh.position.z;
                const distSq = dx * dx + dz * dz;
                
                const shouldShow = entry.wasVisible 
                    ? distSq < HIDE_DIST_SQ 
                    : distSq < SHOW_DIST_SQ;
                updateVisibility(entry.sprite, shouldShow, entry);
            }
            
            // Floating titles (ARCADE, FISHING zones - sprites, safe to cull)
            this._cullCache.floatingTitles.forEach(entry => {
                const dx = px - entry.parentMesh.position.x;
                const dz = pz - entry.parentMesh.position.z;
                const distSq = dx * dx + dz * dz;
                
                const shouldShow = entry.wasVisible 
                    ? distSq < HIDE_DIST_SQ 
                    : distSq < SHOW_DIST_SQ;
                updateVisibility(entry.sprite, shouldShow, entry);
            });
            
            // Wardrobe igloo floating cosmetics
            if (this._cullCache.wardrobeGroup) {
                const entry = this._cullCache.wardrobeGroup;
                const dx = px - entry.mesh.position.x;
                const dz = pz - entry.mesh.position.z;
                const distSq = dx * dx + dz * dz;
                
                const shouldShow = entry.wasVisible 
                    ? distSq < HIDE_DIST_SQ 
                    : distSq < SHOW_DIST_SQ;
                updateVisibility(entry.floatingGroup, shouldShow, entry);
            }
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
        this._cullCache = null;
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


