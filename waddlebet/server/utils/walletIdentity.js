/**
 * Canonical wallet identity helpers — Solana + EVM (EIP-55)
 */

import { normalizeChainId, SOLANA_CHAIN_ID } from '../config/evm.js';
import { toChecksumAddress } from './evmAddress.js';

export function canonicalWalletAddress(walletAddress, chainId = SOLANA_CHAIN_ID) {
    if (!walletAddress) return walletAddress;
    const normalized = normalizeChainId(chainId);
    if (normalized === SOLANA_CHAIN_ID) {
        return walletAddress;
    }
    return toChecksumAddress(walletAddress);
}

export function walletsMatch(storedWallet, providedWallet, chainId = SOLANA_CHAIN_ID) {
    if (!storedWallet || !providedWallet) return false;
    const normalized = normalizeChainId(chainId);
    if (normalized === SOLANA_CHAIN_ID) {
        return storedWallet === providedWallet;
    }
    return storedWallet.toLowerCase() === providedWallet.toLowerCase();
}

/**
 * Find user by wallet + chain, with legacy Solana migration.
 */
export async function findUserByWallet(UserModel, walletAddress, chainId = SOLANA_CHAIN_ID) {
    if (!walletAddress) return null;

    const normalized = normalizeChainId(chainId);
    const canonical = canonicalWalletAddress(walletAddress, normalized);

    let user = await UserModel.findOne({ walletAddress: canonical, chainId: normalized });

    if (!user && normalized === SOLANA_CHAIN_ID) {
        user = await UserModel.findOne({
            walletAddress: canonical,
            $or: [
                { chainId: { $exists: false } },
                { chainId: null },
                { chainId: '' }
            ]
        });
        if (user && (!user.chainId || user.chainId === '')) {
            user.chainId = SOLANA_CHAIN_ID;
            await user.save();
        }
    }

    return user;
}
