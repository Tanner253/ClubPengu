/**
 * GameManager - Singleton class managing global game state
 * Handles coins, inventory, progression, and persistence
 */
class GameManager {
    static instance = null;
    
    constructor() {
        if (GameManager.instance) {
            return GameManager.instance;
        }
        
        this.coins = 0;
        this.inventory = [];
        this.stamps = [];
        this.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            distanceWalked: 0,
            chatsSent: 0
        };
        this.unlockedItems = ['none']; // Default unlocked items
        this.currentRoom = 'town';
        this.listeners = new Map();
        
        this.load();
        GameManager.instance = this;
    }
    
    static getInstance() {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }
    
    // --- COINS ---
    addCoins(amount, reason = 'unknown') {
        this.coins += amount;
        this.emit('coinsChanged', { coins: this.coins, delta: amount, reason });
        this.save();
        return this.coins;
    }
    
    spendCoins(amount) {
        if (this.coins >= amount) {
            this.coins -= amount;
            this.emit('coinsChanged', { coins: this.coins, delta: -amount, reason: 'purchase' });
            this.save();
            return true;
        }
        return false;
    }
    
    getCoins() {
        return this.coins;
    }
    
    // --- INVENTORY ---
    addItem(item) {
        if (!this.inventory.includes(item)) {
            this.inventory.push(item);
            this.emit('inventoryChanged', { inventory: this.inventory, added: item });
            this.save();
        }
    }
    
    hasItem(item) {
        return this.inventory.includes(item) || this.unlockedItems.includes(item);
    }
    
    // --- STAMPS ---
    earnStamp(stampId, name) {
        if (!this.stamps.find(s => s.id === stampId)) {
            const stamp = { id: stampId, name, earnedAt: Date.now() };
            this.stamps.push(stamp);
            this.emit('stampEarned', stamp);
            this.addCoins(50, 'stamp'); // Bonus coins for stamps
            this.save();
            return true;
        }
        return false;
    }
    
    hasStamp(stampId) {
        return this.stamps.some(s => s.id === stampId);
    }
    
    // --- STATS ---
    incrementStat(statName, amount = 1) {
        if (this.stats[statName] !== undefined) {
            this.stats[statName] += amount;
            this.save();
        }
    }
    
    getStat(statName) {
        return this.stats[statName] || 0;
    }
    
    // --- ROOM MANAGEMENT ---
    setRoom(roomId) {
        const previousRoom = this.currentRoom;
        this.currentRoom = roomId;
        this.emit('roomChanged', { from: previousRoom, to: roomId });
    }
    
    getRoom() {
        return this.currentRoom;
    }
    
    // --- EVENT SYSTEM ---
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
    
    // --- PERSISTENCE ---
    save() {
        try {
            const data = {
                coins: this.coins,
                inventory: this.inventory,
                stamps: this.stamps,
                stats: this.stats,
                unlockedItems: this.unlockedItems,
                savedAt: Date.now()
            };
            localStorage.setItem('clubpenguin_save', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save game:', e);
        }
    }
    
    load() {
        try {
            const saved = localStorage.getItem('clubpenguin_save');
            if (saved) {
                const data = JSON.parse(saved);
                this.coins = data.coins || 0;
                this.inventory = data.inventory || [];
                this.stamps = data.stamps || [];
                this.stats = { ...this.stats, ...data.stats };
                this.unlockedItems = data.unlockedItems || ['none'];
                console.log('Game loaded! Coins:', this.coins);
            }
        } catch (e) {
            console.warn('Failed to load game:', e);
        }
    }
    
    reset() {
        this.coins = 0; // New players start with 0 coins
        this.inventory = [];
        this.stamps = [];
        this.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            distanceWalked: 0,
            chatsSent: 0
        };
        this.save();
        this.emit('gameReset', {});
    }
}

export default GameManager;




