/**
 * FishingService - Server-side fishing logic
 *
 * Client runs the ice fishing minigame. Server:
 * - Issues a session per cast (bait purchase)
 * - Rolls catches server-side (client fish id is not trusted)
 * - Validates session before granting inventory
 */

import crypto from 'crypto';
import { ECONOMY } from '../config/economy.js';
import { getEffectiveRodCatchConfig } from '../config/rodUpgrades.js';
import { rollCatchAtDepth } from '../config/fishingLoot.js';
import {
    getGameItem,
    isInventoryCatch,
    isJellyfishId,
    getFishRarityLabel
} from '../config/gameItems.js';

const FISHING_COST = ECONOMY.FISHING.BAIT_COST;
const SESSION_TTL_MS = 10 * 60 * 1000;

const FISH_TYPES = [
    { id: 'minnow', emoji: '🐟', name: 'Minnow', weight: 40, coins: 3 },
    { id: 'clownfish', emoji: '🐠', name: 'Clownfish', weight: 25, coins: 10 },
    { id: 'reef_shark', emoji: '🦈', name: 'Reef Shark', weight: 15, coins: 40 },
    { id: 'giant_squid', emoji: '🦑', name: 'Giant Squid', weight: 10, coins: 100 },
    { id: 'leviathan', emoji: '🐋', name: 'Leviathan', weight: 1, coins: 1000 }
];

class FishingService {
    constructor(userService, gameInventoryService, broadcastToRoom, sendToPlayer) {
        this.userService = userService;
        this.gameInventoryService = gameInventoryService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
        /** @type {Map<string, object>} */
        this.sessions = new Map();
    }

    _createSession(playerId, spotId, room, isDemo, rodItemId = 'basic_rod', catchConfig = null) {
        const sessionId = crypto.randomUUID();
        this.sessions.set(playerId, {
            sessionId,
            spotId,
            room,
            isDemo,
            rodItemId: rodItemId || 'basic_rod',
            catchConfig,
            createdAt: Date.now(),
            consumed: false
        });
        return sessionId;
    }

    _validateSession(playerId, sessionId) {
        const session = this.sessions.get(playerId);
        if (!session) {
            return { error: 'NO_SESSION', message: 'Start fishing before reporting a catch' };
        }
        if (session.consumed) {
            return { error: 'SESSION_USED', message: 'This cast was already resolved' };
        }
        if (sessionId && session.sessionId !== sessionId) {
            return { error: 'INVALID_SESSION', message: 'Invalid fishing session' };
        }
        if (Date.now() - session.createdAt > SESSION_TTL_MS) {
            this.sessions.delete(playerId);
            return { error: 'SESSION_EXPIRED', message: 'Fishing session expired — cast again' };
        }
        return { session };
    }

    _consumeSession(playerId) {
        const session = this.sessions.get(playerId);
        if (session) {
            session.consumed = true;
        }
    }

    async startFishing(playerId, walletAddress, room, spotId, playerName, guestCoins = 0, isDemo = false) {
        let newBalance;

        if (isDemo) {
            const sessionId = this._createSession(playerId, spotId, room, true, 'basic_rod');
            return {
                success: true,
                spotId,
                sessionId,
                newBalance: guestCoins,
                baitCost: 0,
                isDemo: true
            };
        }

        if (walletAddress) {
            const user = await this.gameInventoryService.ensureInventory(walletAddress);
            if (!user) {
                return { error: 'USER_NOT_FOUND', message: 'Could not load inventory' };
            }

            const equippedRod = this.gameInventoryService.getEquippedRod(user);
            if (!equippedRod) {
                return {
                    error: 'NO_ROD',
                    message: 'Equip a fishing rod on the hotbar — pick up the free rod near Old Salty'
                };
            }

            const rodItemId = equippedRod.itemId || 'basic_rod';
            const rodUpgradeStep = user.fishingProgress?.rodUpgradeStep ?? 0;
            const catchConfig = getEffectiveRodCatchConfig(rodItemId, rodUpgradeStep);

            if (!user.coins || user.coins < FISHING_COST) {
                return {
                    error: 'INSUFFICIENT_FUNDS',
                    message: `Need ${FISHING_COST} coins for bait (you have ${user?.coins || 0})`
                };
            }

            const capacity = await this.gameInventoryService.canAddItem(
                walletAddress,
                'minnow',
                1,
                { category: 'fish', name: 'Minnow', emoji: '🐟' }
            );
            if (!capacity.ok) {
                return {
                    error: capacity.error || 'INVENTORY_FULL',
                    message: capacity.message || 'Backpack is full — upgrade or sell fish'
                };
            }

            const deductResult = await this.userService.addCoins(
                walletAddress,
                -FISHING_COST,
                'fishing_bait',
                { spotId, room },
                'Fishing bait'
            );

            if (!deductResult.success) {
                return { error: 'DEDUCT_FAILED', message: 'Failed to buy bait' };
            }
            newBalance = deductResult.newBalance;

            const damageResult = await this.gameInventoryService.damageEquippedRod(walletAddress);
            if (damageResult.broken) {
                return {
                    error: 'ROD_BROKEN',
                    message: 'Your rod broke — buy a new one from Old Salty',
                    inventory: damageResult.inventory
                };
            }

            const sessionId = this._createSession(playerId, spotId, room, false, rodItemId, catchConfig);

            console.log(`🎣 ${playerName} started fishing at spot ${spotId} session=${sessionId.slice(0, 8)} rod=${rodItemId}`);

            return {
                success: true,
                spotId,
                sessionId,
                newBalance,
                baitCost: FISHING_COST,
                isDemo: false
            };
        } else {
            if (guestCoins < FISHING_COST) {
                return {
                    error: 'INSUFFICIENT_FUNDS',
                    message: `Need ${FISHING_COST} coins for bait`
                };
            }
            newBalance = guestCoins - FISHING_COST;
        }

        const sessionId = this._createSession(playerId, spotId, room, false, 'basic_rod');

        console.log(`🎣 ${playerName} started fishing at spot ${spotId} session=${sessionId.slice(0, 8)}`);

        return {
            success: true,
            spotId,
            sessionId,
            newBalance,
            baitCost: FISHING_COST,
            isDemo: false
        };
    }

    /**
     * Resolve minigame result — requires active session; rolls fish on success.
     */
    async handleGameResult(
        playerId,
        walletAddress,
        room,
        playerName,
        { sessionId, success, depth = 0, fish: clientFish },
        isDemo = false,
        guestBalance = 0
    ) {
        const sessionCheck = this._validateSession(playerId, sessionId);
        if (sessionCheck.error) {
            return sessionCheck;
        }

        const { session } = sessionCheck;
        const rodItemId = session.rodItemId || 'basic_rod';

        this._consumeSession(playerId);

        if (!success) {
            console.log(`[FISHING] miss player=${playerId} depth=${depth}`);
            return { success: true, missed: true, depth };
        }

        if (clientFish?.id && isJellyfishId(clientFish.id)) {
            return this.handleCatch(
                playerId,
                walletAddress,
                room,
                playerName,
                clientFish,
                depth,
                isDemo,
                guestBalance
            );
        }

        const catchRoll = rollCatchAtDepth(depth, rodItemId, session.catchConfig);
        const rolled = catchRoll.fish;
        if (!rolled || rolled.category !== 'fish') {
            return { error: 'INVALID_ROLL', message: 'Could not determine catch' };
        }

        const fishData = {
            id: rolled.id,
            name: rolled.name,
            emoji: rolled.emoji,
            coins: catchRoll.npcValue,
            weightKg: catchRoll.weightKg,
            caughtWithRod: catchRoll.caughtWithRod
        };

        console.log(
            `[FISHING] server roll player=${playerId} depth=${depth} rod=${rodItemId} rolled=${rolled.id} value=${catchRoll.npcValue}g weight=${catchRoll.weightKg}kg clientClaim=${clientFish?.id || 'none'}`
        );

        return this.handleCatch(
            playerId,
            walletAddress,
            room,
            playerName,
            fishData,
            depth,
            isDemo,
            guestBalance
        );
    }

    /**
     * Handle catch — fish go to inventory; jellyfish are hazards only.
     */
    async handleCatch(playerId, walletAddress, room, playerName, fishData, depth = 0, isDemo = false, guestBalance = 0) {
        const fishId = fishData?.id || 'unknown';
        const catalogItem = getGameItem(fishId);
        const isJellyfish = isJellyfishId(fishId) || fishData?.type === 'jellyfish';

        if (!isJellyfish && !catalogItem) {
            console.warn(`[FISHING] rejected unknown fish id=${fishId} player=${playerId}`);
            return { error: 'INVALID_FISH', message: 'Unknown catch' };
        }

        console.log(`[FISHING] handleCatch player=${playerId} name=${playerName} fish=${fishId} depth=${depth} isDemo=${isDemo} wallet=${walletAddress ? walletAddress.slice(0, 8) + '…' : 'NONE'} jelly=${isJellyfish} catalog=${!!catalogItem}`);

        const npcValue = fishData?.coins ?? catalogItem?.npcValue ?? 0;
        const weightKg = fishData?.weightKg ?? null;
        const caughtWithRod = fishData?.caughtWithRod ?? null;

        const fish = {
            id: fishId,
            emoji: fishData?.emoji || catalogItem?.emoji || '🐟',
            name: fishData?.name || catalogItem?.name || 'Fish',
            category: catalogItem?.category || 'fish',
            rarity: getFishRarityLabel(fishId),
            npcValue,
            tier: catalogItem?.tier || 0,
            weightKg,
            caughtWithRod
        };

        let newBalance = guestBalance;
        let inventoryAdded = false;
        let inventory = null;
        let inventoryError = null;

        if (isJellyfish) {
            console.log(`[FISHING] jellyfish hazard — no inventory player=${playerId} fish=${fishId}`);
        } else if (isDemo) {
            console.warn(`[FISHING] demo catch — skipping backpack player=${playerId} fish=${fishId}`);
            newBalance = guestBalance;
        } else if (walletAddress && isInventoryCatch(fishData)) {
            console.log(`[FISHING] adding to backpack player=${playerId} wallet=${walletAddress.slice(0, 8)}… fish=${fishId}`);
            const addResult = await this.gameInventoryService.addItem(
                walletAddress,
                fishId,
                1,
                {
                    caughtAt: new Date().toISOString(),
                    depth,
                    name: fish.name,
                    emoji: fish.emoji,
                    npcValue,
                    category: fish.category,
                    tier: fish.tier,
                    weightKg,
                    caughtWithRod
                }
            );

            if (addResult.error) {
                inventoryError = addResult.error;
                console.warn(`[FISHING] backpack add FAILED player=${playerName} wallet=${walletAddress.slice(0, 8)}… fish=${fishId} error=${addResult.error} msg=${addResult.message || ''}`);
            } else {
                inventoryAdded = true;
                inventory = addResult.inventory;
                const user = await this.userService.getUser(walletAddress);
                newBalance = user?.coins ?? guestBalance;
                console.log(`[FISHING] backpack add OK player=${playerName} fish=${fishId} usedSlots=${inventory?.usedSlots ?? '?'} slot0=${inventory?.slots?.[0]?.itemId || 'empty'}`);
            }
        } else if (walletAddress) {
            console.warn(`[FISHING] catch NOT storable player=${playerName} fish=${fishId} wallet=${walletAddress.slice(0, 8)}…`);
            const user = await this.userService.getUser(walletAddress);
            newBalance = user?.coins ?? guestBalance;
        } else {
            newBalance = guestBalance + npcValue;
        }

        if (this.sendToPlayer) {
            this.sendToPlayer(playerId, {
                type: 'fishing_result',
                success: true,
                fish,
                coins: 0,
                npcValue: isDemo ? 0 : npcValue,
                inventoryAdded,
                inventoryError,
                inventory,
                newBalance,
                isDemo,
                isJellyfish,
                serverAuthoritative: true
            });
        }

        if (this.broadcastToRoom && !isJellyfish && (inventoryAdded || isDemo || !walletAddress)) {
            this.broadcastToRoom(room, {
                type: 'player_caught_fish',
                playerId,
                playerName,
                fish,
                coins: 0,
                npcValue,
                depth,
                isDemo,
                inventoryAdded
            });
        }

        const action = isJellyfish ? 'STUNG by' : 'caught';
        const reward = inventoryAdded ? '→inventory' : isJellyfish ? '' : `(~${npcValue}g NPC)`;
        console.log(`🎣 ${playerName} ${action} ${fish.emoji} ${fish.name} at ${depth}m ${reward}${isDemo ? ' [DEMO]' : ''}`);

        return {
            success: true,
            fish,
            npcValue,
            inventoryAdded,
            inventoryError,
            inventory,
            newBalance,
            isDemo,
            isJellyfish
        };
    }

    handleDisconnect(playerId) {
        this.sessions.delete(playerId);
    }

    static getFishingInfo() {
        const totalWeight = FISH_TYPES.reduce((sum, f) => sum + f.weight, 0);
        return {
            cost: FISHING_COST,
            sellAtNpc: true,
            fish: FISH_TYPES.map(f => ({
                id: f.id,
                emoji: f.emoji,
                name: f.name,
                npcValue: f.coins,
                probability: ((f.weight / totalWeight) * 100).toFixed(1) + '%'
            }))
        };
    }
}

export default FishingService;
export { FISH_TYPES, FISHING_COST };
