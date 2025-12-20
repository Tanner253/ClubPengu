/**
 * MatchBannerSystem - Handles 3D floating banners above players in active matches
 * Extracted from VoxelWorld.jsx - preserves original functionality exactly
 */

/**
 * Create a canvas for rendering match banners
 * @param {string} gameType - The type of game (monopoly needs taller canvas)
 * @returns {HTMLCanvasElement}
 */
export function createBannerCanvas(gameType = 'default') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    // Monopoly needs taller canvas for the mini board
    canvas.height = gameType === 'monopoly' ? 280 : 200;
    return canvas;
}

/**
 * Draw purple bubble background on canvas
 * @param {CanvasRenderingContext2D} ctx 
 * @param {HTMLCanvasElement} canvas 
 */
export function drawBubbleBackground(ctx, canvas) {
    // Background - purple gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(88, 28, 135, 0.95)');
    gradient.addColorStop(1, 'rgba(67, 56, 202, 0.95)');
    
    // Rounded rect background with speech bubble pointer
    const radius = 20;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvas.width - radius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
    ctx.lineTo(canvas.width, canvas.height - radius - 20);
    ctx.quadraticCurveTo(canvas.width, canvas.height - 20, canvas.width - radius, canvas.height - 20);
    ctx.lineTo(canvas.width / 2 + 15, canvas.height - 20);
    ctx.lineTo(canvas.width / 2, canvas.height); // Triangle point
    ctx.lineTo(canvas.width / 2 - 15, canvas.height - 20);
    ctx.lineTo(radius, canvas.height - 20);
    ctx.quadraticCurveTo(0, canvas.height - 20, 0, canvas.height - radius - 20);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Border
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
}

/**
 * Render Card Jitsu match banner (matches original exactly)
 */
export function renderCardJitsuBanner(ctx, canvas, players, state, wager) {
    // Header
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`⚔️ CARD JITSU • 💰 ${wager}`, canvas.width / 2, 35);
    
    // Player names
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px Arial';
    const p1Name = (players[0]?.name || 'Player 1').substring(0, 10);
    const p2Name = (players[1]?.name || 'Player 2').substring(0, 10);
    ctx.textAlign = 'left';
    ctx.fillText(p1Name, 30, 80);
    ctx.textAlign = 'right';
    ctx.fillText(p2Name, canvas.width - 30, 80);
    
    // VS
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('VS', canvas.width / 2, 80);
    
    // Win indicators
    const p1Wins = state.player1Wins || { fire: 0, water: 0, snow: 0 };
    const p2Wins = state.player2Wins || { fire: 0, water: 0, snow: 0 };
    
    const renderWins = (wins, x, align) => {
        let icons = '';
        if (wins.fire > 0) icons += '🔥'.repeat(Math.min(wins.fire, 3));
        if (wins.water > 0) icons += '💧'.repeat(Math.min(wins.water, 3));
        if (wins.snow > 0) icons += '❄️'.repeat(Math.min(wins.snow, 3));
        ctx.font = '24px Arial';
        ctx.textAlign = align;
        ctx.fillText(icons || '—', x, 115);
    };
    
    renderWins(p1Wins, 30, 'left');
    renderWins(p2Wins, canvas.width - 30, 'right');
    
    // Round & Phase
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    let statusText = `Round ${state.round || 1}`;
    if (state.phase === 'select') statusText += ' • Selecting...';
    else if (state.phase === 'reveal') statusText += ' • Revealing!';
    else if (state.status === 'complete') statusText += ' • Complete!';
    ctx.fillText(statusText, canvas.width / 2, 155);
}

/**
 * Render Tic Tac Toe match banner (matches original exactly)
 */
export function renderTicTacToeBanner(ctx, canvas, players, state, wager) {
    // Header
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`⭕ TIC TAC TOE • 💰 ${wager}`, canvas.width / 2, 35);
    
    // Player names
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    const p1Name = (players[0]?.name || 'Player 1').substring(0, 8);
    const p2Name = (players[1]?.name || 'Player 2').substring(0, 8);
    ctx.textAlign = 'left';
    ctx.fillText(p1Name, 20, 65);
    ctx.fillStyle = '#22D3EE'; // Cyan for X
    ctx.fillText('(X)', 20, 85);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText(p2Name, canvas.width - 20, 65);
    ctx.fillStyle = '#F472B6'; // Pink for O
    ctx.fillText('(O)', canvas.width - 20, 85);
    
    // Draw mini board in center
    const board = state.board || Array(9).fill(null);
    const winningLine = state.winningLine || [];
    const cellSize = 28;
    const boardX = (canvas.width - cellSize * 3) / 2;
    const boardY = 55;
    
    for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = boardX + col * cellSize;
        const y = boardY + row * cellSize;
        
        // Cell background
        const isWinning = winningLine.includes(i);
        ctx.fillStyle = isWinning ? 'rgba(34, 197, 94, 0.5)' : 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        
        // Cell border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);
        
        // X or O
        if (board[i]) {
            ctx.fillStyle = board[i] === 'X' ? '#22D3EE' : '#F472B6';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(board[i], x + cellSize / 2, y + cellSize / 2 + 7);
        }
    }
    
    // Status - EXACT LOGIC FROM ORIGINAL
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    let statusText = '';
    if (state.winner === 'draw') {
        statusText = '🤝 Draw!';
    } else if (state.winner) {
        // winner is 'X' or 'O'
        const winnerName = state.winner === 'X' ? players[0]?.name : players[1]?.name;
        statusText = `🏆 ${winnerName} wins!`;
    } else {
        // No winner yet - show whose turn
        const turnName = state.currentTurn === 'player1' ? players[0]?.name : players[1]?.name;
        statusText = `${turnName}'s turn`;
    }
    ctx.fillText(statusText, canvas.width / 2, 155);
}

/**
 * Render Connect 4 match banner (matches original exactly)
 */
export function renderConnect4Banner(ctx, canvas, players, state, wager) {
    // Header
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`🔴 CONNECT 4 • 💰 ${wager}`, canvas.width / 2, 35);
    
    // Player names
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Arial';
    const p1Name = (players[0]?.name || 'Player 1').substring(0, 6);
    const p2Name = (players[1]?.name || 'Player 2').substring(0, 6);
    ctx.textAlign = 'left';
    ctx.fillText(p1Name, 15, 60);
    // Red disc for P1
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(25, 75, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.fillText(p2Name, canvas.width - 15, 60);
    // Yellow disc for P2
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(canvas.width - 25, 75, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw mini board in center (7 cols x 6 rows)
    const board = state.board || Array(42).fill(null);
    const winningCells = state.winningCells || [];
    const cellSize = 12;
    const cols = 7;
    const rows = 6;
    const boardX = (canvas.width - cellSize * cols) / 2;
    const boardY = 50;
    
    // Board background
    ctx.fillStyle = 'rgba(30, 64, 175, 0.8)';
    ctx.fillRect(boardX - 2, boardY - 2, cellSize * cols + 4, cellSize * rows + 4);
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            // Board is stored bottom-to-top, display top-to-bottom
            const displayRow = rows - 1 - row;
            const index = displayRow * cols + col;
            const x = boardX + col * cellSize + cellSize / 2;
            const y = boardY + row * cellSize + cellSize / 2;
            
            const isWinning = winningCells.some(([r, c]) => r === displayRow && c === col);
            
            // Cell (disc)
            ctx.beginPath();
            ctx.arc(x, y, cellSize / 2 - 1, 0, Math.PI * 2);
            
            if (board[index] === 'R') {
                ctx.fillStyle = isWinning ? '#FCA5A5' : '#EF4444';
            } else if (board[index] === 'Y') {
                ctx.fillStyle = isWinning ? '#FDE68A' : '#FACC15';
            } else {
                ctx.fillStyle = 'rgba(30, 58, 138, 0.5)';
            }
            ctx.fill();
        }
    }
    
    // Status - EXACT LOGIC FROM ORIGINAL
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    let statusText = '';
    if (state.winner === 'draw') {
        statusText = '🤝 Draw!';
    } else if (state.winner) {
        // winner is 'R' or 'Y'
        const winnerName = state.winner === 'R' ? players[0]?.name : players[1]?.name;
        statusText = `🏆 ${winnerName} wins!`;
    } else {
        // No winner yet - show whose turn
        const turnName = state.currentTurn === 'player1' ? players[0]?.name : players[1]?.name;
        statusText = `${turnName}'s turn`;
    }
    ctx.fillText(statusText, canvas.width / 2, 155);
}

/**
 * Render Monopoly match banner (taller 280px canvas)
 */
export function renderMonopolyBanner(ctx, canvas, players, state, wager) {
    // Property colors for mini board display
    const PROPERTY_COLORS = {
        1: '#8B4513', 3: '#8B4513',  // Brown
        6: '#87CEEB', 8: '#87CEEB', 9: '#87CEEB',  // Light Blue
        11: '#FF69B4', 13: '#FF69B4', 14: '#FF69B4',  // Pink
        16: '#FFA500', 18: '#FFA500', 19: '#FFA500',  // Orange
        21: '#FF4757', 23: '#FF4757', 24: '#FF4757',  // Red
        26: '#FFD32A', 27: '#FFD32A', 29: '#FFD32A',  // Yellow
        31: '#2ED573', 32: '#2ED573', 34: '#2ED573',  // Green
        37: '#3742FA', 39: '#3742FA',  // Dark Blue
        5: '#2f3542', 15: '#2f3542', 25: '#2f3542', 35: '#2f3542',  // Railroads
        12: '#747d8c', 28: '#747d8c'  // Utilities
    };
    
    // Check if game is complete
    const isComplete = state.winner || state.status === 'complete';
    
    // Header - emerald green theme for Monopoly (or gold if winner)
    ctx.fillStyle = isComplete ? '#FBBF24' : '#10B981';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    
    if (isComplete && state.winner) {
        const winnerName = state.winner === 'player1' ? players[0]?.name : players[1]?.name;
        ctx.fillText(`🏆 ${winnerName} WINS! 🏆`, canvas.width / 2, 35);
    } else {
        ctx.fillText(`🎩 MONOPOLY • 💰 ${wager}`, canvas.width / 2, 35);
    }
    
    // Player names and money (row below header)
    const p1Name = (players[0]?.name || 'Player 1').substring(0, 10);
    const p2Name = (players[1]?.name || 'Player 2').substring(0, 10);
    const p1Props = state.player1Properties || [];
    const p2Props = state.player2Properties || [];
    
    // Player 1 (left side)
    ctx.textAlign = 'left';
    const isP1Turn = state.currentTurn === 'player1' && !isComplete;
    const isP1Winner = state.winner === 'player1';
    ctx.fillStyle = isP1Winner ? '#4ADE80' : (isP1Turn ? '#FBBF24' : '#FFFFFF');
    ctx.font = 'bold 18px Arial';
    ctx.fillText((isP1Turn ? '▶ ' : (isP1Winner ? '👑 ' : '')) + p1Name, 20, 60);
    
    // P1 Money & Props
    ctx.fillStyle = state.player1Money < 100 ? '#F87171' : '#4ADE80';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`$${state.player1Money ?? 1500}`, 20, 80);
    ctx.fillStyle = '#67E8F9';
    ctx.font = '12px Arial';
    ctx.fillText(`${p1Props.length} properties${state.player1InJail ? ' 🔒' : ''}`, 20, 95);
    
    // Player 2 (right side)
    ctx.textAlign = 'right';
    const isP2Turn = state.currentTurn === 'player2' && !isComplete;
    const isP2Winner = state.winner === 'player2';
    ctx.fillStyle = isP2Winner ? '#4ADE80' : (isP2Turn ? '#FBBF24' : '#FFFFFF');
    ctx.font = 'bold 18px Arial';
    ctx.fillText((isP2Winner ? '👑 ' : '') + (isP2Turn ? '▶ ' : '') + p2Name, canvas.width - 20, 60);
    
    // P2 Money & Props
    ctx.fillStyle = state.player2Money < 100 ? '#F87171' : '#4ADE80';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`$${state.player2Money ?? 1500}`, canvas.width - 20, 80);
    ctx.fillStyle = '#F9A8D4';
    ctx.font = '12px Arial';
    ctx.fillText(`${p2Props.length} properties${state.player2InJail ? ' 🔒' : ''}`, canvas.width - 20, 95);
    
    // === MINI PROPERTY BOARD (center, larger) ===
    const boardSize = 120; // Larger board
    const boardX = canvas.width / 2 - boardSize / 2;
    const boardY = 105;
    const cellSize = 10;
    const propOwners = state.propertyOwners || {};
    
    // Draw board background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(boardX - 4, boardY - 4, boardSize + 8, boardSize + 8);
    
    // Draw board outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(boardX - 4, boardY - 4, boardSize + 8, boardSize + 8);
    
    // Helper to draw property cell with owner
    const drawCell = (x, y, propIndex) => {
        const color = PROPERTY_COLORS[propIndex];
        if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, cellSize, cellSize);
            // Owner indicator (larger dot)
            if (propOwners[propIndex] === 'player1') {
                ctx.fillStyle = '#22D3EE';
                ctx.beginPath();
                ctx.arc(x + cellSize/2, y + cellSize/2, 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (propOwners[propIndex] === 'player2') {
                ctx.fillStyle = '#F472B6';
                ctx.beginPath();
                ctx.arc(x + cellSize/2, y + cellSize/2, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Non-property space (GO, Jail, etc)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(x, y, cellSize, cellSize);
        }
    };
    
    // Bottom row (0-10): GO to Jail (right to left)
    for (let i = 0; i <= 10; i++) {
        const x = boardX + boardSize - cellSize - i * (cellSize + 1);
        const y = boardY + boardSize - cellSize;
        drawCell(x, y, i);
    }
    
    // Left column (11-20): Jail to Free Parking (bottom to top)
    for (let i = 11; i <= 20; i++) {
        const x = boardX;
        const y = boardY + boardSize - cellSize - (i - 10) * (cellSize + 1);
        drawCell(x, y, i);
    }
    
    // Top row (21-30): Free Parking to Go To Jail (left to right)
    for (let i = 21; i <= 30; i++) {
        const x = boardX + (i - 20) * (cellSize + 1);
        const y = boardY;
        drawCell(x, y, i);
    }
    
    // Right column (31-39): Go To Jail to Boardwalk (top to bottom)
    for (let i = 31; i <= 39; i++) {
        const x = boardX + boardSize - cellSize;
        const y = boardY + (i - 30) * (cellSize + 1);
        drawCell(x, y, i);
    }
    
    // Center of board - show dice or status
    const lastDice = state.lastDice || [0, 0];
    ctx.textAlign = 'center';
    
    if (lastDice[0] > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`🎲 ${lastDice[0]}+${lastDice[1]}`, canvas.width / 2, boardY + 50);
        ctx.fillText(`= ${lastDice[0] + lastDice[1]}`, canvas.width / 2, boardY + 66);
        if (lastDice[0] === lastDice[1]) {
            ctx.fillStyle = '#FBBF24';
            ctx.font = 'bold 10px Arial';
            ctx.fillText('DOUBLES!', canvas.width / 2, boardY + 80);
        }
    }
    
    // === STATUS BAR (bottom) ===
    const statusY = boardY + boardSize + 20;
    
    if (isComplete) {
        // Show final result
        ctx.fillStyle = '#4ADE80';
        ctx.font = 'bold 16px Arial';
        const winnerName = state.winner === 'player1' ? players[0]?.name : players[1]?.name;
        const winnerMoney = state.winner === 'player1' ? state.player1Money : state.player2Money;
        ctx.fillText(`${winnerName} won with $${winnerMoney}!`, canvas.width / 2, statusY);
        
        // Show reason
        if (state.reason === 'forfeit') {
            ctx.fillStyle = '#F87171';
            ctx.font = '12px Arial';
            ctx.fillText('(Opponent forfeited)', canvas.width / 2, statusY + 18);
        } else if (state.reason === 'bankruptcy') {
            ctx.fillStyle = '#F87171';
            ctx.font = '12px Arial';
            ctx.fillText('(Opponent went bankrupt)', canvas.width / 2, statusY + 18);
        }
    } else {
        // Status / Current Event
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '13px Arial';
        
        let statusText = '';
        if (state.currentEvent?.title) {
            statusText = state.currentEvent.title;
            if (state.currentEvent.description) {
                statusText += ': ' + state.currentEvent.description.substring(0, 35);
            }
        } else {
            const turnName = state.currentTurn === 'player1' ? players[0]?.name : players[1]?.name;
            const phase = state.phase || 'roll';
            const phaseText = phase === 'roll' ? 'rolling dice' : phase === 'moving' ? 'moving' : phase === 'action' ? 'deciding' : 'waiting';
            statusText = `${turnName} is ${phaseText}...`;
        }
        ctx.fillText(statusText.substring(0, 45), canvas.width / 2, statusY);
    }
    
    // Property legend at very bottom
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#22D3EE';
    ctx.fillText(`● P1: ${p1Props.length}`, canvas.width / 2 - 50, statusY + 20);
    ctx.fillStyle = '#F472B6';
    ctx.fillText(`● P2: ${p2Props.length}`, canvas.width / 2 + 50, statusY + 20);
}

/**
 * Render banner content to canvas based on game type
 */
export function renderBannerToCanvas(ctx, matchData) {
    const canvas = ctx.canvas;
    
    // Clear and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBubbleBackground(ctx, canvas);
    
    const { gameType, players, state, wagerAmount } = matchData;
    const wager = wagerAmount || 0;
    
    // Handle both naming conventions for game types
    switch (gameType) {
        case 'tic_tac_toe':
        case 'ticTacToe':
            renderTicTacToeBanner(ctx, canvas, players, state, wager);
            break;
        case 'connect4':
            renderConnect4Banner(ctx, canvas, players, state, wager);
            break;
        case 'monopoly':
            renderMonopolyBanner(ctx, canvas, players, state, wager);
            break;
        case 'card_jitsu':
        case 'cardJitsu':
        default:
            renderCardJitsuBanner(ctx, canvas, players, state, wager);
            break;
    }
}

/**
 * Update match banners in the scene
 */
export function updateMatchBanners(params) {
    const { THREE, scene, bannersRef, playersData, activeMatches, spectatingMatch } = params;
    
    if (!scene || !THREE) return;
    
    const banners = bannersRef;
    
    // Get current match IDs
    const currentMatchIds = new Set(activeMatches.map(m => m.matchId));
    
    // Remove banners for ended matches
    for (const [matchId, bannerData] of banners) {
        if (!currentMatchIds.has(matchId)) {
            scene.remove(bannerData.sprite);
            bannerData.sprite.material.map?.dispose();
            bannerData.sprite.material.dispose();
            banners.delete(matchId);
        }
    }
    
    // Create or update banners for active matches
    for (const match of activeMatches) {
        const matchId = match.matchId;
        const spectateData = spectatingMatch?.[matchId];
        const matchData = {
            ...match,
            state: spectateData?.state || match.state || {},
            wagerAmount: spectateData?.wagerAmount || match.wagerAmount,
            gameType: spectateData?.gameType || match.gameType || 'card_jitsu'
        };
        
        // Find player positions
        const p1Data = playersData.get(match.players?.[0]?.id);
        const p2Data = playersData.get(match.players?.[1]?.id);
        
        if (!p1Data?.position && !p2Data?.position) continue;
        
        // Calculate midpoint between players
        const p1Pos = p1Data?.position || p2Data?.position;
        const p2Pos = p2Data?.position || p1Data?.position;
        const midX = (p1Pos.x + p2Pos.x) / 2;
        const midZ = (p1Pos.z + p2Pos.z) / 2;
        
        let bannerData = banners.get(matchId);
        
        if (!bannerData) {
            // Create new banner - Monopoly needs taller canvas
            const canvas = createBannerCanvas(matchData.gameType);
            const ctx = canvas.getContext('2d');
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            const material = new THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true,
                depthTest: false
            });
            const sprite = new THREE.Sprite(material);
            // Monopoly banner is taller (280px vs 200px)
            const isMonopoly = matchData.gameType === 'monopoly';
            sprite.scale.set(8, isMonopoly ? 4.4 : 3.2, 1); // Banner size in world units
            sprite.renderOrder = 999; // Render on top
            
            scene.add(sprite);
            bannerData = { sprite, canvas, ctx, texture, gameType: matchData.gameType };
            banners.set(matchId, bannerData);
        }
        
        // Update banner content
        renderBannerToCanvas(bannerData.ctx, matchData);
        bannerData.texture.needsUpdate = true;
        
        // Position above players (8 units above ground)
        bannerData.sprite.position.set(midX, 8, midZ);
    }
}

/**
 * Cleanup all match banners
 */
export function cleanupMatchBanners(bannersRef, scene) {
    for (const [, bannerData] of bannersRef) {
        scene?.remove(bannerData.sprite);
        bannerData.sprite?.material?.map?.dispose();
        bannerData.sprite?.material?.dispose();
    }
    bannersRef.clear();
}

export default {
    createBannerCanvas,
    drawBubbleBackground,
    renderCardJitsuBanner,
    renderTicTacToeBanner,
    renderConnect4Banner,
    renderMonopolyBanner,
    renderBannerToCanvas,
    updateMatchBanners,
    cleanupMatchBanners
};
