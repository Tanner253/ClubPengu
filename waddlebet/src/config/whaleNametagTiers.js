/**
 * Diamond Flippers / Whale Status — $CP balance → nametag tier (whitepaper Ch.4).
 * Thresholds use whole-token UI amounts (same units as on-chain uiAmount).
 */

export const DAY1_NAMETAG_COLORS = {
    textColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.75)',
    borderColors: ['rgba(234, 179, 8, 0.95)', 'rgba(245, 158, 11, 0.85)'],
    bgColor: 'rgba(20, 14, 0, 0.88)',
    particleColor: '#fbbf24',
};

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
        particleColor: null,
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
        particlePreset: 'sparkle',
        particleColor: '#d97706',
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
        particleColor: '#e2e8f0',
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
        particleColor: '#fbbf24',
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
        particleColor: '#67e8f9',
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
        particleColor: '#e879f9',
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

function hexToParticleColor(hex) {
    if (!hex || typeof hex !== 'string') return 0xffffff;
    const normalized = hex.replace('#', '');
    const parsed = Number.parseInt(normalized, 16);
    return Number.isFinite(parsed) ? parsed : 0xffffff;
}

/**
 * Particle preset + color matched to the resolved nametag style.
 * @returns {{ preset: string, color: number } | null}
 */
export function getNametagParticleEffect(style) {
    if (style === 'day1') {
        return { preset: 'goldRain', color: hexToParticleColor(DAY1_NAMETAG_COLORS.particleColor) };
    }

    const tier = getTierConfig(style);
    if (!tier.particlePreset) return null;

    return {
        preset: tier.particlePreset,
        color: hexToParticleColor(tier.particleColor || tier.textColor),
    };
}

/** @deprecated use getNametagParticleEffect */
export function getParticlePresetForNametagStyle(style) {
    return getNametagParticleEffect(style)?.preset || null;
}

export function canUseDay1Nametag(playerData = {}) {
    if (playerData.day1NametagUnlocked === false) return false;
    if (playerData.day1NametagUnlocked === true) return true;
    // Remote players: server strips invalid day1 from appearance before broadcast
    return playerData.appearance?.nametagStyle === 'day1';
}

/**
 * Resolve which nametag visual to render for a player.
 * - day1: OG supporter badge (unlock required)
 * - default: plain white tag
 * - whale / tier / auto / unset + authenticated: $CP tier colors (Diamond Flippers)
 */
export function resolveNametagStyle(playerData = {}) {
    const manual = playerData.appearance?.nametagStyle;
    if (manual === 'day1') {
        if (canUseDay1Nametag(playerData)) return 'day1';
        // Fall through to balance tier when day1 is locked
    }
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
    if (canUseDay1Nametag(player) && player.appearance?.nametagStyle === 'day1') {
        labels.push('⭐ Day 1 Supporter');
    }
    const tierLabel = getDiamondFlipperProfileLabel(player.cpNametagTier);
    if (tierLabel) labels.push(tierLabel);
    return labels;
}
