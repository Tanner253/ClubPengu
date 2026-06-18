/**
 * WagerBot — practice PvP opponent for all wager minigames.
 * Always available unless DISABLE_WAGER_BOT=true.
 * Practice matches: no coin/token escrow, no win/loss stats.
 */

import { WAGER_BOT_ID, WAGER_BOT_POSITION, WAGER_BOT_ROTATION } from '../../src/config/wagerBot.js';

const BOT_ENABLED = process.env.DISABLE_WAGER_BOT !== 'true';

const C4_ROWS = 6;
const C4_COLS = 7;
const UNO_COLORS = ['Red', 'Blue', 'Green', 'Yellow'];

export const BOT_CONFIG = {
    id: WAGER_BOT_ID,
    name: '🤖 WagerBot',
    position: { ...WAGER_BOT_POSITION },
    room: 'town',
    appearance: {
        characterType: 'doginal',
        skin: 'purple',
        hat: 'none',
        eyes: 'none',
        mouth: 'none',
        bodyItem: 'none',
        dogPrimaryColor: '#D2691E',
        dogSecondaryColor: '#8B4513',
    },
    puffle: {
        id: 'bot_puffle_001',
        name: 'BotPuffle',
        color: 'gold',
        happiness: 100,
        energy: 100,
        hunger: 0,
        level: 5,
        experience: 450,
        xpForNextLevel: 500,
        trainingStats: { running: 50, swimming: 50, flying: 50, climbing: 50 },
        totalPlays: 100,
        unlockedTricks: ['spin', 'jump', 'backflip'],
        foodInventory: { cookie: 10, fish: 5, cake: 2 },
        ownedToys: ['ball', 'frisbee'],
        equippedToy: 'ball',
        equippedAccessories: { hat: 'crown', glasses: 'none', neckwear: 'bowtie' },
        ownedAccessories: { hats: ['crown', 'party'], glasses: [], neckwear: ['bowtie'] },
        mood: 'happy',
        tier: 'epic',
    },
    walletAddress: process.env.RENT_WALLET_ADDRESS || null,
};

function getLowestConnect4Row(board, column) {
    for (let row = 0; row < C4_ROWS; row++) {
        if (board[row * C4_COLS + column] === null) return row;
    }
    return -1;
}

function connect4WouldWin(board, row, col, token) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of directions) {
        let count = 1;
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS && board[r * C4_COLS + c] === token) {
            count++;
            r += dr;
            c += dc;
        }
        r = row - dr;
        c = col - dc;
        while (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS && board[r * C4_COLS + c] === token) {
            count++;
            r -= dr;
            c -= dc;
        }
        if (count >= 4) return true;
    }
    return false;
}

function pickConnect4Column(board, disc, opponentDisc) {
    const validCols = [];
    for (let col = 0; col < C4_COLS; col++) {
        if (board[(C4_ROWS - 1) * C4_COLS + col] === null) validCols.push(col);
    }
    if (!validCols.length) return null;

    const simWin = (col, token) => {
        const row = getLowestConnect4Row(board, col);
        if (row < 0) return false;
        const idx = row * C4_COLS + col;
        board[idx] = token;
        const win = connect4WouldWin(board, row, col, token);
        board[idx] = null;
        return win;
    };

    for (const col of validCols) {
        if (simWin(col, disc)) return col;
    }
    for (const col of validCols) {
        if (simWin(col, opponentDisc)) return col;
    }
    const preferred = [3, 2, 4, 1, 5, 0, 6].filter((c) => validCols.includes(c));
    return preferred[0] ?? validCols[Math.floor(Math.random() * validCols.length)];
}

class DevBotService {
    constructor() {
        this.isActive = BOT_ENABLED;
        this.botPlayer = null;
        this.pendingChallenges = new Map();
        this.activeMatch = null;
        this.moveTimeouts = new Map();

        this.challengeService = null;
        this.matchService = null;
        this.sendToPlayer = null;
        this.onBotAcceptChallenge = null;
        this.onBotMakeMove = null;

        if (!this.isActive) {
            console.log('🤖 WagerBot: Disabled (DISABLE_WAGER_BOT=true)');
        }
    }

    init(services) {
        if (!this.isActive) return;

        this.challengeService = services.challengeService;
        this.matchService = services.matchService;
        this.sendToPlayer = services.sendToPlayer;
        this.onBotAcceptChallenge = services.onBotAcceptChallenge || null;
        this.onBotMakeMove = services.onBotMakeMove || null;

        this.botPlayer = {
            id: BOT_CONFIG.id,
            name: BOT_CONFIG.name,
            room: BOT_CONFIG.room,
            position: { ...BOT_CONFIG.position },
            rotation: WAGER_BOT_ROTATION,
            appearance: { ...BOT_CONFIG.appearance },
            walletAddress: BOT_CONFIG.walletAddress,
            isAuthenticated: true,
            isBot: true,
            isPracticeBot: true,
            lastHeartbeat: Date.now(),
            puffle: BOT_CONFIG.puffle ? { ...BOT_CONFIG.puffle } : null,
            pufflePosition: BOT_CONFIG.puffle
                ? { x: BOT_CONFIG.position.x + 1.5, y: 0, z: BOT_CONFIG.position.z + 1.5 }
                : null,
        };

        console.log('🤖 WagerBot: Initialized (practice PvP)');
        console.log(`   Position: town (${BOT_CONFIG.position.x}, ${BOT_CONFIG.position.z})`);
    }

    /**
     * Keep WagerBot registered in the town room (survives reconnects / room map resets).
     */
    ensureRegistered(playersMap, roomsMap) {
        if (!this.isActive || !this.botPlayer) return false;

        const existing = playersMap?.get(BOT_CONFIG.id);
        const bot = {
            ...this.botPlayer,
            ...existing,
            id: BOT_CONFIG.id,
            name: BOT_CONFIG.name,
            room: 'town',
            position: { ...BOT_CONFIG.position },
            rotation: WAGER_BOT_ROTATION,
            appearance: { ...BOT_CONFIG.appearance, ...existing?.appearance },
            isBot: true,
            isPracticeBot: true,
            isAuthenticated: true,
            lastHeartbeat: Date.now(),
        };

        if (!bot.puffle && BOT_CONFIG.puffle) {
            bot.puffle = { ...BOT_CONFIG.puffle };
        }
        if (!bot.pufflePosition && BOT_CONFIG.puffle) {
            bot.pufflePosition = {
                x: BOT_CONFIG.position.x + 1.5,
                y: 0,
                z: BOT_CONFIG.position.z + 1.5,
            };
        }

        this.botPlayer = bot;
        playersMap.set(BOT_CONFIG.id, bot);

        if (roomsMap) {
            if (!roomsMap.has('town')) {
                roomsMap.set('town', new Set());
            }
            roomsMap.get('town').add(BOT_CONFIG.id);
        }

        return true;
    }

    getBotPlayer() {
        if (!this.isActive || !this.botPlayer) return null;
        return { ...this.botPlayer };
    }

    isBot(playerId) {
        return this.isActive && playerId === BOT_CONFIG.id;
    }

    isPracticeMatch(match) {
        if (!match) return false;
        return this.isBot(match.player1?.id) || this.isBot(match.player2?.id);
    }

    scheduleMove(matchId, delayMs, fn) {
        if (this.moveTimeouts.has(matchId)) {
            clearTimeout(this.moveTimeouts.get(matchId));
        }
        const timeout = setTimeout(() => {
            this.moveTimeouts.delete(matchId);
            fn();
        }, delayMs);
        this.moveTimeouts.set(matchId, timeout);
    }

    clearMoveTimeout(matchId) {
        if (this.moveTimeouts.has(matchId)) {
            clearTimeout(this.moveTimeouts.get(matchId));
            this.moveTimeouts.delete(matchId);
        }
    }

    async handleChallenge(challenge) {
        if (!this.isActive || !this.challengeService) return false;
        if (challenge.targetId !== BOT_CONFIG.id) return false;

        console.log(`🤖 WagerBot challenge: ${challenge.gameType} from ${challenge.challengerName}`);

        if (this.activeMatch) {
            const existing = this.matchService?.getMatch(this.activeMatch.id);
            if (!existing || existing.status === 'complete') {
                this.activeMatch = null;
            } else {
                await this.challengeService.denyChallenge(challenge.challengeId, BOT_CONFIG.id);
                return true;
            }
        }

        this.scheduleMove(`accept_${challenge.challengeId}`, 800 + Math.random() * 1200, async () => {
            if (this.onBotAcceptChallenge) {
                const result = await this.onBotAcceptChallenge(challenge.challengeId, BOT_CONFIG.id);
                if (result?.success) {
                    this.pendingChallenges.set(challenge.challengeId, challenge);
                }
            } else {
                const result = await this.challengeService.acceptChallenge(challenge.challengeId, BOT_CONFIG.id);
                if (result.success) this.pendingChallenges.set(challenge.challengeId, challenge);
            }
        });

        return true;
    }

    handleMatchStart(match) {
        if (!this.isActive) return false;

        const isBotPlayer1 = match.player1?.id === BOT_CONFIG.id;
        const isBotPlayer2 = match.player2?.id === BOT_CONFIG.id;
        if (!isBotPlayer1 && !isBotPlayer2) return false;

        this.activeMatch = {
            id: match.id,
            gameType: match.gameType,
            isBotPlayer1,
            opponentId: isBotPlayer1 ? match.player2.id : match.player1.id,
        };

        console.log(`🤖 WagerBot match: ${match.gameType}`);
        this.scheduleMove(match.id, 1200, () => this.actOnState(match.id));
        return true;
    }

    handleMatchState(matchId, state) {
        if (!this.isActive || !this.activeMatch || this.activeMatch.id !== matchId) return false;

        if (state.winner || state.phase === 'complete') {
            this.activeMatch = null;
            this.clearMoveTimeout(matchId);
            return true;
        }

        this.scheduleMove(matchId, 700 + Math.random() * 900, () => this.actOnState(matchId));
        return true;
    }

    actOnState(matchId) {
        if (!this.matchService || !this.activeMatch || this.activeMatch.id !== matchId) return;

        const match = this.matchService.getMatch(matchId);
        if (!match || match.status !== 'active') return;

        const state = match.state;
        if (!state || state.phase === 'complete' || state.winner) return;

        const { gameType, isBotPlayer1 } = this.activeMatch;
        const botKey = isBotPlayer1 ? 'player1' : 'player2';

        switch (gameType) {
            case 'tic_tac_toe':
                this.makeTicTacToeMove(matchId, state);
                break;
            case 'connect4':
                this.makeConnect4Move(matchId, state, isBotPlayer1);
                break;
            case 'blackjack':
                this.makeBlackjackMove(matchId, state, isBotPlayer1);
                break;
            case 'battleship':
                this.makeBattleshipMove(matchId, state, isBotPlayer1);
                break;
            case 'uno':
                this.makeUnoMove(matchId, state, botKey);
                break;
            case 'monopoly':
                this.makeMonopolyMove(matchId, state, botKey);
                break;
            case 'card_jitsu':
            default:
                this.makeCardJitsuMove(matchId, state, isBotPlayer1);
                break;
        }
    }

    applyMove(matchId, result) {
        if (result?.error) {
            console.error('🤖 WagerBot move failed:', result.error);
            return;
        }
        if (this.onBotMakeMove) this.onBotMakeMove(matchId, result);
        if (result.gameComplete) {
            this.activeMatch = null;
            this.clearMoveTimeout(matchId);
            return;
        }
        // Chain moves when still the bot's turn (UNO wild color, blackjack hits, monopoly phases, etc.)
        this.scheduleMove(matchId, 700 + Math.random() * 900, () => this.actOnState(matchId));
    }

    makeTicTacToeMove(matchId, state) {
        const botTurn = this.activeMatch.isBotPlayer1 ? 'player1' : 'player2';
        if (state.currentTurn !== botTurn) return;

        const empty = [];
        for (let i = 0; i < 9; i++) {
            if (!state.board[i]) empty.push(i);
        }
        if (!empty.length) return;

        const cell = empty[Math.floor(Math.random() * empty.length)];
        this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, cell));
    }

    makeConnect4Move(matchId, state, isBotPlayer1) {
        const botTurn = isBotPlayer1 ? 'player1' : 'player2';
        if (state.currentTurn !== botTurn) return;

        const disc = isBotPlayer1 ? 'R' : 'Y';
        const opponent = isBotPlayer1 ? 'Y' : 'R';
        const column = pickConnect4Column([...state.board], disc, opponent);
        if (column == null) return;

        this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, column));
    }

    makeBlackjackMove(matchId, state, isBotPlayer1) {
        const expectedPhase = isBotPlayer1 ? 'player1Turn' : 'player2Turn';
        if (state.phase !== expectedPhase) return;

        const score = isBotPlayer1 ? state.player1Score : state.player2Score;
        const status = isBotPlayer1 ? state.player1Status : state.player2Status;

        let action = 'stand';
        if (status === 'playing' && score < 17) action = 'hit';

        this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, action));
    }

    makeBattleshipMove(matchId, state, isBotPlayer1) {
        const botKey = isBotPlayer1 ? 'player1' : 'player2';
        const shotsKey = isBotPlayer1 ? 'player1Shots' : 'player2Shots';

        if (state.phase === 'setup' || state.isSetupPhase) {
            const ready = state.myReady ?? state[`${botKey}Ready`];
            if (!ready) {
                this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, { action: 'ready' }));
            }
            return;
        }

        if (state.phase !== 'playing' || state.currentTurn !== botKey) return;

        const shots = state[shotsKey] || [];
        const unfired = [];
        for (let i = 0; i < 100; i++) {
            if (shots[i] === null) unfired.push(i);
        }
        if (!unfired.length) return;

        let target = null;
        for (let i = 0; i < 100; i++) {
            if (shots[i] !== 'hit') continue;
            const x = i % 10;
            const y = Math.floor(i / 10);
            const adjacent = [
                y > 0 ? i - 10 : -1,
                y < 9 ? i + 10 : -1,
                x > 0 ? i - 1 : -1,
                x < 9 ? i + 1 : -1,
            ].filter((c) => c !== -1 && shots[c] === null);
            if (adjacent.length) {
                target = adjacent[Math.floor(Math.random() * adjacent.length)];
                break;
            }
        }
        if (target == null) target = unfired[Math.floor(Math.random() * unfired.length)];

        this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, target));
    }

    makeUnoMove(matchId, state, botKey) {
        if (state.phase === 'selectColor' && state.waitingForColor === botKey) {
            const color = UNO_COLORS[Math.floor(Math.random() * UNO_COLORS.length)];
            this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, { action: 'selectColor', color }));
            return;
        }

        if (state.phase !== 'playing' || state.currentTurn !== botKey) return;

        const hand = botKey === 'player1' ? state.player1Hand : state.player2Hand;
        const playable = hand.filter((card) => this.isValidUnoPlay(card, state.activeColor, state.activeValue));

        if (playable.length) {
            const card = playable[Math.floor(Math.random() * playable.length)];
            if (hand.length === 2) {
                this.matchService.playCard(matchId, BOT_CONFIG.id, { action: 'callUno' });
            }
            this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, { action: 'play', cardUid: card.uid }));
            return;
        }

        this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, { action: 'draw' }));
    }

    isValidUnoPlay(card, activeColor, activeValue) {
        if (card.c === 'Black') return true;
        if (card.c === activeColor) return true;
        if (card.v === activeValue) return true;
        return false;
    }

    makeMonopolyMove(matchId, state, botKey) {
        if (state.currentTurn !== botKey) return;

        const player = state[botKey];
        if (!player) return;

        if (state.phase === 'roll') {
            this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, { action: 'roll' }));
            return;
        }
        if (state.phase === 'moving') {
            this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, { action: 'completeMove' }));
            return;
        }
        if (state.phase === 'action' && state.canBuy && player.money >= state.buyPrice) {
            this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, { action: 'buy' }));
            return;
        }
        if (state.phase === 'action' || state.phase === 'end') {
            this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, { action: 'endTurn' }));
        }
    }

    makeCardJitsuMove(matchId, state, isBotPlayer1) {
        if (state.phase !== 'select') return;

        const selected = isBotPlayer1 ? state.player1SelectedCard : state.player2SelectedCard;
        if (selected !== null) return;

        const hand = isBotPlayer1 ? state.player1Hand : state.player2Hand;
        if (!hand?.length) return;

        const cardIndex = Math.floor(Math.random() * hand.length);
        this.applyMove(matchId, this.matchService.playCard(matchId, BOT_CONFIG.id, cardIndex));
    }

    handleMatchEnd(matchId) {
        if (!this.isActive) return false;
        this.clearMoveTimeout(matchId);
        if (this.activeMatch?.id === matchId) {
            this.activeMatch = null;
            return true;
        }
        return false;
    }

    cleanup() {
        for (const timeout of this.moveTimeouts.values()) clearTimeout(timeout);
        this.moveTimeouts.clear();
        this.activeMatch = null;
        this.pendingChallenges.clear();
    }
}

const devBotService = new DevBotService();
export default devBotService;
