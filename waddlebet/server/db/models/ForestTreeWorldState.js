/**
 * ForestTreeWorldState — persisted harvestable tree states (single world document).
 * Survives server restarts; regrow timers continue from saved timestamps.
 */

import mongoose from 'mongoose';

const treeEntrySchema = new mongoose.Schema({
    state: { type: String, enum: ['ready', 'harvested'], default: 'ready' },
    regrowAt: { type: Number, default: null },
    lastHarvestedAt: { type: Number, default: null }
}, { _id: false });

const forestTreeWorldStateSchema = new mongoose.Schema({
    _id: { type: String, default: 'forest_trees' },
    trees: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('ForestTreeWorldState', forestTreeWorldStateSchema);
