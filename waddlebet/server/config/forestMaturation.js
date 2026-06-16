/**
 * Forest tree stage growth — ready trees advance sapling → baby → mature → elder over time.
 * Respawn timers after chop live in harvestableTrees.js (unchanged).
 */

export const FOREST_MATURATION = {
    /** Ms a ready tree spends at each stage before advancing to the next. */
    STAGE_GROWTH_MS: {
        sapling: 2 * 60 * 1000,
        baby: 4 * 60 * 1000,
        mature: 8 * 60 * 1000,
    },
};

export default FOREST_MATURATION;
