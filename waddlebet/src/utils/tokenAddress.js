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

export function isTokenOnUserChain(tokenAddress, chainId) {
    if (!tokenAddress) return true;
    if (isEvmTokenAddress(tokenAddress)) return isEvmChainId(chainId);
    if (isSolanaTokenAddress(tokenAddress)) return !isEvmChainId(chainId);
    return false;
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

    const fee = igloo.entryFee?.tokenAddress
        || igloo.entryFeeToken?.tokenAddress;
    const gate = igloo.tokenGate?.tokenAddress
        || igloo.tokenGateInfo?.tokenAddress;
    if (isEvmTokenAddress(fee) || isEvmTokenAddress(gate)) return 'evm';
    if (isSolanaTokenAddress(fee) || isSolanaTokenAddress(gate)) return 'solana';
    return null;
}

/** Visitor on same chain as the igloo (unknown igloo chain ⇒ allow). */
export function isVisitorOnIglooChain(visitorChainId, igloo) {
    const kind = getIglooChainKind(igloo);
    if (!kind) return true;
    return kind === 'evm' ? isEvmChainId(visitorChainId) : !isEvmChainId(visitorChainId);
}

/** @returns {string|null} denial copy, or null when allowed */
export function getCrossChainIglooDenialMessage(visitorChainId, igloo) {
    if (isVisitorOnIglooChain(visitorChainId, igloo)) return null;
    const kind = getIglooChainKind(igloo);
    if (kind === 'evm') return 'EVM igloo access denied';
    if (kind === 'solana') return 'Solana igloo access denied';
    return null;
}
