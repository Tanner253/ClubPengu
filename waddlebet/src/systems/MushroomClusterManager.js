/**
 * MushroomClusterManager — server-synced harvestable mushroom props in Forest Trails.
 */

import { spawnMushroomCluster } from '../rooms/forest/ForestAmbience';
import { HARVESTABLE_MUSHROOMS } from '../config/harvestableMushrooms';

class MushroomClusterManager {
    constructor() {
        /** @type {Map<string, { group: object, def: object, state: object }>} */
        this.clusters = new Map();
        this.scene = null;
        this._renderVisible = true;
    }

    spawnClusters(scene, THREE, offsetX, offsetZ, mushroomStates = []) {
        this.cleanup();
        this.scene = scene;

        const stateMap = new Map(mushroomStates.map(m => [m.id, m]));

        for (const def of HARVESTABLE_MUSHROOMS) {
            const state = stateMap.get(def.id) || { id: def.id, state: 'ready', regrowAt: null };
            const group = spawnMushroomCluster(THREE, scene, offsetX, offsetZ, def.localX, def.localZ);
            group.userData.harvestableMushroomId = def.id;
            group.visible = this._isClusterVisible(state);
            this.clusters.set(def.id, { group, def, state: { ...state } });
        }
    }

    _isClusterVisible(state) {
        if (this._renderVisible === false) return false;
        return state?.state !== 'harvested';
    }

    applySnapshot(mushroomStates) {
        if (!this.scene) return;
        const stateMap = new Map(mushroomStates.map(m => [m.id, m]));
        for (const [id, entry] of this.clusters) {
            const next = stateMap.get(id);
            if (!next) continue;
            entry.state = next;
            entry.group.visible = this._isClusterVisible(next);
        }
    }

    updateCluster(mushroomId, state, regrowAt = null) {
        const entry = this.clusters.get(mushroomId);
        if (!entry) return;
        entry.state = { ...entry.state, state, regrowAt };
        entry.group.visible = this._isClusterVisible(entry.state);
    }

    setVisible(visible) {
        if (this._renderVisible === visible) return;
        this._renderVisible = visible;
        for (const entry of this.clusters.values()) {
            entry.group.visible = this._isClusterVisible(entry.state);
        }
    }

    cleanup() {
        if (this.scene) {
            for (const entry of this.clusters.values()) {
                this.scene.remove(entry.group);
            }
        }
        this.clusters.clear();
    }
}

export default MushroomClusterManager;
