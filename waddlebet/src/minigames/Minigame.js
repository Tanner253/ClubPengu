import GameManager from '../engine/GameManager';

/**
 * Minigame - Base class for all minigames
 * Provides common functionality for game flow and scoring.
 * Solo practice: beat Sensei once for onboarding gold. PvP wagers use MatchService escrow.
 */
class Minigame {
    constructor(config = {}) {
        this.id = config.id || 'unknown';
        this.name = config.name || 'Minigame';
        this.description = config.description || '';

        // Game state
        this.state = 'waiting'; // waiting, playing, finished
        this.score = 0;
        this.round = 0;
        this.maxRounds = config.maxRounds || 5;

        // Players
        this.players = [];
        this.currentPlayer = 0;

        // Timing
        this.startTime = null;
        this.elapsedTime = 0;

        // Server send function (set by component)
        this.serverSend = config.serverSend || null;

        // Callbacks
        this.onStateChange = config.onStateChange || (() => {});
        this.onRoundEnd = config.onRoundEnd || (() => {});
        this.onGameEnd = config.onGameEnd || (() => {});
    }

    // --- GAME FLOW ---
    start() {
        this.state = 'playing';
        this.startTime = Date.now();
        this.round = 1;
        this.score = 0;

        GameManager.getInstance().incrementStat('gamesPlayed');
        this.onStateChange({ state: this.state, round: this.round });
    }

    nextRound() {
        this.round++;

        if (this.round > this.maxRounds) {
            this.finish();
        } else {
            this.onRoundEnd({ round: this.round, score: this.score });
        }
    }

    finish(won = false) {
        this.state = 'finished';
        this.elapsedTime = Date.now() - this.startTime;

        if (won) {
            GameManager.getInstance().incrementStat('gamesWon');
        }

        if (this.serverSend && GameManager.getInstance().isAuthenticatedMode()) {
            this.serverSend({
                type: 'minigame_complete',
                gameId: this.id,
                won,
                score: this.score,
            });
        }

        this.onGameEnd({
            won,
            score: this.score,
            elapsed: this.elapsedTime,
        });
    }

    // --- SCORING ---
    addScore(points) {
        this.score += points;
    }

    // --- STATE HELPERS ---
    isPlaying() {
        return this.state === 'playing';
    }

    isFinished() {
        return this.state === 'finished';
    }

    // --- TO BE OVERRIDDEN ---
    update(delta) {
        // Override in subclass
    }

    handleInput(input) {
        // Override in subclass
    }

    reset() {
        this.state = 'waiting';
        this.score = 0;
        this.round = 0;
        this.startTime = null;
    }
}

export default Minigame;
