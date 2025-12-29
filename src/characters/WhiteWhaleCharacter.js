/**
 * WhiteWhaleCharacter - The White Whale character model
 * Whale head on penguin body - no cosmetics shown
 */

import { PALETTE } from '../constants';
import { generateBaseBody, generateFlippers, generateFoot } from '../generators';

// White Whale color palette - Gray-blue like a dolphin/whale
export const WHITE_WHALE_PALETTE = {
    main: '#6B7B8C',
    mainLight: '#8494A5',
    mainDark: '#4A5A6B',
    mainDeep: '#3A4A5B',
    belly: '#9BA8B5',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#0A0A15',
    eyeRing: '#2A3A4A',
    mouthLine: '#3A4A5A',
};

// Black Whale color palette
export const BLACK_WHALE_PALETTE = {
    main: '#2A2A2A',
    mainLight: '#3D3D3D',
    mainDark: '#1A1A1A',
    mainDeep: '#0F0F0F',
    belly: '#4A4A4A',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#000000',
    eyeRing: '#1A1A1A',
    mouthLine: '#1A1A1A',
};

// Silver Whale color palette
export const SILVER_WHALE_PALETTE = {
    main: '#A8A8B8',
    mainLight: '#C8C8D8',
    mainDark: '#808090',
    mainDeep: '#606070',
    belly: '#D8D8E8',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1A2A',
    eyeRing: '#505060',
    mouthLine: '#606070',
};

// Gold Whale color palette
export const GOLD_WHALE_PALETTE = {
    main: '#D4A84B',
    mainLight: '#E8C86B',
    mainDark: '#B8882B',
    mainDeep: '#8A6820',
    belly: '#F0D878',
    eyeWhite: '#FFFFFF',
    eyeBlack: '#2A2010',
    eyeRing: '#6A5020',
    mouthLine: '#8A6820',
};

const Y_OFFSET = 6;

export const generateWhaleHead = () => {
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
    
    // Main head shape
    for (let z = -4; z <= 12; z++) {
        let radiusX, radiusY;
        let centerY = 0;
        
        if (z <= 0) {
            const t = (z + 4) / 4;
            radiusX = 3 + t * 2.5;
            radiusY = 2.5 + t * 2;
        } else if (z <= 5) {
            radiusX = 5.5;
            radiusY = 4.5;
        } else {
            const t = (z - 5) / 7;
            radiusX = 5.5 * (1 - t * 0.85);
            radiusY = 4.5 * (1 - t * 0.82);
            centerY = -t * 1.5;
        }
        
        for (let y = -Math.ceil(radiusY) - 2; y <= Math.ceil(radiusY) + 2; y++) {
            for (let x = -Math.ceil(radiusX); x <= Math.ceil(radiusX); x++) {
                const adjustedY = y - centerY;
                const distX = radiusX > 0.1 ? x / radiusX : 0;
                const distY = radiusY > 0.1 ? adjustedY / radiusY : 0;
                
                if (distX * distX + distY * distY <= 1) {
                    let color = WHITE_WHALE_PALETTE.main;
                    if (adjustedY > radiusY * 0.5) color = WHITE_WHALE_PALETTE.mainLight;
                    if (Math.abs(x) > radiusX * 0.7) color = WHITE_WHALE_PALETTE.mainDark;
                    if (adjustedY < -radiusY * 0.3) color = WHITE_WHALE_PALETTE.belly;
                    addVoxel(x, y, z, color);
                }
            }
        }
    }
    
    // Simple gap fill - just round off top edge at y=4 and y=5
    for (let z = -1; z <= 4; z++) {
        const zDist = Math.abs(z - 1.5);
        const r = Math.max(0, Math.floor(4 - zDist));
        for (let x = -r; x <= r; x++) {
            addVoxel(x, 4, z, WHITE_WHALE_PALETTE.mainLight);
            if (Math.abs(x) <= r - 1) {
                addVoxel(x, 5, z, WHITE_WHALE_PALETTE.mainLight);
            }
        }
    }
    
    // Eyes
    addVoxel(6, 1, 3, WHITE_WHALE_PALETTE.eyeBlack);
    addVoxel(6, 1, 4, WHITE_WHALE_PALETTE.eyeBlack);
    addVoxel(6, 2, 3, WHITE_WHALE_PALETTE.eyeWhite);
    addVoxel(-6, 1, 3, WHITE_WHALE_PALETTE.eyeBlack);
    addVoxel(-6, 1, 4, WHITE_WHALE_PALETTE.eyeBlack);
    addVoxel(-6, 2, 3, WHITE_WHALE_PALETTE.eyeWhite);
    
    // Mouth
    for (let z = 8; z <= 11; z++) {
        addVoxel(0, -2, z, WHITE_WHALE_PALETTE.mouthLine);
    }
    
    // Blowhole
    addVoxel(0, 6, 2, WHITE_WHALE_PALETTE.mainDark);
    
    return Array.from(voxelMap.values());
};

export const generateWhaleBody = () => {
    const bodyMap = new Map();
    for (let x = -6; x <= 6; x++) {
        for (let y = -7; y <= 5; y++) {
            for (let z = -5; z <= 5; z++) {
                let yMod = y > 0 ? 1 : 1.2;
                if (x * x + (y * yMod) * (y * yMod) + z * z <= 36) {
                    let color = WHITE_WHALE_PALETTE.main;
                    if (z > 2 && x > -4 && x < 4 && y < 3 && y > -6) color = WHITE_WHALE_PALETTE.belly;
                    if (Math.abs(x) > 4) color = WHITE_WHALE_PALETTE.mainDark;
                    if (y > 3) color = WHITE_WHALE_PALETTE.mainLight;
                    bodyMap.set(`${x},${y},${z}`, { x, y, z, c: color });
                }
            }
        }
    }
    return Array.from(bodyMap.values());
};

export const generateWhaleFlippers = (isLeft) => {
    const voxels = [];
    for (let x = 0; x < 3; x++) {
        for (let y = -4; y < 2; y++) {
            for (let z = -1; z < 2; z++) {
                if (x === 2 && (y > 0 || y < -3)) continue;
                const c = (x === 2) ? WHITE_WHALE_PALETTE.mainDark : WHITE_WHALE_PALETTE.main;
                voxels.push({ x: isLeft ? x + 5 : -x - 5, y: y - 1, z, c });
            }
        }
    }
    return voxels;
};

export const generateWhaleFeet = () => [...generateFoot(-3), ...generateFoot(3)];

export const getWhalePivots = () => ({
    head: { x: 0, y: Y_OFFSET, z: 0 },
    body: { x: 0, y: 0, z: 0 },
    flipperLeft: { x: 5, y: 0, z: 0 },
    flipperRight: { x: -5, y: 0, z: 0 },
    footLeft: { x: 3, y: -6, z: 1 },
    footRight: { x: -3, y: -6, z: 1 },
});

export const generateWhaleComplete = () => {
    const voxelMap = new Map();
    const addVoxels = (voxels) => {
        voxels.forEach(v => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) voxelMap.set(key, v);
        });
    };
    addVoxels(generateWhaleHead());
    addVoxels(generateWhaleBody());
    addVoxels(generateWhaleFlippers(true));
    addVoxels(generateWhaleFlippers(false));
    addVoxels(generateWhaleFeet());
    return Array.from(voxelMap.values());
};

export const WhiteWhaleGenerators = {
    head: generateWhaleHead,
    body: generateWhaleBody,
    flipperLeft: () => generateWhaleFlippers(true),
    flipperRight: () => generateWhaleFlippers(false),
    feet: generateWhaleFeet,
    complete: generateWhaleComplete,
    pivots: getWhalePivots,
};

// Factory to create whale generators with custom palette
const createWhaleGenerators = (palette) => {
    const genHead = () => {
        const voxelMap = new Map();
        const addVoxel = (x, y, z, c) => {
            const rx = Math.round(x);
            const ry = Math.round(y) + Y_OFFSET;
            const rz = Math.round(z);
            const key = `${rx},${ry},${rz}`;
            if (!voxelMap.has(key)) voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        };
        for (let z = -4; z <= 12; z++) {
            let radiusX, radiusY, centerY = 0;
            if (z <= 0) { const t = (z + 4) / 4; radiusX = 3 + t * 2.5; radiusY = 2.5 + t * 2; }
            else if (z <= 5) { radiusX = 5.5; radiusY = 4.5; }
            else { const t = (z - 5) / 7; radiusX = 5.5 * (1 - t * 0.85); radiusY = 4.5 * (1 - t * 0.82); centerY = -t * 1.5; }
            for (let y = -Math.ceil(radiusY) - 2; y <= Math.ceil(radiusY) + 2; y++) {
                for (let x = -Math.ceil(radiusX); x <= Math.ceil(radiusX); x++) {
                    const adjustedY = y - centerY;
                    const distX = radiusX > 0.1 ? x / radiusX : 0;
                    const distY = radiusY > 0.1 ? adjustedY / radiusY : 0;
                    if (distX * distX + distY * distY <= 1) {
                        let color = palette.main;
                        if (adjustedY > radiusY * 0.5) color = palette.mainLight;
                        if (Math.abs(x) > radiusX * 0.7) color = palette.mainDark;
                        if (adjustedY < -radiusY * 0.3) color = palette.belly;
                        addVoxel(x, y, z, color);
                    }
                }
            }
        }
        for (let z = -1; z <= 4; z++) {
            const zDist = Math.abs(z - 1.5);
            const r = Math.max(0, Math.floor(4 - zDist));
            for (let x = -r; x <= r; x++) {
                addVoxel(x, 4, z, palette.mainLight);
                if (Math.abs(x) <= r - 1) addVoxel(x, 5, z, palette.mainLight);
            }
        }
        addVoxel(6, 1, 3, palette.eyeBlack); addVoxel(6, 1, 4, palette.eyeBlack); addVoxel(6, 2, 3, palette.eyeWhite);
        addVoxel(-6, 1, 3, palette.eyeBlack); addVoxel(-6, 1, 4, palette.eyeBlack); addVoxel(-6, 2, 3, palette.eyeWhite);
        for (let z = 8; z <= 11; z++) addVoxel(0, -2, z, palette.mouthLine);
        addVoxel(0, 6, 2, palette.mainDark);
        return Array.from(voxelMap.values());
    };
    const genBody = () => {
        const bodyMap = new Map();
        for (let x = -6; x <= 6; x++) {
            for (let y = -7; y <= 5; y++) {
                for (let z = -5; z <= 5; z++) {
                    let yMod = y > 0 ? 1 : 1.2;
                    if (x * x + (y * yMod) * (y * yMod) + z * z <= 36) {
                        let color = palette.main;
                        if (z > 2 && x > -4 && x < 4 && y < 3 && y > -6) color = palette.belly;
                        if (Math.abs(x) > 4) color = palette.mainDark;
                        if (y > 3) color = palette.mainLight;
                        bodyMap.set(`${x},${y},${z}`, { x, y, z, c: color });
                    }
                }
            }
        }
        return Array.from(bodyMap.values());
    };
    const genFlippers = (isLeft) => {
        const voxels = [];
        for (let x = 0; x < 3; x++) {
            for (let y = -4; y < 2; y++) {
                for (let z = -1; z < 2; z++) {
                    if (x === 2 && (y > 0 || y < -3)) continue;
                    const c = (x === 2) ? palette.mainDark : palette.main;
                    voxels.push({ x: isLeft ? x + 5 : -x - 5, y: y - 1, z, c });
                }
            }
        }
        return voxels;
    };
    return {
        head: genHead,
        body: genBody,
        flipperLeft: () => genFlippers(true),
        flipperRight: () => genFlippers(false),
        feet: generateWhaleFeet,
        pivots: getWhalePivots,
    };
};

// Black Whale generators
export const BlackWhaleGenerators = createWhaleGenerators(BLACK_WHALE_PALETTE);

// Silver Whale generators
export const SilverWhaleGenerators = createWhaleGenerators(SILVER_WHALE_PALETTE);

// Gold Whale generators
export const GoldWhaleGenerators = createWhaleGenerators(GOLD_WHALE_PALETTE);

export default WhiteWhaleGenerators;
