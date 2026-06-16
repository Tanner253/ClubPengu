/** World item drops — client-side interaction radii (mirrors server/config/worldDrops.js). */

export const WORLD_DROP_PICKUP_RADIUS = 2.5;

export const WORLD_DROP_DESPAWN_MS = 5 * 60 * 1000;

export const GOLD_BAG_ITEM_ID = 'gold_bag';

export const MIN_GOLD_DROP = 1;

export const MAX_GOLD_DROP = 999_999;

export function isGoldWorldDrop(drop) {
    if (!drop) return false;
    return drop.itemId === GOLD_BAG_ITEM_ID || drop.metadata?.category === 'gold';
}
