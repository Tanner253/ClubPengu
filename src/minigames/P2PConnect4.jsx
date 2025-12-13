/**
 * P2PConnect4 - Player vs Player Connect 4 match
 * Real-time synchronized game with wagering
 * 7 columns x 6 rows - drop discs to get 4 in a row
 */

import React, { useState, useCallback } from 'react';
import { useChallenge } from '../challenge';

const ROWS = 6;
const COLS = 7;

const P2PConnect4 = ({ onMatchEnd }) => {
    const {
        activeMatch,
        matchState,
        playCard, // Reusing for column selection
        forfeitMatch,
        clearMatch,
    } = useChallenge();
    
    const [hoverColumn, setHoverColumn] = useState(null);
    const [droppingColumn, setDroppingColumn] = useState(null);
    
    // Handle column click
    const handleColumnClick = useCallback((col) => {
        if (!matchState || matchState.phase !== 'playing') return;
        if (!matchState.isMyTurn) return;
        
        // Check if column is available
        const topRow = ROWS - 1;
        const boardIndex = topRow * COLS + col;
        if (matchState.board[boardIndex] !== null) return; // Column full
        
        setDroppingColumn(col);
        
        setTimeout(() => {
            playCard(col);
            setDroppingColumn(null);
        }, 100);
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
    const myColor = isPlayer1 ? 'R' : 'Y';
    const opponentColor = isPlayer1 ? 'Y' : 'R';
    
    const isComplete = matchState.status === 'complete';
    const isDraw = matchState.winner === 'draw';
    const didWin = matchState.winner === myColor;
    const totalPot = activeMatch.wagerAmount * 2;
    
    // Convert flat board to 2D for display
    const board = matchState.board || Array(ROWS * COLS).fill(null);
    
    // Check if a cell is part of winning line
    const isWinningCell = (row, col) => {
        if (!matchState.winningCells) return false;
        return matchState.winningCells.some(([r, c]) => r === row && c === col);
    };
    
    // Get cell value from flat board
    const getCell = (row, col) => {
        // Board is stored bottom-to-top, so row 0 is bottom
        return board[row * COLS + col];
    };
    
    // Check if column can accept a disc
    const canDropInColumn = (col) => {
        const topRow = ROWS - 1;
        return board[topRow * COLS + col] === null;
    };
    
    // Render a single cell
    const renderCell = (row, col) => {
        const value = getCell(row, col);
        const isWinning = isWinningCell(row, col);
        const isLastMove = matchState.lastMove?.row === row && matchState.lastMove?.col === col;
        
        return (
            <div
                key={`${row}-${col}`}
                className={`
                    w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14
                    rounded-full
                    flex items-center justify-center
                    transition-all duration-200
                    ${isWinning ? 'ring-4 ring-white animate-pulse' : ''}
                    ${isLastMove && !isComplete ? 'ring-2 ring-white/50' : ''}
                    ${value === null ? 'bg-blue-900/50' : ''}
                    ${value === 'R' ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/30' : ''}
                    ${value === 'Y' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/30' : ''}
                `}
            >
                {isWinning && (
                    <span className="text-white text-lg font-bold">✓</span>
                )}
            </div>
        );
    };
    
    // Render column header (drop zone indicator)
    const renderColumnHeader = (col) => {
        const canDrop = canDropInColumn(col) && matchState.isMyTurn && matchState.phase === 'playing';
        const isHovered = hoverColumn === col && canDrop;
        
        // Handle touch/click
        const handleInteraction = (e) => {
            e.preventDefault();
            handleColumnClick(col);
        };
        
        return (
            <div
                key={`header-${col}`}
                className={`
                    w-10 h-8 sm:w-12 sm:h-10 md:w-14 md:h-12
                    flex items-center justify-center
                    cursor-pointer transition-all duration-150
                    select-none touch-manipulation
                    ${canDrop ? 'hover:scale-110 active:scale-95' : 'cursor-not-allowed opacity-30'}
                `}
                onMouseEnter={() => setHoverColumn(col)}
                onMouseLeave={() => setHoverColumn(null)}
                onTouchStart={() => canDrop && setHoverColumn(col)}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    handleColumnClick(col);
                    setTimeout(() => setHoverColumn(null), 200);
                }}
                onClick={handleInteraction}
            >
                <div className={`
                    w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full
                    transition-all duration-150
                    ${isHovered ? (myColor === 'R' ? 'bg-red-500/80' : 'bg-yellow-400/80') : 'bg-white/10'}
                    ${droppingColumn === col ? 'animate-bounce' : ''}
                `} />
            </div>
        );
    };
    
    return (
        <div className="fixed inset-0 z-40 overflow-hidden touch-none">
            {/* Background - Blue theme like classic Connect 4 */}
            <div 
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(180deg, #1e3a5f 0%, #0f2744 50%, #0a1929 100%)'
                }}
            >
                {/* Subtle pattern */}
                <div className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
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
                            CONNECT 4
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
                    ${!matchState.isMyTurn && matchState.phase === 'playing' 
                        ? (opponentColor === 'R' ? 'border-red-500 shadow-lg shadow-red-500/30' : 'border-yellow-400 shadow-lg shadow-yellow-400/30')
                        : 'border-transparent'}
                `}>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${opponentColor === 'R' ? 'bg-red-500' : 'bg-yellow-400'}`} />
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
                {/* Column headers (drop indicators) */}
                <div className="flex gap-1 sm:gap-1.5 mb-1 px-2">
                    {[0, 1, 2, 3, 4, 5, 6].map(col => renderColumnHeader(col))}
                </div>
                
                {/* Board Frame */}
                <div className="bg-blue-700 p-2 sm:p-3 rounded-2xl shadow-2xl border-4 border-blue-800">
                    <div className="grid gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                        {/* Render rows from top (5) to bottom (0) for visual display */}
                        {[5, 4, 3, 2, 1, 0].map(row => (
                            [0, 1, 2, 3, 4, 5, 6].map(col => (
                                <div
                                    key={`cell-${row}-${col}`}
                                    onClick={() => handleColumnClick(col)}
                                    onTouchEnd={(e) => {
                                        e.preventDefault();
                                        handleColumnClick(col);
                                    }}
                                    className="cursor-pointer select-none touch-manipulation active:scale-95 transition-transform"
                                >
                                    {renderCell(row, col)}
                                </div>
                            ))
                        ))}
                    </div>
                </div>
                
                {/* Turn Indicator */}
                {matchState.phase === 'playing' && (
                    <div className="text-center mt-4">
                        <span className={`
                            inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm sm:text-base font-medium
                            ${matchState.isMyTurn 
                                ? (myColor === 'R' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30')
                                : 'bg-white/10 text-white/60'}
                        `}>
                            <div className={`w-4 h-4 rounded-full ${matchState.isMyTurn ? (myColor === 'R' ? 'bg-red-500' : 'bg-yellow-400') : 'bg-gray-500'}`} />
                            {matchState.isMyTurn ? 'Your turn - drop a disc!' : `${opponent.name}'s turn`}
                        </span>
                    </div>
                )}
            </div>
            
            {/* Player Info - You (Bottom) */}
            <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-10 safe-area-bottom">
                <div className={`
                    bg-black/60 rounded-xl px-4 py-2 sm:px-6 sm:py-3 text-center
                    border-2 transition-all duration-300
                    ${matchState.isMyTurn && matchState.phase === 'playing' 
                        ? (myColor === 'R' ? 'border-red-500 shadow-lg shadow-red-500/30' : 'border-yellow-400 shadow-lg shadow-yellow-400/30')
                        : 'border-transparent'}
                `}>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${myColor === 'R' ? 'bg-red-500' : 'bg-yellow-400'}`} />
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
                    <p>• Drop discs into columns</p>
                    <p>• Get 4 in a row to win</p>
                    <p>• Horizontal, vertical, or diagonal</p>
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
                                ? 'The board is full!' 
                                : didWin 
                                    ? `You connected 4 against ${opponent.name}!` 
                                    : `${opponent.name} connected 4...`}
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

export default P2PConnect4;

