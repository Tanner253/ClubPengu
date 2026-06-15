/**
 * ChatService - Persist chat messages and trim to max per channel scope
 */

import ChatMessage from '../db/models/ChatMessage.js';
import { connectDB } from '../db/connection.js';

export const MAX_MESSAGES_PER_SCOPE = 1000;

class ChatService {
    isDbReady() {
        return ChatMessage.db?.readyState === 1;
    }

    makeMessageId(channel) {
        return `${channel}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    whisperScopeKey(fromKey, toKey) {
        const [a, b] = [fromKey, toKey].sort();
        return `whisper:${a}:${b}`;
    }

    toClientPayload(doc, viewerPlayerId = null) {
        const timestamp = doc.timestamp?.getTime ? doc.timestamp.getTime() : doc.timestamp;
        const channel = doc.channel;
        const metadata = doc.metadata || {};

        const payload = {
            id: doc.messageId,
            channel,
            scopeKey: doc.scopeKey,
            roomId: doc.roomId || null,
            playerId: doc.senderId,
            name: doc.senderName,
            text: doc.text,
            metadata,
            timestamp,
            isSystem: doc.senderId === 'system' || ['casino', 'announcement', 'market'].includes(channel),
            isWhisper: channel === 'whisper',
            fromName: metadata.fromName || null,
            toName: metadata.toName || null,
            rarity: metadata.rarity || null
        };

        if (channel === 'whisper' && viewerPlayerId) {
            payload.fromMe = metadata.senderPlayerId === viewerPlayerId;
            payload.whisperDirection = payload.fromMe ? 'out' : 'in';
        }

        return payload;
    }

    async save({
        channel,
        scopeKey,
        roomId = null,
        guildId = null,
        whisperFrom = null,
        whisperTo = null,
        senderId = 'system',
        senderName,
        text,
        metadata = {}
    }) {
        const messageId = this.makeMessageId(channel);
        const doc = {
            messageId,
            channel,
            scopeKey,
            roomId,
            guildId,
            whisperFrom,
            whisperTo,
            senderId,
            senderName,
            text,
            metadata,
            timestamp: new Date()
        };

        if (!this.isDbReady()) {
            return doc;
        }

        try {
            await ChatMessage.create(doc);
            await this.trimScope(channel, scopeKey);
        } catch (err) {
            console.error('ChatService.save error:', err.message);
        }

        return doc;
    }

    async trimScope(channel, scopeKey) {
        if (!this.isDbReady()) return;

        const count = await ChatMessage.countDocuments({ channel, scopeKey });
        if (count <= MAX_MESSAGES_PER_SCOPE) return;

        const excess = count - MAX_MESSAGES_PER_SCOPE;
        const oldest = await ChatMessage.find({ channel, scopeKey })
            .sort({ timestamp: 1 })
            .limit(excess)
            .select('messageId')
            .lean();

        if (oldest.length > 0) {
            await ChatMessage.deleteMany({
                messageId: { $in: oldest.map((m) => m.messageId) }
            });
        }
    }

    async getScopeHistory(channel, scopeKey, limit = MAX_MESSAGES_PER_SCOPE) {
        if (!this.isDbReady()) return [];

        const docs = await ChatMessage.find({ channel, scopeKey })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        return docs.reverse();
    }

    async getWhisperHistory(walletAddress, playerName, limit = MAX_MESSAGES_PER_SCOPE) {
        if (!this.isDbReady()) return [];

        const or = [];
        if (walletAddress) {
            or.push({ whisperFrom: walletAddress }, { whisperTo: walletAddress });
        }
        if (playerName) {
            or.push(
                { 'metadata.fromName': playerName },
                { 'metadata.toName': playerName }
            );
        }
        if (or.length === 0) return [];

        const docs = await ChatMessage.find({ channel: 'whisper', $or: or })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        return docs.reverse();
    }

    async getLoginHistory(walletAddress, roomId, playerName) {
        await connectDB().catch(() => {});

        const [globalMsgs, roomMsgs, casinoMsgs, announcementMsgs, marketMsgs, whisperMsgs] = await Promise.all([
            this.getScopeHistory('global', 'global'),
            roomId ? this.getScopeHistory('room', roomId) : Promise.resolve([]),
            this.getScopeHistory('casino', 'casino'),
            this.getScopeHistory('announcement', 'announcements'),
            this.getScopeHistory('market', 'market'),
            this.getWhisperHistory(walletAddress, playerName)
        ]);

        return {
            global: globalMsgs,
            room: roomMsgs,
            guild: [],
            whisper: whisperMsgs,
            casino: casinoMsgs,
            announcement: announcementMsgs,
            market: marketMsgs
        };
    }

    formatHistoryForPlayer(history, playerId, walletAddress) {
        const formatted = {};
        for (const [channel, docs] of Object.entries(history)) {
            formatted[channel] = (docs || []).map((doc) =>
                this.toClientPayload(doc, playerId)
            );
        }
        return formatted;
    }
}

export default new ChatService();
