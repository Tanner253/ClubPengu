/**
 * Proximity ambient emitters — room-local coords (overworld 0–220, interiors vary).
 * @typedef {Object} ProximityEmitter
 * @property {string} id
 * @property {string} room
 * @property {'campfire'|'fountain'|'ice_fishing'|'casino_floor'|'dojo_murmur'|'pizza_kitchen'} type
 * @property {number} [x]
 * @property {number} [z]
 * @property {number} [maxRadius]
 * @property {number} [fullRadius]
 * @property {{ minX: number, maxX: number, minZ: number, maxZ: number }} [zone]
 * @property {number} [edgeFalloff]
 */

import { CENTER_X } from '../config/roomConfig';

const C = CENTER_X;
const TOWN_FISHING_X = C - 70.4;
const TOWN_FISHING_Z = C + 78.5;

const ICE_FISHING_DEFAULTS = { maxRadius: 10, fullRadius: 2.5 };

/** Keep in sync with SnowFortsZone.FISHING_HOLES */
const SNOW_FORTS_FISHING_HOLES = [
    { id: 'sf_fishing_1', x: 24, z: 28 },
    { id: 'sf_fishing_2', x: 38, z: 98 },
    { id: 'sf_fishing_3', x: 198, z: 42 },
    { id: 'sf_fishing_4', x: 30, z: 208 },
    { id: 'sf_fishing_5', x: 202, z: 128 },
    { id: 'sf_fishing_6', x: 88, z: 168 },
    { id: 'sf_fishing_7', x: 200, z: 22 },
    { id: 'sf_fishing_8', x: 188, z: 212 },
    { id: 'sf_fishing_9', x: 22, z: 148 },
    { id: 'sf_fishing_10', x: 168, z: 92 },
];

/** @type {ProximityEmitter[]} */
const ICE_FISHING_EMITTERS = [
    { id: 'town_fishing_1', room: 'town', type: 'ice_fishing', x: TOWN_FISHING_X, z: TOWN_FISHING_Z, ...ICE_FISHING_DEFAULTS },
    ...SNOW_FORTS_FISHING_HOLES.map((h) => ({
        id: h.id,
        room: 'snow_forts',
        type: 'ice_fishing',
        x: h.x,
        z: h.z,
        ...ICE_FISHING_DEFAULTS,
    })),
];

/** @type {ProximityEmitter[]} */
export const PROXIMITY_EMITTERS = [
    // --- Point emitters (overworld) ---
    { id: 'town_campfire', room: 'town', type: 'campfire', x: C, z: C + 10 },
    { id: 'town_fountain', room: 'town', type: 'fountain', x: C + 36, z: C + 81, maxRadius: 14, fullRadius: 3 },
    { id: 'forest_campfire_main', room: 'forest_trails', type: 'campfire', x: 90, z: 70 },
    { id: 'forest_campfire_west', room: 'forest_trails', type: 'campfire', x: 30, z: 100 },
    { id: 'forest_campfire_south', room: 'forest_trails', type: 'campfire', x: 165, z: 160 },
    { id: 'snow_campfire', room: 'snow_forts', type: 'campfire', x: 140, z: 100 },
    ...ICE_FISHING_EMITTERS,

    // --- Room zone ambients (interiors) ---
    {
        id: 'casino_floor',
        room: 'casino_game_room',
        type: 'casino_floor',
        zone: { minX: 3, maxX: 77, minZ: 3, maxZ: 87 },
        edgeFalloff: 8,
    },
    {
        id: 'dojo_murmur',
        room: 'dojo',
        type: 'dojo_murmur',
        zone: { minX: -16, maxX: 16, minZ: -16, maxZ: 16 },
        edgeFalloff: 5,
    },
    {
        id: 'pizza_kitchen',
        room: 'pizza',
        type: 'pizza_kitchen',
        zone: { minX: -15, maxX: 15, minZ: -15, maxZ: 15 },
        edgeFalloff: 5,
    },
];

export const DEFAULT_CAMPFIRE_MAX_RADIUS = 26;
export const DEFAULT_CAMPFIRE_FULL_RADIUS = 7;

/**
 * @param {number} px
 * @param {number} pz
 * @param {ProximityEmitter} emitter
 */
export function emitterProximityGain(px, pz, emitter) {
    if (emitter.zone) {
        const { minX, maxX, minZ, maxZ } = emitter.zone;
        if (px < minX || px > maxX || pz < minZ || pz > maxZ) return 0;
        const falloff = emitter.edgeFalloff ?? 5;
        const edgeDist = Math.min(px - minX, maxX - px, pz - minZ, maxZ - pz);
        if (edgeDist >= falloff) return 1;
        const t = edgeDist / falloff;
        return t * t * (3 - 2 * t);
    }

    const dx = px - (emitter.x ?? 0);
    const dz = pz - (emitter.z ?? 0);
    const distSq = dx * dx + dz * dz;
    const outer = emitter.maxRadius ?? DEFAULT_CAMPFIRE_MAX_RADIUS;
    const inner = emitter.fullRadius ?? DEFAULT_CAMPFIRE_FULL_RADIUS;
    return pointProximityGain(distSq, inner, outer);
}

/** @param {number} distSq @param {number} inner @param {number} outer */
function pointProximityGain(distSq, inner, outer) {
    const outerSq = outer * outer;
    if (distSq >= outerSq) return 0;
    const innerSq = inner * inner;
    if (distSq <= innerSq) return 1;
    const dist = Math.sqrt(distSq);
    const t = (outer - dist) / (outer - inner);
    return t * t * (3 - 2 * t);
}
