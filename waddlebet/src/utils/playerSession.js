/**
 * Client-side player session persistence (room + position).
 * Authenticated users also persist on the server; this covers guests and offline refresh.
 */

import { WORLD_SPAWN_ROOM } from '../config/roomConfig.js';

const STORAGE_KEY = 'player_session';
const LEGACY_KEY = 'player_position';

export function savePlayerSession(room, position) {
    if (!room || !position || position.x == null || position.z == null) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            room,
            x: position.x,
            y: position.y ?? 0,
            z: position.z,
            savedAt: Date.now()
        }));
    } catch {
        // Ignore quota / private mode errors
    }
}

export function loadPlayerSession() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.room || parsed.x == null || parsed.z == null) return null;
        return {
            room: parsed.room,
            position: { x: parsed.x, y: parsed.y ?? 0, z: parsed.z }
        };
    } catch {
        return null;
    }
}

export function getResumeRoom(isAuthenticated, userData) {
    if (isAuthenticated && userData?.lastRoom) {
        return userData.lastRoom;
    }
    const saved = loadPlayerSession();
    if (saved?.room) return saved.room;
    return WORLD_SPAWN_ROOM;
}

export function getResumePosition(room, isAuthenticated, userData) {
    if (isAuthenticated && userData?.lastRoom === room && userData?.lastPosition) {
        const p = userData.lastPosition;
        if (p.x != null && p.z != null) {
            return { x: p.x, y: p.y ?? 0, z: p.z };
        }
    }
    const saved = loadPlayerSession();
    if (saved?.room === room && saved.position) {
        return saved.position;
    }
    return null;
}
