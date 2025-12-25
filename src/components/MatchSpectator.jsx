/**
 * MatchSpectator - Displays live match scoreboard for spectators
 * Shows as a floating panel at the top of the screen
 * Supports: Card Jitsu, Tic Tac Toe
 */

import React from 'react';
import { useChallenge } from '../challenge';

/**
 * Card Jitsu spectator display
 */
const CardJitsuSpectator = ({ players, state, totalPot }) => {
    const player1Wins = state?.player1Wins || { fire: 0, water: 0, snow: 0 };
    const player2Wins = state?.player2Wins || { fire: 0, water: 0, snow: 0 };
    
    const renderWins = (wins) => {
        const elements = [];
        if (wins.fire > 0) elements.push(...Array(Math.min(wins.fire, 3)).fill('🔥'));
        if (wins.water > 0) elements.push(...Array(Math.min(wins.water, 3)).fill('💧'));
        if (wins.snow > 0) elements.push(...Array(Math.min(wins.snow, 3)).fill('❄️'));
        return elements.length > 0 ? elements.join(' ') : '—';
    };
    
    return (
        <div className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 backdrop-blur-xl rounded-2xl border-2 border-purple-400/50 shadow-2xl px-4 py-3 min-w-[240px] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-yellow-400 text-xs font-bold">⚔️ CARD JITSU</span>
                <span className="text-purple-300 text-xs">•</span>
                <span className="text-yellow-400 text-xs font-bold">💰 {totalPot}</span>
            </div>
            
            {/* Players and Score */}
            <div className="flex items-center justify-between gap-3">
                <div className="text-center flex-1">
                    <p className="text-white font-bold text-xs truncate max-w-[80px]">
                        {players[0]?.name || 'Player 1'}
                    </p>
                    <p className="text-sm mt-1">{renderWins(player1Wins)}</p>
                </div>
                
                <div className="text-white/60 text-lg font-bold">VS</div>
                
                <div className="text-center flex-1">
                    <p className="text-white font-bold text-xs truncate max-w-[80px]">
                        {players[1]?.name || 'Player 2'}
                    </p>
                    <p className="text-sm mt-1">{renderWins(player2Wins)}</p>
                </div>
            </div>
            
            {/* Status */}
            <div className="text-center mt-2 pt-2 border-t border-white/10">
                <span className="text-white/50 text-[10px]">Round {state?.round || 1}</span>
                {state?.phase === 'select' && (
                    <span className="text-cyan-400 text-[10px] ml-2 animate-pulse">Selecting...</span>
                )}
                {state?.phase === 'reveal' && (
                    <span className="text-yellow-400 text-[10px] ml-2">Revealing!</span>
                )}
                {state?.status === 'complete' && (
                    <span className="text-green-400 text-[10px] ml-2">Complete!</span>
                )}
            </div>
            
            {/* Last round result */}
            {state?.lastRoundResult && (
                <div className="text-center mt-1">
                    <span className="text-xs">
                        {state.lastRoundResult.player1Card?.emoji || '❓'} vs {state.lastRoundResult.player2Card?.emoji || '❓'}
                    </span>
                </div>
            )}
        </div>
    );
};

/**
 * Tic Tac Toe spectator display - matches purple Card Jitsu bubble style
 */
const TicTacToeSpectator = ({ players, state, totalPot }) => {
    const board = state?.board || Array(9).fill(null);
    const currentTurn = state?.currentTurn || 'player1';
    const winner = state?.winner;
    const winningLine = state?.winningLine || [];
    const isDraw = winner === 'draw';
    const isComplete = state?.status === 'complete' || state?.phase === 'complete';
    
    // Render mini cell
    const renderCell = (index) => {
        const value = board[index];
        const isWinning = winningLine.includes(index);
        
        return (
            <div
                key={index}
                className={`
                    w-5 h-5 flex items-center justify-center text-[10px] font-bold
                    border border-white/20 rounded
                    ${isWinning ? 'bg-green-500/40' : 'bg-black/30'}
                    ${value === 'X' ? 'text-cyan-400' : value === 'O' ? 'text-pink-400' : 'text-transparent'}
                `}
            >
                {value || '·'}
            </div>
        );
    };
    
    return (
        <div className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 backdrop-blur-xl rounded-2xl border-2 border-purple-400/50 shadow-2xl px-4 py-3 min-w-[240px] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-yellow-400 text-xs font-bold">⭕ TIC TAC TOE</span>
                <span className="text-purple-300 text-xs">•</span>
                <span className="text-yellow-400 text-xs font-bold">💰 {totalPot}</span>
            </div>
            
            {/* Players and Score */}
            <div className="flex items-center justify-between gap-3">
                <div className="text-center flex-1">
                    <p className="text-white font-bold text-xs truncate max-w-[80px]">
                        {players[0]?.name || 'Player 1'}
                    </p>
                    <p className="text-sm mt-1 text-cyan-400 font-bold">X</p>
                </div>
                
                {/* Mini Board */}
                <div className="grid grid-cols-3 gap-0.5 bg-black/30 p-1 rounded">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => renderCell(i))}
                </div>
                
                <div className="text-center flex-1">
                    <p className="text-white font-bold text-xs truncate max-w-[80px]">
                        {players[1]?.name || 'Player 2'}
                    </p>
                    <p className="text-sm mt-1 text-pink-400 font-bold">O</p>
                </div>
            </div>
            
            {/* Status */}
            <div className="text-center mt-2 pt-2 border-t border-white/10">
                {!isComplete && (
                    <span className="text-white/50 text-[10px]">
                        {currentTurn === 'player1' ? players[0]?.name : players[1]?.name}'s turn
                    </span>
                )}
                {isComplete && winner && !isDraw && (
                    <span className="text-green-400 text-[10px] ml-2">
                        🏆 {winner === 'X' ? players[0]?.name : players[1]?.name} wins!
                    </span>
                )}
                {isComplete && isDraw && (
                    <span className="text-gray-400 text-[10px] ml-2">
                        🤝 Draw!
                    </span>
                )}
            </div>
        </div>
    );
};

/**
 * Connect 4 spectator display - matches purple Card Jitsu bubble style
 */
const Connect4Spectator = ({ players, state, totalPot }) => {
    const board = state?.board || Array(42).fill(null); // 6 rows x 7 cols
    const currentTurn = state?.currentTurn || 'player1';
    const winner = state?.winner;
    const winningCells = state?.winningCells || [];
    const isDraw = winner === 'draw';
    const isComplete = state?.status === 'complete' || state?.phase === 'complete';
    
    const ROWS = 6;
    const COLS = 7;
    
    // Check if a cell is part of winning line
    const isWinningCell = (row, col) => {
        return winningCells.some(([r, c]) => r === row && c === col);
    };
    
    // Render mini cell
    const renderCell = (row, col) => {
        const index = row * COLS + col;
        const value = board[index];
        const isWinning = isWinningCell(row, col);
        
        return (
            <div
                key={`${row}-${col}`}
                className={`
                    w-3 h-3 rounded-full
                    ${isWinning ? 'ring-1 ring-white' : ''}
                    ${value === null ? 'bg-black/30' : ''}
                    ${value === 'R' ? 'bg-red-500' : ''}
                    ${value === 'Y' ? 'bg-yellow-400' : ''}
                `}
            />
        );
    };
    
    return (
        <div className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 backdrop-blur-xl rounded-2xl border-2 border-purple-400/50 shadow-2xl px-4 py-3 min-w-[240px] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-yellow-400 text-xs font-bold">🔴 CONNECT 4</span>
                <span className="text-purple-300 text-xs">•</span>
                <span className="text-yellow-400 text-xs font-bold">💰 {totalPot}</span>
            </div>
            
            {/* Players and Score */}
            <div className="flex items-center justify-between gap-3">
                <div className="text-center flex-1">
                    <p className="text-white font-bold text-xs truncate max-w-[80px]">
                        {players[0]?.name || 'Player 1'}
                    </p>
                    <div className="w-4 h-4 rounded-full bg-red-500 mx-auto mt-1" />
                </div>
                
                {/* Mini Board */}
                <div className="bg-indigo-800 p-1 rounded">
                    <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                        {/* Render rows from top (5) to bottom (0) for visual display */}
                        {[5, 4, 3, 2, 1, 0].map(row => (
                            [0, 1, 2, 3, 4, 5, 6].map(col => renderCell(row, col))
                        ))}
                    </div>
                </div>
                
                <div className="text-center flex-1">
                    <p className="text-white font-bold text-xs truncate max-w-[80px]">
                        {players[1]?.name || 'Player 2'}
                    </p>
                    <div className="w-4 h-4 rounded-full bg-yellow-400 mx-auto mt-1" />
                </div>
            </div>
            
            {/* Status */}
            <div className="text-center mt-2 pt-2 border-t border-white/10">
                {!isComplete && (
                    <span className="text-white/50 text-[10px]">
                        {currentTurn === 'player1' ? players[0]?.name : players[1]?.name}'s turn
                    </span>
                )}
                {isComplete && winner && winner !== 'draw' && (
                    <span className="text-green-400 text-[10px] ml-2">
                        🏆 {winner === 'R' ? players[0]?.name : players[1]?.name} wins!
                    </span>
                )}
                {isComplete && isDraw && (
                    <span className="text-gray-400 text-[10px] ml-2">
                        🤝 Draw!
                    </span>
                )}
            </div>
        </div>
    );
};

/**
 * Monopoly spectator display - Shows live game state including positions, money, properties
 */
const MonopolySpectator = ({ players, state, totalPot }) => {
    const currentTurn = state?.currentTurn || 'player1';
    const winner = state?.winner;
    const isComplete = state?.status === 'complete';
    const lastDice = state?.lastDice || [0, 0];
    const phase = state?.phase;
    
    // Space names for position display
    const SPACE_NAMES = [
        'GO', 'Mediterranean', 'Chest', 'Baltic', 'Income Tax', 'Reading RR', 'Oriental', 'Chance',
        'Vermont', 'Connecticut', 'Jail', 'St. Charles', 'Electric Co', 'States', 'Virginia',
        'Penn RR', 'St. James', 'Chest', 'Tennessee', 'NY Ave', 'Free Parking', 'Kentucky',
        'Chance', 'Indiana', 'Illinois', 'B&O RR', 'Atlantic', 'Ventnor', 'Water Works',
        'Marvin Gdns', 'Go To Jail', 'Pacific', 'NC Ave', 'Chest', 'Penn Ave', 'Short Line',
        'Chance', 'Park Place', 'Luxury Tax', 'Boardwalk'
    ];
    
    const p1Pos = state?.player1Position ?? 0;
    const p2Pos = state?.player2Position ?? 0;
    const p1InJail = state?.player1InJail;
    const p2InJail = state?.player2InJail;
    
    return (
        <div className="bg-gradient-to-br from-emerald-900/95 to-green-900/95 backdrop-blur-xl rounded-2xl border-2 border-emerald-400/50 shadow-2xl px-4 py-3 min-w-[280px] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-yellow-400 text-xs font-bold">🎩 MONOPOLY</span>
                <span className="text-emerald-300 text-xs">•</span>
                <span className="text-yellow-400 text-xs font-bold">💰 {totalPot}</span>
                {phase && !isComplete && (
                    <>
                        <span className="text-emerald-300 text-xs">•</span>
                        <span className="text-emerald-300 text-[10px] animate-pulse">
                            {phase === 'roll' ? '🎲' : phase === 'moving' ? '🚶' : phase === 'action' ? '💵' : '⏳'}
                        </span>
                    </>
                )}
            </div>
            
            {/* Players and Money */}
            <div className="flex items-center justify-between gap-2">
                <div className="text-center flex-1">
                    <p className={`font-bold text-xs truncate max-w-[85px] ${currentTurn === 'player1' && !isComplete ? 'text-yellow-300' : 'text-white'}`}>
                        {currentTurn === 'player1' && !isComplete && '▶ '}{players[0]?.name || 'Player 1'}
                    </p>
                    <p className="text-green-400 text-sm font-bold">${state?.player1Money ?? 1500}</p>
                    <p className="text-white/50 text-[10px]">
                        {state?.player1Properties?.length || 0} props
                        {p1InJail && <span className="text-red-400 ml-1">🔒</span>}
                    </p>
                    <p className="text-cyan-300 text-[9px] truncate max-w-[85px]">
                        📍 {SPACE_NAMES[p1Pos]}
                    </p>
                </div>
                
                {/* Dice display */}
                <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1">
                        <div className="w-6 h-6 bg-white rounded text-xs font-bold flex items-center justify-center text-gray-800 shadow">
                            {lastDice[0] || '?'}
                        </div>
                        <div className="w-6 h-6 bg-white rounded text-xs font-bold flex items-center justify-center text-gray-800 shadow">
                            {lastDice[1] || '?'}
                        </div>
                    </div>
                    {lastDice[0] > 0 && (
                        <span className="text-white/60 text-[9px] font-bold">= {lastDice[0] + lastDice[1]}</span>
                    )}
                    {lastDice[0] === lastDice[1] && lastDice[0] > 0 && (
                        <span className="text-yellow-400 text-[8px]">DOUBLES!</span>
                    )}
                </div>
                
                <div className="text-center flex-1">
                    <p className={`font-bold text-xs truncate max-w-[85px] ${currentTurn === 'player2' && !isComplete ? 'text-yellow-300' : 'text-white'}`}>
                        {currentTurn === 'player2' && !isComplete && '▶ '}{players[1]?.name || 'Player 2'}
                    </p>
                    <p className="text-green-400 text-sm font-bold">${state?.player2Money ?? 1500}</p>
                    <p className="text-white/50 text-[10px]">
                        {state?.player2Properties?.length || 0} props
                        {p2InJail && <span className="text-red-400 ml-1">🔒</span>}
                    </p>
                    <p className="text-pink-300 text-[9px] truncate max-w-[85px]">
                        📍 {SPACE_NAMES[p2Pos]}
                    </p>
                </div>
            </div>
            
            {/* Current event */}
            {state?.currentEvent && !isComplete && (
                <div className="text-center mt-2 pt-2 border-t border-white/10">
                    <span className="text-yellow-300 text-[10px] font-medium">
                        {state.currentEvent.title}
                    </span>
                    <span className="text-white/70 text-[10px] ml-1">
                        {state.currentEvent.description}
                    </span>
                </div>
            )}
            
            {/* Winner */}
            {isComplete && winner && (
                <div className="text-center mt-2 pt-2 border-t border-white/10">
                    <span className="text-green-400 text-sm font-bold">
                        🏆 {winner === 'player1' ? players[0]?.name : players[1]?.name} wins!
                    </span>
                </div>
            )}
        </div>
    );
};

/**
 * UNO spectator display - Shows card counts, active color, current turn
 */
const UnoSpectator = ({ players, state, totalPot }) => {
    const currentTurn = state?.currentTurn || 'player1';
    const winner = state?.winner;
    const isComplete = state?.status === 'complete' || state?.phase === 'complete';
    const activeColor = state?.activeColor || 'Red';
    const activeValue = state?.activeValue || '';
    const p1Cards = state?.player1CardCount ?? 7;
    const p2Cards = state?.player2CardCount ?? 7;
    const calledUno = state?.calledUno || {};
    
    const COLOR_STYLES = {
        Red: 'bg-red-500',
        Blue: 'bg-blue-600',
        Green: 'bg-green-500',
        Yellow: 'bg-yellow-500',
        Black: 'bg-gray-800'
    };
    
    const winnerName = winner === 'player1' ? players[0]?.name : players[1]?.name;
    const turnName = currentTurn === 'player1' ? players[0]?.name : players[1]?.name;
    
    return (
        <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl border-2 border-purple-400/50 shadow-2xl px-4 py-3 min-w-[260px] animate-fade-in">
            {/* Header - UNO themed gradient */}
            <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-blue-500 to-yellow-500 text-sm font-black">
                    🃏 UNO
                </span>
                <span className="text-gray-500 text-xs">•</span>
                <span className="text-yellow-400 text-xs font-bold">💰 {totalPot}</span>
            </div>
            
            {/* Players and Card Counts */}
            <div className="flex items-center justify-between gap-3">
                <div className="text-center flex-1">
                    <div className="flex items-center gap-1 justify-center">
                        <p className={`text-white font-bold text-xs truncate max-w-[70px] ${currentTurn === 'player1' ? 'text-cyan-400' : ''}`}>
                            {players[0]?.name || 'Player 1'}
                        </p>
                        {calledUno.player1 && <span className="text-red-500 text-[8px] font-black animate-pulse">UNO!</span>}
                    </div>
                    <p className="text-xl font-bold text-white mt-1">🃏 {p1Cards}</p>
                    {currentTurn === 'player1' && !isComplete && (
                        <div className="w-2 h-2 rounded-full bg-green-400 mx-auto mt-1 animate-pulse" />
                    )}
                </div>
                
                <div className="flex flex-col items-center gap-1">
                    {/* Current card preview */}
                    <div className={`w-8 h-12 ${COLOR_STYLES[activeColor]} rounded-md flex items-center justify-center shadow-lg border-2 border-white/20`}>
                        <span className="text-white text-[10px] font-bold">
                            {activeValue === 'Skip' ? '⊘' : 
                             activeValue === 'Reverse' ? '⇄' :
                             activeValue === 'Wild' ? '★' :
                             activeValue === 'Wild +4' ? '+4' : activeValue}
                        </span>
                    </div>
                    <span className="text-white/40 text-[8px]">{activeColor}</span>
                </div>
                
                <div className="text-center flex-1">
                    <div className="flex items-center gap-1 justify-center">
                        {calledUno.player2 && <span className="text-red-500 text-[8px] font-black animate-pulse">UNO!</span>}
                        <p className={`text-white font-bold text-xs truncate max-w-[70px] ${currentTurn === 'player2' ? 'text-pink-400' : ''}`}>
                            {players[1]?.name || 'Player 2'}
                        </p>
                    </div>
                    <p className="text-xl font-bold text-white mt-1">🃏 {p2Cards}</p>
                    {currentTurn === 'player2' && !isComplete && (
                        <div className="w-2 h-2 rounded-full bg-green-400 mx-auto mt-1 animate-pulse" />
                    )}
                </div>
            </div>
            
            {/* Status */}
            <div className="text-center mt-2 pt-2 border-t border-white/10">
                {!isComplete && (
                    <span className="text-white/50 text-[10px]">
                        {state?.phase === 'selectColor' ? `${turnName} choosing color...` : `${turnName}'s turn`}
                    </span>
                )}
                {isComplete && winner && (
                    <span className="text-green-400 text-[10px] font-bold">
                        🏆 {winnerName} wins! {state?.reason && `(${state.reason})`}
                    </span>
                )}
            </div>
            
            {/* Last action indicator */}
            {state?.lastAction && !isComplete && (
                <div className="text-center mt-1">
                    <span className="text-white/40 text-[9px]">
                        {state.lastAction.type === 'play' ? 
                            `Played ${state.lastAction.card?.c} ${state.lastAction.card?.v}` :
                            'Drew a card'}
                    </span>
                </div>
            )}
        </div>
    );
};

/**
 * Blackjack spectator display - Shows hands, scores, and dealer cards
 */
const BlackjackSpectator = ({ players, state, totalPot }) => {
    const currentTurn = state?.currentTurn || 'player1';
    const winner = state?.winner;
    const isComplete = state?.status === 'complete' || state?.phase === 'complete';
    const phase = state?.phase;
    
    const p1Score = state?.player1Score ?? 0;
    const p2Score = state?.player2Score ?? 0;
    const dealerScore = state?.dealerScore ?? 0;
    const p1Status = state?.player1Status || 'playing';
    const p2Status = state?.player2Status || 'playing';
    const dealerStatus = state?.dealerStatus || 'waiting';
    
    // Get card display for a hand
    const renderHand = (hand, maxShow = 4) => {
        if (!hand || hand.length === 0) return '—';
        return hand.slice(0, maxShow).map((card, i) => {
            if (card.hidden) return '🂠';
            const isRed = card.suit === '♥' || card.suit === '♦';
            return (
                <span key={i} className={isRed ? 'text-red-400' : 'text-white'}>
                    {card.value}{card.suit}
                </span>
            );
        }).reduce((prev, curr, i) => [prev, <span key={`sep-${i}`} className="mx-0.5"></span>, curr]);
    };
    
    const statusEmoji = (status) => {
        if (status === 'bust') return '💥';
        if (status === 'blackjack') return '🂡';
        if (status === 'stand') return '🛑';
        if (status === 'playing') return '🎯';
        return '⏳';
    };
    
    return (
        <div className="bg-gradient-to-br from-green-900/95 to-emerald-900/95 backdrop-blur-xl rounded-2xl border-2 border-green-400/50 shadow-2xl px-4 py-3 min-w-[280px] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-yellow-400 text-xs font-bold">🂡 BLACKJACK</span>
                <span className="text-green-300 text-xs">•</span>
                <span className="text-yellow-400 text-xs font-bold">💰 {totalPot}</span>
                {phase && phase !== 'complete' && (
                    <>
                        <span className="text-green-300 text-xs">•</span>
                        <span className="text-green-300 text-[10px] animate-pulse">
                            {phase === 'player1Turn' ? '1️⃣' : phase === 'player2Turn' ? '2️⃣' : '🎰'}
                        </span>
                    </>
                )}
            </div>
            
            {/* Dealer */}
            <div className="text-center mb-2 pb-2 border-b border-white/10">
                <p className="text-yellow-400 text-xs font-bold">DEALER</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-white text-sm font-mono">
                        {renderHand(state?.dealerHand)}
                    </span>
                    <span className={`text-sm font-bold ${dealerStatus === 'bust' ? 'text-red-400' : 'text-white'}`}>
                        ({phase === 'complete' || phase === 'dealerTurn' ? dealerScore : '?'})
                    </span>
                </div>
            </div>
            
            {/* Players */}
            <div className="flex items-center justify-between gap-2">
                <div className="text-center flex-1">
                    <p className={`font-bold text-xs truncate max-w-[85px] ${currentTurn === 'player1' && !isComplete ? 'text-cyan-400' : 'text-white'}`}>
                        {players[0]?.name || 'Player 1'}
                    </p>
                    <p className="text-lg font-bold text-white mt-1">
                        {p1Score} {statusEmoji(p1Status)}
                    </p>
                    <p className="text-[10px] text-white/50">{p1Status}</p>
                </div>
                
                <div className="text-white/40 text-xs font-bold">VS</div>
                
                <div className="text-center flex-1">
                    <p className={`font-bold text-xs truncate max-w-[85px] ${currentTurn === 'player2' && !isComplete ? 'text-pink-400' : 'text-white'}`}>
                        {players[1]?.name || 'Player 2'}
                    </p>
                    <p className="text-lg font-bold text-white mt-1">
                        {p2Score} {statusEmoji(p2Status)}
                    </p>
                    <p className="text-[10px] text-white/50">{p2Status}</p>
                </div>
            </div>
            
            {/* Status */}
            <div className="text-center mt-2 pt-2 border-t border-white/10">
                {!isComplete && phase !== 'dealerTurn' && (
                    <span className="text-white/50 text-[10px]">
                        {currentTurn === 'player1' ? players[0]?.name : players[1]?.name}'s turn
                    </span>
                )}
                {!isComplete && phase === 'dealerTurn' && (
                    <span className="text-yellow-400 text-[10px] animate-pulse">
                        🎰 Dealer playing...
                    </span>
                )}
                {isComplete && winner && winner !== 'draw' && (
                    <span className="text-green-400 text-[10px] font-bold">
                        🏆 {winner === 'player1' ? players[0]?.name : players[1]?.name} wins!
                    </span>
                )}
                {isComplete && winner === 'draw' && (
                    <span className="text-gray-400 text-[10px] font-bold">
                        🤝 Draw! Both push
                    </span>
                )}
            </div>
        </div>
    );
};

/**
 * Battleship spectator display - Shows shot counts and ships sunk
 */
const BattleshipSpectator = ({ players, state, totalPot }) => {
    const currentTurn = state?.currentTurn || 'player1';
    const winner = state?.winner;
    const isComplete = state?.status === 'complete' || state?.phase === 'complete';
    
    const p1ShotsCount = state?.player1ShotsCount ?? 0;
    const p1HitsCount = state?.player1HitsCount ?? 0;
    const p1ShipsSunk = state?.player1ShipsSunk ?? 0;
    const p2ShotsCount = state?.player2ShotsCount ?? 0;
    const p2HitsCount = state?.player2HitsCount ?? 0;
    const p2ShipsSunk = state?.player2ShipsSunk ?? 0;
    const totalShips = state?.totalShips ?? 5;
    
    const lastAction = state?.lastAction;
    
    return (
        <div className="bg-gradient-to-br from-blue-900/95 to-indigo-900/95 backdrop-blur-xl rounded-2xl border-2 border-cyan-400/50 shadow-2xl px-4 py-3 min-w-[280px] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-cyan-400 text-xs font-bold">🚢 BATTLESHIP</span>
                <span className="text-blue-300 text-xs">•</span>
                <span className="text-yellow-400 text-xs font-bold">💰 {totalPot}</span>
            </div>
            
            {/* Players and Stats */}
            <div className="flex items-center justify-between gap-3">
                <div className="text-center flex-1">
                    <p className={`font-bold text-xs truncate max-w-[85px] ${currentTurn === 'player1' && !isComplete ? 'text-cyan-400' : 'text-white'}`}>
                        {currentTurn === 'player1' && !isComplete && '🎯 '}{players[0]?.name || 'Player 1'}
                    </p>
                    <p className="text-white text-lg font-bold">{p1ShipsSunk}/{totalShips}</p>
                    <p className="text-white/50 text-[10px]">
                        Ships sunk
                    </p>
                    <p className="text-green-400 text-[9px]">
                        {p1HitsCount}/{p1ShotsCount} hits
                    </p>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                    {/* Mini ship status display */}
                    <div className="flex gap-0.5">
                        {[...Array(totalShips)].map((_, i) => (
                            <div key={i} className={`w-2 h-4 rounded-sm ${i < (totalShips - p2ShipsSunk) ? 'bg-cyan-500' : 'bg-gray-600'}`} />
                        ))}
                    </div>
                    <span className="text-white/30 text-[8px]">vs</span>
                    <div className="flex gap-0.5">
                        {[...Array(totalShips)].map((_, i) => (
                            <div key={i} className={`w-2 h-4 rounded-sm ${i < (totalShips - p1ShipsSunk) ? 'bg-pink-500' : 'bg-gray-600'}`} />
                        ))}
                    </div>
                </div>
                
                <div className="text-center flex-1">
                    <p className={`font-bold text-xs truncate max-w-[85px] ${currentTurn === 'player2' && !isComplete ? 'text-pink-400' : 'text-white'}`}>
                        {currentTurn === 'player2' && !isComplete && '🎯 '}{players[1]?.name || 'Player 2'}
                    </p>
                    <p className="text-white text-lg font-bold">{p2ShipsSunk}/{totalShips}</p>
                    <p className="text-white/50 text-[10px]">
                        Ships sunk
                    </p>
                    <p className="text-green-400 text-[9px]">
                        {p2HitsCount}/{p2ShotsCount} hits
                    </p>
                </div>
            </div>
            
            {/* Status */}
            <div className="text-center mt-2 pt-2 border-t border-white/10">
                {!isComplete && (
                    <span className="text-white/50 text-[10px]">
                        {currentTurn === 'player1' ? players[0]?.name : players[1]?.name}'s turn to fire
                    </span>
                )}
                {lastAction && !isComplete && (
                    <span className={`ml-2 text-[10px] ${lastAction.type === 'hit' ? 'text-red-400' : 'text-blue-300'}`}>
                        {lastAction.type === 'hit' ? '💥 HIT!' : '💨 MISS'}
                        {lastAction.sunkShip && ` - ${lastAction.sunkShip} SUNK!`}
                    </span>
                )}
                {isComplete && winner && (
                    <span className="text-green-400 text-[10px] font-bold">
                        🏆 {winner === 'player1' ? players[0]?.name : players[1]?.name} wins! Fleet neutralized!
                    </span>
                )}
            </div>
        </div>
    );
};

/**
 * Single match spectator display - routes to appropriate game view
 */
const MatchSpectatorBubble = ({ matchData }) => {
    if (!matchData) return null;
    
    const { players, state, wagerAmount, gameType } = matchData;
    
    if (!players || players.length < 2) return null;
    
    const totalPot = (wagerAmount || 0) * 2;
    
    // Route to appropriate game spectator
    if (gameType === 'tic_tac_toe') {
        return <TicTacToeSpectator players={players} state={state} totalPot={totalPot} />;
    }
    
    if (gameType === 'connect4') {
        return <Connect4Spectator players={players} state={state} totalPot={totalPot} />;
    }
    
    if (gameType === 'monopoly') {
        return <MonopolySpectator players={players} state={state} totalPot={totalPot} />;
    }
    
    if (gameType === 'uno') {
        return <UnoSpectator players={players} state={state} totalPot={totalPot} />;
    }
    
    if (gameType === 'blackjack') {
        return <BlackjackSpectator players={players} state={state} totalPot={totalPot} />;
    }
    
    if (gameType === 'battleship') {
        return <BattleshipSpectator players={players} state={state} totalPot={totalPot} />;
    }
    
    // Default: Card Jitsu
    return <CardJitsuSpectator players={players} state={state} totalPot={totalPot} />;
};

/**
 * MatchSpectatorsContainer - Renders all active match spectator bubbles
 */
export const MatchSpectatorsContainer = () => {
    const { activeMatches, spectatingMatch, isInMatch } = useChallenge();
    
    // Don't show if we're in a match ourselves
    if (isInMatch) return null;
    
    // Combine active matches with real-time spectating data
    const matchesToRender = activeMatches
        .map(match => {
            const spectateData = spectatingMatch?.[match.matchId];
            return {
                ...match,
                state: spectateData?.state || match.state || {},
                wagerAmount: spectateData?.wagerAmount || match.wagerAmount,
                gameType: spectateData?.gameType || match.gameType // Ensure gameType is always present
            };
        })
        .filter(m => m.players?.length >= 2);
    
    if (matchesToRender.length === 0) return null;
    
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col gap-2 pointer-events-none">
            {matchesToRender.map(match => (
                <MatchSpectatorBubble
                    key={match.matchId}
                    matchData={match}
                />
            ))}
        </div>
    );
};

export default MatchSpectatorBubble;
