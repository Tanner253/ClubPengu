/**
 * Remote player manual-chop axe — simple swing at the tree on each hit sync.
 * Parented to the tree mesh (local space); no drag replication or spring physics.
 */

import { MANUAL_CHOP } from '../config/manualChop';
import { createManualChopAxeGroup } from '../props/ManualChopAxeMesh';

const { TRUNK_RADIUS, STUMP_H, CUT_H } = MANUAL_CHOP;
const SWING_DURATION = 0.28;

class RemoteManualChopVisuals {
    constructor() {
        /** @type {Map<string, object>} */
        this.sessions = new Map();
        this.scene = null;
        this.THREE = null;
        this.forestTreeManager = null;
    }

    attach(scene, THREE, forestTreeManager) {
        this.scene = scene;
        this.THREE = THREE;
        this.forestTreeManager = forestTreeManager;
    }

    detach() {
        for (const id of [...this.sessions.keys()]) {
            this.endSession(id);
        }
        this.scene = null;
        this.forestTreeManager = null;
    }

    _faceTreeToWorld(treeMesh, worldX, worldZ) {
        if (!treeMesh) return;
        treeMesh.rotation.y = Math.atan2(worldX - treeMesh.position.x, worldZ - treeMesh.position.z);
    }

    startSession(playerId, treeId, chopperWorldPos) {
        if (!this.THREE || !this.forestTreeManager) return;
        this.endSession(playerId);

        const entry = this.forestTreeManager.getTreeEntry(treeId);
        if (!entry?.mesh) return;

        if (chopperWorldPos) {
            this._faceTreeToWorld(entry.mesh, chopperWorldPos.x, chopperWorldPos.z);
        }

        const axeGroup = createManualChopAxeGroup(this.THREE);
        entry.mesh.add(axeGroup);

        const cutY = STUMP_H + CUT_H * 0.45;
        const restPos = new this.THREE.Vector3(0.95, cutY, TRUNK_RADIUS + 0.55);
        const swingPosNeg = new this.THREE.Vector3(-(TRUNK_RADIUS + 0.08), cutY, TRUNK_RADIUS + 0.12);
        const swingPosPos = new this.THREE.Vector3(TRUNK_RADIUS + 0.08, cutY, TRUNK_RADIUS + 0.12);
        const restQuat = new this.THREE.Quaternion().setFromEuler(
            new this.THREE.Euler(Math.PI / 6, Math.PI, Math.PI / 4)
        );
        const swingQuatNeg = new this.THREE.Quaternion().setFromEuler(
            new this.THREE.Euler(0, Math.PI, Math.PI / 6)
        );
        const swingQuatPos = new this.THREE.Quaternion().setFromEuler(
            new this.THREE.Euler(0, 0, -Math.PI / 6)
        );

        axeGroup.position.copy(restPos);
        axeGroup.quaternion.copy(restQuat);

        this.sessions.set(playerId, {
            treeId,
            treeMesh: entry.mesh,
            axeGroup,
            swingTimer: 0,
            swingSide: 1,
            restPos,
            swingPosNeg,
            swingPosPos,
            restQuat,
            swingQuatNeg,
            swingQuatPos,
            blendQuat: new this.THREE.Quaternion(),
            scratchPos: new this.THREE.Vector3()
        });
    }

    endSession(playerId) {
        const session = this.sessions.get(playerId);
        if (!session) return;
        session.treeMesh?.remove(session.axeGroup);
        this.sessions.delete(playerId);
    }

    onSync(playerId, { treeId, side, speed, leftCut, rightCut, falling }, chopperWorldPos = null) {
        let session = this.sessions.get(playerId);
        if (!session || session.treeId !== treeId) {
            this.startSession(playerId, treeId, chopperWorldPos);
            session = this.sessions.get(playerId);
        }
        if (!session) return;

        session.swingTimer = SWING_DURATION;
        session.swingSide = side === -1 ? -1 : 1;

        this.forestTreeManager?.applyRemoteChopHit(treeId, side, speed, leftCut, rightCut, falling);
    }

    update(delta) {
        for (const session of this.sessions.values()) {
            const { axeGroup, restPos, restQuat, blendQuat, scratchPos } = session;

            if (session.swingTimer > 0) {
                session.swingTimer = Math.max(0, session.swingTimer - delta);
                const elapsed = SWING_DURATION - session.swingTimer;
                const k = Math.sin(Math.min(1, elapsed / SWING_DURATION) * Math.PI);

                const swingPos = session.swingSide === -1 ? session.swingPosNeg : session.swingPosPos;
                const swingQuat = session.swingSide === -1 ? session.swingQuatNeg : session.swingQuatPos;

                scratchPos.lerpVectors(restPos, swingPos, k);
                axeGroup.position.copy(scratchPos);
                blendQuat.copy(restQuat).slerp(swingQuat, k);
                axeGroup.quaternion.copy(blendQuat);
            } else {
                axeGroup.position.copy(restPos);
                axeGroup.quaternion.copy(restQuat);
            }
        }
    }
}

export default RemoteManualChopVisuals;
