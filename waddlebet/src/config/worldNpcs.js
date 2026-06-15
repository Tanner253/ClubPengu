/**
 * World NPC definitions — client-side layout & dialogue.
 * Merchant logic links to config/merchants.js; positions are offsets from town center (C).
 */

import { getMerchant } from './merchants';

/** @typedef {'fish_buyer' | 'supply_merchant'} NpcMerchantId */

/**
 * @typedef {Object} WorldNpcAction
 * @property {string} id
 * @property {string} label
 * @property {string} [icon]
 * @property {boolean} [disabled]
 * @property {boolean} [requiresFish]
 * @property {boolean} [requiresUpgrade]
 * @property {string} [loreText]
 */

/**
 * @typedef {Object} WorldNpcDef
 * @property {string} id
 * @property {string} merchantId
 * @property {number} offsetX - relative to CENTER_X
 * @property {number} offsetZ - relative to CENTER_Z
 * @property {number} [rotation] - Y rotation for NPC + stand
 * @property {'fishing_shack' | 'supply_stall'} standType
 * @property {Object} appearance - penguin appearance for buildPenguinMesh
 * @property {string[]} greetings
 * @property {WorldNpcAction[]} actions
 * @property {number} interactionRadius
 */

export const WORLD_NPCS = [
    {
        id: 'old_salty',
        merchantId: 'fish_buyer',
        offsetX: -42.7,
        offsetZ: 82.8,
        rotation: Math.PI * 0.85,
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
            { id: 'lore_fishing', label: 'Tips for fishing', icon: '🎣', loreText: 'Drop a line in the ice holes southwest of town. Reel \'em in, stash \'em in your backpack, then sell \'em here for gold. Bigger fish deeper down — but don\'t snap your line!' },
            { id: 'close', label: 'See you later, Salty', icon: '👋' }
        ],
        interactionRadius: 5.5
    },
    {
        id: 'copper_clive',
        merchantId: 'supply_merchant',
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
            "Tools, packs, and trinkets for the ambitious gatherer.",
            "I hear pickaxes and axes are comin' soon — stock up on space now!"
        ],
        actions: [
            { id: 'upgrade_backpack', label: 'Upgrade backpack', icon: '🎒', requiresUpgrade: true },
            { id: 'open_backpack', label: 'Organize backpack', icon: '📦' },
            { id: 'lore_tools', label: 'Future tools', icon: '⛏️', loreText: 'Ore, timber, and herbs are on the way. I\'ll sell pickaxes, axes, and proper packs when the trails open. For now — expand that backpack!' },
            { id: 'close', label: 'Thanks, Clive', icon: '👋' }
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
