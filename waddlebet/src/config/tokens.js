/**
 * Chain-aware platform token registry (client).
 * Solana: $CP (SPL) · Robinhood EVM: $WADDLE (ERC-20)
 */

import { CPW3_TOKEN_ADDRESS } from './solana.js';
import { SOLANA_CHAIN_ID, WADDLE_ETH_CONTRACT, getActiveEvmChainIdString } from './evm.js';

export { SOLANA_CHAIN_ID };

export const SOLANA_PLATFORM_TOKEN = {
    chainId: SOLANA_CHAIN_ID,
    symbol: 'CP',
    displaySymbol: '$CP',
    address: CPW3_TOKEN_ADDRESS,
    decimals: 6,
};

export const EVM_PLATFORM_TOKEN = {
    get chainId() {
        return getActiveEvmChainIdString();
    },
    symbol: 'WADDLE',
    displaySymbol: '$WADDLE',
    address: import.meta.env.VITE_WADDLE_TOKEN_ADDRESS || WADDLE_ETH_CONTRACT,
    decimals: parseInt(import.meta.env.VITE_WADDLE_TOKEN_DECIMALS || '18', 10),
};

const EVM_CHAIN_IDS = new Set(['4663', '46630', 4663, 46630]);

export function isEvmChainId(chainId) {
    if (!chainId || chainId === SOLANA_CHAIN_ID) return false;
    return EVM_CHAIN_IDS.has(chainId) || EVM_CHAIN_IDS.has(parseInt(chainId, 10));
}

export function getPlatformToken(chainId) {
    return isEvmChainId(chainId) ? EVM_PLATFORM_TOKEN : SOLANA_PLATFORM_TOKEN;
}

export function getPlatformTokenSymbol(chainId, { withDollar = true } = {}) {
    const token = getPlatformToken(chainId);
    return withDollar ? token.displaySymbol : token.symbol;
}

export function getPlatformTokenAddress(chainId) {
    return getPlatformToken(chainId).address;
}
