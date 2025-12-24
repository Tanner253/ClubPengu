/**
 * P2PTicTacToe - Player vs Player Tic Tac Toe match
 * Real-time synchronized game with wagering
 * Mobile-optimized with landscape support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useChallenge } from '../challenge';

// Helper to generate Solscan link
const getSolscanLink = (txSignature, isDevnet = false) => {
    if (!txSignature || txSignature.startsWith('DEV_')) return null;
    const cluster = isDevnet ? '?cluster=devnet' : '';
    return `https://solscan.io/tx/${txSignature}${cluster}`;
};

const P2PTicTacToe = ({ onMatchEnd }) => {
    const {
        activeMatch,
        matchState,
        matchResult,
        playCard,
        forfeitMatch,
        clearMatch,
    } = useChallenge();
    
    const [animatingCell, setAnimatingCell] = useState(null);
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
    
    // Handle cell click
    const handleCellClick = useCallback((index) => {
        if (!matchState || matchState.phase !== 'playing') return;
        if (!matchState.isMyTurn) return;
        if (matchState.board[index] !== null) return;
        
        setAnimatingCell(index);
        
        setTimeout(() => {
            playCard(index);
            setAnimatingCell(null);
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
    
    // Token wager info from match result OR active match
    const tokenSettlement = matchResult?.tokenSettlement;
    const wagerToken = matchResult?.wagerToken || activeMatch?.wagerToken;
    // Winner gets total pot (both players' wagers = 2x)
    // Use tokenSettlement.amount if available, otherwise calculate from wagerToken
    const tokenWon = didWin && wagerToken ? (tokenSettlement?.amount || wagerToken.tokenAmount * 2) : 0;
    const tokenLost = !didWin && !isDraw && wagerToken ? wagerToken.tokenAmount : 0;
    const solscanLink = tokenSettlement?.txSignature ? getSolscanLink(tokenSettlement.txSignature) : null;
    
    const landscapeMobile = isLandscape && isMobile;
    
    // Landscape mobile layout
    if (landscapeMobile) {
        return (
            <div className="fixed inset-0 z-40 overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #0a1628 0%, #1a2a4a 50%, #0d1a30 100%)' }}>
                
                {/* Compact Header */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 gap-2 z-20">
                    <button 
                        onClick={handleForfeit}
                        className="bg-red-600 active:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold"
                    >
                        FORFEIT
                    </button>
                    <span className="text-yellow-400 text-[10px] font-bold">💰 {totalPot}</span>
                    <h1 className="text-white text-xs font-bold">TIC TAC TOE</h1>
                    <span className={`text-[10px] font-bold ${matchState.turnTimeRemaining <= 10 ? 'text-red-400' : 'text-white'}`}>
                        ⏱ {matchState.turnTimeRemaining}s
                    </span>
                </div>
                
                {/* Main layout: opponent | board | you */}
                <div className="h-full flex items-center justify-center gap-3 px-2 pt-8 pb-2">
                    {/* Opponent */}
                    <div className={`flex flex-col items-center p-2 rounded-lg ${!matchState.isMyTurn ? 'bg-pink-500/20 border border-pink-500/50' : 'bg-black/40'}`}>
                        <span className="text-2xl font-bold text-pink-400">{opponentSymbol}</span>
                        <span className="text-white text-[10px] truncate max-w-[60px]">{opponent.name}</span>
                        {!matchState.isMyTurn && matchState.phase === 'playing' && (
                            <span className="text-pink-400 text-[8px]">Thinking...</span>
                        )}
                    </div>
                    
                    {/* Board */}
                    <div className="bg-black/40 p-2 rounded-xl">
                        <div className="grid grid-cols-3 gap-1.5">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(index => {
                                const value = matchState.board[index];
                                const isWinningCell = matchState.winningLine?.includes(index);
                                const isClickable = matchState.isMyTurn && value === null && matchState.phase === 'playing';
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleCellClick(index)}
                                        disabled={!isClickable}
                                        className={`
                                            w-14 h-14 flex items-center justify-center
                                            text-3xl font-bold rounded-xl border border-white/20
                                            transition-all duration-150
                                            ${isWinningCell ? 'bg-green-500/30 scale-105' : 'bg-white/5'}
                                            ${isClickable ? 'active:scale-95 active:bg-white/20' : ''}
                                            ${animatingCell === index ? 'scale-90' : ''}
                                            ${value === 'X' ? 'text-cyan-400' : value === 'O' ? 'text-pink-400' : ''}
                                        `}
                                    >
                                        {value}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* You */}
                    <div className={`flex flex-col items-center p-2 rounded-lg ${matchState.isMyTurn ? 'bg-cyan-500/20 border border-cyan-500/50' : 'bg-black/40'}`}>
                        <span className="text-2xl font-bold text-cyan-400">{mySymbol}</span>
                        <span className="text-white text-[10px] truncate max-w-[60px]">{myPlayer.name}</span>
                        {matchState.isMyTurn && matchState.phase === 'playing' && (
                            <span className="text-cyan-400 text-[8px]">Your turn!</span>
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
                            {/* Coins */}
                            {totalPot > 0 && (
                                <div className={`${isDraw ? 'text-gray-400' : didWin ? 'text-green-400' : 'text-red-400'} text-xl font-bold`}>
                                    {isDraw ? 'REFUNDED' : didWin ? `+${totalPot}` : `-${activeMatch.wagerAmount}`} 💰
                                </div>
                            )}
                            {/* Token Wager */}
                            {wagerToken && (
                                <div className={`${isDraw ? 'text-gray-400' : didWin ? 'text-cyan-400' : 'text-red-400'} text-lg font-bold mt-1`}>
                                    {isDraw ? `${wagerToken.tokenAmount} ${wagerToken.tokenSymbol} REFUNDED` :
                                     didWin ? `+${tokenWon} ${tokenSettlement?.tokenSymbol || wagerToken.tokenSymbol}` :
                                     `-${tokenLost} ${wagerToken.tokenSymbol}`} 💎
                                </div>
                            )}
                            {/* Solscan Link */}
                            {solscanLink && (
                                <a 
                                    href={solscanLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block mt-2 text-xs text-purple-400 hover:text-purple-300 underline"
                                >
                                    🔗 View on Solscan
                                </a>
                            )}
                            <button 
                                onClick={() => { clearMatch(); onMatchEnd?.(); }}
                                className="w-full mt-3 bg-cyan-500 active:bg-cyan-600 text-white py-2 rounded-lg font-bold text-sm"
                            >
                                CONTINUE
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
    // Portrait/Desktop layout - mobile-first design
    return (
        <div className="fixed inset-0 z-40 flex flex-col"
            style={{ background: 'linear-gradient(180deg, #0a1628 0%, #1a2a4a 50%, #0d1a30 100%)' }}>
            
            {/* Header - compact on mobile */}
            <div className="flex items-center justify-between p-2 sm:p-4 gap-2 shrink-0">
                <button 
                    onClick={handleForfeit} 
                    className="bg-red-600 active:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
                >
                    FORFEIT
                </button>
                <div className="flex items-center gap-2 sm:gap-4">
                    <span className="text-yellow-400 text-xs font-bold bg-black/40 px-2 py-1 rounded">💰 {totalPot}</span>
                    <h1 className="text-white text-sm sm:text-lg font-bold">TIC TAC TOE</h1>
                    <span className={`text-xs font-bold bg-black/40 px-2 py-1 rounded ${matchState.turnTimeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                        ⏱ {matchState.turnTimeRemaining}s
                    </span>
                </div>
            </div>
            
            {/* Opponent Info - top */}
            <div className="px-4 pb-2 shrink-0">
                <div className={`bg-black/50 rounded-xl px-4 py-2 border-2 transition-all mx-auto max-w-xs ${!matchState.isMyTurn && matchState.phase === 'playing' ? 'border-pink-500 shadow-lg shadow-pink-500/20' : 'border-transparent'}`}>
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl font-bold text-pink-400">{opponentSymbol}</span>
                        <div>
                            <span className="text-white font-bold text-sm block truncate max-w-[120px]">{opponent.name}</span>
                            <span className="text-pink-400/70 text-xs">
                                {!matchState.isMyTurn && matchState.phase === 'playing' ? 'Thinking...' : 'Opponent'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Board - centered and fills available space */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0">
                <div className="bg-black/40 p-3 sm:p-4 rounded-2xl border border-white/10">
                    <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(index => {
                            const value = matchState.board[index];
                            const isWinningCell = matchState.winningLine?.includes(index);
                            const isClickable = matchState.isMyTurn && value === null && matchState.phase === 'playing';
                            
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleCellClick(index)}
                                    disabled={!isClickable}
                                    className={`
                                        w-[72px] h-[72px] sm:w-24 sm:h-24
                                        flex items-center justify-center
                                        text-4xl sm:text-5xl font-bold
                                        rounded-xl border border-white/20
                                        transition-all duration-150
                                        ${isWinningCell ? 'bg-green-500/30 scale-105' : 'bg-white/5'}
                                        ${isClickable ? 'active:scale-95 active:bg-white/20' : ''}
                                        ${animatingCell === index ? 'scale-90' : ''}
                                        ${value === 'X' ? 'text-cyan-400' : value === 'O' ? 'text-pink-400' : ''}
                                    `}
                                >
                                    {value}
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                {/* Turn indicator */}
                {matchState.phase === 'playing' && (
                    <div className="mt-3">
                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${matchState.isMyTurn ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/10 text-white/60'}`}>
                            {matchState.isMyTurn ? `Your turn (${mySymbol})` : `Waiting...`}
                        </span>
                    </div>
                )}
            </div>
            
            {/* Your Info - bottom */}
            <div className="px-4 pt-2 pb-4 shrink-0">
                <div className={`bg-black/50 rounded-xl px-4 py-2 border-2 transition-all mx-auto max-w-xs ${matchState.isMyTurn && matchState.phase === 'playing' ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-transparent'}`}>
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl font-bold text-cyan-400">{mySymbol}</span>
                        <div>
                            <span className="text-white font-bold text-sm block truncate max-w-[120px]">{myPlayer.name}</span>
                            <span className="text-cyan-400/70 text-xs">
                                {matchState.isMyTurn && matchState.phase === 'playing' ? 'Your turn!' : 'You'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Complete overlay */}
            {isComplete && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm w-full border border-white/10 shadow-2xl">
                        <div className="text-5xl mb-3">{isDraw ? '🤝' : didWin ? '🏆' : '😢'}</div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {isDraw ? 'DRAW!' : didWin ? 'VICTORY!' : 'DEFEAT'}
                        </h2>
                        <p className="text-white/60 text-sm mb-4">
                            {isDraw ? 'No one wins!' : didWin ? `You defeated ${opponent.name}!` : `${opponent.name} wins`}
                        </p>
                        <div className={`${isDraw ? 'bg-gray-500/20' : didWin ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-xl p-4 mb-4 border ${isDraw ? 'border-gray-500/30' : didWin ? 'border-green-500/30' : 'border-red-500/30'}`}>
                            {/* Coins */}
                            {totalPot > 0 && (
                                <p className={`${isDraw ? 'text-gray-400' : didWin ? 'text-green-400' : 'text-red-400'} text-xl font-bold`}>
                                    {isDraw ? 'REFUNDED' : didWin ? `+${totalPot}` : `-${activeMatch.wagerAmount}`} 💰
                                </p>
                            )}
                            {/* Token Wager */}
                            {wagerToken && (
                                <p className={`${isDraw ? 'text-gray-400' : didWin ? 'text-cyan-400' : 'text-red-400'} text-lg font-bold mt-2`}>
                                    {isDraw ? `${wagerToken.tokenAmount} ${wagerToken.tokenSymbol} REFUNDED` :
                                     didWin ? `+${tokenWon} ${tokenSettlement?.tokenSymbol || wagerToken.tokenSymbol}` :
                                     `-${tokenLost} ${wagerToken.tokenSymbol}`} 💎
                                </p>
                            )}
                        </div>
                        {/* Solscan Link */}
                        {solscanLink && (
                            <a 
                                href={solscanLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block mb-4 text-sm text-purple-400 hover:text-purple-300 underline"
                            >
                                🔗 View on Solscan
                            </a>
                        )}
                        <button 
                            onClick={() => { clearMatch(); onMatchEnd?.(); }}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 active:from-cyan-600 active:to-blue-600 text-white py-3 rounded-xl font-bold shadow-lg"
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
