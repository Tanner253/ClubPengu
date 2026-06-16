/**
 * Procedural world & UI sounds — warm, low, coherent (no arcade pings).
 * All routes through the SFX master gain (respects settings).
 */

import { ensureAudio, getAudioContext, getSfxGain } from './context';
import { isSfxEnabled } from './settings';

const throttle = new Map();
let lastHoldChop = 0;
let sfxVolMul = 1;
let travelHumOsc = null;
let travelHumGain = null;

function canPlay(key, ms) {
    const now = performance.now();
    const last = throttle.get(key) || 0;
    if (now - last < ms) return false;
    throttle.set(key, now);
    return true;
}

function out() {
    ensureAudio();
    return getSfxGain();
}

function tone(freq, dur, type, vol, slideTo, delay = 0, filterFreq) {
    const ctx = getAudioContext();
    const dest = out();
    if (!ctx || !dest || !isSfxEnabled()) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(28, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol * sfxVolMul, t0 + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let tail = osc;
    if (filterFreq) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = filterFreq;
        tail = f;
        osc.connect(f);
    }
    tail.connect(gain).connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.06);
}

function noise(dur, vol, filterFreq, type = 'lowpass', delay = 0) {
    const ctx = getAudioContext();
    const dest = out();
    if (!ctx || !dest || !isSfxEnabled()) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * sfxVolMul, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(dest);
    src.start(t0);
}

// --- Individual sound designs ------------------------------------------------

function sfxUiClick() {
    tone(280, 0.04, 'sine', 0.06);
    noise(0.03, 0.025, 1200, 'bandpass');
}

function sfxUiOpen() {
    tone(180, 0.12, 'sine', 0.05, 320);
    noise(0.08, 0.03, 800);
}

function sfxUiConfirm() {
    tone(392, 0.1, 'triangle', 0.07);
    tone(523, 0.14, 'triangle', 0.06, undefined, 0.07);
}

function sfxWoodChopHit(intensity = 1) {
    const vol = Math.min(0.35, 0.14 + intensity * 0.04);
    tone(90 + intensity * 8, 0.09, 'triangle', vol, 45, 0, 400);
    noise(0.07, vol * 0.55, 650 + intensity * 80, 'bandpass');
}

function sfxWoodChopFall() {
    tone(95, 0.35, 'sine', 0.12, 38);
    noise(0.25, 0.1, 420);
    tone(220, 0.2, 'triangle', 0.05, 110, 0.15);
}

function sfxWoodChopTick() {
    if (!canPlay('wood_tick', 520)) return;
    tone(110, 0.06, 'triangle', 0.11, 70);
    noise(0.05, 0.07, 900, 'bandpass');
}

function sfxWoodChopComplete() {
    tone(330, 0.12, 'triangle', 0.09);
    tone(440, 0.18, 'triangle', 0.08, undefined, 0.1);
    noise(0.1, 0.06, 500);
}

function sfxFishingCast() {
    noise(0.06, 0.04, 3200, 'highpass');
    tone(680, 0.14, 'sine', 0.05, 220, 0.04);
    noise(0.22, 0.09, 520, 'lowpass', 0.12);
    tone(140, 0.18, 'sine', 0.06, 90, 0.14);
}

function sfxFishingBite() {
    tone(95, 0.1, 'sine', 0.1, 55);
    noise(0.08, 0.06, 380, 'lowpass', 0.02);
    tone(220, 0.05, 'sine', 0.04, 160, 0.06);
    tone(180, 0.07, 'sine', 0.05, 120, 0.1);
}

function sfxFishingCatch() {
    noise(0.28, 0.12, 480, 'lowpass');
    tone(330, 0.2, 'sine', 0.09, undefined, 0.05);
    tone(415, 0.22, 'sine', 0.08, undefined, 0.14);
    tone(523, 0.28, 'sine', 0.07, undefined, 0.24);
    noise(0.12, 0.05, 1800, 'bandpass', 0.18);
}

function sfxFishingMiss() {
    noise(0.22, 0.08, 650, 'lowpass');
    tone(180, 0.2, 'sine', 0.05, 110);
    noise(0.15, 0.04, 2200, 'highpass', 0.08);
}

function sfxFishingSting() {
    tone(120, 0.25, 'sine', 0.11, 75);
    noise(0.18, 0.09, 350);
    tone(90, 0.15, 'sine', 0.07, 55, 0.1);
}

function sfxEquipRod() {
    noise(0.04, 0.07, 4800, 'highpass');
    tone(920, 0.06, 'sine', 0.06, 420, 0.01);
    tone(640, 0.08, 'sine', 0.05, 280, 0.04);
    noise(0.06, 0.05, 1200, 'bandpass', 0.05);
}

function sfxEquipAxe() {
    tone(180, 0.05, 'sine', 0.08, 120);
    noise(0.07, 0.06, 750, 'lowpass', 0.02);
    tone(240, 0.04, 'triangle', 0.05, 180, 0.04);
    noise(0.05, 0.04, 2200, 'bandpass', 0.06);
}

function sfxEquipTool() {
    noise(0.05, 0.045, 900, 'bandpass');
    tone(280, 0.06, 'sine', 0.05, 220, 0.02);
}

function sfxEquipUnequip() {
    noise(0.04, 0.04, 600, 'lowpass');
    tone(200, 0.07, 'sine', 0.04, 140);
}

function sfxTravelBook() {
    tone(220, 0.08, 'sine', 0.06);
    noise(0.06, 0.04, 1400, 'bandpass');
    tone(330, 0.1, 'triangle', 0.05, undefined, 0.06);
}

function sfxTravelDepart() {
    tone(55, 0.6, 'sine', 0.08, 110);
    noise(0.5, 0.06, 320);
    tone(82, 0.8, 'triangle', 0.05, 130, 0.2);
}

function sfxTravelArrive() {
    tone(110, 0.5, 'sine', 0.07, 55);
    noise(0.35, 0.05, 280);
    tone(330, 0.25, 'triangle', 0.06, undefined, 0.15);
}

function sfxTravelHumStart() {
    const ctx = getAudioContext();
    const dest = out();
    if (!ctx || !dest || !isSfxEnabled() || travelHumOsc) return;
    travelHumOsc = ctx.createOscillator();
    travelHumGain = ctx.createGain();
    travelHumOsc.type = 'sine';
    travelHumOsc.frequency.value = 62;
    travelHumGain.gain.setValueAtTime(0, ctx.currentTime);
    travelHumGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1.2);
    travelHumOsc.connect(travelHumGain).connect(dest);
    travelHumOsc.start();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 8;
    lfo.connect(lfoGain).connect(travelHumOsc.frequency);
    lfo.start();
    travelHumOsc._lfo = lfo;
}

function sfxTravelHumStop() {
    const ctx = getAudioContext();
    if (!travelHumOsc || !ctx) return;
    if (travelHumGain) {
        travelHumGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    }
    const osc = travelHumOsc;
    const lfo = travelHumOsc._lfo;
    setTimeout(() => {
        try { osc.stop(); lfo?.stop(); } catch { /* already stopped */ }
    }, 900);
    travelHumOsc = null;
    travelHumGain = null;
}

function sfxSlotSpin() {
    if (!canPlay('slot_spin', 120)) return;
    noise(0.08, 0.04, 2400, 'bandpass');
    tone(180, 0.06, 'triangle', 0.03, 220);
}

function sfxSlotStop() {
    tone(120, 0.05, 'triangle', 0.06, 80);
    noise(0.04, 0.04, 700, 'bandpass');
}

function sfxSlotWinSmall() {
    tone(392, 0.12, 'triangle', 0.08);
    tone(494, 0.16, 'triangle', 0.07, undefined, 0.1);
}

function sfxSlotWinMedium() {
    tone(330, 0.12, 'triangle', 0.09);
    tone(415, 0.12, 'triangle', 0.08, undefined, 0.1);
    tone(523, 0.22, 'triangle', 0.09, undefined, 0.2);
}

function sfxSlotJackpot() {
    tone(262, 0.14, 'triangle', 0.1);
    tone(330, 0.14, 'triangle', 0.1, undefined, 0.12);
    tone(392, 0.14, 'triangle', 0.1, undefined, 0.24);
    tone(523, 0.35, 'triangle', 0.12, undefined, 0.36);
    noise(0.3, 0.06, 2000, 'bandpass', 0.2);
}

function sfxGoldWin() {
    tone(440, 0.1, 'triangle', 0.07);
    tone(554, 0.12, 'triangle', 0.06, undefined, 0.08);
    tone(659, 0.18, 'triangle', 0.06, undefined, 0.16);
}

function sfxGoldPickup() {
    if (!canPlay('gold_pickup', 80)) return;
    tone(880, 0.05, 'sine', 0.05);
    tone(1175, 0.07, 'sine', 0.04, undefined, 0.04);
}

function sfxMerchantBuy() {
    tone(330, 0.08, 'triangle', 0.06);
    noise(0.05, 0.03, 1000, 'bandpass');
}

function sfxMerchantSell() {
    tone(440, 0.07, 'triangle', 0.06);
    tone(523, 0.09, 'triangle', 0.05, undefined, 0.05);
}

function sfxMushroomPick() {
    tone(280, 0.06, 'sine', 0.06, 220);
    noise(0.04, 0.03, 1600, 'highpass');
}

function sfxSnowballThrow() {
    noise(0.12, 0.05, 2800, 'bandpass');
}

function sfxSnowballHit() {
    noise(0.1, 0.07, 1200, 'lowpass');
    tone(180, 0.06, 'sine', 0.04, 100);
}

function sfxQuestStep() {
    tone(523, 0.1, 'triangle', 0.07);
    tone(659, 0.14, 'triangle', 0.06, undefined, 0.08);
}

function sfxQuestComplete() {
    tone(392, 0.12, 'triangle', 0.08);
    tone(494, 0.12, 'triangle', 0.08, undefined, 0.1);
    tone(587, 0.2, 'triangle', 0.09, undefined, 0.2);
}

function sfxDropGold() {
    tone(220, 0.1, 'triangle', 0.06);
    noise(0.08, 0.05, 800, 'bandpass');
}

let lastNpcBlip = 0;

/** Animal Crossing-style soft syllable blip while NPC text types out. */
export function playNpcBlip(pitchMul = 1) {
    if (!isSfxEnabled()) return;
    ensureAudio();
    const now = performance.now();
    if (now - lastNpcBlip < 36) return;
    lastNpcBlip = now;
    const base = 340 * pitchMul * (0.9 + Math.random() * 0.22);
    tone(base, 0.032, 'sine', 0.038);
    if (Math.random() < 0.22) {
        tone(base * 1.45, 0.022, 'triangle', 0.02, undefined, 0.006);
    }
}

/**
 * @param {string} event
 * @param {{ intensity?: number, payout?: number, pitch?: number, volMul?: number }} [opts]
 */
export function playSfx(event, opts = {}) {
    if (!isSfxEnabled()) return;
    ensureAudio();
    sfxVolMul = opts.volMul ?? 1;

    switch (event) {
        case 'ui_click': sfxUiClick(); break;
        case 'ui_open': sfxUiOpen(); break;
        case 'ui_confirm': sfxUiConfirm(); break;
        case 'wood_chop_hit': sfxWoodChopHit(opts.intensity ?? 1); break;
        case 'wood_chop_fall': sfxWoodChopFall(); break;
        case 'wood_chop_tick': sfxWoodChopTick(); break;
        case 'wood_chop_complete': sfxWoodChopComplete(); break;
        case 'fishing_cast': sfxFishingCast(); break;
        case 'fishing_bite': sfxFishingBite(); break;
        case 'fishing_catch': sfxFishingCatch(); break;
        case 'fishing_miss': sfxFishingMiss(); break;
        case 'fishing_sting': sfxFishingSting(); break;
        case 'travel_book': sfxTravelBook(); break;
        case 'travel_depart': sfxTravelDepart(); break;
        case 'travel_arrive': sfxTravelArrive(); break;
        case 'travel_hum_start': sfxTravelHumStart(); break;
        case 'travel_hum_stop': sfxTravelHumStop(); break;
        case 'slot_spin': sfxSlotSpin(); break;
        case 'slot_stop': sfxSlotStop(); break;
        case 'slot_win_small': sfxSlotWinSmall(); break;
        case 'slot_win_medium': sfxSlotWinMedium(); break;
        case 'slot_jackpot': sfxSlotJackpot(); break;
        case 'gold_win': sfxGoldWin(); break;
        case 'gold_pickup': sfxGoldPickup(); break;
        case 'merchant_buy': sfxMerchantBuy(); break;
        case 'merchant_sell': sfxMerchantSell(); break;
        case 'mushroom_pick': sfxMushroomPick(); break;
        case 'snowball_throw': sfxSnowballThrow(); break;
        case 'snowball_hit': sfxSnowballHit(); break;
        case 'quest_step': sfxQuestStep(); break;
        case 'quest_complete': sfxQuestComplete(); break;
        case 'drop_gold': sfxDropGold(); break;
        case 'equip_rod': sfxEquipRod(); break;
        case 'equip_axe': sfxEquipAxe(); break;
        case 'equip_tool': sfxEquipTool(); break;
        case 'equip_unequip': sfxEquipUnequip(); break;
        case 'npc_blip': playNpcBlip(opts.pitch ?? 1); break;
        default: break;
    }

    sfxVolMul = 1;
}

/** Back-compat for manual chop modules */
export function playManualChopSound(intensity = 1) {
    playSfx('wood_chop_hit', { intensity });
}

export function playManualFallSound() {
    playSfx('wood_chop_fall');
}

export function stopTravelHum() {
    sfxTravelHumStop();
}
