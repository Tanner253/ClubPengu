/**
 * Dojo - Japanese pagoda style martial arts temple
 * Extracted from PropsFactory.js for maintainability
 */

import BaseBuilding from './BaseBuilding';

class Dojo extends BaseBuilding {
    build({ w = 14, h = 8, d = 14 } = {}) {
        const THREE = this.THREE;
        const group = this.group;
        group.name = 'dojo_building';

        // Colors
        const wallRed = 0x8B0000;
        const wallCream = 0xFAF0E6;
        const roofTile = 0x2F1810;
        const roofRed = 0xA02020;
        const gold = 0xFFD700;
        const woodDark = 0x3D2817;
        const stoneGray = 0x4A4A4A;

        // Stone foundation platform
        const foundationMat = this.getMaterial(stoneGray, { roughness: 0.9 });
        const foundationGeo = new THREE.BoxGeometry(w + 2, 1, d + 2);
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.position.y = 0.5;
        foundation.receiveShadow = true;
        group.add(foundation);

        // Steps at front - stairs leading UP to the door
        for (let i = 0; i < 3; i++) {
            const stepWidth = 4 - i * 0.4;
            const stepGeo = new THREE.BoxGeometry(stepWidth, 0.28, 0.9);
            const step = new THREE.Mesh(stepGeo, foundationMat);
            const stepY = 0.28 + i * 0.28;
            const stepZ = d / 2 + 1.5 + (2 - i) * 0.95;
            step.position.set(0, stepY, stepZ);
            step.receiveShadow = true;
            step.name = `dojo_step_${i}`;
            group.add(step);
        }

        // Main walls
        const mainWallMat = this.getMaterial(wallRed, { roughness: 0.7 });
        const mainWallGeo = new THREE.BoxGeometry(w, h, d);
        const mainWall = new THREE.Mesh(mainWallGeo, mainWallMat);
        mainWall.position.y = h / 2 + 1;
        mainWall.castShadow = true;
        mainWall.receiveShadow = true;
        group.add(mainWall);

        // Decorative cream panels
        const panelMat = this.getMaterial(wallCream, { roughness: 0.6 });
        [
            { x: -w / 3, z: d / 2 + 0.12 },
            { x: w / 3, z: d / 2 + 0.12 },
            { x: -w / 3, z: -d / 2 - 0.12 },
            { x: w / 3, z: -d / 2 - 0.12 },
        ].forEach(pos => {
            const panelGeo = new THREE.BoxGeometry(1.8, h - 2, 0.15);
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.set(pos.x, h / 2 + 1, pos.z);
            group.add(panel);
        });

        // Red columns at corners
        const pillarMat = this.getMaterial(wallRed, { roughness: 0.5 });
        const goldMat = this.getMaterial(gold, { metalness: 0.8, roughness: 0.2 });
        
        [
            [-w / 2 - 0.3, d / 2 + 0.3],
            [w / 2 + 0.3, d / 2 + 0.3],
            [-w / 2 - 0.3, -d / 2 - 0.3],
            [w / 2 + 0.3, -d / 2 - 0.3],
        ].forEach(([px, pz]) => {
            const pillarGeo = new THREE.CylinderGeometry(0.45, 0.55, h, 8);
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(px, h / 2 + 1, pz);
            pillar.castShadow = true;
            group.add(pillar);

            const capGeo = new THREE.CylinderGeometry(0.55, 0.45, 0.25, 8);
            const cap = new THREE.Mesh(capGeo, goldMat);
            cap.position.set(px, h + 1.15, pz);
            group.add(cap);

            const baseGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 8);
            const base = new THREE.Mesh(baseGeo, goldMat);
            base.position.set(px, 1.15, pz);
            group.add(base);
        });

        // Pagoda roof - three tiers
        const roofMat = this.getMaterial(roofTile, { roughness: 0.8 });
        const edgeMat = this.getMaterial(roofRed, { roughness: 0.6 });
        const tierGaps = [0, 5.5, 11];
        
        for (let tier = 0; tier < 3; tier++) {
            const tierScale = 1 - tier * 0.25;
            const tierGap = tierGaps[tier];
            const roofY = h + 1.2 + tierGap;
            const roofWidth = (w + 4) * tierScale;
            const roofDepth = (d + 4) * tierScale;
            
            const platformGeo = new THREE.BoxGeometry(roofWidth, 0.4, roofDepth);
            const platform = new THREE.Mesh(platformGeo, roofMat);
            platform.position.y = roofY;
            platform.castShadow = true;
            group.add(platform);

            const edgeRadius = 0.35 * tierScale;
            
            // Front and back edges
            [-1, 1].forEach(side => {
                const edgeGeo = new THREE.CylinderGeometry(edgeRadius, edgeRadius * 1.4, roofWidth - 0.1, 8);
                const edge = new THREE.Mesh(edgeGeo, edgeMat);
                edge.rotation.z = Math.PI / 2;
                edge.position.set(0, roofY - 0.25, side * (roofDepth / 2 + edgeRadius * 0.5));
                group.add(edge);
            });

            // Left and right edges
            [-1, 1].forEach(side => {
                const edgeGeo = new THREE.CylinderGeometry(edgeRadius, edgeRadius * 1.4, roofDepth - 0.1, 8);
                const edge = new THREE.Mesh(edgeGeo, edgeMat);
                edge.rotation.x = Math.PI / 2;
                edge.position.set(side * (roofWidth / 2 + edgeRadius * 0.5), roofY - 0.25, 0);
                group.add(edge);
            });

            // Upturned corner pieces
            [
                [-roofWidth / 2 - 0.3, roofDepth / 2 + 0.3],
                [roofWidth / 2 + 0.3, roofDepth / 2 + 0.3],
                [-roofWidth / 2 - 0.3, -roofDepth / 2 - 0.3],
                [roofWidth / 2 + 0.3, -roofDepth / 2 - 0.3],
            ].forEach(([cx, cz]) => {
                const upturnGeo = new THREE.ConeGeometry(0.5 * tierScale, 1.2 * tierScale, 4);
                const upturn = new THREE.Mesh(upturnGeo, edgeMat);
                upturn.position.set(cx, roofY + 0.4, cz);
                group.add(upturn);
            });

            // Top tier finial
            if (tier === 2) {
                const ridgeGeo = new THREE.BoxGeometry(roofWidth * 0.7, 0.6, 0.25);
                const ridge = new THREE.Mesh(ridgeGeo, edgeMat);
                ridge.position.y = roofY + 0.5;
                group.add(ridge);

                const finialGeo = new THREE.SphereGeometry(0.5, 12, 12);
                const finial = new THREE.Mesh(finialGeo, goldMat);
                finial.position.y = roofY + 1.3;
                group.add(finial);

                const spikeGeo = new THREE.ConeGeometry(0.15, 1.5, 6);
                const spike = new THREE.Mesh(spikeGeo, goldMat);
                spike.position.y = roofY + 2.4;
                group.add(spike);
            }
        }

        // Door frame
        const doorFrameMat = this.getMaterial(woodDark, { roughness: 0.7 });
        const doorFrameGeo = new THREE.BoxGeometry(3.8, 5.2, 0.25);
        const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
        doorFrame.position.set(0, 3.6, d / 2 + 0.13);
        group.add(doorFrame);

        // Paper screen door (shoji)
        const shojiMat = this.getMaterial(0xFFFAF0, { 
            roughness: 0.3,
            transparent: true,
            opacity: 0.85
        });
        const shojiGeo = new THREE.BoxGeometry(3.2, 4.5, 0.08);
        const shoji = new THREE.Mesh(shojiGeo, shojiMat);
        shoji.position.set(0, 3.25, d / 2 + 0.3);
        group.add(shoji);

        // Door grid pattern
        const gridMat = this.getMaterial(woodDark, { roughness: 0.8 });
        for (let i = 0; i < 3; i++) {
            const vBarGeo = new THREE.BoxGeometry(0.08, 4.5, 0.1);
            const vBar = new THREE.Mesh(vBarGeo, gridMat);
            vBar.position.set(-1 + i * 1, 3.25, d / 2 + 0.38);
            group.add(vBar);
        }
        for (let i = 0; i < 4; i++) {
            const hBarGeo = new THREE.BoxGeometry(3.2, 0.08, 0.1);
            const hBar = new THREE.Mesh(hBarGeo, gridMat);
            hBar.position.set(0, 1.5 + i * 1.15, d / 2 + 0.38);
            group.add(hBar);
        }

        // Stone lanterns at entrance
        const lanternMat = this.getMaterial(0x707070, { roughness: 0.8 });
        [-3.2, 3.2].forEach(lx => {
            const baseGeo = new THREE.BoxGeometry(0.9, 0.4, 0.9);
            const base = new THREE.Mesh(baseGeo, lanternMat);
            base.position.set(lx, 0.2, d / 2 + 2.5);
            group.add(base);

            const pillarGeo = new THREE.BoxGeometry(0.5, 1.8, 0.5);
            const pillar = new THREE.Mesh(pillarGeo, lanternMat);
            pillar.position.set(lx, 1.3, d / 2 + 2.5);
            group.add(pillar);

            const headGeo = new THREE.BoxGeometry(1, 0.8, 1);
            const head = new THREE.Mesh(headGeo, lanternMat);
            head.position.set(lx, 2.6, d / 2 + 2.5);
            group.add(head);

            const capGeo = new THREE.ConeGeometry(0.7, 0.5, 4);
            const cap = new THREE.Mesh(capGeo, lanternMat);
            cap.rotation.y = Math.PI / 4;
            cap.position.set(lx, 3.25, d / 2 + 2.5);
            group.add(cap);

            const light = new THREE.PointLight(0xFFAA55, 0.4, 6);
            light.position.set(lx, 2.6, d / 2 + 2.5);
            group.add(light);
            this.lights.push(light);
        });

        // Moon windows
        const windowMat = this.getMaterial(0xFFFAF0, {
            emissive: 0xFFE4B5,
            emissiveIntensity: 0.3
        });
        [-w / 3, w / 3].forEach(wx => {
            const frameGeo = new THREE.TorusGeometry(1.2, 0.12, 8, 24);
            const frame = new THREE.Mesh(frameGeo, doorFrameMat);
            frame.position.set(wx, h / 2 + 2, d / 2 + 0.12);
            group.add(frame);

            const windowGeo = new THREE.CircleGeometry(1.1, 16);
            const windowMesh = new THREE.Mesh(windowGeo, windowMat);
            windowMesh.position.set(wx, h / 2 + 2, d / 2 + 0.08);
            group.add(windowMesh);
        });

        // Side windows
        [-d / 3, d / 3].forEach(wz => {
            [-1, 1].forEach(side => {
                const windowGeo = new THREE.CircleGeometry(0.7, 12);
                const windowMesh = new THREE.Mesh(windowGeo, windowMat);
                windowMesh.rotation.y = side * Math.PI / 2;
                windowMesh.position.set(side * (w / 2 + 0.08), h / 2 + 2, wz);
                group.add(windowMesh);
            });
        });

        // Interior glow
        const interiorLight = new THREE.PointLight(0xFFAA55, 0.8, 12);
        interiorLight.position.set(0, h / 2 + 1, 0);
        group.add(interiorLight);
        this.lights.push(interiorLight);

        // Card Jitsu hexagon symbol
        const symbolGeo = new THREE.CircleGeometry(1.3, 6);
        const symbol = new THREE.Mesh(symbolGeo, goldMat);
        symbol.position.set(0, h - 0.3, d / 2 + 0.12);
        group.add(symbol);

        return group;
    }
}

/**
 * Create a Dojo building
 * @param {THREE} THREE - Three.js library
 * @param {Object} config - Building configuration
 * @returns {THREE.Group}
 */
export function createDojo(THREE, config = {}) {
    const dojo = new Dojo(THREE);
    return dojo.build(config);
}

/**
 * Generate Dojo interior room
 * @param {THREE} THREE - Three.js library
 * @param {THREE.Scene} scene - Scene to add objects to
 * @returns {Object} Room data with bounds, spawnPos
 */
export function generateDojoInterior(THREE, scene) {
    const DOJO_SIZE = 36;
    scene.background = new THREE.Color(0x1a0808);
    
    const addMesh = (geo, mat, x, y, z, opts = {}) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        if (opts.rotX) mesh.rotation.x = opts.rotX;
        if (opts.rotZ) mesh.rotation.z = opts.rotZ;
        if (opts.castShadow) mesh.castShadow = true;
        if (opts.receiveShadow) mesh.receiveShadow = true;
        if (opts.name) mesh.name = opts.name;
        scene.add(mesh);
        return mesh;
    };
    
    // Floor
    addMesh(new THREE.PlaneGeometry(DOJO_SIZE, DOJO_SIZE), new THREE.MeshStandardMaterial({ color: 0x5D3A1A, roughness: 0.9 }), 0, 0, 0, { rotX: -Math.PI/2, receiveShadow: true });
    
    // Floor plank lines
    for (let i = -DOJO_SIZE/2; i < DOJO_SIZE/2; i += 2) {
        addMesh(new THREE.BoxGeometry(DOJO_SIZE, 0.02, 0.05), new THREE.MeshStandardMaterial({ color: 0x3d2515 }), 0, 0.01, i);
    }
    
    // Central tatami mat
    addMesh(new THREE.BoxGeometry(16, 0.1, 18), new THREE.MeshStandardMaterial({ color: 0x9acd32, roughness: 0.8 }), 0, 0.05, 0);
    
    // Tatami pattern lines
    [-4, 0, 4].forEach(x => addMesh(new THREE.BoxGeometry(0.1, 0.12, 18), new THREE.MeshStandardMaterial({ color: 0x7ab32a }), x, 0.06, 0));
    
    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2d1810, roughness: 0.8 });
    addMesh(new THREE.BoxGeometry(DOJO_SIZE, 14, 0.5), wallMat, 0, 7, -DOJO_SIZE/2);
    addMesh(new THREE.BoxGeometry(0.5, 14, DOJO_SIZE), wallMat, -DOJO_SIZE/2, 7, 0);
    addMesh(new THREE.BoxGeometry(0.5, 14, DOJO_SIZE), wallMat, DOJO_SIZE/2, 7, 0);
    addMesh(new THREE.BoxGeometry(12, 14, 0.5), wallMat, -12, 7, DOJO_SIZE/2);
    addMesh(new THREE.BoxGeometry(12, 14, 0.5), wallMat, 12, 7, DOJO_SIZE/2);
    addMesh(new THREE.BoxGeometry(12, 4, 0.5), wallMat, 0, 12, DOJO_SIZE/2);
    
    // Red pillars
    const pillarGeo = new THREE.CylinderGeometry(0.8, 0.9, 14, 12);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
    [[-15, -15], [15, -15], [-15, 15], [15, 15], [-15, 0], [15, 0]].forEach(([x, z]) => {
        addMesh(pillarGeo, pillarMat, x, 7, z, { castShadow: true });
        addMesh(new THREE.CylinderGeometry(1.1, 1.2, 0.5, 12), pillarMat, x, 0.25, z);
        addMesh(new THREE.CylinderGeometry(1.1, 0.8, 0.5, 12), pillarMat, x, 13.75, z);
    });
    
    // Scrolls on back wall
    [-10, -5, 0, 5, 10].forEach(x => {
        addMesh(new THREE.BoxGeometry(3.5, 6, 0.1), new THREE.MeshStandardMaterial({ color: 0xf5deb3 }), x, 8, -DOJO_SIZE/2 + 0.3);
        addMesh(new THREE.CylinderGeometry(0.15, 0.15, 4, 8), new THREE.MeshStandardMaterial({ color: 0x4a2c00 }), x, 11.2, -DOJO_SIZE/2 + 0.35, { rotZ: Math.PI/2 });
    });
    
    // Battle mat
    addMesh(new THREE.CircleGeometry(6, 32), new THREE.MeshStandardMaterial({ color: 0x4a1a1a }), 0, 0.02, 2, { rotX: -Math.PI/2 });
    
    // Element symbols
    [{ color: 0xff4400, pos: [-3, 0] }, { color: 0x0066ff, pos: [3, 0] }, { color: 0x88ddff, pos: [0, 4] }].forEach(({ color, pos }) => {
        addMesh(new THREE.CircleGeometry(1, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }), pos[0], 0.03, pos[1], { rotX: -Math.PI/2 });
    });
    
    // Sensei cushion
    addMesh(new THREE.CylinderGeometry(1.8, 2, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0x8b0000 }), 0, 0.2, -12, { name: 'sensei_cushion' });
    
    // Glow zones
    addMesh(new THREE.CircleGeometry(3.5, 16), new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.15 }), 0, 0.01, -10, { rotX: -Math.PI/2, name: 'sensei_glow' });
    addMesh(new THREE.CircleGeometry(3, 16), new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.15 }), 0, 0.01, 16, { rotX: -Math.PI/2, name: 'exit_glow' });
    
    // Torch lights
    [[-15, 5, -15], [15, 5, -15], [-15, 5, 0], [15, 5, 0], [-15, 5, 15], [15, 5, 15]].forEach(([x, y, z]) => {
        const torch = new THREE.PointLight(0xff6622, 1.5, 15);
        torch.position.set(x, y, z);
        scene.add(torch);
        addMesh(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x4a2c00 }), x * 0.95, y - 1, z * 0.95);
        addMesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff6622 }), x * 0.95, y - 0.3, z * 0.95);
    });
    
    // Ambient light
    const ambientFill = new THREE.PointLight(0xffeedd, 0.3, 50);
    ambientFill.position.set(0, 10, 0);
    scene.add(ambientFill);
    
    // Get references to animated elements
    const senseiGlow = scene.getObjectByName('sensei_glow');
    const exitGlow = scene.getObjectByName('exit_glow');
    
    // Room update function - handles all dojo-specific animations
    const update = (time, delta) => {
        // Pulse sensei glow
        if (senseiGlow && senseiGlow.material) {
            senseiGlow.material.opacity = 0.1 + Math.sin(time * 1.5) * 0.1;
        }
        // Pulse exit glow
        if (exitGlow && exitGlow.material) {
            exitGlow.material.opacity = 0.1 + Math.sin(time * 2) * 0.08;
        }
    };
    
    return { 
        bounds: { minX: -DOJO_SIZE/2 + 1, maxX: DOJO_SIZE/2 - 1, minZ: -DOJO_SIZE/2 + 1, maxZ: DOJO_SIZE/2 - 1 },
        spawnPos: { x: 0, z: 14 },
        update
    };
}

export default Dojo;

