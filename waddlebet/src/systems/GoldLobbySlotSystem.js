/**
 * GoldLobbySlotSystem - Snow Forts casino lobby gold slots
 * Each machine has independent state, display, and spin lifecycle.
 */

import { GOLD_SLOT_BET, GOLD_SLOT_BET_MIN, GOLD_SLOT_BET_MAX, clampGoldSlotBet } from '../config/goldSlots.js';

const INTERACTION_RADIUS = 2.8;

class GoldLobbySlotSystem {
    constructor() {
        this.machines = [];
        /** @type {Map<string, object>} */
        this.displayMap = new Map();
        this.nearbyMachine = null;
        this.localSpinning = new Set();
        /** machineId -> playerName for remote spins */
        this.remoteSpinning = new Map();
    }

    init(machines, displays) {
        this.machines = machines || [];
        this.displayMap = new Map();

        const displayList = displays || [];

        // Register by machineId on each display (most reliable)
        for (const display of displayList) {
            if (display?.machineId) {
                this.displayMap.set(display.machineId, display);
            }
        }

        // Fallback: map by displayIndex from machine data
        for (const machine of this.machines) {
            if (this.displayMap.has(machine.id)) continue;
            const display = displayList[machine.displayIndex];
            if (display) {
                this.displayMap.set(machine.id, display);
                if (!display.machineId) {
                    display.machineId = machine.id;
                }
            }
        }
    }

    getDisplay(machineId) {
        if (!machineId) return null;
        const mapped = this.displayMap.get(machineId);
        if (mapped) return mapped;

        const machine = this.machines.find(m => m.id === machineId);
        if (machine?.displayIndex != null) {
            const displays = [...this.displayMap.values()];
            return displays[machine.displayIndex] || null;
        }
        return null;
    }

    isMachineInUse(machineId) {
        return this.localSpinning.has(machineId)
            || this.remoteSpinning.has(machineId)
            || this.getDisplay(machineId)?.isServerSpinning === true;
    }

    checkInteraction(playerX, playerZ, playerCoins, isAuthenticated, playerY = 0, bet = GOLD_SLOT_BET) {
        const safeBet = clampGoldSlotBet(bet);
        if (playerY > 1.5) {
            this.nearbyMachine = null;
            return null;
        }

        let nearest = null;
        let nearestDist = Infinity;

        for (const machine of this.machines) {
            const dx = playerX - machine.x;
            const dz = playerZ - machine.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < INTERACTION_RADIUS && dist < nearestDist) {
                nearestDist = dist;
                nearest = machine;
            }
        }

        this.nearbyMachine = nearest;
        if (!nearest) return null;

        const inUse = this.isMachineInUse(nearest.id);
        const remotePlayer = this.remoteSpinning.get(nearest.id);

        let prompt = `Press E to Spin — ${safeBet} gold`;
        let canSpin = true;
        let reason = null;

        if (inUse) {
            prompt = remotePlayer ? `${remotePlayer} is spinning...` : 'Spinning...';
            canSpin = false;
            reason = 'MACHINE_IN_USE';
        } else if (!isAuthenticated) {
            prompt = 'Sign in to play for gold';
            canSpin = false;
            reason = 'NOT_AUTHENTICATED';
        } else if ((playerCoins || 0) < safeBet) {
            prompt = `Need ${safeBet} gold (you have ${playerCoins || 0})`;
            canSpin = false;
            reason = 'INSUFFICIENT_GOLD';
        }

        return {
            machine: nearest,
            prompt,
            canSpin,
            reason,
            cost: safeBet,
            bet: safeBet,
            betMin: GOLD_SLOT_BET_MIN,
            betMax: GOLD_SLOT_BET_MAX,
            isSpinning: inUse
        };
    }

    startLocalSpin(machineId) {
        const display = this.getDisplay(machineId);
        if (!display) {
            console.warn(`[GoldLobbySlot] No display for machine ${machineId}`);
            return;
        }
        this.localSpinning.add(machineId);
        this.remoteSpinning.delete(machineId);
        display.beginServerSpin?.();
    }

    handleRemoteSpinStart(machineId, playerName) {
        const display = this.getDisplay(machineId);
        if (!display) return;
        this.remoteSpinning.set(machineId, playerName || 'Someone');
        display.beginServerSpin?.();
    }

    revealReel(machineId, reelIndex, symbol) {
        this.getDisplay(machineId)?.revealServerReel?.(reelIndex, symbol);
    }

    completeSpin(machineId, reels, payout, isJackpot) {
        this.localSpinning.delete(machineId);
        this.remoteSpinning.delete(machineId);
        this.getDisplay(machineId)?.finishServerSpin?.(reels, payout, isJackpot);
    }

    handleSpinError(machineId) {
        this.localSpinning.delete(machineId);
        this.remoteSpinning.delete(machineId);
        this.getDisplay(machineId)?.cancelServerSpin?.();
    }

    handleInterrupted(machineId) {
        this.handleSpinError(machineId);
    }
}

export default GoldLobbySlotSystem;
