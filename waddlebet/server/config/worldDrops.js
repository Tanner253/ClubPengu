/** World item drops — despawn timing and interaction radii (server-authoritative). */

import { MAX_WAGER_GOLD } from './goldEconomy.js';

export const WORLD_DROP_DESPAWN_MS = 5 * 60 * 1000;

/** Horizontal distance from player to pick up a drop. */
export const WORLD_DROP_PICKUP_RADIUS = 2.5;

/** How far in front of the player (along facing) dropped items appear. */
export const WORLD_DROP_FORWARD_OFFSET = 1.2;

/** Inventory item id used for coin piles dropped in the world. */
export const GOLD_BAG_ITEM_ID = 'gold_bag';

export const MIN_GOLD_DROP = 1;

/** Cap world gold transfers to scarce-economy band. */
export const MAX_GOLD_DROP = MAX_WAGER_GOLD;

export function isGoldWorldDrop(drop) {
    if (!drop) return false;
    return drop.itemId === GOLD_BAG_ITEM_ID || drop.metadata?.category === 'gold';
}
