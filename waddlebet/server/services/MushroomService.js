/**
 * MushroomService — server-authoritative forest mushroom harvest & slow regrowth.
 */

import {
    HARVESTABLE_MUSHROOMS,
    getHarvestableMushroom,
    MUSHROOM_RESPAWN_MS
} from '../config/harvestableMushrooms.js';

class MushroomService {
    constructor() {
        /** @type {Map<string, { id: string, localX: number, localZ: number, state: string, regrowAt: number | null }>} */
        this.mushrooms = new Map();
        for (const def of HARVESTABLE_MUSHROOMS) {
            this.mushrooms.set(def.id, {
                id: def.id,
                localX: def.localX,
                localZ: def.localZ,
                state: 'ready',
                regrowAt: null,
            });
        }
    }

    getSnapshot() {
        this.tickRegrowth();
        return [...this.mushrooms.values()].map(m => ({
            id: m.id,
            localX: m.localX,
            localZ: m.localZ,
            state: m.state,
            regrowAt: m.regrowAt,
        }));
    }

    getPublicState(id) {
        const m = this.mushrooms.get(id);
        if (!m) return null;
        if (m.state === 'harvested' && m.regrowAt && Date.now() >= m.regrowAt) {
            m.state = 'ready';
            m.regrowAt = null;
        }
        return {
            id: m.id,
            localX: m.localX,
            localZ: m.localZ,
            state: m.state,
            regrowAt: m.regrowAt,
        };
    }

    tickRegrowth() {
        const now = Date.now();
        const regrown = [];
        for (const [id, m] of this.mushrooms) {
            if (m.state === 'harvested' && m.regrowAt && now >= m.regrowAt) {
                m.state = 'ready';
                m.regrowAt = null;
                regrown.push(id);
            }
        }
        return regrown;
    }

    /**
     * @param {string} mushroomId
     * @param {{ x: number, z: number }} playerPos
     */
    tryHarvest(mushroomId, playerPos) {
        const def = getHarvestableMushroom(mushroomId);
        const m = this.mushrooms.get(mushroomId);
        if (!def || !m) return { error: 'UNKNOWN_MUSHROOM' };

        if (m.state === 'harvested') {
            const waitMs = m.regrowAt ? Math.max(0, m.regrowAt - Date.now()) : MUSHROOM_RESPAWN_MS;
            return {
                error: 'NOT_READY',
                message: 'These mushrooms need more time to grow back.',
                regrowAt: m.regrowAt,
                waitSeconds: Math.ceil(waitMs / 1000),
            };
        }

        const dx = playerPos.x - def.localX;
        const dz = playerPos.z - def.localZ;
        if (Math.sqrt(dx * dx + dz * dz) > 2.8) {
            return { error: 'TOO_FAR', message: 'Move closer to the mushroom cluster.' };
        }

        m.state = 'harvested';
        m.regrowAt = Date.now() + MUSHROOM_RESPAWN_MS;

        return {
            success: true,
            mushroomId,
            itemId: 'forest_mushroom',
            quantity: 1,
            mushroom: this.getPublicState(mushroomId),
        };
    }

    rollbackHarvest(mushroomId) {
        const m = this.mushrooms.get(mushroomId);
        if (!m) return null;
        m.state = 'ready';
        m.regrowAt = null;
        return this.getPublicState(mushroomId);
    }
}

export default MushroomService;
