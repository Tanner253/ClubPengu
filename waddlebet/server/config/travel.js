/**
 * Overworld travel (ferry) — server authority.
 * Every passenger requires a paid ticket; one payer may buy tickets for others at the dock.
 */

export const TRAVEL_TIMING = {
    /** Seconds to wait at dock after the first ticket before departure */
    BOARDING_SECONDS: 25,
    /** Seconds in transit lobby before arrival */
    TRANSIT_SECONDS: 15,
    MAX_PASSENGERS: 12,
};

/** @typedef {{ x: number, y?: number, z: number, absolute?: boolean }} TravelSpawn */

/**
 * @typedef {Object} TravelRoute
 * @property {string} id
 * @property {string} fromRoom
 * @property {string} toRoom
 * @property {string} name
 * @property {string} emoji
 * @property {number} ticketCost
 * @property {number} [transitSeconds] - override TRAVEL_TIMING.TRANSIT_SECONDS
 * @property {TravelSpawn} arrivalSpawn
 */

/** Keep in sync with src/config/overworldConfig.js FOREST_TRAILS_SPAWN (/warp forest). */
const FOREST_TRAILS_SPAWN = { x: 90, z: 70 };

/** Keep in sync with server/index.js getDefaultSpawnForRoom('town') and overworldConfig town center. */
const TOWN_CENTER = { x: 110, z: 110 };

/** Keep in sync with src/config/overworldConfig.js SNOW_FORTS_FOREST_DOCK. */
const SNOW_FORTS_FOREST_DOCK = { x: 67.7, z: 205.3 };

/** @type {Record<string, TravelRoute>} */
export const TRAVEL_ROUTES = {
    town_snow_forts: {
        id: 'town_snow_forts',
        fromRoom: 'town',
        toRoom: 'snow_forts',
        name: 'Snow Forts',
        emoji: '⛄',
        ticketCost: 25,
        arrivalSpawn: { x: 49.9, z: 64.3, absolute: true },
    },
    snow_forts_town: {
        id: 'snow_forts_town',
        fromRoom: 'snow_forts',
        toRoom: 'town',
        name: 'Town',
        emoji: '🏘️',
        ticketCost: 25,
        arrivalSpawn: { x: 200, z: 65, absolute: true },
    },
    snow_forts_forest: {
        id: 'snow_forts_forest',
        fromRoom: 'snow_forts',
        toRoom: 'forest_trails',
        name: 'Forest Trails',
        emoji: '🌲',
        ticketCost: 35,
        transitSeconds: 45,
        arrivalSpawn: { x: FOREST_TRAILS_SPAWN.x, z: FOREST_TRAILS_SPAWN.z, absolute: true },
    },
    forest_snow_forts: {
        id: 'forest_snow_forts',
        fromRoom: 'forest_trails',
        toRoom: 'snow_forts',
        name: 'Snow Forts',
        emoji: '⛄',
        ticketCost: 35,
        transitSeconds: 45,
        arrivalSpawn: { x: SNOW_FORTS_FOREST_DOCK.x, z: SNOW_FORTS_FOREST_DOCK.z, absolute: true },
    },
    forest_town: {
        id: 'forest_town',
        fromRoom: 'forest_trails',
        toRoom: 'town',
        name: 'Town',
        emoji: '🏘️',
        ticketCost: 35,
        transitSeconds: 45,
        arrivalSpawn: { x: TOWN_CENTER.x, z: TOWN_CENTER.z, absolute: true },
    },
};

export function getTravelRoute(routeId) {
    return TRAVEL_ROUTES[routeId] || null;
}

export function getRouteTransitSeconds(route) {
    if (route?.transitSeconds != null) return route.transitSeconds;
    return TRAVEL_TIMING.TRANSIT_SECONDS;
}

export function getRoutesForRoom(roomId) {
    return Object.values(TRAVEL_ROUTES).filter(r => r.fromRoom === roomId);
}

export function getTravelLobbyRoomId(voyageId) {
    return `travel:${voyageId}`;
}

export function isTravelLobbyRoom(roomId) {
    return typeof roomId === 'string' && roomId.startsWith('travel:');
}

export default TRAVEL_ROUTES;
