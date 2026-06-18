/**
 * FishingHoleService — server-authoritative fish stock per ice fishing hole.
 * Mirrors ForestTreeService: deplete on catch, regrow on tick, minnows always available.
 */

import { isDBConnected } from '../db/connection.js';
import FishingHoleWorldState from '../db/models/FishingHoleWorldState.js';
import {
    FISHING_HOLE_DEFS,
    FISHING_HOLE_TIERS,
    FISHING_HOLE_TIER_CONFIG,
    generateInitialTierStock,
    getFishingHoleDef,
    getFishingHolesForRoom,
    getTierMaxStock,
} from '../config/fishingHoles.js';

const WORLD_STATE_ID = 'fishing_holes';

function emptyRegrowMap() {
    return Object.fromEntries(FISHING_HOLE_TIERS.map((t) => [t, null]));
}

class FishingHoleService {
    constructor() {
        /** @type {Map<string, object>} */
        this.holes = new Map();
        for (const def of FISHING_HOLE_DEFS) {
            const tierStock = generateInitialTierStock(def.id, def.rareBias ?? 0.4);
            this.holes.set(def.id, {
                id: def.id,
                room: def.room,
                rareBias: def.rareBias ?? 0.4,
                tierStock,
                tierRegrowAt: emptyRegrowMap(),
            });
        }
    }

    async loadFromDatabase() {
        if (!isDBConnected()) {
            console.log('🎣 Fishing holes: no DB — in-memory only (reset on restart)');
            return;
        }

        try {
            const doc = await FishingHoleWorldState.findById(WORLD_STATE_ID).lean();
            const saved = doc?.holes || {};
            let applied = 0;

            for (const [holeId, entry] of Object.entries(saved)) {
                const hole = this.holes.get(holeId);
                if (!hole || !entry) continue;
                if (entry.tierStock && typeof entry.tierStock === 'object') {
                    for (const tier of FISHING_HOLE_TIERS) {
                        const n = Number(entry.tierStock[tier]);
                        if (Number.isFinite(n)) {
                            hole.tierStock[tier] = Math.max(
                                tier === 1 ? FISHING_HOLE_TIER_CONFIG[1].minReserve : 0,
                                Math.min(getTierMaxStock(tier), Math.floor(n))
                            );
                        }
                    }
                }
                if (entry.tierRegrowAt && typeof entry.tierRegrowAt === 'object') {
                    hole.tierRegrowAt = { ...emptyRegrowMap(), ...entry.tierRegrowAt };
                }
                applied++;
            }

            const now = Date.now();
            for (const hole of this.holes.values()) {
                await this._applyDueRegrowth(hole, now, true);
            }

            console.log(`🎣 Fishing holes loaded from DB: ${applied} saved`);
        } catch (err) {
            console.error('🎣 Failed to load fishing hole state:', err.message);
        }
    }

    async persistHole(holeId) {
        if (!isDBConnected()) return;
        const hole = this.holes.get(holeId);
        if (!hole) return;

        try {
            await FishingHoleWorldState.findByIdAndUpdate(
                WORLD_STATE_ID,
                {
                    $set: {
                        [`holes.${holeId}`]: {
                            tierStock: hole.tierStock,
                            tierRegrowAt: hole.tierRegrowAt,
                            updatedAt: Date.now(),
                        },
                        updatedAt: new Date(),
                    },
                },
                { upsert: true }
            );
        } catch (err) {
            console.error(`🎣 Failed to persist hole ${holeId}:`, err.message);
        }
    }

    getHole(holeId) {
        return this.holes.get(holeId) || null;
    }

    /** Tiers with stock > 0 (tier 1 always has minnow reserve). */
    getAvailableTiers(holeId) {
        const hole = this.holes.get(holeId);
        if (!hole) return new Set([1]);
        const available = new Set();
        for (const tier of FISHING_HOLE_TIERS) {
            if ((hole.tierStock[tier] || 0) > 0) available.add(tier);
        }
        if (!available.size) available.add(1);
        return available;
    }

    isMinnowOnly(holeId) {
        const available = this.getAvailableTiers(holeId);
        return available.size === 1 && available.has(1);
    }

    hasNonMinnowStock(holeId) {
        const hole = this.holes.get(holeId);
        if (!hole) return false;
        for (const tier of FISHING_HOLE_TIERS) {
            if (tier === 1) continue;
            if ((hole.tierStock[tier] || 0) > 0) return true;
        }
        return false;
    }

    /**
     * Consume one fish from tier stock after a successful catch.
     * @returns {{ consumed: boolean, tier: number, regrowAt: number|null }}
     */
    async consumeTierStock(holeId, tier) {
        const hole = this.holes.get(holeId);
        if (!hole) return { consumed: false, tier, regrowAt: null };

        const safeTier = Math.max(1, Math.min(10, Number(tier) || 1));
        const cfg = FISHING_HOLE_TIER_CONFIG[safeTier];
        let count = hole.tierStock[safeTier] || 0;

        if (safeTier === 1) {
            count = Math.max(cfg.minReserve, count - 1);
            hole.tierStock[1] = count;
            await this.persistHole(holeId);
            return { consumed: true, tier: 1, regrowAt: null };
        }

        if (count <= 0) {
            return { consumed: false, tier: safeTier, regrowAt: hole.tierRegrowAt[safeTier] };
        }

        count -= 1;
        hole.tierStock[safeTier] = count;

        let regrowAt = hole.tierRegrowAt[safeTier];
        if (count <= 0 && !regrowAt) {
            regrowAt = Date.now() + cfg.respawnMs;
            hole.tierRegrowAt[safeTier] = regrowAt;
        }

        await this.persistHole(holeId);
        return { consumed: true, tier: safeTier, regrowAt };
    }

    async _restockTier(hole, tier, now, skipPersist = false) {
        const cfg = FISHING_HOLE_TIER_CONFIG[tier];
        const max = cfg.maxStock;
        const add = Math.max(1, Math.ceil(max * cfg.restockPct));
        const current = hole.tierStock[tier] || 0;
        hole.tierStock[tier] = Math.min(max, current + add);
        hole.tierRegrowAt[tier] = null;
        if (!skipPersist) await this.persistHole(hole.id);
        return true;
    }

    async _applyDueRegrowth(hole, now, skipPersist = false) {
        let changed = false;
        for (const tier of FISHING_HOLE_TIERS) {
            if (tier === 1) continue;
            const regrowAt = hole.tierRegrowAt[tier];
            if (!regrowAt || now < regrowAt) continue;
            if ((hole.tierStock[tier] || 0) >= getTierMaxStock(tier)) {
                hole.tierRegrowAt[tier] = null;
                continue;
            }
            await this._restockTier(hole, tier, now, skipPersist);
            changed = true;
        }
        return changed;
    }

    /** Passive regrowth tick — call from server interval. */
    async tickRegrowth() {
        const now = Date.now();
        const updated = [];

        for (const hole of this.holes.values()) {
            const changed = await this._applyDueRegrowth(hole, now);
            if (changed) updated.push(hole.id);
        }

        return updated;
    }

    getPublicState(holeId) {
        const hole = this.holes.get(holeId);
        if (!hole) return null;

        const now = Date.now();
        const tiers = FISHING_HOLE_TIERS.map((tier) => {
            const cfg = FISHING_HOLE_TIER_CONFIG[tier];
            const current = hole.tierStock[tier] || 0;
            const max = cfg.maxStock;
            const regrowAt = hole.tierRegrowAt[tier];
            return {
                tier,
                label: cfg.label,
                current,
                max,
                depleted: tier > 1 && current <= 0,
                regrowInMs: regrowAt && regrowAt > now ? regrowAt - now : null,
            };
        });

        const minnowOnly = this.isMinnowOnly(holeId);
        const hasRare = this.hasNonMinnowStock(holeId);

        return {
            id: hole.id,
            room: hole.room,
            tiers,
            minnowOnly,
            status: minnowOnly ? 'depleted' : hasRare ? 'stocked' : 'low',
        };
    }

    getSnapshotForRoom(roomId) {
        return getFishingHolesForRoom(roomId)
            .map((def) => this.getPublicState(def.id))
            .filter(Boolean);
    }

    getSnapshot() {
        return FISHING_HOLE_DEFS.map((def) => this.getPublicState(def.id)).filter(Boolean);
    }
}

export default FishingHoleService;
