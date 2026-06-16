/**
 * Server-side wood loot rolls for forest chopping.
 */

import { getWoodByTier, getGameItem } from './gameItems.js';

/**
 * Roll a wood log for the given chop spot tier.
 * @param {number} tier
 * @returns {{ id: string, name: string, emoji: string, tier: number, npcValue: number } | null}
 */
export function rollWoodAtTier(tier) {
    let pool = getWoodByTier(tier);
    for (let t = tier; t >= 1 && pool.length === 0; t--) {
        pool = getWoodByTier(t);
    }
    if (pool.length === 0) return null;

    const pick = pool[Math.floor(Math.random() * pool.length)];
    return {
        id: pick.id,
        name: pick.name,
        emoji: pick.emoji,
        tier: pick.tier,
        npcValue: pick.npcValue
    };
}

export function isValidWoodReward(woodData) {
    if (!woodData?.id) return false;
    const item = getGameItem(woodData.id);
    return item?.category === 'wood';
}

export default { rollWoodAtTier, isValidWoodReward };
