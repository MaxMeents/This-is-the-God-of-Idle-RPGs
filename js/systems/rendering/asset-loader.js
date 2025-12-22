/**
 * ASSET LOADER & BOOTSTRAPPER
 * 
 * Orchestrates the initial download of all critical game assets (Ship, Weapons, Floor).
 * Manages the loading screen UI and the transition into the game world.
 * 
 * LOCATED IN: js/systems/rendering/asset-loader.js
 * 
 * -------------------------------------------------------------------------
 * ATTENTION FUTURE AI DEVELOPERS:
 * DO NOT DELETE THESE COMMENTS. They provide critical context for the modular architecture.
 * When making changes, ADD YOUR OWN COMMENTS explaining WHY you made the change.
 * -------------------------------------------------------------------------
 * 
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [Asset Registry]: Sets the .src for images defined there.
 * 2. [LOD Manager]: initEnemyLODAssets() is called to start the enemy sprite pipeline.
 * 3. [Texture Baker]: bakeShip() and bakeSkills() are called once basic assets land.
 * 4. [Config System]: Reads paths from SHIP_CONFIG, WEAPON_CONFIG, FLOOR_PATH.
 * 5. [index.html]: Requires progress-bar, loading-status, and start-game-btn elements.
 * -------------------------------------------------------------------------
 */

// LOADING COUNTERS (Managed in state.js via window.LOAD_STATE)

// LOADING MATH (Determined in assets.js originally)
const TOTAL_BASIC_ASSETS = (typeof enemyKeys !== 'undefined' ? enemyKeys.length * 3 : 0) + 1 + 4 + 3 + 3;
const PRIORITY_TIERS = PERFORMANCE.LOD_TIERS.filter(t => t.priority).map(t => t.id);
const BKGD_TIERS = PERFORMANCE.LOD_TIERS.filter(t => !t.priority).map(t => t.id);

const PRIORITY_LOD_COUNT = (typeof enemyKeys !== 'undefined' ? enemyKeys.length * PRIORITY_TIERS.length * 3 : 0);
const BKGD_LOD_COUNT = (typeof enemyKeys !== 'undefined' ? enemyKeys.length * BKGD_TIERS.length * 3 : 0);

const MINIMUM_GOAL = TOTAL_BASIC_ASSETS + (typeof enemyKeys !== 'undefined' ? enemyKeys.length * 3 * 2 : 0);
const GRAND_TOTAL = TOTAL_BASIC_ASSETS + (PRIORITY_LOD_COUNT * 2);

/**
 * UPDATE LOADING UI
 * Updates the CSS width of the progress bar and the status text.
 */
window.updateLoadingProgress = function () {
    const bar = document.getElementById('progress-bar');
    const status = document.getElementById('loading-status');
    const startBtn = document.getElementById('start-game-btn');

    const currentTotal = loadedCt + conversionCt + prewarmCt;
    const totalPriorityWork = TOTAL_BASIC_ASSETS + (PRIORITY_LOD_COUNT * 2);
    const totalBkgdWork = BKGD_LOD_COUNT * 2;
    const finalTotal = totalPriorityWork + totalBkgdWork;

    const progress = Math.min(100, (currentTotal / finalTotal) * 100);
    if (bar) bar.style.width = progress + '%';

    if (status) {
        if (!isPriorityDone) {
            const phase = loadedCt < (TOTAL_BASIC_ASSETS + PRIORITY_LOD_COUNT) ? "Synchronizing" : (conversionCt < (PRIORITY_LOD_COUNT) ? "Building" : "Warming");
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

    // EARLY UNLOCK: Once Micro/Standard tiers are ready
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

    if (currentTotal >= GRAND_TOTAL && status) {
        status.innerText = "ALL ASSETS LOADED - ULTRA QUALITY";
        status.style.color = '#00ff00';
    }
}

/**
 * ASSET LOAD CALLBACK
 * Called whenever ANY image (basic or LOD-priority) finishes loading.
 */
window.reportAssetLoaded = function () {
    loadedCt++;

    if (typeof window.updateLoadingProgress === 'function') window.updateLoadingProgress();

    if (loadedCt >= TOTAL_BASIC_ASSETS && !finalizeAssets.triggered) {
        console.log("[ASSETS] Basic asset threshold reached (", loadedCt, "/", TOTAL_BASIC_ASSETS, "). Triggering finalization.");
        finalizeAssets.triggered = true;
        finalizeAssets();
    }
}

// Internal alias for backward compatibility or direct img.onload use
function onAssetLoad() { window.reportAssetLoaded(); }

/**
 * FINALIZE BOOT Sequence
 * Applies floor background and triggers procedural texture baking.
 */
function finalizeAssets() {
    const floorOverlay = document.getElementById('floor-overlay');
    if (floorOverlay) {
        floorOverlay.style.backgroundImage = `url("${FLOOR_PATH}")`;
    }
    floorPattern = true;

    // Trigger Bakers (Defined in texture-baker.js)
    if (typeof bakeShip === 'function') bakeShip();
    if (typeof bakeSkills === 'function') bakeSkills();

    // Gold Standard only uses 512px tier - no additional LOD tiers loaded

    // Critical check: Ensure ship is ready before enabling combat
    if (typeof shipAssets !== 'undefined' && !shipAssets.baked) {
        console.warn('[SHIP] Ship not baked yet, retrying in 100ms...');
        setTimeout(finalizeAssets, 100);
        return;
    }

    console.log('[GAME] All assets ready, initializing game...');

    /**
     * INITIALIZE RENDERING SYSTEM
     * -------------------------------------------------------------------------
     * CRITICAL BOOT SEQUENCE:
     * We MUST trigger initRendererPools() here. 
     * 
     * WHY?
     * The renderer needs the raw Image objects from shipAssets and enemyAssets 
     * to be 'complete' before it can generate PIXI.Texture sheets (fallback textures).
     * If this call is missing or moved, the game will load but enemies will be 
     * INVISIBLE because their renderer pools/textures were never initialized.
     * -------------------------------------------------------------------------
     */
    if (typeof initRendererPools === 'function') initRendererPools();

    // init() is defined in index.js
    if (typeof init === 'function') init(true);
}

/**
 * START BUTTON HANDLER
 */
document.getElementById('start-game-btn')?.addEventListener('click', () => {
    document.getElementById('loading-screen').style.opacity = '0';
    gamePaused = false;
    localStorage.setItem('assetsLoaded', 'true');
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        // Spawn existing list (spawnEnemy in enemy-ai.js)
        if (typeof spawnEnemy === 'function') {
            for (let i = 0; i < spawnIndex; i++) {
                spawnEnemy(i, spawnList[i], true);
            }
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

// BOOTSTRAP TRIGGER
window.addEventListener('DOMContentLoaded', () => {
    // Start Enemy LOD pipeline (Defined in lod-manager.js)
    if (typeof initEnemyLODAssets === 'function') initEnemyLODAssets();

    const sc = SHIP_CONFIG;
    const wc = WEAPON_CONFIG;

    // Ship
    shipAssets.onImg.src = sc.onPath; shipAssets.onImg.onload = onAssetLoad;
    shipAssets.fullImg.src = sc.fullPath; shipAssets.fullImg.onload = onAssetLoad;
    shipAssets.shieldOnImg.src = sc.shieldOnPath; shipAssets.shieldOnImg.onload = onAssetLoad;
    shipAssets.shieldTurnOnImg.src = sc.shieldTurnOnPath; shipAssets.shieldTurnOnImg.onload = onAssetLoad;

    // World/Combat
    floorImg.src = FLOOR_PATH; floorImg.onload = onAssetLoad;
    weaponAssets.leftBulletImg.src = wc.bullet_left_side.path; weaponAssets.leftBulletImg.onload = onAssetLoad;
    weaponAssets.rightBulletImg.src = wc.bullet_right_side.path; weaponAssets.rightBulletImg.onload = onAssetLoad;
    weaponAssets.laserImg.src = wc.laser.path; weaponAssets.laserImg.onload = onAssetLoad;

    // Skills
    skillAssets.buttonImg.src = SKILLS.Tier3.buttonSheet; skillAssets.buttonImg.onload = onAssetLoad;
    skillAssets.skillImg.src = SKILLS.Tier3.skillSheet; skillAssets.skillImg.onload = onAssetLoad;
    skillAssets.swordOfLightImg.src = SKILLS.SwordOfLight.skillSheet; skillAssets.swordOfLightImg.onload = onAssetLoad;
});
