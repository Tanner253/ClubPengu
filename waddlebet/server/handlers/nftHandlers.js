/**
 * NFT Handlers - WebSocket and HTTP handlers for NFT operations
 * 
 * Handles:
 * - Uploading user-captured NFT images
 * - Generating metadata JSON
 * - Building mint transactions
 * - Confirming mints
 */

import OwnedCosmetic from '../db/models/OwnedCosmetic.js';
import User from '../db/models/User.js';
import nftMintService, { MINT_FEE_PEBBLES } from '../services/NFTMintService.js';
import nftImageStorage from '../services/NFTImageStorage.js';

// Track initialized state
let servicesInitialized = false;

/**
 * Initialize NFT services (call once at server startup)
 */
export async function initializeNFTServices() {
    if (servicesInitialized) return;
    
    try {
        await nftMintService.initialize();
        servicesInitialized = true;
        console.log('🎨 NFT services initialized');
        console.log(`   Image storage: ${NFT_IMAGE_DIR}`);
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

    // Upload NFT image (user-captured from photo booth)
    if (message.type === 'nft_upload_image') {
        const { instanceId, imageData } = message;
        
        if (!player.walletAddress) {
            sendToPlayer(playerId, {
                type: 'nft_upload_image_response',
                success: false,
                error: 'NOT_AUTHENTICATED'
            });
            return true;
        }

        try {
            // Verify ownership
            const cosmetic = await OwnedCosmetic.getForNftMetadata(instanceId);
            if (!cosmetic || cosmetic.ownerId !== player.walletAddress) {
                sendToPlayer(playerId, {
                    type: 'nft_upload_image_response',
                    success: false,
                    error: 'NOT_OWNER'
                });
                return true;
            }

            // Validate image data (should be base64 PNG)
            if (!imageData || !imageData.startsWith('data:image/png;base64,')) {
                sendToPlayer(playerId, {
                    type: 'nft_upload_image_response',
                    success: false,
                    error: 'INVALID_IMAGE',
                    message: 'Image must be PNG format'
                });
                return true;
            }

            // Save image to database (persistent across deployments)
            const saved = await nftImageStorage.saveImage(instanceId, imageData);
            
            if (!saved) {
                sendToPlayer(playerId, {
                    type: 'nft_upload_image_response',
                    success: false,
                    error: 'SAVE_FAILED',
                    message: 'Failed to save image'
                });
                return true;
            }
            
            console.log(`📸 NFT image saved: ${instanceId}`);
            
            sendToPlayer(playerId, {
                type: 'nft_upload_image_response',
                success: true,
                instanceId
            });

        } catch (error) {
            console.error('nft_upload_image error:', error);
            sendToPlayer(playerId, {
                type: 'nft_upload_image_response',
                success: false,
                error: 'UPLOAD_FAILED',
                message: error.message
            });
        }
        return true;
    }

    return false; // Message not handled
}

/**
 * HTTP handler: Serve NFT image (user-captured)
 * GET /api/nft/image/:instanceId
 */
export async function handleGetImage(req, res) {
    const { instanceId } = req.params;

    // Comprehensive CORS headers for marketplace access (Magic Eden, Tensor, etc.)
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Type'
    };

    try {
        // Get image from database (persistent storage)
        const imageBuffer = await nftImageStorage.getImage(instanceId);
        
        if (!imageBuffer) {
            console.log(`❌ NFT image not found in DB: ${instanceId}`);
            res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ error: 'Image not found', instanceId }));
            return;
        }
        
        console.log(`✅ Serving NFT image: ${instanceId} (${imageBuffer.length} bytes)`);
        
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': imageBuffer.length,
            'Cache-Control': 'public, max-age=31536000, immutable',
            ...corsHeaders
        });
        res.end(imageBuffer);

    } catch (error) {
        console.error('Get image error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Failed to get image' }));
    }
}

/**
 * HTTP handler: Get NFT metadata JSON
 * GET /api/nft/metadata/:instanceId
 */
export async function handleGetMetadata(req, res) {
    const { instanceId } = req.params;
    
    // Comprehensive CORS headers for marketplace access
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Type'
    };
    
    // Use configured public URL - MUST be publicly accessible for marketplaces!
    // Priority: NFT_PUBLIC_URL > PUBLIC_URL > request host (dev only)
    const publicBaseUrl = process.env.NFT_PUBLIC_URL || 
                          process.env.PUBLIC_URL ||
                          `${req.protocol}://${req.get('host')}`;

    try {
        const cosmeticData = await OwnedCosmetic.getForNftMetadata(instanceId);
        
        if (!cosmeticData) {
            console.log(`❌ NFT metadata not found: ${instanceId}`);
            res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ error: 'Cosmetic not found', instanceId }));
            return;
        }

        // Image URL points to user-uploaded image
        const imageUrl = `${publicBaseUrl}/api/nft/image/${instanceId}`;
        
        const metadata = nftMintService.generateMetadata(cosmeticData, imageUrl);
        
        console.log(`✅ Serving NFT metadata: ${instanceId}`);
        console.log(`   Image URL: ${imageUrl}`);
        console.log(`   Attributes: ${metadata.attributes?.length || 0} traits`);
        
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600',
            ...corsHeaders
        });
        res.end(JSON.stringify(metadata, null, 2)); // Pretty print for debugging

    } catch (error) {
        console.error('Metadata error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Failed to generate metadata' }));
    }
}

export default {
    initializeNFTServices,
    isNFTEnabled,
    handleNFTMessage,
    handleGetImage,
    handleGetMetadata
};

