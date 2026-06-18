/**
 * Merchant NPCs — generic buy/sell endpoints for gameplay items.
 */

import { ECONOMY } from './economy.js';
import { BAIT_GOLD_BUNDLE, GOLD_MINT_RECIPES } from './goldEconomy.js';

export const MERCHANTS = {
    fish_buyer: {
        id: 'fish_buyer',
        name: 'Old Salty',
        title: 'Fish Buyer',
        emoji: '🧓',
        greeting: "I'll buy your catch at emergency rates — or sell you worm bait in bulk. Flip mossy logs in the forest for free worms!",
        acceptsCategories: ['fish'],
        /** Multiplier on NPC_EMERGENCY_SELL_RATIO (1.0 = full emergency rate). */
        npcSellRatio: 1.0,
        sellTransactionType: 'fish_sell_npc',
        buyTransactionType: 'merchant_buy',
        sells: [
            {
                itemId: BAIT_GOLD_BUNDLE.itemId,
                quantity: BAIT_GOLD_BUNDLE.quantity,
                cost: BAIT_GOLD_BUNDLE.goldCost,
                label: `Worm bait (×${BAIT_GOLD_BUNDLE.quantity})`,
            },
        ],
    },
    forest_ranger: {
        id: 'forest_ranger',
        name: 'Ranger Pike',
        title: 'Whiskerwood Ranger',
        emoji: '🌲',
        greeting: "Need a starter axe? One gold gets you chopping — I also buy timber at trail rates.",
        acceptsCategories: ['wood', 'forage'],
        npcSellRatio: 0.65,
        sellTransactionType: 'wood_sell_ranger',
        buyTransactionType: 'merchant_buy',
        sells: [
            {
                itemId: 'basic_axe',
                cost: 1,
                label: 'Basic Axe'
            }
        ]
    },
    supply_merchant: {
        id: 'supply_merchant',
        name: 'Copper Clive',
        title: 'Supply & Gear',
        emoji: '🔧',
        greeting: "Backpack tight? I expand packs with timber — sell logs for gold, or grab a starter axe for just 1g.",
        acceptsCategories: ['wood', 'tool', 'rod'],
        npcSellRatio: 1.0,
        sellTransactionType: 'wood_sell_npc',
        buyTransactionType: 'merchant_buy',
        sells: [
            ...GOLD_MINT_RECIPES.filter((r) => r.itemId.startsWith('gold_mint_wood')).map((r) => ({
                itemId: r.itemId,
                goldMintOutput: r.goldOutput,
                materialCost: r.materialCost,
                label: r.label,
            })),
            {
                itemId: 'basic_axe',
                cost: 1,
                label: 'Basic Axe'
            },
            {
                itemId: 'iron_axe',
                cost: 0,
                woodRequired: ECONOMY.TOOLS.iron_axe.woodRequired,
                label: 'Iron Axe'
            },
            {
                itemId: 'steel_axe',
                cost: 0,
                woodRequired: ECONOMY.TOOLS.steel_axe.woodRequired,
                label: 'Steel Axe'
            },
            {
                itemId: 'master_axe',
                cost: 0,
                woodRequired: ECONOMY.TOOLS.master_axe.woodRequired,
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
