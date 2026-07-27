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

export function isTokenOnUserChain(tokenAddress, chainId) {
    if (!tokenAddress) return true;
    if (isEvmTokenAddress(tokenAddress)) return isEvmChainId(chainId);
    if (isSolanaTokenAddress(tokenAddress)) return !isEvmChainId(chainId);
    return false;
}
