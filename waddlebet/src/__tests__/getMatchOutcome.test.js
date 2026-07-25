import { describe, it, expect } from 'vitest';
import { getMatchOutcome, resolveMatchEndWinner } from '../challenge/getMatchOutcome.js';

describe('getMatchOutcome', () => {
    it('guest winner sees victory via winnerPlayerId', () => {
        const outcome = getMatchOutcome({
            matchState: { winner: 'player2', status: 'complete' },
            matchResult: { winnerPlayerId: 'guest-abc', winner: 'player2', reason: 'win' },
            localPlayerId: 'guest-abc',
        });
        expect(outcome.didWin).toBe(true);
        expect(outcome.didLose).toBe(false);
        expect(outcome.isDraw).toBe(false);
    });

    it('guest loser sees defeat via winnerPlayerId', () => {
        const outcome = getMatchOutcome({
            matchState: { winner: 'player1', status: 'complete' },
            matchResult: { winnerPlayerId: 'auth-xyz', winner: 'player1', reason: 'win' },
            localPlayerId: 'guest-abc',
        });
        expect(outcome.didWin).toBe(false);
        expect(outcome.didLose).toBe(true);
    });

    it('tic-tac-toe symbol winner preserved — guest O wins', () => {
        const outcome = getMatchOutcome({
            matchState: { winner: 'O', status: 'complete' },
            matchResult: { winnerPlayerId: 'guest-2', winner: 'player2', reason: 'win' },
            localPlayerId: 'guest-2',
        });
        expect(outcome.didWin).toBe(true);
    });

    it('draw returns isDraw for both players', () => {
        const outcome = getMatchOutcome({
            matchState: { winner: 'draw' },
            matchResult: { winner: 'draw', winnerPlayerId: null, reason: 'draw' },
            localPlayerId: 'guest-1',
        });
        expect(outcome.isDraw).toBe(true);
        expect(outcome.didWin).toBe(false);
        expect(outcome.didLose).toBe(false);
    });

    it('disconnect is void — not win or loss', () => {
        const outcome = getMatchOutcome({
            matchState: { winner: 'player1' },
            matchResult: { winnerPlayerId: null, reason: 'disconnect' },
            localPlayerId: 'guest-1',
        });
        expect(outcome.isVoid).toBe(true);
        expect(outcome.didWin).toBe(false);
        expect(outcome.didLose).toBe(false);
    });
});

describe('resolveMatchEndWinner', () => {
    it('preserves X/O/R/Y over player1/player2', () => {
        expect(resolveMatchEndWinner('O', 'player2')).toBe('O');
        expect(resolveMatchEndWinner('X', 'player1')).toBe('X');
        expect(resolveMatchEndWinner('R', 'player1')).toBe('R');
    });

    it('uses player role when no symbol winner', () => {
        expect(resolveMatchEndWinner('player1', 'player2')).toBe('player2');
        expect(resolveMatchEndWinner(undefined, 'player1')).toBe('player1');
    });

    it('preserves draw', () => {
        expect(resolveMatchEndWinner('draw', 'draw')).toBe('draw');
    });
});
