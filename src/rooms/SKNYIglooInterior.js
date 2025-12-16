/**
 * SKNY GANG Igloo Interior - Miniature Nightclub
 * Features: Disco ball, LED strips, DJ booth, VIP seating, dance floor, neon signs
 */

/**
 * Generate the SKNY GANG nightclub igloo interior
 * @param {THREE} THREE - Three.js library
 * @param {THREE.Scene} scene - Scene to add objects to
 * @returns {Object} Room data with bounds, spawnPos, furniture, update function, etc.
 */
export function generateSKNYIglooInterior(THREE, scene) {
    const IGLOO_SIZE = 30;
    scene.background = new THREE.Color(0x050510);
    
    const animatedElements = [];
    const lights = [];
    
    // Collision map
    const map = [];
    for(let x = 0; x < 15; x++) {
        map[x] = [];
        for(let z = 0; z < 15; z++) map[x][z] = 2;
    }
    
    // ==================== FLOOR ====================
    
    // Main dance floor with LED grid pattern
    const floorGroup = new THREE.Group();
    
    // Base floor - dark reflective
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x0a0a15, 
        roughness: 0.2, 
        metalness: 0.8 
    });
    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(IGLOO_SIZE / 2, 64), 
        floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // LED dance floor tiles in center
    const tileSize = 1.2;
    const tileColors = [0xff00ff, 0x00ffff, 0x9900ff, 0x00ff66, 0xff6600];
    const danceFloorTiles = [];
    
    for (let x = -4; x <= 4; x++) {
        for (let z = -4; z <= 4; z++) {
            // Skip outer corners to make circular-ish
            if (Math.abs(x) === 4 && Math.abs(z) === 4) continue;
            if (Math.abs(x) >= 3 && Math.abs(z) >= 3 && (Math.abs(x) + Math.abs(z) > 6)) continue;
            
            const tileColor = tileColors[Math.floor(Math.random() * tileColors.length)];
            const tileMat = new THREE.MeshStandardMaterial({
                color: 0x111122,
                roughness: 0.3,
                metalness: 0.6,
                emissive: tileColor,
                emissiveIntensity: 0.3
            });
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(tileSize * 0.95, 0.08, tileSize * 0.95),
                tileMat
            );
            tile.position.set(x * tileSize, 0.04, z * tileSize);
            tile.receiveShadow = true;
            scene.add(tile);
            
            danceFloorTiles.push({
                mesh: tile,
                baseColor: tileColor,
                x, z
            });
        }
    }
    animatedElements.push({ type: 'danceFloor', tiles: danceFloorTiles });
    
    // ==================== DOME ====================
    
    // Dark dome with star effect
    const domeMat = new THREE.MeshStandardMaterial({ 
        color: 0x08081a, 
        roughness: 0.4, 
        side: THREE.BackSide,
        emissive: 0x0a0a20,
        emissiveIntensity: 0.1
    });
    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(IGLOO_SIZE / 2, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2),
        domeMat
    );
    dome.scale.y = 0.65;
    scene.add(dome);
    
    // Star lights on dome
    const starCount = 60;
    for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.4;
        const r = IGLOO_SIZE / 2 - 0.2;
        
        const starMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5 + Math.random() * 0.5
        });
        const star = new THREE.Mesh(
            new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 6, 6),
            starMat
        );
        star.position.set(
            Math.sin(phi) * Math.cos(theta) * r,
            Math.cos(phi) * r * 0.65,
            Math.sin(phi) * Math.sin(theta) * r
        );
        scene.add(star);
        
        animatedElements.push({
            type: 'star',
            mesh: star,
            baseOpacity: starMat.opacity,
            phase: Math.random() * Math.PI * 2
        });
    }
    
    // ==================== DISCO BALL ====================
    
    const discoBallGroup = new THREE.Group();
    const mirrorTiles = [];
    
    // Mirror ball - shiny reflective surface with emissive glow
    const ballGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
        color: 0xEEEEEE,
        roughness: 0.05,
        metalness: 1.0,
        emissive: 0xFFFFFF,
        emissiveIntensity: 0.1
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    discoBallGroup.add(ball);
    
    // Mirror tiles - organized in rows like nightclub disco ball
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
            tile.userData.tileIndex = lat * tilesInRow + lon;
            
            tile.position.set(
                rowRadius * Math.cos(theta),
                yPos,
                rowRadius * Math.sin(theta)
            );
            tile.lookAt(0, 0, 0);
            tile.rotateY(Math.PI);
            discoBallGroup.add(tile);
            mirrorTiles.push(tile);
        }
    }
    
    // Hanging chain
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 });
    const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 3, 8),
        chainMat
    );
    chain.position.y = 2.3;
    discoBallGroup.add(chain);
    
    discoBallGroup.position.set(0, 7, 0);
    scene.add(discoBallGroup);
    
    // Disco ball main light - color cycling
    const discoLight = new THREE.PointLight(0xFFFFFF, 3, 25);
    discoLight.position.set(0, 7, 0); // Same position as disco ball
    scene.add(discoLight);
    lights.push(discoLight);
    
    animatedElements.push({
        type: 'discoBall',
        mesh: discoBallGroup,
        light: discoLight,
        tiles: mirrorTiles
    });
    
    // ==================== NEON RINGS ====================
    
    const neonColors = [0xff00ff, 0x00ffff, 0x9900ff];
    for (let i = 0; i < 4; i++) {
        const ringY = 2 + i * 2;
        const ringRadius = (IGLOO_SIZE / 2 - 1) * Math.cos(Math.asin(ringY / (IGLOO_SIZE / 2 * 0.65)));
        
        if (ringRadius > 2) {
            const ringMat = new THREE.MeshBasicMaterial({
                color: neonColors[i % neonColors.length],
                transparent: true,
                opacity: 0.9
            });
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(ringRadius, 0.04, 8, 64),
                ringMat
            );
            ring.position.y = ringY;
            ring.rotation.x = Math.PI / 2;
            scene.add(ring);
            
            animatedElements.push({
                type: 'neonRing',
                mesh: ring,
                baseOpacity: 0.9,
                phase: i * 0.5
            });
        }
    }
    
    // ==================== SKNY GANG SIGN ====================
    
    const signGroup = new THREE.Group();
    const signBackMat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.3, metalness: 0.7 });
    const signBack = new THREE.Mesh(
        new THREE.BoxGeometry(8, 2, 0.2),
        signBackMat
    );
    signGroup.add(signBack);
    
    // Frame with lights
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
    const frameGeo = new THREE.BoxGeometry(8.3, 2.3, 0.1);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.z = -0.06;
    signGroup.add(frame);
    
    // SKNY GANG neon letters
    const letterMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const letters = 'SKNY GANG';
    const letterWidth = 0.7;
    const startX = -((letters.length - 1) * letterWidth) / 2;
    
    letters.split('').forEach((char, i) => {
        if (char === ' ') return;
        
        const letterGeo = new THREE.BoxGeometry(0.5, 1, 0.1);
        const letter = new THREE.Mesh(letterGeo, letterMat.clone());
        letter.position.set(startX + i * letterWidth, 0, 0.12);
        signGroup.add(letter);
        
        animatedElements.push({
            type: 'signLetter',
            mesh: letter,
            index: i
        });
    });
    
    // Position sign lower and inside the dome
    signGroup.position.set(0, 4, -IGLOO_SIZE / 2 + 5);
    scene.add(signGroup);
    
    // ==================== DJ BOOTH ====================
    
    const djBoothGroup = new THREE.Group();
    const boothMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.4, metalness: 0.5 });
    
    // Main desk
    const desk = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1.2, 1.5),
        boothMat
    );
    desk.position.y = 0.6;
    desk.castShadow = true;
    djBoothGroup.add(desk);
    
    // Elevated platform
    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.3, 2.5),
        new THREE.MeshStandardMaterial({ color: 0x0f0f1a, roughness: 0.5 })
    );
    platform.position.y = 0.15;
    djBoothGroup.add(platform);
    
    // Turntables
    [-1, 1].forEach(side => {
        const turntableGroup = new THREE.Group();
        
        // Base
        const ttBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.1, 0.8),
            new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 })
        );
        turntableGroup.add(ttBase);
        
        // Platter
        const platter = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 })
        );
        platter.position.y = 0.08;
        turntableGroup.add(platter);
        
        // Record
        const record = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.28, 0.02, 32),
            new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.1 })
        );
        record.position.y = 0.1;
        turntableGroup.add(record);
        
        turntableGroup.position.set(side * 1.2, 1.25, 0);
        djBoothGroup.add(turntableGroup);
        
        animatedElements.push({
            type: 'turntable',
            mesh: record
        });
    });
    
    // Mixer in center
    const mixer = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.15, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7 })
    );
    mixer.position.set(0, 1.28, 0);
    djBoothGroup.add(mixer);
    
    // LED strips on desk front
    const ledStripMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const ledStrip = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.08, 0.05),
        ledStripMat
    );
    ledStrip.position.set(0, 0.4, 0.76);
    djBoothGroup.add(ledStrip);
    
    animatedElements.push({
        type: 'djLED',
        mesh: ledStrip
    });
    
    djBoothGroup.position.set(0, 0, 7); // Moved closer to dance floor, away from exit
    djBoothGroup.rotation.y = Math.PI;
    scene.add(djBoothGroup);
    
    // ==================== SPEAKERS ====================
    
    const speakerPositions = [
        { x: -6, z: 10, rot: Math.PI }, // Near exit, facing dance floor
        { x: 6, z: 10, rot: Math.PI },  // Near exit, facing dance floor
        { x: -8, z: 0, rot: Math.PI / 2 },
        { x: 8, z: 0, rot: -Math.PI / 2 }
    ];
    
    speakerPositions.forEach(sp => {
        const speakerGroup = new THREE.Group();
        const cabMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.7 });
        
        // Cabinet
        const cab = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 2.5, 1),
            cabMat
        );
        cab.position.y = 1.25;
        cab.castShadow = true;
        speakerGroup.add(cab);
        
        // Woofer
        const woofer = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.45, 0.15, 24),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        woofer.rotation.x = Math.PI / 2;
        woofer.position.set(0, 0.8, 0.5);
        speakerGroup.add(woofer);
        
        // Tweeter
        const tweeter = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.18, 0.1, 16),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        tweeter.rotation.x = Math.PI / 2;
        tweeter.position.set(0, 1.8, 0.48);
        speakerGroup.add(tweeter);
        
        speakerGroup.position.set(sp.x, 0, sp.z);
        speakerGroup.rotation.y = sp.rot;
        scene.add(speakerGroup);
        
        animatedElements.push({
            type: 'speaker',
            mesh: woofer
        });
    });
    
    // ==================== VIP COUCHES ====================
    // Simple couches along the back wall, facing the dance floor
    
    const furniture = [];
    const velvetMat = new THREE.MeshStandardMaterial({ color: 0x4a0080, roughness: 0.9 });
    const goldTrim = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x5a0090, roughness: 0.9 });
    
    // Two couches: left side and right side, facing toward dance floor (center)
    // Flip 180° from previous to face inward
    const couches = [
        { x: 8, z: -8, faceAngle: Math.PI * 1.75 },    // Right side couch, faces toward center-left
        { x: -8, z: -8, faceAngle: Math.PI * 0.25 }    // Left side couch, faces toward center-right
    ];
    
    couches.forEach((couch, idx) => {
        const couchGroup = new THREE.Group();
        
        // Base (seat)
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.6, 1.2),
            velvetMat
        );
        base.position.y = 0.3;
        couchGroup.add(base);
        
        // Back rest
        const back = new THREE.Mesh(
            new THREE.BoxGeometry(3, 1.0, 0.3),
            velvetMat
        );
        back.position.set(0, 0.8, -0.45);
        couchGroup.add(back);
        
        // Arms
        [-1.35, 1.35].forEach(ax => {
            const arm = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.5, 1.2),
                velvetMat
            );
            arm.position.set(ax, 0.55, 0);
            couchGroup.add(arm);
        });
        
        // Gold trim on front
        const trim = new THREE.Mesh(
            new THREE.BoxGeometry(3.1, 0.05, 0.05),
            goldTrim
        );
        trim.position.set(0, 0.62, 0.58);
        couchGroup.add(trim);
        
        // Cushions (3 seats)
        [-0.9, 0, 0.9].forEach(cx => {
            const cushion = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.15, 0.9),
                cushionMat
            );
            cushion.position.set(cx, 0.68, 0.1);
            couchGroup.add(cushion);
        });
        
        // Position and rotate couch - back against wall, front toward dance floor
        couchGroup.position.set(couch.x, 0, couch.z);
        couchGroup.rotation.y = couch.faceAngle; // Couch faces this direction
        scene.add(couchGroup);
        
        // Furniture interaction data
        // Player sits on the couch and faces same direction as couch
        furniture.push({
            type: 'couch',
            position: { x: couch.x, z: couch.z },
            rotation: couch.faceAngle, // Player faces this direction when seated
            seatHeight: 0.7,
            snapPoints: [
                { x: -0.9, z: 0.3 },
                { x: 0, z: 0.3 },
                { x: 0.9, z: 0.3 }
            ],
            interactionRadius: 2.5
        });
    });
    
    // ==================== BAR ====================
    
    const barGroup = new THREE.Group();
    const barMat = new THREE.MeshStandardMaterial({ color: 0x1a0a30, roughness: 0.4, metalness: 0.3 });
    
    // Counter
    const counter = new THREE.Mesh(
        new THREE.BoxGeometry(6, 1.1, 1),
        barMat
    );
    counter.position.y = 0.55;
    counter.castShadow = true;
    barGroup.add(counter);
    
    // Counter top
    const counterTop = new THREE.Mesh(
        new THREE.BoxGeometry(6.2, 0.1, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 })
    );
    counterTop.position.y = 1.15;
    barGroup.add(counterTop);
    
    // LED strip under counter
    const barLED = new THREE.Mesh(
        new THREE.BoxGeometry(5.8, 0.05, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xff00ff })
    );
    barLED.position.set(0, 0.05, 0.5);
    barGroup.add(barLED);
    
    animatedElements.push({
        type: 'barLED',
        mesh: barLED
    });
    
    // Bar stools
    [-2, -0.7, 0.7, 2].forEach(x => {
        const stoolGroup = new THREE.Group();
        
        // Seat
        const seat = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.25, 0.15, 16),
            new THREE.MeshStandardMaterial({ color: 0x4a0080, roughness: 0.8 })
        );
        seat.position.y = 0.9;
        stoolGroup.add(seat);
        
        // Pole
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.06, 0.85, 8),
            new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 })
        );
        pole.position.y = 0.42;
        stoolGroup.add(pole);
        
        // Base
        const stoolBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.3, 0.05, 16),
            new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 })
        );
        stoolBase.position.y = 0.025;
        stoolGroup.add(stoolBase);
        
        stoolGroup.position.set(x, 0, 1.3);
        barGroup.add(stoolGroup);
    });
    
    barGroup.position.set(0, 0, -10);
    scene.add(barGroup);
    
    // Add ALL 4 bar stools to furniture for sitting interaction
    // Stools are at x: -2, -0.7, 0.7, 2 relative to bar group (which is at z: -10)
    // So world z = -10 + 1.3 = -8.7
    // Player faces bar (toward -z), dismount toward +z (away from bar)
    [-2, -0.7, 0.7, 2].forEach((stoolX, idx) => {
        furniture.push({
            type: 'bar_stool',
            position: { x: stoolX, z: -8.7 },
            rotation: 0, // Face toward bar (-z is default forward)
            seatHeight: 0.9,
            snapPoints: [{ x: 0, z: 0 }],
            interactionRadius: 1.2,
            dismountForward: true // Dismount away from bar (+z direction)
        });
    });
    
    // ==================== LASER BEAMS ====================
    // Lasers originate from disco ball center (y=7)
    
    const laserColors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff];
    const lasers = [];
    
    for (let i = 0; i < 8; i++) {
        const laserMat = new THREE.MeshBasicMaterial({
            color: laserColors[i % laserColors.length],
            transparent: true,
            opacity: 0.4
        });
        const laser = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 15, 8),
            laserMat
        );
        laser.position.set(0, 7, 0); // Same Y as disco ball
        scene.add(laser);
        lasers.push(laser);
        
        animatedElements.push({
            type: 'laser',
            mesh: laser,
            index: i
        });
    }
    
    // ==================== SPOT LIGHTS ====================
    
    const spotColors = [0xff00ff, 0x00ffff, 0x9900ff, 0xff6600];
    spotColors.forEach((color, i) => {
        const angle = (i / spotColors.length) * Math.PI * 2;
        const radius = 6;
        
        const spotLight = new THREE.SpotLight(color, 3, 15, Math.PI / 6, 0.5);
        spotLight.position.set(
            Math.cos(angle) * radius,
            7,
            Math.sin(angle) * radius
        );
        spotLight.target.position.set(0, 0, 0);
        scene.add(spotLight);
        scene.add(spotLight.target);
        lights.push(spotLight);
        
        animatedElements.push({
            type: 'spotLight',
            light: spotLight,
            index: i,
            baseAngle: angle
        });
    });
    
    // Ambient light (dim)
    const ambient = new THREE.AmbientLight(0x111133, 0.3);
    scene.add(ambient);
    
    // ==================== EXIT DOOR ====================
    
    const doorGroup = new THREE.Group();
    
    // Door frame
    const frameDark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
    const doorFrame = new THREE.Mesh(
        new THREE.BoxGeometry(3, 3.5, 0.3),
        frameDark
    );
    doorFrame.position.y = 1.75;
    doorGroup.add(doorFrame);
    
    // EXIT sign
    const exitSignMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const exitSign = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.4, 0.1),
        exitSignMat
    );
    exitSign.position.set(0, 3.2, 0.2);
    doorGroup.add(exitSign);
    
    animatedElements.push({
        type: 'exitSign',
        mesh: exitSign
    });
    
    // Dark opening
    const doorOpening = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 3),
        new THREE.MeshBasicMaterial({ color: 0x000005 })
    );
    doorOpening.position.set(0, 1.5, 0.16);
    doorGroup.add(doorOpening);
    
    doorGroup.position.set(0, 0, IGLOO_SIZE / 2 - 0.5);
    scene.add(doorGroup);
    
    // ==================== UPDATE FUNCTION ====================
    
    const update = (time) => {
        // Beat phase for synchronized animations
        const beatPhase = Math.sin(time * 8) * 0.5 + 0.5;
        
        animatedElements.forEach(el => {
            switch (el.type) {
                case 'danceFloor':
                    el.tiles.forEach((tile, i) => {
                        const wave = Math.sin(time * 4 + tile.x * 0.5 + tile.z * 0.5);
                        if (tile.mesh.material) {
                            tile.mesh.material.emissiveIntensity = 0.2 + Math.abs(wave) * 0.8;
                        }
                    });
                    break;
                    
                case 'star':
                    if (el.mesh.material) {
                        el.mesh.material.opacity = el.baseOpacity * (0.5 + Math.sin(time * 2 + el.phase) * 0.5);
                    }
                    break;
                    
                case 'discoBall':
                    // Spin the disco ball
                    el.mesh.rotation.y = time * 0.8;
                    
                    // Animate disco light - color cycling
                    if (el.light) {
                        const discoHue = (time * 0.3) % 1;
                        el.light.color.setHSL(discoHue, 1.0, 0.6);
                        el.light.intensity = 2.0 + beatPhase * 2.0;
                    }
                    
                    // Animate mirror tiles - sparkle effect
                    if (el.tiles) {
                        el.tiles.forEach(tile => {
                            const sparkle = Math.sin(time * 15 + tile.userData.tileIndex * 0.5);
                            tile.material.emissiveIntensity = 0.4 + sparkle * 0.4 + beatPhase * 0.3;
                            const tileHue = (time * 0.2 + tile.userData.tileIndex * 0.02) % 1;
                            tile.material.emissive.setHSL(tileHue, 0.8, 0.5);
                        });
                    }
                    break;
                    
                case 'neonRing':
                    if (el.mesh.material) {
                        el.mesh.material.opacity = el.baseOpacity * (0.7 + Math.sin(time * 3 + el.phase) * 0.3);
                    }
                    break;
                    
                case 'signLetter':
                    if (el.mesh.material) {
                        const flash = Math.sin(time * 6 + el.index * 0.4) > 0.3;
                        el.mesh.material.color.setHex(flash ? 0xff00ff : 0x00ffff);
                    }
                    break;
                    
                case 'turntable':
                    el.mesh.rotation.y = time * 3;
                    break;
                    
                case 'djLED':
                case 'barLED':
                    if (el.mesh.material) {
                        const hue = (time * 0.2) % 1;
                        el.mesh.material.color.setHSL(hue, 1, 0.5);
                    }
                    break;
                    
                case 'speaker':
                    const bass = 1 + Math.abs(Math.sin(time * 15)) * 0.15;
                    el.mesh.scale.z = bass;
                    break;
                    
                case 'laser':
                    // Lasers sweep around horizontally and tilt outward
                    const idx = el.index;
                    const baseAngle = idx * (Math.PI * 2 / 8); // Spread evenly around circle
                    
                    // Each laser sweeps at different speed
                    const sweepSpeed = 0.5 + (idx % 3) * 0.3;
                    const sweepAngle = baseAngle + time * sweepSpeed;
                    
                    // Tilt outward from center (around Z axis after Y rotation)
                    const tiltAmount = 0.3 + Math.sin(time * 0.7 + idx * 0.8) * 0.4;
                    
                    // Apply rotations: first rotate around Y (horizontal sweep), then tilt outward
                    el.mesh.rotation.y = sweepAngle;
                    el.mesh.rotation.z = tiltAmount;
                    break;
                    
                case 'spotLight':
                    const spotAngle = el.baseAngle + Math.sin(time * 0.5 + el.index) * 0.5;
                    el.light.target.position.set(
                        Math.cos(spotAngle) * 4,
                        0,
                        Math.sin(spotAngle) * 4
                    );
                    break;
                    
                case 'exitSign':
                    if (el.mesh.material) {
                        el.mesh.material.color.setHex(
                            Math.sin(time * 4) > 0 ? 0x00ff00 : 0x005500
                        );
                    }
                    break;
                    
                case 'beachBall':
                    el.mesh.rotation.y += 0.02;
                    el.mesh.position.y = 0.6 + Math.sin(time * 1.5) * 0.08;
                    break;
                    
                case 'puffle':
                    // Bounce and spin animation - puffles dance on the floor!
                    const bounceHeight = 0.5 + Math.sin(time * el.bounceSpeed + el.phase) * 0.35;
                    el.mesh.position.y = bounceHeight;
                    el.mesh.rotation.y += el.spinSpeed;
                    // Slight wobble for dancing effect
                    el.mesh.rotation.x = Math.sin(time * 3 + el.phase) * 0.15;
                    el.mesh.rotation.z = Math.cos(time * 2.5 + el.phase) * 0.15;
                    break;
            }
        });
    };
    
    // ==================== BEACH BALL ====================
    
    const beachBallGroup = new THREE.Group();
    beachBallGroup.name = 'beachBall';
    
    // Main ball
    const beachBallGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const beachBallMat = new THREE.MeshStandardMaterial({ 
        color: 0xff00ff, // Neon pink to match nightclub theme
        roughness: 0.3,
        metalness: 0.2,
        emissive: 0xff00ff,
        emissiveIntensity: 0.2
    });
    const ballMesh = new THREE.Mesh(beachBallGeo, beachBallMat);
    beachBallGroup.add(ballMesh);
    
    // Neon stripes
    const stripeColors = [0x00ffff, 0x9900ff, 0x00ff66];
    for (let i = 0; i < 3; i++) {
        const stripeMat = new THREE.MeshStandardMaterial({ 
            color: stripeColors[i],
            emissive: stripeColors[i],
            emissiveIntensity: 0.3
        });
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 8, 24), stripeMat);
        stripe.rotation.y = (i / 3) * Math.PI;
        stripe.rotation.x = Math.PI / 2;
        beachBallGroup.add(stripe);
    }
    
    beachBallGroup.position.set(-6, 0.6, 4);
    scene.add(beachBallGroup);
    
    const beachBall = { 
        mesh: beachBallGroup, 
        velocity: { x: 0, z: 0 }, 
        radius: 0.5, 
        friction: 0.985, 
        bounciness: 0.75 
    };
    
    animatedElements.push({
        type: 'beachBall',
        mesh: beachBallGroup
    });
    
    // ==================== DANCING PUFFLES ====================
    
    const puffleColors = [
        { body: 0xff0066, emissive: 0xff0066 }, // Hot pink
        { body: 0x00ffff, emissive: 0x00ffff }, // Cyan
        { body: 0x9900ff, emissive: 0x9900ff }, // Purple
        { body: 0x00ff66, emissive: 0x00ff66 }, // Green
        { body: 0xffff00, emissive: 0xffaa00 }, // Yellow/Gold
    ];
    
    // Position puffles on the LED dance floor tiles (which go from -4 to 4 on x and z)
    const pufflePositions = [
        { x: -2.4, z: 1.2 },
        { x: 2.4, z: 1.2 },
        { x: 0, z: 2.4 },
        { x: -1.2, z: -1.2 },
        { x: 1.2, z: -1.2 },
    ];
    
    pufflePositions.forEach((pos, i) => {
        const puffleGroup = new THREE.Group();
        const color = puffleColors[i % puffleColors.length];
        
        // Body (fluffy sphere) - made larger for visibility
        const bodyMat = new THREE.MeshStandardMaterial({
            color: color.body,
            roughness: 0.9,
            emissive: color.emissive,
            emissiveIntensity: 0.4 // Brighter glow
        });
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 16, 12), // Larger size
            bodyMat
        );
        body.scale.set(1, 0.85, 1); // Slightly squished
        body.castShadow = true;
        puffleGroup.add(body);
        
        // Eyes - larger to match bigger body
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        [-0.18, 0.18].forEach(xOffset => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), eyeMat);
            eye.position.set(xOffset, 0.2, 0.48);
            puffleGroup.add(eye);
            
            const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), pupilMat);
            pupil.position.set(xOffset, 0.2, 0.58);
            puffleGroup.add(pupil);
        });
        
        // Tuft on top - larger
        const tuftMat = new THREE.MeshStandardMaterial({
            color: color.body,
            emissive: color.emissive,
            emissiveIntensity: 0.3,
            roughness: 0.9
        });
        for (let t = 0; t < 3; t++) {
            const tuft = new THREE.Mesh(
                new THREE.ConeGeometry(0.1, 0.3, 6),
                tuftMat
            );
            tuft.position.set(
                (t - 1) * 0.12,
                0.5,
                0
            );
            tuft.rotation.x = -0.2;
            puffleGroup.add(tuft);
        }
        
        // Position puffles higher so they're clearly visible on the dance floor
        puffleGroup.position.set(pos.x, 0.5, pos.z);
        scene.add(puffleGroup);
        
        animatedElements.push({
            type: 'puffle',
            mesh: puffleGroup,
            bounceSpeed: 2 + Math.random() * 1, // Slower bounce
            spinSpeed: 0.008 + Math.random() * 0.008, // Much slower spin
            phase: Math.random() * Math.PI * 2 // Random phase offset
        });
    });
    
    // Furniture colliders (bar, DJ booth, speakers)
    // Couches have NO collision - they are sitting surfaces, player walks to them
    const furnitureColliders = [
        { x: 0, z: -10.5, hw: 3.5, hd: 0.5, height: 1.2, y: 0, name: 'bar' }, // Just back of bar
        { x: 0, z: 6, hw: 2.5, hd: 1, height: 1.5, y: 0, name: 'dj_booth' }, // Front part only, leave DJ area open
        // Speaker colliders
        { x: -6, z: 10, hw: 0.9, hd: 0.6, height: 2.5, y: 0, name: 'speaker_fl' },
        { x: 6, z: 10, hw: 0.9, hd: 0.6, height: 2.5, y: 0, name: 'speaker_fr' },
        { x: -8, z: 0, hw: 0.6, hd: 0.9, height: 2.5, y: 0, name: 'speaker_l' },
        { x: 8, z: 0, hw: 0.6, hd: 0.9, height: 2.5, y: 0, name: 'speaker_r' },
    ];
    
    // DJ Spot - behind the DJ booth facing the turntables
    const djSpots = [
        {
            position: { x: 0, z: 8.5 },
            interactionRadius: 1.5,
            rotation: Math.PI,
            type: 'dj'
        }
    ];
    
    // Return room data
    return {
        bounds: { type: 'circular', radius: IGLOO_SIZE / 2 - 1.5, centerX: 0, centerZ: 0 },
        spawnPos: { x: 0, z: 10 },
        furniture,
        beachBall,
        colliders: furnitureColliders,
        djSpots, // DJ animation spot
        map,
        update
    };
}

export default generateSKNYIglooInterior;

