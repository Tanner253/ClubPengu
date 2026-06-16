/**
 * Scavenge spots (client) — keep in sync with server/config/scavenge.js
 */

/** Per-user cooldown at each spot (1 hour). */
export const SCAVENGE_COOLDOWN_MS = 60 * 60 * 1000;

/** Keep in sync with TownCenter trash_can prop placements (C = 110). */
export const TOWN_TRASH_CANS = [
    { id: 'town_trash_01', localX: 92, localZ: 130 },
    { id: 'town_trash_02', localX: 128, localZ: 160 },
    { id: 'town_trash_03', localX: 78, localZ: 86 },
    { id: 'town_trash_04', localX: 142, localZ: 86 },
    { id: 'town_trash_05', localX: 78, localZ: 44 },
    { id: 'town_trash_06', localX: 142, localZ: 44 },
    { id: 'town_trash_07', localX: 60, localZ: 158 },
    { id: 'town_trash_08', localX: 160, localZ: 158 },
    { id: 'town_trash_09', localX: 128, localZ: 122 },
    { id: 'town_trash_10', localX: 128, localZ: 44 },
].map((can) => ({
    ...can,
    room: 'town',
    interactionRadius: 2.5,
}));

export const SCAVENGE_SPOTS = {
    casino_trash: {
        id: 'casino_trash',
        room: 'snow_forts',
        localX: 133,
        localZ: 108,
        interactionRadius: 2.5,
    },
    ...Object.fromEntries(TOWN_TRASH_CANS.map((can) => [can.id, can])),
};

export function getScavengeSpot(spotId) {
    return SCAVENGE_SPOTS[spotId] || null;
}

export function getScavengeSpotsForRoom(roomId) {
    return Object.values(SCAVENGE_SPOTS).filter((spot) => spot.room === roomId);
}

export function findActiveScavengeSpot(playerPos, roomId) {
    const roomSpots = getScavengeSpotsForRoom(roomId);
    let closest = null;
    let closestDist = Infinity;
    for (const spot of roomSpots) {
        const dx = (playerPos.x ?? 0) - spot.localX;
        const dz = (playerPos.z ?? 0) - spot.localZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const radius = spot.interactionRadius ?? 2.5;
        if (dist <= radius && dist < closestDist) {
            closestDist = dist;
            closest = spot;
        }
    }
    return closest;
}

export default SCAVENGE_SPOTS;
