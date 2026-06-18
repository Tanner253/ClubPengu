import { describe, it, expect, vi, beforeEach } from 'vitest';
import OnboardingQuestService from '../services/OnboardingQuestService.js';
import User from '../db/models/User.js';

vi.mock('../db/models/User.js', () => ({
    default: {
        findOne: vi.fn(),
    },
}));

describe('OnboardingQuestService', () => {
    let service;
    let userService;
    let sendToPlayer;
    let getPlayerByWallet;
    let mockUser;

    beforeEach(() => {
        vi.clearAllMocks();
        userService = {
            addCoins: vi.fn().mockResolvedValue({ success: true, newBalance: 600 }),
        };
        sendToPlayer = vi.fn();
        getPlayerByWallet = vi.fn().mockReturnValue({ id: 'player-1' });
        service = new OnboardingQuestService(userService, sendToPlayer, getPlayerByWallet);

        mockUser = {
            onboardingQuest: { completedSteps: [], rewardClaimed: false },
            save: vi.fn().mockResolvedValue(true),
        };
        User.findOne.mockResolvedValue(mockUser);
    });

    it('completes steps in order only', async () => {
        const skip = await service.tryCompleteStep('wallet1', 'ferry_snow_forts');
        expect(skip.updated).toBe(false);

        const first = await service.tryCompleteStep('wallet1', 'dojo_gold');
        expect(first.updated).toBe(true);
        expect(mockUser.onboardingQuest.completedSteps).toEqual(['dojo_gold']);
        expect(userService.addCoins).toHaveBeenCalledWith(
            'wallet1',
            1,
            'dojo_sensei_win',
            {},
            'Beat Sensei in the Dojo'
        );
        expect(sendToPlayer).toHaveBeenCalledWith(
            'player-1',
            expect.objectContaining({ type: 'onboarding_quest_update', justCompletedStepId: 'dojo_gold', dojoRewardGold: 1 })
        );
        expect(sendToPlayer).toHaveBeenCalledWith(
            'player-1',
            expect.objectContaining({ type: 'coins_update', coins: 600 })
        );
    });

    it('dojo step requires beating Sensei (win only)', async () => {
        await service.handleMinigameComplete('wallet1', 'dojo', false);
        expect(mockUser.onboardingQuest.completedSteps).toEqual([]);
        expect(userService.addCoins).not.toHaveBeenCalled();

        await service.handleMinigameComplete('wallet1', 'dojo', true);
        expect(mockUser.onboardingQuest.completedSteps).toEqual(['dojo_gold']);
        expect(userService.addCoins).toHaveBeenCalledWith(
            'wallet1',
            1,
            'dojo_sensei_win',
            {},
            'Beat Sensei in the Dojo'
        );
    });

    it('awards 10 gold when final step completes', async () => {
        mockUser.onboardingQuest.completedSteps = [
            'dojo_gold',
            'ferry_snow_forts',
            'catch_fish',
            'sell_fish',
            'ferry_forest',
            'chop_wood',
            'ferry_town',
            'upgrade_backpack',
        ];

        const result = await service.tryCompleteStep('wallet1', 'search_trash');
        expect(result.updated).toBe(true);
        expect(userService.addCoins).toHaveBeenCalledWith(
            'wallet1',
            10,
            'onboarding_quest_reward',
            expect.any(Object),
            expect.any(String)
        );
        expect(mockUser.onboardingQuest.rewardClaimed).toBe(true);
    });

    it('maps ferry routes to quest steps', async () => {
        mockUser.onboardingQuest.completedSteps = ['dojo_gold'];
        await service.handleTravelArrival('wallet1', 'town_snow_forts');
        expect(mockUser.onboardingQuest.completedSteps).toContain('ferry_snow_forts');
    });
});
