/**
 * Client copy of NPC daily order labels — keep questIds in sync with server/config/npcOrders.js
 */

export const DAILY_SPEND_HINTS = [
    'Forage worms from mossy logs, spend gold on ferries & wagers.',
    'Deposit SOL for Pebbles → Casino gacha & cosmetic marketplace.',
    'Rent an igloo with $CP to host friends.',
    'Sell extra fish & wood to NPCs — daily orders pay a small bonus.',
];

export function getDailySpendHint() {
    const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    return DAILY_SPEND_HINTS[dayIndex % DAILY_SPEND_HINTS.length];
}

export default DAILY_SPEND_HINTS;
