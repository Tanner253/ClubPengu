/**

 * WoodcuttingService — server-authoritative forest tree chopping.

 */



import crypto from 'crypto';

import { ECONOMY, getChopDurabilityLoss } from '../config/economy.js';

import { getHarvestableTree, getStageConfig } from '../config/harvestableTrees.js';

import { getGameItem } from '../config/gameItems.js';



const SESSION_TTL_MS = 5 * 60 * 1000;

const CHOP_MOVE_CANCEL_RADIUS = 2.5;

export const CHOP_AXE_IDS = new Set(['basic_axe', 'iron_axe', 'steel_axe', 'master_axe']);



class WoodcuttingService {

    constructor(userService, gameInventoryService, forestTreeService, sendToPlayer) {

        this.userService = userService;

        this.gameInventoryService = gameInventoryService;

        this.forestTreeService = forestTreeService;

        this.sendToPlayer = sendToPlayer;

        /** @type {Map<string, object>} */

        this.sessions = new Map();

    }



    _getAxeConfig(itemId) {

        return ECONOMY.TOOLS[itemId] || ECONOMY.TOOLS.basic_axe;

    }



    _computeDurationMs(stage, axeItemId) {

        const stageCfg = getStageConfig(stage);

        const base = stageCfg?.chopDurationMs || ECONOMY.WOODCUTTING.CHOP_DURATION_MS;

        const axeCfg = this._getAxeConfig(axeItemId);

        const mult = axeCfg.chopSpeedMultiplier ?? 1;

        return Math.max(3000, Math.round(base * mult));

    }



    _createSession(playerId, treeId, stage, isDemo, startPosition, axeItemId = null) {

        const sessionId = crypto.randomUUID();

        this.sessions.set(playerId, {

            sessionId,

            treeId,

            stage,

            isDemo,

            axeItemId,

            createdAt: Date.now(),

            consumed: false,

            startX: startPosition?.x ?? null,

            startZ: startPosition?.z ?? null,

            chopDurationMs: this._computeDurationMs(stage, axeItemId || 'basic_axe')

        });

        return sessionId;

    }



    _validateSession(playerId, sessionId) {

        const session = this.sessions.get(playerId);

        if (!session) {

            return { error: 'NO_SESSION', message: 'Start chopping before reporting a result' };

        }

        if (session.consumed) {

            return { error: 'SESSION_USED', message: 'This chop was already resolved' };

        }

        if (sessionId && session.sessionId !== sessionId) {

            return { error: 'INVALID_SESSION', message: 'Invalid chop session' };

        }

        if (Date.now() - session.createdAt > SESSION_TTL_MS) {

            this.cancelChop(playerId, 'SESSION_EXPIRED');

            return { error: 'SESSION_EXPIRED', message: 'Chop session expired — try again' };

        }

        return { session };

    }



    _consumeSession(playerId) {

        const session = this.sessions.get(playerId);

        if (session) session.consumed = true;

    }



    async _getEquippedAxe(walletAddress) {

        const user = await this.gameInventoryService.userService.getUser(walletAddress);

        if (!user) return null;

        const equipped = this.gameInventoryService.getEquippedTool(user);

        if (!equipped || !CHOP_AXE_IDS.has(equipped.itemId)) return null;

        return equipped;

    }



    cancelChop(playerId, reason = 'CANCELLED') {

        const session = this.sessions.get(playerId);

        if (!session) return { cancelled: false };



        const treeId = session.treeId;

        this.forestTreeService.releaseTree(treeId, playerId);

        this.sessions.delete(playerId);



        return {

            cancelled: true,

            treeId,

            reason,

            treeState: this.forestTreeService.getTreePublicState(treeId)

        };

    }



    checkPlayerMoved(playerId, x, z) {

        const session = this.sessions.get(playerId);

        if (!session || session.consumed) return null;

        if (session.startX == null || session.startZ == null) return null;



        const dx = x - session.startX;

        const dz = z - session.startZ;

        if (Math.sqrt(dx * dx + dz * dz) <= CHOP_MOVE_CANCEL_RADIUS) return null;



        return this.cancelChop(playerId, 'MOVED');

    }



    async startChop(playerId, walletAddress, treeId, isDemo = false, startPosition = null) {

        const def = getHarvestableTree(treeId);

        if (!def) {

            return { error: 'INVALID_TREE', message: 'Unknown harvestable tree' };

        }



        if (!this.forestTreeService.isAvailableForPlayer(treeId, playerId)) {

            const tree = this.forestTreeService.getTree(treeId);

            if (tree?.choppingBy && tree.choppingBy !== playerId) {

                return { error: 'TREE_LOCKED', message: 'Someone else is already chopping this tree' };

            }

            return { error: 'TREE_REGROWING', message: 'This tree is regrowing — come back later' };

        }



        const stageCfg = getStageConfig(def.stage);



        if (isDemo) {

            const reserve = this.forestTreeService.reserveTree(treeId, playerId);

            if (reserve.error) return reserve;

            const sessionId = this._createSession(playerId, treeId, def.stage, true, startPosition);

            return {

                success: true,

                treeId,

                spotId: treeId,

                sessionId,

                stage: def.stage,

                woodYield: stageCfg?.wood || 1,

                durationMs: this._computeDurationMs(def.stage, 'basic_axe'),

                isDemo: true,

                treeState: reserve.treeState

            };

        }



        if (!walletAddress) {

            return { error: 'NOT_AUTHENTICATED', message: 'Connect wallet to chop wood' };

        }



        const equippedAxe = await this._getEquippedAxe(walletAddress);

        if (!equippedAxe) {

            return {

                error: 'NO_AXE',

                message: 'Equip an axe on the hotbar (press 1–5) to chop trees'

            };

        }



        const reserve = this.forestTreeService.reserveTree(treeId, playerId);

        if (reserve.error) return reserve;



        const sessionId = this._createSession(

            playerId,

            treeId,

            def.stage,

            false,

            startPosition,

            equippedAxe.itemId

        );



        return {

            success: true,

            treeId,

            spotId: treeId,

            sessionId,

            stage: def.stage,

            woodYield: stageCfg?.wood || 1,

            durationMs: this._computeDurationMs(def.stage, equippedAxe.itemId),

            isDemo: false,

            axeDurability: equippedAxe.durability,

            axeMaxDurability: equippedAxe.maxDurability,

            treeState: reserve.treeState

        };

    }



    async handleChopResult(playerId, walletAddress, { sessionId, success }) {

        const validation = this._validateSession(playerId, sessionId);

        if (validation.error) return validation;



        const { session } = validation;

        this._consumeSession(playerId);



        if (!success) {

            const cancel = this.cancelChop(playerId, 'FAILED');

            return { missed: true, treeState: cancel.treeState };

        }



        if (session.isDemo || !walletAddress) {

            this.forestTreeService.releaseTree(session.treeId, playerId);

            const stageCfg = getStageConfig(session.stage);

            return {

                success: true,

                wood: { quantity: stageCfg?.wood || 1, stage: session.stage },

                isDemo: true,

                inventoryAdded: false

            };

        }



        if (!this.forestTreeService.isAvailableForPlayer(session.treeId, playerId)) {

            this.forestTreeService.releaseTree(session.treeId, playerId);

            return { error: 'TREE_REGROWING', message: 'Someone else already chopped this tree' };

        }



        const harvest = await this.forestTreeService.harvestTree(session.treeId);

        if (harvest.error) {

            this.forestTreeService.releaseTree(session.treeId, playerId);

            return harvest;

        }



        const itemDef = getGameItem(harvest.logItemId);

        const addResult = await this.gameInventoryService.addItem(

            walletAddress,

            harvest.logItemId,

            harvest.wood,

            {

                name: itemDef?.name,

                emoji: itemDef?.emoji,

                npcValue: itemDef?.npcValue,

                category: 'wood',

                tier: itemDef?.tier

            }

        );



        if (addResult.error) {

            return {

                error: addResult.error,

                message: addResult.message || 'Could not add wood to backpack',

                wood: harvest

            };

        }



        const damageResult = await this.gameInventoryService.damageEquippedTool(
            walletAddress,
            getChopDurabilityLoss(session.stage, session.axeItemId || 'basic_axe')
        );

        let inventory = addResult.inventory;

        if (damageResult.inventory) inventory = damageResult.inventory;



        return {

            success: true,

            treeId: session.treeId,

            wood: {

                id: harvest.logItemId,

                name: itemDef?.name || harvest.logItemId,

                emoji: itemDef?.emoji || '🪵',

                quantity: harvest.wood,

                npcValue: itemDef?.npcValue ?? 0,

                stage: session.stage,

                label: harvest.label

            },

            treeState: this.forestTreeService.getTreePublicState(session.treeId),

            inventoryAdded: true,

            inventory,

            axeBroken: damageResult.broken === true,

            axeDurability: damageResult.durability,

            axeMaxDurability: damageResult.maxDurability

        };

    }



    handleDisconnect(playerId) {

        const cancel = this.cancelChop(playerId, 'DISCONNECT');

        this.forestTreeService.releaseAllForPlayer(playerId);

        this.sessions.delete(playerId);

        return cancel;

    }

}



export default WoodcuttingService;


