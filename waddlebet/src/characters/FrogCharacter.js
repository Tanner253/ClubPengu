/**
 * FrogCharacter - The PEPE frog character model
 * A cute voxel frog with big eyes, wide grin, and green skin
 * 
 * Features:
 * - Wide frog head with big black eyes
 * - Classic PEPE-style grin with teeth
 * - Green body (reuses penguin body structure)
 * - Orange webbed feet
 * - Supports cosmetics (hats, body items)
 */

// Frog color palette - Classic PEPE green
export const FROG_PALETTE = {
    // Main skin colors
    main: '#5A9A5A',         // PEPE green
    mainLight: '#6AAA6A',    // Light green (top highlights)
    mainDark: '#4A8848',     // Dark green (shadows)
    mainDeep: '#3A7038',     // Deep green (deep shadows)
    
    // Belly/chin (lighter green, not gray)
    belly: '#6AAA6A',        // Lighter green belly
    bellyLight: '#7ABA7A',   // Even lighter
    
    // Mouth/lips area (brown/tan like PEPE)
    lips: '#A06848',         // Brown lips
    lipsDark: '#8A5838',     // Darker lip line
    mouthInner: '#5A3828',   // Inside mouth (dark)
    
    // Eyes - PEPE signature look
    eyeWhite: '#FFFFFF',     // Large white eye area
    eyeBlack: '#1A1A1A',     // Black pupils
    eyeLid: '#4A8848',       // Eyelid (same as skin dark)
    eyeHighlight: '#FFFFFF', // Eye shine
    
    // Feet
    feet: '#E88040',         // Orange webbed feet
    feetDark: '#C06030',     // Darker orange
};

// Dark Frog palette - shadowy variant
export const DARK_FROG_PALETTE = {
    main: '#2A4A2A',
    mainLight: '#3A5A3A',
    mainDark: '#1A3A20',
    mainDeep: '#102A18',
    belly: '#3A5A3A',
    bellyLight: '#4A6A4A',
    lips: '#6A4838',
    lipsDark: '#5A3828',
    mouthInner: '#3A2018',
    eyeWhite: '#E0E0E0',
    eyeBlack: '#0A0A0A',
    eyeLid: '#1A3A20',
    eyeHighlight: '#F0F0F0',
    feet: '#C06030',
    feetDark: '#A04820',
};

// Golden Frog palette - rare shiny variant
export const GOLDEN_FROG_PALETTE = {
    main: '#C8A040',
    mainLight: '#E0B860',
    mainDark: '#A08030',
    mainDeep: '#806020',
    belly: '#E0B860',
    bellyLight: '#F0C870',
    lips: '#8A5040',
    lipsDark: '#7A4030',
    mouthInner: '#5A3020',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1A1A',
    eyeLid: '#A08030',
    eyeHighlight: '#FFFFFF',
    feet: '#FFB060',
    feetDark: '#E09040',
};

// Blue Frog palette - poison dart frog style
export const BLUE_FROG_PALETTE = {
    main: '#3060A0',
    mainLight: '#4080C0',
    mainDark: '#204080',
    mainDeep: '#103060',
    belly: '#4080C0',
    bellyLight: '#50A0D0',
    lips: '#8A6858',
    lipsDark: '#7A5848',
    mouthInner: '#4A3020',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1A1A',
    eyeLid: '#204080',
    eyeHighlight: '#FFFFFF',
    feet: '#E88040',
    feetDark: '#C06030',
};

// Red Frog palette - fire frog
export const RED_FROG_PALETTE = {
    main: '#A04030',
    mainLight: '#C05040',
    mainDark: '#803020',
    mainDeep: '#602018',
    belly: '#C05040',
    bellyLight: '#D06050',
    lips: '#704030',
    lipsDark: '#603020',
    mouthInner: '#402010',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1A1A',
    eyeLid: '#803020',
    eyeHighlight: '#FFFFFF',
    feet: '#FFB060',
    feetDark: '#E09040',
};

// All frog palettes for easy access
export const FROG_PALETTES = {
    green: FROG_PALETTE,
    dark: DARK_FROG_PALETTE,
    golden: GOLDEN_FROG_PALETTE,
    blue: BLUE_FROG_PALETTE,
    red: RED_FROG_PALETTE,
};

/**
 * Generate a custom frog palette from primary and secondary colors
 * @param {string} primary - Primary skin color (hex)
 * @param {string} secondary - Secondary/belly color (hex)
 * @returns {Object} A complete frog palette
 */
export const generateFrogPalette = (primary, secondary) => {
    const adjustColor = (hex, percent) => {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * percent / 100)));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100)));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + Math.round(255 * percent / 100)));
        return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };
    
    return {
        main: primary,
        mainLight: adjustColor(primary, 12),
        mainDark: adjustColor(primary, -12),
        mainDeep: adjustColor(primary, -20),
        belly: adjustColor(primary, 12),
        bellyLight: adjustColor(primary, 18),
        lips: '#A06848',
        lipsDark: '#8A5838',
        mouthInner: '#5A3828',
        eyeWhite: '#FFFFFF',
        eyeBlack: '#1A1A1A',
        eyeLid: adjustColor(primary, -12),
        eyeHighlight: '#FFFFFF',
        feet: '#E88040',
        feetDark: '#C06030',
    };
};

// Head positioned at y+6 like penguin (sits on top of body)
const HEAD_Y_OFFSET = 6;

/**
 * Generate the frog's head - PEPE meme style
 * Full round head shape with big droopy eyes
 * Positioned to match penguin head for cosmetic compatibility
 */
export const generateFrogHead = () => {
    const voxelMap = new Map();
    
    const add = (x, y, z, c) => {
        const key = `${x},${y},${z}`;
        voxelMap.set(key, { x, y: y + HEAD_Y_OFFSET, z, c });
    };
    
    // === FULL ROUND HEAD using sphere formula ===
    // Radius for nice round PEPE head
    const radius = 5;
    
    for (let x = -6; x <= 6; x++) {
        for (let y = -3; y <= 5; y++) {
            for (let z = -5; z <= 5; z++) {
                // Slightly wider ellipsoid (stretched on X axis)
                const dx = x / 6;
                const dy = y / 5;
                const dz = z / 5;
                
                if (dx*dx + dy*dy + dz*dz <= 1) {
                    let color = 'main';
                    // Lighter on top
                    if (y > 3) color = 'mainLight';
                    // Subtle shading on back (not too dark)
                    if (z < -3) color = 'mainDark';
                    add(x, y, z, color);
                }
            }
        }
    }
    
    // === Fill in the back more to avoid cutoff look ===
    for (let x = -4; x <= 4; x++) {
        for (let y = -2; y <= 4; y++) {
            for (let z = -5; z <= -3; z++) {
                const dist = (x/5)*(x/5) + (y/5)*(y/5) + (z/5)*(z/5);
                if (dist <= 1.1) {
                    add(x, y, z, 'mainDark');
                }
            }
        }
    }
    
    // === NECK ===
    for (let x = -3; x <= 3; x++) {
        for (let z = -3; z <= 2; z++) {
            if (x*x + z*z <= 12) {
                add(x, -4, z, 'main');
                add(x, -3, z, 'main');
            }
        }
    }
    
    // === BIG DROOPY EYES - bulge out from head ===
    // Left eye white (4x3 area)
    for (let x = -5; x <= -2; x++) {
        for (let y = 1; y <= 3; y++) {
            add(x, y, 5, 'eyeWhite');
            add(x, y, 6, 'eyeWhite');
        }
    }
    // Left pupil - bigger, at bottom center
    add(-4, 1, 6, 'eyeBlack');
    add(-3, 1, 6, 'eyeBlack');
    add(-4, 2, 6, 'eyeBlack');
    add(-3, 2, 6, 'eyeBlack');
    // Left eyelid (half-closed droopy look)
    for (let x = -5; x <= -2; x++) {
        add(x, 3, 6, 'mainDark');
        add(x, 3, 5, 'mainDark');
    }
    
    // Right eye white
    for (let x = 2; x <= 5; x++) {
        for (let y = 1; y <= 3; y++) {
            add(x, y, 5, 'eyeWhite');
            add(x, y, 6, 'eyeWhite');
        }
    }
    // Right pupil
    add(3, 1, 6, 'eyeBlack');
    add(4, 1, 6, 'eyeBlack');
    add(3, 2, 6, 'eyeBlack');
    add(4, 2, 6, 'eyeBlack');
    // Right eyelid
    for (let x = 2; x <= 5; x++) {
        add(x, 3, 6, 'mainDark');
        add(x, 3, 5, 'mainDark');
    }
    
    // === MOUTH - brown line across lower face ===
    for (let x = -5; x <= 5; x++) {
        add(x, -1, 5, 'lips');
    }
    // Mouth corners curve down
    add(-5, -2, 4, 'lips');
    add(5, -2, 4, 'lips');
    
    return Array.from(voxelMap.values());
};

/**
 * Generate frog body - EXACTLY matches penguin body shape for cosmetic compatibility
 * Uses same formula as generateBaseBody in generators.js
 */
export const generateFrogBody = () => {
    const bodyMap = new Map();
    
    // Match penguin body exactly: x=-6 to 6, y=-7 to 5, z=-5 to 5
    for (let x = -6; x <= 6; x++) {
        for (let y = -7; y <= 5; y++) {
            for (let z = -5; z <= 5; z++) {
                const yMod = y > 0 ? 1 : 1.2;
                if (x * x + (y * yMod) * (y * yMod) + z * z <= 36) {
                    let color = 'main';
                    // Belly (front, lighter green) - same zone as penguin white belly
                    if (z > 2 && x > -4 && x < 4 && y < 3 && y > -6) color = 'belly';
                    // Back/sides darker
                    if (z < -2) color = 'mainDark';
                    bodyMap.set(`${x},${y},${z}`, { x, y, z, c: color });
                }
            }
        }
    }
    
    return Array.from(bodyMap.values());
};

/**
 * Generate frog flippers - EXACTLY matches penguin flippers for cosmetic compatibility
 * Uses same formula as generateFlippers in generators.js
 */
export const generateFrogFlipper = (isLeft) => {
    const voxels = [];
    
    // Match penguin flipper exactly
    for (let x = 0; x < 3; x++) {
        for (let y = -4; y < 2; y++) {
            for (let z = -1; z < 2; z++) {
                if (x === 2 && (y > 0 || y < -3)) continue;
                voxels.push({
                    x: isLeft ? x + 5 : -x - 5,
                    y: y - 1,
                    z,
                    c: 'main'  // Green flipper
                });
            }
        }
    }
    
    return voxels;
};

/**
 * Generate frog feet - Webbed frog feet with 3 toes
 */
export const generateFrogFoot = (isLeft) => {
    const voxels = [];
    const xOffset = isLeft ? 3 : -3;
    const side = isLeft ? 1 : -1;
    
    // Main foot pad (heel area)
    for (let x = -1; x <= 1; x++) {
        for (let z = 0; z <= 2; z++) {
            voxels.push({
                x: x + xOffset,
                y: -7,
                z: z + 1,
                c: 'feet'
            });
        }
    }
    
    // Three webbed toes spreading out
    // Center toe (longest)
    voxels.push({ x: xOffset, y: -7, z: 4, c: 'feet' });
    voxels.push({ x: xOffset, y: -7, z: 5, c: 'feet' });
    voxels.push({ x: xOffset, y: -7, z: 6, c: 'feetDark' });
    
    // Inner toe (medium)
    voxels.push({ x: xOffset - side, y: -7, z: 4, c: 'feet' });
    voxels.push({ x: xOffset - side * 2, y: -7, z: 5, c: 'feetDark' });
    
    // Outer toe (medium)  
    voxels.push({ x: xOffset + side, y: -7, z: 4, c: 'feet' });
    voxels.push({ x: xOffset + side * 2, y: -7, z: 5, c: 'feetDark' });
    
    // Webbing between toes
    voxels.push({ x: xOffset - side, y: -7, z: 3, c: 'feetDark' });
    voxels.push({ x: xOffset + side, y: -7, z: 3, c: 'feetDark' });
    
    return voxels;
};

/**
 * Generate both feet together (like penguin)
 */
export const generateFrogFeet = () => {
    return [...generateFrogFoot(true), ...generateFrogFoot(false)];
};

/**
 * Get pivot points for animation - MATCHES PENGUIN for cosmetic compatibility
 */
export const getFrogPivots = () => ({
    head: { x: 0, y: 6, z: 0 },       // Same as penguin head position
    body: { x: 0, y: 0, z: 0 },       // Center of body
    flipperLeft: { x: 5, y: -2, z: 0 },
    flipperRight: { x: -5, y: -2, z: 0 },
    footLeft: { x: 3, y: -7, z: 2 },
    footRight: { x: -3, y: -7, z: 2 },
});

/**
 * Generate complete Frog model
 */
export const generateFrogComplete = () => {
    const voxelMap = new Map();
    
    const addVoxels = (voxels) => {
        voxels.forEach(v => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) {
                voxelMap.set(key, v);
            }
        });
    };
    
    addVoxels(generateFrogHead());
    addVoxels(generateFrogBody());
    addVoxels(generateFrogFlipper(true));
    addVoxels(generateFrogFlipper(false));
    addVoxels(generateFrogFoot(true));
    addVoxels(generateFrogFoot(false));
    
    return Array.from(voxelMap.values());
};

// Export generators object for registry
export const FrogGenerators = {
    head: generateFrogHead,
    body: generateFrogBody,
    flipperLeft: () => generateFrogFlipper(true),
    flipperRight: () => generateFrogFlipper(false),
    footLeft: () => generateFrogFoot(true),
    footRight: () => generateFrogFoot(false),
    complete: generateFrogComplete,
    pivots: getFrogPivots,
};

export default FrogGenerators;

