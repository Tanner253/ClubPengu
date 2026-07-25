import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    useDailyBonusSessionTimer,
    resetDailyBonusSessionTimer,
} from '../hooks/useDailyBonusSessionTimer.js';

describe('useDailyBonusSessionTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetDailyBonusSessionTimer();
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
                        lastClaimAt: null,
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
                lastClaimAt: null,
            },
        });

        expect(result.current.sessionSeconds).toBeGreaterThanOrEqual(15);
    });

    it('does not reset to zero when server briefly reports 0 without a new claim', () => {
        const { result, rerender } = renderHook(
            ({ status }) => useDailyBonusSessionTimer(status, { enabled: true }),
            {
                initialProps: {
                    status: {
                        sessionSeconds: 120,
                        requiredSeconds: 3600,
                        receivedAt: Date.now(),
                        lastClaimAt: '2026-07-23T12:00:00.000Z',
                    },
                },
            }
        );

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(result.current.sessionSeconds).toBeGreaterThanOrEqual(123);

        rerender({
            status: {
                sessionSeconds: 0,
                sessionMinutes: 0,
                requiredSeconds: 3600,
                receivedAt: Date.now() + 3000,
                lastClaimAt: '2026-07-23T12:00:00.000Z',
            },
        });

        expect(result.current.sessionSeconds).toBeGreaterThanOrEqual(123);
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
                        lastClaimAt: null,
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

    it('shares progress between hook instances', () => {
        const status = {
            sessionSeconds: 40,
            requiredSeconds: 3600,
            receivedAt: Date.now(),
            lastClaimAt: '2026-07-23T12:00:00.000Z',
        };

        const first = renderHook(() => useDailyBonusSessionTimer(status, { enabled: true }));
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        const second = renderHook(() => useDailyBonusSessionTimer(status, { enabled: true }));

        expect(second.result.current.sessionSeconds).toBeGreaterThanOrEqual(45);
        first.unmount();
        second.unmount();
    });
});
