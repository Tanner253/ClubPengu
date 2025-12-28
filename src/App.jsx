import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { MultiplayerProvider, useMultiplayer } from './multiplayer';
import { ChallengeProvider, useChallenge } from './challenge';
import { IglooProvider, useIgloo } from './igloo';
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

// Background Music Player Component
const BackgroundMusic = () => {
    const audioRef = useRef(null);
    const hasInteractedRef = useRef(false);
    
    useEffect(() => {
        // Create audio element
        const audio = new Audio('/lofi.mp3');
        audio.loop = true;
        audio.preload = 'auto';
        audioRef.current = audio;
        
        // Load volume from settings and apply
        const applyVolume = () => {
            try {
                const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
                const volume = settings.musicVolume ?? 0.3;
                const isMusicMuted = settings.musicMuted === true;
                const isSoundEnabled = settings.soundEnabled !== false; // Master sound toggle
                
                if (audioRef.current) {
                    // Clamp volume between 0 and 1
                    const clampedVolume = Math.max(0, Math.min(1, volume));
                    audioRef.current.volume = clampedVolume;
                    
                    // If master sound off, music muted, or volume is 0, pause the audio
                    if (!isSoundEnabled || isMusicMuted || clampedVolume === 0) {
                        audioRef.current.pause();
                    } else if (hasInteractedRef.current && audioRef.current.paused) {
                        // Sound enabled, not muted, volume > 0, and we've interacted - resume
                        audioRef.current.play().catch(() => {});
                    }
                }
            } catch (e) {
                console.warn('Failed to apply music volume:', e);
            }
        };
        
        // Initial volume
        applyVolume();
        
        // Listen for settings changes
        window.addEventListener('storage', applyVolume);
        window.addEventListener('settingsChanged', applyVolume);
        
        // Start playing after first user interaction (browser autoplay policy)
        const startMusic = () => {
            hasInteractedRef.current = true;
            if (audioRef.current) {
                // Check settings before playing
                const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
                const volume = settings.musicVolume ?? 0.3;
                const isMusicMuted = settings.musicMuted === true;
                const isSoundEnabled = settings.soundEnabled !== false;
                
                // Only play if sound enabled, not muted, and volume > 0
                if (isSoundEnabled && !isMusicMuted && volume > 0) {
                    audioRef.current.volume = volume;
                    audioRef.current.play().catch((err) => {
                        console.warn('Failed to start music:', err);
                    });
                }
            }
        };
        
        document.addEventListener('click', startMusic, { once: true });
        document.addEventListener('keydown', startMusic, { once: true });
        document.addEventListener('touchstart', startMusic, { once: true });
        
        return () => {
            window.removeEventListener('storage', applyVolume);
            window.removeEventListener('settingsChanged', applyVolume);
            document.removeEventListener('click', startMusic);
            document.removeEventListener('keydown', startMusic);
            document.removeEventListener('touchstart', startMusic);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);
    
    return null; // No UI, just audio
};

// --- MAIN APP CONTROLLER ---

/**
 * Inner app content that uses challenge context
 */
const AppContent = () => {
    // Current room/layer: 'town', 'dojo', etc.
    const [currentRoom, setCurrentRoom] = useState(null); // null = designer
    
    // Get auth state and user data from multiplayer context
    const { isAuthenticated, userData, isRestoringSession, walletAddress } = useMultiplayer();
    
    // Penguin customization - synced from server for auth users, defaults for guests
    const [penguinData, setPenguinData] = useState(DEFAULT_PENGUIN);
    
    // Track which wallet we've synced customization for (prevent stale data between wallets)
    const syncedWalletRef = useRef(null);
    
    // Sync penguin data from server when authenticated (including session restore)
    // CRITICAL: Track wallet address to detect wallet switches
    useEffect(() => {
        if (isAuthenticated && userData?.customization) {
            // Only sync if this is a NEW wallet or we haven't synced yet
            if (syncedWalletRef.current !== walletAddress) {
                console.log('🐧 Loading customization from server:', userData.customization);
                setPenguinData({
                    ...DEFAULT_PENGUIN,
                    ...userData.customization
                });
                syncedWalletRef.current = walletAddress;
            }
        } else if (!isAuthenticated && !isRestoringSession) {
            // Guest mode - use defaults and clear synced wallet
            syncedWalletRef.current = null;
            setPenguinData(DEFAULT_PENGUIN);
        }
    }, [isAuthenticated, userData?.customization, isRestoringSession, walletAddress]);
    
    // Puffle state (shared across all rooms)
    const [playerPuffle, setPlayerPuffle] = useState(null);
    
    // Minigame state (separate from room system)
    const [activeMinigame, setActiveMinigame] = useState(null);
    
    // Custom spawn position (when exiting dojo/igloo to town)
    const [spawnPosition, setSpawnPosition] = useState(null);
    
    // Tip notification state
    const [incomingTip, setIncomingTip] = useState(null);
    
    // Listen for incoming tips via WebSocket
    useEffect(() => {
        const ws = window.__multiplayerWs;
        if (!ws) return;
        
        const handleTip = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'tip_received') {
                    setIncomingTip(data);
                }
            } catch (e) {
                // Ignore parse errors
            }
        };
        
        ws.addEventListener('message', handleTip);
        return () => ws.removeEventListener('message', handleTip);
    }, []);
    
    // Challenge context for P2P matches
    const { isInMatch, activeMatch, matchState, selectPlayer, activeMatches, spectatingMatch, activePveActivities } = useChallenge();
    
    // Initialize GameManager on mount
    useEffect(() => {
        const gm = GameManager.getInstance();
        console.log('🐧 WaddleBet Loaded!');
        console.log('💰 Coins:', gm.getCoins());
    }, []);
    
    // Enter the game world (from designer)
    const handleEnterWorld = () => {
        GameManager.getInstance().setRoom('town');
        setCurrentRoom('town');
    };
    
    // Exit to designer
    const handleExitToDesigner = () => {
        setCurrentRoom(null);
        setActiveMinigame(null);
    };
    
    // Change room/layer (town -> dojo, dojo -> town, etc.)
    // Memoized to prevent useEffect re-runs in VoxelWorld igloo tracking
    const handleChangeRoom = useCallback((newRoom, exitSpawnPos = null) => {
        GameManager.getInstance().setRoom(newRoom);
        setSpawnPosition(exitSpawnPos); // Will be used by VoxelWorld for spawn location
        setCurrentRoom(newRoom);
    }, []);
    
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
    };

    // Check if we're in the game world (not designer)
    const inGameWorld = currentRoom !== null;
    
    return (
        <div className="w-screen h-screen">
            <Styles />
            
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
                        room={currentRoom}
                        onExitToDesigner={handleExitToDesigner}
                        onChangeRoom={handleChangeRoom}
                        onStartMinigame={handleStartMinigame}
                        playerPuffle={playerPuffle}
                        onPuffleChange={setPlayerPuffle}
                        customSpawnPos={spawnPosition}
                        onPlayerClick={handlePlayerClick}
                        isInMatch={isInMatch}
                        activeMatches={activeMatches}
                        spectatingMatch={spectatingMatch}
                        activePveActivities={activePveActivities}
                        onRequestAuth={handleRequestAuth}
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
            
            {/* Guest Mode Warning (shows when not authenticated) */}
            {inGameWorld && <GuestModeWarning onRequestAuth={handleRequestAuth} />}
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
    return (
        <MultiplayerProvider>
            <IglooProvider>
                <ChallengeProvider>
                    <BackgroundMusic />
                    <AppContent />
                </ChallengeProvider>
            </IglooProvider>
        </MultiplayerProvider>
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
