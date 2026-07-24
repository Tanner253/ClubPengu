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

/** $WADDLE ERC-20 contract on Robinhood Chain (Ethereum EVM). */
export const WADDLE_ETH_CONTRACT =
    import.meta.env.VITE_WADDLE_TOKEN_ADDRESS || '0xcf83b446d4cf400b132538d7bb03e36bdbd3c8b8';

/** @deprecated Use WADDLE_ETH_CONTRACT */
export const CP_ETH_CONTRACT = WADDLE_ETH_CONTRACT;

export function getWaddleEthBlockExplorerUrl(contract = WADDLE_ETH_CONTRACT) {
    return `${getActiveRobinhoodChain().blockExplorer}/token/${contract}`;
}

/** @deprecated Use getWaddleEthBlockExplorerUrl */
export function getCpEthBlockExplorerUrl(contract = WADDLE_ETH_CONTRACT) {
    return getWaddleEthBlockExplorerUrl(contract);
}

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

/** Resolve Robinhood network config from a chain id (4663 mainnet, 46630 testnet). */
export function getRobinhoodChainById(chainId) {
    const id = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;
    if (id === 46630) return ROBINHOOD_CHAIN_TESTNET;
    return ROBINHOOD_CHAIN_MAINNET;
}

/** Block explorer URL for an EVM transaction hash. */
export function getEvmTxExplorerUrl(txHash, chainId) {
    if (!txHash) return null;
    const chain = getRobinhoodChainById(chainId ?? getActiveRobinhoodChain().chainId);
    return `${chain.blockExplorer}/tx/${txHash}`;
}
