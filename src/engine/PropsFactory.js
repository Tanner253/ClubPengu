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
     * Create a high-quality igloo with realistic ice block pattern
     * @param {boolean} withEntrance - Include the entrance tunnel
     * @returns {THREE.Group}
     */
    createIgloo(withEntrance = true) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'igloo';
        
        const domeRadius = 3.2;
        const domeHeight = 2.5;
        
        // Multi-tone ice materials for realism
        const iceWhite = this.getMaterial(0xF8FCFF, { roughness: 0.3, metalness: 0.02 });
        const iceMedium = this.getMaterial(0xE8F4FA, { roughness: 0.35, metalness: 0.02 });
        const iceBlue = this.getMaterial(0xD8EAF5, { roughness: 0.4, metalness: 0.03 });
        const seamMat = this.getMaterial(0xB8D4E8, { roughness: 0.5 });
        const darkMat = this.getMaterial('#030810', { roughness: 1 });
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.6 });
        const warmGlow = this.getMaterial(0xFFA500, { 
            emissive: 0xFF8C00, 
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6
        });
        
        // Main dome - very high poly for smoothness
        const domeGeo = new THREE.SphereGeometry(domeRadius, 64, 40, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, iceMedium);
        dome.scale.y = domeHeight / domeRadius;
        dome.castShadow = true;
        dome.receiveShadow = true;
        group.add(dome);
        
        // Ice block rows - realistic spiral pattern like real igloos
        const rowCount = 7;
        const blocksPerRow = [16, 15, 14, 12, 10, 8, 5]; // Decreasing as we go up
        
        for (let row = 0; row < rowCount; row++) {
            const t = (row + 0.5) / rowCount;
            const rowY = t * domeHeight * 0.95;
            const rowRadius = domeRadius * Math.sqrt(1 - Math.pow(t, 2)) * 0.998;
            
            if (rowRadius < 0.5) continue;
            
            // Horizontal seam
            const seamGeo = new THREE.TorusGeometry(rowRadius, 0.025, 4, 64);
            const seam = new THREE.Mesh(seamGeo, seamMat);
            seam.position.y = rowY;
            seam.rotation.x = Math.PI / 2;
            group.add(seam);
            
            // Vertical seams (block edges) with spiral offset
            const blockCount = blocksPerRow[row] || 8;
            const spiralOffset = row * 0.15; // Spiral effect
            
            for (let b = 0; b < blockCount; b++) {
                const blockAngle = (b / blockCount) * Math.PI * 2 + spiralOffset;
                
                // Skip blocks near entrance (front)
                if (Math.abs(Math.sin(blockAngle)) < 0.25 && Math.cos(blockAngle) > 0) continue;
                
                // Vertical seam line
                const nextRowT = (row + 1.5) / rowCount;
                const nextRowY = Math.min(nextRowT * domeHeight * 0.95, domeHeight * 0.9);
                const nextRowRadius = domeRadius * Math.sqrt(1 - Math.pow(nextRowT, 2)) * 0.998;
                
                if (nextRowRadius > 0.3) {
                    const points = [
                        new THREE.Vector3(
                            Math.cos(blockAngle) * rowRadius,
                            rowY,
                            Math.sin(blockAngle) * rowRadius
                        ),
                        new THREE.Vector3(
                            Math.cos(blockAngle + spiralOffset * 0.1) * nextRowRadius,
                            nextRowY,
                            Math.sin(blockAngle + spiralOffset * 0.1) * nextRowRadius
                        )
                    ];
                    
                    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ 
                        color: 0xA8C8DD, 
                        linewidth: 1 
                    }));
                    group.add(line);
                }
                
                // Subtle block highlight (every other block slightly different shade)
                if (b % 3 === 0 && row < rowCount - 1) {
                    const highlightT = t + 0.05;
                    const highlightR = domeRadius * Math.sqrt(1 - Math.pow(highlightT, 2)) * 0.99;
                    const highlightGeo = new THREE.SphereGeometry(0.15, 6, 4);
                    const highlight = new THREE.Mesh(highlightGeo, iceWhite);
                    highlight.position.set(
                        Math.cos(blockAngle + 0.1) * highlightR,
                        rowY + 0.1,
                        Math.sin(blockAngle + 0.1) * highlightR
                    );
                    highlight.scale.set(1.5, 0.8, 1);
                    group.add(highlight);
                }
            }
        }
        
        // Entrance tunnel
        if (withEntrance) {
            const tunnelW = 1.4;
            const tunnelH = 1.4;
            const tunnelD = 2.0;
            const tunnelZ = domeRadius * 0.6;
            
            // Curved tunnel using lathe for realistic arch
            const tunnelProfilePts = [];
            const archSteps = 12;
            for (let i = 0; i <= archSteps; i++) {
                const angle = (i / archSteps) * Math.PI;
                tunnelProfilePts.push(new THREE.Vector2(
                    tunnelW / 2 * Math.cos(angle),
                    tunnelH / 2 + tunnelH / 2 * Math.sin(angle)
                ));
            }
            
            // Tunnel walls as smooth curved mesh
            const wallThickness = 0.15;
            
            // Left wall
            const leftWallShape = new THREE.Shape();
            leftWallShape.moveTo(-tunnelW/2 - wallThickness, 0);
            leftWallShape.lineTo(-tunnelW/2 - wallThickness, tunnelH * 0.8);
            leftWallShape.quadraticCurveTo(-tunnelW/2 - wallThickness, tunnelH + 0.1, -tunnelW/4, tunnelH + 0.2);
            leftWallShape.lineTo(-tunnelW/2, tunnelH);
            leftWallShape.quadraticCurveTo(-tunnelW/2, tunnelH * 0.7, -tunnelW/2, 0);
            
            const wallExtrudeSettings = { depth: tunnelD, bevelEnabled: false };
            const leftWallGeo = new THREE.ExtrudeGeometry(leftWallShape, wallExtrudeSettings);
            const leftWall = new THREE.Mesh(leftWallGeo, iceMedium);
            leftWall.position.set(0, 0, tunnelZ);
            leftWall.castShadow = true;
            leftWall.receiveShadow = true;
            group.add(leftWall);
            
            // Right wall (mirror)
            const rightWallShape = new THREE.Shape();
            rightWallShape.moveTo(tunnelW/2 + wallThickness, 0);
            rightWallShape.lineTo(tunnelW/2 + wallThickness, tunnelH * 0.8);
            rightWallShape.quadraticCurveTo(tunnelW/2 + wallThickness, tunnelH + 0.1, tunnelW/4, tunnelH + 0.2);
            rightWallShape.lineTo(tunnelW/2, tunnelH);
            rightWallShape.quadraticCurveTo(tunnelW/2, tunnelH * 0.7, tunnelW/2, 0);
            
            const rightWallGeo = new THREE.ExtrudeGeometry(rightWallShape, wallExtrudeSettings);
            const rightWall = new THREE.Mesh(rightWallGeo, iceMedium);
            rightWall.position.set(0, 0, tunnelZ);
            rightWall.castShadow = true;
            rightWall.receiveShadow = true;
            group.add(rightWall);
            
            // Arched roof
            const roofShape = new THREE.Shape();
            roofShape.moveTo(-tunnelW/2 - 0.1, tunnelH);
            roofShape.quadraticCurveTo(0, tunnelH + 0.5, tunnelW/2 + 0.1, tunnelH);
            roofShape.lineTo(tunnelW/2 + 0.2, tunnelH + 0.15);
            roofShape.quadraticCurveTo(0, tunnelH + 0.7, -tunnelW/2 - 0.2, tunnelH + 0.15);
            
            const roofGeo = new THREE.ExtrudeGeometry(roofShape, wallExtrudeSettings);
            const roof = new THREE.Mesh(roofGeo, iceWhite);
            roof.position.set(0, 0, tunnelZ);
            roof.castShadow = true;
            group.add(roof);
            
            // Tunnel floor
            const floorGeo = new THREE.BoxGeometry(tunnelW + 0.3, 0.06, tunnelD + 0.3);
            const floor = new THREE.Mesh(floorGeo, this.getMaterial(0xE0E8EE, { roughness: 0.55 }));
            floor.position.set(0, 0.03, tunnelZ + tunnelD / 2);
            floor.receiveShadow = true;
            group.add(floor);
            
            // Warm glow from interior (simulates fireplace inside)
            const glowGeo = new THREE.CircleGeometry(tunnelW * 0.4, 16);
            const glow = new THREE.Mesh(glowGeo, warmGlow);
            glow.position.set(0, tunnelH * 0.5, tunnelZ - 0.1);
            group.add(glow);
            
            // Dark interior behind glow
            const interiorGeo = new THREE.CircleGeometry(tunnelW * 0.45, 16);
            const interior = new THREE.Mesh(interiorGeo, darkMat);
            interior.position.set(0, tunnelH * 0.5, tunnelZ - 0.15);
            group.add(interior);
            
            // Entrance arch frame (decorative ice blocks)
            const archBlockCount = 7;
            for (let i = 0; i < archBlockCount; i++) {
                const angle = (i / (archBlockCount - 1)) * Math.PI;
                const archRadius = tunnelW / 2 + 0.25;
                const blockGeo = new THREE.BoxGeometry(0.2, 0.15, 0.15);
                const block = new THREE.Mesh(blockGeo, iceBlue);
                block.position.set(
                    Math.cos(angle) * archRadius,
                    tunnelH * 0.5 + Math.sin(angle) * archRadius,
                    tunnelZ + tunnelD + 0.08
                );
                block.rotation.z = angle - Math.PI / 2;
                group.add(block);
            }
            
            // Snow piles at entrance
            [-1, 1].forEach(side => {
                const pile = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), snowMat);
                pile.position.set(side * 1.2, 0.2, tunnelZ + tunnelD + 0.5);
                pile.scale.set(1.3, 0.5, 1.1);
                pile.castShadow = true;
                group.add(pile);
            });
        }
        
        // Snow drift ring at base (natural looking)
        const driftGeo = new THREE.TorusGeometry(domeRadius + 0.4, 0.6, 12, 64);
        const drift = new THREE.Mesh(driftGeo, this.getMaterial(0xF0F5FA, { roughness: 0.6 }));
        drift.rotation.x = Math.PI / 2;
        drift.position.y = 0.15;
        drift.scale.y = 0.3;
        group.add(drift);
        
        // Random snow mounds around base
        const moundCount = 5;
        for (let i = 0; i < moundCount; i++) {
            const angle = (i / moundCount) * Math.PI * 2 + 0.5;
            // Skip entrance area
            if (Math.abs(Math.sin(angle)) < 0.3 && Math.cos(angle) > 0) continue;
            
            const moundGeo = new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 8, 6);
            const mound = new THREE.Mesh(moundGeo, snowMat);
            mound.position.set(
                Math.cos(angle) * (domeRadius + 0.8),
                0.1 + Math.random() * 0.1,
                Math.sin(angle) * (domeRadius + 0.8)
            );
            mound.scale.set(1.2, 0.4, 1);
            group.add(mound);
        }
        
        // Icicles hanging from dome edge
        const icicleCount = 8;
        for (let i = 0; i < icicleCount; i++) {
            const angle = (i / icicleCount) * Math.PI * 2 + 0.4;
            // Skip entrance area
            if (Math.abs(Math.sin(angle)) < 0.35 && Math.cos(angle) > 0) continue;
            
            const icicleLen = 0.25 + Math.random() * 0.2;
            const icicleGeo = new THREE.ConeGeometry(0.04, icicleLen, 4);
            const icicleMat = this.getMaterial(0xD0F0FF, { 
                roughness: 0.05, 
                transparent: true, 
                opacity: 0.9,
                metalness: 0.1
            });
            const icicle = new THREE.Mesh(icicleGeo, icicleMat);
            icicle.position.set(
                Math.cos(angle) * (domeRadius - 0.02),
                0.4 + Math.random() * 0.2,
                Math.sin(angle) * (domeRadius - 0.02)
            );
            icicle.rotation.x = Math.PI;
            group.add(icicle);
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
            position: { x: 0, z: domeRadius + 2.2 },
            size: { x: 2.5, z: 2 },
            action: 'enter_igloo'
        };
        
        return group;
    }

    // ==================== LAMP POST ====================
    
    /**
     * Create a classic street lamp with warm glow
     * @param {boolean} isOn - Whether the lamp is lit
     * @param {boolean} castShadow - Whether the light casts shadows (performance impact)
     * @returns {{ mesh: THREE.Group, light: THREE.PointLight }}
     */
    createLampPost(isOn = true, castShadow = false) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'lamp_post';
        
        const postHeight = 5;
        const postRadius = 0.12;
        
        // Base plate - ornate Victorian style
        const baseGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.25, 8);
        const metalMat = this.getMaterial(PropsFactory.COLORS.metalDark, { roughness: 0.5, metalness: 0.4 });
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.y = 0.125;
        base.castShadow = true;
        group.add(base);
        
        // Base ring detail
        const baseRingGeo = new THREE.TorusGeometry(0.4, 0.04, 6, 16);
        const baseRing = new THREE.Mesh(baseRingGeo, metalMat);
        baseRing.position.y = 0.25;
        baseRing.rotation.x = Math.PI / 2;
        group.add(baseRing);
        
        // Post - tapered
        const postGeo = new THREE.CylinderGeometry(postRadius * 0.9, postRadius * 1.1, postHeight, 8);
        const post = new THREE.Mesh(postGeo, metalMat);
        post.position.y = postHeight / 2 + 0.25;
        post.castShadow = true;
        group.add(post);
        
        // Decorative rings on post
        [0.4, 0.7].forEach(t => {
            const ringGeo = new THREE.TorusGeometry(postRadius * 1.4, 0.025, 6, 12);
            const ring = new THREE.Mesh(ringGeo, metalMat);
            ring.position.y = postHeight * t;
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
        });
        
        // Lamp arm bracket
        const bracketGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08);
        const bracket = new THREE.Mesh(bracketGeo, metalMat);
        bracket.position.y = postHeight + 0.2;
        group.add(bracket);
        
        // Lamp housing (lantern style)
        const housingGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.35, 6);
        const housing = new THREE.Mesh(housingGeo, metalMat);
        housing.position.y = postHeight + 0.55;
        housing.castShadow = true;
        group.add(housing);
        
        // Lamp roof (pointed)
        const roofGeo = new THREE.ConeGeometry(0.4, 0.35, 6);
        const roof = new THREE.Mesh(roofGeo, metalMat);
        roof.position.y = postHeight + 0.9;
        group.add(roof);
        
        // Roof finial
        const finialGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const finial = new THREE.Mesh(finialGeo, metalMat);
        finial.position.y = postHeight + 1.1;
        group.add(finial);
        
        // Glass globe (brighter when on)
        const globeGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const globeMat = this.getMaterial(
            isOn ? 0xFFF8E0 : PropsFactory.COLORS.iceTranslucent,
            {
                roughness: 0.1,
                transparent: true,
                opacity: isOn ? 0.95 : 0.6,
                emissive: isOn ? 0xFFE4B5 : undefined,
                emissiveIntensity: isOn ? 1.2 : 0,
            }
        );
        const globe = new THREE.Mesh(globeGeo, globeMat);
        globe.position.y = postHeight + 0.35;
        group.add(globe);
        
        // Point light for all lamps that are on - shadows only for castShadow: true
        // PointLights without shadows are much cheaper than with shadows
        let light = null;
        if (isOn) {
            // Non-shadow lamps: dimmer, shorter range (ambient fill)
            // Shadow lamps: brighter, longer range (key lights)
            const intensity = castShadow ? 3.0 : 1.8;
            const distance = castShadow ? 20 : 12;
            
            light = new THREE.PointLight(0xFFE4B5, intensity, distance, 1.8);
            light.position.y = postHeight + 0.35;
            light.castShadow = castShadow;
            
            if (castShadow) {
                // Configure shadow for quality (only shadow-casting lamps)
                light.shadow.mapSize.width = 512;
                light.shadow.mapSize.height = 512;
                light.shadow.camera.near = 0.5;
                light.shadow.camera.far = 20;
                light.shadow.bias = -0.001;
            }
            
            group.add(light);
        }
        
        // Snow on top
        const snowCapGeo = new THREE.SphereGeometry(0.28, 8, 8);
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight);
        const snowCap = new THREE.Mesh(snowCapGeo, snowMat);
        snowCap.position.y = postHeight + 1.15;
        snowCap.scale.set(1.4, 0.35, 1.4);
        group.add(snowCap);
        
        // Collision
        group.userData.collision = {
            type: 'cylinder',
            radius: 0.35,
            height: postHeight + 1.2,
        };
        
        group.userData.light = light;
        group.userData.castShadow = castShadow;
        
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
        
        // Collision - height is the seat height (so players can stand on top)
        // The collision blocks at seat level, allowing jumping onto the bench
        group.userData.collision = {
            type: 'box',
            size: { x: benchWidth + 0.2, y: seatHeight, z: benchDepth + 0.3 },
            height: seatHeight, // Explicit height for landing detection
        };
        
        // Interaction zone (for sitting) with two snap points
        // Zone CENTERED on bench and covers front area generously
        // This ensures interaction works regardless of bench rotation
        group.userData.interactionZone = {
            type: 'box',
            position: { x: 0, z: 0 },  // Centered on bench
            size: { x: benchWidth + 2, z: benchDepth + 3 },  // Covers bench + approach area
            action: 'sit',
            message: '🪑 Sit on bench',
            emote: 'Sit',
            seatHeight: seatHeight,
            benchDepth: benchDepth,
            // Two seat positions: left and right side of bench
            snapPoints: [
                { x: -0.6, z: 0 },    // Left seat
                { x: 0.6, z: 0 }      // Right seat
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

    // ==================== IPAD/TABLET PROP ====================
    
    /**
     * Create an iPad/tablet prop for penguins playing games
     * This shows when players are in an active match
     * @param {string} screenColor - Color of the screen glow
     * @returns {THREE.Group}
     */
    createTablet(screenColor = '#00FFFF') {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'tablet';
        
        // Tablet dimensions (held horizontally)
        const width = 0.8;
        const height = 0.5;
        const depth = 0.04;
        
        // Tablet body (dark gray)
        const bodyMat = this.getMaterial('#1A1A2E', { roughness: 0.3, metalness: 0.5 });
        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        group.add(body);
        
        // Screen bezel
        const bezelMat = this.getMaterial('#0A0A14', { roughness: 0.2 });
        const bezelGeo = new THREE.BoxGeometry(width * 0.92, height * 0.88, depth * 0.5);
        const bezel = new THREE.Mesh(bezelGeo, bezelMat);
        bezel.position.z = depth * 0.3;
        group.add(bezel);
        
        // Glowing screen
        const screenMat = this.getMaterial(screenColor, { 
            roughness: 0.1, 
            emissive: screenColor,
            emissiveIntensity: 0.6
        });
        const screenGeo = new THREE.PlaneGeometry(width * 0.86, height * 0.82);
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.z = depth * 0.52;
        group.add(screen);
        
        // Screen reflection highlight
        const highlightMat = this.getMaterial('#FFFFFF', { 
            transparent: true, 
            opacity: 0.1,
            roughness: 0
        });
        const highlightGeo = new THREE.PlaneGeometry(width * 0.4, height * 0.3);
        const highlight = new THREE.Mesh(highlightGeo, highlightMat);
        highlight.position.set(-width * 0.15, height * 0.2, depth * 0.53);
        highlight.rotation.z = -0.2;
        group.add(highlight);
        
        // Game icon on screen (simple card symbol)
        const iconGeo = new THREE.PlaneGeometry(0.15, 0.2);
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚔️', 32, 32);
        const texture = new THREE.CanvasTexture(canvas);
        const iconMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const icon = new THREE.Mesh(iconGeo, iconMat);
        icon.position.z = depth * 0.54;
        group.add(icon);
        
        // Small point light for glow effect (very subtle)
        const glow = new THREE.PointLight(screenColor, 0.3, 2, 2);
        glow.position.z = depth * 0.6;
        glow.castShadow = false;
        group.add(glow);
        
        // Position for holding in front of penguin
        // The tablet should be held at chest height, tilted slightly
        group.position.set(0, 0.8, 0.6);
        group.rotation.x = -0.3; // Tilt back slightly
        
        return group;
    }
    
    /**
     * Create a match indicator effect (floating cards/emojis)
     * Shown around players who are in an active match
     * @returns {THREE.Group}
     */
    createMatchIndicator() {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'match_indicator';
        
        // Floating card symbols around the player
        const symbols = ['🔥', '💧', '❄️'];
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        
        symbols.forEach((symbol, i) => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 64, 64);
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(symbol, 32, 32);
            
            const texture = new THREE.CanvasTexture(canvas.cloneNode(true).getContext('2d').canvas);
            // Clone context and redraw
            const cloneCanvas = document.createElement('canvas');
            cloneCanvas.width = 64;
            cloneCanvas.height = 64;
            const cloneCtx = cloneCanvas.getContext('2d');
            cloneCtx.font = '48px Arial';
            cloneCtx.textAlign = 'center';
            cloneCtx.textBaseline = 'middle';
            cloneCtx.fillText(symbol, 32, 32);
            const tex = new THREE.CanvasTexture(cloneCanvas);
            
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
            const sprite = new THREE.Sprite(mat);
            
            const angle = (i / symbols.length) * Math.PI * 2;
            sprite.position.set(
                Math.cos(angle) * 1.2,
                2.5 + Math.sin(Date.now() * 0.001 + i) * 0.2,
                Math.sin(angle) * 1.2
            );
            sprite.scale.set(0.4, 0.4, 1);
            
            group.add(sprite);
        });
        
        return group;
    }

    // ==================== CAMPSITE PROPS ====================

    /**
     * Create a campfire with flames and logs
     * @param {boolean} isLit - Whether the fire is burning
     * @returns {{ mesh: THREE.Group, light: THREE.PointLight, particles: THREE.Points }}
     */
    createCampfire(isLit = true) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'campfire';
        
        // Stone ring
        const stoneMat = this.getMaterial(0x555555, { roughness: 0.9 });
        const stoneRingRadius = 1.2;
        const stoneCount = 10;
        
        for (let i = 0; i < stoneCount; i++) {
            const angle = (i / stoneCount) * Math.PI * 2;
            const stoneGeo = new THREE.DodecahedronGeometry(0.25, 0);
            const stone = new THREE.Mesh(stoneGeo, stoneMat);
            stone.position.set(
                Math.cos(angle) * stoneRingRadius,
                0.1,
                Math.sin(angle) * stoneRingRadius
            );
            stone.rotation.set(Math.random(), Math.random(), Math.random());
            stone.scale.set(1 + Math.random() * 0.3, 0.6 + Math.random() * 0.2, 1 + Math.random() * 0.3);
            group.add(stone);
        }
        
        // Logs in center
        const logMat = this.getMaterial(0x4A3728, { roughness: 0.95 });
        const logGeo = new THREE.CylinderGeometry(0.15, 0.18, 1.2, 8);
        
        for (let i = 0; i < 4; i++) {
            const log = new THREE.Mesh(logGeo, logMat);
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            log.position.set(
                Math.cos(angle) * 0.3,
                0.15,
                Math.sin(angle) * 0.3
            );
            log.rotation.z = Math.PI / 2;
            log.rotation.y = angle;
            group.add(log);
        }
        
        // Charred center
        const charGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.1, 12);
        const charMat = this.getMaterial(0x1A1A1A, { roughness: 1 });
        const char = new THREE.Mesh(charGeo, charMat);
        char.position.y = 0.05;
        group.add(char);
        
        let fireLight = null;
        let particles = null;
        
        if (isLit) {
            // Fire glow light
            fireLight = new THREE.PointLight(0xFF6600, 2, 8);
            fireLight.position.y = 1;
            group.add(fireLight);
            
            // Flame sprites (using simple cones)
            const flameMat = new THREE.MeshBasicMaterial({ 
                color: 0xFF4500, 
                transparent: true, 
                opacity: 0.9 
            });
            const flameGeo = new THREE.ConeGeometry(0.3, 1.2, 8);
            
            for (let i = 0; i < 3; i++) {
                const flame = new THREE.Mesh(flameGeo, flameMat.clone());
                flame.material.color.setHex([0xFF4500, 0xFF6600, 0xFFAA00][i]);
                flame.position.set(
                    (Math.random() - 0.5) * 0.4,
                    0.5 + i * 0.15,
                    (Math.random() - 0.5) * 0.4
                );
                flame.scale.set(1 - i * 0.2, 1, 1 - i * 0.2);
                flame.userData.isFlame = true;
                flame.userData.baseY = flame.position.y;
                flame.userData.offset = Math.random() * Math.PI * 2;
                group.add(flame);
            }
            
            // Ember particles
            const particleCount = 30;
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);
            
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 0.8;
                positions[i * 3 + 1] = Math.random() * 2;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
                
                const color = new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3);
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
            
            const particleGeo = new THREE.BufferGeometry();
            particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            
            const particleMat = new THREE.PointsMaterial({
                size: 0.08,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            
            particles = new THREE.Points(particleGeo, particleMat);
            particles.userData.isEmbers = true;
            group.add(particles);
        }
        
        // No collision - players can walk through/near the fire
        // group.userData.collision = { type: 'cylinder', radius: 1.5, height: 1 };
        
        // Interaction zone for warming up
        group.userData.interactionZone = {
            type: 'cylinder',
            radius: 3,
            message: '🔥 Warm yourself by the fire',
            emote: 'Sit'
        };
        
        return { mesh: group, light: fireLight, particles };
    }

    /**
     * Create a log seat for sitting around campfire
     * @param {number} rotation - Rotation in radians (facing direction)
     * @returns {THREE.Group}
     */
    createLogSeat(rotation = 0) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'log_seat';
        
        const logWidth = 2;
        const logRadius = 0.35;
        const seatHeight = 0.5;
        
        // Main log (lying on its side)
        const logMat = this.getMaterial(0x5C4033, { roughness: 0.9 });
        const logGeo = new THREE.CylinderGeometry(logRadius, logRadius + 0.05, logWidth, 12);
        const log = new THREE.Mesh(logGeo, logMat);
        log.rotation.z = Math.PI / 2;
        log.position.y = logRadius;
        log.castShadow = true;
        log.receiveShadow = true;
        group.add(log);
        
        // Bark texture rings
        const barkMat = this.getMaterial(0x3D2817, { roughness: 1 });
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.TorusGeometry(logRadius + 0.02, 0.025, 6, 16);
            const ring = new THREE.Mesh(ringGeo, barkMat);
            ring.rotation.y = Math.PI / 2;
            ring.position.set(-0.7 + i * 0.7, logRadius, 0);
            group.add(ring);
        }
        
        // End caps (tree rings visible)
        const endCapGeo = new THREE.CircleGeometry(logRadius, 12);
        const endCapMat = this.getMaterial(0x8B7355, { roughness: 0.9 });
        const leftCap = new THREE.Mesh(endCapGeo, endCapMat);
        leftCap.rotation.y = Math.PI / 2;
        leftCap.position.set(-logWidth / 2, logRadius, 0);
        group.add(leftCap);
        
        const rightCap = new THREE.Mesh(endCapGeo, endCapMat);
        rightCap.rotation.y = -Math.PI / 2;
        rightCap.position.set(logWidth / 2, logRadius, 0);
        group.add(rightCap);
        
        // Light snow dusting on top
        const snowMat = this.getMaterial(0xFFFFFF, { roughness: 0.8 });
        const snowGeo = new THREE.BoxGeometry(logWidth * 0.8, 0.05, logRadius * 0.8);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = logRadius * 2 + 0.02;
        group.add(snow);
        
        // Apply rotation to entire group
        group.rotation.y = rotation;
        
        // Collision - allows jumping onto the log
        group.userData.collision = {
            type: 'box',
            size: { x: logWidth + 0.4, y: seatHeight, z: logRadius * 2 + 0.4 },
            height: seatHeight
        };
        
        // Interaction zone for sitting - BIDIRECTIONAL (can sit from front or back)
        // Zone covers BOTH sides of the log since it's a log you can sit on either way
        group.userData.interactionZone = {
            type: 'box',
            position: { x: 0, z: 0 },  // Centered on log
            size: { x: logWidth + 1.5, z: logRadius * 2 + 3 },  // Covers both sides
            action: 'sit',
            message: '🪵 Sit on log',
            emote: 'Sit',
            seatHeight: seatHeight,
            benchDepth: logRadius * 2,
            // Two seat positions: left and right side of log
            snapPoints: [
                { x: -0.5, z: 0 },    // Left seat
                { x: 0.5, z: 0 }      // Right seat
            ],
            maxOccupants: 2,
            // LOG SEATS ONLY: Allow sitting from either side (face campfire)
            bidirectionalSit: true
        };
        
        return group;
    }

    // ==================== PARKOUR PROPS ====================

    /**
     * Create a floating platform for parkour courses
     * @param {Object} config - Platform configuration
     * @returns {THREE.Group}
     */
    createParkourPlatform({ width = 3, depth = 3, height = 0.4, color = 0x4A90D9, glowing = false } = {}) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'parkour_platform';

        // Main platform
        const platMat = this.getMaterial(color, { 
            roughness: 0.6,
            metalness: glowing ? 0.3 : 0.1,
            emissive: glowing ? color : 0x000000,
            emissiveIntensity: glowing ? 0.2 : 0
        });
        const platGeo = new THREE.BoxGeometry(width, height, depth);
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.y = height / 2;
        platform.castShadow = true;
        platform.receiveShadow = true;
        group.add(platform);

        // Edge trim
        const trimMat = this.getMaterial(0x333333, { roughness: 0.8 });
        const trimHeight = 0.1;
        
        // Front and back trim
        [-1, 1].forEach(side => {
            const trimGeo = new THREE.BoxGeometry(width + 0.1, trimHeight, 0.15);
            const trim = new THREE.Mesh(trimGeo, trimMat);
            trim.position.set(0, height + trimHeight / 2, side * (depth / 2));
            group.add(trim);
        });
        
        // Left and right trim
        [-1, 1].forEach(side => {
            const trimGeo = new THREE.BoxGeometry(0.15, trimHeight, depth + 0.1);
            const trim = new THREE.Mesh(trimGeo, trimMat);
            trim.position.set(side * (width / 2), height + trimHeight / 2, 0);
            group.add(trim);
        });

        // Store collision data
        group.userData.collision = {
            type: 'box',
            size: { x: width, y: height, z: depth },
            height: height
        };

        return group;
    }

    /**
     * Create a complete parkour obstacle course leading to dojo roof
     * Course goes AROUND the side of the dojo, not through it
     * @param {Object} config - Course configuration
     * @param {boolean} config.mirrored - If true, course goes on LEFT side instead of right (180 degree rotation)
     * @returns {{ mesh: THREE.Group, platforms: Array, colliders: Array }}
     */
    createDojoParkourCourse({ dojoX = 0, dojoZ = -25, dojoWidth = 14, dojoHeight = 8, dojoDepth = 14, mirrored = false } = {}) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'dojo_parkour_course';

        const platforms = [];
        const colliders = [];
        
        // Roof target height
        const roofHeight = dojoHeight + 2;
        
        // Dojo boundaries (to avoid clipping)
        // If mirrored, swap left and right
        const dojoLeft = dojoX - dojoWidth / 2 - 2;
        const dojoRight = dojoX + dojoWidth / 2 + 2;
        // For mirrored mode, the front becomes back (Z axis flip)
        const dojoFront = mirrored ? (dojoZ - dojoDepth / 2 - 2) : (dojoZ + dojoDepth / 2 + 2);
        const dojoBack = mirrored ? (dojoZ + dojoDepth / 2 + 2) : (dojoZ - dojoDepth / 2 - 2);
        
        // Mirror helper - flips X around dojo center
        const mx = (x) => mirrored ? (2 * dojoX - x) : x;
        
        // Platform colors
        const colors = [0x4A90D9, 0x5A9AD9, 0x3A80C9, 0x6AAAE9, 0x4A85C5];
        
        // Course layout - starts at ground level to the RIGHT of dojo, spirals up to first roof
        // All positions are OUTSIDE the dojo building with generous clearance
        // First roof (tier 0) is at h + 1.2 = ~9.2, so we target landing just above that
        const firstRoofY = dojoHeight + 1.2;
        
        const courseLayout = [
            // START: Ground level platform to the right-front of dojo
            { x: mx(dojoRight + 5), y: 0.3, z: dojoFront + (mirrored ? -4 : 4), w: 4, d: 4, type: 'start' },
            
            // Jump 1-2: Rising along right side (OUTSIDE dojo)
            { x: mx(dojoRight + 6), y: 1.5, z: dojoZ + (mirrored ? 2 : -2), w: 3, d: 3 },
            { x: mx(dojoRight + 5), y: 2.8, z: dojoBack + (mirrored ? -2 : 2), w: 3, d: 3 },
            
            // Jump 3-4: Corner turn to behind dojo (stay far back)
            { x: mx(dojoRight + 2), y: 4.0, z: dojoBack + (mirrored ? 4 : -4), w: 3, d: 3 },
            { x: mx(dojoX + 2), y: 5.2, z: dojoBack + (mirrored ? 6 : -6), w: 3, d: 3 },
            
            // Jump 5-6: Across the back of dojo (far behind)
            { x: mx(dojoX - 2), y: 6.4, z: dojoBack + (mirrored ? 5 : -5), w: 3, d: 3 },
            { x: mx(dojoLeft - 2), y: 7.6, z: dojoBack + (mirrored ? 3 : -3), w: 3, d: 3 },
            
            // Jump 7-8: Final approach - up the left side to roof level
            { x: mx(dojoLeft - 4), y: 8.5, z: dojoZ, w: 3, d: 3 },
            
            // END: Landing pad on dojo first roof (centered, snug on tier 0)
            { x: dojoX, y: firstRoofY + 0.5, z: dojoZ, w: 7, d: 7, type: 'end', color: 0xFFD700 },
        ];

        // Create each platform
        courseLayout.forEach((plat, idx) => {
            const color = plat.color || colors[idx % colors.length];
            const isSpecial = plat.type === 'start' || plat.type === 'end';
            const platformHeight = isSpecial ? 0.5 : 0.4;
            
            const platform = this.createParkourPlatform({
                width: plat.w,
                depth: plat.d,
                height: platformHeight,
                color: color,
                glowing: isSpecial
            });
            
            platform.position.set(plat.x, plat.y, plat.z);
            group.add(platform);
            
            platforms.push({
                mesh: platform,
                x: plat.x,
                y: plat.y,
                z: plat.z,
                width: plat.w,
                depth: plat.d,
                height: platformHeight
            });
            
            // Store collider info - y is the TOP of platform where player stands
            colliders.push({
                x: plat.x,
                y: plat.y,
                z: plat.z,
                type: 'box',
                size: { x: plat.w, y: platformHeight, z: plat.d },
                height: platformHeight
            });

            // Platform number painted on surface (subtle)
            if (idx > 0 && idx < courseLayout.length - 1) {
                const numMat = this.getMaterial(0x2A5A8A, { roughness: 0.7 });
                const numGeo = new THREE.RingGeometry(0.15, 0.25, 16);
                const num = new THREE.Mesh(numGeo, numMat);
                num.rotation.x = -Math.PI / 2;
                num.position.set(plat.x, plat.y + platformHeight + 0.01, plat.z);
                group.add(num);
            }
        });

        // Starting sign - "SECRET HANGOUT" with canvas text
        const signGroup = new THREE.Group();
        
        // Post
        const postMat = this.getMaterial(0x5C4033, { roughness: 0.8 });
        const postGeo = new THREE.CylinderGeometry(0.2, 0.25, 3.5, 8);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.y = 1.75;
        post.castShadow = true;
        signGroup.add(post);
        
        // Sign board frame
        const frameMat = this.getMaterial(0x654321, { roughness: 0.7 });
        const frameGeo = new THREE.BoxGeometry(4, 1.8, 0.25);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.y = 3.8;
        frame.castShadow = true;
        signGroup.add(frame);
        
        // Sign face with text texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#F5DEB3';
        ctx.fillRect(0, 0, 512, 200);
        
        // Border
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, 492, 180);
        
        // Text
        ctx.fillStyle = '#2F1810';
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏔️ SECRET SPOT 🏔️', 256, 70);
        
        ctx.font = '28px Arial';
        ctx.fillStyle = '#4A3020';
        ctx.fillText('Parkour to the roof!', 256, 120);
        
        ctx.font = '24px Arial';
        ctx.fillStyle = '#228B22';
        ctx.fillText('⬆️ Jump your way up! ⬆️', 256, 160);
        
        const texture = new THREE.CanvasTexture(canvas);
        const signMat = new THREE.MeshStandardMaterial({ 
            map: texture,
            roughness: 0.5
        });
        const signGeo = new THREE.BoxGeometry(3.6, 1.4, 0.1);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.y = 3.8;
        sign.position.z = 0.18;
        signGroup.add(sign);
        
        // Arrow on top pointing up
        const arrowMat = this.getMaterial(0x228B22, { 
            roughness: 0.5,
            emissive: 0x228B22,
            emissiveIntensity: 0.2
        });
        const arrowGeo = new THREE.ConeGeometry(0.4, 0.8, 4);
        const signArrow = new THREE.Mesh(arrowGeo, arrowMat);
        signArrow.position.set(0, 4.9, 0);
        signGroup.add(signArrow);
        
        const start = courseLayout[0];
        // Mirror sign position - sign should be on the side AWAY from the course direction
        const signOffsetX = mirrored ? -4 : 4;
        signGroup.position.set(start.x + signOffsetX, 0, start.z);
        // Rotate sign to face the course start
        if (mirrored) {
            signGroup.rotation.y = Math.PI;
        }
        group.add(signGroup);

        // The END platform is at firstRoofY + 0.5, with height 0.5 (special platform)
        // So the walking surface is at firstRoofY + 1.0
        const firstRoofYCalc = dojoHeight + 1.2;
        const platformSurface = firstRoofYCalc + 1.0;

        // End marker - golden arch on the landing platform (TIER 1 VIP)
        const archMat = this.getMaterial(0xFFD700, { 
            metalness: 0.8, 
            roughness: 0.2,
            emissive: 0xFFD700,
            emissiveIntensity: 0.4
        });
        const archGeo = new THREE.TorusGeometry(2, 0.2, 8, 16, Math.PI);
        const arch = new THREE.Mesh(archGeo, archMat);
        arch.position.set(dojoX, platformSurface + 2.2, dojoZ - 2.5);
        arch.rotation.x = 0;
        group.add(arch);
        
        // Arch pillars
        const pillarMat = this.getMaterial(0xDAA520, { metalness: 0.6, roughness: 0.3 });
        [-2, 2].forEach(side => {
            const pillarGeo = new THREE.CylinderGeometry(0.15, 0.18, 2.2, 8);
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(dojoX + side, platformSurface + 1.1, dojoZ - 2.5);
            group.add(pillar);
        });

        // Create benches ON the golden landing platform (TIER 1)
        const roofBenches = [];
        
        // Two benches on the platform facing each other
        const benchPositions = [
            { x: dojoX - 2, z: dojoZ + 1, rotation: Math.PI / 2 },   // Left bench
            { x: dojoX + 2, z: dojoZ + 1, rotation: -Math.PI / 2 },  // Right bench
        ];
        
        benchPositions.forEach(pos => {
            const bench = this.createBench(true);
            bench.position.set(pos.x, platformSurface, pos.z);
            bench.rotation.y = pos.rotation;
            group.add(bench);
            
            roofBenches.push({
                mesh: bench,
                x: pos.x,
                y: platformSurface,
                z: pos.z,
                rotation: pos.rotation
            });
            
            // Bench collision for sitting
            colliders.push({
                x: pos.x,
                y: platformSurface,
                z: pos.z,
                type: 'box',
                size: { x: 2.5, y: 0.8, z: 1 },
                height: 0.8,
                rotation: pos.rotation,
                isBench: true
            });
        });

        // ==================== PHASE 2: TIER 1 TO TIER 3 PARKOUR ====================
        // Third roof is at h + 1.2 + 11 = ~20.2
        const thirdRoofY = dojoHeight + 1.2 + 11;
        const phase2Colors = [0xE040FB, 0xAB47BC, 0x7B1FA2, 0x9C27B0, 0xBA68C8]; // Purple theme
        
        // Phase 2 uses SAME mirroring as Phase 1
        // Original: Level 1 ends LEFT, cross roof, Level 2 starts RIGHT
        // Mirrored: Level 1 ends RIGHT, cross roof, Level 2 starts LEFT
        
        // Phase 2 course - HARD MODE - Smaller platforms, longer jumps, tricky angles
        // Blue course ends on one side, player crosses through VIP checkpoint to opposite side for purple
        const phase2Layout = [
            // START: Launch platform OFF the tier 1 roof (opposite side from where Phase 1 ends)
            { x: mx(dojoX + 13), y: platformSurface - 0.8, z: dojoZ, w: 3.0, d: 3.0, type: 'phase2_start', color: 0x9C27B0 },
            
            // Jump 1: Diagonal jump - tests precision
            { x: mx(dojoRight + 5), y: platformSurface + 0.5, z: dojoZ + (mirrored ? 3 : -3), w: 2.0, d: 2.0 },
            
            // Jump 2: Continue along side (further back)
            { x: mx(dojoRight + 4), y: platformSurface + 1.5, z: dojoZ + (mirrored ? 8 : -8), w: 2.0, d: 2.0 },
            
            // Jump 3: Corner turn
            { x: mx(dojoRight + 2), y: platformSurface + 2.8, z: dojoBack + (mirrored ? -2 : 2), w: 1.8, d: 1.8 },
            
            // Jump 4: Behind dojo
            { x: mx(dojoX + 3), y: platformSurface + 3.8, z: dojoBack + (mirrored ? 3 : -3), w: 2.0, d: 2.0 },
            
            // Jump 5: Behind dojo - center, steep climb
            { x: dojoX, y: platformSurface + 4.5, z: dojoBack + (mirrored ? 2 : -2), w: 2.0, d: 2.0 },
            
            // Jump 6: Behind dojo - continuing to other side
            { x: mx(dojoX - 5), y: platformSurface + 4.0, z: dojoBack + (mirrored ? 4 : -4), w: 2.0, d: 2.0 },
            
            // Jump 7: Other side, big height gain
            { x: mx(dojoLeft - 1), y: platformSurface + 5.8, z: dojoBack + (mirrored ? 1 : -1), w: 1.8, d: 1.8 },
            
            // Jump 8: Corner, long diagonal
            { x: mx(dojoLeft - 4), y: platformSurface + 7.2, z: dojoBack + (mirrored ? -4 : 4), w: 2.0, d: 2.0 },
            
            // Jump 9: Precision jump
            { x: mx(dojoLeft - 5), y: platformSurface + 8.5, z: dojoZ + (mirrored ? 3 : -3), w: 1.8, d: 1.8 },
            
            // Jump 10: Final approach - tiny platform
            { x: mx(dojoLeft - 3), y: platformSurface + 9.5, z: dojoZ + (mirrored ? -2 : 2), w: 1.8, d: 1.8 },
            
            // Jump 11: Last leap to glory
            { x: mx(dojoLeft), y: platformSurface + 10.2, z: dojoZ + (mirrored ? -5 : 5), w: 2.0, d: 2.0 },
            
            // END: Ultimate VIP platform on tier 3 roof (smaller)
            { x: dojoX, y: thirdRoofY + 0.5, z: dojoZ, w: 5, d: 5, type: 'phase2_end', color: 0xFFD700 },
        ];
        
        // Create phase 2 platforms
        phase2Layout.forEach((plat, idx) => {
            const color = plat.color || phase2Colors[idx % phase2Colors.length];
            const isSpecial = plat.type === 'phase2_start' || plat.type === 'phase2_end';
            const platformHeight = isSpecial ? 0.5 : 0.35;
            
            const platform = this.createParkourPlatform({
                width: plat.w,
                depth: plat.d,
                height: platformHeight,
                color: color,
                glowing: isSpecial
            });
            
            platform.position.set(plat.x, plat.y, plat.z);
            group.add(platform);
            
            platforms.push({
                mesh: platform,
                x: plat.x,
                y: plat.y,
                z: plat.z,
                width: plat.w,
                depth: plat.d,
                height: platformHeight,
                phase: 2
            });
            
            // Store collider info
            colliders.push({
                x: plat.x,
                y: plat.y,
                z: plat.z,
                type: 'box',
                size: { x: plat.w, y: platformHeight, z: plat.d },
                height: platformHeight
            });

            // Platform number painted on surface (subtle, phase 2)
            if (idx > 0 && idx < phase2Layout.length - 1) {
                const numMat = this.getMaterial(0x6A1B9A, { roughness: 0.7 });
                const numGeo = new THREE.RingGeometry(0.12, 0.2, 16);
                const num = new THREE.Mesh(numGeo, numMat);
                num.rotation.x = -Math.PI / 2;
                num.position.set(plat.x, plat.y + platformHeight + 0.01, plat.z);
                group.add(num);
            }
        });
        
        // Phase 2 sign on tier 1 platform - "MASTER'S SUMMIT"
        const sign2Group = new THREE.Group();
        
        const post2Mat = this.getMaterial(0x4A148C, { roughness: 0.8 });
        const post2Geo = new THREE.CylinderGeometry(0.15, 0.2, 2.5, 8);
        const post2 = new THREE.Mesh(post2Geo, post2Mat);
        post2.position.y = 1.25;
        post2.castShadow = true;
        sign2Group.add(post2);
        
        const frame2Mat = this.getMaterial(0x7B1FA2, { roughness: 0.7 });
        const frame2Geo = new THREE.BoxGeometry(3.5, 1.5, 0.2);
        const frame2 = new THREE.Mesh(frame2Geo, frame2Mat);
        frame2.position.y = 2.8;
        frame2.castShadow = true;
        sign2Group.add(frame2);
        
        // Sign face with canvas text
        const canvas2 = document.createElement('canvas');
        canvas2.width = 512;
        canvas2.height = 200;
        const ctx2 = canvas2.getContext('2d');
        
        ctx2.fillStyle = '#1A0033';
        ctx2.fillRect(0, 0, 512, 200);
        
        ctx2.strokeStyle = '#FFD700';
        ctx2.lineWidth = 6;
        ctx2.strokeRect(8, 8, 496, 184);
        
        ctx2.fillStyle = '#FFD700';
        ctx2.font = 'bold 38px Arial';
        ctx2.textAlign = 'center';
        ctx2.fillText('⭐ MASTER\'S SUMMIT ⭐', 256, 65);
        
        ctx2.font = '26px Arial';
        ctx2.fillStyle = '#E1BEE7';
        ctx2.fillText('Ultimate VIP Zone', 256, 110);
        
        ctx2.font = '22px Arial';
        ctx2.fillStyle = '#CE93D8';
        ctx2.fillText('🔥 For True Ninjas Only 🔥', 256, 155);
        
        const texture2 = new THREE.CanvasTexture(canvas2);
        const sign2Mat = new THREE.MeshStandardMaterial({ 
            map: texture2,
            roughness: 0.4
        });
        const sign2Geo = new THREE.BoxGeometry(3.2, 1.2, 0.08);
        const sign2 = new THREE.Mesh(sign2Geo, sign2Mat);
        sign2.position.y = 2.8;
        sign2.position.z = 0.12;
        sign2Group.add(sign2);
        
        // Purple glowing arrow
        const arrow2Mat = this.getMaterial(0x9C27B0, { 
            roughness: 0.4,
            emissive: 0x9C27B0,
            emissiveIntensity: 0.5
        });
        const arrow2Geo = new THREE.ConeGeometry(0.35, 0.7, 4);
        const signArrow2 = new THREE.Mesh(arrow2Geo, arrow2Mat);
        signArrow2.position.set(0, 3.7, 0);
        sign2Group.add(signArrow2);
        
        // Position sign ON the first purple platform, facing toward the dojo/checkpoint
        // Use same mirroring as phase 2 course (same as phase 1)
        const sign2X = mx(dojoX + 12);
        sign2Group.position.set(sign2X, platformSurface - 0.5, dojoZ + 1);
        // Face toward the dojo center
        sign2Group.rotation.y = mirrored ? Math.PI : 0;
        group.add(sign2Group);
        
        // ==================== TIER 3 ULTIMATE VIP HANGOUT ====================
        const tier3Surface = thirdRoofY + 1.0;
        
        // Diamond arch for tier 3 (more impressive than gold)
        const diamondMat = this.getMaterial(0x00FFFF, { 
            metalness: 0.9, 
            roughness: 0.1,
            emissive: 0x00FFFF,
            emissiveIntensity: 0.6
        });
        const arch3Geo = new THREE.TorusGeometry(1.8, 0.25, 8, 16, Math.PI);
        const arch3 = new THREE.Mesh(arch3Geo, diamondMat);
        arch3.position.set(dojoX, tier3Surface + 2.0, dojoZ - 2);
        group.add(arch3);
        
        // Diamond pillars
        [-1.8, 1.8].forEach(side => {
            const pillar3Geo = new THREE.CylinderGeometry(0.18, 0.22, 2.0, 6);
            const pillar3 = new THREE.Mesh(pillar3Geo, diamondMat);
            pillar3.position.set(dojoX + side, tier3Surface + 1.0, dojoZ - 2);
            group.add(pillar3);
        });
        
        // Tier 3 benches - 4 benches in a circle (cooler hangout)
        const tier3BenchPositions = [
            { x: dojoX - 1.8, z: dojoZ + 1.2, rotation: Math.PI / 2 },
            { x: dojoX + 1.8, z: dojoZ + 1.2, rotation: -Math.PI / 2 },
            { x: dojoX - 1.8, z: dojoZ - 0.5, rotation: Math.PI / 2 },
            { x: dojoX + 1.8, z: dojoZ - 0.5, rotation: -Math.PI / 2 },
        ];
        
        tier3BenchPositions.forEach(pos => {
            const bench3 = this.createBench(true);
            bench3.position.set(pos.x, tier3Surface, pos.z);
            bench3.rotation.y = pos.rotation;
            group.add(bench3);
            
            roofBenches.push({
                mesh: bench3,
                x: pos.x,
                y: tier3Surface,
                z: pos.z,
                rotation: pos.rotation,
                tier: 3
            });
            
            colliders.push({
                x: pos.x,
                y: tier3Surface,
                z: pos.z,
                type: 'box',
                size: { x: 2.5, y: 0.8, z: 1 },
                height: 0.8,
                rotation: pos.rotation,
                isBench: true
            });
        });
        
        // Glowing orbs around tier 3 platform (decorative, emissive only)
        const orbMat = this.getMaterial(0x00FFFF, { 
            emissive: 0x00FFFF, 
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.8
        });
        const orbPositions = [
            { x: dojoX - 2.5, z: dojoZ + 2 },
            { x: dojoX + 2.5, z: dojoZ + 2 },
            { x: dojoX - 2.5, z: dojoZ - 1.5 },
            { x: dojoX + 2.5, z: dojoZ - 1.5 },
        ];
        orbPositions.forEach(pos => {
            const orbGeo = new THREE.SphereGeometry(0.2, 12, 12);
            const orb = new THREE.Mesh(orbGeo, orbMat);
            orb.position.set(pos.x, tier3Surface + 1.2, pos.z);
            group.add(orb);
            
            // Orb pedestal
            const pedestalGeo = new THREE.CylinderGeometry(0.1, 0.15, 1.2, 6);
            const pedestalMat = this.getMaterial(0x333333, { roughness: 0.6 });
            const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
            pedestal.position.set(pos.x, tier3Surface + 0.6, pos.z);
            group.add(pedestal);
        });

        // OPTIMIZED: Decorative lamp posts on tier 1 platform (emissive only, no PointLights)
        const lampMat = this.getMaterial(0x333333, { roughness: 0.7 });
        const lampGlowMat = this.getMaterial(0xFFAA55, { 
            emissive: 0xFFAA55, 
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.9
        });
        [-2.5, 2.5].forEach(side => {
            const lampPostGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.5, 6);
            const lampPost = new THREE.Mesh(lampPostGeo, lampMat);
            lampPost.position.set(dojoX + side, platformSurface + 0.75, dojoZ - 2);
            group.add(lampPost);
            
            // Emissive globe instead of PointLight
            const globeGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const globe = new THREE.Mesh(globeGeo, lampGlowMat);
            globe.position.set(dojoX + side, platformSurface + 1.6, dojoZ - 2);
            group.add(globe);
        });

        return { 
            mesh: group, 
            platforms, 
            colliders,
            roofBenches,
            roofHeight,
            platformSurface,  // Tier 1 walking surface
            tier3Surface      // Tier 3 walking surface
        };
    }

    // ==================== HOLIDAY PROPS ====================

    /**
     * Create a clean Christmas tree with subtle lighting and festive decorations
     * @returns {{ mesh: THREE.Group, lights: THREE.PointLight[], update: Function }}
     */
    createChristmasTree() {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'christmas_tree';

        // Tree dimensions - taller, more elegant proportions
        const trunkHeight = 1.2;
        const trunkRadius = 0.4;
        const treeHeight = 9;
        const tiers = 5;

        // Simple trunk
        const trunkMat = this.getMaterial(0x4A3520, { roughness: 0.9 });
        const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 8);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        group.add(trunk);

        // Clean foliage tiers
        const foliageColors = [0x1B5E20, 0x2E7D32, 0x388E3C, 0x43A047, 0x4CAF50];
        
        let currentY = trunkHeight;
        const tierData = [];
        
        for (let i = 0; i < tiers; i++) {
            const tierScale = 1 - (i / tiers) * 0.75;
            const baseRadius = 2.8 * tierScale;
            const tierHeight = (treeHeight / tiers) * 1.15;
            
            // Main cone
            const mainMat = this.getMaterial(foliageColors[i], { roughness: 0.8 });
            const mainGeo = new THREE.ConeGeometry(baseRadius, tierHeight, 12);
            const mainCone = new THREE.Mesh(mainGeo, mainMat);
            mainCone.position.y = currentY + tierHeight / 2;
            mainCone.castShadow = true;
            mainCone.receiveShadow = true;
            group.add(mainCone);
            
            tierData.push({ y: currentY + tierHeight * 0.4, radius: baseRadius * 0.85 });
            currentY += tierHeight * 0.5;
        }

        // Golden star on top - raised higher and glowing
        const starY = currentY + 1.5;  // Raised higher above the tree top
        
        // Star shape with warm glow
        const starCoreMat = this.getMaterial(0xFFD700, { 
            metalness: 0.9, 
            roughness: 0.1,
            emissive: 0xFFCC00,
            emissiveIntensity: 2.0
        });
        
        const starShape = new THREE.Shape();
        const starPoints = 5;
        const outerRadius = 0.6;  // Slightly larger
        const innerRadius = 0.25;
        
        for (let i = 0; i < starPoints * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i / (starPoints * 2)) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) starShape.moveTo(x, y);
            else starShape.lineTo(x, y);
        }
        starShape.closePath();
        
        const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02 });
        const star = new THREE.Mesh(starGeo, starCoreMat);
        star.position.y = starY;
        star.position.z = -0.07;
        group.add(star);
        
        // Subtle warm glow light from the star
        const starGlow = new THREE.PointLight(0xFFDD88, 0.6, 15);  // Warm yellow, subtle intensity, medium range
        starGlow.position.y = starY;
        starGlow.castShadow = false;
        starGlow.name = 'starGlow';
        group.add(starGlow);

        // Glowing Christmas lights on tree - bright and festive!
        const lightColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFF6600, 0xFF0066];
        const ornamentMeshes = [];
        
        tierData.forEach((tier, tierIdx) => {
            const lightsOnTier = 8;  // More lights per tier
            for (let i = 0; i < lightsOnTier; i++) {
                const angle = (i / lightsOnTier) * Math.PI * 2 + tierIdx * 0.4;
                const ox = Math.cos(angle) * tier.radius * 0.92;
                const oz = Math.sin(angle) * tier.radius * 0.92;
                const oy = tier.y + (Math.random() - 0.5) * 0.5;
                
                const color = lightColors[(tierIdx + i) % lightColors.length];
                
                // Bright glowing bulb with strong emissive
                const bulbMat = this.getMaterial(color, { 
                    metalness: 0.0, 
                    roughness: 0.2,
                    emissive: color,
                    emissiveIntensity: 2.5  // Much brighter glow
                });
                const bulbGeo = new THREE.SphereGeometry(0.14, 8, 8);  // Slightly larger
                const bulb = new THREE.Mesh(bulbGeo, bulbMat);
                bulb.position.set(ox, oy, oz);
                bulb.userData.baseEmissive = 2.5;
                bulb.userData.phaseOffset = Math.random() * Math.PI * 2;
                bulb.userData.speed = 0.5 + Math.random() * 0.8;  // Twinkle speed
                bulb.userData.color = color;
                group.add(bulb);
                ornamentMeshes.push(bulb);
            }
        });

        // Decorative baubles (shiny, no glow)
        const baubleColors = [0xCC0000, 0xFFD700, 0x0055AA, 0x008800];
        tierData.slice(0, 3).forEach((tier, tidx) => {
            for (let i = 0; i < 2; i++) {
                const angle = (i / 2) * Math.PI * 2 + tidx * 1.2;
                const bx = Math.cos(angle) * tier.radius * 0.7;
                const bz = Math.sin(angle) * tier.radius * 0.7;
                
                const baubleMat = this.getMaterial(baubleColors[(tidx + i) % baubleColors.length], {
                    metalness: 0.7,
                    roughness: 0.15
                });
                const baubleGeo = new THREE.SphereGeometry(0.2, 10, 10);
                const bauble = new THREE.Mesh(baubleGeo, baubleMat);
                bauble.position.set(bx, tier.y, bz);
                group.add(bauble);
                
                // Silver cap
                const capMat = this.getMaterial(0xC0C0C0, { metalness: 0.9, roughness: 0.1 });
                const capGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.08, 6);
                const cap = new THREE.Mesh(capGeo, capMat);
                cap.position.set(bx, tier.y + 0.22, bz);
                group.add(cap);
            }
        });

        // Simple presents around base
        const presentColors = [
            { box: 0xCC0000, ribbon: 0xFFD700 },
            { box: 0x0055CC, ribbon: 0xFFFFFF },
            { box: 0x008833, ribbon: 0xCC0000 },
            { box: 0x9933CC, ribbon: 0xFFFFFF },
            { box: 0xFF6600, ribbon: 0x00CC00 },
        ];

        const presentPositions = [
            { x: 1.8, z: 0.6 },
            { x: -1.5, z: 1.0 },
            { x: 0.3, z: 1.8 },
            { x: -1.0, z: -1.3 },
            { x: 1.3, z: -1.0 },
        ];

        presentPositions.forEach((pos, idx) => {
            const colorSet = presentColors[idx % presentColors.length];
            const w = 0.5 + Math.random() * 0.3;
            const h = 0.35 + Math.random() * 0.25;
            const d = 0.5 + Math.random() * 0.3;
            
            // Present box
            const presentMat = this.getMaterial(colorSet.box, { roughness: 0.6 });
            const presentGeo = new THREE.BoxGeometry(w, h, d);
            const present = new THREE.Mesh(presentGeo, presentMat);
            present.position.set(pos.x, h / 2, pos.z);
            present.rotation.y = Math.random() * 0.5;
            present.castShadow = true;
            group.add(present);

            // Ribbon
            const ribbonMat = this.getMaterial(colorSet.ribbon, { roughness: 0.4 });
            const ribbonHGeo = new THREE.BoxGeometry(w + 0.02, 0.05, 0.1);
            const ribbonH = new THREE.Mesh(ribbonHGeo, ribbonMat);
            ribbonH.position.set(pos.x, h + 0.02, pos.z);
            ribbonH.rotation.y = present.rotation.y;
            group.add(ribbonH);

            const ribbonVGeo = new THREE.BoxGeometry(0.1, 0.05, d + 0.02);
            const ribbonV = new THREE.Mesh(ribbonVGeo, ribbonMat);
            ribbonV.position.set(pos.x, h + 0.02, pos.z);
            ribbonV.rotation.y = present.rotation.y;
            group.add(ribbonV);

            // Simple bow
            const bowGeo = new THREE.SphereGeometry(0.08, 6, 6);
            const bow = new THREE.Mesh(bowGeo, ribbonMat);
            bow.position.set(pos.x, h + 0.1, pos.z);
            bow.scale.y = 0.6;
            group.add(bow);
        });

        // Subtle snow around base (no bright white that reflects light)
        const snowMat = this.getMaterial(0xE8E8F0, { roughness: 1.0 });
        const snowGeo = new THREE.CylinderGeometry(3, 3.5, 0.15, 16);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 0.07;
        snow.receiveShadow = true;
        group.add(snow);

        // Twinkle update with glowing Christmas lights and star pulse
        const update = (time, nightFactor = 0.5) => {
            // Christmas light twinkle - bright and festive
            ornamentMeshes.forEach(mesh => {
                const twinkle = Math.sin(time * mesh.userData.speed + mesh.userData.phaseOffset);
                // Brighter at night, always visible during day
                const baseBrightness = 0.6 + nightFactor * 0.4;  // 0.6 day, 1.0 night
                const brightness = baseBrightness + twinkle * 0.3;  // Twinkle range
                if (mesh.material.emissiveIntensity !== undefined) {
                    mesh.material.emissiveIntensity = mesh.userData.baseEmissive * brightness;
                }
            });
            
            // Subtle star glow pulse - gentle breathing effect
            const starPulse = Math.sin(time * 0.5) * 0.15 + 0.85;  // 0.7 to 1.0 range
            const baseIntensity = 0.5 + nightFactor * 0.5;  // 0.5 day, 1.0 night
            starGlow.intensity = baseIntensity * starPulse;
        };

        // Return with star glow light
        return { mesh: group, lights: [starGlow], update, ambientGlow: starGlow };
    }

    // ==================== BUILDINGS ====================

    /**
     * Create The Dojo - Japanese pagoda style martial arts temple
     * @param {Object} config - { w, h, d } building dimensions
     * @returns {THREE.Group}
     */
    createDojo({ w = 14, h = 8, d = 14 } = {}) {
        const THREE = this.THREE;
        const group = new THREE.Group();
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
        // Step 0 = farthest from door (ground level, widest), Step 2 = closest to door (highest, narrowest)
        for (let i = 0; i < 3; i++) {
            // Width decreases as steps get closer to door (go up)
            const stepWidth = 4 - i * 0.4; // i=0: 4 (widest), i=1: 3.6, i=2: 3.2 (narrowest)
            const stepGeo = new THREE.BoxGeometry(stepWidth, 0.28, 0.9);
            const step = new THREE.Mesh(stepGeo, foundationMat);
            // Height increases as we approach door: i=0 is lowest, i=2 is highest
            const stepY = 0.28 + i * 0.28; // i=0: 0.28, i=1: 0.56, i=2: 0.84
            // Z decreases as we approach door: i=0 is farthest, i=2 is closest
            const stepZ = d / 2 + 1.5 + (2 - i) * 0.95; // i=0: farthest, i=2: closest
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

        // Decorative cream panels - offset in front of wall
        const panelMat = this.getMaterial(wallCream, { roughness: 0.6 });
        [
            { x: -w / 3, z: d / 2 + 0.12, rotY: 0 },
            { x: w / 3, z: d / 2 + 0.12, rotY: 0 },
            { x: -w / 3, z: -d / 2 - 0.12, rotY: 0 },
            { x: w / 3, z: -d / 2 - 0.12, rotY: 0 },
        ].forEach(pos => {
            const panelGeo = new THREE.BoxGeometry(1.8, h - 2, 0.15);
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.set(pos.x, h / 2 + 1, pos.z);
            group.add(panel);
        });

        // Red columns at corners - positioned outside wall edges
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

            // Gold cap on top
            const capGeo = new THREE.CylinderGeometry(0.55, 0.45, 0.25, 8);
            const cap = new THREE.Mesh(capGeo, goldMat);
            cap.position.set(px, h + 1.15, pz);
            group.add(cap);

            // Gold base
            const baseGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 8);
            const base = new THREE.Mesh(baseGeo, goldMat);
            base.position.set(px, 1.15, pz);
            group.add(base);
        });

        // Pagoda roof - THREE tiers
        const roofMat = this.getMaterial(roofTile, { roughness: 0.8 });
        const edgeMat = this.getMaterial(roofRed, { roughness: 0.6 });
        
        // Tier heights: 0 = first roof, 1 = second roof, 2 = third roof (top)
        const tierGaps = [0, 5.5, 11];  // Tier 3 at h + 12.2 = ~20.2
        
        for (let tier = 0; tier < 3; tier++) {
            const tierScale = 1 - tier * 0.25;  // Slightly less scaling for 3 tiers
            const tierGap = tierGaps[tier];
            const roofY = h + 1.2 + tierGap;
            const roofWidth = (w + 4) * tierScale;
            const roofDepth = (d + 4) * tierScale;
            
            // Main roof platform
            const platformGeo = new THREE.BoxGeometry(roofWidth, 0.4, roofDepth);
            const platform = new THREE.Mesh(platformGeo, roofMat);
            platform.position.y = roofY;
            platform.castShadow = true;
            group.add(platform);

            // Curved edge trim - positioned at edges (not overlapping platform)
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

            // Upturned corner pieces - positioned at actual corners (tips pointing UP)
            [
                [-roofWidth / 2 - 0.3, roofDepth / 2 + 0.3],
                [roofWidth / 2 + 0.3, roofDepth / 2 + 0.3],
                [-roofWidth / 2 - 0.3, -roofDepth / 2 - 0.3],
                [roofWidth / 2 + 0.3, -roofDepth / 2 - 0.3],
            ].forEach(([cx, cz]) => {
                const upturnGeo = new THREE.ConeGeometry(0.5 * tierScale, 1.2 * tierScale, 4);
                const upturn = new THREE.Mesh(upturnGeo, edgeMat);
                // No rotation - cone tip points UP naturally (traditional upturned roof corner)
                upturn.position.set(cx, roofY + 0.4, cz);
                group.add(upturn);
            });

            // Top tier finial (only on tier 2 - the highest roof)
            if (tier === 2) {
                const ridgeGeo = new THREE.BoxGeometry(roofWidth * 0.7, 0.6, 0.25);
                const ridge = new THREE.Mesh(ridgeGeo, edgeMat);
                ridge.position.y = roofY + 0.5;
                group.add(ridge);

                // Gold finial - larger and more impressive for top tier
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

        // Door frame - in front of wall
        const doorFrameMat = this.getMaterial(woodDark, { roughness: 0.7 });
        const doorFrameGeo = new THREE.BoxGeometry(3.8, 5.2, 0.25);
        const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
        doorFrame.position.set(0, 3.6, d / 2 + 0.13);
        group.add(doorFrame);

        // Paper screen door (shoji) - in front of frame
        const shojiMat = this.getMaterial(0xFFFAF0, { 
            roughness: 0.3,
            transparent: true,
            opacity: 0.85
        });
        const shojiGeo = new THREE.BoxGeometry(3.2, 4.5, 0.08);
        const shoji = new THREE.Mesh(shojiGeo, shojiMat);
        shoji.position.set(0, 3.25, d / 2 + 0.3);
        group.add(shoji);

        // Door grid pattern - in front of shoji
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

        // Stone lanterns at entrance - ON THE GROUND beside the stairs
        const lanternMat = this.getMaterial(0x707070, { roughness: 0.8 });
        [-3.2, 3.2].forEach(lx => {
            // Lantern base - on ground level
            const baseGeo = new THREE.BoxGeometry(0.9, 0.4, 0.9);
            const base = new THREE.Mesh(baseGeo, lanternMat);
            base.position.set(lx, 0.2, d / 2 + 2.5);
            group.add(base);

            // Lantern pillar
            const pillarGeo = new THREE.BoxGeometry(0.5, 1.8, 0.5);
            const pillar = new THREE.Mesh(pillarGeo, lanternMat);
            pillar.position.set(lx, 1.3, d / 2 + 2.5);
            group.add(pillar);

            // Lantern head
            const headGeo = new THREE.BoxGeometry(1, 0.8, 1);
            const head = new THREE.Mesh(headGeo, lanternMat);
            head.position.set(lx, 2.6, d / 2 + 2.5);
            group.add(head);

            // Lantern roof cap
            const capGeo = new THREE.ConeGeometry(0.7, 0.5, 4);
            const cap = new THREE.Mesh(capGeo, lanternMat);
            cap.rotation.y = Math.PI / 4;
            cap.position.set(lx, 3.25, d / 2 + 2.5);
            group.add(cap);

            // Warm light
            const light = new THREE.PointLight(0xFFAA55, 0.4, 6);
            light.position.set(lx, 2.6, d / 2 + 2.5);
            group.add(light);
        });

        // Moon windows - frame first, then glass
        const windowMat = this.getMaterial(0xFFFAF0, {
            emissive: 0xFFE4B5,
            emissiveIntensity: 0.3
        });
        [-w / 3, w / 3].forEach(wx => {
            // Frame ring
            const frameGeo = new THREE.TorusGeometry(1.2, 0.12, 8, 24);
            const frame = new THREE.Mesh(frameGeo, doorFrameMat);
            frame.position.set(wx, h / 2 + 2, d / 2 + 0.12);
            group.add(frame);

            // Glass (slightly behind frame)
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

        // Card Jitsu hexagon symbol - in front of wall
        const symbolGeo = new THREE.CircleGeometry(1.3, 6);
        const symbol = new THREE.Mesh(symbolGeo, goldMat);
        symbol.position.set(0, h - 0.3, d / 2 + 0.12);
        group.add(symbol);

        return group;
    }

    /**
     * Create Gift Shop - Colorful candy-themed store
     * @param {Object} config - { w, h, d } building dimensions
     * @returns {THREE.Group}
     */
    createGiftShop({ w = 10, h = 6, d = 10 } = {}) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'gift_shop_building';

        // Colors
        const wallPink = 0xFFB6C1;
        const wallWhite = 0xFFFAFA;
        const trimGold = 0xFFD700;
        const awningRed = 0xDC143C;
        const awningWhite = 0xFFFFFF;
        const doorGreen = 0x228B22;
        const windowBlue = 0x87CEEB;
        const roofBlue = 0x4A90D9;

        // Foundation
        const foundationMat = this.getMaterial(0x8B4513, { roughness: 0.9 });
        const foundationGeo = new THREE.BoxGeometry(w + 1, 0.5, d + 1);
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.position.y = 0.25;
        foundation.receiveShadow = true;
        group.add(foundation);

        // Main building walls
        const wallMat = this.getMaterial(wallPink, { roughness: 0.6 });
        const mainWallGeo = new THREE.BoxGeometry(w, h, d);
        const mainWall = new THREE.Mesh(mainWallGeo, wallMat);
        mainWall.position.y = h / 2 + 0.5;
        mainWall.castShadow = true;
        mainWall.receiveShadow = true;
        group.add(mainWall);

        // White corner trim - positioned at corners
        const trimMat = this.getMaterial(wallWhite, { roughness: 0.5 });
        [
            [-w / 2 - 0.2, d / 2 + 0.2],
            [w / 2 + 0.2, d / 2 + 0.2],
            [-w / 2 - 0.2, -d / 2 - 0.2],
            [w / 2 + 0.2, -d / 2 - 0.2],
        ].forEach(([cx, cz]) => {
            const cornerGeo = new THREE.BoxGeometry(0.4, h + 0.1, 0.4);
            const corner = new THREE.Mesh(cornerGeo, trimMat);
            corner.position.set(cx, h / 2 + 0.5, cz);
            group.add(corner);
        });

        // Peaked roof using two angled box panels
        const roofMat = this.getMaterial(roofBlue, { roughness: 0.7 });
        const roofOverhang = 1;
        const roofHeight = 2.5;
        const roofSlope = Math.atan2(roofHeight, w / 2);  // Angle of roof slope
        const roofPanelLength = Math.sqrt((w / 2 + roofOverhang) ** 2 + roofHeight ** 2);
        
        // Left roof panel
        const leftRoofGeo = new THREE.BoxGeometry(roofPanelLength, 0.25, d + roofOverhang * 2);
        const leftRoof = new THREE.Mesh(leftRoofGeo, roofMat);
        leftRoof.rotation.z = roofSlope;
        leftRoof.position.set(-w / 4 - 0.3, h + 0.5 + roofHeight / 2, 0);
        leftRoof.castShadow = true;
        group.add(leftRoof);
        
        // Right roof panel
        const rightRoofGeo = new THREE.BoxGeometry(roofPanelLength, 0.25, d + roofOverhang * 2);
        const rightRoof = new THREE.Mesh(rightRoofGeo, roofMat);
        rightRoof.rotation.z = -roofSlope;
        rightRoof.position.set(w / 4 + 0.3, h + 0.5 + roofHeight / 2, 0);
        rightRoof.castShadow = true;
        group.add(rightRoof);

        // Roof ridge cap at peak
        const ridgeGeo = new THREE.BoxGeometry(0.4, 0.3, d + roofOverhang * 2 + 0.2);
        const ridge = new THREE.Mesh(ridgeGeo, roofMat);
        ridge.position.set(0, h + 0.5 + roofHeight + 0.1, 0);
        group.add(ridge);

        // Snow on roof ridge
        const snowMat = this.getMaterial(0xFFFFFF, { roughness: 0.8 });
        const ridgeSnowGeo = new THREE.BoxGeometry(0.6, 0.2, d + roofOverhang * 2 + 0.4);
        const ridgeSnow = new THREE.Mesh(ridgeSnowGeo, snowMat);
        ridgeSnow.position.set(0, h + 0.5 + roofHeight + 0.3, 0);
        group.add(ridgeSnow);

        // Front gable triangle (fills the gap at front)
        const gableMat = this.getMaterial(wallPink, { roughness: 0.6 });
        const gableShape = new THREE.Shape();
        gableShape.moveTo(-w / 2, 0);
        gableShape.lineTo(0, roofHeight);
        gableShape.lineTo(w / 2, 0);
        gableShape.lineTo(-w / 2, 0);
        const gableGeo = new THREE.ShapeGeometry(gableShape);
        
        // Front gable
        const frontGable = new THREE.Mesh(gableGeo, gableMat);
        frontGable.position.set(0, h + 0.5, d / 2 + 0.01);
        group.add(frontGable);
        
        // Back gable
        const backGable = new THREE.Mesh(gableGeo, gableMat);
        backGable.rotation.y = Math.PI;
        backGable.position.set(0, h + 0.5, -d / 2 - 0.01);
        group.add(backGable);

        // Chimney
        const chimneyMat = this.getMaterial(0x8B4513, { roughness: 0.8 });
        const chimneyGeo = new THREE.BoxGeometry(1.2, 2.5, 1.2);
        const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
        chimney.position.set(w / 4, h + roofHeight + 0.5, -d / 4);
        chimney.castShadow = true;
        group.add(chimney);

        // Chimney snow cap
        const chimneySnowGeo = new THREE.BoxGeometry(1.5, 0.3, 1.5);
        const chimneySnow = new THREE.Mesh(chimneySnowGeo, snowMat);
        chimneySnow.position.set(w / 4, h + roofHeight + 1.9, -d / 4);
        group.add(chimneySnow);

        // Striped awning
        const awningWidth = 5;
        const awningDepth = 2.5;
        const awningMat = this.getMaterial(awningRed, { roughness: 0.5 });
        const awningGeo = new THREE.BoxGeometry(awningWidth, 0.12, awningDepth);
        const awning = new THREE.Mesh(awningGeo, awningMat);
        
        // White stripes on awning
        for (let i = 0; i < 4; i++) {
            const stripeMat = this.getMaterial(awningWhite, { roughness: 0.5 });
            const stripeGeo = new THREE.BoxGeometry(awningWidth / 8 - 0.05, 0.02, awningDepth + 0.01);
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.position.set(-awningWidth / 2 + awningWidth / 8 + i * awningWidth / 4, 0.08, 0);
            awning.add(stripe);
        }
        
        awning.rotation.x = Math.PI / 10;
        awning.position.set(0, h - 0.3, d / 2 + 1.8);
        group.add(awning);

        // Display window
        const displayMat = this.getMaterial(windowBlue, {
            transparent: true,
            opacity: 0.7,
            emissive: 0xFFE4B5,
            emissiveIntensity: 0.2
        });
        
        // Window frame
        const frameMat = this.getMaterial(wallWhite, { roughness: 0.5 });
        const frameGeo = new THREE.BoxGeometry(3.8, 2.8, 0.12);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(-w / 4, 2.5, d / 2 + 0.07);
        group.add(frame);
        
        // Window glass
        const displayGeo = new THREE.BoxGeometry(3.4, 2.4, 0.04);
        const display = new THREE.Mesh(displayGeo, displayMat);
        display.position.set(-w / 4, 2.5, d / 2 + 0.16);
        group.add(display);

        // Window dividers
        const dividerMat = this.getMaterial(wallWhite, { roughness: 0.5 });
        const vDivGeo = new THREE.BoxGeometry(0.08, 2.4, 0.05);
        const vDiv = new THREE.Mesh(vDivGeo, dividerMat);
        vDiv.position.set(-w / 4, 2.5, d / 2 + 0.2);
        group.add(vDiv);

        const hDivGeo = new THREE.BoxGeometry(3.4, 0.08, 0.05);
        const hDiv = new THREE.Mesh(hDivGeo, dividerMat);
        hDiv.position.set(-w / 4, 2.5, d / 2 + 0.2);
        group.add(hDiv);

        // Door frame
        const doorFrameMat = this.getMaterial(0x5C4033, { roughness: 0.7 });
        const doorFrameGeo = new THREE.BoxGeometry(2.6, 4.4, 0.1);
        const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
        doorFrame.position.set(w / 4, 2.7, d / 2 + 0.06);
        group.add(doorFrame);

        // Door
        const doorMat = this.getMaterial(doorGreen, { roughness: 0.6 });
        const doorGeo = new THREE.BoxGeometry(2.2, 4, 0.08);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(w / 4, 2.5, d / 2 + 0.14);
        group.add(door);

        // Door window
        const doorWindowGeo = new THREE.BoxGeometry(1, 1.5, 0.04);
        const doorWindow = new THREE.Mesh(doorWindowGeo, displayMat);
        doorWindow.position.set(w / 4, 3.5, d / 2 + 0.2);
        group.add(doorWindow);

        // Door handle
        const handleMat = this.getMaterial(trimGold, { metalness: 0.8, roughness: 0.2 });
        const handleGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(w / 4 + 0.7, 2.5, d / 2 + 0.25);
        group.add(handle);

        // Sign board
        const signBackMat = this.getMaterial(0x5C4033, { roughness: 0.7 });
        const signBackGeo = new THREE.BoxGeometry(4.2, 1.2, 0.12);
        const signBack = new THREE.Mesh(signBackGeo, signBackMat);
        signBack.position.set(0, h + 0.2, d / 2 + 0.35);
        group.add(signBack);

        const signMat = this.getMaterial(trimGold, { metalness: 0.7, roughness: 0.3 });
        const signGeo = new THREE.BoxGeometry(4, 1, 0.06);
        const signBoard = new THREE.Mesh(signGeo, signMat);
        signBoard.position.set(0, h + 0.2, d / 2 + 0.45);
        group.add(signBoard);

        // Side windows
        [-d / 3, d / 3].forEach(wz => {
            const sideFrameGeo = new THREE.BoxGeometry(0.1, 2, 1.4);
            const sideFrame = new THREE.Mesh(sideFrameGeo, frameMat);
            sideFrame.position.set(w / 2 + 0.06, 3, wz);
            group.add(sideFrame);
            
            const sideWindowGeo = new THREE.BoxGeometry(0.04, 1.7, 1.1);
            const sideWindow = new THREE.Mesh(sideWindowGeo, displayMat);
            sideWindow.position.set(w / 2 + 0.12, 3, wz);
            group.add(sideWindow);
        });

        // Gift boxes at entrance
        const giftColors = [0xFF69B4, 0x00CED1, 0xFFD700, 0x9370DB];
        giftColors.forEach((color, i) => {
            const giftMat = this.getMaterial(color, { roughness: 0.5 });
            const giftGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            const gift = new THREE.Mesh(giftGeo, giftMat);
            
            const gx = -1.5 + i * 1;
            const gz = d / 2 + 3;
            gift.position.set(gx, 0.75, gz);
            gift.rotation.y = i * 0.5;
            group.add(gift);

            // Ribbon cross on top
            const ribbonMat = this.getMaterial(0xFFFFFF, { roughness: 0.4 });
            const ribbonGeo = new THREE.BoxGeometry(0.55, 0.06, 0.06);
            const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
            ribbon.position.set(gx, 1.03, gz);
            group.add(ribbon);
            
            const ribbon2Geo = new THREE.BoxGeometry(0.06, 0.06, 0.55);
            const ribbon2 = new THREE.Mesh(ribbon2Geo, ribbonMat);
            ribbon2.position.set(gx, 1.03, gz);
            group.add(ribbon2);
        });

        // Interior light
        const interiorLight = new THREE.PointLight(0xFFF8DC, 0.8, 12);
        interiorLight.position.set(0, h / 2, 0);
        group.add(interiorLight);

        // Collision data - includes roof as landing surface
        group.userData.collision = {
            type: 'box',
            size: { x: w + 1, y: h + roofHeight + 1, z: d + 1 },
            height: h + roofHeight,
            // Roof landing surfaces for parkour/exploration
            landingSurfaces: [
                // Left roof panel (sloped - simplified as flat at mid-height)
                { type: 'box', minX: -w/2 - roofOverhang, maxX: 0, minZ: -d/2 - roofOverhang, maxZ: d/2 + roofOverhang, height: h + 0.5 + roofHeight * 0.6 },
                // Right roof panel (sloped - simplified as flat at mid-height)
                { type: 'box', minX: 0, maxX: w/2 + roofOverhang, minZ: -d/2 - roofOverhang, maxZ: d/2 + roofOverhang, height: h + 0.5 + roofHeight * 0.6 },
                // Ridge at peak
                { type: 'box', minX: -0.5, maxX: 0.5, minZ: -d/2 - roofOverhang, maxZ: d/2 + roofOverhang, height: h + 0.5 + roofHeight }
            ]
        };

        return group;
    }

    /**
     * Create Pizza Parlor - Italian restaurant style
     * @param {Object} config - { w, h, d } building dimensions
     * @returns {THREE.Group}
     */
    createPizzaParlor({ w = 12, h = 7, d = 10 } = {}) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'pizza_parlor_building';

        // Colors
        const brickRed = 0x8B4513;
        const brickDark = 0x6B3000;
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

        // Foundation cap trim - on top of foundation (not overlapping)
        const trimMat = this.getMaterial(0x505050, { roughness: 0.8 });
        const trimGeo = new THREE.BoxGeometry(w + 1.6, 0.15, d + 1.6);
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.y = 0.58;
        group.add(trim);

        // Main building walls - starts above trim
        const wallMat = this.getMaterial(creamStucco, { roughness: 0.7 });
        const mainWallGeo = new THREE.BoxGeometry(w, h - 1.2, d);
        const mainWall = new THREE.Mesh(mainWallGeo, wallMat);
        mainWall.position.y = (h - 1.2) / 2 + 1.9;
        mainWall.castShadow = true;
        mainWall.receiveShadow = true;
        group.add(mainWall);

        // Brick base section - separate from main wall
        const brickMat = this.getMaterial(brickRed, { roughness: 0.9 });
        const brickBaseGeo = new THREE.BoxGeometry(w + 0.1, 1.2, d + 0.1);
        const brickBase = new THREE.Mesh(brickBaseGeo, brickMat);
        brickBase.position.y = 1.25;
        group.add(brickBase);

        // Brick crown at top - above main wall
        const brickCrownGeo = new THREE.BoxGeometry(w + 0.1, 0.6, d + 0.1);
        const brickCrown = new THREE.Mesh(brickCrownGeo, brickMat);
        brickCrown.position.y = h + 0.65;
        group.add(brickCrown);

        // Decorative brick columns at front corners - outside wall
        [
            [-w / 2 - 0.45, d / 2 + 0.45],
            [w / 2 + 0.45, d / 2 + 0.45],
        ].forEach(([cx, cz]) => {
            const columnGeo = new THREE.BoxGeometry(0.7, h, 0.7);
            const column = new THREE.Mesh(columnGeo, brickMat);
            column.position.set(cx, h / 2 + 0.65, cz);
            column.castShadow = true;
            group.add(column);

            // Column cap
            const capGeo = new THREE.BoxGeometry(0.9, 0.3, 0.9);
            const cap = new THREE.Mesh(capGeo, trimMat);
            cap.position.set(cx, h + 1.15, cz);
            group.add(cap);
        });

        // Italian flag awning - single solid piece with painted stripes
        const awningWidth = w - 2;
        const awningMat = this.getMaterial(awningWhite, { roughness: 0.5 });
        const awningGeo = new THREE.BoxGeometry(awningWidth, 0.12, 2.5);
        const awning = new THREE.Mesh(awningGeo, awningMat);
        
        // Green stripe on left
        const greenMat = this.getMaterial(awningGreen, { roughness: 0.5 });
        const greenGeo = new THREE.BoxGeometry(awningWidth / 3 - 0.05, 0.02, 2.5);
        const greenStripe = new THREE.Mesh(greenGeo, greenMat);
        greenStripe.position.set(-awningWidth / 3, 0.07, 0);
        awning.add(greenStripe);
        
        // Red stripe on right
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

        // Bay window - wood frame structure
        const bayMat = this.getMaterial(woodBrown, { roughness: 0.7 });
        const bayFrameGeo = new THREE.BoxGeometry(3.8, 2.8, 1.3);
        const bayFrame = new THREE.Mesh(bayFrameGeo, bayMat);
        bayFrame.position.set(-w / 4 - 0.3, 3, d / 2 + 0.8);
        group.add(bayFrame);

        // Bay window glass - front (in front of frame)
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

        // Bay window sides
        [-1, 1].forEach(side => {
            const sideGlassGeo = new THREE.BoxGeometry(0.06, 2.4, 0.9);
            const sideGlass = new THREE.Mesh(sideGlassGeo, glassMat);
            sideGlass.position.set(-w / 4 - 0.3 + side * 1.9, 3, d / 2 + 1);
            group.add(sideGlass);
        });

        // Door frame - in front of wall
        const doorFrameMat = this.getMaterial(0x3D2817, { roughness: 0.7 });
        const doorFrameGeo = new THREE.BoxGeometry(2.8, 4.8, 0.15);
        const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
        doorFrame.position.set(w / 4, 3.1, d / 2 + 0.08);
        group.add(doorFrame);

        // Door - in front of frame
        const doorMat = this.getMaterial(woodBrown, { roughness: 0.6 });
        const doorGeo = new THREE.BoxGeometry(2.4, 4.4, 0.1);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(w / 4, 3, d / 2 + 0.18);
        group.add(door);

        // Door panels - in front of door
        const panelMat = this.getMaterial(0x2F1A0A, { roughness: 0.7 });
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
                const panelGeo = new THREE.BoxGeometry(0.85, 1.4, 0.03);
                const panel = new THREE.Mesh(panelGeo, panelMat);
                panel.position.set(
                    w / 4 - 0.45 + col * 0.95,
                    1.5 + row * 2.3,
                    d / 2 + 0.26
                );
                group.add(panel);
            }
        }

        // Door window - in front of door
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

        // Pizza sign - mounting board first
        const signBackMat = this.getMaterial(0x5C4033, { roughness: 0.7 });
        const signBackGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.12, 16);
        const signBack = new THREE.Mesh(signBackGeo, signBackMat);
        signBack.rotation.x = Math.PI / 2;
        signBack.position.set(0, h + 2.2, d / 2 + 0.35);
        group.add(signBack);

        // Pizza sign face - gold background
        const signMat = this.getMaterial(0xFFD700, { metalness: 0.6, roughness: 0.3 });
        const signGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.08, 16);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.rotation.x = Math.PI / 2;
        sign.position.set(0, h + 2.2, d / 2 + 0.45);
        group.add(sign);

        // Pizza illustration - orange/cheese
        const pizzaMat = this.getMaterial(0xFFA500, { roughness: 0.5 });
        const pizzaGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.04, 16);
        const pizza = new THREE.Mesh(pizzaGeo, pizzaMat);
        pizza.rotation.x = Math.PI / 2;
        pizza.position.set(0, h + 2.2, d / 2 + 0.52);
        group.add(pizza);

        // Pepperoni on pizza sign - positioned in front
        const pepMat = this.getMaterial(0x8B0000, { roughness: 0.6 });
        [
            [-0.4, 0.3], [0.4, 0.2], [0, -0.4], [-0.3, -0.1], [0.35, -0.25]
        ].forEach(([px, py]) => {
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

        // Flower boxes on side wall
        const boxMat = this.getMaterial(0x704020, { roughness: 0.8 });
        [-d / 3, d / 3].forEach(bz => {
            const boxGeo = new THREE.BoxGeometry(0.7, 0.35, 1);
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.set(-w / 2 - 0.4, 2.2, bz);
            group.add(box);

            // Flowers - spaced apart
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

        // String lights - spaced apart above door
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

    // ==================== NIGHTCLUB ====================
    
    /**
     * Create an EPIC nightclub exterior with animated speakers, neon lights, disco ball,
     * searchlights, smoke effects, and all the bells and whistles!
     * @param {Object} config - { width, depth, height }
     * @returns {{ mesh: THREE.Group, speakers: Array, update: Function }}
     */
    createNightclub(config = {}) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'nightclub';
        
        const w = config.width || 25;
        const d = config.depth || 20;
        const h = config.height || 12;
        
        // Neon colors - ENHANCED palette
        const neonPink = 0xFF1493;
        const neonHotPink = 0xFF69B4;
        const neonBlue = 0x00BFFF;
        const neonCyan = 0x00FFFF;
        const neonPurple = 0x9400D3;
        const neonViolet = 0x8B00FF;
        const neonGreen = 0x39FF14;
        const neonLime = 0x00FF00;
        const neonYellow = 0xFFFF00;
        const neonOrange = 0xFF6600;
        const neonRed = 0xFF0040;
        const neonWhite = 0xFFFFFF;
        
        // ==================== MAIN BUILDING ====================
        // Dark concrete/industrial base
        const buildingMat = this.getMaterial(0x1a1a2e, { roughness: 0.9 });
        const buildingGeo = new THREE.BoxGeometry(w, h, d);
        const building = new THREE.Mesh(buildingGeo, buildingMat);
        building.position.y = h / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);
        
        // Darker trim/accent bands
        const trimMat = this.getMaterial(0x0f0f1a, { roughness: 0.85 });
        
        // Bottom trim
        const bottomTrimGeo = new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4);
        const bottomTrim = new THREE.Mesh(bottomTrimGeo, trimMat);
        bottomTrim.position.y = 0.25;
        group.add(bottomTrim);
        
        // Top trim/parapet
        const topTrimGeo = new THREE.BoxGeometry(w + 0.4, 1, d + 0.4);
        const topTrim = new THREE.Mesh(topTrimGeo, trimMat);
        topTrim.position.y = h + 0.5;
        group.add(topTrim);
        
        // ==================== ENTRANCE ====================
        // Large entrance cutout visual (dark recessed area)
        const entranceMat = this.getMaterial(0x050510, { roughness: 0.95 });
        const entranceGeo = new THREE.BoxGeometry(6, 5, 1);
        const entrance = new THREE.Mesh(entranceGeo, entranceMat);
        entrance.position.set(0, 2.5, d / 2 + 0.1);
        group.add(entrance);
        
        // Entrance frame - neon pink
        const frameGlowMat = this.getMaterial(neonPink, {
            emissive: neonPink,
            emissiveIntensity: 0.8,
            roughness: 0.3
        });
        
        // Frame pieces
        const frameThickness = 0.3;
        // Left frame
        const leftFrameGeo = new THREE.BoxGeometry(frameThickness, 5.5, frameThickness);
        const leftFrame = new THREE.Mesh(leftFrameGeo, frameGlowMat);
        leftFrame.position.set(-3.2, 2.75, d / 2 + 0.3);
        group.add(leftFrame);
        
        // Right frame
        const rightFrame = leftFrame.clone();
        rightFrame.position.set(3.2, 2.75, d / 2 + 0.3);
        group.add(rightFrame);
        
        // Top frame
        const topFrameGeo = new THREE.BoxGeometry(6.7, frameThickness, frameThickness);
        const topFrame = new THREE.Mesh(topFrameGeo, frameGlowMat);
        topFrame.position.set(0, 5.2, d / 2 + 0.3);
        group.add(topFrame);
        
        // Entrance point light
        const entranceLight = new THREE.PointLight(neonPink, 2, 15);
        entranceLight.position.set(0, 3, d / 2 + 2);
        group.add(entranceLight);
        
        // ==================== HUGE NIGHTCLUB SIGN ====================
        // Sign backing board
        const signBackMat = this.getMaterial(0x0a0a15, { roughness: 0.9 });
        const signBackGeo = new THREE.BoxGeometry(18, 4, 0.5);
        const signBack = new THREE.Mesh(signBackGeo, signBackMat);
        signBack.position.set(0, h + 3, d / 2 - 2);
        group.add(signBack);
        
        // NIGHTCLUB letters - 3D block letters with neon glow
        const letterMat = this.getMaterial(neonBlue, {
            emissive: neonBlue,
            emissiveIntensity: 1.0,
            roughness: 0.2,
            metalness: 0.3
        });
        
        // Create "NIGHTCLUB" text as 3D boxes
        const letters = 'NIGHTCLUB';
        const letterWidth = 1.5;
        const letterHeight = 2.5;
        const letterDepth = 0.4;
        const letterSpacing = 1.7;
        const startX = -((letters.length - 1) * letterSpacing) / 2;
        
        for (let i = 0; i < letters.length; i++) {
            // Each letter is a stylized block
            const letterGeo = new THREE.BoxGeometry(letterWidth, letterHeight, letterDepth);
            const letter = new THREE.Mesh(letterGeo, letterMat);
            letter.position.set(startX + i * letterSpacing, h + 3, d / 2 - 1.5);
            letter.userData.isNeonLetter = true;
            letter.userData.letterIndex = i;
            group.add(letter);
            
            // Add decorative notch to give letter shape variation
            if (i % 3 === 0) {
                const notchGeo = new THREE.BoxGeometry(0.3, 0.8, letterDepth + 0.1);
                const notchMat = this.getMaterial(0x0a0a15, { roughness: 0.9 });
                const notch = new THREE.Mesh(notchGeo, notchMat);
                notch.position.set(startX + i * letterSpacing, h + 2.5, d / 2 - 1.5);
                group.add(notch);
            }
        }
        
        // Sign glow light
        const signLight = new THREE.PointLight(neonBlue, 3, 25);
        signLight.position.set(0, h + 3, d / 2 + 2);
        group.add(signLight);
        
        // ==================== HUGE SPEAKERS (4 total - 2 on each side) ====================
        const speakers = [];
        
        // Speaker creation function
        const createSpeaker = (x, z, scale = 1, rotation = 0) => {
            const speakerGroup = new THREE.Group();
            
            const sw = 4 * scale;
            const sh = 6 * scale;
            const sd = 3 * scale;
            
            // Speaker cabinet - dark wood/black
            const cabinetMat = this.getMaterial(0x1a1a1a, { roughness: 0.7 });
            const cabinetGeo = new THREE.BoxGeometry(sw, sh, sd);
            const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat);
            cabinet.position.y = sh / 2;
            cabinet.castShadow = true;
            speakerGroup.add(cabinet);
            
            // Speaker frame/grille
            const grilleMat = this.getMaterial(0x2a2a2a, { 
                roughness: 0.5,
                metalness: 0.3
            });
            const grilleGeo = new THREE.BoxGeometry(sw - 0.3, sh - 0.3, 0.15);
            const grille = new THREE.Mesh(grilleGeo, grilleMat);
            grille.position.set(0, sh / 2, sd / 2 + 0.1);
            speakerGroup.add(grille);
            
            // Main woofer (large cone)
            const wooferMat = this.getMaterial(0x333333, { roughness: 0.4, metalness: 0.2 });
            const wooferGeo = new THREE.CylinderGeometry(sw * 0.35, sw * 0.4, 0.5 * scale, 24);
            const woofer = new THREE.Mesh(wooferGeo, wooferMat);
            woofer.rotation.x = Math.PI / 2;
            woofer.position.set(0, sh * 0.35, sd / 2 + 0.3);
            woofer.userData.isWoofer = true;
            woofer.userData.baseZ = sd / 2 + 0.3;
            speakerGroup.add(woofer);
            
            // Woofer cone center
            const coneMat = this.getMaterial(0x444444, { roughness: 0.3, metalness: 0.4 });
            const coneGeo = new THREE.CylinderGeometry(sw * 0.08, sw * 0.25, 0.4 * scale, 16);
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.rotation.x = Math.PI / 2;
            cone.position.set(0, sh * 0.35, sd / 2 + 0.5);
            cone.userData.isWoofer = true;
            cone.userData.baseZ = sd / 2 + 0.5;
            speakerGroup.add(cone);
            
            // Woofer dust cap
            const dustCapMat = this.getMaterial(0x222222, { roughness: 0.2 });
            const dustCapGeo = new THREE.SphereGeometry(sw * 0.06, 12, 12);
            const dustCap = new THREE.Mesh(dustCapGeo, dustCapMat);
            dustCap.scale.z = 0.3;
            dustCap.position.set(0, sh * 0.35, sd / 2 + 0.65);
            dustCap.userData.isWoofer = true;
            dustCap.userData.baseZ = sd / 2 + 0.65;
            speakerGroup.add(dustCap);
            
            // Mid-range driver
            const midGeo = new THREE.CylinderGeometry(sw * 0.15, sw * 0.18, 0.3 * scale, 16);
            const mid = new THREE.Mesh(midGeo, wooferMat);
            mid.rotation.x = Math.PI / 2;
            mid.position.set(0, sh * 0.65, sd / 2 + 0.25);
            mid.userData.isWoofer = true;
            mid.userData.baseZ = sd / 2 + 0.25;
            speakerGroup.add(mid);
            
            // Tweeter (small dome)
            const tweeterMat = this.getMaterial(0x666666, { roughness: 0.2, metalness: 0.6 });
            const tweeterGeo = new THREE.SphereGeometry(sw * 0.08, 12, 12);
            const tweeter = new THREE.Mesh(tweeterGeo, tweeterMat);
            tweeter.scale.z = 0.5;
            tweeter.position.set(0, sh * 0.82, sd / 2 + 0.2);
            speakerGroup.add(tweeter);
            
            // Speaker LED strip (bass reactive)
            const ledMat = this.getMaterial(neonPurple, {
                emissive: neonPurple,
                emissiveIntensity: 0.8
            });
            const ledGeo = new THREE.BoxGeometry(sw - 0.1, 0.15, 0.1);
            const ledTop = new THREE.Mesh(ledGeo, ledMat);
            ledTop.position.set(0, sh - 0.2, sd / 2 + 0.2);
            ledTop.userData.isLED = true;
            speakerGroup.add(ledTop);
            
            const ledBottom = ledTop.clone();
            ledBottom.position.set(0, 0.2, sd / 2 + 0.2);
            ledBottom.userData.isLED = true;
            speakerGroup.add(ledBottom);
            
            speakerGroup.position.set(x, 0, z);
            speakerGroup.rotation.y = rotation;
            
            return speakerGroup;
        };
        
        // Create 4 huge speakers - 2 on each side of the entrance
        // Front left speakers (facing south/forward)
        const speaker1 = createSpeaker(-w / 2 - 3, d / 2 - 5, 1.5, Math.PI * 0.1);
        speakers.push(speaker1);
        group.add(speaker1);
        
        const speaker2 = createSpeaker(-w / 2 - 1.5, d / 2 + 3, 1.2, Math.PI * 0.3);
        speakers.push(speaker2);
        group.add(speaker2);
        
        // Front right speakers
        const speaker3 = createSpeaker(w / 2 + 3, d / 2 - 5, 1.5, -Math.PI * 0.1);
        speakers.push(speaker3);
        group.add(speaker3);
        
        const speaker4 = createSpeaker(w / 2 + 1.5, d / 2 + 3, 1.2, -Math.PI * 0.3);
        speakers.push(speaker4);
        group.add(speaker4);
        
        // ==================== NEON ACCENT LIGHTS ====================
        // Horizontal neon strips on building
        const createNeonStrip = (y, color, width = w + 1) => {
            const stripMat = this.getMaterial(color, {
                emissive: color,
                emissiveIntensity: 0.9,
                roughness: 0.2
            });
            const stripGeo = new THREE.BoxGeometry(width, 0.15, 0.15);
            const strip = new THREE.Mesh(stripGeo, stripMat);
            strip.position.set(0, y, d / 2 + 0.2);
            strip.userData.isNeonStrip = true;
            strip.userData.baseColor = color;
            return strip;
        };
        
        // Multiple neon strips at different heights
        const strip1 = createNeonStrip(1, neonPink);
        group.add(strip1);
        
        const strip2 = createNeonStrip(h * 0.5, neonBlue);
        group.add(strip2);
        
        const strip3 = createNeonStrip(h - 1, neonPurple);
        group.add(strip3);
        
        // Side neon accents
        const sideStripMat = this.getMaterial(neonGreen, {
            emissive: neonGreen,
            emissiveIntensity: 0.7
        });
        
        [-1, 1].forEach(side => {
            const sideStripGeo = new THREE.BoxGeometry(0.15, h - 2, 0.15);
            const sideStrip = new THREE.Mesh(sideStripGeo, sideStripMat);
            sideStrip.position.set(side * (w / 2 + 0.2), h / 2, d / 2 + 0.2);
            group.add(sideStrip);
        });
        
        // ==================== ROOF SPEAKERS (smaller, on top) ====================
        const roofSpeaker1 = createSpeaker(-w / 3, 0, 0.8, 0);
        roofSpeaker1.position.y = h + 1;
        speakers.push(roofSpeaker1);
        group.add(roofSpeaker1);
        
        const roofSpeaker2 = createSpeaker(w / 3, 0, 0.8, 0);
        roofSpeaker2.position.y = h + 1;
        speakers.push(roofSpeaker2);
        group.add(roofSpeaker2);
        
        // ==================== STAGE LIGHTS ON ROOF ====================
        const stageLightColors = [neonPink, neonBlue, neonGreen, neonYellow, neonOrange, neonPurple];
        
        for (let i = 0; i < 8; i++) {
            const lightColor = stageLightColors[i % stageLightColors.length];
            const lightMat = this.getMaterial(lightColor, {
                emissive: lightColor,
                emissiveIntensity: 1.0
            });
            
            // Light housing
            const housingGeo = new THREE.CylinderGeometry(0.3, 0.5, 0.8, 8);
            const housing = new THREE.Mesh(housingGeo, this.getMaterial(0x222222, { metalness: 0.5 }));
            housing.position.set(-w / 2 + 1.5 + i * (w / 7), h + 1.3, d / 2 - 1);
            housing.rotation.x = Math.PI / 6; // Angle down
            group.add(housing);
            
            // Light lens
            const lensGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 8);
            const lens = new THREE.Mesh(lensGeo, lightMat);
            lens.position.set(-w / 2 + 1.5 + i * (w / 7), h + 1.1, d / 2 - 0.5);
            lens.rotation.x = Math.PI / 6;
            lens.userData.isStageLight = true;
            lens.userData.lightIndex = i;
            group.add(lens);
        }
        
        // ==================== DANCE FLOOR PREVIEW WINDOW ====================
        // Large window showing dance floor colors inside
        const windowGlowMat = this.getMaterial(0x220033, {
            transparent: true,
            opacity: 0.7,
            emissive: neonPurple,
            emissiveIntensity: 0.4
        });
        const windowGeo = new THREE.BoxGeometry(8, 3, 0.1);
        const window1 = new THREE.Mesh(windowGeo, windowGlowMat);
        window1.position.set(-w / 4 - 1, h / 2 + 2, d / 2 + 0.2);
        group.add(window1);
        
        const window2 = window1.clone();
        window2.position.set(w / 4 + 1, h / 2 + 2, d / 2 + 0.2);
        group.add(window2);
        
        // Window frames
        const windowFrameMat = this.getMaterial(0x333333, { metalness: 0.4 });
        [-w / 4 - 1, w / 4 + 1].forEach(wx => {
            // Frame
            const frameGeo = new THREE.BoxGeometry(8.4, 3.4, 0.15);
            const edges = new THREE.EdgesGeometry(frameGeo);
            const frameMat = new THREE.LineBasicMaterial({ color: neonBlue });
            const frame = new THREE.LineSegments(edges, frameMat);
            frame.position.set(wx, h / 2 + 2, d / 2 + 0.15);
            group.add(frame);
        });
        
        // ==================== VELVET ROPE ENTRANCE ====================
        const ropeMat = this.getMaterial(0x8B0000, { roughness: 0.6 }); // Velvet red
        const postMat = this.getMaterial(0xFFD700, { metalness: 0.8, roughness: 0.2 }); // Gold
        
        // Posts
        [-4, 4].forEach(px => {
            const postGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 12);
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(px, 0.75, d / 2 + 4);
            group.add(post);
            
            // Post top ball
            const ballGeo = new THREE.SphereGeometry(0.22, 12, 12);
            const ball = new THREE.Mesh(ballGeo, postMat);
            ball.position.set(px, 1.6, d / 2 + 4);
            group.add(ball);
        });
        
        // Rope (catenary curve)
        const ropePoints = [];
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const x = -4 + t * 8;
            const sag = 0.3 * (1 - Math.pow(2 * t - 1, 2));
            ropePoints.push(new THREE.Vector3(x, 1.4 - sag, d / 2 + 4));
        }
        const ropeCurve = new THREE.CatmullRomCurve3(ropePoints);
        const ropeGeo = new THREE.TubeGeometry(ropeCurve, 20, 0.08, 8, false);
        const rope = new THREE.Mesh(ropeGeo, ropeMat);
        group.add(rope);
        
        // ==================== GROUND LIGHTS ====================
        // Uplighting the building - MORE DRAMATIC
        const groundLightPositions = [
            { x: -w / 2 - 1, z: d / 2 + 2, color: neonPink },
            { x: w / 2 + 1, z: d / 2 + 2, color: neonBlue },
            { x: -w / 4, z: d / 2 + 3, color: neonPurple },
            { x: w / 4, z: d / 2 + 3, color: neonGreen },
            { x: 0, z: d / 2 + 5, color: neonCyan },
            { x: -w / 2 + 2, z: d / 2 + 1, color: neonViolet },
            { x: w / 2 - 2, z: d / 2 + 1, color: neonOrange },
        ];
        
        const groundLights = [];
        groundLightPositions.forEach(({ x, z, color }, idx) => {
            const light = new THREE.SpotLight(color, 3, 25, Math.PI / 5, 0.5);
            light.position.set(x, 0.5, z);
            light.target.position.set(x, h + 5, z - 8);
            light.userData.isGroundLight = true;
            light.userData.lightIndex = idx;
            light.userData.baseColor = color;
            groundLights.push(light);
            group.add(light);
            group.add(light.target);
            
            // Ground light fixture
            const fixtureMat = this.getMaterial(0x222222, { metalness: 0.5 });
            const fixtureGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.3, 8);
            const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
            fixture.position.set(x, 0.15, z);
            group.add(fixture);
            
            // Lens glow
            const lensMat = this.getMaterial(color, { emissive: color, emissiveIntensity: 1 });
            const lensGeo = new THREE.CircleGeometry(0.25, 12);
            const lens = new THREE.Mesh(lensGeo, lensMat);
            lens.rotation.x = -Math.PI / 2;
            lens.position.set(x, 0.31, z);
            lens.userData.isGroundLens = true;
            lens.userData.lightIndex = idx;
            group.add(lens);
        });
        
        // ==================== MASSIVE DISCO BALL ====================
        const discoBallGroup = new THREE.Group();
        discoBallGroup.userData.isDiscoBall = true;
        
        // Main sphere
        const ballRadius = 2;
        const ballGeo = new THREE.SphereGeometry(ballRadius, 32, 32);
        const ballMat = this.getMaterial(0xCCCCCC, { 
            metalness: 0.9, 
            roughness: 0.1 
        });
        const discoBall = new THREE.Mesh(ballGeo, ballMat);
        discoBallGroup.add(discoBall);
        
        // Mirror tiles on disco ball
        const mirrorMat = this.getMaterial(0xFFFFFF, {
            metalness: 1,
            roughness: 0,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.3
        });
        
        const tileRows = 12;
        const tileCols = 24;
        for (let row = 1; row < tileRows - 1; row++) {
            const phi = (row / tileRows) * Math.PI;
            const rowRadius = Math.sin(phi) * ballRadius;
            const y = Math.cos(phi) * ballRadius;
            const tilesInRow = Math.floor(tileCols * Math.sin(phi));
            
            for (let col = 0; col < tilesInRow; col++) {
                const theta = (col / tilesInRow) * Math.PI * 2;
                const tileGeo = new THREE.PlaneGeometry(0.25, 0.25);
                const tile = new THREE.Mesh(tileGeo, mirrorMat);
                
                tile.position.set(
                    rowRadius * Math.cos(theta),
                    y,
                    rowRadius * Math.sin(theta)
                );
                tile.lookAt(0, 0, 0);
                tile.rotateY(Math.PI);
                tile.userData.isMirrorTile = true;
                discoBallGroup.add(tile);
            }
        }
        
        // Disco ball mounting
        const mountGeo = new THREE.CylinderGeometry(0.15, 0.15, 3, 8);
        const mountMat = this.getMaterial(0x333333, { metalness: 0.6 });
        const mount = new THREE.Mesh(mountGeo, mountMat);
        mount.position.y = ballRadius + 1.5;
        discoBallGroup.add(mount);
        
        // Disco ball light (projects colored light)
        const discoLight = new THREE.PointLight(0xFFFFFF, 2, 30);
        discoLight.position.set(0, 0, 0);
        discoBallGroup.add(discoLight);
        
        discoBallGroup.position.set(0, h + 6, d / 2 - 5);
        group.add(discoBallGroup);
        
        // ==================== SEARCHLIGHTS / SKY BEAMS ====================
        const searchlights = [];
        const searchlightColors = [neonPink, neonBlue, neonGreen, neonPurple];
        
        for (let i = 0; i < 4; i++) {
            const searchlightGroup = new THREE.Group();
            const color = searchlightColors[i];
            
            // Searchlight base
            const baseMat = this.getMaterial(0x222222, { metalness: 0.5 });
            const baseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.8, 12);
            const base = new THREE.Mesh(baseGeo, baseMat);
            searchlightGroup.add(base);
            
            // Searchlight housing
            const housingGeo = new THREE.CylinderGeometry(0.3, 0.5, 1.2, 12);
            const housing = new THREE.Mesh(housingGeo, baseMat);
            housing.position.y = 0.8;
            housing.rotation.x = -Math.PI / 4;
            searchlightGroup.add(housing);
            
            // Light beam (visible cone)
            const beamMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide
            });
            const beamGeo = new THREE.ConeGeometry(8, 40, 16, 1, true);
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.y = 21;
            beam.rotation.x = Math.PI;
            beam.userData.isSearchBeam = true;
            beam.userData.beamIndex = i;
            searchlightGroup.add(beam);
            
            // Actual spotlight
            const spotlight = new THREE.SpotLight(color, 3, 60, Math.PI / 12, 0.3);
            spotlight.position.y = 1;
            searchlightGroup.add(spotlight);
            searchlightGroup.add(spotlight.target);
            spotlight.target.position.y = 50;
            
            // Position searchlights on roof corners
            const positions = [
                { x: -w / 2 + 2, z: -d / 2 + 2 },
                { x: w / 2 - 2, z: -d / 2 + 2 },
                { x: -w / 2 + 2, z: d / 2 - 2 },
                { x: w / 2 - 2, z: d / 2 - 2 },
            ];
            searchlightGroup.position.set(positions[i].x, h + 1, positions[i].z);
            searchlightGroup.userData.isSearchlight = true;
            searchlightGroup.userData.searchIndex = i;
            searchlights.push(searchlightGroup);
            group.add(searchlightGroup);
        }
        
        // ==================== LASER BEAMS ====================
        const laserColors = [neonRed, neonGreen, neonBlue, neonPink];
        const lasers = [];
        
        for (let i = 0; i < 6; i++) {
            const laserMat = new THREE.MeshBasicMaterial({
                color: laserColors[i % laserColors.length],
                transparent: true,
                opacity: 0.6
            });
            const laserGeo = new THREE.CylinderGeometry(0.03, 0.03, 30, 4);
            const laser = new THREE.Mesh(laserGeo, laserMat);
            laser.userData.isLaser = true;
            laser.userData.laserIndex = i;
            laser.position.set(
                -w / 3 + (i % 3) * (w / 3),
                h + 3,
                d / 2 - 3
            );
            lasers.push(laser);
            group.add(laser);
        }
        
        // ==================== SMOKE/FOG PARTICLES ====================
        const smokeParticles = [];
        const smokeCount = 50;
        const smokeMat = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 1.5,
            transparent: true,
            opacity: 0.3,
            sizeAttenuation: true
        });
        
        const smokeGeo = new THREE.BufferGeometry();
        const smokePositions = new Float32Array(smokeCount * 3);
        const smokeVelocities = [];
        
        for (let i = 0; i < smokeCount; i++) {
            smokePositions[i * 3] = (Math.random() - 0.5) * 6;
            smokePositions[i * 3 + 1] = Math.random() * 3;
            smokePositions[i * 3 + 2] = d / 2 + 2 + Math.random() * 3;
            smokeVelocities.push({
                x: (Math.random() - 0.5) * 0.02,
                y: 0.02 + Math.random() * 0.03,
                z: (Math.random() - 0.5) * 0.01
            });
        }
        smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
        const smoke = new THREE.Points(smokeGeo, smokeMat);
        smoke.userData.isSmoke = true;
        smoke.userData.velocities = smokeVelocities;
        group.add(smoke);
        
        // ==================== MUSIC NOTE PARTICLES ====================
        const noteMat = this.getMaterial(neonCyan, {
            emissive: neonCyan,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.8
        });
        
        const musicNotes = [];
        for (let i = 0; i < 8; i++) {
            const noteGroup = new THREE.Group();
            
            // Note head (oval)
            const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
            const head = new THREE.Mesh(headGeo, noteMat);
            head.scale.set(1, 0.7, 0.3);
            head.rotation.z = -Math.PI / 6;
            noteGroup.add(head);
            
            // Note stem
            const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 4);
            const stem = new THREE.Mesh(stemGeo, noteMat);
            stem.position.set(0.15, 0.3, 0);
            noteGroup.add(stem);
            
            // Note flag
            const flagGeo = new THREE.BoxGeometry(0.02, 0.25, 0.1);
            const flag = new THREE.Mesh(flagGeo, noteMat);
            flag.position.set(0.2, 0.5, 0);
            flag.rotation.z = Math.PI / 4;
            noteGroup.add(flag);
            
            noteGroup.position.set(
                (Math.random() - 0.5) * w,
                h + Math.random() * 5,
                d / 2 + Math.random() * 3
            );
            noteGroup.userData.isMusicNote = true;
            noteGroup.userData.noteIndex = i;
            noteGroup.userData.baseY = noteGroup.position.y;
            noteGroup.userData.floatSpeed = 0.5 + Math.random() * 0.5;
            noteGroup.userData.swaySpeed = 1 + Math.random();
            musicNotes.push(noteGroup);
            group.add(noteGroup);
        }
        
        // ==================== BOUNCER SILHOUETTES ====================
        const bouncerMat = this.getMaterial(0x111111, { roughness: 0.9 });
        
        [-5, 5].forEach((x, idx) => {
            const bouncerGroup = new THREE.Group();
            
            // Body
            const bodyGeo = new THREE.CylinderGeometry(0.5, 0.6, 2, 8);
            const body = new THREE.Mesh(bodyGeo, bouncerMat);
            body.position.y = 1.2;
            bouncerGroup.add(body);
            
            // Head
            const headGeo = new THREE.SphereGeometry(0.35, 8, 8);
            const head = new THREE.Mesh(headGeo, bouncerMat);
            head.position.y = 2.5;
            bouncerGroup.add(head);
            
            // Arms (crossed)
            const armGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.9, 6);
            const arm1 = new THREE.Mesh(armGeo, bouncerMat);
            arm1.rotation.z = Math.PI / 3;
            arm1.position.set(0.3, 1.5, 0.3);
            bouncerGroup.add(arm1);
            
            const arm2 = new THREE.Mesh(armGeo, bouncerMat);
            arm2.rotation.z = -Math.PI / 3;
            arm2.position.set(-0.3, 1.5, 0.3);
            bouncerGroup.add(arm2);
            
            // Sunglasses (even at night, they're bouncers)
            const glassesMat = this.getMaterial(0x000000, { roughness: 0.1, metalness: 0.8 });
            const glassGeo = new THREE.BoxGeometry(0.5, 0.12, 0.05);
            const glasses = new THREE.Mesh(glassGeo, glassesMat);
            glasses.position.set(0, 2.55, 0.35);
            bouncerGroup.add(glasses);
            
            bouncerGroup.position.set(x, 0, d / 2 + 4.5);
            bouncerGroup.rotation.y = x > 0 ? -Math.PI / 8 : Math.PI / 8;
            group.add(bouncerGroup);
        });
        
        // ==================== ANIMATED "OPEN" SIGN ====================
        const openSignGroup = new THREE.Group();
        
        // Sign backing
        const openBackMat = this.getMaterial(0x111111, { roughness: 0.8 });
        const openBackGeo = new THREE.BoxGeometry(3, 1.2, 0.2);
        const openBack = new THREE.Mesh(openBackGeo, openBackMat);
        openSignGroup.add(openBack);
        
        // OPEN letters
        const openLetterMat = this.getMaterial(neonRed, {
            emissive: neonRed,
            emissiveIntensity: 1.0
        });
        
        const openLetters = ['O', 'P', 'E', 'N'];
        openLetters.forEach((letter, i) => {
            const letterGeo = new THREE.BoxGeometry(0.5, 0.8, 0.15);
            const letterMesh = new THREE.Mesh(letterGeo, openLetterMat);
            letterMesh.position.set(-1.1 + i * 0.7, 0, 0.15);
            letterMesh.userData.isOpenLetter = true;
            letterMesh.userData.letterIdx = i;
            openSignGroup.add(letterMesh);
        });
        
        // Border glow
        const borderMat = this.getMaterial(neonRed, {
            emissive: neonRed,
            emissiveIntensity: 0.8
        });
        
        // Top/bottom borders
        const hBorderGeo = new THREE.BoxGeometry(3.2, 0.1, 0.25);
        const topBorder = new THREE.Mesh(hBorderGeo, borderMat);
        topBorder.position.set(0, 0.65, 0.05);
        openSignGroup.add(topBorder);
        
        const bottomBorder = topBorder.clone();
        bottomBorder.position.y = -0.65;
        openSignGroup.add(bottomBorder);
        
        // Side borders
        const vBorderGeo = new THREE.BoxGeometry(0.1, 1.4, 0.25);
        const leftBorder = new THREE.Mesh(vBorderGeo, borderMat);
        leftBorder.position.set(-1.6, 0, 0.05);
        openSignGroup.add(leftBorder);
        
        const rightBorder = leftBorder.clone();
        rightBorder.position.x = 1.6;
        openSignGroup.add(rightBorder);
        
        openSignGroup.position.set(w / 2 + 0.5, 3, d / 2 + 0.5);
        openSignGroup.rotation.y = -Math.PI / 6;
        openSignGroup.userData.isOpenSign = true;
        group.add(openSignGroup);
        
        // ==================== STAR BURST AROUND SIGN ====================
        const starBurstColors = [neonPink, neonBlue, neonYellow, neonGreen];
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 11;
            const color = starBurstColors[i % starBurstColors.length];
            
            const starMat = this.getMaterial(color, {
                emissive: color,
                emissiveIntensity: 1.0
            });
            
            // Star point
            const starGeo = new THREE.ConeGeometry(0.15, 0.8, 4);
            const star = new THREE.Mesh(starGeo, starMat);
            star.position.set(
                Math.cos(angle) * radius,
                h + 3,
                d / 2 - 1.5 + Math.sin(angle) * 2
            );
            star.rotation.z = -angle - Math.PI / 2;
            star.userData.isStarBurst = true;
            star.userData.starIndex = i;
            group.add(star);
        }
        
        // Store references for animation
        group.userData.speakers = speakers;
        group.userData.discoBall = discoBallGroup;
        group.userData.searchlights = searchlights;
        group.userData.lasers = lasers;
        group.userData.smoke = smoke;
        group.userData.musicNotes = musicNotes;
        group.userData.groundLights = groundLights;
        
        // EPIC Animation update function
        const update = (time) => {
            // Animate speaker woofers - bass "bounce" (MORE INTENSE)
            const bassIntensity = Math.sin(time * 15) * 0.5 + 0.5;
            const bassOffset = bassIntensity * 0.25; // Bigger bounce!
            
            speakers.forEach((speaker, idx) => {
                speaker.traverse(child => {
                    if (child.userData.isWoofer) {
                        child.position.z = child.userData.baseZ + bassOffset * (0.8 + idx * 0.15);
                    }
                    if (child.userData.isLED) {
                        child.material.emissiveIntensity = 0.4 + bassIntensity * 1.0;
                    }
                });
                // Subtle speaker shake
                speaker.rotation.z = Math.sin(time * 20 + idx) * 0.01 * bassIntensity;
            });
            
            // Disco ball rotation
            if (discoBallGroup) {
                discoBallGroup.rotation.y = time * 0.5;
                // Pulse the disco light with bass
                const discoL = discoBallGroup.children.find(c => c.isLight);
                if (discoL) {
                    discoL.intensity = 1.5 + bassIntensity * 1.5;
                    // Color shift
                    const hue = (time * 0.1) % 1;
                    discoL.color.setHSL(hue, 1, 0.5);
                }
            }
            
            // Searchlight sweep
            searchlights.forEach((sl, idx) => {
                const sweepAngle = time * 0.5 + idx * Math.PI / 2;
                sl.rotation.y = Math.sin(sweepAngle) * Math.PI / 3;
                sl.rotation.x = Math.sin(time * 0.3 + idx) * 0.2;
            });
            
            // Laser animation
            lasers.forEach((laser, idx) => {
                const laserAngle = time * 2 + idx * Math.PI / 3;
                laser.rotation.x = Math.sin(laserAngle) * Math.PI / 4;
                laser.rotation.z = Math.cos(laserAngle * 0.7) * Math.PI / 6;
                laser.material.opacity = 0.3 + bassIntensity * 0.5;
            });
            
            // Smoke particles
            if (smoke && smoke.geometry) {
                const positions = smoke.geometry.attributes.position.array;
                const velocities = smoke.userData.velocities;
                
                for (let i = 0; i < smokeCount; i++) {
                    positions[i * 3] += velocities[i].x;
                    positions[i * 3 + 1] += velocities[i].y;
                    positions[i * 3 + 2] += velocities[i].z;
                    
                    // Reset when too high
                    if (positions[i * 3 + 1] > 8) {
                        positions[i * 3] = (Math.random() - 0.5) * 6;
                        positions[i * 3 + 1] = 0;
                        positions[i * 3 + 2] = d / 2 + 2 + Math.random() * 2;
                    }
                }
                smoke.geometry.attributes.position.needsUpdate = true;
                smoke.material.opacity = 0.2 + bassIntensity * 0.15;
            }
            
            // Music notes float and sway
            musicNotes.forEach((note, idx) => {
                note.position.y = note.userData.baseY + Math.sin(time * note.userData.floatSpeed + idx) * 1.5;
                note.position.x += Math.sin(time * note.userData.swaySpeed + idx * 2) * 0.01;
                note.rotation.z = Math.sin(time + idx) * 0.3;
                
                // Reset if too high
                if (note.position.y > h + 12) {
                    note.position.y = h;
                    note.userData.baseY = h;
                    note.position.x = (Math.random() - 0.5) * w;
                }
            });
            
            // Ground lights pulse with bass
            groundLights.forEach((light, idx) => {
                const phase = time * 3 + idx * 0.5;
                light.intensity = 2 + bassIntensity * 3 + Math.sin(phase) * 0.5;
            });
            
            // Neon letters wave animation
            group.traverse(child => {
                if (child.userData.isNeonLetter) {
                    const letterPhase = time * 3 + child.userData.letterIndex * 0.5;
                    child.material.emissiveIntensity = 0.6 + Math.sin(letterPhase) * 0.4;
                    child.position.y = (h + 3) + Math.sin(letterPhase * 2) * 0.1;
                }
                if (child.userData.isStageLight) {
                    const lightPhase = time * 5 + child.userData.lightIndex * 0.8;
                    child.material.emissiveIntensity = 0.5 + Math.sin(lightPhase) * 0.5;
                }
                if (child.userData.isOpenLetter) {
                    // Blink effect for OPEN sign
                    const blinkPhase = Math.floor(time * 4 + child.userData.letterIdx * 0.3) % 2;
                    child.material.emissiveIntensity = blinkPhase ? 1.0 : 0.3;
                }
                if (child.userData.isStarBurst) {
                    // Twinkle stars
                    const twinkle = Math.sin(time * 8 + child.userData.starIndex * 0.8);
                    child.material.emissiveIntensity = 0.5 + twinkle * 0.5;
                    child.scale.setScalar(0.8 + twinkle * 0.3);
                }
                if (child.userData.isGroundLens) {
                    child.material.emissiveIntensity = 0.5 + bassIntensity * 0.8;
                }
            });
        };
        
        // Speaker collision data for external registration
        // Positions are relative to nightclub center
        const speakerColliders = [
            // Front left speakers
            { x: -w / 2 - 3, z: d / 2 - 5, size: { x: 6, z: 5 }, height: 9 },
            { x: -w / 2 - 1.5, z: d / 2 + 3, size: { x: 5, z: 4 }, height: 7 },
            // Front right speakers
            { x: w / 2 + 3, z: d / 2 - 5, size: { x: 6, z: 5 }, height: 9 },
            { x: w / 2 + 1.5, z: d / 2 + 3, size: { x: 5, z: 4 }, height: 7 },
            // Roof speakers (smaller)
            { x: -w / 3, z: 0, size: { x: 3.5, z: 2.5 }, height: 5, y: h + 1 },
            { x: w / 3, z: 0, size: { x: 3.5, z: 2.5 }, height: 5, y: h + 1 },
        ];
        
        return { mesh: group, speakers, update, speakerColliders };
    }

    // ==================== HIGHWAY BILLBOARD ====================
    
    /**
     * Create a tall highway-style billboard with lit-up advertisement
     * @param {string} imagePath - Path to the advertisement image
     * @param {Object} config - { width, height, poleHeight }
     * @returns {{ mesh: THREE.Group }}
     */
    createBillboard(imagePath = '/advert.png', config = {}) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'billboard';
        
        const boardWidth = config.width || 12;  // 600px at 50px per unit
        const boardHeight = config.height || 4; // 200px at 50px per unit  
        const poleHeight = config.poleHeight || 15;
        const frameDepth = 0.5;
        
        // Colors
        const metalGray = 0x4a4a4a;
        const steelDark = 0x2a2a2a;
        
        // ==================== SUPPORT POLES ====================
        const poleMat = this.getMaterial(metalGray, { metalness: 0.6, roughness: 0.4 });
        
        // Two main support poles
        const poleRadius = 0.4;
        const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius * 1.2, poleHeight, 12);
        
        const pole1 = new THREE.Mesh(poleGeo, poleMat);
        pole1.position.set(-boardWidth / 3, poleHeight / 2, 0);
        pole1.castShadow = true;
        group.add(pole1);
        
        const pole2 = new THREE.Mesh(poleGeo, poleMat);
        pole2.position.set(boardWidth / 3, poleHeight / 2, 0);
        pole2.castShadow = true;
        group.add(pole2);
        
        // Cross bracing
        const braceMat = this.getMaterial(steelDark, { metalness: 0.5, roughness: 0.5 });
        const braceGeo = new THREE.CylinderGeometry(0.1, 0.1, boardWidth * 0.8, 8);
        
        const brace1 = new THREE.Mesh(braceGeo, braceMat);
        brace1.rotation.z = Math.PI / 2;
        brace1.position.set(0, poleHeight * 0.3, 0);
        group.add(brace1);
        
        const brace2 = new THREE.Mesh(braceGeo, braceMat);
        brace2.rotation.z = Math.PI / 2;
        brace2.position.set(0, poleHeight * 0.7, 0);
        group.add(brace2);
        
        // Diagonal braces
        const diagLength = Math.sqrt(Math.pow(boardWidth / 3, 2) + Math.pow(poleHeight * 0.4, 2));
        const diagGeo = new THREE.CylinderGeometry(0.08, 0.08, diagLength, 6);
        
        const diagAngle = Math.atan2(poleHeight * 0.4, boardWidth / 3);
        
        const diag1 = new THREE.Mesh(diagGeo, braceMat);
        diag1.rotation.z = diagAngle;
        diag1.position.set(-boardWidth / 6, poleHeight * 0.5, 0);
        group.add(diag1);
        
        const diag2 = new THREE.Mesh(diagGeo, braceMat);
        diag2.rotation.z = -diagAngle;
        diag2.position.set(boardWidth / 6, poleHeight * 0.5, 0);
        group.add(diag2);
        
        // ==================== BILLBOARD FRAME ====================
        const frameMat = this.getMaterial(steelDark, { metalness: 0.4, roughness: 0.6 });
        
        // Main backing
        const backingGeo = new THREE.BoxGeometry(boardWidth + 1, boardHeight + 1, frameDepth);
        const backing = new THREE.Mesh(backingGeo, frameMat);
        backing.position.set(0, poleHeight + boardHeight / 2, frameDepth / 2);
        backing.castShadow = true;
        group.add(backing);
        
        // ==================== ADVERTISEMENT DISPLAY ====================
        // Create texture from image
        const textureLoader = new THREE.TextureLoader();
        const advertTexture = textureLoader.load(imagePath);
        advertTexture.colorSpace = THREE.SRGBColorSpace;
        
        // Emissive material for lit-up effect
        const advertMat = new THREE.MeshStandardMaterial({
            map: advertTexture,
            emissive: 0xffffff,
            emissiveMap: advertTexture,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.1
        });
        
        const advertGeo = new THREE.PlaneGeometry(boardWidth, boardHeight);
        const advert = new THREE.Mesh(advertGeo, advertMat);
        advert.position.set(0, poleHeight + boardHeight / 2, frameDepth + 0.05);
        group.add(advert);
        
        // ==================== LIGHTING ====================
        // Top-mounted lights pointing down at the sign
        const lightHousingMat = this.getMaterial(metalGray, { metalness: 0.5 });
        const lightCount = 4;
        
        for (let i = 0; i < lightCount; i++) {
            const lx = -boardWidth / 2 + boardWidth / (lightCount - 1) * i;
            
            // Light housing
            const housingGeo = new THREE.BoxGeometry(1.5, 0.4, 0.8);
            const housing = new THREE.Mesh(housingGeo, lightHousingMat);
            housing.position.set(lx, poleHeight + boardHeight + 0.8, frameDepth + 0.8);
            group.add(housing);
            
            // Light arm
            const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6);
            const arm = new THREE.Mesh(armGeo, lightHousingMat);
            arm.rotation.x = Math.PI / 3;
            arm.position.set(lx, poleHeight + boardHeight + 0.5, frameDepth + 0.4);
            group.add(arm);
            
            // Actual light (warm white)
            const light = new THREE.SpotLight(0xFFF5E6, 1.5, 15, Math.PI / 4, 0.5);
            light.position.set(lx, poleHeight + boardHeight + 1, frameDepth + 1.2);
            light.target.position.set(lx, poleHeight + boardHeight / 2, frameDepth + 0.1);
            group.add(light);
            group.add(light.target);
        }
        
        // Glow effect behind sign at night
        const glowLight = new THREE.PointLight(0xFFFFFF, 0.8, 20);
        glowLight.position.set(0, poleHeight + boardHeight / 2, -1);
        group.add(glowLight);
        
        // ==================== DECORATIVE ELEMENTS ====================
        // Corner accent lights (small LEDs)
        const accentColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00];
        const corners = [
            { x: -boardWidth / 2 - 0.3, y: poleHeight + boardHeight + 0.3 },
            { x: boardWidth / 2 + 0.3, y: poleHeight + boardHeight + 0.3 },
            { x: -boardWidth / 2 - 0.3, y: poleHeight - 0.3 },
            { x: boardWidth / 2 + 0.3, y: poleHeight - 0.3 },
        ];
        
        corners.forEach((corner, i) => {
            const accentMat = this.getMaterial(accentColors[i], {
                emissive: accentColors[i],
                emissiveIntensity: 0.8
            });
            const accentGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const accent = new THREE.Mesh(accentGeo, accentMat);
            accent.position.set(corner.x, corner.y, frameDepth + 0.2);
            group.add(accent);
        });
        
        // Store for potential animation
        group.userData.collision = {
            type: 'box',
            size: { x: boardWidth / 3, z: 1 },
            height: poleHeight + boardHeight
        };
        
        return { mesh: group };
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

