/**
 * PongGame - Classic Pong vs AI with penguin theme
 * Canvas-based arcade game
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Game constants
const GAME_WIDTH = 600;
const GAME_HEIGHT = 400;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 15;
const PADDLE_SPEED = 8;
const INITIAL_BALL_SPEED = 5;
const MAX_BALL_SPEED = 12;
const AI_REACTION_SPEED = 4;
const WIN_SCORE = 7;

const PongGame = ({ onClose }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [gameState, setGameState] = useState('ready'); // 'ready', 'playing', 'win', 'lose'
    const [playerScore, setPlayerScore] = useState(0);
    const [aiScore, setAIScore] = useState(0);
    
    // Game state refs
    const playerPaddleRef = useRef(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
    const aiPaddleRef = useRef(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
    const ballRef = useRef({
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        vx: INITIAL_BALL_SPEED,
        vy: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
    });
    const keysRef = useRef({ up: false, down: false });
    const playerScoreRef = useRef(0);
    const aiScoreRef = useRef(0);
    const gameStateRef = useRef('ready');
    const frameRef = useRef(0);
    
    // Sync states to refs
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);
    
    // Reset ball to center
    const resetBall = useCallback((towardsPlayer = false) => {
        const angle = (Math.random() - 0.5) * Math.PI / 3; // Random angle between -30 and 30 degrees
        const speed = INITIAL_BALL_SPEED;
        const direction = towardsPlayer ? -1 : 1;
        
        ballRef.current = {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            vx: Math.cos(angle) * speed * direction,
            vy: Math.sin(angle) * speed
        };
    }, []);
    
    // Draw paddle (ice hockey stick style)
    const drawPaddle = useCallback((ctx, x, y, isPlayer) => {
        const primaryColor = isPlayer ? '#3498db' : '#e74c3c';
        const secondaryColor = isPlayer ? '#2980b9' : '#c0392b';
        const highlightColor = isPlayer ? '#5dade2' : '#ec7063';
        
        // Main paddle body with rounded ends
        const gradient = ctx.createLinearGradient(x, y, x + PADDLE_WIDTH, y);
        gradient.addColorStop(0, secondaryColor);
        gradient.addColorStop(0.3, primaryColor);
        gradient.addColorStop(0.7, primaryColor);
        gradient.addColorStop(1, secondaryColor);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT, 8);
        ctx.fill();
        
        // Inner highlight (glossy effect)
        ctx.fillStyle = highlightColor;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 4, PADDLE_WIDTH - 4, PADDLE_HEIGHT / 3, 4);
        ctx.fill();
        
        // Shine effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 6, 6, PADDLE_HEIGHT / 4, 3);
        ctx.fill();
        
        // Border/outline
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT, 8);
        ctx.stroke();
        
        // Grip lines (3 horizontal lines in middle)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 2;
        const midY = y + PADDLE_HEIGHT / 2;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(x + 3, midY + i * 8);
            ctx.lineTo(x + PADDLE_WIDTH - 3, midY + i * 8);
            ctx.stroke();
        }
        
        // Glow effect around paddle
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'transparent';
        ctx.fillRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT);
        ctx.shadowBlur = 0;
    }, []);
    
    // Draw ball (snowball)
    const drawBall = useCallback((ctx, x, y, frame) => {
        // Rotation effect
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(frame * 0.1);
        
        // Main snowball
        const gradient = ctx.createRadialGradient(2, -2, 0, 0, 0, BALL_SIZE / 2);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#ecf0f1');
        gradient.addColorStop(1, '#bdc3c7');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, BALL_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Snow texture dots
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + frame * 0.1;
            const r = BALL_SIZE / 4;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }, []);
    
    // Draw background
    const drawBackground = useCallback((ctx) => {
        // Ice rink background
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        gradient.addColorStop(0, '#0a3d62');
        gradient.addColorStop(0.5, '#0f5e7e');
        gradient.addColorStop(1, '#0a3d62');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Ice texture
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            const y = Math.random() * GAME_HEIGHT;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_WIDTH, y + (Math.random() - 0.5) * 20);
            ctx.stroke();
        }
        
        // Center line
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(GAME_WIDTH / 2, 0);
        ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Center circle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT / 2, 50, 0, Math.PI * 2);
        ctx.stroke();
        
        // Goal zones
        ctx.fillStyle = 'rgba(46, 204, 113, 0.1)';
        ctx.fillRect(0, 0, 30, GAME_HEIGHT);
        ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
        ctx.fillRect(GAME_WIDTH - 30, 0, 30, GAME_HEIGHT);
    }, []);
    
    // Draw score
    const drawScore = useCallback((ctx) => {
        ctx.font = 'bold 48px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText(playerScoreRef.current.toString(), GAME_WIDTH / 4, 60);
        ctx.fillText(aiScoreRef.current.toString(), (GAME_WIDTH / 4) * 3, 60);
        
        // Labels
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('YOU', GAME_WIDTH / 4, 80);
        ctx.fillText('AI', (GAME_WIDTH / 4) * 3, 80);
    }, []);
    
    // Game loop
    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        frameRef.current++;
        
        // Draw background
        drawBackground(ctx);
        drawScore(ctx);
        
        if (gameStateRef.current === 'playing') {
            const ball = ballRef.current;
            const playerPaddle = playerPaddleRef.current;
            const aiPaddle = aiPaddleRef.current;
            
            // Player paddle movement
            if (keysRef.current.up && playerPaddle > 0) {
                playerPaddleRef.current = Math.max(0, playerPaddle - PADDLE_SPEED);
            }
            if (keysRef.current.down && playerPaddle < GAME_HEIGHT - PADDLE_HEIGHT) {
                playerPaddleRef.current = Math.min(GAME_HEIGHT - PADDLE_HEIGHT, playerPaddle + PADDLE_SPEED);
            }
            
            // AI paddle movement (follows ball with some delay)
            const aiTarget = ball.y - PADDLE_HEIGHT / 2;
            const aiDiff = aiTarget - aiPaddle;
            if (Math.abs(aiDiff) > AI_REACTION_SPEED) {
                aiPaddleRef.current += Math.sign(aiDiff) * AI_REACTION_SPEED;
            }
            aiPaddleRef.current = Math.max(0, Math.min(GAME_HEIGHT - PADDLE_HEIGHT, aiPaddleRef.current));
            
            // Ball movement
            ball.x += ball.vx;
            ball.y += ball.vy;
            
            // Top/bottom wall collision
            if (ball.y - BALL_SIZE / 2 <= 0 || ball.y + BALL_SIZE / 2 >= GAME_HEIGHT) {
                ball.vy = -ball.vy;
                ball.y = ball.y - BALL_SIZE / 2 <= 0 ? BALL_SIZE / 2 : GAME_HEIGHT - BALL_SIZE / 2;
            }
            
            // Player paddle collision
            if (ball.x - BALL_SIZE / 2 <= 30 + PADDLE_WIDTH &&
                ball.y >= playerPaddleRef.current &&
                ball.y <= playerPaddleRef.current + PADDLE_HEIGHT &&
                ball.vx < 0) {
                // Calculate bounce angle based on where ball hit paddle
                const hitPos = (ball.y - playerPaddleRef.current) / PADDLE_HEIGHT;
                const angle = (hitPos - 0.5) * Math.PI / 3; // -30 to 30 degrees
                const speed = Math.min(MAX_BALL_SPEED, Math.abs(ball.vx) * 1.05);
                ball.vx = Math.cos(angle) * speed;
                ball.vy = Math.sin(angle) * speed;
                ball.x = 30 + PADDLE_WIDTH + BALL_SIZE / 2;
            }
            
            // AI paddle collision
            if (ball.x + BALL_SIZE / 2 >= GAME_WIDTH - 30 - PADDLE_WIDTH &&
                ball.y >= aiPaddleRef.current &&
                ball.y <= aiPaddleRef.current + PADDLE_HEIGHT &&
                ball.vx > 0) {
                const hitPos = (ball.y - aiPaddleRef.current) / PADDLE_HEIGHT;
                const angle = (hitPos - 0.5) * Math.PI / 3;
                const speed = Math.min(MAX_BALL_SPEED, Math.abs(ball.vx) * 1.05);
                ball.vx = -Math.cos(angle) * speed;
                ball.vy = Math.sin(angle) * speed;
                ball.x = GAME_WIDTH - 30 - PADDLE_WIDTH - BALL_SIZE / 2;
            }
            
            // Scoring
            if (ball.x < 0) {
                aiScoreRef.current++;
                setAIScore(aiScoreRef.current);
                if (aiScoreRef.current >= WIN_SCORE) {
                    setGameState('lose');
                } else {
                    resetBall(true);
                }
            } else if (ball.x > GAME_WIDTH) {
                playerScoreRef.current++;
                setPlayerScore(playerScoreRef.current);
                if (playerScoreRef.current >= WIN_SCORE) {
                    setGameState('win');
                } else {
                    resetBall(false);
                }
            }
        }
        
        // Draw paddles
        drawPaddle(ctx, 30, playerPaddleRef.current, true);
        drawPaddle(ctx, GAME_WIDTH - 30 - PADDLE_WIDTH, aiPaddleRef.current, false);
        
        // Draw ball
        drawBall(ctx, ballRef.current.x, ballRef.current.y, frameRef.current);
        
        // Ready state
        if (gameStateRef.current === 'ready') {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 32px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('ICE PONG', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);
            
            ctx.fillStyle = 'white';
            ctx.font = '12px "Press Start 2P", monospace';
            ctx.fillText(`FIRST TO ${WIN_SCORE} WINS!`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
            
            ctx.fillStyle = '#3498db';
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillText('PRESS SPACE TO START', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
        }
        
        // Win state
        if (gameStateRef.current === 'win') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            
            ctx.fillStyle = '#2ecc71';
            ctx.font = 'bold 32px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);
            
            ctx.fillStyle = 'white';
            ctx.font = '12px "Press Start 2P", monospace';
            ctx.fillText(`${playerScoreRef.current} - ${aiScoreRef.current}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
            
            ctx.fillStyle = '#00ff88';
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillText('PRESS SPACE TO PLAY AGAIN', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);
        }
        
        // Lose state
        if (gameStateRef.current === 'lose') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            
            ctx.fillStyle = '#e74c3c';
            ctx.font = 'bold 32px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);
            
            ctx.fillStyle = 'white';
            ctx.font = '12px "Press Start 2P", monospace';
            ctx.fillText(`${playerScoreRef.current} - ${aiScoreRef.current}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
            
            ctx.fillStyle = '#00ff88';
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillText('PRESS SPACE TO TRY AGAIN', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);
        }
        
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [drawBackground, drawScore, drawPaddle, drawBall, resetBall]);
    
    // Reset game
    const resetGame = useCallback(() => {
        playerPaddleRef.current = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        aiPaddleRef.current = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        playerScoreRef.current = 0;
        aiScoreRef.current = 0;
        setPlayerScore(0);
        setAIScore(0);
        resetBall(Math.random() > 0.5);
        setGameState('playing');
    }, [resetBall]);
    
    // Handle input
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Stop propagation to prevent VoxelWorld from receiving the events
            e.stopPropagation();
            e.preventDefault();
            
            if (e.code === 'Escape') {
                onClose();
                return;
            }
            
            if (e.code === 'Space') {
                if (gameStateRef.current !== 'playing') {
                    resetGame();
                }
                return;
            }
            
            if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                keysRef.current.up = true;
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                keysRef.current.down = true;
            }
        };
        
        const handleKeyUp = (e) => {
            // Stop propagation
            e.stopPropagation();
            
            if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                keysRef.current.up = false;
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                keysRef.current.down = false;
            }
        };
        
        // Use capture phase to intercept events before they reach VoxelWorld
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('keyup', handleKeyUp, true);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('keyup', handleKeyUp, true);
        };
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
                    <h1 className="text-3xl font-bold text-blue-400 retro-text tracking-wider">
                        🏒 ICE PONG 🏒
                    </h1>
                    <p className="text-white/60 text-sm mt-1">First to {WIN_SCORE} wins!</p>
                </div>
                
                {/* Canvas with arcade cabinet frame */}
                <div className="relative p-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border-4 border-blue-500/50 shadow-2xl shadow-blue-500/20">
                    <canvas
                        ref={canvasRef}
                        width={GAME_WIDTH}
                        height={GAME_HEIGHT}
                        className="rounded"
                    />
                    
                    {/* Side decorations */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-600" />
                    <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-600" />
                </div>
                
                {/* Controls hint */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center">
                    <p className="text-white/60 text-xs">
                        W/S or UP/DOWN to move • ESC to exit
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PongGame;

