/**
 * WagerBot — practice PvP NPC (single source of truth for spawn location).
 * Town center C = 110; bot at x: C + 16.2, z: C + -18.4
 */

export const TOWN_CENTER = 110;

export const WAGER_BOT_ID = 'dev_bot_wager';

export const WAGER_BOT_POSITION = {
    x: TOWN_CENTER + 16.2,
    y: 0,
    z: TOWN_CENTER - 18.4,
};

/** Face south (+Z) toward the T-stem street where players approach */
export const WAGER_BOT_ROTATION = -Math.PI / 2;
