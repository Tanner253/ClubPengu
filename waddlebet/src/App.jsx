import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initBrowserCapabilities } from './utils/browserCapabilities.js';
import VoxelPenguinDesigner from './VoxelPenguinDesigner';
import VoxelWorld from './VoxelWorld';
import CardJitsu from './minigames/CardJitsu';
import P2PCardJitsu from './minigames/P2PCardJitsu';
import P2PTicTacToe from './minigames/P2PTicTacToe';
import P2PConnect4 from './minigames/P2PConnect4';
import P2PMonopoly from './minigames/P2PMonopoly';
import P2PUno from './minigames/P2PUno';
import P2PBlackjack from './minigames/P2PBlackjack';
import P2PBattleship from './minigames/P2PBattleship';
import GameManager from './engine/GameManager';
import { getResumeRoom } from './utils/playerSession';
import { MultiplayerProvider, useMultiplayer } from './multiplayer';
import { ChallengeProvider, useChallenge } from './challenge';
import { IglooProvider, useIgloo } from './igloo';
import { LanguageProvider } from './i18n';
import { useLanguage } from './i18n';
import performanceManager from './systems/PerformanceManager';
import { formatSupportDiagnostics } from './utils/browserCapabilities';
import ProfileMenu from './components/ProfileMenu';
import WagerModal from './components/WagerModal';
import Inbox from './components/Inbox';
import Notification from './components/Notification';
import GuestModeWarning from './components/GuestModeWarning';
import IglooSettingsPanel from './components/IglooSettingsPanel';
import IglooRentalModal from './components/IglooRentalModal';
import IglooEntryModal from './components/IglooEntryModal';
import IglooDetailsPanel from './components/IglooDetailsPanel';
import IglooRequirementsPanel from './components/IglooRequirementsPanel';
import TipNotification from './components/TipNotification';
import GiftNotification from './components/GiftNotification';
import LoadingScreen from './components/LoadingScreen';
import ChatLog from './components/ChatLog';
import AudioBootstrap from './components/AudioBootstrap';
import { setMenuMusic, setMusicForRoom } from './audio';

// Default penguin appearance for guests
const DEFAULT_PENGUIN = {
    skin: 'blue',
    hat: 'none',
    eyes: 'normal',
    mouth: 'beak',
    bodyItem: 'none',
    mount: 'none',
    characterType: 'penguin'
};

/** Floating chat opener for mobile when world controls are hidden behind overlays */
const MobileChatOpener = ({ visible }) => {
    const { setMobileChatOpen, hasUnreadChat } = useMultiplayer();
    if (!visible) return null;

    return (
        <button
            type="button"
            onClick={() => setMobileChatOpen(true)}
            className={`fixed bottom-20 left-4 z-[10040] flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 bg-black/80 text-xl shadow-lg pointer-events-auto${hasUnreadChat ? ' rs-chat-fab--unread' : ''}`}
            aria-label="Open chat"
            data-no-camera="true"
        >
            💬
        </button>
    );
};

/** Unified chat — world, minigames, mobile + desktop */
const GlobalChat = ({ minigameMode = false }) => {
    const { mobileChatOpen, setMobileChatOpen } = useMultiplayer();
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth < 768
    );

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
        <ChatLog
            isMobile={isMobile}
            isOpen={!isMobile || mobileChatOpen}
            onClose={() => setMobileChatOpen(false)}
            minigameMode={minigameMode}
        />
    );
};

// --- MAIN APP CONTROLLER ---

/**
 * Inner app content that uses challenge context
 */
const AppContent = () => {
    const { t } = useLanguage();
    const [perfAutoTuneToast, setPerfAutoTuneToast] = useState(null);
    
    // Current room/layer: 'town', 'dojo', etc.
    const [currentRoom, setCurrentRoom] = useState(null); // null = designer
    
    // Get auth state and user data from multiplayer context
    const { isAuthenticated, userData, isRestoringSession, walletAddress, mobileChatOpen, worldGameplayOverlay } = useMultiplayer();
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth < 768
    );

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    
    // Penguin customization - synced from server for auth users, defaults for guests
    const [penguinData, setPenguinData] = useState(DEFAULT_PENGUIN);
    
    // Track which wallet we've synced customization for (prevent stale data between wallets)
    const syncedWalletRef = useRef(null);
    
    // Sync penguin data from server when authenticated (including session restore)
    // CRITICAL: Track wallet address to detect wallet switches
    // NOTE: characterType is a top-level field in User model, NOT inside customization
    useEffect(() => {
        if (isAuthenticated && userData?.customization) {
            // Only sync if this is a NEW wallet or we haven't synced yet
            if (syncedWalletRef.current !== walletAddress) {
                console.log('🐧 Loading customization from server:', userData.customization, 'characterType:', userData.characterType);
                setPenguinData({
                    ...DEFAULT_PENGUIN,
                    ...userData.customization,
                    // characterType is top-level in User model, merge it in
                    characterType: userData.characterType || 'penguin'
                });
                syncedWalletRef.current = walletAddress;
            }
        } else if (!isAuthenticated) {
            // Guest mode — never reset penguinData here; designer customizations live in App state.
            // Resetting on isRestoringSession/session changes was wiping guest cosmetics before join.
            syncedWalletRef.current = null;
        }
    }, [isAuthenticated, userData?.customization, userData?.characterType, walletAddress]);
    
    // Also sync penguinData when live appearance changes (e.g., equipping items from inventory)
    // This is separate from customization because appearance can change during gameplay
    // NOTE: mountEnabled/greenCandlesEnabled/nametagStyle are settings-level toggles, NOT cosmetics.
    // Propagating them into penguinData would trigger expensive mesh rebuilds for no reason.
    const APPEARANCE_COSMETIC_KEYS = [
        'skin', 'hat', 'eyes', 'mouth', 'bodyItem', 'mount', 'characterType',
        'dogPrimaryColor', 'dogSecondaryColor',
        'frogPrimaryColor', 'frogSecondaryColor', 'shrimpPrimaryColor',
        'tortoisePrimaryColor', 'tortoiseSecondaryColor'
    ];
    useEffect(() => {
        if (isAuthenticated && userData?.appearance) {
            setPenguinData(prev => {
                const { mountEnabled, greenCandlesEnabled, nametagStyle, ...cosmeticProps } = userData.appearance;
                const cosmeticsChanged = APPEARANCE_COSMETIC_KEYS.some(
                    (key) => prev[key] !== cosmeticProps[key]
                );
                if (!cosmeticsChanged) return prev;
                return { ...prev, ...cosmeticProps };
            });
        }
    }, [isAuthenticated, userData?.appearance]);
    
    // Puffle state (shared across all rooms)
    const [playerPuffle, setPlayerPuffle] = useState(null);
    
    // Minigame state (separate from room system)
    const [activeMinigame, setActiveMinigame] = useState(null);
    
    // Custom spawn position (when exiting dojo/igloo to town)
    const [spawnPosition, setSpawnPosition] = useState(null);
    const sessionResumeRef = useRef(false);
    
    // Tip notification state
    const [incomingTip, setIncomingTip] = useState(null);
    
    // Gift notification state
    const [incomingGift, setIncomingGift] = useState(null);
    
    // Listen for incoming tips and gifts via WebSocket
    useEffect(() => {
        const ws = window.__multiplayerWs;
        if (!ws) return;
        
        const handleMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'tip_received') {
                    setIncomingTip(data);
                } else if (data.type === 'gift_received') {
                    setIncomingGift(data);
                }
            } catch (e) {
                // Ignore parse errors
            }
        };
        
        ws.addEventListener('message', handleMessage);
        return () => ws.removeEventListener('message', handleMessage);
    }, []);
    
    // Challenge context for P2P matches
    const { isInMatch, activeMatch, matchState, selectPlayer, activeMatches, spectatingMatch, activePveActivities } = useChallenge();
    
    // Initialize GameManager on mount
    useEffect(() => {
        const gm = GameManager.getInstance();
        console.log('🐧 WaddleBet Loaded!');
        console.log('💰 Coins:', gm.getCoins());
    }, []);
    
    // Turnstile token for bot protection
    const [turnstileToken, setTurnstileToken] = useState(null);
    
    // Full-screen loading between designer/world and between room transitions
    const [entryLoading, setEntryLoading] = useState(false);
    const entryLoadStartedAt = useRef(0);
    const entryDismissTimer = useRef(null);
    const pendingInitialEntryRef = useRef(false);
    const LOAD_READY_BUFFER_MS = 1000;
    const ENTRY_MIN_LOAD_MS = 3000;
    
    const dismissEntryLoading = useCallback(() => {
        if (entryDismissTimer.current) {
            clearTimeout(entryDismissTimer.current);
            entryDismissTimer.current = null;
        }
        setEntryLoading(false);
    }, []);
    
    const scheduleDismissEntryLoading = useCallback((options = {}) => {
        const { isInitialEntry = false } = options;
        const elapsed = Date.now() - entryLoadStartedAt.current;
        let wait = LOAD_READY_BUFFER_MS;
        if (isInitialEntry) {
            wait += Math.max(0, ENTRY_MIN_LOAD_MS - elapsed);
        }
        if (entryDismissTimer.current) clearTimeout(entryDismissTimer.current);
        entryDismissTimer.current = setTimeout(dismissEntryLoading, wait);
    }, [dismissEntryLoading]);
    
    // Enter the game world (from designer)
    const handleEnterWorld = (token = null) => {
        if (token) {
            setTurnstileToken(token);
        }
        entryLoadStartedAt.current = Date.now();
        pendingInitialEntryRef.current = true;
        setEntryLoading(true);
        sessionResumeRef.current = true;
        const resumeRoom = getResumeRoom(isAuthenticated, userData);
        GameManager.getInstance().setRoom(resumeRoom);
        setSpawnPosition(null);
        setCurrentRoom(resumeRoom);
        setMusicForRoom(resumeRoom);
    };
    
    const handleWorldReady = useCallback(() => {
        scheduleDismissEntryLoading({ isInitialEntry: pendingInitialEntryRef.current });
        pendingInitialEntryRef.current = false;
        setSpawnPosition(null);
    }, [scheduleDismissEntryLoading]);
    
    // If world never signals ready, do not block forever
    useEffect(() => {
        if (!entryLoading) return undefined;
        const maxWait = setTimeout(() => {
            dismissEntryLoading();
        }, 45000);
        return () => clearTimeout(maxWait);
    }, [entryLoading, dismissEntryLoading]);

    useEffect(() => {
        const onEmergencyDowngrade = (e) => {
            const { to, avgFps, settings } = e.detail || {};
            setPerfAutoTuneToast({
                kind: 'preset',
                preset: settings?.name || to,
                fps: avgFps
            });
            setTimeout(() => setPerfAutoTuneToast(null), 8000);
        };

        const onLowEndActivated = (e) => {
            setPerfAutoTuneToast({
                kind: 'lowEnd',
                fps: e.detail?.fps
            });
            setTimeout(() => setPerfAutoTuneToast(null), 10000);
        };

        window.addEventListener('performanceEmergencyDowngrade', onEmergencyDowngrade);
        window.addEventListener('lowEndModeActivated', onLowEndActivated);
        return () => {
            window.removeEventListener('performanceEmergencyDowngrade', onEmergencyDowngrade);
            window.removeEventListener('lowEndModeActivated', onLowEndActivated);
        };
    }, []);
    
    // Exit to designer
    const handleExitToDesigner = () => {
        setCurrentRoom(null);
        setActiveMinigame(null);
        setMenuMusic();
    };
    
    // Change room/layer (town -> dojo, dojo -> town, etc.)
    // Memoized to prevent useEffect re-runs in VoxelWorld igloo tracking
    const handleChangeRoom = useCallback((newRoom, exitSpawnPos = null) => {
        if (currentRoom !== null && newRoom !== currentRoom) {
            entryLoadStartedAt.current = Date.now();
            pendingInitialEntryRef.current = false;
            setEntryLoading(true);
        }
        sessionResumeRef.current = false;
        GameManager.getInstance().setRoom(newRoom);
        setSpawnPosition(exitSpawnPos);
        setCurrentRoom(newRoom);
        setMusicForRoom(newRoom);
    }, [currentRoom]);
    
    // Start a minigame (overlays the current room)
    const handleStartMinigame = (gameId) => {
        setActiveMinigame(gameId);
    };
    
    // Exit minigame (return to current room)
    const handleExitMinigame = () => {
        setActiveMinigame(null);
    };
    
    // Handle player click from VoxelWorld
    const handlePlayerClick = (playerData) => {
        if (playerData && !isInMatch) {
            selectPlayer(playerData);
        }
    };
    
    // Handle P2P match end
    const handleP2PMatchEnd = () => {
        // The match state will be cleared by ChallengeContext
        // Just need to ensure we don't show the solo game
        setActiveMinigame(null);
    };
    
    // Handle request to authenticate - redirects to penguin maker
    const handleRequestAuth = () => {
        // Exit to designer for clean auth flow
        setCurrentRoom(null);
        setActiveMinigame(null);
        setMenuMusic();
    };

    // Check if we're in the game world (not designer)
    const inGameWorld = currentRoom !== null;
    const chatOverlayMode = isInMatch || activeMinigame === 'card-jitsu' || worldGameplayOverlay;
    const showMobileChatOpener = inGameWorld && isMobile && !mobileChatOpen && chatOverlayMode;
    
    return (
        <div className="w-screen h-screen">
            <AudioBootstrap inGameWorld={inGameWorld} room={currentRoom} />
            <Styles />
            
            {entryLoading && <LoadingScreen visible={entryLoading} />}

            {perfAutoTuneToast && (
                <div className="fixed top-20 left-1/2 z-[90] w-[min(92vw,28rem)] -translate-x-1/2 animate-fade-in">
                    <div className={`rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md ${
                        perfAutoTuneToast.kind === 'lowEnd'
                            ? 'border-sky-400/30 bg-sky-950/90 text-sky-100'
                            : 'border-amber-400/30 bg-amber-950/90 text-amber-100'
                    }`}>
                        {(perfAutoTuneToast.kind === 'lowEnd' ? t('settings.perfLowEnd') : t('settings.perfAutoTune'))
                            .replace('{preset}', perfAutoTuneToast.preset || '')
                            .replace('{fps}', String(perfAutoTuneToast.fps ?? '?'))}
                    </div>
                </div>
            )}
            
            {/* Designer Mode */}
            {!inGameWorld && (
                <VoxelPenguinDesigner 
                    onEnterWorld={handleEnterWorld} 
                    currentData={penguinData}
                    updateData={setPenguinData}
                />
            )}
            
            {/* Game World - ALWAYS rendered when in a room (never unmounts during P2P match) */}
            {inGameWorld && (
                <div className={`absolute inset-0 ${isInMatch ? 'pointer-events-none' : ''}`}>
                    <VoxelWorld 
                        penguinData={penguinData} 
                        onPenguinDataChange={setPenguinData}
                        room={currentRoom}
                        onExitToDesigner={handleExitToDesigner}
                        onChangeRoom={handleChangeRoom}
                        onStartMinigame={handleStartMinigame}
                        playerPuffle={playerPuffle}
                        onPuffleChange={setPlayerPuffle}
                        customSpawnPos={spawnPosition}
                        sessionResumeRef={sessionResumeRef}
                        onPlayerClick={handlePlayerClick}
                        turnstileToken={turnstileToken}
                        isInMatch={isInMatch}
                        activeMatches={activeMatches}
                        spectatingMatch={spectatingMatch}
                        activePveActivities={activePveActivities}
                        onRequestAuth={handleRequestAuth}
                        onWorldReady={handleWorldReady}
                    />
                </div>
            )}
            
            {/* Solo Card Jitsu (vs AI) - full screen overlay */}
            {activeMinigame === 'card-jitsu' && !isInMatch && (
                <div className="absolute inset-0 z-40">
                    <CardJitsu 
                        penguinData={penguinData}
                        onExit={handleExitMinigame}
                    />
                </div>
            )}
            
            {/* P2P Games - overlay on top of game world (players stay visible) */}
            {isInMatch && activeMatch && activeMatch.gameType === 'card_jitsu' && (
                <div className="absolute inset-0 z-40">
                    <P2PCardJitsu onMatchEnd={handleP2PMatchEnd} />
                </div>
            )}
            
            {isInMatch && activeMatch && activeMatch.gameType === 'tic_tac_toe' && (
                <div className="absolute inset-0 z-40">
                    <P2PTicTacToe onMatchEnd={handleP2PMatchEnd} />
                </div>
            )}
            
            {/* P2P Connect 4 - overlay on top of game world */}
            {isInMatch && activeMatch && activeMatch.gameType === 'connect4' && (
                <div className="absolute inset-0 z-40">
                    <P2PConnect4 onMatchEnd={handleP2PMatchEnd} />
                </div>
            )}
            
            {/* P2P Monopoly - overlay on top of game world */}
            {isInMatch && activeMatch && activeMatch.gameType === 'monopoly' && (
                <div className="absolute inset-0 z-40">
                    <P2PMonopoly onMatchEnd={handleP2PMatchEnd} />
                </div>
            )}
            
            {/* P2P UNO - overlay on top of game world */}
            {isInMatch && activeMatch && activeMatch.gameType === 'uno' && (
                <div className="absolute inset-0 z-40">
                    <P2PUno onMatchEnd={handleP2PMatchEnd} />
                </div>
            )}
            
            {/* P2P Blackjack - overlay on top of game world */}
            {isInMatch && activeMatch && activeMatch.gameType === 'blackjack' && (
                <div className="absolute inset-0 z-40">
                    <P2PBlackjack onMatchEnd={handleP2PMatchEnd} />
                </div>
            )}
            
            {/* P2P Battleship - overlay on top of game world */}
            {isInMatch && activeMatch && activeMatch.gameType === 'battleship' && (
                <div className="absolute inset-0 z-40">
                    <P2PBattleship onMatchEnd={handleP2PMatchEnd} />
                </div>
            )}
            
            {/* Challenge UI Overlays - show when in game world */}
            {inGameWorld && (
                <>
                    {!isInMatch && <ProfileMenu />}
                    {!isInMatch && <WagerModal />}
                    {!isInMatch && <Inbox />}
                    {/* Match spectator banners are rendered in 3D above the players in VoxelWorld */}
                </>
            )}
            
            {/* Igloo UI Modals - show when in game world */}
            {inGameWorld && <IglooUI currentRoom={currentRoom} onEnterRoom={handleChangeRoom} />}
            
            {/* Global Notification Toast */}
            <Notification />
            
            {/* Tip Received Notification */}
            {incomingTip && (
                <TipNotification
                    tip={incomingTip}
                    onClose={() => setIncomingTip(null)}
                />
            )}
            
            {/* Gift Received Notification */}
            {incomingGift && (
                <GiftNotification
                    gift={incomingGift}
                    onClose={() => setIncomingGift(null)}
                />
            )}
            
            {/* Guest Mode Warning (shows when not authenticated) */}
            {inGameWorld && <GuestModeWarning onRequestAuth={handleRequestAuth} />}

            {/* Unified chat — same panel in world + all minigames */}
            {inGameWorld && <GlobalChat minigameMode={chatOverlayMode} />}
            <MobileChatOpener visible={showMobileChatOpener} />
        </div>
    );
};

/**
 * IglooUI - Renders igloo-related modals and settings panel
 * Uses IglooContext for state management
 */
const IglooUI = ({ currentRoom, onEnterRoom }) => {
    const {
        showSettingsPanel,
        showRentalModal,
        showEntryModal,
        showDetailsPanel,
        showRequirementsPanel,
        selectedIgloo,
        entryCheckResult,
        setShowSettingsPanel,
        setShowRentalModal,
        setShowEntryModal,
        setShowDetailsPanel,
        setShowRequirementsPanel,
        updateSettings,
        openSettingsPanel,
        openRentalModal,
        enterIglooDemo,
        checkIglooEntry,
        isOwner,
        myRentals,
        walletAddress
    } = useIgloo();
    
    const { send } = useMultiplayer();
    
    // Check if we're inside an igloo we own
    const isInsideOwnedIgloo = currentRoom?.startsWith('igloo') && isOwner(currentRoom);
    
    // Find the igloo data for settings
    const currentIglooData = myRentals.find(i => i.iglooId === currentRoom);
    
    // Handle rental success
    const handleRentSuccess = (result) => {
        console.log('🏠 Rental success:', result);
        setShowRentalModal(false);
        // Refresh data
        send({ type: 'igloo_list' });
        send({ type: 'igloo_my_rentals' });
        
        // Auto-open settings panel for new owner to customize their igloo
        if (result.igloo) {
            // Use the igloo data from the rental result directly
            openSettingsPanel(result.igloo);
        } else if (result.iglooId) {
            // Fallback: just open by ID (will fetch from server)
            openSettingsPanel(result.iglooId);
        }
    };
    
    // Handle entry success
    const handleEntrySuccess = () => {
        console.log('🏠 Entry success');
        setShowEntryModal(false);
    };
    
    return (
        <>
            {/* Settings Panel */}
            <IglooSettingsPanel
                isOpen={showSettingsPanel}
                onClose={() => setShowSettingsPanel(false)}
                iglooData={selectedIgloo || currentIglooData}
                onSave={(updatedIgloo) => {
                    console.log('🏠 Settings saved:', updatedIgloo);
                }}
            />
            
            {/* Rental Modal */}
            <IglooRentalModal
                isOpen={showRentalModal}
                onClose={() => setShowRentalModal(false)}
                iglooData={selectedIgloo}
                walletAddress={walletAddress}
                onRentSuccess={handleRentSuccess}
            />
            
            {/* Entry Modal (for access restrictions) */}
            <IglooEntryModal
                isOpen={showEntryModal}
                onClose={() => setShowEntryModal(false)}
                iglooData={selectedIgloo}
                entryCheck={entryCheckResult}
                walletAddress={walletAddress}
                onEntrySuccess={handleEntrySuccess}
            />
            
            {/* Details Panel (marketing view for available igloos) */}
            <IglooDetailsPanel
                isOpen={showDetailsPanel}
                onClose={() => setShowDetailsPanel(false)}
                iglooData={selectedIgloo}
                walletAddress={walletAddress}
                onRent={() => openRentalModal(selectedIgloo?.iglooId)}
                onPreview={() => enterIglooDemo(selectedIgloo?.iglooId, onEnterRoom)}
            />
            
            {/* Requirements Panel (for restricted igloos with token gate/entry fee) */}
            <IglooRequirementsPanel
                isOpen={showRequirementsPanel}
                onClose={() => setShowRequirementsPanel(false)}
                iglooData={selectedIgloo}
                walletAddress={walletAddress}
                onEnterSuccess={(iglooId) => {
                    // Entry allowed - transition to room
                    setShowRequirementsPanel(false);
                    if (onEnterRoom) {
                        onEnterRoom(iglooId);
                    }
                }}
            />
            
            {/* Igloo Settings Button moved to GameHUD for better mobile/responsive support */}
        </>
    );
};

/**
 * Clear old localStorage game data on app startup
 * This ensures guests start fresh and removes stale migration data
 */
const clearOldGameData = () => {
    const keysToRemove = [
        'penguin_customization',  // Old cosmetic persistence
        'clubpenguin_save',       // Old game save (coins, stamps, etc)
        'unlocked_mounts',        // Old mount unlocks
        'unlocked_cosmetics',     // Old cosmetic unlocks
        'owned_puffles',          // Old puffle ownership
        'character_type'          // Old character type selection
    ];
    
    keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
            console.log(`🧹 Clearing old localStorage key: ${key}`);
            localStorage.removeItem(key);
        }
    });
};

// Run cleanup once on module load
clearOldGameData();

/**
 * Main App - Wraps providers
 */
const App = () => {
    useEffect(() => {
        initBrowserCapabilities().catch(() => {});
    }, []);

    return (
        <LanguageProvider>
            <MultiplayerProvider>
                <IglooProvider>
                    <ChallengeProvider>
                        <AppContent />
                    </ChallengeProvider>
                </IglooProvider>
            </MultiplayerProvider>
        </LanguageProvider>
    );
};

// Extracted styles component
const Styles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;600;800&display=swap');
        .retro-text { font-family: 'Press Start 2P', cursive; }
        .glass-panel {
            background: rgba(20, 20, 30, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .voxel-btn {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .voxel-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 0 0 rgba(0,0,0,0.5);
        }
        .voxel-btn:active {
            transform: translateY(0);
            box-shadow: 0 0 0 0 rgba(0,0,0,0.5);
        }
        @keyframes fade-in {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 2s ease-in-out infinite; }
        
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.5); }
            50% { box-shadow: 0 0 40px rgba(255,215,0,0.8); }
        }
        .animate-pulse-glow { animation: pulse-glow 1.5s ease-in-out infinite; }
        
        @keyframes pulseGlow {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(1.3); }
        }
        
        @keyframes bounce-hud {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
        }
        .animate-bounce-hud { animation: bounce-hud 1s ease-in-out infinite; }
        
        @keyframes pulse-slow {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(0) rotate(-5deg); }
            50% { transform: translateY(-8px) rotate(5deg); }
        }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
    `}</style>
);

export default App;
