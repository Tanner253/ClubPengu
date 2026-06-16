/** Default audio levels (0–1 gain). */
export const DEFAULT_MUSIC_VOLUME = 0.35;
export const DEFAULT_SFX_VOLUME = 0.55;

/** Accept 0–1 gain or legacy 0–100 percent values. */
export function normalizeMusicVolume(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_MUSIC_VOLUME;
    const gain = value > 1 ? value / 100 : value;
    return Math.max(0, Math.min(1, gain));
}
