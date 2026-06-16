/**
 * World NPC definitions — client-side layout & dialogue.
 * Merchant logic links to config/merchants.js; positions are offsets from town center (C).
 */

import { getMerchant } from './merchants';

/** @typedef {'fish_buyer' | 'supply_merchant' | 'forest_ranger'} NpcMerchantId */

/** Cabin center — forest local coords. Ranger stands on porch (+Z). */
export const FOREST_CABIN_LOCAL = { x: 125, z: 52 };

/**
 * @typedef {Object} WorldNpcAction
 * @property {string} id
 * @property {string} label
 * @property {string} [icon]
 * @property {boolean} [disabled]
 * @property {boolean} [requiresFish]
 * @property {boolean} [requiresWood]
 * @property {boolean} [requiresUpgrade]
 * @property {string} [loreText]
 */

/**
 * @typedef {Object} WorldNpcDef
 * @property {string} id
 * @property {string} merchantId
 * @property {'town' | 'snow_forts' | 'forest_trails'} [room]
 * @property {number} offsetX - relative to room center
 * @property {number} offsetZ - relative to room center
 * @property {number} [rotation]
 * @property {'fishing_shack' | 'supply_stall' | 'ranger_post'} standType
 * @property {Object} appearance - penguin appearance for buildPenguinMesh
 * @property {string[]} greetings
 * @property {WorldNpcAction[]} actions
 * @property {number} interactionRadius
 */

export const WORLD_NPCS = [
    {
        id: 'old_salty',
        merchantId: 'fish_buyer',
        room: 'snow_forts',
        offsetX: -92,
        offsetZ: -92,
        rotation: Math.PI * 0.35,
        standType: 'fishing_shack',
        appearance: {
            skin: 'grey',
            hat: 'none',
            eyes: 'shades',
            mouth: 'pipe',
            bodyItem: 'lifevest',
            mount: 'none',
            npcCosmetics: { fisherHat: true, fishingRod: true }
        },
        greetings: [
            "Ahh, smell that salt air! Got fish to sell, or just browsin'?",
            "Every catch has a price — I'll make ya a fair one.",
            "The pond's cold but the coin's warm. What'll it be?"
        ],
        actions: [
            { id: 'open_backpack', label: 'Sell my catch', icon: '🐟', requiresFish: true },
            { id: 'lore_fishing', label: 'Tips for fishing', icon: '🎣', loreText: 'Ice holes are scattered all over Snow Forts — find one, drop a line, and reel \'em in. Stash catches in your backpack, then sell \'em here for gold. Bigger fish lurk deeper — but don\'t snap your line!' },
            { id: 'close', label: 'See you later, Salty', icon: '👋' }
        ],
        interactionRadius: 5.5
    },
    {
        id: 'copper_clive',
        merchantId: 'supply_merchant',
        room: 'town',
        offsetX: 39.5,
        offsetZ: 50.2,
        rotation: -Math.PI / 2,
        standType: 'supply_stall',
        appearance: {
            skin: 'brown',
            hat: 'beanieOrange',
            eyes: 'bored',
            mouth: 'beard',
            bodyItem: 'apron',
            mount: 'none',
            npcCosmetics: { handPickaxe: true }
        },
        greetings: [
            "Welcome to Clive's Supply! Backpack feelin' cramped?",
            "Tools, packs, and timber buys — everything a gatherer needs.",
            "Grab an axe and hit the Forest Trails south of Snow Forts!"
        ],
        actions: [
            { id: 'upgrade_backpack', label: 'Upgrade backpack', icon: '🎒', requiresUpgrade: true },
            { id: 'buy_basic_axe', label: 'Buy Basic Axe', icon: '🪓', requiresBuyTool: true, itemId: 'basic_axe' },
            { id: 'buy_iron_axe', label: 'Buy Iron Axe', icon: '⛏️', requiresBuyTool: true, itemId: 'iron_axe' },
            { id: 'buy_steel_axe', label: 'Buy Steel Axe', icon: '🪓', requiresBuyTool: true, itemId: 'steel_axe' },
            { id: 'buy_master_axe', label: 'Buy Master Axe', icon: '👑', requiresBuyTool: true, itemId: 'master_axe' },
            { id: 'open_backpack', label: 'Sell timber / organize', icon: '🪵' },
            { id: 'lore_tools', label: 'Forest trails', icon: '🌲', loreText: 'Head south through Snow Forts into the Forest Trails. Stand near a tall pine with your axe equipped and chop! Bring logs back here for full price — or sell to Ranger Pike at Whiskerwood Cabin for quick coin on the trail.' },
            { id: 'close', label: 'Thanks, Clive', icon: '👋' }
        ],
        interactionRadius: 5.5
    },
    {
        id: 'ranger_pike',
        merchantId: 'forest_ranger',
        room: 'forest_trails',
        // Porch in front of cabin (FOREST_CABIN_LOCAL z + 6.2)
        offsetX: FOREST_CABIN_LOCAL.x - 110,
        offsetZ: FOREST_CABIN_LOCAL.z + 6.2 - 110,
        rotation: 0,
        standType: 'ranger_post',
        appearance: {
            skin: 'green',
            hat: 'none',
            eyes: 'happy',
            mouth: 'beak',
            bodyItem: 'lifevest',
            mount: 'none',
            npcCosmetics: { rangerHat: true, handAxe: true }
        },
        greetings: [
            "Welcome to Whiskerwood. Got timber for the ledger?",
            "Trail rates today — not as rich as town, but your pack gets lighter.",
            "Patrol's quiet. Chop, sell, craft — that's how rangers earn their stripes."
        ],
        actions: [
            { id: 'open_backpack', label: 'Sell timber & mushrooms', icon: '🪵' },
            { id: 'quest_mushroom_ticket', label: 'Trade mushrooms for ferry ticket', icon: '🎫', requiresMushrooms: true },
            { id: 'lore_quests', label: 'Forest quests & XP', icon: '📜', loreText: 'Gather forest mushrooms from trail clusters (they grow back slowly). Bring 5 to me for a ferry ticket to Town — then challenge Sensei in the Dojo for your first gold!' },
            { id: 'lore_crafting', label: 'Crafting orders', icon: '🪚', loreText: 'The workshop wing is still being stocked. Soon you\'ll turn pine and oak into planks, furniture, and camp gear — higher value than raw logs. Save rare ironwood for those recipes.' },
            { id: 'lore_town_prices', label: 'Better prices in town?', icon: '🏘️', loreText: 'Copper Clive in town pays full catalog gold for timber. I buy at 65% — convenience tax for not hiking back. Every sale still earns woodcutting XP either way.' },
            { id: 'close', label: 'Stay safe on the trails', icon: '👋' }
        ],
        interactionRadius: 5.5
    }
];

export function getWorldNpc(npcId) {
    return WORLD_NPCS.find(n => n.id === npcId) || null;
}

export function getWorldNpcByMerchant(merchantId) {
    return WORLD_NPCS.find(n => n.merchantId === merchantId) || null;
}

export function getNpcDisplayName(npcDef) {
    const merchant = getMerchant(npcDef?.merchantId);
    return merchant?.name || npcDef?.id || 'NPC';
}

export function getNpcTitle(npcDef) {
    const merchant = getMerchant(npcDef?.merchantId);
    return merchant?.title || 'Merchant';
}

export default WORLD_NPCS;
