/**
 * Fallen logs in Forest Trails — flip for worms (client).
 * Keep in sync with server/config/forageableLogs.js
 */

export const WORM_FORAGE_RADIUS = 4;
export const WORM_FORAGE_COOLDOWN_MS = 25 * 1000;
export const WORM_FORAGE_CHANNEL_MS = 2500;

export const FORAGEABLE_LOGS = [
    { id: 'forage_log_1', localX: 52, localZ: 68, mossy: true },
    { id: 'forage_log_2', localX: 118, localZ: 108, mossy: true },
    { id: 'forage_log_3', localX: 175, localZ: 88 },
    { id: 'forage_log_4', localX: 98, localZ: 185, mossy: true },
    { id: 'forage_log_5', localX: 48, localZ: 145 },
];

export default FORAGEABLE_LOGS;
