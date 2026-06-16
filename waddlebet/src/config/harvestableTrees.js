/**
 * Harvestable forest trees (client) — sync with server/config/harvestableTrees.js
 */

export const FOREST_ZONE_OFFSET = { x: 0, z: 0 };
export const FOREST_ZONE_SIZE = 220;
export const HARVEST_INTERACTION_RADIUS = 5;
/** Show regrow countdown when walking near a harvested stump. */
export const STUMP_PROXIMITY_RADIUS = 5;
export const MANUAL_WOOD_MULTIPLIER = 1.5;
export const TREE_GRID_STEP = 16;
export const FOREST_TREE_INSET = 22;
export const MIN_TREE_SPACING = 5.2;

const FOREST_PATH_SEGMENTS = [
    { x: 70, z: 26, w: 14, d: 52 },
    { x: 81, z: 59.25, w: 18, d: 14.5 },
    { x: 90, z: 73.5, w: 14, d: 13 },
    { x: 90, z: 92, w: 14, d: 24 },
    { x: 68, z: 100, w: 30, d: 14 },
    { x: 108.5, z: 100, w: 23, d: 14 },
    { x: 135, z: 107, w: 30, d: 14 },
    { x: 145, z: 167, w: 14, d: 106 },
];

const FOREST_PROP_EXCLUSIONS = [
    { x: 90, z: 70, r: 16 },
    { x: 30, z: 100, r: 15 },
    { x: 165, z: 160, r: 15 },
    { x: 125, z: 52, r: 14 },
    { x: 120, z: 62, r: 6 },
    { x: 60, z: 15, r: 4 }, { x: 78, z: 45, r: 4 }, { x: 66, z: 72, r: 4 },
    { x: 102, z: 72, r: 4 }, { x: 58, z: 100, r: 4 }, { x: 118, z: 100, r: 4 },
    { x: 135, z: 125, r: 4 }, { x: 155, z: 145, r: 4 }, { x: 135, z: 170, r: 4 },
    { x: 155, z: 195, r: 4 },
    { x: 55, z: 25, r: 4 }, { x: 88, z: 42, r: 4 }, { x: 48, z: 98, r: 4 },
    { x: 118, z: 98, r: 4 }, { x: 48, z: 102, r: 4 }, { x: 118, z: 102, r: 4 },
    { x: 165, z: 130, r: 4 }, { x: 125, z: 150, r: 4 }, { x: 165, z: 180, r: 4 },
    { x: 125, z: 200, r: 4 },
];

function forestPathBounds(seg) {
    return {
        minX: seg.x - seg.w / 2,
        maxX: seg.x + seg.w / 2,
        minZ: seg.z - seg.d / 2,
        maxZ: seg.z + seg.d / 2,
    };
}

export const TREE_STAGES = {
    sapling: {
        wood: 1,
        respawnMs: 30 * 60 * 1000,
        label: 'Sapling',
        chopDurationMs: 12000,
        logItemId: 'pine_log',
        durabilityLoss: 1
    },
    baby: {
        wood: 6,
        respawnMs: 60 * 60 * 1000,
        label: 'Baby Tree',
        chopDurationMs: 22000,
        logItemId: 'birch_log',
        durabilityLoss: 3
    },
    mature: {
        wood: 12,
        respawnMs: 2 * 60 * 60 * 1000,
        label: 'Tree',
        chopDurationMs: 35000,
        logItemId: 'oak_log',
        durabilityLoss: 6
    },
    elder: {
        wood: 25,
        respawnMs: 6 * 60 * 60 * 1000,
        label: 'Elder Tree',
        chopDurationMs: 55000,
        logItemId: 'ironwood_log',
        durabilityLoss: 12
    }
};

export const STAGE_ORDER = ['sapling', 'baby', 'mature', 'elder'];

function isOnForestPath(x, z) {
    const margin = 2.0;
    return FOREST_PATH_SEGMENTS.some((seg) => {
        const b = forestPathBounds(seg);
        return x >= b.minX - margin
            && x <= b.maxX + margin
            && z >= b.minZ - margin
            && z <= b.maxZ + margin;
    });
}

function isNearCampsite(x, z) {
    const camps = [
        { x: 90, z: 70 },
        { x: 30, z: 100 },
        { x: 165, z: 160 }
    ];
    return camps.some(c => {
        const dx = x - c.x;
        const dz = z - c.z;
        return dx * dx + dz * dz < 400;
    });
}

function isNearProp(x, z) {
    return FOREST_PROP_EXCLUSIONS.some(({ x: px, z: pz, r }) => {
        const dx = x - px;
        const dz = z - pz;
        return dx * dx + dz * dz < r * r;
    });
}

function isInForestSafeZone(x, z) {
    return x >= FOREST_TREE_INSET
        && x <= FOREST_ZONE_SIZE - FOREST_TREE_INSET
        && z >= FOREST_TREE_INSET
        && z <= FOREST_ZONE_SIZE - FOREST_TREE_INSET;
}

function pickStage(x, z) {
    const h = Math.abs(Math.sin(x * 0.31 + z * 0.17) * 1000) % 100;
    if (h < 28) return 'sapling';
    if (h < 52) return 'baby';
    if (h < 78) return 'mature';
    return 'elder';
}

function pickChopMode(x, z) {
    const h = Math.abs(Math.sin(x * 0.73 + z * 0.41) * 1000) % 100;
    return h < 50 ? 'manual' : 'hold';
}

function canPlaceTree(trees, localX, localZ) {
    if (!isInForestSafeZone(localX, localZ)) return false;
    if (isOnForestPath(localX, localZ)) return false;
    if (isNearCampsite(localX, localZ)) return false;
    if (isNearProp(localX, localZ)) return false;
    for (const t of trees) {
        const dx = t.localX - localX;
        const dz = t.localZ - localZ;
        if (dx * dx + dz * dz < MIN_TREE_SPACING * MIN_TREE_SPACING) return false;
    }
    return true;
}

export function generateHarvestableTreePlacements() {
    const trees = [];
    let n = 0;
    const max = FOREST_ZONE_SIZE - FOREST_TREE_INSET;

    const gridPasses = [
        { start: FOREST_TREE_INSET, step: TREE_GRID_STEP, jx: 0.5, jz: 0.3 },
        { start: FOREST_TREE_INSET + TREE_GRID_STEP / 2, step: TREE_GRID_STEP, jx: 1.1, jz: 0.9 },
    ];

    for (const pass of gridPasses) {
        for (let gx = pass.start; gx < max; gx += pass.step) {
            for (let gz = pass.start; gz < max; gz += pass.step) {
                const jitterX = Math.sin(gx * pass.jx + gz * pass.jz) * 3.2;
                const jitterZ = Math.cos(gx * pass.jz + gz * pass.jx) * 3.2;
                const localX = Math.round((gx + jitterX) * 10) / 10;
                const localZ = Math.round((gz + jitterZ) * 10) / 10;
                if (!canPlaceTree(trees, localX, localZ)) continue;
                n += 1;
                trees.push({
                    id: `ht_${String(n).padStart(3, '0')}`,
                    localX,
                    localZ,
                    stage: pickStage(localX, localZ),
                    chopMode: pickChopMode(localX, localZ)
                });
            }
        }
    }

    return trees;
}

export const HARVESTABLE_TREES = generateHarvestableTreePlacements();

export function getHarvestableTree(treeId) {
    return HARVESTABLE_TREES.find(t => t.id === treeId) || null;
}

export function getHarvestableTreeWorldPosition(tree) {
    return {
        x: FOREST_ZONE_OFFSET.x + tree.localX,
        z: FOREST_ZONE_OFFSET.z + tree.localZ
    };
}

export function getStageConfig(stage) {
    return TREE_STAGES[stage] || null;
}

export function getWoodYield(stage, treeDef = null) {
    const base = getStageConfig(stage)?.wood || 1;
    if (treeDef?.chopMode === 'manual') {
        return Math.max(1, Math.round(base * MANUAL_WOOD_MULTIPLIER));
    }
    return base;
}

/** Human-readable countdown for stump hover tooltips. */
export function formatForestRegrowCountdown(regrowAt, now = Date.now()) {
    if (!regrowAt) return 'Regrowing soon…';
    const ms = regrowAt - now;
    if (ms <= 0) return 'Sapling sprouting now…';
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m until sapling grows`;
    if (m > 0) return `${m}m ${s}s until sapling grows`;
    return `${s}s until sapling grows`;
}

export default HARVESTABLE_TREES;
