/**
 * PizzaParlor - Italian restaurant style building
 * Extracted from PropsFactory.js for maintainability
 */

import BaseBuilding from './BaseBuilding';

class PizzaParlor extends BaseBuilding {
    build({ w = 12, h = 7, d = 10 } = {}) {
        const THREE = this.THREE;
        const group = this.group;
        group.name = 'pizza_parlor_building';

        // Colors
        const brickRed = 0x8B4513;
        const awningGreen = 0x228B22;
        const awningWhite = 0xFFFFFF;
        const awningRed = 0xDC143C;
        const windowWarm = 0xFFF8DC;
        const woodBrown = 0x5C4033;
        const creamStucco = 0xFAF0E6;

        // Stone foundation
        const foundationMat = this.getMaterial(0x696969, { roughness: 0.9 });
        const foundationGeo = new THREE.BoxGeometry(w + 1.5, 0.5, d + 1.5);
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.position.y = 0.25;
        foundation.receiveShadow = true;
        group.add(foundation);

        // Foundation cap trim
        const trimMat = this.getMaterial(0x505050, { roughness: 0.8 });
        const trimGeo = new THREE.BoxGeometry(w + 1.6, 0.15, d + 1.6);
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.y = 0.58;
        group.add(trim);

        // Main building walls
        const wallMat = this.getMaterial(creamStucco, { roughness: 0.7 });
        const mainWallGeo = new THREE.BoxGeometry(w, h - 1.2, d);
        const mainWall = new THREE.Mesh(mainWallGeo, wallMat);
        mainWall.position.y = (h - 1.2) / 2 + 1.9;
        mainWall.castShadow = true;
        mainWall.receiveShadow = true;
        group.add(mainWall);

        // Brick base section
        const brickMat = this.getMaterial(brickRed, { roughness: 0.9 });
        const brickBaseGeo = new THREE.BoxGeometry(w + 0.1, 1.2, d + 0.1);
        const brickBase = new THREE.Mesh(brickBaseGeo, brickMat);
        brickBase.position.y = 1.25;
        group.add(brickBase);

        // Brick crown at top
        const brickCrownGeo = new THREE.BoxGeometry(w + 0.1, 0.6, d + 0.1);
        const brickCrown = new THREE.Mesh(brickCrownGeo, brickMat);
        brickCrown.position.y = h + 0.65;
        group.add(brickCrown);

        // Decorative brick columns at front corners
        [
            [-w / 2 - 0.45, d / 2 + 0.45],
            [w / 2 + 0.45, d / 2 + 0.45],
        ].forEach(([cx, cz]) => {
            const columnGeo = new THREE.BoxGeometry(0.7, h, 0.7);
            const column = new THREE.Mesh(columnGeo, brickMat);
            column.position.set(cx, h / 2 + 0.65, cz);
            column.castShadow = true;
            group.add(column);

            const capGeo = new THREE.BoxGeometry(0.9, 0.3, 0.9);
            const cap = new THREE.Mesh(capGeo, trimMat);
            cap.position.set(cx, h + 1.15, cz);
            group.add(cap);
        });

        // Italian flag awning
        const awningWidth = w - 2;
        const awningMat = this.getMaterial(awningWhite, { roughness: 0.5 });
        const awningGeo = new THREE.BoxGeometry(awningWidth, 0.12, 2.5);
        const awning = new THREE.Mesh(awningGeo, awningMat);
        
        const greenMat = this.getMaterial(awningGreen, { roughness: 0.5 });
        const greenGeo = new THREE.BoxGeometry(awningWidth / 3 - 0.05, 0.02, 2.5);
        const greenStripe = new THREE.Mesh(greenGeo, greenMat);
        greenStripe.position.set(-awningWidth / 3, 0.07, 0);
        awning.add(greenStripe);
        
        const redMat = this.getMaterial(awningRed, { roughness: 0.5 });
        const redGeo = new THREE.BoxGeometry(awningWidth / 3 - 0.05, 0.02, 2.5);
        const redStripe = new THREE.Mesh(redGeo, redMat);
        redStripe.position.set(awningWidth / 3, 0.07, 0);
        awning.add(redStripe);
        
        awning.rotation.x = Math.PI / 12;
        awning.position.set(0, h - 0.8, d / 2 + 1.8);
        group.add(awning);

        // Slanted tile roof at back
        const roofMat = this.getMaterial(0x704020, { roughness: 0.8 });
        const roofGeo = new THREE.BoxGeometry(w + 1.5, 0.35, d / 2 + 1.5);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.rotation.x = -Math.PI / 10;
        roof.position.set(0, h + 1.8, -d / 4 - 0.5);
        roof.castShadow = true;
        group.add(roof);

        // Front parapet wall
        const parapetGeo = new THREE.BoxGeometry(w + 0.3, 0.8, 0.35);
        const parapet = new THREE.Mesh(parapetGeo, brickMat);
        parapet.position.set(0, h + 1.35, d / 2 + 0.1);
        group.add(parapet);

        // Bay window
        const bayMat = this.getMaterial(woodBrown, { roughness: 0.7 });
        const bayFrameGeo = new THREE.BoxGeometry(3.8, 2.8, 1.3);
        const bayFrame = new THREE.Mesh(bayFrameGeo, bayMat);
        bayFrame.position.set(-w / 4 - 0.3, 3, d / 2 + 0.8);
        group.add(bayFrame);

        const glassMat = this.getMaterial(windowWarm, {
            transparent: true,
            opacity: 0.6,
            emissive: 0xFFD070,
            emissiveIntensity: 0.3
        });
        const frontGlassGeo = new THREE.BoxGeometry(3.4, 2.4, 0.06);
        const frontGlass = new THREE.Mesh(frontGlassGeo, glassMat);
        frontGlass.position.set(-w / 4 - 0.3, 3, d / 2 + 1.5);
        group.add(frontGlass);

        [-1, 1].forEach(side => {
            const sideGlassGeo = new THREE.BoxGeometry(0.06, 2.4, 0.9);
            const sideGlass = new THREE.Mesh(sideGlassGeo, glassMat);
            sideGlass.position.set(-w / 4 - 0.3 + side * 1.9, 3, d / 2 + 1);
            group.add(sideGlass);
        });

        // Door
        const doorFrameMat = this.getMaterial(0x3D2817, { roughness: 0.7 });
        const doorFrameGeo = new THREE.BoxGeometry(2.8, 4.8, 0.15);
        const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
        doorFrame.position.set(w / 4, 3.1, d / 2 + 0.08);
        group.add(doorFrame);

        const doorMat = this.getMaterial(woodBrown, { roughness: 0.6 });
        const doorGeo = new THREE.BoxGeometry(2.4, 4.4, 0.1);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(w / 4, 3, d / 2 + 0.18);
        group.add(door);

        // Door panels
        const panelMat = this.getMaterial(0x2F1A0A, { roughness: 0.7 });
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
                const panelGeo = new THREE.BoxGeometry(0.85, 1.4, 0.03);
                const panel = new THREE.Mesh(panelGeo, panelMat);
                panel.position.set(w / 4 - 0.45 + col * 0.95, 1.5 + row * 2.3, d / 2 + 0.26);
                group.add(panel);
            }
        }

        // Door window
        const doorWindowGeo = new THREE.BoxGeometry(1.4, 0.9, 0.05);
        const doorWindow = new THREE.Mesh(doorWindowGeo, glassMat);
        doorWindow.position.set(w / 4, 4.4, d / 2 + 0.26);
        group.add(doorWindow);

        // Door handle
        const handleMat = this.getMaterial(0xFFD700, { metalness: 0.8, roughness: 0.2 });
        const handleGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.4, 8);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.rotation.z = Math.PI / 2;
        handle.position.set(w / 4 + 0.75, 2.8, d / 2 + 0.35);
        group.add(handle);

        // Pizza sign
        const signBackMat = this.getMaterial(0x5C4033, { roughness: 0.7 });
        const signBackGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.12, 16);
        const signBack = new THREE.Mesh(signBackGeo, signBackMat);
        signBack.rotation.x = Math.PI / 2;
        signBack.position.set(0, h + 2.2, d / 2 + 0.35);
        group.add(signBack);

        const signMat = this.getMaterial(0xFFD700, { metalness: 0.6, roughness: 0.3 });
        const signGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.08, 16);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.rotation.x = Math.PI / 2;
        sign.position.set(0, h + 2.2, d / 2 + 0.45);
        group.add(sign);

        const pizzaMat = this.getMaterial(0xFFA500, { roughness: 0.5 });
        const pizzaGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.04, 16);
        const pizza = new THREE.Mesh(pizzaGeo, pizzaMat);
        pizza.rotation.x = Math.PI / 2;
        pizza.position.set(0, h + 2.2, d / 2 + 0.52);
        group.add(pizza);

        // Pepperoni
        const pepMat = this.getMaterial(0x8B0000, { roughness: 0.6 });
        [[-0.4, 0.3], [0.4, 0.2], [0, -0.4], [-0.3, -0.1], [0.35, -0.25]].forEach(([px, py]) => {
            const pepGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.03, 8);
            const pep = new THREE.Mesh(pepGeo, pepMat);
            pep.rotation.x = Math.PI / 2;
            pep.position.set(px, h + 2.2 + py, d / 2 + 0.56);
            group.add(pep);
        });

        // Outdoor bistro table
        const tableMat = this.getMaterial(0x2F4F4F, { roughness: 0.6 });
        const tableTopGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.08, 12);
        const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
        tableTop.position.set(w / 2 + 2.5, 1.5, d / 4);
        group.add(tableTop);

        const tableLegGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.4, 8);
        const tableLeg = new THREE.Mesh(tableLegGeo, tableMat);
        tableLeg.position.set(w / 2 + 2.5, 0.75, d / 4);
        group.add(tableLeg);

        // Flower boxes
        const boxMat = this.getMaterial(0x704020, { roughness: 0.8 });
        [-d / 3, d / 3].forEach(bz => {
            const boxGeo = new THREE.BoxGeometry(0.7, 0.35, 1);
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.set(-w / 2 - 0.4, 2.2, bz);
            group.add(box);

            const flowerColors = [0xFF69B4, 0xFFD700, 0xFF4500];
            flowerColors.forEach((color, i) => {
                const flowerMat = this.getMaterial(color, { roughness: 0.5 });
                const flowerGeo = new THREE.SphereGeometry(0.12, 6, 6);
                const flower = new THREE.Mesh(flowerGeo, flowerMat);
                flower.position.set(-w / 2 - 0.4, 2.55, bz - 0.25 + i * 0.25);
                group.add(flower);
            });
        });

        // Interior warm light
        const interiorLight = new THREE.PointLight(0xFFAA55, 0.8, 12);
        interiorLight.position.set(0, h / 2, 0);
        group.add(interiorLight);
        this.lights.push(interiorLight);

        // String lights
        for (let i = 0; i < 7; i++) {
            const bulbMat = this.getMaterial(0xFFFFAA, { 
                emissive: 0xFFFF00,
                emissiveIntensity: 0.4 
            });
            const bulbGeo = new THREE.SphereGeometry(0.1, 6, 6);
            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
            bulb.position.set(-3 + i, h - 0.1 + Math.sin(i * 0.8) * 0.12, d / 2 + 0.6);
            group.add(bulb);
        }

        return group;
    }
}

/**
 * Create a Pizza Parlor building
 * @param {THREE} THREE - Three.js library
 * @param {Object} config - Building configuration
 * @returns {THREE.Group}
 */
export function createPizzaParlor(THREE, config = {}) {
    const parlor = new PizzaParlor(THREE);
    return parlor.build(config);
}

/**
 * Generate Pizza Parlor interior room
 * @param {THREE} THREE - Three.js library
 * @param {THREE.Scene} scene - Scene to add objects to
 * @returns {Object} Room data with bounds, spawnPos, furniture, landingSurfaces
 */
export function generatePizzaInterior(THREE, scene) {
    const PIZZA_SIZE = 32;
    scene.background = new THREE.Color(0x0a0502);
    
    const addMesh = (geo, mat, x, y, z, opts = {}) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        if (opts.rotX) mesh.rotation.x = opts.rotX;
        if (opts.castShadow) mesh.castShadow = true;
        if (opts.receiveShadow) mesh.receiveShadow = true;
        scene.add(mesh);
        return mesh;
    };
    
    const addToGroup = (group, geo, mat, x, y, z, opts = {}) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        if (opts.castShadow) mesh.castShadow = true;
        group.add(mesh);
        return mesh;
    };
    
    // Checkered floor
    const tileSize = 2;
    const tilesPerSide = Math.ceil(PIZZA_SIZE / tileSize);
    for (let tx = -tilesPerSide/2; tx < tilesPerSide/2; tx++) {
        for (let tz = -tilesPerSide/2; tz < tilesPerSide/2; tz++) {
            addMesh(new THREE.BoxGeometry(tileSize, 0.1, tileSize), new THREE.MeshStandardMaterial({ color: (tx + tz) % 2 === 0 ? 0xf5f5f5 : 0xcc2222, roughness: 0.3 }), tx * tileSize + tileSize/2, 0, tz * tileSize + tileSize/2, { receiveShadow: true });
        }
    }
    
    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3d2010, roughness: 0.8 });
    addMesh(new THREE.BoxGeometry(PIZZA_SIZE, 10, 0.5), wallMat, 0, 5, -PIZZA_SIZE/2);
    addMesh(new THREE.BoxGeometry(0.5, 10, PIZZA_SIZE), wallMat, -PIZZA_SIZE/2, 5, 0);
    addMesh(new THREE.BoxGeometry(0.5, 10, PIZZA_SIZE), wallMat, PIZZA_SIZE/2, 5, 0);
    addMesh(new THREE.BoxGeometry(10, 10, 0.5), wallMat, -11, 5, PIZZA_SIZE/2);
    addMesh(new THREE.BoxGeometry(10, 10, 0.5), wallMat, 11, 5, PIZZA_SIZE/2);
    addMesh(new THREE.BoxGeometry(12, 3, 0.5), wallMat, 0, 8.5, PIZZA_SIZE/2);
    
    // Ceiling
    addMesh(new THREE.PlaneGeometry(PIZZA_SIZE, PIZZA_SIZE), new THREE.MeshStandardMaterial({ color: 0x0a0503, roughness: 0.95 }), 0, 10, 0, { rotX: Math.PI / 2 });
    
    // Counter
    const COUNTER_Z = -PIZZA_SIZE/2 + 2.5;
    const COUNTER_DEPTH = 3;
    const COUNTER_HEIGHT = 2.5;
    const STOOL_Z = COUNTER_Z + COUNTER_DEPTH/2 + 1.5;
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.5 });
    const wallAccentMat = new THREE.MeshStandardMaterial({ color: 0x5a3520, roughness: 0.7 });
    
    addMesh(new THREE.BoxGeometry(20, 0.25, COUNTER_DEPTH), counterMat, 0, COUNTER_HEIGHT, COUNTER_Z, { castShadow: true, receiveShadow: true });
    addMesh(new THREE.BoxGeometry(20, COUNTER_HEIGHT, 0.3), wallAccentMat, 0, COUNTER_HEIGHT/2, COUNTER_Z + COUNTER_DEPTH/2);
    addMesh(new THREE.BoxGeometry(20, COUNTER_HEIGHT, 0.3), wallAccentMat, 0, COUNTER_HEIGHT/2, COUNTER_Z - COUNTER_DEPTH/2);
    addMesh(new THREE.BoxGeometry(0.3, COUNTER_HEIGHT, COUNTER_DEPTH), wallAccentMat, -10, COUNTER_HEIGHT/2, COUNTER_Z);
    addMesh(new THREE.BoxGeometry(0.3, COUNTER_HEIGHT, COUNTER_DEPTH), wallAccentMat, 10, COUNTER_HEIGHT/2, COUNTER_Z);
    
    // Oven
    const ovenMat = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.4 });
    addMesh(new THREE.BoxGeometry(6, 5, 2), ovenMat, -5, 2.5, -PIZZA_SIZE/2 + 1, { castShadow: true });
    addMesh(new THREE.BoxGeometry(3, 2.5, 0.1), new THREE.MeshBasicMaterial({ color: 0x1a0500 }), -5, 2, -PIZZA_SIZE/2 + 2.1);
    const ovenGlow = new THREE.PointLight(0xff3300, 2.5, 8);
    ovenGlow.position.set(-5, 2, -PIZZA_SIZE/2 + 1.5);
    scene.add(ovenGlow);
    const emberGlow = new THREE.PointLight(0xff5500, 1.0, 3);
    emberGlow.position.set(-5, 1.5, -PIZZA_SIZE/2 + 1);
    scene.add(emberGlow);
    
    // Bar stools
    const STOOL_SEAT_HEIGHT = 1.8;
    const barStoolPositions = [-7, -4, -1, 2, 5, 8];
    barStoolPositions.forEach(x => {
        const stoolGroup = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
        const seatMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 });
        addToGroup(stoolGroup, new THREE.CylinderGeometry(0.35, 0.45, 0.1, 12), metalMat, 0, 0.05, 0);
        addToGroup(stoolGroup, new THREE.CylinderGeometry(0.08, 0.12, STOOL_SEAT_HEIGHT - 0.2, 8), metalMat, 0, (STOOL_SEAT_HEIGHT - 0.2)/2, 0);
        const footRest = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 16), metalMat);
        footRest.rotation.x = Math.PI / 2;
        footRest.position.y = 0.5;
        stoolGroup.add(footRest);
        addToGroup(stoolGroup, new THREE.CylinderGeometry(0.5, 0.45, 0.25, 16), seatMat, 0, STOOL_SEAT_HEIGHT, 0, { castShadow: true });
        stoolGroup.position.set(x, 0, STOOL_Z);
        stoolGroup.rotation.y = Math.PI;
        scene.add(stoolGroup);
    });
    
    // Round tables with chairs
    const tablePositions = [{ x: -8, z: 2 }, { x: 8, z: 2 }, { x: -8, z: 9 }, { x: 8, z: 9 }];
    const chairData = [];
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5D3A1A, roughness: 0.6 });
    const tableclothMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.7 });
    const chairWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.6 });
    
    tablePositions.forEach(table => {
        const tableGroup = new THREE.Group();
        addToGroup(tableGroup, new THREE.CylinderGeometry(0.3, 0.5, 2.5, 8), woodMat, 0, 1.25, 0, { castShadow: true });
        addToGroup(tableGroup, new THREE.CylinderGeometry(2, 2, 0.2, 24), woodMat, 0, 2.6, 0, { castShadow: true });
        addToGroup(tableGroup, new THREE.CylinderGeometry(2.1, 2.3, 0.05, 24), tableclothMat, 0, 2.72, 0);
        tableGroup.position.set(table.x, 0, table.z);
        scene.add(tableGroup);
        
        // 4 chairs around each table
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const chairX = table.x + Math.cos(angle) * 3;
            const chairZ = table.z + Math.sin(angle) * 3;
            const faceAngle = Math.atan2(table.x - chairX, table.z - chairZ);
            
            const chairGroup = new THREE.Group();
            addToGroup(chairGroup, new THREE.BoxGeometry(1.2, 0.2, 1.2), chairWoodMat, 0, 2.8, 0, { castShadow: true });
            addToGroup(chairGroup, new THREE.BoxGeometry(1.2, 1.8, 0.15), chairWoodMat, 0, 3.8, -0.52);
            for (let lx = -0.45; lx <= 0.45; lx += 0.9) {
                for (let lz = -0.45; lz <= 0.45; lz += 0.9) {
                    addToGroup(chairGroup, new THREE.BoxGeometry(0.1, 2.8, 0.1), chairWoodMat, lx, 1.4, lz);
                }
            }
            chairGroup.position.set(chairX, 0, chairZ);
            chairGroup.rotation.y = faceAngle;
            scene.add(chairGroup);
            chairData.push({ type: 'chair', position: { x: chairX, z: chairZ }, seatHeight: 2.9, faceAngle, radius: 0.7 });
        }
    });
    
    // Pendant lights over tables
    const createPendantLight = (x, z, intensity = 2.0, castShadow = false) => {
        const lightGroup = new THREE.Group();
        addToGroup(lightGroup, new THREE.CylinderGeometry(0.02, 0.02, 3, 8), new THREE.MeshBasicMaterial({ color: 0x222222 }), 0, 8.5, 0);
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x8B0000, side: THREE.DoubleSide, roughness: 0.8 }));
        shade.position.y = 7.5;
        lightGroup.add(shade);
        addToGroup(lightGroup, new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa55 }), 0, 7.0, 0);
        const light = new THREE.PointLight(0xff9944, intensity, 10);
        light.position.y = 7;
        light.castShadow = castShadow;
        lightGroup.add(light);
        lightGroup.position.set(x, 0, z);
        return lightGroup;
    };
    scene.add(createPendantLight(-8, 2, 2.0, true));
    scene.add(createPendantLight(8, 2, 2.0));
    scene.add(createPendantLight(-8, 9, 2.0));
    scene.add(createPendantLight(8, 9, 2.0, true));
    
    // Bar lights
    for (let i = 0; i < 3; i++) {
        const barX = -6 + i * 6;
        addMesh(new THREE.CylinderGeometry(0.015, 0.015, 3.5, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }), barX, 8.25, COUNTER_Z);
        addMesh(new THREE.CylinderGeometry(0.25, 0.4, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0x1a0a05, metalness: 0.7 }), barX, 6.5, COUNTER_Z);
        const barLight = new THREE.PointLight(0xff9933, 1.8, 7);
        barLight.position.set(barX, 6, COUNTER_Z);
        barLight.castShadow = i === 1;
        scene.add(barLight);
        addMesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa55 }), barX, 6.25, COUNTER_Z);
    }
    
    // Wall decorations - Italian flag
    [0x008C45, 0xF4F5F0, 0xCD212A].forEach((color, i) => {
        addMesh(new THREE.BoxGeometry(1.5, 3, 0.1), new THREE.MeshStandardMaterial({ color }), -5 + (i * 1.5) - 1.5, 7, -PIZZA_SIZE/2 + 0.3);
    });
    
    // Neon sign
    addMesh(new THREE.BoxGeometry(8, 2, 0.2), new THREE.MeshStandardMaterial({ color: 0x1a0a00 }), 5, 7, -PIZZA_SIZE/2 + 0.3);
    const neonLight = new THREE.PointLight(0xff4400, 0.8, 5);
    neonLight.position.set(5, 7, -PIZZA_SIZE/2 + 1);
    scene.add(neonLight);
    addMesh(new THREE.BoxGeometry(6, 1, 0.1), new THREE.MeshBasicMaterial({ color: 0xcc4400 }), 5, 7, -PIZZA_SIZE/2 + 0.45);
    
    // Ambient lighting
    scene.add(new THREE.AmbientLight(0x0a0500, 0.08));
    scene.add(new THREE.HemisphereLight(0x0a0400, 0x000000, 0.05));
    const exitLight = new THREE.PointLight(0x00ff00, 0.3, 4);
    exitLight.position.set(0, 9, PIZZA_SIZE/2 - 1);
    scene.add(exitLight);
    addMesh(new THREE.BoxGeometry(2, 0.5, 0.1), new THREE.MeshBasicMaterial({ color: 0x005500 }), 0, 9.2, PIZZA_SIZE/2 - 0.3);
    
    const furnitureData = [
        ...barStoolPositions.map(x => ({ type: 'stool', position: { x, z: STOOL_Z }, seatHeight: STOOL_SEAT_HEIGHT + 0.1, faceAngle: Math.PI, radius: 0.5, dismountBack: true })),
        ...chairData
    ];
    
    // Room update function - handles pizza parlor animations
    const update = (time, delta) => {
        // Neon sign flicker
        if (neonLight) {
            neonLight.intensity = 0.7 + Math.sin(time * 3) * 0.1;
        }
    };
    
    return { 
        bounds: { minX: -PIZZA_SIZE/2 + 1, maxX: PIZZA_SIZE/2 - 1, minZ: -PIZZA_SIZE/2 + 1, maxZ: PIZZA_SIZE/2 - 1 },
        spawnPos: { x: 0, z: 12 },
        furniture: furnitureData,
        landingSurfaces: [
            ...tablePositions.map(t => ({ type: 'circle', x: t.x, z: t.z, radius: 2.2, height: 2.75 })),
            { type: 'box', minX: -10, maxX: 10, minZ: COUNTER_Z - COUNTER_DEPTH/2, maxZ: COUNTER_Z + COUNTER_DEPTH/2, height: COUNTER_HEIGHT + 0.1 },
            ...barStoolPositions.map(x => ({ type: 'circle', x, z: STOOL_Z, radius: 0.6, height: STOOL_SEAT_HEIGHT + 0.05 })),
            ...chairData.map(c => ({ type: 'circle', x: c.position.x, z: c.position.z, radius: 0.7, height: 2.9 }))
        ],
        tables: tablePositions.map(t => ({ x: t.x, z: t.z, radius: 0.6 })),
        chairs: chairData.map(c => ({ x: c.position.x, z: c.position.z, radius: 0.7 })),
        stools: barStoolPositions.map(x => ({ x, z: STOOL_Z, radius: 0.5 })),
        counter: { minX: -10, maxX: 10, minZ: COUNTER_Z - COUNTER_DEPTH/2, maxZ: COUNTER_Z + COUNTER_DEPTH/2 },
        update
    };
}

export default PizzaParlor;

