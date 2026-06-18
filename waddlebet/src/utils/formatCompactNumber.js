/**
 * Compact number display for HUD chips (6876829 → 6.9M).
 * Full value is shown in title/tooltip via toLocaleString().
 */
export function formatCompactNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';

    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';

    if (abs < 10_000) {
        return sign + abs.toLocaleString('en-US');
    }
    if (abs < 1_000_000) {
        const scaled = abs / 1_000;
        const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
        return `${sign}${scaled.toFixed(digits).replace(/\.0+$/, '')}K`;
    }
    if (abs < 1_000_000_000) {
        const scaled = abs / 1_000_000;
        const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
        return `${sign}${scaled.toFixed(digits).replace(/\.0+$/, '')}M`;
    }
    const scaled = abs / 1_000_000_000;
    const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
    return `${sign}${scaled.toFixed(digits).replace(/\.0+$/, '')}B`;
}

export function formatFullNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    return n.toLocaleString('en-US');
}
