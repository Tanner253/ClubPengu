/**

 * Harvestable forest trees — keep in sync with src/config/harvestableTrees.js

 */



export const FOREST_ZONE_OFFSET = { x: 0, z: 0 };

export const FOREST_ZONE_SIZE = 220;

export const HARVEST_INTERACTION_RADIUS = 5;



/** Keep in sync with ForestTrailsZone.PATH_SEGMENTS */

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



function forestPathBounds(seg) {

    return {

        minX: seg.x - seg.w / 2,

        maxX: seg.x + seg.w / 2,

        minZ: seg.z - seg.d / 2,

        maxZ: seg.z + seg.d / 2,

    };

}



/** @typedef {'sapling'|'baby'|'mature'|'elder'} TreeStage */



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



function isOnForestPath(x, z) {

    const margin = 1.5;

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



function pickStage(x, z) {

    const h = Math.abs(Math.sin(x * 0.31 + z * 0.17) * 1000) % 100;

    if (h < 32) return 'sapling';

    if (h < 58) return 'baby';

    if (h < 84) return 'mature';

    return 'elder';

}



/** @returns {Array<{ id: string, localX: number, localZ: number, stage: TreeStage }>} */

export function generateHarvestableTreePlacements() {

    const trees = [];

    let n = 0;

    for (let gx = 28; gx < 208; gx += 13) {

        for (let gz = 18; gz < 208; gz += 13) {

            const jitterX = Math.sin(gx * 0.5 + gz * 0.3) * 4;

            const jitterZ = Math.cos(gx * 0.3 + gz * 0.7) * 4;

            const localX = Math.round((gx + jitterX) * 10) / 10;

            const localZ = Math.round((gz + jitterZ) * 10) / 10;

            if (isOnForestPath(localX, localZ)) continue;

            if (isNearCampsite(localX, localZ)) continue;

            n += 1;

            trees.push({

                id: `ht_${String(n).padStart(3, '0')}`,

                localX,

                localZ,

                stage: pickStage(localX, localZ)

            });

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



export function isPlayerNearHarvestableTree(player, treeId, radius = HARVEST_INTERACTION_RADIUS) {

    const tree = getHarvestableTree(treeId);

    if (!tree || !player?.position || player.room !== 'forest_trails') return false;

    const world = getHarvestableTreeWorldPosition(tree);

    const dx = player.position.x - world.x;

    const dz = player.position.z - world.z;

    return Math.sqrt(dx * dx + dz * dz) <= radius;

}



export default HARVESTABLE_TREES;


