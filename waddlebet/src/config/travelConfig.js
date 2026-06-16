/**
 * Overworld travel config (client) — keep in sync with server/config/travel.js
 * Every passenger requires a paid ticket.
 */

export const TRAVEL_TIMING = {
    BOARDING_SECONDS: 25,
    TRANSIT_SECONDS: 15,
    MAX_PASSENGERS: 12,
};

export const TRAVEL_ROUTES = {
    town_snow_forts: {
        id: 'town_snow_forts',
        fromRoom: 'town',
        toRoom: 'snow_forts',
        name: 'Snow Forts',
        emoji: '⛄',
        ticketCost: 25,
    },
    snow_forts_town: {
        id: 'snow_forts_town',
        fromRoom: 'snow_forts',
        toRoom: 'town',
        name: 'Town',
        emoji: '🏘️',
        ticketCost: 25,
    },
    snow_forts_forest: {
        id: 'snow_forts_forest',
        fromRoom: 'snow_forts',
        toRoom: 'forest_trails',
        name: 'Forest Trails',
        emoji: '🌲',
        ticketCost: 35,
        transitSeconds: 45,
    },
    forest_snow_forts: {
        id: 'forest_snow_forts',
        fromRoom: 'forest_trails',
        toRoom: 'snow_forts',
        name: 'Snow Forts',
        emoji: '⛄',
        ticketCost: 35,
        transitSeconds: 45,
    },
    forest_town: {
        id: 'forest_town',
        fromRoom: 'forest_trails',
        toRoom: 'town',
        name: 'Town',
        emoji: '🏘️',
        ticketCost: 35,
        transitSeconds: 45,
    },
};

export function getRoutesForRoom(roomId) {
    return Object.values(TRAVEL_ROUTES).filter(r => r.fromRoom === roomId);
}

export function getRouteTransitSeconds(route) {
    if (route?.transitSeconds != null) return route.transitSeconds;
    return TRAVEL_TIMING.TRANSIT_SECONDS;
}

export function isTravelLobbyRoom(roomId) {
    return typeof roomId === 'string' && roomId.startsWith('travel:');
}

/** Ferry cabin interior bounds (keep in sync with TravelLobbyRoom 24×16 layout). */
export const TRAVEL_LOBBY_BOUNDS = { minX: 2.2, maxX: 21.8, minZ: 2.2, maxZ: 13.8 };

/** Default spawn inside the ferry cabin (matches TravelLobbyRoom.spawnPos). */
export const TRAVEL_LOBBY_SPAWN = { x: 12, y: 0, z: 10, absolute: true };

export function clampTravelLobbyPosition(x, z) {
    return {
        x: Math.max(TRAVEL_LOBBY_BOUNDS.minX, Math.min(TRAVEL_LOBBY_BOUNDS.maxX, x)),
        z: Math.max(TRAVEL_LOBBY_BOUNDS.minZ, Math.min(TRAVEL_LOBBY_BOUNDS.maxZ, z)),
    };
}

/** Third-person camera while inside the small ferry cabin (24×16 room). */
export const TRAVEL_LOBBY_CAMERA = {
    targetDistance: 4.5,
    minDistance: 2.5,
    maxDistance: 7,
    defaultTargetDistance: 20,
    defaultMinDistance: 5,
    defaultMaxDistance: 50,
};

/** Map route id → inventory item id (keep in sync with server/config/gameItems.js). */
export const FERRY_TICKET_BY_ROUTE = {
    town_snow_forts: 'ferry_ticket_town_snow',
    snow_forts_town: 'ferry_ticket_snow_town',
    snow_forts_forest: 'ferry_ticket_snow_forest',
    forest_snow_forts: 'ferry_ticket_forest_snow',
    forest_town: 'ferry_ticket_forest_town',
};

export function countFerryTicketsForRoute(gameInventory, routeId) {
    const ticketItemId = FERRY_TICKET_BY_ROUTE[routeId];
    if (!ticketItemId) return 0;
    return (gameInventory?.slots || [])
        .filter(s => s?.itemId === ticketItemId && s.quantity > 0)
        .reduce((sum, s) => sum + s.quantity, 0);
}

export default TRAVEL_ROUTES;
