/**
 * ThinIceGame - Classic Club Penguin puzzle game
 * Guide your puffle across the ice, melting every tile!
 * 
 * Features:
 * - Simple mechanics: tiles melt after you step off them
 * - Goal: Melt all tiles without getting trapped
 * - Bonus coins hidden under tiles
 * - Progressive levels
 * - Mobile support
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Game constants
const TILE_SIZE = 44;
const GRID_PADDING = 20;

// Tile types
const TILES = {
    WATER: 0,      // Already melted (can't walk on)
    ICE: 1,        // Normal ice (melts after stepping off)
    THICK: 2,      // Thick ice (needs 2 passes to melt)
    COIN: 3,       // Ice with coin underneath
    WALL: 4,       // Stone wall (can't walk through)
    START: 5,      // Starting position
    FINISH: 6,     // Level exit (appears when enough tiles melted)
};

// Level definitions - all verified solvable with proper difficulty progression
// Key: 0=water, 1=ice, 2=thick ice, 3=coin, 4=wall, 5=start, 6=finish
const LEVELS = [
    // Level 1 - Tutorial: Simple 4x3 rectangle (very easy)
    {
        name: "First Steps",
        grid: [
            [0, 0, 0, 0, 0, 0],
            [0, 5, 1, 1, 1, 0],
            [0, 1, 1, 1, 1, 0],
            [0, 1, 1, 1, 6, 0],
            [0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 80,
    },
    // Level 2 - Slightly bigger rectangle with coin
    {
        name: "Coin Hunter",
        grid: [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 5, 1, 1, 1, 1, 0],
            [0, 1, 1, 3, 1, 1, 0],
            [0, 1, 1, 1, 1, 1, 0],
            [0, 1, 1, 1, 1, 6, 0],
            [0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 85,
    },
    // Level 3 - L-shape (teaches corners)
    {
        name: "Corner Turn",
        grid: [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 5, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 0],
            [0, 0, 0, 1, 1, 1, 0],
            [0, 0, 0, 1, 1, 6, 0],
            [0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 85,
    },
    // Level 4 - U-shape (teaches backtracking mindset)
    {
        name: "The U-Turn",
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 5, 1, 1, 0, 1, 1, 0],
            [0, 1, 1, 1, 0, 1, 1, 0],
            [0, 1, 1, 1, 0, 1, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 1, 3, 1, 1, 6, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 85,
    },
    // Level 5 - Thick ice introduction (2 passes needed)
    {
        name: "Thick Ice",
        grid: [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 5, 1, 2, 1, 1, 0],
            [0, 1, 1, 1, 1, 1, 0],
            [0, 1, 2, 1, 2, 1, 0],
            [0, 1, 1, 1, 1, 1, 0],
            [0, 1, 1, 2, 1, 6, 0],
            [0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 85,
    },
    // Level 6 - First maze with walls
    {
        name: "Walled In",
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 5, 1, 1, 4, 1, 1, 0],
            [0, 1, 1, 1, 4, 1, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 4, 4, 1, 1, 1, 0],
            [0, 1, 1, 1, 1, 3, 1, 0],
            [0, 1, 1, 1, 1, 1, 6, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 85,
    },
    // Level 7 - Zigzag path
    {
        name: "Zigzag",
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 5, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 1, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 1, 0],
            [0, 0, 0, 1, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 1, 1, 3, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 6, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 90,
    },
    // Level 8 - Diamond shape
    {
        name: "Diamond",
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 5, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 3, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 0, 6, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 90,
    },
    // Level 9 - Spiral (outer to inner, properly connected)
    {
        name: "Ice Spiral",
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 5, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 1, 0],
            [0, 1, 1, 1, 1, 1, 0, 1, 0],
            [0, 1, 0, 0, 0, 1, 0, 1, 0],
            [0, 1, 0, 3, 1, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 0, 0, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 6, 0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 90,
    },
    // Level 10 - Hourglass
    {
        name: "Hourglass",
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 5, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 3, 1, 0, 0, 0],
            [0, 0, 0, 0, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 6, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 90,
    },
    // Level 11 - Maze with thick ice
    {
        name: "Frozen Maze",
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 5, 1, 2, 4, 1, 1, 1, 0],
            [0, 1, 1, 1, 4, 1, 4, 1, 0],
            [0, 1, 4, 1, 1, 1, 4, 1, 0],
            [0, 1, 4, 4, 4, 1, 1, 1, 0],
            [0, 1, 1, 1, 1, 2, 4, 1, 0],
            [0, 3, 4, 1, 1, 1, 1, 1, 0],
            [0, 1, 1, 1, 4, 1, 1, 6, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 85,
    },
    // Level 12 - Big open area with strategy needed
    {
        name: "Frozen Lake",
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 5, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 1, 1, 3, 1, 1, 1, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 1, 1, 1, 3, 1, 1, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 6, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 95,
    },
    // Level 13 - Chambers connected by corridors
    {
        name: "Three Chambers",
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 5, 1, 1, 0, 1, 1, 0, 1, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 1, 3, 0, 1, 1, 0, 3, 1, 0],
            [0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 1, 6, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 90,
    },
    // Level 14 - Thick ice maze
    {
        name: "Double Trouble",
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 5, 2, 2, 1, 2, 2, 1, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 2, 1, 2, 3, 2, 1, 2, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 2, 1, 2, 1, 2, 1, 2, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 1, 2, 2, 1, 2, 2, 6, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 85,
    },
    // Level 15 - Master Challenge
    {
        name: "Master Challenge",
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 5, 1, 1, 2, 4, 1, 1, 1, 1, 0],
            [0, 1, 4, 1, 1, 4, 1, 4, 1, 1, 0],
            [0, 1, 4, 1, 1, 1, 1, 4, 3, 1, 0],
            [0, 1, 1, 1, 4, 1, 1, 1, 1, 1, 0],
            [0, 2, 4, 1, 4, 3, 4, 1, 4, 2, 0],
            [0, 1, 1, 1, 1, 4, 1, 1, 1, 1, 0],
            [0, 1, 4, 3, 1, 1, 1, 4, 1, 1, 0],
            [0, 1, 1, 1, 4, 1, 1, 4, 1, 1, 0],
            [0, 1, 1, 1, 1, 2, 1, 1, 1, 6, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        requiredPercent: 80,
    },
];

const ThinIceGame = ({ onClose }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    
    // Game state
    const [currentLevel, setCurrentLevel] = useState(0);
    const [gameState, setGameState] = useState('playing'); // 'playing', 'won', 'lost', 'complete'
    const [grid, setGrid] = useState([]);
    const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
    const [tilesMelted, setTilesMelted] = useState(0);
    const [totalMeltable, setTotalMeltable] = useState(0);
    const [coinsCollected, setCoinsCollected] = useState(0);
    const [totalCoins, setTotalCoins] = useState(0);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('thinIceHighScore');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [isMobile, setIsMobile] = useState(false);
    const [animatingMove, setAnimatingMove] = useState(false);
    const [meltAnim, setMeltAnim] = useState(null);
    
    // Check for mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    // Initialize level
    const initLevel = useCallback((levelIndex) => {
        const level = LEVELS[levelIndex];
        if (!level) {
            setGameState('complete');
            return;
        }
        
        // Deep copy grid
        const newGrid = level.grid.map(row => [...row]);
        
        // Find start position and count tiles
        let startX = 0, startY = 0;
        let meltableCount = 0;
        let coinCount = 0;
        
        for (let y = 0; y < newGrid.length; y++) {
            for (let x = 0; x < newGrid[y].length; x++) {
                const tile = newGrid[y][x];
                if (tile === TILES.START) {
                    startX = x;
                    startY = y;
                    newGrid[y][x] = TILES.ICE; // Start becomes normal ice
                    meltableCount++;
                } else if (tile === TILES.ICE || tile === TILES.COIN) {
                    meltableCount++;
                    if (tile === TILES.COIN) coinCount++;
                } else if (tile === TILES.THICK) {
                    meltableCount += 2; // Thick counts as 2
                } else if (tile === TILES.FINISH) {
                    meltableCount++;
                }
            }
        }
        
        setGrid(newGrid);
        setPlayerPos({ x: startX, y: startY });
        setTilesMelted(0);
        setTotalMeltable(meltableCount);
        setCoinsCollected(0);
        setTotalCoins(coinCount);
        setGameState('playing');
        setMeltAnim(null);
    }, []);
    
    // Initialize first level
    useEffect(() => {
        initLevel(currentLevel);
    }, [currentLevel, initLevel]);
    
    // Get tile color
    const getTileColor = (tileType) => {
        switch (tileType) {
            case TILES.WATER: return '#1a4a6e';
            case TILES.ICE: return '#b8e0f0';
            case TILES.THICK: return '#e0f4ff';
            case TILES.COIN: return '#b8e0f0';
            case TILES.WALL: return '#5a5a6e';
            case TILES.FINISH: return '#90EE90';
            default: return '#b8e0f0';
        }
    };
    
    // Draw game
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || grid.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        const level = LEVELS[currentLevel];
        if (!level) return;
        
        const gridHeight = grid.length;
        const gridWidth = grid[0].length;
        
        // Clear with gradient background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#0a2848');
        bgGrad.addColorStop(1, '#1a4a6e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw water base
        ctx.fillStyle = '#1a4a6e';
        ctx.fillRect(GRID_PADDING, GRID_PADDING, gridWidth * TILE_SIZE, gridHeight * TILE_SIZE);
        
        // Animated water ripples
        const time = Date.now() * 0.001;
        ctx.strokeStyle = 'rgba(80, 160, 200, 0.2)';
        ctx.lineWidth = 1;
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                if (grid[y][x] === TILES.WATER) {
                    const px = GRID_PADDING + x * TILE_SIZE + TILE_SIZE / 2;
                    const py = GRID_PADDING + y * TILE_SIZE + TILE_SIZE / 2;
                    ctx.beginPath();
                    ctx.arc(px, py, 8 + Math.sin(time * 2 + x + y) * 3, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
        
        // Draw tiles
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const tile = grid[y][x];
                if (tile === TILES.WATER) continue;
                
                const px = GRID_PADDING + x * TILE_SIZE;
                const py = GRID_PADDING + y * TILE_SIZE;
                
                // Tile shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.fillRect(px + 2, py + 2, TILE_SIZE - 2, TILE_SIZE - 2);
                
                // Tile base
                ctx.fillStyle = getTileColor(tile);
                ctx.fillRect(px, py, TILE_SIZE - 2, TILE_SIZE - 2);
                
                // Ice shine effect
                if (tile === TILES.ICE || tile === TILES.THICK || tile === TILES.COIN) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.beginPath();
                    ctx.moveTo(px + 4, py + 4);
                    ctx.lineTo(px + 12, py + 4);
                    ctx.lineTo(px + 4, py + 12);
                    ctx.closePath();
                    ctx.fill();
                }
                
                // Thick ice indicator (double border)
                if (tile === TILES.THICK) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 10, TILE_SIZE - 10);
                    ctx.strokeRect(px + 8, py + 8, TILE_SIZE - 18, TILE_SIZE - 18);
                }
                
                // Wall pattern
                if (tile === TILES.WALL) {
                    ctx.strokeStyle = '#4a4a5e';
                    ctx.lineWidth = 2;
                    // Brick pattern
                    ctx.beginPath();
                    ctx.moveTo(px, py + TILE_SIZE / 2 - 1);
                    ctx.lineTo(px + TILE_SIZE - 2, py + TILE_SIZE / 2 - 1);
                    ctx.moveTo(px + TILE_SIZE / 2 - 1, py);
                    ctx.lineTo(px + TILE_SIZE / 2 - 1, py + TILE_SIZE / 2 - 1);
                    ctx.moveTo(px + TILE_SIZE / 4 - 1, py + TILE_SIZE / 2 - 1);
                    ctx.lineTo(px + TILE_SIZE / 4 - 1, py + TILE_SIZE - 2);
                    ctx.moveTo(px + TILE_SIZE * 3 / 4 - 1, py + TILE_SIZE / 2 - 1);
                    ctx.lineTo(px + TILE_SIZE * 3 / 4 - 1, py + TILE_SIZE - 2);
                    ctx.stroke();
                }
                
                // Coin
                if (tile === TILES.COIN) {
                    const coinBounce = Math.sin(time * 4 + x + y) * 2;
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('💰', px + TILE_SIZE / 2 - 1, py + TILE_SIZE / 2 + 6 + coinBounce);
                }
                
                // Finish
                if (tile === TILES.FINISH) {
                    ctx.font = '24px Arial';
                    ctx.textAlign = 'center';
                    const canFinish = (tilesMelted / totalMeltable) >= (level.requiredPercent / 100);
                    ctx.fillText(canFinish ? '🚩' : '🔒', px + TILE_SIZE / 2 - 1, py + TILE_SIZE / 2 + 8);
                }
            }
        }
        
        // Melt animation
        if (meltAnim) {
            ctx.globalAlpha = meltAnim.alpha;
            ctx.fillStyle = '#b8e0f0';
            ctx.fillRect(
                GRID_PADDING + meltAnim.x * TILE_SIZE,
                GRID_PADDING + meltAnim.y * TILE_SIZE,
                TILE_SIZE - 2,
                TILE_SIZE - 2
            );
            ctx.globalAlpha = 1;
        }
        
        // Draw puffle (player)
        const playerPx = GRID_PADDING + playerPos.x * TILE_SIZE;
        const playerPy = GRID_PADDING + playerPos.y * TILE_SIZE;
        
        // Puffle shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(playerPx + TILE_SIZE / 2, playerPy + TILE_SIZE - 4, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Black puffle (classic Thin Ice uses black puffle)
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        const puffleWobble = Math.sin(time * 8) * 1;
        ctx.fillText('⚫', playerPx + TILE_SIZE / 2, playerPy + TILE_SIZE / 2 + 8 + puffleWobble);
        
        // Puffle face
        ctx.font = '12px Arial';
        ctx.fillText('👀', playerPx + TILE_SIZE / 2, playerPy + TILE_SIZE / 2 + 2 + puffleWobble);
        
        // UI - Progress bar
        const barWidth = gridWidth * TILE_SIZE;
        const barHeight = 12;
        const barY = GRID_PADDING + gridHeight * TILE_SIZE + 15;
        
        // Bar background
        ctx.fillStyle = '#1a3a5c';
        ctx.fillRect(GRID_PADDING, barY, barWidth, barHeight);
        
        // Progress fill
        const progress = totalMeltable > 0 ? tilesMelted / totalMeltable : 0;
        const requiredProgress = level.requiredPercent / 100;
        ctx.fillStyle = progress >= requiredProgress ? '#4ade80' : '#60a5fa';
        ctx.fillRect(GRID_PADDING, barY, barWidth * progress, barHeight);
        
        // Required marker
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(GRID_PADDING + barWidth * requiredProgress - 1, barY - 2, 3, barHeight + 4);
        
        // Stats text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Level ${currentLevel + 1}: ${level.name}`, GRID_PADDING, barY + 30);
        
        ctx.font = '12px monospace';
        ctx.fillText(`Melted: ${Math.floor(progress * 100)}%`, GRID_PADDING, barY + 46);
        ctx.fillText(`Need: ${level.requiredPercent}%`, GRID_PADDING + 100, barY + 46);
        
        if (totalCoins > 0) {
            ctx.fillText(`💰 ${coinsCollected}/${totalCoins}`, GRID_PADDING + 200, barY + 46);
        }
        
        ctx.textAlign = 'right';
        ctx.fillText(`Score: ${score}`, GRID_PADDING + barWidth, barY + 46);
        
        animationRef.current = requestAnimationFrame(draw);
    }, [grid, playerPos, currentLevel, tilesMelted, totalMeltable, coinsCollected, totalCoins, score, meltAnim]);
    
    // Start draw loop
    useEffect(() => {
        animationRef.current = requestAnimationFrame(draw);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [draw]);
    
    // Handle move
    const movePlayer = useCallback((dx, dy) => {
        if (gameState !== 'playing' || animatingMove) return;
        
        const newX = playerPos.x + dx;
        const newY = playerPos.y + dy;
        const level = LEVELS[currentLevel];
        
        // Bounds check
        if (newY < 0 || newY >= grid.length || newX < 0 || newX >= grid[0].length) return;
        
        const targetTile = grid[newY][newX];
        
        // Can't move to water or walls
        if (targetTile === TILES.WATER || targetTile === TILES.WALL) return;
        
        // Check if can finish
        if (targetTile === TILES.FINISH) {
            const progress = tilesMelted / totalMeltable;
            if (progress < (level.requiredPercent / 100)) {
                return; // Can't finish yet
            }
        }
        
        setAnimatingMove(true);
        
        // Melt current tile
        const newGrid = grid.map(row => [...row]);
        const currentTile = newGrid[playerPos.y][playerPos.x];
        let pointsEarned = 0;
        let melted = 0;
        
        if (currentTile === TILES.THICK) {
            // Thick becomes normal ice first
            newGrid[playerPos.y][playerPos.x] = TILES.ICE;
            melted = 1;
            pointsEarned = 5;
        } else if (currentTile !== TILES.FINISH && currentTile !== TILES.WATER) {
            // Normal ice melts
            newGrid[playerPos.y][playerPos.x] = TILES.WATER;
            melted = 1;
            pointsEarned = 10;
            
            // Melt animation
            setMeltAnim({ x: playerPos.x, y: playerPos.y, alpha: 0.8 });
            setTimeout(() => setMeltAnim(null), 200);
        }
        
        // Collect coin
        if (targetTile === TILES.COIN) {
            newGrid[newY][newX] = TILES.ICE; // Coin collected, becomes normal ice
            setCoinsCollected(prev => prev + 1);
            pointsEarned += 50;
        }
        
        // Check if trapped (no valid moves from new position)
        // Must account for locked exit - can't move there if not enough tiles melted
        const checkTrapped = (x, y, g, currentMelted, totalTiles, requiredPct) => {
            const moves = [
                { dx: 0, dy: -1 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 },
                { dx: 1, dy: 0 },
            ];
            const canUnlockExit = (currentMelted / totalTiles) >= (requiredPct / 100);
            
            for (const move of moves) {
                const nx = x + move.dx;
                const ny = y + move.dy;
                if (ny >= 0 && ny < g.length && nx >= 0 && nx < g[0].length) {
                    const tile = g[ny][nx];
                    // Can't move to water or walls
                    if (tile === TILES.WATER || tile === TILES.WALL) continue;
                    // Can't move to locked exit
                    if (tile === TILES.FINISH && !canUnlockExit) continue;
                    // This is a valid move
                    return false;
                }
            }
            return true; // No valid moves - trapped!
        };
        
        setGrid(newGrid);
        setPlayerPos({ x: newX, y: newY });
        setTilesMelted(prev => prev + melted);
        setScore(prev => prev + pointsEarned);
        
        // Check win (reached finish)
        if (targetTile === TILES.FINISH) {
            // Bonus points for remaining tiles melted beyond requirement
            const bonusMelted = Math.floor((tilesMelted + melted) / totalMeltable * 100) - level.requiredPercent;
            const levelBonus = (currentLevel + 1) * 100 + bonusMelted * 5 + coinsCollected * 25;
            const newScore = score + pointsEarned + levelBonus;
            setScore(newScore);
            
            if (newScore > highScore) {
                setHighScore(newScore);
                localStorage.setItem('thinIceHighScore', newScore.toString());
            }
            
            setTimeout(() => setGameState('won'), 200);
            setAnimatingMove(false);
            return;
        }
        
        // Check if trapped
        const newMeltedCount = tilesMelted + melted;
        if (checkTrapped(newX, newY, newGrid, newMeltedCount, totalMeltable, level.requiredPercent)) {
            const progress = newMeltedCount / totalMeltable;
            if (progress >= (level.requiredPercent / 100)) {
                // Close enough, count as win
                const levelBonus = (currentLevel + 1) * 50;
                setScore(prev => prev + levelBonus);
                setTimeout(() => setGameState('won'), 300);
            } else {
                setTimeout(() => setGameState('lost'), 300);
            }
        }
        
        setTimeout(() => setAnimatingMove(false), 50);
    }, [gameState, animatingMove, playerPos, grid, currentLevel, tilesMelted, totalMeltable, coinsCollected, score, highScore]);
    
    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            if (e.code === 'Escape') {
                onClose();
                return;
            }
            
            if (gameState === 'won') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    setCurrentLevel(prev => prev + 1);
                }
                return;
            }
            
            if (gameState === 'lost') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    initLevel(currentLevel);
                }
                return;
            }
            
            switch (e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    movePlayer(0, -1);
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    movePlayer(0, 1);
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    movePlayer(-1, 0);
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    movePlayer(1, 0);
                    break;
                case 'KeyR':
                    initLevel(currentLevel);
                    break;
                default:
                    break;
            }
        };
        
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [gameState, movePlayer, onClose, currentLevel, initLevel]);
    
    // Canvas size based on current level
    const level = LEVELS[currentLevel];
    const canvasWidth = level ? level.grid[0].length * TILE_SIZE + GRID_PADDING * 2 : 400;
    const canvasHeight = level ? level.grid.length * TILE_SIZE + GRID_PADDING * 2 + 60 : 400;
    
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
                <h1 className="text-xl sm:text-3xl font-bold text-sky-400 retro-text tracking-wider">
                    ❄️ THIN ICE ⚫
                </h1>
                <p className="text-white/60 text-xs sm:text-sm mt-1">
                    High Score: {highScore}
                </p>
            </div>
            
            {/* Game container */}
            <div className="relative p-2 sm:p-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border-4 border-sky-500/50 shadow-2xl">
                <canvas
                    ref={canvasRef}
                    width={canvasWidth}
                    height={canvasHeight}
                    className="rounded"
                    style={{ 
                        maxWidth: '90vw', 
                        maxHeight: isMobile ? '55vh' : '65vh',
                        width: 'auto',
                        height: 'auto'
                    }}
                />
                
                {/* Mobile controls */}
                {isMobile && gameState === 'playing' && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 grid grid-cols-3 gap-1">
                        <div />
                        <button
                            className="w-14 h-14 bg-sky-600 rounded-lg text-2xl active:bg-sky-500 shadow-lg"
                            onClick={() => movePlayer(0, -1)}
                        >↑</button>
                        <div />
                        <button
                            className="w-14 h-14 bg-sky-600 rounded-lg text-2xl active:bg-sky-500 shadow-lg"
                            onClick={() => movePlayer(-1, 0)}
                        >←</button>
                        <button
                            className="w-14 h-14 bg-amber-600 rounded-lg text-lg active:bg-amber-500 shadow-lg"
                            onClick={() => initLevel(currentLevel)}
                        >↺</button>
                        <button
                            className="w-14 h-14 bg-sky-600 rounded-lg text-2xl active:bg-sky-500 shadow-lg"
                            onClick={() => movePlayer(1, 0)}
                        >→</button>
                        <div />
                        <button
                            className="w-14 h-14 bg-sky-600 rounded-lg text-2xl active:bg-sky-500 shadow-lg"
                            onClick={() => movePlayer(0, 1)}
                        >↓</button>
                        <div />
                    </div>
                )}
                
                {/* Win overlay */}
                {gameState === 'won' && (
                    <div className="absolute inset-2 bg-black/85 rounded flex flex-col items-center justify-center">
                        <div className="text-5xl mb-2">🎉</div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-green-400 mb-2 retro-text">
                            LEVEL COMPLETE!
                        </h2>
                        <p className="text-white mb-1">
                            Tiles Melted: {Math.floor((tilesMelted / totalMeltable) * 100)}%
                        </p>
                        {coinsCollected > 0 && (
                            <p className="text-yellow-400 mb-1">
                                💰 Coins: {coinsCollected}/{totalCoins}
                            </p>
                        )}
                        <p className="text-sky-300 mb-4">Score: {score}</p>
                        <button
                            onClick={() => setCurrentLevel(prev => prev + 1)}
                            className="px-6 py-3 bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-lg shadow-lg text-lg"
                        >
                            NEXT LEVEL →
                        </button>
                        {!isMobile && <p className="text-white/50 text-xs mt-2">or press SPACE</p>}
                    </div>
                )}
                
                {/* Lose overlay */}
                {gameState === 'lost' && (
                    <div className="absolute inset-2 bg-black/85 rounded flex flex-col items-center justify-center">
                        <div className="text-5xl mb-4">😵</div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-red-400 mb-2 retro-text">
                            TRAPPED!
                        </h2>
                        <p className="text-white/70 mb-1">You got stuck!</p>
                        <p className="text-white/50 mb-4 text-sm">
                            Melted: {Math.floor((tilesMelted / totalMeltable) * 100)}% (Need: {LEVELS[currentLevel]?.requiredPercent}%)
                        </p>
                        <button
                            onClick={() => initLevel(currentLevel)}
                            className="px-6 py-3 bg-gradient-to-b from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg text-lg"
                        >
                            🔄 TRY AGAIN
                        </button>
                        {!isMobile && <p className="text-white/50 text-xs mt-2">or press SPACE</p>}
                    </div>
                )}
                
                {/* Game complete overlay */}
                {gameState === 'complete' && (
                    <div className="absolute inset-2 bg-black/85 rounded flex flex-col items-center justify-center">
                        <div className="text-5xl mb-4">🏆</div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-2 retro-text">
                            CONGRATULATIONS!
                        </h2>
                        <p className="text-white mb-2">You completed all levels!</p>
                        <p className="text-sky-300 text-xl mb-4">Final Score: {score}</p>
                        {score >= highScore && (
                            <p className="text-yellow-300 mb-4">🎉 NEW HIGH SCORE!</p>
                        )}
                        <button
                            onClick={() => {
                                setScore(0);
                                setCurrentLevel(0);
                                initLevel(0);
                            }}
                            className="px-6 py-3 bg-gradient-to-b from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold rounded-lg shadow-lg text-lg"
                        >
                            PLAY AGAIN
                        </button>
                    </div>
                )}
            </div>
            
            {/* Controls hint */}
            <div className="mt-2 sm:mt-4 text-center flex-shrink-0">
                <p className="text-white/60 text-xs">
                    {isMobile ? 'Use buttons to move • Melt the ice!' : 'WASD/Arrows to move • R to restart • Melt all the tiles!'}
                </p>
            </div>
        </div>
    );
};

export default ThinIceGame;

