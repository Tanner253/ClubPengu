import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VOXEL_SIZE, PALETTE } from './constants';
import { ASSETS } from './assets/index';
import { IconSend } from './Icons';
import GameHUD from './components/GameHUD';
import WorldCompass from './components/WorldCompass';
import Portal from './components/Portal';
import IglooPortal from './components/IglooPortal';
import BannerZoomOverlay from './components/BannerZoomOverlay';
import IglooRentalGuide from './components/IglooRentalGuide';
import GachaDropRatesGuide from './components/GachaDropRatesGuide';
import PufflePanel from './components/PufflePanel';
import VirtualJoystick from './components/VirtualJoystick';
import TouchCameraControl from './components/TouchCameraControl';
import SettingsMenu from './components/SettingsMenu';
import ChangelogModal from './components/ChangelogModal';
import EmoteWheel from './components/EmoteWheel';
import GameManager from './engine/GameManager';
import { GOLD_SLOT_BET, GOLD_SLOT_BET_MIN, GOLD_SLOT_BET_MAX, clampGoldSlotBet } from './config/goldSlots';
import { PVE_BJ_MIN_BET, PVE_BJ_MAX_BET } from './config/goldEconomy';
import Puffle from './engine/Puffle';
import { createPenguinBuilder, cacheAnimatedParts, animateCosmeticsFromCache, playerHasAnimatedCosmetics } from './engine/PenguinBuilder';
import TownCenter from './rooms/TownCenter';
import { createTownIceGroundTexture } from './rooms/town/TownIceGround';
import SnowFortsZone from './rooms/SnowFortsZone';
import ForestTrailsZone from './rooms/ForestTrailsZone';
import Nightclub from './rooms/Nightclub';
import CasinoRoom from './rooms/CasinoRoom';
import { generateIglooInterior } from './rooms/BaseRoom';
import { generateSKNYIglooInterior } from './rooms/SKNYIglooInterior';
import { useMultiplayer } from './multiplayer';
import { useChallenge } from './challenge';
import { useIgloo } from './igloo';
import { getRoomLabel } from './utils/roomLabels';
import { releaseHudFocusForGameKey } from './utils/gameHudFocus';
import { useLanguage } from './i18n';
import { EMOTE_WHEEL_ITEMS, LOOPING_EMOTES, EMOTE_EMOJI_MAP, createChatSprite, updateAIAgents, updateMatchBanners, updatePveBanners, cleanupPveBanners, createIglooOccupancySprite, updateIglooOccupancySprite, animateMesh, updateDayNightCycle, calculateNightFactor, SnowfallSystem, WizardTrailSystem, GakeCandleTrailSystem, MountTrailSystem, LocalizedParticleSystem, CameraController, lerp, lerpRotation, calculateLerpFactor, SlotMachineSystem, GoldLobbySlotSystem, JackpotCelebration, IceFishingSystem, createMountainBackground, performanceManager, PERFORMANCE_PRESETS } from './systems';
import { getHoleStockRows, getHoleStockSignature, formatRegrowEta, getHoleStatusById } from './utils/fishingHoleStock';
import { playSfx, stopTravelHum, setMusicEnergy, DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME, normalizeMusicVolume, updateProximityAmbient, stopProximityAmbient, handleRemotePlayerSfx } from './audio';
import { 
    CITY_SIZE, 
    BUILDING_SCALE, 
    CENTER_X, 
    CENTER_Z, 
    BUILDINGS, 
    AI_NAMES,
    AI_AGENT_COUNT,
    AI_SPAWN_PUFFLES,
    AI_HEAVY_HATS,
    AI_HEAVY_EYES,
    AI_HEAVY_MOUTH,
    AI_HEAVY_BODY,
    AI_NPC_ENABLED,
    AI_EMOTES,
    AI_CONVERSATIONS,
    BUBBLE_HEIGHT_PENGUIN,
    BUBBLE_HEIGHT_MARCUS,
    BUBBLE_HEIGHT_WHALE,
    NAME_HEIGHT_PENGUIN,
    NAME_HEIGHT_MARCUS,
    NAME_HEIGHT_WHALE,
    ROOM_PORTALS,
    WORLD_SPAWN,
    WORLD_SPAWN_ROOM,
    getNightclubSpawnPosition,
    isInvalidNightclubPosition,
    IGLOO_BANNER_STYLES,
    IGLOO_BANNER_CONTENT
} from './config';
import { readLiveWebGLInfo } from './utils/browserCapabilities.js';
import { applyLowEndMode } from './utils/lowEndRender.js';
import { createDojo, createGiftShop, createPizzaParlor, generateDojoInterior, generatePizzaInterior } from './buildings';
import { animateBuildingBanner } from './buildings/buildingBanner';
import IceFishingGame from './games/IceFishingGame';
import { canPickWorldAt } from './utils/worldPickInput';
import { getResumePosition, savePlayerSession } from './utils/playerSession';
import { disposeThreeObject } from './utils/disposeThreeObject';
import CasinoBlackjack from './components/CasinoBlackjack';
import BattleshipGame from './minigames/BattleshipGame';
import FlappyPenguinGame from './minigames/FlappyPenguinGame';
import SnakeGame from './minigames/SnakeGame';
import PongGame from './minigames/PongGame';
import MemoryMatchGame from './minigames/MemoryMatchGame';
import ThinIceGame from './minigames/ThinIceGame';
import AvalancheRunGame from './minigames/AvalancheRunGame';
import WorldNpcManager from './npcs/WorldNpcManager';
import TravelNpcManager from './npcs/TravelNpcManager';
import NpcDialogueModal from './components/NpcDialogueModal';
import TravelDialogueModal from './components/TravelDialogueModal';
import TravelLobbyHUD from './components/TravelLobbyHUD';
import { isTravelLobbyRoom, TRAVEL_LOBBY_CAMERA, clampTravelLobbyPosition } from './config/travelConfig';
import TravelLobbyRoom from './rooms/TravelLobbyRoom';
import WoodcuttingSystem from './systems/WoodcuttingSystem';
import ManualChopController from './systems/ManualChopController';
import { getManualChopStandDistance, snapPlayerToChopRing } from './config/manualChop';
import { formatForestRegrowCountdown } from './config/harvestableTrees';
import ForestTreeManager from './systems/ForestTreeManager';
import WorldDropManager from './systems/WorldDropManager';
import { WORLD_DROP_PICKUP_RADIUS, isGoldWorldDrop } from './config/worldDrops';
import { getOverworldMountainConfig, OVERWORLD_CENTER_SPAWN } from './config/overworldConfig';
import { loadSnowFortsQuadrant, loadForestQuadrant } from './world/overworldLoader';
import { HARVESTABLE_MUSHROOMS, MUSHROOM_INTERACTION_RADIUS, MUSHROOM_HARVEST_MS } from './config/harvestableMushrooms';
import { FORAGEABLE_LOGS, WORM_FORAGE_RADIUS, WORM_FORAGE_CHANNEL_MS } from './config/forageableLogs';
import { findActiveScavengeSpot } from './config/scavenge';
import { ARCADE_MACHINES } from './config/arcadeZone';
import { formatScavengeCountdown, getScavengeRemainingMs, getScavengeSpotPrompt } from './utils/scavengeStatus';
import { updateHeldGameItem, removeHeldGameItem } from './items/HeldGameItemBuilder';
import { getActiveHotbarEntry, ownsAnyRod } from './utils/gameHotbar';
import { canFitItemInBackpack } from './utils/inventoryCapacity';
import StarterRodPickup from './systems/StarterRodPickup';
import GameInventoryModal from './components/GameInventoryModal';
import { resolveNametagStyle, isStyledNametag, getNametagParticleEffect } from './config/whaleNametagTiers.js';
import { drawNametagToCanvas } from './utils/nametagCanvas.js';

function disposeNameSprite(sprite) {
    if (!sprite) return;
    sprite.material?.map?.dispose();
    sprite.material?.dispose();
}

function syncMeshNametagParticles(meshData, playerData, scene, THREE, position, camera, time, delta, distSq) {
    const effect = getNametagParticleEffect(resolveNametagStyle(playerData));
    const enabled = performanceManager.shouldShowNametagParticles(distSq);

    if (!meshData._particlePreset) meshData._particlePreset = null;
    if (meshData._particleColor === undefined) meshData._particleColor = null;

    if (!enabled || !effect) {
        if (meshData.goldRainSystem) meshData.goldRainSystem.setVisible(false);
        return;
    }

    const needsRecreate = !meshData.goldRainSystem
        || meshData._particlePreset !== effect.preset
        || meshData._particleColor !== effect.color;

    if (needsRecreate) {
        if (meshData.goldRainSystem) {
            meshData.goldRainSystem.dispose();
            meshData.goldRainSystem = null;
        }
        meshData.goldRainSystem = new LocalizedParticleSystem(THREE, scene, effect.preset, { color: effect.color });
        meshData.goldRainSystem.create({ x: position.x, y: position.y || 0, z: position.z });
        meshData._particlePreset = effect.preset;
        meshData._particleColor = effect.color;
    }

    meshData.goldRainSystem.setVisible(true);
    meshData.goldRainSystem.update(time, delta, position, camera?.position);
}

function animateNametagSprite(sprite, time, isStyled) {
    if (!sprite?.material) return;
    if (!isStyled) {
        sprite.material.opacity = 1;
        return;
    }
    const phase = sprite.userData.animationPhase || 0;
    sprite.material.opacity = 0.88 + Math.sin(time * 2.8 + phase) * 0.12;
}

function syncRemotePlayerHeldItem(meshData, playerData, buildPartMerged) {
    if (!meshData?.mesh || !buildPartMerged) return;
    const entry = playerData?.heldHotbarItem;
    const key = entry?.itemId
        ? `${entry.itemId}:${entry.category || ''}:${entry.tier || 0}`
        : 'empty';
    if (meshData.lastHeldItemKey === key && !playerData.needsHeldItemUpdate) return;
    meshData.lastHeldItemKey = key;
    playerData.needsHeldItemUpdate = false;
    if (entry?.itemId) {
        updateHeldGameItem(meshData.mesh, buildPartMerged, entry);
    } else {
        removeHeldGameItem(meshData.mesh);
    }
}

const VoxelWorld = ({ 
    penguinData, 
    onPenguinDataChange, // Callback to update penguinData in parent (App.jsx)
    room = 'town',  // Current room/layer
    onExitToDesigner, 
    onChangeRoom,
    onStartMinigame,
    playerPuffle, 
    onPuffleChange,
    customSpawnPos,  // Custom spawn position (when returning from dojo/igloo)
    sessionResumeRef = null, // One-shot: restore logout position on Enter World
    onPlayerClick,   // Callback when clicking another player (for challenge system)
    isInMatch = false, // True when player is in a P2P match (disable movement input)
    activeMatches = [], // Active matches in the room (for spectator banners)
    spectatingMatch = {}, // Real-time match state data for spectating
    activePveActivities = {}, // PvE activity state for spectator banners (fishing, blackjack, etc.)
    onRequestAuth,    // Callback to redirect to penguin maker for auth
    turnstileToken = null, // Cloudflare Turnstile verification token (for bot protection)
    onWorldReady = null // First frame rendered (for entry loading screen)
}) => {
    // Language context for translations
    const { t } = useLanguage();
    
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const playerRef = useRef(null);
    const playerNameSpriteRef = useRef(null); // Player's own name tag
    const playerGoldRainRef = useRef(null); // Nametag particle system (gold/whale/sparkle)
    const playerGoldRainEffectKeyRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const reqRef = useRef(null);
    const mapRef = useRef(null);
    const clockRef = useRef(null);
    const roomRef = useRef(room); // Track current room
    const townCenterRef = useRef(null); // TownCenter room instance
    const snowFortsZoneRef = useRef(null); // Snow Forts zone instance (east of town)
    const forestTrailsZoneRef = useRef(null);
    const nightclubRef = useRef(null); // Nightclub room instance
    const casinoRoomRef = useRef(null); // CasinoRoom room instance
    const sknyIglooInteriorRef = useRef(null); // SKNY GANG igloo interior (with update function)
    const roomDataRef = useRef(null); // Store room data (including beach ball) for multiplayer sync
    const raycasterRef = useRef(null); // For player click detection
    const mouseRef = useRef({ x: 0, y: 0 }); // Mouse position for raycasting
    const isInMatchRef = useRef(isInMatch); // Track match state for game loop
    const matchBannersRef = useRef(new Map()); // matchId -> { sprite, canvas, ctx }
    const pveBannersRef = useRef(new Map()); // playerId -> { sprite, canvas, ctx } for PvE activities
    const wizardTrailSystemRef = useRef(null); // World-space wizard hat particle trail
    const gakeCandleTrailSystemRef = useRef(null); // Gake character green candle trail
    const mountTrailSystemRef = useRef(null); // Mount trail system (icy trails, etc.)
    const mountainBackgroundRef = useRef(null); // Mountain background system
    const mountEnabledRef = useRef(true); // Track if mount is equipped/enabled
    const mpUpdateAppearanceRef = useRef(null); // Ref for appearance update function
    const cameraControllerRef = useRef(null); // Smooth third-person camera controller
    const penguinDataRef = useRef(null); // Ref for current penguin data
    const onWorldReadyRef = useRef(onWorldReady);
    const worldReadyFiredRef = useRef(false);
    const updateLoopGenerationRef = useRef(0);

    useEffect(() => {
        worldReadyFiredRef.current = false;
    }, [room]);
    useEffect(() => {
        onWorldReadyRef.current = onWorldReady;
    }, [onWorldReady]);
    
    const wasInCasinoRef = useRef(false); // Track if player was inside casino (for one-time zoom)
    const previousRoomRef = useRef(null);
    const nearTownFurnitureRef = useRef(null); // Cached furniture proximity (throttled scan)
    const casinoZoomTransitionRef = useRef({ active: false, targetDistance: 20, progress: 0 }); // Room zoom transitions
    const slotMachineSystemRef = useRef(null); // Slot machine interaction system
    const goldLobbySlotSystemRef = useRef(null); // Snow Forts casino lobby gold slots
    const goldLobbySlotSyncedRef = useRef(false);
    const jackpotCelebrationRef = useRef(null); // Jackpot celebration effects (disco ball, confetti, lasers)
    const iceFishingSystemRef = useRef(null); // Ice fishing interaction system
    const starterRodPickupRef = useRef(null);
    const starterRodLockRef = useRef(false);
    const [starterRodInteraction, setStarterRodInteraction] = useState(null);
    const woodcuttingSystemRef = useRef(null);
    const forestTreeManagerRef = useRef(null);
    const manualChopControllerRef = useRef(null);
    const manualChopActiveRef = useRef(false);
    const mushroomClusterManagerRef = useRef(null);
    const worldDropManagerRef = useRef(null);
    const worldDropsRef = useRef([]);
    
    // Keep isInMatch ref up to date
    useEffect(() => {
        isInMatchRef.current = isInMatch;
    }, [isInMatch]);
    
    // Mount toggle - listen for settings changes
    useEffect(() => {
        // Initialize from localStorage
        try {
            const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
            mountEnabledRef.current = settings.mountEnabled !== false;
        } catch { mountEnabledRef.current = true; }
        
        const handleMountToggle = (e) => {
            const enabled = e.detail?.enabled ?? true;
            mountEnabledRef.current = enabled;
            
            // Toggle mount visibility on current player mesh
            if (playerRef.current) {
                const mountGroup = playerRef.current.getObjectByName('mount');
                if (mountGroup) {
                    mountGroup.visible = enabled;
                }
                // Also toggle mount-related userData
                if (playerRef.current.userData) {
                    playerRef.current.userData.mountVisible = enabled;
                }
                // Clear cached animation parts so they reset properly
                playerRef.current._animParts = null;
            }
            
            // SYNC TO SERVER: Notify other players about mount visibility change
            if (mpUpdateAppearanceRef.current && penguinDataRef.current) {
                mpUpdateAppearanceRef.current({
                    ...penguinDataRef.current,
                    mountEnabled: enabled
                });
            }
        };
        
        window.addEventListener('mountToggled', handleMountToggle);
        return () => window.removeEventListener('mountToggled', handleMountToggle);
    }, []);
    
    // Green candles toggle - listen for settings changes
    useEffect(() => {
        const handleGreenCandlesToggle = (e) => {
            const enabled = e.detail?.enabled ?? false;
            
            // SYNC TO SERVER: Notify other players about green candles change
            if (mpUpdateAppearanceRef.current && penguinDataRef.current) {
                mpUpdateAppearanceRef.current({
                    ...penguinDataRef.current,
                    greenCandlesEnabled: enabled
                });
            }
        };
        
        window.addEventListener('greenCandlesToggled', handleGreenCandlesToggle);
        return () => window.removeEventListener('greenCandlesToggled', handleGreenCandlesToggle);
    }, []);
    
    // Performance preset change listener - apply dynamic settings
    useEffect(() => {
        const applyLowEnd = () => {
            applyLowEndMode({
                renderer: rendererRef.current,
                scene: sceneRef.current,
                THREE: window.THREE
            });
        };

        const applyLiveTuning = () => {
            const THREE = window.THREE;
            performanceManager.applyRendererTuning(
                rendererRef.current,
                THREE,
                sunLightRef.current,
                window._isMobileGPU
            );
            // Re-assert low-end overrides — applyRendererTuning resets DPR/shadow type,
            // which would otherwise undo the low-end render scale / shadow disable.
            if (performanceManager.isLowEndMode()) {
                applyLowEnd();
            }
        };

        const handlePresetChange = (e) => {
            const { settings } = e.detail;
            console.log(`🎮 Performance preset changed to: ${settings.name}`);
            applyLiveTuning();
            
            if (snowfallSystemRef.current && settings.snowParticles) {
                console.log(`❄️ Snow particles will update: ${settings.snowParticles}`);
            }
        };

        const handleEmergencyDowngrade = (e) => {
            console.warn(`🎮 Auto-tuned performance: ${e.detail.from} → ${e.detail.to} (${e.detail.avgFps} FPS)`);
            applyLiveTuning();
        };

        const handleLowEndActivated = () => applyLowEnd();

        window.addEventListener('performancePresetChanged', handlePresetChange);
        window.addEventListener('performanceEmergencyDowngrade', handleEmergencyDowngrade);
        window.addEventListener('lowEndModeActivated', handleLowEndActivated);
        return () => {
            window.removeEventListener('performancePresetChanged', handlePresetChange);
            window.removeEventListener('performanceEmergencyDowngrade', handleEmergencyDowngrade);
            window.removeEventListener('lowEndModeActivated', handleLowEndActivated);
        };
    }, []);

    // Re-apply low-end material simplification after room loads and for late-spawned meshes.
    useEffect(() => {
        if (!performanceManager.isLowEndMode()) return undefined;

        const refreshLowEnd = () => {
            applyLowEndMode({
                renderer: rendererRef.current,
                scene: sceneRef.current,
                THREE: window.THREE
            });
        };

        const timers = [500, 2500, 8000].map((ms) => setTimeout(refreshLowEnd, ms));
        const interval = setInterval(refreshLowEnd, 15000);
        return () => {
            timers.forEach(clearTimeout);
            clearInterval(interval);
        };
    }, [room]);
    
    
    // Multiplayer - OPTIMIZED: use refs for positions, state only for player list changes
    const {
        connected,
        playerId,
        playerName,
        playerCount,
        totalPlayerCount,     // Total players online (all rooms)
        playerList,           // Triggers mesh creation/removal
        playersDataRef,       // Real-time position data (no re-renders)
        connectionError,      // Error if connection rejected
        joinRoom: mpJoinRoom,
        sendPosition,
        sendChat: mpSendChat,
        sendClearAfk: mpSendClearAfk,
        sendEmoteBubble: mpSendEmoteBubble,
        sendEmote: mpSendEmote,
        changeRoom: mpChangeRoom,
        updateAppearance: mpUpdateAppearance,
        updatePuffle: mpUpdatePuffle,
        sendPuffleEmote,      // Broadcast puffle emote to all players
        syncPuffleState,      // Sync puffle accessories/state to all players
        sendBallKick: mpSendBallKick,
        requestBallSync: mpRequestBallSync,
        sendSnowball: mpSendSnowball,
        registerCallbacks,
        registerChatBubbleCallback,
        setMobileChatOpen,
        setWorldGameplayOverlay,
        worldTimeRef: serverWorldTimeRef, // Server-synchronized world time
        isAuthenticated, // For determining persistence mode
        isRestoringSession,
        walletAddress, // User's wallet address for igloo ownership checks
        // Slot machine
        spinSlot,
        slotSpinning,
        slotResult,
        activeSlotSpins,
        spinGoldSlot,
        goldSlotSpinning,
        goldSlotResult,
        clearGoldSlotResult,
        syncGoldSlots,
        activeGoldSlotSpins,
        // Ice fishing
        startFishing,
        attemptCatch,
        cancelFishing,
        fishingActive,
        fishingResult,
        clearFishingResult,
        userData,
        gameInventory,
        upgradeBackpack,
        upgradeRod,
        buyFromMerchant,
        claimStarterRod,
        fetchGameInventory,
        startWoodChop,
        completeWoodChop,
        cancelWoodChop,
        startManualChop,
        sendManualChopHit,
        completeManualChop,
        cancelManualChop,
        fetchForestTrees,
        forestTrees,
        fetchFishingHoles,
        fishingHoles,
        fetchMushrooms,
        mushroomClusters,
        harvestMushroom,
        forageLogWorms,
        wormForageCooldowns,
        fetchWormForageStatus,
        worldDrops,
        pickupWorldDrop,
        fetchWorldDrops,
        scavengeSpot,
        scavengeCooldowns,
        fetchScavengeStatus,
        turnInMushroomQuest,
        turnInNpcQuest,
        acceptNpcQuest,
        dailyQuestStatus,
        fetchDailyQuestStatus,
        roomTravelVoyages,
        travelRouteStatuses,
        myTravelVoyage,
        travelPending,
        fetchTravelState,
        bookTravel,
        leaveTravel,
        getPlayersData,
        // Raw send for PvE activity messages
        send: mpSend
    } = useMultiplayer();
    
    const userDataRef = useRef(userData);
    const isAuthenticatedRef = useRef(isAuthenticated);
    useEffect(() => {
        userDataRef.current = userData;
        isAuthenticatedRef.current = isAuthenticated;
    }, [userData, isAuthenticated]);

    useEffect(() => {
        if (playerId && woodcuttingSystemRef.current) {
            woodcuttingSystemRef.current.setLocalPlayerId(playerId);
        }
    }, [playerId]);

    useEffect(() => {
        if (!forestTreeManagerRef.current || !forestTrees?.length) return;
        forestTreeManagerRef.current.applySnapshot(forestTrees);
    }, [forestTrees]);

    useEffect(() => {
        if (!mushroomClusterManagerRef.current || !mushroomClusters?.length) return;
        mushroomClusterManagerRef.current.applySnapshot(mushroomClusters);
    }, [mushroomClusters]);

    useEffect(() => {
        fetchWorldDrops?.();
    }, [room, fetchWorldDrops]);

    // Keep refs updated for use in event handlers (must be after useMultiplayer destructuring)
    useEffect(() => {
        mpUpdateAppearanceRef.current = mpUpdateAppearance;
    }, [mpUpdateAppearance]);
    
    useEffect(() => {
        penguinDataRef.current = penguinData;
    }, [penguinData]);

    useEffect(() => {
        playerListRef.current = playerList;
    }, [playerList]);

    // Allow a fresh join message after disconnect/reconnect
    const wasDisconnectedRef = useRef(false);
    useEffect(() => {
        if (!connected) {
            hasSentJoinRef.current = false;
            wasDisconnectedRef.current = true;
            return;
        }

        if (!wasDisconnectedRef.current) return;
        wasDisconnectedRef.current = false;

        if (roomRef.current === WORLD_SPAWN_ROOM && isInvalidNightclubPosition(posRef.current)) {
            const spawn = getNightclubSpawnPosition();
            posRef.current = spawn;
            rotRef.current = 0;
            velRef.current = { x: 0, y: 0, z: 0 };
            if (playerRef.current) {
                playerRef.current.position.set(spawn.x, spawn.y, spawn.z);
                playerRef.current.rotation.y = 0;
            }
            savePlayerSession(WORLD_SPAWN_ROOM, spawn);
            console.log('🌟 Reconnect: restored nightclub /spawn position', spawn);
        }
    }, [connected]);
    
    // Rebuild local player mesh when penguinData changes (e.g., after saving customization)
    const prevPenguinDataRef = useRef(penguinData);
    useEffect(() => {
        // Skip on initial mount (mesh is built in initThree)
        if (prevPenguinDataRef.current === penguinData) {
            prevPenguinDataRef.current = penguinData;
            return;
        }
        
        // Only rebuild mesh if cosmetic-relevant properties actually changed.
        // Visibility flags (mountEnabled, greenCandlesEnabled, nametagStyle) are handled
        // by their own event listeners and should NOT trigger a full mesh rebuild.
        const prev = prevPenguinDataRef.current;
        const cosmeticKeys = [
            'skin', 'hat', 'eyes', 'mouth', 'bodyItem', 'mount', 'characterType',
            'dogPrimaryColor', 'dogSecondaryColor',
            'frogPrimaryColor', 'frogSecondaryColor', 'shrimpPrimaryColor',
            'tortoisePrimaryColor', 'tortoiseSecondaryColor'
        ];
        if (prev && penguinData) {
            const cosmeticsChanged = cosmeticKeys.some(key => prev[key] !== penguinData[key]);
            if (!cosmeticsChanged) {
                prevPenguinDataRef.current = penguinData;
                return;
            }
        }
        
        prevPenguinDataRef.current = penguinData;
        
        // Broadcast the new cosmetics to other players. Critical for authenticated users:
        // the initial join fires with DEFAULT_PENGUIN before customization loads from the
        // server, so this is what propagates real cosmetics/mounts to everyone else.
        if (hasSentJoinRef.current && mpUpdateAppearanceRef.current && penguinData) {
            try {
                const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
                mpUpdateAppearanceRef.current({
                    ...penguinData,
                    mountEnabled: settings.mountEnabled !== false,
                    nametagStyle: isAuthenticated ? (settings.nametagStyle || 'tier') : 'default',
                    greenCandlesEnabled: settings.greenCandlesEnabled === true
                });
            } catch {
                mpUpdateAppearanceRef.current({ ...penguinData });
            }
        }
        
        if (!playerRef.current || !buildPenguinMeshRef.current || !sceneRef.current || !penguinData) return;
        
        // Store current position, rotation, and attachments
        const currentPos = playerRef.current.position.clone();
        const currentRot = playerRef.current.rotation.y;
        const nameSprite = playerNameSpriteRef.current;
        
        // Remove old mesh from scene and free GPU buffers
        disposeThreeObject(playerRef.current);
        sceneRef.current.remove(playerRef.current);
        
        // Build new mesh with updated appearance
        const newMesh = buildPenguinMeshRef.current(penguinData);
        newMesh.position.copy(currentPos);
        newMesh.rotation.y = currentRot;
        sceneRef.current.add(newMesh);
        
        // Reattach nametag
        if (nameSprite) {
            newMesh.add(nameSprite);
        }
        
        // Update mount visibility based on settings
        try {
            const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
            if (settings.mountEnabled === false) {
                mountEnabledRef.current = false;
                const mountGroup = newMesh.getObjectByName('mount');
                if (mountGroup) {
                    mountGroup.visible = false;
                }
            }
        } catch (e) { /* ignore */ }
        
        // Update playerRef
        playerRef.current = newMesh;
        const heldEntry = getActiveHotbarEntry(gameInventory);
        if (heldEntry && buildPartMergedRef.current) {
            updateHeldGameItem(newMesh, buildPartMergedRef.current, heldEntry);
        }
        
        // Rebuild animated parts cache
        newMesh.userData._animatedPartsCache = cacheAnimatedParts(newMesh);
        
        console.log('🔄 Rebuilt local player mesh with updated appearance');
    }, [penguinData, isAuthenticated]);
    
    // Challenge context for position updates and dance trigger
    const { updateLocalPosition, shouldDance, clearDance } = useChallenge();
    
    // Igloo context for rental state and access control
    const { 
        igloos, 
        getIgloo, 
        isOwner: isIglooOwner, 
        myRentals, 
        openDetailsPanel,
        openRequirementsPanel,
        openSettingsPanel,
        checkIglooEntry,
        enterIglooRoom,
        leaveIglooRoom,
        userClearance
    } = useIgloo();
    
    // Check if player is inside their own igloo (for HUD settings button)
    const isInsideOwnedIgloo = room?.startsWith('igloo') && isIglooOwner(room);
    
    // Refs for other player meshes and state
    const otherPlayerMeshesRef = useRef(new Map()); // playerId -> { mesh, bubble, puffle }
    const lastPositionSentRef = useRef({ x: 0, y: 0, z: 0, rot: 0, time: 0 });
    const buildPenguinMeshRef = useRef(null); // Will be set in useEffect
    const buildPartMergedRef = useRef(null);
    const hasSentJoinRef = useRef(false); // One join per connection — room changes use change_room
    const lastRoomNotifyRef = useRef({ room: null, x: null, z: null });
    const [meshBuilderReady, setMeshBuilderReady] = useState(false); // Re-triggers other-player mesh creation
    const [meshSyncVersion, setMeshSyncVersion] = useState(0); // Bumps when game loop detects missing remote meshes

    useEffect(() => {
        worldDropsRef.current = worldDrops || [];
        if (!worldDropManagerRef.current) return;
        worldDropManagerRef.current.applySnapshot(worldDropsRef.current);
    }, [worldDrops, meshBuilderReady]);

    // Show held game item (fish, wood, axe, rod, etc.) on local player flipper
    useEffect(() => {
        if (!meshBuilderReady || !playerRef.current || !buildPartMergedRef.current) return;
        const entry = getActiveHotbarEntry(gameInventory);
        if (entry) {
            updateHeldGameItem(playerRef.current, buildPartMergedRef.current, entry);
        } else {
            removeHeldGameItem(playerRef.current);
        }
    }, [gameInventory?.activeHotbar, gameInventory?.hotbar, meshBuilderReady]);
    const meshSyncMissRef = useRef(new Map()); // playerId -> consecutive missing-appearance polls
    const playerListRef = useRef(playerList);
    const lastMissingMeshCheckRef = useRef(0);
    const meshSyncBumpScheduledRef = useRef(false);
    
    // OPTIMIZATION: Reusable vectors to avoid GC pressure in update loop
    const tempVec3Ref = useRef(null);
    const tempOffsetRef = useRef(null);
    
    // Player State
    const posRef = useRef({ x: 0, y: 0, z: 0 });
    const velRef = useRef({ x: 0, y: 0, z: 0 }); // Added y for jump velocity
    const rotRef = useRef(0);
    const keysRef = useRef({});
    const isGroundedRef = useRef(true);
    const jumpRequestedRef = useRef(false);
    const jumpButtonRef = useRef(null);
    // Skateboard double jump / trick state
    const canDoubleJumpRef = useRef(false);
    const isDoingTrickRef = useRef(false);
    const trickProgressRef = useRef(0); // 0 to 1 for trick animation
    const trickTypeRef = useRef('kickflip'); // 'kickflip' or 'spin360'
    
    // Snowball throwing state
    const snowballsRef = useRef([]); // Array of active snowballs { mesh, velocity, startTime }
    const splatsRef = useRef([]); // Active splat effect meshes (avoids scanning scene.children every frame)
    const snowballCooldownRef = useRef(0); // Timestamp when cooldown ends
    const isSnowballModeRef = useRef(false); // True when holding snowball throw key
    const [isSnowballMode, setIsSnowballMode] = useState(false); // For cursor change
    const [hoverCursor, setHoverCursor] = useState('default'); // Cursor based on hovered object
    const SNOWBALL_COOLDOWN_MS = 1000; // 1 second cooldown
    const SNOWBALL_GRAVITY = -15; // Gravity acceleration
    const SNOWBALL_LIFETIME_MS = 5000; // Remove snowballs after 5 seconds
    
    // Store igloo entry spawn position (so exiting returns to correct igloo)
    const iglooEntrySpawnRef = useRef(null);
    
    // Chat State (for local player bubble)
    const [activeBubble, setActiveBubble] = useState(null);
    const bubbleSpriteRef = useRef(null);
    const isAfkRef = useRef(false);
    const afkMessageRef = useRef(null);
    const isFishnuRespectRef = useRef(false); // True when showing Fishnu respect message
    const fishnuRespectMessageRef = useRef(null);
    
    // Igloo Occupancy Bubbles
    const iglooOccupancySpritesRef = useRef(new Map()); // Map of igloo id -> sprite
    const [iglooOccupancy, setIglooOccupancy] = useState({}); // { igloo1: 2, igloo2: 0, ... }
    
    // Lord Fishnu Lore Sprite
    const lordFishnuSpriteRef = useRef(null);
    
    // AI State
    const aiAgentsRef = useRef([]);
    // AI_NAMES, AI_EMOTES, AI_CONVERSATIONS imported from ./config
    // EMOTE_WHEEL_ITEMS imported from ./systems
    
    // Emote Wheel State
    const [emoteWheelOpen, setEmoteWheelOpen] = useState(false);
    const [emoteWheelSelection, setEmoteWheelSelection] = useState(-1);
    const emoteSelectionRef = useRef(-1); // Sticky selection - persists until changed
    const emoteWheelKeyHeld = useRef(false); // Track if T is currently held
    const emoteRef = useRef({ type: null, startTime: 0 });
    const [showPetShop, setShowPetShop] = useState(false);
    const playerPuffleRef = useRef(null);
    const puffleInteractionsRef = useRef(new Map()); // Track player -> last interaction time
    const puffleInteractionActiveRef = useRef(null); // Currently active interaction {playerId, startTime}
    const [puffleInteractionReward, setPuffleInteractionReward] = useState(null); // Show reward notification
    const pufflePetCooldownsRef = useRef(new Map()); // Track puffle -> last pet time (5 min cooldown)
    const [pufflePetNotification, setPufflePetNotification] = useState(null); // Show pet notification
    
    // Banner Zoom Overlay State
    const [bannerZoomOpen, setBannerZoomOpen] = useState(false);
    const [bannerZoomData, setBannerZoomData] = useState(null);
    const [iglooRentalGuideOpen, setIglooRentalGuideOpen] = useState(false);
    const [gachaDropRatesGuideOpen, setGachaDropRatesGuideOpen] = useState(false);
    const bannerZoomRenderFn = useRef(null);
    const aiPufflesRef = useRef([]); // { id, puffle }
    
    // Multi-puffle ownership system
    // For guests: empty array (no persistence)
    // For authenticated: loaded from server via GameManager sync
    const [ownedPuffles, setOwnedPuffles] = useState([]);
    
    // Sync puffles from server when authentication state changes
    useEffect(() => {
        if (isAuthenticated) {
            const gm = GameManager.getInstance();
            const serverData = gm.getUserData?.();
            if (serverData?.puffles?.length > 0) {
                try {
                    setOwnedPuffles(serverData.puffles.map(p => Puffle.fromJSON(p)));
                    console.log('🐾 Loaded puffles from server:', serverData.puffles.length);
                } catch (e) {
                    console.warn('Failed to load puffles from server:', e);
                }
            }
        } else {
            // Guest mode - no puffles persistence
            setOwnedPuffles([]);
        }
    }, [isAuthenticated]);
    
    // DON'T persist puffles to localStorage - server is authoritative for auth users
    // Guests don't get persistence
    
    // Use prop for equipped puffle, with local ref for 3D tracking
    const puffle = playerPuffle;
    
    // Portal State
    const [nearbyPortal, setNearbyPortal] = useState(null);
    const nearbyPortalRef = useRef(null);
    const portalsRef = useRef([]);
    
    // Town Interaction State
    const [nearbyInteraction, setNearbyInteraction] = useState(null);
    const lighthouseDeckInsideRef = useRef(false);

    useEffect(() => {
        if (room !== 'town') {
            lighthouseDeckInsideRef.current = false;
        }
    }, [room]);
    
    // Slot Machine Interaction State
    const [slotInteraction, setSlotInteraction] = useState(null); // { machine, prompt, canSpin }
    const [goldSlotInteraction, setGoldSlotInteraction] = useState(null);
    const [goldSlotBet, setGoldSlotBet] = useState(GOLD_SLOT_BET);
    
    // Blackjack Table Interaction State
    const [blackjackInteraction, setBlackjackInteraction] = useState(null); // { tableId, prompt, canPlay }
    const [blackjackGameActive, setBlackjackGameActive] = useState(false); // True when blackjack UI is open
    const [blackjackTableId, setBlackjackTableId] = useState(null);
    const blackjackDealersRef = useRef([]); // References to dealer penguin meshes
    
    // Ice Fishing Interaction State
    const [fishingInteraction, setFishingInteraction] = useState(null); // { spot, prompt, canFish }
    const [woodcuttingInteraction, setWoodcuttingInteraction] = useState(null);
    const [forestStumpHover, setForestStumpHover] = useState(null);
    const forestStumpHoverRef = useRef(null);
    const [mushroomInteraction, setMushroomInteraction] = useState(null);
    const [mushroomHarvestProgress, setMushroomHarvestProgress] = useState(null);
    const [logForageInteraction, setLogForageInteraction] = useState(null);
    const [worldDropInteraction, setWorldDropInteraction] = useState(null);
    const [scavengeInteraction, setScavengeInteraction] = useState(null);
    const scavengeLockRef = useRef(false);
    const scavengeCooldownsRef = useRef(scavengeCooldowns);
    useEffect(() => {
        scavengeCooldownsRef.current = scavengeCooldowns;
    }, [scavengeCooldowns]);

    useEffect(() => {
        if (room === 'snow_forts' && isAuthenticated) {
            fetchScavengeStatus?.();
        }
    }, [room, isAuthenticated, fetchScavengeStatus]);
    useEffect(() => {
        if (room === 'forest_trails' && isAuthenticated) {
            fetchWormForageStatus?.();
        }
    }, [room, isAuthenticated, fetchWormForageStatus]);

    const wormForageCooldownsRef = useRef(wormForageCooldowns);
    useEffect(() => {
        wormForageCooldownsRef.current = wormForageCooldowns;
    }, [wormForageCooldowns]);

    const mushroomLockRef = useRef(false);
    const mushroomHarvestTimerRef = useRef(null);
    const logForageLockRef = useRef(false);
    const logForageTimerRef = useRef(null);
    const worldDropLockRef = useRef(false);
    const [woodChopProgress, setWoodChopProgress] = useState(null);
    const [manualChopActive, setManualChopActive] = useState(false); // { progress 0-1, spotId }
    const woodChopTimerRef = useRef(null);
    const woodChopLastSfxRef = useRef(0);
    const [fishingGameActive, setFishingGameActive] = useState(false); // True when fishing minigame is open
    const [fishingGameSpot, setFishingGameSpot] = useState(null); // Current fishing spot for game
    
    // Arcade Game State (PvE Battleship etc)
    const [arcadeGameActive, setArcadeGameActive] = useState(false); // True when arcade minigame is open
    const [arcadeGameType, setArcadeGameType] = useState(null); // 'battleship' etc
    const [arcadeInteraction, setArcadeInteraction] = useState(null); // { machine, prompt, gameType }
    
    // Ref to track arcade game state for input blocking in game loop
    const arcadeGameActiveRef = useRef(false);
    useEffect(() => {
        arcadeGameActiveRef.current = arcadeGameActive;
    }, [arcadeGameActive]);

    // Pause the heavy 3D world loop while fullscreen minigames / PvP wagers own the screen
    const worldMinigameActiveRef = useRef(false);
    useEffect(() => {
        const active = blackjackGameActive || arcadeGameActive || fishingGameActive || isInMatch;
        worldMinigameActiveRef.current = active;
        performanceManager.setOverlayActive(active);
        setWorldGameplayOverlay(active);
        return () => {
            worldMinigameActiveRef.current = false;
            performanceManager.setOverlayActive(false);
            setWorldGameplayOverlay(false);
        };
    }, [blackjackGameActive, arcadeGameActive, fishingGameActive, isInMatch, setWorldGameplayOverlay]);
    
    // Lord Fishnu Interaction State
    const [lordFishnuInteraction, setLordFishnuInteraction] = useState(null); // { canPayRespects, prompt }
    const lordFishnuCooldownRef = useRef(false); // Prevent spam

    // World merchant NPCs (Old Salty, Copper Clive, …)
    const worldNpcManagerRef = useRef(null);
    const travelNpcManagerRef = useRef(null);
    const townBuildingBannersRef = useRef([]);
    const travelLobbyRef = useRef(null);
    const [nearbyNpcInteraction, setNearbyNpcInteraction] = useState(null);
    const nearbyNpcInteractionRef = useRef(null);
    const [activeNpcDef, setActiveNpcDef] = useState(null);
    const [activeTravelNpcDef, setActiveTravelNpcDef] = useState(null);
    const [nearbyTravelNpcInteraction, setNearbyTravelNpcInteraction] = useState(null);
    const nearbyTravelNpcInteractionRef = useRef(null);
    const [showNpcBackpack, setShowNpcBackpack] = useState(false);
    const [npcBackpackSellMerchant, setNpcBackpackSellMerchant] = useState(null);
    const showNpcBackpackRef = useRef(false);
    useEffect(() => {
        showNpcBackpackRef.current = showNpcBackpack;
    }, [showNpcBackpack]);
    
    // Bench Sitting State
    const [seatedOnBench, setSeatedOnBench] = useState(null); // { benchId, snapPoint, worldPos }
    const seatedRef = useRef(null); // For game loop access
    
    // Mobile State
    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(true);

    // Mobile detection and orientation handling
    useEffect(() => {
        const checkMobile = () => {
            const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isIPadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const mobile = mobileUA || isIPadOS || hasTouch;
            setIsMobile(mobile);
        };

        const checkOrientation = () => {
            setIsLandscape(window.innerWidth > window.innerHeight);
        };

        checkMobile();
        checkOrientation();

        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // Jump button needs non-passive touch listeners so preventDefault works (avoids camera scroll)
    useEffect(() => {
        const el = jumpButtonRef.current;
        if (!el || !isMobile) return undefined;

        const onTouchStart = (e) => {
            e.preventDefault();
            jumpRequestedRef.current = true;
        };
        const onTouchEnd = (e) => {
            e.preventDefault();
            jumpRequestedRef.current = false;
        };

        el.addEventListener('touchstart', onTouchStart, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: false });
        el.addEventListener('touchcancel', onTouchEnd, { passive: false });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [isMobile]);

    const [showSettings, setShowSettings] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [showDebugPosition, setShowDebugPosition] = useState(false);
    const showDebugPositionRef = useRef(false);
    const [debugPosition, setDebugPosition] = useState({ x: 0, y: 0, z: 0, offsetX: 0, offsetZ: 0 });
    const [showCollisionDebug, setShowCollisionDebug] = useState(false);
    const [showPerfDebug, setShowPerfDebug] = useState(false);
    const showPerfDebugRef = useRef(false);
    const perfStatsRef = useRef({
        fps: 0,
        frameTime: 0,
        drawCalls: 0,
        triangles: 0,
        visibleMeshes: 0,
        culledMeshes: 0,
        // Timing breakdown (ms)
        timings: {
            render: 0,
            townUpdate: 0,
            snowFortsUpdate: 0,
            forestUpdate: 0,
            playerUpdate: 0,
            otherPlayers: 0,
            animations: 0,
            culling: 0,
        },
        // Hot assets (what's costing the most)
        hotAssets: [],
        lastUpdate: 0
    });
    const [perfStats, setPerfStats] = useState(perfStatsRef.current);
    
    // Settings (persisted to localStorage)
    const [gameSettings, setGameSettings] = useState(() => {
        const defaults = {
            leftHanded: false,
            cameraSensitivity: 0.3,
            musicEnabled: true,
            sfxEnabled: true,
            musicVolume: DEFAULT_MUSIC_VOLUME,
            sfxVolume: DEFAULT_SFX_VOLUME,
            musicTrack: 'auto',
            soundEnabled: true,
            showFps: false,
            snowEnabled: true
        };
        try {
            const saved = localStorage.getItem('game_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.musicVolume === 'number') {
                    parsed.musicVolume = normalizeMusicVolume(parsed.musicVolume);
                }
                return { ...defaults, ...parsed };
            }
            return defaults;
        } catch {
            return defaults;
        }
    });
    
    // Day/night cycle state
    const [dayTime, setDayTime] = useState(0.35); // 0-1, 0.35 = morning
    const [daySpeed, setDaySpeed] = useState(0.01); // Speed multiplier for debug
    const dayTimeRef = useRef(0.35);
    const daySpeedRef = useRef(0.01);
    
    // Lighting refs for day/night cycle
    const sunLightRef = useRef(null);
    const ambientLightRef = useRef(null);
    const propLightsRef = useRef([]); // Town prop lights (lamps, campfire, tree, etc.)
    const lightsOnRef = useRef(true); // Track if lights are currently on
    
    // Snowfall system ref
    const snowfallSystemRef = useRef(null);
    
    // Persist settings (audio is applied synchronously in SettingsMenu.syncSettings)
    useEffect(() => {
        localStorage.setItem('game_settings', JSON.stringify(gameSettings));
    }, [gameSettings]);

    // Ferry lobby gets a low travel hum (ambient music is driven by App / AudioBootstrap)
    useEffect(() => {
        if (room?.startsWith('travel:')) {
            playSfx('travel_hum_start');
        } else {
            stopTravelHum();
        }
    }, [room]);

    useEffect(() => {
        return () => stopProximityAmbient();
    }, []);

    useEffect(() => {
        stopProximityAmbient();
    }, [room]);
    
    // Save player position periodically and on unmount (all rooms)
    useEffect(() => {
        const savePosition = () => {
            if (posRef.current && roomRef.current) {
                if (roomRef.current === WORLD_SPAWN_ROOM && isInvalidNightclubPosition(posRef.current)) {
                    return;
                }
                savePlayerSession(roomRef.current, posRef.current);
            }
        };
        
        // Save position every 5 seconds
        const interval = setInterval(savePosition, 5000);
        
        // Save on page unload
        window.addEventListener('beforeunload', savePosition);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', savePosition);
            savePosition(); // Final save on unmount
        };
    }, []);
    
    // Joystick input ref (updated by VirtualJoystick component)
    const joystickInputRef = useRef({ x: 0, y: 0 });
    const cameraRotationRef = useRef({ deltaX: 0, deltaY: 0 });
    const gameSettingsRef = useRef(gameSettings);
    
    // Keep gameSettingsRef updated + apply mount / green-candles from settings changes
    useEffect(() => {
        gameSettingsRef.current = gameSettings;

        const mountOn = gameSettings.mountEnabled !== false;
        mountEnabledRef.current = mountOn;
        if (playerRef.current) {
            const mountGroup = playerRef.current.getObjectByName('mount');
            if (mountGroup) mountGroup.visible = mountOn;
            if (playerRef.current.userData) playerRef.current.userData.mountVisible = mountOn;
        }

        if (mpUpdateAppearanceRef.current && penguinDataRef.current) {
            mpUpdateAppearanceRef.current({
                ...penguinDataRef.current,
                mountEnabled: mountOn,
                greenCandlesEnabled: gameSettings.greenCandlesEnabled === true
            });
        }
    }, [gameSettings]);
    const mobileControlsRef = useRef({ forward: false, back: false, left: false, right: false });
    const pinchRef = useRef({ startDist: 0, active: false });
    

    useEffect(() => {
        if (!mountRef.current || !window.THREE) return;

        // New room / world rebuild — drop stale mesh handles from the previous scene
        setMeshBuilderReady(false);
        buildPenguinMeshRef.current = null;
        lastRoomNotifyRef.current = { room: null, x: null, z: null };
        mobileControlsRef.current = { forward: false, back: false, left: false, right: false };
        joystickInputRef.current = { x: 0, y: 0 };
        jumpRequestedRef.current = false;
        for (const [, data] of otherPlayerMeshesRef.current) {
            if (data.goldRainSystem) data.goldRainSystem.dispose();
        }
        otherPlayerMeshesRef.current.clear();
        
        // Hoist event handler references so cleanup can access them even when init is deferred
        let handleDown, handleUp, handleResize;
        let initCancelled = false;
        let deferTimeout = null;
        
        // PERF: progress reporting + cooperative yielding for the chunked world build.
        // Each yield returns control to the browser between build phases so the loading
        // screen paints, animates, and shows the advert instead of one long freeze.
        const reportLoadProgress = (progress) => {
            try {
                window.dispatchEvent(new CustomEvent('worldLoadProgress', { detail: { progress } }));
            } catch { /* non-critical */ }
        };
        // Throws on cancellation so deeply nested chunked builders (rooms/zones) abort
        // without every caller needing its own check. Caught at the initWorld() call site.
        const loadYield = async (progress) => {
            if (progress !== undefined) reportLoadProgress(progress);
            await new Promise(resolve => { setTimeout(resolve, 0); });
            if (initCancelled) throw new Error('world-load-cancelled');
        };
        // Creates a yield function that creeps progress from `from` to `to` over
        // ~`estimatedSteps` calls — used by batched spawns (props, trees, AI penguins).
        const makeYieldRange = (from, to, estimatedSteps) => {
            let p = from;
            const step = (to - from) / Math.max(1, estimatedSteps);
            return () => {
                p = Math.min(to, p + step);
                return loadYield(p);
            };
        };
        
        // Defer heavy world init so the loading screen paints first. A rAF alone is NOT
        // enough — rAF callbacks run BEFORE the browser paints that frame — so we hop
        // through a macrotask, guaranteeing one painted frame before the first chunk runs.
        const deferTimer = requestAnimationFrame(() => {
            deferTimeout = setTimeout(() => {
                if (!initCancelled) {
                    initWorld().catch(err => {
                        if (!initCancelled && err?.message !== 'world-load-cancelled') {
                            console.error('World init failed:', err);
                        }
                    });
                }
            }, 0);
        });
        
        async function initWorld() {
        await performanceManager.ensureAutoPreset();
        const loopGeneration = ++updateLoopGenerationRef.current;

        const THREE = window.THREE;
        const OrbitControls = window.THREE.OrbitControls;
        
        // Setup
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        // Arctic sky - deeper blue to match icy ground
        scene.background = new THREE.Color('#6AA8C8'); // Icy arctic sky
        
        // OPTIMIZATION: Initialize reusable vectors
        tempVec3Ref.current = new THREE.Vector3();
        tempOffsetRef.current = new THREE.Vector3();
        
        // OPTIMIZATION: Cache commonly used geometries/materials to avoid creating in render loop
        if (!window._cachedSparkGeo) {
            window._cachedSparkGeo = new THREE.SphereGeometry(0.02, 4, 4);
        }
        if (!window._cachedSnowballGeoLarge) {
            window._cachedSnowballGeoLarge = new THREE.SphereGeometry(0.18, 8, 8);
            window._cachedSnowballGeoSmall = new THREE.SphereGeometry(0.15, 8, 8);
            window._cachedSnowballMatLarge = new THREE.MeshBasicMaterial({ color: 0xffffff });
            window._cachedSnowballMatSmall = new THREE.MeshBasicMaterial({ color: 0xffffff });
            window._cachedSplatGeo = new THREE.CircleGeometry(0.4, 12);
            console.log('⚡ Cached snowball and splat geometries');
        }
        
        // Initialize wizard trail particle system
        wizardTrailSystemRef.current = new WizardTrailSystem(THREE, scene);
        
        // Initialize Gake candle trail system (green trading candles)
        gakeCandleTrailSystemRef.current = new GakeCandleTrailSystem(THREE, scene);
        
        // Initialize mount trail system (icy trails, etc.)
        mountTrailSystemRef.current = new MountTrailSystem(THREE, scene);
        
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
        cameraRef.current = camera;
        // Default 50% more zoomed in (was 15, -15 which is ~21.2 distance, now ~11.3)
        camera.position.set(0, 8, -8);
        
        // ==================== DEVICE DETECTION ====================
        // Detect device types for performance optimizations
        const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isMacDesktop = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
                            navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
        const isAndroidDevice = /Android/i.test(navigator.userAgent);
        
        // All Apple devices get optimizations (Mac desktop + iOS)
        const isAppleDevice = isIOSDevice || isMacDesktop;
        
        // Mobile devices need GPU optimizations (iOS + Android phones/tablets)
        // Desktop (PC/Mac) can handle full quality
        const isMobileGPU = isIOSDevice || isAndroidDevice;
        
        // Store detection globally for other components to use
        window._isMacDevice = isAppleDevice; // Keep same name for compatibility
        window._isIOSDevice = isIOSDevice;
        window._isAppleDevice = isAppleDevice;
        window._isAndroidDevice = isAndroidDevice;
        window._isMobileGPU = isMobileGPU;
        
        // Log for debugging
        console.log('🖥️ Platform:', navigator.platform, '| isApple:', isAppleDevice, '| isIOS:', isIOSDevice, '| isAndroid:', isAndroidDevice, '| isMobileGPU:', isMobileGPU);
        
        // ==================== RENDERER SETTINGS ====================
        // Mobile devices (Apple/Android) always use optimized settings
        // PC uses performance manager preset (can be changed by user)
        const isMobile = isAppleDevice || isAndroidDevice;
        const needsOptimization = isMobile; // Keep for backward compat
        
        // Bootstrap WebGL context (antialias off) — preset DPR/shadows applied below and on live changes
        const rendererOptions = performanceManager.getBootstrapRendererOptions(isAppleDevice, isAndroidDevice);
        
        const renderer = new THREE.WebGLRenderer(rendererOptions);
        performanceManager.applyRendererTuning(renderer, THREE, null, isMobile);
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Mobile: flat rendering (faster), fixes Metal rendering issues
        if (isMobile) {
            renderer.toneMapping = THREE.NoToneMapping;
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            if (isAndroidDevice) {
                console.log('🤖 Android device detected - applied GPU optimizations: antialias=false, dpr=1.0, mediump precision');
            } else if (isMacDesktop) {
                console.log('🍎 Mac desktop detected - applied Metal/Safari optimizations: antialias=false, dpr=1.0, mediump precision, flat rendering');
            } else {
                console.log('🍎 iOS device detected - applied GPU optimizations: antialias=false, dpr=1.0, mediump precision');
            }
        } else {
            const settings = performanceManager.getSettings();
            const dpr = performanceManager.getDPR(isMobile);
            const privacyNote = performanceManager._needsPrivacyBrowserOpts()
                ? (window._isOperaBrowser ? ' [Opera optimizations]' : ' [Brave optimizations]')
                : '';
            console.log(`🎮 PC Performance: "${settings.name}" preset (DPR=${dpr}, bootstrap antialias=false, shadows=${settings.shadowType})${privacyNote}`);
        }
        
        renderer.shadowMap.enabled = true;
        if (isMobile) {
            console.log('📱 Mobile: Using BasicShadowMap for better performance');
        }
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        readLiveWebGLInfo(renderer);
        
        // Initialize raycaster for player click detection
        raycasterRef.current = new THREE.Raycaster();
        
        const clock = new THREE.Clock();
        clockRef.current = clock;

        // Controls - OrbitControls for traditional drag-to-rotate and scroll-to-zoom
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;  // Smooth damping
        controls.minDistance = 5;
        controls.maxDistance = 50;
        controls.maxPolarAngle = Math.PI / 2 - 0.1; // Initial value - dynamically updated by CameraController based on player elevation
        controls.minPolarAngle = 0.02;              // Allow looking almost straight up when zoomed in
        controls.enablePan = false;
        controls.rotateSpeed = 0.5;     // Slower rotation for smoother feel
        controls.zoomSpeed = 0.8;       // Smooth zoom
        controlsRef.current = controls;
        
        // Initialize smooth camera controller (works alongside OrbitControls)
        const cameraController = new CameraController(THREE, camera, controls);
        cameraControllerRef.current = cameraController;
        
        // Window resize handler (important for iOS URL bar showing/hiding)
        handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);
        // Also listen for orientation change on mobile
        window.addEventListener('orientationchange', () => {
            // Delay to let iOS finish orientation animation
            setTimeout(handleResize, 100);
        });

        // Lighting - Arctic daylight (cool, icy blue tones)
        // Removed hemisphere light that was causing ground glares
        const ambient = new THREE.AmbientLight(0xC0E0F0, 0.5); // Cool icy ambient
        scene.add(ambient);
        ambientLightRef.current = ambient;
        
        const sunLight = new THREE.DirectionalLight(0xF8F8FF, 1.0); // Cold bright sun
        sunLight.position.set(80, 100, 60);
        sunLight.castShadow = true;
        // Shadow map size from performance preset (capped at 1024 on desktop — pre-tuning behavior)
        const shadowMapSize = needsOptimization
            ? 512
            : performanceManager.getWorldShadowMapSize(false);
        sunLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        sunLight.shadow.bias = -0.0005; // Reduce shadow acne
        scene.add(sunLight);
        sunLightRef.current = sunLight;
        
        // ==================== SNOWFALL PARTICLE SYSTEM ====================
        // Apple (Mac + iOS) + Android: use reduced particles for performance
        const snowfallSystem = new SnowfallSystem(THREE, scene, { isMobileGPU: needsOptimization });
        snowfallSystem.create({ x: posRef.current?.x || 50, z: posRef.current?.z || 50 });
        snowfallSystemRef.current = snowfallSystem;
        
        // --- ICY ICEBERG ISLAND GENERATION ---
        // Built in chunks (async) — yields between heavy phases keep the page responsive
        const generateCity = async () => {
            const map = [];
            const dummy = new THREE.Object3D();
            
            // Icy color palette kept for map tile typing
            const WATER_ARCTIC = '#1A4A6A';
            const WATER_DEEP = '#0A3A5A';
            
            // All tiles are now ice (type 2) - no water, walls handle boundaries
            for(let x=0; x<CITY_SIZE; x++) {
                map[x] = [];
                for(let z=0; z<CITY_SIZE; z++) {
                    map[x][z] = 2; // All ice ground - walls handle boundaries
                }
            }
            
            mapRef.current = map;
            
            // Textured ice sheet — cracks, frost, drift (matches forest/snow fort ground quality)
            const GROUND_EXTEND = 50;
            const groundWidth = CITY_SIZE * BUILDING_SCALE + GROUND_EXTEND;
            const groundDepth = CITY_SIZE * BUILDING_SCALE + GROUND_EXTEND * 2;

            const iceTex = createTownIceGroundTexture(THREE);
            const iceGeo = new THREE.PlaneGeometry(groundWidth, groundDepth);
            iceGeo.rotateX(-Math.PI / 2);

            const iceMat = new THREE.MeshStandardMaterial({
                map: iceTex,
                color: 0x9ec8e0,
                roughness: 0.88,
                metalness: 0.02,
            });

            const icePlane = new THREE.Mesh(iceGeo, iceMat);
            // Position: shifted west slightly to cover extended area, centered on original zone
            icePlane.position.set(
                CITY_SIZE/2 * BUILDING_SCALE - GROUND_EXTEND / 2, 
                0, 
                CITY_SIZE/2 * BUILDING_SCALE
            );
            icePlane.receiveShadow = true;
            icePlane.renderOrder = 0;
            icePlane.name = 'world_ground';
            scene.add(icePlane);
            
            // ==================== MOUNTAIN BACKGROUND ====================
            await loadYield(0.2);
            if (initCancelled) return null;
            // Create low-poly mountain range surrounding the map (3 rows for depth)
            try {
                mountainBackgroundRef.current = createMountainBackground(THREE, scene, getOverworldMountainConfig('town'));
            } catch (err) {
                console.warn('Failed to create mountain background:', err);
            }
            
            // ==================== SPAWN TOWN CENTER PROPS ====================
            await loadYield(0.3);
            // Create TownCenter room instance and spawn all props (trees, igloos, lamps, etc.)
            // in small batches so no single block can trigger "Page Unresponsive"
            const townCenter = new TownCenter(THREE);
            townCenterRef.current = townCenter;
            const { meshes: propMeshes, lights: propLights, collisionSystem } =
                await townCenter.spawnChunked(scene, makeYieldRange(0.3, 0.42, 22));
            
            // Store prop lights for day/night cycle toggling
            propLightsRef.current = propLights;
            
            console.log(`Town Center spawned: ${propMeshes.length} props, ${propLights.length} lights`);
            
            // ==================== ICE FISHING SYSTEM ====================
            // Initialize fishing system with spots from TownCenter
            if (townCenter.fishingSpots && townCenter.fishingSpots.length > 0) {
                if (!iceFishingSystemRef.current) {
                    iceFishingSystemRef.current = new IceFishingSystem(THREE, scene);
                }
                iceFishingSystemRef.current.initForTown(townCenter.fishingSpots, scene);
                // Set players ref for positioning catch bubbles above players
                iceFishingSystemRef.current.setPlayersRef(() => playersDataRef.current);
                fetchFishingHoles?.();
                if (!woodcuttingSystemRef.current) {
                    woodcuttingSystemRef.current = new WoodcuttingSystem();
                }
            }

            // ==================== IGLOO OCCUPANCY BUBBLES ====================
            // Create occupancy indicator sprites above each igloo
            const townCenterX = CENTER_X;
            const townCenterZ = CENTER_Z;
            
            // 10 unique igloos - each has its own room
            // igloo3 is SKNY GANG nightclub-themed igloo
            const iglooData = [
                { id: 'igloo1', x: -75, z: -75, room: 'igloo1' },
                { id: 'igloo2', x: -50, z: -78, room: 'igloo2' },
                { id: 'igloo3', x: -25, z: -75, room: 'igloo3' },   // SKNY GANG nightclub
                { id: 'igloo4', x: 25, z: -75, room: 'igloo4' },
                { id: 'igloo5', x: 50, z: -78, room: 'igloo5' },
                { id: 'igloo6', x: 75, z: -75, room: 'igloo6' },
                { id: 'igloo7', x: -70, z: -15, room: 'igloo7' },
                { id: 'igloo8', x: -40, z: -18, room: 'igloo8' },
                { id: 'igloo9', x: 40, z: -18, room: 'igloo9' },
                { id: 'igloo10', x: 70, z: -15, room: 'igloo10' },
            ];
            
            // Clear any existing sprites
            iglooOccupancySpritesRef.current.forEach(sprite => {
                if (sprite.parent) sprite.parent.remove(sprite);
            });
            iglooOccupancySpritesRef.current.clear();
            
            // Create sprite for each igloo with unique MapleStory-style banners
            // Use igloo data from IglooContext if available
            iglooData.forEach((igloo, index) => {
                // Get server-side igloo state if available
                const serverIglooData = getIgloo ? getIgloo(igloo.id) : null;
                const sprite = createIglooOccupancySprite(THREE, 0, index, serverIglooData); // Pass igloo state
                sprite.position.set(
                    townCenterX + igloo.x,
                    10, // Higher above igloo for bigger banners
                    townCenterZ + igloo.z
                );
                sprite.userData.iglooId = igloo.id;
                sprite.userData.iglooRoom = igloo.room;
                sprite.userData.iglooX = townCenterX + igloo.x;
                sprite.userData.iglooZ = townCenterZ + igloo.z;
                sprite.userData.iglooIndex = index; // Store index for style
                sprite.visible = false; // Start hidden, show when player is close
                scene.add(sprite);
                iglooOccupancySpritesRef.current.set(igloo.id, sprite);
            });
            
            console.log(`Created ${iglooOccupancySpritesRef.current.size} igloo occupancy sprites`);
            
            // ==================== LORD FISHNU LORE SPRITE ====================
            // Create lore banner above the holy fish sculpture
            if (lordFishnuSpriteRef.current) {
                scene.remove(lordFishnuSpriteRef.current);
            }
            
            const fishnuCanvas = document.createElement('canvas');
            const fw = 400;
            const fh = 280;
            fishnuCanvas.width = fw;
            fishnuCanvas.height = fh;
            const fctx = fishnuCanvas.getContext('2d');
            
            // Clear
            fctx.clearRect(0, 0, fw, fh);
            
            // Draw fish-styled banner background
            const cornerRadius = 20;
            const gradient = fctx.createLinearGradient(0, 0, 0, fh);
            gradient.addColorStop(0, 'rgba(0, 60, 100, 0.95)');
            gradient.addColorStop(0.5, 'rgba(0, 40, 80, 0.95)');
            gradient.addColorStop(1, 'rgba(0, 20, 60, 0.95)');
            
            fctx.beginPath();
            fctx.moveTo(cornerRadius, 0);
            fctx.lineTo(fw - cornerRadius, 0);
            fctx.quadraticCurveTo(fw, 0, fw, cornerRadius);
            fctx.lineTo(fw, fh - cornerRadius);
            fctx.quadraticCurveTo(fw, fh, fw - cornerRadius, fh);
            fctx.lineTo(cornerRadius, fh);
            fctx.quadraticCurveTo(0, fh, 0, fh - cornerRadius);
            fctx.lineTo(0, cornerRadius);
            fctx.quadraticCurveTo(0, 0, cornerRadius, 0);
            fctx.closePath();
            fctx.fillStyle = gradient;
            fctx.fill();
            
            // Golden border
            fctx.strokeStyle = '#FFD700';
            fctx.lineWidth = 4;
            fctx.stroke();
            
            // Inner glow border
            fctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            fctx.lineWidth = 2;
            fctx.beginPath();
            fctx.moveTo(cornerRadius + 8, 8);
            fctx.lineTo(fw - cornerRadius - 8, 8);
            fctx.quadraticCurveTo(fw - 8, 8, fw - 8, cornerRadius + 8);
            fctx.lineTo(fw - 8, fh - cornerRadius - 8);
            fctx.quadraticCurveTo(fw - 8, fh - 8, fw - cornerRadius - 8, fh - 8);
            fctx.lineTo(cornerRadius + 8, fh - 8);
            fctx.quadraticCurveTo(8, fh - 8, 8, fh - cornerRadius - 8);
            fctx.lineTo(8, cornerRadius + 8);
            fctx.quadraticCurveTo(8, 8, cornerRadius + 8, 8);
            fctx.closePath();
            fctx.stroke();
            
            // Fish emoji decorations
            fctx.font = '20px Arial';
            fctx.textAlign = 'center';
            fctx.fillText('🐟', 25, 28);
            fctx.fillText('🐟', fw - 25, 28);
            fctx.fillText('🐠', 25, fh - 18);
            fctx.fillText('🐠', fw - 25, fh - 18);
            
            // Title
            fctx.font = 'bold 28px Georgia, serif';
            fctx.textAlign = 'center';
            fctx.textBaseline = 'middle';
            fctx.fillStyle = '#FFD700';
            fctx.shadowColor = '#000';
            fctx.shadowBlur = 4;
            fctx.shadowOffsetX = 2;
            fctx.shadowOffsetY = 2;
            fctx.fillText('⚜️ LORD FISHNU ⚜️', fw / 2, 38);
            
            // Subtitle
            fctx.font = 'italic 14px Georgia, serif';
            fctx.fillStyle = '#87CEEB';
            fctx.shadowBlur = 2;
            fctx.fillText('Guardian of the Frozen Seas', fw / 2, 62);
            
            // Lore text
            fctx.shadowBlur = 0;
            fctx.shadowOffsetX = 0;
            fctx.shadowOffsetY = 0;
            fctx.font = '12px Arial';
            fctx.fillStyle = '#E0E0E0';
            fctx.textAlign = 'left';
            
            const loreLines = [
                'In the Great Thaw of Year 42, when the',
                'Shark Armies besieged Waddle Island,',
                'Lord Fishnu rose from the depths to',
                'defend our beloved land.',
                '',
                'With his Divine Tail Slap, he scattered',
                'a thousand predators. His golden eyes',
                'see all who trade with pure hearts.',
                '',
                '🌊 "May your bags pump eternal" 🌊',
            ];
            
            loreLines.forEach((line, i) => {
                if (line.includes('🌊')) {
                    fctx.font = 'italic 13px Georgia, serif';
                    fctx.fillStyle = '#FFD700';
                    fctx.textAlign = 'center';
                    fctx.fillText(line, fw / 2, 90 + i * 17);
                } else {
                    fctx.font = '12px Arial';
                    fctx.fillStyle = '#E0E0E0';
                    fctx.textAlign = 'left';
                    fctx.fillText(line, 25, 90 + i * 17);
                }
            });
            
            const fishnuTexture = new THREE.CanvasTexture(fishnuCanvas);
            const fishnuMaterial = new THREE.SpriteMaterial({ 
                map: fishnuTexture, 
                depthTest: false, 
                depthWrite: false,
                transparent: true
            });
            const fishnuSprite = new THREE.Sprite(fishnuMaterial);
            
            // Position above Lord Fishnu statue
            const fishnuStatueX = townCenterX - 52.5;
            const fishnuStatueZ = townCenterZ + 54.7;
            fishnuSprite.position.set(fishnuStatueX, 12, fishnuStatueZ);
            
            // Scale the sprite
            const fscale = 0.03;
            fishnuSprite.scale.set(fw * fscale, fh * fscale, 1);
            fishnuSprite.renderOrder = 998;
            fishnuSprite.visible = false; // Start hidden, show when player is close
            
            scene.add(fishnuSprite);
            lordFishnuSpriteRef.current = fishnuSprite;
            console.log('🐟 Created Lord Fishnu lore sprite');
            
            return { butterflyGroup: null, townCenter }; // No butterflies in arctic
        };
        
        // Generate scenery based on current room
        let roomData = null;
        let butterflyGroup = null;
        
        if (room === 'town') {
            reportLoadProgress(0.1);
            const cityResult = await generateCity();
            if (initCancelled || !cityResult) return;
            butterflyGroup = cityResult.butterflyGroup;
            const townCenterX = CENTER_X;
            const townCenterZ = CENTER_Z;
            
            // Park bench positions (matching TownCenter.js propPlacements)
            const C = townCenterX; // CENTER = 110
            const benchSnapPoints = [{ x: -0.6, z: 0 }, { x: 0, z: 0 }, { x: 0.6, z: 0 }];
            const parkBenches = [
                // T-stem walkway benches
                { x: C - 22, z: C + 20, rotation: Math.PI / 2 },
                { x: C + 22, z: C + 20, rotation: -Math.PI / 2 },
                { x: C - 22, z: C + 45, rotation: Math.PI / 2 },
                { x: C + 22, z: C + 45, rotation: -Math.PI / 2 },
                // T-bar walkway benches (south edge)
                { x: C - 35, z: C - 22, rotation: Math.PI },
                { x: C + 35, z: C - 22, rotation: Math.PI },
                { x: C - 65, z: C - 22, rotation: Math.PI },
                { x: C + 65, z: C - 22, rotation: Math.PI },
                // T-bar walkway benches (north edge)
                { x: C - 35, z: C - 68, rotation: 0 },
                { x: C + 35, z: C - 68, rotation: 0 },
                { x: C - 65, z: C - 68, rotation: 0 },
                { x: C + 65, z: C - 68, rotation: 0 },
                // Benches near buildings
                { x: C - 55, z: C + 48, rotation: -Math.PI / 2 },
                { x: C + 55, z: C + 48, rotation: Math.PI / 2 },
            ].map(b => ({
                type: 'bench',
                position: { x: b.x, z: b.z },
                rotation: b.rotation,
                seatHeight: 0.8,
                platformHeight: 0,
                snapPoints: benchSnapPoints,
                interactionRadius: 2.5
            }));
            
            // Christmas tree benches (4 benches in circle around tree)
            const treeX = C + 43.2;
            const treeZ = C + 6.8;
            const treeBenchRadius = 8;
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const benchX = treeX + Math.cos(angle) * treeBenchRadius;
                const benchZ = treeZ + Math.sin(angle) * treeBenchRadius;
                const flipRotation = (i === 0 || i === 2) ? Math.PI : 0;
                parkBenches.push({
                    type: 'bench',
                    position: { x: benchX, z: benchZ },
                    rotation: angle + Math.PI / 2 + flipRotation,
                    seatHeight: 0.8,
                    platformHeight: 0,
                    snapPoints: benchSnapPoints,
                    interactionRadius: 2.5
                });
            }
            
            // Garden park benches (4 benches in circle around fountain, facing inward)
            // Matches TownCenter.js garden_park placement: x: C + 36, z: C + 81, radius: 10
            const gardenParkX = C + 36;
            const gardenParkZ = C + 81;
            const gardenParkRadius = 10;
            const gardenBenchRadius = gardenParkRadius - 1.8; // Same as Park.js
            const gardenBenchCount = 4;
            for (let i = 0; i < gardenBenchCount; i++) {
                const angle = (i / gardenBenchCount) * Math.PI * 2 + Math.PI / gardenBenchCount;
                const benchX = gardenParkX + Math.cos(angle) * gardenBenchRadius;
                const benchZ = gardenParkZ + Math.sin(angle) * gardenBenchRadius;
                // Rotate 180 degrees from original to face inward toward fountain
                const benchRotation = -angle + Math.PI / 2 + Math.PI;
                parkBenches.push({
                    type: 'bench',
                    position: { x: benchX, z: benchZ },
                    rotation: benchRotation,
                    seatHeight: 0.8,
                    platformHeight: 0,
                    snapPoints: benchSnapPoints,
                    interactionRadius: 2.5
                });
            }
            
            // Campfire log seats (6 logs in circle around campfire, facing inward)
            const campfireX = C;
            const campfireZ = C + 10;
            const seatRadius = 5.5;
            const logSeats = [];
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const seatX = campfireX + Math.cos(angle) * seatRadius;
                const seatZ = campfireZ + Math.sin(angle) * seatRadius;
                // Rotation faces the campfire (angle + PI points toward center)
                const needsFlip = (i === 1 || i === 2 || i === 4 || i === 5);
                const flipOffset = needsFlip ? Math.PI : 0;
                logSeats.push({
                    type: 'log',
                    position: { x: seatX, z: seatZ },
                    rotation: angle + Math.PI / 2 + flipOffset,
                    seatHeight: 0.5,
                    platformHeight: 0,
                    snapPoints: [{ x: -0.6, z: 0 }, { x: 0.6, z: 0 }], // Along log length
                    interactionRadius: 2.5,
                    bidirectionalSit: true // Sit from either side, face based on approach
                });
            }
            
            roomData = {
                bounds: null, // Town uses wall collision
                spawnPos: { x: townCenterX, z: townCenterZ + 85 }, // South of dojo, facing north
                furniture: [
                    // Nightclub roof couch
                    {
                        type: 'couch',
                        position: { x: townCenterX, z: townCenterZ - 75 },
                        rotation: 0,
                        seatHeight: 13 + 0.95,
                        platformHeight: 13,
                        snapPoints: [
                            { x: -1.5, z: 0 },
                            { x: 0, z: 0 },
                            { x: 1.5, z: 0 }
                        ],
                        interactionRadius: 3
                    },
                    // All park benches
                    ...parkBenches,
                    // Campfire log seats
                    ...logSeats
                ]
            };
        } else if (room === 'snow_forts') {
            reportLoadProgress(0.1);
            snowFortsZoneRef.current = null;
            forestTrailsZoneRef.current = null;
            townCenterRef.current = null;
            const loaderRefs = {
                townCenterRef,
                snowFortsZoneRef,
                forestTrailsZoneRef,
                forestTreeManagerRef,
                mountainBackgroundRef,
                propLightsRef,
            };
            await loadSnowFortsQuadrant(THREE, scene, loaderRefs, makeYieldRange(0.1, 0.85, 8));
            if (initCancelled) return;
            const sf = snowFortsZoneRef.current;
            if (sf?.casinoBounds && snowfallSystemRef.current) {
                snowfallSystemRef.current.addExclusionZone({
                    ...sf.casinoBounds,
                    roofHeight: 14,
                });
            }
            if (sf?.casinoLobbySlots?.length > 0) {
                if (!goldLobbySlotSystemRef.current) {
                    goldLobbySlotSystemRef.current = new GoldLobbySlotSystem();
                }
                goldLobbySlotSystemRef.current.init(
                    sf.casinoLobbySlots,
                    sf.casinoLobbySlotDisplays || []
                );
            }
            if (sf?.fishingSpots?.length > 0) {
                if (!iceFishingSystemRef.current) {
                    iceFishingSystemRef.current = new IceFishingSystem(THREE, scene);
                }
                iceFishingSystemRef.current.initForTown(sf.fishingSpots, scene);
                iceFishingSystemRef.current.setPlayersRef(() => playersDataRef.current);
                fetchFishingHoles?.();
                if (!starterRodPickupRef.current) {
                    starterRodPickupRef.current = new StarterRodPickup();
                }
                starterRodPickupRef.current.init(scene, THREE, buildPartMergedRef.current);
            }
            roomData = {
                name: 'snow_forts',
                furniture: [
                    ...(sf?.getFurniture() || []),
                    ...(sf?.getCasinoFurniture() || []),
                ],
            };
        } else if (room === 'forest_trails') {
            reportLoadProgress(0.1);
            snowFortsZoneRef.current = null;
            townCenterRef.current = null;
            const loaderRefs = {
                townCenterRef,
                snowFortsZoneRef,
                forestTrailsZoneRef,
                forestTreeManagerRef,
                mushroomClusterManagerRef,
                mountainBackgroundRef,
                propLightsRef,
            };
            await loadForestQuadrant(
                THREE,
                scene,
                loaderRefs,
                makeYieldRange(0.1, 0.85, 14),
                fetchForestTrees,
                forestTrees,
                mushroomClusters
            );
            fetchMushrooms?.();
            if (initCancelled) return;
            if (!woodcuttingSystemRef.current) {
                woodcuttingSystemRef.current = new WoodcuttingSystem();
            }
            woodcuttingSystemRef.current.setForestTreeManager(forestTreeManagerRef.current);
            const fz = forestTrailsZoneRef.current;
            roomData = {
                name: 'forest_trails',
                furniture: fz?.getFurniture?.() || [],
            };
        } else if (room === 'dojo') {
            // Simple collision map for dojo
            const map = [];
            for(let x = 0; x < 10; x++) {
                map[x] = [];
                for(let z = 0; z < 10; z++) map[x][z] = 2;
            }
            mapRef.current = map;
            roomData = generateDojoInterior(THREE, scene);
        } else if (room === 'pizza') {
            // Simple collision map for pizza
            const map = [];
            for(let x = 0; x < 10; x++) {
                map[x] = [];
                for(let z = 0; z < 10; z++) map[x][z] = 2;
            }
            mapRef.current = map;
            roomData = generatePizzaInterior(THREE, scene);
        } else if (room === 'nightclub') {
            // Generate nightclub interior - all room data is in Nightclub.js
            const nightclub = new Nightclub(THREE);
            nightclub.spawn(scene);
            nightclubRef.current = nightclub;
            roomData = nightclub.getRoomData();
        } else if (room === 'casino_game_room') {
            // Generate casino game room interior
            const casinoRoom = new CasinoRoom(THREE);
            casinoRoom.spawn(scene);
            casinoRoomRef.current = casinoRoom;
            roomData = casinoRoom.getRoomData();
            if (!slotMachineSystemRef.current && sceneRef.current) {
                slotMachineSystemRef.current = new SlotMachineSystem(THREE, sceneRef.current);
            }
            if (slotMachineSystemRef.current) {
                slotMachineSystemRef.current.initForCasino(roomData.roomWidth, roomData.roomDepth, sceneRef.current);
            }
            
            // Initialize jackpot celebration system (disco ball, confetti, lasers)
            if (!jackpotCelebrationRef.current && sceneRef.current) {
                jackpotCelebrationRef.current = new JackpotCelebration(
                    THREE, 
                    sceneRef.current, 
                    roomData.roomWidth, 
                    roomData.roomDepth, 
                    roomData.roomHeight || 20
                );
            }
        } else if (isTravelLobbyRoom(room)) {
            travelLobbyRef.current = new TravelLobbyRoom(THREE, myTravelVoyage);
            roomData = travelLobbyRef.current.spawn(scene);
        } else if (room.startsWith('igloo')) {
            // igloo3 is SKNY GANG nightclub-themed igloo
            if (room === 'igloo3') {
                roomData = generateSKNYIglooInterior(THREE, scene);
                // Store update function for SKNY interior animations
                sknyIglooInteriorRef.current = roomData;
            } else {
                roomData = generateIglooInterior(THREE, scene);
            }
            mapRef.current = roomData.map;
            // Request ball sync from server when entering igloo
            if (mpRequestBallSync) {
                setTimeout(() => mpRequestBallSync(), 100);
            }
        }
        
        // Store roomData in ref for multiplayer access
        roomDataRef.current = roomData;
        
        // Update roomRef for collision checks
        roomRef.current = room;
        
        const spawnPuffleMesh = (puffleObj, ownerPosition) => {
            if (!puffleObj) return null;
            
            // Set puffle's internal position first (slightly offset from owner)
            const offsetX = ownerPosition.x + 1.5;
            const offsetZ = ownerPosition.z + 1.5;
            puffleObj.position = { x: offsetX, y: 0, z: offsetZ };
            
            // Create mesh (will use puffle's internal position)
            const mesh = puffleObj.createMesh(THREE);
            mesh.position.set(offsetX, 0.5, offsetZ);
            scene.add(mesh);
            puffleObj.mesh = mesh;
            
            return mesh;
        };
        
        // Helper function to update puffle emote bubble texture
        const updatePuffleEmoteBubble = (sprite, emoji) => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Draw bubble background
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(64, 54, 50, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw bubble pointer
            ctx.beginPath();
            ctx.moveTo(50, 95);
            ctx.lineTo(64, 115);
            ctx.lineTo(78, 95);
            ctx.fill();
            
            // Draw border
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(64, 54, 50, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw emoji
            ctx.font = '48px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 64, 54);
            
            // Update texture
            const texture = new THREE.CanvasTexture(canvas);
            sprite.material.map = texture;
            sprite.material.needsUpdate = true;
        };
        
        // Store the helper function in a ref for use in the game loop
        window._updatePuffleEmoteBubble = updatePuffleEmoteBubble;
        
        // --- PORTAL MARKERS (Town only) ---
        const centerX = CENTER_X;
        const centerZ = CENTER_Z;
        
        // Only generate town buildings in town room
        if (room !== 'town') {
            // Skip building generation for non-town rooms
        } else {
        
        // Create building label sprite
        const createLabelSprite = (text, emoji = '') => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 80;
            const ctx = canvas.getContext('2d');
            
            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.roundRect(0, 0, 256, 80, 10);
            ctx.fill();
            
            // Emoji
            ctx.font = '32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(emoji, 128, 30);
            
            // Text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(text, 128, 60);
            
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(6, 2, 1);
            return sprite;
        };

        // Build high-quality procedural buildings using extracted building classes,
        // one building per chunk (dojo/gift shop/pizza parlor builds are heavy)
        await loadYield(0.62);
        const buildingYield = makeYieldRange(0.62, 0.72, BUILDINGS.length);
        
        // Reset portal list — entries reference meshes from this init; without this,
        // re-inits (room changes) accumulate stale entries pointing at dead scenes.
        portalsRef.current = [];
        townBuildingBannersRef.current = [];
        
        for (const building of BUILDINGS) {
            let buildingGroup;
            const { w, h, d } = building.size;
            
            // Use standalone building classes for high-quality building generation
            if (building.id === 'dojo') {
                buildingGroup = createDojo(THREE, { w, h, d });
            } else if (building.id === 'puffle_shop') {
                buildingGroup = createGiftShop(THREE, { w, h, d });
            } else if (building.id === 'plaza') {
                buildingGroup = createPizzaParlor(THREE, { w, h, d });
            } else {
                // Fallback to simple building
                buildingGroup = new THREE.Group();
                const wallGeo = new THREE.BoxGeometry(w, h, d);
                const wallMat = new THREE.MeshStandardMaterial({ color: building.wallColor || 0x808080 });
                const walls = new THREE.Mesh(wallGeo, wallMat);
                walls.position.y = h / 2;
                walls.castShadow = true;
                walls.receiveShadow = true;
                buildingGroup.add(walls);
            }
            
            // Building labels removed for cleaner voxel world look
            // The buildings are recognizable by their architecture (dojo, pizza, puffle shop)
            
            // Add interactive glow for buildings with games
            if (building.gameId) {
                const glowGeo = new THREE.CircleGeometry(2, 16);
                const glowMat = new THREE.MeshBasicMaterial({ 
                    color: 0x44ff44,
                    transparent: true,
                    opacity: 0.4
                });
                const glow = new THREE.Mesh(glowGeo, glowMat);
                glow.rotation.x = -Math.PI / 2;
                glow.position.set(0, 0.05, d / 2 + 3);
                glow.name = `door_glow_${building.id}`;
                buildingGroup.add(glow);
            }
            
            // Position building in world
            buildingGroup.position.set(
                centerX + building.position.x,
                0,
                centerZ + building.position.z
            );
            
            // Apply building rotation (for T-street layout)
            if (building.rotation) {
                buildingGroup.rotation.y = building.rotation;
            }
            
            scene.add(buildingGroup);
            buildingGroup.traverse((child) => {
                if (child.userData?.isBuildingBanner) {
                    townBuildingBannersRef.current.push(child);
                }
            });
            
            // Calculate door position based on rotation
            const doorOffset = building.size.d / 2 + 1.5;
            const rot = building.rotation || 0;
            const doorX = centerX + building.position.x + Math.sin(rot) * doorOffset;
            const doorZ = centerZ + building.position.z + Math.cos(rot) * doorOffset;
            
            // Store building mesh for visuals and portal detection
            portalsRef.current.push({ 
                ...building, 
                mesh: buildingGroup,
                doorPosition: {
                    x: doorX,
                    z: doorZ
                },
                radius: building.doorRadius
            });
            
            await buildingYield();
        }
        } // End town-only building generation
        
        // --- PENGUIN BUILDER (extracted to PenguinBuilder.js) ---
        const penguinBuilder = createPenguinBuilder(THREE);
        const { buildPenguinMesh, buildPartMerged } = penguinBuilder;
        
        // Store buildPenguinMesh for multiplayer to use
        buildPenguinMeshRef.current = buildPenguinMesh;
        buildPartMergedRef.current = buildPartMerged;

        if (!worldDropManagerRef.current) {
            worldDropManagerRef.current = new WorldDropManager();
        }
        worldDropManagerRef.current.init(scene, THREE, buildPartMerged);
        worldDropManagerRef.current.applySnapshot(worldDropsRef.current || []);

        // Spawn world merchant NPCs as permanent room props
        if (room === 'town' && townCenterRef.current) {
            if (!worldNpcManagerRef.current) {
                worldNpcManagerRef.current = new WorldNpcManager(THREE);
            }
            worldNpcManagerRef.current.attachToRoom(
                scene,
                buildPenguinMesh,
                townCenterRef.current.collisionSystem,
                townCenterRef.current.propMeshes,
                'town'
            );
            console.log('🐧 World merchant NPCs attached to town');
        } else if (room === 'snow_forts' && snowFortsZoneRef.current) {
            if (!worldNpcManagerRef.current) {
                worldNpcManagerRef.current = new WorldNpcManager(THREE);
            }
            worldNpcManagerRef.current.attachToRoom(
                scene,
                buildPenguinMesh,
                snowFortsZoneRef.current.collisionSystem,
                snowFortsZoneRef.current.meshes,
                'snow_forts',
                SnowFortsZone.CENTER,
                SnowFortsZone.CENTER
            );
            console.log('🐧 World merchant NPCs attached to snow forts');
        } else if (room === 'forest_trails' && forestTrailsZoneRef.current) {
            if (!worldNpcManagerRef.current) {
                worldNpcManagerRef.current = new WorldNpcManager(THREE);
            }
            worldNpcManagerRef.current.attachToRoom(
                scene,
                buildPenguinMesh,
                forestTrailsZoneRef.current.collisionSystem,
                forestTrailsZoneRef.current.meshes,
                'forest_trails',
                ForestTrailsZone.CENTER,
                ForestTrailsZone.CENTER
            );
            console.log('🐧 World merchant NPCs attached to forest trails');
        }

        // Ferry captain NPCs at overworld zone docks
        const overworldRooms = ['town', 'snow_forts', 'forest_trails'];
        if (overworldRooms.includes(room)) {
            if (!travelNpcManagerRef.current) {
                travelNpcManagerRef.current = new TravelNpcManager(THREE);
            }
            let collisionSystem = null;
            let propMeshes = null;
            if (room === 'town' && townCenterRef.current) {
                collisionSystem = townCenterRef.current.collisionSystem;
                propMeshes = townCenterRef.current.propMeshes;
            } else if (room === 'snow_forts' && snowFortsZoneRef.current) {
                collisionSystem = snowFortsZoneRef.current.collisionSystem;
                propMeshes = snowFortsZoneRef.current.meshes;
            } else if (room === 'forest_trails' && forestTrailsZoneRef.current) {
                collisionSystem = forestTrailsZoneRef.current.collisionSystem;
                propMeshes = forestTrailsZoneRef.current.meshes;
            }
            if (collisionSystem) {
                travelNpcManagerRef.current.attachToRoom(
                    scene,
                    room,
                    buildPenguinMesh,
                    collisionSystem,
                    propMeshes
                );
                fetchTravelState?.();
                console.log(`⛴️ Travel NPCs attached to ${room}`);
            }
        }
        
        // OPTIMIZATION: Cache animated cosmetic parts to avoid traverse() every frame
        // This function should be called once after building a mesh
        const cacheAnimatedParts = (mesh) => {
            if (!mesh) return null;
            
            const cache = {
                propellerBlades: null,
                smokeEmitter: null,
                laserEyes: null,
                fireEyes: null,
                wings: [],
                fireAura: null,
                lightningAura: null,
                fireEmitter: null,
                breathFire: null,
                breathIce: null,
                bubblegum: null,
                // Animated skin colors (cosmic, galaxy, rainbow, nebula)
                animatedSkin: null,
                cosmicStars: [],
                animatedSkinGlow: null
            };
            
            mesh.traverse(child => {
                if (child.name === 'propeller_blades') cache.propellerBlades = child;
                if (child.userData?.isSmokeEmitter) cache.smokeEmitter = child;
                if (child.userData?.isLaserEyes) cache.laserEyes = child;
                if (child.userData?.isFireEyes) cache.fireEyes = child;
                if (child.userData?.isWings) cache.wings.push(child);
                if (child.userData?.isFireAura) cache.fireAura = child;
                if (child.userData?.isLightningAura) cache.lightningAura = child;
                if (child.userData?.isFireEmitter) cache.fireEmitter = child;
                if (child.userData?.isBreathFire) cache.breathFire = child;
                if (child.userData?.isBreathIce) cache.breathIce = child;
                if (child.userData?.isBubblegum) cache.bubblegum = child;
                // Animated feathers
                if (child.userData?.isAuroraEmitter) cache.auroraEmitter = child;
                if (child.userData?.isCrystalEmitter) cache.crystalEmitter = child;
                if (child.userData?.isVoidEmitter) cache.voidEmitter = child;
                // Animated skin data
                if (child.userData?.animatedSkin) cache.animatedSkin = child.userData.animatedSkin;
                if (child.userData?.isCosmicStar) cache.cosmicStars.push(child);
                if (child.userData?.isCosmicStars) {
                    // Traverse stars group
                    child.children.forEach(star => {
                        if (star.userData?.isCosmicStar) cache.cosmicStars.push(star);
                    });
                }
                if (child.userData?.isAnimatedSkinGlow) cache.animatedSkinGlow = child;
            });
            
            return cache;
        };
        
        // OPTIMIZATION: Animate cosmetics using cached references instead of traverse
        const animateCosmeticsFromCache = (cache, time, delta) => {
            if (!cache) return;
            
            // Propeller blades
            if (cache.propellerBlades) {
                cache.propellerBlades.rotation.y += delta * 15;
            }
            
            // Smoke emitter (cigarette, pipe, cigar)
            if (cache.smokeEmitter) {
                cache.smokeEmitter.children.forEach((particle, i) => {
                    particle.position.y += delta * 2;
                    particle.position.x += Math.sin(time * 2 + i) * delta * 0.5;
                    const height = particle.position.y - (particle.userData.baseY || 0);
                    if (particle.material) {
                        particle.material.opacity = Math.max(0, 0.6 - height * 0.3);
                    }
                    if (height > 2) {
                        particle.position.y = particle.userData.baseY || 0;
                        particle.position.x = 0;
                        if (particle.material) particle.material.opacity = 0.6;
                    }
                });
            }
            
            // Laser eyes
            if (cache.laserEyes) {
                const intensity = 1 + Math.sin(time * 10) * 0.5;
                cache.laserEyes.children.forEach(light => {
                    if (light.isPointLight) light.intensity = intensity;
                });
            }
            
            // Fire eyes
            if (cache.fireEyes) {
                cache.fireEyes.children.forEach(eyeGroup => {
                    if (eyeGroup.children) {
                        eyeGroup.children.forEach((particle, i) => {
                            if (particle.isMesh) {
                                particle.position.y = (particle.userData.baseY || 0) + Math.sin(time * 15 + i) * 0.1 * VOXEL_SIZE;
                                particle.position.x = Math.sin(time * 12 + i * 2) * 0.05 * VOXEL_SIZE;
                                if (particle.material) particle.material.opacity = 0.7 + Math.sin(time * 20 + i) * 0.3;
                            }
                            if (particle.isPointLight) particle.intensity = 0.5 + Math.sin(time * 15) * 0.3;
                        });
                    }
                });
            }
            
            // Wings (angel/demon)
            cache.wings.forEach(child => {
                const phase = child.userData.wingPhase || 0;
                child.rotation.y = Math.sin(time * 6 + phase) * 0.3;
            });
            
            // Fire Aura
            if (cache.fireAura) {
                cache.fireAura.rotation.y = time * 2;
                cache.fireAura.children.forEach(flame => {
                    if (flame.userData?.isFlame) {
                        const offset = flame.userData.offset || 0;
                        flame.position.y = flame.userData.baseY + Math.sin(time * 8 + offset) * 0.3 * VOXEL_SIZE;
                        flame.scale.x = 0.8 + Math.sin(time * 10 + offset) * 0.3;
                        flame.scale.z = 0.8 + Math.cos(time * 10 + offset) * 0.3;
                    }
                });
                if (cache.fireAura.userData.fireLight) {
                    cache.fireAura.userData.fireLight.intensity = 1.5 + Math.sin(time * 12) * 0.5;
                }
            }
            
            // Lightning Aura
            if (cache.lightningAura) {
                cache.lightningAura.rotation.y = time * 3;
                cache.lightningAura.children.forEach(bolt => {
                    if (bolt.userData?.flickerOffset !== undefined) {
                        const flicker = Math.sin(time * 20 + bolt.userData.flickerOffset);
                        bolt.visible = flicker > -0.3;
                        if (bolt.material) bolt.material.opacity = 0.5 + flicker * 0.4;
                        bolt.position.y = Math.sin(time * 15 + bolt.userData.flickerOffset) * 0.5 * VOXEL_SIZE;
                    }
                });
                if (cache.lightningAura.userData.lightningLight) {
                    cache.lightningAura.userData.lightningLight.intensity = 1 + Math.random() * 1;
                }
            }
            
            // Fire Emitter (flaming crown)
            if (cache.fireEmitter) {
                cache.fireEmitter.children.forEach((particle, i) => {
                    particle.position.y += delta * 3;
                    particle.position.x = (particle.userData.baseX || 0) + Math.sin(time * 8 + i) * 0.15;
                    particle.position.z = (particle.userData.baseZ || 0) + Math.cos(time * 6 + i) * 0.15;
                    const height = particle.position.y - (particle.userData.baseY || 0);
                    if (particle.material) particle.material.opacity = Math.max(0, 0.9 - height * 0.15);
                    particle.scale.setScalar(Math.max(0.3, 1 - height * 0.1));
                    if (height > 5) {
                        particle.position.y = particle.userData.baseY || 0;
                        particle.scale.setScalar(1);
                        if (particle.material) particle.material.opacity = 0.9;
                    }
                });
            }
            
            // Fire breath
            if (cache.breathFire) {
                cache.breathFire.children.forEach(particle => {
                    particle.position.z += delta * 15;
                    particle.position.y += (Math.random() - 0.5) * delta * 2;
                    particle.position.x += (Math.random() - 0.5) * delta * 2;
                    const dist = particle.position.z - (particle.userData.baseZ || 0);
                    if (particle.material) particle.material.opacity = Math.max(0, 0.9 - dist * 0.1);
                    if (dist > 8) {
                        particle.position.z = particle.userData.baseZ || 0;
                        particle.position.y = 0;
                        particle.position.x = 0;
                        if (particle.material) particle.material.opacity = 0.9;
                    }
                });
            }
            
            // Ice breath
            if (cache.breathIce) {
                cache.breathIce.children.forEach((particle, i) => {
                    particle.position.z += delta * 12;
                    particle.position.y += Math.sin(time * 10 + i) * delta;
                    particle.position.x += Math.cos(time * 8 + i) * delta;
                    const dist = particle.position.z - (particle.userData.baseZ || 0);
                    if (particle.material) particle.material.opacity = Math.max(0, 0.8 - dist * 0.08);
                    if (dist > 10) {
                        particle.position.z = particle.userData.baseZ || 0;
                        particle.position.y = 0;
                        particle.position.x = 0;
                        if (particle.material) particle.material.opacity = 0.8;
                    }
                });
            }
            
            // Bubblegum
            if (cache.bubblegum) {
                const bubble = cache.bubblegum.children[0];
                if (bubble) {
                    const cycleTime = (time % 4) / 4;
                    let scale;
                    if (cycleTime < 0.8) scale = 0.5 + cycleTime * 2;
                    else if (cycleTime < 0.85) scale = 2.1 - (cycleTime - 0.8) * 30;
                    else scale = 0.5;
                    bubble.scale.setScalar(Math.max(0.3, scale));
                }
            }
            
            // ========== ANIMATED FEATHERS (ENHANCED) ==========
            
            // Aurora Feathers - Intense northern lights with trails
            if (cache.auroraEmitter) {
                cache.auroraEmitter.children.forEach((particle, i) => {
                    if (particle.userData.isRibbon) {
                        const angle = particle.userData.angle || 0;
                        const phase = particle.userData.phaseOffset || 0;
                        const baseY = particle.userData.baseY || 0;
                        const speed = particle.userData.speed || 1;
                        const wave = Math.sin(time * speed + phase) * 1.5;
                        particle.position.x = Math.cos(angle + time * 0.3) * (2 + wave * 0.5) * VOXEL_SIZE;
                        particle.position.z = Math.sin(angle + time * 0.3) * (1.5 + wave * 0.3) * VOXEL_SIZE - VOXEL_SIZE;
                        particle.position.y = baseY + Math.sin(time * speed * 1.5 + phase) * 1.2 * VOXEL_SIZE;
                        particle.rotation.y = time * 0.5 + phase;
                        particle.rotation.z = Math.sin(time * 2 + phase) * 0.3;
                        if (particle.material) {
                            const hue = (time * 0.15 + phase * 0.1) % 1;
                            particle.material.color.setHSL(hue * 0.3 + 0.35, 0.9, 0.55);
                            particle.material.opacity = 0.7 + Math.sin(time * 4 + phase) * 0.25;
                        }
                    } else if (particle.userData.isTrail) {
                        particle.userData.life += delta * particle.userData.speed;
                        const lifeRatio = particle.userData.life / particle.userData.maxLife;
                        if (lifeRatio >= 1) {
                            particle.userData.life = 0;
                            particle.position.x = particle.userData.baseX + (Math.random() - 0.5) * 2 * VOXEL_SIZE;
                            particle.position.y = 0;
                            particle.position.z = particle.userData.baseZ + (Math.random() - 0.5) * 2 * VOXEL_SIZE;
                        } else {
                            particle.position.y += delta * 3 * VOXEL_SIZE;
                            particle.position.x += Math.sin(time * 3 + i) * delta * 0.5 * VOXEL_SIZE;
                            if (particle.material) {
                                particle.material.opacity = (1 - lifeRatio) * 0.8;
                                const hue = (time * 0.2 + i * 0.05) % 1;
                                particle.material.color.setHSL(hue * 0.3 + 0.35, 0.85, 0.6);
                            }
                            particle.scale.setScalar(1 - lifeRatio * 0.5);
                        }
                    }
                });
            }
            
            // Crystal Feathers - Brilliant sparkle bursts
            if (cache.crystalEmitter) {
                cache.crystalEmitter.children.forEach((particle, i) => {
                    if (particle.userData.isShard) {
                        const twinkle = Math.sin(time * particle.userData.twinkleSpeed + particle.userData.twinkleOffset);
                        const twinkleNorm = (twinkle + 1) / 2;
                        const angle = particle.userData.angle || 0;
                        particle.position.x = Math.cos(angle + time * 0.2) * 1.5 * VOXEL_SIZE;
                        particle.position.z = Math.sin(angle + time * 0.2) * 1 * VOXEL_SIZE;
                        particle.position.y = particle.userData.baseY + Math.sin(time * 2 + i) * 0.3 * VOXEL_SIZE;
                        particle.rotation.y = time + angle;
                        particle.rotation.x = Math.sin(time * 1.5 + i) * 0.2;
                        if (particle.material) {
                            const hue = (time * 0.1 + particle.userData.twinkleOffset * 0.1) % 1;
                            particle.material.color.setHSL(hue, 0.2 + twinkleNorm * 0.3, 0.85 + twinkleNorm * 0.15);
                            particle.material.opacity = 0.7 + twinkleNorm * 0.3;
                        }
                        particle.scale.setScalar(0.8 + twinkleNorm * 0.4);
                    } else if (particle.userData.isSparkle) {
                        particle.userData.life += delta * 2;
                        const lifeRatio = particle.userData.life / particle.userData.maxLife;
                        if (lifeRatio >= 1) {
                            particle.userData.life = 0;
                            particle.position.set(0, VOXEL_SIZE, 0);
                            particle.userData.velocity = { x: (Math.random() - 0.5) * 3, y: 2 + Math.random() * 3, z: (Math.random() - 0.5) * 3 };
                        } else {
                            particle.position.x += particle.userData.velocity.x * delta * VOXEL_SIZE;
                            particle.position.y += particle.userData.velocity.y * delta * VOXEL_SIZE;
                            particle.position.z += particle.userData.velocity.z * delta * VOXEL_SIZE;
                            particle.userData.velocity.y -= delta * 2;
                            if (particle.material) {
                                particle.material.opacity = (1 - lifeRatio) * 0.9;
                                const hue = (time * 0.5 + i * 0.1) % 1;
                                particle.material.color.setHSL(hue, 0.5, 0.9);
                            }
                            particle.scale.setScalar(1 - lifeRatio * 0.7);
                        }
                    }
                });
            }
            
            // Void Feathers - Intense dark vortex
            if (cache.voidEmitter) {
                cache.voidEmitter.children.forEach((particle, i) => {
                    if (particle.userData.isTendril) {
                        const angle = particle.userData.angle || 0;
                        const baseY = particle.userData.baseY || 0;
                        const speed = particle.userData.speed || 1;
                        const currentAngle = angle + time * speed;
                        const radius = particle.userData.radius + Math.sin(time * 2) * 0.5;
                        particle.position.x = Math.cos(currentAngle) * radius * VOXEL_SIZE;
                        particle.position.z = Math.sin(currentAngle) * radius * VOXEL_SIZE - VOXEL_SIZE;
                        particle.position.y = baseY + Math.sin(time * speed + angle) * 1.5 * VOXEL_SIZE;
                        particle.rotation.y = currentAngle;
                        particle.rotation.x = Math.sin(time * 3) * 0.4;
                        if (particle.material) {
                            const pulse = Math.sin(time * 4 + angle) * 0.5 + 0.5;
                            particle.material.color.setHSL(0.78 + pulse * 0.08, 0.9, 0.25 + pulse * 0.15);
                            particle.material.opacity = 0.7 + pulse * 0.25;
                        }
                    } else if (particle.userData.isVortex) {
                        particle.userData.life += delta * particle.userData.spiralSpeed;
                        const lifeRatio = particle.userData.life % 1;
                        const angle = particle.userData.angle + time * particle.userData.speed;
                        const baseRadius = particle.userData.radius;
                        const currentRadius = baseRadius * (1 - lifeRatio * 0.8);
                        particle.position.x = Math.cos(angle + lifeRatio * Math.PI * 4) * currentRadius * VOXEL_SIZE;
                        particle.position.z = Math.sin(angle + lifeRatio * Math.PI * 4) * currentRadius * VOXEL_SIZE - VOXEL_SIZE;
                        particle.position.y = particle.userData.baseY + lifeRatio * 4 * VOXEL_SIZE;
                        if (particle.material) {
                            particle.material.opacity = (1 - lifeRatio * 0.7) * 0.8;
                            const hue = 0.75 + Math.sin(time * 2 + i) * 0.1;
                            particle.material.color.setHSL(hue, 0.85, 0.2 + lifeRatio * 0.2);
                        }
                        particle.scale.setScalar(1 - lifeRatio * 0.6);
                    }
                });
            }
            
            // Animated skin colors (cosmic, galaxy, rainbow, nebula)
            // Each body part has a phase offset for a flowing galaxy effect
            if (cache.animatedSkin && cache.animatedSkin.materials && cache.animatedSkin.materials.length > 0) {
                const skinConfig = cache.animatedSkin.config;
                if (skinConfig && skinConfig.colors) {
                    const baseT = time * skinConfig.speed;
                    const colorCount = skinConfig.colors.length;
                    
                    cache.animatedSkin.materials.forEach((mat, idx) => {
                        if (mat && mat.color) {
                            // Each material has its own phase offset for galaxy flow effect
                            // Use ?? instead of || so that phaseOffset=0 (for rainbow) is respected
                            const phaseOffset = mat.userData?.phaseOffset ?? (idx * 0.7);
                            const t = baseT + phaseOffset;
                            
                            // Interpolate between colors based on time + offset
                            const colorIndex = Math.abs(t) % colorCount;
                            const fromIdx = Math.floor(colorIndex) % colorCount;
                            const toIdx = (fromIdx + 1) % colorCount;
                            const blend = colorIndex - Math.floor(colorIndex);
                            
                            const fromColor = new THREE.Color(skinConfig.colors[fromIdx]);
                            const toColor = new THREE.Color(skinConfig.colors[toIdx]);
                            const currentColor = fromColor.clone().lerp(toColor, blend);
                            
                            mat.color.copy(currentColor);
                            if (mat.emissive) {
                                mat.emissive.copy(currentColor);
                                mat.emissiveIntensity = (skinConfig.emissive || 0.1) + Math.sin(t * 2) * 0.05;
                            }
                        }
                    });
                }
            }
            
            // Cosmic stars twinkling
            if (cache.cosmicStars && cache.cosmicStars.length > 0) {
                cache.cosmicStars.forEach(star => {
                    if (star && star.material && star.userData) {
                        // Each star twinkles at its own rate
                        const twinkle = Math.sin(time * (star.userData.twinkleSpeed || 1) + (star.userData.twinkleOffset || 0));
                        const twinkleNorm = (twinkle + 1) / 2; // Normalize to 0-1
                        
                        // Opacity pulsing
                        star.material.opacity = 0.4 + twinkleNorm * 0.6;
                        
                        // Emissive intensity pulsing for glow effect
                        star.material.emissiveIntensity = 0.6 + twinkleNorm * 0.8;
                        
                        // Subtle color temperature shift (warmer when bright)
                        const warmth = twinkleNorm * 0.15;
                        if (star.material.emissive) {
                            star.material.emissive.setRGB(0.7 + warmth, 0.75 + warmth * 0.5, 1.0);
                        }
                        
                        // Subtle size pulsing
                        const baseScale = star.userData.baseScale || 1;
                        const starScale = baseScale * (0.8 + twinkleNorm * 0.4);
                        star.scale.setScalar(starScale);
                    }
                });
            }
            
            // Animated skin glow light - follows the average color of animated materials
            if (cache.animatedSkinGlow && cache.animatedSkin && cache.animatedSkin.materials.length > 0) {
                // Get color from first material (they're all similar with slight offsets)
                const firstMat = cache.animatedSkin.materials[0];
                if (firstMat && firstMat.color) {
                    cache.animatedSkinGlow.color.copy(firstMat.color);
                    // Subtle pulse (reduced 80%)
                    const pulse = Math.sin(time * 2) * 0.06 + 0.06;
                    cache.animatedSkinGlow.intensity = 0.24 + pulse;
                }
            }
        };
        
        // --- BUILD PLAYER ---
        const playerWrapper = buildPenguinMesh(penguinDataRef.current || penguinData);
        playerRef.current = playerWrapper;
        playerWrapper.userData._animatedPartsCache = cacheAnimatedParts(playerWrapper);
        const heldEntry = getActiveHotbarEntry(gameInventory);
        if (heldEntry && buildPartMergedRef.current) {
            updateHeldGameItem(playerWrapper, buildPartMergedRef.current, heldEntry);
        }
        scene.add(playerWrapper);
        
        // Check if mount should be hidden based on settings (on initial load)
        try {
            const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
            if (settings.mountEnabled === false) {
                mountEnabledRef.current = false;
                const mountGroup = playerWrapper.getObjectByName('mount');
                if (mountGroup) {
                    mountGroup.visible = false;
                }
            }
        } catch (e) { /* ignore */ }
        
        // Spawn position: portal exit, session resume, or room default
        if (customSpawnPos) {
            if (customSpawnPos.absolute) {
                posRef.current = { x: customSpawnPos.x, y: customSpawnPos.y ?? 0, z: customSpawnPos.z };
            } else if (room === 'town' || room === 'snow_forts') {
                posRef.current = {
                    x: CENTER_X + customSpawnPos.x,
                    y: customSpawnPos.y ?? 0,
                    z: CENTER_Z + customSpawnPos.z,
                };
            } else {
                posRef.current = {
                    x: customSpawnPos.x,
                    y: customSpawnPos.y ?? 0,
                    z: customSpawnPos.z,
                };
            }
        } else if (sessionResumeRef?.current) {
            const resumed = getResumePosition(
                room,
                isAuthenticatedRef.current,
                userDataRef.current
            );
            if (resumed) {
                posRef.current = resumed;
                console.log(`✅ Restored session position in ${room}:`, resumed);
            } else if (room === 'town') {
                posRef.current = { x: CENTER_X, y: 0, z: CENTER_Z };
                rotRef.current = 0;
            } else if (room === 'snow_forts' || room === 'forest_trails') {
                posRef.current = { ...OVERWORLD_CENTER_SPAWN };
                rotRef.current = 0;
            } else if (room === WORLD_SPAWN_ROOM) {
                posRef.current = { x: WORLD_SPAWN.x, y: 0, z: WORLD_SPAWN.z };
                rotRef.current = 0;
            } else if (roomData?.spawnPos) {
                posRef.current = {
                    x: roomData.spawnPos.x,
                    y: roomData.spawnPos.y ?? 0,
                    z: roomData.spawnPos.z
                };
            } else {
                posRef.current = { x: WORLD_SPAWN.x, y: 0, z: WORLD_SPAWN.z };
                rotRef.current = 0;
            }
            sessionResumeRef.current = false;
        } else if (room === 'town') {
            posRef.current = { x: CENTER_X, y: 0, z: CENTER_Z };
            rotRef.current = 0;
        } else if (room === 'snow_forts' || room === 'forest_trails') {
            posRef.current = { ...OVERWORLD_CENTER_SPAWN };
            rotRef.current = 0;
        } else if (room === WORLD_SPAWN_ROOM) {
            posRef.current = { x: WORLD_SPAWN.x, y: 0, z: WORLD_SPAWN.z };
            rotRef.current = 0;
        } else if (roomData && roomData.spawnPos) {
            posRef.current = {
                x: roomData.spawnPos.x,
                y: roomData.spawnPos.y ?? 0,
                z: roomData.spawnPos.z
            };
        } else {
            posRef.current = { x: WORLD_SPAWN.x, y: 0, z: WORLD_SPAWN.z };
            rotRef.current = 0;
        }

        if (isTravelLobbyRoom(room)) {
            const clamped = clampTravelLobbyPosition(posRef.current.x, posRef.current.z);
            posRef.current.x = clamped.x;
            posRef.current.z = clamped.z;
            posRef.current.y = posRef.current.y ?? 0;
        }
        
        // CRITICAL: Sync mesh position with posRef IMMEDIATELY after spawn logic
        // This ensures first-time players don't spawn at (0,0,0) before game loop runs
        if (playerRef.current) {
            playerRef.current.position.set(posRef.current.x, posRef.current.y, posRef.current.z);
            playerRef.current.rotation.y = rotRef.current;
        }

        // Multiplayer mesh builders are ready only after spawn position is finalized
        setMeshBuilderReady(true);

        // Spawn player puffle if equipped (ensure it's a Puffle instance)
        if (puffle) {
            // If puffle is not a proper Puffle instance, recreate it
            let puffleInstance = puffle;
            if (!(puffle instanceof Puffle) || typeof puffle.tick !== 'function') {
                puffleInstance = new Puffle({
                    id: puffle.id,
                    name: puffle.name || 'Puffle',
                    color: puffle.color || 'blue',
                    happiness: puffle.happiness,
                    energy: puffle.energy,
                    hunger: puffle.hunger
                });
            }
            const mesh = spawnPuffleMesh(puffleInstance, posRef.current);
            playerPuffleRef.current = puffleInstance;
            playerPuffleRef.current.mesh = mesh;
        }
        
        // --- INITIALIZE/RESTORE AI AGENTS ---
        // (own load chunk — builds a penguin mesh per NPC)
        await loadYield(0.75);
        if (initCancelled) return;
        // Performance: AI_AGENT_COUNT cap, no NPC puffles, exclude animated cosmetics (see roomConfig)
        const AI_ENABLED = AI_NPC_ENABLED;
        
        if (AI_ENABLED && aiAgentsRef.current.length === 0) {
            const skins = Object.keys(PALETTE).filter(k => !['floorLight','floorDark','wood','rug','glass','beerGold','mirrorFrame','mirrorGlass', 'asphalt', 'roadLine', 'buildingBrickRed', 'buildingBrickYellow', 'buildingBrickBlue', 'windowLight', 'windowDark', 'grass', 'snow', 'water', 'waterDeep', 'butterfly1', 'butterfly2', 'butterfly3'].includes(k));
            const hatPool = Object.keys(ASSETS.HATS).filter(k => !AI_HEAVY_HATS.has(k));
            const bodyPool = Object.keys(ASSETS.BODY).filter(k => !ASSETS.BODY[k]?.hideBody && !AI_HEAVY_BODY.has(k));
            const eyePool = Object.keys(ASSETS.EYES).filter(k => !AI_HEAVY_EYES.has(k));
            const mouthPool = Object.keys(ASSETS.MOUTH).filter(k => !AI_HEAVY_MOUTH.has(k));
            const pick = (arr, fallback) => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : fallback);

            // First time - create AI agents (limited count for frame budget),
            // yielding every few penguins (each buildPenguinMesh is a full voxel build)
            const aiNamesToSpawn = AI_NAMES.slice(0, AI_AGENT_COUNT);
            const aiYield = makeYieldRange(0.76, 0.84, Math.ceil(aiNamesToSpawn.length / 3));
            for (let i = 0; i < aiNamesToSpawn.length; i++) {
                const name = aiNamesToSpawn[i];
                const aiData = {
                    skin: pick(skins, 'blue'),
                    hat: pick(hatPool, 'none'),
                    eyes: pick(eyePool, 'normal'),
                    mouth: pick(mouthPool, 'beak'),
                    bodyItem: pick(bodyPool, 'none')
                };
                
                // Store appearance data for mesh rebuilding
                const aiMesh = buildPenguinMesh(aiData);
                
                // Town spawn - avoid spawning inside buildings, water, or out of bounds
                let sx, sz;
                let spawnAttempts = 0;
                let validSpawn = false;
                
                do {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 10 + Math.random() * 20; // Spawn in middle area
                    sx = centerX + Math.cos(angle) * dist;
                    sz = centerZ + Math.sin(angle) * dist;
                    
                    validSpawn = true;
                    
                    // Check map bounds (stay away from edges/water)
                    const gridX = Math.floor(sx / BUILDING_SCALE);
                    const gridZ = Math.floor(sz / BUILDING_SCALE);
                    if (gridX < 3 || gridX >= CITY_SIZE - 3 || gridZ < 3 || gridZ >= CITY_SIZE - 3) {
                        validSpawn = false;
                    }
                    
                    // Check against all buildings (with larger margin)
                    if (validSpawn) {
                        for (const building of BUILDINGS) {
                            const bx = centerX + building.position.x;
                            const bz = centerZ + building.position.z;
                            const hw = building.size.w / 2 + 4; // Larger margin
                            const hd = building.size.d / 2 + 4;
                            
                            if (sx > bx - hw && sx < bx + hw && sz > bz - hd && sz < bz + hd) {
                                validSpawn = false;
                                break;
                            }
                        }
                    }
                    
                    spawnAttempts++;
                } while (!validSpawn && spawnAttempts < 20);
                
                aiMesh.position.set(sx, 0, sz);
                scene.add(aiMesh);

                let aiPuffle = null;
                if (AI_SPAWN_PUFFLES && Math.random() < 0.2) {
                    const puffleColors = Object.keys(Puffle.COLORS);
                    const randomColor = puffleColors[Math.floor(Math.random() * puffleColors.length)];
                    aiPuffle = new Puffle({ 
                        color: randomColor, 
                        name: `${name}'s Puffle`
                    });
                    spawnPuffleMesh(aiPuffle, { x: sx, y: 0, z: sz });
                    aiPufflesRef.current.push({ id: i, puffle: aiPuffle });
                }

                aiAgentsRef.current.push({
                    id: i,
                    name: name,
                    aiData: aiData, // Store for rebuilding mesh
                    mesh: aiMesh,
                    pos: { x: sx, y: 0, z: sz },
                    rot: Math.random() * Math.PI * 2,
                    currentRoom: 'town',
                    action: 'idle',
                    conversationCooldown: 0,
                    conversationPartner: null,
                    conversationScript: null,
                    conversationLineIdx: 0,
                    conversationTurn: false,
                    target: null,
                    actionTimer: Date.now() + 2000 + Math.random() * 5000, // Stagger initial actions
                    emoteType: null,
                    emoteStart: 0,
                    bubble: null,
                    bubbleTimer: 0,
                    roomTransitionCooldown: Date.now() + 10000 + Math.random() * 20000, // Initial room stability
                    stuckCounter: 0,
                    lastRoomChange: Date.now()
                });
                
                if ((i + 1) % 3 === 0) await aiYield();
            }
        } else if (AI_ENABLED) {
            // Room changed - rebuild AI meshes and add to new scene
            aiAgentsRef.current.forEach(ai => {
                // Rebuild mesh using stored appearance data
                const newMesh = buildPenguinMesh(ai.aiData);
                newMesh.position.set(ai.pos.x, 0, ai.pos.z);
                newMesh.rotation.y = ai.rot;
                // Show only if AI is in the same room as player
                newMesh.visible = (ai.currentRoom === room);
                scene.add(newMesh);
                ai.mesh = newMesh;
                ai.bubble = null; // Clear old bubble reference
            });
            
            // Rebuild AI puffle meshes
            aiPufflesRef.current.forEach(entry => {
                if (entry.puffle) {
                    const puffleMesh = entry.puffle.createMesh(THREE);
                    puffleMesh.position.set(entry.puffle.position.x, 0.5, entry.puffle.position.z);
                    // Find the AI owner - O(n) is okay here, only runs on room change
                    const owner = aiAgentsRef.current.find(a => a.id === entry.id);
                    puffleMesh.visible = owner ? (owner.currentRoom === room) : false;
                    scene.add(puffleMesh);
                    entry.puffle.mesh = puffleMesh;
                }
            });
        }
        
        // --- SENSEI PENGUIN (Dojo only) ---
        if (room === 'dojo') {
            const senseiData = {
                skin: 'grey',
                hat: 'sensei',
                eyes: 'normal',
                mouth: 'beard',
                bodyItem: 'none'
            };
            const senseiMesh = buildPenguinMesh(senseiData);
            // 25% bigger than normal penguins
            senseiMesh.scale.set(1.25, 1.25, 1.25);
            // Cushion is at y=0.2, sensei sits on top of it
            senseiMesh.position.set(0, 0.4, -12);
            senseiMesh.name = 'sensei_penguin';
            scene.add(senseiMesh);
        }
        
        // --- BLACKJACK DEALER PENGUINS (Casino Game Room only) ---
        if (room === 'casino_game_room' && roomData?.blackjackDealers) {
            blackjackDealersRef.current = [];
            
            roomData.blackjackDealers.forEach((dealerPos, idx) => {
                const dealerData = {
                    skin: 'black',
                    hat: 'tophat',
                    eyes: 'cool',
                    mouth: 'beak',
                    bodyItem: 'bowtie'
                };
                const dealerMesh = buildPenguinMesh(dealerData);
                // Slightly larger dealer penguins
                dealerMesh.scale.set(1.1, 1.1, 1.1);
                dealerMesh.position.set(dealerPos.x, 0.05, dealerPos.z);
                dealerMesh.rotation.y = dealerPos.rotation;
                dealerMesh.name = `blackjack_dealer_${dealerPos.tableId}`;
                dealerMesh.userData.tableId = dealerPos.tableId;
                dealerMesh.userData.tableX = dealerPos.tableX;
                dealerMesh.userData.tableZ = dealerPos.tableZ;
                scene.add(dealerMesh);
                
                blackjackDealersRef.current.push(dealerMesh);
                console.log(`🎰 Blackjack dealer spawned at table ${dealerPos.tableId}`);
            });
        }

        // --- INPUT HANDLING ---
        handleDown = (e) => {
            const activeElement = document.activeElement;
            const isInputFocused = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';

            // Handle Escape key for any input
            if (isInputFocused && e.code === 'Escape') {
                activeElement.blur();
                return;
            }

            // Enter / Slash always open chat — including during arcade and other overlays
            if (e.code === 'Enter' || (e.code === 'Slash' && !e.shiftKey)) {
                const chatInput = document.getElementById('chat-input-field');
                if (chatInput) {
                    if (activeElement === chatInput) {
                        if (e.code === 'Enter') {
                            return;
                        }
                        if (e.code === 'Slash') {
                            return;
                        }
                    }
                    if (isInputFocused && activeElement !== chatInput) {
                        return;
                    }
                    chatInput.focus();
                    if (e.code === 'Slash' && !e.shiftKey) {
                        e.preventDefault();
                    }
                    return;
                }
            }

            // Skip movement/game keys when arcade minigame is active
            if (arcadeGameActiveRef.current) {
                return;
            }
            
            // Don't process game keys if an input is focused
            if (isInputFocused) {
                return;
            }

            // HUD buttons must not steal Space / WASD after a mouse click
            releaseHudFocusForGameKey(e.code, { preventDefault: () => e.preventDefault() });
            
            keysRef.current[e.code] = true;
            
            if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                if (emoteRef.current.type) {
                    emoteRef.current.type = null;
                    // Notify server that emote ended (important for continuous emotes like Sit/Breakdance)
                    mpSendEmote(null);
                    if (playerRef.current && playerRef.current.children[0]) {
                        const m = playerRef.current.children[0];
                        m.position.y = 0.8;
                        m.rotation.x = 0;
                        m.rotation.z = 0; // Reset Z rotation too (for Breakdance)
                    }
                }
            }

            // NOTE: E key for portal entry is handled in a separate useEffect (search: "Handle E key for portal entry")
            // This ensures proper dependency tracking and avoids duplicate handlers
            if(e.code === 'KeyT') {
                // Only open once when T is first pressed (not on repeat)
                if (!emoteWheelKeyHeld.current) {
                    emoteWheelKeyHeld.current = true;
                    setEmoteWheelOpen(true);
                    setEmoteWheelSelection(-1);
                    emoteSelectionRef.current = -1;
                }
            }
            if(e.code === 'F3') {
                // F3 toggles debug position panel (like Minecraft) - DEV ONLY
                e.preventDefault();
                // Only allow in development mode
                if (process.env.NODE_ENV !== 'production') {
                    setShowDebugPosition(prev => {
                        showDebugPositionRef.current = !prev;
                        return !prev;
                    });
                }
            }
            if(e.code === 'F4') {
                // F4 toggles performance debug panel - DEV ONLY
                e.preventDefault();
                if (process.env.NODE_ENV !== 'production') {
                    setShowPerfDebug(prev => {
                        showPerfDebugRef.current = !prev;
                        return !prev;
                    });
                }
            }
            
            // Snowball throwing mode - check configured keybind
            const snowballKey = gameSettingsRef.current?.keybinds?.snowballThrow || 'ShiftLeft';
            if (e.code === snowballKey || e.code === 'ShiftRight' && snowballKey === 'ShiftLeft') {
                isSnowballModeRef.current = true;
                setIsSnowballMode(true);
            }
        };
        handleUp = (e) => {
            keysRef.current[e.code] = false;
            
            // Release snowball mode
            const snowballKey = gameSettingsRef.current?.keybinds?.snowballThrow || 'ShiftLeft';
            if (e.code === snowballKey || e.code === 'ShiftRight' || e.code === 'ShiftLeft') {
                isSnowballModeRef.current = false;
                setIsSnowballMode(false);
            }
            
            // Skip emote wheel handling when arcade game is active
            if (arcadeGameActiveRef.current) {
                return;
            }
            
            if(e.code === 'KeyT') {
                // T released - close wheel and play selection if any
                emoteWheelKeyHeld.current = false;
                
                const idx = emoteSelectionRef.current;
                if (idx >= 0 && idx < EMOTE_WHEEL_ITEMS.length) {
                    triggerEmote(EMOTE_WHEEL_ITEMS[idx].id);
                }
                
                // Always close the wheel on T release
                setEmoteWheelOpen(false);
                setEmoteWheelSelection(-1);
                emoteSelectionRef.current = -1;
            }
        };
        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);
        
        // --- CACHED VALUES FOR GAME LOOP (calculated once, not every frame) ---
        // centerX and centerZ already declared above at line ~739
        const dojoBuilding = BUILDINGS[0];
        const dojoBxCached = centerX + dojoBuilding.position.x;
        const dojoBzCached = centerZ + dojoBuilding.position.z;
        const dojoHdCached = dojoBuilding.size.d / 2;
        
        // Reusable Maps for AI lookups (updated when AI list changes, not every frame)
        let puffleMap = new Map();
        let aiMap = new Map();
        const rebuildAIMaps = () => {
            puffleMap.clear();
            aiPufflesRef.current.forEach(entry => puffleMap.set(entry.id, entry));
            aiMap.clear();
            aiAgentsRef.current.forEach(ai => aiMap.set(ai.id, ai));
        };
        rebuildAIMaps(); // Initial build
        
        // --- GAME LOOP ---
        // Let a few frames + shader compile run before "world ready" so first interaction is smoother
        const MIN_FRAMES_BEFORE_WORLD_READY = 6;
        let frameCount = 0;
        
        // OPTIMIZATION: Cache device detection outside loop (runs once, not every frame)
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const rotSpeedMultiplier = isMobileDevice ? 2 : 4.5;
        
        // OPTIMIZATION: Pre-calculate constants
        const MAX_DELTA = 0.1;
        const BASE_SPEED = 10;
        const TERMINAL_VELOCITY = -25;
        
        // OPTIMIZATION: Cache reusable Vector3 objects to avoid GC pressure
        const _cachedCamForward = new THREE.Vector3();
        const _cachedCamRight = new THREE.Vector3();

        // OPTIMIZATION: Snowball collision scratch state — hoisted so the hot loop never
        // allocates and never walks the full scene graph per snowball per frame.
        const _snowballRaycaster = new THREE.Raycaster();
        const _snowballVelDir = new THREE.Vector3();
        const _snowballPrevPos = new THREE.Vector3();
        const _snowballHitNormal = new THREE.Vector3();
        const _snowballHitPoint = new THREE.Vector3();
        const _splatHitNormal = new THREE.Vector3();
        const _splatDefaultNormal = new THREE.Vector3(0, 0, 1);
        const _splatAlignQuat = new THREE.Quaternion();
        const _snowballCollidables = []; // Cached scene meshes, refreshed periodically while snowballs fly
        const _snowballScratch = []; // Per-snowball filtered list (excludes the thrower)
        const _mountTrailPos = { x: 0, z: 0 }; // Reused position object for trail updates
        const _casinoZoomOffset = new THREE.Vector3(); // Reused during casino zoom transitions

        // OPTIMIZATION: getObjectByName is a full subtree DFS. Mount groups/parts never change
        // after a mesh is built (rebuilds create a fresh wrapper + userData, which clears these
        // caches automatically), so memoize the lookups instead of walking the tree every frame.
        const getMountGroup = (wrapper) => {
            const cached = wrapper.userData._mountGroupCache;
            if (cached && cached.parent !== null) return cached;
            const g = wrapper.getObjectByName('mount') || null;
            wrapper.userData._mountGroupCache = g;
            return g;
        };
        const getMountPart = (group, name) => {
            const cache = group.userData._mountParts || (group.userData._mountParts = {});
            if (!(name in cache)) cache[name] = group.getObjectByName(name) || null;
            return cache[name];
        };

        // OPTIMIZATION: skateboard spark material pool. Spawning previously allocated a
        // MeshBasicMaterial per spark, and cleanup disposed the SHARED cached spark
        // geometry (forcing a GPU re-upload on the next spark). Pool materials instead.
        const _sparkMatPool = [];
        const acquireSparkMaterial = (color) => {
            const mat = _sparkMatPool.pop() || new THREE.MeshBasicMaterial({ transparent: true });
            mat.color.set(color);
            mat.opacity = 1;
            return mat;
        };
        const releaseSparkMaterial = (mat) => {
            if (_sparkMatPool.length < 50) _sparkMatPool.push(mat);
            else mat.dispose();
        };
        const _splatMatPool = [];
        const releaseSnowballMesh = (mesh) => {
            scene.remove(mesh);
            // Geometry/material are shared caches — never dispose per throw.
        };
        const acquireSplatMesh = () => {
            if (!window._cachedSplatGeo) {
                window._cachedSplatGeo = new THREE.CircleGeometry(0.4, 12);
            }
            const mat = _splatMatPool.pop() || new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -3,
                polygonOffsetUnits: -3,
            });
            mat.opacity = 0.8;
            const splat = new THREE.Mesh(window._cachedSplatGeo, mat);
            splat.renderOrder = 5;
            splat.scale.set(1, 1, 1);
            return splat;
        };
        const orientSplatToSurface = (splat, normal) => {
            _splatHitNormal.copy(normal);
            if (_splatHitNormal.lengthSq() < 1e-6) {
                _splatHitNormal.set(0, 1, 0);
            } else {
                _splatHitNormal.normalize();
            }
            _splatDefaultNormal.set(0, 0, 1);
            _splatAlignQuat.setFromUnitVectors(_splatDefaultNormal, _splatHitNormal);
            splat.quaternion.copy(_splatAlignQuat);
        };
        const releaseSplatMesh = (splat) => {
            scene.remove(splat);
            if (_splatMatPool.length < 24) {
                _splatMatPool.push(splat.material);
            } else {
                splat.material.dispose();
            }
        };
        let _snowballCollidablesFrame = -1000;
        const _snowballSurfaces = [];
        const _snowballRaycastTargets = [];
        const _isSnowballSurfaceMesh = (obj) => {
            if (!obj?.isMesh) return false;
            const n = obj.name;
            return n === 'gravel_path' || n === 'forest_path' || n === 'world_ground' ||
                n === 'snow_forts_ground' || n === 'forest_ground';
        };
        // Only collision-tagged props + player meshes — not every voxel face in town.
        const collectSnowballCollidables = (obj, ownerId, arr, inColliderSubtree = false) => {
            if (obj === playerRef.current) ownerId = '__local';
            else if (obj.userData?.isPlayer && obj.userData.playerId) ownerId = obj.userData.playerId;

            const inCollider = inColliderSubtree || !!obj.userData?.collision;
            const isPlayerMesh = !!(obj.userData?.isPlayer && obj.userData.playerId);

            if (obj.isMesh &&
                !obj.userData?.isSplat &&
                !obj.userData?.isSnowball &&
                !obj.userData?.isUI &&
                !obj.userData?.isParticle &&
                !obj.userData?.isBubble &&
                !obj.userData?.isNameTag &&
                (isPlayerMesh || inCollider)) {
                obj.userData._snowballOwner = ownerId;
                arr.push(obj);
            }
            const children = obj.children;
            for (let c = 0; c < children.length; c++) {
                collectSnowballCollidables(children[c], ownerId, arr, inCollider);
            }
        };
        const collectSnowballSurfaces = (obj, arr) => {
            if (_isSnowballSurfaceMesh(obj) &&
                !obj.userData?.isSplat &&
                !obj.userData?.isSnowball) {
                arr.push(obj);
            }
            const children = obj.children;
            for (let c = 0; c < children.length; c++) {
                collectSnowballSurfaces(children[c], arr);
            }
        };
        const computeRoomColliderHit = (pos, prevPos, colliders) => {
            if (!colliders?.length) return null;
            for (let c = 0; c < colliders.length; c++) {
                const col = colliders[c];
                const hw = col.hw ?? 0.5;
                const hd = col.hd ?? 0.5;
                const bottom = col.y ?? 0;
                const top = bottom + (col.height ?? col.hh * 2 ?? 2);
                if (pos.x >= col.x - hw && pos.x <= col.x + hw &&
                    pos.z >= col.z - hd && pos.z <= col.z + hd &&
                    pos.y >= bottom - 0.2 && pos.y <= top + 0.5) {
                    const faces = [
                        { nx: 1, ny: 0, nz: 0, dist: (col.x + hw) - pos.x },
                        { nx: -1, ny: 0, nz: 0, dist: pos.x - (col.x - hw) },
                        { nx: 0, ny: 0, nz: 1, dist: (col.z + hd) - pos.z },
                        { nx: 0, ny: 0, nz: -1, dist: pos.z - (col.z - hd) },
                        { nx: 0, ny: 1, nz: 0, dist: top - pos.y },
                        { nx: 0, ny: -1, nz: 0, dist: pos.y - bottom },
                    ];
                    const vx = pos.x - prevPos.x;
                    const vy = pos.y - prevPos.y;
                    const vz = pos.z - prevPos.z;
                    let bestScore = Infinity;
                    let nx = 0;
                    let ny = 1;
                    let nz = 0;
                    for (let f = 0; f < faces.length; f++) {
                        const face = faces[f];
                        const approach = vx * face.nx + vy * face.ny + vz * face.nz;
                        if (approach >= -0.0001) continue;
                        const score = face.dist - approach * 0.01;
                        if (score < bestScore) {
                            bestScore = score;
                            nx = face.nx;
                            ny = face.ny;
                            nz = face.nz;
                        }
                    }
                    if (bestScore === Infinity) {
                        for (let f = 0; f < faces.length; f++) {
                            if (faces[f].dist < bestScore) {
                                bestScore = faces[f].dist;
                                nx = faces[f].nx;
                                ny = faces[f].ny;
                                nz = faces[f].nz;
                            }
                        }
                    }
                    return {
                        y: Math.max(bottom, Math.min(pos.y, top)),
                        normal: _snowballHitNormal.set(nx, ny, nz),
                    };
                }
            }
            return null;
        };

        /** Query open-world zone collision for the active room only. */
        const querySnowballWorldCollision = (wx, wy, wz, pwx, pwy, pwz) => {
            const r = 0.18;
            const room = roomRef.current;
            if (room === 'town' && townCenterRef.current) {
                const hit = townCenterRef.current.collisionSystem.findProjectileHit(wx, wz, wy, r, pwx, pwz, pwy);
                if (hit) return hit;
            }
            if (room === 'snow_forts' && snowFortsZoneRef.current) {
                const hit = snowFortsZoneRef.current.collisionSystem.findProjectileHit(wx, wz, wy, r, pwx, pwz, pwy);
                if (hit) return hit;
            }
            if (room === 'forest_trails' && forestTrailsZoneRef.current) {
                const hit = forestTrailsZoneRef.current.collisionSystem.findProjectileHit(wx, wz, wy, r, pwx, pwz, pwy);
                if (hit) return hit;
            }
            if (mountainBackgroundRef.current?.checkCollision) {
                if (mountainBackgroundRef.current.checkCollision(wx, wz, 0.15)) {
                    return {
                        y: Math.max(0, wy),
                        normal: { x: 0, y: 1, z: 0 },
                    };
                }
            }
            return null;
        };
        
        const update = () => {
            if (loopGeneration !== updateLoopGenerationRef.current) return;
            reqRef.current = requestAnimationFrame(update);
            frameCount++;

            // Fullscreen minigames (fishing reel, arcade, blackjack) — skip world sim + render
            if (worldMinigameActiveRef.current) {
                clock.getDelta();
                return;
            }
            
            let delta = clock.getDelta();
            const time = clock.getElapsedTime(); 
            
            // CRITICAL: Clamp delta to prevent physics issues when tab loses focus
            if (delta > MAX_DELTA) {
                delta = MAX_DELTA;
            }
            performanceManager.recordFrame(delta);
            
            // Base speed with mount speed boost (pengu mount gives 5% boost)
            let speed = BASE_SPEED * delta;
            const mountData = playerRef.current?.userData?.mountData;
            if (mountData?.speedBoost && mountEnabledRef.current) {
                speed *= mountData.speedBoost;
            }
            // Apply mount trail effects (icy = speed boost + slippery)
            if (mountTrailSystemRef.current) {
                speed *= mountTrailSystemRef.current.getSpeedMultiplier();
            }
            const rotSpeed = rotSpeedMultiplier * delta;
            let moving = false;
            
            // Jump physics constants
            const GRAVITY = 30;
            const JUMP_VELOCITY = 12;
            const GROUND_Y = 0;
            
            // Check keyboard input (disabled during P2P match or arcade game)
            const inMatch = isInMatchRef.current;
            const inArcade = arcadeGameActiveRef.current;
            const inManualChop = manualChopActiveRef.current;
            // WASD for player movement, Arrow keys for camera rotation
            const keyForward = !inMatch && !inArcade && !inManualChop && keysRef.current['KeyW'];
            const keyBack = !inMatch && !inArcade && !inManualChop && keysRef.current['KeyS'];
            const keyLeft = !inMatch && !inArcade && !inManualChop && keysRef.current['KeyA'];
            const keyRight = !inMatch && !inArcade && !inManualChop && keysRef.current['KeyD'];
            const keyJump = !inMatch && !inArcade && !inManualChop && keysRef.current['Space'];
            
            // Arrow keys rotate camera (horizontal only)
            const arrowLeft = !inMatch && !inArcade && !inManualChop && keysRef.current['ArrowLeft'];
            const arrowRight = !inMatch && !inArcade && !inManualChop && keysRef.current['ArrowRight'];
            
            // Check mobile button input (legacy D-pad)
            const mobile = mobileControlsRef.current;
            const mobileForward = mobile.forward;
            const mobileBack = mobile.back;
            const mobileLeft = mobile.left;
            const mobileRight = mobile.right;
            const mobileJump = mobile.jump || jumpRequestedRef.current;
            
            // Check joystick input (new PUBG-style controls)
            const joystick = joystickInputRef.current;
            const joystickForward = !inMatch && !inManualChop && joystick.y > 0.1;
            const joystickBack = !inMatch && !inManualChop && joystick.y < -0.1;
            const joystickMagnitude = Math.sqrt(joystick.x * joystick.x + joystick.y * joystick.y);
            
            // Apply camera controller inputs
            const camController = cameraControllerRef.current;
            const camSensitivity = gameSettingsRef.current?.cameraSensitivity || 0.3;
            
            // Arrow key camera rotation
            if (camController && !inMatch && !inManualChop) {
                const arrowDir = (arrowLeft ? 1 : 0) - (arrowRight ? 1 : 0);
                camController.applyArrowKeyRotation(arrowDir);
            }
            
            // Touch/mouse camera rotation
            const camDelta = cameraRotationRef.current;
            if (camDelta.deltaX !== 0 || camDelta.deltaY !== 0) {
                if (camController && !inMatch && !inManualChop) {
                    camController.applyRotationInput(camDelta.deltaX, camDelta.deltaY, camSensitivity * 2);
                }
                // Reset in place — avoids allocating a new object every frame while dragging
                camDelta.deltaX = 0;
                camDelta.deltaY = 0;
            }
            
            // Handle jumping (with double jump/tricks for skateboard)
            const isMounted = !!(playerRef.current?.userData?.mount && playerRef.current?.userData?.mountData && mountEnabledRef.current);
            const isOnSkateboard = isMounted && playerRef.current?.userData?.mount === 'skateboard';
            
            if ((keyJump || mobileJump) && !inMatch) {
                if (isGroundedRef.current) {
                    // First jump
                    velRef.current.y = JUMP_VELOCITY;
                    isGroundedRef.current = false;
                    jumpRequestedRef.current = false;
                    // Enable double jump for skateboard
                    if (isOnSkateboard) {
                        canDoubleJumpRef.current = true;
                    }
                } else if (isOnSkateboard && canDoubleJumpRef.current && !isDoingTrickRef.current) {
                    // Double jump on skateboard - random trick with full height! 🛹
                    velRef.current.y = JUMP_VELOCITY; // Full jump height for sick air!
                    canDoubleJumpRef.current = false;
                    isDoingTrickRef.current = true;
                    trickProgressRef.current = 0;
                    // 50/50 chance: kickflip or 360 spin
                    trickTypeRef.current = Math.random() < 0.5 ? 'kickflip' : 'spin360';
                    jumpRequestedRef.current = false;
                }
            }
            
            // ALWAYS apply gravity - this ensures player falls when walking off ledges
            // Gravity will be counteracted by ground/surface collision detection
            velRef.current.y -= GRAVITY * delta;
            
            // Clamp terminal velocity to prevent falling through floors
            if (velRef.current.y < TERMINAL_VELOCITY) velRef.current.y = TERMINAL_VELOCITY;
            
            const anyMovementInput = keyForward || keyBack || keyLeft || keyRight || 
                                      mobileForward || mobileBack || mobileLeft || mobileRight ||
                                      joystickMagnitude > 0.1;
            
            // Clear AFK state when movement is detected
            if (anyMovementInput && isAfkRef.current) {
                isAfkRef.current = false;
                afkMessageRef.current = null;
                mpSendClearAfk?.();
                // Remove the AFK bubble
                if (playerRef.current && bubbleSpriteRef.current) {
                    playerRef.current.remove(bubbleSpriteRef.current);
                    bubbleSpriteRef.current = null;
                }
                setActiveBubble(null);
            }
            
            // Clear Fishnu respect message when movement is detected
            if (anyMovementInput && isFishnuRespectRef.current) {
                isFishnuRespectRef.current = false;
                fishnuRespectMessageRef.current = null;
                // Remove the bubble
                if (playerRef.current && bubbleSpriteRef.current) {
                    playerRef.current.remove(bubbleSpriteRef.current);
                    bubbleSpriteRef.current = null;
                }
                setActiveBubble(null);
            }
            
            // Clear emote when movement is detected (for mobile/joystick users)
            // Keyboard users are handled in keydown event
            if (anyMovementInput && emoteRef.current.type && (joystickMagnitude > 0.1 || mobileForward || mobileBack || mobileLeft || mobileRight)) {
                emoteRef.current.type = null;
                mpSendEmote(null); // Notify server
                if (playerRef.current && playerRef.current.children[0]) {
                    const m = playerRef.current.children[0];
                    m.position.y = 0.8;
                    m.rotation.x = 0;
                    m.rotation.z = 0;
                }
            }
            
            // If seated on bench/chair, check for movement to stand up
            if (seatedRef.current) {
                if (anyMovementInput) {
                    // Stand up - move to clear the seat
                    const seatData = seatedRef.current;
                    const benchRot = seatData.benchRotation || 0;
                    const dismountDist = seatData.dismountDist ?? 1.5;
                    
                    if (seatData.dismountOffset) {
                        posRef.current.x = seatData.worldPos.x + seatData.dismountOffset.x;
                        posRef.current.z = seatData.worldPos.z + seatData.dismountOffset.z;
                    } else {
                        // Check if we should dismount backwards (for bar stools facing counter)
                        // INVERTED: dismountBack=true now goes FORWARD (opposite of face direction)
                        const dismountBackward = seatData.dismountBack === true;
                        const direction = dismountBackward ? 1 : -1; // INVERTED: 1 = forwards (behind stool), -1 = backwards
                        
                        // Calculate dismount direction based on seat rotation
                        const offsetX = Math.sin(benchRot) * dismountDist * direction;
                        const offsetZ = Math.cos(benchRot) * dismountDist * direction;
                        
                        // Move player in dismount direction from seat
                        posRef.current.x = seatData.worldPos.x + offsetX;
                        posRef.current.z = seatData.worldPos.z + offsetZ;
                    }
                    
                    // Calculate dismount Y: stay at platform height if elevated, otherwise ground
                    // If seat has platformHeight (rooftop benches), stay at that height
                    const platformHeight = seatData.platformHeight || 0;
                    const dismountY = platformHeight > 0 ? platformHeight : 0;
                    posRef.current.y = dismountY;
                    velRef.current.y = 0; // Stop any vertical velocity
                    
                    // Update mesh position
                    if (playerRef.current) {
                        playerRef.current.position.x = posRef.current.x;
                        playerRef.current.position.z = posRef.current.z;
                        playerRef.current.position.y = dismountY;
                    }
                    
                    // Clear seated state
                    seatedRef.current = null;
                    setSeatedOnBench(null);
                    
                    // Clear sit emote
                    emoteRef.current.type = null;
                    mpSendEmote(null);
                    
                    // Reset penguin mesh position (inner body)
                    if (playerRef.current && playerRef.current.children[0]) {
                        const m = playerRef.current.children[0];
                        m.position.y = 0.8;
                        m.rotation.x = 0;
                    }
                } else {
                    // While seated (no movement input), don't move and maintain seat height
                    velRef.current.x = 0;
                    velRef.current.z = 0;
                    velRef.current.y = 0; // No vertical velocity while seated
                    
                    // Keep player at seat height
                    if (seatedRef.current && seatedRef.current.seatHeight) {
                        posRef.current.y = seatedRef.current.seatHeight;
                        if (playerRef.current) {
                            playerRef.current.position.y = seatedRef.current.seatHeight;
                        }
                    }
                }
            }
            else if (!emoteRef.current.type) {
                const isInAir = !isGroundedRef.current;
                
                // Handle rotation
                if (keyLeft || mobileLeft) rotRef.current += rotSpeed;
                if (keyRight || mobileRight) rotRef.current -= rotSpeed;
                
                // === GROUND MOVEMENT ===
                if (!isInAir) {
                    // Mobile Joystick: 2D plane movement - player faces direction of movement
                if (joystickMagnitude > 0.1 && !inMatch) {
                    const moveSpeed = speed * Math.min(joystickMagnitude, 1.0);
                        
                        // Get camera forward direction projected onto XZ plane
                        const camera = cameraRef.current;
                        if (camera) {
                            // Camera looks at player, so forward is from camera toward player
                            // OPTIMIZATION: Reuse cached vectors instead of creating new ones
                            camera.getWorldDirection(_cachedCamForward);
                            _cachedCamForward.y = 0; // Project onto XZ plane
                            _cachedCamForward.normalize();
                            
                            // Camera right vector (perpendicular to forward on XZ plane)
                            _cachedCamRight.set(-_cachedCamForward.z, 0, _cachedCamForward.x);
                            
                            // Calculate world movement direction from joystick input
                            // joystick.y = forward/back relative to camera, joystick.x = left/right
                            const worldDirX = _cachedCamRight.x * joystick.x + _cachedCamForward.x * joystick.y;
                            const worldDirZ = _cachedCamRight.z * joystick.x + _cachedCamForward.z * joystick.y;
                            
                            // Normalize and apply speed
                            const dirMag = Math.sqrt(worldDirX * worldDirX + worldDirZ * worldDirZ);
                            if (dirMag > 0.01) {
                                velRef.current.x = (worldDirX / dirMag) * moveSpeed;
                                velRef.current.z = (worldDirZ / dirMag) * moveSpeed;
                    
                                // Auto-rotate player to face movement direction
                                const targetRot = Math.atan2(worldDirX, worldDirZ);
                                // Smooth rotation interpolation
                                let rotDiff = targetRot - rotRef.current;
                                // Normalize to -PI to PI
                                while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                                while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                                rotRef.current += rotDiff * 0.2; // Smooth turn (20% per frame)
                                
                    moving = true;
                            }
                        }
                }
                // Keyboard/D-pad movement (digital control)
                    // Note: mobileBack removed - mobile users can't walk backwards
                else if (keyForward || mobileForward) {
                    velRef.current.z = Math.cos(rotRef.current) * speed;
                    velRef.current.x = Math.sin(rotRef.current) * speed;
                    moving = true;
                    } else if (keyBack) { // Keyboard only - no mobileBack
                    velRef.current.z = -Math.cos(rotRef.current) * speed;
                    velRef.current.x = -Math.sin(rotRef.current) * speed;
                    moving = true;
                } else {
                    // Apply friction (slippery on icy trails)
                    const friction = mountTrailSystemRef.current?.getFrictionMultiplier() ?? 1.0;
                    if (friction < 1.0) {
                        // Slippery - gradual slowdown
                        velRef.current.x *= friction;
                        velRef.current.z *= friction;
                        // Stop completely when very slow
                        if (Math.abs(velRef.current.x) < 0.01) velRef.current.x = 0;
                        if (Math.abs(velRef.current.z) < 0.01) velRef.current.z = 0;
                    } else {
                        velRef.current.x = 0;
                        velRef.current.z = 0;
                    }
                }
                }
                // === AIR MOVEMENT ===
                // In air: allow movement in facing direction with proper momentum
                else {
                    // Mobile Joystick in air: same 2D plane movement with auto-facing
                    if (joystickMagnitude > 0.1 && !inMatch) {
                        const moveSpeed = speed * Math.min(joystickMagnitude, 1.0);
                        
                        const camera = cameraRef.current;
                        if (camera) {
                            // OPTIMIZATION: Reuse cached vectors instead of creating new ones
                            camera.getWorldDirection(_cachedCamForward);
                            _cachedCamForward.y = 0;
                            _cachedCamForward.normalize();
                            
                            _cachedCamRight.set(-_cachedCamForward.z, 0, _cachedCamForward.x);
                            
                            const worldDirX = _cachedCamRight.x * joystick.x + _cachedCamForward.x * joystick.y;
                            const worldDirZ = _cachedCamRight.z * joystick.x + _cachedCamForward.z * joystick.y;
                            
                            const dirMag = Math.sqrt(worldDirX * worldDirX + worldDirZ * worldDirZ);
                            if (dirMag > 0.01) {
                                velRef.current.x = (worldDirX / dirMag) * moveSpeed;
                                velRef.current.z = (worldDirZ / dirMag) * moveSpeed;
                                
                                // Auto-rotate in air too
                                const targetRot = Math.atan2(worldDirX, worldDirZ);
                                let rotDiff = targetRot - rotRef.current;
                                while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                                while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                                rotRef.current += rotDiff * 0.2;
                                
                                moving = true;
                            }
                        }
                    }
                    // Keyboard/D-pad movement in air (same as ground - no boost by default)
                    // Note: mobileBack removed - mobile users can't walk backwards
                    else if (keyForward || mobileForward) {
                        velRef.current.z = Math.cos(rotRef.current) * speed;
                        velRef.current.x = Math.sin(rotRef.current) * speed;
                        moving = true;
                    } else if (keyBack) { // Keyboard only - no mobileBack
                        velRef.current.z = -Math.cos(rotRef.current) * speed;
                        velRef.current.x = -Math.sin(rotRef.current) * speed;
                        moving = true;
                    } else {
                        // No input in air - apply air momentum with CURRENT delta
                        // This prevents lag spikes from causing massive forward movement
                        // Get the direction of current velocity and re-apply with current delta
                        const currentVelMag = Math.sqrt(velRef.current.x * velRef.current.x + velRef.current.z * velRef.current.z);
                        if (currentVelMag > 0.01) {
                            // Normalize direction, apply BASE_SPEED * current delta
                            // This maintains momentum direction but uses correct delta timing
                            const airMomentumSpeed = BASE_SPEED * delta * 0.9; // 90% of ground speed for air drag
                            velRef.current.x = (velRef.current.x / currentVelMag) * airMomentumSpeed;
                            velRef.current.z = (velRef.current.z / currentVelMag) * airMomentumSpeed;
                        }
                        // If velocity was basically zero, keep it zero
                    }
                }
            } else {
                velRef.current.x = 0;
                velRef.current.z = 0;
            }
            
            const nextX = posRef.current.x + velRef.current.x;
            const nextZ = posRef.current.z + velRef.current.z;
            
            let collided = false;
            let finalX = nextX;
            let finalZ = nextZ;
            
            // Room-specific collision
            if ((roomRef.current === 'dojo') && roomData && roomData.bounds) {
                // Dojo uses square bounds
                const b = roomData.bounds;
                const playerRadius = 0.8;
                finalX = Math.max(b.minX + playerRadius, Math.min(b.maxX - playerRadius, nextX));
                finalZ = Math.max(b.minZ + playerRadius, Math.min(b.maxZ - playerRadius, nextZ));
                if (finalX !== nextX || finalZ !== nextZ) {
                    collided = true;
                }
            } else if (roomRef.current === 'pizza' && roomData && roomData.bounds) {
                // Pizza parlor collision - enclosed room like igloos
                const b = roomData.bounds;
                const playerRadius = 0.6;
                const playerY = posRef.current.y;
                
                // Wall bounds - ALWAYS enforced (enclosed room)
                finalX = Math.max(b.minX + playerRadius, Math.min(b.maxX - playerRadius, nextX));
                finalZ = Math.max(b.minZ + playerRadius, Math.min(b.maxZ - playerRadius, nextZ));
                if (finalX !== nextX || finalZ !== nextZ) collided = true;
                
                // Counter collision - ALWAYS enforced (it's a solid bar)
                // Counter blocks movement regardless of player height
                if (roomData.counter) {
                    const c = roomData.counter;
                    if (finalX > c.minX - playerRadius && finalX < c.maxX + playerRadius &&
                        finalZ > c.minZ - playerRadius && finalZ < c.maxZ + playerRadius) {
                        // Only block if player is below counter top height (2.5)
                        if (playerY < 2.4) {
                            const fromLeft = finalX - (c.minX - playerRadius);
                            const fromRight = (c.maxX + playerRadius) - finalX;
                            const fromFront = finalZ - (c.minZ - playerRadius);
                            const fromBack = (c.maxZ + playerRadius) - finalZ;
                            
                            const minDist = Math.min(fromLeft, fromRight, fromFront, fromBack);
                            if (minDist === fromFront) finalZ = c.minZ - playerRadius;
                            else if (minDist === fromBack) finalZ = c.maxZ + playerRadius;
                            else if (minDist === fromLeft) finalX = c.minX - playerRadius;
                            else finalX = c.maxX + playerRadius;
                            collided = true;
                        }
                    }
                }
                
                // Only check small furniture collision if player is on ground
                if (playerY < 1.5) {
                    // Table pedestal collision (circular, small radius)
                    if (roomData.tables) {
                        for (const table of roomData.tables) {
                            const dx = finalX - table.x;
                            const dz = finalZ - table.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < table.radius + playerRadius) {
                                const angle = Math.atan2(dz, dx);
                                finalX = table.x + Math.cos(angle) * (table.radius + playerRadius);
                                finalZ = table.z + Math.sin(angle) * (table.radius + playerRadius);
                                collided = true;
                            }
                        }
                    }
                    
                    // Chair collision (when on ground)
                    if (roomData.chairs) {
                        for (const chair of roomData.chairs) {
                            const dx = finalX - chair.x;
                            const dz = finalZ - chair.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < chair.radius + playerRadius) {
                                const angle = Math.atan2(dz, dx);
                                finalX = chair.x + Math.cos(angle) * (chair.radius + playerRadius);
                                finalZ = chair.z + Math.sin(angle) * (chair.radius + playerRadius);
                                collided = true;
                            }
                        }
                    }
                    
                    // Bar stool collision (when on ground)
                    if (roomData.stools) {
                        for (const stool of roomData.stools) {
                            const dx = finalX - stool.x;
                            const dz = finalZ - stool.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < stool.radius + playerRadius) {
                                const angle = Math.atan2(dz, dx);
                                finalX = stool.x + Math.cos(angle) * (stool.radius + playerRadius);
                                finalZ = stool.z + Math.sin(angle) * (stool.radius + playerRadius);
                                collided = true;
                            }
                        }
                    }
                }
            } else if (roomRef.current.startsWith('igloo') && roomData && roomData.bounds) {
                // Igloos use CIRCULAR bounds to match dome shape
                const b = roomData.bounds;
                const playerRadius = 0.8;
                const maxRadius = b.radius - playerRadius;
                
                // Calculate distance from center
                const distFromCenter = Math.sqrt(nextX * nextX + nextZ * nextZ);
                
                if (distFromCenter > maxRadius) {
                    // Push player back inside circle
                    const angle = Math.atan2(nextZ, nextX);
                    finalX = Math.cos(angle) * maxRadius;
                    finalZ = Math.sin(angle) * maxRadius;
                    collided = true;
                }
                
                // ==================== FURNITURE COLLISION (Player) ====================
                // Now with proper height checks - player can jump on top of objects
                if (roomData.colliders) {
                    for (const col of roomData.colliders) {
                        // Get collider height (default to 2 units if not specified)
                        const colliderHeight = col.height || col.hh * 2 || 2;
                        const colliderTop = col.y !== undefined ? col.y + colliderHeight : colliderHeight;
                        const colliderBottom = col.y || 0;
                        
                        // AABB collision with player radius
                        const minX = col.x - col.hw - playerRadius;
                        const maxX = col.x + col.hw + playerRadius;
                        const minZ = col.z - col.hd - playerRadius;
                        const maxZ = col.z + col.hd + playerRadius;
                        
                        // Check if player is within XZ bounds
                        if (finalX > minX && finalX < maxX && finalZ > minZ && finalZ < maxZ) {
                            const playerY = posRef.current.y;
                            const playerFeetY = playerY; // Player's feet are at posRef.current.y
                            
                            // If player is ABOVE the collider top, they can stand on it
                            if (playerFeetY >= colliderTop - 0.1) {
                                // Player is on top - check if falling onto it
                                if (velRef.current.y <= 0 && playerFeetY < colliderTop + 0.5) {
                                    // Land on top of object
                                    posRef.current.y = colliderTop;
                                    velRef.current.y = 0;
                                    isGroundedRef.current = true;
                                    // Reset trick state on landing
                                    isDoingTrickRef.current = false;
                                    canDoubleJumpRef.current = false;
                                }
                                // Don't block horizontal movement when on top
                            } else if (playerFeetY < colliderTop && playerY + 2 > colliderBottom) {
                                // Player is at collider height level - block horizontal movement
                                const overlapLeft = finalX - minX;
                                const overlapRight = maxX - finalX;
                                const overlapBack = finalZ - minZ;
                                const overlapFront = maxZ - finalZ;
                                
                                // Find smallest overlap and push out that direction
                                const minOverlap = Math.min(overlapLeft, overlapRight, overlapBack, overlapFront);
                                
                                if (minOverlap === overlapLeft) finalX = minX;
                                else if (minOverlap === overlapRight) finalX = maxX;
                                else if (minOverlap === overlapBack) finalZ = minZ;
                                else finalZ = maxZ;
                                
                                collided = true;
                            }
                        }
                    }
                }
                
                // ==================== BEACH BALL PHYSICS ====================
                if (roomData.beachBall) {
                    const ball = roomData.beachBall;
                    const ballX = ball.mesh.position.x;
                    const ballZ = ball.mesh.position.z;
                    
                    // Check player-ball collision
                    const dx = ballX - finalX; // Direction from player TO ball
                    const dz = ballZ - finalZ;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    const minDist = playerRadius + ball.radius;
                    
                    if (dist < minDist && dist > 0.01) {
                        // Normalize direction
                        const nx = dx / dist;
                        const nz = dz / dist;
                        
                        // Calculate kick strength based on player velocity toward ball
                        const playerVelX = velRef.current.x;
                        const playerVelZ = velRef.current.z;
                        const approachSpeed = -(playerVelX * nx + playerVelZ * nz); // Dot product
                        
                        // Only kick if player is moving toward ball
                        if (approachSpeed > 0.01) {
                            // Transfer momentum: ball gets pushed in direction from player
                            const kickPower = approachSpeed * 3 + 1.5; // Base kick + momentum
                            ball.velocity.x += nx * kickPower;
                            ball.velocity.z += nz * kickPower;
                        } else {
                            // Gentle push if just touching
                            ball.velocity.x += nx * 0.8;
                            ball.velocity.z += nz * 0.8;
                        }
                        
                        // Separate ball from player (prevent overlap)
                        const overlap = minDist - dist;
                        ball.mesh.position.x += nx * overlap * 1.1;
                        ball.mesh.position.z += nz * overlap * 1.1;
                        
                        // SYNC TO SERVER: Send ball kick to all clients
                        if (mpSendBallKick) {
                            mpSendBallKick(
                                ball.mesh.position.x,
                                ball.mesh.position.z,
                                ball.velocity.x,
                                ball.velocity.z
                            );
                        }
                    }
                    
                    // Update ball position based on velocity (smooth movement)
                    ball.mesh.position.x += ball.velocity.x * delta;
                    ball.mesh.position.z += ball.velocity.z * delta;
                    
                    // Ball spin based on velocity (rolling effect)
                    const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.z ** 2);
                    if (speed > 0.1) {
                        ball.mesh.rotation.x += ball.velocity.z * delta * 3;
                        ball.mesh.rotation.z -= ball.velocity.x * delta * 3;
                    }
                    
                    // Ball-wall collision (circular bounds)
                    const ballDistFromCenter = Math.sqrt(
                        ball.mesh.position.x ** 2 + ball.mesh.position.z ** 2
                    );
                    const ballMaxRadius = b.radius - ball.radius - 0.3;
                    
                    if (ballDistFromCenter > ballMaxRadius) {
                        // Calculate wall normal (points inward)
                        const wallAngle = Math.atan2(ball.mesh.position.z, ball.mesh.position.x);
                        const normalX = -Math.cos(wallAngle);
                        const normalZ = -Math.sin(wallAngle);
                        
                        // Push ball back inside
                        ball.mesh.position.x = Math.cos(wallAngle) * ballMaxRadius;
                        ball.mesh.position.z = Math.sin(wallAngle) * ballMaxRadius;
                        
                        // Reflect velocity off wall
                        const dot = ball.velocity.x * normalX + ball.velocity.z * normalZ;
                        if (dot < 0) { // Only bounce if moving toward wall
                            ball.velocity.x -= 2 * dot * normalX;
                            ball.velocity.z -= 2 * dot * normalZ;
                            // Energy loss on bounce
                            ball.velocity.x *= ball.bounciness;
                            ball.velocity.z *= ball.bounciness;
                        }
                    }
                    
                    // Ball-furniture collision
                    if (roomData.colliders) {
                        for (const col of roomData.colliders) {
                            const bx = ball.mesh.position.x;
                            const bz = ball.mesh.position.z;
                            const br = ball.radius;
                            
                            // Find closest point on furniture box to ball center
                            const closestX = Math.max(col.x - col.hw, Math.min(bx, col.x + col.hw));
                            const closestZ = Math.max(col.z - col.hd, Math.min(bz, col.z + col.hd));
                            
                            // Distance from ball center to closest point
                            const distX = bx - closestX;
                            const distZ = bz - closestZ;
                            const distSq = distX * distX + distZ * distZ;
                            
                            if (distSq < br * br && distSq > 0.001) {
                                // Ball is colliding with furniture
                                const dist = Math.sqrt(distSq);
                                const nx = distX / dist; // Normal pointing away from furniture
                                const nz = distZ / dist;
                                
                                // Push ball out of furniture
                                const overlap = br - dist;
                                ball.mesh.position.x += nx * overlap * 1.1;
                                ball.mesh.position.z += nz * overlap * 1.1;
                                
                                // Reflect velocity
                                const vDot = ball.velocity.x * nx + ball.velocity.z * nz;
                                if (vDot < 0) { // Only bounce if moving toward furniture
                                    ball.velocity.x -= 2 * vDot * nx;
                                    ball.velocity.z -= 2 * vDot * nz;
                                    ball.velocity.x *= ball.bounciness;
                                    ball.velocity.z *= ball.bounciness;
                                    
                                    // Sync bounce to server
                                    if (mpSendBallKick) {
                                        mpSendBallKick(
                                            ball.mesh.position.x,
                                            ball.mesh.position.z,
                                            ball.velocity.x,
                                            ball.velocity.z
                                        );
                                    }
                                }
                            }
                        }
                    }
                    
                    // Apply ground friction (gradual slowdown)
                    const frictionPerFrame = Math.pow(ball.friction, delta * 60);
                    ball.velocity.x *= frictionPerFrame;
                    ball.velocity.z *= frictionPerFrame;
                    
                    // Clamp very small velocities to zero (stop rolling)
                    if (Math.abs(ball.velocity.x) < 0.05 && Math.abs(ball.velocity.z) < 0.05) {
                        ball.velocity.x = 0;
                        ball.velocity.z = 0;
                    }
                    
                    // Keep ball at correct height (bouncy bob effect when moving)
                    const bobAmount = speed > 0.5 ? Math.sin(time * 15) * 0.05 : 0;
                    ball.mesh.position.y = 0.5 + bobAmount;
                }
            } else if (roomRef.current === 'nightclub' && nightclubRef.current) {
                // Nightclub collision - handled by Nightclub.js
                const result = nightclubRef.current.checkPlayerMovement(
                    posRef.current.x,
                    posRef.current.z,
                    nextX,
                    nextZ,
                    0.6, // playerRadius
                    posRef.current.y // playerY for height-based collision
                );
                finalX = result.x;
                finalZ = result.z;
                collided = result.collided;
            } else if (isTravelLobbyRoom(roomRef.current)) {
                if (travelLobbyRef.current) {
                    const result = travelLobbyRef.current.checkPlayerMovement(
                        posRef.current.x,
                        posRef.current.z,
                        nextX,
                        nextZ,
                        0.6,
                        posRef.current.y
                    );
                    finalX = result.x;
                    finalZ = result.z;
                    collided = result.collided;
                } else {
                    const clamped = clampTravelLobbyPosition(nextX, nextZ);
                    finalX = clamped.x;
                    finalZ = clamped.z;
                    collided = clamped.x !== nextX || clamped.z !== nextZ;
                }
            } else if (roomRef.current === 'casino_game_room' && casinoRoomRef.current) {
                // Casino room collision - handled by CasinoRoom.js (same pattern as Nightclub)
                const result = casinoRoomRef.current.checkPlayerMovement(
                    posRef.current.x,
                    posRef.current.z,
                    nextX,
                    nextZ,
                    0.6, // playerRadius
                    posRef.current.y // playerY for height-based collision
                );
                finalX = result.x;
                finalZ = result.z;
                collided = result.collided;
            } else if (roomRef.current === 'forest_trails' && forestTrailsZoneRef.current) {
                const forestCollision = forestTrailsZoneRef.current.checkCollision(nextX, nextZ, 0.8);
                if (forestCollision) {
                    finalX = posRef.current.x;
                    finalZ = posRef.current.z;
                    collided = true;
                } else {
                    finalX = nextX;
                    finalZ = nextZ;
                }
                if (!collided && mountainBackgroundRef.current?.checkCollision) {
                    if (mountainBackgroundRef.current.checkCollision(finalX, finalZ, 0.8)) {
                        finalX = posRef.current.x;
                        finalZ = posRef.current.z;
                        collided = true;
                    }
                }
                if (frameCount % 3 === 0) {
                    forestTrailsZoneRef.current.checkTriggers(finalX, finalZ, posRef.current.y);
                }
            } else if (roomRef.current === 'snow_forts' && snowFortsZoneRef.current) {
                const result = snowFortsZoneRef.current.checkPlayerMovement(
                    posRef.current.x,
                    posRef.current.z,
                    nextX,
                    nextZ,
                    0.8,
                    posRef.current.y
                );
                finalX = result.x;
                finalZ = result.z;
                collided = result.collided;
                if (!collided && mountainBackgroundRef.current?.checkCollision) {
                    if (mountainBackgroundRef.current.checkCollision(finalX, finalZ, 0.8)) {
                        finalX = posRef.current.x;
                        finalZ = posRef.current.z;
                        collided = true;
                    }
                }
                if (frameCount % 3 === 0) {
                    snowFortsZoneRef.current.checkTriggers(finalX, finalZ, posRef.current.y);
                }
            } else if (townCenterRef.current && roomRef.current === 'town') {
                const result = townCenterRef.current.checkPlayerMovement(
                    posRef.current.x,
                    posRef.current.z,
                    nextX,
                    nextZ,
                    0.8,
                    posRef.current.y
                );
                finalX = result.x;
                finalZ = result.z;
                collided = result.collided;
                if (!collided && mountainBackgroundRef.current?.checkCollision) {
                    if (mountainBackgroundRef.current.checkCollision(finalX, finalZ, 0.8)) {
                        finalX = posRef.current.x;
                        finalZ = posRef.current.z;
                        collided = true;
                    }
                }
                if (frameCount % 3 === 0) {
                    townCenterRef.current.checkTriggers(finalX, finalZ, posRef.current.y);

                    const lighthouseX = CENTER_X + 80.5;
                    const lighthouseZ = CENTER_Z + 52.7;
                    const distToLighthouse = Math.sqrt(
                        (finalX - lighthouseX) ** 2 + (finalZ - lighthouseZ) ** 2
                    );
                    const onLighthouseDeck = posRef.current.y > 10 && distToLighthouse < 6;
                    if (onLighthouseDeck && !lighthouseDeckInsideRef.current) {
                        lighthouseDeckInsideRef.current = true;
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: { action: 'descend_lighthouse', data: {} }
                        }));
                    } else if (!onLighthouseDeck && lighthouseDeckInsideRef.current) {
                        lighthouseDeckInsideRef.current = false;
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: { action: 'exit', exitedZone: 'descend_lighthouse' }
                        }));
                    }
                }
            }
            
            // Pizza room furniture interactions
            if (roomRef.current === 'pizza' && roomDataRef.current?.furniture) {
                const px = posRef.current.x;
                const pz = posRef.current.z;
                const py = posRef.current.y;
                
                // Only check when on ground level (not standing on furniture)
                if (py < 1.0) {
                    let foundSeat = null;
                    let closestDist = 1.5; // Interaction radius
                    
                    for (const seat of roomDataRef.current.furniture) {
                        const dx = px - seat.position.x;
                        const dz = pz - seat.position.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        
                        if (dist < closestDist) {
                            closestDist = dist;
                            foundSeat = seat;
                        }
                    }
                    
                    if (foundSeat) {
                        const seatName = foundSeat.type === 'stool' ? 'bar stool' : 'chair';
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: {
                                action: 'sit',
                                emote: 'Sit',
                                data: {
                                    worldX: foundSeat.position.x,
                                    worldZ: foundSeat.position.z,
                                    worldRotation: foundSeat.faceAngle || 0,
                                    seatHeight: foundSeat.seatHeight,
                                    snapPoints: [{ x: 0, z: 0, rotation: 0 }]
                                }
                            }
                        }));
                    } else {
                        // Clear interaction when not near any seat
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: { action: 'exit' }
                        }));
                    }
                } else {
                    // Clear interaction when on furniture
                    window.dispatchEvent(new CustomEvent('townInteraction', {
                        detail: { action: 'exit' }
                    }));
                }
            }
            
            // Casino room furniture interactions (bar stools, couches, chairs)
            if (roomRef.current === 'casino_game_room' && roomDataRef.current?.furniture) {
                const px = posRef.current.x;
                const pz = posRef.current.z;
                const py = posRef.current.y;
                
                // Only check when on ground level (not standing on furniture)
                if (py < 1.5) {
                    let foundSeat = null;
                    let closestDist = 2.0; // Interaction radius
                    
                    for (const seat of roomDataRef.current.furniture) {
                        const dx = px - seat.position.x;
                        const dz = pz - seat.position.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        
                        // For couches with snap points, check distance to each snap point
                        if (seat.snapPoints && seat.snapPoints.length > 0) {
                            const cos = Math.cos(seat.rotation || 0);
                            const sin = Math.sin(seat.rotation || 0);
                            for (const snap of seat.snapPoints) {
                                // Transform snap point by couch rotation
                                const snapWorldX = seat.position.x + snap.x * cos - snap.z * sin;
                                const snapWorldZ = seat.position.z + snap.x * sin + snap.z * cos;
                                const snapDx = px - snapWorldX;
                                const snapDz = pz - snapWorldZ;
                                const snapDist = Math.sqrt(snapDx * snapDx + snapDz * snapDz);
                                if (snapDist < closestDist) {
                                    closestDist = snapDist;
                                    foundSeat = {
                                        ...seat,
                                        // Override position with snap point
                                        snapPosition: { x: snapWorldX, z: snapWorldZ }
                                    };
                                }
                            }
                        } else if (dist < closestDist) {
                            closestDist = dist;
                            foundSeat = seat;
                        }
                    }
                    
                    if (foundSeat) {
                        const seatType = foundSeat.type === 'stool' ? 'bar stool' : 
                                        foundSeat.type === 'couch' ? 'couch' : 'chair';
                        const seatX = foundSeat.snapPosition ? foundSeat.snapPosition.x : foundSeat.position.x;
                        const seatZ = foundSeat.snapPosition ? foundSeat.snapPosition.z : foundSeat.position.z;
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: {
                                action: 'sit',
                                emote: 'Sit',
                                data: {
                                    worldX: seatX,
                                    worldZ: seatZ,
                                    worldRotation: foundSeat.faceAngle || foundSeat.rotation || 0,
                                    seatHeight: foundSeat.seatHeight,
                                    snapPoints: [{ x: 0, z: 0, rotation: 0 }]
                                }
                            }
                        }));
                    } else {
                        // Clear interaction when not near any seat
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: { action: 'exit' }
                        }));
                    }
                } else {
                    // Clear interaction when on furniture
                    window.dispatchEvent(new CustomEvent('townInteraction', {
                        detail: { action: 'exit' }
                    }));
                }
            }
            
            if (
                roomRef.current !== 'town'
                && roomRef.current !== 'pizza'
                && roomRef.current !== 'nightclub'
                && roomRef.current !== 'casino_game_room'
                && roomRef.current !== 'snow_forts'
                && roomRef.current !== 'forest_trails'
                && !isTravelLobbyRoom(roomRef.current)
            ) {
                // Fallback: Non-town rooms use different collision
                // Town uses wall boundaries now, not water
                // Nightclub has its own wall-clamping collision above
                const WALL_MARGIN = 10;
                const MAP_SIZE = CITY_SIZE * BUILDING_SCALE;
                
                if (nextX < WALL_MARGIN || nextX > MAP_SIZE - WALL_MARGIN ||
                    nextZ < WALL_MARGIN || nextZ > MAP_SIZE - WALL_MARGIN) {
                    collided = true; // Can't walk past walls
                }
                
                // Check collision with custom buildings (dojo, market, pizza)
                if (!collided) {
                    const centerX = CENTER_X;
                    const centerZ = CENTER_Z;
                    
                    for (const building of BUILDINGS) {
                        const bx = centerX + building.position.x;
                        const bz = centerZ + building.position.z;
                        const hw = building.size.w / 2 + 0.5; // Half width + margin
                        const hd = building.size.d / 2 + 0.5; // Half depth + margin
                        
                        // Check if player is inside building bounds (but allow door area)
                        if (nextX > bx - hw && nextX < bx + hw && 
                            nextZ > bz - hd && nextZ < bz + hd) {
                            // Allow through the door area (front center)
                            const doorWidth = 3;
                            const atDoor = Math.abs(nextX - bx) < doorWidth && nextZ > bz + hd - 2;
                            if (!atDoor) {
                                collided = true;
                                break;
                            }
                        }
                    }
                }
            }
            
            // Update position (use clamped finalX/finalZ for all rooms)
            if (roomRef.current === 'dojo' || roomRef.current.startsWith('igloo')) {
                // Dojo/Igloo: always use clamped position
                posRef.current.x = finalX;
                posRef.current.z = finalZ;
                
                // Check igloo furniture proximity for interaction
                if (roomRef.current.startsWith('igloo') && roomData && roomData.furniture) {
                    let nearInteraction = null;
                    
                    // Check furniture (couches, bar stools)
                    for (const furn of roomData.furniture) {
                        const dx = finalX - furn.position.x;
                        const dz = finalZ - furn.position.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist < furn.interactionRadius) {
                            nearInteraction = { type: 'furniture', data: furn };
                            break;
                        }
                    }
                    
                    // Check DJ spots (igloo3 SKNY has a DJ booth)
                    if (!nearInteraction && roomData.djSpots) {
                        for (const dj of roomData.djSpots) {
                            const dx = finalX - dj.position.x;
                            const dz = finalZ - dj.position.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < dj.interactionRadius) {
                                nearInteraction = { type: 'dj', data: dj };
                                break;
                            }
                        }
                    }
                    
                    // Dispatch interaction event (reuses existing townInteraction system)
                    if (nearInteraction && !seatedRef.current) {
                        if (nearInteraction.type === 'dj') {
                            const dj = nearInteraction.data;
                            window.dispatchEvent(new CustomEvent('townInteraction', {
                                detail: {
                                    action: 'dj',
                                    message: '🎧 Press E to DJ',
                                    emote: 'DJ',
                                    data: {
                                        worldX: dj.position.x,
                                        worldZ: dj.position.z,
                                        worldRotation: dj.rotation
                                    }
                                }
                            }));
                        } else {
                            const furn = nearInteraction.data;
                            window.dispatchEvent(new CustomEvent('townInteraction', {
                                detail: {
                                    action: 'sit',
                                    message: `Press E to sit on ${furn.type}`,
                                    emote: 'Sit',
                                    data: {
                                        worldX: furn.position.x,
                                        worldZ: furn.position.z,
                                        worldRotation: furn.rotation,
                                        snapPoints: furn.snapPoints,
                                        seatHeight: furn.seatHeight,
                                        bidirectionalSit: furn.bidirectionalSit || false
                                    }
                                }
                            }));
                        }
                    } else if (!nearInteraction && !seatedRef.current) {
                        // Exited interaction zone
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: { action: 'exit' }
                        }));
                    }
                }
            } else if (isTravelLobbyRoom(roomRef.current)) {
                posRef.current.x = finalX;
                posRef.current.z = finalZ;
            } else if (roomRef.current === 'nightclub') {
                // Nightclub: use wall-clamped position (free movement inside, walls only block)
                posRef.current.x = finalX;
                posRef.current.z = finalZ;
                
                // Check nightclub furniture proximity for interaction (couch)
                let nearInteraction = null;
                if (roomData && roomData.furniture) {
                    for (const furn of roomData.furniture) {
                        const dx = finalX - furn.position.x;
                        const dz = finalZ - furn.position.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist < furn.interactionRadius) {
                            nearInteraction = { type: 'furniture', data: furn };
                            break;
                        }
                    }
                }
                
                // Check DJ spots (only when on the platform - Y ~= 0.75)
                if (!nearInteraction && roomData && roomData.djSpots) {
                    const playerY = posRef.current.y;
                    const onPlatform = playerY >= 0.5 && playerY <= 1.2; // On DJ platform
                    if (onPlatform) {
                        for (const dj of roomData.djSpots) {
                            const dx = finalX - dj.position.x;
                            const dz = finalZ - dj.position.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < dj.interactionRadius) {
                                nearInteraction = { type: 'dj', data: dj };
                                break;
                            }
                        }
                    }
                }
                
                // Dispatch interaction event
                if (nearInteraction && !seatedRef.current) {
                    if (nearInteraction.type === 'dj') {
                        const dj = nearInteraction.data;
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: {
                                action: 'dj',
                                message: '🎧 Press E to DJ',
                                emote: 'DJ',
                                data: {
                                    worldX: dj.position.x,
                                    worldZ: dj.position.z,
                                    worldRotation: dj.rotation,
                                    seatHeight: dj.standHeight,
                                    dismountOffset: dj.dismountOffset
                                }
                            }
                        }));
                    } else {
                        const furn = nearInteraction.data;
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: {
                                action: 'sit',
                                message: `Press E to sit on ${furn.type}`,
                                emote: 'Sit',
                                data: {
                                    worldX: furn.position.x,
                                    worldZ: furn.position.z,
                                    worldRotation: furn.rotation,
                                    snapPoints: furn.snapPoints,
                                    seatHeight: furn.seatHeight
                                }
                            }
                        }));
                    }
                } else if (!nearInteraction && !seatedRef.current) {
                    // Exited interaction zone
                    window.dispatchEvent(new CustomEvent('townInteraction', {
                        detail: { action: 'exit' }
                    }));
                }
            } else if (
                roomRef.current === 'town'
                || roomRef.current === 'snow_forts'
                || roomRef.current === 'forest_trails'
            ) {
                // Overworld quadrant: apply safe position from zone collision
                posRef.current.x = finalX;
                posRef.current.z = finalZ;
                
                // Check furniture proximity — throttled + distSq (no sqrt)
                let nearFurniture = nearTownFurnitureRef.current;
                const playerY = posRef.current.y;

                if (frameCount % 2 === 0) {
                    nearFurniture = null;
                    const checkFurnitureList = (list, yMatcher) => {
                        for (const furn of list) {
                            const dx = finalX - furn.position.x;
                            const dz = finalZ - furn.position.z;
                            const r = furn.interactionRadius;
                            if (dx * dx + dz * dz >= r * r) continue;
                            if (!yMatcher(furn)) continue;
                            nearFurniture = furn;
                            return true;
                        }
                        return false;
                    };

                    if (roomRef.current === 'forest_trails' && forestTrailsZoneRef.current) {
                        checkFurnitureList(forestTrailsZoneRef.current.getFurniture(), (furn) => {
                            const furnY = furn.platformHeight || 0;
                            return Math.abs(playerY - furnY) < 2;
                        });
                    }

                    if (roomRef.current === 'snow_forts' && snowFortsZoneRef.current) {
                        const sf = snowFortsZoneRef.current;
                        const inCasino = sf.isPlayerInCasino(finalX, finalZ);
                        const matchSeat = (furn) => {
                            if (furn.elevated) {
                                const standY = furn.platformHeight ?? (furn.seatHeight - 1.0);
                                return Math.abs(playerY - standY) < 2.5
                                    || Math.abs(playerY - (furn.seatHeight - 0.5)) < 1.5;
                            }
                            return playerY < 1.5;
                        };
                        const lists = inCasino
                            ? [sf.getCasinoFurniture(), sf.getFurniture()]
                            : [sf.getFurniture(), sf.getCasinoFurniture()];
                        for (const list of lists) {
                            if (checkFurnitureList(list, matchSeat)) break;
                        }
                    }

                    if (!nearFurniture && roomRef.current === 'town' && roomData?.furniture) {
                        checkFurnitureList(roomData.furniture, (furn) => {
                            const furnY = furn.platformHeight || 0;
                            return Math.abs(playerY - furnY) < 2;
                        });
                    }

                    nearTownFurnitureRef.current = nearFurniture;
                }
                
                // Dispatch interaction event
                if (nearFurniture && !seatedRef.current) {
                    window.dispatchEvent(new CustomEvent('townInteraction', {
                        detail: {
                            action: 'sit',
                            message: `Press E to sit on ${nearFurniture.type}`,
                            emote: 'Sit',
                            data: {
                                worldX: nearFurniture.position.x,
                                worldZ: nearFurniture.position.z,
                                worldRotation: nearFurniture.rotation,
                                snapPoints: nearFurniture.snapPoints,
                                seatHeight: nearFurniture.seatHeight,
                                platformHeight: nearFurniture.platformHeight ?? 0,
                                dismountBack: nearFurniture.dismountBack || false,
                                bidirectionalSit: nearFurniture.bidirectionalSit || false
                            }
                        }
                    }));
                } else if (!nearFurniture && !seatedRef.current) {
                    // Only clear if we were showing a furniture prompt
                    window.dispatchEvent(new CustomEvent('townInteraction', {
                        detail: { action: 'exit' }
                    }));
                }
            } else if (!collided) {
                // Fallback: only move if no collision
                posRef.current.x = nextX;
                posRef.current.z = nextZ;
            }
            
            // Apply Y velocity (jumping/falling)
            // Clamp maximum fall distance per frame to prevent clipping through surfaces
            const yDelta = velRef.current.y * delta;
            const MAX_FALL_PER_FRAME = 2.0; // Maximum 2 units fall per frame
            posRef.current.y += Math.max(yDelta, -MAX_FALL_PER_FRAME);
            
            // Track if player found ground this frame
            let foundGround = false;
            let groundHeight = GROUND_Y;
            
            // Check for landing on furniture (in igloo rooms)
            if (roomData?.colliders) {
                for (const col of roomData.colliders) {
                    const colliderHeight = col.height || col.hh * 2 || 2;
                    const colliderTop = col.y !== undefined ? col.y + colliderHeight : colliderHeight;
                    
                    const minX = col.x - col.hw - 0.5;
                    const maxX = col.x + col.hw + 0.5;
                    const minZ = col.z - col.hd - 0.5;
                    const maxZ = col.z + col.hd + 0.5;
                    
                    // Check if player is within XZ bounds
                    if (posRef.current.x > minX && posRef.current.x < maxX && 
                        posRef.current.z > minZ && posRef.current.z < maxZ) {
                        // Player is above this surface and falling
                        if (posRef.current.y <= colliderTop + 0.1 && posRef.current.y >= colliderTop - 0.5) {
                            if (colliderTop >= groundHeight) {
                                groundHeight = colliderTop;
                                foundGround = true;
                            }
                        }
                    }
                }
            }
            
            if (room === 'snow_forts' && snowFortsZoneRef.current && velRef.current.y <= 0) {
                const landing = snowFortsZoneRef.current.checkLanding(posRef.current.x, posRef.current.z, posRef.current.y, 0.8);
                if (landing.canLand && posRef.current.y <= landing.landingY + 0.3) {
                    if (landing.landingY >= groundHeight) {
                        groundHeight = landing.landingY;
                        foundGround = true;
                    }
                }
            }

            if (isTravelLobbyRoom(room) && travelLobbyRef.current && velRef.current.y <= 0) {
                const landing = travelLobbyRef.current.checkLanding(posRef.current.x, posRef.current.z, posRef.current.y, 0.8);
                if (landing.canLand && posRef.current.y <= landing.landingY + 0.3) {
                    if (landing.landingY >= groundHeight) {
                        groundHeight = landing.landingY;
                        foundGround = true;
                    }
                }
            }

            // Check for landing on town objects
            if (room === 'town' && townCenterRef.current && velRef.current.y <= 0) {
                const landing = townCenterRef.current.checkLanding(posRef.current.x, posRef.current.z, posRef.current.y, 0.8);
                if (landing.canLand && posRef.current.y <= landing.landingY + 0.3) {
                    if (landing.landingY >= groundHeight) {
                        groundHeight = landing.landingY;
                        foundGround = true;
                    }
                }
            }
            
            // Check for landing on nightclub surfaces (uses Nightclub.checkLanding)
            if (room === 'nightclub' && nightclubRef.current) {
                const isDescending = velRef.current.y <= 0;
                const landing = nightclubRef.current.checkLanding(
                    posRef.current.x, posRef.current.z, posRef.current.y, isDescending
                );
                if (landing.canLand && landing.landingY > groundHeight) {
                    groundHeight = landing.landingY;
                    foundGround = true;
                }
            }
            
            // Check for landing on pizza parlor furniture (uses room's landingSurfaces)
            if (room === 'pizza' && roomDataRef.current?.landingSurfaces && velRef.current.y <= 0) {
                const px = posRef.current.x;
                const pz = posRef.current.z;
                const py = posRef.current.y;
                
                for (const surface of roomDataRef.current.landingSurfaces) {
                    let isOver = false;
                    
                    if (surface.type === 'circle') {
                        const dx = px - surface.x;
                        const dz = pz - surface.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        isOver = dist <= surface.radius;
                    } else if (surface.type === 'box') {
                        isOver = px >= surface.minX && px <= surface.maxX &&
                                 pz >= surface.minZ && pz <= surface.maxZ;
                    }
                    
                    if (isOver && py >= surface.height - 0.5 && py <= surface.height + 1) {
                        if (surface.height >= groundHeight) {
                            groundHeight = surface.height;
                            foundGround = true;
                        }
                    }
                }
            }
            
            // Check for landing on casino room furniture (uses room's landingSurfaces)
            if (room === 'casino_game_room' && roomDataRef.current?.landingSurfaces && velRef.current.y <= 0) {
                const px = posRef.current.x;
                const pz = posRef.current.z;
                const py = posRef.current.y;
                
                for (const surface of roomDataRef.current.landingSurfaces) {
                    let isOver = false;
                    
                    if (surface.type === 'circle') {
                        const dx = px - surface.x;
                        const dz = pz - surface.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        isOver = dist <= surface.radius;
                    } else if (surface.type === 'box') {
                        isOver = px >= surface.minX && px <= surface.maxX &&
                                 pz >= surface.minZ && pz <= surface.maxZ;
                    }
                    
                    if (isOver && py >= surface.height - 0.5 && py <= surface.height + 1) {
                        if (surface.height >= groundHeight) {
                            groundHeight = surface.height;
                            foundGround = true;
                        }
                    }
                }
            }
            
            // Ground plane collision (y = 0)
            // Only use ground level if no higher surface was already found
            if (posRef.current.y <= GROUND_Y) {
                if (groundHeight <= GROUND_Y) {
                    groundHeight = GROUND_Y;
                }
                foundGround = true;
            }
            
            // Apply ground collision
            if (foundGround && velRef.current.y <= 0) {
                posRef.current.y = groundHeight;
                velRef.current.y = 0;
                isGroundedRef.current = true;
                // Reset trick state on landing
                isDoingTrickRef.current = false;
                canDoubleJumpRef.current = false;
            } else if (posRef.current.y > GROUND_Y + 0.1) {
                // Player is in the air - not grounded
                isGroundedRef.current = false;
            }
            
            if (playerRef.current) {
                playerRef.current.position.set(posRef.current.x, posRef.current.y, posRef.current.z);
                playerRef.current.rotation.y = rotRef.current;
            }
            
            // Update debug position display (throttled)
            if (showDebugPositionRef.current && frameCount % 10 === 0) {
                const townCenterX = CENTER_X;
                const townCenterZ = CENTER_Z;
                setDebugPosition({
                    x: posRef.current.x.toFixed(1),
                    y: posRef.current.y.toFixed(1),
                    z: posRef.current.z.toFixed(1),
                    offsetX: (posRef.current.x - townCenterX).toFixed(1),
                    offsetZ: (posRef.current.z - townCenterZ).toFixed(1),
                    rotation: ((rotRef.current * 180 / Math.PI) % 360).toFixed(0)
                });
            }

            // Player puffle follow/animate/tick - snake-tail behavior
            if (playerPuffleRef.current && playerPuffleRef.current.mesh) {
                // Tick for stats decay
                if (typeof playerPuffleRef.current.tick === 'function') {
                    playerPuffleRef.current.tick();
                }
                // Follow owner (player) - snake-tail behavior
                if (typeof playerPuffleRef.current.followOwner === 'function') {
                    playerPuffleRef.current.followOwner(posRef.current, delta);
                }
                // Animate bounce and rotation
                if (typeof playerPuffleRef.current.animate === 'function') {
                    playerPuffleRef.current.animate(time);
                }
                
                // Trigger mood-based emotes periodically
                // (per-frame call is intentional — the emote probability is tuned for 60fps rolls)
                if (typeof playerPuffleRef.current.maybeShowEmote === 'function') {
                    playerPuffleRef.current.maybeShowEmote();
                }
                
                // NOTE: mood updates are handled inside tick() (every ~0.5s) — no extra call needed here
                
                // --- MOOD-BASED EMOTE BROADCASTING ---
                // Broadcast puffle's mood emotes to other players periodically
                if (playerPuffleRef.current.showingEmote && playerPuffleRef.current.currentEmote) {
                    const lastBroadcast = playerPuffleRef.current._lastEmoteBroadcast || 0;
                    const currentEmoteTime = playerPuffleRef.current.emoteStartTime || 0;
                    // Only broadcast if this is a new emote (within 100ms of start)
                    if (currentEmoteTime > lastBroadcast && (Date.now() - currentEmoteTime) < 100) {
                        playerPuffleRef.current._lastEmoteBroadcast = currentEmoteTime;
                        sendPuffleEmote?.(playerPuffleRef.current.currentEmote, playerPuffleRef.current.emoteDuration || 2500);
                    }
                }
                
                // --- PUFFLE EMOTE BUBBLE RENDERING ---
                const puffleMesh = playerPuffleRef.current.mesh;
                const showingEmote = playerPuffleRef.current.showingEmote;
                const currentEmote = playerPuffleRef.current.currentEmote;
                
                // Get or create emote bubble sprite (cached — getObjectByName walks the subtree)
                let emoteBubble = puffleMesh.userData._emoteBubble;
                if (emoteBubble && emoteBubble.parent !== puffleMesh) {
                    emoteBubble = puffleMesh.userData._emoteBubble = null; // stale (mesh rebuilt)
                }
                if (!emoteBubble) {
                    // Fall back to a one-time name lookup (bubble may exist from an earlier path)
                    emoteBubble = puffleMesh.getObjectByName('puffleEmoteBubble') || null;
                    if (emoteBubble) puffleMesh.userData._emoteBubble = emoteBubble;
                }
                
                if (showingEmote && currentEmote) {
                    // Create emote bubble if needed
                    if (!emoteBubble) {
                        emoteBubble = playerPuffleRef.current.createEmoteBubble(THREE);
                        emoteBubble.name = 'puffleEmoteBubble';
                        emoteBubble.position.y = 1.8;
                        puffleMesh.add(emoteBubble);
                        puffleMesh.userData._emoteBubble = emoteBubble;
                    }
                    
                    // Update emote bubble content if emoji changed
                    if (emoteBubble.userData.currentEmoji !== currentEmote) {
                        if (window._updatePuffleEmoteBubble) {
                            window._updatePuffleEmoteBubble(emoteBubble, currentEmote);
                        }
                        emoteBubble.userData.currentEmoji = currentEmote;
                    }
                    
                    emoteBubble.visible = true;
                } else if (emoteBubble) {
                    // Hide bubble when not emoting
                    emoteBubble.visible = false;
                }
                
                // Check proximity to other player puffles for social interaction
                // (throttled — 4-unit radius doesn't need 60Hz checks; ~6Hz is imperceptible)
                if (frameCount % 10 === 0) {
                    checkPuffleProximity(time);
                }
            }
            
            if (playerRef.current) {
                // Pass local player's seatedRef state for furniture sitting, character type, and mounted state
                // Only consider mounted if mount is enabled in settings
                const isMounted = !!(playerRef.current.userData?.mount && playerRef.current.userData?.mountData && mountEnabledRef.current);
                // Simple airborne check: feet not touching ground (Y above threshold)
                const isAirborne = velRef.current.y !== 0 && posRef.current.y > 0.05;
                const isHoldChopping = !!(
                    woodcuttingSystemRef.current?.localChopTreeId &&
                    !woodcuttingSystemRef.current?.localManualChopTreeId
                );
                animateMesh(
                    playerRef.current, 
                    moving, 
                    emoteRef.current.type, 
                    emoteRef.current.startTime, 
                    !!seatedRef.current, 
                    penguinDataRef.current?.characterType || 'penguin', 
                    isMounted, 
                    isAirborne,
                    time,
                    () => {
                        // Emote ended naturally - clear it
                        emoteRef.current.type = null;
                        mpSendEmote(null);
                    },
                    isHoldChopping
                );
                
                // OPTIMIZATION: Use cached animated parts instead of traverse() every frame
                // Cache is built once when mesh is created, avoiding expensive tree traversal
                const animCache = playerRef.current.userData._animatedPartsCache;
                if (animCache) {
                    animateCosmeticsFromCache(animCache, time, delta, VOXEL_SIZE);
                }
                
                // --- WIZARD HAT WORLD-SPACE TRAIL (Per-Player Pools) ---
                // Triggers for wizardHat equipped OR doginal character (who always has wizard hat)
                const hasWizardHat = penguinDataRef.current?.hat === 'wizardHat' || penguinDataRef.current?.characterType === 'doginal';
                if (hasWizardHat && wizardTrailSystemRef.current) {
                    wizardTrailSystemRef.current.getOrCreatePool('localPlayer');
                    wizardTrailSystemRef.current.update('localPlayer', playerRef.current.position, moving, time, delta);
                }
                
                // --- GREEN CANDLE TRAIL ---
                // Triggers for Gake character OR when greenCandlesEnabled setting is on
                const isGake = penguinDataRef.current?.characterType === 'gake';
                const greenCandlesEnabled = gameSettingsRef.current?.greenCandlesEnabled === true;
                if ((isGake || greenCandlesEnabled) && gakeCandleTrailSystemRef.current) {
                    gakeCandleTrailSystemRef.current.getOrCreatePool('localPlayer');
                    gakeCandleTrailSystemRef.current.update('localPlayer', playerRef.current.position, moving, time, delta);
                }
                
                // --- SLOT MACHINE SYSTEM (spectator bubbles) ---
                if (slotMachineSystemRef.current) {
                    // Pass player position for distance-based culling optimization
                    slotMachineSystemRef.current.setPlayerPosition(
                        playerRef.current.position.x,
                        playerRef.current.position.z
                    );
                    slotMachineSystemRef.current.update(time, delta);
                }
                
                // --- JACKPOT CELEBRATION (disco ball, confetti, lasers) ---
                if (jackpotCelebrationRef.current) {
                    jackpotCelebrationRef.current.update(time, delta);
                }
                
                // --- MOUNT TRAIL SYSTEM (Icy trails, etc.) ---
                if (mountTrailSystemRef.current) {
                    const isMountedWithTrail = playerRef.current.userData?.mount && 
                                               playerRef.current.userData?.mountData && 
                                               mountEnabledRef.current &&
                                               MountTrailSystem.mountHasTrail(playerRef.current.userData.mount);
                    
                    // Only draw trail when on ground (not airborne) and moving
                    const isOnGround = !isAirborne && posRef.current.y < 0.1;
                    if (isMountedWithTrail && moving && isOnGround) {
                        mountTrailSystemRef.current.updateFromMount(
                            'local',
                            posRef.current.x,
                            posRef.current.z,
                            playerRef.current.userData.mount,
                            moving
                        );
                    }
                    
                // Update trail system (fade trails, check effects)
                // Note: 'time' from clock.getElapsedTime() is used for consistent timing
                _mountTrailPos.x = posRef.current.x;
                _mountTrailPos.z = posRef.current.z;
                mountTrailSystemRef.current.update(time * 1000, _mountTrailPos);
                }
                
                // --- MOUNT ANIMATION ---
                // Animate mount when player is moving (only if mount is enabled)
                if (playerRef.current.userData?.mount && playerRef.current.userData?.mountData?.animated && mountEnabledRef.current) {
                    const mountGroup = getMountGroup(playerRef.current);
                    const mountData = playerRef.current.userData.mountData;
                    
                    if (mountGroup) {
                        // Pengu mount waddle animation
                        if (mountData.animationType === 'penguin_waddle') {
                            const leftFlipper = getMountPart(mountGroup, 'left_flipper');
                            const rightFlipper = getMountPart(mountGroup, 'right_flipper');
                            const leftFoot = getMountPart(mountGroup, 'left_foot');
                            const rightFoot = getMountPart(mountGroup, 'right_foot');
                            
                            if (moving) {
                                const waddleSpeed = 10;
                                const flapAmount = Math.sin(time * waddleSpeed) * 0.8; // Y offset for flapping
                                
                                // Flippers flap up and down (Y axis) - opposite of each other
                                if (leftFlipper) leftFlipper.position.y = flapAmount;
                                if (rightFlipper) rightFlipper.position.y = -flapAmount;
                                
                                // Feet paddle up and down (Y axis) - opposite of flippers
                                if (leftFoot) leftFoot.position.y = -flapAmount * 0.6;
                                if (rightFoot) rightFoot.position.y = flapAmount * 0.6;
                                
                                // Waddle the whole mount side to side and bob up/down
                                mountGroup.rotation.z = Math.sin(time * waddleSpeed) * 0.06;
                                const mountBounce = Math.abs(Math.sin(time * waddleSpeed * 0.5)) * 0.08;
                                mountGroup.position.y = 0.65 + mountBounce;
                                playerRef.current.userData.mountBounceY = mountBounce;
                            } else {
                                // Return to rest position smoothly
                                if (leftFlipper) leftFlipper.position.y *= 0.85;
                                if (rightFlipper) rightFlipper.position.y *= 0.85;
                                if (leftFoot) leftFoot.position.y *= 0.85;
                                if (rightFoot) rightFoot.position.y *= 0.85;
                                mountGroup.rotation.z *= 0.9;
                                mountGroup.position.y = 0.65 + (mountGroup.position.y - 0.65) * 0.9;
                                playerRef.current.userData.mountBounceY = Math.max(0, mountGroup.position.y - 0.65);
                            }
                        }
                        // Skateboard grinding animation - sick tricks! 🛹
                        else if (mountData.animationType === 'skateboard_grind') {
                            const frontTruck = getMountPart(mountGroup, 'front_truck_pivot');
                            const backTruck = getMountPart(mountGroup, 'back_truck_pivot');
                            
                            // Get turning input for carving/grinding direction
                            const turningLeft = keyLeft || mobileLeft || (joystickInputRef.current.x < -0.3);
                            const turningRight = keyRight || mobileRight || (joystickInputRef.current.x > 0.3);
                            const turningAmount = turningLeft ? -1 : turningRight ? 1 : 0;
                            
                            // === TRICK ANIMATIONS (Kickflip / 360 Spin) === 🛹✨
                            if (isDoingTrickRef.current) {
                                // Progress the trick (complete in ~0.4 seconds)
                                trickProgressRef.current += delta * 2.5;
                                
                                if (trickProgressRef.current >= 1) {
                                    // Trick complete - reset rotation to 0 (360° = 0°, clean loop!)
                                    trickProgressRef.current = 0;
                                    isDoingTrickRef.current = false;
                                    mountGroup.rotation.z = 0;
                                    mountGroup.rotation.y = 0;
                                }
                                
                                // Progress from 0 to 1
                                const trickProgress = trickProgressRef.current;
                                
                                // Smooth easing for arms/body (peaks in middle of trick)
                                const armIntensity = Math.sin(trickProgress * Math.PI);
                                
                                if (trickTypeRef.current === 'kickflip') {
                                    // KICKFLIP: 360° rotation on Z axis (board flips sideways)
                                    mountGroup.rotation.z = trickProgress * Math.PI * 2;
                                    mountGroup.rotation.y = 0;
                                } else {
                                    // 360 SPIN: Full rotation on Y axis (board spins flat)
                                    mountGroup.rotation.y = trickProgress * Math.PI * 2;
                                    mountGroup.rotation.z = 0;
                                }
                                
                                // Add some height variation during trick
                                const trickBounce = armIntensity * 0.3;
                                mountGroup.position.y = (mountData.positionY || 0.8) + trickBounce;
                                
                                // Store trick state for AnimationSystem
                                playerRef.current.userData.isDoingTrick = true;
                                playerRef.current.userData.trickArmIntensity = armIntensity;
                            } else {
                                playerRef.current.userData.isDoingTrick = false;
                                playerRef.current.userData.trickArmIntensity = 0;
                            }
                            
                            if (moving && !isDoingTrickRef.current) {
                                const grindSpeed = time * 15; // Fast oscillation for grinding effect
                                
                                // === GRINDING LEAN ===
                                // When moving, skateboard leans into turns like real carving
                                const targetLean = turningAmount * 0.25; // Lean into turn
                                const currentLean = mountGroup.rotation.z || 0;
                                mountGroup.rotation.z = currentLean + (targetLean - currentLean) * 0.15;
                                
                                // === NOSE DIPS (kickflip teaser when turning hard) ===
                                const noseDip = turningAmount !== 0 ? Math.sin(grindSpeed) * 0.08 : 0;
                                mountGroup.rotation.x = noseDip;
                                
                                // === ROAD VIBRATION (subtle shake from grinding) ===
                                const vibration = Math.sin(grindSpeed * 3) * 0.015;
                                mountGroup.position.y = (mountData.positionY || 0.8) + vibration;
                                
                                // === TRUCK TURNING (trucks turn when carving) ===
                                if (frontTruck && backTruck) {
                                    // Front truck turns more than back (like real skateboard)
                                    const turnAngle = turningAmount * 0.15;
                                    frontTruck.rotation.y = turnAngle * 1.2;  // Front turns more
                                    backTruck.rotation.y = turnAngle * 0.6;   // Back follows less
                                }
                                
                                // === GRINDING SPARKS === (simple particle effect)
                                // Spawn spark particles near wheels when turning hard
                                if (Math.abs(turningAmount) > 0 && Math.random() < 0.3) {
                                    const sparkColors = mountData.sparkColors || ['#FFD700', '#FFA500', '#FF6600', '#FFFFFF'];
                                    const sparkColor = sparkColors[Math.floor(Math.random() * sparkColors.length)];
                                    
                                    // Use cached geometry + pooled material for performance
                                    const sparkGeo = window._cachedSparkGeo || new THREE.SphereGeometry(0.02, 4, 4);
                                    const sparkMat = acquireSparkMaterial(sparkColor);
                                    const spark = new THREE.Mesh(sparkGeo, sparkMat);
                                    
                                    // Position at back wheels with some randomness
                                    const playerPos = playerRef.current.position;
                                    spark.position.set(
                                        playerPos.x + (Math.random() - 0.5) * 0.3,
                                        0.1 + Math.random() * 0.1,
                                        playerPos.z + (Math.random() - 0.5) * 0.3
                                    );
                                    
                                    // Random velocity (sparks fly out)
                                    spark.userData.velocity = new THREE.Vector3(
                                        (Math.random() - 0.5) * 2 * turningAmount,
                                        Math.random() * 1.5 + 0.5,
                                        (Math.random() - 0.5) * 2
                                    );
                                    spark.userData.life = 0.5 + Math.random() * 0.3; // 0.5-0.8 seconds
                                    spark.userData.startTime = time;
                                    
                                    sceneRef.current.add(spark);
                                    
                                    // Store spark for cleanup (use existing array or create)
                                    if (!playerRef.current.userData.sparks) {
                                        playerRef.current.userData.sparks = [];
                                    }
                                    playerRef.current.userData.sparks.push(spark);
                                }
                                
                                // Update existing sparks
                                if (playerRef.current.userData.sparks) {
                                    playerRef.current.userData.sparks = playerRef.current.userData.sparks.filter(spark => {
                                        const age = time - spark.userData.startTime;
                                        if (age > spark.userData.life) {
                                            sceneRef.current.remove(spark);
                                            // Geometry is shared (window._cachedSparkGeo) — never dispose it here
                                            releaseSparkMaterial(spark.material);
                                            return false;
                                        }
                                        // Update position with gravity
                                        spark.position.x += spark.userData.velocity.x * delta;
                                        spark.position.y += spark.userData.velocity.y * delta;
                                        spark.position.z += spark.userData.velocity.z * delta;
                                        spark.userData.velocity.y -= 9.8 * delta; // Gravity
                                        // Fade out
                                        spark.material.opacity = 1 - (age / spark.userData.life);
                                        return true;
                                    });
                                }
                                
                                // === PLAYER LEAN ADJUSTMENT ===
                                // Rider leans with the board (handled in AnimationSystem)
                                playerRef.current.userData.skateboardLean = mountGroup.rotation.z;
                                playerRef.current.userData.skateboardSpeed = 1.0;
                                
                            } else if (!isDoingTrickRef.current) {
                                // === IDLE - NO WOBBLE ===
                                // Smooth return to neutral, board stays still
                                mountGroup.rotation.z = (mountGroup.rotation.z || 0) * 0.9;
                                mountGroup.rotation.x *= 0.9;
                                mountGroup.rotation.y = (mountGroup.rotation.y || 0) * 0.9;
                                mountGroup.position.y = mountData.positionY || 0.8;
                                
                                // Trucks return to center
                                if (frontTruck) {
                                    frontTruck.rotation.y *= 0.85;
                                    frontTruck.rotation.z = 0;
                                }
                                if (backTruck) {
                                    backTruck.rotation.y *= 0.85;
                                    backTruck.rotation.z = 0;
                                }
                                
                                playerRef.current.userData.skateboardLean = 0;
                                playerRef.current.userData.skateboardSpeed = 0;
                            }
                        }
                        // UFO Disc hover animation 🛸
                        else if (mountData.animationType === 'ufo_hover') {
                            const spinRing = getMountPart(mountGroup, 'spin_ring_pivot');
                            const abductionRay = getMountPart(mountGroup, 'abduction_ray');
                            const abductionRayInner = getMountPart(mountGroup, 'abduction_ray_inner');
                            const abductionLight = getMountPart(mountGroup, 'abduction_light');
                            
                            const hoverSpeed = mountData.hoverSpeed || 3;
                            const hoverIntensity = mountData.hoverIntensity || 0.12;
                            const ringSpinSpeed = mountData.ringSpinSpeed || 2;
                            const tiltAmount = mountData.tiltAmount || 0.35;
                            
                            // === CONTINUOUS RING SPIN ===
                            // Ring always spins, faster when moving
                            if (spinRing) {
                                const spinMultiplier = moving ? 1.5 : 1;
                                spinRing.rotation.y += delta * ringSpinSpeed * spinMultiplier;
                            }
                            
                            // === ABDUCTION RAY ANIMATION ===
                            if (abductionRay && abductionRay.material) {
                                const rayPulse = 0.2 + Math.sin(time * 4) * 0.1;
                                abductionRay.material.opacity = rayPulse;
                                abductionRay.rotation.y += delta * 0.5; // Slow rotation
                            }
                            if (abductionRayInner && abductionRayInner.material) {
                                const innerPulse = 0.3 + Math.sin(time * 4 + 0.5) * 0.15;
                                abductionRayInner.material.opacity = innerPulse;
                                abductionRayInner.rotation.y -= delta * 0.3; // Counter-rotate
                            }
                            if (abductionLight) {
                                abductionLight.intensity = 0.4 + Math.sin(time * 4) * 0.2;
                            }
                            
                            if (moving) {
                                // === HOVER WOBBLE ===
                                const hoverTime = time * hoverSpeed;
                                const hover = Math.sin(hoverTime) * hoverIntensity;
                                mountGroup.position.y = (mountData.positionY || 1.4) + hover + 0.05; // Slight lift when moving
                                
                                // Store for player sync
                                playerRef.current.userData.mountBounceY = hover;
                                
                                // === TILT INTO MOVEMENT ===
                                const turningLeft = keyLeft || mobileLeft || (joystickInputRef.current.x < -0.3);
                                const turningRight = keyRight || mobileRight || (joystickInputRef.current.x > 0.3);
                                const movingForward = keyForward || mobileForward || (joystickInputRef.current.y < -0.1);
                                const movingBack = keyBack || mobileBack || (joystickInputRef.current.y > 0.1);
                                
                                // Bank into turns - more aggressive lean
                                const targetRollZ = turningLeft ? -tiltAmount : turningRight ? tiltAmount : 0;
                                mountGroup.rotation.z += (targetRollZ - mountGroup.rotation.z) * 0.15;
                                
                                // Pitch forward/back
                                const targetPitchX = movingForward ? tiltAmount * 0.6 : movingBack ? -tiltAmount * 0.4 : 0;
                                mountGroup.rotation.x += (targetPitchX - mountGroup.rotation.x) * 0.15;
                                
                            } else {
                                // === IDLE HOVER ===
                                const idleHover = Math.sin(time * 2) * 0.06;
                                mountGroup.position.y = (mountData.positionY || 1.4) + idleHover;
                                
                                // Store for player sync
                                playerRef.current.userData.mountBounceY = idleHover;
                                
                                // Gentle return to level
                                mountGroup.rotation.z *= 0.92;
                                mountGroup.rotation.x *= 0.92;
                                
                                // Slight idle wobble
                                mountGroup.rotation.z += Math.sin(time * 1.5) * 0.008;
                            }
                        }
                        // Giant Puffle bounce animation 🐾
                        else if (mountData.animationType === 'puffle_bounce') {
                            const tuftPivot = getMountPart(mountGroup, 'tuft_pivot');
                            
                            const bounceIntensity = mountData.bounceIntensity || 0.25;
                            const bounceSpeed = mountData.bounceSpeed || 10;
                            const squishFactor = mountData.squishFactor || 0.12;
                            const tuftWiggleSpeed = mountData.tuftWiggleSpeed || 15;
                            const tuftWiggleAmount = mountData.tuftWiggleAmount || 0.3;
                            
                            if (moving) {
                                const bounceTime = time * bounceSpeed;
                                
                                // === BOUNCY BALL PHYSICS ===
                                // Big exaggerated bounces like a rubber ball
                                const bounce = Math.abs(Math.sin(bounceTime)) * bounceIntensity;
                                mountGroup.position.y = (mountData.positionY || 0.6) + bounce;
                                
                                // Store bounce offset for player to follow
                                playerRef.current.userData.mountBounceY = bounce;
                                
                                // === SQUISH ON LANDING ===
                                // Puffle squishes when hitting ground, stretches in air
                                const squishPhase = Math.sin(bounceTime);
                                const scaleY = (mountData.scale || 0.16) * (1 - Math.abs(squishPhase) * squishFactor);
                                const scaleXZ = (mountData.scale || 0.16) * (1 + Math.abs(squishPhase) * squishFactor * 0.5);
                                mountGroup.scale.set(scaleXZ, scaleY, scaleXZ);
                                
                                // === WOBBLE (ball rolling feel) ===
                                mountGroup.rotation.z = Math.sin(bounceTime * 0.7) * 0.08;
                                mountGroup.rotation.x = Math.sin(bounceTime * 0.9) * 0.05;
                                
                                // === TUFT WIGGLE ===
                                if (tuftPivot) {
                                    tuftPivot.rotation.z = Math.sin(time * tuftWiggleSpeed) * tuftWiggleAmount;
                                    tuftPivot.rotation.x = Math.cos(time * tuftWiggleSpeed * 0.8) * tuftWiggleAmount * 0.7;
                                }
                                
                                // === TURN LEAN ===
                                const turningLeft = keyLeft || mobileLeft || (joystickInputRef.current.x < -0.3);
                                const turningRight = keyRight || mobileRight || (joystickInputRef.current.x > 0.3);
                                if (turningLeft) {
                                    mountGroup.rotation.z -= 0.12;
                                } else if (turningRight) {
                                    mountGroup.rotation.z += 0.12;
                                }
                                
                            } else {
                                // === IDLE - Gentle breathing/bobbing ===
                                const idleBob = Math.sin(time * 2) * 0.03;
                                mountGroup.position.y = (mountData.positionY || 0.6) + idleBob;
                                
                                // Store bounce offset for player to follow
                                playerRef.current.userData.mountBounceY = idleBob;
                                
                                // Gentle scale pulse (breathing)
                                const breathe = 1 + Math.sin(time * 1.5) * 0.02;
                                const baseScale = mountData.scale || 0.16;
                                mountGroup.scale.set(baseScale * breathe, baseScale * breathe, baseScale * breathe);
                                
                                // Smooth return to neutral
                                mountGroup.rotation.z *= 0.9;
                                mountGroup.rotation.x *= 0.9;
                                
                                // Tuft gentle sway
                                if (tuftPivot) {
                                    tuftPivot.rotation.z = Math.sin(time * 3) * 0.1;
                                    tuftPivot.rotation.x *= 0.9;
                                }
                            }
                        }
                        // Rocket Jetpack thrust animation 🚀
                        else if (mountData.animationType === 'jetpack_thrust') {
                            const fireTrail = getMountPart(mountGroup, 'fire_trail');
                            const leftLight = getMountPart(mountGroup, 'exhaust_light_left');
                            const rightLight = getMountPart(mountGroup, 'exhaust_light_right');
                            
                            const hoverSpeed = mountData.hoverSpeed || 5;
                            const hoverIntensity = mountData.hoverIntensity || 0.06;
                            const thrustWobble = mountData.thrustWobble || 0.04;
                            const VOXEL_SIZE = 0.125;
                            
                            // === FIRE PARTICLE ANIMATION ===
                            if (fireTrail && fireTrail.geometry) {
                                const positions = fireTrail.geometry.attributes.position.array;
                                const colors = fireTrail.geometry.attributes.color.array;
                                const particleCount = fireTrail.userData.particleCount || 30;
                                
                                for (let i = 0; i < particleCount; i++) {
                                    const idx = i * 3;
                                    const side = i % 2 === 0 ? -1 : 1;
                                    
                                    // Move particles downward (thrust)
                                    positions[idx + 1] -= delta * (moving ? 3 : 1.5);
                                    
                                    // Add some spread
                                    positions[idx] += (Math.random() - 0.5) * delta * 0.5;
                                    positions[idx + 2] += (Math.random() - 0.5) * delta * 0.3;
                                    
                                    // Reset particles that go too far
                                    if (positions[idx + 1] < -7 * VOXEL_SIZE - (moving ? 1.2 : 0.4)) {
                                        positions[idx] = side * 3 * VOXEL_SIZE + (Math.random() - 0.5) * 0.1;
                                        positions[idx + 1] = -7 * VOXEL_SIZE;
                                        positions[idx + 2] = (Math.random() - 0.5) * 0.1;
                                        
                                        // Randomize color on reset
                                        const colorChoice = Math.random();
                                        if (colorChoice < 0.4) {
                                            colors[idx] = 1.0; colors[idx + 1] = 0.3; colors[idx + 2] = 0.0;
                                        } else if (colorChoice < 0.7) {
                                            colors[idx] = 1.0; colors[idx + 1] = 0.1; colors[idx + 2] = 0.0;
                                        } else {
                                            colors[idx] = 1.0; colors[idx + 1] = 0.8; colors[idx + 2] = 0.0;
                                        }
                                    }
                                    
                                    // Fade out as particles fall
                                    const dist = Math.abs(positions[idx + 1] + 7 * VOXEL_SIZE);
                                    colors[idx + 1] *= 0.98; // Fade orange to red
                                }
                                
                                fireTrail.geometry.attributes.position.needsUpdate = true;
                                fireTrail.geometry.attributes.color.needsUpdate = true;
                                
                                // Particle opacity based on movement
                                fireTrail.material.opacity = moving ? 0.95 : 0.5;
                            }
                            
                            // === EXHAUST LIGHTS ===
                            const lightIntensity = moving ? 1.0 + Math.sin(time * 20) * 0.3 : 0.4 + Math.sin(time * 8) * 0.1;
                            if (leftLight) leftLight.intensity = lightIntensity;
                            if (rightLight) rightLight.intensity = lightIntensity;
                            
                            if (moving) {
                                // === THRUST HOVER ===
                                const hoverTime = time * hoverSpeed;
                                const hover = Math.sin(hoverTime) * hoverIntensity + 0.1; // Always slightly elevated
                                mountGroup.position.y = (mountData.positionY || 0.6) + hover;
                                
                                // Store for player sync
                                playerRef.current.userData.mountBounceY = hover;
                                
                                // === THRUST WOBBLE (engine vibration) ===
                                mountGroup.rotation.z = Math.sin(time * 25) * thrustWobble;
                                mountGroup.rotation.x = Math.sin(time * 20) * thrustWobble * 0.5;
                                
                                // === TILT INTO MOVEMENT ===
                                const turningLeft = keyLeft || mobileLeft || (joystickInputRef.current.x < -0.3);
                                const turningRight = keyRight || mobileRight || (joystickInputRef.current.x > 0.3);
                                const movingForward = keyForward || mobileForward || (joystickInputRef.current.y < -0.1);
                                const movingBack = keyBack || mobileBack || (joystickInputRef.current.y > 0.1);
                                
                                // Bank into turns (mount)
                                if (turningLeft) mountGroup.rotation.z -= 0.2;
                                if (turningRight) mountGroup.rotation.z += 0.2;
                                
                                // Pitch forward when moving (mount)
                                if (movingForward) mountGroup.rotation.x += 0.15;
                                
                                // === PLAYER BODY LEAN ===
                                // Store lean values for AnimationSystem to apply to ENTIRE player body
                                let playerLeanZ = 0;
                                let playerLeanX = 0;
                                if (turningLeft) playerLeanZ = 0.5;   // Lean into left turn (more dramatic)
                                if (turningRight) playerLeanZ = -0.5;  // Lean into right turn
                                if (movingForward) playerLeanX = 0.4;  // Lean forward significantly
                                if (movingBack) playerLeanX = -0.3;    // Lean back
                                
                                // Combine forward lean with turn lean for diagonal movement
                                if ((turningLeft || turningRight) && movingForward) {
                                    playerLeanX = 0.3; // Slightly less forward lean when also turning
                                }
                                
                                playerRef.current.userData.jetpackLeanZ = playerLeanZ;
                                playerRef.current.userData.jetpackLeanX = playerLeanX;
                                
                            } else {
                                // === IDLE HOVER ===
                                const idleHover = Math.sin(time * 2) * 0.03;
                                mountGroup.position.y = (mountData.positionY || 0.6) + idleHover;
                                
                                // Store for player sync
                                playerRef.current.userData.mountBounceY = idleHover;
                                
                                // Clear lean values
                                playerRef.current.userData.jetpackLeanZ = 0;
                                playerRef.current.userData.jetpackLeanX = 0;
                                
                                // Gentle idle sway
                                mountGroup.rotation.z = Math.sin(time * 1.5) * 0.02;
                                mountGroup.rotation.x *= 0.95;
                            }
                        }
                        // Dragon flying animation 🐉 (All dragon types!)
                        else if (mountData.animationType === 'dragon_fly') {
                            const leftWing = getMountPart(mountGroup, 'left_wing_pivot');
                            const rightWing = getMountPart(mountGroup, 'right_wing_pivot');
                            const dragonBreath = getMountPart(mountGroup, 'dragon_breath');
                            const breathGlow = getMountPart(mountGroup, 'breath_glow');
                            
                            const flapSpeed = mountData.flapSpeed || 3;
                            const flapIntensity = mountData.flapIntensity || 0.7;
                            const bodyBobSpeed = mountData.bodyBobSpeed || 2;
                            const bodyBobIntensity = mountData.bodyBobIntensity || 0.12;
                            const tailSwaySpeed = mountData.tailSwaySpeed || 1.5;
                            const tailSwayIntensity = mountData.tailSwayIntensity || 0.2;
                            const breathInterval = mountData.breathInterval || 4;
                            const breathDuration = mountData.breathDuration || 1.5;
                            const VOXEL_SIZE = 0.125;
                            
                            // Initialize dragon state if needed
                            if (!mountGroup.userData.dragonState) {
                                mountGroup.userData.dragonState = {
                                    lastBreathTime: time - breathInterval + 2, // Breath soon after mounting
                                    isBreathing: false,
                                    breathStartTime: 0
                                };
                            }
                            const dragonState = mountGroup.userData.dragonState;
                            
                            // === RANDOM ICE BREATH BURSTS ===
                            // Check if it's time for a breath attack
                            if (!dragonState.isBreathing && time - dragonState.lastBreathTime > breathInterval) {
                                // Random chance to breathe (or always when moving fast)
                                if (Math.random() < 0.3 || moving) {
                                    dragonState.isBreathing = true;
                                    dragonState.breathStartTime = time;
                                    dragonState.lastBreathTime = time;
                                }
                            }
                            
                            // Check if breath should end
                            if (dragonState.isBreathing && time - dragonState.breathStartTime > breathDuration) {
                                dragonState.isBreathing = false;
                            }
                            
                            const breathIntensity = dragonState.isBreathing ? 1.0 : 0.15;
                            
                            // === MAJESTIC WING FLAPPING ===
                            const baseFlap = moving ? flapSpeed * 1.8 : flapSpeed;
                            const flapAngle = Math.sin(time * baseFlap) * flapIntensity * (moving ? 1.3 : 0.8);
                            // Add secondary motion for more realistic wings
                            const secondaryFlap = Math.sin(time * baseFlap * 2) * 0.15;
                            
                            if (leftWing) {
                                leftWing.rotation.z = flapAngle + secondaryFlap;
                                leftWing.rotation.x = Math.sin(time * baseFlap + 0.5) * 0.2;
                                // Wing flex (slight bend at tips feel)
                                leftWing.rotation.y = Math.sin(time * baseFlap) * 0.1;
                            }
                            if (rightWing) {
                                rightWing.rotation.z = -flapAngle - secondaryFlap;
                                rightWing.rotation.x = Math.sin(time * baseFlap + 0.5) * 0.2;
                                rightWing.rotation.y = -Math.sin(time * baseFlap) * 0.1;
                            }
                            
                            // === DRAGON BREATH PARTICLES (ice, fire, or void) ===
                            if (dragonBreath && dragonBreath.geometry) {
                                const positions = dragonBreath.geometry.attributes.position.array;
                                const colors = dragonBreath.geometry.attributes.color.array;
                                const particleCount = dragonBreath.userData.particleCount || 50;
                                const breathType = dragonBreath.userData.breathType || 'ice';
                                const mouthZ = dragonBreath.userData.mouthZ || -16;
                                const mouthY = dragonBreath.userData.mouthY || 1.5;
                                
                                for (let i = 0; i < particleCount; i++) {
                                    const idx = i * 3;
                                    
                                    // Move particles forward - EPIC breath when active
                                    const breathSpeed = dragonState.isBreathing ? 6.0 : 1.0;
                                    positions[idx + 2] -= delta * breathSpeed;
                                    
                                    // Spread out as they travel
                                    const spread = dragonState.isBreathing ? 2.5 : 0.4;
                                    positions[idx] += (Math.random() - 0.5) * delta * spread;
                                    positions[idx + 1] += (Math.random() - 0.5) * delta * spread * 0.6;
                                    
                                    // Fire rises, ice/void drifts down
                                    if (dragonState.isBreathing) {
                                        if (breathType === 'fire') positions[idx + 1] += delta * 0.2;
                                        else positions[idx + 1] -= delta * 0.3;
                                    }
                                    
                                    // Reset distance based on breath state
                                    const maxDist = dragonState.isBreathing ? 5.0 : 1.0;
                                    if (positions[idx + 2] < mouthZ * VOXEL_SIZE - maxDist) {
                                        positions[idx] = (Math.random() - 0.5) * 0.2;
                                        positions[idx + 1] = mouthY * VOXEL_SIZE + (Math.random() - 0.5) * 0.15;
                                        positions[idx + 2] = mouthZ * VOXEL_SIZE;
                                        
                                        // Colors based on breath type
                                        const colorChoice = Math.random();
                                        if (breathType === 'ice') {
                                            if (colorChoice < 0.3) { colors[idx] = 1.0; colors[idx + 1] = 1.0; colors[idx + 2] = 1.0; }
                                            else if (colorChoice < 0.6) { colors[idx] = 0.7; colors[idx + 1] = 0.9; colors[idx + 2] = 1.0; }
                                            else { colors[idx] = 0.0; colors[idx + 1] = 0.95; colors[idx + 2] = 1.0; }
                                        } else if (breathType === 'fire') {
                                            if (colorChoice < 0.3) { colors[idx] = 1.0; colors[idx + 1] = 1.0; colors[idx + 2] = 0.0; }
                                            else if (colorChoice < 0.6) { colors[idx] = 1.0; colors[idx + 1] = 0.5; colors[idx + 2] = 0.0; }
                                            else { colors[idx] = 1.0; colors[idx + 1] = 0.2; colors[idx + 2] = 0.0; }
                                        } else { // void
                                            if (colorChoice < 0.3) { colors[idx] = 0.9; colors[idx + 1] = 0.3; colors[idx + 2] = 1.0; }
                                            else if (colorChoice < 0.6) { colors[idx] = 0.6; colors[idx + 1] = 0.2; colors[idx + 2] = 0.8; }
                                            else { colors[idx] = 0.2; colors[idx + 1] = 0.0; colors[idx + 2] = 0.3; }
                                        }
                                    }
                                }
                                
                                dragonBreath.geometry.attributes.position.needsUpdate = true;
                                dragonBreath.geometry.attributes.color.needsUpdate = true;
                                dragonBreath.material.opacity = dragonState.isBreathing ? 0.95 : 0.3;
                                dragonBreath.material.size = dragonState.isBreathing ? 0.2 : 0.08;
                            }
                            
                            // Breath glow pulses during breath
                            if (breathGlow) {
                                const baseGlow = dragonState.isBreathing ? 2.5 : 0.5;
                                const pulse = dragonState.isBreathing ? Math.sin(time * 12) * 0.8 : Math.sin(time * 2) * 0.15;
                                breathGlow.intensity = baseGlow + pulse;
                            }
                            
                            // Eye glows
                            const leftEyeGlow = getMountPart(mountGroup, 'left_eye_glow');
                            const rightEyeGlow = getMountPart(mountGroup, 'right_eye_glow');
                            if (leftEyeGlow && rightEyeGlow) {
                                const eyeBase = dragonState.isBreathing ? 0.8 : 0.4;
                                const eyePulse = Math.sin(time * 3) * 0.2;
                                leftEyeGlow.intensity = eyeBase + eyePulse;
                                rightEyeGlow.intensity = eyeBase + eyePulse;
                            }
                            
                            if (moving) {
                                // === POWERFUL FLYING MOTION ===
                                const bobTime = time * bodyBobSpeed;
                                const bob = Math.sin(bobTime) * bodyBobIntensity;
                                // Add slight undulation
                                const undulate = Math.sin(time * 1.2) * 0.03;
                                mountGroup.position.y = (mountData.positionY || 1.8) + bob + undulate + 0.15;
                                
                                playerRef.current.userData.mountBounceY = bob + undulate;
                                
                                // === EPIC BANKING INTO TURNS ===
                                const turningLeft = keyLeft || mobileLeft || (joystickInputRef.current.x < -0.3);
                                const turningRight = keyRight || mobileRight || (joystickInputRef.current.x > 0.3);
                                const movingForward = keyForward || mobileForward || (joystickInputRef.current.y < -0.1);
                                const movingBack = keyBack || mobileBack || (joystickInputRef.current.y > 0.1);
                                
                                // Dramatic banking (like a real flying creature)
                                let targetRoll = 0;
                                if (turningLeft) targetRoll = 0.4;
                                if (turningRight) targetRoll = -0.4;
                                mountGroup.rotation.z += (targetRoll - mountGroup.rotation.z) * 0.08;
                                
                                // Pitch based on movement
                                let targetPitch = 0;
                                if (movingForward) targetPitch = 0.2;
                                if (movingBack) targetPitch = -0.15;
                                mountGroup.rotation.x += (targetPitch - mountGroup.rotation.x) * 0.08;
                                
                                // Subtle yaw wiggle (serpentine flight)
                                const yawWiggle = Math.sin(time * 1.5) * 0.03;
                                mountGroup.rotation.y = (mountData.mountRotation || 0) + yawWiggle;
                                
                            } else {
                                // === MAJESTIC IDLE ANIMATIONS ===
                                // Gentle hovering bob
                                const idleBob = Math.sin(time * 1.2) * 0.06;
                                // Breathing motion (expand/contract)
                                const breathe = Math.sin(time * 0.8) * 0.02;
                                mountGroup.position.y = (mountData.positionY || 1.8) + idleBob + breathe;
                                
                                playerRef.current.userData.mountBounceY = idleBob;
                                
                                // Idle swaying (looking around)
                                const idleSway = Math.sin(time * 0.5) * 0.05;
                                mountGroup.rotation.z = idleSway;
                                
                                // Occasional head turn (simulated via slight yaw)
                                const lookAround = Math.sin(time * 0.3) * 0.08;
                                mountGroup.rotation.y = (mountData.mountRotation || 0) + lookAround;
                                
                                // Gentle pitch (nodding)
                                mountGroup.rotation.x = Math.sin(time * 0.7) * 0.03;
                            }
                        }
                        // Giant Rubber Duck bounce animation 🦆
                        else if (mountData.animationType === 'duck_bounce') {
                            const bounceIntensity = mountData.bounceIntensity || 0.15;
                            const waddleSpeed = mountData.waddleSpeed || 8;
                            const waddleIntensity = mountData.waddleIntensity || 0.12;
                            
                            if (moving) {
                                // === BOUNCY MOVEMENT ===
                                // Duck bounces up and down like a rubber toy
                                const bounceTime = time * waddleSpeed;
                                const bounce = Math.abs(Math.sin(bounceTime)) * bounceIntensity;
                                mountGroup.position.y = (mountData.positionY || 0.5) + bounce;
                                
                                // Store bounce offset for player to follow
                                playerRef.current.userData.mountBounceY = bounce;
                                
                                // === WADDLE (side to side tilt) ===
                                // Classic duck waddle motion
                                mountGroup.rotation.z = Math.sin(bounceTime) * waddleIntensity;
                                
                                // === FORWARD/BACK BOB ===
                                // Head bobs forward when "stepping"
                                mountGroup.rotation.x = Math.sin(bounceTime * 2) * 0.05;
                                
                                // === TURN LEAN ===
                                const turningLeft = keyLeft || mobileLeft || (joystickInputRef.current.x < -0.3);
                                const turningRight = keyRight || mobileRight || (joystickInputRef.current.x > 0.3);
                                if (turningLeft) {
                                    mountGroup.rotation.z -= 0.1;
                                } else if (turningRight) {
                                    mountGroup.rotation.z += 0.1;
                                }
                                
                                // === SQUISH EFFECT ===
                                // Duck squishes slightly on landing
                                const squish = 1 - Math.abs(Math.sin(bounceTime)) * 0.08;
                                mountGroup.scale.y = (mountData.scale || 0.2) * squish;
                                
                            } else {
                                // === IDLE - Gentle bob ===
                                // Duck floats/bobs gently when stationary
                                const idleBob = Math.sin(time * 2) * 0.02;
                                mountGroup.position.y = (mountData.positionY || 0.5) + idleBob;
                                
                                // Store bounce offset for player to follow
                                playerRef.current.userData.mountBounceY = idleBob;
                                
                                // Slow return to neutral rotation
                                mountGroup.rotation.z *= 0.92;
                                mountGroup.rotation.x *= 0.92;
                                
                                // Reset scale
                                const targetScale = mountData.scale || 0.2;
                                mountGroup.scale.y += (targetScale - mountGroup.scale.y) * 0.1;
                            }
                        }
                        // Shopping Cart wobble animation 🛒
                        else if (mountData.animationType === 'cart_wobble') {
                            const wheelFL = getMountPart(mountGroup, 'wheel_fl_pivot');
                            const wheelFR = getMountPart(mountGroup, 'wheel_fr_pivot');
                            const wheelBL = getMountPart(mountGroup, 'wheel_bl_pivot');
                            const wheelBR = getMountPart(mountGroup, 'wheel_br_pivot');
                            
                            const wobbleIntensity = mountData.wobbleIntensity || 0.08;
                            const wheelSpinSpeed = mountData.wheelSpinSpeed || 25;
                            
                            if (moving) {
                                // === WHEEL SPINNING ===
                                // All wheels spin based on movement speed
                                const spinAmount = delta * wheelSpinSpeed;
                                if (wheelFL) wheelFL.rotation.x += spinAmount;
                                if (wheelFR) wheelFR.rotation.x += spinAmount;
                                if (wheelBL) wheelBL.rotation.x += spinAmount;
                                if (wheelBR) wheelBR.rotation.x += spinAmount;
                                
                                // === CART WOBBLE ===
                                // Realistic shopping cart shake/rattle
                                const wobbleTime = time * 12;
                                
                                // Primary wobble (side to side)
                                mountGroup.rotation.z = Math.sin(wobbleTime) * wobbleIntensity;
                                
                                // Secondary wobble (front to back, less intense)
                                mountGroup.rotation.x = Math.sin(wobbleTime * 1.3) * wobbleIntensity * 0.5;
                                
                                // Vertical bounce (bumpy wheels)
                                const bounce = Math.abs(Math.sin(wobbleTime * 2)) * 0.03;
                                mountGroup.position.y = (mountData.positionY || 0.45) + bounce;
                                
                                // Store bounce offset for player to follow
                                playerRef.current.userData.mountBounceY = bounce;
                                
                                // === TURNING LEAN ===
                                const turningLeft = keyLeft || mobileLeft || (joystickInputRef.current.x < -0.3);
                                const turningRight = keyRight || mobileRight || (joystickInputRef.current.x > 0.3);
                                const turnLean = turningLeft ? -0.1 : turningRight ? 0.1 : 0;
                                mountGroup.rotation.z += turnLean;
                                
                                // Back wheels swivel when turning (shopping cart physics!)
                                if (wheelBL && wheelBR) {
                                    const swivelAngle = turningLeft ? -0.3 : turningRight ? 0.3 : 0;
                                    wheelBL.rotation.y = swivelAngle;
                                    wheelBR.rotation.y = swivelAngle;
                                }
                                
                            } else {
                                // === IDLE - Settle down ===
                                // Smooth return to rest
                                mountGroup.rotation.z *= 0.9;
                                mountGroup.rotation.x *= 0.9;
                                mountGroup.position.y = mountData.positionY || 0.45;
                                
                                // Store bounce offset for player
                                playerRef.current.userData.mountBounceY = 0;
                                
                                // Wheels stop gradually
                                if (wheelFL) wheelFL.rotation.x *= 0.95;
                                if (wheelFR) wheelFR.rotation.x *= 0.95;
                                if (wheelBL) {
                                    wheelBL.rotation.x *= 0.95;
                                    wheelBL.rotation.y *= 0.9;
                                }
                                if (wheelBR) {
                                    wheelBR.rotation.x *= 0.95;
                                    wheelBR.rotation.y *= 0.9;
                                }
                            }
                        }
                        // Boat rowing animation
                        else if (mountData.animationType === 'rowing' || mountData.leftOar) {
                            const leftOarPivot = getMountPart(mountGroup, 'left_oar_pivot');
                            const rightOarPivot = getMountPart(mountGroup, 'right_oar_pivot');
                        
                            if (leftOarPivot && rightOarPivot) {
                            // Check for turning input
                            const turningLeft = keyLeft || mobileLeft || (joystickInputRef.current.x < -0.3);
                            const turningRight = keyRight || mobileRight || (joystickInputRef.current.x > 0.3);
                            
                            // Check forward/backward direction
                            const movingForward = keyForward || mobileForward || (joystickInputRef.current.y < -0.1);
                            const movingBackward = keyBack || mobileBack || (joystickInputRef.current.y > 0.1);
                            
                            // Direction multiplier: -1 for forward (pull oars back), +1 for backward (push oars forward)
                            const directionMult = movingForward ? -1 : 1;
                            
                            if (moving) {
                                const rowSpeed = 8;
                                const baseRowAngle = Math.sin(time * rowSpeed) * 0.5 * directionMult;
                                
                                // Differential rowing for turning
                                let leftSpeed = 1.0;
                                let rightSpeed = 1.0;
                                
                                if (turningLeft) {
                                    // Turn left: LEFT oar rows faster
                                    leftSpeed = 1.5;
                                    rightSpeed = 0.3;
                                } else if (turningRight) {
                                    // Turn right: RIGHT oar rows faster
                                    leftSpeed = 0.3;
                                    rightSpeed = 1.5;
                                }
                                
                                // Apply rowing animation - Y rotation for forward/backward motion
                                leftOarPivot.rotation.y = baseRowAngle * leftSpeed;
                                rightOarPivot.rotation.y = -baseRowAngle * rightSpeed;
                                
                                // Z rotation for oar dip into water
                                leftOarPivot.rotation.z = Math.sin(time * rowSpeed + Math.PI/2) * 0.15 * leftSpeed * directionMult;
                                rightOarPivot.rotation.z = -Math.sin(time * rowSpeed + Math.PI/2) * 0.15 * rightSpeed * directionMult;
                            } else if (turningLeft || turningRight) {
                                // Stationary turning - only one oar rows
                                const rowSpeed = 6;
                                const turnAngle = Math.sin(time * rowSpeed) * 0.4;
                                
                                if (turningLeft) {
                                    // Turn left: left oar rows
                                    leftOarPivot.rotation.y = turnAngle;
                                    leftOarPivot.rotation.z = Math.sin(time * rowSpeed + Math.PI/2) * 0.1;
                                    rightOarPivot.rotation.y *= 0.9;
                                    rightOarPivot.rotation.z *= 0.9;
                                } else {
                                    // Turn right: right oar rows
                                    rightOarPivot.rotation.y = -turnAngle;
                                    rightOarPivot.rotation.z = -Math.sin(time * rowSpeed + Math.PI/2) * 0.1;
                                    leftOarPivot.rotation.y *= 0.9;
                                    leftOarPivot.rotation.z *= 0.9;
                                }
                            } else {
                                // Rest position when not moving
                                leftOarPivot.rotation.y *= 0.9;
                                rightOarPivot.rotation.y *= 0.9;
                                leftOarPivot.rotation.z *= 0.9;
                                rightOarPivot.rotation.z *= 0.9;
                            }
                            }
                        }
                    }
                }
            }
            
            // --- AI UPDATE LOOP (OPTIMIZED: throttle to every 2nd frame) ---
            const now = Date.now();
            // Using cached values: centerX, centerZ, dojoBxCached, dojoBzCached, dojoHdCached, puffleMap, aiMap
            
            // Update all AI agents (movement, conversations, room transitions, animations)
            updateAIAgents({
                aiAgents: aiAgentsRef.current,
                aiPuffles: aiPufflesRef.current,
                currentRoom: roomRef.current,
                roomData: roomDataRef.current,
                frameCount,
                time,
                delta,
                centerCoords: { centerX, centerZ },
                dojoCoords: { dojoBx: dojoBxCached, dojoBz: dojoBzCached, dojoHd: dojoHdCached },
                constants: { CITY_SIZE, BUILDING_SCALE, BUILDINGS },
                THREE,
                createChatSprite: (THREE, text) => createChatSprite(THREE, text),
                animateMesh,
                cacheAnimatedParts,
                animateCosmeticsFromCache,
                wizardTrailRef: wizardTrailSystemRef
            });

            // ==================== OTHER PLAYERS UPDATE (60fps in game loop) ====================
            const otherMeshes = otherPlayerMeshesRef.current;
            const playersData = playersDataRef.current;
            const lerpFactor = calculateLerpFactor(delta, 10);
            const yLerpFactor = calculateLerpFactor(delta, 15);
            
            // Backstop: remote players in the room but missing a mesh (e.g. builder-ready race)
            if (time - lastMissingMeshCheckRef.current > 1) {
                lastMissingMeshCheckRef.current = time;
                for (const id of playerListRef.current) {
                    if (id === playerId) continue;
                    if (otherMeshes.has(id)) continue;
                    const missingData = playersData.get(id);
                    if (!missingData?.appearance) {
                        const misses = (meshSyncMissRef.current.get(id) || 0) + 1;
                        meshSyncMissRef.current.set(id, misses);
                        if (misses > 10) continue;
                        continue;
                    }
                    meshSyncMissRef.current.delete(id);
                    if (!meshSyncBumpScheduledRef.current) {
                        meshSyncBumpScheduledRef.current = true;
                        Promise.resolve().then(() => {
                            meshSyncBumpScheduledRef.current = false;
                            setMeshSyncVersion((v) => v + 1);
                        });
                    }
                    break;
                }
            }
            
            // OPTIMIZATION: Cache local player position for distance checks
            const localPosX = posRef.current?.x || 0;
            const localPosZ = posRef.current?.z || 0;
            
            // Tick performance manager for frame-based throttling
            performanceManager.tick();
            
            for (const [id, meshData] of otherMeshes) {
                const playerData = playersData.get(id);
                if (!playerData || !meshData.mesh) continue;

                if (playerData.needsNametagRebuild && createNameSpriteRef.current) {
                    const newSprite = createNameSpriteRef.current(playerData.name || 'Player', playerData);
                    if (newSprite) {
                        if (meshData.nameSprite) {
                            meshData.mesh.remove(meshData.nameSprite);
                            disposeNameSprite(meshData.nameSprite);
                        }
                        const characterType = playerData.appearance?.characterType || 'penguin';
                        const nameHeight = characterType === 'marcus' ? NAME_HEIGHT_MARCUS : characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
                        newSprite.position.set(0, nameHeight, 0);
                        meshData.mesh.add(newSprite);
                        meshData.nameSprite = newSprite;
                        playerData.needsNametagRebuild = false;
                        if (meshData.goldRainSystem) {
                            meshData.goldRainSystem.dispose();
                            meshData.goldRainSystem = null;
                            meshData._particlePreset = null;
                            meshData._particleColor = null;
                        }
                    }
                }
                
                // Rebuild mesh if appearance changed
                if (playerData.needsMeshRebuild && buildPenguinMeshRef.current) {
                    console.log(`🔄 Rebuilding mesh for ${playerData.name} due to appearance change (characterType=${playerData.appearance?.characterType || 'penguin'})`);
                    
                    // Store current position and rotation
                    const currentPos = meshData.mesh.position.clone();
                    const currentRot = meshData.mesh.rotation.y;
                    
                    // Store nametag and other attachments
                    let nameSprite = meshData.nameSprite;
                    const pvpLabelSprite = meshData.pvpLabelSprite;
                    const bubble = meshData.bubble;
                    const goldRainSystem = meshData.goldRainSystem;
                    
                    // Remove old mesh from scene and free GPU buffers
                    disposeThreeObject(meshData.mesh);
                    scene.remove(meshData.mesh);
                    
                    // Build new mesh with updated appearance
                    const newMesh = buildPenguinMeshRef.current(playerData.appearance);
                    const isWagerBot = playerData.isBot || playerData.isPracticeBot || id === 'dev_bot_wager';
                    if (isWagerBot) {
                        newMesh.scale.set(1.12, 1.12, 1.12);
                    }
                    newMesh.position.copy(currentPos);
                    newMesh.rotation.y = currentRot;
                    scene.add(newMesh);
                    
                    // Reattach nametag (recreate if missing)
                    if (!nameSprite && createNameSpriteRef.current) {
                        nameSprite = createNameSpriteRef.current(playerData.name || 'Player', playerData);
                        if (nameSprite) {
                            meshData.nameSprite = nameSprite;
                        }
                    }
                    if (nameSprite) {
                        newMesh.add(nameSprite);
                    }

                    if (pvpLabelSprite) {
                        newMesh.add(pvpLabelSprite);
                    }
                    
                    // Reattach bubble if it exists
                    if (bubble) {
                        newMesh.add(bubble);
                    }
                    
                    // Apply mount visibility from server appearance
                    const rebuildMountVisible = playerData.appearance?.mountEnabled !== false;
                    const rebuildMountGroup = newMesh.getObjectByName('mount');
                    if (rebuildMountGroup) {
                        rebuildMountGroup.visible = rebuildMountVisible;
                    }
                    newMesh.userData.mountVisible = rebuildMountVisible;
                    
                    // Update mesh reference
                    meshData.mesh = newMesh;
                    
                    // Update animated cosmetics flag
                    const appearance = playerData.appearance || {};
                    meshData.hasAnimatedCosmetics = playerHasAnimatedCosmetics(appearance);
                    
                    // Clear the rebuild flag
                    playerData.needsMeshRebuild = false;
                    
                    // Clear animated parts cache so it gets rebuilt
                    if (newMesh.userData._animatedPartsCache) {
                        delete newMesh.userData._animatedPartsCache;
                    }

                    syncRemotePlayerHeldItem(meshData, playerData, buildPartMergedRef.current);
                }

                syncRemotePlayerHeldItem(meshData, playerData, buildPartMergedRef.current);
                
                // OPTIMIZATION: Calculate distance to local player for LOD
                const dx = (playerData.position?.x || 0) - localPosX;
                const dz = (playerData.position?.z || 0) - localPosZ;
                const distSq = dx * dx + dz * dz;
                
                // Use performance manager for distance-based update throttling
                const shouldUpdateThisPlayer = performanceManager.shouldUpdatePlayer(distSq);
                if (!shouldUpdateThisPlayer) continue; // Skip this player's update this frame
                
                // ==================== DISTANCE-BASED LOD ====================
                // Apply visual LOD based on distance (saves GPU/CPU)
                // LOD thresholds: 50 units = full, 100 = high, 200 = medium, beyond = low
                
                // Shadow LOD - only close players cast shadows (MAJOR performance save)
                const shouldCastShadow = performanceManager.shouldCastShadow(distSq);
                if (meshData.mesh.userData._lastShadowState !== shouldCastShadow) {
                    meshData.mesh.userData._lastShadowState = shouldCastShadow;
                    meshData.mesh.traverse((child) => {
                        if (child.isMesh) child.castShadow = shouldCastShadow;
                    });
                }
                
                // Puffle LOD - hide puffles for distant players
                if (meshData.puffleMesh) {
                    const shouldShowPuffle = performanceManager.shouldShowPuffle(distSq);
                    if (meshData.puffleMesh.visible !== shouldShowPuffle) {
                        meshData.puffleMesh.visible = shouldShowPuffle;
                    }
                }
                
                // Nametag LOD - hide nametags for very distant players
                if (meshData.nameSprite) {
                    const shouldShowNametag = performanceManager.shouldShowNametag(distSq);
                    if (meshData.nameSprite.visible !== shouldShowNametag) {
                        meshData.nameSprite.visible = shouldShowNametag;
                    }
                }
                
                // Check if player is seated - if so, handle position differently
                const isSeated = playerData.seatedOnFurniture || 
                                (meshData.currentEmote === 'Sit' && playerData.emote === 'Sit');
                
                // Position interpolation
                if (playerData.position) {
                    if (isSeated) {
                        // When seated, snap to the seat position immediately (no interpolation)
                        // This ensures the player appears on the bench for other clients
                        meshData.mesh.position.x = playerData.position.x;
                        meshData.mesh.position.z = playerData.position.z;
                        meshData.mesh.position.y = playerData.position.y ?? 0;
                    } else {
                        // Normal interpolation when walking
                        meshData.mesh.position.x = lerp(meshData.mesh.position.x, playerData.position.x, lerpFactor);
                        meshData.mesh.position.z = lerp(meshData.mesh.position.z, playerData.position.z, lerpFactor);
                        meshData.mesh.position.y = lerp(meshData.mesh.position.y, playerData.position.y ?? 0, yLerpFactor);
                    }
                }
                
                // Rotation interpolation
                if (playerData.rotation !== undefined) {
                    if (isSeated) {
                        meshData.mesh.rotation.y = playerData.rotation;
                    } else {
                        meshData.mesh.rotation.y = lerpRotation(meshData.mesh.rotation.y, playerData.rotation, lerpFactor);
                    }
                }
                
                // Handle puffle creation/removal dynamically
                if (playerData.needsPuffleUpdate) {
                    playerData.needsPuffleUpdate = false;
                    
                    // Remove old puffle mesh if exists
                    if (meshData.puffleMesh) {
                        disposeThreeObject(meshData.puffleMesh);
                        scene.remove(meshData.puffleMesh);
                        meshData.puffleMesh = null;
                        meshData.puffleInstance = null;
                    }
                    
                    // Create new puffle if player has one - include full data for accessories
                    if (playerData.puffle) {
                        console.log(`🐾 Creating puffle for ${playerData.name}: ${playerData.puffle.color}`, 
                            playerData.puffle.equippedAccessories ? `with accessories: ${Object.keys(playerData.puffle.equippedAccessories).join(', ')}` : '');
                        const puffleInstance = new Puffle({
                            color: playerData.puffle.color,
                            name: playerData.puffle.name,
                            // Include full puffle state for accessories, stats, etc.
                            equippedAccessories: playerData.puffle.equippedAccessories || {},
                            hunger: playerData.puffle.hunger,
                            happiness: playerData.puffle.happiness,
                            energy: playerData.puffle.energy
                        });
                        meshData.puffleInstance = puffleInstance;
                        meshData.puffleMesh = puffleInstance.createMesh(THREE);
                        const pufflePos = playerData.pufflePosition || {
                            x: (playerData.position?.x || 0) + 1.5,
                            z: (playerData.position?.z || 0) + 1.5
                        };
                        meshData.puffleMesh.position.set(pufflePos.x, 0.5, pufflePos.z);
                        scene.add(meshData.puffleMesh);
                    }
                }
                
                // Update puffle position (with fallback to player position offset)
                if (meshData.puffleMesh) {
                    const targetPufflePos = playerData.pufflePosition || {
                        x: (playerData.position?.x || 0) + 1.5,
                        z: (playerData.position?.z || 0) + 1.5
                    };
                    
                    // Store previous position for movement detection
                    const prevX = meshData.puffleMesh.position.x;
                    const prevZ = meshData.puffleMesh.position.z;
                    
                    // Smooth position update
                    meshData.puffleMesh.position.x = lerp(prevX, targetPufflePos.x, lerpFactor);
                    meshData.puffleMesh.position.z = lerp(prevZ, targetPufflePos.z, lerpFactor);
                    
                    // Detect if puffle is moving
                    const dx = meshData.puffleMesh.position.x - prevX;
                    const dz = meshData.puffleMesh.position.z - prevZ;
                    const isMoving = Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001;
                    
                    // Apply bouncing animation (always active, more bounce when moving)
                    const bounceSpeed = isMoving ? 8 : 3;
                    const bounceAmount = isMoving ? 0.15 : 0.05;
                    meshData.puffleMesh.position.y = 0.5 + Math.abs(Math.sin(time * bounceSpeed)) * bounceAmount;
                    
                    // Apply rotation to face direction of movement
                    if (isMoving) {
                        const targetRotation = Math.atan2(dx, dz);
                        // Smooth rotation
                        let currentRot = meshData.puffleMesh.rotation.y;
                        let diff = targetRotation - currentRot;
                        // Normalize angle difference
                        while (diff > Math.PI) diff -= Math.PI * 2;
                        while (diff < -Math.PI) diff += Math.PI * 2;
                        meshData.puffleMesh.rotation.y += diff * 0.15;
                    }
                    
                    // Apply squash/stretch based on movement
                    const squashAmount = isMoving ? 0.95 : 1;
                    const stretchAmount = isMoving ? 1.05 : 1;
                    meshData.puffleMesh.scale.set(
                        0.6 * squashAmount,
                        0.6 * stretchAmount * (1 + Math.sin(time * bounceSpeed) * 0.05),
                        0.6 * squashAmount
                    );
                    
                    // Handle puffle emotes for other players
                    if (playerData.puffleEmote && playerData.puffleEmoteTime) {
                        const emoteAge = Date.now() - playerData.puffleEmoteTime;
                        const emoteDuration = playerData.puffleEmoteDuration || 3000;
                        
                        if (emoteAge < emoteDuration) {
                            // Show emote bubble
                            if (!meshData.puffleEmoteBubble) {
                                meshData.puffleEmoteBubble = meshData.puffleInstance?.createEmoteBubble?.(THREE);
                                if (meshData.puffleEmoteBubble) {
                                    meshData.puffleEmoteBubble.position.y = 1.5;
                                    meshData.puffleMesh.add(meshData.puffleEmoteBubble);
                                }
                            }
                            
                            if (meshData.puffleEmoteBubble) {
                                meshData.puffleEmoteBubble.visible = true;
                                // Update emoji if changed
                                if (meshData.puffleEmoteBubble.userData.currentEmoji !== playerData.puffleEmote) {
                                    if (window._updatePuffleEmoteBubble) {
                                        window._updatePuffleEmoteBubble(meshData.puffleEmoteBubble, playerData.puffleEmote);
                                    }
                                    meshData.puffleEmoteBubble.userData.currentEmoji = playerData.puffleEmote;
                                }
                                // Animate bubble
                                const bobOffset = Math.sin(time * 3) * 0.05;
                                meshData.puffleEmoteBubble.position.y = 1.5 + bobOffset;
                            }
                        } else {
                            // Hide emote bubble after duration
                            if (meshData.puffleEmoteBubble) {
                                meshData.puffleEmoteBubble.visible = false;
                            }
                            playerData.puffleEmote = null;
                        }
                    } else if (meshData.puffleEmoteBubble) {
                        meshData.puffleEmoteBubble.visible = false;
                    }
                }
                
                // Handle emotes - sync with playerData
                if (playerData.emote !== meshData.currentEmote) {
                    meshData.currentEmote = playerData.emote;
                    meshData.emoteStartTime = playerData.emoteStartTime || Date.now();
                }
                
                // Auto-end emotes after 3.5 seconds (continuous emotes don't auto-clear)
                const continuousEmotes = ['Sit', 'Breakdance', 'DJ', '67', 'Headbang', 'Dance', 'Sleep', 'Cry', 'Flex'];
                if (meshData.currentEmote && !continuousEmotes.includes(meshData.currentEmote)) {
                    const emoteAge = (Date.now() - meshData.emoteStartTime) / 1000;
                    if (emoteAge > 3.5) {
                        meshData.currentEmote = null;
                        playerData.emote = null;
                    }
                }
                
                // Sync mount visibility from appearance updates
                const appearanceMountEnabled = playerData.appearance?.mountEnabled !== false;
                const currentMountVisible = meshData.mesh.userData?.mountVisible !== false;
                if (appearanceMountEnabled !== currentMountVisible) {
                    const mountGroup = meshData.mesh.getObjectByName('mount');
                    if (mountGroup) {
                        mountGroup.visible = appearanceMountEnabled;
                        meshData.mesh.userData.mountVisible = appearanceMountEnabled;
                    }
                }
                
                // OPTIMIZATION: Use performance manager for animation LOD
                const shouldAnimateThisFrame = performanceManager.shouldAnimatePlayer(distSq);
                
                // Calculate isMoving OUTSIDE the animation block so it's available for mount trails and wizard trails
                // If seated on furniture, never consider as "moving" (prevents walk animation overriding sit)
                const isMoving = !isSeated && playerData.position && (
                    Math.abs(playerData.position.x - meshData.mesh.position.x) > 0.1 ||
                    Math.abs(playerData.position.z - meshData.mesh.position.z) > 0.1
                );
                
                if (shouldAnimateThisFrame) {
                    // Animate other player mesh (walking/emotes)
                    // Consider mount only if it's visible
                    const otherPlayerMounted = !!(meshData.mesh.userData?.mount && meshData.mesh.userData?.mountData && meshData.mesh.userData?.mountVisible !== false);
                    const otherIsAirborne = (playerData.position?.y ?? 0) > 0.1;
                    const holdChoppers = forestTreeManagerRef.current?.getActiveHoldChoppers?.();
                    const isOtherHoldChopping = !!(
                        holdChoppers?.has(id) &&
                        !forestTreeManagerRef.current?.isRemoteManualChopping?.(id)
                    );
                    animateMesh(meshData.mesh, isMoving, meshData.currentEmote, meshData.emoteStartTime, playerData.seatedOnFurniture || false, playerData.appearance?.characterType || 'penguin', otherPlayerMounted, otherIsAirborne, time, null, isOtherHoldChopping);
                }

                // Animated skins/feathers run independently of walk-animation LOD
                if (meshData.hasAnimatedCosmetics && performanceManager.shouldAnimateCosmetics(distSq)) {
                    if (!meshData.mesh.userData._animatedPartsCache) {
                        meshData.mesh.userData._animatedPartsCache = cacheAnimatedParts(meshData.mesh);
                    }
                    animateCosmeticsFromCache(
                        meshData.mesh.userData._animatedPartsCache,
                        time,
                        delta,
                        VOXEL_SIZE
                    );
                }
                
                if (shouldAnimateThisFrame && meshData.mesh.userData?.mount && meshData.mesh.userData?.mountData?.animated) {
                    // Mount animation for other players (also throttled for distant players)
                    const mountGroup = getMountGroup(meshData.mesh);
                    const mountData = meshData.mesh.userData.mountData;
                    
                    if (mountGroup) {
                        // Pengu mount waddle animation
                        if (mountData.animationType === 'penguin_waddle') {
                            const leftFlipper = getMountPart(mountGroup, 'left_flipper');
                            const rightFlipper = getMountPart(mountGroup, 'right_flipper');
                            const leftFoot = getMountPart(mountGroup, 'left_foot');
                            const rightFoot = getMountPart(mountGroup, 'right_foot');
                            
                            if (isMoving) {
                                const waddleSpeed = 10;
                                const flapAmount = Math.sin(time * waddleSpeed) * 0.8;
                                
                                // Flippers flap up and down - opposite of each other
                                if (leftFlipper) leftFlipper.position.y = flapAmount;
                                if (rightFlipper) rightFlipper.position.y = -flapAmount;
                                
                                // Feet paddle up and down - opposite of flippers
                                if (leftFoot) leftFoot.position.y = -flapAmount * 0.6;
                                if (rightFoot) rightFoot.position.y = flapAmount * 0.6;
                                
                                // Waddle the whole mount side to side and bob up/down
                                mountGroup.rotation.z = Math.sin(time * waddleSpeed) * 0.06;
                                const restY = mountData.positionY || 0.65;
                                const mountBounce = Math.abs(Math.sin(time * waddleSpeed * 0.5)) * 0.08;
                                mountGroup.position.y = restY + mountBounce;
                                meshData.mesh.userData.mountBounceY = mountBounce;
                            } else {
                                // Return to rest position smoothly
                                if (leftFlipper) leftFlipper.position.y *= 0.85;
                                if (rightFlipper) rightFlipper.position.y *= 0.85;
                                if (leftFoot) leftFoot.position.y *= 0.85;
                                if (rightFoot) rightFoot.position.y *= 0.85;
                                mountGroup.rotation.z *= 0.9;
                                const restY = mountData.positionY || 0.65;
                                mountGroup.position.y = restY + (mountGroup.position.y - restY) * 0.9;
                                meshData.mesh.userData.mountBounceY = Math.max(0, mountGroup.position.y - restY);
                            }
                        }
                        // Skateboard grinding animation for other players 🛹
                        else if (mountData.animationType === 'skateboard_grind') {
                            const frontTruck = getMountPart(mountGroup, 'front_truck_pivot');
                            const backTruck = getMountPart(mountGroup, 'back_truck_pivot');
                            
                            if (isMoving) {
                                const grindSpeed = time * 15;
                                
                                // Simulate carving lean based on time
                                const autoLean = Math.sin(time * 2.5 + id.charCodeAt(0)) * 0.15; // Unique per player
                                mountGroup.rotation.z = autoLean;
                                
                                // Road vibration
                                const vibration = Math.sin(grindSpeed * 3) * 0.015;
                                mountGroup.position.y = (mountData.positionY || 0.8) + vibration;
                                
                                // Nose dip during carves
                                mountGroup.rotation.x = Math.sin(grindSpeed) * 0.05;
                                
                                // Truck turning (no wobble)
                                if (frontTruck && backTruck) {
                                    frontTruck.rotation.y = autoLean * 0.8;
                                    backTruck.rotation.y = autoLean * 0.4;
                                }
                                
                                // === GRINDING SPARKS for other players (LOD: only close players) ===
                                if (Math.abs(autoLean) > 0.05 && Math.random() < 0.25 && performanceManager.shouldShowParticlesForDistance(distSq)) {
                                    const sparkColors = mountData.sparkColors || ['#FFD700', '#FFA500', '#FF6600', '#FFFFFF'];
                                    const sparkColor = sparkColors[Math.floor(Math.random() * sparkColors.length)];
                                    
                                    // Use cached geometry + pooled material for performance
                                    const sparkGeo = window._cachedSparkGeo || new THREE.SphereGeometry(0.02, 4, 4);
                                    const sparkMat = acquireSparkMaterial(sparkColor);
                                    const spark = new THREE.Mesh(sparkGeo, sparkMat);
                                    
                                    const otherPos = meshData.mesh.position;
                                    spark.position.set(
                                        otherPos.x + (Math.random() - 0.5) * 0.3,
                                        0.1 + Math.random() * 0.1,
                                        otherPos.z + (Math.random() - 0.5) * 0.3
                                    );
                                    spark.userData.velocity = new THREE.Vector3(
                                        (Math.random() - 0.5) * 2,
                                        Math.random() * 1.5 + 0.5,
                                        (Math.random() - 0.5) * 2
                                    );
                                    spark.userData.life = 0.5 + Math.random() * 0.3;
                                    spark.userData.startTime = time;
                                    sceneRef.current.add(spark);
                                    
                                    if (!meshData.sparks) meshData.sparks = [];
                                    meshData.sparks.push(spark);
                                }
                                
                                // Update sparks for this other player
                                if (meshData.sparks) {
                                    meshData.sparks = meshData.sparks.filter(spark => {
                                        const age = time - spark.userData.startTime;
                                        if (age > spark.userData.life) {
                                            sceneRef.current.remove(spark);
                                            // Geometry is shared (window._cachedSparkGeo) — never dispose it here
                                            releaseSparkMaterial(spark.material);
                                            return false;
                                        }
                                        spark.position.x += spark.userData.velocity.x * delta;
                                        spark.position.y += spark.userData.velocity.y * delta;
                                        spark.position.z += spark.userData.velocity.z * delta;
                                        spark.userData.velocity.y -= 9.8 * delta;
                                        spark.material.opacity = 1 - (age / spark.userData.life);
                                        return true;
                                    });
                                }
                            } else {
                                // === IDLE - NO WOBBLE ===
                                mountGroup.rotation.z = (mountGroup.rotation.z || 0) * 0.9;
                                mountGroup.rotation.x *= 0.9;
                                mountGroup.position.y = mountData.positionY || 0.8;
                                
                                if (frontTruck) { frontTruck.rotation.y *= 0.85; }
                                if (backTruck) { backTruck.rotation.y *= 0.85; }
                            }
                        }
                        // UFO Disc hover animation for other players 🛸
                        else if (mountData.animationType === 'ufo_hover') {
                            const spinRing = getMountPart(mountGroup, 'spin_ring_pivot');
                            const abductionRay = getMountPart(mountGroup, 'abduction_ray');
                            const abductionRayInner = getMountPart(mountGroup, 'abduction_ray_inner');
                            const abductionLight = getMountPart(mountGroup, 'abduction_light');
                            
                            const hoverSpeed = mountData.hoverSpeed || 3;
                            const hoverIntensity = mountData.hoverIntensity || 0.12;
                            const ringSpinSpeed = mountData.ringSpinSpeed || 2;
                            const tiltAmount = mountData.tiltAmount || 0.35;
                            
                            // Ring always spins
                            if (spinRing) {
                                const spinMultiplier = isMoving ? 1.5 : 1;
                                spinRing.rotation.y += delta * ringSpinSpeed * spinMultiplier;
                            }
                            
                            // Abduction ray animation
                            if (abductionRay && abductionRay.material) {
                                abductionRay.material.opacity = 0.2 + Math.sin(time * 4) * 0.1;
                                abductionRay.rotation.y += delta * 0.5;
                            }
                            if (abductionRayInner && abductionRayInner.material) {
                                abductionRayInner.material.opacity = 0.3 + Math.sin(time * 4 + 0.5) * 0.15;
                                abductionRayInner.rotation.y -= delta * 0.3;
                            }
                            if (abductionLight) {
                                abductionLight.intensity = 0.4 + Math.sin(time * 4) * 0.2;
                            }
                            
                            if (isMoving) {
                                const hoverTime = time * hoverSpeed;
                                const hover = Math.sin(hoverTime) * hoverIntensity;
                                mountGroup.position.y = (mountData.positionY || 1.4) + hover + 0.05;
                                
                                // Simulate banking based on time
                                const autoBank = Math.sin(time * 2 + id.charCodeAt(0)) * tiltAmount * 0.6;
                                mountGroup.rotation.z = autoBank;
                                mountGroup.rotation.x = Math.sin(time * 1.5) * tiltAmount * 0.3;
                            } else {
                                const idleHover = Math.sin(time * 2) * 0.06;
                                mountGroup.position.y = (mountData.positionY || 1.4) + idleHover;
                                mountGroup.rotation.z *= 0.92;
                                mountGroup.rotation.x *= 0.92;
                            }
                        }
                        // Giant Puffle bounce animation for other players 🐾
                        else if (mountData.animationType === 'puffle_bounce') {
                            const tuftPivot = getMountPart(mountGroup, 'tuft_pivot');
                            const bounceIntensity = mountData.bounceIntensity || 0.25;
                            const bounceSpeed = mountData.bounceSpeed || 10;
                            const squishFactor = mountData.squishFactor || 0.12;
                            
                            if (isMoving) {
                                const bounceTime = time * bounceSpeed;
                                const bounce = Math.abs(Math.sin(bounceTime)) * bounceIntensity;
                                mountGroup.position.y = (mountData.positionY || 0.6) + bounce;
                                
                                const squishPhase = Math.sin(bounceTime);
                                const scaleY = (mountData.scale || 0.16) * (1 - Math.abs(squishPhase) * squishFactor);
                                const scaleXZ = (mountData.scale || 0.16) * (1 + Math.abs(squishPhase) * squishFactor * 0.5);
                                mountGroup.scale.set(scaleXZ, scaleY, scaleXZ);
                                
                                mountGroup.rotation.z = Math.sin(bounceTime * 0.7) * 0.08;
                                mountGroup.rotation.x = Math.sin(bounceTime * 0.9) * 0.05;
                                
                                if (tuftPivot) {
                                    tuftPivot.rotation.z = Math.sin(time * 15) * 0.3;
                                    tuftPivot.rotation.x = Math.cos(time * 12) * 0.2;
                                }
                            } else {
                                const idleBob = Math.sin(time * 2) * 0.03;
                                mountGroup.position.y = (mountData.positionY || 0.6) + idleBob;
                                const breathe = 1 + Math.sin(time * 1.5) * 0.02;
                                const baseScale = mountData.scale || 0.16;
                                mountGroup.scale.set(baseScale * breathe, baseScale * breathe, baseScale * breathe);
                                mountGroup.rotation.z *= 0.9;
                                mountGroup.rotation.x *= 0.9;
                                if (tuftPivot) {
                                    tuftPivot.rotation.z = Math.sin(time * 3) * 0.1;
                                }
                            }
                        }
                        // Rocket Jetpack thrust animation for other players 🚀
                        else if (mountData.animationType === 'jetpack_thrust') {
                            const fireTrail = getMountPart(mountGroup, 'fire_trail');
                            const leftLight = getMountPart(mountGroup, 'exhaust_light_left');
                            const rightLight = getMountPart(mountGroup, 'exhaust_light_right');
                            
                            const hoverSpeed = mountData.hoverSpeed || 5;
                            const hoverIntensity = mountData.hoverIntensity || 0.06;
                            const thrustWobble = mountData.thrustWobble || 0.04;
                            const VOXEL_SIZE = 0.125;
                            
                            // Fire particle animation
                            if (fireTrail && fireTrail.geometry) {
                                const positions = fireTrail.geometry.attributes.position.array;
                                const colors = fireTrail.geometry.attributes.color.array;
                                const particleCount = fireTrail.userData.particleCount || 30;
                                
                                for (let i = 0; i < particleCount; i++) {
                                    const idx = i * 3;
                                    const side = i % 2 === 0 ? -1 : 1;
                                    
                                    positions[idx + 1] -= delta * (isMoving ? 3 : 1.5);
                                    positions[idx] += (Math.random() - 0.5) * delta * 0.5;
                                    positions[idx + 2] += (Math.random() - 0.5) * delta * 0.3;
                                    
                                    if (positions[idx + 1] < -7 * VOXEL_SIZE - (isMoving ? 1.2 : 0.4)) {
                                        positions[idx] = side * 3 * VOXEL_SIZE + (Math.random() - 0.5) * 0.1;
                                        positions[idx + 1] = -7 * VOXEL_SIZE;
                                        positions[idx + 2] = (Math.random() - 0.5) * 0.1;
                                        
                                        const colorChoice = Math.random();
                                        if (colorChoice < 0.4) {
                                            colors[idx] = 1.0; colors[idx + 1] = 0.3; colors[idx + 2] = 0.0;
                                        } else if (colorChoice < 0.7) {
                                            colors[idx] = 1.0; colors[idx + 1] = 0.1; colors[idx + 2] = 0.0;
                                        } else {
                                            colors[idx] = 1.0; colors[idx + 1] = 0.8; colors[idx + 2] = 0.0;
                                        }
                                    }
                                    colors[idx + 1] *= 0.98;
                                }
                                
                                fireTrail.geometry.attributes.position.needsUpdate = true;
                                fireTrail.geometry.attributes.color.needsUpdate = true;
                                fireTrail.material.opacity = isMoving ? 0.95 : 0.5;
                            }
                            
                            const lightIntensity = isMoving ? 1.0 + Math.sin(time * 20) * 0.3 : 0.4 + Math.sin(time * 8) * 0.1;
                            if (leftLight) leftLight.intensity = lightIntensity;
                            if (rightLight) rightLight.intensity = lightIntensity;
                            
                            if (isMoving) {
                                const hoverTime = time * hoverSpeed;
                                const hover = Math.sin(hoverTime) * hoverIntensity + 0.1;
                                mountGroup.position.y = (mountData.positionY || 0.6) + hover;
                                
                                mountGroup.rotation.z = Math.sin(time * 25) * thrustWobble;
                                mountGroup.rotation.x = Math.sin(time * 20) * thrustWobble * 0.5;
                                
                                // Simulate tilt based on time
                                const autoTilt = Math.sin(time * 2 + id.charCodeAt(0)) * 0.15;
                                mountGroup.rotation.z += autoTilt;
                                
                                // Simulate FULL player body lean for multiplayer
                                // Find the meshInner which contains all body parts (cached — no per-frame traverse)
                                if (wrapper.userData._meshInnerCache === undefined) {
                                    wrapper.userData._meshInnerCache = wrapper.getObjectByName('meshInner') || null;
                                }
                                const jetpackMeshInner = wrapper.userData._meshInnerCache;
                                if (jetpackMeshInner) {
                                    // Full body lean into movement
                                    jetpackMeshInner.rotation.z = autoTilt * 2.0;  // Side-to-side lean
                                    jetpackMeshInner.rotation.x = 0.3 + Math.sin(time * 1.5) * 0.1; // Forward lean while moving
                                }
                            } else {
                                const idleHover = Math.sin(time * 2) * 0.03;
                                mountGroup.position.y = (mountData.positionY || 0.6) + idleHover;
                                mountGroup.rotation.z = Math.sin(time * 1.5) * 0.02;
                                mountGroup.rotation.x *= 0.95;
                            }
                        }
                        // Dragon flying animation for other players 🐉 (All types!)
                        else if (mountData.animationType === 'dragon_fly') {
                            const leftWing = getMountPart(mountGroup, 'left_wing_pivot');
                            const rightWing = getMountPart(mountGroup, 'right_wing_pivot');
                            const dragonBreath = getMountPart(mountGroup, 'dragon_breath');
                            const breathGlow = getMountPart(mountGroup, 'breath_glow');
                            
                            const flapSpeed = mountData.flapSpeed || 3;
                            const flapIntensity = mountData.flapIntensity || 0.7;
                            const bodyBobSpeed = mountData.bodyBobSpeed || 2;
                            const bodyBobIntensity = mountData.bodyBobIntensity || 0.12;
                            const breathInterval = mountData.breathInterval || 4;
                            const VOXEL_SIZE = 0.125;
                            
                            // Dragon state for breath timing
                            if (!mountGroup.userData.dragonState) {
                                mountGroup.userData.dragonState = {
                                    lastBreathTime: time - breathInterval + 2,
                                    isBreathing: false,
                                    breathStartTime: 0
                                };
                            }
                            const dragonState = mountGroup.userData.dragonState;
                            
                            // Random breath bursts
                            if (!dragonState.isBreathing && time - dragonState.lastBreathTime > breathInterval) {
                                if (Math.random() < 0.3 || isMoving) {
                                    dragonState.isBreathing = true;
                                    dragonState.breathStartTime = time;
                                    dragonState.lastBreathTime = time;
                                }
                            }
                            if (dragonState.isBreathing && time - dragonState.breathStartTime > 1.5) {
                                dragonState.isBreathing = false;
                            }
                            
                            // Majestic wing flapping
                            const baseFlap = isMoving ? flapSpeed * 1.8 : flapSpeed;
                            const flapAngle = Math.sin(time * baseFlap) * flapIntensity * (isMoving ? 1.3 : 0.8);
                            const secondaryFlap = Math.sin(time * baseFlap * 2) * 0.15;
                            
                            if (leftWing) {
                                leftWing.rotation.z = flapAngle + secondaryFlap;
                                leftWing.rotation.x = Math.sin(time * baseFlap + 0.5) * 0.2;
                                leftWing.rotation.y = Math.sin(time * baseFlap) * 0.1;
                            }
                            if (rightWing) {
                                rightWing.rotation.z = -flapAngle - secondaryFlap;
                                rightWing.rotation.x = Math.sin(time * baseFlap + 0.5) * 0.2;
                                rightWing.rotation.y = -Math.sin(time * baseFlap) * 0.1;
                            }
                            
                            // Dragon breath particles (all types)
                            if (dragonBreath && dragonBreath.geometry) {
                                const positions = dragonBreath.geometry.attributes.position.array;
                                const colors = dragonBreath.geometry.attributes.color.array;
                                const particleCount = dragonBreath.userData.particleCount || 50;
                                const breathType = dragonBreath.userData.breathType || 'ice';
                                const mouthZ = dragonBreath.userData.mouthZ || -16;
                                const mouthY = dragonBreath.userData.mouthY || 1.5;
                                
                                const breathSpeed = dragonState.isBreathing ? 6.0 : 1.0;
                                const spread = dragonState.isBreathing ? 2.5 : 0.4;
                                const maxDist = dragonState.isBreathing ? 5.0 : 1.0;
                                
                                for (let i = 0; i < particleCount; i++) {
                                    const idx = i * 3;
                                    positions[idx + 2] -= delta * breathSpeed;
                                    positions[idx] += (Math.random() - 0.5) * delta * spread;
                                    positions[idx + 1] += (Math.random() - 0.5) * delta * spread * 0.6;
                                    
                                    if (dragonState.isBreathing) {
                                        if (breathType === 'fire') positions[idx + 1] += delta * 0.2;
                                        else positions[idx + 1] -= delta * 0.3;
                                    }
                                    
                                    if (positions[idx + 2] < mouthZ * VOXEL_SIZE - maxDist) {
                                        positions[idx] = (Math.random() - 0.5) * 0.2;
                                        positions[idx + 1] = mouthY * VOXEL_SIZE + (Math.random() - 0.5) * 0.15;
                                        positions[idx + 2] = mouthZ * VOXEL_SIZE;
                                        
                                        const colorChoice = Math.random();
                                        if (breathType === 'ice') {
                                            if (colorChoice < 0.3) { colors[idx] = 1.0; colors[idx + 1] = 1.0; colors[idx + 2] = 1.0; }
                                            else if (colorChoice < 0.6) { colors[idx] = 0.7; colors[idx + 1] = 0.9; colors[idx + 2] = 1.0; }
                                            else { colors[idx] = 0.0; colors[idx + 1] = 0.95; colors[idx + 2] = 1.0; }
                                        } else if (breathType === 'fire') {
                                            if (colorChoice < 0.3) { colors[idx] = 1.0; colors[idx + 1] = 1.0; colors[idx + 2] = 0.0; }
                                            else if (colorChoice < 0.6) { colors[idx] = 1.0; colors[idx + 1] = 0.5; colors[idx + 2] = 0.0; }
                                            else { colors[idx] = 1.0; colors[idx + 1] = 0.2; colors[idx + 2] = 0.0; }
                                        } else {
                                            if (colorChoice < 0.3) { colors[idx] = 0.9; colors[idx + 1] = 0.3; colors[idx + 2] = 1.0; }
                                            else if (colorChoice < 0.6) { colors[idx] = 0.6; colors[idx + 1] = 0.2; colors[idx + 2] = 0.8; }
                                            else { colors[idx] = 0.2; colors[idx + 1] = 0.0; colors[idx + 2] = 0.3; }
                                        }
                                    }
                                }
                                dragonBreath.geometry.attributes.position.needsUpdate = true;
                                dragonBreath.geometry.attributes.color.needsUpdate = true;
                                dragonBreath.material.opacity = dragonState.isBreathing ? 0.95 : 0.3;
                                dragonBreath.material.size = dragonState.isBreathing ? 0.2 : 0.08;
                            }
                            
                            if (breathGlow) {
                                const baseGlow = dragonState.isBreathing ? 2.5 : 0.5;
                                const pulse = dragonState.isBreathing ? Math.sin(time * 12) * 0.8 : Math.sin(time * 2) * 0.15;
                                breathGlow.intensity = baseGlow + pulse;
                            }
                            
                            // Eye glows
                            const leftEyeGlow = getMountPart(mountGroup, 'left_eye_glow');
                            const rightEyeGlow = getMountPart(mountGroup, 'right_eye_glow');
                            if (leftEyeGlow && rightEyeGlow) {
                                const eyeBase = dragonState.isBreathing ? 0.8 : 0.4;
                                const eyePulse = Math.sin(time * 3) * 0.2;
                                leftEyeGlow.intensity = eyeBase + eyePulse;
                                rightEyeGlow.intensity = eyeBase + eyePulse;
                            }
                            
                            if (isMoving) {
                                const bobTime = time * bodyBobSpeed;
                                const bob = Math.sin(bobTime) * bodyBobIntensity;
                                const undulate = Math.sin(time * 1.2) * 0.03;
                                mountGroup.position.y = (mountData.positionY || 1.8) + bob + undulate + 0.15;
                                
                                // Epic banking
                                const autoBank = Math.sin(time * 2 + id.charCodeAt(0)) * 0.35;
                                mountGroup.rotation.z = autoBank;
                                mountGroup.rotation.x = 0.15;
                                mountGroup.rotation.y = (mountData.mountRotation || 0) + Math.sin(time * 1.5) * 0.03;
                            } else {
                                const idleBob = Math.sin(time * 1.2) * 0.06;
                                const breathe = Math.sin(time * 0.8) * 0.02;
                                mountGroup.position.y = (mountData.positionY || 1.8) + idleBob + breathe;
                                
                                // Idle swaying
                                mountGroup.rotation.z = Math.sin(time * 0.5) * 0.05;
                                mountGroup.rotation.y = (mountData.mountRotation || 0) + Math.sin(time * 0.3) * 0.08;
                                mountGroup.rotation.x = Math.sin(time * 0.7) * 0.03;
                            }
                        }
                        // Giant Rubber Duck bounce animation for other players 🦆
                        else if (mountData.animationType === 'duck_bounce') {
                            const bounceIntensity = mountData.bounceIntensity || 0.15;
                            const waddleSpeed = mountData.waddleSpeed || 8;
                            const waddleIntensity = mountData.waddleIntensity || 0.12;
                            
                            if (isMoving) {
                                const bounceTime = time * waddleSpeed;
                                const bounce = Math.abs(Math.sin(bounceTime)) * bounceIntensity;
                                mountGroup.position.y = (mountData.positionY || 0.5) + bounce;
                                mountGroup.rotation.z = Math.sin(bounceTime) * waddleIntensity;
                                mountGroup.rotation.x = Math.sin(bounceTime * 2) * 0.05;
                                const squish = 1 - Math.abs(Math.sin(bounceTime)) * 0.08;
                                mountGroup.scale.y = (mountData.scale || 0.2) * squish;
                            } else {
                                const idleBob = Math.sin(time * 2) * 0.02;
                                mountGroup.position.y = (mountData.positionY || 0.5) + idleBob;
                                mountGroup.rotation.z *= 0.92;
                                mountGroup.rotation.x *= 0.92;
                                const targetScale = mountData.scale || 0.2;
                                mountGroup.scale.y += (targetScale - mountGroup.scale.y) * 0.1;
                            }
                        }
                        // Shopping Cart wobble animation for other players 🛒
                        else if (mountData.animationType === 'cart_wobble') {
                            const wheelFL = getMountPart(mountGroup, 'wheel_fl_pivot');
                            const wheelFR = getMountPart(mountGroup, 'wheel_fr_pivot');
                            const wheelBL = getMountPart(mountGroup, 'wheel_bl_pivot');
                            const wheelBR = getMountPart(mountGroup, 'wheel_br_pivot');
                            
                            const wobbleIntensity = mountData.wobbleIntensity || 0.08;
                            const wheelSpinSpeed = mountData.wheelSpinSpeed || 25;
                            
                            if (isMoving) {
                                // Wheels spin
                                const spinAmount = delta * wheelSpinSpeed;
                                if (wheelFL) wheelFL.rotation.x += spinAmount;
                                if (wheelFR) wheelFR.rotation.x += spinAmount;
                                if (wheelBL) wheelBL.rotation.x += spinAmount;
                                if (wheelBR) wheelBR.rotation.x += spinAmount;
                                
                                // Cart wobble
                                const wobbleTime = time * 12;
                                mountGroup.rotation.z = Math.sin(wobbleTime) * wobbleIntensity;
                                mountGroup.rotation.x = Math.sin(wobbleTime * 1.3) * wobbleIntensity * 0.5;
                                const bounce = Math.abs(Math.sin(wobbleTime * 2)) * 0.03;
                                mountGroup.position.y = (mountData.positionY || 0.45) + bounce;
                            } else {
                                // Settle
                                mountGroup.rotation.z *= 0.9;
                                mountGroup.rotation.x *= 0.9;
                                mountGroup.position.y = mountData.positionY || 0.45;
                                if (wheelFL) wheelFL.rotation.x *= 0.95;
                                if (wheelFR) wheelFR.rotation.x *= 0.95;
                                if (wheelBL) wheelBL.rotation.x *= 0.95;
                                if (wheelBR) wheelBR.rotation.x *= 0.95;
                            }
                        }
                        // Boat rowing animation
                        else if (mountData.animationType === 'rowing' || mountData.leftOar) {
                            const leftOarPivot = getMountPart(mountGroup, 'left_oar_pivot');
                            const rightOarPivot = getMountPart(mountGroup, 'right_oar_pivot');
                            
                            if (leftOarPivot && rightOarPivot) {
                                if (isMoving) {
                                    const rowSpeed = 8;
                                    const rowAngle = Math.sin(time * rowSpeed) * 0.5;
                                    leftOarPivot.rotation.y = rowAngle;
                                    rightOarPivot.rotation.y = -rowAngle;
                                    leftOarPivot.rotation.z = Math.sin(time * rowSpeed + Math.PI/2) * 0.15;
                                    rightOarPivot.rotation.z = -Math.sin(time * rowSpeed + Math.PI/2) * 0.15;
                                } else {
                                    leftOarPivot.rotation.y *= 0.9;
                                    rightOarPivot.rotation.y *= 0.9;
                                    leftOarPivot.rotation.z *= 0.9;
                                    rightOarPivot.rotation.z *= 0.9;
                                }
                            }
                        }
                    }
                }
                
                // Mount trail for other players (icy trail from pengu mount, etc.)
                // Spawn locally based on other player's position - no server sync needed
                if (meshData.mesh.userData?.mount && meshData.mesh.userData?.mountVisible !== false && mountTrailSystemRef.current) {
                    const otherMountName = meshData.mesh.userData.mount;
                    const otherIsOnGround = (playerData.position?.y ?? 0) < 0.1;
                    
                    if (isMoving && otherIsOnGround && MountTrailSystem.mountHasTrail(otherMountName)) {
                        mountTrailSystemRef.current.updateFromMount(
                            id, // Use player ID as owner
                            meshData.mesh.position.x,
                            meshData.mesh.position.z,
                            otherMountName,
                            true // isMoving
                        );
                    }
                }
                
                // Update slot spectator bubble position for other players
                // Slot displays are now attached to machines, not players
                
                // Wizard hat trail for other players - use the same system as local player
                // Triggers for wizardHat equipped OR doginal character (who always has wizard hat)
                const otherAppearance = playerData.appearance || {};
                const otherHasWizardHat = otherAppearance.hat === 'wizardHat' || otherAppearance.characterType === 'doginal';
                if (otherHasWizardHat && wizardTrailSystemRef.current) {
                    const poolKey = `player_${id}`;
                    wizardTrailSystemRef.current.getOrCreatePool(poolKey);
                    wizardTrailSystemRef.current.update(poolKey, meshData.mesh.position, isMoving, time, delta);
                }
                
                // Green candle trail for other players (Gake character OR greenCandlesEnabled setting)
                const otherIsGake = otherAppearance.characterType === 'gake';
                const otherGreenCandlesEnabled = otherAppearance.greenCandlesEnabled === true;
                if ((otherIsGake || otherGreenCandlesEnabled) && gakeCandleTrailSystemRef.current) {
                    const poolKey = `player_${id}`;
                    gakeCandleTrailSystemRef.current.getOrCreatePool(poolKey);
                    gakeCandleTrailSystemRef.current.update(poolKey, meshData.mesh.position, isMoving, time, delta);
                }
                
                // Dynamic name tag scaling based on camera distance
                // Scale smaller when closer, max size when far (no scaling up beyond default)
                if (meshData.nameSprite && camera) {
                    const distToCamera = camera.position.distanceTo(meshData.mesh.position);
                    // Moderate scaling for readable effect
                    const minDist = 8;   // Distance where scale is minimum
                    const maxDist = 25;  // Distance where scale is maximum (default)
                    const minScale = 0.25; // Smaller when close (25%) - reduced from 15%
                    const maxScale = 1.0;
                    
                    const t = Math.min(1, Math.max(0, (distToCamera - minDist) / (maxDist - minDist)));
                    const scaleFactor = minScale + t * (maxScale - minScale);
                    
                    const baseScale = meshData.nameSprite.userData.baseScale || { x: 4, y: 1 };
                    meshData.nameSprite.scale.set(
                        baseScale.x * scaleFactor,
                        baseScale.y * scaleFactor,
                        1
                    );
                    
                    // Animated nametag floating + pulse (styled tiers)
                    const nameStyle = meshData.nameSprite.userData.nametagStyle;
                    if (isStyledNametag(nameStyle)) {
                        const phase = meshData.nameSprite.userData.animationPhase || 0;
                        const floatOffset = Math.sin(time * 1.5 + phase) * 0.1;
                        const characterType = meshData.mesh.userData?.characterType || 'penguin';
                        const baseHeight = characterType === 'marcus' ? NAME_HEIGHT_MARCUS : characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
                        meshData.nameSprite.position.y = baseHeight + floatOffset;
                        animateNametagSprite(meshData.nameSprite, time, true);
                    } else {
                        animateNametagSprite(meshData.nameSprite, time, false);
                    }
                }

                if (meshData.pvpLabelSprite && camera) {
                    const distToCamera = camera.position.distanceTo(meshData.mesh.position);
                    const minDist = 8;
                    const maxDist = 25;
                    const minScale = 0.25;
                    const maxScale = 1.0;
                    const t = Math.min(1, Math.max(0, (distToCamera - minDist) / (maxDist - minDist)));
                    const scaleFactor = minScale + t * (maxScale - minScale);
                    const baseScale = meshData.pvpLabelSprite.userData.baseScale || { x: 5, y: 1.1 };
                    meshData.pvpLabelSprite.scale.set(
                        baseScale.x * scaleFactor,
                        baseScale.y * scaleFactor,
                        1
                    );
                    const floatOffset = Math.sin(time * 2 + (meshData.pvpLabelSprite.userData.animationPhase || 0)) * 0.08;
                    const characterType = meshData.mesh.userData?.characterType || 'penguin';
                    const baseHeight = characterType === 'marcus' ? NAME_HEIGHT_MARCUS : characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
                    meshData.pvpLabelSprite.position.y = baseHeight + 1.4 + floatOffset;
                }
                
                // Update nametag particle system for other players
                if (meshData.goldRainSystem || getNametagParticleEffect(resolveNametagStyle(playerData))) {
                    syncMeshNametagParticles(
                        meshData,
                        playerData,
                        sceneRef.current,
                        window.THREE,
                        meshData.mesh.position,
                        camera,
                        time,
                        delta,
                        distSq
                    );
                }
                
                // Handle chat bubbles for other players
                if (playerData.chatMessage && playerData.chatTime) {
                    const bubbleAge = Date.now() - playerData.chatTime;
                    const isAfkBubble = playerData.isAfkBubble;
                    
                    // Show bubble if within time limit (5 seconds) or AFK bubble
                    if (bubbleAge < 5000 || isAfkBubble) {
                        // Create or update bubble
                        const needsNewBubble = !meshData.bubble || meshData.lastChatMessage !== playerData.chatMessage;
                        
                        if (needsNewBubble) {
                            // Remove old bubble first
                            if (meshData.bubble) {
                                meshData.mesh.remove(meshData.bubble);
                            }
                            const bubbleHeight = playerData.appearance?.characterType === 'marcus' ? BUBBLE_HEIGHT_MARCUS : playerData.appearance?.characterType === 'whiteWhale' ? BUBBLE_HEIGHT_WHALE : BUBBLE_HEIGHT_PENGUIN;
                            meshData.bubble = createChatSprite(THREE, playerData.chatMessage, bubbleHeight);
                            meshData.mesh.add(meshData.bubble);
                            meshData.lastChatMessage = playerData.chatMessage;
                        }
                    } else {
                        // Remove expired bubble
                        if (meshData.bubble) {
                            meshData.mesh.remove(meshData.bubble);
                            meshData.bubble = null;
                            meshData.lastChatMessage = null;
                        }
                        // Clear the chat data
                        playerData.chatMessage = null;
                        playerData.chatTime = null;
                    }
                } else if (meshData.bubble) {
                    // No chat message but bubble exists - remove it
                    meshData.mesh.remove(meshData.bubble);
                    meshData.bubble = null;
                    meshData.lastChatMessage = null;
                    playerData.isAfkBubble = false;
                }
            }
            
            // Dynamic name tag scaling for LOCAL player
            if (playerNameSpriteRef.current && playerRef.current && camera) {
                const distToCamera = camera.position.distanceTo(playerRef.current.position);
                const minDist = 8;
                const maxDist = 25;
                const minScale = 0.25; // Reduced from 15%
                const maxScale = 1.0;
                
                const t = Math.min(1, Math.max(0, (distToCamera - minDist) / (maxDist - minDist)));
                const scaleFactor = minScale + t * (maxScale - minScale);
                
                const baseScale = playerNameSpriteRef.current.userData.baseScale || { x: 4, y: 1 };
                playerNameSpriteRef.current.scale.set(
                    baseScale.x * scaleFactor,
                    baseScale.y * scaleFactor,
                    1
                );
                
                // Animated nametag floating + pulse for local player (styled tiers)
                const localNameStyle = playerNameSpriteRef.current.userData.nametagStyle;
                if (isStyledNametag(localNameStyle)) {
                    const phase = playerNameSpriteRef.current.userData.animationPhase || 0;
                    const floatOffset = Math.sin(time * 1.5 + phase) * 0.1;
                    const baseHeight = penguinDataRef.current?.characterType === 'marcus' ? NAME_HEIGHT_MARCUS : penguinDataRef.current?.characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
                    playerNameSpriteRef.current.position.y = baseHeight + floatOffset;
                    animateNametagSprite(playerNameSpriteRef.current, time, true);
                } else {
                    animateNametagSprite(playerNameSpriteRef.current, time, false);
                }
                
            }
            
            // Update world-space nametag particles for local player
            if (playerRef.current && playerGoldRainRef) {
                const localPlayerData = {
                    appearance: { nametagStyle: (() => {
                        try {
                            const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
                            return isAuthenticated ? (settings.nametagStyle || 'tier') : 'default';
                        } catch { return 'default'; }
                    })() },
                    cpNametagTier: userDataRef.current?.cpNametagTier,
                    day1NametagUnlocked: userDataRef.current?.day1NametagUnlocked,
                    isAuthenticated,
                    walletAddress: walletAddress || userDataRef.current?.walletAddress,
                };
                const effect = getNametagParticleEffect(resolveNametagStyle(localPlayerData));
                const effectKey = effect ? `${effect.preset}:${effect.color}` : null;
                const localDistSq = camera
                    ? (camera.position.x - posRef.current.x) ** 2 + (camera.position.z - posRef.current.z) ** 2
                    : 0;
                const enabled = performanceManager.shouldShowNametagParticles(localDistSq);

                if (!enabled || !effect) {
                    if (playerGoldRainRef.current) playerGoldRainRef.current.setVisible(false);
                } else {
                    if (!playerGoldRainRef.current || playerGoldRainEffectKeyRef.current !== effectKey) {
                        if (playerGoldRainRef.current) {
                            playerGoldRainRef.current.dispose();
                            playerGoldRainRef.current = null;
                        }
                        if (sceneRef.current && window.THREE) {
                            const system = new LocalizedParticleSystem(window.THREE, sceneRef.current, effect.preset, { color: effect.color });
                            system.create({ x: posRef.current.x, y: posRef.current.y, z: posRef.current.z });
                            playerGoldRainRef.current = system;
                            playerGoldRainEffectKeyRef.current = effectKey;
                        }
                    }
                    if (playerGoldRainRef.current) {
                        playerGoldRainRef.current.setVisible(true);
                        playerGoldRainRef.current.update(
                            time,
                            delta,
                            posRef.current,
                            camera?.position
                        );
                    }
                }
            }

            // PARKOUR PERFORMANCE MODE: Skip heavy animations when player is high up (parkour course 4+)
            // This significantly improves FPS during parkour challenges
            // Note: Particles (snow, gold rain) are NOT affected - only prop animations
            const PARKOUR_PERFORMANCE_Y_THRESHOLD = 30; // Stage 4 starts around Y=33
            const inParkourPerformanceMode = roomRef.current === 'town' && posRef.current.y >= PARKOUR_PERFORMANCE_Y_THRESHOLD;
            
            // Animate campfire (flames, embers, light flicker) and Christmas tree
            // Skip when in parkour performance mode
            if (townCenterRef.current && roomRef.current === 'town' && !inParkourPerformanceMode) {
                const worldTime = serverWorldTimeRef?.current ?? 0.35;
                const nightFactor = calculateNightFactor(worldTime);
                const playerPos = posRef.current;
                const t0 = showPerfDebugRef.current ? performance.now() : 0;
                townCenterRef.current.update(time, delta, nightFactor, playerPos);
                if (showPerfDebugRef.current) {
                    perfStatsRef.current.timings.townUpdate = performance.now() - t0;
                }
                townBuildingBannersRef.current.forEach((sprite) => animateBuildingBanner(sprite, time));
            }
            if (snowFortsZoneRef.current && roomRef.current === 'snow_forts' && !inParkourPerformanceMode) {
                const t1 = showPerfDebugRef.current ? performance.now() : 0;
                snowFortsZoneRef.current.update(time, delta, posRef.current.x, posRef.current.z);
                if (showPerfDebugRef.current) {
                    perfStatsRef.current.timings.snowFortsUpdate = performance.now() - t1;
                }
            }
            if (forestTrailsZoneRef.current && roomRef.current === 'forest_trails' && !inParkourPerformanceMode) {
                const worldTime = serverWorldTimeRef?.current ?? 0.35;
                const nightFactor = calculateNightFactor(worldTime);
                const t2 = showPerfDebugRef.current ? performance.now() : 0;
                forestTrailsZoneRef.current.update(time, delta, nightFactor, posRef.current);
                forestTreeManagerRef.current?.updateManualTrees(
                    delta,
                    manualChopActiveRef.current ? manualChopControllerRef.current?.treeEntry?.def?.id : null
                );
                if (showPerfDebugRef.current) {
                    perfStatsRef.current.timings.forestUpdate = performance.now() - t2;
                }
            }

            if (frameCount % 3 === 0 && !inParkourPerformanceMode) {
                updateProximityAmbient(roomRef.current, posRef.current.x, posRef.current.z);
            }
            if (roomRef.current === 'snow_forts' && starterRodPickupRef.current) {
                starterRodPickupRef.current.update(time);
            }
            
            // Animate nightclub interior (dance floor, stage lights, speakers, disco ball)
            if (nightclubRef.current && roomRef.current === 'nightclub') {
                nightclubRef.current.update(time, delta, 0.7);
                setMusicEnergy(nightclubRef.current.getMusicEnergy(time));
            }
            
            // Animate casino room interior (slot machines, roulette wheels, etc.)
            if (casinoRoomRef.current && roomRef.current === 'casino_game_room') {
                casinoRoomRef.current.update(time, delta, 0.7);
            }
            
            // Animate SKNY GANG igloo interior (disco ball, lasers, LED floor, etc.)
            if (sknyIglooInteriorRef.current?.update && roomRef.current === 'igloo3') {
                sknyIglooInteriorRef.current.update(time);
            }
            
            // Animate building door glows (pulse for interactive doors, town only)
            // Skip door glow animations when in parkour performance mode or forest zone
            if ((roomRef.current === 'town' || roomRef.current === 'snow_forts') && !inParkourPerformanceMode && frameCount % 2 === 0) {
                if (roomRef.current === 'town') {
                    portalsRef.current.forEach(building => {
                        if (building.mesh && building.gameId) {
                            if (building._doorGlow === undefined) {
                                building._doorGlow = building.mesh.getObjectByName(`door_glow_${building.id}`) || null;
                            }
                            const glow = building._doorGlow;
                            if (glow && glow.material) {
                                glow.material.opacity = 0.2 + Math.sin(time * 2) * 0.15;
                            }
                        }
                    });
                }

                if (roomRef.current === 'snow_forts' && controls && camera) {
                    const wasInCasino = wasInCasinoRef.current;
                    const isInCasino = snowFortsZoneRef.current?.isPlayerInCasino(posRef.current.x, posRef.current.z);
                    if (isInCasino !== wasInCasino) {
                        wasInCasinoRef.current = isInCasino;
                        casinoZoomTransitionRef.current = {
                            active: true,
                            targetDistance: isInCasino ? 10 : TRAVEL_LOBBY_CAMERA.defaultTargetDistance,
                            progress: 0
                        };
                    }
                }
            }

            if (controls && camera && !manualChopActiveRef.current) {
                const transition = casinoZoomTransitionRef.current;
                if (transition?.active) {
                    const offset = _casinoZoomOffset.copy(camera.position).sub(controls.target);
                    const currentDistance = offset.length();
                    const targetDistance = transition.targetDistance;
                    if (Math.abs(currentDistance - targetDistance) > 0.2) {
                        const newDistance = currentDistance + (targetDistance - currentDistance) * 0.1;
                        const direction = offset.normalize();
                        camera.position.copy(controls.target).add(direction.multiplyScalar(newDistance));
                    } else {
                        transition.active = false;
                    }
                }
            }

            if (manualChopActiveRef.current && manualChopControllerRef.current) {
                manualChopControllerRef.current.update(delta);
            }
            
            // Room-specific updates (self-contained in room modules)
            if (roomDataRef.current?.update) {
                roomDataRef.current.update(time, delta);
            }
            
            // Match banners are updated in a separate useEffect that responds to prop changes
            // (not in the game loop, since activeMatches/spectatingMatch are props that change)

            // ==================== SMOOTH CAMERA UPDATE ====================
            // Calculate mount Y offset for elevated mounts (UFO, jetpack, etc)
            let mountYOffset = 0;
            if (mountEnabledRef.current && playerRef.current?.userData?.mountData) {
                const mountData = playerRef.current.userData.mountData;
                // Use positionY as the base elevation, plus any bounce offset
                const mountBaseY = mountData.positionY || 0;
                const bounceY = playerRef.current.userData.mountBounceY || 0;
                mountYOffset = mountBaseY + bounceY;
            }
            
            // Update camera controller with player state (manual chop owns the camera)
            if (cameraControllerRef.current && !manualChopActiveRef.current) {
                cameraControllerRef.current.setPlayerState(
                    posRef.current,
                    rotRef.current,
                    moving, // True when player is actively moving
                    mountYOffset // Pass mount elevation to camera
                );
                cameraControllerRef.current.update(delta);
            } else if (!cameraControllerRef.current) {
                // Fallback: simple camera follow if controller not initialized
                const offset = tempOffsetRef.current.copy(camera.position).sub(controls.target);
                const playerY = posRef.current.y + 1.2 + mountYOffset;
                const targetPos = tempVec3Ref.current.set(posRef.current.x, playerY, posRef.current.z);
                camera.position.copy(targetPos).add(offset);
                controls.target.copy(targetPos);
                controls.update();
            }
            
            // ==================== DAY/NIGHT CYCLE (Town only, Server-synchronized) ====================
            // OPTIMIZED: Only update lighting every 3rd frame (still smooth at 60fps = 20 updates/sec)
            if (room === 'town' && sunLightRef.current && ambientLightRef.current && frameCount % 3 === 0) {
                const serverTime = serverWorldTimeRef?.current ?? 0.35;
                const t = daySpeedRef.current === 0 ? dayTimeRef.current : serverTime;
                
                updateDayNightCycle({
                    t,
                    sunLight: sunLightRef.current,
                    ambientLight: ambientLightRef.current,
                    scene,
                    propLights: propLightsRef.current,
                    lightsOnRef
                });
                
                // Update state for UI (throttled) — avoid React re-renders unless debug panel is open
                if (showPerfDebugRef.current && frameCount % 30 === 0) {
                    setDayTime(daySpeedRef.current === 0 ? dayTimeRef.current : serverTime);
                }
            }

            // Tighten shadow frustum around player — huge ±100 shadow maps tank town FPS
            if (room === 'town' && sunLightRef.current && frameCount % 2 === 0) {
                const shadowCam = sunLightRef.current.shadow.camera;
                const half = 45;
                const px = posRef.current.x;
                const pz = posRef.current.z;
                shadowCam.left = px - half;
                shadowCam.right = px + half;
                shadowCam.top = pz + half;
                shadowCam.bottom = pz - half;
                shadowCam.updateProjectionMatrix();
                sunLightRef.current.target.position.set(px, 0, pz);
                sunLightRef.current.target.updateMatrixWorld();
            }
            
            // ==================== SNOWFALL UPDATE ====================
            if ((room === 'town' || room === 'snow_forts') && snowfallSystemRef.current && gameSettingsRef.current.snowEnabled !== false) {
                const serverTime = serverWorldTimeRef?.current ?? 0.35;
                if (frameCount % 2 === 0) {
                    snowfallSystemRef.current.update(time, delta, posRef.current, serverTime);
                }
                snowfallSystemRef.current.setVisible(true);
            } else if (snowfallSystemRef.current) {
                snowfallSystemRef.current.setVisible(false);
            }
            
            // ==================== SNOWBALL PHYSICS UPDATE ====================
            // Entire block is skipped when no snowballs/splats are active (the common case).
            if (snowballsRef.current.length > 0) {
            const snowballNow = Date.now();
            const snowballsToRemove = [];

            // Refresh the cached collidable mesh list at most every 60 frames while snowballs fly.
            // Mesh membership rarely changes mid-flight; world matrices stay live on the cached refs.
            if (frameCount - _snowballCollidablesFrame >= 60) {
                _snowballCollidables.length = 0;
                _snowballSurfaces.length = 0;
                collectSnowballCollidables(scene, null, _snowballCollidables);
                collectSnowballSurfaces(scene, _snowballSurfaces);
                _snowballCollidablesFrame = frameCount;
            }

            const roomColliders = roomDataRef.current?.colliders;

            for (let i = 0; i < snowballsRef.current.length; i++) {
                const sb = snowballsRef.current[i];
                
                // Check if snowball should be removed (lifetime exceeded)
                if (snowballNow - sb.startTime > SNOWBALL_LIFETIME_MS) {
                    snowballsToRemove.push(i);
                    releaseSnowballMesh(sb.mesh);
                    continue;
                }
                
                // Store previous position for collision detection
                _snowballPrevPos.copy(sb.mesh.position);
                
                // Apply gravity to velocity
                sb.velocity.y += SNOWBALL_GRAVITY * delta;
                
                // Update position
                sb.mesh.position.x += sb.velocity.x * delta;
                sb.mesh.position.y += sb.velocity.y * delta;
                sb.mesh.position.z += sb.velocity.z * delta;
                
                // Rotation for visual effect
                sb.mesh.rotation.x += delta * 5;
                sb.mesh.rotation.z += delta * 3;
                
                // Skip collision check if already splatted
                if (sb.hasSplatted) continue;
                
                // ========== COLLISION DETECTION ==========
                // Skip collision detection during initial "safe period" to avoid hitting thrower
                const SNOWBALL_SAFE_PERIOD_MS = 150; // 150ms grace period after throw
                const snowballAge = snowballNow - sb.startTime;
                if (snowballAge < SNOWBALL_SAFE_PERIOD_MS) continue;
                
                // Check for collision with surfaces (paths, props, players, walls)
                let hitSomething = false;
                let hitPoint = null;
                let hitNormal = null;

                _snowballVelDir.set(sb.velocity.x, sb.velocity.y, sb.velocity.z);
                const speed = _snowballVelDir.length();
                if (speed > 0.1) {
                    _snowballVelDir.multiplyScalar(1 / speed);
                    _snowballRaycaster.set(_snowballPrevPos, _snowballVelDir);
                    _snowballRaycaster.far = speed * delta + 0.5;

                    const throwerId = sb.throwerId;
                    const throwerKey = (!throwerId || throwerId === playerId) ? '__local' : throwerId;
                    _snowballRaycastTargets.length = 0;
                    for (let m = 0; m < _snowballSurfaces.length; m++) {
                        _snowballRaycastTargets.push(_snowballSurfaces[m]);
                    }
                    for (let m = 0; m < _snowballCollidables.length; m++) {
                        const mesh = _snowballCollidables[m];
                        if (mesh === sb.mesh) continue;
                        const owner = mesh.userData._snowballOwner;
                        if (owner === throwerKey || (owner === throwerId && throwerKey === '__local')) continue;
                        _snowballRaycastTargets.push(mesh);
                    }

                    if (_snowballRaycastTargets.length > 0) {
                        const intersects = _snowballRaycaster.intersectObjects(_snowballRaycastTargets, true);
                        if (intersects.length > 0) {
                            hitSomething = true;
                            hitPoint = intersects[0].point;
                            if (intersects[0].face?.normal) {
                                hitNormal = _snowballHitNormal.copy(intersects[0].face.normal);
                                if (intersects[0].object.matrixWorld) {
                                    hitNormal.transformDirection(intersects[0].object.matrixWorld);
                                }
                            } else {
                                hitNormal = _snowballHitNormal.set(0, 1, 0);
                            }
                        }
                    }
                }

                if (!hitSomething) {
                    const colliderHit = computeRoomColliderHit(sb.mesh.position, _snowballPrevPos, roomColliders)
                        || querySnowballWorldCollision(
                            sb.mesh.position.x, sb.mesh.position.y, sb.mesh.position.z,
                            _snowballPrevPos.x, _snowballPrevPos.y, _snowballPrevPos.z
                        );
                    if (colliderHit) {
                        hitSomething = true;
                        hitPoint = _snowballHitPoint.set(sb.mesh.position.x, colliderHit.y, sb.mesh.position.z);
                        hitNormal = colliderHit.normal
                            ? _snowballHitNormal.copy(colliderHit.normal)
                            : _snowballHitNormal.set(0, 1, 0);
                    }
                }

                // Ground fallback (open ice — paths should raycast above this)
                if (!hitSomething && sb.mesh.position.y <= 0.15) {
                    hitSomething = true;
                    hitPoint = _snowballHitPoint.copy(sb.mesh.position);
                    hitPoint.y = 0;
                    hitNormal = _snowballHitNormal.set(0, 1, 0);
                }

                if (!hitSomething && sb.mesh.position.y < -1) {
                    hitSomething = true;
                    hitPoint = _snowballHitPoint.copy(sb.mesh.position);
                    hitPoint.y = 0;
                    hitNormal = _snowballHitNormal.set(0, 1, 0);
                }
                
                // ========== CREATE SPLAT ==========
                if (hitSomething && !sb.hasSplatted) {
                    sb.hasSplatted = true;
                    playSfx('snowball_hit');
                    
                    const splat = acquireSplatMesh();

                    splat.position.copy(hitPoint);
                    splat.position.addScaledVector(hitNormal, 0.03);
                    orientSplatToSurface(splat, hitNormal);
                    
                    splat.userData.startTime = snowballNow;
                    splat.userData.isSplat = true;
                    scene.add(splat);
                    splatsRef.current.push(splat);
                    
                    // Remove snowball
                    snowballsToRemove.push(i);
                    releaseSnowballMesh(sb.mesh);
                } else if (sb.mesh.position.y < -10) {
                    // Ultimate failsafe: remove snowballs that fell way too deep
                    snowballsToRemove.push(i);
                    releaseSnowballMesh(sb.mesh);
                }
            }
            // Remove finished snowballs (reverse order to preserve indices)
            for (let i = snowballsToRemove.length - 1; i >= 0; i--) {
                snowballsRef.current.splice(snowballsToRemove[i], 1);
            }
            } // end snowball physics block
            
            // Fade out and remove splat effects (tracked list — no scene.children scan)
            if (splatsRef.current.length > 0) {
                const SPLAT_DURATION = 800; // 0.8 seconds
                const splatNow = Date.now();
                for (let i = splatsRef.current.length - 1; i >= 0; i--) {
                    const splat = splatsRef.current[i];
                    const age = splatNow - splat.userData.startTime;
                    if (age > SPLAT_DURATION) {
                        releaseSplatMesh(splat);
                        splatsRef.current.splice(i, 1);
                    } else {
                        // Fade out and grow
                        splat.material.opacity = 0.8 * (1 - age / SPLAT_DURATION);
                        const scale = 1 + (age / SPLAT_DURATION) * 0.5;
                        splat.scale.set(scale, scale, 1);
                    }
                }
            }
            
            // Performance tracking for render
            if (worldDropManagerRef.current) {
                worldDropManagerRef.current.update(delta, time);
            }
            const renderStart = showPerfDebugRef.current ? performance.now() : 0;
            renderer.render(scene, camera);
            
            if (frameCount >= MIN_FRAMES_BEFORE_WORLD_READY && !worldReadyFiredRef.current && onWorldReadyRef.current) {
                worldReadyFiredRef.current = true;
                performanceManager.markGameplayReady();
                try {
                    onWorldReadyRef.current();
                } catch (e) {
                    console.warn('onWorldReady:', e);
                }
            }
            
            // Collect performance stats (throttled to every 30 frames)
            if (showPerfDebugRef.current && frameCount % 30 === 0) {
                const renderTime = performance.now() - renderStart;
                const info = renderer.info;
                
                // Count visible vs culled meshes
                let visibleCount = 0;
                let culledCount = 0;
                scene.traverse(obj => {
                    if (obj.isMesh) {
                        if (obj.visible) visibleCount++;
                        else culledCount++;
                    }
                });
                
                // Find hot assets - Count meshes under each TOP-LEVEL scene child
                // This shows what's actually contributing draw calls
                const hotAssets = [];
                
                scene.children.forEach(topLevel => {
                    let meshCount = 0;
                    let triCount = 0;
                    
                    // Count all visible meshes under this top-level object
                    if (topLevel.isMesh && topLevel.visible) {
                        meshCount = 1;
                        const tris = topLevel.geometry?.index 
                            ? topLevel.geometry.index.count / 3 
                            : (topLevel.geometry?.attributes?.position?.count || 0) / 3;
                        triCount = Math.round(tris);
                    } else {
                        topLevel.traverse(obj => {
                            if (obj.isMesh && obj.visible) {
                                meshCount++;
                                const tris = obj.geometry?.index 
                                    ? obj.geometry.index.count / 3 
                                    : (obj.geometry?.attributes?.position?.count || 0) / 3;
                                triCount += Math.round(tris);
                            }
                        });
                    }
                    
                    if (meshCount > 0) {
                        const name = topLevel.name || topLevel.type || 'unnamed';
                        hotAssets.push({ name, draws: meshCount, tris: triCount });
                    }
                });
                
                // Sort by draw calls (mesh count)
                hotAssets.sort((a, b) => b.draws - a.draws);
                
                perfStatsRef.current = {
                    ...perfStatsRef.current,
                    fps: Math.round(1 / delta),
                    frameTime: (delta * 1000).toFixed(1),
                    drawCalls: info.render.calls,
                    triangles: info.render.triangles,
                    visibleMeshes: visibleCount,
                    culledMeshes: culledCount,
                    timings: {
                        ...perfStatsRef.current.timings,
                        render: renderTime.toFixed(1)
                    },
                    hotAssets: hotAssets.slice(0, 15),
                    lastUpdate: Date.now()
                };
                setPerfStats({ ...perfStatsRef.current });
            }
        };

        // Ultra/High: skip full-scene warmup — it only runs on refresh and costs more than live preset tuning.
        const skipSceneWarmup = performanceManager.shouldSkipSceneWarmup();
        if (skipSceneWarmup) {
            console.log('⚡ Skipping scene warmup (matches live preset upgrade path)');
        } else {
            await loadYield(0.85);
            try {
                if (typeof renderer.compileAsync === 'function') {
                    await renderer.compileAsync(scene, camera);
                    if (initCancelled) return;
                } else if (typeof renderer.compile === 'function') {
                    renderer.compile(scene, camera);
                }
            } catch (e) {
                console.warn('Shader pre-compile:', e);
            }
            try {
                const rc = raycasterRef.current;
                if (rc && camera) {
                    rc.setFromCamera(new THREE.Vector2(0, 0), camera);
                    rc.intersectObjects(scene.children, true);
                }
            } catch (e) {
                console.warn('Raycast warmup:', e);
            }

            await loadYield(0.92);
            if (initCancelled) return;
            try {
                if (typeof renderer.initTexture === 'function') {
                    const seenTextures = new Set();
                    const textures = [];
                    const TEXTURE_SLOTS = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap'];
                    scene.traverse(obj => {
                        const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
                        for (const m of mats) {
                            for (const slot of TEXTURE_SLOTS) {
                                const tex = m[slot];
                                if (tex && !seenTextures.has(tex)) {
                                    seenTextures.add(tex);
                                    textures.push(tex);
                                }
                            }
                        }
                    });
                    const BATCH = 16;
                    for (let i = 0; i < textures.length; i += BATCH) {
                        const end = Math.min(i + BATCH, textures.length);
                        for (let j = i; j < end; j++) {
                            renderer.initTexture(textures[j]);
                        }
                        if (end < textures.length) {
                            await loadYield(0.92 + 0.07 * (end / textures.length));
                            if (initCancelled) return;
                        }
                    }
                    console.log(`🖼️ Pre-uploaded ${textures.length} textures to GPU`);
                }
            } catch (e) {
                console.warn('Texture pre-upload:', e);
            }
        }

        performanceManager.applyRendererTuning(renderer, THREE, sunLight, isMobile);

        // If a prior session already flagged this environment as low-end, apply the
        // cheap render path now (before first frame) so it never has to suffer again.
        if (performanceManager.isLowEndMode()) {
            applyLowEndMode({ renderer, scene, THREE });
        }

        reportLoadProgress(1);
        update();
        
        } // end initWorld()
        
        return () => {
            initCancelled = true;
            updateLoopGenerationRef.current += 1;
            meshSyncMissRef.current.clear();
            cancelAnimationFrame(deferTimer);
            if (deferTimeout) clearTimeout(deferTimeout);
            cancelAnimationFrame(reqRef.current);
            if (handleDown) window.removeEventListener('keydown', handleDown);
            if (handleUp) window.removeEventListener('keyup', handleUp);
            if (handleResize) {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('orientationchange', handleResize);
            }
            if(rendererRef.current && mountRef.current) {
                mountRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
            // Cleanup TownCenter
            if (worldNpcManagerRef.current) {
                worldNpcManagerRef.current.detach();
            }
            if (travelNpcManagerRef.current) {
                travelNpcManagerRef.current.detach();
            }
            if (travelLobbyRef.current) {
                travelLobbyRef.current.cleanup?.();
                travelLobbyRef.current = null;
            }
            if (townCenterRef.current) {
                townCenterRef.current.dispose();
                townCenterRef.current = null;
            }
            // Cleanup Snow Forts Zone
            if (snowFortsZoneRef.current) {
                snowFortsZoneRef.current.cleanup();
                snowFortsZoneRef.current = null;
            }
            // Cleanup Forest Trails Zone (was leaking ~200 trees' GPU buffers per room switch)
            if (forestTrailsZoneRef.current) {
                forestTrailsZoneRef.current.cleanup();
                forestTrailsZoneRef.current = null;
            }
            if (forestTreeManagerRef.current) {
                forestTreeManagerRef.current.cleanup();
                forestTreeManagerRef.current = null;
            }
            if (mushroomClusterManagerRef.current) {
                mushroomClusterManagerRef.current.cleanup();
                mushroomClusterManagerRef.current = null;
            }
            if (worldDropManagerRef.current) {
                worldDropManagerRef.current.cleanup();
            }
            // Cleanup Mountain Background
            if (mountainBackgroundRef.current) {
                mountainBackgroundRef.current.dispose();
                mountainBackgroundRef.current = null;
            }
            // Cleanup Nightclub
            if (nightclubRef.current) {
                nightclubRef.current.dispose();
                nightclubRef.current = null;
            }
            // Cleanup CasinoRoom
            if (casinoRoomRef.current) {
                casinoRoomRef.current.cleanup();
                casinoRoomRef.current = null;
            }
            // Cleanup match banners
            for (const [, bannerData] of matchBannersRef.current) {
                bannerData.sprite.material.map?.dispose();
                bannerData.sprite.material.dispose();
            }
            matchBannersRef.current.clear();
            // Cleanup Snowfall system
            if (snowfallSystemRef.current) {
                snowfallSystemRef.current.dispose();
                snowfallSystemRef.current = null;
            }
            // Cleanup Wizard trail system
            if (wizardTrailSystemRef.current) {
                wizardTrailSystemRef.current.dispose();
                wizardTrailSystemRef.current = null;
            }
            // Cleanup Gake candle trail system
            if (gakeCandleTrailSystemRef.current) {
                gakeCandleTrailSystemRef.current.dispose();
                gakeCandleTrailSystemRef.current = null;
            }
            // Cleanup Mount trail system
            if (mountTrailSystemRef.current) {
                mountTrailSystemRef.current.dispose();
                mountTrailSystemRef.current = null;
            }
            // Cleanup slot machine system
            if (slotMachineSystemRef.current) {
                slotMachineSystemRef.current.cleanup();
            }
            // Cleanup jackpot celebration
            if (jackpotCelebrationRef.current) {
                jackpotCelebrationRef.current.cleanup();
                jackpotCelebrationRef.current = null;
            }
            // Cleanup gold rain particle system
            if (playerGoldRainRef.current) {
                playerGoldRainRef.current.dispose();
                playerGoldRainRef.current = null;
            }
            // Cleanup camera controller
            if (cameraControllerRef.current) {
                cameraControllerRef.current.dispose();
                cameraControllerRef.current = null;
            }
            // Cleanup player name sprite ref
            playerNameSpriteRef.current = null;
            buildPenguinMeshRef.current = null;
            setMeshBuilderReady(false);
            // Cleanup AI agent meshes (town-only spawn, must not leak on room change)
            for (const agent of aiAgentsRef.current) {
                if (agent.mesh) {
                    disposeThreeObject(agent.mesh);
                    sceneRef.current?.remove(agent.mesh);
                }
            }
            aiAgentsRef.current = [];
            for (const entry of aiPufflesRef.current) {
                if (entry?.puffle?.mesh) {
                    disposeThreeObject(entry.puffle.mesh);
                    sceneRef.current?.remove(entry.puffle.mesh);
                }
            }
            aiPufflesRef.current = [];

            if (iceFishingSystemRef.current) {
                iceFishingSystemRef.current.cleanup();
                iceFishingSystemRef.current = null;
            }
            starterRodPickupRef.current?.dispose();
            starterRodPickupRef.current = null;
            if (goldLobbySlotSystemRef.current) {
                goldLobbySlotSystemRef.current = null;
            }

            if (playerRef.current) {
                disposeThreeObject(playerRef.current);
                sceneRef.current?.remove(playerRef.current);
                playerRef.current = null;
            }
            bubbleSpriteRef.current = null;

            for (const [, data] of otherPlayerMeshesRef.current) {
                if (data.mesh) {
                    disposeThreeObject(data.mesh);
                    sceneRef.current?.remove(data.mesh);
                }
                if (data.puffleMesh) {
                    disposeThreeObject(data.puffleMesh);
                    sceneRef.current?.remove(data.puffleMesh);
                }
                if (data.goldRainSystem) data.goldRainSystem.dispose();
            }
            otherPlayerMeshesRef.current.clear();

            if (sceneRef.current) {
                disposeThreeObject(sceneRef.current);
                sceneRef.current = null;
            }
        };
    }, [room]); // eslint-disable-line react-hooks/exhaustive-deps -- penguinData reads use penguinDataRef; the line-279 useEffect handles mesh rebuilds
    
    // ==================== 3D MATCH BANNERS (SPECTATOR VIEW) ====================
    // Create floating banners above players in active matches
    // This runs as a useEffect responding to prop changes, not in the game loop
    useEffect(() => {
        if (!sceneRef.current || !window.THREE) return;
        
        const THREE = window.THREE;
        const scene = sceneRef.current;
        const banners = matchBannersRef.current;
        const playersData = playersDataRef.current;
        
        // Update banners using the extracted system
        updateMatchBanners({
            THREE,
            scene,
            bannersRef: banners,
            playersData,
            activeMatches,
            spectatingMatch
        });
        
    }, [activeMatches, spectatingMatch]); // Re-run when matches or spectating data changes
    
    // ==================== PvE ACTIVITY BANNERS ====================
    // Update PvE activity banners (fishing, blackjack, etc.)
    useEffect(() => {
        if (!sceneRef.current || !window.THREE) return;
        
        const THREE = window.THREE;
        const scene = sceneRef.current;
        const pveBanners = pveBannersRef.current;
        const playersData = playersDataRef.current;
        
        // Update PvE banners using the extracted system
        updatePveBanners({
            THREE,
            scene,
            pveBannersRef: pveBanners,
            playersData,
            activePveActivities,
            localPlayerId: playerId
        });
        
    }, [activePveActivities, playerId]); // Re-run when PvE activities change
    
    const triggerEmote = (type) => {
        emoteRef.current = { type, startTime: Date.now() };
        // Send emote to other players (emote wheel = ground emotes, not furniture)
        mpSendEmote(type, false);
        
        // Special handling for "67" emote - show chat bubble without logging
        if (type === '67') {
            mpSendEmoteBubble('67!'); // Send to other players
            setActiveBubble('67!'); // Show locally above own head
        }
    };

    // Tab = backpack toggle, C = sit emote, Z = mount equip/unequip
    useEffect(() => {
        const isTypingTarget = (el) => {
            if (!el) return false;
            const tag = el.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
        };

        const clearLocalEmote = () => {
            emoteRef.current.type = null;
            mpSendEmote(null);
            if (playerRef.current?.children[0]) {
                const m = playerRef.current.children[0];
                m.position.y = 0.8;
                m.rotation.x = 0;
                m.rotation.z = 0;
            }
        };

        const onKeyDown = (e) => {
            if (e.repeat) return;
            if (arcadeGameActiveRef.current) return;
            if (isTypingTarget(document.activeElement)) return;

            if (e.code === 'Tab') {
                e.preventDefault();
                if (showNpcBackpackRef.current) {
                    setShowNpcBackpack(false);
                    setNpcBackpackSellMerchant(null);
                    return;
                }
                window.dispatchEvent(new CustomEvent('toggleGameInventory'));
                return;
            }

            if (e.code === 'KeyC') {
                e.preventDefault();
                if (seatedRef.current) return;
                if (emoteRef.current?.type === 'Sit') {
                    clearLocalEmote();
                } else {
                    triggerEmote('Sit');
                }
                return;
            }

            if (e.code === 'KeyZ') {
                e.preventDefault();
                setGameSettings((prev) => ({
                    ...prev,
                    mountEnabled: prev.mountEnabled === false
                }));
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [mpSendEmote, setGameSettings]);
    
    // ==================== EMOTE WHEEL - STICKY SELECTION ====================
    // Selection stays on last hovered sector until a DIFFERENT sector is entered
    useEffect(() => {
        if (!emoteWheelOpen) return;
        
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const DEAD_ZONE = 50; // pixels from center
        const NUM_SECTORS = EMOTE_WHEEL_ITEMS.length;
        const SECTOR_SIZE = 360 / NUM_SECTORS;
        
        const handleMouseMove = (e) => {
            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // DEAD ZONE: Don't change selection, keep the sticky value
            if (distance < DEAD_ZONE) {
                return; // Keep current selection
            }
            
            // Calculate angle (0° at top, clockwise)
            let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
            if (angle < 0) angle += 360;
            
            // Determine sector index
            const newIndex = Math.floor(angle / SECTOR_SIZE) % NUM_SECTORS;
            
            // STICKY: Only update if entering a DIFFERENT sector
            if (newIndex !== emoteSelectionRef.current) {
                emoteSelectionRef.current = newIndex;
                setEmoteWheelSelection(newIndex);
            }
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, [emoteWheelOpen]);
    
    // ==================== VICTORY DANCE ====================
    // Auto-trigger dance animation when player wins a match
    useEffect(() => {
        if (shouldDance) {
            console.log('🎉 Victory dance triggered!');
            triggerEmote('Dance');
            // Clear the dance flag after triggering
            if (clearDance) {
                setTimeout(() => clearDance(), 100);
            }
        }
    }, [shouldDance, clearDance]);
    

    // ==================== PLAYER CLICK DETECTION ====================
    // Handle clicking/tapping on other players to open profile menu (works on both desktop and mobile)
    useEffect(() => {
        if (!rendererRef.current || !cameraRef.current || !raycasterRef.current || !onPlayerClick) return;
        
        const renderer = rendererRef.current;
        const camera = cameraRef.current;
        const raycaster = raycasterRef.current;
        
        // Unified handler for both mouse clicks and touch taps
        const handleInteraction = (clientX, clientY, eventTarget, isTouch = false) => {
            if (!canPickWorldAt(clientX, clientY, renderer.domElement)) {
                return;
            }
            
            // For mouse clicks, require exact target match
            // For touch, document-level handler validates via canPickWorldAt above
            if (!isTouch && eventTarget !== renderer.domElement) {
                return;
            }
            
            // Calculate position in normalized device coordinates (-1 to +1)
            const rect = renderer.domElement.getBoundingClientRect();
            mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            
            // Update raycaster
            raycaster.setFromCamera(mouseRef.current, camera);
            
            // Collect all other player meshes
            const playerMeshes = [];
            const meshToPlayerMap = new Map();
            
            // Also collect puffle meshes for petting
            const puffleMeshes = [];
            const meshToPuffleOwnerMap = new Map();
            
            for (const [id, data] of otherPlayerMeshesRef.current) {
                if (data.mesh) {
                    playerMeshes.push(data.mesh);
                    // Also add children for better hit detection
                    data.mesh.traverse(child => {
                        if (child.isMesh) {
                            meshToPlayerMap.set(child, id);
                        }
                    });
                    meshToPlayerMap.set(data.mesh, id);
                }
                
                // Add puffle mesh for petting (if player has a puffle)
                if (data.puffleMesh) {
                    puffleMeshes.push(data.puffleMesh);
                    data.puffleMesh.traverse(child => {
                        if (child.isMesh) {
                            meshToPuffleOwnerMap.set(child, { ownerId: id, puffleMesh: data.puffleMesh, puffleInstance: data.puffleInstance });
                        }
                    });
                    meshToPuffleOwnerMap.set(data.puffleMesh, { ownerId: id, puffleMesh: data.puffleMesh, puffleInstance: data.puffleInstance });
                }
            }
            
            // Add local player's puffle for self-petting
            if (playerPuffleRef.current?.mesh) {
                const localPuffleMesh = playerPuffleRef.current.mesh;
                puffleMeshes.push(localPuffleMesh);
                localPuffleMesh.traverse(child => {
                    if (child.isMesh) {
                        meshToPuffleOwnerMap.set(child, { ownerId: 'self', puffleMesh: localPuffleMesh, puffleInstance: playerPuffleRef.current });
                    }
                });
                meshToPuffleOwnerMap.set(localPuffleMesh, { ownerId: 'self', puffleMesh: localPuffleMesh, puffleInstance: playerPuffleRef.current });
            }
            
            // Collect banner sprites for click detection
            const bannerSprites = [];
            // Igloo banners
            iglooOccupancySpritesRef.current.forEach(sprite => {
                if (sprite.visible) bannerSprites.push(sprite);
            });
            // Match banners (from matchBannersRef)
            if (matchBannersRef.current) {
                matchBannersRef.current.forEach((bannerData) => {
                    if (bannerData.sprite && bannerData.sprite.visible) {
                        bannerSprites.push(bannerData.sprite);
                    }
                });
            }
            // PvE banners (from pveBannersRef)
            if (pveBannersRef.current) {
                pveBannersRef.current.forEach((bannerData) => {
                    if (bannerData.sprite && bannerData.sprite.visible) {
                        bannerSprites.push(bannerData.sprite);
                    }
                });
            }
            // Lord Fishnu sprite
            if (lordFishnuSpriteRef.current && lordFishnuSpriteRef.current.visible) {
                bannerSprites.push(lordFishnuSpriteRef.current);
                // Store banner data if not already set
                if (!lordFishnuSpriteRef.current.userData.bannerData) {
                    lordFishnuSpriteRef.current.userData.bannerData = {
                        type: 'canvas',
                        title: 'Lord Fishnu Lore',
                        description: 'The legend of Lord Fishnu',
                        canvas: lordFishnuSpriteRef.current.material.map.image,
                        renderFn: (ctx, w, h) => {
                            const img = lordFishnuSpriteRef.current.material.map.image;
                            if (img) {
                                ctx.drawImage(img, 0, 0, w, h);
                            }
                        }
                    };
                }
            }
            // Casino TV and payout boards (stored in room refs)
            if (roomRef.current === 'snow_forts' && snowFortsZoneRef.current?.casinoTVMesh?.visible) {
                bannerSprites.push(snowFortsZoneRef.current.casinoTVMesh);
            }
            if (casinoRoomRef.current) {
                const casino = casinoRoomRef.current;
                if (casino.tvMesh && casino.tvMesh.visible) {
                    bannerSprites.push(casino.tvMesh);
                }
                if (casino.payoutBoards) {
                    casino.payoutBoards.forEach(board => {
                        if (board.group && board.group.visible) {
                            board.group.traverse(child => {
                                if (child.isMesh && child.userData.isBanner) {
                                    bannerSprites.push(child);
                                }
                            });
                        }
                    });
                }
            }
            // Nightclub banners (stored in nightclub ref)
            if (nightclubRef.current) {
                const nightclub = nightclubRef.current;
                if (nightclub.bannerMeshes) {
                    nightclub.bannerMeshes.forEach(mesh => {
                        if (mesh.visible) bannerSprites.push(mesh);
                    });
                }
            }
            
            // Billboards (find all billboard groups in scene and get their advert meshes)
            if (sceneRef.current) {
                sceneRef.current.traverse(obj => {
                    if (obj.name === 'billboard' && obj.isGroup) {
                        // Traverse billboard group to find advert mesh with bannerData
                        obj.traverse(child => {
                            if (child.isMesh && child.userData?.isBanner && child.userData?.bannerData) {
                                if (child.visible) bannerSprites.push(child);
                            }
                        });
                    }
                });
            }
            
            // Also check all meshes in scene for bannerData (catch any we might have missed)
            if (sceneRef.current) {
                sceneRef.current.traverse(obj => {
                    if (obj.isMesh && obj.userData?.isBanner && obj.userData?.bannerData && !bannerSprites.includes(obj)) {
                        if (obj.visible) bannerSprites.push(obj);
                    }
                });
            }
            
            // Check for intersections with players first
            const allMeshes = [];
            playerMeshes.forEach(m => m.traverse(child => { if (child.isMesh) allMeshes.push(child); }));
            
            const intersects = raycaster.intersectObjects(allMeshes, false);
            
            // Check banner clicks - handle sprites and meshes separately
            // THREE.Sprite objects don't work with standard raycaster, need manual check
            let clickedBanner = null;
            let bannerData = null;
            
            // Separate sprites from meshes
            const bannerMeshes = [];
            const bannerSpritesOnly = [];
            bannerSprites.forEach(s => {
                if (s.isMesh) {
                    bannerMeshes.push(s);
                } else if (s.isSprite) {
                    bannerSpritesOnly.push(s);
                }
            });
            
            // First check meshes (they work with raycaster)
            const bannerMeshIntersects = raycaster.intersectObjects(bannerMeshes, false);
            
            if (bannerMeshIntersects.length > 0) {
                clickedBanner = bannerMeshIntersects[0].object;
            } else if (bannerSpritesOnly.length > 0) {
                // Check sprites manually (THREE.Sprite needs special handling)
                // Sprites are always billboarded (facing camera), so check distance from ray to sprite position
                const ray = raycaster.ray;
                let closestSprite = null;
                let closestDistance = Infinity;
                
                for (const sprite of bannerSpritesOnly) {
                    if (!sprite.visible) continue;
                    
                    // Get sprite world position
                    const spriteWorldPos = new THREE.Vector3();
                    sprite.getWorldPosition(spriteWorldPos);
                    
                    // Calculate distance from ray to sprite position
                    const rayToSprite = new THREE.Vector3().subVectors(spriteWorldPos, ray.origin);
                    const rayDir = ray.direction.clone().normalize();
                    const projectionLength = rayToSprite.dot(rayDir);
                    
                    // Closest point on ray to sprite
                    const closestPointOnRay = ray.origin.clone().add(rayDir.multiplyScalar(projectionLength));
                    const distanceToRay = closestPointOnRay.distanceTo(spriteWorldPos);
                    
                    // Get sprite size (approximate from scale)
                    const spriteSize = Math.max(sprite.scale.x, sprite.scale.y) / 2;
                    
                    // Check if ray passes through sprite bounds
                    if (distanceToRay < spriteSize && projectionLength > 0) {
                        if (distanceToRay < closestDistance) {
                            closestDistance = distanceToRay;
                            closestSprite = sprite;
                        }
                    }
                }
                
                if (closestSprite) {
                    clickedBanner = closestSprite;
                }
            }
            
            // If we found a clicked banner, get its banner data
            if (clickedBanner) {
                let obj = clickedBanner;
                while (obj && !bannerData) {
                    bannerData = obj.userData?.bannerData;
                    if (!bannerData && obj.parent) {
                        obj = obj.parent;
                    } else {
                        break;
                    }
                }
                
                if (bannerData) {
                    // Check if this is the Igloo Rental Guide - use special component
                    if (bannerData.title === '🏠 Igloo Rental Guide' || 
                        (bannerData.title && bannerData.title.includes('Igloo Rental Guide'))) {
                        setIglooRentalGuideOpen(true);
                        return; // Don't process player clicks if banner was clicked
                    }
                    
                    // Check if this is the Gacha Drop Rates board - use special component
                    if (bannerData.title === 'Gacha Drop Rates' || 
                        (bannerData.title && bannerData.title.includes('Gacha')) ||
                        (bannerData.title && bannerData.title.includes('Cosmetic Gacha'))) {
                        setGachaDropRatesGuideOpen(true);
                        return; // Don't process player clicks if banner was clicked
                    }
                    
                    // Open banner zoom overlay for other banners
                    setBannerZoomData({
                        type: bannerData.type || 'canvas',
                        title: bannerData.title || 'Banner',
                        description: bannerData.description,
                        imagePath: bannerData.imagePath, // For image type banners (billboards)
                        canvas: bannerData.canvas
                    });
                    bannerZoomRenderFn.current = bannerData.renderFn;
                    setBannerZoomOpen(true);
                    return; // Don't process player clicks if banner was clicked
                }
            }
            
            if (intersects.length > 0) {
                // Find which player was clicked/tapped
                let clickedPlayerId = null;
                
                for (const intersect of intersects) {
                    // Traverse up to find the root mesh
                    let obj = intersect.object;
                    while (obj && !meshToPlayerMap.has(obj)) {
                        obj = obj.parent;
                    }
                    
                    if (obj && meshToPlayerMap.has(obj)) {
                        clickedPlayerId = meshToPlayerMap.get(obj);
                        break;
                    }
                }
                
                if (clickedPlayerId) {
                    const playerData = playersDataRef.current.get(clickedPlayerId);
                    if (playerData) {
                        console.log('🖱️ Clicked/tapped on player:', playerData.name);
                        onPlayerClick({
                            id: clickedPlayerId,
                            name: playerData.name,
                            appearance: playerData.appearance,
                            position: playerData.position,
                            isAuthenticated: playerData.isAuthenticated,
                            isBot: playerData.isBot || playerData.isPracticeBot || clickedPlayerId === 'dev_bot_wager',
                            isPracticeBot: playerData.isPracticeBot || playerData.isBot || clickedPlayerId === 'dev_bot_wager',
                            cpNametagTier: playerData.cpNametagTier || 'standard',
                        });
                    }
                }
            }
            
            // Check for puffle clicks (petting) - only if no player was clicked
            if (puffleMeshes.length > 0) {
                const allPuffleMeshChildren = [];
                puffleMeshes.forEach(m => m.traverse(child => { if (child.isMesh) allPuffleMeshChildren.push(child); }));
                
                const puffleIntersects = raycaster.intersectObjects(allPuffleMeshChildren, false);
                
                if (puffleIntersects.length > 0) {
                    // Find which puffle was clicked
                    let clickedPuffleData = null;
                    
                    for (const intersect of puffleIntersects) {
                        let obj = intersect.object;
                        while (obj && !meshToPuffleOwnerMap.has(obj)) {
                            obj = obj.parent;
                        }
                        
                        if (obj && meshToPuffleOwnerMap.has(obj)) {
                            clickedPuffleData = meshToPuffleOwnerMap.get(obj);
                            break;
                        }
                    }
                    
                    if (clickedPuffleData) {
                        const { ownerId, puffleInstance } = clickedPuffleData;
                        const PUFFLE_PET_COOLDOWN = 5 * 60 * 1000; // 5 minutes
                        const now = Date.now();
                        
                        // Check proximity (must be within 15 units to pet - generous to account for position lag)
                        // Use the MESH position (actual rendered position) not puffleInstance.position
                        const playerPos = posRef.current;
                        const puffleMesh = clickedPuffleData.puffleMesh;
                        const pufflePos = puffleMesh.position; // Always use the rendered mesh position
                        const dx = playerPos.x - pufflePos.x;
                        const dz = playerPos.z - pufflePos.z;
                        const distance = Math.sqrt(dx * dx + dz * dz);
                        
                        console.log('🐾 Pet proximity check:', { 
                            playerPos: { x: playerPos.x.toFixed(1), z: playerPos.z.toFixed(1) },
                            pufflePos: { x: pufflePos.x.toFixed(1), z: pufflePos.z.toFixed(1) },
                            distance: distance.toFixed(1),
                            ownerId
                        });
                        
                        if (distance > 15) {
                            setPufflePetNotification({
                                type: 'too_far',
                                message: 'Move closer to pet the puffle!',
                                startTime: now
                            });
                            setTimeout(() => setPufflePetNotification(null), 2000);
                            return;
                        }
                        
                        // Create unique key for this puffle
                        const puffleKey = ownerId === 'self' ? 'self_puffle' : `${ownerId}_puffle`;
                        const lastPetTime = pufflePetCooldownsRef.current.get(puffleKey) || 0;
                        
                        if (now - lastPetTime < PUFFLE_PET_COOLDOWN) {
                            // On cooldown
                            const remainingSeconds = Math.ceil((PUFFLE_PET_COOLDOWN - (now - lastPetTime)) / 1000);
                            const remainingMinutes = Math.floor(remainingSeconds / 60);
                            const remainingSecs = remainingSeconds % 60;
                            
                            setPufflePetNotification({
                                type: 'cooldown',
                                message: `Wait ${remainingMinutes}m ${remainingSecs}s to pet again`,
                                startTime: now
                            });
                            setTimeout(() => setPufflePetNotification(null), 2000);
                            return;
                        }
                        
                        // Pet the puffle!
                        console.log('🐾 Petting puffle! Owner:', ownerId, 'Instance:', puffleInstance);
                        pufflePetCooldownsRef.current.set(puffleKey, now);
                        
                        // Get puffle name and current happiness
                        let puffleName = 'Puffle';
                        let currentHappiness = puffleInstance?.happiness || 80;
                        
                        if (ownerId === 'self') {
                            puffleName = puffleInstance?.name || 'your puffle';
                        } else if (ownerId === 'dev_bot_wager') {
                            puffleName = 'BotPuffle';
                        } else {
                            const ownerData = playersDataRef.current.get(ownerId);
                            puffleName = ownerData?.puffle?.name || 'the puffle';
                            currentHappiness = ownerData?.puffle?.happiness || 80;
                        }
                        
                        // Increase happiness
                        const newHappiness = Math.min(100, currentHappiness + 10);
                        
                        // Show hearts emote on the puffle
                        if (puffleInstance?.showEmote) {
                            puffleInstance.showEmote('💕');
                            console.log('🐾 Triggered hearts emote on puffle');
                        }
                        
                        // Trigger a "pet" animation - make puffle do a happy jump
                        if (puffleInstance?.mesh) {
                            const puffleMesh = puffleInstance.mesh;
                            const originalY = puffleMesh.position.y;
                            const originalScale = puffleMesh.scale.clone();
                            
                            // Quick jump animation
                            let jumpTime = 0;
                            const jumpAnimation = () => {
                                jumpTime += 16;
                                const progress = jumpTime / 500; // 500ms animation
                                
                                if (progress < 1) {
                                    // Jump up and squash/stretch
                                    const jumpHeight = Math.sin(progress * Math.PI) * 0.8;
                                    puffleMesh.position.y = originalY + jumpHeight;
                                    
                                    // Squash on land, stretch on jump
                                    const squash = 1 + Math.sin(progress * Math.PI * 2) * 0.2;
                                    puffleMesh.scale.set(
                                        originalScale.x * (1 / squash),
                                        originalScale.y * squash,
                                        originalScale.z * (1 / squash)
                                    );
                                    
                                    // Spin slightly
                                    puffleMesh.rotation.y += 0.15;
                                    
                                    requestAnimationFrame(jumpAnimation);
                                } else {
                                    // Reset
                                    puffleMesh.position.y = originalY;
                                    puffleMesh.scale.copy(originalScale);
                                }
                            };
                            jumpAnimation();
                        }
                        
                        // If it's our own puffle, increase happiness directly AND persist to server/database
                        if (ownerId === 'self' && puffleInstance) {
                            puffleInstance.happiness = newHappiness;
                            puffleInstance.updateMood?.();
                            console.log('🐾 Petted own puffle! Happiness:', puffleInstance.happiness);
                            
                            // Send to server so happiness persists to database
                            send?.({
                                type: 'puffle_pet_self',
                                puffleId: puffleInstance.puffleId
                            });
                        } else if (ownerId === 'dev_bot_wager' && puffleInstance) {
                            // Update WagerBot's puffle happiness (local only - bot doesn't persist)
                            puffleInstance.happiness = newHappiness;
                            console.log('🐾 Petted WagerBot puffle! Happiness:', puffleInstance.happiness);
                        } else if (ownerId !== 'self' && ownerId !== 'dev_bot_wager') {
                            // Send to server for other players' puffles
                            send?.({
                                type: 'puffle_pet',
                                targetOwnerId: ownerId,
                                puffleName: puffleName
                            });
                        }
                        
                        // Show enhanced notification with happiness
                        setPufflePetNotification({
                            type: 'success',
                            message: `You petted ${puffleName}! +10 😊`,
                            happiness: newHappiness,
                            startTime: now
                        });
                        setTimeout(() => setPufflePetNotification(null), 3000);
                        
                        console.log('🐾 Petted puffle:', puffleName, 'New Happiness:', newHappiness);
                        return; // Don't process other clicks
                    }
                }
            }
        };
        
        // Helper function to throw snowball to target location (Club Penguin style)
        let _throwRaycaster;
        let _throwMouse;
        let _throwGroundPlane;
        let _throwTarget;
        const ensureThrowHelpers = () => {
            const T = window.THREE;
            if (!T) return null;
            if (!_throwRaycaster) {
                _throwRaycaster = new T.Raycaster();
                _throwMouse = new T.Vector2();
                _throwGroundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
                _throwTarget = new T.Vector3();
            }
            return T;
        };

        const throwSnowballToTarget = (targetX, targetZ) => {
            const now = Date.now();
            // Check cooldown
            if (now < snowballCooldownRef.current) {
                console.log('❄️ Snowball on cooldown:', Math.ceil((snowballCooldownRef.current - now) / 1000), 's');
                return false;
            }
            
            if (!playerRef.current || !sceneRef.current) return false;

            const THREE = window.THREE;
            if (!THREE) return false;
            
            const playerPos = playerRef.current.position;
            
            // Start position (penguin's hand height)
            const startPos = {
                x: playerPos.x,
                y: playerPos.y + 1.5,
                z: playerPos.z
            };
            
            // Target is on ground (y = 0)
            const targetY = 0;
            
            // Calculate horizontal distance to target
            const dx = targetX - startPos.x;
            const dz = targetZ - startPos.z;
            const horizontalDist = Math.sqrt(dx * dx + dz * dz);
            
            // Clamp max throw distance (penguins can only throw so far!)
            const maxDistance = 25;
            let clampedDist = Math.min(horizontalDist, maxDistance);
            let clampedDx = dx;
            let clampedDz = dz;
            
            if (horizontalDist > maxDistance) {
                const scale = maxDistance / horizontalDist;
                clampedDx = dx * scale;
                clampedDz = dz * scale;
            }
            
            // Add small random variation to landing spot (not a sniper!)
            const variation = 0.5 + clampedDist * 0.05; // More variation at longer distances
            clampedDx += (Math.random() - 0.5) * variation;
            clampedDz += (Math.random() - 0.5) * variation;
            clampedDist = Math.sqrt(clampedDx * clampedDx + clampedDz * clampedDz);
            
            // Calculate flight time based on distance (longer distance = more flight time)
            // This gives a nice arc - closer throws are quick, far throws take longer
            const minFlightTime = 0.4;
            const maxFlightTime = 1.2;
            const flightTime = minFlightTime + (clampedDist / maxDistance) * (maxFlightTime - minFlightTime);
            
            // Calculate required velocities using projectile motion equations
            // x = x0 + vx*t  ->  vx = dx/t
            // y = y0 + vy*t - 0.5*g*t^2  ->  vy = (dy + 0.5*g*t^2) / t
            const gravity = Math.abs(SNOWBALL_GRAVITY);
            const dy = targetY - startPos.y; // Usually negative (throwing down to ground)
            
            const vx = clampedDx / flightTime;
            const vz = clampedDz / flightTime;
            const vy = (dy + 0.5 * gravity * flightTime * flightTime) / flightTime;
            
            // Set cooldown
            snowballCooldownRef.current = now + SNOWBALL_COOLDOWN_MS;
            
            const snowballGeom = window._cachedSnowballGeoLarge || new THREE.SphereGeometry(0.18, 8, 8);
            const snowballMat = window._cachedSnowballMatLarge || new THREE.MeshBasicMaterial({ color: 0xffffff });
            const snowball = new THREE.Mesh(snowballGeom, snowballMat);
            snowball.position.set(startPos.x, startPos.y, startPos.z);
            snowball.castShadow = false;
            snowball.userData.isSnowball = true;
            sceneRef.current.add(snowball);
            
            // Add to active snowballs
            snowballsRef.current.push({
                mesh: snowball,
                velocity: { x: vx, y: vy, z: vz },
                startTime: now,
                targetX: startPos.x + clampedDx,
                targetZ: startPos.z + clampedDz,
                hasSplatted: false,
                throwerId: playerId // Track who threw this snowball
            });
            playSfx('snowball_throw');
            
            // Send to other players
            mpSendSnowball({
                startX: startPos.x,
                startY: startPos.y,
                startZ: startPos.z,
                velocityX: vx,
                velocityY: vy,
                velocityZ: vz
            });
            
            return true;
        };
        
        // Mouse click handler
        const handleClick = (event) => {
            // If in snowball mode, throw a snowball to clicked location
            if (isSnowballModeRef.current && playerRef.current && cameraRef.current) {
                const THREE = ensureThrowHelpers();
                if (!THREE) return;
                const camera = cameraRef.current;
                
                _throwMouse.set(
                    (event.clientX / window.innerWidth) * 2 - 1,
                    -(event.clientY / window.innerHeight) * 2 + 1
                );
                
                _throwRaycaster.setFromCamera(_throwMouse, camera);
                
                if (_throwRaycaster.ray.intersectPlane(_throwGroundPlane, _throwTarget)) {
                    throwSnowballToTarget(_throwTarget.x, _throwTarget.z);
                    return;
                }
            }
            
            handleInteraction(event.clientX, event.clientY, event.target, false);
        };
        
        // Touch handler - detect taps on players
        let touchStartTime = 0;
        let touchStartPos = { x: 0, y: 0 };
        
        const handleTouchStart = (event) => {
            if (event.touches.length === 1) {
                touchStartTime = Date.now();
                touchStartPos = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY
                };
            }
        };
        
        const handleTouchEnd = (event) => {
            // Only process single-finger taps
            if (event.changedTouches.length !== 1) return;
            
            const touch = event.changedTouches[0];
            const touchDuration = Date.now() - touchStartTime;
            const touchMoved = Math.abs(touch.clientX - touchStartPos.x) > 20 ||
                              Math.abs(touch.clientY - touchStartPos.y) > 20;
            
            // Only treat as tap if touch was short (< 400ms) and didn't move much
            // Slightly more lenient for mobile (was 300ms/15px, now 400ms/20px)
            if (touchDuration < 400 && !touchMoved) {
                // If in snowball mode, throw to tapped location (mobile Club Penguin style!)
                if (isSnowballModeRef.current && playerRef.current && cameraRef.current) {
                    const THREE = ensureThrowHelpers();
                    if (!THREE) return;
                    const camera = cameraRef.current;
                    
                    _throwMouse.set(
                        (touch.clientX / window.innerWidth) * 2 - 1,
                        -(touch.clientY / window.innerHeight) * 2 + 1
                    );
                    
                    _throwRaycaster.setFromCamera(_throwMouse, camera);
                    
                    if (_throwRaycaster.ray.intersectPlane(_throwGroundPlane, _throwTarget)) {
                        throwSnowballToTarget(_throwTarget.x, _throwTarget.z);
                        return;
                    }
                }
                
                // Get the element under the touch point
                const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
                handleInteraction(touch.clientX, touch.clientY, targetElement, true);
            }
        };
        
        renderer.domElement.addEventListener('click', handleClick);
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        return () => {
            renderer.domElement.removeEventListener('click', handleClick);
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onPlayerClick, playerId]);
    
    // ==================== HOVER CURSOR DETECTION ====================
    // Change cursor based on what's being hovered over (clickable objects, igloos, etc.)
    useEffect(() => {
        if (!rendererRef.current || !cameraRef.current || !raycasterRef.current) return;
        
        const renderer = rendererRef.current;
        const camera = cameraRef.current;
        const raycaster = raycasterRef.current;
        
        // PERF: hover detection used to run a full scene traverse + raycast on EVERY mousemove.
        // Now: throttled to 10Hz, and the static-scene classification (props/buildings/POIs,
        // which never changes between room loads) is cached with a short TTL. Dynamic objects
        // (players, puffles, sprites, banners) are still collected fresh each check.
        let _lastHoverCheck = 0;
        const HOVER_CHECK_INTERVAL_MS = 100;
        let _staticHoverCache = null;
        let _staticHoverCacheTime = 0;
        const STATIC_HOVER_CACHE_TTL_MS = 3000;
        const _spriteWorldPos = new window.THREE.Vector3();
        const _rayToSprite = new window.THREE.Vector3();
        const _closestPointOnRay = new window.THREE.Vector3();
        
        const handleMouseMove = (event) => {
            const hoverNow = performance.now();
            if (hoverNow - _lastHoverCheck < HOVER_CHECK_INTERVAL_MS) return;
            _lastHoverCheck = hoverNow;
            
            // Skip if any UI element is being hovered
            if (!canPickWorldAt(event.clientX, event.clientY, renderer.domElement)) {
                setHoverCursor('default');
                return;
            }
            
            // Calculate mouse position in normalized device coordinates
            const rect = renderer.domElement.getBoundingClientRect();
            const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            raycaster.setFromCamera({ x: mouseX, y: mouseY }, camera);
            
            // Collect all interactive objects
            const interactiveObjects = [];
            const objectTypeMap = new Map();
            
            // Add other player meshes (clickable)
            for (const [id, data] of otherPlayerMeshesRef.current) {
                if (data.mesh) {
                    data.mesh.traverse(child => {
                        if (child.isMesh) {
                            interactiveObjects.push(child);
                            objectTypeMap.set(child, 'player');
                        }
                    });
                }
            }
            
            // Add puffles (clickable for petting)
            for (const [id, data] of otherPlayerMeshesRef.current) {
                if (data.puffleMesh) {
                    data.puffleMesh.traverse(child => {
                        if (child.isMesh) {
                            interactiveObjects.push(child);
                            objectTypeMap.set(child, 'puffle');
                        }
                    });
                }
            }
            
            // Add local player's puffle (clickable for self-petting)
            if (playerPuffleRef.current?.mesh) {
                playerPuffleRef.current.mesh.traverse(child => {
                    if (child.isMesh) {
                        interactiveObjects.push(child);
                        objectTypeMap.set(child, 'puffle');
                    }
                });
            }
            
            // Add igloo occupancy sprites (explore/help cursor)
            iglooOccupancySpritesRef.current.forEach((sprite, iglooId) => {
                if (sprite.visible) {
                    interactiveObjects.push(sprite);
                    objectTypeMap.set(sprite, 'igloo');
                }
            });
            
            // Add banners (clickable)
            if (matchBannersRef.current) {
                matchBannersRef.current.forEach((bannerData) => {
                    if (bannerData.sprite && bannerData.sprite.visible) {
                        interactiveObjects.push(bannerData.sprite);
                        objectTypeMap.set(bannerData.sprite, 'banner');
                    }
                });
            }
            
            // Add Lord Fishnu sprite (clickable)
            if (lordFishnuSpriteRef.current && lordFishnuSpriteRef.current.visible) {
                interactiveObjects.push(lordFishnuSpriteRef.current);
                objectTypeMap.set(lordFishnuSpriteRef.current, 'banner');
            }
            
            // Check scene for interactive props/buildings (cached — this classification is
            // expensive string matching over the whole graph and rarely changes)
            if (sceneRef.current) {
                if (!_staticHoverCache || hoverNow - _staticHoverCacheTime > STATIC_HOVER_CACHE_TTL_MS) {
                    // Helper to check if obj or any parent has a name containing the search string
                    const hasNameInHierarchy = (obj, search) => {
                        let current = obj;
                        while (current) {
                            if (current.name?.toLowerCase().includes(search.toLowerCase())) {
                                return true;
                            }
                            current = current.parent;
                        }
                        return false;
                    };
                    
                    // POI names that should show the "?" cursor (explorable/interactable locations)
                    const poiNames = [
                        'lighthouse', 'dojo', 'nightclub', 'casino', 'puffle', 'pizza', 'plaza',
                        'arcade', 'fishing', 'bench', 'parkour', 'skatepark', 'park', 'fountain',
                        'signpost', 'mailbox', 'vending', 'slot', 'roulette', 'blackjack'
                    ];
                    
                    const staticObjects = [];
                    const staticTypeMap = new Map();
                    sceneRef.current.traverse(obj => {
                        if (obj.isMesh || obj.isSprite) {
                            // Check for clickable interaction markers
                            if (obj.userData?.isInteractive || obj.userData?.isBanner || obj.name?.includes('interaction')) {
                                staticObjects.push(obj);
                                staticTypeMap.set(obj, 'poi');
                            }
                            // Check for igloo markers (check entire hierarchy for "igloo" name)
                            else if (hasNameInHierarchy(obj, 'igloo')) {
                                staticObjects.push(obj);
                                staticTypeMap.set(obj, 'igloo');
                            }
                            // Check for portal markers
                            else if (obj.name?.includes('portal') || obj.userData?.isPortal) {
                                staticObjects.push(obj);
                                staticTypeMap.set(obj, 'poi');
                            }
                            // Check for POIs - buildings, props, interactables that show "?" cursor
                            else if (poiNames.some(poi => hasNameInHierarchy(obj, poi))) {
                                staticObjects.push(obj);
                                staticTypeMap.set(obj, 'poi');
                            }
                            // Check for shop/building entrances
                            else if (obj.name?.includes('shop') || obj.name?.includes('building') || 
                                obj.name?.includes('entrance') || obj.userData?.isClickable) {
                                staticObjects.push(obj);
                                staticTypeMap.set(obj, 'poi');
                            }
                        }
                    });
                    _staticHoverCache = { objects: staticObjects, typeMap: staticTypeMap };
                    _staticHoverCacheTime = hoverNow;
                }
                
                // Merge static classification under dynamic entries (dynamic wins, matching
                // the original traverse which skipped already-mapped objects)
                for (const obj of _staticHoverCache.objects) {
                    if (obj.parent === null) continue; // removed from scene since cache build
                    if (objectTypeMap.has(obj)) continue;
                    interactiveObjects.push(obj);
                    objectTypeMap.set(obj, _staticHoverCache.typeMap.get(obj));
                }
            }
            
            // Check for intersections
            const meshObjects = interactiveObjects.filter(o => o.isMesh);
            const spriteObjects = interactiveObjects.filter(o => o.isSprite);
            
            let hovered = null;
            let hoveredType = null;
            
            // Check mesh intersections
            if (meshObjects.length > 0) {
                const intersects = raycaster.intersectObjects(meshObjects, false);
                if (intersects.length > 0) {
                    let obj = intersects[0].object;
                    while (obj && !objectTypeMap.has(obj)) {
                        obj = obj.parent;
                    }
                    if (obj) {
                        hovered = obj;
                        hoveredType = objectTypeMap.get(obj);
                    }
                }
            }
            
            // Check sprite intersections (sprites need special handling)
            if (!hovered && spriteObjects.length > 0) {
                const THREE = window.THREE;
                const ray = raycaster.ray;
                
                for (const sprite of spriteObjects) {
                    if (!sprite.visible) continue;
                    
                    sprite.getWorldPosition(_spriteWorldPos);
                    
                    _rayToSprite.subVectors(_spriteWorldPos, ray.origin);
                    const rayDir = ray.direction; // already normalized
                    const projectionLength = _rayToSprite.dot(rayDir);
                    
                    if (projectionLength < 0) continue; // Behind camera
                    
                    _closestPointOnRay.copy(ray.origin).addScaledVector(rayDir, projectionLength);
                    const distanceToRay = _closestPointOnRay.distanceTo(_spriteWorldPos);
                    const spriteSize = Math.max(sprite.scale.x, sprite.scale.y) / 2;
                    
                    if (distanceToRay < spriteSize) {
                        hovered = sprite;
                        hoveredType = objectTypeMap.get(sprite);
                        break;
                    }
                }
            }
            
            if (roomRef.current === 'forest_trails' && forestTreeManagerRef.current && !manualChopActiveRef.current) {
                const playerPos = posRef.current;
                const stumpHover = forestTreeManagerRef.current.resolveStumpHover(
                    playerPos.x,
                    playerPos.z,
                    raycaster
                );
                applyForestStumpHover(stumpHover);
            } else {
                applyForestStumpHover(null);
            }

            // Set cursor based on hovered object type
            if (hovered) {
                if (hoveredType === 'igloo' || hoveredType === 'poi') {
                    setHoverCursor('help'); // ? cursor for igloos and POIs (exploration/interaction)
                } else if (hoveredType === 'player' || hoveredType === 'puffle' || hoveredType === 'banner') {
                    setHoverCursor('pointer'); // Pointer for clickable entities
                } else {
                    setHoverCursor('help'); // Default to help for other interactive objects
                }
            } else {
                setHoverCursor('default');
            }
        };
        
        renderer.domElement.addEventListener('mousemove', handleMouseMove);
        
        return () => {
            renderer.domElement.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);
    
    useEffect(() => {
        if (!activeBubble || !playerRef.current) return;
        
        if (bubbleSpriteRef.current) {
            playerRef.current.remove(bubbleSpriteRef.current);
        }
        
        // Use taller bubble height for special characters
        const bubbleHeight = penguinData?.characterType === 'marcus' ? BUBBLE_HEIGHT_MARCUS : penguinData?.characterType === 'whiteWhale' ? BUBBLE_HEIGHT_WHALE : BUBBLE_HEIGHT_PENGUIN;
        const sprite = createChatSprite(window.THREE, activeBubble, bubbleHeight);
        playerRef.current.add(sprite);
        bubbleSpriteRef.current = sprite;
        
        // Don't auto-clear if AFK or Fishnu respect - bubble stays until movement
        if (isAfkRef.current || isFishnuRespectRef.current) {
            return; // No timeout for AFK/Fishnu messages
        }
        
        const timeout = setTimeout(() => {
            if (playerRef.current && bubbleSpriteRef.current) {
                playerRef.current.remove(bubbleSpriteRef.current);
                bubbleSpriteRef.current = null;
                setActiveBubble(null);
            }
        }, 5000);
        
        return () => clearTimeout(timeout);
    }, [activeBubble, meshBuilderReady, penguinData?.characterType]);

    useEffect(() => {
        if (!forestStumpHover?.regrowAt) return undefined;
        const id = setInterval(() => setForestStumpHover((prev) => (prev ? { ...prev } : null)), 1000);
        return () => clearInterval(id);
    }, [forestStumpHover?.treeId, forestStumpHover?.regrowAt]);
    
    // Live room chat only — history reloads must not re-trigger bubbles
    const lastChatIdRef = useRef(null);
    useEffect(() => {
        if (!playerId) return undefined;

        return registerChatBubbleCallback(({ text, playerId: senderId, id, isSystem }) => {
            if (!text || !id || senderId !== playerId) return;
            if (id === lastChatIdRef.current) return;
            if (isSystem) return;

            lastChatIdRef.current = id;

            if (isAfkRef.current) {
                isAfkRef.current = false;
                afkMessageRef.current = null;
            }
            setActiveBubble(text);

            GameManager.getInstance().incrementStat('chatsSent');
        });
    }, [playerId, registerChatBubbleCallback]);

    // Puffle management - supports multiple ownership, 1 equipped at a time
    const handleAdoptPuffle = (newPuffle) => {
        // Add to owned puffles
        setOwnedPuffles(prev => [...prev, newPuffle]);
        
        // Auto-equip the newly adopted puffle
        handleEquipPuffle(newPuffle);
    };
    
    const handleEquipPuffle = (puffleToEquip) => {
        // First unequip current puffle if any
        if (playerPuffleRef.current && playerPuffleRef.current.mesh && sceneRef.current) {
            sceneRef.current.remove(playerPuffleRef.current.mesh);
            playerPuffleRef.current.mesh = null;
        }
        
        // Equip new puffle
        if (onPuffleChange) onPuffleChange(puffleToEquip);
        playerPuffleRef.current = puffleToEquip;
        
        // Spawn puffle mesh in world if scene is ready
        if (sceneRef.current && window.THREE && puffleToEquip) {
            puffleToEquip.position = { x: posRef.current.x + 1.5, y: 0, z: posRef.current.z + 1.5 };
            const mesh = puffleToEquip.createMesh(window.THREE);
            mesh.position.set(posRef.current.x + 1.5, 0.35, posRef.current.z + 1.5);
            sceneRef.current.add(mesh);
            puffleToEquip.mesh = mesh;
            
            // Sync puffle state to server (accessories, stats) so other players can see
            if (syncPuffleState) {
                syncPuffleState({
                    equippedAccessories: puffleToEquip.equippedAccessories,
                    happiness: puffleToEquip.happiness,
                    energy: puffleToEquip.energy,
                    hunger: puffleToEquip.hunger,
                    mood: puffleToEquip.mood
                });
            }
        }
    };
    
    const handleUnequipPuffle = () => {
        // Remove mesh from scene
        if (playerPuffleRef.current && playerPuffleRef.current.mesh && sceneRef.current) {
            sceneRef.current.remove(playerPuffleRef.current.mesh);
            playerPuffleRef.current.mesh = null;
        }
        
        // Clear equipped puffle
        if (onPuffleChange) onPuffleChange(null);
        playerPuffleRef.current = null;
    };

    const handleUpdatePuffle = (updatedPuffle) => {
        // Update the puffle instance
        if (onPuffleChange) onPuffleChange(updatedPuffle);
        playerPuffleRef.current = updatedPuffle;
        
        // Also update in owned puffles list
        setOwnedPuffles(prev => prev.map(p => p.id === updatedPuffle.id ? updatedPuffle : p));
        
        // Sync puffle state to server (accessories, stats) so other players can see
        if (updatedPuffle && syncPuffleState) {
            syncPuffleState({
                equippedAccessories: updatedPuffle.equippedAccessories,
                happiness: updatedPuffle.happiness,
                energy: updatedPuffle.energy,
                hunger: updatedPuffle.hunger,
                mood: updatedPuffle.mood
            });
        }
    };
    
    // Check for puffle proximity interactions (hearts animation + gold reward)
    const checkPuffleProximity = (time) => {
        if (!playerPuffleRef.current || !isAuthenticated || !walletAddress) return;
        
        const playersData = playersDataRef.current;
        if (!playersData || playersData.size === 0) return;
        
        const myPufflePos = playerPuffleRef.current.position;
        if (!myPufflePos) return;
        
        const PROXIMITY_DISTANCE = 4; // Units to trigger interaction
        const INTERACTION_DURATION = 5000; // 5 seconds of hearts
        const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown per player
        
        // Check if we're in an active interaction
        if (puffleInteractionActiveRef.current) {
            const elapsed = Date.now() - puffleInteractionActiveRef.current.startTime;
            if (elapsed >= INTERACTION_DURATION) {
                // Interaction complete - trigger reward
                const otherPlayerId = puffleInteractionActiveRef.current.playerId;
                const otherPlayerData = playersData.get(otherPlayerId);
                
                if (otherPlayerData?.walletAddress) {
                    // Send interaction to server for gold reward
                    send({
                        type: 'puffle_interaction',
                        otherWalletAddress: otherPlayerData.walletAddress
                    });
                }
                
                // Clear active interaction
                puffleInteractionActiveRef.current = null;
            }
            return; // Don't start new interaction while one is active
        }
        
        // Look for nearby puffles
        for (const [otherId, otherData] of playersData) {
            if (!otherData.puffle || !otherData.pufflePosition) continue;
            if (otherId === playerId) continue; // Skip self
            
            // Check cooldown
            const lastInteraction = puffleInteractionsRef.current.get(otherId);
            if (lastInteraction && (Date.now() - lastInteraction) < COOLDOWN_MS) {
                continue; // On cooldown with this player
            }
            
            // Check distance (squared — avoids sqrt per player per check)
            const dx = myPufflePos.x - otherData.pufflePosition.x;
            const dz = myPufflePos.z - otherData.pufflePosition.z;
            
            if (dx * dx + dz * dz < PROXIMITY_DISTANCE * PROXIMITY_DISTANCE) {
                // Start interaction!
                puffleInteractionActiveRef.current = {
                    playerId: otherId,
                    startTime: Date.now()
                };
                
                // Record interaction time
                puffleInteractionsRef.current.set(otherId, Date.now());
                
                // Show hearts on our puffle locally
                if (playerPuffleRef.current.showHearts) {
                    playerPuffleRef.current.showHearts();
                }
                
                // Broadcast love emote to all players so they see the hearts
                const loveEmojis = ['💕', '💖', '💗', '💓', '💞', '💝', '❤️'];
                const loveEmoji = loveEmojis[Math.floor(Math.random() * loveEmojis.length)];
                sendPuffleEmote?.(loveEmoji, 4000);
                
                // Show notification
                setPuffleInteractionReward({
                    type: 'hearts',
                    otherPuffle: otherData.puffle.name || 'Puffle',
                    startTime: Date.now()
                });
                
                // Hide notification after interaction completes
                setTimeout(() => {
                    setPuffleInteractionReward(null);
                }, INTERACTION_DURATION + 1000);
                
                break; // Only one interaction at a time
            }
        }
    };
    
    // Clear stale portal/interaction prompts when the room changes
    useEffect(() => {
        nearbyPortalRef.current = null;
        setNearbyPortal(null);
        setNearbyInteraction(null);
        setNearbyNpcInteraction(null);
        nearbyNpcInteractionRef.current = null;
        setActiveNpcDef(null);
        setActiveTravelNpcDef(null);
        setNearbyTravelNpcInteraction(null);
        nearbyTravelNpcInteractionRef.current = null;
        if (worldNpcManagerRef.current) {
            worldNpcManagerRef.current.detach();
        }
        if (travelNpcManagerRef.current) {
            travelNpcManagerRef.current.detach();
        }
    }, [room]);

    const checkTravelNpcs = () => {
        const overworldRooms = ['town', 'snow_forts', 'forest_trails'];
        if (!overworldRooms.includes(room) || !travelNpcManagerRef.current) {
            if (nearbyTravelNpcInteraction) {
                setNearbyTravelNpcInteraction(null);
                nearbyTravelNpcInteractionRef.current = null;
            }
            return;
        }
        const nearby = travelNpcManagerRef.current.checkProximity(
            posRef.current,
            room,
            travelRouteStatuses || []
        );
        if (nearby) {
            if (!nearbyTravelNpcInteraction || nearbyTravelNpcInteraction.id !== nearby.id) {
                setNearbyTravelNpcInteraction(nearby);
                nearbyTravelNpcInteractionRef.current = nearby;
            }
        } else if (nearbyTravelNpcInteraction) {
            setNearbyTravelNpcInteraction(null);
            nearbyTravelNpcInteractionRef.current = null;
        }
        if (cameraRef.current) {
            travelNpcManagerRef.current.updateMarkers(cameraRef.current);
        }
    };

    const checkPortals = () => {
        const playerPos = posRef.current;
        const portals = ROOM_PORTALS[room] || [];
        
        // Town portal positions are offsets - add center coordinates
        const centerX = CENTER_X;
        const centerZ = CENTER_Z;
        
        for (const portal of portals) {
            // Town portals use offset positions, dojo uses absolute
            let portalX = portal.position.x;
            let portalZ = portal.position.z;
            
            if (room === 'town' || room === 'snow_forts') {
                portalX = centerX + portal.position.x;
                portalZ = centerZ + portal.position.z;
            }
            
            const dx = playerPos.x - portalX;
            const dz = playerPos.z - portalZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < portal.doorRadius) {
                if (nearbyPortalRef.current?.id !== portal.id) {
                    // Enrich igloo portals with dynamic state data
                    if (portal.targetRoom?.startsWith('igloo')) {
                        const iglooData = getIgloo(portal.targetRoom);
                        const enriched = {
                            ...portal,
                            isIgloo: true,
                            iglooData: iglooData || null
                        };
                        nearbyPortalRef.current = enriched;
                        setNearbyPortal(enriched);
                    } else {
                        nearbyPortalRef.current = portal;
                        setNearbyPortal(portal);
                    }
                }
                return;
            }
        }
        
        if (nearbyPortalRef.current) {
            nearbyPortalRef.current = null;
            setNearbyPortal(null);
        }
    };
    
    // Check igloo proximity and show/hide occupancy bubbles
    const checkIglooProximity = () => {
        if (room !== 'town') return;
        
        const playerPos = posRef.current;
        const VISIBILITY_DISTANCE = 20;

        iglooOccupancySpritesRef.current.forEach((sprite, iglooId) => {
            if (!sprite.userData) return;
            
            const dx = playerPos.x - sprite.userData.iglooX;
            const dz = playerPos.z - sprite.userData.iglooZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            const shouldShow = dist < VISIBILITY_DISTANCE;
            
            if (sprite.visible !== shouldShow) {
                sprite.visible = shouldShow;
            }
            
            // Make sprite face camera (billboard effect)
            if (shouldShow && cameraRef.current) {
                sprite.quaternion.copy(cameraRef.current.quaternion);
            }
        });
        
        // ==================== LORD FISHNU LORE SPRITE VISIBILITY ====================
        if (lordFishnuSpriteRef.current) {
            const fishnuX = CENTER_X - 52.5;
            const fishnuZ = CENTER_Z + 54.7;
            const dx = playerPos.x - fishnuX;
            const dz = playerPos.z - fishnuZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            const FISHNU_VISIBILITY_DISTANCE = 18; // Show lore when within 18 units
            const shouldShowFishnu = dist < FISHNU_VISIBILITY_DISTANCE;
            
            if (lordFishnuSpriteRef.current.visible !== shouldShowFishnu) {
                lordFishnuSpriteRef.current.visible = shouldShowFishnu;
            }
            
            // Make sprite face camera (billboard effect)
            if (shouldShowFishnu && cameraRef.current) {
                lordFishnuSpriteRef.current.quaternion.copy(cameraRef.current.quaternion);
            }
        }
    };
    
    // Update igloo occupancy sprite with new count
    const updateIglooOccupancy = (iglooId, count) => {
        const sprite = iglooOccupancySpritesRef.current.get(iglooId);
        if (!sprite) return;
        
        // Recreate the sprite texture with new count
        const THREE = window.THREE;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const fontSize = 36;
        const padding = 16;
        const text = count > 0 ? `🐧 ${count}` : '🐧 empty';
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textWidth = ctx.measureText(text).width;
        
        const w = textWidth + padding * 2;
        const h = fontSize + padding * 2;
        
        canvas.width = w;
        canvas.height = h;
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        
        ctx.fillStyle = count > 0 ? 'rgba(30, 60, 100, 0.85)' : 'rgba(60, 60, 80, 0.75)';
        ctx.strokeStyle = count > 0 ? '#4a9eff' : '#666';
        ctx.lineWidth = 3;
        
        const r = 12;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(w - r, 0);
        ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h - r);
        ctx.quadraticCurveTo(w, h, w - r, h);
        ctx.lineTo(r, h);
        ctx.quadraticCurveTo(0, h, 0, h - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = count > 0 ? '#ffffff' : '#aaaaaa';
        ctx.fillText(text, w / 2, h / 2);
        
        // Update sprite texture
        if (sprite.material.map) {
            sprite.material.map.dispose();
        }
        sprite.material.map = new THREE.CanvasTexture(canvas);
        sprite.material.needsUpdate = true;
        
        const scale = 0.012;
        sprite.scale.set(w * scale, h * scale, 1);
    };
    
    useEffect(() => {
        if (!goldSlotResult) return;
        const timer = setTimeout(() => clearGoldSlotResult(), 4000);
        return () => clearTimeout(timer);
    }, [goldSlotResult, clearGoldSlotResult]);

    // Portal check effect
    // Check for nearby slot machines (casino only)
    const checkGoldLobbySlots = () => {
        if (room !== 'snow_forts') {
            if (goldSlotInteraction) setGoldSlotInteraction(null);
            return;
        }

        if (!snowFortsZoneRef.current?.isPlayerInCasino(posRef.current.x, posRef.current.z)) {
            if (goldSlotInteraction) setGoldSlotInteraction(null);
            goldLobbySlotSyncedRef.current = false;
            return;
        }

        if (!goldLobbySlotSyncedRef.current && syncGoldSlots) {
            goldLobbySlotSyncedRef.current = true;
            syncGoldSlots();
        }

        const sf = snowFortsZoneRef.current;
        if (!sf?.casinoLobbySlots?.length) return;

        if (!goldLobbySlotSystemRef.current) {
            goldLobbySlotSystemRef.current = new GoldLobbySlotSystem();
        }
        goldLobbySlotSystemRef.current.init(
            sf.casinoLobbySlots,
            sf.casinoLobbySlotDisplays || []
        );

        const playerPos = posRef.current;
        const playerCoins = isAuthenticated
            ? (userData?.coins ?? 0)
            : (GameManager.getInstance().getCoins() || 0);
        const interaction = goldLobbySlotSystemRef.current.checkInteraction(
            playerPos.x,
            playerPos.z,
            playerCoins,
            isAuthenticated,
            playerPos.y || 0,
            goldSlotBet
        );

        if (interaction) {
            const changed = !goldSlotInteraction
                || goldSlotInteraction.machine?.id !== interaction.machine?.id
                || goldSlotInteraction.prompt !== interaction.prompt
                || goldSlotInteraction.canSpin !== interaction.canSpin
                || goldSlotInteraction.isSpinning !== interaction.isSpinning
                || goldSlotInteraction.bet !== interaction.bet;
            if (changed) {
                setGoldSlotInteraction(interaction);
            }
        } else if (goldSlotInteraction) {
            setGoldSlotInteraction(null);
        }
    };

    const checkSlotMachines = () => {
        if (room !== 'casino_game_room') {
            if (slotInteraction) setSlotInteraction(null);
            return;
        }
        
        // Initialize slot system if not already done
        if (!slotMachineSystemRef.current && window.THREE && sceneRef.current) {
            slotMachineSystemRef.current = new SlotMachineSystem(window.THREE, sceneRef.current);
            const roomData = roomDataRef.current;
            if (roomData?.roomWidth && roomData?.roomDepth) {
                slotMachineSystemRef.current.initForCasino(roomData.roomWidth, roomData.roomDepth, sceneRef.current);
            }
        }
        
        if (!slotMachineSystemRef.current) {
            return;
        }
        
        const playerPos = posRef.current;
        const playerPebbles = userData?.pebbles || 0; // Slot gacha uses Pebbles, not coins
        
        const interaction = slotMachineSystemRef.current.checkInteraction(
            playerPos.x,
            playerPos.z,
            playerPebbles,
            isAuthenticated
        );
        
        if (interaction) {
            if (!slotInteraction || slotInteraction.machine?.id !== interaction.machine?.id) {
                setSlotInteraction(interaction);
            }
        } else if (slotInteraction) {
            setSlotInteraction(null);
        }
    };
    
    // Check for nearby blackjack tables (casino only)
    // Only shows the play prompt when player is SEATED at a blackjack stool
    const checkBlackjackTables = () => {
        if (room !== 'casino_game_room' || blackjackGameActive) {
            if (blackjackInteraction && !blackjackGameActive) setBlackjackInteraction(null);
            return;
        }
        
        // Only show blackjack UI when player is seated on a blackjack stool
        // This prevents overlap with the "sit" prompt
        if (!seatedRef.current) {
            if (blackjackInteraction) setBlackjackInteraction(null);
            return;
        }
        
        const roomData = roomDataRef.current;
        if (!roomData?.blackjackTables) return;
        
        const playerPos = posRef.current;
        const playerY = playerPos.y || 0;
        
        // Only check when player is on ground level
        if (playerY > 1.5) return;
        
        let nearestTable = null;
        let nearestDist = Infinity;
        
        for (const table of roomData.blackjackTables) {
            const dx = playerPos.x - table.x;
            const dz = playerPos.z - table.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            // Large interaction radius (7) to include seated players at stools
            if (dist < (table.interactionRadius || 7) && dist < nearestDist) {
                nearestDist = dist;
                nearestTable = table;
            }
        }
        
        if (nearestTable) {
            const isDemo = !isAuthenticated;
            const DEMO_BANKROLL = 1000;
            const playerCoins = isDemo
                ? DEMO_BANKROLL
                : (userData?.coins || GameManager.getInstance().getCoins());
            const canPlay = isDemo || playerCoins >= PVE_BJ_MIN_BET;
            
            const newInteraction = {
                tableId: nearestTable.tableId,
                table: nearestTable,
                canPlay,
                isDemo,
                balance: playerCoins
            };
            
            if (!blackjackInteraction || blackjackInteraction.tableId !== nearestTable.tableId) {
                setBlackjackInteraction(newInteraction);
            }
        } else if (blackjackInteraction) {
            setBlackjackInteraction(null);
        }
    };
    
    // Check for nearby ice fishing spots (town demo hole + snow forts)
    const checkFishingSpots = () => {
        if (room !== 'town' && room !== 'snow_forts') {
            if (fishingInteraction) setFishingInteraction(null);
            return;
        }
        
        if (!iceFishingSystemRef.current) {
            return;
        }
        
        const playerPos = posRef.current;
        const playerCoins = userData?.coins || GameManager.getInstance().getCoins();
        const isMounted = !!(playerRef.current?.userData?.mount && playerRef.current?.userData?.mountData && mountEnabledRef.current);

        const interaction = iceFishingSystemRef.current.checkInteraction(
            playerPos.x,
            playerPos.z,
            playerCoins,
            isAuthenticated,
            gameInventory,
            {
                isMounted,
                fishingHoles,
            }
        );
        
        if (interaction) {
            const stockSig = getHoleStockSignature(interaction.holeStatus);
            const prevSig = getHoleStockSignature(fishingInteraction?.holeStatus);
            if (
                !fishingInteraction
                || fishingInteraction.spot?.id !== interaction.spot?.id
                || stockSig !== prevSig
                || fishingInteraction.prompt !== interaction.prompt
                || fishingInteraction.canFish !== interaction.canFish
            ) {
                setFishingInteraction(interaction);
            }
        } else if (fishingInteraction) {
            setFishingInteraction(null);
        }
    };

    const shouldShowStarterRod = () => {
        if (room !== 'snow_forts' || !isAuthenticated) return false;
        if (ownsAnyRod(gameInventory)) return false;
        return !userData?.fishingProgress?.starterRodClaimed;
    };

    const checkStarterRodPickup = () => {
        if (room !== 'snow_forts' || !starterRodPickupRef.current?.visible) {
            if (starterRodInteraction) setStarterRodInteraction(null);
            return;
        }
        const playerPos = posRef.current;
        const prox = starterRodPickupRef.current.checkProximity(playerPos.x, playerPos.z);
        if (prox) {
            if (!starterRodInteraction?.canPickup) setStarterRodInteraction(prox);
        } else if (starterRodInteraction) {
            setStarterRodInteraction(null);
        }
    };
    
    // Check for nearby arcade machines (town only) - Multiple Games
    const checkArcadeMachines = () => {
        if (room !== 'town') {
            if (arcadeInteraction) setArcadeInteraction(null);
            return;
        }
        
        const playerPos = posRef.current;
        const interactionRadius = 4;
        
        const arcadeMachines = ARCADE_MACHINES.map((machine) => ({
            x: machine.x,
            z: machine.z,
            game: machine.game,
            gameKey: machine.gameKey,
            icon: machine.icon,
        }));
        
        // Find the closest arcade machine in range
        let closestArcade = null;
        let closestDistance = interactionRadius;
        
        for (const arcade of arcadeMachines) {
            const dx = playerPos.x - arcade.x;
            const dz = playerPos.z - arcade.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestArcade = arcade;
            }
        }
        
        if (closestArcade) {
            if (!arcadeInteraction || arcadeInteraction.gameType !== closestArcade.game) {
                // Build translated prompt
                const gameName = t(closestArcade.gameKey);
                const prompt = `${closestArcade.icon} ${t('interact.pressE')} ${t('interact.toPlay')} ${gameName}`;
                setArcadeInteraction({
                    prompt,
                    gameType: closestArcade.game,
                    gameKey: closestArcade.gameKey,
                    icon: closestArcade.icon
                });
            }
        } else if (arcadeInteraction) {
            setArcadeInteraction(null);
        }
    };
    
    const applyForestStumpHover = (next) => {
        const prev = forestStumpHoverRef.current;
        if (!next && !prev) return;
        if (next?.treeId === prev?.treeId && next?.regrowAt === prev?.regrowAt) return;
        forestStumpHoverRef.current = next;
        setForestStumpHover(next);
    };

    const checkForestStumpProximity = () => {
        if (room !== 'forest_trails' || manualChopActiveRef.current || !forestTreeManagerRef.current) {
            applyForestStumpHover(null);
            return;
        }
        const playerPos = posRef.current;
        applyForestStumpHover(
            forestTreeManagerRef.current.resolveStumpHover(playerPos.x, playerPos.z)
        );
    };

    const checkWoodcuttingSpots = () => {
        if (room !== 'forest_trails') {
            if (woodcuttingInteraction) setWoodcuttingInteraction(null);
            applyForestStumpHover(null);
            return;
        }
        if (manualChopActiveRef.current) {
            applyForestStumpHover(null);
            return;
        }
        checkForestStumpProximity();
        if (!woodcuttingSystemRef.current || woodChopProgress) {
            return;
        }
        const playerPos = posRef.current;
        const isMounted = !!(playerRef.current?.userData?.mount && playerRef.current?.userData?.mountData && mountEnabledRef.current);
        const interaction = woodcuttingSystemRef.current.checkInteraction(
            playerPos.x,
            playerPos.z,
            gameInventory,
            isAuthenticated,
            isMounted
        );
        if (interaction) {
            if (!woodcuttingInteraction || woodcuttingInteraction.treeId !== interaction.treeId) {
                setWoodcuttingInteraction(interaction);
            }
        } else if (woodcuttingInteraction) {
            setWoodcuttingInteraction(null);
        }
    };

    const checkMushroomSpots = () => {
        if (room !== 'forest_trails' || mushroomHarvestProgress) {
            if (mushroomInteraction) setMushroomInteraction(null);
            return;
        }
        const playerPos = posRef.current;
        const stateMap = new Map((mushroomClusters || []).map(m => [m.id, m]));
        let closest = null;
        let closestDist = Infinity;
        for (const def of HARVESTABLE_MUSHROOMS) {
            const state = stateMap.get(def.id);
            if (state?.state === 'harvested') continue;
            const dx = playerPos.x - def.localX;
            const dz = playerPos.z - def.localZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < MUSHROOM_INTERACTION_RADIUS && dist < closestDist) {
                closestDist = dist;
                closest = {
                    mushroomId: def.id,
                    prompt: isMobile ? 'Tap to pick mushrooms' : 'Press E to pick mushrooms',
                    canHarvest: true
                };
            }
        }
        if (closest) {
            if (!mushroomInteraction || mushroomInteraction.mushroomId !== closest.mushroomId) {
                setMushroomInteraction(closest);
            }
        } else if (mushroomInteraction) {
            setMushroomInteraction(null);
        }
    };

    const checkLogForageSpots = () => {
        if (room !== 'forest_trails' || logForageLockRef.current) {
            if (logForageInteraction) setLogForageInteraction(null);
            return;
        }
        const playerPos = posRef.current;
        let closest = null;
        let closestDist = Infinity;
        for (const def of FORAGEABLE_LOGS) {
            const dx = playerPos.x - def.localX;
            const dz = playerPos.z - def.localZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < WORM_FORAGE_RADIUS && dist < closestDist) {
                closestDist = dist;
                closest = def;
            }
        }
        if (closest) {
            const cooldownEndsAt = wormForageCooldownsRef.current?.[closest.id] || 0;
            const remainingMs = cooldownEndsAt > Date.now() ? cooldownEndsAt - Date.now() : 0;
            const canForage = remainingMs === 0;
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            setLogForageInteraction((prev) => {
                if (
                    prev?.logId === closest.id
                    && prev?.canForage === canForage
                    && prev?.remainingSeconds === remainingSeconds
                ) {
                    return prev;
                }
                return {
                    logId: closest.id,
                    mossy: closest.mossy,
                    canForage,
                    remainingSeconds,
                    prompt: canForage
                        ? (isMobile ? 'Tap to search log for worms' : 'Press E to search log for worms')
                        : `Picked over — ready in ${formatScavengeCountdown(remainingSeconds)}`,
                };
            });
        } else if (logForageInteraction) {
            setLogForageInteraction(null);
        }
    };

    const checkWorldDropSpots = () => {
        if (!worldDropManagerRef.current || !isAuthenticated) {
            if (worldDropInteraction) setWorldDropInteraction(null);
            return;
        }
        const nearest = worldDropManagerRef.current.findNearest(posRef.current, WORLD_DROP_PICKUP_RADIUS);
        if (nearest) {
            const isGold = isGoldWorldDrop(nearest);
            const label = isGold
                ? `${nearest.quantity?.toLocaleString?.() ?? nearest.quantity} Gold`
                : (nearest.metadata?.name || nearest.metadata?.emoji || nearest.itemId);
            const qtyLabel = !isGold && nearest.quantity > 1 ? ` ×${nearest.quantity}` : '';
            const canPickup = isGold
                ? isAuthenticated
                : canFitItemInBackpack(
                    gameInventory,
                    nearest.itemId,
                    nearest.quantity,
                    nearest.maxStack,
                    nearest.metadata
                );
            const next = {
                dropId: nearest.id,
                itemLabel: `${label}${qtyLabel}`,
                isGold,
                prompt: canPickup
                    ? (isMobile
                        ? `Tap to pick up ${label}${qtyLabel}`
                        : `Press E to pick up ${label}${qtyLabel}`)
                    : (isGold ? 'Sign in to pick up gold' : 'Backpack full — make space first'),
                canPickup
            };
            setWorldDropInteraction(prev => {
                if (
                    prev?.dropId === next.dropId
                    && prev?.canPickup === next.canPickup
                    && prev?.prompt === next.prompt
                    && prev?.isGold === next.isGold
                ) {
                    return prev;
                }
                return next;
            });
        } else if (worldDropInteraction) {
            setWorldDropInteraction(null);
        }
    };

    const checkScavengeSpots = () => {
        if (room !== 'snow_forts' && room !== 'town') {
            if (scavengeInteraction) setScavengeInteraction(null);
            return;
        }

        const playerPos = posRef.current;
        const activeSpot = findActiveScavengeSpot(playerPos, room);

        if (activeSpot) {
            const cooldownEndsAt = scavengeCooldownsRef.current?.[activeSpot.id] || 0;
            const remainingMs = getScavengeRemainingMs(cooldownEndsAt);
            const canScavenge = remainingMs === 0;
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            setScavengeInteraction(prev => {
                if (
                    prev?.spotId === activeSpot.id
                    && prev?.canScavenge === canScavenge
                    && prev?.remainingSeconds === remainingSeconds
                ) {
                    return prev;
                }
                return {
                    spotId: activeSpot.id,
                    canScavenge,
                    remainingSeconds,
                    cooldownEndsAt: canScavenge ? null : cooldownEndsAt,
                };
            });
        } else if (scavengeInteraction) {
            setScavengeInteraction(null);
        }
    };
    
    // Check world merchant NPC proximity (town + snow forts)
    const checkWorldNpcs = () => {
        if ((room !== 'town' && room !== 'snow_forts' && room !== 'forest_trails') || !worldNpcManagerRef.current) {
            if (nearbyNpcInteraction) setNearbyNpcInteraction(null);
            nearbyNpcInteractionRef.current = null;
            return;
        }
        const nearby = worldNpcManagerRef.current.checkProximity(
            posRef.current,
            room,
            { gameInventory, coins: userData?.coins ?? 0 }
        );
        if (nearby) {
            if (!nearbyNpcInteraction || nearbyNpcInteraction.id !== nearby.id) {
                setNearbyNpcInteraction(nearby);
                nearbyNpcInteractionRef.current = nearby;
            }
        } else if (nearbyNpcInteraction) {
            setNearbyNpcInteraction(null);
            nearbyNpcInteractionRef.current = null;
        }
        if (cameraRef.current) {
            worldNpcManagerRef.current.updateMarkers(cameraRef.current);
        }
    };
    
    // Check for Lord Fishnu proximity (town only)
    const checkLordFishnu = () => {
        if (room !== 'town') {
            if (lordFishnuInteraction) setLordFishnuInteraction(null);
            return;
        }
        
        const playerPos = posRef.current;
        // Lord Fishnu position (from TownCenter.js: C - 52.5, C + 54.7)
        // TownCenter.CENTER = 110 (same as CENTER_X/CENTER_Z)
        const fishnuX = CENTER_X - 52.5;
        const fishnuZ = CENTER_Z + 54.7;
        
        const dx = playerPos.x - fishnuX;
        const dz = playerPos.z - fishnuZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        const INTERACTION_RADIUS = 6;
        
        if (dist < INTERACTION_RADIUS) {
            if (!lordFishnuInteraction) {
                setLordFishnuInteraction({
                    canPayRespects: true,
                    prompt: `🐟 ${t('interact.pressE')} ${t('interact.payRespects')}`
                });
            }
        } else if (lordFishnuInteraction) {
            setLordFishnuInteraction(null);
        }
    };
    
    useEffect(() => {
        const interval = setInterval(() => {
            checkTravelNpcs();
            checkPortals();
            checkIglooProximity();
            checkGoldLobbySlots();
            checkSlotMachines();
            checkBlackjackTables();
            checkFishingSpots();
            checkStarterRodPickup();
            checkWoodcuttingSpots();
            checkMushroomSpots();
            checkLogForageSpots();
            checkWorldDropSpots();
            checkScavengeSpots();
            checkWorldNpcs();
            checkLordFishnu();
            checkArcadeMachines();
        }, 200);
        return () => clearInterval(interval);
    }, [nearbyPortal, room, slotInteraction, goldSlotInteraction, goldSlotBet, blackjackInteraction, blackjackGameActive, fishingInteraction, fishingHoles, woodcuttingInteraction, woodChopProgress, mushroomInteraction, mushroomHarvestProgress, logForageInteraction, worldDropInteraction, scavengeInteraction, scavengeCooldowns, wormForageCooldowns, lordFishnuInteraction, arcadeInteraction, showPetShop, userData?.coins, userData?.fishingProgress?.starterRodClaimed, isAuthenticated, gameInventory, starterRodInteraction, mushroomClusters, worldDrops, nearbyNpcInteraction, nearbyTravelNpcInteraction, travelRouteStatuses, isMobile]);

    useEffect(() => {
        starterRodPickupRef.current?.setVisible(shouldShowStarterRod());
    }, [room, isAuthenticated, userData?.fishingProgress?.starterRodClaimed, gameInventory]);
    
    // Handle portal entry
    const handlePortalEnter = () => {
        if (!nearbyPortal) return;
        
        // Special action portals (no room transition)
        if (nearbyPortal.action === 'puffle_shop') {
            setShowPetShop(true);
            nearbyPortalRef.current = null;
            setNearbyPortal(null);
            return;
        }
        
        // Teleport to roof (ladder climb)
        if (nearbyPortal.teleportToRoof) {
            const centerX = CENTER_X;
            const centerZ = CENTER_Z;
            
            // Nightclub center is at (0, -75) offset, building depth is 20
            // Spawn near rear of roof: center - 25% of depth = -75 - 5 = -80
            const roofX = centerX;
            const roofZ = centerZ - 75 - 5; // Offset -25% to spawn near rear
            const roofY = 16; // Spawn above roof collision (roof at 13) to land on it
            
            posRef.current.x = roofX;
            posRef.current.z = roofZ;
            posRef.current.y = roofY;
            velRef.current.y = 0;
            
            if (playerRef.current) {
                playerRef.current.position.set(roofX, roofY, roofZ);
            }
            
            // Immediately save position so Y is preserved on refresh/reconnect
            try {
                localStorage.setItem('player_position', JSON.stringify({
                    x: roofX, y: roofY, z: roofZ, room: 'town', savedAt: Date.now()
                }));
                savePlayerSession('town', { x: roofX, y: roofY, z: roofZ });
            } catch (e) { /* ignore */ }
            
            nearbyPortalRef.current = null;
            setNearbyPortal(null);
            return;
        }
        
        // Room transition
        if (nearbyPortal.targetRoom && onChangeRoom) {
            // === IGLOO ENTRY REQUIREMENTS CHECK ===
            // Only check requirements when ENTERING an igloo, not when EXITING to town
            const isEnteringIgloo = nearbyPortal.targetRoom.startsWith('igloo');
            const isExitingToTown = nearbyPortal.targetRoom === 'town';
            
            // If entering an igloo (from town), check requirements
            if (isEnteringIgloo && !isExitingToTown && nearbyPortal.isIgloo && nearbyPortal.iglooData) {
                const iglooData = nearbyPortal.iglooData;
                const isOwner = walletAddress && iglooData.ownerWallet === walletAddress;
                
                // If not rented (available), show details panel instead
                if (!iglooData.isRented) {
                    console.log('🏠 Igloo not rented - showing details panel');
                    openDetailsPanel(nearbyPortal.targetRoom);
                    return;
                }
                
                // Owner always has direct entry
                if (isOwner) {
                    console.log('🏠 Owner entering igloo directly');
                    // Continue to room transition below
                } else {
                    const accessType = iglooData.accessType;
                    
                    // PUBLIC igloo - anyone can enter freely, no requirements check needed
                    if (accessType === 'public') {
                        console.log('🏠 Public igloo - entering directly');
                        // Continue to room transition below
                    }
                    // PRIVATE igloo - only owner can enter, show requirements panel for others
                    else if (accessType === 'private') {
                        console.log('🔒 Private igloo - showing requirements panel');
                        openRequirementsPanel(nearbyPortal.targetRoom);
                        return;
                    }
                    // TOKEN, FEE, or BOTH - check requirements
                    else if (accessType === 'token' || accessType === 'fee' || accessType === 'both') {
                        // Check if user is already cleared (from previous check or payment)
                        const clearance = userClearance?.[nearbyPortal.targetRoom];
                        if (clearance?.canEnter) {
                            console.log('✅ User already cleared - entering directly');
                            // Continue to room transition below
                        } else {
                            // Ask server if user can enter (server checks real balances + paid status)
                            // If allowed: enters directly | If blocked: shows requirements panel
                            console.log('🔍 Checking entry requirements with server...');
                            checkIglooEntry(nearbyPortal.targetRoom, (iglooId) => {
                                // This callback is called if user CAN enter directly
                                console.log('✅ Server approved entry - entering:', iglooId);
                                
                                if (room === 'town' && iglooId.startsWith('igloo')) {
                                    iglooEntrySpawnRef.current = nearbyPortal.exitSpawnPos;
                                }
                                
                                nearbyPortalRef.current = null;
                                setNearbyPortal(null);
                                onChangeRoom(iglooId, null);
                            });
                            return; // Wait for server response
                        }
                    }
                    // Default (unknown access type) - allow entry
                    else {
                        console.log('🏠 Default access - entering directly');
                    }
                }
            }
            
            let spawnPos = null;
            const overworldRooms = ['town', 'snow_forts', 'forest_trails'];

            // If entering an igloo from town, store where to return on exit
            if (room === 'town' && nearbyPortal.targetRoom.startsWith('igloo')) {
                iglooEntrySpawnRef.current = nearbyPortal.exitSpawnPos;
            }

            // If exiting an igloo back to town, use the stored entry position
            if (room.startsWith('igloo') && nearbyPortal.targetRoom === 'town') {
                spawnPos = iglooEntrySpawnRef.current ?? nearbyPortal.exitSpawnPos;
                iglooEntrySpawnRef.current = null;
            } else if (overworldRooms.includes(nearbyPortal.targetRoom) && nearbyPortal.exitSpawnPos) {
                // Leaving an interior room → land at portal exit in the overworld
                spawnPos = nearbyPortal.exitSpawnPos;
            }
            // Entering interior rooms: spawnPos stays null so room default spawn applies

            nearbyPortalRef.current = null;
            setNearbyPortal(null);
            onChangeRoom(nearbyPortal.targetRoom, spawnPos);
            return;
        }
        
        // Start minigame
        if (nearbyPortal.minigame && onStartMinigame) {
            nearbyPortalRef.current = null;
            setNearbyPortal(null);
            onStartMinigame(nearbyPortal.minigame);
            return;
        }
    };
    
    // Handle E key for portal entry
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.code === 'KeyE' && nearbyPortal && !emoteWheelOpen) {
                if (nearbyPortal.targetRoom || nearbyPortal.minigame || nearbyPortal.teleportToRoof || nearbyPortal.action) {
                    handlePortalEnter();
                }
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [nearbyPortal, emoteWheelOpen]);
    
    // Handle E key for slot machine spin - use ref to avoid stale closure
    const slotInteractionRef = useRef(slotInteraction);
    useEffect(() => {
        slotInteractionRef.current = slotInteraction;
    }, [slotInteraction]);

    const goldSlotInteractionRef = useRef(goldSlotInteraction);
    useEffect(() => {
        goldSlotInteractionRef.current = goldSlotInteraction;
    }, [goldSlotInteraction]);
    
    // Blackjack interaction ref for E key handler
    const blackjackInteractionRef = useRef(null);
    useEffect(() => {
        blackjackInteractionRef.current = blackjackInteraction;
    }, [blackjackInteraction]);
    
    // Fishing interaction ref for E key handler
    const fishingInteractionRef = useRef(null);
    useEffect(() => {
        fishingInteractionRef.current = fishingInteraction;
    }, [fishingInteraction]);
    
    // Lord Fishnu interaction ref for E key handler
    const lordFishnuInteractionRef = useRef(null);
    useEffect(() => {
        lordFishnuInteractionRef.current = lordFishnuInteraction;
    }, [lordFishnuInteraction]);
    
    // Holy messages for Lord Fishnu
    const LORD_FISHNU_MESSAGES = [
        "🐟 Praise be to Lord Fishnu!",
        "🙏 Pls pump my bags, Lord Fishnu",
        "🦈 Please keep the sharks away!",
        "💎 Lord Fishnu, grant me diamond fins",
        "🎣 May your catches be plentiful",
        "🌊 Protect me from the deep, O Holy One",
        "✨ Fishnu is love, Fishnu is life",
        "🐠 Swim with me through these troubled waters",
        "💰 Bless my wallet, mighty Fishnu",
        "🔱 All hail the Aquatic One!",
        "🐡 May I never get rugged, Lord Fishnu",
        "🌟 In Fishnu we trust",
        "🎰 Let the slots be ever in my favor",
        "🐋 The whale smiles upon me today",
        "🏊 Guide my trades, O Scaly Savior",
        "💫 Fishnu sees all, knows all",
        "🌈 From the depths, prosperity rises",
        "🐚 Grant me pearls of wisdom",
    ];
    
    // Ref-based lock to prevent E spam (React state updates too slowly)
    const spinLockRef = useRef(false);
    const goldSpinLockRef = useRef(false);
    const fishingLockRef = useRef(false);
    
    const handleSlotSpin = useCallback(async () => {
        if (spinLockRef.current) return;
        
        const currentSlotInteraction = slotInteractionRef.current;
        if (!currentSlotInteraction?.canSpin || !currentSlotInteraction?.machine) return;
        
        const machineId = currentSlotInteraction.machine.id;
        const isDemo = currentSlotInteraction.isDemo;
        
        spinLockRef.current = true;
        playSfx('slot_spin');
        
        // Show spinning animation IMMEDIATELY (don't wait for server)
        if (slotMachineSystemRef.current) {
            if (!slotMachineSystemRef.current.scene && sceneRef.current) {
                slotMachineSystemRef.current.scene = sceneRef.current;
            }
            slotMachineSystemRef.current.startSpin(machineId, playerName, isDemo);
        }
        
        // Send spin request to server
        spinSlot(machineId).then(result => {
            if (result.error && slotMachineSystemRef.current) {
                slotMachineSystemRef.current.handleSpinError(machineId);
            }
        }).finally(() => {
            setTimeout(() => { spinLockRef.current = false; }, 500);
        });
    }, [spinSlot, playerId, playerName]);

    const handleGoldSlotSpin = useCallback(async () => {
        if (goldSpinLockRef.current) return;

        const current = goldSlotInteractionRef.current;
        if (!current?.canSpin || !current?.machine) return;

        const machineId = current.machine.id;
        goldSpinLockRef.current = true;
        playSfx('slot_spin');

        setGoldSlotInteraction({
            ...current,
            canSpin: false,
            isSpinning: true,
            prompt: 'Spinning...',
            reason: 'MACHINE_IN_USE'
        });

        if (goldLobbySlotSystemRef.current) {
            goldLobbySlotSystemRef.current.startLocalSpin(machineId);
        }

        spinGoldSlot(machineId, current.bet ?? goldSlotBet).then(result => {
            if (result.error) {
                setGoldSlotInteraction(current);
                if (goldLobbySlotSystemRef.current) {
                    goldLobbySlotSystemRef.current.handleSpinError(machineId);
                }
            }
        }).finally(() => {
            setTimeout(() => { goldSpinLockRef.current = false; }, 500);
        });
    }, [spinGoldSlot, goldSlotBet]);
    
    useEffect(() => {
        const handleSlotKeyPress = (e) => {
            if (e.code === 'KeyE') {
                if (goldSlotInteractionRef.current?.canSpin && room === 'snow_forts'
                    && !nearbyPortal && !emoteWheelOpen && !goldSlotSpinning && !goldSpinLockRef.current) {
                    handleGoldSlotSpin();
                    return;
                }
                if (slotInteractionRef.current?.canSpin && !nearbyPortal && !emoteWheelOpen && !slotSpinning && !spinLockRef.current) {
                    handleSlotSpin();
                }
            }
        };
        window.addEventListener('keydown', handleSlotKeyPress);
        return () => window.removeEventListener('keydown', handleSlotKeyPress);
    }, [nearbyPortal, emoteWheelOpen, slotSpinning, goldSlotSpinning, handleSlotSpin, handleGoldSlotSpin, room]);

    // Blackjack lock ref to prevent E spam
    const blackjackLockRef = useRef(false);
    
    // Handle blackjack start action - opens the blackjack UI overlay
    const handleBlackjackStart = useCallback(() => {
        if (blackjackLockRef.current || blackjackGameActive) return;
        
        const currentBJInteraction = blackjackInteractionRef.current;
        if (!currentBJInteraction?.canPlay || !currentBJInteraction?.tableId) return;
        
        blackjackLockRef.current = true;
        
        // Open the blackjack game overlay
        setBlackjackTableId(currentBJInteraction.tableId);
        setBlackjackGameActive(true);
        
        // Send sit message to server (done in CasinoBlackjack component)
        
        setTimeout(() => { blackjackLockRef.current = false; }, 300);
    }, [blackjackGameActive]);
    
    // Blackjack is click-only (no E key) to avoid conflict with sit interaction
    
    // Handle blackjack game leave
    const handleBlackjackLeave = useCallback(() => {
        setBlackjackGameActive(false);
        setBlackjackTableId(null);
    }, []);
    
    // Handle fishing action - opens the fishing minigame overlay
    const handleFishingAction = useCallback(async () => {
        if (fishingLockRef.current || fishingGameActive) return;
        
        const currentFishingInteraction = fishingInteractionRef.current;
        if (!currentFishingInteraction?.canFish || !currentFishingInteraction?.spot) return;
        
        const spotId = currentFishingInteraction.spot.id;
        const isDemo = currentFishingInteraction.isDemo;
        
        fishingLockRef.current = true;
        
        // Start fishing on server (deduct bait cost)
        const result = await startFishing(spotId);
        if (result.error) {
            fishingLockRef.current = false;
            return;
        }
        
        // Open the fishing minigame overlay
        setFishingGameSpot({ 
            id: spotId, 
            isDemo,
            holeStatus: result.holeStatus || currentFishingInteraction.holeStatus || getHoleStatusById(fishingHoles, spotId),
            ...currentFishingInteraction.spot 
        });
        setFishingGameActive(true);
        
        // Mark local player as fishing (for interaction prompt)
        if (iceFishingSystemRef.current) {
            iceFishingSystemRef.current.startLocalFishing(spotId);
        }
        
        setTimeout(() => { fishingLockRef.current = false; }, 300);
    }, [startFishing, playerName, fishingGameActive, fishingHoles]);
    
    // Track depth for fishing game result
    const fishingDepthRef = useRef(0);
    
    // Handle fishing game catch result
    const handleFishingCatch = useCallback((fish, _bonusCoins, catchDepth = 0) => {
        if (!fishingGameSpot) return;
        attemptCatch(fishingGameSpot.id, fish, catchDepth || 0);
    }, [fishingGameSpot, attemptCatch]);
    
    // Handle fishing game miss (hit bottom)
    const handleFishingMiss = useCallback((reason) => {
        if (!fishingGameSpot) return;
        
        // Notify server of miss (no catch bubble shown for misses)
        cancelFishing?.(fishingGameSpot.id, fishingDepthRef.current);
    }, [fishingGameSpot, cancelFishing]);
    
    // Handle fishing game close
    const handleFishingGameClose = useCallback(() => {
        setFishingGameActive(false);
        setFishingGameSpot(null);
        clearFishingResult?.();
        
        // Clear local fishing state so player can fish again immediately
        if (iceFishingSystemRef.current) {
            iceFishingSystemRef.current.stopLocalFishing();
        }
        
        // Notify server that fishing ended (for PvE spectator banners)
        mpSend?.({ type: 'fishing_end' });
    }, [mpSend, clearFishingResult]);

    const woodcuttingLockRef = useRef(false);
    const woodcuttingInteractionRef = useRef(null);
    const woodChopStartPosRef = useRef(null);
    useEffect(() => {
        woodcuttingInteractionRef.current = woodcuttingInteraction;
    }, [woodcuttingInteraction]);

    const handleWoodChopAction = useCallback(async () => {
        if (woodcuttingLockRef.current || woodChopProgress || manualChopActiveRef.current) return;
        const interaction = woodcuttingInteractionRef.current;
        if (!interaction?.canChop || !(interaction.treeId || interaction.spotId)) return;

        const treeId = interaction.treeId || interaction.spotId;
        const chopPosition = { x: posRef.current.x, y: posRef.current.y, z: posRef.current.z };
        if (interaction.chopMode === 'manual') {
            woodcuttingLockRef.current = true;
            woodcuttingSystemRef.current?.setLocalManualChopping(treeId);
            const result = await startManualChop?.(treeId, chopPosition);
            if (result?.error) {
                woodcuttingSystemRef.current?.clearLocalChopping();
                woodcuttingLockRef.current = false;
                if (result.message) setActiveBubble(result.message);
                return;
            }
            const entry = forestTreeManagerRef.current?.getTreeEntry(treeId);
            if (!entry?.instance || !sceneRef.current || !window.THREE) {
                cancelManualChop?.('SETUP_FAILED');
                woodcuttingSystemRef.current?.clearLocalChopping();
                woodcuttingLockRef.current = false;
                setActiveBubble('Could not start manual chop');
                return;
            }
            const treeWorldPos = {
                x: entry.mesh.position.x,
                z: entry.mesh.position.z
            };
            const standDistance = getManualChopStandDistance(entry.def.stage);
            const snapped = snapPlayerToChopRing(
                treeWorldPos.x,
                treeWorldPos.z,
                posRef.current.x,
                posRef.current.z,
                standDistance
            );
            posRef.current.x = snapped.x;
            posRef.current.z = snapped.z;
            rotRef.current = snapped.rotationY;
            if (playerRef.current) {
                playerRef.current.position.set(snapped.x, posRef.current.y, snapped.z);
                playerRef.current.rotation.y = snapped.rotationY;
            }
            const playerWorldPos = { x: snapped.x, y: posRef.current.y, z: snapped.z };
            if (!manualChopControllerRef.current) {
                manualChopControllerRef.current = new ManualChopController();
            }
            manualChopControllerRef.current.enter({
                scene: sceneRef.current,
                camera: cameraRef.current,
                renderer: rendererRef.current,
                THREE: window.THREE,
                treeEntry: entry,
                treeWorldPos,
                playerWorldPos,
                sessionId: result.sessionId,
                controls: controlsRef.current,
                playerMesh: playerRef.current,
                getPlayerViewState: () => {
                    let mountYOffset = 0;
                    if (mountEnabledRef.current && playerRef.current?.userData?.mountData) {
                        const mountData = playerRef.current.userData.mountData;
                        mountYOffset = (mountData.positionY || 0) + (playerRef.current.userData.mountBounceY || 0);
                    }
                    return {
                        x: posRef.current.x,
                        y: posRef.current.y,
                        z: posRef.current.z,
                        mountYOffset
                    };
                },
                onHit: (hit) => sendManualChopHit?.(hit),
                onFallComplete: () => {
                    completeManualChop?.();
                },
                onCancel: () => cancelManualChop?.('CANCELLED')
            });
            manualChopActiveRef.current = true;
            setManualChopActive(true);
            setWoodcuttingInteraction(null);
            woodcuttingLockRef.current = false;
            return;
        }

        woodcuttingLockRef.current = true;
        woodcuttingSystemRef.current?.setLocalChopping(treeId);

        const result = await startWoodChop?.(treeId, chopPosition);
        if (result?.error) {
            woodcuttingSystemRef.current?.clearLocalChopping();
            woodcuttingLockRef.current = false;
            if (result.message) setActiveBubble(result.message);
            return;
        }

        const durationMs = result.durationMs || 2500;
        const startedAt = Date.now();
        woodChopStartPosRef.current = { x: posRef.current.x, z: posRef.current.z };
        setWoodChopProgress({ treeId, progress: 0 });

        const tick = () => {
            const startPos = woodChopStartPosRef.current;
            if (startPos) {
                const moved = Math.hypot(posRef.current.x - startPos.x, posRef.current.z - startPos.z) > 2.5;
                if (moved) {
                    cancelWoodChop?.('MOVED');
                    setWoodChopProgress(null);
                    woodcuttingSystemRef.current?.clearLocalChopping();
                    woodcuttingLockRef.current = false;
                    woodChopStartPosRef.current = null;
                    setActiveBubble('Chopping cancelled — stay near the tree');
                    return;
                }
            }
            const elapsed = Date.now() - startedAt;
            const progress = Math.min(1, elapsed / durationMs);
            if (elapsed - woodChopLastSfxRef.current > 550) {
                woodChopLastSfxRef.current = elapsed;
                playSfx('wood_chop_tick');
                mpSend?.({ type: 'player_sfx', sfx: 'wood_chop_tick' });
            }
            setWoodChopProgress({ treeId, progress });
            if (progress < 1) {
                woodChopTimerRef.current = requestAnimationFrame(tick);
            } else {
                setWoodChopProgress({ treeId, progress: 1, finishing: true });
                setWoodcuttingInteraction(null);
                completeWoodChop?.(true);
            }
        };
        woodChopTimerRef.current = requestAnimationFrame(tick);
    }, [startWoodChop, completeWoodChop, cancelWoodChop, startManualChop, sendManualChopHit, completeManualChop, cancelManualChop, woodChopProgress, mpSend]);

    const exitManualChop = useCallback((reason = 'CANCELLED') => {
        const restoreDistance = manualChopControllerRef.current?.getSavedCameraDistance?.();
        if (manualChopControllerRef.current) {
            manualChopControllerRef.current.exit();
        }
        manualChopActiveRef.current = false;
        setManualChopActive(false);
        woodcuttingSystemRef.current?.clearLocalChopping();
        woodcuttingLockRef.current = false;
        if (restoreDistance != null && controlsRef.current && cameraRef.current) {
            const playerY = posRef.current.y + 1.2;
            controlsRef.current.target.set(posRef.current.x, playerY, posRef.current.z);
            casinoZoomTransitionRef.current = {
                active: true,
                targetDistance: restoreDistance,
                progress: 0
            };
        }
        if (reason !== 'COMPLETE') {
            cancelManualChop?.(reason);
        }
    }, [cancelManualChop]);

    useEffect(() => () => {
        if (woodChopTimerRef.current) cancelAnimationFrame(woodChopTimerRef.current);
    }, []);

    useEffect(() => {
        if (!manualChopActive) return undefined;
        const canvas = rendererRef.current?.domElement;
        if (!canvas) return undefined;

        const onDown = (e) => {
            e.preventDefault();
            manualChopControllerRef.current?.onPointerDown(e.clientX, e.clientY);
        };
        const onUp = () => manualChopControllerRef.current?.onPointerUp();
        const onMove = (e) => manualChopControllerRef.current?.onPointerMove(e.clientX, e.clientY);
        const onTouchStart = (e) => {
            if (!e.touches[0]) return;
            e.preventDefault();
            manualChopControllerRef.current?.onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
        };
        const onTouchEnd = () => manualChopControllerRef.current?.onPointerUp();
        const onTouchMove = (e) => {
            if (!e.touches[0]) return;
            e.preventDefault();
            manualChopControllerRef.current?.onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        };
        const onKey = (e) => {
            if (e.code === 'Escape') exitManualChop('ESC');
        };

        canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('mousemove', onMove);
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('keydown', onKey);

        return () => {
            canvas.removeEventListener('mousedown', onDown);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('keydown', onKey);
        };
    }, [manualChopActive, exitManualChop]);

    const handleMushroomHarvest = useCallback(async () => {
        if (mushroomLockRef.current || mushroomHarvestProgress) return;
        const interaction = mushroomInteraction;
        if (!interaction?.canHarvest || !interaction.mushroomId) return;
        mushroomLockRef.current = true;
        const mushroomId = interaction.mushroomId;
        const startedAt = Date.now();
        setMushroomHarvestProgress({ mushroomId, progress: 0 });
        setMushroomInteraction(null);

        const tick = () => {
            const elapsed = Date.now() - startedAt;
            const progress = Math.min(1, elapsed / MUSHROOM_HARVEST_MS);
            setMushroomHarvestProgress({ mushroomId, progress });
            if (progress < 1) {
                mushroomHarvestTimerRef.current = requestAnimationFrame(tick);
            } else {
                setMushroomHarvestProgress({ mushroomId, progress: 1, finishing: true });
                (async () => {
                    const result = await harvestMushroom?.(mushroomId);
                    if (result?.success) playSfx('mushroom_pick');
                    mushroomLockRef.current = false;
                    setMushroomHarvestProgress(null);
                    if (result?.error) {
                        setActiveBubble(result.message || 'Could not pick mushrooms');
                        return;
                    }
                    setActiveBubble('🍄 Forest mushroom added to backpack');
                })();
            }
        };
        mushroomHarvestTimerRef.current = requestAnimationFrame(tick);
    }, [mushroomInteraction, mushroomHarvestProgress, harvestMushroom]);

    const handleLogForageAction = useCallback(async () => {
        if (logForageLockRef.current) return;
        const interaction = logForageInteraction;
        if (!interaction?.canForage || !interaction.logId) return;
        logForageLockRef.current = true;
        const logId = interaction.logId;
        const startedAt = Date.now();
        setLogForageInteraction((prev) => prev ? { ...prev, searching: true, progress: 0 } : prev);

        const tick = () => {
            const elapsed = Date.now() - startedAt;
            const progress = Math.min(1, elapsed / WORM_FORAGE_CHANNEL_MS);
            setLogForageInteraction((prev) => prev ? { ...prev, searching: true, progress } : prev);
            if (progress < 1) {
                logForageTimerRef.current = requestAnimationFrame(tick);
            } else {
                (async () => {
                    const result = await forageLogWorms?.(logId);
                    logForageLockRef.current = false;
                    setLogForageInteraction(null);
                    if (result?.error) {
                        setActiveBubble(result.message || 'Could not search log');
                        return;
                    }
                    if (result?.quantity > 0) {
                        playSfx('ui_confirm');
                        setActiveBubble(result.message || `🪱 Found ${result.quantity} worms`);
                    } else {
                        setActiveBubble(result.message || 'No worms under this log');
                    }
                })();
            }
        };
        logForageTimerRef.current = requestAnimationFrame(tick);
    }, [logForageInteraction, forageLogWorms]);

    const handleWorldDropPickup = useCallback(async () => {
        if (worldDropLockRef.current) return;
        const interaction = worldDropInteraction;
        if (!interaction?.canPickup || !interaction.dropId) return;
        worldDropLockRef.current = true;
        const result = await pickupWorldDrop?.(interaction.dropId);
        if (result?.success) {
            playSfx(isGoldWorldDrop(interaction.itemId) ? 'gold_pickup' : 'ui_confirm');
        }
        worldDropLockRef.current = false;
        if (result?.error) {
            setActiveBubble(result.message || 'Could not pick up item');
            return;
        }
        setActiveBubble(result?.isGold || interaction.isGold
            ? `💰 Picked up ${interaction.itemLabel || 'gold'}`
            : `📦 Picked up ${interaction.itemLabel || 'item'}`);
        setWorldDropInteraction(null);
    }, [worldDropInteraction, pickupWorldDrop]);

    const handleScavengeAction = useCallback(async () => {
        if (scavengeLockRef.current) return;
        const interaction = scavengeInteraction;
        if (!interaction?.spotId || !interaction.canScavenge) return;
        scavengeLockRef.current = true;
        const result = await scavengeSpot?.(interaction.spotId);
        scavengeLockRef.current = false;
        if (result?.error) {
            if (result.displayRemainingSeconds) {
                const countdown = formatScavengeCountdown(result.displayRemainingSeconds);
                setActiveBubble(result.message || `Try again in ${countdown}`);
            } else {
                setActiveBubble(result.message || 'Nothing useful in there');
            }
            return;
        }
        setActiveBubble(result.message || `Found ${result.goldEarned} gold!`);
    }, [scavengeInteraction, scavengeSpot]);

    const openNpcDialogue = useCallback((npcNearby) => {
        if (!npcNearby?.def) return;
        setActiveNpcDef(npcNearby.def);
        fetchGameInventory?.();
    }, [fetchGameInventory]);

    const openTravelDialogue = useCallback((npcNearby) => {
        if (!npcNearby?.def) return;
        setActiveTravelNpcDef(npcNearby.def);
        fetchTravelState?.();
    }, [fetchTravelState]);

    const handleTravelBook = useCallback(async (routeId, payForPlayerIds = []) => {
        const result = await bookTravel?.(routeId, payForPlayerIds);
        if (result?.error) {
            window.dispatchEvent(new CustomEvent('townInteraction', {
                detail: { action: 'travel_error', message: result.message || 'Could not buy ticket.' }
            }));
            return result;
        }
        playSfx('travel_book');
        return result;
    }, [bookTravel]);

    const handleTravelLeave = useCallback(async () => {
        const result = await leaveTravel?.();
        if (result?.error) {
            window.dispatchEvent(new CustomEvent('townInteraction', {
                detail: { action: 'travel_error', message: result.message || 'Could not leave queue.' }
            }));
            return result;
        }
        if (result?.cancelled) setActiveTravelNpcDef(null);
        return result;
    }, [leaveTravel]);

    useEffect(() => {
        const onTravelTransfer = (e) => {
            const { room: targetRoom, position } = e.detail || {};
            if (!targetRoom || !onChangeRoom) return;
            mobileControlsRef.current = { forward: false, back: false, left: false, right: false };
            joystickInputRef.current = { x: 0, y: 0 };
            jumpRequestedRef.current = false;
            playSfx('travel_depart');
            setActiveTravelNpcDef(null);
            setNearbyTravelNpcInteraction(null);
            onChangeRoom(targetRoom, position);
            setTimeout(() => playSfx('travel_arrive'), 1200);
        };
        window.addEventListener('travelTransfer', onTravelTransfer);
        return () => window.removeEventListener('travelTransfer', onTravelTransfer);
    }, [onChangeRoom]);

    const handleNpcDialogueAction = useCallback(async (actionId, npcDef, meta = null) => {
        if (actionId === 'merchant_recipe' && npcDef?.merchantId && meta?.itemId) {
            const r = await buyFromMerchant?.(npcDef.merchantId, meta.itemId);
            if (r && !r.error) {
                playSfx(r.goldMinted ? 'coins' : 'merchant_buy');
                fetchGameInventory?.();
            }
            return r;
        }
        if (actionId === 'upgrade_backpack') {
            return upgradeBackpack?.('supply_merchant');
        }
        if (actionId === 'upgrade_rod') {
            return upgradeRod?.('fish_buyer');
        }
        if (actionId === 'buy_basic_axe') {
            const merchantId = npcDef?.merchantId || 'supply_merchant';
            const r = await buyFromMerchant?.(merchantId, 'basic_axe');
            if (r && !r.error) playSfx('merchant_buy');
            return r;
        }
        if (actionId === 'buy_iron_axe') {
            const r = await buyFromMerchant?.('supply_merchant', 'iron_axe');
            if (r && !r.error) playSfx('merchant_buy');
            return r;
        }
        if (actionId === 'buy_steel_axe') {
            const r = await buyFromMerchant?.('supply_merchant', 'steel_axe');
            if (r && !r.error) playSfx('merchant_buy');
            return r;
        }
        if (actionId === 'buy_master_axe') {
            const r = await buyFromMerchant?.('supply_merchant', 'master_axe');
            if (r && !r.error) playSfx('merchant_buy');
            return r;
        }
        if (actionId === 'open_backpack') {
            fetchGameInventory?.();
            setNpcBackpackSellMerchant(
                npcDef?.merchantId === 'fish_buyer' ? 'fish_buyer'
                    : npcDef?.merchantId === 'supply_merchant' ? 'supply_merchant'
                        : npcDef?.merchantId === 'forest_ranger' ? 'forest_ranger'
                            : null
            );
            setShowNpcBackpack(true);
            return { success: true };
        }
        if (actionId === 'quest_mushroom_ticket') {
            const result = await turnInMushroomQuest?.();
            if (result?.error) {
                return { error: result.error, message: result.message };
            }
            fetchGameInventory?.();
            return { success: true, message: result.message || 'Earned a ferry ticket to Town!' };
        }
        if (actionId === 'quest_accept' && meta?.questId) {
            const result = await acceptNpcQuest?.(meta.questId);
            if (result?.error) {
                return { error: result.error, message: result.message };
            }
            playSfx('quest_step');
            fetchDailyQuestStatus?.();
            return { success: true, message: result.message || 'Contract accepted!' };
        }
        if (actionId === 'quest_salty_daily') {
            const result = await turnInNpcQuest?.('salty_daily_catch');
            if (result?.error) {
                return { error: result.error, message: result.message };
            }
            playSfx('quest_complete');
            fetchGameInventory?.();
            fetchDailyQuestStatus?.();
            return { success: true, message: result.message || 'Catch order complete!' };
        }
        if (actionId === 'quest_clive_daily') {
            const result = await turnInNpcQuest?.('clive_daily_timber');
            if (result?.error) {
                return { error: result.error, message: result.message };
            }
            playSfx('quest_complete');
            fetchGameInventory?.();
            fetchDailyQuestStatus?.();
            return { success: true, message: result.message || 'Timber order complete!' };
        }
        return null;
    }, [upgradeBackpack, upgradeRod, buyFromMerchant, fetchGameInventory, turnInMushroomQuest, turnInNpcQuest, acceptNpcQuest, fetchDailyQuestStatus]);
    
    // Handle arcade game close (PvE Battleship)
    const handleArcadeGameClose = useCallback(() => {
        setArcadeGameActive(false);
        setArcadeGameType(null);
    }, []);
    
    const handleStarterRodClaim = useCallback(async () => {
        if (starterRodLockRef.current || !isAuthenticated) return;
        const interaction = starterRodInteraction;
        if (!interaction?.canPickup) return;
        starterRodLockRef.current = true;

        const result = await claimStarterRod?.();
        starterRodLockRef.current = false;
        if (result?.error) {
            setActiveBubble(result.message || 'Could not pick up rod');
            return;
        }
        setActiveBubble('🎣 Picked up Basic Rod — equip it on your hotbar!');
        starterRodPickupRef.current?.setVisible(false);
        setStarterRodInteraction(null);
        fetchGameInventory?.();
    }, [starterRodInteraction, isAuthenticated, claimStarterRod, fetchGameInventory]);

    // E key handler for fishing (town) and woodcutting (forest)
    useEffect(() => {
        const handleFishingKeyPress = (e) => {
            if (e.code !== 'KeyE' || emoteWheelOpen) return;
            if (room === 'town' || room === 'snow_forts') {
                if (room === 'snow_forts' && starterRodInteraction?.canPickup && !nearbyPortal) {
                    handleStarterRodClaim();
                    return;
                }
                const fi = fishingInteractionRef.current;
                if (fi?.canFish && !nearbyPortal && !fishingLockRef.current && !fishingGameActive) {
                    handleFishingAction();
                    return;
                }
            }
            if (room === 'forest_trails') {
                const wc = woodcuttingInteractionRef.current;
                if (wc?.canChop && !nearbyPortal && !emoteWheelOpen && !woodcuttingLockRef.current && !woodChopProgress && !manualChopActiveRef.current) {
                    handleWoodChopAction();
                    return;
                }
                if (mushroomInteraction?.canHarvest && !nearbyPortal && !emoteWheelOpen && !mushroomLockRef.current && !mushroomHarvestProgress) {
                    handleMushroomHarvest();
                    return;
                }
                if (logForageInteraction?.canForage && !nearbyPortal && !emoteWheelOpen && !logForageLockRef.current) {
                    handleLogForageAction();
                    return;
                }
            }
            if ((room === 'snow_forts' || room === 'town') && scavengeInteraction?.canScavenge && !nearbyPortal && !emoteWheelOpen && !scavengeLockRef.current) {
                handleScavengeAction();
                return;
            }
            if (worldDropInteraction?.canPickup && !nearbyPortal && !emoteWheelOpen && !worldDropLockRef.current) {
                handleWorldDropPickup();
            }
        };
        window.addEventListener('keydown', handleFishingKeyPress);
        return () => window.removeEventListener('keydown', handleFishingKeyPress);
    }, [nearbyPortal, emoteWheelOpen, room, handleFishingAction, handleWoodChopAction, handleMushroomHarvest, handleLogForageAction, handleScavengeAction, handleWorldDropPickup, handleStarterRodClaim, woodChopProgress, mushroomInteraction, mushroomHarvestProgress, logForageInteraction, worldDropInteraction, scavengeInteraction, starterRodInteraction, fishingGameActive]);
    
    // E key handler for arcade machines (Battleship PvE)
    useEffect(() => {
        const handleArcadeKeyPress = (e) => {
            if (e.code === 'KeyE' && room === 'town') {
                if (arcadeInteraction && !nearbyPortal && !emoteWheelOpen && !arcadeGameActive) {
                    setArcadeGameType(arcadeInteraction.gameType || 'battleship');
                    setArcadeGameActive(true);
                    setArcadeInteraction(null);
                }
            }
        };
        window.addEventListener('keydown', handleArcadeKeyPress);
        return () => window.removeEventListener('keydown', handleArcadeKeyPress);
    }, [nearbyPortal, emoteWheelOpen, room, arcadeInteraction, arcadeGameActive]);
    
    // Handle paying respects to Lord Fishnu (works like AFK - dismisses on movement)
    const handlePayRespects = useCallback(() => {
        if (lordFishnuCooldownRef.current) return;
        
        const lfInteraction = lordFishnuInteractionRef.current;
        if (!lfInteraction?.canPayRespects) return;
        
        // Set cooldown to prevent spam
        lordFishnuCooldownRef.current = true;
        setTimeout(() => {
            lordFishnuCooldownRef.current = false;
        }, 3000); // 3 second cooldown
        
        // Pick random holy message
        const message = LORD_FISHNU_MESSAGES[Math.floor(Math.random() * LORD_FISHNU_MESSAGES.length)];
        
        // Set Fishnu respect state (like AFK - stays until movement)
        isFishnuRespectRef.current = true;
        fishnuRespectMessageRef.current = message;
        
        // Show chat bubble above player (stays until movement, like AFK)
        setActiveBubble(message);
        
        // Send to other players so they can see it (like AFK bubble)
        mpSendEmoteBubble(message);
    }, [mpSendEmoteBubble]);
    
    // E key handler for world NPCs + Lord Fishnu
    useEffect(() => {
        const handleNpcKeyPress = (e) => {
            if (e.code !== 'KeyE' || emoteWheelOpen) return;

            const travelNpc = nearbyTravelNpcInteractionRef.current;
            if (travelNpc && ['town', 'snow_forts', 'forest_trails'].includes(room)
                && !nearbyPortal && !fishingInteraction && !woodcuttingInteraction
                && !blackjackGameActive && !fishingGameActive && !activeTravelNpcDef) {
                openTravelDialogue(travelNpc);
                return;
            }

            if (room !== 'town') {
                const npcOther = nearbyNpcInteractionRef.current;
                if (npcOther && !nearbyPortal && !fishingInteraction && !woodcuttingInteraction && !blackjackGameActive && !fishingGameActive) {
                    openNpcDialogue(npcOther);
                }
                return;
            }

            const npc = nearbyNpcInteractionRef.current;
            if (npc && !nearbyPortal && !fishingInteraction && !woodcuttingInteraction && !blackjackGameActive && !fishingGameActive) {
                openNpcDialogue(npc);
                return;
            }

            const lf = lordFishnuInteractionRef.current;
            if (lf?.canPayRespects && !nearbyPortal && !fishingInteraction && !npc) {
                handlePayRespects();
            }
        };
        window.addEventListener('keydown', handleNpcKeyPress);
        return () => window.removeEventListener('keydown', handleNpcKeyPress);
    }, [nearbyPortal, fishingInteraction, emoteWheelOpen, room, handlePayRespects, openNpcDialogue, openTravelDialogue, blackjackGameActive, fishingGameActive, activeTravelNpcDef]);
    
    // Handle town interactions (benches, snowmen, etc.)
    useEffect(() => {
        const handleTownInteraction = (e) => {
            const { action, message, emote, data, exitedZone } = e.detail;
            
            // Handle exit events - clear the interaction prompt (but not if seated)
            if (action === 'exit') {
                if (!seatedRef.current) {
                    // If exitedZone is specified (from trigger system), only clear if it matches current action
                    // If no exitedZone (from furniture system), only clear furniture-type interactions
                    if (exitedZone) {
                        // Trigger system exit - only clear if we're exiting the same trigger
                        setNearbyInteraction(prev => prev?.action === exitedZone ? null : prev);
                    } else {
                        // Furniture system exit - only clear furniture interactions (sit, dj)
                        setNearbyInteraction(prev => 
                            (prev?.action === 'sit' || prev?.action === 'dj') ? null : prev
                        );
                    }
                }
                return;
            }
            
            // PERF: furniture proximity dispatches fire every frame from the game loop with
            // identical payloads. Returning the previous state object when nothing changed
            // lets React bail out instead of re-rendering this whole component at 60fps.
            const sameBenchPrompt = (prev, promptAction, promptEmote) => {
                if (prev?.action !== promptAction || prev.emote !== promptEmote) return false;
                if (prev.benchData === data) return true; // trigger zones reuse a stable zone object
                if (!prev.benchData || !data) return false;
                // Furniture-system payloads are fresh objects each frame — compare by seat coords
                if (data.worldX === undefined || prev.benchData.worldX === undefined) return false;
                return prev.benchData.worldX === data.worldX &&
                    prev.benchData.worldZ === data.worldZ &&
                    prev.benchData.worldRotation === data.worldRotation &&
                    prev.benchData.seatHeight === data.seatHeight &&
                    prev.benchData.platformHeight === data.platformHeight &&
                    prev.benchData.dismountBack === data.dismountBack;
            };
            
            if (action === 'sit' && emote) {
                // Don't show prompt if already seated
                if (seatedRef.current) return;
                // Pass bench data including snap points and world position
                setNearbyInteraction(prev => sameBenchPrompt(prev, action, emote) ? prev : { 
                    action, 
                    message: `${t('interact.pressE')} ${t('interact.toSit')}`, 
                    emote,
                    benchData: data // Contains snapPoints, seatHeight, etc.
                });
            } else if (action === 'dj') {
                // Don't show prompt if already DJing
                if (seatedRef.current) return;
                // Pass DJ booth data
                setNearbyInteraction(prev => sameBenchPrompt(prev, action, emote || 'DJ') ? prev : { 
                    action, 
                    message: `🎧 ${t('interact.pressE')} ${t('interact.toDJ')}`,
                    emote: emote || 'DJ',
                    benchData: data // Contains position, rotation, etc.
                });
            } else if (action === 'climb_roof') {
                // Show ladder climb prompt
                setNearbyInteraction({ 
                    action, 
                    message: `🪜 ${t('interact.climbRoof')} (${t('interact.pressE')})`,
                    data: data
                });
            } else if (action === 'climb_lighthouse') {
                // Show lighthouse climb prompt (only when at ground level)
                if (posRef.current.y < 5) {
                    console.log('🔦 Setting nearbyInteraction for climb_lighthouse');
                    setNearbyInteraction({ 
                        action, 
                        message: `🔦 Climb to Beacon (${t('interact.pressE')})`,
                        data: data
                    });
                }
            } else if (action === 'descend_lighthouse') {
                // Show leave prompt when on the observation deck
                if (posRef.current.y > 10) {
                    setNearbyInteraction(prev => (
                        prev?.action === 'descend_lighthouse' ? prev : { action, data: data }
                    ));
                }
            } else if (action === 'interact_snowman') {
                // Show snowman message
                setNearbyInteraction({ action, message: message || '☃️ Say hi to the snowman!', emote: 'Wave' });
            } else if (action === 'enter_casino_game_room') {
                // Casino game room portal
                setNearbyInteraction({ 
                    action, 
                    message: `🎰 ${t('interact.enterGameRoom')} (${t('interact.pressE')})`,
                    targetRoom: data?.destination || 'casino_game_room'
                });
            } else if (action === 'enter_nightclub') {
                // Nightclub portal
                setNearbyInteraction({ 
                    action, 
                    message: `🎵 ${t('interact.enterNightclub')} (${t('interact.pressE')})`,
                    targetRoom: data?.destination || 'nightclub'
                });
            } else if (action === 'play_arcade') {
                // Arcade machine interaction
                setNearbyInteraction({ 
                    action, 
                    message: `🎮 ${t('interact.pressE')} ${t('interact.toPlay')}`,
                    gameType: data?.gameType || 'battleship'
                });
            }
            // Note: enter_igloo is handled by portal system, not interaction prompts
        };
        
        window.addEventListener('townInteraction', handleTownInteraction);
        return () => window.removeEventListener('townInteraction', handleTownInteraction);
    }, []);
    
    // Handle interaction with E key
    useEffect(() => {
        const handleInteract = (e) => {
            // Prevent E from interacting when typing in chat or any input field
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
                return;
            }
            
            // Lighthouse deck — E to descend (position check; UI uses nearbyInteraction)
            if (e.code === 'KeyE' && roomRef.current === 'town') {
                const playerY = posRef.current.y;
                const playerX = posRef.current.x;
                const playerZ = posRef.current.z;
                const lighthouseX = CENTER_X + 80.5;
                const lighthouseZ = CENTER_Z + 52.7;
                const distToLighthouse = Math.sqrt((playerX - lighthouseX) ** 2 + (playerZ - lighthouseZ) ** 2);
                
                // If on lighthouse deck (Y > 10 and near lighthouse center)
                if (playerY > 10 && distToLighthouse < 6) {
                    // Teleport back down to ground level in front of lighthouse
                    posRef.current.x = lighthouseX;
                    posRef.current.z = lighthouseZ + 7; // In front of lighthouse
                    posRef.current.y = 0.5;
                    velRef.current.y = 0;
                    
                    if (playerRef.current) {
                        playerRef.current.position.set(lighthouseX, 0.5, lighthouseZ + 7);
                    }
                    return;
                }
            }
            
            if (e.code === 'KeyE' && nearbyInteraction && !nearbyPortal && !nearbyNpcInteractionRef.current) {
                // Let slot handlers consume E when a spin is available
                if (goldSlotInteractionRef.current?.canSpin && roomRef.current === 'snow_forts') return;
                if (slotInteractionRef.current?.canSpin && roomRef.current === 'casino_game_room') return;

                // Handle bench sitting with snap points
                if (nearbyInteraction.action === 'sit' && nearbyInteraction.benchData) {
                    const benchData = nearbyInteraction.benchData;
                    const snapPoints = benchData.snapPoints || [{ x: 0, z: 0, rotation: 0 }];
                    const benchX = benchData.worldX;
                    const benchZ = benchData.worldZ;
                    const benchRotation = benchData.worldRotation || 0;
                    
                    // Find the closest available snap point
                    const playerX = posRef.current.x;
                    const playerZ = posRef.current.z;
                    
                    // Find closest snap point (transform to world space considering rotation)
                    let closestPoint = snapPoints[0];
                    let closestDist = Infinity;
                    let closestWorldX = benchX;
                    let closestWorldZ = benchZ;
                    
                    for (const point of snapPoints) {
                        // Rotate snap point by bench rotation
                        const rotatedX = point.x * Math.cos(benchRotation) - point.z * Math.sin(benchRotation);
                        const rotatedZ = point.x * Math.sin(benchRotation) + point.z * Math.cos(benchRotation);
                        
                        // Transform to world space
                        const worldX = benchX + rotatedX;
                        const worldZ = benchZ + rotatedZ;
                        
                        const dist = Math.sqrt((playerX - worldX) ** 2 + (playerZ - worldZ) ** 2);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestPoint = point;
                            closestWorldX = worldX;
                            closestWorldZ = worldZ;
                        }
                    }
                    
                    // Set seated state
                    const seatData = {
                        snapPoint: closestPoint,
                        worldPos: { x: closestWorldX, z: closestWorldZ },
                        seatHeight: benchData.seatHeight || 0.8,
                        benchRotation: benchRotation,
                        benchDepth: benchData.benchDepth || 0.8,
                        dismountBack: benchData.dismountBack || false, // For bar stools
                        platformHeight: benchData.platformHeight || benchData.data?.platformHeight || 0 // For rooftop benches
                    };
                    setSeatedOnBench(seatData);
                    seatedRef.current = seatData;
                    
                    // Move player to seat position (including Y height!)
                    posRef.current.x = closestWorldX;
                    posRef.current.z = closestWorldZ;
                    posRef.current.y = seatData.seatHeight; // SET Y TO SEAT HEIGHT!
                    velRef.current.y = 0; // Stop any falling
                    
                    // Determine facing direction
                    let finalRotation = benchRotation;
                    
                    // BIDIRECTIONAL SIT (log seats only): Face based on approach side
                    if (benchData.bidirectionalSit) {
                        // Calculate which side of the log the player approached from
                        // Get the log's forward direction (+Z in local space after rotation)
                        const logForwardX = Math.sin(benchRotation);
                        const logForwardZ = Math.cos(benchRotation);
                        
                        // Vector from log center to player position
                        const toPlayerX = playerX - benchX;
                        const toPlayerZ = playerZ - benchZ;
                        
                        // Dot product to determine which side player is on
                        const dotProduct = toPlayerX * logForwardX + toPlayerZ * logForwardZ;
                        
                        // If player approached from back side (negative dot), flip 180°
                        if (dotProduct < 0) {
                            finalRotation = benchRotation + Math.PI;
                        }
                    }
                    
                    rotRef.current = finalRotation;
                    
                    // Update player mesh position and rotation
                    if (playerRef.current) {
                        playerRef.current.position.x = closestWorldX;
                        playerRef.current.position.z = closestWorldZ;
                        playerRef.current.position.y = seatData.seatHeight; // SET Y TO SEAT HEIGHT!
                        playerRef.current.rotation.y = rotRef.current;
                    }
                    
                    // Trigger sit emote (furniture sit - elevated)
                    emoteRef.current = { type: 'Sit', startTime: Date.now() };
                    mpSendEmote('Sit', true); // true = seatedOnFurniture
                    
                    // Clear the interaction prompt
                    setNearbyInteraction(null);
                }
                else if (nearbyInteraction.action === 'dj' && nearbyInteraction.benchData) {
                    // DJ at the turntable
                    const djData = nearbyInteraction.benchData;
                    const djX = djData.worldX;
                    const djZ = djData.worldZ;
                    const djRotation = djData.worldRotation !== undefined ? djData.worldRotation : 0;
                    const djHeight = djData.seatHeight || 0.75;
                    
                    // Set seated/DJ state
                    const seatData = {
                        snapPoint: { x: 0, z: 0 },
                        worldPos: { x: djX, z: djZ },
                        seatHeight: djHeight,
                        benchRotation: djRotation,
                        benchDepth: 1,
                        dismountBack: true,
                        dismountOffset: djData.dismountOffset,
                        platformHeight: djHeight
                    };
                    setSeatedOnBench(seatData);
                    seatedRef.current = seatData;
                    
                    // Move player to DJ position
                    posRef.current.x = djX;
                    posRef.current.z = djZ;
                    posRef.current.y = djHeight;
                    velRef.current.y = 0;
                    rotRef.current = djRotation;
                    
                    if (playerRef.current) {
                        playerRef.current.position.set(djX, djHeight, djZ);
                        playerRef.current.rotation.y = djRotation;
                    }
                    
                    // Trigger DJ emote
                    emoteRef.current = { type: 'DJ', startTime: Date.now() };
                    mpSendEmote('DJ', true); // true = seatedOnFurniture (continuous emote)
                    
                    // Clear the interaction prompt
                    setNearbyInteraction(null);
                }
                else if (nearbyInteraction.action === 'climb_roof') {
                    // Teleport to nightclub roof
                    const townCenterX = CENTER_X;
                    const townCenterZ = CENTER_Z;
                    
                    // Nightclub is at (CENTER, CENTER - 75), roof height is ~13 (building height 12 + 1)
                    const roofX = townCenterX;
                    const roofZ = townCenterZ - 75;
                    const roofY = 15; // Spawn above roof to land on it
                    
                    posRef.current.x = roofX;
                    posRef.current.z = roofZ;
                    posRef.current.y = roofY;
                    velRef.current.y = 0;
                    
                    if (playerRef.current) {
                        playerRef.current.position.set(roofX, roofY, roofZ);
                    }
                    
                    setNearbyInteraction(null);
                }
                else if (nearbyInteraction.action === 'climb_lighthouse') {
                    // Teleport to lighthouse observation deck
                    // Lighthouse is at (CENTER + 80.5, CENTER + 52.7), deck height is ~12.5
                    const lighthouseX = CENTER_X + 80.5;
                    const lighthouseZ = CENTER_Z + 52.7;
                    const deckY = 12.5 + 5; // Deck height + 5 to ensure landing above floor
                    
                    posRef.current.x = lighthouseX;
                    posRef.current.z = lighthouseZ;
                    posRef.current.y = deckY;
                    velRef.current.y = 0;
                    
                    if (playerRef.current) {
                        playerRef.current.position.set(lighthouseX, deckY, lighthouseZ);
                    }
                    
                    setNearbyInteraction(null);
                }
                else if (nearbyInteraction.action === 'enter_casino_game_room' || nearbyInteraction.action === 'enter_nightclub') {
                    // Room transition via trigger-based portals
                    const targetRoom = nearbyInteraction.targetRoom;
                    if (targetRoom && onChangeRoom) {
                        // Clear interaction and transition to room
                        setNearbyInteraction(null);
                        onChangeRoom(targetRoom);
                    }
                }
                else if (nearbyInteraction.action === 'play_arcade') {
                    // Open arcade minigame (PvE Battleship)
                    const gameType = nearbyInteraction.gameType || 'battleship';
                    setArcadeGameType(gameType);
                    setArcadeGameActive(true);
                    setNearbyInteraction(null);
                }
                else if (nearbyInteraction.emote) {
                    emoteRef.current = { type: nearbyInteraction.emote, startTime: Date.now() };
                    // Ground sit emote (not on furniture)
                    mpSendEmote(nearbyInteraction.emote, false);
                }
                if (nearbyInteraction.action === 'interact_snowman') {
                    setActiveBubble(nearbyInteraction.message);
                }
            }
        };
        window.addEventListener('keydown', handleInteract);
        return () => window.removeEventListener('keydown', handleInteract);
    }, [nearbyInteraction, nearbyPortal]);
    
    // ==================== CHAT COMMANDS ====================
    // Handle /spawn command to teleport to TOWN CENTER spawn (always)
    // Handle /tp pk1-pk5 commands for parkour testing (DEV only)
    useEffect(() => {
        const handleChatCommand = (e) => {
            const { command } = e.detail;
            
            // Parkour stage start positions (staff) + zone warps
            const warpPositions = {
                // Forest Trails — main campfire clearing (world coords)
                forest: { room: 'forest_trails', ...OVERWORLD_CENTER_SPAWN, name: 'Forest Trails' },
                snowforts: { room: 'snow_forts', ...OVERWORLD_CENTER_SPAWN, name: 'Snow Forts' },
                snow: { room: 'snow_forts', ...OVERWORLD_CENTER_SPAWN, name: 'Snow Forts' },
                // Stage 1 (Blue) - Ground level start near dojo
                pk1: { x: CENTER_X - 12, y: 4, z: CENTER_Z + 70 + 9, name: 'Stage 1 (Blue) Start' },
                // Stage 2 (Purple) - Tier 1 platform (first roof)
                pk2: { x: CENTER_X - 13, y: 14, z: CENTER_Z + 70, name: 'Stage 2 (Purple) Start' },
                // Stage 3 (Green) - Tier 3 platform
                pk3: { x: CENTER_X - 6, y: 25, z: CENTER_Z + 70 + 2, name: 'Stage 3 (Green) Start' },
                // Stage 4 (Orange) - Near fishing area (end of stage 3)
                pk4: { x: CENTER_X - 70.4 + 4, y: 37, z: CENTER_Z + 78.5 - 2, name: 'Stage 4 (Orange) Start' },
                // Stage 5 (Red) - End of stage 4
                pk5: { x: CENTER_X - 70.4 + 49 + 3, y: 48, z: CENTER_Z + 78.5 + 1 + 3, name: 'Stage 5 (Red) Start' },
                // Stage 6 (Cyan) - The Gauntlet - Expert course
                pk6: { x: CENTER_X - 70.4 + 49 + 48 - 3, y: 57, z: CENTER_Z + 78.5 + 1 + 2 - 3, name: 'Stage 6 (Cyan) - The Gauntlet' },
            };
            
            // Handle zone warps (staff only — authorized via server)
            if (warpPositions[command]) {
                const pos = warpPositions[command];
                
                // Clear any seated state first
                if (seatedRef.current) {
                    seatedRef.current = null;
                    setSeatedOnBench(null);
                    emoteRef.current.type = null;
                    mpSendEmote(null);
                }
                
                // Change room for zone warps (staff only)
                const targetRoom = pos.room || 'town';
                const spawnPos = { x: pos.x, y: pos.y, z: pos.z, absolute: true };
                if (roomRef.current !== targetRoom) {
                    if (onChangeRoom) {
                        onChangeRoom(targetRoom, spawnPos);
                    }
                } else {
                    posRef.current.x = pos.x;
                    posRef.current.y = pos.y;
                    posRef.current.z = pos.z;
                    velRef.current = { x: 0, y: 0, z: 0 };
                    if (playerRef.current) {
                        playerRef.current.position.set(pos.x, pos.y, pos.z);
                    }
                }
                
                console.log(`🎮 Teleported to ${pos.name}:`, { x: pos.x, y: pos.y, z: pos.z });
                return;
            }
            
            if (command === 'afk') {
                const afkText = e.detail.message || '💤 AFK';
                isAfkRef.current = true;
                afkMessageRef.current = afkText;
                setActiveBubble(afkText);
                return;
            }

            if (command === 'spawn') {
                const spawnX = WORLD_SPAWN.x;
                const spawnZ = WORLD_SPAWN.z;
                
                // Clear any seated state first
                if (seatedRef.current) {
                    seatedRef.current = null;
                    setSeatedOnBench(null);
                    emoteRef.current.type = null;
                    mpSendEmote(null);
                }
                
                // Always return to nightclub interior spawn
                if (roomRef.current !== WORLD_SPAWN_ROOM) {
                    if (onChangeRoom) {
                        onChangeRoom(WORLD_SPAWN_ROOM, null);
                    }
                } else {
                    posRef.current.x = spawnX;
                    posRef.current.y = 0;
                    posRef.current.z = spawnZ;
                    velRef.current = { x: 0, y: 0, z: 0 };
                    
                    if (playerRef.current) {
                        playerRef.current.position.set(spawnX, 0, spawnZ);
                    }
                }
                
                console.log('🌟 Teleported to nightclub spawn:', { x: spawnX, z: spawnZ });
            }
        };
        
        window.addEventListener('chatCommand', handleChatCommand);
        return () => window.removeEventListener('chatCommand', handleChatCommand);
    }, [mpSendEmote, onChangeRoom]);
    
    // Handle admin/moderator teleport command
    useEffect(() => {
        const handleTeleport = (e) => {
            const { position, room: targetRoom } = e.detail;
            
            if (!position) return;

            lastRoomNotifyRef.current = { room: null, x: null, z: null };
            bubbleSpriteRef.current = null;
            
            // Clear any seated state first
            if (seatedRef.current) {
                seatedRef.current = null;
                setSeatedOnBench(null);
                emoteRef.current.type = null;
                mpSendEmote(null);
            }
            
            const applyPosition = () => {
                posRef.current.x = position.x || 0;
                posRef.current.y = position.y || 0;
                posRef.current.z = position.z || 0;
                velRef.current = { x: 0, y: 0, z: 0 };
                
                if (playerRef.current) {
                    playerRef.current.position.set(position.x || 0, position.y || 0, position.z || 0);
                }
                if (cameraControllerRef.current) {
                    cameraControllerRef.current.snapToTarget();
                }
                if (targetRoom) {
                    mpChangeRoom(
                        targetRoom,
                        { x: position.x || 0, y: position.y ?? 0, z: position.z || 0 }
                    );
                    lastRoomNotifyRef.current = {
                        room: targetRoom,
                        x: position.x || 0,
                        z: position.z || 0
                    };
                }
            };
            
            // If target room is different, change room first
            if (targetRoom && room !== targetRoom) {
                onChangeRoom(targetRoom);
                setTimeout(applyPosition, 100);
            } else {
                applyPosition();
            }
            
            console.log('✨ Teleported to:', position, targetRoom ? `(room: ${targetRoom})` : '');
        };
        
        window.addEventListener('teleport', handleTeleport);
        return () => window.removeEventListener('teleport', handleTeleport);
    }, [room, onChangeRoom, mpSendEmote, mpChangeRoom]);
    
    // Listen for room counts updates from server (for igloo occupancy bubbles)
    useEffect(() => {
        const handleRoomCounts = (event) => {
            const counts = event.detail;
            if (!counts) return;
            
            // Each igloo has its own unique room (igloo1 -> igloo1, igloo2 -> igloo2, etc.)
            // Update each igloo sprite with the count from its corresponding room
            iglooOccupancySpritesRef.current.forEach((sprite, iglooId) => {
                const roomName = sprite.userData.iglooRoom || iglooId;
                const count = counts[roomName] || 0;
                // Get server igloo data for dynamic banner content
                const serverIglooData = getIgloo ? getIgloo(iglooId) : null;
                updateIglooOccupancySprite(window.THREE, sprite, count, serverIglooData);
            });
        };
        
        window.addEventListener('roomCounts', handleRoomCounts);
        return () => window.removeEventListener('roomCounts', handleRoomCounts);
    }, [getIgloo]);
    
    // Update igloo banners when igloo data changes from server
    useEffect(() => {
        if (!igloos || igloos.length === 0) return;
        
        console.log('🏠 [VoxelWorld] Igloos data changed, updating banners. Sample banner:', 
            igloos[0]?.banner ? {
                iglooId: igloos[0].iglooId,
                font: igloos[0].banner.font,
                styleIndex: igloos[0].banner.styleIndex,
                useCustomColors: igloos[0].banner.useCustomColors
            } : 'no banner data'
        );
        
        // Update each igloo sprite with the latest server data
        iglooOccupancySpritesRef.current.forEach((sprite, iglooId) => {
            const serverIglooData = igloos.find(i => i.iglooId === iglooId);
            if (serverIglooData) {
                // Get current occupancy count from sprite
                const currentCount = sprite.userData.lastCount || 0;
                updateIglooOccupancySprite(window.THREE, sprite, currentCount, serverIglooData);
            }
        });
    }, [igloos]);
    

    // ==================== MULTIPLAYER SYNC (OPTIMIZED) ====================
    
    // ==================== NAMETAG STYLE SYSTEM ====================
    // Diamond Flippers: balance-based tiers + manual day1/default overrides
    const NAME_SPRITE_BASE_SCALE = { x: 4, y: 1 };

    const createNameSprite = useCallback((name, styleOrPlayerData = 'default') => {
        const THREE = window.THREE;
        if (!THREE) return null;

        let resolvedStyle = 'default';
        if (typeof styleOrPlayerData === 'object' && styleOrPlayerData !== null) {
            resolvedStyle = resolveNametagStyle(styleOrPlayerData);
        } else {
            const manual = styleOrPlayerData;
            if (manual === 'tier' || manual === 'auto' || manual === 'whale') {
                resolvedStyle = resolveNametagStyle({
                    appearance: { nametagStyle: manual },
                    cpNametagTier: userDataRef.current?.cpNametagTier,
                    isAuthenticated: isAuthenticated,
                    walletAddress: walletAddress || userDataRef.current?.walletAddress,
                });
            } else {
                resolvedStyle = manual;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        drawNametagToCanvas(ctx, name, resolvedStyle);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false,
            transparent: true,
        });
        const sprite = new THREE.Sprite(material);

        sprite.renderOrder = 9999;

        const isStyled = isStyledNametag(resolvedStyle);
        sprite.scale.set(NAME_SPRITE_BASE_SCALE.x, NAME_SPRITE_BASE_SCALE.y, 1);
        sprite.userData.baseScale = { x: NAME_SPRITE_BASE_SCALE.x, y: NAME_SPRITE_BASE_SCALE.y };
        sprite.userData.nametagStyle = resolvedStyle;

        if (isStyled) {
            sprite.userData.animationPhase = Math.random() * Math.PI * 2;
        }

        return sprite;
    }, [isAuthenticated, walletAddress]);

    const createNameSpriteRef = useRef(createNameSprite);
    useEffect(() => {
        createNameSpriteRef.current = createNameSprite;
    }, [createNameSprite]);

    const createPvpLabelSprite = useCallback(() => {
        const THREE = window.THREE;
        if (!THREE) return null;

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect(16, 16, 480, 64, 12);
        ctx.fill();

        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(16, 16, 480, 64, 12);
        ctx.stroke();

        ctx.fillStyle = '#00FF88';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CLICK ME TO PVP', 256, 48);
        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
        sprite.userData.baseScale = { x: 5, y: 1.1 };
        sprite.scale.set(5, 1.1, 1);
        return sprite;
    }, []);
    
    // Listen for nametag style changes from settings
    useEffect(() => {
        const handleNametagChange = (e) => {
            const requestedStyle = e.detail?.style || 'tier';
            const newStyle = isAuthenticated ? requestedStyle : 'default';
            
            if (!playerRef.current || !playerName) return;

            const THREE = window.THREE;
            if (!THREE) return;

            const localData = {
                appearance: { nametagStyle: newStyle },
                cpNametagTier: userDataRef.current?.cpNametagTier,
                day1NametagUnlocked: userDataRef.current?.day1NametagUnlocked,
                isAuthenticated,
                walletAddress: walletAddress || userDataRef.current?.walletAddress,
            };
            const nameSprite = createNameSprite(playerName, localData);
            if (!nameSprite) return;

            let characterType = 'penguin';
            try {
                const customization = JSON.parse(localStorage.getItem('penguin_customization') || '{}');
                characterType = customization.characterType || 'penguin';
            } catch { /* use default */ }
            const nameHeight = characterType === 'marcus' ? NAME_HEIGHT_MARCUS : characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
            nameSprite.position.set(0, nameHeight, 0);

            const prevSprite = playerNameSpriteRef.current;
            playerRef.current.add(nameSprite);
            playerNameSpriteRef.current = nameSprite;

            if (prevSprite && prevSprite !== nameSprite) {
                playerRef.current.remove(prevSprite);
                disposeNameSprite(prevSprite);
            }

            if (playerGoldRainRef.current) {
                playerGoldRainRef.current.dispose();
                playerGoldRainRef.current = null;
                playerGoldRainEffectKeyRef.current = null;
            }
            
            if (mpUpdateAppearanceRef.current) {
                try {
                    const savedSettings = JSON.parse(localStorage.getItem('game_settings') || '{}');
                    const customization = JSON.parse(localStorage.getItem('penguin_customization') || '{}');
                    mpUpdateAppearanceRef.current({
                        ...customization,
                        mountEnabled: savedSettings.mountEnabled !== false,
                        nametagStyle: newStyle
                    });
                } catch { /* ignore */ }
            }
        };
        
        window.addEventListener('nametagChanged', handleNametagChange);
        return () => window.removeEventListener('nametagChanged', handleNametagChange);
    }, [createNameSprite, isAuthenticated, playerName, walletAddress]);

    // Rebuild local nametag when server reports a new $CP tier
    const prevCpTierRef = useRef(undefined);
    useEffect(() => {
        if (!isAuthenticated || !playerRef.current || !playerName) return;
        const tier = userData?.cpNametagTier;
        if (prevCpTierRef.current === tier) return;
        const hadPreviousTier = prevCpTierRef.current !== undefined;
        prevCpTierRef.current = tier;
        if (!hadPreviousTier) return;

        try {
            const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
            const mode = settings.nametagStyle || 'tier';
            if (mode !== 'tier' && mode !== 'auto' && mode !== 'whale') return;
        } catch { return; }

        window.dispatchEvent(new CustomEvent('nametagChanged', { detail: { style: 'tier' } }));
    }, [userData?.cpNametagTier, isAuthenticated, playerName]);
    
    // Join room once per connection when world + mesh builder are ready (room changes use change_room)
    useEffect(() => {
        if (!connected || !sceneRef.current || !playerId || !penguinData) return;
        if (isRestoringSession) return;
        if (!meshBuilderReady) return;
        if (hasSentJoinRef.current) return;

        hasSentJoinRef.current = true;
        console.log(`🔗 Join room effect triggered - penguinData.characterType=${penguinData?.characterType || 'undefined'}`);
        const puffleData = playerPuffle ? {
            id: playerPuffle.id,
            color: playerPuffle.color,
            name: playerPuffle.name
        } : null;
        
        // Include current mount enabled state, nametag style, and green candles from settings
        // Guests always get 'default' nametag style - only authenticated users get special styles
        let mountEnabled = true;
        let nametagStyle = 'default';
        let greenCandlesEnabled = false;
        try {
            const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
            mountEnabled = settings.mountEnabled !== false;
            // Only authenticated users can use non-default nametag styles
            nametagStyle = isAuthenticated ? (settings.nametagStyle || 'tier') : 'default';
            greenCandlesEnabled = settings.greenCandlesEnabled === true;
        } catch { /* use default */ }
        
        const appearanceWithMount = {
            ...penguinData,
            mountEnabled,
            nametagStyle,  // Broadcast nametag style to all players
            greenCandlesEnabled  // Broadcast green candles setting to all players
        };
        
        console.log(`🚀 Joining room ${room} with appearance: characterType=${appearanceWithMount.characterType || 'undefined'}`);
        const joinSent = mpJoinRoom(room, appearanceWithMount, puffleData, turnstileToken);
        if (!joinSent) {
            hasSentJoinRef.current = false;
            console.warn('⚠️ Failed to send join — will retry when socket is ready');
            return;
        }
        // Reinforce appearance on server after join — fixes guest cosmetics and late auth customization
        if (mpUpdateAppearanceRef.current) {
            mpUpdateAppearanceRef.current(appearanceWithMount);
        }
        
        // Add player's own name tag (so they can see their username)
        if (playerRef.current && playerName && !playerNameSpriteRef.current) {
            const localNametagData = {
                appearance: { nametagStyle },
                cpNametagTier: userDataRef.current?.cpNametagTier,
                day1NametagUnlocked: userDataRef.current?.day1NametagUnlocked,
                isAuthenticated,
                walletAddress: walletAddress || userDataRef.current?.walletAddress,
            };
            const nameSprite = createNameSprite(playerName, localNametagData);
            if (nameSprite) {
                const nameHeight = penguinData?.characterType === 'marcus' ? NAME_HEIGHT_MARCUS : penguinData?.characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
                nameSprite.position.set(0, nameHeight, 0);
                playerRef.current.add(nameSprite);
                playerNameSpriteRef.current = nameSprite;
            }
        }
    }, [connected, playerId, penguinData, room, playerName, createNameSprite, isAuthenticated, playerPuffle, turnstileToken, mpJoinRoom, meshBuilderReady, isRestoringSession, walletAddress]);
    
    // Send position updates (throttled) - OPTIMIZED: 100ms interval, only when changed
    useEffect(() => {
        if (!connected) return;
        
        const interval = setInterval(() => {
            const pos = posRef.current;
            const rot = rotRef.current;
            const last = lastPositionSentRef.current;
            
            const dx = pos.x - last.x;
            const dz = pos.z - last.z;
            const dy = (pos.y || 0) - (last.y || 0);
            const dRot = Math.abs(rot - last.rot);
            const distSq = dx * dx + dz * dz;
            const yChanged = Math.abs(dy) > 0.1; // Detect jumps
            
            // Only send if moved significantly (including Y for jumps)
            if (distSq > 0.05 || dRot > 0.1 || yChanged) {
                const pufflePos = playerPuffleRef.current?.position || null;
                // Send full 3D position including Y for jump sync
                sendPosition({ x: pos.x, y: pos.y, z: pos.z }, rot, pufflePos);
                lastPositionSentRef.current = { x: pos.x, y: pos.y, z: pos.z, rot, time: Date.now() };
            }
            
            // Always update local position for proximity checking
            if (updateLocalPosition) {
                updateLocalPosition(pos);
            }
        }, 100); // 10 updates per second (was 20)
        
        return () => clearInterval(interval);
    }, [connected, sendPosition]);
    
    // Register ball update callback for igloo sync
    useEffect(() => {
        if (!registerCallbacks) return;
        
        registerCallbacks({
            onBallUpdate: (x, z, vx, vz) => {
                // Update local ball from server
                const rd = roomDataRef.current;
                if (rd && rd.beachBall) {
                    const ball = rd.beachBall;
                    // Smoothly interpolate to server position
                    ball.mesh.position.x = x;
                    ball.mesh.position.z = z;
                    ball.velocity.x = vx;
                    ball.velocity.z = vz;
                }
            },
            // Slot machine callbacks - displays are now attached to MACHINES not players
            onSlotSpinStarted: (data) => {
                // Server confirmed our spin started - display already created in handleSlotSpin
            },
            onSlotReelReveal: (data) => {
                playSfx('slot_stop');
                // Update machine display with revealed reel
                if (slotMachineSystemRef.current) {
                    slotMachineSystemRef.current.revealReel(
                        data.machineId,
                        data.reelIndex,
                        data.symbol
                    );
                }
            },
            onSlotResult: (data) => {
                // Complete machine display with cosmetic result
                if (slotMachineSystemRef.current) {
                    // Build cosmetic result object for display
                    const cosmeticResult = data.isDemo ? { 
                        rarity: data.demoRarity || 'common',
                        isDemo: true 
                    } : {
                        rarity: data.rarity,
                        name: data.name,
                        templateId: data.templateId,
                        quality: data.quality,
                        qualityDisplay: data.qualityDisplay,
                        isHolographic: data.isHolographic,
                        isFirstEdition: data.isFirstEdition,
                        serialNumber: data.serialNumber,
                        isDuplicate: data.isDuplicate,
                        goldAwarded: data.goldAwarded
                    };
                    
                    slotMachineSystemRef.current.completeSpin(
                        data.machineId,
                        data.reels,
                        cosmeticResult,
                        data.isDemo
                    );
                }
                
                // Trigger jackpot celebration if it's a jackpot (Legendary or better)!
                if (data.isJackpot && jackpotCelebrationRef.current) {
                    jackpotCelebrationRef.current.triggerJackpot();
                    playSfx('slot_jackpot');
                } else if (data.goldAwarded > 0 || data.payout > 0) {
                    playSfx((data.goldAwarded || data.payout) >= 500 ? 'slot_win_medium' : 'slot_win_small');
                } else if (data.rarity && data.rarity !== 'common') {
                    playSfx('slot_win_small');
                }
            },
            onSlotPlayerSpinning: (data) => {
                // Another player started spinning on a machine
                if (slotMachineSystemRef.current && data.playerId !== playerId) {
                    slotMachineSystemRef.current.handleRemoteSpinStart(
                        data.machineId,
                        data.playerName,
                        data.isDemo
                    );
                }
            },
            onSlotComplete: (data) => {
                // Another player completed spinning - show their cosmetic result to spectators
                if (slotMachineSystemRef.current && data.playerId !== playerId) {
                    // Build cosmetic result object for spectator display
                    const cosmeticResult = data.isDemo ? {
                        rarity: data.demoRarity || 'common',
                        isDemo: true
                    } : {
                        rarity: data.rarity,
                        name: data.name,
                        quality: data.quality,
                        isHolographic: data.isHolographic,
                        isFirstEdition: data.isFirstEdition,
                        isDuplicate: data.isDuplicate
                    };
                    
                    slotMachineSystemRef.current.completeSpin(
                        data.machineId,
                        data.reels,
                        cosmeticResult,
                        data.isDemo
                    );
                }
            },
            onSlotInterrupted: (data) => {
                // A player's spin was interrupted - hide machine display
                if (slotMachineSystemRef.current) {
                    slotMachineSystemRef.current.handleSpinError(data.machineId);
                }
            },
            onSlotActiveSpins: (spins) => {
                // Show displays for all active spins when joining room
                if (slotMachineSystemRef.current) {
                    for (const spin of spins) {
                        slotMachineSystemRef.current.handleRemoteSpinStart(
                            spin.machineId,
                            spin.playerName,
                            spin.isDemo
                        );
                        // Set revealed reels
                        spin.reels?.forEach((reel, idx) => {
                            slotMachineSystemRef.current.revealReel(
                                spin.machineId,
                                idx,
                                reel
                            );
                        });
                    }
                }
            },
            onGoldSlotSpinStarted: (data) => {
                if (goldLobbySlotSystemRef.current && data.machineId) {
                    const display = goldLobbySlotSystemRef.current.getDisplay(data.machineId);
                    if (display && !display.isServerSpinning) {
                        goldLobbySlotSystemRef.current.startLocalSpin(data.machineId);
                    }
                }
            },
            onGoldSlotReelReveal: (data) => {
                playSfx('slot_stop');
                if (goldLobbySlotSystemRef.current) {
                    goldLobbySlotSystemRef.current.revealReel(
                        data.machineId,
                        data.reelIndex,
                        data.symbol
                    );
                }
            },
            onGoldSlotResult: (data) => {
                if (goldLobbySlotSystemRef.current) {
                    goldLobbySlotSystemRef.current.completeSpin(
                        data.machineId,
                        data.reels,
                        data.payout,
                        data.isJackpot
                    );
                }
                if (data.isJackpot && jackpotCelebrationRef.current) {
                    jackpotCelebrationRef.current.triggerJackpot();
                    playSfx('slot_jackpot');
                } else if (data.payout > 0) {
                    playSfx(data.payout >= 500 ? 'gold_win' : 'slot_win_medium');
                }
            },
            onGoldSlotPlayerSpinning: (data) => {
                if (goldLobbySlotSystemRef.current && data.playerId !== playerId) {
                    goldLobbySlotSystemRef.current.handleRemoteSpinStart(
                        data.machineId,
                        data.playerName
                    );
                }
            },
            onGoldSlotComplete: (data) => {
                if (goldLobbySlotSystemRef.current && data.playerId !== playerId) {
                    goldLobbySlotSystemRef.current.completeSpin(
                        data.machineId,
                        data.reels,
                        data.payout,
                        data.isJackpot,
                        data.playerName
                    );
                }
            },
            onGoldSlotInterrupted: (data) => {
                if (goldLobbySlotSystemRef.current) {
                    goldLobbySlotSystemRef.current.handleInterrupted(data.machineId);
                }
            },
            onGoldSlotActiveSpins: (spins) => {
                if (goldLobbySlotSystemRef.current) {
                    for (const spin of spins) {
                        goldLobbySlotSystemRef.current.handleRemoteSpinStart(
                            spin.machineId,
                            spin.playerName
                        );
                        spin.reels?.forEach((symbol, idx) => {
                            goldLobbySlotSystemRef.current.revealReel(
                                spin.machineId,
                                idx,
                                symbol
                            );
                        });
                    }
                }
            },
            onGoldSlotError: (data) => {
                const machineId = data.machineId || goldSlotInteractionRef.current?.machine?.id;
                if (goldLobbySlotSystemRef.current && machineId) {
                    goldLobbySlotSystemRef.current.handleSpinError(machineId);
                }
            },
            // Ice Fishing callbacks - simple catch bubble display
            onFishingStarted: () => {
                // Fishing started - minigame overlay handles display
            },
            onPlayerCaughtFish: (data) => {
                if (iceFishingSystemRef.current) {
                    const isJellyfish = data.fish?.type === 'jellyfish' || data.fish?.id?.includes('jelly');
                    iceFishingSystemRef.current.showCatchBubble(
                        data.playerId,
                        data.playerName,
                        data.fish,
                        data.coins,
                        data.isDemo,
                        isJellyfish,
                        data.npcValue || data.fish?.npcValue || 0,
                        data.inventoryAdded
                    );
                }
            },
            onWoodChopResult: (data) => {
                if (woodChopTimerRef.current) cancelAnimationFrame(woodChopTimerRef.current);
                setWoodChopProgress(null);
                woodcuttingSystemRef.current?.clearLocalChopping();
                woodcuttingLockRef.current = false;
                woodChopStartPosRef.current = null;

                if (data.treeState && forestTreeManagerRef.current) {
                    forestTreeManagerRef.current.updateTree(
                        data.treeState.id,
                        data.treeState.state,
                        data.treeState.regrowAt,
                        data.treeState.choppingBy || null,
                        data.treeState.stage
                    );
                }
                if (data.wood && data.inventoryAdded) {
                    playSfx('wood_chop_complete');
                    const qty = data.wood.quantity || 1;
                    const label = `${data.wood.emoji || '🪵'} ${qty}× ${data.wood.name}`;
                    setActiveBubble(
                        data.axeBroken
                            ? `Chopped ${label}! Your axe broke — buy a new one from Clive.`
                            : `Chopped ${label}!`
                    );
                }
            },
            onWoodChopError: (data) => {
                if (woodChopTimerRef.current) cancelAnimationFrame(woodChopTimerRef.current);
                setWoodChopProgress(null);
                woodcuttingSystemRef.current?.clearLocalChopping();
                woodcuttingLockRef.current = false;
                woodChopStartPosRef.current = null;
                if (data?.treeState && forestTreeManagerRef.current) {
                    forestTreeManagerRef.current.updateTree(
                        data.treeState.id,
                        data.treeState.state,
                        data.treeState.regrowAt,
                        data.treeState.choppingBy || null,
                        data.treeState.stage
                    );
                } else {
                    fetchForestTrees?.();
                }
                if (data?.message) setActiveBubble(data.message);
            },
            onWoodChopCancelled: (data) => {
                if (woodChopTimerRef.current) cancelAnimationFrame(woodChopTimerRef.current);
                setWoodChopProgress(null);
                woodcuttingSystemRef.current?.clearLocalChopping();
                woodcuttingLockRef.current = false;
                woodChopStartPosRef.current = null;
                if (data?.treeState && forestTreeManagerRef.current) {
                    forestTreeManagerRef.current.updateTree(
                        data.treeState.id,
                        data.treeState.state,
                        data.treeState.regrowAt,
                        data.treeState.choppingBy || null,
                        data.treeState.stage
                    );
                } else if (data?.treeId && forestTreeManagerRef.current) {
                    fetchForestTrees?.();
                }
            },
            onManualChopHit: (data) => {
                manualChopControllerRef.current?.confirmLocalHit(data);
            },
            onManualChopSync: (data) => {
                if (data.playerId === playerId) return;
                const chopperPos = getPlayersData()?.get(data.playerId)?.position || null;
                forestTreeManagerRef.current?.onRemoteManualChopSync(data.playerId, data, chopperPos);
            },
            onRemoteManualChopStart: (data) => {
                if (data.playerId === playerId) return;
                forestTreeManagerRef.current?.onRemoteManualChopStart(
                    data.playerId,
                    data.treeId,
                    data.position || getPlayersData()?.get(data.playerId)?.position || null
                );
            },
            onRemoteManualChopEnd: (data) => {
                if (!data?.playerId || data.playerId === playerId) return;
                forestTreeManagerRef.current?.onRemoteManualChopEnd(data.playerId);
            },
            onManualChopResult: (data) => {
                exitManualChop('COMPLETE');
                if (data.treeState && forestTreeManagerRef.current) {
                    forestTreeManagerRef.current.updateTree(
                        data.treeState.id,
                        data.treeState.state,
                        data.treeState.regrowAt,
                        data.treeState.choppingBy || null,
                        data.treeState.stage
                    );
                }
                fetchGameInventory?.();
                if (data.wood) {
                    playSfx('wood_chop_complete');
                    const qty = data.wood.quantity || 1;
                    const label = `${data.wood.emoji || '🪵'} ${qty}× ${data.wood.name}`;
                    setActiveBubble(
                        data.axeBroken
                            ? `Chopped ${label}! Your axe broke — buy a new one from Clive.`
                            : `Chopped ${label}!`
                    );
                }
            },
            onManualChopError: (data) => {
                if (data?.error === 'ALREADY_FALLING') return;
                if (manualChopActiveRef.current) exitManualChop('ERROR');
                if (data?.treeState && forestTreeManagerRef.current) {
                    forestTreeManagerRef.current.updateTree(
                        data.treeState.id,
                        data.treeState.state,
                        data.treeState.regrowAt,
                        data.treeState.choppingBy || null,
                        data.treeState.stage
                    );
                } else {
                    fetchForestTrees?.();
                }
                if (data?.message) setActiveBubble(data.message);
            },
            onManualChopCancelled: (data) => {
                if (manualChopActiveRef.current) exitManualChop('SERVER_CANCEL');
                if (data?.treeState && forestTreeManagerRef.current) {
                    forestTreeManagerRef.current.updateTree(
                        data.treeState.id,
                        data.treeState.state,
                        data.treeState.regrowAt,
                        data.treeState.choppingBy || null,
                        data.treeState.stage
                    );
                }
            },
            onForestTreesUpdate: (trees) => {
                if (!forestTreeManagerRef.current || !trees?.length) return;
                for (const tree of trees) {
                    forestTreeManagerRef.current.updateTree(
                        tree.id,
                        tree.state,
                        tree.regrowAt,
                        tree.choppingBy || null,
                        tree.stage
                    );
                }
            },
            onMushroomsUpdate: (mushrooms) => {
                if (!mushroomClusterManagerRef.current || !mushrooms?.length) return;
                mushroomClusterManagerRef.current.applySnapshot(mushrooms);
            },
            onPlayerSfx: (data) => {
                handleRemotePlayerSfx(data, posRef.current, playerId);
            },
            // Snowball throw callback - another player threw a snowball
            onSnowballThrown: (data) => {
                if (!sceneRef.current || !window.THREE) return;
                
                const THREE = window.THREE;
                
                // Create snowball mesh at received position (use cached geometry)
                const snowballGeom = window._cachedSnowballGeoSmall || new THREE.SphereGeometry(0.15, 8, 8);
                const snowballMat = window._cachedSnowballMatSmall || new THREE.MeshBasicMaterial({ color: 0xffffff });
                const snowball = new THREE.Mesh(snowballGeom, snowballMat);
                snowball.position.set(data.startX, data.startY, data.startZ);
                snowball.castShadow = false;
                snowball.userData.isSnowball = true;
                sceneRef.current.add(snowball);
                
                // Add to active snowballs with received velocity
                snowballsRef.current.push({
                    mesh: snowball,
                    velocity: {
                        x: data.velocityX,
                        y: data.velocityY,
                        z: data.velocityZ
                    },
                    startTime: Date.now(),
                    hasSplatted: false,
                    throwerId: data.playerId // Track who threw this snowball
                });
                
                console.log(`❄️ ${data.playerName} threw a snowball!`);
            },
            // Puffle update callback - sync puffle data from server responses
            onPuffleUpdated: (serverPuffleData) => {
                // Find and update the local puffle instance
                if (playerPuffleRef.current && playerPuffleRef.current.id === serverPuffleData.id) {
                    playerPuffleRef.current.syncFromServer(serverPuffleData);
                    console.log('🐾 Puffle synced from server:', serverPuffleData.name);
                }
                // Also update in owned puffles list
                setOwnedPuffles(prev => prev.map(p => 
                    p.id === serverPuffleData.id ? { ...p, ...serverPuffleData } : p
                ));
            }
        });
    }, [registerCallbacks, playerId, playerName]);
    
    // Handle player list changes - CREATE/REMOVE meshes only
    useEffect(() => {
        if (!sceneRef.current || !window.THREE || !buildPenguinMeshRef.current) return;
        
        const THREE = window.THREE;
        const scene = sceneRef.current;
        const meshes = otherPlayerMeshesRef.current;
        const playersData = playersDataRef.current;
        
        // Current player IDs from server
        const currentPlayerIds = new Set(playerList);
        
        // Remove meshes for players who left
        for (const [id, data] of meshes) {
            if (!currentPlayerIds.has(id)) {
                if (data.mesh) {
                    disposeThreeObject(data.mesh);
                    scene.remove(data.mesh);
                }
                if (data.bubble) scene.remove(data.bubble);
                if (data.puffleMesh) {
                    disposeThreeObject(data.puffleMesh);
                    scene.remove(data.puffleMesh);
                }
                // Clean up gold rain particle system
                if (data.goldRainSystem) {
                    data.goldRainSystem.dispose();
                }
                if (data.pvpLabelSprite) {
                    data.mesh?.remove(data.pvpLabelSprite);
                }
                // Clean up their trail points
                if (mountTrailSystemRef.current) {
                    mountTrailSystemRef.current.removePlayerTrails(id);
                }
                meshes.delete(id);
            }
        }
        
        // Create meshes for new players
        for (const id of playerList) {
            if (meshes.has(id)) continue; // Already has mesh
            
            const playerData = playersData.get(id);
            if (!playerData || !playerData.appearance) continue;
            
            console.log(`🐧 Creating mesh for ${playerData.name} (characterType=${playerData.appearance?.characterType || 'penguin'})`, playerData.puffle ? `with ${playerData.puffle.color} puffle` : '(no puffle)');
            
            const mesh = buildPenguinMeshRef.current(playerData.appearance);
            const isWagerBot = playerData.isBot || playerData.isPracticeBot || id === 'dev_bot_wager';
            if (isWagerBot) {
                mesh.scale.set(1.12, 1.12, 1.12);
            }
            mesh.position.set(
                playerData.position?.x || 0,
                0,
                playerData.position?.z || 0
            );
            const rotY = typeof playerData.rotation === 'object'
                ? (playerData.rotation?.y || 0)
                : (playerData.rotation || 0);
            mesh.rotation.y = rotY;
            
            // LOD: Calculate initial distance and set shadow state accordingly
            // This prevents all players from having shadows enabled on spawn
            const localPos = posRef.current || { x: 0, z: 0 };
            const playerPos = playerData.position || { x: 0, z: 0 };
            const initDx = playerPos.x - localPos.x;
            const initDz = playerPos.z - localPos.z;
            const initDistSq = initDx * initDx + initDz * initDz;
            const shouldCastShadow = performanceManager.shouldCastShadow(initDistSq);
            mesh.userData._lastShadowState = shouldCastShadow;
            mesh.traverse((child) => {
                if (child.isMesh) child.castShadow = shouldCastShadow;
            });
            
            scene.add(mesh);
            
            // Apply mount visibility from server appearance (explicit — undefined means visible)
            const mountVisible = playerData.appearance?.mountEnabled !== false;
            const mountGroup = mesh.getObjectByName('mount');
            if (mountGroup) {
                mountGroup.visible = mountVisible;
            }
            mesh.userData.mountVisible = mountVisible;

            syncRemotePlayerHeldItem({ mesh }, playerData, buildPartMergedRef.current);
            
            // Diamond Flippers tier from server + manual style override
            const nameSprite = createNameSprite(playerData.name || 'Player', playerData);
            if (nameSprite) {
                const nameHeight = playerData.appearance?.characterType === 'marcus' ? NAME_HEIGHT_MARCUS : playerData.appearance?.characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
                nameSprite.position.set(0, nameHeight, 0);
                mesh.add(nameSprite);
            }

            let pvpLabelSprite = null;
            if (isWagerBot) {
                pvpLabelSprite = createPvpLabelSprite();
                if (pvpLabelSprite) {
                    const nameHeight = playerData.appearance?.characterType === 'marcus' ? NAME_HEIGHT_MARCUS : playerData.appearance?.characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
                    pvpLabelSprite.position.set(0, nameHeight + 1.4, 0);
                    mesh.add(pvpLabelSprite);
                }
            }
            
            // Nametag particles are created lazily in the game loop (syncMeshNametagParticles)
            let goldRainSystem = null;
            
            // Create puffle if player has one
            let puffleMesh = null;
            let puffleInstance = null;
            if (playerData.puffle) {
                console.log(`🐾 Creating puffle mesh: ${playerData.puffle.color}`);
                puffleInstance = new Puffle({
                    color: playerData.puffle.color,
                    name: playerData.puffle.name,
                    equippedAccessories: playerData.puffle.equippedAccessories || {},
                    equippedToy: playerData.puffle.equippedToy,
                    ownedAccessories: playerData.puffle.ownedAccessories,
                });
                puffleMesh = puffleInstance.createMesh(THREE);
                // Set initial puffle position
                const pufflePos = playerData.pufflePosition || {
                    x: (playerData.position?.x || 0) + 1.5,
                    z: (playerData.position?.z || 0) + 1.5
                };
                puffleMesh.position.set(pufflePos.x, 0.5, pufflePos.z);
                scene.add(puffleMesh);
                console.log(`🐾 Puffle mesh added at`, pufflePos);
            }
            
            // OPTIMIZATION: Check if player has animated cosmetics
            const appearance = playerData.appearance || {};
            const hasAnimatedCosmetics = playerHasAnimatedCosmetics(appearance);
            
            meshes.set(id, { 
                mesh, 
                bubble: null, 
                puffleMesh,
                puffleInstance: puffleInstance,
                nameSprite,
                pvpLabelSprite,
                goldRainSystem, // World-space gold rain for Day 1 nametag
                // Initialize emote from playerData (player might already be sitting)
                currentEmote: playerData.emote || null,
                emoteStartTime: playerData.emoteStartTime || Date.now(),
                // OPTIMIZATION: Pre-cache whether this player has animated cosmetics
                hasAnimatedCosmetics
            });
            
            // Clear pending flags — mesh is now in the scene
            playerData.needsMesh = false;
            playerData.needsMeshRebuild = false;
            console.log(`🐧 Created mesh for ${playerData.name}, emote: ${playerData.emote}, seatedOnFurniture: ${playerData.seatedOnFurniture}`);
        }
    }, [playerList, createNameSprite, createPvpLabelSprite, meshBuilderReady, meshSyncVersion]);
    
    // Notify server after world spawn is ready (posRef is stale if sent before initWorld finishes)
    useEffect(() => {
        if (!connected || !playerId || !meshBuilderReady || !posRef.current) return;

        const pos = posRef.current;
        const last = lastRoomNotifyRef.current;
        if (
            last.room === room
            && last.x != null
            && Math.abs(last.x - pos.x) < 0.5
            && Math.abs(last.z - pos.z) < 0.5
        ) {
            return;
        }

        lastRoomNotifyRef.current = { room, x: pos.x, z: pos.z };
        mpChangeRoom(
            room,
            isTravelLobbyRoom(room) ? { x: pos.x, y: pos.y ?? 0, z: pos.z, absolute: true } : pos
        );
    }, [room, connected, playerId, mpChangeRoom, meshBuilderReady, customSpawnPos]);
    
    // Track igloo room entry/exit for eligibility checks
    useEffect(() => {
        const isIgloo = room?.startsWith('igloo');
        
        if (isIgloo) {
            // Entering an igloo - set up eligibility tracking with kick callback
            const handleKick = (reason) => {
                console.log('🚪 Kicked from igloo due to:', reason);
                // Show notification
                window.dispatchEvent(new CustomEvent('notification', {
                    detail: {
                        type: 'warning',
                        message: reason === 'AUTH_LOST' 
                            ? '🔌 Wallet disconnected - returning to town' 
                            : '🚫 Access to this igloo has been revoked',
                        duration: 5000
                    }
                }));
                // Return to town
                if (onChangeRoom) {
                    onChangeRoom('town', null);
                }
            };
            enterIglooRoom(room, handleKick);
        } else {
            // Left an igloo (or in a non-igloo room)
            leaveIglooRoom();
        }
        
        // Cleanup when leaving
        return () => {
            if (isIgloo) {
                leaveIglooRoom();
            }
        };
    }, [room, enterIglooRoom, leaveIglooRoom, onChangeRoom]);
    
    // Reset casino zoom state when changing rooms (so zoom triggers properly on re-entry)
    useEffect(() => {
        const prevRoom = previousRoomRef.current;
        const enteringTransit = isTravelLobbyRoom(room);
        const leavingTransit = isTravelLobbyRoom(prevRoom) && !enteringTransit;
        const controls = controlsRef.current;

        wasInCasinoRef.current = false;

        if (enteringTransit) {
            if (controls) {
                controls.minDistance = TRAVEL_LOBBY_CAMERA.minDistance;
                controls.maxDistance = TRAVEL_LOBBY_CAMERA.maxDistance;
            }
            casinoZoomTransitionRef.current = {
                active: true,
                targetDistance: TRAVEL_LOBBY_CAMERA.targetDistance,
                progress: 0,
            };
            setTimeout(() => {
                cameraControllerRef.current?.snapToTarget();
            }, 100);
        } else if (leavingTransit) {
            if (controls) {
                controls.minDistance = TRAVEL_LOBBY_CAMERA.defaultMinDistance;
                controls.maxDistance = TRAVEL_LOBBY_CAMERA.defaultMaxDistance;
            }
            casinoZoomTransitionRef.current = {
                active: true,
                targetDistance: TRAVEL_LOBBY_CAMERA.defaultTargetDistance,
                progress: 0,
            };
        } else {
            casinoZoomTransitionRef.current = { active: false, targetDistance: TRAVEL_LOBBY_CAMERA.defaultTargetDistance, progress: 0 };
        }

        // If entering town and spawning inside the casino, immediately trigger zoom
        if (room === 'town') {
            // Small delay to let position settle after room change
            setTimeout(() => {
                const pos = posRef.current;
                if (pos) {
                    // Check if player spawned inside casino building bounds
                    const casinoX = CENTER_X - 42;
                    const casinoZ = CENTER_Z + 15;
                    const dx = pos.x - casinoX;
                    const dz = pos.z - casinoZ;
                    const isInCasino = Math.abs(dx) < 20 && Math.abs(dz) < 20 && pos.y < 15;

                    if (isInCasino) {
                        wasInCasinoRef.current = true;
                        casinoZoomTransitionRef.current = {
                            active: true,
                            targetDistance: 10,
                            progress: 0
                        };
                    }
                }
            }, 100);
        }

        previousRoomRef.current = room;
    }, [room]);
    
    // Update puffle on server when changed
    useEffect(() => {
        if (connected && playerId) {
            const puffleData = playerPuffle ? {
                id: playerPuffle.id,
                color: playerPuffle.color,
                name: playerPuffle.name
            } : null;
            mpUpdatePuffle(puffleData);
        }
    }, [playerPuffle, connected, playerId]);
    
    // Mobile directional button handlers
    const handleMobileButtonDown = (direction) => {
        mobileControlsRef.current[direction] = true;
    };
    
    const handleMobileButtonUp = (direction) => {
        mobileControlsRef.current[direction] = false;
    };
    
    return (
        <div className="relative w-full h-full bg-black select-none" style={{ cursor: isSnowballMode ? 'crosshair' : hoverCursor }}>
             <div ref={mountRef} className="absolute inset-0" />
             
             {/* Connection Error Display */}
             {connectionError && (
                <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-8">
                    <div className="text-6xl mb-6">⚠️</div>
                    <h2 className="text-red-400 text-xl retro-text text-center mb-4">Connection Error</h2>
                    <p className="text-white text-center text-sm mb-2">{connectionError.message}</p>
                    {connectionError.code === 'TOO_MANY_CONNECTIONS' && (
                        <p className="text-gray-400 text-center text-xs">
                            Please close other browser tabs running this game.
                        </p>
                    )}
                    <button 
                        className="mt-6 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl retro-text text-sm"
                        onClick={() => window.location.reload()}
                    >
                        Retry Connection
                    </button>
                </div>
             )}
             
             {/* Mobile Portrait Mode - No longer blocking, game works in portrait now */}
             
             {/* Ice Fishing Minigame Overlay */}
             {fishingGameActive && fishingGameSpot && (
                <IceFishingGame
                    spotId={fishingGameSpot.id}
                    holeStatus={fishingGameSpot.holeStatus}
                    playerName={playerName}
                    isDemo={fishingGameSpot.isDemo}
                    fishingResult={fishingResult}
                    onCatch={handleFishingCatch}
                    onMiss={handleFishingMiss}
                    onClose={handleFishingGameClose}
                />
             )}
             
             {/* Casino Blackjack PvE Game Overlay */}
             {blackjackGameActive && blackjackTableId && room === 'casino_game_room' && (
                <CasinoBlackjack
                    tableId={blackjackTableId}
                    seatIndex={0}
                    isDemo={!isAuthenticated}
                    onLeave={handleBlackjackLeave}
                />
             )}
             
             {/* Arcade Games Overlays */}
             {arcadeGameActive && arcadeGameType === 'battleship' && (
                <BattleshipGame
                    onClose={handleArcadeGameClose}
                />
             )}
             {arcadeGameActive && arcadeGameType === 'flappy_penguin' && (
                <FlappyPenguinGame
                    onClose={handleArcadeGameClose}
                />
             )}
             {arcadeGameActive && arcadeGameType === 'snake' && (
                <SnakeGame
                    onClose={handleArcadeGameClose}
                />
             )}
             {arcadeGameActive && arcadeGameType === 'pong' && (
                <PongGame
                    onClose={handleArcadeGameClose}
                />
             )}
             {arcadeGameActive && arcadeGameType === 'memory' && (
                <MemoryMatchGame
                    onClose={handleArcadeGameClose}
                />
             )}
             {arcadeGameActive && arcadeGameType === 'thin_ice' && (
                <ThinIceGame
                    onClose={handleArcadeGameClose}
                />
             )}
             {arcadeGameActive && arcadeGameType === 'avalanche_run' && (
                <AvalancheRunGame
                    onClose={handleArcadeGameClose}
                />
             )}
             
             {/* Banner Zoom Overlay */}
             <BannerZoomOverlay
                isOpen={bannerZoomOpen}
                onClose={() => {
                    setBannerZoomOpen(false);
                    setBannerZoomData(null);
                    bannerZoomRenderFn.current = null;
                }}
                bannerData={bannerZoomData}
                renderCanvas={bannerZoomRenderFn.current}
             />
             
             {/* Igloo Rental Guide */}
             <IglooRentalGuide
                isOpen={iglooRentalGuideOpen}
                onClose={() => setIglooRentalGuideOpen(false)}
             />
             
             {/* Gacha Drop Rates Guide */}
             <GachaDropRatesGuide
                isOpen={gachaDropRatesGuideOpen}
                onClose={() => setGachaDropRatesGuideOpen(false)}
             />
             
             {/* Casino TV is now rendered in 3D space with real data from DexScreener API */}
             
             {/* Mobile PUBG-style Joystick - LEFT side (or right if left-handed) */}
             {/* Supports both portrait and landscape modes */}
             {isMobile && (
                <VirtualJoystick
                    onMove={(input) => { joystickInputRef.current = input; }}
                    size={isLandscape ? (window.innerWidth >= 768 ? 150 : 120) : 100}
                    position={gameSettings.leftHanded ? 'right' : 'left'}
                    deadzone={0.1}
                    isPortrait={!isLandscape}
                />
             )}
             
             {/* Mobile Touch Camera Control - covers entire screen, joystick handles its own touches */}
             {isMobile && (
                <TouchCameraControl
                    onRotate={(delta) => { cameraRotationRef.current = delta; }}
                    sensitivity={gameSettings.cameraSensitivity || 0.3}
                />
             )}
             
             {/* Mobile controls — jump + actions stacked relative to each other (no fixed overlap) */}
             {isMobile && (
                <div
                    className={`absolute bottom-4 z-30 flex flex-col items-center touch-none ${
                        gameSettings.leftHanded ? 'left-3' : 'right-3'
                    }`}
                    style={{ gap: isLandscape ? '0.875rem' : '0.75rem' }}
                >
                    {/* Jump */}
                    <button
                        ref={jumpButtonRef}
                        type="button"
                        className={`${
                            isLandscape ? 'h-20 w-20' : 'h-[4.5rem] w-[4.5rem]'
                        } flex shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-green-600/80 transition-all active:scale-90 active:bg-green-500 touch-none`}
                        aria-label="Jump"
                    >
                        <span className={isLandscape ? 'text-3xl' : 'text-2xl'}>⬆️</span>
                    </button>

                    {/* Chat / emote / snowball */}
                    <div
                        className="flex shrink-0 flex-col items-center"
                        style={{ gap: isLandscape ? '0.625rem' : '0.5rem' }}
                    >
                        <button
                            type="button"
                            className={`${
                                isLandscape ? 'h-12 w-12' : 'h-11 w-11'
                            } flex items-center justify-center rounded-full border-2 border-white/40 bg-cyan-600/80 transition-transform active:scale-90`}
                            onClick={() => setMobileChatOpen(true)}
                            aria-label="Chat"
                        >
                            <span className={isLandscape ? 'text-xl' : 'text-lg'}>💬</span>
                        </button>

                        <button
                            type="button"
                            className={`${
                                isLandscape ? 'h-12 w-12' : 'h-11 w-11'
                            } flex items-center justify-center rounded-full border-2 border-white/40 bg-purple-600/80 transition-transform active:scale-90`}
                            onClick={() => { setEmoteWheelOpen(true); emoteSelectionRef.current = -1; setEmoteWheelSelection(-1); }}
                            aria-label="Emotes"
                        >
                            <span className={isLandscape ? 'text-xl' : 'text-lg'}>😄</span>
                        </button>

                        <button
                            type="button"
                            className={`${
                                isLandscape ? 'h-12 w-12' : 'h-11 w-11'
                            } flex items-center justify-center rounded-full border-2 ${
                                isSnowballMode ? 'animate-pulse border-blue-300 bg-blue-500' : 'border-white/40 bg-white/80'
                            } transition-all active:scale-90`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const newMode = !isSnowballModeRef.current;
                                isSnowballModeRef.current = newMode;
                                setIsSnowballMode(newMode);
                            }}
                            aria-label="Snowball"
                        >
                            <span className={isLandscape ? 'text-xl' : 'text-lg'}>❄️</span>
                        </button>
                    </div>
                </div>
             )}
             
             {/* Snowball Mode Indicator */}
             {isSnowballMode && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none">
                    <div className="bg-gradient-to-r from-blue-500/95 to-cyan-500/95 backdrop-blur-sm px-5 py-3 rounded-2xl border border-white/30 shadow-xl flex flex-col items-center gap-1 animate-pulse">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">❄️</span>
                            <span className="text-white text-base font-bold">{t('snowball.mode')}</span>
                            <span className="text-2xl">🎯</span>
                        </div>
                        <span className="text-white/80 text-sm">
                            {isMobile ? t('snowball.tapLocation') || 'Tap where to throw!' : t('snowball.clickToThrow')}
                        </span>
                    </div>
                </div>
             )}
             
             {/* PUBG-style compass — top center */}
             <WorldCompass
                yawRef={rotRef}
                positionRef={posRef}
                room={room}
                isPortrait={isMobile && !isLandscape}
                visible={
                    !blackjackGameActive
                    && !arcadeGameActive
                    && !fishingGameActive
                    && !isInMatch
                    && !showSettings
                }
             />

             {/* HUD - Top Right */}
             <GameHUD 
                onOpenSettings={() => setShowSettings(true)}
                isMobile={isMobile}
                playerCount={playerCount}
                totalPlayerCount={totalPlayerCount}
                onRequestAuth={onRequestAuth}
                currentRoom={room}
                isInsideOwnedIgloo={isInsideOwnedIgloo}
                onOpenIglooSettings={() => openSettingsPanel(room)}
             />
             
             {/* Door/Portal Prompt - Use IglooPortal for igloos, regular Portal otherwise */}
             {/* Always get fresh iglooData from context to ensure real-time updates */}
             {nearbyPortal && (ROOM_PORTALS[room] || []).some((p) => p.id === nearbyPortal.id) && nearbyPortal?.isIgloo ? (
                <IglooPortal
                    portal={nearbyPortal}
                    iglooData={getIgloo(nearbyPortal.targetRoom)}
                    isNearby={!!nearbyPortal}
                    onEnter={handlePortalEnter}
                    onViewDetails={() => openDetailsPanel(nearbyPortal.targetRoom)}
                    onViewRequirements={() => openRequirementsPanel(nearbyPortal.targetRoom)}
                    walletAddress={walletAddress}
                    isAuthenticated={isAuthenticated}
                    userClearance={userClearance?.[nearbyPortal?.targetRoom]}
                />
             ) : nearbyPortal && (ROOM_PORTALS[room] || []).some((p) => p.id === nearbyPortal.id) ? (
                <Portal 
                    name={nearbyPortal?.name}
                    emoji={nearbyPortal?.emoji}
                    description={nearbyPortal?.description}
                    isNearby={!!nearbyPortal}
                    onEnter={handlePortalEnter}
                    color={nearbyPortal?.targetRoom || nearbyPortal?.minigame || nearbyPortal?.teleportToRoof || nearbyPortal?.action ? 'green' : 'gray'}
                    hasGame={!!(nearbyPortal?.targetRoom || nearbyPortal?.minigame || nearbyPortal?.teleportToRoof || nearbyPortal?.action)}
                />
             ) : null}
             
             {/* Gold Lobby Slot Prompt (Snow Forts casino) */}
             {goldSlotInteraction && !nearbyPortal && room === 'snow_forts' && (
                <div
                    className={`world-interaction-prompt absolute bg-gradient-to-b from-amber-900/95 to-black/95 backdrop-blur-sm rounded-xl border text-center z-20 shadow-lg border-yellow-500/50 shadow-yellow-500/20 ${
                        isMobile
                            ? isLandscape
                                ? 'bottom-[180px] right-28 p-3'
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    <div className="text-3xl mb-1">🎰</div>
                    {(goldSlotSpinning || goldSlotInteraction.isSpinning) ? (
                        <p className="retro-text mb-2 text-sm text-yellow-300 animate-pulse">
                            🎰 SPINNING...
                        </p>
                    ) : (
                        <p className={`retro-text mb-2 text-sm ${goldSlotInteraction.canSpin ? 'text-yellow-400' : 'text-gray-400'}`}>
                            {goldSlotInteraction.prompt}
                        </p>
                    )}
                    {goldSlotInteraction.canSpin && !goldSlotSpinning && (
                        <div className="flex items-center gap-2 mb-2">
                            <label className="text-xs text-gray-400">Bet</label>
                            <input
                                type="number"
                                min={GOLD_SLOT_BET_MIN}
                                max={GOLD_SLOT_BET_MAX}
                                value={goldSlotBet}
                                onChange={(e) => setGoldSlotBet(clampGoldSlotBet(e.target.value))}
                                className="w-16 px-2 py-1 rounded bg-black/50 border border-yellow-500/40 text-yellow-200 text-sm text-center"
                            />
                            <span className="text-xs text-gray-500">g (max {GOLD_SLOT_BET_MAX})</span>
                        </div>
                    )}
                    {goldSlotInteraction.canSpin && !goldSlotSpinning && (
                        <button
                            className="w-full px-6 py-2 font-bold rounded-lg retro-text text-sm bg-gradient-to-b from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-black transition-all active:scale-95 shadow-lg"
                            onClick={handleGoldSlotSpin}
                            disabled={goldSlotSpinning}
                        >
                            {`🎰 SPIN (${clampGoldSlotBet(goldSlotBet)}g)`}
                        </button>
                    )}
                    <p className="text-gray-500 text-xs mt-2">🍒🍋🍊 3× match pays · Gold 7 = 200×</p>
                </div>
             )}

             {goldSlotResult && (
                <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <div className={`px-6 py-3 rounded-xl border backdrop-blur-md shadow-xl text-center ${
                        goldSlotResult.error
                            ? 'bg-red-900/90 border-red-400 text-red-200'
                            : goldSlotResult.payout > 0
                            ? 'bg-green-900/90 border-green-400 text-green-200'
                            : 'bg-gray-900/90 border-gray-500 text-gray-300'
                    }`}>
                        <p className="font-bold text-lg">
                            {goldSlotResult.error
                                ? `❌ ${goldSlotResult.message || 'Spin failed'}`
                                : goldSlotResult.payout > 0
                                ? `🎉 Won ${goldSlotResult.payout} gold!`
                                : 'No win — try again!'}
                        </p>
                        {goldSlotResult.isJackpot && !goldSlotResult.error && (
                            <p className="text-yellow-300 text-sm animate-pulse">💰 JACKPOT! 💰</p>
                        )}
                    </div>
                </div>
             )}

             {/* Slot Machine Interaction Prompt */}
             {slotInteraction && !goldSlotInteraction && !nearbyPortal && room === 'casino_game_room' && (
                <div 
                    className={`world-interaction-prompt absolute bg-gradient-to-b from-purple-900/95 to-black/95 backdrop-blur-sm rounded-xl border text-center z-20 shadow-lg ${
                        slotInteraction.isDemo 
                            ? 'border-green-500/50 shadow-green-500/20' 
                            : 'border-yellow-500/50 shadow-yellow-500/20'
                    } ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[180px] right-28 p-3' 
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    {/* Slot machine icon */}
                    <div className="text-3xl mb-1">{slotInteraction.isDemo ? '🎁' : '🎰'}</div>
                    
                    {/* Demo badge for guests */}
                    {slotInteraction.isDemo && (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-full px-3 py-0.5 mb-2 inline-block">
                            <span className="text-green-400 text-xs font-bold">✨ FREE DEMO</span>
                        </div>
                    )}
                    
                    {/* Prompt text */}
                    <p className={`retro-text mb-2 text-sm ${
                        slotInteraction.isDemo ? 'text-green-400' : 
                        slotInteraction.canSpin ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                        {slotInteraction.prompt}
                    </p>
                    
                    {/* Spin Button (only if can spin) */}
                    {slotInteraction.canSpin && (
                        <button
                            className={`w-full px-6 py-2 font-bold rounded-lg retro-text text-sm transition-all active:scale-95 shadow-lg ${
                                slotInteraction.isDemo
                                    ? 'bg-gradient-to-b from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 text-black'
                                    : 'bg-gradient-to-b from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-black'
                            }`}
                            onClick={handleSlotSpin}
                            disabled={slotSpinning}
                        >
                            {slotSpinning ? '🎰 SPINNING...' : slotInteraction.isDemo ? '🎁 TRY FREE!' : '🎰 SPIN!'}
                        </button>
                    )}
                    
                    {/* FOMO hint for guests */}
                    {slotInteraction.isDemo && (
                        <p className="text-xs text-yellow-400/80 mt-2">🔑 Login to win real gold!</p>
                    )}
                </div>
             )}
             
             {/* Blackjack Table Interaction Prompt - Positioned ABOVE sit prompts */}
             {blackjackInteraction && !slotInteraction && !goldSlotInteraction && !nearbyPortal && room === 'casino_game_room' && !blackjackGameActive && (
                <div 
                    className={`world-interaction-prompt absolute bg-gradient-to-b from-green-900/95 to-emerald-950/95 backdrop-blur-sm rounded-xl border text-center z-30 shadow-lg ${
                        blackjackInteraction.isDemo
                            ? 'border-green-500/50 shadow-green-500/20'
                            : 'border-emerald-500/50 shadow-emerald-500/20'
                    } ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[280px] right-28 p-3' 
                                : 'bottom-[280px] left-1/2 -translate-x-1/2 p-3 max-w-[90vw]'
                            : 'bottom-44 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    <div className={`mb-1 ${isMobile && !isLandscape ? 'text-2xl' : 'text-3xl'}`}>
                        {blackjackInteraction.isDemo ? '🎁' : '🂡'}
                    </div>

                    {blackjackInteraction.isDemo && (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-full px-3 py-0.5 mb-2 inline-block">
                            <span className="text-green-400 text-xs font-bold">✨ FREE DEMO</span>
                        </div>
                    )}
                    
                    <div className={`rounded-full px-3 py-0.5 mb-2 inline-block ${
                        blackjackInteraction.isDemo
                            ? 'bg-green-500/20 border border-green-500/50'
                            : 'bg-yellow-500/20 border border-yellow-500/50'
                    }`}>
                        <span className={`font-bold ${isMobile && !isLandscape ? 'text-[10px]' : 'text-xs'} ${
                            blackjackInteraction.isDemo ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                            {blackjackInteraction.isDemo ? '🎮 Demo Chips' : `💰 ${blackjackInteraction.balance?.toLocaleString() || 0}`}
                        </span>
                    </div>
                    
                    <p className={`retro-text mb-2 ${isMobile && !isLandscape ? 'text-xs' : 'text-sm'} ${
                        blackjackInteraction.isDemo ? 'text-green-400' :
                        blackjackInteraction.canPlay ? 'text-emerald-400' : 'text-gray-400'
                    }`}>
                        {blackjackInteraction.isDemo
                            ? 'Fun play — no real gold wagered'
                            : blackjackInteraction.canPlay ? `Min ${PVE_BJ_MIN_BET}g • Max ${PVE_BJ_MAX_BET}g` : `Need ${PVE_BJ_MIN_BET}+ coins to play`}
                    </p>
                    
                    {blackjackInteraction.canPlay && (
                        <button
                            className={`w-full font-bold rounded-lg retro-text transition-all active:scale-95 shadow-lg ${
                                blackjackInteraction.isDemo
                                    ? 'bg-gradient-to-b from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 text-black'
                                    : 'bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-black'
                            } ${isMobile && !isLandscape ? 'px-4 py-2 text-xs' : 'px-6 py-2 text-sm'}`}
                            onClick={handleBlackjackStart}
                        >
                            {blackjackInteraction.isDemo ? '🎁 TRY FREE!' : '🂡 PLAY BLACKJACK'}
                        </button>
                    )}
                    
                    {!blackjackInteraction.canPlay && (
                        <p className={`text-yellow-400/80 mt-2 ${isMobile && !isLandscape ? 'text-[10px]' : 'text-xs'}`}>
                            Earn coins at slot machines!
                        </p>
                    )}

                    {blackjackInteraction.isDemo && (
                        <p className="text-xs text-yellow-400/80 mt-2">🔑 Login to play for real gold!</p>
                    )}
                </div>
             )}
             
             {/* Starter rod pickup (snow forts, client-only prop) */}
             {starterRodInteraction && room === 'snow_forts' && !fishingInteraction && (
                <div
                    className={`world-interaction-prompt absolute bg-gradient-to-b from-cyan-900/95 to-blue-900/95 backdrop-blur-sm rounded-xl border border-cyan-400/50 text-center z-20 shadow-lg shadow-cyan-500/20 ${
                        isMobile
                            ? isLandscape
                                ? 'bottom-[180px] right-28 p-3'
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    <div className="text-3xl mb-1">🎣</div>
                    <p className="retro-text mb-2 text-sm text-cyan-300">{starterRodInteraction.prompt}</p>
                    <button
                        type="button"
                        onClick={handleStarterRodClaim}
                        className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white text-sm font-bold transition-colors"
                    >
                        Pick up Basic Rod
                    </button>
                </div>
             )}

             {/* Ice Fishing Interaction UI */}
             {fishingInteraction && (room === 'town' || room === 'snow_forts') && (
                <div 
                    className={`world-interaction-prompt absolute bg-gradient-to-b from-blue-900/95 to-cyan-900/95 backdrop-blur-sm rounded-xl border text-left z-20 shadow-lg ${
                        fishingInteraction.isDemo 
                            ? 'border-green-500/50 shadow-green-500/20' 
                            : 'border-cyan-500/50 shadow-cyan-500/20'
                    } ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[180px] right-28 p-3 w-64' 
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3 w-[min(100vw-2rem,300px)]'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4 w-72'
                    }`}
                >
                    <div className="text-3xl mb-1">{fishingInteraction.isDemo ? '🎁' : '🎣'}</div>
                    
                    {/* Demo badge for guests */}
                    {fishingInteraction.isDemo && (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-full px-3 py-0.5 mb-2 inline-block">
                            <span className="text-green-400 text-xs font-bold">✨ FREE DEMO</span>
                        </div>
                    )}
                    
                    {/* Current state indicator */}
                    {fishingInteraction.isLocalFishing && (
                        <div className={`rounded-full px-3 py-0.5 mb-2 inline-block ${
                            fishingInteraction.currentState === 'bite' 
                                ? 'bg-red-500/30 border border-red-500/50 animate-pulse' 
                                : 'bg-blue-500/20 border border-blue-500/50'
                        }`}>
                            <span className={`text-xs font-bold ${
                                fishingInteraction.currentState === 'bite' ? 'text-red-400' : 'text-blue-400'
                            }`}>
                                {fishingInteraction.currentState === 'waiting' && `🎣 ${t('fishing.waiting')}`}
                                {fishingInteraction.currentState === 'bite' && `🐟 ${t('fishing.fishOn')}`}
                                {fishingInteraction.currentState === 'reeling' && `🎣 ${t('fishing.reeling')}`}
                                {fishingInteraction.currentState === 'casting' && `🎣 ${t('fishing.casting')}`}
                            </span>
                        </div>
                    )}
                    
                    {/* Hole stock — visible before casting */}
                    {!fishingInteraction.isLocalFishing && fishingInteraction.holeStatus && (
                        <div className="mb-2 text-left w-full min-w-[200px] max-w-[min(100vw-3rem,280px)] mx-auto">
                            <p className={`text-[10px] uppercase tracking-wide mb-1 ${
                                fishingInteraction.holeStatus.minnowOnly ? 'text-amber-400' : 'text-cyan-300/80'
                            }`}>
                                {fishingInteraction.holeStatus.minnowOnly
                                    ? `⚠️ ${t('fishing.holeDepleted')}`
                                    : `🌊 ${t('fishing.holeStock')}`}
                            </p>
                            {fishingInteraction.stockSummary && (
                                <p className={`text-[11px] mb-1.5 ${
                                    fishingInteraction.holeStatus.minnowOnly ? 'text-amber-300/90' : 'text-slate-300'
                                }`}>
                                    {fishingInteraction.stockSummary}
                                </p>
                            )}
                            <div className="space-y-0.5">
                                {getHoleStockRows(fishingInteraction.holeStatus).map((row) => (
                                    <div
                                        key={row.tier}
                                        className={`flex items-center justify-between gap-2 text-[11px] px-2 py-0.5 rounded bg-black/30 border border-white/10 ${
                                            row.depleted ? 'opacity-50' : ''
                                        }`}
                                        title={row.depleted && row.regrowInMs ? `${row.label} regrows in ${formatRegrowEta(row.regrowInMs)}` : row.label}
                                    >
                                        <span className={row.colorClass}>{row.label}</span>
                                        <span className={`tabular-nums text-white/80 ${row.depleted ? 'line-through' : ''}`}>
                                            {row.current}/{row.max}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Prompt text */}
                    <p className={`retro-text mb-2 text-sm ${
                        fishingInteraction.currentState === 'bite' ? 'text-red-400 font-bold animate-bounce' :
                        fishingInteraction.isDemo ? 'text-green-400' : 
                        fishingInteraction.canFish ? 'text-cyan-400' : 'text-gray-400'
                    }`}>
                        {fishingInteraction.prompt}
                    </p>
                    
                    {/* Fish/Catch Button */}
                    {fishingInteraction.canFish && (
                        <button
                            className={`w-full px-6 py-2 font-bold rounded-lg retro-text text-sm transition-all active:scale-95 shadow-lg ${
                                fishingInteraction.currentState === 'bite'
                                    ? 'bg-gradient-to-b from-red-400 to-red-600 hover:from-red-300 hover:to-red-500 text-white animate-pulse'
                                    : fishingInteraction.isDemo
                                        ? 'bg-gradient-to-b from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 text-black'
                                        : 'bg-gradient-to-b from-cyan-400 to-cyan-600 hover:from-cyan-300 hover:to-cyan-500 text-black'
                            }`}
                            onClick={handleFishingAction}
                        >
                            {fishingInteraction.isLocalFishing 
                                ? (fishingInteraction.currentState === 'bite' ? `🐟 ${t('fishing.catch')}` : `🎣 ${t('fishing.inProgress')}`)
                                : (fishingInteraction.isDemo ? `🎁 ${t('fishing.tryFree')}` : `🎣 ${t('interact.fish')}`)
                            }
                        </button>
                    )}
                    
                    {/* FOMO hint for guests */}
                    {fishingInteraction.isDemo && (
                        <p className="text-xs text-cyan-400/80 mt-2">🔑 {t('fishing.loginToEarn')}</p>
                    )}
                </div>
             )}

             {/* Forest woodcutting interaction */}
             {(woodcuttingInteraction || woodChopProgress) && room === 'forest_trails' && !fishingInteraction && !manualChopActive && (
                <div
                    className={`world-interaction-prompt absolute bg-gradient-to-b from-emerald-950/95 to-green-900/95 backdrop-blur-sm rounded-xl border border-emerald-500/40 text-center z-20 shadow-lg shadow-emerald-500/10 ${
                        isMobile
                            ? isLandscape
                                ? 'bottom-[180px] right-28 p-3'
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    <div className="text-3xl mb-1">🪓</div>
                    {woodChopProgress ? (
                        <>
                            <p className="text-emerald-300 retro-text text-sm mb-2">
                                {woodChopProgress.finishing ? 'Gathering wood…' : 'Chopping…'}
                            </p>
                            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-lime-400 transition-all duration-100"
                                    style={{ width: `${Math.round((woodChopProgress.progress || 0) * 100)}%` }}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <p className={`retro-text mb-2 text-sm ${woodcuttingInteraction?.canChop ? 'text-emerald-300' : 'text-gray-400'}`}>
                                {woodcuttingInteraction?.prompt}
                            </p>
                            {woodcuttingInteraction?.canChop && (
                                <button
                                    type="button"
                                    className="w-full px-6 py-2 font-bold rounded-lg retro-text text-sm bg-gradient-to-b from-emerald-400 to-green-700 hover:from-emerald-300 hover:to-green-600 text-black transition-all active:scale-95"
                                    onClick={handleWoodChopAction}
                                >
                                    🪵 Chop wood
                                </button>
                            )}
                        </>
                    )}
                </div>
             )}

             {forestStumpHover && room === 'forest_trails' && !manualChopActive && !woodcuttingInteraction && (
                <div
                    className={`absolute bg-black/75 backdrop-blur-sm rounded-lg border border-gray-500/50 text-center z-20 pointer-events-none px-4 py-2 ${
                        isMobile ? 'bottom-[150px] left-1/2 -translate-x-1/2' : 'bottom-20 left-1/2 -translate-x-1/2'
                    }`}
                >
                    <p className="text-gray-200 retro-text text-xs">
                        🌱 {formatForestRegrowCountdown(forestStumpHover.regrowAt)}
                    </p>
                </div>
             )}

             {manualChopActive && room === 'forest_trails' && (
                <div
                    className={`world-interaction-prompt absolute bg-gradient-to-b from-amber-950/90 to-emerald-950/90 backdrop-blur-sm rounded-xl border border-amber-500/40 text-center z-20 pointer-events-none ${
                        isMobile
                            ? isLandscape
                                ? 'bottom-[180px] right-28 p-3'
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    <div className="text-3xl mb-1">🪓</div>
                    <p className="text-emerald-200 retro-text text-sm mb-1">
                        {isMobile ? 'Touch & drag across the tree to chop' : 'Click & drag across the tree to chop'}
                    </p>
                    <p className="text-amber-200/80 text-xs">
                        {isMobile ? 'Swing across the trunk' : 'Esc to cancel'}
                    </p>
                </div>
             )}

             {scavengeInteraction && (room === 'snow_forts' || room === 'town') && !nearbyPortal && !fishingGameActive && (
                <div className={`world-interaction-prompt absolute bg-black/80 backdrop-blur-sm rounded-xl border text-center z-20 ${
                    scavengeInteraction.canScavenge ? 'border-amber-500/40' : 'border-gray-600/50'
                } ${
                    isMobile ? 'bottom-[170px] left-1/2 -translate-x-1/2 p-3' : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                }`}>
                    <div className="text-3xl mb-1">🗑️</div>
                    <p className={`retro-text mb-2 text-sm ${
                        scavengeInteraction.canScavenge ? 'text-amber-200' : 'text-gray-400'
                    }`}>
                        {scavengeInteraction.canScavenge
                            ? getScavengeSpotPrompt(scavengeInteraction.spotId, { isMobile })
                            : `Already searched — ready in ${formatScavengeCountdown(scavengeInteraction.remainingSeconds)}`}
                    </p>
                    <button
                        type="button"
                        disabled={!scavengeInteraction.canScavenge}
                        className={`w-full px-6 py-2 font-bold rounded-lg retro-text text-sm transition-all ${
                            scavengeInteraction.canScavenge
                                ? 'bg-gradient-to-b from-amber-400 to-orange-700 text-black hover:from-amber-300 hover:to-orange-600 active:scale-95'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-70'
                        }`}
                        onClick={handleScavengeAction}
                    >
                        {scavengeInteraction.canScavenge
                            ? 'Search trash'
                            : formatScavengeCountdown(scavengeInteraction.remainingSeconds)}
                    </button>
                </div>
             )}

             {(mushroomInteraction || mushroomHarvestProgress) && room === 'forest_trails' && !nearbyPortal && !woodcuttingInteraction && !woodChopProgress && !fishingGameActive && (
                <div className={`world-interaction-prompt absolute bg-black/80 backdrop-blur-sm rounded-xl border border-purple-500/40 text-center z-20 ${
                    isMobile ? 'bottom-[170px] left-1/2 -translate-x-1/2 p-3 w-[min(100vw-2rem,280px)]' : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                }`}>
                    <div className="text-3xl mb-1">🍄</div>
                    {mushroomHarvestProgress ? (
                        <>
                            <p className="retro-text mb-2 text-sm text-purple-200">Gathering mushrooms…</p>
                            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mb-1">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-400 to-fuchsia-500 transition-all"
                                    style={{ width: `${Math.round((mushroomHarvestProgress.progress || 0) * 100)}%` }}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="retro-text mb-2 text-sm text-purple-200">{mushroomInteraction.prompt}</p>
                            <button
                                type="button"
                                className="w-full px-6 py-2 font-bold rounded-lg retro-text text-sm bg-gradient-to-b from-purple-400 to-fuchsia-700 text-white"
                                onClick={handleMushroomHarvest}
                            >
                                Pick mushrooms
                            </button>
                        </>
                    )}
                </div>
             )}

             {logForageInteraction && room === 'forest_trails' && !nearbyPortal && !woodcuttingInteraction && !woodChopProgress && !mushroomInteraction && !mushroomHarvestProgress && !fishingGameActive && (
                <div className={`world-interaction-prompt absolute bg-black/80 backdrop-blur-sm rounded-xl border border-amber-600/40 text-center z-20 ${
                    isMobile ? 'bottom-[170px] left-1/2 -translate-x-1/2 p-3 w-[min(100vw-2rem,280px)]' : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                }`}>
                    <div className="text-3xl mb-1">{logForageInteraction.mossy ? '🪵' : '🪵'}</div>
                    <p className="retro-text mb-2 text-sm text-amber-200">{logForageInteraction.prompt}</p>
                    {logForageInteraction.searching ? (
                        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                                style={{ width: `${Math.round((logForageInteraction.progress || 0) * 100)}%` }}
                            />
                        </div>
                    ) : (
                        <button
                            type="button"
                            disabled={!logForageInteraction.canForage}
                            className={`w-full px-6 py-2 font-bold rounded-lg retro-text text-sm ${
                                logForageInteraction.canForage
                                    ? 'bg-gradient-to-b from-amber-500 to-orange-700 text-white'
                                    : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-70'
                            }`}
                            onClick={handleLogForageAction}
                        >
                            {logForageInteraction.canForage ? 'Search for worms' : 'Log picked over'}
                        </button>
                    )}
                </div>
             )}

             {worldDropInteraction && !nearbyPortal && !fishingGameActive && !woodChopProgress && !manualChopActive && (
                <div className={`world-interaction-prompt absolute bg-black/80 backdrop-blur-sm rounded-xl border border-cyan-500/40 text-center z-20 ${
                    isMobile ? 'bottom-[170px] left-1/2 -translate-x-1/2 p-3' : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                }`}>
                    <div className="text-3xl mb-1">{worldDropInteraction.isGold ? '💰' : '📦'}</div>
                    <p className={`retro-text mb-2 text-sm ${worldDropInteraction.canPickup ? 'text-cyan-200' : 'text-amber-200'}`}>
                        {worldDropInteraction.prompt}
                    </p>
                    <button
                        type="button"
                        disabled={!worldDropInteraction.canPickup}
                        className={`w-full px-6 py-2 font-bold rounded-lg retro-text text-sm ${
                            worldDropInteraction.canPickup
                                ? 'bg-gradient-to-b from-cyan-400 to-blue-700 text-white'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-70'
                        }`}
                        onClick={handleWorldDropPickup}
                    >
                        {worldDropInteraction.canPickup ? 'Pick up' : 'Backpack full'}
                    </button>
                </div>
             )}
             
             {/* World Merchant NPC interaction */}
             {nearbyNpcInteraction && (room === 'town' || room === 'snow_forts' || room === 'forest_trails') && !nearbyPortal && !fishingInteraction && !woodcuttingInteraction && !mushroomInteraction && !worldDropInteraction && !scavengeInteraction && !fishingGameActive && !activeNpcDef && (
                <div
                    className={`world-interaction-prompt absolute bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-sm rounded-xl border border-cyan-500/40 text-center z-20 shadow-lg shadow-cyan-500/10 ${
                        isMobile
                            ? isLandscape
                                ? 'bottom-[180px] right-28 p-3'
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    <div className="text-2xl mb-1">
                        {nearbyNpcInteraction.markerType === '!' ? '❗' : '❓'}
                    </div>
                    <p className="text-cyan-300 retro-text text-sm mb-2">
                        {isMobile
                            ? `Tap to talk`
                            : nearbyNpcInteraction.prompt}
                    </p>
                    <button
                        type="button"
                        className="w-full px-6 py-2 font-bold rounded-lg retro-text text-sm bg-gradient-to-b from-cyan-500 to-teal-700 hover:from-cyan-400 hover:to-teal-600 text-white transition-all active:scale-95"
                        onClick={() => openNpcDialogue(nearbyNpcInteraction)}
                    >
                        💬 Talk
                    </button>
                    {!isMobile && (
                        <p className="text-white/50 text-[10px] mt-1 retro-text">{t('interact.orPressE')}</p>
                    )}
                </div>
             )}

             <NpcDialogueModal
                isOpen={Boolean(activeNpcDef)}
                npcDef={activeNpcDef}
                onClose={() => setActiveNpcDef(null)}
                onAction={handleNpcDialogueAction}
                gameInventory={gameInventory}
                coins={userData?.coins ?? 0}
                dailyOrders={dailyQuestStatus?.orders || []}
             />

             <TravelDialogueModal
                isOpen={Boolean(activeTravelNpcDef)}
                npcDef={activeTravelNpcDef}
                onClose={() => setActiveTravelNpcDef(null)}
                onBook={handleTravelBook}
                onLeave={handleTravelLeave}
                routeStatuses={travelRouteStatuses}
                getPlayersData={getPlayersData}
                myVoyage={myTravelVoyage}
                coins={userData?.coins ?? 0}
                gameInventory={gameInventory}
                playerId={playerId}
                isAuthenticated={isAuthenticated}
                pending={travelPending}
             />

             {(isTravelLobbyRoom(room) || ['town', 'snow_forts', 'forest_trails'].includes(room)) && (
                <TravelLobbyHUD
                    voyage={myTravelVoyage}
                    routeStatuses={travelRouteStatuses}
                    room={room}
                />
             )}

             {nearbyTravelNpcInteraction && ['town', 'snow_forts', 'forest_trails'].includes(room)
                && !nearbyPortal && !fishingInteraction && !woodcuttingInteraction
                && !fishingGameActive && !activeTravelNpcDef && (
                <div
                    className={`world-interaction-prompt absolute bg-gradient-to-b from-sky-900/95 to-cyan-950/95 backdrop-blur-sm rounded-xl border border-sky-400/50 text-center z-20 shadow-lg shadow-sky-500/20 ${
                        isMobile
                            ? isLandscape
                                ? 'bottom-[180px] right-28 p-3 min-w-[220px]'
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3 min-w-[240px]'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4 min-w-[280px]'
                    }`}
                >
                    <p className="text-sky-100 retro-text text-xs uppercase tracking-widest mb-1">⛴️ Ice Ferry</p>
                    <p className="text-sky-200 retro-text text-sm mb-2">
                        {isMobile
                            ? (nearbyTravelNpcInteraction.routes?.length
                                ? `Travel to ${nearbyTravelNpcInteraction.routes.map((route) => route.name).join(', ')}`
                                : 'Tap to buy ferry tickets')
                            : nearbyTravelNpcInteraction.prompt}
                    </p>
                    <button
                        type="button"
                        className="w-full px-6 py-2.5 font-bold rounded-lg retro-text text-sm bg-gradient-to-b from-sky-500 to-cyan-700 hover:from-sky-400 hover:to-cyan-600 text-white transition-all active:scale-95"
                        onClick={() => openTravelDialogue(nearbyTravelNpcInteraction)}
                    >
                        {nearbyTravelNpcInteraction.routes?.length === 1
                            ? `⛴️ Ticket to ${nearbyTravelNpcInteraction.routes[0].name}`
                            : '⛴️ Buy Ferry Ticket'}
                    </button>
                    {!isMobile && (
                        <p className="text-white/50 text-[10px] mt-1 retro-text">{t('interact.orPressE')}</p>
                    )}
                </div>
             )}

             <GameInventoryModal
                isOpen={showNpcBackpack}
                onClose={() => {
                    setShowNpcBackpack(false);
                    setNpcBackpackSellMerchant(null);
                }}
                sellMerchantId={npcBackpackSellMerchant}
             />

             {/* Lord Fishnu Interaction UI */}
             {lordFishnuInteraction && room === 'town' && !fishingInteraction && !nearbyPortal && (
                <div 
                    className={`world-interaction-prompt absolute bg-gradient-to-b from-amber-900/95 to-yellow-900/95 backdrop-blur-sm rounded-xl border border-yellow-500/50 text-center z-20 shadow-lg shadow-yellow-500/20 ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[180px] right-28 p-3' 
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    <p className="text-yellow-300 retro-text text-sm mb-2">
                        {isMobile 
                            ? `🐟 ${t('interact.tapToPayRespects')}`
                            : lordFishnuInteraction.prompt
                        }
                    </p>
                    
                    <button
                        className={`w-full px-6 py-2 font-bold rounded-lg retro-text text-sm transition-all active:scale-95 shadow-lg ${
                            lordFishnuCooldownRef.current
                                ? 'bg-gradient-to-b from-gray-400 to-gray-600 text-gray-200 cursor-not-allowed'
                                : 'bg-gradient-to-b from-yellow-400 to-amber-600 hover:from-yellow-300 hover:to-amber-500 text-black'
                        }`}
                        onClick={handlePayRespects}
                        disabled={lordFishnuCooldownRef.current}
                    >
                        🙏 Pay Respects
                    </button>
                </div>
             )}
             
             {/* Arcade Machine Interaction UI (Various Games) */}
             {arcadeInteraction && room === 'town' && !fishingInteraction && !nearbyPortal && !arcadeGameActive && (() => {
                // Game-specific UI configs
                const gameConfigs = {
                    battleship: { icon: '🚢', name: 'Battleship', color: 'cyan' },
                    flappy_penguin: { icon: '🐧', name: 'Flappy Penguin', color: 'green' },
                    snake: { icon: '🐍', name: 'Snake', color: 'emerald' },
                    pong: { icon: '🏒', name: 'Ice Pong', color: 'blue' },
                    memory: { icon: '🧠', name: 'Memory Match', color: 'purple' },
                    thin_ice: { icon: '❄️', name: 'Thin Ice', color: 'sky' },
                    avalanche_run: { icon: '🏔️', name: 'Avalanche Run', color: 'orange' }
                };
                const config = gameConfigs[arcadeInteraction.gameType] || gameConfigs.battleship;
                const colorClasses = {
                    cyan: 'border-cyan-500/50 shadow-cyan-500/20 text-cyan-300',
                    green: 'border-green-500/50 shadow-green-500/20 text-green-300',
                    emerald: 'border-emerald-500/50 shadow-emerald-500/20 text-emerald-300',
                    blue: 'border-blue-500/50 shadow-blue-500/20 text-blue-300',
                    purple: 'border-purple-500/50 shadow-purple-500/20 text-purple-300',
                    sky: 'border-sky-500/50 shadow-sky-500/20 text-sky-300',
                    orange: 'border-orange-500/50 shadow-orange-500/20 text-orange-300'
                };
                const buttonClasses = {
                    cyan: 'from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500',
                    green: 'from-green-400 to-emerald-600 hover:from-green-300 hover:to-emerald-500',
                    emerald: 'from-emerald-400 to-teal-600 hover:from-emerald-300 hover:to-teal-500',
                    blue: 'from-blue-400 to-indigo-600 hover:from-blue-300 hover:to-indigo-500',
                    purple: 'from-purple-400 to-pink-600 hover:from-purple-300 hover:to-pink-500',
                    sky: 'from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500',
                    orange: 'from-orange-400 to-amber-600 hover:from-orange-300 hover:to-amber-500'
                };
                return (
                <div 
                    className={`world-interaction-prompt absolute bg-gradient-to-b from-indigo-900/95 to-purple-900/95 backdrop-blur-sm rounded-xl border text-center z-20 shadow-lg ${colorClasses[config.color]} ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[180px] right-28 p-3' 
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    <div className="text-3xl mb-1">{config.icon}</div>
                    <p className={`retro-text text-sm mb-2 ${colorClasses[config.color].split(' ').pop()}`}>
                        {isMobile 
                            ? `🎮 ${t('interact.tapToPlay')} ${arcadeInteraction.gameKey ? t(arcadeInteraction.gameKey) : config.name}`
                            : arcadeInteraction.prompt
                        }
                    </p>
                    
                    <button
                        className={`w-full px-6 py-2 font-bold rounded-lg retro-text text-sm transition-all active:scale-95 shadow-lg bg-gradient-to-b ${buttonClasses[config.color]} text-white`}
                        onClick={() => {
                            setArcadeGameType(arcadeInteraction.gameType || 'battleship');
                            setArcadeGameActive(true);
                            setArcadeInteraction(null);
                        }}
                    >
                        🎮 {t('interact.play')}
                    </button>
                    
                    {/* Desktop hint */}
                    {!isMobile && (
                        <p className="text-white/50 text-[10px] mt-1 retro-text">{t('interact.orPressE')}</p>
                    )}
                </div>
                );
             })()}
             
             {/* Town / Casino Game Room Interaction Prompt - Clickable like dojo enter */}
             {/* Hide when blackjack interaction is showing to prevent overlap */}
             {nearbyInteraction && (
                room === 'town'
                || room === 'casino_game_room'
                || room === 'snow_forts'
                || room === 'forest_trails'
                || (room === 'nightclub' && ['sit', 'dj'].includes(nearbyInteraction.action))
             ) && !nearbyPortal && !slotInteraction && !goldSlotInteraction && !blackjackInteraction && (
                <div 
                    className={`world-interaction-prompt absolute bg-black/80 backdrop-blur-sm rounded-xl border border-white/20 text-center z-20 ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[180px] right-28 p-3' 
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    {/* Mobile-friendly message without "Press E" */}
                    <p className="text-white retro-text text-sm mb-2">
                        {nearbyInteraction.action === 'descend_lighthouse'
                            ? (isMobile
                                ? `🔦 ${t('interact.tap')} ${t('interact.leaveLighthouse')}`
                                : `🔦 ${t('interact.pressE')} ${t('interact.leaveLighthouse')}`)
                            : isMobile
                                ? nearbyInteraction.message.replace('Press E to ', 'Tap to ').replace('(Press E)', '')
                                : nearbyInteraction.message}
                    </p>
                    
                    {/* Action Button */}
                    <button
                        className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-black font-bold rounded-lg retro-text text-sm transition-all active:scale-95"
                        onClick={() => {
                            // Handle bench sitting with snap points
                            if (nearbyInteraction.action === 'sit' && nearbyInteraction.benchData) {
                                const benchData = nearbyInteraction.benchData;
                                const snapPoints = benchData.snapPoints || [{ x: 0, z: 0, rotation: 0 }];
                                const benchX = benchData.worldX;
                                const benchZ = benchData.worldZ;
                                const benchRotation = benchData.worldRotation || 0;
                                const playerX = posRef.current.x;
                                const playerZ = posRef.current.z;
                                
                                // Find closest snap point with rotation
                                let closestPoint = snapPoints[0];
                                let closestDist = Infinity;
                                let closestWorldX = benchX;
                                let closestWorldZ = benchZ;
                                
                                for (const point of snapPoints) {
                                    const rotatedX = point.x * Math.cos(benchRotation) - point.z * Math.sin(benchRotation);
                                    const rotatedZ = point.x * Math.sin(benchRotation) + point.z * Math.cos(benchRotation);
                                    const worldX = benchX + rotatedX;
                                    const worldZ = benchZ + rotatedZ;
                                    const dist = Math.sqrt((playerX - worldX) ** 2 + (playerZ - worldZ) ** 2);
                                    if (dist < closestDist) {
                                        closestDist = dist;
                                        closestPoint = point;
                                        closestWorldX = worldX;
                                        closestWorldZ = worldZ;
                                    }
                                }
                                
                                // Determine facing direction
                                let finalRotation = benchRotation;
                                
                                // BIDIRECTIONAL SIT (log seats only): Face based on approach side
                                if (benchData.bidirectionalSit) {
                                    const logForwardX = Math.sin(benchRotation);
                                    const logForwardZ = Math.cos(benchRotation);
                                    const toPlayerX = playerX - benchX;
                                    const toPlayerZ = playerZ - benchZ;
                                    const dotProduct = toPlayerX * logForwardX + toPlayerZ * logForwardZ;
                                    if (dotProduct < 0) {
                                        finalRotation = benchRotation + Math.PI;
                                    }
                                }
                                
                                const seatData = {
                                    snapPoint: closestPoint,
                                    worldPos: { x: closestWorldX, z: closestWorldZ },
                                    seatHeight: benchData.seatHeight || 0.8,
                                    benchRotation: finalRotation,
                                    benchDepth: benchData.benchDepth || 0.8,
                                    dismountBack: benchData.dismountBack || false,
                                    platformHeight: benchData.platformHeight || benchData.data?.platformHeight || 0
                                };
                                setSeatedOnBench(seatData);
                                seatedRef.current = seatData;
                                
                                posRef.current.x = closestWorldX;
                                posRef.current.z = closestWorldZ;
                                posRef.current.y = seatData.seatHeight;
                                velRef.current.y = 0;
                                rotRef.current = finalRotation;
                                
                                if (playerRef.current) {
                                    playerRef.current.position.x = closestWorldX;
                                    playerRef.current.position.z = closestWorldZ;
                                    playerRef.current.position.y = seatData.seatHeight;
                                    playerRef.current.rotation.y = rotRef.current;
                                }
                                
                                emoteRef.current = { type: 'Sit', startTime: Date.now() };
                                mpSendEmote('Sit', true);
                                setNearbyInteraction(null);
                            }
                            else if (nearbyInteraction.action === 'dj' && nearbyInteraction.benchData) {
                                // DJ at the turntable
                                const djData = nearbyInteraction.benchData;
                                const djX = djData.worldX;
                                const djZ = djData.worldZ;
                                const djRotation = djData.worldRotation !== undefined ? djData.worldRotation : 0;
                                const djHeight = djData.seatHeight || 0.75;
                                
                                const seatData = {
                                    snapPoint: { x: 0, z: 0 },
                                    worldPos: { x: djX, z: djZ },
                                    seatHeight: djHeight,
                                    benchRotation: djRotation,
                                    benchDepth: 1,
                                    dismountBack: true,
                                    dismountOffset: djData.dismountOffset,
                                    platformHeight: djHeight
                                };
                                setSeatedOnBench(seatData);
                                seatedRef.current = seatData;
                                
                                posRef.current.x = djX;
                                posRef.current.z = djZ;
                                posRef.current.y = djHeight;
                                velRef.current.y = 0;
                                rotRef.current = djRotation;
                                
                                if (playerRef.current) {
                                    playerRef.current.position.set(djX, djHeight, djZ);
                                    playerRef.current.rotation.y = djRotation;
                                }
                                
                                emoteRef.current = { type: 'DJ', startTime: Date.now() };
                                mpSendEmote('DJ', true);
                                setNearbyInteraction(null);
                            }
                            else if (nearbyInteraction.action === 'climb_roof') {
                                // Teleport to nightclub roof
                                const roofX = CENTER_X;
                                const roofZ = CENTER_Z - 75;
                                const roofY = 15;
                                
                                posRef.current.x = roofX;
                                posRef.current.z = roofZ;
                                posRef.current.y = roofY;
                                velRef.current.y = 0;
                                
                                if (playerRef.current) {
                                    playerRef.current.position.set(roofX, roofY, roofZ);
                                }
                                
                                setNearbyInteraction(null);
                            }
                            else if (nearbyInteraction.action === 'climb_lighthouse') {
                                // Teleport to lighthouse observation deck
                                const lighthouseX = CENTER_X + 80.5;
                                const lighthouseZ = CENTER_Z + 52.7;
                                const deckY = 12.5 + 5;
                                
                                posRef.current.x = lighthouseX;
                                posRef.current.z = lighthouseZ;
                                posRef.current.y = deckY;
                                velRef.current.y = 0;
                                
                                if (playerRef.current) {
                                    playerRef.current.position.set(lighthouseX, deckY, lighthouseZ);
                                }
                                
                                setNearbyInteraction(null);
                            }
                            else if (nearbyInteraction.action === 'descend_lighthouse') {
                                // Teleport back down from lighthouse observation deck
                                const lighthouseX = CENTER_X + 80.5;
                                const lighthouseZ = CENTER_Z + 52.7;
                                
                                posRef.current.x = lighthouseX;
                                posRef.current.z = lighthouseZ + 7; // In front of lighthouse
                                posRef.current.y = 0.5;
                                velRef.current.y = 0;
                                
                                if (playerRef.current) {
                                    playerRef.current.position.set(lighthouseX, 0.5, lighthouseZ + 7);
                                }
                                
                                setNearbyInteraction(null);
                            }
                            else if (nearbyInteraction.action === 'play_arcade') {
                                // Open arcade minigame (PvE Battleship)
                                const gameType = nearbyInteraction.gameType || 'battleship';
                                setArcadeGameType(gameType);
                                setArcadeGameActive(true);
                                setNearbyInteraction(null);
                            }
                            else if (nearbyInteraction.emote) {
                                emoteRef.current = { type: nearbyInteraction.emote, startTime: Date.now() };
                                mpSendEmote(nearbyInteraction.emote, false);
                            }
                            if (nearbyInteraction.action === 'interact_snowman') {
                                setActiveBubble(nearbyInteraction.message);
                            }
                        }}
                    >
                        {nearbyInteraction.action === 'sit' ? `🪑 ${t('interact.sit')}` : 
                         nearbyInteraction.action === 'dj' ? `🎧 ${t('interact.dj')}` :
                         nearbyInteraction.action === 'climb_roof' ? `🪜 ${t('interact.climb')}` :
                         nearbyInteraction.action === 'climb_lighthouse' ? `🔦 ${t('interact.climb')}` :
                         nearbyInteraction.action === 'descend_lighthouse' ? `🔦 ${t('interact.leave')}` :
                         nearbyInteraction.action === 'play_arcade' ? `🎮 ${t('interact.play')}` :
                         `✓ ${t('interact.ok')}`}
                    </button>
                    
                    {/* Desktop hint only */}
                    {!isMobile && (
                        <p className="text-white/50 text-[10px] mt-1 retro-text">{t('interact.orPressE')}</p>
                    )}
                </div>
             )}

             {/* Pet Shop — adopt, care, equip, food, toys, cosmetics */}
             {showPetShop && (
                <PufflePanel
                    equippedPuffle={puffle}
                    ownedPuffles={ownedPuffles}
                    onAdopt={handleAdoptPuffle}
                    onEquip={handleEquipPuffle}
                    onUnequip={handleUnequipPuffle}
                    onUpdate={handleUpdatePuffle}
                    onClose={() => setShowPetShop(false)}
                    includeShop
                    disableTricks
                />
             )}
             
             {/* Puffle Interaction Reward Notification */}
             {puffleInteractionReward && (
                <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce select-none pointer-events-none">
                    <div className="bg-gradient-to-r from-pink-500/90 to-purple-500/90 px-6 py-4 rounded-2xl shadow-2xl border border-white/30">
                        <div className="text-4xl text-center mb-2 animate-pulse">💕💕💕</div>
                        <div className="text-white text-center font-bold">
                            Your puffle met {puffleInteractionReward.otherPuffle}!
                        </div>
                        <div className="text-yellow-300 text-center text-sm mt-1">
                            +10 Gold incoming... 🪙
                        </div>
                    </div>
                </div>
             )}
             
             {/* Puffle Pet Notification */}
             {pufflePetNotification && (
                <div className="fixed top-1/3 left-1/2 transform -translate-x-1/2 z-50 select-none pointer-events-none animate-fade-in">
                    <div className={`px-5 py-3 rounded-2xl shadow-2xl border ${
                        pufflePetNotification.type === 'success' 
                            ? 'bg-gradient-to-r from-pink-500/95 to-rose-500/95 border-white/30' 
                            : pufflePetNotification.type === 'cooldown'
                                ? 'bg-gradient-to-r from-orange-500/95 to-amber-500/95 border-white/30'
                                : 'bg-gradient-to-r from-gray-500/95 to-slate-500/95 border-white/30'
                    }`}>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">
                                {pufflePetNotification.type === 'success' ? '🐾💕' : 
                                 pufflePetNotification.type === 'cooldown' ? '⏳' : '📍'}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-sm">
                                    {pufflePetNotification.message}
                                </span>
                                {pufflePetNotification.type === 'success' && pufflePetNotification.happiness !== undefined && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-white/80 text-xs">Happiness:</span>
                                        <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-yellow-400 to-pink-400 transition-all"
                                                style={{ width: `${pufflePetNotification.happiness}%` }}
                                            />
                                        </div>
                                        <span className="text-yellow-300 text-xs font-bold">{pufflePetNotification.happiness}%</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
             )}
             
             {/* Title & Controls - Top Left (desktop / mobile landscape; portrait uses GameHUD) */}
             {!(isMobile && !isLandscape) && (
             <div className={`absolute retro-text text-white drop-shadow-md z-10 pointer-events-none select-none ${
                 isMobile && !isLandscape ? 'top-2 left-2' : 'top-4 left-4'
             }`}>
                 <h2 className={`drop-shadow-lg ${
                     isMobile && !isLandscape ? 'text-sm' : 'text-xl'
                 } ${room === 'dojo' ? 'text-red-400' : room === 'pizza' ? 'text-orange-400' : room === 'nightclub' ? 'text-fuchsia-400' : room === 'casino_game_room' ? 'text-yellow-400' : room === 'snow_forts' ? 'text-sky-300' : room === 'forest_trails' ? 'text-green-400' : room?.startsWith('travel:') ? 'text-cyan-300' : room === 'igloo3' ? 'text-fuchsia-400' : room.startsWith('igloo') ? 'text-cyan-300' : 'text-yellow-400'}`}>
                     {getRoomLabel(room, t, { emoji: true })}
                 </h2>
                 {!isMobile && (
                     <p className="text-[10px] opacity-70 mt-1">WASD Move • E Interact • T Emotes • Mouse Orbit</p>
                 )}
             </div>
             )}
             
             {/* Debug Position Panel - Press F3 to toggle (DEV ONLY) */}
             {process.env.NODE_ENV !== 'production' && showDebugPosition && (
                 <div className="absolute top-4 right-4 bg-black/80 border border-green-500/50 rounded-lg p-3 z-50 pointer-events-auto font-mono text-xs">
                     <div className="text-green-400 font-bold mb-2 flex items-center gap-2">
                         📍 DEBUG POSITION
                         <span className="text-[10px] text-white/50">(F3 to hide)</span>
                     </div>
                     <div className="space-y-1 text-white/90">
                         <div className="flex justify-between gap-4">
                             <span className="text-cyan-400">World X:</span>
                             <span>{debugPosition.x}</span>
                         </div>
                         <div className="flex justify-between gap-4">
                             <span className="text-yellow-400">World Y:</span>
                             <span>{debugPosition.y}</span>
                         </div>
                         <div className="flex justify-between gap-4">
                             <span className="text-pink-400">World Z:</span>
                             <span>{debugPosition.z}</span>
                         </div>
                         <div className="border-t border-white/20 my-2"></div>
                         <div className="text-green-300 text-[10px] mb-1">Offset from Center (C):</div>
                         <div className="flex justify-between gap-4">
                             <span className="text-cyan-300">C + X:</span>
                             <span className="text-green-400">{debugPosition.offsetX}</span>
                         </div>
                         <div className="flex justify-between gap-4">
                             <span className="text-pink-300">C + Z:</span>
                             <span className="text-green-400">{debugPosition.offsetZ}</span>
                         </div>
                         <div className="flex justify-between gap-4">
                             <span className="text-orange-300">Rotation:</span>
                             <span>{debugPosition.rotation}°</span>
                         </div>
                     </div>
                     <button
                         onClick={() => {
                             const text = `x: C + ${debugPosition.offsetX}, z: C + ${debugPosition.offsetZ}`;
                             navigator.clipboard.writeText(text);
                         }}
                         className="mt-3 w-full bg-green-600 hover:bg-green-500 text-white text-[10px] py-1 px-2 rounded"
                     >
                         📋 Copy Offset
                     </button>
                     <div className="mt-2 text-[9px] text-white/40 text-center">
                         Use offsets in TownCenter.js props
                     </div>
                     
                     {/* Day/Night Cycle Controls */}
                     <div className="border-t border-white/20 mt-3 pt-3">
                         <div className="text-yellow-400 font-bold mb-2 text-[10px]">☀️ DAY/NIGHT CYCLE</div>
                         <div className="text-green-400 text-[9px] mb-2">🌐 Server Synced</div>
                         <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                 <span className="text-white/70 text-[10px]">Time:</span>
                                 <span className="text-yellow-300 text-[10px]">
                                     {dayTime < 0.12 ? '🌙 Night' : dayTime < 0.18 ? '🌅 Sunrise' : dayTime < 0.82 ? '☀️ Day' : dayTime < 0.88 ? '🌇 Sunset' : '🌙 Night'}
                                     {' '}({(dayTime * 24).toFixed(1)}h)
                                 </span>
                             </div>
                             <div>
                                 <label className="text-white/50 text-[9px] block mb-1">Debug Override (pause to use)</label>
                                 <input
                                     type="range"
                                     min="0"
                                     max="1"
                                     step="0.01"
                                     value={dayTime}
                                     onChange={(e) => {
                                         const val = parseFloat(e.target.value);
                                         setDayTime(val);
                                         dayTimeRef.current = val;
                                     }}
                                     disabled={daySpeed !== 0}
                                     className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer disabled:opacity-30"
                                 />
                             </div>
                             <div className="flex gap-1 mt-1">
                                 <button
                                     onClick={() => { setDaySpeed(0); daySpeedRef.current = 0; }}
                                     className={`flex-1 text-white text-[9px] py-1 rounded ${daySpeed === 0 ? 'bg-red-500' : 'bg-red-600/50 hover:bg-red-500'}`}
                                 >
                                     ⏸ Pause
                                 </button>
                                 <button
                                     onClick={() => { setDaySpeed(1); daySpeedRef.current = 1; }}
                                     className={`flex-1 text-white text-[9px] py-1 rounded ${daySpeed !== 0 ? 'bg-green-500' : 'bg-green-600/50 hover:bg-green-500'}`}
                                 >
                                     ▶ Server
                                 </button>
                             </div>
                         </div>
                     </div>
                     
                     {/* Snow Controls */}
                     <div className="border-t border-white/20 mt-3 pt-3">
                         <div className="text-cyan-400 font-bold mb-2 text-[10px]">❄️ SNOWFALL</div>
                         <div className="flex justify-between items-center">
                             <span className="text-white/70 text-[10px]">Intensity:</span>
                             <span className="text-cyan-300 text-[10px]">{((snowfallSystemRef.current?.getIntensity() || 0.5) * 100).toFixed(0)}%</span>
                         </div>
                     </div>
                     
                     {/* Collision Debug Controls */}
                     <div className="border-t border-white/20 mt-3 pt-3">
                         <div className="text-red-400 font-bold mb-2 text-[10px]">🧱 COLLISION DEBUG</div>
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-white/70 text-[10px]">Show Wireframes:</span>
                             <button
                                 onClick={() => {
                                     const newVal = !showCollisionDebug;
                                     setShowCollisionDebug(newVal);
                                     if (townCenterRef.current) {
                                         townCenterRef.current.toggleCollisionDebug(newVal);
                                     }
                                 }}
                                 className={`text-[10px] px-2 py-0.5 rounded ${showCollisionDebug ? 'bg-red-500 text-white' : 'bg-gray-600 text-white/70'}`}
                             >
                                 {showCollisionDebug ? 'ON' : 'OFF'}
                             </button>
                         </div>
                        <div className="text-[8px] text-white/40 space-y-0.5">
                            <div>🔴 Red = Ground colliders</div>
                            <div>🟡 Yellow = Elevated colliders</div>
                            <div>🟢 Green = Triggers</div>
                        </div>
                    </div>
                </div>
             )}
             
             {/* Performance Debug Panel - Press F4 to toggle (DEV ONLY) */}
             {process.env.NODE_ENV !== 'production' && showPerfDebug && (
                 <div className="absolute top-4 left-4 bg-black/90 border border-red-500/50 rounded-lg p-3 z-50 pointer-events-auto font-mono text-xs max-w-[400px] max-h-[80vh] overflow-y-auto">
                     <div className="text-red-400 font-bold mb-2 flex items-center gap-2">
                         🔥 PERFORMANCE DEBUG
                         <span className="text-[10px] text-white/50">(F4 to hide)</span>
                     </div>
                     
                     {/* Frame Stats */}
                     <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/90 mb-3">
                         <div className="flex justify-between">
                             <span className="text-yellow-400">FPS:</span>
                             <span className={perfStats.fps < 30 ? 'text-red-400' : perfStats.fps < 50 ? 'text-yellow-400' : 'text-green-400'}>
                                 {perfStats.fps}
                             </span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-yellow-400">Frame:</span>
                             <span>{perfStats.frameTime}ms</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-cyan-400">Draw Calls:</span>
                             <span className={perfStats.drawCalls > 500 ? 'text-red-400' : 'text-white'}>{perfStats.drawCalls}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-cyan-400">Triangles:</span>
                             <span className={perfStats.triangles > 500000 ? 'text-red-400' : 'text-white'}>{(perfStats.triangles / 1000).toFixed(0)}K</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-green-400">Visible:</span>
                             <span>{perfStats.visibleMeshes}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-gray-400">Culled:</span>
                             <span>{perfStats.culledMeshes}</span>
                         </div>
                     </div>
                     
                     {/* Update Timings */}
                     <div className="border-t border-white/20 pt-2 mb-3">
                         <div className="text-orange-400 font-bold mb-1 text-[10px]">⏱️ UPDATE TIMINGS (ms)</div>
                         <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                             <div className="flex justify-between">
                                 <span className="text-white/60">TownCenter:</span>
                                 <span className={perfStats.timings.townUpdate > 5 ? 'text-red-400' : 'text-white'}>
                                     {perfStats.timings.townUpdate?.toFixed(1) || '0.0'}
                                 </span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-white/60">SnowForts:</span>
                                 <span className={perfStats.timings.snowFortsUpdate > 5 ? 'text-red-400' : 'text-white'}>
                                     {perfStats.timings.snowFortsUpdate?.toFixed(1) || '0.0'}
                                 </span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-white/60">Forest:</span>
                                 <span className={perfStats.timings.forestUpdate > 5 ? 'text-red-400' : 'text-white'}>
                                     {perfStats.timings.forestUpdate?.toFixed(1) || '0.0'}
                                 </span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-white/60">Render:</span>
                                 <span className={perfStats.timings.render > 16 ? 'text-red-400' : 'text-white'}>
                                     {perfStats.timings.render || '0.0'}
                                 </span>
                             </div>
                         </div>
                     </div>
                     
                     {/* Hot Assets - What's causing lag (by draw calls) */}
                     <div className="border-t border-white/20 pt-2">
                         <div className="text-red-400 font-bold mb-1 text-[10px]">🔥 SCENE OBJECTS (meshes = draw calls)</div>
                         <div className="text-[9px] space-y-0.5 max-h-[200px] overflow-y-auto">
                             {perfStats.hotAssets?.length > 0 ? (
                                 perfStats.hotAssets.slice(0, 15).map((asset, i) => (
                                     <div key={i} className="flex justify-between items-center">
                                         <span className="text-white/70 truncate max-w-[160px]" title={asset.name}>
                                             {asset.name || 'unnamed'}
                                         </span>
                                         <span className="ml-2 flex gap-2">
                                             <span className={asset.draws > 100 ? 'text-red-400 font-bold' : asset.draws > 30 ? 'text-yellow-400' : 'text-green-400'}>
                                                 {asset.draws}
                                             </span>
                                             <span className="text-white/30 text-[8px]">{(asset.tris/1000).toFixed(1)}K△</span>
                                         </span>
                                     </div>
                                 ))
                             ) : (
                                 <div className="text-white/40">No objects detected</div>
                             )}
                         </div>
                     </div>
                     
                     <div className="mt-2 text-[8px] text-white/30 text-center">
                         Updates every 30 frames
                     </div>
                 </div>
             )}

             
            <EmoteWheel
                isOpen={emoteWheelOpen}
                selection={emoteWheelSelection}
                items={EMOTE_WHEEL_ITEMS}
                onSelect={triggerEmote}
                onClose={() => setEmoteWheelOpen(false)}
            />
             
             {/* Settings Menu Modal */}
             <SettingsMenu
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                settings={gameSettings}
                onSettingsChange={setGameSettings}
                onOpenChangelog={() => setShowChangelog(true)}
                isAuthenticated={isAuthenticated}
                day1NametagUnlocked={userData?.day1NametagUnlocked === true}
             />
             
             {/* Changelog Modal */}
             <ChangelogModal
                isOpen={showChangelog}
                onClose={() => setShowChangelog(false)}
             />
        </div>
    );
};

export default VoxelWorld;


