/**
 * SnakeGame - High quality Snake game with penguin/arctic theme
 * Polished canvas-based arcade game with detailed visuals
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Game constants
const GAME_SIZE = 440;
const GRID_SIZE = 22;
const CELL_SIZE = GAME_SIZE / GRID_SIZE;
const INITIAL_SPEED = 140;
const SPEED_INCREASE = 4;
const MIN_SPEED = 55;

const SnakeGame = ({ onClose }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const lastMoveRef = useRef(0);
    const [gameState, setGameState] = useState('ready');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('snakeGameHighScore');
        return saved ? parseInt(saved, 10) : 0;
    });
    
    // Game state refs
    const snakeRef = useRef([{ x: 11, y: 11 }]);
    const directionRef = useRef({ x: 1, y: 0 });
    const nextDirectionRef = useRef({ x: 1, y: 0 });
    const foodRef = useRef({ x: 16, y: 11 });
    const speedRef = useRef(INITIAL_SPEED);
    const scoreRef = useRef(0);
    const gameStateRef = useRef('ready');
    const frameRef = useRef(0);
    const particlesRef = useRef([]);
    const trailRef = useRef([]);
    
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);
    
    // Spawn food at random position
    const spawnFood = useCallback(() => {
        const snake = snakeRef.current;
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
        } while (snake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
        foodRef.current = newFood;
    }, []);
    
    // Spawn particles
    const spawnParticles = useCallback((x, y, color, count = 8) => {
        for (let i = 0; i < count; i++) {
            particlesRef.current.push({
                x: x * CELL_SIZE + CELL_SIZE / 2,
                y: y * CELL_SIZE + CELL_SIZE / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 25 + Math.random() * 15,
                maxLife: 25 + Math.random() * 15,
                size: 3 + Math.random() * 4,
                color
            });
        }
    }, []);
    
    // Game loop
    const gameLoop = useCallback((timestamp) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const frame = frameRef.current++;
        const particles = particlesRef.current;
        
        // === BACKGROUND ===
        // Deep ocean/ice gradient
        const bgGradient = ctx.createRadialGradient(
            GAME_SIZE / 2, GAME_SIZE / 2, 0,
            GAME_SIZE / 2, GAME_SIZE / 2, GAME_SIZE * 0.8
        );
        bgGradient.addColorStop(0, '#0d3d56');
        bgGradient.addColorStop(0.5, '#0a2d42');
        bgGradient.addColorStop(1, '#061a2a');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, GAME_SIZE, GAME_SIZE);
        
        // Underwater caustics effect
        ctx.globalAlpha = 0.08;
        for (let i = 0; i < 8; i++) {
            const cx = (Math.sin(frame * 0.01 + i * 0.8) + 1) * GAME_SIZE / 2;
            const cy = (Math.cos(frame * 0.012 + i * 0.9) + 1) * GAME_SIZE / 2;
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
            gradient.addColorStop(0, '#4ecdc4');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, GAME_SIZE, GAME_SIZE);
        }
        ctx.globalAlpha = 1;
        
        // Subtle grid (ice crack pattern)
        ctx.strokeStyle = 'rgba(100, 180, 200, 0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
            // Vertical lines with slight wave
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            for (let y = 0; y <= GAME_SIZE; y += 20) {
                const wobble = Math.sin(y * 0.05 + i) * 2;
                ctx.lineTo(i * CELL_SIZE + wobble, y);
            }
            ctx.stroke();
            
            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            for (let x = 0; x <= GAME_SIZE; x += 20) {
                const wobble = Math.sin(x * 0.05 + i) * 2;
                ctx.lineTo(x, i * CELL_SIZE + wobble);
            }
            ctx.stroke();
        }
        
        // Floating bubbles in background
        ctx.fillStyle = 'rgba(150, 220, 255, 0.15)';
        for (let i = 0; i < 15; i++) {
            const bx = (i * 37 + frame * 0.2) % GAME_SIZE;
            const by = (GAME_SIZE - (i * 43 + frame * 0.5) % (GAME_SIZE + 20));
            const size = 3 + (i % 4);
            ctx.beginPath();
            ctx.arc(bx, by, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // === GAME LOGIC ===
        if (gameStateRef.current === 'playing') {
            if (timestamp - lastMoveRef.current >= speedRef.current) {
                lastMoveRef.current = timestamp;
                
                directionRef.current = nextDirectionRef.current;
                
                const snake = snakeRef.current;
                const head = snake[0];
                const dir = directionRef.current;
                
                // Add trail
                trailRef.current.push({
                    x: head.x * CELL_SIZE + CELL_SIZE / 2,
                    y: head.y * CELL_SIZE + CELL_SIZE / 2,
                    life: 15
                });
                if (trailRef.current.length > 30) trailRef.current.shift();
                
                const newHead = {
                    x: head.x + dir.x,
                    y: head.y + dir.y
                };
                
                // Wall collision
                if (newHead.x < 0 || newHead.x >= GRID_SIZE || 
                    newHead.y < 0 || newHead.y >= GRID_SIZE) {
                    setGameState('gameover');
                    spawnParticles(head.x, head.y, '#ff4444', 15);
                    if (scoreRef.current > highScore) {
                        setHighScore(scoreRef.current);
                        localStorage.setItem('snakeGameHighScore', scoreRef.current.toString());
                    }
                    animationRef.current = requestAnimationFrame(gameLoop);
                    return;
                }
                
                // Self collision
                if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
                    setGameState('gameover');
                    spawnParticles(head.x, head.y, '#ff4444', 15);
                    if (scoreRef.current > highScore) {
                        setHighScore(scoreRef.current);
                        localStorage.setItem('snakeGameHighScore', scoreRef.current.toString());
                    }
                    animationRef.current = requestAnimationFrame(gameLoop);
                    return;
                }
                
                snake.unshift(newHead);
                
                // Food collision
                const food = foodRef.current;
                if (newHead.x === food.x && newHead.y === food.y) {
                    scoreRef.current += 10;
                    setScore(scoreRef.current);
                    speedRef.current = Math.max(MIN_SPEED, speedRef.current - SPEED_INCREASE);
                    spawnParticles(food.x, food.y, '#FFD700', 12);
                    spawnFood();
                } else {
                    snake.pop();
                }
                
                snakeRef.current = snake;
            }
        }
        
        // Update trail
        for (let i = trailRef.current.length - 1; i >= 0; i--) {
            trailRef.current[i].life--;
            if (trailRef.current[i].life <= 0) {
                trailRef.current.splice(i, 1);
            }
        }
        
        // Draw trail
        for (const t of trailRef.current) {
            const alpha = t.life / 15 * 0.3;
            ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.vx *= 0.98;
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
        
        // === DRAW FOOD (GOLDEN FISH) ===
        const food = foodRef.current;
        const foodX = food.x * CELL_SIZE + CELL_SIZE / 2;
        const foodY = food.y * CELL_SIZE + CELL_SIZE / 2;
        const wobble = Math.sin(frame * 0.1) * 3;
        const fishScale = 1 + Math.sin(frame * 0.15) * 0.1;
        
        // Food glow
        const glowGradient = ctx.createRadialGradient(foodX + wobble, foodY, 0, foodX + wobble, foodY, 25);
        glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
        glowGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.15)');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(foodX + wobble, foodY, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.save();
        ctx.translate(foodX + wobble, foodY);
        ctx.scale(fishScale, fishScale);
        
        // Fish body
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Fish gradient overlay
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.ellipse(2, 2, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tail
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(-16, -7);
        ctx.lineTo(-16, 7);
        ctx.closePath();
        ctx.fill();
        
        // Dorsal fin
        ctx.beginPath();
        ctx.moveTo(-2, -5);
        ctx.lineTo(3, -10);
        ctx.lineTo(6, -5);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(5, -1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(5.5, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Scales shimmer
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(-3, -2, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // === DRAW SNAKE ===
        const snake = snakeRef.current;
        const dir = directionRef.current;
        
        // Draw body segments (back to front)
        for (let i = snake.length - 1; i > 0; i--) {
            const seg = snake[i];
            const prevSeg = snake[i - 1];
            const centerX = seg.x * CELL_SIZE + CELL_SIZE / 2;
            const centerY = seg.y * CELL_SIZE + CELL_SIZE / 2;
            
            // Segment shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(centerX + 2, centerY + 2, CELL_SIZE * 0.42, CELL_SIZE * 0.42, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Body gradient based on position
            const hue = 200 + (i / snake.length) * 30;
            const bodyGradient = ctx.createRadialGradient(
                centerX - 3, centerY - 3, 0,
                centerX, centerY, CELL_SIZE * 0.45
            );
            bodyGradient.addColorStop(0, `hsl(${hue}, 50%, 45%)`);
            bodyGradient.addColorStop(0.7, `hsl(${hue}, 60%, 30%)`);
            bodyGradient.addColorStop(1, `hsl(${hue}, 70%, 20%)`);
            
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, CELL_SIZE * 0.42, 0, Math.PI * 2);
            ctx.fill();
            
            // White belly stripe
            ctx.fillStyle = 'rgba(220, 240, 255, 0.6)';
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + 2, CELL_SIZE * 0.22, CELL_SIZE * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.beginPath();
            ctx.ellipse(centerX - 3, centerY - 4, 4, 3, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw head
        if (snake.length > 0) {
            const head = snake[0];
            const headX = head.x * CELL_SIZE + CELL_SIZE / 2;
            const headY = head.y * CELL_SIZE + CELL_SIZE / 2;
            
            ctx.save();
            ctx.translate(headX, headY);
            
            // Rotate based on direction
            if (dir.x === 1) ctx.rotate(0);
            else if (dir.x === -1) ctx.rotate(Math.PI);
            else if (dir.y === 1) ctx.rotate(Math.PI / 2);
            else if (dir.y === -1) ctx.rotate(-Math.PI / 2);
            
            // Head shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(2, 2, CELL_SIZE * 0.48, CELL_SIZE * 0.44, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Head body (darker penguin colors)
            const headGradient = ctx.createRadialGradient(-3, -3, 0, 0, 0, CELL_SIZE * 0.5);
            headGradient.addColorStop(0, '#2c3e50');
            headGradient.addColorStop(0.7, '#1a252f');
            headGradient.addColorStop(1, '#0d1318');
            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.ellipse(0, 0, CELL_SIZE * 0.48, CELL_SIZE * 0.44, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // White face patch
            ctx.fillStyle = '#f8f8f8';
            ctx.beginPath();
            ctx.ellipse(4, 0, 6, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.ellipse(5, -4, 4, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(6, -4, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(5, -5.5, 1, 0, Math.PI * 2);
            ctx.fill();
            
            // Beak
            ctx.fillStyle = '#f39c12';
            ctx.beginPath();
            ctx.moveTo(8, 2);
            ctx.quadraticCurveTo(15, 3, 8, 6);
            ctx.quadraticCurveTo(9, 4, 8, 2);
            ctx.fill();
            
            // Beak highlight
            ctx.fillStyle = '#f5b041';
            ctx.beginPath();
            ctx.ellipse(10, 3, 2, 1.2, 0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Cheek blush
            ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
            ctx.beginPath();
            ctx.ellipse(6, 4, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
        
        // === UI ===
        // Score background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(10, 10, 130, 35, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${scoreRef.current}`, 20, 34);
        
        // Speed indicator
        const speedPercent = ((INITIAL_SPEED - speedRef.current) / (INITIAL_SPEED - MIN_SPEED)) * 100;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(GAME_SIZE - 90, 10, 80, 35, 8);
        ctx.fill();
        ctx.fillStyle = '#00ff88';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SPEED', GAME_SIZE - 50, 24);
        ctx.fillStyle = `hsl(${120 - speedPercent * 1.2}, 80%, 50%)`;
        ctx.fillText(`${Math.round(speedPercent)}%`, GAME_SIZE - 50, 40);
        
        // Ready screen
        if (gameStateRef.current === 'ready') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, GAME_SIZE, GAME_SIZE);
            
            // Title box
            ctx.fillStyle = 'rgba(0, 80, 100, 0.9)';
            ctx.beginPath();
            ctx.roundRect(GAME_SIZE / 2 - 150, GAME_SIZE / 2 - 110, 300, 220, 20);
            ctx.fill();
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🐧 PENGUIN SNAKE', GAME_SIZE / 2, GAME_SIZE / 2 - 60);
            
            ctx.fillStyle = 'white';
            ctx.font = '16px sans-serif';
            ctx.fillText('🐟 Eat fish to grow!', GAME_SIZE / 2, GAME_SIZE / 2 - 15);
            
            ctx.fillStyle = '#88ccff';
            ctx.font = '14px sans-serif';
            ctx.fillText('WASD or Arrow Keys to move', GAME_SIZE / 2, GAME_SIZE / 2 + 20);
            
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`High Score: ${highScore}`, GAME_SIZE / 2, GAME_SIZE / 2 + 55);
            
            ctx.fillStyle = '#00ff88';
            ctx.font = '12px sans-serif';
            ctx.fillText('Press any key to start!', GAME_SIZE / 2, GAME_SIZE / 2 + 90);
        }
        
        // Game over screen
        if (gameStateRef.current === 'gameover') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, GAME_SIZE, GAME_SIZE);
            
            // Game over box
            ctx.fillStyle = 'rgba(100, 20, 20, 0.9)';
            ctx.beginPath();
            ctx.roundRect(GAME_SIZE / 2 - 140, GAME_SIZE / 2 - 100, 280, 200, 20);
            ctx.fill();
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', GAME_SIZE / 2, GAME_SIZE / 2 - 50);
            
            ctx.fillStyle = 'white';
            ctx.font = '20px sans-serif';
            ctx.fillText(`Score: ${scoreRef.current}`, GAME_SIZE / 2, GAME_SIZE / 2);
            
            ctx.fillStyle = '#ffcc00';
            ctx.font = '16px sans-serif';
            ctx.fillText(`Best: ${Math.max(scoreRef.current, highScore)}`, GAME_SIZE / 2, GAME_SIZE / 2 + 35);
            
            if (scoreRef.current > highScore && scoreRef.current > 0) {
                ctx.fillStyle = '#ffcc00';
                ctx.font = 'bold 14px sans-serif';
                ctx.fillText('⭐ NEW HIGH SCORE! ⭐', GAME_SIZE / 2, GAME_SIZE / 2 + 65);
            }
            
            ctx.fillStyle = '#00ff88';
            ctx.font = '12px sans-serif';
            ctx.fillText('Press SPACE to retry', GAME_SIZE / 2, GAME_SIZE / 2 + 90);
        }
        
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [highScore, spawnFood, spawnParticles]);
    
    // Reset game
    const resetGame = useCallback(() => {
        snakeRef.current = [{ x: 11, y: 11 }];
        directionRef.current = { x: 1, y: 0 };
        nextDirectionRef.current = { x: 1, y: 0 };
        speedRef.current = INITIAL_SPEED;
        scoreRef.current = 0;
        setScore(0);
        lastMoveRef.current = 0;
        particlesRef.current = [];
        trailRef.current = [];
        spawnFood();
        setGameState('playing');
    }, [spawnFood]);
    
    // Handle input
    useEffect(() => {
        const handleKeyDown = (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            if (gameStateRef.current === 'ready' && e.code !== 'Escape') {
                resetGame();
                return;
            }
            
            if (gameStateRef.current === 'gameover' && e.code === 'Space') {
                resetGame();
                return;
            }
            
            if (e.code === 'Escape') {
                onClose();
                return;
            }
            
            if (gameStateRef.current === 'playing') {
                const dir = directionRef.current;
                switch (e.code) {
                    case 'ArrowUp':
                    case 'KeyW':
                        if (dir.y !== 1) nextDirectionRef.current = { x: 0, y: -1 };
                        break;
                    case 'ArrowDown':
                    case 'KeyS':
                        if (dir.y !== -1) nextDirectionRef.current = { x: 0, y: 1 };
                        break;
                    case 'ArrowLeft':
                    case 'KeyA':
                        if (dir.x !== 1) nextDirectionRef.current = { x: -1, y: 0 };
                        break;
                    case 'ArrowRight':
                    case 'KeyD':
                        if (dir.x !== -1) nextDirectionRef.current = { x: 1, y: 0 };
                        break;
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [onClose, resetGame]);
    
    // Start game loop
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
                    <h1 className="text-2xl font-bold text-green-400">
                        🐍 PENGUIN SNAKE 🐟
                    </h1>
                    <p className="text-white/60 text-xs mt-1">High Score: {highScore}</p>
                </div>
                
                <div className="relative p-3 bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border-2 border-green-500/50 shadow-2xl">
                    <canvas
                        ref={canvasRef}
                        width={GAME_SIZE}
                        height={GAME_SIZE}
                        className="rounded-lg"
                    />
                </div>
                
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center">
                    <p className="text-white/50 text-xs">WASD / ARROWS to move • ESC to exit</p>
                </div>
            </div>
        </div>
    );
};

export default SnakeGame;
