/**
 * BadgerCharacter - Long, low, table-like quadruped badger
 *
 * Bull-style horizontal build: elongated barrel body, short stout legs,
 * wedge head with classic black/white face stripes, grizzled silver back,
 * dark underside. Built for diagonal-gait walk/idle like BLACK BULL.
 */

import { VOXEL_SIZE } from '../constants';

export const BADGER_PALETTE = {
    // Grizzled silver back / flanks (real European badger)
    main: '#8A8A86',
    mainLight: '#A8A8A2',
    mainDark: '#6A6A66',
    mainDeep: '#4A4A48',
    // Dark underside + legs
    belly: '#1A1A1C',
    bellySoft: '#2A2A2E',
    // Face stripes
    stripe: '#F4F4F0',
    stripeSoft: '#E0E0DA',
    mask: '#121214',
    maskSoft: '#1E1E22',
    nose: '#0A0A0A',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#050505',
    eyeShine: '#FFFFFF',
    ear: '#1A1A1C',
    earInner: '#3A3034',
    earTip: '#E8E8E4',
    paw: '#0E0E10',
    pawLight: '#222226',
    claw: '#D8D8D4',
    mouthLine: '#2A1A14',
};

const Y_OFFSET = 3;
const Z_HEAD_OFFSET = 7;
/** Shared ground plane for all four paws (generator Y before Y_OFFSET) */
const PAW_BOTTOM_Y = -14;
const FRONT_SHOULDER_Y = -2;
const BACK_HIP_Y = -4;
const FRONT_LEG_Z = 6;
const BACK_LEG_Z = -7;

export const BADGER_MESH_LIFT_VOXELS = 3;
export const BADGER_MESH_BASE_Y = 0.8 + BADGER_MESH_LIFT_VOXELS * VOXEL_SIZE * 0.18;

/** Hat onto the striped crown between the ears */
export const BADGER_HAT_OFFSET = { y: 2, z: 6 };
export const BADGER_PROPELLER_BLADE_POS = {
    y: 12 + BADGER_HAT_OFFSET.y + 1,
    z: BADGER_HAT_OFFSET.z,
};

const createVoxelMap = () => {
    const map = new Map();
    return {
        add(x, y, z, c, yOff = Y_OFFSET, zOff = 0) {
            const rx = Math.round(x);
            const ry = Math.round(y) + yOff;
            const rz = Math.round(z) + zOff;
            const key = `${rx},${ry},${rz}`;
            if (!map.has(key)) map.set(key, { x: rx, y: ry, z: rz, c });
        },
        set(x, y, z, c, yOff = Y_OFFSET, zOff = 0) {
            const rx = Math.round(x);
            const ry = Math.round(y) + yOff;
            const rz = Math.round(z) + zOff;
            const key = `${rx},${ry},${rz}`;
            map.set(key, { x: rx, y: ry, z: rz, c });
        },
        values: () => Array.from(map.values()),
    };
};

const fillBox = (voxels, x0, x1, y0, y1, z0, z1, color, yOff = Y_OFFSET, zOff = 0) => {
    for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
            for (let z = z0; z <= z1; z++) {
                voxels.add(x, y, z, color, yOff, zOff);
            }
        }
    }
};

/**
 * Wedge badger head — white face, black eye stripes, compact muzzle, visible ears
 */
export const generateBadgerHead = () => {
    const voxels = createVoxelMap();

    // Wedge skull — medium forward depth (badger, not panda / anteater)
    for (let y = 0; y <= 7; y++) {
        let rx = 4.2;
        let rz = 3.8;
        if (y <= 2) {
            rx = 2.8 + y * 0.6;
            rz = 2.8 + y * 0.45;
        } else if (y >= 6) {
            const t = y - 6;
            rx = 4.2 - t * 0.6;
            rz = 3.8 - t * 0.35;
        }

        for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
            for (let z = -Math.ceil(rz); z <= Math.ceil(rz); z++) {
                if ((x * x) / (rx * rx) + (z * z) / (rz * rz) > 1) continue;

                // Default: white face / forehead
                let color = 'stripe';
                // Grizzled top of head toward the neck
                if (z < 0 && y >= 4) color = 'mainLight';
                // Black stripe over each eye (classic badger mask)
                if (Math.abs(x) >= 1.2 && Math.abs(x) <= 3.2 && y >= 3 && y <= 6 && z > -1) {
                    color = 'mask';
                }
                // Soft mask edge
                if (Math.abs(x) >= 1 && Math.abs(x) < 1.2 && y >= 3 && y <= 5 && z > 0) {
                    color = 'maskSoft';
                }
                if (Math.abs(x) > rx * 0.78) color = color === 'stripe' ? 'stripeSoft' : 'mainDeep';

                voxels.add(x, y, z, color, Y_OFFSET, Z_HEAD_OFFSET);
            }
        }
    }

    // Medium tapered snout — wedge forward without going full anteater
    fillBox(voxels, -2, 2, 1, 3, 3, 5, 'stripeSoft', Y_OFFSET, Z_HEAD_OFFSET);
    fillBox(voxels, -1, 1, 1, 2, 6, 7, 'stripe', Y_OFFSET, Z_HEAD_OFFSET);
    // Dark muzzle tip + nose
    fillBox(voxels, -1, 1, 1, 2, 8, 8, 'mask', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.set(0, 2, 8, 'nose', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.set(-1, 1, 7, 'mouthLine', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.set(1, 1, 7, 'mouthLine', Y_OFFSET, Z_HEAD_OFFSET);

    // Eyes in the black stripes
    [-2, 2].forEach((eyeX) => {
        voxels.set(eyeX, 4, 3, 'eyeWhite', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.set(eyeX, 5, 3, 'eyeWhite', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.set(eyeX, 4, 4, 'eyeBlack', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.set(eyeX, 5, 4, 'eyeShine', Y_OFFSET, Z_HEAD_OFFSET);
    });

    // Ears sit ABOVE the skull and use set() so they aren't buried by head voxels
    for (const side of [-1, 1]) {
        voxels.set(side * 3, 8, 0, 'ear', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.set(side * 4, 8, 0, 'ear', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.set(side * 3, 9, 0, 'ear', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.set(side * 4, 9, 0, 'ear', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.set(side * 3, 8, 1, 'earInner', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.set(side * 3, 9, 1, 'earInner', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.set(side * 4, 9, 0, 'earTip', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.set(side * 3, 10, 0, 'earTip', Y_OFFSET, Z_HEAD_OFFSET);
    }

    return voxels.values();
};

/**
 * Long flat "table" torso — stretched front-to-back, low and broad
 */
export const generateBadgerBody = () => {
    const voxels = createVoxelMap();

    // Horizontal barrel elongated in Z (table length)
    for (let z = -9; z <= 7; z++) {
        const t = (z + 9) / 16;
        const profile = Math.sin(t * Math.PI);
        // Flat-topped: shorter vertical radius, wider across back
        const ry = 3.2 * profile + 1.1;
        const rx = (5.8 * profile + 1.6) * (z > 0 ? 1.05 : 1);

        for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
            for (let y = -Math.ceil(ry) - 1; y <= Math.ceil(ry); y++) {
                const distX = rx > 0.5 ? x / rx : 0;
                const distY = ry > 0.5 ? y / ry : 0;
                if (distX * distX + distY * distY > 1) continue;

                let color = 'main';
                // Silvery flat back (top of table)
                if (y > ry * 0.25) color = 'mainLight';
                // Dark flanks / underside (real badger contrast)
                if (y < -0.5) color = 'belly';
                if (y < -1.5) color = 'bellySoft';
                if (Math.abs(x) > rx * 0.7) color = y > 0 ? 'mainDark' : 'belly';
                // Haunches a bit darker
                if (z < -5 && y > -1) color = 'mainDark';

                voxels.add(x, y, z, color);
            }
        }
    }

    // Thick neck blending into wedge head (forward)
    for (let z = 5; z <= 8; z++) {
        const t = (z - 5) / 3;
        const r = 3.2 - t * 0.6;
        for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
            for (let y = -2; y <= 2; y++) {
                if (x * x + y * y <= r * r) {
                    voxels.add(x, y, z, y > 0 ? 'main' : 'belly');
                }
            }
        }
    }

    return voxels.values();
};

const buildLegColumn = (voxels, centerX, shoulderY, legZ, side) => {
    const segments = shoulderY - (PAW_BOTTOM_Y + 1);

    for (let i = 0; i <= segments; i++) {
        const legY = shoulderY - i;
        fillBox(
            voxels,
            centerX - 1,
            centerX + 1,
            legY,
            legY + 1,
            legZ - 1,
            legZ + 1,
            i < 2 ? 'belly' : 'bellySoft'
        );
        voxels.add(centerX + side, legY, legZ, 'belly');
    }

    const pawY = PAW_BOTTOM_Y + 1;
    fillBox(voxels, centerX - 1, centerX + 1, pawY, pawY, legZ - 1, legZ + 2, 'pawLight');
    fillBox(voxels, centerX - 1, centerX + 1, pawY - 1, pawY - 1, legZ, legZ + 1, 'paw');
    // Digging claws
    voxels.add(centerX, pawY - 1, legZ + 2, 'claw');
    voxels.add(centerX + side, pawY - 1, legZ + 2, 'claw');
};

/** Front legs (map to flipper_* for animation) */
export const generateBadgerArm = (isLeft) => {
    const voxels = createVoxelMap();
    const side = isLeft ? 1 : -1;
    buildLegColumn(voxels, side * 4, FRONT_SHOULDER_Y, FRONT_LEG_Z, side);
    return voxels.values();
};

/** Hind legs (map to foot_*) */
export const generateBadgerLeg = (isLeft) => {
    const voxels = createVoxelMap();
    const side = isLeft ? 1 : -1;
    buildLegColumn(voxels, side * 3.5, BACK_HIP_Y, BACK_LEG_Z, side);
    return voxels.values();
};

export const generateBadgerTail = () => {
    const voxels = createVoxelMap();

    // Short stubby badger brush
    for (let i = 0; i < 4; i++) {
        voxels.add(0, -2 + i * 0.1, -9 - i, i > 1 ? 'mainLight' : 'mainDark');
        voxels.add(1, -2, -9 - i, 'main');
        voxels.add(-1, -2, -9 - i, 'main');
    }
    fillBox(voxels, -1, 1, -2, -1, -12, -11, 'mainLight');

    return voxels.values();
};

export const getBadgerPivots = () => ({
    head: { x: 0, y: 2 + Y_OFFSET, z: 5 + Z_HEAD_OFFSET },
    body: { x: 0, y: -1 + Y_OFFSET, z: 0 },
    armLeft: { x: 4, y: FRONT_SHOULDER_Y + Y_OFFSET, z: FRONT_LEG_Z },
    armRight: { x: -4, y: FRONT_SHOULDER_Y + Y_OFFSET, z: FRONT_LEG_Z },
    legLeft: { x: 4, y: BACK_HIP_Y + Y_OFFSET, z: BACK_LEG_Z },
    legRight: { x: -4, y: BACK_HIP_Y + Y_OFFSET, z: BACK_LEG_Z },
    flipperLeft: { x: 4, y: FRONT_SHOULDER_Y + Y_OFFSET, z: FRONT_LEG_Z },
    flipperRight: { x: -4, y: FRONT_SHOULDER_Y + Y_OFFSET, z: FRONT_LEG_Z },
    footLeft: { x: 4, y: BACK_HIP_Y + Y_OFFSET, z: BACK_LEG_Z },
    footRight: { x: -4, y: BACK_HIP_Y + Y_OFFSET, z: BACK_LEG_Z },
    tail: { x: 0, y: -2 + Y_OFFSET, z: -9 },
});

export const generateBadgerComplete = () => {
    const voxelMap = new Map();
    const addVoxels = (list) => {
        list.forEach((v) => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) voxelMap.set(key, v);
        });
    };

    addVoxels(generateBadgerHead());
    addVoxels(generateBadgerBody());
    addVoxels(generateBadgerArm(true));
    addVoxels(generateBadgerArm(false));
    addVoxels(generateBadgerLeg(true));
    addVoxels(generateBadgerLeg(false));
    addVoxels(generateBadgerTail());

    return Array.from(voxelMap.values());
};

export const BadgerGenerators = {
    head: generateBadgerHead,
    body: generateBadgerBody,
    armLeft: () => generateBadgerArm(true),
    armRight: () => generateBadgerArm(false),
    legLeft: () => generateBadgerLeg(true),
    legRight: () => generateBadgerLeg(false),
    flipperLeft: () => generateBadgerArm(true),
    flipperRight: () => generateBadgerArm(false),
    footLeft: () => generateBadgerLeg(true),
    footRight: () => generateBadgerLeg(false),
    tail: generateBadgerTail,
    complete: generateBadgerComplete,
    pivots: getBadgerPivots,
};

export default BadgerGenerators;
