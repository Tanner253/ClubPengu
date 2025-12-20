/**
 * Multiplayer Context - WebSocket connection and state management
 * With Phantom wallet authentication support
 * OPTIMIZED: Uses refs for real-time position data to avoid React re-renders
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import GameManager from '../engine/GameManager';
import { PhantomWallet } from '../wallet';

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
    const walletRef = useRef(PhantomWallet.getInstance());
    
    // Connection state
    const [connected, setConnected] = useState(false);
    const [playerId, setPlayerId] = useState(null);
    const playerIdRef = useRef(null);
    // Always generate a fresh guest name - authenticated users will get their name from server
    const [playerName, setPlayerName] = useState(() => {
        return `Penguin${Math.floor(1000 + Math.random() * 9000)}`;
    });
    const playerNameRef = useRef(playerName);
    
    // ==================== AUTHENTICATION STATE ====================
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [walletAddress, setWalletAddress] = useState(() => localStorage.getItem('wallet_address'));
    const [authToken, setAuthToken] = useState(() => localStorage.getItem('auth_token'));
    const [userData, setUserData] = useState(null);
    const [isNewUser, setIsNewUser] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isRestoringSession, setIsRestoringSession] = useState(false);
    
    // Pending auth challenge
    const pendingChallengeRef = useRef(null);
    const sessionRestoredRef = useRef(false);
    
    // ==================== PLAYER STATE ====================
    const [playerList, setPlayerList] = useState([]);
    const playersDataRef = useRef(new Map());
    const getPlayersData = useCallback(() => playersDataRef.current, []);
    const [playerCount, setPlayerCount] = useState(0);
    const [totalPlayerCount, setTotalPlayerCount] = useState(0);
    
    // Chat messages
    const [chatMessages, setChatMessages] = useState([]);
    
    // Current room
    const [serverRoom, setServerRoom] = useState(null);
    
    // Connection error state
    const [connectionError, setConnectionError] = useState(null);
    
    // World time
    const worldTimeRef = useRef(0.35);
    
    // Promo code state
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoResult, setPromoResult] = useState(null);
    const promoCallbackRef = useRef(null);
    
    // Slot machine state
    const [slotSpinning, setSlotSpinning] = useState(false);
    const [slotResult, setSlotResult] = useState(null);
    const [activeSlotSpins, setActiveSlotSpins] = useState([]); // Other players spinning
    const slotCallbackRef = useRef(null);
    
    // Ice fishing state
    const [fishingActive, setFishingActive] = useState(false);
    const [fishingResult, setFishingResult] = useState(null);
    const fishingCallbackRef = useRef(null);
    
    // Callbacks
    const callbacksRef = useRef({
        onPlayerJoined: null,
        onPlayerLeft: null,
        onPlayerMoved: null,
        onPlayerEmote: null,
        onChatMessage: null,
        onAuthSuccess: null,
        onAuthFailure: null,
        onPromoResult: null
    });
    
    // ==================== CONNECT ====================
    const connect = useCallback(() => {
        // Prevent duplicate connections (CONNECTING = 0, OPEN = 1)
        if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
            return;
        }
        
        // Close any existing connection that's closing/closed
        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch (e) { /* ignore */ }
            wsRef.current = null;
        }
        
        const serverUrl = getServerUrl();
        console.log(`🔌 Connecting to ${serverUrl}...`);
        
        try {
            const ws = new WebSocket(serverUrl);
            wsRef.current = ws;
            
            ws.onopen = () => {
                console.log('✅ Connected to multiplayer server');
                setConnected(true);
                window.__multiplayerWs = ws;
                
                // Ping to keep connection alive
                // Mobile browsers suspend WebSockets more aggressively, so ping faster
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                const pingInterval = isMobile ? 15000 : 25000; // 15s mobile, 25s desktop
                
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, pingInterval);
                
                // Attempt to restore session from stored token
                const storedToken = localStorage.getItem('auth_token');
                const storedWallet = localStorage.getItem('wallet_address');
                const sessionTimestamp = localStorage.getItem('session_timestamp');
                
                if (storedToken && storedWallet && !sessionRestoredRef.current) {
                    // Check if session is still valid (within 7 days)
                    const sessionAge = Date.now() - parseInt(sessionTimestamp || '0');
                    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
                    
                    if (sessionAge < maxAge) {
                        console.log('🔄 Attempting to restore session...');
                        setIsRestoringSession(true);
                        sessionRestoredRef.current = true;
                        
                        // Send session restore request
                        ws.send(JSON.stringify({
                            type: 'auth_restore',
                            token: storedToken,
                            walletAddress: storedWallet
                        }));
                    } else {
                        console.log('⚠️ Stored session expired, clearing...');
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('wallet_address');
                        localStorage.removeItem('session_timestamp');
                    }
                }
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
                setIsAuthenticated(false);
                clearInterval(pingIntervalRef.current);
                
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
            reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
    }, []);
    
    // ==================== MESSAGE HANDLER ====================
    const handleMessage = useCallback((message) => {
        switch (message.type) {
            // ==================== AUTH MESSAGES ====================
            case 'connected':
                setPlayerId(message.playerId);
                playerIdRef.current = message.playerId;
                console.log(`🐧 Assigned player ID: ${message.playerId}${message.isGuest ? ' (guest)' : ''}`);
                break;
                
            case 'auth_challenge':
                // Store the x403 challenge for signing (full message)
                pendingChallengeRef.current = {
                    message: message.message,    // Full message to display/sign
                    nonce: message.nonce,        // Unique nonce
                    domain: message.domain,      // Expected domain
                    expiresAt: message.expiresAt // Expiration time
                };
                break;
                
            case 'auth_success':
                console.log(`🔐 ${message.restored ? 'Session restored' : 'Authenticated'} as ${message.user.username}`);
                setIsAuthenticated(true);
                setWalletAddress(message.user.walletAddress);
                setAuthToken(message.token);
                setUserData(message.user);
                setIsNewUser(message.isNewUser);
                setAuthError(null);
                setIsAuthenticating(false);
                setIsRestoringSession(false);
                
                // Update player name from user data
                setPlayerName(message.user.username);
                playerNameRef.current = message.user.username;
                
                // Persist session (survives refresh for 24h+)
                localStorage.setItem('penguin_name', message.user.username);
                localStorage.setItem('auth_token', message.token);
                localStorage.setItem('wallet_address', message.user.walletAddress);
                localStorage.setItem('session_timestamp', Date.now().toString());
                
                // Sync GameManager with server data
                const gm = GameManager.getInstance();
                gm.syncFromServer(message.user, message.isNewUser);
                
                callbacksRef.current.onAuthSuccess?.(message.user);
                break;
                
            case 'auth_failure':
                console.error(`🔐 Auth failed: ${message.error}`);
                setAuthError({ code: message.error, message: message.message });
                setIsAuthenticating(false);
                setIsRestoringSession(false);
                
                // Clear stored session on failure
                if (message.error === 'TOKEN_EXPIRED' || message.error === 'SESSION_INVALID') {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('wallet_address');
                    localStorage.removeItem('session_timestamp');
                }
                
                callbacksRef.current.onAuthFailure?.(message.error, message.message);
                break;
                
            case 'auth_logged_out':
                setIsAuthenticated(false);
                setWalletAddress(null);
                setAuthToken(null);
                setUserData(null);
                localStorage.removeItem('auth_token');
                localStorage.removeItem('wallet_address');
                localStorage.removeItem('session_timestamp');
                GameManager.getInstance().clearServerData();
                break;
                
            // Note: auth_restored is handled by auth_success with restored: true flag
                
            case 'coins_update':
                // Server-authoritative coin update
                if (message.coins !== undefined) {
                    GameManager.getInstance().setCoinsFromServer(message.coins);
                    // Also update userData to keep context in sync
                    setUserData(prev => prev ? { ...prev, coins: message.coins } : prev);
                }
                break;
                
            case 'username_changed':
                // Username successfully changed
                console.log(`📝 Username changed: ${message.oldUsername} → ${message.newUsername}`);
                setPlayerName(message.newUsername);
                playerNameRef.current = message.newUsername;
                localStorage.setItem('penguin_name', message.newUsername);
                setUserData(prev => prev ? { ...prev, username: message.newUsername, canChangeUsername: false } : prev);
                callbacksRef.current.onUsernameChanged?.(message);
                break;
                
            case 'username_change_failed':
                // Username change failed
                console.error(`📝 Username change failed: ${message.error}`);
                callbacksRef.current.onUsernameChangeFailed?.(message);
                break;
                
            case 'username_status':
                // Username availability check result
                callbacksRef.current.onUsernameStatus?.(message);
                break;
                
            case 'user_data':
                if (message.user) {
                    setUserData(message.user);
                    GameManager.getInstance().syncFromServer(message.user);
                }
                break;
            
            case 'username_updated':
                setPlayerName(message.username);
                playerNameRef.current = message.username;
                localStorage.setItem('penguin_name', message.username);
                break;
            
            // ==================== PROMO CODE MESSAGES ====================
            case 'promo_result': {
                setPromoLoading(false);
                setPromoResult(message);
                
                // If successful, userData will be updated via user_data message
                // Call the callback if registered
                if (promoCallbackRef.current) {
                    promoCallbackRef.current(message);
                    promoCallbackRef.current = null;
                }
                callbacksRef.current.onPromoResult?.(message);
                break;
            }
            
            case 'promo_validation':
                // Quick validation result (no redemption)
                callbacksRef.current.onPromoValidation?.(message);
                break;
            
            case 'promo_history':
                // User's redeemed promo codes
                callbacksRef.current.onPromoHistory?.(message.codes);
                break;
            
            // ==================== SLOT MACHINE MESSAGES ====================
            case 'slot_spin_started': {
                // Local player's spin started
                setSlotSpinning(true);
                setSlotResult(null);
                callbacksRef.current.onSlotSpinStarted?.(message);
                break;
            }
            
            case 'slot_reel_reveal': {
                // A reel was revealed (for spectators and local player)
                callbacksRef.current.onSlotReelReveal?.(message);
                break;
            }
            
            case 'slot_result': {
                // Local player's spin completed
                setSlotSpinning(false);
                setSlotResult(message);
                
                // Update coins
                if (message.newBalance !== undefined) {
                    GameManager.getInstance().setCoinsFromServer(message.newBalance);
                    setUserData(prev => prev ? { ...prev, coins: message.newBalance } : prev);
                }
                
                if (slotCallbackRef.current) {
                    slotCallbackRef.current(message);
                    slotCallbackRef.current = null;
                }
                callbacksRef.current.onSlotResult?.(message);
                break;
            }
            
            case 'slot_player_spinning': {
                // Another player started spinning
                setActiveSlotSpins(prev => [...prev, {
                    playerId: message.playerId,
                    playerName: message.playerName,
                    machineId: message.machineId,
                    playerPosition: message.playerPosition
                }]);
                callbacksRef.current.onSlotPlayerSpinning?.(message);
                break;
            }
            
            case 'slot_complete': {
                // Another player's spin completed (spectator update)
                setActiveSlotSpins(prev => prev.filter(s => s.playerId !== message.playerId));
                callbacksRef.current.onSlotComplete?.(message);
                break;
            }
            
            case 'slot_interrupted': {
                // A player's spin was interrupted (disconnect)
                setActiveSlotSpins(prev => prev.filter(s => s.playerId !== message.playerId));
                callbacksRef.current.onSlotInterrupted?.(message);
                break;
            }
            
            case 'slot_active_spins': {
                // Current active spins in room (when joining)
                setActiveSlotSpins(message.spins || []);
                callbacksRef.current.onSlotActiveSpins?.(message.spins);
                break;
            }
            
            case 'slot_error': {
                // Slot spin error
                setSlotSpinning(false);
                if (slotCallbackRef.current) {
                    slotCallbackRef.current({ error: message.error, message: message.message });
                    slotCallbackRef.current = null;
                }
                callbacksRef.current.onSlotError?.(message);
                break;
            }
            
            case 'slot_info': {
                // Slot machine info (payouts, symbols)
                callbacksRef.current.onSlotInfo?.(message.info);
                break;
            }
            
            // ==================== ICE FISHING MESSAGES ====================
            case 'fishing_started': {
                // Local player's fishing session started (bait cost deducted)
                setFishingActive(true);
                setFishingResult(null);
                callbacksRef.current.onFishingStarted?.(message);
                if (fishingCallbackRef.current) {
                    fishingCallbackRef.current({ success: true, ...message });
                    fishingCallbackRef.current = null;
                }
                break;
            }
            
            case 'player_caught_fish': {
                // A player caught a fish - show catch bubble above them
                callbacksRef.current.onPlayerCaughtFish?.(message);
                break;
            }
            
            case 'fishing_result': {
                // Local player's catch result (for coin display)
                setFishingResult(message);
                setFishingActive(false);
                break;
            }
            
            case 'fishing_error': {
                // Fishing error
                setFishingActive(false);
                if (fishingCallbackRef.current) {
                    fishingCallbackRef.current({ error: message.error, message: message.message });
                    fishingCallbackRef.current = null;
                }
                break;
            }
            
            // ==================== PUFFLE MESSAGES ====================
            case 'puffle_adopted': {
                setPuffleAdopting(false);
                const result = { 
                    success: true, 
                    puffle: message.puffle, 
                    newBalance: message.newBalance 
                };
                if (puffleAdoptCallbackRef.current) {
                    puffleAdoptCallbackRef.current(result);
                    puffleAdoptCallbackRef.current = null;
                }
                callbacksRef.current.onPuffleAdopted?.(message.puffle);
                break;
            }
            
            case 'puffle_adopt_failed': {
                setPuffleAdopting(false);
                const result = { 
                    success: false, 
                    error: message.error, 
                    message: message.message 
                };
                if (puffleAdoptCallbackRef.current) {
                    puffleAdoptCallbackRef.current(result);
                    puffleAdoptCallbackRef.current = null;
                }
                break;
            }
                
            case 'stats_update':
                // Update local stats from server
                if (message.stats) {
                    GameManager.getInstance().updateStats(message.stats);
                }
                break;
                
            case 'player_authenticated':
                // Another player authenticated - update their display
                const authPlayer = playersDataRef.current.get(message.playerId);
                if (authPlayer) {
                    authPlayer.name = message.name;
                    authPlayer.appearance = message.appearance;
                    authPlayer.isAuthenticated = true;
                    authPlayer.needsMeshRebuild = true;
                }
                break;
                
            // ==================== ROOM/PLAYER MESSAGES ====================
            case 'room_state':
                console.log(`📍 Entered ${message.room} with ${message.players.length} other players`);
                setServerRoom(message.room);
                
                if (message.worldTime !== undefined) {
                    worldTimeRef.current = message.worldTime;
                }
                
                // Sync coins from server
                if (message.coins !== undefined) {
                    GameManager.getInstance().setCoinsFromServer(message.coins);
                }
                
                // Sync updated user data only if username changed (first entry lock)
                // Don't re-sync on every room join to prevent loops
                if (message.userData && message.userData.username !== playerNameRef.current) {
                    setUserData(prev => ({ ...prev, ...message.userData }));
                    // Update player name if it changed (username lock)
                    if (message.userData.username) {
                        setPlayerName(message.userData.username);
                        playerNameRef.current = message.userData.username;
                    }
                }
                
                playersDataRef.current.clear();
                const ids = [];
                message.players.forEach(p => {
                    console.log(`  - ${p.name}`, p.puffle ? `with ${p.puffle.color} puffle` : '(no puffle)', p.emote ? `emoting: ${p.emote}` : '', p.isAfk ? '(AFK)' : '', p.isAuthenticated ? '✓' : '');
                    const playerData = {
                        id: p.id,
                        name: p.name,
                        position: p.position,
                        rotation: p.rotation,
                        appearance: p.appearance,
                        puffle: p.puffle || null,
                        pufflePosition: p.pufflePosition || null,
                        emote: p.emote || null,
                        emoteStartTime: p.emote ? Date.now() : null,
                        seatedOnFurniture: p.seatedOnFurniture || false,
                        isAfk: p.isAfk || false,
                        afkMessage: p.afkMessage || null,
                        chatMessage: p.isAfk ? p.afkMessage : null,
                        chatTime: p.isAfk ? Date.now() : null,
                        isAfkBubble: p.isAfk || false,
                        isAuthenticated: p.isAuthenticated || false,
                        needsMesh: true
                    };
                    playersDataRef.current.set(p.id, playerData);
                    ids.push(p.id);
                });
                setPlayerList(ids);
                setPlayerCount(ids.length);
                break;
                
            case 'player_joined':
                console.log(`👋 ${message.player.name} joined`, message.player.isAuthenticated ? '✓' : '(guest)');
                const joinedPlayerData = {
                    id: message.player.id,
                    name: message.player.name,
                    position: message.player.position,
                    rotation: message.player.rotation,
                    appearance: message.player.appearance,
                    puffle: message.player.puffle || null,
                    pufflePosition: message.player.pufflePosition || null,
                    emote: message.player.emote || null,
                    emoteStartTime: message.player.emote ? Date.now() : null,
                    seatedOnFurniture: message.player.seatedOnFurniture || false,
                    isAfk: message.player.isAfk || false,
                    afkMessage: message.player.afkMessage || null,
                    chatMessage: message.player.isAfk ? message.player.afkMessage : null,
                    chatTime: message.player.isAfk ? Date.now() : null,
                    isAfkBubble: message.player.isAfk || false,
                    isAuthenticated: message.player.isAuthenticated || false,
                    needsMesh: true
                };
                playersDataRef.current.set(message.player.id, joinedPlayerData);
                setPlayerList(prev => [...prev, message.player.id]);
                setPlayerCount(prev => prev + 1);
                callbacksRef.current.onPlayerJoined?.(message.player);
                break;
                
            case 'player_left':
                console.log(`👋 Player ${message.playerId} left`);
                playersDataRef.current.delete(message.playerId);
                setPlayerList(prev => prev.filter(id => id !== message.playerId));
                setPlayerCount(prev => Math.max(0, prev - 1));
                callbacksRef.current.onPlayerLeft?.(message.playerId);
                break;
                
            case 'player_moved':
                const movingPlayer = playersDataRef.current.get(message.playerId);
                if (movingPlayer) {
                    movingPlayer.position = message.position;
                    movingPlayer.rotation = message.rotation;
                    movingPlayer.pufflePosition = message.pufflePosition;
                }
                callbacksRef.current.onPlayerMoved?.(message.playerId, message.position, message.rotation);
                break;
                
            case 'player_emote':
                const emotingPlayer = playersDataRef.current.get(message.playerId);
                if (emotingPlayer) {
                    emotingPlayer.emote = message.emote;
                    emotingPlayer.emoteStartTime = Date.now();
                    emotingPlayer.seatedOnFurniture = message.seatedOnFurniture || false;
                }
                callbacksRef.current.onPlayerEmote?.(message.playerId, message.emote);
                break;
                
            case 'player_appearance':
                const appearancePlayer = playersDataRef.current.get(message.playerId);
                if (appearancePlayer) {
                    appearancePlayer.appearance = message.appearance;
                    appearancePlayer.needsMeshRebuild = true;
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
                
            case 'player_renamed':
                const renamedPlayer = playersDataRef.current.get(message.playerId);
                if (renamedPlayer) {
                    renamedPlayer.name = message.newName;
                }
                break;
                
            case 'chat':
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
            
            case 'emote_bubble':
                const emoteBubblePlayer = playersDataRef.current.get(message.playerId);
                if (emoteBubblePlayer) {
                    emoteBubblePlayer.chatMessage = message.text;
                    emoteBubblePlayer.chatTime = Date.now();
                }
                break;
            
            case 'player_afk': {
                const afkPlayer = playersDataRef.current.get(message.playerId);
                if (afkPlayer) {
                    afkPlayer.isAfk = message.isAfk;
                    afkPlayer.afkMessage = message.afkMessage || null;
                    
                    if (message.isAfk) {
                        afkPlayer.chatMessage = message.afkMessage;
                        afkPlayer.chatTime = Date.now();
                        afkPlayer.isAfkBubble = true;
                    } else {
                        if (afkPlayer.isAfkBubble) {
                            afkPlayer.chatMessage = null;
                            afkPlayer.chatTime = null;
                            afkPlayer.isAfkBubble = false;
                        }
                    }
                }
                
                if (message.playerId === playerIdRef.current && message.isAfk) {
                    const afkChatMsg = {
                        id: Date.now(),
                        playerId: message.playerId,
                        name: message.name || playerNameRef.current,
                        text: message.afkMessage,
                        timestamp: Date.now(),
                        isAfk: true
                    };
                    setChatMessages(prev => [...prev.slice(-50), afkChatMsg]);
                }
                console.log(`${message.isAfk ? '💤' : '👋'} ${message.name || message.playerId} is ${message.isAfk ? 'now AFK' : 'back'}`);
                break;
            }
                
            case 'pong':
                break;
            
            case 'world_time':
                worldTimeRef.current = message.time;
                if (message.totalPlayers !== undefined) {
                    setTotalPlayerCount(message.totalPlayers);
                }
                break;
            
            case 'room_counts':
                window.dispatchEvent(new CustomEvent('roomCounts', { detail: message.counts }));
                break;
            
            case 'whisper': {
                const whisperMsg = {
                    id: Date.now(),
                    playerId: message.fromId,
                    name: message.fromName,
                    fromName: message.fromName,
                    text: message.text,
                    timestamp: message.timestamp || Date.now(),
                    isWhisper: true,
                    fromMe: false
                };
                setChatMessages(prev => [...prev.slice(-50), whisperMsg]);
                console.log(`💬 Whisper from ${message.fromName}: ${message.text}`);
                break;
            }
            
            case 'whisper_sent': {
                const sentMsg = {
                    id: Date.now(),
                    playerId: null,
                    name: `To [${message.toName}]`,
                    text: message.text,
                    timestamp: message.timestamp || Date.now(),
                    isWhisper: true,
                    fromMe: true
                };
                setChatMessages(prev => [...prev.slice(-50), sentMsg]);
                break;
            }
            
            case 'whisper_error': {
                const errorMsg = {
                    id: Date.now(),
                    playerId: null,
                    name: 'System',
                    text: `Could not whisper to "${message.targetName}": ${message.error}`,
                    timestamp: Date.now(),
                    isSystem: true
                };
                setChatMessages(prev => [...prev.slice(-50), errorMsg]);
                break;
            }
            
            case 'ball_update':
                if (callbacksRef.current.onBallUpdate) {
                    callbacksRef.current.onBallUpdate(message.x, message.z, message.vx, message.vz);
                }
                break;
                
            case 'error':
                console.error(`❌ Server error: ${message.code} - ${message.message}`);
                setConnectionError({ code: message.code, message: message.message });
                break;
        }
    }, []);
    
    // Send message to server
    const send = useCallback((message) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);
    
    // ==================== AUTHENTICATION ====================
    
    /**
     * Connect Phantom wallet and authenticate
     */
    const connectWallet = useCallback(async () => {
        const wallet = walletRef.current;
        
        if (!wallet.isPhantomInstalled()) {
            setAuthError({
                code: 'PHANTOM_NOT_INSTALLED',
                message: 'Please install Phantom wallet to save your progress'
            });
            return { success: false, error: 'PHANTOM_NOT_INSTALLED' };
        }
        
        setIsAuthenticating(true);
        setAuthError(null);
        
        // Step 1: Connect to Phantom
        const connectResult = await wallet.connect();
        if (!connectResult.success) {
            setAuthError({ code: connectResult.error, message: connectResult.message });
            setIsAuthenticating(false);
            return connectResult;
        }
        
        setWalletAddress(connectResult.publicKey);
        
        // Step 2: Request x403 auth challenge from server
        // Include domain for signer confidence message
        send({ 
            type: 'auth_request',
            domain: window.location.host
        });
        
        // Wait for challenge response (max 5 seconds)
        const challenge = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 5000);
            const checkInterval = setInterval(() => {
                if (pendingChallengeRef.current) {
                    clearTimeout(timeout);
                    clearInterval(checkInterval);
                    resolve(pendingChallengeRef.current);
                    pendingChallengeRef.current = null;
                }
            }, 100);
        });
        
        if (!challenge) {
            setAuthError({ code: 'CHALLENGE_TIMEOUT', message: 'Server did not respond with challenge' });
            setIsAuthenticating(false);
            return { success: false, error: 'CHALLENGE_TIMEOUT' };
        }
        
        // Step 3: Sign the x403 challenge message
        // User will see the full message in their wallet for confidence
        const signResult = await wallet.signMessage(challenge.message);
        if (!signResult.success) {
            setAuthError({ code: signResult.error, message: signResult.message });
            setIsAuthenticating(false);
            return signResult;
        }
        
        // Step 4: Send signed challenge to server
        // IMPORTANT: Do NOT send stale data from previous wallet
        // Server is authoritative - it will send back the correct data for this wallet
        const gm = GameManager.getInstance();
        
        // Only include migration data for genuinely new users (localStorage data from before any auth)
        const migrationData = gm.getMigrationData();
        
        send({
            type: 'auth_verify',
            walletAddress: connectResult.publicKey,
            signature: signResult.signature,
            clientData: {
                // DON'T send username - new users should pick it in the designer
                // Server will assign a default "Penguin..." name that they can change
                // Only send migration data for first-time users migrating from localStorage
                migrateFrom: migrationData ? 'localStorage' : null,
                migrationData: migrationData
            }
        });
        
        // Auth response will be handled by message handler
        return { success: true, pending: true };
    }, [send, playerName]);
    
    /**
     * Disconnect wallet and logout
     * CRITICAL: Must clear ALL state to prevent data leaking between accounts
     */
    const disconnectWallet = useCallback(async () => {
        send({ type: 'auth_logout' });
        
        const wallet = walletRef.current;
        await wallet.disconnect();
        
        // Clear all React state
        setIsAuthenticated(false);
        setWalletAddress(null);
        setAuthToken(null);
        setUserData(null);
        
        // Clear ALL auth-related localStorage - prevents session restore with old wallet
        localStorage.removeItem('auth_token');
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('session_timestamp');
        localStorage.removeItem('penguin_name');
        
        // Clear GameManager state including appearance
        GameManager.getInstance().clearServerData();
        
        // Reset session restored flag so next connect can restore fresh session
        sessionRestoredRef.current = false;
    }, [send]);
    
    // Join a room
    const joinRoom = useCallback((room, appearance, puffle = null) => {
        send({
            type: 'join',
            room,
            name: playerName,
            appearance,
            puffle
        });
    }, [send, playerName]);
    
    // Send position update
    const sendPosition = useCallback((position, rotation, pufflePosition = null, trailPoints = null) => {
        const msg = {
            type: 'move',
            position,
            rotation,
            pufflePosition
        };
        if (trailPoints?.length > 0) {
            msg.trailPoints = trailPoints;
        }
        send(msg);
    }, [send]);
    
    const sendChat = useCallback((text) => {
        send({ type: 'chat', text });
    }, [send]);
    
    const sendEmoteBubble = useCallback((text) => {
        send({ type: 'emote_bubble', text });
    }, [send]);
    
    const sendEmote = useCallback((emote, seatedOnFurniture = false) => {
        send({ type: 'emote', emote, seatedOnFurniture });
    }, [send]);
    
    const stopEmote = useCallback(() => {
        send({ type: 'stop_emote' });
    }, [send]);
    
    const changeRoom = useCallback((newRoom) => {
        send({ type: 'change_room', room: newRoom });
    }, [send]);
    
    const updateAppearance = useCallback((appearance) => {
        send({ type: 'update_appearance', appearance });
    }, [send]);
    
    const updatePuffle = useCallback((puffle) => {
        send({ type: 'update_puffle', puffle });
    }, [send]);
    
    // Puffle adoption state
    const [puffleAdopting, setPuffleAdopting] = useState(false);
    const puffleAdoptCallbackRef = useRef(null);
    
    /**
     * Adopt a puffle via server - server handles coin deduction and persistence
     */
    const adoptPuffle = useCallback((color, name) => {
        return new Promise((resolve) => {
            if (!connected) {
                resolve({ success: false, error: 'NOT_CONNECTED', message: 'Not connected to server' });
                return;
            }
            
            if (!isAuthenticated) {
                resolve({ success: false, error: 'AUTH_REQUIRED', message: 'You must be logged in to adopt puffles' });
                return;
            }
            
            setPuffleAdopting(true);
            puffleAdoptCallbackRef.current = resolve;
            
            send({ type: 'puffle_adopt', color, name });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (puffleAdoptCallbackRef.current === resolve) {
                    setPuffleAdopting(false);
                    puffleAdoptCallbackRef.current = null;
                    resolve({ success: false, error: 'TIMEOUT', message: 'Request timed out' });
                }
            }, 10000);
        });
    }, [connected, isAuthenticated, send]);
    
    const sendBallKick = useCallback((x, z, vx, vz) => {
        send({ type: 'ball_kick', x, z, vx, vz });
    }, [send]);
    
    const requestBallSync = useCallback(() => {
        send({ type: 'ball_sync' });
    }, [send]);
    
    const syncCoins = useCallback(() => {
        send({ type: 'coins_sync' });
    }, [send]);
    
    // Update user coins locally (called by ChallengeContext when receiving match results)
    const updateUserCoins = useCallback((coins) => {
        GameManager.getInstance().setCoinsFromServer(coins);
        setUserData(prev => prev ? { ...prev, coins } : prev);
    }, []);
    
    const changeUsername = useCallback((newName) => {
        if (!isAuthenticated) {
            return { success: false, error: 'Not authenticated' };
        }
        send({ type: 'change_username', username: newName });
        return { success: true, pending: true };
    }, [send, isAuthenticated]);
    
    const checkUsername = useCallback((username) => {
        if (!connected) return;
        send({ type: 'check_username', username });
    }, [send, connected]);
    
    const setName = useCallback((name) => {
        setPlayerName(name);
        playerNameRef.current = name;
        // Note: Don't persist to localStorage here - only auth handlers should persist names
    }, []);
    
    const registerCallbacks = useCallback((callbacks) => {
        callbacksRef.current = { ...callbacksRef.current, ...callbacks };
    }, []);
    
    // ==================== PROMO CODE ACTIONS ====================
    /**
     * Redeem a promo code - server handles ALL validation
     * @param {string} code - The promo code to redeem
     * @returns {Promise<object>} - Result from server
     */
    const redeemPromoCode = useCallback((code) => {
        return new Promise((resolve) => {
            if (!connected) {
                resolve({ success: false, error: 'NOT_CONNECTED', message: 'Not connected to server' });
                return;
            }
            
            if (!isAuthenticated) {
                resolve({ success: false, error: 'AUTH_REQUIRED', message: 'You must be logged in to redeem promo codes' });
                return;
            }
            
            if (!code || code.trim().length === 0) {
                resolve({ success: false, error: 'INVALID_CODE', message: 'Please enter a promo code' });
                return;
            }
            
            setPromoLoading(true);
            setPromoResult(null);
            
            // Store callback to resolve promise when server responds
            promoCallbackRef.current = resolve;
            
            // Send to server - server handles ALL validation
            send({ type: 'promo_redeem', code: code.trim().toUpperCase() });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (promoCallbackRef.current === resolve) {
                    setPromoLoading(false);
                    promoCallbackRef.current = null;
                    resolve({ success: false, error: 'TIMEOUT', message: 'Request timed out' });
                }
            }, 10000);
        });
    }, [connected, isAuthenticated, send]);
    
    const clearPromoResult = useCallback(() => {
        setPromoResult(null);
    }, []);
    
    /**
     * Spin a slot machine
     * @param {string} machineId - The slot machine ID
     * @returns {Promise<object>} - Result from server
     */
    const spinSlot = useCallback((machineId) => {
        return new Promise((resolve) => {
            if (!connected) {
                resolve({ error: 'NOT_CONNECTED', message: 'Not connected to server' });
                return;
            }
            
            // Allow both authenticated and guest users to spin
            // Server will handle coin validation
            
            if (!machineId) {
                resolve({ error: 'INVALID_MACHINE', message: 'Invalid slot machine' });
                return;
            }
            
            // Store callback to resolve promise when server responds
            slotCallbackRef.current = resolve;
            
            // Send to server with guest coins and demo flag
            const guestCoins = !isAuthenticated ? GameManager.getInstance().getCoins() : 0;
            const isDemo = !isAuthenticated; // Guests get demo mode (FOMO generator)
            send({ type: 'slot_spin', machineId, guestCoins, isDemo });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (slotCallbackRef.current === resolve) {
                    setSlotSpinning(false);
                    slotCallbackRef.current = null;
                    resolve({ error: 'TIMEOUT', message: 'Request timed out' });
                }
            }, 10000);
        });
    }, [connected, isAuthenticated, send]);
    
    const clearSlotResult = useCallback(() => {
        setSlotResult(null);
    }, []);
    
    /**
     * Start fishing at a spot
     * @param {string} spotId - The fishing spot ID
     * @returns {Promise<object>} - Result from server
     */
    const startFishing = useCallback((spotId) => {
        return new Promise((resolve) => {
            if (!connected) {
                resolve({ error: 'NOT_CONNECTED', message: 'Not connected to server' });
                return;
            }
            
            if (!spotId) {
                resolve({ error: 'INVALID_SPOT', message: 'Invalid fishing spot' });
                return;
            }
            
            fishingCallbackRef.current = resolve;
            
            const guestCoins = !isAuthenticated ? GameManager.getInstance().getCoins() : 0;
            const isDemo = !isAuthenticated;
            send({ type: 'fishing_start', spotId, guestCoins, isDemo });
            
            setTimeout(() => {
                if (fishingCallbackRef.current === resolve) {
                    setFishingActive(false);
                    fishingCallbackRef.current = null;
                    resolve({ error: 'TIMEOUT', message: 'Request timed out' });
                }
            }, 10000);
        });
    }, [connected, isAuthenticated, send]);
    
    /**
     * Attempt to catch a fish (during bite phase - legacy method)
     * @param {string} spotId - The fishing spot ID
     */
    const attemptCatch = useCallback((spotId, fishData = null, depth = 0) => {
        if (!connected || !spotId) return;
        
        // If fish data is provided, this is from the minigame
        if (fishData) {
            send({ 
                type: 'fishing_game_result', 
                spotId, 
                fish: fishData,
                depth,
                success: true
            });
        } else {
            // Legacy timing-based catch
            send({ type: 'fishing_catch', spotId });
        }
    }, [connected, send]);
    
    /**
     * Cancel fishing session or report miss
     * @param {string} spotId - The fishing spot ID
     * @param {number} depth - Optional depth where player missed
     */
    const cancelFishing = useCallback((spotId, depth = 0) => {
        if (!connected || !spotId) return;
        setFishingActive(false);
        
        // If depth is provided, it's a minigame miss (hit bottom)
        if (depth > 0) {
            send({ 
                type: 'fishing_game_result', 
                spotId, 
                success: false,
                depth 
            });
        } else {
            send({ type: 'fishing_cancel', spotId });
        }
    }, [connected, send]);
    
    const clearFishingResult = useCallback(() => {
        setFishingResult(null);
    }, []);
    
    // Connect on mount
    useEffect(() => {
        connect();
        
        return () => {
            clearTimeout(reconnectTimeoutRef.current);
            clearInterval(pingIntervalRef.current);
            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch (e) { /* ignore */ }
                wsRef.current = null;
            }
            setConnected(false);
        };
    }, [connect]);
    
    // Handle visibility change (mobile background/foreground)
    // When app goes to background, WebSocket may disconnect
    // When it comes back, we need to check and reconnect
    useEffect(() => {
        let wasHidden = false;
        let hiddenAt = 0;
        
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Page went to background
                wasHidden = true;
                hiddenAt = Date.now();
                console.log('📱 Page hidden - WebSocket may be suspended');
            } else if (wasHidden) {
                // Page came back from background
                wasHidden = false;
                const hiddenDuration = Date.now() - hiddenAt;
                console.log(`📱 Page visible after ${Math.round(hiddenDuration/1000)}s`);
                
                // If hidden for more than 5 seconds, check WebSocket health
                if (hiddenDuration > 5000) {
                    if (wsRef.current?.readyState !== WebSocket.OPEN) {
                        console.log('📱 WebSocket disconnected while hidden, reconnecting...');
                        connect();
                    } else {
                        // Send immediate ping to verify connection
                        try {
                            wsRef.current.send(JSON.stringify({ type: 'ping' }));
                        } catch (e) {
                            console.log('📱 Ping failed, reconnecting...');
                            connect();
                        }
                    }
                }
            }
        };
        
        // Also handle page hide (iOS Safari doesn't always fire visibilitychange)
        const handlePageHide = () => {
            wasHidden = true;
            hiddenAt = Date.now();
        };
        
        const handlePageShow = (e) => {
            if (e.persisted || wasHidden) {
                wasHidden = false;
                const hiddenDuration = Date.now() - hiddenAt;
                if (hiddenDuration > 5000 && wsRef.current?.readyState !== WebSocket.OPEN) {
                    console.log('📱 Reconnecting after pageshow...');
                    connect();
                }
            }
        };
        
        // Handle focus for Phantom wallet popups on mobile
        const handleFocus = () => {
            if (wasHidden && wsRef.current?.readyState !== WebSocket.OPEN) {
                console.log('📱 Window focused, checking connection...');
                setTimeout(() => {
                    if (wsRef.current?.readyState !== WebSocket.OPEN) {
                        connect();
                    }
                }, 500);
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('focus', handleFocus);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('focus', handleFocus);
        };
    }, [connect]);
    
    const value = {
        // Connection State
        connected,
        playerId,
        playerName,
        playerCount,
        totalPlayerCount,
        playerList,
        getPlayersData,
        playersDataRef,
        worldTimeRef,
        chatMessages,
        serverRoom,
        connectionError,
        
        // Authentication State
        isAuthenticated,
        walletAddress,
        authToken,
        userData,
        isNewUser,
        authError,
        isAuthenticating,
        isRestoringSession,
        
        // Auth Actions
        connectWallet,
        disconnectWallet,
        
        // Promo Code Actions
        redeemPromoCode,
        promoLoading,
        promoResult,
        clearPromoResult,
        
        // Slot Machine Actions
        spinSlot,
        slotSpinning,
        slotResult,
        clearSlotResult,
        activeSlotSpins,
        
        // Ice Fishing Actions
        startFishing,
        attemptCatch,
        cancelFishing,
        fishingActive,
        fishingResult,
        clearFishingResult,
        
        // Puffle Actions
        adoptPuffle,
        puffleAdopting,
        
        // Game Actions
        setName,
        joinRoom,
        sendPosition,
        sendChat,
        sendEmoteBubble,
        sendEmote,
        stopEmote,
        changeRoom,
        updateAppearance,
        updatePuffle,
        sendBallKick,
        requestBallSync,
        registerCallbacks,
        syncCoins,
        updateUserCoins,
        changeUsername,
        checkUsername,
        
        // Raw send for ChallengeContext
        send
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
