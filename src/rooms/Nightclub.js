/**
 * Nightclub - Interior room for the dance club
 * Refactored to use modular props from src/props/nightclub/
 */

import BaseRoom from './BaseRoom';
import {
    DanceFloor,
    DJBooth,
    Speaker,
    StageLight,
    DiscoBall,
    DiscoLaser,
    DiscoSpotlight,
    NightclubCouch
} from '../props/nightclub';

class Nightclub extends BaseRoom {
    static ID = 'nightclub';
    static NAME = 'Nightclub';
    
    // Room dimensions (interior space)
    static ROOM_WIDTH = 40;
    static ROOM_DEPTH = 35;
    static ROOM_HEIGHT = 12;
    static CENTER_X = Nightclub.ROOM_WIDTH / 2;
    static CENTER_Z = Nightclub.ROOM_DEPTH / 2;

    constructor(THREE) {
        super(THREE);
        
        // Initialize collision system with room dimensions
        this.initCollisionSystem(Nightclub.ROOM_WIDTH, Nightclub.ROOM_DEPTH, 4);
        
        // Props using new modular system
        this.danceFloorProp = null;
        this.djBoothProp = null;
        this.discoBallProp = null;
        this.speakerProps = [];
        this.stageLightProps = [];
        this.discoLaserProps = [];
        this.discoSpotlightProps = [];
        this.couchProp = null;
        
        // Disco mode state
        this.discoMode = false;
        this.discoStartTime = 0;
        
        // Mobile GPU detection
        this.isMobileGPU = typeof window !== 'undefined' && window._isMobileGPU;
    }

    spawn(scene) {
        const THREE = this.THREE;
        const W = Nightclub.ROOM_WIDTH;
        const D = Nightclub.ROOM_DEPTH;
        const H = Nightclub.ROOM_HEIGHT;
        const CX = Nightclub.CENTER_X;
        const CZ = Nightclub.CENTER_Z;
        
        this.cleanup();
        
        // ==================== ROOM STRUCTURE ====================
        this._createRoomStructure(scene, W, D, H, CX, CZ);
        
        // ==================== DANCE FLOOR (Prop) ====================
        this.danceFloorProp = new DanceFloor(THREE);
        this.danceFloorProp.spawn(scene, CX, 0, CZ + 5, { rows: 6, cols: 8 });
        this.addProp(this.danceFloorProp);
        
        // ==================== DJ BOOTH (Prop) ====================
        this.djBoothProp = new DJBooth(THREE);
        this.djBoothProp.spawn(scene, CX, 0, 3);
        this.addProp(this.djBoothProp);
        
        // Add DJ booth landing surfaces
        this.djBoothProp.getLandingSurfaces().forEach(surface => {
            this.addLandingSurface({
                name: surface.name,
                minX: CX + surface.minX,
                maxX: CX + surface.maxX,
                minZ: 3 + surface.minZ,
                maxZ: 3 + surface.maxZ,
                height: surface.height
            });
        });
        
        // ==================== SPEAKERS (Props) ====================
        this._createSpeakers(scene, W, D, H);
        
        // ==================== STAGE LIGHTS (Props) ====================
        this._createStageLights(scene, W, H);
        
        // ==================== DISCO BALL (Prop) ====================
        this.discoBallProp = new DiscoBall(THREE);
        this.discoBallProp.spawn(scene, CX, H - 1, CZ + 3, { skipLight: this.isMobileGPU });
        this.addProp(this.discoBallProp);
        
        // ==================== LOUNGE COUCH (Prop) ====================
        this.couchProp = new NightclubCouch(THREE);
        this.couchProp.spawn(scene, 1.5, 0, 17.5, { rotation: Math.PI / 2 });
        this.addProp(this.couchProp);
        
        // Couch landing surface
        this.addLandingSurface({
            name: 'interior_couch',
            minX: 0.5, maxX: 2.5,
            minZ: 15, maxZ: 20,
            height: 1.0
        });
        
        // ==================== DISCO ELEMENTS (Props) ====================
        this._createDiscoElements(scene, W, H, CX, CZ);
        
        // ==================== UNIQUE ELEMENTS ====================
        this._createExitDoor(scene, 2, D - 5);
        this._createRecordsCrate(scene, 5, 0, 8);
        this._createStairs(scene, W - 4, CZ + 5, H);
        this._createMicStand(scene, W - 6, 0, CZ - 2);
        this._createBackWallBanner(scene, CX, D);
        
        // Records crate landing surface
        this.addLandingSurface({
            name: 'records_crate',
            minX: 4.25, maxX: 5.75,
            minZ: 7.5, maxZ: 8.5,
            height: 1
        });
        
        // ==================== AMBIENT LIGHTING ====================
        const ambient = new THREE.AmbientLight(0x050508, 0.3);
        this.addLight(ambient, scene);
        
        return { 
            meshes: this.meshes, 
            lights: this.lights, 
            collisionSystem: this.collisionSystem,
            danceFloorTiles: this.danceFloorProp.getTiles(),
            stageLights: this.stageLightProps.flatMap(p => p.meshes),
            landingSurfaces: this.landingSurfaces
        };
    }

    _createRoomStructure(scene, W, D, H, CX, CZ) {
        const THREE = this.THREE;
        
        // Floor
        const floorMat = this.createMaterial({ color: 0x0a0a0a, roughness: 0.95, metalness: 0.1 });
        const floorGeo = new THREE.PlaneGeometry(W, D);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(CX, 0, CZ);
        floor.receiveShadow = true;
        this.addMesh(floor, scene);
        
        // Walls
        const wallMat = this.createMaterial({ color: 0x0c0c0c, roughness: 0.95 });
        
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
        backWall.position.set(CX, H / 2, 0);
        this.addMesh(backWall, scene);
        
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(0, H / 2, CZ);
        this.addMesh(leftWall, scene);
        
        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(W, H / 2, CZ);
        this.addMesh(rightWall, scene);
        
        const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
        frontWall.rotation.y = Math.PI;
        frontWall.position.set(CX, H / 2, D);
        this.addMesh(frontWall, scene);
        
        // Ceiling
        const ceilingMat = this.createMaterial({ color: 0x050505, roughness: 1.0 });
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(CX, H, CZ);
        this.addMesh(ceiling, scene);
    }

    _createSpeakers(scene, W, D, H) {
        const THREE = this.THREE;
        const CZ = D / 2; // Center Z = 17.5
        
        // Speaker positions matching original commit (8 speakers total)
        const speakerConfigs = [
            // Wall-mounted speakers (left side) - facing right
            { x: 2, z: CZ - 5, scale: 1.2, rotation: Math.PI / 2 },
            { x: 2, z: CZ + 5, scale: 1.2, rotation: Math.PI / 2 },
            // Wall-mounted speakers (right side) - facing left
            { x: W - 2, z: CZ - 5, scale: 1.2, rotation: -Math.PI / 2 },
            { x: W - 2, z: CZ + 5, scale: 1.2, rotation: -Math.PI / 2 },
            // Large front speakers by DJ booth
            { x: W / 2 - 8, z: 5, scale: 1.5, rotation: 0 },
            { x: W / 2 + 8, z: 5, scale: 1.5, rotation: 0 },
            // Stack speakers behind dance floor (angled slightly)
            { x: W / 2 - 10, z: CZ + 8, scale: 1.0, rotation: Math.PI * 0.1 },
            { x: W / 2 + 10, z: CZ + 8, scale: 1.0, rotation: -Math.PI * 0.1 },
        ];
        
        speakerConfigs.forEach((config, idx) => {
            const speaker = new Speaker(THREE);
            speaker.spawn(scene, config.x, 0, config.z, { 
                scale: config.scale, 
                rotation: config.rotation 
            });
            this.addProp(speaker);
            this.speakerProps.push(speaker);
            
            // Add landing surface for each speaker (parkour)
            const size = speaker.getSize();
            this.addLandingSurface({
                name: `speaker_${idx}`,
                minX: config.x - size.width / 2 - 0.3,
                maxX: config.x + size.width / 2 + 0.3,
                minZ: config.z - size.depth / 2 - 0.3,
                maxZ: config.z + size.depth / 2 + 0.3,
                height: size.height
            });
        });
    }

    _createStageLights(scene, W, H) {
        const THREE = this.THREE;
        const CX = W / 2;
        
        const lightColors = [
            0xFF0000, 0xFF6600, 0xFFFF00, 0x00FF00,
            0x00FFFF, 0x0066FF, 0xFF00FF, 0xFF0066
        ];
        
        // Row of 10 stage lights across the ceiling (like original)
        const lightCount = 10;
        for (let i = 0; i < lightCount; i++) {
            const x = 4 + (W - 8) * (i / (lightCount - 1));
            const stageLight = new StageLight(THREE);
            stageLight.spawn(scene, x, H - 0.5, 10, { 
                color: lightColors[i % lightColors.length],
                lightIndex: i,
                skipSpotlight: this.isMobileGPU
            });
            this.addProp(stageLight);
            this.stageLightProps.push(stageLight);
        }
        
        // Side stage lights (3 on each side)
        const sideColors = [0xFF00FF, 0x00FFFF, 0xFFFF00];
        [5, W - 5].forEach((x, sideIdx) => {
            for (let i = 0; i < 3; i++) {
                const stageLight = new StageLight(THREE);
                stageLight.spawn(scene, x, H - 1, 5 + i * 8, { 
                    color: sideColors[i],
                    lightIndex: 10 + sideIdx * 3 + i,
                    skipSpotlight: this.isMobileGPU
                });
                this.addProp(stageLight);
                this.stageLightProps.push(stageLight);
            }
        });
    }

    _createDiscoElements(scene, W, H, CX, CZ) {
        const THREE = this.THREE;
        
        // Laser beams from ceiling corners
        const laserOrigins = [
            { x: 3, z: 3 }, { x: W - 3, z: 3 },
            { x: 3, z: CZ + 10 }, { x: W - 3, z: CZ + 10 },
            { x: CX, z: 2 }, { x: CX, z: CZ + 12 },
        ];
        
        const laserColors = [0xFF0040, 0x00FF40, 0x4000FF, 0xFF00FF, 0x00FFFF, 0xFFFF00];
        
        laserOrigins.forEach((origin, idx) => {
            const laser = new DiscoLaser(THREE);
            laser.spawn(scene, origin.x, H - 1.5, origin.z, {
                color: laserColors[idx % laserColors.length],
                length: 15,
                visible: false
            });
            this.addProp(laser);
            this.discoLaserProps.push(laser);
        });
        
        // Moving spotlight cones
        const spotlightPositions = [
            { x: CX - 8, z: CZ - 2 }, { x: CX + 8, z: CZ - 2 },
            { x: CX - 5, z: CZ + 8 }, { x: CX + 5, z: CZ + 8 },
        ];
        
        spotlightPositions.forEach((pos, idx) => {
            const spotlight = new DiscoSpotlight(THREE);
            spotlight.spawn(scene, pos.x, (H - 1) / 2, pos.z, {
                color: laserColors[(idx + 2) % laserColors.length],
                height: H - 1,
                visible: false
            });
            this.addProp(spotlight);
            this.discoSpotlightProps.push(spotlight);
        });
    }

    _createExitDoor(scene, x, z) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Door frame - flush against left wall (x=0)
        // Frame is 0.3 deep (X), 5 tall (Y), 3 wide (Z)
        const frameMat = this.createMaterial({ color: 0x8B7355, roughness: 0.7 });
        const frameGeo = new THREE.BoxGeometry(0.3, 5, 3);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 2.5, 0);
        group.add(frame);
        
        // Door (inset into frame)
        const doorMat = this.createMaterial({ color: 0x6B5344, roughness: 0.6 });
        const doorGeo = new THREE.BoxGeometry(0.2, 4.5, 2.4);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0.1, 2.5, 0);
        group.add(door);
        
        // Star decoration on door (facing into room)
        const starMat = this.createMaterial({
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.5,
            metalness: 0.8
        });
        
        // Create 5-pointed star using ExtrudeGeometry for cleaner look
        const starShape = new THREE.Shape();
        const outerR = 0.4;
        const innerR = 0.15;
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
            if (i === 0) {
                starShape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            } else {
                starShape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
        }
        starShape.closePath();
        
        const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.05, bevelEnabled: false });
        const star = new THREE.Mesh(starGeo, starMat);
        star.rotation.y = Math.PI / 2; // Face into room (perpendicular to wall)
        star.position.set(0.25, 3.5, 0);
        group.add(star);
        
        // EXIT sign above door (GREEN like original)
        const signMat = this.createMaterial({
            color: 0x00FF00,
            emissive: 0x00FF00,
            emissiveIntensity: 0.8
        });
        const signBackMat = this.createMaterial({ color: 0x111111 });
        const signBackGeo = new THREE.BoxGeometry(0.3, 0.6, 1.5);
        const signBack = new THREE.Mesh(signBackGeo, signBackMat);
        signBack.position.set(0.3, 5.5, 0);
        group.add(signBack);
        
        // EXIT letters (E X I T along Z axis)
        const letterWidth = 0.2;
        const letterHeight = 0.35;
        const letterGeo = new THREE.BoxGeometry(0.1, letterHeight, letterWidth);
        const exitLetters = [-0.5, -0.2, 0.1, 0.4]; // Z positions for E X I T
        exitLetters.forEach((zPos) => {
            const letter = new THREE.Mesh(letterGeo, signMat);
            letter.position.set(0.42, 5.5, zPos); // Moved forward by 0.02
            group.add(letter);
        });
        
        // Position against left wall (no rotation needed - door faces into room along +X)
        group.position.set(0, 0, z);
        scene.add(group);
        this.meshes.push(group);
        
        // Note: Exit trigger handled by VoxelWorld portal system (ROOM_PORTALS)
    }

    _createDanceContestSign(scene, x, y, z) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Sign backing
        const backMat = this.createMaterial({ color: 0x1a1a1a });
        const backGeo = new THREE.BoxGeometry(0.3, 3, 5);
        const back = new THREE.Mesh(backGeo, backMat);
        group.add(back);
        
        // Neon text effect
        const neonMat = this.createMaterial({
            color: 0xFF1493, emissive: 0xFF1493, emissiveIntensity: 0.8
        });
        const neonGeo = new THREE.BoxGeometry(0.1, 0.4, 4);
        const neon = new THREE.Mesh(neonGeo, neonMat);
        neon.position.set(0.2, 0, 0);
        group.add(neon);
        
        group.position.set(x, y, z);
        group.rotation.y = -Math.PI / 2;
        scene.add(group);
        this.meshes.push(group);
    }

    _createRecordsCrate(scene, x, y, z) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        const crateMat = this.createMaterial({ color: 0x4a3728, roughness: 0.9 });
        const crateGeo = new THREE.BoxGeometry(1.5, 1, 1);
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.y = 0.5;
        group.add(crate);
        
        // Records sticking out
        const recordMat = this.createMaterial({ color: 0x111111 });
        for (let i = 0; i < 5; i++) {
            const record = new THREE.Mesh(
                new THREE.CylinderGeometry(0.4, 0.4, 0.02, 16),
                recordMat
            );
            record.rotation.z = Math.PI / 2;
            record.position.set(0, 0.8 + i * 0.05, -0.3 + i * 0.1);
            group.add(record);
        }
        
        group.position.set(x, y, z);
        scene.add(group);
        this.meshes.push(group);
    }

    _createStairs(scene, x, z, H) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        const stepMat = this.createMaterial({ color: 0x3a3a3a });
        const stepHeight = 0.4;
        const stepDepth = 0.6;
        const stepWidth = 3;
        const totalSteps = 30;
        
        for (let i = 0; i < totalSteps; i++) {
            const step = new THREE.Mesh(
                new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth),
                stepMat
            );
            step.position.set(0, stepHeight / 2 + i * stepHeight, -i * stepDepth);
            step.castShadow = true;
            step.receiveShadow = true;
            group.add(step);
        }
        
        // Neon accents every 5 steps
        const neonMat = this.createMaterial({
            color: 0x00FFFF, emissive: 0x00FFFF, emissiveIntensity: 0.6
        });
        for (let i = 0; i < totalSteps; i += 5) {
            const neon = new THREE.Mesh(
                new THREE.BoxGeometry(stepWidth - 0.4, 0.05, 0.08),
                neonMat
            );
            neon.position.set(0, i * stepHeight + stepHeight + 0.03, -i * stepDepth + stepDepth * 0.3);
            group.add(neon);
        }
        
        group.position.set(x, 0, z);
        scene.add(group);
        this.meshes.push(group);
    }

    _createMicStand(scene, x, y, z) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        const metalMat = this.createMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.3 });
        
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), metalMat);
        base.position.y = 0.05;
        group.add(base);
        
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.8, 8), metalMat);
        stand.position.y = 1;
        group.add(stand);
        
        const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), metalMat);
        boom.rotation.z = Math.PI / 3;
        boom.position.set(0.3, 1.9, 0);
        group.add(boom);
        
        const micMat = this.createMaterial({ color: 0x333333 });
        const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.25, 12), micMat);
        mic.position.set(0.6, 2.1, 0);
        mic.rotation.z = -Math.PI / 6;
        group.add(mic);
        
        const grilleMat = this.createMaterial({ color: 0x888888, metalness: 0.6 });
        const grille = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), grilleMat);
        grille.position.set(0.68, 2.2, 0);
        group.add(grille);
        
        group.position.set(x, y, z);
        scene.add(group);
        this.meshes.push(group);
    }

    _createBackWallBanner(scene, cx, backWallZ) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        const bannerWidth = 15;
        const bannerHeight = 5;
        
        // Load texture
        const textureLoader = new THREE.TextureLoader();
        const bannerTexture = textureLoader.load('/advert.png');
        bannerTexture.colorSpace = THREE.SRGBColorSpace;
        
        // Frame
        const frameMat = this.createMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
        
        [1, -1].forEach(dir => {
            const topBottom = new THREE.Mesh(
                new THREE.BoxGeometry(bannerWidth + 0.4, 0.2, 0.3),
                frameMat
            );
            topBottom.position.set(0, dir * (bannerHeight / 2 + 0.1), 0);
            group.add(topBottom);
            
            const side = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, bannerHeight + 0.4, 0.3),
                frameMat
            );
            side.position.set(dir * (bannerWidth / 2 + 0.1), 0, 0);
            group.add(side);
        });
        
        // Banner
        const bannerMat = new THREE.MeshStandardMaterial({
            map: bannerTexture,
            emissive: 0xffffff,
            emissiveMap: bannerTexture,
            emissiveIntensity: 0.3,
            roughness: 0.5
        });
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(bannerWidth, bannerHeight), bannerMat);
        banner.position.z = 0.05;
        group.add(banner);
        this.materials.push(bannerMat);
        
        group.position.set(cx, 5, backWallZ - 0.3);
        group.rotation.y = Math.PI;
        scene.add(group);
        this.meshes.push(group);
    }

    update(time, delta, nightFactor = 0.5) {
        // Call parent update for all props
        super.update(time, delta, nightFactor);
        
        const beatPhase = Math.sin(time * 8) * 0.5 + 0.5;
        
        // ==================== DISCO MODE TIMING ====================
        const DISCO_INTERVAL = 300; // 5 minutes
        const DISCO_DURATION = 60;  // 1 minute
        
        const realTimeSeconds = Math.floor(Date.now() / 1000);
        const cycleTime = realTimeSeconds % DISCO_INTERVAL;
        const shouldBeDiscoMode = cycleTime < DISCO_DURATION;
        
        // Toggle disco mode
        if (shouldBeDiscoMode && !this.discoMode) {
            this.discoMode = true;
            this.discoStartTime = time;
            this.discoLaserProps.forEach(laser => laser.setVisible(true));
            this.discoSpotlightProps.forEach(spot => spot.setVisible(true));
            if (this.discoBallProp) this.discoBallProp.setDiscoMode(true);
        } else if (!shouldBeDiscoMode && this.discoMode) {
            this.discoMode = false;
            this.discoLaserProps.forEach(laser => laser.setVisible(false));
            this.discoSpotlightProps.forEach(spot => spot.setVisible(false));
            if (this.discoBallProp) this.discoBallProp.setDiscoMode(false);
        }
        
        // Update disco elements with disco time
        if (this.discoMode) {
            const discoTime = time - this.discoStartTime;
            this.discoLaserProps.forEach((laser, idx) => {
                laser.updateDiscoAnimation(discoTime, idx, beatPhase);
            });
            this.discoSpotlightProps.forEach((spot, idx) => {
                spot.updateDiscoAnimation(discoTime, idx, beatPhase);
            });
        }
        
        // Update stage lights with beat phase
        this.stageLightProps.forEach((light, idx) => {
            light.updateWithBeat(time, beatPhase, idx);
        });
    }

    cleanup() {
        // Cleanup props
        super.cleanup();
        
        // Reset references
        this.danceFloorProp = null;
        this.djBoothProp = null;
        this.discoBallProp = null;
        this.speakerProps = [];
        this.stageLightProps = [];
        this.discoLaserProps = [];
        this.discoSpotlightProps = [];
        this.couchProp = null;
        this.discoMode = false;
    }

    getSpawnPosition() {
        return {
            x: Nightclub.CENTER_X,
            z: Nightclub.ROOM_DEPTH - 5
        };
    }
    
    /**
     * Check player landing on nightclub surfaces (dance floor, DJ booth, speakers, stairs)
     * Returns { canLand: boolean, landingY: number }
     */
    checkLanding(px, pz, py, isDescending = true) {
        let groundHeight = 0;
        let foundGround = false;
        
        const rd = this.roomData;
        if (!rd) return { canLand: false, landingY: 0 };
        
        // Dance floor - ALWAYS lift player when on it
        if (rd.danceFloor) {
            const df = rd.danceFloor;
            if (px >= df.minX && px <= df.maxX && pz >= df.minZ && pz <= df.maxZ) {
                if (py <= df.height + 0.3 && df.height > groundHeight) {
                    groundHeight = df.height;
                    foundGround = true;
                }
            }
        }
        
        // DJ Booth platform
        if (rd.djBooth) {
            const dj = rd.djBooth;
            if (px >= dj.minX && px <= dj.maxX && pz >= dj.minZ && pz <= dj.maxZ) {
                if (py <= dj.height + 0.3 && dj.height > groundHeight) {
                    groundHeight = dj.height;
                    foundGround = true;
                }
            }
        }
        
        // DJ Booth steps (walk-up ramp behavior)
        const CX_DJ = 20;
        const CZ_DJ = 3;
        const djStepWidth = 3.5;
        const djStepDepth = 1.2;
        const djStepHeights = [0.73, 0.48, 0.24];
        
        // Left front steps
        const leftStepX = CX_DJ - 4.5;
        if (px >= leftStepX - djStepWidth/2 && px <= leftStepX + djStepWidth/2) {
            for (let i = 0; i < 3; i++) {
                const stepZ = CZ_DJ + 4.2 + i * djStepDepth;
                const stepTop = djStepHeights[i];
                if (pz >= stepZ - djStepDepth/2 && pz <= stepZ + djStepDepth/2) {
                    if (py <= stepTop + 0.3 && stepTop > groundHeight) {
                        groundHeight = stepTop;
                        foundGround = true;
                    }
                }
            }
        }
        
        // Right front steps
        const rightStepX = CX_DJ + 4.5;
        if (px >= rightStepX - djStepWidth/2 && px <= rightStepX + djStepWidth/2) {
            for (let i = 0; i < 3; i++) {
                const stepZ = CZ_DJ + 4.2 + i * djStepDepth;
                const stepTop = djStepHeights[i];
                if (pz >= stepZ - djStepDepth/2 && pz <= stepZ + djStepDepth/2) {
                    if (py <= stepTop + 0.3 && stepTop > groundHeight) {
                        groundHeight = stepTop;
                        foundGround = true;
                    }
                }
            }
        }
        
        // Speaker landing (only when falling)
        if (rd.speakers && isDescending) {
            for (const spk of rd.speakers) {
                const sMinX = spk.x - spk.w / 2 - 0.3;
                const sMaxX = spk.x + spk.w / 2 + 0.3;
                const sMinZ = spk.z - spk.d / 2 - 0.3;
                const sMaxZ = spk.z + spk.d / 2 + 0.3;
                
                if (px >= sMinX && px <= sMaxX && pz >= sMinZ && pz <= sMaxZ) {
                    if (py <= spk.h + 0.5 && py >= spk.h - 1 && spk.h > groundHeight) {
                        groundHeight = spk.h;
                        foundGround = true;
                    }
                }
            }
        }
        
        // Stairs landing
        if (rd.stairs) {
            const st = rd.stairs;
            const stMinX = st.x - st.width / 2;
            const stMaxX = st.x + st.width / 2;
            
            if (px >= stMinX && px <= stMaxX) {
                const distFromStart = st.startZ - pz;
                if (distFromStart >= 0) {
                    const stepIndex = Math.floor(distFromStart / st.stepDepth);
                    if (stepIndex >= 0 && stepIndex < st.totalSteps) {
                        const stepY = (stepIndex + 1) * st.stepHeight;
                        if (py <= stepY + 0.5 && stepY > groundHeight) {
                            groundHeight = stepY;
                            foundGround = true;
                        }
                    }
                }
            }
        }
        
        // Records crate landing
        if (rd.recordsCrate) {
            const crate = rd.recordsCrate;
            const cMinX = crate.x - crate.w / 2 - 0.2;
            const cMaxX = crate.x + crate.w / 2 + 0.2;
            const cMinZ = crate.z - crate.d / 2 - 0.2;
            const cMaxZ = crate.z + crate.d / 2 + 0.2;
            
            if (px >= cMinX && px <= cMaxX && pz >= cMinZ && pz <= cMaxZ) {
                if (py <= crate.h + 0.5 && py >= crate.h - 1 && crate.h > groundHeight) {
                    groundHeight = crate.h;
                    foundGround = true;
                }
            }
        }
        
        // Landing surfaces (couch, etc.)
        if (rd.landingSurfaces) {
            for (const surface of rd.landingSurfaces) {
                const isOver = px >= surface.minX && px <= surface.maxX &&
                               pz >= surface.minZ && pz <= surface.maxZ;
                
                if (isOver && py <= surface.height + 0.5 && py >= surface.height - 1.0) {
                    if (surface.height >= groundHeight) {
                        groundHeight = surface.height;
                        foundGround = true;
                    }
                }
            }
        }
        
        return { canLand: foundGround, landingY: groundHeight };
    }
    
    /**
     * Get all room data for VoxelWorld integration
     * Contains bounds, furniture, DJ spots, collision areas, etc.
     */
    getRoomData() {
        const W = Nightclub.ROOM_WIDTH;
        const D = Nightclub.ROOM_DEPTH;
        const CX = W / 2;
        
        // Dance floor dimensions
        const danceFloorWidth = 8 * 2.1; // ~16.8
        const danceFloorDepth = 6 * 2.1; // ~12.6
        const danceFloorCenterZ = D / 2 + 5; // 22.5
        
        // Store for checkLanding use
        this.roomData = {
            bounds: {
                minX: 0,
                maxX: W,
                minZ: 0,
                maxZ: D
            },
            spawnPos: this.getSpawnPosition(),
            nightclub: this,
            // Dance floor - raised platform player walks ON
            danceFloor: {
                minX: CX - danceFloorWidth / 2 - 0.5,
                maxX: CX + danceFloorWidth / 2 + 0.5,
                minZ: danceFloorCenterZ - danceFloorDepth / 2 - 0.5,
                maxZ: danceFloorCenterZ + danceFloorDepth / 2 + 0.5,
                height: 0.4
            },
            // DJ booth platform
            djBooth: {
                minX: CX - 6,
                maxX: CX + 6,
                minZ: 0,
                maxZ: 6,
                height: 0.75
            },
            // Equipment rack
            equipmentRack: {
                minX: CX - 1.5,
                maxX: CX + 1.5,
                minZ: 0,
                maxZ: 2,
                height: 2.75
            },
            // Speakers
            speakers: [
                { x: 2, z: D / 2 - 5, w: 2.5, d: 2, h: 4.8 },
                { x: 2, z: D / 2 + 5, w: 2.5, d: 2, h: 4.8 },
                { x: W - 2, z: D / 2 - 5, w: 2.5, d: 2, h: 4.8 },
                { x: W - 2, z: D / 2 + 5, w: 2.5, d: 2, h: 4.8 },
                { x: W / 2 - 8, z: 5, w: 3, d: 2.5, h: 6 },
                { x: W / 2 + 8, z: 5, w: 3, d: 2.5, h: 6 },
                { x: W / 2 - 10, z: D / 2 + 8, w: 2, d: 1.5, h: 4 },
                { x: W / 2 + 10, z: D / 2 + 8, w: 2, d: 1.5, h: 4 },
            ],
            // Stairs
            stairs: {
                x: W - 4,
                startZ: D / 2 + 5,
                stepHeight: 0.4,
                stepDepth: 0.6,
                width: 3,
                totalSteps: 30
            },
            // Records crate
            recordsCrate: { x: 5, z: 8, w: 1.5, d: 1.5, h: 1 },
            // Landing surfaces
            landingSurfaces: this.landingSurfaces || [],
            // Furniture for sitting
            furniture: [
                {
                    type: 'couch',
                    position: { x: 1.5, z: 17.5 },
                    rotation: Math.PI / 2,
                    seatHeight: 0.95,
                    snapPoints: [
                        { x: -1.5, z: 0 },
                        { x: 0, z: 0 },
                        { x: 1.5, z: 0 }
                    ],
                    interactionRadius: 3
                }
            ],
            // DJ spots
            djSpots: [
                {
                    id: 'dj_left',
                    position: { x: CX - 2.2, z: 2.85 },
                    standHeight: 0.75,
                    rotation: 0,
                    interactionRadius: 1.5
                },
                {
                    id: 'dj_right',
                    position: { x: CX + 2.2, z: 2.85 },
                    standHeight: 0.75,
                    rotation: 0,
                    interactionRadius: 1.5
                }
            ]
        };
        
        return this.roomData;
    }
    
    /**
     * Get solid objects for collision detection
     */
    getSolidObjects() {
        const W = Nightclub.ROOM_WIDTH;
        const D = Nightclub.ROOM_DEPTH;
        const CX = W / 2;
        
        return [
            // DJ Platform
            { minX: CX - 6, maxX: CX + 6, minZ: 0, maxZ: 6, top: 0.75, name: 'dj_platform' },
            // Equipment rack
            { minX: CX - 1.5, maxX: CX + 1.5, minZ: 1, maxZ: 2, top: 2.75, name: 'equipment_rack' },
            // DJ desk
            { minX: CX - 4, maxX: CX + 4, minZ: 3, maxZ: 5, top: 1.35, name: 'dj_desk' },
            // Records crate
            { minX: 4.4, maxX: 5.6, minZ: 7.5, maxZ: 8.5, top: 1.0, name: 'records_crate' },
            // Mic stand
            { minX: 33.5, maxX: 34.5, minZ: 15, maxZ: 16, top: 2.2, name: 'mic_stand' },
            // Speakers - Wall mounted
            { minX: 0.8, maxX: 3.2, minZ: 11.5, maxZ: 13.5, top: 4.8, name: 'speaker_left1' },
            { minX: 0.8, maxX: 3.2, minZ: 21.5, maxZ: 23.5, top: 4.8, name: 'speaker_left2' },
            { minX: 36.8, maxX: 39.2, minZ: 11.5, maxZ: 13.5, top: 4.8, name: 'speaker_right1' },
            { minX: 36.8, maxX: 39.2, minZ: 21.5, maxZ: 23.5, top: 4.8, name: 'speaker_right2' },
            // Speakers - Large front
            { minX: 10.5, maxX: 13.5, minZ: 3.9, maxZ: 6.1, top: 6.0, name: 'speaker_front_left' },
            { minX: 26.5, maxX: 29.5, minZ: 3.9, maxZ: 6.1, top: 6.0, name: 'speaker_front_right' },
            // Speakers - Back
            { minX: 9, maxX: 11, minZ: 24.8, maxZ: 26.3, top: 4.0, name: 'speaker_back_left' },
            { minX: 29, maxX: 31, minZ: 24.8, maxZ: 26.3, top: 4.0, name: 'speaker_back_right' },
            // Dance contest sign
            { minX: 38.5, maxX: 39.5, minZ: 24, maxZ: 27, top: 7, name: 'dance_contest_sign' },
            // Exit door frame
            { minX: 0, maxX: 0.5, minZ: 28.5, maxZ: 31.5, top: 5, name: 'exit_door_frame' },
        ];
    }
    
    /**
     * Check player movement and handle collision
     * @returns { x, z, collided }
     */
    checkPlayerMovement(currentX, currentZ, nextX, nextZ, playerRadius = 0.6, playerY = 0) {
        const W = Nightclub.ROOM_WIDTH;
        const D = Nightclub.ROOM_DEPTH;
        const WALL = 0.5;
        const solidObjects = this.getSolidObjects();
        
        let finalX = nextX;
        let finalZ = nextZ;
        let collided = false;
        
        // Check box collision (skip if player is above object)
        const checkBoxCollision = (px, pz, box) => {
            if (playerY >= box.top - 0.1) return false;
            return px > box.minX - playerRadius && px < box.maxX + playerRadius &&
                   pz > box.minZ - playerRadius && pz < box.maxZ + playerRadius;
        };
        
        // Check collision with each solid object
        for (const obj of solidObjects) {
            if (checkBoxCollision(finalX, finalZ, obj)) {
                collided = true;
                // Try sliding along X axis
                const canSlideX = !checkBoxCollision(finalX, currentZ, obj);
                // Try sliding along Z axis
                const canSlideZ = !checkBoxCollision(currentX, finalZ, obj);
                
                if (canSlideX && !canSlideZ) {
                    finalZ = currentZ;
                } else if (canSlideZ && !canSlideX) {
                    finalX = currentX;
                } else if (!canSlideX && !canSlideZ) {
                    finalX = currentX;
                    finalZ = currentZ;
                }
            }
        }
        
        // Clamp to room bounds (walls)
        if (finalX < WALL) { finalX = WALL; collided = true; }
        if (finalX > W - WALL) { finalX = W - WALL; collided = true; }
        if (finalZ < WALL) { finalZ = WALL; collided = true; }
        if (finalZ > D - WALL) { finalZ = D - WALL; collided = true; }
        
        return { x: finalX, z: finalZ, collided };
    }
}

export default Nightclub;
