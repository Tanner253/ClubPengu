/**
 * BlackBullCharacter - The BLACK BULL
 * Beefy black bull with white curved horns and thick quadruped build.
 */

export const BLACK_BULL_PALETTE = {
    main: '#121212',
    mainLight: '#2E2E2E',
    mainDark: '#080808',
    mainDeep: '#030303',
    belly: '#1A1A1A',
    muzzle: '#2A2A2A',
    muzzleLight: '#3A3A3A',
    nose: '#0A0A0A',
    horn: '#F4F4F4',
    hornLight: '#FFFFFF',
    hornDark: '#D0D0D0',
    hornTip: '#E8E8E8',
    noseRing: '#C0C0C0',
    hoof: '#1E1E1E',
    hoofLight: '#333333',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#000000',
    eyeBrown: '#3A2818',
    mouthLine: '#151515',
    ear: '#181818',
    earInner: '#2A2020',
};

const Y_OFFSET = 3;
const Z_HEAD_OFFSET = 5;

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

const fillCylinder = (voxels, cx, cz, y0, y1, radius, color, yOff = Y_OFFSET, zOff = 0) => {
    for (let y = y0; y <= y1; y++) {
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                if (x * x + z * z <= radius * radius + 0.3) {
                    voxels.add(cx + x, y, cz + z, color, yOff, zOff);
                }
            }
        }
    }
};

/**
 * White curved horns — sweep out, then up, then slightly back (classic bull silhouette)
 */
const addCurvedHorn = (voxels, side) => {
    const points = [];
    for (let t = 0; t <= 1; t += 0.08) {
        const outward = Math.sin(t * Math.PI * 0.55);
        const rise = t * t * 10 + t * 4;
        const back = -t * t * 2.5;
        points.push({
            x: side * (3.5 + outward * 4.2),
            y: 8.5 + rise,
            z: 1.5 + back,
        });
    }

    points.forEach((p, i) => {
        const thickness = i < 3 ? 1.4 : i > points.length - 3 ? 0.9 : 1.2;
        const color = i > points.length * 0.75 ? 'hornTip' : i % 2 === 0 ? 'horn' : 'hornLight';
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = 0; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (Math.abs(dx) + Math.abs(dz) <= thickness) {
                        voxels.add(p.x + dx * 0.6, p.y + dy, p.z + dz * 0.6, color, Y_OFFSET, Z_HEAD_OFFSET);
                    }
                }
            }
        }
    });
};

export const generateBlackBullHead = () => {
    const voxels = createVoxelMap();

    // Skull — wide and heavy
    for (let y = 0; y <= 8; y++) {
        let rx = 5;
        let rz = 4;
        if (y <= 2) {
            rx = 3.5 + y * 0.8;
            rz = 2.8 + y * 0.6;
        } else if (y >= 7) {
            const t = (y - 7);
            rx = 5 - t * 0.8;
            rz = 4 - t * 0.5;
        }

        for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
            for (let z = -Math.ceil(rz); z <= Math.ceil(rz); z++) {
                if ((x * x) / (rx * rx) + (z * z) / (rz * rz) <= 1) {
                    let color = 'main';
                    if (y >= 6) color = 'mainLight';
                    if (Math.abs(x) > rx * 0.72) color = 'mainDark';
                    voxels.add(x, y, z, color, Y_OFFSET, Z_HEAD_OFFSET);
                }
            }
        }
    }

    // Broad flat bull muzzle
    fillBox(voxels, -3, 3, 1, 4, 4, 9, 'muzzle', Y_OFFSET, Z_HEAD_OFFSET);
    fillBox(voxels, -2, 2, 2, 3, 9, 10, 'muzzleLight', Y_OFFSET, Z_HEAD_OFFSET);

    // Nostrils
    voxels.add(-1, 3, 10, 'nose', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.add(1, 3, 10, 'nose', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.add(0, 3, 10, 'noseRing', Y_OFFSET, Z_HEAD_OFFSET);

    // Eyes on sides — stern forward gaze
    [-4, 4].forEach((eyeX) => {
        const side = eyeX > 0 ? 1 : -1;
        voxels.add(eyeX, 5, 3, 'eyeWhite', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.add(eyeX, 6, 3, 'eyeWhite', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.add(eyeX + side, 5, 4, 'eyeBlack', Y_OFFSET, Z_HEAD_OFFSET);
        voxels.add(eyeX + side, 6, 4, 'eyeBrown', Y_OFFSET, Z_HEAD_OFFSET);
    });

    // Small ears tucked below horns
    fillBox(voxels, -5, -3, 7, 8, 0, 2, 'ear', Y_OFFSET, Z_HEAD_OFFSET);
    fillBox(voxels, 3, 5, 7, 8, 0, 2, 'ear', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.add(-4, 7, 1, 'earInner', Y_OFFSET, Z_HEAD_OFFSET);
    voxels.add(4, 7, 1, 'earInner', Y_OFFSET, Z_HEAD_OFFSET);

    // Jaw line
    for (let x = -2; x <= 2; x++) {
        voxels.add(x, 1, 7, 'mouthLine', Y_OFFSET, Z_HEAD_OFFSET);
    }

    addCurvedHorn(voxels, -1);
    addCurvedHorn(voxels, 1);

    return voxels.values();
};

export const generateBlackBullBody = () => {
    const voxels = createVoxelMap();

    // Barrel chest — massive front, tapering haunches
    for (let y = -11; y <= 1; y++) {
        const t = (y + 11) / 12;
        const profile = Math.sin(t * Math.PI);
        const frontBias = y > -4 ? 1.15 : 1;
        const rx = (7.5 * profile + 1.8) * frontBias;
        const rz = 5.5 * profile + 1.3;

        for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
            for (let z = -Math.ceil(rz); z <= Math.ceil(rz); z++) {
                const distX = rx > 0.5 ? x / rx : 0;
                const distZ = rz > 0.5 ? z / rz : 0;
                if (distX * distX + distZ * distZ <= 1) {
                    let color = 'main';
                    if (z > 1 && y < -1) color = 'belly';
                    if (y > -2) color = 'mainDark';
                    if (Math.abs(x) > rx * 0.68) color = 'mainDeep';
                    if (y > -1 && Math.abs(x) < 4 && z > -1) color = 'mainLight';
                    voxels.add(x, y, z, color);
                }
            }
        }
    }

    // Muscular shoulder hump (bull withers)
    for (let y = -1; y <= 3; y++) {
        for (let x = -6; x <= 6; x++) {
            for (let z = -1; z <= 4; z++) {
                const dist = (x * x) / 34 + ((y - 1) * (y - 1)) / 8 + (z * z) / 12;
                if (dist <= 1) {
                    voxels.add(x, y, z, y > 1 ? 'mainLight' : 'mainDark');
                }
            }
        }
    }

    // Thick neck connecting to head
    fillCylinder(voxels, 0, 2, 0, 3, 3, 'mainDark');

    return voxels.values();
};

export const generateBlackBullArm = (isLeft) => {
    const voxels = createVoxelMap();
    const side = isLeft ? 1 : -1;
    const shoulderX = side * 5;
    const shoulderY = -2;
    const legZ = 5;

    // Thick front leg — 2x2 column tapering to hoof
    for (let i = 0; i <= 9; i++) {
        const legY = shoulderY - i;
        const spread = i < 3 ? 1 : 0;
        fillBox(
            voxels,
            shoulderX - 1 + (side < 0 ? 0 : 0),
            shoulderX + 1,
            legY,
            legY + 1,
            legZ - 1,
            legZ + 1,
            i < 2 ? 'mainDeep' : 'main'
        );
        if (spread) {
            voxels.add(shoulderX + side, legY, legZ, 'mainDark');
            voxels.add(shoulderX + side, legY - 1, legZ, 'mainDark');
        }
    }

    const hoofY = shoulderY - 10;
    fillBox(voxels, shoulderX - 1, shoulderX + 1, hoofY, hoofY, legZ - 1, legZ + 2, 'hoofLight');
    fillBox(voxels, shoulderX - 1, shoulderX + 1, hoofY - 1, hoofY - 1, legZ, legZ + 1, 'hoof');

    return voxels.values();
};

export const generateBlackBullLeg = (isLeft) => {
    const voxels = createVoxelMap();
    const side = isLeft ? 1 : -1;
    const hipX = side * 4;
    const hipY = -6;
    const legZ = -6;

    for (let i = 0; i <= 8; i++) {
        const legY = hipY - i;
        fillBox(voxels, hipX - 1, hipX + 1, legY, legY + 1, legZ - 1, legZ + 1, i < 2 ? 'mainDeep' : 'main');
        voxels.add(hipX + side, legY, legZ, 'mainDark');
    }

    const hoofY = hipY - 9;
    fillBox(voxels, hipX - 1, hipX + 1, hoofY, hoofY, legZ - 1, legZ + 1, 'hoofLight');
    fillBox(voxels, hipX - 1, hipX + 1, hoofY - 1, hoofY - 1, legZ, legZ, 'hoof');

    return voxels.values();
};

export const generateBlackBullTail = () => {
    const voxels = createVoxelMap();

    for (let i = 0; i < 5; i++) {
        voxels.add(0, -5 + i * 0.2, -6 - i, 'mainDark');
        if (i > 2) voxels.add(0, -4 + i * 0.2, -7 - i, 'main');
    }
    fillBox(voxels, -1, 1, -3, -2, -10, -9, 'mainLight');

    return voxels.values();
};

export const getBlackBullPivots = () => ({
    head: { x: 0, y: 2 + Y_OFFSET, z: 4 },
    body: { x: 0, y: -4 + Y_OFFSET, z: 0 },
    armLeft: { x: 5, y: -2 + Y_OFFSET, z: 5 },
    armRight: { x: -5, y: -2 + Y_OFFSET, z: 5 },
    legLeft: { x: 4, y: -6 + Y_OFFSET, z: -6 },
    legRight: { x: -4, y: -6 + Y_OFFSET, z: -6 },
    tail: { x: 0, y: -5 + Y_OFFSET, z: -6 },
});

export const generateBlackBullComplete = () => {
    const voxelMap = new Map();
    const addVoxels = (voxels) => {
        voxels.forEach((v) => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) voxelMap.set(key, v);
        });
    };

    addVoxels(generateBlackBullHead());
    addVoxels(generateBlackBullBody());
    addVoxels(generateBlackBullArm(true));
    addVoxels(generateBlackBullArm(false));
    addVoxels(generateBlackBullLeg(true));
    addVoxels(generateBlackBullLeg(false));
    addVoxels(generateBlackBullTail());

    return Array.from(voxelMap.values());
};

export const BlackBullGenerators = {
    head: generateBlackBullHead,
    body: generateBlackBullBody,
    armLeft: () => generateBlackBullArm(true),
    armRight: () => generateBlackBullArm(false),
    legLeft: () => generateBlackBullLeg(true),
    legRight: () => generateBlackBullLeg(false),
    tail: generateBlackBullTail,
    complete: generateBlackBullComplete,
    pivots: getBlackBullPivots,
};

export default BlackBullGenerators;
