import PropsFactory from '../engine/PropsFactory';
import CollisionSystem from '../engine/CollisionSystem';

/**
 * Nightclub - Interior room for the dance club
 * 
 * Features:
 * - Animated LED dance floor with color patterns
 * - DJ booth with turntables and equipment
 * - Large speakers with bass animation
 * - Stage lights with color cycling
 * - Exit door back to Town Center
 * - Dance Contest sign
 * - Industrial club aesthetic
 */
class Nightclub {
    static ID = 'nightclub';
    static NAME = 'Nightclub';
    
    // Room dimensions (interior space)
    static ROOM_WIDTH = 40;
    static ROOM_DEPTH = 35;
    static ROOM_HEIGHT = 12;
    static CENTER_X = Nightclub.ROOM_WIDTH / 2;
    static CENTER_Z = Nightclub.ROOM_DEPTH / 2;

    constructor(THREE) {
        this.THREE = THREE;
        this.propsFactory = new PropsFactory(THREE);
        this.collisionSystem = new CollisionSystem(
            Nightclub.ROOM_WIDTH,
            Nightclub.ROOM_DEPTH,
            4
        );
        
        this.propMeshes = [];
        this.lights = [];
        this.danceFloorTiles = [];
        this.stageLights = [];
        this.speakers = [];
        this.speakerPositions = []; // Store speaker positions for landing
        this.animatedElements = [];
        this.landingSurfaces = []; // Surfaces player can land on
        
        // Disco mode - lasers and moving lights
        this.discoLasers = [];
        this.discoSpotlights = [];
        this.discoMode = false;
        this.discoStartTime = 0;
        this.lastDiscoCheck = 0;
    }

    /**
     * Spawn the nightclub interior
     */
    spawn(scene) {
        const THREE = this.THREE;
        const W = Nightclub.ROOM_WIDTH;
        const D = Nightclub.ROOM_DEPTH;
        const H = Nightclub.ROOM_HEIGHT;
        const CX = Nightclub.CENTER_X;
        const CZ = Nightclub.CENTER_Z;
        
        // Mobile GPU detection - skip expensive lights on mobile for performance
        const isMobileGPU = typeof window !== 'undefined' && window._isMobileGPU;
        this.isMobileGPU = isMobileGPU;
        
        this.cleanup();
        
        // Neon colors
        const neonPink = 0xFF1493;
        const neonBlue = 0x00BFFF;
        const neonPurple = 0x9400D3;
        const neonGreen = 0x39FF14;
        const neonYellow = 0xFFFF00;
        const neonOrange = 0xFF6600;
        const neonRed = 0xFF0040;
        const neonCyan = 0x00FFFF;
        
        // ==================== FLOOR ====================
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x0a0a0a,  // Very dark floor
            roughness: 0.95,
            metalness: 0.1
        });
        const floorGeo = new THREE.PlaneGeometry(W, D);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(CX, 0, CZ);
        floor.receiveShadow = true;
        scene.add(floor);
        this.propMeshes.push(floor);
        
        // ==================== WALLS ====================
        const wallMat = new THREE.MeshStandardMaterial({ 
            color: 0x0c0c0c,  // Very dark walls - absorb light
            roughness: 0.95
        });
        
        // Back wall (behind DJ booth)
        const backWallGeo = new THREE.PlaneGeometry(W, H);
        const backWall = new THREE.Mesh(backWallGeo, wallMat);
        backWall.position.set(CX, H / 2, 0);
        scene.add(backWall);
        this.propMeshes.push(backWall);
        
        // Left wall
        const leftWallGeo = new THREE.PlaneGeometry(D, H);
        const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(0, H / 2, CZ);
        scene.add(leftWall);
        this.propMeshes.push(leftWall);
        
        // Right wall
        const rightWall = new THREE.Mesh(leftWallGeo, wallMat);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(W, H / 2, CZ);
        scene.add(rightWall);
        this.propMeshes.push(rightWall);
        
        // Front wall (with entrance)
        const frontWallGeo = new THREE.PlaneGeometry(W, H);
        const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
        frontWall.rotation.y = Math.PI;
        frontWall.position.set(CX, H / 2, D);
        scene.add(frontWall);
        this.propMeshes.push(frontWall);
        
        // Ceiling - pitch black
        const ceilingMat = new THREE.MeshStandardMaterial({ 
            color: 0x050505,
            roughness: 1.0
        });
        const ceilingGeo = new THREE.PlaneGeometry(W, D);
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(CX, H, CZ);
        scene.add(ceiling);
        this.propMeshes.push(ceiling);
        
        // ==================== DANCE FLOOR ====================
        this._createDanceFloor(scene, CX, CZ + 5);
        
        // ==================== DJ BOOTH ====================
        this._createDJBooth(scene, CX, 3);
        
        // ==================== SPEAKERS ====================
        this._createSpeakers(scene, W, D, H);
        
        // ==================== STAGE LIGHTS ====================
        this._createStageLights(scene, W, H);
        
        // ==================== EXIT DOOR ====================
        // Exit on the LEFT wall near the front corner
        this._createExitDoor(scene, 2, D - 5);
        
        // ==================== DANCE CONTEST SIGN ====================
        this._createDanceContestSign(scene, W - 1, 5, CZ + 8);
        
        // ==================== RECORDS CRATE ====================
        this._createRecordsCrate(scene, 5, 0, 8);
        
        // ==================== STAIRS ====================
        this._createStairs(scene, W - 4, CZ + 5);
        
        // ==================== MICROPHONE STAND ====================
        this._createMicStand(scene, W - 6, 0, CZ - 2);
        
        // ==================== LOUNGE COUCH ====================
        // Blue couch flush against left wall (x=1.5), between the two speaker stacks (z~17.5)
        this._createBlueCouch(scene, 1.5, 0, 17.5);
        
        // Couch collision/landing surface (rotated 90 degrees, so width and depth swap)
        // Position: (1.5, 0, 17.5), rotation: Math.PI/2
        // Original: 5 wide (X) x 2 deep (Z), after rotation: 2 wide (X) x 5 deep (Z)
        this.landingSurfaces.push({
            name: 'interior_couch',
            minX: 0.5, maxX: 2.5,       // Couch X: 1.5 ± 1 (half of rotated depth 2)
            minZ: 15, maxZ: 20,         // Couch Z: 17.5 ± 2.5 (half of rotated width 5)
            height: 1.0                  // Seat surface height (base 0.8 + cushion)
        });
        
        // ==================== AMBIENT LIGHTING ====================
        // Minimal ambient light - dark club aesthetic where only actual lights illuminate
        const ambient = new THREE.AmbientLight(0x050508, 0.3);
        scene.add(ambient);
        this.lights.push(ambient);
        
        // No atmospheric point lights - only actual light fixtures illuminate the space
        
        // ==================== DISCO BALL (interior) ====================
        this._createDiscoBall(scene, CX, H - 1, CZ + 3);
        
        // ==================== BACK WALL BANNER ====================
        this._createBackWallBanner(scene, CX, D);
        
        // ==================== DISCO MODE (Lasers & Moving Lights) ====================
        this._createDiscoElements(scene, W, H, CX, CZ);
        
        // ==================== COLLISION & LANDING ====================
        // All collision is handled by VoxelWorld using simple bounds (like pizza parlor)
        // We just need to track landing surfaces for the return value
        
        // DJ Booth platform - landable surface (platform top is at 0.75)
        this.landingSurfaces.push({
            name: 'dj_platform',
            minX: CX - 6, maxX: CX + 6,
            minZ: 0, maxZ: 6,
            height: 0.75
        });
        
        // DJ Booth desk (on top of platform) - landable
        this.landingSurfaces.push({
            name: 'dj_desk',
            minX: CX - 4, maxX: CX + 4,
            minZ: 2, maxZ: 4,
            height: 2.7
        });
        
        // Records crate - landable
        this.landingSurfaces.push({
            name: 'records_crate',
            minX: 4.25, maxX: 5.75,
            minZ: 7.5, maxZ: 8.5,
            height: 1
        });
        
        return { 
            meshes: this.propMeshes, 
            lights: this.lights, 
            collisionSystem: this.collisionSystem,
            danceFloorTiles: this.danceFloorTiles,
            stageLights: this.stageLights,
            landingSurfaces: this.landingSurfaces
        };
    }

    /**
     * Create the LED dance floor
     */
    _createDanceFloor(scene, cx, cz) {
        const THREE = this.THREE;
        const tileSize = 2;
        const gap = 0.1;
        const rows = 6;
        const cols = 8;
        const totalWidth = cols * (tileSize + gap);
        const totalDepth = rows * (tileSize + gap);
        const startX = cx - totalWidth / 2;
        const startZ = cz - totalDepth / 2;
        
        // Dance floor colors
        const danceColors = [
            0xFF0000, // Red
            0xFFFF00, // Yellow
            0x00FF00, // Green
            0x00FFFF, // Cyan
            0xFF00FF, // Magenta
            0xFFFFFF, // White
            0xFF6600, // Orange
            0x00FF66, // Spring green
        ];
        
        // Floor base (dark frame)
        const baseMat = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            roughness: 0.9
        });
        const baseGeo = new THREE.BoxGeometry(totalWidth + 1, 0.3, totalDepth + 1);
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(cx, 0.15, cz);
        scene.add(base);
        this.propMeshes.push(base);
        
        // Create tiles
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const colorIdx = (row + col) % danceColors.length;
                const color = danceColors[colorIdx];
                
                const tileMat = new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.6,
                    roughness: 0.3,
                    metalness: 0.1
                });
                
                const tileGeo = new THREE.BoxGeometry(tileSize, 0.15, tileSize);
                const tile = new THREE.Mesh(tileGeo, tileMat);
                
                const x = startX + col * (tileSize + gap) + tileSize / 2;
                const z = startZ + row * (tileSize + gap) + tileSize / 2;
                
                tile.position.set(x, 0.38, z);
                tile.userData.isDanceFloorTile = true;
                tile.userData.tileRow = row;
                tile.userData.tileCol = col;
                tile.userData.baseColor = color;
                
                scene.add(tile);
                this.propMeshes.push(tile);
                this.danceFloorTiles.push(tile);
            }
        }
        
        // Dance floor is purely visual - no collision needed
        // Dancing prompt can be handled by VoxelWorld if needed
    }

    /**
     * Create the DJ booth with equipment
     */
    _createDJBooth(scene, cx, cz) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Elevated platform (lowered by 50% for penguin scale)
        const platformMat = new THREE.MeshStandardMaterial({ 
            color: 0x4a4a4a,
            roughness: 0.7
        });
        const platformGeo = new THREE.BoxGeometry(12, 0.75, 6);
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.set(0, 0.375, 0);
        platform.castShadow = true;
        platform.receiveShadow = true;
        group.add(platform);
        
        // Steps up to platform (in FRONT of platform, leading up from dance floor)
        // Platform: 12 wide (x: -6 to +6), 6 deep (z: -3 to +3), top at y=0.75
        // Platform front edge is at z=3 (local), steps extend from z=3 outward
        const stepMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
        const stepHeights = [0.24, 0.48, 0.73]; // 3 steps, top one 0.02 below platform
        
        // LEFT front steps (left side of center)
        for (let i = 0; i < 3; i++) {
            const stepGeo = new THREE.BoxGeometry(3.5, 0.24, 1.2);
            const step = new THREE.Mesh(stepGeo, stepMat);
            // Steps go from z=6.6 (furthest, lowest) to z=4.2 (closest to platform, highest)
            // Top step at z=4.2 connects to platform front edge at z=3
            step.position.set(-4.5, stepHeights[2-i] / 2, 4.2 + i * 1.2);
            step.castShadow = true;
            step.receiveShadow = true;
            group.add(step);
        }
        
        // RIGHT front steps (right side of center)
        for (let i = 0; i < 3; i++) {
            const stepGeo = new THREE.BoxGeometry(3.5, 0.24, 1.2);
            const step = new THREE.Mesh(stepGeo, stepMat);
            step.position.set(4.5, stepHeights[2-i] / 2, 4.2 + i * 1.2);
            step.castShadow = true;
            step.receiveShadow = true;
            group.add(step);
        }
        
        // DJ desk (lowered proportionally)
        const deskMat = new THREE.MeshStandardMaterial({ 
            color: 0x2a2a2a,
            roughness: 0.6
        });
        const deskGeo = new THREE.BoxGeometry(8, 0.6, 2);
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(0, 1.05, 1);
        group.add(desk);
        
        // Turntables (2) - LOWERED to match platform
        const ttMat = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            roughness: 0.5
        });
        [-2.2, 2.2].forEach((x, idx) => {
            // Base (sits on desk top at ~1.35)
            const ttBaseGeo = new THREE.BoxGeometry(2, 0.2, 1.8);
            const ttBase = new THREE.Mesh(ttBaseGeo, ttMat);
            ttBase.position.set(x, 1.45, 1);
            group.add(ttBase);
            
            // Platter
            const platterMat = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                roughness: 0.3,
                metalness: 0.5
            });
            const platterGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 24);
            const platter = new THREE.Mesh(platterGeo, platterMat);
            platter.position.set(x, 1.6, 1);
            platter.userData.isTurntable = true;
            platter.userData.turntableIndex = idx;
            group.add(platter);
            this.animatedElements.push(platter);
            
            // Record on platter
            const recordMat = new THREE.MeshStandardMaterial({ 
                color: 0x111111,
                roughness: 0.2
            });
            const recordGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.02, 24);
            const record = new THREE.Mesh(recordGeo, recordMat);
            record.position.set(x, 1.65, 1);
            record.userData.isTurntable = true;
            record.userData.turntableIndex = idx;
            group.add(record);
            this.animatedElements.push(record);
            
            // Record label
            const labelMat = new THREE.MeshStandardMaterial({ 
                color: idx === 0 ? 0xFF0000 : 0x00FF00,
                roughness: 0.4
            });
            const labelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.025, 16);
            const label = new THREE.Mesh(labelGeo, labelMat);
            label.position.set(x, 1.67, 1);
            label.userData.isTurntable = true;
            label.userData.turntableIndex = idx;
            group.add(label);
            this.animatedElements.push(label);
            
            // Tonearm
            const armMat = new THREE.MeshStandardMaterial({ 
                color: 0x888888,
                metalness: 0.8
            });
            const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6);
            const arm = new THREE.Mesh(armGeo, armMat);
            arm.rotation.z = Math.PI / 4;
            arm.position.set(x + 0.5, 1.75, 1.3);
            group.add(arm);
        });
        
        // Mixer (center) - LOWERED
        const mixerMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const mixerGeo = new THREE.BoxGeometry(1.5, 0.3, 1.2);
        const mixer = new THREE.Mesh(mixerGeo, mixerMat);
        mixer.position.set(0, 1.5, 1);
        group.add(mixer);
        
        // Mixer knobs - LOWERED
        const knobMat = new THREE.MeshStandardMaterial({ 
            color: 0xCCCCCC,
            metalness: 0.7
        });
        for (let i = 0; i < 6; i++) {
            const knobGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8);
            const knob = new THREE.Mesh(knobGeo, knobMat);
            knob.position.set(-0.5 + i * 0.2, 1.7, 0.8);
            group.add(knob);
        }
        
        // Faders - LOWERED
        for (let i = 0; i < 3; i++) {
            const faderGeo = new THREE.BoxGeometry(0.08, 0.02, 0.4);
            const fader = new THREE.Mesh(faderGeo, knobMat);
            fader.position.set(-0.3 + i * 0.3, 1.67, 1.2);
            group.add(fader);
        }
        
        // Equipment rack behind DJ - LOWERED
        const rackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        const rackGeo = new THREE.BoxGeometry(3, 2, 1);
        const rack = new THREE.Mesh(rackGeo, rackMat);
        rack.position.set(0, 1.75, -1.5);
        group.add(rack);
        
        // Equipment LEDs on rack - LOWERED
        const ledColors = [0xFF0000, 0x00FF00, 0xFFFF00, 0x00FFFF];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 8; col++) {
                const ledMat = new THREE.MeshStandardMaterial({
                    color: ledColors[row % ledColors.length],
                    emissive: ledColors[row % ledColors.length],
                    emissiveIntensity: 0.8
                });
                const ledGeo = new THREE.BoxGeometry(0.1, 0.08, 0.05);
                const led = new THREE.Mesh(ledGeo, ledMat);
                led.position.set(-1.2 + col * 0.3, 1.0 + row * 0.4, -0.95);
                led.userData.isRackLED = true;
                led.userData.ledRow = row;
                led.userData.ledCol = col;
                group.add(led);
                this.animatedElements.push(led);
            }
        }
        
        // Headphones on desk
        const hpMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const hpBandGeo = new THREE.TorusGeometry(0.2, 0.03, 8, 16, Math.PI);
        const hpBand = new THREE.Mesh(hpBandGeo, hpMat);
        hpBand.position.set(3.2, 2.9, 1);
        hpBand.rotation.z = Math.PI / 2;
        group.add(hpBand);
        
        // Headphone cups
        [-1, 1].forEach(side => {
            const cupGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
            const cup = new THREE.Mesh(cupGeo, hpMat);
            cup.rotation.x = Math.PI / 2;
            cup.position.set(3.2, 2.7 + side * 0.2, 1);
            group.add(cup);
        });
        
        group.position.set(cx, 0, cz);
        scene.add(group);
        this.propMeshes.push(group);
        
        // DJ booth is a LANDING surface, not a solid blocker
        // Collision handled in spawn() via landingSurfaces
    }

    /**
     * Create large speakers around the room
     */
    _createSpeakers(scene, W, D, H) {
        const THREE = this.THREE;
        
        const createSpeaker = (x, z, scale, rotation) => {
            const group = new THREE.Group();
            const sw = 2 * scale;
            const sh = 4 * scale;
            const sd = 1.5 * scale;
            
            // Cabinet
            const cabMat = new THREE.MeshStandardMaterial({ 
                color: 0x1a1a1a,
                roughness: 0.7
            });
            const cabGeo = new THREE.BoxGeometry(sw, sh, sd);
            const cab = new THREE.Mesh(cabGeo, cabMat);
            cab.position.y = sh / 2;
            cab.castShadow = true;
            group.add(cab);
            
            // Grille
            const grilleMat = new THREE.MeshStandardMaterial({ 
                color: 0x2a2a2a,
                roughness: 0.5
            });
            const grilleGeo = new THREE.BoxGeometry(sw - 0.2, sh - 0.2, 0.1);
            const grille = new THREE.Mesh(grilleGeo, grilleMat);
            grille.position.set(0, sh / 2, sd / 2 + 0.05);
            group.add(grille);
            
            // Woofer
            const wooferMat = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                roughness: 0.4
            });
            const wooferGeo = new THREE.CylinderGeometry(sw * 0.35, sw * 0.4, 0.3, 20);
            const woofer = new THREE.Mesh(wooferGeo, wooferMat);
            woofer.rotation.x = Math.PI / 2;
            woofer.position.set(0, sh * 0.35, sd / 2 + 0.2);
            woofer.userData.isWoofer = true;
            woofer.userData.baseZ = sd / 2 + 0.2;
            group.add(woofer);
            this.speakers.push(woofer);
            
            // Tweeter
            const tweeterGeo = new THREE.SphereGeometry(sw * 0.1, 12, 12);
            const tweeter = new THREE.Mesh(tweeterGeo, wooferMat);
            tweeter.position.set(0, sh * 0.75, sd / 2 + 0.1);
            group.add(tweeter);
            
            group.position.set(x, 0, z);
            group.rotation.y = rotation;
            scene.add(group);
            this.propMeshes.push(group);
            
            // Store speaker position for landing (handled in VoxelWorld)
            this.speakerPositions.push({
                x: x,
                z: z,
                width: sw,
                depth: sd,
                height: sh
            });
            
            // Add landing surface for parkour
            this.landingSurfaces.push({
                name: 'speaker',
                minX: x - sw / 2 - 0.3,
                maxX: x + sw / 2 + 0.3,
                minZ: z - sd / 2 - 0.3,
                maxZ: z + sd / 2 + 0.3,
                height: sh
            });
            
            return group;
        };
        
        // Wall-mounted speakers (left side)
        createSpeaker(2, D / 2 - 5, 1.2, Math.PI / 2);
        createSpeaker(2, D / 2 + 5, 1.2, Math.PI / 2);
        
        // Wall-mounted speakers (right side)
        createSpeaker(W - 2, D / 2 - 5, 1.2, -Math.PI / 2);
        createSpeaker(W - 2, D / 2 + 5, 1.2, -Math.PI / 2);
        
        // Large front speakers by DJ booth
        createSpeaker(W / 2 - 8, 5, 1.5, 0);
        createSpeaker(W / 2 + 8, 5, 1.5, 0);
        
        // Stack speakers (taller, behind dance floor)
        createSpeaker(W / 2 - 10, D / 2 + 8, 1.0, Math.PI * 0.1);
        createSpeaker(W / 2 + 10, D / 2 + 8, 1.0, -Math.PI * 0.1);
    }

    /**
     * Create stage lights on the ceiling
     */
    _createStageLights(scene, W, H) {
        const THREE = this.THREE;
        const CX = W / 2;
        
        const lightColors = [
            0xFF0000, 0xFF6600, 0xFFFF00, 0x00FF00,
            0x00FFFF, 0x0066FF, 0xFF00FF, 0xFF0066
        ];
        
        // Create a row of stage lights
        const lightCount = 10;
        for (let i = 0; i < lightCount; i++) {
            const color = lightColors[i % lightColors.length];
            const x = 4 + (W - 8) * (i / (lightCount - 1));
            
            const group = new THREE.Group();
            
            // Housing
            const housingMat = new THREE.MeshStandardMaterial({ 
                color: 0x222222,
                metalness: 0.5
            });
            const housingGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.6, 8);
            const housing = new THREE.Mesh(housingGeo, housingMat);
            housing.rotation.x = Math.PI / 2;
            group.add(housing);
            
            // Lens
            const lensMat = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.8,
                transparent: true,
                opacity: 0.9
            });
            const lensGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 12);
            const lens = new THREE.Mesh(lensGeo, lensMat);
            lens.rotation.x = Math.PI / 2;
            lens.position.z = 0.35;
            lens.userData.isStageLight = true;
            lens.userData.lightIndex = i;
            lens.userData.baseColor = color;
            group.add(lens);
            this.stageLights.push(lens);
            
            // Mount
            const mountGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6);
            const mount = new THREE.Mesh(mountGeo, housingMat);
            mount.position.y = 0.4;
            group.add(mount);
            
            // Actual spotlight (skip on mobile for performance)
            if (!this.isMobileGPU) {
                const spotlight = new THREE.SpotLight(color, 2, 20, Math.PI / 6, 0.5);
                spotlight.position.set(0, 0, 0.4);
                spotlight.target.position.set(0, -10, 5);
                group.add(spotlight);
                group.add(spotlight.target);
                this.lights.push(spotlight);
            }
            
            group.position.set(x, H - 0.5, 2);
            group.rotation.x = Math.PI / 6;
            scene.add(group);
            this.propMeshes.push(group);
        }
        
        // Side stage lights
        [5, W - 5].forEach((x, idx) => {
            const sideColors = [0xFF00FF, 0x00FFFF, 0xFFFF00];
            for (let i = 0; i < 3; i++) {
                const color = sideColors[i];
                const group = new THREE.Group();
                
                const housingMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
                const housingGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.4, 8);
                const housing = new THREE.Mesh(housingGeo, housingMat);
                housing.rotation.x = Math.PI / 2;
                group.add(housing);
                
                const lensMat = new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.7
                });
                const lensGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 10);
                const lens = new THREE.Mesh(lensGeo, lensMat);
                lens.rotation.x = Math.PI / 2;
                lens.position.z = 0.25;
                lens.userData.isStageLight = true;
                lens.userData.lightIndex = 10 + idx * 3 + i;
                group.add(lens);
                this.stageLights.push(lens);
                
                group.position.set(x, H - 1, 5 + i * 8);
                group.rotation.y = idx === 0 ? -Math.PI / 4 : Math.PI / 4;
                scene.add(group);
                this.propMeshes.push(group);
            }
        });
    }

    /**
     * Create the exit door - on the LEFT wall
     */
    _createExitDoor(scene, x, z) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Door frame - flush against left wall (x=0)
        const frameMat = new THREE.MeshStandardMaterial({ 
            color: 0x8B7355,
            roughness: 0.7
        });
        const frameGeo = new THREE.BoxGeometry(0.3, 5, 3);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.y = 2.5;
        group.add(frame);
        
        // Door (inset into frame)
        const doorMat = new THREE.MeshStandardMaterial({ 
            color: 0x6B5344,
            roughness: 0.6
        });
        const doorGeo = new THREE.BoxGeometry(0.2, 4.5, 2.4);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0.1, 2.5, 0);
        group.add(door);
        
        // Star decoration (on door face)
        const starMat = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.5,
            metalness: 0.8
        });
        const starShape = new THREE.Shape();
        const outerRadius = 0.5;
        const innerRadius = 0.2;
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
            if (i === 0) starShape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            else starShape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: false });
        const star = new THREE.Mesh(starGeo, starMat);
        star.rotation.y = Math.PI / 2;
        star.position.set(0.25, 3.5, 0);
        group.add(star);
        
        // EXIT sign above door
        const signMat = new THREE.MeshStandardMaterial({
            color: 0x00FF00,
            emissive: 0x00FF00,
            emissiveIntensity: 0.8
        });
        const signBackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        
        const signBackGeo = new THREE.BoxGeometry(0.15, 0.6, 1.5);
        const signBack = new THREE.Mesh(signBackGeo, signBackMat);
        signBack.position.set(0.3, 5.5, 0);
        group.add(signBack);
        
        // EXIT text (simple boxes for letters)
        const letterWidth = 0.2;
        const letterHeight = 0.35;
        const letterGeo = new THREE.BoxGeometry(0.1, letterHeight, letterWidth);
        const exitLetters = [-0.5, -0.2, 0.1, 0.4]; // Z positions for E X I T
        exitLetters.forEach((zPos) => {
            const letter = new THREE.Mesh(letterGeo, signMat);
            letter.position.set(0.4, 5.5, zPos);
            group.add(letter);
        });
        
        // Position against left wall (x=0), at z position
        group.position.set(0, 0, z);
        scene.add(group);
        this.propMeshes.push(group);
        
        // Exit trigger is handled by VoxelWorld portal system (ROOM_PORTALS)
    }

    /**
     * Create Dance Contest sign
     */
    _createDanceContestSign(scene, x, y, z) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Poster board
        const boardMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
        const boardGeo = new THREE.BoxGeometry(3, 4, 0.1);
        const board = new THREE.Mesh(boardGeo, boardMat);
        group.add(board);
        
        // "DANCE CONTEST" text area
        const titleMat = new THREE.MeshStandardMaterial({
            color: 0xFF00FF,
            emissive: 0xFF00FF,
            emissiveIntensity: 0.6
        });
        const titleGeo = new THREE.BoxGeometry(2.5, 0.8, 0.15);
        const title = new THREE.Mesh(titleGeo, titleMat);
        title.position.set(0, 1, 0.1);
        group.add(title);
        
        // Star decorations
        const starMat = new THREE.MeshStandardMaterial({
            color: 0xFFFF00,
            emissive: 0xFFFF00,
            emissiveIntensity: 0.5
        });
        const starGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
        [[-1, 1.5], [1, 1.5], [0, 0]].forEach(([sx, sy]) => {
            const star = new THREE.Mesh(starGeo, starMat);
            star.position.set(sx, sy, 0.1);
            star.rotation.z = Math.PI / 4;
            group.add(star);
        });
        
        // "SIGN UP!" text
        const signupMat = new THREE.MeshStandardMaterial({
            color: 0x00FF00,
            emissive: 0x00FF00,
            emissiveIntensity: 0.4
        });
        const signupGeo = new THREE.BoxGeometry(2, 0.5, 0.12);
        const signup = new THREE.Mesh(signupGeo, signupMat);
        signup.position.set(0, -1.2, 0.1);
        group.add(signup);
        
        group.position.set(x, y, z);
        group.rotation.y = -Math.PI / 2;
        scene.add(group);
        this.propMeshes.push(group);
    }

    /**
     * Create records crate
     */
    _createRecordsCrate(scene, x, y, z) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Crate
        const crateMat = new THREE.MeshStandardMaterial({ 
            color: 0x9932CC,
            roughness: 0.7
        });
        const crateGeo = new THREE.BoxGeometry(1.2, 1, 1);
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.y = 0.5;
        group.add(crate);
        
        // Records sticking out
        const recordMat = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.3
        });
        for (let i = 0; i < 5; i++) {
            const recordGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.02, 16);
            const record = new THREE.Mesh(recordGeo, recordMat);
            record.rotation.x = Math.PI / 2;
            record.rotation.z = (Math.random() - 0.5) * 0.3;
            record.position.set(-0.3 + i * 0.15, 1.1, 0);
            group.add(record);
        }
        
        group.position.set(x, y, z);
        scene.add(group);
        this.propMeshes.push(group);
    }

    /**
     * Create stairs - goes all the way to the ceiling! (no railing)
     */
    _createStairs(scene, x, z) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        const H = Nightclub.ROOM_HEIGHT;
        
        const stepMat = new THREE.MeshStandardMaterial({ 
            color: 0x4a4a4a,
            roughness: 0.8
        });
        
        const stepHeight = 0.4;
        const stepDepth = 0.6;
        const stepWidth = 3;
        const totalSteps = 30; // Go to ceiling (30 * 0.4 = 12 = H)
        
        // Create steps going up toward back wall (negative Z)
        for (let i = 0; i < totalSteps; i++) {
            const stepGeo = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
            const step = new THREE.Mesh(stepGeo, stepMat);
            step.position.set(0, stepHeight / 2 + i * stepHeight, -i * stepDepth);
            step.castShadow = true;
            step.receiveShadow = true;
            group.add(step);
        }
        
        // Landing platform at the top
        const topPlatformGeo = new THREE.BoxGeometry(stepWidth + 1, 0.3, 3);
        const topPlatformMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
        const topPlatform = new THREE.Mesh(topPlatformGeo, topPlatformMat);
        topPlatform.position.set(0, H - 0.15, -totalSteps * stepDepth - 1);
        group.add(topPlatform);
        
        // Neon accent lights on stairs (every 5 steps)
        const neonMat = new THREE.MeshStandardMaterial({
            color: 0x00FFFF,
            emissive: 0x00FFFF,
            emissiveIntensity: 0.6
        });
        for (let i = 0; i < totalSteps; i += 5) {
            const neonGeo = new THREE.BoxGeometry(stepWidth - 0.4, 0.05, 0.08);
            const neon = new THREE.Mesh(neonGeo, neonMat);
            neon.position.set(0, i * stepHeight + stepHeight + 0.03, -i * stepDepth + stepDepth * 0.3);
            group.add(neon);
        }
        
        group.position.set(x, 0, z);
        scene.add(group);
        this.propMeshes.push(group);
    }

    /**
     * Create microphone stand
     */
    _createMicStand(scene, x, y, z) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        const metalMat = new THREE.MeshStandardMaterial({ 
            color: 0x666666,
            metalness: 0.8,
            roughness: 0.3
        });
        
        // Base
        const baseGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.y = 0.05;
        group.add(base);
        
        // Stand
        const standGeo = new THREE.CylinderGeometry(0.03, 0.04, 1.8, 8);
        const stand = new THREE.Mesh(standGeo, metalMat);
        stand.position.y = 1;
        group.add(stand);
        
        // Boom arm
        const boomGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6);
        const boom = new THREE.Mesh(boomGeo, metalMat);
        boom.rotation.z = Math.PI / 3;
        boom.position.set(0.3, 1.9, 0);
        group.add(boom);
        
        // Microphone
        const micMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const micGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.25, 12);
        const mic = new THREE.Mesh(micGeo, micMat);
        mic.position.set(0.6, 2.1, 0);
        mic.rotation.z = -Math.PI / 6;
        group.add(mic);
        
        // Mic grille
        const grilleMat = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            metalness: 0.6
        });
        const grilleGeo = new THREE.SphereGeometry(0.1, 12, 12);
        const grille = new THREE.Mesh(grilleGeo, grilleMat);
        grille.position.set(0.68, 2.2, 0);
        group.add(grille);
        
        group.position.set(x, y, z);
        scene.add(group);
        this.propMeshes.push(group);
    }

    /**
     * Create blue couch (same style as igloo)
     */
    _createBlueCouch(scene, x, y, z) {
        const THREE = this.THREE;
        const couchGroup = new THREE.Group();
        
        // Same colors as igloo couch
        const couchMat = new THREE.MeshStandardMaterial({ color: 0x2E4A62, roughness: 0.8 });
        const cushionMat = new THREE.MeshStandardMaterial({ color: 0x3D5A80, roughness: 0.9 });
        
        // Couch base
        const baseGeo = new THREE.BoxGeometry(5, 0.8, 2);
        const couchBase = new THREE.Mesh(baseGeo, couchMat);
        couchBase.position.y = 0.4;
        couchGroup.add(couchBase);
        
        // Couch back
        const backGeo = new THREE.BoxGeometry(5, 1.5, 0.5);
        const couchBack = new THREE.Mesh(backGeo, couchMat);
        couchBack.position.set(0, 1.15, -0.75);
        couchGroup.add(couchBack);
        
        // Armrests
        const armGeo = new THREE.BoxGeometry(0.5, 1, 2);
        [-2.5, 2.5].forEach(xOffset => {
            const arm = new THREE.Mesh(armGeo, couchMat);
            arm.position.set(xOffset, 0.7, 0);
            couchGroup.add(arm);
        });
        
        // Cushions
        [-1.5, 0, 1.5].forEach(xOffset => {
            const cushion = new THREE.Mesh(
                new THREE.BoxGeometry(1.4, 0.3, 1.6),
                cushionMat
            );
            cushion.position.set(xOffset, 0.95, 0.1);
            couchGroup.add(cushion);
        });
        
        couchGroup.position.set(x, y, z);
        couchGroup.rotation.y = Math.PI / 2; // Back against left wall, seats face right toward dance floor
        scene.add(couchGroup);
        this.propMeshes.push(couchGroup);
    }

    /**
     * Create disco ball for interior
     */
    _createDiscoBall(scene, x, y, z) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.userData.isDiscoBall = true;
        
        // Ball - shiny reflective surface
        const ballMat = new THREE.MeshStandardMaterial({ 
            color: 0xEEEEEE,
            metalness: 1.0,
            roughness: 0.05,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.1
        });
        const ballGeo = new THREE.SphereGeometry(0.8, 24, 24);
        const ball = new THREE.Mesh(ballGeo, ballMat);
        ball.userData.isDiscoBall = true;
        group.add(ball);
        this.animatedElements.push(ball);
        
        // Mirror tiles - brighter and more emissive
        const mirrorMat = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            metalness: 1,
            roughness: 0,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.6
        });
        
        for (let lat = 0; lat < 8; lat++) {
            const phi = (lat / 8) * Math.PI;
            const rowRadius = Math.sin(phi) * 0.82;
            const yPos = Math.cos(phi) * 0.82;
            const tilesInRow = Math.max(4, Math.floor(16 * Math.sin(phi)));
            
            for (let lon = 0; lon < tilesInRow; lon++) {
                const theta = (lon / tilesInRow) * Math.PI * 2;
                const tileGeo = new THREE.PlaneGeometry(0.12, 0.12);
                const tile = new THREE.Mesh(tileGeo, mirrorMat.clone());
                tile.userData.isMirrorTile = true;
                tile.userData.tileIndex = lat * tilesInRow + lon;
                
                tile.position.set(
                    rowRadius * Math.cos(theta),
                    yPos,
                    rowRadius * Math.sin(theta)
                );
                tile.lookAt(0, 0, 0);
                tile.rotateY(Math.PI);
                group.add(tile);
            }
        }
        
        // Mount (hangs from ceiling)
        const mountGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
        const mountMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const mount = new THREE.Mesh(mountGeo, mountMat);
        mount.position.y = 1.3;
        group.add(mount);
        
        // Main disco ball light - bright and colorful (skip on mobile for performance)
        if (!this.isMobileGPU) {
            const discoLight = new THREE.PointLight(0xFFFFFF, 3, 25);
            discoLight.userData.isDiscoLight = true;
            group.add(discoLight);
            this.lights.push(discoLight);
        }
        
        group.position.set(x, y, z);
        scene.add(group);
        this.propMeshes.push(group);
    }

    /**
     * Create illuminated banner on back wall (opposite DJ booth)
     */
    _createBackWallBanner(scene, cx, backWallZ) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Banner dimensions (600x200 ratio = 3:1)
        const bannerWidth = 15;
        const bannerHeight = 5;
        
        // Load texture from public folder
        const textureLoader = new THREE.TextureLoader();
        const bannerTexture = textureLoader.load('/advert.png');
        bannerTexture.colorSpace = THREE.SRGBColorSpace;
        
        // Banner frame (dark metallic)
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.8,
            roughness: 0.3
        });
        
        // Top frame bar
        const topFrameGeo = new THREE.BoxGeometry(bannerWidth + 0.4, 0.2, 0.3);
        const topFrame = new THREE.Mesh(topFrameGeo, frameMat);
        topFrame.position.set(0, bannerHeight / 2 + 0.1, 0);
        group.add(topFrame);
        
        // Bottom frame bar
        const bottomFrame = new THREE.Mesh(topFrameGeo, frameMat);
        bottomFrame.position.set(0, -bannerHeight / 2 - 0.1, 0);
        group.add(bottomFrame);
        
        // Left frame bar
        const sideFrameGeo = new THREE.BoxGeometry(0.2, bannerHeight + 0.4, 0.3);
        const leftFrame = new THREE.Mesh(sideFrameGeo, frameMat);
        leftFrame.position.set(-bannerWidth / 2 - 0.1, 0, 0);
        group.add(leftFrame);
        
        // Right frame bar
        const rightFrame = new THREE.Mesh(sideFrameGeo, frameMat);
        rightFrame.position.set(bannerWidth / 2 + 0.1, 0, 0);
        group.add(rightFrame);
        
        // Banner itself (illuminated)
        const bannerMat = new THREE.MeshStandardMaterial({
            map: bannerTexture,
            emissive: 0xffffff,
            emissiveMap: bannerTexture,
            emissiveIntensity: 0.3,
            roughness: 0.5
        });
        const bannerGeo = new THREE.PlaneGeometry(bannerWidth, bannerHeight);
        const banner = new THREE.Mesh(bannerGeo, bannerMat);
        banner.position.z = 0.05;
        group.add(banner);
        
        // Spotlight lights shining on banner (3 lights)
        const spotlightColors = [0xFF6699, 0xFFFFFF, 0x66CCFF]; // Pink, White, Cyan
        const spotlightPositions = [-4, 0, 4]; // Left, Center, Right
        
        spotlightPositions.forEach((xOffset, idx) => {
            // Spotlight housing
            const housingMat = new THREE.MeshStandardMaterial({ 
                color: 0x111111,
                metalness: 0.7
            });
            const housingGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 8);
            const housing = new THREE.Mesh(housingGeo, housingMat);
            housing.rotation.x = -Math.PI / 4;
            housing.position.set(xOffset, bannerHeight / 2 + 1.5, 1.5);
            group.add(housing);
            
            // Actual spotlight (skip on mobile for performance)
            if (!this.isMobileGPU) {
                const spotlight = new THREE.SpotLight(
                    spotlightColors[idx],
                    3,      // intensity
                    12,     // distance
                    Math.PI / 5, // angle
                    0.4     // penumbra
                );
                spotlight.position.set(xOffset, bannerHeight / 2 + 2, 2);
                spotlight.target.position.set(xOffset, 0, 0);
                group.add(spotlight);
                group.add(spotlight.target);
                this.lights.push(spotlight);
            }
            
            // Lens glow
            const lensMat = new THREE.MeshStandardMaterial({
                color: spotlightColors[idx],
                emissive: spotlightColors[idx],
                emissiveIntensity: 0.8
            });
            const lensGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12);
            const lens = new THREE.Mesh(lensGeo, lensMat);
            lens.rotation.x = -Math.PI / 4;
            lens.position.set(xOffset, bannerHeight / 2 + 1.3, 1.2);
            group.add(lens);
        });
        
        // Position on back wall (opposite DJ booth), centered
        // Back wall is at z = backWallZ (35), banner faces toward DJ booth (negative Z)
        group.position.set(cx, 5, backWallZ - 0.3);
        group.rotation.y = Math.PI; // Face toward DJ booth
        
        scene.add(group);
        this.propMeshes.push(group);
    }

    /**
     * Create disco mode elements - lasers and moving spotlights
     * These are hidden by default and only visible during disco mode
     */
    _createDiscoElements(scene, W, H, CX, CZ) {
        const THREE = this.THREE;
        
        // Laser colors
        const laserColors = [
            0xFF0040, // Red
            0x00FF40, // Green  
            0x4000FF, // Blue
            0xFF00FF, // Magenta
            0x00FFFF, // Cyan
            0xFFFF00, // Yellow
        ];
        
        // Create laser beams from ceiling corners
        const laserOrigins = [
            { x: 3, z: 3 },           // Back-left corner
            { x: W - 3, z: 3 },       // Back-right corner
            { x: 3, z: CZ + 10 },     // Front-left
            { x: W - 3, z: CZ + 10 }, // Front-right
            { x: CX, z: 2 },          // Center back (behind DJ)
            { x: CX, z: CZ + 12 },    // Center front
        ];
        
        laserOrigins.forEach((origin, idx) => {
            // Laser beam geometry - thin cylinder
            const laserLength = 15;
            const laserGeo = new THREE.CylinderGeometry(0.03, 0.03, laserLength, 8);
            const laserMat = new THREE.MeshBasicMaterial({
                color: laserColors[idx % laserColors.length],
                transparent: true,
                opacity: 0.9,
                blending: THREE.AdditiveBlending
            });
            
            const laser = new THREE.Mesh(laserGeo, laserMat);
            laser.position.set(origin.x, H - 1.5 - laserLength / 4, origin.z); // Push down more to fit in room
            laser.visible = false; // Hidden by default
            
            // Store animation data
            laser.userData.laserIndex = idx;
            laser.userData.baseX = origin.x;
            laser.userData.baseZ = origin.z;
            laser.userData.color = laserColors[idx % laserColors.length];
            
            scene.add(laser);
            this.discoLasers.push(laser);
            this.propMeshes.push(laser);
            
            // Add glow effect (larger transparent cylinder)
            const glowGeo = new THREE.CylinderGeometry(0.15, 0.15, laserLength, 8);
            const glowMat = new THREE.MeshBasicMaterial({
                color: laserColors[idx % laserColors.length],
                transparent: true,
                opacity: 0.3,
                blending: THREE.AdditiveBlending
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            laser.add(glow); // Attach glow to laser
        });
        
        // Create moving spotlights (cone-shaped light beams)
        const spotlightPositions = [
            { x: CX - 8, z: CZ - 2 },
            { x: CX + 8, z: CZ - 2 },
            { x: CX - 5, z: CZ + 8 },
            { x: CX + 5, z: CZ + 8 },
        ];
        
        spotlightPositions.forEach((pos, idx) => {
            // Spotlight cone geometry
            const coneHeight = H - 1;
            const coneRadius = 4;
            const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 16, 1, true);
            const coneMat = new THREE.MeshBasicMaterial({
                color: laserColors[(idx + 2) % laserColors.length],
                transparent: true,
                opacity: 0.15,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });
            
            const spotlight = new THREE.Mesh(coneGeo, coneMat);
            spotlight.position.set(pos.x, (H - 1) / 2, pos.z); // Center cone vertically
            // Cone naturally points up, no rotation needed for spotlight effect
            spotlight.visible = false; // Hidden by default
            
            // Store animation data
            spotlight.userData.spotIndex = idx;
            spotlight.userData.baseX = pos.x;
            spotlight.userData.baseZ = pos.z;
            spotlight.userData.colorIndex = (idx + 2) % laserColors.length;
            
            scene.add(spotlight);
            this.discoSpotlights.push(spotlight);
            this.propMeshes.push(spotlight);
        });
    }

    // Collision is handled by VoxelWorld using simple bounds (like pizza parlor)
    // Landing surfaces are returned in spawn() result for VoxelWorld to use

    /**
     * Update animations
     */
    update(time, delta, nightFactor = 0.5) {
        // Bass frequency for synchronized animations
        const bassIntensity = Math.sin(time * 15) * 0.5 + 0.5;
        const beatPhase = Math.sin(time * 8) * 0.5 + 0.5;
        
        // ==================== DISCO MODE TIMING ====================
        // Server-synchronized: uses real wall-clock time so all clients agree
        // Disco mode activates every 5 minutes (300 seconds) for 1 minute (60 seconds)
        const DISCO_INTERVAL = 300; // 5 minutes in seconds
        const DISCO_DURATION = 60;  // 1 minute in seconds
        
        // Use real time (seconds since epoch) for synchronization across all clients
        const realTimeSeconds = Math.floor(Date.now() / 1000);
        const cycleTime = realTimeSeconds % DISCO_INTERVAL;
        const shouldBeDiscoMode = cycleTime < DISCO_DURATION;
        
        // Toggle disco mode
        if (shouldBeDiscoMode && !this.discoMode) {
            this.discoMode = true;
            this.discoStartTime = time;
            // Show all disco elements (lasers, spotlights)
            this.discoLasers.forEach(laser => laser.visible = true);
            this.discoSpotlights.forEach(spot => spot.visible = true);
        } else if (!shouldBeDiscoMode && this.discoMode) {
            this.discoMode = false;
            // Hide all disco elements
            this.discoLasers.forEach(laser => laser.visible = false);
            this.discoSpotlights.forEach(spot => spot.visible = false);
        }
        
        // ==================== DISCO MODE ANIMATIONS ====================
        if (this.discoMode) {
            const discoTime = time - this.discoStartTime;
            
            // Animate lasers - sweeping motion
            this.discoLasers.forEach((laser, idx) => {
                const phase = idx * (Math.PI / 3); // Offset each laser
                const sweepSpeed = 2 + (idx % 3) * 0.5; // Varying speeds
                
                // Rotation sweep pattern
                const sweepAngle = Math.sin(discoTime * sweepSpeed + phase) * 0.8;
                const tiltAngle = Math.cos(discoTime * (sweepSpeed * 0.7) + phase) * 0.6;
                
                laser.rotation.x = tiltAngle;
                laser.rotation.z = sweepAngle;
                
                // Pulse opacity with beat - very visible in dark room
                laser.material.opacity = 0.8 + beatPhase * 0.2;
                if (laser.children[0]) {
                    laser.children[0].material.opacity = 0.4 + beatPhase * 0.3;
                }
                
                // Color shift
                const hue = (discoTime * 0.3 + idx * 0.15) % 1;
                laser.material.color.setHSL(hue, 1, 0.5);
                if (laser.children[0]) {
                    laser.children[0].material.color.setHSL(hue, 1, 0.5);
                }
            });
            
            // Animate spotlights - circular sweep and color change
            this.discoSpotlights.forEach((spot, idx) => {
                const phase = idx * (Math.PI / 2);
                const orbitSpeed = 1.5 + (idx % 2) * 0.3;
                
                // Circular wobble motion
                const wobbleX = Math.sin(discoTime * orbitSpeed + phase) * 3;
                const wobbleZ = Math.cos(discoTime * orbitSpeed + phase) * 3;
                
                spot.position.x = spot.userData.baseX + wobbleX;
                spot.position.z = spot.userData.baseZ + wobbleZ;
                
                // Tilt rotation for sweeping effect
                spot.rotation.x = Math.sin(discoTime * 2 + phase) * 0.2;
                spot.rotation.z = Math.cos(discoTime * 1.5 + phase) * 0.15;
                
                // Color cycling
                const hue = (discoTime * 0.2 + idx * 0.25) % 1;
                spot.material.color.setHSL(hue, 1, 0.5);
                
                // Opacity pulse - more visible in dark room
                spot.material.opacity = 0.2 + beatPhase * 0.2;
            });
        }
        
        // Dance floor animation - vibrant color wave pattern
        this.danceFloorTiles.forEach((tile, idx) => {
            const row = tile.userData.tileRow;
            const col = tile.userData.tileCol;
            
            // Multiple wave patterns for complex animation
            const wave1 = Math.sin(time * 4 + row * 0.5 + col * 0.3);
            const wave2 = Math.sin(time * 3 - col * 0.4 + row * 0.2);
            const wave3 = Math.sin(time * 2 + (row + col) * 0.3);
            
            // Pulse intensity synced to bass - bright in dark room
            const intensity = 0.5 + bassIntensity * 0.5 + wave1 * 0.3;
            tile.material.emissiveIntensity = Math.max(0.4, Math.min(1.2, intensity));
            
            // Color cycling - rainbow wave across the floor
            const hue = (time * 0.15 + row * 0.08 + col * 0.06) % 1;
            const saturation = 0.8 + wave2 * 0.2;
            const lightness = 0.4 + wave3 * 0.15;
            
            tile.material.emissive.setHSL(hue, saturation, lightness);
            tile.material.color.setHSL(hue, saturation * 0.8, lightness * 0.7);
        });
        
        // Stage lights animation - color shifting and intensity pulsing
        this.stageLights.forEach((light, idx) => {
            const phase = time * 5 + idx * 0.7;
            const pulsePhase = time * 3 + idx * 0.4;
            
            // Intensity pulse synced to beat - brighter in dark room
            light.material.emissiveIntensity = 0.6 + beatPhase * 0.5 + Math.sin(pulsePhase) * 0.3;
            
            // Subtle color shift
            const hue = (time * 0.1 + idx * 0.1) % 1;
            light.material.emissive.setHSL(hue, 1, 0.5);
        });
        
        // Speaker woofer animation (bass bounce)
        this.speakers.forEach((woofer, idx) => {
            if (woofer.userData.isWoofer) {
                // More dramatic bounce
                woofer.position.z = woofer.userData.baseZ + bassIntensity * 0.15;
                // Subtle scale pulse
                const scale = 1 + bassIntensity * 0.05;
                woofer.scale.set(scale, scale, 1);
            }
        });
        
        // Animated elements
        this.animatedElements.forEach(elem => {
            if (elem.userData.isDiscoBall) {
                // Spin the disco ball (always spins, even when lights off)
                elem.parent.rotation.y = time * 0.8;
                
                // Animate all children of the disco ball group
                if (elem.parent.children) {
                    elem.parent.children.forEach(child => {
                        // Main disco light - ONLY active during disco mode
                        if (child.isLight) {
                            if (this.discoMode) {
                                const discoHue = (time * 0.3) % 1;
                                child.color.setHSL(discoHue, 1.0, 0.6);
                                child.intensity = 2.0 + beatPhase * 2.0;
                            } else {
                                child.intensity = 0; // Light OFF when not in disco mode
                            }
                        }
                        // Mirror tiles sparkle effect - ONLY during disco mode
                        if (child.userData.isMirrorTile) {
                            if (this.discoMode) {
                                const sparkle = Math.sin(time * 15 + child.userData.tileIndex * 0.5);
                                child.material.emissiveIntensity = 0.4 + sparkle * 0.4 + beatPhase * 0.3;
                                const tileHue = (time * 0.2 + child.userData.tileIndex * 0.02) % 1;
                                child.material.emissive.setHSL(tileHue, 0.8, 0.5);
                            } else {
                                child.material.emissiveIntensity = 0.05; // Dim when not in disco mode
                                child.material.emissive.setHSL(0, 0, 0.2); // Gray/dark
                            }
                        }
                    });
                }
            }
            if (elem.userData.isTurntable) {
                elem.rotation.y = time * 3; // Spinning records
            }
            if (elem.userData.isRackLED) {
                const row = elem.userData.ledRow;
                const col = elem.userData.ledCol;
                // VU meter style animation
                const vuLevel = bassIntensity + Math.sin(time * 10 + col * 0.3) * 0.3;
                const threshold = (3 - row) * 0.25; // Lower rows light up first
                const isLit = vuLevel > threshold;
                elem.material.emissiveIntensity = isLit ? 0.9 : 0.15;
            }
        });
        
        // Animate disco ball light only (no ambient point lights in dark club aesthetic)
        this.lights.forEach((light, idx) => {
            if (light.isPointLight && light.parent?.userData?.isDiscoBall) {
                // Disco ball light - ONLY active during disco mode
                if (this.discoMode) {
                    const discoHue = (time * 0.2) % 1;
                    light.color.setHSL(discoHue, 0.8, 0.6);
                    light.intensity = 1.0 + beatPhase * 0.5;
                } else {
                    light.intensity = 0; // OFF when not in disco mode
                }
            }
        });
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
        this.danceFloorTiles = [];
        this.stageLights = [];
        this.speakers = [];
        this.speakerPositions = [];
        this.animatedElements = [];
        this.landingSurfaces = [];
        this.discoLasers = [];
        this.discoSpotlights = [];
        this.discoMode = false;
        this.collisionSystem.clear();
    }

    dispose() {
        this.cleanup();
        this.propsFactory.dispose();
    }

    getSpawnPosition() {
        return {
            x: Nightclub.CENTER_X,
            z: Nightclub.ROOM_DEPTH - 5
        };
    }

    getDebugMesh() {
        return this.collisionSystem.createDebugMesh(this.THREE);
    }
}

export default Nightclub;

