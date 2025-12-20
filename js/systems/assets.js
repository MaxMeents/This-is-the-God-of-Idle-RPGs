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
 * Extracts individual frames from the ship's sprite sheets and stores them as 
 * small canvas objects. This is much faster than repeatedly slicing a 
 * giant image every frame using drawImage's multi-argument version.
 */
function bakeShip() {
    if (shipAssets.baked) return;
    const sc = SHIP_CONFIG;

    // Helper function to slice a sheet into a list of canvases
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

    // Process all ship states
    bake(shipAssets.onImg, sc.onFrames, sc.onCols, sc.onSize, shipAssets.onCache, 512);
    bake(shipAssets.fullImg, sc.fullFrames, sc.fullCols, sc.fullSize, shipAssets.fullCache, 512);
    bake(shipAssets.shieldOnImg, sc.shieldOnFrames, sc.shieldOnCols, sc.shieldOnSize, shipAssets.shieldOnCache, 768);
    bake(shipAssets.shieldTurnOnImg, sc.shieldTurnOnFrames, sc.shieldTurnOnCols, sc.shieldTurnOnSize, shipAssets.shieldTurnOnCache, 512);

    // Convert to PIXI textures
    shipAssets.pixiOn = shipAssets.onCache.map(c => PIXI.Texture.from(c));
    shipAssets.pixiFull = shipAssets.fullCache.map(c => PIXI.Texture.from(c));
    shipAssets.pixiShieldOn = shipAssets.shieldOnCache.map(c => PIXI.Texture.from(c));
    shipAssets.pixiShieldTurnOn = shipAssets.shieldTurnOnCache.map(c => PIXI.Texture.from(c));

    shipAssets.baked = true;
}

/**
 * BAKE SKILL ANIMATIONS
 * Same logic as bakeShip, but for the skill icons and particles.
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

    // Convert to PIXI textures
    skillAssets.pixiButton = skillAssets.buttonCache.map(c => PIXI.Texture.from(c));
    skillAssets.pixiSkill = skillAssets.skillCache.map(c => PIXI.Texture.from(c));

    skillAssets.baked = true;
}

/**
 * LOADING GATEKEEPER
 * Updates the progress bar and unlocks the play button only when everything is ready.
 */
function onAssetLoad() {
    loadedCt++;
    updateLoadingProgress();
}

function updateLoadingProgress() {
    const totalToLoad = (enemyKeys.length * 3) + 1 + 4 + 2 + 1;
    // We expect 3 animations * 4 tiers for each enemy initially
    const expectedBakes = (enemyKeys.length * 3 * 4);
    const total = totalToLoad + expectedBakes;

    const currentProgress = loadedCt + bakesCt;
    const progress = Math.min(100, (currentProgress / total) * 100);

    const bar = document.getElementById('progress-bar');
    const status = document.getElementById('loading-status');
    const startBtn = document.getElementById('start-game-btn');

    if (bar) bar.style.width = progress + '%';
    if (status) {
        if (progress < 40) status.innerText = `Synchronizing Combat Data... (${loadedCt}/${totalToLoad})`;
        else if (progress < 99) status.innerText = `Baking GPU Textures... (${bakesCt}/${expectedBakes})`;
        else status.innerText = "SYSTEMS ONLINE";
    }

    // ONLY SHOW BUTTON IF ALL IMAGES ARE LOADED AND ALL BAKES ARE DONE
    if (loadedCt >= totalToLoad && workerTasksCount === 0 && startBtn) {
        if (bar) bar.style.width = '100%';
        startBtn.style.display = 'inline-block';
        status.style.color = '#ffcc00';
        status.innerText = "SYSTEMS ONLINE";
    }
}

// Global Startup Trigger
document.getElementById('start-game-btn').addEventListener('click', () => {
    document.getElementById('loading-screen').style.opacity = '0';
    gamePaused = false; // ACTIVATE SIMULATION
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        // Reposition all enemies to start appearing around the new location
        for (let i = 0; i < spawnIndex; i++) {
            spawnEnemy(i, spawnList[i], true);
        }
    }, 800);
});

function finalizeAssets() {
    document.body.style.backgroundImage = `url("${FLOOR_PATH}")`;
    floorPattern = true;

    // Start background baking for enemies
    enemyKeys.forEach(k => buildEnemyCache(k));
    bakeShip();

    // Finalize initialization
    init(true);
}

// We change onAssetLoad logic to check for the final batch
const originalOnAssetLoad = onAssetLoad;
onAssetLoad = function () {
    loadedCt++;
    const totalToLoad = (enemyKeys.length * 3) + 1 + 4 + 2 + 1;
    updateLoadingProgress();

    if (loadedCt >= totalToLoad) {
        finalizeAssets();
    }
};
