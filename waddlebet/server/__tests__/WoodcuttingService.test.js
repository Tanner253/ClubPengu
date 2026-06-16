/**

 * WoodcuttingService tests

 */



import { describe, it, expect, vi, beforeEach } from 'vitest';



const mockGetUser = vi.fn();

const mockGetEquippedTool = vi.fn();

const mockAddItem = vi.fn();

const mockDamageEquippedTool = vi.fn();



const mockForestTreeService = {
    isReady: vi.fn(() => true),
    isAvailableForPlayer: vi.fn(() => true),
    reserveTree: vi.fn(() => ({
        success: true,
        treeState: { id: 'ht_001', state: 'ready', choppingBy: 'p1' }
    })),
    releaseTree: vi.fn(() => ({ id: 'ht_001', state: 'ready', choppingBy: null })),
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
    }))
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
            regrowAt: Date.now() + 1800000
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

                addItem: mockAddItem

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

        expect(mockForestTreeService.harvestTree).toHaveBeenCalledWith('ht_001');

        expect(mockAddItem).toHaveBeenCalledWith('wallet', 'pine_log', 1, expect.any(Object));

        expect(mockDamageEquippedTool).toHaveBeenCalledWith(
            'wallet',
            getChopDurabilityLoss(getHarvestableTree('ht_001').stage, 'basic_axe')
        );

    });

});


