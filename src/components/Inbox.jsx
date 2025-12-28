/**
 * Inbox - Challenge requests and notifications panel
 */

import React, { useRef, useState, useEffect } from 'react';
import { useChallenge } from '../challenge';
import { useMultiplayer } from '../multiplayer/MultiplayerContext';
import { useClickOutside } from '../hooks';
import { getTokenBalance } from '../wallet/SolanaPayment';

/**
 * TokenWagerInfo - Displays token wager details with copy CA, Solscan link, and balance check
 */
const TokenWagerInfo = ({ wagerToken, walletAddress }) => {
    const [copied, setCopied] = useState(false);
    const [userBalance, setUserBalance] = useState(null);
    const [loadingBalance, setLoadingBalance] = useState(false);
    
    if (!wagerToken || !wagerToken.tokenAddress) return null;
    
    const shortCA = `${wagerToken.tokenAddress.slice(0, 4)}...${wagerToken.tokenAddress.slice(-4)}`;
    const solscanUrl = `https://solscan.io/token/${wagerToken.tokenAddress}`;
    const requiredAmount = wagerToken.tokenAmount || 0;
    
    // Check user's token balance
    useEffect(() => {
        if (walletAddress && wagerToken.tokenAddress) {
            setLoadingBalance(true);
            getTokenBalance(walletAddress, wagerToken.tokenAddress)
                .then(result => {
                    setUserBalance(result.balance);
                })
                .catch(() => setUserBalance(null))
                .finally(() => setLoadingBalance(false));
        }
    }, [walletAddress, wagerToken.tokenAddress]);
    
    const hasEnough = userBalance !== null && userBalance >= requiredAmount;
    const needsMore = userBalance !== null && userBalance < requiredAmount;
    
    const handleCopyCA = async (e) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(wagerToken.tokenAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };
    
    return (
        <div className={`mt-2 p-2 rounded-lg border ${
            hasEnough 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-purple-500/10 border-purple-500/20'
        }`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-purple-400 font-medium text-sm">
                        💎 {requiredAmount} {wagerToken.tokenSymbol}
                    </span>
                </div>
                
                {/* User's balance indicator */}
                {walletAddress && (
                    <div className="text-[10px]">
                        {loadingBalance ? (
                            <span className="text-white/40">Checking...</span>
                        ) : hasEnough ? (
                            <span className="text-green-400">✓ You have {userBalance.toLocaleString()}</span>
                        ) : needsMore ? (
                            <span className="text-red-400">
                                ⚠️ Need {(requiredAmount - userBalance).toLocaleString()} more
                            </span>
                        ) : (
                            <span className="text-yellow-400">? Balance unknown</span>
                        )}
                    </div>
                )}
            </div>
            
            {/* Token CA with copy and view buttons */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-white/40 text-xs font-mono">{shortCA}</span>
                
                {/* Copy CA Button */}
                <button
                    onClick={handleCopyCA}
                    className={`px-1.5 py-0.5 rounded text-[10px] transition-all ${
                        copied 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                    }`}
                    title="Copy token address to buy"
                >
                    {copied ? '✓ Copied!' : '📋 Copy CA'}
                </button>
                
                {/* Solscan Link */}
                <a
                    href={solscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
                    title="View token on Solscan"
                >
                    🔍 View
                </a>
            </div>
            
            {/* Contextual help message */}
            {needsMore && (
                <p className="text-red-300/70 text-[10px] mt-1.5">
                    ⚠️ You need to buy {wagerToken.tokenSymbol} to accept this challenge. Copy CA above!
                </p>
            )}
            {hasEnough && (
                <p className="text-green-300/70 text-[10px] mt-1.5">
                    ✓ Ready to accept! Your tokens will be deposited when you click Accept.
                </p>
            )}
            {!walletAddress && (
                <p className="text-yellow-300/70 text-[10px] mt-1.5">
                    🔗 Connect wallet to check your balance
                </p>
            )}
        </div>
    );
};

const Inbox = () => {
    const {
        inbox,
        showInbox,
        setShowInbox,
        acceptChallenge,
        denyChallenge,
        deleteInboxMessage,
        cancelChallenge,
        pendingChallenges,
        isInMatch
    } = useChallenge();
    
    // Get user data from multiplayer context for server-authoritative coin balance
    const { userData, isAuthenticated } = useMultiplayer();
    
    const panelRef = useRef(null);
    // Server-authoritative coins from userData
    // In dev mode, give guests coins for testing
    const isDev = import.meta.env.DEV;
    const playerCoins = isAuthenticated ? (userData?.coins ?? 0) : (isDev ? 1000 : 0);
    
    // Close on click/touch outside (but not when clicking inbox button)
    useClickOutside(panelRef, (e) => {
                if (!e.target.closest('[data-inbox-button]')) {
                    setShowInbox(false);
                }
    }, showInbox);
    
    if (!showInbox) return null;
    
    const formatTimeRemaining = (expiresAt) => {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) return 'Expired';
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
    
    const gameNames = {
        'card_jitsu': 'Card Jitsu',
        'connect4': 'Connect 4',
        'pong': 'Pong',
        'tic_tac_toe': 'Tic Tac Toe',
        'monopoly': 'Monopoly',
        'uno': 'UNO'
    };
    
    const renderMessage = (msg) => {
        if (msg.type === 'challenge') {
            // Extract challenge data (may be nested in msg.data or flat on msg)
            const challengeData = msg.data || msg;
            const wagerAmount = challengeData.wagerAmount ?? 0;
            const challengerName = challengeData.challengerName || msg.challengerName || 'Unknown';
            const gameType = challengeData.gameType || msg.gameType;
            const challengeId = challengeData.challengeId || msg.challengeId;
            const wagerToken = challengeData.wagerToken; // Token wager info if present
            
            const canAfford = playerCoins >= wagerAmount;
            const isExpired = msg.expiresAt && msg.expiresAt < Date.now();
            
            return (
                <div key={msg.id} className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500/20 flex items-center justify-center text-base sm:text-lg shrink-0">
                            ⚔️
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm sm:text-base">
                                Challenge from <span className="text-red-400 truncate">{challengerName}</span>
                            </p>
                            <p className="text-white/60 text-xs sm:text-sm">
                                {gameNames[gameType] || gameType} • <span className="text-yellow-400">{wagerAmount} coins</span>
                            </p>
                            
                            {/* Token Wager Details - with copy CA, Solscan link, and balance check */}
                            {wagerToken && <TokenWagerInfo wagerToken={wagerToken} walletAddress={userData?.walletAddress} />}
                            
                            {!isExpired && msg.expiresAt && (
                                <p className="text-white/40 text-[10px] sm:text-xs mt-1">
                                    ⏱️ {formatTimeRemaining(msg.expiresAt)} remaining
                                </p>
                            )}
                            {isExpired && (
                                <p className="text-red-400 text-[10px] sm:text-xs mt-1">⏰ Expired</p>
                            )}
                            
                            {!isExpired && (
                                <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                                    <button
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            // Pass full challenge data for token wager signing
                                            acceptChallenge(challengeId, challengeData); 
                                        }}
                                        disabled={!canAfford || isInMatch}
                                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95 ${
                                            canAfford && !isInMatch
                                                ? 'bg-green-500 text-white hover:bg-green-400 active:bg-green-600'
                                                : 'bg-gray-600 text-white/50 cursor-not-allowed'
                                        }`}
                                        title={!canAfford ? 'Insufficient coins' : isInMatch ? 'Already in match' : ''}
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); denyChallenge(challengeId); }}
                                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 active:bg-red-500/40 transition-colors active:scale-95"
                                    >
                                        Deny
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteInboxMessage(msg.id); }}
                                        className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm text-white/40 hover:text-white active:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            )}
                            
                            {!canAfford && !isExpired && (
                                <p className="text-yellow-400 text-[10px] sm:text-xs mt-1.5 sm:mt-2">
                                    ⚠️ You need {wagerAmount - playerCoins} more coins
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
        
        if (msg.type === 'challenge_response') {
            // Extract response data (may be nested in msg.data or flat on msg)
            const responseData = msg.data || msg;
            const respWagerAmount = responseData.wagerAmount ?? msg.wagerAmount ?? 0;
            const respGameType = responseData.gameType || msg.gameType;
            const respOtherPlayer = responseData.otherPlayerName || msg.otherPlayerName || 'Unknown';
            const respResponse = responseData.response || msg.response;
            
            const icons = {
                'accepted': '✅',
                'denied': '❌',
                'deleted': '🗑️',
                'expired': '⏰'
            };
            
            const messages = {
                'accepted': `accepted your challenge!`,
                'denied': `denied your challenge`,
                'deleted': `ignored your challenge`,
                'expired': `- Challenge expired`
            };
            
            return (
                <div key={msg.id} className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center text-base sm:text-lg shrink-0">
                            {icons[respResponse] || '📩'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm sm:text-base">
                                <span className="font-medium truncate">{respOtherPlayer}</span>{' '}
                                <span className="text-white/70">{messages[respResponse]}</span>
                            </p>
                            <p className="text-white/40 text-[10px] sm:text-xs mt-1">
                                {gameNames[respGameType]} • {respWagerAmount} coins
                            </p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteInboxMessage(msg.id); }}
                            className="p-1.5 sm:p-2 text-white/40 hover:text-white active:text-white hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            );
        }
        
        if (msg.type === 'system') {
            return (
                <div key={msg.id} className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-base sm:text-lg shrink-0">
                            📢
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm sm:text-base">{msg.text}</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteInboxMessage(msg.id); }}
                            className="p-1.5 sm:p-2 text-white/40 hover:text-white active:text-white hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            );
        }
        
        return null;
    };
    
    // Stop propagation to prevent 3D canvas interactions
    const handlePanelInteraction = (e) => {
        e.stopPropagation();
    };
    
    return (
        <div 
            className="fixed inset-0 z-40 flex items-start justify-center sm:justify-end p-2 sm:p-4 pt-16 sm:pt-20 pointer-events-none"
            onMouseDown={handlePanelInteraction}
            onClick={handlePanelInteraction}
            onTouchStart={handlePanelInteraction}
        >
            <div 
                ref={panelRef}
                data-no-camera="true"
                className="pointer-events-auto bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl w-full sm:w-96 max-w-[95vw] max-h-[60vh] sm:max-h-[70vh] flex flex-col animate-fade-in"
                onMouseDown={handlePanelInteraction}
                onClick={handlePanelInteraction}
                onTouchStart={handlePanelInteraction}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10">
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        📥 Inbox
                        {(inbox.length > 0 || (pendingChallenges && pendingChallenges.length > 0)) && (
                            <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] sm:text-xs">
                                {inbox.length + (pendingChallenges?.length || 0)}
                            </span>
                        )}
                    </h3>
                    <button 
                        onClick={() => setShowInbox(false)}
                        className="text-white/50 hover:text-white active:text-white transition-colors text-lg sm:text-xl w-8 h-8 flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
                    {/* Pending Outgoing Challenges (sent by you) */}
                    {pendingChallenges && pendingChallenges.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-white/40 text-xs uppercase tracking-wider font-medium">
                                Sent Challenges
                            </p>
                            {pendingChallenges.map(challenge => (
                                <div 
                                    key={challenge.id} 
                                    className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-sm shrink-0">
                                                ⏳
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white text-sm truncate">
                                                    → <span className="text-blue-400">{challenge.targetName}</span>
                                                </p>
                                                <p className="text-white/50 text-xs">
                                                    {gameNames[challenge.gameType] || challenge.gameType}
                                                    {challenge.wagerAmount > 0 && (
                                                        <span className="text-yellow-400"> • {challenge.wagerAmount} coins</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); cancelChallenge(challenge.id); }}
                                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 active:bg-red-500/40 transition-colors shrink-0"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Divider if both sections have content */}
                    {pendingChallenges && pendingChallenges.length > 0 && inbox.length > 0 && (
                        <hr className="border-white/10" />
                    )}
                    
                    {/* Incoming messages */}
                    {inbox.length === 0 && (!pendingChallenges || pendingChallenges.length === 0) ? (
                        <div className="text-center py-6 sm:py-8">
                            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📭</div>
                            <p className="text-white/50 text-sm sm:text-base">No messages yet</p>
                            <p className="text-white/30 text-xs sm:text-sm mt-1">
                                Challenge requests will appear here
                            </p>
                        </div>
                    ) : (
                        inbox.map(msg => renderMessage(msg))
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-3 sm:p-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-white/50">Your Balance</span>
                        <span className="text-yellow-400 font-bold">💰 {playerCoins}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Inbox;

