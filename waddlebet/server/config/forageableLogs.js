/**
 * Fallen logs in Forest Trails — flip for worms (bait).
 * Keep in sync with src/config/forageableLogs.js
 */

export const WORM_FORAGE_RADIUS = 4;
export const WORM_FORAGE_COOLDOWN_MS = 25 * 1000;
export const WORM_FORAGE_MIN_WORMS = 1;
export const WORM_FORAGE_MAX_WORMS = 2;
/** Chance to find worms under a log (otherwise empty). */
export const WORM_FORAGE_SUCCESS_CHANCE = 0.72;

/** @typedef {{ id: string, localX: number, localZ: number, mossy?: boolean }} ForageableLogDef */

/** Decorative / mossy logs only — sittable trail logs are for resting. */
export const FORAGEABLE_LOGS = [
    { id: 'forage_log_1', localX: 52, localZ: 68, mossy: true },
    { id: 'forage_log_2', localX: 118, localZ: 108, mossy: true },
    { id: 'forage_log_3', localX: 175, localZ: 88 },
    { id: 'forage_log_4', localX: 98, localZ: 185, mossy: true },
    { id: 'forage_log_5', localX: 48, localZ: 145 },
];

export function getForageableLog(id) {
    return FORAGEABLE_LOGS.find((l) => l.id === id) || null;
}

export function isPlayerNearForageableLog(playerPos, logDef, radius = WORM_FORAGE_RADIUS) {
    if (!playerPos || !logDef) return false;
    const dx = playerPos.x - logDef.localX;
    const dz = playerPos.z - logDef.localZ;
    return Math.sqrt(dx * dx + dz * dz) <= radius;
}

export default FORAGEABLE_LOGS;
