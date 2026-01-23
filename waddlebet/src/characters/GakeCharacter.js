/**
 * GakeCharacter - Patrick Star style character model
 * Built to match penguin structure exactly for proper animations
 * 
 * Features:
 * - Pink cone-shaped body (wider at bottom, narrower at top)
 * - Green shorts with purple flower pattern
 * - Uses same pivot points and limb structure as penguin
 * - Customizable eyes and mouth
 */

// Gake color palette - Patrick pink
export const GAKE_PALETTE = {
    // Main skin colors (pink)
    skin: '#FFB5C5',         // Main pink
    skinLight: '#FFC8D8',    // Light pink (highlights)
    skinDark: '#E89AAA',     // Dark pink (shadows)
    skinDeep: '#D08090',     // Deep pink (deep shadows)
    
    // Belly (slightly lighter pink)
    belly: '#FFD0DD',        // Lighter pink belly
    bellyLight: '#FFE0EA',   // Even lighter
    
    // Shorts (green like Patrick's)
    shorts: '#7EC850',       // Green shorts
    shortsDark: '#5AA030',   // Darker green
    shortsFlower: '#9040A0', // Purple flower spots
    
    // For cosmetic compatibility
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1A1A',
    beakOrange: '#FF8C00',
};

// Head offset (penguin is 6, add BODY_Y_OFFSET for Gake)
const HEAD_Y_OFFSET = 6 + 2; // 8

/**
 * Generate Gake's head - round pink head like penguin
 * Raised to match body offset
 */
export const generateGakeHead = () => {
    const voxels = [];
    const r = 4.5;
    
    // Same as penguin head but raised
    for (let x = -r; x <= r; x++) {
        for (let y = -r; y <= r; y++) {
            for (let z = -r; z <= r; z++) {
                if (x * x + y * y + z * z <= r * r) {
                    let color = 'skin';
                    // Lighter on top
                    if (y > 2) color = 'skinLight';
                    // Darker on sides  
                    if (Math.abs(x) > r * 0.7) color = 'skinDark';
                    // Subtle shading on back
                    if (z < -2) color = 'skinDark';
                    voxels.push({ x, y: y + HEAD_Y_OFFSET, z, c: color });
                }
            }
        }
    }
    
    // Small pointed top
    for (let y = 4; y <= 6; y++) {
        const radius = Math.max(1, 3 - (y - 4));
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                if (x * x + z * z <= radius * radius) {
                    voxels.push({ x, y: y + HEAD_Y_OFFSET, z, c: 'skinLight' });
                }
            }
        }
    }
    
    return voxels;
};

// Body offset to raise it higher
const BODY_Y_OFFSET = 3;

/**
 * Generate Gake body - cone-shaped like Patrick
 * Raised slightly higher than penguin
 */
export const generateGakeBody = () => {
    const bodyMap = new Map();
    
    // Same Y range as penguin but with offset applied
    for (let y = -7; y <= 5; y++) {
        // Cone shape: wider at bottom, narrower at top
        const yNorm = (y + 7) / 12; // 0 at bottom, 1 at top
        const radius = 6 - yNorm * 2; // 6 at bottom, 4 at top
        
        for (let x = -Math.ceil(radius); x <= Math.ceil(radius); x++) {
            for (let z = -5; z <= 5; z++) {
                const dist = Math.sqrt(x * x + z * z);
                
                if (dist <= radius) {
                    let color = 'skin';
                    
                    // Big belly on front (like penguin white belly area)
                    if (z > 2 && x > -4 && x < 4 && y < 3 && y > -6) {
                        color = 'belly';
                    }
                    
                    // Darker on sides
                    if (Math.abs(x) > radius * 0.7) {
                        color = 'skinDark';
                    }
                    
                    // Back slightly darker
                    if (z < -2) {
                        color = 'skinDark';
                    }
                    
                    // GREEN SHORTS at bottom (y=-7 to y=-4)
                    if (y <= -4) {
                        color = 'shorts';
                        if (Math.abs(x) > radius * 0.6 || z < -1) {
                            color = 'shortsDark';
                        }
                        
                        // Purple flower spots on shorts
                        if (y === -5 && x === 2 && z > 0) color = 'shortsFlower';
                        if (y === -6 && x === -3 && z > 1) color = 'shortsFlower';
                        if (y === -5 && x === -1 && z > 2) color = 'shortsFlower';
                        if (y === -6 && x === 1 && z > 0) color = 'shortsFlower';
                    }
                    
                    const finalY = y + BODY_Y_OFFSET;
                    bodyMap.set(`${x},${finalY},${z}`, { x, y: finalY, z, c: color });
                }
            }
        }
    }
    
    return Array.from(bodyMap.values());
};

/**
 * Generate Gake's flipper - like penguin flippers but raised
 * Raised to match body offset
 */
export const generateGakeArm = (isLeft) => {
    const voxels = [];
    
    // Same as penguin flipper but raised by BODY_Y_OFFSET
    for (let x = 0; x < 3; x++) {
        for (let y = -4; y < 2; y++) {
            for (let z = -1; z < 2; z++) {
                if (x === 2 && (y > 0 || y < -3)) continue;
                voxels.push({
                    x: isLeft ? x + 5 : -x - 5,
                    y: y + BODY_Y_OFFSET,
                    z,
                    c: 'skin'
                });
            }
        }
    }
    
    return voxels;
};

/**
 * Generate Gake's foot - same as penguin feet, just pink
 */
export const generateGakeFoot = (isLeft) => {
    const voxels = [];
    const xOffset = isLeft ? 3 : -3;
    
    // Same as penguin foot
    for (let x = -2; x <= 2; x++) {
        for (let z = 0; z <= 4; z++) {
            voxels.push({
                x: x + xOffset,
                y: -7,
                z: z + 1,
                c: 'skin'  // Pink instead of orange
            });
        }
    }
    
    return voxels;
};

/**
 * Get pivot points for animation - raised to match body offset
 */
export const getGakePivots = () => ({
    head: { x: 0, y: HEAD_Y_OFFSET, z: 0 },
    body: { x: 0, y: BODY_Y_OFFSET, z: 0 },
    armLeft: { x: 5, y: BODY_Y_OFFSET, z: 0 },
    armRight: { x: -5, y: BODY_Y_OFFSET, z: 0 },
    footLeft: { x: 3, y: -6, z: 1 },      // Feet stay on ground
    footRight: { x: -3, y: -6, z: 1 },    // Feet stay on ground
});

/**
 * Generate complete Gake model
 */
export const generateGakeComplete = () => {
    const voxelMap = new Map();
    
    const addVoxels = (voxels) => {
        voxels.forEach(v => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) {
                voxelMap.set(key, v);
            }
        });
    };
    
    addVoxels(generateGakeHead());
    addVoxels(generateGakeBody());
    addVoxels(generateGakeArm(true));
    addVoxels(generateGakeArm(false));
    addVoxels(generateGakeFoot(true));
    addVoxels(generateGakeFoot(false));
    
    return Array.from(voxelMap.values());
};

// Export generators object for registry
export const GakeGenerators = {
    head: generateGakeHead,
    body: generateGakeBody,
    armLeft: () => generateGakeArm(true),
    armRight: () => generateGakeArm(false),
    footLeft: () => generateGakeFoot(true),
    footRight: () => generateGakeFoot(false),
    complete: generateGakeComplete,
    pivots: getGakePivots,
};

export default GakeGenerators;
