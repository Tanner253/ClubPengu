/**
 * PumpCharacter - The Pump.fun pill character model
 * Smooth pill shape with penguin-style flippers and feet
 */

// Pump color palette
export const PUMP_PALETTE = {
    // Body (bright green)
    body: '#2ECC71',
    bodyLight: '#58D68D',
    bodyDark: '#27AE60',
    bodyDeep: '#1E8449',
    
    // Face (white/cream like reference)
    face: '#FAF0E6',
    faceLight: '#FFFAF5',
    faceDark: '#F0E6DC',
    
    // Cheeks (rosy pink)
    cheek: '#FFB6C1',
    
    // Eyes
    eyeBlack: '#1A1A1A',
    
    // Feet (orange like penguin)
    feet: '#FFA500',
};

const Y_OFFSET = 2.5;
const PILL_RADIUS = 7;
const INNER_MARGIN = 0.4;

/**
 * Generate Pump's head - white/cream top dome (raised to prevent clipping)
 */
export const generatePumpHead = () => {
    const voxels = [];
    
    for (let y = 4; y <= 14; y++) {
        const heightFromBase = y - 4;
        const domeHeight = 10;
        const normalizedHeight = heightFromBase / domeHeight;
        const radius = PILL_RADIUS * Math.sqrt(1 - normalizedHeight * normalizedHeight);
        
        if (radius < 1) continue;
        
        for (let x = -Math.ceil(radius); x <= Math.ceil(radius); x++) {
            for (let z = -Math.ceil(radius); z <= Math.ceil(radius); z++) {
                const dist = Math.sqrt(x * x + z * z);
                if (dist <= radius - INNER_MARGIN) {
                    let color = 'face';
                    if (Math.abs(x) > (radius - INNER_MARGIN) * 0.75 || z < -(radius - INNER_MARGIN) * 0.5) color = 'faceDark';
                    if (z > (radius - INNER_MARGIN) * 0.5 && y > 6) color = 'faceLight';
                    voxels.push({ x, y: y + Y_OFFSET, z, c: color });
                }
            }
        }
    }
    
    return voxels;
};

/**
 * Generate Pump body - green cylinder with rounded bottom
 */
export const generatePumpBody = () => {
    const voxels = [];
    
    // Straight cylinder section (y = -4 to 3) - meets head at y=3
    for (let y = -4; y <= 3; y++) {
        const radius = PILL_RADIUS;
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const dist = Math.sqrt(x * x + z * z);
                if (dist <= radius - INNER_MARGIN) {
                    let color = 'body';
                    if (z > (radius - INNER_MARGIN) * 0.5) color = 'bodyLight';
                    if (Math.abs(x) > (radius - INNER_MARGIN) * 0.75) color = 'bodyDark';
                    if (z < -(radius - INNER_MARGIN) * 0.5) color = 'bodyDark';
                    voxels.push({ x, y: y + Y_OFFSET, z, c: color });
                }
            }
        }
    }
    
    // Bottom dome (y = -12 to -4)
    for (let y = -12; y < -4; y++) {
        const heightFromBottom = y + 12;
        const domeHeight = 8;
        const normalizedHeight = 1 - (heightFromBottom / domeHeight);
        const radius = PILL_RADIUS * Math.sqrt(1 - normalizedHeight * normalizedHeight);
        
        if (radius < 1) continue;
        
        for (let x = -Math.ceil(radius); x <= Math.ceil(radius); x++) {
            for (let z = -Math.ceil(radius); z <= Math.ceil(radius); z++) {
                const dist = Math.sqrt(x * x + z * z);
                if (dist <= radius - INNER_MARGIN) {
                    let color = 'body';
                    if (z > (radius - INNER_MARGIN) * 0.5) color = 'bodyLight';
                    if (Math.abs(x) > (radius - INNER_MARGIN) * 0.75) color = 'bodyDark';
                    if (z < -(radius - INNER_MARGIN) * 0.5) color = 'bodyDark';
                    if (y <= -10) color = 'bodyDeep';
                    voxels.push({ x, y: y + Y_OFFSET, z, c: color });
                }
            }
        }
    }
    
    return voxels;
};

/**
 * Generate Pump's flipper/arm - same as penguin flippers but green, positioned outside pill body
 */
export const generatePumpArm = (isLeft) => {
    const voxels = [];
    // Flippers positioned outside the pill body (PILL_RADIUS=7, so start at 7)
    for (let x = 0; x < 3; x++) {
        for (let y = -4; y < 2; y++) {
            for (let z = -1; z < 2; z++) {
                if (x === 2 && (y > 0 || y < -3)) continue;
                voxels.push({
                    x: isLeft ? x + 7 : -x - 7,
                    y: y + Y_OFFSET,
                    z,
                    c: 'body' // Green like body
                });
            }
        }
    }
    return voxels;
};

/**
 * Generate Pump's foot - same as penguin feet (orange)
 */
export const generatePumpFoot = (isLeft) => {
    const voxels = [];
    const xOffset = isLeft ? 3 : -3;
    
    // Same as penguin foot generation, adjusted Y for pill bottom
    for (let x = -2; x <= 2; x++) {
        for (let z = 0; z <= 4; z++) {
            voxels.push({
                x: x + xOffset,
                y: -12 + Y_OFFSET, // Bottom of pill
                z: z + 1,
                c: 'feet' // Orange
            });
        }
    }
    return voxels;
};

/**
 * Get pivot points for animation
 */
export const getPumpPivots = () => ({
    head: { x: 0, y: 9 + Y_OFFSET, z: 0 },
    body: { x: 0, y: -4 + Y_OFFSET, z: 0 },
    armLeft: { x: 7, y: -1 + Y_OFFSET, z: 0 },
    armRight: { x: -7, y: -1 + Y_OFFSET, z: 0 },
    footLeft: { x: 3, y: -12 + Y_OFFSET, z: 2 },
    footRight: { x: -3, y: -12 + Y_OFFSET, z: 2 },
});

/**
 * Generate complete Pump model
 */
export const generatePumpComplete = () => {
    const voxelMap = new Map();
    
    const addVoxels = (voxels) => {
        voxels.forEach(v => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) {
                voxelMap.set(key, v);
            }
        });
    };
    
    addVoxels(generatePumpBody());
    addVoxels(generatePumpHead());
    addVoxels(generatePumpArm(true));
    addVoxels(generatePumpArm(false));
    addVoxels(generatePumpFoot(true));
    addVoxels(generatePumpFoot(false));
    
    return Array.from(voxelMap.values());
};

// Export generators object for registry
export const PumpGenerators = {
    head: generatePumpHead,
    body: generatePumpBody,
    armLeft: () => generatePumpArm(true),
    armRight: () => generatePumpArm(false),
    footLeft: () => generatePumpFoot(true),
    footRight: () => generatePumpFoot(false),
    complete: generatePumpComplete,
    pivots: getPumpPivots,
};

export default PumpGenerators;
