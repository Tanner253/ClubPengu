/**
 * Which on-chain economy features are live per chain.
 * Off-chain (gold, inventory, cosmetics DB) is always available when authenticated.
 */

import { isEvmChainId } from './tokens.js';

/** @typedef {'dailyBonusClaim'|'pebblesRail'|'iglooRent'|'iglooEntryFee'|'tokenWagers'|'splGifts'|'referralPayouts'} ChainFeature */

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

/** Robinhood EVM — daily bonus + igloo economy live. */
const EVM_LIVE = {
    dailyBonusClaim: true,
    pebblesRail: false,
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
