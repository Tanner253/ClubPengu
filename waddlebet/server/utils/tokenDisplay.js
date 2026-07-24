/**
 * Chain-aware token symbol display (server).
 * Solana platform token: $CP · Robinhood EVM platform token: $WADDLE
 */

import {
    getPlatformTokenSymbol,
    isEvmChainId,
} from '../config/tokens.js';

const LEGACY_SOLANA_SYMBOLS = new Set(['$CPw3', 'CPw3', '$CP', 'CP']);
const LEGACY_EVM_SYMBOLS = new Set(['$WADDLE', 'WADDLE']);
const PLATFORM_SYMBOLS = new Set([...LEGACY_SOLANA_SYMBOLS, ...LEGACY_EVM_SYMBOLS]);

export function isPlatformTokenSymbol(symbol) {
    return PLATFORM_SYMBOLS.has(String(symbol));
}

export function displayTokenSymbol(symbol, chainId) {
    if (symbol == null || symbol === '') return symbol;
    const s = String(symbol);

    if (s === '$CPw3' || s === 'CPw3') {
        return getPlatformTokenSymbol(chainId);
    }

    if (isPlatformTokenSymbol(s)) {
        if (chainId) {
            return getPlatformTokenSymbol(chainId);
        }
        if (LEGACY_EVM_SYMBOLS.has(s)) {
            return s.startsWith('$') ? '$WADDLE' : 'WADDLE';
        }
        return s.startsWith('$') ? '$CP' : 'CP';
    }

    return s;
}

export function formatTokenText(text, chainId) {
    if (text == null || text === '') return text;

    let result = String(text);
    const platform = getPlatformTokenSymbol(chainId);
    const bare = platform.replace('$', '');

    if (chainId && isEvmChainId(chainId)) {
        result = result
            .replace(/\$CPw3/g, platform)
            .replace(/\bCPw3\b/g, bare)
            .replace(/\$CP\b/g, platform)
            .replace(/\bCP\b/g, bare);
        return result;
    }

    if (chainId) {
        result = result
            .replace(/\$CPw3/g, '$CP')
            .replace(/\bCPw3\b/g, 'CP')
            .replace(/\$WADDLE/g, '$CP')
            .replace(/\bWADDLE\b/g, 'CP');
        return result;
    }

    return result
        .replace(/\$CPw3/g, '$CP')
        .replace(/\bCPw3\b/g, 'CP');
}
