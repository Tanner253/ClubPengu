/**
 * Chain-aware platform token registry.
 * Solana: $CP (SPL) · Robinhood EVM: $WADDLE (ERC-20)
 *
 * EVM fields use getters so values resolve after loadEnv.js runs.
 */

import { SOLANA_CHAIN_ID, getDefaultEvmChainId, getWaddleEthContract } from './evm.js';

export { getWaddleEthContract };

export const SOLANA_PLATFORM_TOKEN = {
    chainId: SOLANA_CHAIN_ID,
    symbol: 'CP',
    displaySymbol: '$CP',
    address: process.env.CPW3_TOKEN_ADDRESS || '9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump',
    decimals: 6,
};

export const EVM_PLATFORM_TOKEN = {
    get chainId() {
        return String(getDefaultEvmChainId());
    },
    symbol: 'WADDLE',
    displaySymbol: '$WADDLE',
    get address() {
        return process.env.WADDLE_TOKEN_ADDRESS || getWaddleEthContract();
    },
    get decimals() {
        return parseInt(process.env.WADDLE_TOKEN_DECIMALS || '18', 10);
    },
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
