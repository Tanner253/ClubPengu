/**
 * Voxel models for game-inventory items held in the penguin's flipper.
 */

import { PALETTE } from '../constants';
import { disposeThreeObject } from '../utils/disposeThreeObject';
import { AXE_ITEM_IDS } from '../config/economy';

const HELD_ITEM_NAME = 'held_game_item';

/** Matches bodyItems bonkShirt flipperAttachment — extends forward (+Z) from right hand */
const RIGHT_FLIPPER_PIVOT = { x: -5, y: 0, z: 0 };
const RIGHT_FLIPPER_OFFSET = { x: -7, y: -4, z: 0 };

const FISH_TIER_PALETTES = {
    1: { body: '#e07040', accent: '#c05830', fin: '#ff9955' },
    2: { body: '#4a9eff', accent: '#2d7fd4', fin: '#7ec8ff' },
    3: { body: '#5cb85c', accent: '#3d8b3d', fin: '#8fd48f' },
    4: { body: '#9b59b6', accent: '#7d3c98', fin: '#c39bd3' },
    5: { body: '#e74c3c', accent: '#c0392b', fin: '#ff7f6e' },
    6: { body: '#1abc9c', accent: '#16a085', fin: '#76d7c4' },
    7: { body: '#3498db', accent: '#2471a3', fin: '#85c1e9' },
    8: { body: '#8e44ad', accent: '#6c3483', fin: '#bb8fce' },
    9: { body: '#f1c40f', accent: '#d4ac0d', fin: '#f9e79f' },
    10: { body: '#ffd700', accent: '#ffb300', fin: '#fff176' }
};

const AXE_PALETTES = {
    basic_axe: { grip: '#2a2a2a', wood: '#6b4423', woodDark: '#4a3520', metal: '#b0b0b0', edge: '#888888' },
    iron_axe: { grip: '#2a2a2a', wood: '#5c4033', woodDark: '#3d2817', metal: '#c8d0dc', edge: '#8899aa' },
    steel_axe: { grip: '#1a1a1a', wood: '#4a3520', woodDark: '#2a1810', metal: '#e0e8f0', edge: '#99aabb' },
    master_axe: { grip: '#1a1a1a', wood: '#3d2817', woodDark: '#2a1810', metal: '#ffd700', edge: '#ffb300' }
};

function attachToFlipper(flipper, buildPartMerged, voxels, pivot, offset, name = HELD_ITEM_NAME) {
    const localVoxels = voxels.map((v) => ({
        ...v,
        x: v.x + offset.x - pivot.x,
        y: v.y + offset.y - pivot.y,
        z: v.z + offset.z - pivot.z
    }));
    const mesh = buildPartMerged(localVoxels, PALETTE);
    mesh.name = name;
    flipper.add(mesh);
    return mesh;
}

/**
 * Lumberjack axe — long handle forward (+Z), wide metal blade to the side (+X).
 * Sized similarly to the BONK baseball bat so it reads clearly in-hand.
 */
function buildAxeVoxels(itemId = 'basic_axe') {
    const c = AXE_PALETTES[itemId] || AXE_PALETTES.basic_axe;
    const voxels = [];
    const add = (x, y, z, color) => voxels.push({ x, y, z, c: color });

    // Grip (near hand)
    for (let z = 0; z < 3; z++) add(0, 0, z, c.grip);

    // Handle shaft
    for (let z = 3; z < 11; z++) add(0, 0, z, z % 2 === 0 ? c.wood : c.woodDark);

    // Head socket wrapping handle
    for (let z = 9; z <= 11; z++) {
        add(0, 1, z, c.metal);
        add(0, -1, z, c.metal);
    }

    // Blade — wedge extending to +X (cutting edge at x=5)
    for (let z = 9; z <= 11; z++) {
        for (let x = 1; x <= 5; x++) {
            const bladeColor = x >= 4 ? c.edge : c.metal;
            add(x, 0, z, bladeColor);
            if (x <= 4) add(x, 1, z, c.metal);
            if (x <= 3) add(x, -1, z, c.metal);
        }
    }
    // Blade tip (sharp edge)
    add(5, 0, 10, c.edge);
    add(5, 1, 10, c.edge);

    // Poll / back of head (-X)
    add(-1, 0, 10, c.edge);
    add(-2, 0, 10, c.metal);
    add(-1, 1, 10, c.metal);
    add(-1, -1, 10, c.metal);

    if (itemId === 'master_axe') {
        add(5, 0, 9, '#fff176');
        add(4, 1, 11, '#fff8dc');
    }

    return voxels;
}

function buildFishVoxels(tier = 1) {
    const colors = FISH_TIER_PALETTES[Math.min(10, Math.max(1, tier))] || FISH_TIER_PALETTES[1];
    const voxels = [];
    for (let x = -2; x <= 2; x++) {
        for (let y = -1; y <= 1; y++) {
            if (Math.abs(x) + Math.abs(y) < 4) voxels.push({ x, y, z: 0, c: colors.body });
        }
    }
    voxels.push({ x: -3, y: 0, z: 0, c: colors.accent }, { x: 3, y: 0, z: 0, c: colors.fin });
    voxels.push({ x: 0, y: 1, z: 0, c: colors.fin });
    return voxels;
}

function buildLogVoxels(tier = 1) {
    const tones = ['#8b5a2b', '#a0642a', '#6b4226', '#4a3520'];
    const bark = tones[Math.min(tones.length - 1, (tier || 1) - 1)];
    const ring = '#c49a6c';
    const voxels = [];
    for (let y = -1; y <= 2; y++) {
        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                if (Math.abs(x) + Math.abs(z) <= 2) {
                    voxels.push({ x, y, z, c: y === 2 || y === -1 ? ring : bark });
                }
            }
        }
    }
    return voxels;
}

function buildWormVoxels() {
    const voxels = [];
    for (let i = 0; i < 6; i++) {
        voxels.push({ x: i % 2, y: Math.floor(i / 2) - 1, z: 0, c: i % 2 ? '#c0392b' : '#e74c3c' });
    }
    return voxels;
}

function buildCoinStackVoxels() {
    const gold = '#ffd700';
    const goldDark = '#daa520';
    const voxels = [];
    for (let layer = 0; layer < 3; layer++) {
        for (let x = -1; x <= 1; x++) {
            voxels.push({ x, y: layer, z: 0, c: layer === 1 ? gold : goldDark });
        }
    }
    return voxels;
}

function buildGenericVoxels(category = 'unknown') {
    const color = category === 'bait' ? '#c0392b' : '#78909c';
    const voxels = [];
    for (let x = -1; x <= 1; x++) {
        for (let y = 0; y <= 2; y++) {
            for (let z = -1; z <= 1; z++) {
                if (Math.abs(x) + Math.abs(z) <= 2) voxels.push({ x, y, z, c: color });
            }
        }
    }
    return voxels;
}

export function getHeldItemVoxels(entry) {
    if (!entry?.itemId) return null;
    const { itemId, category, tier } = entry;

    if (AXE_ITEM_IDS.includes(itemId) || (category === 'tool' && itemId.endsWith('_axe'))) {
        return buildAxeVoxels(itemId);
    }
    if (category === 'fish' || itemId.includes('fish') || itemId.includes('jelly')) {
        return buildFishVoxels(tier || 1);
    }
    if (category === 'wood' || itemId.endsWith('_log')) return buildLogVoxels(tier || 1);
    if (itemId === 'worm' || category === 'bait') return buildWormVoxels();
    if (itemId.includes('coin') || itemId.includes('gold')) return buildCoinStackVoxels();

    return buildGenericVoxels(category);
}

function findHeldFlipper(penguinWrapper) {
    if (!penguinWrapper) return null;
    return penguinWrapper.getObjectByName('flipper_r')
        || penguinWrapper.getObjectByName('flipper_l');
}

export function removeHeldGameItem(penguinWrapper) {
    if (!penguinWrapper) return;
    penguinWrapper.traverse((obj) => {
        if (obj.name === HELD_ITEM_NAME) {
            disposeThreeObject(obj);
            obj.parent?.remove(obj);
        }
    });
}

export function updateHeldGameItem(penguinWrapper, buildPartMerged, entry) {
    if (!penguinWrapper || !buildPartMerged) return false;
    removeHeldGameItem(penguinWrapper);
    if (!entry?.itemId) return false;

    const voxels = getHeldItemVoxels(entry);
    if (!voxels?.length) return false;

    const flipperR = findHeldFlipper(penguinWrapper);
    if (!flipperR) return false;

    attachToFlipper(
        flipperR,
        buildPartMerged,
        voxels,
        RIGHT_FLIPPER_PIVOT,
        RIGHT_FLIPPER_OFFSET
    );
    return true;
}

export default { getHeldItemVoxels, updateHeldGameItem, removeHeldGameItem };
