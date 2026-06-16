/**
 * Server-authoritative solo minigame gold rewards (client cannot choose amount).
 */

export const MINIGAME_REWARDS = {
    connect4: { base: 75, winBonus: 150, maxPerHour: 30, requiredRoom: null },
    card_jitsu: { base: 75, winBonus: 150, maxPerHour: 30, requiredRoom: 'dojo' },
};

/** Client may send legacy ids (e.g. card-jitsu). */
export function normalizeMinigameId(gameId) {
    if (gameId === 'card-jitsu') return 'card_jitsu';
    return gameId;
}

export function getMinigameReward(gameId, won = false) {
    const config = MINIGAME_REWARDS[normalizeMinigameId(gameId)];
    if (!config) return null;
    return won ? config.base + config.winBonus : config.base;
}

export function getMinigameRewardConfig(gameId) {
    return MINIGAME_REWARDS[normalizeMinigameId(gameId)] || null;
}

export default MINIGAME_REWARDS;
