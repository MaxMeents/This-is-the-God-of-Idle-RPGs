function init(firstLoad = false) {
    if (firstLoad) {
        // Only use GalaxyDragon (filter keys with count > 0)
        const validKeys = enemyKeys.filter(k => Enemy[k].count > 0);
        for (let i = 0; i < totalEnemies; i++) {
            spawnList.push(validKeys[i % validKeys.length]);
        }
        spawnList.sort(() => Math.random() - 0.5);
    }
    spawnIndex = 0;
    killCount = 0;
    stageKillCount = 0;
    player.health = PLAYER_HEALTH_MAX;
    player.shieldActive = false;
    player.shieldCooldownRemaining = 0;
    player.shieldHP = player.shieldMaxHP;
    player.x = 0; player.y = 0;
    player.targetIdx = -1;
    activeSkills.length = 0;
    damageNumbers.length = 0;

    // Reset Camera & Travel (Partial)
    isTraveling = false;
    bossMode = false;
    if (firstLoad) {
        zoom = 0.05;
        targetZoom = 0.05;
    }

    const [gx, gy] = STAGE_CONFIG.CLOCKWISE_GRID[currentStage - 1];
    player.x = (gx - 1) * STAGE_CONFIG.GRID_SIZE;
    player.y = (gy - 1) * STAGE_CONFIG.GRID_SIZE;
    data.fill(0); // Wipe physics data
}

function updateDamageNumbers(dt) {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const dn = damageNumbers[i];
        dn.life -= 0.02 * (dt / 16.6) * PERFORMANCE.GAME_SPEED;
        dn.x += dn.vx * (dt / 16.6) * PERFORMANCE.GAME_SPEED;
        dn.y += dn.vy * (dt / 16.6) * PERFORMANCE.GAME_SPEED;
        if (dn.life <= 0) damageNumbers.splice(i, 1);
    }
}

function handleSpawning() {
    const targetCap = STAGE_CONFIG.MAX_KILLS[currentStage] || 300;
    for (let i = 0; i < PERFORMANCE.SPAWNS_PER_FRAME && spawnIndex < targetCap; i++) {
        spawnEnemy(spawnIndex, spawnList[spawnIndex], true);
        spawnIndex++;
    }
}

function softReset() {
    currentStage = 1; // Death penalty
    lastGridUpdate = 0;
    lastTargetUpdate = 0;
    lastCombatUpdate = 0;
    init();
}

function changeStage(newStage) {
    if (isTraveling) return;
    currentStage = newStage;
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
        // Logic for super big boss would go here:
        // Set specific enemy stats for boss
    } else {
        bossMode = false;
    }
    // Clear old enemies to make way for new stage scaling
    for (let i = 0; i < spawnIndex; i++) {
        spawnEnemy(i, spawnList[i], true);
    }
}

function updateSkills(dt, now) {
    const cfg = SKILLS.MulticolorXFlame;
    for (let i = activeSkills.length - 1; i >= 0; i--) {
        const s = activeSkills[i];
        s.frame += cfg.animSpeedSkill * (dt / 16.6) * PERFORMANCE.GAME_SPEED;
        if (s.frame >= cfg.skillFrames) activeSkills.splice(i, 1);
    }
}

let last = 0, f = 0, t = 0;
let physicsTimeSum = 0;
let drawTimeSum = 0;

function loop(now) {
    const dt = now - last; last = now;
    if (spawnList.length === 0) {
        requestAnimationFrame(loop);
        return;
    }
    t += dt; f++;

    const steps = Math.min(10, Math.ceil(PERFORMANCE.GAME_SPEED));
    const stepDt = dt * (PERFORMANCE.GAME_SPEED / steps);

    handleSpawning();
    updateDamageNumbers(dt);

    const sUpdate = performance.now();
    for (let s = 0; s < steps; s++) {
        update(stepDt, now + (s * stepDt));
    }
    updateSkills(dt, now);
    physicsTimeSum += (performance.now() - sUpdate);

    const sDraw = performance.now();
    draw();
    drawTimeSum += (performance.now() - sDraw);

    updateUI();

    if (t > 1000) {
        const avgPhys = (physicsTimeSum / f).toFixed(2);
        const avgDraw = (drawTimeSum / f).toFixed(2);
        document.getElementById('fps').innerText = `FPS: ${f} | Logic: ${avgPhys}ms | Draw: ${avgDraw}ms | Tasks: ${workerTasksCount}`;
        f = 0; t = 0; physicsTimeSum = 0; drawTimeSum = 0;
    }
    requestAnimationFrame(loop);
}

// Global script starts
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
window.addEventListener('wheel', (e) => { targetZoom *= e.deltaY > 0 ? 0.9 : 1.1; targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom)); });

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
canvas.width = window.innerWidth; canvas.height = window.innerHeight;

initUIListeners();

// Load Assets
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

requestAnimationFrame(loop);
