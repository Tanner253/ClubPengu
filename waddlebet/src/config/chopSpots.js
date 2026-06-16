/**
 * Forest Trails chop spots (client) — keep in sync with server/config/chopSpots.js
 */

export const FOREST_ZONE_OFFSET = { x: 0, z: 0 };

export const CHOP_SPOTS = [
    { id: 'forest_01', localX: 48, localZ: 135, tier: 1 },
    { id: 'forest_02', localX: 175, localZ: 75, tier: 2 },
    { id: 'forest_03', localX: 105, localZ: 185, tier: 2 },
    { id: 'forest_04', localX: 55, localZ: 55, tier: 1 },
    { id: 'forest_05', localX: 190, localZ: 195, tier: 3 },
    { id: 'forest_06', localX: 130, localZ: 45, tier: 2 },
];

export function getChopSpotWorldPosition(spot) {
    return {
        x: FOREST_ZONE_OFFSET.x + spot.localX,
        z: FOREST_ZONE_OFFSET.z + spot.localZ
    };
}

export default CHOP_SPOTS;
