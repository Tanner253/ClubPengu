import React, { useState, useEffect } from 'react';
import VoxelPenguinDesigner from './VoxelPenguinDesigner';
import VoxelWorld from './VoxelWorld';
import CardJitsu from './minigames/CardJitsu';
import GameManager from './engine/GameManager';

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
    const handleChangeRoom = (newRoom) => {
        GameManager.getInstance().setRoom(newRoom);
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

    // If in designer mode
    if (currentRoom === null) {
        return (
            <div className="w-screen h-screen">
                <Styles />
                <VoxelPenguinDesigner 
                    onEnterWorld={handleEnterWorld} 
                    currentData={penguinData}
                    updateData={setPenguinData}
                />
            </div>
        );
    }
    
    // If playing a minigame
    if (activeMinigame === 'card-jitsu') {
        return (
            <div className="w-screen h-screen">
                <Styles />
                <CardJitsu 
                    penguinData={penguinData}
                    onExit={handleExitMinigame}
                />
            </div>
        );
    }
    
    // Main game world (VoxelWorld handles ALL rooms via layer system)
    return (
        <div className="w-screen h-screen">
            <Styles />
            <VoxelWorld 
                penguinData={penguinData} 
                room={currentRoom}
                onExitToDesigner={handleExitToDesigner}
                onChangeRoom={handleChangeRoom}
                onStartMinigame={handleStartMinigame}
                playerPuffle={playerPuffle}
                onPuffleChange={setPlayerPuffle}
            />
        </div>
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
