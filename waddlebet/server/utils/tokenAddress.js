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

/** EVM wallets share the 0x…42 hex shape with ERC-20 contracts. */
export function isEvmWalletAddress(address) {
    return isEvmTokenAddress(address);
}

export function isSolanaWalletAddress(address) {
    return isSolanaTokenAddress(address);
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

/**
 * Infer igloo chain from owner wallet, then fee/gate token addresses.
 * @returns {'evm'|'solana'|null}
 */
export function getIglooChainKind(igloo) {
    if (!igloo) return null;
    const owner = igloo.ownerWallet;
    if (isEvmWalletAddress(owner)) return 'evm';
    if (isSolanaWalletAddress(owner)) return 'solana';

    const fee = igloo.entryFee?.tokenAddress;
    const gate = igloo.tokenGate?.tokenAddress;
    if (isEvmTokenAddress(fee) || isEvmTokenAddress(gate)) return 'evm';
    if (isSolanaTokenAddress(fee) || isSolanaTokenAddress(gate)) return 'solana';
    return null;
}

export function isVisitorOnIglooChain(visitorChainId, igloo) {
    const kind = getIglooChainKind(igloo);
    if (!kind) return true;
    return kind === 'evm' ? isEvmChainId(visitorChainId) : !isEvmChainId(visitorChainId);
}

export function getCrossChainIglooDenialMessage(visitorChainId, igloo) {
    if (isVisitorOnIglooChain(visitorChainId, igloo)) return null;
    const kind = getIglooChainKind(igloo);
    if (kind === 'evm') return 'EVM igloo access denied';
    if (kind === 'solana') return 'Solana igloo access denied';
    return null;
}
