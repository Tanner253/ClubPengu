/**
 * Forest Trails chop spots — keep in sync with src/config/chopSpots.js
 */

export const FOREST_ZONE_OFFSET = { x: 0, z: 0 };

/** @typedef {{ id: string, localX: number, localZ: number, tier: number }} ChopSpotDef */

/** @type {ChopSpotDef[]} */
export const CHOP_SPOTS = [
    { id: 'forest_01', localX: 48, localZ: 135, tier: 1 },
    { id: 'forest_02', localX: 175, localZ: 75, tier: 2 },
    { id: 'forest_03', localX: 105, localZ: 185, tier: 2 },
    { id: 'forest_04', localX: 55, localZ: 55, tier: 1 },
    { id: 'forest_05', localX: 190, localZ: 195, tier: 3 },
    { id: 'forest_06', localX: 130, localZ: 45, tier: 2 },
];

export function getChopSpot(spotId) {
    return CHOP_SPOTS.find(s => s.id === spotId) || null;
}

export function getChopSpotWorldPosition(spot) {
    return {
        x: FOREST_ZONE_OFFSET.x + spot.localX,
        z: FOREST_ZONE_OFFSET.z + spot.localZ
    };
}

/**
 * @param {{ room?: string, position?: { x: number, z: number } } | null | undefined} player
 * @param {string} spotId
 * @param {number} [radius=4]
 */
export function isPlayerNearChopSpot(player, spotId, radius = 4) {
    const spot = getChopSpot(spotId);
    if (!spot || !player?.position || player.room !== 'forest_trails') return false;
    const world = getChopSpotWorldPosition(spot);
    const dx = player.position.x - world.x;
    const dz = player.position.z - world.z;
    return Math.sqrt(dx * dx + dz * dz) <= radius;
}

export function isPlayerInForestZone(player) {
    if (!player?.position || player.room !== 'forest_trails') return false;
    const { x, z } = player.position;
    return x >= FOREST_ZONE_OFFSET.x && x < FOREST_ZONE_OFFSET.x + 220 &&
        z >= FOREST_ZONE_OFFSET.z && z < FOREST_ZONE_OFFSET.z + 220;
}

export default CHOP_SPOTS;
