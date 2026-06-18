/**
 * Diamond Flippers / Whale Status — $CP balance → nametag tier (whitepaper Ch.4).
 * Thresholds use whole-token UI amounts (same units as on-chain uiAmount).
 */

export const WHALE_NAMETAG_TIERS = [
    {
        id: 'standard',
        label: 'Standard',
        minBalance: 0,
        textColor: '#f8fafc',
        glowColor: 'rgba(148, 163, 184, 0.4)',
        borderColors: ['rgba(100, 116, 139, 0.5)', 'rgba(100, 116, 139, 0.5)'],
        bgColor: 'rgba(0, 0, 0, 0.7)',
        emoji: null,
        particlePreset: null,
        styled: false,
    },
    {
        id: 'bronze',
        label: 'Bronze',
        minBalance: 1_000,
        textColor: '#d97706',
        glowColor: 'rgba(217, 119, 6, 0.55)',
        borderColors: ['rgba(180, 83, 9, 0.9)', 'rgba(251, 191, 36, 0.7)'],
        bgColor: 'rgba(20, 12, 4, 0.85)',
        emoji: '🥉',
        particlePreset: null,
        styled: true,
    },
    {
        id: 'silver',
        label: 'Silver',
        minBalance: 10_000,
        textColor: '#e2e8f0',
        glowColor: 'rgba(203, 213, 225, 0.6)',
        borderColors: ['rgba(148, 163, 184, 0.95)', 'rgba(226, 232, 240, 0.8)'],
        bgColor: 'rgba(15, 23, 42, 0.9)',
        emoji: '🥈',
        particlePreset: 'sparkle',
        styled: true,
    },
    {
        id: 'gold',
        label: 'Gold',
        minBalance: 100_000,
        textColor: '#fbbf24',
        glowColor: 'rgba(251, 191, 36, 0.75)',
        borderColors: ['rgba(234, 179, 8, 0.95)', 'rgba(245, 158, 11, 0.85)'],
        bgColor: 'rgba(20, 14, 0, 0.88)',
        emoji: '🥇',
        particlePreset: 'goldRain',
        styled: true,
    },
    {
        id: 'diamond',
        label: 'Diamond',
        minBalance: 1_000_000,
        textColor: '#67e8f9',
        glowColor: 'rgba(6, 182, 212, 0.8)',
        borderColors: ['rgba(6, 182, 212, 0.95)', 'rgba(168, 85, 247, 0.75)'],
        bgColor: 'rgba(8, 20, 35, 0.92)',
        emoji: '💎',
        particlePreset: 'whaleRain',
        styled: true,
    },
    {
        id: 'legendary',
        label: 'Legendary',
        minBalance: 10_000_000,
        textColor: '#e879f9',
        glowColor: 'rgba(168, 85, 247, 0.9)',
        borderColors: ['rgba(168, 85, 247, 1)', 'rgba(236, 72, 153, 1)'],
        bgColor: 'rgba(25, 10, 40, 0.92)',
        emoji: '👑',
        particlePreset: 'whaleRain',
        styled: true,
    },
];

const TIER_BY_ID = Object.fromEntries(WHALE_NAMETAG_TIERS.map((t) => [t.id, t]));

export function getTierFromBalance(balance) {
    const amount = Math.max(0, Math.floor(Number(balance) || 0));
    let matched = WHALE_NAMETAG_TIERS[0];
    for (const tier of WHALE_NAMETAG_TIERS) {
        if (amount >= tier.minBalance) matched = tier;
    }
    return matched.id;
}

export function getTierConfig(tierId) {
    return TIER_BY_ID[tierId] || TIER_BY_ID.standard;
}

/**
 * Resolve which nametag visual to render for a player.
 * - day1: manual OG supporter badge
 * - default: plain white tag
 * - whale / tier / auto / unset + authenticated: $CP tier colors (Diamond Flippers)
 */
export function resolveNametagStyle(playerData = {}) {
    const manual = playerData.appearance?.nametagStyle;
    if (manual === 'day1') return 'day1';
    if (manual === 'default') return 'default';

    const tier = playerData.cpNametagTier;
    if (tier && tier !== 'standard') return tier;

    if (manual === 'whale' || manual === 'tier' || manual === 'auto') {
        return tier || 'standard';
    }

    if (playerData.isAuthenticated && playerData.walletAddress) {
        return tier || 'standard';
    }

    return 'default';
}

export function getParticlePresetForNametagStyle(style) {
    if (style === 'day1') return 'goldRain';
    const tier = getTierConfig(style);
    return tier.particlePreset || null;
}

export function isStyledNametag(style) {
    if (style === 'day1' || style === 'whale') return true;
    return !!getTierConfig(style).styled;
}

/** Profile modal copy — tier status is not shown on the 3D world nametag */
export function getDiamondFlipperProfileLabel(tierId) {
    const cfg = getTierConfig(tierId);
    if (!cfg.styled) return null;
    if (tierId === 'diamond') return '💎 Diamond Flipper';
    if (tierId === 'legendary') return '👑 Legendary Diamond Flipper';
    const emoji = cfg.emoji ? `${cfg.emoji} ` : '';
    return `${emoji}${cfg.label} Diamond Flipper`;
}

export function getPlayerProfileStatusLabels(player = {}) {
    const labels = [];
    if (player.appearance?.nametagStyle === 'day1') {
        labels.push('⭐ Day 1 Supporter');
    }
    const tierLabel = getDiamondFlipperProfileLabel(player.cpNametagTier);
    if (tierLabel) labels.push(tierLabel);
    return labels;
}
