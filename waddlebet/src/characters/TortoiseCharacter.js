/**
 * TortoiseCharacter - Jonathan the Tortoise
 * 
 * Proper tortoise anatomy - NOT a reskinned dog:
 * - Large domed shell as the main body (the defining feature)
 * - Small round head on a long extending neck
 * - Four thick, straight column-like legs (elephant-style)
 * - Tiny pointed tail poking out the back
 * - Flat plastron (belly plate) underneath
 */

export const TORTOISE_PALETTE = {
    main: '#5A7A3A',         // Olive green skin
    mainLight: '#6A8A4A',    // Light olive
    mainDark: '#4A6A2A',     // Dark olive
    mainDeep: '#3A5A1A',     // Deep green

    belly: '#C8B888',        // Sandy/cream underbelly (plastron)
    bellyLight: '#D8C898',   // Light cream

    shell: '#6B4E2A',        // Brown shell
    shellLight: '#8B6E3A',   // Light brown shell highlight
    shellDark: '#4B3E1A',    // Dark brown shell shadow
    shellPattern: '#8A7040', // Shell scute pattern
    shellRim: '#5A4020',     // Shell edge/rim

    nose: '#3A3020',         // Dark beak tip
    mouthLine: '#5A5030',    // Mouth line

    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#4A3A20',

    claws: '#D8C090',        // Light claw tips
};

export const DARK_TORTOISE_PALETTE = {
    main: '#3A4A2A',
    mainLight: '#4A5A3A',
    mainDark: '#2A3A1A',
    mainDeep: '#1A2A0A',
    belly: '#8A8060',
    bellyLight: '#9A9070',
    shell: '#3A2E1A',
    shellLight: '#5A4E2A',
    shellDark: '#2A1E0A',
    shellPattern: '#4A4020',
    shellRim: '#2A2010',
    nose: '#2A2010',
    mouthLine: '#3A3020',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#3A2A10',
    claws: '#A89070',
};

export const DESERT_TORTOISE_PALETTE = {
    main: '#B89060',
    mainLight: '#C8A070',
    mainDark: '#A88050',
    mainDeep: '#987040',
    belly: '#E8D8B8',
    bellyLight: '#F0E0C8',
    shell: '#8A6830',
    shellLight: '#AA8840',
    shellDark: '#6A4820',
    shellPattern: '#9A7838',
    shellRim: '#7A5828',
    nose: '#4A3820',
    mouthLine: '#6A5830',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#5A4020',
    claws: '#E0D0A0',
};

export const BLUE_TORTOISE_PALETTE = {
    main: '#3A6A7A',
    mainLight: '#4A7A8A',
    mainDark: '#2A5A6A',
    mainDeep: '#1A4A5A',
    belly: '#88B8C8',
    bellyLight: '#98C8D8',
    shell: '#2A4A5A',
    shellLight: '#3A5A6A',
    shellDark: '#1A3A4A',
    shellPattern: '#3A5A68',
    shellRim: '#1A4050',
    nose: '#2A3040',
    mouthLine: '#3A4050',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#3A5060',
    claws: '#A0C8D0',
};

export const RED_TORTOISE_PALETTE = {
    main: '#7A3A2A',
    mainLight: '#8A4A3A',
    mainDark: '#6A2A1A',
    mainDeep: '#5A1A0A',
    belly: '#C89878',
    bellyLight: '#D8A888',
    shell: '#5A2A1A',
    shellLight: '#7A4A2A',
    shellDark: '#4A1A0A',
    shellPattern: '#6A3A28',
    shellRim: '#4A2018',
    nose: '#3A2010',
    mouthLine: '#5A3020',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#4A2A10',
    claws: '#D0B090',
};

export const TORTOISE_PALETTES = {
    green: TORTOISE_PALETTE,
    dark: DARK_TORTOISE_PALETTE,
    desert: DESERT_TORTOISE_PALETTE,
    blue: BLUE_TORTOISE_PALETTE,
    red: RED_TORTOISE_PALETTE,
};

export const generateTortoisePalette = (primary, secondary) => {
    const adjustColor = (hex, percent) => {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * percent / 100)));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100)));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + Math.round(255 * percent / 100)));
        return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    return {
        main: primary,
        mainLight: adjustColor(primary, 12),
        mainDark: adjustColor(primary, -12),
        mainDeep: adjustColor(primary, -20),
        belly: secondary,
        bellyLight: adjustColor(secondary, 10),
        shell: adjustColor(secondary, -25),
        shellLight: adjustColor(secondary, -12),
        shellDark: adjustColor(secondary, -35),
        shellPattern: adjustColor(secondary, -18),
        shellRim: adjustColor(secondary, -30),
        nose: '#3A3020',
        mouthLine: adjustColor(primary, -30),
        eyeWhite: '#FFFFFF',
        eyeBlack: '#1A1010',
        eyeBrown: '#4A3A20',
        claws: adjustColor(secondary, 10),
    };
};

const Y_OFFSET = 4;

/**
 * Generate the tortoise head + long neck
 * Cute round head with friendly face, on an extending neck
 */
export const generateTortoiseHead = () => {
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

    // === NECK extending forward and upward from shell ===
    // Starts at z=6 (clear of shell front edge)
    for (let nz = 6; nz <= 11; nz++) {
        const neckProgress = (nz - 6) / 5;
        const neckY = -1 + neckProgress * 3;
        const neckRadius = 2.0 - neckProgress * 0.3;

        for (let x = -Math.ceil(neckRadius); x <= Math.ceil(neckRadius); x++) {
            for (let dy = -Math.ceil(neckRadius); dy <= Math.ceil(neckRadius); dy++) {
                const dist = (x / neckRadius) * (x / neckRadius) + (dy / neckRadius) * (dy / neckRadius);
                if (dist <= 1) {
                    let color = 'main';
                    if (dy > 0.5) color = 'mainLight';
                    if (dy < -0.5) color = 'belly';
                    if (nz % 2 === 0 && dist > 0.7) color = 'mainDark';
                    addVoxel(x, neckY + dy, nz, color);
                }
            }
        }
    }

    // === ROUND HEAD - bigger and rounder for a cute look ===
    const headCenterY = 2;
    const headCenterZ = 13;
    const headRX = 3.5;
    const headRY = 3.2;
    const headRZ = 3.2;

    for (let x = -Math.ceil(headRX); x <= Math.ceil(headRX); x++) {
        for (let y = -Math.ceil(headRY); y <= Math.ceil(headRY); y++) {
            for (let z = -Math.ceil(headRZ); z <= Math.ceil(headRZ); z++) {
                const dx = x / headRX;
                const dy = y / headRY;
                const dz = z / headRZ;
                if (dx * dx + dy * dy + dz * dz <= 1) {
                    let color = 'main';
                    // Top of head lighter
                    if (y > 1.5) color = 'mainLight';
                    // Chin / underside lighter cream
                    if (y < -1) color = 'belly';
                    // Gentle cheek shading
                    if (Math.abs(x) > headRX * 0.75 && y < 1) color = 'mainDark';
                    addVoxel(x, headCenterY + y, headCenterZ + z, color);
                }
            }
        }
    }

    // === CUTE EYES on front of face ===
    // Force-set helper that overwrites existing voxels (needed for pupils on top of head sphere)
    const forceVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        voxelMap.set(`${rx},${ry},${rz}`, { x: rx, y: ry, z: rz, c });
    };

    const eyeY = headCenterY + 1;
    const eyeZ = headCenterZ + 3; // On the front surface of the head

    // Left eye - compact 2w x 2h white with 1 black pupil
    forceVoxel(-2, eyeY, eyeZ, 'eyeWhite');
    forceVoxel(-2, eyeY + 1, eyeZ, 'eyeWhite');
    forceVoxel(-3, eyeY, eyeZ, 'eyeWhite');
    forceVoxel(-3, eyeY + 1, eyeZ, 'eyeWhite');
    // Pupil at bottom-inner corner (looking forward, slightly inward = cute)
    forceVoxel(-2, eyeY, eyeZ, 'eyeBlack');

    // Right eye - mirror
    forceVoxel(2, eyeY, eyeZ, 'eyeWhite');
    forceVoxel(2, eyeY + 1, eyeZ, 'eyeWhite');
    forceVoxel(3, eyeY, eyeZ, 'eyeWhite');
    forceVoxel(3, eyeY + 1, eyeZ, 'eyeWhite');
    // Pupil at bottom-inner corner
    forceVoxel(2, eyeY, eyeZ, 'eyeBlack');

    // === HAPPY SMILE - upward curve at corners ===
    forceVoxel(-2, headCenterY - 1, headCenterZ + 3, 'mouthLine');
    forceVoxel(-1, headCenterY - 2, headCenterZ + 3, 'mouthLine');
    forceVoxel(0, headCenterY - 2, headCenterZ + 3, 'mouthLine');
    forceVoxel(1, headCenterY - 2, headCenterZ + 3, 'mouthLine');
    forceVoxel(2, headCenterY - 1, headCenterZ + 3, 'mouthLine');

    return Array.from(voxelMap.values());
};

/**
 * Generate the tortoise body - flat plastron (belly plate) only
 * No shell walls here - those are part of the shell to prevent overlap
 */
export const generateTortoiseBody = () => {
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

    // Flat plastron/underbelly only (y=-8 to -5)
    for (let y = -8; y <= -5; y++) {
        const radiusX = 6;
        const radiusZ = 5;
        for (let x = -radiusX; x <= radiusX; x++) {
            for (let z = -radiusZ; z <= radiusZ; z++) {
                const dist = (x / radiusX) * (x / radiusX) + (z / radiusZ) * (z / radiusZ);
                if (dist <= 1) {
                    let color = 'belly';
                    if (y <= -7) color = 'bellyLight';
                    if (dist > 0.8) color = 'shellRim';
                    addVoxel(x, y, z, color);
                }
            }
        }
    }

    return Array.from(voxelMap.values());
};

/**
 * Generate the complete shell (dome + walls)
 * Starts at y=-4 (just above plastron) up to y=7 (tall dome)
 */
export const generateTortoiseShell = () => {
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

    // Shell from y=-4 (walls) to y=7 (taller dome peak)
    for (let y = -4; y <= 7; y++) {
        const t = (y + 4) / 11; // 0 at bottom, 1 at top
        const domeScale = Math.sqrt(1 - t * t * 0.7);
        const radiusX = 7 * domeScale;
        const radiusZ = 5.5 * domeScale;

        for (let x = -Math.ceil(radiusX); x <= Math.ceil(radiusX); x++) {
            for (let z = -Math.ceil(radiusZ); z <= Math.ceil(radiusZ); z++) {
                const rx = Math.max(radiusX, 0.5);
                const rz = Math.max(radiusZ, 0.5);
                const dist = (x / rx) * (x / rx) + (z / rz) * (z / rz);

                if (dist <= 1) {
                    // Lower section (walls): only outer ring. Upper section: outer ring + cap
                    const isWall = y < -1 && dist > 0.7;
                    const isDome = y >= -1 && (dist > 0.55 || y >= 3);

                    if (isWall || isDome) {
                        let color = 'shell';

                        if (y >= 4) color = 'shellLight';
                        if (y <= -2) color = 'shellDark';

                        // Scute pattern
                        const scuteX = Math.abs(x + (y % 2) * 2) % 4;
                        const scuteZ = Math.abs(z + (y % 2) * 2) % 4;
                        if ((scuteX === 0 || scuteZ === 0) && y > -2 && y < 6) {
                            color = 'shellPattern';
                        }

                        // Vertebral ridge
                        if (Math.abs(x) <= 1 && y >= 2 && z >= -3 && z <= 3) {
                            color = 'shellPattern';
                        }

                        // Rim at bottom edge
                        if (y === -4 && dist > 0.6) {
                            color = 'shellRim';
                        }

                        addVoxel(x, y, z, color);
                    }
                }
            }
        }
    }

    return Array.from(voxelMap.values());
};

/**
 * Generate front leg - starts below the shell (y=-8) so it doesn't clip
 */
export const generateTortoiseArm = (isLeft) => {
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

    const legX = side * 5;
    const legZ = 3;
    const legTop = -8;    // Starts well below the shell
    const legHeight = 5;  // Shorter column, feet at same ground level

    for (let i = 0; i < legHeight; i++) {
        const legY = legTop - i;
        const thickness = i < 1 ? 1.5 : (i > legHeight - 2 ? 1.0 : 1.3);

        for (let dx = -Math.ceil(thickness); dx <= Math.ceil(thickness); dx++) {
            for (let dz = -Math.ceil(thickness); dz <= Math.ceil(thickness); dz++) {
                const dist = (dx / thickness) * (dx / thickness) + (dz / thickness) * (dz / thickness);
                if (dist <= 1) {
                    let color = 'main';
                    if (dx * side > 0) color = 'mainLight';
                    if (dx * side < 0) color = 'mainDark';
                    if (i % 2 === 0 && dist > 0.6) color = 'mainDark';
                    addVoxel(legX + dx, legY, legZ + dz, color);
                }
            }
        }
    }

    const footY = legTop - legHeight;
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            const dist = (dx / 2.3) * (dx / 2.3) + (dz / 2.3) * (dz / 2.3);
            if (dist <= 1) {
                addVoxel(legX + dx, footY, legZ + dz, 'mainDark');
            }
        }
    }
    addVoxel(legX - 1, footY, legZ + 3, 'claws');
    addVoxel(legX, footY, legZ + 3, 'claws');
    addVoxel(legX + 1, footY, legZ + 3, 'claws');

    return Array.from(voxelMap.values());
};

/**
 * Generate back leg - at z=-8, right next to the tail
 */
export const generateTortoiseLeg = (isLeft) => {
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

    const legX = side * 4;
    const legZ = -8;      // Far back, right by the tail
    const legTop = -8;    // Starts well below the shell
    const legHeight = 5;  // Same as front legs

    for (let i = 0; i < legHeight; i++) {
        const legY = legTop - i;
        const thickness = i < 1 ? 1.5 : (i > legHeight - 2 ? 1.0 : 1.3);

        for (let dx = -Math.ceil(thickness); dx <= Math.ceil(thickness); dx++) {
            for (let dz = -Math.ceil(thickness); dz <= Math.ceil(thickness); dz++) {
                const dist = (dx / thickness) * (dx / thickness) + (dz / thickness) * (dz / thickness);
                if (dist <= 1) {
                    let color = 'main';
                    if (dx * side > 0) color = 'mainLight';
                    if (dx * side < 0) color = 'mainDark';
                    if (i % 2 === 0 && dist > 0.6) color = 'mainDark';
                    addVoxel(legX + dx, legY, legZ + dz, color);
                }
            }
        }
    }

    const footY = legTop - legHeight;
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            const dist = (dx / 2.3) * (dx / 2.3) + (dz / 2.3) * (dz / 2.3);
            if (dist <= 1) {
                addVoxel(legX + dx, footY, legZ + dz, 'mainDark');
            }
        }
    }
    addVoxel(legX - 1, footY, legZ - 2, 'claws');
    addVoxel(legX, footY, legZ - 2, 'claws');
    addVoxel(legX + 1, footY, legZ - 2, 'claws');

    return Array.from(voxelMap.values());
};

/**
 * Generate tiny pointed tail
 */
export const generateTortoiseTail = () => {
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

    // Tiny stubby tail poking out the back of shell
    addVoxel(0, -7, -7, 'main');
    addVoxel(0, -7, -8, 'main');
    addVoxel(1, -7, -7, 'mainDark');
    addVoxel(-1, -7, -7, 'mainDark');
    addVoxel(0, -7, -9, 'mainLight'); // Pointed tip
    addVoxel(0, -6, -7, 'main');

    return Array.from(voxelMap.values());
};

/**
 * Pivot points for animation
 */
export const getTortoisePivots = () => ({
    shell: { x: 0, y: 1 + Y_OFFSET, z: 0 },
    tail: { x: 0, y: -7 + Y_OFFSET, z: -7 },
    head: { x: 0, y: 0 + Y_OFFSET, z: 6 },
    body: { x: 0, y: -7 + Y_OFFSET, z: 0 },
    armLeft: { x: 5, y: -8 + Y_OFFSET, z: 3 },
    armRight: { x: -5, y: -8 + Y_OFFSET, z: 3 },
    legLeft: { x: 4, y: -8 + Y_OFFSET, z: -8 },
    legRight: { x: -4, y: -8 + Y_OFFSET, z: -8 },
});

/**
 * Generate complete Tortoise model
 */
export const generateTortoiseComplete = () => {
    const voxelMap = new Map();

    const addVoxels = (voxels) => {
        voxels.forEach(v => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) {
                voxelMap.set(key, v);
            }
        });
    };

    addVoxels(generateTortoiseHead());
    addVoxels(generateTortoiseBody());
    addVoxels(generateTortoiseShell());
    addVoxels(generateTortoiseArm(true));
    addVoxels(generateTortoiseArm(false));
    addVoxels(generateTortoiseLeg(true));
    addVoxels(generateTortoiseLeg(false));
    addVoxels(generateTortoiseTail());

    return Array.from(voxelMap.values());
};

export const TortoiseGenerators = {
    head: generateTortoiseHead,
    body: generateTortoiseBody,
    shell: generateTortoiseShell,
    armLeft: () => generateTortoiseArm(true),
    armRight: () => generateTortoiseArm(false),
    legLeft: () => generateTortoiseLeg(true),
    legRight: () => generateTortoiseLeg(false),
    tail: generateTortoiseTail,
    complete: generateTortoiseComplete,
    pivots: getTortoisePivots,
};

export default TortoiseGenerators;
