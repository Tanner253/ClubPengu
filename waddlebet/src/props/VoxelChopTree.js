/**
 * VoxelChopTree — voxel trunk + cut zone for manual chop gameplay;
 * snowy tiered pine crown matches forest decorative trees.
 */

import { MANUAL_CHOP, STAGE_TREE_SCALE, createTreeRng } from '../config/manualChop';
import { playManualFallSound } from '../utils/manualChopSounds';
import { PropColors } from './PropColors';
import { buildPineCrownMeshes } from './PineCrownBuilder';
import { getTreeWoodSpecies } from '../config/treeWoodSpecies';

const { VOXEL, TRUNK_RADIUS, STUMP_H, CUT_H } = MANUAL_CHOP;
const MAX_VOXELS = 4000;

function hexToInt(hex) {
    return parseInt(hex.replace('#', ''), 16);
}

class VoxelChopTree {
    /**
     * @param {typeof import('three')} THREE
     * @param {{ id: string, stage?: string, state?: string, choppingBy?: string|null }} config
     */
    constructor(THREE, config) {
        this.THREE = THREE;
        this.config = { ...config };
        this.species = getTreeWoodSpecies(config.woodType || 'pine_log');
        this.group = new THREE.Group();
        this.group.name = `voxel_chop_tree_${config.id}`;
        this.group.userData.harvestableTreeId = config.id;
        this.group.userData.isHarvestableTree = true;
        this.group.userData.chopMode = 'manual';
        this.group.userData.woodType = this.species.id;

        this.leftCut = 0;
        this.rightCut = 0;
        this.treeState = 'IDLE';
        this.fallAngularVel = 0;
        this.growProgress = 1;
        this.shakeAmount = 0;
        this.pendingHarvested = false;
        this._rng = createTreeRng(config.id || 'tree');
        this._stageScale = STAGE_TREE_SCALE[config.stage] || 1;
        this._savedRotationY = 0;
        this.chopLight = null;
        this.crownGroup = null;
        this.neckMesh = null;

        this.voxels = [];
        this.stumpCount = 0;
        this.cutBarkCount = 0;
        this.cutWoodCount = 0;

        this.dummy = new THREE.Object3D();
        this.hiddenScale = new THREE.Vector3(0, 0, 0);
        this._worldVec = new THREE.Vector3();

        this._initMaterials();
        this._initMeshes();
        this.upperTreeGroup = new THREE.Group();
        this.upperTreeGroup.position.y = STUMP_H + CUT_H;
        this.group.add(this.upperTreeGroup);
        this.group.scale.setScalar(this._stageScale);

        this._build();
    }

    _initMaterials() {
        const THREE = this.THREE;
        const barkHex = this.species.barkColor || PropColors.barkMedium;
        const woodHex = this.species.foliageAccent || PropColors.plankLight;
        this.barkMat = new THREE.MeshStandardMaterial({
            color: hexToInt(barkHex),
            roughness: 0.94,
            metalness: 0
        });
        this.woodMat = new THREE.MeshStandardMaterial({
            color: hexToInt(woodHex),
            roughness: 0.68
        });
    }

    _initMeshes() {
        const THREE = this.THREE;
        const geo = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL);
        this.voxelGeo = geo;
        this.stumpMesh = new THREE.InstancedMesh(geo, this.barkMat, MAX_VOXELS);
        this.cutBarkMesh = new THREE.InstancedMesh(geo, this.barkMat, MAX_VOXELS);
        this.cutWoodMesh = new THREE.InstancedMesh(geo, this.woodMat, MAX_VOXELS);
        [this.stumpMesh, this.cutBarkMesh, this.cutWoodMesh].forEach(m => {
            m.castShadow = true;
            m.receiveShadow = true;
        });
        this.group.add(this.stumpMesh);
        this.group.add(this.cutBarkMesh);
        this.group.add(this.cutWoodMesh);
    }

    getMesh() {
        return this.group;
    }

    getDisplayScale() {
        return this._stageScale || 1;
    }

    getCollisionRadius() {
        return MANUAL_CHOP.COLLISION_RADIUS * (this._stageScale || 1);
    }

    trunkRadiusAt(y) {
        const base = TRUNK_RADIUS;
        if (y <= STUMP_H) return base * 1.06;
        if (y <= STUMP_H + CUT_H) return base;
        return base * 0.78;
    }

    isInsideTrunk(x, z, y) {
        const r = this.trunkRadiusAt(y);
        const n = Math.sin(y * 7) * 0.01 + Math.cos(x * 10) * 0.006;
        return x * x + z * z <= (r + n) * (r + n);
    }

    addVoxel(mesh, index, lx, ly, lz, side) {
        const dummy = this.dummy;
        dummy.position.set(lx, ly, lz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        this.voxels.push({
            mesh,
            index,
            local: new this.THREE.Vector3(lx, ly, lz),
            world: new this.THREE.Vector3(),
            side,
            alive: true,
            exposed: false,
            cutLayer: 'bark',
            growOrder: 1
        });
    }

    computeGrowOrder(v) {
        if (v.side === 'stump') return 0;
        if (v.side === 'cut') return 0.08 + ((v.local.y - STUMP_H) / CUT_H) * 0.22;
        return 1;
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    growVoxelScale(v, easedProgress) {
        const window = 0.08;
        const t = (easedProgress - v.growOrder) / window;
        return Math.max(0, Math.min(1, t));
    }

    setVoxelMatrix(v, scale) {
        const dummy = this.dummy;
        dummy.position.copy(v.local);
        dummy.rotation.set(0, 0, 0);
        if (scale <= 0) {
            dummy.scale.copy(this.hiddenScale);
            dummy.updateMatrix();
            v.mesh.setMatrixAt(v.index, dummy.matrix);
            return;
        }
        const pop = this.easeOutBack(scale);
        const s = Math.min(1.06, Math.max(0.001, pop));
        if (scale < 1) dummy.position.y += (1 - Math.min(1, pop)) * VOXEL * 0.5;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        v.mesh.setMatrixAt(v.index, dummy.matrix);
    }

    applyGrowVisuals(progress) {
        const eased = this.easeOutCubic(Math.min(1, progress));
        const dirty = new Set();
        for (const v of this.voxels) {
            if (!v.alive || v.growOrder <= 0) continue;
            const scale = this.growVoxelScale(v, eased);
            this.setVoxelMatrix(v, scale);
            dirty.add(v.mesh);
        }
        for (const mesh of dirty) mesh.instanceMatrix.needsUpdate = true;

        if (this.crownGroup) {
            const crownT = Math.max(0, Math.min(1, (eased - 0.35) / 0.55));
            const s = this.easeOutBack(crownT);
            this.crownGroup.scale.set(s, s, s);
            if (this.neckMesh) {
                const neckT = Math.max(0, Math.min(1, (eased - 0.25) / 0.4));
                this.neckMesh.scale.set(1, this.easeOutBack(neckT), 1);
            }
        }
    }

    finalizeGrowVisuals() {
        for (const v of this.voxels) {
            if (!v.alive) continue;
            this.dummy.position.copy(v.local);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.scale.set(1, 1, 1);
            this.dummy.updateMatrix();
            v.mesh.setMatrixAt(v.index, this.dummy.matrix);
        }
        for (const mesh of [this.stumpMesh, this.cutBarkMesh, this.cutWoodMesh]) {
            mesh.instanceMatrix.needsUpdate = true;
        }
        if (this.crownGroup) this.crownGroup.scale.set(1, 1, 1);
        if (this.neckMesh) this.neckMesh.scale.set(1, 1, 1);
    }

    assignGrowOrders() {
        for (const v of this.voxels) v.growOrder = this.computeGrowOrder(v);
    }

    hideVoxel(v) {
        v.alive = false;
        this.dummy.position.copy(v.local);
        this.dummy.scale.copy(this.hiddenScale);
        this.dummy.updateMatrix();
        v.mesh.setMatrixAt(v.index, this.dummy.matrix);
        v.mesh.instanceMatrix.needsUpdate = true;
    }

    wedgeDepth(side, lx, ly, lz) {
        const cut = side === -1 ? this.leftCut : this.rightCut;
        if (cut <= 0) return 0;
        const yCenter = STUMP_H + CUT_H / 2;
        const yNorm = Math.abs(ly - yCenter) / (CUT_H / 2);
        const yFactor = Math.pow(Math.max(0, 1 - yNorm), 1.3);
        const zFactor = 0.35 + 0.65 * ((lz + TRUNK_RADIUS) / (TRUNK_RADIUS * 2));
        return TRUNK_RADIUS * 1.15 * cut * yFactor * zFactor;
    }

    updateCutVoxels() {
        const cutVoxels = this.voxels.filter(v => v.side === 'cut' && v.alive);
        for (const v of cutVoxels) {
            const { x: lx, y: ly, z: lz } = v.local;
            const depthL = this.wedgeDepth(-1, lx, ly, lz);
            const depthR = this.wedgeDepth(1, lx, ly, lz);
            let remove = false;
            if (lx < 0 && Math.abs(lx) > TRUNK_RADIUS - depthL) remove = true;
            if (lx > 0 && lx > TRUNK_RADIUS - depthR) remove = true;
            if (remove) this.hideVoxel(v);
        }
        this.refreshExposedMaterials();
    }

    refreshExposedMaterials() {
        const aliveCut = this.voxels.filter(v => v.side === 'cut' && v.alive);
        const deadCut = this.voxels.filter(v => v.side === 'cut' && !v.alive);
        const step = VOXEL * 1.05;
        let barkIdx = 0;
        let woodIdx = 0;
        for (const v of aliveCut) {
            let showWood = false;
            for (const dead of deadCut) {
                if (
                    Math.abs(dead.local.x - v.local.x) < step
                    && Math.abs(dead.local.y - v.local.y) < step
                    && Math.abs(dead.local.z - v.local.z) < step
                ) {
                    showWood = true;
                    break;
                }
            }
            const targetMesh = showWood ? this.cutWoodMesh : this.cutBarkMesh;
            const targetIndex = showWood ? woodIdx++ : barkIdx++;
            v.exposed = showWood;
            v.cutLayer = showWood ? 'wood' : 'bark';
            v.mesh = targetMesh;
            v.index = targetIndex;
            this.dummy.position.copy(v.local);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.scale.set(1, 1, 1);
            this.dummy.updateMatrix();
            targetMesh.setMatrixAt(targetIndex, this.dummy.matrix);
        }
        this.cutBarkMesh.count = barkIdx;
        this.cutWoodMesh.count = woodIdx;
        this.cutBarkMesh.instanceMatrix.needsUpdate = true;
        this.cutWoodMesh.instanceMatrix.needsUpdate = true;
    }

    getVoxelWorldPos(v) {
        v.world.copy(v.local);
        this.group.localToWorld(v.world);
        return v.world;
    }

    _clearUpperVisuals() {
        if (this.crownGroup) {
            this.upperTreeGroup.remove(this.crownGroup);
            this.crownGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
            });
            this.crownGroup = null;
        }
        if (this.neckMesh) {
            this.upperTreeGroup.remove(this.neckMesh);
            if (this.neckMesh.geometry) this.neckMesh.geometry.dispose();
            this.neckMesh = null;
        }
    }

    _buildUpperVisuals() {
        this._clearUpperVisuals();
        const THREE = this.THREE;
        // Local-space dimensions only — group.scale (_stageScale) sizes the whole tree uniformly.
        const neckH = 0.5;
        const neckBottomR = TRUNK_RADIUS * 0.78;
        const neckTopR = TRUNK_RADIUS * 0.58;

        this.neckMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(neckTopR, neckBottomR, neckH, 10),
            this.barkMat
        );
        this.neckMesh.position.y = neckH * 0.5;
        this.neckMesh.castShadow = true;
        this.neckMesh.receiveShadow = true;
        this.neckMesh.name = 'chop_neck';
        this.upperTreeGroup.add(this.neckMesh);

        const { foliageMesh, snowMesh } = buildPineCrownMeshes(THREE, this.config.stage, this.species);
        this.crownGroup = new THREE.Group();
        this.crownGroup.name = 'chop_crown';
        // Crown foliage base sits on neck top (PineCrownBuilder starts layers at y≈0).
        this.crownGroup.position.y = neckH - 0.03;
        if (foliageMesh) this.crownGroup.add(foliageMesh);
        if (snowMesh) this.crownGroup.add(snowMesh);
        this.upperTreeGroup.add(this.crownGroup);
    }

    _buildTreeGeometry() {
        this.voxels = [];
        this.stumpCount = this.cutBarkCount = this.cutWoodCount = 0;
        const step = VOXEL;
        const yMin = step / 2;
        const yMax = STUMP_H + CUT_H;
        const xzRange = Math.ceil(TRUNK_RADIUS * 1.1 / step) + 1;

        for (let y = yMin; y <= yMax; y += step) {
            for (let ix = -xzRange; ix <= xzRange; ix++) {
                for (let iz = -xzRange; iz <= xzRange; iz++) {
                    const lx = ix * step;
                    const lz = iz * step;
                    if (!this.isInsideTrunk(lx, lz, y)) continue;
                    if (y <= STUMP_H) {
                        this.addVoxel(this.stumpMesh, this.stumpCount++, lx, y, lz, 'stump');
                    } else {
                        this.addVoxel(this.cutBarkMesh, this.cutBarkCount++, lx, y, lz, 'cut');
                    }
                }
            }
        }

        this.stumpMesh.count = this.stumpCount;
        this.cutBarkMesh.count = this.cutBarkCount;
        this.cutWoodMesh.count = this.cutWoodCount;
        for (const mesh of [this.stumpMesh, this.cutBarkMesh, this.cutWoodMesh]) {
            mesh.instanceMatrix.needsUpdate = true;
        }
        this.refreshExposedMaterials();
        this.assignGrowOrders();
        this._buildUpperVisuals();
    }

    _build() {
        const { state = 'ready' } = this.config;
        if (state === 'harvested') {
            this._showStumpOnly();
            return;
        }
        this._buildTreeGeometry();
        this._addInteractionRing();
        if (this.config.choppingBy) this._addChoppingIndicator();
    }

    _showStumpOnly() {
        this.upperTreeGroup.visible = false;
        this.cutBarkMesh.visible = false;
        this.cutWoodMesh.visible = false;
        const step = VOXEL;
        const yMin = step / 2;
        const xzRange = Math.ceil(TRUNK_RADIUS * 1.1 / step) + 1;
        for (let y = yMin; y <= STUMP_H; y += step) {
            for (let ix = -xzRange; ix <= xzRange; ix++) {
                for (let iz = -xzRange; iz <= xzRange; iz++) {
                    const lx = ix * step;
                    const lz = iz * step;
                    if (!this.isInsideTrunk(lx, lz, y)) continue;
                    this.addVoxel(this.stumpMesh, this.stumpCount++, lx, y, lz, 'stump');
                }
            }
        }
        this.stumpMesh.count = this.stumpCount;
        this.stumpMesh.instanceMatrix.needsUpdate = true;
    }

    _addInteractionRing() {
        const THREE = this.THREE;
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.68, 0.82, 24),
            new THREE.MeshBasicMaterial({
                color: 0x7ab89a,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;
        ring.name = 'interaction_ring';
        this.group.add(ring);
    }

    _addChoppingIndicator() {
        const THREE = this.THREE;
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.88, 1.0, 24),
            new THREE.MeshBasicMaterial({
                color: 0xffaa55,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        ring.name = 'chopping_ring';
        this.group.add(ring);
    }

    setCutState(leftCut, rightCut) {
        this.leftCut = leftCut;
        this.rightCut = rightCut;
        this.updateCutVoxels();
    }

    applyHit(side, speed = 2) {
        const intensity = Math.min(2, speed / 4);
        this.shakeAmount = 0.04 + intensity * 0.03;
        const cutAmount = MANUAL_CHOP.CUT_PER_HIT * (0.7 + intensity * 0.5);
        if (side === -1) this.leftCut = Math.min(1, this.leftCut + cutAmount);
        if (side === 1) this.rightCut = Math.min(1, this.rightCut + cutAmount);
        this.updateCutVoxels();
        return { leftCut: this.leftCut, rightCut: this.rightCut, intensity };
    }

    startFall() {
        if (this.treeState !== 'IDLE') return;
        this.treeState = 'FALLING';
        this.fallAngularVel = 0;
        playManualFallSound();
    }

    faceTowardWorldPoint(worldX, worldZ) {
        this._savedRotationY = this.group.rotation.y;
        const dx = worldX - this.group.position.x;
        const dz = worldZ - this.group.position.z;
        this.group.rotation.y = Math.atan2(dx, dz);
    }

    restoreFacing() {
        this.group.rotation.y = this._savedRotationY;
    }

    addChopLighting(scene) {
        if (!scene || this.chopLight) return;
        const light = new this.THREE.PointLight(0xfff2d4, 1.4, 10, 1.5);
        light.position.set(0, STUMP_H + CUT_H + 2.0, TRUNK_RADIUS + 1.2);
        this.group.add(light);
        this.chopLight = light;
    }

    removeChopLighting() {
        if (!this.chopLight) return;
        this.group.remove(this.chopLight);
        this.chopLight = null;
    }

    beginRegrowth() {
        this.treeState = 'GROWING';
        this.leftCut = 0;
        this.rightCut = 0;
        this.fallAngularVel = 0;
        this.growProgress = 0;
        this.upperTreeGroup.rotation.set(0, 0, 0);
        this.upperTreeGroup.scale.set(1, 1, 1);

        const keep = this.upperTreeGroup;
        while (this.group.children.length > 0) {
            const child = this.group.children[0];
            if (child === keep) break;
            this.group.remove(child);
            if (child.geometry) child.geometry.dispose();
        }

        this._clearUpperVisuals();
        this._initMeshes();
        this.group.add(this.stumpMesh);
        this.group.add(this.cutBarkMesh);
        this.group.add(this.cutWoodMesh);
        this._buildTreeGeometry();
        this.applyGrowVisuals(0);
        this.upperTreeGroup.visible = true;
        this.cutBarkMesh.visible = true;
        this.cutWoodMesh.visible = true;
        this.stumpMesh.visible = true;
    }

    onHarvested(force = false) {
        if (this.treeState === 'FALLING' && !force) {
            this.pendingHarvested = true;
            return;
        }
        this._applyHarvestedStump();
    }

    _applyHarvestedStump() {
        this.treeState = 'HARVESTED';
        this.pendingHarvested = false;
        this.upperTreeGroup.visible = false;
        this.cutBarkMesh.visible = false;
        this.cutWoodMesh.visible = false;
        this.stumpMesh.visible = true;
        this.removeChopLighting();
        this._ensureHarvestStumpMesh();
    }

    _ensureHarvestStumpMesh() {
        if (this.group.getObjectByName('tree_stump')) return;
        const THREE = this.THREE;
        const stump = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.45, 0.35, 8),
            new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.95 })
        );
        stump.position.y = 0.18;
        stump.name = 'tree_stump';
        stump.castShadow = true;
        stump.receiveShadow = true;
        this.group.add(stump);

        const regrowRing = new THREE.Mesh(
            new THREE.RingGeometry(0.55, 0.7, 24),
            new THREE.MeshBasicMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        regrowRing.rotation.x = -Math.PI / 2;
        regrowRing.position.y = 0.04;
        regrowRing.name = 'regrow_ring';
        this.group.add(regrowRing);
    }

    /**
     * @param {number} delta
     * @returns {'idle'|'falling'|'fall_complete'|'growing'|'ready'}
     */
    update(delta) {
        if (this.treeState === 'FALLING') {
            const fallDir = this.leftCut >= this.rightCut ? -1 : 1;
            const angle = Math.abs(this.upperTreeGroup.rotation.z);
            const torque = 3.2 + angle * 1.5;
            this.fallAngularVel += torque * delta * fallDir;
            this.fallAngularVel *= 0.995;
            this.upperTreeGroup.rotation.z += this.fallAngularVel * delta;
            this.upperTreeGroup.rotation.x -= delta * (0.6 + Math.abs(this.fallAngularVel) * 0.08);
            if (Math.abs(this.upperTreeGroup.rotation.z) > Math.PI / 2) {
                this.treeState = 'FALL_COMPLETE';
                this._applyHarvestedStump();
                return 'fall_complete';
            }
            return 'falling';
        }
        if (this.shakeAmount > 0) {
            this.shakeAmount -= delta * 1.5;
            const shake = this.shakeAmount * (Math.random() - 0.5) * 2;
            this.group.position.x = shake * 0.15;
            if (this.shakeAmount <= 0) this.group.position.x = 0;
        }
        return 'idle';
    }

    updateState(state, regrowAt, choppingBy = null) {
        this.config.state = state;
        this.config.regrowAt = regrowAt;
        this.config.choppingBy = choppingBy;
        if (state === 'harvested') {
            if (this.treeState === 'FALLING') {
                this.pendingHarvested = true;
            } else {
                this._applyHarvestedStump();
            }
        }
    }

    worldToLocalPoint(worldVec, target) {
        return this.group.worldToLocal(target.copy(worldVec));
    }

    localCutHeightFromWorldY(worldY) {
        const p = this._worldVec.set(0, worldY, 0);
        this.group.worldToLocal(p);
        return p.y;
    }

    getCutCandidates(side, hitYLocal) {
        const yRef = hitYLocal != null ? hitYLocal : STUMP_H + CUT_H * 0.45;
        return this.voxels.filter(v => {
            if (v.side !== 'cut' || !v.alive) return false;
            const onSide = side === -1 ? v.local.x < 0 : v.local.x > 0;
            return onSide && Math.abs(v.local.y - yRef) < CUT_H * 0.55;
        });
    }
}

export default VoxelChopTree;
