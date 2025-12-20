/**
 * MonopolyGame - Server-side game state and logic for P2P Monopoly
 * 2-player property trading board game with dice rolling
 */

// Board space definitions (40 spaces total)
export const SPACES = [
    { name: "GO", type: "go", price: 0, group: "NONE" },
    { name: "Mediterranean", type: "property", price: 60, rent: 2, group: "BROWN" },
    { name: "Comm. Chest", type: "chest", price: 0, group: "NONE" },
    { name: "Baltic Ave", type: "property", price: 60, rent: 4, group: "BROWN" },
    { name: "Income Tax", type: "tax", price: 200, group: "NONE" },
    { name: "Reading RR", type: "station", price: 200, rent: 25, group: "STATION" },
    { name: "Oriental Ave", type: "property", price: 100, rent: 6, group: "LIGHTBLUE" },
    { name: "Chance", type: "chance", price: 0, group: "NONE" },
    { name: "Vermont Ave", type: "property", price: 100, rent: 6, group: "LIGHTBLUE" },
    { name: "Conn. Ave", type: "property", price: 120, rent: 8, group: "LIGHTBLUE" },
    { name: "Jail", type: "jail", price: 0, group: "NONE" },
    { name: "St. Charles", type: "property", price: 140, rent: 10, group: "PINK" },
    { name: "Electric Co", type: "utility", price: 150, rent: 0, group: "UTILITY" },
    { name: "States Ave", type: "property", price: 140, rent: 10, group: "PINK" },
    { name: "Virginia Ave", type: "property", price: 160, rent: 12, group: "PINK" },
    { name: "Penn. RR", type: "station", price: 200, rent: 25, group: "STATION" },
    { name: "St. James", type: "property", price: 180, rent: 14, group: "ORANGE" },
    { name: "Comm. Chest", type: "chest", price: 0, group: "NONE" },
    { name: "Tenn. Ave", type: "property", price: 180, rent: 14, group: "ORANGE" },
    { name: "NY Ave", type: "property", price: 200, rent: 16, group: "ORANGE" },
    { name: "Free Parking", type: "parking", price: 0, group: "NONE" },
    { name: "Kentucky Ave", type: "property", price: 220, rent: 18, group: "RED" },
    { name: "Chance", type: "chance", price: 0, group: "NONE" },
    { name: "Indiana Ave", type: "property", price: 220, rent: 18, group: "RED" },
    { name: "Illinois Ave", type: "property", price: 240, rent: 20, group: "RED" },
    { name: "B&O RR", type: "station", price: 200, rent: 25, group: "STATION" },
    { name: "Atlantic Ave", type: "property", price: 260, rent: 22, group: "YELLOW" },
    { name: "Ventnor Ave", type: "property", price: 260, rent: 22, group: "YELLOW" },
    { name: "Water Works", type: "utility", price: 150, rent: 0, group: "UTILITY" },
    { name: "Marvin Gdns", type: "property", price: 280, rent: 24, group: "YELLOW" },
    { name: "Go To Jail", type: "gotojail", price: 0, group: "NONE" },
    { name: "Pacific Ave", type: "property", price: 300, rent: 26, group: "GREEN" },
    { name: "NC Ave", type: "property", price: 300, rent: 26, group: "GREEN" },
    { name: "Comm. Chest", type: "chest", price: 0, group: "NONE" },
    { name: "Penn. Ave", type: "property", price: 320, rent: 28, group: "GREEN" },
    { name: "Short Line", type: "station", price: 200, rent: 25, group: "STATION" },
    { name: "Chance", type: "chance", price: 0, group: "NONE" },
    { name: "Park Place", type: "property", price: 350, rent: 35, group: "DARKBLUE" },
    { name: "Luxury Tax", type: "tax", price: 100, group: "NONE" },
    { name: "Boardwalk", type: "property", price: 400, rent: 50, group: "DARKBLUE" }
];

// Group colors for rendering
export const GROUPS = {
    BROWN: 0x8B4513, LIGHTBLUE: 0x87CEEB, PINK: 0xFF69B4, ORANGE: 0xFFA500,
    RED: 0xFF4757, YELLOW: 0xFFD32A, GREEN: 0x2ED573, DARKBLUE: 0x3742fa,
    STATION: 0x2f3542, UTILITY: 0x747d8c, NONE: 0xced6e0
};

// Group sizes for monopoly detection
export const GROUP_SIZES = {
    BROWN: 2, LIGHTBLUE: 3, PINK: 3, ORANGE: 3,
    RED: 3, YELLOW: 3, GREEN: 3, DARKBLUE: 2,
    STATION: 4, UTILITY: 2
};

// Chance cards
export const CHANCE_CARDS = [
    { text: "Advance to GO! Collect $200", action: "go" },
    { text: "Bank error in your favor. Collect $200", action: "collect", amount: 200 },
    { text: "Doctor's fees. Pay $50", action: "pay", amount: 50 },
    { text: "Go to Jail!", action: "jail" },
    { text: "Speeding fine $15", action: "pay", amount: 15 },
    { text: "Your building loan matures. Collect $150", action: "collect", amount: 150 },
    { text: "You won a crossword competition! Collect $100", action: "collect", amount: 100 },
    { text: "Pay poor tax of $15", action: "pay", amount: 15 }
];

// Community Chest cards
export const CHEST_CARDS = [
    { text: "Advance to GO! Collect $200", action: "go" },
    { text: "You inherit $100", action: "collect", amount: 100 },
    { text: "Pay Hospital Fees of $100", action: "pay", amount: 100 },
    { text: "Go to Jail!", action: "jail" },
    { text: "From sale of stock you get $50", action: "collect", amount: 50 },
    { text: "Grand Opera Night. Collect $50", action: "collect", amount: 50 },
    { text: "Income tax refund. Collect $20", action: "collect", amount: 20 },
    { text: "Pay school fees of $50", action: "pay", amount: 50 }
];

// Starting money
const STARTING_MONEY = 1500;

/**
 * Create initial Monopoly game state
 */
export function createInitialState() {
    return {
        // Players - positions and money
        player1: {
            position: 0,
            money: STARTING_MONEY,
            properties: [], // Array of space indices
            inJail: false,
            jailTurns: 0
        },
        player2: {
            position: 0,
            money: STARTING_MONEY,
            properties: [],
            inJail: false,
            jailTurns: 0
        },
        
        // Property ownership (index -> 'player1' | 'player2' | null)
        propertyOwners: Array(40).fill(null),
        
        // Turn state
        currentTurn: 'player1',
        phase: 'roll', // 'roll' | 'moving' | 'action' | 'end' | 'complete'
        
        // Dice
        lastDice: [0, 0],
        doublesCount: 0,
        
        // Current space event info
        currentEvent: null, // { type, title, description, ... }
        
        // Can buy current property?
        canBuy: false,
        buyPrice: 0,
        
        // Game result
        winner: null,
        
        // Turn timing
        turnStartedAt: Date.now(),
        
        // Animation state for client
        animatingMove: false,
        moveFrom: 0,
        moveTo: 0
    };
}

/**
 * Roll dice and calculate movement
 */
export function rollDice(state, playerId, isPlayer1) {
    if (state.phase !== 'roll') {
        return { error: 'NOT_ROLL_PHASE' };
    }
    
    const currentPlayer = isPlayer1 ? 'player1' : 'player2';
    if (state.currentTurn !== currentPlayer) {
        return { error: 'NOT_YOUR_TURN' };
    }
    
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;
    const isDoubles = d1 === d2;
    
    state.lastDice = [d1, d2];
    
    const player = state[currentPlayer];
    
    // Handle jail
    if (player.inJail) {
        if (isDoubles) {
            // Escaped with doubles
            player.inJail = false;
            player.jailTurns = 0;
            state.doublesCount = 0;
        } else {
            player.jailTurns++;
            if (player.jailTurns >= 3) {
                // Must pay to get out
                player.money -= 50;
                player.inJail = false;
                player.jailTurns = 0;
            } else {
                // Still in jail
                state.currentEvent = {
                    type: 'jail',
                    title: 'STILL IN JAIL',
                    description: `Roll doubles to escape (${3 - player.jailTurns} tries left)`
                };
                state.phase = 'end';
                return { success: true, stayInJail: true };
            }
        }
    }
    
    // Check for 3 doubles = jail
    if (isDoubles) {
        state.doublesCount++;
        if (state.doublesCount >= 3) {
            sendToJail(state, currentPlayer);
            state.currentEvent = {
                type: 'jail',
                title: 'ARRESTED!',
                description: 'Three doubles in a row - go to jail!'
            };
            state.phase = 'end';
            return { success: true, goToJail: true };
        }
    } else {
        state.doublesCount = 0;
    }
    
    // Calculate new position
    const oldPos = player.position;
    const newPos = (oldPos + total) % 40;
    
    // Check if passed GO
    const passedGo = newPos < oldPos && oldPos !== 0;
    if (passedGo) {
        player.money += 200;
        state.currentEvent = {
            type: 'go',
            title: 'PASSED GO',
            description: 'Collect $200 salary!'
        };
    }
    
    // Set animation state
    state.animatingMove = true;
    state.moveFrom = oldPos;
    state.moveTo = newPos;
    state.phase = 'moving';
    
    return { 
        success: true, 
        dice: [d1, d2], 
        total, 
        isDoubles,
        passedGo,
        from: oldPos,
        to: newPos
    };
}

/**
 * Complete the move animation and handle landing
 */
export function completeMoveAndLand(state, isPlayer1) {
    const currentPlayer = isPlayer1 ? 'player1' : 'player2';
    const player = state[currentPlayer];
    
    // Update position
    player.position = state.moveTo;
    state.animatingMove = false;
    
    // Handle landing
    const space = SPACES[player.position];
    
    state.canBuy = false;
    state.buyPrice = 0;
    
    switch (space.type) {
        case 'property':
        case 'station':
        case 'utility':
            handlePropertyLanding(state, currentPlayer, player.position);
            break;
            
        case 'tax':
            player.money -= space.price;
            state.currentEvent = {
                type: 'tax',
                title: 'TAX',
                description: `Paid $${space.price} tax`
            };
            state.phase = 'end';
            break;
            
        case 'chance':
            handleChanceCard(state, currentPlayer);
            break;
            
        case 'chest':
            handleChestCard(state, currentPlayer);
            break;
            
        case 'gotojail':
            sendToJail(state, currentPlayer);
            state.currentEvent = {
                type: 'jail',
                title: 'GO TO JAIL',
                description: 'Do not pass GO, do not collect $200'
            };
            state.phase = 'end';
            break;
            
        case 'jail':
            // Just visiting
            state.currentEvent = {
                type: 'jail',
                title: 'JUST VISITING',
                description: 'You\'re just visiting the jail'
            };
            state.phase = 'end';
            break;
            
        case 'go':
        case 'parking':
        default:
            state.phase = 'end';
            break;
    }
    
    // Check bankruptcy
    if (player.money < 0) {
        state.phase = 'complete';
        state.winner = currentPlayer === 'player1' ? 'player2' : 'player1';
    }
    
    return { success: true };
}

/**
 * Handle landing on a property
 */
function handlePropertyLanding(state, currentPlayer, position) {
    const owner = state.propertyOwners[position];
    const space = SPACES[position];
    const player = state[currentPlayer];
    
    if (owner === null) {
        // Unowned - can buy
        if (player.money >= space.price) {
            state.canBuy = true;
            state.buyPrice = space.price;
            state.currentEvent = {
                type: 'buy',
                title: space.name,
                description: `Available for $${space.price}`
            };
            state.phase = 'action';
        } else {
            state.currentEvent = {
                type: 'buy',
                title: space.name,
                description: `You can't afford $${space.price}`
            };
            state.phase = 'end';
        }
    } else if (owner === currentPlayer) {
        // Own property
        state.currentEvent = {
            type: 'own',
            title: space.name,
            description: 'You own this property'
        };
        state.phase = 'end';
    } else {
        // Pay rent
        const rent = calculateRent(state, position, owner);
        player.money -= rent;
        state[owner].money += rent;
        
        state.currentEvent = {
            type: 'rent',
            title: 'RENT DUE',
            description: `Paid $${rent} rent`
        };
        state.phase = 'end';
    }
}

/**
 * Calculate rent for a property
 */
function calculateRent(state, position, owner) {
    const space = SPACES[position];
    let rent = space.rent || 0;
    
    // Check for monopoly (double rent)
    const ownerProps = state[owner].properties;
    const group = space.group;
    
    if (group !== 'NONE' && group !== 'UTILITY' && group !== 'STATION') {
        const groupProps = SPACES.filter((s, i) => 
            s.group === group && ownerProps.includes(i)
        );
        if (groupProps.length === GROUP_SIZES[group]) {
            rent *= 2; // Monopoly!
        }
    }
    
    // Station rent based on count owned
    if (space.type === 'station') {
        const stationCount = ownerProps.filter(i => SPACES[i].type === 'station').length;
        rent = 25 * Math.pow(2, stationCount - 1);
    }
    
    // Utility rent based on dice
    if (space.type === 'utility') {
        const utilityCount = ownerProps.filter(i => SPACES[i].type === 'utility').length;
        const multiplier = utilityCount === 2 ? 10 : 4;
        rent = (state.lastDice[0] + state.lastDice[1]) * multiplier;
    }
    
    return rent;
}

/**
 * Handle Chance card
 */
function handleChanceCard(state, currentPlayer) {
    const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
    const player = state[currentPlayer];
    
    state.currentEvent = {
        type: 'chance',
        title: 'CHANCE',
        description: card.text
    };
    
    executeCard(state, currentPlayer, card);
}

/**
 * Handle Community Chest card
 */
function handleChestCard(state, currentPlayer) {
    const card = CHEST_CARDS[Math.floor(Math.random() * CHEST_CARDS.length)];
    
    state.currentEvent = {
        type: 'chest',
        title: 'COMMUNITY CHEST',
        description: card.text
    };
    
    executeCard(state, currentPlayer, card);
}

/**
 * Execute a card action
 */
function executeCard(state, currentPlayer, card) {
    const player = state[currentPlayer];
    
    switch (card.action) {
        case 'go':
            player.position = 0;
            player.money += 200;
            break;
        case 'collect':
            player.money += card.amount;
            break;
        case 'pay':
            player.money -= card.amount;
            break;
        case 'jail':
            sendToJail(state, currentPlayer);
            break;
    }
    
    state.phase = 'end';
}

/**
 * Send player to jail
 */
function sendToJail(state, currentPlayer) {
    const player = state[currentPlayer];
    player.position = 10; // Jail position
    player.inJail = true;
    player.jailTurns = 0;
    state.doublesCount = 0;
}

/**
 * Buy current property
 */
export function buyProperty(state, isPlayer1) {
    const currentPlayer = isPlayer1 ? 'player1' : 'player2';
    
    if (state.currentTurn !== currentPlayer) {
        return { error: 'NOT_YOUR_TURN' };
    }
    
    if (state.phase !== 'action' || !state.canBuy) {
        return { error: 'CANNOT_BUY' };
    }
    
    const player = state[currentPlayer];
    const position = player.position;
    const space = SPACES[position];
    
    if (player.money < space.price) {
        return { error: 'NOT_ENOUGH_MONEY' };
    }
    
    player.money -= space.price;
    player.properties.push(position);
    state.propertyOwners[position] = currentPlayer;
    
    state.canBuy = false;
    state.currentEvent = {
        type: 'bought',
        title: 'PURCHASED!',
        description: `You bought ${space.name} for $${space.price}`
    };
    
    // Check for monopoly
    const group = space.group;
    if (group !== 'NONE' && group !== 'UTILITY' && group !== 'STATION') {
        const groupProps = player.properties.filter(i => SPACES[i].group === group);
        if (groupProps.length === GROUP_SIZES[group]) {
            state.currentEvent.description += ' - MONOPOLY!';
        }
    }
    
    state.phase = 'end';
    
    return { success: true, property: position, price: space.price };
}

/**
 * End turn - switch to next player
 */
export function endTurn(state, isPlayer1) {
    const currentPlayer = isPlayer1 ? 'player1' : 'player2';
    
    if (state.currentTurn !== currentPlayer) {
        return { error: 'NOT_YOUR_TURN' };
    }
    
    if (state.phase !== 'action' && state.phase !== 'end') {
        return { error: 'CANNOT_END_TURN' };
    }
    
    // Check if can roll again (doubles)
    if (state.doublesCount > 0 && !state[currentPlayer].inJail) {
        state.phase = 'roll';
        state.currentEvent = {
            type: 'doubles',
            title: 'DOUBLES!',
            description: 'Roll again!'
        };
        return { success: true, rollAgain: true };
    }
    
    // Switch turn
    state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
    state.phase = 'roll';
    state.doublesCount = 0;
    state.currentEvent = null;
    state.turnStartedAt = Date.now();
    
    return { success: true };
}

/**
 * Get player-specific view of game state
 */
export function getPlayerState(state, isPlayer1) {
    const currentPlayer = isPlayer1 ? 'player1' : 'player2';
    const opponent = isPlayer1 ? 'player2' : 'player1';
    const isMyTurn = state.currentTurn === currentPlayer;
    
    return {
        // My info
        myPosition: state[currentPlayer].position,
        myMoney: state[currentPlayer].money,
        myProperties: state[currentPlayer].properties,
        myInJail: state[currentPlayer].inJail,
        
        // Opponent info
        opponentPosition: state[opponent].position,
        opponentMoney: state[opponent].money,
        opponentProperties: state[opponent].properties,
        opponentInJail: state[opponent].inJail,
        
        // Turn state
        isMyTurn,
        currentTurn: state.currentTurn,
        phase: state.phase,
        
        // Dice and events
        lastDice: state.lastDice,
        currentEvent: state.currentEvent,
        
        // Actions available
        canBuy: state.canBuy && isMyTurn,
        buyPrice: state.buyPrice,
        canRoll: state.phase === 'roll' && isMyTurn,
        canEndTurn: (state.phase === 'action' || state.phase === 'end') && isMyTurn,
        
        // Animation
        animatingMove: state.animatingMove,
        moveFrom: state.moveFrom,
        moveTo: state.moveTo,
        
        // Game end
        winner: state.winner,
        status: state.winner ? 'complete' : 'playing',
        
        // Board state
        propertyOwners: state.propertyOwners,
        
        // Metadata
        isPlayer1,
        spaces: SPACES
    };
}

/**
 * Get spectator view of game state
 */
export function getSpectatorState(state) {
    return {
        player1Position: state.player1.position,
        player1Money: state.player1.money,
        player1Properties: state.player1.properties,
        player1InJail: state.player1.inJail,
        
        player2Position: state.player2.position,
        player2Money: state.player2.money,
        player2Properties: state.player2.properties,
        player2InJail: state.player2.inJail,
        
        currentTurn: state.currentTurn,
        phase: state.phase,
        lastDice: state.lastDice,
        currentEvent: state.currentEvent,
        
        propertyOwners: state.propertyOwners,
        winner: state.winner,
        status: state.winner ? 'complete' : 'playing'
    };
}

export default {
    SPACES,
    GROUPS,
    GROUP_SIZES,
    createInitialState,
    rollDice,
    completeMoveAndLand,
    buyProperty,
    endTurn,
    getPlayerState,
    getSpectatorState
};

