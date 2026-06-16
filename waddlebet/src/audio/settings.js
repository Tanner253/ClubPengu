/**
 * Audio preferences — synced with game_settings in localStorage.
 * Applies gain changes immediately (no stale-read race with React).
 */

import { getMusicGain, getSfxGain, ensureAudio } from './context';
import { setMusicEnabled, setMusicVolume, maybeStartMusic, refreshMusicTrack, setTrackPreference } from './music';
import { DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME, normalizeMusicVolume } from './defaults';

const listeners = new Set();

let musicEnabled = true;
let sfxEnabled = true;
let musicVolume = DEFAULT_MUSIC_VOLUME;
let sfxVolume = DEFAULT_SFX_VOLUME;
let musicTrack = 'auto';
let loaded = false;
let lastAppliedMusicKey = '';

function notify() {
    listeners.forEach((l) => l());
}

function applyGains() {
    ensureAudio();
    const mg = getMusicGain();
    const sg = getSfxGain();
    if (mg) mg.gain.value = musicEnabled ? musicVolume : 0;
    if (sg) sg.gain.value = sfxEnabled ? sfxVolume : 0;
}

/** Migrate legacy keys (soundEnabled, musicMuted) into the new schema. */
export function normalizeAudioSettings(raw = {}) {
    const legacySound = raw.soundEnabled !== false;
    const legacyMuted = raw.musicMuted === true;
    return {
        ...raw,
        musicEnabled: raw.musicEnabled !== undefined
            ? raw.musicEnabled !== false
            : legacySound && !legacyMuted,
        sfxEnabled: raw.sfxEnabled !== undefined
            ? raw.sfxEnabled !== false
            : legacySound,
        musicVolume: normalizeMusicVolume(raw.musicVolume),
        sfxVolume: typeof raw.sfxVolume === 'number' ? raw.sfxVolume : DEFAULT_SFX_VOLUME,
        musicTrack: raw.musicTrack ?? 'auto',
    };
}

export function applyGameSettings(settings) {
    const norm = normalizeAudioSettings(settings);
    musicEnabled = norm.musicEnabled;
    sfxEnabled = norm.sfxEnabled;
    musicVolume = Math.max(0, Math.min(1, norm.musicVolume));
    sfxVolume = Math.max(0, Math.min(1, norm.sfxVolume));
    musicTrack = norm.musicTrack;
    loaded = true;
    setTrackPreference(norm.musicTrack);
    applyGains();
    setMusicEnabled(musicEnabled);
    setMusicVolume(musicVolume);
    const musicKey = `${musicEnabled}|${norm.musicTrack}`;
    if (musicEnabled) {
        if (musicKey !== lastAppliedMusicKey) {
            lastAppliedMusicKey = musicKey;
            refreshMusicTrack(true, norm.musicTrack);
        }
        maybeStartMusic();
    } else {
        lastAppliedMusicKey = musicKey;
    }
    notify();
}

export function loadAudioSettingsFromStorage() {
    if (typeof window === 'undefined') return;
    try {
        const raw = JSON.parse(localStorage.getItem('game_settings') || '{}');
        applyGameSettings(raw);
    } catch {
        applyGains();
    }
}

export function subscribeAudio(onChange) {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
}

export function getMusicEnabledSnapshot() {
    if (!loaded) loadAudioSettingsFromStorage();
    return musicEnabled;
}

export function getSfxEnabledSnapshot() {
    if (!loaded) loadAudioSettingsFromStorage();
    return sfxEnabled;
}

export function getMusicVolumeSnapshot() {
    if (!loaded) loadAudioSettingsFromStorage();
    return musicVolume;
}

export function getSfxVolumeSnapshot() {
    if (!loaded) loadAudioSettingsFromStorage();
    return sfxVolume;
}

export function getMusicTrackSnapshot() {
    if (!loaded) loadAudioSettingsFromStorage();
    return musicTrack;
}

export function isSfxEnabled() {
    return getSfxEnabledSnapshot();
}

export function getSfxVolume() {
    return getSfxVolumeSnapshot();
}

/** Server snapshot for SSR — defaults only. */
export function getAudioServerSnapshot() {
    return false;
}
