/**
 * WaddleBet procedural audio — public API.
 */

export { DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME, normalizeMusicVolume } from './defaults';
export { ensureAudio, getAudioContext } from './context';
export {
    applyGameSettings,
    loadAudioSettingsFromStorage,
    normalizeAudioSettings,
    subscribeAudio,
    getMusicEnabledSnapshot,
    getSfxEnabledSnapshot,
    getMusicVolumeSnapshot,
    getSfxVolumeSnapshot,
    getMusicTrackSnapshot,
    isSfxEnabled,
} from './settings';
export {
    MUSIC_TRACKS,
    MENU_TRACK_ID,
    maybeStartMusic,
    setMenuMusic,
    setMusicForRoom,
    switchTrack,
    getActiveTrackName,
    setMusicEnabled,
    setMusicVolume,
    refreshMusicTrack,
    setTrackPreference,
    setMusicEnergy,
    resetMusicEnergy,
} from './music';
export { playSfx, playManualChopSound, playManualFallSound, stopTravelHum } from './sfx';
export { updateProximityAmbient, stopProximityAmbient } from './proximityAmbient';
export { PROXIMITY_EMITTERS } from './proximityAmbientConfig';
export { handleRemotePlayerSfx, PLAYER_SFX_RADIUS } from './proximityPlayerSfx';
