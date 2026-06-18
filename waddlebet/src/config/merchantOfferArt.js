/**
 * Maps merchant actions to canvas art variants for TraderOfferCanvas.
 */

export const WOOD_COLORS = {
    pine_log: { fill: '#b8956a', edge: '#6b4f2a', glow: 'rgba(184,149,106,0.45)' },
    birch_log: { fill: '#e2d4bc', edge: '#9a8b72', glow: 'rgba(226,212,188,0.4)' },
    oak_log: { fill: '#7a5230', edge: '#3f2818', glow: 'rgba(122,82,48,0.45)' },
    ironwood_log: { fill: '#4a3528', edge: '#1f1410', glow: 'rgba(90,70,55,0.5)' },
};

const TIER_GLOW = {
    bronze: 'rgba(205, 127, 50, 0.55)',
    silver: 'rgba(192, 210, 230, 0.6)',
    gold: 'rgba(255, 215, 80, 0.75)',
    emerald: 'rgba(74, 222, 128, 0.65)',
};

export function getTierGlow(tier = 'bronze') {
    return TIER_GLOW[tier] || TIER_GLOW.bronze;
}

export function resolveOfferArt(action, { listing, order } = {}) {
    if (!action) return { variant: 'generic', tier: 'bronze' };

    if (action.loreText) {
        return { variant: 'intel_map', tier: 'silver' };
    }

    if (action.requiresDailyOrder || action.id?.startsWith('quest_')) {
        const ready = order?.ready;
        const accepted = order?.accepted;
        return {
            variant: 'contract',
            tier: ready ? 'gold' : accepted ? 'silver' : 'bronze',
        };
    }

    if (action.requiresMushrooms) {
        return { variant: 'ferry_ticket', tier: 'emerald' };
    }

    if (action.id === 'open_backpack') {
        return { variant: 'sell_pouch', tier: 'silver' };
    }

    if (action.requiresMerchantRecipe && action.itemId) {
        const map = {
            gold_mint_wood_char: { variant: 'charcoal_bundle', tier: 'bronze' },
            gold_mint_wood_lumber: { variant: 'lumber_crate', tier: 'silver' },
            gold_mint_wood_fine: { variant: 'fine_timber', tier: 'gold' },
            worm: { variant: 'bait_jar', tier: 'bronze' },
        };
        return map[action.itemId] || { variant: 'gold_chest', tier: 'bronze' };
    }

    if (action.requiresBuyTool || action.id === 'buy_basic_axe') {
        const axeTier = {
            basic_axe: 'bronze',
            iron_axe: 'silver',
            steel_axe: 'gold',
            master_axe: 'gold',
        };
        return {
            variant: 'axe',
            tier: axeTier[action.itemId] || 'bronze',
        };
    }

    if (action.requiresRodUpgrade || action.id === 'upgrade_rod') {
        return { variant: 'fishing_rod', tier: 'silver' };
    }

    if (action.requiresUpgrade && action.id === 'upgrade_backpack') {
        return { variant: 'backpack', tier: 'silver' };
    }

    if (listing?.goldMintOutput >= 40) return { variant: 'gold_chest', tier: 'gold' };
    if (listing?.goldMintOutput >= 20) return { variant: 'gold_chest', tier: 'silver' };

    return { variant: 'gold_chest', tier: 'bronze' };
}

export function getOfferDisplayName(action, resolvedState, listing) {
    if (action.requiresDailyOrder && resolvedState?.orderBriefing) {
        return resolvedState.orderBriefing.title;
    }
    if (action.requiresMerchantRecipe && listing) {
        const names = {
            gold_mint_wood_char: 'Pine Charcoal',
            gold_mint_wood_lumber: 'Mixed Lumber Crate',
            gold_mint_wood_fine: 'Fine Timber Lot',
            worm: 'Worm Bait Pack',
        };
        return names[action.itemId] || listing.label?.split('→')[0]?.trim() || 'Trade Bundle';
    }
    if (action.requiresBuyTool || action.id === 'buy_basic_axe') {
        return (listing?.label || action.label || 'Tool').replace(/^Buy\s+/i, '');
    }
    if (action.id === 'open_backpack') return 'Sell from Backpack';
    if (action.loreText) return action.label;
    return (resolvedState?.label || action.label || 'Offer').replace(/\s*\([^)]*\)\s*$/, '').trim();
}

export function getOfferSubtitle(action, resolvedState, listing) {
    if (action.requiresMerchantRecipe && listing?.goldMintOutput) {
        return `Trade logs for ${listing.goldMintOutput} gold`;
    }
    if (action.requiresDailyOrder && resolvedState?.orderBriefing) {
        return resolvedState.orderBriefing.subtitle;
    }
    if (listing?.description) return listing.description;
    return resolvedState?.sublabel || null;
}
