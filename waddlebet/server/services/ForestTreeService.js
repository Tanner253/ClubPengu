/**
 * ForestTreeService — server-authoritative harvestable tree state, regrowth & persistence.
 */

import { isDBConnected } from '../db/connection.js';
import ForestTreeWorldState from '../db/models/ForestTreeWorldState.js';
import {
    HARVESTABLE_TREES,
    getHarvestableTree,
    getStageConfig,
    MANUAL_WOOD_MULTIPLIER,
    STAGE_ORDER
} from '../config/harvestableTrees.js';
import { FOREST_MATURATION } from '../config/forestMaturation.js';
import { rollWoodChopLoot } from '../config/woodcuttingLoot.js';

const WORLD_STATE_ID = 'forest_trees';

function hashTreeId(id = '') {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return (h % 1000) / 1000;
}

/** Backdate stageSince so the world spawns with mixed stages that can still mature. */
function computeInitialStageSince(def) {
    const idx = STAGE_ORDER.indexOf(def.stage);
    if (idx <= 0 || def.stage === 'elder') return Date.now();

    let elapsed = 0;
    for (let i = 0; i < idx; i++) {
        elapsed += FOREST_MATURATION.STAGE_GROWTH_MS[STAGE_ORDER[i]] || 0;
    }
    const currentMs = FOREST_MATURATION.STAGE_GROWTH_MS[def.stage];
    if (currentMs) {
        elapsed += hashTreeId(def.id) * currentMs * 0.65;
    }
    return Date.now() - elapsed;
}

class ForestTreeService {
    constructor() {
        /** @type {Map<string, object>} */
        this.trees = new Map();
        for (const def of HARVESTABLE_TREES) {
            this.trees.set(def.id, {
                id: def.id,
                localX: def.localX,
                localZ: def.localZ,
                stage: def.stage,
                state: 'ready',
                regrowAt: null,
                stageSince: computeInitialStageSince(def),
                choppingBy: null,
                chopStartedAt: null
            });
        }
        this._loadedFromDb = false;
    }

    /**
     * Load saved tree states from MongoDB (call after connectDB in startup).
     */
    async loadFromDatabase() {
        if (!isDBConnected()) {
            console.log('🌲 Forest trees: no DB — in-memory only (reset on restart)');
            return;
        }

        try {
            const doc = await ForestTreeWorldState.findById(WORLD_STATE_ID).lean();
            const saved = doc?.trees || {};
            let applied = 0;
            let regrownOnLoad = 0;

            for (const [treeId, entry] of Object.entries(saved)) {
                const tree = this.trees.get(treeId);
                if (!tree || !entry) continue;

                tree.state = entry.state === 'harvested' ? 'harvested' : 'ready';
                tree.regrowAt = entry.regrowAt ?? null;
                if (entry.stage && STAGE_ORDER.includes(entry.stage)) {
                    tree.stage = entry.stage;
                }
                tree.choppingBy = null;
                tree.chopStartedAt = null;
                tree.stageSince = entry.stageSince
                    ?? computeInitialStageSince(getHarvestableTree(treeId) || { id: treeId, stage: tree.stage });

                if (tree.state === 'harvested' && !tree.regrowAt) {
                    tree.regrowAt = Date.now() + getStageConfig('sapling').respawnMs;
                }

                if (tree.state === 'harvested' && tree.regrowAt && Date.now() >= tree.regrowAt) {
                    tree.state = 'ready';
                    tree.regrowAt = null;
                    tree.stageSince = Date.now();
                    regrownOnLoad++;
                    await this.persistTree(treeId);
                }

                applied++;
            }

            this._loadedFromDb = true;
            console.log(`🌲 Forest trees loaded from DB: ${applied} saved, ${regrownOnLoad} regrown on load`);
        } catch (err) {
            console.error('🌲 Failed to load forest tree state:', err.message);
        }
    }

    async persistTree(treeId) {
        if (!isDBConnected()) return;

        const tree = this.trees.get(treeId);
        if (!tree) return;

        const payload = {
            state: tree.state,
            regrowAt: tree.regrowAt,
            stage: tree.stage,
            stageSince: tree.stageSince ?? null,
            lastHarvestedAt: tree.state === 'harvested' ? Date.now() : null
        };

        try {
            await ForestTreeWorldState.findByIdAndUpdate(
                WORLD_STATE_ID,
                {
                    $set: {
                        [`trees.${treeId}`]: payload,
                        updatedAt: new Date()
                    }
                },
                { upsert: true }
            );
        } catch (err) {
            console.error(`🌲 Failed to persist tree ${treeId}:`, err.message);
        }
    }

    _regrowTree(tree) {
        tree.state = 'ready';
        tree.regrowAt = null;
        tree.choppingBy = null;
        tree.chopStartedAt = null;
        tree.stageSince = Date.now();
    }

    async tickRegrowth() {
        const now = Date.now();
        const regrown = [];

        for (const tree of this.trees.values()) {
            if (tree.state !== 'harvested') continue;

            if (!tree.regrowAt) {
                tree.regrowAt = now + getStageConfig('sapling').respawnMs;
                await this.persistTree(tree.id);
                continue;
            }

            if (now >= tree.regrowAt) {
                this._regrowTree(tree);
                regrown.push(tree.id);
                await this.persistTree(tree.id);
            }
        }

        return regrown;
    }

    /**
     * Passive maturation — ready trees advance one stage after STAGE_GROWTH_MS at their current stage.
     * @returns {Promise<string[]>} tree ids that advanced a stage
     */
    async tickMaturation() {
        const now = Date.now();
        const updated = [];
        const growthMs = FOREST_MATURATION.STAGE_GROWTH_MS;

        for (const tree of this.trees.values()) {
            if (tree.state !== 'ready' || tree.stage === 'elder') continue;

            if (!tree.stageSince) {
                tree.stageSince = now;
                continue;
            }

            const required = growthMs[tree.stage];
            if (!required || now - tree.stageSince < required) continue;

            const idx = STAGE_ORDER.indexOf(tree.stage);
            if (idx < 0 || idx >= STAGE_ORDER.length - 1) continue;

            tree.stage = STAGE_ORDER[idx + 1];
            tree.stageSince = now;
            updated.push(tree.id);
            await this.persistTree(tree.id);
        }

        return updated;
    }

    getTree(treeId) {
        return this.trees.get(treeId) || null;
    }

    getSnapshot() {
        return Array.from(this.trees.values()).map(t => ({
            id: t.id,
            localX: t.localX,
            localZ: t.localZ,
            stage: t.stage,
            state: t.state,
            regrowAt: t.regrowAt,
            choppingBy: t.choppingBy
        }));
    }

    isReady(treeId) {
        const tree = this.getTree(treeId);
        return Boolean(tree && tree.state === 'ready' && !tree.choppingBy);
    }

    isAvailableForPlayer(treeId, playerId) {
        const tree = this.getTree(treeId);
        if (!tree || tree.state !== 'ready') return false;
        return !tree.choppingBy || tree.choppingBy === playerId;
    }

    reserveTree(treeId, playerId) {
        const tree = this.getTree(treeId);
        if (!tree) return { error: 'INVALID_TREE', message: 'Unknown tree' };
        if (tree.state === 'harvested') {
            return { error: 'TREE_REGROWING', message: 'This tree is regrowing — come back later' };
        }
        if (tree.choppingBy && tree.choppingBy !== playerId) {
            return { error: 'TREE_LOCKED', message: 'Someone else is already chopping this tree' };
        }
        tree.choppingBy = playerId;
        tree.chopStartedAt = Date.now();
        return { success: true, treeState: this.getTreePublicState(treeId) };
    }

    releaseTree(treeId, playerId = null) {
        const tree = this.getTree(treeId);
        if (!tree) return null;
        if (playerId && tree.choppingBy && tree.choppingBy !== playerId) return null;
        tree.choppingBy = null;
        tree.chopStartedAt = null;
        return this.getTreePublicState(treeId);
    }

    releaseAllForPlayer(playerId) {
        const released = [];
        for (const tree of this.trees.values()) {
            if (tree.choppingBy === playerId) {
                tree.choppingBy = null;
                tree.chopStartedAt = null;
                released.push(this.getTreePublicState(tree.id));
            }
        }
        return released;
    }

    async revertHarvest(treeId, snapshot) {
        const tree = this.getTree(treeId);
        if (!tree || !snapshot) return null;

        tree.state = snapshot.state;
        tree.stage = snapshot.stage;
        tree.regrowAt = snapshot.regrowAt;
        tree.choppingBy = snapshot.choppingBy ?? null;
        tree.chopStartedAt = snapshot.chopStartedAt ?? null;

        await this.persistTree(treeId);
        return this.getTreePublicState(treeId);
    }

    async harvestTree(treeId, { axeItemId = 'basic_axe', chopMode, loot: predeterminedLoot } = {}) {
        const tree = this.getTree(treeId);
        if (!tree) return { error: 'INVALID_TREE', message: 'Unknown tree' };
        if (tree.state !== 'ready') {
            return { error: 'TREE_REGROWING', message: 'This tree is regrowing — come back later' };
        }

        const stageCfg = getStageConfig(tree.stage);
        if (!stageCfg) return { error: 'INVALID_STAGE' };

        const def = getHarvestableTree(treeId);
        const mode = chopMode || def?.chopMode || 'hold';
        const loot = predeterminedLoot || rollWoodChopLoot({
            treeId,
            stage: tree.stage,
            axeItemId,
            chopMode: mode
        });

        const preHarvest = {
            state: tree.state,
            stage: tree.stage,
            regrowAt: tree.regrowAt,
            choppingBy: tree.choppingBy,
            chopStartedAt: tree.chopStartedAt
        };

        tree.state = 'harvested';
        tree.regrowAt = Date.now() + stageCfg.respawnMs;
        tree.stage = 'sapling';
        tree.stageSince = null;
        tree.choppingBy = null;
        tree.chopStartedAt = null;

        await this.persistTree(treeId);

        const woodMult = mode === 'manual' ? MANUAL_WOOD_MULTIPLIER : 1;

        return {
            wood: loot.quantity,
            logItemId: loot.logItemId,
            stage: tree.stage,
            stageHarvested: loot.stageHarvested,
            label: stageCfg.label,
            regrowAt: tree.regrowAt,
            chopDurationMs: stageCfg.chopDurationMs,
            chopMode: mode,
            woodMultiplier: woodMult,
            preHarvest
        };
    }

    getTreePublicState(treeId) {
        const tree = this.getTree(treeId);
        if (!tree) return null;
        return {
            id: tree.id,
            localX: tree.localX,
            localZ: tree.localZ,
            stage: tree.stage,
            state: tree.state,
            regrowAt: tree.regrowAt,
            choppingBy: tree.choppingBy
        };
    }

    shutdown() {
        // no-op (regrowth timer lives in index.js)
    }
}

export default ForestTreeService;
