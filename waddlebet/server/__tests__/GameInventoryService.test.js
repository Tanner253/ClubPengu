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
    });
});
