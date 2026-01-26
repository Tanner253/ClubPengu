/**
 * WalletButton - Phantom wallet connection button with status indicator
 * Shows guest mode warning and allows wallet connection
 * When clicked in-game, redirects to penguin maker for clean auth flow
 */

import React, { useState } from 'react';
import { useMultiplayer } from '../multiplayer/MultiplayerContext';
import { useLanguage } from '../i18n';

function WalletButton({ className = '', onRequestAuth, compact = false }) {
    const { 
        isAuthenticated, 
        walletAddress, 
        isAuthenticating,
        isRestoringSession,
        authError,
        disconnectWallet,
        userData
    } = useMultiplayer();
    const { t } = useLanguage();
    
    const [showDropdown, setShowDropdown] = useState(false);
    
    const handleConnect = () => {
        // If onRequestAuth is provided (we're in-game), trigger redirect to penguin maker
        if (onRequestAuth) {
            onRequestAuth();
        }
    };
    
    const handleDisconnect = async () => {
        await disconnectWallet();
        setShowDropdown(false);
    };
    
    // Authenticated state
    if (isAuthenticated && walletAddress) {
        const shortAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        
        return (
            <div className={`relative ${className}`}>
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={`flex items-center bg-gradient-to-r from-green-600 to-emerald-600 
                               hover:from-green-500 hover:to-emerald-500 rounded-lg text-white font-medium
                               shadow-lg border border-green-400/30 transition-all ${
                                   compact ? 'gap-1 px-2 py-1 text-xs' : 'gap-2 px-3 py-2 text-sm'
                               }`}
                >
                    <div className={`bg-green-300 rounded-full animate-pulse ${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
                    {!compact && <span className="hidden sm:inline">{shortAddress}</span>}
                    {!compact && <span className="sm:hidden">{t('wallet.connected')}</span>}
                    {compact && <span>✓</span>}
                    {!compact && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </button>
                
                {showDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 rounded-lg shadow-xl 
                                    border border-slate-600 overflow-hidden z-50">
                        <div className="p-4 border-b border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 
                                                flex items-center justify-center text-lg">
                                    🐧
                                </div>
                                <div>
                                    <div className="font-medium text-white">
                                        {userData?.username || 'Penguin'}
                                    </div>
                                    <div className="text-xs text-slate-400">{shortAddress}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-3 border-b border-slate-700">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">{t('wallet.coins')}</span>
                                <span className="text-yellow-400 font-medium">
                                    💰 {userData?.coins?.toLocaleString() || 0}
                                </span>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleDisconnect}
                            className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-slate-700/50 
                                       transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            {t('wallet.disconnect')}
                        </button>
                    </div>
                )}
            </div>
        );
    }
    
    // Restoring session state
    if (isRestoringSession) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-900/50 rounded-lg 
                               border border-purple-500/30 text-purple-300 text-sm">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" 
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="hidden sm:inline">{t('wallet.restoring')}</span>
                    </div>
                </div>
            );
        }
        
        // Guest state - show connect button with warning
        return (
            <div className={`flex items-center gap-1 ${compact ? '' : 'gap-2'} ${className}`}>
                {/* Guest indicator - hide on compact */}
                {!compact && (
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-amber-900/50 rounded-lg 
                                    border border-amber-500/30 text-amber-300 text-xs">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" 
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                                  clipRule="evenodd" />
                        </svg>
                        <span>{t('guest.title')}</span>
                    </div>
                )}
            
            {/* Connect button */}
            <button
                onClick={handleConnect}
                disabled={isAuthenticating}
                className={`flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 
                           hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-600 disabled:to-slate-700
                           rounded-lg text-white font-medium shadow-lg border border-purple-400/30 
                           transition-all disabled:cursor-wait ${
                               compact ? 'gap-1 px-2 py-1 text-[10px]' : 'gap-2 px-3 py-2 text-sm'
                           }`}
            >
                {isAuthenticating ? (
                    <>
                        <svg className={`animate-spin ${compact ? 'w-3 h-3' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" 
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {!compact && <span>{t('wallet.connecting')}</span>}
                    </>
                ) : (
                    <>
                        <svg className={compact ? 'w-3 h-3' : 'w-4 h-4'} viewBox="0 0 40 40" fill="none">
                            <path d="M34.9 17.1c-.5-4.8-3.8-8.1-8.5-8.6-2.4-.3-4.8.4-6.7 1.9-1.9 1.4-3.1 3.5-3.5 5.8-.1.6-.1 1.2-.1 1.9 0 .1 0 .1-.1.1H5.8c-.7 0-1.3.6-1.3 1.3v.6c0 3.9 1.6 7.5 4.4 10.2 2.8 2.7 6.4 4.2 10.3 4.2h.5c7.9-.3 14.3-7 14.3-15 0-1-.1-2-.1-2.4z" 
                                  fill="currentColor"/>
                        </svg>
                        <span>{t('menu.signIn')}</span>
                    </>
                )}
            </button>
        </div>
    );
}

export default WalletButton;

