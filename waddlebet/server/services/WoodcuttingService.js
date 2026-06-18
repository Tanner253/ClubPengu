/**

 * WoodcuttingService — server-authoritative forest tree chopping.

 */



import crypto from 'crypto';

import { ECONOMY, getChopDurabilityLoss } from '../config/economy.js';

import { getHarvestableTree, getStageConfig, getWoodYield } from '../config/harvestableTrees.js';

import { getGameItem } from '../config/gameItems.js';

import { rollWoodChopLoot, getWoodChopQuantityForLog } from '../config/woodcuttingLoot.js';

import { MANUAL_CHOP, computeCutAmount, shouldManualTreeFall } from '../config/manualChop.js';



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

    /** Live stage from ForestTreeService (sapling/baby/mature/elder), not static placement def. */
    _resolveTreeStage(treeId) {
        const tree = this.forestTreeService.getTree(treeId);
        const def = getHarvestableTree(treeId);
        return tree?.stage || def?.stage || 'mature';
    }



    _computeDurationMs(stage, axeItemId) {

        const stageCfg = getStageConfig(stage);

        const base = stageCfg?.chopDurationMs || ECONOMY.WOODCUTTING.CHOP_DURATION_MS;

        const axeCfg = this._getAxeConfig(axeItemId);

        const mult = axeCfg.chopSpeedMultiplier ?? 1;

        return Math.max(3000, Math.round(base * mult));

    }



    _createSession(playerId, treeId, stage, isDemo, startPosition, axeItemId = null, mode = 'hold') {

        const sessionId = crypto.randomUUID();

        this.sessions.set(playerId, {

            sessionId,

            treeId,

            stage,

            isDemo,

            axeItemId,

            mode,

            leftCut: 0,

            rightCut: 0,

            hitCount: 0,

            lastHitAt: 0,

            falling: false,

            createdAt: Date.now(),

            consumed: false,

            startX: startPosition?.x ?? null,

            startZ: startPosition?.z ?? null,

            chopDurationMs: mode === 'manual'
                ? 0
                : this._computeDurationMs(stage, axeItemId || 'basic_axe')

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

        if (def.chopMode === 'manual') {

            return { error: 'MANUAL_TREE', message: 'Use manual chop on this tree (press E)' };

        }



        if (!this.forestTreeService.isAvailableForPlayer(treeId, playerId)) {

            const tree = this.forestTreeService.getTree(treeId);

            if (tree?.choppingBy && tree.choppingBy !== playerId) {

                return { error: 'TREE_LOCKED', message: 'Someone else is already chopping this tree' };

            }

            return { error: 'TREE_REGROWING', message: 'This tree is regrowing — come back later' };

        }



        const stage = this._resolveTreeStage(treeId);
        const stageCfg = getStageConfig(stage);



        if (isDemo) {

            const reserve = this.forestTreeService.reserveTree(treeId, playerId);

            if (reserve.error) return reserve;

            const sessionId = this._createSession(playerId, treeId, stage, true, startPosition);

            return {

                success: true,

                treeId,

                spotId: treeId,

                sessionId,

                stage,

                woodYield: stageCfg?.wood || 1,

                durationMs: this._computeDurationMs(stage, 'basic_axe'),

                isDemo: true,

                chopMode: 'hold',

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

        const capacityError = await this._ensureWoodChopCapacity(
            walletAddress,
            treeId,
            equippedAxe.itemId,
            'hold'
        );
        if (capacityError) return capacityError;



        const reserve = this.forestTreeService.reserveTree(treeId, playerId);

        if (reserve.error) return reserve;

        const sessionId = this._createSession(

            playerId,

            treeId,

            stage,

            false,

            startPosition,

            equippedAxe.itemId

        );



        return {

            success: true,

            treeId,

            spotId: treeId,

            sessionId,

            stage,

            woodYield: stageCfg?.wood || 1,

            durationMs: this._computeDurationMs(stage, equippedAxe.itemId),

            isDemo: false,

            chopMode: 'hold',

            axeDurability: equippedAxe.durability,

            axeMaxDurability: equippedAxe.maxDurability,

            treeState: reserve.treeState

        };

    }



    async _ensureWoodChopCapacity(walletAddress, treeId, axeItemId, chopMode) {
        const tree = this.forestTreeService.getTree(treeId);
        const def = getHarvestableTree(treeId);
        const stage = tree?.stage || def?.stage || 'mature';
        const woodType = def?.woodType || 'pine_log';

        const qty = getWoodChopQuantityForLog(stage, woodType, axeItemId, chopMode);
        const itemDef = getGameItem(woodType);
        const capacity = await this.gameInventoryService.canAddItem(
            walletAddress,
            woodType,
            qty,
            {
                name: itemDef?.name,
                emoji: itemDef?.emoji,
                npcValue: itemDef?.npcValue,
                category: 'wood',
                tier: itemDef?.tier
            }
        );
        if (capacity.ok) return null;

        return {
            error: capacity.error || 'INVENTORY_FULL',
            message: capacity.message || 'Backpack is full — upgrade or sell items'
        };
    }



    /**
     * Roll loot, verify backpack space, harvest tree, grant wood. Rolls back harvest if add fails.
     */
    async _completeChopHarvest(playerId, walletAddress, session) {
        const def = getHarvestableTree(session.treeId);
        const chopMode = session.mode === 'manual' ? 'manual' : (def?.chopMode || 'hold');
        const axeItemId = session.axeItemId || 'basic_axe';

        const liveTree = this.forestTreeService.getTree(session.treeId);
        const stage = liveTree?.stage || session.stage;

        const loot = rollWoodChopLoot({
            treeId: session.treeId,
            stage,
            axeItemId,
            chopMode,
            woodType: def?.woodType,
        });

        const itemDef = getGameItem(loot.logItemId);
        const itemMeta = {
            name: itemDef?.name,
            emoji: itemDef?.emoji,
            npcValue: itemDef?.npcValue,
            category: 'wood',
            tier: itemDef?.tier
        };

        const capacity = await this.gameInventoryService.canAddItem(
            walletAddress,
            loot.logItemId,
            loot.quantity,
            itemMeta
        );
        if (!capacity.ok) {
            this.forestTreeService.releaseTree(session.treeId, playerId);
            return {
                error: capacity.error || 'INVENTORY_FULL',
                message: capacity.message || 'Backpack is full — upgrade or sell items',
                treeState: this.forestTreeService.getTreePublicState(session.treeId)
            };
        }

        if (!this.forestTreeService.isAvailableForPlayer(session.treeId, playerId)) {
            this.forestTreeService.releaseTree(session.treeId, playerId);
            return {
                error: 'TREE_REGROWING',
                message: 'Someone else already chopped this tree',
                treeState: this.forestTreeService.getTreePublicState(session.treeId)
            };
        }

        const harvest = await this.forestTreeService.harvestTree(session.treeId, {
            axeItemId,
            chopMode,
            loot
        });

        if (harvest.error) {
            this.forestTreeService.releaseTree(session.treeId, playerId);
            return {
                ...harvest,
                treeState: this.forestTreeService.getTreePublicState(session.treeId)
            };
        }

        const addResult = await this.gameInventoryService.addItem(
            walletAddress,
            harvest.logItemId,
            harvest.wood,
            itemMeta
        );

        if (addResult.error) {
            const treeState = await this.forestTreeService.revertHarvest(
                session.treeId,
                harvest.preHarvest
            );
            return {
                error: addResult.error,
                message: addResult.message || 'Could not add wood to backpack',
                treeState
            };
        }

        const damageResult = await this.gameInventoryService.damageEquippedTool(
            walletAddress,
            getChopDurabilityLoss(stage, axeItemId)
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
                stage,
                label: harvest.label
            },
            treeState: this.forestTreeService.getTreePublicState(session.treeId),
            inventoryAdded: true,
            inventory,
            axeBroken: damageResult.broken === true,
            axeDurability: damageResult.durability,
            axeMaxDurability: damageResult.maxDurability,
            woodMultiplier: harvest.woodMultiplier,
            chopMode
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

            return {
                error: 'TREE_REGROWING',
                message: 'Someone else already chopped this tree',
                treeState: this.forestTreeService.getTreePublicState(session.treeId)
            };

        }

        return this._completeChopHarvest(playerId, walletAddress, session);

    }



    async startManualChop(playerId, walletAddress, treeId, isDemo = false, startPosition = null) {

        const def = getHarvestableTree(treeId);

        if (!def) {

            return { error: 'INVALID_TREE', message: 'Unknown harvestable tree' };

        }

        if (def.chopMode !== 'manual') {

            return { error: 'NOT_MANUAL_TREE', message: 'Hold E to chop this tree' };

        }

        if (!this.forestTreeService.isAvailableForPlayer(treeId, playerId)) {

            const tree = this.forestTreeService.getTree(treeId);

            if (tree?.choppingBy && tree.choppingBy !== playerId) {

                return { error: 'TREE_LOCKED', message: 'Someone else is already chopping this tree' };

            }

            return { error: 'TREE_REGROWING', message: 'This tree is regrowing — come back later' };

        }

        const stage = this._resolveTreeStage(treeId);

        if (isDemo) {

            const reserve = this.forestTreeService.reserveTree(treeId, playerId);

            if (reserve.error) return reserve;

            const sessionId = this._createSession(playerId, treeId, stage, true, startPosition, null, 'manual');

            return {

                success: true,

                treeId,

                sessionId,

                stage,

                woodYield: getWoodYield(stage, { chopMode: 'manual' }),

                isDemo: true,

                chopMode: 'manual',

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

        const capacityError = await this._ensureWoodChopCapacity(
            walletAddress,
            treeId,
            equippedAxe.itemId,
            'manual'
        );
        if (capacityError) return capacityError;

        const reserve = this.forestTreeService.reserveTree(treeId, playerId);

        if (reserve.error) return reserve;

        const sessionId = this._createSession(

            playerId,

            treeId,

            stage,

            false,

            startPosition,

            equippedAxe.itemId,

            'manual'

        );

        return {

            success: true,

            treeId,

            sessionId,

            stage,

            woodYield: getWoodYield(stage, { chopMode: 'manual' }),

            isDemo: false,

            chopMode: 'manual',

            axeDurability: equippedAxe.durability,

            axeMaxDurability: equippedAxe.maxDurability,

            treeState: reserve.treeState

        };

    }



    manualChopHit(playerId, { sessionId, side, speed = 2 }) {

        const validation = this._validateSession(playerId, sessionId);

        if (validation.error) return validation;

        const { session } = validation;

        if (session.mode !== 'manual') {

            return { error: 'NOT_MANUAL_SESSION', message: 'Invalid chop session' };

        }

        const hitSide = side === -1 || side === 1 ? side : null;

        if (session.falling) {
            return {
                success: true,
                treeId: session.treeId,
                side: hitSide ?? (session.leftCut >= session.rightCut ? -1 : 1),
                speed,
                leftCut: session.leftCut,
                rightCut: session.rightCut,
                hitCount: session.hitCount,
                falling: true
            };
        }

        if (!hitSide) {

            return { error: 'INVALID_SIDE', message: 'Invalid chop side' };

        }

        const now = Date.now();

        if (session.lastHitAt && now - session.lastHitAt < MANUAL_CHOP.HIT_COOLDOWN_MS) {

            return { error: 'HIT_COOLDOWN', message: 'Swing too fast' };

        }

        session.lastHitAt = now;
        session.hitCount += 1;

        const cutAmount = computeCutAmount(speed);

        if (hitSide === -1) session.leftCut = Math.min(1, session.leftCut + cutAmount);

        else session.rightCut = Math.min(1, session.rightCut + cutAmount);

        let falling = false;

        if (shouldManualTreeFall(session.leftCut, session.rightCut, session.hitCount)) {

            session.falling = true;

            falling = true;

        }

        return {

            success: true,

            treeId: session.treeId,

            side: hitSide,

            speed,

            leftCut: session.leftCut,

            rightCut: session.rightCut,

            hitCount: session.hitCount,

            falling

        };

    }



    async completeManualChop(playerId, walletAddress, { sessionId }) {

        const validation = this._validateSession(playerId, sessionId);

        if (validation.error) return validation;

        const { session } = validation;

        if (session.mode !== 'manual') {

            return { error: 'NOT_MANUAL_SESSION', message: 'Invalid chop session' };

        }

        if (!session.falling) {

            return { error: 'NOT_READY', message: 'Keep chopping until the tree falls' };

        }

        if (session.isDemo || !walletAddress) {

            this._consumeSession(playerId);

            this.forestTreeService.releaseTree(session.treeId, playerId);

            return {

                success: true,

                wood: { quantity: getWoodYield(session.stage, 'manual'), stage: session.stage },

                isDemo: true,

                inventoryAdded: false,

                chopMode: 'manual'

            };

        }

        if (!this.forestTreeService.isAvailableForPlayer(session.treeId, playerId)) {

            this.forestTreeService.releaseTree(session.treeId, playerId);

            return {
                error: 'TREE_REGROWING',
                message: 'Someone else already chopped this tree',
                treeState: this.forestTreeService.getTreePublicState(session.treeId)
            };

        }

        const result = await this._completeChopHarvest(playerId, walletAddress, session);
        if (result.error) return result;

        this._consumeSession(playerId);

        return {
            ...result,
            chopMode: 'manual'
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


