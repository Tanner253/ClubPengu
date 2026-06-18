/** Key codes that control in-world movement / actions — must not activate focused HUD buttons. */
export const GAME_CONTROL_KEY_CODES = new Set([
    'Space',
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'KeyE', 'KeyT',
    'ShiftLeft', 'ShiftRight',
]);

/**
 * If a HUD control is focused, blur it so game keys (e.g. Space = jump) work normally.
 * Returns true when the event should be prevented (HUD button would otherwise fire).
 */
export function releaseHudFocusForGameKey(eventCode, { preventDefault } = {}) {
    if (!GAME_CONTROL_KEY_CODES.has(eventCode)) return false;

    const active = document.activeElement;
    if (!active?.closest?.('[data-game-hud]')) return false;

    if (preventDefault) preventDefault();
    active.blur();
    return true;
}

/** Prevent mouse/touch clicks from leaving keyboard focus on HUD buttons. */
export function preventHudButtonFocus(event) {
    event.preventDefault();
}

/** Blur after pointer activation so Space does not re-trigger the control. */
export function blurHudButton(event) {
    event.currentTarget?.blur?.();
}

export const gameHudButtonProps = {
    onMouseDown: preventHudButtonFocus,
    onPointerDown: preventHudButtonFocus,
    onClick: blurHudButton,
};
