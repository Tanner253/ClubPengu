/**
 * P2PCardJitsu - Player vs Player Card Jitsu match
 * Real-time synchronized card game with wagering
 * Mobile-optimized with landscape support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useChallenge } from '../challenge';
import { displayTokenSymbol } from '../utils/tokenDisplay.js';

// Helper to generate Solscan link
const getSolscanLink = (txSignature) => `https://solscan.io/tx/${txSignature}`;

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
    
    // Track phase changes
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
    
    if (!activeMatch || !matchState) return null;
    
    const isPlayer1 = activeMatch.yourRole === 'player1';
    const myPlayer = isPlayer1 ? activeMatch.player1 : activeMatch.player2;
    const opponent = isPlayer1 ? activeMatch.player2 : activeMatch.player1;
    const myWins = isPlayer1 ? matchState.player1Wins : matchState.player2Wins;
    const opponentWins = isPlayer1 ? matchState.player2Wins : matchState.player1Wins;
    
    const isComplete = matchState.status === 'complete';
    const didWin = matchState.winnerId === (isPlayer1 ? activeMatch.player1.id : activeMatch.player2.id);
    const totalPot = activeMatch.wagerAmount * 2;
    const landscapeMobile = isLandscape && isMobile;
    
    // Token wager info from match result OR active match
    const matchResult = activeMatch.matchResult;
    const tokenSettlement = matchResult?.tokenSettlement;
    const wagerToken = matchResult?.wagerToken || activeMatch?.wagerToken;
    const tokenWon = didWin && wagerToken ? (tokenSettlement?.amount || wagerToken.tokenAmount * 2) : 0;
    const tokenLost = !didWin && wagerToken ? wagerToken.tokenAmount : 0;
    const solscanLink = tokenSettlement?.txSignature ? getSolscanLink(tokenSettlement.txSignature) : null;
    
    // Render a card
    const renderCard = (card, { isPlayed = false, isHidden = false, size = 'normal' } = {}) => {
        if (!card) return null;
        
        const bgGradient = {
            fire: 'from-red-500 to-orange-600',
            water: 'from-blue-500 to-cyan-600',
            snow: 'from-cyan-300 to-blue-200'
        }[card.element] || 'from-gray-600 to-gray-700';
        
        const sizeClasses = {
            tiny: 'w-12 h-16',
            small: 'w-14 h-20',
            normal: landscapeMobile ? 'w-14 h-20' : 'w-20 h-28 sm:w-24 sm:h-36',
            large: landscapeMobile ? 'w-16 h-24' : 'w-24 h-36 sm:w-28 sm:h-40'
        }[size];
        
        return (
            <div className={`
                relative ${sizeClasses} rounded-lg shadow-lg transform transition-all duration-300
                ${isHidden ? 'bg-gradient-to-br from-gray-700 to-gray-800' : `bg-gradient-to-br ${bgGradient}`}
                ${isPlayed ? 'scale-105' : 'hover:scale-105'}
                border-2 border-white/30
            `}>
                {isHidden ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className={landscapeMobile ? 'text-xl' : 'text-2xl sm:text-3xl'}>🎴</span>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-between p-1">
                        <span className={`font-bold text-white/80 uppercase ${landscapeMobile ? 'text-[8px]' : 'text-[9px] sm:text-xs'}`}>
                            {card.element}
                        </span>
                        <span className={landscapeMobile ? 'text-xl' : 'text-2xl sm:text-4xl'}>{card.emoji}</span>
                        <div className="flex gap-0.5">
                            {[...Array(Math.min(card.power || 1, 5))].map((_, i) => (
                                <div key={i} className={`${landscapeMobile ? 'w-1 h-1' : 'w-1.5 h-1.5'} bg-yellow-400 rounded-full`} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };
    
    // Render win tracker
    const renderWinTracker = (wins, compact = false) => (
        <div className={`flex ${compact ? 'gap-0.5' : 'gap-1 sm:gap-2'}`}>
            {['fire', 'water', 'snow'].map(elem => (
                <div key={elem} className={`
                    ${compact ? 'w-5 h-5' : 'w-7 h-7 sm:w-9 sm:h-9'} rounded flex items-center justify-center
                    ${wins[elem] > 0 ? 'bg-white/20' : 'bg-black/30'}
                    ${compact ? 'text-xs' : 'text-sm sm:text-base'}
                `}>
                    {wins[elem] > 0 && (
                        <span className="relative">
                            {{fire: '🔥', water: '💧', snow: '❄️'}[elem]}
                            {wins[elem] > 1 && (
                                <span className={`absolute -bottom-1 -right-1 ${compact ? 'text-[6px]' : 'text-[8px]'} bg-black/50 rounded px-0.5`}>
                                    {wins[elem]}
                                </span>
                            )}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
    
    // Landscape mobile layout
    if (landscapeMobile) {
        return (
            <div className="fixed inset-0 z-40 overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #1a0a0a 0%, #2d1515 50%, #4a2020 100%)' }}>
                
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 gap-2 z-20">
                    <button onClick={handleForfeit} className="bg-red-600 active:bg-red-700 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                        FORFEIT
                    </button>
                    <span className="text-yellow-400 text-[10px] font-bold">💰 {totalPot}</span>
                    <span className="text-white text-[10px]">Round {matchState.round}</span>
                    <span className={`text-[10px] font-bold ${matchState.turnTimeRemaining <= 10 ? 'text-red-400' : 'text-white'}`}>
                        ⏱ {matchState.turnTimeRemaining}s
                    </span>
                </div>
                
                {/* Main layout */}
                <div className="h-full flex pt-7 pb-1 px-1">
                    {/* Left: Opponent info */}
                    <div className="flex flex-col items-center justify-center w-16 shrink-0">
                        <span className="text-red-400 text-[9px] truncate max-w-[60px]">{opponent.name}</span>
                        {renderWinTracker(opponentWins, true)}
                    </div>
                    
                    {/* Center: Battle area */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        {/* Battle cards */}
                        <div className="flex items-center gap-2 mb-1">
                            {/* Opponent card */}
                            <div className={`transition-all duration-300 ${showResult ? 'scale-100' : 'scale-90 opacity-70'}`}>
                                {matchState.phase === 'reveal' && matchState.lastRoundResult ? (
                                    renderCard(isPlayer1 ? matchState.lastRoundResult.player2Card : matchState.lastRoundResult.player1Card, { isPlayed: true, size: 'small' })
                                ) : matchState.opponentHasSelected ? (
                                    renderCard({ element: 'unknown' }, { isHidden: true, size: 'small' })
                                ) : (
                                    <div className="w-14 h-20 rounded border border-dashed border-white/20 flex items-center justify-center">
                                        <span className="text-white/30 text-[8px]">...</span>
                                    </div>
                                )}
                            </div>
                            
                            {(showResult || (matchState.mySelectedCard !== null && matchState.opponentHasSelected)) && (
                                <span className="text-2xl">⚔️</span>
                            )}
                            
                            {/* Your card */}
                            <div className={`transition-all duration-300 ${showResult ? 'scale-100' : 'scale-90 opacity-70'}`}>
                                {matchState.phase === 'reveal' && matchState.lastRoundResult ? (
                                    renderCard(isPlayer1 ? matchState.lastRoundResult.player1Card : matchState.lastRoundResult.player2Card, { isPlayed: true, size: 'small' })
                                ) : matchState.mySelectedCard !== null && matchState.myHand[matchState.mySelectedCard] ? (
                                    renderCard(matchState.myHand[matchState.mySelectedCard], { isPlayed: true, size: 'small' })
                                ) : (
                                    <div className="w-14 h-20 rounded border border-dashed border-white/20 flex items-center justify-center">
                                        <span className="text-white/30 text-[8px]">Yours</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Result toast */}
                        {showResult && matchState.lastRoundResult && (
                            <div className={`px-3 py-1 rounded text-xs font-bold ${
                                matchState.lastRoundResult.winner === (isPlayer1 ? 'player1' : 'player2') 
                                    ? 'bg-green-500 text-white' 
                                    : matchState.lastRoundResult.winner === 'tie'
                                        ? 'bg-gray-500 text-white'
                                        : 'bg-red-500 text-white'
                            }`}>
                                {matchState.lastRoundResult.winner === (isPlayer1 ? 'player1' : 'player2')
                                    ? 'WIN!' : matchState.lastRoundResult.winner === 'tie' ? 'TIE' : 'LOST'}
                            </div>
                        )}
                        
                        {/* Status */}
                        {!showResult && (
                            <div className="text-[9px] text-white/60">
                                {matchState.phase === 'select' && matchState.mySelectedCard === null && 'Select a card'}
                                {matchState.phase === 'select' && matchState.mySelectedCard !== null && !matchState.opponentHasSelected && 'Waiting...'}
                            </div>
                        )}
                        
                        {/* Hand */}
                        <div className="flex gap-1 mt-1 overflow-x-auto max-w-full px-1">
                            {matchState.myHand?.map((card, index) => (
                                <div 
                                    key={card.id || index}
                                    onClick={() => handleCardSelect(index)}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onTouchEnd={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCardSelect(index);
                                    }}
                                    className={`
                                        cursor-pointer transform transition-all duration-200 shrink-0 touch-manipulation
                                        ${selectedCard === index || matchState.mySelectedCard === index ? 'scale-75 opacity-40 pointer-events-none' : ''}
                                        ${animatingCard === index ? '-translate-y-2' : ''}
                                        ${matchState.phase !== 'select' || matchState.mySelectedCard !== null ? 'pointer-events-none opacity-50' : 'active:scale-95'}
                                    `}
                                >
                                    {renderCard(card, { size: 'tiny' })}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Right: Your info */}
                    <div className="flex flex-col items-center justify-center w-16 shrink-0">
                        <span className="text-green-400 text-[9px] truncate max-w-[60px]">{myPlayer.name}</span>
                        {renderWinTracker(myWins, true)}
                    </div>
                </div>
                
                {/* Complete overlay */}
                {isComplete && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 p-2">
                        <div className="bg-gray-800 rounded-xl p-4 text-center max-w-xs w-full border border-white/10">
                            <div className="text-4xl mb-2">{didWin ? '🏆' : '😢'}</div>
                            <h2 className="text-lg font-bold text-white mb-1">
                                {didWin ? 'VICTORY!' : 'DEFEAT'}
                            </h2>
                            <div className={`${didWin ? 'text-green-400' : 'text-red-400'} text-xl font-bold mb-1`}>
                                {didWin ? `+${totalPot}` : `-${activeMatch.wagerAmount}`} 💰
                            </div>
                            {wagerToken && (
                                <div className={`${didWin ? 'text-cyan-400' : 'text-red-400'} text-lg font-bold mb-3`}>
                                    {didWin ? `+${tokenWon} ${displayTokenSymbol(tokenSettlement?.tokenSymbol || wagerToken.tokenSymbol)}` : `-${tokenLost} ${displayTokenSymbol(wagerToken.tokenSymbol)}`} 💎
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
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #1a0a0a 0%, #2d1515 50%, #4a2020 100%)' }}>
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-24 sm:h-32 bg-gradient-to-b from-black to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-24 sm:h-32 bg-gradient-to-t from-black to-transparent" />
                </div>
            </div>
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-2 sm:p-4 gap-2">
                <button onClick={handleForfeit} className="bg-red-600 active:bg-red-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold">
                    FORFEIT
                </button>
                <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                    <span className="text-yellow-400 text-[10px] sm:text-xs font-bold">💰 {totalPot}</span>
                </div>
                <div className="text-center flex-1">
                    <h1 className="text-white text-sm sm:text-xl font-bold">CARD JITSU</h1>
                    <p className="text-white/60 text-[10px] sm:text-xs">Round {matchState.round}</p>
                </div>
                <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                    <span className={`text-[10px] sm:text-xs font-bold ${matchState.turnTimeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                        ⏱ {matchState.turnTimeRemaining}s
                    </span>
                </div>
            </div>
            
            {/* Opponent */}
            <div className="absolute top-14 sm:top-20 left-2 sm:left-4 z-10">
                <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-2 mb-1">
                    <span className="text-red-400 font-bold text-xs sm:text-sm truncate block max-w-[80px] sm:max-w-[120px]">{opponent.name}</span>
                    <span className="text-white/50 text-[10px] sm:text-xs">OPPONENT</span>
                </div>
                {renderWinTracker(opponentWins)}
            </div>
            
            {/* You */}
            <div className="absolute top-14 sm:top-20 right-2 sm:right-4 z-10 text-right">
                <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-2 mb-1">
                    <span className="text-green-400 font-bold text-xs sm:text-sm truncate block max-w-[80px] sm:max-w-[120px]">{myPlayer.name}</span>
                    <span className="text-white/50 text-[10px] sm:text-xs">YOU</span>
                </div>
                <div className="flex justify-end">{renderWinTracker(myWins, true)}</div>
            </div>
            
            {/* Status */}
            <div className="absolute top-28 sm:top-36 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-black/70 border border-white/20 rounded-full px-4 py-1.5 sm:px-6 sm:py-2">
                    {matchState.phase === 'select' && matchState.mySelectedCard === null && (
                        <span className="text-yellow-400 text-xs sm:text-sm font-medium">Select a card!</span>
                    )}
                    {matchState.phase === 'select' && matchState.mySelectedCard !== null && !matchState.opponentHasSelected && (
                        <span className="text-cyan-400 text-xs sm:text-sm">Waiting for {opponent.name}...</span>
                    )}
                    {matchState.phase === 'select' && matchState.mySelectedCard !== null && matchState.opponentHasSelected && (
                        <span className="text-green-400 text-xs sm:text-sm">Revealing...</span>
                    )}
                    {matchState.phase === 'reveal' && <span className="text-white text-xs sm:text-sm">Cards revealed!</span>}
                </div>
            </div>
            
            {/* Battle Area */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4 sm:gap-8 items-center z-10">
                <div className={`transition-all duration-500 ${showResult ? 'scale-100' : 'scale-90 opacity-70'}`}>
                    {matchState.phase === 'reveal' && matchState.lastRoundResult ? (
                        renderCard(isPlayer1 ? matchState.lastRoundResult.player2Card : matchState.lastRoundResult.player1Card, { isPlayed: true, size: 'large' })
                    ) : matchState.opponentHasSelected ? (
                        renderCard({ element: 'unknown' }, { isHidden: true, size: 'large' })
                    ) : (
                        <div className="w-24 h-36 sm:w-28 sm:h-40 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                            <span className="text-white/30 text-xs sm:text-sm">Selecting...</span>
                        </div>
                    )}
                </div>
                
                {(showResult || (matchState.mySelectedCard !== null && matchState.opponentHasSelected)) && (
                    <span className="text-3xl sm:text-5xl animate-pulse">⚔️</span>
                )}
                
                <div className={`transition-all duration-500 ${showResult ? 'scale-100' : 'scale-90 opacity-70'}`}>
                    {matchState.phase === 'reveal' && matchState.lastRoundResult ? (
                        renderCard(isPlayer1 ? matchState.lastRoundResult.player1Card : matchState.lastRoundResult.player2Card, { isPlayed: true, size: 'large' })
                    ) : matchState.mySelectedCard !== null && matchState.myHand[matchState.mySelectedCard] ? (
                        renderCard(matchState.myHand[matchState.mySelectedCard], { isPlayed: true, size: 'large' })
                    ) : (
                        <div className="w-24 h-36 sm:w-28 sm:h-40 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                            <span className="text-white/30 text-xs sm:text-sm">Your card</span>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Result toast */}
            {showResult && matchState.lastRoundResult && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16 sm:translate-y-20 z-20 text-center animate-bounce">
                    <div className={`px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-lg sm:text-2xl font-bold shadow-2xl ${
                        matchState.lastRoundResult.winner === (isPlayer1 ? 'player1' : 'player2') 
                            ? 'bg-green-500 text-white' 
                            : matchState.lastRoundResult.winner === 'tie'
                                ? 'bg-gray-500 text-white'
                                : 'bg-red-500 text-white'
                    }`}>
                        {matchState.lastRoundResult.winner === (isPlayer1 ? 'player1' : 'player2')
                            ? '🎉 YOU WIN!' : matchState.lastRoundResult.winner === 'tie' ? '🤝 TIE' : '😵 LOST'}
                    </div>
                </div>
            )}
            
            {/* Hand */}
            <div className="absolute bottom-0 left-0 right-0 pb-2 sm:pb-4 z-10">
                <div className="flex gap-1.5 sm:gap-3 justify-center px-2 overflow-x-auto">
                    {matchState.myHand?.map((card, index) => (
                        <div 
                            key={card.id || index}
                            onClick={() => handleCardSelect(index)}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCardSelect(index);
                            }}
                            className={`
                                cursor-pointer transform transition-all duration-200 shrink-0 touch-manipulation
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
                    <p className="text-center text-white/60 text-[10px] sm:text-xs mt-2">Tap a card to play</p>
                )}
            </div>
            
            {/* Complete overlay */}
            {isComplete && (
                <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 sm:p-8 text-center max-w-sm w-full border border-white/10 shadow-2xl">
                        <div className="text-5xl sm:text-6xl mb-4">{didWin ? '🏆' : '😢'}</div>
                        <h2 className="text-xl sm:text-3xl font-bold text-white mb-2">
                            {didWin ? 'VICTORY!' : 'DEFEAT'}
                        </h2>
                        <p className="text-white/60 text-sm mb-4">
                            {didWin ? `You defeated ${opponent.name}!` : `${opponent.name} wins...`}
                        </p>
                        <div className={`${didWin ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'} rounded-xl p-4 mb-4 border`}>
                            <p className={`${didWin ? 'text-green-400' : 'text-red-400'} text-xl sm:text-2xl font-bold`}>
                                {didWin ? `+${totalPot}` : `-${activeMatch.wagerAmount}`} 💰
                            </p>
                            {wagerToken && (
                                <p className={`${didWin ? 'text-cyan-400' : 'text-red-400'} text-lg font-bold mt-2`}>
                                    {didWin ? `+${tokenWon} ${displayTokenSymbol(tokenSettlement?.tokenSymbol || wagerToken.tokenSymbol)}` : `-${tokenLost} ${displayTokenSymbol(wagerToken.tokenSymbol)}`} 💎
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

export default P2PCardJitsu;
