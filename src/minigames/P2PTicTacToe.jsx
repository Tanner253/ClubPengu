/**
 * P2PTicTacToe - Player vs Player Tic Tac Toe match
 * Real-time synchronized game with wagering
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useChallenge } from '../challenge';

const P2PTicTacToe = ({ onMatchEnd }) => {
    const {
        activeMatch,
        matchState,
        playCard, // Reusing this for making moves
        forfeitMatch,
        clearMatch,
    } = useChallenge();
    
    const [selectedCell, setSelectedCell] = useState(null);
    const [animatingCell, setAnimatingCell] = useState(null);
    
    // Handle cell click
    const handleCellClick = useCallback((index) => {
        if (!matchState || matchState.phase !== 'playing') return;
        if (!matchState.isMyTurn) return;
        if (matchState.board[index] !== null) return;
        
        setSelectedCell(index);
        setAnimatingCell(index);
        
        setTimeout(() => {
            playCard(index); // Reusing playCard for moves
            setAnimatingCell(null);
            setSelectedCell(null);
        }, 150);
    }, [matchState, playCard]);
    
    // Handle forfeit
    const handleForfeit = () => {
        if (confirm('Are you sure you want to forfeit? You will lose your wager.')) {
            forfeitMatch();
        }
    };
    
    if (!activeMatch || !matchState) {
        return null;
    }
    
    const isPlayer1 = activeMatch.yourRole === 'player1';
    const myPlayer = isPlayer1 ? activeMatch.player1 : activeMatch.player2;
    const opponent = isPlayer1 ? activeMatch.player2 : activeMatch.player1;
    const mySymbol = isPlayer1 ? 'X' : 'O';
    const opponentSymbol = isPlayer1 ? 'O' : 'X';
    
    const isComplete = matchState.status === 'complete';
    const isDraw = matchState.winner === 'draw';
    const didWin = matchState.winner === mySymbol;
    const totalPot = activeMatch.wagerAmount * 2;
    
    // Render a cell
    const renderCell = (index) => {
        const value = matchState.board[index];
        const isWinningCell = matchState.winningLine?.includes(index);
        const isClickable = matchState.isMyTurn && value === null && matchState.phase === 'playing';
        
        // Handle touch/click
        const handleInteraction = (e) => {
            e.preventDefault();
            handleCellClick(index);
        };
        
        return (
            <button
                key={index}
                onClick={handleInteraction}
                onTouchEnd={handleInteraction}
                disabled={!isClickable}
                className={`
                    aspect-square w-full
                    flex items-center justify-center
                    text-4xl sm:text-5xl md:text-6xl font-bold
                    transition-all duration-200
                    select-none touch-manipulation
                    ${isWinningCell ? 'bg-green-500/30 scale-105' : 'bg-white/5'}
                    ${isClickable ? 'hover:bg-white/20 cursor-pointer active:scale-95 active:bg-white/30' : ''}
                    ${animatingCell === index ? 'scale-90' : ''}
                    ${value === 'X' ? 'text-cyan-400' : value === 'O' ? 'text-pink-400' : 'text-transparent'}
                    border border-white/20 rounded-xl
                `}
            >
                {value || (isClickable && matchState.isMyTurn ? (
                    <span className="text-white/10 text-2xl sm:text-3xl">{mySymbol}</span>
                ) : '')}
            </button>
        );
    };
    
    return (
        <div className="fixed inset-0 z-40 overflow-hidden touch-none">
            {/* Background */}
            <div 
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(180deg, #0a1628 0%, #1a2a4a 50%, #0d1a30 100%)'
                }}
            >
                {/* Grid pattern overlay */}
                <div 
                    className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>
            
            {/* Header Bar */}
            <div className="absolute top-0 left-0 right-0 safe-area-top">
                <div className="flex items-center justify-between p-2 sm:p-4 gap-2">
                    {/* Forfeit */}
                    <button 
                        onClick={handleForfeit}
                        className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg retro-text text-[10px] sm:text-xs shrink-0"
                    >
                        FORFEIT
                    </button>
                    
                    {/* Wager */}
                    <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                        <span className="text-yellow-400 retro-text text-[10px] sm:text-xs">
                            💰 {totalPot}
                        </span>
                    </div>
                    
                    {/* Title */}
                    <div className="text-center flex-1 min-w-0">
                        <h1 className="retro-text text-sm sm:text-xl text-white truncate" style={{textShadow: '2px 2px 0 #000'}}>
                            TIC TAC TOE
                        </h1>
                    </div>
                    
                    {/* Timer */}
                    <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 shrink-0">
                        <span className={`retro-text text-[10px] sm:text-xs ${matchState.turnTimeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                            ⏱ {matchState.turnTimeRemaining}s
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Player Info - Opponent (Top) */}
            <div className="absolute top-14 sm:top-20 left-1/2 -translate-x-1/2 z-10">
                <div className={`
                    bg-black/60 rounded-xl px-4 py-2 sm:px-6 sm:py-3 text-center
                    border-2 transition-all duration-300
                    ${!matchState.isMyTurn && matchState.phase === 'playing' ? 'border-pink-500 shadow-lg shadow-pink-500/30' : 'border-transparent'}
                `}>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-2xl sm:text-3xl font-bold text-pink-400">{opponentSymbol}</span>
                        <div className="text-left">
                            <span className="text-white font-bold text-xs sm:text-sm block truncate max-w-[100px] sm:max-w-[150px]">
                                {opponent.name}
                            </span>
                            <span className="text-white/50 text-[10px] sm:text-xs">
                                {!matchState.isMyTurn && matchState.phase === 'playing' ? 'Thinking...' : 'Opponent'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Game Board */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="grid grid-cols-3 gap-2 sm:gap-3 p-4 sm:p-6 bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(index => (
                        <div key={index} className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28">
                            {renderCell(index)}
                        </div>
                    ))}
                </div>
                
                {/* Turn Indicator */}
                {matchState.phase === 'playing' && (
                    <div className="text-center mt-4">
                        <span className={`
                            inline-block px-4 py-2 rounded-full text-sm sm:text-base font-medium
                            ${matchState.isMyTurn 
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                                : 'bg-white/10 text-white/60'}
                        `}>
                            {matchState.isMyTurn ? `Your turn (${mySymbol})` : `${opponent.name}'s turn`}
                        </span>
                    </div>
                )}
            </div>
            
            {/* Player Info - You (Bottom) */}
            <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-10 safe-area-bottom">
                <div className={`
                    bg-black/60 rounded-xl px-4 py-2 sm:px-6 sm:py-3 text-center
                    border-2 transition-all duration-300
                    ${matchState.isMyTurn && matchState.phase === 'playing' ? 'border-cyan-500 shadow-lg shadow-cyan-500/30' : 'border-transparent'}
                `}>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-2xl sm:text-3xl font-bold text-cyan-400">{mySymbol}</span>
                        <div className="text-left">
                            <span className="text-white font-bold text-xs sm:text-sm block truncate max-w-[100px] sm:max-w-[150px]">
                                {myPlayer.name}
                            </span>
                            <span className="text-white/50 text-[10px] sm:text-xs">
                                {matchState.isMyTurn && matchState.phase === 'playing' ? 'Your turn!' : 'You'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Rules Panel - Desktop only */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs text-white/80 hidden lg:block border border-white/10 max-w-[160px]">
                <div className="font-bold text-yellow-400 mb-2 retro-text text-[10px]">RULES</div>
                <div className="space-y-0.5 text-[10px]">
                    <p>• Get 3 in a row to win</p>
                    <p>• Horizontal, vertical, or diagonal</p>
                    <p>• X always goes first</p>
                </div>
            </div>
            
            {/* Match Complete Overlay */}
            {isComplete && (
                <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 sm:p-8 text-center max-w-sm w-full mx-4 border border-white/10 shadow-2xl">
                        <div className="text-5xl sm:text-6xl mb-4">
                            {isDraw ? '🤝' : didWin ? '🏆' : '😢'}
                        </div>
                        <h2 className="retro-text text-xl sm:text-3xl text-white mb-2">
                            {isDraw ? 'DRAW!' : didWin ? 'VICTORY!' : 'DEFEAT'}
                        </h2>
                        <p className="text-white/60 text-sm sm:text-base mb-4">
                            {isDraw 
                                ? 'No one wins this round!' 
                                : didWin 
                                    ? `You defeated ${opponent.name}!` 
                                    : `${opponent.name} wins...`}
                        </p>
                        <div className={`
                            ${isDraw ? 'bg-gray-500/20 border-gray-500/30' : didWin ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'} 
                            rounded-xl p-4 mb-6 border
                        `}>
                            <p className={`${isDraw ? 'text-gray-400' : didWin ? 'text-green-400' : 'text-red-400'} text-xl sm:text-2xl retro-text`}>
                                {isDraw ? 'REFUNDED' : didWin ? `+${totalPot}` : `-${activeMatch.wagerAmount}`} 💰
                            </p>
                            <p className="text-white/50 text-xs mt-1">
                                {isDraw ? 'Wagers returned' : didWin ? 'Coins Won' : 'Coins Lost'}
                            </p>
                        </div>
                        <button 
                            onClick={() => {
                                clearMatch();
                                onMatchEnd && onMatchEnd();
                            }}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 active:from-cyan-600 active:to-blue-600 text-white px-8 py-3 rounded-xl retro-text text-sm sm:text-base shadow-lg transition-all"
                        >
                            CONTINUE
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default P2PTicTacToe;

