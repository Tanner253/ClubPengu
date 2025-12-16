/**
 * DojoParkour - Creates the dojo parkour course
 * Wrapper around PropsFactory.createDojoParkourCourse for gradual migration
 */

import PropsFactory from '../engine/PropsFactory';

// Singleton factory instance  
let factoryInstance = null;

function getFactory(THREE) {
    if (!factoryInstance) {
        factoryInstance = new PropsFactory(THREE);
    }
    return factoryInstance;
}

/**
 * Create the dojo parkour course
 * @param {Object} THREE - THREE.js library
 * @param {Object} config - { dojoX, dojoZ, dojoWidth, dojoHeight, dojoDepth, mirrored }
 * @returns {{ mesh: THREE.Group, platforms: Array, colliders: Array, roofBenches: Array }}
 */
export function createDojoParkour(THREE, config = {}) {
    const factory = getFactory(THREE);
    return factory.createDojoParkourCourse(config);
}

export default { createDojoParkour };

