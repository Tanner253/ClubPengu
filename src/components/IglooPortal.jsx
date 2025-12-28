/**
 * IglooPortal - Enhanced portal prompt for igloos with rental/access state display
 * Shows dynamic information based on igloo ownership, access type, rent status, etc.
 */

import React from 'react';
import { IGLOO_CONFIG } from '../config/solana.js';

/**
 * Abbreviate a wallet address: "abc123...xyz789"
 */
const abbreviateWallet = (wallet) => {
    if (!wallet || wallet.length < 12) return wallet;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
};

const IglooPortal = ({ 
    portal,           // Portal config from roomConfig
    iglooData,        // Dynamic igloo data from IglooContext
    isNearby, 
    onEnter,          // For entering the igloo
    onViewDetails,    // For viewing details panel (available igloos)
    onViewRequirements, // For viewing requirements panel (rented igloos with access control)
    walletAddress,    // Current user's wallet
    isAuthenticated,  // Is user logged in
    userClearance     // { canEnter, tokenGateMet, entryFeePaid } - user's status for this igloo
}) => {
    if (!isNearby || !portal) return null;
    
    // Extract igloo ID from portal targetRoom (e.g., 'igloo3' -> 'igloo3')
    const iglooId = portal.targetRoom;
    
    // All igloo data comes from database only - no hardcoded env wallet fallbacks
    const isReserved = iglooData?.isReserved || false;
    
    // Get dynamic state from database only
    const isRented = iglooData?.isRented || false;
    const ownerUsername = iglooData?.ownerUsername || iglooData?.reservedOwnerName;
    const ownerWallet = iglooData?.ownerWallet;  // Must come from database
    const accessType = iglooData?.accessType || 'private';
    const hasEntryFee = iglooData?.hasEntryFee || iglooData?.entryFee?.enabled;
    const entryFeeAmount = iglooData?.entryFeeAmount || iglooData?.entryFee?.amount || 0;
    const hasTokenGate = iglooData?.hasTokenGate || iglooData?.tokenGate?.enabled;
    const tokenGateInfo = iglooData?.tokenGateInfo || iglooData?.tokenGate;
    
    // Is this the user's igloo? Check wallet match
    const isOwner = walletAddress && ownerWallet && (ownerWallet === walletAddress);
    
    // Determine what to show
    const getStatusInfo = () => {
        // Not rented - available for rent (unless reserved)
        if (!isRented && !isReserved) {
            return {
                emoji: '🏷️',
                title: 'IGLOO FOR RENT',
                subtitle: `${IGLOO_CONFIG.DAILY_RENT_CPW3?.toLocaleString() || '10,000'} $WADDLE/day`,
                description: `Min balance: ${IGLOO_CONFIG.MINIMUM_BALANCE_CPW3?.toLocaleString() || '70,000'} $WADDLE`,
                color: 'emerald',
                canEnter: false,
                actionText: 'VIEW DETAILS',
                showRentInfo: true
            };
        }
        
        // User's own igloo
        if (isOwner) {
            return {
                emoji: '🏠',
                title: 'YOUR IGLOO',
                subtitle: ownerUsername || 'Your Home',
                description: 'Enter to manage settings',
                color: 'purple',
                canEnter: true,
                actionText: '🚪 ENTER [E]',
                showWallet: true,
                walletDisplay: abbreviateWallet(ownerWallet)
            };
        }
        
        // Someone else's igloo - check access type
        
        // ✅ USER IS CLEARED - they've met all requirements (paid fee + token gate)
        // Show simple "Press E to enter" like a public igloo
        if (userClearance?.canEnter) {
            return {
                emoji: '✅',
                title: ownerUsername ? `${ownerUsername}'s Igloo` : 'VIP ACCESS',
                subtitle: '🎫 Requirements met!',
                description: 'You have access to this igloo',
                color: 'green',
                canEnter: true,
                actionText: '🚪 ENTER [E]',
                showWallet: !!ownerWallet,
                walletDisplay: abbreviateWallet(ownerWallet)
            };
        }
        
        // IMPORTANT: Check requirements BEFORE checking for public access
        // 'both' = Token Gate + Entry Fee
        if (accessType === 'both' && (hasTokenGate || hasEntryFee)) {
            const tokenSymbol = tokenGateInfo?.tokenSymbol || tokenGateInfo?.symbol || 'TOKEN';
            const minBalance = tokenGateInfo?.minimumBalance || tokenGateInfo?.minimum || 1;
            const feeTokenSymbol = iglooData?.entryFeeToken?.tokenSymbol || iglooData?.entryFee?.tokenSymbol || 'TOKEN';
            
            // Show partial status if user has some requirements met
            const tokenMet = userClearance?.tokenGateMet;
            const feePaid = userClearance?.entryFeePaid;
            
            return {
                emoji: '🔐',
                title: 'REQUIREMENTS',
                subtitle: ownerUsername ? `🌟 ${ownerUsername}` : null,
                description: tokenMet && !feePaid ? 'Token ✓ • Fee required' : 
                            !tokenMet && feePaid ? 'Fee paid ✓ • Need tokens' :
                            'Token gate + Entry fee required',
                color: 'purple',
                canEnter: false,
                actionText: 'VIEW REQUIREMENTS [E]',
                showRequirements: true,
                hasTokenGate: true,
                hasEntryFee: true,
                tokenSymbol,
                minBalance,
                feeAmount: entryFeeAmount,
                feeTokenSymbol,
                tokenAddress: tokenGateInfo?.tokenAddress,
                feeTokenAddress: iglooData?.entryFeeToken?.tokenAddress || iglooData?.entryFee?.tokenAddress,
                showWallet: !!ownerWallet,
                walletDisplay: abbreviateWallet(ownerWallet),
                userStatus: { tokenMet, feePaid }
            };
        }
        
        // Token gated only
        if (accessType === 'token' || hasTokenGate) {
            const tokenSymbol = tokenGateInfo?.tokenSymbol || tokenGateInfo?.symbol || 'TOKEN';
            const minBalance = tokenGateInfo?.minimumBalance || tokenGateInfo?.minimum || 1;
            const tokenMet = userClearance?.tokenGateMet;
            
            return {
                emoji: tokenMet ? '✅' : '🪙',
                title: tokenMet ? 'ACCESS GRANTED' : 'TOKEN GATED',
                subtitle: ownerUsername ? `🌟 ${ownerUsername}` : null,
                description: tokenMet ? 'You have enough tokens!' : `Hold ${minBalance.toLocaleString()} ${tokenSymbol}`,
                color: tokenMet ? 'green' : 'purple',
                canEnter: tokenMet,
                actionText: tokenMet ? '🚪 ENTER [E]' : 'VIEW REQUIREMENTS [E]',
                showRequirements: !tokenMet,
                hasTokenGate: true,
                hasEntryFee: false,
                tokenSymbol,
                minBalance,
                tokenAddress: tokenGateInfo?.tokenAddress,
                showWallet: !!ownerWallet,
                walletDisplay: abbreviateWallet(ownerWallet)
            };
        }
        
        // Entry fee only
        if (accessType === 'fee' || hasEntryFee) {
            const feeTokenSymbol = iglooData?.entryFeeToken?.tokenSymbol || iglooData?.entryFee?.tokenSymbol || 'TOKEN';
            const feePaid = userClearance?.entryFeePaid;
            
            return {
                emoji: feePaid ? '✅' : '💰',
                title: feePaid ? 'FEE PAID' : 'ENTRY FEE',
                subtitle: ownerUsername ? `🌟 ${ownerUsername}` : null,
                description: feePaid ? 'Entry fee paid!' : `Pay ${entryFeeAmount.toLocaleString()} ${feeTokenSymbol}`,
                color: feePaid ? 'green' : 'yellow',
                canEnter: feePaid,
                actionText: feePaid ? '🚪 ENTER [E]' : 'VIEW REQUIREMENTS [E]',
                showRequirements: !feePaid,
                hasTokenGate: false,
                hasEntryFee: true,
                feeAmount: entryFeeAmount,
                feeTokenSymbol,
                feeTokenAddress: iglooData?.entryFeeToken?.tokenAddress || iglooData?.entryFee?.tokenAddress,
                showWallet: !!ownerWallet,
                walletDisplay: abbreviateWallet(ownerWallet)
            };
        }
        
        // Private - only owner can enter
        if (accessType === 'private') {
            return {
                emoji: '🔒',
                title: 'PRIVATE IGLOO',
                subtitle: ownerUsername ? `🌟 ${ownerUsername}` : null,
                description: 'This igloo is locked',
                color: 'red',
                canEnter: false,
                actionText: 'LOCKED',
                showWallet: !!ownerWallet,
                walletDisplay: abbreviateWallet(ownerWallet)
            };
        }
        
        // Public igloo - anyone can enter
        if (accessType === 'public') {
            return {
                emoji: '🔓',
                title: ownerUsername ? `${ownerUsername}'s Igloo` : 'PUBLIC IGLOO',
                subtitle: isReserved ? `🌟 ${ownerUsername}` : null,
                description: 'Open to visitors',
                color: 'green',
                canEnter: true,
                actionText: '🚪 ENTER [E]',
                showWallet: !!ownerWallet,
                walletDisplay: abbreviateWallet(ownerWallet)
            };
        }
        
        // Default fallback
        return {
            emoji: '🏠',
            title: portal.name || 'IGLOO',
            subtitle: ownerUsername ? `🌟 ${ownerUsername}` : null,
            description: portal.description || 'Enter Igloo',
            color: 'gray',
            canEnter: true,
            actionText: '🚪 ENTER [E]',
            showWallet: !!ownerWallet,
            walletDisplay: abbreviateWallet(ownerWallet)
        };
    };
    
    const status = getStatusInfo();
    
    // Color mappings
    const colorClasses = {
        emerald: 'from-emerald-600 to-green-700 border-emerald-400',
        green: 'from-emerald-600 to-green-700 border-emerald-400',
        purple: 'from-purple-600 to-indigo-700 border-purple-400',
        red: 'from-red-600 to-red-800 border-red-400',
        yellow: 'from-yellow-600 to-amber-700 border-yellow-400',
        gray: 'from-slate-700 to-slate-800 border-slate-500'
    };
    
    const bgClass = colorClasses[status.color] || colorClasses.gray;
    
    return (
        <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-30 animate-fade-in">
            <div className={`
                bg-gradient-to-br ${bgClass}
                rounded-xl p-4 shadow-2xl
                border-2
                max-w-xs text-center
                backdrop-blur-sm
            `}>
                {/* Main Icon */}
                <div className="text-3xl mb-1">{status.emoji}</div>
                
                {/* Title */}
                <h3 className="text-white font-bold retro-text text-sm">{status.title}</h3>
                
                {/* Subtitle (owner name, permanent badge, etc.) */}
                {status.subtitle && (
                    <p className="text-white/80 text-xs font-medium">{status.subtitle}</p>
                )}
                
                {/* Owner Wallet Address (abbreviated) */}
                {status.showWallet && status.walletDisplay && (
                    <div className="bg-black/40 rounded px-2 py-0.5 mt-1 mb-1 inline-block">
                        <span className="text-cyan-400 text-[10px] font-mono">
                            🔑 {status.walletDisplay}
                        </span>
                    </div>
                )}
                
                {/* Description */}
                <p className="text-white/70 text-xs mb-2">{status.description}</p>
                
                {/* Rent Info for available igloos */}
                {status.showRentInfo && (
                    <div className="bg-black/30 rounded-lg p-2 mb-2 text-xs">
                        <div className="flex items-center justify-center gap-2 text-emerald-300">
                            <span>📅 Daily:</span>
                            <span className="font-mono">{IGLOO_CONFIG.DAILY_RENT_CPW3?.toLocaleString()} $WADDLE</span>
                        </div>
                        <div className="text-white/50 mt-1">
                            Grace period: {IGLOO_CONFIG.GRACE_PERIOD_HOURS}h
                        </div>
                    </div>
                )}
                
                {/* Requirements Preview (for igloos with token gate/entry fee) */}
                {status.showRequirements && (
                    <div className="bg-black/30 rounded-lg p-2 mb-2 text-xs space-y-1">
                        {status.hasTokenGate && (
                            <div className="flex items-center justify-center gap-2 text-purple-300">
                                <span>🪙</span>
                                <span className="font-mono">{status.minBalance?.toLocaleString()} {status.tokenSymbol}</span>
                            </div>
                        )}
                        {status.hasEntryFee && (
                            <div className="flex items-center justify-center gap-2 text-yellow-300">
                                <span>💰</span>
                                <span className="font-mono">{status.feeAmount?.toLocaleString()} {status.feeTokenSymbol}</span>
                            </div>
                        )}
                        <div className="text-white/50 text-[10px] mt-1">
                            Tap for details & copy CA
                        </div>
                    </div>
                )}
                
                {/* Auth warning for guests */}
                {!isAuthenticated && status.showRentInfo && (
                    <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-2 mb-2 text-xs text-red-300">
                        ⚠️ Connect wallet to rent
                    </div>
                )}
                
                {/* Action Button */}
                {status.canEnter || status.showRentInfo || status.showRequirements ? (
                    <button 
                        onClick={() => {
                            if (status.showRentInfo && onViewDetails) {
                                // Not rented - show details/marketing panel
                                onViewDetails();
                            } else {
                                // For all other cases (can enter, or has requirements):
                                // Use handlePortalEnter which does server-side check
                                // This ensures consistent behavior between click and E key
                                onEnter();
                            }
                        }}
                        className={`
                            ${status.canEnter 
                                ? 'bg-white/20 hover:bg-white/30 border-white/30 hover:border-white/50' 
                                : status.color === 'red' 
                                    ? 'bg-red-500/20 border-red-500/30 cursor-not-allowed'
                                    : 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40'
                            }
                            text-white px-5 py-2 rounded-lg retro-text text-xs transition-all border
                        `}
                        disabled={status.color === 'red'}
                    >
                        {status.actionText}
                    </button>
                ) : (
                    <div className="text-white/50 text-xs retro-text py-1">
                        🔒 Locked
                    </div>
                )}
            </div>
        </div>
    );
};

export default IglooPortal;

