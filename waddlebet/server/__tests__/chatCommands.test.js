import { describe, it, expect } from 'vitest';
import {
    parseWarpCommand,
    getWarpTargetMeta,
    getWarpTargets
} from '../utils/chatCommands.js';
import {
    resolveCommandTextOnSend,
    canExecuteCommand,
    isUnknownSlashCommand
} from '../../src/utils/chatCommands.js';

describe('server chatCommands warp', () => {
    it('parses /warp forest', () => {
        expect(parseWarpCommand('/warp forest')).toBe('forest');
    });

    it('returns null for bare /warp', () => {
        expect(parseWarpCommand('/warp')).toBeNull();
        expect(parseWarpCommand('/warp ')).toBeNull();
    });

    it('does not expose warp targets to regular players', () => {
        expect(getWarpTargets({ isStaff: false })).toEqual([]);
        expect(getWarpTargets({ isStaff: false })).not.toContain('forest');
        expect(getWarpTargets({ isStaff: false })).not.toContain('pk1');
    });

    it('exposes all warp targets to staff', () => {
        const staff = getWarpTargets({ isStaff: true });
        expect(staff).toContain('forest');
        expect(staff).toContain('snowforts');
        expect(staff).toContain('pk6');
    });
});

describe('resolveCommandTextOnSend', () => {
    const warpSuggestions = [
        { usage: '/warp forest', isLocationSuggestion: true, description: 'Forest' },
        { usage: '/warp pk1', isLocationSuggestion: true, description: 'PK1' }
    ];

    it('executes a complete /help immediately', () => {
        const result = resolveCommandTextOnSend('/help', { showSuggestions: true, suggestions: [] });
        expect(result.action).toBe('execute');
        expect(result.text).toBe('/help');
        expect(canExecuteCommand(result.text)).toBe(true);
    });

    it('executes highlighted /warp location on Enter for staff', () => {
        const result = resolveCommandTextOnSend('/warp', {
            showSuggestions: true,
            suggestions: warpSuggestions,
            suggestionIndex: 0,
            isStaff: true
        });
        expect(result.action).toBe('execute');
        expect(result.text).toBe('/warp forest');
    });

    it('treats /warp as unknown for regular players', () => {
        expect(canExecuteCommand('/warp forest', { isStaff: false })).toBe(false);
        expect(isUnknownSlashCommand('/warp forest', { isStaff: false })).toBe(true);
    });
});
