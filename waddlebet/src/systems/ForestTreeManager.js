/**
 * ForestTreeManager — client-side harvestable tree props & proximity queries.
 */

import HarvestableTree from '../props/HarvestableTree';
import VoxelChopTree from '../props/VoxelChopTree';
import {
    FOREST_ZONE_OFFSET,
    HARVESTABLE_TREES,
    HARVEST_INTERACTION_RADIUS,
    STUMP_PROXIMITY_RADIUS,
    getHarvestableTreeWorldPosition,
    getStageConfig,
    getWoodYield,
    formatForestRegrowCountdown
} from '../config/harvestableTrees';

import RemoteManualChopVisuals from './RemoteManualChopVisuals';

const REGROW_ANIM_DURATION = 3.2;
const MATURE_ANIM_DURATION = 1.8;

class ForestTreeManager {
    constructor() {
        /** @type {Map<string, object>} */
        this.trees = new Map();
        this.scene = null;
        this.collisionSystem = null;
        this.THREE = null;
        this.localOffsetX = 0;
        this.localOffsetZ = 0;
        this.remoteChopVisuals = new RemoteManualChopVisuals();
        this._stumpHoverMeshes = [];
        this._stumpHoverDirty = true;
    }

    _resolveStage(def, state) {
        return state?.stage || def.stage;
    }

    spawnTrees(scene, THREE, collisionSystem, offsetX, offsetZ, treeStates = []) {
        this.cleanup();
        this.scene = scene;
        this.THREE = THREE;
        this.collisionSystem = collisionSystem;
        this.localOffsetX = offsetX;
        this.localOffsetZ = offsetZ;
        this.remoteChopVisuals.attach(scene, THREE, this);

        const stateMap = new Map(treeStates.map(t => [t.id, t]));

        for (const def of HARVESTABLE_TREES) {
            const state = stateMap.get(def.id) || { state: 'ready', regrowAt: null };
            this._spawnOne(def, state);
        }
    }

    _spawnOne(def, state, { animate = false } = {}) {
        const isManual = def.chopMode === 'manual';
        const TreeClass = isManual ? VoxelChopTree : HarvestableTree;
        const stage = this._resolveStage(def, state);
        const instance = new TreeClass(this.THREE, {
            id: def.id,
            stage,
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
        mesh.userData.harvestableTreeId = def.id;
        mesh.userData.isHarvestableTree = true;
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

        const entry = {
            mesh,
            instance,
            def,
            runtimeStage: stage,
            state: { ...state, stage },
            growAnim: null
        };
        this.trees.set(def.id, entry);
        this._stumpHoverDirty = true;

        if (animate) {
            this._startGrowAnimation(entry, REGROW_ANIM_DURATION, 0.04);
        }
    }

    _getTreeTargetScale(entry) {
        if (typeof entry.instance?.getDisplayScale === 'function') {
            return entry.instance.getDisplayScale();
        }
        return 1;
    }

    _startGrowAnimation(entry, duration = REGROW_ANIM_DURATION, fromScale = 0.04) {
        const targetScale = this._getTreeTargetScale(entry);
        entry.growAnim = { elapsed: 0, duration, fromScale, targetScale };
        entry.mesh.scale.setScalar(fromScale * targetScale);
    }

    updateGrowthAnimations(delta) {
        for (const entry of this.trees.values()) {
            if (!entry.growAnim) continue;
            entry.growAnim.elapsed += delta;
            const t = Math.min(1, entry.growAnim.elapsed / entry.growAnim.duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const { fromScale, targetScale } = entry.growAnim;
            const s = fromScale + (1 - fromScale) * eased;
            entry.mesh.scale.setScalar(s * targetScale);
            if (t >= 1) {
                entry.mesh.scale.setScalar(targetScale);
                entry.growAnim = null;
            }
        }
    }

    applySnapshot(treeStates) {
        if (!this.scene || !this.THREE) return;
        const stateMap = new Map(treeStates.map(t => [t.id, t]));
        for (const [id, entry] of this.trees) {
            const next = stateMap.get(id);
            if (!next) continue;
            this._syncFromServer(entry, next);
        }
    }

    _syncFromServer(entry, next) {
        const prevState = entry.state?.state;
        const prevStage = entry.runtimeStage || entry.def.stage;
        const nextStage = next.stage || prevStage;
        const regrew = prevState === 'harvested' && next.state === 'ready';
        const stageAdvanced = next.state === 'ready' && nextStage !== prevStage && prevState === 'ready';

        entry.state = { ...next, stage: nextStage };
        entry.runtimeStage = nextStage;

        if (regrew) {
            this._respawnTree(entry, entry.state, { animate: true });
            this._refreshColliders(entry);
            return;
        }

        if (stageAdvanced) {
            this._respawnTree(entry, entry.state, { animate: true, maturation: true });
            this._refreshColliders(entry);
            return;
        }

        const localChopState = entry.instance?.treeState;
        const manualFallVisual =
            entry.def.chopMode === 'manual'
            && next.state === 'ready'
            && (localChopState === 'FALLING' || localChopState === 'FALL_COMPLETE' || localChopState === 'HARVESTED');

        if (manualFallVisual) {
            this._respawnTree(entry, { ...entry.state, ...next }, { animate: false });
            this._refreshColliders(entry);
            this._stumpHoverDirty = true;
            return;
        }

        if (entry.def.chopMode === 'manual' && next.state === 'harvested' && entry.instance?.treeState === 'FALLING') {
            entry.instance.pendingHarvested = true;
        } else {
            entry.instance.updateState(next.state, next.regrowAt, next.choppingBy || null);
        }

        entry.mesh.visible = this._renderVisible !== false;
        this._refreshColliders(entry);
        this._stumpHoverDirty = true;
    }

    _refreshColliders(entry) {
        if (!this.collisionSystem) return;
        const id = entry.def.id;
        this.collisionSystem.removeCollider(`harvest_tree_${id}`);
        if (entry.state?.state !== 'harvested') {
            this.collisionSystem.addCollider(
                entry.def.localX,
                entry.def.localZ,
                { type: 'circle', radius: entry.instance.getCollisionRadius(), height: 8 },
                1,
                `harvest_tree_${id}`
            );
        }
    }

    getTreeEntry(treeId) {
        return this.trees.get(treeId) || null;
    }

    applyManualCutSync(treeId, leftCut, rightCut, falling = false) {
        const entry = this.trees.get(treeId);
        if (!entry || entry.def.chopMode !== 'manual') return;
        const tree = entry.instance;
        if (tree?.setCutState) {
            tree.setCutState(leftCut, rightCut);
            if (falling && tree.treeState === 'IDLE') tree.startFall();
        }
    }

    applyRemoteChopHit(treeId, side, speed, leftCut, rightCut, falling) {
        const entry = this.trees.get(treeId);
        if (!entry || entry.def.chopMode !== 'manual') return;
        const tree = entry.instance;
        if (!tree?.setCutState) return;
        tree.setCutState(leftCut, rightCut);
        if (falling && tree.treeState === 'IDLE') tree.startFall();
    }

    updateTree(treeId, state, regrowAt, choppingBy = null, stage = null) {
        const entry = this.trees.get(treeId);
        if (!entry) return;
        this._syncFromServer(entry, {
            state,
            regrowAt,
            choppingBy,
            stage: stage || entry.runtimeStage,
            id: treeId,
            localX: entry.def.localX,
            localZ: entry.def.localZ
        });
    }

    _respawnTree(entry, state, { animate = false, maturation = false } = {}) {
        if (this.scene) this.scene.remove(entry.mesh);
        const stage = this._resolveStage(entry.def, state);
        const isManual = entry.def.chopMode === 'manual';
        const TreeClass = isManual ? VoxelChopTree : HarvestableTree;
        const instance = new TreeClass(this.THREE, {
            id: entry.def.id,
            stage,
            state: state.state || 'ready',
            regrowAt: state.regrowAt,
            choppingBy: state.choppingBy || null
        });
        const mesh = instance.getMesh();
        mesh.position.set(
            this.localOffsetX + entry.def.localX,
            0,
            this.localOffsetZ + entry.def.localZ
        );
        mesh.rotation.y = (entry.def.localX * 0.17 + entry.def.localZ * 0.11) % (Math.PI * 2);
        mesh.userData.harvestableTreeId = entry.def.id;
        mesh.userData.isHarvestableTree = true;
        if (this.scene) this.scene.add(mesh);
        mesh.visible = this._renderVisible !== false;
        entry.mesh = mesh;
        entry.instance = instance;
        entry.runtimeStage = stage;
        entry.growAnim = null;
        this._stumpHoverDirty = true;

        if (animate) {
            this._startGrowAnimation(
                entry,
                maturation ? MATURE_ANIM_DURATION : REGROW_ANIM_DURATION,
                maturation ? 0.55 : 0.04
            );
        }
    }

    optimisticHarvest(treeId) {
        const entry = this.trees.get(treeId);
        if (!entry || entry.state?.state === 'harvested') return;
        const stageCfg = getStageConfig(entry.runtimeStage || entry.def.stage);
        const regrowAt = Date.now() + (stageCfg?.respawnMs || 30 * 60 * 1000);
        this.updateTree(treeId, 'harvested', regrowAt, null, 'sapling');
    }

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
                const stage = entry.runtimeStage || entry.def.stage;
                const stageCfg = getStageConfig(stage);
                nearest = {
                    treeId: id,
                    stage,
                    chopMode: entry.def.chopMode || 'hold',
                    woodYield: getWoodYield(stage, entry.def),
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

    _rebuildStumpHoverList() {
        this._stumpHoverMeshes.length = 0;
        for (const entry of this.trees.values()) {
            if (entry.state?.state === 'harvested' && entry.mesh?.visible) {
                this._stumpHoverMeshes.push(entry.mesh);
            }
        }
        this._stumpHoverDirty = false;
    }

    _stumpHoverPayload(treeId) {
        const entry = this.trees.get(treeId);
        if (!entry || entry.state?.state !== 'harvested') return null;
        const world = getHarvestableTreeWorldPosition(entry.def);
        return {
            treeId,
            regrowAt: entry.state.regrowAt,
            countdown: formatForestRegrowCountdown(entry.state.regrowAt),
            worldX: world.x,
            worldZ: world.z
        };
    }

    /** Nearest harvested stump within walk range (mobile + proximity tooltip). */
    findNearestHarvestedStump(playerX, playerZ, maxRadius = STUMP_PROXIMITY_RADIUS) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const [id, entry] of this.trees) {
            if (entry.state?.state !== 'harvested') continue;
            const world = getHarvestableTreeWorldPosition(entry.def);
            const dx = playerX - world.x;
            const dz = playerZ - world.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist <= maxRadius && dist < nearestDist) {
                nearestDist = dist;
                nearest = this._stumpHoverPayload(id);
            }
        }

        return nearest;
    }

    /** Raycast harvested stumps for hover tooltip. */
    raycastStumpHover(raycaster) {
        if (!raycaster) return null;
        if (this._stumpHoverDirty) this._rebuildStumpHoverList();
        if (!this._stumpHoverMeshes.length) return null;

        const hits = raycaster.intersectObjects(this._stumpHoverMeshes, true);
        if (!hits.length) return null;

        let node = hits[0].object;
        while (node && !node.userData?.harvestableTreeId) {
            node = node.parent;
        }
        const treeId = node?.userData?.harvestableTreeId;
        if (!treeId) return null;

        return this._stumpHoverPayload(treeId);
    }

    /** Hover raycast first, then walk-up proximity for regrow countdown. */
    resolveStumpHover(playerX, playerZ, raycaster = null) {
        const rayHit = raycaster ? this.raycastStumpHover(raycaster) : null;
        if (rayHit) return rayHit;
        return this.findNearestHarvestedStump(playerX, playerZ);
    }

    setVisible(visible) {
        if (this._renderVisible === visible) return;
        this._renderVisible = visible;
        for (const { mesh } of this.trees.values()) {
            if (mesh) mesh.visible = visible;
        }
    }

    updateManualTrees(delta, excludeTreeId = null) {
        for (const [id, entry] of this.trees) {
            if (id === excludeTreeId) continue;
            if (entry.def.chopMode !== 'manual' || !entry.instance?.update) continue;
            if (entry.instance.treeState === 'FALLING') {
                entry.instance.update(delta);
            }
        }
        this.remoteChopVisuals.update(delta);
        this.updateGrowthAnimations(delta);
    }

    /** @returns {Map<string, string>} playerId → treeId for hold-chop (non-manual) sessions */
    getActiveHoldChoppers() {
        const choppers = new Map();
        for (const [treeId, entry] of this.trees) {
            if (entry.def.chopMode === 'manual') continue;
            const playerId = entry.state?.choppingBy;
            if (playerId) choppers.set(playerId, treeId);
        }
        return choppers;
    }

    isRemoteManualChopping(playerId) {
        return this.remoteChopVisuals.sessions.has(playerId);
    }

    onRemoteManualChopStart(playerId, treeId, chopperPos) {
        this.remoteChopVisuals.startSession(playerId, treeId, chopperPos);
    }

    onRemoteManualChopSync(playerId, data, chopperPos = null) {
        this.remoteChopVisuals.onSync(playerId, data, chopperPos);
    }

    onRemoteManualChopEnd(playerId) {
        this.remoteChopVisuals.endSession(playerId);
    }

    cleanup() {
        this.remoteChopVisuals.detach();
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
        this._stumpHoverMeshes.length = 0;
        this._stumpHoverDirty = true;
    }
}

export default ForestTreeManager;
