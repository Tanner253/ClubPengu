import React, { useRef, useEffect, useCallback } from 'react';

/** Decorative canvas loop diagram for economy whitepaper. */
function EconomyLoopCanvas({ width = 640, height = 280, className = '' }) {
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
        const cy = height / 2 + 10;
        const r = Math.min(width, height) * 0.32;

        const nodes = [
            { label: 'GATHER', sub: 'fish · wood', color: '#34d399', angle: -Math.PI / 2 },
            { label: 'GEAR', sub: 'axes · rods', color: '#60a5fa', angle: -Math.PI / 6 },
            { label: 'CONTRACTS', sub: 'NPC quests', color: '#fbbf24', angle: Math.PI / 6 },
            { label: 'GOLD', sub: 'travel · wagers', color: '#f59e0b', angle: Math.PI / 2 },
            { label: '$CP', sub: 'on-chain', color: '#a78bfa', angle: (5 * Math.PI) / 6 },
            { label: 'SINKS', sub: 'rent · gacha', color: '#f472b6', angle: (7 * Math.PI) / 6 },
        ];

        ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i].angle;
            const nx = cx + Math.cos(a) * r;
            const ny = cy + Math.sin(a) * r;
            const next = nodes[(i + 1) % nodes.length];
            const na = next.angle;
            const n2x = cx + Math.cos(na) * r;
            const n2y = cy + Math.sin(na) * r;

            ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(nx, ny);
            ctx.lineTo(n2x, n2y);
            ctx.stroke();

            const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, 36);
            grad.addColorStop(0, `${nodes[i].color}55`);
            grad.addColorStop(1, `${nodes[i].color}10`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(nx, ny, 34, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `${nodes[i].color}99`;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(nodes[i].label, nx, ny - 2);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px system-ui, sans-serif';
            ctx.fillText(nodes[i].sub, nx, ny + 12);
        }

        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CLOSED LOOP', cx, cy - 4);
        ctx.fillStyle = '#64748b';
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillText('materials → progression', cx, cy + 12);
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
            aria-label="Economy loop diagram: gather, gear, contracts, gold, CP token, sinks"
        />
    );
}

export { EconomyLoopCanvas };
export default EconomyLoopCanvas;
