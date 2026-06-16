/**
 * Chat slash commands — definitions, /help text, and tab completion
 */

export const WARP_TARGET_META = {
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

const BASE_COMMANDS = [
    {
        names: ['help'],
        usage: '/help',
        description: 'Show all available chat commands',
        tabCompletes: false
    },
    {
        names: ['w', 'whisper'],
        usage: '/w <name> <message>',
        description: 'Send a private whisper to a player',
        tabCompletes: true,
        args: [{ type: 'player', excludeSelf: true }]
    },
    {
        names: ['r'],
        usage: '/r <message>',
        description: 'Reply to your last received whisper',
        tabCompletes: false
    },
    {
        names: ['afk'],
        usage: '/afk [message]',
        description: 'Set AFK status with an optional message',
        tabCompletes: false
    },
    {
        names: ['spawn'],
        usage: '/spawn',
        description: 'Teleport to spawn if you are stuck',
        tabCompletes: false
    },
    {
        names: ['tp'],
        usage: '/tp <player> <destination>',
        description: 'Teleport one player to another (staff only)',
        staffOnly: true,
        tabCompletes: true,
        args: [{ type: 'player', excludeSelf: false }, { type: 'player', excludeSelf: false }]
    },
    {
        names: ['warp'],
        usage: '/warp <location>',
        description: 'Teleport to a zone or parkour stage (staff only)',
        staffOnly: true,
        tabCompletes: true,
        args: [{ type: 'warpTarget' }]
    }
];

export function getWarpTargets({ isStaff = false } = {}) {
    return Object.keys(WARP_TARGET_META).filter((id) => {
        const meta = WARP_TARGET_META[id];
        if (meta.staffOnly && !isStaff) return false;
        return true;
    });
}

export function isStaffRole(userData) {
    return userData?.role === 'admin' || userData?.role === 'moderator';
}

export function isDevEnvironment() {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'qa';
}

export function getAvailableCommands({ isStaff = false, isDev = false } = {}) {
    return BASE_COMMANDS.filter((cmd) => {
        if (cmd.staffOnly && !isStaff) return false;
        if (cmd.devOnly && !isDev) return false;
        return true;
    });
}

/** Commands matching partial input like "/" or "/h" (command name only, no args yet). */
export function getCommandSuggestions(input, { isStaff = false, isDev = false } = {}) {
    const match = input.match(/^\/(\S*)$/);
    if (!match) return [];

    const partial = match[1].toLowerCase();
    return getAvailableCommands({ isStaff, isDev }).filter((cmd) => {
        if (!partial) return true;
        if (cmd.names.some((n) => n.startsWith(partial))) return true;
        if (cmd.usage.slice(1).toLowerCase().startsWith(partial)) return true;
        return false;
    });
}

/** Location suggestions while typing `/warp` or `/warp fo`. */
export function getWarpArgSuggestions(input, { isStaff = false } = {}) {
    const match = input.match(/^\/warp(?:\s+(\S*))?$/i);
    if (!match) return [];

    const partial = (match[1] || '').toLowerCase();
    return getWarpTargets({ isStaff })
        .filter((target) => !partial || target.startsWith(partial))
        .map((target) => ({
            names: [target],
            usage: `/warp ${target}`,
            description: WARP_TARGET_META[target].label,
            tabCompletes: false,
            isLocationSuggestion: true
        }));
}

/** Combined popup list for `/` command names and `/warp` location args. */
export function getAllChatSuggestions(input, { isStaff = false, isDev = false } = {}) {
    const warpArgs = getWarpArgSuggestions(input, { isStaff });
    if (warpArgs.length > 0) return warpArgs;
    if (shouldShowCommandSuggestions(input)) {
        return getCommandSuggestions(input, { isStaff, isDev });
    }
    return [];
}

export function shouldShowCommandSuggestions(input) {
    return /^\/\S*$/.test(input);
}

export function shouldShowChatSuggestions(input) {
    if (shouldShowCommandSuggestions(input)) return true;
    return /^\/warp(\s+\S*)?$/i.test(input);
}

export function buildCommandInput(cmd) {
    if (cmd.isLocationSuggestion) return cmd.usage;
    const name = cmd.names[0];
    const noSpaceCommands = ['help', 'spawn'];
    const addSpace = cmd.args?.length > 0
        || (!noSpaceCommands.includes(name) && ['r', 'afk', 'w', 'whisper', 'tp', 'warp'].includes(name));
    return addSpace ? `/${name} ` : `/${name}`;
}

export function getHelpMessages({ isStaff = false, isDev = false } = {}) {
    const commands = getAvailableCommands({ isStaff, isDev });
    const lines = ['=== Chat Commands ==='];
    for (const cmd of commands) {
        lines.push(`${cmd.usage} — ${cmd.description}`);
    }
    const warpList = getWarpTargets({ isStaff }).join('|');
    if (isStaff) {
        lines.push(`Warp locations: ${warpList}`);
    }
    lines.push('Tip: Press Tab while typing a command to autocomplete.');
    return lines;
}

function findCommand(cmdName) {
    const lower = cmdName.toLowerCase();
    return BASE_COMMANDS.find((cmd) => cmd.names.includes(lower)) || null;
}

function filterPlayerNames(names, partial, excludeSelf, selfName) {
    const pool = excludeSelf && selfName
        ? names.filter((n) => n.toLowerCase() !== selfName.toLowerCase())
        : names;
    const needle = partial.toLowerCase();
    return pool.filter((name) => name.toLowerCase().startsWith(needle));
}

function getArgCompletionState(argsString) {
    const endsWithSpace = argsString.endsWith(' ');
    const trimmed = argsString.trim();
    const tokens = trimmed ? trimmed.split(/\s+/) : [];

    if (endsWithSpace) {
        return { argIndex: tokens.length, partial: '', prefix: trimmed };
    }

    if (tokens.length === 0) {
        return { argIndex: 0, partial: '', prefix: '' };
    }

    const partial = tokens[tokens.length - 1];
    const prefix = tokens.slice(0, -1).join(' ');
    return { argIndex: tokens.length - 1, partial, prefix };
}

function cycleMatch(matches, partial, autocompleteIndex, lastTabInput) {
    if (matches.length === 0) return null;
    const key = `${partial}::${matches.join('|')}`;
    const idx = lastTabInput === key ? autocompleteIndex : 0;
    return {
        match: matches[idx % matches.length],
        autocompleteIndex: idx + 1,
        lastTabInput: key
    };
}

/**
 * Tab-complete chat input. Returns null if nothing to complete.
 */
export function completeChatInput(input, {
    playerNames = [],
    selfName = '',
    isStaff = false,
    isDev = false,
    autocompleteIndex = 0,
    lastTabInput = ''
} = {}) {
    if (!input.startsWith('/')) return null;

    const cmdOnly = input.match(/^\/(\S*)$/);
    if (cmdOnly) {
        const partial = cmdOnly[1].toLowerCase();
        const available = getAvailableCommands({ isStaff, isDev });
        const names = [];
        available.forEach((cmd) => cmd.names.forEach((n) => names.push(n)));
        const unique = [...new Set(names)];
        const matches = unique.filter((n) => n.startsWith(partial)).sort();
        const cycled = cycleMatch(matches, partial, autocompleteIndex, lastTabInput);
        if (!cycled) return null;

        const cmd = findCommand(cycled.match);
        const noSpaceCommands = ['help', 'spawn'];
        const addSpace = cmd?.args?.length > 0 || (!noSpaceCommands.includes(cycled.match) && ['r', 'afk'].includes(cycled.match));
        return {
            newInput: addSpace ? `/${cycled.match} ` : `/${cycled.match}`,
            autocompleteIndex: cycled.autocompleteIndex,
            lastTabInput: cycled.lastTabInput
        };
    }

    const parsed = input.match(/^\/(\S+)(?:\s+(.*))?$/);
    if (!parsed) return null;

    const cmdName = parsed[1].toLowerCase();
    const cmd = findCommand(cmdName);
    if (!cmd?.tabCompletes || !cmd.args?.length) return null;

    if (cmd.staffOnly && !isStaff) return null;
    if (cmd.devOnly && !isDev) return null;

    const argsString = parsed[2] || '';
    const { argIndex, partial, prefix } = getArgCompletionState(argsString);
    const argSpec = cmd.args[argIndex];
    if (!argSpec) return null;

    let matches = [];
    if (argSpec.type === 'player') {
        matches = filterPlayerNames(playerNames, partial, argSpec.excludeSelf, selfName);
    } else if (argSpec.type === 'warpTarget') {
        matches = getWarpTargets({ isStaff }).filter((t) => t.startsWith(partial.toLowerCase()));
    }

    const cycled = cycleMatch(matches, `${cmdName}:${argIndex}:${partial}`, autocompleteIndex, lastTabInput);
    if (!cycled) return null;

    const beforeCmd = `/${parsed[1]}`;
    const argPrefix = prefix ? `${prefix} ` : '';
    return {
        newInput: `${beforeCmd} ${argPrefix}${cycled.match}${argSpec.type === 'player' ? ' ' : ''}`,
        autocompleteIndex: cycled.autocompleteIndex,
        lastTabInput: cycled.lastTabInput
    };
}

export function isHelpCommand(text) {
    const lower = text.trim().toLowerCase();
    return lower === '/help' || lower === '/commands' || lower === '/?';
}

export function canExecuteCommand(text, { isStaff = false } = {}) {
    const trimmed = text.trim();
    if (isHelpCommand(trimmed)) return true;
    if (trimmed.toLowerCase() === '/spawn') return true;
    if (trimmed.match(/^\/w(?:hisper)?\s+\S+\s+.+$/i)) return true;
    if (trimmed.match(/^\/r\s+.+/i)) return true;
    if (trimmed.match(/^\/afk(\s+.*)?$/i)) return true;
    if (trimmed.match(/^\/tp\s+\S+\s+\S+$/i)) return isStaff;
    if (trimmed.match(/^\/warp\s+\S+$/i)) return isStaff;
    return false;
}

/** True if this slash command should be sent to the server for handling. */
export function isServerHandledSlashCommand(text, { isStaff = false } = {}) {
    const trimmed = text.trim();
    if (trimmed.match(/^\/warp\s+\S+$/i)) return isStaff;
    if (trimmed.match(/^\/tp\s+.+/i)) return isStaff;
    return false;
}

export function isUnknownSlashCommand(text, { isStaff = false } = {}) {
    const trimmed = text.trim();
    if (!trimmed.startsWith('/')) return false;
    if (canExecuteCommand(trimmed, { isStaff })) return false;
    if (isServerHandledSlashCommand(trimmed, { isStaff })) return false;
    return true;
}

export function getUnknownCommandMessage(text) {
    const cmd = text.trim().split(/\s+/)[0];
    return `❌ Unknown command: ${cmd}. Type /help for available commands.`;
}

export function getIncompleteWarpMessage({ isStaff = false } = {}) {
    const targets = getWarpTargets({ isStaff }).join('|');
    return `❌ Usage: /warp ${targets}`;
}

/**
 * Resolve what to do when the user presses Enter on a slash command.
 * @returns {{ text: string, action: 'execute' | 'apply' | 'send' }}
 */
export function resolveCommandTextOnSend(input, {
    showSuggestions = false,
    suggestions = [],
    suggestionIndex = 0,
    isStaff = false
} = {}) {
    const text = input.trim();
    if (!text.startsWith('/')) {
        return { text, action: 'send' };
    }

    if (canExecuteCommand(text, { isStaff })) {
        return { text, action: 'execute' };
    }

    if (showSuggestions && suggestions.length > 0) {
        const picked = suggestions[suggestionIndex] || suggestions[0];
        const suggested = (picked.isLocationSuggestion ? picked.usage : buildCommandInput(picked)).trim();
        if (canExecuteCommand(suggested, { isStaff })) {
            return { text: suggested, action: 'execute' };
        }
        return { text: suggested, action: 'apply' };
    }

    return { text, action: 'execute' };
}
