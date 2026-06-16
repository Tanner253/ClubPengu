/**
 * Remote player manual-chop axe visuals — world-space axe at tree, synced on each hit.
 */

import { MANUAL_CHOP } from '../config/manualChop';
import { createManualChopAxeGroup } from '../props/ManualChopAxeMesh';
import { playManualChopSound } from '../utils/manualChopSounds';

const { TRUNK_RADIUS, STUMP_H, CUT_H } = MANUAL_CHOP;

class RemoteManualChopVisuals {
    constructor() {
        /** @type {Map<string, object>} */
        this.sessions = new Map();
        this.scene = null;
        this.THREE = null;
        this.forestTreeManager = null;
        this._tempVec = null;
    }

    attach(scene, THREE, forestTreeManager) {
        this.scene = scene;
        this.THREE = THREE;
        this.forestTreeManager = forestTreeManager;
        this._tempVec = new THREE.Vector3();
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
        if (!this.scene || !this.THREE || !this.forestTreeManager) return;
        this.endSession(playerId);

        const entry = this.forestTreeManager.getTreeEntry(treeId);
        if (!entry?.mesh) return;

        if (chopperWorldPos) {
            this._faceTreeToWorld(entry.mesh, chopperWorldPos.x, chopperWorldPos.z);
        }

        const axeGroup = createManualChopAxeGroup(this.THREE);
        axeGroup.visible = true;
        this.scene.add(axeGroup);

        this.sessions.set(playerId, {
            treeId,
            treeMesh: entry.mesh,
            axeGroup,
            swingPhase: 0,
            swingSide: 1,
            restPos: new this.THREE.Vector3(),
            targetPos: new this.THREE.Vector3(),
            axeVel: new this.THREE.Vector3(),
            forceVec: new this.THREE.Vector3()
        });
        this._layoutAxeRest(this.sessions.get(playerId));
    }

    endSession(playerId) {
        const session = this.sessions.get(playerId);
        if (!session) return;
        if (session.axeGroup && this.scene) this.scene.remove(session.axeGroup);
        this.sessions.delete(playerId);
    }

    onSync(playerId, { treeId, side, speed, leftCut, rightCut, falling }) {
        let session = this.sessions.get(playerId);
        if (!session || session.treeId !== treeId) {
            this.startSession(playerId, treeId);
            session = this.sessions.get(playerId);
        }
        if (!session) return;

        session.swingPhase = 1;
        session.swingSide = side === -1 ? -1 : 1;
        const intensity = Math.min(2, (speed || 2) / 4);
        playManualChopSound(intensity * 0.85);

        this.forestTreeManager?.applyRemoteChopHit(treeId, side, speed, leftCut, rightCut, falling);
    }

    _layoutAxeRest(session) {
        const treeMesh = session.treeMesh;
        if (!treeMesh) return;
        const cutY = STUMP_H + CUT_H * 0.45;
        session.restPos.set(0, cutY, TRUNK_RADIUS + 0.55);
        session.targetPos.copy(session.restPos);
        treeMesh.localToWorld(session.restPos);
        session.axeGroup.position.copy(session.restPos);
        session.axeGroup.rotation.set(Math.PI / 6, 0, Math.PI / 4);
    }

    _layoutAxeSwing(session) {
        const treeMesh = session.treeMesh;
        if (!treeMesh) return;
        const cutY = STUMP_H + CUT_H * 0.45;
        const side = session.swingSide;
        session.targetPos.set(side * (TRUNK_RADIUS + 0.08), cutY, TRUNK_RADIUS + 0.12);
        treeMesh.localToWorld(session.targetPos);
        session.axeGroup.rotation.set(0, side === -1 ? Math.PI : 0, side === -1 ? Math.PI / 3 : -Math.PI / 3);
    }

    update(delta) {
        for (const session of this.sessions.values()) {
            if (session.swingPhase > 0) {
                session.swingPhase = Math.max(0, session.swingPhase - delta * 3.5);
                this._layoutAxeSwing(session);
            } else {
                this._layoutAxeRest(session);
            }

            const force = session.forceVec.copy(session.targetPos).sub(session.axeGroup.position).multiplyScalar(38);
            session.axeVel.addScaledVector(force, delta);
            session.axeVel.multiplyScalar(0.72);
            session.axeGroup.position.addScaledVector(session.axeVel, delta * 14);
        }
    }
}

export default RemoteManualChopVisuals;
