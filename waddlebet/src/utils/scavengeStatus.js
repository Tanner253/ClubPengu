/**
 * Format seconds as H:MM:SS or M:SS for scavenge cooldown UI.
 */
export function formatScavengeCountdown(totalSeconds) {
    const safe = Math.max(0, Math.ceil(totalSeconds || 0));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function getScavengeRemainingMs(cooldownEndsAt, now = Date.now()) {
    if (!cooldownEndsAt) return 0;
    return Math.max(0, cooldownEndsAt - now);
}

export function getScavengeSpotPrompt(spotId, { isMobile = false } = {}) {
    if (typeof spotId === 'string' && spotId.startsWith('town_trash_')) {
        return isMobile
            ? 'Tap to search trash (10% for 10g, 1hr per can)'
            : 'Press E to search trash (10% chance for 10g, once per hour per can)';
    }
    return isMobile
        ? 'Tap to search trash (+50g, 1hr cooldown)'
        : 'Press E to search trash (+50g, once per hour)';
}
