/**
 * SnakeGame - Classic Snake game with penguin theme
 * Canvas-based arcade game where you eat fish and grow!
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Game constants
const GAME_SIZE = 400;
const GRID_SIZE = 20;
const CELL_SIZE = GAME_SIZE / GRID_SIZE;
const INITIAL_SPEED = 150; // ms between moves
const SPEED_INCREASE = 5; // ms faster per food eaten
const MIN_SPEED = 50;

const SnakeGame = ({ onClose }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const lastMoveRef = useRef(0);
    const [gameState, setGameState] = useState('ready'); // 'ready', 'playing', 'gameover'
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('snakeGameHighScore');
        return saved ? parseInt(saved, 10) : 0;
    });
    
    // Game state refs
    const snakeRef = useRef([{ x: 10, y: 10 }]);
    const directionRef = useRef({ x: 1, y: 0 });
    const nextDirectionRef = useRef({ x: 1, y: 0 });
    const foodRef = useRef({ x: 15, y: 10 });
    const speedRef = useRef(INITIAL_SPEED);
    const scoreRef = useRef(0);
    const gameStateRef = useRef('ready');
    
    // Sync gameState to ref
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
    
    // Draw penguin head
    const drawHead = useCallback((ctx, x, y, direction) => {
        const centerX = x * CELL_SIZE + CELL_SIZE / 2;
        const centerY = y * CELL_SIZE + CELL_SIZE / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Rotate based on direction
        if (direction.x === 1) ctx.rotate(0);
        else if (direction.x === -1) ctx.rotate(Math.PI);
        else if (direction.y === 1) ctx.rotate(Math.PI / 2);
        else if (direction.y === -1) ctx.rotate(-Math.PI / 2);
        
        // Head (black circle)
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(0, 0, CELL_SIZE * 0.45, 0, Math.PI * 2);
        ctx.fill();
        
        // White face patch
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(3, 0, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(4, -2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Beak
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(11, 1);
        ctx.lineTo(6, 3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }, []);
    
    // Draw body segment
    const drawBodySegment = useCallback((ctx, x, y, index, total) => {
        const centerX = x * CELL_SIZE + CELL_SIZE / 2;
        const centerY = y * CELL_SIZE + CELL_SIZE / 2;
        
        // Alternating colors for body
        const isEven = index % 2 === 0;
        ctx.fillStyle = isEven ? '#2c3e50' : '#34495e';
        
        // Body circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, CELL_SIZE * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // White belly stripe
        ctx.fillStyle = isEven ? '#ecf0f1' : '#bdc3c7';
        ctx.beginPath();
        ctx.arc(centerX, centerY, CELL_SIZE * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }, []);
    
    // Draw fish (food)
    const drawFish = useCallback((ctx, x, y, frame) => {
        const centerX = x * CELL_SIZE + CELL_SIZE / 2;
        const centerY = y * CELL_SIZE + CELL_SIZE / 2;
        
        // Wobble animation
        const wobble = Math.sin(frame * 0.1) * 2;
        
        ctx.save();
        ctx.translate(centerX + wobble, centerY);
        
        // Fish body
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tail
        ctx.fillStyle = '#2980b9';
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-14, -5);
        ctx.lineTo(-14, 5);
        ctx.closePath();
        ctx.fill();
        
        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(4, -1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(4.5, -1, 1, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }, []);
    
    // Draw background
    const drawBackground = useCallback((ctx) => {
        // Ice blue background
        ctx.fillStyle = '#0a3d62';
        ctx.fillRect(0, 0, GAME_SIZE, GAME_SIZE);
        
        // Grid pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, GAME_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(GAME_SIZE, i * CELL_SIZE);
            ctx.stroke();
        }
        
        // Snow decorations in corners
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(10 + i * 8, 10, 3 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(GAME_SIZE - 10 - i * 8, GAME_SIZE - 10, 3 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }, []);
    
    // Game loop
    const frameRef = useRef(0);
    const gameLoop = useCallback((timestamp) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        frameRef.current++;
        
        // Clear and draw background
        drawBackground(ctx);
        
        if (gameStateRef.current === 'playing') {
            // Check if it's time to move
            if (timestamp - lastMoveRef.current >= speedRef.current) {
                lastMoveRef.current = timestamp;
                
                // Apply next direction
                directionRef.current = nextDirectionRef.current;
                
                const snake = snakeRef.current;
                const head = snake[0];
                const dir = directionRef.current;
                
                // Calculate new head position
                const newHead = {
                    x: head.x + dir.x,
                    y: head.y + dir.y
                };
                
                // Wall collision - game over when hitting borders
                if (newHead.x < 0 || newHead.x >= GRID_SIZE || 
                    newHead.y < 0 || newHead.y >= GRID_SIZE) {
                    setGameState('gameover');
                    if (scoreRef.current > highScore) {
                        setHighScore(scoreRef.current);
                        localStorage.setItem('snakeGameHighScore', scoreRef.current.toString());
                    }
                    animationRef.current = requestAnimationFrame(gameLoop);
                    return;
                }
                
                // Self collision - game over when hitting own body
                if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
                    setGameState('gameover');
                    if (scoreRef.current > highScore) {
                        setHighScore(scoreRef.current);
                        localStorage.setItem('snakeGameHighScore', scoreRef.current.toString());
                    }
                    animationRef.current = requestAnimationFrame(gameLoop);
                    return;
                }
                
                // Add new head
                snake.unshift(newHead);
                
                // Check food collision
                const food = foodRef.current;
                if (newHead.x === food.x && newHead.y === food.y) {
                    scoreRef.current += 10;
                    setScore(scoreRef.current);
                    speedRef.current = Math.max(MIN_SPEED, speedRef.current - SPEED_INCREASE);
                    spawnFood();
                } else {
                    // Remove tail if no food eaten
                    snake.pop();
                }
                
                snakeRef.current = snake;
            }
        }
        
        // Draw snake body (from tail to head)
        const snake = snakeRef.current;
        for (let i = snake.length - 1; i > 0; i--) {
            drawBodySegment(ctx, snake[i].x, snake[i].y, i, snake.length);
        }
        
        // Draw head
        if (snake.length > 0) {
            drawHead(ctx, snake[0].x, snake[0].y, directionRef.current);
        }
        
        // Draw food
        drawFish(ctx, foodRef.current.x, foodRef.current.y, frameRef.current);
        
        // Draw score
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(`SCORE: ${scoreRef.current}`, 10, 30);
        ctx.shadowBlur = 0;
        
        // Ready state prompt
        if (gameStateRef.current === 'ready') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, GAME_SIZE, GAME_SIZE);
            
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 28px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PENGUIN SNAKE', GAME_SIZE / 2, GAME_SIZE / 2 - 40);
            
            ctx.fillStyle = 'white';
            ctx.font = '12px "Press Start 2P", monospace';
            ctx.fillText('EAT FISH TO GROW!', GAME_SIZE / 2, GAME_SIZE / 2);
            
            ctx.fillStyle = '#3498db';
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillText('PRESS ANY KEY TO START', GAME_SIZE / 2, GAME_SIZE / 2 + 40);
        }
        
        // Game over state
        if (gameStateRef.current === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, GAME_SIZE, GAME_SIZE);
            
            ctx.fillStyle = '#e74c3c';
            ctx.font = 'bold 28px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', GAME_SIZE / 2, GAME_SIZE / 2 - 50);
            
            ctx.fillStyle = 'white';
            ctx.font = '14px "Press Start 2P", monospace';
            ctx.fillText(`SCORE: ${scoreRef.current}`, GAME_SIZE / 2, GAME_SIZE / 2);
            ctx.fillText(`BEST: ${Math.max(scoreRef.current, highScore)}`, GAME_SIZE / 2, GAME_SIZE / 2 + 30);
            
            ctx.fillStyle = '#00ff88';
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillText('PRESS SPACE TO RETRY', GAME_SIZE / 2, GAME_SIZE / 2 + 70);
        }
        
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [drawBackground, drawBodySegment, drawHead, drawFish, highScore, spawnFood]);
    
    // Reset game
    const resetGame = useCallback(() => {
        snakeRef.current = [{ x: 10, y: 10 }];
        directionRef.current = { x: 1, y: 0 };
        nextDirectionRef.current = { x: 1, y: 0 };
        speedRef.current = INITIAL_SPEED;
        scoreRef.current = 0;
        setScore(0);
        lastMoveRef.current = 0;
        spawnFood();
        setGameState('playing');
    }, [spawnFood]);
    
    // Handle input
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Stop propagation to prevent VoxelWorld from receiving the events
            e.stopPropagation();
            e.preventDefault();
            
            // Start game on any key (except escape)
            if (gameStateRef.current === 'ready' && e.code !== 'Escape') {
                resetGame();
                return;
            }
            
            // Restart on space when game over
            if (gameStateRef.current === 'gameover' && e.code === 'Space') {
                resetGame();
                return;
            }
            
            // Exit on escape
            if (e.code === 'Escape') {
                onClose();
                return;
            }
            
            // Direction controls (prevent 180 degree turns)
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
        
        // Use capture phase to intercept events before they reach VoxelWorld
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [onClose, resetGame]);
    
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
                    <h1 className="text-3xl font-bold text-green-400 retro-text tracking-wider">
                        🐍 PENGUIN SNAKE 🐟
                    </h1>
                    <p className="text-white/60 text-sm mt-1">High Score: {highScore}</p>
                </div>
                
                {/* Canvas with arcade cabinet frame */}
                <div className="relative p-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border-4 border-green-500/50 shadow-2xl shadow-green-500/20">
                    <canvas
                        ref={canvasRef}
                        width={GAME_SIZE}
                        height={GAME_SIZE}
                        className="rounded"
                        style={{ imageRendering: 'pixelated' }}
                    />
                    
                    {/* Side decorations */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-400 to-teal-600" />
                    <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-green-400 to-teal-600" />
                </div>
                
                {/* Controls hint */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center">
                    <p className="text-white/60 text-xs">
                        WASD / ARROWS to move • ESC to exit
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SnakeGame;

