/**
 * MountainBackground.js
 * 
 * Extremely performant low-poly mountain range that surrounds the map.
 * Uses a single merged BufferGeometry with vertex colors - NO textures.
 * Multiple rows of mountains create depth and a natural mountain range feel.
 * 
 * @param {THREE} THREE - Three.js library
 * @param {THREE.Scene} scene - Scene to add mountains to
 * @param {Object} options - Configuration options
 */
export function createMountainBackground(THREE, scene, options = {}) {
    const {
        mapSize = 220,          // Size of the playable map
        offset = 30,            // How far outside the map to place first row
        mountainRows = 3,       // Number of mountain rows for depth
        rowSpacing = 45,        // Distance between rows
        mountainsPerRow = [24, 32, 40], // Peaks per row (back to front)
        baseHeight = -5,        // Base height (below ground for seamless look)
        minPeakHeight = 40,     // Minimum peak height
        maxPeakHeight = 85,     // Maximum peak height
        baseWidth = 35,         // Base width of each mountain
        snowLineRatio = 0.55,   // Percentage of peak height where snow starts
    } = options;

    // Colors for the mountains (vertex colors) - Deep icy blue with snow caps
    const COLORS = {
        // Deep icy blue rock colors (darker to lighter)
        rockDeep: new THREE.Color('#1a3050'),    // Deep shadow - dark navy blue
        rockDark: new THREE.Color('#2a4565'),    // Dark icy blue base
        rockMid: new THREE.Color('#3a5a7a'),     // Mid icy blue
        rockLight: new THREE.Color('#4a6a8a'),   // Light icy blue
        rockHighlight: new THREE.Color('#5a7a9a'), // Icy blue highlights
        
        // Snow colors (for peaks) - BRIGHT WHITE snow, minimal blue tint
        snowShadow: new THREE.Color('#c8dce8'),  // Lightest shadow (very subtle blue)
        snowDark: new THREE.Color('#dce8f0'),    // Light shadowed snow
        snowMid: new THREE.Color('#eef4f8'),     // Near white
        snowLight: new THREE.Color('#f8fbfc'),   // Almost pure white
        snowBright: new THREE.Color('#ffffff'),  // Pure white (peak tips)
    };

    // Array to hold all vertex data
    const positions = [];
    const colors = [];
    const normals = [];

    const center = mapSize / 2;

    // Helper to get color for a vertex based on height
    // Dramatic snow caps with ABRUPT transition - no gradients
    const getColorForHeight = (y, peakHeight, snowLineHeight, isFrontFace, rowIndex) => {
        const heightRatio = (y - baseHeight) / (peakHeight - baseHeight);
        const atmosphericDarken = 1 - (rowIndex * 0.05);
        
        let color;
        
        // DRAMATIC SNOW - More abrupt transitions, whiter colors
        if (y >= peakHeight * 0.82) {
            // Peak tip - PURE WHITE (extended zone)
            color = COLORS.snowBright.clone();
        } else if (y >= peakHeight * 0.68) {
            // Upper snow cap - near white, no gradient
            color = isFrontFace ? COLORS.snowBright.clone() : COLORS.snowLight.clone();
        } else if (y >= snowLineHeight) {
            // Snow zone - solid bright snow, minimal gradient
            color = isFrontFace ? COLORS.snowLight.clone() : COLORS.snowMid.clone();
        } else if (y >= snowLineHeight * 0.92) {
            // HARD EDGE transition zone - thin line of patchy snow
            color = isFrontFace ? COLORS.snowMid.clone() : COLORS.snowDark.clone();
        } else if (heightRatio > 0.35) {
            // Upper icy blue rock
            color = isFrontFace ? COLORS.rockLight.clone() : COLORS.rockMid.clone();
        } else if (heightRatio > 0.15) {
            // Mid icy blue rock
            color = isFrontFace ? COLORS.rockMid.clone() : COLORS.rockDark.clone();
        } else {
            // Base rock (darkest icy blue)
            color = COLORS.rockDeep.clone();
        }
        
        color.multiplyScalar(atmosphericDarken);
        return color;
    };

    // Helper to add a triangle with calculated normal
    const addTriangle = (a, b, c, peakHeight, isFrontFace, rowIndex, snowLineHeight) => {
        // Calculate face normal
        const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
        const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
        const normal = {
            x: ab.y * ac.z - ab.z * ac.y,
            y: ab.z * ac.x - ab.x * ac.z,
            z: ab.x * ac.y - ab.y * ac.x
        };
        const len = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
        if (len > 0) {
            normal.x /= len;
            normal.y /= len;
            normal.z /= len;
        }

        // Add positions
        positions.push(a.x, a.y, a.z);
        positions.push(b.x, b.y, b.z);
        positions.push(c.x, c.y, c.z);

        // Add normals
        for (let n = 0; n < 3; n++) {
            normals.push(normal.x, normal.y, normal.z);
        }

        // Color each vertex
        const vertices = [a, b, c];
        for (const v of vertices) {
            const color = getColorForHeight(v.y, peakHeight, snowLineHeight, isFrontFace, rowIndex);
            colors.push(color.r, color.g, color.b);
        }
    };
    
    // Helper to create a tiered mountain with visible snow bands
    const createTieredMountain = (peakX, peakZ, peakHeight, baseSpread, snowLineHeight, rowIndex) => {
        // Create mountain with 4 tiers for proper color banding
        const tiers = [
            { heightRatio: 0.0, spreadRatio: 1.0 },   // Base
            { heightRatio: 0.35, spreadRatio: 0.7 },  // Lower rock
            { heightRatio: 0.55, spreadRatio: 0.5 },  // Mid rock / snow transition
            { heightRatio: 0.75, spreadRatio: 0.3 },  // Snow zone
            { heightRatio: 1.0, spreadRatio: 0.0 },   // Peak
        ];
        
        // Generate vertices for each tier
        const tierVerts = tiers.map(tier => {
            const y = baseHeight + (peakHeight - baseHeight) * tier.heightRatio;
            const spread = baseSpread * tier.spreadRatio;
            
            if (spread === 0) {
                // Peak - single point
                return [{ x: peakX, y, z: peakZ }];
            }
            
            // 4 corners at this tier level
            return [
                { x: peakX - spread, y, z: peakZ },         // Left
                { x: peakX + spread, y, z: peakZ },         // Right
                { x: peakX, y, z: peakZ - spread * 0.8 },   // Front (toward map)
                { x: peakX, y, z: peakZ + spread * 1.2 },   // Back (away from map)
            ];
        });
        
        // Connect tiers with triangles
        for (let t = 0; t < tiers.length - 1; t++) {
            const lower = tierVerts[t];
            const upper = tierVerts[t + 1];
            
            if (upper.length === 1) {
                // Connecting to peak - 4 triangles
                const peak = upper[0];
                // Front faces (toward map center)
                addTriangle(peak, lower[2], lower[0], peakHeight, true, rowIndex, snowLineHeight);
                addTriangle(peak, lower[1], lower[2], peakHeight, true, rowIndex, snowLineHeight);
                // Back faces
                addTriangle(peak, lower[0], lower[3], peakHeight, false, rowIndex, snowLineHeight);
                addTriangle(peak, lower[3], lower[1], peakHeight, false, rowIndex, snowLineHeight);
            } else {
                // Connecting two tiers - 8 triangles (2 per side)
                // Front left
                addTriangle(upper[0], lower[2], lower[0], peakHeight, true, rowIndex, snowLineHeight);
                addTriangle(upper[0], upper[2], lower[2], peakHeight, true, rowIndex, snowLineHeight);
                // Front right
                addTriangle(upper[1], lower[1], lower[2], peakHeight, true, rowIndex, snowLineHeight);
                addTriangle(upper[1], lower[2], upper[2], peakHeight, true, rowIndex, snowLineHeight);
                // Back left
                addTriangle(upper[0], lower[0], lower[3], peakHeight, false, rowIndex, snowLineHeight);
                addTriangle(upper[0], lower[3], upper[3], peakHeight, false, rowIndex, snowLineHeight);
                // Back right
                addTriangle(upper[1], lower[3], lower[1], peakHeight, false, rowIndex, snowLineHeight);
                addTriangle(upper[1], upper[3], lower[3], peakHeight, false, rowIndex, snowLineHeight);
            }
        }
    };

    // Generate multiple rows of mountains
    for (let row = 0; row < mountainRows; row++) {
        // Back rows are further away and taller
        const rowRadius = mapSize / 2 + offset + (row * rowSpacing);
        const rowPeakCount = mountainsPerRow[row] || mountainsPerRow[0];
        
        // Height multiplier - back rows are taller (distant mountains appear larger)
        const heightMult = 1 + (row * 0.25);
        
        // Width multiplier - back rows have wider bases
        const widthMult = 1 + (row * 0.15);
        
        // Angular offset to stagger peaks between rows
        const angleOffset = (row * Math.PI) / rowPeakCount;

        for (let i = 0; i < rowPeakCount; i++) {
            const angle = angleOffset + (i / rowPeakCount) * Math.PI * 2;
            
            // Randomize peak height for variety
            const basePeakHeight = minPeakHeight + Math.random() * (maxPeakHeight - minPeakHeight);
            const peakHeight = basePeakHeight * heightMult;
            
            // Vary snow line per mountain - LOWER snow lines for more dramatic snow caps
            // Range: 20% to 45% of peak height (lower = more snow visible)
            const mountainSnowRatio = 0.20 + Math.random() * 0.25;
            const snowLineHeight = baseHeight + (peakHeight - baseHeight) * mountainSnowRatio;
            
            // Add slight variation to position for organic feel
            const radiusVariation = (Math.random() - 0.5) * 15;
            const actualRadius = rowRadius + radiusVariation;
            
            // Peak position
            const peakX = center + Math.cos(angle) * actualRadius;
            const peakZ = center + Math.sin(angle) * actualRadius;
            
            // Base spread
            const spread = (baseWidth / 2) * widthMult;

            // Create tiered mountain with visible snow bands
            createTieredMountain(peakX, peakZ, peakHeight, spread, snowLineHeight, row);

            // Add secondary peaks for more natural look (ridgelines)
            if (row < 2 && i % (row === 0 ? 2 : 3) === 0) {
                const ridgeOffset = spread * (0.8 + Math.random() * 0.4);
                const ridgeHeight = peakHeight * (0.5 + Math.random() * 0.25);
                const ridgeAngle = angle + (Math.random() - 0.5) * 0.3;
                
                const ridgePeakX = peakX - Math.cos(ridgeAngle) * ridgeOffset;
                const ridgePeakZ = peakZ - Math.sin(ridgeAngle) * ridgeOffset;
                const ridgeSpread = spread * 0.5;
                
                // Ridge snow line - even lower for dramatic small peaks
                const ridgeSnowLineHeight = baseHeight + (ridgeHeight - baseHeight) * (0.15 + Math.random() * 0.2);
                
                createTieredMountain(ridgePeakX, ridgePeakZ, ridgeHeight, ridgeSpread, ridgeSnowLineHeight, row);
            }
        }
    }

    // Create the BufferGeometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

    // Simple material with vertex colors and flat shading
    const material = new THREE.MeshLambertMaterial({
        vertexColors: true,
        flatShading: true,
        side: THREE.FrontSide,
    });

    const mountainMesh = new THREE.Mesh(geometry, material);
    mountainMesh.name = 'mountainBackground';
    mountainMesh.receiveShadow = false; // Don't receive shadows (too far)
    mountainMesh.castShadow = false;    // Don't cast shadows (performance)
    mountainMesh.frustumCulled = true;  // Let frustum culling work

    scene.add(mountainMesh);

    // ==================== SNOWY GROUND PLANE ====================
    // Create a large ground plane that extends under the mountains
    // This prevents the "floating mountains" effect
    const groundExtent = mapSize + offset + (mountainRows * rowSpacing) + 100; // Extend past furthest mountains
    const groundGeo = new THREE.PlaneGeometry(groundExtent * 2, groundExtent * 2, 16, 16);
    groundGeo.rotateX(-Math.PI / 2);
    
    // Add vertex colors for icy ground with subtle variation
    const groundPositions = groundGeo.attributes.position;
    const groundColors = new Float32Array(groundPositions.count * 3);
    
    // Icy ground colors - deep blues transitioning to snowy white
    const iceGroundBase = new THREE.Color('#a8d0e8');    // Base icy blue-white
    const iceGroundLight = new THREE.Color('#c8e0f0');   // Lighter icy
    const iceGroundDark = new THREE.Color('#7ab0d0');    // Deeper icy blue
    const mapIceColor = new THREE.Color('#7EB8D8');      // Ice blue (matches main map)
    const distantIce = new THREE.Color('#5a90b8');       // Distant icy blue (atmospheric)
    
    for (let i = 0; i < groundPositions.count; i++) {
        const x = groundPositions.getX(i);
        const z = groundPositions.getZ(i);
        
        // Distance from map center
        const distFromCenter = Math.sqrt(x * x + z * z);
        const mapRadius = mapSize / 2;
        
        // Transition from map ice to distant snowy ice
        let color;
        if (distFromCenter < mapRadius + 15) {
            // Near the main map - match the map ice color
            const t = Math.max(0, (distFromCenter - mapRadius) / 15);
            color = mapIceColor.clone().lerp(iceGroundBase, t);
        } else {
            // Under mountains - icy ground with variation
            const noise = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 0.5 + 0.5;
            if (noise > 0.65) {
                color = iceGroundLight.clone();
            } else if (noise < 0.25) {
                color = iceGroundDark.clone();
            } else {
                color = iceGroundBase.clone();
            }
            
            // Fade to deeper blue with distance (atmospheric perspective)
            const distanceFade = Math.min(1, (distFromCenter - mapRadius) / (groundExtent * 0.6));
            color.lerp(distantIce, distanceFade * 0.5);
        }
        
        groundColors[i * 3] = color.r;
        groundColors[i * 3 + 1] = color.g;
        groundColors[i * 3 + 2] = color.b;
    }
    
    groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(groundColors, 3));
    
    const groundMat = new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.FrontSide,
    });
    
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.name = 'mountainGround';
    groundMesh.position.set(center, baseHeight + 0.1, center); // Slightly above base to avoid z-fighting
    groundMesh.receiveShadow = false;
    groundMesh.castShadow = false;
    
    scene.add(groundMesh);

    // Add subtle fog to blend mountains into sky (adjusted for depth)
    const fogColor = new THREE.Color('#6AA8C8'); // Match sky color
    scene.fog = new THREE.Fog(fogColor, 120, 400);

    // Log performance info
    const triangleCount = positions.length / 9;
    console.log(`🏔️ Mountain background created: ${mountainRows} rows, ${triangleCount} triangles + ground plane`);

    return {
        mesh: mountainMesh,
        groundMesh: groundMesh,
        dispose: () => {
            geometry.dispose();
            material.dispose();
            scene.remove(mountainMesh);
            groundGeo.dispose();
            groundMat.dispose();
            scene.remove(groundMesh);
            scene.fog = null;
        }
    };
}

/**
 * Alternative: Create a simple billboard-style mountain backdrop
 * Even more performant - just 4 large quads around the map
 * Uses gradient coloring to simulate mountains
 */
export function createBillboardMountains(THREE, scene, options = {}) {
    const {
        mapSize = 220,
        distance = 280,       // Distance from center
        height = 100,         // Total height of backdrop
        segments = 64,        // Horizontal segments for mountain silhouette
    } = options;

    const center = mapSize / 2;
    const group = new THREE.Group();
    group.name = 'billboardMountains';

    // Create 4 mountain backdrops (one for each side)
    const sides = [
        { rotation: 0, offset: { x: 0, z: -distance } },           // North
        { rotation: Math.PI, offset: { x: 0, z: distance } },      // South  
        { rotation: Math.PI / 2, offset: { x: distance, z: 0 } },  // East
        { rotation: -Math.PI / 2, offset: { x: -distance, z: 0 } }, // West
    ];

    for (const side of sides) {
        // Create mountain silhouette geometry
        const width = mapSize + distance;
        const shape = new THREE.Shape();
        
        // Start at bottom left
        shape.moveTo(-width / 2, 0);
        
        // Generate mountain peaks along the top
        const peakCount = 8 + Math.floor(Math.random() * 4);
        let x = -width / 2;
        const step = width / peakCount;
        
        for (let i = 0; i <= peakCount; i++) {
            const peakHeight = height * (0.3 + Math.random() * 0.7);
            const midHeight = height * (0.1 + Math.random() * 0.3);
            
            if (i < peakCount) {
                shape.lineTo(x + step * 0.5, peakHeight);
                shape.lineTo(x + step, midHeight);
            }
            x += step;
        }
        
        // Close the shape
        shape.lineTo(width / 2, 0);
        shape.lineTo(-width / 2, 0);

        const geometry = new THREE.ShapeGeometry(shape, 1);
        
        // Add vertex colors (gradient from dark at base to light at peaks)
        const positions = geometry.attributes.position;
        const colors = new Float32Array(positions.count * 3);
        
        const baseColor = new THREE.Color('#3a4a5a');
        const midColor = new THREE.Color('#5a6a7a');
        const peakColor = new THREE.Color('#8aa0b0');
        
        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i);
            const t = Math.min(1, y / height);
            
            let color;
            if (t < 0.5) {
                color = baseColor.clone().lerp(midColor, t * 2);
            } else {
                color = midColor.clone().lerp(peakColor, (t - 0.5) * 2);
            }
            
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            fog: true,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(center + side.offset.x, 0, center + side.offset.z);
        mesh.rotation.y = side.rotation;
        mesh.castShadow = false;
        mesh.receiveShadow = false;

        group.add(mesh);
    }

    scene.add(group);

    // Add fog
    const fogColor = new THREE.Color('#6AA8C8');
    scene.fog = new THREE.Fog(fogColor, 100, 400);

    console.log('🏔️ Billboard mountains created (4 panels)');

    return {
        group,
        dispose: () => {
            group.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            scene.remove(group);
            scene.fog = null;
        }
    };
}

