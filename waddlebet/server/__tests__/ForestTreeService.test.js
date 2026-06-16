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
});
