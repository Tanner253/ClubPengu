/**
 * ProfileMenu - Displays player profile when clicking on another player
 * Shows name, penguin preview, stats, and challenge button
 */

import React, { useState, useEffect, useRef } from 'react';
import { useChallenge } from '../challenge';
import GameManager from '../engine/GameManager';

const ProfileMenu = () => {
    const {
        selectedPlayer,
        selectedPlayerStats,
        clearSelectedPlayer,
        openWagerModal,
        isInMatch,
        showWagerModal
    } = useChallenge();
    
    const [showGameDropdown, setShowGameDropdown] = useState(false);
    const menuRef = useRef(null);
    
    // Close on click/touch outside (but not when wager modal is open)
    useEffect(() => {
        const handleClickOutside = (e) => {
            // Don't close if wager modal is open
            if (showWagerModal) {
                return;
            }
            
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                clearSelectedPlayer();
            }
        };
        
        const handleEscape = (e) => {
            // Don't close profile if wager modal is open (wager modal handles its own escape)
            if (showWagerModal) {
                return;
            }
            if (e.key === 'Escape') {
                clearSelectedPlayer();
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside, { passive: true });
        document.addEventListener('keydown', handleEscape);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [clearSelectedPlayer, showWagerModal]);
    
    if (!selectedPlayer) return null;
    
    const stats = selectedPlayerStats?.[selectedPlayer.id];
    const playerCoins = GameManager.getInstance().getCoins();
    
    // Get penguin color for preview
    const penguinColor = selectedPlayer.appearance?.skin || 'blue';
    const colorHex = {
        blue: '#0066CC', red: '#CC2222', green: '#228B22', pink: '#FF69B4',
        purple: '#6B2D8B', orange: '#FF6600', yellow: '#DAA520', black: '#1A1A1A',
        white: '#F5F5F5', teal: '#008080', gold: '#DAA520', cyan: '#00CED1'
    }[penguinColor] || '#0066CC';
    
    const handleChallengeClick = () => {
        setShowGameDropdown(!showGameDropdown);
    };
    
    const handleGameSelect = (gameType) => {
        setShowGameDropdown(false);
        openWagerModal(gameType);
    };
    
    // Available games
    const availableGames = [
        { id: 'card_jitsu', name: 'Card Jitsu', emoji: '⚔️', available: true },
        { id: 'tic_tac_toe', name: 'Tic Tac Toe', emoji: '⭕', available: true },
        { id: 'connect4', name: 'Connect 4', emoji: '🔴', available: true },
        { id: 'pong', name: 'Pong', emoji: '🏓', available: false },
    ];
    
    // Stop all event propagation to prevent 3D canvas interactions
    const handleMenuInteraction = (e) => {
        e.stopPropagation();
    };
    
    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4"
            onMouseDown={handleMenuInteraction}
            onClick={handleMenuInteraction}
            onTouchStart={handleMenuInteraction}
            onTouchEnd={handleMenuInteraction}
        >
            <div 
                ref={menuRef}
                data-no-camera="true"
                className="pointer-events-auto bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4 sm:p-5 w-full max-w-[280px] sm:max-w-[300px] animate-fade-in relative"
                onMouseDown={handleMenuInteraction}
                onClick={handleMenuInteraction}
                onTouchStart={handleMenuInteraction}
                onTouchEnd={handleMenuInteraction}
            >
                {/* Close button */}
                <button 
                    onClick={clearSelectedPlayer}
                    className="absolute top-2 right-2 sm:top-3 sm:right-3 text-white/50 hover:text-white active:text-white transition-colors w-8 h-8 flex items-center justify-center text-lg"
                >
                    ✕
                </button>
                
                {/* Penguin Preview */}
                <div className="flex justify-center mb-3 sm:mb-4">
                    <div 
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-lg"
                        style={{ 
                            background: `linear-gradient(135deg, ${colorHex}, ${colorHex}88)`,
                            border: '3px solid rgba(255,255,255,0.2)'
                        }}
                    >
                        🐧
                    </div>
                </div>
                
                {/* Player Name */}
                <h3 className="text-center text-lg sm:text-xl font-bold text-white mb-1 truncate px-6">
                    {selectedPlayer.name}
                </h3>
                
                {/* Hat indicator */}
                {selectedPlayer.appearance?.hat && selectedPlayer.appearance.hat !== 'none' && (
                    <p className="text-center text-white/50 text-xs mb-2 sm:mb-3">
                        Wearing: {selectedPlayer.appearance.hat}
                    </p>
                )}
                
                {/* Stats */}
                <div className="bg-black/30 rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-white/60">⚔️ Card Jitsu</span>
                        <span className="text-yellow-400 font-bold">
                            {stats?.cardJitsuWins ?? 0}W / {stats?.cardJitsuLosses ?? 0}L
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-white/60">⭕ Tic Tac Toe</span>
                        <span className="text-cyan-400 font-bold">
                            {stats?.ticTacToeWins ?? 0}W / {stats?.ticTacToeLosses ?? 0}L
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-white/60">🔴 Connect 4</span>
                        <span className="text-red-400 font-bold">
                            {stats?.connect4Wins ?? 0}W / {stats?.connect4Losses ?? 0}L
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm pt-1.5 border-t border-white/10">
                        <span className="text-white/60">📊 Total</span>
                        <span className="text-green-400 font-bold">
                            {(stats?.cardJitsuWins ?? 0) + (stats?.ticTacToeWins ?? 0) + (stats?.connect4Wins ?? 0)}W
                        </span>
                    </div>
                </div>
                
                {/* Challenge Button */}
                <div className="relative">
                    <button
                        onClick={handleChallengeClick}
                        disabled={isInMatch}
                        className={`w-full py-2.5 sm:py-3 rounded-xl font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
                            isInMatch 
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 active:from-red-600 active:to-orange-600 active:scale-95'
                        }`}
                    >
                        <span>⚔️</span>
                        <span>Challenge</span>
                        <span className={`transition-transform ${showGameDropdown ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    
                    {/* Game Dropdown */}
                    {showGameDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-xl border border-white/10 overflow-hidden shadow-xl animate-fade-in max-h-48 overflow-y-auto">
                            {availableGames.map(game => (
                                <button
                                    key={game.id}
                                    onClick={() => game.available && handleGameSelect(game.id)}
                                    disabled={!game.available}
                                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 transition-colors ${
                                        game.available 
                                            ? 'hover:bg-white/10 active:bg-white/20 text-white'
                                            : 'text-white/30 cursor-not-allowed'
                                    }`}
                                >
                                    <span className="text-lg sm:text-xl">{game.emoji}</span>
                                    <span className="flex-1 text-left text-sm sm:text-base">{game.name}</span>
                                    {!game.available && (
                                        <span className="text-[10px] sm:text-xs text-white/30">Soon</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                {isInMatch && (
                    <p className="text-center text-white/50 text-[10px] sm:text-xs mt-2">
                        You're currently in a match
                    </p>
                )}
                
                {/* Your coins indicator */}
                <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-white/50">Your Balance</span>
                        <span className="text-yellow-400 font-bold">💰 {playerCoins}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileMenu;

