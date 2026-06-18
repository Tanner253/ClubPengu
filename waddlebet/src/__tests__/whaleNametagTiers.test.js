import { describe, it, expect } from 'vitest';
import {
    getTierFromBalance,
    resolveNametagStyle,
    getParticlePresetForNametagStyle,
    isStyledNametag,
    getDiamondFlipperProfileLabel,
    getPlayerProfileStatusLabels,
} from '../config/whaleNametagTiers.js';

describe('whaleNametagTiers', () => {
    it('maps $CP balance to whitepaper tiers', () => {
        expect(getTierFromBalance(0)).toBe('standard');
        expect(getTierFromBalance(999)).toBe('standard');
        expect(getTierFromBalance(1_000)).toBe('bronze');
        expect(getTierFromBalance(10_000)).toBe('silver');
        expect(getTierFromBalance(100_000)).toBe('gold');
        expect(getTierFromBalance(1_000_000)).toBe('diamond');
        expect(getTierFromBalance(10_000_000)).toBe('legendary');
    });

    it('resolves manual day1 and default overrides', () => {
        expect(resolveNametagStyle({
            appearance: { nametagStyle: 'day1' },
            cpNametagTier: 'gold',
            isAuthenticated: true,
            walletAddress: 'abc',
        })).toBe('day1');

        expect(resolveNametagStyle({
            appearance: { nametagStyle: 'default' },
            cpNametagTier: 'diamond',
            isAuthenticated: true,
            walletAddress: 'abc',
        })).toBe('default');
    });

    it('uses balance tier for Diamond Flippers mode', () => {
        expect(resolveNametagStyle({
            appearance: { nametagStyle: 'tier' },
            cpNametagTier: 'silver',
            isAuthenticated: true,
            walletAddress: 'abc',
        })).toBe('silver');

        expect(resolveNametagStyle({
            appearance: {},
            cpNametagTier: 'gold',
            isAuthenticated: true,
            walletAddress: 'abc',
        })).toBe('gold');
    });

    it('assigns particle presets by resolved style', () => {
        expect(getParticlePresetForNametagStyle('day1')).toBe('goldRain');
        expect(getParticlePresetForNametagStyle('silver')).toBe('sparkle');
        expect(getParticlePresetForNametagStyle('gold')).toBe('goldRain');
        expect(getParticlePresetForNametagStyle('diamond')).toBe('whaleRain');
        expect(getParticlePresetForNametagStyle('default')).toBeNull();
    });

    it('flags styled nametags for animation', () => {
        expect(isStyledNametag('day1')).toBe(true);
        expect(isStyledNametag('gold')).toBe(true);
        expect(isStyledNametag('default')).toBe(false);
        expect(isStyledNametag('standard')).toBe(false);
    });

    it('builds profile status labels outside the 3D nametag', () => {
        expect(getDiamondFlipperProfileLabel('diamond')).toBe('💎 Diamond Flipper');
        expect(getDiamondFlipperProfileLabel('legendary')).toBe('👑 Legendary Diamond Flipper');
        expect(getDiamondFlipperProfileLabel('standard')).toBeNull();

        expect(getPlayerProfileStatusLabels({
            appearance: { nametagStyle: 'day1' },
            cpNametagTier: 'gold',
        })).toEqual(['⭐ Day 1 Supporter', '🥇 Gold Diamond Flipper']);
    });
});
