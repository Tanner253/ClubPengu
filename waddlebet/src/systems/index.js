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
export { default as ChatBubbleManager, createChatSprite, getBubbleHeight, getNameHeight, BUBBLE_HEIGHT_PENGUIN, BUBBLE_HEIGHT_MARCUS, BUBBLE_HEIGHT_WHALE, NAME_HEIGHT_WHALE } from './ChatBubbleSystem';

// Multiplayer synchronization
export { default as MultiplayerSync, hasAnimatedCosmetics, lerp, lerpRotation, calculateLerpFactor } from './MultiplayerSync';

// Match banner system (P2P)
export { updateMatchBanners, cleanupMatchBanners, renderBannerToCanvas } from './MatchBannerSystem';

// PvE Activity banner system (fishing, blackjack, etc.)
export { updatePveBanners, cleanupPveBanners, renderPveBannerToCanvas } from './MatchBannerSystem';

// Igloo occupancy banners
export { createIglooOccupancySprite, updateIglooOccupancySprite } from './IglooOccupancySystem';

// Casino TV banner (3D mesh with real DexScreener data)
export { createCasinoTVSprite, updateCasinoTVSprite, cleanupCasinoTV, fetchTokenData } from './CasinoTVSystem';

// Animation system
export { animateMesh, cacheAnimParts } from './AnimationSystem';

// Day/Night cycle updater
export { updateDayNightCycle, calculateNightFactor } from './DayNightUpdater';

// Snowfall particle system
export { default as SnowfallSystem } from './SnowfallSystem';

// Wizard trail particle system
export { default as WizardTrailSystem } from './WizardTrailSystem';

// Gake candle trail system (green trading candles)
export { default as GakeCandleTrailSystem } from './GakeCandleTrailSystem';

// Mount trail system (icy trails, etc.)
export { default as MountTrailSystem, TRAIL_TYPES } from './MountTrailSystem';

// Localized particle effects (nametag gold rain, sparkles, etc.)
export { default as LocalizedParticleSystem, PRESETS as LOCALIZED_PARTICLE_PRESETS } from './LocalizedParticleSystem';

// Camera controller (smooth third-person camera with trailing)
export { default as CameraController } from './CameraController';

// Slot machine system (casino slots interaction and spectator bubbles)
export { default as SlotMachineSystem, SPIN_COST as SLOT_SPIN_COST, RARITY_SYMBOLS as SLOT_RARITY_SYMBOLS } from './SlotMachineSystem';

// Jackpot celebration system (disco ball, confetti, lasers)
export { default as JackpotCelebration } from './JackpotCelebration';

// Ice fishing system (catch bubble display)
export { default as IceFishingSystem, FISHING_COST } from './IceFishingSystem';

// Mountain background system (performant low-poly mountains around the map)
export { createMountainBackground, createBillboardMountains } from './MountainBackground';

// Performance management system (presets, LOD, distance-based optimizations)
export { default as performanceManager, PERFORMANCE_PRESETS, PerformanceManager } from './PerformanceManager';
export { LOD_THRESHOLDS, LOD_THRESHOLDS_SQ, LOD_LEVEL } from './PerformanceManager';

