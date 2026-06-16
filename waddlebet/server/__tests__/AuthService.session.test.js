import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const mockFindValidSession = vi.fn();
const mockFindOne = vi.fn();

vi.mock('../db/models/index.js', () => ({
    User: {
        findOne: (...args) => mockFindOne(...args)
    },
    AuthSession: {
        findValidSession: (...args) => mockFindValidSession(...args)
    }
}));

const { default: AuthService } = await import('../services/AuthService.js');

describe('AuthService session validation', () => {
    let authService;

    beforeEach(() => {
        authService = new AuthService();
        mockFindValidSession.mockReset();
        mockFindOne.mockReset();
    });

    it('rejects expired JWT tokens', async () => {
        const expiredToken = jwt.sign(
            { walletAddress: 'wallet1', sessionId: 'p1' },
            process.env.JWT_SECRET,
            { expiresIn: '-1h' }
        );

        const result = await authService.validateSession(expiredToken);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('TOKEN_EXPIRED');
        expect(mockFindValidSession).not.toHaveBeenCalled();
    });

    it('rejects valid JWT when DB session is missing', async () => {
        const token = authService.generateToken('wallet1', 'player-1');
        mockFindValidSession.mockResolvedValue(null);

        const result = await authService.validateSession(token);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('SESSION_INVALID');
    });

    it('accepts valid JWT with active DB session', async () => {
        const token = authService.generateToken('wallet1', 'player-1');
        const touch = vi.fn().mockResolvedValue(undefined);
        const save = vi.fn().mockResolvedValue(undefined);

        mockFindValidSession.mockResolvedValue({ touch });
        mockFindOne.mockResolvedValue({
            walletAddress: 'wallet1',
            lastActiveAt: null,
            save
        });

        const result = await authService.validateSession(token);
        expect(result.valid).toBe(true);
        expect(result.user.walletAddress).toBe('wallet1');
        expect(touch).toHaveBeenCalled();
        expect(save).toHaveBeenCalled();
    });

    it('does not trust client auth state — server validates token independently', async () => {
        const forgedToken = jwt.sign(
            { walletAddress: 'attacker-wallet', sessionId: 'x' },
            'wrong-secret'
        );

        const result = await authService.validateSession(forgedToken);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('INVALID_TOKEN');
    });
});
