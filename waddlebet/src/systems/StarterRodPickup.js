/**
 * Starter rod prop near Old Salty — logged-in players only, hidden after one-time claim.
 */

import { disposeThreeObject } from '../utils/disposeThreeObject';
import { buildFishingRodWorldGroup } from '../props/FishingRodWorldMesh';
import { STARTER_ROD_WORLD, STARTER_ROD_PICKUP_RADIUS } from '../utils/starterRod';

class StarterRodPickup {
    constructor() {
        this.mesh = null;
        this.scene = null;
        this.THREE = null;
        this.buildPartMerged = null;
        this.visible = false;
    }

    init(scene, THREE, buildPartMerged) {
        this.scene = scene;
        this.THREE = THREE;
        this.buildPartMerged = buildPartMerged;
    }

    setVisible(show) {
        this.visible = !!show;
        if (!show && this.mesh) {
            this.scene?.remove(this.mesh);
            disposeThreeObject(this.mesh);
            this.mesh = null;
        } else if (show && !this.mesh) {
            this._buildMesh();
        }
        if (this.mesh) this.mesh.visible = this.visible;
    }

    _buildMesh() {
        if (!this.scene || !this.buildPartMerged || !this.THREE) return;

        const group = buildFishingRodWorldGroup(this.THREE, this.buildPartMerged, 'basic_rod');
        if (!group) return;

        group.name = 'starter_rod_pickup';
        group.position.set(STARTER_ROD_WORLD.x, 0.08, STARTER_ROD_WORLD.z);
        group.rotation.y = Math.PI * 0.15;

        const ring = new this.THREE.Mesh(
            new this.THREE.RingGeometry(0.55, 0.75, 24),
            new this.THREE.MeshBasicMaterial({
                color: 0x66ccff,
                transparent: true,
                opacity: 0.35,
                side: this.THREE.DoubleSide,
                depthWrite: false
            })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;
        group.add(ring);

        this.scene.add(group);
        this.mesh = group;
        this.mesh.visible = this.visible;
    }

    checkProximity(playerX, playerZ) {
        if (!this.visible) return null;
        const dx = playerX - STARTER_ROD_WORLD.x;
        const dz = playerZ - STARTER_ROD_WORLD.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > STARTER_ROD_PICKUP_RADIUS) return null;

        return {
            prompt: 'Press E to pick up Basic Rod',
            canPickup: true,
            dist
        };
    }

    update(time) {
        if (!this.mesh?.visible) return;
        this.mesh.position.y = 0.08 + Math.sin(time * 2) * 0.035;
        this.mesh.rotation.y += 0.003;
    }

    dispose() {
        if (this.mesh) {
            this.scene?.remove(this.mesh);
            disposeThreeObject(this.mesh);
            this.mesh = null;
        }
    }
}

export { STARTER_ROD_PICKUP_RADIUS };
export default StarterRodPickup;
