/**
 * WorldDropManager — rotating voxel meshes for dropped inventory items.
 */

import { VOXEL_SIZE, PALETTE } from '../constants';
import { getHeldItemVoxels } from '../items/HeldGameItemBuilder';
import { getFishingRodWorldVoxels, isFishingRodItemId } from '../props/FishingRodWorldMesh';
import { WORLD_DROP_PICKUP_RADIUS, GOLD_BAG_ITEM_ID } from '../config/worldDrops';
import { disposeThreeObject } from '../utils/disposeThreeObject';

const DROP_MESH_SCALE = VOXEL_SIZE * 0.42;
const BOB_HEIGHT = 0.18;
const ROTATION_SPEED = 1.35;

function centerVoxels(voxels) {
    if (!voxels?.length) return [];
    let minX = Infinity; let maxX = -Infinity;
    let minY = Infinity; let maxY = -Infinity;
    let minZ = Infinity; let maxZ = -Infinity;
    for (const v of voxels) {
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
    }
    const cx = (minX + maxX) / 2;
    const cy = minY;
    const cz = (minZ + maxZ) / 2;
    return voxels.map(v => ({
        ...v,
        x: v.x - cx,
        y: v.y - cy,
        z: v.z - cz
    }));
}

class WorldDropManager {
    constructor() {
        /** @type {Map<string, { group: object, state: object }>} */
        this.drops = new Map();
        this.scene = null;
        this.THREE = null;
        this.buildPartMerged = null;
    }

    init(scene, THREE, buildPartMerged) {
        this.scene = scene;
        this.THREE = THREE;
        this.buildPartMerged = buildPartMerged;
    }

    _buildDropMesh(dropState) {
        if (!this.buildPartMerged || !this.THREE) return null;
        const entry = {
            itemId: dropState.itemId,
            category: dropState.metadata?.category,
            tier: dropState.metadata?.tier,
            quantity: dropState.quantity
        };
        const held = getHeldItemVoxels(entry);
        if (!held?.length) return null;

        const voxels = isFishingRodItemId(entry.itemId)
            ? getFishingRodWorldVoxels(entry.itemId)
            : centerVoxels(held);
        if (!voxels?.length) return null;

        const mesh = this.buildPartMerged(voxels, PALETTE);
        const group = new this.THREE.Group();
        group.add(mesh);
        group.scale.setScalar(DROP_MESH_SCALE);
        group.userData.worldDropId = dropState.id;
        group.userData.baseY = dropState.y ?? 0;
        group.userData.bobPhase = (dropState.id?.length || 0) * 0.37;
        const isGold = dropState.itemId === GOLD_BAG_ITEM_ID || dropState.metadata?.category === 'gold';
        group.userData.bobHeight = isGold ? 0.26 : BOB_HEIGHT;
        group.userData.rotSpeed = isGold ? 2.1 : ROTATION_SPEED;
        return group;
    }

    applySnapshot(dropStates = []) {
        if (!this.scene) return;

        const nextIds = new Set(dropStates.map(d => d.id));
        for (const [id, entry] of this.drops) {
            if (!nextIds.has(id)) {
                this.scene.remove(entry.group);
                disposeThreeObject(entry.group);
                this.drops.delete(id);
            }
        }

        for (const state of dropStates) {
            const existing = this.drops.get(state.id);
            if (existing) {
                existing.state = { ...state };
                existing.group.userData.baseY = state.y ?? 0;
                existing.group.position.set(state.x, state.y ?? 0, state.z);
                continue;
            }
            const group = this._buildDropMesh(state);
            if (!group) continue;
            group.position.set(state.x, state.y ?? 0, state.z);
            this.scene.add(group);
            this.drops.set(state.id, { group, state: { ...state } });
        }
    }

    removeDrops(dropIds = []) {
        if (!this.scene || !dropIds.length) return;
        for (const id of dropIds) {
            const entry = this.drops.get(id);
            if (!entry) continue;
            this.scene.remove(entry.group);
            disposeThreeObject(entry.group);
            this.drops.delete(id);
        }
    }

    mergeUpdates(updates = []) {
        if (!updates.length) return;
        const map = new Map([...this.drops.values()].map(e => [e.state.id, e.state]));
        for (const u of updates) map.set(u.id, { ...map.get(u.id), ...u });
        this.applySnapshot(Array.from(map.values()));
    }

    update(delta, time) {
        for (const { group } of this.drops.values()) {
            const rotSpeed = group.userData.rotSpeed ?? ROTATION_SPEED;
            group.rotation.y += delta * rotSpeed;
            const baseY = group.userData.baseY ?? 0;
            const phase = group.userData.bobPhase ?? 0;
            const bobHeight = group.userData.bobHeight ?? BOB_HEIGHT;
            group.position.y = baseY + Math.sin(time * 2.4 + phase) * bobHeight;
        }
    }

    /**
     * @param {{ x: number, z: number }} playerPos
     * @param {number} [maxDist=WORLD_DROP_PICKUP_RADIUS]
     */
    findNearest(playerPos, maxDist = WORLD_DROP_PICKUP_RADIUS) {
        if (!playerPos) return null;
        let best = null;
        let bestDist = maxDist;
        for (const { state, group } of this.drops.values()) {
            const dx = playerPos.x - group.position.x;
            const dz = playerPos.z - group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist <= bestDist) {
                bestDist = dist;
                best = { ...state, distance: dist };
            }
        }
        return best;
    }

    cleanup() {
        if (this.scene) {
            for (const entry of this.drops.values()) {
                this.scene.remove(entry.group);
                disposeThreeObject(entry.group);
            }
        }
        this.drops.clear();
    }
}

export default WorldDropManager;
