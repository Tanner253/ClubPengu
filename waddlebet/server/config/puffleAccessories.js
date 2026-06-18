/**
 * Puffle accessory catalog — server-authoritative prices.
 * Keep in sync with src/engine/Puffle.js ACCESSORIES.
 */

import { PUFFLE_FOOD, PUFFLE_TOYS } from '../db/models/Puffle.js';

const CATEGORY_ALIASES = {
    hat: 'hats',
    hats: 'hats',
    glasses: 'glasses',
    neckwear: 'neckwear',
};

export const PUFFLE_ACCESSORIES = {
    hats: {
        none: { name: 'None', price: 0 },
        propeller: { name: 'Propeller Hat', price: 50 },
        bow: { name: 'Bow', price: 30 },
        tophat: { name: 'Top Hat', price: 75 },
        crown: { name: 'Crown', price: 200 },
        pirate: { name: 'Pirate Hat', price: 100 },
        viking: { name: 'Viking Helmet', price: 150 },
        party: { name: 'Party Hat', price: 25 },
    },
    glasses: {
        none: { name: 'None', price: 0 },
        sunglasses: { name: 'Sunglasses', price: 40 },
        nerd: { name: 'Nerd Glasses', price: 35 },
        star: { name: 'Star Glasses', price: 60 },
        heart: { name: 'Heart Glasses', price: 55 },
    },
    neckwear: {
        none: { name: 'None', price: 0 },
        bowtie: { name: 'Bow Tie', price: 30 },
        bandana: { name: 'Bandana', price: 25 },
        scarf: { name: 'Scarf', price: 45 },
        collar: { name: 'Collar', price: 20 },
    },
};

export function normalizeAccessoryCategory(category) {
    return CATEGORY_ALIASES[category] || category;
}

export function getPuffleAccessoryEntry(category, itemId) {
    const key = normalizeAccessoryCategory(category);
    return PUFFLE_ACCESSORIES[key]?.[itemId] ?? null;
}

export function getPuffleAccessoryPrice(category, itemId) {
    const entry = getPuffleAccessoryEntry(category, itemId);
    if (!entry) return null;
    return entry.price;
}

export function getPuffleShopItems() {
    return {
        food: PUFFLE_FOOD,
        toys: PUFFLE_TOYS,
        accessories: PUFFLE_ACCESSORIES,
    };
}

export default PUFFLE_ACCESSORIES;
