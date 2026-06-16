/**
 * Procedural ice-sheet ground texture for Town — cracks, frost, drift, and depth variation.
 */

export function createTownIceGroundTexture(THREE, size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base glacier blue
    ctx.fillStyle = '#5a9ec4';
    ctx.fillRect(0, 0, size, size);

    // Large depth pools (darker ice)
    for (let i = 0; i < 45; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 18 + Math.random() * 55;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${35 + Math.random() * 25}, ${85 + Math.random() * 30}, ${120 + Math.random() * 25}, 0.55)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Frost bloom highlights
    for (let i = 0; i < 90; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 6 + Math.random() * 22;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${200 + Math.random() * 40}, ${230 + Math.random() * 25}, ${255}, 0.35)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ice cracks — thin branching lines
    ctx.lineCap = 'round';
    for (let i = 0; i < 35; i++) {
        let x = Math.random() * size;
        let y = Math.random() * size;
        ctx.strokeStyle = `rgba(${20 + Math.random() * 30}, ${55 + Math.random() * 40}, ${90 + Math.random() * 35}, ${0.25 + Math.random() * 0.35})`;
        ctx.lineWidth = 0.6 + Math.random() * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const segments = 3 + Math.floor(Math.random() * 5);
        for (let s = 0; s < segments; s++) {
            x += (Math.random() - 0.5) * 40;
            y += (Math.random() - 0.5) * 40;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // Packed snow / wind drift streaks (subtle white smears)
    for (let i = 0; i < 55; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const w = 20 + Math.random() * 60;
        const h = 4 + Math.random() * 10;
        ctx.fillStyle = `rgba(${210 + Math.random() * 35}, ${225 + Math.random() * 25}, ${240 + Math.random() * 15}, ${0.12 + Math.random() * 0.2})`;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((Math.random() - 0.5) * 0.8);
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
    }

    // Sparkle grains
    for (let i = 0; i < 650; i++) {
        const bright = Math.random() > 0.65;
        ctx.fillStyle = bright ? '#e8f4ff' : '#7eb8d8';
        const s = bright ? 1 + Math.random() * 2 : 1;
        ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
