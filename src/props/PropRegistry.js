/**
 * PropRegistry - Factory for creating props by type
 * Provides a simple API for spawning props without importing each class
 */

import PineTree from './PineTree';
import Igloo from './Igloo';
import SKNYIgloo from './SKNYIgloo';
import LampPost from './LampPost';
import Bench from './Bench';
import SnowPile from './SnowPile';
import Signpost from './Signpost';
import Rock from './Rock';
import Snowman from './Snowman';
import Fence from './Fence';
import Campfire from './Campfire';
import LogSeat from './LogSeat';
import ChristmasTree from './ChristmasTree';
import Billboard from './Billboard';
import Mailbox from './Mailbox';
import TrashCan from './TrashCan';
import Barrel from './Barrel';
import FireHydrant from './FireHydrant';
import IceSculpture from './IceSculpture';
import Crate from './Crate';
import StreetSign from './StreetSign';
import WoodenPost from './WoodenPost';

/**
 * Available prop types
 */
export const PROP_TYPES = {
    PINE_TREE: 'pineTree',
    IGLOO: 'igloo',
    SKNY_IGLOO: 'sknyIgloo',
    LAMP_POST: 'lampPost',
    BENCH: 'bench',
    SNOW_PILE: 'snowPile',
    SIGNPOST: 'signpost',
    ROCK: 'rock',
    SNOWMAN: 'snowman',
    FENCE: 'fence',
    CAMPFIRE: 'campfire',
    LOG_SEAT: 'logSeat',
    CHRISTMAS_TREE: 'christmasTree',
    BILLBOARD: 'billboard',
    // Quality of life props
    MAILBOX: 'mailbox',
    TRASH_CAN: 'trashCan',
    BARREL: 'barrel',
    FIRE_HYDRANT: 'fireHydrant',
    ICE_SCULPTURE: 'iceSculpture',
    CRATE: 'crate',
    STREET_SIGN: 'streetSign',
    WOODEN_POST: 'woodenPost',
};

/**
 * Prop class registry
 */
const propClasses = {
    [PROP_TYPES.PINE_TREE]: PineTree,
    [PROP_TYPES.IGLOO]: Igloo,
    [PROP_TYPES.SKNY_IGLOO]: SKNYIgloo,
    [PROP_TYPES.LAMP_POST]: LampPost,
    [PROP_TYPES.BENCH]: Bench,
    [PROP_TYPES.SNOW_PILE]: SnowPile,
    [PROP_TYPES.SIGNPOST]: Signpost,
    [PROP_TYPES.ROCK]: Rock,
    [PROP_TYPES.SNOWMAN]: Snowman,
    [PROP_TYPES.FENCE]: Fence,
    [PROP_TYPES.CAMPFIRE]: Campfire,
    [PROP_TYPES.LOG_SEAT]: LogSeat,
    [PROP_TYPES.CHRISTMAS_TREE]: ChristmasTree,
    [PROP_TYPES.BILLBOARD]: Billboard,
    [PROP_TYPES.MAILBOX]: Mailbox,
    [PROP_TYPES.TRASH_CAN]: TrashCan,
    [PROP_TYPES.BARREL]: Barrel,
    [PROP_TYPES.FIRE_HYDRANT]: FireHydrant,
    [PROP_TYPES.ICE_SCULPTURE]: IceSculpture,
    [PROP_TYPES.CRATE]: Crate,
    [PROP_TYPES.STREET_SIGN]: StreetSign,
    [PROP_TYPES.WOODEN_POST]: WoodenPost,
};

/**
 * Create and spawn a prop by type
 * @param {THREE} THREE - Three.js library
 * @param {THREE.Scene} scene - Scene to add prop to
 * @param {string} type - Prop type from PROP_TYPES
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} z - Z position
 * @param {Object} options - Prop-specific options
 * @returns {BaseProp} - The spawned prop instance
 */
export const createProp = (THREE, scene, type, x, y, z, options = {}) => {
    const PropClass = propClasses[type];
    
    if (!PropClass) {
        console.warn(`Unknown prop type: ${type}`);
        return null;
    }
    
    // Create prop instance with appropriate constructor args
    let prop;
    
    switch (type) {
        case PROP_TYPES.PINE_TREE:
            prop = new PropClass(THREE, options.size || 'medium');
            break;
            
        case PROP_TYPES.IGLOO:
            prop = new PropClass(THREE, options.withEntrance !== false);
            break;
            
        case PROP_TYPES.SKNY_IGLOO:
            prop = new PropClass(THREE);
            break;
            
        case PROP_TYPES.LAMP_POST:
            prop = new PropClass(THREE, options.isOn !== false, options.castShadow || false);
            break;
            
        case PROP_TYPES.BENCH:
            prop = new PropClass(THREE, options.withSnow !== false);
            break;
            
        case PROP_TYPES.SNOW_PILE:
            prop = new PropClass(THREE, options.size || 'medium');
            break;
            
        case PROP_TYPES.SIGNPOST:
            prop = new PropClass(THREE, options.signs || [{ text: 'TOWN', direction: 0 }]);
            break;
            
        case PROP_TYPES.ROCK:
            prop = new PropClass(THREE, options.size || 'medium');
            break;
            
        case PROP_TYPES.FENCE:
            prop = new PropClass(THREE, options.length || 4);
            break;
            
        case PROP_TYPES.CAMPFIRE:
            prop = new PropClass(THREE, options.isLit !== false);
            break;
            
        case PROP_TYPES.LOG_SEAT:
            prop = new PropClass(THREE, options.rotation || 0);
            break;
            
        case PROP_TYPES.BILLBOARD:
            prop = new PropClass(THREE);
            break;
            
        case PROP_TYPES.MAILBOX:
            prop = new PropClass(THREE, options.style || 'classic');
            break;
            
        case PROP_TYPES.TRASH_CAN:
            prop = new PropClass(THREE, options.withLid !== false);
            break;
            
        case PROP_TYPES.BARREL:
            prop = new PropClass(THREE, options.size || 'medium');
            break;
            
        case PROP_TYPES.FIRE_HYDRANT:
            prop = new PropClass(THREE, options.color || 0xCC2222);
            break;
            
        case PROP_TYPES.ICE_SCULPTURE:
            prop = new PropClass(THREE, options.sculptureType || 'penguin', options.rotation || 0, options.isLordFishnu || false);
            break;
            
        case PROP_TYPES.CRATE:
            prop = new PropClass(THREE, options.size || 'medium');
            break;
            
        case PROP_TYPES.STREET_SIGN:
            prop = new PropClass(THREE, options.signType || 'arrow');
            break;
            
        case PROP_TYPES.WOODEN_POST:
            prop = new PropClass(THREE, options.style || 'plain');
            break;
            
        default:
            prop = new PropClass(THREE);
    }
    
    // Spawn the prop
    prop.spawn(scene, x, y, z, options);
    
    // Apply rotation if specified
    if (options.rotationY !== undefined && prop.setRotation) {
        prop.setRotation(options.rotationY);
    }
    
    return prop;
};

/**
 * Get list of available prop types
 * @returns {string[]}
 */
export const getAvailablePropTypes = () => Object.values(PROP_TYPES);

/**
 * Check if a prop type exists
 * @param {string} type
 * @returns {boolean}
 */
export const isPropType = (type) => Object.values(PROP_TYPES).includes(type);

export default { createProp, PROP_TYPES, getAvailablePropTypes, isPropType };

