/**
 * Room Configuration - Centralized room and building definitions
 * Extracted from VoxelWorld.jsx for maintainability
 */

// City/Map dimensions
export const CITY_SIZE = 55;  // 55 * 4 = 220 units
export const BUILDING_SCALE = 4;

// Derived center coordinates (frequently used)
export const CENTER_X = (CITY_SIZE / 2) * BUILDING_SCALE; // 110
export const CENTER_Z = (CITY_SIZE / 2) * BUILDING_SCALE; // 110

// Building definitions for the town
export const BUILDINGS = [
    { 
        id: 'dojo', 
        name: 'THE DOJO', 
        emoji: '⛩️', 
        description: 'Enter to play Card Jitsu!',
        color: 0xc0392b, // Red roof
        wallColor: 0x7f8c8d,
        position: { x: 0, z: 70 },    // Far south - base of T stem
        doorRadius: 3,
        size: { w: 14, h: 8, d: 14 },
        roofType: 'pagoda',
        rotation: Math.PI  // Door faces north toward campfire
    },
    { 
        id: 'puffle_shop', 
        name: 'PUFFLE SHOP', 
        emoji: '🐾', 
        description: 'Adopt puffles & buy supplies',
        gameId: null,
        color: 0xf39c12, // Gold roof
        wallColor: 0xecf0f1,
        position: { x: 45, z: 35 },   // East side of T stem
        doorRadius: 3,
        size: { w: 10, h: 6, d: 10 },
        roofType: 'flat',
        rotation: -Math.PI / 2  // Door faces west toward street
    },
    { 
        id: 'plaza', 
        name: 'PIZZA PARLOR', 
        emoji: '🍕', 
        description: 'Pizza minigame coming soon!',
        gameId: null,
        color: 0xe74c3c, // Red/orange
        wallColor: 0xf5deb3,
        position: { x: -45, z: 35 },  // West side of T stem
        doorRadius: 3,
        size: { w: 12, h: 7, d: 10 },
        roofType: 'slanted',
        rotation: Math.PI / 2  // Door faces east toward street
    }
];

// Chat bubble height constants
export const BUBBLE_HEIGHT_PENGUIN = 5.8;
export const BUBBLE_HEIGHT_MARCUS = 6.8;
export const BUBBLE_HEIGHT_WHALE = 6.5;
export const NAME_HEIGHT_PENGUIN = 5;
export const NAME_HEIGHT_MARCUS = 6;
export const NAME_HEIGHT_WHALE = 5.8;

// AI penguin names
export const AI_NAMES = [
    "Puddles", "Waddle", "Snowy", "Flipper", "IceCube", 
    "Chilly", "Pebble", "Igloo", "Frosty", "Slippy"
];

// AI emotes (subset available to AI penguins)
export const AI_EMOTES = ['Wave', 'Dance', 'Laugh', 'Sit', 'Breakdance'];

// AI Conversation dialogues
export const AI_CONVERSATIONS = [
    ["Did you see SOL today?", "SOLANA is skyrocketing! 🚀", "To the moon we go!", "HODL your flippers!"],
    ["WaddleBet is back!", "I missed this place.", "Let's go dance!", "Wait for me!"],
    ["Nice outfit.", "Thanks, it's custom.", "Very stylish.", "You look cool too."],
    ["Is it cold?", "Ideally freezing.", "Perfect weather.", "Let's slide on the ice."],
    ["Waddle on!", "Waddle on!", "See you around.", "Bye for now!"],
    ["Anyone seen the dojo?", "I think it's north.", "Let's become ninjas!", "Hyah!"],
    ["Pizza time?", "Always pizza time.", "Extra fish topping?", "Gross, but okay."]
];

// Room spawn positions
export const ROOM_SPAWNS = {
    town: { x: 0, z: 0 },
    dojo: { x: 0, z: 12 },
    pizza: { x: 0, z: 12 },
    nightclub: { x: 20, z: 28 },
    igloo: { x: 0, z: 10 },
    casino_game_room: { x: 10, z: 10 }  // Near entrance from casino portal room
};

// ==================== PORTAL DEFINITIONS ====================
// Room-specific portals/doors
// Town portal positions are OFFSETS from center (centerX/Z added in checkPortals)
// T-STREET LAYOUT - FULL MAP SCALE (220x220)
export const ROOM_PORTALS = {
    town: [
        { 
            id: 'dojo-entrance', 
            name: 'THE DOJO', 
            emoji: '⛩️', 
            description: 'Enter the Dojo',
            targetRoom: 'dojo',
            // Dojo at (0, 70), rotated π (door faces north)
            position: { x: 0, z: 62 },
            doorRadius: 3.5
        },
        {
            id: 'casino-game-room',
            name: 'GAME ROOM',
            emoji: '🎰',
            description: 'Enter the Casino',
            targetRoom: 'casino_game_room',
            position: { x: -42, z: 3 },  // Centered on main casino floor
            doorRadius: 3.5,
            exitSpawnPos: { x: -42, z: 6 }  // Spawn near center when exiting game room
        },
        // NORTH ROW IGLOOS (north of T-bar, rotation: 0, door faces SOUTH toward street)
        // Igloos at z ~ -75, doors at z ~ -70, exit spawn at z ~ -62 (on street)
        { 
            id: 'igloo-1', 
            name: 'IGLOO 1', 
            emoji: '🏠', 
            description: 'Enter Igloo',
            targetRoom: 'igloo1',
            position: { x: -75, z: -70 },  // Door position (south of igloo)
            doorRadius: 3,
            exitSpawnPos: { x: -75, z: -62 }  // Spawn on street when exiting
        },
        { 
            id: 'igloo-2', 
            name: 'IGLOO 2', 
            emoji: '🏠', 
            description: 'Enter Igloo',
            targetRoom: 'igloo2',
            position: { x: -50, z: -73 },
            doorRadius: 3,
            exitSpawnPos: { x: -50, z: -62 }
        },
        { 
            id: 'igloo-3', 
            name: 'IGLOO 3', 
            emoji: '🏠', 
            description: 'Enter Igloo',
            targetRoom: 'igloo3',
            position: { x: -25, z: -70 },
            doorRadius: 3,
            exitSpawnPos: { x: -25, z: -62 }
        },
        { 
            id: 'igloo-4', 
            name: 'IGLOO 4', 
            emoji: '🏠', 
            description: 'Enter Igloo',
            targetRoom: 'igloo4',
            position: { x: 25, z: -70 },
            doorRadius: 3,
            exitSpawnPos: { x: 25, z: -62 }
        },
        { 
            id: 'igloo-5', 
            name: 'IGLOO 5', 
            emoji: '🏠', 
            description: 'Enter Igloo',
            targetRoom: 'igloo5',
            position: { x: 50, z: -73 },
            doorRadius: 3,
            exitSpawnPos: { x: 50, z: -62 }
        },
        { 
            id: 'igloo-6', 
            name: 'IGLOO 6', 
            emoji: '🏠', 
            description: 'Enter Igloo',
            targetRoom: 'igloo6',
            position: { x: 75, z: -70 },
            doorRadius: 3,
            exitSpawnPos: { x: 75, z: -62 }
        },
        // SOUTH ROW IGLOOS (south of T-bar, rotation: π, door faces NORTH toward street)
        // Igloos at z ~ -15, doors at z ~ -20, exit spawn at z ~ -28 (on street)
        { 
            id: 'igloo-7', 
            name: 'IGLOO 7', 
            emoji: '🏠', 
            description: 'Enter Igloo',
            targetRoom: 'igloo7',
            position: { x: -70, z: -20 },  // Door is NORTH of igloo (faces street)
            doorRadius: 3,
            exitSpawnPos: { x: -70, z: -28 }
        },
        { 
            id: 'igloo-8', 
            name: 'IGLOO 8', 
            emoji: '🏠', 
            description: 'Enter Igloo',
            targetRoom: 'igloo8',
            position: { x: -40, z: -23 },
            doorRadius: 3,
            exitSpawnPos: { x: -40, z: -28 }
        },
        { 
            id: 'igloo-9', 
            name: 'IGLOO 9', 
            emoji: '🏠', 
            description: 'Enter Igloo',
            targetRoom: 'igloo9',
            position: { x: 40, z: -23 },
            doorRadius: 3,
            exitSpawnPos: { x: 40, z: -28 }
        },
        { 
            id: 'igloo-10', 
            name: 'IGLOO 10', 
            emoji: '🏠', 
            description: 'Enter Igloo',
            targetRoom: 'igloo10',
            position: { x: 70, z: -20 },
            doorRadius: 3,
            exitSpawnPos: { x: 70, z: -28 }
        },
        { 
            id: 'puffle_shop', 
            name: 'PUFFLE SHOP', 
            emoji: '🐾', 
            description: 'Adopt puffles & buy supplies',
            targetRoom: null,
            action: 'puffle_shop', // Opens Puffle Shop modal instead of room transition
            // Puffle Shop at (45, 35), door faces west
            position: { x: 38, z: 35 },
            doorRadius: 3
        },
        { 
            id: 'pizza', 
            name: 'PIZZA PARLOR', 
            emoji: '🍕', 
            description: 'Enter Pizza Parlor',
            targetRoom: 'pizza',
            // Pizza at (-45, 35), door faces east
            position: { x: -38, z: 35 },
            doorRadius: 3
        },
        { 
            id: 'nightclub-entrance', 
            name: 'NIGHTCLUB', 
            emoji: '🎵', 
            description: 'Enter the Nightclub',
            targetRoom: 'nightclub',
            // Nightclub at (0, -75), door faces south
            position: { x: 0, z: -60 },
            doorRadius: 4,
            exitSpawnPos: { x: 0, z: -55 }
        },
        {
            id: 'nightclub-ladder',
            name: 'ROOF LADDER',
            emoji: '🪜',
            description: 'Climb to Roof (Press E)',
            // Ladder is on back of nightclub (north side)
            position: { x: 6, z: -88 },
            doorRadius: 6,
            teleportToRoof: true
        }
    ],
    pizza: [
        { 
            id: 'pizza-exit', 
            name: 'EXIT', 
            emoji: '🚪', 
            description: 'Return to Town',
            targetRoom: 'town',
            position: { x: 0, z: 14 },
            doorRadius: 3,
            exitSpawnPos: { x: -30, z: 35 }
        }
    ],
    nightclub: [
        { 
            id: 'nightclub-exit', 
            name: 'EXIT', 
            emoji: '🚪', 
            description: 'Return to Town',
            targetRoom: 'town',
            position: { x: 2, z: 30 },
            doorRadius: 4,
            exitSpawnPos: { x: 0, z: -55 }
        }
    ],
    igloo1: [{ id: 'igloo1-exit', name: 'EXIT', emoji: '🚪', description: 'Return to Town', targetRoom: 'town', position: { x: 0, z: 13.5 }, doorRadius: 3, exitSpawnPos: { x: -75, z: -62 } }],
    igloo2: [{ id: 'igloo2-exit', name: 'EXIT', emoji: '🚪', description: 'Return to Town', targetRoom: 'town', position: { x: 0, z: 13.5 }, doorRadius: 3, exitSpawnPos: { x: -50, z: -62 } }],
    igloo3: [{ id: 'igloo3-exit', name: 'EXIT', emoji: '🚪', description: 'Return to Town', targetRoom: 'town', position: { x: 0, z: 13.5 }, doorRadius: 3, exitSpawnPos: { x: -25, z: -62 } }],
    igloo4: [{ id: 'igloo4-exit', name: 'EXIT', emoji: '🚪', description: 'Return to Town', targetRoom: 'town', position: { x: 0, z: 13.5 }, doorRadius: 3, exitSpawnPos: { x: 25, z: -62 } }],
    igloo5: [{ id: 'igloo5-exit', name: 'EXIT', emoji: '🚪', description: 'Return to Town', targetRoom: 'town', position: { x: 0, z: 13.5 }, doorRadius: 3, exitSpawnPos: { x: 50, z: -62 } }],
    igloo6: [{ id: 'igloo6-exit', name: 'EXIT', emoji: '🚪', description: 'Return to Town', targetRoom: 'town', position: { x: 0, z: 13.5 }, doorRadius: 3, exitSpawnPos: { x: 75, z: -62 } }],
    igloo7: [{ id: 'igloo7-exit', name: 'EXIT', emoji: '🚪', description: 'Return to Town', targetRoom: 'town', position: { x: 0, z: 13.5 }, doorRadius: 3, exitSpawnPos: { x: -70, z: -28 } }],
    igloo8: [{ id: 'igloo8-exit', name: 'EXIT', emoji: '🚪', description: 'Return to Town', targetRoom: 'town', position: { x: 0, z: 13.5 }, doorRadius: 3, exitSpawnPos: { x: -40, z: -28 } }],
    igloo9: [{ id: 'igloo9-exit', name: 'EXIT', emoji: '🚪', description: 'Return to Town', targetRoom: 'town', position: { x: 0, z: 13.5 }, doorRadius: 3, exitSpawnPos: { x: 40, z: -28 } }],
    igloo10: [{ id: 'igloo10-exit', name: 'EXIT', emoji: '🚪', description: 'Return to Town', targetRoom: 'town', position: { x: 0, z: 13.5 }, doorRadius: 3, exitSpawnPos: { x: 70, z: -28 } }],
    dojo: [
        { 
            id: 'dojo-exit', 
            name: 'EXIT', 
            emoji: '🚪', 
            description: 'Return to Town',
            targetRoom: 'town',
            position: { x: 0, z: 16 },
            doorRadius: 3,
            exitSpawnPos: { x: 0, z: 58 }
        },
        { 
            id: 'sensei', 
            name: 'SENSEI', 
            emoji: '🥋', 
            description: 'Challenge me to Card Jitsu!',
            minigame: 'card-jitsu',
            position: { x: 0, z: -10 },
            doorRadius: 3.5
        }
    ],
    casino_game_room: [
        { 
            id: 'casino-game-room-exit', 
            name: 'EXIT', 
            emoji: '🎰', 
            description: 'Return to Casino',
            targetRoom: 'town',
            // Exit door at center-x (40), near back wall (87+2)
            position: { x: 40, z: 89 },
            doorRadius: 3,
            // Spawn at the centered game room portal inside casino
            exitSpawnPos: { x: -42, z: 6 }
        }
    ]
};

// ==================== IGLOO BANNER STYLES ====================
// MapleStory-style Igloo Banner Styles
export const IGLOO_BANNER_STYLES = [
    { // Pink/Rose - Oberon style
        bgGradient: ['#FFE4EC', '#FFB6C1', '#FF69B4'],
        borderColor: '#FF1493',
        accentColor: '#FF69B4',
        textColor: '#8B0A50',
        decorColor: '#FF69B4',
        titleBg: '#FFB6C1'
    },
    { // Cyan/Teal - Titania style  
        bgGradient: ['#E0FFFF', '#AFEEEE', '#40E0D0'],
        borderColor: '#00CED1',
        accentColor: '#20B2AA',
        textColor: '#006666',
        decorColor: '#00CED1',
        titleBg: '#AFEEEE'
    },
    { // SKNY GANG Nightclub - Dark with neon pink/cyan
        bgGradient: ['#1a0a2e', '#0d0d1a', '#0a0015'],
        borderColor: '#ff00ff',
        accentColor: '#00ffff',
        textColor: '#ffffff',
        decorColor: '#ff00ff',
        titleBg: '#1a0a2e'
    },
    { // Purple/Violet
        bgGradient: ['#F8F0FF', '#DDA0DD', '#DA70D6'],
        borderColor: '#9400D3',
        accentColor: '#BA55D3',
        textColor: '#4B0082',
        decorColor: '#9400D3',
        titleBg: '#DDA0DD'
    },
    { // Orange/Peach
        bgGradient: ['#FFF8DC', '#FFDAB9', '#FFA500'],
        borderColor: '#FF8C00',
        accentColor: '#FF7F50',
        textColor: '#8B4513',
        decorColor: '#FF8C00',
        titleBg: '#FFDAB9'
    },
    { // Blue/Sky
        bgGradient: ['#F0F8FF', '#B0E0E6', '#87CEEB'],
        borderColor: '#4169E1',
        accentColor: '#6495ED',
        textColor: '#00008B',
        decorColor: '#4169E1',
        titleBg: '#B0E0E6'
    },
    { // Gold/Yellow
        bgGradient: ['#FFFACD', '#FFE4B5', '#FFD700'],
        borderColor: '#DAA520',
        accentColor: '#FFC125',
        textColor: '#8B6914',
        decorColor: '#DAA520',
        titleBg: '#FFE4B5'
    },
    { // Pink/Magenta - REGEN style
        bgGradient: ['#FFE4EC', '#FFB6C1', '#FF69B4'],
        borderColor: '#FF1493',
        accentColor: '#FF69B4',
        textColor: '#8B0A50',
        decorColor: '#FF1493',
        titleBg: '#FFB6C1'
    }
];

// Placeholder content for igloo banners
export const IGLOO_BANNER_CONTENT = [
    { title: "🌙 Moon Crew HQ", ticker: "$MOON", shill: "Private Alpha • DM for invite" },
    { title: "🔥 Degen's Den", ticker: "$DEGEN", shill: "100x gems daily • VIP access" },
    { title: "🎧 SKNY GANG", ticker: "$CP", shill: "VIP Access • The Rave Never Stops • Rent igloos for 100k $CP/day" },
    { title: "💎 Diamond Flippers", ticker: "$FLIP", shill: "We don't sell • Join the cult" },
    { title: "🚀 Launch Pad", ticker: "$PAD", shill: "Early access • Presale alerts" },
    { title: "🎰 Whale Watchers", ticker: "$WHALE", shill: "Track big wallets • Free signals" },
    { title: "⚡ Speed Runners", ticker: "$SPEED", shill: "Snipe bots • Fast entry" },
    { title: "REGEN", ticker: "", shill: "A group of like-minded individuals", owner: "jj" },
    { title: "🎮 Gamer Guild", ticker: "$GG", shill: "P2E alpha • Gaming NFTs" },
    { title: "🌈 Rainbow Room", ticker: "$RGB", shill: "All welcome • Good energy only" }
];
