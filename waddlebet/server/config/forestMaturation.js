/**
 * Passive forest maturation — trees grow when the forest is quiet.
 * Keep in sync with ForestTreeService.
 */

export const FOREST_MATURATION = {
    /** No maturation until this long without any chop activity. */
    QUIET_BEFORE_MS: 15 * 60 * 1000,
    /** After this long, every ready tree becomes elder. */
    FULL_FOREST_QUIET_MS: 90 * 60 * 1000,
    /** Per-tick chance a sub-elder tree advances one stage (scaled by quiet time). */
    BASE_ADVANCE_CHANCE: 0.04,
};

export default FOREST_MATURATION;
