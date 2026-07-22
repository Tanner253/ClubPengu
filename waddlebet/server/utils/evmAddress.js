import { getAddress, isAddress } from 'viem';

/** Normalize to EIP-55 checksummed address (required by SIWE). */
export function toChecksumAddress(address) {
    if (!address || !isAddress(address)) {
        throw new Error('INVALID_EVM_ADDRESS');
    }
    return getAddress(address);
}
