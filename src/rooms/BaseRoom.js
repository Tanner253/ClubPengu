/**
 * BaseRoom - Abstract base class for all game rooms
 * Provides common functionality for spawning, updating, and cleanup
 */

import CollisionSystem from '../engine/CollisionSystem';

class BaseRoom {
    constructor(THREE) {
        if (new.target === BaseRoom) {
            throw new Error('BaseRoom is abstract and cannot be instantiated directly');
        }
        
        this.THREE = THREE;
        this.props = [];           // Array of BaseProp instances
        this.meshes = [];          // Direct meshes (not from props)
        this.lights = [];          // All lights in the room
        this.materials = [];       // Track materials for disposal
        this.geometries = [];      // Track geometries for disposal
        this.collisionSystem = null;
        this.landingSurfaces = []; // Surfaces player can land on
        this.triggers = [];        // Interactive trigger zones
        this.portals = [];         // Room transition portals
        this.animatedElements = []; // Elements that need update()
    }
    
    /**
     * Get room identifier
     * @returns {string}
     */
    static get ID() {
        throw new Error('ID must be defined by subclass');
    }
    
    /**
     * Get room display name
     * @returns {string}
     */
    static get NAME() {
        throw new Error('NAME must be defined by subclass');
    }
    
    /**
     * Initialize collision system for this room
     * @param {number} width - Room width
     * @param {number} depth - Room depth
     * @param {number} cellSize - Collision cell size
     */
    initCollisionSystem(width, depth, cellSize = 4) {
        this.collisionSystem = new CollisionSystem(width, depth, cellSize);
    }
    
    /**
     * Spawn the room into the scene
     * @param {THREE.Scene} scene - The scene to add to
     * @returns {Object} - { meshes, lights, collisionSystem, landingSurfaces, ... }
     */
    spawn(scene) {
        throw new Error('spawn() must be implemented by subclass');
    }
    
    /**
     * Update the room (for animations)
     * @param {number} time - Current time in seconds
     * @param {number} delta - Time since last frame
     * @param {number} nightFactor - 0-1, how dark it is (for lighting)
     */
    update(time, delta, nightFactor = 0) {
        // Update all props
        this.props.forEach(prop => {
            if (prop.update) {
                prop.update(time, delta);
            }
        });
        
        // Update animated elements
        this.animatedElements.forEach(elem => {
            if (elem.userData && elem.userData.updateFn) {
                elem.userData.updateFn(time, delta);
            }
        });
    }
    
    /**
     * Get spawn position for players entering this room
     * @param {string} fromRoom - Optional room player is coming from
     * @returns {{ x: number, z: number }}
     */
    getSpawnPosition(fromRoom = null) {
        throw new Error('getSpawnPosition() must be implemented by subclass');
    }
    
    /**
     * Get all portals (room transitions) in this room
     * @returns {Array<{ id: string, x: number, z: number, radius: number, targetRoom: string, targetSpawn: Object }>}
     */
    getPortals() {
        return this.portals;
    }
    
    /**
     * Get all landing surfaces in this room
     * @returns {Array<{ name: string, minX: number, maxX: number, minZ: number, maxZ: number, height: number }>}
     */
    getLandingSurfaces() {
        return this.landingSurfaces;
    }
    
    /**
     * Get all interactive triggers in this room
     * @returns {Array}
     */
    getTriggers() {
        return this.triggers;
    }
    
    /**
     * Add a prop to the room
     * @param {BaseProp} prop
     */
    addProp(prop) {
        this.props.push(prop);
    }
    
    /**
     * Add a mesh directly (not from a prop)
     * @param {THREE.Mesh} mesh
     * @param {THREE.Scene} scene
     */
    addMesh(mesh, scene) {
        scene.add(mesh);
        this.meshes.push(mesh);
        
        if (mesh.geometry) this.geometries.push(mesh.geometry);
        if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach(mat => this.materials.push(mat));
        }
    }
    
    /**
     * Add a light to the room
     * @param {THREE.Light} light
     * @param {THREE.Scene} scene
     */
    addLight(light, scene) {
        scene.add(light);
        this.lights.push(light);
    }
    
    /**
     * Add a portal to the room
     * @param {Object} portal - { id, x, z, radius, targetRoom, targetSpawn }
     */
    addPortal(portal) {
        this.portals.push(portal);
    }
    
    /**
     * Add a landing surface
     * @param {Object} surface - { name, minX, maxX, minZ, maxZ, height }
     */
    addLandingSurface(surface) {
        this.landingSurfaces.push(surface);
    }
    
    /**
     * Add an interactive trigger
     * @param {Object} trigger
     */
    addTrigger(trigger) {
        this.triggers.push(trigger);
    }
    
    /**
     * Create a standard material
     * @param {Object} options
     * @returns {THREE.MeshStandardMaterial}
     */
    createMaterial(options = {}) {
        const mat = new this.THREE.MeshStandardMaterial(options);
        this.materials.push(mat);
        return mat;
    }
    
    /**
     * Remove room from scene and dispose resources
     */
    cleanup() {
        // Cleanup all props
        this.props.forEach(prop => {
            if (prop.cleanup) prop.cleanup();
        });
        this.props = [];
        
        // Remove direct meshes
        this.meshes.forEach(mesh => {
            if (mesh.parent) mesh.parent.remove(mesh);
        });
        this.meshes = [];
        
        // Remove lights
        this.lights.forEach(light => {
            if (light.parent) light.parent.remove(light);
        });
        this.lights = [];
        
        // Dispose geometries
        this.geometries.forEach(geo => {
            if (geo.dispose) geo.dispose();
        });
        this.geometries = [];
        
        // Dispose materials
        this.materials.forEach(mat => {
            if (mat.dispose) mat.dispose();
            if (mat.map) mat.map.dispose();
        });
        this.materials = [];
        
        // Clear collision system
        if (this.collisionSystem) {
            this.collisionSystem.clear();
        }
        
        // Clear other arrays
        this.landingSurfaces = [];
        this.triggers = [];
        this.portals = [];
        this.animatedElements = [];
    }
    
    /**
     * Alias for cleanup
     */
    dispose() {
        this.cleanup();
    }
    
    /**
     * Create debug visualization for collision system
     * @returns {THREE.Mesh|null}
     */
    getDebugMesh() {
        if (this.collisionSystem) {
            return this.collisionSystem.createDebugMesh(this.THREE);
        }
        return null;
    }
}

/**
 * Generate Igloo interior room
 * @param {THREE} THREE - Three.js library
 * @param {THREE.Scene} scene - Scene to add objects to
 * @returns {Object} Room data with bounds, spawnPos, furniture, beachBall, colliders, map
 */
export function generateIglooInterior(THREE, scene) {
    const IGLOO_SIZE = 30;
    scene.background = new THREE.Color(0x0d1520);
    
    // Collision map
    const map = [];
    for(let x = 0; x < 15; x++) {
        map[x] = [];
        for(let z = 0; z < 15; z++) map[x][z] = 2;
    }
    
    // Floor - carpet
    const carpet = new THREE.Mesh(new THREE.CircleGeometry(10.5, 32), new THREE.MeshStandardMaterial({ color: 0x6B3510, roughness: 0.9 }));
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.02;
    carpet.receiveShadow = true;
    scene.add(carpet);
    
    const innerCarpet = new THREE.Mesh(new THREE.CircleGeometry(7.5, 32), new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }));
    innerCarpet.rotation.x = -Math.PI / 2;
    innerCarpet.position.y = 0.03;
    scene.add(innerCarpet);
    
    // Ice floor
    const floor = new THREE.Mesh(new THREE.CircleGeometry(IGLOO_SIZE / 2, 32), new THREE.MeshStandardMaterial({ color: 0xB8D4E8, roughness: 0.4, metalness: 0.1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Dome
    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(IGLOO_SIZE / 2, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x9CB8C8, roughness: 0.5, side: THREE.BackSide })
    );
    dome.scale.y = 0.6;
    scene.add(dome);
    
    // Dome rings
    for (let i = 1; i < 8; i++) {
        const ringY = i * 1.2;
        const ringRadius = (IGLOO_SIZE / 2) * Math.cos(Math.asin(ringY / (IGLOO_SIZE / 2 * 0.6)));
        if (ringRadius > 1) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, 0.06, 4, 48), new THREE.MeshStandardMaterial({ color: 0x7A9AAA }));
            ring.position.y = ringY;
            ring.rotation.x = Math.PI / 2;
            scene.add(ring);
        }
    }
    
    // Couch
    const couchGroup = new THREE.Group();
    const couchMat = new THREE.MeshStandardMaterial({ color: 0x2E4A62, roughness: 0.8 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x3D5A80, roughness: 0.9 });
    
    const couchBase = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 2), couchMat);
    couchBase.position.y = 0.4;
    couchBase.castShadow = true;
    couchGroup.add(couchBase);
    
    const couchBack = new THREE.Mesh(new THREE.BoxGeometry(5, 1.5, 0.5), couchMat);
    couchBack.position.set(0, 1.15, -0.75);
    couchBack.castShadow = true;
    couchGroup.add(couchBack);
    
    [-2.5, 2.5].forEach(x => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 2), couchMat);
        arm.position.set(x, 0.7, 0);
        arm.castShadow = true;
        couchGroup.add(arm);
    });
    
    [-1.5, 0, 1.5].forEach(x => {
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.6), cushionMat);
        cushion.position.set(x, 0.95, 0.1);
        couchGroup.add(cushion);
    });
    couchGroup.position.set(0, 0, -9);
    scene.add(couchGroup);
    
    // Chairs
    const createChair = (x, z, rotY) => {
        const chairGroup = new THREE.Group();
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x5D4E37, roughness: 0.8 });
        const seatMat = new THREE.MeshStandardMaterial({ color: 0xC0392B, roughness: 0.9 });
        
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1.5), seatMat);
        seat.position.y = 0.8;
        seat.castShadow = true;
        chairGroup.add(seat);
        
        const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
        [[-0.5, -0.5], [-0.5, 0.5], [0.5, -0.5], [0.5, 0.5]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, chairMat);
            leg.position.set(lx, 0.4, lz);
            chairGroup.add(leg);
        });
        
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.15), chairMat);
        back.position.set(0, 1.5, -0.65);
        back.castShadow = true;
        chairGroup.add(back);
        
        chairGroup.position.set(x, 0, z);
        chairGroup.rotation.y = rotY;
        scene.add(chairGroup);
    };
    createChair(-7.5, -3, Math.PI / 4);
    createChair(7.5, -3, -Math.PI / 4);
    
    // TV
    const tvGroup = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1), new THREE.MeshStandardMaterial({ color: 0x2C3E50, roughness: 0.7 }));
    stand.position.y = 0.5;
    stand.castShadow = true;
    tvGroup.add(stand);
    
    const screen = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.8, 0.15), new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3 }));
    screen.position.set(0, 1.9, 0);
    screen.castShadow = true;
    tvGroup.add(screen);
    
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.6), new THREE.MeshBasicMaterial({ color: 0x3366cc, transparent: true, opacity: 0.2 }));
    glow.position.set(0, 1.9, 0.08);
    tvGroup.add(glow);
    
    const consoleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.4), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    consoleMesh.position.set(0, 1.1, 0.2);
    tvGroup.add(consoleMesh);
    tvGroup.position.set(0, 0, 9);
    tvGroup.rotation.y = Math.PI;
    scene.add(tvGroup);
    
    // Coffee table
    const tableGroup = new THREE.Group();
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.7 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 1.5), tableMat);
    tableTop.position.y = 0.6;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);
    
    const tLegGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    [[-1, -0.5], [-1, 0.5], [1, -0.5], [1, 0.5]].forEach(([tx, tz]) => {
        const tLeg = new THREE.Mesh(tLegGeo, tableMat);
        tLeg.position.set(tx, 0.3, tz);
        tableGroup.add(tLeg);
    });
    tableGroup.position.set(0, 0, -3);
    scene.add(tableGroup);
    
    // Beach ball
    const beachBallGroup = new THREE.Group();
    beachBallGroup.name = 'beachBall';
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshStandardMaterial({ color: 0xFF6B6B, roughness: 0.6 }));
    ball.castShadow = true;
    beachBallGroup.add(ball);
    
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xFFE66D });
    for (let i = 0; i < 4; i++) {
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 8, 16), stripeMat);
        stripe.rotation.y = (i / 4) * Math.PI;
        beachBallGroup.add(stripe);
    }
    beachBallGroup.position.set(4.5, 0.5, 3);
    scene.add(beachBallGroup);
    
    const beachBall = { mesh: beachBallGroup, velocity: { x: 0, z: 0 }, radius: 0.5, friction: 0.985, bounciness: 0.75 };
    
    // Furniture colliders
    const furnitureColliders = [
        { x: 0, z: -9.8, hw: 2.8, hd: 0.6, height: 1.8, y: 0, name: 'couch_back' },
        { x: -2.5, z: -9, hw: 0.4, hd: 1.2, height: 1.2, y: 0, name: 'couch_arm_l' },
        { x: 2.5, z: -9, hw: 0.4, hd: 1.2, height: 1.2, y: 0, name: 'couch_arm_r' },
        { x: 0, z: -3, hw: 1.5, hd: 1, height: 0.8, y: 0, name: 'table' }
    ];
    
    // Plant
    const plantGroup = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xB5651D, roughness: 0.8 }));
    pot.position.y = 0.3;
    pot.castShadow = true;
    plantGroup.add(pot);
    
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0x3d2817 }));
    soil.position.y = 0.55;
    plantGroup.add(soil);
    
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 });
    for (let i = 0; i < 8; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.8, 4), leafMat);
        const angle = (i / 8) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.2, 1, Math.sin(angle) * 0.2);
        leaf.rotation.x = 0.3;
        leaf.rotation.y = angle;
        plantGroup.add(leaf);
    }
    const centerLeaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 4), leafMat);
    centerLeaf.position.y = 1.1;
    plantGroup.add(centerLeaf);
    plantGroup.position.set(-6, 0, 6);
    scene.add(plantGroup);
    
    // Bookshelf
    const shelfGroup = new THREE.Group();
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3, 0.4), shelfMat);
    frame.position.y = 1.5;
    frame.castShadow = true;
    shelfGroup.add(frame);
    
    [0.6, 1.5, 2.4].forEach(y => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.35), shelfMat);
        shelf.position.set(0, y, 0.05);
        shelfGroup.add(shelf);
    });
    
    const bookColors = [0xE74C3C, 0x3498DB, 0x2ECC71, 0xF39C12, 0x9B59B6];
    [0.8, 1.7, 2.6].forEach((y, shelfIdx) => {
        for (let i = 0; i < 5; i++) {
            const book = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.4 + Math.random() * 0.2, 0.25),
                new THREE.MeshStandardMaterial({ color: bookColors[(i + shelfIdx) % bookColors.length] })
            );
            book.position.set(-0.8 + i * 0.35, y + 0.25, 0.05);
            shelfGroup.add(book);
        }
    });
    shelfGroup.position.set(10, 0, 0);
    shelfGroup.rotation.y = -Math.PI / 2;
    scene.add(shelfGroup);
    
    // Lighting
    scene.add(new THREE.AmbientLight(0x2a1a0a, 0.15));
    
    const ceilingLight = new THREE.PointLight(0xFF9944, 0.8, 25);
    ceilingLight.position.set(0, 7, 0);
    ceilingLight.castShadow = true;
    scene.add(ceilingLight);
    
    const fixtureMesh = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), new THREE.MeshBasicMaterial({ color: 0xFFAA55 }));
    fixtureMesh.position.set(0, 7.5, 0);
    scene.add(fixtureMesh);
    
    [[-8, 2, -8], [8, 2, -8]].forEach(([x, y, z]) => {
        const accent = new THREE.PointLight(0xFF6633, 0.3, 12);
        accent.position.set(x, y, z);
        scene.add(accent);
    });
    
    const tvLight = new THREE.PointLight(0x3366aa, 0.4, 10);
    tvLight.position.set(0, 2, 7);
    scene.add(tvLight);
    
    const floorGlow = new THREE.PointLight(0xFF4400, 0.2, 15);
    floorGlow.position.set(0, 0.5, 0);
    scene.add(floorGlow);
    
    // Exit
    const exitGlow = new THREE.Mesh(new THREE.CircleGeometry(2.5, 16), new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.15 }));
    exitGlow.rotation.x = -Math.PI / 2;
    exitGlow.position.set(0, 0.02, 13.5);
    scene.add(exitGlow);
    
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(3, 3.5, 0.3), new THREE.MeshStandardMaterial({ color: 0x4a3728 }));
    doorFrame.position.set(0, 1.75, IGLOO_SIZE / 2 - 0.5);
    scene.add(doorFrame);
    
    const doorOpening = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3), new THREE.MeshBasicMaterial({ color: 0x050a10 }));
    doorOpening.position.set(0, 1.5, IGLOO_SIZE / 2 - 0.3);
    scene.add(doorOpening);
    
    const furniture = [
        { type: 'couch', position: { x: 0, z: -9 }, rotation: 0, seatHeight: 0.95, snapPoints: [{ x: -1.5, z: 0 }, { x: 0, z: 0 }, { x: 1.5, z: 0 }], interactionRadius: 3 },
        { type: 'chair', position: { x: -7.5, z: -3 }, rotation: Math.PI / 4, seatHeight: 0.8, snapPoints: [{ x: 0, z: 0 }], interactionRadius: 2 },
        { type: 'chair', position: { x: 7.5, z: -3 }, rotation: -Math.PI / 4, seatHeight: 0.8, snapPoints: [{ x: 0, z: 0 }], interactionRadius: 2 }
    ];
    
    // Room update function - handles igloo-specific animations
    const update = (time, delta) => {
        // Pulse exit glow
        if (exitGlow && exitGlow.material) {
            exitGlow.material.opacity = 0.15 + Math.sin(time * 2) * 0.08;
        }
        // Gentle beach ball bobbing
        if (beachBall && beachBall.mesh) {
            beachBall.mesh.rotation.y += delta * 0.2;
            beachBall.mesh.position.y = 0.6 + Math.sin(time * 1.5) * 0.05;
        }
    };
    
    return {
        bounds: { type: 'circular', radius: IGLOO_SIZE / 2 - 1.5, centerX: 0, centerZ: 0 },
        spawnPos: { x: 0, z: 10 },
        furniture,
        beachBall,
        colliders: furnitureColliders,
        map,
        update
    };
}

export default BaseRoom;

