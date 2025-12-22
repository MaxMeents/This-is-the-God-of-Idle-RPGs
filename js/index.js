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
    Object.keys(weaponTimers).forEach(k => weaponTimers[k] = 0);
    Object.keys(weaponAmmo).forEach(k => weaponAmmo[k] = WEAPON_CONFIG[k].maxAmmo);
    Object.keys(weaponRechargeMode).forEach(k => weaponRechargeMode[k] = false);
    activeSkillCount = 0;
    skillData.fill(0);
    damageNumbers.forEach(d => d.active = false);

    isTraveling = false;
    bossMode = false;

    // Initial Camera Setup
    if (firstLoad) {
        window.zoom = 0.05;
        window.targetZoom = 0.05;

        // BOOT INTO SIMULATION LEVEL 1 (Sector 1 // Area 1)
        if (typeof SIMULATION_CONFIG !== 'undefined') {
            const allLevels = SIMULATION_CONFIG.generateLevels();
            window.simulationMode = true;
            window.simulationLevel = allLevels[0];
            window.simulationDifficulty = SIMULATION_CONFIG.DIFFICULTY[0];
            currentStage = 2001;
        }
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

    let cfg;
    if (stageId > 2000) {
        // Simulation Level
        cfg = window.simulationLevel;
        if (!cfg) {
            const simId = stageId - 2000;
            const allLevels = SIMULATION_CONFIG.generateLevels();
            cfg = allLevels[simId - 1];
        }
    } else {
        cfg = STAGE_CONFIG.STAGES[stageId];
    }

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
 * PROGRESSIVE SPAWNING
 */
function handleSpawning() {
    if (isTraveling) return;

    // Check if it's a simulation or a standard stage
    const isSim = currentStage > 2000;
    const cfg = isSim ? (window.simulationLevel || true) : STAGE_CONFIG.STAGES[currentStage];
    if (!cfg) return;

    const population = spawnList.length;

    // SIMULATION: Spawn all enemies at once
    if (isSim) {
        while (spawnIndex < population) {
            spawnEnemy(spawnIndex, spawnList[spawnIndex], true);
            spawnIndex++;
        }
    } else {
        // NORMAL: Progressive spawning
        for (let i = 0; i < PERFORMANCE.SPAWNS_PER_FRAME && spawnIndex < population; i++) {
            spawnEnemy(spawnIndex, spawnList[spawnIndex], true);
            spawnIndex++;
        }
    }
}

/**
 * GAME OVER / RESET
 */
function softReset() {
    const mode = (typeof SettingsState !== 'undefined') ? SettingsState.get('progressionMode') : 'Farm';

    // In Progress mode, go back one stage on death. In Farm mode, stay on current stage.
    let targetStage = currentStage;
    if (mode === 'Progress') {
        const isSim = currentStage > 2000;
        const minStage = isSim ? 2001 : 1;
        targetStage = Math.max(minStage, currentStage - 1);
    }

    lastGridUpdate = 0;
    lastTargetUpdate = 0;
    lastCombatUpdate = 0;

    // Use changeStage to handle pool resets correctly
    changeStage(targetStage);

    // Reset player health for continuation
    player.health = PLAYER_HEALTH_MAX;
}

/**
 * TRAVEL SYSTEM
 */
function changeStage(newStage) {
    if (isTraveling) return;
    currentStage = newStage;

    const isSim = currentStage > 2000;
    const navStageId = isSim ? 1 : currentStage; // Coords default to Stage 1 center for Sim

    // Update simulation level data if in simulation mode
    if (isSim && typeof SIMULATION_CONFIG !== 'undefined') {
        const simId = currentStage - 2000;
        const allLevels = SIMULATION_CONFIG.generateLevels();
        window.simulationLevel = allLevels[simId - 1];
        window.simulationDifficulty = window.simulationDifficulty || SIMULATION_CONFIG.DIFFICULTY[0];
    }

    prepareStagePool(currentStage);
    spawnIndex = 0;
    data.fill(0);

    bulletData.fill(0);
    activeBulletCount = 0;
    activeDamageCount = 0;
    damageNumbers.forEach(dn => dn.active = false);
    activeBulletIndices.fill(0);
    activeDamageIndices.fill(0);
    stageKillCount = 0;

    // Reset Incoming Damage
    activeIncomingDamageCount = 0;
    incomingDamageNumbers.forEach(dn => dn.active = false);
    activeIncomingDamageIndices.fill(0);

    fxData.fill(0);
    activeFxCount = 0;
    activeFxIndices.fill(0);

    skillData.fill(0);
    activeSkillCount = 0;
    activeSkillIndices.fill(0);

    heads.fill(-1);
    occupiedCount = 0;

    // Reset combat timers
    Object.keys(weaponTimers).forEach(k => weaponTimers[k] = 0);
    Object.keys(weaponAmmo).forEach(k => weaponAmmo[k] = WEAPON_CONFIG[k].maxAmmo);
    Object.keys(weaponRechargeMode).forEach(k => weaponRechargeMode[k] = false);
    lastCombatUpdate = performance.now();
    lastTargetUpdate = performance.now();

    const [gx, gy] = STAGE_CONFIG.CLOCKWISE_GRID[navStageId - 1];
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
    if (currentStage === 10) bossMode = true;
    else bossMode = false;
    for (let i = 0; i < spawnIndex; i++) {
        spawnEnemy(i, spawnList[i], true);
    }
}

// Stats tracking
let last = 0, f = 0, t = 0;
let physicsTimeSum = 0;
let drawTimeSum = 0;

/**
 * MAIN GAME LOOP
 */
function loop(now) {
    // SAFETY: Wait for PIXI application to be fully ready
    if (!app || !app.renderer) {
        requestAnimationFrame(loop);
        return;
    }
    let dt = now - last;
    last = now;
    if (dt > 100) dt = 16.6;
    if (spawnList.length === 0) {
        requestAnimationFrame(loop);
        return;
    }
    t += dt; f++;

    const steps = Math.min(50, Math.ceil(PERFORMANCE.GAME_SPEED));
    const stepDt = (dt / steps) * PERFORMANCE.GAME_SPEED;

    handleSpawning();
    updateDamageNumbers(dt);

    if (!gamePaused) {
        const sUpdate = performance.now();
        let gridTime = 0, targetTime = 0, playerTime = 0, enemyTime = 0, combatTime = 0, weaponTime = 0, bulletTime = 0;

        for (let s = 0; s < steps; s++) {
            update(stepDt, now + (s * stepDt), s === 0, s);
        }
        updateFX(dt);
        const totalPhysics = performance.now() - sUpdate;
        physicsTimeSum += totalPhysics;

        // Log if physics is taking too long
        if (totalPhysics > 16) {
            console.warn(`[PERF] Physics took ${totalPhysics.toFixed(2)}ms (target: 16ms) | Steps: ${steps} | ActiveSkills: ${activeSkillCount} | SpawnIndex: ${spawnIndex}`);
        }
    }

    const sDraw = performance.now();
    draw();
    drawTimeSum += (performance.now() - sDraw);

    updateUI();

    if (t > 1000) {
        const avgPhys = (physicsTimeSum / f).toFixed(2);
        const avgDraw = (drawTimeSum / f).toFixed(2);
        const tier = PERFORMANCE.LOD_TIERS[window.lastActiveTier || 0];
        const statsTxt = `FPS: ${f} | Logic: ${avgPhys}ms | Draw: ${avgDraw}ms | LOD: ${tier.id} (${tier.size}px) | OnScreen: ${Math.floor(smoothedEnemies)}`;
        document.getElementById('fps').innerText = statsTxt;
        f = 0; t = 0; physicsTimeSum = 0; drawTimeSum = 0;
    }
    requestAnimationFrame(loop);
}

let canvas;

(async () => {
    // New AAA Overlay System - INIT FIRST for instant feedback
    if (typeof CursorOverlaySystem !== 'undefined') CursorOverlaySystem.init();

    app = new PIXI.Application();
    await app.init({
        resizeTo: window,
        backgroundAlpha: 0,
        antialias: false,
        preference: 'webgl'
    });
    canvas = app.canvas;
    canvas.id = 'game-canvas'; // CRITICAL: Identify this canvas separate from UI canvases
    document.body.appendChild(app.canvas);

    worldContainer = new PIXI.Container();
    enemyContainer = new PIXI.Container();
    bulletContainer = new PIXI.Container();
    fxContainer = new PIXI.Container();
    playerContainer = new PIXI.Container();
    uiContainer = new PIXI.Container();
    uiContainer.sortableChildren = true;

    app.stage.addChild(worldContainer);
    worldContainer.addChild(enemyContainer);
    worldContainer.addChild(bulletContainer);
    worldContainer.addChild(fxContainer);
    app.stage.addChild(playerContainer);
    app.stage.addChild(uiContainer);

    window.addEventListener('wheel', (e) => {
        window.targetZoom *= e.deltaY > 0 ? 0.9 : 1.1;
        window.targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, window.targetZoom));
    });

    // SETTINGS SYSTEM
    if (typeof SettingsState !== 'undefined') SettingsState.init();
    if (typeof SettingsUI !== 'undefined') SettingsUI.init();
    if (typeof SimulationUI !== 'undefined') SimulationUI.init(); // NEW: Training Sim

    initUIListeners();
    if (typeof initLootSystem === 'function') initLootSystem();

    requestAnimationFrame(loop);
})();
