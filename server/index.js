/**
 * Club Penguin Multiplayer WebSocket Server
 * Handles real-time player sync, P2P challenges, and match coordination
 * With MongoDB persistence and Phantom wallet authentication
 */

import 'dotenv/config';
import { WebSocketServer } from 'ws';
import http from 'http';
import { connectDB, isDBConnected, disconnectDB } from './db/connection.js';
import { User } from './db/models/index.js';
import { 
    StatsService, 
    InboxService, 
    ChallengeService, 
    MatchService,
    AuthService,
    UserService,
    PromoCodeService,
    SlotService,
    FishingService
} from './services/index.js';

const PORT = process.env.PORT || 3001;
const MAX_CONNECTIONS_PER_IP = 2;
const HEARTBEAT_INTERVAL = 30000;
const IS_DEV = process.env.NODE_ENV !== 'production';

// Timestamp helper for debugging
const ts = () => new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm

// ==================== GAME STATE ====================
const players = new Map(); // playerId -> { id, name, room, position, rotation, appearance, puffle, ip, walletAddress, isAuthenticated, ... }
const rooms = new Map(); // roomId -> Set of playerIds
const ipConnections = new Map(); // ip -> Set of playerIds

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

sendToPlayer = (playerId, message) => {
    const player = players.get(playerId);
    if (player?.ws?.readyState === 1) {
        player.ws.send(JSON.stringify(message));
    }
};

// Initialize services that need broadcast functions
const challengeService = new ChallengeService(inboxService, statsService);
const matchService = new MatchService(statsService, userService, broadcastToRoom, sendToPlayer);
const slotService = new SlotService(userService, broadcastToRoom, sendToPlayer);
const fishingService = new FishingService(userService, broadcastToRoom, sendToPlayer);

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

async function handleMatchPayout(match, winnerId, isDraw = false) {
    const totalPot = match.wagerAmount * 2;
    
    if (isDraw) {
        // Refund both players
        if (match.player1.wallet) {
            await userService.refundWager(match.player1.wallet, match.wagerAmount, match.id, 'draw');
        }
        if (match.player2.wallet) {
            await userService.refundWager(match.player2.wallet, match.wagerAmount, match.id, 'draw');
        }
        return { refunded: match.wagerAmount };
    }
    
    // Pay winner
    const winnerWallet = winnerId === match.player1.id ? match.player1.wallet : match.player2.wallet;
    const loserWallet = winnerId === match.player1.id ? match.player2.wallet : match.player1.wallet;
    
    if (winnerWallet && match.wagerAmount > 0) {
        await userService.payoutWager(winnerWallet, loserWallet, totalPot, match.id);
    }
    
    // Record stats
    const gameType = match.gameType === 'tic_tac_toe' ? 'ticTacToe' : 
                     match.gameType === 'connect4' ? 'connect4' : 'cardJitsu';
    
    if (match.player1.wallet) {
        await statsService.recordResult(
            match.player1.wallet, 
            gameType, 
            winnerId === match.player1.id, 
            match.wagerAmount
        );
    }
    if (match.player2.wallet) {
        await statsService.recordResult(
            match.player2.wallet, 
            gameType, 
            winnerId === match.player2.id, 
            match.wagerAmount
        );
    }
    
    return { coinsWon: totalPot };
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
        connectedAt: Date.now()
    });
    
    // Handle WebSocket pong (heartbeat response)
    ws.on('pong', () => {
        const player = players.get(playerId);
        if (player) player.isAlive = true;
    });
    
    // Auto-disconnect if player doesn't join a room within 30 seconds
    // This cleans up stale HMR connections
    const roomJoinTimeout = setTimeout(() => {
        const player = players.get(playerId);
        if (player && !player.room) {
            console.log(`[${ts()}] Auto-disconnecting idle player: ${playerId} (no room join)`);
            ws.close(1000, 'Idle timeout');
        }
    }, 30000);
    
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
                
                // Send restored session response
                sendToPlayer(playerId, {
                    type: 'auth_success',
                    token,
                    user: user.getFullData(),
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
                    
                    // Only save customization if it actually changed
                    if (message.appearance) {
                        const currentCustom = user.customization || {};
                        const newCustom = message.appearance;
                        const hasChanges = 
                            currentCustom.skin !== newCustom.skin ||
                            currentCustom.hat !== newCustom.hat ||
                            currentCustom.eyes !== newCustom.eyes ||
                            currentCustom.mouth !== newCustom.mouth ||
                            currentCustom.bodyItem !== newCustom.bodyItem ||
                            currentCustom.mount !== newCustom.mount;
                        
                        if (hasChanges) {
                            user.updateCustomization(message.appearance);
                            needsSave = true;
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
                    userData = updatedUser.getFullData();
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
            
            // Send active matches in room
            const activeMatches = matchService.getMatchesInRoom(roomId);
            if (activeMatches.length > 0) {
                sendToPlayer(playerId, { type: 'active_matches', matches: activeMatches });
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
                
                const matchesInNewRoom = matchService.getMatchesInRoom(newRoom);
                if (matchesInNewRoom.length > 0) {
                    sendToPlayer(playerId, { type: 'active_matches', matches: matchesInNewRoom });
                } else {
                    sendToPlayer(playerId, { type: 'active_matches', matches: [] });
                }
            }
            break;
        }
        
        case 'update_appearance': {
            player.appearance = message.appearance || player.appearance;
            
            // If authenticated, validate and save to DB
            if (player.walletAddress) {
                const result = await userService.updateProfile(player.walletAddress, {
                    customization: player.appearance
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
            sendToPlayer(playerId, {
                type: 'inbox_update',
                messages,
                unreadCount: inboxService.getUnreadCount(playerId)
            });
            break;
        }
        
        case 'inbox_read': {
            inboxService.markRead(playerId, message.messageId);
            break;
        }
        
        case 'inbox_delete': {
            inboxService.deleteMessage(playerId, message.messageId);
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
            
            // Validate wager requirements
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
                    walletAddress: targetPlayer.walletAddress 
                },
                message.gameType,
                message.wagerAmount
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
                    targetName: targetPlayer.name
                });
                
                sendToPlayer(message.targetPlayerId, {
                    type: 'challenge_received',
                    challenge: {
                        id: result.challenge.id,
                        challengerId: player.id,
                        challengerName: player.name,
                        challengerAppearance: player.appearance,
                        gameType: result.challenge.gameType,
                        wagerAmount: result.challenge.wagerAmount,
                        expiresAt: result.challenge.expiresAt,
                        createdAt: result.challenge.createdAt
                    }
                });
                
                sendToPlayer(message.targetPlayerId, {
                    type: 'inbox_update',
                    messages: inboxService.getMessages(message.targetPlayerId),
                    unreadCount: inboxService.getUnreadCount(message.targetPlayerId)
                });
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
                    
                    // Create match
                    const match = await matchService.createMatch(challenge, challenger, target);
                    
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
                            yourRole: 'player2'
                        },
                        initialState: matchService.getMatchState(match.id, challenge.targetId),
                        coins: p2Coins
                    };
                    
                    sendToPlayer(challenge.challengerId, matchStartMsg1);
                    sendToPlayer(challenge.targetId, matchStartMsg2);
                    
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
                            refunded: payoutResult.refunded
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
                            refunded: payoutResult.refunded
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
                            reason: 'win'
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
                            reason: 'win'
                        }
                    });
                }
                
                // Send final state to spectators
                let finalState;
                if (match.gameType === 'tic_tac_toe') {
                    finalState = { board: [...match.state.board], winner: match.state.winner, winningLine: match.state.winningLine };
                } else if (match.gameType === 'connect4') {
                    finalState = { board: [...match.state.board], winner: match.state.winner, winningCells: match.state.winningCells };
                } else {
                    finalState = { player1Wins: match.state.player1Wins, player2Wins: match.state.player2Wins, winner: match.state.winner };
                }
                
                broadcastToRoom(match.room, {
                    type: 'match_spectate_end',
                    matchId: match.id,
                    winnerId,
                    winnerName: winnerId ? (winnerId === match.player1.id ? match.player1.name : match.player2.name) : null,
                    isDraw,
                    finalState,
                    gameType: match.gameType
                }, match.player1.id, match.player2.id);
                
                // Send updated stats
                const stats1 = await statsService.getPublicStats(match.player1.wallet, true);
                const stats2 = await statsService.getPublicStats(match.player2.wallet, true);
                sendToPlayer(match.player1.id, { type: 'stats_update', stats: stats1 });
                sendToPlayer(match.player2.id, { type: 'stats_update', stats: stats2 });
                
                await matchService.endMatch(match.id);
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
            
            await matchService.voidMatch(match.id, 'forfeit');
            
            console.log(`🏳️ ${players.get(forfeiterId)?.name} forfeited to ${players.get(winnerId)?.name}`);
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
                user: user?.getFullData() || null,
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
                        user: updatedUser.getFullData(),
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
            // Player wants to spin a slot machine
            const { machineId, guestCoins, isDemo } = message;
            
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
                guestCoins || 0,
                isDemo || false // Demo mode for guests without coins
            );
            
            if (spinResult.error) {
                sendToPlayer(playerId, {
                    type: 'slot_error',
                    error: spinResult.error,
                    message: spinResult.message
                });
            } else {
                // Send spin started confirmation
                sendToPlayer(playerId, {
                    type: 'slot_spin_started',
                    machineId: spinResult.machineId,
                    newBalance: spinResult.newBalance,
                    spinCost: spinResult.spinCost
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
                
                // Send updated coins
                sendToPlayer(playerId, {
                    type: 'coins_update',
                    coins: spinResult.newBalance,
                    isAuthenticated: true
                });
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
                    } else if (result.newBalance !== undefined) {
                        // Update coin balance
                        sendToPlayer(playerId, {
                            type: 'coins_update',
                            coins: result.newBalance,
                            isAuthenticated: player.isAuthenticated
                        });
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
        if (player.ws.readyState !== 1) {
            console.log(`Cleaning up stale player: ${playerId}`);
            
            // Handle slot disconnect
            slotService.handleDisconnect(playerId);
            fishingService.handleDisconnect(playerId);
            
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

// WebSocket heartbeat - detect dead connections faster
setInterval(() => {
    for (const [playerId, player] of players) {
        if (player.isAlive === false) {
            // Connection didn't respond to last ping - terminate it
            console.log(`[${ts()}] 💔 Heartbeat timeout for player ${playerId}`);
            if (player.ws) {
                player.ws.terminate();
            }
            continue;
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

// ==================== STARTUP ====================
async function start() {
    console.log(`🐧 Club Penguin Server starting...`);
    
    // Connect to MongoDB
    const dbConnected = await connectDB();
    if (dbConnected) {
        console.log('✅ Database connected');
    } else {
        console.log('⚠️ Running without database - guest mode only');
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
    await statsService.shutdown();
    await disconnectDB();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await statsService.shutdown();
    await disconnectDB();
    process.exit(0);
});

start();
