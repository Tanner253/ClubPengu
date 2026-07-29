/**
 * Which on-chain economy features are live per chain (server authority).
 * Keep in sync with waddlebet/src/config/chainFeatures.js
 */

import { isEvmChainId } from './tokens.js';

const SOLANA_LIVE = {
    dailyBonusClaim: true,
    pebblesRail: true,
    iglooRent: true,
    iglooEntryFee: true,
    tokenWagers: true,
    splGifts: true,
    referralPayouts: true,
    nametagTiers: true,
};

/** Robinhood EVM — daily bonus, igloos, USD-pegged pebbles. */
const EVM_LIVE = {
    dailyBonusClaim: true,
    pebblesRail: true,
    iglooRent: true,
    iglooEntryFee: true,
    tokenWagers: false,
    splGifts: false,
    referralPayouts: false,
    nametagTiers: true,
};

export function isChainFeatureLive(chainId, feature) {
    const flags = isEvmChainId(chainId) ? EVM_LIVE : SOLANA_LIVE;
    return flags[feature] === true;
}
