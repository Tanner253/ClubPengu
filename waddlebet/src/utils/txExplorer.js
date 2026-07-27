/**
 * Chain-aware transaction explorer links for receipts / activity UI.
 */

import { isEvmChainId } from '../config/tokens.js';
import { getEvmTxExplorerUrl } from '../config/evm.js';
import { getSolscanTxUrl } from '../config/wagerTokens.js';

/**
 * @param {string} txHashOrSignature
 * @param {string|number|null} [chainId]
 */
export function getTxExplorerUrl(txHashOrSignature, chainId) {
    if (!txHashOrSignature) return null;
    if (isEvmChainId(chainId) || String(txHashOrSignature).startsWith('0x')) {
        return getEvmTxExplorerUrl(txHashOrSignature, chainId);
    }
    return getSolscanTxUrl(txHashOrSignature);
}

/** Prefer chainId; fall back to 0x hash ⇒ EVM / Blockscout. */
export function getExplorerLabelForTx(txHashOrSignature, chainId) {
    if (isEvmChainId(chainId) || String(txHashOrSignature || '').startsWith('0x')) {
        return 'Blockscout';
    }
    return 'Solscan';
}

export function shortenTx(txHashOrSignature, chars = 8) {
    if (!txHashOrSignature) return '';
    const s = String(txHashOrSignature);
    if (s.length <= chars * 2 + 3) return s;
    return `${s.slice(0, chars)}…${s.slice(-chars)}`;
}

export function shortenWallet(address, chars = 4) {
    if (!address) return '—';
    const s = String(address);
    if (s.length <= chars * 2 + 3) return s;
    return `${s.slice(0, chars + 2)}…${s.slice(-chars)}`;
}
