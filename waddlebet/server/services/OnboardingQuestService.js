/**
 * Server-authoritative onboarding quest progression for all authenticated players.
 */

import User from '../db/models/User.js';
import {
    ONBOARDING_REWARD_GOLD,
    ONBOARDING_STEPS,
    TRAVEL_ROUTE_QUEST_STEPS,
    isTownTrashSpot,
} from '../config/onboardingQuest.js';

export default class OnboardingQuestService {
    /**
     * @param {import('./UserService.js').default} userService
     * @param {(playerId: string, payload: object) => void} sendToPlayer
     * @param {(walletAddress: string) => { id: string } | null} getPlayerByWallet
     */
    constructor(userService, sendToPlayer, getPlayerByWallet) {
        this.userService = userService;
        this.sendToPlayer = sendToPlayer;
        this.getPlayerByWallet = getPlayerByWallet;
    }

    buildStatus(user) {
        const completed = user?.onboardingQuest?.completedSteps || [];
        const rewardClaimed = !!user?.onboardingQuest?.rewardClaimed;
        const steps = ONBOARDING_STEPS.map((step) => ({
            id: step.id,
            label: step.label,
            hint: step.hint,
            completed: completed.includes(step.id),
        }));
        const nextStep = steps.find((s) => !s.completed) || null;
        const completedCount = steps.filter((s) => s.completed).length;
        return {
            steps,
            nextStepId: nextStep?.id ?? null,
            completedCount,
            totalSteps: steps.length,
            allDone: completedCount === steps.length,
            rewardClaimed,
            rewardGold: ONBOARDING_REWARD_GOLD,
        };
    }

    async getStatus(walletAddress) {
        const user = await User.findOne({ walletAddress });
        if (!user) return null;
        return this.buildStatus(user);
    }

    async sendStatusToPlayer(playerId, walletAddress) {
        const status = await this.getStatus(walletAddress);
        if (!status) return;
        this.sendToPlayer(playerId, {
            type: 'onboarding_quest_status',
            ...status,
        });
    }

    notifyWallet(walletAddress, status, extra = {}) {
        const player = this.getPlayerByWallet(walletAddress);
        if (!player) return;
        this.sendToPlayer(player.id, {
            type: 'onboarding_quest_update',
            ...status,
            ...extra,
        });
    }

    getNextStepId(completedSteps) {
        const next = ONBOARDING_STEPS.find((s) => !completedSteps.includes(s.id));
        return next?.id ?? null;
    }

    async tryCompleteStep(walletAddress, stepId) {
        if (!walletAddress || !stepId) return null;

        const user = await User.findOne({ walletAddress });
        if (!user) return null;

        const completed = [...(user.onboardingQuest?.completedSteps || [])];
        if (user.onboardingQuest?.rewardClaimed) {
            return { updated: false, status: this.buildStatus(user) };
        }
        if (completed.includes(stepId)) {
            return { updated: false, status: this.buildStatus(user) };
        }

        const nextStepId = this.getNextStepId(completed);
        if (nextStepId !== stepId) {
            return { updated: false, status: this.buildStatus(user) };
        }

        completed.push(stepId);
        user.onboardingQuest = {
            completedSteps: completed,
            rewardClaimed: user.onboardingQuest?.rewardClaimed || false,
        };
        await user.save();

        const status = this.buildStatus(user);
        this.notifyWallet(walletAddress, status, { justCompletedStepId: stepId });

        if (status.allDone && !status.rewardClaimed) {
            const rewardResult = await this.claimReward(walletAddress);
            return { updated: true, status: rewardResult.status, rewardResult };
        }

        return { updated: true, status };
    }

    async claimReward(walletAddress) {
        const user = await User.findOne({ walletAddress });
        if (!user) return { success: false };

        const status = this.buildStatus(user);
        if (!status.allDone || user.onboardingQuest?.rewardClaimed) {
            return { success: false, status };
        }

        const coinResult = await this.userService.addCoins(
            walletAddress,
            ONBOARDING_REWARD_GOLD,
            'onboarding_quest_reward',
            { steps: user.onboardingQuest?.completedSteps || [] },
            'Completed onboarding quest guide'
        );

        if (!coinResult.success) {
            return { success: false, status, error: coinResult.error };
        }

        user.onboardingQuest = {
            completedSteps: user.onboardingQuest?.completedSteps || [],
            rewardClaimed: true,
        };
        await user.save();

        const finalStatus = this.buildStatus(user);
        this.notifyWallet(walletAddress, finalStatus, {
            rewardGranted: true,
            rewardGold: ONBOARDING_REWARD_GOLD,
            newBalance: coinResult.newBalance,
        });

        const player = this.getPlayerByWallet(walletAddress);
        if (player) {
            this.sendToPlayer(player.id, {
                type: 'coins_update',
                coins: coinResult.newBalance,
                isAuthenticated: true,
            });
        }

        return { success: true, status: finalStatus, newBalance: coinResult.newBalance };
    }

    handleTravelArrival(walletAddress, routeId) {
        const stepId = TRAVEL_ROUTE_QUEST_STEPS[routeId];
        if (!stepId) return Promise.resolve(null);
        return this.tryCompleteStep(walletAddress, stepId);
    }

    handleMinigameReward(walletAddress, roomId) {
        if (roomId !== 'dojo') return Promise.resolve(null);
        return this.tryCompleteStep(walletAddress, 'dojo_gold');
    }

    handleFishCatch(walletAddress, { inventoryAdded, isDemo } = {}) {
        if (!walletAddress || isDemo || inventoryAdded === false) return Promise.resolve(null);
        return this.tryCompleteStep(walletAddress, 'catch_fish');
    }

    handleFishSell(walletAddress, merchantId) {
        if (merchantId !== 'fish_buyer') return Promise.resolve(null);
        return this.tryCompleteStep(walletAddress, 'sell_fish');
    }

    handleWoodChop(walletAddress, { inventoryAdded, isDemo } = {}) {
        if (!walletAddress || isDemo || inventoryAdded === false) return Promise.resolve(null);
        return this.tryCompleteStep(walletAddress, 'chop_wood');
    }

    handleBackpackUpgrade(walletAddress) {
        return this.tryCompleteStep(walletAddress, 'upgrade_backpack');
    }

    handleScavenge(walletAddress, spotId) {
        if (!isTownTrashSpot(spotId)) return Promise.resolve(null);
        return this.tryCompleteStep(walletAddress, 'search_trash');
    }
}
