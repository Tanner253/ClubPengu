/**
 * Robinhood Chain (EVM) server-side auth configuration
 */

export const ALLOWED_EVM_CHAIN_IDS = new Set([4663, 46630]);

export const SOLANA_CHAIN_ID = 'solana';

export function normalizeChainId(chainId) {
    if (!chainId || chainId === SOLANA_CHAIN_ID) {
        return SOLANA_CHAIN_ID;
    }
    return String(chainId);
}

export function parseEvmChainId(chainId) {
    const parsed = parseInt(chainId, 10);
    if (!Number.isFinite(parsed) || !ALLOWED_EVM_CHAIN_IDS.has(parsed)) {
        return null;
    }
    return parsed;
}

export function isAllowedEvmChainId(chainId) {
    return parseEvmChainId(chainId) !== null;
}

/** Default Robinhood chain for auth — mainnet; opt into testnet via EVM_CHAIN_ID=testnet */
export function getDefaultEvmChainId() {
    const override = process.env.EVM_CHAIN_ID;
    if (override === '46630' || override === 'testnet') return 46630;
    return 4663;
}

/** $WADDLE ERC-20 contract on Robinhood Chain (Ethereum EVM). */
export const WADDLE_ETH_CONTRACT =
    process.env.WADDLE_TOKEN_ADDRESS || '0xcf83b446d4cf400b132538d7bb03e36bdbd3c8b8';
