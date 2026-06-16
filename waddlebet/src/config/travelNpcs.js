/**
 * Overworld ferry NPCs — one dock per route departure point.
 * Positions are absolute local coords within each room (0–220).
 */

import { CENTER_X, CENTER_Z } from './roomConfig';
import { SNOW_FORTS_FOREST_DOCK } from './overworldConfig';
import { TRAVEL_ROUTES, getRoutesForRoom } from './travelConfig';

/** @typedef {import('./worldNpcs').WorldNpcDef} WorldNpcDef */

const SKIPPER_APPEARANCE = {
    skin: 'blue',
    hat: 'none',
    eyes: 'shades',
    mouth: 'beak',
    bodyItem: 'lifevest',
    mount: 'none',
    npcCosmetics: { captainHat: true, shipWheel: true }
};

const SKIPPER_GREETINGS = [
    "Ahoy! Where to, traveler?",
    "Every penguin pays their own fare — or bring gold for the whole crew.",
    "No walking the rim in this weather. Buy a ticket and board!"
];

/** @type {Array<WorldNpcDef & { room: string, routeId?: string, isHub?: boolean, x: number, z: number, type: string, displayName?: string }>} */
export const TRAVEL_NPCS = [
    {
        id: 'skipper_town_hub',
        type: 'travel_agent',
        room: 'town',
        isHub: true,
        x: CENTER_X + 89.1,
        z: CENTER_Z - 63.0,
        rotation: 0,
        standType: 'travel_dock',
        merchantId: 'travel_agent',
        displayName: 'Captain Skipper',
        appearance: SKIPPER_APPEARANCE,
        greetings: SKIPPER_GREETINGS,
        actions: [],
        interactionRadius: 7
    },
    {
        id: 'skipper_snow_west',
        type: 'travel_agent',
        room: 'snow_forts',
        routeId: 'snow_forts_town',
        x: 46,
        z: 64,
        rotation: Math.PI / 2,
        standType: 'travel_dock',
        merchantId: 'travel_agent',
        displayName: 'Captain Skipper',
        appearance: SKIPPER_APPEARANCE,
        greetings: SKIPPER_GREETINGS,
        actions: [],
        interactionRadius: 6.5
    },
    {
        id: 'skipper_snow_south',
        type: 'travel_agent',
        room: 'snow_forts',
        routeId: 'snow_forts_forest',
        x: CENTER_X - 42.3,
        z: CENTER_Z + 95.3,
        rotation: Math.PI,
        standType: 'travel_dock',
        merchantId: 'travel_agent',
        displayName: 'Captain Skipper',
        appearance: { ...SKIPPER_APPEARANCE, skin: 'grey' },
        greetings: [
            "Forest run? Every ticket counts — pay for yourself or your squad.",
            "Timber trails await — gold at the dock, then we sail.",
            "The forest line leaves on the clock. Got tickets?"
        ],
        actions: [],
        interactionRadius: 6.5
    },
    {
        id: 'skipper_forest_north',
        type: 'travel_agent',
        room: 'forest_trails',
        isHub: true,
        x: 70,
        z: 24,
        rotation: 0,
        standType: 'travel_dock',
        merchantId: 'travel_agent',
        displayName: 'Captain Skipper',
        appearance: { ...SKIPPER_APPEARANCE, skin: 'green' },
        greetings: SKIPPER_GREETINGS,
        actions: [],
        interactionRadius: 6.5
    }
];

export function getTravelNpc(npcId) {
    return TRAVEL_NPCS.find(n => n.id === npcId) || null;
}

export function getTravelNpcsForRoom(roomId) {
    return TRAVEL_NPCS.filter(n => n.room === roomId);
}

export function getNpcDisplayName(npcDef) {
    return npcDef?.displayName || 'Captain Skipper';
}

export function getNpcTitle(npcDef) {
    if (npcDef?.isHub) return 'Ice Ferry Terminal';
    const route = TRAVEL_ROUTES[npcDef?.routeId];
    if (route) return `${route.emoji} Ferry to ${route.name}`;
    return 'Ice Ferry Captain';
}

export function getRouteForNpc(npcDef) {
    if (npcDef?.routeId) return TRAVEL_ROUTES[npcDef.routeId] || null;
    return null;
}

/** Routes this NPC can sell — hub NPCs offer every route from their room. */
export function getRoutesForNpc(npcDef) {
    if (!npcDef) return [];
    if (npcDef.isHub) return getRoutesForRoom(npcDef.room);
    const route = getRouteForNpc(npcDef);
    return route ? [route] : [];
}

export default TRAVEL_NPCS;
