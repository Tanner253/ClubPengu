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
        expect(result.goldEarned).toBe(1);
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
        expect(result.goldEarned).toBe(1);
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

    it('mintGoldFromMerchant burns materials and grants gold', async () => {
        const wallet = 'TestWalletMint111111111111111111111111111111';
        const slots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));
        slots[0] = { itemId: 'pine_log', quantity: 80, metadata: { category: 'wood', npcValue: 3 } };

        mockGetUser.mockResolvedValue(makeUser(slots, 12));
        mockFindOneAndUpdate.mockImplementation(async () => makeUser(slots, 12));
        mockAddCoins.mockResolvedValue({ success: true, newBalance: 22 });

        const result = await service.buyFromMerchant(wallet, 'supply_merchant', 'gold_mint_wood_char');

        expect(result.success).toBe(true);
        expect(result.goldMinted).toBe(10);
        expect(result.newBalance).toBe(22);
        expect(mockAddCoins).toHaveBeenCalledWith(
            wallet,
            10,
            'gold_mint',
            expect.objectContaining({ recipeId: 'gold_mint_wood_char' }),
            expect.any(String)
        );
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

    it('buyFromMerchant adds basic axe with wood only (no gold)', async () => {
        const wallet = 'TestWallet1111111111111111111111111111111111';
        const slots = Array.from({ length: 5 }, (_, i) => {
            if (i === 0) return { itemId: 'pine_log', quantity: 80, metadata: { category: 'wood' } };
            return { itemId: null, quantity: 0, metadata: {} };
        });
        const user = makeUser(slots, 5);
        user.coins = 200;

        mockGetUser.mockResolvedValue(user);
        mockFindOneAndUpdate.mockImplementation(async () => {
            const saved = makeUser(slots, 5);
            saved.gameInventory.slots[1] = {
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
            saved.gameInventory.hotbar[0] = { inventorySlot: 1 };
            return saved;
        });

        const result = await service.buyFromMerchant(wallet, 'supply_merchant', 'basic_axe');

        expect(result.success).toBe(true);
        expect(result.goldSpent).toBe(0);
        expect(result.itemId).toBe('basic_axe');
        expect(mockAddCoins).not.toHaveBeenCalled();
    });

    it('upgradeBackpack unlocks more slots with wood only', async () => {
        const wallet = 'TestWallet1111111111111111111111111111111111';
        const slots = Array.from({ length: 5 }, (_, i) => {
            if (i === 0) return { itemId: 'pine_log', quantity: 32, metadata: { category: 'wood' } };
            return { itemId: null, quantity: 0, metadata: {} };
        });

        mockGetUser.mockResolvedValue(makeUser(slots, 5));
        mockFindOneAndUpdate.mockImplementation(async () =>
            makeUser(Array.from({ length: 10 }, () => ({ itemId: null, quantity: 0, metadata: {} })), 10)
        );

        const result = await service.upgradeBackpack(wallet);

        expect(result.success).toBe(true);
        expect(result.unlockedSlots).toBe(10);
        expect(result.goldSpent).toBe(0);
        expect(result.woodSpent).toEqual({ pine_log: 32 });
        expect(mockAddCoins).not.toHaveBeenCalled();
    });

    it('upgradeBackpack from 10 slots requires pine and birch on second wood tier', async () => {
        const wallet = 'TestWallet2222222222222222222222222222222222';
        const slots = Array.from({ length: 10 }, (_, i) => {
            if (i === 0) return { itemId: 'birch_log', quantity: 32, metadata: { category: 'wood' } };
            return { itemId: null, quantity: 0, metadata: {} };
        });

        mockGetUser.mockResolvedValue(makeUser(slots, 10));
        mockAddCoins.mockResolvedValue({ success: true, newBalance: 5000 });

        const result = await service.upgradeBackpack(wallet);

        expect(result.error).toBe('INSUFFICIENT_WOOD');
        expect(result.itemId).toBe('pine_log');
    });

    it('upgradeBackpack from 10 slots consumes pine and birch when stocked', async () => {
        const wallet = 'TestWallet3333333333333333333333333333333333';
        const slots = Array.from({ length: 10 }, (_, i) => {
            if (i === 0) return { itemId: 'pine_log', quantity: 64, metadata: { category: 'wood' } };
            if (i === 1) return { itemId: 'birch_log', quantity: 40, metadata: { category: 'wood' } };
            return { itemId: null, quantity: 0, metadata: {} };
        });

        mockGetUser.mockResolvedValue(makeUser(slots, 10));
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
        expect(result.goldSpent).toBe(0);
        expect(result.woodSpent).toEqual({
            pine_log: 64,
            birch_log: 40,
        });
    });

    it('claimStarterRod grants basic rod once', async () => {
        const wallet = 'TestWallet4444444444444444444444444444444444';
        const emptySlots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));
        const user = makeUser(emptySlots, 5);
        user.fishingProgress.starterRodClaimed = false;

        mockGetUser.mockResolvedValue(user);
        mockFindOneAndUpdate.mockImplementation(async () => {
            const saved = makeUser(emptySlots, 5);
            saved.gameInventory.slots[0] = {
                itemId: 'basic_rod',
                quantity: 1,
                metadata: { category: 'rod', name: 'Basic Rod', durability: 70, maxDurability: 70 }
            };
            saved.fishingProgress.starterRodClaimed = true;
            return saved;
        });

        const result = await service.claimStarterRod(wallet);

        expect(result.success).toBe(true);
        expect(result.itemId).toBe('basic_rod');
        expect(result.inventory.slots[0].itemId).toBe('basic_rod');
    });

    it('claimStarterRod rejects second claim', async () => {
        const wallet = 'TestWallet5555555555555555555555555555555555';
        const slots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));
        const user = makeUser(slots, 5);
        user.fishingProgress.starterRodClaimed = true;
        mockGetUser.mockResolvedValue(user);

        const result = await service.claimStarterRod(wallet);
        expect(result.error).toBe('ALREADY_CLAIMED');
    });

    it('upgradeRod step 1 deducts pine and gold while keeping basic rod', async () => {
        const wallet = 'TestWallet6666666666666666666666666666666666';
        const slots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));
        slots[0] = { itemId: 'basic_rod', quantity: 1, metadata: { category: 'rod', durability: 70, maxDurability: 70 } };
        slots[1] = { itemId: 'pine_log', quantity: 20, metadata: { category: 'wood' } };
        const user = makeUser(slots, 5);
        user.fishingProgress = { ...user.fishingProgress, rodUpgradeStep: 0, starterRodClaimed: true };

        mockGetUser.mockResolvedValue(user);
        mockAddCoins.mockResolvedValue({ success: true, newBalance: 860 });
        mockFindOneAndUpdate.mockImplementation(async () => {
            const saved = makeUser(slots, 5);
            saved.fishingProgress.rodUpgradeStep = 1;
            saved.gameInventory.slots[0] = { itemId: 'basic_rod', quantity: 1, metadata: { category: 'rod', durability: 70, maxDurability: 70 } };
            saved.gameInventory.slots[1] = { itemId: 'pine_log', quantity: 6, metadata: { category: 'wood' } };
            return saved;
        });

        const result = await service.upgradeRod(wallet, 'fish_buyer');
        expect(result.success).toBe(true);
        expect(result.isPartialStep).toBe(true);
        expect(result.goldSpent).toBe(0);
        expect(result.woodSpent).toEqual({ pine_log: 14 });
    });

    it('upgradeRod step 2 grants iron rod', async () => {
        const wallet = 'TestWallet7777777777777777777777777777777777';
        const slots = Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }));
        slots[0] = { itemId: 'basic_rod', quantity: 1, metadata: { category: 'rod', durability: 70, maxDurability: 70 } };
        slots[1] = { itemId: 'pine_log', quantity: 40, metadata: { category: 'wood' } };
        const user = makeUser(slots, 5);
        user.fishingProgress = { ...user.fishingProgress, rodUpgradeStep: 1, starterRodClaimed: true };

        mockGetUser.mockResolvedValue(user);
        mockAddCoins.mockResolvedValue({ success: true, newBalance: 740 });
        mockFindOneAndUpdate.mockImplementation(async () => {
            const saved = makeUser(slots, 5);
            saved.fishingProgress.rodUpgradeStep = 2;
            saved.gameInventory.slots[0] = { itemId: 'iron_rod', quantity: 1, metadata: { category: 'rod', durability: 160, maxDurability: 160 } };
            saved.gameInventory.slots[1] = { itemId: 'pine_log', quantity: 8, metadata: { category: 'wood' } };
            return saved;
        });

        const result = await service.upgradeRod(wallet, 'fish_buyer');
        expect(result.success).toBe(true);
        expect(result.grantsRodId).toBe('iron_rod');
        expect(result.goldSpent).toBe(0);
    });
});
