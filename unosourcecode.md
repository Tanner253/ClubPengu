<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lumina Uno 3D - Remastered</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js"></script>
    <style>
        body { margin: 0; overflow: hidden; background-color: #050505; font-family: 'Inter', system-ui, sans-serif; user-select: none; }
        #game-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        
        /* UI Overlay */
        #ui-layer {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            z-index: 10;
        }

        .hud-header {
            padding: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            box-sizing: border-box;
        }

        .brand-title {
            color: rgba(255,255,255,0.1);
            font-weight: 900;
            font-size: 3rem;
            text-transform: uppercase;
            letter-spacing: -2px;
            margin: 0;
            pointer-events: none;
        }

        /* Moved Status Pill to Top Right to clear hand area */
        .status-pill {
            background: rgba(20, 20, 20, 0.8);
            backdrop-filter: blur(10px);
            padding: 10px 30px;
            border-radius: 50px;
            border: 1px solid rgba(255,255,255,0.15);
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            pointer-events: auto;
        }

        .status-pill h2 { margin: 0; font-size: 1.2rem; font-weight: 800; letter-spacing: -0.5px; }
        .status-pill span { font-size: 0.8rem; opacity: 0.8; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px; font-weight: 500; }

        /* Color Picker - Centered */
        #color-picker {
            position: absolute;
            top: 40%; left: 50%; /* Moved up slightly to not block hand */
            transform: translate(-50%, -50%) scale(0.9);
            background: rgba(15, 15, 20, 0.98);
            padding: 40px;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.9);
            display: none;
            pointer-events: auto;
            border: 1px solid rgba(255,255,255,0.1);
            text-align: center;
            z-index: 100;
            opacity: 0;
            transition: all 0.3s;
        }
        #color-picker.visible { opacity: 1; transform: translate(-50%, -50%) scale(1); }

        .cp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
        .color-btn {
            width: 80px; height: 80px;
            border: none; border-radius: 20px;
            cursor: pointer;
            transition: transform 0.2s;
            position: relative;
            overflow: hidden;
        }
        .color-btn::after {
            content: ''; position: absolute; top:0; left:0; right:0; bottom:0;
            background: linear-gradient(135deg, rgba(255,255,255,0.4), transparent);
        }
        .color-btn:hover { transform: scale(1.05); }
        .bg-red { background: #ff4757; box-shadow: 0 10px 20px rgba(255, 71, 87, 0.3); }
        .bg-blue { background: #3742fa; box-shadow: 0 10px 20px rgba(55, 66, 250, 0.3); }
        .bg-green { background: #2ed573; box-shadow: 0 10px 20px rgba(46, 213, 115, 0.3); }
        .bg-yellow { background: #ffa502; box-shadow: 0 10px 20px rgba(255, 165, 2, 0.3); }

        /* UNO Button - Right side, mid-bottom */
        #uno-btn {
            position: absolute;
            right: 40px; bottom: 200px; /* Moved up to avoid hand overlap */
            width: 100px; height: 100px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ff4757, #ff6b81);
            color: white;
            font-weight: 900;
            font-size: 24px;
            border: 6px solid rgba(255,255,255,0.2);
            box-shadow: 0 0 40px rgba(255, 71, 87, 0.6);
            cursor: pointer;
            display: flex;
            align-items: center; justify-content: center;
            transform: scale(0);
            pointer-events: auto;
            z-index: 50;
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            animation: pulse 2s infinite;
        }
        #uno-btn.visible { transform: scale(1); }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); } 70% { box-shadow: 0 0 0 20px rgba(255, 71, 87, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); } }

        /* Loading & Game Over */
        #loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: rgba(255,255,255,0.5); font-weight: 500; letter-spacing: 2px; }
        #game-over {
            position: absolute; inset: 0;
            background: rgba(5, 5, 10, 0.95);
            display: none;
            flex-direction: column;
            align-items: center; justify-content: center;
            color: white;
            pointer-events: auto;
            z-index: 200;
        }
        .restart-btn {
            margin-top: 30px;
            padding: 15px 50px;
            background: white; border: none; border-radius: 50px;
            font-size: 1.2rem; font-weight: 800; text-transform: uppercase;
            cursor: pointer;
            transition: 0.2s;
        }
        .restart-btn:hover { transform: scale(1.05); background: #f1f2f6; }

    </style>
</head>
<body>

    <div id="game-container"></div>
    <div id="loading">DEALING CARDS...</div>

    <div id="ui-layer">
        <div class="hud-header">
            <h1 class="brand-title">LUMINA</h1>
            <div class="status-pill" id="status-display">
                <h2 id="main-status">YOUR TURN</h2>
                <span id="sub-status">Current: Red</span>
            </div>
        </div>
        <!-- Footer removed/empty to keep hand area clear -->
        <div class="hud-footer"></div>
    </div>

    <div id="color-picker">
        <h2 style="color:white; margin:0 0 10px 0; font-weight: 300;">WILD CARD</h2>
        <p style="color:rgba(255,255,255,0.5); margin:0 0 20px 0; font-size:0.9rem;">Select a color to continue</p>
        <div class="cp-grid">
            <button class="color-btn bg-red" onclick="game.resolveWild('Red')"></button>
            <button class="color-btn bg-blue" onclick="game.resolveWild('Blue')"></button>
            <button class="color-btn bg-green" onclick="game.resolveWild('Green')"></button>
            <button class="color-btn bg-yellow" onclick="game.resolveWild('Yellow')"></button>
        </div>
    </div>

    <button id="uno-btn">UNO!</button>

    <div id="game-over">
        <h1 id="winner-text" style="font-size: 5rem; line-height: 1; margin: 0;">VICTORY</h1>
        <p style="color: rgba(255,255,255,0.5);">Thank you for playing</p>
        <button class="restart-btn" onclick="location.reload()">Play Again</button>
    </div>

    <script>
        /** * LUMINA UNO - REMASTERED ENGINE v3 (Visibility Fix) */

        const CONFIG = {
            colors: ['Red', 'Blue', 'Green', 'Yellow'],
            values: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', '+2'],
            wilds: ['Wild', 'Wild +4'],
            cardSize: { w: 4, h: 6, d: 0.05 },
            animSpeed: 400
        };

        // --- ASSET GENERATION ---
        class AssetFactory {
            constructor() {
                this.textures = {};
            }

            createCardTexture(color, value) {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 768;
                const ctx = canvas.getContext('2d');
                
                const palettes = {
                    'Red': '#ff3333', 'Blue': '#1155ff', 'Green': '#00aa00', 'Yellow': '#ffcc00', 'Black': '#111111'
                };
                const bg = palettes[color] || '#111111';

                ctx.fillStyle = '#ffffff';
                this.roundRect(ctx, 0, 0, 512, 768, 40);
                ctx.fill();

                ctx.fillStyle = bg;
                if(color === 'Black') {
                    const g = ctx.createLinearGradient(0,0,512,768);
                    g.addColorStop(0, '#222');
                    g.addColorStop(1, '#000');
                    ctx.fillStyle = g;
                }
                this.roundRect(ctx, 25, 25, 462, 718, 30);
                ctx.fill();

                ctx.save();
                ctx.translate(256, 384);
                ctx.rotate(Math.PI / 4); 
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.ellipse(0, 0, 180, 280, 0, 0, 2*Math.PI);
                ctx.fill();
                ctx.restore();

                let symbol = value;
                let fontSize = 240;
                let font = '900';

                if(value === 'Skip') { symbol = '⊘'; fontSize = 260; }
                else if(value === 'Reverse') { symbol = '⇄'; fontSize = 260; }
                else if(value === '+2') { symbol = '+2'; fontSize = 220; }
                else if(value === 'Wild') { symbol = '★'; fontSize = 260; }
                else if(value === 'Wild +4') { symbol = '+4'; fontSize = 220; }

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 8;
                ctx.shadowOffsetY = 8;

                ctx.fillStyle = (color === 'Black') ? 'url(#rainbow)' : bg; 
                if (color === 'Black') {
                    const grad = ctx.createLinearGradient(150, 300, 350, 500);
                    grad.addColorStop(0, '#ff3333');
                    grad.addColorStop(0.3, '#1155ff');
                    grad.addColorStop(0.6, '#00aa00');
                    grad.addColorStop(1, '#ffcc00');
                    ctx.fillStyle = grad;
                }
                
                ctx.font = `${font} ${fontSize}px sans-serif`;
                ctx.fillText(symbol, 256, 394);

                ctx.shadowColor = 'transparent';
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 50px sans-serif';
                
                ctx.fillText(symbol, 65, 75);
                ctx.save();
                ctx.translate(512-65, 768-75);
                ctx.rotate(Math.PI);
                ctx.fillText(symbol, 0, 0);
                ctx.restore();

                const texture = new THREE.CanvasTexture(canvas);
                texture.anisotropy = 16;
                texture.encoding = THREE.sRGBEncoding;
                return texture;
            }

            createBackTexture() {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 768;
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = '#111';
                this.roundRect(ctx, 0, 0, 512, 768, 40);
                ctx.fill();
                
                ctx.font = '900 160px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 20;

                ctx.fillStyle = '#ff3333';
                ctx.fillText("U", 180, 384);
                ctx.fillStyle = '#ffcc00';
                ctx.fillText("N", 280, 384);
                ctx.fillStyle = '#1155ff';
                ctx.fillText("O", 380, 384);

                const texture = new THREE.CanvasTexture(canvas);
                texture.anisotropy = 16;
                texture.encoding = THREE.sRGBEncoding;
                return texture;
            }

            roundRect(ctx, x, y, w, h, r) {
                if (w < 2 * r) r = w / 2;
                if (h < 2 * r) r = h / 2;
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + w, y, x + w, y + h, r);
                ctx.arcTo(x + w, y + h, x, y + h, r);
                ctx.arcTo(x, y + h, x, y, r);
                ctx.arcTo(x, y, x + w, y, r);
                ctx.closePath();
            }

            generate() {
                this.back = this.createBackTexture();
                this.cache = {};
            }

            get(color, value) {
                const key = `${color}_${value}`;
                if(!this.cache[key]) {
                    this.cache[key] = this.createCardTexture(color, value);
                }
                return this.cache[key];
            }
        }

        // --- RENDER ENGINE ---
        class Engine {
            constructor() {
                this.container = document.getElementById('game-container');
                this.scene = new THREE.Scene();
                this.scene.background = new THREE.Color(0x111111);
                this.scene.fog = new THREE.FogExp2(0x111111, 0.002);

                // --- CAMERA FIXED ---
                this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
                // Lowered and pulled back slightly for a better view of the table foreground
                this.camera.position.set(0, 25, 45); 
                this.camera.lookAt(0, -2, 0);
                
                this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                this.renderer.outputEncoding = THREE.sRGBEncoding;
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                this.renderer.toneMappingExposure = 1.2;
                this.container.appendChild(this.renderer.domElement);

                this.setupLights();
                this.createEnvironment();

                this.raycaster = new THREE.Raycaster();
                this.mouse = new THREE.Vector2();
                this.interactables = [];
                this.hovered = null;

                window.addEventListener('resize', () => this.resize());
                window.addEventListener('mousemove', (e) => this.onMouseMove(e));
                window.addEventListener('click', (e) => this.onClick(e));
                
                this.clock = new THREE.Clock();
                this.animate();
            }

            setupLights() {
                const ambient = new THREE.AmbientLight(0xffffff, 0.6);
                this.scene.add(ambient);

                const spot = new THREE.SpotLight(0xffffff, 1.5);
                spot.position.set(0, 50, 10);
                spot.angle = Math.PI / 4;
                spot.penumbra = 0.5;
                spot.castShadow = true;
                spot.shadow.mapSize.width = 2048;
                spot.shadow.mapSize.height = 2048;
                this.scene.add(spot);

                const handLight = new THREE.PointLight(0xffeedd, 0.8, 30);
                handLight.position.set(0, 10, 20);
                this.scene.add(handLight);
            }

            createEnvironment() {
                const geo = new THREE.PlaneGeometry(150, 150);
                const mat = new THREE.MeshStandardMaterial({ 
                    color: 0x0a2a0a, 
                    roughness: 0.7,
                    metalness: 0.2
                });
                const table = new THREE.Mesh(geo, mat);
                table.rotation.x = -Math.PI / 2;
                table.receiveShadow = true;
                this.scene.add(table);
            }

            createCardMesh(texture) {
                const geometry = new THREE.BoxGeometry(CONFIG.cardSize.w, CONFIG.cardSize.h, CONFIG.cardSize.d);
                
                const faceMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.2, metalness: 0.1 });
                const backMat = new THREE.MeshStandardMaterial({ map: assets.back, roughness: 0.2, metalness: 0.1 });
                const sideMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }); 

                const materials = [sideMat, sideMat, sideMat, sideMat, faceMat, backMat];

                const mesh = new THREE.Mesh(geometry, materials);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                return mesh;
            }

            resize() {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }

            onMouseMove(e) {
                this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

                // Subtle Parallax
                const targetX = this.mouse.x * 2; 
                const targetY = 25 + this.mouse.y * 1; // Adjusted base to 25
                this.camTarget = { x: targetX, y: targetY };
            }

            onClick(e) {
                if(game.locked) return;
                
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObjects(this.interactables);
                if(intersects.length > 0) {
                    game.handleInput(intersects[0].object);
                }
            }

            animate() {
                requestAnimationFrame(() => this.animate());
                TWEEN.update();

                if(this.camTarget) {
                    this.camera.position.x += (this.camTarget.x - this.camera.position.x) * 0.05;
                    this.camera.position.y += (this.camTarget.y - this.camera.position.y) * 0.05;
                }
                
                this.camera.lookAt(0, -2, 0); // Focus slightly below center

                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObjects(this.interactables);
                
                if(intersects.length > 0) {
                    const obj = intersects[0].object;
                    if(this.hovered !== obj) {
                        this.clearHover();
                        this.hovered = obj;
                        document.body.style.cursor = 'pointer';
                        
                        if(obj.userData.type === 'playerCard') {
                            new TWEEN.Tween(obj.position)
                                .to({ y: obj.userData.origin.y + 1.5, z: obj.userData.origin.z - 1 }, 150)
                                .easing(TWEEN.Easing.Quadratic.Out)
                                .start();
                        }
                        if(obj.userData.type === 'deck') {
                            new TWEEN.Tween(game.deckGroup.scale)
                                .to({ x: 1.1, y: 1.1, z: 1.1 }, 200)
                                .start();
                        }
                    }
                } else {
                    this.clearHover();
                }

                this.renderer.render(this.scene, this.camera);
            }

            clearHover() {
                if(this.hovered) {
                    const obj = this.hovered;
                    if(obj.userData.type === 'playerCard') {
                        new TWEEN.Tween(obj.position)
                            .to({ y: obj.userData.origin.y, z: obj.userData.origin.z }, 150)
                            .easing(TWEEN.Easing.Quadratic.Out)
                            .start();
                    }
                    if(obj.userData.type === 'deck') {
                         new TWEEN.Tween(game.deckGroup.scale)
                            .to({ x: 1, y: 1, z: 1 }, 200)
                            .start();
                    }
                }
                this.hovered = null;
                document.body.style.cursor = 'default';
            }
        }

        // --- GAME LOGIC ---
        class Game {
            constructor() {
                this.deck = [];
                this.discard = [];
                this.players = [[], []]; // 0: Human, 1: Bot
                this.turn = 0;
                this.direction = 1;
                this.activeColor = null;
                this.activeValue = null;
                this.locked = true;

                this.deckGroup = new THREE.Group();
                this.discardGroup = new THREE.Group();
                engine.scene.add(this.deckGroup);
                engine.scene.add(this.discardGroup);

                this.initDeck();
                this.renderDeckStack();
            }

            initDeck() {
                CONFIG.colors.forEach(c => {
                    CONFIG.values.forEach(v => {
                        let count = (v === '0') ? 1 : 2;
                        for(let i=0; i<count; i++) this.deck.push({c, v, uid: Math.random()});
                    });
                });
                for(let i=0; i<4; i++) {
                    this.deck.push({c:'Black', v:'Wild', uid:Math.random()});
                    this.deck.push({c:'Black', v:'Wild +4', uid:Math.random()});
                }
                this.shuffle(this.deck);
            }

            shuffle(arr) {
                for(let i=arr.length-1; i>0; i--) {
                    const j = Math.floor(Math.random()*(i+1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
            }

            renderDeckStack() {
                this.deckGroup.clear();
                engine.interactables = engine.interactables.filter(o => o.userData.type !== 'deck');

                for(let i=0; i<6; i++) {
                    const mesh = engine.createCardMesh(assets.back);
                    mesh.rotation.x = -Math.PI/2;
                    mesh.rotation.z = (Math.random() - 0.5) * 0.1;
                    mesh.position.y = i * 0.06;
                    mesh.castShadow = true;
                    
                    if(i === 5) {
                        mesh.userData = { type: 'deck' };
                        engine.interactables.push(mesh);
                    }
                    this.deckGroup.add(mesh);
                }
                this.deckGroup.position.set(-6, 0.1, -2);
            }

            async start() {
                for(let i=0; i<7; i++) {
                    await this.drawCard(0, true);
                    await this.drawCard(1, true);
                }
                
                const card = this.deck.pop();
                this.discard.push(card);
                this.activeColor = (card.c === 'Black') ? 'Red' : card.c;
                this.activeValue = card.v;
                
                await this.animateDiscard(card);
                this.updateUI();
                
                document.getElementById('loading').style.display = 'none';
                this.locked = false;
            }

            async drawCard(pIdx, fast=false) {
                if(this.deck.length === 0) this.reshuffle();
                
                const card = this.deck.pop();
                this.players[pIdx].push(card);

                const mesh = engine.createCardMesh(assets.back);
                mesh.position.copy(this.deckGroup.position);
                mesh.position.y += 1;
                mesh.rotation.x = -Math.PI/2;
                engine.scene.add(mesh);

                let tx = 0, ty = 0, tz = 0;
                
                if(pIdx === 0) {
                     // Human Hand Target - FIXED VISIBILITY
                     tx = 0; ty = 5; tz = 20; // Reduced from 25 to 20 to bring into view
                } else {
                     // Bot Hand Target
                     tx = 0; ty = 5; tz = -25;
                }

                await new Promise(r => {
                    new TWEEN.Tween(mesh.position).to({x:tx, y:ty, z:tz}, fast ? 100 : 400).easing(TWEEN.Easing.Cubic.Out).start();
                    new TWEEN.Tween(mesh.rotation).to({x: pIdx===0 ? -0.8 : 0.8, y:0, z:0}, fast ? 100 : 400)
                    .onComplete(() => {
                        engine.scene.remove(mesh);
                        this.renderHand(pIdx);
                        r();
                    }).start();
                });
            }

            renderHand(pIdx) {
                const oldMeshes = engine.interactables.filter(o => o.userData.pIdx === pIdx && o.userData.type === 'playerCard');
                oldMeshes.forEach(m => {
                    engine.scene.remove(m);
                    const idx = engine.interactables.indexOf(m);
                    if(idx > -1) engine.interactables.splice(idx, 1);
                });

                if(pIdx === 1) {
                    const hand = this.players[1];
                    if(!this.botGroup) { this.botGroup = new THREE.Group(); engine.scene.add(this.botGroup); }
                    this.botGroup.clear();

                    const w = Math.min(hand.length * 2, 24);
                    const start = -w/2;
                    const step = w / Math.max(1, hand.length-1);

                    hand.forEach((c, i) => {
                        const m = engine.createCardMesh(assets.back);
                        const x = start + i*step;
                        m.position.set(x, 4, -22 - Math.abs(x)*0.2);
                        m.rotation.set(0.5, -x*0.05, 0); 
                        this.botGroup.add(m);
                    });
                    return;
                }

                // --- PLAYER HAND VISUALS (FIXED Z-DEPTH) ---
                const hand = this.players[0];
                const w = Math.min(hand.length * 3.5, 30);
                const start = -w/2;
                const step = w / Math.max(1, hand.length-1);

                hand.forEach((c, i) => {
                    const tex = assets.get(c.c, c.v);
                    const m = engine.createCardMesh(tex);
                    const x = start + i*step;
                    
                    const y = 2 - Math.abs(x)*0.1; 
                    // Move Z to 18 (was 22) so it's "on the table" in front of camera, not below screen
                    const z = 18 + Math.abs(x)*0.3; 
                    
                    m.position.set(x, y, z);
                    m.rotation.set(-0.9, -x*0.05, 0); 
                    
                    m.userData = { 
                        type: 'playerCard', 
                        pIdx: 0, 
                        card: c,
                        origin: {x,y,z}
                    };
                    
                    engine.scene.add(m);
                    engine.interactables.push(m);
                });
            }

            async animateDiscard(card) {
                const mesh = engine.createCardMesh(assets.get(card.c, card.v));
                mesh.position.set(0, 15, 15);
                mesh.rotation.set(Math.random(), Math.random(), Math.random());
                engine.scene.add(mesh);

                const pileH = 0.1 + this.discard.length * 0.01;
                
                await new Promise(r => {
                    new TWEEN.Tween(mesh.position)
                        .to({x: 2 + (Math.random()*0.5), y: pileH, z: (Math.random()*0.5)}, 400)
                        .easing(TWEEN.Easing.Bounce.Out)
                        .start();
                    new TWEEN.Tween(mesh.rotation)
                        .to({x: -Math.PI/2, y: 0, z: Math.random()*2}, 400)
                        .onComplete(r)
                        .start();
                });
                
                this.discardGroup.add(mesh);
            }

            reshuffle() {
                if(this.discard.length < 2) return;
                const top = this.discard.pop();
                const rest = this.discard;
                this.discard = [top];
                this.deck = [...this.deck, ...rest];
                this.shuffle(this.deck);
                
                this.discardGroup.clear();
                const mesh = engine.createCardMesh(assets.get(top.c, top.v));
                mesh.position.set(2, 0.1, 0);
                mesh.rotation.set(-Math.PI/2, 0, 0);
                this.discardGroup.add(mesh);
            }

            handleInput(obj) {
                if(this.turn !== 0) return;

                if(obj.userData.type === 'deck') {
                    this.humanDraw();
                } else if(obj.userData.type === 'playerCard') {
                    this.humanPlay(obj.userData.card);
                }
            }

            async humanDraw() {
                this.locked = true;
                this.updateUI("Drawing...", "secondary");
                await this.drawCard(0);
                this.locked = false;
                this.nextTurn();
            }

            humanPlay(card) {
                if(this.isValid(card)) {
                    this.locked = true;
                    this.playCard(0, card);
                } else {
                    const mesh = engine.interactables.find(m => m.userData.card === card);
                    if(mesh) {
                        new TWEEN.Tween(mesh.position).to({x: mesh.position.x + 0.5}, 50).yoyo(true).repeat(3).start();
                    }
                }
            }

            isValid(c) {
                if(c.c === 'Black') return true;
                if(c.c === this.activeColor) return true;
                if(c.v === this.activeValue) return true;
                return false;
            }

            async playCard(pIdx, card) {
                const hand = this.players[pIdx];
                const idx = hand.indexOf(card);
                if(idx>-1) hand.splice(idx, 1);
                
                this.renderHand(pIdx);

                this.discard.push(card);
                this.activeValue = card.v;

                await this.animateDiscard(card);

                if(hand.length === 0) {
                    this.gameOver(pIdx);
                    return;
                }
                if(hand.length === 1 && pIdx === 0) {
                     const btn = document.getElementById('uno-btn');
                     btn.classList.add('visible');
                     setTimeout(() => btn.classList.remove('visible'), 2000);
                }

                if(card.c === 'Black') {
                    if(pIdx === 0) {
                        this.showColorPicker();
                        return;
                    } else {
                        const cols = ['Red','Blue','Green','Yellow'];
                        const pick = cols[Math.floor(Math.random()*4)];
                        this.resolveWild(pick);
                        return;
                    }
                } else {
                    this.activeColor = card.c;
                    await this.applyEffects(card);
                    this.nextTurn();
                }
            }

            showColorPicker() {
                const cp = document.getElementById('color-picker');
                cp.style.display = 'block';
                cp.offsetHeight;
                cp.classList.add('visible');
            }

            resolveWild(color) {
                const cp = document.getElementById('color-picker');
                cp.classList.remove('visible');
                setTimeout(() => cp.style.display = 'none', 300);
                
                this.activeColor = color;
                
                const pills = {'Red':'#ff4757', 'Blue':'#3742fa', 'Green':'#2ed573', 'Yellow':'#ffa502'};
                document.querySelector('.status-pill').style.borderColor = pills[color];

                this.nextTurn();
            }

            async applyEffects(card) {
                const nextP = (this.turn + 1) % 2; 
                
                if(card.v === 'Skip') {
                    this.updateUI("SKIPPED!", "danger");
                    await new Promise(r=>setTimeout(r, 1000));
                    this.skipTurn = true;
                } else if (card.v === 'Reverse') {
                    this.updateUI("REVERSE!", "danger");
                    await new Promise(r=>setTimeout(r, 1000));
                    this.skipTurn = true; 
                } else if (card.v === '+2') {
                    this.updateUI("OPPONENT DRAWING 2...", "warning");
                    await this.drawCard(nextP);
                    await this.drawCard(nextP);
                    this.skipTurn = true;
                } else if (card.v === 'Wild +4') {
                    this.updateUI("OPPONENT DRAWING 4...", "warning");
                    for(let i=0; i<4; i++) await this.drawCard(nextP);
                    this.skipTurn = true;
                }
            }

            nextTurn() {
                if(this.skipTurn) {
                    this.skipTurn = false;
                } else {
                    this.turn = (this.turn + 1) % 2;
                }
                
                this.locked = false;
                this.updateUI();
                
                if(this.turn === 1) {
                    this.locked = true; 
                    setTimeout(() => this.botPlay(), 1000);
                }
            }

            async botPlay() {
                const hand = this.players[1];
                const valid = hand.filter(c => this.isValid(c));
                
                if(valid.length > 0) {
                    valid.sort((a,b) => {
                        const score = c => (c.c==='Black'? 1 : 10) + (c.v.length>1 ? 5 : 0);
                        return score(b) - score(a);
                    });
                    await this.playCard(1, valid[0]);
                } else {
                    this.updateUI("Opponent Drawing...", "normal");
                    await this.drawCard(1);
                    this.nextTurn();
                }
            }

            updateUI(msg, type='normal') {
                const main = document.getElementById('main-status');
                const sub = document.getElementById('sub-status');
                const pill = document.getElementById('status-display');
                
                const colors = {'Red':'#ff4757', 'Blue':'#3742fa', 'Green':'#2ed573', 'Yellow':'#ffa502'};
                const borderColor = colors[this.activeColor] || 'rgba(255,255,255,0.2)';
                
                pill.style.borderColor = borderColor;
                pill.style.boxShadow = `0 10px 40px ${borderColor}40`;

                if(msg) {
                    main.innerText = msg;
                    sub.innerText = "";
                    return;
                }

                if(this.turn === 0) {
                    main.innerText = "YOUR TURN";
                    main.style.color = "white";
                } else {
                    main.innerText = "OPPONENT'S TURN";
                    main.style.color = "rgba(255,255,255,0.6)";
                }
                
                sub.innerText = `Active: ${this.activeColor} ${this.activeValue}`;
                sub.style.color = borderColor;
            }

            gameOver(pIdx) {
                const go = document.getElementById('game-over');
                const txt = document.getElementById('winner-text');
                go.style.display = 'flex';
                if(pIdx === 0) {
                    txt.innerText = "VICTORY";
                    txt.style.color = "#2ed573";
                } else {
                    txt.innerText = "DEFEAT";
                    txt.style.color = "#ff4757";
                }
            }
        }

        // Init
        const assets = new AssetFactory();
        assets.generate();
        const engine = new Engine();
        const game = new Game();
        game.start();

    </script>
</body>
</html>