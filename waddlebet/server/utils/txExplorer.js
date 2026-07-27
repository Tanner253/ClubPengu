/**
 * Chain-aware transaction explorer URLs (server logs + API payloads).
 */

import { isEvmChainId } from '../config/tokens.js';

const SOLSCAN_TX = 'https://solscan.io/tx';
const BLOCKSCOUT_MAINNET = 'https://robinhoodchain.blockscout.com/tx';
const BLOCKSCOUT_TESTNET = 'https://explorer.testnet.chain.robinhood.com/tx';

/** @param {string} txHash @param {string|number|null} [chainId] */
export function getTxExplorerUrl(txHash, chainId = 'solana') {
    if (!txHash) return null;
    if (isEvmChainId(chainId) || (typeof txHash === 'string' && txHash.startsWith('0x'))) {
        const id = String(chainId);
        const base = id === '46630' ? BLOCKSCOUT_TESTNET : BLOCKSCOUT_MAINNET;
        return `${base}/${txHash}`;
    }
    return `${SOLSCAN_TX}/${txHash}`;
}

export function getExplorerLabel(chainId = 'solana') {
    return isEvmChainId(chainId) ? 'Blockscout' : 'Solscan';
}
