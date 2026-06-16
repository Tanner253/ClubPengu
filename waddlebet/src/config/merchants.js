/**
 * Merchant NPCs (client display) — keep in sync with server/config/merchants.js
 */
import { MERCHANT_TOOL_COSTS } from './economy';

export const MERCHANTS = {
    fish_buyer: {
        id: 'fish_buyer',
        name: 'Old Salty',
        title: 'Fish Buyer',
        emoji: '🧓',
        acceptsCategories: ['fish'],
        npcSellRatio: 1.0
    },
    forest_ranger: {
        id: 'forest_ranger',
        name: 'Ranger Pike',
        title: 'Whiskerwood Ranger',
        emoji: '🌲',
        acceptsCategories: ['wood', 'forage'],
        /** Trail-side sell rate (65% of catalog npcValue). Clive pays 100%. */
        npcSellRatio: 0.65
    },
    supply_merchant: {
        id: 'supply_merchant',
        name: 'Copper Clive',
        title: 'Supply & Gear',
        emoji: '🔧',
        acceptsCategories: ['wood'],
        npcSellRatio: 1.0,
        sells: [
            { itemId: 'basic_axe', cost: MERCHANT_TOOL_COSTS.basic_axe, label: 'Basic Axe', emoji: '🪓' },
            { itemId: 'iron_axe', cost: MERCHANT_TOOL_COSTS.iron_axe, label: 'Iron Axe', emoji: '⛏️' },
            { itemId: 'steel_axe', cost: MERCHANT_TOOL_COSTS.steel_axe, label: 'Steel Axe', emoji: '🪓' },
            { itemId: 'master_axe', cost: MERCHANT_TOOL_COSTS.master_axe, label: 'Master Axe', emoji: '🪓' }
        ]
    }
};

export function getMerchant(merchantId) {
    return MERCHANTS[merchantId] || null;
}

export function merchantAcceptsCategory(merchantId, category) {
    const merchant = getMerchant(merchantId);
    return merchant?.acceptsCategories?.includes(category) ?? false;
}

/** Whether this backpack slot can be sold to the given merchant. */
export function merchantAcceptsSlot(slot, merchantId) {
    if (!slot?.itemId || Number(slot.quantity) <= 0) return false;
    if (!merchantAcceptsCategory(merchantId, slot.category)) return false;
    return (slot.npcValue ?? 0) > 0;
}

/** Human-readable list of accepted categories for sell UI. */
export function getMerchantAcceptsLabel(merchantId) {
    const labels = {
        fish: 'fish',
        wood: 'timber',
        forage: 'mushrooms & forage'
    };
    const categories = getMerchant(merchantId)?.acceptsCategories || [];
    return categories.map((c) => labels[c] || c).join(', ');
}

/** Gold per unit at a merchant (floor), using merchant sell ratio when set. */
export function getMerchantUnitSellPrice(baseNpcValue, merchantId) {
    const ratio = getMerchant(merchantId)?.npcSellRatio ?? 1;
    return Math.floor((baseNpcValue || 0) * ratio);
}

/** Total gold for selling qty of one stack to a merchant. */
export function getMerchantStackSellTotal(slot, merchantId, quantity = null) {
    if (!merchantAcceptsSlot(slot, merchantId)) return 0;
    const qty = quantity ?? slot.quantity ?? 1;
    const unit = getMerchantUnitSellPrice(slot.npcValue, merchantId);
    return unit * qty;
}

export default MERCHANTS;
