import { describe, it, expect } from 'vitest';
import { isChainFeatureLive } from '../config/chainFeatures.js';

describe('server chainFeatures', () => {
    it('enables Solana pebbles rail', () => {
        expect(isChainFeatureLive('solana', 'pebblesRail')).toBe(true);
    });

    it('enables EVM USD-pegged pebbles rail', () => {
        expect(isChainFeatureLive('4663', 'pebblesRail')).toBe(true);
        expect(isChainFeatureLive('4663', 'tokenWagers')).toBe(false);
    });
});
