/**
 * Robinhood Chain (EVM) configuration for MetaMask authentication
 * @see https://docs.robinhood.com/chain/add-network-to-wallet/
 */

export const ROBINHOOD_CHAIN_MAINNET = {
    chainId: 4663,
    chainIdHex: '0x1237',
    name: 'Robinhood Chain',
    rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
    blockExplorer: 'https://robinhoodchain.blockscout.com',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
};

export const ROBINHOOD_CHAIN_TESTNET = {
    chainId: 46630,
    chainIdHex: '0xb626',
    name: 'Robinhood Chain Testnet',
    rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
    blockExplorer: 'https://explorer.testnet.chain.robinhood.com',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
};

/** Solana accounts use this chainId in the database */
export const SOLANA_CHAIN_ID = 'solana';

/** Resolve active Robinhood network — mainnet by default; opt into testnet via VITE_EVM_CHAIN_ID=testnet */
export function getActiveRobinhoodChain() {
    const override = import.meta.env.VITE_EVM_CHAIN_ID;
    if (override === '46630' || override === 'testnet') {
        return ROBINHOOD_CHAIN_TESTNET;
    }
    return ROBINHOOD_CHAIN_MAINNET;
}

export function getActiveEvmChainIdString() {
    return String(getActiveRobinhoodChain().chainId);
}
