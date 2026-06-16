/**
 * Fishing rod voxel model — shared by held flipper, world drops, and starter pickup.
 */

import { PALETTE, VOXEL_SIZE } from '../constants';

export const FISHING_ROD_ITEM_IDS = ['basic_rod', 'iron_rod', 'pro_rod', 'master_rod'];

const ROD_PALETTES = {
    basic_rod: {
        grip: '#5c4033',
        gripDark: '#3d2817',
        blank: '#6b4423',
        blankDark: '#4a3520',
        reel: '#9e9e9e',
        reelDark: '#757575',
        spool: '#bdbdbd',
        guide: '#b0bec5',
        tip: '#eceff1',
        line: '#ffffff'
    },
    iron_rod: {
        grip: '#37474f',
        gripDark: '#263238',
        blank: '#5d4037',
        blankDark: '#4e342e',
        reel: '#90a4ae',
        reelDark: '#607d8b',
        spool: '#cfd8dc',
        guide: '#78909c',
        tip: '#eceff1',
        line: '#ffffff'
    },
    pro_rod: {
        grip: '#1b5e20',
        gripDark: '#0d3d12',
        blank: '#2e2e2e',
        blankDark: '#1a1a1a',
        reel: '#42a5f5',
        reelDark: '#1565c0',
        spool: '#90caf9',
        guide: '#64b5f6',
        tip: '#e3f2fd',
        line: '#ffffff'
    },
    master_rod: {
        grip: '#4a148c',
        gripDark: '#311b92',
        blank: '#212121',
        blankDark: '#0d0d0d',
        reel: '#ffd700',
        reelDark: '#ffb300',
        spool: '#fff176',
        guide: '#ffeb3b',
        tip: '#fffde7',
        line: '#ffffff'
    }
};

function resolveRodId(itemId) {
    if (FISHING_ROD_ITEM_IDS.includes(itemId)) return itemId;
    return 'basic_rod';
}

/**
 * Rod extends along +Z (handle at z=0, tip at high z) — matches flipper hold orientation.
 */
export function buildFishingRodVoxels(itemId = 'basic_rod') {
    const id = resolveRodId(itemId);
    const c = ROD_PALETTES[id] || ROD_PALETTES.basic_rod;
    const voxels = [];
    const add = (x, y, z, color) => voxels.push({ x, y, z, c: color });

    // Cork grip
    for (let z = 0; z < 3; z++) {
        add(0, 0, z, z % 2 ? c.grip : c.gripDark);
        add(0, 1, z, c.gripDark);
        add(0, -1, z, c.gripDark);
    }

    // Blank / shaft
    for (let z = 3; z < 12; z++) {
        add(0, 0, z, z % 2 === 0 ? c.blank : c.blankDark);
        if (z === 7 || z === 10) add(0, 1, z, c.guide);
    }

    // Reel seat + reel body
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            if (Math.abs(x) + Math.abs(y) <= 2) {
                add(x, y, 4, c.reelDark);
                add(x, y, 5, c.reel);
            }
        }
    }
    add(0, -2, 5, c.spool);
    add(0, -2, 4, c.reelDark);
    add(1, 0, 5, c.spool);
    add(-1, 0, 5, c.spool);

    // Tip section + line ring
    for (let z = 12; z < 15; z++) {
        add(0, 0, z, c.blankDark);
    }
    add(0, 0, 15, c.tip);
    add(0, 1, 14, c.guide);
    add(0, 2, 15, c.line);
    add(0, 2, 16, c.line);

    if (id === 'master_rod') {
        add(0, 1, 8, '#fff176');
        add(0, -1, 11, '#fff176');
    }

    return voxels;
}

/** Rotate held-orientation voxels so the rod lies flat on the ground (shaft along +X). */
export function voxelsToWorldLay(voxels) {
    return voxels.map((v) => ({
        ...v,
        x: v.z,
        y: v.y,
        z: -v.x
    }));
}

/** Center mesh on X/Z and sit on Y=0 — for drops and ground props. */
export function centerVoxelsOnGround(voxels) {
    if (!voxels?.length) return [];
    let minX = Infinity; let maxX = -Infinity;
    let minY = Infinity; let maxY = -Infinity;
    let minZ = Infinity; let maxZ = -Infinity;
    for (const v of voxels) {
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
    }
    const cx = (minX + maxX) / 2;
    const cy = minY;
    const cz = (minZ + maxZ) / 2;
    return voxels.map((v) => ({
        ...v,
        x: v.x - cx,
        y: v.y - cy,
        z: v.z - cz
    }));
}

export function getFishingRodWorldVoxels(itemId = 'basic_rod') {
    return centerVoxelsOnGround(voxelsToWorldLay(buildFishingRodVoxels(itemId)));
}

export const WORLD_ROD_MESH_SCALE = VOXEL_SIZE * 0.42;

/**
 * Ground / drop / pickup mesh group (caller sets position & rotation).
 */
export function buildFishingRodWorldGroup(THREE, buildPartMerged, itemId = 'basic_rod') {
    const voxels = getFishingRodWorldVoxels(itemId);
    if (!voxels.length || !buildPartMerged || !THREE) return null;

    const mesh = buildPartMerged(voxels, PALETTE);
    const group = new THREE.Group();
    group.name = `fishing_rod_world_${resolveRodId(itemId)}`;
    group.add(mesh);
    group.scale.setScalar(WORLD_ROD_MESH_SCALE);
    return group;
}

export function isFishingRodItemId(itemId) {
    return FISHING_ROD_ITEM_IDS.includes(itemId);
}
