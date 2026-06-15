/**
 * WorldNpcManager — town merchant props + proximity / quest markers.
 * Meshes live in TownCenter.propMeshes (static map props); this class tracks interaction only.
 */

import { CENTER_X, CENTER_Z } from '../config/roomConfig';
import { WORLD_NPCS } from '../config/worldNpcs';
import { buildWorldNpc } from './NpcStandBuilder';
import { createNpcMarkerSprite, updateNpcMarkerSymbol } from './NpcMarkerSprite';

export default class WorldNpcManager {
    /**
     * @param {typeof import('three')} THREE
     */
    constructor(THREE) {
        this.THREE = THREE;
        this.collisionSystem = null;
        /** @type {import('three').Scene | null} */
        this.scene = null;
        /** @type {Function | null} */
        this.buildPenguinMesh = null;
        /** @type {Map<string, { group: import('three').Group, def: object, marker: import('three').Sprite, signSprite: import('three').Sprite | null, colliderId: number | null, worldX: number, worldZ: number }>} */
        this.instances = new Map();
        this.nearbyNpc = null;
    }

    /** @param {import('../engine/CollisionSystem').default | null} collisionSystem */
    setCollisionSystem(collisionSystem) {
        this.collisionSystem = collisionSystem;
        for (const inst of this.instances.values()) {
            if (inst.colliderId != null) continue;
            inst.colliderId = this.registerStandCollision(inst.group);
        }
    }

    /**
     * Spawn merchant stands once per town scene. Idempotent — safe to call after re-renders.
     * Groups are pushed into TownCenter.propMeshes so they dispose with the rest of the map.
     *
     * @param {import('three').Scene} scene
     * @param {Function} buildPenguinMesh
     * @param {import('../engine/CollisionSystem').default | null} collisionSystem
     * @param {import('three').Object3D[]} propMeshes
     */
    attachToTown(scene, buildPenguinMesh, collisionSystem, propMeshes) {
        if (this.isAttachedTo(scene)) {
            this.buildPenguinMesh = buildPenguinMesh;
            this.setCollisionSystem(collisionSystem);
            return;
        }

        this.detach();
        this.scene = scene;
        this.buildPenguinMesh = buildPenguinMesh;
        this.collisionSystem = collisionSystem;

        for (const def of WORLD_NPCS) {
            const group = buildWorldNpc(this.THREE, buildPenguinMesh, def);
            const worldX = CENTER_X + def.offsetX;
            const worldZ = CENTER_Z + def.offsetZ;
            group.position.set(worldX, 0, worldZ);
            group.visible = true;
            group.userData.isStaticTownProp = true;
            scene.add(group);

            const penguin = group.getObjectByName('npc_penguin');
            const marker = createNpcMarkerSprite(this.THREE, '!');
            marker.visible = false;
            if (penguin) {
                penguin.add(marker);
            } else {
                group.add(marker);
            }

            const signSprite = group.children[0]?.userData?.signSprite ?? null;
            if (signSprite) signSprite.userData.baseY = signSprite.position.y;

            const colliderId = this.registerStandCollision(group);

            if (propMeshes && !propMeshes.includes(group)) {
                propMeshes.push(group);
            }

            this.instances.set(def.id, { group, def, marker, signSprite, colliderId, worldX, worldZ });
        }
    }

    /** @param {import('three').Scene} scene */
    isAttachedTo(scene) {
        if (this.instances.size !== WORLD_NPCS.length || this.scene !== scene) return false;
        for (const { group } of this.instances.values()) {
            if (group.parent !== scene) return false;
        }
        return true;
    }

    /** Drop interaction tracking when town props are cleaned up elsewhere. */
    detach() {
        for (const inst of this.instances.values()) {
            this.unregisterStandCollision(inst.colliderId);
        }
        this.instances.clear();
        this.nearbyNpc = null;
        this.scene = null;
        this.collisionSystem = null;
    }

    registerStandCollision(group) {
        if (!this.collisionSystem || !group?.userData?.collision) return null;
        const { colliderId } = this.collisionSystem.registerProp(group);
        return colliderId ?? null;
    }

    unregisterStandCollision(colliderId) {
        if (colliderId != null && this.collisionSystem) {
            this.collisionSystem.removeCollider(colliderId);
        }
    }

    /** @deprecated use attachToTown — kept for callers migrating gradually */
    spawnAll() {
        if (!this.scene || !this.buildPenguinMesh) return;
        console.warn('[WorldNpcManager] spawnAll() is deprecated — use attachToTown()');
    }

    /** @deprecated meshes are owned by TownCenter.propMeshes */
    dispose() {
        this.detach();
    }

    /**
     * @param {{ x: number, z: number }} playerPos
     * @param {string} room
     * @param {{ gameInventory?: object, coins?: number }} playerState
     * @returns {object | null}
     */
    checkProximity(playerPos, room, playerState = {}) {
        if (room !== 'town' || this.instances.size === 0) {
            this.nearbyNpc = null;
            return null;
        }

        let closest = null;
        let closestDist = Infinity;

        for (const [id, inst] of this.instances) {
            const dx = playerPos.x - inst.worldX;
            const dz = playerPos.z - inst.worldZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const radius = inst.def.interactionRadius || 5;

            const markerType = this.getMarkerType(inst.def, playerState);
            if (inst.marker) {
                const showMarker = dist < radius + 8 && Boolean(markerType);
                if (showMarker) {
                    updateNpcMarkerSymbol(inst.marker, markerType);
                    inst.marker.visible = true;
                } else {
                    inst.marker.visible = false;
                }
            }

            if (dist < radius && dist < closestDist) {
                closestDist = dist;
                closest = {
                    id,
                    def: inst.def,
                    dist,
                    markerType: markerType || '!',
                    prompt: this.buildPrompt(inst.def)
                };
            }
        }

        this.nearbyNpc = closest;
        return closest;
    }

    getMarkerType(def, playerState) {
        const inv = playerState.gameInventory;
        const coins = playerState.coins ?? 0;

        if (def.merchantId === 'fish_buyer') {
            const hasFish = inv?.slots?.some(s => s?.itemId && s.quantity > 0 && s.category === 'fish' && s.npcValue > 0);
            return hasFish ? '!' : '?';
        }
        if (def.merchantId === 'supply_merchant') {
            const upgrade = inv?.nextUpgrade;
            if (upgrade && coins >= upgrade.cost) return '!';
            if (upgrade) return '?';
        }
        return '?';
    }

    buildPrompt(def) {
        const name = def.merchantId === 'fish_buyer' ? 'Old Salty' : 'Copper Clive';
        return `Press E to talk to ${name}`;
    }

    /** Billboard markers + gentle sign bob (matches floating_title signs) */
    updateMarkers(camera) {
        if (!camera) return;
        const t = performance.now() * 0.001;
        for (const { marker, signSprite } of this.instances.values()) {
            if (marker?.visible) {
                marker.quaternion.copy(camera.quaternion);
            }
            if (signSprite?.userData?.baseY != null) {
                signSprite.position.y = signSprite.userData.baseY + Math.sin(t * 1.8) * 0.08;
            }
        }
    }

    getNearby() {
        return this.nearbyNpc;
    }
}
