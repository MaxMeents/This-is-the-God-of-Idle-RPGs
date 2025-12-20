/**
 * GAME CORE (Index)
 * This file coordinates the loading sequence, the main game loop, and 
 * high-level stage mechanics.
 */

/**
 * INITIALIZE GAME
 * Sets up (or resets) all global variables for a new session.
 */
function init(firstLoad = false) {
    // Combat State Reset
    spawnIndex = 0;
    killCount = 0;
    stageKillCount = 0;
    player.health = PLAYER_HEALTH_MAX;
    player.shieldActive = false;
    player.shieldCooldownRemaining = 0;
    player.shieldHP = player.shieldMaxHP;
    player.targetIdx = -1;
    activeSkills.length = 0;
    damageNumbers.forEach(d => d.active = false);

    isTraveling = false;
    bossMode = false;

    // Initial Camera Setup
    if (firstLoad) {
        zoom = 0.05;
        targetZoom = 0.05;
    }

    // Prepare the spawn list for the current stage
    prepareStagePool(currentStage);

    // Position player
    const [gx, gy] = STAGE_CONFIG.CLOCKWISE_GRID[currentStage - 1];
    player.x = (gx - 1) * STAGE_CONFIG.GRID_SIZE;
    player.y = (gy - 1) * STAGE_CONFIG.GRID_SIZE;
    data.fill(0);
}

/**
 * STAGE POOL GENERATOR
 * Builds a randomized list of enemies based on the STAGES config.
 */
function prepareStagePool(stageId) {
    spawnList.length = 0;
    const cfg = STAGE_CONFIG.STAGES[stageId];
    if (!cfg) return;

    for (const [type, count] of Object.entries(cfg.enemies)) {
        for (let i = 0; i < count; i++) {
            spawnList.push(type);
        }
    }

    // Shuffle only the current stage's pool
    for (let i = spawnList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [spawnList[i], spawnList[j]] = [spawnList[j], spawnList[i]];
    }
}

/**
 * FX UPDATER
 * Handles the floating damage numbers.
 */
function updateDamageNumbers(dt) {
    const gameSpd = PERFORMANCE.GAME_SPEED;
    const dtMult = (dt / 16.6) * gameSpd;
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
        const dn = damageNumbers[i];
        if (!dn.active) continue;
        dn.life -= 0.02 * dtMult;
        dn.x += dn.vx * dtMult;
        dn.y += dn.vy * dtMult;
        if (dn.life <= 0) dn.active = false;
    }
}

/**
 * PROGRESSIVE SPAWNING
 * To prevent the game from lagging at the start of a stage, we only 
 * spawn 20 enemies per frame until the requirement is met.
 */
function handleSpawning() {
    const cfg = STAGE_CONFIG.STAGES[currentStage];
    if (!cfg) return;

    // total entities in this stage
    const population = spawnList.length;
    for (let i = 0; i < PERFORMANCE.SPAWNS_PER_FRAME && spawnIndex < population; i++) {
        spawnEnemy(spawnIndex, spawnList[spawnIndex], true);
        spawnIndex++;
    }
}

/**
 * GAME OVER / RESET
 */
function softReset() {
    currentStage = 1;
    lastGridUpdate = 0;
    lastTargetUpdate = 0;
    lastCombatUpdate = 0;
    init();
}

/**
 * TRAVEL SYSTEM
 * Initiates the 'Speeding Off' sequence between stages.
 */
function changeStage(newStage) {
    if (isTraveling) return;
    currentStage = newStage;

    // Regenerate spawn list for the new stage immediately
    prepareStagePool(currentStage);
    spawnIndex = 0;

    const [gx, gy] = STAGE_CONFIG.CLOCKWISE_GRID[currentStage - 1];
    travelTargetX = (gx - 1) * STAGE_CONFIG.GRID_SIZE;
    travelTargetY = (gy - 1) * STAGE_CONFIG.GRID_SIZE;
    isTraveling = true;
    stageKillCount = 0;
}

function startTravelToNextStage() {
    if (currentStage > highestStageCleared) highestStageCleared = currentStage;
    changeStage(currentStage + 1);
}

function arriveAtNewStage() {
    isTraveling = false;
    if (currentStage === 10) {
        bossMode = true;
    } else {
        bossMode = false;
    }
    // Reposition all enemies to start appearing around the new location
    for (let i = 0; i < spawnIndex; i++) {
        spawnEnemy(i, spawnList[i], true);
    }
}

/**
 * SKILL ANIMATION UPDATER
 */
function updateSkills(dt, now) {
    const cfg = SKILLS.MulticolorXFlame;
    const speed = cfg.animSpeedSkill * (dt / 16.6) * PERFORMANCE.GAME_SPEED;
    const maxFrames = cfg.skillFrames;
    for (let i = activeSkills.length - 1; i >= 0; i--) {
        const s = activeSkills[i];
        s.frame += speed;
        if (s.frame >= maxFrames) activeSkills.splice(i, 1);
    }
}

// Stats tracking for the HUD
let last = 0, f = 0, t = 0;
let physicsTimeSum = 0;
let drawTimeSum = 0;

/**
 * MAIN GAME LOOP
 * The heartbeat of the application. High-precision timing and multi-stepping logic.
 */
function loop(now) {
    const dt = now - last; last = now;
    if (spawnList.length === 0) {
        requestAnimationFrame(loop);
        return;
    }
    t += dt; f++;

    // SUB-STEPPING: We cap steps higher to support 25x+ speed smoothly.
    const steps = Math.min(50, Math.ceil(PERFORMANCE.GAME_SPEED));
    const stepDt = (dt / steps) * PERFORMANCE.GAME_SPEED;

    handleSpawning();
    updateDamageNumbers(dt);

    // Physics Engine Tick
    const sUpdate = performance.now();
    for (let s = 0; s < steps; s++) {
        update(stepDt, now + (s * stepDt), s === 0);
    }
    updateSkills(dt, now);
    physicsTimeSum += (performance.now() - sUpdate);

    // Renderer Tick
    const sDraw = performance.now();
    draw();
    drawTimeSum += (performance.now() - sDraw);

    // UI Tick (Throttled inside the function via cache checks)
    updateUI();

    // FPS / Performance HUD updates every 1 second
    if (t > 1000) {
        const avgPhys = (physicsTimeSum / f).toFixed(2);
        const avgDraw = (drawTimeSum / f).toFixed(2);
        const statsTxt = `FPS: ${f} | Logic: ${avgPhys}ms | Draw: ${avgDraw}ms | Tasks: ${workerTasksCount}`;
        document.getElementById('fps').innerText = statsTxt;
        console.log("[Performance]", statsTxt); // User can copy this
        f = 0; t = 0; physicsTimeSum = 0; drawTimeSum = 0;
    }
    requestAnimationFrame(loop);
}

// BROWSER LISTENERS
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
window.addEventListener('wheel', (e) => {
    targetZoom *= e.deltaY > 0 ? 0.9 : 1.1;
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
});

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
canvas.width = window.innerWidth; canvas.height = window.innerHeight;

initUIListeners();

/**
 * ASSET BOOTSTRAP
 * Kicks off massive parallel image loading.
 */
const loadSkillSheets = () => {
    skillAssets.buttonImg.onload = () => {
        onAssetLoad();
        if (skillAssets.skillImg.complete) { skillAssets.ready = true; bakeSkills(); }
    };
    skillAssets.skillImg.onload = () => {
        onAssetLoad();
        if (skillAssets.buttonImg.complete) { skillAssets.ready = true; bakeSkills(); }
    };
    skillAssets.buttonImg.src = SKILLS.MulticolorXFlame.buttonSheet;
    skillAssets.skillImg.src = SKILLS.MulticolorXFlame.skillSheet;
};
loadSkillSheets();

enemyKeys.forEach(k => {
    const loadImg = (p, img) => { img.onload = onAssetLoad; img.src = p; };
    loadImg(Enemy[k].walkPath, enemyAssets[k].walk);
    loadImg(Enemy[k].deathPath, enemyAssets[k].death);
    loadImg(Enemy[k].attackPath, enemyAssets[k].attack);
});

const floorImgLoader = new Image();
floorImgLoader.onload = onAssetLoad;
floorImgLoader.src = FLOOR_PATH;

const shipLoader = (p, img) => { img.onload = onAssetLoad; img.src = p; };
shipLoader(SHIP_CONFIG.onPath, shipAssets.onImg);
shipLoader(SHIP_CONFIG.fullPath, shipAssets.fullImg);
shipLoader(SHIP_CONFIG.shieldOnPath, shipAssets.shieldOnImg);
shipLoader(SHIP_CONFIG.shieldTurnOnPath, shipAssets.shieldTurnOnImg);

// Start the animation loop
requestAnimationFrame(loop);
