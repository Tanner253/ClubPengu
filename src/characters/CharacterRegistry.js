/**
 * CharacterRegistry - OOP registry for managing character types and promo codes
 * Designed for scalability - easily add new characters with promo codes
 */

class CharacterRegistry {
    constructor() {
        this.characters = new Map();
        this.promoCodes = new Map();
        this.unlockedCharacters = new Set(['penguin']); // Penguin is always unlocked
        
        // Load unlocked characters from localStorage
        this._loadUnlocked();
    }
    
    /**
     * Register a new character type
     * @param {string} id - Unique character identifier
     * @param {Object} config - Character configuration
     */
    registerCharacter(id, config) {
        this.characters.set(id, {
            id,
            name: config.name,
            description: config.description || '',
            promoCode: config.promoCode || null,
            generators: config.generators,
            palette: config.palette || {},
            customizationOptions: config.customizationOptions || {},
            isSecret: config.isSecret || false,
            previewScale: config.previewScale || 1,
        });
        
        // Register promo code mapping if exists
        if (config.promoCode) {
            this.promoCodes.set(config.promoCode.toUpperCase(), id);
        }
        
        return this;
    }
    
    /**
     * Check if a promo code is valid and unlock the character
     * @param {string} code - Promo code to check
     * @returns {Object|null} - Character info if valid, null otherwise
     */
    redeemPromoCode(code) {
        const upperCode = code.toUpperCase().trim();
        const characterId = this.promoCodes.get(upperCode);
        
        if (characterId && this.characters.has(characterId)) {
            this.unlockedCharacters.add(characterId);
            this._saveUnlocked();
            return this.characters.get(characterId);
        }
        
        return null;
    }
    
    /**
     * Check if a character is unlocked
     * @param {string} id - Character ID
     * @returns {boolean}
     */
    isUnlocked(id) {
        return this.unlockedCharacters.has(id);
    }
    
    /**
     * Get character by ID
     * @param {string} id - Character ID
     * @returns {Object|null}
     */
    getCharacter(id) {
        return this.characters.get(id) || null;
    }
    
    /**
     * Get all unlocked characters
     * @returns {Array}
     */
    getUnlockedCharacters() {
        return Array.from(this.unlockedCharacters)
            .map(id => this.characters.get(id))
            .filter(Boolean);
    }
    
    /**
     * Get all available character IDs (unlocked only)
     * @returns {Array<string>}
     */
    getAvailableCharacterIds() {
        return Array.from(this.unlockedCharacters).filter(id => this.characters.has(id));
    }
    
    /**
     * Check if promo code exists (without redeeming)
     * @param {string} code - Promo code
     * @returns {boolean}
     */
    isValidPromoCode(code) {
        return this.promoCodes.has(code.toUpperCase().trim());
    }
    
    _loadUnlocked() {
        try {
            const saved = localStorage.getItem('unlocked_characters');
            if (saved) {
                const parsed = JSON.parse(saved);
                parsed.forEach(id => this.unlockedCharacters.add(id));
            }
        } catch (e) {
            console.warn('Failed to load unlocked characters:', e);
        }
    }
    
    _saveUnlocked() {
        try {
            localStorage.setItem('unlocked_characters', 
                JSON.stringify(Array.from(this.unlockedCharacters)));
        } catch (e) {
            console.warn('Failed to save unlocked characters:', e);
        }
    }
}

// Singleton instance
const characterRegistry = new CharacterRegistry();

export default characterRegistry;
export { CharacterRegistry };





