/**
 * Gameplay item catalog — fish, bait, rods (server-authoritative).
 * npcValue mirrors IceFishingGame.jsx `coins` field (sell price at Fish Buyer NPC).
 */

import { ECONOMY } from './economy.js';

/** @typedef {{ id: string, name: string, emoji: string, category: string, npcValue: number, maxStack: number, tier?: number }} GameItem */

const MAX_STACK = ECONOMY.GAME_INVENTORY.MAX_STACK;

/** Fish species — synced with waddlebet/src/games/IceFishingGame.jsx tiers */
const FISH_SPECIES = [
    { id: 'minnow', name: 'Minnow', emoji: '🐟', npcValue: 3, tier: 1 },
    { id: 'sardine', name: 'Sardine', emoji: '🐟', npcValue: 4, tier: 1 },
    { id: 'anchovy', name: 'Anchovy', emoji: '🐟', npcValue: 3, tier: 1 },
    { id: 'guppy', name: 'Guppy', emoji: '🐠', npcValue: 5, tier: 1 },
    { id: 'neon_tetra', name: 'Neon Tetra', emoji: '🐠', npcValue: 6, tier: 1 },
    { id: 'clownfish', name: 'Clownfish', emoji: '🐠', npcValue: 10, tier: 2 },
    { id: 'blue_tang', name: 'Blue Tang', emoji: '🐠', npcValue: 12, tier: 2 },
    { id: 'butterfly_fish', name: 'Butterfly Fish', emoji: '🐠', npcValue: 15, tier: 2 },
    { id: 'angelfish', name: 'Angelfish', emoji: '🐠', npcValue: 14, tier: 2 },
    { id: 'parrotfish', name: 'Parrot Fish', emoji: '🐠', npcValue: 20, tier: 3 },
    { id: 'sea_turtle', name: 'Sea Turtle', emoji: '🐢', npcValue: 30, tier: 3 },
    { id: 'reef_squid', name: 'Reef Squid', emoji: '🦑', npcValue: 22, tier: 3 },
    { id: 'lionfish', name: 'Lionfish', emoji: '🐡', npcValue: 35, tier: 3 },
    { id: 'reef_shark', name: 'Reef Shark', emoji: '🦈', npcValue: 40, tier: 4 },
    { id: 'blue_marlin', name: 'Blue Marlin', emoji: '🐟', npcValue: 45, tier: 4 },
    { id: 'swordfish', name: 'Swordfish', emoji: '🐟', npcValue: 50, tier: 4 },
    { id: 'manta_ray', name: 'Manta Ray', emoji: '🦈', npcValue: 55, tier: 4 },
    { id: 'hammerhead', name: 'Hammerhead', emoji: '🦈', npcValue: 65, tier: 5 },
    { id: 'barracuda', name: 'Barracuda', emoji: '🐟', npcValue: 60, tier: 5 },
    { id: 'moray_eel', name: 'Moray Eel', emoji: '🐍', npcValue: 70, tier: 5 },
    { id: 'giant_crab', name: 'Giant Crab', emoji: '🦀', npcValue: 75, tier: 5 },
    { id: 'giant_squid', name: 'Giant Squid', emoji: '🦑', npcValue: 100, tier: 6 },
    { id: 'lantern_fish', name: 'Lantern Fish', emoji: '🔦', npcValue: 85, tier: 6 },
    { id: 'vampire_squid', name: 'Vampire Squid', emoji: '🦑', npcValue: 110, tier: 6 },
    { id: 'hatchetfish', name: 'Hatchetfish', emoji: '🐟', npcValue: 90, tier: 6 },
    { id: 'goblin_shark', name: 'Goblin Shark', emoji: '🦈', npcValue: 150, tier: 7 },
    { id: 'oarfish', name: 'Oarfish', emoji: '🐟', npcValue: 160, tier: 7 },
    { id: 'anglerfish', name: 'Anglerfish', emoji: '🐡', npcValue: 175, tier: 7 },
    { id: 'fangtooth', name: 'Fangtooth', emoji: '🐟', npcValue: 140, tier: 7 },
    { id: 'gulper_eel', name: 'Gulper Eel', emoji: '🐍', npcValue: 220, tier: 8 },
    { id: 'ghost_shark', name: 'Ghost Shark', emoji: '🦈', npcValue: 250, tier: 8 },
    { id: 'viperfish', name: 'Viperfish', emoji: '🐟', npcValue: 200, tier: 8 },
    { id: 'colossal_squid', name: 'Colossal Squid', emoji: '🦑', npcValue: 280, tier: 8 },
    { id: 'dragonfish', name: 'Dragonfish', emoji: '🐉', npcValue: 350, tier: 9 },
    { id: 'giant_isopod', name: 'Giant Isopod', emoji: '🦞', npcValue: 320, tier: 9 },
    { id: 'frilled_shark', name: 'Frilled Shark', emoji: '🦈', npcValue: 450, tier: 9 },
    { id: 'black_seadevil', name: 'Black Seadevil', emoji: '🐡', npcValue: 400, tier: 9 },
    { id: 'megalodon', name: 'Megalodon', emoji: '🦈', npcValue: 600, tier: 10 },
    { id: 'kraken', name: 'Kraken', emoji: '🦑', npcValue: 800, tier: 10 },
    { id: 'leviathan', name: 'Leviathan', emoji: '🐋', npcValue: 1000, tier: 10 },
    { id: 'sea_serpent', name: 'Sea Serpent', emoji: '🐉', npcValue: 900, tier: 10 }
];

const JELLYFISH_IDS = new Set([
    'tiny_jelly', 'blue_jelly', 'pink_dot_jelly', 'clear_jelly', 'violet_jelly'
]);

/** @type {Map<string, GameItem>} */
const ITEM_CATALOG = new Map();

for (const fish of FISH_SPECIES) {
    ITEM_CATALOG.set(fish.id, {
        id: fish.id,
        name: fish.name,
        emoji: fish.emoji,
        category: 'fish',
        npcValue: fish.npcValue,
        maxStack: MAX_STACK,
        tier: fish.tier
    });
}

// Gear & consumables (Phase 1 hooks)
ITEM_CATALOG.set('worm', {
    id: 'worm',
    name: 'Worm Bait',
    emoji: '🪱',
    category: 'bait',
    npcValue: 0,
    maxStack: MAX_STACK,
    tier: 1
});

ITEM_CATALOG.set('basic_rod', {
    id: 'basic_rod',
    name: 'Basic Rod',
    emoji: '🎣',
    category: 'rod',
    npcValue: 0,
    maxStack: 1,
    tier: 1
});

ITEM_CATALOG.set('iron_rod', {
    id: 'iron_rod',
    name: 'Iron Rod',
    emoji: '🎣',
    category: 'rod',
    npcValue: 18,
    maxStack: 32,
    tier: 2
});

ITEM_CATALOG.set('pro_rod', {
    id: 'pro_rod',
    name: 'Pro Rod',
    emoji: '🎣',
    category: 'rod',
    npcValue: 45,
    maxStack: 32,
    tier: 3
});

ITEM_CATALOG.set('master_rod', {
    id: 'master_rod',
    name: 'Master Rod',
    emoji: '🎣',
    category: 'rod',
    npcValue: 110,
    maxStack: 32,
    tier: 4
});

ITEM_CATALOG.set('basic_axe', {
    id: 'basic_axe',
    name: 'Basic Axe',
    emoji: '🪓',
    category: 'tool',
    npcValue: 0,
    maxStack: 1,
    tier: 1
});

ITEM_CATALOG.set('iron_axe', {
    id: 'iron_axe',
    name: 'Iron Axe',
    emoji: '⛏️',
    category: 'tool',
    npcValue: 15,
    maxStack: 32,
    tier: 2
});

ITEM_CATALOG.set('steel_axe', {
    id: 'steel_axe',
    name: 'Steel Axe',
    emoji: '🪓',
    category: 'tool',
    npcValue: 40,
    maxStack: 32,
    tier: 3
});

ITEM_CATALOG.set('master_axe', {
    id: 'master_axe',
    name: 'Master Axe',
    emoji: '🪓',
    category: 'tool',
    npcValue: 100,
    maxStack: 32,
    tier: 4
});

const WOOD_TYPES = [
    { id: 'pine_log', name: 'Pine Log', emoji: '🪵', npcValue: 3, tier: 1 },
    { id: 'birch_log', name: 'Birch Log', emoji: '🪵', npcValue: 6, tier: 2 },
    { id: 'oak_log', name: 'Oak Log', emoji: '🪵', npcValue: 10, tier: 3 },
    { id: 'ironwood_log', name: 'Ironwood Log', emoji: '🪵', npcValue: 16, tier: 4 }
];

for (const wood of WOOD_TYPES) {
    ITEM_CATALOG.set(wood.id, {
        id: wood.id,
        name: wood.name,
        emoji: wood.emoji,
        category: 'wood',
        npcValue: wood.npcValue,
        maxStack: MAX_STACK,
        tier: wood.tier
    });
}

ITEM_CATALOG.set('forest_mushroom', {
    id: 'forest_mushroom',
    name: 'Forest Mushroom',
    emoji: '🍄',
    category: 'forage',
    npcValue: 8,
    maxStack: MAX_STACK,
    tier: 1
});

/** Ferry tickets — stack in backpack; consumed when boarding matching route. */
const FERRY_TICKETS = [
    { id: 'ferry_ticket_town_snow', name: 'Ferry Ticket (Snow Forts)', routeId: 'town_snow_forts' },
    { id: 'ferry_ticket_town_forest', name: 'Ferry Ticket (Forest Trails)', routeId: 'town_forest' },
    { id: 'ferry_ticket_snow_town', name: 'Ferry Ticket (Town)', routeId: 'snow_forts_town' },
    { id: 'ferry_ticket_snow_forest', name: 'Ferry Ticket (Forest)', routeId: 'snow_forts_forest' },
    { id: 'ferry_ticket_forest_snow', name: 'Ferry Ticket (Snow Forts)', routeId: 'forest_snow_forts' },
    { id: 'ferry_ticket_forest_town', name: 'Ferry Ticket (Town)', routeId: 'forest_town' },
];

for (const ticket of FERRY_TICKETS) {
    ITEM_CATALOG.set(ticket.id, {
        id: ticket.id,
        name: ticket.name,
        emoji: '🎫',
        category: 'ticket',
        npcValue: 0,
        maxStack: 20,
        routeId: ticket.routeId
    });
}

/** Map route id → inventory item id for ticket consumption. */
export const FERRY_TICKET_BY_ROUTE = Object.fromEntries(
    FERRY_TICKETS.map(t => [t.routeId, t.id])
);

export function getFerryTicketItemForRoute(routeId) {
    return FERRY_TICKET_BY_ROUTE[routeId] || null;
}

export function getGameItem(itemId) {
    return ITEM_CATALOG.get(itemId) || null;
}

export function isFishItem(itemId) {
    const item = getGameItem(itemId);
    return item?.category === 'fish';
}

export function isWoodItem(itemId) {
    const item = getGameItem(itemId);
    return item?.category === 'wood';
}

export function isToolItem(itemId) {
    const item = getGameItem(itemId);
    return item?.category === 'tool';
}

export function isJellyfishId(fishId) {
    return JELLYFISH_IDS.has(fishId) || (fishId && fishId.includes('jelly'));
}

export function isInventoryCatch(fishData) {
    const id = fishData?.id;
    if (!id || isJellyfishId(id)) return false;
    const item = getGameItem(id);
    return item?.category === 'fish';
}

/** All catalog fish in a depth tier (for server loot rolls). */
export function getFishByTier(tier) {
    const results = [];
    for (const item of ITEM_CATALOG.values()) {
        if (item.category === 'fish' && item.tier === tier) {
            results.push(item);
        }
    }
    return results;
}

/** Wood logs at a chop tier (falls back to nearest lower tier). */
export function getWoodByTier(tier) {
    const results = [];
    for (const item of ITEM_CATALOG.values()) {
        if (item.category === 'wood' && item.tier === tier) {
            results.push(item);
        }
    }
    return results;
}

const RARITY_BY_TIER = {
    1: 'common', 2: 'common', 3: 'uncommon', 4: 'uncommon',
    5: 'rare', 6: 'rare', 7: 'epic', 8: 'epic', 9: 'legendary', 10: 'legendary'
};

export function getFishRarityLabel(itemId) {
    const item = getGameItem(itemId);
    if (!item?.tier) return 'common';
    return RARITY_BY_TIER[item.tier] || 'common';
}

export function getFishRarityDisplay(itemId) {
    const label = getFishRarityLabel(itemId);
    return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getNpcSellValue(itemId, quantity = 1) {
    const item = getGameItem(itemId);
    if (!item) return 0;
    if (item.category === 'fish') {
        return Math.floor(item.npcValue * ECONOMY.FISHING.NPC_SELL_RATIO * quantity);
    }
    if (item.category === 'wood') {
        return Math.floor(item.npcValue * ECONOMY.WOODCUTTING.NPC_SELL_RATIO * quantity);
    }
    return 0;
}

export function getAllFishItems() {
    return [...ITEM_CATALOG.values()].filter(i => i.category === 'fish');
}

export { ITEM_CATALOG, JELLYFISH_IDS, FISH_SPECIES, WOOD_TYPES };
export default ITEM_CATALOG;
