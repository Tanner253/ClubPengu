/**
 * Space WebSocket Message Handlers
 * Handle all space-related operations: rental, entry, settings
 */

import spaceService from '../services/SpaceService.js';
import solanaPaymentService from '../services/SolanaPaymentService.js';
import rateLimiter from '../utils/RateLimiter.js';

/**
 * Handle space-related messages
 * @param {string} playerId - Player ID
 * @param {Object} player - Player state object
 * @param {Object} message - The message
 * @param {Function} sendToPlayer - Send message to specific player
 * @param {Function} broadcastToAll - Broadcast to all connected players
 * @param {Function} getPlayersInRoom - Get all players in a specific room
 * @returns {Object|null} - Response or null if message not handled
 */
export async function handleSpaceMessage(playerId, player, message, sendToPlayer, broadcastToAll, getPlayersInRoom) {
    switch (message.type) {
        // ==================== GET ALL SPACES INFO ====================
        case 'space_list': {
            try {
                const spaces = await spaceService.getAllSpaces();
                sendToPlayer(playerId, {
                    type: 'space_list',
                    spaces
                });
            } catch (error) {
                console.error('🏠 Error in space_list:', error);
                sendToPlayer(playerId, {
                    type: 'space_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to fetch space list'
                });
            }
            return true;
        }
        
        // ==================== GET SINGLE SPACE INFO ====================
        case 'space_info': {
            try {
                const { spaceId } = message;
                const space = await spaceService.getSpace(spaceId);
                
                if (!space) {
                    sendToPlayer(playerId, {
                        type: 'space_error',
                        error: 'SPACE_NOT_FOUND',
                        message: 'Space not found'
                    });
                    return true;
                }
                
                sendToPlayer(playerId, {
                    type: 'space_info',
                    space
                });
            } catch (error) {
                console.error('🏠 Error in space_info:', error);
            }
            return true;
        }
        
        // ==================== CHECK IF CAN RENT ====================
        case 'space_can_rent': {
            try {
                const { spaceId } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'space_can_rent',
                        canRent: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'Please connect your wallet to rent'
                    });
                    return true;
                }
                
                const result = await spaceService.canRent(player.walletAddress, spaceId);
                sendToPlayer(playerId, {
                    type: 'space_can_rent',
                    spaceId,
                    ...result
                });
            } catch (error) {
                console.error('🏠 Error in space_can_rent:', error);
            }
            return true;
        }
        
        // ==================== RENT AN SPACE ====================
        case 'space_rent': {
            try {
                const { spaceId, transactionSignature } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'space_rent_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                if (!transactionSignature) {
                    sendToPlayer(playerId, {
                        type: 'space_rent_result',
                        success: false,
                        error: 'MISSING_PAYMENT',
                        message: 'Transaction signature required'
                    });
                    return true;
                }
                
                const result = await spaceService.startRental(
                    player.walletAddress,
                    spaceId,
                    transactionSignature
                );
                
                sendToPlayer(playerId, {
                    type: 'space_rent_result',
                    ...result
                });
                
                // If successful, broadcast updated space to ALL players
                if (result.success && broadcastToAll) {
                    const publicSpace = await spaceService.getSpace(spaceId);
                    broadcastToAll({
                        type: 'space_updated',
                        space: publicSpace
                    });
                    console.log(`📢 Broadcast space rental: ${spaceId} now owned by ${player.name}`);
                }
                
            } catch (error) {
                console.error('🏠 Error in space_rent:', error);
                sendToPlayer(playerId, {
                    type: 'space_rent_result',
                    success: false,
                    error: 'SERVER_ERROR'
                });
            }
            return true;
        }
        
        // ==================== PAY DAILY RENT ====================
        case 'space_pay_rent': {
            try {
                const { spaceId, transactionSignature } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'space_pay_rent_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                if (!transactionSignature) {
                    sendToPlayer(playerId, {
                        type: 'space_pay_rent_result',
                        success: false,
                        error: 'MISSING_PAYMENT',
                        message: 'Transaction signature required'
                    });
                    return true;
                }
                
                const result = await spaceService.payRent(
                    player.walletAddress,
                    spaceId,
                    transactionSignature
                );
                
                sendToPlayer(playerId, {
                    type: 'space_pay_rent_result',
                    ...result
                });
                
                // Broadcast rent payment to all (updates rent status display)
                if (result.success && broadcastToAll) {
                    const publicSpace = await spaceService.getSpace(spaceId);
                    broadcastToAll({
                        type: 'space_updated',
                        space: publicSpace
                    });
                }
                
            } catch (error) {
                console.error('🏠 Error in space_pay_rent:', error);
            }
            return true;
        }
        
        // ==================== CHECK IF CAN ENTER (quick check before showing modal) ====================
        case 'space_can_enter': {
            try {
                const { spaceId } = message;
                const walletAddress = player.walletAddress || null;
                
                // Rate limit entry checks to prevent abuse
                if (walletAddress) {
                    const rateCheck = rateLimiter.check('entry_check', walletAddress);
                    if (!rateCheck.allowed) {
                        sendToPlayer(playerId, {
                            type: 'space_can_enter',
                            spaceId,
                            canEnter: false,
                            reason: 'RATE_LIMITED',
                            message: 'Too many requests. Please wait.',
                            retryAfterMs: rateCheck.retryAfterMs
                        });
                        return true;
                    }
                }
                
                // Get space data
                const space = await spaceService.getSpaceRaw(spaceId);
                if (!space) {
                    sendToPlayer(playerId, {
                        type: 'space_can_enter',
                        spaceId,
                        canEnter: false,
                        reason: 'SPACE_NOT_FOUND'
                    });
                    return true;
                }
                
                // Owner always has access
                const isOwner = walletAddress && walletAddress === space.ownerWallet;
                if (isOwner) {
                    sendToPlayer(playerId, {
                        type: 'space_can_enter',
                        spaceId,
                        canEnter: true,
                        isOwner: true
                    });
                    return true;
                }
                
                // PRIVATE space - only owner can enter
                if (space.accessType === 'private') {
                    sendToPlayer(playerId, {
                        type: 'space_can_enter',
                        spaceId,
                        canEnter: false,
                        isOwner: false,
                        blockingReason: 'SPACE_LOCKED',
                        message: 'This space is private'
                    });
                    return true;
                }
                
                // PUBLIC space - anyone can enter (no restrictions)
                if (space.accessType === 'public') {
                    sendToPlayer(playerId, {
                        type: 'space_can_enter',
                        spaceId,
                        canEnter: true,
                        isOwner: false
                    });
                    return true;
                }
                
                // TOKEN, FEE, or BOTH access types - check requirements
                let tokenGateMet = true;
                let entryFeePaid = true;
                let userTokenBalance = 0;
                
                // Check token gate (query real balance) - only for 'token' or 'both' access
                if ((space.accessType === 'token' || space.accessType === 'both') && 
                    space.tokenGate?.enabled && space.tokenGate?.tokenAddress) {
                    try {
                        const balanceCheck = await solanaPaymentService.checkMinimumBalance(
                            walletAddress,
                            space.tokenGate.tokenAddress,
                            space.tokenGate.minimumBalance || 0
                        );
                        userTokenBalance = balanceCheck.balance;
                        tokenGateMet = balanceCheck.hasBalance;
                    } catch (e) {
                        console.error('Error checking token balance for entry:', e);
                        // SECURITY: Fail CLOSED - do NOT allow entry on error
                        tokenGateMet = false;
                        userTokenBalance = 0;
                    }
                }
                
                // Check entry fee (from database) - only for 'fee' or 'both' access
                if ((space.accessType === 'fee' || space.accessType === 'both') &&
                    space.entryFee?.enabled && space.entryFee?.amount > 0) {
                    const paidEntry = space.paidEntryFees?.find(p => p.walletAddress === walletAddress);
                    entryFeePaid = !!paidEntry;
                }
                
                // Determine if user can enter directly
                const canEnter = tokenGateMet && entryFeePaid;
                
                sendToPlayer(playerId, {
                    type: 'space_can_enter',
                    spaceId,
                    canEnter,
                    isOwner: false,
                    // Detailed status for UI
                    tokenGateMet,
                    entryFeePaid,
                    userTokenBalance,
                    // Requirements info
                    tokenGateRequired: space.tokenGate?.enabled ? space.tokenGate.minimumBalance : 0,
                    tokenGateSymbol: space.tokenGate?.tokenSymbol || 'TOKEN',
                    tokenGateAddress: space.tokenGate?.tokenAddress || null,
                    entryFeeAmount: space.entryFee?.amount || 0,
                    entryFeeSymbol: space.entryFee?.tokenSymbol || 'TOKEN',
                    entryFeeTokenAddress: space.entryFee?.tokenAddress || null,
                    // Owner info (needed for payments)
                    ownerWallet: space.ownerWallet,
                    ownerUsername: space.ownerUsername || space.reservedOwnerName,
                    // What's blocking entry (if anything)
                    blockingReason: !tokenGateMet ? 'TOKEN_REQUIRED' : !entryFeePaid ? 'FEE_REQUIRED' : null
                });
                
            } catch (error) {
                console.error('🏠 Error in space_can_enter:', error);
                sendToPlayer(playerId, {
                    type: 'space_can_enter',
                    spaceId: message.spaceId,
                    canEnter: false,
                    reason: 'SERVER_ERROR'
                });
            }
            return true;
        }
        
        // ==================== ELIGIBILITY CHECK (periodic while in space) ====================
        case 'space_eligibility_check': {
            try {
                const { spaceId } = message;
                const walletAddress = player.walletAddress || null;
                
                // Guests automatically fail eligibility (they shouldn't be in spaces)
                if (!player.isAuthenticated || !walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'space_eligibility_check',
                        spaceId,
                        canEnter: false,
                        isOwner: false,
                        reason: 'NOT_AUTHENTICATED',
                        message: 'You must be logged in to stay in this space'
                    });
                    return true;
                }
                
                // Rate limit eligibility checks
                const rateCheck = rateLimiter.check('entry_check', walletAddress);
                if (!rateCheck.allowed) {
                    // If rate limited, assume they can stay (don't kick for rate limiting)
                    // This prevents abuse but doesn't break UX
                    console.warn(`🚫 Eligibility check rate limited for ${walletAddress.slice(0, 8)}... - allowing stay`);
                    sendToPlayer(playerId, {
                        type: 'space_eligibility_check',
                        spaceId,
                        canEnter: true,  // Don't kick them for rate limiting
                        rateLimited: true
                    });
                    return true;
                }
                
                // Get space data to check requirements
                const space = await spaceService.getSpaceRaw(spaceId);
                if (!space) {
                    sendToPlayer(playerId, {
                        type: 'space_eligibility_check',
                        spaceId,
                        canEnter: false,
                        reason: 'SPACE_NOT_FOUND'
                    });
                    return true;
                }
                
                // Owner always has access
                const isOwner = walletAddress === space.ownerWallet;
                if (isOwner) {
                    sendToPlayer(playerId, {
                        type: 'space_eligibility_check',
                        spaceId,
                        canEnter: true,
                        isOwner: true
                    });
                    return true;
                }
                
                // Query REAL on-chain token balance (don't trust client!)
                let tokenBalance = 0;
                let balanceCheckFailed = false;
                if (space.tokenGate?.enabled && space.tokenGate?.tokenAddress) {
                    try {
                        const balanceCheck = await solanaPaymentService.checkMinimumBalance(
                            walletAddress,
                            space.tokenGate.tokenAddress,
                            space.tokenGate.minimumBalance || 0
                        );
                        tokenBalance = balanceCheck.balance;
                    } catch (e) {
                        console.error('Error checking token balance for eligibility:', e);
                        // SECURITY: On error, mark check as failed but don't kick immediately
                        // Give ONE grace period before kicking (in case of temporary RPC issues)
                        balanceCheckFailed = true;
                        tokenBalance = 0;
                    }
                }
                
                const result = await spaceService.canEnter(
                    walletAddress,
                    spaceId,
                    tokenBalance
                );
                
                sendToPlayer(playerId, {
                    type: 'space_eligibility_check',
                    spaceId,
                    ...result
                });
                
                // Log if user is being kicked
                if (!result.canEnter && !result.isOwner) {
                    console.log(`🚪 Eligibility check failed for ${walletAddress?.slice(0, 8)}... in ${spaceId}: ${result.reason}`);
                }
                
            } catch (error) {
                console.error('🏠 Error in space_eligibility_check:', error);
            }
            return true;
        }
        
        // ==================== CHECK REQUIREMENTS (for requirements panel) ====================
        case 'space_check_requirements': {
            try {
                const { spaceId } = message;
                const walletAddress = player.walletAddress || null;
                
                // Get space data (raw to access paidEntryFees)
                const space = await spaceService.getSpaceRaw(spaceId);
                
                if (!space) {
                    sendToPlayer(playerId, {
                        type: 'space_requirements_status',
                        spaceId,
                        error: 'Space not found'
                    });
                    return true;
                }
                
                // Check if user is authenticated
                if (!player.isAuthenticated || !walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'space_requirements_status',
                        spaceId,
                        error: 'Please connect your wallet',
                        userTokenBalance: 0,
                        tokenGateMet: false,
                        entryFeePaid: false
                    });
                    return true;
                }
                
                // Get user's token balance for the token gate token
                let userTokenBalance = 0;
                let tokenGateMet = true; // Default to true if no token gate
                
                if (space.tokenGate?.enabled && space.tokenGate?.tokenAddress) {
                    try {
                        // Query actual token balance from Solana
                        const balanceCheck = await solanaPaymentService.checkMinimumBalance(
                            walletAddress,
                            space.tokenGate.tokenAddress,
                            space.tokenGate.minimumBalance || 0
                        );
                        userTokenBalance = balanceCheck.balance;
                        tokenGateMet = balanceCheck.hasBalance;
                    } catch (e) {
                        console.error('Error checking token balance:', e);
                        userTokenBalance = 0;
                        tokenGateMet = false;
                    }
                }
                
                // Check if entry fee has been paid
                let entryFeePaid = true; // Default to true if no entry fee
                if (space.entryFee?.enabled && space.entryFee?.amount > 0) {
                    const paidEntry = space.paidEntryFees?.find(p => p.walletAddress === walletAddress);
                    entryFeePaid = !!paidEntry;
                }
                
                // Owner always has access
                const isOwner = walletAddress === space.ownerWallet;
                if (isOwner) {
                    tokenGateMet = true;
                    entryFeePaid = true;
                }
                
                sendToPlayer(playerId, {
                    type: 'space_requirements_status',
                    spaceId,
                    isOwner,
                    userTokenBalance,
                    tokenGateMet,
                    entryFeePaid,
                    // Include requirement details for UI
                    tokenGateRequired: space.tokenGate?.enabled ? space.tokenGate.minimumBalance : 0,
                    tokenGateSymbol: space.tokenGate?.tokenSymbol || 'TOKEN',
                    entryFeeAmount: space.entryFee?.amount || 0,
                    entryFeeSymbol: space.entryFee?.tokenSymbol || 'TOKEN'
                });
                
            } catch (error) {
                console.error('🏠 Error in space_check_requirements:', error);
                sendToPlayer(playerId, {
                    type: 'space_requirements_status',
                    spaceId: message.spaceId,
                    error: 'Failed to check requirements'
                });
            }
            return true;
        }
        
        // ==================== PAY ENTRY FEE ====================
        case 'space_pay_entry': {
            try {
                const { spaceId, transactionSignature } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'space_pay_entry_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                // Require transaction signature
                if (!transactionSignature) {
                    sendToPlayer(playerId, {
                        type: 'space_pay_entry_result',
                        success: false,
                        error: 'MISSING_SIGNATURE',
                        message: 'Transaction signature required'
                    });
                    return true;
                }
                
                // First check if token gate is met (if applicable)
                const space = await spaceService.getSpaceRaw(spaceId);
                if (space && space.tokenGate?.enabled && space.tokenGate?.tokenAddress) {
                    const balanceCheck = await solanaPaymentService.checkMinimumBalance(
                        player.walletAddress,
                        space.tokenGate.tokenAddress,
                        space.tokenGate.minimumBalance || 0
                    );
                    
                    if (!balanceCheck.hasBalance) {
                        sendToPlayer(playerId, {
                            type: 'space_pay_entry_result',
                            success: false,
                            error: 'TOKEN_GATE_NOT_MET',
                            message: `You need at least ${space.tokenGate.minimumBalance} tokens to pay the entry fee`,
                            required: space.tokenGate.minimumBalance,
                            current: balanceCheck.balance
                        });
                        return true;
                    }
                }
                
                // Verify and record the payment
                const result = await spaceService.payEntryFee(
                    player.walletAddress,
                    spaceId,
                    transactionSignature  // Now a real tx signature, not signed intent
                );
                
                // ========== AUDIT LOGGING ==========
                if (result.success) {
                    console.log('═══════════════════════════════════════════════════════════');
                    console.log('💰 [PAYMENT RECORDED] Space Entry Fee');
                    console.log('═══════════════════════════════════════════════════════════');
                    console.log(`   Timestamp:    ${new Date().toISOString()}`);
                    console.log(`   Space:        ${spaceId}`);
                    console.log(`   Payer:        ${player.walletAddress}`);
                    console.log(`   Recipient:    ${space?.ownerWallet || 'unknown'}`);
                    console.log(`   Amount:       ${space?.entryFee?.amount || 0} ${space?.entryFee?.tokenSymbol || 'TOKEN'}`);
                    console.log(`   Token:        ${space?.entryFee?.tokenAddress || 'unknown'}`);
                    console.log(`   TX Signature: ${transactionSignature}`);
                    console.log(`   Solscan:      https://solscan.io/tx/${transactionSignature}`);
                    console.log('═══════════════════════════════════════════════════════════');
                } else {
                    console.warn('⚠️ [PAYMENT FAILED] Space Entry Fee');
                    console.warn(`   Timestamp:    ${new Date().toISOString()}`);
                    console.warn(`   Space:        ${spaceId}`);
                    console.warn(`   Payer:        ${player.walletAddress}`);
                    console.warn(`   TX Signature: ${transactionSignature}`);
                    console.warn(`   Error:        ${result.error}`);
                    console.warn(`   Message:      ${result.message || 'No message'}`);
                }
                
                sendToPlayer(playerId, {
                    type: 'space_pay_entry_result',
                    spaceId,
                    ...result
                });
                
                // Broadcast to owner so they see updated fees collected
                // (Only broadcast stats update, not full space info)
                if (result.success && broadcastToAll && space?.ownerWallet) {
                    const updatedSpace = await spaceService.getSpace(spaceId);
                    broadcastToAll({
                        type: 'space_updated',
                        space: updatedSpace
                    });
                }
                
            } catch (error) {
                console.error('🏠 Error in space_pay_entry:', error);
                console.error('═══════════════════════════════════════════════════════════');
                console.error('❌ [PAYMENT ERROR] Space Entry Fee - Unhandled Exception');
                console.error(`   Timestamp:    ${new Date().toISOString()}`);
                console.error(`   Space:        ${message.spaceId}`);
                console.error(`   Payer:        ${player.walletAddress}`);
                console.error(`   TX Signature: ${message.transactionSignature}`);
                console.error(`   Error:        ${error.message}`);
                console.error('═══════════════════════════════════════════════════════════');
                
                sendToPlayer(playerId, {
                    type: 'space_pay_entry_result',
                    success: false,
                    error: 'SERVER_ERROR',
                    message: 'Failed to process entry fee payment'
                });
            }
            return true;
        }
        
        // ==================== GET OWNER SETTINGS ====================
        case 'space_owner_info': {
            try {
                const { spaceId } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'space_owner_info',
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const result = await spaceService.getSpaceForOwner(
                    spaceId,
                    player.walletAddress
                );
                
                sendToPlayer(playerId, {
                    type: 'space_owner_info',
                    spaceId,
                    ...(result.error ? { error: result.error } : { space: result })
                });
                
            } catch (error) {
                console.error('🏠 Error in space_owner_info:', error);
            }
            return true;
        }
        
        // ==================== UPDATE SETTINGS ====================
        case 'space_update_settings': {
            try {
                const { spaceId, settings } = message;
                
                console.log('🏠 [Handler] Received settings update for:', spaceId);
                console.log('🏠 [Handler] Banner settings received:', JSON.stringify(settings?.banner, null, 2));
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'space_settings_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const result = await spaceService.updateSettings(
                    player.walletAddress,
                    spaceId,
                    settings
                );
                
                // Send result to owner
                sendToPlayer(playerId, {
                    type: 'space_settings_result',
                    ...result
                });
                
                // If successful, broadcast updated space to ALL players so they see the new settings
                if (result.success && result.space && broadcastToAll) {
                    // Get public info (safe for all clients)
                    const publicSpace = await spaceService.getSpace(spaceId);
                    
                    broadcastToAll({
                        type: 'space_updated',
                        space: publicSpace
                    });
                    
                    // Check all players in the space and kick those who no longer meet requirements
                    if (getPlayersInRoom) {
                        const playersInSpace = getPlayersInRoom(spaceId);
                        const space = await spaceService.getSpaceRaw(spaceId);
                        
                        for (const p of playersInSpace) {
                            // Skip the owner - they can always stay
                            if (p.walletAddress === space.ownerWallet) continue;
                            
                            // Check if player can still enter with new settings
                            let canStay = true;
                            let kickReason = null;
                            
                            // Check access type
                            if (space.accessType === 'private') {
                                canStay = false;
                                kickReason = 'SPACE_NOW_PRIVATE';
                            }
                            // Check token gate
                            else if (space.tokenGate?.enabled && p.walletAddress) {
                                const balanceCheck = await solanaPaymentService.checkMinimumBalance(
                                    p.walletAddress,
                                    space.tokenGate.tokenAddress,
                                    space.tokenGate.minimumBalance || 0
                                );
                                if (!balanceCheck.hasBalance) {
                                    canStay = false;
                                    kickReason = 'TOKEN_GATE_NOT_MET';
                                }
                            }
                            // Check entry fee (if newly enabled)
                            else if (space.entryFee?.enabled && space.entryFee.amount > 0 && p.walletAddress) {
                                const hasPaid = space.paidEntryFees?.some(
                                    fee => fee.walletAddress === p.walletAddress
                                );
                                if (!hasPaid) {
                                    canStay = false;
                                    kickReason = 'ENTRY_FEE_NOW_REQUIRED';
                                }
                            }
                            
                            // Kick the player if they can't stay
                            if (!canStay) {
                                console.log(`🚪 Kicking ${p.name || p.id} from ${spaceId}: ${kickReason}`);
                                sendToPlayer(p.id, {
                                    type: 'space_kicked',
                                    spaceId,
                                    reason: kickReason,
                                    message: kickReason === 'SPACE_NOW_PRIVATE' 
                                        ? 'The space owner has made this space private'
                                        : kickReason === 'TOKEN_GATE_NOT_MET'
                                        ? 'You no longer meet the token requirement'
                                        : 'Entry fee is now required to stay'
                                });
                            }
                        }
                    }
                }
                
            } catch (error) {
                console.error('🏠 Error in space_update_settings:', error);
            }
            return true;
        }
        
        // ==================== GET USER'S SPACES ====================
        case 'space_my_rentals': {
            try {
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'space_my_rentals',
                        spaces: [],
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const spaces = await spaceService.getUserSpaces(player.walletAddress);
                
                sendToPlayer(playerId, {
                    type: 'space_my_rentals',
                    spaces
                });
                
            } catch (error) {
                console.error('🏠 Error in space_my_rentals:', error);
            }
            return true;
        }
        
        // ==================== LEAVE/VACATE SPACE ====================
        case 'space_leave': {
            try {
                const { spaceId } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'space_leave_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const result = await spaceService.leaveSpace(
                    player.walletAddress,
                    spaceId
                );
                
                sendToPlayer(playerId, {
                    type: 'space_leave_result',
                    ...result
                });
                
                // Broadcast space vacancy to all players
                if (result.success && broadcastToAll) {
                    const publicSpace = await spaceService.getSpace(spaceId);
                    broadcastToAll({
                        type: 'space_updated',
                        space: publicSpace
                    });
                    console.log(`📢 Broadcast space vacancy: ${spaceId} is now available`);
                }
                
            } catch (error) {
                console.error('🏠 Error in space_leave:', error);
            }
            return true;
        }
        
        // ==================== RECORD SPACE VISIT ====================
        case 'space_visit': {
            try {
                const { spaceId } = message;
                const walletAddress = player.walletAddress || `guest_${playerId}`;
                
                await spaceService.recordVisit(walletAddress, spaceId);
                // No response needed - silent tracking
                
            } catch (error) {
                console.error('🏠 Error in space_visit:', error);
            }
            return true;
        }
        
        default:
            return false; // Message not handled
    }
}


