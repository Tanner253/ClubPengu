/**
 * P2PCardJitsu - Player vs Player Card Jitsu match
 * Real-time synchronized card game with wagering
 * Reuses game logic and styling from the original Card Jitsu
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useChallenge } from '../challenge';

const P2PCardJitsu = ({ onMatchEnd }) => {
    const {
        activeMatch,
        matchState,
        playCard,
        forfeitMatch,
        clearMatch,
    } = useChallenge();
    
    const [selectedCard, setSelectedCard] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [animatingCard, setAnimatingCard] = useState(null);
    const [previousPhase, setPreviousPhase] = useState(null);
    
    // Track phase changes to show reveal animation
    useEffect(() => {
        if (matchState?.phase === 'reveal' && previousPhase === 'select') {
            setShowResult(true);
            setTimeout(() => {
                setShowResult(false);
                setSelectedCard(null);
            }, 2000);
        }
        setPreviousPhase(matchState?.phase);
    }, [matchState?.phase, previousPhase]);
    
    // Handle card selection
    const handleCardSelect = useCallback((index) => {
        if (!matchState || matchState.phase !== 'select') return;
        if (matchState.mySelectedCard !== null) return;
        
        setSelectedCard(index);
        setAnimatingCard(index);
        
        setTimeout(() => {
            playCard(index);
            setAnimatingCard(null);
        }, 300);
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
    const myWins = isPlayer1 ? matchState.player1Wins : matchState.player2Wins;
    const opponentWins = isPlayer1 ? matchState.player2Wins : matchState.player1Wins;
    
    // Render a card - matching original CardJitsu styling
    const renderCard = (card, { isPlayed = false, isHidden = false, size = 'normal' } = {}) => {
        if (!card) return null;
        
        const bgGradient = {
            fire: 'from-red-500 to-orange-600',
            water: 'from-blue-500 to-cyan-600',
            snow: 'from-cyan-300 to-blue-200'
        }[card.element] || 'from-gray-600 to-gray-700';
        
        const sizeClasses = {
            small: 'w-16 h-24 sm:w-20 sm:h-28',
            normal: 'w-20 h-28 sm:w-24 sm:h-36 md:w-28 md:h-40',
            large: 'w-24 h-36 sm:w-28 sm:h-40 md:w-32 md:h-44'
        }[size];
        
        return (
            <div 
                className={`
                    relative ${sizeClasses} rounded-xl shadow-lg transform transition-all duration-300
                    ${isHidden ? 'bg-gradient-to-br from-gray-700 to-gray-800' : `bg-gradient-to-br ${bgGradient}`}
                    ${isPlayed ? 'scale-105 sm:scale-110' : 'hover:scale-105 hover:-translate-y-1'}
                    border-2 sm:border-4 border-white/30
                `}
            >
                {isHidden ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-3xl sm:text-4xl">🎴</div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-between p-1.5 sm:p-2">
                        <div className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wider">
                            {card.element}
                        </div>
                        <div className="text-3xl sm:text-4xl md:text-5xl">{card.emoji}</div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                            {[...Array(Math.min(card.power || 1, 5))].map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full shadow" />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };
    
    // Render win tracker - compact for mobile
    const renderWinTracker = (wins, isYou = false) => (
        <div className="flex gap-1 sm:gap-2">
            {['fire', 'water', 'snow'].map(elem => (
                <div 
                    key={elem}
                    className={`
                        w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center
                        ${wins[elem] > 0 ? 'bg-white/20' : 'bg-black/30'}
                        transition-all text-sm sm:text-base
                    `}
                >
                    {wins[elem] > 0 && (
                        <span className="relative">
                            {{fire: '🔥', water: '💧', snow: '❄️'}[elem]}
                            {wins[elem] > 1 && (
                                <span className="absolute -bottom-1 -right-1 text-[8px] sm:text-[10px] bg-black/50 rounded px-0.5">
                                    {wins[elem]}
                                </span>
                            )}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
    
    const isComplete = matchState.status === 'complete';
    const didWin = matchState.winnerId === (isPlayer1 ? activeMatch.player1.id : activeMatch.player2.id);
    const totalPot = activeMatch.wagerAmount * 2;
    
    return (
        <div className="fixed inset-0 z-40 overflow-hidden touch-none">
            {/* Dojo Background */}
            <div 
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(180deg, #1a0a0a 0%, #2d1515 50%, #4a2020 100%)'
                }}
            >
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-24 sm:h-32 bg-gradient-to-b from-black to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-24 sm:h-32 bg-gradient-to-t from-black to-transparent" />
                </div>
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
                            CARD JITSU
                        </h1>
                        <p className="text-white/60 text-[10px] sm:text-xs">Round {matchState.round}</p>
                    </div>
                    
                    {/* Timer */}
                    <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 shrink-0">
                        <span className={`retro-text text-[10px] sm:text-xs ${matchState.turnTimeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                            ⏱ {matchState.turnTimeRemaining}s
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Player Info - Opponent (Top Left) */}
            <div className="absolute top-14 sm:top-20 left-2 sm:left-4 z-10">
                <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-2 mb-1 sm:mb-2">
                    <span className="text-red-400 font-bold text-xs sm:text-sm truncate block max-w-[80px] sm:max-w-[120px]">
                        {opponent.name}
                    </span>
                    <span className="text-white/50 text-[10px] sm:text-xs">OPPONENT</span>
                </div>
                {renderWinTracker(opponentWins)}
            </div>
            
            {/* Player Info - You (Top Right) */}
            <div className="absolute top-14 sm:top-20 right-2 sm:right-4 z-10 text-right">
                <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-2 mb-1 sm:mb-2">
                    <span className="text-green-400 font-bold text-xs sm:text-sm truncate block max-w-[80px] sm:max-w-[120px]">
                        {myPlayer.name}
                    </span>
                    <span className="text-white/50 text-[10px] sm:text-xs">YOU</span>
                </div>
                <div className="flex justify-end">
                    {renderWinTracker(myWins, true)}
                </div>
            </div>
            
            {/* Status Indicator */}
            <div className="absolute top-28 sm:top-36 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-black/70 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 sm:px-6 sm:py-2">
                    {matchState.phase === 'select' && matchState.mySelectedCard === null && (
                        <span className="text-yellow-400 text-xs sm:text-sm font-medium">Select a card!</span>
                    )}
                    {matchState.phase === 'select' && matchState.mySelectedCard !== null && !matchState.opponentHasSelected && (
                        <span className="text-cyan-400 text-xs sm:text-sm">Waiting for {opponent.name}...</span>
                    )}
                    {matchState.phase === 'select' && matchState.mySelectedCard !== null && matchState.opponentHasSelected && (
                        <span className="text-green-400 text-xs sm:text-sm">Revealing...</span>
                    )}
                    {matchState.phase === 'reveal' && (
                        <span className="text-white text-xs sm:text-sm">Cards revealed!</span>
                    )}
                </div>
            </div>
            
            {/* Battle Area */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-4 sm:gap-8 md:gap-16 items-center z-10">
                {/* Opponent Card */}
                <div className={`transition-all duration-500 ${showResult ? 'scale-100' : 'scale-90 opacity-70'}`}>
                    {matchState.phase === 'reveal' && matchState.lastRoundResult ? (
                        renderCard(
                            isPlayer1 ? matchState.lastRoundResult.player2Card : matchState.lastRoundResult.player1Card,
                            { isPlayed: true, size: 'large' }
                        )
                    ) : matchState.opponentHasSelected ? (
                        renderCard({ element: 'unknown' }, { isHidden: true, size: 'large' })
                    ) : (
                        <div className="w-24 h-36 sm:w-28 sm:h-40 md:w-32 md:h-44 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                            <span className="text-white/30 text-xs sm:text-sm">Selecting...</span>
                        </div>
                    )}
                </div>
                
                {/* VS Indicator */}
                {(showResult || (matchState.mySelectedCard !== null && matchState.opponentHasSelected)) && (
                    <div className="text-3xl sm:text-4xl md:text-6xl font-bold text-white animate-pulse">
                        ⚔️
                    </div>
                )}
                
                {/* My Played Card */}
                <div className={`transition-all duration-500 ${showResult ? 'scale-100' : 'scale-90 opacity-70'}`}>
                    {matchState.phase === 'reveal' && matchState.lastRoundResult ? (
                        renderCard(
                            isPlayer1 ? matchState.lastRoundResult.player1Card : matchState.lastRoundResult.player2Card,
                            { isPlayed: true, size: 'large' }
                        )
                    ) : matchState.mySelectedCard !== null && matchState.myHand[matchState.mySelectedCard] ? (
                        renderCard(matchState.myHand[matchState.mySelectedCard], { isPlayed: true, size: 'large' })
                    ) : (
                        <div className="w-24 h-36 sm:w-28 sm:h-40 md:w-32 md:h-44 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                            <span className="text-white/30 text-xs sm:text-sm">Your card</span>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Round Result Toast */}
            {showResult && matchState.lastRoundResult && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-16 sm:translate-y-20 z-20 text-center animate-bounce">
                    <div className={`
                        px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-lg sm:text-2xl font-bold retro-text shadow-2xl
                        ${matchState.lastRoundResult.winner === (isPlayer1 ? 'player1' : 'player2') 
                            ? 'bg-green-500 text-white' 
                            : matchState.lastRoundResult.winner === (isPlayer1 ? 'player2' : 'player1')
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-500 text-white'}
                    `}>
                        {matchState.lastRoundResult.winner === (isPlayer1 ? 'player1' : 'player2')
                            ? '🎉 YOU WIN!'
                            : matchState.lastRoundResult.winner === 'tie'
                                ? '🤝 TIE'
                                : '😵 LOST'}
                    </div>
                </div>
            )}
            
            {/* My Hand */}
            <div className="absolute bottom-0 left-0 right-0 safe-area-bottom pb-2 sm:pb-4 z-10">
                <div className="flex gap-1.5 sm:gap-3 justify-center px-2 overflow-x-auto">
                    {matchState.myHand?.map((card, index) => (
                        <div 
                            key={card.id || index}
                            onClick={() => handleCardSelect(index)}
                            className={`
                                cursor-pointer transform transition-all duration-200 shrink-0
                                ${selectedCard === index || matchState.mySelectedCard === index ? 'scale-75 opacity-40 pointer-events-none' : ''}
                                ${animatingCard === index ? '-translate-y-6 sm:-translate-y-8' : ''}
                                ${matchState.phase !== 'select' || matchState.mySelectedCard !== null ? 'pointer-events-none opacity-50' : 'active:scale-95'}
                            `}
                        >
                            {renderCard(card, { size: 'normal' })}
                        </div>
                    ))}
                </div>
                
                {matchState.phase === 'select' && matchState.mySelectedCard === null && (
                    <p className="text-center text-white/60 text-[10px] sm:text-xs mt-2 retro-text">
                        Tap a card to play
                    </p>
                )}
            </div>
            
            {/* Rules Panel - Desktop only */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs text-white/80 hidden lg:block border border-white/10 max-w-[160px]">
                <div className="font-bold text-yellow-400 mb-2 retro-text text-[10px]">RULES</div>
                <div className="space-y-0.5 text-[10px]">
                    <p>🔥 Fire beats ❄️ Snow</p>
                    <p>❄️ Snow beats 💧 Water</p>
                    <p>💧 Water beats 🔥 Fire</p>
                </div>
                <div className="border-t border-white/20 pt-1 mt-1 text-[9px] text-white/50">
                    Win: 3 same OR 1 each
                </div>
            </div>
            
            {/* Match Complete Overlay */}
            {isComplete && (
                <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 sm:p-8 text-center max-w-sm w-full mx-4 border border-white/10 shadow-2xl">
                        <div className="text-5xl sm:text-6xl mb-4">
                            {didWin ? '🏆' : '😢'}
                        </div>
                        <h2 className="retro-text text-xl sm:text-3xl text-white mb-2">
                            {didWin ? 'VICTORY!' : 'DEFEAT'}
                        </h2>
                        <p className="text-white/60 text-sm sm:text-base mb-4">
                            {didWin 
                                ? `You defeated ${opponent.name}!` 
                                : `${opponent.name} wins...`}
                        </p>
                        <div className={`${didWin ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'} rounded-xl p-4 mb-6 border`}>
                            <p className={`${didWin ? 'text-green-400' : 'text-red-400'} text-xl sm:text-2xl retro-text`}>
                                {didWin ? `+${totalPot}` : `-${activeMatch.wagerAmount}`} 💰
                            </p>
                            <p className="text-white/50 text-xs mt-1">
                                {didWin ? 'Coins Won' : 'Coins Lost'}
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

export default P2PCardJitsu;
