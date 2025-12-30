/**
 * Club Pengu Multiplayer WebSocket Server
 * Handles real-time player sync, P2P challenges, and match coordination
 * With MongoDB persistence and Phantom wallet authentication
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from root directory (parent of server/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { WebSocketServer } from 'ws';
import http from 'http';
import { connectDB, isDBConnected, disconnectDB } from './db/connection.js';
import { User, OwnedCosmetic, Transaction, MarketListing } from './db/models/index.js';
import { 
    StatsService, 
    InboxService, 
    ChallengeService, 
    MatchService,
    AuthService,
    UserService,
    PromoCodeService,
    SlotService,
    FishingService,
    IglooService,
    BlackjackService,
    GachaService,
    PebbleService,
    ROLL_PRICE_PEBBLES
} from './services/index.js';
import custodialWalletService from './services/CustodialWalletService.js';
import { handleIglooMessage } from './handlers/iglooHandlers.js';
import { handleTippingMessage } from './handlers/tippingHandlers.js';
import { handleMarketplaceMessage } from './handlers/marketplaceHandlers.js';
import { handleGiftMessage } from './handlers/giftHandlers.js';
import rentScheduler from './schedulers/RentScheduler.js';
import solanaPaymentService from './services/SolanaPaymentService.js';
import devBotService, { BOT_CONFIG } from './services/DevBotService.js';
import wagerSettlementService from './services/WagerSettlementService.js';

const PORT = process.env.PORT || 3001;
const MAX_CONNECTIONS_PER_IP = 2;
const HEARTBEAT_INTERVAL = 45000;  // 45s - slightly longer to accommodate wallet popups
const IS_DEV = process.env.NODE_ENV !== 'production';

// Timestamp helper for debugging
const ts = () => new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm

// ==================== GAME STATE ====================
const players = new Map(); // playerId -> { id, name, room, position, rotation, appearance, puffle, ip, walletAddress, isAuthenticated, ... }
const rooms = new Map(); // roomId -> Set of playerIds
const ipConnections = new Map(); // ip -> Set of playerIds

// PvE Activity tracking (for spectator banners)
// playerId -> { activity: 'fishing'|'blackjack', room, state, position, playerName }
const activePveActivities = new Map();

// Beach ball state per igloo room
const beachBalls = new Map();
for (let i = 1; i <= 10; i++) {
    beachBalls.set(`igloo${i}`, { x: 4.5, z: 3, vx: 0, vz: 0 });
}

// Mount trail points storage
const playerTrailPoints = new Map();
const MAX_TRAIL_POINTS_PER_PLAYER = 100;
const TRAIL_EXPIRY_MS = 8000;

// Chat rate limiting
const playerChatTimestamps = new Map(); // playerId -> [timestamps]
const CHAT_RATE_LIMIT = 5; // Max messages per window
const CHAT_RATE_WINDOW_MS = 5000; // 5 second window

// ==================== DAY/NIGHT CYCLE ====================
let worldTime = 0.35;
const DAY_CYCLE_SPEED = 0.001;
const TIME_BROADCAST_INTERVAL = 5000;

setInterval(() => {
    worldTime = (worldTime + DAY_CYCLE_SPEED) % 1;
}, 1000);

// ==================== SERVICES INITIALIZATION ====================
const userService = new UserService();
const authService = new AuthService();
const statsService = new StatsService(userService);
const inboxService = new InboxService();
const promoCodeService = new PromoCodeService(userService);

// Placeholder functions for MatchService (defined later after server setup)
let broadcastToRoom, sendToPlayer;

// ==================== HTTP SERVER ====================
const server = http.createServer((req, res) => {
    // CORS headers for admin endpoints
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Health check endpoint
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            database: isDBConnected() ? 'connected' : 'disconnected',
            players: players.size,
            uptime: process.uptime()
        }));
        return;
    }
    
    // Admin: Custodial wallet status (requires admin key)
    if (req.url === '/admin/custodial/status') {
        const adminKey = req.headers['x-admin-key'];
        if (adminKey !== process.env.CUSTODIAL_ADMIN_KEY) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(wagerSettlementService.getStatus()));
        return;
    }
    
    // Admin: Custodial wallet audit log (requires admin key)
    if (req.url === '/admin/custodial/audit') {
        const adminKey = req.headers['x-admin-key'];
        if (adminKey !== process.env.CUSTODIAL_ADMIN_KEY) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(wagerSettlementService.getAuditLog(500)));
        return;
    }
    
    // Admin: Unlock custodial wallet (requires admin key, POST)
    if (req.url === '/admin/custodial/unlock' && req.method === 'POST') {
        const adminKey = req.headers['x-admin-key'];
        if (!adminKey) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        
        // Import and call adminUnlock on the custodial wallet service
        import('./services/CustodialWalletService.js').then(mod => {
            const result = mod.default.adminUnlock(adminKey);
            if (result.success) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Custodial wallet unlocked' }));
            } else {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: result.error }));
            }
        }).catch(err => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal error' }));
        });
        return;
    }
    
    // Get custodial wallet public address (public endpoint - just the address)
    if (req.url === '/api/custodial-address') {
        const address = wagerSettlementService.getCustodialWalletAddress();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            address: address || null,
            available: !!address 
        }));
        return;
    }
    
    res.writeHead(404);
    res.end();
});

const wss = new WebSocketServer({ server });

// ==================== BROADCAST FUNCTIONS ====================
broadcastToRoom = (roomId, message, ...excludeIds) => {
    const roomPlayers = rooms.get(roomId);
    if (!roomPlayers) return;
    
    const data = JSON.stringify(message);
    const excludeSet = new Set(excludeIds.filter(Boolean));
    
    for (const playerId of roomPlayers) {
        if (excludeSet.has(playerId)) continue;
        const player = players.get(playerId);
        if (player?.ws?.readyState === 1) {
            player.ws.send(data);
        }
    }
};

const broadcastToRoomAll = (roomId, message) => {
    const roomPlayers = rooms.get(roomId);
    if (!roomPlayers) return;
    
    const data = JSON.stringify(message);
    for (const playerId of roomPlayers) {
        const player = players.get(playerId);
        if (player?.ws?.readyState === 1) {
            player.ws.send(data);
        }
    }
};

// Broadcast to ALL connected players (for global updates like igloo settings)
const broadcastToAll = (message) => {
    const data = JSON.stringify(message);
    for (const [playerId, player] of players) {
        if (player?.ws?.readyState === 1) {
            player.ws.send(data);
        }
    }
};

sendToPlayer = (playerId, message) => {
    const player = players.get(playerId);
    if (player?.ws?.readyState === 1) {
        player.ws.send(JSON.stringify(message));
    }
};

// ==================== PvE ACTIVITY SPECTATING ====================
// Start a PvE activity (fishing, blackjack, etc.) - broadcasts to room
const startPveActivity = (playerId, activity, room, initialState = {}) => {
    const player = players.get(playerId);
    if (!player) return;
    
    activePveActivities.set(playerId, {
        activity,
        room,
        state: initialState,
        position: player.position,
        playerName: player.name,
        startedAt: Date.now()
    });
    
    // Broadcast to room (exclude the player themselves)
    broadcastToRoom(room, {
        type: 'pve_activity_start',
        playerId,
        playerName: player.name,
        position: player.position,
        activity,
        state: initialState
    }, playerId);
    
    console.log(`🎮 PvE Activity started: ${player.name} - ${activity}`);
};

// Update PvE activity state
const updatePveActivity = (playerId, stateUpdate) => {
    const activity = activePveActivities.get(playerId);
    if (!activity) return;
    
    activity.state = { ...activity.state, ...stateUpdate };
    
    // Broadcast update to room
    broadcastToRoom(activity.room, {
        type: 'pve_activity_update',
        playerId,
        state: stateUpdate
    }, playerId);
};

// End a PvE activity
const endPveActivity = (playerId, finalState = {}) => {
    const activity = activePveActivities.get(playerId);
    if (!activity) return;
    
    const player = players.get(playerId);
    
    // Broadcast end with final state
    broadcastToRoom(activity.room, {
        type: 'pve_activity_end',
        playerId,
        playerName: player?.name || 'Unknown',
        activity: activity.activity,
        finalState: {
            ...activity.state,
            ...finalState,
            duration: Date.now() - activity.startedAt
        }
    }, playerId);
    
    activePveActivities.delete(playerId);
    console.log(`🎮 PvE Activity ended: ${player?.name || playerId} - ${activity.activity}`);
};

// Get active PvE activities in a room (for new players joining)
const getPveActivitiesInRoom = (roomId) => {
    const activities = {};
    for (const [playerId, activity] of activePveActivities) {
        if (activity.room === roomId) {
            activities[playerId] = {
                playerId,
                playerName: activity.playerName,
                position: activity.position,
                activity: activity.activity,
                state: activity.state,
                startedAt: activity.startedAt
            };
        }
    }
    return activities;
};

// Initialize services that need broadcast functions
const challengeService = new ChallengeService(inboxService, statsService);
const matchService = new MatchService(statsService, userService, broadcastToRoom, sendToPlayer);
const slotService = new SlotService(userService, broadcastToRoom, sendToPlayer);
const fishingService = new FishingService(userService, broadcastToRoom, sendToPlayer);
const blackjackService = new BlackjackService(userService, broadcastToRoom, sendToPlayer);
const gachaService = new GachaService(userService, broadcastToRoom, sendToPlayer, broadcastToAll);
const pebbleService = new PebbleService(solanaPaymentService, custodialWalletService, sendToPlayer);

// Link GachaService to SlotService for cosmetic gacha rolls
slotService.setGachaService(gachaService);

// Set up player lookup for pebble withdrawal notifications
// This allows pebbleService to find online players by wallet address
const getPlayerByWalletGlobal = (wallet) => {
    for (const [id, p] of players) {
        if (p.walletAddress === wallet) {
            return { id, ...p };
        }
    }
    return null;
};
pebbleService.setPlayerLookup(getPlayerByWalletGlobal);

// Initialize DevBot for development testing
if (IS_DEV) {
    /**
     * Callback for when bot accepts a challenge
     * This goes through the proper match creation flow
     */
    const onBotAcceptChallenge = async (challengeId, botId) => {
        try {
            const challenge = challengeService.getChallenge(challengeId);
            if (!challenge) {
                return { success: false, error: 'Challenge not found' };
            }
            
            // Accept the challenge
            const acceptResult = await challengeService.acceptChallenge(challengeId, botId);
            if (acceptResult.error) {
                return { success: false, error: acceptResult.error };
            }
            
            // Get both players
            const challenger = players.get(challenge.challengerId);
            const bot = players.get(botId);
            
            if (!challenger) {
                return { success: false, error: 'Challenger disconnected' };
            }
            
            // Create the match (bot doesn't provide deposit tx)
            const match = await matchService.createMatch(
                challenge,
                challenger,
                bot,
                {
                    challengerSignedPayload: challenge.wagerSignedPayload || null,
                    targetSignedPayload: null // Bot doesn't sign
                }
            );
            
            if (!match) {
                return { success: false, error: 'Failed to create match' };
            }
            
            // Build match start message (same format as regular challenge_respond handler)
            const matchStartMsg = {
                type: 'match_start',
                match: {
                    id: match.id,
                    gameType: match.gameType,
                    player1: { id: match.player1.id, name: match.player1.name, appearance: match.player1.appearance },
                    player2: { id: match.player2.id, name: match.player2.name, appearance: match.player2.appearance },
                    wagerAmount: challenge.wagerAmount || 0,
                    wagerToken: challenge.wagerToken || null,
                    yourRole: 'player1'
                },
                initialState: matchService.getMatchState(match.id, challenge.challengerId),
                coins: challenger.walletAddress ? 
                    (await userService.getUser(challenger.walletAddress))?.coins || 0 : 0
            };
            
            // Send to challenger
            sendToPlayer(challenge.challengerId, matchStartMsg);
            
            // Bot gets the message via handleMatchStart
            devBotService.handleMatchStart(match);
            
            // Notify room about match starting
            broadcastToRoom(match.room, {
                type: 'match_started',
                player1: match.player1.name,
                player2: match.player2.name,
                gameType: match.gameType
            }, challenge.challengerId, botId);
            
            // Notify spectators (same as regular challenge_respond handler)
            broadcastToRoom(match.room, {
                type: 'match_spectate_start',
                matchId: match.id,
                players: [
                    { id: match.player1.id, name: match.player1.name, position: match.player1.position },
                    { id: match.player2.id, name: match.player2.name, position: match.player2.position }
                ],
                gameType: match.gameType,
                wagerAmount: match.wagerAmount
            }, challenge.challengerId, botId);
            
            console.log(`🎮 Match started: ${match.player1.name} vs ${match.player2.name} (${match.gameType})`);
            
            return { success: true, matchId: match.id };
            
        } catch (error) {
            console.error('🤖 DevBot accept challenge error:', error);
            return { success: false, error: error.message };
        }
    };
    
    // Callback for bot to notify match state after making a move
    const onBotMakeMove = async (matchId, moveResult) => {
        const match = matchService.getMatch(matchId);
        if (!match) return;
        
        // Send state to both players
        const state1 = matchService.getMatchState(match.id, match.player1.id);
        const state2 = matchService.getMatchState(match.id, match.player2.id);
        
        sendToPlayer(match.player1.id, { type: 'match_state', matchId: match.id, state: state1 });
        sendToPlayer(match.player2.id, { type: 'match_state', matchId: match.id, state: state2 });
        
        // Broadcast to spectators (same format as match_play_card handler)
        if (match.room) {
            let spectateState;
            if (match.gameType === 'tic_tac_toe') {
                spectateState = {
                    board: [...match.state.board],
                    currentTurn: match.state.currentTurn,
                    phase: match.state.phase,
                    winner: match.state.winner,
                    winningLine: match.state.winningLine,
                    status: match.status
                };
            } else if (match.gameType === 'connect4') {
                spectateState = {
                    board: [...match.state.board],
                    currentTurn: match.state.currentTurn,
                    phase: match.state.phase,
                    winner: match.state.winner,
                    winningCells: match.state.winningCells,
                    lastMove: match.state.lastMove,
                    status: match.status
                };
            } else if (match.gameType === 'blackjack') {
                const isComplete = match.state.phase === 'complete';
                spectateState = {
                    player1CardCount: match.state.player1Hand?.length || 0,
                    player1Status: match.state.player1Status,
                    player1Result: match.state.player1Result,
                    player1Score: isComplete ? match.state.player1Score : null,
                    player2CardCount: match.state.player2Hand?.length || 0,
                    player2Status: match.state.player2Status,
                    player2Result: match.state.player2Result,
                    player2Score: isComplete ? match.state.player2Score : null,
                    dealerCardCount: match.state.dealerHand?.length || 0,
                    dealerStatus: match.state.dealerStatus,
                    dealerScore: isComplete ? match.state.dealerScore : null,
                    currentTurn: match.state.currentTurn,
                    phase: match.state.phase,
                    lastAction: match.state.lastAction ? { type: match.state.lastAction.type, player: match.state.lastAction.player } : null,
                    winner: match.state.winner,
                    status: match.status,
                    winnerId: match.winnerId
                };
            }
            
            if (spectateState) {
                broadcastToRoom(match.room, {
                    type: 'match_spectate',
                    matchId: match.id,
                    gameType: match.gameType,
                    players: [
                        { id: match.player1.id, name: match.player1.name },
                        { id: match.player2.id, name: match.player2.name }
                    ],
                    state: spectateState,
                    wagerAmount: match.wagerAmount
                }, match.player1.id, match.player2.id);
            }
        }
        
        // Handle match completion ONLY if the bot's move completed the game
        // (If human completed the game, match_move handler already called handleMatchPayout)
        if (moveResult.gameComplete && match.status === 'complete') {
            const winnerId = match.winnerId;
            const isDraw = moveResult.isDraw || match.state.winner === 'draw';
            
            const payoutResult = await handleMatchPayout(match, winnerId, isDraw);
            
            // Get updated balances
            const p1Coins = match.player1.wallet ? 
                (await userService.getUser(match.player1.wallet))?.coins || 0 : 0;
            const p2Coins = match.player2.wallet ? 
                (await userService.getUser(match.player2.wallet))?.coins || 0 : 0;
            
            // Build token settlement info for UI
            const tokenSettlementInfo = payoutResult.tokenSettlement?.success ? {
                txSignature: payoutResult.tokenSettlement.txSignature,
                amount: payoutResult.tokenSettlement.amount,
                tokenSymbol: payoutResult.tokenSettlement.tokenSymbol,
                tokenAddress: payoutResult.tokenSettlement.tokenAddress,
                isSimulated: payoutResult.tokenSettlement.isSimulated
            } : null;
            
            if (isDraw) {
                sendToPlayer(match.player1.id, {
                    type: 'match_end',
                    matchId: match.id,
                    result: {
                        winner: 'draw',
                        winnerPlayerId: null,
                        coinsWon: 0,
                        yourCoins: p1Coins,
                        reason: 'draw',
                        refunded: payoutResult.refunded,
                        tokenSettlement: tokenSettlementInfo,
                        wagerToken: match.wagerToken
                    }
                });
                sendToPlayer(match.player2.id, {
                    type: 'match_end',
                    matchId: match.id,
                    result: {
                        winner: 'draw',
                        winnerPlayerId: null,
                        coinsWon: 0,
                        yourCoins: p2Coins,
                        reason: 'draw',
                        refunded: payoutResult.refunded,
                        tokenSettlement: tokenSettlementInfo,
                        wagerToken: match.wagerToken
                    }
                });
            } else {
                sendToPlayer(match.player1.id, {
                    type: 'match_end',
                    matchId: match.id,
                    result: {
                        winner: winnerId === match.player1.id ? 'player1' : 'player2',
                        winnerPlayerId: winnerId,
                        coinsWon: winnerId === match.player1.id ? payoutResult.coinsWon : 0,
                        yourCoins: p1Coins,
                        reason: 'win',
                        tokenSettlement: winnerId === match.player1.id ? tokenSettlementInfo : null,
                        tokenLost: winnerId !== match.player1.id && match.wagerToken ? match.wagerToken : null,
                        wagerToken: match.wagerToken
                    }
                });
                sendToPlayer(match.player2.id, {
                    type: 'match_end',
                    matchId: match.id,
                    result: {
                        winner: winnerId === match.player2.id ? 'player2' : 'player1',
                        winnerPlayerId: winnerId,
                        coinsWon: winnerId === match.player2.id ? payoutResult.coinsWon : 0,
                        yourCoins: p2Coins,
                        reason: 'win',
                        tokenSettlement: winnerId === match.player2.id ? tokenSettlementInfo : null,
                        tokenLost: winnerId !== match.player2.id && match.wagerToken ? match.wagerToken : null,
                        wagerToken: match.wagerToken
                    }
                });
            }
            
            // Notify spectators that match has ended (so banners are cleaned up)
            if (match.room) {
                let finalState;
                if (match.gameType === 'tic_tac_toe') {
                    finalState = { board: [...match.state.board], winner: match.state.winner, winningLine: match.state.winningLine };
                } else if (match.gameType === 'connect4') {
                    finalState = { board: [...match.state.board], winner: match.state.winner, winningCells: match.state.winningCells };
                } else if (match.gameType === 'blackjack') {
                    finalState = { 
                        winner: match.state.winner,
                        player1Score: match.state.player1Score,
                        player2Score: match.state.player2Score,
                        dealerScore: match.state.dealerScore,
                        player1Result: match.state.player1Result,
                        player2Result: match.state.player2Result
                    };
                } else {
                    finalState = { winner: match.state.winner };
                }
                
                broadcastToRoom(match.room, {
                    type: 'match_spectate_end',
                    matchId: match.id,
                    winnerId,
                    winnerName: winnerId ? (winnerId === match.player1.id ? match.player1.name : match.player2.name) : null,
                    isDraw,
                    finalState,
                    gameType: match.gameType,
                    reason: isDraw ? 'draw' : 'win'
                }, match.player1.id, match.player2.id);
            }
            
            devBotService.handleMatchEnd(match.id);
            matchService.cleanup(match.id);
        }
    };
    
    devBotService.init({ challengeService, matchService, sendToPlayer, onBotAcceptChallenge, onBotMakeMove });
    // Add bot to players map
    const bot = devBotService.getBotPlayer();
    if (bot) {
        players.set(bot.id, bot);
        // Add bot to town room
        if (!rooms.has('town')) {
            rooms.set('town', new Set());
        }
        rooms.get('town').add(bot.id);
        console.log(`🤖 DevBot added to town at position (${bot.position.x}, ${bot.position.z})`);
    }
}

// ==================== PERIODIC BROADCASTS ====================
setInterval(() => {
    const timeMessage = JSON.stringify({
        type: 'world_time',
        time: worldTime,
        totalPlayers: players.size
    });
    
    for (const [, player] of players) {
        if (player.ws?.readyState === 1) {
            player.ws.send(timeMessage);
        }
    }
}, TIME_BROADCAST_INTERVAL);

// Room counts for igloo occupancy
setInterval(() => {
    const roomCounts = {};
    for (const [roomId, playerSet] of rooms) {
        if (roomId.startsWith('igloo')) {
            roomCounts[roomId] = playerSet.size;
        }
    }
    
    const townPlayers = rooms.get('town');
    if (!townPlayers || townPlayers.size === 0) return;
    
    const countsMessage = JSON.stringify({ type: 'room_counts', counts: roomCounts });
    
    for (const playerId of townPlayers) {
        const player = players.get(playerId);
        if (player?.ws?.readyState === 1) {
            player.ws.send(countsMessage);
        }
    }
}, 3000);

// ==================== HELPER FUNCTIONS ====================
function getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
    const realIP = req.headers['x-real-ip'];
    if (realIP) return realIP;
    return req.socket?.remoteAddress || 'unknown';
}

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

// Generate simple guest name: Penguin + 4 random digits
function generateGuestName() {
    return `Penguin${Math.floor(1000 + Math.random() * 9000)}`;
}

function canIPConnect(ip) {
    if (IS_DEV) return true;
    cleanupStaleConnections(ip);
    const connections = ipConnections.get(ip);
    if (!connections) return true;
    return connections.size < MAX_CONNECTIONS_PER_IP;
}

function trackIPConnection(ip, playerId) {
    if (!ipConnections.has(ip)) {
        ipConnections.set(ip, new Set());
    }
    ipConnections.get(ip).add(playerId);
}

function removeIPConnection(ip, playerId) {
    const connections = ipConnections.get(ip);
    if (connections) {
        connections.delete(playerId);
        if (connections.size === 0) ipConnections.delete(ip);
    }
}

function cleanupStaleConnections(ip) {
    const connections = ipConnections.get(ip);
    if (!connections) return;
    
    const stalePlayerIds = [];
    for (const playerId of connections) {
        const player = players.get(playerId);
        if (!player || player.ws?.readyState !== 1) {
            stalePlayerIds.push(playerId);
            if (player?.room) {
                const room = rooms.get(player.room);
                if (room) {
                    room.delete(playerId);
                    broadcastToRoom(player.room, { type: 'player_left', playerId });
                }
            }
            players.delete(playerId);
        }
    }
    
    for (const playerId of stalePlayerIds) {
        connections.delete(playerId);
    }
    if (connections.size === 0) ipConnections.delete(ip);
}

// Clean up any existing connection for a wallet (prevents duplicate sessions)
function cleanupStaleWalletConnection(walletAddress, excludePlayerId = null) {
    for (const [existingPlayerId, existingPlayer] of players) {
        if (existingPlayerId === excludePlayerId) continue;
        if (existingPlayer.walletAddress === walletAddress) {
            console.log(`[${ts()}] 🧹 Cleaning up stale connection for wallet ${walletAddress.slice(0, 8)}... (old player: ${existingPlayerId})`);
            
            // Close the old WebSocket
            if (existingPlayer.ws) {
                try {
                    existingPlayer.ws.send(JSON.stringify({
                        type: 'session_replaced',
                        message: 'Your session was replaced by a new connection'
                    }));
                    existingPlayer.ws.close(1000, 'Session replaced');
                } catch (e) {
                    // WebSocket might already be closed
                }
            }
            
            // Remove from room
            if (existingPlayer.room) {
                const room = rooms.get(existingPlayer.room);
                if (room) {
                    room.delete(existingPlayerId);
                    broadcastToRoom(existingPlayer.room, { type: 'player_left', playerId: existingPlayerId });
                }
            }
            
            // Remove from IP tracking
            if (existingPlayer.ip) {
                removeIPConnection(existingPlayer.ip, existingPlayerId);
            }
            
            // Cleanup related data
            playerTrailPoints.delete(existingPlayerId);
            playerChatTimestamps.delete(existingPlayerId);
            slotService.handleDisconnect(existingPlayerId);
            fishingService.handleDisconnect(existingPlayerId);
            
            // End any PvE activities
            if (activePveActivities.has(existingPlayerId)) {
                endPveActivity(existingPlayerId, { result: 'disconnected' });
            }
            
            // Remove from players map
            players.delete(existingPlayerId);
        }
    }
}

function joinRoom(playerId, roomId) {
    const player = players.get(playerId);
    if (player?.room) {
        const oldRoom = rooms.get(player.room);
        if (oldRoom) {
            oldRoom.delete(playerId);
            broadcastToRoom(player.room, { type: 'player_left', playerId });
        }
    }
    
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(playerId);
    
    if (player) {
        player.room = roomId;
        // Track room change stats if authenticated
        if (player.walletAddress) {
            statsService.recordRoomChange(player.walletAddress, roomId);
        }
        // Clear idle timeout - player joined a room successfully
        if (player.ws?._roomJoinTimeout) {
            clearTimeout(player.ws._roomJoinTimeout);
            player.ws._roomJoinTimeout = null;
        }
    }
}

function getPlayersInRoom(roomId, excludeId = null) {
    const roomPlayers = rooms.get(roomId);
    if (!roomPlayers) return [];
    
    const now = Date.now();
    const result = [];
    
    for (const playerId of roomPlayers) {
        if (playerId === excludeId) continue;
        const player = players.get(playerId);
        if (player) {
            let trailPoints = null;
            const trails = playerTrailPoints.get(playerId);
            if (trails?.length > 0) {
                trailPoints = trails.filter(t => (now - t.timestamp) < TRAIL_EXPIRY_MS);
            }
            
            result.push({
                id: player.id,
                name: player.name,
                position: player.position,
                rotation: player.rotation,
                appearance: player.appearance,
                puffle: player.puffle,
                pufflePosition: player.pufflePosition,
                emote: player.emote,
                seatedOnFurniture: player.seatedOnFurniture || false,
                isAfk: player.isAfk || false,
                afkMessage: player.afkMessage || null,
                trailPoints,
                isAuthenticated: player.isAuthenticated || false
            });
        }
    }
    return result;
}

// ==================== COIN OPERATIONS (Server-Authoritative) ====================
async function getPlayerCoins(playerId) {
    const player = players.get(playerId);
    if (!player) return 0;
    
    if (player.walletAddress) {
        const user = await userService.getUser(player.walletAddress);
        return user?.coins || 0;
    }
    // Guest players have no persistent coins
    return player.guestCoins || 0;
}

async function handleWagerEscrow(player1, player2, wagerAmount, matchId) {
    // Both players must be authenticated for wagers
    if (wagerAmount > 0) {
        if (!player1.walletAddress || !player2.walletAddress) {
            return { error: 'WAGER_REQUIRES_AUTH', message: 'Both players must be logged in to wager' };
        }
        
        // Escrow from both players
        const escrow1 = await userService.escrowWager(player1.walletAddress, wagerAmount, matchId);
        if (!escrow1.success) {
            return { error: 'P1_INSUFFICIENT_FUNDS', message: `${player1.name} doesn't have enough coins` };
        }
        
        const escrow2 = await userService.escrowWager(player2.walletAddress, wagerAmount, matchId);
        if (!escrow2.success) {
            // Refund player 1
            await userService.refundWager(player1.walletAddress, wagerAmount, matchId, 'opponent_insufficient');
            return { error: 'P2_INSUFFICIENT_FUNDS', message: `${player2.name} doesn't have enough coins` };
        }
    }
    
    return { success: true };
}

// Track matches being processed for payout to prevent double-processing
const _payoutInProgress = new Set();

async function handleMatchPayout(match, winnerId, isDraw = false) {
    // Guard against double-processing
    if (_payoutInProgress.has(match.id)) {
        console.log(`⚠️ Payout already in progress for match ${match.id}, skipping`);
        return { skipped: true, reason: 'already_processing' };
    }
    _payoutInProgress.add(match.id);
    
    try {
        const totalPot = match.wagerAmount * 2;
        let settlementResult = null;
        
        // Determine winner/loser info
        const winnerWallet = winnerId === match.player1.id ? match.player1.wallet : match.player2.wallet;
        const loserWallet = winnerId === match.player1.id ? match.player2.wallet : match.player1.wallet;
        const loserId = winnerId === match.player1.id ? match.player2.id : match.player1.id;
    
        if (isDraw) {
            // Refund both players - coins
            if (match.player1.wallet) {
                await userService.refundWager(match.player1.wallet, match.wagerAmount, match.id, 'draw');
            }
            if (match.player2.wallet) {
                await userService.refundWager(match.player2.wallet, match.wagerAmount, match.id, 'draw');
            }
            
            // Refund token wagers via custodial wallet
            if (match.wagerToken?.tokenAddress) {
                settlementResult = await wagerSettlementService.handleDraw(match);
                console.log(`🤝 Token wager draw refund:`, settlementResult.success ? 'Success' : settlementResult.error);
            }
            
            return { refunded: match.wagerAmount, tokenSettlement: settlementResult };
        }
        
        // Pay winner - coins
        if (winnerWallet && match.wagerAmount > 0) {
            await userService.payoutWager(winnerWallet, loserWallet, totalPot, match.id);
        }
        
        // Pay winner - token wager via custodial wallet
        if (match.wagerToken?.tokenAddress && winnerWallet) {
            settlementResult = await wagerSettlementService.settleTokenWager(
                match,
                winnerId,
                winnerWallet,
                loserId,
                loserWallet
            );
            console.log(`💰 Token wager settlement:`, settlementResult.success ? `Success - ${settlementResult.txSignature}` : settlementResult.error);
        }
        
        // Record stats - map game types properly
        const gameTypeMap = {
            'tic_tac_toe': 'ticTacToe',
            'connect4': 'connect4',
            'card_jitsu': 'cardJitsu',
            'blackjack': 'blackjack',
            'uno': 'uno',
            'monopoly': 'monopoly'
        };
        const gameType = gameTypeMap[match.gameType] || match.gameType;
        
        // For blackjack P2P, use specialized recording
        if (match.gameType === 'blackjack') {
            // Record blackjack-specific stats for both players
            for (const playerKey of ['player1', 'player2']) {
                const playerData = match[playerKey];
                if (!playerData.wallet) continue;
                
                try {
                    const user = await userService.getUser(playerData.wallet);
                    if (user && user.recordBlackjackResult) {
                        const isWinner = winnerId === playerData.id;
                        const playerResult = match.state?.[`${playerKey}Result`];
                        user.recordBlackjackResult({
                            result: isWinner ? (playerResult === 'blackjack' ? 'BLACKJACK' : 'WIN') : (isDraw ? 'PUSH' : 'LOSS'),
                            isPvE: false,
                            coinsDelta: match.wagerAmount,
                            gotBlackjack: playerResult === 'blackjack',
                            busted: match.state?.[`${playerKey}Status`] === 'bust'
                        });
                        await user.save();
                    }
                } catch (e) {
                    console.error(`Failed to record blackjack P2P stats for ${playerData.name}:`, e);
                }
            }
        } else {
            // Standard stats recording for other games
            if (match.player1.wallet) {
                await statsService.recordResult(
                    match.player1.wallet, 
                    gameType, 
                    winnerId === match.player1.id, 
                    match.wagerAmount,
                    isDraw
                );
            }
            if (match.player2.wallet) {
                await statsService.recordResult(
                    match.player2.wallet, 
                    gameType, 
                    winnerId === match.player2.id, 
                    match.wagerAmount,
                    isDraw
                );
            }
        }
        
        return { 
            coinsWon: totalPot, 
            tokenSettlement: settlementResult 
        };
    } finally {
        // Always clear the in-progress flag
        _payoutInProgress.delete(match.id);
    }
}

// ==================== CONNECTION HANDLER ====================
wss.on('connection', (ws, req) => {
    const clientIP = getClientIP(req);
    
    if (!canIPConnect(clientIP)) {
        ws.send(JSON.stringify({
            type: 'error',
            code: 'TOO_MANY_CONNECTIONS',
            message: 'Too many connections from your IP address.'
        }));
        ws.close(1008, 'Too many connections');
        return;
    }
    
    const playerId = generateId();
    console.log(`[${ts()}] Player connected: ${playerId} from ${clientIP}`);
    
    trackIPConnection(clientIP, playerId);
    
    // Initialize player with guest state
    players.set(playerId, {
        id: playerId,
        ws,
        ip: clientIP,
        name: generateGuestName(),
        room: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        appearance: {},
        puffle: null,
        emote: null,
        isAuthenticated: false,
        walletAddress: null,
        authToken: null,
        guestCoins: 0,  // Guests can't earn/spend coins
        isAlive: true,   // For heartbeat detection
        lastMessageTime: Date.now(), // Track last message for mobile heartbeat fallback
        connectedAt: Date.now()
    });
    
    // Handle WebSocket pong (heartbeat response)
    ws.on('pong', () => {
        const player = players.get(playerId);
        if (player) player.isAlive = true;
    });
    
    // Auto-disconnect if player doesn't join a room within 5 minutes
    // This gives time for penguin maker customization before entering world
    const roomJoinTimeout = setTimeout(() => {
        const player = players.get(playerId);
        if (player && !player.room) {
            console.log(`[${ts()}] Auto-disconnecting idle player: ${playerId} (no room join after 5min)`);
            ws.close(1000, 'Idle timeout');
        }
    }, 300000); // 5 minutes
    
    // Store timeout ref for cleanup
    ws._roomJoinTimeout = roomJoinTimeout;
    
    // Send connection confirmation
    ws.send(JSON.stringify({
        type: 'connected',
        playerId,
        isGuest: true,
        message: 'Connect your Phantom wallet to save progress and earn coins!'
    }));
    
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            // Update last message time for heartbeat fallback (helps mobile)
            const player = players.get(playerId);
            if (player) {
                player.lastMessageTime = Date.now();
            }
            
            await handleMessage(playerId, message);
        } catch (e) {
            console.error('Error handling message:', e);
        }
    });
    
    ws.on('close', async () => {
        console.log(`[${ts()}] Player disconnected: ${playerId}`);
        const player = players.get(playerId);
        
        if (player) {
            // Handle slot disconnect (cancel any active spin)
            slotService.handleDisconnect(playerId);
            fishingService.handleDisconnect(playerId);
            
            // End any PvE activities
            if (activePveActivities.has(playerId)) {
                endPveActivity(playerId, { result: 'disconnected' });
            }
            
            // Handle match disconnect
            const voidResult = await matchService.handleDisconnect(playerId);
            if (voidResult) {
                // Refund both players if they have wallets
                if (voidResult.player1Wallet) {
                    await userService.refundWager(voidResult.player1Wallet, voidResult.wagerAmount, voidResult.matchId, 'disconnect');
                }
                if (voidResult.player2Wallet) {
                    await userService.refundWager(voidResult.player2Wallet, voidResult.wagerAmount, voidResult.matchId, 'disconnect');
                }
                
                const otherId = playerId === voidResult.player1Id ? voidResult.player2Id : voidResult.player1Id;
                const otherPlayer = players.get(otherId);
                const otherCoins = otherPlayer?.walletAddress ? 
                    (await userService.getUser(otherPlayer.walletAddress))?.coins || 0 : 0;
                
                sendToPlayer(otherId, {
                    type: 'match_end',
                    matchId: voidResult.matchId,
                    result: {
                        winner: 'void',
                        winnerPlayerId: null,
                        coinsWon: 0,
                        yourCoins: otherCoins,
                        reason: 'disconnect',
                        refunded: voidResult.wagerAmount
                    }
                });
            }
            
            // Handle challenge disconnect - cancel all pending challenges
            const challengeResult = await challengeService.handleDisconnect(playerId, player.walletAddress);
            if (challengeResult.affectedPlayers?.length > 0) {
                // Notify affected players that challenges were cancelled
                for (const affected of challengeResult.affectedPlayers) {
                    if (players.has(affected.playerId)) {
                        // Send inbox update to refresh their challenges
                        const messages = inboxService.getMessages(affected.playerId);
                        const outgoingChallenges = affected.walletAddress 
                            ? challengeService.getOutgoingChallengesFor(affected.playerId, affected.walletAddress)
                            : [];
                        
                        sendToPlayer(affected.playerId, {
                            type: 'inbox_update',
                            messages,
                            unreadCount: inboxService.getUnreadCount(affected.playerId),
                            outgoingChallenges
                        });
                        
                        // Also notify them specifically that challenge was cancelled
                        sendToPlayer(affected.playerId, {
                            type: 'challenge_cancelled',
                            challengeId: affected.challengeId,
                            reason: affected.reason,
                            message: `Challenge cancelled: ${affected.otherName} disconnected`
                        });
                    }
                }
            }
            
            // Update user connection state in DB
            if (player.walletAddress) {
                await authService.logout(player.walletAddress, player.authToken);
            }
            
            removeIPConnection(player.ip, playerId);
            
            if (player.room) {
                broadcastToRoom(player.room, { type: 'player_left', playerId });
                const room = rooms.get(player.room);
                if (room) room.delete(playerId);
            }
        }
        
        players.delete(playerId);
        playerTrailPoints.delete(playerId);
        playerChatTimestamps.delete(playerId);
    });
    
    ws.on('error', (error) => {
        console.error(`WebSocket error for ${playerId}:`, error);
    });
});

// ==================== MESSAGE HANDLER ====================
async function handleMessage(playerId, message) {
    const player = players.get(playerId);
    if (!player) return;
    
    // Handle igloo messages first (returns true if handled)
    if (message.type?.startsWith('igloo_')) {
        // Helper to get all players in a specific room with their wallet addresses
        const getPlayersInRoom = (roomId) => {
            const roomPlayers = rooms.get(roomId);
            if (!roomPlayers) return [];
            return Array.from(roomPlayers).map(pid => {
                const p = players.get(pid);
                return p ? { id: pid, walletAddress: p.walletAddress, name: p.name } : null;
            }).filter(Boolean);
        };
        const handled = await handleIglooMessage(playerId, player, message, sendToPlayer, broadcastToAll, getPlayersInRoom);
        if (handled) return;
    }
    
    // Handle tipping messages (x402 USDC P2P transfers)
    if (message.type?.startsWith('tip_')) {
        // Helper to find player by ID
        const getPlayerById = (id) => {
            const p = players.get(id);
            return p ? { id, ...p } : null;
        };
        // Helper to find player by wallet address
        const getPlayerByWallet = (wallet) => {
            for (const [id, p] of players) {
                if (p.walletAddress === wallet) {
                    return { id, ...p };
                }
            }
            return null;
        };
        const handled = await handleTippingMessage(playerId, player, message, sendToPlayer, getPlayerById, getPlayerByWallet);
        if (handled) return;
    }
    
    // Handle marketplace messages (cosmetic trading)
    if (message.type?.startsWith('market_')) {
        // Helper to find player by wallet address (for seller notifications)
        const getPlayerByWallet = (wallet) => {
            for (const [id, p] of players) {
                if (p.walletAddress === wallet) {
                    return { id, ...p };
                }
            }
            return null;
        };
        const handled = await handleMarketplaceMessage(playerId, player, message, sendToPlayer, broadcastToAll, getPlayerByWallet);
        if (handled) return;
    }
    
    // Handle gift messages
    if (message.type?.startsWith('gift_')) {
        // Helper to find player by ID
        const getPlayerById = (id) => {
            const p = players.get(id);
            return p ? { id, ...p } : null;
        };
        const handled = await handleGiftMessage(playerId, player, message, sendToPlayer, getPlayerById);
        if (handled) return;
    }
    
    switch (message.type) {
        // ==================== AUTHENTICATION ====================
        case 'auth_request': {
            // Generate x403 challenge for wallet signature
            // Include domain from request for signer confidence
            const domain = message.domain || process.env.APP_DOMAIN || 'clubpengu.com';
            const challenge = authService.generateChallenge(playerId, domain);
            
            sendToPlayer(playerId, {
                type: 'auth_challenge',
                message: challenge.message,    // Full message to sign
                nonce: challenge.nonce,        // Unique nonce
                domain: challenge.domain,      // Domain for verification
                expiresAt: challenge.expiresAt // When challenge expires
            });
            break;
        }
        
        case 'auth_verify': {
            const { walletAddress, signature, clientData } = message;
            
            // Verify the signature
            const verifyResult = authService.verifySignature(playerId, walletAddress, signature);
            if (!verifyResult.valid) {
                sendToPlayer(playerId, {
                    type: 'auth_failure',
                    error: verifyResult.error,
                    message: 'Signature verification failed'
                });
                break;
            }
            
            // Check if banned
            if (await authService.isWalletBanned(walletAddress)) {
                sendToPlayer(playerId, {
                    type: 'auth_failure',
                    error: 'BANNED',
                    message: 'Your account has been banned'
                });
                break;
            }
            
            try {
                // Clean up any existing connection for this wallet (prevents duplicate sessions)
                cleanupStaleWalletConnection(walletAddress, playerId);
                
                // Authenticate and get/create user
                const authResult = await authService.authenticateUser(
                    walletAddress,
                    playerId,
                    clientData || {},
                    player.ip
                );
                
                // Update player state
                player.isAuthenticated = true;
                player.walletAddress = walletAddress;
                player.authToken = authResult.token;
                player.name = authResult.user.username;
                player.appearance = authResult.user.customization;
                
                // Associate wallet with inbox
                inboxService.associateWallet(walletAddress, playerId);
                
                // Send success with full user data
                sendToPlayer(playerId, {
                    type: 'auth_success',
                    token: authResult.token,
                    user: authResult.user,
                    isNewUser: authResult.isNewUser
                });
                
                console.log(`🔐 ${authResult.user.username} authenticated (${walletAddress.slice(0, 8)}...)`);
                
                // If player is already in a room, notify others of the auth status
                if (player.room) {
                    broadcastToRoom(player.room, {
                        type: 'player_authenticated',
                        playerId,
                        name: player.name,
                        appearance: player.appearance
                    }, playerId);
                }
            } catch (error) {
                console.error('Auth error:', error);
                sendToPlayer(playerId, {
                    type: 'auth_failure',
                    error: 'AUTH_ERROR',
                    message: 'Authentication failed'
                });
            }
            break;
        }
        
        case 'check_username': {
            // Check if username is available (for real-time validation)
            const usernameToCheck = message.username?.trim();
            
            if (!usernameToCheck || usernameToCheck.length < 3 || usernameToCheck.length > 20) {
                sendToPlayer(playerId, {
                    type: 'username_status',
                    username: usernameToCheck,
                    available: false,
                    reason: 'invalid'
                });
                break;
            }
            
            try {
                const existing = await User.findOne({ 
                    username: usernameToCheck,
                    walletAddress: { $ne: player.walletAddress } // Exclude self
                });
                
                sendToPlayer(playerId, {
                    type: 'username_status',
                    username: usernameToCheck,
                    available: !existing,
                    reason: existing ? 'taken' : 'available'
                });
            } catch (error) {
                sendToPlayer(playerId, {
                    type: 'username_status',
                    username: usernameToCheck,
                    available: false,
                    reason: 'error'
                });
            }
            break;
        }
        
        case 'change_username': {
            // Change username (30 day cooldown, must be unique)
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'username_change_failed',
                    error: 'NOT_AUTHENTICATED',
                    message: 'You must be logged in to change your username'
                });
                break;
            }
            
            const newUsername = message.username?.trim();
            if (!newUsername) {
                sendToPlayer(playerId, {
                    type: 'username_change_failed',
                    error: 'INVALID_USERNAME',
                    message: 'Username cannot be empty'
                });
                break;
            }
            
            try {
                const user = await userService.getUser(player.walletAddress);
                if (!user) {
                    sendToPlayer(playerId, {
                        type: 'username_change_failed',
                        error: 'USER_NOT_FOUND',
                        message: 'User not found'
                    });
                    break;
                }
                
                const result = await user.changeUsername(newUsername);
                
                if (!result.success) {
                    sendToPlayer(playerId, {
                        type: 'username_change_failed',
                        error: result.error,
                        message: result.message
                    });
                    break;
                }
                
                await user.save();
                
                // Update player's name
                player.name = newUsername;
                
                // Notify success
                sendToPlayer(playerId, {
                    type: 'username_changed',
                    oldUsername: result.oldUsername,
                    newUsername: result.newUsername,
                    nextChangeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                });
                
                // Broadcast name change to room
                if (player.room) {
                    broadcastToRoom(player.room, {
                        type: 'player_name_changed',
                        playerId,
                        oldName: result.oldUsername,
                        newName: result.newUsername
                    }, playerId);
                }
                
                console.log(`[${ts()}] 📝 ${result.oldUsername} changed name to ${result.newUsername}`);
            } catch (error) {
                console.error('Username change error:', error);
                sendToPlayer(playerId, {
                    type: 'username_change_failed',
                    error: 'SERVER_ERROR',
                    message: 'Failed to change username'
                });
            }
            break;
        }
        
        case 'auth_logout': {
            if (player.walletAddress) {
                await authService.logout(player.walletAddress, player.authToken);
            }
            
            // Reset to guest state
            player.isAuthenticated = false;
            player.walletAddress = null;
            player.authToken = null;
            player.name = generateGuestName();
            
            sendToPlayer(playerId, {
                type: 'auth_logged_out',
                message: 'Logged out successfully'
            });
            break;
        }
        
        case 'auth_restore': {
            // Attempt to restore session from stored token
            const { token, walletAddress } = message;
            
            if (!token || !walletAddress) {
                sendToPlayer(playerId, {
                    type: 'auth_failure',
                    error: 'MISSING_CREDENTIALS',
                    message: 'Missing token or wallet address'
                });
                break;
            }
            
            try {
                // Validate the token and session
                const sessionResult = await authService.validateSession(token);
                
                if (!sessionResult.valid) {
                    sendToPlayer(playerId, {
                        type: 'auth_failure',
                        error: sessionResult.error,
                        message: 'Session expired or invalid. Please sign in again.'
                    });
                    break;
                }
                
                const user = sessionResult.user;
                
                // Verify wallet matches
                if (user.walletAddress !== walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'auth_failure',
                        error: 'WALLET_MISMATCH',
                        message: 'Wallet address does not match session'
                    });
                    break;
                }
                
                // Clean up any existing connection for this wallet (prevents duplicate sessions)
                cleanupStaleWalletConnection(walletAddress, playerId);
                
                // Update player state
                player.isAuthenticated = true;
                player.walletAddress = walletAddress;
                player.authToken = token;
                player.name = user.username;
                player.appearance = user.customization;
                
                // Associate wallet with inbox
                inboxService.associateWallet(walletAddress, playerId);
                
                // Migration: Set lastUsernameChangeAt for established users who don't have it
                if (user.isEstablishedUser() && !user.lastUsernameChangeAt) {
                    user.lastUsernameChangeAt = user.createdAt || new Date();
                    console.log(`[${ts()}] 📝 Migrated username lock for ${user.username}`);
                }
                
                // Update user connection state
                user.isConnected = true;
                user.currentPlayerId = playerId;
                user.lastActiveAt = new Date();
                await user.save();
                
                // Send restored session response (use async to include gacha cosmetics)
                sendToPlayer(playerId, {
                    type: 'auth_success',
                    token,
                    user: await user.getFullDataAsync(),
                    isNewUser: false,
                    restored: true
                });
                
                console.log(`[${ts()}] 🔄 Session restored: ${user.username} (${walletAddress.slice(0, 8)}...)`);
            } catch (error) {
                console.error('Session restore error:', error);
                sendToPlayer(playerId, {
                    type: 'auth_failure',
                    error: 'RESTORE_ERROR',
                    message: 'Failed to restore session'
                });
            }
            break;
        }
        
        // ==================== JOIN/MOVEMENT ====================
        case 'join': {
            player.name = message.name || player.name;
            player.appearance = message.appearance || {};
            player.puffle = message.puffle || null;
            
            const roomId = message.room || 'town';
            joinRoom(playerId, roomId);
            
            // Set spawn position
            if (roomId === 'town') {
                player.position = { x: 110, y: 0, z: 110 };
            } else if (roomId === 'dojo') {
                player.position = { x: 0, y: 0, z: 14 };
            }
            
            if (player.puffle) {
                player.pufflePosition = {
                    x: player.position.x + 1.5,
                    y: 0,
                    z: player.position.z + 1.5
                };
            }
            
            // Get player's coins from DB if authenticated
            let coins = 0;
            let needsSave = false;
            
            if (player.walletAddress) {
                const user = await userService.getUser(player.walletAddress);
                if (user) {
                    coins = user.coins || 0;
                    
                    // Check if this is first entry (username not locked yet)
                    const isFirstEntry = !user.lastUsernameChangeAt && !user.isEstablishedUser();
                    
                    // Only save customization if it actually changed AND all items are owned
                    if (message.appearance) {
                        const currentCustom = user.customization || {};
                        const newCustom = message.appearance;
                        const hasChanges = 
                            currentCustom.skin !== newCustom.skin ||
                            currentCustom.hat !== newCustom.hat ||
                            currentCustom.eyes !== newCustom.eyes ||
                            currentCustom.mouth !== newCustom.mouth ||
                            currentCustom.bodyItem !== newCustom.bodyItem ||
                            currentCustom.mount !== newCustom.mount ||
                            currentCustom.dogPrimaryColor !== newCustom.dogPrimaryColor ||
                            currentCustom.dogSecondaryColor !== newCustom.dogSecondaryColor ||
                            user.characterType !== newCustom.characterType;
                        
                        if (hasChanges) {
                            // Validate ownership of each cosmetic before applying
                            const validatedCustom = { ...newCustom };
                            let hadLockedItem = false;
                            
                            // Check skin color
                            if (newCustom.skin && !await userService.ownsCosmetic(player.walletAddress, newCustom.skin, 'skin')) {
                                console.log(`🔒 Blocked locked skin color: ${newCustom.skin}`);
                                validatedCustom.skin = 'blue'; // Reset to default
                                hadLockedItem = true;
                            }
                            // Check hat
                            if (newCustom.hat && !await userService.ownsCosmetic(player.walletAddress, newCustom.hat, 'hat')) {
                                console.log(`🔒 Blocked locked hat: ${newCustom.hat}`);
                                validatedCustom.hat = 'none';
                                hadLockedItem = true;
                            }
                            // Check eyes
                            if (newCustom.eyes && !await userService.ownsCosmetic(player.walletAddress, newCustom.eyes, 'eyes')) {
                                console.log(`🔒 Blocked locked eyes: ${newCustom.eyes}`);
                                validatedCustom.eyes = 'normal';
                                hadLockedItem = true;
                            }
                            // Check mouth
                            if (newCustom.mouth && !await userService.ownsCosmetic(player.walletAddress, newCustom.mouth, 'mouth')) {
                                console.log(`🔒 Blocked locked mouth: ${newCustom.mouth}`);
                                validatedCustom.mouth = 'beak';
                                hadLockedItem = true;
                            }
                            // Check bodyItem
                            if (newCustom.bodyItem && !await userService.ownsCosmetic(player.walletAddress, newCustom.bodyItem, 'bodyItem')) {
                                console.log(`🔒 Blocked locked bodyItem: ${newCustom.bodyItem}`);
                                validatedCustom.bodyItem = 'none';
                                hadLockedItem = true;
                            }
                            // Check mount
                            if (newCustom.mount && !await userService.ownsCosmetic(player.walletAddress, newCustom.mount, 'mount')) {
                                console.log(`🔒 Blocked locked mount: ${newCustom.mount}`);
                                validatedCustom.mount = 'none';
                                hadLockedItem = true;
                            }
                            
                            // Apply validated customization
                            user.updateCustomization(validatedCustom);
                            needsSave = true;
                            
                            // Update player appearance with validated values
                            player.appearance = validatedCustom;
                            
                            // Notify player if items were locked
                            if (hadLockedItem) {
                                sendToPlayer(playerId, {
                                    type: 'cosmetics_locked',
                                    message: 'Some equipped items were locked. Visit the Casino to unlock cosmetics!',
                                    validatedCustomization: validatedCustom
                                });
                            }
                        }
                    }
                    
                    // Update last room if changed
                    if (user.lastRoom !== roomId) {
                        user.lastRoom = roomId;
                        needsSave = true;
                    }
                    
                    // First entry - establish the user (lock username, set login time)
                    if (isFirstEntry) {
                        // Set login time and increment session count NOW (on first world entry)
                        user.lastLoginAt = new Date();
                        user.stats.session.totalSessions++;
                        
                        // Save username if provided and valid
                        if (message.name && message.name.length >= 3) {
                            // Check if username is available
                            const existingUser = await User.findOne({ 
                                username: message.name,
                                _id: { $ne: user._id }
                            });
                            
                            if (!existingUser) {
                                user.username = message.name;
                                user.lastUsernameChangeAt = new Date();
                                console.log(`[${ts()}] 📝 Username locked for ${message.name} (first entry)`);
                            } else {
                                // Username taken - generate a unique one
                                user.username = `Penguin${player.walletAddress.slice(-6)}`;
                                user.lastUsernameChangeAt = new Date();
                                console.log(`📝 Username conflict - assigned ${user.username}`);
                            }
                        }
                        
                        needsSave = true;
                        console.log(`[${ts()}] 🎮 User established: ${user.username}`);
                    }
                    
                    // Only save if something actually changed
                    if (needsSave) {
                        await user.save();
                        console.log(`[${ts()}] 💾 Saved changes for ${user.username}`);
                    }
                    
                    // Update player name from DB
                    player.name = user.username;
                }
            }
            
            const existingPlayers = getPlayersInRoom(roomId, playerId);
            
            // Get updated user data for authenticated users (includes locked username status)
            let userData = null;
            if (player.walletAddress) {
                const updatedUser = await userService.getUser(player.walletAddress);
                if (updatedUser) {
                    // Use async version to include gacha-owned cosmetics
                    userData = await updatedUser.getFullDataAsync();
                }
            }
            
            sendToPlayer(playerId, {
                type: 'room_state',
                room: roomId,
                players: existingPlayers,
                worldTime,
                coins,
                isAuthenticated: player.isAuthenticated,
                userData // Include updated user data (with lastUsernameChangeAt)
            });
            
            broadcastToRoom(roomId, {
                type: 'player_joined',
                player: {
                    id: player.id,
                    name: player.name,
                    position: player.position,
                    rotation: player.rotation,
                    appearance: player.appearance,
                    puffle: player.puffle,
                    pufflePosition: player.pufflePosition,
                    emote: player.emote,
                    seatedOnFurniture: player.seatedOnFurniture || false,
                    isAfk: player.isAfk || false,
                    afkMessage: player.afkMessage || null,
                    isAuthenticated: player.isAuthenticated
                }
            }, playerId);
            
            // Send active matches in room (P2P + PvE all via MatchService)
            const activeMatches = matchService.getMatchesInRoom(roomId);
            if (activeMatches.length > 0) {
                sendToPlayer(playerId, { type: 'active_matches', matches: activeMatches });
            }
            
            // Send active PvE activities in room (fishing, blackjack, etc.)
            const pveActivities = getPveActivitiesInRoom(roomId);
            if (Object.keys(pveActivities).length > 0) {
                sendToPlayer(playerId, { type: 'active_pve_activities', activities: pveActivities });
            }
            
            // Send active slot spins in room (for spectator bubbles)
            const activeSlotSpins = slotService.getActiveSlotSpins(roomId);
            if (activeSlotSpins.length > 0) {
                sendToPlayer(playerId, { type: 'slot_active_spins', spins: activeSlotSpins });
            }
            
            console.log(`[${ts()}] ${player.name} joined ${roomId}${player.isAuthenticated ? ' (authenticated)' : ' (guest)'}`);
            break;
        }
        
        case 'move': {
            const posChanged = !player.position || 
                Math.abs(player.position.x - message.position.x) > 0.01 ||
                Math.abs(player.position.z - message.position.z) > 0.01 ||
                Math.abs((player.position.y || 0) - (message.position.y || 0)) > 0.05;
            const rotChanged = player.rotation === undefined ||
                Math.abs(player.rotation - message.rotation) > 0.01;
            
            player.position = message.position;
            player.rotation = message.rotation;
            
            if (message.pufflePosition) {
                player.pufflePosition = message.pufflePosition;
            }
            
            // Clear AFK on movement
            const horizontalMove = posChanged && (
                Math.abs(player.position.x - (message.position?.x || 0)) > 0.01 ||
                Math.abs(player.position.z - (message.position?.z || 0)) > 0.01
            );
            if (horizontalMove && player.isAfk) {
                player.isAfk = false;
                player.afkMessage = null;
                if (player.room) {
                    broadcastToRoomAll(player.room, {
                        type: 'player_afk',
                        playerId,
                        isAfk: false
                    });
                }
            }
            
            // Store trail points
            if (message.trailPoints?.length > 0) {
                if (!playerTrailPoints.has(playerId)) {
                    playerTrailPoints.set(playerId, []);
                }
                const trails = playerTrailPoints.get(playerId);
                trails.push(...message.trailPoints);
                while (trails.length > MAX_TRAIL_POINTS_PER_PLAYER) trails.shift();
                const now = Date.now();
                while (trails.length > 0 && (now - trails[0].timestamp) > TRAIL_EXPIRY_MS) trails.shift();
            }
            
            if ((posChanged || rotChanged) && player.room) {
                const moveMessage = {
                    type: 'player_moved',
                    playerId,
                    position: player.position,
                    rotation: player.rotation,
                    pufflePosition: player.pufflePosition
                };
                if (message.trailPoints?.length > 0) {
                    moveMessage.trailPoints = message.trailPoints;
                }
                broadcastToRoom(player.room, moveMessage, playerId);
            }
            break;
        }
        
        case 'chat': {
            if (player.room && message.text) {
                // Rate limit check
                const now = Date.now();
                if (!playerChatTimestamps.has(playerId)) {
                    playerChatTimestamps.set(playerId, []);
                }
                const timestamps = playerChatTimestamps.get(playerId);
                // Remove old timestamps outside window
                while (timestamps.length > 0 && (now - timestamps[0]) > CHAT_RATE_WINDOW_MS) {
                    timestamps.shift();
                }
                // Check rate limit
                if (timestamps.length >= CHAT_RATE_LIMIT) {
                    sendToPlayer(playerId, {
                        type: 'error',
                        code: 'RATE_LIMITED',
                        message: 'You are sending messages too fast. Please slow down.'
                    });
                    break;
                }
                timestamps.push(now);
                
                const text = message.text.substring(0, 200);
                
                if (text.toLowerCase().startsWith('/afk')) {
                    const afkMessage = text.slice(4).trim() || 'AFK';
                    player.isAfk = true;
                    player.afkMessage = `💤 ${afkMessage}`;
                    
                    broadcastToRoomAll(player.room, {
                        type: 'player_afk',
                        playerId,
                        name: player.name,
                        isAfk: true,
                        afkMessage: player.afkMessage
                    });
                } else {
                    if (player.isAfk) {
                        player.isAfk = false;
                        player.afkMessage = null;
                        broadcastToRoomAll(player.room, {
                            type: 'player_afk',
                            playerId,
                            isAfk: false
                        });
                    }
                    
                    broadcastToRoomAll(player.room, {
                        type: 'chat',
                        playerId,
                        name: player.name,
                        text,
                        timestamp: Date.now()
                    });
                    
                    // Track chat stat and maybe award coins
                    if (player.walletAddress) {
                        statsService.recordChat(player.walletAddress);
                        
                        // 30% chance to earn 5 coins for chatting
                        if (Math.random() > 0.7) {
                            const result = await userService.addCoins(
                                player.walletAddress, 
                                5, 
                                'chat_bonus',
                                {},
                                'Earned from chatting'
                            );
                            if (result.success) {
                                sendToPlayer(playerId, {
                                    type: 'coins_update',
                                    coins: result.newBalance,
                                    isAuthenticated: true
                                });
                            }
                        }
                    }
                }
            }
            break;
        }
        
        case 'emote_bubble': {
            if (player.room && message.text) {
                const text = message.text.substring(0, 50);
                broadcastToRoomAll(player.room, {
                    type: 'emote_bubble',
                    playerId,
                    name: player.name,
                    text,
                    timestamp: Date.now()
                });
            }
            break;
        }
        
        case 'whisper': {
            if (!message.targetName || !message.text) break;
            
            const targetName = message.targetName.toLowerCase();
            const text = message.text.substring(0, 200);
            
            let targetPlayer = null;
            let targetId = null;
            for (const [pid, p] of players) {
                if (p.name?.toLowerCase() === targetName) {
                    targetPlayer = p;
                    targetId = pid;
                    break;
                }
            }
            
            if (targetPlayer?.ws?.readyState === 1) {
                targetPlayer.ws.send(JSON.stringify({
                    type: 'whisper',
                    fromId: playerId,
                    fromName: player.name,
                    text,
                    timestamp: Date.now()
                }));
                
                sendToPlayer(playerId, {
                    type: 'whisper_sent',
                    toName: targetPlayer.name,
                    text,
                    timestamp: Date.now()
                });
                
                // Track whisper stats
                if (player.walletAddress) {
                    statsService.recordWhisper(player.walletAddress, targetPlayer.walletAddress);
                }
            } else {
                sendToPlayer(playerId, {
                    type: 'whisper_error',
                    targetName: message.targetName,
                    error: 'Player not found or offline'
                });
            }
            break;
        }
        
        case 'emote': {
            player.emote = message.emote;
            player.seatedOnFurniture = message.seatedOnFurniture || false;
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_emote',
                    playerId,
                    emote: message.emote,
                    seatedOnFurniture: player.seatedOnFurniture
                }, playerId);
            }
            
            // Track emote stat
            if (player.walletAddress && message.emote) {
                statsService.recordEmote(player.walletAddress, message.emote);
            }
            
            // Auto-clear non-looping emotes
            const continuousEmotes = ['Sit', 'Breakdance', 'DJ', '67', 'Headbang'];
            if (message.emote && !continuousEmotes.includes(message.emote)) {
                setTimeout(() => {
                    if (player.emote === message.emote) {
                        player.emote = null;
                        player.seatedOnFurniture = false;
                        if (player.room) {
                            broadcastToRoomAll(player.room, {
                                type: 'player_emote',
                                playerId,
                                emote: null,
                                seatedOnFurniture: false
                            });
                        }
                    }
                }, 3000);
            }
            break;
        }
        
        case 'stop_emote': {
            player.emote = null;
            player.seatedOnFurniture = false;
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_emote',
                    playerId,
                    emote: null,
                    seatedOnFurniture: false
                }, playerId);
            }
            break;
        }
        
        case 'change_room': {
            const newRoom = message.room;
            const oldRoom = player.room;
            
            if (newRoom && newRoom !== oldRoom) {
                joinRoom(playerId, newRoom);
                
                if (newRoom === 'town') {
                    player.position = { x: 110, y: 0, z: 110 };
                } else if (newRoom === 'dojo') {
                    player.position = { x: 0, y: 0, z: 14 };
                }
                
                const existingPlayers = getPlayersInRoom(newRoom, playerId);
                sendToPlayer(playerId, {
                    type: 'room_state',
                    room: newRoom,
                    players: existingPlayers
                });
                
                broadcastToRoom(newRoom, {
                    type: 'player_joined',
                    player: {
                        id: player.id,
                        name: player.name,
                        position: player.position,
                        rotation: player.rotation,
                        appearance: player.appearance,
                        puffle: player.puffle,
                        pufflePosition: player.pufflePosition,
                        emote: player.emote,
                        seatedOnFurniture: player.seatedOnFurniture || false,
                        isAfk: player.isAfk || false,
                        afkMessage: player.afkMessage || null,
                        isAuthenticated: player.isAuthenticated
                    }
                }, playerId);
                
                // Send active matches in new room (P2P + PvE all via MatchService)
                const matchesInNewRoom = matchService.getMatchesInRoom(newRoom);
                if (matchesInNewRoom.length > 0) {
                    sendToPlayer(playerId, { type: 'active_matches', matches: matchesInNewRoom });
                } else {
                    sendToPlayer(playerId, { type: 'active_matches', matches: [] });
                }
                
                // Send active PvE activities in new room
                const pveActivitiesInNewRoom = getPveActivitiesInRoom(newRoom);
                sendToPlayer(playerId, { type: 'active_pve_activities', activities: pveActivitiesInNewRoom });
            }
            break;
        }
        
        case 'update_appearance': {
            player.appearance = message.appearance || player.appearance;
            
            // If authenticated, validate and save to DB
            if (player.walletAddress) {
                // Save customization AND characterType (characterType is top-level field)
                const result = await userService.updateProfile(player.walletAddress, {
                    customization: player.appearance,
                    characterType: player.appearance.characterType
                });
                if (!result.success && result.error === 'COSMETIC_NOT_OWNED') {
                    sendToPlayer(playerId, {
                        type: 'error',
                        code: 'COSMETIC_NOT_OWNED',
                        message: `You don't own: ${result.item}`
                    });
                    // Reset appearance from DB
                    const user = await userService.getUser(player.walletAddress);
                    if (user) player.appearance = user.customization;
                    return;
                }
            }
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_appearance',
                    playerId,
                    appearance: player.appearance
                }, playerId);
            }
            break;
        }
        
        case 'update_puffle': {
            player.puffle = message.puffle;
            
            if (player.puffle && player.position) {
                player.pufflePosition = {
                    x: player.position.x + 1.5,
                    y: 0,
                    z: player.position.z + 1.5
                };
            } else {
                player.pufflePosition = null;
            }
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_puffle',
                    playerId,
                    puffle: player.puffle,
                    pufflePosition: player.pufflePosition
                }, playerId);
            }
            break;
        }
        
        case 'ping': {
            sendToPlayer(playerId, { type: 'pong' });
            break;
        }
        
        // ==================== BALL PHYSICS ====================
        case 'ball_kick': {
            const room = player.room;
            if (room?.startsWith('igloo')) {
                const ball = beachBalls.get(room);
                if (ball) {
                    ball.x = message.x;
                    ball.z = message.z;
                    ball.vx = message.vx;
                    ball.vz = message.vz;
                    broadcastToRoomAll(room, {
                        type: 'ball_update',
                        x: ball.x,
                        z: ball.z,
                        vx: ball.vx,
                        vz: ball.vz
                    });
                }
            }
            break;
        }
        
        case 'ball_sync': {
            const room = player.room;
            if (room?.startsWith('igloo')) {
                const ball = beachBalls.get(room);
                if (ball) {
                    sendToPlayer(playerId, {
                        type: 'ball_update',
                        x: ball.x,
                        z: ball.z,
                        vx: ball.vx,
                        vz: ball.vz
                    });
                }
            }
            break;
        }
        
        // ==================== COINS & ECONOMY ====================
        case 'coins_sync': {
            // Return server-authoritative coin balance
            let coins = 0;
            if (player.walletAddress) {
                const user = await userService.getUser(player.walletAddress);
                coins = user?.coins || 0;
            }
            sendToPlayer(playerId, {
                type: 'coins_update',
                coins,
                isAuthenticated: player.isAuthenticated
            });
            break;
        }
        
        // ==================== INBOX ====================
        case 'inbox_sync': {
            const messages = inboxService.getMessages(playerId);
            // Pass both playerId and walletAddress to find challenges from previous sessions
            const outgoingChallenges = challengeService.getOutgoingChallengesFor(playerId, player.walletAddress);
            
            sendToPlayer(playerId, {
                type: 'inbox_update',
                messages,
                unreadCount: inboxService.getUnreadCount(playerId)
            });
            
            // Also send pending outgoing challenges
            if (outgoingChallenges.length > 0) {
                sendToPlayer(playerId, {
                    type: 'pending_challenges_sync',
                    challenges: outgoingChallenges
                });
                console.log(`📤 Synced ${outgoingChallenges.length} outgoing challenges to ${player.name}`);
            }
            break;
        }
        
        case 'inbox_read': {
            inboxService.markRead(playerId, message.messageId);
            break;
        }
        
        case 'inbox_delete': {
            // Get the message before deleting to check if it's a challenge
            const msgToDelete = inboxService.getMessage(playerId, message.messageId);
            
            // If it's a challenge message, decline it first
            if (msgToDelete?.type === 'challenge' && msgToDelete.data?.challengeId) {
                const challengeId = msgToDelete.data.challengeId;
                const denyResult = await challengeService.denyChallenge(challengeId, playerId);
                
                if (denyResult.success) {
                    // Notify the challenger that their challenge was declined
                    const challenge = challengeService.getChallenge(challengeId);
                    if (challenge) {
                        sendToPlayer(challenge.challengerId, {
                            type: 'challenge_declined',
                            challengeId,
                            message: `${player.name} declined your challenge`
                        });
                    }
                    console.log(`🗑️ Challenge ${challengeId} declined via inbox delete by ${player.name}`);
                }
                // Message already deleted by denyChallenge via deleteByChallengeId
            } else {
                // Not a challenge message, just delete it
                inboxService.deleteMessage(playerId, message.messageId);
            }
            
            sendToPlayer(playerId, {
                type: 'inbox_update',
                messages: inboxService.getMessages(playerId),
                unreadCount: inboxService.getUnreadCount(playerId)
            });
            break;
        }
        
        // ==================== STATS ====================
        case 'player_stats_request': {
            const stats = await statsService.getPublicStats(message.targetPlayerId, false);
            sendToPlayer(playerId, {
                type: 'player_stats',
                playerId: message.targetPlayerId,
                stats
            });
            break;
        }
        
        case 'my_full_stats': {
            // Authenticated users only
            if (!player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'my_full_stats_error',
                    error: 'NOT_AUTHENTICATED'
                });
                break;
            }
            
            try {
                // Get base stats
                const stats = await statsService.getPublicStats(player.walletAddress, true);
                
                // Get match history (last 50 matches)
                const MatchModel = (await import('./db/models/Match.js')).default;
                const matchHistory = await MatchModel.findHistoryForPlayer(player.walletAddress, 50);
                
                // Get coin transaction history (last 50)
                const TransactionModel = (await import('./db/models/Transaction.js')).default;
                const coinTransactions = await TransactionModel.getHistoryForWallet(player.walletAddress, 50);
                
                // Get Solana token transaction history (last 50)
                const SolanaTransactionModel = (await import('./db/models/SolanaTransaction.js')).default;
                const tokenTransactions = await SolanaTransactionModel.getWalletHistory(player.walletAddress, 50);
                
                // Format match history for client
                const formattedMatches = matchHistory.map(m => ({
                    matchId: m.matchId,
                    gameType: m.gameType,
                    opponent: m.player1.wallet === player.walletAddress ? m.player2.name : m.player1.name,
                    opponentWallet: m.player1.wallet === player.walletAddress ? m.player2.wallet : m.player1.wallet,
                    won: m.winnerWallet === player.walletAddress,
                    isDraw: m.status === 'draw',
                    wagerAmount: m.wagerAmount,
                    wagerToken: m.wagerToken?.tokenAddress ? {
                        symbol: m.wagerToken.tokenSymbol,
                        amount: m.wagerToken.tokenAmount,
                        address: m.wagerToken.tokenAddress
                    } : null,
                    settlementTx: m.settlementTx,
                    endedAt: m.endedAt,
                    duration: m.duration
                }));
                
                // Format coin transactions for client
                const formattedCoinTransactions = coinTransactions.map(t => ({
                    id: t.transactionId,
                    type: t.type,
                    amount: t.amount,
                    currency: 'coins',
                    direction: t.toWallet === player.walletAddress ? 'in' : 'out',
                    otherParty: t.toWallet === player.walletAddress ? t.fromWallet : t.toWallet,
                    reason: t.reason,
                    matchId: t.relatedData?.matchId,
                    timestamp: t.createdAt,
                    signature: null // No Solscan for coin transactions
                }));
                
                // Format Solana token transactions for client
                const formattedTokenTransactions = tokenTransactions.map(t => ({
                    id: t.signature?.slice(0, 16) || t._id.toString(),
                    type: t.type === 'wager' ? 'token_wager' : 
                          t.type === 'igloo_entry_fee' ? 'token_entry_fee' :
                          t.type === 'igloo_rent' ? 'token_rent' :
                          t.type === 'igloo_rent_renewal' ? 'token_rent_renewal' : 'token_transfer',
                    amount: t.amount,
                    currency: t.tokenSymbol || 'SPL',
                    tokenAddress: t.tokenMint,
                    direction: t.recipientWallet === player.walletAddress ? 'in' : 'out',
                    otherParty: t.recipientWallet === player.walletAddress ? t.senderWallet : t.recipientWallet,
                    reason: t.type === 'wager' ? `Wager ${t.matchId ? `for match ${t.matchId}` : ''}` :
                            t.type === 'igloo_entry_fee' ? `Entry fee ${t.iglooId ? `for ${t.iglooId}` : ''}` :
                            t.type === 'igloo_rent' ? `Rent ${t.iglooId ? `for ${t.iglooId}` : ''}` :
                            t.type === 'igloo_rent_renewal' ? `Rent renewal ${t.iglooId ? `for ${t.iglooId}` : ''}` : 'Token transfer',
                    matchId: t.matchId,
                    iglooId: t.iglooId,
                    timestamp: t.processedAt || t.createdAt,
                    signature: t.signature // For Solscan link
                }));
                
                // Merge and sort all transactions by timestamp (newest first)
                const allTransactions = [...formattedCoinTransactions, ...formattedTokenTransactions]
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, 100); // Limit to 100 total
                
                sendToPlayer(playerId, {
                    type: 'my_full_stats',
                    stats,
                    matchHistory: formattedMatches,
                    transactions: allTransactions
                });
            } catch (err) {
                console.error('Error fetching full stats:', err);
                sendToPlayer(playerId, {
                    type: 'my_full_stats_error',
                    error: 'FETCH_FAILED'
                });
            }
            break;
        }
        
        // ==================== CHALLENGES ====================
        case 'challenge_send': {
            const targetPlayer = players.get(message.targetPlayerId);
            if (!targetPlayer) {
                sendToPlayer(playerId, {
                    type: 'challenge_error',
                    error: 'PLAYER_NOT_FOUND',
                    message: 'Player not found or offline'
                });
                break;
            }
            
            // Check for SPL token wager (x402 protocol enhancement)
            const hasTokenWager = message.wagerToken?.tokenAddress && message.wagerToken?.tokenAmount > 0;
            
            // Validate wager requirements (coin wager)
            if (message.wagerAmount > 0) {
                if (!player.isAuthenticated) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: 'AUTH_REQUIRED',
                        message: 'You must be logged in to wager coins'
                    });
                    break;
                }
                if (!targetPlayer.isAuthenticated) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: 'TARGET_NOT_AUTH',
                        message: 'Target player is not logged in and cannot wager'
                    });
                    break;
                }
                
                // Check challenger's balance
                const canAfford = await userService.canAffordWager(player.walletAddress, message.wagerAmount);
                if (!canAfford) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: 'INSUFFICIENT_FUNDS',
                        message: "You don't have enough coins for this wager"
                    });
                    break;
                }
            }
            
            // Validate SPL token wager requirements (x402)
            if (hasTokenWager) {
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: 'AUTH_REQUIRED',
                        message: 'You must be logged in with a wallet to wager tokens'
                    });
                    break;
                }
                
                // Skip wallet check for bot targets - bot uses rent wallet
                if (!targetPlayer.isBot && (!targetPlayer.isAuthenticated || !targetPlayer.walletAddress)) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: 'TARGET_NO_WALLET',
                        message: 'Target player must have a wallet connected to receive token wagers'
                    });
                    break;
                }
                
                // CUSTODIAL APPROACH: Require deposit transaction from challenger
                if (!message.wagerDepositTx) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: 'DEPOSIT_REQUIRED',
                        message: 'Token wager requires a deposit to the custodial wallet'
                    });
                    break;
                }
                
                // Verify the deposit transaction on-chain
                const custodialAddress = wagerSettlementService.getCustodialWalletAddress();
                if (!custodialAddress) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: 'CUSTODIAL_NOT_READY',
                        message: 'Wager system not available. Please try again later.'
                    });
                    break;
                }
                
                console.log(`🔍 Verifying challenger deposit tx: ${message.wagerDepositTx}`);
                try {
                    const depositVerified = await solanaPaymentService.verifyTransaction(
                        message.wagerDepositTx,
                        player.walletAddress,
                        custodialAddress, // Use actual custodial wallet address
                        message.wagerToken.tokenAddress,
                        message.wagerToken.tokenAmount
                    );
                    
                    if (!depositVerified.success) {
                        sendToPlayer(playerId, {
                            type: 'challenge_error',
                            error: 'DEPOSIT_VERIFICATION_FAILED',
                            message: 'Could not verify your wager deposit. Please try again.'
                        });
                        break;
                    }
                    console.log('✅ Challenger deposit verified on-chain');
                } catch (verifyError) {
                    console.error('Deposit verification error:', verifyError);
                    // In dev mode, allow to proceed even if verification fails
                    if (process.env.NODE_ENV === 'production') {
                        sendToPlayer(playerId, {
                            type: 'challenge_error',
                            error: 'DEPOSIT_VERIFICATION_ERROR',
                            message: 'Deposit verification failed. Please try again.'
                        });
                        break;
                    }
                    console.log('⚠️ Dev mode: Proceeding without deposit verification');
                }
                
                // Verify challenger has sufficient token balance on-chain
                try {
                    const balance = await solanaPaymentService.getTokenBalance(
                        player.walletAddress,
                        message.wagerToken.tokenAddress
                    );
                    if (balance < message.wagerToken.tokenAmount) {
                        sendToPlayer(playerId, {
                            type: 'challenge_error',
                            error: 'INSUFFICIENT_TOKEN_BALANCE',
                            message: `You need ${message.wagerToken.tokenAmount} ${message.wagerToken.tokenSymbol} to wager`
                        });
                        break;
                    }
                    console.log(`✅ Token balance verified: ${balance} ${message.wagerToken.tokenSymbol}`);
                } catch (balanceError) {
                    console.error('Token balance check failed:', balanceError);
                    // Don't block in development - allow challenges to proceed
                    if (process.env.NODE_ENV === 'production') {
                        sendToPlayer(playerId, {
                            type: 'challenge_error',
                            error: 'BALANCE_CHECK_FAILED',
                            message: 'Could not verify token balance. Please try again.'
                        });
                        break;
                    }
                }
                
                console.log('✅ Challenger signed wager payload received');
            }
            
            if (matchService.isPlayerInMatch(playerId)) {
                sendToPlayer(playerId, {
                    type: 'challenge_error',
                    error: 'IN_MATCH',
                    message: 'You are already in a match'
                });
                break;
            }
            
            const result = await challengeService.createChallenge(
                { 
                    ...player, 
                    walletAddress: player.walletAddress 
                },
                { 
                    ...targetPlayer, 
                    id: message.targetPlayerId,
                    walletAddress: targetPlayer.walletAddress || (targetPlayer.isBot ? process.env.RENT_WALLET_ADDRESS : null)
                },
                message.gameType,
                message.wagerAmount,
                message.wagerToken || null,  // Pass token wager config
                message.signedWagerPayload || null  // Challenger's signed payment
            );
            
            if (result.error) {
                sendToPlayer(playerId, {
                    type: 'challenge_error',
                    error: result.error,
                    message: result.message
                });
            } else {
                sendToPlayer(playerId, {
                    type: 'challenge_sent',
                    challengeId: result.challenge.id,
                    targetPlayerId: message.targetPlayerId,
                    targetName: targetPlayer.name,
                    gameType: result.challenge.gameType,
                    wagerAmount: result.challenge.wagerAmount,
                    wagerToken: result.challenge.wagerToken || null
                });
                
                sendToPlayer(message.targetPlayerId, {
                    type: 'challenge_received',
                    challenge: {
                        id: result.challenge.id,
                        challengerId: player.id,
                        challengerName: player.name,
                        challengerWallet: player.walletAddress, // For token wager signing
                        challengerAppearance: player.appearance,
                        gameType: result.challenge.gameType,
                        wagerAmount: result.challenge.wagerAmount,
                        wagerToken: result.challenge.wagerToken || null, // Token wager info
                        expiresAt: result.challenge.expiresAt,
                        createdAt: result.challenge.createdAt
                    }
                });
                
                sendToPlayer(message.targetPlayerId, {
                    type: 'inbox_update',
                    messages: inboxService.getMessages(message.targetPlayerId),
                    unreadCount: inboxService.getUnreadCount(message.targetPlayerId)
                });
                
                // Handle DevBot challenge (auto-accept in dev mode)
                if (IS_DEV && devBotService.isBot(message.targetPlayerId)) {
                    devBotService.handleChallenge(result.challenge);
                }
            }
            break;
        }
        
        case 'challenge_respond': {
            const challenge = challengeService.getChallenge(message.challengeId);
            if (!challenge) {
                sendToPlayer(playerId, {
                    type: 'challenge_error',
                    error: 'NOT_FOUND',
                    message: 'Challenge not found or expired'
                });
                break;
            }
            
            if (message.response === 'accept') {
                // Validate funds for wagers
                if (challenge.wagerAmount > 0) {
                    if (!player.isAuthenticated || !player.walletAddress) {
                        sendToPlayer(playerId, {
                            type: 'challenge_error',
                            error: 'AUTH_REQUIRED',
                            message: 'You must be logged in to accept wagered challenges'
                        });
                        break;
                    }
                    
                    const canAfford = await userService.canAffordWager(player.walletAddress, challenge.wagerAmount);
                    if (!canAfford) {
                        sendToPlayer(playerId, {
                            type: 'challenge_error',
                            error: 'INSUFFICIENT_FUNDS',
                            message: "You don't have enough coins for this wager"
                        });
                        break;
                    }
                    
                    // Re-check challenger's funds
                    if (challenge.challengerWallet) {
                        const challengerCanAfford = await userService.canAffordWager(
                            challenge.challengerWallet, 
                            challenge.wagerAmount
                        );
                        if (!challengerCanAfford) {
                            sendToPlayer(playerId, {
                                type: 'challenge_error',
                                error: 'CHALLENGER_INSUFFICIENT_FUNDS',
                                message: `${challenge.challengerName} no longer has enough coins`
                            });
                            inboxService.deleteByChallengeId(playerId, message.challengeId);
                            break;
                        }
                    }
                }
                
                // Validate SPL token wager - acceptor must also deposit their tokens
                const hasTokenWager = challenge.wagerToken?.tokenAddress && challenge.wagerToken?.tokenAmount > 0;
                if (hasTokenWager) {
                    if (!player.isAuthenticated || !player.walletAddress) {
                        sendToPlayer(playerId, {
                            type: 'challenge_error',
                            error: 'AUTH_REQUIRED',
                            message: 'You must be logged in with a wallet to accept token wagers'
                        });
                        break;
                    }
                    
                    // CUSTODIAL APPROACH: Require deposit transaction from acceptor (unless bot)
                    if (!player.isBot && !message.wagerDepositTx) {
                        sendToPlayer(playerId, {
                            type: 'challenge_error',
                            error: 'DEPOSIT_REQUIRED',
                            message: 'You must deposit your wager to accept this challenge'
                        });
                        break;
                    }
                    
                    // Verify the acceptor's deposit transaction on-chain (unless bot)
                    if (!player.isBot && message.wagerDepositTx) {
                        const custodialAddress = wagerSettlementService.getCustodialWalletAddress();
                        if (!custodialAddress) {
                            sendToPlayer(playerId, {
                                type: 'challenge_error',
                                error: 'CUSTODIAL_NOT_READY',
                                message: 'Wager system not available. Please try again later.'
                            });
                            break;
                        }
                        
                        console.log(`🔍 Verifying acceptor deposit tx: ${message.wagerDepositTx}`);
                        try {
                            const depositVerified = await solanaPaymentService.verifyTransaction(
                                message.wagerDepositTx,
                                player.walletAddress,
                                custodialAddress, // Use actual custodial wallet address
                                challenge.wagerToken.tokenAddress,
                                challenge.wagerToken.tokenAmount
                            );
                            
                            if (!depositVerified.success) {
                                sendToPlayer(playerId, {
                                    type: 'challenge_error',
                                    error: 'DEPOSIT_VERIFICATION_FAILED',
                                    message: 'Could not verify your wager deposit. Please try again.'
                                });
                                break;
                            }
                            console.log('✅ Acceptor deposit verified on-chain');
                        } catch (verifyError) {
                            console.error('Acceptor deposit verification error:', verifyError);
                            if (process.env.NODE_ENV === 'production') {
                                sendToPlayer(playerId, {
                                    type: 'challenge_error',
                                    error: 'DEPOSIT_VERIFICATION_ERROR',
                                    message: 'Deposit verification failed. Please try again.'
                                });
                                break;
                            }
                            console.log('⚠️ Dev mode: Proceeding without acceptor deposit verification');
                        }
                    }
                    
                    console.log('✅ Both players have deposited wagers - ready to start match');
                }
                
                if (matchService.isPlayerInMatch(playerId) || matchService.isPlayerInMatch(challenge.challengerId)) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: 'PLAYER_IN_MATCH',
                        message: 'One of the players is already in a match'
                    });
                    break;
                }
                
                const acceptResult = await challengeService.acceptChallenge(message.challengeId, playerId);
                
                if (acceptResult.error) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: acceptResult.error,
                        message: acceptResult.message
                    });
                } else {
                    const challenger = players.get(challenge.challengerId);
                    const target = players.get(challenge.targetId);
                    
                    // Handle wager escrow
                    if (challenge.wagerAmount > 0) {
                        const escrowResult = await handleWagerEscrow(
                            { ...challenger, walletAddress: challenge.challengerWallet },
                            { ...target, walletAddress: challenge.targetWallet || player.walletAddress },
                            challenge.wagerAmount,
                            `match_pending_${message.challengeId}`
                        );
                        
                        if (escrowResult.error) {
                            sendToPlayer(playerId, {
                                type: 'challenge_error',
                                error: escrowResult.error,
                                message: escrowResult.message
                            });
                            break;
                        }
                    }
                    
                    // Create match with signed wager payloads for settlement
                    const match = await matchService.createMatch(
                        challenge, 
                        challenger, 
                        target,
                        {
                            // Include both players' signed payloads for token wager settlement
                            challengerSignedPayload: challenge.challengerSignedPayload || null,
                            targetSignedPayload: message.signedWagerPayload || null
                        }
                    );
                    
                    // Get updated coin balances
                    const p1Coins = challenge.challengerWallet ? 
                        (await userService.getUser(challenge.challengerWallet))?.coins || 0 : 0;
                    const p2Coins = player.walletAddress ? 
                        (await userService.getUser(player.walletAddress))?.coins || 0 : 0;
                    
                    // Notify both players
                    const matchStartMsg1 = {
                        type: 'match_start',
                        match: {
                            id: match.id,
                            gameType: match.gameType,
                            player1: { id: match.player1.id, name: match.player1.name, appearance: match.player1.appearance },
                            player2: { id: match.player2.id, name: match.player2.name, appearance: match.player2.appearance },
                            wagerAmount: match.wagerAmount,
                            wagerToken: match.wagerToken || null,
                            yourRole: 'player1'
                        },
                        initialState: matchService.getMatchState(match.id, challenge.challengerId),
                        coins: p1Coins
                    };
                    
                    const matchStartMsg2 = {
                        type: 'match_start',
                        match: {
                            id: match.id,
                            gameType: match.gameType,
                            player1: { id: match.player1.id, name: match.player1.name, appearance: match.player1.appearance },
                            player2: { id: match.player2.id, name: match.player2.name, appearance: match.player2.appearance },
                            wagerAmount: match.wagerAmount,
                            wagerToken: match.wagerToken || null,
                            yourRole: 'player2'
                        },
                        initialState: matchService.getMatchState(match.id, challenge.targetId),
                        coins: p2Coins
                    };
                    
                    sendToPlayer(challenge.challengerId, matchStartMsg1);
                    sendToPlayer(challenge.targetId, matchStartMsg2);
                    
                    // Handle DevBot match start
                    if (IS_DEV && (devBotService.isBot(challenge.challengerId) || devBotService.isBot(challenge.targetId))) {
                        devBotService.handleMatchStart(match);
                    }
                    
                    // Notify spectators
                    broadcastToRoom(match.room, {
                        type: 'match_spectate_start',
                        matchId: match.id,
                        players: [
                            { id: match.player1.id, name: match.player1.name, position: match.player1.position },
                            { id: match.player2.id, name: match.player2.name, position: match.player2.position }
                        ],
                        gameType: match.gameType,
                        wagerAmount: match.wagerAmount
                    }, challenge.challengerId, challenge.targetId);
                }
            } else if (message.response === 'deny') {
                await challengeService.denyChallenge(message.challengeId, playerId);
                sendToPlayer(challenge.challengerId, {
                    type: 'inbox_update',
                    messages: inboxService.getMessages(challenge.challengerId),
                    unreadCount: inboxService.getUnreadCount(challenge.challengerId)
                });
            } else if (message.response === 'delete') {
                await challengeService.deleteChallenge(message.challengeId, playerId);
                sendToPlayer(challenge.challengerId, {
                    type: 'inbox_update',
                    messages: inboxService.getMessages(challenge.challengerId),
                    unreadCount: inboxService.getUnreadCount(challenge.challengerId)
                });
            }
            
            sendToPlayer(playerId, {
                type: 'inbox_update',
                messages: inboxService.getMessages(playerId),
                unreadCount: inboxService.getUnreadCount(playerId)
            });
            break;
        }
        
        // Cancel a challenge (by the challenger)
        case 'challenge_cancel': {
            const { challengeId } = message;
            
            if (!challengeId) {
                sendToPlayer(playerId, {
                    type: 'challenge_error',
                    error: 'INVALID_REQUEST',
                    message: 'Missing challengeId'
                });
                break;
            }
            
            const challenge = challengeService.getChallenge(challengeId);
            if (!challenge) {
                sendToPlayer(playerId, {
                    type: 'challenge_error',
                    error: 'NOT_FOUND',
                    message: 'Challenge not found or expired'
                });
                break;
            }
            
            // Only the challenger can cancel (check both session ID and wallet)
            const isChallenger = challenge.challengerId === playerId || 
                                (player.walletAddress && challenge.challengerWallet === player.walletAddress);
            if (!isChallenger) {
                sendToPlayer(playerId, {
                    type: 'challenge_error',
                    error: 'NOT_CHALLENGER',
                    message: 'Only the challenger can cancel this challenge'
                });
                break;
            }
            
            const result = await challengeService.deleteChallenge(challengeId, playerId, player.walletAddress);
            
            if (result.error) {
                sendToPlayer(playerId, {
                    type: 'challenge_error',
                    error: result.error,
                    message: result.message
                });
            } else {
                // Notify challenger that cancellation was successful
                sendToPlayer(playerId, {
                    type: 'challenge_cancelled',
                    challengeId,
                    message: 'Challenge cancelled successfully'
                });
                
                // Update target's inbox (challenge removed)
                sendToPlayer(challenge.targetId, {
                    type: 'inbox_update',
                    messages: inboxService.getMessages(challenge.targetId),
                    unreadCount: inboxService.getUnreadCount(challenge.targetId)
                });
                
                console.log(`🚫 Challenge ${challengeId} cancelled by ${player.name}`);
            }
            break;
        }
        
        // ==================== MATCH GAMEPLAY ====================
        case 'match_play_card': {
            const result = matchService.playCard(message.matchId, playerId, message.cardIndex);
            
            if (result.error) {
                sendToPlayer(playerId, {
                    type: 'match_error',
                    error: result.error
                });
                break;
            }
            
            const match = matchService.getMatch(message.matchId);
            if (!match) break;
            
            // Send state to both players
            const state1 = matchService.getMatchState(match.id, match.player1.id);
            const state2 = matchService.getMatchState(match.id, match.player2.id);
            
            sendToPlayer(match.player1.id, { type: 'match_state', matchId: match.id, state: state1 });
            sendToPlayer(match.player2.id, { type: 'match_state', matchId: match.id, state: state2 });
            
            // Handle DevBot state update (bot doesn't have real WebSocket)
            if (IS_DEV) {
                if (devBotService.isBot(match.player1.id)) {
                    devBotService.handleMatchState(match.id, state1);
                } else if (devBotService.isBot(match.player2.id)) {
                    devBotService.handleMatchState(match.id, state2);
                }
            }
            
            // Broadcast to spectators
            if (match.room) {
                let spectateState;
                if (match.gameType === 'tic_tac_toe') {
                    spectateState = {
                        board: [...match.state.board],
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        winner: match.state.winner,
                        winningLine: match.state.winningLine,
                        status: match.status
                    };
                } else if (match.gameType === 'connect4') {
                    spectateState = {
                        board: [...match.state.board],
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        winner: match.state.winner,
                        winningCells: match.state.winningCells,
                        lastMove: match.state.lastMove,
                        status: match.status
                    };
                } else if (match.gameType === 'monopoly') {
                    spectateState = {
                        player1Position: match.state.player1?.position ?? 0,
                        player1Money: match.state.player1?.money ?? 1500,
                        player1Properties: match.state.player1?.properties || [],
                        player1InJail: match.state.player1?.inJail || false,
                        player2Position: match.state.player2?.position ?? 0,
                        player2Money: match.state.player2?.money ?? 1500,
                        player2Properties: match.state.player2?.properties || [],
                        player2InJail: match.state.player2?.inJail || false,
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        lastDice: match.state.lastDice || [0, 0],
                        currentEvent: match.state.currentEvent,
                        propertyOwners: match.state.propertyOwners,
                        winner: match.state.winner,
                        status: match.status
                    };
                } else if (match.gameType === 'blackjack') {
                    // P2P Blackjack - hide hands from spectators (anti-cheat)
                    const isComplete = match.state.phase === 'complete';
                    spectateState = {
                        player1CardCount: match.state.player1Hand?.length || 0,
                        player1Status: match.state.player1Status,
                        player1Result: match.state.player1Result,
                        player1Score: isComplete ? match.state.player1Score : null,
                        player2CardCount: match.state.player2Hand?.length || 0,
                        player2Status: match.state.player2Status,
                        player2Result: match.state.player2Result,
                        player2Score: isComplete ? match.state.player2Score : null,
                        dealerCardCount: match.state.dealerHand?.length || 0,
                        dealerStatus: match.state.dealerStatus,
                        dealerScore: isComplete ? match.state.dealerScore : null,
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        lastAction: match.state.lastAction ? { type: match.state.lastAction.type, player: match.state.lastAction.player } : null,
                        winner: match.state.winner,
                        status: match.status,
                        winnerId: match.winnerId
                    };
                } else {
                    spectateState = {
                        round: match.state.round,
                        phase: match.state.phase,
                        player1Wins: match.state.player1Wins,
                        player2Wins: match.state.player2Wins,
                        lastRoundResult: match.state.lastRoundResult ? {
                            player1Card: { element: match.state.lastRoundResult.player1Card?.element, emoji: match.state.lastRoundResult.player1Card?.emoji },
                            player2Card: { element: match.state.lastRoundResult.player2Card?.element, emoji: match.state.lastRoundResult.player2Card?.emoji },
                            winner: match.state.lastRoundResult.winner
                        } : null,
                        status: match.status
                    };
                }
                
                broadcastToRoom(match.room, {
                    type: 'match_spectate',
                    matchId: match.id,
                    gameType: match.gameType,
                    players: [
                        { id: match.player1.id, name: match.player1.name },
                        { id: match.player2.id, name: match.player2.name }
                    ],
                    state: spectateState,
                    wagerAmount: match.wagerAmount
                }, match.player1.id, match.player2.id);
            }
            
            // Handle match completion
            if (match.status === 'complete') {
                const winnerId = match.winnerId;
                const isDraw = result.isDraw || match.state.winner === 'draw';
                
                const payoutResult = await handleMatchPayout(match, winnerId, isDraw);
                
                // Get updated balances
                const p1Coins = match.player1.wallet ? 
                    (await userService.getUser(match.player1.wallet))?.coins || 0 : 0;
                const p2Coins = match.player2.wallet ? 
                    (await userService.getUser(match.player2.wallet))?.coins || 0 : 0;
                
                // Build token settlement info for UI
                const tokenSettlementInfo = payoutResult.tokenSettlement?.success ? {
                    txSignature: payoutResult.tokenSettlement.txSignature,
                    amount: payoutResult.tokenSettlement.amount,
                    tokenSymbol: payoutResult.tokenSettlement.tokenSymbol,
                    tokenAddress: payoutResult.tokenSettlement.tokenAddress,
                    isSimulated: payoutResult.tokenSettlement.isSimulated
                } : null;
                
                if (isDraw) {
                    sendToPlayer(match.player1.id, {
                        type: 'match_end',
                        matchId: match.id,
                        result: {
                            winner: 'draw',
                            winnerPlayerId: null,
                            coinsWon: 0,
                            yourCoins: p1Coins,
                            reason: 'draw',
                            refunded: payoutResult.refunded,
                            tokenSettlement: tokenSettlementInfo,
                            wagerToken: match.wagerToken
                        }
                    });
                    sendToPlayer(match.player2.id, {
                        type: 'match_end',
                        matchId: match.id,
                        result: {
                            winner: 'draw',
                            winnerPlayerId: null,
                            coinsWon: 0,
                            yourCoins: p2Coins,
                            reason: 'draw',
                            refunded: payoutResult.refunded,
                            tokenSettlement: tokenSettlementInfo,
                            wagerToken: match.wagerToken
                        }
                    });
                } else {
                    sendToPlayer(match.player1.id, {
                        type: 'match_end',
                        matchId: match.id,
                        result: {
                            winner: winnerId === match.player1.id ? 'player1' : 'player2',
                            winnerPlayerId: winnerId,
                            coinsWon: winnerId === match.player1.id ? payoutResult.coinsWon : 0,
                            yourCoins: p1Coins,
                            reason: 'win',
                            tokenSettlement: winnerId === match.player1.id ? tokenSettlementInfo : null,
                            tokenLost: winnerId !== match.player1.id && match.wagerToken ? match.wagerToken : null,
                            wagerToken: match.wagerToken
                        }
                    });
                    sendToPlayer(match.player2.id, {
                        type: 'match_end',
                        matchId: match.id,
                        result: {
                            winner: winnerId === match.player2.id ? 'player2' : 'player1',
                            winnerPlayerId: winnerId,
                            coinsWon: winnerId === match.player2.id ? payoutResult.coinsWon : 0,
                            yourCoins: p2Coins,
                            reason: 'win',
                            tokenSettlement: winnerId === match.player2.id ? tokenSettlementInfo : null,
                            tokenLost: winnerId !== match.player2.id && match.wagerToken ? match.wagerToken : null,
                            wagerToken: match.wagerToken
                        }
                    });
                }
                
                // Send final state to spectators
                let finalState;
                if (match.gameType === 'tic_tac_toe') {
                    finalState = { board: [...match.state.board], winner: match.state.winner, winningLine: match.state.winningLine };
                } else if (match.gameType === 'connect4') {
                    finalState = { board: [...match.state.board], winner: match.state.winner, winningCells: match.state.winningCells };
                } else if (match.gameType === 'monopoly') {
                    finalState = { 
                        winner: match.state.winner,
                        player1Money: match.state.player1?.money ?? 0,
                        player2Money: match.state.player2?.money ?? 0,
                        player1Position: match.state.player1?.position ?? 0,
                        player2Position: match.state.player2?.position ?? 0
                    };
                } else {
                    finalState = { player1Wins: match.state.player1Wins, player2Wins: match.state.player2Wins, winner: match.state.winner };
                }
                
                // Determine reason for match end
                let endReason = 'win';
                if (isDraw) endReason = 'draw';
                else if (match.gameType === 'monopoly' && (match.state.player1?.money < 0 || match.state.player2?.money < 0)) {
                    endReason = 'bankruptcy';
                }
                
                broadcastToRoom(match.room, {
                    type: 'match_spectate_end',
                    matchId: match.id,
                    winnerId,
                    winnerName: winnerId ? (winnerId === match.player1.id ? match.player1.name : match.player2.name) : null,
                    isDraw,
                    finalState,
                    gameType: match.gameType,
                    reason: endReason
                }, match.player1.id, match.player2.id);
                
                // Send updated stats
                const stats1 = await statsService.getPublicStats(match.player1.wallet, true);
                const stats2 = await statsService.getPublicStats(match.player2.wallet, true);
                sendToPlayer(match.player1.id, { type: 'stats_update', stats: stats1 });
                sendToPlayer(match.player2.id, { type: 'stats_update', stats: stats2 });
                
                await matchService.endMatch(match.id);
                
                // Handle DevBot match end
                if (IS_DEV && (devBotService.isBot(match.player1.id) || devBotService.isBot(match.player2.id))) {
                    devBotService.handleMatchEnd(match.id);
                }
            }
            break;
        }
        
        case 'match_forfeit': {
            const match = matchService.getMatch(message.matchId);
            if (!match) break;
            
            const forfeiterId = playerId;
            const winnerId = forfeiterId === match.player1.id ? match.player2.id : match.player1.id;
            
            // Handle payout (winner gets pot)
            const payoutResult = await handleMatchPayout(match, winnerId, false);
            
            const p1Coins = match.player1.wallet ? 
                (await userService.getUser(match.player1.wallet))?.coins || 0 : 0;
            const p2Coins = match.player2.wallet ? 
                (await userService.getUser(match.player2.wallet))?.coins || 0 : 0;
            
            sendToPlayer(match.player1.id, {
                type: 'match_end',
                matchId: match.id,
                result: {
                    winner: winnerId === match.player1.id ? 'player1' : 'player2',
                    winnerPlayerId: winnerId,
                    coinsWon: winnerId === match.player1.id ? payoutResult.coinsWon : 0,
                    yourCoins: p1Coins,
                    reason: 'forfeit'
                }
            });
            sendToPlayer(match.player2.id, {
                type: 'match_end',
                matchId: match.id,
                result: {
                    winner: winnerId === match.player2.id ? 'player2' : 'player1',
                    winnerPlayerId: winnerId,
                    coinsWon: winnerId === match.player2.id ? payoutResult.coinsWon : 0,
                    yourCoins: p2Coins,
                    reason: 'forfeit'
                }
            });
            
            // Notify spectators that match has ended (so banners are cleaned up)
            broadcastToRoom(match.room, {
                type: 'match_spectate_end',
                matchId: match.id,
                winnerId,
                winnerName: winnerId ? (winnerId === match.player1.id ? match.player1.name : match.player2.name) : null,
                isDraw: false,
                reason: 'forfeit',
                gameType: match.gameType
            }, match.player1.id, match.player2.id);
            
            await matchService.voidMatch(match.id, 'forfeit');
            
            // Handle DevBot forfeit end
            if (IS_DEV && (devBotService.isBot(match.player1.id) || devBotService.isBot(match.player2.id))) {
                devBotService.handleMatchEnd(match.id);
            }
            
            console.log(`🏳️ ${players.get(forfeiterId)?.name} forfeited to ${players.get(winnerId)?.name}`);
            break;
        }
        
        // ==================== MATCH CHAT ====================
        case 'match_chat': {
            const match = matchService.getMatch(message.matchId);
            if (!match) {
                sendToPlayer(playerId, {
                    type: 'error',
                    code: 'MATCH_NOT_FOUND',
                    message: 'Match not found'
                });
                break;
            }
            
            // Only players in the match can chat
            const isInMatch = playerId === match.player1.id || playerId === match.player2.id;
            if (!isInMatch) {
                sendToPlayer(playerId, {
                    type: 'error',
                    code: 'NOT_IN_MATCH',
                    message: 'You are not in this match'
                });
                break;
            }
            
            const text = (message.text || '').trim().slice(0, 150); // Limit to 150 chars
            if (!text) break;
            
            // Send to both players in the match
            const chatMessage = {
                type: 'match_chat',
                matchId: match.id,
                senderId: playerId,
                senderName: player.name,
                text,
                timestamp: Date.now()
            };
            
            sendToPlayer(match.player1.id, chatMessage);
            sendToPlayer(match.player2.id, chatMessage);
            break;
        }
        
        case 'active_matches_request': {
            if (player.room) {
                const matches = matchService.getMatchesInRoom(player.room);
                sendToPlayer(playerId, { type: 'active_matches', matches });
            }
            break;
        }
        
        // ==================== PUFFLE OPERATIONS ====================
        case 'puffle_adopt': {
            if (!player.isAuthenticated) {
                sendToPlayer(playerId, {
                    type: 'error',
                    code: 'AUTH_REQUIRED',
                    message: 'You must be logged in to adopt puffles'
                });
                break;
            }
            
            const adoptResult = await userService.adoptPuffle(
                player.walletAddress,
                message.color,
                message.name
            );
            
            if (adoptResult.success) {
                sendToPlayer(playerId, {
                    type: 'puffle_adopted',
                    puffle: adoptResult.puffle,
                    newBalance: adoptResult.newBalance
                });
                
                // Also send coins update
                sendToPlayer(playerId, {
                    type: 'coins_update',
                    coins: adoptResult.newBalance,
                    isAuthenticated: true
                });
            } else {
                sendToPlayer(playerId, {
                    type: 'puffle_adopt_failed',
                    error: adoptResult.error,
                    message: adoptResult.error === 'INSUFFICIENT_FUNDS' ? 
                        `You need ${adoptResult.required} coins (you have ${adoptResult.have})` : 
                        'Failed to adopt puffle'
                });
            }
            break;
        }
        
        case 'puffle_list': {
            if (!player.walletAddress) {
                sendToPlayer(playerId, { type: 'puffle_list', puffles: [] });
                break;
            }
            
            const puffles = await userService.getPuffles(player.walletAddress);
            sendToPlayer(playerId, { type: 'puffle_list', puffles });
            break;
        }
        
        case 'puffle_activate': {
            if (!player.walletAddress) break;
            
            const result = await userService.setActivePuffle(player.walletAddress, message.puffleId);
            if (result.success) {
                player.puffle = result.puffle;
                if (player.room) {
                    broadcastToRoom(player.room, {
                        type: 'player_puffle',
                        playerId,
                        puffle: result.puffle
                    }, playerId);
                }
            }
            break;
        }
        
        case 'puffle_deactivate': {
            if (!player.walletAddress) break;
            
            await userService.deactivatePuffle(player.walletAddress);
            player.puffle = null;
            player.pufflePosition = null;
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_puffle',
                    playerId,
                    puffle: null
                }, playerId);
            }
            break;
        }
        
        // ==================== USER DATA ====================
        case 'get_user_data': {
            if (!player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'user_data',
                    user: null,
                    isGuest: true
                });
                break;
            }
            
            const user = await userService.getUser(player.walletAddress);
            sendToPlayer(playerId, {
                type: 'user_data',
                user: user ? await user.getFullDataAsync() : null,
                isGuest: false
            });
            break;
        }
        
        case 'update_username': {
            if (!player.walletAddress) break;
            
            const result = await userService.updateProfile(player.walletAddress, {
                username: message.username
            });
            
            if (result.success) {
                player.name = message.username;
                sendToPlayer(playerId, {
                    type: 'username_updated',
                    username: message.username
                });
                
                // Notify room
                if (player.room) {
                    broadcastToRoom(player.room, {
                        type: 'player_renamed',
                        playerId,
                        newName: message.username
                    }, playerId);
                }
            } else {
                sendToPlayer(playerId, {
                    type: 'error',
                    code: result.error,
                    message: result.error === 'USERNAME_COOLDOWN' ? 
                        `Wait ${result.daysRemaining} more days` : 
                        'Failed to update username'
                });
            }
            break;
        }
        
        // ==================== PROMO CODES ====================
        case 'promo_redeem': {
            // Require authentication for promo codes
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'promo_result',
                    success: false,
                    error: 'AUTH_REQUIRED',
                    message: 'You must be logged in to redeem promo codes'
                });
                break;
            }
            
            const promoResult = await promoCodeService.redeemCode(
                player.walletAddress,
                message.code,
                {
                    playerId,
                    ipAddress: player.ip,
                    sessionId: player.authToken
                }
            );
            
            sendToPlayer(playerId, {
                type: 'promo_result',
                ...promoResult
            });
            
            // If successful, also send updated user data with new unlocks
            if (promoResult.success) {
                const updatedUser = await userService.getUser(player.walletAddress);
                if (updatedUser) {
                    sendToPlayer(playerId, {
                        type: 'user_data',
                        user: await updatedUser.getFullDataAsync(),
                        isGuest: false
                    });
                    
                    // If coins were awarded, send coins update
                    if (promoResult.unlocked?.coinsAwarded) {
                        sendToPlayer(playerId, {
                            type: 'coins_update',
                            coins: promoResult.unlocked.newBalance,
                            isAuthenticated: true
                        });
                    }
                }
            }
            break;
        }
        
        case 'promo_validate': {
            // Quick validation without redeeming (for UI feedback)
            const validateResult = await promoCodeService.validateCode(
                player.walletAddress,
                message.code
            );
            
            sendToPlayer(playerId, {
                type: 'promo_validation',
                code: message.code,
                ...validateResult
            });
            break;
        }
        
        case 'promo_history': {
            // Get user's redeemed promo codes
            if (!player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'promo_history',
                    codes: []
                });
                break;
            }
            
            const history = await promoCodeService.getRedeemedCodes(player.walletAddress);
            sendToPlayer(playerId, {
                type: 'promo_history',
                codes: history
            });
            break;
        }
        
        // ==================== SLOT MACHINE ====================
        case 'slot_spin': {
            // Player wants to spin a slot machine (now cosmetic gacha using Pebbles)
            const { machineId, isDemo } = message;
            
            if (!machineId) {
                sendToPlayer(playerId, {
                    type: 'slot_error',
                    error: 'INVALID_MACHINE',
                    message: 'Invalid slot machine'
                });
                break;
            }
            
            const spinResult = await slotService.spin(
                playerId,
                player.walletAddress,
                player.room,
                machineId,
                player.name,
                player.position,
                0, // No longer using guestCoins - Pebbles system now
                isDemo || false // Demo mode for unauthenticated users
            );
            
            if (spinResult.error) {
                sendToPlayer(playerId, {
                    type: 'slot_error',
                    error: spinResult.error,
                    message: spinResult.message,
                    pebbleBalance: spinResult.pebbleBalance,
                    required: spinResult.required
                });
            } else {
                // Send spin started confirmation with Pebble balance
                sendToPlayer(playerId, {
                    type: 'slot_spin_started',
                    machineId: spinResult.machineId,
                    newPebbleBalance: spinResult.newPebbleBalance,
                    spinCost: spinResult.spinCost,
                    isDemo: spinResult.isDemo
                });
                
                // Broadcast to room that player started spinning
                broadcastToRoom(player.room, {
                    type: 'slot_player_spinning',
                    playerId,
                    playerName: player.name,
                    playerPosition: player.position,
                    machineId,
                    isDemo: spinResult.isDemo
                }, playerId);
                
                // Send updated Pebbles balance
                if (spinResult.newPebbleBalance !== undefined) {
                    sendToPlayer(playerId, {
                        type: 'pebbles_update',
                        pebbles: spinResult.newPebbleBalance
                    });
                }
            }
            break;
        }
        
        case 'slot_info': {
            // Get slot machine info (symbols, payouts)
            sendToPlayer(playerId, {
                type: 'slot_info',
                info: SlotService.getSlotInfo()
            });
            break;
        }
        
        case 'slot_sync': {
            // Get active slot spins in the current room
            if (player.room) {
                const activeSpins = slotService.getActiveSlotSpins(player.room);
                sendToPlayer(playerId, {
                    type: 'slot_active_spins',
                    spins: activeSpins
                });
            }
            break;
        }
        
        // ==================== ICE FISHING ====================
        case 'fishing_start': {
            // Player wants to start fishing - deduct bait cost
            try {
                const { spotId, guestCoins, isDemo } = message;
                
                if (!spotId) {
                    sendToPlayer(playerId, {
                        type: 'fishing_error',
                        error: 'INVALID_SPOT',
                        message: 'Invalid fishing spot'
                    });
                    break;
                }
                
                const fishResult = await fishingService.startFishing(
                    playerId,
                    player.walletAddress,
                    player.room,
                    spotId,
                    player.name,
                    guestCoins || 0,
                    isDemo || !player.isAuthenticated
                );
                
                if (fishResult.error) {
                    sendToPlayer(playerId, {
                        type: 'fishing_error',
                        error: fishResult.error,
                        message: fishResult.message
                    });
                } else {
                    sendToPlayer(playerId, {
                        type: 'fishing_started',
                        spotId: fishResult.spotId,
                        newBalance: fishResult.newBalance,
                        baitCost: fishResult.baitCost,
                        isDemo: fishResult.isDemo
                    });
                    
                    // Start PvE activity for spectator banner
                    startPveActivity(playerId, 'fishing', player.room, {
                        spotId: fishResult.spotId,
                        fishCaught: 0,
                        totalValue: 0,
                        lastFish: null
                    });
                    
                    // Send updated coins
                    if (fishResult.newBalance !== undefined) {
                        sendToPlayer(playerId, {
                            type: 'coins_update',
                            coins: fishResult.newBalance,
                            isAuthenticated: player.isAuthenticated
                        });
                    }
                }
            } catch (error) {
                console.error('🎣 Error in fishing_start:', error);
                sendToPlayer(playerId, {
                    type: 'fishing_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to start fishing'
                });
            }
            break;
        }
        
        case 'fishing_game_result': {
            // Minigame result - player caught a fish or missed
            try {
                const { fish, depth, success } = message;
                
                if (success && fish) {
                    // Player caught a fish - award coins and broadcast to room
                    const isDemo = !player.isAuthenticated;
                    const guestBalance = !player.isAuthenticated ? (message.guestCoins || 0) : 0;
                    
                    const result = await fishingService.handleCatch(
                        playerId,
                        player.walletAddress,
                        player.room,
                        player.name,
                        fish,
                        depth || 0,
                        isDemo,
                        guestBalance
                    );
                    
                    if (result.error) {
                        sendToPlayer(playerId, {
                            type: 'fishing_error',
                            error: result.error,
                            message: result.message
                        });
                    } else {
                        // Update PvE activity with caught fish
                        const activity = activePveActivities.get(playerId);
                        if (activity) {
                            const newFishCount = (activity.state.fishCaught || 0) + 1;
                            const newTotalValue = (activity.state.totalValue || 0) + (fish.value || 0);
                            updatePveActivity(playerId, {
                                fishCaught: newFishCount,
                                totalValue: newTotalValue,
                                lastFish: {
                                    name: fish.name,
                                    rarity: fish.rarity,
                                    value: fish.value,
                                    emoji: fish.emoji || '🐟'
                                }
                            });
                        }
                        
                        // Update coin balance
                        if (result.newBalance !== undefined) {
                            sendToPlayer(playerId, {
                                type: 'coins_update',
                                coins: result.newBalance,
                                isAuthenticated: player.isAuthenticated
                            });
                        }
                    }
                }
                // Misses are silently ignored - no broadcast needed
            } catch (error) {
                console.error('🎣 Error in fishing_game_result:', error);
                sendToPlayer(playerId, {
                    type: 'fishing_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to process game result'
                });
            }
            break;
        }
        
        case 'fishing_info': {
            // Get fishing info (fish types, costs)
            try {
                sendToPlayer(playerId, {
                    type: 'fishing_info',
                    info: FishingService.getFishingInfo()
                });
            } catch (error) {
                console.error('🎣 Error in fishing_info:', error);
            }
            break;
        }
        
        case 'fishing_end': {
            // Player stopped fishing - end PvE activity
            const activity = activePveActivities.get(playerId);
            if (activity && activity.activity === 'fishing') {
                endPveActivity(playerId, {
                    result: 'ended',
                    fishCaught: activity.state.fishCaught || 0,
                    totalValue: activity.state.totalValue || 0
                });
            }
            break;
        }
        
        // ==================== BLACKJACK (PvE Casino Tables) ====================
        case 'blackjack_get_state': {
            // Get current table state
            const { tableId } = message;
            if (!tableId) break;
            
            const tableState = blackjackService.getTableState(tableId, playerId);
            if (tableState) {
                sendToPlayer(playerId, {
                    type: 'blackjack_state',
                    table: tableState
                });
            }
            break;
        }
        
        case 'blackjack_sit': {
            // Player sits at a blackjack table
            const { tableId, seatIndex } = message;
            console.log(`🎰 Blackjack sit request: player=${playerId}, table=${tableId}, seat=${seatIndex}`);
            
            if (!tableId || seatIndex === undefined) {
                console.log(`🎰 Invalid sit request - missing params`);
                sendToPlayer(playerId, {
                    type: 'blackjack_error',
                    error: 'Invalid request - missing tableId or seatIndex'
                });
                break;
            }
            
            const sitResult = await blackjackService.sitAtTable(
                playerId,
                player.name,
                player.walletAddress,
                tableId,
                seatIndex
            );
            console.log(`🎰 Sit result:`, sitResult.error || 'success');
            
            if (sitResult.error) {
                sendToPlayer(playerId, {
                    type: 'blackjack_error',
                    error: sitResult.error
                });
            } else {
                sendToPlayer(playerId, {
                    type: 'blackjack_seated',
                    table: sitResult.table,
                    seatIndex: sitResult.seatIndex
                });
                
                // Broadcast to room that player sat down
                broadcastToRoom(player.room, {
                    type: 'blackjack_player_joined',
                    tableId,
                    playerName: player.name,
                    seatIndex: sitResult.seatIndex
                }, playerId);
            }
            break;
        }
        
        case 'blackjack_leave': {
            // Player leaves the table
            const leaveResult = await blackjackService.leaveTable(playerId);
            
            if (leaveResult.error) {
                sendToPlayer(playerId, {
                    type: 'blackjack_error',
                    error: leaveResult.error
                });
            } else {
                sendToPlayer(playerId, {
                    type: 'blackjack_left'
                });
            }
            break;
        }
        
        case 'blackjack_bet': {
            // Player places a bet
            const { tableId, amount } = message;
            console.log(`🎰 Blackjack bet request: player=${playerId}, table=${tableId}, amount=${amount}`);
            
            if (!amount || amount < 10 || amount > 5000) {
                console.log(`🎰 Invalid bet amount: ${amount}`);
                sendToPlayer(playerId, {
                    type: 'blackjack_error',
                    error: 'Invalid bet amount (min 10, max 5000)'
                });
                break;
            }
            
            try {
                const betResult = await blackjackService.placeBet(playerId, amount);
                console.log(`🎰 Bet result:`, betResult.error || 'success', betResult.table?.phase);
            
            if (betResult.error) {
                sendToPlayer(playerId, {
                    type: 'blackjack_error',
                    error: betResult.error,
                    ...(betResult.balance !== undefined && { balance: betResult.balance })
                });
            } else {
                // Send updated coins
                const newBalance = await userService.getUserCoins(player.walletAddress || playerId);
                sendToPlayer(playerId, {
                    type: 'coins_update',
                    coins: newBalance,
                    isAuthenticated: player.isAuthenticated
                });
                
                // Send updated game state
                if (betResult.table) {
                    sendToPlayer(playerId, {
                        type: 'blackjack_state',
                        table: betResult.table
                    });
                }
            }
            } catch (err) {
                console.error('🎰 Blackjack bet error:', err);
                sendToPlayer(playerId, {
                    type: 'blackjack_error',
                    error: 'Server error placing bet'
                });
            }
            break;
        }
        
        case 'blackjack_action': {
            // Player performs game action (hit, stand, double, etc.)
            const { tableId, action } = message;
            if (!action || !action.type) {
                sendToPlayer(playerId, {
                    type: 'blackjack_error',
                    error: 'Invalid action'
                });
                break;
            }
            
            const actionResult = await blackjackService.playerAction(playerId, action);
            
            if (actionResult.error) {
                sendToPlayer(playerId, {
                    type: 'blackjack_error',
                    error: actionResult.error
                });
            } else {
                // If double down or surrender, send updated coins
                if (action.type === 'double' || action.type === 'surrender') {
                    const newBalance = await userService.getUserCoins(player.walletAddress || playerId);
                    sendToPlayer(playerId, {
                        type: 'coins_update',
                        coins: newBalance,
                        isAuthenticated: player.isAuthenticated
                    });
                }
                
                // Always send updated game state after action
                if (actionResult.table) {
                    sendToPlayer(playerId, {
                        type: 'blackjack_state',
                        table: actionResult.table
                    });
                }
            }
            break;
        }
        
        case 'blackjack_deduct_bet': {
            // Simple PvE blackjack - just deduct coins (activity starts on first update with cards)
            const { amount } = message;
            
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, { type: 'blackjack_error', error: 'Must be authenticated' });
                break;
            }
            
            const betAmount = Math.min(Math.max(10, amount || 0), 5000);
            const currentBalance = await userService.getUserCoins(player.walletAddress);
            
            if (currentBalance < betAmount) {
                sendToPlayer(playerId, { type: 'blackjack_error', error: 'Insufficient funds' });
                break;
            }
            
            try {
                await userService.updateCoins(player.walletAddress, -betAmount);
                const newBalance = await userService.getUserCoins(player.walletAddress);
                console.log(`🎰 Blackjack bet deducted: ${player.name} bet $${betAmount}, new balance: $${newBalance}`);
                sendToPlayer(playerId, { type: 'coins_update', coins: newBalance, isAuthenticated: true });
                
                // Track bet for payout validation and spectator display
                player.blackjackBet = betAmount;
                
            } catch (err) {
                console.error('🎰 Blackjack bet deduction error:', err);
                sendToPlayer(playerId, { type: 'blackjack_error', error: 'Failed to deduct bet' });
            }
            break;
        }

        case 'blackjack_update': {
            // Update or start PvE blackjack game state for spectators
            const { playerHand, dealerHand, playerScore, dealerScore, phase } = message;
            const activity = activePveActivities.get(playerId);
            
            if (activity && activity.activity === 'blackjack') {
                // Update existing activity
                updatePveActivity(playerId, {
                    playerHand: playerHand || activity.state.playerHand,
                    dealerHand: dealerHand || activity.state.dealerHand,
                    playerScore: playerScore ?? activity.state.playerScore,
                    dealerScore: dealerScore ?? activity.state.dealerScore,
                    phase: phase || activity.state.phase
                });
            } else if (playerHand && playerHand.length > 0) {
                // Start PvE activity when we have actual cards (first update after dealing)
                startPveActivity(playerId, 'blackjack', player.room, {
                    bet: player.blackjackBet || 0,
                    playerHand: playerHand,
                    dealerHand: dealerHand || [],
                    playerScore: playerScore || 0,
                    dealerScore: dealerScore || 0,
                    phase: phase || 'playing'
                });
            }
            break;
        }
        
        case 'blackjack_payout': {
            // Simple PvE blackjack payout - add coins and end PvE activity
            const { amount, result, playerScore, dealerScore, playerHand, dealerHand } = message;
            
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'blackjack_error',
                    error: 'Must be authenticated for payouts'
                });
                break;
            }
            
            // Validate payout amount (max win is 2.5x bet of 5000 = 12500)
            const validatedAmount = Math.min(Math.max(0, amount || 0), 12500);
            
            const playerWon = result === 'WIN' || result === 'BLACKJACK';
            
            if (validatedAmount > 0) {
                try {
                    await userService.updateCoins(player.walletAddress, validatedAmount);
                    const newBalance = await userService.getUserCoins(player.walletAddress);
                    
                    console.log(`🎰 Blackjack payout to ${player.name}: ${validatedAmount} coins (${result})`);
                    
                    sendToPlayer(playerId, {
                        type: 'coins_update',
                        coins: newBalance,
                        isAuthenticated: true
                    });
                    
                } catch (e) {
                    console.error('Blackjack payout error:', e);
                    sendToPlayer(playerId, {
                        type: 'blackjack_error',
                        error: 'Payout failed'
                    });
                }
            } else {
                // No payout but still update balance for push/loss
                const newBalance = await userService.getUserCoins(player.walletAddress);
                sendToPlayer(playerId, {
                    type: 'coins_update',
                    coins: newBalance,
                    isAuthenticated: true
                });
            }
            
            // End PvE activity with final state
            const activity = activePveActivities.get(playerId);
            if (activity && activity.activity === 'blackjack') {
                endPveActivity(playerId, {
                    result: result,
                    playerScore: playerScore || 0,
                    dealerScore: dealerScore || 0,
                    playerHand: playerHand || activity.state.playerHand,
                    dealerHand: dealerHand || activity.state.dealerHand,
                    payout: validatedAmount,
                    bet: player.blackjackBet || 0,
                    won: playerWon
                });
            }
            
            // Record blackjack stats
            try {
                const user = await userService.getUser(player.walletAddress);
                if (user && user.recordBlackjackResult) {
                    user.recordBlackjackResult({
                        result: result,
                        isPvE: true,
                        coinsDelta: playerWon ? validatedAmount : (player.blackjackBet || 0),
                        gotBlackjack: result === 'BLACKJACK',
                        busted: playerScore > 21
                    });
                    await user.save();
                    console.log(`🎰 Recorded blackjack stats for ${player.name}: ${result}`);
                }
            } catch (statErr) {
                console.error('Failed to record blackjack stats:', statErr);
            }
            
            delete player.blackjackBet;
            
            break;
        }
        
        // ==================== GACHA (Cosmetic Slot Machine) ====================
        case 'gacha_roll': {
            // Player wants to roll for a cosmetic item
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'gacha_error',
                    error: 'NOT_AUTHENTICATED',
                    message: 'Must be authenticated to roll gacha'
                });
                break;
            }
            
            try {
                const result = await gachaService.roll(
                    player.walletAddress,
                    'OG Collection',
                    player.name
                );
                
                if (result.success) {
                    // Send successful roll result
                    sendToPlayer(playerId, {
                        type: 'gacha_result',
                        ...result
                    });
                    
                    // Send updated pebble balance
                    const user = await userService.getUser(player.walletAddress);
                    if (user) {
                        sendToPlayer(playerId, {
                            type: 'pebbles_update',
                            pebbles: user.pebbles
                        });
                    }
                } else {
                    sendToPlayer(playerId, {
                        type: 'gacha_error',
                        error: result.error,
                        message: result.message || 'Roll failed',
                        pebbleBalance: result.pebbleBalance,
                        required: result.required
                    });
                }
            } catch (error) {
                console.error('🎰 Gacha roll error:', error);
                sendToPlayer(playerId, {
                    type: 'gacha_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to process gacha roll'
                });
            }
            break;
        }
        
        case 'gacha_info': {
            // Get gacha drop rates and pricing info
            try {
                const rates = GachaService.getRates();
                sendToPlayer(playerId, {
                    type: 'gacha_info',
                    rates
                });
            } catch (error) {
                console.error('🎰 Gacha info error:', error);
            }
            break;
        }
        
        case 'gacha_can_roll': {
            // Check if player can afford a roll
            if (!player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'gacha_can_roll',
                    canRoll: false,
                    balance: 0,
                    required: ROLL_PRICE_PEBBLES
                });
                break;
            }
            
            try {
                const result = await gachaService.canRoll(player.walletAddress);
                sendToPlayer(playerId, {
                    type: 'gacha_can_roll',
                    ...result
                });
            } catch (error) {
                console.error('🎰 Gacha can_roll error:', error);
            }
            break;
        }
        
        case 'gacha_owned': {
            // Get player's owned cosmetics
            if (!player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'gacha_owned',
                    cosmetics: []
                });
                break;
            }
            
            try {
                const cosmetics = await gachaService.getOwnedCosmetics(player.walletAddress);
                sendToPlayer(playerId, {
                    type: 'gacha_owned',
                    cosmetics
                });
            } catch (error) {
                console.error('🎰 Gacha owned error:', error);
                sendToPlayer(playerId, {
                    type: 'gacha_owned',
                    cosmetics: [],
                    error: 'Failed to fetch cosmetics'
                });
            }
            break;
        }
        
        case 'gacha_history': {
            // Get player's roll history
            if (!player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'gacha_history',
                    rolls: []
                });
                break;
            }
            
            try {
                const limit = Math.min(message.limit || 50, 100);
                const rolls = await gachaService.getRollHistory(player.walletAddress, limit);
                sendToPlayer(playerId, {
                    type: 'gacha_history',
                    rolls
                });
            } catch (error) {
                console.error('🎰 Gacha history error:', error);
            }
            break;
        }
        
        // ==================== PEBBLES (Premium Currency) ====================
        case 'pebbles_deposit': {
            // Player deposited SOL and wants Pebbles
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'pebbles_error',
                    error: 'NOT_AUTHENTICATED',
                    message: 'Must be authenticated to deposit'
                });
                break;
            }
            
            // Client sends either amountSol (preferred) or amountLamports
            const { txSignature, amountSol, amountLamports } = message;
            
            if (!txSignature || (!amountSol && !amountLamports)) {
                sendToPlayer(playerId, {
                    type: 'pebbles_error',
                    error: 'INVALID_REQUEST',
                    message: 'Missing transaction signature or amount'
                });
                break;
            }
            
            // Convert to SOL if lamports provided
            const solAmount = amountSol || (Number(amountLamports) / 1_000_000_000);
            
            try {
                const result = await pebbleService.depositPebbles(
                    player.walletAddress,
                    txSignature,
                    solAmount,
                    playerId
                );
                
                if (result.success) {
                    sendToPlayer(playerId, {
                        type: 'pebbles_deposited',
                        pebbles: result.newBalance,
                        pebblesAwarded: result.pebblesReceived,
                        solDeposited: result.solAmount
                    });
                } else {
                    sendToPlayer(playerId, {
                        type: 'pebbles_error',
                        error: result.error,
                        message: result.message || 'Deposit failed'
                    });
                }
            } catch (error) {
                console.error('🪨 Pebble deposit error:', error);
                sendToPlayer(playerId, {
                    type: 'pebbles_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to process deposit'
                });
            }
            break;
        }
        
        case 'pebbles_deposit_waddle': {
            // Player deposited $WADDLE and wants Pebbles (at 1.5x premium rate)
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'pebbles_error',
                    error: 'NOT_AUTHENTICATED',
                    message: 'Must be authenticated to deposit'
                });
                break;
            }
            
            const { txSignature, waddleAmount } = message;
            
            if (!txSignature || !waddleAmount) {
                sendToPlayer(playerId, {
                    type: 'pebbles_error',
                    error: 'INVALID_REQUEST',
                    message: 'Missing transaction signature or $WADDLE amount'
                });
                break;
            }
            
            try {
                const result = await pebbleService.depositPebblesWithWaddle(
                    player.walletAddress,
                    txSignature,
                    waddleAmount,
                    playerId
                );
                
                if (result.success) {
                    sendToPlayer(playerId, {
                        type: 'pebbles_deposited',
                        pebbles: result.newBalance,
                        pebblesAwarded: result.pebblesReceived,
                        waddleDeposited: result.waddleAmount,
                        paymentMethod: 'WADDLE'
                    });
                } else {
                    sendToPlayer(playerId, {
                        type: 'pebbles_error',
                        error: result.error,
                        message: result.message || 'Deposit failed'
                    });
                }
            } catch (error) {
                console.error('🪨 Pebble $WADDLE deposit error:', error);
                sendToPlayer(playerId, {
                    type: 'pebbles_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to process $WADDLE deposit'
                });
            }
            break;
        }
        
        case 'pebbles_withdraw': {
            // Player wants to withdraw Pebbles to SOL
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'pebbles_error',
                    error: 'NOT_AUTHENTICATED',
                    message: 'Must be authenticated to withdraw'
                });
                break;
            }
            
            const { pebbleAmount } = message;
            
            if (!pebbleAmount || pebbleAmount <= 0) {
                sendToPlayer(playerId, {
                    type: 'pebbles_error',
                    error: 'INVALID_AMOUNT',
                    message: 'Invalid withdrawal amount'
                });
                break;
            }
            
            try {
                const result = await pebbleService.withdrawPebbles(
                    player.walletAddress,
                    pebbleAmount,
                    playerId
                );
                
                if (result.success) {
                    // Fetch updated withdrawal history to include in response
                    const withdrawals = await pebbleService.getUserWithdrawals(player.walletAddress);
                    
                    // Could be instant (completed) or queued (pending)
                    if (result.status === 'completed') {
                        sendToPlayer(playerId, {
                            type: 'pebbles_withdrawn',
                            status: 'completed',
                            pebbles: result.newBalance,
                            pebbleAmount: result.pebbleAmount,
                            rakeAmount: result.rakeAmount,
                            solReceived: result.solReceived,
                            txSignature: result.txSignature,
                            withdrawals // Include updated history
                        });
                    } else if (result.status === 'queued') {
                        sendToPlayer(playerId, {
                            type: 'pebbles_withdrawn',
                            status: 'queued',
                            pebbles: result.newBalance,
                            pebbleAmount: result.pebbleAmount,
                            rakeAmount: result.rakeAmount,
                            solToReceive: result.solToReceive,
                            withdrawalId: result.withdrawalId,
                            queuePosition: result.queuePosition,
                            message: result.message,
                            withdrawals // Include updated history
                        });
                    }
                } else {
                    sendToPlayer(playerId, {
                        type: 'pebbles_error',
                        error: result.error,
                        message: result.message || 'Withdrawal failed'
                    });
                }
            } catch (error) {
                console.error('🪨 Pebble withdrawal error:', error);
                sendToPlayer(playerId, {
                    type: 'pebbles_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to process withdrawal'
                });
            }
            break;
        }
        
        case 'pebbles_cancel_withdrawal': {
            // Cancel a pending withdrawal and refund pebbles
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'pebbles_error',
                    error: 'NOT_AUTHENTICATED',
                    message: 'Must be authenticated'
                });
                break;
            }
            
            const { withdrawalId } = message;
            if (!withdrawalId) {
                sendToPlayer(playerId, {
                    type: 'pebbles_error',
                    error: 'MISSING_ID',
                    message: 'Withdrawal ID required'
                });
                break;
            }
            
            try {
                const result = await pebbleService.cancelWithdrawal(player.walletAddress, withdrawalId);
                
                if (result.success) {
                    // Fetch updated withdrawal history
                    const withdrawals = await pebbleService.getUserWithdrawals(player.walletAddress);
                    
                    sendToPlayer(playerId, {
                        type: 'pebbles_withdrawal_cancelled',
                        withdrawalId,
                        refundedPebbles: result.refundedPebbles,
                        pebbles: result.newBalance,
                        withdrawals // Include updated history
                    });
                } else {
                    sendToPlayer(playerId, {
                        type: 'pebbles_error',
                        error: result.error,
                        message: result.message
                    });
                }
            } catch (error) {
                console.error('🪨 Cancel withdrawal error:', error);
                sendToPlayer(playerId, {
                    type: 'pebbles_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to cancel withdrawal'
                });
            }
            break;
        }
        
        case 'pebbles_withdrawals': {
            // Get user's withdrawal history
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'pebbles_withdrawals',
                    withdrawals: []
                });
                break;
            }
            
            try {
                const withdrawals = await pebbleService.getUserWithdrawals(player.walletAddress);
                sendToPlayer(playerId, {
                    type: 'pebbles_withdrawals',
                    withdrawals
                });
            } catch (error) {
                console.error('🪨 Get withdrawals error:', error);
                sendToPlayer(playerId, {
                    type: 'pebbles_withdrawals',
                    withdrawals: [],
                    error: 'Failed to fetch history'
                });
            }
            break;
        }
        
        case 'pebbles_balance': {
            // Get current pebble balance
            if (!player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'pebbles_balance',
                    pebbles: 0
                });
                break;
            }
            
            try {
                const user = await userService.getUser(player.walletAddress);
                sendToPlayer(playerId, {
                    type: 'pebbles_balance',
                    pebbles: user?.pebbles || 0,
                    stats: user?.pebbleStats || null
                });
            } catch (error) {
                console.error('🪨 Pebble balance error:', error);
            }
            break;
        }
        
        case 'pebbles_info': {
            // Get pebble exchange rates and limits
            sendToPlayer(playerId, {
                type: 'pebbles_info',
                info: PebbleService.getExchangeInfo()
            });
            break;
        }
        
        // ==================== INVENTORY (Cosmetic Management) ====================
        case 'inventory_get': {
            // Get user's full inventory with pagination and filters
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'inventory_data',
                    items: [],
                    total: 0,
                    maxSlots: 150
                });
                break;
            }
            
            const { page = 1, limit = 50, category, rarity, sortBy } = message;
            
            try {
                const inventory = await OwnedCosmetic.getFullInventory(player.walletAddress, {
                    page,
                    limit: Math.min(limit, 100), // Cap at 100 per page
                    category,
                    rarity,
                    sortBy
                });
                
                const user = await userService.getUser(player.walletAddress);
                
                sendToPlayer(playerId, {
                    type: 'inventory_data',
                    items: inventory.items,
                    total: inventory.total,
                    page: inventory.page,
                    hasMore: inventory.hasMore,
                    maxSlots: user?.maxInventorySlots || 150,
                    upgradeInfo: user?.getInventoryUpgradeInfo() || null
                });
            } catch (error) {
                console.error('📦 Inventory get error:', error);
                sendToPlayer(playerId, {
                    type: 'inventory_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to fetch inventory'
                });
            }
            break;
        }
        
        case 'inventory_stats': {
            // Get inventory statistics
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, { type: 'inventory_stats', stats: null });
                break;
            }
            
            try {
                const stats = await OwnedCosmetic.getInventoryStats(player.walletAddress);
                const user = await userService.getUser(player.walletAddress);
                
                sendToPlayer(playerId, {
                    type: 'inventory_stats',
                    stats,
                    currentSlots: stats.totalItems,
                    maxSlots: user?.maxInventorySlots || 150,
                    upgradeInfo: user?.getInventoryUpgradeInfo() || null
                });
            } catch (error) {
                console.error('📦 Inventory stats error:', error);
            }
            break;
        }
        
        case 'inventory_burn': {
            // Burn a cosmetic for gold
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'inventory_error',
                    error: 'NOT_AUTHENTICATED',
                    message: 'Must be authenticated to burn items'
                });
                break;
            }
            
            const { instanceId } = message;
            
            if (!instanceId) {
                sendToPlayer(playerId, {
                    type: 'inventory_error',
                    error: 'MISSING_INSTANCE_ID',
                    message: 'Item instance ID required'
                });
                break;
            }
            
            try {
                // Check if item is currently listed on marketplace
                const isListed = await MarketListing.isItemListed(instanceId);
                if (isListed) {
                    sendToPlayer(playerId, {
                        type: 'inventory_error',
                        error: 'ITEM_LISTED',
                        message: 'Cannot burn an item that is listed for sale. Cancel the listing first.'
                    });
                    break;
                }
                
                const result = await OwnedCosmetic.burnForGold(instanceId, player.walletAddress);
                
                if (result.success) {
                    // Award gold to user
                    const goldResult = await userService.addCoins(
                        player.walletAddress,
                        result.goldAwarded,
                        'cosmetic_burn',
                        { 
                            instanceId,
                            templateId: result.item.templateId,
                            name: result.item.name,
                            rarity: result.item.rarity,
                            quality: result.item.quality,
                            isHolographic: result.item.isHolographic,
                            isFirstEdition: result.item.isFirstEdition,
                            serialNumber: result.item.serialNumber
                        },
                        `Burned ${result.item.name} #${result.item.serialNumber} for gold`
                    );
                    
                    // Log transaction
                    await Transaction.record({
                        type: 'cosmetic_burn',
                        toWallet: player.walletAddress,
                        amount: result.goldAwarded,
                        currency: 'coins',
                        relatedData: {
                            cosmeticInstanceId: instanceId,
                            cosmeticTemplateId: result.item.templateId
                        },
                        reason: `Burned ${result.item.quality}${result.item.isHolographic ? ' Holo' : ''} ${result.item.name}${result.item.isFirstEdition ? ' (FE)' : ''} #${result.item.serialNumber}`
                    });
                    
                    // Get updated inventory count
                    const user = await userService.getUser(player.walletAddress);
                    const inventoryCount = await user.getInventoryCount();
                    
                    sendToPlayer(playerId, {
                        type: 'inventory_burned',
                        success: true,
                        goldAwarded: result.goldAwarded,
                        newCoins: goldResult.newBalance,
                        burnedItem: result.item,
                        inventoryCount,
                        maxSlots: user?.maxInventorySlots || 150
                    });
                    
                    // Update coins in HUD
                    sendToPlayer(playerId, {
                        type: 'coins_update',
                        coins: goldResult.newBalance,
                        isAuthenticated: true
                    });
                } else {
                    sendToPlayer(playerId, {
                        type: 'inventory_error',
                        error: result.error,
                        message: result.message || 'Failed to burn item'
                    });
                }
            } catch (error) {
                console.error('📦 Inventory burn error:', error);
                sendToPlayer(playerId, {
                    type: 'inventory_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to burn item'
                });
            }
            break;
        }
        
        case 'inventory_upgrade': {
            // Upgrade inventory slots (costs SOL, paid to rake wallet)
            const INVENTORY_UPGRADE_SOL = 1; // 1 SOL per upgrade
            const INVENTORY_UPGRADE_SLOTS = 200; // +200 slots per upgrade
            
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'inventory_error',
                    error: 'NOT_AUTHENTICATED',
                    message: 'Must be authenticated to upgrade'
                });
                break;
            }
            
            const { txSignature, solAmount } = data;
            
            if (!txSignature) {
                sendToPlayer(playerId, {
                    type: 'inventory_error',
                    error: 'MISSING_TX',
                    message: 'Transaction signature required'
                });
                break;
            }
            
            if (solAmount !== INVENTORY_UPGRADE_SOL) {
                sendToPlayer(playerId, {
                    type: 'inventory_error',
                    error: 'INVALID_AMOUNT',
                    message: `Expected ${INVENTORY_UPGRADE_SOL} SOL, got ${solAmount}`
                });
                break;
            }
            
            try {
                // Verify the transaction on-chain (same pattern as pebble deposits)
                const txStatus = await solanaPaymentService.connection.getSignatureStatus(txSignature, { searchTransactionHistory: true });
                
                if (!txStatus || !txStatus.value) {
                    sendToPlayer(playerId, {
                        type: 'inventory_error',
                        error: 'TX_NOT_FOUND',
                        message: 'Transaction not found on-chain'
                    });
                    break;
                }
                
                if (txStatus.value.err) {
                    sendToPlayer(playerId, {
                        type: 'inventory_error',
                        error: 'TX_FAILED',
                        message: 'Transaction failed on-chain'
                    });
                    break;
                }
                
                if (txStatus.value.confirmationStatus !== 'confirmed' && txStatus.value.confirmationStatus !== 'finalized') {
                    sendToPlayer(playerId, {
                        type: 'inventory_error',
                        error: 'TX_PENDING',
                        message: 'Transaction still pending. Please wait and try again.'
                    });
                    break;
                }
                
                // Transaction verified! Apply the upgrade
                const user = await userService.getUser(player.walletAddress);
                if (!user) {
                    sendToPlayer(playerId, {
                        type: 'inventory_error',
                        error: 'USER_NOT_FOUND'
                    });
                    break;
                }
                
                // Calculate new slots
                const oldSlots = user.maxInventorySlots || 150;
                const newSlots = oldSlots + INVENTORY_UPGRADE_SLOTS;
                const upgradeLevel = Math.floor((newSlots - 150) / INVENTORY_UPGRADE_SLOTS);
                
                // Apply upgrade
                user.maxInventorySlots = newSlots;
                user.inventoryUpgrades = upgradeLevel;
                await user.save();
                
                // Log transaction
                await Transaction.record({
                    type: 'inventory_upgrade',
                    fromWallet: player.walletAddress,
                    amount: INVENTORY_UPGRADE_SOL,
                    currency: 'SOL',
                    relatedData: {
                        txSignature,
                        oldSlots,
                        newSlots,
                        upgradeLevel
                    },
                    reason: `Upgraded inventory to ${newSlots} slots (${INVENTORY_UPGRADE_SOL} SOL)`
                });
                
                console.log(`📦 ${player.name} upgraded inventory: ${oldSlots} → ${newSlots} slots (tx: ${txSignature.slice(0, 16)}...)`);
                
                sendToPlayer(playerId, {
                    type: 'inventory_upgraded',
                    success: true,
                    newMaxSlots: newSlots,
                    upgradeLevel,
                    solSpent: INVENTORY_UPGRADE_SOL,
                    txSignature
                });
                
            } catch (error) {
                console.error('📦 Inventory upgrade error:', error);
                sendToPlayer(playerId, {
                    type: 'inventory_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to upgrade inventory'
                });
            }
            break;
        }
        
        case 'inventory_bulk_burn': {
            // Burn multiple items at once
            if (!player.isAuthenticated || !player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'inventory_error',
                    error: 'NOT_AUTHENTICATED'
                });
                break;
            }
            
            const { instanceIds } = message;
            
            if (!instanceIds || !Array.isArray(instanceIds) || instanceIds.length === 0) {
                sendToPlayer(playerId, {
                    type: 'inventory_error',
                    error: 'INVALID_REQUEST',
                    message: 'No items specified'
                });
                break;
            }
            
            // Limit bulk burn to 50 items at once
            const idsToProcess = instanceIds.slice(0, 50);
            
            try {
                // First, filter out any items that are currently listed
                const listedItems = await MarketListing.find({
                    itemInstanceId: { $in: idsToProcess },
                    status: 'active'
                }).select('itemInstanceId').lean();
                const listedIds = new Set(listedItems.map(l => l.itemInstanceId));
                
                // Remove listed items from burn list
                const safeIds = idsToProcess.filter(id => !listedIds.has(id));
                
                if (safeIds.length === 0 && listedIds.size > 0) {
                    sendToPlayer(playerId, {
                        type: 'inventory_error',
                        error: 'ALL_ITEMS_LISTED',
                        message: 'Cannot burn items that are listed for sale'
                    });
                    break;
                }
                
                let totalGold = 0;
                const burnedItems = [];
                
                for (const instanceId of safeIds) {
                    const result = await OwnedCosmetic.burnForGold(instanceId, player.walletAddress);
                    if (result.success) {
                        totalGold += result.goldAwarded;
                        burnedItems.push(result.item);
                    }
                }
                
                if (totalGold > 0) {
                    // Award total gold
                    const goldResult = await userService.addCoins(
                        player.walletAddress,
                        totalGold,
                        'cosmetic_burn',
                        { count: burnedItems.length },
                        `Bulk burned ${burnedItems.length} items for gold`
                    );
                    
                    // Log transaction
                    await Transaction.record({
                        type: 'cosmetic_burn',
                        toWallet: player.walletAddress,
                        amount: totalGold,
                        currency: 'coins',
                        reason: `Bulk burned ${burnedItems.length} cosmetics`
                    });
                    
                    const user = await userService.getUser(player.walletAddress);
                    const inventoryCount = await user.getInventoryCount();
                    
                    sendToPlayer(playerId, {
                        type: 'inventory_bulk_burned',
                        success: true,
                        totalGold,
                        itemsBurned: burnedItems.length,
                        newCoins: goldResult.newBalance,
                        inventoryCount,
                        maxSlots: user?.maxInventorySlots || 150
                    });
                    
                    sendToPlayer(playerId, {
                        type: 'coins_update',
                        coins: goldResult.newBalance,
                        isAuthenticated: true
                    });
                } else {
                    sendToPlayer(playerId, {
                        type: 'inventory_error',
                        error: 'NO_ITEMS_BURNED',
                        message: 'No valid items to burn'
                    });
                }
            } catch (error) {
                console.error('📦 Bulk burn error:', error);
                sendToPlayer(playerId, {
                    type: 'inventory_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to burn items'
                });
            }
            break;
        }
        
        // ==================== MINIGAME REWARDS ====================
        case 'minigame_reward': {
            // Server-authoritative single-player minigame rewards
            if (!player.isAuthenticated || !player.walletAddress) {
                // Guests don't earn coins
                break;
            }
            
            const { gameId, won, coinsRequested } = message;
            
            // Validate reward amount (prevent exploits)
            const maxReward = 200; // Max coins from a single minigame
            const validatedCoins = Math.min(Math.max(0, coinsRequested || 0), maxReward);
            
            if (validatedCoins <= 0) break;
            
            // Award coins
            const result = await userService.addCoins(
                player.walletAddress,
                validatedCoins,
                'minigame_reward',
                { gameId },
                `${won ? 'Won' : 'Played'} ${gameId}`
            );
            
            if (result.success) {
                sendToPlayer(playerId, {
                    type: 'coins_update',
                    coins: result.newBalance,
                    isAuthenticated: true
                });
                
                // Update stats
                if (won) {
                    statsService.recordResult(player.walletAddress, gameId, true, 0);
                }
            }
            break;
        }
    }
}

// ==================== PERIODIC CLEANUP ====================
setInterval(async () => {
    for (const [playerId, player] of players) {
        // Skip bots (they don't have WebSockets)
        if (player.isBot) continue;
        
        // Skip players without WebSocket (safety check)
        if (!player.ws || player.ws.readyState !== 1) {
            console.log(`Cleaning up stale player: ${playerId}`);
            
            // Handle slot disconnect
            slotService.handleDisconnect(playerId);
            fishingService.handleDisconnect(playerId);
            
            // End any PvE activities
            if (activePveActivities.has(playerId)) {
                endPveActivity(playerId, { result: 'disconnected' });
            }
            
            const voidResult = await matchService.handleDisconnect(playerId);
            if (voidResult) {
                if (voidResult.player1Wallet) {
                    await userService.refundWager(voidResult.player1Wallet, voidResult.wagerAmount, voidResult.matchId, 'disconnect');
                }
                if (voidResult.player2Wallet) {
                    await userService.refundWager(voidResult.player2Wallet, voidResult.wagerAmount, voidResult.matchId, 'disconnect');
                }
                
                const otherId = playerId === voidResult.player1Id ? voidResult.player2Id : voidResult.player1Id;
                sendToPlayer(otherId, {
                    type: 'match_end',
                    matchId: voidResult.matchId,
                    result: {
                        winner: 'void',
                        winnerPlayerId: null,
                        coinsWon: 0,
                        reason: 'disconnect',
                        refunded: voidResult.wagerAmount
                    }
                });
            }
            
            // Handle challenge disconnect - cancel all pending challenges
            const challengeResult = await challengeService.handleDisconnect(playerId, player.walletAddress);
            if (challengeResult.affectedPlayers?.length > 0) {
                for (const affected of challengeResult.affectedPlayers) {
                    if (players.has(affected.playerId)) {
                        const messages = inboxService.getMessages(affected.playerId);
                        const outgoingChallenges = affected.walletAddress 
                            ? challengeService.getOutgoingChallengesFor(affected.playerId, affected.walletAddress)
                            : [];
                        
                        sendToPlayer(affected.playerId, {
                            type: 'inbox_update',
                            messages,
                            unreadCount: inboxService.getUnreadCount(affected.playerId),
                            outgoingChallenges
                        });
                        
                        sendToPlayer(affected.playerId, {
                            type: 'challenge_cancelled',
                            challengeId: affected.challengeId,
                            reason: affected.reason,
                            message: `Challenge cancelled: ${affected.otherName} disconnected`
                        });
                    }
                }
            }
            
            if (player.walletAddress) {
                await authService.logout(player.walletAddress);
            }
            
            if (player.ip) removeIPConnection(player.ip, playerId);
            
            if (player.room) {
                broadcastToRoom(player.room, { type: 'player_left', playerId });
                const room = rooms.get(player.room);
                if (room) room.delete(playerId);
            }
            
            players.delete(playerId);
            playerChatTimestamps.delete(playerId);
        }
    }
    
    inboxService.cleanupExpired();
}, 30000);

// WebSocket heartbeat - detect dead connections
// Mobile browsers may not respond to WebSocket-level pings during heavy rendering
// or when Phantom wallet popup is open. Be generous to avoid false disconnects.
// We also check if client has sent any message recently (fallback for mobile/wallet interactions)
const MOBILE_HEARTBEAT_TOLERANCE = 120000; // 120s (2 min) - allows for wallet popups and heavy rendering

setInterval(() => {
    const now = Date.now();
    
    for (const [playerId, player] of players) {
        // Skip bots - they don't have WebSocket connections
        if (player.isBot) continue;
        
        // Check WebSocket pong first
        if (player.isAlive === false) {
            // WebSocket pong wasn't received, but check message fallback for mobile
            const timeSinceLastMessage = now - (player.lastMessageTime || 0);
            
            if (timeSinceLastMessage < MOBILE_HEARTBEAT_TOLERANCE) {
                // Client has sent messages recently (JSON pings count) - keep alive
                // This helps mobile browsers that don't respond to WS pings during 3D rendering
                player.isAlive = true;
            } else {
                // No WebSocket pong AND no recent messages - connection is dead
                console.log(`[${ts()}] 💔 Heartbeat timeout for player ${playerId} (no pong, no messages for ${Math.round(timeSinceLastMessage/1000)}s)`);
                if (player.ws) {
                    player.ws.terminate();
                }
                continue;
            }
        }
        
        // Mark as not alive, will be set to true when pong received
        player.isAlive = false;
        
        // Send ping
        if (player.ws?.readyState === 1) {
            try {
                player.ws.ping();
            } catch (e) {
                // WebSocket error - will be cleaned up
            }
        }
    }
}, HEARTBEAT_INTERVAL);

// Log server stats periodically
setInterval(() => {
    const uniqueIPs = ipConnections.size;
    const authenticated = Array.from(players.values()).filter(p => p.isAuthenticated).length;
    console.log(`📊 Players: ${players.size} (${authenticated} auth) | IPs: ${uniqueIPs} | DB: ${isDBConnected() ? '✓' : '✗'} | Rooms: ${Array.from(rooms.entries()).map(([id, set]) => `${id}:${set.size}`).join(', ') || 'none'}`);
}, 60000);

// Process pending pebble withdrawals (every 30 seconds)
// This auto-fills queued withdrawals when the custodial wallet has funds
setInterval(async () => {
    if (!isDBConnected()) return;
    
    try {
        const result = await pebbleService.processWithdrawalQueue(3); // Process up to 3 at a time
        if (result.processed > 0) {
            console.log(`🪨 Withdrawal queue: processed ${result.processed}, failed ${result.failed}`);
        }
    } catch (error) {
        console.error('🪨 Withdrawal queue error:', error.message);
    }
}, 30000);

// Expire old marketplace listings (every 5 minutes)
setInterval(async () => {
    if (!isDBConnected()) return;
    
    try {
        const { default: marketplaceService } = await import('./services/MarketplaceService.js');
        const expiredCount = await marketplaceService.expireOldListings();
        if (expiredCount > 0) {
            console.log(`🏪 Expired ${expiredCount} old marketplace listings`);
            // Broadcast to all clients that listings may have changed
            broadcastToAll({ type: 'market_listings_updated' });
        }
    } catch (error) {
        console.error('🏪 Listing expiration error:', error.message);
    }
}, 5 * 60 * 1000); // 5 minutes

// ==================== STARTUP ====================
async function start() {
    console.log(`🐧 Club Pengu Server starting...`);
    
    // Connect to MongoDB
    const dbConnected = await connectDB();
    if (dbConnected) {
        console.log('✅ Database connected');
        
        // Initialize igloo database records
        await IglooService.initializeIgloos();
        
        // Start rent scheduler (checks for overdue rentals)
        rentScheduler.start();
    } else {
        console.log('⚠️ Running without database - guest mode only');
    }
    
    // Initialize wager settlement service (includes custodial wallet)
    const settlementInit = await wagerSettlementService.initialize();
    if (settlementInit.success) {
        console.log('💰 Wager settlement service ready');
        console.log(`   Custodial wallet: ${wagerSettlementService.getCustodialWalletAddress()?.slice(0, 4)}...`);
        
        // Inject custodial wallet service into challenge service for expired challenge refunds
        challengeService.setCustodialWalletService(wagerSettlementService.getCustodialWalletService());
        console.log('   Challenge refunds enabled');
        
        // Recover orphaned matches from previous server crash (if any)
        if (isDBConnected()) {
            const recoveryResult = await wagerSettlementService.recoverOrphanedMatches();
            if (recoveryResult.total > 0) {
                console.log(`🔄 Orphan recovery: ${recoveryResult.recovered}/${recoveryResult.total} matches recovered`);
            }
        }
    } else {
        console.warn('⚠️ Wager settlement service not available:', settlementInit.error);
        console.warn('   Token wagers will require manual settlement');
    }
    
    // Start HTTP server
    server.listen(PORT, () => {
        console.log(`🌐 Server listening on port ${PORT}${IS_DEV ? ' (DEV MODE)' : ''}`);
        console.log(`📡 WebSocket server ready`);
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    rentScheduler.stop();
    await statsService.shutdown();
    // Custodial wallet shutdown is handled by CustodialWalletService's own process listeners
    await disconnectDB();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Shutting down...');
    rentScheduler.stop();
    await statsService.shutdown();
    // Custodial wallet shutdown is handled by CustodialWalletService's own process listeners
    await disconnectDB();
    process.exit(0);
});

start();
