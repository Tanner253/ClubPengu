/**
 * MetaMaskWallet - Robinhood Chain authentication via MetaMask (SIWE / personal_sign)
 */

import { getActiveRobinhoodChain } from '../config/evm.js';

class MetaMaskWallet {
    static instance = null;

    constructor() {
        if (MetaMaskWallet.instance) {
            return MetaMaskWallet.instance;
        }

        this.connected = false;
        this.address = null;
        this.chainId = null;
        MetaMaskWallet.instance = this;
    }

    static getInstance() {
        if (!MetaMaskWallet.instance) {
            MetaMaskWallet.instance = new MetaMaskWallet();
        }
        return MetaMaskWallet.instance;
    }

    getProvider() {
        if (typeof window === 'undefined' || !window.ethereum) {
            return null;
        }
        return window.ethereum;
    }

    isMetaMaskInstalled() {
        const provider = this.getProvider();
        return !!(provider && (provider.isMetaMask || provider.providers?.some((p) => p.isMetaMask)));
    }

    /** Prefer MetaMask when multiple wallets inject ethereum */
    getMetaMaskProvider() {
        const provider = this.getProvider();
        if (!provider) return null;
        if (provider.providers?.length) {
            return provider.providers.find((p) => p.isMetaMask) || provider;
        }
        return provider;
    }

    async ensureRobinhoodChain() {
        const chain = getActiveRobinhoodChain();
        const mm = this.getMetaMaskProvider();
        if (!mm) {
            throw new Error('MetaMask not available');
        }

        try {
            await mm.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chain.chainIdHex }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await mm.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: chain.chainIdHex,
                        chainName: chain.name,
                        nativeCurrency: chain.nativeCurrency,
                        rpcUrls: [chain.rpcUrl],
                        blockExplorerUrls: [chain.blockExplorer],
                    }],
                });
            } else {
                throw switchError;
            }
        }

        this.chainId = chain.chainId;
        return chain;
    }

    /**
     * Connect MetaMask on Robinhood Chain
     * @returns {Promise<{ success: boolean, publicKey?: string, chainId?: number, error?: string, message?: string }>}
     */
    async connect() {
        if (!this.isMetaMaskInstalled()) {
            return {
                success: false,
                error: 'METAMASK_NOT_INSTALLED',
                message: 'MetaMask extension is not installed',
                installUrl: 'https://metamask.io/download/',
            };
        }

        const mm = this.getMetaMaskProvider();

        try {
            const chain = await this.ensureRobinhoodChain();
            const accounts = await mm.request({ method: 'eth_requestAccounts' });

            if (!accounts?.length) {
                return {
                    success: false,
                    error: 'NO_ACCOUNTS',
                    message: 'No MetaMask accounts available',
                };
            }

            this.address = accounts[0];
            this.connected = true;
            this.chainId = chain.chainId;

            console.log(`🔐 MetaMask connected on ${chain.name}: ${this.address.slice(0, 8)}...`);

            return {
                success: true,
                publicKey: this.address,
                chainId: chain.chainId,
            };
        } catch (error) {
            console.error('MetaMask connect error:', error);

            if (error.code === 4001) {
                return {
                    success: false,
                    error: 'USER_REJECTED',
                    message: 'Connection rejected by user',
                };
            }

            return {
                success: false,
                error: error.code || 'CONNECTION_FAILED',
                message: error.message || 'Failed to connect MetaMask',
            };
        }
    }

    async disconnect() {
        this.connected = false;
        this.address = null;
        this.chainId = null;
    }

    /**
     * Sign a SIWE message (EIP-191 personal_sign)
     * @param {string} message - Prepared SIWE message from server
     */
    async signMessage(message) {
        const mm = this.getMetaMaskProvider();

        if (!mm || !this.connected || !this.address) {
            return {
                success: false,
                error: 'NOT_CONNECTED',
                message: 'MetaMask not connected',
            };
        }

        try {
            const signature = await mm.request({
                method: 'personal_sign',
                params: [message, this.address],
            });

            return {
                success: true,
                signature,
            };
        } catch (error) {
            console.error('MetaMask sign message error:', error);

            if (error.code === 4001) {
                return {
                    success: false,
                    error: 'USER_REJECTED',
                    message: 'User rejected the signature request',
                };
            }

            return {
                success: false,
                error: error.code || 'SIGN_FAILED',
                message: error.message || 'Failed to sign message',
            };
        }
    }
}

export default MetaMaskWallet;
