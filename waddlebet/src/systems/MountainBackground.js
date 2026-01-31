/**
 * MountainBackground.js
 * 
 * Extremely performant low-poly mountain range that surrounds the map.
 * Uses a single merged BufferGeometry with vertex colors - NO textures.
 * Multiple rows of mountains create depth and a natural mountain range feel.
 * 
 * Supports:
 * - Rectangular playable areas (multiple zones)
 * - Path gaps where zones connect
 * - Collision data for boundary enforcement
 * 
 * @param {THREE} THREE - Three.js library
 * @param {THREE.Scene} scene - Scene to add mountains to
 * @param {Object} options - Configuration options
 */
export function createMountainBackground(THREE, scene, options = {}) {
    const {
        mapSize = 220,          // Size of original zone (for backwards compatibility)
        // NEW: Rectangular playable area bounds
        worldBounds = {
            minX: 0,
            maxX: 440,          // Town (0-220) + Snow Forts (220-440)
            minZ: 0,
            maxZ: 220
        },
        // NEW: Gaps in mountains for zone transitions (exterior)
        pathGaps = [],
        // NEW: Internal walls between zones (with optional gaps for paths)
        // Each wall: { edge: 'horizontal'|'vertical', x/z, minX/minZ, maxX/maxZ, gapMinX/gapMinZ, gapMaxX/gapMaxZ }
        internalWalls = [],
        offset = 30,            // How far outside the map to place first row
        mountainRows = 3,       // Number of mountain rows for depth
        rowSpacing = 45,        // Distance between rows
        mountainsPerRow = [24, 32, 40], // Peaks per row (back to front)
        baseHeight = 0,         // Base height (same as zone ground y=0)
        minPeakHeight = 40,     // Minimum peak height
        maxPeakHeight = 85,     // Maximum peak height
        baseWidth = 35,         // Base width of each mountain
        snowLineRatio = 0.55,   // Percentage of peak height where snow starts
    } = options;
    
    // Calculate playable area dimensions
    const worldWidth = worldBounds.maxX - worldBounds.minX;
    const worldDepth = worldBounds.maxZ - worldBounds.minZ;
    const worldCenterX = (worldBounds.minX + worldBounds.maxX) / 2;
    const worldCenterZ = (worldBounds.minZ + worldBounds.maxZ) / 2;
    
    // Collision boxes for mountains (will be returned)
    const collisionBoxes = [];

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

    // Legacy center for backwards compatibility (not used in new rectangular system)
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

    // Helper to check if a position is in a path gap
    const isInPathGap = (x, z) => {
        for (const gap of pathGaps) {
            if (x >= gap.minX && x <= gap.maxX && z >= gap.minZ && z <= gap.maxZ) {
                return true;
            }
        }
        return false;
    };
    
    // Helper to place mountains along a line segment
    const placeMountainsAlongEdge = (startX, startZ, endX, endZ, row, facing) => {
        const rowOffset = offset + (row * rowSpacing);
        const heightMult = 1 + (row * 0.25);
        const widthMult = 1 + (row * 0.15);
        
        // Calculate edge length and direction
        const dx = endX - startX;
        const dz = endZ - startZ;
        const edgeLength = Math.sqrt(dx * dx + dz * dz);
        const dirX = dx / edgeLength;
        const dirZ = dz / edgeLength;
        
        // Normal pointing outward from playable area
        let normalX, normalZ;
        if (facing === 'north') { normalX = 0; normalZ = -1; }
        else if (facing === 'south') { normalX = 0; normalZ = 1; }
        else if (facing === 'east') { normalX = 1; normalZ = 0; }
        else { normalX = -1; normalZ = 0; } // west
        
        // Number of mountains along this edge
        const spacing = baseWidth * 0.8;
        const count = Math.ceil(edgeLength / spacing);
        
        for (let i = 0; i <= count; i++) {
            const t = i / count;
            const baseX = startX + dx * t;
            const baseZ = startZ + dz * t;
            
            // Position offset outward from the edge
            const peakX = baseX + normalX * rowOffset + (Math.random() - 0.5) * 10;
            const peakZ = baseZ + normalZ * rowOffset + (Math.random() - 0.5) * 10;
            
            // Skip if in a path gap (extended to catch mountains near gaps)
            const gapCheckX = baseX;
            const gapCheckZ = baseZ;
            if (isInPathGap(gapCheckX, gapCheckZ)) {
                continue;
            }
            
            // Randomize peak height
            const basePeakHeight = minPeakHeight + Math.random() * (maxPeakHeight - minPeakHeight);
            const peakHeight = basePeakHeight * heightMult;
            
            const mountainSnowRatio = 0.20 + Math.random() * 0.25;
            const snowLineHeight = baseHeight + (peakHeight - baseHeight) * mountainSnowRatio;
            
            const spread = (baseWidth / 2) * widthMult;
            
            createTieredMountain(peakX, peakZ, peakHeight, spread, snowLineHeight, row);
            
            // Add collision for first row mountains only (closest to players)
            if (row === 0) {
                collisionBoxes.push({
                    x: peakX,
                    z: peakZ,
                    radius: spread * 1.2, // Slightly larger than visual for safe margin
                    type: 'cylinder'
                });
            }
            
            // Add ridge peaks
            if (row < 2 && i % 2 === 0) {
                const ridgeOffset = spread * (0.8 + Math.random() * 0.4);
                const ridgeHeight = peakHeight * (0.5 + Math.random() * 0.25);
                
                const ridgePeakX = peakX + normalX * ridgeOffset * 0.5;
                const ridgePeakZ = peakZ + normalZ * ridgeOffset * 0.5;
                const ridgeSpread = spread * 0.5;
                
                const ridgeSnowLineHeight = baseHeight + (ridgeHeight - baseHeight) * (0.15 + Math.random() * 0.2);
                
                createTieredMountain(ridgePeakX, ridgePeakZ, ridgeHeight, ridgeSpread, ridgeSnowLineHeight, row);
            }
        }
    };
    
    // Generate mountains around RECTANGULAR playable area
    // Place mountains along each edge of the world bounds
    for (let row = 0; row < mountainRows; row++) {
        // North edge (z = minZ)
        placeMountainsAlongEdge(
            worldBounds.minX, worldBounds.minZ,
            worldBounds.maxX, worldBounds.minZ,
            row, 'north'
        );
        
        // South edge (z = maxZ)
        placeMountainsAlongEdge(
            worldBounds.minX, worldBounds.maxZ,
            worldBounds.maxX, worldBounds.maxZ,
            row, 'south'
        );
        
        // West edge (x = minX)
        placeMountainsAlongEdge(
            worldBounds.minX, worldBounds.minZ,
            worldBounds.minX, worldBounds.maxZ,
            row, 'west'
        );
        
        // East edge (x = maxX)
        placeMountainsAlongEdge(
            worldBounds.maxX, worldBounds.minZ,
            worldBounds.maxX, worldBounds.maxZ,
            row, 'east'
        );
    }
    
    // Add corner mountains for seamless coverage
    const corners = [
        { x: worldBounds.minX, z: worldBounds.minZ }, // NW
        { x: worldBounds.maxX, z: worldBounds.minZ }, // NE
        { x: worldBounds.minX, z: worldBounds.maxZ }, // SW
        { x: worldBounds.maxX, z: worldBounds.maxZ }, // SE
    ];
    
    corners.forEach((corner, idx) => {
        for (let row = 0; row < mountainRows; row++) {
            const rowOffset = offset + (row * rowSpacing);
            const heightMult = 1 + (row * 0.25);
            const widthMult = 1 + (row * 0.15);
            
            // Diagonal direction for corner
            const diagX = corner.x < worldCenterX ? -1 : 1;
            const diagZ = corner.z < worldCenterZ ? -1 : 1;
            
            const peakX = corner.x + diagX * rowOffset * 0.7;
            const peakZ = corner.z + diagZ * rowOffset * 0.7;
            
            const basePeakHeight = (minPeakHeight + maxPeakHeight) / 2 + Math.random() * 20;
            const peakHeight = basePeakHeight * heightMult;
            const spread = (baseWidth / 2) * widthMult * 1.2; // Larger corner mountains
            
            const snowLineHeight = baseHeight + peakHeight * 0.25;
            
            createTieredMountain(peakX, peakZ, peakHeight, spread, snowLineHeight, row);
            
            if (row === 0) {
                collisionBoxes.push({
                    x: peakX,
                    z: peakZ,
                    radius: spread * 1.2,
                    type: 'cylinder'
                });
            }
        }
    });
    
    // ==================== INTERNAL WALLS (Zone Dividers) ====================
    // Mountains that separate zones, with optional gaps for paths
    // These are INSIDE the playable area, not on the exterior
    internalWalls.forEach(wall => {
        // Helper to check if position is in this wall's gap
        const isInWallGap = (x, z) => {
            if (wall.edge === 'horizontal') {
                // Horizontal wall at z, gap between gapMinX and gapMaxX
                return x >= (wall.gapMinX || -9999) && x <= (wall.gapMaxX || -9999);
            } else {
                // Vertical wall at x, gap between gapMinZ and gapMaxZ
                return z >= (wall.gapMinZ || -9999) && z <= (wall.gapMaxZ || -9999);
            }
        };
        
        // Place mountains along the internal wall (only 1-2 rows, smaller than exterior)
        const internalRows = 2;
        const internalOffset = 5; // Much closer to the edge (inside playable area)
        
        for (let row = 0; row < internalRows; row++) {
            const rowOffset = internalOffset + (row * 25); // Tighter spacing
            const heightMult = 0.7 + (row * 0.15); // Shorter than exterior
            const widthMult = 0.8 + (row * 0.1);
            
            if (wall.edge === 'horizontal') {
                // Horizontal wall at specific Z, spanning minX to maxX
                const startX = wall.minX;
                const endX = wall.maxX;
                const wallZ = wall.z;
                
                const spacing = baseWidth * 0.7;
                const count = Math.ceil((endX - startX) / spacing);
                
                for (let i = 0; i <= count; i++) {
                    const t = i / count;
                    const baseX = startX + (endX - startX) * t;
                    
                    // Skip if in gap
                    if (isInWallGap(baseX, wallZ)) continue;
                    
                    // Offset perpendicular to the wall (north or south)
                    const peakX = baseX + (Math.random() - 0.5) * 8;
                    const peakZ = wallZ + (row % 2 === 0 ? -rowOffset : rowOffset);
                    
                    const basePeakHeight = minPeakHeight * 0.6 + Math.random() * (maxPeakHeight - minPeakHeight) * 0.4;
                    const peakHeight = basePeakHeight * heightMult;
                    const spread = (baseWidth / 2) * widthMult * 0.8;
                    
                    const snowLineHeight = baseHeight + peakHeight * (0.3 + Math.random() * 0.2);
                    
                    createTieredMountain(peakX, peakZ, peakHeight, spread, snowLineHeight, row);
                    
                    if (row === 0) {
                        collisionBoxes.push({
                            x: peakX,
                            z: peakZ,
                            radius: spread * 1.2,
                            type: 'cylinder'
                        });
                    }
                }
            } else {
                // Vertical wall at specific X, spanning minZ to maxZ
                const startZ = wall.minZ;
                const endZ = wall.maxZ;
                const wallX = wall.x;
                
                const spacing = baseWidth * 0.7;
                const count = Math.ceil((endZ - startZ) / spacing);
                
                for (let i = 0; i <= count; i++) {
                    const t = i / count;
                    const baseZ = startZ + (endZ - startZ) * t;
                    
                    // Skip if in gap
                    if (isInWallGap(wallX, baseZ)) continue;
                    
                    // Offset perpendicular to the wall (east or west)
                    const peakX = wallX + (row % 2 === 0 ? -rowOffset : rowOffset);
                    const peakZ = baseZ + (Math.random() - 0.5) * 8;
                    
                    const basePeakHeight = minPeakHeight * 0.6 + Math.random() * (maxPeakHeight - minPeakHeight) * 0.4;
                    const peakHeight = basePeakHeight * heightMult;
                    const spread = (baseWidth / 2) * widthMult * 0.8;
                    
                    const snowLineHeight = baseHeight + peakHeight * (0.3 + Math.random() * 0.2);
                    
                    createTieredMountain(peakX, peakZ, peakHeight, spread, snowLineHeight, row);
                    
                    if (row === 0) {
                        collisionBoxes.push({
                            x: peakX,
                            z: peakZ,
                            radius: spread * 1.2,
                            type: 'cylinder'
                        });
                    }
                }
            }
        }
    });

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

    // ==================== NO SEPARATE GROUND PLANE ====================
    // Each zone (Town, Snow Forts, etc.) creates its own ground plane at y=0
    // Mountain bases are at y=0 (baseHeight=0) so they sit on zone grounds
    // This prevents double-rendering and z-fighting issues
    // 
    // Note: If there are gaps between zones and mountains, zones should extend
    // their ground slightly to cover the transition area
    const groundMesh = null; // No separate mountain ground needed

    // Add subtle fog to blend mountains into sky (adjusted for depth)
    const fogColor = new THREE.Color('#6AA8C8'); // Match sky color
    scene.fog = new THREE.Fog(fogColor, 120, 400);

    // Log performance info
    const triangleCount = positions.length / 9;
    console.log(`🏔️ Mountain background created: ${mountainRows} rows, ${triangleCount} triangles, ${collisionBoxes.length} collision zones`);

    return {
        mesh: mountainMesh,
        groundMesh: groundMesh, // null - zones handle their own ground
        collisionBoxes: collisionBoxes, // Array of { x, z, radius } for collision checks
        
        // Check if a point collides with any mountain
        checkCollision: (x, z, playerRadius = 0.5) => {
            for (const box of collisionBoxes) {
                const dx = x - box.x;
                const dz = z - box.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < box.radius + playerRadius) {
                    return true;
                }
            }
            return false;
        },
        
        dispose: () => {
            geometry.dispose();
            material.dispose();
            scene.remove(mountainMesh);
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

