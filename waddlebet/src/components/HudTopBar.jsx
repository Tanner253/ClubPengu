/**
 * HudTopBar — zoned HUD: economy strip, action icons, account menu.
 * Used on desktop and mobile (compact mode on portrait).
 */

import React from 'react';
import ServerPopulationPopup from './ServerPopulationPopup';
import HudSystemMenu from './HudSystemMenu';
import GameHudButton from './GameHudButton';
import { formatCompactNumber, formatFullNumber } from '../utils/formatCompactNumber';

const BAR_SHELL = 'flex items-center bg-black/70 backdrop-blur-md rounded-lg border border-white/10';
const BAR_DIVIDER = 'w-px h-4 bg-white/15 shrink-0';
const ECON_BTN =
    'flex items-center gap-1 px-2.5 h-8 hover:bg-white/5 transition-colors touch-manipulation';
const ACTION_BTN =
    'w-8 h-8 flex items-center justify-center text-sm rounded-md hover:bg-white/10 transition-colors touch-manipulation';

function HudTopBar({
    coins,
    pebbles,
    isAuthenticated,
    playerCount,
    onlineTotal,
    serverPopulation,
    currentRoom,
    onDropGold,
    onPebblesPurchase,
    onBackpack,
    onInventory,
    onMarket,
    onOpenSettings,
    onOpenStats,
    onOpenDailyBonus,
    onOpenIglooSettings,
    isInsideOwnedIgloo,
    showInbox,
    onRequestAuth,
    onRefreshPopulation,
    isMobile = false,
    compact = false,
    mobileServerPopOpen = false,
    onToggleMobileServerPop,
    t,
}) {
    const populationButton = (
        <div
            className="relative group"
            onMouseEnter={!isMobile ? onRefreshPopulation : undefined}
        >
            <GameHudButton
                type="button"
                className={`${ECON_BTN} text-cyan-300 ${compact ? 'px-2' : ''}`}
                title={t('hud.serverPopulationHint')}
                aria-haspopup="true"
                aria-expanded={isMobile ? mobileServerPopOpen : undefined}
                onClick={isMobile ? onToggleMobileServerPop : undefined}
            >
                <span className="text-xs">👥</span>
                <span className={`font-bold retro-text tabular-nums ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                    {playerCount + 1}
                </span>
                <span className="text-white/30 text-[9px]">/</span>
                <span className={`font-bold retro-text text-emerald-400 tabular-nums ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                    {onlineTotal}
                </span>
            </GameHudButton>
            {!isMobile && (
                <div className="absolute top-full right-0 z-50 pt-1 hidden group-hover:block">
                    <ServerPopulationPopup
                        population={serverPopulation}
                        totalPlayerCount={onlineTotal}
                        currentRoom={currentRoom}
                        compact
                    />
                </div>
            )}
        </div>
    );

    const anchorClass = compact
        ? 'absolute top-1.5 left-1.5 right-1.5 z-20 flex items-center justify-end gap-1 pointer-events-none [&_button]:pointer-events-auto [&>div]:pointer-events-auto'
        : 'absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-none [&_button]:pointer-events-auto [&>div]:pointer-events-auto';

    return (
        <div data-game-hud="true" className={anchorClass}>
            <div className={`flex items-center ${compact ? 'gap-1 max-w-full' : 'gap-2'}`}>
                {/* Economy + population */}
                <div className={BAR_SHELL}>
                    {isAuthenticated ? (
                        <GameHudButton
                            type="button"
                            onClick={onDropGold}
                            className={`${ECON_BTN} text-yellow-300 ${compact ? 'px-2' : ''}`}
                            title={`${t('hud.dropGold')} — ${formatFullNumber(coins)}`}
                        >
                            <span className="text-xs">💰</span>
                            <span className={`font-bold retro-text tabular-nums ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                                {formatCompactNumber(coins)}
                            </span>
                        </GameHudButton>
                    ) : (
                        <div
                            className={`${ECON_BTN} text-yellow-300 ${compact ? 'px-2' : ''}`}
                            title={formatFullNumber(coins)}
                        >
                            <span className="text-xs">💰</span>
                            <span className={`font-bold retro-text tabular-nums ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                                {formatCompactNumber(coins)}
                            </span>
                        </div>
                    )}

                    {isAuthenticated && (
                        <>
                            <span className={BAR_DIVIDER} />
                            <GameHudButton
                                type="button"
                                onClick={onPebblesPurchase}
                                className={`${ECON_BTN} text-purple-300 group ${compact ? 'px-2' : ''}`}
                                title={`${t('hud.buyPebbles')} — ${formatFullNumber(pebbles)}`}
                            >
                                <span className="text-xs">🪨</span>
                                <span className={`font-bold retro-text tabular-nums ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                                    {formatCompactNumber(pebbles)}
                                </span>
                                <span className="text-[10px] text-emerald-400 opacity-50 group-hover:opacity-100 transition-opacity ml-0.5">+</span>
                            </GameHudButton>
                        </>
                    )}

                    <span className={BAR_DIVIDER} />
                    {populationButton}
                </div>

                {/* Primary game actions */}
                {isAuthenticated && (
                    <div className={`${BAR_SHELL} p-0.5 gap-0.5 shrink-0`} role="toolbar" aria-label={t('hud.actions')}>
                        <GameHudButton
                            type="button"
                            className={`${ACTION_BTN} hover:bg-teal-500/20`}
                            onClick={onBackpack}
                            title={t('hud.backpack')}
                        >
                            🎒
                        </GameHudButton>
                        <GameHudButton
                            type="button"
                            className={`${ACTION_BTN} hover:bg-amber-500/20`}
                            onClick={onInventory}
                            title={t('hud.openInventory')}
                        >
                            📦
                        </GameHudButton>
                        <GameHudButton
                            type="button"
                            className={`${ACTION_BTN} hover:bg-cyan-500/20`}
                            onClick={onMarket}
                            title={t('hud.openMarketplace')}
                        >
                            🏪
                        </GameHudButton>
                    </div>
                )}

                {/* Account + system menu */}
                <HudSystemMenu
                    compact={compact}
                    useMobileOverlay={isMobile}
                    onOpenSettings={onOpenSettings}
                    onOpenStats={onOpenStats}
                    onOpenDailyBonus={onOpenDailyBonus}
                    onOpenIglooSettings={onOpenIglooSettings}
                    isInsideOwnedIgloo={isInsideOwnedIgloo}
                    showInbox={showInbox}
                    onRequestAuth={onRequestAuth}
                />
            </div>
        </div>
    );
}

export default HudTopBar;
