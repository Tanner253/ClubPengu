/**
 * Chain-aware platform token registry.
 * Solana: $CP (SPL) · Robinhood EVM: $WADDLE (ERC-20)
 */

import { SOLANA_CHAIN_ID, getDefaultEvmChainId, WADDLE_ETH_CONTRACT } from './evm.js';

export { WADDLE_ETH_CONTRACT };

export const SOLANA_PLATFORM_TOKEN = {
    chainId: SOLANA_CHAIN_ID,
    symbol: 'CP',
    displaySymbol: '$CP',
    address: process.env.CPW3_TOKEN_ADDRESS || '9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump',
    decimals: 6,
};

export const EVM_PLATFORM_TOKEN = {
    chainId: String(getDefaultEvmChainId()),
    symbol: 'WADDLE',
    displaySymbol: '$WADDLE',
    address: process.env.WADDLE_TOKEN_ADDRESS || WADDLE_ETH_CONTRACT,
    decimals: parseInt(process.env.WADDLE_TOKEN_DECIMALS || '18', 10),
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
