import { describe, it, expect, vi, beforeEach } from 'vitest';
import TravelService from '../services/TravelService.js';

function makeDeps(overrides = {}) {
    const players = new Map();
    const wallets = new Map();

    const deps = {
        userService: {
            addCoins: vi.fn().mockResolvedValue({ success: true, newBalance: 100 }),
        },
        gameInventoryService: {
            tryConsumeFerryTicket: vi.fn().mockResolvedValue({ consumed: false }),
        },
        joinRoom: vi.fn(),
        broadcastToRoom: vi.fn(),
        sendToPlayer: vi.fn(),
        getPlayer: (id) => players.get(id),
        getPlayerByWallet: (wallet) => wallets.get(wallet) || null,
        persistPlayerLocation: vi.fn().mockResolvedValue(undefined),
        transferPlayerRoom: vi.fn().mockImplementation(async (playerId, room, position) => {
            const player = players.get(playerId);
            if (player) {
                player.room = room;
                player.position = { ...position };
            }
        }),
        getDefaultSpawnForRoom: () => ({ x: 1, y: 0, z: 1 }),
        fallbackRescueRoom: 'town',
        ...overrides,
    };

    return { deps, players, wallets };
}

function addPlayer({ players, wallets }, id, wallet, room = 'town') {
    const player = {
        id,
        name: `Player-${id}`,
        walletAddress: wallet,
        room,
        position: { x: 0, y: 0, z: 0 },
        coins: 500,
    };
    players.set(id, player);
    wallets.set(wallet, player);
    return player;
}

describe('TravelService disconnect/reconnect', () => {
    let ctx;
    let service;

    beforeEach(() => {
        ctx = makeDeps();
        service = new TravelService(ctx.deps);
    });

    it('does not remove passenger or refund on disconnect during boarding', async () => {
        addPlayer(ctx, 'p1', 'wallet1', 'town');

        const book = await service.handleBook('p1', 'town_snow_forts');
        expect(book.success).toBe(true);

        service.handlePlayerDisconnect('p1');

        expect(ctx.deps.userService.addCoins).not.toHaveBeenCalledWith(
            expect.anything(),
            expect.any(Number),
            'travel_refund',
            expect.anything()
        );
        expect(service.walletVoyage.get('wallet1')).toBeTruthy();
        expect(service.voyages.size).toBe(1);
    });

    it('does not remove passenger on disconnect during transit', async () => {
        addPlayer(ctx, 'p1', 'wallet1', 'town');

        await service.handleBook('p1', 'town_snow_forts');
        const voyage = [...service.voyages.values()][0];
        voyage.phaseEndsAt = Date.now() - 1;

        await service.tick();
        expect(voyage.phase).toBe('transit');

        service.handlePlayerDisconnect('p1');

        expect(service.walletVoyage.get('wallet1')).toBe(voyage.id);
        expect(voyage.passengerWallets).toContain('wallet1');
    });

    it('reconnects offline transit passenger into travel lobby without changing timer', async () => {
        addPlayer(ctx, 'p1', 'wallet1', 'town');

        await service.handleBook('p1', 'town_snow_forts');
        const voyage = [...service.voyages.values()][0];
        const originalTransitEnd = Date.now() + 5000;
        voyage.phaseEndsAt = Date.now() - 1;

        await service.tick();
        voyage.phaseEndsAt = originalTransitEnd;

        service.handlePlayerDisconnect('p1');
        ctx.players.delete('p1');
        ctx.wallets.delete('wallet1');

        addPlayer(ctx, 'p2', 'wallet1', 'travel:stale');
        const sync = await service.syncPassengerOnJoin('wallet1', 'p2');

        expect(sync.status).toBe('transit');
        expect(ctx.deps.transferPlayerRoom).toHaveBeenCalledWith(
            'p2',
            `travel:${voyage.id}`,
            expect.any(Object),
            expect.objectContaining({ phase: 'transit' })
        );
        expect(voyage.phaseEndsAt).toBe(originalTransitEnd);
    });

    it('delivers offline passenger to destination when voyage completes', async () => {
        addPlayer(ctx, 'p1', 'wallet1', 'town');

        await service.handleBook('p1', 'town_snow_forts');
        const voyage = [...service.voyages.values()][0];
        voyage.phaseEndsAt = Date.now() - 1;

        await service.tick();
        voyage.phaseEndsAt = Date.now() - 1;

        service.handlePlayerDisconnect('p1');
        ctx.players.delete('p1');
        ctx.wallets.delete('wallet1');

        await service.tick();

        expect(service.pendingArrivals.has('wallet1')).toBe(true);
        expect(ctx.deps.persistPlayerLocation).toHaveBeenCalledWith(
            'wallet1',
            voyage.toRoom,
            expect.objectContaining({ x: expect.any(Number), z: expect.any(Number) })
        );

        addPlayer(ctx, 'p2', 'wallet1', `travel:${voyage.id}`);
        const sync = await service.syncPassengerOnJoin('wallet1', 'p2');

        expect(sync.status).toBe('arrived');
        expect(service.pendingArrivals.has('wallet1')).toBe(false);
        expect(ctx.players.get('p2').room).toBe(voyage.toRoom);
    });

    it('rescues player stuck in dead travel lobby', async () => {
        addPlayer(ctx, 'p1', 'wallet1', 'travel:deadvoyage');

        const sync = await service.syncPassengerOnJoin('wallet1', 'p1');

        expect(sync.status).toBe('rescued');
        expect(ctx.players.get('p1').room).toBe('town');
    });

    it('explicit leave during boarding still refunds', async () => {
        addPlayer(ctx, 'p1', 'wallet1', 'town');

        await service.handleBook('p1', 'town_snow_forts');
        const leave = await service.handleLeave('p1');

        expect(leave.success).toBe(true);
        expect(ctx.deps.userService.addCoins).toHaveBeenCalledWith(
            'wallet1',
            25,
            'travel_refund',
            expect.anything()
        );
        expect(service.walletVoyage.has('wallet1')).toBe(false);
    });
});