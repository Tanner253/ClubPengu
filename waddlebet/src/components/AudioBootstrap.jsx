/**
 * Boots procedural music on first user gesture and syncs menu vs in-game tracks.
 */

import { useEffect } from 'react';
import {
    ensureAudio,
    loadAudioSettingsFromStorage,
    maybeStartMusic,
    setMenuMusic,
    setMusicForRoom,
} from '../audio';

export default function AudioBootstrap({ inGameWorld = false, room = null }) {
    useEffect(() => {
        loadAudioSettingsFromStorage();

        const unlock = () => {
            ensureAudio();
            if (inGameWorld && room) {
                setMusicForRoom(room);
            } else {
                setMenuMusic();
            }
            maybeStartMusic();
        };

        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('keydown', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });

        const onStorage = () => {
            loadAudioSettingsFromStorage();
        };

        window.addEventListener('storage', onStorage);

        return () => {
            document.removeEventListener('click', unlock);
            document.removeEventListener('keydown', unlock);
            document.removeEventListener('touchstart', unlock);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    useEffect(() => {
        if (inGameWorld && room) {
            setMusicForRoom(room);
        } else if (!inGameWorld) {
            setMenuMusic();
        }
    }, [inGameWorld, room]);

    return null;
}
