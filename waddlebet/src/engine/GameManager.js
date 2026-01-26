/**
 * GameManager - Singleton class managing global game state
 * Server-authoritative for authenticated users
 * NO persistence for guests - fresh start every session
 */
class GameManager {
    static instance = null;
    
    constructor() {
        if (GameManager.instance) {
            return GameManager.instance;
        }
        
        // Core state - defaults for guests
        this.coins = 0;
        this.inventory = [];
        this.stamps = [];
        this.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            distanceWalked: 0,
            chatsSent: 0
        };
        this.gameStats = null;
        this.unlockedItems = ['none']; // Only base items for guests
        this.currentRoom = 'town';
        this.listeners = new Map();
        
        // Server sync state
        this.isServerAuthoritative = false;
        this.serverData = null;
        this.lastSyncTime = null;
        
        // Appearance cache (temporary for guests)
        this.appearance = {};
        
        // DON'T load from localStorage - guests start fresh
        // Only authenticated users get their data (from server)
        
        GameManager.instance = this;
    }
    
    static getInstance() {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }
    
    // ==================== MIGRATION SUPPORT ====================
    
    /**
     * Get localStorage data for migration to server (first-time auth)
     * This is called ONCE when user authenticates for the first time
     */
    getMigrationData() {
        try {
            const saved = localStorage.getItem('clubpenguin_save');
            if (!saved) return null;
            
            const data = JSON.parse(saved);
            console.log('📦 Found localStorage data for migration:', data);
            return {
                coins: data.coins || 0,
                stamps: data.stamps || [],
                stats: data.stats || {},
                unlockedItems: data.unlockedItems || []
            };
        } catch (e) {
            console.warn('Failed to read migration data:', e);
            return null;
        }
    }
    
    /**
     * Clear localStorage game data after successful migration
     * Called after auth_success for first-time users
     */
    clearMigrationData() {
        try {
            // Clear game save data
            localStorage.removeItem('clubpenguin_save');
            // Clear cosmetic unlocks (now server-managed)
            localStorage.removeItem('unlocked_mounts');
            localStorage.removeItem('unlocked_cosmetics');
            console.log('🧹 Cleared localStorage migration data');
        } catch (e) {
            console.warn('Failed to clear migration data:', e);
        }
    }
    
    // ==================== SERVER SYNC ====================
    
    /**
     * Sync all data from server (called on auth success)
     */
    syncFromServer(userData, isNewUser = false) {
        this.isServerAuthoritative = true;
        this.serverData = userData;
        this.lastSyncTime = Date.now();
        
        // Update local state from server
        this.coins = userData.coins || 0;
        this.inventory = userData.inventory || [];
        this.stamps = userData.stamps || [];
        this.unlockedItems = [
            'none', // Always include base
            ...(userData.unlockedCosmetics || []),
            ...(userData.unlockedMounts || [])
        ];
        this.gameStats = userData.gameStats || null;
        this.appearance = userData.customization || {};
        
        // Store puffles from server (critical for persistence)
        this.puffles = userData.puffles || [];
        
        // Merge server stats
        if (userData.stats) {
            this.stats = {
                ...this.stats,
                gamesPlayed: userData.gameStats?.overall?.totalGamesPlayed || 0,
                gamesWon: userData.gameStats?.overall?.totalGamesWon || 0,
                ...userData.stats.session
            };
        }
        
        // Clear migration data after first successful sync
        if (isNewUser) {
            this.clearMigrationData();
        }
        
        console.log(`📦 GameManager synced from server: ${this.coins} coins, ${this.puffles?.length || 0} puffles`);
        this.emit('serverSync', { userData });
        this.emit('coinsChanged', { coins: this.coins, delta: 0, reason: 'sync' });
        
        // Emit puffle update event
        if (this.puffles?.length > 0) {
            this.emit('pufflesLoaded', { puffles: this.puffles });
        }
    }
    
    /**
     * Set coins from server (authoritative update)
     */
    setCoinsFromServer(coins) {
        if (!this.isServerAuthoritative) return;
        
        const delta = coins - this.coins;
        this.coins = coins;
        this.emit('coinsChanged', { coins: this.coins, delta, reason: 'server' });
    }
    
    /**
     * Update stats from server
     */
    updateStats(serverStats) {
        if (serverStats) {
            if (serverStats.cardJitsuWins !== undefined) {
                this.stats = {
                    ...this.stats,
                    cardJitsuWins: serverStats.cardJitsuWins,
                    cardJitsuLosses: serverStats.cardJitsuLosses,
                    ticTacToeWins: serverStats.ticTacToeWins,
                    ticTacToeLosses: serverStats.ticTacToeLosses,
                    connect4Wins: serverStats.connect4Wins,
                    connect4Losses: serverStats.connect4Losses,
                    totalWins: serverStats.totalWins,
                    totalLosses: serverStats.totalLosses
                };
            }
            this.emit('statsUpdated', serverStats);
        }
    }
    
    /**
     * Clear server data (on logout)
     */
    clearServerData() {
        this.isServerAuthoritative = false;
        this.serverData = null;
        this.lastSyncTime = null;
        
        // Reset to guest defaults - no persistence
        this.coins = 0;
        this.inventory = [];
        this.stamps = [];
        this.unlockedItems = ['none'];
        this.gameStats = null;
        this.puffles = [];
        this.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            distanceWalked: 0,
            chatsSent: 0
        };
        
        // CRITICAL: Clear appearance to prevent data leaking between wallets
        this.appearance = {};
        
        this.emit('serverSync', { userData: null });
        this.emit('dataCleared', {});
        this.emit('pufflesLoaded', { puffles: [] });
    }
    
    // ==================== PUFFLES ====================
    
    /**
     * Get user's puffles
     */
    getPuffles() {
        return this.puffles || [];
    }
    
    /**
     * Get active puffle
     */
    getActivePuffle() {
        return this.puffles?.find(p => p.isActive) || null;
    }
    
    /**
     * Update puffles list (after server operation)
     */
    updatePuffles(puffles) {
        this.puffles = puffles;
        if (this.serverData) {
            this.serverData.puffles = puffles;
        }
        this.emit('pufflesLoaded', { puffles });
    }
    
    /**
     * Add a new puffle to the list
     */
    addPuffle(puffle) {
        if (!this.puffles) this.puffles = [];
        this.puffles.push(puffle);
        if (this.serverData) {
            this.serverData.puffles = this.puffles;
        }
        this.emit('pufflesLoaded', { puffles: this.puffles });
    }
    
    // ==================== COINS ====================
    
    /**
     * Add coins - ONLY works for authenticated users via server
     */
    addCoins(amount, reason = 'unknown') {
        if (this.isServerAuthoritative) {
            // Server-authoritative: don't modify locally, wait for server update
            console.log(`💰 Coins will be updated by server: ${reason}`);
            return this.coins;
        }
        
        // Guests can't earn coins - log and ignore
        console.log(`⚠️ Guest tried to earn coins: ${amount} (${reason}) - ignored`);
        return this.coins;
    }
    
    /**
     * Spend coins - ONLY for authenticated users via server
     */
    spendCoins(amount) {
        if (this.isServerAuthoritative) {
            console.log('💰 Purchases handled by server');
            return false;
        }
        
        // Guests can't spend coins
        console.log('⚠️ Guest tried to spend coins - ignored');
        return false;
    }
    
    getCoins() {
        return this.coins;
    }
    
    /**
     * Check if player can afford something
     */
    canAfford(amount) {
        return this.isServerAuthoritative && this.coins >= amount;
    }
    
    // ==================== INVENTORY & UNLOCKS ====================
    
    addItem(item) {
        if (!this.isServerAuthoritative) {
            console.log('⚠️ Guest tried to add item - ignored');
            return;
        }
        if (!this.inventory.includes(item)) {
            this.inventory.push(item);
            this.emit('inventoryChanged', { inventory: this.inventory, added: item });
        }
    }
    
    hasItem(item) {
        // Base items always available
        if (item === 'none') return true;
        return this.inventory.includes(item) || this.unlockedItems.includes(item);
    }
    
    // ==================== STAMPS ====================
    
    earnStamp(stampId, name) {
        if (!this.isServerAuthoritative) {
            console.log('⚠️ Guest tried to earn stamp - ignored');
            return false;
        }
        
        if (!this.stamps.find(s => s.id === stampId)) {
            const stamp = { id: stampId, name, earnedAt: Date.now() };
            this.stamps.push(stamp);
            this.emit('stampEarned', stamp);
            return true;
        }
        return false;
    }
    
    hasStamp(stampId) {
        return this.stamps.some(s => s.id === stampId);
    }
    
    // ==================== STATS ====================
    
    incrementStat(statName, amount = 1) {
        // Stats only matter for authenticated users
        if (!this.isServerAuthoritative) return;
        
        if (this.stats[statName] !== undefined) {
            this.stats[statName] += amount;
        }
    }
    
    getStat(statName) {
        return this.stats[statName] || 0;
    }
    
    getGameStats() {
        return this.gameStats;
    }
    
    // ==================== APPEARANCE ====================
    
    setAppearance(appearance) {
        this.appearance = appearance || {};
    }
    
    getAppearance() {
        return this.appearance;
    }
    
    // ==================== ROOM ====================
    
    setRoom(roomId) {
        const previousRoom = this.currentRoom;
        this.currentRoom = roomId;
        this.emit('roomChanged', { from: previousRoom, to: roomId });
    }
    
    getRoom() {
        return this.currentRoom;
    }
    
    // ==================== EVENTS ====================
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        }
    }
    
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }
    
    // ==================== NO PERSISTENCE FOR GUESTS ====================
    // Removed save() and load() - guests don't persist, auth users use server
    
    /**
     * Check if game is in server-authoritative mode
     */
    isAuthenticatedMode() {
        return this.isServerAuthoritative;
    }
    
    /**
     * Get user data (for display)
     */
    getUserData() {
        return this.serverData;
    }
    
    /**
     * Reset to fresh state (for testing)
     */
    reset() {
        this.coins = 0;
        this.inventory = [];
        this.stamps = [];
        this.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            distanceWalked: 0,
            chatsSent: 0
        };
        this.gameStats = null;
        this.unlockedItems = ['none'];
        this.isServerAuthoritative = false;
        this.serverData = null;
        this.emit('gameReset', {});
    }
}

export default GameManager;
