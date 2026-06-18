import { describe, it, expect } from 'vitest';
import {
    ECONOMY,
    getBackpackUpgradeInfo,
    getBackpackWoodRequirements,
    slotsNeededToStoreWood
} from '../config/economy.js';

describe('backpack wood upgrade costs', () => {
    it('first wood tier at 5 slots is pine-only', () => {
        expect(getBackpackWoodRequirements(5)).toEqual({ pine_log: 32 });
        expect(getBackpackWoodRequirements(10)).toEqual({ pine_log: 64, birch_log: 40 });
    });

    it('higher tiers require steep multi-type wood', () => {
        const mid = getBackpackWoodRequirements(30);
        const late = getBackpackWoodRequirements(45);
        const final = getBackpackWoodRequirements(50);

        expect(Object.keys(mid).length).toBe(4);
        expect(Object.keys(late).length).toBe(4);
        expect(Object.keys(final).length).toBe(4);

        const midTotal = Object.values(mid).reduce((a, b) => a + b, 0);
        const lateTotal = Object.values(late).reduce((a, b) => a + b, 0);
        const finalTotal = Object.values(final).reduce((a, b) => a + b, 0);

        expect(lateTotal).toBeGreaterThan(midTotal * 1.5);
        expect(finalTotal).toBeGreaterThan(lateTotal);
        expect(final.pine_log).toBeGreaterThanOrEqual(384);
    });

    it('wood costs fit within unlocked slots at every wood-gated tier', () => {
        const { DEFAULT_SLOTS, SLOTS_PER_UPGRADE, MAX_SLOTS, BACKPACK_WOOD_STARTS_AT_UPGRADE } =
            ECONOMY.GAME_INVENTORY;

        for (let slots = DEFAULT_SLOTS; slots < MAX_SLOTS; slots += SLOTS_PER_UPGRADE) {
            const wood = getBackpackWoodRequirements(slots);
            if (!wood) continue;

            const completed = Math.floor((slots - DEFAULT_SLOTS) / SLOTS_PER_UPGRADE);
            const nextUpgrade = completed + 1;
            expect(nextUpgrade).toBeGreaterThanOrEqual(BACKPACK_WOOD_STARTS_AT_UPGRADE);

            const needed = slotsNeededToStoreWood(wood);
            expect(needed).toBeLessThanOrEqual(slots);
        }
    });

    it('upgrade info includes wood from tier costs table', () => {
        const info = getBackpackUpgradeInfo(25);
        expect(info.nextSlots).toBe(30);
        expect(info.woodRequired).toEqual(ECONOMY.GAME_INVENTORY.BACKPACK_WOOD_TIER_COSTS[5]);
        expect(info.cost).toBe(0);
    });
});
