/**
 * Distance-based ambient loops — campfires, fountains, ice holes, interior room tones.
 */

import { ensureAudio, getAudioContext, getSfxGain } from './context';
import { isSfxEnabled, getSfxVolume } from './settings';
import {
    PROXIMITY_EMITTERS,
    emitterProximityGain,
} from './proximityAmbientConfig';

function makeLoopNoiseBuffer(ctx, seconds) {
    const len = Math.ceil(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.008 * white) / 1.008;
        data[i] = last * 1.6;
    }
    return buf;
}

function schedulePop(ctx, root, targetGain, opts) {
    const minGain = opts.minGain ?? 0.02;
    if (targetGain < minGain) return;
    const t0 = ctx.currentTime;
    const dur = opts.duration ?? 0.04;
    const popLen = Math.ceil(ctx.sampleRate * dur);
    const popBuf = ctx.createBuffer(1, popLen, ctx.sampleRate);
    const pd = popBuf.getChannelData(0);
    for (let i = 0; i < popLen; i++) pd[i] = (Math.random() * 2 - 1) * (1 - i / popLen);
    const pop = ctx.createBufferSource();
    pop.buffer = popBuf;
    const popF = ctx.createBiquadFilter();
    popF.type = opts.filterType ?? 'highpass';
    popF.frequency.value = opts.filterFreq ?? 900;
    const popG = ctx.createGain();
    popG.gain.setValueAtTime(0.0001, t0);
    popG.gain.exponentialRampToValueAtTime((opts.peak ?? 0.06) * targetGain, t0 + 0.006);
    popG.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    pop.connect(popF).connect(popG).connect(root);
    pop.start(t0);
    pop.stop(t0 + dur + 0.02);
}

function connectNoiseLoop(ctx, root, cfg) {
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = makeLoopNoiseBuffer(ctx, cfg.bufferSec ?? 2.4);
    noiseSrc.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = cfg.filterType ?? 'bandpass';
    filter.Q.value = cfg.q ?? 0.75;
    filter.frequency.value = cfg.freq ?? 1100;
    const body = ctx.createGain();
    body.gain.value = cfg.bodyGain ?? 0.2;
    noiseSrc.connect(filter).connect(body).connect(root);
    noiseSrc.start();
    return { noiseSrc, body };
}

function connectFlicker(ctx, body, cfg) {
    const flicker = ctx.createOscillator();
    const flickerGain = ctx.createGain();
    flicker.type = 'sine';
    flicker.frequency.value = cfg.rate ?? 3;
    flickerGain.gain.value = cfg.depth ?? 0.08;
    flicker.connect(flickerGain).connect(body.gain);
    flicker.start();
    return flicker;
}

function connectHum(ctx, root, freq, vol, type = 'sine') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain).connect(root);
    osc.start();
    return osc;
}

function attachPopLoop(voice, ctx, root, minMs, maxMs, popOpts) {
    voice.popTimer = setInterval(() => {
        schedulePop(ctx, root, voice.targetGain, popOpts);
    }, minMs + Math.random() * (maxMs - minMs));
}

/** @param {import('./proximityAmbientConfig').ProximityEmitter['type']} type */
function createEmitterVoice(ctx, dest, type) {
    const root = ctx.createGain();
    root.gain.value = 0;
    root.connect(dest);

    const voice = {
        type,
        root,
        noiseSrc: null,
        extraNoiseSrcs: [],
        flicker: null,
        extraOscs: [],
        popTimer: null,
        targetGain: 0,
        maxVol: 0.3,
    };

    switch (type) {
        case 'campfire': {
            voice.maxVol = 0.52;
            // Warm low rumble + soft mid crackle — audible but not harsh static
            voice.extraOscs.push(connectHum(ctx, root, 92, 0.055, 'sine'));
            voice.extraOscs.push(connectHum(ctx, root, 46, 0.038, 'triangle'));
            const loop = connectNoiseLoop(ctx, root, {
                bufferSec: 5,
                filterType: 'lowpass',
                freq: 460,
                q: 0.45,
                bodyGain: 0.16,
            });
            voice.noiseSrc = loop.noiseSrc;
            voice.flicker = connectFlicker(ctx, loop.body, { rate: 0.55, depth: 0.06 });
            const crackle = connectNoiseLoop(ctx, root, {
                bufferSec: 2.8,
                filterType: 'bandpass',
                freq: 820,
                q: 1.1,
                bodyGain: 0.055,
            });
            voice.extraNoiseSrcs.push(crackle.noiseSrc);
            attachPopLoop(voice, ctx, root, 450, 1300, {
                filterType: 'lowpass',
                filterFreq: 520,
                peak: 0.11,
                duration: 0.08,
                minGain: 0.015,
            });
            break;
        }
        case 'fountain': {
            voice.maxVol = 0.28;
            const loop = connectNoiseLoop(ctx, root, { bufferSec: 3.2, freq: 680, q: 1.1, bodyGain: 0.14 });
            voice.noiseSrc = loop.noiseSrc;
            voice.flicker = connectFlicker(ctx, loop.body, { rate: 0.6, depth: 0.04 });
            break;
        }
        case 'ice_fishing': {
            voice.maxVol = 0.26;
            const loop = connectNoiseLoop(ctx, root, { bufferSec: 3.5, freq: 420, q: 0.9, bodyGain: 0.16 });
            voice.noiseSrc = loop.noiseSrc;
            voice.flicker = connectFlicker(ctx, loop.body, { rate: 0.35, depth: 0.06 });
            voice.extraOscs.push(connectHum(ctx, root, 95, 0.04, 'sine'));
            attachPopLoop(voice, ctx, root, 900, 2200, {
                filterType: 'bandpass',
                filterFreq: 520,
                peak: 0.05,
                duration: 0.08,
            });
            break;
        }
        case 'casino_floor': {
            voice.maxVol = 0.32;
            const loop = connectNoiseLoop(ctx, root, { bufferSec: 2.8, freq: 1800, q: 0.6, bodyGain: 0.1 });
            voice.noiseSrc = loop.noiseSrc;
            for (const f of [110, 165, 220]) voice.extraOscs.push(connectHum(ctx, root, f, 0.012, 'square'));
            attachPopLoop(voice, ctx, root, 400, 1200, {
                filterType: 'highpass',
                filterFreq: 2500,
                peak: 0.04,
                duration: 0.025,
            });
            break;
        }
        case 'dojo_murmur': {
            voice.maxVol = 0.2;
            const loop = connectNoiseLoop(ctx, root, { bufferSec: 4, freq: 320, q: 0.5, bodyGain: 0.08 });
            voice.noiseSrc = loop.noiseSrc;
            voice.extraOscs.push(connectHum(ctx, root, 72, 0.025, 'sine'));
            voice.flicker = connectFlicker(ctx, loop.body, { rate: 0.12, depth: 0.05 });
            break;
        }
        case 'pizza_kitchen': {
            voice.maxVol = 0.24;
            const loop = connectNoiseLoop(ctx, root, { bufferSec: 3, freq: 280, q: 0.7, bodyGain: 0.12 });
            voice.noiseSrc = loop.noiseSrc;
            voice.extraOscs.push(connectHum(ctx, root, 52, 0.035, 'triangle'));
            attachPopLoop(voice, ctx, root, 600, 1800, {
                filterType: 'bandpass',
                filterFreq: 1200,
                peak: 0.035,
                duration: 0.06,
            });
            break;
        }
        default:
            break;
    }

    return voice;
}

function disposeVoice(voice) {
    if (!voice) return;
    if (voice.popTimer) {
        clearInterval(voice.popTimer);
        voice.popTimer = null;
    }
    try { voice.noiseSrc?.stop(); } catch { /* stopped */ }
    voice.extraNoiseSrcs?.forEach((src) => { try { src.stop(); } catch { /* stopped */ } });
    try { voice.flicker?.stop(); } catch { /* stopped */ }
    voice.extraOscs?.forEach((o) => { try { o.stop(); } catch { /* stopped */ } });
    try { voice.root.disconnect(); } catch { /* noop */ }
}

/** @type {Map<string, ReturnType<typeof createEmitterVoice>>} */
const activeVoices = new Map();
let lastRoom = '';

function ensureVoice(emitter) {
    if (activeVoices.has(emitter.id)) return activeVoices.get(emitter.id);
    const ctx = getAudioContext();
    const dest = getSfxGain();
    if (!ctx || !dest) return null;
    const voice = createEmitterVoice(ctx, dest, emitter.type);
    activeVoices.set(emitter.id, voice);
    return voice;
}

function fadeVoiceGain(voice, gain, sfxMaster) {
    const ctx = getAudioContext();
    if (!ctx || !voice) return;
    voice.targetGain = gain;
    voice.root.gain.setTargetAtTime(gain * voice.maxVol * sfxMaster, ctx.currentTime, 0.12);
}

export function stopProximityAmbient() {
    activeVoices.forEach((voice) => disposeVoice(voice));
    activeVoices.clear();
    lastRoom = '';
}

/**
 * @param {string} room
 * @param {number} px
 * @param {number} pz
 */
export function updateProximityAmbient(room, px, pz) {
    if (!room || typeof window === 'undefined') return;

    if (room !== lastRoom) {
        activeVoices.forEach((voice, id) => {
            const still = PROXIMITY_EMITTERS.some((e) => e.id === id && e.room === room);
            if (!still) {
                disposeVoice(voice);
                activeVoices.delete(id);
            }
        });
        lastRoom = room;
    }

    if (!isSfxEnabled()) {
        activeVoices.forEach((voice) => fadeVoiceGain(voice, 0, 0));
        return;
    }

    ensureAudio();
    const sfxMaster = getSfxVolume();
    const emitters = PROXIMITY_EMITTERS.filter((e) => e.room === room);
    const nearIds = new Set();

    for (const emitter of emitters) {
        const gain = emitterProximityGain(px, pz, emitter);
        if (gain <= 0.001) continue;

        nearIds.add(emitter.id);
        const voice = ensureVoice(emitter);
        if (voice) fadeVoiceGain(voice, gain, sfxMaster);
    }

    activeVoices.forEach((voice, id) => {
        if (!nearIds.has(id)) fadeVoiceGain(voice, 0, sfxMaster);
    });
}
