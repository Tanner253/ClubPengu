/**
 * NightclubExterior - Creates the exterior nightclub building for the town
 * Wrapper around PropsFactory.createNightclub for gradual migration
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
 * Create the nightclub exterior building
 * @param {Object} THREE - THREE.js library
 * @param {Object} config - { width, depth, height }
 * @returns {{ mesh: THREE.Group, speakers: Array, update: Function }}
 */
export function createNightclubExterior(THREE, config = {}) {
    const factory = getFactory(THREE);
    return factory.createNightclub(config);
}

export default { createNightclubExterior };

