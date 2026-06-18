/**
 * Dynamic ! / ? markers for the world compass — onboarding steps & daily NPC orders.
 */

import { CENTER_X, CENTER_Z } from '../config/roomConfig';
import { getWorldNpc } from '../config/worldNpcs';
import { getTravelNpc } from '../config/travelNpcs';
import { TOWN_TRASH_CANS } from '../config/scavenge';

/** @typedef {{ id: string, symbol: '!' | '?', x: number, z: number, color?: string, priority?: number }} CompassQuestMarker */

const C = CENTER_X;

/** First ferry NPC in `fromRoom` toward `toRoom`. */
const TRANSIT_NPC = {
    town: {
        snow_forts: 'skipper_town_hub',
        forest_trails: 'skipper_town_hub',
    },
    snow_forts: {
        town: 'skipper_snow_west',
        forest_trails: 'skipper_snow_south',
    },
    forest_trails: {
        town: 'skipper_forest_north',
        snow_forts: 'skipper_forest_north',
    },
};

const QUEST_COLORS = {
    '?': '#facc15',
    '!': '#4ade80',
};

const SNOW_FORTS_FISHING = { x: 40, z: 40 };
const FOREST_CHOP_AREA = { x: 125, z: 70 };

function worldNpcCoords(npcId) {
    const npc = getWorldNpc(npcId);
    if (!npc) return null;
    return {
        room: npc.room || 'town',
        x: CENTER_X + npc.offsetX,
        z: CENTER_Z + npc.offsetZ,
    };
}

function travelNpcCoords(npcId) {
    const npc = getTravelNpc(npcId);
    if (!npc) return null;
    return { room: npc.room, x: npc.x, z: npc.z };
}

function makeMarker(id, symbol, x, z, priority = 5) {
    return {
        id,
        symbol,
        x,
        z,
        color: QUEST_COLORS[symbol],
        priority,
    };
}

function getTransitMarker(currentRoom, targetRoom, idSuffix, priority = 8) {
    if (!currentRoom || !targetRoom || currentRoom === targetRoom) return null;
    const npcId = TRANSIT_NPC[currentRoom]?.[targetRoom];
    if (!npcId) return null;
    const coords = travelNpcCoords(npcId);
    if (!coords || coords.room !== currentRoom) return null;
    return makeMarker(`transit-${idSuffix}`, '?', coords.x, coords.z, priority);
}

function markerInRoom(currentRoom, targetRoom, x, z, id, symbol, priority) {
    if (currentRoom !== targetRoom) return null;
    return makeMarker(id, symbol, x, z, priority);
}

function resolveRoomMarker(currentRoom, targetRoom, x, z, id, symbol, priority) {
    const direct = markerInRoom(currentRoom, targetRoom, x, z, id, symbol, priority);
    if (direct) return direct;
    return getTransitMarker(currentRoom, targetRoom, id, priority);
}

function hasSellableFish(gameInventory) {
    return gameInventory?.slots?.some(
        (s) => s?.itemId && s.quantity > 0 && s.category === 'fish' && s.npcValue > 0
    ) ?? false;
}

function canAffordBackpackUpgrade(gameInventory, coins = 0) {
    const upgrade = gameInventory?.nextUpgrade;
    if (!upgrade) return false;
    if (upgrade.woodRequired) {
        const counts = {};
        for (const slot of gameInventory?.slots || []) {
            if (!slot?.itemId || !slot.quantity) continue;
            counts[slot.itemId] = (counts[slot.itemId] || 0) + slot.quantity;
        }
        for (const [itemId, qty] of Object.entries(upgrade.woodRequired)) {
            if ((counts[itemId] || 0) < qty) return false;
        }
        return true;
    }
    if (upgrade.cost > 0) return coins >= upgrade.cost;
    return true;
}

function findNearestTrashCan(playerPos) {
    let best = TOWN_TRASH_CANS[0];
    let bestDist = Infinity;
    for (const can of TOWN_TRASH_CANS) {
        const dx = playerPos.x - can.localX;
        const dz = playerPos.z - can.localZ;
        const dist = dx * dx + dz * dz;
        if (dist < bestDist) {
            bestDist = dist;
            best = can;
        }
    }
    return { x: best.localX, z: best.localZ };
}

function countFishInPack(gameInventory) {
    if (!gameInventory?.slots) return 0;
    return gameInventory.slots.reduce((sum, slot) => {
        if (!slot?.itemId || !slot.quantity || slot.category !== 'fish') return sum;
        return sum + slot.quantity;
    }, 0);
}

function countWoodInPack(gameInventory) {
    const counts = { pine_log: 0, birch_log: 0, oak_log: 0, ironwood_log: 0 };
    for (const slot of gameInventory?.slots || []) {
        if (!slot?.itemId || !slot.quantity) continue;
        if (counts[slot.itemId] != null) counts[slot.itemId] += slot.quantity;
    }
    return counts;
}

function isDailyOrderReady(order, gameInventory) {
    if (!order?.accepted || order.completed) return false;
    if (order.requirementType === 'items_mixed' && order.items?.length) {
        const wood = countWoodInPack(gameInventory);
        return order.items.every((entry) => (wood[entry.itemId] ?? 0) >= entry.quantity);
    }
    const required = order.required ?? 1;
    if (order.questId === 'salty_daily_catch' && order.requirementType === 'fish_any') {
        return countFishInPack(gameInventory) >= required;
    }
    return (order.have ?? 0) >= required;
}

function getOnboardingMarker(stepId, currentRoom, ctx) {
    switch (stepId) {
        case 'dojo_gold':
            return resolveRoomMarker(
                currentRoom,
                'town',
                C,
                C + 62,
                'onb-dojo',
                '?',
                2
            );
        case 'ferry_snow_forts':
            return getTransitMarker(currentRoom, 'snow_forts', 'onb-snow-forts', 3)
                || markerInRoom(currentRoom, 'snow_forts', SNOW_FORTS_FISHING.x, SNOW_FORTS_FISHING.z, 'onb-arrived-sf', '?', 4);
        case 'catch_fish':
            return resolveRoomMarker(
                currentRoom,
                'snow_forts',
                SNOW_FORTS_FISHING.x,
                SNOW_FORTS_FISHING.z,
                'onb-fish',
                '?',
                2
            );
        case 'sell_fish': {
            const salty = worldNpcCoords('old_salty');
            if (!salty) return null;
            const symbol = hasSellableFish(ctx.gameInventory) ? '!' : '?';
            return resolveRoomMarker(currentRoom, salty.room, salty.x, salty.z, 'onb-sell-fish', symbol, 1);
        }
        case 'ferry_forest':
            return getTransitMarker(currentRoom, 'forest_trails', 'onb-forest', 3)
                || markerInRoom(currentRoom, 'forest_trails', FOREST_CHOP_AREA.x, FOREST_CHOP_AREA.z, 'onb-arrived-forest', '?', 4);
        case 'chop_wood':
            return resolveRoomMarker(
                currentRoom,
                'forest_trails',
                FOREST_CHOP_AREA.x,
                FOREST_CHOP_AREA.z,
                'onb-chop',
                '?',
                2
            );
        case 'ferry_town':
            return getTransitMarker(currentRoom, 'town', 'onb-town', 3);
        case 'upgrade_backpack': {
            const clive = worldNpcCoords('copper_clive');
            if (!clive) return null;
            const symbol = canAffordBackpackUpgrade(ctx.gameInventory, ctx.coins) ? '!' : '?';
            return resolveRoomMarker(currentRoom, clive.room, clive.x, clive.z, 'onb-upgrade', symbol, 1);
        }
        case 'search_trash': {
            const trash = findNearestTrashCan(ctx.position);
            return markerInRoom(currentRoom, 'town', trash.x, trash.z, 'onb-trash', '?', 2);
        }
        default:
            return null;
    }
}

function getDailyOrderMarkers(currentRoom, order, gameInventory) {
    const npcId = order.questId === 'salty_daily_catch' ? 'old_salty' : 'copper_clive';
    const npc = worldNpcCoords(npcId);
    if (!npc) return [];

    if (!order.accepted) {
        const marker = resolveRoomMarker(
            currentRoom,
            npc.room,
            npc.x,
            npc.z,
            `daily-${order.questId}-accept`,
            '!',
            2
        );
        return marker ? [marker] : [];
    }

    if (order.completed) return [];

    const ready = isDailyOrderReady(order, gameInventory);
    if (ready) {
        const marker = resolveRoomMarker(
            currentRoom,
            npc.room,
            npc.x,
            npc.z,
            `daily-${order.questId}-turnin`,
            '!',
            0
        );
        return marker ? [marker] : [];
    }

    if (order.questId === 'salty_daily_catch') {
        const marker = resolveRoomMarker(
            currentRoom,
            'snow_forts',
            SNOW_FORTS_FISHING.x,
            SNOW_FORTS_FISHING.z,
            'daily-fish',
            '?',
            4
        );
        return marker ? [marker] : [];
    }

    if (order.questId === 'clive_daily_timber') {
        const marker = resolveRoomMarker(
            currentRoom,
            'forest_trails',
            FOREST_CHOP_AREA.x,
            FOREST_CHOP_AREA.z,
            'daily-wood',
            '?',
            4
        );
        return marker ? [marker] : [];
    }

    return [];
}

function dedupeMarkers(markers) {
    const sorted = [...markers].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
    const seen = new Map();
    for (const marker of sorted) {
        const key = `${marker.x.toFixed(0)},${marker.z.toFixed(0)},${marker.symbol}`;
        if (!seen.has(key)) seen.set(key, marker);
    }
    return [...seen.values()];
}

/**
 * @param {{
 *   room?: string,
 *   position?: { x: number, z: number },
 *   isAuthenticated?: boolean,
 *   onboardingQuest?: object | null,
 *   dailyQuestStatus?: object | null,
 *   gameInventory?: object | null,
 *   coins?: number,
 * }} ctx
 * @returns {CompassQuestMarker[]}
 */
export function getCompassQuestMarkers(ctx) {
    const {
        room,
        position = { x: 0, z: 0 },
        isAuthenticated,
        onboardingQuest,
        dailyQuestStatus,
        gameInventory,
        coins = 0,
    } = ctx;

    if (!isAuthenticated || !room || room.startsWith('travel:') || room.startsWith('igloo')) {
        return [];
    }

    const markers = [];
    const questCtx = { gameInventory, coins, position };

    if (onboardingQuest && !onboardingQuest.rewardClaimed && onboardingQuest.steps) {
        const nextStep = onboardingQuest.steps.find((s) => !s.completed);
        if (nextStep) {
            const marker = getOnboardingMarker(nextStep.id, room, questCtx);
            if (marker) markers.push(marker);
        }
    } else if (dailyQuestStatus?.orders?.length) {
        for (const order of dailyQuestStatus.orders) {
            if (order.completed) continue;
            markers.push(...getDailyOrderMarkers(room, order, gameInventory));
        }
    }

    return dedupeMarkers(markers);
}

export default getCompassQuestMarkers;
