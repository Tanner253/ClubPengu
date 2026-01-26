/**
 * AvalancheRunGame - Endless runner where penguin slides down a mountain
 * Dodge obstacles, collect fish, survive as long as possible!
 * 
 * Features:
 * - Lane-based movement (3 lanes)
 * - Progressive difficulty (speed increases)
 * - Multiple obstacle types
 * - Double jump to clear obstacles
 * - Power-ups (shield, magnet, speed boost)
 * - Mobile swipe support
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Game constants
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const LANE_WIDTH = GAME_WIDTH / 3;
const PLAYER_SIZE = 40;
const GROUND_Y = GAME_HEIGHT - 120; // Player ground level
const GROUND_SPEED_INITIAL = 4;
const GROUND_SPEED_MAX = 12;
const JUMP_VELOCITY = 14;
const GRAVITY = 0.6;
const DOUBLE_JUMP_VELOCITY = 12;
const OBSTACLE_MIN_SPACING = 150; // Minimum Y distance between obstacles
const POWERUP_MIN_SPACING = 200;

// Obstacle types with proper hitbox sizes
const OBSTACLES = {
    ROCK: { emoji: '🪨', width: 40, height: 35 },
    TREE: { emoji: '🌲', width: 35, height: 50 },
    ICE_SPIKE: { emoji: '🔺', width: 25, height: 40 },
    SNOWMAN: { emoji: '⛄', width: 40, height: 45 },
};

// Power-up types
const POWERUPS = {
    SHIELD: { emoji: '🛡️', duration: 300, color: '#3498db' },
    MAGNET: { emoji: '🧲', duration: 200, color: '#9b59b6' },
    BOOST: { emoji: '⚡', duration: 150, color: '#f1c40f' },
};

const AvalancheRunGame = ({ onClose }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const lastTimeRef = useRef(0);
    
    // Game state
    const [gameState, setGameState] = useState('ready'); // 'ready', 'playing', 'gameover'
    const [displayScore, setDisplayScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('avalancheRunHighScore');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [fishCollected, setFishCollected] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    
    // Game refs (for animation loop - avoid React state in game loop)
    const gameStateRef = useRef('ready');
    const scoreRef = useRef(0);
    const playerRef = useRef({
        lane: 1, // 0, 1, 2 (left, center, right)
        x: GAME_WIDTH / 2,
        targetX: GAME_WIDTH / 2,
        // Player stays at fixed Y position (GROUND_Y), jumpHeight is separate
        jumpHeight: 0, // How high above ground (0 = on ground, positive = in air)
        velocityY: 0,
        isOnGround: true,
        hasDoubleJump: true,
        jumpCount: 0,
    });
    const obstaclesRef = useRef([]);
    const fishRef = useRef([]);
    const powerupsRef = useRef([]);
    const activeEffectsRef = useRef({
        shield: 0,
        magnet: 0,
        boost: 0,
    });
    const groundSpeedRef = useRef(GROUND_SPEED_INITIAL);
    const distanceRef = useRef(0);
    const groundOffsetRef = useRef(0);
    const lastObstacleYRef = useRef(100); // Start ready to spawn
    const lastPowerupYRef = useRef(0);
    const lastFishYRef = useRef(50); // Start ready to spawn
    const fishCollectedRef = useRef(0);
    
    const mountainsRef = useRef([
        { x: 0, height: 200 },
        { x: 150, height: 280 },
        { x: 300, height: 220 },
        { x: 450, height: 260 },
    ]);
    const snowParticlesRef = useRef([]);
    
    // Touch handling
    const touchStartRef = useRef({ x: 0, y: 0 });
    
    // Check for mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    // Sync game state
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);
    
    // Initialize snow particles
    useEffect(() => {
        const particles = [];
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * GAME_WIDTH,
                y: Math.random() * GAME_HEIGHT,
                size: 1 + Math.random() * 2,
                speed: 1 + Math.random() * 2,
            });
        }
        snowParticlesRef.current = particles;
    }, []);
    
    // Reset game
    const resetGame = useCallback(() => {
        playerRef.current = {
            lane: 1,
            x: GAME_WIDTH / 2,
            targetX: GAME_WIDTH / 2,
            jumpHeight: 0,
            velocityY: 0,
            isOnGround: true,
            hasDoubleJump: true,
            jumpCount: 0,
        };
        obstaclesRef.current = [];
        fishRef.current = [];
        powerupsRef.current = [];
        activeEffectsRef.current = { shield: 0, magnet: 0, boost: 0 };
        groundSpeedRef.current = GROUND_SPEED_INITIAL;
        distanceRef.current = 0;
        scoreRef.current = 0;
        lastObstacleYRef.current = 100; // Start ready to spawn
        lastPowerupYRef.current = 0;
        lastFishYRef.current = 50; // Start ready to spawn
        fishCollectedRef.current = 0;
        lastTimeRef.current = performance.now();
        setDisplayScore(0);
        setFishCollected(0);
        setGameState('playing');
    }, []);
    
    // Move to lane
    const moveToLane = useCallback((lane) => {
        if (gameStateRef.current !== 'playing') return;
        const clampedLane = Math.max(0, Math.min(2, lane));
        playerRef.current.lane = clampedLane;
        playerRef.current.targetX = LANE_WIDTH * clampedLane + LANE_WIDTH / 2;
    }, []);
    
    // Jump (supports double jump)
    // jumpHeight is positive (how high above ground), velocityY starts positive (going up)
    const jump = useCallback(() => {
        if (gameStateRef.current !== 'playing') return;
        const player = playerRef.current;
        
        if (player.isOnGround) {
            // First jump - positive velocity means going UP (increasing jumpHeight)
            player.velocityY = JUMP_VELOCITY;
            player.isOnGround = false;
            player.hasDoubleJump = true;
            player.jumpCount = 1;
        } else if (player.hasDoubleJump && player.jumpCount < 2) {
            // Double jump - boost upward velocity
            player.velocityY = DOUBLE_JUMP_VELOCITY;
            player.hasDoubleJump = false;
            player.jumpCount = 2;
        }
    }, []);
    
    // Game loop with delta time for consistent speed
    const gameLoop = useCallback((currentTime) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            animationRef.current = requestAnimationFrame(gameLoop);
            return;
        }
        
        // Calculate delta time (cap at 50ms to prevent huge jumps)
        const deltaTime = Math.min((currentTime - lastTimeRef.current) / 16.67, 3);
        lastTimeRef.current = currentTime;
        
        const ctx = canvas.getContext('2d');
        const player = playerRef.current;
        const obstacles = obstaclesRef.current;
        const fish = fishRef.current;
        const powerups = powerupsRef.current;
        const effects = activeEffectsRef.current;
        const speed = groundSpeedRef.current;
        
        // Clear and draw background
        const skyGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        skyGradient.addColorStop(0, '#1a1a2e');
        skyGradient.addColorStop(0.3, '#16213e');
        skyGradient.addColorStop(0.6, '#0f3460');
        skyGradient.addColorStop(1, '#e8f4f8');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Draw distant mountains
        ctx.fillStyle = '#2c3e50';
        mountainsRef.current.forEach(m => {
            ctx.beginPath();
            ctx.moveTo(m.x - 100, GAME_HEIGHT * 0.4);
            ctx.lineTo(m.x, GAME_HEIGHT * 0.4 - m.height);
            ctx.lineTo(m.x + 100, GAME_HEIGHT * 0.4);
            ctx.fill();
            
            // Snow cap
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath();
            ctx.moveTo(m.x - 30, GAME_HEIGHT * 0.4 - m.height + 50);
            ctx.lineTo(m.x, GAME_HEIGHT * 0.4 - m.height);
            ctx.lineTo(m.x + 30, GAME_HEIGHT * 0.4 - m.height + 50);
            ctx.fill();
            ctx.fillStyle = '#2c3e50';
        });
        
        // Draw slope
        const slopeGradient = ctx.createLinearGradient(0, GAME_HEIGHT * 0.35, 0, GAME_HEIGHT);
        slopeGradient.addColorStop(0, '#dfe6e9');
        slopeGradient.addColorStop(0.5, '#b2bec3');
        slopeGradient.addColorStop(1, '#636e72');
        ctx.fillStyle = slopeGradient;
        ctx.fillRect(0, GAME_HEIGHT * 0.35, GAME_WIDTH, GAME_HEIGHT * 0.65);
        
        // Moving snow lines
        if (gameStateRef.current === 'playing') {
            groundOffsetRef.current = (groundOffsetRef.current + speed * deltaTime) % 40;
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        for (let y = GAME_HEIGHT * 0.4 + groundOffsetRef.current; y < GAME_HEIGHT; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_WIDTH, y - 20);
            ctx.stroke();
        }
        
        // Lane indicators
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(LANE_WIDTH, GAME_HEIGHT * 0.4);
        ctx.lineTo(LANE_WIDTH, GAME_HEIGHT);
        ctx.moveTo(LANE_WIDTH * 2, GAME_HEIGHT * 0.4);
        ctx.lineTo(LANE_WIDTH * 2, GAME_HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Update and draw snow particles
        ctx.fillStyle = 'white';
        const time = currentTime * 0.001;
        snowParticlesRef.current.forEach(p => {
            if (gameStateRef.current === 'playing') {
                p.y += (p.speed + speed * 0.2) * deltaTime;
                p.x += Math.sin(time + p.y * 0.01) * 0.3;
                if (p.y > GAME_HEIGHT) {
                    p.y = -10;
                    p.x = Math.random() * GAME_WIDTH;
                }
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Game logic (only when playing)
        if (gameStateRef.current === 'playing') {
            const moveAmount = speed * deltaTime;
            distanceRef.current += moveAmount;
            
            // Increase speed over time (based on distance, not frames)
            if (effects.boost > 0) {
                groundSpeedRef.current = Math.min(GROUND_SPEED_MAX * 1.3, speed + 0.05 * deltaTime);
            } else {
                const targetSpeed = Math.min(GROUND_SPEED_MAX, GROUND_SPEED_INITIAL + distanceRef.current * 0.0005);
                groundSpeedRef.current = speed + (targetSpeed - speed) * 0.01;
            }
            
            // Decrease effect timers
            if (effects.shield > 0) effects.shield -= deltaTime;
            if (effects.magnet > 0) effects.magnet -= deltaTime;
            if (effects.boost > 0) effects.boost -= deltaTime;
            
            // Spawn obstacles - track distance traveled since last spawn
            const spawnY = -50;
            lastObstacleYRef.current += moveAmount;
            lastFishYRef.current += moveAmount;
            lastPowerupYRef.current += moveAmount;
            
            // Spawn obstacles when enough distance has passed
            if (lastObstacleYRef.current > OBSTACLE_MIN_SPACING + Math.random() * 100) {
                const obstacleTypes = Object.keys(OBSTACLES);
                const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
                const lane = Math.floor(Math.random() * 3);
                
                // Make sure not spawning on top of existing obstacle in same lane
                const canSpawn = !obstacles.some(o => o.lane === lane && o.y < 100);
                if (canSpawn) {
                    obstacles.push({
                        type,
                        ...OBSTACLES[type],
                        x: LANE_WIDTH * lane + LANE_WIDTH / 2,
                        y: spawnY,
                        lane,
                    });
                    lastObstacleYRef.current = 0; // Reset distance tracker
                }
            }
            
            // Spawn fish when enough distance has passed
            if (lastFishYRef.current > 80 + Math.random() * 60) {
                const lane = Math.floor(Math.random() * 3);
                const canSpawn = !fish.some(f => f.lane === lane && f.y < 80);
                if (canSpawn) {
                    fish.push({
                        x: LANE_WIDTH * lane + LANE_WIDTH / 2,
                        y: spawnY,
                        lane,
                    });
                    lastFishYRef.current = 0; // Reset distance tracker
                }
            }
            
            // Spawn powerups (rare, with spacing)
            if (lastPowerupYRef.current > POWERUP_MIN_SPACING && Math.random() < 0.008) {
                const powerupTypes = Object.keys(POWERUPS);
                const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
                const lane = Math.floor(Math.random() * 3);
                const canSpawn = !powerups.some(p => p.lane === lane && p.y < 150);
                if (canSpawn) {
                    powerups.push({
                        type,
                        ...POWERUPS[type],
                        x: LANE_WIDTH * lane + LANE_WIDTH / 2,
                        y: spawnY,
                        lane,
                    });
                    lastPowerupYRef.current = 0; // Reset distance tracker
                }
            }
            
            // Update obstacles
            for (let i = obstacles.length - 1; i >= 0; i--) {
                obstacles[i].y += moveAmount;
                
                // Remove off-screen
                if (obstacles[i].y > GAME_HEIGHT + 50) {
                    obstacles.splice(i, 1);
                    scoreRef.current += 10;
                    continue;
                }
                
                // Collision detection - obstacles are at ground level
                const obs = obstacles[i];
                
                // Only check collision when obstacle is in the collision zone (near player)
                // Obstacle is at GROUND_Y when obs.y reaches that point
                const obstacleInCollisionZone = obs.y > GROUND_Y - 30 && obs.y < GROUND_Y + 40;
                if (!obstacleInCollisionZone) continue;
                
                // Check horizontal overlap (same lane)
                const playerLeft = player.x - PLAYER_SIZE / 2 + 8;
                const playerRight = player.x + PLAYER_SIZE / 2 - 8;
                const obsLeft = obs.x - obs.width / 2 + 5;
                const obsRight = obs.x + obs.width / 2 - 5;
                const horizontalOverlap = playerRight > obsLeft && playerLeft < obsRight;
                
                if (!horizontalOverlap) continue;
                
                // KEY: Check if player jumped HIGH enough to clear the obstacle
                // jumpHeight is how high above ground the player is
                // If jumpHeight > obstacle height, player clears it!
                const playerClearedObstacle = player.jumpHeight > obs.height - 10;
                
                if (!playerClearedObstacle) {
                    // Collision! Player didn't jump high enough
                    if (effects.shield > 0) {
                        effects.shield = 0;
                        obstacles.splice(i, 1);
                        scoreRef.current += 25;
                    } else {
                        // Game over
                        if (scoreRef.current > highScore) {
                            setHighScore(scoreRef.current);
                            localStorage.setItem('avalancheRunHighScore', scoreRef.current.toString());
                        }
                        setDisplayScore(scoreRef.current);
                        setGameState('gameover');
                    }
                }
            }
            
            // Update fish
            for (let i = fish.length - 1; i >= 0; i--) {
                fish[i].y += moveAmount;
                
                // Magnet effect - pull toward player's ground position
                if (effects.magnet > 0) {
                    const dx = player.x - fish[i].x;
                    const dy = GROUND_Y - fish[i].y;
                    fish[i].x += dx * 0.08;
                    fish[i].y += dy * 0.03;
                }
                
                // Remove off-screen
                if (fish[i].y > GAME_HEIGHT + 30) {
                    fish.splice(i, 1);
                    continue;
                }
                
                // Collection - fish are collected when near player (regardless of jump)
                const collectDist = effects.magnet > 0 ? 70 : 35;
                const fishNearPlayer = Math.abs(player.x - fish[i].x) < collectDist && 
                                       Math.abs(GROUND_Y - fish[i].y) < collectDist + player.jumpHeight;
                if (fishNearPlayer) {
                    fish.splice(i, 1);
                    scoreRef.current += 25;
                    fishCollectedRef.current++;
                }
            }
            
            // Update powerups
            for (let i = powerups.length - 1; i >= 0; i--) {
                powerups[i].y += moveAmount;
                
                if (powerups[i].y > GAME_HEIGHT + 30) {
                    powerups.splice(i, 1);
                    continue;
                }
                
                // Collection
                const powerupNearPlayer = Math.abs(player.x - powerups[i].x) < 45 && 
                                          Math.abs(GROUND_Y - powerups[i].y) < 45 + player.jumpHeight;
                if (powerupNearPlayer) {
                    const pType = powerups[i].type;
                    effects[pType.toLowerCase()] = POWERUPS[pType].duration;
                    powerups.splice(i, 1);
                    scoreRef.current += 100;
                }
            }
            
            // Update player horizontal position (smooth lane change)
            player.x += (player.targetX - player.x) * 0.15 * deltaTime;
            
            // Update player jump height (physics-based)
            if (!player.isOnGround) {
                player.velocityY -= GRAVITY * deltaTime; // Velocity decreases (gravity pulls down)
                player.jumpHeight += player.velocityY * deltaTime;
                
                // Land on ground
                if (player.jumpHeight <= 0) {
                    player.jumpHeight = 0;
                    player.velocityY = 0;
                    player.isOnGround = true;
                    player.hasDoubleJump = true;
                    player.jumpCount = 0;
                }
            }
            
            // Score based on distance
            scoreRef.current = Math.floor(distanceRef.current * 0.5) + fishCollectedRef.current * 25;
        }
        
        // Draw obstacles
        obstacles.forEach(obs => {
            ctx.font = `${Math.min(obs.height, 45)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(obs.emoji, obs.x, obs.y);
        });
        
        // Draw fish
        fish.forEach(f => {
            ctx.font = '26px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🐟', f.x, f.y);
        });
        
        // Draw powerups
        powerups.forEach(p => {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.emoji, p.x, p.y);
            ctx.shadowBlur = 0;
        });
        
        // Draw player
        // Player visual Y position (GROUND_Y minus jump height)
        const playerVisualY = GROUND_Y - player.jumpHeight;
        
        // Shadow on ground (gets smaller when jumping higher)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        const shadowScale = Math.max(0.3, 1 - player.jumpHeight / 150);
        ctx.beginPath();
        ctx.ellipse(player.x, GROUND_Y + 15, 18 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Shield effect
        if (effects.shield > 0) {
            ctx.strokeStyle = `rgba(52, 152, 219, ${0.5 + Math.sin(time * 4) * 0.3})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(player.x, playerVisualY, 30, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Magnet effect
        if (effects.magnet > 0) {
            ctx.fillStyle = `rgba(155, 89, 182, ${0.2 + Math.sin(time * 5) * 0.1})`;
            ctx.beginPath();
            ctx.arc(player.x, playerVisualY, 50 + Math.sin(time * 3) * 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Boost trail
        if (effects.boost > 0) {
            ctx.fillStyle = `rgba(241, 196, 15, 0.4)`;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(
                    player.x + Math.sin(time * 5 + i) * 15,
                    playerVisualY + 25 + i * 8,
                    4 - i * 0.8,
                    0, Math.PI * 2
                );
                ctx.fill();
            }
        }
        
        // Penguin
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐧', player.x, playerVisualY);
        
        // Jump indicator (show double jump available)
        if (!player.isOnGround && player.hasDoubleJump) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '12px monospace';
            ctx.fillText('↑↑', player.x, playerVisualY - 30);
        }
        
        // Debug: Show jump height
        if (player.jumpHeight > 0) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.font = '10px monospace';
            ctx.fillText(`Height: ${Math.round(player.jumpHeight)}`, player.x, playerVisualY - 45);
        }
        
        // UI - Score
        ctx.fillStyle = 'white';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(`Score: ${scoreRef.current}`, 15, 15);
        ctx.font = '14px monospace';
        ctx.fillText(`🐟 ${fishCollectedRef.current}`, 15, 42);
        ctx.fillText(`⚡ ${Math.floor(groundSpeedRef.current * 10)}km/h`, 15, 60);
        ctx.shadowBlur = 0;
        
        // Active effects
        let effectY = 15;
        ctx.textAlign = 'right';
        if (effects.shield > 0) {
            ctx.fillStyle = '#3498db';
            ctx.fillText(`🛡️ ${Math.ceil(effects.shield / 60)}s`, GAME_WIDTH - 15, effectY);
            effectY += 20;
        }
        if (effects.magnet > 0) {
            ctx.fillStyle = '#9b59b6';
            ctx.fillText(`🧲 ${Math.ceil(effects.magnet / 60)}s`, GAME_WIDTH - 15, effectY);
            effectY += 20;
        }
        if (effects.boost > 0) {
            ctx.fillStyle = '#f1c40f';
            ctx.fillText(`⚡ ${Math.ceil(effects.boost / 60)}s`, GAME_WIDTH - 15, effectY);
        }
        
        // Ready screen
        if (gameStateRef.current === 'ready') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ff6b35';
            ctx.font = 'bold 28px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('AVALANCHE RUN', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80);
            
            ctx.fillStyle = 'white';
            ctx.font = '14px monospace';
            ctx.fillText('Dodge obstacles!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 35);
            ctx.fillText('Collect fish for points!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10);
            ctx.fillText('SPACE to jump (press twice!)', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15);
            
            ctx.fillStyle = '#3498db';
            ctx.font = '14px monospace';
            ctx.fillText('TAP or SPACE to start', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);
            
            ctx.fillStyle = '#f1c40f';
            ctx.font = '18px monospace';
            ctx.fillText(`High Score: ${highScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100);
        }
        
        // Update display score periodically (not every frame)
        if (gameStateRef.current === 'playing' && Math.random() < 0.1) {
            setDisplayScore(scoreRef.current);
            setFishCollected(fishCollectedRef.current);
        }
        
        animationRef.current = requestAnimationFrame(gameLoop);
    }, [highScore]);
    
    // Start game loop
    useEffect(() => {
        lastTimeRef.current = performance.now();
        animationRef.current = requestAnimationFrame(gameLoop);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [gameLoop]);
    
    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            if (e.code === 'Escape') {
                onClose();
                return;
            }
            
            if (gameStateRef.current === 'ready') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    resetGame();
                }
                return;
            }
            
            if (gameStateRef.current === 'gameover') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    resetGame();
                }
                return;
            }
            
            // Playing controls
            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    moveToLane(playerRef.current.lane - 1);
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    moveToLane(playerRef.current.lane + 1);
                    break;
                case 'ArrowUp':
                case 'KeyW':
                case 'Space':
                    jump();
                    break;
                default:
                    break;
            }
        };
        
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [onClose, resetGame, moveToLane, jump]);
    
    // Touch controls
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const handleTouchStart = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartRef.current = { x: touch.clientX, y: touch.clientY };
            
            if (gameStateRef.current !== 'playing') {
                resetGame();
            }
        };
        
        const handleTouchEnd = (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const dx = touch.clientX - touchStartRef.current.x;
            const dy = touch.clientY - touchStartRef.current.y;
            
            if (gameStateRef.current !== 'playing') return;
            
            // Detect swipe vs tap
            if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
                // Tap - jump
                jump();
            } else if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal swipe
                if (dx > 30) {
                    moveToLane(playerRef.current.lane + 1);
                } else if (dx < -30) {
                    moveToLane(playerRef.current.lane - 1);
                }
            } else if (dy < -30) {
                // Swipe up - jump
                jump();
            }
        };
        
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, [resetGame, moveToLane, jump]);
    
    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 overflow-auto">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500 hover:bg-red-400 text-white text-xl sm:text-2xl font-bold shadow-lg transition-all z-20"
            >
                ✕
            </button>
            
            {/* Title */}
            <div className="text-center mb-2 sm:mb-4 flex-shrink-0">
                <h1 className="text-xl sm:text-3xl font-bold text-orange-400 retro-text tracking-wider">
                    🏔️ AVALANCHE RUN 🐧
                </h1>
                <p className="text-white/60 text-xs sm:text-sm mt-1">
                    High Score: {highScore}
                </p>
            </div>
            
            {/* Game container */}
            <div className="relative p-2 sm:p-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border-4 border-orange-500/50 shadow-2xl">
                <canvas
                    ref={canvasRef}
                    width={GAME_WIDTH}
                    height={GAME_HEIGHT}
                    className="rounded touch-none"
                    style={{ 
                        maxWidth: '90vw', 
                        maxHeight: isMobile ? '65vh' : '75vh',
                        width: 'auto',
                        height: 'auto'
                    }}
                />
                
                {/* Game Over Overlay */}
                {gameState === 'gameover' && (
                    <div className="absolute inset-2 sm:inset-4 bg-black/85 rounded flex flex-col items-center justify-center">
                        <div className="text-5xl mb-4">💥</div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-red-400 mb-2 retro-text">
                            WIPEOUT!
                        </h2>
                        <div className="text-white text-xl mb-1">
                            Score: <span className="text-orange-400 font-bold">{displayScore}</span>
                        </div>
                        <div className="text-white/70 text-sm mb-1">
                            Fish: 🐟 {fishCollected}
                        </div>
                        <div className="text-white/70 text-sm mb-4">
                            Best: <span className="text-yellow-400">{Math.max(displayScore, highScore)}</span>
                        </div>
                        {displayScore > highScore && displayScore > 0 && (
                            <div className="text-yellow-400 text-sm mb-4 animate-pulse">
                                ⭐ NEW HIGH SCORE! ⭐
                            </div>
                        )}
                        <button
                            onClick={resetGame}
                            className="px-6 py-3 bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold rounded-lg shadow-lg text-lg"
                        >
                            🔄 PLAY AGAIN
                        </button>
                        {!isMobile && <p className="text-white/50 text-xs mt-3">or press SPACE</p>}
                    </div>
                )}
                
                {/* Mobile buttons */}
                {isMobile && gameState === 'playing' && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-between px-4">
                        <button
                            className="w-16 h-16 bg-white/20 rounded-full text-3xl active:bg-white/40"
                            onClick={() => moveToLane(playerRef.current.lane - 1)}
                        >
                            ←
                        </button>
                        <button
                            className="w-16 h-16 bg-orange-500/50 rounded-full text-2xl active:bg-orange-500/80"
                            onClick={jump}
                        >
                            ⬆️
                        </button>
                        <button
                            className="w-16 h-16 bg-white/20 rounded-full text-3xl active:bg-white/40"
                            onClick={() => moveToLane(playerRef.current.lane + 1)}
                        >
                            →
                        </button>
                    </div>
                )}
            </div>
            
            {/* Controls hint */}
            <div className="mt-2 sm:mt-4 text-center flex-shrink-0">
                <p className="text-white/60 text-xs">
                    {isMobile 
                        ? 'Swipe to move • Tap to jump • Tap again to double jump!'
                        : 'A/D or ←/→ to move • SPACE to jump • SPACE again to double jump!'
                    }
                </p>
            </div>
        </div>
    );
};

export default AvalancheRunGame;
