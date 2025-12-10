import GameManager from '../engine/GameManager';

/**
 * Minigame - Base class for all minigames
 * Provides common functionality for game flow, scoring, and rewards
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
        
        // Rewards
        this.baseReward = config.baseReward || 50;
        this.winBonus = config.winBonus || 100;
        
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
        
        // Calculate rewards
        let coins = this.baseReward;
        if (won) {
            coins += this.winBonus;
            GameManager.getInstance().incrementStat('gamesWon');
        }
        
        // Award coins
        GameManager.getInstance().addCoins(coins, this.id);
        
        this.onGameEnd({
            won,
            score: this.score,
            coins,
            elapsed: this.elapsedTime
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



