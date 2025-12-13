/**
 * StatsService - Player statistics tracking
 * Tracks wins, losses, coins won/lost per game type
 */

class StatsService {
    constructor() {
        // In-memory stats storage (playerId -> stats)
        // TODO: Replace with database for persistence
        this.stats = new Map();
    }

    /**
     * Get or create stats for a player
     */
    getStats(playerId) {
        if (!this.stats.has(playerId)) {
            this.stats.set(playerId, this._createDefaultStats(playerId));
        }
        return this.stats.get(playerId);
    }

    /**
     * Create default stats object
     */
    _createDefaultStats(playerId) {
        return {
            playerId,
            cardJitsu: {
                wins: 0,
                losses: 0,
                coinsWon: 0,
                coinsLost: 0
            },
            // Extensible for future games
            connect4: { wins: 0, losses: 0, coinsWon: 0, coinsLost: 0 },
            pong: { wins: 0, losses: 0, coinsWon: 0, coinsLost: 0 },
            ticTacToe: { wins: 0, losses: 0, coinsWon: 0, coinsLost: 0 }
        };
    }

    /**
     * Record a match result
     * @param {string} playerId - Player ID
     * @param {string} gameType - Game type (cardJitsu, ticTacToe, etc.)
     * @param {boolean} won - Whether player won
     * @param {number} coinsAmount - Coins won/lost
     * @param {boolean} isDraw - Whether the match was a draw
     */
    recordResult(playerId, gameType, won, coinsAmount, isDraw = false) {
        const stats = this.getStats(playerId);
        const gameStats = stats[gameType];
        
        if (!gameStats) {
            console.warn(`Unknown game type: ${gameType}`);
            return;
        }

        if (isDraw) {
            // Draws don't count as wins or losses
            gameStats.draws = (gameStats.draws || 0) + 1;
            console.log(`📊 Stats updated: ${playerId} drew ${gameType} - Total draws: ${gameStats.draws}`);
        } else if (won) {
            gameStats.wins++;
            gameStats.coinsWon += coinsAmount;
            console.log(`📊 Stats updated: ${playerId} won ${gameType} (+${coinsAmount} coins) - Total wins: ${gameStats.wins}`);
        } else {
            gameStats.losses++;
            gameStats.coinsLost += coinsAmount;
            console.log(`📊 Stats updated: ${playerId} lost ${gameType} (-${coinsAmount} coins) - Total losses: ${gameStats.losses}`);
        }
    }

    /**
     * Get public stats for display
     */
    getPublicStats(playerId) {
        const stats = this.getStats(playerId);
        return {
            playerId,
            // Card Jitsu
            cardJitsuWins: stats.cardJitsu.wins,
            cardJitsuLosses: stats.cardJitsu.losses,
            // Tic Tac Toe
            ticTacToeWins: stats.ticTacToe.wins,
            ticTacToeLosses: stats.ticTacToe.losses,
            // Connect 4
            connect4Wins: stats.connect4.wins,
            connect4Losses: stats.connect4.losses,
            // Totals
            totalWins: stats.cardJitsu.wins + stats.connect4.wins + stats.pong.wins + stats.ticTacToe.wins,
            totalLosses: stats.cardJitsu.losses + stats.connect4.losses + stats.pong.losses + stats.ticTacToe.losses
        };
    }
}

export default StatsService;

