/**
 * Asset Helper Functions - Utilities for generating voxel patterns
 */

/**
 * Generate a baseball cap voxel pattern
 * @param {string} color - Cap color
 * @param {boolean} reverse - Whether to reverse the bill direction
 * @returns {Array} Voxel array
 */
export const makeCap = (color, reverse = false) => {
    const v = [];
    for (let x = -4; x <= 4; x++) {
        for (let z = -4; z <= 4; z++) {
            if (x * x + z * z < 18) {
                for (let y = 10; y < 12; y++) {
                    v.push({ x, y, z, c: color });
                }
            }
        }
    }
    const billZ = reverse ? -1 : 1;
    for (let x = -3; x <= 3; x++) {
        for (let z = 0; z < 4; z++) {
            v.push({ x, y: 10, z: (z * billZ) + (reverse ? -4 : 4), c: color });
        }
    }
    return v;
};

/**
 * Generate a beanie voxel pattern
 * @param {string} color - Beanie color
 * @returns {Array} Voxel array
 */
export const makeBeanie = (color) => {
    const v = [];
    for (let x = -4; x <= 4; x++) {
        for (let z = -4; z <= 4; z++) {
            for (let y = 10; y < 13; y++) {
                if (x * x + z * z < 17) {
                    v.push({ x, y, z, c: color });
                }
            }
        }
    }
    v.push({ x: 0, y: 13, z: 0, c: color });
    return v;
};

export default { makeCap, makeBeanie };

