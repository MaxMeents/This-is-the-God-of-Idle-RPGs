/**
 * ASSET MANAGEMENT SYSTEM
 * This system handles the raw images and the pre-rendered (baked) frame caches.
 */

// Cache objects for the player ship
const shipAssets = {
    onImg: new Image(),
    fullImg: new Image(),
    shieldOnImg: new Image(),
    shieldTurnOnImg: new Image(),
    onCache: [],        // Stores extracted frames for the standard engine animation
    fullCache: [],      // Stores extracted frames for the full-power engine animation
    shieldOnCache: [],
    shieldTurnOnCache: [],
    baked: false        // Flag to prevent redundant processing
};

// Cache objects for player skills
const skillAssets = {
    buttonImg: new Image(),
    skillImg: new Image(),
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
        walk: new Image(),
        death: new Image(),
        attack: new Image(),
        caches: { walk: {}, death: {}, attack: {} }
    };
});

const floorImg = new Image();
const laserImg = new Image();
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
    skillAssets.baked = true;
}

/**
 * LOADING GATEKEEPER
 * Increments a counter for every image loaded. When the total matches the
 * expected asset count, it removes the loading screen and kicks off the 
 * physics engine (init).
 */
function onAssetLoad() {
    loadedCt++;
    const totalToLoad = (enemyKeys.length * 3) + 1 + 4 + 2 + 1; // enemies + floor + ship + skills + laser

    if (loadedCt >= totalToLoad) {
        document.getElementById('loading').style.display = 'none';
        document.body.style.backgroundImage = `url("${FLOOR_PATH}")`;
        floorPattern = true;

        // Start background baking for enemies
        enemyKeys.forEach(k => buildEnemyCache(k));
        bakeShip();

        // Finalize initialization
        init(true);
    }
}
