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

// Export everything
export { characterRegistry, MarcusGenerators, MARCUS_PALETTE };
export default characterRegistry;
