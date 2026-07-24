import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDailyBonusSessionTimer } from '../hooks/useDailyBonusSessionTimer.js';

describe('useDailyBonusSessionTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not reset backward when server status refreshes', () => {
        const { result, rerender } = renderHook(
            ({ status }) => useDailyBonusSessionTimer(status, { enabled: true }),
            {
                initialProps: {
                    status: {
                        sessionSeconds: 10,
                        requiredSeconds: 30,
                        receivedAt: Date.now(),
                    },
                },
            }
        );

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(result.current.sessionSeconds).toBeGreaterThanOrEqual(15);

        rerender({
            status: {
                sessionSeconds: 10,
                requiredSeconds: 30,
                receivedAt: Date.now() + 5000,
            },
        });

        expect(result.current.sessionSeconds).toBeGreaterThanOrEqual(15);
    });

    it('resets when server reports a claim window reset', () => {
        const { result, rerender } = renderHook(
            ({ status }) => useDailyBonusSessionTimer(status, { enabled: true }),
            {
                initialProps: {
                    status: {
                        sessionSeconds: 25,
                        requiredSeconds: 30,
                        receivedAt: Date.now(),
                    },
                },
            }
        );

        rerender({
            status: {
                sessionSeconds: 0,
                requiredSeconds: 30,
                receivedAt: Date.now() + 1000,
                lastClaimAt: new Date().toISOString(),
            },
        });

        expect(result.current.sessionSeconds).toBe(0);
    });
});
