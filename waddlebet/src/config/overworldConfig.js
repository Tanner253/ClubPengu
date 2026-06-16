/**
 * Overworld quadrant rooms — each zone is 220×220 local coords (center 110).
 * Edge portals trigger room transitions with loading screen (same as interior portals).
 */

import { CENTER_X, CENTER_Z } from './roomConfig';

export const OVERWORLD_ZONE_SIZE = 220;
export const OVERWORLD_CENTER = OVERWORLD_ZONE_SIZE / 2; // 110

/** Safe spawn at the center of any 220×220 overworld quadrant. */
export const OVERWORLD_CENTER_SPAWN = { x: OVERWORLD_CENTER, y: 0, z: OVERWORLD_CENTER };

export function getOverworldCenterSpawn(absolute = false) {
    const spawn = { ...OVERWORLD_CENTER_SPAWN };
    if (absolute) spawn.absolute = true;
    return spawn;
}

export const OVERWORLD_ROOMS = ['town', 'snow_forts', 'forest_trails'];

export function isOverworldRoom(roomId) {
    return OVERWORLD_ROOMS.includes(roomId);
}

/** Forest ferry dock NPC position in Snow Forts (not a player spawn). */
export const SNOW_FORTS_FOREST_DOCK = {
    x: CENTER_X - 42.3,
    y: 0,
    z: CENTER_Z + 95.3,
};

/** @deprecated use OVERWORLD_CENTER_SPAWN */
export const SNOW_FORTS_ARRIVAL = { ...OVERWORLD_CENTER_SPAWN };

/** @deprecated use OVERWORLD_CENTER_SPAWN */
export const FOREST_TRAILS_SPAWN = { ...OVERWORLD_CENTER_SPAWN };

/** Default spawn when entering a quadrant (local coords). */
export const OVERWORLD_SPAWNS = {
    town: { x: CENTER_X, y: 0, z: CENTER_Z },
    snow_forts: { ...OVERWORLD_CENTER_SPAWN },
    forest_trails: { ...OVERWORLD_CENTER_SPAWN },
};

/** Ferry / edge portal arrival — always map center (absolute local coords). */
export const OVERWORLD_ARRIVAL_SPAWNS = {
    snow_forts_from_town: getOverworldCenterSpawn(true),
    snow_forts_from_forest: getOverworldCenterSpawn(true),
    town_from_snow_forts: getOverworldCenterSpawn(true),
    forest_from_snow_forts: getOverworldCenterSpawn(true),
};

/**
 * Edge transitions between overworld quadrants.
 * Positions are absolute local coords within the source room.
 */
export const OVERWORLD_EDGE_PORTALS = {
    town: [
        {
            id: 'town-to-snow-forts',
            name: 'SNOW FORTS',
            emoji: '⛄',
            description: 'Enter Snow Forts',
            targetRoom: 'snow_forts',
            // East path connection (T-bar at z=65)
            minX: 205,
            maxX: 220,
            minZ: 49,
            maxZ: 81,
            exitSpawnPos: OVERWORLD_ARRIVAL_SPAWNS.snow_forts_from_town,
        },
    ],
    snow_forts: [
        {
            id: 'snow-forts-to-town',
            name: 'TOWN',
            emoji: '🏘️',
            description: 'Return to Town',
            targetRoom: 'town',
            minX: 0,
            maxX: 14,
            minZ: 49,
            maxZ: 81,
            exitSpawnPos: OVERWORLD_ARRIVAL_SPAWNS.town_from_snow_forts,
        },
        {
            id: 'snow-forts-to-forest',
            name: 'FOREST TRAILS',
            emoji: '🌲',
            description: 'Enter Forest Trails',
            targetRoom: 'forest_trails',
            minX: 54,
            maxX: 86,
            minZ: 205,
            maxZ: 220,
            exitSpawnPos: OVERWORLD_ARRIVAL_SPAWNS.forest_from_snow_forts,
        },
    ],
    forest_trails: [
        {
            id: 'forest-to-snow-forts',
            name: 'SNOW FORTS',
            emoji: '⛄',
            description: 'Return to Snow Forts',
            targetRoom: 'snow_forts',
            minX: 54,
            maxX: 86,
            minZ: 0,
            maxZ: 14,
            exitSpawnPos: OVERWORLD_ARRIVAL_SPAWNS.snow_forts_from_forest,
        },
    ],
};

/** Mountain wrapper config per overworld room (220×220 local bounds). */
export function getOverworldMountainConfig(roomId) {
    const S = OVERWORLD_ZONE_SIZE;
    const base = {
        mapSize: S,
        worldBounds: { minX: 0, maxX: S, minZ: 0, maxZ: S },
        internalWalls: [],
        pathGaps: [],
        offset: 10,
        mountainRows: 2,
        rowSpacing: 48,
        mountainsPerRow: [12, 18],
        baseHeight: 0,
        minPeakHeight: 50,
        maxPeakHeight: 95,
        baseWidth: 45,
        snowLineRatio: 0.5,
    };

    if (roomId === 'town') {
        return {
            ...base,
            offset: 18,
            pathGaps: [
                // East ferry terminal — keep mountains off Captain Skipper's dock (z ~47)
                { minX: 188, maxX: S, minZ: 36, maxZ: 58 },
            ],
            internalWalls: [
                // East edge gap toward Snow Forts (path z=65 + ferry dock z~47)
                { edge: 'vertical', x: S, minZ: 36, maxZ: 85, gapMinZ: 36, gapMaxZ: 85, playableSide: 'west' },
            ],
        };
    }
    if (roomId === 'snow_forts') {
        return {
            ...base,
            offset: 26,
            rowSpacing: 58,
            mountainsPerRow: [8, 14],
            baseWidth: 38,
            internalWalls: [
                // West gap toward Town
                { edge: 'vertical', x: 0, minZ: 49, maxZ: 81, gapMinZ: 49, gapMaxZ: 81, playableSide: 'east' },
                // South gap toward Forest (path at x=70, z=205-220)
                { edge: 'horizontal', z: S, minX: 54, maxX: 86, gapMinX: 54, gapMaxX: 86, playableSide: 'north' },
            ],
        };
    }
    if (roomId === 'forest_trails') {
        return {
            ...base,
            internalWalls: [
                // North gap toward Snow Forts
                { edge: 'horizontal', z: 0, minX: 54, maxX: 86, gapMinX: 54, gapMaxX: 86, playableSide: 'south' },
            ],
        };
    }
    return base;
}

/** Casino setpiece — east of the x=70 corridor, entrance faces west toward path. */
export const CASINO_SETPIECE = {
    x: 115,
    z: 110,
    width: 36,
    depth: 32,
    height: 14,
    rotation: (3 * Math.PI) / 2,
    portalX: 99,
    portalZ: 110,
};
