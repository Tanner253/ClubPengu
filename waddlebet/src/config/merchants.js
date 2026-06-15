/**
 * Merchant NPCs (client display) — keep in sync with server/config/merchants.js
 */
export const MERCHANTS = {
    fish_buyer: {
        id: 'fish_buyer',
        name: 'Old Salty',
        title: 'Fish Buyer',
        emoji: '🧓'
    },
    supply_merchant: {
        id: 'supply_merchant',
        name: 'Copper Clive',
        title: 'Supply & Gear',
        emoji: '🔧'
    }
};

export function getMerchant(merchantId) {
    return MERCHANTS[merchantId] || null;
}

export default MERCHANTS;
