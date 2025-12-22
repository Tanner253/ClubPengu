/**
 * IglooContext - Client-side state management for igloo system
 * Handles igloo data fetching, rental UI state, and entry access checks
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useMultiplayer } from '../multiplayer/MultiplayerContext.jsx';
import { IGLOO_CONFIG } from '../config/solana.js';

const IglooContext = createContext(null);

export const useIgloo = () => {
    const context = useContext(IglooContext);
    if (!context) {
        throw new Error('useIgloo must be used within an IglooProvider');
    }
    return context;
};

export const IglooProvider = ({ children }) => {
    const { send, connected, isAuthenticated, walletAddress } = useMultiplayer();
    
    // Igloo data
    const [igloos, setIgloos] = useState([]); // All igloos public info
    const [myRentals, setMyRentals] = useState([]); // User's rented igloos
    const [selectedIgloo, setSelectedIgloo] = useState(null); // Currently selected igloo for modal
    
    // User clearance tracking - which igloos user can enter directly
    // Map of iglooId -> { canEnter, tokenGateMet, entryFeePaid }
    const [userClearance, setUserClearance] = useState({});
    
    // UI state
    const [showRentalModal, setShowRentalModal] = useState(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [showDetailsPanel, setShowDetailsPanel] = useState(false); // Marketing panel for available igloos
    const [showRequirementsPanel, setShowRequirementsPanel] = useState(false); // Requirements panel for restricted igloos
    const [entryCheckResult, setEntryCheckResult] = useState(null);
    const [pendingIglooEntry, setPendingIglooEntry] = useState(null);
    
    // Current igloo room tracking for eligibility checks
    const [currentIglooRoom, setCurrentIglooRoom] = useState(null);
    const onKickFromIglooRef = useRef(null); // Callback to exit to town
    
    // Loading states
    const [isLoading, setIsLoading] = useState(false);
    
    // Track pending entry for callback
    const pendingIglooEntryRef = useRef(null);
    
    // Eligibility check interval (30 seconds)
    const ELIGIBILITY_CHECK_INTERVAL = 30000;
    
    // Update ref when state changes
    useEffect(() => {
        pendingIglooEntryRef.current = pendingIglooEntry;
    }, [pendingIglooEntry]);
    
    // Handle igloo-related WebSocket messages
    const handleIglooMessage = useCallback((event) => {
        try {
            const msg = JSON.parse(event.data);
            
            // Only process igloo-related messages
            if (!msg.type?.startsWith('igloo_')) return;
            
            switch (msg.type) {
                case 'igloo_list':
                    console.log('🏠 Received igloo list:', msg.igloos?.length, 'igloos');
                    setIgloos(msg.igloos || []);
                    break;
                    
                case 'igloo_my_rentals':
                    console.log('🏠 Received my rentals:', msg.igloos?.length, 'igloos');
                    setMyRentals(msg.igloos || []);
                    break;
                    
                case 'igloo_info':
                    // Update specific igloo in list
                    if (msg.igloo) {
                        setIgloos(prev => prev.map(i => 
                            i.iglooId === msg.igloo.iglooId ? msg.igloo : i
                        ));
                    }
                    break;
                
                case 'igloo_updated':
                    // Broadcast update - another player changed their igloo settings
                    console.log('🏠 Igloo updated (broadcast):', msg.igloo?.iglooId);
                    if (msg.igloo) {
                        const updatedIglooId = msg.igloo.iglooId;
                        
                        // Update igloo data
                        setIgloos(prev => prev.map(i => 
                            i.iglooId === updatedIglooId ? { ...i, ...msg.igloo } : i
                        ));
                        
                        // IMPORTANT: Invalidate user clearance for this igloo
                        // This forces re-checking requirements when user tries to enter
                        // Without this, users would see stale "requirements met" status
                        setUserClearance(prev => {
                            if (prev[updatedIglooId]) {
                                console.log('🔄 Invalidating user clearance for updated igloo:', updatedIglooId);
                                const newClearance = { ...prev };
                                delete newClearance[updatedIglooId];
                                return newClearance;
                            }
                            return prev;
                        });
                    }
                    break;
                    
                case 'igloo_can_rent':
                    // Update rental modal with affordability info
                    break;
                    
                case 'igloo_rent_result':
                    if (msg.success) {
                        // Refresh igloos list and user's rentals
                        send({ type: 'igloo_list' });
                        send({ type: 'igloo_my_rentals' });
                    }
                    setIsLoading(false);
                    break;
                    
                case 'igloo_pay_entry_result':
                    if (msg.success) {
                        // Entry fee paid - update clearance
                        console.log('💰 Entry fee payment recorded for:', msg.iglooId);
                        setUserClearance(prev => ({
                            ...prev,
                            [msg.iglooId]: {
                                ...prev[msg.iglooId],
                                entryFeePaid: true,
                                canEnter: prev[msg.iglooId]?.tokenGateMet !== false, // Can enter if token gate also met
                                checkedAt: Date.now()
                            }
                        }));
                        
                        setShowEntryModal(false);
                        // Trigger the pending room change
                        const pending = pendingIglooEntryRef.current;
                        if (pending) {
                            pending.callback();
                            setPendingIglooEntry(null);
                        }
                    }
                    setIsLoading(false);
                    break;
                    
                case 'igloo_settings_result':
                    console.log('🏠 Settings result:', msg);
                    if (msg.success && msg.igloo) {
                        setMyRentals(prev => prev.map(i =>
                            i.iglooId === msg.igloo.iglooId ? msg.igloo : i
                        ));
                        // Also update the main igloos list
                        setIgloos(prev => prev.map(i =>
                            i.iglooId === msg.igloo.iglooId ? { ...i, ...msg.igloo } : i
                        ));
                        setSelectedIgloo(msg.igloo);
                    }
                    setIsLoading(false);
                    break;
                    
                case 'igloo_owner_info':
                    console.log('🏠 Owner info:', msg);
                    if (msg.igloo) {
                        setSelectedIgloo(msg.igloo);
                    }
                    break;
                    
                case 'igloo_error':
                    console.error('🏠 Igloo error:', msg.error, msg.message);
                    setIsLoading(false);
                    break;
                
                case 'igloo_kicked':
                    // Owner changed settings and we no longer meet requirements
                    console.log('🚪 Kicked from igloo by owner:', msg.reason, msg.message);
                    // Use the same kick handler as eligibility check
                    if (onKickFromIglooRef.current) {
                        onKickFromIglooRef.current(msg.reason || 'SETTINGS_CHANGED');
                    }
                    setCurrentIglooRoom(null);
                    // Clear user clearance for this igloo
                    setUserClearance(prev => {
                        const newClearance = { ...prev };
                        delete newClearance[msg.iglooId];
                        return newClearance;
                    });
                    break;
                    
                case 'igloo_eligibility_check':
                    // Server response to periodic eligibility check
                    console.log('🏠 Eligibility check result:', msg);
                    if (!msg.canEnter && !msg.isOwner) {
                        console.log('🚪 User no longer eligible for igloo, kicking...');
                        // Kick user from igloo
                        if (onKickFromIglooRef.current) {
                            onKickFromIglooRef.current(msg.reason || 'ACCESS_REVOKED');
                        }
                    }
                    break;
                    
                case 'igloo_can_enter':
                    // Server response to entry check (before showing modal)
                    console.log('🏠 Entry check result:', msg);
                    
                    // Always save user's clearance status for this igloo
                    setUserClearance(prev => ({
                        ...prev,
                        [msg.iglooId]: {
                            canEnter: msg.canEnter,
                            tokenGateMet: msg.tokenGateMet,
                            entryFeePaid: msg.entryFeePaid,
                            isOwner: msg.isOwner,
                            checkedAt: Date.now()
                        }
                    }));
                    
                    if (msg.canEnter) {
                        // ✅ User meets all requirements - enter directly!
                        console.log('✅ All requirements met - entering igloo directly');
                        if (pendingIglooEntryRef.current?.iglooId === msg.iglooId) {
                            const callback = pendingIglooEntryRef.current.callback;
                            pendingIglooEntryRef.current = null;
                            setPendingIglooEntry(null);
                            if (callback) callback(msg.iglooId);
                        }
                    } else {
                        // ❌ Requirements not met - show panel with pre-fetched status
                        console.log('❌ Requirements not met:', msg.blockingReason);
                        
                        // Store the entry status for the requirements panel
                        setEntryCheckResult(msg);
                        
                        // Find the igloo and add the status info
                        const igloo = igloos.find(i => i.iglooId === msg.iglooId) || { iglooId: msg.iglooId };
                        setSelectedIgloo({
                            ...igloo,
                            // Pre-populate with server status
                            _entryStatus: {
                                tokenGateMet: msg.tokenGateMet,
                                entryFeePaid: msg.entryFeePaid,
                                userTokenBalance: msg.userTokenBalance,
                                tokenGateRequired: msg.tokenGateRequired,
                                tokenGateSymbol: msg.tokenGateSymbol,
                                entryFeeAmount: msg.entryFeeAmount,
                                entryFeeSymbol: msg.entryFeeSymbol,
                                blockingReason: msg.blockingReason
                            }
                        });
                        
                        // Show requirements panel
                        setShowRequirementsPanel(true);
                        
                        // Clear pending entry
                        pendingIglooEntryRef.current = null;
                        setPendingIglooEntry(null);
                    }
                    break;
            }
        } catch (e) {
            // Not a JSON message or not for us
        }
    }, [send]);
    
    // Register message handler with the WebSocket using addEventListener
    useEffect(() => {
        if (!connected) return;
        
        // Get WebSocket from window (set by MultiplayerContext)
        const ws = window.__multiplayerWs;
        if (!ws) return;
        
        // Add our handler as an additional listener (doesn't interfere with onmessage)
        ws.addEventListener('message', handleIglooMessage);
        
        // Request initial igloo data
        console.log('🏠 IglooContext: Requesting igloo list...');
        send({ type: 'igloo_list' });
        
        return () => {
            // Clean up our listener
            ws.removeEventListener('message', handleIglooMessage);
        };
    }, [connected, handleIglooMessage, send]);
    
    // Fetch user's rentals when authenticated
    useEffect(() => {
        if (send && connected && isAuthenticated && walletAddress) {
            console.log('🏠 IglooContext: Requesting my rentals for wallet:', walletAddress?.slice(0, 8) + '...');
            send({ type: 'igloo_my_rentals' });
        }
    }, [send, connected, isAuthenticated, walletAddress]);
    
    // Clear user clearance when wallet changes (user switched wallets)
    // This ensures each wallet must prove their own eligibility
    useEffect(() => {
        console.log('🔄 Wallet changed - clearing user clearance for all igloos');
        setUserClearance({});
    }, [walletAddress]);
    
    // ==================== ELIGIBILITY CHECKING ====================
    
    /**
     * Immediate kick when authentication changes while inside an igloo
     * If user disconnects wallet while in an igloo, kick them immediately
     */
    useEffect(() => {
        // Only check if we're inside an igloo
        if (!currentIglooRoom) return;
        
        // If user is no longer authenticated, kick them
        if (!isAuthenticated || !walletAddress) {
            console.log('🚪 User lost authentication while in igloo, kicking to town...');
            if (onKickFromIglooRef.current) {
                onKickFromIglooRef.current('AUTH_LOST');
            }
            setCurrentIglooRoom(null);
        }
    }, [isAuthenticated, walletAddress, currentIglooRoom]);
    
    /**
     * Periodic eligibility check while inside an igloo
     * Checks every 30 seconds to ensure user still has access
     */
    useEffect(() => {
        // Only run if inside an igloo and connected
        if (!currentIglooRoom || !send || !connected) return;
        
        // Don't check for guests (they'll be kicked by the auth effect above)
        if (!isAuthenticated || !walletAddress) return;
        
        // Initial check after 5 seconds (give time for initial load)
        const initialCheck = setTimeout(() => {
            console.log('🏠 Running initial eligibility check for:', currentIglooRoom);
            send({ 
                type: 'igloo_eligibility_check', 
                iglooId: currentIglooRoom
                // Server queries real on-chain balance
            });
        }, 5000);
        
        // Periodic check every 30 seconds
        const intervalId = setInterval(() => {
            console.log('🏠 Running periodic eligibility check for:', currentIglooRoom);
            send({ 
                type: 'igloo_eligibility_check', 
                iglooId: currentIglooRoom
                // Server queries real on-chain balance
            });
        }, ELIGIBILITY_CHECK_INTERVAL);
        
        return () => {
            clearTimeout(initialCheck);
            clearInterval(intervalId);
        };
    }, [currentIglooRoom, send, connected, isAuthenticated, walletAddress]);
    
    /**
     * Set the current igloo room (called when entering an igloo)
     */
    const enterIglooRoom = useCallback((iglooId, onKickCallback) => {
        console.log('🏠 Entered igloo:', iglooId);
        setCurrentIglooRoom(iglooId);
        onKickFromIglooRef.current = onKickCallback;
        
        // Track visit on server (for stats)
        if (send) {
            send({ type: 'igloo_visit', iglooId });
        }
    }, [send]);
    
    /**
     * Clear the current igloo room (called when leaving an igloo)
     */
    const leaveIglooRoom = useCallback(() => {
        console.log('🏠 Left igloo');
        setCurrentIglooRoom(null);
        onKickFromIglooRef.current = null;
    }, []);
    
    /**
     * Check if user can enter an igloo
     * Server will check token balance and entry fee status
     * 
     * @param {string} iglooId 
     * @param {Function} onSuccess - Called if entry is allowed (user can enter directly)
     * @returns {boolean} - Always returns false (async check)
     */
    const checkIglooEntry = useCallback((iglooId, onSuccess) => {
        if (!send) {
            // Offline mode - allow entry
            if (onSuccess) onSuccess(iglooId);
            return true;
        }
        
        console.log('🔍 Checking igloo entry requirements:', iglooId);
        
        // Store the pending callback (use ref for message handler access)
        pendingIglooEntryRef.current = { iglooId, callback: onSuccess };
        setPendingIglooEntry({ iglooId, callback: onSuccess });
        
        // Request entry check from server (server queries real on-chain balance)
        send({ 
            type: 'igloo_can_enter', 
            iglooId
        });
        
        // Return false to indicate we need to wait for server response
        return false;
    }, [send]);
    
    /**
     * Open details panel for an available igloo (marketing view)
     */
    const openDetailsPanel = useCallback((iglooId) => {
        const igloo = igloos.find(i => i.iglooId === iglooId);
        setSelectedIgloo(igloo || { iglooId });
        setShowDetailsPanel(true);
    }, [igloos]);
    
    /**
     * Open requirements panel for a restricted igloo (token gate/entry fee)
     */
    const openRequirementsPanel = useCallback((iglooId) => {
        const igloo = igloos.find(i => i.iglooId === iglooId);
        console.log('🏠 Opening requirements panel for:', iglooId, igloo);
        setSelectedIgloo(igloo || { iglooId });
        setShowRequirementsPanel(true);
    }, [igloos]);
    
    /**
     * Open rental modal for an igloo (from details panel or directly)
     */
    const openRentalModal = useCallback((iglooId) => {
        const igloo = igloos.find(i => i.iglooId === iglooId) || selectedIgloo;
        setSelectedIgloo(igloo || { iglooId });
        setShowDetailsPanel(false); // Close details panel if open
        setShowRentalModal(true);
        
        // Request can_rent check
        if (send) {
            send({ type: 'igloo_can_rent', iglooId: iglooId || igloo?.iglooId });
        }
    }, [igloos, selectedIgloo, send]);
    
    /**
     * Open settings panel for owned igloo
     * @param {string|Object} iglooIdOrData - Either an igloo ID string or full igloo data object
     */
    const openSettingsPanel = useCallback((iglooIdOrData) => {
        let igloo;
        let iglooId;
        
        // Accept either an ID string or a full igloo object
        if (typeof iglooIdOrData === 'string') {
            iglooId = iglooIdOrData;
            igloo = myRentals.find(i => i.iglooId === iglooId);
        } else if (iglooIdOrData && typeof iglooIdOrData === 'object') {
            igloo = iglooIdOrData;
            iglooId = igloo.iglooId;
        }
        
        setSelectedIgloo(igloo || { iglooId });  // Set what we have
        setShowSettingsPanel(true);
        
        // Request full owner info (will update selectedIgloo when received)
        if (send && iglooId) {
            send({ type: 'igloo_owner_info', iglooId });
        }
    }, [myRentals, send]);
    
    /**
     * Update igloo settings
     */
    const updateSettings = useCallback((iglooId, settings) => {
        if (!send) return;
        setIsLoading(true);
        send({ type: 'igloo_update_settings', iglooId, settings });
    }, [send]);
    
    /**
     * Get igloo data by ID
     */
    const getIgloo = useCallback((iglooId) => {
        return igloos.find(i => i.iglooId === iglooId);
    }, [igloos]);
    
    /**
     * Check if user owns an igloo
     * Checks both myRentals (from server) AND direct wallet comparison in igloos list
     */
    const isOwner = useCallback((iglooId) => {
        // First check myRentals from server
        if (myRentals.some(i => i.iglooId === iglooId)) {
            return true;
        }
        
        // Also check direct wallet match in igloos list (for permanent owners)
        if (walletAddress) {
            const igloo = igloos.find(i => i.iglooId === iglooId);
            if (igloo?.ownerWallet === walletAddress) {
                return true;
            }
        }
        
        return false;
    }, [myRentals, igloos, walletAddress]);
    
    /**
     * Get banner info for an igloo (for rendering)
     */
    const getBannerInfo = useCallback((iglooId) => {
        const igloo = igloos.find(i => i.iglooId === iglooId);
        if (!igloo) return null;
        
        return {
            ...igloo.banner,
            ownerUsername: igloo.ownerUsername,
            accessType: igloo.accessType,
            hasEntryFee: igloo.hasEntryFee,
            entryFeeAmount: igloo.entryFeeAmount,
            hasTokenGate: igloo.hasTokenGate,
            tokenGateInfo: igloo.tokenGateInfo,
            isRented: igloo.isRented,
            isReserved: igloo.isReserved
        };
    }, [igloos]);
    
    /**
     * Enter igloo in demo mode (for previewing before renting)
     * This triggers a room transition without requiring ownership
     */
    const enterIglooDemo = useCallback((iglooId, onEnterCallback) => {
        setShowDetailsPanel(false);
        // Call the provided callback to trigger the room transition
        if (onEnterCallback) {
            onEnterCallback(iglooId);
        }
    }, []);
    
    const value = {
        // Data
        igloos,
        myRentals,
        selectedIgloo,
        entryCheckResult,
        walletAddress, // Current user's wallet for ownership checks
        currentIglooRoom, // Currently occupied igloo (for eligibility checks)
        
        // UI State
        showRentalModal,
        showSettingsPanel,
        showEntryModal,
        showDetailsPanel,
        showRequirementsPanel,
        isLoading,
        
        // UI Controls
        setShowRentalModal,
        setShowSettingsPanel,
        setShowEntryModal,
        setShowDetailsPanel,
        setShowRequirementsPanel,
        setSelectedIgloo,
        
        // Actions
        checkIglooEntry,
        openRentalModal,
        openDetailsPanel,
        openRequirementsPanel,
        openSettingsPanel,
        updateSettings,
        enterIglooDemo,
        enterIglooRoom,  // Track entering an igloo for eligibility checks
        leaveIglooRoom,  // Track leaving an igloo
        getIgloo,
        isOwner,
        getBannerInfo,
        
        // User clearance - which igloos user can enter directly
        userClearance,
        
        // Config
        config: IGLOO_CONFIG
    };
    
    return (
        <IglooContext.Provider value={value}>
            {children}
        </IglooContext.Provider>
    );
};

export default IglooContext;


