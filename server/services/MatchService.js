/**
 * MatchService - Manages active P2P matches
 * Handles game state, turns, timing, and win/loss resolution
 * Supports: Card Jitsu, Tic Tac Toe
 */

// Turn time limit (30 seconds)
const TURN_TIME_LIMIT_MS = 30 * 1000;

// Card Jitsu card definitions (same as client)
const CARD_ELEMENTS = ['fire', 'water', 'snow'];
const CARD_EMOJIS = {
    fire: ['🔥', '🌋', '☀️', '💥', '🌶️'],
    water: ['💧', '🌊', '🌧️', '❄️', '🐚'],
    snow: ['❄️', '⛄', '🏔️', '🌨️', '🧊']
};

// Tic Tac Toe winning combinations
const TTT_WIN_LINES = [
    [0, 1, 2], // Top row
    [3, 4, 5], // Middle row
    [6, 7, 8], // Bottom row
    [0, 3, 6], // Left column
    [1, 4, 7], // Middle column
    [2, 5, 8], // Right column
    [0, 4, 8], // Diagonal top-left to bottom-right
    [2, 4, 6], // Diagonal top-right to bottom-left
];

// Connect 4 constants
const C4_ROWS = 6;
const C4_COLS = 7;
const C4_WIN_LENGTH = 4;

class MatchService {
    constructor(statsService, broadcastToRoom, sendToPlayer) {
        this.statsService = statsService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
        
        // Active matches (matchId -> match)
        this.matches = new Map();
        // Player to match mapping (playerId -> matchId)
        this.playerMatches = new Map();
        this.nextMatchId = 1;
        
        // Turn timer interval
        this.timerInterval = setInterval(() => this.checkTurnTimers(), 1000);
    }

    /**
     * Create a match from an accepted challenge
     */
    createMatch(challenge, player1Data, player2Data) {
        const matchId = `match_${this.nextMatchId++}`;
        
        const match = {
            id: matchId,
            gameType: challenge.gameType,
            player1: {
                id: challenge.challengerId,
                name: challenge.challengerName,
                appearance: challenge.challengerAppearance,
                position: player1Data?.position || { x: 0, y: 0, z: 0 }
            },
            player2: {
                id: challenge.targetId,
                name: challenge.targetName,
                appearance: challenge.targetAppearance,
                position: player2Data?.position || { x: 0, y: 0, z: 0 }
            },
            wagerAmount: challenge.wagerAmount,
            room: challenge.room,
            status: 'active',
            state: this._createInitialState(challenge.gameType),
            createdAt: Date.now(),
            endedAt: null,
            winnerId: null
        };
        
        this.matches.set(matchId, match);
        this.playerMatches.set(challenge.challengerId, matchId);
        this.playerMatches.set(challenge.targetId, matchId);
        
        console.log(`🎮 Match started: ${match.player1.name} vs ${match.player2.name} (${challenge.gameType}, ${challenge.wagerAmount} coins)`);
        
        return match;
    }
    
    /**
     * Create initial game state based on game type
     */
    _createInitialState(gameType) {
        switch (gameType) {
            case 'tic_tac_toe':
                return {
                    board: Array(9).fill(null),
                    currentTurn: 'player1', // Player 1 is X, goes first
                    phase: 'playing',
                    winner: null,
                    winningLine: null,
                    turnStartedAt: Date.now()
                };
            
            case 'connect4':
                return {
                    board: Array(C4_ROWS * C4_COLS).fill(null), // 6 rows x 7 cols, flat array
                    currentTurn: 'player1', // Player 1 is Red (R), goes first
                    phase: 'playing',
                    winner: null,
                    winningCells: null,
                    lastMove: null,
                    turnStartedAt: Date.now()
                };
            
            case 'card_jitsu':
            default:
                // Generate initial hands for both players
                const player1Hand = this._generateHand();
                const player2Hand = this._generateHand();
                return {
                    round: 1,
                    phase: 'select', // 'select', 'reveal', 'complete'
                    player1Hand,
                    player2Hand,
                    player1SelectedCard: null,
                    player2SelectedCard: null,
                    player1Wins: { fire: 0, water: 0, snow: 0 },
                    player2Wins: { fire: 0, water: 0, snow: 0 },
                    turnStartedAt: Date.now(),
                    lastRoundResult: null
                };
        }
    }

    /**
     * Generate a single random card
     */
    _generateCard() {
        const element = CARD_ELEMENTS[Math.floor(Math.random() * 3)];
        const power = Math.floor(Math.random() * 5) + 1; // 1-5 (matches original Card Jitsu)
        const emoji = CARD_EMOJIS[element][Math.floor(Math.random() * 5)];
        return {
            id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            element,
            power,
            emoji
        };
    }

    /**
     * Generate a hand of 5 cards
     */
    _generateHand() {
        const hand = [];
        for (let i = 0; i < 5; i++) {
            hand.push(this._generateCard());
        }
        return hand;
    }

    /**
     * Get match by ID
     */
    getMatch(matchId) {
        return this.matches.get(matchId);
    }

    /**
     * Get match for a player
     */
    getPlayerMatch(playerId) {
        const matchId = this.playerMatches.get(playerId);
        return matchId ? this.matches.get(matchId) : null;
    }

    /**
     * Check if player is in a match
     */
    isPlayerInMatch(playerId) {
        return this.playerMatches.has(playerId);
    }

    /**
     * Play a card (or make a move in other game types)
     */
    playCard(matchId, playerId, cardIndex) {
        const match = this.matches.get(matchId);
        if (!match) {
            return { error: 'MATCH_NOT_FOUND' };
        }

        if (match.status !== 'active') {
            return { error: 'MATCH_NOT_ACTIVE' };
        }

        // Route to appropriate game handler
        if (match.gameType === 'tic_tac_toe') {
            return this._playTicTacToe(match, playerId, cardIndex);
        }
        
        if (match.gameType === 'connect4') {
            return this._playConnect4(match, playerId, cardIndex); // cardIndex is column for Connect4
        }
        
        // Default: Card Jitsu
        return this._playCardJitsu(match, playerId, cardIndex);
    }
    
    /**
     * Handle Tic Tac Toe move
     */
    _playTicTacToe(match, playerId, cellIndex) {
        const state = match.state;
        
        if (state.phase !== 'playing') {
            return { error: 'GAME_OVER' };
        }
        
        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        
        if (!isPlayer1 && !isPlayer2) {
            return { error: 'NOT_IN_MATCH' };
        }
        
        // Check if it's this player's turn
        const isMyTurn = (state.currentTurn === 'player1' && isPlayer1) || 
                         (state.currentTurn === 'player2' && isPlayer2);
        
        if (!isMyTurn) {
            return { error: 'NOT_YOUR_TURN' };
        }
        
        // Validate cell
        if (cellIndex < 0 || cellIndex > 8) {
            return { error: 'INVALID_CELL' };
        }
        
        if (state.board[cellIndex] !== null) {
            return { error: 'CELL_TAKEN' };
        }
        
        // Make the move
        const symbol = isPlayer1 ? 'X' : 'O';
        state.board[cellIndex] = symbol;
        
        // Check for winner
        const winResult = this._checkTicTacToeWinner(state.board);
        
        if (winResult.winner) {
            state.phase = 'complete';
            state.winner = winResult.winner;
            state.winningLine = winResult.line;
            match.status = 'complete';
            match.winnerId = winResult.winner === 'X' ? match.player1.id : match.player2.id;
            match.endedAt = Date.now();
            
            console.log(`🏆 Tic Tac Toe complete: ${winResult.winner === 'X' ? match.player1.name : match.player2.name} wins ${match.wagerAmount * 2} coins!`);
            
            return { success: true, gameComplete: true };
        }
        
        // Check for draw
        if (state.board.every(cell => cell !== null)) {
            state.phase = 'complete';
            state.winner = 'draw';
            state.winningLine = null;
            match.status = 'complete';
            match.winnerId = null; // Draw - no winner
            match.endedAt = Date.now();
            
            console.log(`🤝 Tic Tac Toe draw: ${match.player1.name} vs ${match.player2.name}`);
            
            return { success: true, gameComplete: true, isDraw: true };
        }
        
        // Switch turns
        state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
        state.turnStartedAt = Date.now();
        
        return { success: true };
    }
    
    /**
     * Check Tic Tac Toe winner
     */
    _checkTicTacToeWinner(board) {
        for (const line of TTT_WIN_LINES) {
            const [a, b, c] = line;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], line };
            }
        }
        return { winner: null, line: null };
    }
    
    /**
     * Handle Connect 4 move
     * @param {Object} match - The match object
     * @param {string} playerId - The player making the move
     * @param {number} column - Column to drop disc (0-6)
     */
    _playConnect4(match, playerId, column) {
        const state = match.state;
        
        if (state.phase !== 'playing') {
            return { error: 'GAME_OVER' };
        }
        
        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        
        if (!isPlayer1 && !isPlayer2) {
            return { error: 'NOT_IN_MATCH' };
        }
        
        // Check if it's this player's turn
        const isMyTurn = (state.currentTurn === 'player1' && isPlayer1) || 
                         (state.currentTurn === 'player2' && isPlayer2);
        
        if (!isMyTurn) {
            return { error: 'NOT_YOUR_TURN' };
        }
        
        // Validate column
        if (column < 0 || column >= C4_COLS) {
            return { error: 'INVALID_COLUMN' };
        }
        
        // Find lowest empty row in column
        const row = this._getConnect4LowestRow(state.board, column);
        if (row === -1) {
            return { error: 'COLUMN_FULL' };
        }
        
        // Make the move
        const disc = isPlayer1 ? 'R' : 'Y'; // Red or Yellow
        const cellIndex = row * C4_COLS + column;
        state.board[cellIndex] = disc;
        state.lastMove = { row, col: column };
        
        // Check for winner
        const winResult = this._checkConnect4Winner(state.board, row, column);
        
        if (winResult.winner) {
            state.phase = 'complete';
            state.winner = winResult.winner;
            state.winningCells = winResult.cells;
            match.status = 'complete';
            match.winnerId = winResult.winner === 'R' ? match.player1.id : match.player2.id;
            match.endedAt = Date.now();
            
            console.log(`🏆 Connect 4 complete: ${winResult.winner === 'R' ? match.player1.name : match.player2.name} wins ${match.wagerAmount * 2} coins!`);
            
            return { success: true, gameComplete: true };
        }
        
        // Check for draw (board full)
        if (state.board.every(cell => cell !== null)) {
            state.phase = 'complete';
            state.winner = 'draw';
            state.winningCells = null;
            match.status = 'complete';
            match.winnerId = null;
            match.endedAt = Date.now();
            
            console.log(`🤝 Connect 4 draw: ${match.player1.name} vs ${match.player2.name}`);
            
            return { success: true, gameComplete: true, isDraw: true };
        }
        
        // Switch turns
        state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
        state.turnStartedAt = Date.now();
        
        return { success: true };
    }
    
    /**
     * Get lowest empty row in a Connect 4 column
     * @returns {number} Row index (0 = bottom) or -1 if full
     */
    _getConnect4LowestRow(board, column) {
        for (let row = 0; row < C4_ROWS; row++) {
            const index = row * C4_COLS + column;
            if (board[index] === null) {
                return row;
            }
        }
        return -1;
    }
    
    /**
     * Check Connect 4 winner from last move position
     */
    _checkConnect4Winner(board, lastRow, lastCol) {
        const lastIndex = lastRow * C4_COLS + lastCol;
        const player = board[lastIndex];
        if (!player) return { winner: null, cells: null };
        
        // Check all four directions
        const directions = [
            [0, 1],   // Horizontal
            [1, 0],   // Vertical
            [1, 1],   // Diagonal /
            [1, -1],  // Diagonal \
        ];
        
        for (const [dr, dc] of directions) {
            const cells = this._countConnect4Line(board, lastRow, lastCol, dr, dc, player);
            if (cells.length >= C4_WIN_LENGTH) {
                return { winner: player, cells };
            }
        }
        
        return { winner: null, cells: null };
    }
    
    /**
     * Count connected cells in a line (both directions)
     */
    _countConnect4Line(board, row, col, dr, dc, player) {
        const cells = [[row, col]];
        
        // Count in positive direction
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS) {
            const index = r * C4_COLS + c;
            if (board[index] !== player) break;
            cells.push([r, c]);
            r += dr;
            c += dc;
        }
        
        // Count in negative direction
        r = row - dr;
        c = col - dc;
        while (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS) {
            const index = r * C4_COLS + c;
            if (board[index] !== player) break;
            cells.push([r, c]);
            r -= dr;
            c -= dc;
        }
        
        return cells;
    }
    
    /**
     * Handle Card Jitsu card play
     */
    _playCardJitsu(match, playerId, cardIndex) {
        if (match.state.phase !== 'select') {
            return { error: 'NOT_SELECT_PHASE' };
        }

        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        
        if (!isPlayer1 && !isPlayer2) {
            return { error: 'NOT_IN_MATCH' };
        }

        const hand = isPlayer1 ? match.state.player1Hand : match.state.player2Hand;
        
        if (cardIndex < 0 || cardIndex >= hand.length) {
            return { error: 'INVALID_CARD' };
        }

        // Record selection
        if (isPlayer1) {
            if (match.state.player1SelectedCard !== null) {
                return { error: 'ALREADY_SELECTED' };
            }
            match.state.player1SelectedCard = cardIndex;
        } else {
            if (match.state.player2SelectedCard !== null) {
                return { error: 'ALREADY_SELECTED' };
            }
            match.state.player2SelectedCard = cardIndex;
        }

        // Check if both players have selected
        if (match.state.player1SelectedCard !== null && match.state.player2SelectedCard !== null) {
            this._resolveRound(match);
        }

        return { success: true, bothSelected: match.state.phase === 'reveal' };
    }

    /**
     * Resolve a round after both players selected
     */
    _resolveRound(match) {
        match.state.phase = 'reveal';
        
        const p1Card = match.state.player1Hand[match.state.player1SelectedCard];
        const p2Card = match.state.player2Hand[match.state.player2SelectedCard];
        
        // Determine winner
        let roundWinner = this._determineWinner(p1Card, p2Card);
        
        // Record win
        if (roundWinner === 'player1') {
            match.state.player1Wins[p1Card.element]++;
        } else if (roundWinner === 'player2') {
            match.state.player2Wins[p2Card.element]++;
        }
        
        match.state.lastRoundResult = {
            player1Card: p1Card,
            player2Card: p2Card,
            winner: roundWinner
        };

        // Check for match winner
        const p1Won = this._checkWinCondition(match.state.player1Wins);
        const p2Won = this._checkWinCondition(match.state.player2Wins);
        
        if (p1Won || p2Won) {
            match.state.phase = 'complete';
            match.status = 'complete';
            match.winnerId = p1Won ? match.player1.id : match.player2.id;
            match.endedAt = Date.now();
            
            // Stats are recorded in server/index.js to avoid duplication
            // (server/index.js handles coin transfers and stats together)
            
            console.log(`🏆 Match complete: ${p1Won ? match.player1.name : match.player2.name} wins ${match.wagerAmount * 2} coins!`);
        } else {
            // Prepare for next round
            setTimeout(() => {
                if (match.status === 'active' || match.state.phase === 'reveal') {
                    this._startNextRound(match);
                }
            }, 2000); // 2 second reveal pause
        }

        return match.state.lastRoundResult;
    }

    /**
     * Determine round winner
     */
    _determineWinner(card1, card2) {
        // Element comparison
        const wins = {
            fire: 'snow',   // Fire beats Snow
            snow: 'water',  // Snow beats Water
            water: 'fire'   // Water beats Fire
        };
        
        if (wins[card1.element] === card2.element) {
            return 'player1';
        } else if (wins[card2.element] === card1.element) {
            return 'player2';
        } else {
            // Same element - higher power wins
            if (card1.power > card2.power) return 'player1';
            if (card2.power > card1.power) return 'player2';
            return 'tie';
        }
    }

    /**
     * Check win condition
     * Win with: 3 of same element OR 1 of each element
     */
    _checkWinCondition(wins) {
        // 3 of same element
        if (wins.fire >= 3 || wins.water >= 3 || wins.snow >= 3) {
            return true;
        }
        // 1 of each element
        if (wins.fire >= 1 && wins.water >= 1 && wins.snow >= 1) {
            return true;
        }
        return false;
    }

    /**
     * Start next round
     */
    _startNextRound(match) {
        // Remove played cards and replace with new ones BEFORE resetting selections
        // This must happen before we clear the selected card indices
        if (match.state.player1SelectedCard !== null) {
            // Remove the played card
            match.state.player1Hand.splice(match.state.player1SelectedCard, 1);
            // Add a new random card to the hand
            match.state.player1Hand.push(this._generateCard());
        }
        if (match.state.player2SelectedCard !== null) {
            // Remove the played card
            match.state.player2Hand.splice(match.state.player2SelectedCard, 1);
            // Add a new random card to the hand
            match.state.player2Hand.push(this._generateCard());
        }
        
        match.state.round++;
        match.state.phase = 'select';
        match.state.player1SelectedCard = null;
        match.state.player2SelectedCard = null;
        match.state.turnStartedAt = Date.now();
        match.state.lastRoundResult = null;
        
        // Safety: ensure hands have 5 cards (regenerate if somehow corrupted)
        while (match.state.player1Hand.length < 5) {
            match.state.player1Hand.push(this._generateCard());
        }
        while (match.state.player2Hand.length < 5) {
            match.state.player2Hand.push(this._generateCard());
        }
        
        // Notify players
        this._notifyMatchState(match);
    }

    /**
     * Check turn timers and auto-play if expired
     */
    checkTurnTimers() {
        const now = Date.now();
        
        for (const [matchId, match] of this.matches) {
            if (match.status !== 'active') continue;
            
            const elapsed = now - match.state.turnStartedAt;
            if (elapsed < TURN_TIME_LIMIT_MS) continue;
            
            // Handle timeout based on game type
            if (match.gameType === 'tic_tac_toe') {
                this._handleTicTacToeTimeout(match);
            } else if (match.gameType === 'connect4') {
                this._handleConnect4Timeout(match);
            } else {
                this._handleCardJitsuTimeout(match);
            }
            
            this._notifyMatchState(match);
        }
    }
    
    /**
     * Handle Tic Tac Toe timeout - auto-play random empty cell
     */
    _handleTicTacToeTimeout(match) {
        const state = match.state;
        if (state.phase !== 'playing') return;
        
        // Find empty cells
        const emptyCells = state.board
            .map((cell, index) => cell === null ? index : -1)
            .filter(index => index !== -1);
        
        if (emptyCells.length === 0) return;
        
        // Pick random empty cell
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const currentPlayerId = state.currentTurn === 'player1' ? match.player1.id : match.player2.id;
        
        console.log(`⏰ Auto-play for ${state.currentTurn === 'player1' ? match.player1.name : match.player2.name} (Tic Tac Toe)`);
        
        this._playTicTacToe(match, currentPlayerId, randomCell);
    }
    
    /**
     * Handle Connect 4 timeout - auto-play random available column
     */
    _handleConnect4Timeout(match) {
        const state = match.state;
        if (state.phase !== 'playing') return;
        
        // Find columns that aren't full
        const availableCols = [];
        for (let col = 0; col < C4_COLS; col++) {
            // Check if top row of column is empty
            const topIndex = (C4_ROWS - 1) * C4_COLS + col;
            if (state.board[topIndex] === null) {
                availableCols.push(col);
            }
        }
        
        if (availableCols.length === 0) return;
        
        // Prefer center column, then random
        let column;
        if (availableCols.includes(3)) {
            column = 3;
        } else {
            column = availableCols[Math.floor(Math.random() * availableCols.length)];
        }
        
        const currentPlayerId = state.currentTurn === 'player1' ? match.player1.id : match.player2.id;
        
        console.log(`⏰ Auto-play for ${state.currentTurn === 'player1' ? match.player1.name : match.player2.name} (Connect 4)`);
        
        this._playConnect4(match, currentPlayerId, column);
    }
    
    /**
     * Handle Card Jitsu timeout - auto-play first card
     */
    _handleCardJitsuTimeout(match) {
        if (match.state.phase !== 'select') return;
        
        // Auto-play for players who haven't selected
        if (match.state.player1SelectedCard === null) {
            match.state.player1SelectedCard = 0; // First card
            console.log(`⏰ Auto-play for ${match.player1.name}`);
        }
        if (match.state.player2SelectedCard === null) {
            match.state.player2SelectedCard = 0; // First card
            console.log(`⏰ Auto-play for ${match.player2.name}`);
        }
        
        this._resolveRound(match);
    }

    /**
     * Notify players of match state
     */
    _notifyMatchState(match) {
        const state = this.getMatchState(match.id, match.player1.id);
        this.sendToPlayer(match.player1.id, {
            type: 'match_state',
            matchId: match.id,
            state
        });
        
        const state2 = this.getMatchState(match.id, match.player2.id);
        this.sendToPlayer(match.player2.id, {
            type: 'match_state',
            matchId: match.id,
            state: state2
        });
        
        // Broadcast to spectators
        this._broadcastSpectatorUpdate(match);
    }

    /**
     * Broadcast spectator update to room
     */
    _broadcastSpectatorUpdate(match) {
        if (!match.room) return;
        
        let spectatorState;
        
        if (match.gameType === 'tic_tac_toe') {
            spectatorState = {
                board: [...match.state.board],
                currentTurn: match.state.currentTurn,
                phase: match.state.phase,
                winner: match.state.winner,
                winningLine: match.state.winningLine,
                status: match.status,
                winnerId: match.winnerId
            };
        } else if (match.gameType === 'connect4') {
            // Connect 4 spectator state
            spectatorState = {
                board: [...match.state.board],
                currentTurn: match.state.currentTurn,
                phase: match.state.phase,
                winner: match.state.winner,
                winningCells: match.state.winningCells,
                lastMove: match.state.lastMove,
                status: match.status,
                winnerId: match.winnerId
            };
        } else {
            // Card Jitsu spectator state
            spectatorState = {
                round: match.state.round,
                phase: match.state.phase,
                player1Wins: match.state.player1Wins,
                player2Wins: match.state.player2Wins,
                lastRoundResult: match.state.lastRoundResult ? {
                    player1Card: { element: match.state.lastRoundResult.player1Card?.element, emoji: match.state.lastRoundResult.player1Card?.emoji },
                    player2Card: { element: match.state.lastRoundResult.player2Card?.element, emoji: match.state.lastRoundResult.player2Card?.emoji },
                    winner: match.state.lastRoundResult.winner
                } : null,
                status: match.status,
                winnerId: match.winnerId
            };
        }
        
        this.broadcastToRoom(match.room, {
            type: 'match_spectate',
            matchId: match.id,
            gameType: match.gameType,
            players: [
                { id: match.player1.id, name: match.player1.name, position: match.player1.position },
                { id: match.player2.id, name: match.player2.name, position: match.player2.position }
            ],
            state: spectatorState,
            wagerAmount: match.wagerAmount
        }, match.player1.id, match.player2.id); // Exclude players in match
    }

    /**
     * Get match state for a specific player (hides opponent's hand/selection)
     */
    getMatchState(matchId, playerId) {
        const match = this.matches.get(matchId);
        if (!match) return null;

        const isPlayer1 = playerId === match.player1.id;
        
        const timeRemaining = Math.max(0, Math.ceil(
            (TURN_TIME_LIMIT_MS - (Date.now() - match.state.turnStartedAt)) / 1000
        ));

        // Return game-type specific state
        if (match.gameType === 'tic_tac_toe') {
            return this._getTicTacToeState(match, playerId, isPlayer1, timeRemaining);
        }
        
        if (match.gameType === 'connect4') {
            return this._getConnect4State(match, playerId, isPlayer1, timeRemaining);
        }
        
        // Default: Card Jitsu state
        return this._getCardJitsuState(match, playerId, isPlayer1, timeRemaining);
    }
    
    /**
     * Get Tic Tac Toe state for a player
     */
    _getTicTacToeState(match, playerId, isPlayer1, timeRemaining) {
        const state = match.state;
        const isMyTurn = (state.currentTurn === 'player1' && isPlayer1) || 
                         (state.currentTurn === 'player2' && !isPlayer1);
        
        return {
            board: [...state.board],
            currentTurn: state.currentTurn,
            isMyTurn,
            mySymbol: isPlayer1 ? 'X' : 'O',
            opponentSymbol: isPlayer1 ? 'O' : 'X',
            phase: state.phase,
            winner: state.winner,
            winningLine: state.winningLine,
            turnTimeRemaining: timeRemaining,
            isPlayer1,
            status: match.status,
            winnerId: match.winnerId
        };
    }
    
    /**
     * Get Connect 4 state for a player
     */
    _getConnect4State(match, playerId, isPlayer1, timeRemaining) {
        const state = match.state;
        const isMyTurn = (state.currentTurn === 'player1' && isPlayer1) || 
                         (state.currentTurn === 'player2' && !isPlayer1);
        
        return {
            board: [...state.board],
            currentTurn: state.currentTurn,
            isMyTurn,
            myColor: isPlayer1 ? 'R' : 'Y',
            opponentColor: isPlayer1 ? 'Y' : 'R',
            phase: state.phase,
            winner: state.winner,
            winningCells: state.winningCells,
            lastMove: state.lastMove,
            turnTimeRemaining: timeRemaining,
            isPlayer1,
            status: match.status,
            winnerId: match.winnerId
        };
    }
    
    /**
     * Get Card Jitsu state for a player
     */
    _getCardJitsuState(match, playerId, isPlayer1, timeRemaining) {
        const myHand = isPlayer1 ? match.state.player1Hand : match.state.player2Hand;
        const mySelection = isPlayer1 ? match.state.player1SelectedCard : match.state.player2SelectedCard;
        const opponentSelection = isPlayer1 ? match.state.player2SelectedCard : match.state.player1SelectedCard;

        return {
            round: match.state.round,
            phase: match.state.phase,
            myHand,
            mySelectedCard: mySelection,
            opponentHasSelected: opponentSelection !== null,
            player1Wins: match.state.player1Wins,
            player2Wins: match.state.player2Wins,
            turnTimeRemaining: timeRemaining,
            lastRoundResult: match.state.lastRoundResult,
            isPlayer1,
            status: match.status,
            winnerId: match.winnerId
        };
    }

    /**
     * Void a match (e.g., on disconnect)
     */
    voidMatch(matchId, reason = 'disconnect') {
        const match = this.matches.get(matchId);
        if (!match) return null;

        match.status = 'void';
        match.endedAt = Date.now();
        
        // Clean up player mappings
        this.playerMatches.delete(match.player1.id);
        this.playerMatches.delete(match.player2.id);
        
        console.log(`🚫 Match voided: ${match.player1.name} vs ${match.player2.name} (${reason})`);
        
        return {
            matchId,
            player1Id: match.player1.id,
            player2Id: match.player2.id,
            wagerAmount: match.wagerAmount,
            reason
        };
    }

    /**
     * End a match normally
     */
    endMatch(matchId) {
        const match = this.matches.get(matchId);
        if (!match) return null;

        // Clean up player mappings
        this.playerMatches.delete(match.player1.id);
        this.playerMatches.delete(match.player2.id);

        return match;
    }

    /**
     * Handle player disconnect
     */
    handleDisconnect(playerId) {
        const matchId = this.playerMatches.get(playerId);
        if (!matchId) return null;

        const match = this.matches.get(matchId);
        if (!match || match.status !== 'active') return null;

        return this.voidMatch(matchId, 'disconnect');
    }

    /**
     * Get all active matches in a room (for spectating)
     */
    getMatchesInRoom(room) {
        const matches = [];
        for (const [, match] of this.matches) {
            if (match.room === room && match.status === 'active') {
                // Build game-type specific state for spectators
                let spectatorState;
                if (match.gameType === 'tic_tac_toe') {
                    spectatorState = {
                        board: [...match.state.board],
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        winner: match.state.winner,
                        winningLine: match.state.winningLine,
                        status: match.status
                    };
                } else if (match.gameType === 'connect4') {
                    spectatorState = {
                        board: [...match.state.board],
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        winner: match.state.winner,
                        winningCells: match.state.winningCells,
                        lastMove: match.state.lastMove,
                        status: match.status
                    };
                } else {
                    // Card Jitsu
                    spectatorState = {
                        round: match.state.round,
                        phase: match.state.phase,
                        player1Wins: match.state.player1Wins,
                        player2Wins: match.state.player2Wins,
                        status: match.status
                    };
                }
                
                matches.push({
                    matchId: match.id,
                    players: [
                        { id: match.player1.id, name: match.player1.name, position: match.player1.position },
                        { id: match.player2.id, name: match.player2.name, position: match.player2.position }
                    ],
                    gameType: match.gameType,
                    wagerAmount: match.wagerAmount,
                    state: spectatorState
                });
            }
        }
        return matches;
    }

    /**
     * Cleanup on shutdown
     */
    dispose() {
        clearInterval(this.timerInterval);
    }
}

export default MatchService;

