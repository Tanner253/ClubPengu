/**
 * Fishing hole stock — per-hole tier populations (like forest trees).
 * When a tier is fished out it regrows over time; fully depleted holes = minnows only.
 */

/** @typedef {{ tier: number, label: string, maxStock: number, minReserve: number, respawnMs: number, restockPct: number }} FishingHoleTierConfig */

/** Tier stock caps & regrowth (tier 1 = common minnows, 10 = mythic). */
export const FISHING_HOLE_TIER_CONFIG = {
    1: { label: 'Common', maxStock: 50, minReserve: 10, respawnMs: 3 * 60 * 1000, restockPct: 0.4 },
    2: { label: 'Uncommon', maxStock: 22, minReserve: 0, respawnMs: 6 * 60 * 1000, restockPct: 0.35 },
    3: { label: 'Rare', maxStock: 14, minReserve: 0, respawnMs: 10 * 60 * 1000, restockPct: 0.3 },
    4: { label: 'Epic', maxStock: 9, minReserve: 0, respawnMs: 15 * 60 * 1000, restockPct: 0.28 },
    5: { label: 'Deep', maxStock: 6, minReserve: 0, respawnMs: 20 * 60 * 1000, restockPct: 0.25 },
    6: { label: 'Abyss', maxStock: 4, minReserve: 0, respawnMs: 28 * 60 * 1000, restockPct: 0.22 },
    7: { label: 'Trench', maxStock: 3, minReserve: 0, respawnMs: 38 * 60 * 1000, restockPct: 0.2 },
    8: { label: 'Ancient', maxStock: 2, minReserve: 0, respawnMs: 50 * 60 * 1000, restockPct: 0.18 },
    9: { label: 'Legendary', maxStock: 2, minReserve: 0, respawnMs: 65 * 60 * 1000, restockPct: 0.15 },
    10: { label: 'Mythic', maxStock: 1, minReserve: 0, respawnMs: 90 * 60 * 1000, restockPct: 0.12 },
};

export const FISHING_HOLE_TIERS = Object.keys(FISHING_HOLE_TIER_CONFIG).map(Number).sort((a, b) => a - b);

/** Keep in sync with TownCenter + SnowFortsZone.FISHING_HOLES */
export const FISHING_HOLE_DEFS = [
    { id: 'fishing_1', room: 'town', rareBias: 0.35 },
    { id: 'sf_fishing_1', room: 'snow_forts', rareBias: 0.2 },
    { id: 'sf_fishing_2', room: 'snow_forts', rareBias: 0.45 },
    { id: 'sf_fishing_3', room: 'snow_forts', rareBias: 0.55 },
    { id: 'sf_fishing_4', room: 'snow_forts', rareBias: 0.25 },
    { id: 'sf_fishing_5', room: 'snow_forts', rareBias: 0.5 },
    { id: 'sf_fishing_6', room: 'snow_forts', rareBias: 0.4 },
    { id: 'sf_fishing_7', room: 'snow_forts', rareBias: 0.65 },
    { id: 'sf_fishing_8', room: 'snow_forts', rareBias: 0.3 },
    { id: 'sf_fishing_9', room: 'snow_forts', rareBias: 0.48 },
    { id: 'sf_fishing_10', room: 'snow_forts', rareBias: 0.6 },
];

const HOLE_BY_ID = Object.fromEntries(FISHING_HOLE_DEFS.map((h) => [h.id, h]));

export function getFishingHoleDef(holeId) {
    return HOLE_BY_ID[holeId] || null;
}

export function getFishingHolesForRoom(roomId) {
    return FISHING_HOLE_DEFS.filter((h) => h.room === roomId);
}

export function hashHoleSeed(id = '', salt = '') {
    let h = 0;
    const s = `${id}:${salt}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return (h % 1000) / 1000;
}

/** Initial tier counts — each hole rolls slightly different populations. */
export function generateInitialTierStock(holeId, rareBias = 0.4) {
    const stock = {};
    for (const tier of FISHING_HOLE_TIERS) {
        const cfg = FISHING_HOLE_TIER_CONFIG[tier];
        const roll = hashHoleSeed(holeId, `tier${tier}`);
        let count = Math.floor(cfg.maxStock * (0.45 + roll * 0.55));
        if (tier >= 7) {
            count = Math.max(0, Math.floor(count * (0.35 + rareBias * 0.9)));
        } else if (tier >= 4) {
            count = Math.floor(count * (0.6 + rareBias * 0.5));
        }
        if (tier === 1) {
            count = Math.max(cfg.minReserve, count);
        }
        stock[tier] = Math.min(cfg.maxStock, Math.max(tier === 1 ? cfg.minReserve : 0, count));
    }
    return stock;
}

export function getTierMaxStock(tier) {
    return FISHING_HOLE_TIER_CONFIG[tier]?.maxStock ?? 0;
}
