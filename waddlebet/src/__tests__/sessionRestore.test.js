import { describe, it, expect, beforeEach } from 'vitest';
import {
    SESSION_MAX_AGE_MS,
    hasStoredSession,
    readStoredSession,
    buildAuthRestoreMessage,
    clearStoredSession
} from '../multiplayer/sessionRestore.js';

function createMemoryStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: (key) => map.delete(key)
    };
}

describe('sessionRestore', () => {
    let storage;

    beforeEach(() => {
        storage = createMemoryStorage();
    });

    it('hasStoredSession is false when credentials are missing', () => {
        expect(hasStoredSession(storage)).toBe(false);

        storage.setItem('auth_token', 'tok');
        expect(hasStoredSession(storage)).toBe(false);

        storage.setItem('wallet_address', 'wallet1');
        expect(hasStoredSession(storage)).toBe(true);
    });

    it('readStoredSession returns null when credentials are missing', () => {
        expect(readStoredSession(storage)).toBeNull();
    });

    it('readStoredSession returns valid session within max age', () => {
        const now = Date.now();
        storage.setItem('auth_token', 'jwt-token');
        storage.setItem('wallet_address', 'wallet-abc');
        storage.setItem('session_timestamp', String(now - 1000));

        expect(readStoredSession(storage, now)).toEqual({
            expired: false,
            token: 'jwt-token',
            walletAddress: 'wallet-abc'
        });
    });

    it('readStoredSession marks session expired after max age', () => {
        const now = Date.now();
        storage.setItem('auth_token', 'jwt-token');
        storage.setItem('wallet_address', 'wallet-abc');
        storage.setItem('session_timestamp', String(now - SESSION_MAX_AGE_MS));

        expect(readStoredSession(storage, now)).toEqual({
            expired: true,
            token: 'jwt-token',
            walletAddress: 'wallet-abc'
        });
    });

    it('buildAuthRestoreMessage shapes the websocket payload', () => {
        expect(buildAuthRestoreMessage({ token: 't', walletAddress: 'w' })).toEqual({
            type: 'auth_restore',
            token: 't',
            walletAddress: 'w'
        });
    });

    it('clearStoredSession removes all session keys', () => {
        storage.setItem('auth_token', 't');
        storage.setItem('wallet_address', 'w');
        storage.setItem('session_timestamp', '1');

        clearStoredSession(storage);

        expect(storage.getItem('auth_token')).toBeNull();
        expect(storage.getItem('wallet_address')).toBeNull();
        expect(storage.getItem('session_timestamp')).toBeNull();
    });

    it('simulates reconnect: stored session survives disconnect and can restore again', () => {
        const now = Date.now();
        storage.setItem('auth_token', 'persisted-jwt');
        storage.setItem('wallet_address', 'wallet-xyz');
        storage.setItem('session_timestamp', String(now));

        // First connect
        const first = readStoredSession(storage, now);
        expect(first.expired).toBe(false);
        expect(buildAuthRestoreMessage(first).type).toBe('auth_restore');

        // Simulated disconnect — we intentionally do NOT clear storage anymore
        expect(hasStoredSession(storage)).toBe(true);

        // Second connect (reconnect) must still restore
        const second = readStoredSession(storage, now + 5000);
        expect(second.expired).toBe(false);
        expect(buildAuthRestoreMessage(second)).toEqual({
            type: 'auth_restore',
            token: 'persisted-jwt',
            walletAddress: 'wallet-xyz'
        });
    });
});
