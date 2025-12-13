import React, { useState, useEffect } from 'react';
import VoxelPenguinDesigner from './VoxelPenguinDesigner';
import VoxelWorld from './VoxelWorld';
import CardJitsu from './minigames/CardJitsu';
import P2PCardJitsu from './minigames/P2PCardJitsu';
import GameManager from './engine/GameManager';
import { MultiplayerProvider } from './multiplayer';
import { ChallengeProvider, useChallenge } from './challenge';
import ProfileMenu from './components/ProfileMenu';
import WagerModal from './components/WagerModal';
import Inbox from './components/Inbox';
import Notification from './components/Notification';

// --- MAIN APP CONTROLLER ---

/**
 * Inner app content that uses challenge context
 */
const AppContent = () => {
    // Current room/layer: 'town', 'dojo', etc.
    const [currentRoom, setCurrentRoom] = useState(null); // null = designer
    const [penguinData, setPenguinData] = useState(() => {
        // Load saved penguin customization from localStorage
        try {
            const saved = localStorage.getItem('penguin_customization');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load penguin customization:', e);
        }
        // Default penguin
        return {
            skin: 'blue',
            hat: 'none',
            eyes: 'normal',
            mouth: 'beak',
            bodyItem: 'none',
            characterType: 'penguin'
        };
    });
    
    // Puffle state (shared across all rooms)
    const [playerPuffle, setPlayerPuffle] = useState(null);
    
    // Minigame state (separate from room system)
    const [activeMinigame, setActiveMinigame] = useState(null);
    
    // Custom spawn position (when exiting dojo/igloo to town)
    const [spawnPosition, setSpawnPosition] = useState(null);
    
    // Challenge context for P2P matches
    const { isInMatch, activeMatch, matchState, selectPlayer, activeMatches, spectatingMatch } = useChallenge();
    
    // Initialize GameManager on mount
    useEffect(() => {
        const gm = GameManager.getInstance();
        
        // Give new players starting coins
        if (gm.getCoins() === 0) {
            gm.addCoins(500, 'welcome_bonus');
        }
        
        console.log('🐧 Club Penguin Clone Loaded!');
        console.log('💰 Coins:', gm.getCoins());
    }, []);
    
    // Save penguin customization whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('penguin_customization', JSON.stringify(penguinData));
        } catch (e) {
            console.warn('Failed to save penguin customization:', e);
        }
    }, [penguinData]);
    
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
    const handleChangeRoom = (newRoom, exitSpawnPos = null) => {
        GameManager.getInstance().setRoom(newRoom);
        setSpawnPosition(exitSpawnPos); // Will be used by VoxelWorld for spawn location
        setCurrentRoom(newRoom);
    };
    
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
            
            {/* P2P Card Jitsu - overlay on top of game world (players stay visible) */}
            {isInMatch && activeMatch && (
                <div className="absolute inset-0 z-40">
                    <P2PCardJitsu onMatchEnd={handleP2PMatchEnd} />
                </div>
            )}
            
            {/* Challenge UI Overlays - show when in game world */}
            {inGameWorld && (
                <>
                    {!isInMatch && <ProfileMenu />}
                    {!isInMatch && <WagerModal />}
                    {!isInMatch && <Inbox />}
                    {/* Match spectator banners are now rendered in 3D in VoxelWorld */}
                </>
            )}
            
            {/* Global Notification Toast */}
            <Notification />
        </div>
    );
};

/**
 * Main App - Wraps providers
 */
const App = () => {
    return (
        <MultiplayerProvider>
            <ChallengeProvider>
                <AppContent />
            </ChallengeProvider>
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
    `}</style>
);

export default App;
