/** Sounds other players may hear when nearby (client filters by distance). */

export const PROXIMITY_SFX_RADIUS = 48;

/** Client-initiated — server validates + rate-limits. */
export const CLIENT_PLAYER_SFX = new Set(['wood_chop_tick']);

/** @type {Map<string, number>} */
const throttleMs = new Map();

/**
 * @param {string} playerId
 * @param {string} sfx
 * @param {number} minIntervalMs
 */
export function canEmitPlayerSfx(playerId, sfx, minIntervalMs) {
    const key = `${playerId}:${sfx}`;
    const now = Date.now();
    const last = throttleMs.get(key) || 0;
    if (now - last < minIntervalMs) return false;
    throttleMs.set(key, now);
    return true;
}

/**
 * @param {(roomId: string, message: object, ...excludeIds: string[]) => void} broadcastToRoom
 * @param {string} roomId
 * @param {string} sourcePlayerId
 * @param {{ x?: number, z?: number }} position
 * @param {{ sfx: string, intensity?: number, x?: number, z?: number }} payload
 */
export function broadcastProximitySfx(broadcastToRoom, roomId, sourcePlayerId, position, payload) {
    if (!roomId || !payload?.sfx) return;
    const x = payload.x ?? position?.x ?? 0;
    const z = payload.z ?? position?.z ?? 0;
    broadcastToRoom(
        roomId,
        {
            type: 'player_sfx',
            playerId: sourcePlayerId,
            sfx: payload.sfx,
            x,
            z,
            intensity: payload.intensity,
            maxRadius: PROXIMITY_SFX_RADIUS,
        },
        sourcePlayerId
    );
}
