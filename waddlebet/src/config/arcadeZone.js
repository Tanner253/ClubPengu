/**
 * Arcade zone layout in town — single source of truth for machine positions.
 * Center: x = C - 33.1, z = C + 0.0 (west side of the T-stem)
 *
 * Grocery-aisle layout: two rows along Z on the west/east edges of a wide corridor.
 * West row faces +X (east); east row faces -X (west) so players walk north–south between them.
 */

export const TOWN_CENTER = 110;

const centerX = TOWN_CENTER - 33.1;
const centerZ = TOWN_CENTER + 0.0;

/** Half-width of the walkable aisle (row centers sit on the red-line positions) */
const AISLE_HALF_WIDTH = 7.5;

export const ARCADE_AISLE = {
    westX: centerX - AISLE_HALF_WIDTH,
    eastX: centerX + AISLE_HALF_WIDTH,
    centerX,
    centerZ,
    /** North/south ends of the corridor (lamp posts + signage) */
    northZ: centerZ - 12,
    southZ: centerZ + 12,
};

/** Face +X (east, into the aisle from the west row) */
const FACE_EAST = Math.PI / 2;
/** Face -X (west, into the aisle from the east row) */
const FACE_WEST = -Math.PI / 2;

export const ARCADE_ZONE = {
    centerX,
    centerZ,
    floatingTitle: {
        x: centerX,
        z: ARCADE_AISLE.southZ + 2,
        text: '🎮 ARCADE ZONE',
        height: 8,
    },
};

export const ARCADE_MACHINES = [
    { id: 'battleship_arcade', game: 'battleship', gameKey: 'game.battleship', icon: '🚢', x: ARCADE_AISLE.westX, z: centerZ - 9, rotationY: FACE_EAST },
    { id: 'flappy_arcade', game: 'flappy_penguin', gameKey: 'game.flappyPenguin', icon: '🐧', x: ARCADE_AISLE.westX, z: centerZ - 3, rotationY: FACE_EAST },
    { id: 'snake_arcade', game: 'snake', gameKey: 'game.snake', icon: '🐍', x: ARCADE_AISLE.westX, z: centerZ + 3, rotationY: FACE_EAST },
    { id: 'pong_arcade', game: 'pong', gameKey: 'game.icePong', icon: '🏒', x: ARCADE_AISLE.westX, z: centerZ + 9, rotationY: FACE_EAST },
    { id: 'memory_arcade', game: 'memory', gameKey: 'game.memoryMatch', icon: '🧠', x: ARCADE_AISLE.eastX, z: centerZ - 6, rotationY: FACE_WEST },
    { id: 'thinice_arcade', game: 'thin_ice', gameKey: 'game.thinIce', icon: '❄️', x: ARCADE_AISLE.eastX, z: centerZ, rotationY: FACE_WEST },
    { id: 'avalanche_arcade', game: 'avalanche_run', gameKey: 'game.avalancheRun', icon: '🏔️', x: ARCADE_AISLE.eastX, z: centerZ + 6, rotationY: FACE_WEST },
];
