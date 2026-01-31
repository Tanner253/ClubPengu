/**
 * NFT Handlers - WebSocket and HTTP handlers for NFT operations
 * 
 * Handles:
 * - Rendering cosmetic images for NFTs
 * - Generating metadata JSON
 * - Building mint transactions
 * - Confirming mints
 */

import OwnedCosmetic from '../db/models/OwnedCosmetic.js';
import User from '../db/models/User.js';
import nftRenderService from '../services/NFTRenderService.js';
import nftMintService, { MINT_FEE_PEBBLES } from '../services/NFTMintService.js';

// Track initialized state
let servicesInitialized = false;

/**
 * Initialize NFT services (call once at server startup)
 */
export async function initializeNFTServices(baseUrl) {
    if (servicesInitialized) return;
    
    try {
        await nftRenderService.initialize(baseUrl);
        await nftMintService.initialize();
        servicesInitialized = true;
        console.log('🎨 NFT services initialized');
    } catch (error) {
        console.error('⚠️ NFT services initialization failed:', error.message);
        console.log('   NFT minting will be unavailable');
    }
}

/**
 * Check if NFT services are ready
 */
export function isNFTEnabled() {
    return servicesInitialized;
}

/**
 * Handle NFT-related WebSocket messages
 * Returns true if message was handled, false otherwise
 */
export async function handleNFTMessage(playerId, player, message, sendToPlayer) {
    // Only handle nft_ messages
    if (!message.type?.startsWith('nft_')) {
        return false;
    }

    // Check if cosmetic can be minted
    if (message.type === 'nft_check_mintable') {
        const { instanceId } = message;
        
        if (!player.walletAddress) {
            sendToPlayer(playerId, {
                type: 'nft_check_mintable_response',
                success: false,
                error: 'NOT_AUTHENTICATED',
                message: 'You must be logged in to mint NFTs'
            });
            return true;
        }

        try {
            const result = await nftMintService.canMint(instanceId, player.walletAddress);
            const estimatedCost = await nftMintService.getEstimatedMintCost();
            
            sendToPlayer(playerId, {
                type: 'nft_check_mintable_response',
                instanceId,
                ...result,
                estimatedCost
            });
        } catch (error) {
            console.error('nft_check_mintable error:', error);
            sendToPlayer(playerId, {
                type: 'nft_check_mintable_response',
                success: false,
                error: 'CHECK_FAILED',
                message: error.message
            });
        }
        return true;
    }

    // Build mint transaction
    if (message.type === 'nft_build_mint_tx') {
        const { instanceId } = message;
        
        if (!player.walletAddress) {
            sendToPlayer(playerId, {
                type: 'nft_build_mint_tx_response',
                success: false,
                error: 'NOT_AUTHENTICATED'
            });
            return true;
        }

        try {
            // Verify ownership and mintability
            const canMintResult = await nftMintService.canMint(instanceId, player.walletAddress);
            if (!canMintResult.canMint) {
                sendToPlayer(playerId, {
                    type: 'nft_build_mint_tx_response',
                    success: false,
                    ...canMintResult
                });
                return true;
            }

            const cosmeticData = canMintResult.cosmetic;

            // Check and deduct Pebbles fee if configured
            if (MINT_FEE_PEBBLES > 0) {
                const user = await User.findOne({ walletAddress: player.walletAddress });
                if (!user || (user.pebbles || 0) < MINT_FEE_PEBBLES) {
                    sendToPlayer(playerId, {
                        type: 'nft_build_mint_tx_response',
                        success: false,
                        error: 'INSUFFICIENT_PEBBLES',
                        message: `Minting requires ${MINT_FEE_PEBBLES} Pebbles. You have ${user?.pebbles || 0}.`,
                        required: MINT_FEE_PEBBLES,
                        current: user?.pebbles || 0
                    });
                    return true;
                }
                
                // Deduct Pebbles
                user.pebbles -= MINT_FEE_PEBBLES;
                await user.save();
                
                console.log(`🪨 Deducted ${MINT_FEE_PEBBLES} Pebbles from ${player.walletAddress.slice(0, 8)}... for NFT mint`);
                
                // Store deduction info for potential refund if mint fails
                player._pendingMintPebblesFee = {
                    instanceId,
                    amount: MINT_FEE_PEBBLES,
                    deductedAt: new Date()
                };
            }

            // Generate metadata URI (points to our API endpoint)
            const metadataUri = `${nftMintService.metadataBaseUrl}/${instanceId}`;

            // Build the transaction
            const txData = await nftMintService.buildMintTransaction(
                player.walletAddress,
                cosmeticData,
                metadataUri
            );

            // Serialize transaction for client
            const serializedTx = txData.transaction.serialize({
                requireAllSignatures: false,
                verifySignatures: false
            }).toString('base64');

            // Get updated user balance for response
            const updatedUser = await User.findOne({ walletAddress: player.walletAddress }, 'pebbles');
            
            sendToPlayer(playerId, {
                type: 'nft_build_mint_tx_response',
                success: true,
                instanceId,
                transaction: serializedTx,
                mintAddress: txData.mintAddress,
                metadataUri,
                estimatedCost: await nftMintService.getEstimatedMintCost(),
                pebblesFeeCharged: MINT_FEE_PEBBLES > 0 ? MINT_FEE_PEBBLES : 0,
                newPebbleBalance: updatedUser?.pebbles || 0
            });

            console.log(`🎨 Built mint transaction for ${cosmeticData.name} #${cosmeticData.serialNumber}`);
            console.log(`   Mint address: ${txData.mintAddress}`);
            console.log(`   For: ${player.walletAddress.slice(0, 8)}...`);
            if (MINT_FEE_PEBBLES > 0) {
                console.log(`   Pebbles fee: ${MINT_FEE_PEBBLES} 🪨`);
            }

        } catch (error) {
            console.error('nft_build_mint_tx error:', error);
            
            // Refund Pebbles if we charged them
            if (player._pendingMintPebblesFee?.instanceId === instanceId) {
                try {
                    await User.updateOne(
                        { walletAddress: player.walletAddress },
                        { $inc: { pebbles: player._pendingMintPebblesFee.amount } }
                    );
                    console.log(`🪨 Refunded ${player._pendingMintPebblesFee.amount} Pebbles due to build error`);
                    delete player._pendingMintPebblesFee;
                } catch (refundErr) {
                    console.error('Failed to refund Pebbles:', refundErr);
                }
            }
            
            sendToPlayer(playerId, {
                type: 'nft_build_mint_tx_response',
                success: false,
                error: 'BUILD_FAILED',
                message: error.message
            });
        }
        return true;
    }

    // Confirm mint after user signs
    if (message.type === 'nft_confirm_mint') {
        const { instanceId, mintAddress, txSignature } = message;
        
        console.log(`🎨 Received nft_confirm_mint from ${player.name}`);
        console.log(`   Instance: ${instanceId}`);
        console.log(`   Mint: ${mintAddress}`);
        console.log(`   Tx: ${txSignature}`);
        
        if (!player.walletAddress) {
            console.log(`   ❌ Not authenticated`);
            sendToPlayer(playerId, {
                type: 'nft_confirm_mint_response',
                success: false,
                error: 'NOT_AUTHENTICATED'
            });
            return true;
        }

        try {
            // Verify ownership
            const cosmetic = await OwnedCosmetic.getForNftMetadata(instanceId);
            if (!cosmetic || cosmetic.ownerId !== player.walletAddress) {
                console.log(`   ❌ Not owner (cosmetic owner: ${cosmetic?.ownerId}, player: ${player.walletAddress})`);
                sendToPlayer(playerId, {
                    type: 'nft_confirm_mint_response',
                    success: false,
                    error: 'NOT_OWNER'
                });
                return true;
            }

            const metadataUri = `${nftMintService.metadataBaseUrl}/${instanceId}`;

            // Confirm the mint (this will wait for on-chain confirmation)
            console.log(`   ⏳ Waiting for on-chain confirmation...`);
            const result = await nftMintService.confirmMint(
                instanceId,
                mintAddress,
                txSignature,
                metadataUri,
                player.walletAddress
            );

            console.log(`   Result:`, result.success ? '✅ Success' : `❌ ${result.error}`);
            
            sendToPlayer(playerId, {
                type: 'nft_confirm_mint_response',
                instanceId,
                ...result
            });

            if (result.success) {
                // Clear pending fee tracker - mint was successful
                delete player._pendingMintPebblesFee;
                console.log(`✅ NFT mint confirmed for ${player.name}: ${mintAddress}`);
                console.log(`   View on Solscan: https://solscan.io/token/${mintAddress}`);
            }

        } catch (error) {
            console.error('nft_confirm_mint error:', error);
            
            sendToPlayer(playerId, {
                type: 'nft_confirm_mint_response',
                success: false,
                error: 'CONFIRM_FAILED',
                message: error.message
            });
        }
        return true;
    }

    // Get NFT mint info
    if (message.type === 'nft_get_mint_info') {
        try {
            const estimatedCost = servicesInitialized ? await nftMintService.getEstimatedMintCost() : null;
            const fees = servicesInitialized ? nftMintService.getMintFees() : { solFee: 0, pebblesFee: 0, royaltyPercent: 5 };
            
            sendToPlayer(playerId, {
                type: 'nft_mint_info',
                estimatedCost,
                collectionName: 'WaddleBet Cosmetics',
                royaltyPercent: fees.royaltyPercent,
                solFee: fees.solFee,
                pebblesFee: fees.pebblesFee,
                enabled: servicesInitialized
            });
        } catch (error) {
            console.error('nft_get_mint_info error:', error);
            sendToPlayer(playerId, {
                type: 'nft_mint_info',
                enabled: false,
                error: error.message
            });
        }
        return true;
    }

    return false; // Message not handled
}

/**
 * HTTP handler: Render cosmetic image
 * GET /api/nft/render/:instanceId
 */
export async function handleRenderImage(req, res) {
    const { instanceId } = req.params;

    // CORS headers for marketplace access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        const cosmeticData = await OwnedCosmetic.getForNftMetadata(instanceId);
        
        if (!cosmeticData) {
            return res.status(404).json({ error: 'Cosmetic not found' });
        }

        const imageBuffer = await nftRenderService.renderCosmetic(cosmeticData);
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.send(imageBuffer);

    } catch (error) {
        console.error('Render error:', error);
        res.status(500).json({ error: 'Failed to render image' });
    }
}

/**
 * HTTP handler: Get NFT metadata JSON
 * GET /api/nft/metadata/:instanceId
 */
export async function handleGetMetadata(req, res) {
    const { instanceId } = req.params;
    
    // Use configured public URL, fall back to request host for dev
    const publicBaseUrl = process.env.NFT_PUBLIC_URL || 
                          process.env.PUBLIC_URL ||
                          `${req.protocol}://${req.get('host')}`;

    try {
        const cosmeticData = await OwnedCosmetic.getForNftMetadata(instanceId);
        
        if (!cosmeticData) {
            return res.status(404).json({ error: 'Cosmetic not found' });
        }

        // Image URL points to our render endpoint (must be publicly accessible!)
        const imageUrl = `${publicBaseUrl}/api/nft/render/${instanceId}`;
        
        const metadata = nftMintService.generateMetadata(cosmeticData, imageUrl);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.setHeader('Access-Control-Allow-Origin', '*'); // Allow marketplaces to fetch
        res.json(metadata);

    } catch (error) {
        console.error('Metadata error:', error);
        res.status(500).json({ error: 'Failed to generate metadata' });
    }
}

/**
 * HTTP handler: Preview render (for testing)
 * GET /api/nft/preview/:templateId
 */
export async function handlePreviewRender(req, res) {
    const { templateId } = req.params;
    const { 
        rarity = 'common', 
        quality = 'standard',
        holographic = 'false',
        firstEdition = 'false',
        serialNumber = '1',
        skin = 'blue'
    } = req.query;

    try {
        // Create mock cosmetic data for preview
        const mockData = {
            templateId,
            assetKey: templateId,
            name: templateId.replace(/([A-Z])/g, ' $1').trim(), // camelCase to Title Case
            category: 'hat',
            rarity,
            quality,
            serialNumber: parseInt(serialNumber),
            isHolographic: holographic === 'true',
            isFirstEdition: firstEdition === 'true',
            skin
        };

        const imageBuffer = await nftRenderService.renderCosmetic(mockData);
        
        res.setHeader('Content-Type', 'image/png');
        res.send(imageBuffer);

    } catch (error) {
        console.error('Preview render error:', error);
        res.status(500).json({ error: 'Failed to render preview' });
    }
}

export default {
    initializeNFTServices,
    isNFTEnabled,
    handleNFTMessage,
    handleRenderImage,
    handleGetMetadata,
    handlePreviewRender
};

