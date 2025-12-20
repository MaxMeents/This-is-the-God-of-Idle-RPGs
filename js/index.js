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

    // Bullet Reset
    bulletData.fill(0);
    lastFireTime = 0;
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
    for (let i = activeDamageCount - 1; i >= 0; i--) {
        const idx = activeDamageIndices[i];
        const dn = damageNumbers[idx];
        dn.life -= 0.02 * dtMult;
        dn.x += dn.vx * dtMult;
        dn.y += dn.vy * dtMult;
        if (dn.life <= 0) {
            dn.active = false;
            activeDamageIndices[i] = activeDamageIndices[activeDamageCount - 1];
            activeDamageCount--;
        }
    }
}

/**
 * PROGRESSIVE SPAWNING
 * To prevent the game from lagging at the start of a stage, we only 
 * spawn 20 enemies per frame until the requirement is met.
 */
function handleSpawning() {
    if (isTraveling) return; // FIX: Don't spawn NEW enemies while we are speeding off to the next stage
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
    data.fill(0); // Clean up old enemies to prevent ghost collisions

    // NEW: Wipe existing projectiles and damage numbers to ensure a clean transition
    bulletData.fill(0);
    activeBulletCount = 0;
    activeDamageCount = 0;
    damageNumbers.forEach(dn => dn.active = false);
    activeBulletIndices.fill(0);
    activeDamageIndices.fill(0);

    // Clear effects
    fxData.fill(0);
    activeFxCount = 0;
    activeFxIndices.fill(0);

    // CRITICAL: Wipe the spatial grid heads as well to prevent "Ghost" links from old stages
    heads.fill(-1);
    occupiedCount = 0;

    // Reset combat timers to prevent immediate triggers at high speeds
    lastFireTime = 0;
    lastCombatUpdate = performance.now();
    lastTargetUpdate = performance.now();

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
    const gameSpd = PERFORMANCE.GAME_SPEED;
    const animSpdBase = cfg.animSpeedSkill * (dt / 16.6) * gameSpd;
    const maxFrames = cfg.skillFrames;

    for (let i = activeSkills.length - 1; i >= 0; i--) {
        const s = activeSkills[i];

        // Progress animation frame
        s.frame += animSpdBase;

        // Orbit around the player
        const oSpd = (s.orbitSpd || 0.05) * (dt / 16.6) * gameSpd;
        s.angle += oSpd;

        // Life cycle end
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
    let dt = now - last;
    last = now;
    // Safety Clamp: If a frame takes > 100ms, don't try to simulate the "gap" at 25x.
    // This prevents the "Spiral of Death" where one lag spike causes a teleport which causes more lag.
    if (dt > 100) dt = 16.6;
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

    if (!gamePaused) {
        // Physics Engine Tick
        const sUpdate = performance.now();
        for (let s = 0; s < steps; s++) {
            update(stepDt, now + (s * stepDt), s === 0, s);
        }
        updateSkills(dt, now);
        updateFX(dt);
        physicsTimeSum += (performance.now() - sUpdate);
    }

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

// Initial Camera Setup
let canvas; // Will point to app.canvas

(async () => {
    // 1. INITIALIZE PIXIJS (WebGL/WebGPU)
    app = new PIXI.Application();
    await app.init({
        resizeTo: window,
        backgroundColor: 0x000000,
        antialias: false, // Better for pixel perfection if needed, also faster
        preference: 'webgl'
    });
    canvas = app.canvas;
    document.body.appendChild(app.canvas);

    // 2. SETUP LAYERS (Containers)
    worldContainer = new PIXI.Container();
    enemyContainer = new PIXI.Container();
    bulletContainer = new PIXI.Container();
    fxContainer = new PIXI.Container();
    playerContainer = new PIXI.Container();
    uiContainer = new PIXI.Container();

    app.stage.addChild(worldContainer);
    worldContainer.addChild(enemyContainer);
    worldContainer.addChild(bulletContainer);
    worldContainer.addChild(fxContainer);
    app.stage.addChild(playerContainer);
    app.stage.addChild(uiContainer);

    // BROWSER LISTENERS
    window.addEventListener('resize', () => {
        // Pixi handles its own resize with resizeTo: window
    });
    window.addEventListener('wheel', (e) => {
        targetZoom *= e.deltaY > 0 ? 0.9 : 1.1;
        targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
    });

    initUIListeners();

    /**
     * ASSET BOOTSTRAP
     */
    const loadSkillSheets = () => {
        let loaded = 0;
        const check = () => {
            loaded++;
            onAssetLoad();
            if (loaded >= 2) {
                skillAssets.ready = true;
                bakeSkills();
            }
        };
        skillAssets.buttonImg.onload = check;
        skillAssets.skillImg.onload = check;
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

    floorImg.onload = onAssetLoad;
    floorImg.src = FLOOR_PATH;

    const shipLoader = (p, img) => { img.onload = onAssetLoad; img.src = p; };
    shipLoader(SHIP_CONFIG.onPath, shipAssets.onImg);
    shipLoader(SHIP_CONFIG.fullPath, shipAssets.fullImg);
    shipLoader(SHIP_CONFIG.shieldOnPath, shipAssets.shieldOnImg);
    shipLoader(SHIP_CONFIG.shieldTurnOnPath, shipAssets.shieldTurnOnImg);

    const laserLoader = (p, img) => { img.onload = onAssetLoad; img.src = p; };
    laserLoader(WEAPON_CONFIG.laserPath, laserImg);

    // Start the animation loop
    requestAnimationFrame(loop);
})();
