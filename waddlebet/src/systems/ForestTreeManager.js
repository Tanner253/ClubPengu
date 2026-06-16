/**
 * ForestTreeManager — client-side harvestable tree props & proximity queries.
 */

import HarvestableTree from '../props/HarvestableTree';
import {
    FOREST_ZONE_OFFSET,
    HARVESTABLE_TREES,
    HARVEST_INTERACTION_RADIUS,
    getHarvestableTreeWorldPosition,
    getStageConfig
} from '../config/harvestableTrees';

class ForestTreeManager {
    constructor() {
        /** @type {Map<string, { mesh: object, instance: HarvestableTree, def: object, state: object }>} */
        this.trees = new Map();
        this.scene = null;
        this.collisionSystem = null;
        this.THREE = null;
        this.localOffsetX = 0;
        this.localOffsetZ = 0;
    }

    /**
     * @param {object} scene
     * @param {object} THREE
     * @param {object} collisionSystem
     * @param {number} offsetX — forest zone world offset X
     * @param {number} offsetZ — forest zone world offset Z
     * @param {Array<object>} treeStates — from server snapshot
     */
    spawnTrees(scene, THREE, collisionSystem, offsetX, offsetZ, treeStates = []) {
        this.cleanup();
        this.scene = scene;
        this.THREE = THREE;
        this.collisionSystem = collisionSystem;
        this.localOffsetX = offsetX;
        this.localOffsetZ = offsetZ;

        const stateMap = new Map(treeStates.map(t => [t.id, t]));

        for (const def of HARVESTABLE_TREES) {
            const state = stateMap.get(def.id) || { state: 'ready', regrowAt: null };
            this._spawnOne(def, state);
        }
    }

    _spawnOne(def, state) {
        const instance = new HarvestableTree(this.THREE, {
            id: def.id,
            stage: def.stage,
            state: state.state || 'ready',
            regrowAt: state.regrowAt,
            choppingBy: state.choppingBy || null
        });
        const mesh = instance.getMesh();
        mesh.position.set(
            this.localOffsetX + def.localX,
            0,
            this.localOffsetZ + def.localZ
        );
        mesh.rotation.y = (def.localX * 0.17 + def.localZ * 0.11) % (Math.PI * 2);
        this.scene.add(mesh);
        mesh.visible = this._renderVisible !== false;

        if (this.collisionSystem && state.state !== 'harvested') {
            this.collisionSystem.addCollider(
                def.localX,
                def.localZ,
                { type: 'circle', radius: instance.getCollisionRadius(), height: 8 },
                1,
                `harvest_tree_${def.id}`
            );
        }

        this.trees.set(def.id, {
            mesh,
            instance,
            def,
            state: { ...state }
        });
    }

    applySnapshot(treeStates) {
        if (!this.scene || !this.THREE) return;
        const stateMap = new Map(treeStates.map(t => [t.id, t]));
        for (const [id, entry] of this.trees) {
            const next = stateMap.get(id);
            if (!next) continue;
            entry.state = next;
            entry.instance.updateState(next.state, next.regrowAt, next.choppingBy || null);
            entry.mesh.visible = this._renderVisible !== false;

            if (this.collisionSystem) {
                this.collisionSystem.removeCollider(`harvest_tree_${id}`);
                if (next.state !== 'harvested') {
                    this.collisionSystem.addCollider(
                        entry.def.localX,
                        entry.def.localZ,
                        { type: 'circle', radius: entry.instance.getCollisionRadius(), height: 8 },
                        1,
                        `harvest_tree_${id}`
                    );
                }
            }
        }
    }

    updateTree(treeId, state, regrowAt, choppingBy = null) {
        const entry = this.trees.get(treeId);
        if (!entry) return;
        entry.state = { state, regrowAt, choppingBy };
        entry.instance.updateState(state, regrowAt, choppingBy);
        if (this.collisionSystem) {
            this.collisionSystem.removeCollider(`harvest_tree_${treeId}`);
            if (state !== 'harvested') {
                this.collisionSystem.addCollider(
                    entry.def.localX,
                    entry.def.localZ,
                    { type: 'circle', radius: entry.instance.getCollisionRadius(), height: 8 },
                    1,
                    `harvest_tree_${treeId}`
                );
            }
        }
    }

    /** Immediate client update when chop bar completes (before server round-trip). */
    optimisticHarvest(treeId) {
        const entry = this.trees.get(treeId);
        if (!entry || entry.state?.state === 'harvested') return;
        const stageCfg = getStageConfig(entry.def.stage);
        const regrowAt = Date.now() + (stageCfg?.respawnMs || 30 * 60 * 1000);
        this.updateTree(treeId, 'harvested', regrowAt, null);
    }

    /**
     * Find nearest ready harvestable tree within interaction radius.
     */
    findNearestInteraction(playerX, playerZ) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const [id, entry] of this.trees) {
            if (entry.state?.state === 'harvested') continue;
            const world = getHarvestableTreeWorldPosition(entry.def);
            const dx = playerX - world.x;
            const dz = playerZ - world.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < HARVEST_INTERACTION_RADIUS && dist < nearestDist) {
                nearestDist = dist;
                const stageCfg = getStageConfig(entry.def.stage);
                nearest = {
                    treeId: id,
                    stage: entry.def.stage,
                    woodYield: stageCfg?.wood || 1,
                    label: stageCfg?.label || 'Tree',
                    worldX: world.x,
                    worldZ: world.z,
                    dist: nearestDist,
                    choppingBy: entry.state?.choppingBy || null
                };
            }
        }

        return nearest;
    }

    /** Hide/show all harvestable tree meshes (paired with forest zone visibility). */
    setVisible(visible) {
        if (this._renderVisible === visible) return;
        this._renderVisible = visible;
        for (const { mesh } of this.trees.values()) {
            if (mesh) mesh.visible = visible;
        }
    }

    cleanup() {
        if (this.collisionSystem) {
            for (const id of this.trees.keys()) {
                this.collisionSystem.removeCollider(`harvest_tree_${id}`);
            }
        }
        if (this.scene) {
            for (const entry of this.trees.values()) {
                this.scene.remove(entry.mesh);
            }
        }
        this.trees.clear();
    }
}

export default ForestTreeManager;
