/**
 * ChallengeContext - Manages P2P challenge and match state
 * Handles inbox, challenges, active matches, and player profiles
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useMultiplayer } from '../multiplayer';
import GameManager from '../engine/GameManager';
import { sendSPLToken } from '../wallet/SolanaPayment';

// Server custodial wallet for holding wager deposits
// Uses dedicated custodial wallet, falls back to rent wallet for backwards compatibility
const WAGER_CUSTODIAL_WALLET = import.meta.env.VITE_CUSTODIAL_WALLET_ADDRESS || import.meta.env.VITE_RENT_WALLET_ADDRESS;

const ChallengeContext = createContext(null);

// Maximum distance to view/challenge another player
const PROFILE_PROXIMITY_DISTANCE = 8;

export function ChallengeProvider({ children }) {
    const { connected, playerId, playersDataRef, sendChat, updateUserCoins } = useMultiplayer();
    const wsRef = useRef(null);
    
    // Local player position tracking
    const localPlayerPositionRef = useRef({ x: 0, y: 0, z: 0 });
    
    // Inbox state
    const [inbox, setInbox] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    
    // Challenge state
    const [pendingChallenges, setPendingChallenges] = useState([]); // Challenges we've sent
    const [selectedPlayer, setSelectedPlayer] = useState(null); // For profile menu
    const [selectedPlayerStats, setSelectedPlayerStats] = useState(null);
    const selectedPlayerIdRef = useRef(null); // For proximity checking
    
    // Match state
    const [activeMatch, setActiveMatch] = useState(null);
    const [matchState, setMatchState] = useState(null);
    const [matchResult, setMatchResult] = useState(null); // Match end result with token settlement info
    const [isInMatch, setIsInMatch] = useState(false);
    const [shouldDance, setShouldDance] = useState(false); // Winner should dance after match
    
    // Spectating state
    const [activeMatches, setActiveMatches] = useState([]); // Matches in current room
    const [spectatingMatch, setSpectatingMatch] = useState(null);
    
    // UI state
    const [showInbox, setShowInbox] = useState(false);
    const [showWagerModal, setShowWagerModal] = useState(false);
    const [wagerGameType, setWagerGameType] = useState(null);
    const [notification, setNotification] = useState(null);
    
    // Get WebSocket from multiplayer context
    useEffect(() => {
        // Access the WebSocket through window for now (we'll improve this)
        // The multiplayer context exposes the ws through a ref
        const checkWs = setInterval(() => {
            const mp = document.querySelector('[data-multiplayer-ws]');
            if (window.__multiplayerWs) {
                wsRef.current = window.__multiplayerWs;
                clearInterval(checkWs);
            }
        }, 100);
        
        return () => clearInterval(checkWs);
    }, []);
    
    // Show notification helper
    const showNotification = useCallback((message, type = 'info') => {
        setNotification({ message, type, id: Date.now() });
        setTimeout(() => setNotification(null), 4000);
    }, []);
    
    // Update local player position (called from VoxelWorld)
    const updateLocalPosition = useCallback((position) => {
        localPlayerPositionRef.current = position;
    }, []);
    
    // Check proximity between two positions
    const checkProximity = useCallback((pos1, pos2) => {
        if (!pos1 || !pos2) return false;
        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return distance <= PROFILE_PROXIMITY_DISTANCE;
    }, []);
    
    // Proximity checking effect - close profile if players move apart
    // But don't close if wager modal is open (user is actively engaging)
    useEffect(() => {
        if (!selectedPlayer || showWagerModal) return;
        
        const checkInterval = setInterval(() => {
            // Skip if wager modal opened during interval
            if (showWagerModal) return;
            
            // Get selected player's current position from multiplayer data
            const selectedPlayerData = playersDataRef.current?.get(selectedPlayerIdRef.current);
            if (!selectedPlayerData) {
                // Player left the room
                setSelectedPlayer(null);
                selectedPlayerIdRef.current = null;
                return;
            }
            
            const selectedPos = selectedPlayerData.position;
            const localPos = localPlayerPositionRef.current;
            
            if (!checkProximity(localPos, selectedPos)) {
                // Too far apart - close menu
                setSelectedPlayer(null);
                selectedPlayerIdRef.current = null;
                showNotification('Player moved out of range', 'info');
            }
        }, 500); // Check every 500ms
        
        return () => clearInterval(checkInterval);
    }, [selectedPlayer, showWagerModal, playersDataRef, checkProximity, showNotification]);
    
    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event) => {
        try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'inbox_update':
                    setInbox(message.messages || []);
                    setUnreadCount(message.unreadCount || 0);
                    break;
                    
                case 'challenge_received':
                    showNotification(`⚔️ ${message.challenge.challengerName} challenged you to ${message.challenge.gameType}!`, 'challenge');
                    break;
                    
                case 'challenge_sent':
                    showNotification(`Challenge sent to ${message.targetName}!`, 'success');
                    setPendingChallenges(prev => [...prev, { id: message.challengeId, targetName: message.targetName }]);
                    break;
                    
                case 'challenge_error':
                    showNotification(`❌ ${message.message}`, 'error');
                    break;
                    
                case 'player_stats':
                    setSelectedPlayerStats(prev => ({
                        ...prev,
                        [message.playerId]: message.stats
                    }));
                    break;
                
                case 'stats_update':
                    // Update our own stats (received after match end)
                    if (message.stats && playerId) {
                        setSelectedPlayerStats(prev => ({
                            ...prev,
                            [playerId]: message.stats
                        }));
                        console.log('📊 Stats updated:', message.stats);
                    }
                    break;
                    
                case 'match_start':
                    setActiveMatch(message.match);
                    setMatchState(message.initialState);
                    setIsInMatch(true);
                    setShowInbox(false);
                    setSelectedPlayer(null);
                    
                    // Update local coins from server (both GameManager and userData)
                    if (message.coins !== undefined) {
                        updateUserCoins(message.coins);
                    }
                    
                    showNotification(`🎮 Match started against ${message.match.yourRole === 'player1' ? message.match.player2.name : message.match.player1.name}!`, 'success');
                    break;
                    
                case 'match_state':
                    setMatchState(message.state);
                    break;
                
                case 'match_end':
                    const result = message.result;
                    setIsInMatch(false);
                    
                    // Store the match result for UI to display (with token settlement info)
                    setMatchResult(result);
                    
                    // Update local coins from server (both GameManager and userData)
                    if (result.yourCoins !== undefined) {
                        updateUserCoins(result.yourCoins);
                    }
                    
                    // Set dance flag if we won
                    if (result.winnerPlayerId === playerId && result.reason !== 'disconnect') {
                        setShouldDance(true);
                        // Clear dance flag after a few seconds
                        setTimeout(() => setShouldDance(false), 5000);
                    }
                    
                    if (result.reason === 'disconnect') {
                        showNotification(`⚠️ Match voided - opponent disconnected. Wager refunded.`, 'warning');
                    } else if (result.reason === 'forfeit') {
                        if (result.winnerPlayerId === playerId) {
                            showNotification(`🏆 Your opponent forfeited! You won ${result.coinsWon} coins!`, 'success');
                        } else {
                            showNotification(`🏳️ You forfeited the match.`, 'info');
                        }
                    } else if (result.reason === 'draw' || result.winner === 'draw') {
                        showNotification(`🤝 It's a draw! Wager refunded.`, 'info');
                    } else if (result.winnerPlayerId === playerId) {
                        // Build token won message if applicable
                        const tokenMsg = result.tokenSettlement ? 
                            ` + ${result.tokenSettlement.amount} ${result.tokenSettlement.tokenSymbol}` : '';
                        showNotification(`🏆 You won ${result.coinsWon} coins${tokenMsg}!`, 'success');
                    } else {
                        showNotification(`😔 You lost the match.`, 'info');
                    }
                    
                    // DON'T auto-close - let user close manually to view results
                    // Match will be cleared when user clicks "Continue"
                    break;
                    
                case 'match_error':
                    showNotification(`❌ Match error: ${message.error}`, 'error');
                    break;
                    
                case 'match_spectate_start':
                    setActiveMatches(prev => [...prev, {
                        matchId: message.matchId,
                        players: message.players,
                        gameType: message.gameType,
                        wagerAmount: message.wagerAmount
                    }]);
                    break;
                    
                case 'match_spectate':
                    setSpectatingMatch(prev => ({
                        ...prev,
                        [message.matchId]: {
                            players: message.players,
                            state: message.state,
                            wagerAmount: message.wagerAmount,
                            gameType: message.gameType
                        }
                    }));
                    break;
                    
                case 'match_spectate_end':
                    // Update the spectating match with final state and winner info
                    // Keep it visible for 5 seconds so spectators can see the result
                    setSpectatingMatch(prev => {
                        const existing = prev[message.matchId] || {};
                        return {
                            ...prev,
                            [message.matchId]: {
                                ...existing,
                                state: {
                                    ...existing.state,
                                    ...(message.finalState || {}),
                                    // Use the winner from finalState (preserves 'X', 'O', 'R', 'Y', 'draw')
                                    // Only override if not present in finalState
                                    winner: message.finalState?.winner ?? (message.isDraw ? 'draw' : existing.state?.winner),
                                    isComplete: true,
                                    status: 'complete',
                                    reason: message.reason // 'forfeit', 'bankruptcy', 'win', 'draw'
                                },
                                winnerId: message.winnerId,
                                winnerName: message.winnerName,
                                isDraw: message.isDraw,
                                gameType: message.gameType || existing.gameType
                            }
                        };
                    });
                    
                    // Delay removal by 5 seconds so spectators can see the final result
                    setTimeout(() => {
                        setActiveMatches(prev => prev.filter(m => m.matchId !== message.matchId));
                        setSpectatingMatch(prev => {
                            const next = { ...prev };
                            delete next[message.matchId];
                            return next;
                        });
                    }, 5000);
                    break;
                    
                case 'active_matches':
                    setActiveMatches(message.matches || []);
                    break;
                    
                case 'coins_update':
                    updateUserCoins(message.coins);
                    break;
            }
        } catch (e) {
            console.error('ChallengeContext: Failed to parse message', e);
        }
    }, [playerId, showNotification]);
    
    // Register message handler
    useEffect(() => {
        if (!connected) return;
        
        // Get the WebSocket from the multiplayer context
        // We need to tap into the existing connection
        const originalOnMessage = window.__multiplayerWs?.onmessage;
        
        if (window.__multiplayerWs) {
            const ws = window.__multiplayerWs;
            const originalHandler = ws.onmessage;
            
            ws.onmessage = (event) => {
                // Call original handler
                if (originalHandler) {
                    originalHandler(event);
                }
                // Also handle in challenge context
                handleMessage(event);
            };
            
            // Request initial data only if WebSocket is open
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'inbox_sync' }));
                ws.send(JSON.stringify({ type: 'active_matches_request' }));
            }
            
            return () => {
                ws.onmessage = originalHandler;
            };
        }
    }, [connected, handleMessage]);
    
    // Sync local coin changes to server (when player earns coins from activities)
    useEffect(() => {
        if (!connected) return;
        
        const gm = GameManager.getInstance();
        
        // Listen for local coin changes and sync to server
        const unsubscribe = gm.on('coinsChanged', (data) => {
            // Only sync if NOT from server (avoid echo)
            // Server syncs have reason: 'sync' or come from match_end
            if (data.reason !== 'sync') {
                if (window.__multiplayerWs?.readyState === WebSocket.OPEN) {
                    window.__multiplayerWs.send(JSON.stringify({
                        type: 'coins_update',
                        coins: data.coins
                    }));
                    console.log('💰 Synced coins to server:', data.coins);
                }
            }
        });
        
        return () => unsubscribe();
    }, [connected]);
    
    // Send message helper - only send if WebSocket is fully open
    const send = useCallback((message) => {
        const ws = window.__multiplayerWs;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }, []);
    
    // ==================== ACTIONS ====================
    
    // Select a player (open profile)
    const selectPlayer = useCallback((playerData) => {
        if (!playerData || playerData.id === playerId) return;
        
        // Check proximity before opening profile
        const localPos = localPlayerPositionRef.current;
        const targetPos = playerData.position;
        
        if (!checkProximity(localPos, targetPos)) {
            showNotification('Player is too far away', 'info');
            return;
        }
        
        setSelectedPlayer(playerData);
        selectedPlayerIdRef.current = playerData.id;
        
        // Request stats for this player
        send({ type: 'player_stats_request', targetPlayerId: playerData.id });
    }, [playerId, send, checkProximity, showNotification]);
    
    // Clear selected player (close profile)
    const clearSelectedPlayer = useCallback(() => {
        setSelectedPlayer(null);
        selectedPlayerIdRef.current = null;
    }, []);
    
    // Open wager modal for a game type
    const openWagerModal = useCallback((gameType) => {
        setWagerGameType(gameType);
        setShowWagerModal(true);
    }, []);
    
    // Close wager modal
    const closeWagerModal = useCallback(() => {
        setShowWagerModal(false);
        setWagerGameType(null);
    }, []);
    
    // Signing state for UI feedback
    const [isSigningWager, setIsSigningWager] = useState(false);
    
    // Send a challenge
    // tokenWager is optional: { tokenAddress, tokenSymbol, tokenDecimals, tokenAmount, amountRaw }
    const sendChallenge = useCallback(async (targetPlayerId, gameType, wagerAmount, tokenWager = null) => {
        if (!targetPlayerId || !gameType) return;
        // Allow 0 wager in development mode for testing
        const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const hasTokenWager = tokenWager?.tokenAddress && tokenWager?.tokenAmount > 0;
        
        // Must have either coin or token wager (or both) unless in dev mode
        if (!hasTokenWager && (wagerAmount < 0 || (wagerAmount === 0 && !isDev))) return;
        
        const message = {
            type: 'challenge_send',
            targetPlayerId,
            gameType,
            wagerAmount: wagerAmount || 0
        };
        
        // Add token wager if present
        if (hasTokenWager) {
            message.wagerToken = {
                tokenAddress: tokenWager.tokenAddress,
                tokenSymbol: tokenWager.tokenSymbol,
                tokenDecimals: tokenWager.tokenDecimals,
                tokenAmount: tokenWager.tokenAmount,
                amountRaw: tokenWager.amountRaw
            };
            console.log('🪙 Challenge includes token wager:', message.wagerToken);
            
            // CUSTODIAL APPROACH: Send tokens to server wallet NOW
            // This ensures challenger is committed before challenge is created
            if (!WAGER_CUSTODIAL_WALLET) {
                console.error('❌ Custodial wallet not configured');
                showNotification('Wager system not configured', 'error');
                return;
            }
            
            setIsSigningWager(true);
            showNotification(`Sending ${tokenWager.tokenAmount} ${tokenWager.tokenSymbol} wager deposit...`, 'info');
            
            try {
                console.log('💰 Sending wager deposit to custodial wallet...');
                console.log(`   Amount: ${tokenWager.tokenAmount} ${tokenWager.tokenSymbol}`);
                console.log(`   Custodial: ${WAGER_CUSTODIAL_WALLET.slice(0, 8)}...`);
                
                const paymentResult = await sendSPLToken({
                    recipientAddress: WAGER_CUSTODIAL_WALLET,
                    tokenMintAddress: tokenWager.tokenAddress,
                    amount: tokenWager.tokenAmount,
                    memo: `wager_deposit:challenger:${Date.now()}`
                });
                
                if (!paymentResult.success) {
                    console.error('❌ Wager deposit failed:', paymentResult.error);
                    showNotification(`Wager deposit failed: ${paymentResult.message}`, 'error');
                    setIsSigningWager(false);
                    return;
                }
                
                // Include transaction signature as proof of deposit
                message.wagerDepositTx = paymentResult.signature;
                console.log('✅ Wager deposited! Tx:', paymentResult.signature);
                showNotification('Wager deposited! Creating challenge...', 'success');
                
            } catch (err) {
                console.error('❌ Wager deposit error:', err);
                showNotification('Failed to send wager deposit', 'error');
                setIsSigningWager(false);
                return;
            }
            setIsSigningWager(false);
        }
        
        send(message);
        
        closeWagerModal();
        clearSelectedPlayer();
    }, [send, closeWagerModal, clearSelectedPlayer, playersDataRef, showNotification]);
    
    // Accept a challenge
    // If the challenge has a token wager, we need to sign our payment authorization first
    const acceptChallenge = useCallback(async (challengeId, challengeData = null) => {
        // Check if this challenge has a token wager
        const hasTokenWager = challengeData?.wagerToken?.tokenAddress && 
                              (challengeData?.wagerToken?.tokenAmount > 0 || challengeData?.wagerToken?.amountRaw);
        
        let wagerDepositTx = null;
        
        if (hasTokenWager) {
            // CUSTODIAL APPROACH: Send tokens to server wallet NOW
            // This ensures acceptor is committed before match starts
            if (!WAGER_CUSTODIAL_WALLET) {
                console.error('❌ Custodial wallet not configured');
                showNotification('Wager system not configured', 'error');
                return;
            }
            
            const wagerToken = challengeData.wagerToken;
            
            setIsSigningWager(true);
            showNotification(`Sending ${wagerToken.tokenAmount} ${wagerToken.tokenSymbol} wager deposit...`, 'info');
            
            try {
                console.log('💰 Sending wager deposit to custodial wallet (accepting)...');
                console.log(`   Amount: ${wagerToken.tokenAmount} ${wagerToken.tokenSymbol}`);
                console.log(`   Challenge: ${challengeId}`);
                
                const paymentResult = await sendSPLToken({
                    recipientAddress: WAGER_CUSTODIAL_WALLET,
                    tokenMintAddress: wagerToken.tokenAddress,
                    amount: wagerToken.tokenAmount,
                    memo: `wager_deposit:acceptor:${challengeId}`
                });
                
                if (!paymentResult.success) {
                    console.error('❌ Wager deposit failed:', paymentResult.error);
                    showNotification(`Wager deposit failed: ${paymentResult.message}`, 'error');
                    setIsSigningWager(false);
                    return;
                }
                
                wagerDepositTx = paymentResult.signature;
                console.log('✅ Wager deposited! Tx:', paymentResult.signature);
                showNotification('Wager deposited! Starting match...', 'success');
                
            } catch (err) {
                console.error('❌ Wager deposit error on accept:', err);
                showNotification('Failed to send wager deposit', 'error');
                setIsSigningWager(false);
                return;
            }
            setIsSigningWager(false);
        }
        
        const message = {
            type: 'challenge_respond',
            challengeId,
            response: 'accept'
        };
        
        if (wagerDepositTx) {
            message.wagerDepositTx = wagerDepositTx;
        }
        
        send(message);
    }, [send, showNotification]);
    
    // Deny a challenge
    const denyChallenge = useCallback((challengeId) => {
        send({
            type: 'challenge_respond',
            challengeId,
            response: 'deny'
        });
    }, [send]);
    
    // Delete a challenge/message
    const deleteInboxMessage = useCallback((messageId) => {
        // Find the message to check if it's a challenge
        const msg = inbox.find(m => m.id === messageId);
        if (msg && msg.type === 'challenge' && msg.challengeId) {
            send({
                type: 'challenge_respond',
                challengeId: msg.challengeId,
                response: 'delete'
            });
        } else {
            send({
                type: 'inbox_delete',
                messageId
            });
        }
    }, [send, inbox]);
    
    // Play a card in match
    const playCard = useCallback((cardIndex) => {
        if (!activeMatch) return;
        
        send({
            type: 'match_play_card',
            matchId: activeMatch.id,
            cardIndex
        });
    }, [activeMatch, send]);
    
    // Forfeit match
    const forfeitMatch = useCallback(() => {
        if (!activeMatch) return;
        
        send({
            type: 'match_forfeit',
            matchId: activeMatch.id
        });
    }, [activeMatch, send]);
    
    // Clear match state (called when user clicks Continue after match ends)
    const clearMatch = useCallback(() => {
        setIsInMatch(false);
        setActiveMatch(null);
        setMatchState(null);
        setMatchResult(null);
    }, []);
    
    // Sync coins with server
    const syncCoins = useCallback((coins) => {
        send({
            type: 'coins_update',
            coins
        });
    }, [send]);
    
    // Toggle inbox
    const toggleInbox = useCallback(() => {
        setShowInbox(prev => !prev);
    }, []);
    
    // Clear dance flag
    const clearDance = useCallback(() => {
        setShouldDance(false);
    }, []);
    
    const value = {
        // State
        inbox,
        unreadCount,
        selectedPlayer,
        selectedPlayerStats,
        activeMatch,
        matchState,
        matchResult, // Match end result with token settlement info (tx signature, etc.)
        isInMatch,
        activeMatches,
        spectatingMatch,
        showInbox,
        showWagerModal,
        wagerGameType,
        notification,
        pendingChallenges,
        shouldDance,
        isSigningWager, // True while waiting for wallet signature
        
        // Actions
        selectPlayer,
        clearSelectedPlayer,
        openWagerModal,
        closeWagerModal,
        sendChallenge,
        acceptChallenge,
        denyChallenge,
        deleteInboxMessage,
        playCard,
        forfeitMatch,
        clearMatch,
        syncCoins,
        toggleInbox,
        setShowInbox,
        showNotification,
        updateLocalPosition, // For VoxelWorld to update local player position
        clearDance
    };
    
    return (
        <ChallengeContext.Provider value={value}>
            {children}
        </ChallengeContext.Provider>
    );
}

export function useChallenge() {
    const context = useContext(ChallengeContext);
    // Return empty object if not in provider (graceful degradation)
    if (!context) {
        return {
            inbox: [],
            unreadCount: 0,
            selectedPlayer: null,
            selectedPlayerStats: {},
            activeMatch: null,
            matchState: null,
            isInMatch: false,
            shouldDance: false,
            showWagerModal: false,
            selectPlayer: () => {},
            clearSelectedPlayer: () => {},
            updateLocalPosition: () => {},
            showNotification: () => {},
            clearDance: () => {}
        };
    }
    return context;
}

export default ChallengeContext;

