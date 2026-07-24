/**
 * FonzCharacter - FONZ: pink worm-head penguin in a black tracksuit hoodie
 * Hats and mounts only — built-in face, hoodie, and stripes
 */

import { PALETTE } from '../constants';
import { generateFoot } from '../generators';

export const FONZ_PALETTE = {
    head: '#F0A0B0',
    headLight: '#F8C0CC',
    headDark: '#D88090',
    hoodie: '#1A1A1A',
    hoodieLight: '#2A2A2A',
    hoodieDark: '#0F0F0F',
    stripe: '#FFFFFF',
    stripeDim: '#E8E8E8',
    zipper: '#AAAAAA',
    flipper: '#1A1A1A',
    flipperDark: '#0A0A0A',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#0A0A0A',
    mouthLine: '#1A1A1A',
};

const Y_OFFSET = 6;

/** Hats are authored for penguin heads — slight offset for FONZ's rounded crown */
export const FONZ_HAT_OFFSET = { y: 1, z: 1 };

export const generateFonzHead = () => {
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

    // Compact head stub poking out of hoodie — no long neck
    const HEAD_RADIUS_X = 2.4;
    const HEAD_RADIUS_Z = 2.2;
    const HEAD_CENTER_Z = 0.3;
    const HEAD_HEIGHT = 4;

    for (let localY = 0; localY <= HEAD_HEIGHT; localY++) {
        let radiusX = HEAD_RADIUS_X;
        let radiusZ = HEAD_RADIUS_Z;
        let centerZ = HEAD_CENTER_Z;

        if (localY > 3) {
            const t = localY - 3;
            radiusX = HEAD_RADIUS_X * (1 - t * 0.45);
            radiusZ = HEAD_RADIUS_Z * (1 - t * 0.4);
            centerZ = 0.2;
        }

        for (let x = -Math.ceil(radiusX); x <= Math.ceil(radiusX); x++) {
            for (let z = -Math.ceil(radiusZ); z <= Math.ceil(radiusZ); z++) {
                const dz = z - centerZ;
                if (
                    radiusX > 0.1 &&
                    radiusZ > 0.1 &&
                    (x * x) / (radiusX * radiusX) + (dz * dz) / (radiusZ * radiusZ) <= 1
                ) {
                    let color = 'head';
                    if (localY >= 3) color = 'headLight';
                    if (localY <= 0) color = 'headDark';
                    addVoxel(x, localY, z, color);
                }
            }
        }
    }

    const eyeY = 2;
    const eyeZ = 2;

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx * dx + dy * dy <= 1.5) {
                addVoxel(-1 + dx * 0.8, eyeY + dy, eyeZ, 'eyeWhite');
                addVoxel(1 + dx * 0.8, eyeY + dy, eyeZ, 'eyeWhite');
            }
        }
    }

    addVoxel(-1, eyeY, eyeZ + 1, 'eyeBlack');
    addVoxel(1, eyeY, eyeZ + 1, 'eyeBlack');

    return Array.from(voxelMap.values());
};

export const generateFonzBody = () => {
    const bodyMap = new Map();

    const addVoxel = (x, y, z, c) => {
        const key = `${x},${y},${z}`;
        if (!bodyMap.has(key)) {
            bodyMap.set(key, { x, y, z, c });
        }
    };

    for (let x = -6; x <= 6; x++) {
        for (let y = -7; y <= 5; y++) {
            for (let z = -5; z <= 5; z++) {
                const yMod = y > 0 ? 1 : 1.2;
                if (x * x + (y * yMod) * (y * yMod) + z * z <= 36) {
                    let color = 'hoodie';
                    if (Math.abs(x) > 4) color = 'hoodieDark';
                    if (y > 3) color = 'hoodieLight';
                    // Adidas stripes on side face only — never wrap to front/back
                    if (
                        z === 0 &&
                        y >= -5 &&
                        y <= 3 &&
                        (x === -5 || x === -4 || x === 4 || x === 5)
                    ) {
                        color = 'stripe';
                    }
                    addVoxel(x, y, z, color);
                }
            }
        }
    }

    for (let x = -4; x <= 4; x++) {
        for (let z = -4; z <= 4; z++) {
            const dist = x * x + z * z;
            if (dist <= 18 && dist >= 6) {
                addVoxel(x, 4, z, 'hoodieDark');
                addVoxel(x, 5, z, 'hoodie');
            }
        }
    }

    addVoxel(0, 4, 5, 'zipper');
    addVoxel(0, 3, 5, 'zipper');
    addVoxel(0, 2, 5, 'hoodieLight');

    return Array.from(bodyMap.values());
};

export const generateFonzFlippers = (isLeft) => {
    const voxels = [];
    for (let x = 0; x < 3; x++) {
        for (let y = -4; y < 2; y++) {
            for (let z = -1; z < 2; z++) {
                if (x === 2 && (y > 0 || y < -3)) continue;
                const c = x === 2 ? 'flipperDark' : 'flipper';
                voxels.push({ x: isLeft ? x + 5 : -x - 5, y, z, c });
            }
        }
    }
    return voxels;
};

export const generateFonzFeet = () => [...generateFoot(-3), ...generateFoot(3)];

export const getFonzPivots = () => ({
    head: { x: 0, y: Y_OFFSET, z: 0 },
    body: { x: 0, y: 0, z: 0 },
    flipperLeft: { x: 5, y: 0, z: 0 },
    flipperRight: { x: -5, y: 0, z: 0 },
    footLeft: { x: 3, y: -6, z: 1 },
    footRight: { x: -3, y: -6, z: 1 },
});

export const generateFonzComplete = () => {
    const voxelMap = new Map();
    const addVoxels = (voxels) => {
        voxels.forEach((v) => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) voxelMap.set(key, v);
        });
    };

    addVoxels(generateFonzHead());
    addVoxels(generateFonzBody());
    addVoxels(generateFonzFlippers(true));
    addVoxels(generateFonzFlippers(false));
    addVoxels(generateFonzFeet());

    return Array.from(voxelMap.values());
};

export const FonzGenerators = {
    head: generateFonzHead,
    body: generateFonzBody,
    flipperLeft: () => generateFonzFlippers(true),
    flipperRight: () => generateFonzFlippers(false),
    feet: generateFonzFeet,
    complete: generateFonzComplete,
    pivots: getFonzPivots,
};

export default FonzGenerators;
