import Minigame from './Minigame';

/**
 * CardJitsuGame - Turn-based card battle game
 * 
 * Rules:
 * - Fire beats Snow (melts it)
 * - Snow beats Water (freezes it)
 * - Water beats Fire (extinguishes it)
 * - Same element: Higher power wins
 * - Win by: 3 of same element OR 1 of each element
 */
class CardJitsuGame extends Minigame {
    constructor(config = {}) {
        super({
            id: 'card-jitsu',
            name: 'Card Jitsu',
            description: 'The ancient art of card combat!',
            baseReward: 75,
            winBonus: 150,
            maxRounds: 10,
            ...config
        });
        
        this.elements = ['fire', 'water', 'snow'];
        this.elementColors = {
            fire: '#FF4444',
            water: '#4488FF',
            snow: '#AAEEFF'
        };
        this.elementEmoji = {
            fire: '🔥',
            water: '💧',
            snow: '❄️'
        };
        
        // Decks
        this.playerDeck = [];
        this.playerHand = [];
        this.opponentDeck = [];
        this.opponentHand = [];
        
        // Battle state
        this.playerCard = null;
        this.opponentCard = null;
        this.roundResult = null;
        
        // Win tracking
        this.playerWins = { fire: 0, water: 0, snow: 0 };
        this.opponentWins = { fire: 0, water: 0, snow: 0 };
        
        // Animation state
        this.phase = 'select'; // select, reveal, result
    }
    
    // --- DECK MANAGEMENT ---
    generateDeck() {
        const deck = [];
        const cardId = { current: 0 };
        
        // Generate cards for each element
        this.elements.forEach(element => {
            // 3 cards of each power level (1-5) for each element
            for (let power = 1; power <= 5; power++) {
                for (let i = 0; i < 2; i++) {
                    deck.push(this.createCard(cardId.current++, element, power));
                }
            }
        });
        
        return this.shuffleDeck(deck);
    }
    
    createCard(id, element, power) {
        return {
            id,
            element,
            power,
            color: this.elementColors[element],
            emoji: this.elementEmoji[element],
            name: `${element.charAt(0).toUpperCase() + element.slice(1)} ${power}`
        };
    }
    
    shuffleDeck(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    drawCard(deck, hand, count = 1) {
        for (let i = 0; i < count && deck.length > 0; i++) {
            hand.push(deck.pop());
        }
    }
    
    // --- GAME FLOW ---
    start() {
        super.start();
        
        // Initialize decks
        this.playerDeck = this.generateDeck();
        this.opponentDeck = this.generateDeck();
        this.playerHand = [];
        this.opponentHand = [];
        
        // Draw initial hands
        this.drawCard(this.playerDeck, this.playerHand, 5);
        this.drawCard(this.opponentDeck, this.opponentHand, 5);
        
        // Reset wins
        this.playerWins = { fire: 0, water: 0, snow: 0 };
        this.opponentWins = { fire: 0, water: 0, snow: 0 };
        
        this.phase = 'select';
        this.playerCard = null;
        this.opponentCard = null;
    }
    
    // --- CARD SELECTION ---
    selectCard(cardIndex) {
        if (this.phase !== 'select' || cardIndex >= this.playerHand.length) return null;
        
        this.playerCard = this.playerHand.splice(cardIndex, 1)[0];
        
        // AI selects a card
        this.opponentSelectCard();
        
        // Move to reveal phase
        this.phase = 'reveal';
        
        return {
            playerCard: this.playerCard,
            opponentCard: this.opponentCard,
            phase: this.phase
        };
    }
    
    opponentSelectCard() {
        // Simple AI: Pick best counter or random
        if (this.opponentHand.length === 0) {
            this.drawCard(this.opponentDeck, this.opponentHand, 3);
        }
        
        // 60% chance to play strategically
        if (Math.random() < 0.6 && this.playerCard) {
            // Try to counter player's element
            const counter = this.getCounterElement(this.playerCard.element);
            const counterCards = this.opponentHand.filter(c => c.element === counter);
            
            if (counterCards.length > 0) {
                // Pick highest power counter
                counterCards.sort((a, b) => b.power - a.power);
                const idx = this.opponentHand.indexOf(counterCards[0]);
                this.opponentCard = this.opponentHand.splice(idx, 1)[0];
                return;
            }
        }
        
        // Random selection
        const idx = Math.floor(Math.random() * this.opponentHand.length);
        this.opponentCard = this.opponentHand.splice(idx, 1)[0];
    }
    
    // --- BATTLE RESOLUTION ---
    resolveBattle() {
        if (!this.playerCard || !this.opponentCard) return null;
        
        const result = this.compareCards(this.playerCard, this.opponentCard);
        
        // Track wins
        if (result === 'player') {
            this.playerWins[this.playerCard.element]++;
            this.addScore(10 + this.playerCard.power);
        } else if (result === 'opponent') {
            this.opponentWins[this.opponentCard.element]++;
        }
        
        this.roundResult = result;
        this.phase = 'result';
        
        // Draw new cards
        this.drawCard(this.playerDeck, this.playerHand, 1);
        this.drawCard(this.opponentDeck, this.opponentHand, 1);
        
        // Check for game win
        const gameResult = this.checkWinCondition();
        
        return {
            result,
            playerCard: this.playerCard,
            opponentCard: this.opponentCard,
            playerWins: { ...this.playerWins },
            opponentWins: { ...this.opponentWins },
            gameResult
        };
    }
    
    compareCards(card1, card2) {
        // Same element: Higher power wins
        if (card1.element === card2.element) {
            if (card1.power > card2.power) return 'player';
            if (card2.power > card1.power) return 'opponent';
            return 'tie';
        }
        
        // Element advantage
        if (this.beats(card1.element, card2.element)) {
            return 'player';
        } else {
            return 'opponent';
        }
    }
    
    beats(elem1, elem2) {
        return (
            (elem1 === 'fire' && elem2 === 'snow') ||
            (elem1 === 'snow' && elem2 === 'water') ||
            (elem1 === 'water' && elem2 === 'fire')
        );
    }
    
    getCounterElement(element) {
        const counters = { fire: 'water', water: 'snow', snow: 'fire' };
        return counters[element];
    }
    
    // --- WIN CONDITIONS ---
    checkWinCondition() {
        // Check player win
        if (this.hasWinningHand(this.playerWins)) {
            this.finish(true);
            return 'player';
        }
        
        // Check opponent win
        if (this.hasWinningHand(this.opponentWins)) {
            this.finish(false);
            return 'opponent';
        }
        
        return null;
    }
    
    hasWinningHand(wins) {
        // Win condition 1: 3 of the same element
        if (wins.fire >= 3 || wins.water >= 3 || wins.snow >= 3) {
            return true;
        }
        
        // Win condition 2: 1 of each element (all different colors)
        // Need to track unique colors too in real CP, simplified here
        if (wins.fire >= 1 && wins.water >= 1 && wins.snow >= 1) {
            return true;
        }
        
        return false;
    }
    
    // --- PHASE MANAGEMENT ---
    nextPhase() {
        if (this.phase === 'result') {
            this.phase = 'select';
            this.playerCard = null;
            this.opponentCard = null;
            this.roundResult = null;
            this.nextRound();
        }
        
        return this.phase;
    }
    
    // --- SERIALIZATION ---
    getState() {
        return {
            phase: this.phase,
            round: this.round,
            score: this.score,
            playerHand: this.playerHand,
            playerCard: this.playerCard,
            opponentCard: this.opponentCard,
            playerWins: this.playerWins,
            opponentWins: this.opponentWins,
            roundResult: this.roundResult,
            state: this.state
        };
    }
}

export default CardJitsuGame;








