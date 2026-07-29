/**
 * EvmPayment - Robinhood Chain ERC-20 transfers via MetaMask
 */

import {
    createPublicClient,
    createWalletClient,
    custom,
    http,
    parseAbi,
    parseUnits,
    parseEther,
    formatUnits,
    isAddress,
} from 'viem';
import MetaMaskWallet from './MetaMaskWallet.js';
import { getActiveRobinhoodChain, getRobinhoodChainById } from '../config/evm.js';

const ERC20_ABI = parseAbi([
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
]);

async function getTokenDecimals(publicClient, tokenAddress, fallback = 18) {
    try {
        return await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'decimals',
        });
    } catch {
        return fallback;
    }
}

/**
 * Send ERC-20 tokens on Robinhood Chain.
 */
export async function sendErc20Token(options) {
    const {
        recipientAddress,
        tokenAddress,
        amount,
    } = options;

    const wallet = MetaMaskWallet.getInstance();

    if (!wallet.connected || !wallet.address) {
        return {
            success: false,
            error: 'WALLET_NOT_CONNECTED',
            message: 'Please connect your MetaMask wallet first',
        };
    }

    if (!isAddress(recipientAddress) || !isAddress(tokenAddress)) {
        return {
            success: false,
            error: 'INVALID_ADDRESS',
            message: 'Invalid wallet or token address',
        };
    }

    try {
        const chain = await wallet.ensureRobinhoodChain();
        const provider = wallet.getMetaMaskProvider();
        if (!provider) {
            return {
                success: false,
                error: 'WALLET_NOT_CONNECTED',
                message: 'MetaMask provider not available',
            };
        }

        const publicClient = createPublicClient({
            chain: {
                id: chain.chainId,
                name: chain.name,
                nativeCurrency: chain.nativeCurrency,
            },
            transport: http(chain.rpcUrl),
        });

        const walletClient = createWalletClient({
            chain: {
                id: chain.chainId,
                name: chain.name,
                nativeCurrency: chain.nativeCurrency,
            },
            transport: custom(provider),
        });

        const senderAddress = wallet.address;
        const decimals = await getTokenDecimals(publicClient, tokenAddress);
        const transferAmount = parseUnits(String(amount), decimals);

        const balanceRaw = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [senderAddress],
        });

        if (balanceRaw < transferAmount) {
            const balanceHuman = parseFloat(formatUnits(balanceRaw, decimals));
            return {
                success: false,
                error: 'INSUFFICIENT_BALANCE',
                message: `Insufficient balance. You have ${balanceHuman}, but need ${amount}.`,
            };
        }

        const hash = await walletClient.writeContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [recipientAddress, transferAmount],
            account: senderAddress,
            chain: {
                id: chain.chainId,
                name: chain.name,
                nativeCurrency: chain.nativeCurrency,
            },
        });

        await publicClient.waitForTransactionReceipt({ hash });

        return { success: true, signature: hash, transactionHash: hash };
    } catch (error) {
        if (error.code === 4001 || error.message?.includes('User rejected')) {
            return {
                success: false,
                error: 'USER_REJECTED',
                message: 'Transaction cancelled by user',
            };
        }

        return {
            success: false,
            error: 'PAYMENT_FAILED',
            message: error.shortMessage || error.message || 'Payment failed',
        };
    }
}

export async function payIglooEntryFee(iglooId, amount, ownerWallet, tokenAddress) {
    return sendErc20Token({
        recipientAddress: ownerWallet,
        tokenAddress,
        amount,
    });
}

export async function payIglooRent(iglooId, amount, rentWalletAddress, tokenAddress) {
    return sendErc20Token({
        recipientAddress: rentWalletAddress,
        tokenAddress,
        amount,
    });
}

/**
 * Send native ETH on Robinhood Chain (USD-pegged pebble deposits).
 */
export async function sendNativeEth(options) {
    const { recipientAddress, amountEth } = options;
    const wallet = MetaMaskWallet.getInstance();

    if (!wallet.connected || !wallet.address) {
        return {
            success: false,
            error: 'WALLET_NOT_CONNECTED',
            message: 'Please connect your MetaMask wallet first',
        };
    }

    if (!isAddress(recipientAddress)) {
        return {
            success: false,
            error: 'INVALID_ADDRESS',
            message: 'Invalid rake wallet address',
        };
    }

    try {
        const chain = await wallet.ensureRobinhoodChain();
        const provider = wallet.getMetaMaskProvider();
        if (!provider) {
            return {
                success: false,
                error: 'WALLET_NOT_CONNECTED',
                message: 'MetaMask provider not available',
            };
        }

        const chainConfig = {
            id: chain.chainId,
            name: chain.name,
            nativeCurrency: chain.nativeCurrency,
        };

        const publicClient = createPublicClient({
            chain: chainConfig,
            transport: http(chain.rpcUrl),
        });

        const walletClient = createWalletClient({
            chain: chainConfig,
            transport: custom(provider),
        });

        const value = parseEther(String(amountEth));
        const balance = await publicClient.getBalance({ address: wallet.address });
        if (balance < value) {
            return {
                success: false,
                error: 'INSUFFICIENT_BALANCE',
                message: `Insufficient ETH. Need ${amountEth} ETH.`,
            };
        }

        const hash = await walletClient.sendTransaction({
            account: wallet.address,
            to: recipientAddress,
            value,
            chain: chainConfig,
        });

        await publicClient.waitForTransactionReceipt({ hash });

        return { success: true, signature: hash, transactionHash: hash };
    } catch (error) {
        if (error.code === 4001 || error.message?.includes('User rejected')) {
            return {
                success: false,
                error: 'USER_REJECTED',
                message: 'Transaction cancelled by user',
            };
        }
        return {
            success: false,
            error: 'PAYMENT_FAILED',
            message: error.shortMessage || error.message || 'ETH transfer failed',
        };
    }
}

export async function getTokenBalance(walletAddress, tokenAddress, chainId) {
    try {
        const chain = getRobinhoodChainById(chainId ?? getActiveRobinhoodChain().chainId);
        const publicClient = createPublicClient({
            chain: {
                id: chain.chainId,
                name: chain.name,
                nativeCurrency: chain.nativeCurrency,
            },
            transport: http(chain.rpcUrl),
        });

        const decimals = await getTokenDecimals(publicClient, tokenAddress);
        const raw = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [walletAddress],
        });

        return { balance: parseFloat(formatUnits(raw, decimals)) };
    } catch (error) {
        return { balance: 0, error: error.message };
    }
}

export default {
    sendErc20Token,
    sendNativeEth,
    payIglooEntryFee,
    payIglooRent,
    getTokenBalance,
};
