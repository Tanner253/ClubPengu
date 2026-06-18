/**
 * Client copy — keep in sync with server/config/dailyBonusStreak.js
 */

export const DAILY_STREAK_REWARDS = [
    { day: 1, cp: 1000, gold: 0, label: 'Day 1' },
    { day: 2, cp: 2000, gold: 0, label: 'Day 2' },
    { day: 3, cp: 0, gold: 5, label: 'Day 3 · Gold' },
    { day: 4, cp: 3000, gold: 0, label: 'Day 4' },
    { day: 5, cp: 4000, gold: 0, label: 'Day 5' },
    { day: 6, cp: 0, gold: 10, label: 'Day 6 · Gold' },
    { day: 7, cp: 5000, gold: 0, label: 'Day 7 · Jackpot' },
];

export const STREAK_LENGTH = DAILY_STREAK_REWARDS.length;

export function getStreakReward(streakDay = 1) {
    const idx = Math.max(1, Math.min(STREAK_LENGTH, Math.floor(streakDay))) - 1;
    return DAILY_STREAK_REWARDS[idx] || DAILY_STREAK_REWARDS[0];
}

export default DAILY_STREAK_REWARDS;
