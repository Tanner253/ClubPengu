import React, { useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../i18n';
import { getRoomLabel, sortPopulationRooms } from '../utils/roomLabels';

const VISIBLE_NAMES = 5;

/**
 * Compact live server population — non-empty rooms only.
 */
const ServerPopulationPopup = ({
    isOpen,
    onClose,
    population = {},
    totalPlayerCount = 0,
    currentRoom,
    anchorRef,
    compact = false,
}) => {
    const { t } = useLanguage();
    const popupRef = useRef(null);

    const activeRooms = useMemo(() => {
        const ids = Object.keys(population).filter((roomId) => {
            const entry = population[roomId];
            return entry && entry.count > 0;
        });
        return sortPopulationRooms(ids);
    }, [population]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handlePointerDown = (event) => {
            const anchor = anchorRef?.current;
            const popup = popupRef.current;
            if (popup?.contains(event.target) || anchor?.contains(event.target)) return;
            onClose();
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    return (
        <div
            ref={popupRef}
            className={`absolute z-50 bg-black/90 backdrop-blur-md border border-cyan-400/40 rounded-lg shadow-xl shadow-cyan-500/10 ${
                compact ? 'top-full right-0 mt-1 w-52' : 'top-full right-0 mt-2 w-64'
            }`}
            role="dialog"
            aria-label={t('hud.serverPopulation')}
        >
            <div className={`flex items-center justify-between border-b border-white/10 ${
                compact ? 'px-2 py-1.5' : 'px-3 py-2'
            }`}>
                <span className={`font-bold text-cyan-300 retro-text ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    👥 {t('hud.serverPopulation')}
                </span>
                <span className={`text-green-400 font-bold retro-text ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    {totalPlayerCount} {t('hud.onlineNow')}
                </span>
            </div>

            {activeRooms.length === 0 ? (
                <div className={`text-slate-400 retro-text ${compact ? 'px-2 py-2 text-[10px]' : 'px-3 py-3 text-xs'}`}>
                    {t('hud.noPlayersOnline')}
                </div>
            ) : (
                <div className={`max-h-64 overflow-y-auto ${compact ? 'py-1' : 'py-1.5'}`}>
                    {activeRooms.map((roomId) => {
                        const entry = population[roomId];
                        const names = entry?.players || [];
                        const visible = names.slice(0, VISIBLE_NAMES);
                        const others = names.length - visible.length;
                        const isCurrent = roomId === currentRoom;

                        return (
                            <div
                                key={roomId}
                                className={`border-b border-white/5 last:border-b-0 ${
                                    isCurrent ? 'bg-cyan-500/10' : ''
                                } ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`font-bold retro-text truncate ${
                                        isCurrent ? 'text-cyan-300' : 'text-white'
                                    } ${compact ? 'text-[10px]' : 'text-xs'}`}>
                                        {getRoomLabel(roomId, t)}
                                    </span>
                                    <span className={`shrink-0 text-cyan-400/80 font-bold retro-text ${
                                        compact ? 'text-[9px]' : 'text-[10px]'
                                    }`}>
                                        {entry.count}
                                    </span>
                                </div>
                                <ul className={`mt-0.5 space-y-0.5 ${compact ? 'pl-0.5' : 'pl-1'}`}>
                                    {visible.map((name, idx) => (
                                        <li
                                            key={`${roomId}-${idx}-${name}`}
                                            className={`text-slate-300 truncate retro-text ${
                                                compact ? 'text-[9px]' : 'text-[10px]'
                                            }`}
                                        >
                                            {name}
                                        </li>
                                    ))}
                                    {others > 0 && (
                                        <li className={`text-slate-500 italic retro-text ${
                                            compact ? 'text-[9px]' : 'text-[10px]'
                                        }`}>
                                            {t('hud.andOthers').replace('{count}', String(others))}
                                        </li>
                                    )}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ServerPopulationPopup;
