import React, { useRef, useEffect, useCallback } from 'react';

const STREAK_DAYS = [
    { day: 1, cp: 1000, gold: 0 },
    { day: 2, cp: 2000, gold: 0 },
    { day: 3, cp: 0, gold: 5 },
    { day: 4, cp: 3000, gold: 0 },
    { day: 5, cp: 4000, gold: 0 },
    { day: 6, cp: 0, gold: 10 },
    { day: 7, cp: 5000, gold: 0 },
];

/** 7-day login streak reward calendar for whitepaper economics section. */
export default function StreakRewardCanvas({ width = 640, height = 200, className = '' }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const paint = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const pad = 12;
        const gap = 8;
        const cellW = (width - pad * 2 - gap * 6) / 7;
        const cellH = height - pad * 2 - 28;

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('7-DAY LOGIN STREAK — $CP + BONUS GOLD', width / 2, 16);

        for (let i = 0; i < STREAK_DAYS.length; i++) {
            const entry = STREAK_DAYS[i];
            const x = pad + i * (cellW + gap);
            const y = pad + 22;
            const isGoldOnly = entry.cp <= 0 && entry.gold > 0;
            const isBonus = entry.gold > 0;
            const isJackpot = entry.day === 7;

            const grad = ctx.createLinearGradient(x, y, x, y + cellH);
            if (isJackpot) {
                grad.addColorStop(0, 'rgba(167, 139, 250, 0.35)');
                grad.addColorStop(1, 'rgba(34, 211, 238, 0.15)');
            } else if (isBonus) {
                grad.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
                grad.addColorStop(1, 'rgba(34, 211, 238, 0.12)');
            } else {
                grad.addColorStop(0, 'rgba(34, 211, 238, 0.18)');
                grad.addColorStop(1, 'rgba(15, 23, 42, 0.6)');
            }

            ctx.fillStyle = grad;
            ctx.strokeStyle = isJackpot
                ? 'rgba(167, 139, 250, 0.65)'
                : isBonus
                    ? 'rgba(251, 191, 36, 0.5)'
                    : 'rgba(34, 211, 238, 0.35)';
            ctx.lineWidth = isJackpot ? 2 : 1.5;
            roundRect(ctx, x, y, cellW, cellH, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 9px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`DAY ${entry.day}`, x + cellW / 2, y + 16);

            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 14px system-ui, sans-serif';
            if (isGoldOnly) {
                ctx.fillStyle = '#fbbf24';
                ctx.fillText(`${entry.gold}g`, x + cellW / 2, y + cellH * 0.52);
                ctx.fillStyle = '#94a3b8';
                ctx.font = 'bold 9px system-ui, sans-serif';
                ctx.fillText('GOLD', x + cellW / 2, y + cellH * 0.78);
            } else {
                const cpLabel = entry.cp >= 1000 ? `${entry.cp / 1000}k` : String(entry.cp);
                ctx.fillStyle = '#e2e8f0';
                ctx.font = 'bold 14px system-ui, sans-serif';
                ctx.fillText(`${cpLabel} $CP`, x + cellW / 2, y + cellH * 0.52);
                if (isJackpot) {
                    ctx.fillStyle = '#a78bfa';
                    ctx.font = 'bold 9px system-ui, sans-serif';
                    ctx.fillText('MAX', x + cellW / 2, y + cellH * 0.78);
                }
            }

            if (i < 6) {
                const ax = x + cellW + 2;
                const ay = y + cellH / 2;
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(ax + gap - 4, ay);
                ctx.stroke();
                ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
                ctx.beginPath();
                ctx.moveTo(ax + gap - 4, ay);
                ctx.lineTo(ax + gap - 7, ay - 3);
                ctx.lineTo(ax + gap - 7, ay + 3);
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.fillStyle = '#64748b';
        ctx.font = '9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('60 min play per UTC day · miss a day → streak resets', width / 2, height - 6);
    }, [width, height]);

    useEffect(() => {
        paint();
        window.addEventListener('resize', paint);
        return () => window.removeEventListener('resize', paint);
    }, [paint]);

    return (
        <canvas
            ref={canvasRef}
            className={`mx-auto block max-w-full ${className}`}
            aria-label="Seven day login streak: escalating CP rewards with gold on days 3 and 6"
        />
    );
}

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
