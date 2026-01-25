/**
 * MemoryMatchGame - Card matching memory game with penguin theme
 * Match pairs of penguin-themed cards!
 * Responsive design for mobile portrait support
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Game constants
const CARD_ICONS = ['🐧', '🐟', '❄️', '🎣', '🏔️', '⛷️', '🦭', '🐋'];
const GRID_COLS = 4;
const GRID_ROWS = 4;

// Shuffle array
const shuffleArray = (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Create card pairs
const createCards = () => {
    const pairs = [...CARD_ICONS, ...CARD_ICONS];
    return shuffleArray(pairs).map((icon, index) => ({
        id: index,
        icon,
        flipped: false,
        matched: false
    }));
};

const MemoryMatchGame = ({ onClose }) => {
    const [cards, setCards] = useState(createCards);
    const [flippedCards, setFlippedCards] = useState([]);
    const [moves, setMoves] = useState(0);
    const [matches, setMatches] = useState(0);
    const [gameComplete, setGameComplete] = useState(false);
    const [bestMoves, setBestMoves] = useState(() => {
        const saved = localStorage.getItem('memoryMatchBestMoves');
        return saved ? parseInt(saved, 10) : Infinity;
    });
    const [timer, setTimer] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const timerRef = useRef(null);
    
    // Check for mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    // Start timer when first card is flipped
    useEffect(() => {
        if (isPlaying && !gameComplete) {
            timerRef.current = setInterval(() => {
                setTimer(t => t + 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPlaying, gameComplete]);
    
    // Handle card click
    const handleCardClick = useCallback((cardId) => {
        if (flippedCards.length === 2) return;
        if (cards[cardId].matched || cards[cardId].flipped) return;
        
        if (!isPlaying) setIsPlaying(true);
        
        // Flip the card
        setCards(prev => prev.map(card =>
            card.id === cardId ? { ...card, flipped: true } : card
        ));
        
        setFlippedCards(prev => [...prev, cardId]);
    }, [cards, flippedCards.length, isPlaying]);
    
    // Check for matches
    useEffect(() => {
        if (flippedCards.length === 2) {
            setMoves(m => m + 1);
            const [first, second] = flippedCards;
            
            if (cards[first].icon === cards[second].icon) {
                // Match found!
                setTimeout(() => {
                    setCards(prev => prev.map(card =>
                        card.id === first || card.id === second
                            ? { ...card, matched: true }
                            : card
                    ));
                    setMatches(m => m + 1);
                    setFlippedCards([]);
                }, 500);
            } else {
                // No match - flip back
                setTimeout(() => {
                    setCards(prev => prev.map(card =>
                        card.id === first || card.id === second
                            ? { ...card, flipped: false }
                            : card
                    ));
                    setFlippedCards([]);
                }, 1000);
            }
        }
    }, [flippedCards, cards]);
    
    // Check for game complete
    useEffect(() => {
        if (matches === CARD_ICONS.length) {
            setGameComplete(true);
            if (moves < bestMoves) {
                setBestMoves(moves);
                localStorage.setItem('memoryMatchBestMoves', moves.toString());
            }
        }
    }, [matches, moves, bestMoves]);
    
    // Reset game
    const resetGame = () => {
        setCards(createCards());
        setFlippedCards([]);
        setMoves(0);
        setMatches(0);
        setGameComplete(false);
        setTimer(0);
        setIsPlaying(false);
    };
    
    // Handle keyboard
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Stop propagation to prevent VoxelWorld from receiving the events
            e.stopPropagation();
            
            if (e.code === 'Escape') {
                onClose();
            }
            if (e.code === 'Space' && gameComplete) {
                e.preventDefault();
                resetGame();
            }
        };
        // Use capture phase to intercept events before they reach VoxelWorld
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [onClose, gameComplete]);
    
    // Format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 overflow-auto">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500 hover:bg-red-400 text-white text-xl sm:text-2xl font-bold shadow-lg transition-all z-20"
            >
                ✕
            </button>
            
            {/* Title - positioned above everything */}
            <div className="text-center mb-2 sm:mb-4 flex-shrink-0">
                <h1 className="text-xl sm:text-3xl font-bold text-purple-400 retro-text tracking-wider">
                    🧠 MEMORY MATCH 🐧
                </h1>
                <p className="text-white/60 text-xs sm:text-sm mt-1">
                    Best: {bestMoves === Infinity ? '--' : bestMoves} moves
                </p>
            </div>
            
            {/* Stats bar */}
            <div className="flex justify-center gap-4 sm:gap-8 mb-2 sm:mb-4 text-white flex-shrink-0">
                <div className="text-xs sm:text-sm">
                    <span className="text-purple-400">MOVES:</span> {moves}
                </div>
                <div className="text-xs sm:text-sm">
                    <span className="text-purple-400">TIME:</span> {formatTime(timer)}
                </div>
                <div className="text-xs sm:text-sm">
                    <span className="text-purple-400">PAIRS:</span> {matches}/{CARD_ICONS.length}
                </div>
            </div>
            
            {/* Game board */}
            <div className="relative p-2 sm:p-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border-4 border-purple-500/50 shadow-2xl shadow-purple-500/20">
                {/* Card grid - responsive sizing */}
                <div 
                    className="grid gap-1 sm:gap-2"
                    style={{ 
                        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                        width: isMobile ? 'min(85vw, 320px)' : '380px',
                        height: isMobile ? 'min(85vw, 320px)' : '380px'
                    }}
                >
                    {cards.map((card) => (
                        <div
                            key={card.id}
                            onClick={() => handleCardClick(card.id)}
                            className={`
                                relative cursor-pointer transition-all duration-300 transform
                                aspect-square
                                ${card.flipped || card.matched ? '' : ''}
                                active:scale-95
                            `}
                            style={{
                                perspective: '1000px',
                                transformStyle: 'preserve-3d'
                            }}
                        >
                            {/* Card back */}
                            <div
                                className={`
                                    absolute inset-0 rounded-md sm:rounded-lg flex items-center justify-center
                                    bg-gradient-to-br from-indigo-600 to-purple-700
                                    border border-purple-400/50 shadow-lg
                                    transition-opacity duration-300
                                    ${card.flipped || card.matched ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                                `}
                            >
                                <div className="text-lg sm:text-2xl">❄️</div>
                            </div>
                            
                            {/* Card front */}
                            <div
                                className={`
                                    absolute inset-0 rounded-md sm:rounded-lg flex items-center justify-center
                                    border shadow-lg
                                    transition-all duration-300
                                    ${card.matched 
                                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400' 
                                        : 'bg-gradient-to-br from-slate-100 to-slate-200 border-slate-300'
                                    }
                                    ${card.flipped || card.matched ? 'opacity-100' : 'opacity-0'}
                                `}
                            >
                                <div className={`text-2xl sm:text-3xl ${card.matched ? 'animate-bounce' : ''}`}>
                                    {card.icon}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Side decorations */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-400 to-pink-600" />
                <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-purple-400 to-pink-600" />
                
                {/* Game complete overlay */}
                {gameComplete && (
                    <div className="absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center z-10">
                        <div className="text-3xl sm:text-4xl mb-2 sm:mb-4">🎉</div>
                        <h2 className="text-xl sm:text-2xl font-bold text-green-400 mb-2 retro-text">
                            COMPLETE!
                        </h2>
                        <p className="text-white text-sm sm:text-lg mb-1">
                            {moves} moves in {formatTime(timer)}
                        </p>
                        {moves <= bestMoves && (
                            <p className="text-yellow-400 text-xs sm:text-sm mb-2 sm:mb-4">
                                ⭐ NEW BEST! ⭐
                            </p>
                        )}
                        <button
                            onClick={resetGame}
                            className="px-4 sm:px-6 py-2 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-lg shadow-lg transition-all text-sm sm:text-base"
                        >
                            PLAY AGAIN
                        </button>
                        {!isMobile && (
                            <p className="text-white/50 text-xs mt-3">or press SPACE</p>
                        )}
                    </div>
                )}
            </div>
            
            {/* Controls hint */}
            <div className="mt-2 sm:mt-4 text-center flex-shrink-0">
                <p className="text-white/60 text-xs">
                    {isMobile ? 'Tap cards to flip' : 'Click cards to flip • ESC to exit'}
                </p>
            </div>
        </div>
    );
};

export default MemoryMatchGame;
