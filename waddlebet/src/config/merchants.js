/**
 * Merchant NPCs (client display) — keep in sync with server/config/merchants.js
 */
import { NPC_EMERGENCY_SELL_RATIO } from './goldEconomy';

const AXE_WOOD_REQUIRED = {
    basic_axe: { pine_log: 80 },
    iron_axe: { pine_log: 120, birch_log: 64 },
    steel_axe: { pine_log: 160, birch_log: 96, oak_log: 48 },
    master_axe: { pine_log: 200, birch_log: 128, oak_log: 80, ironwood_log: 32 },
};

export const MERCHANTS = {
    fish_buyer: {
        id: 'fish_buyer',
        name: 'Old Salty',
        title: 'Fish Buyer',
        emoji: '🧓',
        acceptsCategories: ['fish'],
        npcSellRatio: 1.0,
        sells: [
            {
                itemId: 'worm',
                quantity: 5,
                cost: 1,
                label: 'Worm bait (×5)',
            },
        ],
    },
    forest_ranger: {
        id: 'forest_ranger',
        name: 'Ranger Pike',
        title: 'Whiskerwood Ranger',
        emoji: '🌲',
        acceptsCategories: ['wood', 'forage'],
        /** Trail-side sell rate (65% of emergency rate). */
        npcSellRatio: 0.65,
    },
    supply_merchant: {
        id: 'supply_merchant',
        name: 'Copper Clive',
        title: 'Supply & Gear',
        emoji: '🔧',
        acceptsCategories: ['wood', 'tool', 'rod'],
        npcSellRatio: 1.0,
        sells: [
            {
                itemId: 'gold_mint_wood_char',
                goldMintOutput: 10,
                materialCost: { pine_log: 64 },
                label: 'Pine Charcoal',
                description: 'Trade 64 pine logs for 10 gold',
            },
            {
                itemId: 'gold_mint_wood_lumber',
                goldMintOutput: 28,
                materialCost: { birch_log: 48, pine_log: 32, oak_log: 16 },
                label: 'Mixed Lumber Crate',
                description: '48 birch + 32 pine + 16 oak → 28 gold',
            },
            {
                itemId: 'gold_mint_wood_fine',
                goldMintOutput: 45,
                materialCost: { birch_log: 40, oak_log: 32, ironwood_log: 16 },
                label: 'Fine Timber Lot',
                description: '40 birch + 32 oak + 16 ironwood → 45 gold',
            },
            { itemId: 'basic_axe', cost: 0, woodRequired: AXE_WOOD_REQUIRED.basic_axe, label: 'Basic Axe', emoji: '🪓' },
            { itemId: 'iron_axe', cost: 0, woodRequired: AXE_WOOD_REQUIRED.iron_axe, label: 'Iron Axe', emoji: '⛏️' },
            { itemId: 'steel_axe', cost: 0, woodRequired: AXE_WOOD_REQUIRED.steel_axe, label: 'Steel Axe', emoji: '🪓' },
            { itemId: 'master_axe', cost: 0, woodRequired: AXE_WOOD_REQUIRED.master_axe, label: 'Master Axe', emoji: '🪓' }
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
        forage: 'mushrooms & forage',
        tool: 'tools',
        rod: 'rods',
    };
    const categories = getMerchant(merchantId)?.acceptsCategories || [];
    return categories.map((c) => labels[c] || c).join(', ');
}

/** Gold per unit at a merchant (floor), using emergency ratio × merchant multiplier. */
export function getMerchantUnitSellPrice(baseNpcValue, merchantId) {
    const merchantMultiplier = getMerchant(merchantId)?.npcSellRatio ?? 1;
    const effectiveRatio = NPC_EMERGENCY_SELL_RATIO * merchantMultiplier;
    return Math.max(1, Math.floor((baseNpcValue || 0) * effectiveRatio));
}

/** Total gold for selling qty of one stack to a merchant. */
export function getMerchantStackSellTotal(slot, merchantId, quantity = null) {
    if (!merchantAcceptsSlot(slot, merchantId)) return 0;
    const qty = quantity ?? slot.quantity ?? 1;
    const unit = getMerchantUnitSellPrice(slot.npcValue, merchantId);
    const gross = unit * qty;
    return Math.max(qty > 0 ? 1 : 0, gross);
}

export default MERCHANTS;
