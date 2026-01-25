/**
 * FlappyPenguinGame - Flappy Bird clone with penguin theme
 * Simple canvas-based arcade game
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Game constants
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const GRAVITY = 0.4;
const FLAP_STRENGTH = -8;
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 100; // frames between pipes

const FlappyPenguinGame = ({ onClose }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [gameState, setGameState] = useState('ready'); // 'ready', 'playing', 'gameover'
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('flappyPenguinHighScore');
        return saved ? parseInt(saved, 10) : 0;
    });
    
    // Game state refs
    const penguinRef = useRef({ y: GAME_HEIGHT / 2, velocity: 0 });
    const pipesRef = useRef([]);
    const frameCountRef = useRef(0);
    const scoreRef = useRef(0);
    const gameStateRef = useRef('ready');
    
    // Sync gameState to ref
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);
    
    // Draw penguin (pixel art style)
    const drawPenguin = useCallback((ctx, y, rotation = 0) => {
        ctx.save();
        ctx.translate(80, y);
        ctx.rotate(Math.min(Math.max(rotation, -0.5), 0.8));
        
        // Body (black oval)
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Belly (white)
        ctx.fillStyle = '#f0f0f0';
        ctx.beginPath();
        ctx.ellipse(5, 3, 12, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(8, -8, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(10, -8, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Beak
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(28, 3);
        ctx.lineTo(15, 8);
        ctx.closePath();
        ctx.fill();
        
        // Wing
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.ellipse(-10, 5, 8, 12, -0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }, []);
    
    // Draw pipe (ice/snow themed)
    const drawPipe = useCallback((ctx, x, gapY) => {
        const gradient = ctx.createLinearGradient(x, 0, x + PIPE_WIDTH, 0);
        gradient.addColorStop(0, '#5dade2');
        gradient.addColorStop(0.5, '#85c1e9');
        gradient.addColorStop(1, '#5dade2');
        
        ctx.fillStyle = gradient;
        
        // Top pipe
        ctx.fillRect(x, 0, PIPE_WIDTH, gapY - PIPE_GAP / 2);
        
        // Top pipe cap
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x - 5, gapY - PIPE_GAP / 2 - 20, PIPE_WIDTH + 10, 20);
        
        // Ice texture lines on top pipe
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 20; i < gapY - PIPE_GAP / 2; i += 30) {
            ctx.beginPath();
            ctx.moveTo(x + 10, i);
            ctx.lineTo(x + PIPE_WIDTH - 10, i + 15);
            ctx.stroke();
        }
        
        // Bottom pipe
        ctx.fillStyle = gradient;
        ctx.fillRect(x, gapY + PIPE_GAP / 2, PIPE_WIDTH, GAME_HEIGHT - gapY - PIPE_GAP / 2);
        
        // Bottom pipe cap
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x - 5, gapY + PIPE_GAP / 2, PIPE_WIDTH + 10, 20);
        
        // Ice texture lines on bottom pipe
        for (let i = gapY + PIPE_GAP / 2 + 40; i < GAME_HEIGHT; i += 30) {
            ctx.beginPath();
            ctx.moveTo(x + 10, i);
            ctx.lineTo(x + PIPE_WIDTH - 10, i + 15);
            ctx.stroke();
        }
    }, []);
    
    // Draw background
    const drawBackground = useCallback((ctx, frame) => {
        // Sky gradient
        const skyGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        skyGradient.addColorStop(0, '#1a1a2e');
        skyGradient.addColorStop(0.5, '#16213e');
        skyGradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Stars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 30; i++) {
            const x = (i * 37 + frame * 0.1) % GAME_WIDTH;
            const y = (i * 23) % (GAME_HEIGHT * 0.6);
            const size = 1 + (i % 3);
            ctx.fillRect(x, y, size, size);
        }
        
        // Aurora borealis effect
        ctx.globalAlpha = 0.15 + Math.sin(frame * 0.02) * 0.05;
        const auroraGradient = ctx.createLinearGradient(0, 50, GAME_WIDTH, 150);
        auroraGradient.addColorStop(0, 'transparent');
        auroraGradient.addColorStop(0.3, '#00ff88');
        auroraGradient.addColorStop(0.6, '#00d4ff');
        auroraGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = auroraGradient;
        
        ctx.beginPath();
        ctx.moveTo(0, 80);
        for (let x = 0; x <= GAME_WIDTH; x += 20) {
            ctx.lineTo(x, 80 + Math.sin((x + frame) * 0.02) * 30);
        }
        ctx.lineTo(GAME_WIDTH, 0);
        ctx.lineTo(0, 0);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Ground (snow)
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(0, GAME_HEIGHT - 40, GAME_WIDTH, 40);
        
        // Snow texture
        ctx.fillStyle = '#bdc3c7';
        for (let x = 0; x < GAME_WIDTH; x += 20) {
            ctx.beginPath();
            ctx.arc(x + 10, GAME_HEIGHT - 30, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }, []);
    
    // Game loop
    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const penguin = penguinRef.current;
        const pipes = pipesRef.current;
        const frame = frameCountRef.current;
        
        // Clear and draw background
        drawBackground(ctx, frame);
        
        if (gameStateRef.current === 'playing') {
            // Update penguin physics
            penguin.velocity += GRAVITY;
            penguin.y += penguin.velocity;
            
            // Spawn pipes
            if (frame % PIPE_SPAWN_RATE === 0) {
                const gapY = 150 + Math.random() * (GAME_HEIGHT - 300);
                pipes.push({ x: GAME_WIDTH, gapY, scored: false });
            }
            
            // Update pipes
            for (let i = pipes.length - 1; i >= 0; i--) {
                pipes[i].x -= PIPE_SPEED;
                
                // Check scoring
                if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < 80) {
                    pipes[i].scored = true;
                    scoreRef.current += 1;
                    setScore(scoreRef.current);
                }
                
                // Remove off-screen pipes
                if (pipes[i].x < -PIPE_WIDTH) {
                    pipes.splice(i, 1);
                }
            }
            
            // Collision detection
            const penguinBox = {
                left: 60,
                right: 100,
                top: penguin.y - 20,
                bottom: penguin.y + 20
            };
            
            // Ground/ceiling collision
            if (penguin.y > GAME_HEIGHT - 60 || penguin.y < 20) {
                gameStateRef.current = 'gameover'; // Update ref immediately
                setGameState('gameover');
                if (scoreRef.current > highScore) {
                    setHighScore(scoreRef.current);
                    localStorage.setItem('flappyPenguinHighScore', scoreRef.current.toString());
                }
            }
            
            // Pipe collision
            if (gameStateRef.current === 'playing') {
                for (const pipe of pipes) {
                    if (penguinBox.right > pipe.x && penguinBox.left < pipe.x + PIPE_WIDTH) {
                        if (penguinBox.top < pipe.gapY - PIPE_GAP / 2 || 
                            penguinBox.bottom > pipe.gapY + PIPE_GAP / 2) {
                            gameStateRef.current = 'gameover'; // Update ref immediately
                            setGameState('gameover');
                            if (scoreRef.current > highScore) {
                                setHighScore(scoreRef.current);
                                localStorage.setItem('flappyPenguinHighScore', scoreRef.current.toString());
                            }
                            break;
                        }
                    }
                }
            }
            
            if (gameStateRef.current === 'playing') {
                frameCountRef.current++;
            }
        }
        
        // Draw pipes
        for (const pipe of pipes) {
            drawPipe(ctx, pipe.x, pipe.gapY);
        }
        
        // Draw penguin with rotation based on velocity
        const rotation = penguin.velocity * 0.05;
        drawPenguin(ctx, penguin.y, rotation);
        
        // Draw score
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(scoreRef.current.toString(), GAME_WIDTH / 2, 70);
        ctx.shadowBlur = 0;
        
        // Ready state prompt
        if (gameStateRef.current === 'ready') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, GAME_HEIGHT / 2 - 60, GAME_WIDTH, 120);
            
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 24px "Press Start 2P", monospace';
            ctx.fillText('FLAPPY PENGUIN', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
            
            ctx.fillStyle = 'white';
            ctx.font = '14px "Press Start 2P", monospace';
            ctx.fillText('CLICK OR SPACE TO START', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
        }
        
        // Game over state - just dim the screen, React overlay handles the rest
        if (gameStateRef.current === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
        
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [drawBackground, drawPipe, drawPenguin, highScore]);
    
    // Full game reset function
    const resetGame = useCallback(() => {
        penguinRef.current = { y: GAME_HEIGHT / 2, velocity: 0 };
        pipesRef.current = [];
        frameCountRef.current = 0;
        scoreRef.current = 0;
        setScore(0);
    }, []);
    
    // Handle input
    const handleFlap = useCallback(() => {
        if (gameStateRef.current === 'ready') {
            resetGame();
            setGameState('playing');
        } else if (gameStateRef.current === 'playing') {
            penguinRef.current.velocity = FLAP_STRENGTH;
        } else if (gameStateRef.current === 'gameover') {
            resetGame();
            setGameState('ready');
        }
    }, [resetGame]);
    
    // Setup event listeners
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Stop propagation to prevent VoxelWorld from receiving the events
            e.stopPropagation();
            
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                handleFlap();
            }
            if (e.code === 'Escape') {
                onClose();
            }
        };
        
        // Use capture phase to intercept events before they reach VoxelWorld
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [handleFlap, onClose]);
    
    // Start game loop
    useEffect(() => {
        animationRef.current = requestAnimationFrame(gameLoop);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [gameLoop]);
    
    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 w-12 h-12 rounded-full bg-red-500 hover:bg-red-400 text-white text-2xl font-bold shadow-lg transition-all z-10"
            >
                ✕
            </button>
            
            {/* Game container */}
            <div className="relative">
                {/* Title */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-center">
                    <h1 className="text-3xl font-bold text-cyan-400 retro-text tracking-wider">
                        🐧 FLAPPY PENGUIN 🐧
                    </h1>
                    <p className="text-white/60 text-sm mt-1">High Score: {highScore}</p>
                </div>
                
                {/* Canvas with arcade cabinet frame */}
                <div className="relative p-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border-4 border-cyan-500/50 shadow-2xl shadow-cyan-500/20">
                    <canvas
                        ref={canvasRef}
                        width={GAME_WIDTH}
                        height={GAME_HEIGHT}
                        onClick={handleFlap}
                        className="rounded cursor-pointer"
                        style={{ imageRendering: 'pixelated' }}
                    />
                    
                    {/* Side decorations */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-blue-600" />
                    <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-blue-600" />
                    
                    {/* Game Over Overlay */}
                    {gameState === 'gameover' && (
                        <div className="absolute inset-4 bg-black/80 rounded flex flex-col items-center justify-center z-10">
                            <div className="text-5xl mb-4">💥</div>
                            <h2 className="text-3xl font-bold text-red-400 mb-4 retro-text">
                                GAME OVER
                            </h2>
                            <div className="text-white text-xl mb-2">
                                Score: <span className="text-cyan-400 font-bold">{score}</span>
                            </div>
                            <div className="text-white/70 text-sm mb-6">
                                Best: <span className="text-yellow-400">{Math.max(score, highScore)}</span>
                            </div>
                            {score > highScore && score > 0 && (
                                <div className="text-yellow-400 text-sm mb-4 animate-pulse">
                                    ⭐ NEW HIGH SCORE! ⭐
                                </div>
                            )}
                            <button
                                onClick={handleFlap}
                                className="px-8 py-3 bg-gradient-to-b from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg transition-all text-lg"
                            >
                                🔄 PLAY AGAIN
                            </button>
                            <p className="text-white/50 text-xs mt-4">or press SPACE</p>
                        </div>
                    )}
                </div>
                
                {/* Controls hint */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center">
                    <p className="text-white/60 text-xs">
                        SPACE / CLICK to flap • ESC to exit
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FlappyPenguinGame;

