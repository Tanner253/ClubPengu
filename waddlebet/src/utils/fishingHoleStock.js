/**
 * Client helpers for per-hole fish stock display (server-authoritative).
 */

const TIER_COLORS = {
    1: 'text-slate-300',
    2: 'text-green-400',
    3: 'text-blue-400',
    4: 'text-purple-400',
    5: 'text-indigo-400',
    6: 'text-violet-400',
    7: 'text-amber-400',
    8: 'text-orange-400',
    9: 'text-red-400',
    10: 'text-fuchsia-400',
};

export function getHoleStatusById(fishingHoles, holeId) {
    if (!holeId || !Array.isArray(fishingHoles)) return null;
    return fishingHoles.find((h) => h.id === holeId) || null;
}

export function formatRegrowEta(ms) {
    if (!ms || ms <= 0) return null;
    const mins = Math.ceil(ms / 60000);
    if (mins >= 60) return `${Math.ceil(mins / 60)}h`;
    return `${mins}m`;
}

/** Compact one-liner for interaction prompt. */
export function formatHoleStockSummary(holeStatus) {
    if (!holeStatus?.tiers?.length) return null;

    if (holeStatus.minnowOnly) {
        const regrowing = holeStatus.tiers
            .filter((t) => t.tier > 1 && t.depleted && t.regrowInMs)
            .map((t) => `${t.label} ${formatRegrowEta(t.regrowInMs)}`)
            .slice(0, 2);
        if (regrowing.length) {
            return `Depleted — minnows only. ${regrowing.join(', ')} regrowing`;
        }
        return 'Depleted — minnows only. Rare fish regrowing…';
    }

    const stocked = holeStatus.tiers
        .filter((t) => t.tier > 1 && t.current > 0)
        .map((t) => `${t.label} ${t.current}`)
        .slice(-4);

    if (!stocked.length) return 'Low stock — mostly minnows';
    return stocked.join(' · ');
}

/** Rows for the interaction panel (tier 2+). */
export function getHoleStockRows(holeStatus) {
    if (!holeStatus?.tiers?.length) return [];
    return holeStatus.tiers
        .filter((t) => t.tier >= 2)
        .map((t) => ({
            tier: t.tier,
            label: t.label,
            current: t.current,
            max: t.max,
            depleted: t.depleted,
            regrowInMs: t.regrowInMs,
            colorClass: TIER_COLORS[t.tier] || 'text-cyan-300',
        }));
}

export function getHoleStockSignature(holeStatus) {
    if (!holeStatus) return '';
    const tierSig = (holeStatus.tiers || [])
        .map((t) => `${t.tier}:${t.current}:${t.regrowInMs || 0}`)
        .join('|');
    return `${holeStatus.status || ''}:${tierSig}`;
}

/** Tiers the server will grant at this hole (always includes tier 1). */
export function getAllowedTiersFromHoleStatus(holeStatus) {
    const allowed = new Set([1]);
    if (!holeStatus?.tiers?.length) {
        for (let tier = 2; tier <= 10; tier++) allowed.add(tier);
        return allowed;
    }
    for (const tier of holeStatus.tiers) {
        if (tier.tier === 1) continue;
        if ((tier.current || 0) > 0) allowed.add(tier.tier);
    }
    return allowed;
}

/** Relative spawn weight per tier from current/max stock (0 = none). */
export function getTierSpawnWeights(holeStatus) {
    const weights = {};
    if (!holeStatus?.tiers?.length) {
        for (let tier = 1; tier <= 10; tier++) weights[tier] = 1;
        return weights;
    }
    for (const tier of holeStatus.tiers) {
        const max = Math.max(1, tier.max || 1);
        const current = Math.max(0, tier.current || 0);
        if (tier.tier === 1) {
            weights[1] = Math.max(0.6, current / max);
        } else if (current > 0) {
            weights[tier.tier] = Math.max(0.15, current / max);
        } else {
            weights[tier.tier] = 0;
        }
    }
    return weights;
}

export function getHoleStockLabel(holeStatus) {
    if (!holeStatus) return null;
    if (holeStatus.minnowOnly) return 'Depleted — minnows only';
    const stocked = (holeStatus.tiers || [])
        .filter((t) => t.tier > 1 && t.current > 0)
        .map((t) => t.label)
        .slice(-3);
    if (!stocked.length) return 'Low stock';
    return stocked.join(', ');
}
