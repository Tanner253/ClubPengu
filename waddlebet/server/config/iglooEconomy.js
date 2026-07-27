/**
 * Chain-aware igloo rental economics (server).
 * Same human amounts on Solana ($CP) and Robinhood EVM ($WADDLE).
 */

import { getPlatformToken, isEvmChainId } from './tokens.js';

const DAILY_RENT = parseInt(
    process.env.DAILY_RENT_CPW3 || process.env.DAILY_RENT_WADDLE || '10000',
    10
);
const MINIMUM_BALANCE = parseInt(
    process.env.MINIMUM_BALANCE_CPW3 || process.env.MINIMUM_BALANCE_WADDLE || '70000',
    10
);

function getSolanaRentWallet() {
    return process.env.RENT_WALLET_ADDRESS || '466jab8XPyn5vXj3SgzCz8wuEkBKqVuQrUy4EtLiadxM';
}

function getEvmRentWallet() {
    return process.env.EVM_RENT_WALLET_ADDRESS
        || process.env.EVM_CUSTODIAL_WALLET_ADDRESS
        || null;
}

/** @param {string|number|null|undefined} chainId */
export function getIglooEconomy(chainId) {
    const platform = getPlatformToken(chainId);
    const isEvm = isEvmChainId(chainId);

    return {
        chainId: platform.chainId,
        isEvm,
        dailyRent: DAILY_RENT,
        minimumBalance: MINIMUM_BALANCE,
        rentWallet: isEvm ? getEvmRentWallet() : getSolanaRentWallet(),
        platformTokenAddress: platform.address,
        platformTokenSymbol: platform.displaySymbol,
        platformTokenDecimals: platform.decimals,
    };
}
