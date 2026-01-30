#!/usr/bin/env node
/**
 * Seed Cosmetic Templates for Gacha System
 * 
 * This script populates the CosmeticTemplate collection with all available cosmetics.
 * It assigns rarities based on:
 * - glow/fx effects -> Higher rarity
 * - Animated effects -> Legendary+
 * - Promo exclusives -> NOT included in gacha pool
 * 
 * Run: node server/scripts/seedCosmetics.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import the model
import CosmeticTemplate from '../db/models/CosmeticTemplate.js';

// ========== PROMO EXCLUSIVE IDS (NOT in gacha pool) ==========
const PROMO_EXCLUSIVE_IDS = [
    // Eyes
    'lmao', 'bonkEyes', 'mistorEyes',
    // Hats
    'bonkExclamation', 'mistorHair',
    // Body Items
    'joe', 'bonkShirt', 'mistorShirt', 'penguShirt',
    // Mounts
    'penguMount', 'minecraftBoat'
];

// ========== FREE ITEMS (not gacha, always available) ==========
const FREE_ITEMS = ['none', 'normal', 'beak'];

// ========== FREE SKIN COLORS (only blue is free now) ==========
const FREE_SKIN_COLORS = ['blue'];

// ========== SKIN COLORS (for gacha drops) ==========
// Adding 100+ colors! Safe because skin colors are just hex values applied to mesh
// Organized by rarity tiers
const GACHA_SKIN_COLORS = {
    // ============ COMMON (former free colors + basic variations) ============
    // Original free colors (moved to common gacha)
    red: { rarity: 'common', name: 'Red', duplicateGold: 25, hexColor: '#CC2222' },
    green: { rarity: 'common', name: 'Green', duplicateGold: 25, hexColor: '#228B22' },
    yellow: { rarity: 'common', name: 'Yellow', duplicateGold: 25, hexColor: '#DAA520' },
    pink: { rarity: 'common', name: 'Pink', duplicateGold: 25, hexColor: '#FF69B4' },
    purple: { rarity: 'common', name: 'Purple', duplicateGold: 25, hexColor: '#6B2D8B' },
    orange: { rarity: 'common', name: 'Orange', duplicateGold: 25, hexColor: '#FF6600' },
    black: { rarity: 'common', name: 'Black', duplicateGold: 25, hexColor: '#1A1A1A' },
    white: { rarity: 'common', name: 'White', duplicateGold: 25, hexColor: '#F5F5F5' },
    cyan: { rarity: 'common', name: 'Cyan', duplicateGold: 25, hexColor: '#00CED1' },
    
    // Basic color variations
    grey: { rarity: 'common', name: 'Grey', duplicateGold: 25, hexColor: '#666666' },
    brown: { rarity: 'common', name: 'Brown', duplicateGold: 25, hexColor: '#5D4037' },
    beige: { rarity: 'common', name: 'Beige', duplicateGold: 25, hexColor: '#D4B896' },
    tan: { rarity: 'common', name: 'Tan', duplicateGold: 25, hexColor: '#C4A57B' },
    cream: { rarity: 'common', name: 'Cream', duplicateGold: 25, hexColor: '#FFF8DC' },
    ivory: { rarity: 'common', name: 'Ivory', duplicateGold: 25, hexColor: '#FFFFF0' },
    
    // ============ UNCOMMON (nice color variations) ============
    // Metallic tones
    gold: { rarity: 'uncommon', name: 'Gold', duplicateGold: 50, hexColor: '#DAA520' },
    silver: { rarity: 'uncommon', name: 'Silver', duplicateGold: 50, hexColor: '#A0A0A0' },
    bronze: { rarity: 'uncommon', name: 'Bronze', duplicateGold: 50, hexColor: '#CD7F32' },
    copper: { rarity: 'uncommon', name: 'Copper', duplicateGold: 50, hexColor: '#B87333' },
    platinum: { rarity: 'uncommon', name: 'Platinum', duplicateGold: 50, hexColor: '#E5E4E2' },
    
    // Nature tones
    teal: { rarity: 'uncommon', name: 'Teal', duplicateGold: 50, hexColor: '#008080' },
    lime: { rarity: 'uncommon', name: 'Lime', duplicateGold: 50, hexColor: '#32CD32' },
    coral: { rarity: 'uncommon', name: 'Coral', duplicateGold: 50, hexColor: '#E57373' },
    salmon: { rarity: 'uncommon', name: 'Salmon', duplicateGold: 50, hexColor: '#FA8072' },
    olive: { rarity: 'uncommon', name: 'Olive', duplicateGold: 50, hexColor: '#6B6B00' },
    forest: { rarity: 'uncommon', name: 'Forest', duplicateGold: 50, hexColor: '#228B22' },
    moss: { rarity: 'uncommon', name: 'Moss', duplicateGold: 50, hexColor: '#8A9A5B' },
    sage: { rarity: 'uncommon', name: 'Sage', duplicateGold: 50, hexColor: '#87AE73' },
    seafoam: { rarity: 'uncommon', name: 'Seafoam', duplicateGold: 50, hexColor: '#71EEB8' },
    
    // Sky/Water tones
    sky: { rarity: 'uncommon', name: 'Sky', duplicateGold: 50, hexColor: '#6BB3D9' },
    azure: { rarity: 'uncommon', name: 'Azure', duplicateGold: 50, hexColor: '#007FFF' },
    cerulean: { rarity: 'uncommon', name: 'Cerulean', duplicateGold: 50, hexColor: '#2A52BE' },
    aqua: { rarity: 'uncommon', name: 'Aqua', duplicateGold: 50, hexColor: '#00FFFF' },
    turquoise: { rarity: 'uncommon', name: 'Turquoise', duplicateGold: 50, hexColor: '#40E0D0' },
    
    // Warm tones
    tangerine: { rarity: 'uncommon', name: 'Tangerine', duplicateGold: 50, hexColor: '#FF9966' },
    peach: { rarity: 'uncommon', name: 'Peach', duplicateGold: 50, hexColor: '#FFCBA4' },
    apricot: { rarity: 'uncommon', name: 'Apricot', duplicateGold: 50, hexColor: '#FBCEB1' },
    amber: { rarity: 'uncommon', name: 'Amber', duplicateGold: 50, hexColor: '#FFBF00' },
    honey: { rarity: 'uncommon', name: 'Honey', duplicateGold: 50, hexColor: '#EB9605' },
    mustard: { rarity: 'uncommon', name: 'Mustard', duplicateGold: 50, hexColor: '#FFDB58' },
    rust: { rarity: 'uncommon', name: 'Rust', duplicateGold: 50, hexColor: '#B7410E' },
    
    // Cool tones
    periwinkle: { rarity: 'uncommon', name: 'Periwinkle', duplicateGold: 50, hexColor: '#CCCCFF' },
    lilac: { rarity: 'uncommon', name: 'Lilac', duplicateGold: 50, hexColor: '#C8A2C8' },
    mauve: { rarity: 'uncommon', name: 'Mauve', duplicateGold: 50, hexColor: '#E0B0FF' },
    plum: { rarity: 'uncommon', name: 'Plum', duplicateGold: 50, hexColor: '#8E4585' },
    
    // ============ RARE (distinctive colors) ============
    // Pastel tones
    lavender: { rarity: 'rare', name: 'Lavender', duplicateGold: 150, hexColor: '#B8A9C9' },
    mint: { rarity: 'rare', name: 'Mint', duplicateGold: 150, hexColor: '#7FBF7F' },
    blush: { rarity: 'rare', name: 'Blush', duplicateGold: 150, hexColor: '#DE5D83' },
    rose: { rarity: 'rare', name: 'Rose', duplicateGold: 150, hexColor: '#FF007F' },
    bubblegum: { rarity: 'rare', name: 'Bubblegum', duplicateGold: 150, hexColor: '#FFC1CC' },
    cotton: { rarity: 'rare', name: 'Cotton Candy', duplicateGold: 150, hexColor: '#FFBCD9' },
    powder: { rarity: 'rare', name: 'Powder Blue', duplicateGold: 150, hexColor: '#B0E0E6' },
    baby: { rarity: 'rare', name: 'Baby Blue', duplicateGold: 150, hexColor: '#89CFF0' },
    lemon: { rarity: 'rare', name: 'Lemon', duplicateGold: 150, hexColor: '#FFF44F' },
    canary: { rarity: 'rare', name: 'Canary', duplicateGold: 150, hexColor: '#FFEF00' },
    
    // Dark/Deep tones
    navy: { rarity: 'rare', name: 'Navy', duplicateGold: 150, hexColor: '#001F3F' },
    maroon: { rarity: 'rare', name: 'Maroon', duplicateGold: 150, hexColor: '#6B2C2C' },
    burgundy: { rarity: 'rare', name: 'Burgundy', duplicateGold: 150, hexColor: '#800020' },
    wine: { rarity: 'rare', name: 'Wine', duplicateGold: 150, hexColor: '#722F37' },
    crimson: { rarity: 'rare', name: 'Crimson', duplicateGold: 150, hexColor: '#DC143C' },
    scarlet: { rarity: 'rare', name: 'Scarlet', duplicateGold: 150, hexColor: '#FF2400' },
    cherry: { rarity: 'rare', name: 'Cherry', duplicateGold: 150, hexColor: '#DE3163' },
    ruby: { rarity: 'rare', name: 'Ruby', duplicateGold: 150, hexColor: '#E0115F' },
    darkBlue: { rarity: 'rare', name: 'Dark Blue', duplicateGold: 150, hexColor: '#003366' },
    midnight: { rarity: 'rare', name: 'Midnight', duplicateGold: 150, hexColor: '#191970' },
    indigo: { rarity: 'rare', name: 'Indigo', duplicateGold: 150, hexColor: '#4B0082' },
    violet: { rarity: 'rare', name: 'Violet', duplicateGold: 150, hexColor: '#8F00FF' },
    magenta: { rarity: 'rare', name: 'Magenta', duplicateGold: 150, hexColor: '#C71585' },
    fuchsia: { rarity: 'rare', name: 'Fuchsia', duplicateGold: 150, hexColor: '#FF00FF' },
    
    // Jewel tones
    sapphire: { rarity: 'rare', name: 'Sapphire', duplicateGold: 150, hexColor: '#0F52BA' },
    emerald: { rarity: 'rare', name: 'Emerald', duplicateGold: 150, hexColor: '#50C878' },
    amethyst: { rarity: 'rare', name: 'Amethyst', duplicateGold: 150, hexColor: '#9966CC' },
    topaz: { rarity: 'rare', name: 'Topaz', duplicateGold: 150, hexColor: '#FFCC00' },
    jade: { rarity: 'rare', name: 'Jade', duplicateGold: 150, hexColor: '#00A86B' },
    
    // Unique colors
    hotPink: { rarity: 'rare', name: 'Hot Pink', duplicateGold: 150, hexColor: '#FF69B4' },
    electricBlue: { rarity: 'rare', name: 'Electric Blue', duplicateGold: 150, hexColor: '#7DF9FF' },
    neonGreen: { rarity: 'rare', name: 'Neon Green', duplicateGold: 150, hexColor: '#39FF14' },
    neonOrange: { rarity: 'rare', name: 'Neon Orange', duplicateGold: 150, hexColor: '#FF6700' },
    neonPink: { rarity: 'rare', name: 'Neon Pink', duplicateGold: 150, hexColor: '#FF6EC7' },
    neonYellow: { rarity: 'rare', name: 'Neon Yellow', duplicateGold: 150, hexColor: '#CCFF00' },
    
    // ============ EPIC (special/vibrant colors) ============
    // Animated rainbow-style effects
    rainbow: { rarity: 'epic', name: 'Rainbow', duplicateGold: 500, isAnimated: true, hexColor: '#FF0000', description: 'Cycles through all colors' },
    galaxy: { rarity: 'epic', name: 'Galaxy', duplicateGold: 500, isAnimated: true, hexColor: '#1A0533', description: 'Deep space purple with shimmer' },
    aurora: { rarity: 'epic', name: 'Aurora', duplicateGold: 500, isAnimated: true, hexColor: '#00FF7F', description: 'Northern lights effect' },
    sunset: { rarity: 'epic', name: 'Sunset', duplicateGold: 500, isAnimated: true, hexColor: '#FF4500', description: 'Warm gradient animation' },
    ocean: { rarity: 'epic', name: 'Ocean', duplicateGold: 500, isAnimated: true, hexColor: '#006994', description: 'Deep sea wave effect' },
    lava: { rarity: 'epic', name: 'Lava', duplicateGold: 500, isAnimated: true, hexColor: '#CF1020', description: 'Molten rock glow' },
    ice: { rarity: 'epic', name: 'Ice', duplicateGold: 500, isAnimated: true, hasGlow: true, hexColor: '#B8DBF0', description: 'Frozen crystal shimmer' },
    prismatic: { rarity: 'epic', name: 'Prismatic', duplicateGold: 500, isAnimated: true, hexColor: '#FFFFFF', description: 'Light refraction effect' },
    
    // NEW animated skins
    frost: { rarity: 'epic', name: 'Frost', duplicateGold: 500, isAnimated: true, hasGlow: true, hexColor: '#E0FFFF', description: 'Ice crystal shimmer effect' },
    matrix: { rarity: 'epic', name: 'Matrix', duplicateGold: 500, isAnimated: true, hasGlow: true, hexColor: '#00FF00', description: 'Digital code cascade' },
    glitch: { rarity: 'epic', name: 'Glitch', duplicateGold: 500, isAnimated: true, hexColor: '#FF00FF', description: 'RGB corruption effect' },
    
    // Special metallics with glow
    roseGold: { rarity: 'epic', name: 'Rose Gold', duplicateGold: 500, hasGlow: true, hexColor: '#B76E79' },
    champagne: { rarity: 'epic', name: 'Champagne', duplicateGold: 500, hasGlow: true, hexColor: '#F7E7CE' },
    
    // Neon with glow
    neonCyan: { rarity: 'epic', name: 'Neon Cyan', duplicateGold: 500, hasGlow: true, hexColor: '#00FFFF' },
    neonPurple: { rarity: 'epic', name: 'Neon Purple', duplicateGold: 500, hasGlow: true, hexColor: '#9D00FF' },
    neonRed: { rarity: 'epic', name: 'Neon Red', duplicateGold: 500, hasGlow: true, hexColor: '#FF0000' },
    
    // ============ LEGENDARY (animated + glow) ============
    chromatic: { rarity: 'legendary', name: 'Chromatic', duplicateGold: 2500, isAnimated: true, hasGlow: true, hexColor: '#FFFFFF', description: 'Shifts through the entire color spectrum' },
    holographic: { rarity: 'legendary', name: 'Holographic', duplicateGold: 2500, isAnimated: true, hasGlow: true, hexColor: '#E6E6FA', description: 'Iridescent hologram effect' },
    starlight: { rarity: 'legendary', name: 'Starlight', duplicateGold: 2500, isAnimated: true, hasGlow: true, hexColor: '#FFFACD', description: 'Twinkling star particles' },
    nebula: { rarity: 'legendary', name: 'Nebula', duplicateGold: 2500, isAnimated: true, hasGlow: true, hexColor: '#9932CC', description: 'Cosmic cloud swirls' },
    plasma: { rarity: 'legendary', name: 'Plasma', duplicateGold: 2500, isAnimated: true, hasGlow: true, hexColor: '#8A2BE2', description: 'Electric energy field' },
    inferno: { rarity: 'legendary', name: 'Inferno', duplicateGold: 2500, isAnimated: true, hasGlow: true, hasFx: true, hexColor: '#FF4500', description: 'Engulfed in flames' },
    arctic: { rarity: 'legendary', name: 'Arctic', duplicateGold: 2500, isAnimated: true, hasGlow: true, hasFx: true, hexColor: '#E0FFFF', description: 'Frozen mist aura' },
    
    // ============ MYTHIC (ultra rare, dramatic effects) ============
    voidblack: { rarity: 'mythic', name: 'Void Black', duplicateGold: 10000, isAnimated: true, hasGlow: true, hasFx: true, hexColor: '#0D0D0D', description: 'Pure darkness that absorbs light' },
    ethereal: { rarity: 'mythic', name: 'Ethereal', duplicateGold: 10000, isAnimated: true, hasGlow: true, hasFx: true, hexColor: '#E8E8E8', description: 'Semi-transparent ghostly glow' },
    singularity: { rarity: 'mythic', name: 'Singularity', duplicateGold: 10000, isAnimated: true, hasGlow: true, hasFx: true, hexColor: '#1A0A2E', description: 'Black hole event horizon effect' },
    supernova: { rarity: 'mythic', name: 'Supernova', duplicateGold: 10000, isAnimated: true, hasGlow: true, hasFx: true, hexColor: '#FFD700', description: 'Exploding star brilliance' },
    phantom: { rarity: 'mythic', name: 'Phantom', duplicateGold: 10000, isAnimated: true, hasGlow: true, hasFx: true, hexColor: '#8B008B', description: 'Phasing in and out of reality' },
    
    // ============ DIVINE (extremely rare, ultimate effects) ============
    celestial: { rarity: 'divine', name: 'Celestial', duplicateGold: 50000, isAnimated: true, hasGlow: true, hasFx: true, hexColor: '#FFEFD5', description: 'Blessed by the stars themselves' },
    cosmic: { rarity: 'divine', name: 'Cosmic', duplicateGold: 50000, isAnimated: true, hasGlow: true, hasFx: true, hexColor: '#0B0B45', description: 'The fabric of spacetime made visible' },
    transcendent: { rarity: 'divine', name: 'Transcendent', duplicateGold: 50000, isAnimated: true, hasGlow: true, hasFx: true, hexColor: '#F8F8FF', description: 'Beyond mortal comprehension' }
};

// ========== HATS ==========
// Reviewed from src/assets/hats.js
const HATS = {
    // Common (basic hats, no effects)
    topHat: { rarity: 'common', name: 'Top Hat', duplicateGold: 25 },
    propeller: { rarity: 'common', name: 'Propeller Cap', duplicateGold: 25 },
    beerHelmet: { rarity: 'common', name: 'Beer Helmet', duplicateGold: 25 },
    mohawk: { rarity: 'common', name: 'Mohawk', duplicateGold: 25 },
    chef: { rarity: 'common', name: 'Chef Hat', duplicateGold: 25 },
    cowboy: { rarity: 'common', name: 'Cowboy Hat', duplicateGold: 25 },
    sombrero: { rarity: 'common', name: 'Sombrero', duplicateGold: 25 },
    fez: { rarity: 'common', name: 'Fez', duplicateGold: 25 },
    headphones: { rarity: 'common', name: 'Headphones', duplicateGold: 25 },
    flower: { rarity: 'common', name: 'Flower', duplicateGold: 25 },
    capRed: { rarity: 'common', name: 'Red Cap', duplicateGold: 25 },
    capGreen: { rarity: 'common', name: 'Green Cap', duplicateGold: 25 },
    capBlack: { rarity: 'common', name: 'Black Cap', duplicateGold: 25 },
    beanieBlue: { rarity: 'common', name: 'Blue Beanie', duplicateGold: 25 },
    beanieOrange: { rarity: 'common', name: 'Orange Beanie', duplicateGold: 25 },
    beaniePink: { rarity: 'common', name: 'Pink Beanie', duplicateGold: 25 },
    capBackwards: { rarity: 'common', name: 'Backwards Cap', duplicateGold: 25 },
    pirateTricorn: { rarity: 'common', name: 'Pirate Tricorn', duplicateGold: 25 },
    partyHat: { rarity: 'common', name: 'Party Hat', duplicateGold: 25 },
    graduationCap: { rarity: 'common', name: 'Graduation Cap', duplicateGold: 25 },
    hardHat: { rarity: 'common', name: 'Hard Hat', duplicateGold: 25 },
    bunnyEars: { rarity: 'common', name: 'Bunny Ears', duplicateGold: 25 },
    catEars: { rarity: 'common', name: 'Cat Ears', duplicateGold: 25 },
    mushroomCap: { rarity: 'common', name: 'Mushroom Cap', duplicateGold: 25 },
    
    // Uncommon (slight visual interest)
    viking: { rarity: 'uncommon', name: 'Viking Helmet', duplicateGold: 50 },
    santa: { rarity: 'uncommon', name: 'Santa Hat', duplicateGold: 50 },
    sensei: { rarity: 'uncommon', name: 'Sensei Hat', duplicateGold: 50 },
    bobRossAfro: { rarity: 'uncommon', name: 'Bob Ross Afro', duplicateGold: 50 },
    ninjaHeadband: { rarity: 'uncommon', name: 'Ninja Headband', duplicateGold: 50 },
    samuraiHelmet: { rarity: 'uncommon', name: 'Samurai Helmet', duplicateGold: 50 },
    spartanHelmet: { rarity: 'uncommon', name: 'Spartan Helmet', duplicateGold: 50 },
    devilHorns: { rarity: 'uncommon', name: 'Devil Horns', duplicateGold: 50 },
    
    // Rare (glow effects)
    crown: { rarity: 'rare', name: 'Crown', duplicateGold: 150 },
    halo: { rarity: 'rare', name: 'Halo', duplicateGold: 150, hasGlow: true },
    angelHalo: { rarity: 'rare', name: 'Angel Halo', duplicateGold: 150, hasGlow: true },
    rainbowCrown: { rarity: 'rare', name: 'Rainbow Crown', duplicateGold: 150, hasGlow: true },
    ufoHat: { rarity: 'rare', name: 'UFO Hat', duplicateGold: 150, hasGlow: true },
    pumpkinHead: { rarity: 'rare', name: 'Pumpkin Head', duplicateGold: 150, hasGlow: true },
    
    // Epic (glow + complex visuals, no particle emitters)
    astronautHelmet: { rarity: 'epic', name: 'Astronaut Helmet', duplicateGold: 500, hasGlow: true },
    iceCrown: { rarity: 'epic', name: 'Ice Crown', duplicateGold: 500, hasGlow: true },
    
    // Legendary (fx: with emitter = animated particle systems)
    wizardHat: { rarity: 'legendary', name: 'Wizard Hat', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true },
    flamingCrown: { rarity: 'legendary', name: 'Flaming Crown', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true },
    phoenixFeathers: { rarity: 'legendary', name: 'Phoenix Feathers', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true },
    
    // NEW Animated Feathers
    auroraFeathers: { rarity: 'legendary', name: 'Aurora Feathers', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true, 
        description: 'Northern lights shimmer and dance across these magical feathers.' },
    crystalFeathers: { rarity: 'legendary', name: 'Crystal Feathers', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Prismatic crystals that sparkle with an inner light.' },
    voidFeathers: { rarity: 'legendary', name: 'Void Feathers', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Dark feathers with swirling purple energy from beyond.' },
    
    // Mythic
    voidCrown: { rarity: 'mythic', name: 'Void Crown', duplicateGold: 10000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'A crown of pure darkness. Black flames dance eternally around it.' },
    dragonHelm: { rarity: 'mythic', name: 'Dragon Helm', duplicateGold: 10000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Helm forged from dragon scales. Steam rises from the nostrils.' },
    
    // Divine (NEW - extremely rare)
    cosmicCrown: { rarity: 'divine', name: 'Cosmic Crown', duplicateGold: 50000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'A crown forged from the fabric of spacetime itself. Stars orbit around the wearer.' }
};

// ========== EYES ==========
// TIERING RULES:
// - No effects = Common/Uncommon
// - glow: true only = Rare
// - fx: property = Epic minimum  
// - fx: + complex animation = Legendary+
const EYES = {
    // Common (no effects)
    bored: { rarity: 'common', name: 'Bored Eyes', duplicateGold: 25 },
    angry: { rarity: 'common', name: 'Angry Eyes', duplicateGold: 25 },
    cute: { rarity: 'common', name: 'Cute Eyes', duplicateGold: 25 },
    cyclops: { rarity: 'common', name: 'Cyclops Eye', duplicateGold: 25 },
    winking: { rarity: 'common', name: 'Winking', duplicateGold: 25 },
    dead: { rarity: 'common', name: 'Dead Eyes', duplicateGold: 25 },
    hearts: { rarity: 'common', name: 'Heart Eyes', duplicateGold: 25 },
    patch: { rarity: 'common', name: 'Eye Patch', duplicateGold: 25 },
    glasses3D: { rarity: 'common', name: '3D Glasses', duplicateGold: 25 },
    crying: { rarity: 'common', name: 'Crying', duplicateGold: 25 },
    monocle: { rarity: 'common', name: 'Monocle', duplicateGold: 25 },
    hypno: { rarity: 'common', name: 'Hypno', duplicateGold: 25 },
    sleepy: { rarity: 'common', name: 'Sleepy', duplicateGold: 25 },
    dizzy: { rarity: 'common', name: 'Dizzy', duplicateGold: 25 },
    determined: { rarity: 'common', name: 'Determined', duplicateGold: 25 },
    skiGoggles: { rarity: 'common', name: 'Ski Goggles', duplicateGold: 25 },
    bloodshot: { rarity: 'common', name: 'Bloodshot', duplicateGold: 25 },
    catEyes: { rarity: 'common', name: 'Cat Eyes', duplicateGold: 25 },
    aviator: { rarity: 'common', name: 'Aviators', duplicateGold: 25 },
    teary: { rarity: 'common', name: 'Teary', duplicateGold: 25 },
    nervous: { rarity: 'common', name: 'Nervous', duplicateGold: 25 },
    
    // Uncommon
    shades: { rarity: 'uncommon', name: 'Sunglasses', duplicateGold: 50 },
    anime: { rarity: 'uncommon', name: 'Anime Eyes', duplicateGold: 50 },
    
    // Rare (glow only - no particle effects)
    laser: { rarity: 'rare', name: 'Laser Eyes', duplicateGold: 150, hasGlow: true },
    money: { rarity: 'rare', name: 'Money Eyes', duplicateGold: 150, hasGlow: true },
    stars: { rarity: 'rare', name: 'Star Eyes', duplicateGold: 150, hasGlow: true },
    robot: { rarity: 'rare', name: 'Robot Eyes', duplicateGold: 150, hasGlow: true },
    vrGoggles: { rarity: 'rare', name: 'VR Goggles', duplicateGold: 150, hasGlow: true },
    sharingan: { rarity: 'rare', name: 'Sharingan', duplicateGold: 150, hasGlow: true },
    void: { rarity: 'rare', name: 'Void Eyes', duplicateGold: 150, hasGlow: true },
    
    // Epic (glow + complex visuals)
    cyber: { rarity: 'epic', name: 'Cyber Eyes', duplicateGold: 500, hasGlow: true },
    diamond: { rarity: 'epic', name: 'Diamond Eyes', duplicateGold: 500, hasGlow: true, hasFx: true },
    
    // Legendary (fx: with animated particle effects)
    fire: { rarity: 'legendary', name: 'Fire Eyes', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true },
    galaxy: { rarity: 'legendary', name: 'Galaxy Eyes', duplicateGold: 2500, hasGlow: true, isAnimated: true },
    rainbow: { rarity: 'legendary', name: 'Rainbow Eyes', duplicateGold: 2500, hasGlow: true, isAnimated: true },
    
    // Mythic
    voidGaze: { rarity: 'mythic', name: 'Void Gaze', duplicateGold: 10000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Eyes that peer into the void between dimensions. Dark energy pulses within.' },
    
    // Divine (NEW)
    omniscientGaze: { rarity: 'divine', name: 'Omniscient Gaze', duplicateGold: 50000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Eyes that see all timelines simultaneously. Reality bends around your gaze.' }
};

// ========== MOUTHS ==========
// TIERING RULES:
// - No effects = Common/Uncommon
// - glow: true only = Rare
// - fx: property = Epic minimum  
// - fx: + emitter: true = Legendary minimum
const MOUTHS = {
    // Common (no effects)
    mustache: { rarity: 'common', name: 'Mustache', duplicateGold: 25 },
    beard: { rarity: 'common', name: 'Beard', duplicateGold: 25 },
    tongue: { rarity: 'common', name: 'Tongue Out', duplicateGold: 25 },
    smile: { rarity: 'common', name: 'Smile', duplicateGold: 25 },
    fangs: { rarity: 'common', name: 'Fangs', duplicateGold: 25 },
    mask: { rarity: 'common', name: 'Mask', duplicateGold: 25 },
    lipstick: { rarity: 'common', name: 'Lipstick', duplicateGold: 25 },
    braces: { rarity: 'common', name: 'Braces', duplicateGold: 25 },
    lollipop: { rarity: 'common', name: 'Lollipop', duplicateGold: 25 },
    rose: { rarity: 'common', name: 'Rose', duplicateGold: 25 },
    whistle: { rarity: 'common', name: 'Whistle', duplicateGold: 25 },
    fancyStache: { rarity: 'common', name: 'Fancy Stache', duplicateGold: 25 },
    goatee: { rarity: 'common', name: 'Goatee', duplicateGold: 25 },
    fullBeard: { rarity: 'common', name: 'Full Beard', duplicateGold: 25 },
    buckTeeth: { rarity: 'common', name: 'Buck Teeth', duplicateGold: 25 },
    pacifier: { rarity: 'common', name: 'Pacifier', duplicateGold: 25 },
    straw: { rarity: 'common', name: 'Drink & Straw', duplicateGold: 25 },
    fishBone: { rarity: 'common', name: 'Fish Bone', duplicateGold: 25 },
    surgicalMask: { rarity: 'common', name: 'Surgical Mask', duplicateGold: 25 },
    bubblegumPop: { rarity: 'common', name: 'Bubble Pop', duplicateGold: 25 },
    
    // Rare (glow only)
    goldGrill: { rarity: 'rare', name: 'Gold Grill', duplicateGold: 150, hasGlow: true },
    kiss: { rarity: 'rare', name: 'Kiss Mark', duplicateGold: 150, hasGlow: true },
    vampireDrool: { rarity: 'rare', name: 'Vampire Drool', duplicateGold: 150, hasGlow: true },
    
    // Epic (has fx: particle effects)
    cigarette: { rarity: 'epic', name: 'Cigarette', duplicateGold: 500, hasFx: true, isAnimated: true },
    pipe: { rarity: 'epic', name: 'Pipe', duplicateGold: 500, hasFx: true, isAnimated: true },
    bubblegum: { rarity: 'epic', name: 'Bubble Gum', duplicateGold: 500, hasFx: true, isAnimated: true },
    diamondGrill: { rarity: 'epic', name: 'Diamond Grill', duplicateGold: 500, hasGlow: true, hasFx: true },
    
    // Legendary (fx + emitter = full particle system)
    cigar: { rarity: 'legendary', name: 'Cigar', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true },
    fireBreath: { rarity: 'legendary', name: 'Fire Breath', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true },
    iceBreath: { rarity: 'legendary', name: 'Ice Breath', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true },
    
    // Mythic
    voidMaw: { rarity: 'mythic', name: 'Void Maw', duplicateGold: 10000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'A mouth that opens to reveal the void. Dark energy leaks from between sharp teeth.' },
    dragonMaw: { rarity: 'mythic', name: 'Dragon Maw', duplicateGold: 10000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Dragon fangs that occasionally release puffs of smoke and fire.' }
};

// ========== BODY ITEMS ==========
const BODY_ITEMS = {
    // Common
    scarf: { rarity: 'common', name: 'Scarf', duplicateGold: 25 },
    bowtie: { rarity: 'common', name: 'Bow Tie', duplicateGold: 25 },
    tie: { rarity: 'common', name: 'Tie', duplicateGold: 25 },
    shirtWhite: { rarity: 'common', name: 'White Shirt', duplicateGold: 25 },
    shirtBlack: { rarity: 'common', name: 'Black Shirt', duplicateGold: 25 },
    overalls: { rarity: 'common', name: 'Overalls', duplicateGold: 25 },
    bikini: { rarity: 'common', name: 'Bikini', duplicateGold: 25 },
    backpack: { rarity: 'common', name: 'Backpack', duplicateGold: 25 },
    lifevest: { rarity: 'common', name: 'Life Vest', duplicateGold: 25 },
    shield: { rarity: 'common', name: 'Shield', duplicateGold: 25 },
    tutu: { rarity: 'common', name: 'Tutu', duplicateGold: 25 },
    suspenders: { rarity: 'common', name: 'Suspenders', duplicateGold: 25 },
    apron: { rarity: 'common', name: 'Apron', duplicateGold: 25 },
    barrel: { rarity: 'common', name: 'Barrel', duplicateGold: 25 },
    
    // Uncommon
    goldChain: { rarity: 'uncommon', name: 'Gold Chain', duplicateGold: 50, hasGlow: true },
    guitar: { rarity: 'uncommon', name: 'Guitar', duplicateGold: 50 },
    sword: { rarity: 'uncommon', name: 'Sword', duplicateGold: 50, hasGlow: true },
    paintBrush: { rarity: 'uncommon', name: 'Paint Brush', duplicateGold: 50 },
    hoodie: { rarity: 'uncommon', name: 'Hoodie', duplicateGold: 50 },
    labCoat: { rarity: 'uncommon', name: 'Lab Coat', duplicateGold: 50 },
    tuxedo: { rarity: 'uncommon', name: 'Tuxedo', duplicateGold: 50 },
    hawaiianShirt: { rarity: 'uncommon', name: 'Hawaiian Shirt', duplicateGold: 50 },
    leatherJacket: { rarity: 'uncommon', name: 'Leather Jacket', duplicateGold: 50 },
    bikerVest: { rarity: 'uncommon', name: 'Biker Vest', duplicateGold: 50 },
    samuraiArmor: { rarity: 'uncommon', name: 'Samurai Armor', duplicateGold: 50 },
    pirateCoat: { rarity: 'uncommon', name: 'Pirate Coat', duplicateGold: 50 },
    astronautSuit: { rarity: 'uncommon', name: 'Astronaut Suit', duplicateGold: 50 },
    
    // Rare
    cape: { rarity: 'rare', name: 'Cape', duplicateGold: 150 },
    royalSash: { rarity: 'rare', name: 'Royal Sash', duplicateGold: 150, hasGlow: true },
    superheroCape: { rarity: 'rare', name: 'Superhero Cape', duplicateGold: 150 },
    wizardRobe: { rarity: 'rare', name: 'Wizard Robe', duplicateGold: 150, hasGlow: true },
    
    // Epic
    angelWings: { rarity: 'epic', name: 'Angel Wings', duplicateGold: 500, hasGlow: true, hasFx: true },
    demonWings: { rarity: 'epic', name: 'Demon Wings', duplicateGold: 500, hasFx: true },
    jetpack: { rarity: 'epic', name: 'Jetpack', duplicateGold: 500, hasGlow: true, hasFx: true },
    
    // Legendary
    lightningAura: { rarity: 'legendary', name: 'Lightning Aura', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true },
    fireAura: { rarity: 'legendary', name: 'Fire Aura', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true },
    
    // Mythic
    voidWings: { rarity: 'mythic', name: 'Void Wings', duplicateGold: 10000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Wings made of pure darkness. Reality warps around their edges.' },
    dragonWings: { rarity: 'mythic', name: 'Dragon Wings', duplicateGold: 10000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Massive dragon wings with animated fire trail.' },
    
    // Divine (NEW)
    celestialAura: { rarity: 'divine', name: 'Celestial Aura', duplicateGold: 50000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'An ethereal aura of pure cosmic energy. Galaxies swirl around your form.' }
};

// ========== MOUNTS ==========
const MOUNTS = {
    // Rare
    shoppingCart: { rarity: 'rare', name: 'Shopping Cart', duplicateGold: 150, isAnimated: true,
        description: 'Roll through town in style. Wheels may be wobbly!' },
    
    // Epic
    skateboard: { rarity: 'epic', name: 'Skateboard', duplicateGold: 500, description: 'Classic wooden skateboard with custom grip tape' },
    rubberDuck: { rarity: 'epic', name: 'Giant Rubber Duck', duplicateGold: 500, isAnimated: true,
        description: 'Quack quack! Bouncy yellow duck ride with adorable waddle.' },
    snowboard: { rarity: 'epic', name: 'Snowboard', duplicateGold: 500, description: 'Sleek snowboard for mountain adventures' },
    scooter: { rarity: 'epic', name: 'Scooter', duplicateGold: 500, description: 'Electric scooter with LED underlights' },
    
    // Legendary
    giantPuffle: { rarity: 'legendary', name: 'Giant Puffle', duplicateGold: 2500, hasGlow: true, isAnimated: true,
        description: 'Your puffle grew up! Bouncy ride with wiggling tuft.' },
    ufoDisc: { rarity: 'legendary', name: 'UFO Disc', duplicateGold: 2500, hasGlow: true, isAnimated: true,
        description: 'Flying saucer with spinning ring and alien lights!' },
    rocketJetpack: { rarity: 'mythic', name: 'Rocket Jetpack', duplicateGold: 5000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Blast off with twin rocket boosters and fire trail!' },
    // Baby Dragons (Legendary)
    babyIceDragon: { rarity: 'legendary', name: 'Baby Ice Dragon', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Adorable ice dragon hatchling with tiny frost breath!' },
    babyFireDragon: { rarity: 'legendary', name: 'Baby Fire Dragon', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Fierce little fire breather - cute but fiery!' },
    babyVoidDragon: { rarity: 'legendary', name: 'Baby Void Dragon', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Mysterious shadow hatchling from the void!' },
    // Adult Dragons (Mythic)
    iceDragon: { rarity: 'mythic', name: 'Ice Dragon', duplicateGold: 5000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Majestic ice dragon with flapping wings and frost breath!' },
    fireDragon: { rarity: 'mythic', name: 'Fire Dragon', duplicateGold: 5000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Blazing inferno dragon with devastating fire breath!' },
    voidDragon: { rarity: 'mythic', name: 'Void Dragon', duplicateGold: 5000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Eldritch terror from the abyss - reality bends around it!' },
    hoverboard: { rarity: 'legendary', name: 'Hoverboard', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true, 
        description: 'Floating hoverboard with particle trail' },
    jetski: { rarity: 'legendary', name: 'Jet Ski', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'Neon-lit jet ski with splash effects' },
    dragonMount: { rarity: 'legendary', name: 'Baby Dragon', duplicateGold: 2500, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'A small dragon companion that breathes fire' },
    
    // Mythic
    phoenixMount: { rarity: 'mythic', name: 'Phoenix', duplicateGold: 10000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'A blazing phoenix that leaves a trail of flames' },
    unicornMount: { rarity: 'mythic', name: 'Celestial Unicorn', duplicateGold: 10000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'A mythical unicorn with rainbow mane and starlight hooves' },
    
    // Divine
    cosmicSerpent: { rarity: 'divine', name: 'Cosmic Serpent', duplicateGold: 50000, hasGlow: true, hasFx: true, isAnimated: true,
        description: 'An ancient serpent made of pure cosmic energy. Galaxies swirl in its scales.' }
};

// ========== SEED FUNCTION ==========
async function seedCosmetics() {
    console.log('🌱 Starting cosmetic seed...\n');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clubpenguin';
    
    try {
        await mongoose.connect(mongoUri);
        console.log('📦 Connected to MongoDB\n');
        
        // Clear existing templates (uncomment to force full reseed)
        // await CosmeticTemplate.deleteMany({});
        // console.log('🗑️ Cleared existing templates\n');
        
        const templates = [];
        let seeded = 0;
        let skipped = 0;
        
        // Helper to add template
        const addTemplate = async (assetKey, category, data) => {
            // Skip promo exclusives
            if (PROMO_EXCLUSIVE_IDS.includes(assetKey)) {
                console.log(`   ⏭️ Skipping promo exclusive: ${assetKey}`);
                skipped++;
                return;
            }
            
            // Skip free items
            if (FREE_ITEMS.includes(assetKey)) {
                console.log(`   ⏭️ Skipping free item: ${assetKey}`);
                skipped++;
                return;
            }
            
            // Check if already exists
            const exists = await CosmeticTemplate.findOne({ assetKey });
            if (exists) {
                console.log(`   ⏭️ Already exists: ${assetKey}`);
                skipped++;
                return;
            }
            
            const template = {
                templateId: `${category}_${assetKey}`,
                assetKey,
                category,
                name: data.name || assetKey,
                description: data.description || '',
                rarity: data.rarity || 'common',
                acquisitionType: 'gacha',
                isAnimated: data.isAnimated || false,
                hasGlow: data.hasGlow || false,
                hasFx: data.hasFx || false,
                canBeHolographic: true,
                duplicateGoldBase: data.duplicateGold || 25,
                collection: 'OG Collection',
                isActive: true
            };
            
            await CosmeticTemplate.create(template);
            console.log(`   ✅ Added: ${template.name} (${template.rarity})`);
            seeded++;
        };
        
        // Seed Hats
        console.log('🎩 Seeding HATS...');
        for (const [key, data] of Object.entries(HATS)) {
            await addTemplate(key, 'hat', data);
        }
        
        // Seed Eyes
        console.log('\n👀 Seeding EYES...');
        for (const [key, data] of Object.entries(EYES)) {
            await addTemplate(key, 'eyes', data);
        }
        
        // Seed Mouths
        console.log('\n👄 Seeding MOUTHS...');
        for (const [key, data] of Object.entries(MOUTHS)) {
            await addTemplate(key, 'mouth', data);
        }
        
        // Seed Body Items
        console.log('\n👕 Seeding BODY ITEMS...');
        for (const [key, data] of Object.entries(BODY_ITEMS)) {
            await addTemplate(key, 'bodyItem', data);
        }
        
        // Seed Skin Colors (gacha only, not free colors)
        console.log('\n🎨 Seeding SKIN COLORS...');
        for (const [key, data] of Object.entries(GACHA_SKIN_COLORS)) {
            await addTemplate(key, 'skin', data);
        }
        
        // Seed Mounts (if any non-promo)
        console.log('\n🐴 Seeding MOUNTS...');
        for (const [key, data] of Object.entries(MOUNTS)) {
            await addTemplate(key, 'mount', data);
        }
        
        // Summary
        console.log('\n========================================');
        console.log(`✅ Seeded: ${seeded} cosmetics`);
        console.log(`⏭️ Skipped: ${skipped} (promo/free/existing)`);
        console.log('========================================\n');
        
        // Print rarity distribution
        const counts = await CosmeticTemplate.aggregate([
            { $match: { acquisitionType: 'gacha', isActive: true } },
            { $group: { _id: '$rarity', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        
        console.log('📊 Gacha Pool Distribution:');
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'divine'];
        for (const rarity of rarityOrder) {
            const found = counts.find(c => c._id === rarity);
            console.log(`   ${rarity.toUpperCase()}: ${found?.count || 0}`);
        }
        
        // Category breakdown
        const categories = await CosmeticTemplate.aggregate([
            { $match: { acquisitionType: 'gacha', isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        
        console.log('\n📦 Category Breakdown:');
        for (const cat of categories) {
            console.log(`   ${cat._id}: ${cat.count}`);
        }
        
    } catch (error) {
        console.error('❌ Seed failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

// Run if called directly
seedCosmetics();

