/**

 * TravelLobbyHUD — ferry countdown visible to passengers and dock bystanders.

 * Shows boarding countdown at the dock and transit ETA in the ferry cabin.

 */



import React, { useEffect, useMemo, useState } from 'react';

import { TRAVEL_ROUTES } from '../config/travelConfig';

import { formatTravelCountdown } from '../utils/travelStatus';



function resolveDisplay({ voyage, routeStatuses, room }) {

    if (voyage?.phase === 'transit' || voyage?.phase === 'boarding') {

        return voyage;

    }



    if (!room || !Array.isArray(routeStatuses)) return null;



    const boarding = routeStatuses.find((s) => s.status === 'boarding');

    if (!boarding) return null;



    const route = TRAVEL_ROUTES[boarding.routeId];

    if (!route || route.fromRoom !== room) return null;



    return {

        phase: 'boarding',

        phaseEndsAt: boarding.phaseEndsAt,

        destinationName: route.name,

        destinationEmoji: route.emoji,

        passengerCount: boarding.passengerCount ?? 0,

    };

}



export default function TravelLobbyHUD({ voyage, routeStatuses, room }) {

    const [, setTick] = useState(0);



    useEffect(() => {

        const id = setInterval(() => setTick(t => t + 1), 250);

        return () => clearInterval(id);

    }, []);



    const display = useMemo(

        () => resolveDisplay({ voyage, routeStatuses, room }),

        [voyage, routeStatuses, room]

    );



    if (!display) return null;



    const isTransit = display.phase === 'transit';

    const isBoarding = display.phase === 'boarding';

    const headline = isTransit

        ? `En route to ${display.destinationName}`

        : isBoarding

            ? `Departing for ${display.destinationName}`

            : `Boarding for ${display.destinationName}`;

    const label = isTransit ? 'Arriving in' : 'Departure in';

    const emoji = display.destinationEmoji || '⛴️';



    return (

        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[8500] pointer-events-none">

            <div className="rounded-2xl border border-sky-400/50 bg-gradient-to-b from-[#0c1a30]/95 to-[#061018]/95 px-8 py-4 shadow-xl shadow-sky-900/50 text-center min-w-[280px]">

                <div className="text-sky-300/80 text-xs uppercase tracking-widest mb-1">Ice Ferry</div>

                <div className="text-white font-bold text-lg retro-text mb-2">

                    {emoji} {headline}

                </div>

                <div className="text-4xl font-mono font-bold text-cyan-300 tabular-nums">

                    {formatTravelCountdown(display.phaseEndsAt)}

                </div>

                <div className="text-sky-200/70 text-sm mt-2">{label}</div>

                {display.passengerCount > 1 && (

                    <div className="text-emerald-300/80 text-xs mt-2">

                        {display.passengerCount} passengers aboard

                    </div>

                )}

            </div>

        </div>

    );

}


