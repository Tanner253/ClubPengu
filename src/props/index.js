/**
 * Props Module - Exports all prop classes and utilities
 */

// Base class
export { default as BaseProp } from './BaseProp';

// Shared utilities
export { PropColors } from './PropColors';
export { getMaterialManager } from './PropMaterials';
export { getGeometryManager } from './PropGeometries';

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

// Quality of life props
export { default as Mailbox } from './Mailbox';
export { default as TrashCan } from './TrashCan';
export { default as Barrel } from './Barrel';
export { default as FireHydrant } from './FireHydrant';
export { default as IceSculpture } from './IceSculpture';
export { default as Crate } from './Crate';
export { default as StreetSign } from './StreetSign';
export { default as WoodenPost } from './WoodenPost';

// Ice fishing
export { default as IceFishingHole } from './IceFishingHole';

// Arcade/Gaming
export { default as ArcadeMachine } from './ArcadeMachine';

// Prop registry for factory pattern
export { createProp, PROP_TYPES } from './PropRegistry';
