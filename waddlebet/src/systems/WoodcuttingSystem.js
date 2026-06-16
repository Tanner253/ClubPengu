/**
 * WoodcuttingSystem — harvestable tree proximity & interaction prompts.
 */

import { FOREST_ZONE_OFFSET, FOREST_ZONE_SIZE, getStageConfig } from '../config/harvestableTrees';
import { hasEquippedAxe, getEquippedHotbarTool, ownsAnyAxe } from '../utils/gameHotbar';
import { getChopDurabilityLoss } from '../config/economy';

class WoodcuttingSystem {
    constructor() {
        this.forestTreeManager = null;
        this.equippedTool = null;
        this.hasAxe = false;
        this.isAuthenticated = false;
        this.nearbyTree = null;
        this.localChopTreeId = null;
        this.localPlayerId = null;
    }

    setLocalPlayerId(playerId) {
        this.localPlayerId = playerId;
    }

    setForestTreeManager(manager) {
        this.forestTreeManager = manager;
    }

    isInForestZone(x, z) {
        return x >= FOREST_ZONE_OFFSET.x && x < FOREST_ZONE_OFFSET.x + FOREST_ZONE_SIZE &&
            z >= FOREST_ZONE_OFFSET.z && z < FOREST_ZONE_OFFSET.z + FOREST_ZONE_SIZE;
    }

    checkInteraction(playerX, playerZ, gameInventory, isAuthenticated) {
        this.equippedTool = getEquippedHotbarTool(gameInventory);
        this.hasAxe = hasEquippedAxe(gameInventory);
        this.isAuthenticated = isAuthenticated;

        if (!this.isInForestZone(playerX, playerZ) || !this.forestTreeManager) {
            this.nearbyTree = null;
            return null;
        }

        const nearest = this.forestTreeManager.findNearestInteraction(playerX, playerZ);
        this.nearbyTree = nearest;
        if (!nearest) return null;

        const isLocalChopping = this.localChopTreeId === nearest.treeId;
        let canChop = true;
        let reason = null;

        if (!this.hasAxe) {
            canChop = false;
            const ownsAxe = ownsAnyAxe(gameInventory);
            reason = ownsAxe ? 'AXE_NOT_EQUIPPED' : 'NO_AXE';
        } else if (nearest.choppingBy && nearest.choppingBy !== this.localPlayerId) {
            canChop = false;
            reason = 'TREE_LOCKED';
        } else if (!this.isAuthenticated) {
            canChop = false;
            reason = 'NOT_AUTHENTICATED';
        } else if (isLocalChopping) {
            canChop = false;
            reason = 'ALREADY_CHOPPING';
        }

        const stageCfg = getStageConfig(nearest.stage);

        return {
            treeId: nearest.treeId,
            spotId: nearest.treeId,
            stage: nearest.stage,
            woodYield: nearest.woodYield,
            canChop,
            reason,
            prompt: this.buildPrompt(nearest, canChop, reason, stageCfg, this.equippedTool),
            dist: nearest.dist,
            axeDurability: this.equippedTool?.durability,
            axeMaxDurability: this.equippedTool?.maxDurability
        };
    }

    buildPrompt(tree, canChop, reason, stageCfg, equippedTool) {
        if (reason === 'NO_AXE') {
            return 'Buy a Basic Axe from Copper Clive in town';
        }
        if (reason === 'AXE_NOT_EQUIPPED') {
            return 'Equip your axe on the hotbar (press 1–5)';
        }
        if (reason === 'NOT_AUTHENTICATED') {
            return 'Connect wallet to chop wood into your backpack';
        }
        if (reason === 'TREE_LOCKED') {
            return 'Someone else is chopping this tree';
        }
        if (reason === 'ALREADY_CHOPPING') {
            return 'Chopping…';
        }
        const dur = equippedTool?.durability;
        const maxDur = equippedTool?.maxDurability;
        const axeId = equippedTool?.itemId || 'basic_axe';
        const wear = tree.stage ? getChopDurabilityLoss(tree.stage, axeId) : 1;
        const durText = dur != null && maxDur != null ? ` · axe ${dur}/${maxDur} (−${wear})` : '';
        return `Press E to chop ${stageCfg?.label || tree.label} (+${tree.woodYield} wood)${durText}`;
    }

    setLocalChopping(treeId) {
        this.localChopTreeId = treeId;
    }

    clearLocalChopping() {
        this.localChopTreeId = null;
    }
}

export default WoodcuttingSystem;
