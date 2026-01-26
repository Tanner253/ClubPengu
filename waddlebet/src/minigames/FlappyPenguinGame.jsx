/**
 * FlappyPenguinGame - High quality Flappy Bird clone with penguin theme
 * Polished canvas-based arcade game with detailed visuals
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Game constants
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const GRAVITY = 0.45;
const FLAP_STRENGTH = -9;
const PIPE_WIDTH = 65;
const PIPE_GAP = 155;
const PIPE_SPEED = 3.5;
const PIPE_SPAWN_RATE = 90;

const FlappyPenguinGame = ({ onClose }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [gameState, setGameState] = useState('ready');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('flappyPenguinHighScore');
        return saved ? parseInt(saved, 10) : 0;
    });
    
    // Game state refs
    const penguinRef = useRef({ y: GAME_HEIGHT / 2, velocity: 0 });
    const pipesRef = useRef([]);
    const particlesRef = useRef([]);
    const frameCountRef = useRef(0);
    const scoreRef = useRef(0);
    const gameStateRef = useRef('ready');
    
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);
    
    // Spawn particles for effects
    const spawnParticles = useCallback((x, y, color, count = 5) => {
        for (let i = 0; i < count; i++) {
            particlesRef.current.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30 + Math.random() * 20,
                maxLife: 30 + Math.random() * 20,
                size: 3 + Math.random() * 4,
                color
            });
        }
    }, []);
    
    // Game loop
    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const penguin = penguinRef.current;
        const pipes = pipesRef.current;
        const particles = particlesRef.current;
        const frame = frameCountRef.current;
        
        // === BACKGROUND ===
        // Night sky gradient
        const skyGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        skyGradient.addColorStop(0, '#0a0a1a');
        skyGradient.addColorStop(0.3, '#1a1a3a');
        skyGradient.addColorStop(0.6, '#2a2a5a');
        skyGradient.addColorStop(1, '#3a4a7a');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Stars (twinkling)
        for (let i = 0; i < 50; i++) {
            const sx = (i * 41 + 7) % GAME_WIDTH;
            const sy = (i * 29 + 13) % (GAME_HEIGHT * 0.6);
            const twinkle = 0.3 + Math.sin(frame * 0.05 + i) * 0.3;
            const size = 1 + (i % 3);
            ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Northern lights effect
        ctx.globalAlpha = 0.12 + Math.sin(frame * 0.015) * 0.05;
        for (let layer = 0; layer < 3; layer++) {
            const auroraGradient = ctx.createLinearGradient(0, 30 + layer * 40, GAME_WIDTH, 100 + layer * 40);
            auroraGradient.addColorStop(0, 'transparent');
            auroraGradient.addColorStop(0.2, layer === 0 ? '#00ff88' : layer === 1 ? '#00d4ff' : '#ff00ff');
            auroraGradient.addColorStop(0.5, layer === 0 ? '#00d4ff' : layer === 1 ? '#ff00ff' : '#00ff88');
            auroraGradient.addColorStop(0.8, layer === 0 ? '#ff00ff' : layer === 1 ? '#00ff88' : '#00d4ff');
            auroraGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = auroraGradient;
            
            ctx.beginPath();
            ctx.moveTo(0, 60 + layer * 30);
            for (let x = 0; x <= GAME_WIDTH; x += 15) {
                const wave = Math.sin((x + frame * (1 + layer * 0.5)) * 0.015) * 25;
                ctx.lineTo(x, 60 + layer * 30 + wave);
            }
            ctx.lineTo(GAME_WIDTH, 0);
            ctx.lineTo(0, 0);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Distant mountains silhouette
        ctx.fillStyle = 'rgba(20, 30, 50, 0.8)';
        ctx.beginPath();
        ctx.moveTo(0, GAME_HEIGHT - 100);
        for (let x = 0; x <= GAME_WIDTH; x += 50) {
            const height = 80 + Math.sin(x * 0.02) * 40 + Math.sin(x * 0.05) * 20;
            ctx.lineTo(x, GAME_HEIGHT - 100 - height);
        }
        ctx.lineTo(GAME_WIDTH, GAME_HEIGHT - 100);
        ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
        ctx.lineTo(0, GAME_HEIGHT);
        ctx.fill();
        
        // Closer mountains
        ctx.fillStyle = 'rgba(30, 40, 60, 0.9)';
        ctx.beginPath();
        ctx.moveTo(0, GAME_HEIGHT - 60);
        for (let x = 0; x <= GAME_WIDTH; x += 40) {
            const height = 50 + Math.sin(x * 0.03 + 2) * 30 + Math.sin(x * 0.07) * 15;
            ctx.lineTo(x, GAME_HEIGHT - 60 - height);
        }
        ctx.lineTo(GAME_WIDTH, GAME_HEIGHT - 60);
        ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
        ctx.lineTo(0, GAME_HEIGHT);
        ctx.fill();
        
        // Snowy ground
        const groundGradient = ctx.createLinearGradient(0, GAME_HEIGHT - 50, 0, GAME_HEIGHT);
        groundGradient.addColorStop(0, '#e8f4f8');
        groundGradient.addColorStop(0.3, '#d0e8f0');
        groundGradient.addColorStop(1, '#b8d8e8');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, GAME_HEIGHT - 50, GAME_WIDTH, 50);
        
        // Snow drifts
        ctx.fillStyle = '#f0f8ff';
        for (let i = 0; i < 8; i++) {
            const dx = (i * 60 - frame * 0.5) % (GAME_WIDTH + 40) - 20;
            ctx.beginPath();
            ctx.ellipse(dx, GAME_HEIGHT - 45, 25, 12, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // === GAME LOGIC ===
        if (gameStateRef.current === 'playing') {
            penguin.velocity += GRAVITY;
            penguin.y += penguin.velocity;
            
            // Spawn pipes
            if (frame % PIPE_SPAWN_RATE === 0) {
                const gapY = 140 + Math.random() * (GAME_HEIGHT - 320);
                pipes.push({ x: GAME_WIDTH + 20, gapY, scored: false });
            }
            
            // Update pipes
            for (let i = pipes.length - 1; i >= 0; i--) {
                pipes[i].x -= PIPE_SPEED;
                
                if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < 80) {
                    pipes[i].scored = true;
                    scoreRef.current += 1;
                    setScore(scoreRef.current);
                    spawnParticles(100, penguin.y, '#FFD700', 8);
                }
                
                if (pipes[i].x < -PIPE_WIDTH - 20) {
                    pipes.splice(i, 1);
                }
            }
            
            // Collision detection
            const hitbox = { left: 62, right: 98, top: penguin.y - 18, bottom: penguin.y + 18 };
            
            if (penguin.y > GAME_HEIGHT - 68 || penguin.y < 18) {
                gameStateRef.current = 'gameover';
                setGameState('gameover');
                spawnParticles(80, penguin.y, '#FF4444', 15);
                if (scoreRef.current > highScore) {
                    setHighScore(scoreRef.current);
                    localStorage.setItem('flappyPenguinHighScore', scoreRef.current.toString());
                }
            }
            
            if (gameStateRef.current === 'playing') {
                for (const pipe of pipes) {
                    if (hitbox.right > pipe.x && hitbox.left < pipe.x + PIPE_WIDTH) {
                        if (hitbox.top < pipe.gapY - PIPE_GAP / 2 || hitbox.bottom > pipe.gapY + PIPE_GAP / 2) {
                            gameStateRef.current = 'gameover';
                            setGameState('gameover');
                            spawnParticles(80, penguin.y, '#FF4444', 15);
                            if (scoreRef.current > highScore) {
                                setHighScore(scoreRef.current);
                                localStorage.setItem('flappyPenguinHighScore', scoreRef.current.toString());
                            }
                            break;
                        }
                    }
                }
            }
            
            if (gameStateRef.current === 'playing') frameCountRef.current++;
        }
        
        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life--;
            
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // === DRAW PIPES (ICE PILLARS) ===
        for (const pipe of pipes) {
            const topH = pipe.gapY - PIPE_GAP / 2;
            const bottomY = pipe.gapY + PIPE_GAP / 2;
            
            // Top ice pillar
            const topGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
            topGradient.addColorStop(0, '#4a90b8');
            topGradient.addColorStop(0.3, '#7ec8e8');
            topGradient.addColorStop(0.5, '#a8e0f8');
            topGradient.addColorStop(0.7, '#7ec8e8');
            topGradient.addColorStop(1, '#4a90b8');
            ctx.fillStyle = topGradient;
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topH);
            
            // Top pillar icicle cap
            ctx.fillStyle = '#5aa0c8';
            ctx.beginPath();
            ctx.moveTo(pipe.x - 8, topH);
            ctx.lineTo(pipe.x + PIPE_WIDTH + 8, topH);
            ctx.lineTo(pipe.x + PIPE_WIDTH + 5, topH + 25);
            ctx.lineTo(pipe.x - 5, topH + 25);
            ctx.fill();
            
            // Icicles hanging from top
            ctx.fillStyle = '#88d0f0';
            for (let ic = 0; ic < 4; ic++) {
                const icx = pipe.x + 8 + ic * 15;
                const icLen = 15 + Math.sin(frame * 0.05 + ic) * 3;
                ctx.beginPath();
                ctx.moveTo(icx - 4, topH + 25);
                ctx.lineTo(icx, topH + 25 + icLen);
                ctx.lineTo(icx + 4, topH + 25);
                ctx.fill();
            }
            
            // Ice shine lines on top pillar
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2;
            for (let shine = 0; shine < topH; shine += 35) {
                ctx.beginPath();
                ctx.moveTo(pipe.x + 8, shine);
                ctx.lineTo(pipe.x + 20, shine + 20);
                ctx.stroke();
            }
            
            // Bottom ice pillar
            ctx.fillStyle = topGradient;
            ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, GAME_HEIGHT - bottomY);
            
            // Bottom pillar cap
            ctx.fillStyle = '#5aa0c8';
            ctx.beginPath();
            ctx.moveTo(pipe.x - 8, bottomY);
            ctx.lineTo(pipe.x + PIPE_WIDTH + 8, bottomY);
            ctx.lineTo(pipe.x + PIPE_WIDTH + 5, bottomY - 20);
            ctx.lineTo(pipe.x - 5, bottomY - 20);
            ctx.fill();
            
            // Snow on bottom pillar cap
            ctx.fillStyle = '#f0f8ff';
            ctx.beginPath();
            ctx.ellipse(pipe.x + PIPE_WIDTH / 2, bottomY - 22, PIPE_WIDTH / 2 + 5, 8, 0, Math.PI, 0);
            ctx.fill();
        }
        
        // === DRAW PENGUIN ===
        const rotation = Math.min(Math.max(penguin.velocity * 0.05, -0.5), 0.7);
        const wingFlap = penguin.velocity < 0 ? Math.sin(frame * 0.6) * 0.4 : 0;
        
        ctx.save();
        ctx.translate(80, penguin.y);
        ctx.rotate(rotation);
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 25, 18, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Back wing
        ctx.save();
        ctx.rotate(-0.3 + wingFlap);
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.ellipse(-12, 8, 10, 16, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Body
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // White belly
        ctx.fillStyle = '#f8f8f8';
        ctx.beginPath();
        ctx.ellipse(6, 4, 14, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Belly gradient
        ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.beginPath();
        ctx.ellipse(6, 12, 10, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Front wing
        ctx.save();
        ctx.rotate(0.3 - wingFlap);
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.ellipse(-8, 6, 8, 14, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Eye white
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(10, -8, 10, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye pupil
        const pupilOffset = penguin.velocity < 0 ? -2 : penguin.velocity > 5 ? 3 : 0;
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(12, -7 + pupilOffset, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(10, -10, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Beak
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.moveTo(18, 2);
        ctx.quadraticCurveTo(32, 5, 18, 10);
        ctx.quadraticCurveTo(20, 6, 18, 2);
        ctx.fill();
        
        // Beak highlight
        ctx.fillStyle = '#f5b041';
        ctx.beginPath();
        ctx.ellipse(20, 4, 4, 2, 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Cheek blush
        ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
        ctx.beginPath();
        ctx.ellipse(15, 5, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Feet
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.ellipse(-5, 24, 6, 3, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(5, 24, 6, 3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // === UI ===
        // Score background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(GAME_WIDTH / 2 - 45, 15, 90, 50, 10);
        ctx.fill();
        
        // Score
        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(scoreRef.current.toString(), GAME_WIDTH / 2, 52);
        
        // Ready screen
        if (gameStateRef.current === 'ready') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            
            // Title box
            ctx.fillStyle = 'rgba(0, 100, 150, 0.8)';
            ctx.beginPath();
            ctx.roundRect(GAME_WIDTH / 2 - 140, GAME_HEIGHT / 2 - 100, 280, 200, 20);
            ctx.fill();
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 28px sans-serif';
            ctx.fillText('🐧 FLAPPY PENGUIN', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);
            
            ctx.fillStyle = 'white';
            ctx.font = '16px sans-serif';
            ctx.fillText('Tap or SPACE to flap!', GAME_WIDTH / 2, GAME_HEIGHT / 2);
            
            ctx.fillStyle = '#88ccff';
            ctx.font = '14px sans-serif';
            ctx.fillText('Avoid the ice pillars!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 35);
            
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`High Score: ${highScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70);
        }
        
        // Game over
        if (gameStateRef.current === 'gameover') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
        
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [highScore, spawnParticles]);
    
    const resetGame = useCallback(() => {
        penguinRef.current = { y: GAME_HEIGHT / 2, velocity: 0 };
        pipesRef.current = [];
        particlesRef.current = [];
        frameCountRef.current = 0;
        scoreRef.current = 0;
        setScore(0);
    }, []);
    
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
    
    useEffect(() => {
        const handleKeyDown = (e) => {
            e.stopPropagation();
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                handleFlap();
            }
            if (e.code === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [handleFlap, onClose]);
    
    useEffect(() => {
        animationRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationRef.current);
    }, [gameLoop]);
    
    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 w-12 h-12 rounded-full bg-red-500 hover:bg-red-400 text-white text-2xl font-bold shadow-lg z-10"
            >
                ✕
            </button>
            
            <div className="relative">
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 text-center">
                    <h1 className="text-2xl font-bold text-cyan-400">
                        🐧 FLAPPY PENGUIN 🐧
                    </h1>
                    <p className="text-white/60 text-xs mt-1">High Score: {highScore}</p>
                </div>
                
                <div className="relative p-3 bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border-2 border-cyan-500/50 shadow-2xl">
                    <canvas
                        ref={canvasRef}
                        width={GAME_WIDTH}
                        height={GAME_HEIGHT}
                        onClick={handleFlap}
                        className="rounded-lg cursor-pointer"
                    />
                    
                    {gameState === 'gameover' && (
                        <div className="absolute inset-3 bg-black/80 rounded-lg flex flex-col items-center justify-center">
                            <div className="text-5xl mb-4">💥</div>
                            <h2 className="text-3xl font-bold text-red-400 mb-4">GAME OVER</h2>
                            <div className="text-white text-xl mb-2">
                                Score: <span className="text-cyan-400 font-bold">{score}</span>
                            </div>
                            <div className="text-white/70 text-sm mb-4">
                                Best: <span className="text-yellow-400">{Math.max(score, highScore)}</span>
                            </div>
                            {score > highScore && score > 0 && (
                                <div className="text-yellow-400 text-sm mb-4 animate-pulse">
                                    ⭐ NEW HIGH SCORE! ⭐
                                </div>
                            )}
                            <button
                                onClick={handleFlap}
                                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg text-lg"
                            >
                                🔄 PLAY AGAIN
                            </button>
                            <p className="text-white/50 text-xs mt-3">or press SPACE</p>
                        </div>
                    )}
                </div>
                
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center">
                    <p className="text-white/50 text-xs">SPACE / CLICK to flap • ESC to exit</p>
                </div>
            </div>
        </div>
    );
};

export default FlappyPenguinGame;
