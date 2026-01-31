/**
 * NFT Image Storage Service
 * 
 * Stores NFT images in the database as base64 to ensure persistence
 * across deployments (Render's filesystem is ephemeral)
 * 
 * For production, consider migrating to:
 * - Amazon S3
 * - Cloudflare R2
 * - Arweave (decentralized, permanent)
 */

import mongoose from 'mongoose';

// Schema for storing NFT images
const nftImageSchema = new mongoose.Schema({
    instanceId: { type: String, required: true, unique: true, index: true },
    imageData: { type: String, required: true }, // Base64 encoded PNG
    mimeType: { type: String, default: 'image/png' },
    size: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

// Create model (use existing connection)
let NFTImage;
try {
    NFTImage = mongoose.model('NFTImage');
} catch {
    NFTImage = mongoose.model('NFTImage', nftImageSchema);
}

class NFTImageStorage {
    /**
     * Save an image to database
     * @param {string} instanceId - The cosmetic instance ID
     * @param {string} base64Data - Base64 encoded image (without data:image/png;base64, prefix)
     */
    async saveImage(instanceId, base64Data) {
        try {
            // Remove data URL prefix if present
            const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
            
            await NFTImage.findOneAndUpdate(
                { instanceId },
                { 
                    instanceId,
                    imageData: cleanBase64,
                    mimeType: 'image/png',
                    size: Buffer.from(cleanBase64, 'base64').length,
                    createdAt: new Date()
                },
                { upsert: true, new: true }
            );
            
            console.log(`💾 NFT image saved to DB: ${instanceId}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to save NFT image: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Get an image from database
     * @param {string} instanceId - The cosmetic instance ID
     * @returns {Buffer|null} - Image buffer or null if not found
     */
    async getImage(instanceId) {
        try {
            const doc = await NFTImage.findOne({ instanceId });
            if (!doc) {
                return null;
            }
            return Buffer.from(doc.imageData, 'base64');
        } catch (error) {
            console.error(`❌ Failed to get NFT image: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Check if an image exists
     * @param {string} instanceId - The cosmetic instance ID
     * @returns {boolean}
     */
    async hasImage(instanceId) {
        try {
            const count = await NFTImage.countDocuments({ instanceId });
            return count > 0;
        } catch {
            return false;
        }
    }
    
    /**
     * Delete an image
     * @param {string} instanceId - The cosmetic instance ID
     */
    async deleteImage(instanceId) {
        try {
            await NFTImage.deleteOne({ instanceId });
            return true;
        } catch {
            return false;
        }
    }
}

export const nftImageStorage = new NFTImageStorage();
export default nftImageStorage;

