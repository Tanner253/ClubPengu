/**
 * Casino setpiece — spawn exterior, portal marker, collision, and lobby hooks.
 * Used by SnowFortsZone (moved from TownCenter; exact same building, new room coords).
 */

import { createCasino } from '../buildings/Casino';
import { createCasinoTVSprite, cleanupCasinoTV } from '../systems/CasinoTVSystem';

/** Visible game room portal marker on casino red carpet. */
export function createCasinoGameRoomPortalMarker(THREE, prop, lightsArray) {
    const group = new THREE.Group();
    const neonCyan = 0x00FFFF;
    const gold = 0xFFD700;

    const glowMat = new THREE.MeshStandardMaterial({
        color: neonCyan,
        emissive: neonCyan,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
    });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(2.8, 32), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.06;
    glow.renderOrder = 5;
    group.add(glow);

    const ringMat = new THREE.MeshStandardMaterial({
        color: gold,
        emissive: gold,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.2, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.07;
    ring.renderOrder = 6;
    group.add(ring);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#1a0a2e');
    grad.addColorStop(0.5, '#2d1b4e');
    grad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 44px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎰 GAME ROOM', 256, 64);

    const signTexture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
        map: signTexture,
        transparent: true,
        depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(8, 2, 1);
    const signY = 3.5;
    sprite.position.set(0, signY, 0);
    group.add(sprite);

    const isMobileGPU = typeof window !== 'undefined' && (window._isMobileGPU || window._isAppleDevice);
    let portalLight = null;
    if (!isMobileGPU && Array.isArray(lightsArray)) {
        portalLight = new THREE.PointLight(neonCyan, 0.6, 10);
        portalLight.position.set(0, 1.5, 0);
        group.add(portalLight);
        lightsArray.push(portalLight);
    }

    group.visible = false;
    group.userData.portalAnim = {
        worldX: prop.x,
        worldZ: prop.z,
        glow,
        ring,
        sprite,
        portalLight,
        baseY: signY,
        group,
    };

    return group;
}

/**
 * Spawn full casino setpiece into a zone host (SnowFortsZone).
 * @returns {THREE.Group|null} casino mesh
 */
export function spawnCasinoSetpiece(host, THREE, scene, prop) {
    const casinoMesh = createCasino(THREE, {
        w: prop.width,
        h: prop.height,
        d: prop.depth,
    });
    casinoMesh.name = 'casino';
    casinoMesh.position.set(prop.x, 0, prop.z);
    casinoMesh.rotation.y = prop.rotation || 0;
    scene.add(casinoMesh);
    host.meshes.push(casinoMesh);

    const casinoColliders = casinoMesh.userData.getCollisionData(prop.x, prop.z, prop.rotation || 0);
    casinoColliders.forEach((collider) => {
        host.collisionSystem.addCollider(
            collider.x, collider.z,
            { type: 'box', size: collider.size, height: collider.height },
            1,
            { name: collider.name },
            collider.rotation || 0,
            collider.y || 0
        );
    });

    const casinoSurfaces = casinoMesh.userData.getLandingSurfaces(prop.x, prop.z, prop.rotation || 0);
    host.casinoStairData = casinoMesh.userData.getStairData(prop.x, prop.z, prop.rotation || 0);

    const floor2 = casinoSurfaces.find((s) => s.name === 'casino_second_floor');
    if (floor2) {
        host.casinoSecondFloor = {
            minX: floor2.x - floor2.width / 2,
            maxX: floor2.x + floor2.width / 2,
            minZ: floor2.z - floor2.depth / 2,
            maxZ: floor2.z + floor2.depth / 2,
            height: floor2.height,
        };
    }

    host.casinoFurniture = casinoMesh.userData.getFurnitureData(prop.x, prop.z, prop.rotation || 0);
    host.casinoLobbySlots = casinoMesh.userData.getLobbySlotData?.(prop.x, prop.z, prop.rotation || 0) || [];
    host.casinoLobbySlotDisplays = casinoMesh.userData.lobbySlotDisplays || [];

    const rot = prop.rotation || 0;
    const isRotated90 = Math.abs(Math.abs(rot % Math.PI) - Math.PI / 2) < 0.1;
    const worldWidth = isRotated90 ? prop.depth : prop.width;
    const worldDepth = isRotated90 ? prop.width : prop.depth;
    host.casinoBounds = {
        minX: prop.x - worldWidth / 2,
        maxX: prop.x + worldWidth / 2,
        minZ: prop.z - worldDepth / 2,
        maxZ: prop.z + worldDepth / 2,
    };

    if (casinoMesh.userData.lights) {
        casinoMesh.userData.lights.forEach((light) => {
            host.lights.push(light);
        });
    }

    if (casinoMesh.userData.getDecorationColliders) {
        const decorationColliders = casinoMesh.userData.getDecorationColliders(prop.x, prop.z, prop.rotation || 0);
        decorationColliders.forEach((collider, idx) => {
            if (collider.type === 'cylinder') {
                host.collisionSystem.addCollider(
                    collider.worldX, collider.worldZ,
                    { type: 'circle', radius: collider.radius, height: collider.height },
                    1,
                    { name: `casino_decoration_${idx}` },
                    0,
                    0
                );
            } else if (collider.type === 'box') {
                host.collisionSystem.addCollider(
                    collider.worldX, collider.worldZ,
                    { type: 'box', size: { x: collider.width, z: collider.depth }, height: collider.height },
                    1,
                    { name: `casino_decoration_${idx}` },
                    0,
                    0
                );
            }
        });
    }

    createCasinoTVSprite(THREE).then((casinoTVMesh) => {
        const tvPos = casinoMesh.userData.tvPosition;
        if (tvPos) {
            // Parent to casino mesh so TV stays on the 2nd-floor back wall at any rotation
            casinoTVMesh.position.set(tvPos.localX, tvPos.localY, tvPos.localZ + 0.16);
        }
        casinoMesh.add(casinoTVMesh);
        host.casinoTVMesh = casinoTVMesh;
    });

    return casinoMesh;
}

export function spawnCasinoPortalMarker(host, THREE, scene, portalProp) {
    const marker = createCasinoGameRoomPortalMarker(THREE, portalProp, host.lights);
    marker.position.set(portalProp.x, 0, portalProp.z);
    marker.name = 'casino_game_room_portal';
    scene.add(marker);
    host.meshes.push(marker);
    return marker;
}

export function disposeCasinoSetpiece(host) {
    if (host?.casinoTVMesh) {
        cleanupCasinoTV(host.casinoTVMesh);
        if (host.casinoTVMesh.parent) {
            host.casinoTVMesh.parent.remove(host.casinoTVMesh);
        }
        host.casinoTVMesh = null;
    }
}

export function isPlayerInCasinoBounds(host, x, z) {
    if (!host?.casinoBounds) return false;
    const b = host.casinoBounds;
    return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
}

export function getCasinoFurnitureList(host) {
    return host?.casinoFurniture || [];
}

/** Extend zone checkLanding with casino 2nd floor + stairs (same logic as former TownCenter). */
export function applyCasinoLanding(host, x, z, y, baseResult, radius = 0.8) {
    let result = baseResult;
    let highestY = result.landingY;

    if (host.casinoSecondFloor) {
        const f2 = host.casinoSecondFloor;
        if (x >= f2.minX && x <= f2.maxX && z >= f2.minZ && z <= f2.maxZ) {
            if (y >= f2.height - 1 && f2.height > highestY) {
                highestY = f2.height;
                result = {
                    canLand: true,
                    landingY: f2.height,
                    collider: { name: 'casino_second_floor' },
                };
            }
        }
    }

    let skipCasinoStairs = false;
    if (host.casinoFurniture) {
        for (const furn of host.casinoFurniture) {
            if (furn.elevated || !furn.name?.startsWith('casino_lobby_couch')) continue;
            const dx = x - furn.position.x;
            const dz = z - furn.position.z;
            if (dx * dx + dz * dz < (furn.interactionRadius + 0.5) ** 2) {
                skipCasinoStairs = true;
                break;
            }
        }
    }

    if (host.casinoStairData && !skipCasinoStairs) {
        const st = host.casinoStairData;
        if (st.runsAlongX) {
            const stairHalfDepth = st.depth / 2;
            const stairMinZ = st.z - stairHalfDepth;
            const stairMaxZ = st.z + stairHalfDepth;
            if (z >= stairMinZ && z <= stairMaxZ) {
                const stairMinX = Math.min(st.startX, st.endX);
                const stairMaxX = Math.max(st.startX, st.endX);
                if (x >= stairMinX && x <= stairMaxX) {
                    const distFromStart = Math.abs(x - st.startX);
                    const stepIndex = Math.floor(distFromStart / st.stepDepth);
                    if (stepIndex >= 0 && stepIndex < st.totalSteps) {
                        const stepY = (stepIndex + 1) * st.stepHeight;
                        if (stepY > highestY && y <= stepY + 0.5) {
                            return { canLand: true, landingY: stepY, collider: { name: `casino_stair_${stepIndex}` } };
                        }
                    }
                }
            }
        } else {
            const stairHalfWidth = st.width / 2;
            const stairMinX = st.x - stairHalfWidth;
            const stairMaxX = st.x + stairHalfWidth;
            if (x >= stairMinX && x <= stairMaxX) {
                const stairMinZ = Math.min(st.startZ, st.endZ);
                const stairMaxZ = Math.max(st.startZ, st.endZ);
                if (z >= stairMinZ && z <= stairMaxZ) {
                    const distFromStart = Math.abs(z - st.startZ);
                    const stepIndex = Math.floor(distFromStart / st.stepDepth);
                    if (stepIndex >= 0 && stepIndex < st.totalSteps) {
                        const stepY = (stepIndex + 1) * st.stepHeight;
                        if (stepY > highestY && y <= stepY + 0.5) {
                            return { canLand: true, landingY: stepY, collider: { name: `casino_stair_${stepIndex}` } };
                        }
                    }
                }
            }
        }
    }

    return result;
}

/** Animate casino exterior + portal marker proximity (call from zone update). */
export function updateCasinoSetpieceAnimations(host, time, delta, playerPos, animatedCache, cullCache) {
    if (!host || !animatedCache) return;

    animatedCache.frameCounter = (animatedCache.frameCounter || 0) + 1;
    const frame = animatedCache.frameCounter;
    const px = playerPos?.x ?? 0;
    const pz = playerPos?.z ?? 0;
    const safeDelta = delta ?? 0.016;
    const ANIMATION_DISTANCE_SQ = 80 * 80;
    const PORTAL_SHOW_DIST_SQ = 50 * 50;

    // Casino exterior — marquee, roulette, slot reels, dice towers (needs delta!)
    if (frame % 2 === 0) {
        animatedCache.casinos?.forEach((mesh) => {
            if (mesh.userData?.update) {
                mesh.userData.update(time, safeDelta);
            }
        });
    }

    // Game room portal marker — pulse when nearby
    if (frame % 2 === 0) {
        animatedCache.gameRoomPortals?.forEach((entry) => {
            if (!entry?.group) return;
            const dx = px - entry.worldX;
            const dz = pz - entry.worldZ;
            const distSq = dx * dx + dz * dz;
            const shouldShow = distSq < PORTAL_SHOW_DIST_SQ;
            if (entry.group.visible !== shouldShow) entry.group.visible = shouldShow;
            if (!shouldShow) return;

            const pulse = 1 + Math.sin(time * 2.5) * 0.12;
            if (entry.ring) entry.ring.scale.set(pulse, pulse, 1);
            if (entry.glow?.material) {
                entry.glow.material.opacity = 0.45 + Math.sin(time * 3) * 0.2;
                entry.glow.material.emissiveIntensity = 0.7 + Math.sin(time * 3) * 0.3;
            }
            if (entry.sprite && entry.baseY != null) {
                entry.sprite.position.y = entry.baseY + Math.sin(time * 1.5) * 0.25;
            }
            if (entry.portalLight) {
                entry.portalLight.intensity = 0.5 + Math.sin(time * 3) * 0.2;
            }
        });
    }

    // Sprite visibility culling (same hysteresis as former TownCenter)
    if (frame % 15 === 0 && cullCache) {
        const HIDE_DIST_SQ = 75 * 75;
        const SHOW_DIST_SQ = 60 * 60;
        const PORTAL_HIDE_DIST_SQ = 55 * 55;
        const PORTAL_SHOW_DIST_SQ = 45 * 45;

        const updateVisibility = (obj, shouldShow, cacheEntry) => {
            if (!obj || !cacheEntry) return;
            if (shouldShow && !cacheEntry.wasVisible) {
                obj.visible = true;
                cacheEntry.wasVisible = true;
            } else if (!shouldShow && cacheEntry.wasVisible) {
                obj.visible = false;
                cacheEntry.wasVisible = false;
            }
        };

        if (cullCache.gameRoomPortal) {
            const entry = cullCache.gameRoomPortal;
            const dx = px - entry.worldX;
            const dz = pz - entry.worldZ;
            const distSq = dx * dx + dz * dz;
            const shouldShow = entry.wasVisible
                ? distSq < PORTAL_HIDE_DIST_SQ
                : distSq < PORTAL_SHOW_DIST_SQ;
            updateVisibility(entry.group, shouldShow, entry);
        }
    }
}

/** Build animation caches from spawned meshes (call once on first update). */
export function buildCasinoAnimationCache(host, meshes, animatedCache, cullCache) {
    meshes.forEach((mesh) => {
        if (mesh.name === 'casino' && mesh.userData.update) {
            animatedCache.casinos.push(mesh);
        }
        if (mesh.name === 'casino_game_room_portal' && mesh.userData.portalAnim) {
            animatedCache.gameRoomPortals.push(mesh.userData.portalAnim);
            cullCache.gameRoomPortal = {
                group: mesh,
                worldX: mesh.position.x,
                worldZ: mesh.position.z,
                wasVisible: false,
            };
        }
    });
    animatedCache.frameCounter = 0;
}
