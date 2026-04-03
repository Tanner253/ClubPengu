/**
 * IglooInfoBoard - Information board explaining igloo mechanics
 * Shows rental costs, owner benefits, and visitor info
 * HORIZONTAL LAYOUT with frame and spotlights
 */

export function createIglooInfoBoard(THREE, position = { x: 0, y: 0, z: 0 }, rotation = 0) {
    const group = new THREE.Group();
    
    // Board dimensions - HORIZONTAL (much larger for readability)
    const boardWidth = 48;   // Much bigger
    const boardHeight = 24;  // Much bigger
    const boardDepth = 0.6;
    const poleHeight = 8;    // Lower to ground
    
    const skipShadows = typeof window !== 'undefined' && (window._isAppleDevice || window._isMobileGPU);
    
    // ==================== SUPPORT POLES ====================
    const poleMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a3a3a,
        roughness: 0.6,
        metalness: 0.4
    });
    
    const poleRadius = 0.5;
    const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius * 1.1, poleHeight, 10);
    
    // Left pole
    const pole1 = new THREE.Mesh(poleGeo, poleMaterial);
    pole1.position.set(-boardWidth / 3, poleHeight / 2, 0);
    if (!skipShadows) pole1.castShadow = true;
    group.add(pole1);
    
    // Right pole
    const pole2 = new THREE.Mesh(poleGeo, poleMaterial);
    pole2.position.set(boardWidth / 3, poleHeight / 2, 0);
    if (!skipShadows) pole2.castShadow = true;
    group.add(pole2);
    
    // Cross braces
    const braceMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.5,
        metalness: 0.3
    });
    
    const braceGeo = new THREE.CylinderGeometry(0.15, 0.15, boardWidth * 0.75, 8);
    
    const brace1 = new THREE.Mesh(braceGeo, braceMaterial);
    brace1.rotation.z = Math.PI / 2;
    brace1.position.set(0, poleHeight * 0.3, 0);
    group.add(brace1);
    
    const brace2 = new THREE.Mesh(braceGeo, braceMaterial);
    brace2.rotation.z = Math.PI / 2;
    brace2.position.set(0, poleHeight * 0.7, 0);
    group.add(brace2);
    
    // Diagonal X braces
    const diagLength = Math.sqrt(Math.pow(boardWidth * 2/3, 2) + Math.pow(poleHeight * 0.4, 2));
    const diagGeo = new THREE.CylinderGeometry(0.1, 0.1, diagLength, 6);
    const diagAngle = Math.atan2(poleHeight * 0.4, boardWidth * 2/3);
    
    const diag1 = new THREE.Mesh(diagGeo, braceMaterial);
    diag1.rotation.z = Math.PI / 2 - diagAngle;
    diag1.position.set(0, poleHeight * 0.5, 0);
    group.add(diag1);
    
    const diag2 = new THREE.Mesh(diagGeo, braceMaterial);
    diag2.rotation.z = Math.PI / 2 + diagAngle;
    diag2.position.set(0, poleHeight * 0.5, 0);
    group.add(diag2);
    
    // ==================== BOARD FRAME ====================
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a4a5a,
        roughness: 0.8,
        metalness: 0.1
    });
    
    // Main board backing
    const backingGeo = new THREE.BoxGeometry(boardWidth + 0.75, boardHeight + 0.75, boardDepth);
    const backing = new THREE.Mesh(backingGeo, frameMaterial);
    backing.position.set(0, poleHeight + boardHeight / 2, boardDepth / 2);
    if (!skipShadows) {
        backing.castShadow = true;
        backing.receiveShadow = true;
    }
    group.add(backing);
    
    // ==================== CANVAS SURFACE ====================
    const canvas = document.createElement('canvas');
    canvas.width = 3200;  // Very high res for crisp text
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    
    drawIglooInfoBoard(ctx, canvas.width, canvas.height);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Board surface - NO GLARE (high roughness, no metalness)
    const surfaceMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.95,  // Matte finish - no glare
        metalness: 0      // No metallic reflection
    });
    
    const surfaceGeo = new THREE.PlaneGeometry(boardWidth, boardHeight);
    const surface = new THREE.Mesh(surfaceGeo, surfaceMaterial);
    surface.position.set(0, poleHeight + boardHeight / 2, boardDepth + 0.05);
    
    // Store banner data for zoom overlay
    surface.userData.isBanner = true;
    surface.userData.bannerData = {
        type: 'canvas',
        title: '🏠 Igloo Rental Guide',
        description: 'Information about igloo rental mechanics, owner perks, and visitor access',
        canvas: canvas,
        renderFn: (ctx, w, h, isMobilePortrait = false) => {
            if (isMobilePortrait) {
                drawIglooInfoBoardMobile(ctx, w, h);
            } else {
                drawIglooInfoBoard(ctx, w, h);
            }
        }
    };
    
    group.add(surface);
    
    // ==================== CORNER DECORATIONS ====================
    const iceMaterial = new THREE.MeshStandardMaterial({
        color: 0x87CEEB,
        roughness: 0.5,
        metalness: 0.3
    });
    
    const cornerSize = 0.8;
    const cornerGeo = new THREE.BoxGeometry(cornerSize, cornerSize, 0.2);
    
    const boardCenterY = poleHeight + boardHeight / 2;
    const corners = [
        { x: -boardWidth/2 + cornerSize/2, y: boardCenterY + boardHeight/2 - cornerSize/2 },
        { x: boardWidth/2 - cornerSize/2, y: boardCenterY + boardHeight/2 - cornerSize/2 },
        { x: -boardWidth/2 + cornerSize/2, y: boardCenterY - boardHeight/2 + cornerSize/2 },
        { x: boardWidth/2 - cornerSize/2, y: boardCenterY - boardHeight/2 + cornerSize/2 }
    ];
    
    corners.forEach(pos => {
        const corner = new THREE.Mesh(cornerGeo, iceMaterial);
        corner.position.set(pos.x, pos.y, boardDepth + 0.1);
        group.add(corner);
    });
    
    // ==================== SPOTLIGHTS ====================
    const needsOptimization = typeof window !== 'undefined' && (window._isAppleDevice || window._isMobileGPU);
    
    if (!needsOptimization) {
        // Light housings on top of board
        const lightHousingMat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const housingGeo = new THREE.BoxGeometry(1.5, 0.5, 0.8);
        const lightPositions = [-boardWidth/3, 0, boardWidth/3];
        
        lightPositions.forEach(lx => {
            // Housing
            const housing = new THREE.Mesh(housingGeo, lightHousingMat);
            housing.position.set(lx, poleHeight + boardHeight + 1, boardDepth + 1);
            group.add(housing);
            
            // Spotlight shining DOWN on board
            const spotlight = new THREE.SpotLight(0xFFFFEE, 2, 20, Math.PI / 4, 0.5);
            spotlight.position.set(lx, poleHeight + boardHeight + 1.5, boardDepth + 1.5);
            spotlight.target.position.set(lx, poleHeight + boardHeight / 2, boardDepth);
            group.add(spotlight);
            group.add(spotlight.target);
        });
        
        // Ambient glow behind sign
        const glowLight = new THREE.PointLight(0x87CEEB, 0.8, 25);
        glowLight.position.set(0, poleHeight + boardHeight / 2, -2);
        group.add(glowLight);
    }
    
    // Position and rotate
    group.position.set(position.x, position.y, position.z);
    group.rotation.y = rotation;
    
    return {
        group,
        canvas,
        ctx,
        texture,
        update: () => {
            drawIglooInfoBoard(ctx, canvas.width, canvas.height);
            texture.needsUpdate = true;
        }
    };
}

function drawIglooInfoBoard(ctx, W, H) {
    // Background gradient - icy blue
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(0.5, '#1a3a4e');
    bgGrad.addColorStop(1, '#0a1628');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    
    // Decorative border
    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = 20;
    ctx.strokeRect(30, 30, W - 60, H - 60);
    
    // Inner border
    ctx.strokeStyle = '#4a9aba';
    ctx.lineWidth = 10;
    ctx.strokeRect(60, 60, W - 120, H - 120);
    
    // Title - MASSIVE
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold 150px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#87CEEB';
    ctx.shadowBlur = 50;
    ctx.fillText('🏠 IGLOO RENTAL GUIDE 🏠', W/2, 175);
    ctx.shadowBlur = 0;
    
    // Three columns
    const colWidth = (W - 200) / 3;
    const colStart = 100;
    const topY = 280;
    
    // ==================== COLUMN 1: RENTAL INFO ====================
    const col1X = colStart + colWidth / 2;
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 90px "Segoe UI", Arial';
    ctx.fillText('💰 HOW TO RENT', col1X, topY);
    
    // Divider
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(colStart + 50, topY + 35);
    ctx.lineTo(colStart + colWidth - 50, topY + 35);
    ctx.stroke();
    
    ctx.textAlign = 'left';
    
    const rentInfo = [
        { label: 'Daily Rent:', value: '10,000 $WADDLE', color: '#FFD700' },
        { label: 'Min Balance:', value: '70,000 $WADDLE', color: '#FF6B6B' },
        { label: 'Grace Period:', value: '12 hours', color: '#87CEEB' },
        { label: 'Total Igloos:', value: '10 available', color: '#98FB98' },
    ];
    
    let y = topY + 115;
    rentInfo.forEach(info => {
        ctx.fillStyle = '#A0C4D8';
        ctx.font = '58px "Segoe UI", Arial';
        ctx.fillText(info.label, colStart + 60, y);
        ctx.fillStyle = info.color;
        ctx.font = 'bold 68px "Segoe UI", Arial';
        ctx.fillText(info.value, colStart + 60, y + 75);
        y += 165;
    });
    
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold 54px "Segoe UI", Arial';
    ctx.fillText('Steps:', colStart + 60, y + 25);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '46px "Segoe UI", Arial';
    const steps = [
        '1. Walk to igloo',
        '2. Press E',
        '3. Click Rent',
        '4. Pay $WADDLE'
    ];
    y += 85;
    steps.forEach(step => {
        ctx.fillText(step, colStart + 60, y);
        y += 58;
    });
    
    // ==================== COLUMN 2: OWNER BENEFITS ====================
    const col2X = colStart + colWidth + colWidth / 2;
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#A855F7';
    ctx.font = 'bold 90px "Segoe UI", Arial';
    ctx.fillText('👑 OWNER PERKS', col2X, topY);
    
    ctx.strokeStyle = '#A855F7';
    ctx.beginPath();
    ctx.moveTo(colStart + colWidth + 50, topY + 35);
    ctx.lineTo(colStart + colWidth * 2 - 50, topY + 35);
    ctx.stroke();
    
    const benefits = [
        { emoji: '📺', title: '24/7 Ads', desc: 'Banner on map' },
        { emoji: '💵', title: 'Entry Fees', desc: 'Earn tokens' },
        { emoji: '🔐', title: 'Token Gate', desc: 'Holder access' },
        { emoji: '🎨', title: 'Customize', desc: 'Your style' },
        { emoji: '📊', title: 'Analytics', desc: 'Track stats' },
    ];
    
    y = topY + 110;
    ctx.textAlign = 'left';
    benefits.forEach(b => {
        ctx.font = '80px Arial';
        ctx.fillText(b.emoji, colStart + colWidth + 60, y + 15);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 56px "Segoe UI", Arial';
        ctx.fillText(b.title, colStart + colWidth + 160, y - 5);
        
        ctx.fillStyle = '#A0C4D8';
        ctx.font = '46px "Segoe UI", Arial';
        ctx.fillText(b.desc, colStart + colWidth + 160, y + 50);
        
        y += 125;
    });
    
    ctx.fillStyle = '#A855F7';
    ctx.font = 'bold 46px "Segoe UI", Arial';
    ctx.fillText('🔒Private 🌐Public 🪙Token 💰Fee', colStart + colWidth + 60, y + 30);
    
    // ==================== COLUMN 3: VISITOR INFO ====================
    const col3X = colStart + colWidth * 2 + colWidth / 2;
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#22C55E';
    ctx.font = 'bold 90px "Segoe UI", Arial';
    ctx.fillText('🚶 VISITORS', col3X, topY);
    
    ctx.strokeStyle = '#22C55E';
    ctx.beginPath();
    ctx.moveTo(colStart + colWidth * 2 + 50, topY + 35);
    ctx.lineTo(colStart + colWidth * 3 - 50, topY + 35);
    ctx.stroke();
    
    ctx.textAlign = 'left';
    y = topY + 115;
    
    const entryTypes = [
        { type: '🌐 Public', desc: 'Walk in free!', color: '#22C55E' },
        { type: '💰 Fee', desc: 'Pay to enter', color: '#FFD700' },
        { type: '🪙 Token', desc: 'Hold tokens', color: '#A855F7' },
        { type: '🔒 Private', desc: 'Owner only', color: '#FF6B6B' },
    ];
    
    entryTypes.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.font = 'bold 62px "Segoe UI", Arial';
        ctx.fillText(e.type, colStart + colWidth * 2 + 60, y);
        
        ctx.fillStyle = '#A0C4D8';
        ctx.font = '50px "Segoe UI", Arial';
        ctx.fillText(e.desc, colStart + colWidth * 2 + 60, y + 60);
        
        y += 140;
    });
    
    ctx.fillStyle = '#22C55E';
    ctx.font = 'bold 54px "Segoe UI", Arial';
    ctx.fillText('How to Visit:', colStart + colWidth * 2 + 60, y + 25);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '46px "Segoe UI", Arial';
    const visitSteps = [
        '1. Walk near igloo',
        '2. Press E to enter',
        '3. Meet requirements'
    ];
    y += 85;
    visitSteps.forEach(step => {
        ctx.fillText(step, colStart + colWidth * 2 + 60, y);
        y += 58;
    });
    
    // Bottom banner - MASSIVE
    ctx.fillStyle = '#87CEEB';
    ctx.shadowColor = '#87CEEB';
    ctx.shadowBlur = 50;
    ctx.font = 'bold 64px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 Rent an igloo to advertise & earn from visitors! 🎉', W/2, H - 80);
    ctx.shadowBlur = 0;
}

// Mobile portrait version - vertical layout with larger text
function drawIglooInfoBoardMobile(ctx, W, H) {
    // Background gradient - icy blue
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(0.5, '#1a3a4e');
    bgGrad.addColorStop(1, '#0a1628');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    
    // Decorative border
    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, W - 20, H - 20);
    
    // Inner border
    ctx.strokeStyle = '#4a9aba';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    
    // Title - larger for mobile
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold 48px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#87CEEB';
    ctx.shadowBlur = 20;
    ctx.fillText('🏠 IGLOO RENTAL GUIDE 🏠', W/2, 60);
    ctx.shadowBlur = 0;
    
    let currentY = 100;
    const sectionSpacing = 50;
    const padding = 20;
    
    // ==================== SECTION 1: HOW TO RENT ====================
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 32px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💰 HOW TO RENT', W/2, currentY);
    
    // Divider
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, currentY + 15);
    ctx.lineTo(W - padding, currentY + 15);
    ctx.stroke();
    
    currentY += 45;
    ctx.textAlign = 'left';
    
    const rentInfo = [
        { label: 'Daily Rent:', value: '10,000 $WADDLE', color: '#FFD700' },
        { label: 'Min Balance:', value: '70,000 $WADDLE', color: '#FF6B6B' },
        { label: 'Grace Period:', value: '12 hours', color: '#87CEEB' },
        { label: 'Total Igloos:', value: '10 available', color: '#98FB98' },
    ];
    
    rentInfo.forEach(info => {
        ctx.fillStyle = '#A0C4D8';
        ctx.font = '20px "Segoe UI", Arial';
        ctx.fillText(info.label, padding, currentY);
        ctx.fillStyle = info.color;
        ctx.font = 'bold 24px "Segoe UI", Arial';
        ctx.fillText(info.value, padding, currentY + 30);
        currentY += 55;
    });
    
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold 22px "Segoe UI", Arial';
    ctx.fillText('Steps:', padding, currentY);
    currentY += 30;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px "Segoe UI", Arial';
    const steps = [
        '1. Walk to igloo',
        '2. Press E',
        '3. Click Rent',
        '4. Pay $WADDLE'
    ];
    steps.forEach(step => {
        ctx.fillText(step, padding, currentY);
        currentY += 28;
    });
    
    currentY += sectionSpacing;
    
    // ==================== SECTION 2: OWNER PERKS ====================
    ctx.textAlign = 'center';
    ctx.fillStyle = '#A855F7';
    ctx.font = 'bold 32px "Segoe UI", Arial';
    ctx.fillText('👑 OWNER PERKS', W/2, currentY);
    
    ctx.strokeStyle = '#A855F7';
    ctx.beginPath();
    ctx.moveTo(padding, currentY + 15);
    ctx.lineTo(W - padding, currentY + 15);
    ctx.stroke();
    
    currentY += 45;
    ctx.textAlign = 'left';
    
    const benefits = [
        { emoji: '📺', title: '24/7 Ads', desc: 'Banner on map' },
        { emoji: '💵', title: 'Entry Fees', desc: 'Earn tokens' },
        { emoji: '🔐', title: 'Token Gate', desc: 'Holder access' },
        { emoji: '🎨', title: 'Customize', desc: 'Your style' },
        { emoji: '📊', title: 'Analytics', desc: 'Track stats' },
    ];
    
    benefits.forEach(b => {
        ctx.font = '28px Arial';
        ctx.fillText(b.emoji, padding, currentY + 10);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px "Segoe UI", Arial';
        ctx.fillText(b.title, padding + 40, currentY);
        
        ctx.fillStyle = '#A0C4D8';
        ctx.font = '16px "Segoe UI", Arial';
        ctx.fillText(b.desc, padding + 40, currentY + 22);
        
        currentY += 45;
    });
    
    ctx.fillStyle = '#A855F7';
    ctx.font = 'bold 18px "Segoe UI", Arial';
    ctx.fillText('🔒Private 🌐Public 🪙Token 💰Fee', padding, currentY + 10);
    currentY += sectionSpacing;
    
    // ==================== SECTION 3: VISITORS ====================
    ctx.textAlign = 'center';
    ctx.fillStyle = '#22C55E';
    ctx.font = 'bold 32px "Segoe UI", Arial';
    ctx.fillText('🚶 VISITORS', W/2, currentY);
    
    ctx.strokeStyle = '#22C55E';
    ctx.beginPath();
    ctx.moveTo(padding, currentY + 15);
    ctx.lineTo(W - padding, currentY + 15);
    ctx.stroke();
    
    currentY += 45;
    ctx.textAlign = 'left';
    
    const entryTypes = [
        { type: '🌐 Public', desc: 'Walk in free!', color: '#22C55E' },
        { type: '💰 Fee', desc: 'Pay to enter', color: '#FFD700' },
        { type: '🪙 Token', desc: 'Hold tokens', color: '#A855F7' },
        { type: '🔒 Private', desc: 'Owner only', color: '#FF6B6B' },
    ];
    
    entryTypes.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.font = 'bold 22px "Segoe UI", Arial';
        ctx.fillText(e.type, padding, currentY);
        
        ctx.fillStyle = '#A0C4D8';
        ctx.font = '18px "Segoe UI", Arial';
        ctx.fillText(e.desc, padding, currentY + 28);
        
        currentY += 50;
    });
    
    ctx.fillStyle = '#22C55E';
    ctx.font = 'bold 22px "Segoe UI", Arial';
    ctx.fillText('How to Visit:', padding, currentY);
    currentY += 30;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px "Segoe UI", Arial';
    const visitSteps = [
        '1. Walk near igloo',
        '2. Press E to enter',
        '3. Meet requirements'
    ];
    visitSteps.forEach(step => {
        ctx.fillText(step, padding, currentY);
        currentY += 28;
    });
    
    // Bottom banner
    ctx.fillStyle = '#87CEEB';
    ctx.shadowColor = '#87CEEB';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 20px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 Rent an igloo to advertise & earn! 🎉', W/2, H - 30);
    ctx.shadowBlur = 0;
}

export default createIglooInfoBoard;

