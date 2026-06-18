/**
 * FishingHoleWorldState — persisted per-hole fish tier stock (single world document).
 */

import mongoose from 'mongoose';

const fishingHoleWorldStateSchema = new mongoose.Schema({
    _id: { type: String, default: 'fishing_holes' },
    holes: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('FishingHoleWorldState', fishingHoleWorldStateSchema);
