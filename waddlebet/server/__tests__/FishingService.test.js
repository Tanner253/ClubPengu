import { describe, it, expect, vi, beforeEach } from 'vitest';
import FishingService from '../services/FishingService.js';
import { isFishAllowedAtDepth, rollFishAtDepth } from '../config/fishingLoot.js';
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
            addItem: vi.fn().mockResolvedValue({
                inventory: { usedSlots: 1, slots: [{ itemId: 'minnow' }] }
            })
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
});
