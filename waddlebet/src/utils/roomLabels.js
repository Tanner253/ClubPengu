/**
 * Display labels and sort order for server population popup and HUD room titles.
 */

const ROOM_SORT_ORDER = [
    'town',
    'snow_forts',
    'forest_trails',
    'nightclub',
    'casino_game_room',
    'dojo',
    'pizza',
    'igloo1', 'igloo2', 'igloo3', 'igloo4', 'igloo5',
    'igloo6', 'igloo7', 'igloo8', 'igloo9', 'igloo10',
];

const ROOM_I18N_KEYS = {
    town: 'room.town',
    snow_forts: 'room.snow_forts',
    forest_trails: 'room.forest_trails',
    nightclub: 'room.nightclub',
    casino_game_room: 'room.casino',
    dojo: 'room.dojo',
    pizza: 'room.pizza',
};

/** Optional emoji prefix for in-world room title (population list stays plain text). */
const ROOM_EMOJI = {
    dojo: '🥋 ',
    pizza: '🍕 ',
    nightclub: '🎵 ',
    casino_game_room: '🎰 ',
    snow_forts: '⛄ ',
    forest_trails: '🌲 ',
    igloo3: '🎵 ',
    travel_ferry: '🚢 ',
};

/**
 * @param {string} roomId
 * @param {(key: string) => string} t
 * @param {{ emoji?: boolean }} [options]
 */
export function getRoomLabel(roomId, t, options = {}) {
    const { emoji = false } = options;
    if (!roomId) return t('room.town');

    if (roomId.startsWith('travel:')) {
        const label = t('room.travel_ferry');
        return emoji ? `${ROOM_EMOJI.travel_ferry || ''}${label}` : label;
    }

    if (roomId === 'igloo3') {
        const label = t('room.sknyGang');
        return emoji ? `${ROOM_EMOJI.igloo3 || ''}${label}` : label;
    }

    if (roomId.startsWith('igloo')) {
        const num = roomId.replace('igloo', '');
        const label = `${t('room.igloo')} ${num}`;
        return label;
    }

    const key = ROOM_I18N_KEYS[roomId];
    const label = key ? t(key) : roomId;
    const prefix = emoji ? (ROOM_EMOJI[roomId] || '') : '';
    return `${prefix}${label}`;
}

export function sortPopulationRooms(roomIds) {
    const orderIndex = new Map(ROOM_SORT_ORDER.map((id, i) => [id, i]));

    const rank = (roomId) => {
        if (orderIndex.has(roomId)) return orderIndex.get(roomId);
        if (roomId.startsWith('travel:')) return 15;
        return 1000;
    };

    return [...roomIds].sort((a, b) => {
        const ai = rank(a);
        const bi = rank(b);
        if (ai !== bi) return ai - bi;
        return a.localeCompare(b);
    });
}
