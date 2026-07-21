/**
 * JimothyCharacter - Jimothy the short-spined raccoon
 *
 * Short spine syndrome inspired, but still readable as a raccoon:
 * pudgy round body, bandit mask, ringed tail, and legs that still meet the ground.
 */

import { VOXEL_SIZE } from '../constants';

export const JIMOTHY_PALETTE = {
    main: '#7A7A7A',
    mainLight: '#9A9A9A',
    mainDark: '#5A5A5A',
    mainDeep: '#404040',
    belly: '#B8B8B8',
    bellyLight: '#D0D0D0',
    mask: '#1A1A1A',
    maskEdge: '#2E2E2E',
    muzzle: '#E8E8E8',
    muzzleDark: '#C8C8C8',
    nose: '#2A2A2A',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#0A0A0A',
    eyeShine: '#FFFFFF',
    mouthLine: '#4A4A4A',
    ear: '#6A6A6A',
    earInner: '#FFB0B8',
    paw: '#3A3A3A',
    pawLight: '#525252',
    tailRingDark: '#2A2A2A',
    tailRingLight: '#888888',
};

const Y_OFFSET = 4;
const LEG_X = 2;
/** Shorter stubby legs — paws stay on ground via JIMOTHY_MESH_BASE_Y in world mesh */
const GROUND_Y = -9;
/** Leg tops sit inside the body sphere (do not move body to meet legs) */
/** Leg tops attach at different body heights; all four share GROUND_Y for level feet */
const FRONT_LEG_PIVOT_Y = -1;
const BACK_LEG_PIVOT_Y = -1;
const FRONT_LEG_Z = 3;
const BACK_LEG_Z = -3;
const Z_HEAD_OFFSET = 5;
const MESH_SCALE = 0.18;
const DEFAULT_MESH_BASE_Y = 0.8;
/** Foot bottom (unscaled meshInner Y) at GROUND_Y=-12 with mesh y=0.8 — feet on ground */
const REFERENCE_FOOT_BOTTOM = -4.5;

const getFootBottomUnscaled = () => {
    const lowestAbsY = GROUND_Y - 1 + Y_OFFSET;
    const pivotAbsYs = [FRONT_LEG_PIVOT_Y + Y_OFFSET, BACK_LEG_PIVOT_Y + Y_OFFSET];
    return Math.min(
        ...pivotAbsYs.map((pivotAbsY) =>
            pivotAbsY * VOXEL_SIZE + (lowestAbsY - pivotAbsY) * VOXEL_SIZE
        )
    );
};

/** Lower mesh when legs shorten so paw voxels stay planted at y=0 */
export const JIMOTHY_MESH_BASE_Y =
    DEFAULT_MESH_BASE_Y - (getFootBottomUnscaled() - REFERENCE_FOOT_BOTTOM) * MESH_SCALE;

/** Hat voxels are authored for penguin heads — offset to Jimothy's lower crown */
export const JIMOTHY_HAT_OFFSET = { y: 1, z: 5 };

const createVoxelMap = () => {
    const map = new Map();
    const keyFor = (x, y, z, yOff = Y_OFFSET, zOff = 0) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + yOff;
        const rz = Math.round(z) + zOff;
        return { rx, ry, rz, key: `${rx},${ry},${rz}` };
    };
    return {
        add(x, y, z, c, yOff = Y_OFFSET, zOff = 0) {
            const { rx, ry, rz, key } = keyFor(x, y, z, yOff, zOff);
            if (!map.has(key)) map.set(key, { x: rx, y: ry, z: rz, c });
        },
        set(x, y, z, c, yOff = Y_OFFSET, zOff = 0) {
            const { rx, ry, rz, key } = keyFor(x, y, z, yOff, zOff);
            map.set(key, { x: rx, y: ry, z: rz, c });
        },
        values: () => Array.from(map.values()),
    };
};

const fillBox = (voxels, x0, x1, y0, y1, z0, z1, color, yOff = Y_OFFSET, zOff = 0, overwrite = false) => {
    for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
            for (let z = z0; z <= z1; z++) {
                if (overwrite) voxels.set(x, y, z, color, yOff, zOff);
                else voxels.add(x, y, z, color, yOff, zOff);
            }
        }
    }
};

const buildLegColumn = (voxels, centerX, pivotY, zCenter, side) => {
    for (let legY = pivotY; legY >= GROUND_Y; legY--) {
        voxels.add(centerX, legY, zCenter, 'main');
        voxels.add(centerX + side, legY, zCenter, 'mainDark');
    }

    voxels.add(centerX, GROUND_Y, zCenter, 'pawLight');
    voxels.add(centerX + side, GROUND_Y, zCenter, 'paw');
    voxels.add(centerX, GROUND_Y - 1, zCenter, 'paw');
};

export const generateJimothyHead = () => {
    const voxels = createVoxelMap();

    // Round raccoon head — low on chest, tiny neck implied by overlap with body
    for (let y = 1; y <= 6; y++) {
        const rx = y <= 2 ? 2.8 + y * 0.35 : 3.4;
        const rz = y <= 2 ? 2.4 + y * 0.25 : 3.1;
        for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
            for (let z = -Math.ceil(rz); z <= Math.ceil(rz); z++) {
                if ((x * x) / (rx * rx) + (z * z) / (rz * rz) <= 1) {
                    let color = 'main';
                    if (y >= 5) color = 'mainLight';
                    if (Math.abs(x) > rx * 0.75) color = 'mainDark';
                    voxels.add(x, y, z, color, Y_OFFSET, Z_HEAD_OFFSET);
                }
            }
        }
    }

    // Compact snout — short and narrow
    for (let z = 3; z <= 5; z++) {
        const t = (z - 3) / 2;
        const rx = 1.3 - t * 0.45;
        for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
            for (let y = 1; y <= 2; y++) {
                if (Math.abs(x) <= rx) {
                    voxels.set(x, y, z, y > 1 ? 'muzzle' : 'muzzleDark', Y_OFFSET, Z_HEAD_OFFSET);
                }
            }
        }
    }
    voxels.set(0, 2, 5, 'nose', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.set(-1, 1, 4, 'nose', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.set(1, 1, 4, 'nose', Y_OFFSET, Z_HEAD_OFFSET);

    // Raccoon eye mask — compact patches, not full face blackout
    fillBox(voxels, -3, -2, 4, 5, 1, 2, 'mask', Y_OFFSET, Z_HEAD_OFFSET, true);
    fillBox(voxels, 2, 3, 4, 5, 1, 2, 'mask', Y_OFFSET, Z_HEAD_OFFSET, true);
    fillBox(voxels, -1, 1, 4, 4, 0, 1, 'maskEdge', Y_OFFSET, Z_HEAD_OFFSET, true);

    voxels.set(-2, 4, 2, 'eyeWhite', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.set(-2, 5, 2, 'eyeWhite', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.set(-2, 4, 3, 'eyeBlack', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.set(-2, 5, 3, 'eyeShine', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.set(2, 4, 2, 'eyeWhite', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.set(2, 5, 2, 'eyeWhite', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.set(2, 4, 3, 'eyeBlack', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.set(2, 5, 3, 'eyeShine', Y_OFFSET, Z_HEAD_OFFSET);

    for (let x = -1; x <= 1; x++) {
        voxels.set(x, 1, 4, 'mouthLine', Y_OFFSET, Z_HEAD_OFFSET);
    }

    // Ears are part of the head mesh so emotes rotate the full head as one unit
    for (const isLeft of [true, false]) {
        const side = isLeft ? -1 : 1;
        for (let i = 0; i < 4; i++) {
            voxels.add(side * (3 + i * 0.15), 6 + i * 0.25, 0, 'ear', Y_OFFSET, Z_HEAD_OFFSET);
            voxels.add(side * (3 + i * 0.15), 6 + i * 0.25, 1, 'ear', Y_OFFSET, Z_HEAD_OFFSET);
            if (i > 0) {
                voxels.add(side * (2.7 + i * 0.15), 6 + i * 0.25, 0, 'earInner', Y_OFFSET, Z_HEAD_OFFSET);
            }
        }
    }

    return voxels.values();
};

export const generateJimothyEar = (isLeft) => {
    const voxels = createVoxelMap();
    const side = isLeft ? -1 : 1;
    for (let i = 0; i < 4; i++) {
        voxels.add(side * (3 + i * 0.15), 6 + i * 0.25, 0, 'ear', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.add(side * (3 + i * 0.15), 6 + i * 0.25, 1, 'ear', Y_OFFSET, Z_HEAD_OFFSET);
        if (i > 0) {
            voxels.add(side * (2.7 + i * 0.15), 6 + i * 0.25, 0, 'earInner', Y_OFFSET, Z_HEAD_OFFSET);
        }
    }
    return voxels.values();
};

export const generateJimothyBody = () => {
    const voxels = createVoxelMap();

    const centerY = 0;
    const centerZ = 0;
    const radius = 4.2;

    for (let y = -4; y <= 4; y++) {
        for (let x = -5; x <= 5; x++) {
            for (let z = -5; z <= 5; z++) {
                const dx = x / radius;
                const dy = (y - centerY) / radius;
                const dz = (z - centerZ) / radius;
                if (dx * dx + dy * dy + dz * dz <= 1) {
                    let color = 'main';
                    if (z > 0.5 && y < 1) color = 'belly';
                    if (y > 1 && z <= 0) color = 'mainLight';
                    if (Math.abs(x) > radius * 0.72) color = 'mainDark';
                    if (y < -2 && Math.abs(x) < 2 && z > -1) color = 'bellyLight';
                    voxels.add(x, y, z, color);
                }
            }
        }
    }

    return voxels.values();
};

export const generateJimothyArm = (isLeft) => {
    const voxels = createVoxelMap();
    const side = isLeft ? 1 : -1;
    buildLegColumn(voxels, side * LEG_X, FRONT_LEG_PIVOT_Y, FRONT_LEG_Z, side);
    return voxels.values();
};

export const generateJimothyLeg = (isLeft) => {
    const voxels = createVoxelMap();
    const side = isLeft ? 1 : -1;
    buildLegColumn(voxels, side * LEG_X, BACK_LEG_PIVOT_Y, BACK_LEG_Z, side);
    return voxels.values();
};

export const generateJimothyTail = () => {
    const voxels = createVoxelMap();
    const rings = ['tailRingDark', 'tailRingLight', 'tailRingDark', 'tailRingLight', 'tailRingDark'];

    for (let i = 0; i < 6; i++) {
        const color = rings[i % rings.length];
        const z = -5 - i;
        voxels.add(0, -1 + (i > 2 ? 0.2 : 0), z, color);
        voxels.add(1, -1 + (i > 2 ? 0.2 : 0), z, color);
        voxels.add(-1, -1 + (i > 2 ? 0.2 : 0), z, color);
        if (i % 2 === 0) {
            voxels.add(0, 0, z, color);
        }
    }

    // Bushy ringed tip
    fillBox(voxels, -1, 1, -1, 0, -10, -9, 'tailRingLight');
    voxels.add(0, 0, -11, 'tailRingDark');

    return voxels.values();
};

export const getJimothyPivots = () => ({
    head: { x: 0, y: 2 + Y_OFFSET, z: 5 + Z_HEAD_OFFSET },
    body: { x: 0, y: 0 + Y_OFFSET, z: 0 },
    armLeft: { x: LEG_X, y: FRONT_LEG_PIVOT_Y + Y_OFFSET, z: FRONT_LEG_Z },
    armRight: { x: -LEG_X, y: FRONT_LEG_PIVOT_Y + Y_OFFSET, z: FRONT_LEG_Z },
    legLeft: { x: LEG_X, y: BACK_LEG_PIVOT_Y + Y_OFFSET, z: BACK_LEG_Z },
    legRight: { x: -LEG_X, y: BACK_LEG_PIVOT_Y + Y_OFFSET, z: BACK_LEG_Z },
    tail: { x: 0, y: -1 + Y_OFFSET, z: -5 },
    earLeft: { x: -3, y: 6 + Y_OFFSET, z: 5 + Z_HEAD_OFFSET },
    earRight: { x: 3, y: 6 + Y_OFFSET, z: 5 + Z_HEAD_OFFSET },
});

export const generateJimothyComplete = () => {
    const voxelMap = new Map();
    const addVoxels = (voxels) => {
        voxels.forEach((v) => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) voxelMap.set(key, v);
        });
    };

    addVoxels(generateJimothyHead());
    addVoxels(generateJimothyBody());
    addVoxels(generateJimothyArm(true));
    addVoxels(generateJimothyArm(false));
    addVoxels(generateJimothyLeg(true));
    addVoxels(generateJimothyLeg(false));
    addVoxels(generateJimothyTail());

    return Array.from(voxelMap.values());
};

export const JimothyGenerators = {
    head: generateJimothyHead,
    body: generateJimothyBody,
    armLeft: () => generateJimothyArm(true),
    armRight: () => generateJimothyArm(false),
    legLeft: () => generateJimothyLeg(true),
    legRight: () => generateJimothyLeg(false),
    tail: generateJimothyTail,
    earLeft: () => generateJimothyEar(true),
    earRight: () => generateJimothyEar(false),
    complete: generateJimothyComplete,
    pivots: getJimothyPivots,
};

export default JimothyGenerators;
