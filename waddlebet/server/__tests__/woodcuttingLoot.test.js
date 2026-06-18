import { describe, it, expect } from 'vitest';
import {
    rollWoodChopLoot,
    WOOD_LOG_IDS,
    STAGE_YIELD_BASE,
    getWoodChopQuantityForLog,
} from '../config/woodcuttingLoot.js';
import { HARVESTABLE_TREES, getHarvestableTree } from '../config/harvestableTrees.js';
import { TREE_WOOD_SPECIES } from '../config/treeWoodSpecies.js';

describe('woodcuttingLoot', () => {
    it('returns the tree species log type — not a random axe roll', () => {
        const birchTree = HARVESTABLE_TREES.find((t) => t.woodType === 'birch_log');
        expect(birchTree).toBeTruthy();

        const loot = rollWoodChopLoot({
            treeId: birchTree.id,
            stage: 'mature',
            axeItemId: 'basic_axe',
            chopMode: 'hold',
        });
        expect(loot.logItemId).toBe('birch_log');
    });

    it('ironwood trees always grant ironwood', () => {
        const ironTree = HARVESTABLE_TREES.find((t) => t.woodType === 'ironwood_log');
        expect(ironTree).toBeTruthy();
        const loot = rollWoodChopLoot({
            treeId: ironTree.id,
            stage: 'elder',
            axeItemId: 'master_axe',
            chopMode: 'hold',
        });
        expect(loot.logItemId).toBe('ironwood_log');
    });

    it('rarer logs drop smaller stacks on the same tree stage', () => {
        const pineQty = getWoodChopQuantityForLog('mature', 'pine_log', 'master_axe', 'hold');
        const ironQty = getWoodChopQuantityForLog('mature', 'ironwood_log', 'master_axe', 'hold');
        expect(pineQty).toBeGreaterThan(ironQty);
        expect(STAGE_YIELD_BASE.mature).toBe(7);
    });

    it('manual chop applies quantity bonus silently', () => {
        const hold = getWoodChopQuantityForLog('baby', 'pine_log', 'basic_axe', 'hold');
        const manual = getWoodChopQuantityForLog('baby', 'pine_log', 'basic_axe', 'manual');
        expect(manual).toBeGreaterThan(hold);
    });

    it('spawn weights sum to 100 across all species', () => {
        const total = WOOD_LOG_IDS.reduce((sum, id) => sum + TREE_WOOD_SPECIES[id].spawnWeight, 0);
        expect(total).toBe(100);
    });

    it('every harvestable tree has a wood type', () => {
        for (const tree of HARVESTABLE_TREES) {
            expect(WOOD_LOG_IDS).toContain(tree.woodType);
            expect(getHarvestableTree(tree.id)?.woodType).toBe(tree.woodType);
        }
    });
});
