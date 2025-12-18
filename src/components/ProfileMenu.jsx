/**
 * ProfileMenu - Displays player profile when clicking on another player
 * Shows name, penguin preview, stats, and challenge button
 * Responsive design for desktop, portrait mobile, and landscape mobile
 */

import React, { useState, useRef, useCallback } from 'react';
import { useChallenge } from '../challenge';
import { useMultiplayer } from '../multiplayer/MultiplayerContext';
import { useDeviceDetection, useClickOutside, useEscapeKey } from '../hooks';

const ProfileMenu = () => {
    const {
        selectedPlayer,
        selectedPlayerStats,
        clearSelectedPlayer,
        openWagerModal,
        isInMatch,
        showWagerModal
    } = useChallenge();
    
    // Get user data from multiplayer context for server-authoritative coin balance
    const { userData, isAuthenticated } = useMultiplayer();
    
    const [showGameDropdown, setShowGameDropdown] = useState(false);
    const menuRef = useRef(null);
    
    // Use shared device detection hook
    const { isMobile, isLandscape } = useDeviceDetection();
    
    // Close on click outside (but not when wager modal is open)
    const handleClose = useCallback(() => {
        if (!showWagerModal) {
                clearSelectedPlayer();
            }
    }, [clearSelectedPlayer, showWagerModal]);
    
    useClickOutside(menuRef, handleClose, !!selectedPlayer && !showWagerModal);
    useEscapeKey(handleClose, !!selectedPlayer && !showWagerModal);
    
    if (!selectedPlayer) return null;
    
    const stats = selectedPlayerStats?.[selectedPlayer.id];
    // Use server-authoritative coins from userData for authenticated users
    const playerCoins = isAuthenticated ? (userData?.coins ?? 0) : 0;
    
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
    ];
    
    const handleMenuInteraction = (e) => {
        e.stopPropagation();
    };
    
    // Landscape mobile layout - horizontal and compact
    if (isLandscape && isMobile) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/40"
                    onClick={clearSelectedPlayer}
                />
                
                {/* Modal wrapper with outset close button */}
                <div className="relative">
                    {/* Close button - outset */}
                    <button 
                        onClick={clearSelectedPlayer}
                        className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white text-sm shadow-lg transition-colors"
                    >
                        ✕
                    </button>
                    
                    <div 
                        ref={menuRef}
                        data-no-camera="true"
                        className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl animate-fade-in max-h-[90vh] overflow-hidden"
                        style={{ maxWidth: '95vw', width: 'auto' }}
                        onClick={handleMenuInteraction}
                    >
                    
                    <div className="flex gap-3 p-3">
                        {/* Left: Avatar + Name */}
                        <div className="flex flex-col items-center justify-center min-w-[80px]">
                            <div 
                                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg"
                                style={{ 
                                    background: `linear-gradient(135deg, ${colorHex}, ${colorHex}88)`,
                                    border: '2px solid rgba(255,255,255,0.2)'
                                }}
                            >
                                🐧
                            </div>
                            <h3 className="text-white font-bold text-sm mt-1.5 text-center max-w-[80px] truncate">
                                {selectedPlayer.name}
                            </h3>
                            {selectedPlayer.appearance?.hat && selectedPlayer.appearance.hat !== 'none' && (
                                <p className="text-white/40 text-[9px] truncate max-w-[80px]">
                                    {selectedPlayer.appearance.hat}
                                </p>
                            )}
                        </div>
                        
                        {/* Middle: Stats (compact grid) */}
                        <div className="bg-black/30 rounded-lg p-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] min-w-[140px]">
                            <span className="text-white/50">💰 Theirs</span>
                            <span className="text-yellow-400 font-bold text-right">
                                {stats?.coins ?? 0}
                            </span>
                            <span className="text-white/50">⚔️ CJ</span>
                            <span className="text-yellow-400 font-bold text-right">
                                {stats?.cardJitsuWins ?? 0}W/{stats?.cardJitsuLosses ?? 0}L
                            </span>
                            <span className="text-white/50">⭕ TTT</span>
                            <span className="text-cyan-400 font-bold text-right">
                                {stats?.ticTacToeWins ?? 0}W/{stats?.ticTacToeLosses ?? 0}L
                            </span>
                            <span className="text-white/50">🔴 C4</span>
                            <span className="text-red-400 font-bold text-right">
                                {stats?.connect4Wins ?? 0}W/{stats?.connect4Losses ?? 0}L
                            </span>
                            <span className="text-white/50 border-t border-white/10 pt-1">💰 You</span>
                            <span className="text-yellow-400 font-bold text-right border-t border-white/10 pt-1">
                                {playerCoins}
                            </span>
                        </div>
                        
                        {/* Right: Challenge buttons */}
                        <div className="flex flex-col gap-1.5 min-w-[100px]">
                            {!showGameDropdown ? (
                                <button
                                    onClick={handleChallengeClick}
                                    disabled={isInMatch}
                                    className={`px-3 py-2 rounded-lg font-bold text-white text-xs flex items-center justify-center gap-1.5 transition-all ${
                                        isInMatch 
                                            ? 'bg-gray-600 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-red-500 to-orange-500 active:scale-95'
                                    }`}
                                >
                                    <span>⚔️</span>
                                    <span>Challenge</span>
                                </button>
                            ) : (
                                <>
                                    {availableGames.map(game => (
                                        <button
                                            key={game.id}
                                            onClick={() => handleGameSelect(game.id)}
                                            className="px-2 py-1.5 flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-lg text-white text-[11px] transition-colors"
                                        >
                                            <span>{game.emoji}</span>
                                            <span className="flex-1 text-left">{game.name}</span>
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setShowGameDropdown(false)}
                                        className="px-2 py-1 text-white/50 text-[10px] hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                            {isInMatch && (
                                <p className="text-white/40 text-[9px] text-center">In match</p>
                            )}
                        </div>
                    </div>
                </div>{/* Close modal wrapper */}
                </div>
            </div>
        );
    }
    
    // Portrait mobile & Desktop layout - vertical
    return (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
            {/* Backdrop for mobile */}
            {isMobile && (
                <div 
                    className="absolute inset-0 bg-black/40 pointer-events-auto"
                    onClick={clearSelectedPlayer}
                />
            )}
            
            <div 
                className="w-full h-full flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onMouseDown={handleMenuInteraction}
                onClick={handleMenuInteraction}
            >
                {/* Modal wrapper with outset close button */}
                <div className="relative my-4 sm:my-auto flex-shrink-0 pointer-events-auto">
                    {/* Close button - outset */}
                    <button 
                        onClick={clearSelectedPlayer}
                        className="absolute -top-3 -right-3 z-10 w-9 h-9 bg-gray-800 hover:bg-gray-700 border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white text-base shadow-lg transition-colors"
                    >
                        ✕
                    </button>
                    
                    <div 
                        ref={menuRef}
                        data-no-camera="true"
                        className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4 sm:p-5 w-[280px] sm:w-[320px] animate-fade-in"
                        onMouseDown={handleMenuInteraction}
                        onClick={handleMenuInteraction}
                    >
                    
                    {/* Penguin Preview */}
                    <div className="flex justify-center mb-3">
                        <div 
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl shadow-lg"
                            style={{ 
                                background: `linear-gradient(135deg, ${colorHex}, ${colorHex}88)`,
                                border: '3px solid rgba(255,255,255,0.2)'
                            }}
                        >
                            🐧
                        </div>
                    </div>
                    
                    {/* Player Name */}
                    <h3 className="text-center text-base sm:text-lg font-bold text-white mb-1 truncate px-6">
                        {selectedPlayer.name}
                    </h3>
                    
                    {/* Hat indicator */}
                    {selectedPlayer.appearance?.hat && selectedPlayer.appearance.hat !== 'none' && (
                        <p className="text-center text-white/50 text-[10px] sm:text-xs mb-2">
                            Wearing: {selectedPlayer.appearance.hat}
                        </p>
                    )}
                    
                    {/* Stats - Compact */}
                    <div className="bg-black/30 rounded-xl p-2 sm:p-2.5 mb-3 space-y-1">
                        {/* Their coin balance - prominent display */}
                        <div className="flex items-center justify-between text-[11px] sm:text-xs pb-1 mb-1 border-b border-white/10">
                            <span className="text-white/60">💰 Their Balance</span>
                            <span className="text-yellow-400 font-bold">
                                {stats?.isGuest ? '(Guest)' : (stats?.coins ?? 0)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] sm:text-xs">
                            <span className="text-white/60">⚔️ Card Jitsu</span>
                            <span className="text-yellow-400 font-bold">
                                {stats?.cardJitsuWins ?? 0}W / {stats?.cardJitsuLosses ?? 0}L
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] sm:text-xs">
                            <span className="text-white/60">⭕ Tic Tac Toe</span>
                            <span className="text-cyan-400 font-bold">
                                {stats?.ticTacToeWins ?? 0}W / {stats?.ticTacToeLosses ?? 0}L
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] sm:text-xs">
                            <span className="text-white/60">🔴 Connect 4</span>
                            <span className="text-red-400 font-bold">
                                {stats?.connect4Wins ?? 0}W / {stats?.connect4Losses ?? 0}L
                            </span>
                        </div>
                    </div>
                    
                    {/* Challenge Button */}
                    <div className="relative">
                        <button
                            onClick={handleChallengeClick}
                            disabled={isInMatch}
                            className={`w-full py-2 sm:py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all ${
                                isInMatch 
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 active:from-red-600 active:to-orange-600 active:scale-95'
                            }`}
                        >
                            <span>⚔️</span>
                            <span>Challenge</span>
                            <span className={`transition-transform ${showGameDropdown ? 'rotate-180' : ''}`}>▼</span>
                        </button>
                        
                        {/* Game Selection */}
                        {showGameDropdown && (
                            <div className="mt-2 bg-gray-800 rounded-xl border border-white/10 shadow-xl animate-fade-in">
                                <div className="p-1">
                                    {availableGames.map(game => (
                                        <button
                                            key={game.id}
                                            onClick={() => handleGameSelect(game.id)}
                                            className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-white/10 active:bg-white/20 text-white rounded-lg my-0.5 transition-colors"
                                        >
                                            <span className="text-lg">{game.emoji}</span>
                                            <span className="flex-1 text-left text-sm font-medium">{game.name}</span>
                                            <span className="text-green-400 text-sm">▶</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {isInMatch && (
                        <p className="text-center text-white/50 text-[10px] mt-2">
                            You're currently in a match
                        </p>
                    )}
                    
                    {/* Your coins indicator */}
                    <div className="mt-2.5 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between text-[11px] sm:text-xs">
                            <span className="text-white/50">Your Balance</span>
                            <span className="text-yellow-400 font-bold">💰 {playerCoins}</span>
                        </div>
                    </div>
                    </div>
                </div>{/* Close modal wrapper */}
            </div>
        </div>
    );
};

export default ProfileMenu;
