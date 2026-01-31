/**
 * OwnedCosmetic Model - Individual cosmetic instances owned by players
 * Each cosmetic owned is a unique instance with its own properties
 */

import mongoose from 'mongoose';

const ownedCosmeticSchema = new mongoose.Schema({
    // ========== IDENTITY ==========
    instanceId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true
    },
    templateId: { 
        type: String, 
        required: true, 
        index: true 
    },
    
    // ========== OWNERSHIP ==========
    ownerId: { 
        type: String, 
        required: true, 
        index: true  // Wallet address
    },
    
    // ========== INSTANCE PROPERTIES (Rolled at mint) ==========
    serialNumber: { 
        type: Number, 
        required: true 
    },
    quality: {
        type: String,
        enum: ['worn', 'standard', 'pristine', 'flawless'],
        default: 'standard'
    },
    isHolographic: { 
        type: Boolean, 
        default: false 
    },
    
    // FIRST EDITION: Serial numbers 1, 2, 3 are First Edition
    // Only 3 First Editions ever exist per item
    isFirstEdition: { 
        type: Boolean, 
        default: false 
    },
    
    // ========== PROVENANCE ==========
    mintedAt: { 
        type: Date, 
        default: Date.now 
    },
    mintedBy: { 
        type: String, 
        required: true  // Original owner wallet
    },
    acquisitionMethod: {
        type: String,
        enum: ['gacha_roll', 'promo_code', 'achievement', 'trade', 'airdrop', 'legacy'],
        default: 'gacha_roll'
    },
    
    // ========== STATE ==========
    isEquipped: { 
        type: Boolean, 
        default: false 
    },
    convertedToGold: { 
        type: Boolean, 
        default: false 
    },
    convertedAt: Date,
    goldReceived: Number,  // Amount of gold received when converted
    
    // ========== TRADABILITY ==========
    // Promo code items and certain achievements are NOT tradable
    tradable: {
        type: Boolean,
        default: true,
        index: true
    },
    
    // ========== NFT STATUS ==========
    // When minted as Solana NFT, these fields are populated
    nftMintAddress: {
        type: String,
        default: null,
        index: true,
        sparse: true  // Allow null, only index non-null values
    },
    nftMetadataUri: {
        type: String,
        default: null
    },
    nftMintedAt: {
        type: Date,
        default: null
    },
    nftMintTxSignature: {
        type: String,
        default: null
    },
    // Track who paid for the mint (usually the owner)
    nftMintedBy: {
        type: String,
        default: null
    },
    
    // ========== OWNERSHIP HISTORY ==========
    // Complete provenance chain from mint to current owner
    ownershipHistory: [{
        walletAddress: { type: String, required: true },
        acquiredAt: { type: Date, required: true },
        acquiredFrom: { type: String }, // null for mint, wallet address for trades
        acquisitionType: { 
            type: String, 
            enum: ['mint', 'trade', 'gift', 'promo', 'airdrop'],
            required: true 
        },
        transactionId: { type: String }, // MarketListing ID or other reference
        price: { type: Number }, // Price paid (0 for mint/gift/promo)
        _id: false
    }],
    
    // Quick stats derived from history
    totalTrades: { type: Number, default: 0 },
    lastSalePrice: { type: Number },
    lastSaleAt: { type: Date },
    
}, { timestamps: true });

// ==================== INDEXES ====================
ownedCosmeticSchema.index({ ownerId: 1, templateId: 1 });
ownedCosmeticSchema.index({ templateId: 1, serialNumber: 1 }, { unique: true });
ownedCosmeticSchema.index({ ownerId: 1, isEquipped: 1 });
ownedCosmeticSchema.index({ ownerId: 1, convertedToGold: 1 });
ownedCosmeticSchema.index({ ownerId: 1, convertedToGold: 1, templateId: 1 }); // Inventory queries
ownedCosmeticSchema.index({ isFirstEdition: 1 });  // For querying all first editions
ownedCosmeticSchema.index({ mintedAt: -1 });
ownedCosmeticSchema.index({ ownerId: 1, convertedToGold: 1, mintedAt: -1 }); // Paginated inventory

// ==================== STATICS ====================

/**
 * Generate unique instance ID
 */
ownedCosmeticSchema.statics.generateInstanceId = function() {
    return `cos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get next serial number for a template (ATOMIC)
 * This prevents race conditions for serial numbers
 * @param {string} templateId - Template ID
 * @returns {Promise<{serialNumber: number, isFirstEdition: boolean}>}
 */
ownedCosmeticSchema.statics.getNextSerialAtomic = async function(templateId) {
    const CosmeticTemplate = mongoose.model('CosmeticTemplate');
    
    // Atomically increment totalMinted and get the new value
    const template = await CosmeticTemplate.findOneAndUpdate(
        { templateId },
        { $inc: { totalMinted: 1 } },
        { new: true, select: 'totalMinted' }
    );
    
    if (!template) {
        throw new Error(`Template not found: ${templateId}`);
    }
    
    const serialNumber = template.totalMinted;
    const isFirstEdition = serialNumber <= 3;
    
    return { serialNumber, isFirstEdition };
};

/**
 * Check if a user owns a specific template (not converted)
 * @param {string} ownerId - Wallet address
 * @param {string} templateId - Template ID
 */
ownedCosmeticSchema.statics.userOwnsTemplate = async function(ownerId, templateId) {
    const owned = await this.findOne({
        ownerId,
        templateId,
        convertedToGold: false
    });
    return !!owned;
};

/**
 * Get all cosmetics owned by a user (not converted)
 * @param {string} ownerId - Wallet address
 */
ownedCosmeticSchema.statics.getUserCosmetics = function(ownerId) {
    return this.find({ 
        ownerId, 
        convertedToGold: false 
    }).sort({ mintedAt: -1 });
};

/**
 * Get user's cosmetics with template data (manual join)
 * @param {string} ownerId - Wallet address
 */
ownedCosmeticSchema.statics.getUserCosmeticsWithTemplates = async function(ownerId) {
    const CosmeticTemplate = mongoose.model('CosmeticTemplate');
    
    // Get owned cosmetics
    const owned = await this.find({ 
        ownerId, 
        convertedToGold: false 
    }).lean();
    
    if (owned.length === 0) return [];
    
    // Get unique template IDs
    const templateIds = [...new Set(owned.map(o => o.templateId))];
    
    // Fetch templates
    const templates = await CosmeticTemplate.find({
        templateId: { $in: templateIds }
    }).lean();
    
    // Create template lookup map
    const templateMap = new Map(templates.map(t => [t.templateId, t]));
    
    // Join data
    return owned.map(cosmetic => ({
        ...cosmetic,
        template: templateMap.get(cosmetic.templateId) || null
    }));
};

/**
 * Mark cosmetic as converted to gold
 * @param {string} instanceId - Instance ID
 * @param {number} goldAmount - Gold received
 */
ownedCosmeticSchema.statics.markConverted = function(instanceId, goldAmount) {
    return this.findOneAndUpdate(
        { instanceId },
        { 
            convertedToGold: true, 
            convertedAt: new Date(),
            goldReceived: goldAmount
        },
        { new: true }
    );
};

/**
 * Get quality value multiplier
 */
ownedCosmeticSchema.methods.getQualityMultiplier = function() {
    const multipliers = {
        worn: 0.7,
        standard: 1.0,
        pristine: 1.8,
        flawless: 4.0
    };
    return multipliers[this.quality] || 1.0;
};

/**
 * Calculate total value multiplier (quality + holo)
 */
ownedCosmeticSchema.methods.getTotalValueMultiplier = function() {
    let mult = this.getQualityMultiplier();
    if (this.isHolographic) mult *= 3.0;
    if (this.isFirstEdition) mult *= 2.0;
    return mult;
};

// ==================== INVENTORY METHODS ====================

/**
 * Get full inventory with template data, pagination, and filters
 * @param {string} walletAddress - User's wallet
 * @param {object} options - { page, limit, category, rarity, sortBy }
 */
ownedCosmeticSchema.statics.getFullInventory = async function(walletAddress, options = {}) {
    const {
        page = 1,
        limit = 50,
        category = null,
        rarity = null,
        sortBy = 'newest' // 'newest', 'oldest', 'rarity', 'serial'
    } = options;
    
    const skip = (page - 1) * limit;
    
    // Get owned items - exclude non-tradable promo items from inventory display
    // Promo items are for customization only, not inventory trading/burning
    const items = await this.find({ 
        ownerId: walletAddress, 
        convertedToGold: false,
        tradable: { $ne: false }  // Exclude promo/achievement items
    })
    .sort({ mintedAt: -1 })
    .lean();
    
    if (items.length === 0) {
        return { items: [], total: 0, page, hasMore: false };
    }
    
    // Fetch template data
    const CosmeticTemplate = mongoose.model('CosmeticTemplate');
    const templateIds = [...new Set(items.map(i => i.templateId))];
    const templates = await CosmeticTemplate.find({ templateId: { $in: templateIds } }).lean();
    const templateMap = new Map(templates.map(t => [t.templateId, t]));
    
    // Check which items are currently listed on the marketplace
    let listedInstanceIds = new Set();
    try {
        const MarketListing = mongoose.model('MarketListing');
        const instanceIds = items.map(i => i.instanceId);
        
        const activeListings = await MarketListing.find({
            itemInstanceId: { $in: instanceIds },
            status: 'active'
        }).select('itemInstanceId').lean();
        
        listedInstanceIds = new Set(activeListings.map(l => l.itemInstanceId));
    } catch (error) {
        console.error('📦 Error checking marketplace listings:', error.message);
        // Continue without listing info rather than failing
    }
    
    // Merge and enrich data
    let enrichedItems = items.map(item => {
        const template = templateMap.get(item.templateId);
        const isListed = listedInstanceIds.has(item.instanceId);
        return {
            instanceId: item.instanceId,
            templateId: item.templateId,
            serialNumber: item.serialNumber,
            quality: item.quality,
            isHolographic: item.isHolographic,
            isFirstEdition: item.isFirstEdition,
            mintedAt: item.mintedAt,
            tradable: item.tradable !== false, // Promo items are not tradable
            acquisitionMethod: item.acquisitionMethod || 'gacha_roll',
            isListed, // Is this item currently listed on the marketplace?
            // NFT data
            nftMintAddress: item.nftMintAddress || null,
            nftMintedAt: item.nftMintedAt || null,
            // Template data
            name: template?.name || 'Unknown',
            category: template?.category || 'unknown',
            rarity: template?.rarity || 'common',
            assetKey: template?.assetKey || item.templateId,
            duplicateGoldBase: template?.duplicateGoldBase || 25,
            // Calculated burn value (0 for non-tradable, listed, or NFT items)
            burnValue: (item.tradable === false || isListed || item.nftMintAddress) ? 0 : calculateBurnValue(template?.duplicateGoldBase || 25, item)
        };
    });
    
    // Apply filters
    if (category) {
        enrichedItems = enrichedItems.filter(i => i.category === category);
    }
    if (rarity) {
        enrichedItems = enrichedItems.filter(i => i.rarity === rarity);
    }
    
    // Apply sorting
    const rarityOrder = { divine: 0, mythic: 1, legendary: 2, epic: 3, rare: 4, uncommon: 5, common: 6 };
    switch (sortBy) {
        case 'oldest':
            enrichedItems.sort((a, b) => new Date(a.mintedAt) - new Date(b.mintedAt));
            break;
        case 'rarity':
            enrichedItems.sort((a, b) => (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99));
            break;
        case 'serial':
            enrichedItems.sort((a, b) => a.serialNumber - b.serialNumber);
            break;
        case 'value':
            enrichedItems.sort((a, b) => b.burnValue - a.burnValue);
            break;
        case 'newest':
        default:
            enrichedItems.sort((a, b) => new Date(b.mintedAt) - new Date(a.mintedAt));
    }
    
    const total = enrichedItems.length;
    const paginatedItems = enrichedItems.slice(skip, skip + limit);
    
    return {
        items: paginatedItems,
        total,
        page,
        limit,
        hasMore: total > page * limit
    };
};

/**
 * Calculate burn value for an item
 */
function calculateBurnValue(baseGold, item) {
    let value = baseGold || 25;
    
    // Quality multipliers
    const qualityMultipliers = {
        worn: 0.7,
        standard: 1.0,
        pristine: 1.8,
        flawless: 4.0
    };
    value *= qualityMultipliers[item.quality] || 1.0;
    
    // Holographic bonus (3x)
    if (item.isHolographic) value *= 3.0;
    
    // First Edition bonus (2x)
    if (item.isFirstEdition) value *= 2.0;
    
    // Low serial bonus (top 100 = +50%)
    if (item.serialNumber <= 100) value *= 1.5;
    // Top 10 serial bonus (+100% instead of +50%)
    else if (item.serialNumber <= 10) value *= 2.0;
    
    return Math.floor(value);
}

/**
 * Burn a cosmetic for gold
 * @param {string} instanceId - Instance to burn
 * @param {string} walletAddress - Owner's wallet (for verification)
 * @returns {object} - { success, goldAwarded, item, error }
 */
ownedCosmeticSchema.statics.burnForGold = async function(instanceId, walletAddress) {
    // Find the item
    const item = await this.findOne({ 
        instanceId, 
        ownerId: walletAddress, 
        convertedToGold: false 
    });
    
    if (!item) {
        return { success: false, error: 'ITEM_NOT_FOUND', message: 'Item not found or already burned' };
    }
    
    // Non-tradable items (promo codes, etc.) cannot be burned
    if (item.tradable === false) {
        return { success: false, error: 'NOT_TRADABLE', message: 'This item cannot be burned (promo/achievement item)' };
    }
    
    // Check if item is currently listed on marketplace
    try {
        const MarketListing = mongoose.model('MarketListing');
        const isListed = await MarketListing.isItemListed(instanceId);
        if (isListed) {
            return { success: false, error: 'ITEM_LISTED', message: 'Cannot burn an item that is listed for sale' };
        }
    } catch (e) {
        // If MarketListing model isn't available, skip check (shouldn't happen)
        console.error('Warning: Could not check listing status for burn:', e.message);
    }
    
    // Get template for base gold value
    const CosmeticTemplate = mongoose.model('CosmeticTemplate');
    const template = await CosmeticTemplate.findOne({ templateId: item.templateId });
    
    if (!template) {
        return { success: false, error: 'TEMPLATE_NOT_FOUND', message: 'Template data not found' };
    }
    
    // Calculate gold value
    const goldAwarded = calculateBurnValue(template.duplicateGoldBase, item);
    
    // Mark as converted
    item.convertedToGold = true;
    item.convertedAt = new Date();
    item.goldReceived = goldAwarded;
    await item.save();
    
    return {
        success: true,
        goldAwarded,
        item: {
            instanceId: item.instanceId,
            templateId: item.templateId,
            name: template.name,
            rarity: template.rarity,
            category: template.category,
            quality: item.quality,
            isHolographic: item.isHolographic,
            isFirstEdition: item.isFirstEdition,
            serialNumber: item.serialNumber
        }
    };
};

/**
 * Transfer ownership with full history tracking
 * @param {string} instanceId - Item instance ID
 * @param {string} fromWallet - Seller's wallet
 * @param {string} toWallet - Buyer's wallet  
 * @param {object} options - { price, transactionId, acquisitionType }
 * @param {object} session - MongoDB session for transactions
 * @returns {object} - { success, item, error }
 */
ownedCosmeticSchema.statics.transferOwnership = async function(instanceId, fromWallet, toWallet, options = {}, session = null) {
    const { price = 0, transactionId = null, acquisitionType = 'trade' } = options;
    
    // Find and verify ownership
    const queryOptions = session ? { session } : {};
    const item = await this.findOne({
        instanceId,
        ownerId: fromWallet,
        convertedToGold: false
    }, null, queryOptions);
    
    if (!item) {
        return { success: false, error: 'ITEM_NOT_FOUND', message: 'Item not found or not owned by seller' };
    }
    
    if (item.tradable === false) {
        return { success: false, error: 'NOT_TRADABLE', message: 'This item cannot be traded' };
    }
    
    // Initialize ownership history if missing (for legacy items)
    if (!item.ownershipHistory || item.ownershipHistory.length === 0) {
        item.ownershipHistory = [{
            walletAddress: item.mintedBy || fromWallet,
            acquiredAt: item.mintedAt || new Date(),
            acquiredFrom: null,
            acquisitionType: 'mint',
            price: 0
        }];
    }
    
    // Add new ownership entry
    item.ownershipHistory.push({
        walletAddress: toWallet,
        acquiredAt: new Date(),
        acquiredFrom: fromWallet,
        acquisitionType,
        transactionId,
        price
    });
    
    // Update ownership
    item.ownerId = toWallet;
    item.totalTrades = (item.totalTrades || 0) + 1;
    item.lastSalePrice = price;
    item.lastSaleAt = new Date();
    item.isEquipped = false; // Unequip on transfer
    
    await item.save(queryOptions);
    
    return {
        success: true,
        item: {
            instanceId: item.instanceId,
            templateId: item.templateId,
            serialNumber: item.serialNumber,
            totalTrades: item.totalTrades,
            ownershipHistory: item.ownershipHistory
        }
    };
};

/**
 * Transfer ownership for NFT sync - uses on-chain data as source of truth
 * Unlike regular transferOwnership, this doesn't require from wallet verification
 * because the blockchain has already validated the transfer
 * 
 * @param {string} instanceId - Item instance ID
 * @param {string} newOwner - New owner's wallet address (from blockchain)
 * @param {string} acquisitionType - How they acquired it ('nft_sale', 'nft_purchase', 'nft_sync')
 * @param {number|null} price - Sale price if known
 * @returns {object|null} - Updated item or null if failed
 */
ownedCosmeticSchema.statics.transferOwnershipByNft = async function(instanceId, newOwner, acquisitionType = 'nft_sale', price = null) {
    const item = await this.findOne({ 
        instanceId,
        nftMintAddress: { $ne: null } // Must be an NFT
    });
    
    if (!item) {
        return null;
    }
    
    const previousOwner = item.ownerId;
    
    // Don't do anything if already owned by this wallet
    if (previousOwner === newOwner) {
        return item;
    }
    
    // Initialize ownership history if missing
    if (!item.ownershipHistory || item.ownershipHistory.length === 0) {
        item.ownershipHistory = [{
            walletAddress: item.mintedBy || previousOwner,
            acquiredAt: item.mintedAt || new Date(),
            acquiredFrom: null,
            acquisitionType: 'mint',
            price: 0
        }];
    }
    
    // Add new ownership entry
    item.ownershipHistory.push({
        walletAddress: newOwner,
        acquiredAt: new Date(),
        acquiredFrom: previousOwner,
        acquisitionType,
        transactionId: null, // Could be enhanced to track NFT transfer tx
        price: price || 0,
        note: 'Synced from on-chain NFT ownership'
    });
    
    // Update ownership
    item.ownerId = newOwner;
    item.totalTrades = (item.totalTrades || 0) + 1;
    if (price) {
        item.lastSalePrice = price;
    }
    item.lastSaleAt = new Date();
    item.isEquipped = false; // Unequip on transfer
    
    await item.save();
    
    return item;
};

/**
 * Get ownership history for an item
 * @param {string} instanceId - Item instance ID
 * @returns {Array} - Full ownership history
 */
ownedCosmeticSchema.statics.getOwnershipHistory = async function(instanceId) {
    const item = await this.findOne({ instanceId }).select('ownershipHistory templateId serialNumber mintedAt mintedBy totalTrades lastSalePrice').lean();
    
    if (!item) return null;
    
    return {
        instanceId,
        templateId: item.templateId,
        serialNumber: item.serialNumber,
        mintedAt: item.mintedAt,
        originalOwner: item.mintedBy,
        totalTrades: item.totalTrades || 0,
        lastSalePrice: item.lastSalePrice,
        history: item.ownershipHistory || []
    };
};

// ==================== NFT METHODS ====================

/**
 * Check if a cosmetic has been minted as an NFT
 * @param {string} instanceId - Item instance ID
 * @returns {boolean}
 */
ownedCosmeticSchema.statics.isNftMinted = async function(instanceId) {
    const item = await this.findOne({ instanceId }, 'nftMintAddress').lean();
    return !!(item?.nftMintAddress);
};

/**
 * Mark a cosmetic as minted to NFT
 * @param {string} instanceId - Item instance ID
 * @param {object} nftData - { mintAddress, metadataUri, txSignature, mintedBy }
 * @returns {object} Updated item
 */
ownedCosmeticSchema.statics.markAsNftMinted = async function(instanceId, nftData) {
    const { mintAddress, metadataUri, txSignature, mintedBy } = nftData;
    
    // Match items where nftMintAddress is null, undefined, or doesn't exist
    const item = await this.findOneAndUpdate(
        { 
            instanceId, 
            $or: [
                { nftMintAddress: null },
                { nftMintAddress: { $exists: false } }
            ]
        },
        {
            $set: {
                nftMintAddress: mintAddress,
                nftMetadataUri: metadataUri,
                nftMintTxSignature: txSignature,
                nftMintedBy: mintedBy,
                nftMintedAt: new Date()
            }
        },
        { new: true }
    );
    
    if (item) {
        console.log(`📝 Database updated: ${instanceId} → NFT ${mintAddress}`);
    } else {
        console.warn(`⚠️ markAsNftMinted: Item ${instanceId} not found or already minted`);
    }
    
    return item;
};

/**
 * Get full cosmetic data for NFT metadata generation
 * @param {string} instanceId - Item instance ID
 * @returns {object} Complete cosmetic data with template info
 */
ownedCosmeticSchema.statics.getForNftMetadata = async function(instanceId) {
    const CosmeticTemplate = mongoose.model('CosmeticTemplate');
    
    const item = await this.findOne({ instanceId }).lean();
    if (!item) return null;
    
    const template = await CosmeticTemplate.findOne({ templateId: item.templateId }).lean();
    if (!template) return null;
    
    return {
        instanceId: item.instanceId,
        templateId: item.templateId,
        serialNumber: item.serialNumber,
        quality: item.quality,
        isHolographic: item.isHolographic,
        isFirstEdition: item.isFirstEdition,
        mintedAt: item.mintedAt,
        mintedBy: item.mintedBy,
        totalTrades: item.totalTrades || 0,
        ownershipHistory: item.ownershipHistory || [],
        ownerId: item.ownerId,
        // Template data
        name: template.name,
        description: template.description,
        category: template.category,
        rarity: template.rarity,
        assetKey: template.assetKey,
        collection: template.collection,
        isAnimated: template.isAnimated,
        hasGlow: template.hasGlow,
        hasFx: template.hasFx,
        totalMinted: template.totalMinted,
        // NFT status
        isNftMinted: !!item.nftMintAddress,
        nftMintAddress: item.nftMintAddress
    };
};

/**
 * Get unique template IDs owned by user (for unlock checking)
 * @param {string} walletAddress - User's wallet
 */
ownedCosmeticSchema.statics.getUserOwnedTemplateIds = async function(walletAddress) {
    const owned = await this.find(
        { ownerId: walletAddress, convertedToGold: false },
        'templateId'
    ).lean();
    
    return [...new Set(owned.map(o => o.templateId))];
};

/**
 * Count duplicates of a specific template
 * @param {string} walletAddress - User's wallet
 * @param {string} templateId - Template to count
 */
ownedCosmeticSchema.statics.countUserDuplicates = async function(walletAddress, templateId) {
    return await this.countDocuments({
        ownerId: walletAddress,
        templateId,
        convertedToGold: false
    });
};

/**
 * Get inventory stats for a user (excludes promo items)
 * @param {string} walletAddress - User's wallet
 */
ownedCosmeticSchema.statics.getInventoryStats = async function(walletAddress) {
    const items = await this.find(
        { ownerId: walletAddress, convertedToGold: false, tradable: { $ne: false } },
        'templateId quality isHolographic isFirstEdition'
    ).lean();
    
    const CosmeticTemplate = mongoose.model('CosmeticTemplate');
    const templateIds = [...new Set(items.map(i => i.templateId))];
    const templates = await CosmeticTemplate.find(
        { templateId: { $in: templateIds } },
        'templateId rarity category'
    ).lean();
    const templateMap = new Map(templates.map(t => [t.templateId, t]));
    
    const stats = {
        totalItems: items.length,
        uniqueTemplates: templateIds.length,
        byRarity: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0, divine: 0 },
        byCategory: { hat: 0, eyes: 0, mouth: 0, bodyItem: 0, mount: 0, skin: 0 },
        byQuality: { worn: 0, standard: 0, pristine: 0, flawless: 0 },
        holographicCount: 0,
        firstEditionCount: 0
    };
    
    for (const item of items) {
        const template = templateMap.get(item.templateId);
        if (template) {
            stats.byRarity[template.rarity] = (stats.byRarity[template.rarity] || 0) + 1;
            stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;
        }
        stats.byQuality[item.quality] = (stats.byQuality[item.quality] || 0) + 1;
        if (item.isHolographic) stats.holographicCount++;
        if (item.isFirstEdition) stats.firstEditionCount++;
    }
    
    return stats;
};

const OwnedCosmetic = mongoose.model('OwnedCosmetic', ownedCosmeticSchema);

export default OwnedCosmetic;

