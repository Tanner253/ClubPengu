/**
 * DuckCharacter - The Duck character model
 * A cute voxel duck with a flat bill, wings, and webbed feet
 * 
 * Features:
 * - Rounded duck head with flat orange bill
 * - Round body with white belly
 * - Wing flippers
 * - Orange webbed feet
 */

// Duck color palette - Classic yellow duck
export const DUCK_PALETTE = {
    // Main feather colors
    main: '#F4D03F',         // Bright yellow
    mainLight: '#F9E79F',    // Light yellow
    mainDark: '#D4AC0D',     // Dark yellow/gold
    mainDeep: '#B7950B',     // Deep gold
    
    // Belly/chest (lighter/white)
    belly: '#FDFEFE',        // White belly
    
    // Bill and feet
    bill: '#E67E22',         // Orange bill
    billDark: '#CA6F1E',     // Darker orange
    feet: '#E67E22',         // Orange feet
    
    // Eyes
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1A1A',
    
    // Wing tips
    wingTip: '#E5BE01',
};

// White Duck palette - Like a farm duck
export const WHITE_DUCK_PALETTE = {
    main: '#FDFEFE',
    mainLight: '#FFFFFF',
    mainDark: '#E5E7E9',
    mainDeep: '#D5D8DC',
    belly: '#FFFFFF',
    bill: '#E67E22',
    billDark: '#CA6F1E',
    feet: '#E67E22',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1A1A',
    wingTip: '#F0F0F0',
};

// Mallard Duck palette - Green head male duck
export const MALLARD_DUCK_PALETTE = {
    main: '#1E8449',         // Green head
    mainLight: '#27AE60',
    mainDark: '#196F3D',
    mainDeep: '#145A32',
    belly: '#A6ACAF',        // Gray body
    bill: '#D4AC0D',         // Yellow-ish bill
    billDark: '#B7950B',
    feet: '#E67E22',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1A1A',
    wingTip: '#5D6D7E',
};

// Rubber Duck palette - Classic bath toy
export const RUBBER_DUCK_PALETTE = {
    main: '#FFD700',         // Bright gold
    mainLight: '#FFEB3B',
    mainDark: '#FFC107',
    mainDeep: '#FF9800',
    belly: '#FFE066',
    bill: '#FF6B00',         // Bright orange
    billDark: '#E65100',
    feet: '#FF6B00',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#000000',
    wingTip: '#FFD54F',
};

// All duck palettes
export const DUCK_PALETTES = {
    yellow: DUCK_PALETTE,
    white: WHITE_DUCK_PALETTE,
    mallard: MALLARD_DUCK_PALETTE,
    rubber: RUBBER_DUCK_PALETTE,
};

// Y offset to position the duck properly
const Y_OFFSET = 0;

/**
 * Generate the duck's head with bill
 * Uses even-numbered widths for proper centering
 */
export const generateDuckHead = () => {
    const voxelMap = new Map();
    
    const addVoxel = (x, y, z, c) => {
        const key = `${x},${y},${z}`;
        // Later additions overwrite earlier ones (eyes overwrite head)
        voxelMap.set(key, { x, y, z: z + Y_OFFSET, c });
    };
    
    // Head base Y position
    const headY = 6;
    
    // Build head as a rounded box for clean even dimensions (10 wide, 10 tall, 8 deep)
    // X: -5 to 4 (10 voxels, centered between -0.5)
    // Actually let's use -4 to 5 for proper centering around bill
    for (let x = -4; x <= 4; x++) {
        for (let y = 0; y <= 8; y++) {
            for (let z = -4; z <= 4; z++) {
                // Create rounded head shape
                const distFromCenter = Math.sqrt(x*x + (y-4)*(y-4) + z*z);
                if (distFromCenter <= 5) {
                    let color = 'main';
                    // Top lighter
                    if (y > 6) color = 'mainLight';
                    // Front/face area - white cheeks
                    if (z >= 3 && y >= 2 && y <= 5 && Math.abs(x) <= 2) color = 'belly';
                    addVoxel(x, y + headY, z, color);
                }
            }
        }
    }
    
    // Bill - flat duck bill, even width (6 wide: -3 to 2, or use -2 to 2 for 5)
    // Using -2 to 2 for 5 wide bill centered at 0
    for (let z = 5; z <= 8; z++) {
        const billDepth = z - 5;
        // Bill gets slightly narrower at tip
        const halfWidth = billDepth < 2 ? 2 : 1;
        
        for (let x = -halfWidth; x <= halfWidth; x++) {
            // Bill is 2 voxels tall
            addVoxel(x, headY + 3, z, 'bill');
            addVoxel(x, headY + 4, z, 'billDark');
        }
    }
    
    // Eyes - positioned symmetrically on face (2x2 each)
    // Left eye at x = -3, -2
    addVoxel(-3, headY + 5, 4, 'eyeWhite');
    addVoxel(-3, headY + 6, 4, 'eyeWhite');
    addVoxel(-2, headY + 5, 4, 'eyeWhite');
    addVoxel(-2, headY + 6, 4, 'eyeWhite');
    // Left pupil
    addVoxel(-3, headY + 5, 5, 'eyeBlack');
    addVoxel(-3, headY + 6, 5, 'eyeBlack');
    
    // Right eye at x = 2, 3
    addVoxel(2, headY + 5, 4, 'eyeWhite');
    addVoxel(2, headY + 6, 4, 'eyeWhite');
    addVoxel(3, headY + 5, 4, 'eyeWhite');
    addVoxel(3, headY + 6, 4, 'eyeWhite');
    // Right pupil
    addVoxel(3, headY + 5, 5, 'eyeBlack');
    addVoxel(3, headY + 6, 5, 'eyeBlack');
    
    // Small tuft on top of head
    addVoxel(0, headY + 9, 0, 'mainLight');
    addVoxel(-1, headY + 9, -1, 'mainLight');
    addVoxel(1, headY + 9, -1, 'mainLight');
    
    return Array.from(voxelMap.values());
};

/**
 * Generate the duck's body
 * Uses even dimensions for proper alignment with head
 */
export const generateDuckBody = () => {
    const voxels = [];
    
    const addVoxel = (x, y, z, c) => {
        voxels.push({ x, y: y + Y_OFFSET, z, c });
    };
    
    // Duck body - ellipsoid shape
    // Centered at x=0, body from y=-7 to y=5
    for (let x = -5; x <= 5; x++) {
        for (let y = -7; y <= 5; y++) {
            for (let z = -4; z <= 3; z++) {  // Reduced front z to avoid belly button
                // Ellipsoid: (x/5)² + (y/6)² + (z/3.5)² <= 1
                const dx = x / 5;
                const dy = y / 6;
                const dz = z / 3.5;
                if (dx*dx + dy*dy + dz*dz <= 1) {
                    let color = 'main';
                    // White belly (front) - larger area
                    if (z >= 1 && Math.abs(x) <= 3 && y <= 3 && y >= -5) {
                        color = 'belly';
                    }
                    // Darker on sides
                    else if (Math.abs(x) >= 4) color = 'mainDark';
                    // Top/back lighter
                    else if (y >= 4) color = 'mainLight';
                    
                    addVoxel(x, y, z, color);
                }
            }
        }
    }
    
    // Tail is now a separate animated part - not included in body
    
    return voxels;
};

/**
 * Generate duck's tail (separate for animation)
 * Tail sticks OUT perpendicular to the body (pointing backward)
 */
export const generateDuckTail = () => {
    const voxels = [];
    
    // Duck tail pointing backward (perpendicular to body)
    // Base attached to body at z=-4
    voxels.push({ x: -1, y: 0 + Y_OFFSET, z: -5, c: 'main' });
    voxels.push({ x: 0, y: 0 + Y_OFFSET, z: -5, c: 'main' });
    voxels.push({ x: 1, y: 0 + Y_OFFSET, z: -5, c: 'main' });
    voxels.push({ x: -1, y: 1 + Y_OFFSET, z: -5, c: 'main' });
    voxels.push({ x: 0, y: 1 + Y_OFFSET, z: -5, c: 'main' });
    voxels.push({ x: 1, y: 1 + Y_OFFSET, z: -5, c: 'main' });
    // Tail extends further back and curves up
    voxels.push({ x: 0, y: 1 + Y_OFFSET, z: -6, c: 'mainLight' });
    voxels.push({ x: 0, y: 2 + Y_OFFSET, z: -6, c: 'mainLight' });
    voxels.push({ x: 0, y: 2 + Y_OFFSET, z: -7, c: 'mainLight' });
    voxels.push({ x: 0, y: 3 + Y_OFFSET, z: -7, c: 'mainLight' });
    
    return voxels;
};

/**
 * Generate duck's wing (like penguin flippers)
 * Wings connect to body at x = ±5
 */
export const generateDuckWing = (isLeft) => {
    const voxels = [];
    // Wings start connected to body (body edge is at x=±5)
    const xStart = isLeft ? 5 : -5;
    const xDir = isLeft ? 1 : -1;
    
    // Wing: 3 voxels out, 6 tall, 2 deep
    for (let i = 0; i < 3; i++) {
        const x = xStart + (i * xDir);
        for (let y = -3; y <= 2; y++) {
            // Taper at tip
            if (i === 2 && (y > 1 || y < -2)) continue;
            
            let color = 'main';
            if (i === 2) color = 'wingTip';
            else if (y < -1) color = 'mainDark';
            
            voxels.push({ x, y: y + Y_OFFSET, z: 0, c: color });
            if (i < 2) {
                voxels.push({ x, y: y + Y_OFFSET, z: 1, c: color });
            }
        }
    }
    return voxels;
};

/**
 * Generate duck's webbed feet
 */
export const generateDuckFoot = (isLeft) => {
    const voxels = [];
    // Offset: left foot at x=3, right foot at x=-3 (spread apart more)
    const xOffset = isLeft ? 3 : -3;
    
    // Short leg
    voxels.push({ x: xOffset, y: -7 + Y_OFFSET, z: 1, c: 'feet' });
    voxels.push({ x: xOffset, y: -8 + Y_OFFSET, z: 1, c: 'feet' });
    
    // Webbed foot - 3 wide, flat (smaller to avoid overlap)
    const footY = -8 + Y_OFFSET;
    for (let x = -1; x <= 1; x++) {
        voxels.push({ x: x + xOffset, y: footY, z: 2, c: 'feet' });
        voxels.push({ x: x + xOffset, y: footY, z: 3, c: 'feet' });
    }
    // Front toes (webbed) - 3 toes
    voxels.push({ x: xOffset - 1, y: footY, z: 4, c: 'feet' });
    voxels.push({ x: xOffset, y: footY, z: 4, c: 'feet' });
    voxels.push({ x: xOffset + 1, y: footY, z: 4, c: 'feet' });
    // Toe tips
    voxels.push({ x: xOffset - 1, y: footY, z: 5, c: 'billDark' });
    voxels.push({ x: xOffset, y: footY, z: 5, c: 'feet' });
    voxels.push({ x: xOffset + 1, y: footY, z: 5, c: 'billDark' });
    
    return voxels;
};

/**
 * Generate complete duck model
 */
export const generateDuckComplete = () => {
    const voxelMap = new Map();
    
    const addVoxels = (voxels) => {
        voxels.forEach(v => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) {
                voxelMap.set(key, v);
            }
        });
    };
    
    addVoxels(generateDuckHead());
    addVoxels(generateDuckBody());
    addVoxels(generateDuckWing(true));
    addVoxels(generateDuckWing(false));
    addVoxels(generateDuckFoot(true));
    addVoxels(generateDuckFoot(false));
    addVoxels(generateDuckTail());
    
    return Array.from(voxelMap.values());
};

/**
 * Get pivot points for animation (matching penguin structure)
 */
export const getDuckPivots = () => ({
    head: { x: 0, y: 6 + Y_OFFSET, z: 0 },
    body: { x: 0, y: 0 + Y_OFFSET, z: 0 },
    armLeft: { x: 5, y: 0 + Y_OFFSET, z: 0 },   // Wing pivots
    armRight: { x: -5, y: 0 + Y_OFFSET, z: 0 },
    legLeft: { x: 3, y: -7 + Y_OFFSET, z: 1 },  // Spread feet
    legRight: { x: -3, y: -7 + Y_OFFSET, z: 1 },
    tail: { x: 0, y: 1 + Y_OFFSET, z: -5 },    // Tail pivot for wagging (at base)
});

// Export generators object for registry (matches penguin structure)
export const DuckGenerators = {
    head: generateDuckHead,
    body: generateDuckBody,
    armLeft: () => generateDuckWing(true),
    armRight: () => generateDuckWing(false),
    legLeft: () => generateDuckFoot(true),
    legRight: () => generateDuckFoot(false),
    tail: generateDuckTail,
    complete: generateDuckComplete,
    pivots: getDuckPivots,
};

export default DuckGenerators;

