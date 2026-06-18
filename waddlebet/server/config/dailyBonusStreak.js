/**
 * 7-day login streak — $CP escalates 1k→5k on CP days; days 3 & 6 are gold-only.
 * Keep in sync with src/config/dailyBonusStreak.js
 *
 * CP days: 1 (1k), 2 (2k), 4 (3k), 5 (4k), 7 (5k)
 * Gold days: 3 (+5g), 6 (+10g) — no $CP those days
 */

/** @typedef {{ day: number, cp: number, gold: number, label?: string }} StreakDayReward */

/** @type {StreakDayReward[]} */
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

export function getUtcDayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

/** Whole UTC calendar days between two YYYY-MM-DD keys. */
export function utcDayDiff(fromDay, toDay) {
    if (!fromDay || !toDay) return 999;
    const a = Date.parse(`${fromDay}T00:00:00.000Z`);
    const b = Date.parse(`${toDay}T00:00:00.000Z`);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 999;
    return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/**
 * Next streak day after a successful claim.
 * @param {number} currentStreakDay 1–7 from last completed claim
 * @param {string|null} lastStreakUtcDay YYYY-MM-DD of last streak claim
 * @param {string} todayUtcDay
 */
export function resolveNextStreakDay(currentStreakDay = 0, lastStreakUtcDay = null, todayUtcDay = getUtcDayKey()) {
    if (!lastStreakUtcDay || !currentStreakDay) return 1;
    const gap = utcDayDiff(lastStreakUtcDay, todayUtcDay);
    if (gap <= 0) return Math.max(1, currentStreakDay);
    if (gap === 1) {
        if (currentStreakDay >= STREAK_LENGTH) return 1;
        return currentStreakDay + 1;
    }
    return 1;
}

export default DAILY_STREAK_REWARDS;
