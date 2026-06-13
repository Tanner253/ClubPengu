/**
 * Display-only token symbol mapping.
 * Server/DB keep legacy WADDLE identifiers; users see $CP in the UI.
 */

const WADDLE_SYMBOLS = new Set(['$WADDLE', 'WADDLE', '$CPw3', 'CPw3']);

export function displayTokenSymbol(symbol) {
    if (symbol == null || symbol === '') return symbol;
    const s = String(symbol);
    if (WADDLE_SYMBOLS.has(s)) {
        return s.startsWith('$') ? '$CP' : 'CP';
    }
    return s;
}
