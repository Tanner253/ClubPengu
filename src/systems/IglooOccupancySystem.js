/**
 * IglooOccupancySystem - Handles MapleStory-style igloo occupancy banner sprites
 * Extracted from VoxelWorld.jsx for maintainability
 * 
 * Now supports dynamic igloo data with:
 * - Custom banner titles, tickers, descriptions
 * - Lock status display (private/public/token-gated/entry-fee)
 * - Owner information
 */

import { IGLOO_BANNER_STYLES, IGLOO_BANNER_CONTENT } from '../config';

/**
 * Get effective style from igloo data (custom colors) or preset style
 * @param {Object} style - Preset style from IGLOO_BANNER_STYLES (based on styleIndex)
 * @param {Object} iglooData - Dynamic igloo data with banner customization
 * @returns {Object} - Effective style to use for rendering
 */
function getEffectiveStyle(style, iglooData) {
    const banner = iglooData?.banner;
    
    // If user has enabled custom colors, use their custom gradient/colors
    if (banner?.useCustomColors) {
        return {
            ...style,
            bgGradient: Array.isArray(banner.customGradient) && banner.customGradient.length === 3 
                ? banner.customGradient 
                : style.bgGradient,
            textColor: banner.textColor || style.textColor,
            accentColor: banner.accentColor || style.accentColor,
            borderColor: banner.accentColor || style.borderColor
        };
    }
    
    // Otherwise use the preset style (selected via styleIndex)
    // The style parameter already comes from IGLOO_BANNER_STYLES[styleIndex]
    return style;
}

/**
 * Get effective font from igloo data or default
 * Font is ALWAYS applied regardless of useCustomColors toggle
 * @param {Object} iglooData - Dynamic igloo data with banner customization
 * @returns {string} - Font family string
 */
function getEffectiveFont(iglooData) {
    const banner = iglooData?.banner;
    // Font is independent of useCustomColors - always use if set
    if (banner?.font) {
        return banner.font;
    }
    return '"Comic Sans MS", cursive, sans-serif';
}

/**
 * Get effective text alignment from igloo data or default
 * Text alignment is ALWAYS applied regardless of useCustomColors toggle
 * @param {Object} iglooData - Dynamic igloo data with banner customization
 * @returns {string} - 'left', 'center', or 'right'
 */
function getEffectiveTextAlign(iglooData) {
    const banner = iglooData?.banner;
    // Text alignment is independent of useCustomColors - always use if set
    if (banner?.textAlign) {
        return banner.textAlign;
    }
    return 'center';
}

/**
 * Draw the banner background, borders, and decorations
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} style - Style configuration
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 * @param {number} iglooIndex - Index for special styling
 * @param {number} animPhase - Animation phase (0-1) for animated banners
 * @param {Object} iglooData - Optional dynamic igloo data from server
 */
function drawBannerBackground(ctx, style, w, h, iglooIndex = 0, animPhase = 0, iglooData = null) {
    const padding = 12;
    const cornerRadius = 16;
    const isNightclub = iglooIndex === 2; // SKNY GANG nightclub
    
    // Get effective style (custom colors or preset)
    const effectiveStyle = getEffectiveStyle(style, iglooData);
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, effectiveStyle.bgGradient[0]);
    gradient.addColorStop(0.5, effectiveStyle.bgGradient[1]);
    gradient.addColorStop(1, effectiveStyle.bgGradient[2]);
    
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
        ctx.strokeStyle = effectiveStyle.accentColor;
        ctx.lineWidth = 3;
        // Add subtle glow for non-nightclub banners
        ctx.shadowColor = effectiveStyle.accentColor;
        ctx.shadowBlur = 8;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    
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
    
}

/**
 * Measure text width at a given font size
 */
function measureText(ctx, text, fontSize, fontFamily, bold = false) {
    if (!text) return 0;
    ctx.font = `${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
    return ctx.measureText(text).width;
}

/**
 * Find the best font size that fits text within maxWidth
 */
function fitFontSize(ctx, text, maxWidth, maxSize, minSize, fontFamily, bold = false) {
    if (!text) return maxSize;
    
    for (let size = maxSize; size >= minSize; size--) {
        if (measureText(ctx, text, size, fontFamily, bold) <= maxWidth) {
            return size;
        }
    }
    return minSize;
}

/**
 * Word-wrap text to fit within maxWidth, returning array of lines
 * Preserves explicit line breaks (\n) in the text
 */
function wrapText(ctx, text, maxWidth, fontSize, fontFamily) {
    if (!text) return [];
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    
    // First split by explicit line breaks
    const paragraphs = text.split(/\n/);
    const allLines = [];
    
    for (const paragraph of paragraphs) {
        if (!paragraph.trim()) {
            // Empty line - preserve as spacing
            allLines.push('');
            continue;
        }
        
        const words = paragraph.split(' ');
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = ctx.measureText(testLine).width;
            
            if (testWidth > maxWidth && currentLine) {
                allLines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            allLines.push(currentLine);
        }
    }
    
    return allLines;
}

/**
 * Calculate required canvas height based on content
 */
function calculateBannerHeight(ctx, iglooData, fontFamily, baseWidth = 280) {
    const padding = 16;
    const contentWidth = baseWidth - padding * 2 - 16;
    const baseHeight = 180; // Minimum height
    const penguinAreaHeight = 44; // Fixed bottom area for penguin count
    
    const title = iglooData?.banner?.title || '';
    const ticker = iglooData?.banner?.ticker || '';
    const shill = iglooData?.banner?.shill || '';
    const owner = iglooData?.ownerUsername || '';
    
    const hasTitle = !!title;
    const hasTicker = !!ticker;
    const hasShill = !!shill;
    const hasOwner = !!owner;
    const contentCount = [hasTitle, hasTicker, hasShill, hasOwner].filter(Boolean).length;
    
    // Get sizes based on content count (same logic as drawBannerContent)
    let titleSize, tickerSize, shillSize, ownerSize, lineSpacing;
    
    if (contentCount <= 1) {
        titleSize = 40; tickerSize = 36; shillSize = 28; ownerSize = 24; lineSpacing = 2.0;
    } else if (contentCount === 2) {
        titleSize = 32; tickerSize = 28; shillSize = 22; ownerSize = 18; lineSpacing = 1.6;
    } else if (contentCount === 3) {
        titleSize = 26; tickerSize = 22; shillSize = 18; ownerSize = 15; lineSpacing = 1.4;
    } else {
        titleSize = 22; tickerSize = 18; shillSize = 15; ownerSize = 13; lineSpacing = 1.2;
    }
    
    // Calculate text height
    let textHeight = 0;
    const gap = 16 * lineSpacing;
    let items = 0;
    
    if (hasTitle) { textHeight += titleSize; items++; }
    if (hasTicker) { textHeight += tickerSize; items++; }
    if (hasOwner) { textHeight += ownerSize; items++; }
    
    // For shill, calculate wrapped lines
    if (hasShill) {
        const wrappedLines = wrapText(ctx, shill, contentWidth, shillSize, fontFamily);
        const lineHeight = shillSize * 1.3;
        textHeight += wrappedLines.length * lineHeight;
        items++;
    }
    
    // Add gaps between items
    const totalGaps = Math.max(0, items - 1) * gap;
    
    // Total content height + padding + penguin area
    const requiredHeight = padding * 2 + textHeight + totalGaps + penguinAreaHeight + 20; // 20px extra buffer
    
    return Math.max(baseHeight, Math.ceil(requiredHeight));
}

/**
 * Draw banner content with DYNAMIC sizing based on content amount
 * Less content = bigger text and more spacing
 * More content = smaller text and tighter spacing
 */
function drawBannerContent(ctx, style, content, w, h, iglooData = null) {
    const padding = 16;
    const contentWidth = w - padding * 2 - 16;
    const contentTop = padding + 12;
    const contentBottom = h - 44; // Leave room for penguin count area
    const availableHeight = contentBottom - contentTop;
    
    // Get effective style and text properties
    const effectiveStyle = getEffectiveStyle(style, iglooData);
    const fontFamily = getEffectiveFont(iglooData);
    const textAlign = getEffectiveTextAlign(iglooData);
    
    // Gather content
    const title = iglooData?.banner?.title || content.title || '';
    const ticker = iglooData?.banner?.ticker || content.ticker || '';
    const shill = iglooData?.banner?.shill || content.shill || '';
    const owner = iglooData?.ownerUsername || content.owner || '';
    
    // Count how many content elements we have
    const hasTitle = !!title;
    const hasTicker = !!ticker;
    const hasShill = !!shill;
    const hasOwner = !!owner;
    const contentCount = [hasTitle, hasTicker, hasShill, hasOwner].filter(Boolean).length;
    
    // Dynamic sizing based on content density - ALL text should be readable!
    let titleSize, tickerSize, shillSize, ownerSize, lineSpacing;
    
    if (contentCount <= 1) {
        // Just one item - make it HUGE
        titleSize = { max: 40, min: 28 };
        tickerSize = { max: 36, min: 24 };
        shillSize = { max: 28, min: 20 };
        ownerSize = { max: 24, min: 18 };
        lineSpacing = 2.0;
    } else if (contentCount === 2) {
        // Two items - very large
        titleSize = { max: 32, min: 22 };
        tickerSize = { max: 28, min: 20 };
        shillSize = { max: 22, min: 16 };
        ownerSize = { max: 18, min: 14 };
        lineSpacing = 1.6;
    } else if (contentCount === 3) {
        // Three items - large
        titleSize = { max: 26, min: 18 };
        tickerSize = { max: 22, min: 16 };
        shillSize = { max: 18, min: 13 };
        ownerSize = { max: 15, min: 11 };
        lineSpacing = 1.4;
    } else {
        // All four items - medium but still very readable
        titleSize = { max: 22, min: 16 };
        tickerSize = { max: 18, min: 14 };
        shillSize = { max: 15, min: 11 };
        ownerSize = { max: 13, min: 10 };
        lineSpacing = 1.2;
    }
    
    // Calculate actual font sizes that fit
    const actualTitleSize = hasTitle ? fitFontSize(ctx, title, contentWidth, titleSize.max, titleSize.min, fontFamily, true) : 0;
    const actualTickerSize = hasTicker ? fitFontSize(ctx, ticker, contentWidth, tickerSize.max, tickerSize.min, fontFamily, true) : 0;
    const actualShillSize = hasShill ? fitFontSize(ctx, shill, contentWidth, shillSize.max, shillSize.min, fontFamily, false) : 0;
    const ownerText = hasOwner ? `owned by ${owner}` : '';
    const actualOwnerSize = hasOwner ? fitFontSize(ctx, ownerText, contentWidth, ownerSize.max, ownerSize.min, fontFamily, false) : 0;
    
    // Pre-calculate wrapped shill lines for height calculation
    const wrappedShillLines = hasShill ? wrapText(ctx, shill, contentWidth, actualShillSize, fontFamily) : [];
    const shillLineHeight = actualShillSize * 1.3;
    const totalShillHeight = wrappedShillLines.length * shillLineHeight;
    
    // Calculate total height needed (with shill using wrapped height)
    const heights = [];
    if (hasTitle) heights.push(actualTitleSize);
    if (hasTicker) heights.push(actualTickerSize);
    if (hasShill) heights.push(totalShillHeight);
    if (hasOwner) heights.push(actualOwnerSize);
    
    const totalTextHeight = heights.reduce((sum, h) => sum + h, 0);
    const gaps = Math.max(0, heights.length - 1);
    const baseGap = Math.min(16 * lineSpacing, (availableHeight - totalTextHeight) / Math.max(1, gaps));
    
    // Calculate starting Y to vertically center content
    const totalHeight = totalTextHeight + gaps * baseGap;
    let currentY = contentTop + (availableHeight - totalHeight) / 2;
    
    // Setup text alignment
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'middle';
    
    // Calculate X position based on alignment
    let textX;
    if (textAlign === 'left') {
        textX = padding + 8;
    } else if (textAlign === 'right') {
        textX = w - padding - 8;
    } else {
        textX = w / 2;
    }
    
    // Draw title
    if (hasTitle) {
        ctx.font = `bold ${actualTitleSize}px ${fontFamily}`;
        ctx.fillStyle = effectiveStyle.textColor;
        currentY += actualTitleSize / 2;
        ctx.fillText(title, textX, currentY);
        currentY += actualTitleSize / 2 + baseGap;
    }
    
    // Draw ticker
    if (hasTicker) {
        ctx.font = `bold ${actualTickerSize}px ${fontFamily}`;
        ctx.fillStyle = effectiveStyle.accentColor;
        currentY += actualTickerSize / 2;
        ctx.fillText(ticker, textX, currentY);
        currentY += actualTickerSize / 2 + baseGap;
    }
    
    // Draw shill/description with word wrapping (use pre-calculated wrapped lines)
    if (hasShill && wrappedShillLines.length > 0) {
        ctx.font = `${actualShillSize}px ${fontFamily}`;
        ctx.fillStyle = effectiveStyle.textColor;
    ctx.globalAlpha = 0.9;
    
        for (let i = 0; i < wrappedShillLines.length; i++) {
            const line = wrappedShillLines[i];
            currentY += actualShillSize / 2;
            ctx.fillText(line, textX, currentY);
            currentY += shillLineHeight - actualShillSize / 2;
        }
        
        // Add gap after shill block (but subtract the extra lineHeight already added)
        currentY += baseGap - (shillLineHeight - actualShillSize);
        ctx.globalAlpha = 1;
    }
    
    // Draw owner
    if (hasOwner) {
        ctx.font = `italic ${actualOwnerSize}px ${fontFamily}`;
        ctx.fillStyle = effectiveStyle.accentColor;
        ctx.globalAlpha = 0.8;
        currentY += actualOwnerSize / 2;
        ctx.fillText(ownerText, textX, currentY);
        ctx.globalAlpha = 1;
    }
    
    // Draw separator line above penguin area
    ctx.strokeStyle = effectiveStyle.accentColor;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding + 16, h - 42);
    ctx.lineTo(w - padding - 16, h - 42);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

/**
 * Draw the penguin icon, count, and access status
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} style - Style configuration
 * @param {number} count - Occupancy count
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 * @param {Object} iglooData - Optional dynamic igloo data for access status
 */
function drawPenguinCount(ctx, style, count, w, h, iglooData = null) {
    const padding = 12;
    const penguinX = w / 2 - 25;
    const penguinY = h - 28;
    
    // Get effective style for text colors
    const effectiveStyle = getEffectiveStyle(style, iglooData);
    
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
    ctx.fillStyle = count > 0 ? effectiveStyle.textColor : '#888888';
    ctx.textAlign = 'left';
    const countText = count > 0 ? `${count}` : '0';
    ctx.fillText(countText, penguinX + 18, penguinY + 6);
    
    // Access status indicator based on igloo data
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'right';
    
    if (iglooData) {
        const accessType = iglooData.accessType || 'private';
        const hasEntryFee = iglooData.hasEntryFee;
        const hasTokenGate = iglooData.hasTokenGate;
        const isRented = iglooData.isRented;
        
        // Not rented and not reserved - show "FOR RENT"
        if (!isRented && !iglooData.isReserved) {
            ctx.fillStyle = '#22c55e';
            ctx.fillText('🏷️ FOR RENT', w - padding - 15, h - 22);
        }
        // Private - locked
        else if (accessType === 'private') {
            ctx.fillStyle = '#ef4444';
            ctx.fillText('🔒 LOCKED', w - padding - 15, h - 22);
        }
        // Token gated
        else if (accessType === 'token' || (accessType === 'both' && hasTokenGate)) {
            ctx.fillStyle = '#a855f7';
            const tokenInfo = iglooData.tokenGateInfo;
            const tokenText = tokenInfo?.symbol ? `🪙 ${tokenInfo.symbol}` : '🪙 TOKEN';
            ctx.fillText(tokenText, w - padding - 15, h - 22);
        }
        // Entry fee required
        else if (accessType === 'fee' || (accessType === 'both' && hasEntryFee)) {
            ctx.fillStyle = '#eab308';
            const feeText = iglooData.entryFeeAmount ? `💰 ${iglooData.entryFeeAmount}` : '💰 FEE';
            ctx.fillText(feeText, w - padding - 15, h - 22);
        }
        // Public
        else if (accessType === 'public') {
            ctx.fillStyle = count > 0 ? '#22c55e' : '#888888';
            ctx.fillText(count > 0 ? '🔓 OPEN' : '🔓 EMPTY', w - padding - 15, h - 22);
        }
        else {
            // Default
            ctx.fillStyle = count > 0 ? '#22c55e' : '#888888';
            ctx.fillText(count > 0 ? '● OPEN' : '○ EMPTY', w - padding - 15, h - 22);
        }
    } else {
        // No igloo data - use default status
        ctx.fillStyle = count > 0 ? '#22c55e' : '#888888';
        ctx.fillText(count > 0 ? '● OPEN' : '○ EMPTY', w - padding - 15, h - 22);
    }
}

/**
 * Render the full igloo banner to a canvas
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} count - Occupancy count
 * @param {number} iglooIndex - Index for style/content selection
 * @param {Object} iglooData - Optional dynamic igloo data from server
 */
export function renderIglooBanner(ctx, count, iglooIndex = 0, iglooData = null) {
    const canvas = ctx.canvas;
    const w = canvas.width;
    const h = canvas.height;
    
    // Use style from igloo data if available, otherwise use index
    const styleIndex = iglooData?.banner?.styleIndex ?? iglooIndex;
    const style = IGLOO_BANNER_STYLES[styleIndex % IGLOO_BANNER_STYLES.length];
    const content = IGLOO_BANNER_CONTENT[iglooIndex % IGLOO_BANNER_CONTENT.length];
    
    // Clear canvas
    ctx.clearRect(0, 0, w, h);
    
    // Draw all components with igloo data
    drawBannerBackground(ctx, style, w, h, iglooIndex, 0, iglooData);
    drawBannerContent(ctx, style, content, w, h, iglooData);
    drawPenguinCount(ctx, style, count, w, h, iglooData);
}

/**
 * Create a new igloo occupancy sprite
 * @param {Object} THREE - THREE.js library
 * @param {number} count - Initial occupancy count
 * @param {number} iglooIndex - Index for style/content selection
 * @param {Object} iglooData - Optional dynamic igloo data from server
 * @returns {THREE.Sprite}
 */
export function createIglooOccupancySprite(THREE, count, iglooIndex = 0, iglooData = null) {
    const w = 280;
    
    // Calculate dynamic height based on content
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = 100;
    const tempCtx = tempCanvas.getContext('2d');
    const fontFamily = getEffectiveFont(iglooData);
    const h = calculateBannerHeight(tempCtx, iglooData, fontFamily, w);
    
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d');
    renderIglooBanner(ctx, count, iglooIndex, iglooData);
    
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
    
    // Store index and data for updates
    sprite.userData.styleIndex = iglooIndex;
    sprite.userData.iglooIndex = iglooIndex;
    sprite.userData.iglooData = iglooData;
    sprite.userData.canvasHeight = h;
    
    return sprite;
}

/**
 * Update an existing igloo occupancy sprite
 * @param {Object} THREE - THREE.js library
 * @param {THREE.Sprite} sprite - The sprite to update
 * @param {number} count - New occupancy count
 * @param {Object} iglooData - Optional updated igloo data from server
 */
export function updateIglooOccupancySprite(THREE, sprite, count, iglooData = null) {
    if (!sprite || !sprite.material) return;
    
    const iglooIndex = sprite.userData.iglooIndex || 0;
    // Use new data if provided, otherwise use stored data
    const data = iglooData || sprite.userData.iglooData || null;
    
    // Store updated data
    if (iglooData) {
        sprite.userData.iglooData = iglooData;
    }
    
    const w = 280;
    
    // Calculate dynamic height based on content
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = 100;
    const tempCtx = tempCanvas.getContext('2d');
    const fontFamily = getEffectiveFont(data);
    const h = calculateBannerHeight(tempCtx, data, fontFamily, w);
    
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d');
    renderIglooBanner(ctx, count, iglooIndex, data);
    
    // Update sprite texture
    if (sprite.material.map) {
        sprite.material.map.dispose();
    }
    sprite.material.map = new THREE.CanvasTexture(canvas);
    sprite.material.needsUpdate = true;
    
    // Update scale to reflect new height
    const scale = 0.025;
    sprite.scale.set(w * scale, h * scale, 1);
    sprite.userData.canvasHeight = h;
}

export default {
    createIglooOccupancySprite,
    updateIglooOccupancySprite,
    renderIglooBanner
};

