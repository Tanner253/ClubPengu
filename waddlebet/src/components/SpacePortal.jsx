/**
 * SpacePortal - Enhanced portal prompt for spaces with rental/access state display
 * Shows dynamic information based on space ownership, access type, rent status, etc.
 */

import React, { useState, useEffect } from 'react';
import { SPACE_CONFIG } from '../config/solana.js';

/**
 * Abbreviate a wallet address: "abc123...xyz789"
 */
const abbreviateWallet = (wallet) => {
    if (!wallet || wallet.length < 12) return wallet;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
};

const SpacePortal = ({ 
    portal,           // Portal config from roomConfig
    spaceData,        // Dynamic space data from SpaceContext
    isNearby, 
    onEnter,          // For entering the space
    onViewDetails,    // For viewing details panel (available spaces)
    onViewRequirements, // For viewing requirements panel (rented spaces with access control)
    walletAddress,    // Current user's wallet
    isAuthenticated,  // Is user logged in
    userClearance     // { canEnter, tokenGateMet, entryFeePaid } - user's status for this space
}) => {
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        const checkMobile = () => {
            const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isIPadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            setIsMobile(mobileUA || isIPadOS || hasTouch);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    if (!isNearby || !portal) return null;
    
    // Extract space ID from portal targetRoom (e.g., 'space3' -> 'space3')
    const spaceId = portal.targetRoom;
    
    // All space data comes from database only - no hardcoded env wallet fallbacks
    const isReserved = spaceData?.isReserved || false;
    
    // Get dynamic state from database only
    const isRented = spaceData?.isRented || false;
    const ownerUsername = spaceData?.ownerUsername || spaceData?.reservedOwnerName;
    const ownerWallet = spaceData?.ownerWallet;  // Must come from database
    const accessType = spaceData?.accessType || 'private';
    const hasEntryFee = spaceData?.hasEntryFee || spaceData?.entryFee?.enabled;
    const entryFeeAmount = spaceData?.entryFeeAmount || spaceData?.entryFee?.amount || 0;
    const hasTokenGate = spaceData?.hasTokenGate || spaceData?.tokenGate?.enabled;
    const tokenGateInfo = spaceData?.tokenGateInfo || spaceData?.tokenGate;
    
    // Is this the user's space? Check wallet match
    const isOwner = walletAddress && ownerWallet && (ownerWallet === walletAddress);
    
    // Determine what to show
    const getStatusInfo = () => {
        // Not rented - available for rent (unless reserved)
        if (!isRented && !isReserved) {
            return {
                emoji: '🏷️',
                title: 'SPACE FOR RENT',
                subtitle: `${SPACE_CONFIG.DAILY_RENT_CPW3?.toLocaleString() || '10,000'} $WADDLE/day`,
                description: `Min balance: ${SPACE_CONFIG.MINIMUM_BALANCE_CPW3?.toLocaleString() || '70,000'} $WADDLE`,
                color: 'emerald',
                canEnter: false,
                actionText: 'VIEW DETAILS',
                showRentInfo: true
            };
        }
        
        // User's own space
        if (isOwner) {
            return {
                emoji: '🏠',
                title: 'YOUR SPACE',
                subtitle: ownerUsername || 'Your Home',
                description: 'Enter to manage settings',
                color: 'purple',
                canEnter: true,
                actionText: isMobile ? '🚪 ENTER' : '🚪 ENTER [E]',
                showWallet: true,
                walletDisplay: abbreviateWallet(ownerWallet)
            };
        }
        
        // Someone else's space - check access type
        
        // ✅ USER IS CLEARED - they've met all requirements (paid fee + token gate)
        // Show simple "Press E to enter" like a public space
        if (userClearance?.canEnter) {
            return {
                emoji: '✅',
                title: ownerUsername ? `${ownerUsername}'s Space` : 'VIP ACCESS',
                subtitle: '🎫 Requirements met!',
                description: 'You have access to this space',
                color: 'green',
                canEnter: true,
                actionText: isMobile ? '🚪 ENTER' : '🚪 ENTER [E]',
                showWallet: !!ownerWallet,
                walletDisplay: abbreviateWallet(ownerWallet)
            };
        }
        
        // IMPORTANT: Check requirements BEFORE checking for public access
        // 'both' = Token Gate + Entry Fee
        if (accessType === 'both' && (hasTokenGate || hasEntryFee)) {
            const tokenSymbol = tokenGateInfo?.tokenSymbol || tokenGateInfo?.symbol || 'TOKEN';
            const minBalance = tokenGateInfo?.minimumBalance || tokenGateInfo?.minimum || 1;
            const feeTokenSymbol = spaceData?.entryFeeToken?.tokenSymbol || spaceData?.entryFee?.tokenSymbol || 'TOKEN';
            
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
                actionText: isMobile ? 'VIEW REQUIREMENTS' : 'VIEW REQUIREMENTS [E]',
                showRequirements: true,
                hasTokenGate: true,
                hasEntryFee: true,
                tokenSymbol,
                minBalance,
                feeAmount: entryFeeAmount,
                feeTokenSymbol,
                tokenAddress: tokenGateInfo?.tokenAddress,
                feeTokenAddress: spaceData?.entryFeeToken?.tokenAddress || spaceData?.entryFee?.tokenAddress,
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
                actionText: tokenMet ? (isMobile ? '🚪 ENTER' : '🚪 ENTER [E]') : (isMobile ? 'VIEW REQUIREMENTS' : 'VIEW REQUIREMENTS [E]'),
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
            const feeTokenSymbol = spaceData?.entryFeeToken?.tokenSymbol || spaceData?.entryFee?.tokenSymbol || 'TOKEN';
            const feePaid = userClearance?.entryFeePaid;
            
            return {
                emoji: feePaid ? '✅' : '💰',
                title: feePaid ? 'FEE PAID' : 'ENTRY FEE',
                subtitle: ownerUsername ? `🌟 ${ownerUsername}` : null,
                description: feePaid ? 'Entry fee paid!' : `Pay ${entryFeeAmount.toLocaleString()} ${feeTokenSymbol}`,
                color: feePaid ? 'green' : 'yellow',
                canEnter: feePaid,
                actionText: feePaid ? (isMobile ? '🚪 ENTER' : '🚪 ENTER [E]') : (isMobile ? 'VIEW REQUIREMENTS' : 'VIEW REQUIREMENTS [E]'),
                showRequirements: !feePaid,
                hasTokenGate: false,
                hasEntryFee: true,
                feeAmount: entryFeeAmount,
                feeTokenSymbol,
                feeTokenAddress: spaceData?.entryFeeToken?.tokenAddress || spaceData?.entryFee?.tokenAddress,
                showWallet: !!ownerWallet,
                walletDisplay: abbreviateWallet(ownerWallet)
            };
        }
        
        // Private - only owner can enter
        if (accessType === 'private') {
            return {
                emoji: '🔒',
                title: 'PRIVATE SPACE',
                subtitle: ownerUsername ? `🌟 ${ownerUsername}` : null,
                description: 'This space is locked',
                color: 'red',
                canEnter: false,
                actionText: 'LOCKED',
                showWallet: !!ownerWallet,
                walletDisplay: abbreviateWallet(ownerWallet)
            };
        }
        
        // Public space - anyone can enter
        if (accessType === 'public') {
            return {
                emoji: '🔓',
                title: ownerUsername ? `${ownerUsername}'s Space` : 'PUBLIC SPACE',
                subtitle: isReserved ? `🌟 ${ownerUsername}` : null,
                description: 'Open to visitors',
                color: 'green',
                canEnter: true,
                actionText: isMobile ? '🚪 ENTER' : '🚪 ENTER [E]',
                showWallet: !!ownerWallet,
                walletDisplay: abbreviateWallet(ownerWallet)
            };
        }
        
        // Default fallback
        return {
            emoji: '🏠',
            title: portal.name || 'SPACE',
            subtitle: ownerUsername ? `🌟 ${ownerUsername}` : null,
            description: portal.description || 'Enter Space',
            color: 'gray',
            canEnter: true,
            actionText: isMobile ? '🚪 ENTER' : '🚪 ENTER [E]',
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
                
                {/* Rent Info for available spaces */}
                {status.showRentInfo && (
                    <div className="bg-black/30 rounded-lg p-2 mb-2 text-xs">
                        <div className="flex items-center justify-center gap-2 text-emerald-300">
                            <span>📅 Daily:</span>
                            <span className="font-mono">{SPACE_CONFIG.DAILY_RENT_CPW3?.toLocaleString()} $WADDLE</span>
                        </div>
                        <div className="text-white/50 mt-1">
                            Grace period: {SPACE_CONFIG.GRACE_PERIOD_HOURS}h
                        </div>
                    </div>
                )}
                
                {/* Requirements Preview (for spaces with token gate/entry fee) */}
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

export default SpacePortal;

