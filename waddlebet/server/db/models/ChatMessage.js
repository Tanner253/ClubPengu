/**
 * ChatMessage - Persisted chat by channel (max 1000 per channel+scope)
 */

import mongoose from 'mongoose';

export const CHAT_CHANNELS = [
    'global',
    'room',
    'guild',
    'whisper',
    'casino',
    'announcement',
    'market'
];

const chatMessageSchema = new mongoose.Schema({
    messageId: { type: String, required: true, unique: true, index: true },
    channel: { type: String, required: true, enum: CHAT_CHANNELS, index: true },
    scopeKey: { type: String, required: true, index: true },
    roomId: { type: String, default: null },
    guildId: { type: String, default: null },
    whisperFrom: { type: String, default: null },
    whisperTo: { type: String, default: null },
    senderId: { type: String, default: 'system' },
    senderName: { type: String, required: true },
    text: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true }
});

chatMessageSchema.index({ channel: 1, scopeKey: 1, timestamp: -1 });
chatMessageSchema.index({ channel: 1, whisperFrom: 1, timestamp: -1 });
chatMessageSchema.index({ channel: 1, whisperTo: 1, timestamp: -1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
