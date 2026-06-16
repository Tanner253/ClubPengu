/**
 * GameInventoryService — backpack add/move/sell/upgrade
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindOneAndUpdate = vi.fn();
const mockFindOne = vi.fn();
const mockGetUser = vi.fn();
const mockAddCoins = vi.fn();

vi.mock('../db/models/index.js', () => ({
    User: {
        findOneAndUpdate: (...args) => mockFindOneAndUpdate(...args),
        findOne: (...args) => mockFindOne(...args)
    }
}));

const { default: GameInventoryService } = await import('../services/GameInventoryService.js');

function makeUser(slots = [], unlockedSlots = 5) {
    return {
        walletAddress: 'TestWallet1111111111111111111111111111111111',
        gameInventory: {
            columns: 10,
            displayRows: 6,
            unlockedSlots,
            hotbar: [null, null, null, null, null],
            activeHotbar: 0,
            slots
        },
        fishingProgress: {
            skillXp: 0,
            skillLevel: 1,
            totalCatches: 0
        }
    };
}

describe('GameInventoryService', () => {
    let service;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetUser.mockReset();
        mockFindOneAndUpdate.mockReset();
        mockFindOne.mockReset();
        mockAddCoins.mockReset();

        mockAddCoins.mockResolvedValue({ success: true, newBalance: 100 });

        service = new GameInventoryService({
            getUser: mockGetUser,
            addCoins: mockAddCoins
        });
    });

    it('addItem stacks fish into first empty slot', async () => {
        const wallet = 'TestWallet1111111111111111111111111111111111';
        const emptySlots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));
        const user = makeUser(emptySlots, 5);

        mockGetUser.mockResolvedValue(user);
        mockFindOneAndUpdate.mockImplementation(async () => {
            const saved = makeUser(emptySlots, 5);
            saved.gameInventory.slots[0] = {
                itemId: 'minnow',
                quantity: 1,
                metadata: { npcValue: 3, name: 'Minnow', emoji: '🐟', category: 'fish' }
            };
            return saved;
        });

        const result = await service.addItem(wallet, 'minnow', 1, { npcValue: 3, name: 'Minnow', emoji: '🐟' });

        expect(result.error).toBeUndefined();
        expect(result.success).toBe(true);
        expect(result.inventory.usedSlots).toBe(1);
        expect(result.inventory.slots[0].itemId).toBe('minnow');
        expect(result.inventory.slots[0].emoji).toBe('🐟');
        expect(result.inventory.unlockedSlots).toBe(5);
    });

    it('moveSlot merges stacks of the same fish', async () => {
        const wallet = 'TestWallet1111111111111111111111111111111111';
        const slots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));
        slots[0] = { itemId: 'minnow', quantity: 2, metadata: {} };
        slots[1] = { itemId: 'minnow', quantity: 3, metadata: {} };

        mockGetUser.mockResolvedValue(makeUser(slots, 5));
        mockFindOneAndUpdate.mockImplementation(async () => {
            const next = makeUser(slots, 5);
            next.gameInventory.slots[0] = { itemId: null, quantity: 0, metadata: {} };
            next.gameInventory.slots[1] = { itemId: 'minnow', quantity: 5, metadata: {} };
            return next;
        });

        const result = await service.moveSlot(wallet, 0, 1);

        expect(result.success).toBe(true);
        expect(result.inventory.slots[1].quantity).toBe(5);
    });

    it('sellAtMerchant pays gold via Old Salty', async () => {
        const wallet = 'TestWallet1111111111111111111111111111111111';
        const slots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));
        slots[2] = { itemId: 'minnow', quantity: 2, metadata: { npcValue: 3, category: 'fish' } };

        mockGetUser.mockResolvedValue(makeUser(slots, 5));
        mockFindOneAndUpdate.mockImplementation(async () => {
            const next = makeUser(slots, 5);
            next.gameInventory.slots[2] = { itemId: 'minnow', quantity: 1, metadata: { npcValue: 3, category: 'fish' } };
            return next;
        });

        const result = await service.sellAtMerchant(wallet, 'fish_buyer', 2, 1);

        expect(result.success).toBe(true);
        expect(result.merchantName).toBe('Old Salty');
        expect(result.goldEarned).toBeGreaterThan(0);
        expect(mockAddCoins).toHaveBeenCalled();
    });

    it('sellAtMerchant pays reduced gold at forest ranger', async () => {
        const wallet = 'TestWallet2222222222222222222222222222222222';
        const slots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));
        slots[0] = { itemId: 'pine_log', quantity: 4, metadata: { npcValue: 3, category: 'wood' } };

        mockGetUser.mockResolvedValue(makeUser(slots, 5));
        mockFindOneAndUpdate.mockImplementation(async () => {
            const next = makeUser(slots, 5);
            next.gameInventory.slots[0] = { itemId: 'pine_log', quantity: 2, metadata: { npcValue: 3, category: 'wood' } };
            return next;
        });

        const result = await service.sellAtMerchant(wallet, 'forest_ranger', 0, 2);

        expect(result.success).toBe(true);
        expect(result.merchantName).toBe('Ranger Pike');
        expect(result.goldEarned).toBe(2);
        expect(mockAddCoins).toHaveBeenCalled();
    });

    it('sellBatchAtMerchant sells multiple stacks in one payout', async () => {
        const wallet = 'TestWallet3333333333333333333333333333333333';
        const slots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));
        slots[0] = { itemId: 'pine_log', quantity: 2, metadata: { npcValue: 3, category: 'wood' } };
        slots[1] = { itemId: 'forest_mushroom', quantity: 3, metadata: { npcValue: 8, category: 'forage' } };

        mockGetUser.mockResolvedValue(makeUser(slots, 5));
        mockFindOneAndUpdate.mockImplementation(async () => makeUser(slots, 5));

        const result = await service.sellBatchAtMerchant(wallet, 'forest_ranger', [
            { slotIndex: 0, quantity: 2 },
            { slotIndex: 1, quantity: 3 },
        ]);

        expect(result.success).toBe(true);
        expect(result.stacksSold).toBe(2);
        expect(result.goldEarned).toBeGreaterThan(0);
        expect(mockAddCoins).toHaveBeenCalledTimes(1);
    });

    it('buyFromMerchant rejects iron axe without basic axe in backpack', async () => {
        const wallet = 'TestWallet4444444444444444444444444444444444';
        const slots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));
        mockGetUser.mockResolvedValue({ ...makeUser(slots, 5), coins: 5000 });
        mockFindOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue({ ...makeUser(slots, 5), coins: 5000 }),
        });

        const result = await service.buyFromMerchant(wallet, 'supply_merchant', 'iron_axe');

        expect(result.error).toBe('MISSING_TOOL_PREREQUISITE');
        expect(result.requiredItemId).toBe('basic_axe');
        expect(mockAddCoins).not.toHaveBeenCalled();
    });

    it('buyFromMerchant adds basic axe and deducts gold', async () => {
        const wallet = 'TestWallet1111111111111111111111111111111111';
        const slots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));
        const user = makeUser(slots, 5);
        user.coins = 200;

        mockGetUser.mockResolvedValue(user);
        mockAddCoins.mockResolvedValue({ success: true, newBalance: 125 });
        mockFindOneAndUpdate.mockImplementation(async () => {
            const saved = makeUser(slots, 5);
            saved.gameInventory.slots[0] = {
                itemId: 'basic_axe',
                quantity: 1,
                metadata: {
                    category: 'tool',
                    name: 'Basic Axe',
                    emoji: '🪓',
                    durability: 100,
                    maxDurability: 100
                }
            };
            saved.gameInventory.hotbar[0] = { inventorySlot: 0 };
            return saved;
        });

        const result = await service.buyFromMerchant(wallet, 'supply_merchant', 'basic_axe');

        expect(result.success).toBe(true);
        expect(result.goldSpent).toBe(100);
        expect(result.itemId).toBe('basic_axe');
        expect(mockAddCoins).toHaveBeenCalledWith(
            wallet,
            -100,
            'merchant_buy',
            expect.any(Object),
            expect.any(String)
        );
    });

    it('upgradeBackpack unlocks more slots for gold', async () => {
        const wallet = 'TestWallet1111111111111111111111111111111111';
        const slots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));

        mockGetUser.mockResolvedValue(makeUser(slots, 5));
        mockAddCoins.mockResolvedValue({ success: true, newBalance: 50 });
        mockFindOneAndUpdate.mockImplementation(async () =>
            makeUser(Array.from({ length: 10 }, () => ({ itemId: null, quantity: 0, metadata: {} })), 10)
        );

        const result = await service.upgradeBackpack(wallet);

        expect(result.success).toBe(true);
        expect(result.unlockedSlots).toBe(10);
        expect(result.goldSpent).toBe(250);
        expect(result.woodSpent).toBeNull();
    });

    it('upgradeBackpack from 10 slots requires all wood types', async () => {
        const wallet = 'TestWallet2222222222222222222222222222222222';
        const slots = Array.from({ length: 10 }, (_, i) => {
            if (i === 0) return { itemId: 'pine_log', quantity: 20, metadata: { category: 'wood' } };
            if (i === 1) return { itemId: 'birch_log', quantity: 32, metadata: { category: 'wood' } };
            if (i === 2) return { itemId: 'oak_log', quantity: 32, metadata: { category: 'wood' } };
            if (i === 3) return { itemId: 'ironwood_log', quantity: 32, metadata: { category: 'wood' } };
            return { itemId: null, quantity: 0, metadata: {} };
        });

        mockGetUser.mockResolvedValue(makeUser(slots, 10));
        mockAddCoins.mockResolvedValue({ success: true, newBalance: 5000 });

        const result = await service.upgradeBackpack(wallet);

        expect(result.error).toBe('INSUFFICIENT_WOOD');
        expect(result.itemId).toBe('pine_log');
    });

    it('upgradeBackpack from 10 slots consumes wood and gold when stocked', async () => {
        const wallet = 'TestWallet3333333333333333333333333333333333';
        const slots = Array.from({ length: 10 }, (_, i) => {
            if (i < 4) {
                const ids = ['pine_log', 'birch_log', 'oak_log', 'ironwood_log'];
                return { itemId: ids[i], quantity: 32, metadata: { category: 'wood' } };
            }
            return { itemId: null, quantity: 0, metadata: {} };
        });

        mockGetUser.mockResolvedValue(makeUser(slots, 10));
        mockAddCoins.mockResolvedValue({ success: true, newBalance: 4000 });
        mockFindOneAndUpdate.mockImplementation(async (_q, update) => {
            const saved = makeUser(Array.from({ length: 15 }, () => ({ itemId: null, quantity: 0, metadata: {} })), 15);
            if (update?.$set?.['gameInventory.unlockedSlots']) {
                saved.gameInventory.unlockedSlots = update.$set['gameInventory.unlockedSlots'];
            }
            return saved;
        });

        const result = await service.upgradeBackpack(wallet);

        expect(result.success).toBe(true);
        expect(result.unlockedSlots).toBe(15);
        expect(result.woodSpent).toEqual({
            pine_log: 32,
            birch_log: 32,
            oak_log: 32,
            ironwood_log: 32
        });
    });
});
