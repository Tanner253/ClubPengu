/**
 * Server-side chat command help (mirrors client chatCommands.js)
 */

const BASE_COMMANDS = [
    { usage: '/help', description: 'Show all available chat commands' },
    { usage: '/w <name> <message>', description: 'Send a private whisper to a player' },
    { usage: '/r <message>', description: 'Reply to your last received whisper' },
    { usage: '/afk [message]', description: 'Set AFK status with an optional message' },
    { usage: '/spawn', description: 'Teleport to spawn if you are stuck' },
    { usage: '/tp <player> <destination>', description: 'Teleport one player to another (staff only)', staffOnly: true },
    { usage: '/warp pk1|pk2|pk3|pk4|pk5|pk6', description: 'Teleport to a parkour stage (staff only)', staffOnly: true }
];

export function getHelpLines({ isStaff = false } = {}) {
    const lines = ['=== Chat Commands ==='];
    for (const cmd of BASE_COMMANDS) {
        if (cmd.staffOnly && !isStaff) continue;
        lines.push(`${cmd.usage} — ${cmd.description}`);
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

export function isWarpCommand(text) {
    return text.trim().toLowerCase().match(/^\/warp\s+(pk[1-6])$/);
}
