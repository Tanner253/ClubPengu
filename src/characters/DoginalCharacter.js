/**
 * DoginalCharacter - The Doginal dog character model
 * A cute voxel dog with floppy ears, snout, and wagging tail
 * 
 * Features:
 * - Rounded dog head with snout
 * - Floppy ears
 * - Big friendly eyes
 * - Dog body with tail
 * - Paws instead of penguin feet
 */

// Doginal color palette - Golden/tan dog colors (default)
export const DOGINAL_PALETTE = {
    // Main fur colors
    main: '#D4A04A',         // Golden tan
    mainLight: '#E8C06A',    // Light golden
    mainDark: '#B88030',     // Dark golden/brown
    mainDeep: '#8B6020',     // Deep brown
    
    // Belly/chest (lighter)
    belly: '#F0D890',        // Cream/light tan
    
    // Nose and mouth
    nose: '#2A2020',         // Black nose
    tongue: '#E87080',       // Pink tongue
    mouthLine: '#6A4030',    // Mouth line
    
    // Eyes
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#4A3020',     // Brown iris
    
    // Inner ear
    earInner: '#E0A080',     // Pink-ish inner ear
};

// Black Dog palette - sleek black coat
export const BLACK_DOG_PALETTE = {
    main: '#2A2A2A',
    mainLight: '#404040',
    mainDark: '#1A1A1A',
    mainDeep: '#101010',
    belly: '#3A3A3A',
    nose: '#0A0A0A',
    tongue: '#E87080',
    mouthLine: '#1A1A1A',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#000000',
    eyeBrown: '#4A3020',
    earInner: '#3A2A2A',
};

// White Dog palette - fluffy white coat
export const WHITE_DOG_PALETTE = {
    main: '#F5F5F5',
    mainLight: '#FFFFFF',
    mainDark: '#E0E0E0',
    mainDeep: '#C8C8C8',
    belly: '#FFFFFF',
    nose: '#2A2020',
    tongue: '#E87080',
    mouthLine: '#8A8A8A',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#4A3020',
    earInner: '#FFD0D0',
};

// Brown Dog palette - chocolate brown
export const BROWN_DOG_PALETTE = {
    main: '#6B4423',
    mainLight: '#8B5A2B',
    mainDark: '#4A2F15',
    mainDeep: '#3A2010',
    belly: '#9B7653',
    nose: '#1A1010',
    tongue: '#E87080',
    mouthLine: '#3A2010',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#3A2010',
    earInner: '#8B5A4B',
};

// Husky palette - gray/white mix
export const HUSKY_DOG_PALETTE = {
    main: '#7A8A9A',
    mainLight: '#B0C0D0',
    mainDark: '#5A6A7A',
    mainDeep: '#4A5A6A',
    belly: '#E8F0F8',
    nose: '#2A2020',
    tongue: '#E87080',
    mouthLine: '#4A5A6A',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#6080C0',  // Blue-ish husky eyes
    earInner: '#C0A0A0',
};

// Dalmatian palette - white with spots pattern
export const DALMATIAN_DOG_PALETTE = {
    main: '#F8F8F8',
    mainLight: '#FFFFFF',
    mainDark: '#2A2A2A',  // Spots color
    mainDeep: '#1A1A1A',
    belly: '#FFFFFF',
    nose: '#1A1010',
    tongue: '#E87080',
    mouthLine: '#6A6A6A',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#4A3020',
    earInner: '#FFD0D0',
};

// Red/Rust Dog palette - Irish Setter style
export const RED_DOG_PALETTE = {
    main: '#B84020',
    mainLight: '#D86040',
    mainDark: '#8A3018',
    mainDeep: '#6A2010',
    belly: '#E88060',
    nose: '#2A1010',
    tongue: '#E87080',
    mouthLine: '#5A2010',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#4A2010',
    earInner: '#C06050',
};

// Corgi palette - orange/white
export const CORGI_DOG_PALETTE = {
    main: '#E8A040',
    mainLight: '#F8C060',
    mainDark: '#C88020',
    mainDeep: '#A06010',
    belly: '#FFFFFF',
    nose: '#2A2020',
    tongue: '#E87080',
    mouthLine: '#6A4030',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#4A3020',
    earInner: '#E8A080',
};

// All dog palettes for easy access
export const DOG_PALETTES = {
    golden: DOGINAL_PALETTE,
    black: BLACK_DOG_PALETTE,
    white: WHITE_DOG_PALETTE,
    brown: BROWN_DOG_PALETTE,
    husky: HUSKY_DOG_PALETTE,
    dalmatian: DALMATIAN_DOG_PALETTE,
    red: RED_DOG_PALETTE,
    corgi: CORGI_DOG_PALETTE,
};

/**
 * Generate a custom dog palette from primary and secondary colors
 * This allows freestyle color picking like penguin feathers!
 * @param {string} primary - Primary fur color (hex)
 * @param {string} secondary - Secondary/belly color (hex)
 * @returns {Object} A complete dog palette
 */
export const generateDogPalette = (primary, secondary) => {
    // Helper to darken/lighten hex colors
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
        belly: secondary,
        nose: '#2A2020',
        tongue: '#E87080',
        mouthLine: adjustColor(primary, -30),
        eyeWhite: '#FFFFFF',
        eyeBlack: '#1A1010',
        eyeBrown: '#4A3020',
        earInner: adjustColor(secondary, -10),
    };
};

// Y offset to position the dog properly (lower than original to not float)
const Y_OFFSET = 4;

/**
 * Generate the dog's head with snout and ears
 */
export const generateDoginalHead = () => {
    const voxelMap = new Map();
    const Z_HEAD_OFFSET = 3; // Push head forward on the body
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z) + Z_HEAD_OFFSET;
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    // Main head - rounded dog shape
    for (let y = 0; y <= 8; y++) {
        let radiusX, radiusZ;
        
        if (y <= 2) {
            // Bottom of head (connects to neck)
            const t = y / 2;
            radiusX = 3 + t * 1.5;
            radiusZ = 2.5 + t * 1;
        } else if (y <= 6) {
            // Main head volume
            radiusX = 4.5;
            radiusZ = 3.5;
        } else {
            // Top of head (rounds off)
            const t = (y - 6) / 2;
            radiusX = 4.5 * (1 - t * 0.4);
            radiusZ = 3.5 * (1 - t * 0.3);
        }
        
        for (let x = -Math.ceil(radiusX); x <= Math.ceil(radiusX); x++) {
            for (let z = -Math.ceil(radiusZ); z <= Math.ceil(radiusZ); z++) {
                const distX = x / radiusX;
                const distZ = z / radiusZ;
                
                if (distX * distX + distZ * distZ <= 1) {
                    let color = 'main';
                    // Top highlights
                    if (y > 5) color = 'mainLight';
                    // Side shadows
                    if (Math.abs(x) > radiusX * 0.7) color = 'mainDark';
                    // Cheeks/lower face lighter
                    if (y < 4 && z > 1) color = 'belly';
                    addVoxel(x, y, z, color);
                }
            }
        }
    }
    
    // Snout - protruding forward
    for (let z = 4; z <= 8; z++) {
        const snoutProgress = (z - 4) / 4;
        const radiusX = 2.5 - snoutProgress * 1;
        const radiusY = 2 - snoutProgress * 0.8;
        const centerY = 2 - snoutProgress * 0.5;
        
        for (let x = -Math.ceil(radiusX); x <= Math.ceil(radiusX); x++) {
            for (let y = 0; y <= Math.ceil(radiusY * 2); y++) {
                const adjustedY = y - radiusY + centerY;
                const distX = x / radiusX;
                const distY = adjustedY / radiusY;
                
                if (distX * distX + distY * distY <= 1) {
                    let color = 'main';
                    // Top of snout lighter
                    if (adjustedY > 0.5) color = 'mainLight';
                    // Bottom of snout (belly color)
                    if (adjustedY < -0.3) color = 'belly';
                    addVoxel(x, adjustedY + 2, z, color);
                }
            }
        }
    }
    
    // Nose - black at end of snout
    addVoxel(0, 2, 8, 'nose');
    addVoxel(1, 2, 8, 'nose');
    addVoxel(-1, 2, 8, 'nose');
    addVoxel(0, 3, 8, 'nose');
    addVoxel(0, 2, 9, 'nose');
    
    // Eyes - big and friendly, positioned on head
    const eyeY = 5;
    const eyeZ = 3;
    const eyeSpacing = 3;
    
    // Left eye
    addVoxel(-eyeSpacing, eyeY, eyeZ, 'eyeWhite');
    addVoxel(-eyeSpacing, eyeY + 1, eyeZ, 'eyeWhite');
    addVoxel(-eyeSpacing - 1, eyeY, eyeZ, 'eyeWhite');
    addVoxel(-eyeSpacing, eyeY, eyeZ + 1, 'eyeBlack');  // Pupil
    addVoxel(-eyeSpacing, eyeY + 1, eyeZ + 1, 'eyeBrown');  // Iris
    
    // Right eye
    addVoxel(eyeSpacing, eyeY, eyeZ, 'eyeWhite');
    addVoxel(eyeSpacing, eyeY + 1, eyeZ, 'eyeWhite');
    addVoxel(eyeSpacing + 1, eyeY, eyeZ, 'eyeWhite');
    addVoxel(eyeSpacing, eyeY, eyeZ + 1, 'eyeBlack');  // Pupil
    addVoxel(eyeSpacing, eyeY + 1, eyeZ + 1, 'eyeBrown');  // Iris
    
    // NOTE: Ears are now separate animated parts - see generateDoginalEar
    
    // Mouth/smile line
    for (let x = -1; x <= 1; x++) {
        addVoxel(x, 1, 6, 'mouthLine');
    }
    
    // Tongue sticking out slightly
    addVoxel(0, 0, 7, 'tongue');
    
    return Array.from(voxelMap.values());
};

/**
 * Generate the dog's body
 */
export const generateDoginalBody = () => {
    const voxelMap = new Map();
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    // Dog body - rounder than penguin
    for (let y = -8; y <= 0; y++) {
        const t = (y + 8) / 8;
        const sphereT = Math.sin(t * Math.PI);
        const radiusX = 5 * sphereT + 1;
        const radiusZ = 4 * sphereT + 1;
        
        for (let x = -Math.ceil(radiusX); x <= Math.ceil(radiusX); x++) {
            for (let z = -Math.ceil(radiusZ); z <= Math.ceil(radiusZ); z++) {
                const distX = radiusX > 0.5 ? x / radiusX : 0;
                const distZ = radiusZ > 0.5 ? z / radiusZ : 0;
                
                if (distX * distX + distZ * distZ <= 1) {
                    let color = 'main';
                    // Belly (front, lower)
                    if (z > 1 && y < -2) color = 'belly';
                    // Top of back darker
                    if (y > -2) color = 'mainDark';
                    // Sides
                    if (Math.abs(x) > radiusX * 0.7) color = 'mainDark';
                    addVoxel(x, y, z, color);
                }
            }
        }
    }
    
    // NOTE: Tail is now a separate animated part - see generateDoginalTail
    
    return Array.from(voxelMap.values());
};

/**
 * Generate dog's front legs/paws
 */
export const generateDoginalArm = (isLeft) => {
    const voxelMap = new Map();
    const side = isLeft ? 1 : -1;
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    const shoulderX = side * 4;
    const shoulderY = -4; // Raised by 2 from -6
    
    // Front leg - moved forward by 1 (Z+1)
    for (let i = 0; i < 8; i++) {
        const legX = shoulderX + side * (i < 3 ? i * 0.3 : 1);
        const legY = shoulderY - i;
        addVoxel(legX, legY, 3, 'main');
        addVoxel(legX, legY, 4, 'main');
    }
    
    // Paw - moved forward by 1 (Z+1)
    const pawY = shoulderY - 8;
    addVoxel(shoulderX + side, pawY, 4, 'mainLight');
    addVoxel(shoulderX + side, pawY, 5, 'mainLight');
    addVoxel(shoulderX + side, pawY, 6, 'mainLight');
    // Toe beans (darker)
    addVoxel(shoulderX + side, pawY - 1, 5, 'mainDark');
    addVoxel(shoulderX + side, pawY - 1, 6, 'mainDark');
    
    return Array.from(voxelMap.values());
};

/**
 * Generate dog's back legs
 */
export const generateDoginalLeg = (isLeft) => {
    const voxelMap = new Map();
    const side = isLeft ? 1 : -1;
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    const hipX = side * 3;
    const hipY = -6;
    
    // Back leg (thicker at top) - moved backwards towards tail
    for (let i = 0; i < 6; i++) {
        const legX = hipX;
        const legY = hipY - i;
        addVoxel(legX, legY, -7, 'main');
        addVoxel(legX, legY, -8, 'main');
        if (i < 3) {
            addVoxel(legX + side, legY, -7, 'mainDark');
        }
    }
    
    // Back paw
    const pawY = hipY - 6;
    addVoxel(hipX, pawY, -7, 'mainLight');
    addVoxel(hipX, pawY, -6, 'mainLight');
    addVoxel(hipX, pawY, -5, 'mainLight');
    // Toe beans
    addVoxel(hipX, pawY - 1, -6, 'mainDark');
    addVoxel(hipX, pawY - 1, -5, 'mainDark');
    
    return Array.from(voxelMap.values());
};

/**
 * Generate dog's tail (separate for animation)
 */
export const generateDoginalTail = () => {
    const voxelMap = new Map();
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    // Tail - curving up and back
    for (let i = 0; i < 5; i++) {
        const tailX = 0;
        const tailY = -3 + i * 0.5;
        const tailZ = -4 - i;
        addVoxel(tailX, tailY, tailZ, 'main');
        if (i < 3) {
            addVoxel(tailX + 1, tailY, tailZ, 'mainLight');
        }
    }
    // Fluffy tail tip
    addVoxel(0, -1, -8, 'mainLight');
    addVoxel(1, -1, -8, 'mainLight');
    addVoxel(0, 0, -8, 'mainLight');
    
    return Array.from(voxelMap.values());
};

/**
 * Generate dog's ear (separate for animation)
 */
export const generateDoginalEar = (isLeft) => {
    const voxelMap = new Map();
    const side = isLeft ? -1 : 1;
    const Z_HEAD_OFFSET = 3; // Match head forward offset
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z) + Z_HEAD_OFFSET;
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    // Floppy ear - droops down on side
    for (let i = 0; i < 6; i++) {
        const earX = side * (5 + (i < 2 ? 0 : 1));
        const earY = 7 - i;
        const earZ = 0;
        addVoxel(earX, earY, earZ, 'main');
        addVoxel(earX, earY, earZ + 1, 'main');
        addVoxel(earX + side, earY, earZ, 'mainDark');
        // Inner ear (visible from some angles)
        if (i > 1) {
            addVoxel(earX - side, earY, earZ, 'earInner');
        }
    }
    
    return Array.from(voxelMap.values());
};

/**
 * Get pivot points for animation
 */
export const getDoginalPivots = () => ({
    tail: { x: 0, y: -3 + Y_OFFSET, z: -4 },     // Base of tail
    earLeft: { x: -5, y: 7 + Y_OFFSET, z: 3 },   // Top of left ear (with head Z offset)
    earRight: { x: 5, y: 7 + Y_OFFSET, z: 3 },   // Top of right ear
    head: { x: 0, y: 2+ Y_OFFSET, z: 2 },  // Z=4 to match head forward offset
    body: { x: 0, y: -4 + Y_OFFSET, z: 0 },
    armLeft: { x: 4, y: -4 + Y_OFFSET, z: 3 },   // Y raised to -4
    armRight: { x: -4, y: -4 + Y_OFFSET, z: 3 }, // Y raised to -4
    legLeft: { x: 3, y: -6 + Y_OFFSET, z: -5 },  // Z moved to -7
    legRight: { x: -3, y: -6 + Y_OFFSET, z: -5 },// Z moved to -7
});

/**
 * Generate complete Doginal model
 */
export const generateDoginalComplete = () => {
    const voxelMap = new Map();
    
    const addVoxels = (voxels) => {
        voxels.forEach(v => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) {
                voxelMap.set(key, v);
            }
        });
    };
    
    addVoxels(generateDoginalHead());
    addVoxels(generateDoginalBody());
    addVoxels(generateDoginalArm(true));
    addVoxels(generateDoginalArm(false));
    addVoxels(generateDoginalLeg(true));
    addVoxels(generateDoginalLeg(false));
    
    return Array.from(voxelMap.values());
};

// Export generators object for registry
export const DoginalGenerators = {
    head: generateDoginalHead,
    body: generateDoginalBody,
    armLeft: () => generateDoginalArm(true),
    armRight: () => generateDoginalArm(false),
    legLeft: () => generateDoginalLeg(true),
    legRight: () => generateDoginalLeg(false),
    tail: generateDoginalTail,
    earLeft: () => generateDoginalEar(true),
    earRight: () => generateDoginalEar(false),
    complete: generateDoginalComplete,
    pivots: getDoginalPivots,
};

export default DoginalGenerators;

