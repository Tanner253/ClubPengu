/**
 * WagerModal - Modal for setting wager amount when challenging
 * Mobile-friendly with proper touch handling and landscape support
 * 
 * Enhanced with SPL token wagering support (x402 protocol)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useChallenge } from '../challenge';
import { useMultiplayer } from '../multiplayer/MultiplayerContext';
import { useDeviceDetection, useEscapeKey } from '../hooks';
import WagerTokenSelector from './WagerTokenSelector';
import { MAX_WAGER_GOLD, clampWagerGold } from '../config/goldEconomy';

const WagerModal = () => {
    const {
        showWagerModal,
        wagerGameType,
        selectedPlayer,
        closeWagerModal,
        sendChallenge
    } = useChallenge();
    
    // Get user data from multiplayer context for server-authoritative coin balance
    const { userData, isAuthenticated, walletAddress } = useMultiplayer();
    
    const [wagerAmount, setWagerAmount] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef(null);
    const modalRef = useRef(null);
    
    // SPL Token Wager State (optional enhancement to coin wager)
    const [tokenWager, setTokenWager] = useState({
        tokenAddress: null,
        tokenSymbol: null,
        tokenDecimals: 6,
        tokenAmount: 0,
        amountRaw: null
    });
    
    // Use shared device detection hook
    const { isMobile, isLandscape } = useDeviceDetection();
    
    // Server-authoritative coins from userData
    // In development, give guests coins for testing
    const isDev = import.meta.env.DEV;
    const playerCoins = isAuthenticated ? (userData?.coins ?? 0) : (isDev ? 1000 : 0);
    
    // Allow free play (0 wager) for all games - betting is optional
    const allowFreePlay = true;
    
    // Reset form when modal opens
    useEffect(() => {
        if (showWagerModal) {
            setWagerAmount('');
            setError('');
            setTokenWager({
                tokenAddress: null,
                tokenSymbol: null,
                tokenDecimals: 6,
                tokenAmount: 0,
                amountRaw: null
            });
            // Only auto-focus on desktop
            if (!isMobile && inputRef.current) {
                inputRef.current.focus();
            }
        }
    }, [showWagerModal, isMobile]);
    
    // Handle token wager change
    const handleTokenWagerChange = useCallback((tokenConfig) => {
        setTokenWager(tokenConfig);
        setError(''); // Clear any previous errors
    }, []);
    
    // Handle escape key using shared hook
    useEscapeKey(closeWagerModal, showWagerModal);

    const gameNames = {
        'card_jitsu': 'Card Jitsu',
        'connect4': 'Connect 4',
        'pong': 'Pong',
        'tic_tac_toe': 'Tic Tac Toe',
        'monopoly': 'Monopoly',
        'uno': 'UNO',
        'blackjack': 'Blackjack',
        'battleship': 'Battleship'
    };

    const gameEmojis = {
        'card_jitsu': '⚔️',
        'connect4': '🔴',
        'pong': '🏓',
        'tic_tac_toe': '⭕',
        'monopoly': '🎩',
        'uno': '🃏',
        'blackjack': '🂡',
        'battleship': '🚢'
    };

    const handleModalInteraction = (e) => {
        e.stopPropagation();
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            closeWagerModal();
        }
    };
    
    if (!showWagerModal || !selectedPlayer) return null;

    const isPracticeBot = selectedPlayer.isBot || selectedPlayer.id === 'dev_bot_wager';

    if (isPracticeBot) {
        const practiceContent = (
            <div
                data-player-modal="true"
                className="fixed inset-0 z-[10100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
                onClick={handleBackdropClick}
            >
                <div className="relative" onClick={handleModalInteraction}>
                    <button
                        onClick={closeWagerModal}
                        className="absolute -top-3 -right-3 z-10 w-9 h-9 bg-gray-800 hover:bg-gray-700 border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white text-base shadow-lg"
                    >
                        ✕
                    </button>
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-emerald-400/30 shadow-2xl p-5 w-[300px] sm:w-[340px]">
                        <h3 className="text-lg font-bold text-white mb-2">🤖 Practice Match</h3>
                        <p className="text-emerald-300 text-sm font-semibold mb-2">
                            {gameEmojis[wagerGameType]} {gameNames[wagerGameType] || wagerGameType}
                        </p>
                        <p className="text-white/70 text-xs leading-relaxed mb-3">
                            WagerBot is for learning the minigames — no coins, no tokens, and your win/loss record stays unchanged.
                        </p>
                        <p className="text-white/50 text-[11px] leading-relaxed mb-4">
                            Want to wager for real? Close this and click any other player in the plaza to challenge them.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={closeWagerModal}
                                className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm bg-gray-600 hover:bg-gray-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => sendChallenge(selectedPlayer.id, wagerGameType, 0, null)}
                                className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500"
                            >
                                Start Practice
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
        return createPortal(practiceContent, document.body);
    }
    
    const handleWagerChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        setWagerAmount(value);
        setError('');
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const amount = clampWagerGold(parseInt(wagerAmount, 10) || 0);
        const hasTokenWager = tokenWager.tokenAddress && tokenWager.tokenAmount > 0;
        
        // Allow free play for monopoly in dev mode
        if (allowFreePlay && amount === 0 && !hasTokenWager) {
            sendChallenge(selectedPlayer.id, wagerGameType, 0, null);
            return;
        }
        
        // Must have either coin wager or token wager (or both)
        if (!amount && !hasTokenWager) {
            setError('Enter a coin amount or add a token wager');
            return;
        }

        if (amount > MAX_WAGER_GOLD) {
            setError(`Gold wagers are capped at ${MAX_WAGER_GOLD} coins`);
            return;
        }
        
        if (amount > playerCoins) {
            setError(`You only have ${playerCoins} coins`);
            return;
        }
        
        // Send challenge with optional token wager
        sendChallenge(selectedPlayer.id, wagerGameType, amount, hasTokenWager ? tokenWager : null);
    };
    
    const quickAmounts = [10, 25, 50].filter((n) => n <= MAX_WAGER_GOLD);
    
    const handleQuickAmount = (amount) => {
        setWagerAmount(String(Math.min(amount, playerCoins, MAX_WAGER_GOLD)));
        setError('');
    };

    const stopTouchPropagation = (e) => {
        e.stopPropagation();
    };
    
    // Landscape mobile layout
    const modalContent = isLandscape && isMobile ? (
        <div 
            data-player-modal="true"
            className="fixed inset-0 z-[10100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 pointer-events-auto"
            onClick={handleBackdropClick}
            onTouchStart={stopTouchPropagation}
        >
                {/* Modal wrapper with outset close button */}
                <div className="relative">
                    {/* Close button - outset */}
                    <button 
                        onClick={closeWagerModal}
                        className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white text-sm shadow-lg transition-colors"
                    >
                        ✕
                    </button>
                    
                    <div 
                        ref={modalRef}
                        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/10 shadow-2xl overflow-hidden max-h-[85vh] pointer-events-auto"
                        style={{ maxWidth: '90vw', width: '480px' }}
                        onClick={handleModalInteraction}
                        onTouchStart={handleModalInteraction}
                        data-no-camera="true"
                    >
                        <form onSubmit={handleSubmit} className="flex">
                            {/* Left side - Player info */}
                            <div className="bg-black/30 p-3 flex flex-col items-center justify-center min-w-[100px] border-r border-white/10">
                                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-xl mb-1.5">
                                    🐧
                                </div>
                                <p className="text-white font-medium text-xs text-center truncate max-w-[90px]">
                                    {selectedPlayer.name}
                                </p>
                                <p className="text-white/50 text-[10px] flex items-center gap-1">
                                    {gameEmojis[wagerGameType]} {gameNames[wagerGameType]}
                                </p>
                                <div className="mt-2 pt-2 border-t border-white/10 w-full text-center">
                                    <p className="text-[9px] text-white/40">Your Balance</p>
                                    <p className="text-yellow-400 font-bold text-xs">💰 {playerCoins}</p>
                                </div>
                            </div>
                            
                            {/* Right side - Wager controls */}
                            <div className="p-3 flex-1">
                                {/* Input */}
                                <div className="mb-2">
                                    <div className="relative">
                                        <input
                                            ref={inputRef}
                                            type="number"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={wagerAmount}
                                            onChange={handleWagerChange}
                                            placeholder="0"
                                            className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white text-lg font-bold placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-[10px]">
                                            coins
                                        </span>
                                    </div>
                                    {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
                                </div>
                                
                                {/* Quick amounts row */}
                                <div className="flex gap-1 mb-2">
                                    {quickAmounts.map(amount => (
                                        <button
                                            key={amount}
                                            type="button"
                                            onClick={() => handleQuickAmount(amount)}
                                            disabled={amount > playerCoins}
                                            className={`flex-1 py-1.5 rounded text-[11px] font-medium transition-colors active:scale-95 ${
                                                amount > playerCoins
                                                    ? 'bg-gray-700 text-white/30'
                                                    : 'bg-white/10 text-white active:bg-white/20'
                                            }`}
                                        >
                                            {amount}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => handleQuickAmount(playerCoins)}
                                        className="flex-1 py-1.5 rounded text-[11px] font-medium bg-yellow-500/20 text-yellow-400 active:bg-yellow-500/30"
                                    >
                                        ALL
                                    </button>
                                    {/* Free Play - No wager option */}
                                    {allowFreePlay && (
                                        <button
                                            type="button"
                                            onClick={() => sendChallenge(selectedPlayer.id, wagerGameType, 0, null)}
                                            className="flex-1 py-1.5 rounded text-[11px] font-medium bg-purple-500/20 text-purple-400 active:bg-purple-500/30"
                                        >
                                            FREE
                                        </button>
                                    )}
                                </div>
                                
                                {/* SPL Token Wager (x402) - Optional enhancement */}
                                {isAuthenticated && walletAddress && (
                                    <div className="mb-2">
                                        <WagerTokenSelector
                                            selectedToken={tokenWager}
                                            onTokenSelect={handleTokenWagerChange}
                                            walletAddress={walletAddress}
                                        />
                                    </div>
                                )}
                                
                                {/* Action buttons */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={closeWagerModal}
                                        className="flex-1 py-2 rounded-lg font-bold text-white text-xs bg-gray-600 active:bg-gray-500 active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 rounded-lg font-bold text-white text-xs bg-gradient-to-r from-green-500 to-emerald-600 active:scale-95"
                                    >
                                        Send ⚔️
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
        </div>
    ) : (
        <div 
            data-player-modal="true"
            className="fixed inset-0 z-[10100] bg-black/70 backdrop-blur-sm animate-fade-in overflow-hidden pointer-events-auto"
            onClick={handleBackdropClick}
            onTouchStart={stopTouchPropagation}
        >
            <div 
                className="w-full h-full flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain pointer-events-auto"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onClick={handleBackdropClick}
            >
                {/* Modal wrapper with outset close button */}
                <div className="relative my-4 sm:my-auto flex-shrink-0">
                    {/* Close button - outset */}
                    <button 
                        onClick={closeWagerModal}
                        className="absolute -top-3 -right-3 z-10 w-9 h-9 bg-gray-800 hover:bg-gray-700 border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white text-base shadow-lg transition-colors"
                    >
                        ✕
                    </button>
                    
                    <div 
                        ref={modalRef}
                        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 shadow-2xl p-4 sm:p-5 w-[300px] sm:w-[340px] pointer-events-auto"
                        onClick={handleModalInteraction}
                        onMouseDown={handleModalInteraction}
                        onTouchStart={handleModalInteraction}
                        data-no-camera="true"
                    >
                        {/* Header */}
                        <h3 className="text-base sm:text-lg font-bold text-white mb-3">
                            ⚔️ Challenge
                        </h3>
                        
                        {/* Challenge Info */}
                        <div className="bg-black/30 rounded-xl p-2.5 mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center text-lg">
                                    🐧
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-medium text-sm truncate">{selectedPlayer.name}</p>
                                    <p className="text-white/50 text-xs">{gameEmojis[wagerGameType]} {gameNames[wagerGameType]}</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Balance */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-white/60 text-xs">Your Balance</span>
                            <span className="text-yellow-400 font-bold text-sm">💰 {playerCoins}</span>
                        </div>
                        
                        {/* Wager Input */}
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="block text-white/70 text-xs mb-1.5">
                                    Wager Amount
                                </label>
                                <div className="relative">
                                    <input
                                        ref={inputRef}
                                        type="number"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={wagerAmount}
                                        onChange={handleWagerChange}
                                        placeholder="0"
                                        className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2.5 text-white text-lg font-bold placeholder-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-xs">
                                        coins
                                    </span>
                                </div>
                                {error && (
                                    <p className="text-red-400 text-xs mt-1.5">{error}</p>
                                )}
                            </div>
                            
                            {/* Quick amounts */}
                            <div className="flex gap-1.5 mb-2">
                                {quickAmounts.map(amount => (
                                    <button
                                        key={amount}
                                        type="button"
                                        onClick={() => handleQuickAmount(amount)}
                                        disabled={amount > playerCoins}
                                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors active:scale-95 ${
                                            amount > playerCoins
                                                ? 'bg-gray-700 text-white/30 cursor-not-allowed'
                                                : 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30'
                                        }`}
                                    >
                                        {amount}
                                    </button>
                                ))}
                            </div>
                            
                            {/* All-in button */}
                            <button
                                type="button"
                                onClick={() => handleQuickAmount(playerCoins)}
                                className="w-full py-2 rounded-lg text-xs font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 active:bg-yellow-500/40 transition-colors mb-3 active:scale-[0.98]"
                            >
                                ALL IN ({playerCoins} coins)
                            </button>
                            
                            {/* SPL Token Wager (x402) - Optional enhancement */}
                            {isAuthenticated && walletAddress && (
                                <div className="mb-3">
                                    <WagerTokenSelector
                                        selectedToken={tokenWager}
                                        onTokenSelect={handleTokenWagerChange}
                                        walletAddress={walletAddress}
                                    />
                                </div>
                            )}
                            
                            {/* Free Play button - No wager option */}
                            {allowFreePlay && (
                                <button
                                    type="button"
                                    onClick={() => sendChallenge(selectedPlayer.id, wagerGameType, 0, null)}
                                    className="w-full py-2 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 active:bg-purple-500/40 transition-colors mb-3 active:scale-[0.98] border border-purple-500/30"
                                >
                                    Casual match (0 coins)
                                </button>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={closeWagerModal}
                                    className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm bg-gray-600 hover:bg-gray-500 active:bg-gray-400 transition-colors active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 active:scale-95"
                                >
                                    Send Challenge
                                </button>
                            </div>
                        </form>
                        
                        {/* Info */}
                        <p className="text-white/40 text-[10px] text-center mt-3">
                            5 min to respond • Wagers optional
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default WagerModal;
