/**
 * Characters Module - Central export for character system
 * 
 * Character unlocks are SERVER-AUTHORITATIVE - no promo codes stored client-side
 * 
 * Usage:
 *   import { characterRegistry, MarcusGenerators } from './characters';
 *   
 *   // Get character config
 *   const char = characterRegistry.getCharacter('marcus');
 *   
 *   // Get character generators
 *   const generators = characterRegistry.getCharacter('marcus').generators;
 */

import characterRegistry from './CharacterRegistry';
import MarcusGenerators, { MARCUS_PALETTE } from './MarcusCharacter';
import WhiteWhaleGenerators, { 
    WHITE_WHALE_PALETTE,
    BlackWhaleGenerators,
    BLACK_WHALE_PALETTE,
    SilverWhaleGenerators,
    SILVER_WHALE_PALETTE,
    GoldWhaleGenerators,
    GOLD_WHALE_PALETTE
} from './WhiteWhaleCharacter';
import DoginalGenerators, { DOGINAL_PALETTE, DOG_PALETTES, generateDogPalette } from './DoginalCharacter';

// Register all characters (unlocks determined by server)
characterRegistry.registerCharacter('penguin', {
    name: 'Penguin',
    description: 'The classic WaddleBet penguin character',
    generators: null, // Uses default penguin generators
    isSecret: false,
});

characterRegistry.registerCharacter('marcus', {
    name: 'Marcus',
    description: 'A mysterious peanut-headed creature with lanky limbs',
    generators: MarcusGenerators,
    palette: MARCUS_PALETTE,
    isSecret: true,
    previewScale: 0.8,
    customizationOptions: {
        disableSkinColor: true,
        disableHats: true,
        disableEyes: true,
        disableMouth: true,
        disableBodyItems: false,
    }
});

characterRegistry.registerCharacter('whiteWhale', {
    name: 'White Whale',
    description: 'A majestic whale-headed creature from the deep',
    generators: WhiteWhaleGenerators,
    palette: WHITE_WHALE_PALETTE,
    isSecret: true,
    previewScale: 0.85,
    customizationOptions: {
        disableSkinColor: true,
        disableHats: true,
        disableEyes: true,
        disableMouth: true,
        disableBodyItems: false,
    }
});

characterRegistry.registerCharacter('blackWhale', {
    name: 'Black Whale',
    description: 'A sleek dark whale from the abyss',
    generators: BlackWhaleGenerators,
    palette: BLACK_WHALE_PALETTE,
    isSecret: true,
    previewScale: 0.85,
    customizationOptions: {
        disableSkinColor: true,
        disableHats: true,
        disableEyes: true,
        disableMouth: true,
        disableBodyItems: false,
    }
});

characterRegistry.registerCharacter('silverWhale', {
    name: 'Silver Whale',
    description: 'A shimmering whale with metallic scales',
    generators: SilverWhaleGenerators,
    palette: SILVER_WHALE_PALETTE,
    isSecret: true,
    previewScale: 0.85,
    customizationOptions: {
        disableSkinColor: true,
        disableHats: true,
        disableEyes: true,
        disableMouth: true,
        disableBodyItems: false,
    }
});

characterRegistry.registerCharacter('goldWhale', {
    name: 'Gold Whale',
    description: 'A legendary golden whale of immense wealth',
    generators: GoldWhaleGenerators,
    palette: GOLD_WHALE_PALETTE,
    isSecret: true,
    previewScale: 0.85,
    customizationOptions: {
        disableSkinColor: true,
        disableHats: true,
        disableEyes: true,
        disableMouth: true,
        disableBodyItems: false,
    }
});

characterRegistry.registerCharacter('doginal', {
    name: 'Doginal',
    description: 'A loyal and magical dog companion with a wizard hat',
    generators: DoginalGenerators,
    palette: DOGINAL_PALETTE,
    palettes: DOG_PALETTES,  // Color variants mapped to skin colors
    isSecret: true,
    previewScale: 0.85,
    customizationOptions: {
        disableSkinColor: false,  // Enable color selection!
        disableHats: false,       // Allow hats - wizard hat by default!
        disableEyes: true,
        disableMouth: true,
        disableBodyItems: false,
    }
});

// Export everything
export { 
    characterRegistry, 
    MarcusGenerators, 
    MARCUS_PALETTE, 
    WhiteWhaleGenerators, 
    WHITE_WHALE_PALETTE,
    BlackWhaleGenerators,
    BLACK_WHALE_PALETTE,
    SilverWhaleGenerators,
    SILVER_WHALE_PALETTE,
    GoldWhaleGenerators,
    GOLD_WHALE_PALETTE,
    DoginalGenerators,
    DOGINAL_PALETTE,
    DOG_PALETTES,
    generateDogPalette
};
export default characterRegistry;
