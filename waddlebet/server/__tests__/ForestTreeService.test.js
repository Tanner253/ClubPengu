import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/connection.js', () => ({
    isDBConnected: vi.fn(() => false)
}));

const { default: ForestTreeService } = await import('../services/ForestTreeService.js');

describe('ForestTreeService', () => {
    let service;

    beforeEach(() => {
        service = new ForestTreeService();
    });

    it('starts all trees as ready', () => {
        const snap = service.getSnapshot();
        expect(snap.length).toBeGreaterThan(0);
        expect(snap.every(t => t.state === 'ready')).toBe(true);
    });

    it('marks tree harvested with regrowAt timestamp', async () => {
        const treeId = service.getSnapshot()[0].id;
        const result = await service.harvestTree(treeId);
        expect(result.error).toBeUndefined();
        expect(result.regrowAt).toBeGreaterThan(Date.now());

        const state = service.getTreePublicState(treeId);
        expect(state.state).toBe('harvested');
        expect(state.stage).toBe('sapling');
        expect(state.regrowAt).toBe(result.regrowAt);
    });

    it('regrows tree after regrowAt passes', async () => {
        const treeId = service.getSnapshot()[0].id;
        await service.harvestTree(treeId);
        const tree = service.getTree(treeId);
        tree.regrowAt = Date.now() - 1000;

        const regrown = await service.tickRegrowth();
        expect(regrown).toContain(treeId);
        expect(service.getTreePublicState(treeId).state).toBe('ready');
    });

    it('rejects chop on harvested tree', async () => {
        const treeId = service.getSnapshot()[0].id;
        await service.harvestTree(treeId);
        const reserve = service.reserveTree(treeId, 'p1');
        expect(reserve.error).toBe('TREE_REGROWING');
    });

    it('applies 1.5× wood for manual chop trees', async () => {
        const { getHarvestableTree } = await import('../config/harvestableTrees.js');
        const manual = service.getSnapshot().find(t => getHarvestableTree(t.id)?.chopMode === 'manual');
        expect(manual).toBeTruthy();
        const result = await service.harvestTree(manual.id);
        const def = getHarvestableTree(manual.id);
        const baseWood = { sapling: 1, baby: 6, mature: 12, elder: 25 }[manual.stage];
        expect(result.wood).toBe(Math.round(baseWood * 1.5));
        expect(result.chopMode).toBe('manual');
    });

    it('matures ready trees when the forest has been quiet', async () => {
        const treeId = service.getSnapshot().find(t => t.stage === 'sapling')?.id;
        expect(treeId).toBeTruthy();
        service.lastForestChopAt = Date.now() - 2 * 60 * 60 * 1000;
        const updated = await service.tickMaturation();
        expect(updated.length).toBeGreaterThan(0);
        const elderCount = service.getSnapshot().filter(t => t.stage === 'elder').length;
        expect(elderCount).toBeGreaterThan(0);
    });
});
