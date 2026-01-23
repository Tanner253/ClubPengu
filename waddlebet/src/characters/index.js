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
import FrogGenerators, { FROG_PALETTE, FROG_PALETTES, generateFrogPalette } from './FrogCharacter';
import ShrimpGenerators, { SHRIMP_PALETTE, SHRIMP_PALETTES, generateShrimpPalette } from './ShrimpCharacter';
import DuckGenerators, { DUCK_PALETTE, DUCK_PALETTES } from './DuckCharacter';
import TungTungGenerators, { TUNG_PALETTE } from './TungTungCharacter';

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

characterRegistry.registerCharacter('shrimp', {
    name: 'Shrimp',
    description: 'A cute shrimp with tail flappers and antennae',
    generators: ShrimpGenerators,
    palette: SHRIMP_PALETTE,
    palettes: SHRIMP_PALETTES,
    isSecret: true,
    previewScale: 0.8,
    customizationOptions: {
        disableSkinColor: false,  // Enable color variants (orange, raw, golden, blue)
        disableHats: false,       // Allow hats
        disableEyes: true,        // Shrimp has its own eye stalks
        disableMouth: true,       // Shrimp has rostrum
        disableBodyItems: false,  // Allow body items
    }
});

characterRegistry.registerCharacter('duck', {
    name: 'Duck',
    description: 'A friendly duck with a bright orange bill',
    generators: DuckGenerators,
    palette: DUCK_PALETTE,
    palettes: DUCK_PALETTES,
    isSecret: true,
    previewScale: 0.9,
    customizationOptions: {
        disableSkinColor: true,   // Duck has fixed yellow coloring
        disableHats: false,       // Allow hats on the duck
        disableEyes: true,        // Duck has its own eyes built into model
        disableMouth: true,       // Duck has a bill built into model
        disableBodyItems: false,  // Allow body items (shirts)
        disableMounts: false,     // Allow mounts
    }
});

characterRegistry.registerCharacter('tungTung', {
    name: 'Tung Tung Tung Sahur',
    description: 'The legendary log creature with a baseball bat - Tung Tung Tung Sahur!',
    generators: TungTungGenerators,
    palette: TUNG_PALETTE,
    isSecret: true,
    previewScale: 0.75,
    customizationOptions: {
        disableSkinColor: true,   // Fixed wood/tan coloring
        disableHats: true,        // No hats - head is part of the log
        disableEyes: false,       // Allow eyes customization
        disableMouth: false,      // Allow mouth customization
        disableBodyItems: true,   // Has bat already, no body items
        disableMounts: false,     // Allow mounts
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
    generateDogPalette,
    FrogGenerators,
    FROG_PALETTE,
    FROG_PALETTES,
    generateFrogPalette,
    ShrimpGenerators,
    SHRIMP_PALETTE,
    SHRIMP_PALETTES,
    generateShrimpPalette,
    DuckGenerators,
    DUCK_PALETTE,
    DUCK_PALETTES,
    TungTungGenerators,
    TUNG_PALETTE
};
export default characterRegistry;
