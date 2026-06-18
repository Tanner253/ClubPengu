import React, { useRef, useEffect, useCallback } from 'react';

const STEPS = [
    { label: 'Players Wager', color: '#34d399' },
    { label: 'Platform Earns', color: '#22d3ee' },
    { label: 'Reinvest', color: '#60a5fa' },
    { label: 'Improve', color: '#a78bfa' },
    { label: 'More Players', color: '#f472b6' },
];

/** Platform revenue flywheel — canvas replacement for emoji diagram. */
export default function RevenueFlywheelCanvas({ width = 560, height = 220, className = '' }) {
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

        const cx = width / 2;
        const cy = height / 2 + 8;
        const r = Math.min(width, height) * 0.34;
        const n = STEPS.length;

        ctx.strokeStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < n; i++) {
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
            const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
            const mid = (a0 + a1) / 2;
            const nx = cx + Math.cos(mid) * r;
            const ny = cy + Math.sin(mid) * r;

            const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, 38);
            grad.addColorStop(0, `${STEPS[i].color}44`);
            grad.addColorStop(1, `${STEPS[i].color}08`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(nx, ny, 36, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `${STEPS[i].color}99`;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = STEPS[i].color;
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(String(i + 1), nx, ny - 6);
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 9px system-ui, sans-serif';
            const words = STEPS[i].label.split(' ');
            ctx.fillText(words[0], nx, ny + 8);
            if (words[1]) ctx.fillText(words.slice(1).join(' '), nx, ny + 19);

            const ax = cx + Math.cos(a1) * (r - 8);
            const ay = cy + Math.sin(a1) * (r - 8);
            const tx = cx + Math.cos(a1) * (r + 8);
            const ty = cy + Math.sin(a1) * (r + 8);
            const perpX = -Math.sin(a1) * 6;
            const perpY = Math.cos(a1) * 6;

            ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(ax + perpX, ay + perpY);
            ctx.quadraticCurveTo(tx, ty, ax - perpX, ay - perpY);
            ctx.stroke();
        }

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FLYWHEEL', cx, cy - 2);
        ctx.fillStyle = '#64748b';
        ctx.font = '9px system-ui, sans-serif';
        ctx.fillText('5% P2P rake → growth', cx, cy + 12);
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
            aria-label="Platform revenue flywheel: wager, earn, reinvest, improve, grow"
        />
    );
}
