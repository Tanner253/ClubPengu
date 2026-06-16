/**
 * TravelNpcManager — ferry captain NPCs at overworld zone docks.
 */

import { getTravelNpcsForRoom, getNpcDisplayName } from '../config/travelNpcs';
import { buildWorldNpc } from './NpcStandBuilder';
import { attachNpcMarker, createNpcMarkerSprite, syncNpcMarkerToSign, updateNpcMarkerSymbol } from './NpcMarkerSprite';

export default class TravelNpcManager {
    constructor(THREE) {
        this.THREE = THREE;
        this.collisionSystem = null;
        this.scene = null;
        this.buildPenguinMesh = null;
        this.instances = new Map();
        this.nearbyNpc = null;
        this.attachedRoom = null;
    }

    setCollisionSystem(collisionSystem) {
        this.collisionSystem = collisionSystem;
        for (const inst of this.instances.values()) {
            if (inst.colliderId != null) continue;
            inst.colliderId = this.registerStandCollision(inst.group);
        }
    }

    attachToRoom(scene, roomId, buildPenguinMesh, collisionSystem, propMeshes) {
        if (this.attachedRoom === roomId && this.scene === scene && this.instances.size > 0) {
            this.buildPenguinMesh = buildPenguinMesh;
            this.setCollisionSystem(collisionSystem);
            return;
        }

        this.detach();
        this.scene = scene;
        this.attachedRoom = roomId;
        this.buildPenguinMesh = buildPenguinMesh;
        this.collisionSystem = collisionSystem;

        for (const def of getTravelNpcsForRoom(roomId)) {
            const group = buildWorldNpc(this.THREE, buildPenguinMesh, def);
            group.position.set(def.x, 0, def.z);
            group.visible = true;
            group.userData.isStaticTownProp = true;
            group.userData.isTravelNpc = true;
            scene.add(group);

            const penguin = group.getObjectByName('npc_penguin');
            const signSprite = group.children[0]?.userData?.signSprite ?? null;
            const marker = createNpcMarkerSprite(this.THREE, null);
            marker.visible = false;
            attachNpcMarker(marker, group, penguin, signSprite);
            if (signSprite) signSprite.userData.baseY = signSprite.position.y;

            const colliderId = this.registerStandCollision(group);
            if (propMeshes && !propMeshes.includes(group)) propMeshes.push(group);

            this.instances.set(def.id, {
                group,
                def,
                marker,
                signSprite,
                colliderId,
                worldX: def.x,
                worldZ: def.z
            });
        }
    }

    detach() {
        for (const inst of this.instances.values()) {
            this.unregisterStandCollision(inst.colliderId);
        }
        this.instances.clear();
        this.nearbyNpc = null;
        this.scene = null;
        this.attachedRoom = null;
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

    checkProximity(playerPos, room, routeStatuses = []) {
        if (!this.attachedRoom || room !== this.attachedRoom || this.instances.size === 0) {
            this.nearbyNpc = null;
            return null;
        }

        let closest = null;
        let closestDist = Infinity;

        for (const [id, inst] of this.instances) {
            const dx = playerPos.x - inst.worldX;
            const dz = playerPos.z - inst.worldZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const radius = inst.def.interactionRadius || 6;
            const hasActiveFerry = inst.def.isHub
                ? routeStatuses.some(s => s.status === 'boarding')
                : routeStatuses.some(s => s.routeId === inst.def.routeId && s.status === 'boarding');

            if (inst.marker) {
                const inRange = dist < radius;
                updateNpcMarkerSymbol(inst.marker, inRange && hasActiveFerry ? '!' : null);
            }

            if (dist < radius && dist < closestDist) {
                closestDist = dist;
                closest = {
                    id,
                    def: inst.def,
                    dist,
                    markerType: hasActiveFerry ? '!' : null,
                    prompt: `Press E to talk to ${getNpcDisplayName(inst.def)}`
                };
            }
        }

        this.nearbyNpc = closest;
        return closest;
    }

    updateMarkers(camera) {
        if (!camera) return;
        const t = performance.now() * 0.001;
        for (const { marker, signSprite } of this.instances.values()) {
            if (marker?.visible) marker.quaternion.copy(camera.quaternion);
            if (signSprite?.userData?.baseY != null) {
                signSprite.position.y = signSprite.userData.baseY + Math.sin(t * 1.8) * 0.08;
            }
            if (marker?.userData?.anchor === 'sign' && signSprite) {
                syncNpcMarkerToSign(marker, signSprite);
            }
        }
    }

    getNearby() {
        return this.nearbyNpc;
    }
}
