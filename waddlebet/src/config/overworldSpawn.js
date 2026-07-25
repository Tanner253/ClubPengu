/**
 * Overworld spawn safety — keep players out of perimeter walls, mountains, and prop colliders.
 * Shared by client (session resume, room load) and server (saved spawn, travel transfer).
 */

import {
    OVERWORLD_ZONE_SIZE,
    OVERWORLD_CENTER_SPAWN,
    isOverworldRoom,
} from './overworldConfig.js';

/** Player footprint used when validating spawns (slightly larger than movement radius). */
export const OVERWORLD_SPAWN_PLAYER_RADIUS = 1.0;

/**
 * Inset from map edges — SnowFortsZone boundary MARGIN (8) + wall half-depth (2) + radius + buffer.
 * Also clears procedural mountain encroachment near corners.
 */
export const OVERWORLD_PERIMETER_INSET = 14;

/** @typedef {{ minX: number, maxX: number, minZ: number, maxZ: number }} SpawnRect */

/** Axis-aligned boxes that must never be spawn points (local room coords). */
const SNOW_FORTS_INTERIOR_HAZARDS = [
    // Old Salty fishing shack (NpcStandBuilder fishing_shack collision)
    { minX: 14.5, maxX: 21.5, minZ: 14.5, maxZ: 21.5 },
    // North snow-fort construction walls (_createSnowForts colliders)
    { minX: 32, maxX: 48, minZ: 0, maxZ: 14 },
    { minX: 92, maxX: 108, minZ: 0, maxZ: 14 },
    { minX: 64, maxX: 76, minZ: 0, maxZ: 10 },
    // Forest ferry dock stand (skipper_snow_south) — south path edge, not a walkable spawn
    { minX: 60, maxX: 76, minZ: 198, maxZ: 212 },
    // West town ferry dock (skipper_snow_west)
    { minX: 38, maxX: 54, minZ: 56, maxZ: 72 },
];

/** Boundary wall AABBs — keep in sync with SnowFortsZone._createBoundaryWalls. */
const SNOW_FORTS_WALL_BOXES = [
    { minX: 0, maxX: 220, minZ: 6, maxZ: 10 },       // north
    { minX: 0, maxX: 60, minZ: 210, maxZ: 214 },     // south left
    { minX: 90, maxX: 220, minZ: 210, maxZ: 214 },   // south right
    { minX: 210, maxX: 214, minZ: 0, maxZ: 220 },    // east
];

function circleOverlapsRect(x, z, radius, rect) {
    const closestX = Math.max(rect.minX, Math.min(x, rect.maxX));
    const closestZ = Math.max(rect.minZ, Math.min(z, rect.maxZ));
    const dx = x - closestX;
    const dz = z - closestZ;
    return dx * dx + dz * dz < radius * radius;
}

function isInsidePerimeterInset(x, z, size = OVERWORLD_ZONE_SIZE, inset = OVERWORLD_PERIMETER_INSET) {
    return x < inset || z < inset || x > size - inset || z > size - inset;
}

function isUnsafeSnowFortsSpawn(x, z, radius = OVERWORLD_SPAWN_PLAYER_RADIUS) {
    if (isInsidePerimeterInset(x, z)) return true;

    for (const wall of SNOW_FORTS_WALL_BOXES) {
        if (circleOverlapsRect(x, z, radius, wall)) return true;
    }
    for (const hazard of SNOW_FORTS_INTERIOR_HAZARDS) {
        if (circleOverlapsRect(x, z, radius, hazard)) return true;
    }
    return false;
}

/**
 * True when a position would overlap perimeter or known static colliders for this overworld room.
 * @param {string} roomId
 * @param {{ x?: number, z?: number }} position
 * @returns {boolean}
 */
export function isUnsafeOverworldSpawn(roomId, position) {
    if (!isOverworldRoom(roomId) || !position) return false;
    const { x, z } = position;
    if (x == null || z == null) return true;

    if (roomId === 'snow_forts') {
        return isUnsafeSnowFortsSpawn(x, z);
    }

    // Town / forest — perimeter inset catches walls and mountain rims
    return isInsidePerimeterInset(x, z);
}

/**
 * Return a safe spawn for the room, falling back to map center when needed.
 * @param {string} roomId
 * @param {{ x?: number, y?: number, z?: number } | null | undefined} position
 * @returns {{ x: number, y: number, z: number }}
 */
export function resolveOverworldSpawn(roomId, position) {
    const fallback = { ...OVERWORLD_CENTER_SPAWN };
    if (!isOverworldRoom(roomId)) {
        return {
            x: position?.x ?? fallback.x,
            y: position?.y ?? 0,
            z: position?.z ?? fallback.z,
        };
    }
    if (!position || position.x == null || position.z == null) {
        return { ...fallback };
    }
    const candidate = {
        x: position.x,
        y: position.y ?? 0,
        z: position.z,
    };
    if (!isUnsafeOverworldSpawn(roomId, candidate)) {
        return candidate;
    }
    return { ...fallback };
}

/**
 * Nudge a spawn toward map center until zone / mountain checks pass (client-only runtime escape).
 * @param {{ x: number, z: number }} position
 * @param {{ checkZone?: (x: number, z: number, r: number) => boolean, checkMountain?: (x: number, z: number, r: number) => boolean, roomId?: string }} options
 * @returns {{ x: number, z: number, relocated: boolean }}
 */
export function escapeOverworldSpawnCollision(position, options = {}) {
    const { x, z } = position;
    const radius = options.playerRadius ?? OVERWORLD_SPAWN_PLAYER_RADIUS;
    const roomId = options.roomId ?? 'snow_forts';
    const targetX = OVERWORLD_CENTER_SPAWN.x;
    const targetZ = OVERWORLD_CENTER_SPAWN.z;

    const blocked = (px, pz) => {
        if (isUnsafeOverworldSpawn(roomId, { x: px, z: pz })) return true;
        if (options.checkZone?.(px, pz, radius)) return true;
        if (options.checkMountain?.(px, pz, radius)) return true;
        return false;
    };

    if (!blocked(x, z)) {
        return { x, z, relocated: false };
    }

    for (let step = 1; step <= 24; step++) {
        const t = step / 24;
        const nx = x + (targetX - x) * t;
        const nz = z + (targetZ - z) * t;
        if (!blocked(nx, nz)) {
            return { x: nx, z: nz, relocated: true };
        }
    }

    return { x: targetX, z: targetZ, relocated: true };
}

export default resolveOverworldSpawn;
