/**
 * GoldSlotsService - Casino lobby gold slot machines
 * Server-authoritative bets/payouts with realtime room broadcasts
 */

import {
    GOLD_SLOT_BET,
    GOLD_SLOT_SPIN_MS,
    GOLD_SLOT_MACHINE_SET,
    GOLD_SLOT_BET_DEFAULT,
    clampGoldSlotBet,
    rollGoldSlotSymbol,
    calculateGoldSlotPayout,
    calculateGoldSlotRTP,
    getGoldSlotInfo
} from '../config/goldSlots.js';

const VALID_ROOM = 'snow_forts';

class GoldSlotsService {
    constructor(userService, broadcastToRoom, sendToPlayer, publishChatMessage = null) {
        this.userService = userService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
        this.publishChatMessage = publishChatMessage;

        this.activeSpins = new Map();
        this.machineStates = new Map();
        this.playerSpinCounts = new Map();

        console.log(`🎰 GoldSlotsService initialized (bet: ${GOLD_SLOT_BET_DEFAULT}g default, max ${clampGoldSlotBet(25)}g)`);
        const rtp = calculateGoldSlotRTP();
        console.log(`   RTP: ${(rtp * 100).toFixed(2)}% | House edge: ${((1 - rtp) * 100).toFixed(2)}%`);
    }

    getSpinKey(playerId, machineId) {
        return `${playerId}:${machineId}`;
    }

    getMachineKey(machineId) {
        return machineId;
    }

    getPlayerSpinCount(playerId) {
        return this.playerSpinCounts.get(playerId) || 0;
    }

    incrementPlayerSpinCount(playerId) {
        this.playerSpinCounts.set(playerId, this.getPlayerSpinCount(playerId) + 1);
    }

    decrementPlayerSpinCount(playerId) {
        const current = this.getPlayerSpinCount(playerId);
        if (current <= 1) {
            this.playerSpinCounts.delete(playerId);
        } else {
            this.playerSpinCounts.set(playerId, current - 1);
        }
    }

    isValidMachine(machineId) {
        return GOLD_SLOT_MACHINE_SET.has(machineId);
    }

    async canSpin(playerId, walletAddress, machineId, room, bet = GOLD_SLOT_BET_DEFAULT) {
        const safeBet = clampGoldSlotBet(bet);
        if (!room) {
            return { allowed: false, error: 'NO_ROOM', message: 'Not in a room — re-enter town and try again' };
        }

        if (room !== VALID_ROOM) {
            return { allowed: false, error: 'WRONG_ROOM', message: 'Gold slots are only in the Snow Forts casino lobby' };
        }

        if (!this.isValidMachine(machineId)) {
            return { allowed: false, error: 'INVALID_MACHINE', message: 'Invalid slot machine' };
        }

        if (!walletAddress) {
            return { allowed: false, error: 'NOT_AUTHENTICATED', message: 'Sign in to play for gold' };
        }

        const machineKey = this.getMachineKey(machineId);
        if (this.machineStates.has(machineKey)) {
            return { allowed: false, error: 'MACHINE_IN_USE', message: 'This machine is in use' };
        }

        const user = await this.userService.getUser(walletAddress);
        if (!user) {
            return { allowed: false, error: 'USER_NOT_FOUND', message: 'User not found' };
        }

        if ((user.coins || 0) < safeBet) {
            return {
                allowed: false,
                error: 'INSUFFICIENT_GOLD',
                message: `You need ${safeBet} gold (you have ${user.coins || 0})`,
                coinBalance: user.coins || 0,
                required: safeBet
            };
        }

        return { allowed: true, coinBalance: user.coins, bet: safeBet };
    }

    async spin(playerId, walletAddress, room, machineId, playerName, playerPosition, bet = GOLD_SLOT_BET_DEFAULT) {
        const safeBet = clampGoldSlotBet(bet);
        const canSpinResult = await this.canSpin(playerId, walletAddress, machineId, room, safeBet);
        if (!canSpinResult.allowed) {
            return canSpinResult;
        }

        const betResult = await this.userService.addCoins(
            walletAddress,
            -safeBet,
            'slot_spin',
            { machineId, room, bet: safeBet },
            `Gold slot bet on ${machineId}`
        );

        if (!betResult.success) {
            return {
                error: betResult.error || 'INSUFFICIENT_GOLD',
                message: 'Not enough gold',
                coinBalance: betResult.balance
            };
        }

        const reels = [rollGoldSlotSymbol(), rollGoldSlotSymbol(), rollGoldSlotSymbol()];
        const payout = calculateGoldSlotPayout(reels, safeBet);
        const isJackpot = reels[0] === reels[1] && reels[1] === reels[2] && reels[0] === 'gold7';

        let newCoinBalance = betResult.newBalance;

        if (payout > 0) {
            const winResult = await this.userService.addCoins(
                walletAddress,
                payout,
                'slot_payout',
                { machineId, room, reels, payout },
                `Gold slot win on ${machineId}`
            );
            if (winResult.success) {
                newCoinBalance = winResult.newBalance;
            }
        }

        const machineKey = this.getMachineKey(machineId);
        const spinKey = this.getSpinKey(playerId, machineId);

        const spinData = {
            playerId,
            walletAddress,
            machineId,
            machineKey,
            spinKey,
            room,
            playerName,
            playerPosition,
            startTime: Date.now(),
            reels,
            payout,
            net: payout - safeBet,
            isJackpot,
            bet: safeBet,
            newCoinBalance,
            revealedReels: 0
        };

        this.activeSpins.set(spinKey, spinData);
        this.machineStates.set(machineKey, { playerId, state: 'spinning' });
        this.incrementPlayerSpinCount(playerId);

        this.scheduleReelReveals(spinKey, spinData);

        console.log(`[GoldSlot] Spin started ${machineId} by ${playerName}: [${reels.join(', ')}] payout=${payout}g`);

        return {
            success: true,
            machineId,
            bet: safeBet,
            newCoinBalance
        };
    }

    scheduleReelReveals(spinKey, spinData) {
        const revealTimes = [550, 1150, 1750];

        revealTimes.forEach((delay, reelIndex) => {
            setTimeout(() => this.revealReel(spinKey, reelIndex), delay);
        });

        setTimeout(() => this.completeSpin(spinKey), GOLD_SLOT_SPIN_MS);
    }

    revealReel(spinKey, reelIndex) {
        const spin = this.activeSpins.get(spinKey);
        if (!spin) return;

        spin.revealedReels = reelIndex + 1;

        if (this.broadcastToRoom && spin.room) {
            this.broadcastToRoom(spin.room, {
                type: 'gold_slot_reel_reveal',
                playerId: spin.playerId,
                playerName: spin.playerName,
                machineId: spin.machineId,
                reelIndex,
                symbol: spin.reels[reelIndex]
            });
        }
    }

    async completeSpin(spinKey) {
        const spin = this.activeSpins.get(spinKey);
        if (!spin) return;

        const {
            playerId,
            machineId,
            machineKey,
            room,
            playerName,
            playerPosition,
            reels,
            payout,
            net,
            isJackpot,
            bet,
            newCoinBalance
        } = spin;

        if (this.sendToPlayer) {
            this.sendToPlayer(playerId, {
                type: 'gold_slot_result',
                machineId,
                reels,
                payout,
                net,
                bet,
                isJackpot,
                newCoinBalance
            });
        }

        if (this.broadcastToRoom && room) {
            this.broadcastToRoom(room, {
                type: 'gold_slot_complete',
                playerId,
                playerName,
                playerPosition,
                machineId,
                reels,
                payout,
                net,
                isJackpot
            }, playerId);

            if (payout > 0) {
                const winText = isJackpot
                    ? `💰 ${playerName} hit the JACKPOT for ${payout} gold!`
                    : payout >= 100
                        ? `✨ ${playerName} won ${payout} gold on the slots!`
                        : `🎰 ${playerName} won ${payout} gold`;

                if (this.publishChatMessage) {
                    await this.publishChatMessage({
                        channel: 'casino',
                        scopeKey: 'casino',
                        senderId: 'casino_slots',
                        senderName: '🎰 Casino',
                        text: winText,
                        metadata: { payout, isJackpot, playerName, machineId }
                    });
                } else {
                    this.broadcastToRoom(room, {
                        type: 'chat',
                        playerId: 'casino_slots',
                        name: '🎰 Casino',
                        text: winText,
                        timestamp: Date.now()
                    });
                }
            }
        }

        this.activeSpins.delete(spinKey);
        this.machineStates.delete(machineKey);
        this.decrementPlayerSpinCount(playerId);
    }

    getActiveSpins(room) {
        const active = [];
        for (const spin of this.activeSpins.values()) {
            if (spin.room === room) {
                active.push({
                    playerId: spin.playerId,
                    playerName: spin.playerName,
                    machineId: spin.machineId,
                    playerPosition: spin.playerPosition,
                    revealedReels: spin.revealedReels || 0,
                    reels: spin.reels.slice(0, spin.revealedReels || 0)
                });
            }
        }
        return active;
    }

    handleDisconnect(playerId) {
        const toRemove = [];
        for (const [spinKey, spin] of this.activeSpins) {
            if (spin.playerId === playerId) {
                toRemove.push({ spinKey, spin });
            }
        }

        for (const { spinKey, spin } of toRemove) {
            this.machineStates.delete(spin.machineKey);
            this.activeSpins.delete(spinKey);

            if (this.broadcastToRoom && spin.room) {
                this.broadcastToRoom(spin.room, {
                    type: 'gold_slot_interrupted',
                    playerId,
                    machineId: spin.machineId
                });
            }
        }

        this.playerSpinCounts.delete(playerId);
    }

    isMachineInUse(machineId) {
        return this.machineStates.has(this.getMachineKey(machineId));
    }

    static getInfo() {
        return getGoldSlotInfo();
    }
}

export default GoldSlotsService;
export { GOLD_SLOT_BET, GOLD_SLOT_SPIN_MS };
