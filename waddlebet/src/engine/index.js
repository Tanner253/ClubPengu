// Engine exports
export { default as GameManager } from './GameManager';
export { default as VoxelBuilder } from './VoxelBuilder';
export { default as Penguin } from './Penguin';
export { default as Pet } from './Pet';
export { default as PropsFactory } from './PropsFactory';
export { default as CollisionSystem } from './CollisionSystem';
export { 
    default as createCharacterBuilder,
    createPenguinBuilder, // Backward compatibility alias
    cacheAnimatedParts, 
    animateCosmeticsFromCache 
} from './PlayerBuilder';

