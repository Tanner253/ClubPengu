/**
 * Harvestable forest mushrooms — slow respawn for broke-player ferry ticket quest.
 */

export const MUSHROOM_RESPAWN_MS = 8 * 60 * 1000; // 8 minutes per cluster
/** Client channel time before harvest completes (server validates proximity only). */
export const MUSHROOM_HARVEST_MS = 4000;

/** @typedef {{ id: string, localX: number, localZ: number }} HarvestableMushroomDef */

/** @type {HarvestableMushroomDef[]} */
export const HARVESTABLE_MUSHROOMS = [
    { id: 'mushroom_1', localX: 38, localZ: 82 },
    { id: 'mushroom_2', localX: 102, localZ: 62 },
    { id: 'mushroom_3', localX: 148, localZ: 118 },
    { id: 'mushroom_4', localX: 72, localZ: 168 },
    { id: 'mushroom_5', localX: 185, localZ: 145 },
    { id: 'mushroom_6', localX: 55, localZ: 132 },
];

export const MUSHROOM_QUEST_REQUIRED = 5;
export const MUSHROOM_QUEST_REWARD_ITEM = 'ferry_ticket_forest_town';

export function getHarvestableMushroom(id) {
    return HARVESTABLE_MUSHROOMS.find(m => m.id === id) || null;
}

export default HARVESTABLE_MUSHROOMS;
