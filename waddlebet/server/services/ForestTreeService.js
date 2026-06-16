/**
 * ForestTreeService — server-authoritative harvestable tree state, regrowth & persistence.
 */

import { isDBConnected } from '../db/connection.js';
import ForestTreeWorldState from '../db/models/ForestTreeWorldState.js';
import {
    HARVESTABLE_TREES,
    getHarvestableTree,
    getStageConfig
} from '../config/harvestableTrees.js';

const WORLD_STATE_ID = 'forest_trees';

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
                tree.choppingBy = null;
                tree.chopStartedAt = null;

                if (tree.state === 'harvested' && tree.regrowAt && Date.now() >= tree.regrowAt) {
                    tree.state = 'ready';
                    tree.regrowAt = null;
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

    async tickRegrowth() {
        const now = Date.now();
        const regrown = [];

        for (const tree of this.trees.values()) {
            if (tree.state === 'harvested' && tree.regrowAt && now >= tree.regrowAt) {
                tree.state = 'ready';
                tree.regrowAt = null;
                tree.choppingBy = null;
                tree.chopStartedAt = null;
                regrown.push(tree.id);
                await this.persistTree(tree.id);
            }
        }

        return regrown;
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

    async harvestTree(treeId) {
        const tree = this.getTree(treeId);
        if (!tree) return { error: 'INVALID_TREE', message: 'Unknown tree' };
        if (tree.state !== 'ready') {
            return { error: 'TREE_REGROWING', message: 'This tree is regrowing — come back later' };
        }

        const stageCfg = getStageConfig(tree.stage);
        if (!stageCfg) return { error: 'INVALID_STAGE' };

        tree.state = 'harvested';
        tree.regrowAt = Date.now() + stageCfg.respawnMs;
        tree.choppingBy = null;
        tree.chopStartedAt = null;

        await this.persistTree(treeId);

        return {
            wood: stageCfg.wood,
            logItemId: stageCfg.logItemId,
            stage: tree.stage,
            label: stageCfg.label,
            regrowAt: tree.regrowAt,
            chopDurationMs: stageCfg.chopDurationMs
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
