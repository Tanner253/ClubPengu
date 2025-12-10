/**
 * Multiplayer Context - WebSocket connection and state management
 * OPTIMIZED: Uses refs for real-time position data to avoid React re-renders
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const MultiplayerContext = createContext(null);

// Server URL - change this when deploying
const getServerUrl = () => {
    if (import.meta.env.VITE_WS_SERVER) {
        return import.meta.env.VITE_WS_SERVER;
    }
    if (import.meta.env.DEV) {
        return 'ws://localhost:3001';
    }
    return 'ws://localhost:3001';
};

export function MultiplayerProvider({ children }) {
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const pingIntervalRef = useRef(null);
    
    // Connection state
    const [connected, setConnected] = useState(false);
    const [playerId, setPlayerId] = useState(null);
    const [playerName, setPlayerName] = useState(() => {
        return localStorage.getItem('penguin_name') || `Penguin${Math.floor(Math.random() * 1000)}`;
    });
    
    // OPTIMIZATION: Player LIST in state (for join/leave only)
    // Player POSITIONS in ref (for real-time updates, no re-renders)
    const [playerList, setPlayerList] = useState([]); // Array of player IDs
    const playersDataRef = useRef(new Map()); // playerId -> full player data (positions, etc)
    
    // For backwards compatibility - return a getter function
    const getPlayersData = useCallback(() => playersDataRef.current, []);
    
    // Player count for UI (updated less frequently)
    const [playerCount, setPlayerCount] = useState(0);
    
    // Chat messages (recent)
    const [chatMessages, setChatMessages] = useState([]);
    
    // Current room synced with server
    const [serverRoom, setServerRoom] = useState(null);
    
    // Connection error state
    const [connectionError, setConnectionError] = useState(null);
    
    // Callbacks for game integration
    const callbacksRef = useRef({
        onPlayerJoined: null,
        onPlayerLeft: null,
        onPlayerMoved: null,
        onPlayerEmote: null,
        onChatMessage: null
    });
    
    // Connect to server
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        
        const serverUrl = getServerUrl();
        console.log(`🔌 Connecting to ${serverUrl}...`);
        
        try {
            const ws = new WebSocket(serverUrl);
            wsRef.current = ws;
            
            ws.onopen = () => {
                console.log('✅ Connected to multiplayer server');
                setConnected(true);
                
                // Start ping interval to keep connection alive
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 25000);
            };
            
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleMessage(message);
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            };
            
            ws.onclose = () => {
                console.log('❌ Disconnected from server');
                setConnected(false);
                setPlayerId(null);
                clearInterval(pingIntervalRef.current);
                
                // Attempt reconnect after 3 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('🔄 Attempting reconnect...');
                    connect();
                }, 3000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (e) {
            console.error('Failed to connect:', e);
            // Retry connection
            reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
    }, []);
    
    // Handle incoming messages - OPTIMIZED: position updates go to ref, not state
    const handleMessage = useCallback((message) => {
        switch (message.type) {
            case 'connected':
                setPlayerId(message.playerId);
                console.log(`🐧 Assigned player ID: ${message.playerId}`);
                break;
                
            case 'room_state':
                // Received current state of room (other players)
                console.log(`📍 Entered ${message.room} with ${message.players.length} other players`);
                setServerRoom(message.room);
                
                // Clear and rebuild player data
                playersDataRef.current.clear();
                const ids = [];
                message.players.forEach(p => {
                    console.log(`  - ${p.name}`, p.puffle ? `with ${p.puffle.color} puffle` : '(no puffle)');
                    const playerData = {
                        id: p.id,
                        name: p.name,
                        position: p.position,
                        rotation: p.rotation,
                        appearance: p.appearance,
                        puffle: p.puffle || null,
                        pufflePosition: p.pufflePosition || null,
                        emote: p.emote || null,
                        needsMesh: true
                    };
                    playersDataRef.current.set(p.id, playerData);
                    ids.push(p.id);
                });
                setPlayerList(ids);
                setPlayerCount(ids.length);
                break;
                
            case 'player_joined':
                console.log(`👋 ${message.player.name} joined`, message.player.puffle ? `with ${message.player.puffle.color} puffle` : '(no puffle)');
                // Add to ref immediately with all data including puffle
                const joinedPlayerData = {
                    id: message.player.id,
                    name: message.player.name,
                    position: message.player.position,
                    rotation: message.player.rotation,
                    appearance: message.player.appearance,
                    puffle: message.player.puffle || null,
                    pufflePosition: message.player.pufflePosition || null,
                    emote: message.player.emote || null,
                    needsMesh: true
                };
                playersDataRef.current.set(message.player.id, joinedPlayerData);
                // Update state for list change (triggers mesh creation)
                setPlayerList(prev => [...prev, message.player.id]);
                setPlayerCount(prev => prev + 1);
                callbacksRef.current.onPlayerJoined?.(message.player);
                break;
                
            case 'player_left':
                console.log(`👋 Player ${message.playerId} left`);
                // Remove from ref
                playersDataRef.current.delete(message.playerId);
                // Update state for list change
                setPlayerList(prev => prev.filter(id => id !== message.playerId));
                setPlayerCount(prev => Math.max(0, prev - 1));
                callbacksRef.current.onPlayerLeft?.(message.playerId);
                break;
                
            case 'player_moved':
                // OPTIMIZATION: Update ref directly, NO state update, NO re-render
                const movingPlayer = playersDataRef.current.get(message.playerId);
                if (movingPlayer) {
                    movingPlayer.position = message.position;
                    movingPlayer.rotation = message.rotation;
                    movingPlayer.pufflePosition = message.pufflePosition;
                }
                // Callback for any direct handling needed
                callbacksRef.current.onPlayerMoved?.(message.playerId, message.position, message.rotation);
                break;
                
            case 'player_emote':
                // Update ref directly
                const emotingPlayer = playersDataRef.current.get(message.playerId);
                if (emotingPlayer) {
                    emotingPlayer.emote = message.emote;
                    emotingPlayer.emoteStartTime = Date.now();
                }
                callbacksRef.current.onPlayerEmote?.(message.playerId, message.emote);
                break;
                
            case 'player_appearance':
                const appearancePlayer = playersDataRef.current.get(message.playerId);
                if (appearancePlayer) {
                    appearancePlayer.appearance = message.appearance;
                    appearancePlayer.needsMeshRebuild = true; // Flag for mesh rebuild
                }
                break;
                
            case 'player_puffle':
                const pufflePlayer = playersDataRef.current.get(message.playerId);
                if (pufflePlayer) {
                    console.log(`🐾 ${pufflePlayer.name} ${message.puffle ? 'equipped ' + message.puffle.color + ' puffle' : 'unequipped puffle'}`);
                    pufflePlayer.puffle = message.puffle;
                    pufflePlayer.pufflePosition = message.pufflePosition || null;
                    pufflePlayer.needsPuffleUpdate = true;
                }
                break;
                
            case 'chat':
                // Add chat bubble to player data for rendering
                const chattingPlayer = playersDataRef.current.get(message.playerId);
                if (chattingPlayer) {
                    chattingPlayer.chatMessage = message.text;
                    chattingPlayer.chatTime = Date.now();
                }
                
                const chatMsg = {
                    id: Date.now(),
                    playerId: message.playerId,
                    name: message.name,
                    text: message.text,
                    timestamp: Date.now()
                };
                setChatMessages(prev => [...prev.slice(-50), chatMsg]);
                callbacksRef.current.onChatMessage?.(chatMsg);
                break;
                
            case 'pong':
                break;
                
            case 'error':
                console.error(`❌ Server error: ${message.code} - ${message.message}`);
                setConnectionError({
                    code: message.code,
                    message: message.message
                });
                break;
        }
    }, []);
    
    // Send message to server
    const send = useCallback((message) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);
    
    // Join a room with player data
    const joinRoom = useCallback((room, appearance, puffle = null) => {
        send({
            type: 'join',
            room,
            name: playerName,
            appearance,
            puffle
        });
    }, [send, playerName]);
    
    // Send position update (called frequently during movement)
    const sendPosition = useCallback((position, rotation, pufflePosition = null) => {
        send({
            type: 'move',
            position,
            rotation,
            pufflePosition
        });
    }, [send]);
    
    // Send chat message
    const sendChat = useCallback((text) => {
        send({
            type: 'chat',
            text
        });
    }, [send]);
    
    // Send emote
    const sendEmote = useCallback((emote) => {
        send({
            type: 'emote',
            emote
        });
    }, [send]);
    
    // Stop emote
    const stopEmote = useCallback(() => {
        send({
            type: 'stop_emote'
        });
    }, [send]);
    
    // Change room
    const changeRoom = useCallback((newRoom) => {
        send({
            type: 'change_room',
            room: newRoom
        });
    }, [send]);
    
    // Update appearance
    const updateAppearance = useCallback((appearance) => {
        send({
            type: 'update_appearance',
            appearance
        });
    }, [send]);
    
    // Update puffle
    const updatePuffle = useCallback((puffle) => {
        send({
            type: 'update_puffle',
            puffle
        });
    }, [send]);
    
    // Set player name
    const setName = useCallback((name) => {
        setPlayerName(name);
        localStorage.setItem('penguin_name', name);
    }, []);
    
    // Register callbacks for game events
    const registerCallbacks = useCallback((callbacks) => {
        callbacksRef.current = { ...callbacksRef.current, ...callbacks };
    }, []);
    
    // Connect on mount
    useEffect(() => {
        connect();
        
        return () => {
            clearTimeout(reconnectTimeoutRef.current);
            clearInterval(pingIntervalRef.current);
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);
    
    const value = {
        // State
        connected,
        playerId,
        playerName,
        playerCount,
        playerList,           // Array of player IDs (for triggering mesh creation)
        getPlayersData,       // Function to get ref (for real-time position access)
        playersDataRef,       // Direct ref access for game loop
        chatMessages,
        serverRoom,
        connectionError,      // Error if connection was rejected
        
        // Actions
        setName,
        joinRoom,
        sendPosition,
        sendChat,
        sendEmote,
        stopEmote,
        changeRoom,
        updateAppearance,
        updatePuffle,
        registerCallbacks
    };
    
    return (
        <MultiplayerContext.Provider value={value}>
            {children}
        </MultiplayerContext.Provider>
    );
}

export function useMultiplayer() {
    const context = useContext(MultiplayerContext);
    if (!context) {
        throw new Error('useMultiplayer must be used within a MultiplayerProvider');
    }
    return context;
}

export default MultiplayerContext;

