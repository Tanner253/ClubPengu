/**
 * Igloo WebSocket Message Handlers
 * Handle all igloo-related operations: rental, entry, settings
 */

import iglooService from '../services/IglooService.js';
import solanaPaymentService from '../services/SolanaPaymentService.js';
import rateLimiter from '../utils/RateLimiter.js';

/**
 * Handle igloo-related messages
 * @param {string} playerId - Player ID
 * @param {Object} player - Player state object
 * @param {Object} message - The message
 * @param {Function} sendToPlayer - Send message to specific player
 * @param {Function} broadcastToAll - Broadcast to all connected players
 * @param {Function} getPlayersInRoom - Get all players in a specific room
 * @returns {Object|null} - Response or null if message not handled
 */
export async function handleIglooMessage(playerId, player, message, sendToPlayer, broadcastToAll, getPlayersInRoom) {
    switch (message.type) {
        // ==================== GET ALL IGLOOS INFO ====================
        case 'igloo_list': {
            try {
                const igloos = await iglooService.getAllIgloos();
                sendToPlayer(playerId, {
                    type: 'igloo_list',
                    igloos
                });
            } catch (error) {
                console.error('🏠 Error in igloo_list:', error);
                sendToPlayer(playerId, {
                    type: 'igloo_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to fetch igloo list'
                });
            }
            return true;
        }
        
        // ==================== GET SINGLE IGLOO INFO ====================
        case 'igloo_info': {
            try {
                const { iglooId } = message;
                const igloo = await iglooService.getIgloo(iglooId);
                
                if (!igloo) {
                    sendToPlayer(playerId, {
                        type: 'igloo_error',
                        error: 'IGLOO_NOT_FOUND',
                        message: 'Igloo not found'
                    });
                    return true;
                }
                
                sendToPlayer(playerId, {
                    type: 'igloo_info',
                    igloo
                });
            } catch (error) {
                console.error('🏠 Error in igloo_info:', error);
            }
            return true;
        }
        
        // ==================== CHECK IF CAN RENT ====================
        case 'igloo_can_rent': {
            try {
                const { iglooId } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_can_rent',
                        canRent: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'Please connect your wallet to rent'
                    });
                    return true;
                }
                
                const result = await iglooService.canRent(player.walletAddress, iglooId);
                sendToPlayer(playerId, {
                    type: 'igloo_can_rent',
                    iglooId,
                    ...result
                });
            } catch (error) {
                console.error('🏠 Error in igloo_can_rent:', error);
            }
            return true;
        }
        
        // ==================== RENT AN IGLOO ====================
        case 'igloo_rent': {
            try {
                const { iglooId, transactionSignature } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_rent_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                if (!transactionSignature) {
                    sendToPlayer(playerId, {
                        type: 'igloo_rent_result',
                        success: false,
                        error: 'MISSING_PAYMENT',
                        message: 'Transaction signature required'
                    });
                    return true;
                }
                
                const result = await iglooService.startRental(
                    player.walletAddress,
                    iglooId,
                    transactionSignature
                );
                
                sendToPlayer(playerId, {
                    type: 'igloo_rent_result',
                    ...result
                });
                
                // If successful, broadcast updated igloo to ALL players
                if (result.success && broadcastToAll) {
                    const publicIgloo = await iglooService.getIgloo(iglooId);
                    broadcastToAll({
                        type: 'igloo_updated',
                        igloo: publicIgloo
                    });
                    console.log(`📢 Broadcast igloo rental: ${iglooId} now owned by ${player.name}`);
                }
                
            } catch (error) {
                console.error('🏠 Error in igloo_rent:', error);
                sendToPlayer(playerId, {
                    type: 'igloo_rent_result',
                    success: false,
                    error: 'SERVER_ERROR'
                });
            }
            return true;
        }
        
        // ==================== PAY DAILY RENT ====================
        case 'igloo_pay_rent': {
            try {
                const { iglooId, transactionSignature } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_pay_rent_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                if (!transactionSignature) {
                    sendToPlayer(playerId, {
                        type: 'igloo_pay_rent_result',
                        success: false,
                        error: 'MISSING_PAYMENT',
                        message: 'Transaction signature required'
                    });
                    return true;
                }
                
                const result = await iglooService.payRent(
                    player.walletAddress,
                    iglooId,
                    transactionSignature
                );
                
                sendToPlayer(playerId, {
                    type: 'igloo_pay_rent_result',
                    ...result
                });
                
                // Broadcast rent payment to all (updates rent status display)
                if (result.success && broadcastToAll) {
                    const publicIgloo = await iglooService.getIgloo(iglooId);
                    broadcastToAll({
                        type: 'igloo_updated',
                        igloo: publicIgloo
                    });
                }
                
            } catch (error) {
                console.error('🏠 Error in igloo_pay_rent:', error);
            }
            return true;
        }
        
        // ==================== CHECK IF CAN ENTER (quick check before showing modal) ====================
        case 'igloo_can_enter': {
            try {
                const { iglooId } = message;
                const walletAddress = player.walletAddress || null;
                
                // Rate limit entry checks to prevent abuse
                if (walletAddress) {
                    const rateCheck = rateLimiter.check('entry_check', walletAddress);
                    if (!rateCheck.allowed) {
                        sendToPlayer(playerId, {
                            type: 'igloo_can_enter',
                            iglooId,
                            canEnter: false,
                            reason: 'RATE_LIMITED',
                            message: 'Too many requests. Please wait.',
                            retryAfterMs: rateCheck.retryAfterMs
                        });
                        return true;
                    }
                }
                
                // Get igloo data
                const igloo = await iglooService.getIglooRaw(iglooId);
                if (!igloo) {
                    sendToPlayer(playerId, {
                        type: 'igloo_can_enter',
                        iglooId,
                        canEnter: false,
                        reason: 'IGLOO_NOT_FOUND'
                    });
                    return true;
                }
                
                // Owner always has access
                const isOwner = walletAddress && walletAddress === igloo.ownerWallet;
                if (isOwner) {
                    sendToPlayer(playerId, {
                        type: 'igloo_can_enter',
                        iglooId,
                        canEnter: true,
                        isOwner: true
                    });
                    return true;
                }
                
                // Check all requirements with REAL on-chain data
                let tokenGateMet = true;
                let entryFeePaid = true;
                let userTokenBalance = 0;
                
                // Check token gate (query real balance)
                if (igloo.tokenGate?.enabled && igloo.tokenGate?.tokenAddress) {
                    try {
                        const balanceCheck = await solanaPaymentService.checkMinimumBalance(
                            walletAddress,
                            igloo.tokenGate.tokenAddress,
                            igloo.tokenGate.minimumBalance || 0
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
                
                // Check entry fee (from database)
                if (igloo.entryFee?.enabled && igloo.entryFee?.amount > 0) {
                    const paidEntry = igloo.paidEntryFees?.find(p => p.walletAddress === walletAddress);
                    entryFeePaid = !!paidEntry;
                }
                
                // Determine if user can enter directly
                const canEnter = tokenGateMet && entryFeePaid;
                
                sendToPlayer(playerId, {
                    type: 'igloo_can_enter',
                    iglooId,
                    canEnter,
                    isOwner: false,
                    // Detailed status for UI
                    tokenGateMet,
                    entryFeePaid,
                    userTokenBalance,
                    // Requirements info
                    tokenGateRequired: igloo.tokenGate?.enabled ? igloo.tokenGate.minimumBalance : 0,
                    tokenGateSymbol: igloo.tokenGate?.tokenSymbol || 'TOKEN',
                    tokenGateAddress: igloo.tokenGate?.tokenAddress || null,
                    entryFeeAmount: igloo.entryFee?.amount || 0,
                    entryFeeSymbol: igloo.entryFee?.tokenSymbol || 'TOKEN',
                    entryFeeTokenAddress: igloo.entryFee?.tokenAddress || null,
                    // Owner info (needed for payments)
                    ownerWallet: igloo.ownerWallet,
                    ownerUsername: igloo.ownerUsername || igloo.reservedOwnerName,
                    // What's blocking entry (if anything)
                    blockingReason: !tokenGateMet ? 'TOKEN_REQUIRED' : !entryFeePaid ? 'FEE_REQUIRED' : null
                });
                
            } catch (error) {
                console.error('🏠 Error in igloo_can_enter:', error);
                sendToPlayer(playerId, {
                    type: 'igloo_can_enter',
                    iglooId: message.iglooId,
                    canEnter: false,
                    reason: 'SERVER_ERROR'
                });
            }
            return true;
        }
        
        // ==================== ELIGIBILITY CHECK (periodic while in igloo) ====================
        case 'igloo_eligibility_check': {
            try {
                const { iglooId } = message;
                const walletAddress = player.walletAddress || null;
                
                // Guests automatically fail eligibility (they shouldn't be in igloos)
                if (!player.isAuthenticated || !walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_eligibility_check',
                        iglooId,
                        canEnter: false,
                        isOwner: false,
                        reason: 'NOT_AUTHENTICATED',
                        message: 'You must be logged in to stay in this igloo'
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
                        type: 'igloo_eligibility_check',
                        iglooId,
                        canEnter: true,  // Don't kick them for rate limiting
                        rateLimited: true
                    });
                    return true;
                }
                
                // Get igloo data to check requirements
                const igloo = await iglooService.getIglooRaw(iglooId);
                if (!igloo) {
                    sendToPlayer(playerId, {
                        type: 'igloo_eligibility_check',
                        iglooId,
                        canEnter: false,
                        reason: 'IGLOO_NOT_FOUND'
                    });
                    return true;
                }
                
                // Owner always has access
                const isOwner = walletAddress === igloo.ownerWallet;
                if (isOwner) {
                    sendToPlayer(playerId, {
                        type: 'igloo_eligibility_check',
                        iglooId,
                        canEnter: true,
                        isOwner: true
                    });
                    return true;
                }
                
                // Query REAL on-chain token balance (don't trust client!)
                let tokenBalance = 0;
                let balanceCheckFailed = false;
                if (igloo.tokenGate?.enabled && igloo.tokenGate?.tokenAddress) {
                    try {
                        const balanceCheck = await solanaPaymentService.checkMinimumBalance(
                            walletAddress,
                            igloo.tokenGate.tokenAddress,
                            igloo.tokenGate.minimumBalance || 0
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
                
                const result = await iglooService.canEnter(
                    walletAddress,
                    iglooId,
                    tokenBalance
                );
                
                sendToPlayer(playerId, {
                    type: 'igloo_eligibility_check',
                    iglooId,
                    ...result
                });
                
                // Log if user is being kicked
                if (!result.canEnter && !result.isOwner) {
                    console.log(`🚪 Eligibility check failed for ${walletAddress?.slice(0, 8)}... in ${iglooId}: ${result.reason}`);
                }
                
            } catch (error) {
                console.error('🏠 Error in igloo_eligibility_check:', error);
            }
            return true;
        }
        
        // ==================== CHECK REQUIREMENTS (for requirements panel) ====================
        case 'igloo_check_requirements': {
            try {
                const { iglooId } = message;
                const walletAddress = player.walletAddress || null;
                
                // Get igloo data (raw to access paidEntryFees)
                const igloo = await iglooService.getIglooRaw(iglooId);
                
                if (!igloo) {
                    sendToPlayer(playerId, {
                        type: 'igloo_requirements_status',
                        iglooId,
                        error: 'Igloo not found'
                    });
                    return true;
                }
                
                // Check if user is authenticated
                if (!player.isAuthenticated || !walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_requirements_status',
                        iglooId,
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
                
                if (igloo.tokenGate?.enabled && igloo.tokenGate?.tokenAddress) {
                    try {
                        // Query actual token balance from Solana
                        const balanceCheck = await solanaPaymentService.checkMinimumBalance(
                            walletAddress,
                            igloo.tokenGate.tokenAddress,
                            igloo.tokenGate.minimumBalance || 0
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
                if (igloo.entryFee?.enabled && igloo.entryFee?.amount > 0) {
                    const paidEntry = igloo.paidEntryFees?.find(p => p.walletAddress === walletAddress);
                    entryFeePaid = !!paidEntry;
                }
                
                // Owner always has access
                const isOwner = walletAddress === igloo.ownerWallet;
                if (isOwner) {
                    tokenGateMet = true;
                    entryFeePaid = true;
                }
                
                sendToPlayer(playerId, {
                    type: 'igloo_requirements_status',
                    iglooId,
                    isOwner,
                    userTokenBalance,
                    tokenGateMet,
                    entryFeePaid,
                    // Include requirement details for UI
                    tokenGateRequired: igloo.tokenGate?.enabled ? igloo.tokenGate.minimumBalance : 0,
                    tokenGateSymbol: igloo.tokenGate?.tokenSymbol || 'TOKEN',
                    entryFeeAmount: igloo.entryFee?.amount || 0,
                    entryFeeSymbol: igloo.entryFee?.tokenSymbol || 'TOKEN'
                });
                
            } catch (error) {
                console.error('🏠 Error in igloo_check_requirements:', error);
                sendToPlayer(playerId, {
                    type: 'igloo_requirements_status',
                    iglooId: message.iglooId,
                    error: 'Failed to check requirements'
                });
            }
            return true;
        }
        
        // ==================== PAY ENTRY FEE ====================
        case 'igloo_pay_entry': {
            try {
                const { iglooId, transactionSignature } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_pay_entry_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                // Require transaction signature
                if (!transactionSignature) {
                    sendToPlayer(playerId, {
                        type: 'igloo_pay_entry_result',
                        success: false,
                        error: 'MISSING_SIGNATURE',
                        message: 'Transaction signature required'
                    });
                    return true;
                }
                
                // First check if token gate is met (if applicable)
                const igloo = await iglooService.getIglooRaw(iglooId);
                if (igloo && igloo.tokenGate?.enabled && igloo.tokenGate?.tokenAddress) {
                    const balanceCheck = await solanaPaymentService.checkMinimumBalance(
                        player.walletAddress,
                        igloo.tokenGate.tokenAddress,
                        igloo.tokenGate.minimumBalance || 0
                    );
                    
                    if (!balanceCheck.hasBalance) {
                        sendToPlayer(playerId, {
                            type: 'igloo_pay_entry_result',
                            success: false,
                            error: 'TOKEN_GATE_NOT_MET',
                            message: `You need at least ${igloo.tokenGate.minimumBalance} tokens to pay the entry fee`,
                            required: igloo.tokenGate.minimumBalance,
                            current: balanceCheck.balance
                        });
                        return true;
                    }
                }
                
                // Verify and record the payment
                const result = await iglooService.payEntryFee(
                    player.walletAddress,
                    iglooId,
                    transactionSignature  // Now a real tx signature, not signed intent
                );
                
                // ========== AUDIT LOGGING ==========
                if (result.success) {
                    console.log('═══════════════════════════════════════════════════════════');
                    console.log('💰 [PAYMENT RECORDED] Igloo Entry Fee');
                    console.log('═══════════════════════════════════════════════════════════');
                    console.log(`   Timestamp:    ${new Date().toISOString()}`);
                    console.log(`   Igloo:        ${iglooId}`);
                    console.log(`   Payer:        ${player.walletAddress}`);
                    console.log(`   Recipient:    ${igloo?.ownerWallet || 'unknown'}`);
                    console.log(`   Amount:       ${igloo?.entryFee?.amount || 0} ${igloo?.entryFee?.tokenSymbol || 'TOKEN'}`);
                    console.log(`   Token:        ${igloo?.entryFee?.tokenAddress || 'unknown'}`);
                    console.log(`   TX Signature: ${transactionSignature}`);
                    console.log(`   Solscan:      https://solscan.io/tx/${transactionSignature}`);
                    console.log('═══════════════════════════════════════════════════════════');
                } else {
                    console.warn('⚠️ [PAYMENT FAILED] Igloo Entry Fee');
                    console.warn(`   Timestamp:    ${new Date().toISOString()}`);
                    console.warn(`   Igloo:        ${iglooId}`);
                    console.warn(`   Payer:        ${player.walletAddress}`);
                    console.warn(`   TX Signature: ${transactionSignature}`);
                    console.warn(`   Error:        ${result.error}`);
                    console.warn(`   Message:      ${result.message || 'No message'}`);
                }
                
                sendToPlayer(playerId, {
                    type: 'igloo_pay_entry_result',
                    iglooId,
                    ...result
                });
                
                // Broadcast to owner so they see updated fees collected
                // (Only broadcast stats update, not full igloo info)
                if (result.success && broadcastToAll && igloo?.ownerWallet) {
                    const updatedIgloo = await iglooService.getIgloo(iglooId);
                    broadcastToAll({
                        type: 'igloo_updated',
                        igloo: updatedIgloo
                    });
                }
                
            } catch (error) {
                console.error('🏠 Error in igloo_pay_entry:', error);
                console.error('═══════════════════════════════════════════════════════════');
                console.error('❌ [PAYMENT ERROR] Igloo Entry Fee - Unhandled Exception');
                console.error(`   Timestamp:    ${new Date().toISOString()}`);
                console.error(`   Igloo:        ${message.iglooId}`);
                console.error(`   Payer:        ${player.walletAddress}`);
                console.error(`   TX Signature: ${message.transactionSignature}`);
                console.error(`   Error:        ${error.message}`);
                console.error('═══════════════════════════════════════════════════════════');
                
                sendToPlayer(playerId, {
                    type: 'igloo_pay_entry_result',
                    success: false,
                    error: 'SERVER_ERROR',
                    message: 'Failed to process entry fee payment'
                });
            }
            return true;
        }
        
        // ==================== GET OWNER SETTINGS ====================
        case 'igloo_owner_info': {
            try {
                const { iglooId } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_owner_info',
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const result = await iglooService.getIglooForOwner(
                    iglooId,
                    player.walletAddress
                );
                
                sendToPlayer(playerId, {
                    type: 'igloo_owner_info',
                    iglooId,
                    ...(result.error ? { error: result.error } : { igloo: result })
                });
                
            } catch (error) {
                console.error('🏠 Error in igloo_owner_info:', error);
            }
            return true;
        }
        
        // ==================== UPDATE SETTINGS ====================
        case 'igloo_update_settings': {
            try {
                const { iglooId, settings } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_settings_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const result = await iglooService.updateSettings(
                    player.walletAddress,
                    iglooId,
                    settings
                );
                
                // Send result to owner
                sendToPlayer(playerId, {
                    type: 'igloo_settings_result',
                    ...result
                });
                
                // If successful, broadcast updated igloo to ALL players so they see the new settings
                if (result.success && result.igloo && broadcastToAll) {
                    // Get public info (safe for all clients)
                    const publicIgloo = await iglooService.getIgloo(iglooId);
                    
                    broadcastToAll({
                        type: 'igloo_updated',
                        igloo: publicIgloo
                    });
                    
                    // Check all players in the igloo and kick those who no longer meet requirements
                    if (getPlayersInRoom) {
                        const playersInIgloo = getPlayersInRoom(iglooId);
                        const igloo = await iglooService.getIglooRaw(iglooId);
                        
                        for (const p of playersInIgloo) {
                            // Skip the owner - they can always stay
                            if (p.walletAddress === igloo.ownerWallet) continue;
                            
                            // Check if player can still enter with new settings
                            let canStay = true;
                            let kickReason = null;
                            
                            // Check access type
                            if (igloo.accessType === 'private') {
                                canStay = false;
                                kickReason = 'IGLOO_NOW_PRIVATE';
                            }
                            // Check token gate
                            else if (igloo.tokenGate?.enabled && p.walletAddress) {
                                const balanceCheck = await solanaPaymentService.checkMinimumBalance(
                                    p.walletAddress,
                                    igloo.tokenGate.tokenAddress,
                                    igloo.tokenGate.minimumBalance || 0
                                );
                                if (!balanceCheck.hasBalance) {
                                    canStay = false;
                                    kickReason = 'TOKEN_GATE_NOT_MET';
                                }
                            }
                            // Check entry fee (if newly enabled)
                            else if (igloo.entryFee?.enabled && igloo.entryFee.amount > 0 && p.walletAddress) {
                                const hasPaid = igloo.paidEntryFees?.some(
                                    fee => fee.walletAddress === p.walletAddress
                                );
                                if (!hasPaid) {
                                    canStay = false;
                                    kickReason = 'ENTRY_FEE_NOW_REQUIRED';
                                }
                            }
                            
                            // Kick the player if they can't stay
                            if (!canStay) {
                                console.log(`🚪 Kicking ${p.name || p.id} from ${iglooId}: ${kickReason}`);
                                sendToPlayer(p.id, {
                                    type: 'igloo_kicked',
                                    iglooId,
                                    reason: kickReason,
                                    message: kickReason === 'IGLOO_NOW_PRIVATE' 
                                        ? 'The igloo owner has made this igloo private'
                                        : kickReason === 'TOKEN_GATE_NOT_MET'
                                        ? 'You no longer meet the token requirement'
                                        : 'Entry fee is now required to stay'
                                });
                            }
                        }
                    }
                }
                
            } catch (error) {
                console.error('🏠 Error in igloo_update_settings:', error);
            }
            return true;
        }
        
        // ==================== GET USER'S IGLOOS ====================
        case 'igloo_my_rentals': {
            try {
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_my_rentals',
                        igloos: [],
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const igloos = await iglooService.getUserIgloos(player.walletAddress);
                
                sendToPlayer(playerId, {
                    type: 'igloo_my_rentals',
                    igloos
                });
                
            } catch (error) {
                console.error('🏠 Error in igloo_my_rentals:', error);
            }
            return true;
        }
        
        // ==================== LEAVE/VACATE IGLOO ====================
        case 'igloo_leave': {
            try {
                const { iglooId } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_leave_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const result = await iglooService.leaveIgloo(
                    player.walletAddress,
                    iglooId
                );
                
                sendToPlayer(playerId, {
                    type: 'igloo_leave_result',
                    ...result
                });
                
                // Broadcast igloo vacancy to all players
                if (result.success && broadcastToAll) {
                    const publicIgloo = await iglooService.getIgloo(iglooId);
                    broadcastToAll({
                        type: 'igloo_updated',
                        igloo: publicIgloo
                    });
                    console.log(`📢 Broadcast igloo vacancy: ${iglooId} is now available`);
                }
                
            } catch (error) {
                console.error('🏠 Error in igloo_leave:', error);
            }
            return true;
        }
        
        // ==================== RECORD IGLOO VISIT ====================
        case 'igloo_visit': {
            try {
                const { iglooId } = message;
                const walletAddress = player.walletAddress || `guest_${playerId}`;
                
                await iglooService.recordVisit(walletAddress, iglooId);
                // No response needed - silent tracking
                
            } catch (error) {
                console.error('🏠 Error in igloo_visit:', error);
            }
            return true;
        }
        
        default:
            return false; // Message not handled
    }
}


