import { describe, it, expect } from 'vitest';
import {
    isUnsafeOverworldSpawn,
    resolveOverworldSpawn,
    escapeOverworldSpawnCollision,
} from '../config/overworldSpawn.js';
import { OVERWORLD_CENTER_SPAWN } from '../config/overworldConfig.js';

describe('overworldSpawn', () => {
    it('treats map center as safe in snow_forts', () => {
        expect(isUnsafeOverworldSpawn('snow_forts', { x: 110, z: 110 })).toBe(false);
    });

    it('flags north perimeter and Old Salty shack as unsafe', () => {
        expect(isUnsafeOverworldSpawn('snow_forts', { x: 18, z: 8 })).toBe(true);
        expect(isUnsafeOverworldSpawn('snow_forts', { x: 18, z: 18 })).toBe(true);
    });

    it('flags east and south wall zones outside forest gap', () => {
        expect(isUnsafeOverworldSpawn('snow_forts', { x: 212, z: 110 })).toBe(true);
        expect(isUnsafeOverworldSpawn('snow_forts', { x: 30, z: 212 })).toBe(true);
        expect(isUnsafeOverworldSpawn('snow_forts', { x: 70, z: 190 })).toBe(false);
    });

    it('resolveOverworldSpawn falls back to center for unsafe saved positions', () => {
        const resolved = resolveOverworldSpawn('snow_forts', { x: 18, z: 18, y: 0 });
        expect(resolved).toEqual({ ...OVERWORLD_CENTER_SPAWN });
    });

    it('resolveOverworldSpawn preserves safe positions', () => {
        const saved = { x: 95, z: 130, y: 0 };
        expect(resolveOverworldSpawn('snow_forts', saved)).toEqual(saved);
    });

    it('escapeOverworldSpawnCollision nudges toward center when blocked', () => {
        const escaped = escapeOverworldSpawnCollision(
            { x: 18, z: 18 },
            { roomId: 'snow_forts' }
        );
        expect(escaped.relocated).toBe(true);
        expect(isUnsafeOverworldSpawn('snow_forts', escaped)).toBe(false);
    });

    it('ignores non-overworld rooms', () => {
        expect(isUnsafeOverworldSpawn('dojo', { x: 0, z: 0 })).toBe(false);
        expect(resolveOverworldSpawn('dojo', { x: 3, z: 5, y: 0 })).toEqual({ x: 3, y: 0, z: 5 });
    });
});
