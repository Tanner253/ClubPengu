/**
 * Display labels and sort order for server population popup.
 */

const ROOM_SORT_ORDER = [
    'town',
    'nightclub',
    'casino_game_room',
    'dojo',
    'pizza',
    'igloo1', 'igloo2', 'igloo3', 'igloo4', 'igloo5',
    'igloo6', 'igloo7', 'igloo8', 'igloo9', 'igloo10',
];

const ROOM_I18N_KEYS = {
    town: 'room.town',
    nightclub: 'room.nightclub',
    casino_game_room: 'room.casino',
    dojo: 'room.dojo',
    pizza: 'room.pizza',
};

export function getRoomLabel(roomId, t) {
    if (roomId === 'igloo3') {
        return t('room.sknyGang');
    }
    if (roomId.startsWith('igloo')) {
        const num = roomId.replace('igloo', '');
        return `${t('room.igloo')} ${num}`;
    }
    const key = ROOM_I18N_KEYS[roomId];
    if (key) return t(key);
    return roomId;
}

export function sortPopulationRooms(roomIds) {
    const orderIndex = new Map(ROOM_SORT_ORDER.map((id, i) => [id, i]));
    return [...roomIds].sort((a, b) => {
        const ai = orderIndex.has(a) ? orderIndex.get(a) : 1000;
        const bi = orderIndex.has(b) ? orderIndex.get(b) : 1000;
        if (ai !== bi) return ai - bi;
        return a.localeCompare(b);
    });
}
