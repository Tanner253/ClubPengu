export const CHAT_CHANNELS = [
    'global',
    'room',
    'guild',
    'whisper',
    'casino',
    'announcement',
    'market',
    'local'
];

export const CHAT_TAB_CONFIG = [
    { id: 'global', labelKey: 'chat.tab.global', headerKey: 'chat.header.all', icon: '🌍', writable: true },
    { id: 'room', labelKey: 'chat.tab.room', headerKey: 'chat.header.public', icon: '🏠', writable: true },
    { id: 'guild', labelKey: 'chat.tab.guild', headerKey: 'chat.header.clan', icon: '⚔️', writable: false, comingSoon: true },
    { id: 'whisper', labelKey: 'chat.tab.whisper', headerKey: 'chat.header.private', icon: '💬', writable: true, conditional: true },
    { id: 'casino', labelKey: 'chat.tab.casino', headerKey: 'chat.header.game', icon: '🎰', writable: false },
    { id: 'announcement', labelKey: 'chat.tab.announcement', headerKey: 'chat.header.news', icon: '📢', writable: false },
    { id: 'market', labelKey: 'chat.tab.market', headerKey: 'chat.header.trade', icon: '🏪', writable: false },
    { id: 'local', labelKey: 'chat.tab.local', headerKey: 'chat.header.local', icon: '📋', writable: false, localOnly: true }
];

export const MAX_CHAT_PER_CHANNEL = 1000;

export function getMessageSenderRole(msg) {
    const role = msg?.senderRole || msg?.metadata?.senderRole;
    return role === 'admin' || role === 'moderator' ? role : null;
}

export function getStaffChatTag(role) {
    if (role === 'admin') return 'ADMIN';
    if (role === 'moderator') return 'MOD';
    return null;
}

export function createEmptyChatState() {
    return Object.fromEntries(CHAT_CHANNELS.map((ch) => [ch, []]));
}

export function normalizeChatMessage(msg, playerId = null) {
    const channel = msg.channel
        || (msg.localOnly ? 'local' : null)
        || (msg.isWhisper ? 'whisper' : msg.isSystem ? 'announcement' : 'room');
    let type = 'local';

    if (msg.metadata?.isAfk || msg.text?.startsWith('💤')) {
        type = 'afk';
    } else if (channel === 'local' || msg.localOnly) {
        type = 'system';
    } else if (msg.isWhisper || channel === 'whisper') {
        type = msg.whisperDirection === 'out' || msg.fromMe ? 'whisperOut' : 'whisperIn';
    } else if (msg.isSystem || ['casino', 'announcement', 'market'].includes(channel)) {
        type = 'system';
    }

        return {
        ...msg,
        channel: channel === 'local' || msg.localOnly ? 'local' : channel,
        type,
        localOnly: channel === 'local' || msg.localOnly || false,
        displayText: msg.text,
        senderRole: msg.senderRole || msg.metadata?.senderRole || null,
        id: msg.id || `${channel}_${msg.timestamp}_${Math.random().toString(36).slice(2, 6)}`,
        fromMe: msg.fromMe ?? (msg.playerId === playerId)
    };
}

export function appendChannelMessage(prev, channel, message, playerId = null) {
    const normalized = normalizeChatMessage({ ...message, channel }, playerId);
    const list = prev[channel] || [];
    if (list.some((m) => m.id === normalized.id)) return prev;
    return {
        ...prev,
        [channel]: [...list.slice(-(MAX_CHAT_PER_CHANNEL - 1)), normalized]
    };
}

export function mergeChatHistory(prev, channels, playerId = null) {
    const next = { ...prev };
    for (const [channel, messages] of Object.entries(channels || {})) {
        if (!CHAT_CHANNELS.includes(channel) || !Array.isArray(messages)) continue;
        const normalized = messages.map((m) => normalizeChatMessage({ ...m, channel }, playerId));
        const existingIds = new Set((next[channel] || []).map((m) => m.id));
        const merged = [
            ...(next[channel] || []),
            ...normalized.filter((m) => !existingIds.has(m.id))
        ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        next[channel] = merged.slice(-MAX_CHAT_PER_CHANNEL);
    }
    return next;
}

/** Replace server-backed channels with a full history snapshot (preserves local console). */
export function applyChatHistorySnapshot(prev, channels, playerId = null) {
    const next = { ...prev, local: prev.local || [] };
    for (const [channel, messages] of Object.entries(channels || {})) {
        if (channel === 'local' || !CHAT_CHANNELS.includes(channel) || !Array.isArray(messages)) continue;
        const normalized = messages
            .map((m) => normalizeChatMessage({ ...m, channel }, playerId))
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        next[channel] = normalized.slice(-MAX_CHAT_PER_CHANNEL);
    }
    return next;
}

export function applyRoomChatHistory(prev, messages, playerId = null) {
    const normalized = (messages || [])
        .map((m) => normalizeChatMessage({ ...m, channel: 'room' }, playerId))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return {
        ...prev,
        room: normalized.slice(-MAX_CHAT_PER_CHANNEL)
    };
}
