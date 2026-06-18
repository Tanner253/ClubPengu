import { describe, it, expect, vi, beforeEach } from 'vitest';
import FishingService from '../services/FishingService.js';
import { isFishAllowedAtDepth, rollFishAtDepth, rollCatchAtDepth } from '../config/fishingLoot.js';
import { isInventoryCatch } from '../config/gameItems.js';

describe('fishingLoot', () => {
    it('only allows shallow fish at low depth', () => {
        expect(isFishAllowedAtDepth('minnow', 0)).toBe(true);
        expect(isFishAllowedAtDepth('leviathan', 50)).toBe(false);
        expect(isFishAllowedAtDepth('leviathan', 1400)).toBe(true);
    });

    it('rollFishAtDepth returns catalog fish', () => {
        const fish = rollFishAtDepth(0);
        expect(fish?.category).toBe('fish');
        expect(fish?.id).toBeTruthy();
    });

    it('rollCatchAtDepth stores value on catch roll, not catalog only', () => {
        const basic = rollCatchAtDepth(500, 'basic_rod');
        const master = rollCatchAtDepth(500, 'master_rod');
        expect(basic.fish?.category).toBe('fish');
        expect(basic.npcValue).toBeGreaterThan(0);
        expect(basic.weightKg).toBeGreaterThan(0);
        expect(basic.caughtWithRod).toBe('basic_rod');
        expect(master.caughtWithRod).toBe('master_rod');
        expect(master.npcValue).toBeGreaterThan(0);
    });

    it('master rod reaches higher tiers at shallow depth', () => {
        const shallow = 50;
        let masterHighTier = 0;
        for (let i = 0; i < 200; i++) {
            const roll = rollCatchAtDepth(shallow, 'master_rod');
            if ((roll.fish?.tier || 1) >= 3) masterHighTier++;
        }
        let basicHighTier = 0;
        for (let i = 0; i < 200; i++) {
            const roll = rollCatchAtDepth(shallow, 'basic_rod');
            if ((roll.fish?.tier || 1) >= 3) basicHighTier++;
        }
        expect(masterHighTier).toBeGreaterThan(basicHighTier);
    });
});

describe('isInventoryCatch', () => {
    it('rejects unknown and jellyfish ids', () => {
        expect(isInventoryCatch({ id: 'leviathan' })).toBe(true);
        expect(isInventoryCatch({ id: 'fake_dragon', coins: 99999 })).toBe(false);
        expect(isInventoryCatch({ id: 'tiny_jelly' })).toBe(false);
    });
});

describe('FishingService sessions', () => {
    let service;
    let userService;
    let gameInventoryService;

    beforeEach(() => {
        userService = {
            getUser: vi.fn().mockResolvedValue({ coins: 100 }),
            addCoins: vi.fn().mockResolvedValue({ success: true, newBalance: 95 })
        };
        gameInventoryService = {
            ensureInventory: vi.fn().mockResolvedValue({ coins: 100, gameInventory: {} }),
            getEquippedRod: vi.fn().mockReturnValue({ itemId: 'basic_rod', metadata: { durability: 70, maxDurability: 70 } }),
            damageEquippedRod: vi.fn().mockResolvedValue({ broken: false }),
            countItem: vi.fn().mockResolvedValue(12),
            removeItemsById: vi.fn().mockResolvedValue({ success: true }),
            addItem: vi.fn().mockResolvedValue({
                inventory: { usedSlots: 1, slots: [{ itemId: 'minnow' }] }
            }),
            canAddItem: vi.fn().mockResolvedValue({ ok: true })
        };
        service = new FishingService(userService, gameInventoryService, null, null);
    });

    it('requires session for game result', async () => {
        const result = await service.handleGameResult(
            'p1',
            'wallet',
            'town',
            'Test',
            { sessionId: 'bad', success: true, depth: 0, fish: { id: 'leviathan' } },
            false,
            0
        );
        expect(result.error).toBe('NO_SESSION');
    });

    it('rejects second catch on same session', async () => {
        const start = await service.startFishing('p1', 'wallet', 'town', 'spot1', 'Test', 0, false);
        expect(start.sessionId).toBeTruthy();

        const first = await service.handleGameResult(
            'p1',
            'wallet',
            'town',
            'Test',
            { sessionId: start.sessionId, success: true, depth: 0, fish: { id: 'leviathan' } },
            false,
            0
        );
        expect(first.success).toBe(true);

        const second = await service.handleGameResult(
            'p1',
            'wallet',
            'town',
            'Test',
            { sessionId: start.sessionId, success: true, depth: 0, fish: { id: 'leviathan' } },
            false,
            0
        );
        expect(second.error).toBe('SESSION_USED');
    });

    it('server roll ignores client mythic claim at shallow depth', async () => {
        const start = await service.startFishing('p1', 'wallet', 'town', 'spot1', 'Test', 0, false);

        const result = await service.handleGameResult(
            'p1',
            'wallet',
            'town',
            'Test',
            { sessionId: start.sessionId, success: true, depth: 10, fish: { id: 'leviathan' } },
            false,
            0
        );

        expect(result.success).toBe(true);
        expect(result.fish.id).not.toBe('leviathan');
        expect(isFishAllowedAtDepth(result.fish.id, 10)).toBe(true);
    });

    it('grants deep client catch when depth allows (kraken fix)', async () => {
        const start = await service.startFishing('p1', 'wallet', 'town', 'spot1', 'Test', 0, false);

        const result = await service.handleGameResult(
            'p1',
            'wallet',
            'town',
            'Test',
            { sessionId: start.sessionId, success: true, depth: 1400, fish: { id: 'kraken' } },
            false,
            0
        );

        expect(result.success).toBe(true);
        expect(result.fish.id).toBe('kraken');
        expect(gameInventoryService.addItem).toHaveBeenCalledWith(
            'wallet',
            'kraken',
            1,
            expect.objectContaining({ depth: 1400 })
        );
    });

    it('rejects start when backpack is full', async () => {
        gameInventoryService.canAddItem.mockResolvedValue({
            ok: false,
            error: 'INVENTORY_FULL',
            message: 'Backpack is full — upgrade or sell fish'
        });

        const start = await service.startFishing('p1', 'wallet', 'town', 'spot1', 'Test', 0, false);
        expect(start.error).toBe('INVENTORY_FULL');
        expect(gameInventoryService.removeItemsById).not.toHaveBeenCalled();
    });

    it('rejects start when no rod equipped', async () => {
        gameInventoryService.getEquippedRod.mockReturnValue(null);

        const start = await service.startFishing('p1', 'wallet', 'town', 'spot1', 'Test', 0, false);
        expect(start.error).toBe('NO_ROD');
        expect(gameInventoryService.removeItemsById).not.toHaveBeenCalled();
    });

    it('rejects start when no bait worms', async () => {
        gameInventoryService.countItem.mockResolvedValue(0);

        const start = await service.startFishing('p1', 'wallet', 'town', 'spot1', 'Test', 0, false);
        expect(start.error).toBe('NO_BAIT');
        expect(gameInventoryService.removeItemsById).not.toHaveBeenCalled();
    });

    it('demo mode skips rod requirement', async () => {
        gameInventoryService.getEquippedRod.mockReturnValue(null);

        const start = await service.startFishing('p1', null, 'town', 'spot1', 'Guest', 0, true);
        expect(start.success).toBe(true);
        expect(start.isDemo).toBe(true);
        expect(gameInventoryService.ensureInventory).not.toHaveBeenCalled();
    });
});
