/** Resolve playtime fields from daily bonus status (supports 30s dev test mode). */
export function getDailyBonusRequiredSeconds(status) {
    if (!status) return 60 * 60;
    return status.requiredSeconds ?? (status.requiredMinutes ?? 60) * 60;
}

export function getDailyBonusSessionSeconds(status) {
    if (!status) return 0;
    return status.sessionSeconds ?? (status.sessionMinutes ?? 0) * 60;
}

export function formatDailyBonusPlaytime(totalSeconds) {
    const safe = Math.max(0, totalSeconds ?? 0);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
