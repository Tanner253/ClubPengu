/**
 * Inventory grid visuals — wood uses 🪵 with tier-based cell backgrounds.
 */

const WOOD_EMOJI = '🪵';

const RARITY_FALLBACK = {
    common: { color: '#9CA3AF', bg: 'bg-gray-500/20', border: 'border-gray-500/40' },
    uncommon: { color: '#22C55E', bg: 'bg-green-500/20', border: 'border-green-500/40' },
    rare: { color: '#3B82F6', bg: 'bg-blue-500/20', border: 'border-blue-500/40' },
    epic: { color: '#A855F7', bg: 'bg-purple-500/20', border: 'border-purple-500/40' },
    legendary: { color: '#FBBF24', bg: 'bg-amber-500/20', border: 'border-amber-500/40' }
};

/** Wood tier → cell styling (same log emoji, higher tiers = richer backgrounds). */
const WOOD_TIER_VISUALS = {
    1: {
        shortLabel: 'Pine',
        bg: 'bg-lime-950/45',
        border: 'border-lime-600/45',
        stripe: 'bg-lime-500/80',
        text: 'text-lime-200',
        color: '#84cc16'
    },
    2: {
        shortLabel: 'Birch',
        bg: 'bg-emerald-950/45',
        border: 'border-emerald-500/50',
        stripe: 'bg-emerald-400',
        text: 'text-emerald-100',
        color: '#34d399'
    },
    3: {
        shortLabel: 'Oak',
        bg: 'bg-amber-950/50',
        border: 'border-amber-500/55',
        stripe: 'bg-amber-400',
        text: 'text-amber-100',
        color: '#fbbf24'
    },
    4: {
        shortLabel: 'Iron',
        bg: 'bg-violet-950/50',
        border: 'border-violet-400/55',
        stripe: 'bg-violet-400',
        text: 'text-violet-100',
        color: '#a78bfa'
    }
};

const WOOD_ITEM_TIERS = {
    pine_log: 1,
    birch_log: 2,
    oak_log: 3,
    ironwood_log: 4
};

function getWoodVisual(slot) {
    const tier = slot.tier || WOOD_ITEM_TIERS[slot.itemId] || 1;
    const style = WOOD_TIER_VISUALS[tier] || WOOD_TIER_VISUALS[1];
    return {
        ...style,
        kind: 'wood',
        emoji: WOOD_EMOJI
    };
}

export function getInventorySlotVisual(slot) {
    if (!slot?.itemId) {
        return { ...RARITY_FALLBACK.common, emoji: null, shortLabel: null, stripe: null, text: 'text-gray-400' };
    }

    if (slot.category === 'wood') {
        return getWoodVisual(slot);
    }

    if (slot.itemId === 'forest_mushroom') {
        return {
            kind: 'forage',
            shortLabel: 'Shroom',
            emoji: '🍄',
            bg: 'bg-fuchsia-950/45',
            border: 'border-fuchsia-400/50',
            stripe: 'bg-fuchsia-400',
            text: 'text-fuchsia-100',
            color: '#e879f9'
        };
    }

    const rarity = slot.rarity || 'common';
    const base = RARITY_FALLBACK[rarity] || RARITY_FALLBACK.common;
    return {
        kind: slot.category || 'item',
        shortLabel: null,
        emoji: slot.emoji || '📦',
        bg: base.bg,
        border: base.border,
        stripe: null,
        text: 'text-white',
        color: base.color
    };
}

export function getInventoryDetailVisual(slot) {
    if (!slot?.itemId) {
        return {
            bg: 'bg-gray-500/20',
            border: 'border-gray-500/40',
            color: '#9CA3AF',
            text: 'text-gray-400'
        };
    }
    const visual = getInventorySlotVisual(slot);
    return {
        bg: visual.bg,
        border: visual.border,
        color: visual.color,
        text: visual.text
    };
}

export { RARITY_FALLBACK, WOOD_EMOJI };
