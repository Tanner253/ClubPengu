/**
 * SlotMachineSystem - Client-side slot machine interaction and spectator display
 * 
 * Features:
 * - One spectator bubble per slot MACHINE (not per player)
 * - Bubble appears above the slot machine when in use
 * - Fast, smooth spinning animations
 * - Jackpot celebration effects
 */

const SPIN_COST = 10;
const INTERACTION_RADIUS = 3;
const BUBBLE_HEIGHT_ABOVE_MACHINE = 7;
const RESULT_DISPLAY_TIME = 3000;
const MAX_CONCURRENT_SPINS = 2;

// Symbols for display
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'];

class SlotMachineSystem {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        this.slotMachines = [];
        this.machineDisplays = new Map();
        this.nearbyMachine = null;
        this.localSpinningMachines = new Set();
    }
    
    initForCasino(roomWidth, roomDepth) {
        this.slotMachines = [];
        this.cleanup();
        
        const slotRowZ = [15, 25, 35, 45, 55, 65];
        
        slotRowZ.forEach((z, idx) => {
            this.slotMachines.push({
                id: `slot_left_${idx}`,
                x: 6,
                z: z,
                rotation: Math.PI / 2
            });
        });
        
        slotRowZ.forEach((z, idx) => {
            this.slotMachines.push({
                id: `slot_right_${idx}`,
                x: roomWidth - 6,
                z: z,
                rotation: -Math.PI / 2
            });
        });
    }
    
    checkInteraction(playerX, playerZ, playerCoins, isAuthenticated) {
        let nearestMachine = null;
        let nearestDist = Infinity;
        
        for (const machine of this.slotMachines) {
            const dx = playerX - machine.x;
            const dz = playerZ - machine.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < INTERACTION_RADIUS && dist < nearestDist) {
                nearestDist = dist;
                nearestMachine = machine;
            }
        }
        
        this.nearbyMachine = nearestMachine;
        if (!nearestMachine) return null;
        
        const display = this.machineDisplays.get(nearestMachine.id);
        const machineInUse = display && display.state !== 'idle';
        const atMaxSpins = this.localSpinningMachines.size >= MAX_CONCURRENT_SPINS;
        
        let prompt = `Press E to Spin - Cost: ${SPIN_COST}g`;
        let canSpin = true;
        let reason = null;
        let isDemo = false;
        
        if (machineInUse) {
            prompt = `${display.playerName || 'Someone'} is playing...`;
            canSpin = false;
            reason = 'MACHINE_IN_USE';
        } else if (atMaxSpins) {
            prompt = `Max ${MAX_CONCURRENT_SPINS} spins at once!`;
            canSpin = false;
            reason = 'MAX_SPINS';
        } else if (!isAuthenticated) {
            prompt = '🎰 FREE DEMO! Press E';
            canSpin = true;
            isDemo = true;
        } else if (playerCoins < SPIN_COST) {
            prompt = `Need ${SPIN_COST}g (you have ${playerCoins}g)`;
            canSpin = false;
            reason = 'INSUFFICIENT_FUNDS';
        }
        
        return { machine: nearestMachine, prompt, canSpin, reason, cost: isDemo ? 0 : SPIN_COST, isDemo };
    }
    
    startSpin(machineId, playerName, isDemo = false) {
        console.log('🎰 startSpin:', machineId, 'scene:', !!this.scene, 'machines:', this.slotMachines.length);
        
        const machine = this.slotMachines.find(m => m.id === machineId);
        if (!machine) {
            console.warn('🎰 Machine not found:', machineId);
            return;
        }
        
        this.localSpinningMachines.add(machineId);
        
        let display = this.machineDisplays.get(machineId);
        if (!display) {
            console.log('🎰 Creating display for:', machineId);
            display = this.createMachineDisplay(machine);
            if (!display) {
                console.error('🎰 Failed to create display!');
                return;
            }
            this.machineDisplays.set(machineId, display);
        }
        
        // Clear any existing timeout
        if (display.timeout) {
            clearTimeout(display.timeout);
            display.timeout = null;
        }
        
        // INSTANT display - show immediately
        display.playerName = playerName;
        display.isDemo = isDemo;
        display.state = 'spinning';
        display.reels = [null, null, null];
        display.revealedReels = 0;
        display.payout = null;
        display.spinStartTime = Date.now();
        display.sprite.visible = true;
        display.isJackpot = false;
        
        console.log('🎰 Display ready, visible:', display.sprite.visible, 'pos:', display.sprite.position.toArray());
        display.jackpotParticles = [];
        
        this.drawMachineDisplay(machineId);
        // No safety timeout - server handles timing
    }
    
    handleRemoteSpinStart(machineId, playerName, isDemo = false) {
        const machine = this.slotMachines.find(m => m.id === machineId);
        if (!machine) return;
        
        let display = this.machineDisplays.get(machineId);
        if (!display) {
            display = this.createMachineDisplay(machine);
            if (!display) return;
            this.machineDisplays.set(machineId, display);
        }
        
        // Clear any existing timeout
        if (display.timeout) {
            clearTimeout(display.timeout);
            display.timeout = null;
        }
        
        display.playerName = playerName;
        display.isDemo = isDemo;
        display.state = 'spinning';
        display.reels = [null, null, null];
        display.revealedReels = 0;
        display.payout = null;
        display.spinStartTime = Date.now();
        display.sprite.visible = true;
        display.isJackpot = false;
        display.jackpotParticles = [];
        
        this.drawMachineDisplay(machineId);
        // No safety timeout - server handles timing
    }
    
    createMachineDisplay(machine) {
        const THREE = this.THREE;
        
        // Validate scene exists
        if (!this.scene) {
            console.warn('🎰 SlotMachineSystem: No scene reference, cannot create display');
            return null;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = 420;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(7, 5, 1);
        sprite.renderOrder = 1000;
        sprite.visible = false;
        sprite.position.set(machine.x, BUBBLE_HEIGHT_ABOVE_MACHINE, machine.z);
        
        this.scene.add(sprite);
        
        return {
            sprite, canvas, ctx, texture, material,
            machineId: machine.id,
            machineX: machine.x,
            machineZ: machine.z,
            playerName: '',
            isDemo: false,
            state: 'idle',
            reels: [null, null, null],
            revealedReels: 0,
            payout: null,
            spinStartTime: 0,
            isJackpot: false,
            jackpotParticles: [],
            timeout: null
        };
    }
    
    revealReel(machineId, reelIndex, symbol) {
        let display = this.machineDisplays.get(machineId);
        
        // If display doesn't exist, create it (handles WebGL context restore)
        if (!display) {
            const machine = this.slotMachines.find(m => m.id === machineId);
            if (!machine) return;
            
            display = this.createMachineDisplay(machine);
            if (!display) return; // Failed to create display
            display.state = 'spinning';
            display.sprite.visible = true;
            this.machineDisplays.set(machineId, display);
        }
        
        display.reels[reelIndex] = symbol;
        display.revealedReels = Math.max(display.revealedReels, reelIndex + 1);
        this.drawMachineDisplay(machineId);
    }
    
    completeSpin(machineId, reels, payout, isDemo = false) {
        let display = this.machineDisplays.get(machineId);
        
        // If display doesn't exist, create it (handles WebGL context restore)
        if (!display) {
            const machine = this.slotMachines.find(m => m.id === machineId);
            if (!machine) return; // Unknown machine, ignore
            
            display = this.createMachineDisplay(machine);
            if (!display) return; // Failed to create display
            this.machineDisplays.set(machineId, display);
        }
        
        // Clear safety timeout
        if (display.timeout) {
            clearTimeout(display.timeout);
            display.timeout = null;
        }
        
        display.reels = reels;
        display.revealedReels = 3;
        display.payout = payout;
        display.isDemo = isDemo;
        display.state = 'result';
        display.sprite.visible = true;
        
        // Check for jackpot - triple 7s specifically, or any huge win (1000+ coins)
        const isTripleSevens = reels && reels.length === 3 && 
            reels.every(r => r && (r.id === 'seven' || r.emoji === '7️⃣'));
        const isHugeWin = payout && payout.coins >= 500;
        const isJackpot = isTripleSevens || isHugeWin;
        display.isJackpot = isJackpot;
        
        if (isJackpot) {
            console.log('🎰💰 JACKPOT on bubble!', reels?.map(r => r?.emoji).join(' '));
        }
        
        if (isJackpot) {
            this.startJackpotCelebration(machineId);
        }
        
        this.drawMachineDisplay(machineId);
        this.localSpinningMachines.delete(machineId);
        
        setTimeout(() => {
            if (display.state === 'result') {
                display.state = 'idle';
                display.sprite.visible = false;
                display.isJackpot = false;
                display.jackpotParticles = [];
            }
        }, isJackpot ? 5000 : RESULT_DISPLAY_TIME);
    }
    
    startJackpotCelebration(machineId) {
        const display = this.machineDisplays.get(machineId);
        if (!display) return;
        
        // Create particle data for canvas animation
        display.jackpotParticles = [];
        for (let i = 0; i < 50; i++) {
            display.jackpotParticles.push({
                x: Math.random() * display.canvas.width,
                y: -20 - Math.random() * 100,
                vx: (Math.random() - 0.5) * 3,
                vy: 2 + Math.random() * 3,
                size: 4 + Math.random() * 8,
                color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F1C'][Math.floor(Math.random() * 5)],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                type: Math.random() > 0.5 ? 'star' : 'coin'
            });
        }
    }
    
    handleSpinError(machineId) {
        const display = this.machineDisplays.get(machineId);
        if (display) {
            display.state = 'idle';
            display.sprite.visible = false;
        }
        this.localSpinningMachines.delete(machineId);
    }
    
    drawMachineDisplay(machineId) {
        const display = this.machineDisplays.get(machineId);
        if (!display) return;
        
        const { ctx, canvas, texture, playerName, isDemo, state, reels, revealedReels, payout, isJackpot, jackpotParticles } = display;
        const W = canvas.width;
        const H = canvas.height;
        
        ctx.clearRect(0, 0, W, H);
        
        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        if (isJackpot) {
            bgGrad.addColorStop(0, 'rgba(80, 40, 120, 0.98)');
            bgGrad.addColorStop(0.5, 'rgba(120, 60, 160, 0.98)');
            bgGrad.addColorStop(1, 'rgba(60, 30, 100, 0.98)');
        } else {
            bgGrad.addColorStop(0, 'rgba(40, 20, 80, 0.98)');
            bgGrad.addColorStop(1, 'rgba(20, 10, 50, 0.98)');
        }
        ctx.fillStyle = bgGrad;
        this.roundRect(ctx, 4, 4, W - 8, H - 8, 16);
        ctx.fill();
        
        // Border with glow
        const borderColor = isJackpot ? '#FFD700' : (isDemo ? '#22C55E' : '#8B5CF6');
        ctx.shadowColor = borderColor;
        ctx.shadowBlur = isJackpot ? 30 : 15;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isJackpot ? 5 : 3;
        this.roundRect(ctx, 4, 4, W - 8, H - 8, 16);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Header
        ctx.fillStyle = borderColor;
        ctx.font = 'bold 22px "Segoe UI", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (isJackpot) {
            ctx.fillText(`🎉 ${playerName} 🎉`, W / 2, 32);
        } else if (isDemo) {
            ctx.fillText(`🎁 ${playerName} [DEMO]`, W / 2, 32);
        } else {
            ctx.fillText(`🎰 ${playerName}`, W / 2, 32);
        }
        
        // Reel container
        const reelContainerX = 25;
        const reelContainerY = 55;
        const reelContainerW = W - 50;
        const reelContainerH = 140;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.roundRect(ctx, reelContainerX, reelContainerY, reelContainerW, reelContainerH, 12);
        ctx.fill();
        
        // Reels
        const reelW = 100;
        const reelH = 120;
        const reelGap = 20;
        const totalReelW = reelW * 3 + reelGap * 2;
        const reelStartX = (W - totalReelW) / 2;
        const reelY = reelContainerY + 10;
        
        for (let r = 0; r < 3; r++) {
            const rx = reelStartX + r * (reelW + reelGap);
            
            // Reel background
            const reelGrad = ctx.createLinearGradient(rx, reelY, rx, reelY + reelH);
            reelGrad.addColorStop(0, '#0a0520');
            reelGrad.addColorStop(0.5, '#150a35');
            reelGrad.addColorStop(1, '#0a0520');
            ctx.fillStyle = reelGrad;
            this.roundRect(ctx, rx, reelY, reelW, reelH, 10);
            ctx.fill();
            
            // Reel border
            ctx.strokeStyle = isJackpot && state === 'result' ? '#FFD700' : '#3a2a5e';
            ctx.lineWidth = isJackpot && state === 'result' ? 3 : 2;
            this.roundRect(ctx, rx, reelY, reelW, reelH, 10);
            ctx.stroke();
            
            ctx.font = '64px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const centerX = rx + reelW / 2;
            const centerY = reelY + reelH / 2;
            
            if (r < revealedReels && reels[r]) {
                // Revealed symbol
                if (isJackpot && state === 'result') {
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 20;
                }
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(reels[r].emoji, centerX, centerY);
                ctx.shadowBlur = 0;
            } else if (state === 'spinning') {
                // FAST spinning animation
                const t = Date.now();
                const speed = 30 - r * 5; // Very fast
                const offset = (t / speed) % SYMBOLS.length;
                
                ctx.save();
                ctx.beginPath();
                this.roundRect(ctx, rx + 2, reelY + 2, reelW - 4, reelH - 4, 8);
                ctx.clip();
                
                for (let s = -2; s <= 2; s++) {
                    const idx = Math.floor((offset + s + SYMBOLS.length * 10) % SYMBOLS.length);
                    const yPos = centerY + s * 45 + ((t / speed * 45) % 45);
                    const alpha = 1 - Math.abs(s) * 0.25;
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
                    ctx.fillText(SYMBOLS[idx], centerX, yPos);
                }
                ctx.restore();
            }
        }
        
        // Win line
        ctx.strokeStyle = '#FF3366';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(reelStartX - 15, reelY + reelH / 2);
        ctx.lineTo(reelStartX + totalReelW + 15, reelY + reelH / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Status area
        const statusY = reelContainerY + reelContainerH + 15;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (state === 'result' && payout) {
            if (isJackpot) {
                // JACKPOT animation
                const pulse = 1 + Math.sin(Date.now() / 100) * 0.15;
                ctx.save();
                ctx.translate(W / 2, statusY + 20);
                ctx.scale(pulse, pulse);
                ctx.fillStyle = '#FFD700';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 30;
                ctx.font = 'bold 32px "Segoe UI", Arial';
                ctx.fillText(`💰 JACKPOT ${payout.coins}g! 💰`, 0, 0);
                ctx.restore();
                ctx.shadowBlur = 0;
            } else if (isDemo && payout.hypotheticalWin > 0) {
                ctx.fillStyle = '#FF6B6B';
                ctx.font = 'bold 18px "Segoe UI", Arial';
                ctx.fillText(`Would've won ${payout.hypotheticalWin}g!`, W / 2, statusY + 10);
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 14px "Segoe UI", Arial';
                ctx.fillText('🔑 Login to win real gold!', W / 2, statusY + 35);
            } else if (payout.coins > 0) {
                ctx.fillStyle = '#FFD700';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 15;
                ctx.font = 'bold 26px "Segoe UI", Arial';
                ctx.fillText(`🎉 WIN ${payout.coins}g! 🎉`, W / 2, statusY + 20);
                ctx.shadowBlur = 0;
            } else if (isDemo) {
                ctx.fillStyle = '#888';
                ctx.font = '16px "Segoe UI", Arial';
                ctx.fillText('No win this time', W / 2, statusY + 10);
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 13px "Segoe UI", Arial';
                ctx.fillText('🔑 Login to win for real!', W / 2, statusY + 32);
            } else {
                ctx.fillStyle = '#888';
                ctx.font = '18px "Segoe UI", Arial';
                ctx.fillText('No win - Try again!', W / 2, statusY + 20);
            }
        } else if (state === 'spinning') {
            const dots = '.'.repeat((Math.floor(Date.now() / 200) % 4));
            ctx.fillStyle = '#88FF88';
            ctx.font = 'bold 22px "Segoe UI", Arial';
            ctx.fillText(`Spinning${dots}`, W / 2, statusY + 20);
        }
        
        // Draw jackpot particles
        if (isJackpot && jackpotParticles.length > 0) {
            for (const p of jackpotParticles) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                
                if (p.type === 'star') {
                    this.drawStar(ctx, 0, 0, 5, p.size, p.size / 2);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
                
                // Update particle
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotationSpeed;
                p.vy += 0.1; // Gravity
            }
        }
        
        texture.needsUpdate = true;
    }
    
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
    
    roundRect(ctx, x, y, w, h, r) {
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
    
    update(time, delta) {
        for (const [machineId, display] of this.machineDisplays) {
            if (display.state === 'spinning' || (display.state === 'result' && display.isJackpot)) {
                this.drawMachineDisplay(machineId);
            }
        }
    }
    
    isMachineDisplayActive(machineId) {
        const display = this.machineDisplays.get(machineId);
        return display && display.state !== 'idle' && display.sprite.visible;
    }
    
    isLocalSpinning() {
        return this.localSpinningMachines.size > 0;
    }
    
    getLocalSpinCount() {
        return this.localSpinningMachines.size;
    }
    
    cleanup() {
        for (const [machineId, display] of this.machineDisplays) {
            if (display.timeout) clearTimeout(display.timeout);
            if (display.sprite && display.sprite.parent) {
                display.sprite.parent.remove(display.sprite);
            }
            if (display.material) display.material.dispose();
            if (display.texture) display.texture.dispose();
        }
        this.machineDisplays.clear();
        this.localSpinningMachines.clear();
    }
}

export default SlotMachineSystem;
export { SPIN_COST, INTERACTION_RADIUS, SYMBOLS };
