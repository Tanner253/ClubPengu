/**
 * TungTungCharacter - The Tung Tung Tung Sahur meme character
 * A tall cylindrical "log" creature with stick arms and legs
 * 
 * Key features:
 * - Tall cylindrical body (like a wooden log) - split into HEAD (upper) and BODY (lower)
 * - Penguin-style face on the upper cylinder (head)
 * - Very thin stick arms and legs
 * - Holds a baseball bat in hand
 * - No hat allowed (head is part of cylinder)
 */

// Tung Tung specific color palette
export const TUNG_PALETTE = {
    // Skin/wood tones (brownish like the meme)
    skin: '#C4956A',        // Main tan/wood color
    skinLight: '#D4A57A',   // Highlights
    skinDark: '#A47D5A',    // Shadows
    skinDeep: '#8B6B4A',    // Deep shadows
    
    // Face (penguin-style)
    faceWhite: '#FFFFFF',
    eyeBlack: '#0A0A0A',
    beakOrange: '#FF8C00',
    
    // Bat colors
    batWood: '#C19A6B',
    batWoodDark: '#8B6914',
    batHandle: '#5D4037',
    batGrip: '#2A2A2A',
};

// Y offset to lift the model
const Y_OFFSET = 8;
const CYLINDER_RADIUS = 4;  // Reduced from 6 for thinner log
const BODY_HEIGHT = 15;  // Lower half: y=0 to y=15 (taller body)
const HEAD_HEIGHT = 15;  // Upper half: y=15 to y=30 (taller head)

/**
 * Helper to generate cylinder section
 */
const generateCylinderSection = (startY, endY, addVoxel, taperBottom = false, taperTop = false) => {
    for (let y = startY; y <= endY; y++) {
        let radius = CYLINDER_RADIUS;
        
        // Taper at bottom of body
        if (taperBottom && y <= startY + 2) {
            radius = CYLINDER_RADIUS - (startY + 2 - y) * 0.3;
        }
        // Taper at top of head
        if (taperTop && y >= endY - 2) {
            radius = CYLINDER_RADIUS - (y - (endY - 2)) * 0.5;
        }
        
        for (let x = -Math.ceil(radius); x <= Math.ceil(radius); x++) {
            for (let z = -Math.ceil(radius); z <= Math.ceil(radius); z++) {
                const dist = Math.sqrt(x * x + z * z);
                
                if (dist <= radius) {
                    let color = TUNG_PALETTE.skin;
                    
                    // Shading on sides
                    if (Math.abs(x) > radius * 0.6) {
                        color = TUNG_PALETTE.skinDark;
                    }
                    // Highlight in front
                    if (z > radius * 0.5) {
                        color = TUNG_PALETTE.skinLight;
                    }
                    
                    addVoxel(x, y, z, color);
                }
            }
        }
    }
};

/**
 * Generate the HEAD - upper half of cylinder (y=10 to y=20)
 * Face is on this part
 */
export const generateTungHead = () => {
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
    
    // Upper half of cylinder (y=10 to y=20), with taper at top
    generateCylinderSection(BODY_HEIGHT, BODY_HEIGHT + HEAD_HEIGHT, addVoxel, false, true);
    
    // Eyes and mouth will be added separately via customization system
    
    return Array.from(voxelMap.values());
};

/**
 * Generate the BODY - lower half of cylinder (y=0 to y=10)
 */
export const generateTungBody = () => {
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
    
    // Lower half of cylinder (y=0 to y=10), with taper at bottom
    generateCylinderSection(0, BODY_HEIGHT, addVoxel, true, false);
    
    return Array.from(voxelMap.values());
};

/**
 * Generate Tung's thin stick arm with baseball bat
 * isLeft: true = left arm (no bat), false = right arm (with bat)
 */
export const generateTungArm = (isLeft) => {
    const voxelMap = new Map();
    const side = isLeft ? 1 : -1;
    const shoulderX = side * 4;  // Reduced from 5 for thinner body
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    const shoulderY = BODY_HEIGHT - 6; // Shoulders at mid-body section (y=9)
    
    // Shoulder joint
    addVoxel(shoulderX, shoulderY, 0, TUNG_PALETTE.skinDark);
    
    // Upper arm - thin stick going down and out
    for (let i = 0; i < 7; i++) {
        addVoxel(shoulderX + side * (1 + i * 0.4), shoulderY - 1 - i, 0, TUNG_PALETTE.skin);
    }
    
    // Elbow
    const elbowX = shoulderX + side * 4;
    const elbowY = shoulderY - 8;
    addVoxel(elbowX, elbowY, 0, TUNG_PALETTE.skinDark);
    
    // Forearm going forward/down
    for (let i = 0; i < 6; i++) {
        addVoxel(elbowX + side * (i * 0.2), elbowY - 1 - i, i * 0.5, TUNG_PALETTE.skin);
    }
    
    // Hand
    const handX = elbowX + side * 1.2;
    const handY = elbowY - 7;
    const handZ = 3;
    addVoxel(handX, handY, handZ, TUNG_PALETTE.skinLight);
    addVoxel(handX, handY - 1, handZ, TUNG_PALETTE.skinLight);
    
    // === BASEBALL BAT (right arm only) ===
    if (!isLeft) {
        // Bat grip (in hand)
        for (let z = 0; z < 3; z++) {
            addVoxel(handX, handY - 1, handZ + 1 + z, TUNG_PALETTE.batGrip);
        }
        
        // Handle wrapped section
        for (let z = 3; z < 6; z++) {
            addVoxel(handX, handY - 1, handZ + 1 + z, TUNG_PALETTE.batHandle);
        }
        
        // Taper to barrel
        for (let z = 6; z < 9; z++) {
            addVoxel(handX, handY - 1, handZ + 1 + z, TUNG_PALETTE.batWood);
        }
        
        // Barrel (thicker) - 2x2 cross section
        for (let z = 9; z < 16; z++) {
            addVoxel(handX, handY - 1, handZ + 1 + z, TUNG_PALETTE.batWood);
            addVoxel(handX + 1, handY - 1, handZ + 1 + z, TUNG_PALETTE.batWoodDark);
            addVoxel(handX, handY, handZ + 1 + z, TUNG_PALETTE.batWood);
            addVoxel(handX + 1, handY, handZ + 1 + z, TUNG_PALETTE.batWoodDark);
        }
        
        // End cap
        addVoxel(handX, handY - 1, handZ + 17, TUNG_PALETTE.batWoodDark);
        addVoxel(handX + 1, handY - 1, handZ + 17, TUNG_PALETTE.batWood);
        addVoxel(handX, handY, handZ + 17, TUNG_PALETTE.batWood);
        addVoxel(handX + 1, handY, handZ + 17, TUNG_PALETTE.batWoodDark);
    }
    
    return Array.from(voxelMap.values());
};

/**
 * Generate Tung's thin stick leg (shorter legs)
 * isLeft: true = left leg, false = right leg
 */
export const generateTungLeg = (isLeft) => {
    const voxelMap = new Map();
    const side = isLeft ? 1 : -1;
    const hipX = side * 2;
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    const hipY = -8; // Start well below body cylinder to avoid clipping
    
    // Hip joint
    addVoxel(hipX, hipY, 0, TUNG_PALETTE.skinDark);
    
    // Upper leg - shorter thin stick going down (was 7, now 4)
    for (let i = 0; i < 4; i++) {
        addVoxel(hipX, hipY - 1 - i, 0, TUNG_PALETTE.skin);
    }
    
    // Knee
    const kneeY = hipY - 5;
    addVoxel(hipX, kneeY, 1, TUNG_PALETTE.skinDark);
    
    // Lower leg - shorter (was 6, now 4)
    for (let i = 0; i < 4; i++) {
        addVoxel(hipX, kneeY - 1 - i, 1 + i * 0.1, TUNG_PALETTE.skin);
    }
    
    // Foot (small, simple)
    const footY = kneeY - 5;
    for (let z = 0; z <= 3; z++) {
        addVoxel(hipX, footY, 1 + z, TUNG_PALETTE.skinDark);
    }
    // Wider foot base
    addVoxel(hipX - 1, footY, 2, TUNG_PALETTE.skinDark);
    addVoxel(hipX + 1, footY, 2, TUNG_PALETTE.skinDark);
    
    return Array.from(voxelMap.values());
};

/**
 * Get pivot points for each part (for animation)
 * Now properly split between head (upper cylinder) and body (lower cylinder)
 */
export const getTungPivots = () => ({
    head: { x: 0, y: BODY_HEIGHT + Y_OFFSET, z: 0 },  // Pivot at bottom of head (y=15)
    body: { x: 0, y: Y_OFFSET, z: 0 },                 // Pivot at bottom of body (y=0)
    armLeft: { x: 4, y: (BODY_HEIGHT - 6) + Y_OFFSET, z: 0 },   // Shoulder level (adjusted for thinner body)
    armRight: { x: -4, y: (BODY_HEIGHT - 6) + Y_OFFSET, z: 0 }, // Shoulder level (adjusted for thinner body)
    legLeft: { x: 2, y: -8 + Y_OFFSET, z: 0 },         // Hip level (well below body)
    legRight: { x: -2, y: -8 + Y_OFFSET, z: 0 },       // Hip level (well below body)
});

/**
 * Generate complete Tung Tung (all parts merged)
 */
export const generateTungComplete = () => {
    const voxelMap = new Map();
    
    const addVoxels = (voxels) => {
        voxels.forEach(v => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) {
                voxelMap.set(key, v);
            }
        });
    };
    
    addVoxels(generateTungHead());
    addVoxels(generateTungBody());
    addVoxels(generateTungArm(true));
    addVoxels(generateTungArm(false));
    addVoxels(generateTungLeg(true));
    addVoxels(generateTungLeg(false));
    
    return Array.from(voxelMap.values());
};

// Export generators object for registry
export const TungTungGenerators = {
    head: generateTungHead,
    body: generateTungBody,
    armLeft: () => generateTungArm(true),
    armRight: () => generateTungArm(false),
    legLeft: () => generateTungLeg(true),
    legRight: () => generateTungLeg(false),
    complete: generateTungComplete,
    pivots: getTungPivots,
};

export default TungTungGenerators;

