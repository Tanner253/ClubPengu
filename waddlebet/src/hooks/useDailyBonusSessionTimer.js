import { useState, useEffect, useRef } from 'react';
import {
    getDailyBonusRequiredSeconds,
    getDailyBonusSessionSeconds,
} from '../utils/dailyBonusDisplay.js';

/**
 * Live playtime counter for daily bonus — ticks locally between server polls
 * without resetting backward when the modal reopens or status refreshes.
 */
export function useDailyBonusSessionTimer(dailyBonusStatus, { enabled = true } = {}) {
    const [displaySeconds, setDisplaySeconds] = useState(0);
    const anchorRef = useRef(0);
    const requiredSeconds = getDailyBonusRequiredSeconds(dailyBonusStatus);

    useEffect(() => {
        if (!enabled || !dailyBonusStatus) return;

        const serverSeconds = getDailyBonusSessionSeconds(dailyBonusStatus);
        // Large drop = claim reset; small drift = keep local progress between polls
        if (serverSeconds === 0 || serverSeconds + 10 < anchorRef.current) {
            anchorRef.current = serverSeconds;
        } else {
            anchorRef.current = Math.max(anchorRef.current, serverSeconds);
        }
        setDisplaySeconds(anchorRef.current);
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
            anchorRef.current += 1;
            setDisplaySeconds(anchorRef.current);
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
