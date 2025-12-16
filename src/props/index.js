/**
 * Props Module - Exports all prop classes and utilities
 */

// Base class
export { default as BaseProp } from './BaseProp';

// Shared utilities
export { PropColors } from './PropColors';
export { getMaterialManager } from './PropMaterials';

// Environmental props
export { default as PineTree } from './PineTree';
export { default as Igloo } from './Igloo';
export { default as LampPost } from './LampPost';
export { default as Bench } from './Bench';
export { default as SnowPile } from './SnowPile';
export { default as Signpost } from './Signpost';
export { default as Rock } from './Rock';
export { default as Snowman } from './Snowman';
export { default as Fence } from './Fence';
export { default as Campfire } from './Campfire';
export { default as LogSeat } from './LogSeat';
export { default as ChristmasTree } from './ChristmasTree';
export { default as Billboard } from './Billboard';

// Prop registry for factory pattern
export { createProp, PROP_TYPES } from './PropRegistry';
