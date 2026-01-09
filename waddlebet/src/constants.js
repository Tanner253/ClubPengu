// --- ASSET DEFINITIONS & VOXEL DATA ---

export const VOXEL_SIZE = 0.5;

export const PALETTE = {
    // Penguin Skins - 100+ colors for gacha system!
    // FREE (only blue)
    blue: '#0066CC',
    
    // COMMON (former free colors + basics)
    red: '#CC2222', green: '#228B22', yellow: '#DAA520', pink: '#FF69B4',
    purple: '#6B2D8B', orange: '#FF6600', black: '#1A1A1A', white: '#F5F5F5',
    cyan: '#00CED1', grey: '#666666', brown: '#5D4037', beige: '#D4B896',
    tan: '#C4A57B', cream: '#FFF8DC', ivory: '#FFFFF0',
    
    // UNCOMMON (nice variations)
    gold: '#DAA520', silver: '#A0A0A0', bronze: '#CD7F32', copper: '#B87333', platinum: '#E5E4E2',
    teal: '#008080', lime: '#32CD32', coral: '#E57373', salmon: '#FA8072', olive: '#6B6B00',
    forest: '#228B22', moss: '#8A9A5B', sage: '#87AE73', seafoam: '#71EEB8',
    sky: '#6BB3D9', azure: '#007FFF', cerulean: '#2A52BE', aqua: '#00FFFF', turquoise: '#40E0D0',
    tangerine: '#FF9966', peach: '#FFCBA4', apricot: '#FBCEB1', amber: '#FFBF00',
    honey: '#EB9605', mustard: '#FFDB58', rust: '#B7410E',
    periwinkle: '#CCCCFF', lilac: '#C8A2C8', mauve: '#E0B0FF', plum: '#8E4585',
    
    // RARE (distinctive colors)
    lavender: '#B8A9C9', mint: '#7FBF7F', blush: '#DE5D83', rose: '#FF007F',
    bubblegum: '#FFC1CC', cotton: '#FFBCD9', powder: '#B0E0E6', baby: '#89CFF0',
    lemon: '#FFF44F', canary: '#FFEF00',
    navy: '#001F3F', maroon: '#6B2C2C', burgundy: '#800020', wine: '#722F37',
    crimson: '#DC143C', scarlet: '#FF2400', cherry: '#DE3163', ruby: '#E0115F',
    darkBlue: '#003366', midnight: '#191970', indigo: '#4B0082', violet: '#8F00FF',
    magenta: '#C71585', fuchsia: '#FF00FF',
    sapphire: '#0F52BA', emerald: '#50C878', amethyst: '#9966CC', topaz: '#FFCC00', jade: '#00A86B',
    hotPink: '#FF69B4', electricBlue: '#7DF9FF',
    neonGreen: '#39FF14', neonOrange: '#FF6700', neonPink: '#FF6EC7', neonYellow: '#CCFF00',
    
    // EPIC (special colors)
    rainbow: '#FF0000', prismatic: '#FF00FF', galaxy: '#1A0533', aurora: '#00FF7F', sunset: '#FF4500',
    ocean: '#006994', lava: '#CF1020', ice: '#B8DBF0', prismatic: '#FFFFFF',
    roseGold: '#B76E79', champagne: '#F7E7CE',
    neonCyan: '#00FFFF', neonPurple: '#9D00FF', neonRed: '#FF0000',
    
    // LEGENDARY (animated)
    chromatic: '#FFFFFF', holographic: '#E6E6FA', starlight: '#FFFACD',
    nebula: '#9932CC', plasma: '#8A2BE2', inferno: '#FF4500', arctic: '#E0FFFF',
    
    // MYTHIC (ultra rare)
    voidblack: '#0D0D0D', ethereal: '#E8E8E8', singularity: '#1A0A2E',
    supernova: '#FFD700', phantom: '#8B008B',
    
    // DIVINE (extremely rare)
    celestial: '#FFEFD5', cosmic: '#0B0B45', transcendent: '#F8F8FF',
    
    // Materials
    beerGold: '#C87533', glass: '#88CCDD',
    floorLight: '#D4E4D4', floorDark: '#A8C8A8',
    rug: '#C44', wood: '#6B4423',
    mirrorFrame: '#3A2B1C', mirrorGlass: '#C0E0F0',
    
    // Clothing Base
    tieRed: '#B22222', tieBlue: '#1565C0',
    shirtWhite: '#F0F0F0', shirtBlack: '#1A1A1A',
    camoGreen: '#2D5016', jeans: '#1A4A7A',

    // World Colors (Club Pengu snowy island theme)
    asphalt: '#3A3A3A', roadLine: '#CCAA00', sidewalk: '#8A9A9A',
    // Natural grass - darker, more realistic green with slight blue tint (cold climate)
    grass: '#3D7A4A', grassDark: '#2D5A3A', grassLight: '#4D8A5A',
    // Snow/Ice
    snow: '#E8F0F8', snowDark: '#C8D8E8', ice: '#B8D8F0',
    // Water - colder, more realistic ocean
    water: '#3A7CA5', waterDeep: '#1E5A7A', waterShallow: '#5A9CC5',
    // Buildings
    buildingConcrete: '#7A8A8A', buildingDark: '#2A3A4A',
    buildingBeige: '#D8D0C0', buildingBrick: '#8B4513',
    windowLight: '#E8D070', windowDark: '#1A2A3A',
    lampPost: '#2A3A4A', lampLight: '#E8C840',
    // Nature
    tree: '#1A4A2A', treeDark: '#0A3A1A', bark: '#4A3020',
    rock: '#5A6A6A', rockDark: '#3A4A4A',
    // Accents
    butterfly1: '#E8C840', butterfly2: '#C84040', butterfly3: '#7040A0'
};

