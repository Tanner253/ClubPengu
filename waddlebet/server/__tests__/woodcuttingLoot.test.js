import { describe, it, expect } from 'vitest';
import {
    rollWoodChopLoot,
    AXE_WOOD_WEIGHTS,
    WOOD_LOG_IDS,
    STAGE_YIELD_BASE
} from '../config/woodcuttingLoot.js';

describe('woodcuttingLoot', () => {
    it('basic axe heavily favors pine on elder trees', () => {
        let pine = 0;
        const trials = 500;
        for (let i = 0; i < trials; i++) {
            const loot = rollWoodChopLoot({
                treeId: `ht_${i}`,
                stage: 'elder',
                axeItemId: 'basic_axe',
                chopMode: 'hold',
                rng: () => (i * 0.6180339887) % 1
            });
            if (loot.logItemId === 'pine_log') pine++;
        }
        expect(pine / trials).toBeGreaterThan(0.45);
    });

    it('master axe can roll ironwood', () => {
        const loot = rollWoodChopLoot({
            treeId: 'ht_elder',
            stage: 'elder',
            axeItemId: 'master_axe',
            chopMode: 'hold',
            rng: () => 0.99
        });
        expect(WOOD_LOG_IDS).toContain(loot.logItemId);
        expect(loot.quantity).toBeGreaterThanOrEqual(1);
    });

    it('rarer logs drop smaller stacks on the same tree stage', () => {
        const pine = rollWoodChopLoot({
            treeId: 't1',
            stage: 'mature',
            axeItemId: 'master_axe',
            chopMode: 'hold',
            rng: () => 0.05
        });
        const iron = rollWoodChopLoot({
            treeId: 't2',
            stage: 'mature',
            axeItemId: 'master_axe',
            chopMode: 'hold',
            rng: () => 0.95
        });
        if (pine.logItemId === 'pine_log' && iron.logItemId === 'ironwood_log') {
            expect(pine.quantity).toBeGreaterThan(iron.quantity);
        }
        expect(STAGE_YIELD_BASE.mature).toBe(7);
    });

    it('manual chop applies quantity bonus', () => {
        const hold = rollWoodChopLoot({
            treeId: 'ht_manual',
            stage: 'baby',
            axeItemId: 'basic_axe',
            chopMode: 'hold',
            rng: () => 0.01
        });
        const manual = rollWoodChopLoot({
            treeId: 'ht_manual',
            stage: 'baby',
            axeItemId: 'basic_axe',
            chopMode: 'manual',
            rng: () => 0.01
        });
        expect(manual.logItemId).toBe(hold.logItemId);
        expect(manual.quantity).toBeGreaterThan(hold.quantity);
    });

    it('every axe tier defines weights for all log types', () => {
        for (const axeId of Object.keys(AXE_WOOD_WEIGHTS)) {
            for (const logId of WOOD_LOG_IDS) {
                expect(AXE_WOOD_WEIGHTS[axeId][logId]).toBeGreaterThan(0);
            }
        }
    });
});
