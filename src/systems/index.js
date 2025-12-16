/**
 * Game Systems - Modular game logic extracted from VoxelWorld
 * 
 * These systems handle specific game functionality and can be used
 * independently or composed together in the main VoxelWorld component.
 */

// Scene and rendering
export { default as SceneManager } from './SceneManager';

// Input handling
export { default as InputManager } from './InputManager';

// AI/NPC management  
export { default as AIManager } from './AIManager';
export { updateAIAgents } from './AIUpdateLoop';

// Day/night cycle
export { default as DayNightCycle } from './DayNightCycle';

// Physics and movement
export { default as MovementSystem } from './MovementSystem';

// Player interaction
export { default as InteractionSystem } from './InteractionSystem';

// Particle effects
export { default as ParticleSystem } from './ParticleSystem';

// Emote system
export { default as EmoteSystem, EMOTE_WHEEL_ITEMS, LOOPING_EMOTES, EMOTE_EMOJI_MAP } from './EmoteSystem';

// Chat bubble system
export { default as ChatBubbleManager, createChatSprite, getBubbleHeight, getNameHeight, BUBBLE_HEIGHT_PENGUIN, BUBBLE_HEIGHT_MARCUS } from './ChatBubbleSystem';

// Multiplayer synchronization
export { default as MultiplayerSync, hasAnimatedCosmetics, lerp, lerpRotation, calculateLerpFactor } from './MultiplayerSync';

// Match banner system
export { updateMatchBanners, cleanupMatchBanners, renderBannerToCanvas } from './MatchBannerSystem';

// Igloo occupancy banners
export { createIglooOccupancySprite, updateIglooOccupancySprite } from './IglooOccupancySystem';

// Animation system
export { animateMesh, cacheAnimParts } from './AnimationSystem';

// Day/Night cycle updater
export { updateDayNightCycle, calculateNightFactor } from './DayNightUpdater';

// Snowfall particle system
export { default as SnowfallSystem } from './SnowfallSystem';

// Wizard trail particle system
export { default as WizardTrailSystem } from './WizardTrailSystem';

