/**
 * Detect whether a token contract/mint address belongs to EVM or Solana.
 */

import { isEvmChainId } from '../config/tokens.js';

export function isEvmTokenAddress(address) {
    return typeof address === 'string'
        && address.startsWith('0x')
        && address.length === 42;
}

export function isSolanaTokenAddress(address) {
    return typeof address === 'string'
        && !address.startsWith('0x')
        && address.length >= 32;
}

/** Token address format must match the user's connected chain. */
export function isTokenOnUserChain(tokenAddress, chainId) {
    if (!tokenAddress) return true;
    if (isEvmTokenAddress(tokenAddress)) return isEvmChainId(chainId);
    if (isSolanaTokenAddress(tokenAddress)) return !isEvmChainId(chainId);
    return false;
}

export function resolveTokenChainId(tokenAddress, fallbackChainId = 'solana') {
    if (isEvmTokenAddress(tokenAddress)) {
        return isEvmChainId(fallbackChainId) ? String(fallbackChainId) : '4663';
    }
    return 'solana';
}
