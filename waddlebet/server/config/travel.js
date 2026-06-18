/**
 * Overworld travel (ferry) — server authority.
 * Every passenger requires a paid ticket; one payer may buy tickets for others at the dock.
 */

import { FERRY_GOLD_COST, FERRY_FOREST_DIRECT_COST } from './goldEconomy.js';

export const TRAVEL_TIMING = {
    /** Seconds to wait at dock after the first ticket before departure */
    BOARDING_SECONDS: 25,
    /** Seconds in transit lobby before arrival */
    TRANSIT_SECONDS: 15,
    MAX_PASSENGERS: 12,
};

/** 220×220 overworld quadrants — center spawn (keep in sync with src/config/overworldConfig.js). */
export const OVERWORLD_CENTER = 110;
export const OVERWORLD_CENTER_SPAWN = { x: OVERWORLD_CENTER, y: 0, z: OVERWORLD_CENTER };

const OVERWORLD_ROOMS = new Set(['town', 'snow_forts', 'forest_trails']);

/** @typedef {{ x: number, y?: number, z: number, absolute?: boolean }} TravelSpawn */

/**
 * Ferry passengers always arrive at the center of the destination overworld map.
 * @param {string} toRoom
 * @returns {TravelSpawn}
 */
export function getFerryArrivalSpawn(toRoom) {
    if (OVERWORLD_ROOMS.has(toRoom)) {
        return { ...OVERWORLD_CENTER_SPAWN, absolute: true };
    }
    return { ...OVERWORLD_CENTER_SPAWN };
}

/**
 * @typedef {Object} TravelRoute
 * @property {string} id
 * @property {string} fromRoom
 * @property {string} toRoom
 * @property {string} name
 * @property {string} emoji
 * @property {number} ticketCost
 * @property {number} [transitSeconds] - override TRAVEL_TIMING.TRANSIT_SECONDS
 */

/** @type {Record<string, TravelRoute>} */
export const TRAVEL_ROUTES = {
    town_snow_forts: {
        id: 'town_snow_forts',
        fromRoom: 'town',
        toRoom: 'snow_forts',
        name: 'Snow Forts',
        emoji: '⛄',
        ticketCost: FERRY_GOLD_COST,
    },
    town_forest: {
        id: 'town_forest',
        fromRoom: 'town',
        toRoom: 'forest_trails',
        name: 'Forest Trails',
        emoji: '🌲',
        ticketCost: FERRY_FOREST_DIRECT_COST,
        transitSeconds: 60,
    },
    snow_forts_town: {
        id: 'snow_forts_town',
        fromRoom: 'snow_forts',
        toRoom: 'town',
        name: 'Town',
        emoji: '🏘️',
        ticketCost: FERRY_GOLD_COST,
    },
    snow_forts_forest: {
        id: 'snow_forts_forest',
        fromRoom: 'snow_forts',
        toRoom: 'forest_trails',
        name: 'Forest Trails',
        emoji: '🌲',
        ticketCost: FERRY_GOLD_COST,
        transitSeconds: 45,
    },
    forest_snow_forts: {
        id: 'forest_snow_forts',
        fromRoom: 'forest_trails',
        toRoom: 'snow_forts',
        name: 'Snow Forts',
        emoji: '⛄',
        ticketCost: FERRY_GOLD_COST,
        transitSeconds: 45,
    },
    forest_town: {
        id: 'forest_town',
        fromRoom: 'forest_trails',
        toRoom: 'town',
        name: 'Town',
        emoji: '🏘️',
        ticketCost: FERRY_GOLD_COST,
        transitSeconds: 45,
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

