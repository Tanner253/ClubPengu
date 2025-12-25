/**
 * DevBotService - Development Bot for Testing Token Wagering
 * 
 * ONLY ACTIVE IN NODE_ENV=development
 * 
 * Features:
 * - Static NPC at spawn position for easy testing
 * - Wallet is RENT_WALLET_ADDRESS (has tokens)
 * - Auto-accepts all challenges (if has supply)
 * - Dumb TicTacToe AI (random valid moves for testing all outcomes)
 */

const IS_DEV = process.env.NODE_ENV !== 'production';

// Bot configuration
const BOT_CONFIG = {
    id: 'dev_bot_wager',
    name: '🤖 WagerBot',
    // Static position near spawn in town (visible area)
    position: { x: 105, y: 0, z: 100 },
    room: 'town',
    // Appearance matches client's expected format (see src/constants.js PALETTE)
    appearance: {
        skin: 'purple',       // Purple penguin from PALETTE
        hat: 'tophat',        // Fancy top hat
        eyes: 'normal',       // Standard eyes
        mouth: 'beak',        // Standard beak
        bodyItem: 'suit'      // Fancy suit to look professional
    },
    // Bot uses the rent wallet (which should have tokens for testing)
    walletAddress: process.env.RENT_WALLET_ADDRESS || null
};

class DevBotService {
    constructor() {
        this.isActive = IS_DEV;
        this.botPlayer = null;
        this.pendingChallenges = new Map(); // challengeId -> challenge data
        this.activeMatch = null;
        
        // Service references (injected via init)
        this.challengeService = null;
        this.matchService = null;
        this.sendToPlayer = null; // Function to send messages to players
        
        if (!this.isActive) {
            console.log('🤖 DevBotService: Disabled (production mode)');
        }
    }
    
    /**
     * Initialize the bot service with dependencies
     * @param {object} services - { challengeService, matchService, sendToPlayer, onBotAcceptChallenge, onBotMakeMove }
     */
    init(services) {
        if (!this.isActive) return;
        
        this.challengeService = services.challengeService;
        this.matchService = services.matchService;
        this.sendToPlayer = services.sendToPlayer;
        // Callback to handle bot acceptance through proper server flow (creates match)
        this.onBotAcceptChallenge = services.onBotAcceptChallenge || null;
        // Callback to broadcast match state after bot makes a move
        this.onBotMakeMove = services.onBotMakeMove || null;
        
        // Create the bot player data
        this.botPlayer = {
            id: BOT_CONFIG.id,
            name: BOT_CONFIG.name,
            room: BOT_CONFIG.room,
            position: { ...BOT_CONFIG.position },
            rotation: { y: 0 },
            appearance: { ...BOT_CONFIG.appearance },
            walletAddress: BOT_CONFIG.walletAddress,
            isAuthenticated: true,
            isBot: true,
            lastHeartbeat: Date.now()
        };
        
        console.log('🤖 DevBotService: Initialized');
        console.log(`   Name: ${BOT_CONFIG.name}`);
        console.log(`   Position: (${BOT_CONFIG.position.x}, ${BOT_CONFIG.position.z})`);
        console.log(`   Wallet: ${BOT_CONFIG.walletAddress?.slice(0, 8) || 'none'}...`);
    }
    
    /**
     * Get the bot player data (for sending to clients)
     */
    getBotPlayer() {
        if (!this.isActive || !this.botPlayer) return null;
        return { ...this.botPlayer };
    }
    
    /**
     * Check if a player ID is the bot
     */
    isBot(playerId) {
        return this.isActive && playerId === BOT_CONFIG.id;
    }
    
    /**
     * Handle incoming challenge to the bot
     * Bot auto-accepts if not in a match
     * @param {object} challenge - Challenge object
     */
    async handleChallenge(challenge) {
        if (!this.isActive || !this.challengeService) return false;
        
        // Check if challenge is for the bot
        if (challenge.targetId !== BOT_CONFIG.id) return false;
        
        console.log(`🤖 DevBot received challenge: ${challenge.gameType} from ${challenge.challengerName}`);
        
        // If already in a match, verify it still exists before declining
        if (this.activeMatch) {
            // Verify the match actually exists in matchService
            const existingMatch = this.matchService?.getMatch(this.activeMatch.id);
            if (!existingMatch || existingMatch.status === 'complete') {
                // Stale activeMatch reference - clear it
                console.log('🤖 DevBot: Clearing stale activeMatch reference');
                this.activeMatch = null;
            } else {
                console.log('🤖 DevBot is busy, declining challenge');
                await this.challengeService.denyChallenge(challenge.challengeId, BOT_CONFIG.id);
                return true;
            }
        }
        
        // Auto-accept after a short delay (simulate thinking)
        setTimeout(async () => {
            console.log(`🤖 DevBot accepting challenge from ${challenge.challengerName}`);
            
            // Use the callback to go through proper server flow (which creates the match)
            if (this.onBotAcceptChallenge) {
                const result = await this.onBotAcceptChallenge(challenge.challengeId, BOT_CONFIG.id);
                if (result?.success) {
                    this.pendingChallenges.set(challenge.challengeId, challenge);
                    console.log(`🤖 DevBot challenge accepted, match should start`);
                } else {
                    console.log(`🤖 DevBot acceptance failed:`, result?.error || 'unknown');
                }
            } else {
                // Fallback to direct call (match won't start without callback)
                console.warn('🤖 DevBot: onBotAcceptChallenge callback not set, match may not start');
                const result = await this.challengeService.acceptChallenge(challenge.challengeId, BOT_CONFIG.id);
                if (result.success) {
                    this.pendingChallenges.set(challenge.challengeId, challenge);
                }
            }
        }, 1000 + Math.random() * 2000); // 1-3 second delay
        
        return true;
    }
    
    /**
     * Handle match start for the bot
     * @param {object} match - Match object
     */
    handleMatchStart(match) {
        if (!this.isActive) return false;
        
        // Check if bot is in this match
        const isBotPlayer1 = match.player1?.id === BOT_CONFIG.id;
        const isBotPlayer2 = match.player2?.id === BOT_CONFIG.id;
        
        if (!isBotPlayer1 && !isBotPlayer2) return false;
        
        this.activeMatch = {
            id: match.id,
            gameType: match.gameType,
            isBotPlayer1,
            opponentId: isBotPlayer1 ? match.player2.id : match.player1.id
        };
        
        console.log(`🤖 DevBot match started: ${match.gameType} vs ${isBotPlayer1 ? match.player2.name : match.player1.name}`);
        
        // Check if it's bot's turn (for tic_tac_toe, X always goes first, bot is X if player1)
        if (match.gameType === 'tic_tac_toe' && isBotPlayer1) {
            // Bot is X, goes first
            setTimeout(() => this.makeTicTacToeMove(match.id, match.state), 1500);
        }
        
        // For blackjack, check if bot needs to act
        if (match.gameType === 'blackjack') {
            const botPlayer = isBotPlayer1 ? 'player1' : 'player2';
            const expectedPhase = isBotPlayer1 ? 'player1Turn' : 'player2Turn';
            if (match.state?.currentTurn === botPlayer && match.state?.phase === expectedPhase) {
                setTimeout(() => this.makeBlackjackMove(match.id, match.state), 1500);
            }
        }
        
        // For battleship, bot should immediately ready during setup phase
        if (match.gameType === 'battleship') {
            // Send ready action after a short delay
            setTimeout(() => {
                if (this.activeMatch && this.matchService) {
                    console.log('🤖 DevBot sending ready for battleship');
                    this.matchService.playCard(match.id, BOT_CONFIG.id, { action: 'ready' });
                    if (this.onBotMakeMove) {
                        this.onBotMakeMove(match.id, { success: true, action: 'ready' });
                    }
                }
            }, 1000);
        }
        
        return true;
    }
    
    /**
     * Handle match state update
     * @param {string} matchId - Match ID
     * @param {object} state - New game state
     */
    handleMatchState(matchId, state) {
        if (!this.isActive || !this.activeMatch) return false;
        if (this.activeMatch.id !== matchId) return false;
        
        // Check if game is complete
        if (state.winner || state.phase === 'complete') {
            console.log(`🤖 DevBot match complete. Winner: ${state.winner || 'draw'}`);
            this.activeMatch = null;
            return true;
        }
        
        // For TicTacToe, check if it's bot's turn
        if (this.activeMatch.gameType === 'tic_tac_toe') {
            // currentTurn is 'player1' or 'player2', bot is player1 or player2
            const botPlayerTurn = this.activeMatch.isBotPlayer1 ? 'player1' : 'player2';
            
            if (state.currentTurn === botPlayerTurn) {
                // It's bot's turn, make a move after delay
                console.log(`🤖 DevBot: It's my turn (${botPlayerTurn}), scheduling move...`);
                setTimeout(() => this.makeTicTacToeMove(matchId, state), 1000 + Math.random() * 1000);
            }
        }
        
        // For Blackjack, check if it's bot's turn
        if (this.activeMatch.gameType === 'blackjack') {
            const botPlayerTurn = this.activeMatch.isBotPlayer1 ? 'player1' : 'player2';
            const expectedPhase = this.activeMatch.isBotPlayer1 ? 'player1Turn' : 'player2Turn';
            
            // Check if it's bot's turn (phase is player1Turn or player2Turn)
            if (state.currentTurn === botPlayerTurn && state.phase === expectedPhase) {
                // It's bot's turn, make a move after delay
                console.log(`🤖 DevBot: Blackjack - my turn (${botPlayerTurn}), phase: ${state.phase}, scheduling move...`);
                setTimeout(() => this.makeBlackjackMove(matchId, state), 1000 + Math.random() * 1500);
            }
        }
        
        // For Battleship, handle both setup and playing phases
        if (this.activeMatch.gameType === 'battleship') {
            const botPlayerKey = this.activeMatch.isBotPlayer1 ? 'player1' : 'player2';
            
            // During setup phase, ensure bot is ready
            if (state.phase === 'setup' || state.isSetupPhase) {
                const botReady = state.myReady ?? state[`${botPlayerKey}Ready`];
                if (!botReady) {
                    console.log('🤖 DevBot: Still need to ready for battleship');
                    setTimeout(() => {
                        if (this.activeMatch && this.matchService) {
                            this.matchService.playCard(matchId, BOT_CONFIG.id, { action: 'ready' });
                            if (this.onBotMakeMove) {
                                this.onBotMakeMove(matchId, { success: true, action: 'ready' });
                            }
                        }
                    }, 500);
                }
                return true;
            }
            
            // During playing phase, make moves
            if (state.currentTurn === botPlayerKey && state.phase === 'playing') {
                console.log(`🤖 DevBot: Battleship - my turn (${botPlayerKey}), scheduling shot...`);
                setTimeout(() => this.makeBattleshipMove(matchId, state), 1000 + Math.random() * 1500);
            }
        }
        
        return true;
    }
    
    /**
     * Make a TicTacToe move (DUMB AI - random valid moves)
     * @param {string} matchId - Match ID
     * @param {object} state - Current game state
     */
    makeTicTacToeMove(matchId, state) {
        if (!this.isActive || !this.matchService) return;
        if (!this.activeMatch || this.activeMatch.id !== matchId) return;
        
        const board = state.board;
        
        // Find all empty cells
        const emptyCells = [];
        for (let i = 0; i < 9; i++) {
            if (!board[i]) {
                emptyCells.push(i);
            }
        }
        
        if (emptyCells.length === 0) return;
        
        // DUMB AI: Pick a random empty cell
        // (We intentionally don't try to win or block - makes testing easier)
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        const cellIndex = emptyCells[randomIndex];
        
        console.log(`🤖 DevBot making TicTacToe move: cell ${cellIndex}`);
        
        // Make the move through the match service (method is playCard, not makeMove)
        // For TicTacToe, the second argument is the cell index directly
        const result = this.matchService.playCard(matchId, BOT_CONFIG.id, cellIndex);
        
        if (result.error) {
            console.error(`🤖 DevBot move failed:`, result.error);
            return;
        }
        
        // Notify server to broadcast the new state to all players
        if (this.onBotMakeMove) {
            this.onBotMakeMove(matchId, result);
        }
        
        if (result.gameComplete) {
            console.log(`🤖 DevBot move resulted in game complete`);
            this.activeMatch = null;
        }
    }
    
    /**
     * Make a Blackjack move (Basic Strategy AI)
     * Uses simplified basic blackjack strategy
     * @param {string} matchId - Match ID
     * @param {object} state - Current game state
     */
    makeBlackjackMove(matchId, state) {
        if (!this.isActive || !this.matchService) return;
        if (!this.activeMatch || this.activeMatch.id !== matchId) return;
        
        const isPlayer1 = this.activeMatch.isBotPlayer1;
        const myScore = isPlayer1 ? state.player1Score : state.player2Score;
        const myStatus = isPlayer1 ? state.player1Status : state.player2Status;
        
        // Already done (blackjack, stand, or bust)
        if (myStatus !== 'playing') {
            console.log(`🤖 DevBot: Already done with status: ${myStatus}`);
            return;
        }
        
        // Basic strategy: Hit on 16 or less, stand on 17+
        let action;
        if (myScore < 17) {
            action = 'hit';
        } else {
            action = 'stand';
        }
        
        console.log(`🤖 DevBot making Blackjack move: ${action} (score: ${myScore})`);
        
        // Use the blackjack action method
        const result = this.matchService._playBlackjack(
            this.matchService.matches.get(matchId),
            BOT_CONFIG.id,
            action
        );
        
        if (result.error) {
            console.error(`🤖 DevBot blackjack move failed:`, result.error);
            return;
        }
        
        // Notify server to broadcast the new state
        if (this.onBotMakeMove) {
            this.onBotMakeMove(matchId, result);
        }
        
        // Check if game complete or if we need to make another move
        const match = this.matchService.matches.get(matchId);
        if (match?.state?.phase === 'complete') {
            console.log(`🤖 DevBot blackjack game complete`);
            this.activeMatch = null;
        }
    }
    
    /**
     * Make a Battleship move (Simple AI - hunt/target mode)
     * @param {string} matchId - Match ID
     * @param {object} state - Current game state
     */
    makeBattleshipMove(matchId, state) {
        if (!this.isActive || !this.matchService) return;
        if (!this.activeMatch || this.activeMatch.id !== matchId) return;
        
        const isPlayer1 = this.activeMatch.isBotPlayer1;
        const myShotsKey = isPlayer1 ? 'player1Shots' : 'player2Shots';
        const shots = state[myShotsKey] || [];
        
        // Find unfired cells
        const unfiredCells = [];
        for (let i = 0; i < 100; i++) {
            if (shots[i] === null) {
                unfiredCells.push(i);
            }
        }
        
        if (unfiredCells.length === 0) return;
        
        // Simple AI: Look for adjacent cells to hits (hunt mode)
        let targetCell = null;
        
        // Find hits that might have adjacent unfired cells
        for (let i = 0; i < 100; i++) {
            if (shots[i] === 'hit') {
                const x = i % 10;
                const y = Math.floor(i / 10);
                
                // Check adjacent cells
                const adjacent = [
                    y > 0 ? i - 10 : -1,  // up
                    y < 9 ? i + 10 : -1,  // down
                    x > 0 ? i - 1 : -1,   // left
                    x < 9 ? i + 1 : -1    // right
                ].filter(c => c !== -1 && shots[c] === null);
                
                if (adjacent.length > 0) {
                    targetCell = adjacent[Math.floor(Math.random() * adjacent.length)];
                    break;
                }
            }
        }
        
        // If no hunt target found, pick random unfired cell
        if (targetCell === null) {
            targetCell = unfiredCells[Math.floor(Math.random() * unfiredCells.length)];
        }
        
        console.log(`🤖 DevBot making Battleship shot: cell ${targetCell}`);
        
        // Make the move through match service
        const result = this.matchService.playCard(matchId, BOT_CONFIG.id, targetCell);
        
        if (result.error) {
            console.error(`🤖 DevBot battleship shot failed:`, result.error);
            return;
        }
        
        // Notify server to broadcast the new state
        if (this.onBotMakeMove) {
            this.onBotMakeMove(matchId, result);
        }
        
        if (result.gameComplete) {
            console.log(`🤖 DevBot battleship game complete`);
            this.activeMatch = null;
        }
    }
    
    /**
     * Handle match end
     * @param {string} matchId - Match ID
     */
    handleMatchEnd(matchId) {
        if (!this.isActive) return false;
        
        if (this.activeMatch?.id === matchId) {
            console.log('🤖 DevBot match ended');
            this.activeMatch = null;
            return true;
        }
        
        return false;
    }
    
    /**
     * Clean up (called on server shutdown)
     */
    cleanup() {
        this.activeMatch = null;
        this.pendingChallenges.clear();
        console.log('🤖 DevBotService: Cleaned up');
    }
}

// Export singleton
const devBotService = new DevBotService();
export default devBotService;

// Also export config for use in other places
export { BOT_CONFIG };

