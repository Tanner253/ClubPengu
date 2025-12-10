/**
 * Club Penguin Multiplayer WebSocket Server
 * Simple agar.io-style server for real-time player sync
 */

import { WebSocketServer } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 3001;
const MAX_CONNECTIONS_PER_IP = 2; // Maximum allowed connections per IP address

// Game state
const players = new Map(); // playerId -> { id, name, room, position, rotation, appearance, puffle, ip }
const rooms = new Map(); // roomId -> Set of playerIds
const ipConnections = new Map(); // ip -> Set of playerIds (for tracking connections per IP)

// Create HTTP server to access request headers for IP
const server = http.createServer();

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

console.log(`🐧 Club Penguin Server running on port ${PORT}`);

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

// Check if IP can connect (returns true if allowed)
function canIPConnect(ip) {
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

// Broadcast to all players in a room except sender
function broadcastToRoom(roomId, message, excludeId = null) {
    const roomPlayers = rooms.get(roomId);
    if (!roomPlayers) return;
    
    const data = JSON.stringify(message);
    
    for (const playerId of roomPlayers) {
        if (playerId === excludeId) continue;
        
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
                pufflePosition: player.pufflePosition, // Include puffle position
                emote: player.emote
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
            
            console.log(`Join request from ${player.name}:`, message.puffle ? `has ${message.puffle.color} puffle` : 'no puffle');
            
            const roomId = message.room || 'town';
            joinRoom(playerId, roomId);
            
            // Set initial position based on room
            if (roomId === 'town') {
                player.position = { x: 80, y: 0, z: 90 }; // Town center spawn
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
                players: existingPlayers
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
                    pufflePosition: player.pufflePosition
                }
            }, playerId);
            
            console.log(`${player.name} joined ${roomId} ${player.puffle ? '(with puffle)' : ''}`);
            break;
        }
        
        case 'move': {
            // Player position update - OPTIMIZED: only broadcast if actually changed
            const posChanged = !player.position || 
                Math.abs(player.position.x - message.position.x) > 0.01 ||
                Math.abs(player.position.z - message.position.z) > 0.01;
            const rotChanged = player.rotation === undefined ||
                Math.abs(player.rotation - message.rotation) > 0.01;
            
            player.position = message.position;
            player.rotation = message.rotation;
            
            // Store puffle position on player object (not inside puffle)
            if (message.pufflePosition) {
                player.pufflePosition = message.pufflePosition;
            }
            
            // Only broadcast if something actually changed
            if ((posChanged || rotChanged) && player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_moved',
                    playerId: playerId,
                    position: player.position,
                    rotation: player.rotation,
                    pufflePosition: player.pufflePosition
                }, playerId);
            }
            break;
        }
        
        case 'chat': {
            // Chat message
            if (player.room && message.text) {
                broadcastToRoomAll(player.room, {
                    type: 'chat',
                    playerId: playerId,
                    name: player.name,
                    text: message.text.substring(0, 200) // Limit message length
                });
            }
            break;
        }
        
        case 'emote': {
            // Emote triggered
            player.emote = message.emote;
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_emote',
                    playerId: playerId,
                    emote: message.emote
                }, playerId);
            }
            
            // Clear emote after duration (except Sit)
            if (message.emote !== 'Sit') {
                setTimeout(() => {
                    player.emote = null;
                }, 3000);
            }
            break;
        }
        
        case 'stop_emote': {
            player.emote = null;
            
            if (player.room) {
                broadcastToRoom(player.room, {
                    type: 'player_emote',
                    playerId: playerId,
                    emote: null
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
                    player.position = { x: 80, y: 0, z: 70 }; // Near dojo exit
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
                        puffle: player.puffle
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
    }
}

// Periodic cleanup of stale connections
setInterval(() => {
    for (const [playerId, player] of players) {
        if (player.ws.readyState !== 1) {
            console.log(`Cleaning up stale player: ${playerId}`);
            
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

