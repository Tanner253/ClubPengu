/**
 * Server-authoritative NPC daily orders (UTC midnight reset).
 */

import User from '../db/models/User.js';
import {
    getOrdersForDay,
    getNpcDailyOrder,
    getUtcDayKey,
} from '../config/npcOrders.js';
import { isOnboardingQuestComplete } from '../config/onboardingQuest.js';

export default class NpcDailyOrderService {
    /**
     * @param {import('./GameInventoryService.js').default} gameInventoryService
     * @param {import('./UserService.js').default} userService
     * @param {(playerId: string, payload: object) => void} sendToPlayer
     * @param {(walletAddress: string) => { id: string } | null} getPlayerByWallet
     */
    constructor(gameInventoryService, userService, sendToPlayer, getPlayerByWallet) {
        this.gameInventoryService = gameInventoryService;
        this.userService = userService;
        this.sendToPlayer = sendToPlayer;
        this.getPlayerByWallet = getPlayerByWallet;
    }

    ensureDailyReset(user) {
        const today = getUtcDayKey();
        if (!user.dailyNpcOrders) {
            user.dailyNpcOrders = { utcDay: today, completedQuestIds: [], acceptedQuestIds: [] };
            return;
        }
        if (user.dailyNpcOrders.utcDay !== today) {
            user.dailyNpcOrders.utcDay = today;
            user.dailyNpcOrders.completedQuestIds = [];
            user.dailyNpcOrders.acceptedQuestIds = [];
        }
        if (!Array.isArray(user.dailyNpcOrders.acceptedQuestIds)) {
            user.dailyNpcOrders.acceptedQuestIds = [];
        }
    }

    isQuestAccepted(user, questId) {
        this.ensureDailyReset(user);
        return (user.dailyNpcOrders?.acceptedQuestIds || []).includes(questId);
    }

    isOrderCompleted(user, questId) {
        this.ensureDailyReset(user);
        return (user.dailyNpcOrders?.completedQuestIds || []).includes(questId);
    }

    async getProgress(walletAddress, order) {
        if (order.requirementType === 'fish_any') {
            const have = await this.gameInventoryService.countFishTotal(walletAddress);
            return { have, required: order.quantity, breakdown: null, ready: have >= order.quantity };
        }
        if (order.requirementType === 'fish_min_tier') {
            const have = await this.gameInventoryService.countFishMinTier(
                walletAddress,
                order.minTier ?? 2
            );
            return { have, required: order.quantity, breakdown: null, ready: have >= order.quantity };
        }
        if (order.requirementType === 'items_mixed') {
            return this.gameInventoryService.countMixedItems(walletAddress, order.items || []);
        }
        const have = await this.gameInventoryService.countItem(walletAddress, order.itemId);
        return { have, required: order.quantity, breakdown: null, ready: have >= order.quantity };
    }

    async buildStatus(user) {
        const onboardingComplete = isOnboardingQuestComplete(user);
        const utcDay = getUtcDayKey();
        const orderDefs = getOrdersForDay(utcDay);

        if (!onboardingComplete) {
            return {
                onboardingComplete: false,
                orders: [],
                completedCount: 0,
                totalOrders: orderDefs.length,
                allComplete: false,
                utcDay,
            };
        }

        this.ensureDailyReset(user);
        const completedIds = user.dailyNpcOrders?.completedQuestIds || [];
        const acceptedIds = user.dailyNpcOrders?.acceptedQuestIds || [];

        const orders = [];
        for (const def of orderDefs) {
            const completed = completedIds.includes(def.questId);
            const accepted = acceptedIds.includes(def.questId);
            let have = 0;
            let required = def.quantity;
            let breakdown = null;
            let ready = false;
            if (!completed && user.walletAddress) {
                const progress = await this.getProgress(user.walletAddress, def);
                have = progress.have;
                required = progress.required;
                breakdown = progress.breakdown ?? null;
                ready = progress.ready ?? have >= required;
            } else if (completed) {
                have = required;
                ready = true;
                if (def.requirementType === 'items_mixed') {
                    breakdown = (def.items || []).map((entry) => ({
                        itemId: entry.itemId,
                        quantity: entry.quantity,
                        have: entry.quantity,
                    }));
                }
            }
            orders.push({
                questId: def.questId,
                merchantId: def.merchantId,
                npcId: def.npcId,
                label: def.label,
                briefingTitle: def.briefingTitle ?? def.label,
                briefing: def.briefing ?? def.hint,
                hint: def.hint,
                turnInLabel: def.turnInLabel,
                goldReward: def.goldReward ?? 0,
                required,
                have: Math.min(have, required),
                completed,
                accepted,
                ready: !completed && accepted && ready,
                requirementType: def.requirementType,
                minTier: def.minTier ?? null,
                itemId: def.itemId ?? null,
                items: def.items ?? null,
                breakdown,
            });
        }

        const completedCount = orders.filter((o) => o.completed).length;
        return {
            onboardingComplete: true,
            orders,
            completedCount,
            totalOrders: orders.length,
            allComplete: completedCount === orders.length,
            utcDay: user.dailyNpcOrders?.utcDay || getUtcDayKey(),
        };
    }

    async getStatus(walletAddress) {
        const user = await User.findOne({ walletAddress });
        if (!user) return null;
        return this.buildStatus(user);
    }

    async sendStatusToPlayer(playerId, walletAddress) {
        const user = await User.findOne({ walletAddress });
        if (!user) return;
        const status = await this.buildStatus(user);
        this.sendToPlayer(playerId, {
            type: 'daily_quest_status',
            ...status,
        });
    }

    notifyWallet(walletAddress, status, extra = {}) {
        const player = this.getPlayerByWallet(walletAddress);
        if (!player) return;
        this.sendToPlayer(player.id, {
            type: 'daily_quest_update',
            ...status,
            ...extra,
        });
    }

    async acceptQuest(walletAddress, questId) {
        const utcDay = getUtcDayKey();
        const order = getNpcDailyOrder(questId, utcDay);
        if (!order) {
            return { error: 'UNKNOWN_QUEST', message: 'Unknown daily contract' };
        }

        const user = await User.findOne({ walletAddress });
        if (!user) return { error: 'USER_NOT_FOUND' };

        if (!isOnboardingQuestComplete(user)) {
            return {
                error: 'ONBOARDING_INCOMPLETE',
                message: 'Finish the Getting Started quest first.',
            };
        }

        this.ensureDailyReset(user);

        if (this.isOrderCompleted(user, questId)) {
            return {
                error: 'ALREADY_COMPLETE',
                message: 'You already fulfilled this contract today.',
            };
        }

        if (this.isQuestAccepted(user, questId)) {
            const status = await this.buildStatus(user);
            return {
                success: true,
                alreadyAccepted: true,
                questId,
                status,
                message: 'Contract already accepted — check your quest tracker.',
            };
        }

        const acceptedIds = [...(user.dailyNpcOrders?.acceptedQuestIds || []), questId];
        user.dailyNpcOrders = {
            utcDay: getUtcDayKey(),
            completedQuestIds: user.dailyNpcOrders?.completedQuestIds || [],
            acceptedQuestIds: acceptedIds,
        };
        await user.save();

        const status = await this.buildStatus(user);
        return {
            success: true,
            questId,
            status,
            message: `Contract accepted: ${order.briefingTitle || order.label}`,
        };
    }

    async turnIn(walletAddress, questId) {
        const utcDay = getUtcDayKey();
        const order = getNpcDailyOrder(questId, utcDay);
        if (!order) {
            return { error: 'UNKNOWN_QUEST', message: 'Unknown daily order' };
        }

        const user = await User.findOne({ walletAddress });
        if (!user) return { error: 'USER_NOT_FOUND' };

        if (!isOnboardingQuestComplete(user)) {
            return {
                error: 'ONBOARDING_INCOMPLETE',
                message: 'Finish the Getting Started quest first.',
            };
        }

        this.ensureDailyReset(user);

        if (this.isOrderCompleted(user, questId)) {
            return {
                error: 'ALREADY_COMPLETE',
                message: 'You already finished this order today. New orders at midnight UTC.',
            };
        }

        if (!this.isQuestAccepted(user, questId)) {
            return {
                error: 'NOT_ACCEPTED',
                message: 'Accept the contract at the NPC first.',
            };
        }

        const progress = await this.getProgress(walletAddress, order);
        if (!progress.ready && progress.have < progress.required) {
            if (order.requirementType === 'items_mixed' && progress.breakdown?.length) {
                const missing = progress.breakdown
                    .filter((row) => row.have < row.quantity)
                    .map((row) => `${row.quantity - row.have} ${row.itemId.replace(/_/g, ' ')}`)
                    .join(', ');
                return {
                    error: 'NOT_ENOUGH',
                    message: `Still need: ${missing}.`,
                    have: progress.have,
                    required: progress.required,
                    breakdown: progress.breakdown,
                };
            }
            const short = progress.required - progress.have;
            const unit =
                order.requirementType === 'fish_any'
                    ? 'fish'
                    : order.itemId?.replace('_', ' ') || 'items';
            return {
                error: 'NOT_ENOUGH',
                message: `Need ${progress.required} ${unit} (you have ${progress.have}).`,
                have: progress.have,
                required: progress.required,
            };
        }

        const goldReward = order.goldReward ?? 0;
        let newBalance = 0;
        if (goldReward > 0) {
            const coinResult = await this.userService.addCoins(
                walletAddress,
                goldReward,
                'npc_daily_order',
                { questId },
                `Daily order: ${order.label}`
            );
            if (coinResult.error) {
                return {
                    error: coinResult.error || 'REWARD_FAILED',
                    message: 'Could not grant order gold reward',
                };
            }
            newBalance = coinResult.newBalance ?? newBalance;
        }

        let removed;
        if (order.requirementType === 'fish_any') {
            removed = await this.gameInventoryService.removeFishTotal(walletAddress, order.quantity);
        } else if (order.requirementType === 'fish_min_tier') {
            removed = await this.gameInventoryService.removeFishMinTier(
                walletAddress,
                order.quantity,
                order.minTier ?? 2
            );
        } else if (order.requirementType === 'items_mixed') {
            removed = await this.gameInventoryService.removeMixedItems(walletAddress, order.items || []);
        } else {
            removed = await this.gameInventoryService.removeItemsById(
                walletAddress,
                order.itemId,
                order.quantity
            );
        }
        if (removed.error) {
            if (goldReward > 0) {
                await this.userService.addCoins(
                    walletAddress,
                    -goldReward,
                    'npc_daily_order_rollback',
                    { questId },
                    'Daily order rollback — turn-in failed'
                );
            }
            return removed;
        }

        const userFreshAfterCoins = await this.userService.getUser(walletAddress);
        const completedIds = [...(user.dailyNpcOrders?.completedQuestIds || []), questId];
        user.dailyNpcOrders = {
            utcDay: getUtcDayKey(),
            completedQuestIds: completedIds,
            acceptedQuestIds: user.dailyNpcOrders?.acceptedQuestIds || [],
        };
        await user.save();

        const status = await this.buildStatus(user);

        return {
            success: true,
            questId,
            goldReward,
            newBalance: userFreshAfterCoins?.coins ?? newBalance,
            inventory: removed.inventory,
            status,
            message: goldReward > 0
                ? `Order complete! +${goldReward}g contractor bonus.`
                : 'Order complete!',
        };
    }
}
