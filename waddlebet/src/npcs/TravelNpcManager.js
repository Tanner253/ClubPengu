/**
 * TravelNpcManager — ferry captain NPCs at overworld zone docks.
 */

import { getTravelNpcsForRoom, getNpcDisplayName, getRoutesForNpc } from '../config/travelNpcs';
import { buildWorldNpc } from './NpcStandBuilder';
import { attachNpcMarker, createNpcMarkerSprite, syncNpcMarkerToSign, updateNpcMarkerSymbol } from './NpcMarkerSprite';
import { animateBuildingBanner } from '../buildings/buildingBanner';

function formatTravelPrompt(def) {
    const routes = getRoutesForNpc(def);
    const names = routes.map((route) => route.name).join(', ');
    if (def.isHub && names) {
        return `Press E — ferry to ${names}`;
    }
    if (routes.length === 1) {
        return `Press E — ticket to ${routes[0].name} (${routes[0].ticketCost}g)`;
    }
    return `Press E to talk to ${getNpcDisplayName(def)}`;
}

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
            const marker = createNpcMarkerSprite(this.THREE, '?');
            marker.scale.set(2, 2, 1);
            marker.visible = true;
            attachNpcMarker(marker, group, penguin, signSprite);

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
                let markerSymbol = null;
                if (hasActiveFerry) {
                    markerSymbol = '!';
                } else if (dist >= radius) {
                    markerSymbol = '?';
                }
                updateNpcMarkerSymbol(inst.marker, markerSymbol);
            }

            if (dist < radius && dist < closestDist) {
                closestDist = dist;
                closest = {
                    id,
                    def: inst.def,
                    dist,
                    markerType: hasActiveFerry ? '!' : null,
                    prompt: formatTravelPrompt(inst.def),
                    routes: getRoutesForNpc(inst.def),
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
            if (signSprite) {
                animateBuildingBanner(signSprite, t);
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
