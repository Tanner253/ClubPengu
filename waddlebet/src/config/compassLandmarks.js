/**
 * Compass POIs — world-space x/z per room (town uses CENTER offsets + C = 110).
 */

import { CENTER_X, CENTER_Z } from './roomConfig';

const C = CENTER_X;

/** @typedef {{ id: string, label: string, x: number, z: number, color?: string, maxDistance?: number }} CompassLandmark */

/** @type {Record<string, CompassLandmark[]>} */
export const COMPASS_LANDMARKS = {
    town: [
        { id: 'dojo', label: 'DOJO', x: C, z: C + 70, color: '#f87171' },
        { id: 'pizza', label: 'PIZZA', x: C - 45, z: C + 35, color: '#fb923c' },
        { id: 'puffle', label: 'PUFFLE', x: C + 45, z: C + 35, color: '#fbbf24' },
        { id: 'club', label: 'CLUB', x: C - 25, z: C - 75, color: '#e879f9' },
        { id: 'arcade', label: 'ARCADE', x: C - 33.1, z: C, color: '#38bdf8' },
        { id: 'forts', label: 'FORTS', x: C + 95, z: C - 45, color: '#7dd3fc', maxDistance: 120 },
        { id: 'fish', label: 'POND', x: C - 70.4, z: C + 78.5, color: '#60a5fa', maxDistance: 100 },
        { id: 'wager', label: 'PVP', x: C + 16.2, z: C - 18.4, color: '#4ade80', maxDistance: 80 },
    ],
    snow_forts: [
        { id: 'casino', label: 'CASINO', x: C + 40, z: C - 80, color: '#fbbf24' },
        { id: 'town', label: 'TOWN', x: C, z: C + 40, color: '#fde047' },
    ],
    forest_trails: [
        { id: 'town', label: 'TOWN', x: C, z: C + 30, color: '#fde047' },
    ],
    casino_game_room: [
        { id: 'exit', label: 'EXIT', x: 0, z: 45, color: '#94a3b8' },
    ],
    dojo: [
        { id: 'exit', label: 'EXIT', x: 0, z: 55, color: '#94a3b8' },
    ],
    pizza: [
        { id: 'exit', label: 'EXIT', x: 0, z: 40, color: '#94a3b8' },
    ],
    nightclub: [
        { id: 'exit', label: 'EXIT', x: 0, z: 50, color: '#94a3b8' },
    ],
};

export function getCompassLandmarks(roomId) {
    if (!roomId) return COMPASS_LANDMARKS.town;
    if (roomId.startsWith('igloo')) return [];
    if (roomId.startsWith('travel:')) return [];
    return COMPASS_LANDMARKS[roomId] || [];
}
