/**

 * WoodcuttingService tests

 */



import { describe, it, expect, vi, beforeEach } from 'vitest';



const mockGetUser = vi.fn();

const mockGetEquippedTool = vi.fn();

const mockAddItem = vi.fn();

const mockCanAddItem = vi.fn();

const mockDamageEquippedTool = vi.fn();



const mockForestTreeService = {
    isReady: vi.fn(() => true),
    isAvailableForPlayer: vi.fn(() => true),
    getTree: vi.fn((treeId) => {
        const def = getHarvestableTree(treeId);
        return def ? { id: treeId, stage: def.stage, state: 'ready' } : null;
    }),
    reserveTree: vi.fn(() => ({
        success: true,
        treeState: { id: 'ht_001', state: 'ready', choppingBy: 'p1' }
    })),
    releaseTree: vi.fn(() => ({ id: 'ht_001', state: 'ready', choppingBy: null })),
    revertHarvest: vi.fn(async () => ({ id: 'ht_001', state: 'ready', choppingBy: null })),
    harvestTree: vi.fn(async () => ({
        wood: 1,
        logItemId: 'pine_log',
        stage: 'sapling',
        label: 'Sapling',
        regrowAt: Date.now() + 1800000
    })),
    getTreePublicState: vi.fn(() => ({
        id: 'ht_001',
        state: 'harvested',
        regrowAt: Date.now() + 1800000
    })),
    recordForestChop: vi.fn()
};



vi.mock('../config/gameItems.js', () => ({

    getGameItem: (id) => ({

        pine_log: { name: 'Pine Log', emoji: '🪵', tier: 1, npcValue: 4 }

    }[id] || { name: id, emoji: '🪵', tier: 1, npcValue: 4 })

}));



const { default: WoodcuttingService } = await import('../services/WoodcuttingService.js');
const { getHarvestableTree } = await import('../config/harvestableTrees.js');
const { getChopDurabilityLoss } = await import('../config/economy.js');



describe('WoodcuttingService', () => {

    let service;



    beforeEach(() => {

        vi.clearAllMocks();

        mockGetUser.mockResolvedValue({ gameInventory: { hotbar: [{ itemId: 'basic_axe' }], activeHotbar: 0 } });

        mockGetEquippedTool.mockReturnValue({

            itemId: 'basic_axe',

            inventorySlot: 0,

            durability: 50,

            maxDurability: 100

        });

        mockAddItem.mockResolvedValue({ success: true, inventory: { usedSlots: 1 } });
        mockCanAddItem.mockResolvedValue({ ok: true });

        mockDamageEquippedTool.mockResolvedValue({

            broken: false,

            durability: 49,

            maxDurability: 100,

            inventory: { usedSlots: 1 }

        });

        mockForestTreeService.isReady.mockReturnValue(true);
        mockForestTreeService.isAvailableForPlayer.mockReturnValue(true);
        mockForestTreeService.reserveTree.mockReturnValue({
            success: true,
            treeState: { id: 'ht_001', state: 'ready', choppingBy: 'p1' }
        });
        mockForestTreeService.harvestTree.mockReturnValue({
            wood: 1,
            logItemId: 'pine_log',
            stage: 'sapling',
            label: 'Sapling',
            regrowAt: Date.now() + 1800000,
            preHarvest: { state: 'ready', stage: 'mature', regrowAt: null, choppingBy: 'p1', chopStartedAt: 1 }
        });
        mockForestTreeService.getTreePublicState.mockReturnValue({
            id: 'ht_01',
            state: 'harvested',
            regrowAt: Date.now() + 1800000
        });

        service = new WoodcuttingService(

            { getUser: mockGetUser },

            {

                getEquippedTool: mockGetEquippedTool,

                userService: { getUser: mockGetUser },

                damageEquippedTool: mockDamageEquippedTool,

                addItem: mockAddItem,

                canAddItem: mockCanAddItem

            },

            mockForestTreeService,

            () => {}

        );

    });



    it('rejects chop without equipped axe', async () => {

        mockGetEquippedTool.mockReturnValue(null);

        const result = await service.startChop('p1', 'wallet', 'ht_001', false);

        expect(result.error).toBe('NO_AXE');

    });



    it('starts session when axe is equipped on hotbar', async () => {

        const result = await service.startChop('p1', 'wallet', 'ht_001', false);

        expect(result.success).toBe(true);

        expect(result.sessionId).toBeTruthy();

        expect(result.treeId).toBe('ht_001');

        expect(result.axeDurability).toBe(50);

    });



    it('grants stage wood and damages axe on successful chop result', async () => {

        const start = await service.startChop('p1', 'wallet', 'ht_001', false);

        const result = await service.handleChopResult('p1', 'wallet', {

            sessionId: start.sessionId,

            success: true

        });

        expect(result.success).toBe(true);

        expect(result.wood.id).toBe('pine_log');

        expect(mockForestTreeService.harvestTree).toHaveBeenCalledWith('ht_001', expect.objectContaining({
            axeItemId: 'basic_axe',
            chopMode: 'hold',
            loot: expect.objectContaining({ logItemId: expect.any(String), quantity: expect.any(Number) })
        }));

        expect(mockAddItem).toHaveBeenCalledWith('wallet', 'pine_log', 1, expect.any(Object));

        expect(mockDamageEquippedTool).toHaveBeenCalledWith(
            'wallet',
            getChopDurabilityLoss(getHarvestableTree('ht_001').stage, 'basic_axe')
        );

    });

    it('rejects hold chop on manual tree', async () => {
        const manualTree = getHarvestableTree('ht_002');
        expect(manualTree?.chopMode).toBe('manual');
        const result = await service.startChop('p1', 'wallet', 'ht_002', false);
        expect(result.error).toBe('MANUAL_TREE');
    });

    it('starts manual chop session for voxel trees', async () => {
        const result = await service.startManualChop('p1', 'wallet', 'ht_002', false);
        expect(result.success).toBe(true);
        expect(result.chopMode).toBe('manual');
        expect(result.woodYield).toBeGreaterThan(1);
    });

    it('manual chop hit tracks cuts and triggers fall', async () => {
        vi.useFakeTimers();
        const start = await service.startManualChop('p1', 'wallet', 'ht_002', false);
        let falling = false;
        for (let i = 0; i < 80 && !falling; i++) {
            vi.advanceTimersByTime(150);
            const side = i % 2 === 0 ? -1 : 1;
            const hit = service.manualChopHit('p1', {
                sessionId: start.sessionId,
                side,
                speed: 4
            });
            if (hit.success) falling = hit.falling;
        }
        vi.useRealTimers();
        expect(falling).toBe(true);
        const extraHit = service.manualChopHit('p1', {
            sessionId: start.sessionId,
            side: -1,
            speed: 4
        });
        expect(extraHit.success).toBe(true);
        expect(extraHit.falling).toBe(true);
        expect(extraHit.error).toBeUndefined();
        const complete = await service.completeManualChop('p1', 'wallet', { sessionId: start.sessionId });
        expect(complete.success).toBe(true);
        expect(mockForestTreeService.harvestTree).toHaveBeenCalledWith('ht_002', expect.objectContaining({
            axeItemId: 'basic_axe',
            chopMode: 'manual'
        }));
    });

    it('rejects chop start when backpack is full', async () => {
        mockCanAddItem.mockResolvedValue({
            ok: false,
            error: 'INVENTORY_FULL',
            message: 'Backpack is full — upgrade or sell items'
        });

        const result = await service.startChop('p1', 'wallet', 'ht_001', false);
        expect(result.error).toBe('INVENTORY_FULL');
        expect(mockForestTreeService.reserveTree).not.toHaveBeenCalled();
    });

    it('rejects chop when backpack is full before harvesting tree', async () => {
        mockCanAddItem
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValue({ ok: false, error: 'INVENTORY_FULL', message: 'Backpack is full — upgrade or sell items' });

        const start = await service.startChop('p1', 'wallet', 'ht_001', false);
        expect(start.success).toBe(true);
        const result = await service.handleChopResult('p1', 'wallet', {
            sessionId: start.sessionId,
            success: true
        });

        expect(result.error).toBe('INVENTORY_FULL');
        expect(mockForestTreeService.harvestTree).not.toHaveBeenCalled();
        expect(mockAddItem).not.toHaveBeenCalled();
    });

    it('reverts harvest when addItem fails after chop', async () => {
        mockAddItem.mockResolvedValue({
            error: 'INVENTORY_FULL',
            message: 'Backpack is full — upgrade or sell items'
        });

        const start = await service.startChop('p1', 'wallet', 'ht_001', false);
        const result = await service.handleChopResult('p1', 'wallet', {
            sessionId: start.sessionId,
            success: true
        });

        expect(result.error).toBe('INVENTORY_FULL');
        expect(mockForestTreeService.harvestTree).toHaveBeenCalled();
        expect(mockForestTreeService.revertHarvest).toHaveBeenCalled();
    });

});


