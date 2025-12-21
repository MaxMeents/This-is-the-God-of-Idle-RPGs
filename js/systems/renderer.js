/**
 * HARDWARE-ACCELERATED RENDERING ENGINE (PixiJS v8)
 * This system utilizes WebGL/WebGPU to handle thousands of entities at 60FPS.
 */

"use strict";

let cachedReadyMap = null;
let lastReadyMapRebuild = 0;

// Sprite Pools
const enemySpritePool = [];
const bulletSpritePool = [];
const skillSpritePool = [];
const damageTextPool = [];
let playerSprite, shieldSprite;
let leftBulletTex, rightBulletTex, laserTex;

// Fallback Texture Cache (Used for immediate display while LOD builds)
const fallbackTextures = {};

/**
 * INITIALIZE SPRITE POOLS
 */
function initRendererPools() {
    console.log("[RENDER] Initializing Sprite Pools...");

    // 1. SETUP CSS BACKGROUND (Stutter-Free / Zoom-Stable)
    document.body.style.backgroundImage = `url("${FLOOR_PATH}")`;
    document.body.style.backgroundRepeat = 'repeat';
    document.body.style.backgroundColor = '#000000';

    // 2. Pre-cache Fallback Textures (from raw 512px sheets)
    enemyKeys.forEach(typeKey => {
        fallbackTextures[typeKey] = { walk: [], death: [], attack: [] };
        const cfg = Enemy[typeKey];
        ['walk', 'death', 'attack'].forEach(anim => {
            const sheet = enemyAssets[typeKey][anim];
            if (sheet && (sheet.complete || sheet.naturalWidth > 0)) {
                const cols = cfg[anim + 'Cols'], size = cfg[anim + 'Size'], count = cfg[anim + 'Frames'];
                const baseTexture = PIXI.Texture.from(sheet);
                for (let i = 0; i < count; i++) {
                    const rect = new PIXI.Rectangle((i % cols) * size, Math.floor(i / cols) * size, size, size);
                    fallbackTextures[typeKey][anim].push(new PIXI.Texture({
                        source: baseTexture.source,
                        frame: rect
                    }));
                }
            }
        });
    });

    // 3. Enemies
    for (let i = 0; i < totalEnemies; i++) {
        const s = new PIXI.Sprite();
        s.anchor.set(0.5);
        s.visible = false;
        enemyContainer.addChild(s);
        enemySpritePool.push(s);
    }

    // 4. Bullets
    leftBulletTex = PIXI.Texture.from(weaponAssets.leftBulletImg);
    rightBulletTex = PIXI.Texture.from(weaponAssets.rightBulletImg);
    laserTex = PIXI.Texture.from(weaponAssets.laserImg);
    for (let i = 0; i < totalBullets; i++) {
        const s = new PIXI.Sprite(leftBulletTex);
        s.anchor.set(0.5);
        s.visible = false;
        bulletContainer.addChild(s);
        bulletSpritePool.push(s);
    }

    // 5. Player & Shield
    playerSprite = new PIXI.Sprite();
    playerSprite.anchor.set(0.5);
    playerContainer.addChild(playerSprite);

    shieldSprite = new PIXI.Sprite();
    shieldSprite.anchor.set(0.5);
    playerContainer.addChild(shieldSprite);

    // 6. Skills - Expanded pool for 25-ring Supernova (~1300 flames)
    // Refactored to set pool to 4000 to prevent OOM
    for (let i = 0; i < totalSkillParticles; i++) {
        const s = new PIXI.Sprite();
        s.anchor.set(0.5);
        s.visible = false;
        worldContainer.addChildAt(s, 1 + i);
        skillSpritePool.push(s);
    }

    // 7. Damage Numbers
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
        const t = new PIXI.Text({
            text: '',
            style: {
                fill: 0xffffff,
                fontWeight: '900',
                fontSize: 24,
                fontFamily: 'Orbitron',
                stroke: 0x000000,
                strokeThickness: 3,
                dropShadow: true,
                dropShadowColor: '#000000',
                dropShadowBlur: 2,
                dropShadowAngle: Math.PI / 6,
                dropShadowDistance: 2
            }
        });
        t.anchor.set(0.5);
        t.visible = false;
        uiContainer.addChild(t); // Back to UI container (Screen Space)
        damageTextPool.push(t);
    }
}

function draw() {
    const drawStart = performance.now();
    if (!app || !app.renderer) return;
    if (enemySpritePool.length === 0) initRendererPools();

    const cx = app.screen.width / 2, cy = app.screen.height / 2;

    // 1. CAMERA SYSTEM
    worldContainer.scale.set(zoom);
    worldContainer.position.set(cx - player.x * zoom, cy - player.y * zoom);

    // --- SYNC CSS BACKGROUND ---
    // This is the "Nuclear Option" for solid tiling.
    const bgSize = FLOOR_TILE_SIZE * zoom;
    const bgX = (cx - player.x * zoom);
    const bgY = (cy - player.y * zoom);

    document.body.style.backgroundSize = `${bgSize}px ${bgSize}px`;
    document.body.style.backgroundPosition = `${bgX}px ${bgY}px`;

    // View boundaries
    const margin = 100 + (3200 * 2);
    const left = player.x - (cx / zoom) - margin;
    const right = player.x + (cx / zoom) + margin;
    const top = player.y - (cy / zoom) - margin;
    const bottom = player.y + (cy / zoom) + margin;

    // 2. LOD & CACHE REBUILD
    smoothedEnemies += (onScreenCount - smoothedEnemies) * 0.15;
    let activeTierIdx = PERFORMANCE.LOD_TIERS.length - 1;
    for (let i = 0; i < PERFORMANCE.LOD_TIERS.length; i++) {
        if (smoothedEnemies <= PERFORMANCE.LOD_TIERS[i].max) { activeTierIdx = i; break; }
    }

    if (window.lastActiveTier !== activeTierIdx) {
        const tier = PERFORMANCE.LOD_TIERS[activeTierIdx];
        console.log(`%c[LOD] Switched to ${tier.id} (${tier.size}px) - ${Math.floor(smoothedEnemies)} on screen`, 'color: #00ff00; font-weight: bold');
        window.lastActiveTier = activeTierIdx;
    }

    const now = performance.now();
    const rebuildInterval = now < 60000 ? 500 : 2000;

    if (!cachedReadyMap || readyMapDirty || (now - lastReadyMapRebuild > rebuildInterval)) {
        lastReadyMapRebuild = now; readyMapDirty = false;
        if (!cachedReadyMap) {
            cachedReadyMap = {};
            for (const type of enemyKeys) cachedReadyMap[type] = { walk: [], death: [], attack: [] };
        }
        for (const type of enemyKeys) {
            const cache = enemyAssets[type].caches;
            ["walk", "death", "attack"].forEach(anim => {
                const tiers = PERFORMANCE.LOD_TIERS;
                const tierList = cachedReadyMap[type][anim];
                for (let i = 0; i < tiers.length; i++) {
                    if (!tierList[i]) tierList[i] = { id: tiers[i].id, frames: null };
                    tierList[i].frames = cache[anim][tiers[i].id];
                }
            });
        }
    }

    // 3. RENDER ENEMIES
    onScreenCount = 0;
    const growth = currentStage > 2 ? 2 + (currentStage - 2) * 0.2 : (currentStage === 2 ? 2 : 1);

    for (let i = 0; i < totalEnemies; i++) {
        const s = enemySpritePool[i];
        if (i >= spawnIndex) { s.visible = false; continue; }

        const idx = i * STRIDE;
        const x = data[idx], y = data[idx + 1];
        const h = data[idx + 8], currentDeathF = data[idx + 9];

        if (h > 0 || (currentDeathF > 0 && currentDeathF < 145)) {
            if (x > left && x < right && y > top && y < bottom) {
                onScreenCount++;
                const typeIdx = data[idx + 11] | 0;
                const typeKey = enemyKeys[typeIdx];
                const cfg = allConfigs[typeIdx];
                const af = Math.floor(data[idx + 10]);
                const animType = (h <= 0) ? 'death' : (af > 0 ? 'attack' : 'walk');
                const frameIdx = (h <= 0) ? Math.floor(currentDeathF) : (af > 0 ? af : Math.floor(data[idx + 5]));
                const tier = cachedReadyMap[typeKey][animType][activeTierIdx];

                s.visible = true;
                s.position.set(x, y);
                s.rotation = data[idx + 4];

                if (tier && tier.frames && tier.frames[frameIdx]) {
                    s.texture = tier.frames[frameIdx];
                } else {
                    const fallback = fallbackTextures[typeKey][animType];
                    if (fallback && fallback[frameIdx]) s.texture = fallback[frameIdx];
                }

                const tierIndex = data[idx + 12] | 0;
                const tierCfg = LOOT_CONFIG.TIERS[tierIndex] || LOOT_CONFIG.TIERS[0];
                const sizeMult = tierCfg.sizeMult || 1;
                const baseSize = cfg.size * growth * sizeMult;
                s.width = s.height = baseSize;
                s.alpha = (h <= 0) ? Math.max(0, Math.min(1, 1 - (currentDeathF / 145 - 0.7) * 3.3)) : 1.0;

                const look = data[idx + 7];
                const isFlipped = cfg.isSideways && Math.abs(look) < 1.57;
                if (isFlipped) s.scale.y = -Math.abs(s.scale.y);
                else s.scale.y = Math.abs(s.scale.y);

            } else s.visible = false;
        } else s.visible = false;
    }

    // 4. RENDER BULLETS
    for (let i = 0; i < totalBullets; i++) bulletSpritePool[i].visible = false;
    for (let i = 0; i < activeBulletCount; i++) {
        const poolIdx = activeBulletIndices[i];
        const bIdx = poolIdx * BULLET_STRIDE;
        const s = bulletSpritePool[poolIdx];
        const bx = bulletData[bIdx], by = bulletData[bIdx + 1];

        if (bx > left && bx < right && by > top && by < bottom) {
            s.visible = true;
            s.position.set(bx, by);
            s.rotation = Math.atan2(bulletData[bIdx + 3], bulletData[bIdx + 2]);
            // Set texture and size based on type
            const bType = bulletData[bIdx + 6];
            let wcfg;
            if (bType === 0) { s.texture = leftBulletTex; wcfg = WEAPON_CONFIG.bullet_left_side; }
            else if (bType === 1) { s.texture = rightBulletTex; wcfg = WEAPON_CONFIG.bullet_right_side; }
            else { s.texture = laserTex; wcfg = WEAPON_CONFIG.laser; }

            const size = wcfg.size || 980;
            const stretch = wcfg.visualStretch || 1.0;
            s.height = Math.max(size, 5 / zoom);
            s.width = s.height * stretch;
            s.tint = wcfg.tint || 0xffffff;
        }
    }

    // 5. RENDER PLAYER
    const sc = SHIP_CONFIG, sf = Math.floor(player.shipFrame);
    const isFull = player.shipState === 'FULL' || player.shipState === 'THRUST';
    const sTexs = isFull ? shipAssets.pixiFull : shipAssets.pixiOn;
    const curFrame = sf % (isFull ? (sc.fullFrames || 1) : (sc.onFrames || 1));

    playerSprite.visible = true;
    playerSprite.position.set(cx, cy);
    playerSprite.rotation = player.rotation;
    playerSprite.width = playerSprite.height = sc.visualSize * zoom;

    if (shipAssets.baked && sTexs && sTexs[curFrame]) {
        playerSprite.texture = sTexs[curFrame];
    } else {
        const rawSheet = isFull ? shipAssets.fullImg : shipAssets.onImg;
        if (rawSheet && rawSheet.complete && rawSheet.naturalWidth > 0) {
            const cols = isFull ? sc.fullCols : sc.onCols;
            const size = isFull ? sc.fullSize : sc.onSize;
            const cacheKey = `player_${isFull}_${curFrame}`;

            // Local fallback cache to avoid PIXI.Cache issues
            if (!window.playerTextureCache) window.playerTextureCache = new Map();

            if (!window.playerTextureCache.has(cacheKey)) {
                const baseTexture = PIXI.Texture.from(rawSheet);
                const tex = new PIXI.Texture({
                    source: baseTexture.source,
                    frame: new PIXI.Rectangle((curFrame % cols) * size, Math.floor(curFrame / cols) * size, size, size)
                });
                window.playerTextureCache.set(cacheKey, tex);
            }
            playerSprite.texture = window.playerTextureCache.get(cacheKey);
        }
    }

    // Shield
    if (player.shieldActive && player.shieldAnimState !== 'OFF') {
        const isOn = player.shieldAnimState === 'ON';
        const shTexs = isOn ? shipAssets.pixiShieldOn : shipAssets.pixiShieldTurnOn;
        const sfrm = isOn ? (sc.shieldOnFrames || 1) : (sc.shieldTurnOnFrames || 1);
        const shf = Math.floor(player.shieldFrame) % sfrm;
        shieldSprite.visible = true;
        shieldSprite.position.set(cx, cy);
        shieldSprite.rotation = player.rotation;
        shieldSprite.width = shieldSprite.height = sc.shieldVisualSize * zoom;
        if (shipAssets.baked && shTexs && shTexs[shf]) shieldSprite.texture = shTexs[shf];
    } else {
        shieldSprite.visible = false;
    }

    // 6. DAMAGE NUMBERS
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) damageTextPool[i].visible = false;

    for (let i = 0; i < activeDamageCount; i++) {
        const poolIdx = activeDamageIndices[i];
        const t = damageTextPool[poolIdx];
        const dn = damageNumbers[poolIdx];

        t.visible = true;
        t.alpha = dn.life;

        // SCREEN SPACE CALCULATION
        // We track the world position but draw in screen space so they stay sharp and visible
        const screenX = (dn.x - player.x) * zoom + cx;
        const screenY = (dn.y - player.y) * zoom + cy;
        t.position.set(screenX, screenY);

        const valStr = String(dn.val);
        const textContent = dn.isLucky ? "LUCKY! " + valStr : valStr;

        if (t.text !== textContent) {
            t.text = textContent;

            // SEXY STYLING SWITCH
            if (dn.isLucky) {
                t.style.fill = 0xffd700; // Gold
                t.style.stroke = 0xff0000; // Red stroke for impact
                t.style.fontSize = 42;
            } else {
                t.style.fill = 0xffffff;
                t.style.stroke = 0x000000;
                t.style.fontSize = 28;
            }
        }

        // In screen space, we keep the scale mostly stable but slightly reactive to zoom
        const baseScale = dn.isLucky ? 1.4 : 1.0;
        t.scale.set(baseScale * (0.8 + zoom * 0.2));
    }

    // 7. SKILLS
    for (let i = 0; i < skillSpritePool.length; i++) skillSpritePool[i].visible = false;
    if (!skillAssets.baked) return;

    for (let i = 0; i < activeSkillCount; i++) {
        if (i >= skillSpritePool.length) break;
        const poolIdx = activeSkillIndices[i];
        const idx = poolIdx * SKILL_STRIDE;
        const spr = skillSpritePool[i];

        const type = skillData[idx + 6];
        const tier = skillData[idx + 5];
        const angle = skillData[idx];
        const radius = skillData[idx + 2];
        const size = skillData[idx + 3];
        const frame = skillData[idx + 1];

        let skCfg, texs;
        if (type === 1) { // SwordOfLight
            skCfg = SKILLS.SwordOfLight;
            texs = skillAssets.pixiSwordOfLight;
        } else {
            skCfg = SKILLS['Tier' + (tier || 3)] || SKILLS.Tier3;
            texs = skillAssets.pixiSkill;
        }

        const offX = Math.cos(angle) * radius, offY = Math.sin(angle) * radius;
        spr.visible = true;
        // Position relative to world origin (worldContainer handles camera/zoom)
        spr.position.set(player.x + offX, player.y + offY);
        spr.width = spr.height = size;
        spr.rotation = angle + Math.PI / 2;

        const fIdx = Math.floor(frame) % (skCfg.skillFrames || 1);
        if (texs && texs[fIdx]) spr.texture = texs[fIdx];
    }

    // 8. EFFECTS
    drawFX();

    // Performance logging
    const drawTime = performance.now() - drawStart;
    if (drawTime > 10) {
        console.warn(`[PERF] Draw took ${drawTime.toFixed(2)}ms | Enemies: ${spawnIndex} | OnScreen: ${onScreenCount} | ActiveSkills: ${activeSkillCount}`);
    }
}
