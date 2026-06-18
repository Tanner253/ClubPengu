import React, { useEffect, useRef, useState } from 'react';
import { getCompassLandmarks } from '../config/compassLandmarks';
import { useMultiplayer } from '../multiplayer';
import {
    angleDeltaDegrees,
    bearingBetween,
    distanceXZ,
    yawToHeadingDegrees,
} from '../utils/compassMath';
import { getCompassQuestMarkers } from '../utils/compassQuestMarkers';

const CARDINALS = [
    { deg: 0, label: 'N' },
    { deg: 90, label: 'E' },
    { deg: 180, label: 'S' },
    { deg: 270, label: 'W' },
];

const TICK_STEP = 15;

/**
 * PUBG-style horizontal compass — scrolls with player heading.
 * Mobile portrait: slim strip under the top HUD bar.
 */
export default function WorldCompass({
    yawRef,
    positionRef,
    room,
    isPortrait = false,
    visible = true,
}) {
    const trackRef = useRef(null);
    const [width, setWidth] = useState(280);
    const [ticks, setTicks] = useState([]);
    const [landmarks, setLandmarks] = useState([]);
    const [questMarkers, setQuestMarkers] = useState([]);

    const {
        isAuthenticated,
        onboardingQuest,
        dailyQuestStatus,
        gameInventory,
        userData,
    } = useMultiplayer();

    const visibleSpan = isPortrait ? 90 : 120;
    const pxPerDeg = isPortrait ? 2.2 : 2.8;
    const maxLandmarks = isPortrait ? 3 : 6;
    const maxQuestMarkers = isPortrait ? 2 : 3;

    useEffect(() => {
        const el = trackRef.current;
        if (!el) return undefined;
        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect?.width;
            if (w > 0) setWidth(w);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!visible) return undefined;

        let raf = 0;
        let lastUpdate = 0;
        const pois = getCompassLandmarks(room);

        const tick = (now) => {
            if (now - lastUpdate >= 50) {
                lastUpdate = now;
                const yaw = yawRef?.current ?? 0;
                const heading = yawToHeadingDegrees(yaw);
                const pos = positionRef?.current ?? { x: 0, z: 0 };
                const half = width / 2;

                const nextTicks = [];
                const start = Math.floor(heading - visibleSpan / 2);
                const end = Math.ceil(heading + visibleSpan / 2);
                for (let d = start - (start % TICK_STEP); d <= end; d += TICK_STEP) {
                    const norm = ((d % 360) + 360) % 360;
                    const x = half + angleDeltaDegrees(d, heading) * pxPerDeg;
                    if (x < -8 || x > width + 8) continue;
                    const cardinal = CARDINALS.find((c) => c.deg === norm);
                    nextTicks.push({
                        key: `t-${d}`,
                        x,
                        label: cardinal?.label,
                        major: Boolean(cardinal) || norm % 45 === 0,
                    });
                }

                const nextLandmarks = pois
                    .map((lm) => {
                        const dist = distanceXZ(pos.x, pos.z, lm.x, lm.z);
                        if (lm.maxDistance && dist > lm.maxDistance) return null;
                        const bearing = bearingBetween(pos.x, pos.z, lm.x, lm.z);
                        const delta = angleDeltaDegrees(bearing, heading);
                        if (Math.abs(delta) > visibleSpan / 2 + 4) return null;
                        return {
                            id: lm.id,
                            label: lm.label,
                            color: lm.color || '#fbbf24',
                            x: half + delta * pxPerDeg,
                            delta: Math.abs(delta),
                        };
                    })
                    .filter(Boolean)
                    .sort((a, b) => a.delta - b.delta)
                    .slice(0, maxLandmarks);

                const liveQuestMarkers = getCompassQuestMarkers({
                    room,
                    position: pos,
                    isAuthenticated,
                    onboardingQuest,
                    dailyQuestStatus,
                    gameInventory,
                    coins: userData?.coins ?? 0,
                });

                const nextQuestMarkers = liveQuestMarkers
                    .map((qm) => {
                        const bearing = bearingBetween(pos.x, pos.z, qm.x, qm.z);
                        const delta = angleDeltaDegrees(bearing, heading);
                        if (Math.abs(delta) > visibleSpan / 2 + 4) return null;
                        return {
                            id: qm.id,
                            symbol: qm.symbol,
                            color: qm.color,
                            x: half + delta * pxPerDeg,
                            delta: Math.abs(delta),
                            priority: qm.priority ?? 99,
                        };
                    })
                    .filter(Boolean)
                    .sort((a, b) => (a.priority - b.priority) || (a.delta - b.delta))
                    .slice(0, maxQuestMarkers);

                setTicks(nextTicks);
                setLandmarks(nextLandmarks);
                setQuestMarkers(nextQuestMarkers);
            }
            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [
        visible,
        room,
        width,
        yawRef,
        positionRef,
        visibleSpan,
        pxPerDeg,
        maxLandmarks,
        maxQuestMarkers,
        isAuthenticated,
        onboardingQuest,
        dailyQuestStatus,
        gameInventory,
        userData?.coins,
    ]);

    if (!visible) return null;

    const barHeight = isPortrait ? 'h-[22px]' : 'h-[28px]';
    const barWidth = isPortrait
        ? 'w-[min(52vw,200px)]'
        : 'w-[min(42vw,360px)]';
    const topClass = isPortrait ? 'top-[38px]' : 'top-3';

    return (
        <div
            className={`absolute left-1/2 -translate-x-1/2 z-[19] pointer-events-none select-none ${topClass} ${barWidth}`}
            aria-hidden
        >
            <div
                ref={trackRef}
                className={`relative ${barHeight} overflow-hidden rounded-md border border-white/10 bg-black/55 backdrop-blur-sm shadow-lg`}
            >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

                {ticks.map((t) => (
                    t.label ? (
                        <span
                            key={t.key}
                            className="absolute top-1/2 -translate-x-1/2 -translate-y-[55%] text-[10px] font-bold text-white/90 tracking-wider"
                            style={{ left: t.x, fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: isPortrait ? 10 : 11 }}
                        >
                            {t.label}
                        </span>
                    ) : (
                        <span
                            key={t.key}
                            className={`absolute top-1/2 -translate-x-1/2 rounded-full bg-white/40 ${
                                t.major ? (isPortrait ? 'h-[9px] w-px' : 'h-[11px] w-px') : (isPortrait ? 'h-[6px] w-px' : 'h-[8px] w-px')
                            }`}
                            style={{ left: t.x, marginTop: 2 }}
                        />
                    )
                ))}

                {questMarkers.map((qm) => (
                    <span
                        key={qm.id}
                        className="absolute top-1/2 -translate-x-1/2 font-black z-[11]"
                        style={{
                            left: qm.x,
                            marginTop: isPortrait ? -1 : 0,
                            color: qm.color,
                            fontSize: isPortrait ? 13 : 15,
                            lineHeight: 1,
                            textShadow: '0 0 4px rgba(0,0,0,0.95), 0 1px 2px rgba(0,0,0,1)',
                            fontFamily: 'Montserrat, system-ui, sans-serif',
                        }}
                    >
                        {qm.symbol}
                    </span>
                ))}

                {landmarks.map((lm) => (
                    <span
                        key={lm.id}
                        className="absolute top-1/2 -translate-x-1/2 font-black uppercase opacity-95"
                        style={{
                            left: lm.x,
                            marginTop: isPortrait ? 7 : 9,
                            color: lm.color,
                            fontSize: isPortrait ? 8 : 9,
                            letterSpacing: '0.04em',
                            textShadow: '0 1px 2px rgba(0,0,0,1)',
                            fontFamily: 'Montserrat, system-ui, sans-serif',
                        }}
                    >
                        {lm.label}
                    </span>
                ))}

                <div className="absolute left-1/2 top-0 -translate-x-1/2 z-10 flex flex-col items-center">
                    <div
                        className={`w-0 h-0 border-l-[5px] border-r-[5px] border-b-[7px] border-l-transparent border-r-transparent ${
                            isPortrait ? 'border-b-cyan-300/90' : 'border-b-cyan-300'
                        }`}
                    />
                    <div className={`w-px bg-cyan-300/80 ${isPortrait ? 'h-2' : 'h-3'}`} />
                </div>
            </div>
        </div>
    );
}
