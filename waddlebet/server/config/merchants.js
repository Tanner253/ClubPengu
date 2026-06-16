/**
 * Merchant NPCs — generic buy/sell endpoints for gameplay items.
 */

import { ECONOMY } from './economy.js';

export const MERCHANTS = {
    fish_buyer: {
        id: 'fish_buyer',
        name: 'Old Salty',
        title: 'Fish Buyer',
        emoji: '🧓',
        greeting: "I'll buy your catch — fair prices, no questions.",
        acceptsCategories: ['fish'],
        npcSellRatio: 1.0,
        sellTransactionType: 'fish_sell_npc',
        buyTransactionType: 'rod_upgrade',
        sells: []
    },
    forest_ranger: {
        id: 'forest_ranger',
        name: 'Ranger Pike',
        title: 'Whiskerwood Ranger',
        emoji: '🌲',
        greeting: "Logs for the cabin ledger? I pay trail rates — Clive in town pays more if you've got the hike in you.",
        acceptsCategories: ['wood', 'forage'],
        /** Emergency trail sell — lower than Copper Clive (1.0). */
        npcSellRatio: 0.65,
        sellTransactionType: 'wood_sell_ranger',
        sells: []
    },
    supply_merchant: {
        id: 'supply_merchant',
        name: 'Copper Clive',
        title: 'Supply & Gear',
        emoji: '🔧',
        greeting: "Backpack tight? I expand packs and stock tools for gatherers.",
        acceptsCategories: ['wood'],
        npcSellRatio: 1.0,
        sellTransactionType: 'wood_sell_npc',
        buyTransactionType: 'merchant_buy',
        sells: [
            {
                itemId: 'basic_axe',
                cost: ECONOMY.TOOLS.basic_axe.cost,
                label: 'Basic Axe'
            },
            {
                itemId: 'iron_axe',
                cost: ECONOMY.TOOLS.iron_axe.cost,
                label: 'Iron Axe'
            },
            {
                itemId: 'steel_axe',
                cost: ECONOMY.TOOLS.steel_axe.cost,
                label: 'Steel Axe'
            },
            {
                itemId: 'master_axe',
                cost: ECONOMY.TOOLS.master_axe.cost,
                label: 'Master Axe'
            }
        ]
    }
};

export function getMerchant(merchantId) {
    return MERCHANTS[merchantId] || null;
}

export function merchantAcceptsCategory(merchantId, category) {
    const m = getMerchant(merchantId);
    return m?.acceptsCategories?.includes(category) ?? false;
}

export function getMerchantListing(merchantId, itemId) {
    const m = getMerchant(merchantId);
    return m?.sells?.find(s => s.itemId === itemId) ?? null;
}

export default MERCHANTS;
