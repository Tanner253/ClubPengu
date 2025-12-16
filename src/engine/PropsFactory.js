import { VOXEL_SIZE, PALETTE } from '../constants';

/**
 * PropsFactory - TRIMMED VERSION
 * Only contains methods still in use: createParkourPlatform, createDojoParkourCourse, createNightclub
 * All other props (including Bench) have been extracted to src/props/ modules
 */
class PropsFactory {
    // Extended color palette for props
    static COLORS = {
        // Snow variations
        snowBright: '#FFFFFF',
        snowLight: '#F0F8FF',
        snowMedium: '#E8F0F8',
        snowDark: '#C8D8E8',
        snowShadow: '#A8C0D8',
        iceBright: '#D8F0FF',
        iceBlue: '#B8D8F0',
        
        // Wood
        barkDark: '#3A2010',
        barkMedium: '#4A3020',
        barkLight: '#5A4030',
        plankLight: '#8B7355',
        plankMedium: '#7B6345',
        plankDark: '#6B5335',
        
        // Foliage (pine trees)
        pineDeep: '#0A3A1A',
        pineDark: '#1A4A2A',
        pineMedium: '#2A5A3A',
        pineLight: '#3A6A4A',
        
        // Rock
        rockDark: '#3A4A4A',
        rockMedium: '#5A6A6A',
        rockLight: '#7A8A8A',
        
        // Metal
        metalDark: '#2A3A4A',
        metalMedium: '#4A5A6A',
        metalLight: '#6A7A8A',
        
        // Warm lights
        lampGlow: '#FFE4B5',
        lampBright: '#FFF8DC',
        windowWarm: '#FFD070',
        
        // Ice/Glass
        iceTranslucent: '#D0E8F8',
        iglooWhite: '#F8FCFF',
        iglooShadow: '#D8E8F0',
    };

    constructor(THREE) {
        this.THREE = THREE;
        this.materialCache = new Map();
        this.geometryCache = new Map();
    }

    // ==================== MATERIAL CACHING ====================
    
    getMaterial(color, options = {}) {
        const key = `${color}_${JSON.stringify(options)}`;
        if (!this.materialCache.has(key)) {
            // Build material config without undefined values
            const matConfig = {
                color: new this.THREE.Color(color),
                roughness: options.roughness ?? 0.8,
                metalness: options.metalness ?? 0,
                transparent: options.transparent ?? false,
                opacity: options.opacity ?? 1,
                side: options.doubleSided ? this.THREE.DoubleSide : this.THREE.FrontSide,
            };
            
            // Only add emissive properties if emissive color is provided
            if (options.emissive) {
                matConfig.emissive = new this.THREE.Color(options.emissive);
                matConfig.emissiveIntensity = options.emissiveIntensity ?? 0.5;
            }
            
            const mat = new this.THREE.MeshStandardMaterial(matConfig);
            this.materialCache.set(key, mat);
        }
        return this.materialCache.get(key);
    }

    // ==================== PARKOUR PLATFORM ====================
    
    /**
     * Create a floating platform for parkour courses
     * @param {Object} config - Platform configuration
     * @returns {THREE.Group}
     */
    createParkourPlatform({ width = 3, depth = 3, height = 0.4, color = 0x4A90D9, glowing = false } = {}) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'parkour_platform';

        // Main platform
        const platMat = this.getMaterial(color, { 
            roughness: 0.6,
            metalness: glowing ? 0.3 : 0.1,
            emissive: glowing ? color : 0x000000,
            emissiveIntensity: glowing ? 0.2 : 0
        });
        const platGeo = new THREE.BoxGeometry(width, height, depth);
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.y = height / 2;
        platform.castShadow = true;
        platform.receiveShadow = true;
        group.add(platform);

        // Edge trim
        const trimMat = this.getMaterial(0x333333, { roughness: 0.8 });
        const trimHeight = 0.1;
        
        // Front and back trim
        [-1, 1].forEach(side => {
            const trimGeo = new THREE.BoxGeometry(width + 0.1, trimHeight, 0.15);
            const trim = new THREE.Mesh(trimGeo, trimMat);
            trim.position.set(0, height + trimHeight / 2, side * (depth / 2));
            group.add(trim);
        });
        
        // Left and right trim
        [-1, 1].forEach(side => {
            const trimGeo = new THREE.BoxGeometry(0.15, trimHeight, depth + 0.1);
            const trim = new THREE.Mesh(trimGeo, trimMat);
            trim.position.set(side * (width / 2), height + trimHeight / 2, 0);
            group.add(trim);
        });

        // Store collision data
        group.userData.collision = {
            type: 'box',
            size: { x: width, y: height, z: depth },
            height: height
        };

        return group;
    }

    // ==================== DOJO PARKOUR COURSE ====================
    
    /**
     * Create a complete parkour obstacle course leading to dojo roof
     * Course goes AROUND the side of the dojo, not through it
     * @param {Object} config - Course configuration
     * @param {boolean} config.mirrored - If true, course goes on LEFT side instead of right (180 degree rotation)
     * @returns {{ mesh: THREE.Group, platforms: Array, colliders: Array }}
     */
    createDojoParkourCourse({ dojoX = 0, dojoZ = -25, dojoWidth = 14, dojoHeight = 8, dojoDepth = 14, mirrored = false } = {}) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'dojo_parkour_course';

        const platforms = [];
        const colliders = [];
        
        // Roof target height
        const roofHeight = dojoHeight + 2;
        
        // Dojo boundaries (to avoid clipping)
        const dojoLeft = dojoX - dojoWidth / 2 - 2;
        const dojoRight = dojoX + dojoWidth / 2 + 2;
        const dojoFront = mirrored ? (dojoZ - dojoDepth / 2 - 2) : (dojoZ + dojoDepth / 2 + 2);
        const dojoBack = mirrored ? (dojoZ + dojoDepth / 2 + 2) : (dojoZ - dojoDepth / 2 - 2);
        
        // Mirror helper - flips X around dojo center
        const mx = (x) => mirrored ? (2 * dojoX - x) : x;
        
        // Platform colors
        const colors = [0x4A90D9, 0x5A9AD9, 0x3A80C9, 0x6AAAE9, 0x4A85C5];
        
        // First roof (tier 0) is at h + 1.2 = ~9.2
        const firstRoofY = dojoHeight + 1.2;
        
        const courseLayout = [
            // START: Ground level platform to the right-front of dojo
            { x: mx(dojoRight + 5), y: 0.3, z: dojoFront + (mirrored ? -4 : 4), w: 4, d: 4, type: 'start' },
            
            // Jump 1-2: Rising along right side (OUTSIDE dojo)
            { x: mx(dojoRight + 6), y: 1.5, z: dojoZ + (mirrored ? 2 : -2), w: 3, d: 3 },
            { x: mx(dojoRight + 5), y: 2.8, z: dojoBack + (mirrored ? -2 : 2), w: 3, d: 3 },
            
            // Jump 3-4: Corner turn to behind dojo (stay far back)
            { x: mx(dojoRight + 2), y: 4.0, z: dojoBack + (mirrored ? 4 : -4), w: 3, d: 3 },
            { x: mx(dojoX + 2), y: 5.2, z: dojoBack + (mirrored ? 6 : -6), w: 3, d: 3 },
            
            // Jump 5-6: Across the back of dojo (far behind)
            { x: mx(dojoX - 2), y: 6.4, z: dojoBack + (mirrored ? 5 : -5), w: 3, d: 3 },
            { x: mx(dojoLeft - 2), y: 7.6, z: dojoBack + (mirrored ? 3 : -3), w: 3, d: 3 },
            
            // Jump 7-8: Final approach - up the left side to roof level
            { x: mx(dojoLeft - 4), y: 8.5, z: dojoZ, w: 3, d: 3 },
            
            // END: Landing pad on dojo first roof (centered, snug on tier 0)
            { x: dojoX, y: firstRoofY + 0.5, z: dojoZ, w: 7, d: 7, type: 'end', color: 0xFFD700 },
        ];

        // Create each platform
        courseLayout.forEach((plat, idx) => {
            const color = plat.color || colors[idx % colors.length];
            const isSpecial = plat.type === 'start' || plat.type === 'end';
            const platformHeight = isSpecial ? 0.5 : 0.4;
            
            const platform = this.createParkourPlatform({
                width: plat.w,
                depth: plat.d,
                height: platformHeight,
                color: color,
                glowing: isSpecial
            });
            
            platform.position.set(plat.x, plat.y, plat.z);
            group.add(platform);
            
            platforms.push({
                mesh: platform,
                x: plat.x,
                y: plat.y,
                z: plat.z,
                width: plat.w,
                depth: plat.d,
                height: platformHeight
            });
            
            // Store collider info
            colliders.push({
                x: plat.x,
                y: plat.y,
                z: plat.z,
                type: 'box',
                size: { x: plat.w, y: platformHeight, z: plat.d },
                height: platformHeight
            });

            // Platform number painted on surface (subtle)
            if (idx > 0 && idx < courseLayout.length - 1) {
                const numMat = this.getMaterial(0x2A5A8A, { roughness: 0.7 });
                const numGeo = new THREE.RingGeometry(0.15, 0.25, 16);
                const num = new THREE.Mesh(numGeo, numMat);
                num.rotation.x = -Math.PI / 2;
                num.position.set(plat.x, plat.y + platformHeight + 0.01, plat.z);
                group.add(num);
            }
        });

        // Starting sign - "SECRET HANGOUT" with canvas text
        const signGroup = new THREE.Group();
        
        // Post
        const postMat = this.getMaterial(0x5C4033, { roughness: 0.8 });
        const postGeo = new THREE.CylinderGeometry(0.2, 0.25, 3.5, 8);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.y = 1.75;
        post.castShadow = true;
        signGroup.add(post);
        
        // Sign board frame
        const frameMat = this.getMaterial(0x654321, { roughness: 0.7 });
        const frameGeo = new THREE.BoxGeometry(4, 1.8, 0.25);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.y = 3.8;
        frame.castShadow = true;
        signGroup.add(frame);
        
        // Sign face with text texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#F5DEB3';
        ctx.fillRect(0, 0, 512, 200);
        
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, 492, 180);
        
        ctx.fillStyle = '#2F1810';
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏔️ SECRET SPOT 🏔️', 256, 70);
        
        ctx.font = '28px Arial';
        ctx.fillStyle = '#4A3020';
        ctx.fillText('Parkour to the roof!', 256, 120);
        
        ctx.font = '24px Arial';
        ctx.fillStyle = '#228B22';
        ctx.fillText('⬆️ Jump your way up! ⬆️', 256, 160);
        
        const texture = new THREE.CanvasTexture(canvas);
        const signMat = new THREE.MeshStandardMaterial({ 
            map: texture,
            roughness: 0.5
        });
        const signGeo = new THREE.BoxGeometry(3.6, 1.4, 0.1);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.y = 3.8;
        sign.position.z = 0.18;
        signGroup.add(sign);
        
        // Arrow on top pointing up
        const arrowMat = this.getMaterial(0x228B22, { 
            roughness: 0.5,
            emissive: 0x228B22,
            emissiveIntensity: 0.2
        });
        const arrowGeo = new THREE.ConeGeometry(0.4, 0.8, 4);
        const signArrow = new THREE.Mesh(arrowGeo, arrowMat);
        signArrow.position.set(0, 4.9, 0);
        signGroup.add(signArrow);
        
        const start = courseLayout[0];
        const signOffsetX = mirrored ? -4 : 4;
        signGroup.position.set(start.x + signOffsetX, 0, start.z);
        if (mirrored) {
            signGroup.rotation.y = Math.PI;
        }
        group.add(signGroup);

        // The END platform is at firstRoofY + 0.5, with height 0.5 (special platform)
        const firstRoofYCalc = dojoHeight + 1.2;
        const platformSurface = firstRoofYCalc + 1.0;

        // End marker - golden arch on the landing platform (TIER 1 VIP)
        const archMat = this.getMaterial(0xFFD700, { 
            metalness: 0.8, 
            roughness: 0.2,
            emissive: 0xFFD700,
            emissiveIntensity: 0.4
        });
        const archGeo = new THREE.TorusGeometry(2, 0.2, 8, 16, Math.PI);
        const arch = new THREE.Mesh(archGeo, archMat);
        arch.position.set(dojoX, platformSurface + 2.2, dojoZ - 2.5);
        arch.rotation.x = 0;
        group.add(arch);
        
        // Arch pillars
        const pillarMat = this.getMaterial(0xDAA520, { metalness: 0.6, roughness: 0.3 });
        [-2, 2].forEach(side => {
            const pillarGeo = new THREE.CylinderGeometry(0.15, 0.18, 2.2, 8);
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(dojoX + side, platformSurface + 1.1, dojoZ - 2.5);
            group.add(pillar);
        });

        // Bench POSITIONS for tier 1 - TownCenter will spawn actual Bench props
        // This ensures all benches use the same unified Bench class with built-in interactions
        const benchPositions = [
            { x: dojoX - 2, y: platformSurface, z: dojoZ + 1, rotation: Math.PI / 2, tier: 1 },
            { x: dojoX + 2, y: platformSurface, z: dojoZ + 1, rotation: -Math.PI / 2, tier: 1 },
        ];

        // ==================== PHASE 2: TIER 1 TO TIER 3 PARKOUR ====================
        const thirdRoofY = dojoHeight + 1.2 + 11;
        const phase2Colors = [0xE040FB, 0xAB47BC, 0x7B1FA2, 0x9C27B0, 0xBA68C8];
        
        const phase2Layout = [
            { x: mx(dojoX + 13), y: platformSurface - 0.8, z: dojoZ, w: 3.0, d: 3.0, type: 'phase2_start', color: 0x9C27B0 },
            { x: mx(dojoRight + 5), y: platformSurface + 0.5, z: dojoZ + (mirrored ? 3 : -3), w: 2.0, d: 2.0 },
            { x: mx(dojoRight + 4), y: platformSurface + 1.5, z: dojoZ + (mirrored ? 8 : -8), w: 2.0, d: 2.0 },
            { x: mx(dojoRight + 2), y: platformSurface + 2.8, z: dojoBack + (mirrored ? -2 : 2), w: 1.8, d: 1.8 },
            { x: mx(dojoX + 3), y: platformSurface + 3.8, z: dojoBack + (mirrored ? 3 : -3), w: 2.0, d: 2.0 },
            { x: dojoX, y: platformSurface + 4.5, z: dojoBack + (mirrored ? 2 : -2), w: 2.0, d: 2.0 },
            { x: mx(dojoX - 5), y: platformSurface + 4.0, z: dojoBack + (mirrored ? 4 : -4), w: 2.0, d: 2.0 },
            { x: mx(dojoLeft - 1), y: platformSurface + 5.8, z: dojoBack + (mirrored ? 1 : -1), w: 1.8, d: 1.8 },
            { x: mx(dojoLeft - 4), y: platformSurface + 7.2, z: dojoBack + (mirrored ? -4 : 4), w: 2.0, d: 2.0 },
            { x: mx(dojoLeft - 5), y: platformSurface + 8.5, z: dojoZ + (mirrored ? 3 : -3), w: 1.8, d: 1.8 },
            { x: mx(dojoLeft - 3), y: platformSurface + 9.5, z: dojoZ + (mirrored ? -2 : 2), w: 1.8, d: 1.8 },
            { x: mx(dojoLeft), y: platformSurface + 10.2, z: dojoZ + (mirrored ? -5 : 5), w: 2.0, d: 2.0 },
            { x: dojoX, y: thirdRoofY + 0.5, z: dojoZ, w: 5, d: 5, type: 'phase2_end', color: 0xFFD700 },
        ];
        
        phase2Layout.forEach((plat, idx) => {
            const color = plat.color || phase2Colors[idx % phase2Colors.length];
            const isSpecial = plat.type === 'phase2_start' || plat.type === 'phase2_end';
            const platformHeight = isSpecial ? 0.5 : 0.35;
            
            const platform = this.createParkourPlatform({
                width: plat.w,
                depth: plat.d,
                height: platformHeight,
                color: color,
                glowing: isSpecial
            });
            
            platform.position.set(plat.x, plat.y, plat.z);
            group.add(platform);
            
            platforms.push({
                mesh: platform,
                x: plat.x,
                y: plat.y,
                z: plat.z,
                width: plat.w,
                depth: plat.d,
                height: platformHeight,
                phase: 2
            });
            
            colliders.push({
                x: plat.x,
                y: plat.y,
                z: plat.z,
                type: 'box',
                size: { x: plat.w, y: platformHeight, z: plat.d },
                height: platformHeight
            });

            if (idx > 0 && idx < phase2Layout.length - 1) {
                const numMat = this.getMaterial(0x6A1B9A, { roughness: 0.7 });
                const numGeo = new THREE.RingGeometry(0.12, 0.2, 16);
                const num = new THREE.Mesh(numGeo, numMat);
                num.rotation.x = -Math.PI / 2;
                num.position.set(plat.x, plat.y + platformHeight + 0.01, plat.z);
                group.add(num);
            }
        });
        
        // Phase 2 sign on tier 1 platform
        const sign2Group = new THREE.Group();
        
        const post2Mat = this.getMaterial(0x4A148C, { roughness: 0.8 });
        const post2Geo = new THREE.CylinderGeometry(0.15, 0.2, 2.5, 8);
        const post2 = new THREE.Mesh(post2Geo, post2Mat);
        post2.position.y = 1.25;
        post2.castShadow = true;
        sign2Group.add(post2);
        
        const frame2Mat = this.getMaterial(0x7B1FA2, { roughness: 0.7 });
        const frame2Geo = new THREE.BoxGeometry(3.5, 1.5, 0.2);
        const frame2 = new THREE.Mesh(frame2Geo, frame2Mat);
        frame2.position.y = 2.8;
        frame2.castShadow = true;
        sign2Group.add(frame2);
        
        const canvas2 = document.createElement('canvas');
        canvas2.width = 512;
        canvas2.height = 200;
        const ctx2 = canvas2.getContext('2d');
        
        ctx2.fillStyle = '#1A0033';
        ctx2.fillRect(0, 0, 512, 200);
        
        ctx2.strokeStyle = '#FFD700';
        ctx2.lineWidth = 6;
        ctx2.strokeRect(8, 8, 496, 184);
        
        ctx2.fillStyle = '#FFD700';
        ctx2.font = 'bold 38px Arial';
        ctx2.textAlign = 'center';
        ctx2.fillText('⭐ MASTER\'S SUMMIT ⭐', 256, 65);
        
        ctx2.font = '26px Arial';
        ctx2.fillStyle = '#E1BEE7';
        ctx2.fillText('Ultimate VIP Zone', 256, 110);
        
        ctx2.font = '22px Arial';
        ctx2.fillStyle = '#CE93D8';
        ctx2.fillText('🔥 For True Ninjas Only 🔥', 256, 155);
        
        const texture2 = new THREE.CanvasTexture(canvas2);
        const sign2Mat = new THREE.MeshStandardMaterial({ 
            map: texture2,
            roughness: 0.4
        });
        const sign2Geo = new THREE.BoxGeometry(3.2, 1.2, 0.08);
        const sign2 = new THREE.Mesh(sign2Geo, sign2Mat);
        sign2.position.y = 2.8;
        sign2.position.z = 0.12;
        sign2Group.add(sign2);
        
        const arrow2Mat = this.getMaterial(0x9C27B0, { 
            roughness: 0.4,
            emissive: 0x9C27B0,
            emissiveIntensity: 0.5
        });
        const arrow2Geo = new THREE.ConeGeometry(0.35, 0.7, 4);
        const signArrow2 = new THREE.Mesh(arrow2Geo, arrow2Mat);
        signArrow2.position.set(0, 3.7, 0);
        sign2Group.add(signArrow2);
        
        const sign2X = mx(dojoX + 12);
        sign2Group.position.set(sign2X, platformSurface - 0.5, dojoZ + 1);
        sign2Group.rotation.y = mirrored ? Math.PI : 0;
        group.add(sign2Group);
        
        // ==================== TIER 3 ULTIMATE VIP HANGOUT ====================
        const tier3Surface = thirdRoofY + 1.0;
        
        // Diamond arch for tier 3
        const diamondMat = this.getMaterial(0x00FFFF, { 
            metalness: 0.9, 
            roughness: 0.1,
            emissive: 0x00FFFF,
            emissiveIntensity: 0.6
        });
        const arch3Geo = new THREE.TorusGeometry(1.8, 0.25, 8, 16, Math.PI);
        const arch3 = new THREE.Mesh(arch3Geo, diamondMat);
        arch3.position.set(dojoX, tier3Surface + 2.0, dojoZ - 2);
        group.add(arch3);
        
        // Diamond pillars
        [-1.8, 1.8].forEach(side => {
            const pillar3Geo = new THREE.CylinderGeometry(0.18, 0.22, 2.0, 6);
            const pillar3 = new THREE.Mesh(pillar3Geo, diamondMat);
            pillar3.position.set(dojoX + side, tier3Surface + 1.0, dojoZ - 2);
            group.add(pillar3);
        });
        
        // Tier 3 bench POSITIONS - TownCenter will spawn actual Bench props
        const tier3BenchPositions = [
            { x: dojoX - 1.8, y: tier3Surface, z: dojoZ + 1.2, rotation: Math.PI / 2, tier: 3 },
            { x: dojoX + 1.8, y: tier3Surface, z: dojoZ + 1.2, rotation: -Math.PI / 2, tier: 3 },
            { x: dojoX - 1.8, y: tier3Surface, z: dojoZ - 0.5, rotation: Math.PI / 2, tier: 3 },
            { x: dojoX + 1.8, y: tier3Surface, z: dojoZ - 0.5, rotation: -Math.PI / 2, tier: 3 },
        ];
        
        // Combine all bench positions
        const benchSpawnPositions = [...benchPositions, ...tier3BenchPositions];
        
        // Glowing orbs around tier 3 platform
        const orbMat = this.getMaterial(0x00FFFF, { 
            emissive: 0x00FFFF, 
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.8
        });
        const orbPositions = [
            { x: dojoX - 2.5, z: dojoZ + 2 },
            { x: dojoX + 2.5, z: dojoZ + 2 },
            { x: dojoX - 2.5, z: dojoZ - 1.5 },
            { x: dojoX + 2.5, z: dojoZ - 1.5 },
        ];
        orbPositions.forEach(pos => {
            const orbGeo = new THREE.SphereGeometry(0.2, 12, 12);
            const orb = new THREE.Mesh(orbGeo, orbMat);
            orb.position.set(pos.x, tier3Surface + 1.2, pos.z);
            group.add(orb);
            
            const pedestalGeo = new THREE.CylinderGeometry(0.1, 0.15, 1.2, 6);
            const pedestalMat = this.getMaterial(0x333333, { roughness: 0.6 });
            const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
            pedestal.position.set(pos.x, tier3Surface + 0.6, pos.z);
            group.add(pedestal);
        });

        // Decorative lamp posts on tier 1 platform (emissive only, no PointLights)
        const lampMat = this.getMaterial(0x333333, { roughness: 0.7 });
        const lampGlowMat = this.getMaterial(0xFFAA55, { 
            emissive: 0xFFAA55, 
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.9
        });
        [-2.5, 2.5].forEach(side => {
            const lampPostGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.5, 6);
            const lampPost = new THREE.Mesh(lampPostGeo, lampMat);
            lampPost.position.set(dojoX + side, platformSurface + 0.75, dojoZ - 2);
            group.add(lampPost);
            
            const globeGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const globe = new THREE.Mesh(globeGeo, lampGlowMat);
            globe.position.set(dojoX + side, platformSurface + 1.6, dojoZ - 2);
            group.add(globe);
        });

        return { 
            mesh: group, 
            platforms, 
            colliders,
            benchSpawnPositions, // Positions only - TownCenter spawns actual Bench props
            roofHeight,
            platformSurface,
            tier3Surface
        };
    }

    // ==================== NIGHTCLUB ====================
    
    /**
     * Create a massive nightclub building with speakers, neon lights, disco ball,
     * searchlights, smoke effects, and all the bells and whistles!
     * @param {Object} config - { width, depth, height }
     * @returns {{ mesh: THREE.Group, speakers: Array, update: Function }}
     */
    createNightclub(config = {}) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'nightclub';
        
        const w = config.width || 25;
        const d = config.depth || 20;
        const h = config.height || 12;
        
        // Neon colors - ENHANCED palette
        const neonPink = 0xFF1493;
        const neonHotPink = 0xFF69B4;
        const neonBlue = 0x00BFFF;
        const neonCyan = 0x00FFFF;
        const neonPurple = 0x9400D3;
        const neonViolet = 0x8B00FF;
        const neonGreen = 0x39FF14;
        const neonLime = 0x00FF00;
        const neonYellow = 0xFFFF00;
        const neonOrange = 0xFF6600;
        const neonRed = 0xFF0040;
        const neonWhite = 0xFFFFFF;
        
        // ==================== MAIN BUILDING ====================
        const buildingMat = this.getMaterial(0x1a1a2e, { roughness: 0.9 });
        const buildingGeo = new THREE.BoxGeometry(w, h, d);
        const building = new THREE.Mesh(buildingGeo, buildingMat);
        building.position.y = h / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);
        
        const trimMat = this.getMaterial(0x0f0f1a, { roughness: 0.85 });
        
        // Bottom trim
        const bottomTrimGeo = new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4);
        const bottomTrim = new THREE.Mesh(bottomTrimGeo, trimMat);
        bottomTrim.position.y = 0.25;
        group.add(bottomTrim);
        
        // Top trim/parapet
        const topTrimGeo = new THREE.BoxGeometry(w + 0.4, 1, d + 0.4);
        const topTrim = new THREE.Mesh(topTrimGeo, trimMat);
        topTrim.position.y = h + 0.5;
        group.add(topTrim);
        
        // ==================== ENTRANCE ====================
        const entranceMat = this.getMaterial(0x050510, { roughness: 0.95 });
        const entranceGeo = new THREE.BoxGeometry(6, 5, 1);
        const entrance = new THREE.Mesh(entranceGeo, entranceMat);
        entrance.position.set(0, 2.5, d / 2 + 0.1);
        group.add(entrance);
        
        const frameGlowMat = this.getMaterial(neonPink, {
            emissive: neonPink,
            emissiveIntensity: 0.8,
            roughness: 0.3
        });
        
        const frameThickness = 0.3;
        const leftFrameGeo = new THREE.BoxGeometry(frameThickness, 5.5, frameThickness);
        const leftFrame = new THREE.Mesh(leftFrameGeo, frameGlowMat);
        leftFrame.position.set(-3.2, 2.75, d / 2 + 0.3);
        group.add(leftFrame);
        
        const rightFrame = leftFrame.clone();
        rightFrame.position.set(3.2, 2.75, d / 2 + 0.3);
        group.add(rightFrame);
        
        const topFrameGeo = new THREE.BoxGeometry(6.7, frameThickness, frameThickness);
        const topFrame = new THREE.Mesh(topFrameGeo, frameGlowMat);
        topFrame.position.set(0, 5.2, d / 2 + 0.3);
        group.add(topFrame);
        
        const entranceLight = new THREE.PointLight(neonPink, 2, 15);
        entranceLight.position.set(0, 3, d / 2 + 2);
        group.add(entranceLight);
        
        // ==================== HUGE NIGHTCLUB SIGN ====================
        const signBackMat = this.getMaterial(0x0a0a15, { roughness: 0.9 });
        const signBackGeo = new THREE.BoxGeometry(18, 4, 0.5);
        const signBack = new THREE.Mesh(signBackGeo, signBackMat);
        signBack.position.set(0, h + 3, d / 2 - 2);
        group.add(signBack);
        
        const letterMat = this.getMaterial(neonBlue, {
            emissive: neonBlue,
            emissiveIntensity: 1.0,
            roughness: 0.2,
            metalness: 0.3
        });
        
        const letters = 'NIGHTCLUB';
        const letterWidth = 1.5;
        const letterHeight = 2.5;
        const letterDepth = 0.4;
        const letterSpacing = 1.7;
        const startX = -((letters.length - 1) * letterSpacing) / 2;
        
        for (let i = 0; i < letters.length; i++) {
            const letterGeo = new THREE.BoxGeometry(letterWidth, letterHeight, letterDepth);
            const letter = new THREE.Mesh(letterGeo, letterMat);
            letter.position.set(startX + i * letterSpacing, h + 3, d / 2 - 1.5);
            letter.userData.isNeonLetter = true;
            letter.userData.letterIndex = i;
            group.add(letter);
            
            if (i % 3 === 0) {
                const notchGeo = new THREE.BoxGeometry(0.3, 0.8, letterDepth + 0.1);
                const notchMat = this.getMaterial(0x0a0a15, { roughness: 0.9 });
                const notch = new THREE.Mesh(notchGeo, notchMat);
                notch.position.set(startX + i * letterSpacing, h + 2.5, d / 2 - 1.5);
                group.add(notch);
            }
        }
        
        const signLight = new THREE.PointLight(neonBlue, 3, 25);
        signLight.position.set(0, h + 3, d / 2 + 2);
        group.add(signLight);
        
        // ==================== HUGE SPEAKERS ====================
        const speakers = [];
        
        const createSpeaker = (x, z, scale = 1, rotation = 0) => {
            const speakerGroup = new THREE.Group();
            
            const sw = 4 * scale;
            const sh = 6 * scale;
            const sd = 3 * scale;
            
            const cabinetMat = this.getMaterial(0x1a1a1a, { roughness: 0.7 });
            const cabinetGeo = new THREE.BoxGeometry(sw, sh, sd);
            const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat);
            cabinet.position.y = sh / 2;
            cabinet.castShadow = true;
            speakerGroup.add(cabinet);
            
            const grilleMat = this.getMaterial(0x2a2a2a, { 
                roughness: 0.5,
                metalness: 0.3
            });
            const grilleGeo = new THREE.BoxGeometry(sw - 0.3, sh - 0.3, 0.15);
            const grille = new THREE.Mesh(grilleGeo, grilleMat);
            grille.position.set(0, sh / 2, sd / 2 + 0.1);
            speakerGroup.add(grille);
            
            const wooferMat = this.getMaterial(0x333333, { roughness: 0.4, metalness: 0.2 });
            const wooferGeo = new THREE.CylinderGeometry(sw * 0.35, sw * 0.4, 0.5 * scale, 24);
            const woofer = new THREE.Mesh(wooferGeo, wooferMat);
            woofer.rotation.x = Math.PI / 2;
            woofer.position.set(0, sh * 0.35, sd / 2 + 0.3);
            woofer.userData.isWoofer = true;
            woofer.userData.baseZ = sd / 2 + 0.3;
            speakerGroup.add(woofer);
            
            const coneMat = this.getMaterial(0x444444, { roughness: 0.3, metalness: 0.4 });
            const coneGeo = new THREE.CylinderGeometry(sw * 0.08, sw * 0.25, 0.4 * scale, 16);
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.rotation.x = Math.PI / 2;
            cone.position.set(0, sh * 0.35, sd / 2 + 0.5);
            cone.userData.isWoofer = true;
            cone.userData.baseZ = sd / 2 + 0.5;
            speakerGroup.add(cone);
            
            const dustCapMat = this.getMaterial(0x222222, { roughness: 0.2 });
            const dustCapGeo = new THREE.SphereGeometry(sw * 0.06, 12, 12);
            const dustCap = new THREE.Mesh(dustCapGeo, dustCapMat);
            dustCap.scale.z = 0.3;
            dustCap.position.set(0, sh * 0.35, sd / 2 + 0.65);
            dustCap.userData.isWoofer = true;
            dustCap.userData.baseZ = sd / 2 + 0.65;
            speakerGroup.add(dustCap);
            
            const midGeo = new THREE.CylinderGeometry(sw * 0.15, sw * 0.18, 0.3 * scale, 16);
            const mid = new THREE.Mesh(midGeo, wooferMat);
            mid.rotation.x = Math.PI / 2;
            mid.position.set(0, sh * 0.65, sd / 2 + 0.25);
            mid.userData.isWoofer = true;
            mid.userData.baseZ = sd / 2 + 0.25;
            speakerGroup.add(mid);
            
            const tweeterMat = this.getMaterial(0x666666, { roughness: 0.2, metalness: 0.6 });
            const tweeterGeo = new THREE.SphereGeometry(sw * 0.08, 12, 12);
            const tweeter = new THREE.Mesh(tweeterGeo, tweeterMat);
            tweeter.scale.z = 0.5;
            tweeter.position.set(0, sh * 0.82, sd / 2 + 0.2);
            speakerGroup.add(tweeter);
            
            const ledMat = this.getMaterial(neonPurple, {
                emissive: neonPurple,
                emissiveIntensity: 0.8
            });
            const ledGeo = new THREE.BoxGeometry(sw - 0.1, 0.15, 0.1);
            const ledTop = new THREE.Mesh(ledGeo, ledMat);
            ledTop.position.set(0, sh - 0.2, sd / 2 + 0.2);
            ledTop.userData.isLED = true;
            speakerGroup.add(ledTop);
            
            const ledBottom = ledTop.clone();
            ledBottom.position.set(0, 0.2, sd / 2 + 0.2);
            ledBottom.userData.isLED = true;
            speakerGroup.add(ledBottom);
            
            speakerGroup.position.set(x, 0, z);
            speakerGroup.rotation.y = rotation;
            
            return speakerGroup;
        };
        
        const speaker1 = createSpeaker(-w / 2 - 3, d / 2 - 5, 1.5, Math.PI * 0.1);
        speakers.push(speaker1);
        group.add(speaker1);
        
        const speaker2 = createSpeaker(-w / 2 - 1.5, d / 2 + 3, 1.2, Math.PI * 0.3);
        speakers.push(speaker2);
        group.add(speaker2);
        
        const speaker3 = createSpeaker(w / 2 + 3, d / 2 - 5, 1.5, -Math.PI * 0.1);
        speakers.push(speaker3);
        group.add(speaker3);
        
        const speaker4 = createSpeaker(w / 2 + 1.5, d / 2 + 3, 1.2, -Math.PI * 0.3);
        speakers.push(speaker4);
        group.add(speaker4);
        
        // ==================== NEON ACCENT LIGHTS ====================
        const createNeonStrip = (y, color, width = w + 1) => {
            const stripMat = this.getMaterial(color, {
                emissive: color,
                emissiveIntensity: 0.9,
                roughness: 0.2
            });
            const stripGeo = new THREE.BoxGeometry(width, 0.15, 0.15);
            const strip = new THREE.Mesh(stripGeo, stripMat);
            strip.position.set(0, y, d / 2 + 0.2);
            strip.userData.isNeonStrip = true;
            strip.userData.baseColor = color;
            return strip;
        };
        
        const strip1 = createNeonStrip(1, neonPink);
        group.add(strip1);
        
        const strip2 = createNeonStrip(h * 0.5, neonBlue);
        group.add(strip2);
        
        const strip3 = createNeonStrip(h - 1, neonPurple);
        group.add(strip3);
        
        const sideStripMat = this.getMaterial(neonGreen, {
            emissive: neonGreen,
            emissiveIntensity: 0.7
        });
        
        [-1, 1].forEach(side => {
            const sideStripGeo = new THREE.BoxGeometry(0.15, h - 2, 0.15);
            const sideStrip = new THREE.Mesh(sideStripGeo, sideStripMat);
            sideStrip.position.set(side * (w / 2 + 0.2), h / 2, d / 2 + 0.2);
            group.add(sideStrip);
        });
        
        // ==================== ROOF SPEAKERS ====================
        const roofSpeaker1 = createSpeaker(-w / 3, 0, 0.8, 0);
        roofSpeaker1.position.y = h + 1;
        speakers.push(roofSpeaker1);
        group.add(roofSpeaker1);
        
        const roofSpeaker2 = createSpeaker(w / 3, 0, 0.8, 0);
        roofSpeaker2.position.y = h + 1;
        speakers.push(roofSpeaker2);
        group.add(roofSpeaker2);
        
        // ==================== STAGE LIGHTS ====================
        const stageLightColors = [neonPink, neonBlue, neonGreen, neonYellow, neonOrange, neonPurple];
        
        for (let i = 0; i < 8; i++) {
            const lightColor = stageLightColors[i % stageLightColors.length];
            const lightMat = this.getMaterial(lightColor, {
                emissive: lightColor,
                emissiveIntensity: 1.0
            });
            
            const housingGeo = new THREE.CylinderGeometry(0.3, 0.5, 0.8, 8);
            const housing = new THREE.Mesh(housingGeo, this.getMaterial(0x222222, { metalness: 0.5 }));
            housing.position.set(-w / 2 + 1.5 + i * (w / 7), h + 1.3, d / 2 - 1);
            housing.rotation.x = Math.PI / 6;
            group.add(housing);
            
            const lensGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 8);
            const lens = new THREE.Mesh(lensGeo, lightMat);
            lens.position.set(-w / 2 + 1.5 + i * (w / 7), h + 1.1, d / 2 - 0.5);
            lens.rotation.x = Math.PI / 6;
            lens.userData.isStageLight = true;
            lens.userData.lightIndex = i;
            group.add(lens);
        }
        
        // ==================== DANCE FLOOR PREVIEW WINDOW ====================
        const windowGlowMat = this.getMaterial(0x220033, {
            transparent: true,
            opacity: 0.7,
            emissive: neonPurple,
            emissiveIntensity: 0.4
        });
        const windowGeo = new THREE.BoxGeometry(8, 3, 0.1);
        const window1 = new THREE.Mesh(windowGeo, windowGlowMat);
        window1.position.set(-w / 4 - 1, h / 2 + 2, d / 2 + 0.2);
        group.add(window1);
        
        const window2 = window1.clone();
        window2.position.set(w / 4 + 1, h / 2 + 2, d / 2 + 0.2);
        group.add(window2);
        
        const windowFrameMat = this.getMaterial(0x333333, { metalness: 0.4 });
        [-w / 4 - 1, w / 4 + 1].forEach(wx => {
            const frameGeo = new THREE.BoxGeometry(8.4, 3.4, 0.15);
            const edges = new THREE.EdgesGeometry(frameGeo);
            const frameMat = new THREE.LineBasicMaterial({ color: neonBlue });
            const frame = new THREE.LineSegments(edges, frameMat);
            frame.position.set(wx, h / 2 + 2, d / 2 + 0.15);
            group.add(frame);
        });
        
        // ==================== VELVET ROPE ENTRANCE ====================
        const ropeMat = this.getMaterial(0x8B0000, { roughness: 0.6 });
        const postMat = this.getMaterial(0xFFD700, { metalness: 0.8, roughness: 0.2 });
        
        [-4, 4].forEach(px => {
            const postGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 12);
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(px, 0.75, d / 2 + 4);
            group.add(post);
            
            const ballGeo = new THREE.SphereGeometry(0.22, 12, 12);
            const ball = new THREE.Mesh(ballGeo, postMat);
            ball.position.set(px, 1.6, d / 2 + 4);
            group.add(ball);
        });
        
        const ropePoints = [];
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const x = -4 + t * 8;
            const sag = 0.3 * (1 - Math.pow(2 * t - 1, 2));
            ropePoints.push(new THREE.Vector3(x, 1.4 - sag, d / 2 + 4));
        }
        const ropeCurve = new THREE.CatmullRomCurve3(ropePoints);
        const ropeGeo = new THREE.TubeGeometry(ropeCurve, 20, 0.08, 8, false);
        const rope = new THREE.Mesh(ropeGeo, ropeMat);
        group.add(rope);
        
        // ==================== GROUND LIGHTS ====================
        const groundLightPositions = [
            { x: -w / 2 - 1, z: d / 2 + 2, color: neonPink },
            { x: w / 2 + 1, z: d / 2 + 2, color: neonBlue },
            { x: -w / 4, z: d / 2 + 3, color: neonPurple },
            { x: w / 4, z: d / 2 + 3, color: neonGreen },
            { x: 0, z: d / 2 + 5, color: neonCyan },
            { x: -w / 2 + 2, z: d / 2 + 1, color: neonViolet },
            { x: w / 2 - 2, z: d / 2 + 1, color: neonOrange },
        ];
        
        const groundLights = [];
        groundLightPositions.forEach(({ x, z, color }, idx) => {
            const light = new THREE.SpotLight(color, 3, 25, Math.PI / 5, 0.5);
            light.position.set(x, 0.5, z);
            light.target.position.set(x, h + 5, z - 8);
            light.userData.isGroundLight = true;
            light.userData.lightIndex = idx;
            light.userData.baseColor = color;
            groundLights.push(light);
            group.add(light);
            group.add(light.target);
            
            const fixtureMat = this.getMaterial(0x222222, { metalness: 0.5 });
            const fixtureGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.3, 8);
            const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
            fixture.position.set(x, 0.15, z);
            group.add(fixture);
            
            const lensMat = this.getMaterial(color, { emissive: color, emissiveIntensity: 1 });
            const lensGeo = new THREE.CircleGeometry(0.25, 12);
            const lens = new THREE.Mesh(lensGeo, lensMat);
            lens.rotation.x = -Math.PI / 2;
            lens.position.set(x, 0.31, z);
            lens.userData.isGroundLens = true;
            lens.userData.lightIndex = idx;
            group.add(lens);
        });
        
        // ==================== MASSIVE DISCO BALL ====================
        const discoBallGroup = new THREE.Group();
        discoBallGroup.userData.isDiscoBall = true;
        
        const ballRadius = 2;
        const ballGeo = new THREE.SphereGeometry(ballRadius, 32, 32);
        const ballMat = this.getMaterial(0xCCCCCC, { 
            metalness: 0.9, 
            roughness: 0.1 
        });
        const discoBall = new THREE.Mesh(ballGeo, ballMat);
        discoBallGroup.add(discoBall);
        
        const mirrorMat = this.getMaterial(0xFFFFFF, {
            metalness: 1,
            roughness: 0,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.3
        });
        
        const tileRows = 12;
        const tileCols = 24;
        let tileIndex = 0;
        for (let row = 1; row < tileRows - 1; row++) {
            const phi = (row / tileRows) * Math.PI;
            const rowRadius = Math.sin(phi) * ballRadius;
            const y = Math.cos(phi) * ballRadius;
            const tilesInRow = Math.floor(tileCols * Math.sin(phi));
            
            for (let col = 0; col < tilesInRow; col++) {
                const theta = (col / tilesInRow) * Math.PI * 2;
                const tileGeo = new THREE.PlaneGeometry(0.25, 0.25);
                const tile = new THREE.Mesh(tileGeo, mirrorMat.clone());
                
                tile.position.set(
                    rowRadius * Math.cos(theta),
                    y,
                    rowRadius * Math.sin(theta)
                );
                tile.lookAt(0, 0, 0);
                tile.rotateY(Math.PI);
                tile.userData.isMirrorTile = true;
                tile.userData.tileIndex = tileIndex++;
                discoBallGroup.add(tile);
            }
        }
        
        const mountGeo = new THREE.CylinderGeometry(0.15, 0.2, 6, 8);
        const mountMat = this.getMaterial(0x333333, { metalness: 0.6 });
        const mount = new THREE.Mesh(mountGeo, mountMat);
        mount.position.y = -(ballRadius + 3);
        discoBallGroup.add(mount);
        
        const discoLight = new THREE.PointLight(0xFFFFFF, 4, 40);
        discoLight.position.set(0, 0, 0);
        discoLight.userData.isDiscoLight = true;
        discoBallGroup.add(discoLight);
        
        discoBallGroup.position.set(0, h + 8, d / 2 - 5);
        group.add(discoBallGroup);
        
        // ==================== SEARCHLIGHTS / SKY BEAMS ====================
        const searchlights = [];
        const searchlightColors = [neonPink, neonBlue, neonGreen, neonPurple];
        
        for (let i = 0; i < 4; i++) {
            const searchlightGroup = new THREE.Group();
            const color = searchlightColors[i];
            
            // Searchlight base
            const baseMat = this.getMaterial(0x222222, { metalness: 0.6 });
            const baseGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.6, 8);
            const base = new THREE.Mesh(baseGeo, baseMat);
            searchlightGroup.add(base);
            
            // Searchlight housing
            const housingGeo = new THREE.CylinderGeometry(0.3, 0.4, 1, 8);
            const housing = new THREE.Mesh(housingGeo, baseMat);
            housing.position.y = 0.8;
            housing.rotation.x = Math.PI / 4;
            searchlightGroup.add(housing);
            
            // Light beam (visible cone)
            const beamMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            const beamGeo = new THREE.ConeGeometry(8, 40, 8, 1, true);
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.y = 20;
            beam.rotation.x = Math.PI;
            searchlightGroup.add(beam);
            
            // Position searchlights on roof corners
            const positions = [
                { x: -w / 2 + 2, z: -d / 2 + 2 },
                { x: w / 2 - 2, z: -d / 2 + 2 },
                { x: -w / 2 + 2, z: d / 2 - 2 },
                { x: w / 2 - 2, z: d / 2 - 2 }
            ];
            searchlightGroup.position.set(positions[i].x, h + 1, positions[i].z);
            searchlightGroup.userData.isSearchlight = true;
            searchlightGroup.userData.searchIndex = i;
            searchlights.push(searchlightGroup);
            group.add(searchlightGroup);
        }
        
        // ==================== LASER BEAMS ====================
        const laserColors = [neonRed, neonGreen, neonBlue, neonPink];
        const lasers = [];
        
        for (let i = 0; i < 6; i++) {
            const laserMat = new THREE.MeshBasicMaterial({
                color: laserColors[i % laserColors.length],
                transparent: true,
                opacity: 0.6
            });
            const laserGeo = new THREE.CylinderGeometry(0.03, 0.03, 30, 4);
            const laser = new THREE.Mesh(laserGeo, laserMat);
            laser.userData.isLaser = true;
            laser.userData.laserIndex = i;
            laser.position.set(
                (i % 2 === 0 ? -1 : 1) * (w / 4 + i * 0.5),
                h + 5,
                d / 2
            );
            lasers.push(laser);
            group.add(laser);
        }
        
        // ==================== SMOKE/FOG PARTICLES ====================
        const smokeCount = 50;
        const smokeMat = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 1.5,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        const smokeGeo = new THREE.BufferGeometry();
        const smokePositions = new Float32Array(smokeCount * 3);
        const smokeVelocities = [];
        
        for (let i = 0; i < smokeCount; i++) {
            smokePositions[i * 3] = (Math.random() - 0.5) * 6;
            smokePositions[i * 3 + 1] = Math.random() * 3;
            smokePositions[i * 3 + 2] = d / 2 + 2 + Math.random() * 3;
            smokeVelocities.push({
                x: (Math.random() - 0.5) * 0.02,
                y: 0.01 + Math.random() * 0.02,
                z: (Math.random() - 0.5) * 0.01
            });
        }
        smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
        const smoke = new THREE.Points(smokeGeo, smokeMat);
        smoke.userData.isSmoke = true;
        smoke.userData.velocities = smokeVelocities;
        group.add(smoke);
        
        // ==================== MUSIC NOTE PARTICLES ====================
        const noteMat = this.getMaterial(neonCyan, {
            emissive: neonCyan,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.8
        });
        const musicNotes = [];
        for (let i = 0; i < 8; i++) {
            const noteGroup = new THREE.Group();
            
            // Note head
            const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
            const head = new THREE.Mesh(headGeo, noteMat);
            noteGroup.add(head);
            
            // Note stem
            const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4);
            const stem = new THREE.Mesh(stemGeo, noteMat);
            stem.position.set(0.15, 0.25, 0);
            noteGroup.add(stem);
            
            noteGroup.userData.isMusicNote = true;
            noteGroup.userData.noteIndex = i;
            noteGroup.userData.baseY = h + 2 + Math.random() * 3;
            noteGroup.userData.baseX = (Math.random() - 0.5) * w * 0.8;
            noteGroup.position.set(
                noteGroup.userData.baseX,
                noteGroup.userData.baseY,
                d / 2 + 3 + Math.random() * 2
            );
            musicNotes.push(noteGroup);
            group.add(noteGroup);
        }
        
        // ==================== OPEN SIGN ====================
        const openSignGroup = new THREE.Group();
        
        // Sign backing
        const openBackMat = this.getMaterial(0x111111, { roughness: 0.9 });
        const openBackGeo = new THREE.BoxGeometry(3, 1.2, 0.2);
        const openBack = new THREE.Mesh(openBackGeo, openBackMat);
        openSignGroup.add(openBack);
        
        // OPEN letters with neon glow
        const openLetterMat = this.getMaterial(neonRed, {
            emissive: neonRed,
            emissiveIntensity: 1.0
        });
        const openLetters = 'OPEN';
        for (let i = 0; i < openLetters.length; i++) {
            const letterGeo = new THREE.BoxGeometry(0.5, 0.7, 0.15);
            const letter = new THREE.Mesh(letterGeo, openLetterMat.clone());
            letter.position.set(-1 + i * 0.65, 0, 0.15);
            letter.userData.isOpenLetter = true;
            letter.userData.letterIndex = i;
            openSignGroup.add(letter);
        }
        
        // Border glow
        const borderMat = this.getMaterial(neonRed, {
            emissive: neonRed,
            emissiveIntensity: 0.8
        });
        const borders = [
            { x: 0, y: 0.7, w: 3.2, h: 0.1 },
            { x: 0, y: -0.7, w: 3.2, h: 0.1 },
            { x: -1.55, y: 0, w: 0.1, h: 1.4 },
            { x: 1.55, y: 0, w: 0.1, h: 1.4 }
        ];
        borders.forEach(b => {
            const borderGeo = new THREE.BoxGeometry(b.w, b.h, 0.15);
            const border = new THREE.Mesh(borderGeo, borderMat);
            border.position.set(b.x, b.y, 0.15);
            openSignGroup.add(border);
        });
        
        openSignGroup.position.set(w / 2 + 0.5, 4, d / 2);
        openSignGroup.rotation.y = -Math.PI / 2;
        openSignGroup.userData.isOpenSign = true;
        group.add(openSignGroup);
        
        // ==================== STAR BURST AROUND SIGN ====================
        const starBurstColors = [neonPink, neonBlue, neonYellow, neonGreen];
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 11;
            const color = starBurstColors[i % starBurstColors.length];
            
            const starMat = this.getMaterial(color, {
                emissive: color,
                emissiveIntensity: 0.9
            });
            const starGeo = new THREE.OctahedronGeometry(0.3, 0);
            const star = new THREE.Mesh(starGeo, starMat);
            star.position.set(
                Math.cos(angle) * radius,
                h + 3,
                d / 2 - 2 + Math.sin(angle) * 3
            );
            star.userData.isStarBurst = true;
            star.userData.starIndex = i;
            star.userData.angle = angle;
            group.add(star);
        }
        
        // Store references for animation
        group.userData.searchlights = searchlights;
        group.userData.lasers = lasers;
        group.userData.smoke = smoke;
        group.userData.musicNotes = musicNotes;
        
        // ==================== UPDATE FUNCTION ====================
        const update = (time, bassLevel = 0) => {
            const bassIntensity = bassLevel || Math.sin(time * 8) * 0.3 + 0.5;
            
            // Disco ball rotation
            discoBallGroup.rotation.y = time * 0.3;
            
            // Speaker woofer animation
            speakers.forEach(speaker => {
                speaker.traverse(child => {
                    if (child.userData.isWoofer) {
                        const bass = bassIntensity;
                        child.position.z = child.userData.baseZ + bass * 0.15;
                    }
                });
            });
            
            // Ground lights color cycling
            groundLights.forEach((light, idx) => {
                const hue = ((time * 0.1) + (idx * 0.15)) % 1;
                light.color.setHSL(hue, 1, 0.5);
            });
            
            // Searchlight sweep
            searchlights.forEach((sl, idx) => {
                const sweepAngle = time * 0.5 + idx * Math.PI / 2;
                sl.rotation.y = Math.sin(sweepAngle) * Math.PI / 4;
                sl.rotation.z = Math.cos(sweepAngle * 0.7) * Math.PI / 6;
            });
            
            // Laser animation
            lasers.forEach((laser, idx) => {
                const laserAngle = time * 2 + idx * Math.PI / 3;
                laser.rotation.x = Math.sin(laserAngle) * Math.PI / 4;
                laser.rotation.z = Math.cos(laserAngle * 0.7) * Math.PI / 6;
                laser.material.opacity = 0.3 + bassIntensity * 0.5;
            });
            
            // Smoke particles
            if (smoke && smoke.geometry) {
                const positions = smoke.geometry.attributes.position.array;
                const velocities = smoke.userData.velocities;
                
                for (let i = 0; i < smokeCount; i++) {
                    positions[i * 3] += velocities[i].x;
                    positions[i * 3 + 1] += velocities[i].y;
                    positions[i * 3 + 2] += velocities[i].z;
                    
                    // Reset if too high
                    if (positions[i * 3 + 1] > 10) {
                        positions[i * 3] = (Math.random() - 0.5) * 6;
                        positions[i * 3 + 1] = 0;
                        positions[i * 3 + 2] = d / 2 + 2 + Math.random() * 3;
                    }
                }
                smoke.geometry.attributes.position.needsUpdate = true;
                smoke.material.opacity = 0.2 + bassIntensity * 0.15;
            }
            
            // Music notes float and sway
            musicNotes.forEach((note, idx) => {
                const floatSpeed = 0.5 + idx * 0.1;
                note.position.y = note.userData.baseY + Math.sin(time * floatSpeed + idx) * 0.5;
                note.position.x = note.userData.baseX + Math.sin(time * 0.3 + idx * 0.5) * 0.3;
                note.rotation.z = Math.sin(time * 2 + idx) * 0.2;
            });
            
            // Animate neon elements
            group.traverse(child => {
                // Blink effect for OPEN sign letters
                if (child.userData.isOpenLetter) {
                    const blinkPhase = time * 5 + child.userData.letterIndex * 0.5;
                    child.material.emissiveIntensity = 0.7 + Math.sin(blinkPhase) * 0.3;
                }
                // Star burst twinkle
                if (child.userData.isStarBurst) {
                    const twinkle = Math.sin(time * 8 + child.userData.starIndex) * 0.5 + 0.5;
                    child.material.emissiveIntensity = 0.5 + twinkle * 0.5;
                    child.rotation.y = time * 2;
                    child.rotation.x = time * 1.5;
                }
                // Neon letters wave animation
                if (child.userData.isNeonLetter) {
                    const letterPhase = time * 3 + child.userData.letterIndex * 0.5;
                    child.material.emissiveIntensity = 0.6 + Math.sin(letterPhase) * 0.4;
                    child.position.y = (h + 3) + Math.sin(letterPhase * 2) * 0.1;
                }
                // Neon strip pulse
                if (child.userData.isNeonStrip) {
                    child.material.emissiveIntensity = 0.6 + bassIntensity * 0.4;
                }
            });
        };
        
        // Speaker colliders for collision detection
        const speakerColliders = [
            // Front left speakers
            { x: -w / 2 - 3, z: d / 2 - 5, size: { x: 6, z: 4.5 }, height: 9 },
            { x: -w / 2 - 1.5, z: d / 2 + 3, size: { x: 5, z: 3.6 }, height: 7.2 },
            // Front right speakers
            { x: w / 2 + 3, z: d / 2 - 5, size: { x: 6, z: 4.5 }, height: 9 },
            { x: w / 2 + 1.5, z: d / 2 + 3, size: { x: 5, z: 3.6 }, height: 7.2 },
            // Roof speakers (smaller)
            { x: -w / 3, z: 0, size: { x: 3.5, z: 2.5 }, height: 5, y: h + 1 },
            { x: w / 3, z: 0, size: { x: 3.5, z: 2.5 }, height: 5, y: h + 1 },
        ];
        
        return { mesh: group, speakers, update, speakerColliders };
    }

    // ==================== UTILITY METHODS ====================
    
    /**
     * Dispose of all cached materials and geometries
     */
    dispose() {
        this.materialCache.forEach(mat => mat.dispose());
        this.geometryCache.forEach(geo => geo.dispose());
        this.materialCache.clear();
        this.geometryCache.clear();
    }
}

export default PropsFactory;
