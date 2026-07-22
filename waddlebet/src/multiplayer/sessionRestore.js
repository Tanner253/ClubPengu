/** Session restore helpers — pure logic used by MultiplayerContext */

import { SOLANA_CHAIN_ID } from '../config/evm.js';

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const WALLET_CHAIN_STORAGE_KEY = 'wallet_chain_id';

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
    const chainId = storage.getItem(WALLET_CHAIN_STORAGE_KEY) || SOLANA_CHAIN_ID;

    if (!token || !walletAddress) {
        return null;
    }

    const sessionAge = now - parseInt(sessionTimestamp || '0', 10);
    if (sessionAge >= SESSION_MAX_AGE_MS) {
        return { expired: true, token, walletAddress, chainId };
    }

    return { expired: false, token, walletAddress, chainId };
}

export function buildAuthRestoreMessage({ token, walletAddress, chainId = SOLANA_CHAIN_ID }) {
    return { type: 'auth_restore', token, walletAddress, chainId };
}

export function clearStoredSession(storage) {
    storage.removeItem('auth_token');
    storage.removeItem('wallet_address');
    storage.removeItem('session_timestamp');
    storage.removeItem(WALLET_CHAIN_STORAGE_KEY);
}

export function persistSessionCredentials(storage, { token, walletAddress, chainId = SOLANA_CHAIN_ID }) {
    storage.setItem('auth_token', token);
    storage.setItem('wallet_address', walletAddress);
    storage.setItem(WALLET_CHAIN_STORAGE_KEY, chainId);
    storage.setItem('session_timestamp', Date.now().toString());
}
