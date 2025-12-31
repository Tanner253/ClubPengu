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
    // UNO uses standard height
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
 * Format wager display text (coins + tokens if present)
 * Shows token ticker and amount when crypto is being wagered
 */
function formatWagerText(wager, wagerToken) {
    // Format token amount (handle decimals)
    const formatTokenAmount = (amount) => {
        if (amount >= 1000) {
            return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
        } else if (amount >= 1) {
            return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
        } else {
            return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
        }
    };
    
    if (wagerToken?.tokenAmount > 0 && wager > 0) {
        // Both coins and tokens
        return `💰 ${wager} + ${formatTokenAmount(wagerToken.tokenAmount)} ${wagerToken.tokenSymbol}`;
    } else if (wagerToken?.tokenAmount > 0) {
        // Only tokens (crypto wager)
        return `🪙 ${formatTokenAmount(wagerToken.tokenAmount)} ${wagerToken.tokenSymbol}`;
    } else if (wager > 0) {
        // Only coins
        return `💰 ${wager}`;
    } else {
        // No wager (friendly match)
        return '💰 0';
    }
}

/**
 * Render Card Jitsu match banner (matches original exactly)
 */
export function renderCardJitsuBanner(ctx, canvas, players, state, wager, wagerToken = null) {
    // Header
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`⚔️ CARD JITSU • ${formatWagerText(wager, wagerToken)}`, canvas.width / 2, 35);
    
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
export function renderTicTacToeBanner(ctx, canvas, players, state, wager, wagerToken = null) {
    // Header
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`⭕ TIC TAC TOE • ${formatWagerText(wager, wagerToken)}`, canvas.width / 2, 35);
    
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
export function renderConnect4Banner(ctx, canvas, players, state, wager, wagerToken = null) {
    // Header
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`🔴 CONNECT 4 • ${formatWagerText(wager, wagerToken)}`, canvas.width / 2, 35);
    
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
export function renderMonopolyBanner(ctx, canvas, players, state, wager, wagerToken = null) {
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
        ctx.fillText(`🎩 MONOPOLY • ${formatWagerText(wager, wagerToken)}`, canvas.width / 2, 35);
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
 * Render UNO match banner
 */
export function renderUnoBanner(ctx, canvas, players, state, wager, wagerToken = null) {
    // Color mapping for UNO
    const COLOR_HEX = {
        Red: '#ff3333',
        Blue: '#1155ff',
        Green: '#00aa00',
        Yellow: '#ffcc00',
        Black: '#111111'
    };
    
    const isComplete = state.winner || state.status === 'complete';
    
    // Get active color and value from state, or from topCard if available
    let activeColor = state.activeColor;
    let activeValue = state.activeValue;
    
    // If activeColor/activeValue not in state, try to get from topCard
    if (!activeColor && state.topCard) {
        activeColor = state.topCard.color || 'Red';
        activeValue = state.topCard.value || '';
    }
    
    // Fallback defaults
    activeColor = activeColor || 'Red';
    activeValue = activeValue || '';
    
    // Header - UNO themed (multicolor gradient or winner gold)
    if (isComplete) {
        ctx.fillStyle = '#FBBF24';
    } else {
        const grad = ctx.createLinearGradient(0, 20, canvas.width, 35);
        grad.addColorStop(0, '#ff3333');
        grad.addColorStop(0.33, '#1155ff');
        grad.addColorStop(0.66, '#00aa00');
        grad.addColorStop(1, '#ffcc00');
        ctx.fillStyle = grad;
    }
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`🃏 UNO • ${formatWagerText(wager, wagerToken)}`, canvas.width / 2, 35);
    
    // Player names
    const p1Name = (players[0]?.name || 'Player 1').substring(0, 10);
    const p2Name = (players[1]?.name || 'Player 2').substring(0, 10);
    
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#22D3EE'; // Cyan for player 1
    ctx.textAlign = 'left';
    ctx.fillText(p1Name, 30, 70);
    
    ctx.fillStyle = '#F472B6'; // Pink for player 2
    ctx.textAlign = 'right';
    ctx.fillText(p2Name, canvas.width - 30, 70);
    
    // Card counts
    const p1Cards = state.player1CardCount ?? 7;
    const p2Cards = state.player2CardCount ?? 7;
    
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`🃏 ${p1Cards} cards`, 30, 95);
    ctx.textAlign = 'right';
    ctx.fillText(`${p2Cards} cards 🃏`, canvas.width - 30, 95);
    
    // Current card display (center)
    const cardCenterX = canvas.width / 2;
    const cardCenterY = 115;
    const cardW = 50;
    const cardH = 70;
    
    // Draw card background
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(cardCenterX - cardW/2, cardCenterY - cardH/2, cardW, cardH, 8);
    ctx.fill();
    
    // Draw card color
    ctx.fillStyle = COLOR_HEX[activeColor] || '#111111';
    ctx.beginPath();
    ctx.roundRect(cardCenterX - cardW/2 + 4, cardCenterY - cardH/2 + 4, cardW - 8, cardH - 8, 6);
    ctx.fill();
    
    // Draw card value
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let displayValue = activeValue;
    if (displayValue === 'Skip') displayValue = '⊘';
    else if (displayValue === 'Reverse') displayValue = '⇄';
    else if (displayValue === 'Wild') displayValue = '★';
    else if (displayValue === 'Wild +4') displayValue = '+4';
    ctx.fillText(displayValue, cardCenterX, cardCenterY);
    ctx.textBaseline = 'alphabetic';
    
    // Active color indicator
    ctx.font = '14px Arial';
    ctx.fillStyle = COLOR_HEX[activeColor] || '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`Active: ${activeColor}`, canvas.width / 2, cardCenterY + cardH/2 + 15);
    
    // Status
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '16px Arial';
    let statusText = '';
    
    if (isComplete) {
        const winnerName = state.winner === 'player1' ? players[0]?.name : players[1]?.name;
        statusText = `🏆 ${winnerName} wins!`;
        if (state.reason) statusText += ` (${state.reason})`;
    } else if (state.phase === 'selectColor') {
        const selectingPlayer = state.currentTurn === 'player1' ? players[0]?.name : players[1]?.name;
        statusText = `${selectingPlayer} choosing color...`;
    } else {
        const turnName = state.currentTurn === 'player1' ? players[0]?.name : players[1]?.name;
        statusText = `${turnName}'s turn`;
    }
    
    ctx.fillText(statusText.substring(0, 35), canvas.width / 2, 175);
    
    // UNO call indicator
    if (state.calledUno?.player1 || state.calledUno?.player2) {
        ctx.font = 'bold 16px Arial';
        if (state.calledUno?.player1) {
            ctx.fillStyle = '#ff4757';
            ctx.textAlign = 'left';
            ctx.fillText('UNO!', 30, 120);
        }
        if (state.calledUno?.player2) {
            ctx.fillStyle = '#ff4757';
            ctx.textAlign = 'right';
            ctx.fillText('UNO!', canvas.width - 30, 120);
        }
    }
}

/**
 * Render Blackjack match banner
 */
export function renderBlackjackBanner(ctx, canvas, players, state, wager, wagerToken = null) {
    const isComplete = state.phase === 'complete' || state.winner || state.isComplete;
    // P2P blackjack only - no PvE spectator banners, so always show card counts (not hands)
    
    // Header - Casino themed
    ctx.fillStyle = isComplete ? '#FBBF24' : '#10B981'; // Gold when complete, green when playing
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`🎰 BLACKJACK • ${formatWagerText(wager, wagerToken)}`, canvas.width / 2, 35);
    
    // Player names
    const p1Name = (players[0]?.name || 'Player').substring(0, 10);
    const p2Name = (players[1]?.name || 'Dealer').substring(0, 10);
    
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#22D3EE'; // Cyan for player
    ctx.textAlign = 'left';
    ctx.fillText(p1Name, 30, 70);
    
    ctx.fillStyle = '#F472B6'; // Pink for dealer/player 2
    ctx.textAlign = 'right';
    ctx.fillText(p2Name, canvas.width - 30, 70);
    
    // P2P Blackjack - show card counts only (anti-cheat)
    const p1Cards = state.player1CardCount ?? '?';
    const p2Cards = state.player2CardCount ?? '?';
    
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`🃏 ${p1Cards} cards`, 30, 100);
    ctx.textAlign = 'right';
    ctx.fillText(`${p2Cards} cards 🃏`, canvas.width - 30, 100);
    
    // Draw card icons in center
    const centerX = canvas.width / 2;
    const centerY = 100;
    
    // Card stack icon
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(centerX - 25, centerY - 25, 40, 55);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(centerX - 20, centerY - 20, 40, 55);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - 20, centerY - 20, 40, 55);
    
    // Status text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    
    let statusText = '';
    if (isComplete) {
        const result = state.result || '';
        if (state.winner === 'player1' || result === 'WIN' || result === 'BLACKJACK') {
            statusText = `🏆 ${p1Name} wins!`;
            if (result === 'BLACKJACK') statusText = `🎰 ${p1Name} BLACKJACK!`;
        } else if (state.winner === 'player2' || result === 'LOSE' || result === 'BUST') {
            statusText = `🏆 ${p2Name} wins!`;
            if (result === 'BUST') statusText = `💥 ${p1Name} BUST!`;
        } else if (state.winner === 'draw' || result === 'PUSH') {
            statusText = '🤝 PUSH - Tie game!';
        } else {
            statusText = '🎰 Game Over';
        }
    } else {
        const phase = state.phase || state.currentTurn || 'playing';
        if (phase === 'player1Turn') statusText = `${p1Name}'s turn`;
        else if (phase === 'player2Turn') statusText = `${p2Name}'s turn`;
        else if (phase === 'dealerTurn') statusText = 'Dealer playing...';
        else statusText = '🎰 In Progress...';
    }
    
    ctx.fillText(statusText.substring(0, 30), canvas.width / 2, 175);
    
    // Status indicators for each player
    ctx.font = '14px Arial';
    const p1Status = state.player1Status || state.playerStatus || '';
    const p2Status = state.player2Status || state.dealerStatus || '';
    
    if (p1Status) {
        ctx.fillStyle = p1Status === 'bust' ? '#ff4757' : (p1Status === 'blackjack' ? '#ffd700' : '#7bed9f');
        ctx.textAlign = 'left';
        ctx.fillText(p1Status.toUpperCase(), 30, 135);
    }
    if (p2Status) {
        ctx.fillStyle = p2Status === 'bust' ? '#ff4757' : (p2Status === 'blackjack' ? '#ffd700' : '#7bed9f');
        ctx.textAlign = 'right';
        ctx.fillText(p2Status.toUpperCase(), canvas.width - 30, 135);
    }
}

/**
 * Render Battleship match banner
 */
export function renderBattleshipBanner(ctx, canvas, players, state, wager, wagerToken = null) {
    const isComplete = state.winner || state.status === 'complete';
    
    // Header - Naval themed
    ctx.fillStyle = isComplete ? '#FBBF24' : '#3B82F6';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`🚢 BATTLESHIP • ${formatWagerText(wager, wagerToken)}`, canvas.width / 2, 35);
    
    // Player names
    const p1Name = (players[0]?.name || 'Player 1').substring(0, 10);
    const p2Name = (players[1]?.name || 'Player 2').substring(0, 10);
    
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#22D3EE'; // Cyan for player 1
    ctx.textAlign = 'left';
    ctx.fillText(p1Name, 30, 70);
    
    ctx.fillStyle = '#F472B6'; // Pink for player 2
    ctx.textAlign = 'right';
    ctx.fillText(p2Name, canvas.width - 30, 70);
    
    // Ship counts (sunk/total)
    const p1Sunk = state.player1ShipsSunk ?? 0;
    const p2Sunk = state.player2ShipsSunk ?? 0;
    const totalShips = state.totalShips ?? 5;
    const p1Remaining = totalShips - p1Sunk;
    const p2Remaining = totalShips - p2Sunk;
    
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`🚢 ${p1Remaining}/${totalShips} ships`, 30, 95);
    ctx.textAlign = 'right';
    ctx.fillText(`${p2Remaining}/${totalShips} ships 🚢`, canvas.width - 30, 95);
    
    // Phase indicator (placement, playing, complete)
    const phase = state.phase || 'placement';
    let phaseText = '';
    if (phase === 'placement') {
        const p1Ready = state.player1Ready || false;
        const p2Ready = state.player2Ready || false;
        if (!p1Ready && !p2Ready) phaseText = 'Both placing ships...';
        else if (!p1Ready) phaseText = `${p1Name} placing ships...`;
        else if (!p2Ready) phaseText = `${p2Name} placing ships...`;
        else phaseText = 'Ready to play!';
    } else if (phase === 'playing') {
        const turnName = state.currentTurn === 'player1' ? p1Name : p2Name;
        phaseText = `${turnName}'s turn`;
    } else {
        phaseText = 'Game complete';
    }
    
    // Status
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    
    let statusText = '';
    if (isComplete) {
        const winnerName = state.winner === 'player1' ? p1Name : p2Name;
        statusText = `🏆 ${winnerName} wins!`;
    } else {
        statusText = phaseText;
    }
    
    ctx.fillText(statusText.substring(0, 35), canvas.width / 2, 155);
    
    // Last action indicator
    if (state.lastAction && phase === 'playing') {
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        const actionPlayer = state.lastAction.player === 'player1' ? p1Name : p2Name;
        const actionType = state.lastAction.type === 'hit' ? '💥 HIT!' : '💨 MISS';
        ctx.fillText(`${actionPlayer}: ${actionType}`, canvas.width / 2, 175);
    }
}

// ==================== PvE ACTIVITY BANNERS ====================

/**
 * Render PvE Fishing banner
 */
export function renderFishingBanner(ctx, canvas, playerName, state) {
    // Green/blue fishing themed background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(6, 95, 70, 0.95)');
    gradient.addColorStop(1, 'rgba(14, 116, 144, 0.95)');
    
    // Rounded rect background with speech bubble pointer
    const radius = 20;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvas.width - radius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
    ctx.lineTo(canvas.width, canvas.height - radius - 20);
    ctx.quadraticCurveTo(canvas.width, canvas.height - 20, canvas.width - radius, canvas.height - 20);
    ctx.lineTo(canvas.width / 2 + 15, canvas.height - 20);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.lineTo(canvas.width / 2 - 15, canvas.height - 20);
    ctx.lineTo(radius, canvas.height - 20);
    ctx.quadraticCurveTo(0, canvas.height - 20, 0, canvas.height - radius - 20);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Border
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Header
    ctx.fillStyle = '#22D3EE';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎣 FISHING', canvas.width / 2, 35);
    
    // Player name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(playerName.substring(0, 15), canvas.width / 2, 65);
    
    // Stats
    const fishCaught = state.fishCaught || 0;
    const totalValue = state.totalValue || 0;
    
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#4ADE80';
    ctx.textAlign = 'center';
    ctx.fillText(`🐟 ${fishCaught} fish caught • 💰 ${totalValue}g earned`, canvas.width / 2, 100);
    
    // Last fish caught
    if (state.lastFish) {
        ctx.font = 'bold 20px Arial';
        const rarityColors = {
            common: '#FFFFFF',
            uncommon: '#22D3EE',
            rare: '#A855F7',
            epic: '#F97316',
            legendary: '#FBBF24'
        };
        ctx.fillStyle = rarityColors[state.lastFish.rarity] || '#FFFFFF';
        const emoji = state.lastFish.emoji || '🐟';
        ctx.fillText(`${emoji} ${state.lastFish.name}`, canvas.width / 2, 135);
        
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(`+${state.lastFish.value}g • ${state.lastFish.rarity}`, canvas.width / 2, 155);
    } else {
        ctx.font = '16px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('Waiting for a bite...', canvas.width / 2, 140);
    }
    
    // Show end result if complete
    if (state.isComplete) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FBBF24';
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎣 FISHING COMPLETE!', canvas.width / 2, 80);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(`${fishCaught} fish • ${totalValue}g total`, canvas.width / 2, 120);
    }
}

/**
 * Render PvE Blackjack banner (shows actual hands for PvE)
 */
export function renderPveBlackjackBanner(ctx, canvas, playerName, state) {
    const isComplete = state.isComplete || state.result;
    
    // Casino themed gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(21, 128, 61, 0.95)');
    gradient.addColorStop(1, 'rgba(22, 101, 52, 0.95)');
    
    // Rounded rect background with speech bubble pointer
    const radius = 20;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvas.width - radius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
    ctx.lineTo(canvas.width, canvas.height - radius - 20);
    ctx.quadraticCurveTo(canvas.width, canvas.height - 20, canvas.width - radius, canvas.height - 20);
    ctx.lineTo(canvas.width / 2 + 15, canvas.height - 20);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.lineTo(canvas.width / 2 - 15, canvas.height - 20);
    ctx.lineTo(radius, canvas.height - 20);
    ctx.quadraticCurveTo(0, canvas.height - 20, 0, canvas.height - radius - 20);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Gold border
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Header
    ctx.fillStyle = isComplete ? '#FBBF24' : '#10B981';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`🎰 BLACKJACK • 💰 ${state.bet || 0}`, canvas.width / 2, 35);
    
    // Player vs Dealer
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#22D3EE';
    ctx.textAlign = 'left';
    ctx.fillText(playerName.substring(0, 10), 30, 65);
    ctx.fillStyle = '#F472B6';
    ctx.textAlign = 'right';
    ctx.fillText('Dealer', canvas.width - 30, 65);
    
    // Draw hands as card symbols
    const suitEmoji = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    const suitColors = { hearts: '#e74c3c', diamonds: '#e74c3c', clubs: '#2c3e50', spades: '#2c3e50' };
    
    const renderHand = (hand, x, align, hideSecond = false) => {
        if (!hand || hand.length === 0) return;
        
        let handStr = '';
        hand.forEach((card, i) => {
            if (hideSecond && i === 0 && !isComplete) {
                handStr += '🂠 ';
            } else {
                const suit = suitEmoji[card.suit] || '?';
                const val = card.value || '?';
                handStr += `${val}${suit} `;
            }
        });
        
        ctx.font = '16px Arial';
        ctx.textAlign = align;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(handStr.trim(), x, 90);
    };
    
    // Player hand (full visibility)
    renderHand(state.playerHand, 30, 'left');
    
    // Dealer hand (hide first card until complete)
    renderHand(state.dealerHand, canvas.width - 30, 'right', true);
    
    // Scores
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#4ADE80';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${state.playerScore || 0}`, 30, 115);
    ctx.textAlign = 'right';
    if (isComplete) {
        ctx.fillText(`Score: ${state.dealerScore || 0}`, canvas.width - 30, 115);
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('Score: ?', canvas.width - 30, 115);
    }
    
    // Result/Status
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    
    if (isComplete) {
        const result = state.result || '';
        let resultText = '';
        let resultColor = '#FFFFFF';
        
        if (result === 'WIN' || state.won) {
            resultText = `🏆 ${playerName} WINS! +${state.payout || 0}`;
            resultColor = '#4ADE80';
        } else if (result === 'BLACKJACK') {
            resultText = `🎰 BLACKJACK! +${state.payout || 0}`;
            resultColor = '#FBBF24';
        } else if (result === 'PUSH') {
            resultText = '🤝 PUSH - Tie!';
            resultColor = '#F59E0B';
        } else if (result === 'LOSE' || result === 'BUST') {
            resultText = result === 'BUST' ? `💥 BUST! -${state.bet || 0}` : `❌ Dealer wins! -${state.bet || 0}`;
            resultColor = '#EF4444';
        } else {
            resultText = '🎰 Game Over';
        }
        
        ctx.fillStyle = resultColor;
        ctx.fillText(resultText, canvas.width / 2, 155);
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`${state.phase === 'playing' ? 'Your turn...' : 'Waiting...'}`, canvas.width / 2, 155);
    }
}

/**
 * Create a canvas for PvE activity banners
 */
export function createPveBannerCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 200;
    return canvas;
}

/**
 * Render PvE activity banner based on activity type
 */
export function renderPveBannerToCanvas(ctx, activityData) {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const { activity, playerName, state } = activityData;
    
    switch (activity) {
        case 'fishing':
            renderFishingBanner(ctx, canvas, playerName, state);
            break;
        case 'blackjack':
            renderPveBlackjackBanner(ctx, canvas, playerName, state);
            break;
        default:
            // Generic PvE activity banner
            drawBubbleBackground(ctx, canvas);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`🎮 ${activity.toUpperCase()}`, canvas.width / 2, 60);
            ctx.font = '20px Arial';
            ctx.fillText(playerName, canvas.width / 2, 100);
            break;
    }
}

/**
 * Update PvE activity banners in the scene
 */
export function updatePveBanners(params) {
    const { THREE, scene, pveBannersRef, playersData, activePveActivities, localPlayerId } = params;
    
    if (!scene || !THREE || !activePveActivities) return;
    
    const banners = pveBannersRef;
    
    // Get current activity player IDs (exclude local player - they see their own UI)
    const currentActivityIds = new Set(
        Object.keys(activePveActivities).filter(id => id !== localPlayerId)
    );
    
    // Remove banners for ended activities
    for (const [playerId, bannerData] of banners) {
        if (!currentActivityIds.has(playerId)) {
            scene.remove(bannerData.sprite);
            bannerData.sprite.material.map?.dispose();
            bannerData.sprite.material.dispose();
            banners.delete(playerId);
        }
    }
    
    // Create or update banners for active PvE activities
    for (const [playerId, activityData] of Object.entries(activePveActivities)) {
        if (playerId === localPlayerId) continue; // Skip local player
        
        // Get player position
        const playerData = playersData.get(playerId);
        if (!playerData?.position) continue;
        
        let bannerData = banners.get(playerId);
        
        if (!bannerData) {
            // Create new banner
            const canvas = createPveBannerCanvas();
            const ctx = canvas.getContext('2d');
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            const material = new THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true,
                depthTest: false
            });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(8, 3.2, 1);
            sprite.renderOrder = 998; // Just below P2P banners
            
            scene.add(sprite);
            bannerData = { sprite, canvas, ctx, texture };
            banners.set(playerId, bannerData);
        }
        
        // Update banner content
        renderPveBannerToCanvas(bannerData.ctx, activityData);
        bannerData.texture.needsUpdate = true;
        
        // Position above player (7 units above ground, slightly lower than P2P)
        bannerData.sprite.position.set(
            playerData.position.x,
            7,
            playerData.position.z
        );
    }
}

/**
 * Cleanup all PvE banners
 */
export function cleanupPveBanners(pveBannersRef, scene) {
    for (const [, bannerData] of pveBannersRef) {
        scene?.remove(bannerData.sprite);
        bannerData.sprite?.material?.map?.dispose();
        bannerData.sprite?.material?.dispose();
    }
    pveBannersRef.clear();
}

/**
 * Render banner content to canvas based on game type
 */
export function renderBannerToCanvas(ctx, matchData) {
    const canvas = ctx.canvas;
    
    // Clear and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBubbleBackground(ctx, canvas);
    
    const { gameType, players, state, wagerAmount, wagerToken } = matchData;
    const wager = wagerAmount || 0;
    
    // Handle both naming conventions for game types
    switch (gameType) {
        case 'tic_tac_toe':
        case 'ticTacToe':
            renderTicTacToeBanner(ctx, canvas, players, state, wager, wagerToken);
            break;
        case 'blackjack':
            renderBlackjackBanner(ctx, canvas, players, state, wager, wagerToken);
            break;
        case 'connect4':
            renderConnect4Banner(ctx, canvas, players, state, wager, wagerToken);
            break;
        case 'monopoly':
            renderMonopolyBanner(ctx, canvas, players, state, wager, wagerToken);
            break;
        case 'uno':
            renderUnoBanner(ctx, canvas, players, state, wager, wagerToken);
            break;
        case 'battleship':
            renderBattleshipBanner(ctx, canvas, players, state, wager, wagerToken);
            break;
        case 'card_jitsu':
        case 'cardJitsu':
        default:
            renderCardJitsuBanner(ctx, canvas, players, state, wager, wagerToken);
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
    
    // Get current match IDs from activeMatches (only active matches)
    const currentMatchIds = new Set(activeMatches.map(m => m.matchId));
    
    // Remove banners for ended matches (matches no longer in activeMatches)
    // This happens after the 5-second grace period for showing final results
    for (const [matchId, bannerData] of banners) {
        if (!currentMatchIds.has(matchId)) {
            // Clean up banner resources properly
            if (bannerData.sprite) {
            scene.remove(bannerData.sprite);
                if (bannerData.sprite.material) {
                    if (bannerData.sprite.material.map) {
                        bannerData.sprite.material.map.dispose();
                    }
            bannerData.sprite.material.dispose();
                }
            }
            banners.delete(matchId);
        }
    }
    
    // Create or update banners for active matches
    for (const match of activeMatches) {
        const matchId = match.matchId;
        const spectateData = spectatingMatch?.[matchId];
        
        // ALL game types should use spectator state when available
        // Spectator state has the correct spectator-friendly fields (card counts, board state, etc.)
        // Only fall back to match.state if spectateData doesn't exist yet (initial load)
        let matchState = spectateData?.state || match.state || {};
        
        // Always prefer spectateData.state if it exists - it's the authoritative spectator view
        if (spectateData?.state) {
            matchState = spectateData.state;
        }
        
        // Filter out completed matches (unless they're in the 5-second grace period)
        // The grace period is handled by activeMatches still containing the match for 5 seconds
        const isComplete = matchState.winner || matchState.status === 'complete';
        // Still show completed matches briefly (they'll be removed from activeMatches after 5 seconds)
        
        const matchData = {
            ...match,
            state: matchState,
            wagerAmount: spectateData?.wagerAmount || match.wagerAmount,
            wagerToken: spectateData?.wagerToken || match.wagerToken || null, // Include token wager for display
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
            // Monopoly banner is taller (280px vs 200px), UNO and others use standard
            const isMonopoly = matchData.gameType === 'monopoly';
            sprite.scale.set(8, isMonopoly ? 4.4 : 3.2, 1); // Banner size in world units
            sprite.renderOrder = 999; // Render on top
            
            scene.add(sprite);
            bannerData = { sprite, canvas, ctx, texture, gameType: matchData.gameType };
            banners.set(matchId, bannerData);
            
            // Store banner data for zoom overlay
            sprite.userData.bannerData = {
                type: 'canvas',
                title: `${matchData.gameType} Match`,
                description: 'Match information banner',
                canvas: canvas,
                renderFn: (ctx, w, h) => {
                    renderBannerToCanvas(ctx, matchData);
                }
            };
        }
        
        // Update banner content with latest state
        // This ensures banners reflect real-time game state updates from match_spectate messages
        renderBannerToCanvas(bannerData.ctx, matchData);
        bannerData.texture.needsUpdate = true;
        
        // Position above players (8 units above ground)
        bannerData.sprite.position.set(midX, 8, midZ);
        
        // Update stored banner data for zoom overlay to reflect latest state
        if (bannerData.sprite.userData.bannerData) {
            bannerData.sprite.userData.bannerData.renderFn = (ctx, w, h) => {
                renderBannerToCanvas(ctx, matchData);
            };
        }
        
        // Update stored banner data for zoom overlay to reflect latest state
        if (bannerData.sprite.userData.bannerData) {
            bannerData.sprite.userData.bannerData.renderFn = (ctx, w, h) => {
                renderBannerToCanvas(ctx, matchData);
            };
        }
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
    renderUnoBanner,
    renderBlackjackBanner,
    renderBattleshipBanner,
    renderBannerToCanvas,
    updateMatchBanners,
    cleanupMatchBanners,
    // PvE Activity Banners
    createPveBannerCanvas,
    renderFishingBanner,
    renderPveBlackjackBanner,
    renderPveBannerToCanvas,
    updatePveBanners,
    cleanupPveBanners
};
