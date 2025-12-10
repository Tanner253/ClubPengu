import React, { useState, useEffect } from 'react';
import VoxelPenguinDesigner from './VoxelPenguinDesigner';
import VoxelWorld from './VoxelWorld';
import CardJitsu from './minigames/CardJitsu';
import GameManager from './engine/GameManager';
import { MultiplayerProvider } from './multiplayer';

// --- MAIN APP CONTROLLER ---

const App = () => {
    // Current room/layer: 'town', 'dojo', etc.
    const [currentRoom, setCurrentRoom] = useState(null); // null = designer
    const [penguinData, setPenguinData] = useState({
        skin: 'blue',
        hat: 'none',
        eyes: 'normal',
        mouth: 'beak',
        bodyItem: 'none'
    });
    
    // Puffle state (shared across all rooms)
    const [playerPuffle, setPlayerPuffle] = useState(null);
    
    // Minigame state (separate from room system)
    const [activeMinigame, setActiveMinigame] = useState(null);
    
    // Custom spawn position (when exiting dojo/igloo to town)
    const [spawnPosition, setSpawnPosition] = useState(null);
    
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

    // Determine content based on current state
    let content;
    
    if (currentRoom === null) {
        // Designer mode
        content = (
            <VoxelPenguinDesigner 
                onEnterWorld={handleEnterWorld} 
                currentData={penguinData}
                updateData={setPenguinData}
            />
        );
    } else if (activeMinigame === 'card-jitsu') {
        // Minigame mode
        content = (
            <CardJitsu 
                penguinData={penguinData}
                onExit={handleExitMinigame}
            />
        );
    } else {
        // Main game world
        content = (
            <VoxelWorld 
                penguinData={penguinData} 
                room={currentRoom}
                onExitToDesigner={handleExitToDesigner}
                onChangeRoom={handleChangeRoom}
                onStartMinigame={handleStartMinigame}
                playerPuffle={playerPuffle}
                onPuffleChange={setPlayerPuffle}
                customSpawnPos={spawnPosition}
            />
        );
    }
    
    return (
        <MultiplayerProvider>
            <div className="w-screen h-screen">
                <Styles />
                {content}
            </div>
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
