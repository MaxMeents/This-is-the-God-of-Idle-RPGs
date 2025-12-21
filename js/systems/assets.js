/**
 * ASSET MANAGEMENT SYSTEM
 * This system handles the raw images and the pre-rendered (baked) frame caches.
 */

// Cache objects for the player ship
const isLocalFile = window.location.protocol === 'file:';
const shipAssets = {
    onImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    fullImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    shieldOnImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    shieldTurnOnImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    onCache: [],        // Stores extracted frames for the standard engine animation
    fullCache: [],      // Stores extracted frames for the full-power engine animation
    shieldOnCache: [],
    shieldTurnOnCache: [],
    baked: false        // Flag to prevent redundant processing
};

// Cache objects for player skills
const skillAssets = {
    buttonImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    skillImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    swordOfLightImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    buttonCache: [],
    skillCache: [],
    swordOfLightCache: [],
    baked: false,
    ready: false
};

/**
 * ENEMY ASSET HUB
 * Dynamically builds storage for every enemy type defined in enemies.js.
 * This structure tracks the raw sheets and multiple performance 'tiers' of baked frames.
 */
const enemyAssets = {};
enemyKeys.forEach(k => {
    enemyAssets[k] = {
        walk: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
        death: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
        attack: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
        caches: { walk: {}, death: {}, attack: {} }
    };
});

const floorImg = Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" });
const weaponAssets = {
    leftBulletImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    rightBulletImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    laserImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" })
};
let floorPattern = null;

/**
 * BAKE SHIP ANIMATIONS
 */
function bakeShip() {
    if (shipAssets.baked) return;

    // CRITICAL: Verify all ship images are fully loaded before baking
    const allImagesLoaded =
        shipAssets.onImg.complete && shipAssets.onImg.naturalWidth > 0 &&
        shipAssets.fullImg.complete && shipAssets.fullImg.naturalWidth > 0 &&
        shipAssets.shieldOnImg.complete && shipAssets.shieldOnImg.naturalWidth > 0 &&
        shipAssets.shieldTurnOnImg.complete && shipAssets.shieldTurnOnImg.naturalWidth > 0;

    if (!allImagesLoaded) {
        console.warn('[SHIP] Cannot bake ship - images not fully loaded yet');
        return;
    }

    console.log('[SHIP] All ship images loaded, baking textures...');
    const sc = SHIP_CONFIG;
    const bake = (img, frames, cols, size, targetCache, targetSize) => {
        for (let i = 0; i < frames; i++) {
            const can = document.createElement('canvas');
            can.width = targetSize;
            can.height = targetSize;
            const cctx = can.getContext('2d');
            cctx.drawImage(img, (i % cols) * size, Math.floor(i / cols) * size, size, size, 0, 0, targetSize, targetSize);
            targetCache.push(can);
        }
    };
    bake(shipAssets.onImg, sc.onFrames, sc.onCols, sc.onSize, shipAssets.onCache, 512);
    bake(shipAssets.fullImg, sc.fullFrames, sc.fullCols, sc.fullSize, shipAssets.fullCache, 512);
    bake(shipAssets.shieldOnImg, sc.shieldOnFrames, sc.shieldOnCols, sc.shieldOnSize, shipAssets.shieldOnCache, 768);
    bake(shipAssets.shieldTurnOnImg, sc.shieldTurnOnFrames, sc.shieldTurnOnCols, sc.shieldTurnOnSize, shipAssets.shieldTurnOnCache, 512);

    shipAssets.pixiOn = shipAssets.onCache.map(c => PIXI.Texture.from(c));
    shipAssets.pixiFull = shipAssets.fullCache.map(c => PIXI.Texture.from(c));
    shipAssets.pixiShieldOn = shipAssets.shieldOnCache.map(c => PIXI.Texture.from(c));
    shipAssets.pixiShieldTurnOn = shipAssets.shieldTurnOnCache.map(c => PIXI.Texture.from(c));
    shipAssets.baked = true;
    console.log('[SHIP] Ship textures baked successfully!');
}

/**
 * BAKE SKILL ANIMATIONS
 */
function bakeSkills() {
    if (skillAssets.baked) return;
    const cfg = SKILLS.Tier3; // Use Tier 3 as the base for baking assets
    for (let i = 0; i < cfg.buttonFrames; i++) {
        const can = document.createElement('canvas'); can.width = 512; can.height = 512;
        const cctx = can.getContext('2d');
        cctx.drawImage(skillAssets.buttonImg, (i % cfg.buttonCols) * cfg.buttonSize, Math.floor(i / cfg.buttonCols) * cfg.buttonSize, cfg.buttonSize, cfg.buttonSize, 0, 0, 512, 512);
        skillAssets.buttonCache.push(can);
    }
    for (let i = 0; i < cfg.skillFrames; i++) {
        const can = document.createElement('canvas'); can.width = 512; can.height = 512;
        const cctx = can.getContext('2d');
        cctx.drawImage(skillAssets.skillImg, (i % cfg.skillCols) * cfg.skillSize, Math.floor(i / cfg.skillCols) * cfg.skillSize, cfg.skillSize, cfg.skillSize, 0, 0, 512, 512);
        skillAssets.skillCache.push(can);
    }
    skillAssets.pixiButton = skillAssets.buttonCache.map(c => PIXI.Texture.from(c));
    skillAssets.pixiSkill = skillAssets.skillCache.map(c => PIXI.Texture.from(c));

    // Bake Sword of Light
    const socfg = SKILLS.SwordOfLight;
    for (let i = 0; i < socfg.skillFrames; i++) {
        const can = document.createElement('canvas'); can.width = 512; can.height = 512; // Downscale for cache/button
        const cctx = can.getContext('2d');
        cctx.drawImage(skillAssets.swordOfLightImg, (i % socfg.skillCols) * socfg.skillSize, Math.floor(i / socfg.skillCols) * socfg.skillSize, socfg.skillSize, socfg.skillSize, 0, 0, 512, 512);
        skillAssets.swordOfLightCache.push(can);
    }
    skillAssets.pixiSwordOfLight = skillAssets.swordOfLightCache.map(c => PIXI.Texture.from(c));

    skillAssets.baked = true;
}

/**
 * LOADING GATEKEEPER
 */
function onAssetLoad() {
    loadedCt++;
    updateLoadingProgress();
}

// Progressive Loading Strategy
const TOTAL_BASIC_ASSETS = (enemyKeys.length * 3) + 1 + 4 + 3 + 3; // +3 for skills (btn, skill, sword)
const PRIORITY_TIERS = PERFORMANCE.LOD_TIERS.filter(t => t.priority).map(t => t.id);
const BKGD_TIERS = PERFORMANCE.LOD_TIERS.filter(t => !t.priority).map(t => t.id);

const PRIORITY_LOD_COUNT = (enemyKeys.length * PRIORITY_TIERS.length * 3);
const BKGD_LOD_COUNT = (enemyKeys.length * BKGD_TIERS.length * 3);

// Goal for "Ready to Play"
const GRAND_TOTAL = TOTAL_BASIC_ASSETS + (PRIORITY_LOD_COUNT + BKGD_LOD_COUNT) * 3;
const MINIMUM_GOAL = TOTAL_BASIC_ASSETS + (enemyKeys.length * 3 * 3); // Basic + Micro Images + Micro Conv + Micro Warm

let conversionCt = 0;
let prewarmCt = 0;
let isPriorityDone = false;

function updateLoadingProgress() {
    const bar = document.getElementById('progress-bar');
    const status = document.getElementById('loading-status');
    const startBtn = document.getElementById('start-game-btn');

    const currentTotal = loadedCt + conversionCt + prewarmCt;

    // Simplifed grand total to be more robust
    const totalPriorityWork = TOTAL_BASIC_ASSETS + (PRIORITY_LOD_COUNT * 2);
    const totalBkgdWork = BKGD_LOD_COUNT * 2;
    const finalTotal = totalPriorityWork + totalBkgdWork;

    const progress = Math.min(100, (currentTotal / finalTotal) * 100);
    if (bar) bar.style.width = progress + '%';

    if (status) {
        if (!isPriorityDone) {
            const phase = loadedCt < (TOTAL_BASIC_ASSETS + PRIORITY_LOD_COUNT) ? "Synchronizing" : (conversionCt < PRIORITY_LOD_COUNT ? "Building" : "Warming");
            status.innerText = `${phase} Performance Tiers... (${currentTotal}/${totalPriorityWork})`;
        } else {
            const bkgdDone = (loadedCt - TOTAL_BASIC_ASSETS - PRIORITY_LOD_COUNT) + (conversionCt - PRIORITY_LOD_COUNT) + (prewarmCt - PRIORITY_LOD_COUNT);
            if (bkgdDone < totalBkgdWork) {
                status.innerText = "SYSTEMS ONLINE - Streaming Ultra Textures...";
                status.style.color = '#00ffcc';
            } else {
                status.innerText = "ALL SYSTEMS OPTIMIZED (ULTRA QUALITY)";
                status.style.color = '#ffcc00';
            }
        }
    }

    // UNLOCK PLAY BUTTON EARLY (Once Micro tier is ready)
    if (currentTotal >= MINIMUM_GOAL && !isPriorityDone) {
        isPriorityDone = true;
        if (startBtn) {
            startBtn.style.display = 'inline-block';
            startBtn.innerText = "BEGIN COMBAT";
        }
        status.innerText = "MINIMUM ASSETS LOADED - READY TO PLAY";
        status.style.color = '#00ff00';
        checkAutoStart();
    }

    // Show completion when all assets loaded
    if (currentTotal >= GRAND_TOTAL) {
        status.innerText = "ALL ASSETS LOADED - ULTRA QUALITY";
        status.style.color = '#00ff00';
    }
}

// Global Startup Trigger
document.getElementById('start-game-btn').addEventListener('click', () => {
    document.getElementById('loading-screen').style.opacity = '0';
    gamePaused = false;
    localStorage.setItem('assetsLoaded', 'true');
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        for (let i = 0; i < spawnIndex; i++) {
            spawnEnemy(i, spawnList[i], true);
        }
    }, 800);
});

function checkAutoStart() {
    if (localStorage.getItem('assetsLoaded') === 'true') {
        setTimeout(() => {
            const btn = document.getElementById('start-game-btn');
            if (btn && btn.style.display !== 'none') btn.click();
        }, 100);
    }
}

function finalizeAssets() {
    document.body.style.backgroundImage = `url("${FLOOR_PATH}")`;
    floorPattern = true;
    bakeShip();
    bakeSkills(); // Bake buttons/skills now that images are loaded

    // CRITICAL: Don't start the game until ship is baked
    if (!shipAssets.baked) {
        console.warn('[SHIP] Ship not baked yet, retrying in 100ms...');
        setTimeout(finalizeAssets, 100);
        return;
    }

    console.log('[GAME] All assets ready, initializing game...');
    init(true);
}

onAssetLoad = function () {
    loadedCt++;
    updateLoadingProgress();
    if (loadedCt >= TOTAL_BASIC_ASSETS && !finalizeAssets.triggered) {
        finalizeAssets.triggered = true;
        finalizeAssets();
    }
};

// Start Loading Process When Scripts Are Ready
window.addEventListener('DOMContentLoaded', () => {
    initEnemyLODAssets();

    shipAssets.onImg.src = SHIP_CONFIG.onPath;
    shipAssets.onImg.onload = onAssetLoad;
    shipAssets.onImg.onerror = () => console.error('[SHIP] Failed to load onImg:', SHIP_CONFIG.onPath);

    shipAssets.fullImg.src = SHIP_CONFIG.fullPath;
    shipAssets.fullImg.onload = onAssetLoad;
    shipAssets.fullImg.onerror = () => console.error('[SHIP] Failed to load fullImg:', SHIP_CONFIG.fullPath);

    shipAssets.shieldOnImg.src = SHIP_CONFIG.shieldOnPath;
    shipAssets.shieldOnImg.onload = onAssetLoad;
    shipAssets.shieldOnImg.onerror = () => console.error('[SHIP] Failed to load shieldOnImg:', SHIP_CONFIG.shieldOnPath);

    shipAssets.shieldTurnOnImg.src = SHIP_CONFIG.shieldTurnOnPath;
    shipAssets.shieldTurnOnImg.onload = onAssetLoad;
    shipAssets.shieldTurnOnImg.onerror = () => console.error('[SHIP] Failed to load shieldTurnOnImg:', SHIP_CONFIG.shieldTurnOnPath);

    floorImg.src = FLOOR_PATH;
    floorImg.onload = onAssetLoad;
    weaponAssets.leftBulletImg.src = WEAPON_CONFIG.bullet_left_side.path;
    weaponAssets.leftBulletImg.onload = onAssetLoad;
    weaponAssets.rightBulletImg.src = WEAPON_CONFIG.bullet_right_side.path;
    weaponAssets.rightBulletImg.onload = onAssetLoad;
    weaponAssets.laserImg.src = WEAPON_CONFIG.laser.path;
    weaponAssets.laserImg.onload = onAssetLoad;
});

