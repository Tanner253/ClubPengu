/**
 * Hear other players' action sounds when within range.
 */

import { playSfx } from './sfx';
import { isSfxEnabled } from './settings';

export const PLAYER_SFX_RADIUS = 48;

/** @param {number} distSq @param {number} inner @param {number} outer */
function proximityVolMul(distSq, inner, outer) {
    const outerSq = outer * outer;
    if (distSq >= outerSq) return 0;
    const innerSq = inner * inner;
    if (distSq <= innerSq) return 1;
    const dist = Math.sqrt(distSq);
    const t = (outer - dist) / (outer - inner);
    return t * t * (3 - 2 * t);
}

/**
 * @param {{ playerId?: string, sfx: string, x: number, z: number, intensity?: number, maxRadius?: number }} msg
 * @param {{ x: number, z: number }} localPos
 * @param {string} localPlayerId
 */
export function handleRemotePlayerSfx(msg, localPos, localPlayerId) {
    if (!msg?.sfx || !isSfxEnabled()) return;
    if (msg.playerId && msg.playerId === localPlayerId) return;

    const dx = localPos.x - (msg.x ?? 0);
    const dz = localPos.z - (msg.z ?? 0);
    const maxR = msg.maxRadius ?? PLAYER_SFX_RADIUS;
    const volMul = proximityVolMul(dx * dx + dz * dz, maxR * 0.12, maxR);
    if (volMul <= 0.01) return;

    playSfx(msg.sfx, {
        intensity: msg.intensity,
        volMul,
    });
}
