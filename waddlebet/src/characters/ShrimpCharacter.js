/**
 * ShrimpCharacter - A cute voxel shrimp character
 * 
 * Features:
 * - Curved shrimp body with segments
 * - Long antennae on head
 * - Big round eyes on stalks
 * - Fan-shaped tail flappers
 * - Multiple walking legs
 * - Orange/coral coloring
 */

// Shrimp color palette - Cooked shrimp orange/coral
export const SHRIMP_PALETTE = {
    // Main body colors
    main: '#FF6B4A',         // Coral orange
    mainLight: '#FF8A6A',    // Light coral (highlights)
    mainDark: '#E05535',     // Dark coral (shadows)
    mainDeep: '#C04428',     // Deep coral (deep shadows)
    
    // Belly/underside (lighter, more pinkish)
    belly: '#FFAA8A',        // Light pink/peach
    bellyLight: '#FFBBAA',   // Very light pink
    
    // Segments (darker lines)
    segment: '#D04030',      // Segment dividers
    
    // Eyes
    eyeWhite: '#1A1A1A',     // Dark eye (shrimp have dark eyes)
    eyeStalk: '#FF7A5A',     // Eye stalk color
    eyeHighlight: '#FFFFFF', // Eye shine
    
    // Antennae
    antenna: '#FF9070',      // Slightly lighter orange
    antennaTip: '#FFAA90',   // Light tips
    
    // Tail fan
    tailFan: '#FF5040',      // Bright red-orange
    tailEdge: '#FF7060',     // Lighter edge
    
    // Legs
    legs: '#FFB090',         // Light orange legs
    legsDark: '#FF9070',     // Slightly darker
};

// Raw/uncooked shrimp palette - grayish blue
export const RAW_SHRIMP_PALETTE = {
    main: '#7A8A9A',
    mainLight: '#9AAABA',
    mainDark: '#5A6A7A',
    mainDeep: '#4A5A6A',
    belly: '#9AAABA',
    bellyLight: '#AABBCC',
    segment: '#4A5A6A',
    eyeWhite: '#1A1A1A',
    eyeStalk: '#8A9AAA',
    eyeHighlight: '#FFFFFF',
    antenna: '#8A9AAA',
    antennaTip: '#AABBCC',
    tailFan: '#6A7A8A',
    tailEdge: '#8A9AAA',
    legs: '#9AAABA',
    legsDark: '#7A8A9A',
};

// Golden shrimp palette - fancy variant
export const GOLDEN_SHRIMP_PALETTE = {
    main: '#FFB840',
    mainLight: '#FFD060',
    mainDark: '#E0A030',
    mainDeep: '#C08820',
    belly: '#FFD060',
    bellyLight: '#FFE080',
    segment: '#C08820',
    eyeWhite: '#1A1A1A',
    eyeStalk: '#FFC050',
    eyeHighlight: '#FFFFFF',
    antenna: '#FFD060',
    antennaTip: '#FFE080',
    tailFan: '#FFA030',
    tailEdge: '#FFC050',
    legs: '#FFD070',
    legsDark: '#FFB850',
};

// Blue shrimp palette - rare blue variant
export const BLUE_SHRIMP_PALETTE = {
    main: '#4080C0',
    mainLight: '#60A0E0',
    mainDark: '#3060A0',
    mainDeep: '#204080',
    belly: '#60A0E0',
    bellyLight: '#80C0FF',
    segment: '#204080',
    eyeWhite: '#1A1A1A',
    eyeStalk: '#5090D0',
    eyeHighlight: '#FFFFFF',
    antenna: '#60A0E0',
    antennaTip: '#80C0FF',
    tailFan: '#3070B0',
    tailEdge: '#5090D0',
    legs: '#70B0F0',
    legsDark: '#5090D0',
};

// All shrimp palettes
export const SHRIMP_PALETTES = {
    orange: SHRIMP_PALETTE,
    raw: RAW_SHRIMP_PALETTE,
    golden: GOLDEN_SHRIMP_PALETTE,
    blue: BLUE_SHRIMP_PALETTE,
};

/**
 * Generate a custom shrimp palette from a primary color
 */
export const generateShrimpPalette = (primary) => {
    const adjustColor = (hex, percent) => {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * percent / 100)));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100)));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + Math.round(255 * percent / 100)));
        return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };
    
    return {
        main: primary,
        mainLight: adjustColor(primary, 15),
        mainDark: adjustColor(primary, -15),
        mainDeep: adjustColor(primary, -25),
        belly: adjustColor(primary, 25),
        bellyLight: adjustColor(primary, 35),
        segment: adjustColor(primary, -20),
        eyeWhite: '#1A1A1A',
        eyeStalk: adjustColor(primary, 10),
        eyeHighlight: '#FFFFFF',
        antenna: adjustColor(primary, 20),
        antennaTip: adjustColor(primary, 30),
        tailFan: adjustColor(primary, -10),
        tailEdge: adjustColor(primary, 10),
        legs: adjustColor(primary, 25),
        legsDark: adjustColor(primary, 15),
    };
};

// Head positioned at y+6 like penguin
const HEAD_Y_OFFSET = 6;

/**
 * Generate the shrimp's head - with antennae and eye stalks
 */
export const generateShrimpHead = () => {
    const voxelMap = new Map();
    
    const add = (x, y, z, c) => {
        const key = `${x},${y},${z}`;
        voxelMap.set(key, { x, y: y + HEAD_Y_OFFSET, z, c });
    };
    
    // === MAIN HEAD (rounded, slightly elongated forward) ===
    for (let x = -4; x <= 4; x++) {
        for (let y = -2; y <= 3; y++) {
            for (let z = -3; z <= 4; z++) {
                const dx = x / 4;
                const dy = y / 3;
                const dz = (z - 0.5) / 4;
                
                if (dx*dx + dy*dy + dz*dz <= 1) {
                    let color = 'main';
                    if (y > 2) color = 'mainLight';
                    if (y < -1) color = 'belly';
                    if (z < -1) color = 'mainDark';
                    add(x, y, z, color);
                }
            }
        }
    }
    
    // === ROSTRUM (pointy nose/beak at front) ===
    for (let z = 5; z <= 7; z++) {
        const width = 7 - z; // Gets narrower toward front
        for (let x = -width; x <= width; x++) {
            add(x, 1, z, 'main');
            if (width > 0) add(x, 0, z, 'mainDark');
        }
    }
    // Rostrum tip
    add(0, 1, 8, 'mainDark');
    
    // === EYE STALKS (sticking out to sides) ===
    // Left eye stalk
    add(-5, 2, 2, 'eyeStalk');
    add(-6, 2, 2, 'eyeStalk');
    add(-6, 3, 2, 'eyeWhite'); // Eye at end
    add(-7, 2, 2, 'eyeWhite');
    add(-6, 2, 3, 'eyeHighlight'); // Highlight
    
    // Right eye stalk
    add(5, 2, 2, 'eyeStalk');
    add(6, 2, 2, 'eyeStalk');
    add(6, 3, 2, 'eyeWhite'); // Eye at end
    add(7, 2, 2, 'eyeWhite');
    add(6, 2, 3, 'eyeHighlight'); // Highlight
    
    // === ANTENNAE (long, curving back) ===
    // Left antenna (long feeler)
    for (let i = 0; i < 8; i++) {
        const xOff = -3 - Math.floor(i * 0.3);
        const yOff = 3 + Math.floor(i * 0.2);
        const zOff = 3 - i;
        add(xOff, yOff, zOff, i < 6 ? 'antenna' : 'antennaTip');
    }
    
    // Right antenna
    for (let i = 0; i < 8; i++) {
        const xOff = 3 + Math.floor(i * 0.3);
        const yOff = 3 + Math.floor(i * 0.2);
        const zOff = 3 - i;
        add(xOff, yOff, zOff, i < 6 ? 'antenna' : 'antennaTip');
    }
    
    // Short antennules (smaller inner antennae)
    add(-2, 3, 4, 'antenna');
    add(-2, 4, 5, 'antennaTip');
    add(2, 3, 4, 'antenna');
    add(2, 4, 5, 'antennaTip');
    
    // === NECK ===
    for (let x = -3; x <= 3; x++) {
        for (let z = -2; z <= 2; z++) {
            if (x*x + z*z <= 10) {
                add(x, -3, z, 'main');
            }
        }
    }
    
    return Array.from(voxelMap.values());
};

/**
 * Generate shrimp body - curved segmented body
 * Matches penguin body dimensions for cosmetic compatibility
 */
export const generateShrimpBody = () => {
    const bodyMap = new Map();
    
    // Shrimp body is segmented - create segments
    const segments = 6;
    
    for (let seg = 0; seg < segments; seg++) {
        const segY = -seg - 1; // Each segment is one voxel tall
        const segRadius = 5 - seg * 0.3; // Gets slightly narrower toward tail
        const isSegmentLine = (seg > 0); // Segment divider lines
        
        for (let x = -6; x <= 6; x++) {
            for (let z = -5; z <= 5; z++) {
                const dist = (x / segRadius) * (x / segRadius) + (z / (segRadius * 0.9)) * (z / (segRadius * 0.9));
                
                if (dist <= 1) {
                    let color = 'main';
                    
                    // Belly (front underside)
                    if (z > 2 && x > -4 && x < 4) color = 'belly';
                    
                    // Back darker
                    if (z < -2) color = 'mainDark';
                    
                    // Segment lines (horizontal darker lines between segments)
                    if (isSegmentLine && segY === -seg - 1) {
                        // Top edge of each segment is darker
                        const topEdge = bodyMap.get(`${x},${segY + 1},${z}`);
                        if (!topEdge) color = 'segment';
                    }
                    
                    bodyMap.set(`${x},${segY},${z}`, { x, y: segY, z, c: color });
                }
            }
        }
    }
    
    // Add upper body (connects to head)
    for (let y = 0; y <= 5; y++) {
        const radius = 5.5 - y * 0.3;
        for (let x = -6; x <= 6; x++) {
            for (let z = -5; z <= 5; z++) {
                const dist = (x / radius) * (x / radius) + (z / (radius * 0.9)) * (z / (radius * 0.9));
                
                if (dist <= 1) {
                    let color = 'main';
                    if (z > 2 && x > -4 && x < 4 && y < 4) color = 'belly';
                    if (z < -2) color = 'mainDark';
                    if (y > 3) color = 'mainLight';
                    bodyMap.set(`${x},${y},${z}`, { x, y, z, c: color });
                }
            }
        }
    }
    
    return Array.from(bodyMap.values());
};

/**
 * Generate shrimp arm/claw - small clawed arms
 * Positioned like penguin flippers for cosmetic compatibility
 */
export const generateShrimpArm = (isLeft) => {
    const voxels = [];
    const side = isLeft ? 1 : -1;
    const xBase = isLeft ? 5 : -5;
    
    // Upper arm
    for (let y = -1; y <= 1; y++) {
        voxels.push({ x: xBase, y, z: 0, c: 'main' });
        voxels.push({ x: xBase + side, y, z: 0, c: 'main' });
    }
    
    // Lower arm (angled forward)
    for (let i = 0; i < 3; i++) {
        voxels.push({ x: xBase + side, y: -2 - i, z: i, c: 'mainDark' });
    }
    
    // Small claw at end
    voxels.push({ x: xBase + side, y: -5, z: 3, c: 'legs' });
    voxels.push({ x: xBase + side * 2, y: -5, z: 4, c: 'legs' }); // Claw tip
    voxels.push({ x: xBase, y: -5, z: 4, c: 'legsDark' }); // Claw tip
    
    return voxels;
};

/**
 * Generate shrimp tail fan - fan-shaped tail flappers
 * This is the distinctive shrimp tail!
 * Tail extends BACKWARD (negative Z direction) from the body
 */
export const generateShrimpTail = () => {
    const voxels = [];
    
    // Tail Y position (at bottom of body segments)
    const TAIL_Y = -5;
    
    // Tail stem (connects body to fan) - extends backward in Z
    for (let z = -4; z >= -6; z--) {
        for (let x = -2; x <= 2; x++) {
            voxels.push({ x, y: TAIL_Y, z, c: 'main' });
            voxels.push({ x, y: TAIL_Y - 1, z, c: 'mainDark' });
        }
    }
    
    // === TAIL FAN (uropods) - extends backward as a horizontal fan ===
    // Center fan piece (telson)
    for (let z = -7; z >= -10; z--) {
        const width = Math.min(3, -7 - z + 2);
        for (let x = -width; x <= width; x++) {
            voxels.push({ x, y: TAIL_Y, z, c: 'tailFan' });
            voxels.push({ x, y: TAIL_Y - 1, z, c: 'tailEdge' });
        }
    }
    
    // Left outer fan (left uropod) - spreads out to the left
    for (let i = 0; i < 4; i++) {
        const z = -7 - i;
        for (let x = -3 - i; x <= -1; x++) {
            voxels.push({ x, y: TAIL_Y, z, c: 'tailFan' });
            if (i < 3) voxels.push({ x, y: TAIL_Y - 1, z, c: 'tailEdge' });
        }
    }
    
    // Right outer fan (right uropod) - spreads out to the right
    for (let i = 0; i < 4; i++) {
        const z = -7 - i;
        for (let x = 1; x <= 3 + i; x++) {
            voxels.push({ x, y: TAIL_Y, z, c: 'tailFan' });
            if (i < 3) voxels.push({ x, y: TAIL_Y - 1, z, c: 'tailEdge' });
        }
    }
    
    return voxels;
};

/**
 * Generate shrimp legs (swimmerets/pleopods)
 * Multiple small legs on underside
 */
export const generateShrimpLegs = () => {
    const voxels = [];
    
    // 4 pairs of small legs along belly
    for (let pair = 0; pair < 4; pair++) {
        const y = -2 - pair;
        
        // Left leg
        voxels.push({ x: 2, y, z: 4, c: 'legs' });
        voxels.push({ x: 3, y: y - 1, z: 5, c: 'legsDark' });
        
        // Right leg
        voxels.push({ x: -2, y, z: 4, c: 'legs' });
        voxels.push({ x: -3, y: y - 1, z: 5, c: 'legsDark' });
    }
    
    return voxels;
};

/**
 * Generate foot placeholder (for animation compatibility)
 * Shrimp doesn't have distinct feet, but we need this for the builder
 */
export const generateShrimpFoot = (isLeft) => {
    // Return empty - tail flappers serve as the "feet" visually
    return [];
};

/**
 * Get pivot points for animation
 * Tail pivot is at the connection point to body, allowing up/down flapping
 */
export const getShrimpPivots = () => ({
    head: { x: 0, y: 6, z: 0 },
    body: { x: 0, y: 0, z: 0 },
    flipperLeft: { x: 5, y: 0, z: 0 },  // Arms/claws
    flipperRight: { x: -5, y: 0, z: 0 },
    footLeft: { x: 3, y: -5, z: -4 },   // Unused but needed for compat
    footRight: { x: -3, y: -5, z: -4 },
    tail: { x: 0, y: -5, z: -4 },       // Tail pivot at body connection
});

/**
 * Generate complete shrimp model
 */
export const generateShrimpComplete = () => {
    const voxelMap = new Map();
    
    const addVoxels = (voxels) => {
        voxels.forEach(v => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) {
                voxelMap.set(key, v);
            }
        });
    };
    
    addVoxels(generateShrimpHead());
    addVoxels(generateShrimpBody());
    addVoxels(generateShrimpArm(true));
    addVoxels(generateShrimpArm(false));
    addVoxels(generateShrimpTail());
    addVoxels(generateShrimpLegs());
    
    return Array.from(voxelMap.values());
};

// Export generators object for registry
export const ShrimpGenerators = {
    head: generateShrimpHead,
    body: generateShrimpBody,
    flipperLeft: () => generateShrimpArm(true),
    flipperRight: () => generateShrimpArm(false),
    footLeft: () => generateShrimpFoot(true),
    footRight: () => generateShrimpFoot(false),
    tail: generateShrimpTail,
    legs: generateShrimpLegs,
    complete: generateShrimpComplete,
    pivots: getShrimpPivots,
};

export default ShrimpGenerators;

