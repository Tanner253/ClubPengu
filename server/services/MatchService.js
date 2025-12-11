/**
 * MatchService - Manages active P2P matches
 * Handles game state, turns, timing, and win/loss resolution
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
        
        // Generate initial hands for both players
        const player1Hand = this._generateHand();
        const player2Hand = this._generateHand();
        
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
            state: {
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
            },
            createdAt: Date.now(),
            endedAt: null,
            winnerId: null
        };
        
        this.matches.set(matchId, match);
        this.playerMatches.set(challenge.challengerId, matchId);
        this.playerMatches.set(challenge.targetId, matchId);
        
        console.log(`🎮 Match started: ${match.player1.name} vs ${match.player2.name} (${challenge.wagerAmount} coins)`);
        
        return match;
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
     * Play a card
     */
    playCard(matchId, playerId, cardIndex) {
        const match = this.matches.get(matchId);
        if (!match) {
            return { error: 'MATCH_NOT_FOUND' };
        }

        if (match.status !== 'active') {
            return { error: 'MATCH_NOT_ACTIVE' };
        }

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
            if (match.status !== 'active' || match.state.phase !== 'select') continue;
            
            const elapsed = now - match.state.turnStartedAt;
            if (elapsed >= TURN_TIME_LIMIT_MS) {
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
                this._notifyMatchState(match);
            }
        }
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
        
        this.broadcastToRoom(match.room, {
            type: 'match_spectate',
            matchId: match.id,
            players: [
                { id: match.player1.id, name: match.player1.name, position: match.player1.position },
                { id: match.player2.id, name: match.player2.name, position: match.player2.position }
            ],
            state: {
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
            },
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
        const myHand = isPlayer1 ? match.state.player1Hand : match.state.player2Hand;
        const mySelection = isPlayer1 ? match.state.player1SelectedCard : match.state.player2SelectedCard;
        const opponentSelection = isPlayer1 ? match.state.player2SelectedCard : match.state.player1SelectedCard;
        
        const timeRemaining = Math.max(0, Math.ceil(
            (TURN_TIME_LIMIT_MS - (Date.now() - match.state.turnStartedAt)) / 1000
        ));

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
                matches.push({
                    matchId: match.id,
                    player1: { id: match.player1.id, name: match.player1.name, position: match.player1.position },
                    player2: { id: match.player2.id, name: match.player2.name, position: match.player2.position },
                    gameType: match.gameType,
                    wagerAmount: match.wagerAmount,
                    state: {
                        round: match.state.round,
                        player1Wins: match.state.player1Wins,
                        player2Wins: match.state.player2Wins
                    }
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

