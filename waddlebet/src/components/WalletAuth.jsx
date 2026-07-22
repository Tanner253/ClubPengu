/**
 * WalletAuth - Phantom (Solana) and MetaMask (Robinhood Chain) sign-in UI
 */

import React, { useState, useEffect } from 'react';
import { useMultiplayer } from '../multiplayer/MultiplayerContext';
import PhantomWallet from '../wallet/PhantomWallet';
import MetaMaskWallet from '../wallet/MetaMaskWallet';
import { getActiveRobinhoodChain } from '../config/evm.js';

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
    const robinhoodChain = getActiveRobinhoodChain();
    
    const [activeProvider, setActiveProvider] = useState(null);
    
    useEffect(() => {
        const wallet = PhantomWallet.getInstance();
        setMobileStatus(wallet.getMobileStatus());
    }, []);

    useEffect(() => {
        if (!isAuthenticating) {
            setActiveProvider(null);
        }
    }, [isAuthenticating]);
    
    const providerLabel = (provider, idleText) => {
        if (!isAuthenticating || activeProvider !== provider) return idleText;
        if (provider === 'phantom') return 'Connect in Phantom…';
        return 'Sign in MetaMask…';
    };
    
    const handleConnect = async (provider) => {
        setActiveProvider(provider);
        const result = await connectWallet(provider);
        if (!result.success && !result.pending) {
            setActiveProvider(null);
        }
    };
    
    const handleMobileRedirect = () => {
        const wallet = PhantomWallet.getInstance();
        wallet.openPhantomMobile();
    };

    const shortAddress = walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : '';
    const isEvmAccount = userData?.chainId && userData.chainId !== 'solana';
    
    if (isAuthenticated && walletAddress) {
        return (
            <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-xl p-4 border border-green-500/30">
                <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-green-400 font-bold">{userData?.username || 'Connected'}</span>
                            <span className="text-green-300/60 text-xs">{shortAddress}</span>
                            {isEvmAccount && (
                                <span className="text-[10px] uppercase tracking-wide text-amber-300/80 bg-amber-900/30 px-1.5 py-0.5 rounded">
                                    Robinhood
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-green-200/60 mt-0.5">
                            💰 {userData?.coins?.toLocaleString() || 0} coins
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
    
    return (
        <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-xl border border-purple-500/30 overflow-hidden">
            <div className="p-4 border-b border-purple-500/20">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-bold text-sm">Sign In with Wallet</h3>
                        <p className="text-purple-300/60 text-xs">Phantom (Solana) or MetaMask (Robinhood Chain)</p>
                    </div>
                    <button 
                        onClick={() => setShowInfo(!showInfo)}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                        title="How wallet sign-in works"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>
            </div>
            
            {showInfo && (
                <div className="px-4 py-3 bg-black/20 border-b border-purple-500/20">
                    <h4 className="text-purple-300 font-semibold text-xs mb-2">🔐 Gasless wallet sign-in</h4>
                    <div className="space-y-2 text-xs text-white/70">
                        <p>
                            Solana uses our x403 message format. Robinhood Chain uses <strong className="text-purple-300">Sign-In with Ethereum (SIWE)</strong>,
                            the industry-standard EVM login flow. You only sign a message — no transaction, no gas fee.
                        </p>
                        <p className="text-white/50">
                            Solana and Robinhood accounts are separate (one wallet address per chain).
                        </p>
                    </div>
                </div>
            )}
            
            <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-white/80">
                    <span className="text-green-400">✓</span>
                    <span>Save customizations & progress</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/80">
                    <span className="text-green-400">✓</span>
                    <span>Earn gold from minigames & quests</span>
                </div>
            </div>
            
            <div className="p-4 pt-0 space-y-2">
                {mobileStatus.isMobile && mobileStatus.needsRedirect ? (
                    <button
                        onClick={handleMobileRedirect}
                        disabled={isAuthenticating}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                   bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white font-bold text-sm"
                    >
                        Open in Phantom App
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => handleConnect('phantom')}
                            disabled={isAuthenticating}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                       bg-gradient-to-r from-purple-600 to-indigo-600 
                                       hover:from-purple-500 hover:to-indigo-500
                                       disabled:from-slate-600 disabled:to-slate-700
                                       rounded-lg text-white font-bold text-sm shadow-lg 
                                       border-b-4 border-purple-800 transition-all active:scale-[0.98]"
                        >
                            {providerLabel('phantom', 'Connect Phantom (Solana)')}
                        </button>

                        <button
                            onClick={() => handleConnect('metamask')}
                            disabled={isAuthenticating}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                       bg-gradient-to-r from-amber-700 to-orange-700 
                                       hover:from-amber-600 hover:to-orange-600
                                       disabled:from-slate-600 disabled:to-slate-700
                                       rounded-lg text-white font-bold text-sm shadow-lg 
                                       border-b-4 border-amber-900 transition-all active:scale-[0.98]"
                        >
                            <img src="/robinhood-logo.png" alt="" width={18} height={18} className="rounded" />
                            {providerLabel('metamask', `MetaMask (${robinhoodChain.name})`)}
                        </button>
                    </>
                )}
                
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
                                authError.message || 'Your account has been banned.'
                            ) : authError.code === 'PHANTOM_NOT_INSTALLED' ? (
                                <>Phantom not found. <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">Install Phantom →</a></>
                            ) : authError.code === 'METAMASK_NOT_INSTALLED' ? (
                                <>MetaMask not found. <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-amber-300 underline">Install MetaMask →</a></>
                            ) : authError.code === 'USER_REJECTED' ? (
                                'Signature cancelled. Click connect to try again.'
                            ) : (
                                authError.message || 'Connection failed. Please try again.'
                            )}
                        </p>
                    </div>
                )}
                
                <p className="text-center text-xs text-white/40 mt-3">
                    Or continue as guest (progress won&apos;t save)
                </p>
            </div>
        </div>
    );
}

export default WalletAuth;
