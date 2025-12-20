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
