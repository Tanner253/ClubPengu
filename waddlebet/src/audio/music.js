/**
 * BBALL-style procedural music — lookahead scheduler, zone tracks in musicZones.js
 */

import { ensureAudio, getAudioContext, getMusicGain } from './context';
import { MUSIC_TRACKS, scheduleTrackStep, BAR } from './musicZones';
import { DEFAULT_MUSIC_VOLUME } from './defaults';

export { MUSIC_TRACKS } from './musicZones';

const LOOKAHEAD_S = 0.6;
const TICK_MS = 200;

const ROOM_TRACK = {
    forest_trails: 1,
    town: 2,
    snow_forts: 3,
    forest: 1,
    casino_game_room: 4,
    nightclub: 5,
    gold_lobby: 4,
    dojo: 0,
    pizza: 2,
};

export const MENU_TRACK_ID = 0;

let timer = null;
let trackMaster = null;
let activeTrack = MUSIC_TRACKS[0];
let nextTime = 0;
let stepIdx = 0;
let musicOn = true;
let musicVol = DEFAULT_MUSIC_VOLUME;
let currentTrackId = 0;
let lastRoom = '';
let userTrackPref = 'auto';
let musicEnergy = 0;
let musicEnergyTarget = 0;

export function setMusicEnergy(target) {
    musicEnergyTarget = Math.max(0, Math.min(1, target ?? 0));
}

export function resetMusicEnergy() {
    musicEnergy = 0;
    musicEnergyTarget = 0;
}

export function trackIdForRoom(room) {
    if (!room) return MENU_TRACK_ID;
    if (room.startsWith('travel:')) return 0;
    if (room.startsWith('igloo')) return 0;
    return ROOM_TRACK[room] ?? 0;
}

export function setTrackPreference(pref) {
    userTrackPref = pref ?? 'auto';
}

function resolveTrackId(prefOverride) {
    const pref = prefOverride !== undefined ? prefOverride : userTrackPref;
    if (pref === 'auto' || pref === undefined || pref === '') {
        return trackIdForRoom(lastRoom);
    }
    const n = Number(pref);
    return Math.max(0, Math.min(MUSIC_TRACKS.length - 1, Number.isFinite(n) ? n : 0));
}

export function refreshMusicTrack(force = true, prefOverride) {
    switchTrack(resolveTrackId(prefOverride), force);
}

function isAutoTrackMode() {
    return userTrackPref === 'auto' || userTrackPref === '' || userTrackPref === undefined;
}

export function setMenuMusic() {
    lastRoom = '';
    if (!isAutoTrackMode()) return;
    switchTrack(MENU_TRACK_ID, true);
    if (musicOn) maybeStartMusic();
}

export function setMusicForRoom(room) {
    lastRoom = room || '';
    if (room !== 'nightclub') resetMusicEnergy();
    if (!isAutoTrackMode()) return;
    switchTrack(trackIdForRoom(lastRoom), true);
    if (musicOn) maybeStartMusic();
}

function disconnectTrackMaster() {
    if (!trackMaster) return;
    try {
        trackMaster.disconnect();
    } catch {
        /* already disconnected */
    }
    trackMaster = null;
}

export function switchTrack(trackId, force = false) {
    const clamped = Math.max(0, Math.min(MUSIC_TRACKS.length - 1, trackId));
    if (!force && clamped === currentTrackId && timer) return;
    const wasPlaying = Boolean(timer);
    stopMusic();
    disconnectTrackMaster();
    currentTrackId = clamped;
    activeTrack = MUSIC_TRACKS[clamped] || MUSIC_TRACKS[0];
    if (musicOn && (wasPlaying || force)) startMusic();
}

export function setMusicEnabled(on) {
    musicOn = on;
    if (!on) stopMusic();
}

export function setMusicVolume(vol) {
    musicVol = vol;
    const out = getMusicGain();
    if (out) out.gain.value = musicOn ? vol : 0;
}

export function maybeStartMusic() {
    if (musicOn) startMusic();
}

export function restartMusicIfPlaying() {
    if (!timer) return;
    stopMusic();
    startMusic();
}

function startMusic() {
    ensureAudio();
    const ctx = getAudioContext();
    const musicOut = getMusicGain();
    if (!ctx || !musicOut || timer) return;

    if (!trackMaster) {
        trackMaster = ctx.createGain();
        trackMaster.connect(musicOut);
    }
    trackMaster.gain.value = activeTrack.master;
    musicOut.gain.value = musicOn ? musicVol : 0;

    nextTime = ctx.currentTime + 0.1;
    stepIdx = 0;
    timer = setInterval(schedulerTick, TICK_MS);
}

function stopMusic() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function schedulerTick() {
    const ctx = getAudioContext();
    if (!ctx || !trackMaster || !musicOn) return;
    musicEnergy += (musicEnergyTarget - musicEnergy) * 0.1;
    const step = 60 / activeTrack.tempo / 2;
    const energy = activeTrack.pattern === 'club' ? musicEnergy : 0;
    while (nextTime < ctx.currentTime + LOOKAHEAD_S) {
        scheduleTrackStep(ctx, trackMaster, stepIdx, nextTime, step, activeTrack, energy);
        stepIdx = (stepIdx + 1) % (BAR * 4);
        nextTime += step;
    }
}

export function getActiveTrackName() {
    return activeTrack?.name ?? MUSIC_TRACKS[0].name;
}
