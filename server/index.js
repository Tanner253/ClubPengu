/**
 * Club Penguin Multiplayer WebSocket Server
 * Handles real-time player sync, P2P challenges, and match coordination
 */

import { WebSocketServer } from 'ws';
import http from 'http';
import { StatsService, InboxService, ChallengeService, MatchService } from './services/index.js';

const PORT = process.env.PORT || 3001;
const MAX_CONNECTIONS_PER_IP = 2; // Maximum allowed connections per IP address
const HEARTBEAT_INTERVAL = 30000; // 30 seconds heartbeat check
const CONNECTION_TIMEOUT = 35000; // 35 seconds before considering connection dead
const IS_DEV = process.env.NODE_ENV !== 'production'; // Development mode flag

// Game state
const players = new Map(); // playerId -> { id, name, room, position, rotation, appearance, puffle, ip, coins, lastPing, isAlive }
const rooms = new Map(); // roomId -> Set of playerIds
const ipConnections = new Map(); // ip -> Set of playerIds (for tracking connections per IP)

// Beach ball state per igloo room
const beachBalls = new Map(); // roomId -> { x, z, vx, vz }

// Initialize beach balls for igloo rooms
beachBalls.set('igloo1', { x: 4.5, z: 3, vx: 0, vz: 0 });
beachBalls.set('igloo2', { x: 4.5, z: 3, vx: 0, vz: 0 });

// Player coins storage (playerId -> coins)
// In production, this would be in a database
const playerCoins = new Map();

// ==================== DAY/NIGHT CYCLE (Server-synchronized) ====================
// Time of day: 0-1 (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
let worldTime = 0.35; // Start at morning
const DAY_CYCLE_SPEED = 0.001; // Speed of day cycle (full day in ~16 minutes)
const TIME_BROADCAST_INTERVAL = 5000; // Broadcast time every 5 seconds

// Update world time
setInterval(() => {
    worldTime = (worldTime + DAY_CYCLE_SPEED) % 1;
}, 1000);

// Broadcast world time to all players
setInterval(() => {
    const timeMessage = JSON.stringify({
        type: 'world_time',
        time: worldTime
    });
    
    for (const [, player] of players) {
        if (player.ws && player.ws.readyState === 1) {
            player.ws.send(timeMessage);
        }
    }
}, TIME_BROADCAST_INTERVAL);

// Broadcast room counts to players in town (for igloo occupancy bubbles)
const ROOM_COUNTS_INTERVAL = 3000; // Every 3 seconds
setInterval(() => {
    // Build room counts object for igloo rooms
    const roomCounts = {};
    for (const [roomId, playerSet] of rooms) {
        if (roomId.startsWith('igloo')) {
            roomCounts[roomId] = playerSet.size;
        }
    }
    
    // Only broadcast if there are any igloo rooms with players OR if there are town players
    const townPlayers = rooms.get('town');
    if (!townPlayers || townPlayers.size === 0) return;
    
    const countsMessage = JSON.stringify({
        type: 'room_counts',
        counts: roomCounts
    });
    
    // Send to all players in town
    for (const playerId of townPlayers) {
        const player = players.get(playerId);
        if (player && player.ws && player.ws.readyState === 1) {
            player.ws.send(countsMessage);
        }
    }
}, ROOM_COUNTS_INTERVAL);

// Create HTTP server to access request headers for IP
const server = http.createServer();

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

console.log(`🐧 Club Penguin Server running on port ${PORT}${IS_DEV ? ' (DEV MODE - IP limits relaxed)' : ''}`);

// Helper to get client IP from request
function getClientIP(req) {
    // Check for forwarded IP (behind proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    // Check for real IP header
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }
    // Fall back to socket remote address
    return req.socket?.remoteAddress || 'unknown';
}

// Clean up stale/dead connections for an IP
function cleanupStaleConnections(ip) {
    const connections = ipConnections.get(ip);
    if (!connections) return;
    
    const stalePlayerIds = [];
    
    for (const playerId of connections) {
        const player = players.get(playerId);
        if (!player) {
            // Player entry doesn't exist, remove from tracking
            stalePlayerIds.push(playerId);
            continue;
        }
        
        // Check if WebSocket is still alive
        if (!player.ws || player.ws.readyState !== 1) {
            console.log(`🧹 Cleaning up stale connection: ${playerId}`);
            stalePlayerIds.push(playerId);
            
            // Clean up player data
            if (player.room) {
                const room = rooms.get(player.room);
                if (room) {
                    room.delete(playerId);
                    // Notify room
                    broadcastToRoom(player.room, {
                        type: 'player_left',
                        playerId: playerId
                    });
                }
            }
            players.delete(playerId);
        }
    }
    
    // Remove stale IDs from IP tracking
    for (const playerId of stalePlayerIds) {
        connections.delete(playerId);
    }
    
    if (connections.size === 0) {
        ipConnections.delete(ip);
    }
    
    if (stalePlayerIds.length > 0) {
        console.log(`🧹 Cleaned up ${stalePlayerIds.length} stale connection(s) for IP ${ip}`);
    }
}

// Check if IP can connect (returns true if allowed)
function canIPConnect(ip) {
    // In development mode, allow more connections for testing
    if (IS_DEV) {
        return true; // No IP limits in dev mode
    }
    
    // First, clean up any stale connections for this IP
    cleanupStaleConnections(ip);
    
    const connections = ipConnections.get(ip);
    if (!connections) return true;
    return connections.size < MAX_CONNECTIONS_PER_IP;
}

// Track IP connection
function trackIPConnection(ip, playerId) {
    if (!ipConnections.has(ip)) {
        ipConnections.set(ip, new Set());
    }
    ipConnections.get(ip).add(playerId);
}

// Remove IP connection tracking
function removeIPConnection(ip, playerId) {
    const connections = ipConnections.get(ip);
    if (connections) {
        connections.delete(playerId);
        if (connections.size === 0) {
            ipConnections.delete(ip);
        }
    }
}

// Generate unique player ID
function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

// Broadcast to all players in a room except specified players
function broadcastToRoom(roomId, message, ...excludeIds) {
    const roomPlayers = rooms.get(roomId);
    if (!roomPlayers) return;
    
    const data = JSON.stringify(message);
    const excludeSet = new Set(excludeIds.filter(Boolean));
    
    for (const playerId of roomPlayers) {
        if (excludeSet.has(playerId)) continue;
        
        const player = players.get(playerId);
        if (player && player.ws && player.ws.readyState === 1) {
            player.ws.send(data);
        }
    }
}

// Broadcast to ALL players in a room (including sender for confirmations)
function broadcastToRoomAll(roomId, message) {
    const roomPlayers = rooms.get(roomId);
    if (!roomPlayers) return;
    
    const data = JSON.stringify(message);
    
    for (const playerId of roomPlayers) {
        const player = players.get(playerId);
        if (player && player.ws && player.ws.readyState === 1) {
            player.ws.send(data);
        }
    }
}

// Send to specific player
function sendToPlayer(playerId, message) {
    const player = players.get(playerId);
    if (player && player.ws && player.ws.readyState === 1) {
        player.ws.send(JSON.stringify(message));
    }
}

// ==================== P2P CHALLENGE SERVICES ====================

// Initialize services
const statsService = new StatsService();
const inboxService = new InboxService();
const challengeService = new ChallengeService(inboxService, statsService);
const matchService = new MatchService(statsService, broadcastToRoom, sendToPlayer);

// Get player coins (with default)
function getPlayerCoins(playerId) {
    if (!playerCoins.has(playerId)) {
        playerCoins.set(playerId, 0); // New players start with 0 coins
    }
    return playerCoins.get(playerId);
}

// Set player coins
function setPlayerCoins(playerId, amount) {
    playerCoins.set(playerId, Math.max(0, amount));
    return playerCoins.get(playerId);
}

// Transfer coins between players
function transferCoins(fromPlayerId, toPlayerId, amount) {
    const fromCoins = getPlayerCoins(fromPlayerId);
    const toCoins = getPlayerCoins(toPlayerId);
    
    if (fromCoins < amount) {
        return { error: 'INSUFFICIENT_FUNDS' };
    }
    
    setPlayerCoins(fromPlayerId, fromCoins - amount);
    setPlayerCoins(toPlayerId, toCoins + amount);
    
    return {
        success: true,
        fromBalance: getPlayerCoins(fromPlayerId),
        toBalance: getPlayerCoins(toPlayerId)
    };
}

// Add player to room
function joinRoom(playerId, roomId) {
    // Remove from old room first
    const player = players.get(playerId);
    if (player && player.room) {
        const oldRoom = rooms.get(player.room);
        if (oldRoom) {
            oldRoom.delete(playerId);
            // Notify old room that player left
            broadcastToRoom(player.room, {
                type: 'player_left',
                playerId: playerId
            });
        }
    }
    
    // Add to new room
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(playerId);
    
    if (player) {
        player.room = roomId;
    }
}

// Get all players in a room (for sending current state to new players)
function getPlayersInRoom(roomId, excludeId = null) {
    const roomPlayers = rooms.get(roomId);
    if (!roomPlayers) return [];
    
    const result = [];
    for (const playerId of roomPlayers) {
        if (playerId === excludeId) continue;
        
        const player = players.get(playerId);
        if (player) {
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
                afkMessage: player.afkMessage || null
            });
        }
    }
    return result;
}

// Handle new connection
wss.on('connection', (ws, req) => {
    const clientIP = getClientIP(req);
    
    // Check if IP has too many connections
    if (!canIPConnect(clientIP)) {
        console.log(`⚠️ Rejected connection from ${clientIP} - too many connections`);
        ws.send(JSON.stringify({
            type: 'error',
            code: 'TOO_MANY_CONNECTIONS',
            message: 'Too many connections from your IP address. Please close other tabs.'
        }));
        ws.close(1008, 'Too many connections from this IP');
        return;
    }
    
    const playerId = generateId();
    console.log(`Player connected: ${playerId} from ${clientIP}`);
    
    // Track this IP connection
    trackIPConnection(clientIP, playerId);
    
    // Initialize player data
    players.set(playerId, {
        id: playerId,
        ws: ws,
        ip: clientIP,
        name: `Penguin${Math.floor(Math.random() * 1000)}`,
        room: null,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        appearance: {},
        puffle: null,
        emote: null
    });
    
    // Send player their ID
    ws.send(JSON.stringify({
        type: 'connected',
        playerId: playerId
    }));
    
    // Handle messages
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleMessage(playerId, message);
        } catch (e) {
            console.error('Invalid message:', e);
        }
    });
    
    // Handle disconnect
    ws.on('close', () => {
        console.log(`Player disconnected: ${playerId}`);
        
        const player = players.get(playerId);
        if (player) {
            // Handle match disconnect - void match and refund
            const voidResult = matchService.handleDisconnect(playerId);
            if (voidResult) {
                // Refund both players
                setPlayerCoins(voidResult.player1Id, getPlayerCoins(voidResult.player1Id) + voidResult.wagerAmount);
                setPlayerCoins(voidResult.player2Id, getPlayerCoins(voidResult.player2Id) + voidResult.wagerAmount);
                
                // Notify the other player
                const otherId = playerId === voidResult.player1Id ? voidResult.player2Id : voidResult.player1Id;
                sendToPlayer(otherId, {
                    type: 'match_end',
                    matchId: voidResult.matchId,
                    result: {
                        winner: 'void',
                        winnerPlayerId: null,
                        coinsWon: 0,
                        yourCoins: getPlayerCoins(otherId),
                        reason: 'disconnect',
                        refunded: voidResult.wagerAmount
                    }
                });
                
                // Notify spectators
                if (player.room) {
                    broadcastToRoom(player.room, {
                        type: 'match_spectate_end',
                        matchId: voidResult.matchId,
                        winnerId: null,
                        reason: 'disconnect'
                    }, playerId, otherId);
                }
                
                console.log(`💔 Match voided due to disconnect. Refunded ${voidResult.wagerAmount} coins to each player.`);
            }
            
            // Remove IP connection tracking
            if (player.ip) {
                removeIPConnection(player.ip, playerId);
            }
            
            if (player.room) {
                // Notify room
                broadcastToRoom(player.room, {
                    type: 'player_left',
                    playerId: playerId
                });
                
                // Remove from room
                const room = rooms.get(player.room);
                if (room) {
                    room.delete(playerId);
                }
            }
        }
        
        players.delete(playerId);
    });
    
    ws.on('error', (error) => {
        console.error(`WebSocket error for ${playerId}:`, error);
    });
});

// Message handler
function handleMessage(playerId, message) {
    const player = players.get(playerId);
    if (!player) return;
    
    switch (message.type) {
        case 'join': {
            // Player joining with their data
            player.name = message.name || player.name;
            player.appearance = message.appearance || {};
            player.puffle = message.puffle || null;
            
            // Sync coins from client (client has localStorage persistence)
            // Always trust the client's coins on join - client localStorage is source of truth
            // Server only modifies coins during matches (which then syncs back to client)
            if (message.coins !== undefined && message.coins >= 0) {
                playerCoins.set(playerId, message.coins);
                console.log(`💰 Synced ${player.name}'s coins from client: ${message.coins}`);
            }
            
            console.log(`Join request from ${player.name}:`, message.puffle ? `has ${message.puffle.color} puffle` : 'no puffle');
            
            const roomId = message.room || 'town';
            joinRoom(playerId, roomId);
            
            // Set initial position based on room
            if (roomId === 'town') {
                player.position = { x: 110, y: 0, z: 110 }; // Town center spawn (same as /spawn)
            } else if (roomId === 'dojo') {
                player.position = { x: 0, y: 0, z: 14 }; // Dojo entrance
            }
            
            // Initialize puffle position if player has a puffle
            if (player.puffle) {
                player.pufflePosition = {
                    x: player.position.x + 1.5,
                    y: 0,
                    z: player.position.z + 1.5
                };
            }
            
            // Send current players in room to the new player
            const existingPlayers = getPlayersInRoom(roomId, playerId);
            sendToPlayer(playerId, {
                type: 'room_state',
                room: roomId,
                players: existingPlayers,
                worldTime: worldTime // Sync day/night cycle
            });
            
            // Notify others in room about new player
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
                    emote: player.emote || null,
                    seatedOnFurniture: player.seatedOnFurniture || false,
                    isAfk: player.isAfk || false,
                    afkMessage: player.afkMessage || null
                }
            }, playerId);
            
            console.log(`${player.name} joined ${roomId} ${player.puffle ? '(with puffle)' : ''}`);
            break;
        }
        
        case 'move': {
            // Player position update - OPTIMIZED: only broadcast if actually changed
            // Now includes Y position for jump synchronization
            const posChanged = !player.position || 
                Math.abs(player.position.x - message.position.x) > 0.01 ||
                Math.abs(player.position.z - message.position.z) > 0.01 ||
                Math.abs((player.position.y || 0) - (message.position.y || 0)) > 0.05; // Y threshold for jumps
            const rotChanged = player.rotation === undefined ||
                Math.abs(player.rotation - message.rotation) > 0.01;
            
            player.position = message.position; // Now includes x, y, z
            player.rotation = message.rotation;
            
            // Store puffle position on player object (not inside puffle)
            if (message.pufflePosition) {
                player.pufflePosition = message.pufflePosition;
            }
            
            // Clear AFK status when player moves (only horizontal movement)
            const horizontalMove = !player.position || 
                Math.abs(player.position.x - (message.position?.x || 0)) > 0.01 ||
                Math.abs(player.position.z - (message.position?.z || 0)) > 0.01;
            if (horizontalMove && player.isAfk) {
                player.isAfk = false;
                player.afkMessage = null;
                if (player.room) {
                    broadcastToRoomAll(player.room, {
                        type: 'player_afk',
                        playerId: playerId,
                        isAfk: false
                    });
                }
                console.log(`${player.name} is no longer AFK (moved)`);
            }
            
            // Only broadcast if something actually changed
            if ((posChanged || rotChanged) && player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_moved',
                    playerId: playerId,
                    position: player.position, // Includes x, y, z
                    rotation: player.rotation,
                    pufflePosition: player.pufflePosition
                }, playerId);
            }
            break;
        }
        
        case 'chat': {
            // Chat message
            if (player.room && message.text) {
                const text = message.text.substring(0, 200); // Limit message length
                
                // Check for /afk command
                if (text.toLowerCase().startsWith('/afk')) {
                    const afkMessage = text.slice(4).trim() || 'AFK';
                    player.isAfk = true;
                    player.afkMessage = `💤 ${afkMessage}`;
                    
                    // Broadcast AFK status to room
                    broadcastToRoomAll(player.room, {
                        type: 'player_afk',
                        playerId: playerId,
                        name: player.name,
                        isAfk: true,
                        afkMessage: player.afkMessage
                    });
                    
                    console.log(`${player.name} is now AFK: ${afkMessage}`);
                } else {
                    // Regular chat message - clear AFK if was AFK
                    if (player.isAfk) {
                        player.isAfk = false;
                        player.afkMessage = null;
                        broadcastToRoomAll(player.room, {
                            type: 'player_afk',
                            playerId: playerId,
                            isAfk: false
                        });
                    }
                    
                    // Broadcast regular chat
                    broadcastToRoomAll(player.room, {
                        type: 'chat',
                        playerId: playerId,
                        name: player.name,
                        text: text,
                        timestamp: Date.now()
                    });
                }
            }
            break;
        }
        
        case 'whisper': {
            // Private message to another player by name
            if (!message.targetName || !message.text) break;
            
            const targetName = message.targetName.toLowerCase();
            const text = message.text.substring(0, 200);
            
            // Find player by name (case-insensitive)
            let targetPlayer = null;
            let targetId = null;
            for (const [pid, p] of players) {
                if (p.name && p.name.toLowerCase() === targetName) {
                    targetPlayer = p;
                    targetId = pid;
                    break;
                }
            }
            
            if (targetPlayer && targetPlayer.ws && targetPlayer.ws.readyState === 1) {
                // Send whisper to target
                targetPlayer.ws.send(JSON.stringify({
                    type: 'whisper',
                    fromId: playerId,
                    fromName: player.name,
                    text: text,
                    timestamp: Date.now()
                }));
                
                // Confirm to sender
                sendToPlayer(playerId, {
                    type: 'whisper_sent',
                    toName: targetPlayer.name,
                    text: text,
                    timestamp: Date.now()
                });
                
                console.log(`💬 Whisper: ${player.name} -> ${targetPlayer.name}: ${text.substring(0, 30)}...`);
            } else {
                // Player not found or offline
                sendToPlayer(playerId, {
                    type: 'whisper_error',
                    targetName: message.targetName,
                    error: 'Player not found or offline'
                });
            }
            break;
        }
        
        case 'emote': {
            // Emote triggered
            player.emote = message.emote;
            // Track if seated on furniture (bench/chair) vs ground sit emote
            player.seatedOnFurniture = message.seatedOnFurniture || false;
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_emote',
                    playerId: playerId,
                    emote: message.emote,
                    seatedOnFurniture: player.seatedOnFurniture
                }, playerId);
            }
            
            // Clear emote after duration (except Sit and Breakdance which are continuous)
            if (message.emote && message.emote !== 'Sit' && message.emote !== 'Breakdance') {
                setTimeout(() => {
                    player.emote = null;
                    player.seatedOnFurniture = false;
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
                    playerId: playerId,
                    emote: null,
                    seatedOnFurniture: false
                }, playerId);
            }
            break;
        }
        
        case 'change_room': {
            // Player changing rooms
            const newRoom = message.room;
            const oldRoom = player.room;
            
            if (newRoom && newRoom !== oldRoom) {
                joinRoom(playerId, newRoom);
                
                // Set spawn position for new room
                if (newRoom === 'town') {
                    player.position = { x: 110, y: 0, z: 110 }; // Town center spawn (same as /spawn)
                } else if (newRoom === 'dojo') {
                    player.position = { x: 0, y: 0, z: 14 }; // Near entrance
                }
                
                // Send current players in new room
                const existingPlayers = getPlayersInRoom(newRoom, playerId);
                sendToPlayer(playerId, {
                    type: 'room_state',
                    room: newRoom,
                    players: existingPlayers
                });
                
                // Notify new room about player
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
                        emote: player.emote || null,
                        seatedOnFurniture: player.seatedOnFurniture || false,
                        isAfk: player.isAfk || false,
                        afkMessage: player.afkMessage || null
                    }
                }, playerId);
                
                console.log(`${player.name} moved from ${oldRoom} to ${newRoom}`);
            }
            break;
        }
        
        case 'update_appearance': {
            // Player changed their appearance
            player.appearance = message.appearance || player.appearance;
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_appearance',
                    playerId: playerId,
                    appearance: player.appearance
                }, playerId);
            }
            break;
        }
        
        case 'update_puffle': {
            // Player equipped/unequipped puffle
            player.puffle = message.puffle;
            
            // Initialize puffle position if puffle equipped
            if (player.puffle && player.position) {
                player.pufflePosition = {
                    x: player.position.x + 1.5,
                    y: 0,
                    z: player.position.z + 1.5
                };
            } else {
                player.pufflePosition = null;
            }
            
            console.log(`${player.name} ${player.puffle ? 'equipped ' + player.puffle.color + ' puffle' : 'unequipped puffle'}`);
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_puffle',
                    playerId: playerId,
                    puffle: player.puffle,
                    pufflePosition: player.pufflePosition
                }, playerId);
            }
            break;
        }
        
        case 'ping': {
            // Keep-alive ping
            sendToPlayer(playerId, { type: 'pong' });
            break;
        }
        
        case 'ball_kick': {
            // Player kicked the beach ball - update server state and broadcast
            const room = player.room;
            if (room && (room === 'igloo1' || room === 'igloo2')) {
                const ball = beachBalls.get(room);
                if (ball) {
                    // Apply the kick from client
                    ball.x = message.x;
                    ball.z = message.z;
                    ball.vx = message.vx;
                    ball.vz = message.vz;
                    
                    // Broadcast to all players in room (including kicker for confirmation)
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
            // Client requesting current ball state (on room join)
            const room = player.room;
            if (room && (room === 'igloo1' || room === 'igloo2')) {
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
        
        // ==================== P2P CHALLENGE HANDLERS ====================
        
        case 'coins_sync': {
            // Client requesting their coin balance
            // Only return coins if they've been set (don't create default)
            if (playerCoins.has(playerId)) {
                sendToPlayer(playerId, {
                    type: 'coins_update',
                    coins: playerCoins.get(playerId)
                });
            }
            // If no coins set yet, wait for 'join' message to sync from client
            break;
        }
        
        case 'coins_update': {
            // Client reporting local coin change (from GameManager)
            if (typeof message.coins === 'number' && message.coins >= 0) {
                setPlayerCoins(playerId, message.coins);
            }
            break;
        }
        
        case 'inbox_sync': {
            // Client requesting inbox sync
            const messages = inboxService.getMessages(playerId);
            sendToPlayer(playerId, {
                type: 'inbox_update',
                messages,
                unreadCount: inboxService.getUnreadCount(playerId)
            });
            break;
        }
        
        case 'inbox_read': {
            // Mark message as read
            inboxService.markRead(playerId, message.messageId);
            break;
        }
        
        case 'inbox_delete': {
            // Delete message from inbox
            inboxService.deleteMessage(playerId, message.messageId);
            sendToPlayer(playerId, {
                type: 'inbox_update',
                messages: inboxService.getMessages(playerId),
                unreadCount: inboxService.getUnreadCount(playerId)
            });
            break;
        }
        
        case 'player_stats_request': {
            // Request stats for another player
            const stats = statsService.getPublicStats(message.targetPlayerId);
            sendToPlayer(playerId, {
                type: 'player_stats',
                playerId: message.targetPlayerId,
                stats
            });
            break;
        }
        
        case 'challenge_send': {
            // Send a challenge to another player
            const targetPlayer = players.get(message.targetPlayerId);
            if (!targetPlayer) {
                sendToPlayer(playerId, {
                    type: 'challenge_error',
                    error: 'PLAYER_NOT_FOUND',
                    message: 'Player not found or offline'
                });
                break;
            }
            
            // Check if challenger has enough coins
            const challengerCoins = getPlayerCoins(playerId);
            if (challengerCoins < message.wagerAmount) {
                sendToPlayer(playerId, {
                    type: 'challenge_error',
                    error: 'INSUFFICIENT_FUNDS',
                    message: 'You don\'t have enough coins for this wager'
                });
                break;
            }
            
            // Check if player is already in a match
            if (matchService.isPlayerInMatch(playerId)) {
                sendToPlayer(playerId, {
                    type: 'challenge_error',
                    error: 'IN_MATCH',
                    message: 'You are already in a match'
                });
                break;
            }
            
            const result = challengeService.createChallenge(
                player,
                targetPlayer,
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
                // Notify challenger of success
                sendToPlayer(playerId, {
                    type: 'challenge_sent',
                    challengeId: result.challenge.id,
                    targetName: targetPlayer.name
                });
                
                // Notify target of new challenge
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
                
                // Also send updated inbox
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
                    message: 'Challenge not found'
                });
                break;
            }
            
            if (message.response === 'accept') {
                // Check if target has enough coins
                const targetCoins = getPlayerCoins(playerId);
                if (targetCoins < challenge.wagerAmount) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: 'INSUFFICIENT_FUNDS',
                        message: 'You don\'t have enough coins for this wager'
                    });
                    break;
                }
                
                // Re-check challenger's coins (they may have spent coins since sending challenge)
                const challengerCoins = getPlayerCoins(challenge.challengerId);
                if (challengerCoins < challenge.wagerAmount) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: 'CHALLENGER_INSUFFICIENT_FUNDS',
                        message: `${challenge.challengerName} no longer has enough coins for this wager`
                    });
                    // Delete the challenge from inbox
                    inboxService.deleteByChallengeId(playerId, message.challengeId);
                    break;
                }
                
                // Check if either player is already in a match
                if (matchService.isPlayerInMatch(playerId) || matchService.isPlayerInMatch(challenge.challengerId)) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: 'PLAYER_IN_MATCH',
                        message: 'One of the players is already in a match'
                    });
                    break;
                }
                
                const result = challengeService.acceptChallenge(message.challengeId, playerId);
                
                if (result.error) {
                    sendToPlayer(playerId, {
                        type: 'challenge_error',
                        error: result.error,
                        message: result.message
                    });
                } else {
                    // Deduct coins from both players
                    const challenger = players.get(challenge.challengerId);
                    const target = players.get(challenge.targetId);
                    
                    setPlayerCoins(challenge.challengerId, getPlayerCoins(challenge.challengerId) - challenge.wagerAmount);
                    setPlayerCoins(challenge.targetId, getPlayerCoins(challenge.targetId) - challenge.wagerAmount);
                    
                    // Create match
                    const match = matchService.createMatch(challenge, challenger, target);
                    
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
                        coins: getPlayerCoins(challenge.challengerId)
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
                        coins: getPlayerCoins(challenge.targetId)
                    };
                    
                    sendToPlayer(challenge.challengerId, matchStartMsg1);
                    sendToPlayer(challenge.targetId, matchStartMsg2);
                    
                    // Broadcast to room that a match has started (for spectators)
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
                const result = challengeService.denyChallenge(message.challengeId, playerId);
                if (!result.error) {
                    // Send updated inbox to challenger
                    sendToPlayer(challenge.challengerId, {
                        type: 'inbox_update',
                        messages: inboxService.getMessages(challenge.challengerId),
                        unreadCount: inboxService.getUnreadCount(challenge.challengerId)
                    });
                }
            } else if (message.response === 'delete') {
                const result = challengeService.deleteChallenge(message.challengeId, playerId);
                if (!result.error) {
                    // Send updated inbox to challenger
                    sendToPlayer(challenge.challengerId, {
                        type: 'inbox_update',
                        messages: inboxService.getMessages(challenge.challengerId),
                        unreadCount: inboxService.getUnreadCount(challenge.challengerId)
                    });
                }
            }
            
            // Send updated inbox to responder
            sendToPlayer(playerId, {
                type: 'inbox_update',
                messages: inboxService.getMessages(playerId),
                unreadCount: inboxService.getUnreadCount(playerId)
            });
            break;
        }
        
        case 'match_play_card': {
            const result = matchService.playCard(message.matchId, playerId, message.cardIndex);
            
            if (result.error) {
                sendToPlayer(playerId, {
                    type: 'match_error',
                    error: result.error
                });
                break;
            }
            
            // Get updated state for both players
            const match = matchService.getMatch(message.matchId);
            if (!match) break;
            
            const state1 = matchService.getMatchState(match.id, match.player1.id);
            const state2 = matchService.getMatchState(match.id, match.player2.id);
            
            sendToPlayer(match.player1.id, {
                type: 'match_state',
                matchId: match.id,
                state: state1
            });
            
            sendToPlayer(match.player2.id, {
                type: 'match_state',
                matchId: match.id,
                state: state2
            });
            
            // Broadcast spectate update to other players in room (game-type aware)
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
                    // Card Jitsu
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
            
            // If match is complete, handle win/loss
            if (match.status === 'complete') {
                const winnerId = match.winnerId;
                const totalPot = match.wagerAmount * 2;
                const isDraw = result.isDraw || match.state.winner === 'draw';
                const gameTypeName = match.gameType === 'tic_tac_toe' ? 'ticTacToe' : 
                                 match.gameType === 'connect4' ? 'connect4' : 'cardJitsu';
                
                if (isDraw) {
                    // Draw - refund both players
                    setPlayerCoins(match.player1.id, getPlayerCoins(match.player1.id) + match.wagerAmount);
                    setPlayerCoins(match.player2.id, getPlayerCoins(match.player2.id) + match.wagerAmount);
                    
                    // Record draw stats
                    statsService.recordResult(match.player1.id, gameTypeName, false, 0, true);
                    statsService.recordResult(match.player2.id, gameTypeName, false, 0, true);
                    
                    // Notify both players of draw
                    sendToPlayer(match.player1.id, {
                        type: 'match_end',
                        matchId: match.id,
                        result: {
                            winner: 'draw',
                            winnerPlayerId: null,
                            coinsWon: 0,
                            yourCoins: getPlayerCoins(match.player1.id),
                            reason: 'draw',
                            refunded: match.wagerAmount
                        }
                    });
                    
                    sendToPlayer(match.player2.id, {
                        type: 'match_end',
                        matchId: match.id,
                        result: {
                            winner: 'draw',
                            winnerPlayerId: null,
                            coinsWon: 0,
                            yourCoins: getPlayerCoins(match.player2.id),
                            reason: 'draw',
                            refunded: match.wagerAmount
                        }
                    });
                    
                    console.log(`🤝 ${match.gameType} draw: ${match.player1.name} vs ${match.player2.name} - wagers refunded`);
                } else {
                    // Normal win - transfer coins to winner
                    const loserId = winnerId === match.player1.id ? match.player2.id : match.player1.id;
                    setPlayerCoins(winnerId, getPlayerCoins(winnerId) + totalPot);
                    
                    // Record stats
                    statsService.recordResult(winnerId, gameTypeName, true, totalPot);
                    statsService.recordResult(loserId, gameTypeName, false, match.wagerAmount);
                    
                    // Notify both players of match end
                    sendToPlayer(match.player1.id, {
                        type: 'match_end',
                        matchId: match.id,
                        result: {
                            winner: winnerId === match.player1.id ? 'player1' : 'player2',
                            winnerPlayerId: winnerId,
                            coinsWon: winnerId === match.player1.id ? totalPot : 0,
                            yourCoins: getPlayerCoins(match.player1.id),
                            reason: 'win'
                        }
                    });
                    
                    sendToPlayer(match.player2.id, {
                        type: 'match_end',
                        matchId: match.id,
                        result: {
                            winner: winnerId === match.player2.id ? 'player2' : 'player1',
                            winnerPlayerId: winnerId,
                            coinsWon: winnerId === match.player2.id ? totalPot : 0,
                            yourCoins: getPlayerCoins(match.player2.id),
                            reason: 'win'
                        }
                    });
                }
                
                // Broadcast match end to spectators
                broadcastToRoom(match.room, {
                    type: 'match_spectate_end',
                    matchId: match.id,
                    winnerId,
                    winnerName: winnerId ? (winnerId === match.player1.id ? match.player1.name : match.player2.name) : null,
                    isDraw
                }, match.player1.id, match.player2.id);
                
                // Send updated stats to both players
                sendToPlayer(match.player1.id, {
                    type: 'stats_update',
                    stats: statsService.getPublicStats(match.player1.id)
                });
                sendToPlayer(match.player2.id, {
                    type: 'stats_update',
                    stats: statsService.getPublicStats(match.player2.id)
                });
                
                // Clean up match
                matchService.endMatch(match.id);
            }
            break;
        }
        
        case 'match_forfeit': {
            const match = matchService.getMatch(message.matchId);
            if (!match) break;
            
            // Forfeiting player loses their wager to opponent
            const forfeiterId = playerId;
            const winnerId = forfeiterId === match.player1.id ? match.player2.id : match.player1.id;
            const totalPot = match.wagerAmount * 2;
            
            // Transfer coins to winner
            setPlayerCoins(winnerId, getPlayerCoins(winnerId) + totalPot);
            
            // Record stats (use correct game type)
            const forfeitGameType = match.gameType === 'tic_tac_toe' ? 'ticTacToe' : 
                                    match.gameType === 'connect4' ? 'connect4' : 'cardJitsu';
            statsService.recordResult(winnerId, forfeitGameType, true, totalPot);
            statsService.recordResult(forfeiterId, forfeitGameType, false, match.wagerAmount);
            
            // Notify both players
            sendToPlayer(match.player1.id, {
                type: 'match_end',
                matchId: match.id,
                result: {
                    winner: winnerId === match.player1.id ? 'player1' : 'player2',
                    winnerPlayerId: winnerId,
                    coinsWon: winnerId === match.player1.id ? totalPot : 0,
                    yourCoins: getPlayerCoins(match.player1.id),
                    reason: 'forfeit'
                }
            });
            
            sendToPlayer(match.player2.id, {
                type: 'match_end',
                matchId: match.id,
                result: {
                    winner: winnerId === match.player2.id ? 'player2' : 'player1',
                    winnerPlayerId: winnerId,
                    coinsWon: winnerId === match.player2.id ? totalPot : 0,
                    yourCoins: getPlayerCoins(match.player2.id),
                    reason: 'forfeit'
                }
            });
            
            // Send updated stats to both players
            sendToPlayer(match.player1.id, {
                type: 'stats_update',
                stats: statsService.getPublicStats(match.player1.id)
            });
            sendToPlayer(match.player2.id, {
                type: 'stats_update',
                stats: statsService.getPublicStats(match.player2.id)
            });
            
            // Void and clean up match
            matchService.voidMatch(match.id, 'forfeit');
            
            console.log(`🏳️ ${players.get(forfeiterId)?.name} forfeited match to ${players.get(winnerId)?.name}`);
            break;
        }
        
        case 'active_matches_request': {
            // Client requesting active matches in their room (for spectating)
            if (player.room) {
                const matches = matchService.getMatchesInRoom(player.room);
                sendToPlayer(playerId, {
                    type: 'active_matches',
                    matches
                });
            }
            break;
        }
    }
}

// Periodic cleanup of stale connections
setInterval(() => {
    for (const [playerId, player] of players) {
        if (player.ws.readyState !== 1) {
            console.log(`Cleaning up stale player: ${playerId}`);
            
            // Handle match disconnect
            const voidResult = matchService.handleDisconnect(playerId);
            if (voidResult) {
                // Refund both players
                setPlayerCoins(voidResult.player1Id, getPlayerCoins(voidResult.player1Id) + voidResult.wagerAmount);
                setPlayerCoins(voidResult.player2Id, getPlayerCoins(voidResult.player2Id) + voidResult.wagerAmount);
                
                // Notify the other player
                const otherId = playerId === voidResult.player1Id ? voidResult.player2Id : voidResult.player1Id;
                sendToPlayer(otherId, {
                    type: 'match_end',
                    matchId: voidResult.matchId,
                    result: {
                        winner: 'void',
                        winnerPlayerId: null,
                        coinsWon: 0,
                        yourCoins: getPlayerCoins(otherId),
                        reason: 'disconnect',
                        refunded: voidResult.wagerAmount
                    }
                });
            }
            
            // Remove IP tracking
            if (player.ip) {
                removeIPConnection(player.ip, playerId);
            }
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_left',
                    playerId: playerId
                });
                
                const room = rooms.get(player.room);
                if (room) room.delete(playerId);
            }
            
            players.delete(playerId);
        }
    }
    
    // Clean up expired challenges
    inboxService.cleanupExpired();
}, 30000);

// Log server stats periodically
setInterval(() => {
    const uniqueIPs = ipConnections.size;
    console.log(`📊 Players: ${players.size} | Unique IPs: ${uniqueIPs} | Rooms: ${Array.from(rooms.entries()).map(([id, set]) => `${id}:${set.size}`).join(', ') || 'none'}`);
}, 60000);

// Start the HTTP server
server.listen(PORT, () => {
    console.log(`🌐 HTTP server listening on port ${PORT}`);
});

