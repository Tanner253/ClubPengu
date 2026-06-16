/**
 * ManualChopController — overworld drag-chop axe, chips, close camera & server sync.
 */

import { MANUAL_CHOP } from '../config/manualChop';
import { createManualChopAxeGroup } from '../props/ManualChopAxeMesh';
import { playManualChopSound } from '../utils/manualChopSounds';

const { VOXEL, TRUNK_RADIUS, STUMP_H, CUT_H, MIN_HIT_SPEED, HIT_COOLDOWN_MS } = MANUAL_CHOP;
const MAX_CHIPS = 200;

class ManualChopController {
    constructor() {
        this.active = false;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.THREE = null;
        this.treeEntry = null;
        this.voxelTree = null;
        this.treeWorldPos = null;
        this.playerWorldPos = null;
        this.getPlayerViewState = null;
        this.playerMesh = null;
        this._playerWasVisible = true;

        this.axeGroup = null;
        this.bladeTipMarker = null;
        this.chipMesh = null;
        this.chipVel = null;
        this.chipLife = null;
        this.chipSpin = null;
        this.chipCursor = 0;

        this.isDragging = false;
        this.mouse = null;
        this.lastHitTime = 0;
        this.axeVel = null;
        this.axeTargetPos = null;
        this.axeTargetRot = null;
        this.prevBladeTip = null;
        this.currBladeTip = null;
        this.dummy = null;
        this._localTip = null;
        this._localAxePos = null;
        this._cameraTarget = null;
        this._prevLocalTip = null;
        this._worldDir = null;
        this._localAxeVelX = 0;

        this.sessionId = null;
        this.onHit = null;
        this.onFallComplete = null;
        this.onCancel = null;
        this.pendingServerFall = false;
        this._completeSent = false;
        this.controls = null;
        this._savedCameraDistance = null;
        this._cameraPos = null;
        this._lookTarget = null;
    }

    enter(opts) {
        const {
            scene, camera, renderer, THREE, treeEntry, treeWorldPos, playerWorldPos,
            sessionId, controls, getPlayerViewState, playerMesh,
            onHit, onFallComplete, onCancel
        } = opts;

        this.active = true;
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.THREE = THREE;
        this.treeEntry = treeEntry;
        this.voxelTree = treeEntry.instance;
        this.treeWorldPos = treeWorldPos;
        this.playerWorldPos = playerWorldPos || treeWorldPos;
        this.sessionId = sessionId;
        this.controls = controls;
        this.getPlayerViewState = getPlayerViewState;
        this.playerMesh = playerMesh;
        this.onHit = onHit;
        this.onFallComplete = onFallComplete;
        this.onCancel = onCancel;
        this.pendingServerFall = false;
        this.isDragging = false;
        this._completeSent = false;
        this.lastHitTime = 0;

        this.mouse = new THREE.Vector2();
        this.axeVel = new THREE.Vector3();
        this.axeTargetPos = new THREE.Vector3();
        this.axeTargetRot = new THREE.Euler();
        this.prevBladeTip = new THREE.Vector3();
        this.currBladeTip = new THREE.Vector3();
        this.dummy = new THREE.Object3D();
        this._localTip = new THREE.Vector3();
        this._localAxePos = new THREE.Vector3();
        this._cameraTarget = new THREE.Vector3();
        this._prevLocalTip = new THREE.Vector3();
        this._worldDir = new THREE.Vector3();
        this._cameraPos = new THREE.Vector3();
        this._lookTarget = new THREE.Vector3();

        if (this.playerMesh) {
            this._playerWasVisible = this.playerMesh.visible;
            this.playerMesh.visible = false;
        }

        if (this.controls && this.camera) {
            this._savedCameraDistance = this.camera.position.distanceTo(this.controls.target);
        }

        if (this.voxelTree?.faceTowardWorldPoint) {
            this.voxelTree.faceTowardWorldPoint(this.playerWorldPos.x, this.playerWorldPos.z);
        }
        this.voxelTree?.addChopLighting?.(scene);

        this._buildAxe();
        this._buildChips();

        if (this.controls) {
            this._savedMinDist = this.controls.minDistance;
            this._savedMaxDist = this.controls.maxDistance;
            this.controls.minDistance = 0.8;
            this.controls.maxDistance = 2.5;
            this.controls.enabled = false;
        }
    }

    getSavedCameraDistance() {
        return this._savedCameraDistance;
    }

    exit() {
        if (!this.active) return;
        this.active = false;
        this.isDragging = false;

        if (this.axeGroup && this.scene) this.scene.remove(this.axeGroup);
        if (this.chipMesh && this.scene) this.scene.remove(this.chipMesh);
        this.axeGroup = null;
        this.chipMesh = null;

        this.voxelTree?.restoreFacing?.();
        this.voxelTree?.removeChopLighting?.();

        if (this.controls) {
            this.controls.enabled = true;
            if (this._savedMinDist != null) this.controls.minDistance = this._savedMinDist;
            if (this._savedMaxDist != null) this.controls.maxDistance = this._savedMaxDist;
        }
        if (this.playerMesh) {
            this.playerMesh.visible = this._playerWasVisible;
            this.playerMesh = null;
        }

        this.scene = null;
        this.camera = null;
        this.voxelTree = null;
        this.treeEntry = null;
    }

    _buildAxe() {
        this.axeGroup = createManualChopAxeGroup(this.THREE);
        this.bladeTipMarker = this.axeGroup.getObjectByName('blade_tip');
        this.scene.add(this.axeGroup);
        this._syncAxeWorldFromLocal(this._localAxePos.set(0.9, STUMP_H + CUT_H * 0.45, TRUNK_RADIUS + 0.45));
    }

    _buildChips() {
        const geo = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL);
        this.chipMesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.65 }), MAX_CHIPS);
        this.chipMesh.castShadow = true;
        this.chipMesh.name = 'manual_chop_chips';
        this.scene.add(this.chipMesh);
        this.chipVel = new Float32Array(MAX_CHIPS * 3);
        this.chipLife = new Float32Array(MAX_CHIPS);
        this.chipSpin = new Float32Array(MAX_CHIPS * 3);
    }

    _syncAxeWorldFromLocal(localPos) {
        const world = localPos.clone();
        this.treeEntry.mesh.localToWorld(world);
        this.axeGroup.position.copy(world);
    }

    _worldToTreeLocal(worldVec, target) {
        return this.treeEntry.mesh.worldToLocal(target.copy(worldVec));
    }

    _localAxeZOnTrunk(localX) {
        const clampedX = Math.min(Math.abs(localX), TRUNK_RADIUS - 0.02);
        const zOffset = Math.sqrt(TRUNK_RADIUS * TRUNK_RADIUS - clampedX * clampedX);
        return zOffset;
    }

    _localBladeDistToTrunk(localPos) {
        const dx = localPos.x;
        const dz = localPos.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    updateMouse(clientX, clientY) {
        if (!this.renderer) return;
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }

    onPointerDown(clientX, clientY) {
        if (!this.active) return;
        this.isDragging = true;
        this.updateMouse(clientX, clientY);
    }

    onPointerUp() {
        this.isDragging = false;
    }

    onPointerMove(clientX, clientY) {
        if (!this.active || !this.isDragging) return;
        this.updateMouse(clientX, clientY);
    }

    spawnChips(worldPos, side, count, speed = 1) {
        if (!this.chipMesh) return;
        for (let i = 0; i < count; i++) {
            const idx = (this.chipCursor + i) % MAX_CHIPS;
            this.dummy.position.set(
                worldPos.x + (Math.random() - 0.5) * 0.15,
                worldPos.y + (Math.random() - 0.5) * 0.1,
                worldPos.z + (Math.random() - 0.5) * 0.15
            );
            this.dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            this.dummy.scale.set(0.6, 0.6, 0.6);
            this.dummy.updateMatrix();
            this.chipMesh.setMatrixAt(idx, this.dummy.matrix);
            this.chipVel[idx * 3] = side * (2 + Math.random() * 3) * speed;
            this.chipVel[idx * 3 + 1] = 1.5 + Math.random() * 3 * speed;
            this.chipVel[idx * 3 + 2] = (Math.random() - 0.5) * 3;
            this.chipSpin[idx * 3] = (Math.random() - 0.5) * 12;
            this.chipSpin[idx * 3 + 1] = (Math.random() - 0.5) * 12;
            this.chipSpin[idx * 3 + 2] = (Math.random() - 0.5) * 12;
            this.chipLife[idx] = 0.8 + Math.random() * 0.6;
        }
        this.chipCursor = (this.chipCursor + count) % MAX_CHIPS;
        this.chipMesh.instanceMatrix.needsUpdate = true;
    }

    spawnChipsFromCut(side, hitYLocal, intensity) {
        if (!this.voxelTree) return;
        const candidates = this.voxelTree.getCutCandidates(side, hitYLocal);
        const toSpawn = Math.min(candidates.length, Math.floor(5 + intensity * 5));
        for (let i = 0; i < toSpawn; i++) {
            const v = candidates[Math.floor(Math.random() * candidates.length)];
            this.spawnChips(this.voxelTree.getVoxelWorldPos(v), side, 1, intensity * 0.6);
        }
    }

    confirmLocalHit({ side, speed, leftCut, rightCut, falling }) {
        if (!this.voxelTree) return;
        if (leftCut != null && rightCut != null) {
            this.voxelTree.setCutState(leftCut, rightCut);
        } else {
            this.voxelTree.applyHit(side, speed);
        }
        const intensity = Math.min(2, (speed || 2) / 4);
        playManualChopSound(intensity);
        const localY = this.voxelTree.localCutHeightFromWorldY(this.currBladeTip.y);
        this.spawnChipsFromCut(side, localY, intensity);
        if (falling && this.voxelTree.treeState === 'IDLE') {
            this.voxelTree.startFall();
        }
        if (falling) {
            this.pendingServerFall = true;
            this.isDragging = false;
        }
    }

    tryAxeHit() {
        if (!this.voxelTree || this.voxelTree.treeState !== 'IDLE') return;

        this.bladeTipMarker.getWorldPosition(this.currBladeTip);
        const localTip = this._worldToTreeLocal(this.currBladeTip, this._localTip);
        const cutY = STUMP_H + CUT_H * 0.45;
        if (localTip.y < STUMP_H + 0.04 || localTip.y > STUMP_H + CUT_H - 0.04) return;

        const dist = this._localBladeDistToTrunk(localTip);
        const onSurface = dist <= TRUNK_RADIUS + VOXEL * 1.2;
        const penetrating = dist <= TRUNK_RADIUS - VOXEL * 0.5;
        if (!onSurface && !penetrating) return;

        const speed = Math.abs(this._localAxeVelX);
        if (speed < MIN_HIT_SPEED && !penetrating) return;
        if (performance.now() - this.lastHitTime < HIT_COOLDOWN_MS) return;

        const hitSpeed = Math.max(speed, 2);
        if (localTip.x < -VOXEL && this._localAxeVelX > 0.25) {
            this.lastHitTime = performance.now();
            this.onHit?.({ side: -1, speed: hitSpeed });
            this._localAxePos.set(-TRUNK_RADIUS - 0.05, cutY, this._localAxeZOnTrunk(-TRUNK_RADIUS));
            this._syncAxeWorldFromLocal(this._localAxePos);
            return;
        }
        if (localTip.x > VOXEL && this._localAxeVelX < -0.25) {
            this.lastHitTime = performance.now();
            this.onHit?.({ side: 1, speed: hitSpeed });
            this._localAxePos.set(TRUNK_RADIUS + 0.05, cutY, this._localAxeZOnTrunk(TRUNK_RADIUS));
            this._syncAxeWorldFromLocal(this._localAxePos);
        }
    }

    _refreshPlayerWorldPos() {
        const live = this.getPlayerViewState?.();
        if (live) {
            this.playerWorldPos = {
                x: live.x,
                y: live.y ?? 0,
                z: live.z,
                mountYOffset: live.mountYOffset ?? 0
            };
        }
    }

    _updateCamera(delta) {
        if (!this.camera || !this.controls || !this.treeEntry?.mesh) return;
        this._refreshPlayerWorldPos();

        const stageScale = this.voxelTree?._stageScale || 1;
        const cutY = (STUMP_H + CUT_H * 0.45) * stageScale;
        const treeBaseY = this.treeEntry.mesh.position.y;
        const treeWorld = this._cameraTarget.set(
            this.treeEntry.mesh.position.x,
            treeBaseY + cutY,
            this.treeEntry.mesh.position.z
        );

        const px = this.playerWorldPos?.x ?? treeWorld.x;
        const py = this.playerWorldPos?.y ?? 0;
        const pz = this.playerWorldPos?.z ?? treeWorld.z;
        const mountY = this.playerWorldPos?.mountYOffset ?? 0;
        const dx = treeWorld.x - px;
        const dz = treeWorld.z - pz;
        const len = Math.hypot(dx, dz) || 1;
        const fx = dx / len;
        const fz = dz / len;

        const eyeH = MANUAL_CHOP.CAMERA_EYE_HEIGHT + mountY;
        const eyeFwd = MANUAL_CHOP.CAMERA_EYE_FORWARD;
        this._cameraPos.set(
            px + fx * eyeFwd,
            py + eyeH,
            pz + fz * eyeFwd
        );

        this._lookTarget.copy(treeWorld);
        this._lookTarget.y -= MANUAL_CHOP.CAMERA_LOOK_DOWN;

        const lerpT = 1 - Math.exp(-MANUAL_CHOP.CAMERA_LERP_SPEED * delta);
        this.controls.target.lerp(this._lookTarget, lerpT);
        this.camera.position.lerp(this._cameraPos, lerpT);
        this.camera.lookAt(this._lookTarget);
    }

    update(delta) {
        if (!this.active || !this.axeGroup) return;

        if (this.isDragging) {
            const localTarget = this._localAxePos.set(
                this.mouse.x * 1.35,
                STUMP_H + CUT_H * 0.45 + this.mouse.y * 0.45,
                this._localAxeZOnTrunk(this.mouse.x * 1.35)
            );
            this.treeEntry.mesh.localToWorld(localTarget);
            this.axeTargetPos.copy(localTarget);
            const localX = this.mouse.x * 1.35;
            if (localX < 0) {
                this.axeTargetRot.set(0, Math.PI, Math.PI / 6);
            } else {
                this.axeTargetRot.set(0, 0, -Math.PI / 6);
            }
        } else {
            this._localAxePos.set(0.95, STUMP_H + CUT_H * 0.45, TRUNK_RADIUS + 0.55);
            this.treeEntry.mesh.localToWorld(this._localAxePos);
            this.axeTargetPos.copy(this._localAxePos);
            this.axeTargetRot.set(Math.PI / 6, Math.PI, Math.PI / 4);
        }

        const force = this.axeTargetPos.clone().sub(this.axeGroup.position).multiplyScalar(42);
        this.axeVel.addScaledVector(force, delta);
        this.axeVel.multiplyScalar(0.8);
        this.axeGroup.position.addScaledVector(this.axeVel, delta * 16);

        this.axeGroup.quaternion.slerp(
            new this.THREE.Quaternion().setFromEuler(this.axeTargetRot),
            14 * delta
        );

        this.bladeTipMarker.getWorldPosition(this.currBladeTip);
        this._worldToTreeLocal(this.currBladeTip, this._localTip);
        this._localAxeVelX = (this._localTip.x - this._prevLocalTip.x) / Math.max(delta, 0.001);
        this._prevLocalTip.copy(this._localTip);

        if (this.voxelTree?.treeState === 'IDLE' && this.isDragging) {
            this.tryAxeHit();
        }

        let treeStatus = 'idle';
        if (this.voxelTree) {
            treeStatus = this.voxelTree.update(delta);
            if (treeStatus === 'fall_complete' && !this._completeSent) {
                this._completeSent = true;
                this.pendingServerFall = false;
                this.onFallComplete?.();
            }
        }

        this._updateCamera(delta);
        this._updateChips(delta);
        return treeStatus;
    }

    _updateChips(delta) {
        if (!this.chipMesh) return;
        let chipsDirty = false;
        for (let i = 0; i < MAX_CHIPS; i++) {
            if (this.chipLife[i] <= 0) continue;
            this.chipLife[i] -= delta;
            this.chipMesh.getMatrixAt(i, this.dummy.matrix);
            this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);
            this.dummy.position.x += this.chipVel[i * 3] * delta;
            this.dummy.position.y += this.chipVel[i * 3 + 1] * delta;
            this.dummy.position.z += this.chipVel[i * 3 + 2] * delta;
            this.chipVel[i * 3 + 1] -= 20 * delta;
            this.dummy.rotation.x += this.chipSpin[i * 3] * delta;
            this.dummy.rotation.y += this.chipSpin[i * 3 + 1] * delta;
            this.dummy.rotation.z += this.chipSpin[i * 3 + 2] * delta;
            if (this.dummy.position.y < 0.04) {
                this.dummy.position.y = 0.04;
                this.chipVel[i * 3] *= 0.55;
                this.chipVel[i * 3 + 2] *= 0.55;
                this.chipVel[i * 3 + 1] *= -0.25;
            }
            const s = Math.max(0, this.chipLife[i]);
            this.dummy.scale.setScalar(s * 0.6);
            this.dummy.updateMatrix();
            this.chipMesh.setMatrixAt(i, this.dummy.matrix);
            chipsDirty = true;
        }
        if (chipsDirty) this.chipMesh.instanceMatrix.needsUpdate = true;
    }
}

export default ManualChopController;
