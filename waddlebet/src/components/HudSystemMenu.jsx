/**
 * HudSystemMenu — account + system actions (settings, inbox, stats, etc.)
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMultiplayer } from '../multiplayer/MultiplayerContext';
import { useChallenge } from '../challenge';
import { useLanguage } from '../i18n';
import GameHudButton from './GameHudButton';

const MENU_ITEM =
    'w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10 transition-colors';

function HudSystemMenu({
    onOpenSettings,
    onOpenStats,
    onOpenDailyBonus,
    onOpenIglooSettings,
    isInsideOwnedIgloo,
    showInbox = true,
    onRequestAuth,
    compact = false,
    useMobileOverlay = false,
}) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const { t } = useLanguage();
    const { toggleInbox, unreadCount, showInbox: inboxOpen } = useChallenge();
    const {
        isAuthenticated,
        walletAddress,
        isAuthenticating,
        isRestoringSession,
        disconnectWallet,
        userData,
        dailyBonusStatus,
    } = useMultiplayer();

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (wrapRef.current?.contains(event.target)) return;
            setOpen(false);
        };
        const handleEscape = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const closeAnd = (fn) => () => {
        setOpen(false);
        fn?.();
    };

    const handleDisconnect = async () => {
        setOpen(false);
        await disconnectWallet();
    };

    const username = userData?.username || t('hud.defaultUsername');
    const shortAddress = walletAddress
        ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
        : '';
    const hasNotifications = unreadCount > 0 || dailyBonusStatus?.canClaim;
    const triggerLabel = isAuthenticated ? username : t('menu.signIn');

    const menuPanel = open && isAuthenticated ? (
        <div
            role="menu"
            data-game-hud="true"
            className={`bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in ${
                useMobileOverlay ? 'w-full max-w-xs' : 'absolute top-full right-0 mt-1.5 w-56 z-50'
            }`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="px-3 py-2.5 border-b border-white/10">
                <div className="text-sm font-semibold text-white truncate">{username}</div>
                {shortAddress && (
                    <div className="text-[10px] text-white/45 font-mono truncate mt-0.5">{shortAddress}</div>
                )}
            </div>

            <div className="py-1">
                <GameHudButton
                    type="button"
                    role="menuitem"
                    className={`${MENU_ITEM} relative`}
                    onClick={closeAnd(onOpenDailyBonus)}
                >
                    <span>🎁</span>
                    <span>{t('hud.dailyBonusShort')}</span>
                    {dailyBonusStatus?.canClaim && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                </GameHudButton>

                {showInbox && (
                    <GameHudButton
                        type="button"
                        role="menuitem"
                        className={`${MENU_ITEM} ${inboxOpen ? 'bg-cyan-950/40' : ''}`}
                        onClick={closeAnd(toggleInbox)}
                    >
                        <span>📥</span>
                        <span>{t('hud.inbox')}</span>
                        {unreadCount > 0 && (
                            <span className="ml-auto min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </GameHudButton>
                )}

                {onOpenSettings && (
                    <GameHudButton
                        type="button"
                        role="menuitem"
                        className={MENU_ITEM}
                        onClick={closeAnd(onOpenSettings)}
                    >
                        <span>⚙️</span>
                        <span>{t('hud.settings')}</span>
                    </GameHudButton>
                )}

                <GameHudButton
                    type="button"
                    role="menuitem"
                    className={MENU_ITEM}
                    onClick={closeAnd(onOpenStats)}
                >
                    <span>📊</span>
                    <span>{t('hud.fullStats')}</span>
                </GameHudButton>

                {isInsideOwnedIgloo && onOpenIglooSettings && (
                    <GameHudButton
                        type="button"
                        role="menuitem"
                        className={MENU_ITEM}
                        onClick={closeAnd(onOpenIglooSettings)}
                    >
                        <span>🏠</span>
                        <span>{t('hud.iglooSettings')}</span>
                    </GameHudButton>
                )}
            </div>

            <div className="border-t border-white/10 py-1">
                <GameHudButton
                    type="button"
                    role="menuitem"
                    className={`${MENU_ITEM} text-red-400 hover:bg-red-950/30`}
                    onClick={handleDisconnect}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                    </svg>
                    <span>{t('wallet.disconnect')}</span>
                </GameHudButton>
            </div>
        </div>
    ) : null;

    return (
        <div ref={wrapRef} data-game-hud="true" className="relative shrink-0">
            <GameHudButton
                type="button"
                onClick={() => {
                    if (!isAuthenticated && !isRestoringSession) {
                        onRequestAuth?.();
                        return;
                    }
                    setOpen((v) => !v);
                }}
                disabled={isRestoringSession}
                className={`relative flex items-center gap-1.5 h-8 rounded-lg border transition-all backdrop-blur-md ${
                    compact ? 'pl-1 pr-1.5' : 'pl-1.5 pr-2'
                } ${
                    open
                        ? 'bg-white/15 border-white/25'
                        : 'bg-black/70 border-white/10 hover:bg-black/80 hover:border-white/20'
                } ${isAuthenticated && !compact ? 'max-w-[9rem]' : ''}`}
                aria-expanded={open}
                aria-haspopup="menu"
                title={isAuthenticated ? username : t('menu.signIn')}
            >
                <span
                    className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-sm ${
                        isAuthenticated
                            ? 'bg-gradient-to-br from-purple-500/80 to-blue-500/80'
                            : 'bg-purple-600/60'
                    }`}
                >
                    {isRestoringSession ? '…' : '🐧'}
                </span>
                {isAuthenticated && (
                    <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
                )}
                {!compact && (
                    <span className="text-xs font-semibold text-white truncate min-w-0">{triggerLabel}</span>
                )}
                {isAuthenticated && (
                    <svg className="w-3 h-3 shrink-0 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                )}
                {hasNotifications && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-black/80" />
                )}
            </GameHudButton>

            {menuPanel && !useMobileOverlay && menuPanel}

            {menuPanel && useMobileOverlay && createPortal(
                <div
                    className="fixed inset-0 z-[10050] flex items-start justify-center bg-black/50 backdrop-blur-[2px] p-3 pt-14 pointer-events-auto"
                    onClick={() => setOpen(false)}
                    data-player-modal="true"
                >
                    {menuPanel}
                </div>,
                document.body,
            )}

            {!isAuthenticated && isAuthenticating && (
                <div className="absolute top-full right-0 mt-1 text-[10px] text-purple-300 whitespace-nowrap">
                    {t('wallet.connecting')}
                </div>
            )}
        </div>
    );
}

export default HudSystemMenu;
