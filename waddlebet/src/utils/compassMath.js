/**
 * Compass helpers — world +X = East, +Z = South, heading 0° = North.
 */

/** Player yaw (radians) → compass heading degrees (0 = N, 90 = E, 180 = S, 270 = W). */
export function yawToHeadingDegrees(yawRad) {
    const deg = (Math.atan2(Math.sin(yawRad), -Math.cos(yawRad)) * 180) / Math.PI;
    return ((deg % 360) + 360) % 360;
}

/** Bearing from (fromX, fromZ) to (toX, toZ), degrees clockwise from north. */
export function bearingBetween(fromX, fromZ, toX, toZ) {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const deg = (Math.atan2(dx, -dz) * 180) / Math.PI;
    return ((deg % 360) + 360) % 360;
}

/** Signed shortest difference a - b in degrees (−180..180). */
export function angleDeltaDegrees(a, b) {
    let d = a - b;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
}

export function distanceXZ(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dz * dz);
}
