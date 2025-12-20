/**
 * HARDWARE-ACCELERATED RENDERING ENGINE (PixiJS v8)
 */

"use strict";

let cachedReadyMap = null;
let lastReadyMapRebuild = 0;

// Sprite Pools
const enemySpritePool = [];
const bulletSpritePool = [];
const skillSpritePool = [];
const damageTextPool = [];
let playerSprite, shieldSprite, floorTile;

// Fallback Texture Cache
const fallbackTextures = {};

function initRendererPools() {
    console.log("[RENDER] Initializing Sprite Pools...");
    const floorTexture = PIXI.Texture.from(floorImg);
    floorTile = new PIXI.TilingSprite({ texture: floorTexture, width: 100000, height: 100000 });
    floorTile.anchor.set(0.5);
    worldContainer.addChildAt(floorTile, 0);

    enemyKeys.forEach(typeKey => {
        fallbackTextures[typeKey] = { walk: [], death: [], attack: [] };
        const cfg = Enemy[typeKey];
        ['walk', 'death', 'attack'].forEach(anim => {
            const sheet = enemyAssets[typeKey][anim];
            if (sheet && (sheet.complete || sheet.naturalWidth > 0)) {
                const cols = cfg[anim + 'Cols'], size = cfg[anim + 'Size'], count = cfg[anim + 'Frames'];
                for (let i = 0; i < count; i++) {
                    const rect = new PIXI.Rectangle((i % cols) * size, Math.floor(i / cols) * size, size, size);
                    fallbackTextures[typeKey][anim].push(new PIXI.Texture({
                        source: PIXI.Texture.from(sheet),
                        frame: rect
                    }));
                }
            }
        });
    });

    for (let i = 0; i < totalEnemies; i++) {
        const s = new PIXI.Sprite();
        s.anchor.set(0.5); s.visible = false;
        enemyContainer.addChild(s);
        enemySpritePool.push(s);
    }

    const laserTexture = PIXI.Texture.from(laserImg);
    for (let i = 0; i < totalBullets; i++) {
        const s = new PIXI.Sprite(laserTexture);
        s.anchor.set(0.5); s.visible = false;
        bulletContainer.addChild(s);
        bulletSpritePool.push(s);
    }

    playerSprite = new PIXI.Sprite();
    playerSprite.anchor.set(0.5);
    playerContainer.addChild(playerSprite);

    shieldSprite = new PIXI.Sprite();
    shieldSprite.anchor.set(0.5);
    playerContainer.addChild(shieldSprite);

    for (let i = 0; i < 200; i++) {
        const s = new PIXI.Sprite();
        s.anchor.set(0.5); s.visible = false;
        worldContainer.addChildAt(s, 1 + i);
        skillSpritePool.push(s);
    }

    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
        const t = new PIXI.Text({ text: '', style: { fill: 0xff0000, fontWeight: 'bold', fontSize: 24 } });
        t.anchor.set(0.5); t.visible = false;
        uiContainer.addChild(t);
        damageTextPool.push(t);
    }
}

function draw() {
    if (!app || !app.renderer) return;
    if (enemySpritePool.length === 0) initRendererPools();

    const cx = app.screen.width / 2, cy = app.screen.height / 2;

    // 1. CAMERA
    worldContainer.scale.set(zoom);
    worldContainer.position.set(cx - player.x * zoom, cy - player.y * zoom);

    // Floor
    const targetTileSize = 16000;
    const tScale = targetTileSize / (floorTile.texture.width || 1024);
    floorTile.width = (app.screen.width / zoom) + 100;
    floorTile.height = (app.screen.height / zoom) + 100;
    floorTile.tileScale.set(tScale);
    floorTile.tilePosition.x = -player.x / tScale;
    floorTile.tilePosition.y = -player.y / tScale;
    floorTile.position.set(player.x, player.y);

    const margin = 100 + (3200 * 2);
    const left = player.x - (cx / zoom) - margin;
    const right = player.x + (cx / zoom) + margin;
    const top = player.y - (cy / zoom) - margin;
    const bottom = player.y + (cy / zoom) + margin;

    // 2. LOD CALC
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
    // MORE AGGRESSIVE REBUILD during the first 60 seconds of gameplay
    const isEarlyGame = now < 60000;
    const rebuildInterval = isEarlyGame ? 200 : 2000;

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

    // 3. RENDER
    onScreenCount = 0;
    const growth = currentStage > 2 ? 2 + (currentStage - 2) * 0.2 : (currentStage === 2 ? 2 : 1);

    for (let i = 0; i < totalEnemies; i++) {
        const s = enemySpritePool[i];
        if (i >= spawnIndex) { s.visible = false; continue; }

        const idx = i * STRIDE;
        const x = data[idx], y = data[idx + 1], h = data[idx + 8], df = data[idx + 9];

        if (h > 0 || (df > 0 && df < 145)) {
            if (x > left && x < right && y > top && y < bottom) {
                onScreenCount++;
                const typeIdx = data[idx + 11] | 0;
                const typeKey = enemyKeys[typeIdx];
                const cfg = allConfigs[typeIdx];
                const af = Math.floor(data[idx + 10]);
                const animType = (h <= 0) ? 'death' : (af > 0 ? 'attack' : 'walk');
                const frameIdx = (h <= 0) ? Math.floor(df) : (af > 0 ? af : Math.floor(data[idx + 5]));
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

                const archMult = data[idx + 12] > 0.5 ? 5 : 1;
                const baseSize = cfg.size * growth * archMult;
                s.width = s.height = baseSize;
                s.alpha = (h <= 0) ? Math.max(0, Math.min(1, 1 - (df / 145 - 0.7) * 3.3)) : 1.0;

                const isFlipped = cfg.isSideways && Math.abs(data[idx + 7]) < 1.57;
                if (isFlipped) s.scale.y = -Math.abs(s.scale.y); else s.scale.y = Math.abs(s.scale.y);
            } else s.visible = false;
        } else s.visible = false;
    }

    // 4. BULLETS
    const bSize = WEAPON_CONFIG.bulletSize;
    for (let i = 0; i < totalBullets; i++) bulletSpritePool[i].visible = false;
    for (let i = 0; i < activeBulletCount; i++) {
        const poolIdx = activeBulletIndices[i], bIdx = poolIdx * BULLET_STRIDE, s = bulletSpritePool[poolIdx];
        const bx = bulletData[bIdx], by = bulletData[bIdx + 1];
        if (bx > left && bx < right && by > top && by < bottom) {
            s.visible = true; s.position.set(bx, by);
            s.rotation = Math.atan2(bulletData[bIdx + 3], bulletData[bIdx + 2]);
            s.width = s.height = Math.max(bSize, 5 / zoom);
        }
    }

    // 5. PLAYER
    const sc = SHIP_CONFIG, sf = Math.floor(player.shipFrame);
    const isFull = player.shipState === 'FULL' || player.shipState === 'THRUST';
    const sTexs = isFull ? shipAssets.pixiFull : shipAssets.pixiOn;
    const curFrame = sf % (isFull ? (sc.fullFrames || 1) : (sc.onFrames || 1));
    playerSprite.position.set(cx, cy); playerSprite.rotation = player.rotation;
    playerSprite.width = playerSprite.height = sc.visualSize * zoom;
    if (shipAssets.baked && sTexs && sTexs[curFrame]) playerSprite.texture = sTexs[curFrame];

    if (player.shieldActive && player.shieldAnimState !== 'OFF') {
        const isOn = player.shieldAnimState === 'ON';
        const shTexs = isOn ? shipAssets.pixiShieldOn : shipAssets.pixiShieldTurnOn;
        const sfrm = isOn ? (sc.shieldOnFrames || 1) : (sc.shieldTurnOnFrames || 1);
        const shf = Math.floor(player.shieldFrame) % sfrm;
        shieldSprite.visible = true; shieldSprite.position.set(cx, cy);
        shieldSprite.rotation = player.rotation; shieldSprite.width = shieldSprite.height = sc.shieldVisualSize * zoom;
        if (shipAssets.baked && shTexs && shTexs[shf]) shieldSprite.texture = shTexs[shf];
    } else shieldSprite.visible = false;

    // 6. DAMAGE
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) damageTextPool[i].visible = false;
    for (let i = 0; i < activeDamageCount; i++) {
        const poolIdx = activeDamageIndices[i], t = damageTextPool[poolIdx], dn = damageNumbers[poolIdx];
        t.visible = true; t.text = dn.val; t.alpha = dn.life;
        t.position.set((dn.x - player.x) * zoom + cx, (dn.y - player.y) * zoom + cy);
        t.scale.set(zoom * 2);
    }

    // 7. SKILLS
    const skCfg = SKILLS.MulticolorXFlame;
    for (let i = 0; i < skillSpritePool.length; i++) skillSpritePool[i].visible = false;
    for (let i = 0; i < activeSkills.length; i++) {
        if (i >= skillSpritePool.length) break;
        const sData = activeSkills[i], s = skillSpritePool[i];
        const offX = Math.cos(sData.angle) * sData.radius, offY = Math.sin(sData.angle) * sData.radius;
        s.visible = true; s.position.set(player.x + offX, player.y + offY);
        s.width = s.height = sData.size; s.rotation = sData.angle + Math.PI / 2;
        const fIdx = Math.floor(sData.frame) % (skCfg.skillFrames || 1);
        if (skillAssets.baked && skillAssets.pixiSkill && skillAssets.pixiSkill[fIdx]) s.texture = skillAssets.pixiSkill[fIdx];
    }

    drawFX();
}
