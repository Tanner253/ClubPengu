import { describe, it, expect, beforeEach } from 'vitest';
import WorldDropService from '../services/WorldDropService.js';
import { WORLD_DROP_DESPAWN_MS, WORLD_DROP_PICKUP_RADIUS } from '../config/worldDrops.js';

describe('WorldDropService', () => {
    let service;

    beforeEach(() => {
        service = new WorldDropService();
    });

    it('creates a drop in front of the player', () => {
        const drop = service.createDrop(
            'town',
            { itemId: 'minnow', quantity: 1, metadata: { tier: 1 } },
            { x: 10, y: 0, z: 20 },
            0,
            'player1'
        );
        expect(drop.itemId).toBe('minnow');
        expect(drop.x).toBeCloseTo(10);
        expect(drop.z).toBeGreaterThan(20);
        expect(drop.expiresAt).toBeGreaterThan(Date.now());
    });

    it('returns snapshot for a room', () => {
        service.createDrop(
            'town',
            { itemId: 'worm', quantity: 3, metadata: {} },
            { x: 0, y: 0, z: 0 },
            0
        );
        const snapshot = service.getSnapshot('town');
        expect(snapshot).toHaveLength(1);
        expect(snapshot[0].quantity).toBe(3);
    });

    it('rejects pickup when too far', () => {
        const drop = service.createDrop(
            'town',
            { itemId: 'forest_mushroom', quantity: 1, metadata: {} },
            { x: 0, y: 0, z: 0 },
            0
        );
        const result = service.tryPickup(drop.id, 'town', { x: 50, z: 50 });
        expect(result.error).toBe('TOO_FAR');
        expect(service.getDrop('town', drop.id)).toBeTruthy();
    });

    it('allows pickup within radius and removes drop', () => {
        const drop = service.createDrop(
            'town',
            { itemId: 'pine_log', quantity: 1, metadata: { tier: 1 } },
            { x: 5, y: 0, z: 5 },
            0
        );
        const pos = { x: drop.x + WORLD_DROP_PICKUP_RADIUS * 0.5, z: drop.z };
        const result = service.tryPickup(drop.id, 'town', pos);
        expect(result.success).toBe(true);
        expect(result.drop.itemId).toBe('pine_log');
        expect(service.getDrop('town', drop.id)).toBeNull();
    });

    it('purges expired drops', () => {
        const drop = service.createDrop(
            'forest_trails',
            { itemId: 'basic_axe', quantity: 1, metadata: {} },
            { x: 1, y: 0, z: 1 },
            0
        );
        drop.expiresAt = Date.now() - 1;
        service.restoreDrop(drop);
        const removed = service.purgeExpired('forest_trails');
        expect(removed).toEqual([{ room: 'forest_trails', dropId: drop.id }]);
        expect(service.getSnapshot('forest_trails')).toHaveLength(0);
    });

    it('validatePickup does not remove the drop', () => {
        const drop = service.createDrop(
            'town',
            { itemId: 'worm', quantity: 1, metadata: {} },
            { x: 0, y: 0, z: 0 },
            0
        );
        const validated = service.validatePickup(drop.id, 'town', { x: drop.x, z: drop.z });
        expect(validated.success).toBe(true);
        expect(service.getDrop('town', drop.id)).toBeTruthy();
    });

    it('restoreDrop puts item back after failed inventory add', () => {
        const original = service.createDrop(
            'town',
            { itemId: 'worm', quantity: 1, metadata: {} },
            { x: 2, y: 0, z: 2 },
            0
        );
        service.removeDrop('town', original.id);
        service.restoreDrop(original);
        expect(service.getSnapshot('town')).toHaveLength(1);
    });

    it('expiresAt is roughly five minutes from creation', () => {
        const before = Date.now();
        const drop = service.createDrop(
            'town',
            { itemId: 'minnow', quantity: 1, metadata: {} },
            { x: 0, y: 0, z: 0 },
            0
        );
        expect(drop.expiresAt - before).toBeGreaterThanOrEqual(WORLD_DROP_DESPAWN_MS - 50);
        expect(drop.expiresAt - before).toBeLessThanOrEqual(WORLD_DROP_DESPAWN_MS + 50);
    });
});
