/** Session restore helpers — pure logic used by MultiplayerContext */

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function hasStoredSession(storage) {
    return !!(storage.getItem('auth_token') && storage.getItem('wallet_address'));
}

/**
 * Read stored session credentials. Returns null if missing, { expired: true } if too old.
 */
export function readStoredSession(storage, now = Date.now()) {
    const token = storage.getItem('auth_token');
    const walletAddress = storage.getItem('wallet_address');
    const sessionTimestamp = storage.getItem('session_timestamp');

    if (!token || !walletAddress) {
        return null;
    }

    const sessionAge = now - parseInt(sessionTimestamp || '0', 10);
    if (sessionAge >= SESSION_MAX_AGE_MS) {
        return { expired: true, token, walletAddress };
    }

    return { expired: false, token, walletAddress };
}

export function buildAuthRestoreMessage({ token, walletAddress }) {
    return { type: 'auth_restore', token, walletAddress };
}

export function clearStoredSession(storage) {
    storage.removeItem('auth_token');
    storage.removeItem('wallet_address');
    storage.removeItem('session_timestamp');
}
