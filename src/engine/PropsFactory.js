import { VOXEL_SIZE, PALETTE } from '../constants';

/**
 * PropsFactory - Procedural generation of environmental props
 * Creates optimized meshes for trees, igloos, lamps, benches, and decorations
 * 
 * Design: Factory pattern with static generators and instance pooling
 * All meshes use merged geometry for minimal draw calls
 */
class PropsFactory {
    // Extended color palette for props
    static COLORS = {
        // Snow variations
        snowBright: '#FFFFFF',
        snowLight: '#F0F8FF',
        snowMedium: '#E8F0F8',
        snowDark: '#C8D8E8',
        snowShadow: '#A8C0D8',
        iceBright: '#D8F0FF',
        iceBlue: '#B8D8F0',
        
        // Wood
        barkDark: '#3A2010',
        barkMedium: '#4A3020',
        barkLight: '#5A4030',
        plankLight: '#8B7355',
        plankMedium: '#7B6345',
        plankDark: '#6B5335',
        
        // Foliage (pine trees)
        pineDeep: '#0A3A1A',
        pineDark: '#1A4A2A',
        pineMedium: '#2A5A3A',
        pineLight: '#3A6A4A',
        
        // Rock
        rockDark: '#3A4A4A',
        rockMedium: '#5A6A6A',
        rockLight: '#7A8A8A',
        
        // Metal
        metalDark: '#2A3A4A',
        metalMedium: '#4A5A6A',
        metalLight: '#6A7A8A',
        
        // Warm lights
        lampGlow: '#FFE4B5',
        lampBright: '#FFF8DC',
        windowWarm: '#FFD070',
        
        // Ice/Glass
        iceTranslucent: '#D0E8F8',
        iglooWhite: '#F8FCFF',
        iglooShadow: '#D8E8F0',
    };

    constructor(THREE) {
        this.THREE = THREE;
        this.materialCache = new Map();
        this.geometryCache = new Map();
    }

    // ==================== MATERIAL CACHING ====================
    
    getMaterial(color, options = {}) {
        const key = `${color}_${JSON.stringify(options)}`;
        if (!this.materialCache.has(key)) {
            // Build material config without undefined values
            const matConfig = {
                color: new this.THREE.Color(color),
                roughness: options.roughness ?? 0.8,
                metalness: options.metalness ?? 0,
                transparent: options.transparent ?? false,
                opacity: options.opacity ?? 1,
                side: options.doubleSided ? this.THREE.DoubleSide : this.THREE.FrontSide,
            };
            
            // Only add emissive properties if emissive color is provided
            if (options.emissive) {
                matConfig.emissive = new this.THREE.Color(options.emissive);
                matConfig.emissiveIntensity = options.emissiveIntensity ?? 0.5;
            }
            
            const mat = new this.THREE.MeshStandardMaterial(matConfig);
            this.materialCache.set(key, mat);
        }
        return this.materialCache.get(key);
    }

    // ==================== PINE TREE ====================
    
    /**
     * Create a snow-covered pine tree
     * @param {string} size - 'small' | 'medium' | 'large'
     * @returns {{ mesh: THREE.Group, collision: { type: 'cylinder', radius: number, height: number } }}
     */
    createPineTree(size = 'medium') {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = `pine_tree_${size}`;
        
        // Size configurations
        const sizes = {
            small:  { trunkH: 1.5, trunkR: 0.2, layers: 3, baseRadius: 1.5, layerH: 1.2, snowDepth: 0.15 },
            medium: { trunkH: 2.5, trunkR: 0.3, layers: 4, baseRadius: 2.2, layerH: 1.5, snowDepth: 0.2 },
            large:  { trunkH: 3.5, trunkR: 0.4, layers: 5, baseRadius: 3.0, layerH: 1.8, snowDepth: 0.25 },
        };
        const cfg = sizes[size] || sizes.medium;
        
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(cfg.trunkR * 0.7, cfg.trunkR, cfg.trunkH, 8);
        const trunkMat = this.getMaterial(PropsFactory.COLORS.barkMedium, { roughness: 0.95 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = cfg.trunkH / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);
        
        // Pine layers (cones with snow caps)
        const layerColors = [
            PropsFactory.COLORS.pineDeep,
            PropsFactory.COLORS.pineDark,
            PropsFactory.COLORS.pineMedium,
            PropsFactory.COLORS.pineLight,
            PropsFactory.COLORS.pineMedium,
        ];
        
        let currentY = cfg.trunkH * 0.6;
        
        for (let i = 0; i < cfg.layers; i++) {
            const layerRatio = 1 - (i / cfg.layers) * 0.7;
            const radius = cfg.baseRadius * layerRatio;
            const height = cfg.layerH * layerRatio;
            
            // Pine cone layer
            const coneGeo = new THREE.ConeGeometry(radius, height, 8);
            const coneMat = this.getMaterial(layerColors[i % layerColors.length], { roughness: 0.9 });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.y = currentY + height / 2;
            cone.castShadow = true;
            cone.receiveShadow = true;
            group.add(cone);
            
            // Snow cap on top of this layer
            const snowRadius = radius * 0.85;
            const snowGeo = new THREE.ConeGeometry(snowRadius, cfg.snowDepth, 8);
            const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.6 });
            const snow = new THREE.Mesh(snowGeo, snowMat);
            snow.position.y = currentY + height - cfg.snowDepth / 2;
            snow.castShadow = true;
            group.add(snow);
            
            // Snow clumps on branches - REDUCED for performance (only on larger trees)
            if (size !== 'small' && i < 2) { // Only bottom 2 layers, skip small trees
                const clumpCount = 2; // Reduced from 3-6
                for (let j = 0; j < clumpCount; j++) {
                    const angle = (j / clumpCount) * Math.PI * 2;
                    const dist = radius * 0.6;
                    const clumpGeo = new THREE.SphereGeometry(0.18, 4, 4); // Lower poly
                    const clump = new THREE.Mesh(clumpGeo, snowMat);
                    clump.position.set(
                        Math.cos(angle) * dist,
                        currentY + height * 0.4,
                        Math.sin(angle) * dist
                    );
                    clump.scale.y = 0.5;
                    group.add(clump);
                }
            }
            
            currentY += height * 0.65;
        }
        
        // Top snow cap
        const topSnowGeo = new THREE.SphereGeometry(cfg.snowDepth * 2, 6, 6);
        const topSnow = new THREE.Mesh(topSnowGeo, this.getMaterial(PropsFactory.COLORS.snowBright));
        topSnow.position.y = currentY + cfg.snowDepth;
        topSnow.scale.set(1, 0.6, 1);
        group.add(topSnow);
        
        // Store collision data on the group
        group.userData.collision = {
            type: 'cylinder',
            radius: cfg.trunkR + 0.3,
            height: cfg.trunkH + cfg.layers * cfg.layerH * 0.65,
        };
        
        return group;
    }

    // ==================== IGLOO ====================
    
    /**
     * Create a clean igloo with entrance tunnel
     * @param {boolean} withEntrance - Include the entrance tunnel
     * @returns {THREE.Group}
     */
    createIgloo(withEntrance = true) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'igloo';
        
        const domeRadius = 3;
        const domeHeight = 2.2;
        
        const domeMat = this.getMaterial(PropsFactory.COLORS.iglooWhite, { roughness: 0.4 });
        const shadowMat = this.getMaterial(PropsFactory.COLORS.iglooShadow, { roughness: 0.5 });
        const darkMat = this.getMaterial('#0A1520', { roughness: 1 });
        
        // Main dome - solid hemisphere
        const domeGeo = new THREE.SphereGeometry(domeRadius, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.scale.y = domeHeight / domeRadius;
        dome.castShadow = true;
        dome.receiveShadow = true;
        group.add(dome);
        
        // Ice block brick pattern - horizontal rings only (cleaner look)
        const ringCount = 5;
        for (let i = 1; i < ringCount; i++) {
            const t = i / ringCount;
            const ringY = t * domeHeight * 0.95;
            // Calculate radius at this height using ellipse formula
            const ringRadius = domeRadius * Math.sqrt(1 - Math.pow(t, 2)) * 0.98;
            if (ringRadius > 0.3) {
                const ringGeo = new THREE.TorusGeometry(ringRadius, 0.04, 4, 48);
                const ring = new THREE.Mesh(ringGeo, shadowMat);
                ring.position.y = ringY;
                ring.rotation.x = Math.PI / 2;
                group.add(ring);
            }
        }
        
        // Entrance tunnel using simple boxes
        if (withEntrance) {
            const tunnelW = 1.6;
            const tunnelH = 1.4;
            const tunnelD = 2.2;
            const tunnelZ = domeRadius * 0.7;
            
            // Tunnel walls (left and right)
            const wallGeo = new THREE.BoxGeometry(0.25, tunnelH, tunnelD);
            [-tunnelW/2, tunnelW/2].forEach(x => {
                const wall = new THREE.Mesh(wallGeo, domeMat);
                wall.position.set(x, tunnelH / 2, tunnelZ + tunnelD / 2);
                wall.castShadow = true;
                wall.receiveShadow = true;
                group.add(wall);
            });
            
            // Tunnel roof (curved using multiple boxes)
            const roofSegments = 6;
            for (let i = 0; i < roofSegments; i++) {
                const angle = (i / (roofSegments - 1)) * Math.PI;
                const roofW = tunnelW + 0.3;
                const roofGeo = new THREE.BoxGeometry(roofW * Math.cos(angle - Math.PI/2) * 0.3 + 0.3, 0.2, tunnelD);
                const roof = new THREE.Mesh(roofGeo, domeMat);
                roof.position.set(
                    Math.cos(angle) * (tunnelW / 2) * 0.6,
                    tunnelH + Math.sin(angle) * 0.4,
                    tunnelZ + tunnelD / 2
                );
                roof.castShadow = true;
                group.add(roof);
            }
            
            // Tunnel top cover
            const topGeo = new THREE.BoxGeometry(tunnelW + 0.5, 0.25, tunnelD);
            const top = new THREE.Mesh(topGeo, domeMat);
            top.position.set(0, tunnelH + 0.4, tunnelZ + tunnelD / 2);
            top.castShadow = true;
            group.add(top);
            
            // Tunnel floor
            const floorGeo = new THREE.BoxGeometry(tunnelW, 0.1, tunnelD);
            const floor = new THREE.Mesh(floorGeo, this.getMaterial(PropsFactory.COLORS.snowMedium));
            floor.position.set(0, 0.05, tunnelZ + tunnelD / 2);
            floor.receiveShadow = true;
            group.add(floor);
            
            // Dark interior opening
            const interiorGeo = new THREE.PlaneGeometry(tunnelW * 0.8, tunnelH * 0.9);
            const interior = new THREE.Mesh(interiorGeo, darkMat);
            interior.position.set(0, tunnelH * 0.5, tunnelZ - 0.1);
            group.add(interior);
            
            // Entrance arch frame
            const archGeo = new THREE.TorusGeometry(tunnelW / 2 + 0.1, 0.12, 6, 12, Math.PI);
            const arch = new THREE.Mesh(archGeo, shadowMat);
            arch.position.set(0, tunnelH * 0.6, tunnelZ + tunnelD);
            arch.rotation.y = Math.PI;
            group.add(arch);
        }
        
        // Snow drift at base
        const driftGeo = new THREE.TorusGeometry(domeRadius + 0.3, 0.5, 8, 32);
        const drift = new THREE.Mesh(driftGeo, this.getMaterial(PropsFactory.COLORS.snowMedium, { roughness: 0.7 }));
        drift.rotation.x = Math.PI / 2;
        drift.position.y = 0.12;
        drift.scale.y = 0.35;
        group.add(drift);
        
        // Small snow mounds near entrance
        if (withEntrance) {
            const pileMat = this.getMaterial(PropsFactory.COLORS.snowLight);
            [-1, 1].forEach(side => {
                const pile = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), pileMat);
                pile.position.set(side * 1.3, 0.2, domeRadius + 2.2);
                pile.scale.set(1.2, 0.5, 1);
                group.add(pile);
            });
        }
        
        // Collision data
        group.userData.collision = {
            type: 'cylinder',
            radius: domeRadius + 0.5,
            height: domeHeight,
        };
        
        // Interactive zone at entrance
        group.userData.interactionZone = {
            type: 'box',
            position: { x: 0, z: domeRadius + 2.5 },
            size: { x: 2, z: 2 },
            action: 'enter_igloo'
        };
        
        return group;
    }

    // ==================== LAMP POST ====================
    
    /**
     * Create a classic street lamp with warm glow
     * @param {boolean} isOn - Whether the lamp is lit
     * @returns {{ mesh: THREE.Group, light: THREE.PointLight }}
     */
    createLampPost(isOn = true) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'lamp_post';
        
        const postHeight = 5;
        const postRadius = 0.12;
        
        // Base plate
        const baseGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8);
        const metalMat = this.getMaterial(PropsFactory.COLORS.metalDark, { roughness: 0.6, metalness: 0.3 });
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.y = 0.15;
        base.castShadow = true;
        group.add(base);
        
        // Post
        const postGeo = new THREE.CylinderGeometry(postRadius, postRadius * 1.2, postHeight, 8);
        const post = new THREE.Mesh(postGeo, metalMat);
        post.position.y = postHeight / 2 + 0.3;
        post.castShadow = true;
        group.add(post);
        
        // Decorative ring
        const ringGeo = new THREE.TorusGeometry(postRadius * 1.5, 0.03, 8, 16);
        const ring = new THREE.Mesh(ringGeo, metalMat);
        ring.position.y = postHeight * 0.7;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        
        // Lamp housing (top)
        const housingGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.4, 6);
        const housing = new THREE.Mesh(housingGeo, metalMat);
        housing.position.y = postHeight + 0.5;
        housing.castShadow = true;
        group.add(housing);
        
        // Lamp roof
        const roofGeo = new THREE.ConeGeometry(0.5, 0.3, 6);
        const roof = new THREE.Mesh(roofGeo, metalMat);
        roof.position.y = postHeight + 0.85;
        group.add(roof);
        
        // Glass globe
        const globeGeo = new THREE.SphereGeometry(0.25, 12, 12);
        const globeMat = this.getMaterial(
            isOn ? PropsFactory.COLORS.lampGlow : PropsFactory.COLORS.iceTranslucent,
            {
                roughness: 0.1,
                transparent: true,
                opacity: 0.9,
                emissive: isOn ? PropsFactory.COLORS.lampGlow : undefined,
                emissiveIntensity: isOn ? 0.8 : 0,
            }
        );
        const globe = new THREE.Mesh(globeGeo, globeMat);
        globe.position.y = postHeight + 0.3;
        group.add(globe);
        
        // Point light - NO SHADOWS for performance (many lamps in scene)
        let light = null;
        if (isOn) {
            light = new THREE.PointLight(0xFFE4B5, 0.8, 10, 2);
            light.position.y = postHeight + 0.3;
            light.castShadow = false; // PERFORMANCE: Shadows disabled - too many lights
            group.add(light);
        }
        
        // Snow on top
        const snowCapGeo = new THREE.SphereGeometry(0.35, 8, 8);
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight);
        const snowCap = new THREE.Mesh(snowCapGeo, snowMat);
        snowCap.position.y = postHeight + 1;
        snowCap.scale.set(1.2, 0.4, 1.2);
        group.add(snowCap);
        
        // Collision
        group.userData.collision = {
            type: 'cylinder',
            radius: 0.4,
            height: postHeight + 1,
        };
        
        group.userData.light = light;
        
        return group;
    }

    // ==================== BENCH ====================
    
    /**
     * Create a snow-covered park bench
     * @param {boolean} withSnow - Add snow cover
     * @returns {THREE.Group}
     */
    createBench(withSnow = true) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'bench';
        
        const benchWidth = 3;
        const benchDepth = 0.8;
        const seatHeight = 0.8;
        
        const woodMat = this.getMaterial(PropsFactory.COLORS.plankMedium, { roughness: 0.9 });
        const metalMat = this.getMaterial(PropsFactory.COLORS.metalDark, { roughness: 0.5, metalness: 0.4 });
        
        // Metal legs (2 on each side)
        const legPositions = [
            [-benchWidth/2 + 0.3, 0, -benchDepth/2 + 0.15],
            [-benchWidth/2 + 0.3, 0, benchDepth/2 - 0.15],
            [benchWidth/2 - 0.3, 0, -benchDepth/2 + 0.15],
            [benchWidth/2 - 0.3, 0, benchDepth/2 - 0.15],
        ];
        
        const legGeo = new THREE.CylinderGeometry(0.05, 0.06, seatHeight, 6);
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, metalMat);
            leg.position.set(pos[0], seatHeight / 2, pos[2]);
            leg.castShadow = true;
            group.add(leg);
        });
        
        // Seat planks (5 planks)
        const plankGeo = new THREE.BoxGeometry(benchWidth, 0.08, 0.14);
        for (let i = 0; i < 5; i++) {
            const plank = new THREE.Mesh(plankGeo, woodMat);
            plank.position.set(0, seatHeight, -benchDepth/2 + 0.1 + i * 0.16);
            plank.castShadow = true;
            plank.receiveShadow = true;
            group.add(plank);
        }
        
        // Back rest planks
        const backGeo = new THREE.BoxGeometry(benchWidth, 0.08, 0.12);
        for (let i = 0; i < 3; i++) {
            const back = new THREE.Mesh(backGeo, woodMat);
            back.position.set(0, seatHeight + 0.2 + i * 0.15, -benchDepth/2 - 0.05);
            back.rotation.x = 0.15;
            back.castShadow = true;
            group.add(back);
        }
        
        // Armrests
        const armGeo = new THREE.BoxGeometry(0.1, 0.08, benchDepth + 0.2);
        [-benchWidth/2 + 0.15, benchWidth/2 - 0.15].forEach(x => {
            const arm = new THREE.Mesh(armGeo, woodMat);
            arm.position.set(x, seatHeight + 0.25, 0);
            arm.castShadow = true;
            group.add(arm);
        });
        
        // Snow cover
        if (withSnow) {
            const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.6 });
            
            // Snow on seat
            const seatSnowGeo = new THREE.BoxGeometry(benchWidth * 0.9, 0.1, benchDepth * 0.8);
            const seatSnow = new THREE.Mesh(seatSnowGeo, snowMat);
            seatSnow.position.set(0, seatHeight + 0.08, 0.05);
            group.add(seatSnow);
            
            // Snow on back
            const backSnowGeo = new THREE.BoxGeometry(benchWidth * 0.85, 0.08, 0.2);
            const backSnow = new THREE.Mesh(backSnowGeo, snowMat);
            backSnow.position.set(0, seatHeight + 0.55, -benchDepth/2 - 0.1);
            backSnow.rotation.x = 0.15;
            group.add(backSnow);
            
            // Snow clumps on armrests
            const clumpGeo = new THREE.SphereGeometry(0.12, 6, 6);
            [-benchWidth/2 + 0.15, benchWidth/2 - 0.15].forEach(x => {
                const clump = new THREE.Mesh(clumpGeo, snowMat);
                clump.position.set(x, seatHeight + 0.35, 0.1);
                clump.scale.y = 0.5;
                group.add(clump);
            });
        }
        
        // Collision
        group.userData.collision = {
            type: 'box',
            size: { x: benchWidth + 0.2, y: seatHeight + 0.6, z: benchDepth + 0.3 },
        };
        
        // Interaction zone (for sitting) with two snap points
        // Bench faces +Z direction (back rest at -Z), so sitting players face +Z
        group.userData.interactionZone = {
            type: 'box',
            position: { x: 0, z: benchDepth/2 + 0.8 },
            size: { x: benchWidth + 1, z: 2 },
            action: 'sit',
            emote: 'Sit',
            seatHeight: seatHeight,
            benchDepth: benchDepth,
            // Two seat positions: left and right side of bench (centered on each half)
            // x: ±0.6 centers player on each side of the bench
            // z: 0 centers player on the seat planks
            snapPoints: [
                { x: -0.6, z: 0 },    // Left seat (centered on left half)
                { x: 0.6, z: 0 }      // Right seat (centered on right half)
            ],
            maxOccupants: 2
        };
        
        return group;
    }

    // ==================== SNOW PILE ====================
    
    /**
     * Create a decorative snow pile/drift
     * @param {string} size - 'small' | 'medium' | 'large'
     * @returns {THREE.Group}
     */
    createSnowPile(size = 'medium') {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = `snow_pile_${size}`;
        
        const sizes = {
            small: { scale: 0.5, mounds: 1 },
            medium: { scale: 1.0, mounds: 2 },
            large: { scale: 1.5, mounds: 3 },
        };
        const cfg = sizes[size] || sizes.medium;
        
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.65 });
        const shadowMat = this.getMaterial(PropsFactory.COLORS.snowShadow, { roughness: 0.7 });
        
        // Main mound
        const mainGeo = new THREE.SphereGeometry(1 * cfg.scale, 12, 8);
        const main = new THREE.Mesh(mainGeo, snowMat);
        main.scale.set(1.5, 0.4, 1.2);
        main.position.y = 0.2 * cfg.scale;
        main.receiveShadow = true;
        group.add(main);
        
        // Additional mounds
        for (let i = 0; i < cfg.mounds; i++) {
            const moundGeo = new THREE.SphereGeometry(0.6 * cfg.scale, 8, 6);
            const mound = new THREE.Mesh(moundGeo, i % 2 === 0 ? snowMat : shadowMat);
            const angle = (i / cfg.mounds) * Math.PI * 2;
            mound.position.set(
                Math.cos(angle) * 0.8 * cfg.scale,
                0.15 * cfg.scale,
                Math.sin(angle) * 0.6 * cfg.scale
            );
            mound.scale.set(1.2, 0.5, 1);
            mound.receiveShadow = true;
            group.add(mound);
        }
        
        // PERFORMANCE: Sparkle points removed - too many small meshes
        
        // No collision - decorative only
        group.userData.collision = null;
        
        return group;
    }

    // ==================== SIGNPOST ====================
    
    /**
     * Create a directional signpost
     * @param {Array<{text: string, direction: number}>} signs - Array of sign configs
     * @returns {THREE.Group}
     */
    createSignpost(signs = [{ text: 'TOWN', direction: 0 }]) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'signpost';
        
        const postHeight = 3;
        
        // Post
        const postGeo = new THREE.CylinderGeometry(0.08, 0.1, postHeight, 6);
        const woodMat = this.getMaterial(PropsFactory.COLORS.plankDark, { roughness: 0.9 });
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.y = postHeight / 2;
        post.castShadow = true;
        group.add(post);
        
        // Signs
        const signMat = this.getMaterial(PropsFactory.COLORS.plankLight, { roughness: 0.85 });
        
        signs.forEach((signConfig, index) => {
            const signGroup = new THREE.Group();
            
            // Sign board (arrow shape)
            const boardWidth = 1.8;
            const boardHeight = 0.4;
            const arrowPoint = 0.3;
            
            // Create arrow shape
            const shape = new THREE.Shape();
            shape.moveTo(-boardWidth/2, -boardHeight/2);
            shape.lineTo(boardWidth/2 - arrowPoint, -boardHeight/2);
            shape.lineTo(boardWidth/2, 0);
            shape.lineTo(boardWidth/2 - arrowPoint, boardHeight/2);
            shape.lineTo(-boardWidth/2, boardHeight/2);
            shape.lineTo(-boardWidth/2, -boardHeight/2);
            
            const extrudeSettings = { depth: 0.08, bevelEnabled: false };
            const boardGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const board = new THREE.Mesh(boardGeo, signMat);
            board.position.z = -0.04;
            board.castShadow = true;
            signGroup.add(board);
            
            // Text (using canvas texture)
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#3A2010';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(signConfig.text || 'SIGN', 110, 32);
            
            const texture = new THREE.CanvasTexture(canvas);
            const textMat = new THREE.MeshBasicMaterial({ 
                map: texture, 
                transparent: true,
                depthWrite: false
            });
            const textGeo = new THREE.PlaneGeometry(boardWidth - 0.4, boardHeight - 0.1);
            const text = new THREE.Mesh(textGeo, textMat);
            text.position.z = 0.05;
            signGroup.add(text);
            
            // Position and rotate sign
            signGroup.position.y = postHeight - 0.3 - index * 0.5;
            signGroup.rotation.y = (signConfig.direction || 0) * Math.PI / 180;
            
            group.add(signGroup);
        });
        
        // Snow cap
        const snowGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = postHeight + 0.1;
        snow.scale.set(1.5, 0.5, 1.5);
        group.add(snow);
        
        // Collision
        group.userData.collision = {
            type: 'cylinder',
            radius: 0.3,
            height: postHeight,
        };
        
        return group;
    }

    // ==================== ROCK ====================
    
    /**
     * Create a snow-dusted rock
     * @param {string} size - 'small' | 'medium' | 'large'
     * @returns {THREE.Group}
     */
    createRock(size = 'medium') {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = `rock_${size}`;
        
        const sizes = {
            small: { scale: 0.5, segments: 4 },
            medium: { scale: 1.0, segments: 5 },
            large: { scale: 1.8, segments: 6 },
        };
        const cfg = sizes[size] || sizes.medium;
        
        // Irregular rock shape (deformed icosahedron)
        const rockGeo = new THREE.IcosahedronGeometry(1 * cfg.scale, cfg.segments - 3);
        const positions = rockGeo.attributes.position;
        
        // Deform vertices for organic look
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            const noise = Math.sin(x * 3) * Math.cos(z * 2) * 0.15;
            positions.setX(i, x * (1 + noise));
            positions.setY(i, y * (0.6 + Math.abs(noise)));
            positions.setZ(i, z * (1 + noise * 0.5));
        }
        rockGeo.computeVertexNormals();
        
        const rockMat = this.getMaterial(PropsFactory.COLORS.rockMedium, { roughness: 0.95 });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.y = 0.3 * cfg.scale;
        rock.rotation.y = Math.random() * Math.PI * 2;
        rock.castShadow = true;
        rock.receiveShadow = true;
        group.add(rock);
        
        // Snow on top
        const snowGeo = new THREE.SphereGeometry(0.8 * cfg.scale, 8, 6);
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.6 });
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 0.5 * cfg.scale;
        snow.scale.set(1.2, 0.3, 1.2);
        group.add(snow);
        
        // Collision
        group.userData.collision = {
            type: 'cylinder',
            radius: 0.9 * cfg.scale,
            height: 1 * cfg.scale,
        };
        
        return group;
    }

    // ==================== SNOWMAN ====================
    
    /**
     * Create an interactive snowman
     * @returns {THREE.Group}
     */
    createSnowman() {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'snowman';
        
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.6 });
        
        // Bottom ball
        const bottomGeo = new THREE.SphereGeometry(0.8, 16, 12);
        const bottom = new THREE.Mesh(bottomGeo, snowMat);
        bottom.position.y = 0.7;
        bottom.scale.y = 0.9;
        bottom.castShadow = true;
        bottom.receiveShadow = true;
        group.add(bottom);
        
        // Middle ball
        const middleGeo = new THREE.SphereGeometry(0.55, 14, 10);
        const middle = new THREE.Mesh(middleGeo, snowMat);
        middle.position.y = 1.7;
        middle.castShadow = true;
        group.add(middle);
        
        // Head
        const headGeo = new THREE.SphereGeometry(0.4, 12, 10);
        const head = new THREE.Mesh(headGeo, snowMat);
        head.position.y = 2.4;
        head.castShadow = true;
        group.add(head);
        
        // Eyes (coal)
        const eyeMat = this.getMaterial('#1A1A1A');
        const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
        [-0.12, 0.12].forEach(x => {
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(x, 2.5, 0.35);
            group.add(eye);
        });
        
        // Carrot nose
        const noseGeo = new THREE.ConeGeometry(0.06, 0.3, 6);
        const noseMat = this.getMaterial('#FF6600');
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, 2.4, 0.4);
        nose.rotation.x = Math.PI / 2;
        group.add(nose);
        
        // Smile (coal pieces) - curved upward for happy face :)
        for (let i = -2; i <= 2; i++) {
            const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), eyeMat);
            const angle = (i / 4) * 0.5 - 0.1;
            mouth.position.set(
                Math.sin(angle) * 0.25,
                2.22 + Math.abs(i) * 0.04,  // Inverted: edges UP = smile
                0.35 + Math.cos(angle) * 0.05
            );
            group.add(mouth);
        }
        
        // Buttons
        [1.5, 1.7, 1.9].forEach(y => {
            const button = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
            button.position.set(0, y, 0.52);
            group.add(button);
        });
        
        // Stick arms
        const stickMat = this.getMaterial(PropsFactory.COLORS.barkDark);
        [-1, 1].forEach(side => {
            const armGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.8, 4);
            const arm = new THREE.Mesh(armGeo, stickMat);
            arm.position.set(side * 0.7, 1.7, 0);
            arm.rotation.z = side * 0.8;
            arm.castShadow = true;
            group.add(arm);
            
            // Twig fingers
            for (let i = 0; i < 2; i++) {
                const twig = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.015, 0.01, 0.2, 3),
                    stickMat
                );
                twig.position.set(side * 1.0, 1.9 + i * 0.1, 0);
                twig.rotation.z = side * (1.2 + i * 0.3);
                group.add(twig);
            }
        });
        
        // Scarf
        const scarfMat = this.getMaterial('#CC2222', { roughness: 0.8 });
        const scarfGeo = new THREE.TorusGeometry(0.45, 0.08, 6, 16);
        const scarf = new THREE.Mesh(scarfGeo, scarfMat);
        scarf.position.y = 2.1;
        scarf.rotation.x = Math.PI / 2;
        group.add(scarf);
        
        // Scarf tail
        const tailGeo = new THREE.BoxGeometry(0.15, 0.5, 0.06);
        const tail = new THREE.Mesh(tailGeo, scarfMat);
        tail.position.set(0.3, 1.85, 0.3);
        tail.rotation.z = 0.3;
        group.add(tail);
        
        // Top hat (optional - adds personality)
        const hatMat = this.getMaterial('#1A1A1A');
        const brimGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 12);
        const brim = new THREE.Mesh(brimGeo, hatMat);
        brim.position.y = 2.75;
        group.add(brim);
        
        const crownGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.35, 12);
        const crown = new THREE.Mesh(crownGeo, hatMat);
        crown.position.y = 2.95;
        crown.castShadow = true;
        group.add(crown);
        
        // Hat band
        const bandGeo = new THREE.TorusGeometry(0.31, 0.03, 6, 16);
        const bandMat = this.getMaterial('#CC2222');
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = 2.82;
        band.rotation.x = Math.PI / 2;
        group.add(band);
        
        // Collision
        group.userData.collision = {
            type: 'cylinder',
            radius: 1,
            height: 3.2,
        };
        
        // Interaction
        group.userData.interactionZone = {
            type: 'sphere',
            radius: 2,
            action: 'interact_snowman',
            message: '☃️ Hello friend!'
        };
        
        return group;
    }

    // ==================== FENCE SECTION ====================
    
    /**
     * Create a wooden fence section
     * @param {number} length - Length of fence section
     * @returns {THREE.Group}
     */
    createFence(length = 4) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'fence';
        
        const woodMat = this.getMaterial(PropsFactory.COLORS.plankMedium, { roughness: 0.9 });
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.6 });
        
        const postSpacing = 2;
        const postCount = Math.ceil(length / postSpacing) + 1;
        const postHeight = 1.2;
        
        // Posts
        const postGeo = new THREE.BoxGeometry(0.12, postHeight, 0.12);
        for (let i = 0; i < postCount; i++) {
            const post = new THREE.Mesh(postGeo, woodMat);
            post.position.set(i * postSpacing - length/2, postHeight/2, 0);
            post.castShadow = true;
            group.add(post);
            
            // Snow cap
            const cap = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 6, 6),
                snowMat
            );
            cap.position.set(i * postSpacing - length/2, postHeight + 0.05, 0);
            cap.scale.y = 0.4;
            group.add(cap);
        }
        
        // Horizontal rails
        const railGeo = new THREE.BoxGeometry(length, 0.08, 0.06);
        [0.4, 0.8].forEach(y => {
            const rail = new THREE.Mesh(railGeo, woodMat);
            rail.position.y = y;
            rail.castShadow = true;
            group.add(rail);
        });
        
        // Snow on top rail
        const snowRailGeo = new THREE.BoxGeometry(length, 0.04, 0.1);
        const snowRail = new THREE.Mesh(snowRailGeo, snowMat);
        snowRail.position.y = 0.85;
        group.add(snowRail);
        
        // Collision
        group.userData.collision = {
            type: 'box',
            size: { x: length, y: postHeight, z: 0.3 },
        };
        
        return group;
    }

    // ==================== UTILITY METHODS ====================
    
    /**
     * Dispose of all cached materials and geometries
     */
    dispose() {
        this.materialCache.forEach(mat => mat.dispose());
        this.geometryCache.forEach(geo => geo.dispose());
        this.materialCache.clear();
        this.geometryCache.clear();
    }
}

export default PropsFactory;

