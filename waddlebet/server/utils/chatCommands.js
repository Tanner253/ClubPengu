/**
 * Server-side chat command help (mirrors client chatCommands.js)
 */

const WARP_TARGET_META = {
    forest: { label: 'Forest Trails (main clearing)', staffOnly: true },
    snowforts: { label: 'Snow Forts (west dock)', staffOnly: true },
    snow: { label: 'Snow Forts (west dock)', staffOnly: true },
    pk1: { label: 'Parkour Stage 1 (Blue)', staffOnly: true },
    pk2: { label: 'Parkour Stage 2 (Purple)', staffOnly: true },
    pk3: { label: 'Parkour Stage 3 (Green)', staffOnly: true },
    pk4: { label: 'Parkour Stage 4 (Orange)', staffOnly: true },
    pk5: { label: 'Parkour Stage 5 (Red)', staffOnly: true },
    pk6: { label: 'Parkour Stage 6 (Cyan Gauntlet)', staffOnly: true }
};

function getWarpTargets({ isStaff = false } = {}) {
    return Object.keys(WARP_TARGET_META).filter((id) => {
        const meta = WARP_TARGET_META[id];
        if (meta.staffOnly && !isStaff) return false;
        return true;
    });
}

const BASE_COMMANDS = [
    { usage: '/help', description: 'Show all available chat commands' },
    { usage: '/w <name> <message>', description: 'Send a private whisper to a player' },
    { usage: '/r <message>', description: 'Reply to your last received whisper' },
    { usage: '/afk [message]', description: 'Set AFK status with an optional message' },
    { usage: '/spawn', description: 'Teleport to spawn if you are stuck' },
    { usage: '/tp <player> <destination>', description: 'Teleport one player to another (staff only)', staffOnly: true },
    { usage: '/warp <location>', description: 'Teleport to a zone or parkour stage (staff only)', staffOnly: true }
];

export function getHelpLines({ isStaff = false } = {}) {
    const lines = ['=== Chat Commands ==='];
    for (const cmd of BASE_COMMANDS) {
        if (cmd.staffOnly && !isStaff) continue;
        lines.push(`${cmd.usage} — ${cmd.description}`);
    }
    if (isStaff) {
        lines.push(`Warp locations: ${getWarpTargets({ isStaff }).join('|')}`);
    }
    lines.push('Tip: Press Tab while typing a command to autocomplete.');
    return lines;
}

export function isHelpCommand(text) {
    const lower = text.trim().toLowerCase();
    return lower === '/help' || lower === '/commands' || lower === '/?';
}

export function isClientOnlyCommand(text) {
    const lower = text.trim().toLowerCase();
    if (isHelpCommand(lower)) return true;
    if (lower === '/spawn') return true;
    if (lower.match(/^\/afk(\s+.*)?$/)) return true;
    return false;
}

/** @returns {string|null} warp target id or null if not a /warp command */
export function parseWarpCommand(text) {
    const trimmed = text.trim().toLowerCase();
    if (!trimmed.startsWith('/warp')) return null;
    const match = trimmed.match(/^\/warp\s+(\S+)$/);
    return match ? match[1] : null;
}

export function isWarpCommand(text) {
    return parseWarpCommand(text) !== null;
}

export function getWarpTargetMeta(target) {
    return WARP_TARGET_META[target] || null;
}

export { WARP_TARGET_META, getWarpTargets };
