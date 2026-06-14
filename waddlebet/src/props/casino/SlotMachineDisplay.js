/**
 * SlotMachineDisplay - Animated slot machine with canvas reels
 * Classic fruit symbols (lobby gold slots) or gacha rarity symbols (game room)
 */

import BaseProp from '../BaseProp';

const CLASSIC_SYMBOLS = ['cherry', 'lemon', 'orange', 'plum', 'bell', 'bar', 'seven', 'gold7'];
const CLASSIC_EMOJI = {
    cherry: '🍒',
    lemon: '🍋',
    orange: '🍊',
    plum: '🍇',
    bell: '🔔',
    bar: 'BAR',
    seven: '7',
    gold7: '7'
};
const GACHA_SYMBOLS = ['⚪', '🟢', '🔵', '🟣', '🟡', '🔴', '✨', '💎'];

class SlotMachineDisplay extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.reelPositions = [0, 0, 0];
        this.centerSymbols = [0, 2, 4];
        this.reelScrollOffset = [0, 0, 0];
        this.spinning = [false, false, false];
        this.spinSpeed = [0, 0, 0];
        this.canvas = null;
        this.ctx = null;
        this.texture = null;
        this.width = 8;
        this.height = 6;
        this.theme = 'gacha';
        this.interactive = false;
        this.isServerSpinning = false;
        this.serverReelsLocked = [false, false, false];
        this.jackpotFlash = 0;
        this.lastSpinTime = 0;
        this.symbols = GACHA_SYMBOLS;
        this.lastDrawTime = 0;
        this.isMobile = typeof window !== 'undefined' && (window._isMobileGPU || window._isAppleDevice);
        this.lastLEDUpdate = 0;
        this.statusMessage = '';
        this.statusMessageTimer = 0;
        this.machineId = null;
    }

    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'slot_machine_display';

        const {
            width = 8,
            height = 6,
            frameColor = 0xFFD700,
            theme = 'gacha',
            headerText = '✨ GACHA ✨',
            interactive = false,
            machineId = null
        } = options;

        this.machineId = machineId;

        this.width = width;
        this.height = height;
        this.theme = theme;
        this.interactive = interactive;
        this.symbols = theme === 'classic' ? CLASSIC_SYMBOLS : GACHA_SYMBOLS;

        const frameThickness = Math.min(0.14, width * 0.05);
        const baseHeight = 0.28;

        const frameMat = this.createMaterial({
            color: frameColor,
            roughness: 0.15,
            metalness: 0.92,
            emissive: frameColor,
            emissiveIntensity: 0.12
        });

        const cabinet = new THREE.Mesh(
            new THREE.BoxGeometry(width + 0.12, height + 0.08, 0.52),
            this.createMaterial({ color: 0x12121a, roughness: 0.15, metalness: 0.9 })
        );
        cabinet.position.z = 0.08;
        this.addMesh(cabinet, group);

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(width + 0.22, baseHeight, 0.58),
            this.createMaterial({ color: 0x0a0a10, roughness: 0.3, metalness: 0.7 })
        );
        base.position.set(0, -height / 2 - baseHeight / 2 - 0.04, 0.1);
        this.addMesh(base, group);

        const bezelDepth = 0.18;
        const topBezel = new THREE.Mesh(
            new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, bezelDepth),
            frameMat
        );
        topBezel.position.set(0, height / 2 + frameThickness / 2, 0.28);
        this.addMesh(topBezel, group);

        const bottomBezel = new THREE.Mesh(
            new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, bezelDepth),
            frameMat
        );
        bottomBezel.position.set(0, -height / 2 - frameThickness / 2, 0.28);
        this.addMesh(bottomBezel, group);

        const sideBezelGeo = new THREE.BoxGeometry(frameThickness, height, bezelDepth);
        [-1, 1].forEach(side => {
            const sideBezel = new THREE.Mesh(sideBezelGeo, frameMat);
            sideBezel.position.set(side * (width / 2 + frameThickness / 2), 0, 0.28);
            this.addMesh(sideBezel, group);
        });

        this.canvas = document.createElement('canvas');
        this.canvas.width = 512;
        this.canvas.height = 384;
        this.ctx = this.canvas.getContext('2d');

        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;

        const displayMat = new THREE.MeshBasicMaterial({
            map: this.texture,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false
        });
        const display = new THREE.Mesh(
            new THREE.PlaneGeometry(width - frameThickness * 2, height - frameThickness * 2),
            displayMat
        );
        // In front of cabinet face (cabinet z≈0.34) so the canvas is visible
        display.position.z = 0.52;
        display.renderOrder = 3;
        this.displayMesh = display;
        this.addMesh(display, group);
        this.materials.push(displayMat);

        this.floorOffsetY = height / 2 + baseHeight + frameThickness + 0.06;

        this.createHeaderSign(group, width, height, headerText, theme);
        this.createLEDBorder(group, width, height);

        // Unique idle symbols per machine so displays don't look cloned
        const idleBase = machineId
            ? parseInt(String(machineId).split('_').pop(), 10) || 0
            : 0;
        this.centerSymbols = [
            idleBase % this.symbols.length,
            (idleBase + 2) % this.symbols.length,
            (idleBase + 4) % this.symbols.length
        ];
        this.reelScrollOffset = [0, 0, 0];
        this.drawSlotDisplay();
        this.setPosition(x, y, z);
        return this;
    }

    symbolToIndex(symbolId) {
        const idx = this.symbols.indexOf(symbolId);
        return idx >= 0 ? idx : 0;
    }

    beginServerSpin() {
        if (this.isServerSpinning) return;
        this.isServerSpinning = true;
        this.serverReelsLocked = [false, false, false];
        this.jackpotFlash = 0;
        this.statusMessage = 'SPINNING...';
        this.statusMessageTimer = -1;
        for (let r = 0; r < 3; r++) {
            this.spinning[r] = true;
            this.spinSpeed[r] = 22 + r * 4;
            this.reelScrollOffset[r] = Math.random();
        }
        this.lastDrawTime = 0;
        this.drawSlotDisplay();
    }

    revealServerReel(reelIndex, symbolId) {
        if (reelIndex < 0 || reelIndex > 2) return;
        this.serverReelsLocked[reelIndex] = true;
        this.spinning[reelIndex] = false;
        this.spinSpeed[reelIndex] = 0;
        this.centerSymbols[reelIndex] = this.symbolToIndex(symbolId);
        this.reelScrollOffset[reelIndex] = 0;
        this.drawSlotDisplay();
    }

    finishServerSpin(reels, payout, isJackpot) {
        if (Array.isArray(reels)) {
            reels.forEach((symbolId, idx) => this.revealServerReel(idx, symbolId));
        }
        if (payout > 0) {
            this.jackpotFlash = isJackpot ? 1.5 : 0.8;
            this.statusMessage = isJackpot ? `JACKPOT! +${payout}g` : `WINNER! +${payout}g`;
        } else {
            this.statusMessage = 'TRY AGAIN';
        }
        this.statusMessageTimer = 4;
        this.isServerSpinning = false;
        this.spinning = [false, false, false];
        this.drawSlotDisplay();
    }

    cancelServerSpin() {
        this.isServerSpinning = false;
        this.spinning = [false, false, false];
        this.spinSpeed = [0, 0, 0];
        this.serverReelsLocked = [false, false, false];
        this.reelScrollOffset = [0, 0, 0];
        this.statusMessage = '';
        this.statusMessageTimer = 0;
        this.drawSlotDisplay();
    }

    createHeaderSign(group, width, height, headerText, theme) {
        const headerW = width * 0.92;
        const headerH = Math.max(0.34, width * 0.12);
        const headerCanvas = document.createElement('canvas');
        headerCanvas.width = 512;
        headerCanvas.height = 80;
        const ctx = headerCanvas.getContext('2d');

        if (theme === 'classic') {
            const barGrad = ctx.createLinearGradient(0, 0, 512, 0);
            barGrad.addColorStop(0, '#660033');
            barGrad.addColorStop(0.5, '#FF1493');
            barGrad.addColorStop(1, '#660033');
            ctx.fillStyle = barGrad;
            ctx.fillRect(8, 12, 496, 56);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.strokeRect(8, 12, 496, 56);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 512, 80);
        }

        ctx.font = `bold ${headerText.length > 8 ? 44 : 52}px Impact, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textGrad = ctx.createLinearGradient(0, 0, 512, 0);
        textGrad.addColorStop(0, '#FFD700');
        textGrad.addColorStop(0.5, '#FFFFAA');
        textGrad.addColorStop(1, '#FFD700');
        ctx.fillStyle = textGrad;
        ctx.shadowColor = theme === 'classic' ? '#FF69B4' : '#A855F7';
        ctx.shadowBlur = 14;
        ctx.fillText(headerText, 256, 40);

        const header = new THREE.Mesh(
            new THREE.PlaneGeometry(headerW, headerH),
            new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(headerCanvas), transparent: true })
        );
        header.position.set(0, height / 2 + headerH / 2 + 0.18, 0.55);
        header.userData.isJackpotSign = true;
        this.addMesh(header, group);
        this.materials.push(header.material);
    }

    createLEDBorder(group, width, height) {
        if (this.isMobile) return;
        const ledSize = Math.min(0.1, width * 0.035);
        const ledSpacing = Math.max(0.22, width * 0.09);
        const ledGeo = new THREE.BoxGeometry(ledSize, ledSize, ledSize * 0.6);
        const inset = ledSpacing * 0.5;
        let ledIdx = 0;

        const createLED = (lx, ly) => {
            const led = new THREE.Mesh(ledGeo, this.createMaterial({
                color: 0xFF0000, emissive: 0xFF0000, emissiveIntensity: 0.8
            }));
            led.position.set(lx, ly, 0.56);
            led.userData.ledIndex = ledIdx++;
            this.addMesh(led, group);
        };

        for (let lx = -width / 2 + inset; lx <= width / 2 - inset + 0.001; lx += ledSpacing) createLED(lx, height / 2 + 0.02);
        for (let ly = height / 2; ly >= -height / 2; ly -= ledSpacing) createLED(width / 2 + 0.02, ly);
        for (let lx = width / 2 - inset; lx >= -width / 2 + inset - 0.001; lx -= ledSpacing) createLED(lx, -height / 2 - 0.02);
        for (let ly = -height / 2; ly <= height / 2; ly += ledSpacing) createLED(-width / 2 - 0.02, ly);
    }

    drawClassicSymbol(ctx, symbol, x, y, size) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (symbol === 'bar') {
            const s = size * 0.38;
            const bw = s * 1.6;
            const bh = s * 0.7;
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
            ctx.font = `bold ${size * 0.28}px Arial, sans-serif`;
            ctx.fillStyle = '#1a0a2e';
            ctx.fillText('BAR', x, y);
        } else if (symbol === 'seven') {
            ctx.font = `bold ${size * 0.75}px Impact, Arial, sans-serif`;
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 8;
            ctx.fillText('7', x, y);
        } else if (symbol === 'gold7') {
            ctx.font = `bold ${size * 0.8}px Impact, Arial, sans-serif`;
            ctx.fillStyle = '#fde047';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 12;
            ctx.fillText('7', x, y);
        } else {
            const emoji = CLASSIC_EMOJI[symbol];
            this.drawClassicSymbolShape(ctx, symbol, x, y, size);
            if (emoji) {
                const emojiFont = `${size * 0.72}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
                ctx.font = emojiFont;
                ctx.fillText(emoji, x, y);
            }
        }
        ctx.restore();
    }

    drawClassicSymbolShape(ctx, symbol, x, y, size) {
        const s = size * 0.38;
        switch (symbol) {
            case 'cherry':
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(x - 2, y - s * 0.55, 4, s * 0.35);
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(x - s * 0.35, y + s * 0.1, s * 0.38, 0, Math.PI * 2);
                ctx.arc(x + s * 0.35, y + s * 0.1, s * 0.38, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'lemon':
                ctx.fillStyle = '#facc15';
                ctx.beginPath();
                ctx.ellipse(x, y, s * 0.5, s * 0.38, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ca8a04';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
            case 'orange':
                ctx.fillStyle = '#f97316';
                ctx.beginPath();
                ctx.arc(x, y, s * 0.42, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'plum':
                ctx.fillStyle = '#a855f7';
                ctx.beginPath();
                ctx.arc(x, y, s * 0.4, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'bell':
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(x, y + s * 0.05, s * 0.42, Math.PI, 0);
                ctx.lineTo(x + s * 0.42, y + s * 0.35);
                ctx.lineTo(x - s * 0.42, y + s * 0.35);
                ctx.closePath();
                ctx.fill();
                break;
            default:
                ctx.fillStyle = '#FFD700';
                ctx.font = `bold ${size * 0.45}px Arial, sans-serif`;
                ctx.fillText('?', x, y);
        }
    }

    drawSlotDisplay() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);

        const reelWidth = W / 3;
        const rowHeight = H / 3;
        const paylineY = H / 2;

        for (let r = 0; r < 3; r++) {
            const reelX = r * reelWidth;
            ctx.fillStyle = '#2a2a40';
            ctx.fillRect(reelX + 4, 4, reelWidth - 8, H - 8);

            const symbolCount = Math.max(1, this.symbols.length);
            const scroll = this.interactive
                ? (this.spinning[r] ? this.reelScrollOffset[r] % 1 : 0)
                : (this.reelPositions[r] % 1);

            const rowRange = this.spinning[r] ? 2 : 1;
            for (let s = -rowRange; s <= rowRange; s++) {
                let symbolIdx;
                let symbolY;

                if (this.interactive) {
                    const rowOffset = s - scroll;
                    symbolY = paylineY + rowOffset * rowHeight;
                    symbolIdx = Math.floor(
                        (this.centerSymbols[r] + rowOffset + symbolCount * 100) % symbolCount
                    );
                } else {
                    const pos = this.reelPositions[r];
                    symbolIdx = Math.floor((pos + s + symbolCount * 100) % symbolCount);
                    symbolY = (s - (pos % 1)) * rowHeight + paylineY;
                }

                if (symbolY > -rowHeight && symbolY < H + rowHeight) {
                    const cx = reelX + reelWidth / 2;
                    const symbolSize = rowHeight * 0.78;
                    if (this.theme === 'classic') {
                        this.drawClassicSymbol(ctx, this.symbols[symbolIdx], cx, symbolY, symbolSize);
                    } else {
                        ctx.font = 'bold 80px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillText(this.symbols[symbolIdx], cx, symbolY);
                    }
                }
            }
            if (r < 2) {
                ctx.fillStyle = '#C9A227';
                ctx.fillRect(reelX + reelWidth - 2, 0, 4, H);
            }
        }

        ctx.strokeStyle = 'rgba(255, 50, 50, 0.7)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        if (this.jackpotFlash > 0) {
            ctx.fillStyle = `rgba(255, 215, 0, ${this.jackpotFlash * 0.3})`;
            ctx.fillRect(0, 0, W, H);
        }

        if (this.statusMessage) {
            const bannerH = 54;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
            ctx.fillRect(0, H - bannerH, W, bannerH);
            ctx.font = 'bold 26px Impact, Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (this.statusMessage.includes('WIN') || this.statusMessage.includes('JACKPOT')) {
                ctx.fillStyle = '#4ade80';
            } else if (this.statusMessage === 'TRY AGAIN') {
                ctx.fillStyle = '#f87171';
            } else {
                ctx.fillStyle = '#fbbf24';
            }
            ctx.fillText(this.statusMessage, W / 2, H - bannerH / 2);
        }

        this.texture.needsUpdate = true;
    }

    update(time, delta) {
        this.meshes.forEach(mesh => {
            if (mesh.userData.isJackpotSign) {
                mesh.scale.setScalar(1 + Math.sin(time * 4) * 0.03);
            }
        });

        if (this.interactive) {
            let anySpinning = false;
            for (let r = 0; r < 3; r++) {
                if (this.spinning[r] && !this.serverReelsLocked[r]) {
                    anySpinning = true;
                    this.reelScrollOffset[r] += this.spinSpeed[r] * delta * 0.65;
                }
            }
            if (this.jackpotFlash > 0) {
                this.jackpotFlash = Math.max(0, this.jackpotFlash - delta * 1.5);
            }
            if (this.statusMessageTimer > 0) {
                this.statusMessageTimer = Math.max(0, this.statusMessageTimer - delta);
                if (this.statusMessageTimer === 0) {
                    this.statusMessage = '';
                }
            }
            if (anySpinning || this.jackpotFlash > 0 || this.isServerSpinning || this.statusMessageTimer > 0) {
                this.drawSlotDisplay();
            } else if (time - this.lastDrawTime > 2) {
                this.lastDrawTime = time;
                this.drawSlotDisplay();
            }
            if (!this.isMobile && time - this.lastLEDUpdate > 0.1) {
                this.lastLEDUpdate = time;
                this.animateLEDs(time);
            }
            return;
        }

        if (this.isMobile) return;

        if (time - this.lastSpinTime > 4) {
            this.startSpin();
            this.lastSpinTime = time;
        }

        let anySpinning = false;
        for (let r = 0; r < 3; r++) {
            if (this.spinning[r]) {
                anySpinning = true;
                this.reelPositions[r] += this.spinSpeed[r] * delta;
                this.spinSpeed[r] *= 0.98;
                if (this.spinSpeed[r] < 0.5) {
                    this.spinning[r] = false;
                    this.reelPositions[r] = Math.round(this.reelPositions[r]);
                }
            }
        }

        if (this.jackpotFlash > 0) {
            this.jackpotFlash = Math.max(0, this.jackpotFlash - delta * 2);
        }

        if (time - this.lastLEDUpdate > 0.1) {
            this.lastLEDUpdate = time;
            this.animateLEDs(time);
        }

        if (anySpinning || this.jackpotFlash > 0) {
            this.drawSlotDisplay();
        }
    }

    animateLEDs(time) {
        this.meshes.forEach(mesh => {
            if (mesh.userData.ledIndex !== undefined) {
                const idx = mesh.userData.ledIndex;
                const chasePhase = (time * 10 + idx) % 20;
                mesh.material.emissiveIntensity = chasePhase < 3 ? 1.0 : 0.25;
                const hue = (time * 0.3 + idx * 0.02) % 1;
                mesh.material.emissive.setHSL(hue, 1, 0.5);
                mesh.material.color.setHSL(hue, 1, 0.5);
            }
        });
    }

    startSpin() {
        for (let r = 0; r < 3; r++) {
            setTimeout(() => {
                this.spinning[r] = true;
                this.spinSpeed[r] = 15 + Math.random() * 10;
            }, r * 200);
        }
    }
}

export default SlotMachineDisplay;
