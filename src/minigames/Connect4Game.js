import Minigame from './Minigame';

/**
 * Connect4Game - Classic 7x6 grid game
 * 
 * Rules:
 * - Two players take turns dropping discs into columns
 * - Discs fall to the lowest available position
 * - First to get 4 in a row (horizontal, vertical, diagonal) wins
 * - If board fills with no winner, it's a draw
 * - Player 1 is Red (🔴), Player 2 is Yellow (🟡)
 */
class Connect4Game extends Minigame {
    static ROWS = 6;
    static COLS = 7;
    static WIN_LENGTH = 4;
    
    constructor(config = {}) {
        super({
            id: 'connect4',
            name: 'Connect 4',
            description: 'Get 4 in a row to win!',
            baseReward: 75,
            winBonus: 150,
            maxRounds: 1,
            ...config
        });
        
        // Board state: 6 rows x 7 columns, null = empty, 'R' = Red, 'Y' = Yellow
        // Board[row][col] - row 0 is BOTTOM, row 5 is TOP
        this.board = this._createEmptyBoard();
        
        // Current turn: 'R' (Red/Player1) or 'Y' (Yellow/Player2)
        this.currentTurn = 'R';
        
        // Game phase: 'playing', 'complete'
        this.phase = 'playing';
        
        // Winner: null, 'R', 'Y', or 'draw'
        this.winner = null;
        
        // Winning cells for highlighting [[row, col], ...]
        this.winningCells = null;
        
        // Last move for animation
        this.lastMove = null;
    }
    
    /**
     * Create empty board (6 rows x 7 cols)
     */
    _createEmptyBoard() {
        return Array(Connect4Game.ROWS).fill(null)
            .map(() => Array(Connect4Game.COLS).fill(null));
    }
    
    /**
     * Flatten board to 1D array for serialization
     */
    _flattenBoard() {
        const flat = [];
        for (let row = 0; row < Connect4Game.ROWS; row++) {
            for (let col = 0; col < Connect4Game.COLS; col++) {
                flat.push(this.board[row][col]);
            }
        }
        return flat;
    }
    
    /**
     * Unflatten 1D array to 2D board
     */
    static unflattenBoard(flat) {
        const board = [];
        for (let row = 0; row < Connect4Game.ROWS; row++) {
            board.push(flat.slice(row * Connect4Game.COLS, (row + 1) * Connect4Game.COLS));
        }
        return board;
    }
    
    // --- GAME FLOW ---
    start() {
        super.start();
        this.board = this._createEmptyBoard();
        this.currentTurn = 'R';
        this.phase = 'playing';
        this.winner = null;
        this.winningCells = null;
        this.lastMove = null;
    }
    
    /**
     * Get the lowest available row in a column
     * @returns {number} Row index or -1 if column is full
     */
    getLowestEmptyRow(col) {
        for (let row = 0; row < Connect4Game.ROWS; row++) {
            if (this.board[row][col] === null) {
                return row;
            }
        }
        return -1; // Column is full
    }
    
    /**
     * Check if a column can accept a disc
     */
    canDropInColumn(col) {
        return col >= 0 && col < Connect4Game.COLS && this.board[Connect4Game.ROWS - 1][col] === null;
    }
    
    /**
     * Drop a disc into a column
     * @param {number} col - Column index (0-6)
     * @param {string} player - 'R' or 'Y'
     * @returns {Object} Result of the move
     */
    dropDisc(col, player) {
        // Validate
        if (this.phase !== 'playing') {
            return { error: 'GAME_OVER', message: 'Game is already over' };
        }
        
        if (player !== this.currentTurn) {
            return { error: 'NOT_YOUR_TURN', message: 'Not your turn' };
        }
        
        if (col < 0 || col >= Connect4Game.COLS) {
            return { error: 'INVALID_COLUMN', message: 'Invalid column' };
        }
        
        const row = this.getLowestEmptyRow(col);
        if (row === -1) {
            return { error: 'COLUMN_FULL', message: 'Column is full' };
        }
        
        // Make the move
        this.board[row][col] = player;
        this.lastMove = { row, col, player };
        
        // Check for winner
        const winResult = this.checkWinner(row, col);
        
        if (winResult.winner) {
            this.phase = 'complete';
            this.winner = winResult.winner;
            this.winningCells = winResult.cells;
            this.finish(winResult.winner === player);
            
            return {
                success: true,
                row,
                col,
                board: this._flattenBoard(),
                winner: this.winner,
                winningCells: this.winningCells,
                phase: this.phase
            };
        }
        
        // Check for draw (board full)
        if (this.isBoardFull()) {
            this.phase = 'complete';
            this.winner = 'draw';
            this.finish(false);
            
            return {
                success: true,
                row,
                col,
                board: this._flattenBoard(),
                winner: 'draw',
                winningCells: null,
                phase: this.phase
            };
        }
        
        // Switch turns
        this.currentTurn = this.currentTurn === 'R' ? 'Y' : 'R';
        
        return {
            success: true,
            row,
            col,
            board: this._flattenBoard(),
            currentTurn: this.currentTurn,
            phase: this.phase
        };
    }
    
    /**
     * Check if board is full
     */
    isBoardFull() {
        for (let col = 0; col < Connect4Game.COLS; col++) {
            if (this.board[Connect4Game.ROWS - 1][col] === null) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Check for winner starting from last placed disc
     * @returns {Object} { winner: 'R'|'Y'|null, cells: [[row,col],...] | null }
     */
    checkWinner(lastRow, lastCol) {
        const player = this.board[lastRow][lastCol];
        if (!player) return { winner: null, cells: null };
        
        // Directions: [rowDelta, colDelta]
        const directions = [
            [0, 1],   // Horizontal
            [1, 0],   // Vertical
            [1, 1],   // Diagonal up-right
            [1, -1],  // Diagonal up-left
        ];
        
        for (const [dr, dc] of directions) {
            const cells = this._countLine(lastRow, lastCol, dr, dc, player);
            if (cells.length >= Connect4Game.WIN_LENGTH) {
                return { winner: player, cells };
            }
        }
        
        return { winner: null, cells: null };
    }
    
    /**
     * Count connected cells in a line (both directions)
     */
    _countLine(row, col, dr, dc, player) {
        const cells = [[row, col]];
        
        // Count in positive direction
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < Connect4Game.ROWS && c >= 0 && c < Connect4Game.COLS && this.board[r][c] === player) {
            cells.push([r, c]);
            r += dr;
            c += dc;
        }
        
        // Count in negative direction
        r = row - dr;
        c = col - dc;
        while (r >= 0 && r < Connect4Game.ROWS && c >= 0 && c < Connect4Game.COLS && this.board[r][c] === player) {
            cells.push([r, c]);
            r -= dr;
            c -= dc;
        }
        
        return cells;
    }
    
    /**
     * Get available columns
     */
    getAvailableColumns() {
        const available = [];
        for (let col = 0; col < Connect4Game.COLS; col++) {
            if (this.canDropInColumn(col)) {
                available.push(col);
            }
        }
        return available;
    }
    
    /**
     * AI move (for solo play)
     */
    aiMove(difficulty = 'medium') {
        if (this.phase !== 'playing') return null;
        
        const available = this.getAvailableColumns();
        if (available.length === 0) return null;
        
        let col;
        
        if (difficulty === 'easy') {
            // Random column
            col = available[Math.floor(Math.random() * available.length)];
        } else {
            // Try to win or block
            col = this._findBestMove() || available[Math.floor(Math.random() * available.length)];
        }
        
        return this.dropDisc(col, this.currentTurn);
    }
    
    /**
     * Find best move (simple: win if possible, block opponent, or center)
     */
    _findBestMove() {
        const player = this.currentTurn;
        const opponent = player === 'R' ? 'Y' : 'R';
        
        // Check if we can win
        for (let col = 0; col < Connect4Game.COLS; col++) {
            const row = this.getLowestEmptyRow(col);
            if (row === -1) continue;
            
            this.board[row][col] = player;
            const result = this.checkWinner(row, col);
            this.board[row][col] = null;
            
            if (result.winner === player) return col;
        }
        
        // Check if we need to block opponent
        for (let col = 0; col < Connect4Game.COLS; col++) {
            const row = this.getLowestEmptyRow(col);
            if (row === -1) continue;
            
            this.board[row][col] = opponent;
            const result = this.checkWinner(row, col);
            this.board[row][col] = null;
            
            if (result.winner === opponent) return col;
        }
        
        // Prefer center column
        if (this.canDropInColumn(3)) return 3;
        
        return null;
    }
    
    // --- SERIALIZATION ---
    getState() {
        return {
            board: this._flattenBoard(),
            currentTurn: this.currentTurn,
            phase: this.phase,
            winner: this.winner,
            winningCells: this.winningCells,
            lastMove: this.lastMove,
            state: this.state
        };
    }
}

export default Connect4Game;

