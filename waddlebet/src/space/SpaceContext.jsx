/**
 * SpaceContext - Client-side state management for space system
 * Handles space data fetching, rental UI state, and entry access checks
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useMultiplayer } from '../multiplayer/MultiplayerContext.jsx';
import { SPACE_CONFIG } from '../config/solana.js';

const SpaceContext = createContext(null);

// Default context value for HMR resilience - prevents crash during hot reload
const defaultContextValue = {
    spaces: [],
    myRentals: [],
    selectedSpace: null,
    entryCheckResult: null,
    walletAddress: null,
    currentSpaceRoom: null,
    showRentalModal: false,
    showSettingsPanel: false,
    showEntryModal: false,
    showDetailsPanel: false,
    showRequirementsPanel: false,
    isLoading: false,
    setShowRentalModal: () => {},
    setShowSettingsPanel: () => {},
    setShowEntryModal: () => {},
    setShowDetailsPanel: () => {},
    setShowRequirementsPanel: () => {},
    getSpace: () => null,
    isOwner: () => false,
    checkSpaceEntry: () => {},
    openRentalModal: () => {},
    openDetailsPanel: () => {},
    openRequirementsPanel: () => {},
    openSettingsPanel: () => {},
    updateSettings: () => {},
    payRent: () => {},
    enterSpaceDemo: () => {},
    enterSpaceRoom: () => {},
    leaveSpaceRoom: () => {},
    userClearance: {}
};

export const useSpace = () => {
    const context = useContext(SpaceContext);
    if (!context) {
        // During HMR, context may temporarily be null - return safe defaults
        console.warn('useSpace: Context not available (HMR?), using defaults');
        return defaultContextValue;
    }
    return context;
};

export const SpaceProvider = ({ children }) => {
    const { send, connected, isAuthenticated, walletAddress } = useMultiplayer();
    
    // Space data
    const [spaces, setSpaces] = useState([]); // All spaces public info
    const [myRentals, setMyRentals] = useState([]); // User's rented spaces
    const [selectedSpace, setSelectedSpace] = useState(null); // Currently selected space for modal
    
    // User clearance tracking - which spaces user can enter directly
    // Map of spaceId -> { canEnter, tokenGateMet, entryFeePaid }
    const [userClearance, setUserClearance] = useState({});
    
    // UI state
    const [showRentalModal, setShowRentalModal] = useState(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [showDetailsPanel, setShowDetailsPanel] = useState(false); // Marketing panel for available spaces
    const [showRequirementsPanel, setShowRequirementsPanel] = useState(false); // Requirements panel for restricted spaces
    const [entryCheckResult, setEntryCheckResult] = useState(null);
    const [pendingSpaceEntry, setPendingSpaceEntry] = useState(null);
    
    // Current space room tracking for eligibility checks
    const [currentSpaceRoom, setCurrentSpaceRoom] = useState(null);
    const onKickFromSpaceRef = useRef(null); // Callback to exit to town
    
    // Loading states
    const [isLoading, setIsLoading] = useState(false);
    
    // Track pending entry for callback
    const pendingSpaceEntryRef = useRef(null);
    
    // Eligibility check interval (30 seconds)
    const ELIGIBILITY_CHECK_INTERVAL = 30000;
    
    // Update ref when state changes
    useEffect(() => {
        pendingSpaceEntryRef.current = pendingSpaceEntry;
    }, [pendingSpaceEntry]);
    
    // Handle space-related WebSocket messages
    const handleSpaceMessage = useCallback((event) => {
        try {
            const msg = JSON.parse(event.data);
            
            // Only process space-related messages
            if (!msg.type?.startsWith('space_')) return;
            
            switch (msg.type) {
                case 'space_list':
                    console.log('🏠 Received space list:', msg.spaces?.length, 'spaces');
                    setSpaces(msg.spaces || []);
                    break;
                    
                case 'space_my_rentals':
                    console.log('🏠 Received my rentals:', msg.spaces?.length, 'spaces');
                    setMyRentals(msg.spaces || []);
                    break;
                    
                case 'space_info':
                    // Update specific space in list
                    if (msg.space) {
                        setSpaces(prev => prev.map(i => 
                            i.spaceId === msg.space.spaceId ? msg.space : i
                        ));
                    }
                    break;
                
                case 'space_updated':
                    // Broadcast update - another player changed their space settings
                    console.log('🏠 Space updated (broadcast):', msg.space?.spaceId);
                    if (msg.space) {
                        const updatedSpaceId = msg.space.spaceId;
                        
                        // Update space data
                        setSpaces(prev => prev.map(i => 
                            i.spaceId === updatedSpaceId ? { ...i, ...msg.space } : i
                        ));
                        
                        // IMPORTANT: Invalidate user clearance for this space
                        // This forces re-checking requirements when user tries to enter
                        // Without this, users would see stale "requirements met" status
                        setUserClearance(prev => {
                            if (prev[updatedSpaceId]) {
                                console.log('🔄 Invalidating user clearance for updated space:', updatedSpaceId);
                                const newClearance = { ...prev };
                                delete newClearance[updatedSpaceId];
                                return newClearance;
                            }
                            return prev;
                        });
                    }
                    break;
                    
                case 'space_can_rent':
                    // Update rental modal with affordability info
                    break;
                    
                case 'space_rent_result':
                    if (msg.success) {
                        // Refresh spaces list and user's rentals
                        send({ type: 'space_list' });
                        send({ type: 'space_my_rentals' });
                    }
                    setIsLoading(false);
                    break;
                
                case 'space_pay_rent_result':
                    console.log('🏠 Pay rent result:', msg);
                    if (msg.success) {
                        // Rent paid - refresh rentals to get new due date
                        console.log('✅ Rent paid! New due date:', msg.newDueDate);
                        send({ type: 'space_my_rentals' });
                        send({ type: 'space_list' });
                        
                        // Update selected space if it's the one we just paid rent for
                        if (selectedSpace?.spaceId === msg.spaceId) {
                            setSelectedSpace(prev => prev ? {
                                ...prev,
                                rentStatus: 'current',
                                rentDueDate: msg.newDueDate
                            } : prev);
                        }
                    } else {
                        console.error('❌ Rent payment failed:', msg.error, msg.message);
                    }
                    setIsLoading(false);
                    break;
                    
                case 'space_pay_entry_result':
                    if (msg.success) {
                        // Entry fee paid - update clearance
                        console.log('💰 Entry fee payment recorded for:', msg.spaceId);
                        setUserClearance(prev => ({
                            ...prev,
                            [msg.spaceId]: {
                                ...prev[msg.spaceId],
                                entryFeePaid: true,
                                canEnter: prev[msg.spaceId]?.tokenGateMet !== false, // Can enter if token gate also met
                                checkedAt: Date.now()
                            }
                        }));
                        
                        setShowEntryModal(false);
                        // Trigger the pending room change
                        const pending = pendingSpaceEntryRef.current;
                        if (pending) {
                            pending.callback();
                            setPendingSpaceEntry(null);
                        }
                    }
                    setIsLoading(false);
                    break;
                    
                case 'space_settings_result':
                    console.log('🏠 Settings result:', msg);
                    if (msg.success && msg.space) {
                        setMyRentals(prev => prev.map(i =>
                            i.spaceId === msg.space.spaceId ? msg.space : i
                        ));
                        // Also update the main spaces list
                        setSpaces(prev => prev.map(i =>
                            i.spaceId === msg.space.spaceId ? { ...i, ...msg.space } : i
                        ));
                        setSelectedSpace(msg.space);
                    }
                    setIsLoading(false);
                    break;
                    
                case 'space_owner_info':
                    console.log('🏠 Owner info received:', msg);
                    console.log('🏠 Banner data:', msg.space?.banner);
                    if (msg.space) {
                        setSelectedSpace(msg.space);
                    }
                    break;
                    
                case 'space_error':
                    console.error('🏠 Space error:', msg.error, msg.message);
                    setIsLoading(false);
                    break;
                
                case 'space_kicked':
                    // Owner changed settings and we no longer meet requirements
                    console.log('🚪 Kicked from space by owner:', msg.reason, msg.message);
                    // Use the same kick handler as eligibility check
                    if (onKickFromSpaceRef.current) {
                        onKickFromSpaceRef.current(msg.reason || 'SETTINGS_CHANGED');
                    }
                    setCurrentSpaceRoom(null);
                    // Clear user clearance for this space
                    setUserClearance(prev => {
                        const newClearance = { ...prev };
                        delete newClearance[msg.spaceId];
                        return newClearance;
                    });
                    break;
                    
                case 'space_eligibility_check':
                    // Server response to periodic eligibility check
                    console.log('🏠 Eligibility check result:', msg);
                    if (!msg.canEnter && !msg.isOwner) {
                        console.log('🚪 User no longer eligible for space, kicking...');
                        // Kick user from space
                        if (onKickFromSpaceRef.current) {
                            onKickFromSpaceRef.current(msg.reason || 'ACCESS_REVOKED');
                        }
                    }
                    break;
                    
                case 'space_can_enter':
                    // Server response to entry check (before showing modal)
                    console.log('🏠 Entry check result:', msg);
                    
                    // Always save user's clearance status for this space
                    setUserClearance(prev => ({
                        ...prev,
                        [msg.spaceId]: {
                            canEnter: msg.canEnter,
                            tokenGateMet: msg.tokenGateMet,
                            entryFeePaid: msg.entryFeePaid,
                            isOwner: msg.isOwner,
                            checkedAt: Date.now()
                        }
                    }));
                    
                    if (msg.canEnter) {
                        // ✅ User meets all requirements - enter directly!
                        console.log('✅ All requirements met - entering space directly');
                        if (pendingSpaceEntryRef.current?.spaceId === msg.spaceId) {
                            const callback = pendingSpaceEntryRef.current.callback;
                            pendingSpaceEntryRef.current = null;
                            setPendingSpaceEntry(null);
                            if (callback) callback(msg.spaceId);
                        }
                    } else {
                        // ❌ Requirements not met - show panel with pre-fetched status
                        console.log('❌ Requirements not met:', msg.blockingReason);
                        
                        // Store the entry status for the requirements panel
                        setEntryCheckResult(msg);
                        
                        // Find the space from local cache
                        const cachedSpace = spaces.find(i => i.spaceId === msg.spaceId);
                        
                        // Build space data - use cached data if available, otherwise construct from server response
                        // This ensures the requirements panel has the data it needs even if space list is stale
                        const spaceData = cachedSpace ? {
                            ...cachedSpace,
                            // Always update owner info from server response (more reliable)
                            ownerWallet: msg.ownerWallet || cachedSpace.ownerWallet,
                            ownerUsername: msg.ownerUsername || cachedSpace.ownerUsername,
                        } : {
                            // Fallback: build from server response data
                            spaceId: msg.spaceId,
                            ownerWallet: msg.ownerWallet,
                            ownerUsername: msg.ownerUsername,
                            // Determine access type from what requirements exist
                            accessType: (msg.tokenGateRequired > 0 && msg.entryFeeAmount > 0) ? 'both' :
                                       msg.tokenGateRequired > 0 ? 'token' : 
                                       msg.entryFeeAmount > 0 ? 'fee' : 'public',
                            // Token gate info (if required)
                            hasTokenGate: msg.tokenGateRequired > 0,
                            tokenGateInfo: msg.tokenGateRequired > 0 ? {
                                minimumBalance: msg.tokenGateRequired,
                                tokenSymbol: msg.tokenGateSymbol || 'TOKEN',
                                tokenAddress: msg.tokenGateAddress,
                                minimum: msg.tokenGateRequired
                            } : null,
                            tokenGate: msg.tokenGateRequired > 0 ? {
                                enabled: true,
                                minimumBalance: msg.tokenGateRequired,
                                tokenSymbol: msg.tokenGateSymbol || 'TOKEN',
                                tokenAddress: msg.tokenGateAddress
                            } : null,
                            // Entry fee info (if required)
                            hasEntryFee: msg.entryFeeAmount > 0,
                            entryFeeAmount: msg.entryFeeAmount || 0,
                            entryFeeToken: msg.entryFeeAmount > 0 ? {
                                tokenSymbol: msg.entryFeeSymbol || 'TOKEN',
                                tokenAddress: msg.entryFeeTokenAddress
                            } : null,
                            entryFee: msg.entryFeeAmount > 0 ? {
                                enabled: true,
                                amount: msg.entryFeeAmount,
                                tokenSymbol: msg.entryFeeSymbol || 'TOKEN',
                                tokenAddress: msg.entryFeeTokenAddress
                            } : null
                        };
                        
                        setSelectedSpace({
                            ...spaceData,
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
                        pendingSpaceEntryRef.current = null;
                        setPendingSpaceEntry(null);
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
        ws.addEventListener('message', handleSpaceMessage);
        
        // Request initial space data
        console.log('🏠 SpaceContext: Requesting space list...');
        send({ type: 'space_list' });
        
        return () => {
            // Clean up our listener
            ws.removeEventListener('message', handleSpaceMessage);
        };
    }, [connected, handleSpaceMessage, send]);
    
    // Fetch user's rentals when authenticated
    useEffect(() => {
        if (send && connected && isAuthenticated && walletAddress) {
            console.log('🏠 SpaceContext: Requesting my rentals for wallet:', walletAddress?.slice(0, 8) + '...');
            send({ type: 'space_my_rentals' });
        }
    }, [send, connected, isAuthenticated, walletAddress]);
    
    // Clear user clearance when wallet changes (user switched wallets)
    // This ensures each wallet must prove their own eligibility
    useEffect(() => {
        console.log('🔄 Wallet changed - clearing user clearance for all spaces');
        setUserClearance({});
    }, [walletAddress]);
    
    // ==================== ELIGIBILITY CHECKING ====================
    
    /**
     * Immediate kick when authentication changes while inside an space
     * If user disconnects wallet while in an space, kick them immediately
     */
    useEffect(() => {
        // Only check if we're inside an space
        if (!currentSpaceRoom) return;
        
        // If user is no longer authenticated, kick them
        if (!isAuthenticated || !walletAddress) {
            console.log('🚪 User lost authentication while in space, kicking to town...');
            if (onKickFromSpaceRef.current) {
                onKickFromSpaceRef.current('AUTH_LOST');
            }
            setCurrentSpaceRoom(null);
        }
    }, [isAuthenticated, walletAddress, currentSpaceRoom]);
    
    /**
     * Periodic eligibility check while inside an space
     * Checks every 30 seconds to ensure user still has access
     */
    useEffect(() => {
        // Only run if inside an space and connected
        if (!currentSpaceRoom || !send || !connected) return;
        
        // Don't check for guests (they'll be kicked by the auth effect above)
        if (!isAuthenticated || !walletAddress) return;
        
        // Initial check after 5 seconds (give time for initial load)
        const initialCheck = setTimeout(() => {
            console.log('🏠 Running initial eligibility check for:', currentSpaceRoom);
            send({ 
                type: 'space_eligibility_check', 
                spaceId: currentSpaceRoom
                // Server queries real on-chain balance
            });
        }, 5000);
        
        // Periodic check every 30 seconds
        const intervalId = setInterval(() => {
            console.log('🏠 Running periodic eligibility check for:', currentSpaceRoom);
            send({ 
                type: 'space_eligibility_check', 
                spaceId: currentSpaceRoom
                // Server queries real on-chain balance
            });
        }, ELIGIBILITY_CHECK_INTERVAL);
        
        return () => {
            clearTimeout(initialCheck);
            clearInterval(intervalId);
        };
    }, [currentSpaceRoom, send, connected, isAuthenticated, walletAddress]);
    
    /**
     * Set the current space room (called when entering an space)
     */
    const enterSpaceRoom = useCallback((spaceId, onKickCallback) => {
        console.log('🏠 Entered space:', spaceId);
        setCurrentSpaceRoom(spaceId);
        onKickFromSpaceRef.current = onKickCallback;
        
        // Track visit on server (for stats)
        if (send) {
            send({ type: 'space_visit', spaceId });
        }
    }, [send]);
    
    /**
     * Clear the current space room (called when leaving an space)
     */
    const leaveSpaceRoom = useCallback(() => {
        console.log('🏠 Left space');
        setCurrentSpaceRoom(null);
        onKickFromSpaceRef.current = null;
    }, []);
    
    /**
     * Check if user can enter an space
     * Server will check token balance and entry fee status
     * 
     * @param {string} spaceId 
     * @param {Function} onSuccess - Called if entry is allowed (user can enter directly)
     * @returns {boolean} - Always returns false (async check)
     */
    const checkSpaceEntry = useCallback((spaceId, onSuccess) => {
        if (!send) {
            // Offline mode - allow entry
            if (onSuccess) onSuccess(spaceId);
            return true;
        }
        
        console.log('🔍 Checking space entry requirements:', spaceId);
        
        // Store the pending callback (use ref for message handler access)
        pendingSpaceEntryRef.current = { spaceId, callback: onSuccess };
        setPendingSpaceEntry({ spaceId, callback: onSuccess });
        
        // Request entry check from server (server queries real on-chain balance)
        send({ 
            type: 'space_can_enter', 
            spaceId
        });
        
        // Return false to indicate we need to wait for server response
        return false;
    }, [send]);
    
    /**
     * Open details panel for an available space (marketing view)
     */
    const openDetailsPanel = useCallback((spaceId) => {
        const space = spaces.find(i => i.spaceId === spaceId);
        setSelectedSpace(space || { spaceId });
        setShowDetailsPanel(true);
    }, [spaces]);
    
    /**
     * Open requirements panel for a restricted space (token gate/entry fee)
     */
    const openRequirementsPanel = useCallback((spaceId) => {
        const space = spaces.find(i => i.spaceId === spaceId);
        console.log('🏠 Opening requirements panel for:', spaceId, space);
        setSelectedSpace(space || { spaceId });
        setShowRequirementsPanel(true);
    }, [spaces]);
    
    /**
     * Open rental modal for an space (from details panel or directly)
     */
    const openRentalModal = useCallback((spaceId) => {
        const space = spaces.find(i => i.spaceId === spaceId) || selectedSpace;
        setSelectedSpace(space || { spaceId });
        setShowDetailsPanel(false); // Close details panel if open
        setShowRentalModal(true);
        
        // Request can_rent check
        if (send) {
            send({ type: 'space_can_rent', spaceId: spaceId || space?.spaceId });
        }
    }, [spaces, selectedSpace, send]);
    
    /**
     * Open settings panel for owned space
     * @param {string|Object} spaceIdOrData - Either an space ID string or full space data object
     */
    const openSettingsPanel = useCallback((spaceIdOrData) => {
        let space;
        let spaceId;
        
        // Accept either an ID string or a full space object
        if (typeof spaceIdOrData === 'string') {
            spaceId = spaceIdOrData;
            space = myRentals.find(i => i.spaceId === spaceId);
        } else if (spaceIdOrData && typeof spaceIdOrData === 'object') {
            space = spaceIdOrData;
            spaceId = space.spaceId;
        }
        
        setSelectedSpace(space || { spaceId });  // Set what we have
        setShowSettingsPanel(true);
        
        // Request full owner info (will update selectedSpace when received)
        if (send && spaceId) {
            send({ type: 'space_owner_info', spaceId });
        }
    }, [myRentals, send]);
    
    /**
     * Update space settings
     */
    const updateSettings = useCallback((spaceId, settings) => {
        if (!send) return;
        setIsLoading(true);
        send({ type: 'space_update_settings', spaceId, settings });
    }, [send]);
    
    /**
     * Pay rent for an space (renewal)
     * @param {string} spaceId - ID of the space
     * @param {string} transactionSignature - Solana transaction signature from the rent payment
     */
    const payRent = useCallback((spaceId, transactionSignature) => {
        if (!send) return;
        console.log('🏠 Sending rent payment to server:', spaceId);
        setIsLoading(true);
        send({ 
            type: 'space_pay_rent', 
            spaceId, 
            transactionSignature 
        });
    }, [send]);
    
    /**
     * Get space data by ID
     */
    const getSpace = useCallback((spaceId) => {
        return spaces.find(i => i.spaceId === spaceId);
    }, [spaces]);
    
    /**
     * Check if user owns an space
     * Checks both myRentals (from server) AND direct wallet comparison in spaces list
     */
    const isOwner = useCallback((spaceId) => {
        // First check myRentals from server
        if (myRentals.some(i => i.spaceId === spaceId)) {
            return true;
        }
        
        // Also check direct wallet match in spaces list (for permanent owners)
        if (walletAddress) {
            const space = spaces.find(i => i.spaceId === spaceId);
            if (space?.ownerWallet === walletAddress) {
                return true;
            }
        }
        
        return false;
    }, [myRentals, spaces, walletAddress]);
    
    /**
     * Get banner info for an space (for rendering)
     */
    const getBannerInfo = useCallback((spaceId) => {
        const space = spaces.find(i => i.spaceId === spaceId);
        if (!space) return null;
        
        return {
            ...space.banner,
            ownerUsername: space.ownerUsername,
            accessType: space.accessType,
            hasEntryFee: space.hasEntryFee,
            entryFeeAmount: space.entryFeeAmount,
            hasTokenGate: space.hasTokenGate,
            tokenGateInfo: space.tokenGateInfo,
            isRented: space.isRented,
            isReserved: space.isReserved
        };
    }, [spaces]);
    
    /**
     * Enter space in demo mode (for previewing before renting)
     * This triggers a room transition without requiring ownership
     */
    const enterSpaceDemo = useCallback((spaceId, onEnterCallback) => {
        setShowDetailsPanel(false);
        // Call the provided callback to trigger the room transition
        if (onEnterCallback) {
            onEnterCallback(spaceId);
        }
    }, []);
    
    const value = {
        // Data
        spaces,
        myRentals,
        selectedSpace,
        entryCheckResult,
        walletAddress, // Current user's wallet for ownership checks
        currentSpaceRoom, // Currently occupied space (for eligibility checks)
        
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
        setSelectedSpace,
        
        // Actions
        checkSpaceEntry,
        openRentalModal,
        openDetailsPanel,
        openRequirementsPanel,
        openSettingsPanel,
        updateSettings,
        payRent,         // Pay rent renewal for owned space
        enterSpaceDemo,
        enterSpaceRoom,  // Track entering an space for eligibility checks
        leaveSpaceRoom,  // Track leaving an space
        getSpace,
        isOwner,
        getBannerInfo,
        
        // User clearance - which spaces user can enter directly
        userClearance,
        
        // Config
        config: SPACE_CONFIG
    };
    
    return (
        <SpaceContext.Provider value={value}>
            {children}
        </SpaceContext.Provider>
    );
};

export default SpaceContext;


