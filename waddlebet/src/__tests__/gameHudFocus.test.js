import { describe, it, expect, vi } from 'vitest';
import { releaseHudFocusForGameKey, GAME_CONTROL_KEY_CODES } from '../utils/gameHudFocus';

describe('releaseHudFocusForGameKey', () => {
    it('includes Space in game control keys', () => {
        expect(GAME_CONTROL_KEY_CODES.has('Space')).toBe(true);
    });

    it('blurs focused HUD button and prevents default on game keys', () => {
        const container = document.createElement('div');
        container.setAttribute('data-game-hud', 'true');
        const button = document.createElement('button');
        container.appendChild(button);
        document.body.appendChild(container);

        button.focus();
        const preventDefault = vi.fn();
        const released = releaseHudFocusForGameKey('Space', { preventDefault });

        expect(released).toBe(true);
        expect(preventDefault).toHaveBeenCalled();
        expect(document.activeElement).not.toBe(button);

        document.body.removeChild(container);
    });

    it('ignores non-game keys', () => {
        const container = document.createElement('div');
        container.setAttribute('data-game-hud', 'true');
        const button = document.createElement('button');
        container.appendChild(button);
        document.body.appendChild(container);
        button.focus();

        expect(releaseHudFocusForGameKey('KeyF')).toBe(false);
        expect(document.activeElement).toBe(button);

        document.body.removeChild(container);
    });
});
