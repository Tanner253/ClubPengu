import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/connection.js', () => ({
    isDBConnected: vi.fn(() => false),
}));

const { default: FishingHoleService } = await import('../services/FishingHoleService.js');
const { FISHING_HOLE_TIER_CONFIG } = await import('../config/fishingHoles.js');

describe('FishingHoleService', () => {
    let service;

    beforeEach(() => {
        service = new FishingHoleService();
    });

    it('initializes all configured holes with tier stock', () => {
        const snap = service.getSnapshot();
        expect(snap.length).toBeGreaterThan(10);
        for (const hole of snap) {
            expect(hole.tiers.length).toBe(10);
            expect(hole.tiers.find((t) => t.tier === 1).current).toBeGreaterThanOrEqual(
                FISHING_HOLE_TIER_CONFIG[1].minReserve
            );
        }
    });

    it('always keeps tier 1 available (minnow reserve)', async () => {
        const holeId = 'fishing_1';
        const hole = service.getHole(holeId);
        hole.tierStock[1] = FISHING_HOLE_TIER_CONFIG[1].minReserve;

        await service.consumeTierStock(holeId, 1);
        expect(service.getAvailableTiers(holeId).has(1)).toBe(true);
        expect(hole.tierStock[1]).toBe(FISHING_HOLE_TIER_CONFIG[1].minReserve);
    });

    it('consumes higher tier stock and schedules regrow when depleted', async () => {
        const holeId = 'sf_fishing_3';
        const hole = service.getHole(holeId);
        hole.tierStock[4] = 1;

        const result = await service.consumeTierStock(holeId, 4);
        expect(result.consumed).toBe(true);
        expect(hole.tierStock[4]).toBe(0);
        expect(result.regrowAt).toBeGreaterThan(Date.now());

        const state = service.getPublicState(holeId);
        const epic = state.tiers.find((t) => t.tier === 4);
        expect(epic.depleted).toBe(true);
        expect(epic.regrowInMs).toBeGreaterThan(0);
    });

    it('reports minnow-only when all higher tiers are empty', () => {
        const holeId = 'sf_fishing_1';
        const hole = service.getHole(holeId);
        for (const tier of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
            hole.tierStock[tier] = 0;
        }

        expect(service.isMinnowOnly(holeId)).toBe(true);
        expect(service.getPublicState(holeId).status).toBe('depleted');
    });

    it('restocks tier after regrow timer passes', async () => {
        const holeId = 'sf_fishing_5';
        const hole = service.getHole(holeId);
        hole.tierStock[3] = 0;
        hole.tierRegrowAt[3] = Date.now() - 1000;

        const regrown = await service.tickRegrowth();
        expect(regrown).toContain(holeId);
        expect(hole.tierStock[3]).toBeGreaterThan(0);
        expect(hole.tierRegrowAt[3]).toBeNull();
    });

    it('filters available tiers for fishing rolls', async () => {
        const holeId = 'fishing_1';
        const hole = service.getHole(holeId);
        hole.tierStock[5] = 0;
        hole.tierStock[6] = 0;
        hole.tierStock[7] = 2;

        const available = service.getAvailableTiers(holeId);
        expect(available.has(5)).toBe(false);
        expect(available.has(7)).toBe(true);
    });

    it('returns room-scoped snapshots', () => {
        const town = service.getSnapshotForRoom('town');
        const snow = service.getSnapshotForRoom('snow_forts');
        expect(town.every((h) => h.room === 'town')).toBe(true);
        expect(snow.every((h) => h.room === 'snow_forts')).toBe(true);
        expect(town.length).toBe(1);
        expect(snow.length).toBe(10);
    });
});
