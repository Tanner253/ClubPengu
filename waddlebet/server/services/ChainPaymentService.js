/**
 * ChainPaymentService - Routes igloo/token payments to Solana or EVM backends.
 */

import { isEvmChainId, getPlatformToken } from '../config/tokens.js';
import { getIglooEconomy } from '../config/iglooEconomy.js';
import { isEvmTokenAddress, resolveTokenChainId } from '../utils/tokenAddress.js';
import solanaPaymentService from './SolanaPaymentService.js';
import evmPaymentService from './EvmPaymentService.js';

function normalizeChainId(chainId) {
    return chainId || 'solana';
}

class ChainPaymentService {
    isEvm(chainId) {
        return isEvmChainId(chainId);
    }

    getIglooEconomy(chainId) {
        return getIglooEconomy(normalizeChainId(chainId));
    }

    async checkMinimumBalance(walletAddress, tokenAddress, minimumBalance, chainId) {
        if (isEvmTokenAddress(tokenAddress)) {
            const tokenChainId = resolveTokenChainId(tokenAddress, chainId);
            return evmPaymentService.checkMinimumBalance(
                walletAddress,
                tokenAddress,
                minimumBalance,
                tokenChainId
            );
        }

        return solanaPaymentService.checkMinimumBalance(
            walletAddress,
            tokenAddress,
            minimumBalance
        );
    }

    async verifyRentPayment(txHash, senderWallet, chainId, options = {}) {
        const economy = this.getIglooEconomy(chainId);

        if (!economy.rentWallet) {
            return {
                success: false,
                error: 'CONFIG_ERROR',
                message: 'Rent treasury wallet not configured for this chain',
            };
        }

        if (this.isEvm(chainId)) {
            return evmPaymentService.verifyRentPayment(
                txHash,
                senderWallet,
                economy.rentWallet,
                economy.dailyRent,
                {
                    chainId,
                    tokenAddress: economy.platformTokenAddress,
                    tokenSymbol: economy.platformTokenSymbol,
                    iglooId: options.iglooId,
                    isRenewal: options.isRenewal,
                    ipAddress: options.ipAddress,
                }
            );
        }

        return solanaPaymentService.verifyRentPayment(
            txHash,
            senderWallet,
            economy.rentWallet,
            economy.dailyRent,
            {
                iglooId: options.iglooId,
                isRenewal: options.isRenewal,
                ipAddress: options.ipAddress,
            }
        );
    }

    async verifyEntryFee(txHash, senderWallet, recipientWallet, tokenAddress, amount, chainId, options = {}) {
        const tokenChainId = resolveTokenChainId(tokenAddress, chainId);

        if (isEvmTokenAddress(tokenAddress)) {
            return evmPaymentService.verifyTransaction(
                txHash,
                senderWallet,
                recipientWallet,
                tokenAddress,
                amount,
                {
                    chainId: tokenChainId,
                    transactionType: 'igloo_entry_fee',
                    tokenSymbol: options.tokenSymbol || getPlatformToken(tokenChainId).displaySymbol,
                    iglooId: options.iglooId,
                }
            );
        }

        return solanaPaymentService.verifyTransaction(
            txHash,
            senderWallet,
            recipientWallet,
            tokenAddress,
            amount,
            {
                transactionType: 'igloo_entry_fee',
                iglooId: options.iglooId,
                tokenSymbol: options.tokenSymbol || '$CP',
            }
        );
    }
}

const chainPaymentService = new ChainPaymentService();
export default chainPaymentService;
