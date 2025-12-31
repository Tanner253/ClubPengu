import React, { useState, useEffect, useRef, useCallback } from 'react';
import CardJitsuGame from './CardJitsuGame';
import GameManager from '../engine/GameManager';
import { useMultiplayer } from '../multiplayer';

/**
 * Card Jitsu - The Dojo card battle minigame
 * Fire beats Snow, Snow beats Water, Water beats Fire
 * Server-authoritative rewards for authenticated users
 */
const CardJitsu = ({ playerData, onExit }) => {
    const { send, isAuthenticated } = useMultiplayer();
    
    // Pass server send function to game for rewards
    const [game] = useState(() => new CardJitsuGame({
        serverSend: isAuthenticated ? send : null
    }));
    const [gameState, setGameState] = useState(null);
    const [selectedCard, setSelectedCard] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [battleResult, setBattleResult] = useState(null);
    const [coins, setCoins] = useState(GameManager.getInstance().getCoins());
    const [gameOver, setGameOver] = useState(null);
    const [animatingCard, setAnimatingCard] = useState(null);
    
    const canvasRef = useRef(null);
    
    // Initialize game
    useEffect(() => {
        game.start();
        setGameState(game.getState());
        
        // Listen for coin changes
        const unsubscribe = GameManager.getInstance().on('coinsChanged', (data) => {
            setCoins(data.coins);
        });
        
        return () => unsubscribe();
    }, [game]);
    
    // Handle card selection
    const handleCardSelect = useCallback((index) => {
        if (game.phase !== 'select' || showResult || gameOver) return;
        
        setSelectedCard(index);
        setAnimatingCard(index);
        
        // Delay for animation
        setTimeout(() => {
            const result = game.selectCard(index);
            if (result) {
                setGameState(game.getState());
                
                // Show reveal animation
                setTimeout(() => {
                    const battleResult = game.resolveBattle();
                    setBattleResult(battleResult);
                    setShowResult(true);
                    setGameState(game.getState());
                    
                    if (battleResult?.gameResult) {
                        setTimeout(() => {
                            // Clear round result before showing game over to prevent overlap
                            setShowResult(false);
                            setBattleResult(null);
                            setGameOver({
                                won: battleResult.gameResult === 'player',
                                coins: battleResult.gameResult === 'player' 
                                    ? game.baseReward + game.winBonus 
                                    : game.baseReward
                            });
                        }, 2000);
                    }
                }, 1000);
            }
            setAnimatingCard(null);
        }, 300);
    }, [game, showResult, gameOver]);
    
    // Continue to next round
    const handleContinue = useCallback(() => {
        // Don't continue if game is already over
        if (gameOver) return;
        
        setShowResult(false);
        setBattleResult(null);
        setSelectedCard(null);
        game.nextPhase();
        setGameState(game.getState());
    }, [game, gameOver]);
    
    // Restart game
    const handleRestart = useCallback(() => {
        game.reset();
        game.start();
        setGameState(game.getState());
        setGameOver(null);
        setShowResult(false);
        setBattleResult(null);
    }, [game]);
    
    // Render card
    const renderCard = (card, isOpponent = false, isPlayed = false) => {
        if (!card) return null;
        
        const bgGradient = {
            fire: 'from-red-500 to-orange-600',
            water: 'from-blue-500 to-cyan-600',
            snow: 'from-cyan-300 to-blue-200'
        }[card.element];
        
        return (
            <div 
                className={`
                    relative w-24 h-36 md:w-32 md:h-44 rounded-xl shadow-lg transform transition-all duration-300
                    bg-gradient-to-br ${bgGradient}
                    ${isPlayed ? 'scale-110' : 'hover:scale-105 hover:-translate-y-2'}
                    ${isOpponent && !showResult ? 'bg-gray-700' : ''}
                    border-4 border-white/30
                `}
            >
                {(isOpponent && !showResult) ? (
                    // Card back
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-4xl">🎴</div>
                    </div>
                ) : (
                    // Card front
                    <div className="w-full h-full flex flex-col items-center justify-between p-2">
                        <div className="text-xs font-bold text-white/80 uppercase tracking-wider">
                            {card.element}
                        </div>
                        <div className="text-5xl md:text-6xl">{card.emoji}</div>
                        <div className="flex items-center gap-1">
                            {[...Array(card.power)].map((_, i) => (
                                <div key={i} className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full shadow" />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };
    
    // Render win tracker
    const renderWinTracker = (wins, label) => (
        <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-white/60 uppercase">{label}</span>
            <div className="flex gap-2">
                {['fire', 'water', 'snow'].map(elem => (
                    <div 
                        key={elem}
                        className={`
                            w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-lg
                            ${wins[elem] > 0 ? 'bg-white/20' : 'bg-black/30'}
                            transition-all
                        `}
                    >
                        {wins[elem] > 0 && (
                            <span>
                                {{fire: '🔥', water: '💧', snow: '❄️'}[elem]}
                                {wins[elem] > 1 && <sub className="text-xs">{wins[elem]}</sub>}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
    
    if (!gameState) return null;
    
    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* Dojo Background */}
            <div 
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(180deg, #1a0a0a 0%, #2d1515 50%, #4a2020 100%)'
                }}
            >
                {/* Japanese-style decorations */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent" />
                </div>
                
                {/* Decorative elements */}
                <div className="absolute top-4 left-4 text-4xl opacity-30">🏯</div>
                <div className="absolute top-4 right-4 text-4xl opacity-30">⛩️</div>
                <div className="absolute bottom-4 left-4 text-2xl opacity-20">🎋</div>
                <div className="absolute bottom-4 right-4 text-2xl opacity-20">🎋</div>
            </div>
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onExit}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg retro-text text-xs"
                    >
                        EXIT DOJO
                    </button>
                    <div className="bg-black/50 rounded-lg px-4 py-2">
                        <span className="text-yellow-400 retro-text text-xs">💰 {coins}</span>
                    </div>
                </div>
                
                <div className="text-center">
                    <h1 className="retro-text text-xl md:text-2xl text-white" style={{textShadow: '2px 2px 0 #000'}}>
                        CARD JITSU
                    </h1>
                    <p className="text-white/60 text-xs">Round {gameState.round}</p>
                </div>
                
                <div className="bg-black/50 rounded-lg px-4 py-2">
                    <span className="text-white retro-text text-xs">Score: {gameState.score}</span>
                </div>
            </div>
            
            {/* Win Trackers */}
            <div className="absolute top-20 left-4 z-10">
                {renderWinTracker(gameState.opponentWins, 'Sensei')}
            </div>
            <div className="absolute top-20 right-4 z-10">
                {renderWinTracker(gameState.playerWins, 'You')}
            </div>

            {/* How to Play */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-xs text-white/80 max-w-lg shadow-lg">
                    <div className="flex flex-wrap gap-3 items-center justify-center">
                        <span className="retro-text text-yellow-300 text-[10px] tracking-wide">HOW TO PLAY</span>
                        <span>🔥 beats ❄️</span>
                        <span>❄️ beats 💧</span>
                        <span>💧 beats 🔥</span>
                        <span className="text-white/60">Win with 3 of same element or 1 of each</span>
                    </div>
                </div>
            </div>
            
            {/* Battle Area */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-8 md:gap-16 items-center z-10">
                {/* Opponent Card */}
                <div className={`transition-all duration-500 ${showResult ? 'scale-100' : 'scale-90 opacity-70'}`}>
                    {(gameState.opponentCard || showResult) && renderCard(gameState.opponentCard, true, true)}
                </div>
                
                {/* VS */}
                {showResult && (
                    <div className="text-4xl md:text-6xl font-bold text-white animate-pulse">
                        ⚔️
                    </div>
                )}
                
                {/* Player Card */}
                <div className={`transition-all duration-500 ${showResult ? 'scale-100' : 'scale-90 opacity-70'}`}>
                    {gameState.playerCard && renderCard(gameState.playerCard, false, true)}
                </div>
            </div>
            
            {/* Result Overlay */}
            {showResult && battleResult && !gameOver && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-16 z-20 text-center animate-bounce">
                    <div className={`
                        px-8 py-4 rounded-xl text-2xl md:text-3xl font-bold retro-text
                        ${battleResult.result === 'player' ? 'bg-green-500 text-white' : 
                          battleResult.result === 'opponent' ? 'bg-red-500 text-white' : 
                          'bg-gray-500 text-white'}
                    `}>
                        {battleResult.result === 'player' ? '🎉 YOU WIN!' : 
                         battleResult.result === 'opponent' ? '😵 YOU LOSE' : 
                         '🤝 TIE'}
                    </div>
                    {/* Hide continue button if game is ending (gameResult exists) */}
                    {!battleResult.gameResult && (
                        <button 
                            onClick={handleContinue}
                            className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 rounded-lg retro-text text-sm"
                        >
                            CONTINUE →
                        </button>
                    )}
                    {battleResult.gameResult && (
                        <p className="mt-4 text-white/80 text-sm retro-text animate-pulse">
                            {battleResult.gameResult === 'player' ? '🏆 Victory incoming...' : '💔 Defeat incoming...'}
                        </p>
                    )}
                </div>
            )}
            
            {/* Player Hand */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="flex gap-2 md:gap-4 justify-center">
                    {gameState.playerHand.map((card, index) => (
                        <div 
                            key={card.id}
                            onClick={() => handleCardSelect(index)}
                            className={`
                                cursor-pointer transform transition-all duration-200
                                ${selectedCard === index ? 'scale-90 opacity-50' : ''}
                                ${animatingCard === index ? '-translate-y-8' : ''}
                                ${game.phase !== 'select' || showResult ? 'pointer-events-none opacity-50' : ''}
                            `}
                        >
                            {renderCard(card)}
                        </div>
                    ))}
                </div>
                
                {/* Instructions */}
                {game.phase === 'select' && !showResult && (
                    <p className="text-center text-white/60 text-xs mt-2 retro-text">
                        Select a card to play
                    </p>
                )}
            </div>
            
            {/* How to Play Panel */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs text-white/80 hidden md:block border border-white/10">
                <div className="font-bold text-yellow-400 mb-2 retro-text">HOW TO WIN</div>
                <div className="space-y-1 mb-2">
                    <p>🔥 Fire beats ❄️ Snow</p>
                    <p>❄️ Snow beats 💧 Water</p>
                    <p>💧 Water beats 🔥 Fire</p>
                </div>
                <div className="border-t border-white/20 pt-2 mt-2 text-[10px] text-white/60">
                    <p>• Win with 3 of same element</p>
                    <p>• OR 1 of each element</p>
                    <p>• Higher power wins ties</p>
                </div>
            </div>
            
            {/* Game Over Screen */}
            {gameOver && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 animate-fade-in">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 text-center max-w-md mx-4">
                        <div className="text-6xl mb-4">
                            {gameOver.won ? '🏆' : '😢'}
                        </div>
                        <h2 className="retro-text text-2xl md:text-3xl text-white mb-2">
                            {gameOver.won ? 'VICTORY!' : 'DEFEAT'}
                        </h2>
                        <p className="text-white/70 mb-4">
                            {gameOver.won 
                                ? 'You have mastered the elements!' 
                                : 'The Sensei was too powerful...'}
                        </p>
                        <div className="bg-yellow-500/20 rounded-lg p-4 mb-6">
                            <p className="text-yellow-400 text-lg retro-text">
                                +{gameOver.coins} 💰
                            </p>
                            <p className="text-white/60 text-xs">Coins Earned</p>
                        </div>
                        <div className="flex gap-4 justify-center">
                            <button 
                                onClick={handleRestart}
                                className="bg-green-500 hover:bg-green-400 text-white px-6 py-3 rounded-lg retro-text text-sm"
                            >
                                PLAY AGAIN
                            </button>
                            <button 
                                onClick={onExit}
                                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg retro-text text-sm"
                            >
                                EXIT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CardJitsu;

