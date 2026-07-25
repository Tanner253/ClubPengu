import { useState, useEffect } from 'react';
import {
    getDailyBonusRequiredSeconds,
    getDailyBonusSessionSeconds,
} from '../utils/dailyBonusDisplay.js';

/** Shared across DailyQuestHUD + DailyBonusModal so opening the panel does not reset progress. */
let sharedTimer = { anchor: 0, lastClaimAt: null };

/** @param {string|null|undefined} lastClaimAt */
export function resetDailyBonusSessionTimer(lastClaimAt = null) {
    sharedTimer = { anchor: 0, lastClaimAt: lastClaimAt ?? null };
}

/**
 * Live playtime counter for daily bonus — ticks locally between server polls
 * without resetting backward when the modal reopens or status refreshes.
 */
export function useDailyBonusSessionTimer(dailyBonusStatus, { enabled = true } = {}) {
    const [displaySeconds, setDisplaySeconds] = useState(() => sharedTimer.anchor);
    const requiredSeconds = getDailyBonusRequiredSeconds(dailyBonusStatus);

    useEffect(() => {
        if (!enabled || !dailyBonusStatus) return;

        const serverSeconds = getDailyBonusSessionSeconds(dailyBonusStatus);
        const claimAt = dailyBonusStatus.lastClaimAt ?? null;

        if (claimAt !== sharedTimer.lastClaimAt) {
            sharedTimer.lastClaimAt = claimAt;
            sharedTimer.anchor = serverSeconds;
        } else if (serverSeconds > 0 && serverSeconds + 10 < sharedTimer.anchor) {
            sharedTimer.anchor = serverSeconds;
        } else if (serverSeconds > sharedTimer.anchor) {
            sharedTimer.anchor = serverSeconds;
        }

        setDisplaySeconds(sharedTimer.anchor);
    }, [
        enabled,
        dailyBonusStatus?.sessionSeconds,
        dailyBonusStatus?.sessionMinutes,
        dailyBonusStatus?.receivedAt,
        dailyBonusStatus?.lastClaimAt,
    ]);

    useEffect(() => {
        if (!enabled || !dailyBonusStatus || dailyBonusStatus.hasEnoughTime) return;

        const interval = setInterval(() => {
            sharedTimer.anchor += 1;
            setDisplaySeconds(sharedTimer.anchor);
        }, 1000);

        return () => clearInterval(interval);
    }, [enabled, dailyBonusStatus?.hasEnoughTime]);

    const hasEnoughTime = dailyBonusStatus?.hasEnoughTime
        || displaySeconds >= requiredSeconds;

    return {
        sessionSeconds: displaySeconds,
        requiredSeconds,
        hasEnoughTime,
        progressPct: Math.min(100, (displaySeconds / Math.max(1, requiredSeconds)) * 100),
    };
}
