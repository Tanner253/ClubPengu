/**
 * PuffleTrainingGame - Duck Life style training minigames for puffles
 * Each stat has a unique minigame that trains that stat
 * - Flying: Flappy-style game
 * - Running: Endless runner / hurdle jumping
 * - Swimming: Dodge obstacles while collecting fish
 * - Climbing: Vertical climber, dodge falling rocks
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Puffle from '../engine/Puffle';

// Game dimensions
const GAME_WIDTH = 400;
const GAME_HEIGHT = 500;

// ==================== FLYING TRAINING (Flappy-style) ====================
const FlyingGame = ({ puffle, onComplete, onClose }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [gameState, setGameState] = useState('ready');
    const [score, setScore] = useState(0);
    
    const PUFFLE_X = 80;
    const PUFFLE_RADIUS = 20;
    const GRAVITY = 0.4;
    const FLAP_STRENGTH = -8;
    const GAP_SIZE = 150;
    const OBSTACLE_SPEED = 3;
    
    const penguinRef = useRef({ y: GAME_HEIGHT / 2, velocity: 0 });
    const obstaclesRef = useRef([]);
    const frameCountRef = useRef(0);
    const scoreRef = useRef(0);
    const gameStateRef = useRef('ready');
    
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);
    
    const puffleColor = Puffle.COLORS[puffle?.color]?.hex || '#3498db';
    
    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const p = penguinRef.current;
        const obstacles = obstaclesRef.current;
        const frame = frameCountRef.current;
        
        // Sky gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        gradient.addColorStop(0, '#1e3c72');
        gradient.addColorStop(0.3, '#2a5298');
        gradient.addColorStop(0.6, '#87CEEB');
        gradient.addColorStop(1, '#E0F7FA');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Sun glow
        const sunGradient = ctx.createRadialGradient(350, 80, 20, 350, 80, 100);
        sunGradient.addColorStop(0, 'rgba(255, 236, 179, 1)');
        sunGradient.addColorStop(0.3, 'rgba(255, 236, 179, 0.5)');
        sunGradient.addColorStop(1, 'rgba(255, 236, 179, 0)');
        ctx.fillStyle = sunGradient;
        ctx.fillRect(250, 0, 200, 180);
        
        // Sun
        ctx.fillStyle = '#FFF9C4';
        ctx.beginPath();
        ctx.arc(350, 80, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Distant clouds (parallax)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let i = 0; i < 4; i++) {
            const cx = (i * 130 - frame * 0.3) % (GAME_WIDTH + 100) - 50;
            const cy = 60 + i * 50;
            ctx.beginPath();
            ctx.arc(cx, cy, 30, 0, Math.PI * 2);
            ctx.arc(cx + 35, cy - 10, 25, 0, Math.PI * 2);
            ctx.arc(cx + 60, cy, 28, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Closer clouds (parallax - faster)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < 3; i++) {
            const cx = (i * 180 + 50 - frame * 0.8) % (GAME_WIDTH + 120) - 60;
            const cy = 150 + i * 120;
            ctx.beginPath();
            ctx.arc(cx, cy, 22, 0, Math.PI * 2);
            ctx.arc(cx + 25, cy - 8, 18, 0, Math.PI * 2);
            ctx.arc(cx + 45, cy, 20, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (gameStateRef.current === 'playing') {
            // Physics
            p.velocity += GRAVITY;
            p.y += p.velocity;
            
            // Spawn obstacles
            if (frame % 85 === 0) {
                const gapY = 120 + Math.random() * (GAME_HEIGHT - 240);
                obstacles.push({ x: GAME_WIDTH + 30, gapY, scored: false });
            }
            
            // Update obstacles
            for (let i = obstacles.length - 1; i >= 0; i--) {
                obstacles[i].x -= OBSTACLE_SPEED;
                
                if (!obstacles[i].scored && obstacles[i].x + 55 < PUFFLE_X) {
                    obstacles[i].scored = true;
                    scoreRef.current++;
                    setScore(scoreRef.current);
                }
                
                if (obstacles[i].x < -70) {
                    obstacles.splice(i, 1);
                }
            }
            
            // Collision detection
            if (p.y > GAME_HEIGHT - PUFFLE_RADIUS || p.y < PUFFLE_RADIUS) {
                gameStateRef.current = 'gameover';
                setGameState('gameover');
            }
            
            for (const obs of obstacles) {
                if (PUFFLE_X + PUFFLE_RADIUS > obs.x && PUFFLE_X - PUFFLE_RADIUS < obs.x + 55) {
                    if (p.y - PUFFLE_RADIUS < obs.gapY - GAP_SIZE / 2 || p.y + PUFFLE_RADIUS > obs.gapY + GAP_SIZE / 2) {
                        gameStateRef.current = 'gameover';
                        setGameState('gameover');
                        break;
                    }
                }
            }
            
            if (gameStateRef.current === 'playing') frameCountRef.current++;
        }
        
        // Draw obstacles (cloud pillars)
        for (const obs of obstacles) {
            const topH = obs.gapY - GAP_SIZE / 2;
            const bottomY = obs.gapY + GAP_SIZE / 2;
            
            // Top pillar
            const topGradient = ctx.createLinearGradient(obs.x, 0, obs.x + 55, 0);
            topGradient.addColorStop(0, '#ecf0f1');
            topGradient.addColorStop(0.5, '#ffffff');
            topGradient.addColorStop(1, '#d5d8dc');
            ctx.fillStyle = topGradient;
            ctx.fillRect(obs.x, 0, 55, topH);
            
            // Top pillar cap
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath();
            ctx.ellipse(obs.x + 27.5, topH, 32, 18, 0, 0, Math.PI);
            ctx.fill();
            ctx.fillStyle = '#d5d8dc';
            ctx.beginPath();
            ctx.ellipse(obs.x + 27.5, topH, 25, 12, 0, 0, Math.PI);
            ctx.fill();
            
            // Bottom pillar
            ctx.fillStyle = topGradient;
            ctx.fillRect(obs.x, bottomY, 55, GAME_HEIGHT - bottomY);
            
            // Bottom pillar cap
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath();
            ctx.ellipse(obs.x + 27.5, bottomY, 32, 18, Math.PI, 0, Math.PI);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(obs.x + 27.5, bottomY, 25, 12, Math.PI, 0, Math.PI);
            ctx.fill();
        }
        
        // Draw puffle
        const rotation = Math.min(Math.max(p.velocity * 0.04, -0.4), 0.6);
        const flapAnim = p.velocity < 0 ? Math.sin(frame * 0.5) * 0.2 : 0;
        
        ctx.save();
        ctx.translate(PUFFLE_X, p.y);
        ctx.rotate(rotation);
        
        // Wing flap effect when going up
        if (p.velocity < -2) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.ellipse(-15, 5 + flapAnim * 10, 12, 6, -0.3, 0, Math.PI * 2);
            ctx.ellipse(15, 5 + flapAnim * 10, 12, 6, 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Puffle body
        ctx.fillStyle = puffleColor;
        ctx.beginPath();
        ctx.arc(0, 0, PUFFLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        
        // Belly highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 5, PUFFLE_RADIUS * 0.6, PUFFLE_RADIUS * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-6, -6, 8, 0, Math.PI * 2);
        ctx.arc(6, -6, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils (looking forward/up based on velocity)
        const pupilOffsetY = p.velocity < 0 ? -2 : 1;
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(-4, -6 + pupilOffsetY, 4, 0, Math.PI * 2);
        ctx.arc(8, -6 + pupilOffsetY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-6, -8, 2.5, 0, Math.PI * 2);
        ctx.arc(6, -8, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Blush
        ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-13, 3, 5, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(13, 3, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // UI - Score with background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(GAME_WIDTH / 2, 40, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(scoreRef.current.toString(), GAME_WIDTH / 2, 50);
        
        // Ready screen
        if (gameStateRef.current === 'ready') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, GAME_HEIGHT / 2 - 70, GAME_WIDTH, 140);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('✈️ FLYING TRAINING', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 25);
            ctx.font = '16px sans-serif';
            ctx.fillText('Tap or SPACE to Flap!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15);
            ctx.fillStyle = '#B3E5FC';
            ctx.font = '12px sans-serif';
            ctx.fillText('Fly through the cloud gaps!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 42);
        }
        
        // Game over
        if (gameStateRef.current === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
        
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [puffleColor]);
    
    const handleFlap = useCallback(() => {
        if (gameStateRef.current === 'ready') {
            penguinRef.current = { y: GAME_HEIGHT / 2, velocity: 0 };
            obstaclesRef.current = [];
            frameCountRef.current = 0;
            scoreRef.current = 0;
            setScore(0);
            setGameState('playing');
        } else if (gameStateRef.current === 'playing') {
            penguinRef.current.velocity = FLAP_STRENGTH;
        }
    }, []);
    
    useEffect(() => {
        const handleKey = (e) => {
            e.stopPropagation();
            if (e.code === 'Space') {
                e.preventDefault();
                handleFlap();
            }
            if (e.code === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey, true);
        return () => window.removeEventListener('keydown', handleKey, true);
    }, [handleFlap, onClose]);
    
    useEffect(() => {
        animationRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationRef.current);
    }, [gameLoop]);
    
    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={GAME_WIDTH}
                height={GAME_HEIGHT}
                onClick={handleFlap}
                className="rounded-lg cursor-pointer"
            />
            {gameState === 'gameover' && (
                <div className="absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-4xl mb-3">✈️</div>
                    <h2 className="text-2xl font-bold text-cyan-400 mb-2">Training Complete!</h2>
                    <div className="text-white text-lg mb-1">Score: <span className="text-yellow-400 font-bold">{score}</span></div>
                    <div className="text-green-400 text-sm mb-4">+{Math.min(score * 2, 30)} Flying XP</div>
                    <button
                        onClick={() => onComplete('flying', score)}
                        className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg hover:from-cyan-400 hover:to-blue-400"
                    >
                        Collect Rewards
                    </button>
                </div>
            )}
        </div>
    );
};

// ==================== RUNNING TRAINING (Endless Runner) ====================
const RunningGame = ({ puffle, onComplete, onClose }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [gameState, setGameState] = useState('ready');
    const [score, setScore] = useState(0);
    
    const GROUND_Y = GAME_HEIGHT - 80;
    const PUFFLE_X = 70; // Fixed X position for puffle
    const PUFFLE_RADIUS = 22;
    const JUMP_STRENGTH = -14;
    const GRAVITY = 0.6;
    
    const playerRef = useRef({ y: GROUND_Y - PUFFLE_RADIUS, jumping: false, velocity: 0 });
    const obstaclesRef = useRef([]);
    const frameCountRef = useRef(0);
    const scoreRef = useRef(0);
    const distanceRef = useRef(0);
    const gameStateRef = useRef('ready');
    
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    
    const puffleColor = Puffle.COLORS[puffle?.color]?.hex || '#3498db';
    
    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const player = playerRef.current;
        const obstacles = obstaclesRef.current;
        const frame = frameCountRef.current;
        
        // Sky gradient background
        const skyGradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(0.6, '#B0E2FF');
        skyGradient.addColorStop(1, '#98D8AA');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GROUND_Y);
        
        // Sun
        ctx.fillStyle = '#FFE066';
        ctx.beginPath();
        ctx.arc(350, 60, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF9C4';
        ctx.beginPath();
        ctx.arc(350, 60, 28, 0, Math.PI * 2);
        ctx.fill();
        
        // Clouds in background (parallax)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        for (let i = 0; i < 4; i++) {
            const cx = (i * 120 + 50 - frame * 0.5) % (GAME_WIDTH + 80);
            const cy = 70 + i * 40;
            ctx.beginPath();
            ctx.arc(cx, cy, 25, 0, Math.PI * 2);
            ctx.arc(cx + 25, cy - 8, 20, 0, Math.PI * 2);
            ctx.arc(cx + 45, cy, 22, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Ground with grass
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);
        
        // Grass layer
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 15);
        
        // Grass blades
        ctx.fillStyle = '#8BC34A';
        for (let i = 0; i < 30; i++) {
            const gx = (i * 15 - frame * 3) % (GAME_WIDTH + 10);
            ctx.beginPath();
            ctx.moveTo(gx, GROUND_Y);
            ctx.lineTo(gx + 3, GROUND_Y - 8);
            ctx.lineTo(gx + 6, GROUND_Y);
            ctx.fill();
        }
        
        // Moving ground texture
        ctx.fillStyle = '#4E3B2D';
        for (let i = 0; i < 12; i++) {
            const x = (i * 40 - frame * 5) % (GAME_WIDTH + 20) - 10;
            ctx.fillRect(x, GROUND_Y + 25, 20, 4);
        }
        
        const speed = 5 + Math.floor(frame / 200);
        
        if (gameStateRef.current === 'playing') {
            // Physics
            player.velocity += GRAVITY;
            player.y += player.velocity;
            
            // Ground collision
            if (player.y >= GROUND_Y - PUFFLE_RADIUS) {
                player.y = GROUND_Y - PUFFLE_RADIUS;
                player.jumping = false;
                player.velocity = 0;
            }
            
            // Spawn obstacles
            if (frame % 55 === 0) {
                const type = Math.random();
                if (type < 0.4) {
                    obstacles.push({ x: GAME_WIDTH + 20, type: 'hurdle', height: 45 });
                } else if (type < 0.7) {
                    obstacles.push({ x: GAME_WIDTH + 20, type: 'rock', size: 18 });
                } else {
                    obstacles.push({ x: GAME_WIDTH + 20, type: 'bird', y: GROUND_Y - 80 - Math.random() * 60 });
                }
            }
            
            // Update obstacles and distance
            distanceRef.current += speed * 0.1;
            scoreRef.current = Math.floor(distanceRef.current);
            setScore(scoreRef.current);
            
            for (let i = obstacles.length - 1; i >= 0; i--) {
                obstacles[i].x -= speed;
                
                // Remove off-screen obstacles
                if (obstacles[i].x < -50) {
                    obstacles.splice(i, 1);
                    continue;
                }
                
                // Collision detection
                const obs = obstacles[i];
                const obsLeft = obs.x;
                const obsRight = obs.type === 'hurdle' ? obs.x + 12 : obs.x + (obs.size || 20) * 2;
                
                if (PUFFLE_X + PUFFLE_RADIUS > obsLeft && PUFFLE_X - PUFFLE_RADIUS < obsRight) {
                    let obsTop;
                    if (obs.type === 'hurdle') {
                        obsTop = GROUND_Y - obs.height;
                    } else if (obs.type === 'rock') {
                        obsTop = GROUND_Y - obs.size;
                    } else { // bird
                        obsTop = obs.y - 15;
                        const obsBottom = obs.y + 15;
                        if (player.y - PUFFLE_RADIUS < obsBottom && player.y + PUFFLE_RADIUS > obsTop) {
                            gameStateRef.current = 'gameover';
                            setGameState('gameover');
                            break;
                        }
                        continue;
                    }
                    
                    if (player.y + PUFFLE_RADIUS > obsTop) {
                        gameStateRef.current = 'gameover';
                        setGameState('gameover');
                        break;
                    }
                }
            }
            
            if (gameStateRef.current === 'playing') frameCountRef.current++;
        }
        
        // Draw obstacles
        for (const obs of obstacles) {
            if (obs.type === 'hurdle') {
                // Hurdle post
                ctx.fillStyle = '#C62828';
                ctx.fillRect(obs.x, GROUND_Y - obs.height, 12, obs.height);
                // Hurdle bar
                ctx.fillStyle = '#E53935';
                ctx.fillRect(obs.x - 8, GROUND_Y - obs.height, 28, 8);
                // Stripes on bar
                ctx.fillStyle = 'white';
                ctx.fillRect(obs.x - 5, GROUND_Y - obs.height + 2, 6, 4);
                ctx.fillRect(obs.x + 10, GROUND_Y - obs.height + 2, 6, 4);
            } else if (obs.type === 'rock') {
                // Rock with shading
                ctx.fillStyle = '#607D8B';
                ctx.beginPath();
                ctx.arc(obs.x + obs.size, GROUND_Y - obs.size + 5, obs.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#78909C';
                ctx.beginPath();
                ctx.arc(obs.x + obs.size - 3, GROUND_Y - obs.size + 2, obs.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                // Highlight
                ctx.fillStyle = '#90A4AE';
                ctx.beginPath();
                ctx.arc(obs.x + obs.size - 6, GROUND_Y - obs.size - 2, 5, 0, Math.PI * 2);
                ctx.fill();
            } else if (obs.type === 'bird') {
                // Flying bird
                const flapOffset = Math.sin(frame * 0.3) * 8;
                ctx.fillStyle = '#5D4037';
                // Body
                ctx.beginPath();
                ctx.ellipse(obs.x + 15, obs.y, 18, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                // Wings
                ctx.beginPath();
                ctx.moveTo(obs.x + 5, obs.y);
                ctx.quadraticCurveTo(obs.x - 5, obs.y - 15 + flapOffset, obs.x - 10, obs.y - 5 + flapOffset);
                ctx.quadraticCurveTo(obs.x, obs.y, obs.x + 5, obs.y);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(obs.x + 25, obs.y);
                ctx.quadraticCurveTo(obs.x + 35, obs.y - 15 + flapOffset, obs.x + 40, obs.y - 5 + flapOffset);
                ctx.quadraticCurveTo(obs.x + 30, obs.y, obs.x + 25, obs.y);
                ctx.fill();
                // Beak
                ctx.fillStyle = '#FFA000';
                ctx.beginPath();
                ctx.moveTo(obs.x - 3, obs.y);
                ctx.lineTo(obs.x - 12, obs.y + 2);
                ctx.lineTo(obs.x - 3, obs.y + 4);
                ctx.fill();
                // Eye
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(obs.x + 3, obs.y - 2, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(obs.x + 2, obs.y - 2, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw puffle with running animation
        const runBounce = player.jumping ? 0 : Math.abs(Math.sin(frame * 0.4)) * 4;
        const squash = player.jumping ? 1 : 1 + Math.sin(frame * 0.4) * 0.08;
        const px = PUFFLE_X;
        const py = player.y - runBounce;
        
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(1 / squash, squash);
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, PUFFLE_RADIUS + runBounce + 5, PUFFLE_RADIUS * 0.8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Puffle body
        ctx.fillStyle = puffleColor;
        ctx.beginPath();
        ctx.arc(0, 0, PUFFLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        
        // Lighter belly
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 5, PUFFLE_RADIUS * 0.6, PUFFLE_RADIUS * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-6, -6, 8, 0, Math.PI * 2);
        ctx.arc(6, -6, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils (looking forward when running)
        ctx.fillStyle = '#1a1a2e';
        const pupilOffsetX = player.jumping ? 0 : 2;
        ctx.beginPath();
        ctx.arc(-4 + pupilOffsetX, -6, 4, 0, Math.PI * 2);
        ctx.arc(8 + pupilOffsetX, -6, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-6, -8, 2, 0, Math.PI * 2);
        ctx.arc(6, -8, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Blush
        ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-12, 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(12, 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // UI - Score
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(GAME_WIDTH / 2 - 60, 10, 120, 40);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${scoreRef.current}m`, GAME_WIDTH / 2, 40);
        
        // Speed indicator
        ctx.fillStyle = 'rgba(255, 165, 0, 0.8)';
        ctx.font = '12px sans-serif';
        ctx.fillText(`Speed: ${speed}`, GAME_WIDTH / 2, 58);
        
        // Ready screen
        if (gameStateRef.current === 'ready') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, GAME_HEIGHT / 2 - 70, GAME_WIDTH, 140);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('🏃 RUNNING TRAINING', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 25);
            ctx.font = '16px sans-serif';
            ctx.fillText('Tap or SPACE to Jump!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15);
            ctx.fillStyle = '#FFE082';
            ctx.font = '12px sans-serif';
            ctx.fillText('Dodge hurdles, rocks, and birds!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 45);
        }
        
        if (gameStateRef.current === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
        
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [puffleColor]);
    
    const handleJump = useCallback(() => {
        if (gameStateRef.current === 'ready') {
            playerRef.current = { y: GROUND_Y - PUFFLE_RADIUS, jumping: false, velocity: 0 };
            obstaclesRef.current = [];
            frameCountRef.current = 0;
            scoreRef.current = 0;
            distanceRef.current = 0;
            setScore(0);
            setGameState('playing');
        } else if (gameStateRef.current === 'playing' && !playerRef.current.jumping) {
            playerRef.current.jumping = true;
            playerRef.current.velocity = JUMP_STRENGTH;
        }
    }, []);
    
    useEffect(() => {
        const handleKey = (e) => {
            e.stopPropagation();
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                handleJump();
            }
            if (e.code === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey, true);
        return () => window.removeEventListener('keydown', handleKey, true);
    }, [handleJump, onClose]);
    
    useEffect(() => {
        animationRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationRef.current);
    }, [gameLoop]);
    
    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={GAME_WIDTH}
                height={GAME_HEIGHT}
                onClick={handleJump}
                className="rounded-lg cursor-pointer"
            />
            {gameState === 'gameover' && (
                <div className="absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-4xl mb-3">🏃</div>
                    <h2 className="text-2xl font-bold text-orange-400 mb-2">Training Complete!</h2>
                    <div className="text-white text-lg mb-1">Distance: <span className="text-yellow-400 font-bold">{score}m</span></div>
                    <div className="text-green-400 text-sm mb-4">+{Math.min(score * 2, 30)} Running XP</div>
                    <button
                        onClick={() => onComplete('running', score)}
                        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-lg hover:from-orange-400 hover:to-red-400"
                    >
                        Collect Rewards
                    </button>
                </div>
            )}
        </div>
    );
};

// ==================== SWIMMING TRAINING (Dodge & Collect) ====================
const SwimmingGame = ({ puffle, onComplete, onClose }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [gameState, setGameState] = useState('ready');
    const [score, setScore] = useState(0);
    
    const PUFFLE_RADIUS = 22;
    const MOVE_SPEED = 5;
    
    const playerRef = useRef({ x: 70, y: GAME_HEIGHT / 2 });
    const fishRef = useRef([]);
    const obstaclesRef = useRef([]);
    const frameCountRef = useRef(0);
    const scoreRef = useRef(0);
    const gameStateRef = useRef('ready');
    const keysRef = useRef({ up: false, down: false, left: false, right: false });
    
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    
    const puffleColor = Puffle.COLORS[puffle?.color]?.hex || '#3498db';
    
    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const player = playerRef.current;
        const fish = fishRef.current;
        const obstacles = obstaclesRef.current;
        const frame = frameCountRef.current;
        
        // Deep water gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        gradient.addColorStop(0, '#0A4D7A');
        gradient.addColorStop(0.3, '#0066AA');
        gradient.addColorStop(0.7, '#004080');
        gradient.addColorStop(1, '#002855');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Light rays from surface
        ctx.fillStyle = 'rgba(100, 200, 255, 0.03)';
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            const rx = 50 + i * 80;
            ctx.moveTo(rx, 0);
            ctx.lineTo(rx + 100, GAME_HEIGHT);
            ctx.lineTo(rx + 120, GAME_HEIGHT);
            ctx.lineTo(rx + 20, 0);
            ctx.fill();
        }
        
        // Bubbles (various sizes, floating up)
        for (let i = 0; i < 25; i++) {
            const bx = (i * 23 + frame * 0.3) % GAME_WIDTH;
            const by = (GAME_HEIGHT + 30 - (i * 31 + frame * (0.8 + (i % 3) * 0.3)) % (GAME_HEIGHT + 60));
            const size = 2 + (i % 4);
            
            ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + (i % 3) * 0.1})`;
            ctx.beginPath();
            ctx.arc(bx, by, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Bubble highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(bx - size * 0.3, by - size * 0.3, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Seaweed in background
        ctx.fillStyle = 'rgba(34, 139, 34, 0.4)';
        for (let i = 0; i < 8; i++) {
            const sx = i * 55 + 20;
            const sway = Math.sin(frame * 0.03 + i) * 10;
            ctx.beginPath();
            ctx.moveTo(sx, GAME_HEIGHT);
            ctx.quadraticCurveTo(sx + sway, GAME_HEIGHT - 60, sx + sway * 0.5, GAME_HEIGHT - 100 - (i % 3) * 20);
            ctx.quadraticCurveTo(sx - sway, GAME_HEIGHT - 40, sx, GAME_HEIGHT);
            ctx.fill();
        }
        
        if (gameStateRef.current === 'playing') {
            // Movement (all 4 directions)
            if (keysRef.current.up) player.y = Math.max(PUFFLE_RADIUS, player.y - MOVE_SPEED);
            if (keysRef.current.down) player.y = Math.min(GAME_HEIGHT - PUFFLE_RADIUS, player.y + MOVE_SPEED);
            if (keysRef.current.left) player.x = Math.max(PUFFLE_RADIUS, player.x - MOVE_SPEED * 0.7);
            if (keysRef.current.right) player.x = Math.min(GAME_WIDTH * 0.4, player.x + MOVE_SPEED * 0.7);
            
            // Spawn fish (golden, worth points)
            if (frame % 35 === 0) {
                fish.push({ 
                    x: GAME_WIDTH + 20, 
                    y: 40 + Math.random() * (GAME_HEIGHT - 80),
                    type: Math.random() < 0.15 ? 'golden' : 'normal',
                    wobble: Math.random() * Math.PI * 2
                });
            }
            
            // Spawn obstacles (jellyfish)
            if (frame % 60 === 0) {
                obstacles.push({ 
                    x: GAME_WIDTH + 20, 
                    y: 60 + Math.random() * (GAME_HEIGHT - 120),
                    phase: Math.random() * Math.PI * 2
                });
            }
            
            // Update fish
            const fishSpeed = 3 + Math.floor(frame / 500);
            for (let i = fish.length - 1; i >= 0; i--) {
                fish[i].x -= fishSpeed;
                fish[i].y += Math.sin(frame * 0.08 + fish[i].wobble) * 0.8;
                
                // Collect fish
                const dx = fish[i].x - player.x;
                const dy = fish[i].y - player.y;
                if (Math.sqrt(dx * dx + dy * dy) < PUFFLE_RADIUS + 12) {
                    const points = fish[i].type === 'golden' ? 3 : 1;
                    scoreRef.current += points;
                    setScore(scoreRef.current);
                    fish.splice(i, 1);
                    continue;
                }
                
                if (fish[i].x < -25) fish.splice(i, 1);
            }
            
            // Update jellyfish
            for (let i = obstacles.length - 1; i >= 0; i--) {
                obstacles[i].x -= 2;
                obstacles[i].y += Math.sin(frame * 0.05 + obstacles[i].phase) * 1.2;
                
                // Keep in bounds
                obstacles[i].y = Math.max(30, Math.min(GAME_HEIGHT - 50, obstacles[i].y));
                
                // Collision
                const dx = obstacles[i].x - player.x;
                const dy = obstacles[i].y - player.y;
                if (Math.sqrt(dx * dx + dy * dy) < PUFFLE_RADIUS + 20) {
                    gameStateRef.current = 'gameover';
                    setGameState('gameover');
                    break;
                }
                
                if (obstacles[i].x < -40) obstacles.splice(i, 1);
            }
            
            if (gameStateRef.current === 'playing') frameCountRef.current++;
        }
        
        // Draw fish
        for (const f of fish) {
            const isGolden = f.type === 'golden';
            
            // Fish body
            ctx.fillStyle = isGolden ? '#FFD700' : '#FF8C00';
            ctx.beginPath();
            ctx.ellipse(f.x, f.y, 14, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Fish tail
            ctx.beginPath();
            ctx.moveTo(f.x + 12, f.y);
            ctx.lineTo(f.x + 24, f.y - 8);
            ctx.lineTo(f.x + 24, f.y + 8);
            ctx.closePath();
            ctx.fill();
            
            // Dorsal fin
            ctx.beginPath();
            ctx.moveTo(f.x - 2, f.y - 8);
            ctx.lineTo(f.x + 6, f.y - 14);
            ctx.lineTo(f.x + 10, f.y - 8);
            ctx.fill();
            
            // Eye
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(f.x - 5, f.y - 2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(f.x - 6, f.y - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Golden sparkle
            if (isGolden) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(f.x - 8, f.y - 5, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw jellyfish
        for (const obs of obstacles) {
            const tentacleWave = Math.sin(frame * 0.1 + obs.phase);
            
            // Glow effect
            const glowGradient = ctx.createRadialGradient(obs.x, obs.y, 0, obs.x, obs.y, 35);
            glowGradient.addColorStop(0, 'rgba(255, 105, 180, 0.3)');
            glowGradient.addColorStop(1, 'rgba(255, 105, 180, 0)');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, 35, 0, Math.PI * 2);
            ctx.fill();
            
            // Jellyfish head (bell)
            const headGradient = ctx.createRadialGradient(obs.x - 5, obs.y - 8, 0, obs.x, obs.y, 22);
            headGradient.addColorStop(0, '#FFB6C1');
            headGradient.addColorStop(0.5, '#FF69B4');
            headGradient.addColorStop(1, '#DB7093');
            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.ellipse(obs.x, obs.y, 22, 16, 0, Math.PI, 0);
            ctx.fill();
            
            // Inner bell pattern
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(obs.x, obs.y - 3, 14, 8, 0, Math.PI, 0);
            ctx.stroke();
            
            // Tentacles
            ctx.strokeStyle = '#FF69B4';
            ctx.lineWidth = 2.5;
            for (let t = 0; t < 6; t++) {
                const tx = obs.x - 15 + t * 6;
                ctx.beginPath();
                ctx.moveTo(tx, obs.y + 2);
                ctx.quadraticCurveTo(
                    tx + tentacleWave * (4 + t % 2 * 2),
                    obs.y + 20,
                    tx + tentacleWave * (3 + t % 3),
                    obs.y + 35 + (t % 2) * 8
                );
                ctx.stroke();
            }
        }
        
        // Draw puffle with swimming motion
        const swimBob = Math.sin(frame * 0.12) * 4;
        const swimTilt = Math.sin(frame * 0.08) * 0.1;
        
        ctx.save();
        ctx.translate(player.x, player.y + swimBob);
        ctx.rotate(swimTilt);
        
        // Swimming bubble trail
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let b = 0; b < 3; b++) {
            const bx = -PUFFLE_RADIUS - 10 - b * 12;
            const by = Math.sin(frame * 0.2 + b) * 5;
            ctx.beginPath();
            ctx.arc(bx, by, 4 - b, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Puffle body (slightly elongated for swimming)
        ctx.fillStyle = puffleColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, PUFFLE_RADIUS + 2, PUFFLE_RADIUS - 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Belly
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(2, 4, PUFFLE_RADIUS * 0.5, PUFFLE_RADIUS * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-5, -5, 7, 0, Math.PI * 2);
        ctx.arc(7, -5, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils (looking forward)
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(-3, -5, 3.5, 0, Math.PI * 2);
        ctx.arc(9, -5, 3.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-5, -7, 2, 0, Math.PI * 2);
        ctx.arc(7, -7, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Blush
        ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-12, 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(14, 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // UI
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(GAME_WIDTH / 2 - 50, 10, 100, 40);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FISH', GAME_WIDTH / 2, 26);
        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`🐟 ${scoreRef.current}`, GAME_WIDTH / 2, 46);
        
        // Ready screen
        if (gameStateRef.current === 'ready') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, GAME_HEIGHT / 2 - 80, GAME_WIDTH, 160);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🏊 SWIMMING TRAINING', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 35);
            ctx.font = '16px sans-serif';
            ctx.fillText('Arrow Keys to Swim', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 5);
            ctx.fillStyle = '#FFE082';
            ctx.font = '14px sans-serif';
            ctx.fillText('Collect fish! Avoid jellyfish!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
            ctx.fillStyle = '#FFD700';
            ctx.font = '12px sans-serif';
            ctx.fillText('⭐ Golden fish = 3 points!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 55);
        }
        
        if (gameStateRef.current === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
        
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [puffleColor]);
    
    const startGame = useCallback(() => {
        if (gameStateRef.current === 'ready') {
            playerRef.current = { x: 70, y: GAME_HEIGHT / 2 };
            fishRef.current = [];
            obstaclesRef.current = [];
            frameCountRef.current = 0;
            scoreRef.current = 0;
            setScore(0);
            setGameState('playing');
        }
    }, []);
    
    useEffect(() => {
        const handleKeyDown = (e) => {
            e.stopPropagation();
            if (e.code === 'ArrowUp' || e.code === 'KeyW') keysRef.current.up = true;
            if (e.code === 'ArrowDown' || e.code === 'KeyS') keysRef.current.down = true;
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
            if (e.code === 'Space' && gameStateRef.current === 'ready') startGame();
            if (e.code === 'Escape') onClose();
        };
        const handleKeyUp = (e) => {
            if (e.code === 'ArrowUp' || e.code === 'KeyW') keysRef.current.up = false;
            if (e.code === 'ArrowDown' || e.code === 'KeyS') keysRef.current.down = false;
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
        };
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('keyup', handleKeyUp, true);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('keyup', handleKeyUp, true);
        };
    }, [startGame, onClose]);
    
    useEffect(() => {
        animationRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationRef.current);
    }, [gameLoop]);
    
    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={GAME_WIDTH}
                height={GAME_HEIGHT}
                onClick={startGame}
                className="rounded-lg cursor-pointer"
            />
            {gameState === 'gameover' && (
                <div className="absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-4xl mb-3">🏊</div>
                    <h2 className="text-2xl font-bold text-blue-400 mb-2">Training Complete!</h2>
                    <div className="text-white text-lg mb-1">Fish Caught: <span className="text-yellow-400 font-bold">{score}</span></div>
                    <div className="text-green-400 text-sm mb-4">+{Math.min(score * 3, 30)} Swimming XP</div>
                    <button
                        onClick={() => onComplete('swimming', score)}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-lg hover:from-blue-400 hover:to-cyan-400"
                    >
                        Collect Rewards
                    </button>
                </div>
            )}
        </div>
    );
};

// ==================== CLIMBING TRAINING (Doodle Jump Style) ====================
const ClimbingGame = ({ puffle, onComplete, onClose }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [gameState, setGameState] = useState('ready');
    const [score, setScore] = useState(0);
    
    const PUFFLE_RADIUS = 20;
    const GRAVITY = 0.4;
    const JUMP_STRENGTH = -12;
    const MOVE_SPEED = 6;
    
    const playerRef = useRef({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 100, velocityY: 0, velocityX: 0 });
    const platformsRef = useRef([]);
    const rocksRef = useRef([]);
    const cameraYRef = useRef(0);
    const maxHeightRef = useRef(0);
    const frameCountRef = useRef(0);
    const scoreRef = useRef(0);
    const gameStateRef = useRef('ready');
    const keysRef = useRef({ left: false, right: false });
    
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    
    const puffleColor = Puffle.COLORS[puffle?.color]?.hex || '#3498db';
    
    // Generate initial platforms
    const generatePlatforms = useCallback(() => {
        const platforms = [];
        // Starting platform (wide, at bottom)
        platforms.push({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50, width: 140, type: 'normal' });
        
        // Generate platforms going up - more platforms with consistent spacing
        let lastY = GAME_HEIGHT - 50;
        for (let i = 0; i < 20; i++) {
            lastY -= 65 + Math.random() * 45; // Jump-able distance
            platforms.push({
                x: 40 + Math.random() * (GAME_WIDTH - 80),
                y: lastY,
                width: 55 + Math.random() * 35,
                type: i > 5 && Math.random() < 0.15 ? 'breaking' : 'normal' // No breaking platforms near start
            });
        }
        return platforms;
    }, []);
    
    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const player = playerRef.current;
        const platforms = platformsRef.current;
        const rocks = rocksRef.current;
        const frame = frameCountRef.current;
        const cameraY = cameraYRef.current;
        
        // Mountain gradient background
        const bgGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        bgGradient.addColorStop(0, '#1a1a3e');
        bgGradient.addColorStop(0.3, '#2d2d5a');
        bgGradient.addColorStop(0.7, '#4a4a7a');
        bgGradient.addColorStop(1, '#6a5a8a');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Stars in background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 30; i++) {
            const sx = (i * 37 + 10) % GAME_WIDTH;
            const sy = ((i * 53 + cameraY * 0.1) % (GAME_HEIGHT + 50)) - 25;
            const size = (i % 3) + 1;
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Mountain silhouettes in background
        ctx.fillStyle = 'rgba(30, 30, 50, 0.5)';
        for (let i = 0; i < 3; i++) {
            const mx = i * 150 - 50;
            const my = GAME_HEIGHT - 100 + Math.sin(i) * 30 + cameraY * 0.05;
            ctx.beginPath();
            ctx.moveTo(mx, GAME_HEIGHT);
            ctx.lineTo(mx + 100, my);
            ctx.lineTo(mx + 200, GAME_HEIGHT);
            ctx.fill();
        }
        
        if (gameStateRef.current === 'playing') {
            // Horizontal movement
            if (keysRef.current.left) player.velocityX = -MOVE_SPEED;
            else if (keysRef.current.right) player.velocityX = MOVE_SPEED;
            else player.velocityX *= 0.85; // Friction
            
            player.x += player.velocityX;
            
            // Wrap around screen edges
            if (player.x < -PUFFLE_RADIUS) player.x = GAME_WIDTH + PUFFLE_RADIUS;
            if (player.x > GAME_WIDTH + PUFFLE_RADIUS) player.x = -PUFFLE_RADIUS;
            
            // Gravity
            player.velocityY += GRAVITY;
            player.y += player.velocityY;
            
            // Platform collision (only when falling)
            if (player.velocityY > 0) {
                for (let i = platforms.length - 1; i >= 0; i--) {
                    const plat = platforms[i];
                    // Check collision in world coordinates
                    const playerBottom = player.y + PUFFLE_RADIUS;
                    const prevBottom = playerBottom - player.velocityY;
                    const platTop = plat.y;
                    
                    // Landing on platform: player bottom crosses platform top
                    if (playerBottom >= platTop && prevBottom < platTop + 15 &&
                        player.x > plat.x - plat.width / 2 - PUFFLE_RADIUS * 0.5 &&
                        player.x < plat.x + plat.width / 2 + PUFFLE_RADIUS * 0.5) {
                        
                        if (plat.type === 'breaking') {
                            plat.breaking = true;
                            // Small bounce but platform breaks
                            player.velocityY = JUMP_STRENGTH * 0.5;
                        } else {
                            // Set player position on top of platform (world coordinates)
                            player.y = plat.y - PUFFLE_RADIUS;
                            player.velocityY = JUMP_STRENGTH;
                        }
                    }
                }
            }
            
            // Update camera (scroll up when player goes higher)
            const playerScreenY = player.y - cameraY;
            if (playerScreenY < GAME_HEIGHT * 0.4) {
                cameraYRef.current = player.y - GAME_HEIGHT * 0.4;
            }
            
            // Track max height for score
            const currentHeight = -player.y + GAME_HEIGHT;
            if (currentHeight > maxHeightRef.current) {
                maxHeightRef.current = currentHeight;
                scoreRef.current = Math.floor(maxHeightRef.current / 10);
                setScore(scoreRef.current);
            }
            
            // Generate new platforms as we climb
            // Always keep platforms generated ahead of the camera view (above it)
            // Generate until we have platforms at least 300px above the camera top
            let generationAttempts = 0;
            while (generationAttempts < 10) {
                const highestPlatformY = platforms.length > 0 
                    ? Math.min(...platforms.map(p => p.y)) 
                    : player.y;
                
                // If highest platform is already well above camera, stop generating
                if (highestPlatformY < cameraYRef.current - 300) break;
                
                // Generate a new platform above the current highest
                const newY = highestPlatformY - 65 - Math.random() * 45;
                platforms.push({
                    x: 40 + Math.random() * (GAME_WIDTH - 80),
                    y: newY,
                    width: 55 + Math.random() * 35,
                    type: Math.random() < 0.18 ? 'breaking' : 'normal'
                });
                generationAttempts++;
            }
            
            // Remove platforms below screen
            for (let i = platforms.length - 1; i >= 0; i--) {
                if (platforms[i].y > cameraYRef.current + GAME_HEIGHT + 100 || platforms[i].breaking) {
                    if (platforms[i].breaking) {
                        platforms[i].breakTimer = (platforms[i].breakTimer || 0) + 1;
                        if (platforms[i].breakTimer > 10) {
                            platforms.splice(i, 1);
                        }
                    } else {
                        platforms.splice(i, 1);
                    }
                }
            }
            
            // Spawn falling rocks occasionally
            if (frame % 120 === 0 && scoreRef.current > 5) {
                rocks.push({ 
                    x: Math.random() * GAME_WIDTH, 
                    y: cameraYRef.current - 50,
                    velocityY: 2 + Math.random() * 2
                });
            }
            
            // Update rocks
            for (let i = rocks.length - 1; i >= 0; i--) {
                rocks[i].y += rocks[i].velocityY;
                
                // Collision with player
                const dx = rocks[i].x - player.x;
                const dy = (rocks[i].y - cameraY) - (player.y - cameraY);
                if (Math.sqrt(dx * dx + dy * dy) < PUFFLE_RADIUS + 15) {
                    gameStateRef.current = 'gameover';
                    setGameState('gameover');
                    break;
                }
                
                // Remove rocks below screen
                if (rocks[i].y > cameraYRef.current + GAME_HEIGHT + 50) {
                    rocks.splice(i, 1);
                }
            }
            
            // Game over if fall below screen
            if (player.y - cameraY > GAME_HEIGHT + 50) {
                gameStateRef.current = 'gameover';
                setGameState('gameover');
            }
            
            if (gameStateRef.current === 'playing') frameCountRef.current++;
        }
        
        // Draw platforms
        for (const plat of platforms) {
            const screenY = plat.y - cameraYRef.current;
            if (screenY < -20 || screenY > GAME_HEIGHT + 20) continue;
            
            if (plat.breaking) {
                // Breaking platform animation
                ctx.globalAlpha = 1 - (plat.breakTimer || 0) / 10;
                ctx.fillStyle = '#8B4513';
                const offset1 = (plat.breakTimer || 0) * 2;
                const offset2 = (plat.breakTimer || 0) * -1.5;
                ctx.fillRect(plat.x - plat.width / 2, screenY + offset1, plat.width / 2 - 5, 14);
                ctx.fillRect(plat.x + 5, screenY + offset2, plat.width / 2 - 5, 14);
                ctx.globalAlpha = 1;
            } else if (plat.type === 'breaking') {
                // Fragile platform (cracked appearance)
                ctx.fillStyle = '#A0522D';
                ctx.fillRect(plat.x - plat.width / 2, screenY, plat.width, 14);
                // Cracks
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(plat.x - 10, screenY);
                ctx.lineTo(plat.x, screenY + 14);
                ctx.moveTo(plat.x + 5, screenY);
                ctx.lineTo(plat.x - 5, screenY + 14);
                ctx.stroke();
                // Snow (less)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillRect(plat.x - plat.width / 2, screenY - 2, plat.width * 0.6, 4);
            } else {
                // Normal platform
                ctx.fillStyle = '#6B4423';
                ctx.fillRect(plat.x - plat.width / 2, screenY, plat.width, 14);
                // Highlight
                ctx.fillStyle = '#8B5A2B';
                ctx.fillRect(plat.x - plat.width / 2, screenY, plat.width, 5);
                // Snow on top
                ctx.fillStyle = 'white';
                ctx.fillRect(plat.x - plat.width / 2, screenY - 4, plat.width, 6);
                // Snow detail
                ctx.fillStyle = '#E8E8E8';
                ctx.beginPath();
                ctx.arc(plat.x - plat.width / 4, screenY - 2, 4, 0, Math.PI * 2);
                ctx.arc(plat.x + plat.width / 4, screenY - 3, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw falling rocks
        for (const rock of rocks) {
            const screenY = rock.y - cameraYRef.current;
            if (screenY < -30 || screenY > GAME_HEIGHT + 30) continue;
            
            // Rock with shading
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(rock.x, screenY, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(rock.x - 4, screenY - 4, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#777';
            ctx.beginPath();
            ctx.arc(rock.x - 6, screenY - 6, 4, 0, Math.PI * 2);
            ctx.fill();
            // Danger indicator
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(rock.x, screenY, 22, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw puffle
        const screenPlayerY = player.y - cameraYRef.current;
        const stretchY = player.velocityY > 0 ? 1.1 : (player.velocityY < -5 ? 0.9 : 1);
        const stretchX = player.velocityY > 0 ? 0.9 : (player.velocityY < -5 ? 1.1 : 1);
        
        ctx.save();
        ctx.translate(player.x, screenPlayerY);
        ctx.scale(stretchX, stretchY);
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, PUFFLE_RADIUS + 5, PUFFLE_RADIUS * 0.7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Puffle body
        ctx.fillStyle = puffleColor;
        ctx.beginPath();
        ctx.arc(0, 0, PUFFLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        
        // Belly highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 5, PUFFLE_RADIUS * 0.6, PUFFLE_RADIUS * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes (looking in direction of movement)
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-6, -6, 7, 0, Math.PI * 2);
        ctx.arc(6, -6, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        const lookX = player.velocityX * 0.3;
        const lookY = player.velocityY > 0 ? 2 : -2;
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(-5 + lookX, -6 + lookY, 3.5, 0, Math.PI * 2);
        ctx.arc(7 + lookX, -6 + lookY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-7, -8, 2, 0, Math.PI * 2);
        ctx.arc(5, -8, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Blush
        ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-13, 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(13, 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // UI
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(10, 10, 100, 45);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('HEIGHT', 20, 28);
        ctx.font = 'bold 22px sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`${scoreRef.current}m`, 20, 50);
        
        // Ready screen
        if (gameStateRef.current === 'ready') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, GAME_HEIGHT / 2 - 80, GAME_WIDTH, 160);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🧗 CLIMBING TRAINING', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 35);
            ctx.font = '16px sans-serif';
            ctx.fillText('← → Arrow Keys to Move', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 5);
            ctx.fillStyle = '#FFE082';
            ctx.font = '14px sans-serif';
            ctx.fillText('Jump between platforms!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
            ctx.fillText('Avoid falling rocks!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
            ctx.fillStyle = '#FF8A80';
            ctx.font = '12px sans-serif';
            ctx.fillText('⚠️ Cracked platforms break!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 72);
        }
        
        if (gameStateRef.current === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
        
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [puffleColor, generatePlatforms]);
    
    const startGame = useCallback(() => {
        if (gameStateRef.current === 'ready') {
            playerRef.current = { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 100, velocityY: JUMP_STRENGTH, velocityX: 0 };
            platformsRef.current = generatePlatforms();
            rocksRef.current = [];
            cameraYRef.current = 0;
            maxHeightRef.current = 0;
            frameCountRef.current = 0;
            scoreRef.current = 0;
            setScore(0);
            setGameState('playing');
        }
    }, [generatePlatforms]);
    
    useEffect(() => {
        const handleKeyDown = (e) => {
            e.stopPropagation();
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
            if (e.code === 'Space' && gameStateRef.current === 'ready') startGame();
            if (e.code === 'Escape') onClose();
        };
        const handleKeyUp = (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
        };
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('keyup', handleKeyUp, true);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('keyup', handleKeyUp, true);
        };
    }, [startGame, onClose]);
    
    useEffect(() => {
        animationRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationRef.current);
    }, [gameLoop]);
    
    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                width={GAME_WIDTH}
                height={GAME_HEIGHT}
                onClick={startGame}
                className="rounded-lg cursor-pointer"
            />
            {gameState === 'gameover' && (
                <div className="absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-4xl mb-3">🧗</div>
                    <h2 className="text-2xl font-bold text-purple-400 mb-2">Training Complete!</h2>
                    <div className="text-white text-lg mb-1">Height: <span className="text-yellow-400 font-bold">{score}m</span></div>
                    <div className="text-green-400 text-sm mb-4">+{Math.min(score * 2, 30)} Climbing XP</div>
                    <button
                        onClick={() => onComplete('climbing', score)}
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:from-purple-400 hover:to-pink-400"
                    >
                        Collect Rewards
                    </button>
                </div>
            )}
        </div>
    );
};

// ==================== MAIN TRAINING GAME WRAPPER ====================
const PuffleTrainingGame = ({ stat, puffle, onComplete, onClose }) => {
    const handleComplete = useCallback((trainedStat, score) => {
        // Calculate XP gain based on score
        const xpGain = Math.min(score * 2, 30);
        onComplete(trainedStat, xpGain);
    }, [onComplete]);
    
    const gameConfig = {
        flying: { Component: FlyingGame, icon: '✈️', color: 'cyan' },
        running: { Component: RunningGame, icon: '🏃', color: 'orange' },
        swimming: { Component: SwimmingGame, icon: '🏊', color: 'blue' },
        climbing: { Component: ClimbingGame, icon: '🧗', color: 'purple' }
    };
    
    const config = gameConfig[stat] || gameConfig.flying;
    const GameComponent = config.Component;
    
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
                    <h1 className={`text-2xl font-bold text-${config.color}-400 retro-text`}>
                        {config.icon} {stat.toUpperCase()} TRAINING {config.icon}
                    </h1>
                    <p className="text-white/60 text-xs mt-1">Train {puffle?.name || 'your puffle'}</p>
                </div>
                
                <div className="p-3 bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border-2 border-white/20 shadow-2xl">
                    <GameComponent puffle={puffle} onComplete={handleComplete} onClose={onClose} />
                </div>
                
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center">
                    <p className="text-white/50 text-xs">ESC to exit</p>
                </div>
            </div>
        </div>
    );
};

export default PuffleTrainingGame;

