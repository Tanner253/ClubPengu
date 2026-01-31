/**
 * ForestTrailsZone - Southern expansion zone containing dense forest trails
 * 
 * This zone is SOUTH of Snow Forts (x = 220-440, z = 220-440)
 * Dense tree coverage with winding trails
 * 
 * Features:
 * - Dense pine forest with varied tree sizes
 * - Winding gravel trails
 * - Scattered benches and rest areas
 * - Campfire clearing
 * - Stream/creek (visual only)
 * - Mountain "gates" at zone connections (90% perimeter coverage)
 */

import CollisionSystem from '../engine/CollisionSystem';
import { createProp, PROP_TYPES } from '../props';

/**
 * Helper to attach collision and trigger data to prop meshes
 * (Same pattern as TownCenter and SnowFortsZone)
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
            platformHeight: trigger.platformHeight,
            data: trigger.data
        };
    }
    
    return mesh;
}

class ForestTrailsZone {
    static ID = 'forest_trails_zone';
    static NAME = 'Forest Trails';
    
    // Zone dimensions (same as other zones)
    static ZONE_SIZE = 220;
    static CENTER = ForestTrailsZone.ZONE_SIZE / 2; // 110
    
    // World offset - this zone is SOUTH of Snow Forts
    static WORLD_OFFSET_X = 220; // Same X as Snow Forts
    static WORLD_OFFSET_Z = 220; // Starts where Snow Forts ends (south)
    
    constructor(THREE) {
        this.THREE = THREE;
        this.collisionSystem = new CollisionSystem(
            ForestTrailsZone.ZONE_SIZE,
            ForestTrailsZone.ZONE_SIZE,
            4
        );
        
        this.meshes = [];
        this.lights = [];
        this.groundPlane = null;
        this.furniture = []; // Sittable furniture (benches, logs)
        this._animatedCache = null;
    }
    
    /**
     * Get world coordinates from zone-local coordinates
     */
    toWorld(localX, localZ) {
        return {
            x: localX + ForestTrailsZone.WORLD_OFFSET_X,
            z: localZ + ForestTrailsZone.WORLD_OFFSET_Z
        };
    }
    
    /**
     * Get zone-local coordinates from world coordinates
     */
    toLocal(worldX, worldZ) {
        const localX = worldX - ForestTrailsZone.WORLD_OFFSET_X;
        const localZ = worldZ - ForestTrailsZone.WORLD_OFFSET_Z;
        return { x: localX, z: localZ };
    }
    
    /**
     * Check if world position is inside this zone
     */
    containsWorldPos(worldX, worldZ) {
        const local = this.toLocal(worldX, worldZ);
        return local.x >= 0 && local.x <= ForestTrailsZone.ZONE_SIZE &&
               local.z >= 0 && local.z <= ForestTrailsZone.ZONE_SIZE;
    }
    
    /**
     * Spawn the zone into the scene
     */
    spawn(scene) {
        const THREE = this.THREE;
        const C = ForestTrailsZone.CENTER; // 110 (local center)
        const OX = ForestTrailsZone.WORLD_OFFSET_X; // 220
        const OZ = ForestTrailsZone.WORLD_OFFSET_Z; // 220
        
        // ==================== GROUND PLANE ====================
        this._createGroundPlane(scene, THREE, OX, OZ);
        
        // ==================== GRAVEL PATHS ====================
        this._createPaths(scene, THREE, OX, OZ, C);
        
        // ==================== DENSE FOREST ====================
        this._createForest(scene, THREE, OX, OZ, C);
        
        // ==================== CAMPFIRE CLEARING ====================
        this._createCampfireClearing(scene, THREE, OX, OZ, C);
        
        // ==================== STREAM/CREEK ====================
        this._createStream(scene, THREE, OX, OZ, C);
        
        // ==================== REST AREAS (Benches) ====================
        this._createRestAreas(scene, THREE, OX, OZ, C);
        
        // ==================== ZONE BOUNDARY COLLISION ====================
        this._createBoundaryCollisions(C);
        
        // ==================== AMBIENT LIGHTING ====================
        this._createLighting(scene, THREE, OX, OZ, C);
        
        console.log(`🌲 Forest Trails Zone spawned: ${this.meshes.length} meshes, ${this.lights.length} lights`);
        
        return this;
    }
    
    /**
     * Create the forest ground (darker, more earthy than snow)
     */
    _createGroundPlane(scene, THREE, OX, OZ) {
        const SIZE = ForestTrailsZone.ZONE_SIZE;
        
        // Forest floor - darker, mossy green-brown
        const groundGeo = new THREE.PlaneGeometry(SIZE, SIZE);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x2d4a2d, // Dark forest green
            roughness: 0.95,
            metalness: 0.0
        });
        
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(OX + SIZE / 2, -0.01, OZ + SIZE / 2);
        ground.receiveShadow = true;
        ground.name = 'forest_ground';
        
        scene.add(ground);
        this.groundPlane = ground;
        this.meshes.push(ground);
    }
    
    /**
     * Create clean connected gravel paths through the forest
     * Simple T-shape and L-shape connections, no overlaps
     */
    _createPaths(scene, THREE, OX, OZ, C) {
        // Path material matching TownCenter style
        const pathColor = 0x8B7355; // Gravel brown
        const pathMat = new THREE.MeshStandardMaterial({
            color: pathColor,
            roughness: 0.9,
            metalness: 0.0
        });
        
        const PATH_WIDTH = 14;
        
        // ===== CLEAN PATH LAYOUT (T-shape with south fork) =====
        // 
        //       NORTH (from Snow Forts)
        //            |
        //            | (vertical main path x=70)
        //            |
        //   ----[CLEARING]----  (horizontal at z=100)
        //            |
        //            | (vertical south path)
        //            |
        //   DOCK (future south exit at x=145)
        
        const paths = [
            // ===== NORTH ENTRY (from Snow Forts, x=70, z=0-55) =====
            { x: 70, z: 27, w: PATH_WIDTH, d: 55 },
            
            // ===== MAIN VERTICAL PATH (x=70, z=55-125) =====
            { x: 70, z: 90, w: PATH_WIDTH, d: 70 },
            
            // ===== CENTRAL CLEARING (wider area at z=100) =====
            { x: 90, z: 100, w: 55, d: 30 },
            
            // ===== WEST BRANCH (from clearing to west campsite) =====
            { x: 45, z: 100, w: 35, d: PATH_WIDTH },
            
            // ===== EAST BRANCH (from clearing toward dock) =====
            { x: 130, z: 100, w: 25, d: PATH_WIDTH },
            
            // ===== SOUTH PATH (from east branch to dock exit, z=100-220) =====
            { x: 145, z: 160, w: PATH_WIDTH, d: 120 },
        ];
        
        paths.forEach(p => {
            const pathGeo = new THREE.PlaneGeometry(p.w, p.d);
            const pathMesh = new THREE.Mesh(pathGeo, pathMat.clone());
            pathMesh.rotation.x = -Math.PI / 2;
            pathMesh.position.set(OX + p.x, 0.02, OZ + p.z);
            pathMesh.receiveShadow = true;
            pathMesh.name = 'forest_path';
            scene.add(pathMesh);
            this.meshes.push(pathMesh);
        });
    }
    
    /**
     * Create dense forest with varied tree sizes
     */
    _createForest(scene, THREE, OX, OZ, C) {
        // Tree positions - dense coverage avoiding paths and campsites
        const treePositions = [];
        
        // Campsite centers to avoid (local coordinates)
        const campsiteCenters = [
            { x: 90, z: 70 },   // Main campfire
            { x: 30, z: 100 },  // West campsite
            { x: 165, z: 160 }, // South campsite
        ];
        
        // Generate tree grid with jitter (denser: every 12 units)
        for (let x = 8; x < 215; x += 12) {
            for (let z = 20; z < 215; z += 12) {
                // Skip path areas
                if (this._isOnPath(x, z)) continue;
                
                // Add jitter for natural look
                const jitterX = (Math.sin(x * 0.5 + z * 0.3) * 5);
                const jitterZ = (Math.cos(x * 0.3 + z * 0.7) * 5);
                const finalX = x + jitterX;
                const finalZ = z + jitterZ;
                
                // Skip if too close to any campsite (20 unit radius)
                let tooCloseTocamp = false;
                for (const camp of campsiteCenters) {
                    const dx = finalX - camp.x;
                    const dz = finalZ - camp.z;
                    if (dx * dx + dz * dz < 400) { // 20 unit radius
                        tooCloseTocamp = true;
                        break;
                    }
                }
                if (tooCloseTocamp) continue;
                
                // Determine tree size based on position (more variety)
                const sizeRand = Math.abs(Math.sin(x * 1.3 + z * 2.1));
                let size = 'medium';
                if (sizeRand > 0.75) size = 'large';
                else if (sizeRand < 0.25) size = 'small';
                
                treePositions.push({ x: finalX, z: finalZ, size });
            }
        }
        
        // Spawn trees
        treePositions.forEach(pos => {
            try {
                const treeProp = createProp(THREE, null, PROP_TYPES.PINE_TREE, 0, 0, 0, { 
                    size: pos.size,
                    snowCovered: true // Forest still has snow on trees
                });
                const mesh = attachPropData(treeProp, treeProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                // Random rotation for variety
                mesh.rotation.y = Math.sin(pos.x + pos.z) * Math.PI;
                scene.add(mesh);
                this.meshes.push(mesh);
                
                // Add tree collision (smaller radius for dense forest navigation)
                this.collisionSystem.addCollider(
                    pos.x, pos.z,
                    { type: 'circle', radius: 1.0, height: 8 },
                    1, // SOLID
                    { name: 'pine_tree' }
                );
            } catch (e) {
                // Silently skip failed trees
            }
        });
        
        console.log(`🌲 Forest: Spawned ${treePositions.length} trees`);
    }
    
    /**
     * Check if position is on a path (matches _createPaths layout)
     */
    _isOnPath(x, z) {
        const PATH_HALF = 9; // Slightly wider check than actual path
        
        // North entry (x=70, z=0-55)
        if (x > 70 - PATH_HALF && x < 70 + PATH_HALF && z < 60) return true;
        
        // Main vertical path (x=70, z=55-125)
        if (x > 70 - PATH_HALF && x < 70 + PATH_HALF && z > 50 && z < 130) return true;
        
        // Central clearing (x=65-115, z=85-115)
        if (x > 60 && x < 120 && z > 82 && z < 118) return true;
        
        // West branch (x=25-65, z=93-107)
        if (x > 22 && x < 68 && z > 90 && z < 110) return true;
        
        // East branch (x=115-145, z=93-107)
        if (x > 112 && x < 148 && z > 90 && z < 110) return true;
        
        // South path to dock (x=138-152, z=100-220)
        if (x > 135 && x < 155 && z > 95 && z < 225) return true;
        
        return false;
    }
    
    /**
     * Create campfire clearings - main central and west campsite
     */
    _createCampfireClearing(scene, THREE, OX, OZ, C) {
        // ===== MAIN CAMPFIRE (central clearing, off-path) =====
        this._createCampsite(scene, THREE, OX + 90, OZ + 70, 'main');
        
        // ===== WEST CAMPSITE (end of west branch) =====
        this._createCampsite(scene, THREE, OX + 30, OZ + 100, 'west');
        
        // ===== SOUTH CAMPSITE (along south path) =====
        this._createCampsite(scene, THREE, OX + 165, OZ + 160, 'south');
    }
    
    /**
     * Create a campsite with campfire and log seats
     */
    _createCampsite(scene, THREE, worldX, worldZ, name) {
        const localX = worldX - ForestTrailsZone.WORLD_OFFSET_X;
        const localZ = worldZ - ForestTrailsZone.WORLD_OFFSET_Z;
        
        // Campfire
        try {
            const campfireProp = createProp(THREE, null, PROP_TYPES.CAMPFIRE, 0, 0, 0, {});
            const mesh = attachPropData(campfireProp, campfireProp.group);
            mesh.position.set(worldX, 0, worldZ);
            scene.add(mesh);
            this.meshes.push(mesh);
            mesh.name = 'campfire';
            mesh.userData.campfireInstance = campfireProp;
            
            // Add collision
            this.collisionSystem.addCollider(
                localX, localZ,
                { type: 'circle', radius: 2.5, height: 1 },
                1,
                { name: `campfire_${name}` }
            );
        } catch (e) {
            console.warn(`Failed to create campfire: ${name}`);
        }
        
        // Log seats arranged around the campfire
        const logOffsets = [
            { dx: -6, dz: -5, rot: 0.4 },
            { dx: 6, dz: -5, rot: -0.4 },
            { dx: -7, dz: 4, rot: 0.9 },
            { dx: 7, dz: 4, rot: -0.9 },
        ];
        
        logOffsets.forEach(offset => {
            try {
                const logProp = createProp(THREE, null, PROP_TYPES.LOG_SEAT, 0, 0, 0, {});
                const mesh = attachPropData(logProp, logProp.group);
                mesh.position.set(worldX + offset.dx, 0, worldZ + offset.dz);
                mesh.rotation.y = offset.rot;
                scene.add(mesh);
                this.meshes.push(mesh);
                
                // Register furniture for sitting
                this.furniture.push({
                    type: 'log',
                    position: { x: worldX + offset.dx, z: worldZ + offset.dz },
                    rotation: offset.rot,
                    seatHeight: mesh.userData.interactionZone?.seatHeight || 0.8,
                    platformHeight: mesh.userData.interactionZone?.platformHeight || 0,
                    snapPoints: mesh.userData.interactionZone?.snapPoints,
                    interactionRadius: 2.5
                });
                
                // Add collision for the log
                this.collisionSystem.addCollider(
                    localX + offset.dx, localZ + offset.dz,
                    { type: 'box', size: { x: 2.5, z: 1.2 }, height: 1 },
                    1,
                    { name: `log_${name}` },
                    offset.rot
                );
            } catch (e) {
                // Skip failed logs
            }
        });
    }
    
    /**
     * Create decorative stream/creek
     */
    _createStream(scene, THREE, OX, OZ, C) {
        // Stream flowing through the forest (visual only - no collision blocking)
        const streamMat = new THREE.MeshStandardMaterial({
            color: 0x4a7c9b,
            roughness: 0.2,
            metalness: 0.3,
            transparent: true,
            opacity: 0.7
        });
        
        // Stream segments
        const streamParts = [
            { x: 170, z: 30, w: 6, d: 35, rot: 0.2 },
            { x: 165, z: 65, w: 5, d: 30, rot: -0.1 },
            { x: 160, z: 100, w: 6, d: 40, rot: 0.15 },
            { x: 155, z: 145, w: 5, d: 35, rot: -0.2 },
        ];
        
        streamParts.forEach(s => {
            const streamGeo = new THREE.PlaneGeometry(s.w, s.d);
            const streamMesh = new THREE.Mesh(streamGeo, streamMat.clone());
            streamMesh.rotation.x = -Math.PI / 2;
            streamMesh.rotation.z = s.rot;
            streamMesh.position.set(OX + s.x, 0.01, OZ + s.z);
            streamMesh.name = 'stream';
            scene.add(streamMesh);
            this.meshes.push(streamMesh);
        });
    }
    
    /**
     * Create rest areas with benches along trails
     */
    _createRestAreas(scene, THREE, OX, OZ, C) {
        // Benches positioned OFF the paths, facing the path
        const benchPositions = [
            // Along north entry path (facing the path)
            { x: 55, z: 25, rot: Math.PI / 2 },   // West of north path
            { x: 85, z: 40, rot: -Math.PI / 2 },  // East of north path
            
            // Along central clearing edges
            { x: 55, z: 80, rot: Math.PI / 4 },   // NW of clearing
            { x: 115, z: 80, rot: -Math.PI / 4 }, // NE of clearing
            { x: 55, z: 120, rot: -Math.PI / 4 }, // SW of clearing
            { x: 115, z: 120, rot: Math.PI / 4 }, // SE of clearing
            
            // Along south path to dock
            { x: 165, z: 130, rot: -Math.PI / 2 }, // East of south path
            { x: 125, z: 150, rot: Math.PI / 2 },  // West of south path
            { x: 165, z: 180, rot: -Math.PI / 2 }, // East of south path
            { x: 125, z: 200, rot: Math.PI / 2 },  // West of south path
        ];
        
        benchPositions.forEach(pos => {
            try {
                const benchProp = createProp(THREE, null, PROP_TYPES.BENCH, 0, 0, 0, { style: 'wood' });
                const mesh = attachPropData(benchProp, benchProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                mesh.rotation.y = pos.rot;
                scene.add(mesh);
                this.meshes.push(mesh);
                
                // Register furniture for sitting (REQUIRED for "Press E to sit")
                this.furniture.push({
                    type: 'bench',
                    position: { x: OX + pos.x, z: OZ + pos.z },
                    rotation: pos.rot,
                    seatHeight: mesh.userData.interactionZone?.seatHeight || 1.2,
                    platformHeight: mesh.userData.interactionZone?.platformHeight || 0,
                    snapPoints: mesh.userData.interactionZone?.snapPoints,
                    interactionRadius: 3.0
                });
                
                // Add collision so players can't walk through
                this.collisionSystem.addCollider(
                    pos.x, pos.z,
                    { type: 'box', size: { x: 3, z: 1.2 }, height: 1.5 },
                    1,
                    { name: 'bench' },
                    pos.rot
                );
            } catch (e) {
                // Skip failed benches
            }
        });
        
        console.log(`🪑 Forest: Registered ${benchPositions.length} benches for sitting`);
        
        // Scattered lamp posts along paths for night visibility
        const lampPositions = [
            // North entry path
            { x: 60, z: 15 },
            { x: 80, z: 45 },
            
            // Central clearing corners
            { x: 65, z: 90 },
            { x: 115, z: 90 },
            { x: 65, z: 110 },
            { x: 115, z: 110 },
            
            // South path to dock
            { x: 135, z: 125 },
            { x: 155, z: 145 },
            { x: 135, z: 170 },
            { x: 155, z: 195 },
        ];
        
        lampPositions.forEach(pos => {
            try {
                const lampProp = createProp(THREE, null, PROP_TYPES.LAMP_POST, 0, 0, 0, { 
                    isOn: true, 
                    castShadow: false 
                });
                const mesh = attachPropData(lampProp, lampProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                scene.add(mesh);
                this.meshes.push(mesh);
                
                // Collision for lamp post
                this.collisionSystem.addCollider(
                    pos.x, pos.z,
                    { type: 'circle', radius: 0.5, height: 5 },
                    1,
                    { name: 'lamp_post' }
                );
                
                // Add light
                if (lampProp.light) {
                    this.lights.push(lampProp.light);
                }
            } catch (e) {
                // Skip failed lamps
            }
        });
    }
    
    /**
     * Create boundary collisions (mountains block most edges)
     * Only gaps at zone connections
     */
    _createBoundaryCollisions(C) {
        const SIZE = ForestTrailsZone.ZONE_SIZE;
        const WALL_THICKNESS = 8;
        const PATH_GAP = 20; // Width of path gaps for zone connections
        
        // NORTH edge - gap for Snow Forts connection at x=70 (gap: x=60-80)
        // Left section (x: 0-60)
        this.collisionSystem.addCollider(
            30, -WALL_THICKNESS / 2,
            { type: 'box', size: { x: 60, z: WALL_THICKNESS }, height: 50 },
            1, { name: 'north_wall_left' }
        );
        // Right section (x: 80-220)
        this.collisionSystem.addCollider(
            150, -WALL_THICKNESS / 2,
            { type: 'box', size: { x: 140, z: WALL_THICKNESS }, height: 50 },
            1, { name: 'north_wall_right' }
        );
        
        // SOUTH edge - gap for future Dock connection at x=145 (gap: x=135-155)
        // Left section (x: 0-135)
        this.collisionSystem.addCollider(
            67.5, SIZE + WALL_THICKNESS / 2,
            { type: 'box', size: { x: 135, z: WALL_THICKNESS }, height: 50 },
            1, { name: 'south_wall_left' }
        );
        // Right section (x: 155-220)
        this.collisionSystem.addCollider(
            187.5, SIZE + WALL_THICKNESS / 2,
            { type: 'box', size: { x: 65, z: WALL_THICKNESS }, height: 50 },
            1, { name: 'south_wall_right' }
        );
        
        // WEST edge - fully blocked (empty space, mountains form barrier)
        this.collisionSystem.addCollider(
            -WALL_THICKNESS / 2, SIZE / 2,
            { type: 'box', size: { x: WALL_THICKNESS, z: SIZE }, height: 50 },
            1, { name: 'west_wall' }
        );
        
        // EAST edge - fully blocked (no connection yet)
        this.collisionSystem.addCollider(
            SIZE + WALL_THICKNESS / 2, SIZE / 2,
            { type: 'box', size: { x: WALL_THICKNESS, z: SIZE }, height: 50 },
            1, { name: 'east_wall' }
        );
    }
    
    /**
     * Create ambient forest lighting
     */
    _createLighting(scene, THREE, OX, OZ, C) {
        // Ambient light for the forest (slightly dimmer, greenish tint)
        const ambientLight = new THREE.AmbientLight(0x4a6b4a, 0.4);
        scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        // Campfire point lights (one per campsite)
        const campfireLightPositions = [
            { x: 90, z: 70 },   // Main campfire
            { x: 30, z: 100 },  // West campsite  
            { x: 165, z: 160 }, // South campsite
        ];
        
        campfireLightPositions.forEach(pos => {
            const light = new THREE.PointLight(0xff6622, 2, 25);
            light.position.set(OX + pos.x, 3, OZ + pos.z);
            scene.add(light);
            this.lights.push(light);
        });
    }
    
    /**
     * Get furniture list for interaction checking
     */
    getFurniture() {
        return this.furniture;
    }
    
    /**
     * Update animations
     */
    update(time, delta, nightFactor = 0.5, playerPos = null) {
        // Initialize animation cache on first update
        if (!this._animatedCache) {
            this._animatedCache = { campfires: [], frameCounter: 0 };
            
            this.meshes.forEach(mesh => {
                if (mesh.name === 'campfire' && mesh.userData.campfireInstance) {
                    this._animatedCache.campfires.push({
                        instance: mesh.userData.campfireInstance,
                        position: { x: mesh.position.x, z: mesh.position.z }
                    });
                }
            });
        }
        
        this._animatedCache.frameCounter++;
        const frame = this._animatedCache.frameCounter;
        
        // Distance-based animation culling
        const ANIMATION_DISTANCE_SQ = 80 * 80;
        const px = playerPos?.x || 0;
        const pz = playerPos?.z || 0;
        
        // Animate campfires (distance culled)
        this._animatedCache.campfires.forEach(({ instance, position }) => {
            const dx = px - position.x;
            const dz = pz - position.z;
            if (dx * dx + dz * dz < ANIMATION_DISTANCE_SQ) {
                if (instance.update) {
                    instance.update(time, delta);
                }
            }
        });
    }
    
    /**
     * Check collision at position
     */
    checkCollision(worldX, worldZ, radius = 0.5, height = 1.8) {
        const local = this.toLocal(worldX, worldZ);
        return this.collisionSystem.checkCollision(local.x, local.z, radius, height);
    }
    
    /**
     * Check triggers at position
     */
    checkTriggers(playerX, playerZ, playerY = 0) {
        return this.collisionSystem.checkTriggers(playerX, playerZ, 0.5, playerY);
    }
    
    /**
     * Check for landing surfaces
     */
    checkLanding(worldX, worldZ, worldY) {
        // No elevated surfaces in forest (just ground level)
        return null;
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        this.meshes.forEach(mesh => {
            if (mesh.parent) mesh.parent.remove(mesh);
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
        this.meshes = [];
        this.lights = [];
        this.furniture = [];
        this.collisionSystem.clear();
        this._animatedCache = null;
    }
}

export default ForestTrailsZone;

