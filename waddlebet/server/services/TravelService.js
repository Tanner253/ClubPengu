/**
 * TravelService — ferry voyages between overworld quadrants.
 * Authenticated passengers pay gold or use a backpack ferry ticket; guests board free.
 * Wallet passengers are tracked for logout/reconnect; guests are tracked by player id while online.
 */

import { randomUUID } from 'crypto';
import {
    TRAVEL_TIMING,
    getTravelRoute,
    getRouteTransitSeconds,
    getTravelLobbyRoomId,
    getRoutesForRoom,
} from '../config/travel.js';

/** Max distance (units) between payer and passengers when buying group tickets. */
const DOCK_PARTY_RADIUS = 10;

const LOBBY_SPAWN = { x: 10, y: 0, z: 8 };

function distance2D(a, b) {
    if (!a || !b) return Infinity;
    const dx = (a.x ?? 0) - (b.x ?? 0);
    const dz = (a.z ?? 0) - (b.z ?? 0);
    return Math.sqrt(dx * dx + dz * dz);
}

export default class TravelService {
    /**
     * @param {object} deps
     * @param {import('./UserService.js').default} deps.userService
     * @param {(playerId: string, roomId: string) => void} deps.joinRoom
     * @param {(roomId: string, msg: object, excludeId?: string) => void} deps.broadcastToRoom
     * @param {(playerId: string, msg: object) => void} deps.sendToPlayer
     * @param {(playerId: string) => object | undefined} deps.getPlayer
     * @param {(walletAddress: string) => object | null} deps.getPlayerByWallet
     * @param {(walletAddress: string, room: string, position: object) => Promise<void>} deps.persistPlayerLocation
     * @param {(playerId: string, newRoom: string, position: object, voyage: object) => Promise<void>} deps.transferPlayerRoom
     * @param {(roomId: string) => object} deps.getDefaultSpawnForRoom
     * @param {string} deps.fallbackRescueRoom
     * @param {import('./GameInventoryService.js').default} [deps.gameInventoryService]
     */
    constructor(deps) {
        this.userService = deps.userService;
        this.gameInventoryService = deps.gameInventoryService || null;
        this.joinRoom = deps.joinRoom;
        this.broadcastToRoom = deps.broadcastToRoom;
        this.sendToPlayer = deps.sendToPlayer;
        this.getPlayer = deps.getPlayer;
        this.getPlayerByWallet = deps.getPlayerByWallet;
        this.persistPlayerLocation = deps.persistPlayerLocation;
        this.transferPlayerRoom = deps.transferPlayerRoom;
        this.getDefaultSpawnForRoom = deps.getDefaultSpawnForRoom;
        this.fallbackRescueRoom = deps.fallbackRescueRoom;

        /** @type {Map<string, object>} */
        this.voyages = new Map();
        /** routeId -> voyageId */
        this.routeVoyage = new Map();
        /** playerId -> voyageId (online sessions only) */
        this.playerVoyage = new Map();
        /** walletAddress -> voyageId */
        this.walletVoyage = new Map();
        /** walletAddress -> { toRoom, spawn, routeId } when arrival happened while offline */
        this.pendingArrivals = new Map();
    }

    getVoyageIdForPlayer(playerId) {
        const direct = this.playerVoyage.get(playerId);
        if (direct) return direct;
        const player = this.getPlayer(playerId);
        if (player?.walletAddress) {
            return this.walletVoyage.get(player.walletAddress) || null;
        }
        return null;
    }

    getVoyagePassengerCount(voyage) {
        return voyage.passengerWallets.length + (voyage.guestPassengerIds?.length || 0);
    }

    getRouteStatusesForRoom(roomId) {
        const routes = getRoutesForRoom(roomId);
        const now = Date.now();
        return routes.map((route) => {
            const base = {
                routeId: route.id,
                name: route.name,
                emoji: route.emoji,
                ticketCost: route.ticketCost,
                toRoom: route.toRoom,
            };
            const voyageId = this.routeVoyage.get(route.id);
            const voyage = voyageId ? this.voyages.get(voyageId) : null;
            if (!voyage) {
                return { ...base, status: 'available' };
            }
            const passengerCount = this.getVoyagePassengerCount(voyage);
            if (voyage.phase === 'boarding') {
                return {
                    ...base,
                    status: 'boarding',
                    voyageId: voyage.id,
                    phaseEndsAt: voyage.phaseEndsAt,
                    passengerCount,
                    etaSeconds: Math.max(0, Math.ceil((voyage.phaseEndsAt - now) / 1000)),
                };
            }
            if (voyage.phase === 'transit') {
                return {
                    ...base,
                    status: 'in_transit',
                    voyageId: voyage.id,
                    phaseEndsAt: voyage.phaseEndsAt,
                    passengerCount,
                    etaSeconds: Math.max(0, Math.ceil((voyage.phaseEndsAt - now) / 1000)),
                };
            }
            return { ...base, status: 'available' };
        });
    }

    broadcastRouteStatuses(roomId) {
        if (!roomId || roomId.startsWith('travel:')) return;
        this.broadcastToRoom(roomId, {
            type: 'travel_route_status',
            routeStatuses: this.getRouteStatusesForRoom(roomId),
        });
    }

    getRoomVoyages(roomId) {
        const list = [];
        for (const voyage of this.voyages.values()) {
            if (voyage.fromRoom === roomId && voyage.phase === 'boarding') {
                list.push(this.serializeVoyage(voyage));
            }
        }
        return list;
    }

    getPlayerVoyage(playerId) {
        const id = this.getVoyageIdForPlayer(playerId);
        if (!id) return null;
        const voyage = this.voyages.get(id);
        return voyage ? this.serializeVoyage(voyage) : null;
    }

    serializeVoyage(voyage) {
        return {
            id: voyage.id,
            routeId: voyage.routeId,
            fromRoom: voyage.fromRoom,
            toRoom: voyage.toRoom,
            destinationName: voyage.destinationName,
            destinationEmoji: voyage.destinationEmoji,
            captainId: voyage.captainId,
            captainName: voyage.captainName,
            passengerIds: [...voyage.passengerIds],
            passengerCount: this.getVoyagePassengerCount(voyage),
            phase: voyage.phase,
            phaseEndsAt: voyage.phaseEndsAt,
            ticketCost: voyage.ticketCost,
        };
    }

    async handleGetState(playerId) {
        const player = this.getPlayer(playerId);
        if (!player) return { error: 'NOT_FOUND' };

        return {
            success: true,
            roomVoyages: this.getRoomVoyages(player.room),
            routeStatuses: this.getRouteStatusesForRoom(player.room),
            myVoyage: this.getPlayerVoyage(playerId),
        };
    }

    /**
     * Re-link an authenticated player to an active voyage after reconnect.
     * @returns {Promise<{ status: string, room?: string } | null>}
     */
    async syncPassengerOnJoin(walletAddress, playerId) {
        if (!walletAddress) return null;

        const pending = this.pendingArrivals.get(walletAddress);
        if (pending) {
            this.pendingArrivals.delete(walletAddress);
            await this.transferPlayerRoom(playerId, pending.toRoom, pending.spawn, {
                phase: 'arrived',
                routeId: pending.routeId,
            });
            this.sendToPlayer(playerId, {
                type: 'travel_state',
                roomVoyages: this.getRoomVoyages(pending.toRoom),
                routeStatuses: this.getRouteStatusesForRoom(pending.toRoom),
                myVoyage: null,
            });
            return { status: 'arrived', room: pending.toRoom };
        }

        const voyageId = this.walletVoyage.get(walletAddress);
        const player = this.getPlayer(playerId);

        if (!voyageId) {
            if (player?.room?.startsWith('travel:')) {
                return this.rescueFromDeadTravelRoom(playerId);
            }
            return null;
        }

        const voyage = this.voyages.get(voyageId);
        if (!voyage) {
            this.walletVoyage.delete(walletAddress);
            if (player?.room?.startsWith('travel:')) {
                return this.rescueFromDeadTravelRoom(playerId);
            }
            return null;
        }

        this.linkOnlinePassenger(voyage, playerId);

        const serialized = this.serializeVoyage(voyage);

        if (voyage.phase === 'transit') {
            const lobbyRoom = getTravelLobbyRoomId(voyage.id);
            await this.transferPlayerRoom(playerId, lobbyRoom, LOBBY_SPAWN, serialized);
            return { status: 'transit', room: lobbyRoom };
        }

        if (voyage.phase === 'boarding' && player?.room?.startsWith('travel:')) {
            const dockSpawn = this.getDefaultSpawnForRoom(voyage.fromRoom);
            await this.transferPlayerRoom(playerId, voyage.fromRoom, dockSpawn, serialized);
            return { status: 'boarding', room: voyage.fromRoom };
        }

        this.sendToPlayer(playerId, {
            type: 'travel_state',
            roomVoyages: this.getRoomVoyages(player.room),
            routeStatuses: this.getRouteStatusesForRoom(player.room),
            myVoyage: serialized,
        });
        return { status: 'boarding' };
    }

    async rescueFromDeadTravelRoom(playerId) {
        const player = this.getPlayer(playerId);
        if (!player?.room?.startsWith('travel:')) return null;

        const rescueRoom = this.fallbackRescueRoom;
        const spawn = this.getDefaultSpawnForRoom(rescueRoom);
        await this.transferPlayerRoom(playerId, rescueRoom, spawn, null);
        await this.persistPlayerLocation(player.walletAddress, rescueRoom, spawn);
        this.sendToPlayer(playerId, {
            type: 'travel_state',
            roomVoyages: this.getRoomVoyages(rescueRoom),
            routeStatuses: this.getRouteStatusesForRoom(rescueRoom),
            myVoyage: null,
        });
        return { status: 'rescued', room: rescueRoom };
    }

    linkOnlinePassenger(voyage, playerId) {
        this.playerVoyage.set(playerId, voyage.id);
        if (!voyage.passengerIds.includes(playerId)) {
            voyage.passengerIds.push(playerId);
        }
    }

    /**
     * Buy ticket(s) for self and optionally nearby players at the dock.
     * @param {string} playerId — payer
     * @param {string} routeId
     * @param {string[]} [payForPlayerIds] — additional player ids at the dock
     */
    async handleBook(playerId, routeId, payForPlayerIds = []) {
        const payer = this.getPlayer(playerId);
        if (!payer) {
            return { error: 'NOT_FOUND', message: 'Player not found.' };
        }

        const isGuestPayer = !payer.walletAddress;
        const extraIds = [...new Set(
            (Array.isArray(payForPlayerIds) ? payForPlayerIds : [])
                .filter(id => typeof id === 'string' && id && id !== playerId)
        )];
        if (isGuestPayer && extraIds.length > 0) {
            return {
                error: 'GUEST_CANNOT_PAY_OTHERS',
                message: 'Sign in to buy tickets for friends.',
            };
        }

        const route = getTravelRoute(routeId);
        if (!route) {
            return { error: 'INVALID_ROUTE', message: 'Unknown route.' };
        }
        if (payer.room !== route.fromRoom) {
            return { error: 'WRONG_ROOM', message: 'You must be at the departure dock.' };
        }

        const requestedIds = [playerId, ...extraIds];

        const existingId = this.routeVoyage.get(route.id);
        let existingVoyage = existingId ? this.voyages.get(existingId) : null;

        if (existingVoyage?.phase === 'transit') {
            const etaSec = Math.max(0, Math.ceil((existingVoyage.phaseEndsAt - Date.now()) / 1000));
            const m = Math.floor(etaSec / 60);
            const s = etaSec % 60;
            return {
                error: 'IN_TRANSIT',
                message: `Ferry is en route. Available again in ~${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s.`,
            };
        }

        const passengersToAdd = [];
        for (const pid of requestedIds) {
            const passenger = this.getPlayer(pid);
            if (!passenger) {
                return { error: 'PASSENGER_NOT_FOUND', message: 'One of the passengers is no longer online.' };
            }
            if (passenger.room !== route.fromRoom) {
                return {
                    error: 'PASSENGER_WRONG_ROOM',
                    message: `${passenger.name || 'A passenger'} must be at the dock to board.`,
                };
            }

            const walletOnVoyage = passenger.walletAddress
                ? this.walletVoyage.get(passenger.walletAddress)
                : this.playerVoyage.get(pid);
            if (walletOnVoyage) {
                if (existingVoyage && walletOnVoyage === existingVoyage.id) {
                    continue;
                }
                return {
                    error: 'ALREADY_TRAVELING',
                    message: `${passenger.name || 'A passenger'} is already on another voyage.`,
                };
            }

            if (pid !== playerId) {
                if (distance2D(passenger.position, payer.position) > DOCK_PARTY_RADIUS) {
                    return {
                        error: 'PASSENGER_TOO_FAR',
                        message: `${passenger.name || 'A passenger'} must stand at the dock with you.`,
                    };
                }
            }

            passengersToAdd.push(passenger);
        }

        if (passengersToAdd.length === 0) {
            return { error: 'ALREADY_ABOARD', message: 'Everyone selected is already on this ferry.' };
        }

        if (existingVoyage?.phase === 'boarding') {
            if (this.getVoyagePassengerCount(existingVoyage) + passengersToAdd.length > TRAVEL_TIMING.MAX_PASSENGERS) {
                return { error: 'VOYAGE_FULL', message: 'The ferry is full.' };
            }
        }

        let goldSpent = 0;
        let ticketsFromInventory = 0;
        let newBalance = payer.coins ?? 0;

        const payingPassengers = passengersToAdd.filter((passenger) => passenger.walletAddress);

        if (this.gameInventoryService) {
            for (const passenger of payingPassengers) {
                const ticket = await this.gameInventoryService.tryConsumeFerryTicket(
                    passenger.walletAddress,
                    route.id
                );
                if (ticket.consumed) {
                    ticketsFromInventory++;
                }
            }
        }

        const passengersNeedingGold = payingPassengers.length - ticketsFromInventory;
        const goldCost = route.ticketCost * passengersNeedingGold;

        if (goldCost > 0) {
            if (!payer.walletAddress) {
                return { error: 'NOT_AUTHENTICATED', message: 'Sign in to buy a ticket.' };
            }
            const deduct = await this.userService.addCoins(
                payer.walletAddress,
                -goldCost,
                'travel_ticket',
                {
                    routeId: route.id,
                    toRoom: route.toRoom,
                    passengerCount: passengersNeedingGold,
                    passengerIds: payingPassengers.map(p => p.id),
                    ticketsFromInventory,
                }
            );
            if (!deduct.success) {
                return {
                    error: deduct.error || 'INSUFFICIENT_FUNDS',
                    message: deduct.error === 'INSUFFICIENT_FUNDS'
                        ? 'Not enough gold for ticket(s).'
                        : (deduct.message || 'Could not purchase ticket(s).'),
                    cost: goldCost,
                };
            }
            goldSpent = goldCost;
            newBalance = deduct.newBalance;
        }

        let voyage = existingVoyage;
        if (!voyage) {
            voyage = this.createVoyage(route, payer);
        }

        for (const passenger of passengersToAdd) {
            this.addPassenger(voyage, passenger);
            if (passenger.walletAddress) {
                voyage.tickets.set(passenger.walletAddress, {
                    payerId: playerId,
                    walletAddress: payer.walletAddress,
                    amount: route.ticketCost,
                });
            }
        }

        this.broadcastToRoom(route.fromRoom, {
            type: 'travel_voyage_update',
            voyage: this.serializeVoyage(voyage),
        });
        this.broadcastRouteStatuses(route.fromRoom);

        return {
            success: true,
            voyage: this.serializeVoyage(voyage),
            goldSpent,
            ticketsFromInventory,
            ticketsPurchased: passengersToAdd.length,
            coins: newBalance,
            routeStatuses: this.getRouteStatusesForRoom(route.fromRoom),
        };
    }

    async handleLeave(playerId) {
        const voyageId = this.getVoyageIdForPlayer(playerId);
        if (!voyageId) {
            return { error: 'NOT_ON_VOYAGE', message: 'You are not on a voyage.' };
        }

        const voyage = this.voyages.get(voyageId);
        if (!voyage) {
            this.playerVoyage.delete(playerId);
            const player = this.getPlayer(playerId);
            if (player?.walletAddress) {
                this.walletVoyage.delete(player.walletAddress);
            }
            return { success: true };
        }
        if (voyage.phase !== 'boarding') {
            return { error: 'IN_TRANSIT', message: 'You cannot leave during transit.' };
        }

        const refundResult = await this.removePassenger(voyage, playerId, { refund: true });
        const refundBalance = refundResult?.newBalance ?? null;

        if (this.getVoyagePassengerCount(voyage) === 0) {
            this.destroyVoyage(voyage);
            return {
                success: true,
                cancelled: true,
                coins: refundBalance,
                routeStatuses: this.getRouteStatusesForRoom(voyage.fromRoom),
            };
        }

        this.reassignCaptainIfNeeded(voyage, playerId);

        this.broadcastToRoom(voyage.fromRoom, {
            type: 'travel_voyage_update',
            voyage: this.serializeVoyage(voyage),
        });
        this.broadcastRouteStatuses(voyage.fromRoom);

        return {
            success: true,
            voyage: this.serializeVoyage(voyage),
            coins: refundBalance,
            routeStatuses: this.getRouteStatusesForRoom(voyage.fromRoom),
        };
    }

    handlePlayerDisconnect(playerId) {
        const voyageId = this.getVoyageIdForPlayer(playerId);
        if (!voyageId) return;

        const voyage = this.voyages.get(voyageId);
        if (!voyage) {
            this.playerVoyage.delete(playerId);
            return;
        }

        if (voyage.phase === 'boarding' || voyage.phase === 'transit') {
            voyage.passengerIds = voyage.passengerIds.filter(id => id !== playerId);
            this.playerVoyage.delete(playerId);
            return;
        }

        this.removePassenger(voyage, playerId, { refund: true }).catch(err => {
            console.error('[Travel] disconnect refund failed:', err);
        });
    }

    createVoyage(route, firstPassenger) {
        const id = randomUUID().slice(0, 8);
        const now = Date.now();
        const voyage = {
            id,
            routeId: route.id,
            fromRoom: route.fromRoom,
            toRoom: route.toRoom,
            destinationName: route.name,
            destinationEmoji: route.emoji,
            arrivalSpawn: route.arrivalSpawn,
            ticketCost: route.ticketCost,
            captainId: firstPassenger.id,
            captainName: firstPassenger.name,
            captainWallet: firstPassenger.walletAddress || null,
            passengerIds: [],
            passengerWallets: [],
            guestPassengerIds: [],
            tickets: new Map(),
            phase: 'boarding',
            phaseEndsAt: now + TRAVEL_TIMING.BOARDING_SECONDS * 1000,
        };

        this.voyages.set(id, voyage);
        this.routeVoyage.set(route.id, id);
        return voyage;
    }

    addPassenger(voyage, player) {
        if (player.walletAddress) {
            if (!voyage.passengerWallets.includes(player.walletAddress)) {
                voyage.passengerWallets.push(player.walletAddress);
                this.walletVoyage.set(player.walletAddress, voyage.id);
            }
        } else if (!voyage.guestPassengerIds.includes(player.id)) {
            voyage.guestPassengerIds.push(player.id);
        }
        this.linkOnlinePassenger(voyage, player.id);
    }

    async removePassenger(voyage, playerId, { refund = false } = {}) {
        const player = this.getPlayer(playerId);
        const wallet = player?.walletAddress || null;

        voyage.passengerIds = voyage.passengerIds.filter(id => id !== playerId);
        if (wallet) {
            voyage.passengerWallets = voyage.passengerWallets.filter(w => w !== wallet);
            this.walletVoyage.delete(wallet);
        } else {
            voyage.guestPassengerIds = voyage.guestPassengerIds.filter(id => id !== playerId);
        }
        this.playerVoyage.delete(playerId);

        const ticket = wallet ? voyage.tickets.get(wallet) : null;
        if (wallet) {
            voyage.tickets.delete(wallet);
        }

        let refundResult = null;
        if (refund && ticket?.walletAddress) {
            refundResult = await this.refundTicket(ticket, voyage);
        }
        return refundResult;
    }

    reassignCaptainIfNeeded(voyage, removedPlayerId) {
        const removedPlayer = this.getPlayer(removedPlayerId);
        const removedWallet = removedPlayer?.walletAddress;
        const captainLeft = voyage.captainId === removedPlayerId
            || (removedWallet && voyage.captainWallet === removedWallet);
        if (!captainLeft) return;

        const nextWallet = voyage.passengerWallets[0] || null;
        const nextCaptain = nextWallet ? this.getPlayerByWallet(nextWallet) : null;
        if (nextCaptain) {
            voyage.captainWallet = nextWallet;
            voyage.captainId = nextCaptain.id;
            voyage.captainName = nextCaptain.name;
            return;
        }

        const nextGuestId = voyage.guestPassengerIds.find((id) => id !== removedPlayerId)
            || voyage.guestPassengerIds[0]
            || null;
        const nextGuest = nextGuestId ? this.getPlayer(nextGuestId) : null;
        voyage.captainWallet = null;
        voyage.captainId = nextGuestId;
        voyage.captainName = nextGuest?.name || 'Guest';
    }

    async refundTicket(ticket, voyage) {
        try {
            const result = await this.userService.addCoins(
                ticket.walletAddress,
                ticket.amount,
                'travel_refund',
                { routeId: voyage.routeId, voyageId: voyage.id }
            );
            if (result.success && ticket.payerId) {
                this.sendToPlayer(ticket.payerId, {
                    type: 'coins_update',
                    coins: result.newBalance,
                    isAuthenticated: true,
                });
            }
            return result;
        } catch (err) {
            console.error('[Travel] refund failed:', err);
            return { success: false, error: 'REFUND_FAILED' };
        }
    }

    destroyVoyage(voyage) {
        for (const wallet of voyage.passengerWallets) {
            this.walletVoyage.delete(wallet);
        }
        for (const pid of voyage.passengerIds) {
            this.playerVoyage.delete(pid);
        }
        for (const guestId of voyage.guestPassengerIds || []) {
            this.playerVoyage.delete(guestId);
        }
        this.voyages.delete(voyage.id);
        this.routeVoyage.delete(voyage.routeId);
        this.broadcastToRoom(voyage.fromRoom, {
            type: 'travel_voyage_ended',
            voyageId: voyage.id,
            routeId: voyage.routeId,
            routeStatuses: this.getRouteStatusesForRoom(voyage.fromRoom),
        });
        this.broadcastRouteStatuses(voyage.fromRoom);
    }

    async tick() {
        const now = Date.now();
        for (const voyage of [...this.voyages.values()]) {
            if (now < voyage.phaseEndsAt) continue;

            if (voyage.phase === 'boarding') {
                await this.startTransit(voyage);
            } else if (voyage.phase === 'transit') {
                await this.completeVoyage(voyage);
            }
        }
    }

    async startTransit(voyage) {
        const route = getTravelRoute(voyage.routeId);
        const transitSeconds = getRouteTransitSeconds(route);
        voyage.phase = 'transit';
        voyage.phaseEndsAt = Date.now() + transitSeconds * 1000;
        const lobbyRoom = getTravelLobbyRoomId(voyage.id);
        const serialized = this.serializeVoyage(voyage);

        for (const wallet of [...voyage.passengerWallets]) {
            const passenger = this.getPlayerByWallet(wallet);
            if (!passenger) continue;
            this.linkOnlinePassenger(voyage, passenger.id);
            await this.transferPlayerRoom(passenger.id, lobbyRoom, LOBBY_SPAWN, serialized);
        }

        for (const guestId of [...voyage.guestPassengerIds]) {
            const passenger = this.getPlayer(guestId);
            if (!passenger) continue;
            this.linkOnlinePassenger(voyage, guestId);
            await this.transferPlayerRoom(guestId, lobbyRoom, LOBBY_SPAWN, serialized);
        }

        if (this.getVoyagePassengerCount(voyage) === 0) {
            this.destroyVoyage(voyage);
            return;
        }

        this.broadcastToRoom(lobbyRoom, {
            type: 'travel_voyage_update',
            voyage: serialized,
        });
        this.broadcastRouteStatuses(voyage.fromRoom);
    }

    async completeVoyage(voyage) {
        const spawn = {
            x: voyage.arrivalSpawn.x,
            y: voyage.arrivalSpawn.y ?? 0,
            z: voyage.arrivalSpawn.z,
        };
        const serialized = this.serializeVoyage(voyage);

        for (const wallet of [...voyage.passengerWallets]) {
            const passenger = this.getPlayerByWallet(wallet);
            if (passenger) {
                await this.transferPlayerRoom(passenger.id, voyage.toRoom, spawn, {
                    ...serialized,
                    phase: 'arrived',
                });
                this.playerVoyage.delete(passenger.id);
            } else {
                this.pendingArrivals.set(wallet, {
                    toRoom: voyage.toRoom,
                    spawn,
                    routeId: voyage.routeId,
                });
                await this.persistPlayerLocation(wallet, voyage.toRoom, spawn);
            }
            this.walletVoyage.delete(wallet);
            voyage.tickets.delete(wallet);
        }

        for (const guestId of [...voyage.guestPassengerIds]) {
            const passenger = this.getPlayer(guestId);
            if (passenger) {
                await this.transferPlayerRoom(passenger.id, voyage.toRoom, spawn, {
                    ...serialized,
                    phase: 'arrived',
                });
                this.playerVoyage.delete(passenger.id);
            }
        }

        const endedId = voyage.id;
        for (const pid of voyage.passengerIds) {
            this.playerVoyage.delete(pid);
        }
        this.voyages.delete(voyage.id);
        this.routeVoyage.delete(voyage.routeId);

        this.broadcastToRoom(voyage.fromRoom, {
            type: 'travel_voyage_ended',
            voyageId: endedId,
            routeId: voyage.routeId,
        });
        this.broadcastRouteStatuses(voyage.fromRoom);
    }
}

