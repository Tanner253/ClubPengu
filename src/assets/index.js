/**
 * Assets Module - Organized asset exports
 * 
 * This module provides a clean import structure for assets:
 * - import { ASSETS } from './assets'           // Unified ASSETS object
 * - import { HATS, EYES } from './assets'       // Individual categories
 * - import { makeCap } from './assets/helpers'  // Helper functions
 */

// Import from standalone asset files
import { HATS } from './hats';
import { EYES } from './eyes';
import { MOUTHS } from './mouths';
import { BODY } from './bodyItems';
import { MOUNTS } from './mounts';

// Re-export individual categories
export { HATS } from './hats';
export { EYES } from './eyes';
export { MOUTHS } from './mouths';
export { BODY } from './bodyItems';
export { MOUNTS } from './mounts';

// Helper functions
export { makeCap, makeBeanie } from './helpers';

// Unified ASSETS object for backward compatibility
export const ASSETS = {
    HATS,
    EYES,
    MOUTH: MOUTHS,  // Note: Original used MOUTH not MOUTHS
    BODY,
    MOUNTS
};

export default ASSETS;
