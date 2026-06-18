/**
 * Tree wood species — spawn weights, visuals, and guaranteed log type per tree.
 * Keep in sync with src/config/treeWoodSpecies.js
 */

export const WOOD_LOG_IDS = ['pine_log', 'birch_log', 'oak_log', 'ironwood_log'];

/** @typedef {'pine'|'round'} CrownShape */

/**
 * @type {Record<string, {
 *   id: string,
 *   label: string,
 *   logLabel: string,
 *   spawnWeight: number,
 *   barkColor: string,
 *   foliageColor: string,
 *   foliageAccent: string,
 *   ringColor: number,
 *   snowCovered: boolean,
 *   crownShape: CrownShape,
 * }>}
 */
export const TREE_WOOD_SPECIES = {
    pine_log: {
        id: 'pine_log',
        label: 'Pine',
        logLabel: 'pine',
        spawnWeight: 52,
        barkColor: '#5C4033',
        foliageColor: '#2A5A3A',
        foliageAccent: '#3A6A4A',
        ringColor: 0x22c55e,
        snowCovered: true,
        crownShape: 'pine',
    },
    birch_log: {
        id: 'birch_log',
        label: 'Birch',
        logLabel: 'birch',
        spawnWeight: 28,
        barkColor: '#E8E0D4',
        foliageColor: '#8FBF6A',
        foliageAccent: '#B8D890',
        ringColor: 0x86efac,
        snowCovered: true,
        crownShape: 'pine',
    },
    oak_log: {
        id: 'oak_log',
        label: 'Oak',
        logLabel: 'oak',
        spawnWeight: 14,
        barkColor: '#4A3520',
        foliageColor: '#3D6B2E',
        foliageAccent: '#5A8A3A',
        ringColor: 0x4ade80,
        snowCovered: false,
        crownShape: 'round',
    },
    ironwood_log: {
        id: 'ironwood_log',
        label: 'Ironwood',
        logLabel: 'ironwood',
        spawnWeight: 6,
        barkColor: '#2A1A14',
        foliageColor: '#4A2040',
        foliageAccent: '#6B3058',
        ringColor: 0xc084fc,
        snowCovered: false,
        crownShape: 'pine',
    },
};

export function getTreeWoodSpecies(woodType) {
    return TREE_WOOD_SPECIES[woodType] || TREE_WOOD_SPECIES.pine_log;
}

/** Deterministic species roll from world position (server + client must match). */
export function pickWoodTypeForPosition(localX, localZ) {
    const h = Math.abs(Math.sin(localX * 0.47 + localZ * 0.29) * 1000) % 100;
    let cumulative = 0;
    for (const id of WOOD_LOG_IDS) {
        cumulative += TREE_WOOD_SPECIES[id].spawnWeight;
        if (h < cumulative) return id;
    }
    return 'pine_log';
}

export default TREE_WOOD_SPECIES;
