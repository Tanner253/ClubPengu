/**
 * TravelDialogueModal — ferry terminal: destinations with live route status.
 * Every passenger requires a paid ticket (server-authoritative).
 */

import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../hooks';
import {
    getNpcDisplayName,
    getNpcTitle,
    getRoutesForNpc,
} from '../config/travelNpcs';
import {
    TRAVEL_TIMING,
    countFerryTicketsForRoute,
    getRouteTransitSeconds,
} from '../config/travelConfig';
import { formatTravelCountdown, getTravelRouteStatusLabel } from '../utils/travelStatus';

const FERRY_THEME = {
    stallName: 'Ice Ferry Dock',
    stallIcon: '⛴️',
    panelBg: 'from-[#0a1220] via-[#0f1e38] to-[#060c14]',
    banner: 'from-sky-600 via-cyan-600 to-sky-700',
    bannerText: 'text-sky-950',
    accent: 'text-sky-300',
    accentMuted: 'text-sky-200/70',
    glow: 'rgba(56, 189, 248, 0.3)',
    frameBorder: 'border-sky-400/50',
    bubbleBg: 'bg-sky-950/50 border-sky-500/30',
    choiceBg: 'bg-sky-950/40 hover:bg-sky-900/60 border-sky-500/25 hover:border-sky-400/50',
    choiceSelected: 'bg-cyan-950/50 border-cyan-400/50 ring-1 ring-cyan-400/25',
    choiceDisabled: 'bg-black/30 border-white/5',
    badge: 'bg-sky-500/20 border-sky-400/40 text-sky-200',
    portraitRing: 'from-sky-400 to-cyan-700',
    loreBg: 'bg-[#0a1525]/80 border-sky-600/30',
};

function getPrimaryActionLabel({ selectedRoute, status, ticketCount, totalCost, hasOwnTicket }) {
    const dest = selectedRoute.name;
    if (ticketCount > 1) {
        return {
            title: `Buy ${ticketCount} tickets`,
            subtitle: `${dest} · ${totalCost}g total`,
        };
    }
    if (hasOwnTicket && totalCost === 0) {
        return {
            title: status === 'boarding' ? 'Use ticket & board' : 'Use ticket',
            subtitle: `${dest} · free from backpack`,
        };
    }
    if (hasOwnTicket && totalCost > 0) {
        return {
            title: status === 'boarding' ? 'Use ticket & pay rest' : 'Book with ticket + gold',
            subtitle: `${dest} · ${totalCost}g gold needed`,
        };
    }
    return {
        title: status === 'boarding' ? 'Buy ticket & board' : 'Buy ticket',
        subtitle: `${dest} · ${totalCost}g`,
    };
}

export default function TravelDialogueModal({
    isOpen,
    npcDef,
    onClose,
    onBook,
    onLeave,
    routeStatuses = [],
    getPlayersData = null,
    myVoyage = null,
    coins = 0,
    gameInventory = null,
    playerId = null,
    pending = false
}) {
    const [tick, setTick] = useState(0);
    const [selectedRouteId, setSelectedRouteId] = useState(null);
    const [payForPlayerIds, setPayForPlayerIds] = useState([]);
    useEscapeKey(onClose, isOpen);

    const routes = useMemo(() => getRoutesForNpc(npcDef), [npcDef]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const id = setInterval(() => setTick(t => t + 1), 500);
        return () => clearInterval(id);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !routes.length) return;
        setSelectedRouteId(prev => (
            prev && routes.some(r => r.id === prev) ? prev : routes[0].id
        ));
    }, [isOpen, npcDef, routes]);

    useEffect(() => {
        if (!isOpen) {
            setPayForPlayerIds([]);
        }
    }, [isOpen, npcDef]);

    const statusByRoute = useMemo(() => {
        const map = {};
        for (const s of routeStatuses) map[s.routeId] = s;
        return map;
    }, [routeStatuses, tick]);

    const dockNearbyPlayers = useMemo(() => {
        if (!npcDef || !getPlayersData) return [];
        const players = getPlayersData();
        const radius = (npcDef.interactionRadius || 7) + 2;
        const npcX = npcDef.x;
        const npcZ = npcDef.z;
        const aboard = new Set(myVoyage?.passengerIds || []);
        const list = [];
        for (const [id, p] of players) {
            if (id === playerId || aboard.has(id)) continue;
            const pos = p.position;
            if (!pos) continue;
            const dx = pos.x - npcX;
            const dz = pos.z - npcZ;
            if (Math.sqrt(dx * dx + dz * dz) <= radius) {
                list.push({ id, name: p.name || 'Penguin' });
            }
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [npcDef, getPlayersData, playerId, myVoyage, tick]);

    const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[0] || null;
    const selectedStatus = selectedRoute ? statusByRoute[selectedRoute.id] : null;
    const status = selectedStatus?.status || 'available';

    const onThisVoyage = myVoyage?.routeId === selectedRoute?.id && myVoyage?.phase === 'boarding';
    const passengerCount = 1 + payForPlayerIds.length;
    const ownTicketCount = selectedRoute
        ? countFerryTicketsForRoute(gameInventory, selectedRoute.id)
        : 0;
    const hasOwnTicket = ownTicketCount > 0;
    const passengersNeedingGold = Math.max(0, passengerCount - (hasOwnTicket ? 1 : 0));
    const totalCost = selectedRoute ? selectedRoute.ticketCost * passengersNeedingGold : 0;
    const canAfford = selectedRoute ? coins >= totalCost : false;
    const canBook = (status === 'available' || status === 'boarding') && !onThisVoyage && selectedRoute;

    const togglePayFor = (id) => {
        setPayForPlayerIds(prev => (
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        ));
    };

    const greeting = useMemo(() => {
        const lines = npcDef?.greetings || [];
        if (!lines.length) return 'Where to, traveler?';
        return lines[Math.floor(Math.random() * lines.length)];
    }, [npcDef, isOpen]);

    if (!isOpen || !npcDef || !routes.length) return null;

    const name = getNpcDisplayName(npcDef);
    const title = getNpcTitle(npcDef);
    const now = Date.now();
    const theme = FERRY_THEME;
    const actionLabel = selectedRoute
        ? getPrimaryActionLabel({
            selectedRoute,
            status,
            ticketCount: passengerCount,
            totalCost,
            hasOwnTicket,
        })
        : null;

    const handleBookClick = () => {
        if (!selectedRoute) return;
        onBook?.(selectedRoute.id, payForPlayerIds);
    };

    return createPortal(
        <div className="npc-dialogue-overlay fixed inset-0 z-[9000] flex items-end sm:items-center justify-center p-3 sm:p-6 pointer-events-none">
            <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px] pointer-events-auto"
                onClick={onClose}
                aria-label="Close ferry dialogue"
            />

            <div
                className={`npc-dialogue-panel pointer-events-auto relative w-full max-w-lg animate-slide-up sm:animate-fade-in bg-gradient-to-b ${theme.panelBg} border-2 ${theme.frameBorder} rounded-2xl overflow-hidden max-h-[90vh] flex flex-col`}
                style={{ boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 8px 0 rgba(0,0,0,0.45), 0 0 40px ${theme.glow}, 0 20px 60px rgba(0,0,0,0.6)` }}
            >
                <div className={`relative bg-gradient-to-r ${theme.banner} px-4 py-2 flex items-center justify-between shrink-0`}>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0 drop-shadow">{theme.stallIcon}</span>
                        <span className={`font-black retro-text text-sm sm:text-base uppercase tracking-wide truncate ${theme.bannerText}`}>
                            {theme.stallName}
                        </span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${theme.badge} shrink-0`}>
                        <span className="text-sm">🪙</span>
                        <span className="font-bold retro-text text-sm tabular-nums">{coins.toLocaleString()}</span>
                    </div>
                </div>

                <div className="px-4 pt-4 pb-2 overflow-y-auto flex-1">
                    <div className="flex gap-3 items-start mb-3">
                        <div
                            className={`shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${theme.portraitRing} p-[2px] shadow-lg`}
                            style={{ boxShadow: `0 4px 12px ${theme.glow}` }}
                        >
                            <div className="w-full h-full rounded-[10px] bg-black/40 flex items-center justify-center text-3xl">
                                ⚓
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <h2 className={`font-black retro-text text-lg leading-tight ${theme.accent}`}>{name}</h2>
                            <p className={`text-xs font-semibold uppercase tracking-wider ${theme.accentMuted}`}>{title}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="shrink-0 w-8 h-8 rounded-lg bg-black/30 hover:bg-black/50 border border-white/10 text-white/50 hover:text-white text-sm transition-colors"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>

                    <div className={`relative ${theme.bubbleBg} border rounded-xl px-4 py-3 npc-speech-bubble mb-4`}>
                        <p className="text-white/90 text-sm leading-relaxed retro-text">
                            &ldquo;{greeting}&rdquo;
                        </p>
                    </div>

                    <p className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${theme.accentMuted}`}>
                        Choose destination
                    </p>
                    <div className="flex flex-col gap-1.5 mb-4">
                        {routes.map((route) => {
                            const rs = statusByRoute[route.id];
                            const label = getTravelRouteStatusLabel(rs, now);
                            const isSelected = route.id === selectedRouteId;
                            const routeTickets = countFerryTicketsForRoute(gameInventory, route.id);
                            const statusTone = rs?.status === 'boarding'
                                ? 'text-emerald-300'
                                : rs?.status === 'in_transit'
                                    ? 'text-amber-300/90'
                                    : theme.accentMuted;

                            return (
                                <button
                                    key={route.id}
                                    type="button"
                                    onClick={() => setSelectedRouteId(route.id)}
                                    className={`
                                        npc-choice-btn group w-full text-left rounded-xl border-2 px-3 py-2.5
                                        transition-all duration-150 active:translate-y-[2px]
                                        ${isSelected ? theme.choiceSelected : theme.choiceBg}
                                    `}
                                    style={{ boxShadow: '0 3px 0 rgba(0,0,0,0.35)' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`
                                                shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-base
                                                bg-black/30 ${theme.accent}
                                            `}
                                        >
                                            {route.emoji}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <span className="block text-sm font-bold retro-text text-white">
                                                {route.name}
                                            </span>
                                            <span className={`block text-[11px] mt-0.5 ${statusTone}`}>
                                                {label}
                                            </span>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className={`inline-flex px-2 py-0.5 rounded-md border text-xs font-bold ${theme.badge}`}>
                                                {route.ticketCost}g
                                            </span>
                                            {routeTickets > 0 && (
                                                <span className="block text-[10px] mt-1 text-emerald-300/90">
                                                    🎫 {routeTickets} in bag
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <span className={`shrink-0 text-lg ${theme.accent}`}>›</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {canBook && dockNearbyPlayers.length > 0 && (
                        <div className="mb-4">
                            <p className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${theme.accentMuted}`}>
                                Pay for friends at dock
                            </p>
                            <div className={`space-y-1.5 rounded-xl border ${theme.loreBg} p-3`}>
                                {dockNearbyPlayers.map((p) => (
                                    <label
                                        key={p.id}
                                        className="flex items-center gap-2 text-sm text-sky-100 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={payForPlayerIds.includes(p.id)}
                                            onChange={() => togglePayFor(p.id)}
                                            className="rounded border-sky-500/50"
                                        />
                                        <span className="retro-text text-sm">{p.name}</span>
                                        <span className={`text-xs ml-auto ${theme.accentMuted}`}>
                                            +{selectedRoute.ticketCost}g
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedRoute && (
                        <div className={`rounded-xl border ${theme.loreBg} px-3 py-2.5 mb-4 grid grid-cols-3 gap-2 text-center`}>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">Boarding</p>
                                <p className="text-sm font-bold retro-text text-white">{TRAVEL_TIMING.BOARDING_SECONDS}s</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">Transit</p>
                                <p className="text-sm font-bold retro-text text-white">{getRouteTransitSeconds(selectedRoute)}s</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">Fare</p>
                                <p className="text-sm font-bold retro-text text-sky-200">Each pays</p>
                            </div>
                        </div>
                    )}

                    {onThisVoyage && selectedRoute && (
                        <div className={`rounded-xl border ${theme.badge} px-3 py-2 mb-3 text-sm text-center retro-text`}>
                            You&apos;re on the manifest — departs in{' '}
                            <span className="font-bold">{formatTravelCountdown(myVoyage.phaseEndsAt, now)}</span>
                        </div>
                    )}

                    {status === 'in_transit' && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 mb-3 text-sm text-amber-100 text-center retro-text">
                            Ferry en route — back in{' '}
                            <span className="font-bold">
                                {formatTravelCountdown(selectedStatus?.phaseEndsAt, now)}
                            </span>
                        </div>
                    )}

                    {canBook && actionLabel && (
                        <button
                            type="button"
                            disabled={pending || !canAfford}
                            onClick={handleBookClick}
                            className={`
                                npc-choice-btn w-full rounded-xl border-2 px-3 py-3 mb-2
                                transition-all duration-150 active:translate-y-[2px]
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0
                                ${canAfford && !pending
                                    ? `${theme.choiceBg} border-cyan-400/40`
                                    : theme.choiceDisabled}
                            `}
                            style={canAfford && !pending ? { boxShadow: '0 4px 0 rgba(0,0,0,0.4)' } : undefined}
                        >
                            {canAfford ? (
                                <div className="text-center">
                                    <span className="block text-sm font-bold retro-text text-white">
                                        {actionLabel.title}
                                    </span>
                                    <span className={`block text-[11px] mt-0.5 ${theme.accentMuted}`}>
                                        {actionLabel.subtitle}
                                    </span>
                                </div>
                            ) : (
                                <span className="block text-sm font-bold retro-text text-red-300/90 text-center">
                                    Need {totalCost.toLocaleString()}g — you have {coins.toLocaleString()}g
                                </span>
                            )}
                        </button>
                    )}

                    {onThisVoyage && (
                        <button
                            type="button"
                            disabled={pending}
                            onClick={() => onLeave?.()}
                            className={`
                                npc-choice-btn w-full rounded-xl border-2 px-3 py-2.5 mb-2
                                ${theme.choiceDisabled} text-sm font-bold retro-text text-white/80
                                hover:text-white disabled:opacity-50
                            `}
                            style={{ boxShadow: '0 3px 0 rgba(0,0,0,0.35)' }}
                        >
                            Leave queue (ticket refunded)
                        </button>
                    )}
                </div>

                <div className="px-4 py-3 border-t border-white/5 bg-black/25 flex items-center justify-between gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors retro-text"
                    >
                        👋 Not now
                    </button>
                    <span className="text-[10px] text-white/25 uppercase tracking-wider hidden sm:inline">
                        Esc to close
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
}
