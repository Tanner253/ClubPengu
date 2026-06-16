/**
 * HarvestableTree — distinct world prop for chop-able trees (not decorative forest pines).
 * Uses standard pine props + interaction ring; custom tree art reserved for future wood types.
 */

import { createProp, PROP_TYPES } from './index';

const STAGE_PINES = {
    sapling: 'small',
    baby: 'small',
    mature: 'medium',
    elder: 'large'
};

class HarvestableTree {
    /**
     * @param {typeof import('three')} THREE
     * @param {{ id: string, stage: string, state?: string, choppingBy?: string|null }} config
     */
    constructor(THREE, config) {
        this.THREE = THREE;
        this.config = { ...config };
        this.group = new THREE.Group();
        this.group.name = `harvestable_tree_${config.id}`;
        this.group.userData.harvestableTreeId = config.id;
        this.group.userData.isHarvestableTree = true;
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
        const pineProp = createProp(THREE, null, PROP_TYPES.PINE_TREE, 0, 0, 0, {
            size: pineSize,
            snowCovered: true
        });
        if (pineProp?.group) {
            pineProp.group.name = 'harvest_tree_mesh';
            this.group.add(pineProp.group);
        }

        this._addInteractionRing(stage);
        if (this.config.choppingBy) this._addChoppingIndicator();
        if (stage === 'elder') this._addElderMarker();
    }

    _addStump() {
        const THREE = this.THREE;
        const stump = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.45, 0.35, 8),
            new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.95 })
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
        const colors = {
            sapling: 0x86efac,
            baby: 0x4ade80,
            mature: 0x22c55e,
            elder: 0xfbbf24
        };
        const radii = { sapling: 0.55, baby: 0.75, mature: 0.95, elder: 1.15 };
        const r = radii[stage] || 0.85;
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(r * 0.85, r, 32),
            new THREE.MeshBasicMaterial({
                color: colors[stage] || 0x22c55e,
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
        const crown = new THREE.Mesh(
            new THREE.SphereGeometry(0.14, 8, 8),
            new THREE.MeshStandardMaterial({
                color: 0xffd700,
                emissive: 0xffa500,
                emissiveIntensity: 0.6,
                metalness: 0.4
            })
        );
        crown.position.y = 5.8;
        crown.name = 'elder_marker';
        this.group.add(crown);
    }

    updateState(state, regrowAt = null, choppingBy = null) {
        this.config.state = state;
        this.config.regrowAt = regrowAt;
        this.config.choppingBy = choppingBy ?? null;
        this._build();
    }

    getCollisionRadius() {
        const { stage } = this.config;
        if (this.config.state === 'harvested') return 0.6;
        if (stage === 'sapling') return 0.5;
        if (stage === 'baby') return 0.9;
        if (stage === 'elder') return 1.3;
        return 1.1;
    }

    getMesh() {
        return this.group;
    }
}

export default HarvestableTree;
