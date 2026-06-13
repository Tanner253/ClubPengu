/**
 * P2PConnect4 - Player vs Player Connect 4 match
 * Real-time synchronized game with wagering
 * Mobile-optimized with landscape support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useChallenge } from '../challenge';
import { displayTokenSymbol } from '../utils/tokenDisplay.js';

// Helper to generate Solscan link
const getSolscanLink = (txSignature) => `https://solscan.io/tx/${txSignature}`;

const ROWS = 6;
const COLS = 7;

const P2PConnect4 = ({ onMatchEnd }) => {
    const {
        activeMatch,
        matchState,
        playCard,
        forfeitMatch,
        clearMatch,
    } = useChallenge();
    
    const [hoverColumn, setHoverColumn] = useState(null);
    const [droppingColumn, setDroppingColumn] = useState(null);
    const [isLandscape, setIsLandscape] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    // Detect orientation
    useEffect(() => {
        const checkLayout = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setIsLandscape(w > h);
            setIsMobile(w < 768 || h < 500);
        };
        checkLayout();
        window.addEventListener('resize', checkLayout);
        window.addEventListener('orientationchange', () => setTimeout(checkLayout, 100));
        return () => {
            window.removeEventListener('resize', checkLayout);
            window.removeEventListener('orientationchange', checkLayout);
        };
    }, []);
    
    // Handle column click
    const handleColumnClick = useCallback((col) => {
        if (!matchState || matchState.phase !== 'playing') return;
        if (!matchState.isMyTurn) return;
        
        const topRow = ROWS - 1;
        const boardIndex = topRow * COLS + col;
        if (matchState.board[boardIndex] !== null) return;
        
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
    
    if (!activeMatch || !matchState) return null;
    
    const isPlayer1 = activeMatch.yourRole === 'player1';
    const myPlayer = isPlayer1 ? activeMatch.player1 : activeMatch.player2;
    const opponent = isPlayer1 ? activeMatch.player2 : activeMatch.player1;
    const myColor = isPlayer1 ? 'R' : 'Y';
    const opponentColor = isPlayer1 ? 'Y' : 'R';
    
    const isComplete = matchState.status === 'complete';
    const isDraw = matchState.winner === 'draw';
    const didWin = matchState.winner === myColor;
    const totalPot = activeMatch.wagerAmount * 2;
    
    // Token wager info from match result OR active match
    const matchResult = activeMatch.matchResult;
    const tokenSettlement = matchResult?.tokenSettlement;
    const wagerToken = matchResult?.wagerToken || activeMatch?.wagerToken;
    const tokenWon = didWin && wagerToken ? (tokenSettlement?.amount || wagerToken.tokenAmount * 2) : 0;
    const tokenLost = !didWin && !isDraw && wagerToken ? wagerToken.tokenAmount : 0;
    const solscanLink = tokenSettlement?.txSignature ? getSolscanLink(tokenSettlement.txSignature) : null;
    
    const board = matchState.board || Array(ROWS * COLS).fill(null);
    const landscapeMobile = isLandscape && isMobile;
    
    const isWinningCell = (row, col) => matchState.winningCells?.some(([r, c]) => r === row && c === col);
    const getCell = (row, col) => board[row * COLS + col];
    const canDropInColumn = (col) => board[(ROWS - 1) * COLS + col] === null;
    
    // Cell size based on layout
    const cellSize = landscapeMobile ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14';
    
    const renderCell = (row, col) => {
        const value = getCell(row, col);
        const isWinning = isWinningCell(row, col);
        
        return (
            <div
                key={`${row}-${col}`}
                className={`
                    ${cellSize} rounded-full flex items-center justify-center transition-all duration-200
                    ${isWinning ? 'ring-2 ring-white animate-pulse' : ''}
                    ${value === null ? 'bg-blue-900/50' : ''}
                    ${value === 'R' ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/30' : ''}
                    ${value === 'Y' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/30' : ''}
                `}
            >
                {isWinning && <span className="text-white text-xs font-bold">✓</span>}
            </div>
        );
    };
    
    // Landscape mobile layout
    if (landscapeMobile) {
        return (
            <div className="fixed inset-0 z-40 overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #0f2744 50%, #0a1929 100%)' }}>
                
                {/* Compact Header */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 gap-2 z-20">
                    <button onClick={handleForfeit} className="bg-red-600 active:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold">
                        FORFEIT
                    </button>
                    <span className="text-yellow-400 text-[10px] font-bold">💰 {totalPot}</span>
                    <h1 className="text-white text-xs font-bold">CONNECT 4</h1>
                    <span className={`text-[10px] font-bold ${matchState.turnTimeRemaining <= 10 ? 'text-red-400' : 'text-white'}`}>
                        ⏱ {matchState.turnTimeRemaining}s
                    </span>
                </div>
                
                {/* Main layout */}
                <div className="h-full flex items-center justify-center gap-2 px-2 pt-8 pb-2">
                    {/* Opponent */}
                    <div className={`flex flex-col items-center p-2 rounded-lg ${!matchState.isMyTurn ? 'bg-black/60 border border-white/30' : 'bg-black/40'}`}>
                        <div className={`w-6 h-6 rounded-full ${opponentColor === 'R' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                        <span className="text-white text-[10px] truncate max-w-[50px] mt-1">{opponent.name}</span>
                        {!matchState.isMyTurn && matchState.phase === 'playing' && (
                            <span className="text-white/60 text-[8px]">Turn</span>
                        )}
                    </div>
                    
                    {/* Board */}
                    <div className="bg-blue-700 p-1.5 rounded-xl border-2 border-blue-800">
                        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                            {[5, 4, 3, 2, 1, 0].map(row => (
                                [0, 1, 2, 3, 4, 5, 6].map(col => (
                                    <div
                                        key={`cell-${row}-${col}`}
                                        onClick={() => handleColumnClick(col)}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onTouchEnd={(e) => { 
                                            e.preventDefault(); 
                                            e.stopPropagation();
                                            handleColumnClick(col); 
                                        }}
                                        className="cursor-pointer select-none touch-manipulation active:scale-95"
                                    >
                                        {renderCell(row, col)}
                                    </div>
                                ))
                            ))}
                        </div>
                    </div>
                    
                    {/* You */}
                    <div className={`flex flex-col items-center p-2 rounded-lg ${matchState.isMyTurn ? 'bg-black/60 border border-white/30' : 'bg-black/40'}`}>
                        <div className={`w-6 h-6 rounded-full ${myColor === 'R' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                        <span className="text-white text-[10px] truncate max-w-[50px] mt-1">{myPlayer.name}</span>
                        {matchState.isMyTurn && matchState.phase === 'playing' && (
                            <span className="text-green-400 text-[8px]">Your turn!</span>
                        )}
                    </div>
                </div>
                
                {/* Complete overlay */}
                {isComplete && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 p-2">
                        <div className="bg-gray-800 rounded-xl p-4 text-center max-w-xs w-full border border-white/10">
                            <div className="text-4xl mb-2">{isDraw ? '🤝' : didWin ? '🏆' : '😢'}</div>
                            <h2 className="text-lg font-bold text-white mb-1">
                                {isDraw ? 'DRAW!' : didWin ? 'VICTORY!' : 'DEFEAT'}
                            </h2>
                            <div className={`${isDraw ? 'text-gray-400' : didWin ? 'text-green-400' : 'text-red-400'} text-xl font-bold mb-1`}>
                                {isDraw ? 'REFUNDED' : didWin ? `+${totalPot}` : `-${activeMatch.wagerAmount}`} 💰
                            </div>
                            {wagerToken && (
                                <div className={`${isDraw ? 'text-gray-400' : didWin ? 'text-cyan-400' : 'text-red-400'} text-lg font-bold mb-3`}>
                                    {isDraw ? `${wagerToken.tokenAmount} ${displayTokenSymbol(wagerToken.tokenSymbol)} REFUNDED` :
                                     didWin ? `+${tokenWon} ${displayTokenSymbol(tokenSettlement?.tokenSymbol || wagerToken.tokenSymbol)}` :
                                     `-${tokenLost} ${displayTokenSymbol(wagerToken.tokenSymbol)}`} 💎
                                </div>
                            )}
                            {solscanLink && (
                                <a href={solscanLink} target="_blank" rel="noopener noreferrer"
                                   className="text-cyan-400 text-xs underline mb-3 block">
                                    View on Solscan ↗
                                </a>
                            )}
                            <button 
                                onClick={() => { clearMatch(); onMatchEnd?.(); }}
                                className="w-full bg-cyan-500 active:bg-cyan-600 text-white py-2 rounded-lg font-bold text-sm"
                            >
                                CONTINUE
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
    // Portrait/Desktop layout
    return (
        <div className="fixed inset-0 z-40 overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #0f2744 50%, #0a1929 100%)' }}>
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }} />
            </div>
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-2 sm:p-4 gap-2">
                <button onClick={handleForfeit} className="bg-red-600 active:bg-red-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold">
                    FORFEIT
                </button>
                <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                    <span className="text-yellow-400 text-[10px] sm:text-xs font-bold">💰 {totalPot}</span>
                </div>
                <h1 className="text-white text-sm sm:text-xl font-bold flex-1 text-center">CONNECT 4</h1>
                <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                    <span className={`text-[10px] sm:text-xs font-bold ${matchState.turnTimeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                        ⏱ {matchState.turnTimeRemaining}s
                    </span>
                </div>
            </div>
            
            {/* Opponent */}
            <div className="absolute top-14 sm:top-20 left-1/2 -translate-x-1/2 z-10">
                <div className={`bg-black/60 rounded-xl px-4 py-2 sm:px-6 sm:py-3 border-2 transition-all ${!matchState.isMyTurn && matchState.phase === 'playing' ? (opponentColor === 'R' ? 'border-red-500 shadow-lg shadow-red-500/30' : 'border-yellow-400 shadow-lg shadow-yellow-400/30') : 'border-transparent'}`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${opponentColor === 'R' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                        <div className="text-left">
                            <span className="text-white font-bold text-xs sm:text-sm block truncate max-w-[100px] sm:max-w-[150px]">{opponent.name}</span>
                            <span className="text-white/50 text-[10px] sm:text-xs">
                                {!matchState.isMyTurn && matchState.phase === 'playing' ? 'Thinking...' : 'Opponent'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Board */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="bg-blue-700 p-2 sm:p-3 rounded-2xl shadow-2xl border-4 border-blue-800">
                    <div className="grid gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                        {[5, 4, 3, 2, 1, 0].map(row => (
                            [0, 1, 2, 3, 4, 5, 6].map(col => (
                                <div
                                    key={`cell-${row}-${col}`}
                                    onClick={() => handleColumnClick(col)}
                                    onTouchEnd={(e) => { e.preventDefault(); handleColumnClick(col); }}
                                    className="cursor-pointer select-none touch-manipulation active:scale-95"
                                >
                                    {renderCell(row, col)}
                                </div>
                            ))
                        ))}
                    </div>
                </div>
                {matchState.phase === 'playing' && (
                    <div className="text-center mt-4">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${matchState.isMyTurn ? (myColor === 'R' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30') : 'bg-white/10 text-white/60'}`}>
                            <div className={`w-4 h-4 rounded-full ${matchState.isMyTurn ? (myColor === 'R' ? 'bg-red-500' : 'bg-yellow-400') : 'bg-gray-500'}`} />
                            {matchState.isMyTurn ? 'Your turn!' : `${opponent.name}'s turn`}
                        </span>
                    </div>
                )}
            </div>
            
            {/* You */}
            <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-10">
                <div className={`bg-black/60 rounded-xl px-4 py-2 sm:px-6 sm:py-3 border-2 transition-all ${matchState.isMyTurn && matchState.phase === 'playing' ? (myColor === 'R' ? 'border-red-500 shadow-lg shadow-red-500/30' : 'border-yellow-400 shadow-lg shadow-yellow-400/30') : 'border-transparent'}`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${myColor === 'R' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                        <div className="text-left">
                            <span className="text-white font-bold text-xs sm:text-sm block truncate max-w-[100px] sm:max-w-[150px]">{myPlayer.name}</span>
                            <span className="text-white/50 text-[10px] sm:text-xs">
                                {matchState.isMyTurn && matchState.phase === 'playing' ? 'Your turn!' : 'You'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Complete overlay */}
            {isComplete && (
                <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 sm:p-8 text-center max-w-sm w-full border border-white/10 shadow-2xl">
                        <div className="text-5xl sm:text-6xl mb-4">{isDraw ? '🤝' : didWin ? '🏆' : '😢'}</div>
                        <h2 className="text-xl sm:text-3xl font-bold text-white mb-2">
                            {isDraw ? 'DRAW!' : didWin ? 'VICTORY!' : 'DEFEAT'}
                        </h2>
                        <p className="text-white/60 text-sm mb-4">
                            {isDraw ? 'The board is full!' : didWin ? `You connected 4 against ${opponent.name}!` : `${opponent.name} connected 4...`}
                        </p>
                        <div className={`${isDraw ? 'bg-gray-500/20 border-gray-500/30' : didWin ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'} rounded-xl p-4 mb-4 border`}>
                            <p className={`${isDraw ? 'text-gray-400' : didWin ? 'text-green-400' : 'text-red-400'} text-xl sm:text-2xl font-bold`}>
                                {isDraw ? 'REFUNDED' : didWin ? `+${totalPot}` : `-${activeMatch.wagerAmount}`} 💰
                            </p>
                            {wagerToken && (
                                <p className={`${isDraw ? 'text-gray-400' : didWin ? 'text-cyan-400' : 'text-red-400'} text-lg font-bold mt-2`}>
                                    {isDraw ? `${wagerToken.tokenAmount} ${displayTokenSymbol(wagerToken.tokenSymbol)} REFUNDED` :
                                     didWin ? `+${tokenWon} ${displayTokenSymbol(tokenSettlement?.tokenSymbol || wagerToken.tokenSymbol)}` :
                                     `-${tokenLost} ${displayTokenSymbol(wagerToken.tokenSymbol)}`} 💎
                                </p>
                            )}
                        </div>
                        {solscanLink && (
                            <a href={solscanLink} target="_blank" rel="noopener noreferrer"
                               className="text-cyan-400 text-sm underline mb-4 block">
                                View on Solscan ↗
                            </a>
                        )}
                        <button 
                            onClick={() => { clearMatch(); onMatchEnd?.(); }}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 active:from-cyan-600 active:to-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm sm:text-base shadow-lg"
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
