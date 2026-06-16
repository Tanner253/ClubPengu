/**
 * Manual voxel tree chopping — keep in sync with src/config/manualChop.js
 */

export const MANUAL_CHOP = {
    VOXEL: 0.055,
    TRUNK_RADIUS: 0.35,
    STUMP_H: 0.6,
    CUT_H: 0.7,
    UPPER_H: 3.2,
    CUT_PER_HIT: 0.028,
    MIN_HIT_SPEED: 1.2,
    HIT_COOLDOWN_MS: 130,
    FALL_TOTAL_CUT: 2.05,
    FALL_BRIDGE: 0.85,
    MIN_HITS_BEFORE_FALL: 36,
    MIN_CUT_PER_SIDE: 0.48,
};

export function shouldManualTreeFall(leftCut, rightCut, hitCount = 0) {
    if (hitCount < MANUAL_CHOP.MIN_HITS_BEFORE_FALL) return false;
    if (leftCut < MANUAL_CHOP.MIN_CUT_PER_SIDE || rightCut < MANUAL_CHOP.MIN_CUT_PER_SIDE) return false;
    const totalCut = leftCut + rightCut;
    if (totalCut >= MANUAL_CHOP.FALL_TOTAL_CUT) return true;
    const bridgeScore = Math.max(0, 1.35 - totalCut) * 8;
    return bridgeScore <= MANUAL_CHOP.FALL_BRIDGE;
}

export function computeCutAmount(speed = 2) {
    const intensity = Math.min(2, speed / 4);
    return MANUAL_CHOP.CUT_PER_HIT * (0.7 + intensity * 0.5);
}
