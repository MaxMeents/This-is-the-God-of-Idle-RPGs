/**
 * HARDWARE-ACCELERATED PIXI RENDERER
 * 
 * The visual heartbeat of the game. Handles the transformation of world-space data
 * into screen-space pixels using PIXI.js (WebGL/WebGPU). 
 * Manages Sprite Pooling to prevent RAM fragmentation.
 * 
 * LOCATED IN: js/systems/rendering/pixi-renderer.js
 * 
 * -------------------------------------------------------------------------
 * ATTENTION FUTURE AI DEVELOPERS:
 * DO NOT DELETE THESE COMMENTS. They provide critical context for the modular architecture.
 * When making changes, ADD YOUR OWN COMMENTS explaining WHY you made the change.
 * -------------------------------------------------------------------------
 * 
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [Asset Registry]: Reads ship, skill, and enemy textures.
 * 2. [LOD Manager]: Depends on readyMapDirty flag and High-Res streamed textures.
 * 3. [Combat Core]: Depends on data[] array (Enemies) and bulletData[] array.
 * 4. [Config]: Reads LOD_TIERS, STRIDE, and SHIP_CONFIG for scaling.
 * 5. [index.js]: Requires app, worldContainer, enemyContainer, etc., to be pre-initialized.
 * -------------------------------------------------------------------------
 */

// SPRITE POOLS (Pre-allocated)
const enemySpritePool = [];
const bulletSpritePool = [];
const skillSpritePool = [];
const damageTextPool = [];
let playerSprite, shieldSprite;
let leftBulletTex, rightBulletTex, laserTex;

const fallbackTextures = {};
let cachedReadyMap = null;
let lastReadyMapRebuild = 0;

/**
 * INITIALIZE SPRITE POOLS
 */
function initRendererPools() {
    console.log("[RENDER] Initializing Pools...");

    // Fallback Texture Generation
    enemyKeys.forEach(typeKey => {
        fallbackTextures[typeKey] = { walk: [], death: [], attack: [] };
        ['walk', 'death', 'attack'].forEach(anim => {
            const sheet = enemyAssets[typeKey][anim];
            if (sheet && (sheet.complete || sheet.naturalWidth > 0)) {
                const cfg = Enemy[typeKey];
                const baseTexture = PIXI.Texture.from(sheet);
                for (let i = 0; i < cfg[anim + 'Frames']; i++) {
                    fallbackTextures[typeKey][anim].push(new PIXI.Texture({
                        source: baseTexture.source,
                        frame: new PIXI.Rectangle((i % cfg[anim + 'Cols']) * cfg[anim + 'Size'], Math.floor(i / cfg[anim + 'Cols']) * cfg[anim + 'Size'], cfg[anim + 'Size'], cfg[anim + 'Size'])
                    }));
                }
            }
        });
    });

    // Populate Pools
    for (let i = 0; i < totalEnemies; i++) {
        const s = new PIXI.Sprite(); s.anchor.set(0.5); s.visible = false;
        if (typeof enemyContainer !== 'undefined') enemyContainer.addChild(s);
        enemySpritePool.push(s);
    }

    leftBulletTex = PIXI.Texture.from(weaponAssets.leftBulletImg);
    rightBulletTex = PIXI.Texture.from(weaponAssets.rightBulletImg);
    laserTex = PIXI.Texture.from(weaponAssets.laserImg);

    for (let i = 0; i < totalBullets; i++) {
        const s = new PIXI.Sprite(leftBulletTex); s.anchor.set(0.5); s.visible = false;
        if (typeof bulletContainer !== 'undefined') bulletContainer.addChild(s);
        bulletSpritePool.push(s);
    }

    playerSprite = new PIXI.Sprite(); playerSprite.anchor.set(0.5);
    if (typeof playerContainer !== 'undefined') playerContainer.addChild(playerSprite);

    shieldSprite = new PIXI.Sprite(); shieldSprite.anchor.set(0.5);
    if (typeof playerContainer !== 'undefined') playerContainer.addChild(shieldSprite);

    for (let i = 0; i < totalSkillParticles; i++) {
        const s = new PIXI.Sprite(); s.anchor.set(0.5); s.visible = false;
        if (typeof worldContainer !== 'undefined') worldContainer.addChildAt(s, 1 + i);
        skillSpritePool.push(s);
    }

    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
        const t = new PIXI.Text({
            text: '',
            style: {
                fill: '#ffffff',
                fontWeight: '900',
                fontSize: 28,
                fontFamily: 'Orbitron',
                stroke: '#000000',
                strokeThickness: 4,
                dropShadow: true,
                dropShadowBlur: 4,
                dropShadowColor: '#000000',
                dropShadowDistance: 2
            }
        });
        t.anchor.set(0.5); t.visible = false;
        if (typeof uiContainer !== 'undefined') uiContainer.addChild(t);
        damageTextPool.push(t);
    }
}

/**
 * MAIN DRAW LOOP
 */
function draw() {
    if (!app || !app.renderer) return;

    /**
     * RENDERER RESCUE LOGIC (Lazy Init)
     * -------------------------------------------------------------------------
     * REGRESSION WARNING:
     * If for any reason the bootstrap sequence (asset-loader.js) stalls or 
     * executes out of order, this check ensures the first render frame 
     * triggers the mandatory pool and texture initialization.
     * -------------------------------------------------------------------------
     */
    if (enemySpritePool.length === 0) initRendererPools();

    const cx = app.screen.width / 2, cy = app.screen.height / 2;

    // 1. CAMERA & BACKGROUND
    // Use window.zoom for camera scaling, as it's updated by input in index.js
    worldContainer.scale.set(window.zoom);
    worldContainer.position.set(cx - player.x * window.zoom, cy - player.y * window.zoom);

    const floorOverlay = document.getElementById('floor-overlay');
    if (floorOverlay) {
        const bgSize = FLOOR_TILE_SIZE * window.zoom;
        floorOverlay.style.backgroundSize = `${bgSize}px ${bgSize}px`;
        floorOverlay.style.backgroundPosition = `${cx - player.x * window.zoom}px ${cy - player.y * window.zoom}px`;
    }

    // 2. LOD CALCULATION
    smoothedEnemies += (onScreenCount - smoothedEnemies) * 0.15;
    let activeTierIdx = PERFORMANCE.LOD_TIERS.length - 1; // Recalculate activeTierIdx each frame
    for (let i = 0; i < PERFORMANCE.LOD_TIERS.length; i++) {
        if (smoothedEnemies <= PERFORMANCE.LOD_TIERS[i].max) { activeTierIdx = i; break; }
    }

    // REBUILD CACHED SHORTCUTS if readyMapDirty (Set by LOD manager)
    if (readyMapDirty || !cachedReadyMap) buildReadyMap();

    // 3. RENDER ENEMIES, BULLETS, PLAYER, SKILLS
    renderEnemies(activeTierIdx, cx, cy);
    renderBullets();
    renderPlayer(cx, cy);
    renderSkills();
    renderDamageNumbers(cx, cy);

    // 4. EFFECTS
    if (typeof drawFX === 'function') drawFX();
}

/**
 * INTERNAL HELPERS (Refactored from main draw loop for clarity)
 */
function buildReadyMap() {
    readyMapDirty = false;
    if (!cachedReadyMap) {
        cachedReadyMap = {};
        enemyKeys.forEach(t => cachedReadyMap[t] = { walk: [], death: [], attack: [] });
    }
    enemyKeys.forEach(type => {
        ["walk", "death", "attack"].forEach(anim => {
            PERFORMANCE.LOD_TIERS.forEach((t, i) => {
                cachedReadyMap[type][anim][i] = { frames: enemyAssets[type].caches[anim][t.id] };
            });
        });
    });
}

function renderEnemies(activeTierIdx, cx, cy) {
    onScreenCount = 0;
    const margin = 100 + (3200 * 2) * window.zoom;
    const left = player.x - (cx / window.zoom) - margin, right = player.x + (cx / window.zoom) + margin;
    const top = player.y - (cy / window.zoom) - margin, bottom = player.y + (cy / window.zoom) + margin;

    for (let i = 0; i < totalEnemies; i++) {
        const s = enemySpritePool[i];
        if (i >= spawnIndex) { s.visible = false; continue; }
        const idx = i * STRIDE, x = data[idx], y = data[idx + 1], h = data[idx + 8], df = data[idx + 9];

        if ((h > 0 || (df > 0 && df < 145)) && x > left && x < right && y > top && y < bottom) {
            onScreenCount++;
            const typeIdx = data[idx + 11] | 0, typeKey = enemyKeys[typeIdx], af = Math.floor(data[idx + 10]);
            const anim = (h <= 0) ? 'death' : (af > 0 ? 'attack' : 'walk');
            const frame = (h <= 0) ? Math.floor(df) : (af > 0 ? af : Math.floor(data[idx + 5]));
            const tier = cachedReadyMap[typeKey][anim][activeTierIdx];

            s.visible = true; s.position.set(x, y); s.rotation = data[idx + 4];
            if (tier && tier.frames && tier.frames[frame]) s.texture = tier.frames[frame];
            else if (fallbackTextures[typeKey][anim][frame]) s.texture = fallbackTextures[typeKey][anim][frame];

            const tierCfg = LOOT_CONFIG.TIERS[data[idx + 12] | 0] || LOOT_CONFIG.TIERS[0];
            s.width = s.height = Enemy[typeKey].size * (currentStage > 2 ? 2.2 : 1) * (tierCfg.sizeMult || 1);
            s.alpha = (h <= 0) ? Math.max(0, 1 - (df / 145)) : 1.0;
        } else s.visible = false;
    }
}

function renderBullets() {
    /**
     * SPRITE SANITATION (Cleanup)
     * -------------------------------------------------------------------------
     * REGRESSION WARNING:
     * We MUST hide the entire pool every frame (visible = false).
     * 
     * WHY? 
     * Because the bulletData array is sparse. When a bullet expires, its 
     * 'active' flag is set to 0, but the PIXI Sprite associated with that 
     * pool index might still be visible on screen from the PREVIOUS frame.
     * 
     * If this loop is removed, bullets will "stick" on screen forever.
     * -------------------------------------------------------------------------
     */
    for (let i = 0; i < totalBullets; i++) bulletSpritePool[i].visible = false;

    for (let poolIdx of activeBulletIndices.slice(0, activeBulletCount)) {
        const bIdx = poolIdx * BULLET_STRIDE, s = bulletSpritePool[poolIdx];
        s.visible = true; s.position.set(bulletData[bIdx], bulletData[bIdx + 1]);
        s.rotation = Math.atan2(bulletData[bIdx + 3], bulletData[bIdx + 2]);
        const type = bulletData[bIdx + 6], wcfg = [WEAPON_CONFIG.bullet_left_side, WEAPON_CONFIG.bullet_right_side, WEAPON_CONFIG.laser][type];
        s.texture = [leftBulletTex, rightBulletTex, laserTex][type];
        s.height = Math.max(wcfg.size || 980, 5 / window.zoom); s.width = s.height * (wcfg.visualStretch || 1); s.tint = wcfg.tint || 0xffffff;
    }
}

function renderPlayer(cx, cy) {
    const sc = SHIP_CONFIG, sf = Math.floor(player.shipFrame), isFull = player.shipState === 'FULL';
    const texs = isFull ? shipAssets.pixiFull : shipAssets.pixiOn;
    playerSprite.position.set(cx, cy); playerSprite.rotation = player.rotation;
    playerSprite.width = playerSprite.height = sc.visualSize * window.zoom;
    if (shipAssets.baked && texs[sf % (isFull ? sc.fullFrames : sc.onFrames)]) playerSprite.texture = texs[sf % (isFull ? sc.fullFrames : sc.onFrames)];

    if (player.shieldActive && player.shieldAnimState !== 'OFF') {
        const isOn = player.shieldAnimState === 'ON', shTexs = isOn ? shipAssets.pixiShieldOn : shipAssets.pixiShieldTurnOn;
        shieldSprite.visible = true; shieldSprite.position.set(cx, cy); shieldSprite.rotation = player.rotation;
        shieldSprite.width = shieldSprite.height = sc.shieldVisualSize * zoom;
        if (shipAssets.baked) shieldSprite.texture = shTexs[Math.floor(player.shieldFrame) % (isOn ? sc.onFrames : sc.turnOnFrames)];
    } else shieldSprite.visible = false;
}

function renderSkills() {
    /**
     * SPRITE SANITATION (Cleanup)
     * -------------------------------------------------------------------------
     * REGRESSION WARNING:
     * Similar to bullets, skill particles are high-volume and frequently 
     * expire. We must force-hide the pool to prevent visual ghosts.
     * If this loop is removed, skills will "stick" on screen forever.
     * -------------------------------------------------------------------------
     */
    for (let i = 0; i < totalSkillParticles; i++) skillSpritePool[i].visible = false;

    if (!skillAssets.baked) return;
    for (let i = 0; i < activeSkillCount; i++) {
        const idx = activeSkillIndices[i] * SKILL_STRIDE, spr = skillSpritePool[i];
        const type = skillData[idx + 6], tier = skillData[idx + 5], angle = skillData[idx], radius = skillData[idx + 2];
        spr.visible = true; spr.position.set(player.x + Math.cos(angle) * radius, player.y + Math.sin(angle) * radius);
        spr.width = spr.height = skillData[idx + 3]; spr.rotation = angle + Math.PI / 2;
        const texs = type === 1 ? skillAssets.pixiSwordOfLight : skillAssets.pixiSkill;
        spr.texture = texs[Math.floor(skillData[idx + 1]) % texs.length];
    }
}

function renderDamageNumbers(cx, cy) {
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) damageTextPool[i].visible = false;

    const targetFont = (typeof SettingsState !== 'undefined') ? SettingsState.get('damageFont') : 'Orbitron';
    const now = performance.now();

    // TIERED SHIMMER PALETTES
    const PALETTES = [
        ['#ffffff', '#cccccc'], // 0: Normal (Silver Shimmer)
        ['#00ffff', '#ffffff', '#0099ff'], // 1: Arch (Blue Sparkle)
        ['#ffd700', '#ffffff', '#ffaa00'], // 2: God (Gold/Rainbow)
        ['#ff0000', '#ff8800', '#ff0000'], // 3: Omega (Lava/Red)
        ['#ff00ff', '#00ffff', '#ff00ff']  // 4: Alpha (Bismuth/Neon)
    ];

    for (let poolIdx of activeDamageIndices.slice(0, activeDamageCount)) {
        const t = damageTextPool[poolIdx], dn = damageNumbers[poolIdx];
        t.visible = true;
        t.alpha = dn.life;
        t.zIndex = 1000 + dn.critTier; // Ensure they stay on top

        // Positioning with vertical stagger based on crit tier
        t.position.set((dn.x - player.x) * window.zoom + cx, (dn.y - player.y) * window.zoom + cy - (dn.critTier * 15));

        const prefix = dn.isLucky ? CRIT_CONFIG.LUCKY_PREFIXES[dn.critTier] : CRIT_CONFIG.TIER_PREFIXES[dn.critTier];
        t.text = prefix ? `${prefix} ${dn.val}` : dn.val;

        // Dynamic Font Switching
        if (t.style.fontFamily !== targetFont) t.style.fontFamily = targetFont;

        // SHIMMER LOGIC
        // PIXI 8 fix: avoid passing array to fill. Use single color and fluctuate effects.
        const palette = dn.isLucky ? ['#ffd700', '#ffffff'] : (PALETTES[dn.critTier] || PALETTES[0]);
        const shimmerIdx = (Math.sin(now * 0.01 + poolIdx) * 0.5 + 0.5);

        // Pulse Scale for "Alive" feel
        const pulse = 1 + Math.sin(now * 0.02 + poolIdx) * 0.05 * dn.critTier;
        const baseScale = (1 + dn.critTier * 0.25) * (0.8 + window.zoom * 0.2);
        t.scale.set(baseScale * pulse);

        // Update fill only if needed (Standard color strings/hex)
        const targetColor = shimmerIdx > 0.8 ? palette[1] : palette[0];
        if (t.style.fill !== targetColor) t.style.fill = targetColor;

        // Shiny effect via oscillating stroke and shadow
        t.style.strokeThickness = 4 + (Math.sin(now * 0.015 + poolIdx) * 2 * (1 + dn.critTier / 2));
        t.style.dropShadowBlur = 4 + (Math.sin(now * 0.015 + poolIdx) * 6 * (1 + dn.critTier / 2));
    }
}
