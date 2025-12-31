/**
 * WalletAuth - Phantom wallet authentication UI for Avatar Designer
 * Explains x403 auth, why it's safe, and handles the connection flow
 * Supports both desktop (extension) and mobile (Phantom app)
 */

import React, { useState, useEffect } from 'react';
import { useMultiplayer } from '../multiplayer/MultiplayerContext';
import PhantomWallet from '../wallet/PhantomWallet';

function WalletAuth({ onAuthSuccess }) {
    const { 
        isAuthenticated, 
        walletAddress, 
        userData,
        isAuthenticating,
        authError,
        connectWallet,
        disconnectWallet
    } = useMultiplayer();
    
    const [showInfo, setShowInfo] = useState(false);
    const [mobileStatus, setMobileStatus] = useState({ isMobile: false, needsRedirect: false });
    
    // Check mobile status on mount
    useEffect(() => {
        const wallet = PhantomWallet.getInstance();
        setMobileStatus(wallet.getMobileStatus());
    }, []);
    
    const handleConnect = async () => {
        const result = await connectWallet();
        if (result.success || result.pending) {
            // Auth will complete via message handler
        }
    };
    
    const handleMobileRedirect = () => {
        const wallet = PhantomWallet.getInstance();
        wallet.openPhantomMobile();
    };
    
    // If already authenticated, show connected state
    if (isAuthenticated && walletAddress) {
        const shortAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        
        return (
            <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-xl p-4 border border-green-500/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 
                                    flex items-center justify-center text-lg shadow-lg">
                        ✓
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">{userData?.username || 'Connected'}</span>
                            <span className="text-green-300/60 text-xs">{shortAddress}</span>
                        </div>
                        <div className="text-xs text-green-200/60 mt-0.5">
                            💰 {userData?.coins?.toLocaleString() || 0} coins • Progress saves automatically
                        </div>
                    </div>
                </div>
                
                <button
                    onClick={disconnectWallet}
                    className="mt-3 w-full px-3 py-2 bg-black/30 hover:bg-red-900/30 border border-white/10 
                               hover:border-red-500/30 rounded-lg text-white/60 hover:text-red-400 
                               text-xs transition-all"
                >
                    Disconnect Wallet
                </button>
            </div>
        );
    }
    
    // Guest state - show connect UI
    return (
        <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-xl border border-purple-500/30 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-purple-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-600/50 flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-300" viewBox="0 0 40 40" fill="currentColor">
                                <path d="M34.9 17.1c-.5-4.8-3.8-8.1-8.5-8.6-2.4-.3-4.8.4-6.7 1.9-1.9 1.4-3.1 3.5-3.5 5.8-.1.6-.1 1.2-.1 1.9 0 .1 0 .1-.1.1H5.8c-.7 0-1.3.6-1.3 1.3v.6c0 3.9 1.6 7.5 4.4 10.2 2.8 2.7 6.4 4.2 10.3 4.2h.5c7.9-.3 14.3-7 14.3-15 0-1-.1-2-.1-2.4z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Sign In with Phantom</h3>
                            <p className="text-purple-300/60 text-xs">Save progress & earn coins</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowInfo(!showInfo)}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                        title="What is x403 authentication?"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>
            </div>
            
            {/* Info Panel (expandable) */}
            {showInfo && (
                <div className="px-4 py-3 bg-black/20 border-b border-purple-500/20">
                    <h4 className="text-purple-300 font-semibold text-xs mb-2 flex items-center gap-1">
                        <span>🔐</span> What is x403 Authentication?
                    </h4>
                    <div className="space-y-2 text-xs text-white/70">
                        <p>
                            <strong className="text-purple-300">x403</strong> is a secure, gasless signature-based 
                            authentication standard for Web3 games. Instead of connecting your wallet to a smart 
                            contract, you simply sign a message to prove ownership.
                        </p>
                        <div className="bg-black/30 rounded-lg p-2 mt-2">
                            <p className="text-green-400 font-medium mb-1">✓ Why it's safe:</p>
                            <ul className="space-y-1 text-white/60">
                                <li>• <strong>No transactions</strong> - You're only signing a message, not approving any transfers</li>
                                <li>• <strong>No gas fees</strong> - Signing is completely free</li>
                                <li>• <strong>No contract approval</strong> - We can't move your tokens</li>
                                <li>• <strong>One-time per session</strong> - You stay logged in for 24+ hours</li>
                            </ul>
                        </div>
                        <p className="text-white/50 italic">
                            Think of it like signing a guest book to prove you arrived - it doesn't give 
                            anyone access to your wallet or funds.
                        </p>
                    </div>
                </div>
            )}
            
            {/* Benefits */}
            <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/80">
                    <span className="text-green-400">✓</span>
                    <span>Earn and keep coins from minigames</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/80">
                    <span className="text-green-400">✓</span>
                    <span>Wager coins in P2P challenges</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/80">
                    <span className="text-green-400">✓</span>
                    <span>Save customizations & progress</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/80">
                    <span className="text-green-400">✓</span>
                    <span>Track stats & achievements</span>
                </div>
            </div>
            
            {/* Connect Button */}
            <div className="p-4 pt-0">
                {/* Mobile - needs Phantom app */}
                {mobileStatus.isMobile && mobileStatus.needsRedirect ? (
                    <div className="space-y-2">
                        <button
                            onClick={handleMobileRedirect}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                       bg-gradient-to-r from-purple-600 to-indigo-600 
                                       hover:from-purple-500 hover:to-indigo-500
                                       rounded-lg text-white font-bold text-sm shadow-lg 
                                       border-b-4 border-purple-800 hover:border-purple-700
                                       transition-all active:scale-[0.98] active:border-b-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 40 40" fill="currentColor">
                                <path d="M34.9 17.1c-.5-4.8-3.8-8.1-8.5-8.6-2.4-.3-4.8.4-6.7 1.9-1.9 1.4-3.1 3.5-3.5 5.8-.1.6-.1 1.2-.1 1.9 0 .1 0 .1-.1.1H5.8c-.7 0-1.3.6-1.3 1.3v.6c0 3.9 1.6 7.5 4.4 10.2 2.8 2.7 6.4 4.2 10.3 4.2h.5c7.9-.3 14.3-7 14.3-15 0-1-.1-2-.1-2.4z"/>
                            </svg>
                            Open in Phantom App
                        </button>
                        <p className="text-center text-xs text-purple-300/60">
                            📱 Mobile: Opens this page in Phantom's browser
                        </p>
                    </div>
                ) : (
                    /* Desktop or Phantom browser - direct connect */
                    <button
                        onClick={handleConnect}
                        disabled={isAuthenticating}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                   bg-gradient-to-r from-purple-600 to-indigo-600 
                                   hover:from-purple-500 hover:to-indigo-500
                                   disabled:from-slate-600 disabled:to-slate-700
                                   rounded-lg text-white font-bold text-sm shadow-lg 
                                   border-b-4 border-purple-800 hover:border-purple-700
                                   disabled:border-slate-800 transition-all
                                   active:scale-[0.98] active:border-b-2"
                    >
                        {isAuthenticating ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" 
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Waiting for signature...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 40 40" fill="currentColor">
                                    <path d="M34.9 17.1c-.5-4.8-3.8-8.1-8.5-8.6-2.4-.3-4.8.4-6.7 1.9-1.9 1.4-3.1 3.5-3.5 5.8-.1.6-.1 1.2-.1 1.9 0 .1 0 .1-.1.1H5.8c-.7 0-1.3.6-1.3 1.3v.6c0 3.9 1.6 7.5 4.4 10.2 2.8 2.7 6.4 4.2 10.3 4.2h.5c7.9-.3 14.3-7 14.3-15 0-1-.1-2-.1-2.4z"/>
                                </svg>
                                Connect Phantom Wallet
                            </>
                        )}
                    </button>
                )}
                
                {/* Error display */}
                {authError && (
                    <div className={`mt-3 p-3 rounded-lg border ${
                        authError.code === 'BANNED' 
                            ? 'bg-red-900/50 border-red-500/50' 
                            : 'bg-red-900/30 border-red-500/30'
                    }`}>
                        <p className={`text-xs ${
                            authError.code === 'BANNED' 
                                ? 'text-red-300 font-semibold' 
                                : 'text-red-400'
                        }`}>
                            {authError.code === 'BANNED' ? (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🚫</span>
                                        <span className="font-bold">Account Banned</span>
                                    </div>
                                    <div className="pl-7 text-red-200/90 whitespace-pre-line">
                                        {authError.message || 'Your account has been banned. Access denied.'}
                                    </div>
                                </div>
                            ) : authError.code === 'PHANTOM_NOT_INSTALLED' ? (
                                mobileStatus.isMobile ? (
                                    <>
                                        Open this site in{' '}
                                        <a 
                                            href="https://phantom.app/" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-purple-400 underline hover:text-purple-300"
                                        >
                                            Phantom App
                                        </a>
                                        {' '}to connect
                                    </>
                                ) : (
                                    <>
                                        Phantom not found.{' '}
                                        <a 
                                            href="https://phantom.app/" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-purple-400 underline hover:text-purple-300"
                                        >
                                            Install Phantom →
                                        </a>
                                    </>
                                )
                            ) : authError.code === 'MOBILE_REDIRECT_NEEDED' ? (
                                <>
                                    📱 Tap "Open in Phantom App" above to continue
                                </>
                            ) : authError.code === 'USER_REJECTED' ? (
                                'Signature cancelled. Click connect to try again.'
                            ) : (
                                authError.message || 'Connection failed. Please try again.'
                            )}
                        </p>
                    </div>
                )}
                
                {/* Guest mode note */}
                <p className="text-center text-xs text-white/40 mt-3">
                    Or continue as guest (progress won't save)
                </p>
            </div>
        </div>
    );
}

export default WalletAuth;

