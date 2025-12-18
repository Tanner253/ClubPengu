/**
 * CasinoRoom - Interior game room for the Casino
 * Features slot machines, poker tables, and roulette tables
 * 5x larger than a typical room (~80x90)
 */

import BaseRoom from './BaseRoom';
import SlotMachineDisplay from '../props/casino/SlotMachineDisplay';
import PokerChipStack from '../props/casino/PokerChipStack';
import NightclubCouch from '../props/nightclub/NightclubCouch';

class CasinoRoom extends BaseRoom {
    static ID = 'casino_game_room';
    static NAME = 'Casino Game Room';
    
    // Room dimensions (5x larger than typical room)
    static ROOM_WIDTH = 80;
    static ROOM_DEPTH = 90;
    static ROOM_HEIGHT = 20; // Tall ceilings for grand casino feel
    static CENTER_X = CasinoRoom.ROOM_WIDTH / 2;
    static CENTER_Z = CasinoRoom.ROOM_DEPTH / 2;

    constructor(THREE) {
        super(THREE);
        
        // Initialize collision system with room dimensions
        this.initCollisionSystem(CasinoRoom.ROOM_WIDTH, CasinoRoom.ROOM_DEPTH, 4);
        
        // Props
        this.slotMachineProps = [];
        this.chipStackProps = [];
        this.pokerTableMeshes = [];
        this.rouletteMeshes = [];
        this.couchProps = [];
        
        // Furniture positions for sitting (used in getRoomData)
        this.barStoolPositions = [];
        this.couchPositions = [];
        this.chairPositions = [];
    }

    spawn(scene) {
        const THREE = this.THREE;
        const W = CasinoRoom.ROOM_WIDTH;
        const D = CasinoRoom.ROOM_DEPTH;
        const H = CasinoRoom.ROOM_HEIGHT;
        const CX = CasinoRoom.CENTER_X;
        const CZ = CasinoRoom.CENTER_Z;
        
        this.cleanup();
        
        // ==================== ROOM STRUCTURE ====================
        this._createRoomStructure(scene, W, D, H, CX, CZ);
        
        // ==================== WALL COLLISION ====================
        this._addWallCollision(W, D, CX, CZ);
        
        // ==================== SLOT MACHINES (Rows along walls) ====================
        this._createSlotMachines(scene, W, D);
        
        // ==================== POKER TABLES (Center area) ====================
        this._createPokerTables(scene, W, D, CX, CZ);
        
        // ==================== ROULETTE TABLES ====================
        this._createRouletteTables(scene, W, D, CX, CZ);
        
        // ==================== BLACKJACK TABLES (near bar) ====================
        this._createBlackjackTables(scene, W, D, CX, CZ);
        
        // ==================== CHIP STACKS (Decorative) ====================
        this._createChipDecorations(scene, W, D);
        
        // ==================== BAR AREA ====================
        this._createBarArea(scene, W, D);
        
        // ==================== LOUNGE AREA (Couches) ====================
        this._createLoungeArea(scene, W, D);
        
        // ==================== EXIT PORTAL ====================
        this._createExitDoor(scene, CX, D); // Against back wall
        
        // ==================== LIGHTING ====================
        this._createLighting(scene, W, D, H, CX, CZ);
        
        return { 
            meshes: this.meshes, 
            lights: this.lights, 
            collisionSystem: this.collisionSystem,
            landingSurfaces: this.landingSurfaces
        };
    }

    _createRoomStructure(scene, W, D, H, CX, CZ) {
        const THREE = this.THREE;
        
        // Floor - luxurious casino carpet
        const floorMat = this.createMaterial({ 
            color: 0x1a0a2e, 
            roughness: 0.9, 
            metalness: 0.1 
        });
        const floorGeo = new THREE.PlaneGeometry(W, D);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(CX, 0, CZ);
        floor.receiveShadow = true;
        this.addMesh(floor, scene);
        
        // Carpet pattern - red with gold trim
        const carpetMat = this.createMaterial({
            color: 0x8B0000,
            roughness: 0.95
        });
        const carpetGeo = new THREE.PlaneGeometry(W - 10, D - 10);
        const carpet = new THREE.Mesh(carpetGeo, carpetMat);
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(CX, 0.01, CZ);
        carpet.receiveShadow = true;
        this.addMesh(carpet, scene);
        
        // Gold trim around carpet
        const trimMat = this.createMaterial({
            color: 0xFFD700,
            roughness: 0.3,
            metalness: 0.8
        });
        const trimWidth = 0.5;
        
        // Top and bottom trim
        [CZ - D / 2 + 5, CZ + D / 2 - 5].forEach(zPos => {
            const trimGeo = new THREE.BoxGeometry(W - 10, 0.02, trimWidth);
            const trim = new THREE.Mesh(trimGeo, trimMat);
            trim.position.set(CX, 0.02, zPos);
            this.addMesh(trim, scene);
        });
        
        // Left and right trim
        [CX - W / 2 + 5, CX + W / 2 - 5].forEach(xPos => {
            const trimGeo = new THREE.BoxGeometry(trimWidth, 0.02, D - 10);
            const trim = new THREE.Mesh(trimGeo, trimMat);
            trim.position.set(xPos, 0.02, CZ);
            this.addMesh(trim, scene);
        });
        
        // Walls - dark purple with gold accents
        const wallMat = this.createMaterial({ 
            color: 0x1a0a2e, 
            roughness: 0.85 
        });
        
        // Back wall
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
        backWall.position.set(CX, H / 2, 0);
        this.addMesh(backWall, scene);
        
        // Left wall
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(0, H / 2, CZ);
        this.addMesh(leftWall, scene);
        
        // Right wall
        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(W, H / 2, CZ);
        this.addMesh(rightWall, scene);
        
        // Front wall (with exit)
        const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
        frontWall.rotation.y = Math.PI;
        frontWall.position.set(CX, H / 2, D);
        this.addMesh(frontWall, scene);
        
        // Ceiling - dark with chandeliers
        const ceilingMat = this.createMaterial({ 
            color: 0x0a0515, 
            roughness: 1.0 
        });
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(CX, H, CZ);
        this.addMesh(ceiling, scene);
        
        // Wall trim (gold strip along walls)
        const wallTrimMat = this.createMaterial({
            color: 0xFFD700,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0xFFD700,
            emissiveIntensity: 0.1
        });
        
        // Horizontal wall trim at mid height
        const wallTrimHeight = H / 2;
        [
            { x: CX, z: 0.1, w: W, d: 0.1 },  // Back
            { x: CX, z: D - 0.1, w: W, d: 0.1 },  // Front
            { x: 0.1, z: CZ, w: 0.1, d: D },  // Left
            { x: W - 0.1, z: CZ, w: 0.1, d: D },  // Right
        ].forEach(pos => {
            const wallTrimGeo = new THREE.BoxGeometry(pos.w, 0.2, pos.d);
            const wallTrim = new THREE.Mesh(wallTrimGeo, wallTrimMat);
            wallTrim.position.set(pos.x, wallTrimHeight, pos.z);
            this.addMesh(wallTrim, scene);
        });
    }

    _addWallCollision(W, D, CX, CZ) {
        const WALL_HEIGHT = 25;
        const WALL_THICKNESS = 4;
        const INSET = 2; // Inset from edge to ensure collision works
        
        // Back wall (z = 0) - inset into the room
        this.collisionSystem.addCollider(
            CX, INSET,
            { type: 'box', size: { x: W + 4, z: WALL_THICKNESS }, height: WALL_HEIGHT },
            1,
            { name: 'wall_back' }
        );
        
        // Front wall (z = D) - inset into the room, but leave gap for exit door
        // Exit door is at CX, so we create two wall segments on either side
        const doorWidth = 8;
        const sideWidth = (W - doorWidth) / 2;
        
        // Left side of front wall
        this.collisionSystem.addCollider(
            sideWidth / 2, D - INSET,
            { type: 'box', size: { x: sideWidth, z: WALL_THICKNESS }, height: WALL_HEIGHT },
            1,
            { name: 'wall_front_left' }
        );
        
        // Right side of front wall
        this.collisionSystem.addCollider(
            W - sideWidth / 2, D - INSET,
            { type: 'box', size: { x: sideWidth, z: WALL_THICKNESS }, height: WALL_HEIGHT },
            1,
            { name: 'wall_front_right' }
        );
        
        // Left wall (x = 0) - inset into the room
        this.collisionSystem.addCollider(
            INSET, CZ,
            { type: 'box', size: { x: WALL_THICKNESS, z: D + 4 }, height: WALL_HEIGHT },
            1,
            { name: 'wall_left' }
        );
        
        // Right wall (x = W) - inset into the room
        this.collisionSystem.addCollider(
            W - INSET, CZ,
            { type: 'box', size: { x: WALL_THICKNESS, z: D + 4 }, height: WALL_HEIGHT },
            1,
            { name: 'wall_right' }
        );
    }

    _createSlotMachines(scene, W, D) {
        const THREE = this.THREE;
        
        // Create rows of slot machines along left and right walls
        const slotRowZ = [15, 25, 35, 45, 55, 65];
        
        // Left wall slots
        slotRowZ.forEach((z, idx) => {
            const slotMachine = new SlotMachineDisplay(THREE);
            slotMachine.spawn(scene, 6, 3, z, {
                width: 5,
                height: 4
            });
            slotMachine.setRotation(Math.PI / 2);  // Face right
            this.addProp(slotMachine);
            this.slotMachineProps.push(slotMachine);
            
            // Add collision for slot machine
            this.collisionSystem.addCollider(
                6, z,
                { type: 'box', size: { x: 2, z: 3 }, height: 4 },
                1,
                { name: `slot_left_${idx}` }
            );
        });
        
        // Right wall slots
        slotRowZ.forEach((z, idx) => {
            const slotMachine = new SlotMachineDisplay(THREE);
            slotMachine.spawn(scene, W - 6, 3, z, {
                width: 5,
                height: 4
            });
            slotMachine.setRotation(-Math.PI / 2);  // Face left
            this.addProp(slotMachine);
            this.slotMachineProps.push(slotMachine);
            
            // Add collision for slot machine
            this.collisionSystem.addCollider(
                W - 6, z,
                { type: 'box', size: { x: 2, z: 3 }, height: 4 },
                1,
                { name: `slot_right_${idx}` }
            );
        });
    }

    _createPokerTables(scene, W, D, CX, CZ) {
        const THREE = this.THREE;
        
        // High quality materials
        const chairWoodMat = this.createMaterial({ 
            color: 0x2a1a0a, 
            roughness: 0.5,
            metalness: 0.1
        });
        const chairSeatMat = this.createMaterial({ 
            color: 0x8B0000, 
            roughness: 0.6 
        });
        
        // 2 poker tables - closest to exit (back of room)
        const pokerPositions = [
            { x: CX - 18, z: CZ + 15 },
            { x: CX + 18, z: CZ + 15 },
        ];
        
        pokerPositions.forEach((pos, tableIdx) => {
            const tableGroup = this._createPokerTable(THREE, pos.x, pos.z);
            scene.add(tableGroup);
            this.pokerTableMeshes.push(tableGroup);
            this.meshes.push(tableGroup);
            
            // Add collision for table - matches oval table size
            this.collisionSystem.addCollider(
                pos.x, pos.z,
                { type: 'sphere', radius: 6, height: 1.2 },
                1,
                { name: `poker_table_${tableIdx}` }
            );
            
            // Add 8 chairs evenly distributed around oval poker table
            // Leave space at dealer position (angle 0)
            const chairAngles = [
                Math.PI * 0.15,   // Front right
                Math.PI * 0.35,   // Right front-middle
                Math.PI * 0.55,   // Right middle
                Math.PI * 0.75,   // Right back
                Math.PI * 0.95,   // Back right
                -Math.PI * 0.95,  // Back left
                -Math.PI * 0.75,  // Left back
                -Math.PI * 0.55,  // Left middle
                -Math.PI * 0.35,  // Left front-middle
                -Math.PI * 0.15,  // Front left
            ];
            
            chairAngles.forEach((angle, chairIdx) => {
                const chairRadius = 9; // Well outside the table
                const chairX = pos.x + Math.sin(angle) * chairRadius;
                const chairZ = pos.z + Math.cos(angle) * chairRadius * 0.6; // Compress for oval shape
                const faceAngle = Math.atan2(pos.x - chairX, pos.z - chairZ);
                
                // Create high-quality chair mesh
                const chairGroup = this._createCasinoChair(THREE, chairWoodMat, chairSeatMat);
                chairGroup.position.set(chairX, 0, chairZ);
                chairGroup.rotation.y = faceAngle;
                scene.add(chairGroup);
                this.meshes.push(chairGroup);
                
                // Store chair position for furniture data
                this.chairPositions.push({
                    type: 'chair',
                    position: { x: chairX, z: chairZ },
                    seatHeight: 0.95,
                    faceAngle: faceAngle,
                    radius: 0.7
                });
            });
        });
    }
    
    _createCasinoChair(THREE, woodMat, seatMat) {
        const group = new THREE.Group();
        
        // Padded seat
        const seatGeo = new THREE.BoxGeometry(1.3, 0.2, 1.3);
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.y = 0.85;
        seat.castShadow = true;
        group.add(seat);
        
        // Seat cushion top (rounded look)
        const cushionGeo = new THREE.BoxGeometry(1.2, 0.08, 1.2);
        const cushion = new THREE.Mesh(cushionGeo, seatMat);
        cushion.position.y = 0.98;
        group.add(cushion);
        
        // Chair back frame
        const backFrameGeo = new THREE.BoxGeometry(1.3, 1.4, 0.12);
        const backFrame = new THREE.Mesh(backFrameGeo, woodMat);
        backFrame.position.set(0, 1.55, -0.55);
        group.add(backFrame);
        
        // Chair back padding
        const backPadGeo = new THREE.BoxGeometry(1.1, 1.1, 0.1);
        const backPad = new THREE.Mesh(backPadGeo, seatMat);
        backPad.position.set(0, 1.5, -0.48);
        group.add(backPad);
        
        // Sturdy wooden legs
        const legGeo = new THREE.BoxGeometry(0.12, 0.85, 0.12);
        [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, woodMat);
            leg.position.set(lx, 0.425, lz);
            leg.castShadow = true;
            group.add(leg);
        });
        
        // Cross braces for stability
        const braceGeo = new THREE.BoxGeometry(0.08, 0.08, 1.0);
        const brace1 = new THREE.Mesh(braceGeo, woodMat);
        brace1.position.set(-0.5, 0.3, 0);
        group.add(brace1);
        const brace2 = new THREE.Mesh(braceGeo, woodMat);
        brace2.position.set(0.5, 0.3, 0);
        group.add(brace2);
        
        return group;
    }

    _createPokerTable(THREE, x, z) {
        const group = new THREE.Group();
        
        // High quality green felt with subtle texture
        const feltMat = this.createMaterial({
            color: 0x0A6B3A,
            roughness: 0.85,
            metalness: 0
        });
        
        // Rich mahogany wood
        const woodMat = this.createMaterial({
            color: 0x3d1f0d,
            roughness: 0.4,
            metalness: 0.1
        });
        
        // Gold accents
        const goldMat = this.createMaterial({
            color: 0xD4AF37,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0xD4AF37,
            emissiveIntensity: 0.1
        });
        
        // Table base/rim - solid wood frame
        const baseGeo = new THREE.CylinderGeometry(5, 5.2, 0.25, 48);
        baseGeo.scale(1.4, 1, 1); // Oval
        const base = new THREE.Mesh(baseGeo, woodMat);
        base.position.y = 0.85;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        
        // Felt surface
        const feltGeo = new THREE.CylinderGeometry(4.6, 4.6, 0.08, 48);
        feltGeo.scale(1.4, 1, 1);
        const felt = new THREE.Mesh(feltGeo, feltMat);
        felt.position.y = 0.98;
        felt.receiveShadow = true;
        group.add(felt);
        
        // Raised padded rail around edge
        const railGeo = new THREE.TorusGeometry(4.8, 0.35, 12, 48);
        railGeo.scale(1.4, 1, 1);
        const railMat = this.createMaterial({
            color: 0x2a1a0a,
            roughness: 0.6
        });
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.rotation.x = Math.PI / 2;
        rail.position.y = 1.05;
        group.add(rail);
        
        // Gold trim ring
        const trimGeo = new THREE.TorusGeometry(4.3, 0.05, 8, 48);
        trimGeo.scale(1.4, 1, 1);
        const trim = new THREE.Mesh(trimGeo, goldMat);
        trim.rotation.x = Math.PI / 2;
        trim.position.y = 1.0;
        group.add(trim);
        
        // Central pedestal base
        const pedestalBaseGeo = new THREE.CylinderGeometry(1.8, 2.2, 0.15, 24);
        const pedestalBase = new THREE.Mesh(pedestalBaseGeo, woodMat);
        pedestalBase.position.y = 0.075;
        pedestalBase.castShadow = true;
        group.add(pedestalBase);
        
        // Pedestal column
        const pedestalGeo = new THREE.CylinderGeometry(0.8, 1.2, 0.7, 16);
        const pedestal = new THREE.Mesh(pedestalGeo, woodMat);
        pedestal.position.y = 0.5;
        pedestal.castShadow = true;
        group.add(pedestal);
        
        // Dealer position marker
        const dealerGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.03, 24);
        const dealer = new THREE.Mesh(dealerGeo, goldMat);
        dealer.position.set(0, 1.02, -3.5);
        group.add(dealer);
        
        // Betting lines on felt
        const lineGeo = new THREE.PlaneGeometry(0.05, 2);
        const lineMat = this.createMaterial({
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.2
        });
        
        // Create betting circle markers
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI * 0.3 + (i / 5) * Math.PI * 0.4;
            const markerGeo = new THREE.RingGeometry(0.35, 0.45, 24);
            const marker = new THREE.Mesh(markerGeo, lineMat);
            marker.rotation.x = -Math.PI / 2;
            marker.position.set(Math.sin(angle) * 3.5, 1.0, Math.cos(angle) * 2.5);
            group.add(marker);
        }
        
        // Chip stacks on table (higher quality)
        const chipColors = [0xCC0000, 0x000088, 0x006600, 0x111111, 0xFFFFFF];
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + Math.PI / 5;
            const chipStack = this._createSmallChipStack(THREE, chipColors[i]);
            chipStack.position.set(Math.cos(angle) * 2, 1.05, Math.sin(angle) * 1.4);
            group.add(chipStack);
        }
        
        group.position.set(x, 0, z);
        return group;
    }
    
    _createSmallChipStack(THREE, color) {
        const stack = new THREE.Group();
        const chipMat = this.createMaterial({ color, roughness: 0.4 });
        
        for (let i = 0; i < 5; i++) {
            const chipGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16);
            const chip = new THREE.Mesh(chipGeo, chipMat);
            chip.position.y = i * 0.05;
            stack.add(chip);
        }
        
        return stack;
    }

    _createRouletteTables(scene, W, D, CX, CZ) {
        const THREE = this.THREE;
        
        // 2 roulette tables - centered in room
        const roulettePositions = [
            { x: CX - 12, z: CZ },
            { x: CX + 12, z: CZ },
        ];
        
        roulettePositions.forEach((pos, idx) => {
            const tableGroup = this._createRouletteTable(THREE, pos.x, pos.z);
            scene.add(tableGroup);
            this.rouletteMeshes.push(tableGroup);
            this.meshes.push(tableGroup);
            
            // Add collision - matches roulette table size (6x11)
            this.collisionSystem.addCollider(
                pos.x, pos.z,
                { type: 'box', size: { x: 6, z: 11 }, height: 1.2 },
                1,
                { name: `roulette_table_${idx}` }
            );
        });
    }

    _createRouletteTable(THREE, x, z) {
        const group = new THREE.Group();
        
        // High quality materials
        const feltMat = this.createMaterial({
            color: 0x0A6B3A,
            roughness: 0.85,
            metalness: 0
        });
        
        const woodMat = this.createMaterial({
            color: 0x3d1f0d,
            roughness: 0.4,
            metalness: 0.1
        });
        
        const goldMat = this.createMaterial({
            color: 0xD4AF37,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0xD4AF37,
            emissiveIntensity: 0.15
        });
        
        // Main table frame
        const frameGeo = new THREE.BoxGeometry(6, 0.3, 11);
        const frame = new THREE.Mesh(frameGeo, woodMat);
        frame.position.y = 0.8;
        frame.castShadow = true;
        group.add(frame);
        
        // Felt betting surface
        const feltGeo = new THREE.BoxGeometry(5.6, 0.08, 6);
        const felt = new THREE.Mesh(feltGeo, feltMat);
        felt.position.set(0, 0.98, 2);
        felt.receiveShadow = true;
        group.add(felt);
        
        // Padded rail around table
        const railMat = this.createMaterial({
            color: 0x2a1a0a,
            roughness: 0.6
        });
        
        // Long side rails
        [-3, 3].forEach(xPos => {
            const railGeo = new THREE.BoxGeometry(0.5, 0.35, 10.5);
            const rail = new THREE.Mesh(railGeo, railMat);
            rail.position.set(xPos, 1.05, 0);
            group.add(rail);
        });
        
        // Short end rails
        [-5, 5].forEach(zPos => {
            const railGeo = new THREE.BoxGeometry(5.5, 0.35, 0.5);
            const rail = new THREE.Mesh(railGeo, railMat);
            rail.position.set(0, 1.05, zPos);
            group.add(rail);
        });
        
        // ===== ROULETTE WHEEL ASSEMBLY =====
        const wheelX = 0;
        const wheelZ = -3;
        
        // Wheel housing (wooden bowl)
        const housingGeo = new THREE.CylinderGeometry(2.2, 2.4, 0.4, 48);
        const housing = new THREE.Mesh(housingGeo, woodMat);
        housing.position.set(wheelX, 1.0, wheelZ);
        group.add(housing);
        
        // Wheel cone (inner sloped surface)
        const coneGeo = new THREE.ConeGeometry(2.0, 0.3, 48, 1, true);
        const coneMat = this.createMaterial({
            color: 0x1a0f05,
            roughness: 0.5
        });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.rotation.x = Math.PI;
        cone.position.set(wheelX, 1.1, wheelZ);
        group.add(cone);
        
        // Spinning wheel with segments
        const wheelGroup = new THREE.Group();
        wheelGroup.userData.isRouletteWheel = true;
        
        // Wheel base
        const wheelBaseGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.15, 48);
        const wheelBaseMat = this.createMaterial({
            color: 0x2a1508,
            roughness: 0.4,
            metalness: 0.2
        });
        const wheelBase = new THREE.Mesh(wheelBaseGeo, wheelBaseMat);
        wheelGroup.add(wheelBase);
        
        // Wheel segments (red and black)
        const segmentCount = 37;
        for (let i = 0; i < segmentCount; i++) {
            const segmentGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 3, 1, false, 
                (i / segmentCount) * Math.PI * 2, 
                (Math.PI * 2) / segmentCount * 0.9);
            const isRed = i % 2 === 0 && i !== 0;
            const isGreen = i === 0;
            const segmentMat = this.createMaterial({
                color: isGreen ? 0x006600 : (isRed ? 0xCC0000 : 0x111111),
                roughness: 0.5
            });
            const segment = new THREE.Mesh(segmentGeo, segmentMat);
            segment.position.y = 0.08;
            wheelGroup.add(segment);
        }
        
        // Gold center hub
        const hubGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.25, 24);
        const hub = new THREE.Mesh(hubGeo, goldMat);
        hub.position.y = 0.12;
        wheelGroup.add(hub);
        
        // Decorative spokes
        for (let i = 0; i < 8; i++) {
            const spokeGeo = new THREE.BoxGeometry(0.08, 0.05, 1.2);
            const spoke = new THREE.Mesh(spokeGeo, goldMat);
            spoke.rotation.y = (i / 8) * Math.PI * 2;
            spoke.position.y = 0.1;
            wheelGroup.add(spoke);
        }
        
        wheelGroup.position.set(wheelX, 1.2, wheelZ);
        group.add(wheelGroup);
        
        // Ball track rim
        const trackGeo = new THREE.TorusGeometry(1.9, 0.08, 12, 48);
        const track = new THREE.Mesh(trackGeo, goldMat);
        track.rotation.x = Math.PI / 2;
        track.position.set(wheelX, 1.25, wheelZ);
        group.add(track);
        
        // Roulette ball
        const ballGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const ballMat = this.createMaterial({
            color: 0xFFFFFF,
            roughness: 0.1,
            metalness: 0.3
        });
        const ball = new THREE.Mesh(ballGeo, ballMat);
        ball.position.set(wheelX + 1.5, 1.3, wheelZ);
        group.add(ball);
        
        // ===== BETTING GRID =====
        // Number grid on felt (simplified visual)
        const gridMat = this.createMaterial({
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.15
        });
        
        // Grid lines
        for (let i = 0; i <= 12; i++) {
            const lineGeo = new THREE.BoxGeometry(0.03, 0.02, 4);
            const line = new THREE.Mesh(lineGeo, gridMat);
            line.position.set(-2.4 + i * 0.4, 1.0, 2.5);
            group.add(line);
        }
        for (let i = 0; i <= 3; i++) {
            const lineGeo = new THREE.BoxGeometry(4.8, 0.02, 0.03);
            const line = new THREE.Mesh(lineGeo, gridMat);
            line.position.set(0, 1.0, 0.5 + i * 1.33);
            group.add(line);
        }
        
        // Table legs - ornate
        const legGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.8, 12);
        [[-2.5, -4.5], [2.5, -4.5], [-2.5, 4.5], [2.5, 4.5]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, woodMat);
            leg.position.set(lx, 0.4, lz);
            leg.castShadow = true;
            group.add(leg);
        });
        
        group.position.set(x, 0, z);
        return group;
    }

    _createBlackjackTables(scene, W, D, CX, CZ) {
        const THREE = this.THREE;
        
        // 2 blackjack tables in empty space near bar (z ~20-25)
        const bjPositions = [
            { x: CX - 15, z: 22 },
            { x: CX + 15, z: 22 },
        ];
        
        bjPositions.forEach((pos, tableIdx) => {
            // Create high quality blackjack table
            const tableGroup = this._createBlackjackTable(THREE, pos.x, pos.z);
            scene.add(tableGroup);
            this.meshes.push(tableGroup);
            
            // Add collision for table
            this.collisionSystem.addCollider(
                pos.x, pos.z,
                { type: 'sphere', radius: 4, height: 1.2 },
                1,
                { name: `blackjack_table_${tableIdx}` }
            );
            
            // Add 6 bar stools around the curved player side
            // Stools on the curved edge (player side), dealer at straight edge
            const stoolAngles = [
                Math.PI * 0.85,   // Far left
                Math.PI * 0.68,   // Left
                Math.PI * 0.51,   // Center-left
                Math.PI * 0.34,   // Center-right
                Math.PI * 0.17,   // Right
                Math.PI * 0.0,    // Far right
            ];
            
            stoolAngles.forEach((angle, stoolIdx) => {
                const stoolRadius = 5.5; // Distance from table center
                const stoolX = pos.x + Math.cos(angle) * stoolRadius;
                const stoolZ = pos.z + Math.sin(angle) * stoolRadius;
                const faceAngle = Math.atan2(pos.x - stoolX, pos.z - stoolZ);
                
                // Create bar stool
                const stoolGroup = this._createBarStoolForTable(THREE);
                stoolGroup.position.set(stoolX, 0, stoolZ);
                stoolGroup.rotation.y = faceAngle;
                scene.add(stoolGroup);
                this.meshes.push(stoolGroup);
                
                // Store position for sitting functionality
                this.chairPositions.push({
                    type: 'stool',
                    position: { x: stoolX, z: stoolZ },
                    seatHeight: 1.0,
                    faceAngle: faceAngle,
                    radius: 0.6,
                    snapPoints: [{ x: 0, z: 0, rotation: 0 }]
                });
            });
        });
    }
    
    _createBarStoolForTable(THREE) {
        const group = new THREE.Group();
        
        const metalMat = this.createMaterial({
            color: 0x2a2a2a,
            roughness: 0.3,
            metalness: 0.8
        });
        
        const seatMat = this.createMaterial({
            color: 0x8B0000, // Deep red leather
            roughness: 0.6,
            metalness: 0.1
        });
        
        const goldMat = this.createMaterial({
            color: 0xD4AF37,
            roughness: 0.3,
            metalness: 0.7
        });
        
        // Circular base
        const baseGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.08, 20);
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.y = 0.04;
        base.castShadow = true;
        group.add(base);
        
        // Central pole
        const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.85, 12);
        const pole = new THREE.Mesh(poleGeo, metalMat);
        pole.position.y = 0.5;
        group.add(pole);
        
        // Footrest ring
        const footrestGeo = new THREE.TorusGeometry(0.32, 0.035, 8, 20);
        const footrest = new THREE.Mesh(footrestGeo, goldMat);
        footrest.rotation.x = Math.PI / 2;
        footrest.position.y = 0.35;
        group.add(footrest);
        
        // Padded seat cushion
        const seatGeo = new THREE.CylinderGeometry(0.45, 0.4, 0.18, 20);
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.y = 1.0;
        seat.castShadow = true;
        group.add(seat);
        
        // Seat top (slightly domed)
        const seatTopGeo = new THREE.SphereGeometry(0.44, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3);
        const seatTop = new THREE.Mesh(seatTopGeo, seatMat);
        seatTop.position.y = 1.05;
        group.add(seatTop);
        
        // Gold trim ring around seat
        const trimGeo = new THREE.TorusGeometry(0.44, 0.02, 8, 24);
        const trim = new THREE.Mesh(trimGeo, goldMat);
        trim.rotation.x = Math.PI / 2;
        trim.position.y = 0.95;
        group.add(trim);
        
        return group;
    }

    _createBlackjackTable(THREE, x, z) {
        const group = new THREE.Group();
        
        // High quality materials
        const feltMat = this.createMaterial({
            color: 0x0A6B3A, // Rich casino green
            roughness: 0.85,
            metalness: 0
        });
        
        const woodMat = this.createMaterial({
            color: 0x2a1508, // Dark mahogany
            roughness: 0.4,
            metalness: 0.1
        });
        
        const goldMat = this.createMaterial({
            color: 0xD4AF37,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0xD4AF37,
            emissiveIntensity: 0.05
        });
        
        const railMat = this.createMaterial({
            color: 0x1a0a05, // Very dark padded rail
            roughness: 0.7
        });
        
        // Table base - semicircle shape using half cylinder
        const baseRadius = 3.5;
        const baseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, 0.3, 32, 1, false, 0, Math.PI);
        const base = new THREE.Mesh(baseGeo, woodMat);
        base.rotation.y = -Math.PI / 2;
        base.position.y = 0.85;
        base.castShadow = true;
        group.add(base);
        
        // Felt surface
        const feltGeo = new THREE.CylinderGeometry(baseRadius - 0.3, baseRadius - 0.3, 0.1, 32, 1, false, 0, Math.PI);
        const felt = new THREE.Mesh(feltGeo, feltMat);
        felt.rotation.y = -Math.PI / 2;
        felt.position.y = 1.0;
        felt.receiveShadow = true;
        group.add(felt);
        
        // Dealer edge (straight side)
        const dealerEdgeGeo = new THREE.BoxGeometry(baseRadius * 2, 0.4, 0.6);
        const dealerEdge = new THREE.Mesh(dealerEdgeGeo, railMat);
        dealerEdge.position.set(0, 0.95, 0);
        group.add(dealerEdge);
        
        // Padded rail around curved player side
        const railGeo = new THREE.TorusGeometry(baseRadius - 0.1, 0.2, 12, 24, Math.PI);
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.rotation.x = Math.PI / 2;
        rail.rotation.z = -Math.PI / 2;
        rail.position.set(0, 1.05, 0);
        group.add(rail);
        
        // Gold trim on dealer edge
        const dealerTrimGeo = new THREE.BoxGeometry(baseRadius * 2 - 0.2, 0.04, 0.06);
        const dealerTrim = new THREE.Mesh(dealerTrimGeo, goldMat);
        dealerTrim.position.set(0, 1.12, -0.25);
        group.add(dealerTrim);
        
        // Gold trim inner arc
        const innerTrimGeo = new THREE.TorusGeometry(baseRadius - 0.5, 0.03, 8, 24, Math.PI);
        const innerTrim = new THREE.Mesh(innerTrimGeo, goldMat);
        innerTrim.rotation.x = Math.PI / 2;
        innerTrim.rotation.z = -Math.PI / 2;
        innerTrim.position.set(0, 1.02, 0);
        group.add(innerTrim);
        
        // Sturdy table legs
        const legGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.85, 12);
        const legPositions = [
            [-baseRadius + 0.5, -0.3],
            [baseRadius - 0.5, -0.3],
            [-baseRadius * 0.5, baseRadius * 0.7],
            [baseRadius * 0.5, baseRadius * 0.7],
            [0, baseRadius - 0.3]
        ];
        legPositions.forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, woodMat);
            leg.position.set(lx, 0.425, lz);
            leg.castShadow = true;
            group.add(leg);
        });
        
        // Betting circles (6 positions for 6 players)
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI - (i + 0.5) * (Math.PI / 6);
            const cx = Math.cos(angle) * (baseRadius - 1);
            const cz = Math.sin(angle) * (baseRadius - 1);
            
            // Outer gold ring
            const outerGeo = new THREE.RingGeometry(0.3, 0.38, 24);
            const outer = new THREE.Mesh(outerGeo, goldMat);
            outer.rotation.x = -Math.PI / 2;
            outer.position.set(cx, 1.03, cz);
            group.add(outer);
            
            // Inner darker felt circle
            const innerGeo = new THREE.CircleGeometry(0.28, 24);
            const innerMat = this.createMaterial({
                color: 0x054525,
                roughness: 0.9
            });
            const inner = new THREE.Mesh(innerGeo, innerMat);
            inner.rotation.x = -Math.PI / 2;
            inner.position.set(cx, 1.025, cz);
            group.add(inner);
        }
        
        // Chip tray for dealer
        const trayGeo = new THREE.BoxGeometry(2.5, 0.15, 0.6);
        const tray = new THREE.Mesh(trayGeo, woodMat);
        tray.position.set(0, 1.02, -0.6);
        group.add(tray);
        
        // Card shoe
        const shoeGeo = new THREE.BoxGeometry(0.6, 0.4, 0.4);
        const shoe = new THREE.Mesh(shoeGeo, this.createMaterial({ color: 0x111111, roughness: 0.4 }));
        shoe.position.set(-baseRadius + 1, 1.2, -0.3);
        group.add(shoe);
        
        // Discard tray
        const discardGeo = new THREE.BoxGeometry(0.8, 0.1, 0.5);
        const discard = new THREE.Mesh(discardGeo, this.createMaterial({ color: 0x222222, roughness: 0.5 }));
        discard.position.set(baseRadius - 1, 1.05, -0.3);
        group.add(discard);
        
        group.position.set(x, 0, z);
        return group;
    }

    _createChipDecorations(scene, W, D) {
        const THREE = this.THREE;
        
        // Decorative chip stacks at corners
        const positions = [
            { x: 15, z: 10 },
            { x: W - 15, z: 10 },
            { x: 15, z: D - 10 },
            { x: W - 15, z: D - 10 },
        ];
        
        positions.forEach((pos, idx) => {
            const chipStack = new PokerChipStack(THREE);
            chipStack.spawn(scene, pos.x, 0, pos.z, {
                chipCount: 8,
                chipRadius: 0.6
            });
            this.addProp(chipStack);
            this.chipStackProps.push(chipStack);
        });
    }

    _createBarArea(scene, W, D) {
        const THREE = this.THREE;
        const CX = W / 2;
        const STOOL_SEAT_HEIGHT = 1.0;
        const STOOL_Z = 8.5;
        
        // Bar counter at back wall
        const barGroup = new THREE.Group();
        
        const barMat = this.createMaterial({
            color: 0x3d2817,
            roughness: 0.6
        });
        
        const barTopMat = this.createMaterial({
            color: 0x1a0a0a,
            roughness: 0.2,
            metalness: 0.4
        });
        
        // Bar counter
        const barGeo = new THREE.BoxGeometry(30, 1.2, 2);
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(CX, 0.6, 6);
        barGroup.add(bar);
        
        // Bar top
        const barTopGeo = new THREE.BoxGeometry(30.2, 0.1, 2.2);
        const barTop = new THREE.Mesh(barTopGeo, barTopMat);
        barTop.position.set(CX, 1.25, 6);
        barGroup.add(barTop);
        
        // Bar stools (visual + store positions for furniture data)
        const stoolMat = this.createMaterial({
            color: 0x333333,
            metalness: 0.6,
            roughness: 0.4
        });
        const seatMat = this.createMaterial({
            color: 0x8B0000,
            roughness: 0.7
        });
        
        // Create 8 bar stools
        for (let i = 0; i < 8; i++) {
            const stoolX = CX - 14 + i * 4;
            const stoolGroup = new THREE.Group();
            
            // Base
            const baseGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.1, 12);
            const base = new THREE.Mesh(baseGeo, stoolMat);
            base.position.y = 0.05;
            stoolGroup.add(base);
            
            // Pole
            const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, STOOL_SEAT_HEIGHT - 0.2, 8);
            const pole = new THREE.Mesh(poleGeo, stoolMat);
            pole.position.y = (STOOL_SEAT_HEIGHT - 0.2) / 2;
            stoolGroup.add(pole);
            
            // Footrest
            const footRest = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 16), stoolMat);
            footRest.rotation.x = Math.PI / 2;
            footRest.position.y = 0.5;
            stoolGroup.add(footRest);
            
            // Seat
            const seatGeo = new THREE.CylinderGeometry(0.5, 0.45, 0.25, 16);
            const seat = new THREE.Mesh(seatGeo, seatMat);
            seat.position.y = STOOL_SEAT_HEIGHT;
            seat.castShadow = true;
            stoolGroup.add(seat);
            
            stoolGroup.position.set(stoolX, 0, STOOL_Z);
            stoolGroup.rotation.y = Math.PI; // Face bar
            barGroup.add(stoolGroup);
            
            // Store position for furniture data
            this.barStoolPositions.push({ 
                x: stoolX, 
                z: STOOL_Z, 
                seatHeight: STOOL_SEAT_HEIGHT + 0.1,
                faceAngle: Math.PI
            });
        }
        
        // Drink shelves behind bar
        const shelfMat = this.createMaterial({
            color: 0x2a1a0a,
            roughness: 0.7
        });
        
        for (let shelf = 0; shelf < 3; shelf++) {
            const shelfGeo = new THREE.BoxGeometry(28, 0.1, 0.4);
            const shelfMesh = new THREE.Mesh(shelfGeo, shelfMat);
            shelfMesh.position.set(CX, 2 + shelf * 1, 1);
            barGroup.add(shelfMesh);
            
            // Bottles on shelf
            const bottleColors = [0x8B0000, 0x228B22, 0xFFD700, 0x4169E1, 0xFF6347];
            for (let b = 0; b < 12; b++) {
                const bottleGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8);
                const bottleMat = this.createMaterial({
                    color: bottleColors[b % bottleColors.length],
                    roughness: 0.3,
                    transparent: true,
                    opacity: 0.8
                });
                const bottle = new THREE.Mesh(bottleGeo, bottleMat);
                bottle.position.set(CX - 13 + b * 2.2, 2.3 + shelf * 1, 1);
                barGroup.add(bottle);
            }
        }
        
        scene.add(barGroup);
        this.meshes.push(barGroup);
        
        // Bar collision
        this.collisionSystem.addCollider(
            CX, 6,
            { type: 'box', size: { x: 30, z: 3 }, height: 1.3 },
            1,
            { name: 'bar_counter' }
        );
    }
    
    _createLoungeArea(scene, W, D) {
        const THREE = this.THREE;
        
        // Lounge couches along the sides of the room
        const couchPositions = [
            // Left side couches
            { x: 8, z: 30, rotation: Math.PI / 2 },
            { x: 8, z: 50, rotation: Math.PI / 2 },
            { x: 8, z: 70, rotation: Math.PI / 2 },
            // Right side couches  
            { x: W - 8, z: 30, rotation: -Math.PI / 2 },
            { x: W - 8, z: 50, rotation: -Math.PI / 2 },
            { x: W - 8, z: 70, rotation: -Math.PI / 2 },
        ];
        
        couchPositions.forEach((pos, idx) => {
            const couch = new NightclubCouch(THREE);
            couch.spawn(scene, pos.x, 0, pos.z, { rotation: pos.rotation });
            this.addProp(couch);
            this.couchProps.push(couch);
            
            // Store for furniture data
            this.couchPositions.push({
                x: pos.x,
                z: pos.z,
                rotation: pos.rotation,
                seatHeight: 0.95,
                snapPoints: [
                    { x: -1.5, z: 0 },
                    { x: 0, z: 0 },
                    { x: 1.5, z: 0 }
                ]
            });
            
            // Add collision for couch
            this.collisionSystem.addCollider(
                pos.x, pos.z,
                { type: 'box', size: { x: 5, z: 2 }, height: 1.2 },
                1,
                { name: `lounge_couch_${idx}` }
            );
        });
    }

    _createExitDoor(scene, x, z) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Door frame - taller for high ceiling room
        const frameMat = this.createMaterial({
            color: 0xFFD700,
            roughness: 0.3,
            metalness: 0.7
        });
        
        const frameGeo = new THREE.BoxGeometry(5, 7, 0.4);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.y = 3.5;
        group.add(frame);
        
        // Door opening (dark portal)
        const doorMat = this.createMaterial({
            color: 0x050510,
            roughness: 1
        });
        const doorGeo = new THREE.BoxGeometry(4.2, 6.2, 0.3);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 3.1, 0.1);
        group.add(door);
        
        // EXIT sign above door
        const signBackMat = this.createMaterial({ color: 0x111111 });
        const signBackGeo = new THREE.BoxGeometry(3, 1, 0.2);
        const signBack = new THREE.Mesh(signBackGeo, signBackMat);
        signBack.position.set(0, 7.5, 0);
        group.add(signBack);
        
        const signMat = this.createMaterial({
            color: 0x00FF00,
            emissive: 0x00FF00,
            emissiveIntensity: 0.8
        });
        const signGeo = new THREE.BoxGeometry(2.5, 0.6, 0.08);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 7.5, 0.15);
        group.add(sign);
        
        // Exit glow on floor (in front of door, facing into room)
        const glowMat = this.createMaterial({
            color: 0x00FF00,
            emissive: 0x00FF00,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.3
        });
        const glowGeo = new THREE.CircleGeometry(2.5, 16);
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.rotation.x = -Math.PI / 2;
        glow.position.set(0, 0.02, -3); // In front of door (facing into room)
        glow.userData.isExitGlow = true;
        group.add(glow);
        
        group.position.set(x, 0, z);
        group.rotation.y = Math.PI; // Rotate 180 degrees to face into room
        scene.add(group);
        this.meshes.push(group);
        
        // Add exit portal
        this.addPortal({
            id: 'casino_exit',
            x: x,
            z: z + 2,
            radius: 2,
            targetRoom: 'town',
            targetSpawn: { x: -50, z: 3 }  // Casino exterior position
        });
    }

    _createLighting(scene, W, D, H, CX, CZ) {
        const THREE = this.THREE;
        
        // Ambient light - dim purple
        const ambient = new THREE.AmbientLight(0x1a0a2e, 0.3);
        this.addLight(ambient, scene);
        
        // Chandeliers (point lights with meshes)
        const chandelierPositions = [
            { x: CX - 20, z: CZ - 20 },
            { x: CX + 20, z: CZ - 20 },
            { x: CX - 20, z: CZ + 20 },
            { x: CX + 20, z: CZ + 20 },
            { x: CX, z: CZ },
        ];
        
        chandelierPositions.forEach((pos, idx) => {
            // Light
            const light = new THREE.PointLight(0xFFAA55, 1.0, 30);
            light.position.set(pos.x, H - 1, pos.z);
            this.addLight(light, scene);
            
            // Chandelier mesh
            const chandelierGroup = new THREE.Group();
            
            const chainMat = this.createMaterial({
                color: 0xFFD700,
                roughness: 0.3,
                metalness: 0.8
            });
            
            // Chain
            const chainGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6);
            const chain = new THREE.Mesh(chainGeo, chainMat);
            chain.position.y = H - 0.5;
            chandelierGroup.add(chain);
            
            // Main body
            const bodyGeo = new THREE.CylinderGeometry(0.8, 0.5, 0.6, 16);
            const body = new THREE.Mesh(bodyGeo, chainMat);
            body.position.y = H - 1.5;
            chandelierGroup.add(body);
            
            // Crystals
            const crystalMat = this.createMaterial({
                color: 0xFFFFFF,
                emissive: 0xFFAA55,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.8
            });
            
            for (let c = 0; c < 8; c++) {
                const angle = (c / 8) * Math.PI * 2;
                const crystalGeo = new THREE.ConeGeometry(0.1, 0.4, 6);
                const crystal = new THREE.Mesh(crystalGeo, crystalMat);
                crystal.position.set(
                    pos.x + Math.cos(angle) * 0.6,
                    H - 2,
                    pos.z + Math.sin(angle) * 0.6
                );
                crystal.rotation.x = Math.PI;
                scene.add(crystal);
                this.meshes.push(crystal);
            }
            
            chandelierGroup.position.set(pos.x, 0, pos.z);
            scene.add(chandelierGroup);
            this.meshes.push(chandelierGroup);
        });
        
        // Accent lights at tables
        this.pokerTableMeshes.forEach((table, idx) => {
            const tableLight = new THREE.PointLight(0x00FF88, 0.5, 8);
            tableLight.position.set(table.position.x, 3, table.position.z);
            this.addLight(tableLight, scene);
        });
        
        // Bar backlight
        const barLight = new THREE.PointLight(0xFF6655, 0.8, 15);
        barLight.position.set(CX, 3, 3);
        this.addLight(barLight, scene);
    }

    update(time, delta, nightFactor = 0.5) {
        // Call parent update for all props
        super.update(time, delta, nightFactor);
        
        // Animate roulette wheels
        this.rouletteMeshes.forEach((table, idx) => {
            table.traverse(child => {
                if (child.userData.isRouletteWheel) {
                    child.rotation.y += delta * 0.5;
                }
            });
        });
        
        // Animate exit glow
        this.meshes.forEach(mesh => {
            if (mesh.userData && mesh.userData.isExitGlow) {
                mesh.material.opacity = 0.2 + Math.sin(time * 2) * 0.1;
            }
        });
        
        // Animate game room glow (traverse groups)
        this.meshes.forEach(group => {
            if (group.traverse) {
                group.traverse(child => {
                    if (child.userData && child.userData.isGameRoomGlow && child.material) {
                        child.material.opacity = 0.2 + Math.sin(time * 3) * 0.15;
                    }
                });
            }
        });
    }

    cleanup() {
        super.cleanup();
        
        this.slotMachineProps = [];
        this.chipStackProps = [];
        this.pokerTableMeshes = [];
        this.rouletteMeshes = [];
        this.couchProps = [];
        this.barStoolPositions = [];
        this.couchPositions = [];
        this.chairPositions = [];
    }

    getSpawnPosition(fromRoom = null) {
        // Spawn near exit when coming from town
        if (fromRoom === 'town') {
            return {
                x: CasinoRoom.CENTER_X,
                z: CasinoRoom.ROOM_DEPTH - 8
            };
        }
        // Default spawn (center of room)
        return {
            x: CasinoRoom.CENTER_X,
            z: CasinoRoom.CENTER_Z
        };
    }

    getRoomData() {
        const W = CasinoRoom.ROOM_WIDTH;
        const D = CasinoRoom.ROOM_DEPTH;
        const CX = CasinoRoom.CENTER_X;
        const CZ = CasinoRoom.CENTER_Z;
        
        // Build furniture array from stored positions
        const furniture = [];
        
        // Bar stools - same pattern as pizza parlor
        this.barStoolPositions.forEach(stool => {
            furniture.push({
                type: 'stool',
                position: { x: stool.x, z: stool.z },
                seatHeight: stool.seatHeight,
                faceAngle: stool.faceAngle,
                radius: 0.5,
                dismountBack: true
            });
        });
        
        // Couches with snap points
        this.couchPositions.forEach(couch => {
            furniture.push({
                type: 'couch',
                position: { x: couch.x, z: couch.z },
                rotation: couch.rotation,
                seatHeight: couch.seatHeight,
                snapPoints: couch.snapPoints,
                interactionRadius: 3
            });
        });
        
        // Chairs around tables
        this.chairPositions.forEach(chair => {
            furniture.push({
                type: 'chair',
                position: { x: chair.position.x, z: chair.position.z },
                seatHeight: chair.seatHeight,
                faceAngle: chair.faceAngle,
                radius: chair.radius
            });
        });
        
        return {
            bounds: {
                minX: 0,
                maxX: W,
                minZ: 0,
                maxZ: D
            },
            spawnPos: this.getSpawnPosition(),
            furniture: furniture,
            landingSurfaces: [
                // Bar stools as landing surfaces
                ...this.barStoolPositions.map(s => ({ 
                    type: 'circle', 
                    x: s.x, 
                    z: s.z, 
                    radius: 0.6, 
                    height: s.seatHeight 
                })),
                // Chairs as landing surfaces (poker + blackjack stools)
                ...this.chairPositions.map(c => ({
                    type: 'circle',
                    x: c.position.x,
                    z: c.position.z,
                    radius: 0.7,
                    height: c.seatHeight
                })),
                // Poker tables (2 near exit)
                { type: 'circle', x: CX - 18, z: CZ + 15, radius: 6, height: 1.1 },
                { type: 'circle', x: CX + 18, z: CZ + 15, radius: 6, height: 1.1 },
                // Blackjack tables (2 near bar)
                { type: 'circle', x: CX - 15, z: 22, radius: 4, height: 1.1 },
                { type: 'circle', x: CX + 15, z: 22, radius: 4, height: 1.1 },
                // Roulette tables (centered, ~6x11)
                { type: 'box', minX: CX - 16, maxX: CX - 8, minZ: CZ - 6, maxZ: CZ + 6, height: 1.1 },
                { type: 'box', minX: CX + 8, maxX: CX + 16, minZ: CZ - 6, maxZ: CZ + 6, height: 1.1 },
                // Bar counter
                { type: 'box', minX: CX - 15, maxX: CX + 15, minZ: 5, maxZ: 7, height: 1.3 },
                ...(this.landingSurfaces || [])
            ],
            // Poker table positions for interaction (2 near exit)
            pokerTables: [
                { x: CX - 18, z: CZ + 15, radius: 6 },
                { x: CX + 18, z: CZ + 15, radius: 6 },
            ],
            // Blackjack table positions (2 near bar)
            blackjackTables: [
                { x: CX - 15, z: 22, radius: 4 },
                { x: CX + 15, z: 22, radius: 4 },
            ],
            // Roulette table positions (centered)
            rouletteTables: [
                { x: CX - 12, z: CZ, radius: 4 },
                { x: CX + 12, z: CZ, radius: 4 },
            ],
            // Bar stools for sitting
            stools: this.barStoolPositions.map(s => ({ 
                x: s.x, 
                z: s.z, 
                radius: 0.5 
            })),
            // Bar counter collision
            counter: { minX: CX - 15, maxX: CX + 15, minZ: 5, maxZ: 7 }
        };
    }
    
    /**
     * Check player movement and clamp to room bounds (like Nightclub)
     * This is the primary wall collision - prevents walking outside the room
     */
    checkPlayerMovement(currentX, currentZ, nextX, nextZ, playerRadius = 0.6, playerY = 0) {
        const W = CasinoRoom.ROOM_WIDTH;
        const D = CasinoRoom.ROOM_DEPTH;
        const WALL = 2; // Wall margin - how close player can get to walls
        
        let finalX = nextX;
        let finalZ = nextZ;
        let collided = false;
        
        // Clamp to room bounds (walls) - this is the key part!
        if (finalX < WALL) { 
            finalX = WALL; 
            collided = true; 
        }
        if (finalX > W - WALL) { 
            finalX = W - WALL; 
            collided = true; 
        }
        if (finalZ < WALL) { 
            finalZ = WALL; 
            collided = true; 
        }
        if (finalZ > D - WALL) { 
            finalZ = D - WALL; 
            collided = true; 
        }
        
        return { x: finalX, z: finalZ, collided };
    }
}

export default CasinoRoom;

