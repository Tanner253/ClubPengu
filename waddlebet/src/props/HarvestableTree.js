/**
 * HarvestableTree — hold-to-chop trees with species-specific bark and foliage.
 */

import PineTree from './PineTree';
import { getTreeWoodSpecies } from '../config/treeWoodSpecies';

const STAGE_PINES = {
    sapling: 'small',
    baby: 'small',
    mature: 'medium',
    elder: 'large'
};

class HarvestableTree {
    /**
     * @param {typeof import('three')} THREE
     * @param {{ id: string, stage: string, woodType?: string, state?: string, choppingBy?: string|null }} config
     */
    constructor(THREE, config) {
        this.THREE = THREE;
        this.config = { ...config };
        this.species = getTreeWoodSpecies(config.woodType || 'pine_log');
        this.group = new THREE.Group();
        this.group.name = `harvestable_tree_${config.id}`;
        this.group.userData.harvestableTreeId = config.id;
        this.group.userData.isHarvestableTree = true;
        this.group.userData.woodType = this.species.id;
        this._build();
    }

    _clearGroup() {
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }
    }

    _build() {
        const THREE = this.THREE;
        const { stage, state = 'ready' } = this.config;
        this._clearGroup();

        if (state === 'harvested') {
            this._addStump();
            return;
        }

        const pineSize = STAGE_PINES[stage] || 'medium';
        const pineTree = new PineTree(THREE, pineSize, {
            barkColor: this.species.barkColor,
            foliageColor: this.species.foliageColor,
            snowCovered: this.species.snowCovered,
        });
        const built = pineTree.spawn(null, 0, 0, 0);
        if (built?.group) {
            built.group.name = 'harvest_tree_mesh';
            this.group.add(built.group);
        }

        this._addInteractionRing(stage);
        if (this.config.choppingBy) this._addChoppingIndicator();
        if (stage === 'elder') this._addElderMarker();
    }

    _addStump() {
        const THREE = this.THREE;
        const stumpColor = parseInt(this.species.barkColor.replace('#', ''), 16) || 0x4a3520;
        const stump = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.45, 0.35, 8),
            new THREE.MeshStandardMaterial({ color: stumpColor, roughness: 0.95 })
        );
        stump.position.y = 0.18;
        stump.name = 'tree_stump';
        this.group.add(stump);

        const regrowRing = new THREE.Mesh(
            new THREE.RingGeometry(0.55, 0.7, 24),
            new THREE.MeshBasicMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide
            })
        );
        regrowRing.rotation.x = -Math.PI / 2;
        regrowRing.position.y = 0.05;
        this.group.add(regrowRing);
    }

    _addInteractionRing(stage) {
        const THREE = this.THREE;
        const radii = { sapling: 0.55, baby: 0.75, mature: 0.95, elder: 1.15 };
        const r = radii[stage] || 0.85;
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(r * 0.85, r, 32),
            new THREE.MeshBasicMaterial({
                color: this.species.ringColor || 0x22c55e,
                transparent: true,
                opacity: 0.55,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;
        ring.name = 'harvest_ring';
        this.group.add(ring);
    }

    _addChoppingIndicator() {
        const THREE = this.THREE;
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.95, 1.1, 32),
            new THREE.MeshBasicMaterial({
                color: 0xf97316,
                transparent: true,
                opacity: 0.75,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.06;
        ring.name = 'chopping_ring';
        this.group.add(ring);
    }

    _addElderMarker() {
        const THREE = this.THREE;
        const marker = new THREE.Mesh(
            new THREE.RingGeometry(1.05, 1.2, 32),
            new THREE.MeshBasicMaterial({
                color: 0xfbbf24,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        marker.rotation.x = -Math.PI / 2;
        marker.position.y = 0.05;
        this.group.add(marker);
    }

    updateState(state, regrowAt, choppingBy = null) {
        this.config.state = state;
        this.config.regrowAt = regrowAt;
        this.config.choppingBy = choppingBy;
        this._build();
    }

    getMesh() {
        return this.group;
    }

    getCollisionRadius() {
        const radii = { sapling: 0.55, baby: 0.75, mature: 0.95, elder: 1.15 };
        return radii[this.config.stage] || 0.85;
    }

    getDisplayScale() {
        return 1;
    }
}

export default HarvestableTree;
