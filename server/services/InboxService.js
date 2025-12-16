/**
 * InboxService - Per-player message inbox management
 * Handles challenge notifications, responses, and system messages
 */

class InboxService {
    constructor() {
        // In-memory inbox storage (playerId -> messages[])
        // TODO: Replace with database for persistence
        this.inboxes = new Map();
        this.nextMessageId = 1;
    }

    /**
     * Get or create inbox for a player
     */
    getInbox(playerId) {
        if (!this.inboxes.has(playerId)) {
            this.inboxes.set(playerId, []);
        }
        return this.inboxes.get(playerId);
    }

    /**
     * Add a message to player's inbox
     */
    addMessage(playerId, message) {
        const inbox = this.getInbox(playerId);
        const fullMessage = {
            id: `msg_${this.nextMessageId++}`,
            recipientId: playerId,
            read: false,
            createdAt: Date.now(),
            ...message
        };
        inbox.unshift(fullMessage); // Add to beginning (newest first)
        
        // Keep inbox size reasonable (max 50 messages)
        if (inbox.length > 50) {
            inbox.pop();
        }
        
        return fullMessage;
    }

    /**
     * Add a challenge to player's inbox
     */
    addChallenge(targetPlayerId, challenge) {
        return this.addMessage(targetPlayerId, {
            type: 'challenge',
            challengeId: challenge.id,
            challengerId: challenge.challengerId,
            challengerName: challenge.challengerName,
            challengerAppearance: challenge.challengerAppearance,
            gameType: challenge.gameType,
            wagerAmount: challenge.wagerAmount,
            expiresAt: challenge.expiresAt
        });
    }

    /**
     * Add a challenge response notification
     */
    addChallengeResponse(playerId, response) {
        return this.addMessage(playerId, {
            type: 'challenge_response',
            response: response.type, // 'accepted', 'denied', 'deleted', 'expired'
            challengeId: response.challengeId,
            otherPlayerName: response.otherPlayerName,
            gameType: response.gameType,
            wagerAmount: response.wagerAmount
        });
    }

    /**
     * Add a system message
     */
    addSystemMessage(playerId, text, data = {}) {
        return this.addMessage(playerId, {
            type: 'system',
            text,
            data
        });
    }

    /**
     * Mark message as read
     */
    markRead(playerId, messageId) {
        const inbox = this.getInbox(playerId);
        const message = inbox.find(m => m.id === messageId);
        if (message) {
            message.read = true;
            return true;
        }
        return false;
    }

    /**
     * Delete a message from inbox
     */
    deleteMessage(playerId, messageId) {
        const inbox = this.getInbox(playerId);
        const index = inbox.findIndex(m => m.id === messageId);
        if (index !== -1) {
            inbox.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Delete challenge message by challenge ID
     */
    deleteByChallengeId(playerId, challengeId) {
        const inbox = this.getInbox(playerId);
        const index = inbox.findIndex(m => m.challengeId === challengeId);
        if (index !== -1) {
            inbox.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get unread count
     */
    getUnreadCount(playerId) {
        const inbox = this.getInbox(playerId);
        return inbox.filter(m => !m.read).length;
    }

    /**
     * Get all messages for sync
     */
    getMessages(playerId) {
        return this.getInbox(playerId);
    }

    /**
     * Clean up expired challenge messages
     */
    cleanupExpired() {
        const now = Date.now();
        for (const [playerId, inbox] of this.inboxes) {
            // Remove expired challenges
            const filtered = inbox.filter(msg => {
                if (msg.type === 'challenge' && msg.expiresAt && msg.expiresAt < now) {
                    return false;
                }
                return true;
            });
            this.inboxes.set(playerId, filtered);
        }
    }
}

export default InboxService;





