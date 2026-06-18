import React, { useRef, useEffect, useCallback } from 'react';
import Puffle from '../engine/Puffle';

function hexToRgb(hex) {
    const h = (hex || '#888888').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function drawFluffyPuffle(ctx, size, colorHex, options = {}) {
    const { special, mood = 'happy', animate = 0 } = options;
    const cx = size / 2;
    const cy = size / 2 + size * 0.04;
    const baseR = size * 0.34;
    const rgb = hexToRgb(colorHex);

    ctx.clearRect(0, 0, size, size);

    // Soft ground shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + baseR * 0.95, baseR * 0.9, baseR * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Fur tufts around body
    const tuftCount = 14;
    for (let i = 0; i < tuftCount; i++) {
        const angle = (i / tuftCount) * Math.PI * 2 + animate * 0.15;
        const wobble = Math.sin(animate * 2 + i) * 0.04;
        const tx = cx + Math.cos(angle) * baseR * (0.82 + wobble);
        const ty = cy + Math.sin(angle) * baseR * (0.78 + wobble);
        const grad = ctx.createRadialGradient(tx, ty, 0, tx, ty, baseR * 0.28);
        grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.95)`);
        grad.addColorStop(1, `rgba(${Math.max(0, rgb.r - 40)},${Math.max(0, rgb.g - 40)},${Math.max(0, rgb.b - 40)},0.2)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(tx, ty, baseR * 0.24, 0, Math.PI * 2);
        ctx.fill();
    }

    // Main body
    const bodyGrad = ctx.createRadialGradient(cx - baseR * 0.25, cy - baseR * 0.35, baseR * 0.1, cx, cy, baseR);
    bodyGrad.addColorStop(0, `rgb(${Math.min(255, rgb.r + 55)},${Math.min(255, rgb.g + 55)},${Math.min(255, rgb.b + 55)})`);
    bodyGrad.addColorStop(0.55, colorHex);
    bodyGrad.addColorStop(1, `rgb(${Math.max(0, rgb.r - 35)},${Math.max(0, rgb.g - 35)},${Math.max(0, rgb.b - 35)})`);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
    ctx.fill();

    if (special === 'glow') {
        ctx.strokeStyle = 'rgba(170,221,255,0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR + 4, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (special === 'rainbow') {
        const ring = ctx.createLinearGradient(cx - baseR, cy, cx + baseR, cy);
        ['#ff4444', '#ffaa00', '#44ff44', '#4488ff', '#aa44ff'].forEach((c, i, arr) => {
            ring.addColorStop(i / (arr.length - 1), c);
        });
        ctx.strokeStyle = ring;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR + 3, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx - baseR * 0.28, cy - baseR * 0.38, baseR * 0.22, baseR * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const eyeY = cy - baseR * 0.08;
    const eyeOffset = baseR * 0.28;
    const blink = Math.sin(animate * 3) > 0.97;
    const eyeH = blink ? baseR * 0.04 : baseR * 0.18;

    [-1, 1].forEach((side) => {
        const ex = cx + side * eyeOffset;
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, baseR * 0.11, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!blink) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ex + baseR * 0.04, eyeY - baseR * 0.04, baseR * 0.045, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Cheeks
    ctx.fillStyle = 'rgba(255,120,140,0.35)';
    [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.arc(cx + side * baseR * 0.42, cy + baseR * 0.12, baseR * 0.1, 0, Math.PI * 2);
        ctx.fill();
    });

    // Mouth
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (mood === 'sad') {
        ctx.arc(cx, cy + baseR * 0.22, baseR * 0.12, Math.PI * 0.15, Math.PI * 0.85);
    } else {
        ctx.arc(cx, cy + baseR * 0.18, baseR * 0.14, Math.PI * 0.2, Math.PI - 0.2);
    }
    ctx.stroke();

    // Feet
    ctx.fillStyle = `rgb(${Math.max(0, rgb.r - 60)},${Math.max(0, rgb.g - 60)},${Math.max(0, rgb.b - 60)})`;
    [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.ellipse(cx + side * baseR * 0.22, cy + baseR * 0.82, baseR * 0.14, baseR * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
    });
}

/**
 * Canvas-rendered puffle preview (replaces flat colored circles).
 */
export default function PuffleCanvasPreview({
    puffle,
    color = 'blue',
    size = 96,
    className = '',
    mood,
}) {
    const canvasRef = useRef(null);
    const frameRef = useRef(0);
    const colorData = Puffle.COLORS[puffle?.color || color] || Puffle.COLORS.blue;
    const resolvedMood = mood || puffle?.mood || 'happy';

    const paint = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawFluffyPuffle(ctx, size, colorData.hex, {
            special: colorData.special,
            mood: resolvedMood,
            animate: frameRef.current,
        });
    }, [size, colorData.hex, colorData.special, resolvedMood]);

    useEffect(() => {
        paint();
        let id;
        const tick = () => {
            frameRef.current += 0.016;
            paint();
            id = requestAnimationFrame(tick);
        };
        id = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(id);
    }, [paint]);

    return (
        <canvas
            ref={canvasRef}
            className={`rounded-2xl ${className}`}
            aria-label={puffle?.name || colorData.name}
        />
    );
}
