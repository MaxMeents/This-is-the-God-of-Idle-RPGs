/**
 * UI CACHE & STATE MEMORY
 * 
 * This module pre-grabs DOM elements to avoid expensive document searches during 
 * high-frequency updates. It also maintains a "Dirty-Check" memory to ensure 
 * the DOM is ONLY updated when values actually change.
 * 
 * LOCATED IN: js/systems/ui/ui-cache.js
 * 
 * -------------------------------------------------------------------------
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [index.html]: Requires all IDs (like 'player-health-bar') to exist in the HTML.
 * 2. [UI Orchestrator]: Reads from these pointers and memory variables every frame.
 * 3. [Loot UI]: initUICache calls initLootSystem() to initialize the Ledger trigger.
 * -------------------------------------------------------------------------
 */

// DOM POINTERS (Cached for performance)
let elHPBar, elShieldBar, elChargeBar, elStageDisp, elPrevArr, elNextArr, elChallengeBtn, elBossCont, elSkillCanvases = [], elFPS;
let elLaserBar, elBulletBar;
let elTargetCont, elTargetName, elTargetBar, elTargetBarGhost;
let elHPGhost;
let uiInitialized = false;

// DIRTY-CHECKING CACHE (Prevents redundant DOM writes)
let lastHP = -1;
let lastShield = -1;
let lastCharge = -1;
let lastShieldRecharge = null;
let lastLaserAmmo = -1;
let lastBulletAmmo = -1;
let lastLaserRecharge = null;
let lastBulletRecharge = null;
let lastStageTxt = "";
let lastBossMode = null;
let lastTargetVisible = false;
let lastTargetName = "";
let lastTargetWidth = -1;
let lastTargetWidthGhost = -1;
let lastHPGhost = -1;
let lastTargetTier = "";

/**
 * INITIALIZE UI CACHE
 * Grabs all necessary elements and initializes sub-systems.
 * Called once when the first updateUI() tick runs.
 */
function initUICache() {
    elHPBar = document.getElementById('player-health-bar');
    elShieldBar = document.getElementById('player-shield-bar');
    elChargeBar = document.getElementById('shield-charge-bar');
    elStageDisp = document.getElementById('stage-display');
    elPrevArr = document.getElementById('nav-left');
    elNextArr = document.getElementById('nav-right');
    elChallengeBtn = document.getElementById('challenge-btn');
    elBossCont = document.getElementById('boss-health-container');
    elFPS = document.getElementById('fps');

    elSkillCanvases = [
        document.getElementById('skill-button-canvas-1'),
        document.getElementById('skill-button-canvas-2'),
        document.getElementById('skill-button-canvas-3'),
        document.getElementById('skill-button-canvas-4')
    ];

    elLaserBar = document.getElementById('laser-ammo-bar');
    elBulletBar = document.getElementById('bullet-ammo-bar');

    elTargetCont = document.getElementById('target-hud-container');
    elTargetName = document.getElementById('target-name');
    elTargetBar = document.getElementById('target-health-bar');
    elTargetBarGhost = document.getElementById('target-health-ghost');
    elHPGhost = document.getElementById('player-health-ghost');

    // Cascading initialization
    if (typeof initLootSystem === 'function') initLootSystem();

    uiInitialized = true;
    console.log("[UI] Cache initialized successfully");
}
