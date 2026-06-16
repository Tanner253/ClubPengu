import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FOREST_MATURATION } from '../config/forestMaturation.js';

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

    it('regrows tree after regrowAt passes and resets growth timer', async () => {
        const treeId = service.getSnapshot()[0].id;
        await service.harvestTree(treeId);
        const tree = service.getTree(treeId);
        tree.regrowAt = Date.now() - 1000;

        const regrown = await service.tickRegrowth();
        expect(regrown).toContain(treeId);
        expect(service.getTreePublicState(treeId).state).toBe('ready');
        expect(service.getTree(treeId).stageSince).toBeGreaterThan(Date.now() - 5000);
    });

    it('rejects chop on harvested tree', async () => {
        const treeId = service.getSnapshot()[0].id;
        await service.harvestTree(treeId);
        const reserve = service.reserveTree(treeId, 'p1');
        expect(reserve.error).toBe('TREE_REGROWING');
    });

    it('rolls wood loot with manual chop bonus', async () => {
        const { getHarvestableTree } = await import('../config/harvestableTrees.js');
        const manual = service.getSnapshot().find(t => getHarvestableTree(t.id)?.chopMode === 'manual');
        expect(manual).toBeTruthy();
        const result = await service.harvestTree(manual.id, {
            axeItemId: 'basic_axe',
            chopMode: 'manual',
        });
        expect(result.wood).toBeGreaterThanOrEqual(1);
        expect(['pine_log', 'birch_log', 'oak_log', 'ironwood_log']).toContain(result.logItemId);
        expect(result.chopMode).toBe('manual');
    });

    it('reverts harvest to prior tree state', async () => {
        const treeId = service.getSnapshot()[0].id;
        const before = service.getTree(treeId);
        const priorStage = before.stage;

        await service.harvestTree(treeId);
        expect(service.getTreePublicState(treeId).state).toBe('harvested');

        const snapshot = {
            state: 'ready',
            stage: priorStage,
            regrowAt: null,
            choppingBy: null,
            chopStartedAt: null
        };
        await service.revertHarvest(treeId, snapshot);

        const restored = service.getTreePublicState(treeId);
        expect(restored.state).toBe('ready');
        expect(restored.stage).toBe(priorStage);
        expect(restored.regrowAt).toBeNull();
    });

    it('advances ready sapling to baby after growth duration', async () => {
        const treeId = service.getSnapshot().find(t => t.stage === 'sapling')?.id;
        expect(treeId).toBeTruthy();
        const tree = service.getTree(treeId);
        tree.stageSince = Date.now() - FOREST_MATURATION.STAGE_GROWTH_MS.sapling - 1000;

        const updated = await service.tickMaturation();
        expect(updated).toContain(treeId);
        expect(service.getTreePublicState(treeId).stage).toBe('baby');
    });

    it('does not mature harvested stumps', async () => {
        const treeId = service.getSnapshot().find(t => t.stage === 'sapling')?.id;
        await service.harvestTree(treeId);
        const tree = service.getTree(treeId);
        tree.stageSince = Date.now() - FOREST_MATURATION.STAGE_GROWTH_MS.sapling - 1000;

        const updated = await service.tickMaturation();
        expect(updated).not.toContain(treeId);
        expect(service.getTreePublicState(treeId).state).toBe('harvested');
    });

    it('repairs harvested trees missing regrowAt on tick', async () => {
        const treeId = service.getSnapshot()[0].id;
        await service.harvestTree(treeId);
        const tree = service.getTree(treeId);
        tree.regrowAt = null;

        await service.tickRegrowth();
        expect(service.getTree(treeId).regrowAt).toBeGreaterThan(Date.now());
        expect(service.getTreePublicState(treeId).state).toBe('harvested');
    });
});
