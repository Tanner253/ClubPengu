/**
 * NFTMintService - Handles minting cosmetics as Solana NFTs via Metaplex
 * 
 * Features:
 * - Generates NFT metadata JSON
 * - Uploads images to decentralized storage (Arweave via Bundlr)
 * - Mints NFTs via Metaplex Token Metadata program
 * - Manages collection NFT
 * 
 * IMPORTANT: The minting is paid for by the user (they sign the transaction)
 * This service prepares the transaction, user signs with Phantom
 */

import { 
    Connection, 
    PublicKey, 
    Transaction,
    TransactionInstruction,
    SystemProgram,
    Keypair,
    SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createInitializeMintInstruction,
    createMintToInstruction,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint
} from '@solana/spl-token';
import OwnedCosmetic from '../db/models/OwnedCosmetic.js';

// Metaplex Token Metadata Program ID (constant, doesn't change)
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// ==================== METAPLEX INSTRUCTION BUILDERS ====================
// Built manually to avoid library version issues

/**
 * Serialize a string with length prefix (Borsh format)
 */
function serializeString(str) {
    const bytes = Buffer.from(str, 'utf8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(bytes.length);
    return Buffer.concat([len, bytes]);
}

/**
 * Create CreateMetadataAccountV3 instruction manually
 */
function createMetadataInstruction(
    metadataPDA,
    mintPubkey,
    mintAuthority,
    payer,
    updateAuthority,
    name,
    symbol,
    uri,
    sellerFeeBasisPoints,
    creators,
    collection,
    isMutable
) {
    // Instruction discriminator for CreateMetadataAccountV3 = 33
    const discriminator = Buffer.from([33]);
    
    // Serialize metadata
    const nameBytes = serializeString(name.slice(0, 32));
    const symbolBytes = serializeString(symbol.slice(0, 10));
    const uriBytes = serializeString(uri.slice(0, 200));
    
    // Seller fee basis points (u16)
    const sellerFeeBytes = Buffer.alloc(2);
    sellerFeeBytes.writeUInt16LE(sellerFeeBasisPoints);
    
    // Creators (Option<Vec<Creator>>)
    let creatorsBytes;
    if (creators && creators.length > 0) {
        const creatorBuffers = creators.map(c => {
            const addr = c.address.toBuffer();
            const verified = Buffer.from([c.verified ? 1 : 0]);
            const share = Buffer.from([c.share]);
            return Buffer.concat([addr, verified, share]);
        });
        const numCreators = Buffer.alloc(4);
        numCreators.writeUInt32LE(creators.length);
        creatorsBytes = Buffer.concat([Buffer.from([1]), numCreators, ...creatorBuffers]);
    } else {
        creatorsBytes = Buffer.from([0]); // None
    }
    
    // Collection (Option<Collection>) - None for now
    const collectionBytes = Buffer.from([0]);
    
    // Uses (Option<Uses>) - None
    const usesBytes = Buffer.from([0]);
    
    // isMutable (bool)
    const isMutableByte = Buffer.from([isMutable ? 1 : 0]);
    
    // collectionDetails (Option<CollectionDetails>) - None
    const collectionDetailsBytes = Buffer.from([0]);
    
    const data = Buffer.concat([
        discriminator,
        nameBytes,
        symbolBytes,
        uriBytes,
        sellerFeeBytes,
        creatorsBytes,
        collectionBytes,
        usesBytes,
        isMutableByte,
        collectionDetailsBytes
    ]);
    
    const keys = [
        { pubkey: metadataPDA, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: mintAuthority, isSigner: true, isWritable: false },
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: updateAuthority, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
    
    return new TransactionInstruction({
        keys,
        programId: TOKEN_METADATA_PROGRAM_ID,
        data
    });
}

/**
 * Create CreateMasterEditionV3 instruction manually
 */
function createMasterEditionInstruction(
    masterEditionPDA,
    mintPubkey,
    updateAuthority,
    mintAuthority,
    payer,
    metadataPDA,
    maxSupply // 0 for unique NFT, null for unlimited prints
) {
    // Instruction discriminator for CreateMasterEditionV3 = 17
    const discriminator = Buffer.from([17]);
    
    // maxSupply (Option<u64>)
    let maxSupplyBytes;
    if (maxSupply !== null && maxSupply !== undefined) {
        const supplyBuf = Buffer.alloc(8);
        supplyBuf.writeBigUInt64LE(BigInt(maxSupply));
        maxSupplyBytes = Buffer.concat([Buffer.from([1]), supplyBuf]);
    } else {
        maxSupplyBytes = Buffer.from([0]); // None = unlimited
    }
    
    const data = Buffer.concat([discriminator, maxSupplyBytes]);
    
    const keys = [
        { pubkey: masterEditionPDA, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: true },
        { pubkey: updateAuthority, isSigner: true, isWritable: false },
        { pubkey: mintAuthority, isSigner: true, isWritable: false },
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: metadataPDA, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
    
    return new TransactionInstruction({
        keys,
        programId: TOKEN_METADATA_PROGRAM_ID,
        data
    });
}

// ==================== CONFIGURATION ====================

const COLLECTION_NAME = 'WaddleBet Cosmetics';
const COLLECTION_SYMBOL = 'WADDLE';
const COLLECTION_DESCRIPTION = 'Official cosmetic items from WaddleBet - the social gaming metaverse on Solana';
const SELLER_FEE_BASIS_POINTS = 500; // 5% royalties on secondary sales
const EXTERNAL_URL = 'https://waddle.bet';

// Optional: Charge users a fee to mint (in addition to Solana rent/fees)
// This fee goes to your RAKE_WALLET
// Set to 0 to only charge network costs
const MINT_FEE_SOL = parseFloat(process.env.NFT_MINT_FEE_SOL || '0');
const MINT_FEE_PEBBLES = parseInt(process.env.NFT_MINT_FEE_PEBBLES || '0');

// Rarity descriptions
const RARITY_DESCRIPTIONS = {
    common: 'A common cosmetic item.',
    uncommon: 'An uncommon find!',
    rare: 'A rare and sought-after item.',
    epic: 'An epic item of great value!',
    legendary: 'A legendary item - highly coveted!',
    mythic: 'A mythic artifact of incredible rarity!',
    divine: 'A divine treasure - the rarest of all!'
};

class NFTMintService {
    constructor() {
        this.connection = null;
        this.initialized = false;
        this.collectionMint = null;
        this.metadataBaseUrl = null;
    }

    /**
     * Initialize the NFT minting service
     */
    async initialize() {
        if (this.initialized) return;

        try {
            const rpcUrl = process.env.SOLANA_RPC_URL;
            if (!rpcUrl) {
                throw new Error('SOLANA_RPC_URL not set');
            }

            this.connection = new Connection(rpcUrl, {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 60000
            });

            // Collection mint address (should be created once and stored in env)
            this.collectionMint = process.env.NFT_COLLECTION_MINT || null;
            
            // Base URL for metadata (your server or IPFS gateway)
            // IMPORTANT: This must be publicly accessible for marketplaces to fetch!
            this.metadataBaseUrl = process.env.NFT_METADATA_BASE_URL || 
                                   (process.env.NFT_PUBLIC_URL ? `${process.env.NFT_PUBLIC_URL}/api/nft/metadata` : null) ||
                                   (process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/api/nft/metadata` : null) ||
                                   'https://waddle.bet/api/nft/metadata';

            this.initialized = true;
            
            console.log('🎨 NFTMintService initialized');
            console.log(`   RPC: ${rpcUrl.slice(0, 40)}...`);
            console.log(`   Collection: ${this.collectionMint || 'Not set (create one!)'}`);
            console.log(`   Metadata URL: ${this.metadataBaseUrl}`);
            
        } catch (error) {
            console.error('❌ NFTMintService initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate NFT metadata JSON for a cosmetic
     * This follows the Metaplex Token Metadata Standard
     * 
     * @param {object} cosmeticData - Data from OwnedCosmetic.getForNftMetadata()
     * @param {string} imageUrl - URL to the rendered image
     * @returns {object} Metadata JSON
     */
    generateMetadata(cosmeticData, imageUrl) {
        const {
            name,
            description,
            category,
            rarity,
            quality,
            serialNumber,
            isHolographic,
            isFirstEdition,
            totalTrades,
            collection,
            isAnimated,
            hasGlow,
            hasFx,
            totalMinted,
            templateId,
            instanceId
        } = cosmeticData;

        // Build display name with serial number
        const displayName = `${name} #${serialNumber}`;
        
        // Build description
        let fullDescription = description || RARITY_DESCRIPTIONS[rarity] || '';
        fullDescription += `\n\nSerial #${serialNumber} of ${totalMinted || '???'} minted.`;
        if (isFirstEdition) {
            fullDescription += '\n\n🏆 FIRST EDITION - One of only 3 First Editions ever minted!';
        }
        if (isHolographic) {
            fullDescription += '\n\n✨ HOLOGRAPHIC - Features a special holographic effect!';
        }
        if (quality === 'flawless') {
            fullDescription += '\n\n💎 FLAWLESS QUALITY - Perfect condition!';
        } else if (quality === 'pristine') {
            fullDescription += '\n\n⭐ PRISTINE QUALITY - Excellent condition!';
        }

        // Rarity tier mapping for numeric comparison
        const RARITY_TIERS = {
            common: 1,
            uncommon: 2,
            rare: 3,
            epic: 4,
            legendary: 5,
            mythic: 6,
            divine: 7
        };
        
        // Quality multiplier mapping
        const QUALITY_MULTIPLIERS = {
            worn: 0.7,
            standard: 1.0,
            pristine: 1.8,
            flawless: 4.0
        };
        
        // Calculate combined rarity score (for sorting/filtering on marketplaces)
        const baseRarityScore = RARITY_TIERS[rarity] || 1;
        const qualityMultiplier = QUALITY_MULTIPLIERS[quality] || 1.0;
        let rarityScore = baseRarityScore * qualityMultiplier;
        if (isFirstEdition) rarityScore *= 2;
        if (isHolographic) rarityScore *= 1.5;
        
        // Build attributes array (Metaplex standard)
        const attributes = [
            { trait_type: 'Item', value: name },
            { trait_type: 'Category', value: category.charAt(0).toUpperCase() + category.slice(1) },
            { trait_type: 'Rarity', value: rarity.charAt(0).toUpperCase() + rarity.slice(1) },
            { trait_type: 'Rarity Tier', value: baseRarityScore, display_type: 'number' },
            { trait_type: 'Quality', value: quality.charAt(0).toUpperCase() + quality.slice(1) },
            { trait_type: 'Quality Multiplier', value: `${qualityMultiplier}x` },
            { trait_type: 'Serial Number', value: serialNumber, display_type: 'number' },
            { trait_type: 'Rarity Score', value: Math.round(rarityScore * 10) / 10, display_type: 'number' },
            { trait_type: 'Collection', value: collection || 'OG Collection' }
        ];
        
        // Add scarcity info
        if (totalMinted) {
            attributes.push({ trait_type: 'Total Minted', value: totalMinted, display_type: 'number' });
            // Calculate scarcity tier
            let scarcity = 'Common';
            if (totalMinted <= 10) scarcity = 'Ultra Rare';
            else if (totalMinted <= 50) scarcity = 'Very Rare';
            else if (totalMinted <= 100) scarcity = 'Rare';
            else if (totalMinted <= 500) scarcity = 'Uncommon';
            attributes.push({ trait_type: 'Scarcity', value: scarcity });
        }

        // Add special traits as boolean "Yes" values (more visible on marketplaces)
        if (isFirstEdition) {
            attributes.push({ trait_type: 'First Edition', value: 'Yes' });
            attributes.push({ trait_type: '🏆 Badge', value: 'First Edition' });
        }
        if (isHolographic) {
            attributes.push({ trait_type: 'Holographic', value: 'Yes' });
            attributes.push({ trait_type: '✨ Badge', value: 'Holographic' });
        }
        if (isAnimated) {
            attributes.push({ trait_type: 'Animated', value: 'Yes' });
        }
        if (hasGlow) {
            attributes.push({ trait_type: 'Glowing', value: 'Yes' });
        }
        if (hasFx) {
            attributes.push({ trait_type: 'Special Effects', value: 'Yes' });
        }
        if (totalTrades > 0) {
            attributes.push({ trait_type: 'Times Traded', value: totalTrades, display_type: 'number' });
        }
        
        // Add combined special status
        const specialBadges = [];
        if (isFirstEdition) specialBadges.push('1st Edition');
        if (isHolographic) specialBadges.push('Holo');
        if (quality === 'flawless') specialBadges.push('Flawless');
        if (quality === 'pristine') specialBadges.push('Pristine');
        if (specialBadges.length > 0) {
            attributes.push({ trait_type: 'Special Status', value: specialBadges.join(' + ') });
        }

        // Metaplex Token Metadata Standard
        return {
            name: displayName,
            symbol: COLLECTION_SYMBOL,
            description: fullDescription.trim(),
            seller_fee_basis_points: SELLER_FEE_BASIS_POINTS,
            image: imageUrl,
            external_url: `${EXTERNAL_URL}/cosmetic/${instanceId}`,
            attributes,
            properties: {
                files: [
                    {
                        uri: imageUrl,
                        type: 'image/png'
                    }
                ],
                category: 'image',
                creators: [
                    {
                        address: process.env.NFT_CREATOR_WALLET || process.env.RAKE_WALLET,
                        share: 100
                    }
                ]
            },
            // Custom properties for WaddleBet
            waddlebet: {
                templateId,
                instanceId,
                serialNumber,
                quality,
                isHolographic,
                isFirstEdition,
                mintedInGame: true
            }
        };
    }

    /**
     * Build the mint NFT transaction for user to sign
     * This creates a new token mint, metadata account, and master edition
     * 
     * @param {string} ownerWallet - The wallet that will own the NFT
     * @param {object} cosmeticData - Cosmetic data
     * @param {string} metadataUri - URI to the metadata JSON
     * @returns {object} { transaction, mintKeypair }
     */
    async buildMintTransaction(ownerWallet, cosmeticData, metadataUri) {
        if (!this.initialized) {
            await this.initialize();
        }

        const ownerPubkey = new PublicKey(ownerWallet);
        
        // Generate a new mint keypair (the NFT's mint address)
        const mintKeypair = Keypair.generate();
        const mintPubkey = mintKeypair.publicKey;

        // Get the ATA for the owner
        const associatedTokenAddress = await getAssociatedTokenAddress(
            mintPubkey,
            ownerPubkey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Derive metadata PDA
        const [metadataPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mintPubkey.toBuffer()
            ],
            TOKEN_METADATA_PROGRAM_ID
        );

        // Derive master edition PDA
        const [masterEditionPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('metadata'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mintPubkey.toBuffer(),
                Buffer.from('edition')
            ],
            TOKEN_METADATA_PROGRAM_ID
        );

        // Build NFT name
        const nftName = `${cosmeticData.name} #${cosmeticData.serialNumber}`;

        // Get rent exemption for mint
        const lamports = await getMinimumBalanceForRentExemptMint(this.connection);

        // Build transaction
        const transaction = new Transaction();

        // 1. Create mint account
        transaction.add(
            SystemProgram.createAccount({
                fromPubkey: ownerPubkey,
                newAccountPubkey: mintPubkey,
                space: MINT_SIZE,
                lamports,
                programId: TOKEN_PROGRAM_ID
            })
        );

        // 2. Initialize mint (0 decimals for NFT)
        transaction.add(
            createInitializeMintInstruction(
                mintPubkey,
                0, // 0 decimals = NFT
                ownerPubkey, // mint authority
                ownerPubkey, // freeze authority
                TOKEN_PROGRAM_ID
            )
        );

        // 3. Create ATA for owner
        transaction.add(
            createAssociatedTokenAccountInstruction(
                ownerPubkey, // payer
                associatedTokenAddress, // ATA address
                ownerPubkey, // owner
                mintPubkey, // mint
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )
        );

        // 4. Mint 1 token to ATA
        transaction.add(
            createMintToInstruction(
                mintPubkey,
                associatedTokenAddress,
                ownerPubkey, // mint authority
                1, // amount = 1 for NFT
                [],
                TOKEN_PROGRAM_ID
            )
        );

        // 5. Create metadata account
        // IMPORTANT: Creator address receives royalties on secondary sales
        const creatorWallet = process.env.NFT_CREATOR_WALLET || process.env.RAKE_WALLET;
        const creatorPubkey = creatorWallet ? new PublicKey(creatorWallet) : ownerPubkey;
        
        const creators = [
            {
                address: creatorPubkey, // RAKE_WALLET receives 5% royalties
                verified: false, // Cannot verify server-side without signing
                share: 100
            }
        ];

        transaction.add(
            createMetadataInstruction(
                metadataPDA,
                mintPubkey,
                ownerPubkey, // mint authority
                ownerPubkey, // payer
                ownerPubkey, // update authority
                nftName.slice(0, 32),
                COLLECTION_SYMBOL.slice(0, 10),
                metadataUri,
                SELLER_FEE_BASIS_POINTS,
                creators,
                null, // collection
                true  // isMutable
            )
        );

        // 6. Create master edition (makes it an NFT with supply of 1)
        transaction.add(
            createMasterEditionInstruction(
                masterEditionPDA,
                mintPubkey,
                ownerPubkey, // update authority
                ownerPubkey, // mint authority
                ownerPubkey, // payer
                metadataPDA,
                0 // maxSupply = 0 means unique 1/1 NFT
            )
        );

        // 7. Add WaddleBet mint fee transfer (if configured)
        const rakeWallet = process.env.RAKE_WALLET;
        if (MINT_FEE_SOL > 0 && rakeWallet) {
            const feeLamports = Math.floor(MINT_FEE_SOL * 1e9);
            const rakeWalletPubkey = new PublicKey(rakeWallet);
            
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: ownerPubkey,
                    toPubkey: rakeWalletPubkey,
                    lamports: feeLamports
                })
            );
            
            console.log(`💰 Mint fee: ${MINT_FEE_SOL} SOL → ${rakeWallet.slice(0, 8)}...`);
        }

        // Set recent blockhash
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        // Partially sign with mint keypair (user will sign with their wallet)
        transaction.partialSign(mintKeypair);

        return {
            transaction,
            mintKeypair,
            mintAddress: mintPubkey.toBase58(),
            metadataPDA: metadataPDA.toBase58(),
            masterEditionPDA: masterEditionPDA.toBase58(),
            blockhash,
            lastValidBlockHeight
        };
    }

    /**
     * Verify and confirm a minted NFT transaction
     * Call this after user signs and broadcasts the transaction
     * 
     * @param {string} instanceId - Cosmetic instance ID
     * @param {string} mintAddress - NFT mint address
     * @param {string} txSignature - Transaction signature
     * @param {string} metadataUri - Metadata URI used
     * @param {string} minterWallet - Who paid for the mint
     */
    async confirmMint(instanceId, mintAddress, txSignature, metadataUri, minterWallet) {
        console.log(`🔍 Confirming NFT mint transaction: ${txSignature}`);
        
        // Wait for transaction confirmation with retries
        let confirmed = false;
        let lastError = null;
        
        for (let i = 0; i < 10; i++) {
            try {
                const status = await this.connection.getSignatureStatus(txSignature);
                console.log(`   Attempt ${i + 1}: status =`, status?.value?.confirmationStatus || 'pending');
                
                if (status?.value?.err) {
                    console.error(`   Transaction failed:`, status.value.err);
                    return { success: false, error: 'TRANSACTION_FAILED', details: status.value.err };
                }
                
                if (status?.value?.confirmationStatus && 
                    ['confirmed', 'finalized'].includes(status.value.confirmationStatus)) {
                    confirmed = true;
                    console.log(`   ✅ Transaction confirmed!`);
                    break;
                }
                
                // Wait 2 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
                console.warn(`   Attempt ${i + 1} error:`, err.message);
                lastError = err;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        if (!confirmed) {
            console.error(`   ❌ Transaction not confirmed after 10 attempts`);
            return { 
                success: false, 
                error: 'TRANSACTION_NOT_CONFIRMED',
                message: lastError?.message || 'Transaction confirmation timed out'
            };
        }

        // Update the cosmetic record
        const updated = await OwnedCosmetic.markAsNftMinted(instanceId, {
            mintAddress,
            metadataUri,
            txSignature,
            mintedBy: minterWallet
        });

        if (!updated) {
            return { success: false, error: 'DATABASE_UPDATE_FAILED' };
        }

        console.log(`✅ NFT mint confirmed: ${mintAddress}`);
        console.log(`   Instance: ${instanceId}`);
        console.log(`   Tx: ${txSignature}`);

        return {
            success: true,
            mintAddress,
            txSignature,
            explorerUrl: `https://solscan.io/token/${mintAddress}`
        };
    }

    /**
     * Get estimated cost to mint an NFT
     * Includes rent for mint account + metadata + master edition + optional WaddleBet fee
     */
    async getEstimatedMintCost() {
        if (!this.initialized) {
            await this.initialize();
        }

        const mintRent = await getMinimumBalanceForRentExemptMint(this.connection);
        
        // Approximate costs (metadata + master edition accounts)
        // These are rough estimates - actual costs depend on account sizes
        const metadataRent = 5616720; // ~0.0056 SOL
        const masterEditionRent = 2853600; // ~0.0029 SOL
        const transactionFee = 5000; // ~0.000005 SOL
        
        // WaddleBet's optional mint fee (goes to rake wallet)
        const waddlebetFeeLamports = Math.floor(MINT_FEE_SOL * 1e9);
        
        const networkCostLamports = mintRent + metadataRent + masterEditionRent + transactionFee;
        const totalLamports = networkCostLamports + waddlebetFeeLamports;
        const totalSol = totalLamports / 1e9;
        
        return {
            lamports: totalLamports,
            sol: totalSol,
            breakdown: {
                mintAccountRent: mintRent,
                metadataAccountRent: metadataRent,
                masterEditionRent: masterEditionRent,
                transactionFee: transactionFee,
                waddlebetFee: waddlebetFeeLamports
            },
            // Fees breakdown for UI
            networkCost: networkCostLamports / 1e9,
            waddlebetFee: MINT_FEE_SOL,
            pebbleFee: MINT_FEE_PEBBLES
        };
    }
    
    /**
     * Get the mint fee configuration
     */
    getMintFees() {
        return {
            solFee: MINT_FEE_SOL,
            pebblesFee: MINT_FEE_PEBBLES,
            royaltyPercent: SELLER_FEE_BASIS_POINTS / 100
        };
    }

    /**
     * Check if a cosmetic can be minted as NFT
     */
    async canMint(instanceId, walletAddress) {
        const cosmetic = await OwnedCosmetic.getForNftMetadata(instanceId);
        
        if (!cosmetic) {
            return { canMint: false, error: 'COSMETIC_NOT_FOUND' };
        }

        if (cosmetic.ownerId !== walletAddress) {
            return { canMint: false, error: 'NOT_OWNER' };
        }

        if (cosmetic.isNftMinted) {
            return { 
                canMint: false, 
                error: 'ALREADY_MINTED',
                mintAddress: cosmetic.nftMintAddress
            };
        }

        // Non-tradable items (promo) cannot be minted
        // (This would need to be checked from the full OwnedCosmetic doc)
        
        return { canMint: true, cosmetic };
    }
}

// Singleton instance
const nftMintService = new NFTMintService();

export default nftMintService;
export { COLLECTION_NAME, COLLECTION_SYMBOL, SELLER_FEE_BASIS_POINTS, MINT_FEE_SOL, MINT_FEE_PEBBLES };

