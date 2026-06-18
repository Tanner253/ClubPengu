import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import PveBlackjackService from '../services/PveBlackjackService.js';
import * as blackjackRules from '../config/blackjackRules.js';

function testDeck() {
    const card = (value, suit = '♣', uid = 0) => ({ suit, value, uid });
    // Pops from end: player 10+9=19, dealer 6+10=16 (no naturals)
    const tail = [card('10', '♠', 1), card('9', '♥', 2), card('6', '♦', 3), card('10', '♣', 4)];
    const filler = Array.from({ length: 20 }, (_, i) => card('2', '♠', 10 + i));
    return [...filler, ...tail];
}

describe('PveBlackjackService', () => {
    let userService;
    let service;
    let sent;

    beforeEach(() => {
        vi.spyOn(blackjackRules, 'createShuffledDeck').mockReturnValue(testDeck());
        sent = [];
        userService = {
            getUserCoins: vi.fn().mockResolvedValue(100),
            addCoins: vi.fn().mockImplementation(async (_wallet, amount) => ({
                success: true,
                newBalance: 100 + amount,
            })),
        };
        service = new PveBlackjackService(userService, (id, payload) => sent.push({ id, payload }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('starts a hand and deducts the bet', async () => {
        const result = await service.start('player1', 'wallet1', 20);
        expect(result.success).toBe(true);
        expect(result.state.bet).toBe(20);
        expect(result.state.playerHand).toHaveLength(2);
        expect(userService.addCoins).toHaveBeenCalledWith(
            'wallet1',
            -20,
            'blackjack_bet',
            { mode: 'pve' },
            'PvE blackjack bet'
        );
    });

    it('rejects legacy-style win claims without an active session', async () => {
        const hit = await service.hit('player1');
        expect(hit.error).toBe('NO_ACTIVE_HAND');
    });

    it('pays out only through server resolution on stand', async () => {
        await service.start('player1', 'wallet1', 10);
        vi.mocked(userService.addCoins).mockClear();

        const stand = await service.stand('player1');
        expect(stand.success).toBe(true);
        expect(stand.state.phase).toBe('complete');

        const payoutCalls = userService.addCoins.mock.calls.filter((c) => c[1] > 0);
        if (payoutCalls.length > 0) {
            expect(payoutCalls[0][2]).toBe('blackjack_win');
        }
        expect(service.getSession('player1')).toBeNull();
    });
});
