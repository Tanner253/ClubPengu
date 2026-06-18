/**
 * Client harvestable mushroom layout — keep in sync with server/config/harvestableMushrooms.js
 */

export const MUSHROOM_INTERACTION_RADIUS = 2.2;
export const MUSHROOM_HARVEST_MS = 4000;

export const HARVESTABLE_MUSHROOMS = [
    { id: 'mushroom_1', localX: 38, localZ: 82 },
    { id: 'mushroom_2', localX: 102, localZ: 62 },
    { id: 'mushroom_3', localX: 148, localZ: 118 },
    { id: 'mushroom_4', localX: 72, localZ: 168 },
    { id: 'mushroom_5', localX: 185, localZ: 145 },
    { id: 'mushroom_6', localX: 55, localZ: 132 },
];

export function getHarvestableMushroomWorldPosition(def, offsetX = 0, offsetZ = 0) {
    return { x: offsetX + def.localX, z: offsetZ + def.localZ };
}

export default HARVESTABLE_MUSHROOMS;
