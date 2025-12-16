/**
 * IglooOccupancySystem - Handles MapleStory-style igloo occupancy banner sprites
 * Extracted from VoxelWorld.jsx for maintainability
 */

import { IGLOO_BANNER_STYLES, IGLOO_BANNER_CONTENT } from '../config';

/**
 * Draw the banner background, borders, and decorations
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} style - Style configuration
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 * @param {number} iglooIndex - Index for special styling
 * @param {number} animPhase - Animation phase (0-1) for animated banners
 */
function drawBannerBackground(ctx, style, w, h, iglooIndex = 0, animPhase = 0) {
    const padding = 12;
    const cornerRadius = 16;
    const isNightclub = iglooIndex === 2; // SKNY GANG nightclub
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, style.bgGradient[0]);
    gradient.addColorStop(0.5, style.bgGradient[1]);
    gradient.addColorStop(1, style.bgGradient[2]);
    
    // Draw main banner shape with rounded corners
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(w - cornerRadius, 0);
    ctx.quadraticCurveTo(w, 0, w, cornerRadius);
    ctx.lineTo(w, h - cornerRadius);
    ctx.quadraticCurveTo(w, h, w - cornerRadius, h);
    ctx.lineTo(cornerRadius, h);
    ctx.quadraticCurveTo(0, h, 0, h - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw border - animated for nightclub
    if (isNightclub) {
        // Animated neon border
        const hue = (animPhase * 360) % 360;
        ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.lineWidth = 5;
        ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
        ctx.shadowBlur = 15;
    } else {
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = 4;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw inner border accent
    if (isNightclub) {
        const hue2 = ((animPhase * 360) + 180) % 360;
        ctx.strokeStyle = `hsl(${hue2}, 100%, 60%)`;
    } else {
        ctx.strokeStyle = style.accentColor;
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cornerRadius + 6, 6);
    ctx.lineTo(w - cornerRadius - 6, 6);
    ctx.quadraticCurveTo(w - 6, 6, w - 6, cornerRadius + 6);
    ctx.lineTo(w - 6, h - cornerRadius - 6);
    ctx.quadraticCurveTo(w - 6, h - 6, w - cornerRadius - 6, h - 6);
    ctx.lineTo(cornerRadius + 6, h - 6);
    ctx.quadraticCurveTo(6, h - 6, 6, h - cornerRadius - 6);
    ctx.lineTo(6, cornerRadius + 6);
    ctx.quadraticCurveTo(6, 6, cornerRadius + 6, 6);
    ctx.closePath();
    ctx.stroke();
    
    // Draw corner decorations
    if (isNightclub) {
        // Animated disco lights for nightclub
        const drawDiscoLight = (x, y, size, offset) => {
            const lightHue = ((animPhase * 360) + offset * 90) % 360;
            ctx.fillStyle = `hsl(${lightHue}, 100%, 60%)`;
            ctx.shadowColor = `hsl(${lightHue}, 100%, 50%)`;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        };
        drawDiscoLight(20, 20, 14, 0);
        drawDiscoLight(w - 20, 20, 14, 1);
        drawDiscoLight(20, h - 20, 12, 2);
        drawDiscoLight(w - 20, h - 20, 12, 3);
    } else {
        // Penguin emoji decorations in corners
        const drawPenguinDecor = (x, y, size) => {
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🐧', x, y);
        };
        drawPenguinDecor(20, 20, 16);
        drawPenguinDecor(w - 20, 20, 16);
        drawPenguinDecor(20, h - 20, 14);
        drawPenguinDecor(w - 20, h - 20, 14);
    }
    
    // Title area background
    ctx.fillStyle = style.titleBg;
    ctx.globalAlpha = isNightclub ? 0.5 : 0.7;
    ctx.fillRect(padding + 20, padding + 8, w - padding * 2 - 40, 32);
    ctx.globalAlpha = 1;
}

/**
 * Draw banner content (title, ticker, description, owner)
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} style - Style configuration
 * @param {Object} content - Content configuration
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 */
function drawBannerContent(ctx, style, content, w, h) {
    const padding = 12;
    
    // Draw title
    ctx.font = 'bold 20px "Comic Sans MS", cursive, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = style.textColor;
    ctx.fillText(content.title, w / 2, padding + 24);
    
    // Draw ticker (if not empty)
    if (content.ticker) {
        ctx.font = 'bold 24px "Arial Black", sans-serif';
        ctx.fillStyle = style.borderColor;
        ctx.fillText(content.ticker, w / 2, padding + 56);
    }
    
    // Draw shill/description text (adjust position if no ticker)
    // Split on • for line breaks
    const shillY = content.ticker ? padding + 80 : padding + 54;
    ctx.font = '12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = style.textColor;
    ctx.globalAlpha = 0.9;
    
    const shillLines = content.shill.split(' • ');
    const lineHeight = 15;
    shillLines.forEach((line, idx) => {
        ctx.fillText(line.trim(), w / 2, shillY + idx * lineHeight);
    });
    ctx.globalAlpha = 1;
    
    // Calculate Y offset based on number of shill lines
    const shillEndY = shillY + (shillLines.length - 1) * lineHeight;
    
    // Draw owner (if exists)
    if (content.owner) {
        ctx.font = 'italic 12px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = style.accentColor;
        ctx.globalAlpha = 0.8;
        ctx.fillText(`owned by ${content.owner}`, w / 2, shillEndY + 16);
        ctx.globalAlpha = 1;
    }
    
    // Draw separator line
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding + 30, h - 40);
    ctx.lineTo(w - padding - 30, h - 40);
    ctx.stroke();
}

/**
 * Draw the penguin icon and count
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} style - Style configuration
 * @param {number} count - Occupancy count
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 */
function drawPenguinCount(ctx, style, count, w, h) {
    const padding = 12;
    const penguinX = w / 2 - 25;
    const penguinY = h - 28;
    
    // Penguin body (black)
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.ellipse(penguinX, penguinY, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Penguin belly (white)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(penguinX, penguinY + 2, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Penguin eyes
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(penguinX - 3, penguinY - 5, 2, 0, Math.PI * 2);
    ctx.arc(penguinX + 3, penguinY - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Penguin beak
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(penguinX, penguinY - 2);
    ctx.lineTo(penguinX - 4, penguinY + 2);
    ctx.lineTo(penguinX + 4, penguinY + 2);
    ctx.closePath();
    ctx.fill();
    
    // Draw count
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = count > 0 ? style.textColor : '#888888';
    ctx.textAlign = 'left';
    const countText = count > 0 ? `${count}` : '0';
    ctx.fillText(countText, penguinX + 18, penguinY + 6);
    
    // Status indicator
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = count > 0 ? '#22c55e' : '#888888';
    ctx.textAlign = 'right';
    ctx.fillText(count > 0 ? '● OPEN' : '○ EMPTY', w - padding - 15, h - 22);
}

/**
 * Render the full igloo banner to a canvas
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} count - Occupancy count
 * @param {number} iglooIndex - Index for style/content selection
 */
export function renderIglooBanner(ctx, count, iglooIndex = 0) {
    const canvas = ctx.canvas;
    const w = canvas.width;
    const h = canvas.height;
    
    const style = IGLOO_BANNER_STYLES[iglooIndex % IGLOO_BANNER_STYLES.length];
    const content = IGLOO_BANNER_CONTENT[iglooIndex % IGLOO_BANNER_CONTENT.length];
    
    // Clear canvas
    ctx.clearRect(0, 0, w, h);
    
    // Draw all components
    drawBannerBackground(ctx, style, w, h);
    drawBannerContent(ctx, style, content, w, h);
    drawPenguinCount(ctx, style, count, w, h);
}

/**
 * Create a new igloo occupancy sprite
 * @param {Object} THREE - THREE.js library
 * @param {number} count - Initial occupancy count
 * @param {number} iglooIndex - Index for style/content selection
 * @returns {THREE.Sprite}
 */
export function createIglooOccupancySprite(THREE, count, iglooIndex = 0) {
    const canvas = document.createElement('canvas');
    const w = 280;
    const h = 180;
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d');
    renderIglooBanner(ctx, count, iglooIndex);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture, 
        depthTest: false, 
        depthWrite: false,
        transparent: true
    });
    const sprite = new THREE.Sprite(material);
    
    // Bigger scale for the banner
    const scale = 0.025;
    sprite.scale.set(w * scale, h * scale, 1);
    sprite.position.y = 10; // Higher above igloo
    sprite.renderOrder = 998;
    sprite.visible = false; // Start hidden, show when player is close
    
    // Store index for updates
    sprite.userData.styleIndex = iglooIndex;
    sprite.userData.iglooIndex = iglooIndex;
    
    return sprite;
}

/**
 * Update an existing igloo occupancy sprite
 * @param {Object} THREE - THREE.js library
 * @param {THREE.Sprite} sprite - The sprite to update
 * @param {number} count - New occupancy count
 */
export function updateIglooOccupancySprite(THREE, sprite, count) {
    if (!sprite || !sprite.material) return;
    
    const iglooIndex = sprite.userData.iglooIndex || 0;
    
    const canvas = document.createElement('canvas');
    const w = 280;
    const h = 180;
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d');
    renderIglooBanner(ctx, count, iglooIndex);
    
    // Update sprite texture
    if (sprite.material.map) {
        sprite.material.map.dispose();
    }
    sprite.material.map = new THREE.CanvasTexture(canvas);
    sprite.material.needsUpdate = true;
    
    // Ensure scale is correct
    const scale = 0.025;
    sprite.scale.set(w * scale, h * scale, 1);
}

export default {
    createIglooOccupancySprite,
    updateIglooOccupancySprite,
    renderIglooBanner
};

