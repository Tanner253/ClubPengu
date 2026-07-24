import { describe, it, expect } from 'vitest';
import { isChainFeatureLive } from '../config/chainFeatures.js';

describe('chainFeatures', () => {
    it('enables Solana on-chain features', () => {
        expect(isChainFeatureLive('solana', 'dailyBonusClaim')).toBe(true);
        expect(isChainFeatureLive('solana', 'tokenWagers')).toBe(true);
    });

    it('enables EVM daily bonus; other rails still gated', () => {
        expect(isChainFeatureLive('4663', 'dailyBonusClaim')).toBe(true);
        expect(isChainFeatureLive('4663', 'pebblesRail')).toBe(false);
        expect(isChainFeatureLive('4663', 'tokenWagers')).toBe(false);
        expect(isChainFeatureLive('4663', 'nametagTiers')).toBe(true);
    });
});
