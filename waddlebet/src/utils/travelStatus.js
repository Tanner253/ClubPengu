/** Shared ferry route status labels (client). */

export function formatTravelCountdown(phaseEndsAt, now = Date.now()) {
    if (!phaseEndsAt) return '--:--';
    const sec = Math.max(0, Math.ceil((phaseEndsAt - now) / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

/** e.g. 90 → "01m 30s" */
export function formatTravelEta(seconds) {
    const sec = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

/**
 * @param {object} routeStatus
 * @param {number} [now]
 */
export function getTravelRouteStatusLabel(routeStatus, now = Date.now()) {
    if (!routeStatus) return '';
    if (routeStatus.status === 'boarding') {
        const cd = formatTravelCountdown(routeStatus.phaseEndsAt, now);
        const pax = routeStatus.passengerCount ?? 0;
        return `(boarding · ${cd}${pax ? ` · ${pax} aboard` : ''})`;
    }
    if (routeStatus.status === 'in_transit') {
        const etaSec = routeStatus.etaSeconds
            ?? Math.max(0, Math.ceil(((routeStatus.phaseEndsAt || 0) - now) / 1000));
        return `(unavailable — in route est. ${formatTravelEta(etaSec)})`;
    }
    return '(available)';
}
