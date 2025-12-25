/**
 * StatsService - Player statistics tracking with MongoDB persistence
 * Server-authoritative stats management
 */

import { User } from '../db/models/index.js';
import { isDBConnected } from '../db/connection.js';

// Normalize game type from server format to DB format
const normalizeGameType = (gameType) => {
    const mapping = {
        'card_jitsu': 'cardJitsu',
        'tic_tac_toe': 'ticTacToe',
        'connect4': 'connect4',
        'pong': 'pong',
        'blackjack': 'blackjack',
        'uno': 'uno',
        'monopoly': 'monopoly',
        'battleship': 'battleship'
    };
    return mapping[gameType] || gameType;
};

class StatsService {
    constructor(userService) {
        this.userService = userService;
        
        // In-memory cache for real-time stats (batched to DB periodically)
        this.pendingStats = new Map(); // walletAddress -> { updates }
        this.BATCH_INTERVAL = 30000; // 30 seconds
        
        // Start batch flush interval
        if (isDBConnected()) {
            setInterval(() => this.flushPendingStats(), this.BATCH_INTERVAL);
        }
    }

    /**
     * Record a match result
     * @param {string} walletAddress - Player's wallet
     * @param {string} gameType - Game type (server format: card_jitsu, tic_tac_toe, etc.)
     * @param {boolean} won - Whether player won
     * @param {number} coinsAmount - Coins won/lost (absolute value)
     * @param {boolean} isDraw - Whether the match was a draw
     */
    async recordResult(walletAddress, gameType, won, coinsAmount, isDraw = false) {
        if (!walletAddress) {
            console.warn('Cannot record stats: no wallet address');
            return;
        }

        const normalizedType = normalizeGameType(gameType);
        
        try {
            const user = await User.findOne({ walletAddress });
            if (!user) {
                console.warn(`Cannot record stats: user not found for ${walletAddress}`);
                return;
            }

            // Use the model method to record result
            user.recordGameResult(normalizedType, won, coinsAmount, isDraw);
            await user.save();

            // Log the result
            if (isDraw) {
                console.log(`📊 Stats: ${user.username} drew ${normalizedType}`);
            } else if (won) {
                console.log(`📊 Stats: ${user.username} won ${normalizedType} (+${coinsAmount} coins)`);
            } else {
                console.log(`📊 Stats: ${user.username} lost ${normalizedType} (-${coinsAmount} coins)`);
            }
        } catch (error) {
            console.error('Error recording stats:', error);
        }
    }

    /**
     * Get public stats for display (works with wallet or playerId)
     */
    async getPublicStats(identifier, isWallet = false) {
        try {
            let user;
            if (isWallet) {
                user = await User.findOne({ walletAddress: identifier });
            } else {
                // Find by current player ID
                user = await User.findOne({ currentPlayerId: identifier, isConnected: true });
            }
            
            if (!user) {
                // Return default stats for guest players
                return {
                    playerId: identifier,
                    coins: 0,
                    cardJitsuWins: 0,
                    cardJitsuLosses: 0,
                    ticTacToeWins: 0,
                    ticTacToeLosses: 0,
                    connect4Wins: 0,
                    connect4Losses: 0,
                    blackjackWins: 0,
                    blackjackLosses: 0,
                    unoWins: 0,
                    unoLosses: 0,
                    monopolyWins: 0,
                    monopolyLosses: 0,
                    battleshipWins: 0,
                    battleshipLosses: 0,
                    totalWins: 0,
                    totalLosses: 0,
                    isGuest: true
                };
            }

            return {
                walletAddress: user.walletAddress,
                username: user.username,
                coins: user.coins, // Include coin balance for profile viewing
                // Card Jitsu
                cardJitsuWins: user.gameStats.cardJitsu.wins,
                cardJitsuLosses: user.gameStats.cardJitsu.losses,
                cardJitsuDraws: user.gameStats.cardJitsu.draws,
                // Tic Tac Toe
                ticTacToeWins: user.gameStats.ticTacToe.wins,
                ticTacToeLosses: user.gameStats.ticTacToe.losses,
                ticTacToeDraws: user.gameStats.ticTacToe.draws,
                // Connect 4
                connect4Wins: user.gameStats.connect4.wins,
                connect4Losses: user.gameStats.connect4.losses,
                connect4Draws: user.gameStats.connect4.draws,
                // Blackjack
                blackjackWins: user.gameStats.blackjack?.wins || 0,
                blackjackLosses: user.gameStats.blackjack?.losses || 0,
                blackjackPushes: user.gameStats.blackjack?.pushes || 0,
                blackjackBlackjacks: user.gameStats.blackjack?.blackjacks || 0,
                blackjackPveWins: user.gameStats.blackjack?.pveWins || 0,
                blackjackPvpWins: user.gameStats.blackjack?.pvpWins || 0,
                // UNO
                unoWins: user.gameStats.uno?.wins || 0,
                unoLosses: user.gameStats.uno?.losses || 0,
                // Monopoly
                monopolyWins: user.gameStats.monopoly?.wins || 0,
                monopolyLosses: user.gameStats.monopoly?.losses || 0,
                // Battleship
                battleshipWins: user.gameStats.battleship?.wins || 0,
                battleshipLosses: user.gameStats.battleship?.losses || 0,
                // Totals
                totalWins: user.gameStats.overall.totalGamesWon,
                totalLosses: user.gameStats.overall.totalGamesLost,
                totalDraws: user.gameStats.overall.totalGamesDrew,
                totalGames: user.gameStats.overall.totalGamesPlayed,
                isGuest: false
            };
        } catch (error) {
            console.error('Error getting public stats:', error);
            return {
                playerId: identifier,
                cardJitsuWins: 0,
                cardJitsuLosses: 0,
                totalWins: 0,
                totalLosses: 0,
                error: true
            };
        }
    }

    /**
     * Queue a stat increment (batched write)
     */
    queueStatIncrement(walletAddress, statPath, amount = 1) {
        if (!walletAddress) return;
        
        if (!this.pendingStats.has(walletAddress)) {
            this.pendingStats.set(walletAddress, {});
        }
        
        const updates = this.pendingStats.get(walletAddress);
        updates[statPath] = (updates[statPath] || 0) + amount;
    }

    /**
     * Increment emote stat
     */
    async recordEmote(walletAddress, emoteType) {
        if (!walletAddress) return;
        
        const emoteKey = emoteType.toLowerCase();
        this.queueStatIncrement(walletAddress, `stats.emotes.${emoteKey}`, 1);
        this.queueStatIncrement(walletAddress, 'stats.social.totalEmotesUsed', 1);
    }

    /**
     * Record chat sent
     */
    recordChat(walletAddress) {
        if (!walletAddress) return;
        this.queueStatIncrement(walletAddress, 'stats.social.totalChatsSent', 1);
    }

    /**
     * Record whisper
     */
    recordWhisper(fromWallet, toWallet) {
        if (fromWallet) this.queueStatIncrement(fromWallet, 'stats.social.totalWhispersSent', 1);
        if (toWallet) this.queueStatIncrement(toWallet, 'stats.social.totalWhispersReceived', 1);
    }

    /**
     * Record room change
     */
    recordRoomChange(walletAddress, newRoom) {
        if (!walletAddress) return;
        this.queueStatIncrement(walletAddress, 'stats.movement.totalRoomChanges', 1);
        
        // Track building entry
        const buildings = ['dojo', 'nightclub', 'pizza', 'market'];
        if (buildings.includes(newRoom)) {
            this.queueStatIncrement(walletAddress, 'stats.movement.totalBuildingsEntered', 1);
        }
    }

    /**
     * Record challenge sent
     */
    recordChallengeSent(walletAddress) {
        if (!walletAddress) return;
        this.queueStatIncrement(walletAddress, 'stats.social.totalChallengesSent', 1);
    }

    /**
     * Record challenge received
     */
    recordChallengeReceived(walletAddress) {
        if (!walletAddress) return;
        this.queueStatIncrement(walletAddress, 'stats.social.totalChallengesReceived', 1);
    }

    /**
     * Flush pending stats to database
     */
    async flushPendingStats() {
        if (this.pendingStats.size === 0) return;
        if (!isDBConnected()) return;

        const batch = this.pendingStats;
        this.pendingStats = new Map();

        const bulkOps = [];
        
        for (const [wallet, updates] of batch) {
            const $inc = {};
            for (const [path, value] of Object.entries(updates)) {
                $inc[path] = value;
            }
            bulkOps.push({
                updateOne: {
                    filter: { walletAddress: wallet },
                    update: { $inc }
                }
            });
        }

        if (bulkOps.length > 0) {
            try {
                await User.bulkWrite(bulkOps);
                console.log(`📊 Flushed stats for ${bulkOps.length} users`);
            } catch (error) {
                console.error('Error flushing stats:', error);
                // Put failed updates back in queue
                for (const [wallet, updates] of batch) {
                    if (!this.pendingStats.has(wallet)) {
                        this.pendingStats.set(wallet, updates);
                    }
                }
            }
        }
    }

    /**
     * Force flush on shutdown
     */
    async shutdown() {
        await this.flushPendingStats();
    }
}

export default StatsService;
