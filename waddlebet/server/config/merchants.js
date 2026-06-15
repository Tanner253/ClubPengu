/**
 * Merchant NPCs — generic buy/sell endpoints for gameplay items.
 * Fish buyer today; ore buyer, herb vendor, etc. later.
 */

export const MERCHANTS = {
    fish_buyer: {
        id: 'fish_buyer',
        name: 'Old Salty',
        title: 'Fish Buyer',
        emoji: '🧓',
        greeting: "I'll buy your catch — fair prices, no questions.",
        acceptsCategories: ['fish'],
        sellTransactionType: 'fish_sell_npc'
    },
    supply_merchant: {
        id: 'supply_merchant',
        name: 'Copper Clive',
        title: 'Supply & Gear',
        emoji: '🔧',
        greeting: "Backpack tight? I expand packs and stock tools for gatherers.",
        acceptsCategories: [],
        sellTransactionType: null
    }
};

export function getMerchant(merchantId) {
    return MERCHANTS[merchantId] || null;
}

export function merchantAcceptsCategory(merchantId, category) {
    const m = getMerchant(merchantId);
    return m?.acceptsCategories?.includes(category) ?? false;
}

export default MERCHANTS;
