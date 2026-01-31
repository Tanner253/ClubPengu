/**
 * SnowFortsZone - Eastern expansion zone containing Snow Forts and Ice Rink/Stadium
 * 
 * This zone is EAST of Town Center (x = 220-440, z = 0-220)
 * Uses the same visual style as TownCenter for consistency
 * 
 * Features:
 * - Snow Forts battle area (under construction)
 * - Ice Rink / Stadium (under construction)
 * - Snowy park with benches and trees
 * - Gravel paths matching Town Center style
 */

import CollisionSystem from '../engine/CollisionSystem';
import { createProp, PROP_TYPES } from '../props';

/**
 * Helper to attach collision and trigger data to prop meshes
 * (Same pattern as TownCenter)
 */
function attachPropData(prop, mesh) {
    const collision = prop.getCollisionBounds && prop.getCollisionBounds();
    if (collision) {
        mesh.userData.collision = {
            type: 'box',
            size: { x: collision.maxX - collision.minX, z: collision.maxZ - collision.minZ },
            height: collision.height
        };
    }
    
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
            snapPoints: trigger.snapPoints,
            maxOccupants: trigger.maxOccupants,
            data: trigger.data
        };
    }
    
    return mesh;
}

class SnowFortsZone {
    static ID = 'snow_forts_zone';
    static NAME = 'Snow Forts';
    
    // Zone dimensions (same as town)
    static ZONE_SIZE = 220;
    static CENTER = SnowFortsZone.ZONE_SIZE / 2; // 110
    
    // World offset - this zone is EAST of town
    static WORLD_OFFSET_X = 220; // Starts where town ends
    static WORLD_OFFSET_Z = 0;   // Same Z as town
    
    constructor(THREE) {
        this.THREE = THREE;
        this.collisionSystem = new CollisionSystem(
            SnowFortsZone.ZONE_SIZE,
            SnowFortsZone.ZONE_SIZE,
            4
        );
        
        this.meshes = [];
        this.lights = [];
        this.groundPlane = null;
        this.campfires = [];
        this.furniture = []; // Sittable furniture (benches, logs) for interaction
    }
    
    /**
     * Get world coordinates from zone-local coordinates
     */
    toWorldCoords(localX, localZ) {
        return {
            x: localX + SnowFortsZone.WORLD_OFFSET_X,
            z: localZ + SnowFortsZone.WORLD_OFFSET_Z
        };
    }
    
    /**
     * Check if world coordinates are within this zone
     */
    isInZone(worldX, worldZ) {
        const localX = worldX - SnowFortsZone.WORLD_OFFSET_X;
        const localZ = worldZ - SnowFortsZone.WORLD_OFFSET_Z;
        return localX >= 0 && localX < SnowFortsZone.ZONE_SIZE &&
               localZ >= 0 && localZ < SnowFortsZone.ZONE_SIZE;
    }
    
    /**
     * Spawn the zone into the scene
     */
    spawn(scene) {
        const THREE = this.THREE;
        const SIZE = SnowFortsZone.ZONE_SIZE;
        const C = SnowFortsZone.CENTER;
        const OX = SnowFortsZone.WORLD_OFFSET_X;
        const OZ = SnowFortsZone.WORLD_OFFSET_Z;
        
        this.cleanup();
        
        // ==================== GROUND PLANE (matching TownCenter style) ====================
        this._createGroundPlane(scene, SIZE, C, OX, OZ);
        
        // ==================== GRAVEL PATHS (matching TownCenter style) ====================
        this._createPaths(scene, SIZE, C, OX, OZ);
        
        // ==================== SNOW FORTS AREA ====================
        this._createSnowForts(scene, SIZE, C, OX, OZ);
        
        // ==================== ICE RINK / STADIUM ====================
        this._createIceRink(scene, SIZE, C, OX, OZ);
        
        // ==================== ENVIRONMENT & POIS ====================
        this._createEnvironment(scene, SIZE, C, OX, OZ);
        
        // ==================== LIGHTING ====================
        this._createLighting(scene, SIZE, C, OX, OZ);
        
        // ==================== ZONE BOUNDARY WALLS ====================
        this._createBoundaryWalls(SIZE, C);
        
        console.log(`⛄ Snow Forts Zone spawned: ${this.meshes.length} meshes, ${this.lights.length} lights`);
    }
    
    _createGroundPlane(scene, SIZE, C, OX, OZ) {
        const THREE = this.THREE;
        
        // Use the SAME ice colors as VoxelWorld
        const ICE_COLORS = ['#B8D4E8', '#A8C8DC', '#C0D8EC', '#98BCD0', '#B0D0E4'];
        
        // NO west extension - zones touch end-to-end, no overlap
        const extendWest = 0;
        const extendOther = 30; // Extend other edges under mountains
        
        const iceGeo = new THREE.PlaneGeometry(SIZE + extendOther, SIZE + extendOther * 2, 24, 24);
        iceGeo.rotateX(-Math.PI / 2);
        
        // Add vertex color variation (same as VoxelWorld)
        const colors = [];
        const positions = iceGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            
            const noise = Math.sin(x * 0.1) * Math.cos(z * 0.1) + 
                          Math.sin(x * 0.05 + 1) * Math.cos(z * 0.07) * 0.5;
            const colorIndex = Math.floor((noise + 1) * 2.5) % ICE_COLORS.length;
            const color = new THREE.Color(ICE_COLORS[colorIndex]);
            
            colors.push(color.r, color.g, color.b);
        }
        iceGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const iceMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.85,
            metalness: 0
        });
        
        this.groundPlane = new THREE.Mesh(iceGeo, iceMat);
        // Position: centered on zone, shifted slightly for overlap
        this.groundPlane.position.set(
            OX + SIZE / 2 + extendOther / 2,
            0,
            OZ + SIZE / 2
        );
        this.groundPlane.receiveShadow = true;
        this.groundPlane.name = 'snow_forts_ground';
        scene.add(this.groundPlane);
        this.meshes.push(this.groundPlane);
    }
    
    _createPaths(scene, SIZE, C, OX, OZ) {
        // ========== T-SHAPED PATH LAYOUT (NO OVERLAPS) ==========
        // Path width = 32 (matches TownCenter T-bar)
        // TownCenter T-bar is at z = 65 (C - 45)
        
        const PATH_WIDTH = 32;
        const PATH_HALF = 16;
        
        // 1. Horizontal path from Town (x=0) to intersection edge (x=54)
        // Does NOT overlap with vertical paths
        this._createGravelPath(scene, OX + 27, OZ + 65, 54, PATH_WIDTH);
        
        // 2. T-intersection square (where paths meet)
        // x from 54 to 86, z from 49 to 81
        this._createGravelPath(scene, OX + 70, OZ + 65, PATH_WIDTH, PATH_WIDTH);
        
        // 3. Vertical path NORTH from intersection edge (z=49) to Snow Forts (z=4)
        // Centered at z=26.5, depth=45
        this._createGravelPath(scene, OX + 70, OZ + 26, PATH_WIDTH, 46);
        
        // 4. Vertical path SOUTH from intersection edge (z=81) to Ice Rink (z=185)
        // Centered at z=133, depth=104
        this._createGravelPath(scene, OX + 70, OZ + 133, PATH_WIDTH, 104);
        
        // 5. Path extension SOUTH from Ice Rink to Forest zone border (z=185-220)
        // This connects to Forest Trails zone
        this._createGravelPath(scene, OX + 70, OZ + 205, PATH_WIDTH, 35);
    }
    
    // Create gravel path matching TownCenter's style exactly
    _createGravelPath(scene, x, z, width, depth) {
        const THREE = this.THREE;
        
        // Create procedural canvas texture for blue gravel ice (same as TownCenter)
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
            '#0d2633', '#1e4455', '#2a5566', '#163344', '#0f2d3d',
            '#254d5e', '#1b404f', '#223d4c', '#2d5968'
        ];
        
        for (let i = 0; i < 3000; i++) {
            const gx = Math.random() * size;
            const gy = Math.random() * size;
            const gSize = 1 + Math.random() * 3;
            ctx.fillStyle = gravelColors[Math.floor(Math.random() * gravelColors.length)];
            ctx.beginPath();
            ctx.arc(gx, gy, gSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add subtle ice cracks
        ctx.strokeStyle = '#3a6070';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * size, Math.random() * size);
            for (let j = 0; j < 3; j++) {
                ctx.lineTo(
                    ctx.canvas.width * Math.random(),
                    ctx.canvas.height * Math.random()
                );
            }
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(width / 20, depth / 20);
        
        const pathGeo = new THREE.PlaneGeometry(width, depth);
        pathGeo.rotateX(-Math.PI / 2);
        
        const pathMat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const path = new THREE.Mesh(pathGeo, pathMat);
        path.position.set(x, 0.02, z);
        path.receiveShadow = true;
        path.name = 'gravel_path';
        scene.add(path);
        this.meshes.push(path);
    }
    
    _createSnowForts(scene, SIZE, C, OX, OZ) {
        const THREE = this.THREE;
        // Snow Forts at NORTH end of zone, centered on path (x=70)
        // Vertical north path ends at z=4, so forts are north of that (z < 4)
        const fortsX = OX + 70;   // Centered on vertical path x
        const fortsZ = OZ + 12;   // North of path end
        
        // Construction site sign - south of the forts, facing the path
        this._createConstructionSign(scene, fortsX, OZ + 2, 'SNOW FORTS', 'Battle Arena - Coming Soon!');
        
        // Partial snow fort walls (under construction) - OFF the path (x < 54 or x > 86)
        this._createSnowWall(scene, OX + 40, fortsZ - 5, 15, 4, 3);   // Left wall (west of path)
        this._createSnowWall(scene, OX + 100, fortsZ - 5, 15, 3, 3);  // Right wall (east of path)
        this._createSnowWall(scene, fortsX, OZ + 5, 12, 2.5, 3);      // Back wall (north edge)
        
        // Scaffolding at corners - off the path
        this._createScaffolding(scene, OX + 35, fortsZ, 5, 4);
        this._createScaffolding(scene, OX + 105, fortsZ, 5, 4);
        
        // Snow piles (construction materials) - off the path
        this._createSnowPile(scene, OX + 25, fortsZ + 5, 2);
        this._createSnowPile(scene, OX + 115, fortsZ + 5, 1.8);
        
        // Construction barriers - at edge of path
        this._createConstructionBarrier(scene, OX + 52, OZ + 30);
        this._createConstructionBarrier(scene, OX + 88, OZ + 30);
        
        // Add collision for snow walls (local coords)
        this.collisionSystem.addCollider(40, 7, { type: 'box', size: { x: 4, z: 15 }, height: 4 }, 1, { name: 'snow_wall_l' });
        this.collisionSystem.addCollider(100, 7, { type: 'box', size: { x: 4, z: 15 }, height: 4 }, 1, { name: 'snow_wall_r' });
    }
    
    _createIceRink(scene, SIZE, C, OX, OZ) {
        const THREE = this.THREE;
        // Ice Rink at SOUTH end of zone, centered on path (x=70)
        // Vertical south path ends at z=185, so rink is below that
        const rinkX = OX + 70;   // Centered on vertical path x
        const rinkZ = OZ + 195;  // South area
        const rinkWidth = 60;
        const rinkDepth = 40;
        
        // Construction sign - north of the rink, facing north toward the path (rotated 180)
        this._createConstructionSign(scene, rinkX, OZ + 187, 'ICE RINK', 'Stadium - Coming Soon!', Math.PI);
        
        // Smooth ice rink surface (further south, past the path end)
        const rinkGeo = new THREE.PlaneGeometry(rinkWidth, rinkDepth);
        rinkGeo.rotateX(-Math.PI / 2);
        const rinkMat = new THREE.MeshStandardMaterial({
            color: 0xCCE8F4,
            roughness: 0.05,
            metalness: 0.2
        });
        const rink = new THREE.Mesh(rinkGeo, rinkMat);
        rink.position.set(rinkX, 0.03, rinkZ + 5);
        rink.receiveShadow = true;
        scene.add(rink);
        this.meshes.push(rink);
        
        // Rink markings
        this._createRinkMarkings(scene, rinkX, rinkZ + 5, rinkWidth, rinkDepth);
        
        // Rink border walls
        this._createRinkBorder(scene, rinkX, rinkZ + 5, rinkWidth, rinkDepth);
        
        // Scaffolding for bleachers (under construction) - OFF the path (x < 54 or x > 86)
        this._createScaffolding(scene, OX + 35, rinkZ + 5, 6, 5);
        this._createScaffolding(scene, OX + 105, rinkZ + 5, 6, 5);
        
        // Partial hockey goals
        this._createHockeyGoal(scene, rinkX - 25, rinkZ + 5, Math.PI / 2);
        this._createHockeyGoal(scene, rinkX + 25, rinkZ + 5, -Math.PI / 2);
        
        // Construction materials near rink - off the path
        this._createWoodPile(scene, OX + 25, rinkZ);
        this._createWoodPile(scene, OX + 115, rinkZ);
        
        // Ice rink has no collision - players can walk freely on the ice
    }
    
    _createEnvironment(scene, SIZE, C, OX, OZ) {
        const THREE = this.THREE;
        
        // ========== PATH BOUNDARIES (NO PROPS HERE) ==========
        // Horizontal path: x=0-54, z=49-81
        // Intersection: x=54-86, z=49-81
        // Vertical north: x=54-86, z=4-49
        // Vertical south: x=54-86, z=81-185
        // SAFE AREAS: x<54 or x>86 (when not on horizontal), z<49 or z>81 (when on horizontal)
        
        // ==================== PINE TREES (EDGES ONLY - away from paths) ====================
        const treePositions = [
            // West side (x < 50, avoid z 49-81)
            { x: 20, z: 25, size: 1.0 }, { x: 35, z: 35, size: 0.9 },
            { x: 15, z: 90, size: 0.8 }, { x: 25, z: 120, size: 1.0 },
            { x: 20, z: 160, size: 0.9 }, { x: 35, z: 190, size: 1.1 },
            // East side (x > 90)
            { x: 120, z: 25, size: 0.95 }, { x: 140, z: 40, size: 1.0 },
            { x: 150, z: 90, size: 0.85 }, { x: 130, z: 120, size: 0.9 },
            { x: 160, z: 160, size: 1.0 }, { x: 140, z: 190, size: 0.85 },
            // Far edges
            { x: 190, z: 50, size: 0.9 }, { x: 200, z: 110, size: 1.0 },
            { x: 195, z: 170, size: 0.85 }, { x: 10, z: 200, size: 1.1 },
        ];
        
        treePositions.forEach(pos => {
            try {
                const treeProp = createProp(THREE, null, PROP_TYPES.PINE_TREE, 0, 0, 0, { size: pos.size });
                const mesh = attachPropData(treeProp, treeProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                scene.add(mesh);
                this.meshes.push(mesh);
            } catch (e) {
                console.warn('Failed to create tree at', pos.x, pos.z);
            }
        });
        
        // ==================== BENCHES (along path edges, NOT on paths) ====================
        const benchPositions = [
            // West of horizontal path (x < 54, z near 49 or 81)
            { x: 20, z: 46, rot: Math.PI },    // South of path, face north
            { x: 40, z: 84, rot: 0 },          // North of path, face south
            // East of intersection (x > 86)
            { x: 92, z: 55, rot: -Math.PI/2 }, // East of intersection, face west
            { x: 92, z: 75, rot: -Math.PI/2 }, // East of intersection, face west
            // East of vertical paths (x > 86, along south path)
            { x: 92, z: 110, rot: -Math.PI/2 }, // East of south path
            { x: 92, z: 150, rot: -Math.PI/2 }, // East of south path
            // West of vertical paths (x < 54)
            { x: 48, z: 110, rot: Math.PI/2 }, // West of south path
            { x: 48, z: 150, rot: Math.PI/2 }, // West of south path
        ];
        
        const benchSnapPoints = [{ x: -0.6, z: 0 }, { x: 0, z: 0 }, { x: 0.6, z: 0 }];
        
        benchPositions.forEach(pos => {
            try {
                const benchProp = createProp(THREE, null, PROP_TYPES.BENCH, 0, 0, 0, { style: 'snow' });
                const mesh = attachPropData(benchProp, benchProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                mesh.rotation.y = pos.rot;
                scene.add(mesh);
                this.meshes.push(mesh);
                
                // Add to furniture array for direct interaction checking (like TownCenter benches)
                this.furniture.push({
                    type: 'bench',
                    position: { x: OX + pos.x, z: OZ + pos.z },
                    rotation: pos.rot,
                    seatHeight: 0.8,
                    platformHeight: 0,
                    snapPoints: benchSnapPoints,
                    interactionRadius: 2.5
                });
            } catch (e) {
                console.warn('Failed to create bench at', pos.x, pos.z);
            }
        });
        
        // ==================== LAMP POSTS (at path edges, not ON paths) ====================
        const lampPositions = [
            // West of intersection (x < 54)
            { x: 50, z: 50 },
            { x: 50, z: 80 },
            // East of intersection (x > 86)
            { x: 90, z: 50 },
            { x: 90, z: 80 },
            // Along south path edges
            { x: 50, z: 130 },
            { x: 90, z: 130 },
            { x: 50, z: 170 },
            { x: 90, z: 170 },
        ];
        
        lampPositions.forEach(pos => {
            try {
                const lampProp = createProp(THREE, null, PROP_TYPES.LAMP_POST, 0, 0, 0, {});
                const mesh = attachPropData(lampProp, lampProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                scene.add(mesh);
                this.meshes.push(mesh);
                
                const light = new THREE.PointLight(0xFFDD88, 0.4, 20);
                light.position.set(OX + pos.x, 5, OZ + pos.z);
                scene.add(light);
                this.lights.push(light);
            } catch (e) {
                console.warn('Failed to create lamp at', pos.x, pos.z);
            }
        });
        
        // ==================== TRASH CANS (at path edges) ====================
        const trashPositions = [
            { x: 25, z: 46 },   // Near bench west
            { x: 95, z: 55 },   // Near bench east
            { x: 48, z: 105 },  // Along south path
        ];
        
        trashPositions.forEach(pos => {
            try {
                const trashProp = createProp(THREE, null, PROP_TYPES.TRASH_CAN, 0, 0, 0, { withLid: true });
                const mesh = attachPropData(trashProp, trashProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                scene.add(mesh);
                this.meshes.push(mesh);
            } catch (e) {
                console.warn('Failed to create trash can at', pos.x, pos.z);
            }
        });
        
        // ==================== ICE SCULPTURES (in open areas, away from paths) ====================
        const sculpturePositions = [
            { x: 140, z: 65, type: 'fish' },     // East area
            { x: 25, z: 130, type: 'penguin' },  // West area
        ];
        
        sculpturePositions.forEach(pos => {
            try {
                const sculptureProp = createProp(THREE, null, PROP_TYPES.ICE_SCULPTURE, 0, 0, 0, { sculptureType: pos.type });
                const mesh = attachPropData(sculptureProp, sculptureProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                scene.add(mesh);
                this.meshes.push(mesh);
            } catch (e) {
                console.warn('Failed to create ice sculpture at', pos.x, pos.z);
            }
        });
        
        // ==================== SNOWMEN (scattered in open areas) ====================
        const snowmanPositions = [
            { x: 130, z: 30 },    // Northeast
            { x: 30, z: 100 },    // West  
            { x: 150, z: 130 },   // East
            { x: 25, z: 175 },    // Southwest
        ];
        
        snowmanPositions.forEach(pos => {
            try {
                const snowmanProp = createProp(THREE, null, PROP_TYPES.SNOWMAN, 0, 0, 0, {});
                const mesh = attachPropData(snowmanProp, snowmanProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                mesh.rotation.y = Math.random() * Math.PI * 2;
                scene.add(mesh);
                this.meshes.push(mesh);
            } catch (e) {
                console.warn('Failed to create snowman at', pos.x, pos.z);
            }
        });
        
        // ==================== CONSTRUCTION MATERIALS (near construction sites, off paths) ====================
        const barrelPositions = [
            { x: 30, z: 20 },   // Near snow forts west
            { x: 110, z: 20 },  // Near snow forts east
        ];
        
        barrelPositions.forEach(pos => {
            try {
                const barrelProp = createProp(THREE, null, PROP_TYPES.BARREL, 0, 0, 0, { size: 'medium' });
                const mesh = attachPropData(barrelProp, barrelProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                scene.add(mesh);
                this.meshes.push(mesh);
            } catch (e) {
                console.warn('Failed to create barrel at', pos.x, pos.z);
            }
        });
        
        const cratePositions = [
            { x: 30, z: 190 },  // Near rink west
            { x: 110, z: 190 }, // Near rink east
        ];
        
        cratePositions.forEach(pos => {
            try {
                const crateProp = createProp(THREE, null, PROP_TYPES.CRATE, 0, 0, 0, { size: 'medium' });
                const mesh = attachPropData(crateProp, crateProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                scene.add(mesh);
                this.meshes.push(mesh);
            } catch (e) {
                console.warn('Failed to create crate at', pos.x, pos.z);
            }
        });
        
        // ==================== FIRE HYDRANTS (at path corners, off path) ====================
        const hydrantPositions = [
            { x: 15, z: 46 },   // West of horizontal
            { x: 95, z: 84 },   // East of intersection
        ];
        
        hydrantPositions.forEach(pos => {
            try {
                const hydrantProp = createProp(THREE, null, PROP_TYPES.FIRE_HYDRANT, 0, 0, 0, { color: 0xCC2222 });
                const mesh = attachPropData(hydrantProp, hydrantProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                scene.add(mesh);
                this.meshes.push(mesh);
            } catch (e) {
                console.warn('Failed to create hydrant at', pos.x, pos.z);
            }
        });
        
        // ==================== FROZEN POND (in west open area) ====================
        this._createFrozenPond(scene, OX + 25, OZ + 140, 10);
        
        // ==================== CAMPFIRE with LOG SEATS (east open area, x > 86) ====================
        const campfireX = 140;
        const campfireZ = 100;
        
        try {
            const campfireProp = createProp(THREE, null, PROP_TYPES.CAMPFIRE, 0, 0, 0, {});
            const campfireMesh = attachPropData(campfireProp, campfireProp.group);
            campfireMesh.position.set(OX + campfireX, 0, OZ + campfireZ);
            campfireMesh.name = 'campfire';
            // Store campfire instance for animation
            campfireMesh.userData.campfireInstance = campfireProp;
            scene.add(campfireMesh);
            this.meshes.push(campfireMesh);
            
            // Store reference for update loop
            this.campfires = this.campfires || [];
            this.campfires.push({
                instance: campfireProp,
                position: { x: OX + campfireX, z: OZ + campfireZ }
            });
            
            const fireLight = new THREE.PointLight(0xFF6622, 0.6, 15);
            fireLight.position.set(OX + campfireX, 1, OZ + campfireZ);
            scene.add(fireLight);
            this.lights.push(fireLight);
        } catch (e) {
            console.warn('Failed to create campfire');
        }
        
        // Log seats around campfire
        const logPositions = [
            { x: campfireX - 5, z: campfireZ + 4, rot: 0.3 },
            { x: campfireX + 5, z: campfireZ + 4, rot: -0.3 },
            { x: campfireX, z: campfireZ - 6, rot: Math.PI },
        ];
        
        logPositions.forEach(pos => {
            try {
                const logProp = createProp(THREE, null, PROP_TYPES.LOG_SEAT, 0, 0, 0, {});
                const mesh = attachPropData(logProp, logProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                mesh.rotation.y = pos.rot;
                scene.add(mesh);
                this.meshes.push(mesh);
                
                // Add to furniture array for direct interaction checking
                this.furniture.push({
                    type: 'log',
                    position: { x: OX + pos.x, z: OZ + pos.z },
                    rotation: pos.rot,
                    seatHeight: 0.5,
                    platformHeight: 0,
                    snapPoints: [{ x: -0.6, z: 0 }, { x: 0.6, z: 0 }],
                    interactionRadius: 2.5
                });
            } catch (e) {
                console.warn('Failed to create log seat');
            }
        });
        
        // ==================== INFORMATION BOARD (at zone entrance, facing west toward Town) ====================
        this._createInfoBoard(scene, OX + 15, OZ + 65, 'SNOW FORTS ZONE\n\n⛄ Coming Soon:\n• Snow Ball Battles\n• Ice Hockey\n• Snowman Building', Math.PI);
    }
    
    _createLighting(scene, SIZE, C, OX, OZ) {
        const THREE = this.THREE;
        
        // Ambient zone lighting
        const ambient = new THREE.AmbientLight(0xCCDDFF, 0.3);
        scene.add(ambient);
        this.lights.push(ambient);
    }
    
    _createBoundaryWalls(SIZE, C) {
        const MARGIN = 5;
        
        // North wall (full)
        this.collisionSystem.addCollider(C, MARGIN, { type: 'box', size: { x: SIZE, z: 4 }, height: 50 }, 1, { name: 'wall_n' });
        
        // South wall - GAP for Forest connection (local x: 60-90, matching path at x=70)
        // Left section (x: 0-60)
        this.collisionSystem.addCollider(30, SIZE - MARGIN, { type: 'box', size: { x: 60, z: 4 }, height: 50 }, 1, { name: 'wall_s_left' });
        // Right section (x: 90-220)
        this.collisionSystem.addCollider(155, SIZE - MARGIN, { type: 'box', size: { x: 130, z: 4 }, height: 50 }, 1, { name: 'wall_s_right' });
        
        // East wall (full - edge of current expansion)
        this.collisionSystem.addCollider(SIZE - MARGIN, C, { type: 'box', size: { x: 4, z: SIZE }, height: 50 }, 1, { name: 'wall_e' });
        
        // WEST WALL - REMOVED
        // No west wall - Town Center is directly connected
        // Players can walk freely between Snow Forts and Town at x=220
    }
    
    // ==================== HELPER METHODS ====================
    
    _createConstructionSign(scene, x, z, mainText, subText, rotation = 0) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Two posts
        const postGeo = new THREE.CylinderGeometry(0.12, 0.15, 4, 8);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        [-1.5, 1.5].forEach(offset => {
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(offset, 2, 0);
            post.castShadow = true;
            group.add(post);
        });
        
        // Yellow sign board
        const boardGeo = new THREE.BoxGeometry(4, 2, 0.15);
        const boardMat = new THREE.MeshStandardMaterial({ color: 0xFFCC00 });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.y = 3.5;
        board.castShadow = true;
        group.add(board);
        
        // Hazard stripes
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        [-0.7, 0.7].forEach(yOff => {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 0.16), stripeMat);
            stripe.position.set(0, 3.5 + yOff, 0.01);
            group.add(stripe);
        });
        
        // Text
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFCC00';
        ctx.fillRect(0, 0, 512, 256);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(mainText, 256, 80);
        ctx.font = '24px Arial';
        ctx.fillText('🚧 UNDER CONSTRUCTION 🚧', 256, 130);
        ctx.font = '20px Arial';
        ctx.fillStyle = '#333333';
        ctx.fillText(subText, 256, 180);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(3.5, 1.8),
            new THREE.MeshBasicMaterial({ map: texture, transparent: true })
        );
        textPlane.position.set(0, 3.5, 0.08);
        group.add(textPlane);
        
        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        scene.add(group);
        this.meshes.push(group);
    }
    
    _createSnowWall(scene, x, z, length, height, width) {
        const THREE = this.THREE;
        const wallGeo = new THREE.BoxGeometry(width, height, length);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xF0F8FF, roughness: 0.9 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(x, height / 2, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        this.meshes.push(wall);
        
        // Rough top (snow chunks)
        for (let i = 0; i < 5; i++) {
            const chunkGeo = new THREE.BoxGeometry(width * 0.8, height * 0.3, length * 0.15);
            const chunk = new THREE.Mesh(chunkGeo, wallMat);
            chunk.position.set(
                x + (Math.random() - 0.5) * 0.5,
                height + 0.2,
                z + (i - 2) * length * 0.2
            );
            chunk.rotation.set(Math.random() * 0.2, Math.random() * 0.2, Math.random() * 0.2);
            scene.add(chunk);
            this.meshes.push(chunk);
        }
    }
    
    _createScaffolding(scene, x, z, width, height) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        
        // Vertical poles
        const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, height, 8);
        [[-width/2, -1], [-width/2, 1], [width/2, -1], [width/2, 1]].forEach(([px, pz]) => {
            const pole = new THREE.Mesh(poleGeo, pipeMat);
            pole.position.set(px, height/2, pz);
            pole.castShadow = true;
            group.add(pole);
        });
        
        // Cross bars and platforms
        for (let h = 2; h < height; h += 2) {
            const barGeo = new THREE.CylinderGeometry(0.05, 0.05, width, 8);
            [-1, 1].forEach(side => {
                const bar = new THREE.Mesh(barGeo, pipeMat);
                bar.rotation.z = Math.PI / 2;
                bar.position.set(0, h, side);
                group.add(bar);
            });
            
            const plankGeo = new THREE.BoxGeometry(width, 0.08, 2);
            const plank = new THREE.Mesh(plankGeo, woodMat);
            plank.position.set(0, h, 0);
            group.add(plank);
        }
        
        group.position.set(x, 0, z);
        scene.add(group);
        this.meshes.push(group);
    }
    
    _createSnowPile(scene, x, z, size) {
        const THREE = this.THREE;
        const pileGeo = new THREE.SphereGeometry(size, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const pileMat = new THREE.MeshStandardMaterial({ color: 0xFAFAFA, roughness: 0.95 });
        const pile = new THREE.Mesh(pileGeo, pileMat);
        pile.position.set(x, 0, z);
        pile.scale.set(1, 0.6, 1);
        pile.receiveShadow = true;
        scene.add(pile);
        this.meshes.push(pile);
    }
    
    _createConstructionBarrier(scene, x, z) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        const barrierGeo = new THREE.BoxGeometry(2, 0.8, 0.2);
        const barrierMat = new THREE.MeshStandardMaterial({ color: 0xFF6600 });
        const barrier = new THREE.Mesh(barrierGeo, barrierMat);
        barrier.position.y = 0.5;
        group.add(barrier);
        
        // White stripes
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        for (let i = 0; i < 3; i++) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.22), stripeMat);
            stripe.position.set(-0.6 + i * 0.6, 0.5, 0);
            group.add(stripe);
        }
        
        // Legs
        const legGeo = new THREE.BoxGeometry(0.08, 0.5, 0.08);
        [-0.8, 0.8].forEach(lx => {
            const leg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
            leg.position.set(lx, 0.25, 0);
            group.add(leg);
        });
        
        group.position.set(x, 0, z);
        scene.add(group);
        this.meshes.push(group);
    }
    
    _createRinkMarkings(scene, x, z, width, depth) {
        const THREE = this.THREE;
        
        // Center red line
        const redMat = new THREE.MeshStandardMaterial({ color: 0xCC0000 });
        const centerLine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, depth - 4), redMat);
        centerLine.position.set(x, 0.04, z);
        scene.add(centerLine);
        this.meshes.push(centerLine);
        
        // Blue lines
        const blueMat = new THREE.MeshStandardMaterial({ color: 0x0066CC });
        [-width/4, width/4].forEach(offset => {
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, depth - 4), blueMat);
            line.position.set(x + offset, 0.04, z);
            scene.add(line);
            this.meshes.push(line);
        });
        
        // Center circle
        const circleGeo = new THREE.RingGeometry(4, 4.3, 32);
        circleGeo.rotateX(-Math.PI / 2);
        const circle = new THREE.Mesh(circleGeo, redMat);
        circle.position.set(x, 0.04, z);
        scene.add(circle);
        this.meshes.push(circle);
    }
    
    _createRinkBorder(scene, x, z, width, depth) {
        const THREE = this.THREE;
        const borderMat = new THREE.MeshStandardMaterial({ color: 0xDDDDDD });
        const thickness = 0.8;
        
        // Create borders
        [{ pos: [x, 0.4, z - depth/2], size: [width + 2, 0.8, thickness] },
         { pos: [x, 0.4, z + depth/2], size: [width + 2, 0.8, thickness] },
         { pos: [x - width/2, 0.4, z], size: [thickness, 0.8, depth] },
         { pos: [x + width/2, 0.4, z], size: [thickness, 0.8, depth] }
        ].forEach(({ pos, size }) => {
            const border = new THREE.Mesh(new THREE.BoxGeometry(...size), borderMat);
            border.position.set(...pos);
            border.castShadow = true;
            scene.add(border);
            this.meshes.push(border);
        });
    }
    
    _createHockeyGoal(scene, x, z, rotation) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0xCC0000, metalness: 0.4 });
        
        const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8);
        [-1.2, 1.2].forEach(px => {
            const post = new THREE.Mesh(postGeo, pipeMat);
            post.position.set(px, 0.75, 0);
            group.add(post);
        });
        
        const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), pipeMat);
        crossbar.rotation.z = Math.PI / 2;
        crossbar.position.y = 1.5;
        group.add(crossbar);
        
        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        scene.add(group);
        this.meshes.push(group);
    }
    
    _createWoodPile(scene, x, z) {
        const THREE = this.THREE;
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const logGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 8);
        
        for (let row = 0; row < 3; row++) {
            for (let i = 0; i < 4 - row; i++) {
                const log = new THREE.Mesh(logGeo, woodMat);
                log.rotation.z = Math.PI / 2;
                log.position.set(x + (i - (3 - row) / 2) * 0.3, 0.12 + row * 0.25, z);
                log.castShadow = true;
                scene.add(log);
                this.meshes.push(log);
            }
        }
    }
    
    // NOTE: Using existing props from props/ directory via createProp() and PROP_TYPES
    // These include: PINE_TREE, BENCH, LAMP_POST, TRASH_CAN, ICE_SCULPTURE, SNOWMAN,
    // BARREL, CRATE, FIRE_HYDRANT, CAMPFIRE, LOG_SEAT, etc.
    
    _createFrozenPond(scene, x, z, radius) {
        const THREE = this.THREE;
        
        const pondGeo = new THREE.CircleGeometry(radius, 24);
        pondGeo.rotateX(-Math.PI / 2);
        const pondMat = new THREE.MeshStandardMaterial({
            color: 0xBBDDEE,
            roughness: 0.05,
            metalness: 0.2
        });
        const pond = new THREE.Mesh(pondGeo, pondMat);
        pond.position.set(x, 0.01, z);
        scene.add(pond);
        this.meshes.push(pond);
        
        // Snow around edge
        const edgeGeo = new THREE.RingGeometry(radius, radius + 1.5, 24);
        edgeGeo.rotateX(-Math.PI / 2);
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0xFAFAFA, roughness: 0.9 });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.set(x, 0.02, z);
        scene.add(edge);
        this.meshes.push(edge);
    }
    
    _createInfoBoard(scene, x, z, text, rotation = 0) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Posts
        const postMat = new THREE.MeshStandardMaterial({ color: 0x6B4423 });
        [-1, 1].forEach(offset => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3, 8), postMat);
            post.position.set(offset, 1.5, 0);
            group.add(post);
        });
        
        // Board
        const boardGeo = new THREE.BoxGeometry(2.5, 2, 0.15);
        const boardMat = new THREE.MeshStandardMaterial({ color: 0x4A3728 });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.y = 2.5;
        group.add(board);
        
        // Text
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#F5DEB3';
        ctx.fillRect(0, 0, 256, 200);
        ctx.fillStyle = '#2F1810';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        
        const lines = text.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, 128, 30 + i * 25);
        });
        
        const texture = new THREE.CanvasTexture(canvas);
        const textPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(2.2, 1.7),
            new THREE.MeshBasicMaterial({ map: texture })
        );
        textPlane.position.set(0, 2.5, 0.08);
        group.add(textPlane);
        
        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        scene.add(group);
        this.meshes.push(group);
    }
    
    /**
     * Check player collision within this zone
     */
    checkCollision(worldX, worldZ, radius = 0.5) {
        const localX = worldX - SnowFortsZone.WORLD_OFFSET_X;
        const localZ = worldZ - SnowFortsZone.WORLD_OFFSET_Z;
        return this.collisionSystem.checkCollision(localX, localZ, radius);
    }
    
    /**
     * Check triggers (benches, interaction zones) at player position
     * Note: Triggers are registered in WORLD coordinates, so pass world coords directly
     */
    checkTriggers(worldX, worldZ, playerY = 0) {
        return this.collisionSystem.checkTriggers(worldX, worldZ, 0.5, playerY);
    }
    
    /**
     * Get furniture array for direct interaction checking (benches, logs, etc)
     * This matches how TownCenter's furniture system works
     */
    getFurniture() {
        return this.furniture;
    }
    
    /**
     * Handle interaction events (sit, etc)
     */
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
    
    /**
     * Update zone animations
     */
    update(time, delta, playerX, playerZ) {
        // Campfire animation (distance-culled)
        const CAMPFIRE_ANIM_DIST_SQ = 60 * 60;
        
        if (this.campfires) {
            this.campfires.forEach(({ instance, position }) => {
                if (!instance || !instance.update) return;
                
                // Distance check
                const dx = playerX - position.x;
                const dz = playerZ - position.z;
                if (dx * dx + dz * dz > CAMPFIRE_ANIM_DIST_SQ) return;
                
                instance.update(time, delta);
            });
        }
    }
    
    /**
     * Cleanup zone meshes
     */
    cleanup() {
        this.meshes.forEach(mesh => {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        this.meshes = [];
        
        this.lights.forEach(light => {
            if (light.parent) light.parent.remove(light);
        });
        this.lights = [];
        
        this.groundPlane = null;
    }
}

export default SnowFortsZone;
