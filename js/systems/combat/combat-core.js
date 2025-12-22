/**
 * COMBAT CORE (Orchestrator)
 * 
 * The main high-frequency loop that connects all other simulation systems.
 * Manages the frame tick, targeting, and player defensive state.
 * 
 * LOCATED IN: js/systems/combat/combat-core.js
 * DEPENDS ON: All other combat modules (player-movement, enemy-ai, skills, etc.)
 */

// Timing registries
let lastGridUpdate = 0;
let lastTargetUpdate = 0;
let lastCombatUpdate = 0;

/**
 * MAIN UPDATE TICK (The Engine)
 * This is called by index.js in the core game loop.
 * 
 * @param {number} dt - Delta time (ms)
 * @param {number} now - Timestamp
 * @param {boolean} isFirstStep - Whether this is the first sub-step of the frame
 * @param {number} s - Number of sub-steps for high-speed simulation
 */
function update(dt, now, isFirstStep, s) {
    if (player.health <= 0) return;
    const sc = SHIP_CONFIG;

    /**
     * 1. STAGE PROGRESSION
     * Checks if current stage requirements are met to trigger travel.
     */
    const isSim = currentStage > 2000;
    let targetKills = 0;

    if (isSim) {
        // Simulation mode
        const level = window.simulationLevel;
        targetKills = level?.kills || 0;
    } else {
        // Normal stage mode
        const currentStageCfg = STAGE_CONFIG?.STAGES?.[currentStage];
        targetKills = currentStageCfg?.kills || 300;
    }

    if (!isTraveling && targetKills > 0 && stageKillCount >= targetKills) {
        const mode = (typeof SettingsState !== 'undefined') ? SettingsState.get('progressionMode') : 'Farm';

        if (mode === 'Progress') {
            // Progress Mode: Advance to next area
            stageKillCount = 0;
            const nextStage = currentStage + 1;
            const maxStage = isSim ? 2500 : 9;

            if (currentStage < maxStage && typeof changeStage === 'function') {
                changeStage(nextStage);
            } else {
                // At max stage, just restart current stage
                if (typeof changeStage === 'function') changeStage(currentStage);
            }
        } else {
            // Farm Mode: Reset kill count and restart the stage
            stageKillCount = 0;
            if (typeof changeStage === 'function') {
                changeStage(currentStage);
            }
        }
    }

    /**
     * 2. SPATIAL GRID REBUILD
     * Keeps the broad-phase collision grid up to date.
     */
    if (isFirstStep && !isTraveling && spawnIndex > 0) {
        for (let i = 0; i < occupiedCount; i++) heads[occupiedCells[i]] = -1;
        occupiedCount = 0;

        for (let i = 0; i < spawnIndex; i++) {
            const idx = i * STRIDE;
            if (data[idx + 8] <= 0 && data[idx + 9] <= 0) continue;

            const gx = Math.floor((data[idx] + GRID_WORLD_OFFSET) / GRID_CELL);
            const gy = Math.floor((data[idx + 1] + GRID_WORLD_OFFSET) / GRID_CELL);

            if (gx >= 0 && gx < GRID_DIM && gy >= 0 && gy < GRID_DIM) {
                const cIdx = (gy * GRID_DIM + gx) | 0;
                if (heads[cIdx] === -1) occupiedCells[occupiedCount++] = cIdx;
                next[i] = heads[cIdx];
                heads[cIdx] = i;
            }
        }
    }

    /**
     * 3. TARGETING (Throttled to 10Hz)
     */
    if (!isTraveling && (now - lastTargetUpdate > 100)) {
        lastTargetUpdate = now;
        findNearestEnemy();
    }

    /**
     * 4. PLAYER SYSTEMS (Shield, Ammo, Cooldowns)
     */
    updatePlayerShield(dt, sc);

    // WEAPON AMMO RECOVERY
    Object.keys(WEAPON_CONFIG).forEach(key => {
        const wcfg = WEAPON_CONFIG[key];
        if (weaponAmmo[key] < wcfg.maxAmmo) {
            weaponAmmo[key] += (wcfg.recoveryRate || 50) * (dt / 1000);
            if (weaponAmmo[key] > wcfg.maxAmmo) weaponAmmo[key] = wcfg.maxAmmo;
            if (weaponRechargeMode[key] && weaponAmmo[key] >= (wcfg.minAmmoToFire || 0)) {
                weaponRechargeMode[key] = false;
            }
        }
    });

    // SKILL COOLDOWN TICK
    for (let i = 0; i < 4; i++) {
        if (skillCooldowns[i] > 0) {
            skillCooldowns[i] -= dt * PERFORMANCE.GAME_SPEED;
            if (skillCooldowns[i] < 0) skillCooldowns[i] = 0;
        }
    }

    // AUTO SKILL TRIGGER
    if (window.autoSkills && player.targetIdx !== -1) {
        const tIdx = player.targetIdx * STRIDE;
        const dx = data[tIdx] - player.x, dy = data[tIdx + 1] - player.y;
        const distSq = dx * dx + dy * dy;
        if (skillCooldowns[0] <= 0 && distSq < (SKILLS.Tier1.skillRange ** 2)) activateSupernova(1);
        if (skillCooldowns[1] <= 0 && distSq < (SKILLS.Tier2.skillRange ** 2)) activateSupernova(2);
        if (skillCooldowns[2] <= 0 && distSq < (SKILLS.Tier3.skillRange ** 2)) activateSupernova(3);
        if (skillCooldowns[3] <= 0 && distSq < (SKILLS.SwordOfLight.skillRange ** 2)) activateSwordOfLight();
    }

    /**
     * 5. SUB-SYSTEM UPDATES
     */
    updateSkillInstances(dt);     // Animating active skills
    updatePlayerMovement(dt, sc); // Nav/Steering
    updateEnemies(dt, now, isFirstStep); // Enemy AI

    /**
     * CAMERA SMOOTHING (Interpolation)
     * -------------------------------------------------------------------------
     * We smoothly interpolate window.zoom towards window.targetZoom.
     * This provides the premium "damping" feel to the mouse wheel.
     * The interpolation factor (0.1) determines how quickly the zoom
     * catches up to the target, creating a smooth, eased effect.
     * -------------------------------------------------------------------------
     */
    window.zoom += (window.targetZoom - window.zoom) * 0.1;

    /**
     * 6. COMBAT & WEAPON CLOCK
     */
    if (!isTraveling && now - lastCombatUpdate > DAMAGE_INTERVAL) {
        lastCombatUpdate = now;
        processAOEDamage();
        processSkillDamage();
    }

    if (!isTraveling && player.targetIdx !== -1) {
        Object.keys(WEAPON_CONFIG).forEach(key => {
            const wcfg = WEAPON_CONFIG[key];
            const interval = (1000 / wcfg.fireRate) / PERFORMANCE.GAME_SPEED;

            if (weaponTimers[key] === 0 || now - weaponTimers[key] > 1000) weaponTimers[key] = now - interval;

            let safety = 0;
            while (now - weaponTimers[key] >= interval && safety++ < 10) {
                if (weaponRechargeMode[key]) { weaponTimers[key] = now; break; }
                if (weaponAmmo[key] >= 1.0) {
                    const type = (key === 'bullet_left_side') ? 0 : (key === 'bullet_right_side' ? 1 : 2);
                    fireWeapon(key, type);
                    weaponAmmo[key] -= 1.0;
                    weaponTimers[key] += interval;
                    if (weaponAmmo[key] < 1.0) { weaponAmmo[key] = 0; weaponRechargeMode[key] = true; break; }
                } else { weaponAmmo[key] = 0; weaponRechargeMode[key] = true; weaponTimers[key] = now; break; }
            }
        });
    }

    if (!isTraveling) updateBullets(dt);
}

/**
 * SKILL INSTANCE UPDATES
 * Updates frames and durations for expanding supernova rings or orbiting swords.
 */
function updateSkillInstances(dt) {
    const spd = PERFORMANCE.GAME_SPEED;
    for (let i = activeSkillCount - 1; i >= 0; i--) {
        const poolIdx = activeSkillIndices[i];
        const idx = poolIdx * SKILL_STRIDE;
        const type = skillData[idx + 6];

        if (type === 1) { // SwordOfLight
            const cfg = SKILLS.SwordOfLight;
            skillData[idx + 1] += cfg.animSpeedSkill * (dt / 16.6) * spd;
            if (skillData[idx + 1] >= cfg.skillFrames) skillData[idx + 1] %= cfg.skillFrames;
            skillData[idx + 7] += dt * spd;
            if (skillData[idx + 7] >= skillData[idx + 8]) {
                skillData[idx + 9] = 0; activeSkillIndices[i] = activeSkillIndices[--activeSkillCount];
            }
        } else { // Supernova
            const cfg = SKILLS['Tier' + (skillData[idx + 5] || 3)];
            skillData[idx + 1] += cfg.animSpeedSkill * (dt / 16.6) * spd;
            skillData[idx] += skillData[idx + 4] * (dt / 16.6) * spd;
            if (skillData[idx + 1] >= cfg.skillFrames) {
                skillData[idx + 9] = 0; activeSkillIndices[i] = activeSkillIndices[--activeSkillCount];
            }
        }
    }
}

/**
 * DEFENSIVE STATE (Player Shield)
 */
function updatePlayerShield(dt, sc) {
    if (player.shieldCooldownRemaining > 0) {
        player.shieldCooldownRemaining -= dt * PERFORMANCE.GAME_SPEED;
        if (player.shieldCooldownRemaining < 0) player.shieldCooldownRemaining = 0;
    }
    if (player.shieldActive) {
        player.shieldDurationRemaining -= dt * PERFORMANCE.GAME_SPEED;
        if (player.shieldAnimState === 'TURNING_ON') {
            player.shieldFrame += 0.8 * (dt / 16.6) * PERFORMANCE.GAME_SPEED;
            if (player.shieldFrame >= sc.shieldTurnOnFrames) { player.shieldAnimState = 'ON'; player.shieldFrame = 0; }
        } else if (player.shieldAnimState === 'ON') {
            player.shieldFrame = (player.shieldFrame + 0.4 * (dt / 16.6) * PERFORMANCE.GAME_SPEED) % sc.shieldOnFrames;
        }
        if (player.shieldDurationRemaining <= 0 || player.shieldHP <= 0) {
            player.shieldActive = false; player.shieldAnimState = 'OFF';
        }
    }
}

/**
 * SPATIAL TARGETING
 */
function findNearestEnemy() {
    let closestDistSq = Infinity;
    let found = -1;
    const maxDetectionSq = SHIP_CONFIG.detectionRadius ** 2;
    const pgx = Math.floor((player.x + GRID_WORLD_OFFSET) / GRID_CELL);
    const pgy = Math.floor((player.y + GRID_WORLD_OFFSET) / GRID_CELL);
    const r = Math.ceil(SHIP_CONFIG.detectionRadius / GRID_CELL);

    for (let ox = -r; ox <= r; ox++) {
        const row = (pgy + ox);
        if (row < 0 || row >= GRID_DIM) continue;
        for (let oy = -r; oy <= r; oy++) {
            const col = (pgx + oy);
            if (col < 0 || col >= GRID_DIM) continue;
            let ptr = heads[row * GRID_DIM + col];
            while (ptr !== -1) {
                const idx = ptr * STRIDE;
                if (data[idx + 8] > 0) {
                    const dSq = (data[idx] - player.x) ** 2 + (data[idx + 1] - player.y) ** 2;
                    if (dSq < closestDistSq && dSq < maxDetectionSq) { closestDistSq = dSq; found = ptr; }
                }
                ptr = next[ptr];
            }
        }
    }
    player.targetIdx = found;
}

/**
 * PHYSICAL HEALTH INTERACTION
 */
function applyDamageToPlayer(dmg) {
    if (!player.shieldActive && player.shieldCooldownRemaining <= 0) {
        player.shieldActive = true; player.shieldAnimState = 'TURNING_ON';
        player.shieldFrame = 0; player.shieldHP = player.shieldMaxHP;
        player.shieldDurationRemaining = SHIP_CONFIG.shieldDuration;
        player.shieldCooldownRemaining = SHIP_CONFIG.shieldCooldown;
    }
    if (player.shieldActive) {
        player.shieldHP -= dmg;
        if (player.shieldHP <= 0) { player.shieldActive = false; player.shieldAnimState = 'OFF'; }
    } else {
        player.health -= dmg;
        if (player.health <= 0) if (typeof softReset === 'function') softReset();
    }

    // Trigger visual popup
    if (typeof spawnIncomingDamage === 'function') spawnIncomingDamage(dmg);
}
