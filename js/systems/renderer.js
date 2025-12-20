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
let playerSprite, shieldSprite, floorTile;

/**
 * INITIALIZE SPRITE POOLS
 */
function initRendererPools() {
    // 1. Floor (Tiling Background)
    // Re-use the already loaded and CLEAN (CORS) floorImg
    const floorTexture = PIXI.Texture.from(floorImg);
    floorTile = new PIXI.TilingSprite({
        texture: floorTexture,
        width: 100000,
        height: 100000
    });
    floorTile.anchor.set(0.5);
    worldContainer.addChildAt(floorTile, 0); // MUST BE AT THE BOTTOM

    // 2. Enemies
    for (let i = 0; i < totalEnemies; i++) {
        const s = new PIXI.Sprite();
        s.anchor.set(0.5);
        s.visible = false;
        enemyContainer.addChild(s);
        enemySpritePool.push(s);
    }

    // 3. Bullets
    const laserTexture = PIXI.Texture.from(laserImg);
    for (let i = 0; i < totalBullets; i++) {
        const s = new PIXI.Sprite(laserTexture);
        s.anchor.set(0.5);
        s.visible = false;
        bulletContainer.addChild(s);
        bulletSpritePool.push(s);
    }

    // 4. Player & Shield
    playerSprite = new PIXI.Sprite();
    playerSprite.anchor.set(0.5);
    playerContainer.addChild(playerSprite);

    shieldSprite = new PIXI.Sprite();
    shieldSprite.anchor.set(0.5);
    playerContainer.addChild(shieldSprite);

    // 5. Skills (must be in worldContainer for world-space positioning)
    // Add them right after the floor tile so they render UNDER enemies
    for (let i = 0; i < 200; i++) {
        const s = new PIXI.Sprite();
        s.anchor.set(0.5);
        s.visible = false;
        worldContainer.addChildAt(s, 1 + i); // Insert after floor (index 0)
        skillSpritePool.push(s);
    }

    // 6. Damage Numbers (Text Pool)
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
        const t = new PIXI.Text({ text: '', style: { fill: 0xff0000, fontWeight: 'bold', fontSize: 24 } });
        t.anchor.set(0.5);
        t.visible = false;
        uiContainer.addChild(t);
        damageTextPool.push(t);
    }
}

function draw() {
    if (!app) return;
    if (enemySpritePool.length === 0) initRendererPools();

    const cx = app.screen.width / 2, cy = app.screen.height / 2;

    // 1. CAMERA SYSTEM
    worldContainer.scale.set(zoom);
    worldContainer.position.set(cx - player.x * zoom, cy - player.y * zoom);

    // Sync Floor Tiling (Ensure it covers the entire visible area at any zoom)
    const targetTileSize = 16000;
    const sourceWidth = floorTile.texture.width || 1024;
    const tScale = targetTileSize / sourceWidth;

    // Expand the tile surface to cover the current screen view in world units
    floorTile.width = (app.screen.width / zoom) + 100;
    floorTile.height = (app.screen.height / zoom) + 100;

    floorTile.tileScale.set(tScale);
    floorTile.tilePosition.x = -player.x / tScale;
    floorTile.tilePosition.y = -player.y / tScale;
    floorTile.position.set(player.x, player.y);

    // View boundaries
    const margin = 100 + (3200 * 2);
    const left = player.x - (cx / zoom) - margin;
    const right = player.x + (cx / zoom) + margin;
    const top = player.y - (cy / zoom) - margin;
    const bottom = player.y + (cy / zoom) + margin;

    // 2. LOD & CACHE REBUILD (Same logic, slightly adapted)
    smoothedEnemies += (onScreenCount - smoothedEnemies) * 0.15;
    let activeTierIdx = PERFORMANCE.LOD_TIERS.length - 1;
    for (let i = 0; i < PERFORMANCE.LOD_TIERS.length; i++) {
        if (smoothedEnemies <= PERFORMANCE.LOD_TIERS[i].max) { activeTierIdx = i; break; }
    }

    const now = performance.now();
    if (!cachedReadyMap || (readyMapDirty && (now - lastReadyMapRebuild > 500))) {
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

    // Update individual sprites
    for (let i = 0; i < totalEnemies; i++) {
        const s = enemySpritePool[i];
        if (i >= spawnIndex) { s.visible = false; continue; }

        const idx = i * STRIDE;
        const x = data[idx], y = data[idx + 1];
        const h = data[idx + 8], currentDeathF = data[idx + 9];

        if (h > 0 || (currentDeathF > 0 && currentDeathF < 145)) {
            // Visibility Check
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

                // Texture Selection with Fallback to raw sheet
                if (tier.frames && tier.frames[frameIdx]) {
                    s.texture = tier.frames[frameIdx];
                } else {
                    // FALLBACK: Use the raw sheet if not baked yet
                    const sheet = enemyAssets[typeKey][animType];
                    if (sheet.complete) {
                        const sCols = cfg[animType + 'Cols'], sSize = cfg[animType + 'Size'];
                        const rect = new PIXI.Rectangle((frameIdx % sCols) * sSize, Math.floor(frameIdx / sCols) * sSize, sSize, sSize);
                        s.texture = new PIXI.Texture({ source: PIXI.Texture.from(sheet), frame: rect });
                    }
                }

                // Absolute scale to prevent cumulative growth/flipping issues
                const baseSize = cfg.size * growth;
                s.width = baseSize;
                s.height = baseSize;

                s.alpha = (h <= 0) ? Math.max(0, Math.min(1, 1 - (currentDeathF / cfg.deathFrames - 0.7) * 3.3)) : 1.0;

                // Flip Logic (Absolute set)
                const look = data[idx + 7];
                const isFlipped = cfg.isSideways && Math.abs(look) < 1.57;
                if (isFlipped) s.scale.y = -Math.abs(s.scale.y);
                else s.scale.y = Math.abs(s.scale.y);

            } else {
                s.visible = false;
            }
        } else {
            s.visible = false;
        }
    }

    // 4. RENDER BULLETS
    for (let i = 0; i < totalBullets; i++) {
        bulletSpritePool[i].visible = false;
    }
    const bSize = WEAPON_CONFIG.bulletSize;
    for (let i = 0; i < activeBulletCount; i++) {
        const poolIdx = activeBulletIndices[i];
        const bIdx = poolIdx * BULLET_STRIDE;
        const s = bulletSpritePool[poolIdx];
        const bx = bulletData[bIdx], by = bulletData[bIdx + 1];

        if (bx > left && bx < right && by > top && by < bottom) {
            s.visible = true;
            s.position.set(bx, by);
            s.rotation = Math.atan2(bulletData[bIdx + 3], bulletData[bIdx + 2]);
            // Bullets should be visible even at low zoom - we add a small floor
            s.width = s.height = Math.max(bSize, 5 / zoom);
        }
    }

    // 5. RENDER PLAYER
    const sc = SHIP_CONFIG;
    const sf = Math.floor(player.shipFrame);
    const isFull = player.shipState === 'FULL' || player.shipState === 'THRUST';
    const sTexs = isFull ? shipAssets.pixiFull : shipAssets.pixiOn;
    const curFrame = sf % (isFull ? sc.fullFrames : sc.onFrames);

    playerSprite.position.set(cx, cy);
    playerSprite.rotation = player.rotation;
    playerSprite.width = playerSprite.height = sc.visualSize * zoom;
    if (shipAssets.baked && sTexs && sTexs[curFrame]) {
        playerSprite.texture = sTexs[curFrame];
    }

    // Shield rendering
    if (player.shieldActive && player.shieldAnimState !== 'OFF') {
        const isOn = player.shieldAnimState === 'ON';
        const shTexs = isOn ? shipAssets.pixiShieldOn : shipAssets.pixiShieldTurnOn;
        const shf = Math.floor(player.shieldFrame) % (isOn ? sc.shieldOnFrames : sc.shieldTurnOnFrames);
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
        t.text = dn.val;
        t.alpha = dn.life;
        t.position.set((dn.x - player.x) * zoom + cx, (dn.y - player.y) * zoom + cy);
        t.scale.set(zoom * 2); // Scale text with zoom but keep it readable
    }

    // 7. SKILLS (Triple Ring Supernova)
    const skCfg = SKILLS.MulticolorXFlame;

    // Reset skill pool visibility
    for (let i = 0; i < skillSpritePool.length; i++) skillSpritePool[i].visible = false;

    if (activeSkills.length > 0 && Math.random() < 0.01) {
        console.log(`[RENDER] Drawing ${activeSkills.length} skills, baked=${skillAssets.baked}`);
    }

    for (let i = 0; i < activeSkills.length; i++) {
        if (i >= skillSpritePool.length) break;
        const sData = activeSkills[i];
        const s = skillSpritePool[i];

        // These are world-space offsets relative to the player
        const offX = Math.cos(sData.angle) * sData.radius;
        const offY = Math.sin(sData.angle) * sData.radius;

        s.visible = true;
        s.position.set(player.x + offX, player.y + offY);
        s.width = s.height = sData.size;
        s.rotation = sData.angle + Math.PI / 2;

        const fIdx = Math.floor(sData.frame) % skCfg.skillFrames;
        if (skillAssets.baked && skillAssets.pixiSkill && skillAssets.pixiSkill[fIdx]) {
            s.texture = skillAssets.pixiSkill[fIdx];
        } else if (i === 0 && Math.random() < 0.1) {
            console.warn(`[RENDER] Skill texture missing! baked=${skillAssets.baked}, hasArray=${!!skillAssets.pixiSkill}, frame=${fIdx}`);
        }
    }

    // 8. EFFECTS (Particles)
    drawFX();
    // For now, we manually draw these to the worldContainer's graphics or just sprites
    // (Existing drawFX should be updated to use Pixi)
    // For this turn, I'll update drawFX in effects.js to use worldContainer.graphics
}
