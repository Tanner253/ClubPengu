import Minigame from './Minigame';

/**
 * TicTacToeGame - Classic 3x3 grid game
 * 
 * Rules:
 * - Two players take turns marking X or O
 * - First to get 3 in a row (horizontal, vertical, diagonal) wins
 * - If board fills with no winner, it's a draw
 * - Player 1 is always X, Player 2 is always O
 */
class TicTacToeGame extends Minigame {
    constructor(config = {}) {
        super({
            id: 'tic-tac-toe',
            name: 'Tic Tac Toe',
            description: 'The classic game of X and O!',
            baseReward: 50,
            winBonus: 100,
            maxRounds: 1, // Single game
            ...config
        });
        
        // Board state: 9 cells, null = empty, 'X' or 'O'
        this.board = Array(9).fill(null);
        
        // Current turn: 'X' or 'O'
        this.currentTurn = 'X';
        
        // Game phase: 'playing', 'complete'
        this.phase = 'playing';
        
        // Winner: null, 'X', 'O', or 'draw'
        this.winner = null;
        
        // Winning line indices (for highlighting)
        this.winningLine = null;
    }
    
    // Winning combinations (indices)
    static WIN_LINES = [
        [0, 1, 2], // Top row
        [3, 4, 5], // Middle row
        [6, 7, 8], // Bottom row
        [0, 3, 6], // Left column
        [1, 4, 7], // Middle column
        [2, 5, 8], // Right column
        [0, 4, 8], // Diagonal top-left to bottom-right
        [2, 4, 6], // Diagonal top-right to bottom-left
    ];
    
    // --- GAME FLOW ---
    start() {
        super.start();
        this.board = Array(9).fill(null);
        this.currentTurn = 'X';
        this.phase = 'playing';
        this.winner = null;
        this.winningLine = null;
    }
    
    /**
     * Make a move
     * @param {number} cellIndex - 0-8 index of the cell
     * @param {string} player - 'X' or 'O'
     * @returns {Object} Result of the move
     */
    makeMove(cellIndex, player) {
        // Validate
        if (this.phase !== 'playing') {
            return { error: 'GAME_OVER', message: 'Game is already over' };
        }
        
        if (player !== this.currentTurn) {
            return { error: 'NOT_YOUR_TURN', message: 'Not your turn' };
        }
        
        if (cellIndex < 0 || cellIndex > 8) {
            return { error: 'INVALID_CELL', message: 'Invalid cell index' };
        }
        
        if (this.board[cellIndex] !== null) {
            return { error: 'CELL_TAKEN', message: 'Cell is already taken' };
        }
        
        // Make the move
        this.board[cellIndex] = player;
        
        // Check for winner
        const result = this.checkWinner();
        
        if (result.winner) {
            this.phase = 'complete';
            this.winner = result.winner;
            this.winningLine = result.line;
            this.finish(result.winner === player);
            
            return {
                success: true,
                board: [...this.board],
                winner: this.winner,
                winningLine: this.winningLine,
                phase: this.phase
            };
        }
        
        // Check for draw
        if (this.board.every(cell => cell !== null)) {
            this.phase = 'complete';
            this.winner = 'draw';
            this.finish(false);
            
            return {
                success: true,
                board: [...this.board],
                winner: 'draw',
                winningLine: null,
                phase: this.phase
            };
        }
        
        // Switch turns
        this.currentTurn = this.currentTurn === 'X' ? 'O' : 'X';
        
        return {
            success: true,
            board: [...this.board],
            currentTurn: this.currentTurn,
            phase: this.phase
        };
    }
    
    /**
     * Check for a winner
     * @returns {Object} { winner: 'X'|'O'|null, line: number[]|null }
     */
    checkWinner() {
        for (const line of TicTacToeGame.WIN_LINES) {
            const [a, b, c] = line;
            if (this.board[a] && 
                this.board[a] === this.board[b] && 
                this.board[a] === this.board[c]) {
                return { winner: this.board[a], line };
            }
        }
        return { winner: null, line: null };
    }
    
    /**
     * Get available moves
     * @returns {number[]} Array of empty cell indices
     */
    getAvailableMoves() {
        return this.board
            .map((cell, index) => cell === null ? index : -1)
            .filter(index => index !== -1);
    }
    
    /**
     * AI move (for solo play)
     * Uses minimax for unbeatable AI or random for easy mode
     */
    aiMove(difficulty = 'medium') {
        if (this.phase !== 'playing') return null;
        
        const available = this.getAvailableMoves();
        if (available.length === 0) return null;
        
        let move;
        
        if (difficulty === 'easy') {
            // Random move
            move = available[Math.floor(Math.random() * available.length)];
        } else if (difficulty === 'hard') {
            // Minimax for perfect play
            move = this._minimaxMove();
        } else {
            // Medium: 50% chance of optimal move
            if (Math.random() < 0.5) {
                move = this._minimaxMove();
            } else {
                move = available[Math.floor(Math.random() * available.length)];
            }
        }
        
        return this.makeMove(move, this.currentTurn);
    }
    
    /**
     * Minimax algorithm for optimal AI
     */
    _minimaxMove() {
        let bestScore = -Infinity;
        let bestMove = null;
        
        for (const move of this.getAvailableMoves()) {
            this.board[move] = 'O';
            const score = this._minimax(0, false);
            this.board[move] = null;
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }
    
    _minimax(depth, isMaximizing) {
        const result = this.checkWinner();
        
        if (result.winner === 'O') return 10 - depth;
        if (result.winner === 'X') return depth - 10;
        if (this.getAvailableMoves().length === 0) return 0;
        
        if (isMaximizing) {
            let bestScore = -Infinity;
            for (const move of this.getAvailableMoves()) {
                this.board[move] = 'O';
                bestScore = Math.max(bestScore, this._minimax(depth + 1, false));
                this.board[move] = null;
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (const move of this.getAvailableMoves()) {
                this.board[move] = 'X';
                bestScore = Math.min(bestScore, this._minimax(depth + 1, true));
                this.board[move] = null;
            }
            return bestScore;
        }
    }
    
    // --- SERIALIZATION ---
    getState() {
        return {
            board: [...this.board],
            currentTurn: this.currentTurn,
            phase: this.phase,
            winner: this.winner,
            winningLine: this.winningLine,
            state: this.state
        };
    }
}

export default TicTacToeGame;

