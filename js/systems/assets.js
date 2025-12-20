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
    buttonCache: [],
    skillCache: [],
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
const laserImg = Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" });
let floorPattern = null;

/**
 * BAKE SHIP ANIMATIONS
 */
function bakeShip() {
    if (shipAssets.baked) return;
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
}

/**
 * BAKE SKILL ANIMATIONS
 */
function bakeSkills() {
    if (skillAssets.baked) return;
    const cfg = SKILLS.MulticolorXFlame;
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
const TOTAL_BASIC_ASSETS = (enemyKeys.length * 3) + 1 + 4 + 2 + 1;
const PRIORITY_TIERS = PERFORMANCE.LOD_TIERS.filter(t => t.priority).map(t => t.id);
const BKGD_TIERS = PERFORMANCE.LOD_TIERS.filter(t => !t.priority).map(t => t.id);

const PRIORITY_LOD_COUNT = (enemyKeys.length * PRIORITY_TIERS.length * 3);
const BKGD_LOD_COUNT = (enemyKeys.length * BKGD_TIERS.length * 3);

// Goal for "Ready to Play"
const GRAND_TOTAL = TOTAL_BASIC_ASSETS + PRIORITY_LOD_COUNT + BKGD_LOD_COUNT + (PRIORITY_LOD_COUNT + BKGD_LOD_COUNT) * 2; // images + conversion + prewarm
const PRIORITY_GOAL = TOTAL_BASIC_ASSETS + PRIORITY_LOD_COUNT * 3; // basic + priority images + priority conversion + priority prewarm

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

    // UNLOCK PLAY BUTTON EARLY
    const priorityGoal = totalPriorityWork;
    if (currentTotal >= priorityGoal && !isPriorityDone) {
        isPriorityDone = true;
        if (startBtn) {
            startBtn.style.display = 'inline-block';
            startBtn.innerText = "READY (START LOW RES)";
        }
        status.innerText = "SYSTEMS ONLINE - ENTRANCE READY";
        status.style.color = '#ffcc00';

        // Auto-start if preferred
        checkAutoStart();
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
    initEnemyLODAssets(); // This now handles progressive loading internally
    bakeShip();
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
