/**
 * Canvas drawing for in-world player nametags.
 * World tags show only the player name styled by tier (whitepaper colors).
 * Status labels (Diamond Flipper tier, Day 1, etc.) belong in the profile modal.
 */

import { getTierConfig } from '../config/whaleNametagTiers.js';

function truncateName(ctx, name, maxWidth, font) {
    ctx.font = font;
    let display = name;
    if (ctx.measureText(name).width <= maxWidth) return display;
    while (display.length > 0 && ctx.measureText(`${display}...`).width > maxWidth) {
        display = display.slice(0, -1);
    }
    return `${display}...`;
}

function drawStyledNameTag(ctx, name, cfg, tier) {
    const w = 400;
    const h = 72;
    const x = 56;
    const y = 28;

    ctx.shadowColor = cfg.glowColor;
    ctx.shadowBlur = tier === 'legendary' ? 22 : tier === 'diamond' ? 18 : 12;

    const borderGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    borderGrad.addColorStop(0, cfg.borderColors[0]);
    borderGrad.addColorStop(1, cfg.borderColors[1] || cfg.borderColors[0]);
    ctx.fillStyle = borderGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = cfg.bgColor;
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 6, w - 12, h - 12, 12);
    ctx.fill();

    ctx.strokeStyle = cfg.borderColors[0];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 6, w - 12, h - 12, 12);
    ctx.stroke();

    const displayName = truncateName(ctx, name, 340, 'bold 36px sans-serif');
    ctx.shadowColor = cfg.glowColor;
    ctx.shadowBlur = tier === 'legendary' ? 10 : 6;
    ctx.fillStyle = cfg.textColor;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName, 256, 64);
    ctx.shadowBlur = 0;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} name
 * @param {string} style - default | day1 | whale | bronze | silver | gold | diamond | legendary
 */
export function drawNametagToCanvas(ctx, name, style = 'default') {
    if (style === 'day1') {
        const cfg = {
            textColor: '#fbbf24',
            glowColor: 'rgba(251, 191, 36, 0.75)',
            borderColors: ['rgba(234, 179, 8, 0.95)', 'rgba(245, 158, 11, 0.85)'],
            bgColor: 'rgba(20, 14, 0, 0.88)',
        };
        drawStyledNameTag(ctx, name, cfg, 'gold');
        return;
    }

    if (style === 'whale') {
        drawStyledNameTag(ctx, name, getTierConfig('diamond'), 'diamond');
        return;
    }

    if (getTierConfig(style).styled) {
        drawStyledNameTag(ctx, name, getTierConfig(style), style);
        return;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(64, 32, 384, 64, 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(64, 32, 384, 64, 16);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncateName(ctx, name, 360, 'bold 36px sans-serif'), 256, 64);
}
