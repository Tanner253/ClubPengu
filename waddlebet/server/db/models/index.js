/**
 * Database Models Index
 * Central export for all Mongoose models
 */

export { default as User } from './User.js';
export { default as AuthSession } from './AuthSession.js';
export { default as Match } from './Match.js';
export { default as Challenge } from './Challenge.js';
export { default as Puffle, PUFFLE_PRICES, PUFFLE_TIERS } from './Puffle.js';
export { default as Transaction } from './Transaction.js';
export { default as SolanaTransaction } from './SolanaTransaction.js';
export { default as PromoCode } from './PromoCode.js';
export { default as PromoRedemption } from './PromoRedemption.js';
export { default as Igloo } from './Igloo.js';

// Gacha System
export { default as CosmeticTemplate } from './CosmeticTemplate.js';
export { default as OwnedCosmetic } from './OwnedCosmetic.js';
export { default as GachaRoll } from './GachaRoll.js';

// Pebble System
export { default as PebbleWithdrawal } from './PebbleWithdrawal.js';

// Marketplace
export { default as MarketListing } from './MarketListing.js';

// Chat
export { default as ChatMessage, CHAT_CHANNELS } from './ChatMessage.js';

// World resources
export { default as ForestTreeWorldState } from './ForestTreeWorldState.js';


