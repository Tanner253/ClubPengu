import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFindOne = vi.fn();
const mockUpdateOne = vi.fn();

vi.mock('../db/models/index.js', () => ({
    User: {
        findOne: (...args) => mockFindOne(...args),
        updateOne: (...args) => mockUpdateOne(...args),
    },
}));

const { default: ScavengeService } = await import('../services/ScavengeService.js');
const { SCAVENGE_SPOTS } = await import('../config/scavenge.js');

describe('ScavengeService', () => {
    let service;
    let userService;

    beforeEach(() => {
        vi.clearAllMocks();
        userService = {
            addCoins: vi.fn().mockResolvedValue({ success: true, newBalance: 150 }),
        };
        service = new ScavengeService(userService);
        mockFindOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue({ walletAddress: 'wallet123', coins: 100 }),
        });
        mockUpdateOne.mockResolvedValue({});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('rejects players far from the configured local spot coords', async () => {
        const spot = SCAVENGE_SPOTS.casino_trash;
        const result = await service.scavenge('wallet123', 'casino_trash', {
            room: 'snow_forts',
            x: spot.localX + 20,
            z: spot.localZ + 20,
        });

        expect(result.error).toBe('TOO_FAR');
    });

    it('accepts players standing at the casino trash can', async () => {
        const spot = SCAVENGE_SPOTS.casino_trash;
        const result = await service.scavenge('wallet123', 'casino_trash', {
            room: 'snow_forts',
            x: spot.localX,
            z: spot.localZ,
        });

        expect(result.success).toBe(true);
        expect(result.goldEarned).toBe(20);
        expect(userService.addCoins).toHaveBeenCalledWith(
            'wallet123',
            20,
            'scavenge',
            { spotId: 'casino_trash', room: 'snow_forts' },
            'Scavenged 20g from casino_trash'
        );
    });

    it('accepts players at a specific town trash can', async () => {
        const spot = SCAVENGE_SPOTS.town_trash_01;
        vi.spyOn(Math, 'random').mockReturnValue(0.05);

        const result = await service.scavenge('wallet123', 'town_trash_01', {
            room: 'town',
            x: spot.localX,
            z: spot.localZ,
        });

        expect(result.success).toBe(true);
        expect(result.goldEarned).toBe(10);
        expect(mockUpdateOne).toHaveBeenCalledWith(
            { walletAddress: 'wallet123' },
            expect.objectContaining({
                $set: expect.objectContaining({
                    'scavengeSpotCooldowns.town_trash_01': expect.any(Date),
                }),
            })
        );
    });

    it('town trash can miss the roll and award no gold', async () => {
        const spot = SCAVENGE_SPOTS.town_trash_01;
        vi.spyOn(Math, 'random').mockReturnValue(0.95);

        const result = await service.scavenge('wallet123', 'town_trash_01', {
            room: 'town',
            x: spot.localX,
            z: spot.localZ,
        });

        expect(result.success).toBe(true);
        expect(result.goldEarned).toBe(0);
        expect(result.newBalance).toBe(100);
        expect(userService.addCoins).not.toHaveBeenCalled();
        expect(result.message).toMatch(/crumbs/i);
    });

    it('each town trash can has an independent cooldown', async () => {
        const recent = new Date(Date.now() - 5 * 60 * 1000);
        const spotA = SCAVENGE_SPOTS.town_trash_01;
        const spotB = SCAVENGE_SPOTS.town_trash_02;

        mockFindOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue({
                walletAddress: 'wallet123',
                coins: 100,
                scavengeSpotCooldowns: {
                    town_trash_01: recent,
                },
            }),
        });

        const blocked = await service.scavenge('wallet123', 'town_trash_01', {
            room: 'town',
            x: spotA.localX,
            z: spotA.localZ,
        });
        expect(blocked.error).toBe('ON_COOLDOWN');

        vi.spyOn(Math, 'random').mockReturnValue(0.95);
        const allowed = await service.scavenge('wallet123', 'town_trash_02', {
            room: 'town',
            x: spotB.localX,
            z: spotB.localZ,
        });
        expect(allowed.success).toBe(true);
    });

    it('getAllSpotStatuses reports cooldown after recent scavenge', () => {
        const recent = new Date(Date.now() - 5 * 60 * 1000);
        const statuses = service.getAllSpotStatuses({
            walletAddress: 'wallet123',
            lastCasinoTrashScavenge: recent,
        });

        expect(statuses.casino_trash.canScavenge).toBe(false);
        expect(statuses.casino_trash.displayRemainingSeconds).toBeGreaterThan(0);
        expect(statuses.town_trash_01.canScavenge).toBe(true);
    });
});
