/**
 * Shared Web Audio context and master gain routing.
 * Music and SFX use separate gain nodes so toggles/volumes are independent.
 */

import { DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME } from './defaults';
let ctx = null;
let sfxGain = null;
let musicGain = null;

export function ensureAudio() {
    if (typeof window === 'undefined') return;
    if (!ctx) {
        try {
            ctx = new AudioContext();
        } catch {
            return;
        }
    }
    if (ctx.state === 'suspended') void ctx.resume();

    if (!sfxGain) {
        sfxGain = ctx.createGain();
        sfxGain.gain.value = DEFAULT_SFX_VOLUME;
        sfxGain.connect(ctx.destination);
    }
    if (!musicGain) {
        musicGain = ctx.createGain();
        musicGain.gain.value = DEFAULT_MUSIC_VOLUME;
        musicGain.connect(ctx.destination);
    }
}

export function getAudioContext() {
    return ctx;
}

export function getSfxGain() {
    return sfxGain;
}

export function getMusicGain() {
    return musicGain;
}
