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
import DogGenerators, { DOG_PALETTE, DOG_PALETTES, generateDogPalette } from './DogCharacter';
import FrogGenerators, { FROG_PALETTE, FROG_PALETTES, generateFrogPalette } from './FrogCharacter';

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

characterRegistry.registerCharacter('dog', {
    name: 'Dog',
    description: 'A loyal and magical dog companion',
    generators: DogGenerators,
    palette: DOG_PALETTE,
    palettes: DOG_PALETTES,  // Color variants mapped to skin colors
    isSecret: true,
    previewScale: 0.85,
    customizationOptions: {
        disableSkinColor: false,  // Enable color selection!
        disableHats: false,       // Allow hats - wizard hat available via WZRDOG promo code
        disableEyes: true,
        disableMouth: true,
        disableBodyItems: false,
    }
});

characterRegistry.registerCharacter('frog', {
    name: 'PEPE Frog',
    description: 'The legendary PEPE frog - feels good man',
    generators: FrogGenerators,
    palette: FROG_PALETTE,
    palettes: FROG_PALETTES,
    isSecret: true,
    previewScale: 0.85,
    customizationOptions: {
        disableSkinColor: false,  // Enable color variants
        disableHats: false,       // Allow hats on the frog!
        disableEyes: true,        // Frog has its own eyes
        disableMouth: true,       // Frog has its own mouth
        disableBodyItems: false,  // Allow body items
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
    DogGenerators,
    DOG_PALETTE,
    DOG_PALETTES,
    generateDogPalette,
    FrogGenerators,
    FROG_PALETTE,
    FROG_PALETTES,
    generateFrogPalette
};
export default characterRegistry;
