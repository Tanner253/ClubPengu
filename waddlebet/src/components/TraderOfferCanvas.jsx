import React, { useRef, useEffect, useCallback } from 'react';
import { getTierGlow } from '../config/merchantOfferArt';

function drawGlow(ctx, cx, cy, r, color, pulse) {
    const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * (1.1 + pulse * 0.15));
    grad.addColorStop(0, color.replace(/[\d.]+\)$/, `${0.35 + pulse * 0.2})`));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawChest(ctx, size, tier, pulse, opening) {
    const cx = size / 2;
    const cy = size / 2 + size * 0.06;
    const w = size * 0.42;
    const h = size * 0.28;
    const lidAngle = opening ? -0.55 - pulse * 0.1 : -0.08 - pulse * 0.04;

    const bodyGrad = ctx.createLinearGradient(cx - w, cy, cx + w, cy + h);
    if (tier === 'gold') {
        bodyGrad.addColorStop(0, '#8b6914');
        bodyGrad.addColorStop(0.5, '#d4af37');
        bodyGrad.addColorStop(1, '#5c4510');
    } else if (tier === 'silver') {
        bodyGrad.addColorStop(0, '#6b7280');
        bodyGrad.addColorStop(0.5, '#d1d5db');
        bodyGrad.addColorStop(1, '#4b5563');
    } else {
        bodyGrad.addColorStop(0, '#6b3f1f');
        bodyGrad.addColorStop(0.5, '#cd7f32');
        bodyGrad.addColorStop(1, '#4a2810');
    }

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.85, w * 0.9, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - w, cy - h * 0.1, w * 2, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy - h * 0.1);
    ctx.rotate(lidAngle);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-w, -h * 0.55, w * 2, h * 0.65, [4, 4, 0, 0]);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = tier === 'gold' ? '#fff3a0' : '#f0e6c8';
    ctx.beginPath();
    ctx.arc(cx, cy + h * 0.15, size * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();

    if (opening) {
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + pulse * 3;
            const dist = size * (0.12 + (i % 3) * 0.04);
            ctx.fillStyle = `rgba(255, 220, 80, ${0.5 + pulse * 0.3})`;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * dist, cy - h * 0.5 + Math.sin(a) * dist * 0.5, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawCharcoalBundle(ctx, size, pulse) {
    const cx = size / 2;
    const cy = size / 2 + size * 0.05;
    for (let i = 0; i < 5; i++) {
        const ox = (i - 2) * size * 0.08;
        const oy = Math.sin(i * 1.2 + pulse) * 2;
        const logGrad = ctx.createLinearGradient(cx + ox - 8, cy, cx + ox + 8, cy);
        logGrad.addColorStop(0, '#2a1810');
        logGrad.addColorStop(0.5, '#1a1008');
        logGrad.addColorStop(1, '#0d0804');
        ctx.fillStyle = logGrad;
        ctx.beginPath();
        ctx.ellipse(cx + ox, cy + oy, size * 0.11, size * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = `rgba(255, 140, 40, ${0.35 + pulse * 0.25})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.2, cy - size * 0.12);
    ctx.quadraticCurveTo(cx, cy - size * 0.22 - pulse * 4, cx + size * 0.2, cy - size * 0.1);
    ctx.stroke();
}

function drawLumberCrate(ctx, size, pulse) {
    const cx = size / 2;
    const cy = size / 2 + size * 0.04;
    const w = size * 0.38;
    const h = size * 0.3;
    ctx.fillStyle = '#5c3d20';
    ctx.strokeStyle = '#2a1810';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - w, cy - h * 0.5, w * 2, h, 3);
    ctx.fill();
    ctx.stroke();

    const woods = ['#b8956a', '#e2d4bc', '#7a5230'];
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = woods[i];
        ctx.fillRect(cx - w * 0.75 + i * w * 0.55, cy - h * 0.35, w * 0.45, h * 0.22);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.strokeRect(cx - w * 0.75 + i * w * 0.55, cy - h * 0.35, w * 0.45, h * 0.22);
    }
    ctx.strokeStyle = `rgba(255,255,255,${0.15 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(cx - w, cy);
    ctx.lineTo(cx + w, cy);
    ctx.stroke();
}

function drawFineTimber(ctx, size, pulse) {
    drawLumberCrate(ctx, size, pulse);
    const cx = size / 2;
    const cy = size / 2;
    drawGlow(ctx, cx, cy - size * 0.05, size * 0.35, 'rgba(255, 200, 60, 0.6)', pulse);
    ctx.fillStyle = '#4a3528';
    ctx.fillRect(cx - size * 0.08, cy - size * 0.28, size * 0.16, size * 0.12);
    ctx.strokeStyle = '#1f1410';
    ctx.strokeRect(cx - size * 0.08, cy - size * 0.28, size * 0.16, size * 0.12);
}

function drawAxe(ctx, size, tier, pulse) {
    const cx = size / 2;
    const cy = size / 2;
    const swing = Math.sin(pulse * 2) * 0.04;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.35 + swing);

    ctx.fillStyle = '#5c3d20';
    ctx.fillRect(-size * 0.04, -size * 0.28, size * 0.08, size * 0.5);
    ctx.strokeStyle = '#2a1810';
    ctx.strokeRect(-size * 0.04, -size * 0.28, size * 0.08, size * 0.5);

    const blade = ctx.createLinearGradient(0, -size * 0.3, size * 0.22, -size * 0.05);
    if (tier === 'gold') {
        blade.addColorStop(0, '#fef3c7');
        blade.addColorStop(0.5, '#f59e0b');
        blade.addColorStop(1, '#92400e');
    } else if (tier === 'silver') {
        blade.addColorStop(0, '#f8fafc');
        blade.addColorStop(0.5, '#94a3b8');
        blade.addColorStop(1, '#475569');
    } else {
        blade.addColorStop(0, '#d6d3d1');
        blade.addColorStop(0.5, '#78716c');
        blade.addColorStop(1, '#44403c');
    }
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(size * 0.04, -size * 0.3);
    ctx.lineTo(size * 0.28, -size * 0.12);
    ctx.lineTo(size * 0.04, -size * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();
    ctx.restore();
}

function drawRod(ctx, size, pulse) {
    const cx = size / 2;
    const cy = size / 2;
    const bend = Math.sin(pulse * 1.5) * 0.08;
    ctx.strokeStyle = '#5c3d20';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.25, cy + size * 0.2);
    ctx.quadraticCurveTo(cx + bend * 20, cy - size * 0.15, cx + size * 0.28, cy - size * 0.25);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(180,220,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.28, cy - size * 0.25);
    ctx.lineTo(cx + size * 0.32, cy + size * 0.15);
    ctx.stroke();
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(cx + size * 0.32, cy + size * 0.17, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawBackpack(ctx, size, pulse) {
    const cx = size / 2;
    const cy = size / 2 + size * 0.02;
    const w = size * 0.3;
    const h = size * 0.34;
    const grad = ctx.createLinearGradient(cx, cy - h, cx, cy + h);
    grad.addColorStop(0, '#92400e');
    grad.addColorStop(1, '#451a03');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(cx - w, cy - h * 0.5, w * 2, h, 6);
    ctx.fill();
    ctx.strokeStyle = '#2a1004';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,200,100,${0.3 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.65, w * 0.55, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - size * 0.04, cy, size * 0.08, size * 0.08);
}

function drawContract(ctx, size, tier, pulse) {
    const cx = size / 2;
    const cy = size / 2;
    ctx.fillStyle = '#f5e6c8';
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - size * 0.22, cy - size * 0.28, size * 0.44, size * 0.5, 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(90,70,50,0.35)';
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.14, cy - size * 0.16 + i * size * 0.08);
        ctx.lineTo(cx + size * 0.14, cy - size * 0.16 + i * size * 0.08);
        ctx.stroke();
    }
    const sealColor = tier === 'gold' ? '#dc2626' : tier === 'silver' ? '#7c3aed' : '#b45309';
    ctx.fillStyle = sealColor;
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.14, size * 0.07 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.stroke();
}

function drawSellPouch(ctx, size, pulse) {
    const cx = size / 2;
    const cy = size / 2 + size * 0.04;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.22);
    grad.addColorStop(0, '#a16207');
    grad.addColorStop(1, '#451a03');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.22, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a1004';
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 220, 80, ${0.7 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(cx - size * 0.05, cy - size * 0.02, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + size * 0.06, cy + size * 0.02, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
}

function drawBaitJar(ctx, size, pulse) {
    const cx = size / 2;
    const cy = size / 2 + size * 0.06;
    ctx.fillStyle = 'rgba(120,180,100,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.12, size * 0.16, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    const jar = ctx.createLinearGradient(cx, cy - size * 0.2, cx, cy + size * 0.15);
    jar.addColorStop(0, 'rgba(200,230,255,0.5)');
    jar.addColorStop(1, 'rgba(100,140,180,0.35)');
    ctx.fillStyle = jar;
    ctx.strokeStyle = 'rgba(200,220,240,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - size * 0.14, cy - size * 0.15, size * 0.28, size * 0.28, 4);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = `rgba(180,100,60,${0.6 + pulse * 0.2})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(cx - size * 0.06 + i * size * 0.06, cy + size * 0.02, size * 0.025, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawIntelMap(ctx, size, pulse) {
    const cx = size / 2;
    const cy = size / 2;
    ctx.fillStyle = '#d4c4a0';
    ctx.strokeStyle = '#6b5a40';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.24, cy - size * 0.2);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.28);
    ctx.lineTo(cx + size * 0.26, cy + size * 0.22);
    ctx.lineTo(cx - size * 0.18, cy + size * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = `rgba(60,120,80,${0.5 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.08, cy - size * 0.05);
    ctx.lineTo(cx + size * 0.1, cy + size * 0.08);
    ctx.stroke();
}

function drawFerryTicket(ctx, size, pulse) {
    const cx = size / 2;
    const cy = size / 2;
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - size * 0.26, cy - size * 0.14, size * 0.52, size * 0.28, 3);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.1, cy - size * 0.14);
    ctx.lineTo(cx + size * 0.1, cy + size * 0.14);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(234, 88, 12, ${0.7 + pulse * 0.2})`;
    ctx.font = `bold ${Math.round(size * 0.11)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('FERRY', cx - size * 0.04, cy + size * 0.04);
}

function drawOffer(ctx, size, variant, tier, pulse, opening) {
    const cx = size / 2;
    const cy = size / 2;
    drawGlow(ctx, cx, cy, size * 0.38, getTierGlow(tier), pulse);

    switch (variant) {
        case 'charcoal_bundle':
            drawCharcoalBundle(ctx, size, pulse);
            break;
        case 'lumber_crate':
            drawLumberCrate(ctx, size, pulse);
            break;
        case 'fine_timber':
            drawFineTimber(ctx, size, pulse);
            break;
        case 'axe':
            drawAxe(ctx, size, tier, pulse);
            break;
        case 'fishing_rod':
            drawRod(ctx, size, pulse);
            break;
        case 'backpack':
            drawBackpack(ctx, size, pulse);
            break;
        case 'contract':
            drawContract(ctx, size, tier, pulse);
            break;
        case 'sell_pouch':
            drawSellPouch(ctx, size, pulse);
            break;
        case 'bait_jar':
            drawBaitJar(ctx, size, pulse);
            break;
        case 'intel_map':
            drawIntelMap(ctx, size, pulse);
            break;
        case 'ferry_ticket':
            drawFerryTicket(ctx, size, pulse);
            break;
        default:
            drawChest(ctx, size, tier, pulse, opening);
    }
}

/**
 * Animated canvas art for trader offer tiles — chests, crates, tools, contracts.
 */
export default function TraderOfferCanvas({
    variant = 'gold_chest',
    tier = 'bronze',
    selected = false,
    opening = false,
    size = 88,
    className = '',
}) {
    const canvasRef = useRef(null);
    const frameRef = useRef(0);
    const startRef = useRef(performance.now());

    const paint = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const px = Math.round(size * dpr);
        if (canvas.width !== px || canvas.height !== px) {
            canvas.width = px;
            canvas.height = px;
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
        }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);

        const t = (performance.now() - startRef.current) / 1000;
        const pulse = selected ? 0.5 + Math.sin(t * 4) * 0.5 : 0.25 + Math.sin(t * 2) * 0.25;
        drawOffer(ctx, size, variant, tier, pulse, opening);

        if (selected) {
            ctx.strokeStyle = getTierGlow(tier).replace(/[\d.]+\)$/, '0.85)');
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(2, 2, size - 4, size - 4, 4);
            ctx.stroke();
        }
    }, [variant, tier, selected, opening, size]);

    useEffect(() => {
        startRef.current = performance.now();
        let running = true;
        const loop = () => {
            if (!running) return;
            paint();
            frameRef.current = requestAnimationFrame(loop);
        };
        loop();
        return () => {
            running = false;
            cancelAnimationFrame(frameRef.current);
        };
    }, [paint]);

    return (
        <canvas
            ref={canvasRef}
            className={`trader-offer-canvas block mx-auto ${className}`}
            aria-hidden
        />
    );
}
