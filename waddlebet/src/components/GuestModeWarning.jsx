/**
 * GuestModeWarning - Persistent warning banner for guest users
 * Explains limitations and encourages wallet connection
 */

import React, { useState } from 'react';
import { useMultiplayer } from '../multiplayer/MultiplayerContext';
import { useLanguage } from '../i18n';

function GuestModeWarning({ onRequestAuth }) {
    const { isAuthenticated, isRestoringSession } = useMultiplayer();
    const { t } = useLanguage();
    const [dismissed, setDismissed] = useState(false);
    
    // Don't show if authenticated, restoring, or dismissed
    if (isAuthenticated || isRestoringSession || dismissed) {
        return null;
    }
    
    return (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50">
            <div className="bg-gradient-to-r from-amber-900/95 to-orange-900/95 backdrop-blur-sm 
                            rounded-xl border border-amber-500/40 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-black/20 border-b border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-300">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" 
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                                  clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">{t('guest.title')}</span>
                    </div>
                    <button 
                        onClick={() => setDismissed(true)}
                        className="text-amber-400/60 hover:text-amber-300 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-4">
                    <p className="text-amber-100/90 text-sm mb-4">
                        {t('guest.warning')}
                    </p>
                    
                    <ul className="space-y-2 mb-4">
                        <li className="flex items-center gap-2 text-sm text-amber-200/80">
                            <span className="text-red-400">✗</span>
                            {t('guest.noCoins')}
                        </li>
                        <li className="flex items-center gap-2 text-sm text-amber-200/80">
                            <span className="text-red-400">✗</span>
                            {t('guest.noWager')}
                        </li>
                        <li className="flex items-center gap-2 text-sm text-amber-200/80">
                            <span className="text-red-400">✗</span>
                            {t('guest.noSave')}
                        </li>
                        <li className="flex items-center gap-2 text-sm text-amber-200/80">
                            <span className="text-red-400">✗</span>
                            {t('guest.noCustomization')}
                        </li>
                    </ul>
                    
                    {/* CTA Button */}
                    <button
                        onClick={onRequestAuth}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                   bg-gradient-to-r from-purple-600 to-indigo-600 
                                   hover:from-purple-500 hover:to-indigo-500
                                   rounded-lg text-white font-medium shadow-lg 
                                   border border-purple-400/30 transition-all"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 40 40" fill="none">
                            <path d="M34.9 17.1c-.5-4.8-3.8-8.1-8.5-8.6-2.4-.3-4.8.4-6.7 1.9-1.9 1.4-3.1 3.5-3.5 5.8-.1.6-.1 1.2-.1 1.9 0 .1 0 .1-.1.1H5.8c-.7 0-1.3.6-1.3 1.3v.6c0 3.9 1.6 7.5 4.4 10.2 2.8 2.7 6.4 4.2 10.3 4.2h.5c7.9-.3 14.3-7 14.3-15 0-1-.1-2-.1-2.4z" 
                                  fill="currentColor"/>
                        </svg>
                        {t('guest.signIn')}
                    </button>
                    
                    <p className="text-center text-xs text-amber-300/50 mt-3">
                        {t('guest.freeSecure')}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default GuestModeWarning;

