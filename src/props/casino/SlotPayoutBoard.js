/**
 * SlotPayoutBoard - A board showing slot machine payouts and probabilities
 * Displays near the casino exit to inform players of winning mechanics
 * HORIZONTAL LAYOUT - wider board for better readability
 * SIZE: +75% from original (multiple increases)
 */

export function createSlotPayoutBoard(THREE, position = { x: 0, y: 0, z: 0 }, rotation = 0) {
    const group = new THREE.Group();
    
    // Board dimensions - HORIZONTAL, +25% bigger from last
    const boardWidth = 21.6;   // +25% from 17.3
    const boardHeight = 9.0;   // +25% from 7.2
    const boardDepth = 0.45;   // +25%
    
    // Create wooden frame
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a3728,
        roughness: 0.8,
        metalness: 0.1
    });
    
    // Main board backing
    const backingGeo = new THREE.BoxGeometry(boardWidth + 0.75, boardHeight + 0.75, boardDepth);
    const backing = new THREE.Mesh(backingGeo, frameMaterial);
    backing.position.z = -boardDepth / 2;
    // Skip shadows on Apple/Mobile for performance
    const skipShadows = typeof window !== 'undefined' && (window._isAppleDevice || window._isMobileGPU);
    if (!skipShadows) {
        backing.castShadow = true;
        backing.receiveShadow = true;
    }
    group.add(backing);
    
    // Create canvas for the payout info - +25%
    const canvas = document.createElement('canvas');
    canvas.width = 1536;   // +25% from 1228
    canvas.height = 630;   // +25% from 504
    const ctx = canvas.getContext('2d');
    
    // Draw the payout board
    drawPayoutBoard(ctx, canvas.width, canvas.height);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Board surface with canvas texture
    const surfaceMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3,
        metalness: 0
    });
    
    const surfaceGeo = new THREE.PlaneGeometry(boardWidth, boardHeight);
    const surface = new THREE.Mesh(surfaceGeo, surfaceMaterial);
    surface.position.z = 0.01;
    group.add(surface);
    
    // Gold corner decorations - +25%
    const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.3,
        metalness: 0.8
    });
    
    const cornerSize = 0.72; // +25% from 0.58
    const cornerGeo = new THREE.BoxGeometry(cornerSize, cornerSize, 0.18);
    
    const corners = [
        { x: -boardWidth/2 + cornerSize/2, y: boardHeight/2 - cornerSize/2 },
        { x: boardWidth/2 - cornerSize/2, y: boardHeight/2 - cornerSize/2 },
        { x: -boardWidth/2 + cornerSize/2, y: -boardHeight/2 + cornerSize/2 },
        { x: boardWidth/2 - cornerSize/2, y: -boardHeight/2 + cornerSize/2 }
    ];
    
    corners.forEach(pos => {
        const corner = new THREE.Mesh(cornerGeo, goldMaterial);
        corner.position.set(pos.x, pos.y, 0.05);
        group.add(corner);
    });
    
    // Add point light to illuminate the board - skip on Apple/Mobile for performance
    const needsOptimization = typeof window !== 'undefined' && (window._isAppleDevice || window._isMobileGPU);
    if (!needsOptimization) {
        const boardLight = new THREE.PointLight(0xffffcc, 1.2, 18);
        boardLight.position.set(0, 0, 5);
        group.add(boardLight);
    }
    
    // Position and rotate the group
    group.position.set(position.x, position.y, position.z);
    group.rotation.y = rotation;
    
    return {
        group,
        canvas,
        ctx,
        texture,
        update: () => {
            drawPayoutBoard(ctx, canvas.width, canvas.height);
            texture.needsUpdate = true;
        }
    };
}

function drawPayoutBoard(ctx, W, H) {
    // Background gradient - horizontal
    const bgGrad = ctx.createLinearGradient(0, 0, W, 0);
    bgGrad.addColorStop(0, '#1a0a2e');
    bgGrad.addColorStop(0.5, '#2d1b4e');
    bgGrad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    
    // Decorative border - thicker (+25%)
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 8;
    ctx.strokeRect(15, 15, W - 30, H - 30);
    
    // Inner border
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 5;
    ctx.strokeRect(30, 30, W - 60, H - 60);
    
    // Title - bigger font (+25%)
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 62px "Segoe UI", Arial';  // +25% from 50
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 22;
    ctx.fillText('🎰 SLOT PAYOUTS 🎰', W/2, 90);  // +25%
    ctx.shadowBlur = 0;
    
    // Subtitle - bigger (+25%)
    ctx.fillStyle = '#a78bfa';
    ctx.font = '30px "Segoe UI", Arial';  // +25% from 24
    ctx.fillText('Match 3 symbols to win big! • Spin cost: 10g • RTP: 85%', W/2, 135);  // +25%
    
    // Symbol payouts (from best to worst) - arranged horizontally
    const payouts = [
        { emoji: '7️⃣', name: 'Seven', triple: 7770, double: 100, rarity: 'LEGENDARY', color: '#ffd700' },
        { emoji: '💎', name: 'Diamond', triple: 1500, double: 30, rarity: 'EPIC', color: '#a855f7' },
        { emoji: '⭐', name: 'Star', triple: 500, double: 20, rarity: 'RARE', color: '#3b82f6' },
        { emoji: '🔔', name: 'Bell', triple: 200, double: 15, rarity: 'UNCOMMON', color: '#22c55e' },
        { emoji: '🍇', name: 'Grape', triple: 100, double: 10, rarity: 'UNCOMMON', color: '#22c55e' },
        { emoji: '🍊', name: 'Orange', triple: 60, double: 10, rarity: 'COMMON', color: '#9ca3af' },
        { emoji: '🍋', name: 'Lemon', triple: 40, double: 5, rarity: 'COMMON', color: '#9ca3af' },
        { emoji: '🍒', name: 'Cherry', triple: 30, double: 5, rarity: 'COMMON', color: '#9ca3af' }
    ];
    
    // Calculate column positions - 8 symbols spread horizontally (+25%)
    const startX = 90;  // +25% from 72
    const columnWidth = (W - 180) / 8;  // +25%
    const startY = 195;  // +25% from 156
    
    payouts.forEach((p, idx) => {
        const x = startX + columnWidth * idx + columnWidth / 2;
        
        // Column background
        ctx.fillStyle = p.rarity === 'LEGENDARY' 
            ? 'rgba(255, 215, 0, 0.2)' 
            : idx % 2 === 0 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(startX + columnWidth * idx, startY - 30, columnWidth - 6, 390);  // +25%
        
        // Rarity label at top (+25%)
        ctx.textAlign = 'center';
        ctx.fillStyle = p.color;
        ctx.font = 'bold 20px "Segoe UI", Arial';  // +25% from 16
        ctx.fillText(p.rarity, x, startY);
        
        // Emoji - BIG (+25%)
        ctx.font = '78px Arial';  // +25% from 62
        ctx.fillStyle = '#ffffff';
        ctx.fillText(p.emoji, x, startY + 90);  // +25%
        
        // Name (+25%)
        ctx.font = 'bold 28px "Segoe UI", Arial';  // +25% from 22
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText(p.name, x, startY + 142);  // +25%
        
        // Divider
        ctx.strokeStyle = '#4a3a6e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX + columnWidth * idx + 15, startY + 165);  // +25%
        ctx.lineTo(startX + columnWidth * (idx + 1) - 21, startY + 165);
        ctx.stroke();
        
        // Triple payout (×3) (+25%)
        ctx.font = '21px "Segoe UI", Arial';  // +25% from 17
        ctx.fillStyle = '#22c55e';
        ctx.fillText('×3', x, startY + 202);  // +25%
        
        ctx.font = 'bold 36px "Segoe UI", Arial';  // +25% from 29
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = p.rarity === 'LEGENDARY' ? '#ffd700' : 'transparent';
        ctx.shadowBlur = p.rarity === 'LEGENDARY' ? 15 : 0;
        ctx.fillText(`${p.triple}g`, x, startY + 248);  // +25%
        ctx.shadowBlur = 0;
        
        // Double payout (×2) (+25%)
        ctx.font = '21px "Segoe UI", Arial';  // +25% from 17
        ctx.fillStyle = '#a78bfa';
        ctx.fillText('×2', x, startY + 292);  // +25%
        
        ctx.font = '30px "Segoe UI", Arial';  // +25% from 24
        ctx.fillStyle = '#a78bfa';
        ctx.fillText(`${p.double}g`, x, startY + 330);  // +25%
    });
    
    // Jackpot callout at bottom (+25%)
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 30;  // +25%
    ctx.font = 'bold 39px "Segoe UI", Arial';  // +25% from 31
    ctx.textAlign = 'center';
    ctx.fillText('💰 JACKPOT: 7,770 GOLD! 💰  •  The house always wins... eventually 😈', W/2, H - 45);  // +25%
    ctx.shadowBlur = 0;
}

export default createSlotPayoutBoard;
