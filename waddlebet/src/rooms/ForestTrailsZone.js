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
 * - Mountain "gates" at zone connections (90% perimeter coverage)
 */

import CollisionSystem from '../engine/CollisionSystem';
import { createProp, PROP_TYPES } from '../props';
import { applyGroundPathSurface, groundPathMaterialProps } from '../utils/groundPathSurface';
import {
    createForestGroundTexture,
    createForestPathTexture,
        spawnFallenLog,
        createForestButterflies,
        spawnForestCabin,
        TRAIL_LOG_PLACEMENTS,
        BUTTERFLY_PATCHES,
    } from './forest/ForestAmbience';

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
    static WORLD_OFFSET_X = 0;
    static WORLD_OFFSET_Z = 0;

    /** Trail width — all segments share this (PlaneGeometry w × d, Y-rotated flat). */
    static PATH_WIDTH = 14;

    /**
     * Forest trail segments — edge-aligned, no overlapping meshes.
     * Layout: north corridor (x≈70) → elbow to spawn (90,70) → hub cross → south-east leg.
     */
    static PATH_SEGMENTS = [
        { id: 'north_entry', x: 70, z: 26, w: 14, d: 52 },
        { id: 'north_elbow', x: 81, z: 59.25, w: 18, d: 14.5 },
        { id: 'spawn_spur', x: 90, z: 73.5, w: 14, d: 13 },
        { id: 'hub_trunk', x: 90, z: 92, w: 14, d: 24 },
        { id: 'west_branch', x: 68, z: 100, w: 30, d: 14 },
        { id: 'east_branch', x: 108.5, z: 100, w: 23, d: 14 },
        { id: 'south_turn', x: 135, z: 107, w: 30, d: 14 },
        { id: 'south_leg', x: 145, z: 167, w: 14, d: 106 },
    ];

    /** Axis-aligned bounds for a path segment (local zone coords). */
    static pathBounds(seg) {
        return {
            minX: seg.x - seg.w / 2,
            maxX: seg.x + seg.w / 2,
            minZ: seg.z - seg.d / 2,
            maxZ: seg.z + seg.d / 2,
        };
    }
    
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
        this.zoneRoot = null;
        this._butterflySystem = null;
        this._forestCabin = null;
    }

    _initZoneRoot(scene) {
        if (!this.zoneRoot) {
            this.zoneRoot = new this.THREE.Group();
            this.zoneRoot.name = 'forest_trails_zone_root';
            scene.add(this.zoneRoot);
        }
    }

    _addToZone(object) {
        this.zoneRoot.add(object);
        this.meshes.push(object);
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

        this._initZoneRoot(scene);
        
        // ==================== GROUND PLANE ====================
        this._createGroundPlane(scene, THREE, OX, OZ);
        
        // ==================== GRAVEL PATHS ====================
        this._createPaths(scene, THREE, OX, OZ, C);
        
        // ==================== DENSE FOREST ====================
        this._createForest(scene, THREE, OX, OZ, C);
        
        // ==================== CAMPFIRE CLEARING ====================
        this._createCampfireClearing(scene, THREE, OX, OZ, C);
        
        // ==================== REST AREAS (Benches) ====================
        this._createRestAreas(scene, THREE, OX, OZ, C);

        // ==================== AMBIENCE (grass, logs, cabin, butterflies) ====================
        this._createAmbience(scene, THREE, OX, OZ, C);
        
        // ==================== ZONE BOUNDARY COLLISION ====================
        this._createBoundaryCollisions(C);
        
        // ==================== AMBIENT LIGHTING ====================
        this._createLighting(scene, THREE, OX, OZ, C);
        
        console.log(`🌲 Forest Trails Zone spawned: ${this.meshes.length} meshes, ${this.lights.length} lights`);
        
        return this;
    }
    
    /**
     * Chunked spawn for the initial load: builds the zone in small batches,
     * awaiting `yieldFn` between batches so the main thread stays responsive.
     */
    async spawnChunked(scene, yieldFn, treeBatchSize = 20) {
        const THREE = this.THREE;
        const C = ForestTrailsZone.CENTER;
        const OX = ForestTrailsZone.WORLD_OFFSET_X;
        const OZ = ForestTrailsZone.WORLD_OFFSET_Z;

        this._initZoneRoot(scene);
        this._createGroundPlane(scene, THREE, OX, OZ);
        this._createPaths(scene, THREE, OX, OZ, C);
        await yieldFn();
        
        // Dense forest in tree batches (~200 trees — the heaviest part of this zone)
        const treePositions = this._collectTreePositions();
        for (let i = 0; i < treePositions.length; i++) {
            this._spawnTree(scene, THREE, OX, OZ, treePositions[i]);
            if ((i + 1) % treeBatchSize === 0) await yieldFn();
        }
        console.log(`🌲 Forest: Spawned ${treePositions.length} trees`);
        await yieldFn();
        
        this._createCampfireClearing(scene, THREE, OX, OZ, C);
        await yieldFn();
        
        this._createRestAreas(scene, THREE, OX, OZ, C);
        await yieldFn();

        this._createAmbience(scene, THREE, OX, OZ, C);
        await yieldFn();

        this._createBoundaryCollisions(C);
        this._createLighting(scene, THREE, OX, OZ, C);
        
        console.log(`🌲 Forest Trails Zone spawned: ${this.meshes.length} meshes, ${this.lights.length} lights`);
        
        return this;
    }

    /**
     * Grass tufts, trail logs, mushrooms, butterflies, ranger cabin.
     */
    _createAmbience(scene, THREE, OX, OZ, C) {
        TRAIL_LOG_PLACEMENTS.forEach(pos => {
            if (pos.sit) {
                try {
                    const logProp = createProp(THREE, null, PROP_TYPES.LOG_SEAT, 0, 0, 0, { rotation: pos.rot });
                    const mesh = attachPropData(logProp, logProp.group);
                    mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                    mesh.rotation.y = pos.rot;
                    this._addToZone(mesh);
                    this.furniture.push({
                        type: 'log',
                        position: { x: OX + pos.x, z: OZ + pos.z },
                        rotation: pos.rot,
                        seatHeight: mesh.userData.interactionZone?.seatHeight || 0.8,
                        platformHeight: 0,
                        snapPoints: mesh.userData.interactionZone?.snapPoints,
                        interactionRadius: 2.5
                    });
                    this.collisionSystem.addCollider(
                        pos.x, pos.z,
                        { type: 'box', size: { x: 2.5, z: 1.2 }, height: 1 },
                        1, { name: 'trail_log' }, pos.rot
                    );
                } catch (e) { /* skip */ }
            } else {
                const decor = spawnFallenLog(THREE, this.zoneRoot, OX, OZ, pos, pos);
                if (decor?.collider) {
                    this.collisionSystem.addCollider(
                        pos.x, pos.z,
                        { type: 'box', size: decor.collider.size, height: decor.collider.height },
                        1, { name: 'fallen_log_decor' }, pos.rot ?? 0
                    );
                }
            }
        });

        // Harvestable mushrooms are spawned by MushroomClusterManager (server-synced)

        // Mossy rocks along stream
        [{ x: 172, z: 42, size: 'medium' }, { x: 152, z: 155, size: 'small' }, { x: 62, z: 155, size: 'small' }].forEach(r => {
            try {
                const rock = createProp(THREE, null, PROP_TYPES.ROCK, 0, 0, 0, { size: r.size });
                const mesh = attachPropData(rock, rock.group);
                mesh.position.set(OX + r.x, 0, OZ + r.z);
                mesh.rotation.y = (r.x + r.z) * 0.07;
                this._addToZone(mesh);
            } catch (e) { /* skip */ }
        });

        this._butterflySystem = createForestButterflies(THREE, this.zoneRoot, BUTTERFLY_PATCHES, OX, OZ);

        // Ranger cabin — northeast of main clearing, tucked off the main path
        const cabinLocalX = 125;
        const cabinLocalZ = 52;
        this._forestCabin = spawnForestCabin(THREE, this.zoneRoot, OX, OZ, cabinLocalX, cabinLocalZ);
        if (this._forestCabin) {
            const cabinMesh = attachPropData(this._forestCabin, this._forestCabin.group);
            this.collisionSystem.addCollider(
                cabinLocalX, cabinLocalZ,
                { type: 'box', size: { x: 10, z: 9 }, height: 4.5 },
                1, { name: 'forest_cabin' }
            );
            if (cabinMesh.userData.interactionZone) {
                // trigger handled by collision system via attachPropData
            }

            // Porch bench — west of the path, clear of Ranger Pike on the porch
            const benchLocalX = cabinLocalX - 5;
            const benchLocalZ = cabinLocalZ + 10;
            const benchRotation = 0;
            try {
                const benchProp = createProp(THREE, null, PROP_TYPES.BENCH, 0, 0, 0, { withSnow: false });
                const benchMesh = attachPropData(benchProp, benchProp.group);
                benchMesh.position.set(OX + benchLocalX, 0, OZ + benchLocalZ);
                benchMesh.rotation.y = benchRotation;
                this._addToZone(benchMesh);
                this.furniture.push({
                    type: 'bench',
                    position: { x: OX + benchLocalX, z: OZ + benchLocalZ },
                    rotation: benchRotation,
                    seatHeight: benchMesh.userData.interactionZone?.seatHeight || 1.2,
                    platformHeight: 0,
                    snapPoints: benchMesh.userData.interactionZone?.snapPoints,
                    interactionRadius: 3.0,
                    dismountBack: true
                });
                this.collisionSystem.addCollider(
                    benchLocalX, benchLocalZ,
                    { type: 'box', size: { x: 3, z: 1.2 }, height: 1.5 },
                    1, { name: 'cabin_bench' }, benchRotation
                );
            } catch (e) { /* skip */ }
        }

        console.log('🌿 Forest ambience: logs, cabin, butterflies');
    }
    
    /**
     * Create the forest ground (textured mossy floor)
     */
    _createGroundPlane(scene, THREE, OX, OZ) {
        const SIZE = ForestTrailsZone.ZONE_SIZE;
        const groundTex = createForestGroundTexture(THREE);
        
        const groundGeo = new THREE.PlaneGeometry(SIZE, SIZE);
        const groundMat = new THREE.MeshStandardMaterial({
            map: groundTex,
            color: 0xa8c4a0,
            roughness: 0.96,
            metalness: 0.0
        });
        
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(OX + SIZE / 2, -0.01, OZ + SIZE / 2);
        ground.receiveShadow = true;
        ground.name = 'forest_ground';
        
        this._addToZone(ground);
        this.groundPlane = ground;
    }
    
    /**
     * Create connected forest trails — segments share edges only (no stacked overlaps).
     */
    _createPaths(scene, THREE, OX, OZ, C) {
        const pathTex = createForestPathTexture(THREE);

        ForestTrailsZone.PATH_SEGMENTS.forEach((seg) => {
            const tex = pathTex.clone();
            tex.repeat.set(Math.max(1, seg.w / 10), Math.max(1, seg.d / 10));

            const pathMat = new THREE.MeshStandardMaterial({
                map: tex,
                color: 0xffffff,
                roughness: 0.88,
                metalness: 0.02,
                ...groundPathMaterialProps(),
            });

            const pathGeo = new THREE.PlaneGeometry(seg.w, seg.d);
            const pathMesh = new THREE.Mesh(pathGeo, pathMat);
            pathMesh.rotation.x = -Math.PI / 2;
            pathMesh.position.set(OX + seg.x, 0, OZ + seg.z);
            applyGroundPathSurface(pathMesh);
            pathMesh.receiveShadow = true;
            pathMesh.name = 'forest_path';
            pathMesh.userData.pathSegmentId = seg.id;
            this._addToZone(pathMesh);
        });

        this._decorateForestPaths(scene, THREE, OX, OZ);
    }

    /** Trail markers and pebble accents along path junctions. */
    _decorateForestPaths(scene, THREE, OX, OZ) {
        // Wooden trail posts at major junctions
        const posts = [
            { x: 70, z: 26, style: 'topped' },
            { x: 81, z: 58, style: 'plain' },
            { x: 68, z: 100, style: 'plain' },
            { x: 108.5, z: 100, style: 'plain' },
            { x: 132.5, z: 107, style: 'plain' },
            { x: 145, z: 118, style: 'plain' },
            { x: 145, z: 198, style: 'topped' },
        ];

        posts.forEach(({ x, z, style }) => {
            try {
                const post = createProp(THREE, null, PROP_TYPES.WOODEN_POST, 0, 0, 0, { style });
                const mesh = attachPropData(post, post.group);
                mesh.position.set(OX + x, 0, OZ + z);
                mesh.name = 'forest_trail_post';
                this._addToZone(mesh);
            } catch {
                // skip if prop unavailable
            }
        });

        // Small pebble clusters at clearing corners
        const pebbleMat = new THREE.MeshStandardMaterial({
            color: 0x6a5848,
            roughness: 0.92,
            ...groundPathMaterialProps(),
        });
        const corners = [
            { x: 66, z: 96 }, { x: 114, z: 96 },
            { x: 66, z: 104 }, { x: 114, z: 104 },
            { x: 132, z: 104 }, { x: 142, z: 108 }, { x: 142, z: 205 },
        ];
        corners.forEach(({ x, z }) => {
            const cluster = new THREE.Mesh(new THREE.CircleGeometry(1.2 + Math.random() * 0.6, 8), pebbleMat.clone());
            cluster.rotation.x = -Math.PI / 2;
            cluster.position.set(OX + x + (Math.random() - 0.5) * 2, 0.07, OZ + z + (Math.random() - 0.5) * 2);
            cluster.renderOrder = 2;
            cluster.receiveShadow = true;
            cluster.name = 'forest_path_pebbles';
            this._addToZone(cluster);
        });
    }
    
    /**
     * Create dense forest with varied tree sizes
     */
    _createForest(scene, THREE, OX, OZ, C) {
        const treePositions = this._collectTreePositions();
        treePositions.forEach(pos => this._spawnTree(scene, THREE, OX, OZ, pos));
        console.log(`🌲 Forest: Spawned ${treePositions.length} trees`);
    }
    
    /**
     * Compute tree positions - dense coverage avoiding paths and campsites
     */
    _collectTreePositions() {
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

        // Keep ~10% of decorative trees — harvestable trees fill the forest instead
        return treePositions.filter((_, index) => index % 10 === 0);
    }
    
    /**
     * Spawn a single forest tree with collision
     */
    _spawnTree(scene, THREE, OX, OZ, pos) {
        try {
            const treeProp = createProp(THREE, null, PROP_TYPES.PINE_TREE, 0, 0, 0, { 
                size: pos.size,
                snowCovered: true // Forest still has snow on trees
            });
            const mesh = attachPropData(treeProp, treeProp.group);
            mesh.position.set(OX + pos.x, 0, OZ + pos.z);
            // Random rotation for variety
            mesh.rotation.y = Math.sin(pos.x + pos.z) * Math.PI;
            this._addToZone(mesh);
            
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
    }
    
    /**
     * Check if position is on a path (matches PATH_SEGMENTS layout).
     */
    _isOnPath(x, z) {
        const margin = 1.5;
        return ForestTrailsZone.PATH_SEGMENTS.some((seg) => {
            const b = ForestTrailsZone.pathBounds(seg);
            return x >= b.minX - margin
                && x <= b.maxX + margin
                && z >= b.minZ - margin
                && z <= b.maxZ + margin;
        });
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
            this._addToZone(mesh);
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
                this._addToZone(mesh);
                
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
     * Create rest areas with benches along trails
     */
    _createRestAreas(scene, THREE, OX, OZ, C) {
        // Benches positioned OFF the paths, facing the path
        const benchPositions = [
            { x: 55, z: 25, rot: Math.PI / 2 },
            { x: 88, z: 42, rot: -Math.PI / 2 },
            { x: 48, z: 98, rot: Math.PI / 2 },
            { x: 118, z: 98, rot: -Math.PI / 2 },
            { x: 48, z: 102, rot: Math.PI / 2 },
            { x: 118, z: 102, rot: -Math.PI / 2 },
            { x: 165, z: 130, rot: -Math.PI / 2 },
            { x: 125, z: 150, rot: Math.PI / 2 },
            { x: 165, z: 180, rot: -Math.PI / 2 },
            { x: 125, z: 200, rot: Math.PI / 2 },
        ];
        
        benchPositions.forEach(pos => {
            try {
                const benchProp = createProp(THREE, null, PROP_TYPES.BENCH, 0, 0, 0, { style: 'wood' });
                const mesh = attachPropData(benchProp, benchProp.group);
                mesh.position.set(OX + pos.x, 0, OZ + pos.z);
                mesh.rotation.y = pos.rot;
                this._addToZone(mesh);
                
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
            { x: 60, z: 15 },
            { x: 78, z: 45 },
            { x: 66, z: 72 },
            { x: 102, z: 72 },
            { x: 58, z: 100 },
            { x: 118, z: 100 },
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
                this._addToZone(mesh);
                
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
        this.zoneRoot.add(ambientLight);
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
            this.zoneRoot.add(light);
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

        if (this._butterflySystem?.update) {
            this._butterflySystem.update(time, playerPos);
        }

        if (this._forestCabin?.update && frame % 2 === 0) {
            const cx = this._forestCabin.group?.position.x ?? 0;
            const cz = this._forestCabin.group?.position.z ?? 0;
            const cdx = px - cx;
            const cdz = pz - cz;
            if (cdx * cdx + cdz * cdz < ANIMATION_DISTANCE_SQ) {
                this._forestCabin.update(time);
            }
        }
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
        this._butterflySystem = null;
        this._forestCabin = null;
        if (this.zoneRoot?.parent) {
            this.zoneRoot.parent.remove(this.zoneRoot);
        }
        this.zoneRoot = null;
    }
}

export default ForestTrailsZone;

