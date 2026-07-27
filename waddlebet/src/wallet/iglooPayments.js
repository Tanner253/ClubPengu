/**
 * Chain-aware igloo payment helpers (Solana SPL + Robinhood ERC-20).
 */

import { isEvmChainId } from '../config/tokens.js';
import { isEvmTokenAddress } from '../utils/tokenAddress.js';
import { getIglooEconomy } from '../config/iglooEconomy.js';
import { payIglooRent as paySolanaIglooRent, payIglooEntryFee as paySolanaIglooEntryFee } from './SolanaPayment.js';
import { payIglooRent as payEvmIglooRent, payIglooEntryFee as payEvmIglooEntryFee } from './EvmPayment.js';

export function getIglooPaymentConfig(chainId) {
    return getIglooEconomy(chainId);
}

export async function payIglooRent(chainId, iglooId) {
    const economy = getIglooEconomy(chainId);

    if (!economy.rentWallet) {
        return {
            success: false,
            error: 'CONFIG_ERROR',
            message: 'Rent treasury wallet is not configured for this chain',
        };
    }

    if (isEvmChainId(chainId)) {
        return payEvmIglooRent(
            iglooId,
            economy.dailyRent,
            economy.rentWallet,
            economy.platformTokenAddress
        );
    }

    return paySolanaIglooRent(
        iglooId,
        economy.dailyRent,
        economy.rentWallet,
        economy.platformTokenAddress
    );
}

export async function payIglooEntryFee(chainId, iglooId, amount, ownerWallet, tokenAddress) {
    if (isEvmTokenAddress(tokenAddress)) {
        if (!isEvmChainId(chainId)) {
            return {
                success: false,
                error: 'WRONG_CHAIN',
                message: 'This entry fee requires a Robinhood Chain wallet',
            };
        }
        return payEvmIglooEntryFee(iglooId, amount, ownerWallet, tokenAddress);
    }

    if (isEvmChainId(chainId)) {
        return {
            success: false,
            error: 'WRONG_CHAIN',
            message: 'This entry fee requires a Solana wallet',
        };
    }

    return paySolanaIglooEntryFee(iglooId, amount, ownerWallet, tokenAddress);
}
