/**
 * WorldDropService — server-authoritative dropped inventory items in the world.
 * Items despawn after WORLD_DROP_DESPAWN_MS if not picked up.
 */

import {
    WORLD_DROP_DESPAWN_MS,
    WORLD_DROP_PICKUP_RADIUS,
    WORLD_DROP_FORWARD_OFFSET
} from '../config/worldDrops.js';
import { getGameItem } from '../config/gameItems.js';

class WorldDropService {
    constructor() {
        /** @type {Map<string, Map<string, object>>} */
        this.dropsByRoom = new Map();
        this._nextId = 1;
    }

    _roomMap(roomId) {
        if (!this.dropsByRoom.has(roomId)) {
            this.dropsByRoom.set(roomId, new Map());
        }
        return this.dropsByRoom.get(roomId);
    }

    /**
     * @param {{ x: number, y?: number, z: number }} playerPos
     * @param {number} [rotation=0]
     */
    computeDropPosition(playerPos, rotation = 0) {
        const sin = Math.sin(rotation || 0);
        const cos = Math.cos(rotation || 0);
        return {
            x: playerPos.x + sin * WORLD_DROP_FORWARD_OFFSET,
            y: playerPos.y ?? 0,
            z: playerPos.z + cos * WORLD_DROP_FORWARD_OFFSET
        };
    }

    toPublic(drop) {
        const def = getGameItem(drop.itemId);
        return {
            id: drop.id,
            x: drop.x,
            y: drop.y,
            z: drop.z,
            itemId: drop.itemId,
            quantity: drop.quantity,
            metadata: drop.metadata || {},
            maxStack: def?.maxStack ?? null,
            expiresAt: drop.expiresAt
        };
    }

    getSnapshot(roomId) {
        this.purgeExpired(roomId);
        return [...this._roomMap(roomId).values()].map(d => this.toPublic(d));
    }

    createDrop(roomId, item, playerPos, rotation, droppedBy = null) {
        const pos = this.computeDropPosition(playerPos, rotation);
        const id = `wd_${this._nextId++}`;
        const now = Date.now();
        const drop = {
            id,
            room: roomId,
            x: pos.x,
            y: pos.y,
            z: pos.z,
            itemId: item.itemId,
            quantity: item.quantity,
            metadata: { ...(item.metadata || {}) },
            droppedBy,
            createdAt: now,
            expiresAt: now + WORLD_DROP_DESPAWN_MS
        };
        this._roomMap(roomId).set(id, drop);
        return drop;
    }

    restoreDrop(drop) {
        if (!drop?.id || !drop.room) return null;
        this._roomMap(drop.room).set(drop.id, { ...drop });
        return drop;
    }

    removeDrop(roomId, dropId) {
        return this._roomMap(roomId).delete(dropId);
    }

    getDrop(roomId, dropId) {
        return this._roomMap(roomId).get(dropId) || null;
    }

    /**
     * Validate pickup without removing the drop from the world.
     * @param {string} dropId
     * @param {string} roomId
     * @param {{ x: number, z: number }} playerPos
     */
    validatePickup(dropId, roomId, playerPos) {
        this.purgeExpired(roomId);
        const drop = this._roomMap(roomId).get(dropId);
        if (!drop) return { error: 'NOT_FOUND', message: 'That item is no longer here.' };
        if (Date.now() >= drop.expiresAt) {
            this.removeDrop(roomId, dropId);
            return { error: 'EXPIRED', message: 'That item has despawned.' };
        }

        const dx = playerPos.x - drop.x;
        const dz = playerPos.z - drop.z;
        if (Math.sqrt(dx * dx + dz * dz) > WORLD_DROP_PICKUP_RADIUS) {
            return { error: 'TOO_FAR', message: 'Move closer to pick up the item.' };
        }

        return { success: true, drop: { ...drop } };
    }

    /**
     * @param {string} dropId
     * @param {string} roomId
     * @param {{ x: number, z: number }} playerPos
     */
    tryPickup(dropId, roomId, playerPos) {
        const validated = this.validatePickup(dropId, roomId, playerPos);
        if (validated.error) return validated;

        this.removeDrop(roomId, dropId);
        return { success: true, drop: validated.drop };
    }

    /**
     * Remove expired drops. When roomId is omitted, all rooms are scanned.
     * @returns {{ room: string, dropId: string }[]}
     */
    purgeExpired(roomId = null) {
        const now = Date.now();
        const removed = [];
        const rooms = roomId ? [roomId] : [...this.dropsByRoom.keys()];

        for (const room of rooms) {
            for (const [id, drop] of this._roomMap(room)) {
                if (now >= drop.expiresAt) {
                    this._roomMap(room).delete(id);
                    removed.push({ room, dropId: id });
                }
            }
        }
        return removed;
    }
}

export default WorldDropService;
