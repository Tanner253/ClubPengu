<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Poly3D - City Edition v10</title>
    <!-- Three.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <!-- OrbitControls -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <!-- GSAP for Animations -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <!-- FontAwesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    
    <style>
        :root {
            --primary: #FF4757;
            --secondary: #2ED573;
            --accent: #1E90FF;
            --dark: #2F3542;
            --gold: #FFA502;
            --glass: rgba(20, 20, 30, 0.95);
            --text: #F1F2F6;
            --shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        body { 
            margin: 0; overflow: hidden; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #000; color: var(--text);
            user-select: none;
        }

        /* Loading */
        #loader {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: #111;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 9999; color: var(--gold); transition: opacity 0.5s;
            pointer-events: none;
        }
        .spinner {
            width: 60px; height: 60px; border: 4px solid #333; border-top-color: var(--gold);
            border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* UI Layer */
        #ui-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }

        /* Turn Banner */
        .turn-banner {
            position: absolute; top: 30px; left: 50%; transform: translateX(-50%);
            background: var(--glass); padding: 15px 50px; border-radius: 100px;
            box-shadow: 0 0 20px var(--gold); pointer-events: auto;
            display: flex; align-items: center; gap: 20px;
            border: 2px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px);
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .turn-banner h1 { margin: 0; font-size: 1.8rem; letter-spacing: 2px; text-transform: uppercase; }
        .turn-avatar { width: 50px; height: 50px; border-radius: 50%; box-shadow: 0 0 10px rgba(255,255,255,0.5); }

        /* Player Panels */
        .player-panel {
            position: absolute; top: 120px; padding: 20px;
            background: var(--glass); border-radius: 20px; width: 260px;
            box-shadow: var(--shadow); pointer-events: auto; backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            transition: transform 0.3s, opacity 0.3s;
        }
        .p1-panel { left: 30px; border-left: 6px solid var(--primary); }
        .p2-panel { right: 30px; border-right: 6px solid var(--accent); text-align: right; }
        .p2-panel .stat-row { flex-direction: row-reverse; }
        .p2-panel .prop-list { justify-content: flex-end; }

        .stat-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .player-name { font-weight: 900; font-size: 1.2rem; letter-spacing: 1px; }
        .money-val { font-size: 1.8rem; font-weight: bold; color: var(--secondary); text-shadow: 0 0 10px rgba(46, 213, 115, 0.3); }
        
        .prop-list { margin-top: 15px; display: flex; gap: 6px; flex-wrap: wrap; }
        .prop-badge { 
            width: 18px; height: 24px; border-radius: 4px; 
            border: 1px solid rgba(255,255,255,0.3); 
            box-shadow: 0 2px 5px rgba(0,0,0,0.5);
            transition: transform 0.2s;
        }
        .prop-badge:hover { transform: scale(1.5); z-index: 10; }

        /* Action Bar */
        .action-bar {
            position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
            display: flex; gap: 25px; pointer-events: auto;
        }
        .btn {
            background: white; border: none; padding: 18px 40px; border-radius: 60px;
            font-size: 1.3rem; font-weight: 800; cursor: pointer; color: var(--dark);
            box-shadow: 0 10px 20px rgba(0,0,0,0.3); 
            transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex; align-items: center; gap: 12px;
        }
        .btn:hover:not(:disabled) { transform: translateY(-5px) scale(1.05); box-shadow: 0 15px 30px rgba(0,0,0,0.4); }
        .btn:active:not(:disabled) { transform: translateY(0) scale(0.95); }
        .btn:disabled { opacity: 0.5; filter: grayscale(1); cursor: not-allowed; transform: none; }
        
        .btn-roll { background: linear-gradient(135deg, #ff9f43, #ff6b6b); color: white; }
        .btn-buy { background: linear-gradient(135deg, #2ecc71, #26de81); color: white; }
        .btn-pass { background: linear-gradient(135deg, #54a0ff, #2e86de); color: white; }

        /* Start Screen */
        #start-screen {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: radial-gradient(circle, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.9) 100%);
            z-index: 500; display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: white; visibility: hidden;
        }
        .title-3d { 
            font-size: 7rem; font-weight: 900; line-height: 1;
            background: linear-gradient(to bottom, #fff, #999); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            text-shadow: 0 10px 30px rgba(0,0,0,0.5); margin-bottom: 10px;
            opacity: 0; transform: translateY(-50px);
        }
        .subtitle-3d { 
            font-size: 1.5rem; letter-spacing: 5px; color: var(--gold); text-transform: uppercase; margin-bottom: 40px; 
            opacity: 0;
        }
        .vehicle-select {
            display: flex; gap: 20px; margin-bottom: 40px; opacity: 0;
        }
        .vehicle-option {
            background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3);
            border-radius: 15px; padding: 20px; cursor: pointer; text-align: center;
            transition: all 0.2s; width: 120px;
        }
        .vehicle-option:hover { background: rgba(255,255,255,0.2); transform: translateY(-5px); }
        .vehicle-option.selected { border-color: var(--gold); background: rgba(255, 165, 2, 0.2); box-shadow: 0 0 20px rgba(255, 165, 2, 0.4); }
        .vehicle-option i { font-size: 2rem; margin-bottom: 10px; color: white; }
        .vehicle-option span { display: block; font-weight: bold; font-size: 0.9rem; }

        .start-btn {
            padding: 25px 80px; font-size: 2.5rem; background: var(--gold); color: #000;
            border: none; border-radius: 120px; cursor: pointer; font-weight: 900;
            box-shadow: 0 0 50px rgba(255, 165, 2, 0.6); 
            opacity: 0; transform: translateY(50px);
            transition: transform 0.2s;
        }
        .start-btn:hover { transform: scale(1.1); box-shadow: 0 0 80px rgba(255, 165, 2, 0.8); }

        /* Tooltip */
        .tooltip {
            position: absolute; background: rgba(0, 0, 0, 0.9); border: 1px solid var(--gold);
            color: white; padding: 10px 15px; border-radius: 8px; font-size: 14px;
            pointer-events: none; opacity: 0; transition: opacity 0.2s;
            transform: translate(-50%, -130%); white-space: nowrap; z-index: 1000;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        }

        /* Event Modal */
        .event-modal {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0);
            background: rgba(30, 30, 40, 0.95); padding: 40px; border-radius: 30px; text-align: center;
            box-shadow: 0 0 50px rgba(0,0,0,0.8); z-index: 200; width: 400px; border: 2px solid var(--accent);
            color: white; backdrop-filter: blur(15px);
            pointer-events: auto; 
        }
        .event-modal h2 { margin: 0 0 15px 0; color: var(--gold); font-size: 2.5rem; text-transform: uppercase; }
        .event-modal p { font-size: 1.3rem; margin-bottom: 30px; line-height: 1.5; color: #ddd; }
        
        #game-container { width: 100%; height: 100%; background: #050505; }
        
        /* Dice */
        .dice-container {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            display: flex; flex-direction: column; align-items: center; gap: 20px; pointer-events: none; opacity: 0;
        }
        .dice-row { display: flex; gap: 40px; }
        .die {
            width: 100px; height: 100px; background: white; border-radius: 20px;
            display: flex; align-items: center; justify-content: center;
            font-size: 4rem; color: #333; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            font-weight: bold; border: 4px solid #ccc;
        }
        .dice-total {
            background: var(--glass); padding: 10px 30px; border-radius: 20px;
            font-size: 2rem; color: white; font-weight: bold;
            border: 2px solid var(--gold);
        }

        /* Reset View Button */
        .reset-btn {
            position: absolute; bottom: 20px; right: 20px;
            background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3);
            color: white; padding: 10px 15px; border-radius: 8px; cursor: pointer;
            pointer-events: auto; backdrop-filter: blur(5px); transition: background 0.2s;
        }
        .reset-btn:hover { background: rgba(255,255,255,0.3); }
        .reset-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    </style>
</head>
<body>

    <div id="loader"><div class="spinner"></div><h2>Constructing City...</h2></div>

    <div id="start-screen">
        <div class="vehicle-select" id="vehicleSelect">
            <div class="vehicle-option selected" onclick="selectVehicle('car', this)">
                <i class="fas fa-car-side"></i>
                <span>SPORTS CAR</span>
            </div>
            <div class="vehicle-option" onclick="selectVehicle('tank', this)">
                <i class="fas fa-shield-alt"></i>
                <span>TANK</span>
            </div>
            <div class="vehicle-option" onclick="selectVehicle('bus', this)">
                <i class="fas fa-bus"></i>
                <span>HIPPY BUS</span>
            </div>
            <div class="vehicle-option" onclick="selectVehicle('bike', this)">
                <i class="fas fa-motorcycle"></i>
                <span>MOTO</span>
            </div>
        </div>

        <button class="start-btn" id="startBtn" onclick="startGame()">PLAY</button>
    </div>

    <div id="game-container"></div>
    <div id="tooltip" class="tooltip"></div>

    <div id="ui-layer" style="display:none;">
        <div class="turn-banner" id="turnBanner">
            <div class="turn-avatar" id="turnAvatar" style="background: var(--primary);"></div>
            <h1 id="turnText">Player 1</h1>
        </div>

        <div class="player-panel p1-panel" id="p1-panel">
            <div class="stat-row"><span class="player-name" style="color:var(--primary)">PLAYER 1</span></div>
            <div class="stat-row"><span>NET WORTH</span><span class="money-val" id="p1-money">$1500</span></div>
            <div style="margin-top:10px; font-size:0.8rem; color:#aaa; font-weight:bold;">REAL ESTATE</div>
            <div class="prop-list" id="p1-props"></div>
        </div>

        <div class="player-panel p2-panel" id="p2-panel">
            <div class="stat-row"><span class="player-name" style="color:var(--accent)">RIVAL CORP (AI)</span></div>
            <div class="stat-row"><span>NET WORTH</span><span class="money-val" id="p2-money">$1500</span></div>
            <div style="margin-top:10px; font-size:0.8rem; color:#aaa; font-weight:bold;">REAL ESTATE</div>
            <div class="prop-list" id="p2-props"></div>
        </div>

        <div class="dice-container" id="diceDisplay">
            <div class="dice-row">
                <div class="die" id="die1">1</div>
                <div class="die" id="die2">1</div>
            </div>
            <div class="dice-total" id="diceTotal">TOTAL: 2</div>
        </div>

        <div class="event-modal" id="eventModal">
            <h2 id="eventTitle">Event</h2>
            <p id="eventDesc">Description</p>
            <button class="btn btn-pass" onclick="closeEventModal()" style="width:100%; justify-content:center;">CONTINUE</button>
        </div>

        <div class="action-bar">
            <button class="btn btn-roll" id="btnRoll" onclick="gameInstance.rollDice()">
                <i class="fas fa-dice"></i> ROLL DICE
            </button>
            <button class="btn btn-buy" id="btnBuy" onclick="gameInstance.buyProperty()" disabled>
                <i class="fas fa-city"></i> BUY <span id="buyPrice" style="font-size:0.9em; opacity:0.8; margin-left:5px;"></span>
            </button>
            <button class="btn btn-pass" id="btnPass" onclick="gameInstance.endTurn()" disabled>
                <i class="fas fa-forward"></i> END TURN
            </button>
        </div>

        <button class="reset-btn" id="resetBtn" onclick="gameInstance.resetView()"><i class="fas fa-video"></i> Reset View</button>
    </div>

    <script>
        let selectedVehicleType = 'car';

        function selectVehicle(type, el) {
            selectedVehicleType = type;
            document.querySelectorAll('.vehicle-option').forEach(d => d.classList.remove('selected'));
            el.classList.add('selected');
        }

        // --- GAME DATA ---
        const GROUPS = {
            BROWN: 0x8B4513, LIGHTBLUE: 0x87CEEB, PINK: 0xFF69B4, ORANGE: 0xFFA500,
            RED: 0xFF4757, YELLOW: 0xFFD32A, GREEN: 0x2ED573, DARKBLUE: 0x3742fa,
            STATION: 0x2f3542, UTILITY: 0x747d8c, NONE: 0xced6e0
        };

        const GROUP_SIZES = {
            BROWN: 2, LIGHTBLUE: 3, PINK: 3, ORANGE: 3,
            RED: 3, YELLOW: 3, GREEN: 3, DARKBLUE: 2,
            STATION: 4, UTILITY: 2
        };

        const SPACES = [
            { name: "GO", type: "go", price: 0, group: "NONE" },
            { name: "Mediterranean", type: "property", price: 60, rent: 2, group: "BROWN" },
            { name: "Comm. Chest", type: "chest", price: 0, group: "NONE" },
            { name: "Baltic Ave", type: "property", price: 60, rent: 4, group: "BROWN" },
            { name: "Income Tax", type: "tax", price: 200, group: "NONE" },
            { name: "Reading RR", type: "station", price: 200, rent: 25, group: "STATION" },
            { name: "Oriental Ave", type: "property", price: 100, rent: 6, group: "LIGHTBLUE" },
            { name: "Chance", type: "chance", price: 0, group: "NONE" },
            { name: "Vermont Ave", type: "property", price: 100, rent: 6, group: "LIGHTBLUE" },
            { name: "Conn. Ave", type: "property", price: 120, rent: 8, group: "LIGHTBLUE" },
            { name: "Jail", type: "jail", price: 0, group: "NONE" },
            { name: "St. Charles", type: "property", price: 140, rent: 10, group: "PINK" },
            { name: "Electric Co", type: "utility", price: 150, rent: 0, group: "UTILITY" },
            { name: "States Ave", type: "property", price: 140, rent: 10, group: "PINK" },
            { name: "Virginia Ave", type: "property", price: 160, rent: 12, group: "PINK" },
            { name: "Penn. RR", type: "station", price: 200, rent: 25, group: "STATION" },
            { name: "St. James", type: "property", price: 180, rent: 14, group: "ORANGE" },
            { name: "Comm. Chest", type: "chest", price: 0, group: "NONE" },
            { name: "Tenn. Ave", type: "property", price: 180, rent: 14, group: "ORANGE" },
            { name: "NY Ave", type: "property", price: 200, rent: 16, group: "ORANGE" },
            { name: "Free Parking", type: "parking", price: 0, group: "NONE" },
            { name: "Kentucky Ave", type: "property", price: 220, rent: 18, group: "RED" },
            { name: "Chance", type: "chance", price: 0, group: "NONE" },
            { name: "Indiana Ave", type: "property", price: 220, rent: 18, group: "RED" },
            { name: "Illinois Ave", type: "property", price: 240, rent: 20, group: "RED" },
            { name: "B&O RR", type: "station", price: 200, rent: 25, group: "STATION" },
            { name: "Atlantic Ave", type: "property", price: 260, rent: 22, group: "YELLOW" },
            { name: "Ventnor Ave", type: "property", price: 260, rent: 22, group: "YELLOW" },
            { name: "Water Works", type: "utility", price: 150, rent: 0, group: "UTILITY" },
            { name: "Marvin Gdns", type: "property", price: 280, rent: 24, group: "YELLOW" },
            { name: "Go To Jail", type: "gotojail", price: 0, group: "NONE" },
            { name: "Pacific Ave", type: "property", price: 300, rent: 26, group: "GREEN" },
            { name: "NC Ave", type: "property", price: 300, rent: 26, group: "GREEN" },
            { name: "Comm. Chest", type: "chest", price: 0, group: "NONE" },
            { name: "Penn. Ave", type: "property", price: 320, rent: 28, group: "GREEN" },
            { name: "Short Line", type: "station", price: 200, rent: 25, group: "STATION" },
            { name: "Chance", type: "chance", price: 0, group: "NONE" },
            { name: "Park Place", type: "property", price: 350, rent: 35, group: "DARKBLUE" },
            { name: "Luxury Tax", type: "tax", price: 100, group: "NONE" },
            { name: "Boardwalk", type: "property", price: 400, rent: 50, group: "DARKBLUE" }
        ];

        const CHANCE_CARDS = [
            { text: "Advance to GO", action: (p) => { p.pos = 0; p.money += 200; } },
            { text: "Bank error in your favor. Collect $200", action: (p) => { p.money += 200; } },
            { text: "Doctor's fees. Pay $50", action: (p) => { p.money -= 50; } },
            { text: "Go to Jail", action: (p, g) => { g.sendToJail(p); } },
            { text: "Speeding fine $15", action: (p) => { p.money -= 15; } }
        ];

        const CHEST_CARDS = [
            { text: "Advance to GO", action: (p) => { p.pos = 0; p.money += 200; } },
            { text: "You inherit $100", action: (p) => { p.money += 100; } },
            { text: "Pay Hospital Fees of $100", action: (p) => { p.money -= 100; } },
            { text: "Go to Jail", action: (p, g) => { g.sendToJail(p); } },
            { text: "From sale of stock you get $50", action: (p) => { p.money += 50; } }
        ];

        // --- 3D ENGINE ---
        class Engine {
            constructor() {
                this.container = document.getElementById('game-container');
                this.scene = new THREE.Scene();
                this.scene.background = new THREE.Color(0x050510);
                this.scene.fog = new THREE.FogExp2(0x050510, 0.012);

                this.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
                this.camera.position.set(0, 55, 60); 
                
                this.renderer = new THREE.WebGLRenderer({ antialias: true });
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                this.container.appendChild(this.renderer.domElement);

                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.maxPolarAngle = Math.PI / 2.1;
                this.controls.minDistance = 10;
                this.controls.maxDistance = 200;
                this.controls.autoRotate = true; 
                this.controls.autoRotateSpeed = 0.5;

                // Lighting
                this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
                this.scene.add(this.ambientLight);
                
                this.moonLight = new THREE.DirectionalLight(0xaaccff, 0.8);
                this.moonLight.position.set(-20, 50, -20);
                this.moonLight.castShadow = true;
                this.moonLight.shadow.mapSize.width = 2048;
                this.moonLight.shadow.mapSize.height = 2048;
                this.moonLight.shadow.camera.near = 0.5;
                this.moonLight.shadow.camera.far = 500;
                this.moonLight.shadow.camera.left = -50;
                this.moonLight.shadow.camera.right = 50;
                this.moonLight.shadow.camera.top = 50;
                this.moonLight.shadow.camera.bottom = -50;
                this.scene.add(this.moonLight);

                const streetLight = new THREE.PointLight(0xffaa00, 0.8, 60);
                streetLight.position.set(0, 20, 0);
                this.scene.add(streetLight);

                this.raycaster = new THREE.Raycaster();
                this.mouse = new THREE.Vector2();
                this.tooltip = document.getElementById('tooltip');
                
                this.windowTexture = this.createWindowTexture();

                window.addEventListener('resize', () => this.onResize());
                window.addEventListener('mousemove', (e) => this.onMouseMove(e));

                this.tiles = [];
                this.playersMeshes = [];
                this.cashPiles = [[], []]; 
                this.ambientCars = [];
                this.pedestrians = [];
                this.focusedMesh = null; 
                this.moneyParticles = [];
                this.fireworks = [];
                this.isMoving = false; // Flag to track player movement
                
                // ORDER OF RINGS (Inside Out), Normalized to Y=0
                this.initBoard(); // Park & Cards
                this.initBlackBorder(); // Outer Pawn Lane
                this.initPerimeterLights(); // New Lights
                this.initRoad();
                this.initSidewalks(); 
                this.initTraffic();
                this.initPedestrians();
                this.initDecor();
                this.animate();
            }

            // ... (keep createWindowTexture, createTexture unchanged) ...
            createWindowTexture() {
                const canvas = document.createElement('canvas');
                canvas.width = 64; canvas.height = 64;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#222'; ctx.fillRect(0,0,64,64);
                ctx.fillStyle = '#ffeb3b'; 
                ctx.fillRect(8, 8, 20, 20); ctx.fillRect(36, 8, 20, 20);
                ctx.fillRect(8, 36, 20, 20); ctx.fillRect(36, 36, 20, 20);
                const tex = new THREE.CanvasTexture(canvas);
                tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
                return tex;
            }

            createTexture(text, colorHex, price) {
                const canvas = document.createElement('canvas');
                canvas.width = 512; canvas.height = 512;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#f1f2f6'; ctx.fillRect(0,0,512,512);
                ctx.fillStyle = 'rgba(0,0,0,0.05)';
                for(let i=0; i<50; i++) ctx.fillRect(Math.random()*512, Math.random()*512, 10, 10);
                if(colorHex !== 'NONE') {
                    ctx.fillStyle = '#' + new THREE.Color(GROUPS[colorHex]).getHexString();
                    ctx.fillRect(0,0,512, 120);
                    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, 120, 512, 10);
                }
                ctx.fillStyle = '#2d3436'; ctx.textAlign = 'center'; ctx.font = 'bold 50px Segoe UI';
                const words = text.split(' '); let y = (colorHex !== 'NONE') ? 180 : 200;
                words.forEach(w => { ctx.fillText(w, 256, y); y += 60; });
                if (price > 0) {
                    ctx.font = 'bold 60px Courier New'; ctx.fillStyle = '#2d3436'; ctx.fillText(`$${price}`, 256, 460);
                }
                ctx.strokeStyle = '#2d3436'; ctx.lineWidth = 10; ctx.strokeRect(0,0,512,512);
                return new THREE.CanvasTexture(canvas);
            }

            initBoard() {
                const L_CARDS = 36; 
                const tileStep = 7.2; 
                const tableGeo = new THREE.CylinderGeometry(120, 120, 2, 32);
                const tableMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
                const table = new THREE.Mesh(tableGeo, tableMat);
                table.position.y = -1; 
                this.tableMesh = table;
                this.scene.add(table);
                const centerGeo = new THREE.BoxGeometry(24, 0.2, 24);
                const centerMat = new THREE.MeshStandardMaterial({ color: 0x27ae60 });
                const center = new THREE.Mesh(centerGeo, centerMat);
                center.position.y = 0.1;
                this.centerMesh = center;
                this.scene.add(center);
                for(let i=0; i<40; i++) {
                    let x=0, z=0, rot=0;
                    if (i >= 0 && i <= 10) { 
                        if(i===0) { x = L_CARDS; z = L_CARDS; rot = 0; } 
                        else if(i===10) { x = -L_CARDS; z = L_CARDS; rot = 0; } 
                        else { x = (5 - i) * tileStep; z = L_CARDS; rot = 0; }
                    } else if (i > 10 && i <= 20) { 
                        if(i===20) { x = -L_CARDS; z = -L_CARDS; rot = -Math.PI/2; } 
                        else { x = -L_CARDS; z = (15 - i) * tileStep; rot = -Math.PI/2; }
                    } else if (i > 20 && i <= 30) { 
                        if(i===30) { x = L_CARDS; z = -L_CARDS; rot = Math.PI; } 
                        else { x = -(25 - i) * tileStep; z = -L_CARDS; rot = Math.PI; }
                    } else if (i > 30) { 
                        x = L_CARDS; z = -(35 - i) * tileStep; rot = Math.PI/2;
                    }
                    const data = SPACES[i];
                    const isCorner = (i%10 === 0);
                    const w = isCorner ? 5.5 : 4.0;
                    const d = 5.5; 
                    const mat = new THREE.MeshStandardMaterial({ 
                        map: this.createTexture(data.name, data.group, data.price),
                        roughness: 0.3, metalness: 0.05
                    });
                    const geo = new THREE.BoxGeometry(w, 0.4, d);
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(x, 0.2, z); 
                    mesh.rotation.y = rot; 
                    mesh.castShadow = true; mesh.receiveShadow = true;
                    mesh.userData = { id: i, data: data };
                    this.scene.add(mesh);
                    this.tiles.push({ mesh, x, z, rot });
                    if (data.type === 'property' || data.type === 'station') {
                        this.addBuilding(mesh, data, x, z, rot);
                    }
                }
            }
            initBlackBorder() {
                const group = new THREE.Group(); group.position.y = 0.04; 
                const mat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.8 });
                const R = 44; const width = 5; 
                const addLoop = (radius, width, mat) => {
                    const sideLen = (radius * 2) + width;
                    const t = new THREE.Mesh(new THREE.PlaneGeometry(sideLen, width), mat);
                    t.rotation.x = -Math.PI/2; t.position.set(0,0, -radius);
                    const b = new THREE.Mesh(new THREE.PlaneGeometry(sideLen, width), mat);
                    b.rotation.x = -Math.PI/2; b.position.set(0,0, radius);
                    const l = new THREE.Mesh(new THREE.PlaneGeometry(width, sideLen - width*2), mat);
                    l.rotation.x = -Math.PI/2; l.position.set(-radius, 0, 0);
                    const r = new THREE.Mesh(new THREE.PlaneGeometry(width, sideLen - width*2), mat);
                    r.rotation.x = -Math.PI/2; r.position.set(radius, 0, 0);
                    group.add(t, b, l, r);
                };
                addLoop(R, width, mat);
                this.scene.add(group);
                this.borderGroup = group;
            }
            initPerimeterLights() {
                const R = 48; const count = 20; 
                for(let i=0; i<count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    const x = Math.cos(angle) * R; const z = Math.sin(angle) * R;
                    const postGroup = new THREE.Group();
                    postGroup.position.set(x, 0, z); postGroup.lookAt(0, 0, 0); 
                    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6), new THREE.MeshStandardMaterial({color: 0x222222}));
                    pole.position.y = 3;
                    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 2.5), new THREE.MeshStandardMaterial({color: 0x222222}));
                    arm.position.y = 5.8; arm.position.z = 1.2; 
                    const bulbGeo = new THREE.BoxGeometry(0.4, 0.1, 0.4);
                    const bulbMat = new THREE.MeshBasicMaterial({color: 0xffaa00});
                    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
                    bulb.position.set(0, 5.75, 2.3);
                    const spot = new THREE.SpotLight(0xffaa00, 2.0, 30, 0.8, 0.5, 1);
                    spot.position.set(0, 5.8, 2.3);
                    const targetObj = new THREE.Object3D();
                    targetObj.position.set(0, 0, 4); 
                    postGroup.add(targetObj);
                    spot.target = targetObj;
                    const point = new THREE.PointLight(0xffaa00, 0.5, 10);
                    point.position.set(0, 5.5, 2.3);
                    postGroup.add(pole, arm, bulb, spot, point);
                    this.scene.add(postGroup);
                }
            }
            initRoad() {
                const R = 24; const roadWidth = 6; const len = 42; 
                const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });
                const group = new THREE.Group(); group.position.y = 0.05; 
                const addStrip = (x, z, w, h, rot) => {
                    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roadMat);
                    plane.rotation.x = -Math.PI/2; plane.rotation.z = rot;
                    plane.position.set(x, 0, z); plane.receiveShadow = true;
                    const lineGeo = new THREE.PlaneGeometry(w, 0.15);
                    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
                    const line = new THREE.Mesh(lineGeo, lineMat); line.position.z = 0.02; 
                    const dashL = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.1), new THREE.MeshBasicMaterial({color:0xaaaaaa}));
                    dashL.position.set(0, 0.02, -1.5);
                    const dashR = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.1), new THREE.MeshBasicMaterial({color:0xaaaaaa}));
                    dashR.position.set(0, 0.02, 1.5);
                    plane.add(line, dashL, dashR); group.add(plane);
                };
                addStrip(0, R, len, roadWidth, 0); addStrip(0, -R, len, roadWidth, 0);
                addStrip(-R, 0, len, roadWidth, Math.PI/2); addStrip(R, 0, len, roadWidth, Math.PI/2);
                const cornerGeo = new THREE.PlaneGeometry(roadWidth, roadWidth);
                [{x:R, z:R}, {x:-R, z:R}, {x:-R, z:-R}, {x:R, z:-R}].forEach(c => {
                    const m = new THREE.Mesh(cornerGeo, roadMat);
                    m.rotation.x = -Math.PI/2; m.position.set(c.x, 0, c.z); group.add(m);
                });
                this.roadGroup = group; this.scene.add(group);
            }
            initSidewalks() {
                const swMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.9 });
                const group = new THREE.Group(); group.position.y = 0.06; 
                const addLoop = (radius, width, mat) => {
                    const sideLen = (radius * 2) + width;
                    const t = new THREE.Mesh(new THREE.PlaneGeometry(sideLen, width), mat);
                    t.rotation.x = -Math.PI/2; t.position.set(0,0, -radius);
                    const b = new THREE.Mesh(new THREE.PlaneGeometry(sideLen, width), mat);
                    b.rotation.x = -Math.PI/2; b.position.set(0,0, radius);
                    const l = new THREE.Mesh(new THREE.PlaneGeometry(width, sideLen - width*2), mat);
                    l.rotation.x = -Math.PI/2; l.position.set(-radius, 0, 0);
                    const r = new THREE.Mesh(new THREE.PlaneGeometry(width, sideLen - width*2), mat);
                    r.rotation.x = -Math.PI/2; r.position.set(radius, 0, 0);
                    group.add(t, b, l, r);
                };
                addLoop(19, 3, swMat); addLoop(30, 3, swMat);
                this.scene.add(group); this.sidewalkGroup = group;
            }
            initTraffic() {
                for(let i=0; i<6; i++) { this.ambientCars.push(new AmbientCar(this.scene, i * 0.16, 0)); }
                for(let i=0; i<6; i++) { this.ambientCars.push(new AmbientCar(this.scene, i * 0.16 + 0.08, 1)); }
            }
            initPedestrians() {
                for(let i=0; i<24; i++) { const lane = Math.random() > 0.5 ? 0 : 1; this.pedestrians.push(new Pedestrian(this.scene, Math.random(), lane)); }
            }
            addBuilding(tileMesh, data, tx, tz, rot) {
                const height = data.price ? (data.price / 30) : 3;
                const color = data.group !== 'NONE' ? GROUPS[data.group] : 0x7f8c8d;
                const buildingGroup = new THREE.Group();
                const baseMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.1, map: this.windowTexture });
                baseMat.map.repeat.set(1, Math.floor(height/2));
                const type = (height > 6) ? 'SKYSCRAPER' : (data.type === 'station' ? 'STATION' : 'RESIDENTIAL');
                if (type === 'SKYSCRAPER') {
                    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.5, height, 2.5), baseMat); tower.position.y = height/2; buildingGroup.add(tower);
                    if (height > 10) { const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1.5), baseMat); top.position.y = height + 1.5; buildingGroup.add(top); }
                } else if (type === 'STATION') {
                    const base = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 2), baseMat); base.position.y = 1.25;
                    const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 16, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({color:0x333}));
                    roof.rotation.z = Math.PI/2; roof.position.y = 2.5; buildingGroup.add(base, roof);
                } else {
                    const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, height, 2.2), baseMat); base.position.y = height/2; buildingGroup.add(base);
                    if (Math.random() > 0.5) { const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.5, 4), new THREE.MeshStandardMaterial({color:0x5d4037})); roof.rotation.y = Math.PI/4; roof.position.y = height + 0.75; buildingGroup.add(roof); } 
                    else { const ac = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), new THREE.MeshStandardMaterial({color:0x999})); ac.position.y = height + 0.25; buildingGroup.add(ac); }
                }
                const innerR = 15; const scale = 15 / 36;
                let bx = tx * scale; let bz = tz * scale;
                if (Math.abs(tx) > Math.abs(tz)) { bx = (tx > 0) ? innerR : -innerR; } else { bz = (tz > 0) ? innerR : -innerR; }
                buildingGroup.position.set(bx, 0.2, bz);
                buildingGroup.userData = { targetY: 0.2 }; buildingGroup.rotation.y = rot;
                buildingGroup.traverse(c => { if(c.isMesh) { c.castShadow = true; c.receiveShadow = true; }});
                this.scene.add(buildingGroup);
                this.tiles[tileMesh.userData.id].building = buildingGroup;
            }
            initDecor() {
                for(let i=0; i<30; i++) {
                    const tree = new THREE.Group();
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 1.5), new THREE.MeshStandardMaterial({color: 0x5D4037}));
                    const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2), new THREE.MeshStandardMaterial({color: 0x27ae60}));
                    leaves.position.y = 1.5; trunk.position.y = 0.75; tree.add(trunk, leaves);
                    const angle = Math.random() * Math.PI * 2; const r = Math.random() * 12; 
                    tree.position.set(Math.cos(angle)*r, 0.1, Math.sin(angle)*r);
                    this.scene.add(tree); this.tiles.push({ isDecor: true, mesh: tree }); 
                }
            }
            animateIntro() {
                return new Promise((resolve) => {
                    const tl = gsap.timeline({ onComplete: resolve });
                    tl.to(this.tableMesh.position, { y: -1, duration: 1.5, ease: "power2.out" });
                    tl.to(this.centerMesh.position, { y: 0.1, duration: 1.5, ease: "power2.out" }, "<");
                    tl.to(this.roadGroup.position, { y: 0.05, duration: 1.5, ease: "power2.out" }, "<");
                    tl.to(this.sidewalkGroup.position, { y: 0.06, duration: 1.5, ease: "power2.out" }, "<");
                    tl.to(this.borderGroup.position, { y: 0.04, duration: 1.5, ease: "power2.out"}, "<");
                    tl.to(".vehicle-select", { opacity: 1, duration: 1, delay: 0.5 }); 
                    this.tiles.forEach((t, i) => {
                        const delay = i * 0.02;
                        tl.to(t.mesh.position, { y: 0.2, duration: 0.8, ease: "elastic.out(1, 0.6)" }, 0.5 + delay);
                        if(t.building) tl.to(t.building.position, { y: t.building.userData.targetY, duration: 1, ease: "back.out(2)" }, 0.6 + delay);
                        if(t.isDecor) tl.to(t.mesh.position, { y: 0.1, duration: 0.8, ease: "back.out" }, 1 + Math.random());
                    });
                });
            }

            setPlayerLight(colorHex) {
                gsap.to(this.moonLight.color, { r: new THREE.Color(colorHex).r, g: new THREE.Color(colorHex).g, b: new THREE.Color(colorHex).b, duration: 1 });
            }

            spawnMoneyParticles(startPos, endPos) {
                const count = 10;
                for(let i=0; i<count; i++) {
                    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({color: 0x2ecc71, side: THREE.DoubleSide}));
                    mesh.position.copy(startPos);
                    mesh.position.y += 2;
                    this.scene.add(mesh);
                    const midX = (startPos.x + endPos.x)/2;
                    const midZ = (startPos.z + endPos.z)/2;
                    const tl = gsap.timeline({ onComplete: () => this.scene.remove(mesh) });
                    tl.to(mesh.position, { x: midX, y: 10, z: midZ, duration: 0.5, ease: "power1.out" });
                    tl.to(mesh.position, { x: endPos.x, y: 0, z: endPos.z, duration: 0.5, ease: "power1.in" });
                    tl.to(mesh.rotation, { x: Math.random()*5, y: Math.random()*5, duration: 1 }, "<");
                }
            }

            spawnFireworks() {
                const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
                for(let i=0; i<5; i++) {
                    setTimeout(() => {
                        const x = (Math.random() - 0.5) * 40;
                        const z = (Math.random() - 0.5) * 40;
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        for(let j=0; j<20; j++) {
                            const p = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5), new THREE.MeshBasicMaterial({color: color}));
                            p.position.set(x, 10, z);
                            this.scene.add(p);
                            const destX = x + (Math.random()-0.5)*15;
                            const destY = 10 + (Math.random()-0.5)*15;
                            const destZ = z + (Math.random()-0.5)*15;
                            gsap.to(p.position, {x: destX, y: destY, z: destZ, duration: 1, ease: "power2.out", onComplete: () => this.scene.remove(p)});
                            gsap.to(p.material, {opacity: 0, duration: 1});
                        }
                    }, i * 500);
                }
            }

            updateCashVisuals(playerId, money, payerPos = null) {
                const count = Math.floor(money / 250); const pile = this.cashPiles[playerId];
                const sideX = (playerId === 0) ? 55 : -55; const sideZ = (playerId === 0) ? 20 : -20; 
                
                if (payerPos) {
                    this.spawnMoneyParticles(payerPos, new THREE.Vector3(sideX, 0, sideZ));
                }

                if (pile.length < count) {
                    const diff = count - pile.length;
                    for(let i=0; i<diff; i++) {
                        const geo = new THREE.BoxGeometry(1.5, 0.2, 0.8); const mat = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });
                        const bill = new THREE.Mesh(geo, mat);
                        const stackIndex = pile.length; const col = stackIndex % 3; const row = Math.floor(stackIndex / 3); const height = Math.floor(stackIndex / 9);
                        bill.position.set(sideX + (col*1.2), (height * 0.25), sideZ + (row * 1.5));
                        bill.rotation.y = Math.random() * 0.5; this.scene.add(bill); pile.push(bill);
                        gsap.from(bill.scale, { x:0, y:0, z:0, duration: 0.5, ease: "back.out" });
                    }
                } else if (pile.length > count) { const diff = pile.length - count; for(let i=0; i<diff; i++) { const bill = pile.pop(); this.scene.remove(bill); } }
            }

            createVehicleMesh(type, color) {
                const group = new THREE.Group();
                const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.1, metalness: 0.8, emissive: color, emissiveIntensity: 0.2 });
                const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

                if (type === 'tank') {
                    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 2.2), mat); chassis.position.y = 0.3;
                    const turret = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 1.0), mat); turret.position.y = 0.8;
                    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5), mat); 
                    barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.8, 1.0);
                    const trackL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 2.0), blackMat); trackL.position.set(-0.9, 0.2, 0);
                    const trackR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 2.0), blackMat); trackR.position.set(0.9, 0.2, 0);
                    group.add(chassis, turret, barrel, trackL, trackR);
                } else if (type === 'bus') {
                    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2.4), mat); body.position.y = 0.8;
                    const windows = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.4, 2.0), new THREE.MeshStandardMaterial({color: 0x87CEEB}));
                    windows.position.y = 1.0;
                    [[-0.7, 0.8], [0.7, 0.8], [-0.7, -0.8], [0.7, -0.8]].forEach(pos => {
                        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16), blackMat);
                        w.rotation.z = Math.PI/2; w.position.set(pos[0], 0.3, pos[1]); group.add(w);
                    });
                    group.add(body, windows);
                } else if (type === 'bike') {
                    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 1.2), mat); body.position.y = 0.5;
                    const wheelF = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 16), blackMat); wheelF.position.set(0, 0.3, 0.6);
                    const wheelB = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 16), blackMat); wheelB.position.set(0, 0.3, -0.6);
                    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.05), blackMat); handle.position.set(0, 0.8, 0.3);
                    group.add(body, wheelF, wheelB, handle);
                } else {
                    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 1.8), mat);
                    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 1), mat); cabin.position.y = 0.4;
                    [[-0.6, 0.6], [0.6, 0.6], [-0.6, -0.6], [0.6, -0.6]].forEach(pos => {
                        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16), blackMat);
                        w.rotation.z = Math.PI/2; w.position.set(pos[0], 0, pos[1]); group.add(w);
                    });
                    group.add(chassis, cabin);
                }
                return group;
            }

            addPlayer(color, id, type = 'car') {
                const group = this.createVehicleMesh(type, color);
                const startPos = this.getPawnPos(0, id);
                group.position.set(startPos.x, 0.3, startPos.z); 
                this.scene.add(group); this.playersMeshes.push(group);
                return group;
            }

            getPawnPos(tileIndex, playerId) {
                const L_PAWN = 44;
                const tileStep = 8.8; 
                let x=0, z=0, rot=0;
                
                if (tileIndex >= 0 && tileIndex <= 10) { 
                    if(tileIndex===0) { x = L_PAWN; z = L_PAWN; rot = 0; }
                    else if(tileIndex===10) { x = -L_PAWN; z = L_PAWN; rot = 0; }
                    else { x = (5 - tileIndex) * tileStep; z = L_PAWN; rot = 0; }
                } else if (tileIndex > 10 && tileIndex <= 20) { 
                    if(tileIndex===20) { x = -L_PAWN; z = -L_PAWN; rot = -Math.PI/2; }
                    else { x = -L_PAWN; z = (15 - tileIndex) * tileStep; rot = -Math.PI/2; }
                } else if (tileIndex > 20 && tileIndex <= 30) { 
                    if(tileIndex===30) { x = L_PAWN; z = -L_PAWN; rot = Math.PI; }
                    else { x = -(25 - tileIndex) * tileStep; z = -L_PAWN; rot = Math.PI; }
                } else if (tileIndex > 30) { 
                    x = L_PAWN; z = -(35 - tileIndex) * tileStep; rot = Math.PI/2;
                }

                const offset = (playerId === 0) ? -1 : 1;
                const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), rot);
                x += rightVec.x * offset;
                z += rightVec.z * offset;

                return {x, z, rot};
            }

            setFocus(mesh, reset = false) {
                this.focusedMesh = mesh;
                if (reset && mesh) {
                    const offset = new THREE.Vector3(0, 12, 15); // Zoomed in locked view
                    const targetPos = mesh.position.clone();
                    const camPos = targetPos.clone().add(offset);
                    gsap.to(this.controls.target, { x: targetPos.x, y: targetPos.y, z: targetPos.z, duration: 1.0 });
                    gsap.to(this.camera.position, { x: camPos.x, y: camPos.y, z: camPos.z, duration: 1.0 });
                }
            }

            movePiece(playerId, fromIndex, toIndex, onComplete) {
                const piece = this.playersMeshes[playerId];
                
                // Force camera lock & close zoom at start of movement
                this.focusedMesh = piece; 
                this.isMoving = true; 
                this.controls.enabled = false; 

                // Animate camera to close-up "chase" position
                const chaseOffset = new THREE.Vector3(0, 12, 15);
                // We don't apply rotation here, we just use fixed offset relative to world for simplicity,
                // or we could rotate it. Let's keep simple relative offset for stability.
                const targetCamPos = piece.position.clone().add(chaseOffset);
                gsap.to(this.camera.position, { x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z, duration: 0.8 });
                gsap.to(this.controls.target, { x: piece.position.x, y: piece.position.y, z: piece.position.z, duration: 0.8 });

                const tl = gsap.timeline({ 
                    onComplete: () => {
                        this.isMoving = false;
                        this.controls.enabled = true; 
                        if(onComplete) onComplete();
                    } 
                });
                
                let currentIndex = fromIndex;
                const steps = (toIndex >= fromIndex) ? (toIndex - fromIndex) : (40 - fromIndex + toIndex);
                
                for(let s=0; s < steps; s++) {
                    currentIndex = (currentIndex + 1) % 40;
                    const target = this.getPawnPos(currentIndex, playerId);
                    tl.to(piece.position, { x: target.x, z: target.z, duration: 0.4, ease: "power1.inOut" }, ">"); 
                    tl.to(piece.position, { y: 3, duration: 0.2, yoyo: true, repeat: 1, ease: "power1.out" }, "<");
                    if(s < steps - 1) tl.to(piece.rotation, { y: target.rot + Math.PI/2, duration: 0.2 }, "<");
                }
                tl.to(piece.position, { y: 0.3, duration: 0.2, ease: "bounce.out" });
            }

            onResize() { this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(window.innerWidth, window.innerHeight); }
            onMouseMove(event) {
                this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1; this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObjects(this.scene.children);
                let foundTile = false;
                for (let i = 0; i < intersects.length; i++) {
                    let obj = intersects[i].object;
                    while(obj && !obj.userData.data && obj.parent) obj = obj.parent;
                    if (obj && obj.userData.data) {
                        const data = obj.userData.data;
                        this.tooltip.style.left = event.clientX + 'px'; this.tooltip.style.top = event.clientY + 'px';
                        let extra = '';
                        if(data.owner !== undefined) extra += `<br><span style="color:#aaa">Owner: ${data.owner === 0 ? "P1" : "Rival"}</span>`;
                        this.tooltip.innerHTML = `<div style="text-align:center;"><strong style="color:var(--gold); font-size:1.1em;">${data.name}</strong><br><span style="font-size:0.9em; opacity:0.8;">${data.type.toUpperCase()}</span>${data.price > 0 ? `<br><span style="color:var(--secondary)">$${data.price}</span>` : ''}${extra}</div>`;
                        this.tooltip.style.opacity = 1; foundTile = true; break;
                    }
                }
                if (!foundTile) this.tooltip.style.opacity = 0;
            }

            animate() {
                requestAnimationFrame(() => this.animate());
                const time = Date.now() * 0.001;
                this.ambientCars.forEach(car => car.update(time));
                this.pedestrians.forEach(p => p.update(time));

                if (this.focusedMesh) {
                    const relativeOffset = this.camera.position.clone().sub(this.controls.target);
                    const targetPos = this.focusedMesh.position;
                    // If moving, enforce close chase view or strict relative offset
                    this.controls.target.lerp(targetPos, 0.08); // Faster lerp for tighter follow
                    this.camera.position.copy(this.controls.target).add(relativeOffset);
                }

                this.controls.update();
                this.renderer.render(this.scene, this.camera);
            }
        }

        // --- TRAFFIC & PEDESTRIANS (Keep unchanged) ---
        class AmbientCar {
            constructor(scene, offset, lane) {
                this.progress = offset; this.lane = lane; this.speed = 0.00015 + Math.random() * 0.0001; 
                const group = new THREE.Group();
                const color = Math.random() > 0.5 ? 0xffffff : (Math.random() > 0.5 ? 0xff4757 : 0x1e90ff);
                const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2 });
                const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 2.2), bodyMat); body.position.y = 0.5;
                const cabin = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1.2), new THREE.MeshStandardMaterial({ color: 0x333 })); cabin.position.y = 1.0;
                const lightTarget = new THREE.Object3D(); lightTarget.position.set(0, 0, 5); group.add(lightTarget);
                const leftL = new THREE.SpotLight(0xffffee, 2, 20, 0.6, 0.5, 1); leftL.position.set(-0.4, 0.6, 1); leftL.target = lightTarget; group.add(leftL);
                const rightL = new THREE.SpotLight(0xffffee, 2, 20, 0.6, 0.5, 1); rightL.position.set(0.4, 0.6, 1); rightL.target = lightTarget; group.add(rightL);
                const tailGeo = new THREE.BoxGeometry(0.3, 0.1, 0.1); const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const tl = new THREE.Mesh(tailGeo, tailMat); tl.position.set(-0.4, 0.6, -1.1);
                const tr = new THREE.Mesh(tailGeo, tailMat); tr.position.set(0.4, 0.6, -1.1); group.add(tl, tr);
                group.add(body, cabin); scene.add(group);
                this.mesh = group;
            }
            update(time) {
                if (this.lane === 0) { this.progress += this.speed; if(this.progress > 1) this.progress -= 1; } 
                else { this.progress -= this.speed; if(this.progress < 0) this.progress += 1; }
                const R = (this.lane === 0) ? 22.5 : 25.5; const P = this.progress * 4; let x=0, z=0;
                if (P < 1) { x = R - (P * 2 * R); z = R; } else if (P < 2) { x = -R; z = R - ((P-1) * 2 * R); }
                else if (P < 3) { x = -R + ((P-2) * 2 * R); z = -R; } else { x = R; z = -R + ((P-3) * 2 * R); }
                this.mesh.position.set(x, 0.5, z);
                const aheadVal = (this.lane === 0) ? 0.01 : -0.01; let aheadP = this.progress + aheadVal;
                if(aheadP > 1) aheadP -= 1; if(aheadP < 0) aheadP += 1;
                const AP = aheadP * 4; let ax=0, az=0;
                if (AP < 1) { ax = R - (AP * 2 * R); az = R; } else if (AP < 2) { ax = -R; az = R - ((AP-1) * 2 * R); }
                else if (AP < 3) { ax = -R + ((AP-2) * 2 * R); az = -R; } else { ax = R; az = -R + ((AP-3) * 2 * R); }
                this.mesh.lookAt(ax, 0.5, az);
            }
        }

        class Pedestrian {
            constructor(scene, progress, lane) {
                this.scene = scene; this.progress = progress; this.lane = lane; this.speed = 0.00005 + Math.random() * 0.00005; this.hasDog = Math.random() < 0.3; 
                this.group = new THREE.Group();
                const shirtColor = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
                const pantsColor = new THREE.Color().setHSL(Math.random(), 0.5, 0.3);
                const bodyGeo = new THREE.BoxGeometry(0.3, 0.45, 0.2);
                const bodyMat = new THREE.MeshStandardMaterial({ color: shirtColor });
                this.body = new THREE.Mesh(bodyGeo, bodyMat); this.body.position.y = 0.5;
                const headGeo = new THREE.BoxGeometry(0.2, 0.25, 0.2);
                const headMat = new THREE.MeshStandardMaterial({ color: 0xffdab9 });
                this.head = new THREE.Mesh(headGeo, headMat); this.head.position.y = 0.85;
                const legGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
                const legMat = new THREE.MeshStandardMaterial({ color: pantsColor });
                this.legL = new THREE.Mesh(legGeo, legMat); this.legL.position.set(-0.08, 0.2, 0);
                this.legR = new THREE.Mesh(legGeo, legMat); this.legR.position.set(0.08, 0.2, 0);
                const armGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
                const armMat = new THREE.MeshStandardMaterial({ color: shirtColor });
                this.armL = new THREE.Mesh(armGeo, armMat); this.armL.position.set(-0.2, 0.55, 0);
                this.armR = new THREE.Mesh(armGeo, armMat); this.armR.position.set(0.2, 0.55, 0);
                this.group.add(this.body, this.head, this.legL, this.legR, this.armL, this.armR);
                if (this.hasDog) {
                    this.dogGroup = new THREE.Group();
                    const dogBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.4), new THREE.MeshStandardMaterial({color: 0x8d5524})); dogBody.position.y = 0.15;
                    const dogHead = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.2), new THREE.MeshStandardMaterial({color: 0x8d5524})); dogHead.position.set(0, 0.25, 0.2);
                    this.dogGroup.add(dogBody, dogHead); this.dogGroup.position.set(0.4, 0, 0.2); 
                    this.group.add(this.dogGroup);
                }
                this.scene.add(this.group);
            }
            update(time) {
                this.progress += this.speed; if (this.progress > 1) this.progress -= 1;
                const R = (this.lane === 0) ? 19 : 30; const P = this.progress * 4; let x=0, z=0;
                if (P < 1) { x = R - (P * 2 * R); z = R; } else if (P < 2) { x = -R; z = R - ((P-1) * 2 * R); }
                else if (P < 3) { x = -R + ((P-2) * 2 * R); z = -R; } else { x = R; z = -R + ((P-3) * 2 * R); }
                const bob = Math.abs(Math.sin(time*10*2)) * 0.05;
                this.group.position.set(x, 0.06 + bob, z);
                const aheadP = (this.progress + 0.01) % 1; const AP = aheadP * 4; let ax=0, az=0;
                if (AP < 1) { ax = R - (AP * 2 * R); az = R; } else if (AP < 2) { ax = -R; az = R - ((AP-1) * 2 * R); }
                else if (AP < 3) { ax = -R + ((AP-2) * 2 * R); az = -R; } else { ax = R; az = -R + ((AP-3) * 2 * R); }
                this.group.lookAt(ax, 0.06, az);
                const walkSpeed = time * 10;
                this.legL.rotation.x = Math.sin(walkSpeed) * 0.5; this.legR.rotation.x = Math.cos(walkSpeed) * 0.5;
                this.armL.rotation.x = Math.cos(walkSpeed) * 0.5; this.armR.rotation.x = Math.sin(walkSpeed) * 0.5;
                if (this.hasDog) { this.dogGroup.position.y = Math.abs(Math.sin(walkSpeed*3)) * 0.1; this.dogGroup.rotation.z = Math.sin(walkSpeed) * 0.1; }
            }
        }

        // --- GAME LOGIC ---
        class Game {
            constructor(engineInstance, playerVehicle) {
                this.engine = engineInstance;
                this.players = [
                    { id: 0, name: "PLAYER 1", color: "#FF4757", money: 1500, pos: 0, props: [], isAI: false, vehicle: playerVehicle, inJail: false, jailTurns: 0, getOutOfJailFree: 0 },
                    { id: 1, name: "RIVAL CORP", color: "#1E90FF", money: 1500, pos: 0, props: [], isAI: true, vehicle: 'car', inJail: false, jailTurns: 0, getOutOfJailFree: 0 }
                ];
                this.turn = 0; this.state = "START"; this.doublesCount = 0;
                this.players.forEach(p => {
                    this.engine.addPlayer(p.color, p.id, p.vehicle);
                    this.engine.updateCashVisuals(p.id, p.money);
                });
                this.engine.controls.autoRotate = false;
            }
            start() {
                const ss = document.getElementById('start-screen'); ss.style.opacity = 0;
                setTimeout(() => ss.style.display = 'none', 500);
                document.getElementById('ui-layer').style.display = 'block';
                this.startTurn();
            }
            updateUI() {
                document.getElementById('p1-money').innerText = `$${this.players[0].money}`;
                document.getElementById('p2-money').innerText = `$${this.players[1].money}`;
                ['p1-props', 'p2-props'].forEach((id, idx) => {
                    const container = document.getElementById(id); container.innerHTML = '';
                    this.players[idx].props.forEach(p => {
                        const d = document.createElement('div'); d.className = 'prop-badge';
                        d.style.backgroundColor = '#' + new THREE.Color(GROUPS[p.group]).getHexString(); d.title = p.name;
                        container.appendChild(d);
                    });
                });
                const p = this.players[this.turn];
                const banner = document.getElementById('turnBanner'); document.getElementById('turnText').innerText = `${p.name}`;
                document.getElementById('turnAvatar').style.backgroundColor = p.color;
                this.engine.setPlayerLight(p.color); // Dynamic lighting
                
                if(p.id === 0) {
                    banner.style.border = '2px solid var(--primary)';
                    document.getElementById('p1-panel').style.opacity = 1; document.getElementById('p1-panel').style.transform = "scale(1.05)";
                    document.getElementById('p2-panel').style.opacity = 0.6; document.getElementById('p2-panel').style.transform = "scale(1)";
                } else {
                    banner.style.border = '2px solid var(--accent)';
                    document.getElementById('p1-panel').style.opacity = 0.6; document.getElementById('p1-panel').style.transform = "scale(1)";
                    document.getElementById('p2-panel').style.opacity = 1; document.getElementById('p2-panel').style.transform = "scale(1.05)";
                }
                const isHuman = !this.players[this.turn].isAI;
                document.getElementById('btnRoll').disabled = (this.state !== 'ROLL' || !isHuman);
                document.getElementById('btnBuy').disabled = (this.state !== 'ACTION' || !isHuman || !this.canBuy());
                document.getElementById('btnPass').disabled = (this.state !== 'ACTION' && this.state !== 'END') || !isHuman;
                if (this.canBuy()) {
                    const price = SPACES[this.players[this.turn].pos].price;
                    document.getElementById('buyPrice').innerText = `$${price}`;
                    document.getElementById('buyPrice').parentElement.style.opacity = 1;
                } else { document.getElementById('buyPrice').parentElement.style.opacity = 0.5; }

                // --- FIX 3: Visual Feedback for Reset Button ---
                document.getElementById('resetBtn').disabled = (this.state === 'MOVE' || this.engine.isMoving);
            }
            resetView() {
                if (this.engine.isMoving) return; // Prevent reset during move
                gsap.to(this.engine.controls.object.position, { x: 0, y: 55, z: 60, duration: 1.5 });
                gsap.to(this.engine.controls.target, { x: 0, y: 0, z: 0, duration: 1.5 });
                this.engine.focusedMesh = null;
            }
            startTurn() {
                this.state = "ROLL"; this.updateUI();
                const p = this.players[this.turn];
                this.engine.setFocus(this.engine.playersMeshes[p.id], true); // FIX: Reset camera to default locked behavior
                if(p.isAI) { setTimeout(() => this.rollDice(), 1500); }
            }
            checkBankruptcy() {
                const p = this.players[this.turn];
                if (p.money < 0) {
                    this.showEvent("BANKRUPT!", `${p.name} is broke! Game Over.`);
                    this.engine.spawnFireworks();
                    this.state = "GAME_OVER";
                }
            }
            rollDice() {
                if(this.state !== 'ROLL') return;
                const p = this.players[this.turn];
                const d1 = Math.floor(Math.random() * 6) + 1; const d2 = Math.floor(Math.random() * 6) + 1; const total = d1 + d2;
                
                const dd = document.getElementById('diceDisplay'); dd.style.opacity = 1;
                document.getElementById('die1').innerText = d1; document.getElementById('die2').innerText = d2;
                document.getElementById('diceTotal').innerText = `TOTAL: ${total}`;
                gsap.from(".die", { y: -50, rotation: 720, duration: 0.8, ease: "bounce.out", stagger: 0.1 });

                setTimeout(() => { 
                    dd.style.opacity = 0; 
                    
                    if (p.inJail) {
                        if (d1 === d2) {
                            p.inJail = false; p.jailTurns = 0;
                            this.showEvent("DOUBLES!", "You escaped Jail.");
                            this.movePlayer(total);
                        } else {
                            p.jailTurns++;
                            if (p.jailTurns >= 3) {
                                p.money -= 50; p.inJail = false; p.jailTurns = 0;
                                this.engine.updateCashVisuals(p.id, p.money);
                                this.showEvent("PAID BAIL", "Paid $50 to leave Jail.");
                                this.movePlayer(total);
                            } else {
                                this.showEvent("STUCK", "Still in Jail.");
                                this.state = "END";
                                this.updateUI(); // FIX: Update UI to enable End Turn button
                                if(p.isAI) setTimeout(() => this.endTurn(), 1000);
                            }
                        }
                    } else {
                        if (d1 === d2) this.doublesCount++; else this.doublesCount = 0;
                        if (this.doublesCount >= 3) {
                            this.sendToJail(p);
                        } else {
                            this.movePlayer(total); 
                        }
                    }
                }, 2000);
            }
            sendToJail(p) {
                this.showEvent("ARRESTED", "Speeding! Go to Jail.");
                p.pos = 10; p.inJail = true; this.doublesCount = 0;
                const jailPos = this.engine.getPawnPos(10, p.id);
                this.engine.playersMeshes[p.id].position.set(jailPos.x, 0.3, jailPos.z);
                this.state = "END"; if(p.isAI) setTimeout(() => this.endTurn(), 2000);
            }
            movePlayer(steps) {
                this.state = "MOVE"; this.updateUI(); // Ensure buttons update
                const p = this.players[this.turn]; const oldPos = p.pos; const newPos = (p.pos + steps) % 40;
                if (newPos < oldPos) { p.money += 200; this.engine.updateCashVisuals(p.id, p.money); this.showEvent("PASSED GO", "Salary Collected: $200"); }
                p.pos = newPos; this.engine.movePiece(p.id, oldPos, newPos, () => { this.handleLanding(); });
            }
            handleLanding() {
                const p = this.players[this.turn]; const space = SPACES[p.pos];
                
                if (space.type === 'chance' || space.type === 'chest') {
                    const deck = (space.type === 'chance') ? CHANCE_CARDS : CHEST_CARDS;
                    const card = deck[Math.floor(Math.random() * deck.length)];
                    this.showEvent(space.type.toUpperCase(), card.text);
                    if (card.action) card.action(p, this);
                    this.engine.updateCashVisuals(p.id, p.money);
                    // If card moved player, handle new landing? Simplified: just end turn usually or check pos
                    if (p.pos !== SPACES.indexOf(space)) { // Moved
                         const newPos = p.pos;
                         // Animate move to new pos? For simplicity, jump or re-run move logic?
                         // Let's just update visual pos immediately for "teleport" cards
                         const target = this.engine.getPawnPos(newPos, p.id);
                         this.engine.playersMeshes[p.id].position.set(target.x, 0.3, target.z);
                    }
                    this.state = "END"; if(p.isAI) setTimeout(() => this.endTurn(), 2500);
                }
                else if (space.type === 'property' || space.type === 'station' || space.type === 'utility') {
                    const owner = this.getOwner(p.pos);
                    if (owner === null) { this.state = "ACTION"; if(p.isAI) this.aiAction(); } 
                    else if (owner !== p.id) { this.payRent(p, owner, space); this.state = "END"; if(p.isAI) setTimeout(() => this.endTurn(), 2500); } 
                    else { this.state = "END"; if(p.isAI) setTimeout(() => this.endTurn(), 1000); }
                } else if (space.type === 'tax') {
                    p.money -= space.price; this.engine.updateCashVisuals(p.id, p.money);
                    this.showEvent("TAX", `Paid $${space.price} to the city.`); this.state = "END"; if(p.isAI) setTimeout(() => this.endTurn(), 2000);
                } else if (space.type === 'gotojail') {
                    this.sendToJail(p);
                } else { this.state = "END"; if(p.isAI) setTimeout(() => this.endTurn(), 1000); }
                
                this.checkBankruptcy();
                this.updateUI();
            }
            getOwner(posIndex) { for (let p of this.players) { if (p.props.find(prop => prop.index === posIndex)) return p.id; } return null; }
            canBuy() { const p = this.players[this.turn]; const space = SPACES[p.pos]; return (this.state === 'ACTION' && this.getOwner(p.pos) === null && p.money >= space.price); }
            buyProperty() {
                if (!this.canBuy()) return;
                const p = this.players[this.turn]; const space = SPACES[p.pos];
                p.money -= space.price; this.engine.updateCashVisuals(p.id, p.money); p.props.push({ ...space, index: p.pos });
                SPACES[p.pos].owner = p.id; // Mark for tooltip
                const building = this.engine.tiles[p.pos].building;
                if(building) { building.children.forEach(c => { if(c.material && c.material.emissive) c.material.emissive.setHex(p.id === 0 ? 0xFF4757 : 0x1E90FF); }); gsap.to(building.scale, {y: 1.2, duration: 0.2, yoyo: true, repeat: 1}); }
                
                // Check Monopoly
                if (space.group !== 'NONE' && space.group !== 'UTILITY' && space.group !== 'STATION') {
                    const ownedInGroup = p.props.filter(prop => prop.group === space.group).length;
                    if (ownedInGroup === GROUP_SIZES[space.group]) {
                        this.showEvent("MONOPOLY!", `${space.group} completed! Rents doubled.`);
                        // Visual effect on buildings?
                        p.props.filter(prop => prop.group === space.group).forEach(prop => {
                             const b = this.engine.tiles[prop.index].building;
                             if(b) gsap.to(b.scale, {x:1.1, z:1.1, duration: 0.5, yoyo:true, repeat:1});
                        });
                    }
                }

                this.updateUI(); this.state = "END"; if (p.isAI) setTimeout(() => this.endTurn(), 1000);
            }
            payRent(payer, ownerId, space) {
                let rent = space.rent; payer.money -= rent; this.players[ownerId].money += rent;
                this.engine.updateCashVisuals(payer.id, payer.money); this.engine.updateCashVisuals(ownerId, this.players[ownerId].money);
                this.showEvent("RENT DUE", `${payer.name} paid $${rent} to ${this.players[ownerId].name}`); this.updateUI();
                this.checkBankruptcy();
            }
            aiAction() {
                const p = this.players[this.turn]; const space = SPACES[p.pos];
                setTimeout(() => { if (this.canBuy() && p.money > space.price + 100) { this.buyProperty(); } else { this.endTurn(); } }, 1500);
            }
            endTurn() { this.turn = (this.turn + 1) % this.players.length; this.startTurn(); }
            showEvent(title, desc) {
                const modal = document.getElementById('eventModal'); document.getElementById('eventTitle').innerText = title; document.getElementById('eventDesc').innerText = desc;
                gsap.to(modal, { scale: 1, duration: 0.4, ease: "back.out(1.5)" });
                if(this.players[this.turn].isAI || title === "RENT DUE") { setTimeout(() => this.closeEventModal(), 2500); }
            }
            closeEventModal() { gsap.to(document.getElementById('eventModal'), { scale: 0, duration: 0.3, ease: "back.in" }); }
        }

        // --- INIT ---
        let gameInstance;
        const globalEngine = new Engine();
        globalEngine.animateIntro().then(() => {
            document.getElementById('loader').style.opacity = 0;
            setTimeout(() => document.getElementById('loader').style.display = 'none', 500);
            document.getElementById('start-screen').style.visibility = 'visible';
            gsap.to("#title3d", { opacity: 1, y: 0, duration: 1, ease: "power3.out" });
            gsap.to("#subtitle", { opacity: 1, duration: 1, delay: 0.5 });
            gsap.to("#startBtn", { opacity: 1, y: 0, duration: 1, delay: 0.8, ease: "elastic.out(1, 0.5)" });
        });
        function startGame() { if(gameInstance) return; gameInstance = new Game(globalEngine, selectedVehicleType); gameInstance.start(); }
        function closeEventModal() { if(gameInstance) gameInstance.closeEventModal(); }

    </script>
</body>
</html>