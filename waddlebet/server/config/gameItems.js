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

export function getGameItem(itemId) {
    return ITEM_CATALOG.get(itemId) || null;
}

export function isFishItem(itemId) {
    const item = getGameItem(itemId);
    return item?.category === 'fish';
}

export function isJellyfishId(fishId) {
    return JELLYFISH_IDS.has(fishId) || (fishId && fishId.includes('jelly'));
}

export function isInventoryCatch(fishData) {
    const id = fishData?.id;
    if (!id || isJellyfishId(id)) return false;
    const item = getGameItem(id);
    if (item?.category === 'fish') return true;
    // Minigame fish with sell value but missing from catalog — still storable
    if (typeof fishData?.coins === 'number' && fishData.coins >= 0) return true;
    // Any other identified catch from the minigame (wallet users always backpack)
    return true;
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
    if (!item || item.category !== 'fish') return 0;
    return Math.floor(item.npcValue * ECONOMY.FISHING.NPC_SELL_RATIO * quantity);
}

export function getAllFishItems() {
    return [...ITEM_CATALOG.values()].filter(i => i.category === 'fish');
}

export { ITEM_CATALOG, JELLYFISH_IDS, FISH_SPECIES };
export default ITEM_CATALOG;
