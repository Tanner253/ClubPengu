import React, { useState, useEffect } from 'react';
import GameManager from '../engine/GameManager';
import InboxButton from './InboxButton';
import TokenomicsModal from './TokenomicsModal';
import WalletButton from './WalletButton';
import StatsModal from './StatsModal';
import PebblesPurchaseModal from './PebblesPurchaseModal';
import InventoryModal from './InventoryModal';
import { useMultiplayer } from '../multiplayer';

/**
 * GameHUD - Heads Up Display showing coins, stats, and quick actions
 * Responsive: horizontal on landscape/desktop, vertical sidebar on portrait mobile
 */
const GameHUD = ({ showMinimap = false, onOpenPuffles, showInbox = true, onOpenSettings, isMobile = false, playerCount = 0, totalPlayerCount = 0, onRequestAuth, currentRoom, isInsideOwnedIgloo = false, onOpenIglooSettings }) => {
    const [coins, setCoins] = useState(0);
    const [showStatsModal, setShowStatsModal] = useState(false);  // Full stats modal
    const [recentReward, setRecentReward] = useState(null);
    const [showTokenomics, setShowTokenomics] = useState(false);
    const [showPebblesPurchase, setShowPebblesPurchase] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    
    // Get pebbles from multiplayer context
    const { userData, isAuthenticated } = useMultiplayer();
    const pebbles = userData?.pebbles || 0;
    
    // Detect portrait mode for responsive layout
    const [isPortrait, setIsPortrait] = useState(() => 
        typeof window !== 'undefined' && window.innerWidth < window.innerHeight && window.innerWidth < 600
    );
    
    useEffect(() => {
        const checkOrientation = () => {
            setIsPortrait(window.innerWidth < window.innerHeight && window.innerWidth < 600);
        };
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 100));
        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);
    
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
    
    // Compact button style for portrait mode
    const compactBtn = "w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all active:scale-90";
    
    // Portrait mode: vertical sidebar on right
    if (isPortrait) {
        return (
            <>
                {/* Portrait: Top bar with essential info */}
                <div className="absolute top-1 right-1 left-1 z-20 flex items-center justify-end gap-1">
                    {/* Wallet Button */}
                    <WalletButton onRequestAuth={onRequestAuth} compact={true} />
                    
                    {/* Player Count */}
                    <div className="bg-black/70 backdrop-blur-md rounded-lg px-1.5 py-1 flex items-center gap-1 border border-cyan-400/30">
                        <span className="text-[10px]">👥</span>
                        <span className="text-cyan-300 font-bold retro-text text-[10px]">{playerCount + 1}</span>
                        <span className="text-white/40 text-[8px]">/</span>
                        <span className="text-green-400 font-bold retro-text text-[10px]">{totalPlayerCount || playerCount + 1}</span>
                    </div>
                    
                    {/* Coins */}
                    <div className="bg-black/70 backdrop-blur-md rounded-lg px-1.5 py-1 flex items-center gap-1 border border-yellow-400/30">
                        <span className="text-[10px]">💰</span>
                        <span className="text-yellow-300 font-bold retro-text text-[10px]">{coins}</span>
                    </div>
                    
                    {/* Pebbles - Premium Currency (Always visible + button) */}
                    {isAuthenticated && (
                        <button 
                            onClick={() => setShowPebblesPurchase(true)}
                            className="bg-black/70 backdrop-blur-md rounded-lg px-1.5 py-1 flex items-center gap-1 border border-purple-400/50 active:border-purple-400 active:bg-purple-900/30 transition-colors touch-manipulation"
                        >
                            <span className="text-[10px]">🪨</span>
                            <span className="text-purple-300 font-bold retro-text text-[10px]">{pebbles}</span>
                            <span className="text-green-400 font-bold text-xs bg-green-500/30 rounded px-1 ml-0.5">+</span>
                        </button>
                    )}
                    
                    {/* Inventory Button (Mobile) */}
                    {isAuthenticated && (
                        <button 
                            onClick={() => setShowInventory(true)}
                            className="bg-black/70 backdrop-blur-md rounded-lg px-1.5 py-1 flex items-center gap-1 border border-amber-400/50 active:border-amber-400 active:bg-amber-900/30 transition-colors touch-manipulation"
                        >
                            <span className="text-[10px]">📦</span>
                        </button>
                    )}
                </div>
                
                {/* Portrait: Vertical sidebar on right */}
                <div className="absolute top-12 right-1 z-20 flex flex-col gap-1 bg-black/50 backdrop-blur-sm rounded-lg p-1">
                    {/* Whitepaper - NEW */}
                    <a
                        href="https://whitepaper.waddle.bet"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${compactBtn} bg-gradient-to-r from-cyan-600/80 to-blue-600/80`}
                        title="Whitepaper"
                    >
                        📄
                    </a>
                    
                    {/* Tokenomics */}
                    <button
                        onClick={() => setShowTokenomics(true)}
                        className={`${compactBtn} bg-gradient-to-r from-purple-600/80 to-pink-600/80 relative`}
                        title="$WADDLE Tokenomics"
                    >
                        ❗
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" />
                    </button>
                    
                    {/* Chart */}
                    <a
                        href="https://dexscreener.com/solana/5yfmefzrompokc2r9j8b1mzqututhywr9vrqmsxhzd3r"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${compactBtn} bg-gradient-to-r from-green-600/80 to-emerald-600/80`}
                        title="View Chart"
                    >
                        📈
                    </a>
                    
                    {/* Inbox */}
                    {showInbox && <InboxButton compact={true} />}
                    
                    {/* Settings */}
                    {onOpenSettings && (
                        <button
                            onClick={onOpenSettings}
                            className={`${compactBtn} bg-gray-700/80`}
                            title="Settings"
                        >
                            ⚙️
                        </button>
                    )}
                    
                    {/* Igloo Settings - Only show when inside owned igloo */}
                    {isInsideOwnedIgloo && onOpenIglooSettings && (
                        <button
                            onClick={onOpenIglooSettings}
                            className={`${compactBtn} bg-gradient-to-r from-purple-600/80 to-pink-600/80`}
                            title="Igloo Settings"
                        >
                            🏠
                        </button>
                    )}
                    
                    {/* Puffles */}
                    <button
                        onClick={onOpenPuffles}
                        className={`${compactBtn} bg-purple-600/80`}
                        title="Puffles"
                    >
                        🐾
                    </button>
                    
                    {/* Stats */}
                    <button 
                        onClick={() => setShowStatsModal(true)}
                        className={`${compactBtn} bg-black/50`}
                        title="Full Statistics"
                    >
                        📊
                    </button>
                </div>
                
                {/* Coin Reward Animation */}
                {recentReward && (
                    <div className="absolute top-14 right-12 z-30 animate-bounce">
                        <div className="bg-green-500/90 text-white px-2 py-0.5 rounded-lg retro-text text-[10px]">
                            +{recentReward.amount} 💰
                        </div>
                    </div>
                )}
                
                {/* Tokenomics Modal */}
                <TokenomicsModal 
                    isOpen={showTokenomics} 
                    onClose={() => setShowTokenomics(false)} 
                />
                
                {/* Full Stats Modal */}
                <StatsModal
                    isOpen={showStatsModal}
                    onClose={() => setShowStatsModal(false)}
                />
                
                {/* Pebbles Purchase Modal */}
                <PebblesPurchaseModal
                    isOpen={showPebblesPurchase}
                    onClose={() => setShowPebblesPurchase(false)}
                />
                
                {/* Inventory Modal (Portrait) */}
                <InventoryModal
                    isOpen={showInventory}
                    onClose={() => setShowInventory(false)}
                />
            </>
        );
    }
    
    // Landscape/Desktop: Horizontal top bar
    return (
        <>
            {/* HUD Bar - Top Right */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 sm:gap-2">
                {/* Whitepaper - NEW */}
                <a
                    href="https://whitepaper.waddle.bet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-cyan-600/80 to-blue-600/80 hover:from-cyan-500 hover:to-blue-500 active:from-cyan-700 active:to-blue-700 backdrop-blur-sm text-white w-9 h-9 sm:px-3 sm:py-2 sm:w-auto sm:h-auto rounded-lg retro-text text-sm transition-colors flex items-center justify-center hover:scale-105 active:scale-95"
                    title="Whitepaper & Info"
                >
                    📄
                </a>
                
                {/* Tokenomics Button - Animated Exclamation */}
                <button
                    onClick={() => setShowTokenomics(true)}
                    className="relative bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 active:from-purple-700 active:to-pink-700 backdrop-blur-sm text-white w-9 h-9 sm:px-3 sm:py-2 sm:w-auto sm:h-auto rounded-lg retro-text text-sm transition-colors flex items-center justify-center animate-bounce-hud group"
                    title="$WADDLE Tokenomics"
                >
                    <span className="group-hover:scale-125 transition-transform">❗</span>
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" />
                </button>
                
                {/* Chart Button - DEX Screener Link */}
                <a
                    href="https://dexscreener.com/solana/5yfmefzrompokc2r9j8b1mzqututhywr9vrqmsxhzd3r"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-green-600/80 to-emerald-600/80 hover:from-green-500 hover:to-emerald-500 active:from-green-700 active:to-emerald-700 backdrop-blur-sm text-white w-9 h-9 sm:px-3 sm:py-2 sm:w-auto sm:h-auto rounded-lg retro-text text-sm transition-colors flex items-center justify-center hover:scale-105 active:scale-95"
                    title="View Chart on DEX Screener"
                >
                    📈
                </a>
                
                {/* Settings Button */}
                {onOpenSettings && (
                    <button
                        onClick={onOpenSettings}
                        className="bg-gray-700/80 hover:bg-gray-600 active:bg-gray-500 backdrop-blur-sm text-white w-9 h-9 sm:px-3 sm:py-2 sm:w-auto sm:h-auto rounded-lg retro-text text-xs transition-colors flex items-center justify-center"
                        title="Settings"
                    >
                        ⚙️
                    </button>
                )}
                
                {/* Igloo Settings Button - Only show when inside owned igloo */}
                {isInsideOwnedIgloo && onOpenIglooSettings && (
                    <button
                        onClick={onOpenIglooSettings}
                        className="bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 active:from-purple-700 active:to-pink-700 backdrop-blur-sm text-white w-9 h-9 sm:px-3 sm:py-2 sm:w-auto sm:h-auto rounded-lg retro-text text-xs transition-colors flex items-center justify-center gap-1"
                        title="Igloo Settings"
                    >
                        🏠
                        <span className="hidden sm:inline text-[10px]">Igloo</span>
                    </button>
                )}
                
                {/* Inbox Button */}
                {showInbox && <InboxButton />}
                
                {/* Puffles Button */}
                <button
                    onClick={onOpenPuffles}
                    className="bg-purple-600/80 hover:bg-purple-500 active:bg-purple-400 backdrop-blur-sm text-white w-9 h-9 sm:px-3 sm:py-2 sm:w-auto sm:h-auto rounded-lg retro-text text-xs transition-colors flex items-center justify-center"
                    title="Manage Puffles"
                >
                    🐾
                </button>
                
                {/* Wallet Connection Button */}
                <WalletButton onRequestAuth={onRequestAuth} />
                
                {/* Stats Button */}
                <button 
                    onClick={() => setShowStatsModal(true)}
                    className="bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg p-2 transition-all"
                    title="Full Statistics"
                >
                    <span className="text-sm">📊</span>
                </button>
                
                {/* Player Count - Room / Total */}
                <div className="bg-black/70 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 border border-cyan-400/30" title="In Room / Online Total">
                    <span className="text-lg">👥</span>
                    <span className="text-cyan-300 font-bold retro-text text-sm">{playerCount + 1}</span>
                    <span className="text-white/40 retro-text text-xs">/</span>
                    <span className="text-green-400 font-bold retro-text text-sm">{totalPlayerCount || playerCount + 1}</span>
                </div>
                
                {/* Coins Display */}
                <div className="bg-black/70 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 border border-yellow-400/30">
                    <span className="text-lg">💰</span>
                    <span className="text-yellow-300 font-bold retro-text text-sm">{coins}</span>
                </div>
                
                {/* Pebbles Display - Premium Currency */}
                {isAuthenticated && (
                    <button 
                        onClick={() => setShowPebblesPurchase(true)}
                        className="bg-black/70 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 border border-purple-400/30 hover:border-purple-400/60 hover:bg-black/80 transition-all group"
                        title="Buy Pebbles for Gacha Rolls"
                    >
                        <span className="text-lg">🪨</span>
                        <span className="text-purple-300 font-bold retro-text text-sm">{pebbles}</span>
                        <span className="text-green-400 font-bold text-lg ml-1 opacity-60 group-hover:opacity-100 transition-opacity">+</span>
                    </button>
                )}
                
                {/* Inventory Button */}
                {isAuthenticated && (
                    <button 
                        onClick={() => setShowInventory(true)}
                        className="bg-black/70 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 border border-amber-400/30 hover:border-amber-400/60 hover:bg-black/80 transition-all"
                        title="Open Inventory"
                    >
                        <span className="text-lg">📦</span>
                        <span className="text-amber-300 font-bold retro-text text-sm hidden sm:inline">Inventory</span>
                    </button>
                )}
            </div>
            
            {/* Coin Reward Animation */}
            {recentReward && (
                <div className="absolute top-16 right-4 z-30 animate-bounce">
                    <div className="bg-green-500/90 text-white px-3 py-1 rounded-lg retro-text text-xs">
                        +{recentReward.amount} 💰
                    </div>
                </div>
            )}
            
            {/* Tokenomics Modal */}
            <TokenomicsModal 
                isOpen={showTokenomics} 
                onClose={() => setShowTokenomics(false)} 
            />
            
            {/* Full Stats Modal */}
            <StatsModal
                isOpen={showStatsModal}
                onClose={() => setShowStatsModal(false)}
            />
            
            {/* Pebbles Purchase Modal */}
            <PebblesPurchaseModal
                isOpen={showPebblesPurchase}
                onClose={() => setShowPebblesPurchase(false)}
            />
            
            {/* Inventory Modal */}
            <InventoryModal
                isOpen={showInventory}
                onClose={() => setShowInventory(false)}
            />
        </>
    );
};

export default GameHUD;
