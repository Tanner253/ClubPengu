import React, { useState, useEffect } from 'react';
import GameManager from '../engine/GameManager';

/**
 * GameHUD - Heads Up Display showing coins, stats, and quick actions
 */
const GameHUD = ({ showMinimap = false, onOpenPuffles }) => {
    const [coins, setCoins] = useState(0);
    const [showStats, setShowStats] = useState(false);
    const [recentReward, setRecentReward] = useState(null);
    
    useEffect(() => {
        const gm = GameManager.getInstance();
        setCoins(gm.getCoins());
        
        // Listen for coin changes
        const unsubscribe = gm.on('coinsChanged', (data) => {
            setCoins(data.coins);
            
            // Show reward animation
            if (data.delta > 0) {
                setRecentReward({ amount: data.delta, reason: data.reason });
                setTimeout(() => setRecentReward(null), 2000);
            }
        });
        
        return () => unsubscribe();
    }, []);
    
    const stats = GameManager.getInstance().stats;
    
    return (
        <>
            {/* HUD Bar - Top Right */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                {/* Puffles Button */}
                <button
                    onClick={onOpenPuffles}
                    className="bg-purple-600/80 hover:bg-purple-500 backdrop-blur-sm text-white px-3 py-2 rounded-lg retro-text text-xs transition-colors"
                    title="Manage Puffles"
                >
                    🐾
                </button>
                
                {/* Stats Button */}
                <button 
                    onClick={() => setShowStats(!showStats)}
                    className="bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg p-2 transition-all"
                    title="View Stats"
                >
                    <span className="text-sm">📊</span>
                </button>
                
                {/* Coins Display */}
                <div className="bg-black/70 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 border border-yellow-400/30">
                    <span className="text-lg">💰</span>
                    <span className="text-yellow-300 font-bold retro-text text-sm">{coins}</span>
                </div>
            </div>
            
            {/* Coin Reward Animation */}
            {recentReward && (
                <div className="absolute top-16 right-4 z-30 animate-bounce">
                    <div className="bg-green-500/90 text-white px-3 py-1 rounded-lg retro-text text-xs">
                        +{recentReward.amount} 💰
                    </div>
                </div>
            )}
            
            {/* Stats Panel */}
            {showStats && (
                <div className="absolute top-16 right-4 z-20 bg-black/85 backdrop-blur-md rounded-xl p-4 min-w-[180px] border border-white/10">
                    <h3 className="text-white font-bold mb-3 retro-text text-xs border-b border-white/10 pb-2">📊 STATS</h3>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-white/80">
                            <span>Games Played</span>
                            <span className="text-yellow-400 font-bold">{stats.gamesPlayed}</span>
                        </div>
                        <div className="flex justify-between text-white/80">
                            <span>Games Won</span>
                            <span className="text-green-400 font-bold">{stats.gamesWon}</span>
                        </div>
                        <div className="flex justify-between text-white/80">
                            <span>Win Rate</span>
                            <span className="text-cyan-400 font-bold">
                                {stats.gamesPlayed > 0 
                                    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
                                    : 0}%
                            </span>
                        </div>
                        <div className="flex justify-between text-white/80">
                            <span>Chats Sent</span>
                            <span className="text-purple-400 font-bold">{stats.chatsSent}</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setShowStats(false)}
                        className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white py-1 rounded text-xs transition-colors"
                    >
                        Close
                    </button>
                </div>
            )}
        </>
    );
};

export default GameHUD;

