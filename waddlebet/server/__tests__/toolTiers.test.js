import { describe, it, expect } from 'vitest';
import {
    getPreviousTierToolId,
    getToolPurchasePrerequisite,
} from '../config/toolTiers.js';

describe('toolTiers', () => {
    it('returns previous tier in axe chain', () => {
        expect(getPreviousTierToolId('basic_axe')).toBeNull();
        expect(getPreviousTierToolId('iron_axe')).toBe('basic_axe');
        expect(getPreviousTierToolId('steel_axe')).toBe('iron_axe');
        expect(getPreviousTierToolId('master_axe')).toBe('steel_axe');
    });

    it('blocks purchase when previous tier is missing', () => {
        const owns = new Set(['basic_axe']);
        const prereq = getToolPurchasePrerequisite(
            'steel_axe',
            (id) => owns.has(id)
        );
        expect(prereq?.requiredItemId).toBe('iron_axe');
    });

    it('allows purchase when previous tier is owned', () => {
        const owns = new Set(['basic_axe', 'iron_axe']);
        expect(getToolPurchasePrerequisite('steel_axe', (id) => owns.has(id))).toBeNull();
    });
});
