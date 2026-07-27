/**
 * Chain-aware igloo rental economics (client).
 */

import { RENT_WALLET_ADDRESS, CPW3_TOKEN_ADDRESS, IGLOO_CONFIG } from './solana.js';
import { getPlatformToken, isEvmChainId, getPlatformTokenAddress } from './tokens.js';

const EVM_RENT_WALLET = import.meta.env.VITE_EVM_RENT_WALLET_ADDRESS || null;

/** @param {string|number|null|undefined} chainId */
export function getIglooEconomy(chainId) {
    const platform = getPlatformToken(chainId);
    const isEvm = isEvmChainId(chainId);

    return {
        chainId: platform.chainId,
        isEvm,
        dailyRent: IGLOO_CONFIG.DAILY_RENT_CPW3,
        minimumBalance: IGLOO_CONFIG.MINIMUM_BALANCE_CPW3,
        rentWallet: isEvm ? EVM_RENT_WALLET : RENT_WALLET_ADDRESS,
        platformTokenAddress: isEvm ? getPlatformTokenAddress(chainId) : CPW3_TOKEN_ADDRESS,
        platformTokenSymbol: platform.displaySymbol,
        platformTokenDecimals: platform.decimals,
    };
}
