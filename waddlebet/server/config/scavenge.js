/**
 * Scavenge spots — hidden gold for broke players (server-authoritative cooldowns).
 * Each spot id has its own per-user 1-hour cooldown (stored on User.scavengeSpotCooldowns).
 */

/** Per-user cooldown between scavenges at the same spot (1 hour). */
export const SCAVENGE_COOLDOWN_MS = 60 * 60 * 1000;

/** @deprecated use SCAVENGE_COOLDOWN_MS */
export const SCAVENGE_ACTUAL_COOLDOWN_MS = SCAVENGE_COOLDOWN_MS;

/** @deprecated use SCAVENGE_COOLDOWN_MS */
export const SCAVENGE_DISPLAY_COOLDOWN_MS = SCAVENGE_COOLDOWN_MS;

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
    goldReward: 10,
    winChance: 0.1,
    interactionRadius: 2.5,
}));

/** @type {Record<string, object>} */
export const SCAVENGE_SPOTS = {
    casino_trash: {
        id: 'casino_trash',
        room: 'snow_forts',
        goldReward: 20,
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

/** @param {{ x: number, z: number }} playerPos */
export function isPlayerNearScavengeSpot(playerPos, spot, extraRadius = 0) {
    if (!spot) return false;
    const radius = (spot.interactionRadius ?? 2.5) + extraRadius;
    if (spot.localX != null && spot.localZ != null) {
        const dx = (playerPos.x ?? 0) - spot.localX;
        const dz = (playerPos.z ?? 0) - spot.localZ;
        return Math.sqrt(dx * dx + dz * dz) <= radius;
    }
    if (spot.locations?.length) {
        return spot.locations.some((loc) => {
            const dx = (playerPos.x ?? 0) - loc.x;
            const dz = (playerPos.z ?? 0) - loc.z;
            return Math.sqrt(dx * dx + dz * dz) <= radius;
        });
    }
    return false;
}

/** Closest spot in room within interaction radius, if any. */
export function findActiveScavengeSpot(playerPos, roomId) {
    const roomSpots = getScavengeSpotsForRoom(roomId);
    let closest = null;
    let closestDist = Infinity;
    for (const spot of roomSpots) {
        if (spot.localX == null || spot.localZ == null) continue;
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
