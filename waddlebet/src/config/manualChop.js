/**
 * Manual voxel tree chopping — keep in sync with server/config/manualChop.js
 */

export const MANUAL_CHOP = {
    VOXEL: 0.055,
    TRUNK_RADIUS: 0.35,
    STUMP_H: 0.6,
    CUT_H: 0.7,
    UPPER_H: 3.2,
    /** Smaller per-hit notch — tree needs many swings (sync with server). */
    CUT_PER_HIT: 0.028,
    MIN_HIT_SPEED: 1.2,
    HIT_COOLDOWN_MS: 130,
    FALL_TOTAL_CUT: 2.05,
    FALL_BRIDGE: 0.85,
    MIN_HITS_BEFORE_FALL: 36,
    MIN_CUT_PER_SIDE: 0.48,
    /** Keep player this far from trunk center for first-person chop framing. */
    STAND_DISTANCE: 2.85,
    /** Solid collision ring — slightly smaller than stand distance. */
    COLLISION_RADIUS: 2.35,
    /** First-person chop view — eye height above feet (matches third-person head target). */
    CAMERA_EYE_HEIGHT: 1.12,
    /** Nudge camera from body center toward the tree (in front of the face). */
    CAMERA_EYE_FORWARD: 0.28,
    /** Aim slightly below eye line at the cut belt on the trunk. */
    CAMERA_LOOK_DOWN: 0.14,
    /** How quickly the chop camera snaps in (higher = faster). */
    CAMERA_LERP_SPEED: 16,
};

export const STAGE_TREE_SCALE = {
    sapling: 0.98,
    baby: 1.12,
    mature: 1.28,
    elder: 1.42,
};

export const MANUAL_CHOP_CAMERA = {
    eyeHeight: MANUAL_CHOP.CAMERA_EYE_HEIGHT,
    eyeForward: MANUAL_CHOP.CAMERA_EYE_FORWARD,
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

export function hashTreeSeed(id = '') {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h || 1;
}

export function getManualChopStandDistance(stage = 'mature') {
    return MANUAL_CHOP.STAND_DISTANCE * (STAGE_TREE_SCALE[stage] || 1);
}

export function getManualChopCollisionRadius(stage = 'mature') {
    return MANUAL_CHOP.COLLISION_RADIUS * (STAGE_TREE_SCALE[stage] || 1);
}

export function snapPlayerToChopRing(treeX, treeZ, playerX, playerZ, standDistance) {
    const dx = playerX - treeX;
    const dz = playerZ - treeZ;
    const len = Math.hypot(dx, dz) || 1;
    const x = treeX + (dx / len) * standDistance;
    const z = treeZ + (dz / len) * standDistance;
    return {
        x,
        z,
        rotationY: Math.atan2(treeX - x, treeZ - z)
    };
}

export function createTreeRng(id) {
    let s = hashTreeSeed(id);
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}
