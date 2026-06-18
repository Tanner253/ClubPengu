import { describe, it, expect, vi, beforeEach } from 'vitest';

import NpcDailyOrderService from '../services/NpcDailyOrderService.js';

import { getNpcDailyOrder } from '../config/npcOrders.js';

const mockUser = {
    walletAddress: 'wallet1',
    onboardingQuest: {
        completedSteps: [
            'dojo_gold', 'ferry_snow_forts', 'catch_fish', 'sell_fish',
            'ferry_forest', 'chop_wood', 'ferry_town', 'upgrade_backpack', 'search_trash',
        ],
        rewardClaimed: true,
    },
    dailyNpcOrders: { utcDay: null, completedQuestIds: [], acceptedQuestIds: [] },
    save: vi.fn().mockResolvedValue(true),
};

vi.mock('../db/models/User.js', () => ({
    default: {
        findOne: vi.fn(),
    },
}));

import User from '../db/models/User.js';

describe('NpcDailyOrderService', () => {
    let gameInventoryService;
    let userService;
    let service;

    beforeEach(() => {
        vi.clearAllMocks();
        User.findOne.mockResolvedValue({ ...mockUser, dailyNpcOrders: { utcDay: null, completedQuestIds: [], acceptedQuestIds: [] } });
        gameInventoryService = {
            countFishTotal: vi.fn().mockResolvedValue(12),
            countFishMinTier: vi.fn().mockResolvedValue(8),
            countItem: vi.fn().mockResolvedValue(50),
            countMixedItems: vi.fn().mockImplementation(async (_wallet, items) => {
                const breakdown = items.map((entry) => ({
                    itemId: entry.itemId,
                    quantity: entry.quantity,
                    have: entry.quantity,
                }));
                const required = items.reduce((sum, entry) => sum + entry.quantity, 0);
                return {
                    have: required,
                    required,
                    breakdown,
                    ready: true,
                };
            }),
            removeFishTotal: vi.fn().mockResolvedValue({ success: true, inventory: { slots: [] } }),
            removeFishMinTier: vi.fn().mockResolvedValue({ success: true, inventory: { slots: [] } }),
            removeMixedItems: vi.fn().mockResolvedValue({ success: true, inventory: { slots: [] } }),
            removeItemsById: vi.fn().mockResolvedValue({ success: true, inventory: { slots: [] } }),
            addItem: vi.fn().mockResolvedValue({ success: true, inventory: { slots: [] } }),
        };
        userService = {
            getUser: vi.fn().mockResolvedValue({ coins: 50 }),
            addCoins: vi.fn().mockResolvedValue({ success: true, newBalance: 72 }),
        };
        service = new NpcDailyOrderService(
            gameInventoryService,
            userService,
            vi.fn(),
            vi.fn()
        );
    });

    it('builds status with two orders when onboarding complete', async () => {
        const status = await service.buildStatus(await User.findOne());
        expect(status.onboardingComplete).toBe(true);
        expect(status.orders).toHaveLength(2);
        expect(status.orders[0].questId).toBe('salty_daily_catch');
        expect(status.orders[1].questId).toBe('clive_daily_timber');
        expect(status.orders[1].requirementType).toBe('items_mixed');
        expect(status.orders[1].items?.length).toBe(4);
        expect(status.orders[0].goldReward).toBeGreaterThan(0);
    });

    it('rejects turn-in when onboarding incomplete', async () => {
        User.findOne.mockResolvedValue({
            ...mockUser,
            onboardingQuest: { completedSteps: [], rewardClaimed: false },
        });
        const result = await service.turnIn('wallet1', 'salty_daily_catch');
        expect(result.error).toBe('ONBOARDING_INCOMPLETE');
    });

    it('rejects turn-in when contract not accepted', async () => {
        const result = await service.turnIn('wallet1', 'clive_daily_timber');
        expect(result.error).toBe('NOT_ACCEPTED');
    });

    it('accepts daily contract and exposes it on status', async () => {
        const result = await service.acceptQuest('wallet1', 'clive_daily_timber');
        expect(result.success).toBe(true);
        expect(result.status.orders.find((o) => o.questId === 'clive_daily_timber')?.accepted).toBe(true);
        const user = await User.findOne();
        expect(user.save).toHaveBeenCalled();
    });

    it('completes clive mixed timber order and awards gold', async () => {
        const order = getNpcDailyOrder('clive_daily_timber');
        const user = await User.findOne();
        await service.acceptQuest('wallet1', 'clive_daily_timber');
        const result = await service.turnIn('wallet1', 'clive_daily_timber');
        expect(result.success).toBe(true);
        expect(result.goldReward).toBe(order.goldReward);
        expect(gameInventoryService.removeMixedItems).toHaveBeenCalledWith('wallet1', order.items);
        expect(userService.addCoins).toHaveBeenCalledWith(
            'wallet1',
            order.goldReward,
            'npc_daily_order',
            { questId: 'clive_daily_timber' },
            expect.stringContaining('Daily order')
        );
        expect(gameInventoryService.addItem).not.toHaveBeenCalled();
        expect(user.save).toHaveBeenCalled();
    });

    it('completes salty daily catch and awards gold', async () => {
        const order = getNpcDailyOrder('salty_daily_catch');
        const user = await User.findOne();
        if (order.requirementType === 'fish_min_tier') {
            gameInventoryService.countFishMinTier.mockResolvedValue(order.quantity);
        } else {
            gameInventoryService.countFishTotal.mockResolvedValue(order.quantity);
        }
        await service.acceptQuest('wallet1', 'salty_daily_catch');
        const result = await service.turnIn('wallet1', 'salty_daily_catch');
        expect(result.success).toBe(true);
        expect(result.goldReward).toBe(order.goldReward);
        if (order.requirementType === 'fish_min_tier') {
            expect(gameInventoryService.removeFishMinTier).toHaveBeenCalledWith(
                'wallet1',
                order.quantity,
                order.minTier
            );
        } else {
            expect(gameInventoryService.removeFishTotal).toHaveBeenCalledWith('wallet1', order.quantity);
        }
        expect(userService.addCoins).toHaveBeenCalledWith(
            'wallet1',
            order.goldReward,
            'npc_daily_order',
            { questId: 'salty_daily_catch' },
            expect.stringContaining('Daily order')
        );
        expect(gameInventoryService.addItem).not.toHaveBeenCalled();
        expect(user.save).toHaveBeenCalled();
    });

    it('blocks duplicate turn-in same day', async () => {
        User.findOne.mockResolvedValue({
            ...mockUser,
            dailyNpcOrders: {
                utcDay: new Date().toISOString().slice(0, 10),
                completedQuestIds: ['salty_daily_catch'],
                acceptedQuestIds: ['salty_daily_catch'],
            },
        });
        const result = await service.turnIn('wallet1', 'salty_daily_catch');
        expect(result.error).toBe('ALREADY_COMPLETE');
    });
});
