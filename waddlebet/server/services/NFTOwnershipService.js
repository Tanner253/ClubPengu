/**
 * NFTOwnershipService - Syncs on-chain NFT ownership with in-game cosmetics
 * 
 * When a cosmetic is minted as an NFT:
 * - The in-game item ownership should follow the NFT ownership
 * - If someone sells their NFT on Magic Eden/Tensor, the buyer gets the cosmetic
 * - The seller loses access to the cosmetic in-game
 * 
 * Sync happens:
 * - On user login/authentication
 * - Before equipping an NFT-minted cosmetic
 * - Via periodic background job (optional)
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import OwnedCosmetic from '../db/models/OwnedCosmetic.js';

// Cache verified ownership to avoid hammering RPC
const ownershipCache = new Map(); // mintAddress -> { owner, timestamp }
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

class NFTOwnershipService {
    constructor() {
        this.connection = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        const rpcUrl = process.env.SOLANA_RPC_URL;
        if (!rpcUrl) {
            console.warn('⚠️ NFTOwnershipService: No RPC URL configured');
            return;
        }

        this.connection = new Connection(rpcUrl, {
            commitment: 'confirmed'
        });

        this.initialized = true;
        console.log('🔗 NFTOwnershipService initialized');
    }

    /**
     * Get the current on-chain owner of an NFT
     * @param {string} mintAddress - The NFT mint address
     * @returns {string|null} - Owner wallet address or null if error
     */
    async getNftOwner(mintAddress) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.connection) {
            console.warn('NFTOwnershipService: Cannot verify - no connection');
            return null;
        }

        // Check cache first
        const cached = ownershipCache.get(mintAddress);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.owner;
        }

        try {
            const mintPubkey = new PublicKey(mintAddress);
            
            // Get the largest token account for this mint (NFTs have supply of 1)
            const largestAccounts = await this.connection.getTokenLargestAccounts(mintPubkey);
            
            if (!largestAccounts.value || largestAccounts.value.length === 0) {
                console.warn(`NFT ${mintAddress}: No token accounts found`);
                return null;
            }

            // The account with amount > 0 is the owner
            const holderAccount = largestAccounts.value.find(acc => acc.amount !== '0');
            
            if (!holderAccount) {
                console.warn(`NFT ${mintAddress}: No holder found (burned?)`);
                return null;
            }

            // Get the token account info to find the owner
            const accountInfo = await getAccount(this.connection, holderAccount.address);
            const owner = accountInfo.owner.toBase58();

            // Cache the result
            ownershipCache.set(mintAddress, { owner, timestamp: Date.now() });

            return owner;

        } catch (error) {
            console.error(`Error getting NFT owner for ${mintAddress}:`, error.message);
            return null;
        }
    }

    /**
     * Verify if a wallet owns a specific NFT
     * @param {string} walletAddress - Wallet to check
     * @param {string} mintAddress - NFT mint address
     * @returns {boolean}
     */
    async verifyOwnership(walletAddress, mintAddress) {
        const owner = await this.getNftOwner(mintAddress);
        return owner === walletAddress;
    }

    /**
     * Sync NFT ownership for a single cosmetic
     * Updates the database if ownership has changed
     * 
     * @param {string} instanceId - Cosmetic instance ID
     * @returns {object} { changed, newOwner, previousOwner }
     */
    async syncCosmeticOwnership(instanceId) {
        const cosmetic = await OwnedCosmetic.findOne({ instanceId }).lean();
        
        if (!cosmetic) {
            return { changed: false, error: 'NOT_FOUND' };
        }

        if (!cosmetic.nftMintAddress) {
            return { changed: false, error: 'NOT_NFT' };
        }

        const currentDbOwner = cosmetic.ownerId;
        const onChainOwner = await this.getNftOwner(cosmetic.nftMintAddress);

        if (!onChainOwner) {
            // Couldn't verify - don't change anything
            return { changed: false, error: 'VERIFICATION_FAILED' };
        }

        if (onChainOwner === currentDbOwner) {
            // Ownership unchanged
            return { changed: false, currentOwner: currentDbOwner };
        }

        // Ownership has changed! Transfer in database
        console.log(`🔄 NFT ownership changed for ${cosmetic.name} #${cosmetic.serialNumber}`);
        console.log(`   From: ${currentDbOwner.slice(0, 8)}...`);
        console.log(`   To: ${onChainOwner.slice(0, 8)}...`);

        const updated = await OwnedCosmetic.transferOwnershipByNft(
            instanceId,
            onChainOwner,
            'nft_sale', // acquisition method
            null // no price recorded (happened off-platform)
        );

        if (updated) {
            return {
                changed: true,
                previousOwner: currentDbOwner,
                newOwner: onChainOwner,
                cosmetic: {
                    instanceId,
                    templateId: cosmetic.templateId,
                    name: cosmetic.name,
                    serialNumber: cosmetic.serialNumber
                }
            };
        }

        return { changed: false, error: 'TRANSFER_FAILED' };
    }

    /**
     * Sync all NFT-minted cosmetics for a specific user
     * Call this on user login to ensure their inventory is correct
     * 
     * @param {string} walletAddress - User's wallet address
     * @returns {object} { gained: [], lost: [], errors: [] }
     */
    async syncUserNftOwnership(walletAddress) {
        const results = {
            gained: [],  // Cosmetics the user now owns (bought NFT externally)
            lost: [],    // Cosmetics the user no longer owns (sold NFT externally)
            unchanged: 0,
            errors: []
        };

        // Find all NFT-minted cosmetics currently owned by this user in DB
        const userNftCosmetics = await OwnedCosmetic.find({
            ownerId: walletAddress,
            nftMintAddress: { $ne: null }
        }).lean();

        // Also find NFT cosmetics where they MIGHT be the new owner
        // (NFTs they bought externally that we haven't synced yet)
        const allNftCosmetics = await OwnedCosmetic.find({
            nftMintAddress: { $ne: null }
        }).select('instanceId nftMintAddress ownerId templateId name serialNumber').lean();

        // Check each NFT cosmetic the user currently "owns" in DB
        for (const cosmetic of userNftCosmetics) {
            try {
                const onChainOwner = await this.getNftOwner(cosmetic.nftMintAddress);
                
                if (!onChainOwner) {
                    results.errors.push({
                        instanceId: cosmetic.instanceId,
                        error: 'VERIFICATION_FAILED'
                    });
                    continue;
                }

                if (onChainOwner !== walletAddress) {
                    // User sold this NFT - transfer to new owner
                    const transferred = await OwnedCosmetic.transferOwnershipByNft(
                        cosmetic.instanceId,
                        onChainOwner,
                        'nft_sale',
                        null
                    );

                    if (transferred) {
                        results.lost.push({
                            instanceId: cosmetic.instanceId,
                            templateId: cosmetic.templateId,
                            name: cosmetic.name,
                            serialNumber: cosmetic.serialNumber,
                            newOwner: onChainOwner
                        });
                        console.log(`📤 ${walletAddress.slice(0,8)}... lost ${cosmetic.name} #${cosmetic.serialNumber} (sold NFT)`);
                    }
                } else {
                    results.unchanged++;
                }
            } catch (err) {
                results.errors.push({
                    instanceId: cosmetic.instanceId,
                    error: err.message
                });
            }
        }

        // Check for NFTs the user might have bought externally
        // (Cosmetics not currently owned by them in DB, but they own the NFT)
        const userCurrentIds = new Set(userNftCosmetics.map(c => c.instanceId));
        
        for (const cosmetic of allNftCosmetics) {
            // Skip if user already owns this in DB
            if (userCurrentIds.has(cosmetic.instanceId)) continue;
            
            try {
                const onChainOwner = await this.getNftOwner(cosmetic.nftMintAddress);
                
                if (onChainOwner === walletAddress) {
                    // User bought this NFT externally! Transfer ownership to them
                    const transferred = await OwnedCosmetic.transferOwnershipByNft(
                        cosmetic.instanceId,
                        walletAddress,
                        'nft_purchase',
                        null
                    );

                    if (transferred) {
                        results.gained.push({
                            instanceId: cosmetic.instanceId,
                            templateId: cosmetic.templateId,
                            name: cosmetic.name,
                            serialNumber: cosmetic.serialNumber,
                            previousOwner: cosmetic.ownerId
                        });
                        console.log(`📥 ${walletAddress.slice(0,8)}... gained ${cosmetic.name} #${cosmetic.serialNumber} (bought NFT)`);
                    }
                }
            } catch (err) {
                // Silently continue - we're scanning all NFTs
            }
        }

        return results;
    }

    /**
     * Check if user can equip an NFT-minted cosmetic
     * Verifies on-chain ownership before allowing equip
     * 
     * @param {string} walletAddress - User's wallet
     * @param {string} instanceId - Cosmetic instance ID
     * @returns {object} { canEquip, reason }
     */
    async canEquipNftCosmetic(walletAddress, instanceId) {
        const cosmetic = await OwnedCosmetic.findOne({ instanceId }).lean();
        
        if (!cosmetic) {
            return { canEquip: false, reason: 'NOT_FOUND' };
        }

        // If not an NFT, use normal ownership check
        if (!cosmetic.nftMintAddress) {
            return { 
                canEquip: cosmetic.ownerId === walletAddress, 
                reason: cosmetic.ownerId === walletAddress ? 'OK' : 'NOT_OWNER'
            };
        }

        // For NFT cosmetics, verify on-chain ownership
        const isOwner = await this.verifyOwnership(walletAddress, cosmetic.nftMintAddress);
        
        if (!isOwner) {
            // Ownership changed - sync it
            await this.syncCosmeticOwnership(instanceId);
            return { canEquip: false, reason: 'NFT_SOLD' };
        }

        // Make sure DB is in sync
        if (cosmetic.ownerId !== walletAddress) {
            await OwnedCosmetic.transferOwnershipByNft(instanceId, walletAddress, 'nft_sync', null);
        }

        return { canEquip: true, reason: 'OK' };
    }

    /**
     * Run a background sync for all NFT cosmetics
     * Can be called periodically to keep database in sync
     * 
     * @param {number} batchSize - How many to process at once
     * @param {number} delayMs - Delay between batches to avoid rate limits
     */
    async runBackgroundSync(batchSize = 50, delayMs = 1000) {
        console.log('🔄 Starting NFT ownership background sync...');
        
        const allNftCosmetics = await OwnedCosmetic.find({
            nftMintAddress: { $ne: null }
        }).select('instanceId').lean();

        let synced = 0;
        let changed = 0;
        let errors = 0;

        for (let i = 0; i < allNftCosmetics.length; i += batchSize) {
            const batch = allNftCosmetics.slice(i, i + batchSize);
            
            for (const cosmetic of batch) {
                try {
                    const result = await this.syncCosmeticOwnership(cosmetic.instanceId);
                    synced++;
                    if (result.changed) changed++;
                } catch (err) {
                    errors++;
                }
            }

            // Rate limit protection
            if (i + batchSize < allNftCosmetics.length) {
                await new Promise(r => setTimeout(r, delayMs));
            }
        }

        console.log(`✅ NFT sync complete: ${synced} checked, ${changed} ownership changes, ${errors} errors`);
        
        return { synced, changed, errors };
    }

    /**
     * Clear the ownership cache (useful for testing or forcing fresh checks)
     */
    clearCache() {
        ownershipCache.clear();
    }
}

// Singleton instance
const nftOwnershipService = new NFTOwnershipService();

export default nftOwnershipService;

