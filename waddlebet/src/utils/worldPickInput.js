/**
 * Hit-test helpers for selecting players / world objects through UI layers.
 * Ignores pointer-events:none overlays so taps reach the game canvas.
 */

/**
 * @param {Element | null | undefined} el
 * @param {HTMLElement} canvas
 * @returns {boolean}
 */
export function elementBlocksWorldPick(el, canvas) {
    if (!el || el === canvas || el === canvas.parentElement) return false;

    const style = window.getComputedStyle(el);
    if (style.pointerEvents === 'none') return false;

    if (
        el.closest('[data-joystick]')
        || el.hasAttribute?.('data-joystick')
        || el.closest('.joystick')
        || el.closest('[class*="joystick"]')
    ) {
        return true;
    }

    if (el.closest('[data-emote-wheel]')) return true;
    if (el.closest('[data-no-camera]')) return true;
    if (el.closest('[data-player-modal]')) return true;

    const tag = el.tagName;
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return true;
    }
    if (el.closest('button, input, textarea, select, [role="button"], a[href]')) {
        return true;
    }

    const z = parseInt(style.zIndex, 10);
    if (!Number.isNaN(z) && z >= 40) return true;

    return false;
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {HTMLElement} canvas
 * @returns {boolean}
 */
export function canPickWorldAt(clientX, clientY, canvas) {
    if (!canvas) return false;
    const stack = document.elementsFromPoint(clientX, clientY);
    for (const el of stack) {
        if (elementBlocksWorldPick(el, canvas)) return false;
        if (el === canvas || el === canvas.parentElement) return true;
    }
    return false;
}
