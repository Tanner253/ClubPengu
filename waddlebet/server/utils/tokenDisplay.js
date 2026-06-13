/**
 * Normalize legacy WADDLE/CPw3 tickers to $CP in user-facing strings.
 */

const LEGACY_CP_SYMBOLS = new Set(['$WADDLE', 'WADDLE', '$CPw3', 'CPw3', '$CP']);

export function displayTokenSymbol(symbol) {
    if (symbol == null || symbol === '') return symbol;
    const s = String(symbol);
    if (LEGACY_CP_SYMBOLS.has(s)) {
        return s.startsWith('$') ? '$CP' : 'CP';
    }
    return s;
}

export function formatTokenText(text) {
    if (text == null || text === '') return text;
    return String(text)
        .replace(/\$WADDLE/g, '$CP')
        .replace(/\$CPw3/g, '$CP')
        .replace(/\bWADDLE\b/g, 'CP')
        .replace(/\bCPw3\b/g, 'CP');
}
