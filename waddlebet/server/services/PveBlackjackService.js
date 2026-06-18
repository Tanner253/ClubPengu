/**
 * Server-authoritative solo blackjack (CasinoBlackjack overlay).
 * Legacy blackjack_deduct_bet / blackjack_payout are deprecated.
 */

import {
    calculateBlackjackScore,
    clampPveBet,
    computePayout,
    createShuffledDeck,
    isNaturalBlackjack,
    mapResultToClient,
    PVE_BJ_MAX_BET,
    PVE_BJ_MIN_BET,
} from '../config/blackjackRules.js';

export default class PveBlackjackService {
    /**
     * @param {import('./UserService.js').default} userService
     * @param {(playerId: string, payload: object) => void} sendToPlayer
     */
    constructor(userService, sendToPlayer) {
        this.userService = userService;
        this.sendToPlayer = sendToPlayer;
        /** @type {Map<string, object>} */
        this.sessions = new Map();
    }

    getSession(playerId) {
        return this.sessions.get(playerId) || null;
    }

    clearSession(playerId) {
        this.sessions.delete(playerId);
    }

    buildClientState(session, { revealDealer = false } = {}) {
        const playerScore = calculateBlackjackScore(session.playerHand);
        const dealerVisible = session.dealerHand.filter((c) => !c.hidden);
        const dealerScore = revealDealer
            ? calculateBlackjackScore(session.dealerHand)
            : (dealerVisible.length ? calculateBlackjackScore(dealerVisible) : 0);

        return {
            phase: session.phase,
            bet: session.bet,
            playerHand: session.playerHand.map((c) => ({ suit: c.suit, value: c.value })),
            dealerHand: session.dealerHand.map((c) => (
                c.hidden ? { hidden: true } : { suit: c.suit, value: c.value }
            )),
            playerScore,
            dealerScore,
            result: session.result ? mapResultToClient(session.result) : null,
            payout: session.payout ?? 0,
            minBet: PVE_BJ_MIN_BET,
            maxBet: PVE_BJ_MAX_BET,
        };
    }

    async start(playerId, walletAddress, amount) {
        if (this.sessions.has(playerId)) {
            return { error: 'SESSION_ACTIVE', message: 'Finish your current hand first.' };
        }

        const bet = clampPveBet(amount);
        const balance = await this.userService.getUserCoins(walletAddress);
        if (balance < bet) {
            return { error: 'INSUFFICIENT_FUNDS', balance };
        }

        const deduct = await this.userService.addCoins(
            walletAddress,
            -bet,
            'blackjack_bet',
            { mode: 'pve' },
            'PvE blackjack bet'
        );
        if (!deduct.success) {
            return { error: deduct.error || 'DEDUCT_FAILED' };
        }

        const deck = createShuffledDeck(6);
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [
            { ...deck.pop(), hidden: true },
            { ...deck.pop(), hidden: false },
        ];

        const session = {
            walletAddress,
            bet,
            deck,
            playerHand,
            dealerHand,
            phase: 'playing',
            result: null,
            payout: 0,
            doubled: false,
        };
        this.sessions.set(playerId, session);

        const playerBJ = isNaturalBlackjack(playerHand);
        const dealerBJ = isNaturalBlackjack(dealerHand);

        if (playerBJ || dealerBJ) {
            return this._resolveImmediate(playerId, session, { playerBJ, dealerBJ });
        }

        return {
            success: true,
            state: this.buildClientState(session),
            newBalance: deduct.newBalance,
        };
    }

    async hit(playerId) {
        const session = this.sessions.get(playerId);
        if (!session || session.phase !== 'playing') {
            return { error: 'NO_ACTIVE_HAND' };
        }

        session.playerHand.push(session.deck.pop());
        const score = calculateBlackjackScore(session.playerHand);

        if (score > 21) {
            session.result = 'bust';
            session.payout = 0;
            return this._finish(playerId, session);
        }

        if (score === 21) {
            return this.stand(playerId);
        }

        return {
            success: true,
            state: this.buildClientState(session),
        };
    }

    async stand(playerId) {
        const session = this.sessions.get(playerId);
        if (!session || session.phase !== 'playing') {
            return { error: 'NO_ACTIVE_HAND' };
        }

        session.dealerHand[0].hidden = false;
        let dealerScore = calculateBlackjackScore(session.dealerHand);
        while (dealerScore < 17) {
            session.dealerHand.push(session.deck.pop());
            dealerScore = calculateBlackjackScore(session.dealerHand);
        }

        const playerScore = calculateBlackjackScore(session.playerHand);
        const dealerBust = dealerScore > 21;
        const dealerBJ = isNaturalBlackjack(session.dealerHand);

        if (dealerBJ) {
            session.result = 'lose';
        } else if (dealerBust) {
            session.result = 'win';
        } else if (playerScore > dealerScore) {
            session.result = 'win';
        } else if (playerScore < dealerScore) {
            session.result = 'lose';
        } else {
            session.result = 'push';
        }

        session.payout = computePayout(session.bet, session.result);
        return this._finish(playerId, session);
    }

    async double(playerId) {
        const session = this.sessions.get(playerId);
        if (!session || session.phase !== 'playing') {
            return { error: 'NO_ACTIVE_HAND' };
        }
        if (session.playerHand.length !== 2 || session.doubled) {
            return { error: 'CANNOT_DOUBLE' };
        }

        const balance = await this.userService.getUserCoins(session.walletAddress);
        if (balance < session.bet) {
            return { error: 'INSUFFICIENT_FUNDS', balance };
        }

        const deduct = await this.userService.addCoins(
            session.walletAddress,
            -session.bet,
            'blackjack_bet',
            { mode: 'pve', doubleDown: true },
            'PvE blackjack double'
        );
        if (!deduct.success) {
            return { error: deduct.error || 'DEDUCT_FAILED' };
        }

        session.bet *= 2;
        session.doubled = true;
        session.playerHand.push(session.deck.pop());
        const score = calculateBlackjackScore(session.playerHand);

        if (score > 21) {
            session.result = 'bust';
            session.payout = 0;
            return this._finish(playerId, session, deduct.newBalance);
        }

        return this.stand(playerId);
    }

    async _resolveImmediate(playerId, session, { playerBJ, dealerBJ }) {
        session.dealerHand[0].hidden = false;
        if (playerBJ && dealerBJ) {
            session.result = 'push';
        } else if (playerBJ) {
            session.result = 'blackjack';
        } else {
            session.result = 'lose';
        }
        session.payout = computePayout(session.bet, session.result);
        return this._finish(playerId, session);
    }

    async _finish(playerId, session, balanceHint = null) {
        session.phase = 'complete';
        let newBalance = balanceHint;

        if (session.payout > 0) {
            const payout = await this.userService.addCoins(
                session.walletAddress,
                session.payout,
                'blackjack_win',
                { mode: 'pve', result: session.result, bet: session.bet },
                `PvE blackjack ${session.result}`
            );
            if (!payout.success) {
                this.clearSession(playerId);
                return { error: payout.error || 'PAYOUT_FAILED' };
            }
            newBalance = payout.newBalance;
        } else if (newBalance == null) {
            newBalance = await this.userService.getUserCoins(session.walletAddress);
        }

        const state = this.buildClientState(session, { revealDealer: true });
        this.clearSession(playerId);

        return {
            success: true,
            state,
            newBalance,
        };
    }
}
