/**
 * PHYSICS & SIMULATION ENGINE
 * This is the 'Brain' of the game. It handles movement, collision avoidance, 
 * combat, and stage progression.
 */

let lastGridUpdate = 0;
let lastTargetUpdate = 0;
let lastCombatUpdate = 0;

/**
 * SKILL ACTIVATION (Supernova)
 * Triggers a massive solar flare effect scaled by tier.
 */
function activateSupernova(tier = 1) {
    const tierKey = 'Tier' + tier;
    const cfg = SKILLS[tierKey];
    if (skillCooldowns[tier - 1] > 0) return;
    skillCooldowns[tier - 1] = cfg.cooldownTime;

    console.log(`[SKILL] Tier ${tier} Supernova activated! (${cfg.rings} rings)`);

    const spawnRing = (count, radius, size, delay) => {
        setTimeout(() => {
            for (let i = 0; i < count; i++) {
                if (activeSkillCount >= totalSkillParticles) return;

                // Find inactive slot
                for (let j = 0; j < totalSkillParticles; j++) {
                    const idx = j * SKILL_STRIDE;
                    if (skillData[idx + 9] === 0) {
                        skillData[idx] = (i / count) * Math.PI * 2; // angle
                        skillData[idx + 1] = 0; // frame
                        skillData[idx + 2] = radius;
                        skillData[idx + 3] = size;
                        skillData[idx + 4] = 0.02 + (Math.random() * 0.02); // orbitSpd
                        skillData[idx + 5] = tier;
                        skillData[idx + 6] = 0; // type (Supernova)
                        skillData[idx + 7] = 0; // elapsed
                        skillData[idx + 8] = 0; // duration (not used for SN)
                        skillData[idx + 9] = 1; // active

                        activeSkillIndices[activeSkillCount++] = j;
                        break;
                    }
                }
            }
        }, delay);
    };

    // Construct rings based on config
    const baseRadius = 1200;
    const baseSize = 1400;
    for (let r = 0; r < cfg.rings; r++) {
        const radius = baseRadius + (r * 1300);
        const size = baseSize + (r * 800);
        const count = 15 + (r * 3);
        const delay = r * 80;
        spawnRing(count, radius, size, delay);
    }
}

/**
 * SKILL ACTIVATION (Sword of Light)
 * Spawns 8 massive swords around the ship.
 */
function activateSwordOfLight() {
    if (skillCooldowns[3] > 0) return;
    const cfg = SKILLS.SwordOfLight;
    skillCooldowns[3] = cfg.cooldownTime;

    console.log(`[SKILL] Sword of Light activated!`);

    const dirs = [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4];

    dirs.forEach(angle => {
        if (activeSkillCount >= totalSkillParticles) return;

        // Find inactive slot
        for (let j = 0; j < totalSkillParticles; j++) {
            const idx = j * SKILL_STRIDE;
            if (skillData[idx + 9] === 0) {
                skillData[idx] = angle;
                skillData[idx + 1] = 0;
                skillData[idx + 2] = cfg.orbitRadius;
                skillData[idx + 3] = cfg.visualSize;
                skillData[idx + 4] = 0; // orbitSpd
                skillData[idx + 5] = 4; // tier
                skillData[idx + 6] = 1; // type (SwordOfLight)
                skillData[idx + 7] = 0; // elapsed
                skillData[idx + 8] = cfg.duration;
                skillData[idx + 9] = 1; // active

                activeSkillIndices[activeSkillCount++] = j;
                break;
            }
        }
    });
}

/**
 * MAIN UPDATE TICK
 * Called multiple times per frame if the game speed is high.
 */
function update(dt, now, isFirstStep, s) {
    if (player.health <= 0) return;
    const sc = SHIP_CONFIG;

    // 1. STAGE PROGRESSION CHECK
    const currentStageCfg = STAGE_CONFIG?.STAGES?.[currentStage];
    if (!isTraveling && currentStageCfg && stageKillCount >= (currentStageCfg.kills || 300) && currentStage < 10) {
        startTravelToNextStage();
    }

    // 2. SPATIAL GRID REBUILD (Throttled to Once Per Frame)
    if (isFirstStep && !isTraveling && spawnIndex > 0) {
        // We use an ABSOLUTE world grid now centered at GRID_WORLD_OFFSET. 
        for (let i = 0; i < occupiedCount; i++) heads[occupiedCells[i]] = -1;
        occupiedCount = 0;

        for (let i = 0; i < spawnIndex; i++) {
            const idx = i * STRIDE;
            const h = data[idx + 8], df = data[idx + 9];
            if (h <= 0 && df <= 0) continue;

            // GRID_WORLD_OFFSET shifts everything to positive integers
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

    // 3. TARGETING (10Hz)
    if (!isTraveling && (now - lastTargetUpdate > 100)) {
        lastTargetUpdate = now;
        findNearestEnemy();
    }

    // 4. PLAYER SYSTEMS
    updatePlayerShield(dt, sc);

    // Weapon Ammo Recovery
    Object.keys(WEAPON_CONFIG).forEach(key => {
        const wcfg = WEAPON_CONFIG[key];
        if (weaponAmmo[key] < wcfg.maxAmmo) {
            weaponAmmo[key] += (wcfg.recoveryRate || 50) * (dt / 1000);
            if (weaponAmmo[key] > wcfg.maxAmmo) weaponAmmo[key] = wcfg.maxAmmo;

            // Exit recharge mode if threshold reached
            if (weaponRechargeMode[key] && weaponAmmo[key] >= (wcfg.minAmmoToFire || 0)) {
                weaponRechargeMode[key] = false;
            }
        }
    });

    for (let i = 0; i < 4; i++) {
        if (skillCooldowns[i] > 0) {
            skillCooldowns[i] -= dt * PERFORMANCE.GAME_SPEED;
            if (skillCooldowns[i] < 0) skillCooldowns[i] = 0;
        }
    }

    // AUTO SKILL TRIGGER
    if (autoSkills && player.targetIdx !== -1) {
        const tIdx = player.targetIdx * STRIDE;
        const dx = data[tIdx] - player.x, dy = data[tIdx + 1] - player.y;
        const distSq = dx * dx + dy * dy;

        if (skillCooldowns[0] <= 0 && distSq < (SKILLS.Tier1.skillRange * SKILLS.Tier1.skillRange)) activateSupernova(1);
        if (skillCooldowns[1] <= 0 && distSq < (SKILLS.Tier2.skillRange * SKILLS.Tier2.skillRange)) activateSupernova(2);
        if (skillCooldowns[2] <= 0 && distSq < (SKILLS.Tier3.skillRange * SKILLS.Tier3.skillRange)) activateSupernova(3);
        if (skillCooldowns[3] <= 0 && distSq < (SKILLS.SwordOfLight.skillRange * SKILLS.SwordOfLight.skillRange)) activateSwordOfLight();
    }

    // 5. SKILL INSTANCE UPDATES (Animation & Lifespan)
    const spd = PERFORMANCE.GAME_SPEED;
    for (let i = activeSkillCount - 1; i >= 0; i--) {
        const poolIdx = activeSkillIndices[i];
        const idx = poolIdx * SKILL_STRIDE;

        const type = skillData[idx + 6];
        const tier = skillData[idx + 5];

        if (type === 1) { // SwordOfLight
            const cfg = SKILLS.SwordOfLight;
            skillData[idx + 1] += cfg.animSpeedSkill * (dt / 16.6) * spd;
            skillData[idx] += skillData[idx + 4] * (dt / 16.6) * spd; // orbit (usually 0)

            // Loop animation
            if (skillData[idx + 1] >= cfg.skillFrames) skillData[idx + 1] %= cfg.skillFrames;

            // Check duration
            skillData[idx + 7] += dt * spd;
            if (skillData[idx + 7] >= skillData[idx + 8]) {
                skillData[idx + 9] = 0;
                activeSkillIndices[i] = activeSkillIndices[activeSkillCount - 1];
                activeSkillCount--;
            }
        } else {
            // Standard Supernova
            const cfg = SKILLS['Tier' + (tier || 3)] || SKILLS.Tier3;
            skillData[idx + 1] += cfg.animSpeedSkill * (dt / 16.6) * spd;
            skillData[idx] += skillData[idx + 4] * (dt / 16.6) * spd;

            if (skillData[idx + 1] >= cfg.skillFrames) {
                skillData[idx + 9] = 0;
                activeSkillIndices[i] = activeSkillIndices[activeSkillCount - 1];
                activeSkillCount--;
            }
        }
    }

    // Camera Smoothing
    zoom += (targetZoom - zoom) * 0.1;

    updatePlayerMovement(dt, sc);
    updateEnemies(dt, now, isFirstStep);

    // 5. COMBAT TICK
    if (!isTraveling && now - lastCombatUpdate > DAMAGE_INTERVAL) {
        lastCombatUpdate = now;
        processAOEDamage();
        processSkillDamage(); // Handle triple-ring supernova hits
    }

    // 6. WEAPON SYSTEMS
    if (!isTraveling && player.targetIdx !== -1) {
        Object.keys(WEAPON_CONFIG).forEach(key => {
            const wcfg = WEAPON_CONFIG[key];
            // Scale interval by game speed so weapons fire faster at higher speeds
            const interval = (1000 / (wcfg.fireRate || 10)) / PERFORMANCE.GAME_SPEED;

            if (weaponTimers[key] === 0 || now - weaponTimers[key] > 1000) {
                weaponTimers[key] = now - interval;
            }

            let safety = 0;
            while (now - weaponTimers[key] >= interval && safety < 10) {
                // CRITICAL: Check recharge mode FIRST, before any ammo checks
                if (weaponRechargeMode[key]) {
                    // Weapon is locked in recharge - do not fire
                    weaponTimers[key] = now;
                    break;
                }

                // Only proceed if we have enough ammo
                if (weaponAmmo[key] >= 1.0) {
                    const type = (key === 'bullet_left_side') ? 0 : (key === 'bullet_right_side' ? 1 : 2);
                    fireWeapon(key, type);
                    weaponAmmo[key] -= 1.0;
                    weaponTimers[key] += interval;

                    // Check if we just depleted - enter recharge mode immediately
                    if (weaponAmmo[key] < 1.0) {
                        weaponAmmo[key] = 0;
                        weaponRechargeMode[key] = true;
                        break;
                    }
                } else {
                    // Not enough ammo - enter recharge mode
                    weaponAmmo[key] = 0;
                    weaponRechargeMode[key] = true;
                    weaponTimers[key] = now;
                    break;
                }
                safety++;
            }
        });
    }

    // Always update bullets every step to keep them synced with game speed
    if (!isTraveling) {
        updateBullets(dt);
    }
}

/**
 * SHIELD LOGIC
 */
function updatePlayerShield(dt, sc) {
    // Always tick down cooldown if it's active
    if (player.shieldCooldownRemaining > 0) {
        player.shieldCooldownRemaining -= dt * PERFORMANCE.GAME_SPEED;
        if (player.shieldCooldownRemaining < 0) player.shieldCooldownRemaining = 0;
    }

    if (player.shieldActive) {
        player.shieldDurationRemaining -= dt * PERFORMANCE.GAME_SPEED;

        if (player.shieldAnimState === 'TURNING_ON') {
            player.shieldFrame += 0.8 * (dt / 16.6) * PERFORMANCE.GAME_SPEED;
            if (player.shieldFrame >= sc.shieldTurnOnFrames) {
                player.shieldAnimState = 'ON';
                player.shieldFrame = 0;
            }
        } else if (player.shieldAnimState === 'ON') {
            player.shieldFrame = (player.shieldFrame + 0.4 * (dt / 16.6) * PERFORMANCE.GAME_SPEED) % sc.shieldOnFrames;
        }

        if (player.shieldDurationRemaining <= 0 || player.shieldHP <= 0) {
            player.shieldActive = false;
            player.shieldAnimState = 'OFF';
            // Don't reset cooldown here - it was already set when shield activated
        }
    }
}

/**
 * NEAREST ENEMY SEARCH
 */
function findNearestEnemy() {
    let closestDistSq = Infinity;
    let found = -1;
    const maxDetectionSq = SHIP_CONFIG.detectionRadius * SHIP_CONFIG.detectionRadius;

    // Localized search based on player's current grid cell
    const pgx = Math.floor((player.x + GRID_WORLD_OFFSET) / GRID_CELL);
    const pgy = Math.floor((player.y + GRID_WORLD_OFFSET) / GRID_CELL);

    // Calculate search radius based on detection range
    const searchRadius = Math.ceil(SHIP_CONFIG.detectionRadius / GRID_CELL);

    for (let ox = -searchRadius; ox <= searchRadius; ox++) {
        const row = (pgy + ox);
        if (row < 0 || row >= GRID_DIM) continue;
        const cellRow = row * GRID_DIM;

        for (let oy = -searchRadius; oy <= searchRadius; oy++) {
            const col = (pgx + oy);
            if (col < 0 || col >= GRID_DIM) continue;

            const cell = cellRow + col;
            let ptr = heads[cell];
            while (ptr !== -1) {
                const idx = ptr * STRIDE;
                if (data[idx + 8] > 0) {
                    const dx = data[idx] - player.x, dy = data[idx + 1] - player.y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < closestDistSq && dSq < maxDetectionSq) {
                        closestDistSq = dSq;
                        found = ptr;
                    }
                }
                ptr = next[ptr];
            }
        }
    }
    player.targetIdx = found;

    if (Math.random() < 0.01) {
        console.log(`[TARGETING] Nearest enemy: ${found}, closestDist: ${Math.sqrt(closestDistSq).toFixed(0)}, maxDetection: ${SHIP_CONFIG.detectionRadius}`);
    }
}

/**
 * PLAYER MOVEMENT
 */
function updatePlayerMovement(dt, sc) {
    const gameSpd = PERFORMANCE.GAME_SPEED;
    // Speed 25x = Stride 6 (1 in 6 frames)
    let animStride = 1.0;
    if (gameSpd >= 25) animStride = 6.0;
    else if (gameSpd >= 20) animStride = 5.0;
    else if (gameSpd >= 15) animStride = 2.5;
    else if (gameSpd >= 10) animStride = 1.66;
    else if (gameSpd >= 5) animStride = 1.25;

    if (isTraveling) {
        const dx = travelTargetX - player.x, dy = travelTargetY - player.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        player.rotation = Math.atan2(dy, dx);

        if (d < 1000) {
            arriveAtNewStage();
        } else {
            const speed = PLAYER_SPEED * 50;
            const travelStep = speed * (dt / 16.6) * gameSpd;
            const moveDist = Math.min(d, travelStep);
            player.x += (dx / d) * moveDist;
            player.y += (dy / d) * moveDist;
        }
        player.shipState = 'FULL';
        const jitter = 0.8 + Math.random() * 0.4;
        player.shipFrame = (player.shipFrame + sc.animSpeed * (dt / 16.6) * gameSpd * animStride * jitter) % sc.fullFrames;
    }
    else if (player.targetIdx !== -1) {
        const tIdx = player.targetIdx * STRIDE;
        const dx = data[tIdx] - player.x, dy = data[tIdx + 1] - player.y;
        const dSq = dx * dx + dy * dy;
        const d = Math.sqrt(dSq);

        if (Math.random() < 0.001) {
            console.log(`[MOVEMENT] Target found! Distance: ${d.toFixed(0)}, TargetIdx: ${player.targetIdx}`);
        }

        // Check if ALL weapons are in recharge mode
        const allWeaponsRecharging = weaponRechargeMode.bullet_left_side &&
            weaponRechargeMode.bullet_right_side &&
            weaponRechargeMode.laser;

        // Target rotation: face enemy normally, or face away during retreat
        const baseTargetRot = Math.atan2(dy, dx);
        const targetRot = allWeaponsRecharging ? baseTargetRot + Math.PI : baseTargetRot;

        let diff = targetRot - player.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turnStep = sc.turnSpeed * (dt / 1000) * gameSpd;

        if (Math.abs(diff) < turnStep) player.rotation = targetRot;
        else player.rotation += Math.sign(diff) * turnStep;

        if (d > 10) {
            // TACTICAL RETREAT: Move away from enemy when all weapons recharging
            const moveDirection = allWeaponsRecharging ? -1 : 1;
            player.x += (dx / d) * PLAYER_SPEED * moveDirection;
            player.y += (dy / d) * PLAYER_SPEED * moveDirection;
        }

        const animSpd = sc.animSpeed * (dt / 16.6) * gameSpd;
        if (d > sc.fullPowerDist) { player.shipState = 'FULL'; player.shipFrame = (player.shipFrame + animSpd) % sc.fullFrames; }
        else if (d > sc.thrustDist) { player.shipState = 'THRUST'; player.shipFrame = (player.shipFrame + animSpd) % sc.onFrames; }
        else { player.shipState = 'IDLE'; player.shipFrame = (player.shipFrame + animSpd) % sc.idleFrames; }
    }
}

/**
 * ENEMY AI & PHYSICS
 */
function updateEnemies(dt, now, isFirstStep) {
    if (isTraveling) return;

    const sizeMult = currentStage > 2 ? 2 + (currentStage - 2) * 0.2 : (currentStage === 2 ? 2 : 1);
    const dmgMult = currentStage >= 2 ? 2 : 1;
    const gameSpd = PERFORMANCE.GAME_SPEED;

    // ANIMATION DECIMATION (Skip frames at high speed to save GPU/Logic)
    // Speed 25x = Stride 6 (1 in 6 frames), Speed 5x = Stride 1.25, etc.
    let animStride = 1.0;
    if (gameSpd >= 25) animStride = 6.0;
    else if (gameSpd >= 20) animStride = 5.0;
    else if (gameSpd >= 15) animStride = 2.5;
    else if (gameSpd >= 10) animStride = 1.66;
    else if (gameSpd >= 5) animStride = 1.25;

    const objectiveMet = stageKillCount >= (STAGE_CONFIG.STAGES[currentStage]?.kills || 300);

    for (let i = 0; i < spawnIndex; i++) {
        const idx = i * STRIDE;
        const typeIdx = data[idx + 11] | 0;
        const typeKey = enemyKeys[typeIdx];
        const cfg = allConfigs[typeIdx];

        if (data[idx + 8] <= 0) {
            if (data[idx + 9] > 0) {
                data[idx + 9] += cfg.deathAnimSpeed * (dt / 16.6) * gameSpd;
                if (data[idx + 9] >= cfg.deathFrames) spawnEnemy(i, typeKey, true);
            }
            continue;
        }

        const px = data[idx], py = data[idx + 1];
        let dx = player.x - px, dy = player.y - py;
        const dSq = dx * dx + dy * dy;
        const d = Math.sqrt(dSq);
        const invD = 1 / d;

        // Check if enemy is charging
        const isCharging = data[idx + 10] > 0;

        if (objectiveMet && currentStage < 10) {
            // CRITICAL: Don't respawn enemies that are charging!
            // Increased distance from 15,000 to 1,000,000 to allow massive charge attacks
            if (!isCharging && dSq > 1000000000000) {  // 1,000,000 units
                spawnEnemy(i, typeKey, true);
                continue;
            }
            dx = -dx; dy = -dy;
        }

        const lookX = dx * invD, lookY = dy * invD;

        // Multi-Tier Stats Lookup
        const tierIndex = data[idx + 12] | 0;
        let targetRadius = cfg.attackRange;
        let mvSpd = data[idx + 6];

        if (tierIndex === 1) targetRadius = cfg.archAttackRange || targetRadius;
        else if (tierIndex === 2) targetRadius = cfg.godAttackRange || targetRadius;
        else if (tierIndex === 3) targetRadius = cfg.alphaAttackRange || targetRadius;
        else if (tierIndex === 4) targetRadius = cfg.omegaAttackRange || targetRadius;

        const pSpace = (cfg.size * sizeMult * (LOOT_CONFIG.TIERS[tierIndex].sizeMult || 1)) + cfg.spacing;
        const pSpaceSq = pSpace * pSpace;

        // Check if currently attacking (charge state)
        // Only Dragon and Phoenix types have charge attacks
        const hasChargeAttack = cfg.enemyType === 'Dragon' || cfg.enemyType === 'Phoenix' || cfg.enemyType === 'Butterfly';
        // isCharging already declared above - reuse it

        let distDiff, pullFactor;
        if (isCharging) {
            // During charge attack: aim for 4x stopping distance on OPPOSITE side
            // This makes them fly THROUGH the ship and far past it
            const chargeTargetDist = -(targetRadius * cfg.chargeDistanceMult);
            distDiff = d - chargeTargetDist;
            pullFactor = cfg.chargeSpeed;

            if (Math.random() < 0.01) {
                console.log(`[CHARGE] Charging! d=${d.toFixed(0)}, target=${chargeTargetDist.toFixed(0)}, diff=${distDiff.toFixed(0)}, speed=${cfg.chargeSpeed}`);
            }
        } else {
            // Normal movement: maintain stopping distance
            distDiff = d - (objectiveMet ? 20000 : targetRadius);
            pullFactor = (distDiff > 0 ? 0.5 : -0.25) * Math.abs(distDiff);
        }

        // CRITICAL FIX: When charging, use STORED direction instead of player-relative
        let steerX, steerY;
        if (isCharging) {
            // Use the stored charge direction (set when attack started)
            const chargeDirX = data[idx + 13];
            const chargeDirY = data[idx + 14];

            // Tiered Charge Speed
            let chargeSpd = cfg.chargeSpeed;
            if (tierIndex === 1) chargeSpd = cfg.archChargeSpeed || chargeSpd;
            else if (tierIndex === 2) chargeSpd = cfg.godChargeSpeed || chargeSpd;
            else if (tierIndex === 3) chargeSpd = cfg.alphaChargeSpeed || chargeSpd;
            else if (tierIndex === 4) chargeSpd = cfg.omegaChargeSpeed || chargeSpd;

            // Move in the stored direction at charge speed
            steerX = chargeDirX * chargeSpd;
            steerY = chargeDirY * chargeSpd;
        } else {
            // Normal movement: use player-relative direction
            steerX = lookX * pullFactor;
            steerY = lookY * pullFactor;
        }

        // SEPARATION FORCE (Localized Avoidance)
        // Skip during charge attacks - enemies should fly straight through
        // Optimized: Only run separation on half of the sub-steps to save CPU at extreme speeds.
        // Also added a HARD_SCAN_CAP to prevent O(N^2) freezes in crowded cells.
        if (!isCharging && dSq < 144000000 && (isFirstStep || i % 2 === 0)) {
            const gx = Math.floor((px + GRID_WORLD_OFFSET) / GRID_CELL);
            const gy = Math.floor((py + GRID_WORLD_OFFSET) / GRID_CELL);
            const NEIGHBOR_CAP = 4;
            const HARD_SCAN_CAP = 20; // Never check more than 20 enemies per cell
            let neighbors = 0;
            let checks = 0;

            for (let ox = -1; ox <= 1; ox++) {
                const row = (gy + ox);
                if (row < 0 || row >= GRID_DIM) continue;
                const cellRow = row * GRID_DIM;
                for (let oy = -1; oy <= 1; oy++) {
                    const col = (gx + oy);
                    if (col < 0 || col >= GRID_DIM) continue;

                    const cell = cellRow + col;
                    let nIdx = heads[cell];
                    while (nIdx !== -1) {
                        if (++checks > HARD_SCAN_CAP) break;
                        if (nIdx !== i) {
                            const oIdx = nIdx * STRIDE;
                            const vx = px - data[oIdx], vy = py - data[oIdx + 1];
                            const ndSq = vx * vx + vy * vy;
                            if (ndSq < pSpaceSq && ndSq > 0) {
                                const ndist = Math.sqrt(ndSq);
                                const force = ((pSpace - ndist) / (pSpace * ndist)) * 40;
                                steerX += vx * force; steerY += vy * force;
                                if (++neighbors > NEIGHBOR_CAP) break;
                            }
                        }
                        nIdx = next[nIdx];
                    }
                    if (neighbors > NEIGHBOR_CAP) break;
                }
            }
        }

        const magSq = steerX * steerX + steerY * steerY;
        if (magSq > 0.01) {
            const mag = Math.sqrt(magSq);
            // Use current velocity or charge speed as cap
            let speedCap = data[idx + 6] * 2;
            if (isCharging) {
                speedCap = cfg.chargeSpeed;
                if (tierIndex === 1) speedCap = cfg.archChargeSpeed || speedCap;
                else if (tierIndex === 2) speedCap = cfg.godChargeSpeed || speedCap;
                else if (tierIndex === 3) speedCap = cfg.alphaChargeSpeed || speedCap;
                else if (tierIndex === 4) speedCap = cfg.omegaChargeSpeed || speedCap;
            }
            const speed = Math.min(speedCap, mag * 20);
            const moveFactor = speed / mag;

            const moveX = steerX * moveFactor;
            const moveY = steerY * moveFactor;

            data[idx] += moveX;
            data[idx + 1] += moveY;

            // During charge, face the charge direction; otherwise face the player
            if (isCharging) {
                const chargeDirX = data[idx + 13];
                const chargeDirY = data[idx + 14];
                const look = Math.atan2(chargeDirY, chargeDirX);
                data[idx + 7] = look;
                data[idx + 4] = look + cfg.baseRotation;
            } else {
                const look = Math.atan2(dy, dx);
                data[idx + 7] = look;
                data[idx + 4] = look + cfg.baseRotation;
            }

            const moveDist = Math.sqrt(moveX * moveX + moveY * moveY);
            // Tiered Walk Animation Speed
            let walkAnimSpd = cfg.walkAnimSpeed;
            if (tierIndex === 1) walkAnimSpd = cfg.archWalkAnimSpeed || walkAnimSpd;
            else if (tierIndex === 2) walkAnimSpd = cfg.godWalkAnimSpeed || walkAnimSpd;
            else if (tierIndex === 3) walkAnimSpd = cfg.alphaWalkAnimSpeed || walkAnimSpd;
            else if (tierIndex === 4) walkAnimSpd = cfg.omegaWalkAnimSpeed || walkAnimSpd;

            // Apply randomized skip: stride * jitter factor
            const jitter = 0.8 + Math.random() * 0.4;
            data[idx + 5] = (data[idx + 5] + moveDist * walkAnimSpd * animStride * jitter) % cfg.walkFrames;
        }

        // Progress attack animation for Dragon/Phoenix types
        // Start new attack when at stopping distance, OR continue existing attack
        if (!objectiveMet && hasChargeAttack && (isCharging || d <= targetRadius * 1.2)) {
            processEnemyAttack(idx, cfg, dmgMult, d, animStride, tierIndex, targetRadius);
        }
    }
}

/**
 * ATTACK LOGIC (Charge Attack)
 * Enemies charge through the ship when attacking
 */
function processEnemyAttack(idx, cfg, dmgMult, d, animStride, tierIndex, targetRadius) {
    // Start attack if not already attacking
    if (data[idx + 10] === 0) {
        data[idx + 10] = 0.1;

        // CRITICAL: Store the charge direction AND starting position
        const px = data[idx], py = data[idx + 1];
        const dx = player.x - px;
        const dy = player.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Store normalized direction vector
        data[idx + 13] = dx / dist; // chargeDirX
        data[idx + 14] = dy / dist; // chargeDirY

        // Store starting position to calculate distance traveled
        data[idx + 15] = px; // chargeStartX
        data[idx + 16] = py; // chargeStartY

        if (Math.random() < 0.05) {
            console.log(`[CHARGE] Attack started! Start pos: (${px.toFixed(0)}, ${py.toFixed(0)})`);
        }
    } else {
        const prevF = Math.floor(data[idx + 10]);

        // Tiered Attack Animation Speed
        let attackSpeed = cfg.attackAnimSpeed;
        if (tierIndex === 1) attackSpeed = cfg.archAttackAnimSpeed || attackSpeed;
        else if (tierIndex === 2) attackSpeed = cfg.godAttackAnimSpeed || attackSpeed;
        else if (tierIndex === 3) attackSpeed = cfg.alphaAttackAnimSpeed || attackSpeed;
        else if (tierIndex === 4) attackSpeed = cfg.omegaAttackAnimSpeed || attackSpeed;

        // Apply stride + jitter to attack progress
        const jitter = 0.8 + Math.random() * 0.4;
        data[idx + 10] += attackSpeed * animStride * jitter;

        // Loop animation if it completes before charge finishes
        if (data[idx + 10] >= cfg.attackFrames) {
            data[idx + 10] = data[idx + 10] % cfg.attackFrames;
        }

        const currF = Math.floor(data[idx + 10]);

        // Deal damage at mid-point of charge
        if (prevF < (cfg.attackFrames / 2) && currF >= (cfg.attackFrames / 2)) {
            applyDamageToPlayer((cfg.damageMin + Math.random() * (cfg.damageMax - cfg.damageMin)) * dmgMult);
        }

        // Calculate distance TRAVELED (not distance from player)
        const currentX = data[idx], currentY = data[idx + 1];
        const startX = data[idx + 15], startY = data[idx + 16];
        const traveledDx = currentX - startX;
        const traveledDy = currentY - startY;
        const distanceTraveled = Math.sqrt(traveledDx * traveledDx + traveledDy * traveledDy);

        // Calculate how far enemy should charge
        let chargeMult = cfg.chargeDistanceMult;
        if (tierIndex === 1) chargeMult = cfg.archChargeDistanceMult || chargeMult;
        else if (tierIndex === 2) chargeMult = cfg.godChargeDistanceMult || chargeMult;
        else if (tierIndex === 3) chargeMult = cfg.alphaChargeDistanceMult || chargeMult;
        else if (tierIndex === 4) chargeMult = cfg.omegaChargeDistanceMult || chargeMult;

        const chargeTargetDist = targetRadius * chargeMult;

        // Reset attack ONLY when traveled far enough (not when animation completes)
        // Animation will loop if needed
        if (distanceTraveled >= chargeTargetDist) {
            data[idx + 10] = 0; // Reset to allow next attack
            data[idx + 13] = 0; // Clear charge direction
            data[idx + 14] = 0;
            data[idx + 15] = 0; // Clear start position
            data[idx + 16] = 0;

            if (Math.random() < 0.05) {
                console.log(`[CHARGE] Attack ended! Traveled: ${distanceTraveled.toFixed(0)}, Target: ${chargeTargetDist.toFixed(0)}, Tier: ${tierIndex}`);
            }
        }
    }
}

/**
 * AOE COMBAT ENGINE (Player Attack)
 */
function processAOEDamage() {
    const rSq = AOE_RADIUS * AOE_RADIUS;
    const pgx = Math.floor((player.x + GRID_WORLD_OFFSET) / GRID_CELL);
    const pgy = Math.floor((player.y + GRID_WORLD_OFFSET) / GRID_CELL);
    const rCell = Math.ceil(AOE_RADIUS / GRID_CELL);

    for (let ox = -rCell; ox <= rCell; ox++) {
        const row = (pgy + ox);
        if (row < 0 || row >= GRID_DIM) continue;
        const cellRow = row * GRID_DIM;

        for (let oy = -rCell; oy <= rCell; oy++) {
            const col = (pgx + oy);
            if (col < 0 || col >= GRID_DIM) continue;

            const cell = cellRow + col;
            let ptr = heads[cell];
            while (ptr !== -1) {
                const idx = ptr * STRIDE;
                if (data[idx + 8] > 0) {
                    const dx = data[idx] - player.x, dy = data[idx + 1] - player.y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < rSq) {
                        const isLucky = Math.random() < LUCKY_HIT_CHANCE;
                        data[idx + 8] -= DAMAGE_PER_POP;
                        spawnDamageNumber(data[idx], data[idx + 1] - 50, DAMAGE_PER_POP, isLucky);

                        if (data[idx + 8] <= 0) {
                            killCount++;
                            stageKillCount++;
                            data[idx + 8] = 0;
                            data[idx + 9] = 0.001;
                            spawnFX(data[idx], data[idx + 1], 0, 0, 500, FX_TYPES.EXPLOSION, 80);
                            handleEnemyDrop(enemyKeys[data[idx + 11] | 0], data[idx + 12] | 0, isLucky);
                        }
                    }
                }
                ptr = next[ptr];
            }
        }
    }
}

/**
 * SKILL COMBAT ENGINE (Triple Ring Hits)
 */
function processSkillDamage() {
    if (activeSkillCount === 0) return;

    // We iterate through each active flame instance
    for (let i = 0; i < activeSkillCount; i++) {
        const poolIdx = activeSkillIndices[i];
        const idx = poolIdx * SKILL_STRIDE;

        const type = skillData[idx + 6];
        const tier = skillData[idx + 5];

        let tierCfg;
        if (type === 1) tierCfg = SKILLS.SwordOfLight;
        else tierCfg = SKILLS['Tier' + (tier || 3)];

        if (!tierCfg) continue;
        const dmg = tierCfg.damageMult * (typeof DAMAGE_PER_POP !== 'undefined' ? DAMAGE_PER_POP : 1);

        // Calculate world position of this flame
        const sx = player.x + Math.cos(skillData[idx]) * skillData[idx + 2];
        const sy = player.y + Math.sin(skillData[idx]) * skillData[idx + 2];

        // Define hit radius for this specific flame
        const hitRadius = skillData[idx + 3] * 0.4;
        const rSq = hitRadius * hitRadius;

        // Efficient Grid Search
        const pgx = Math.floor((sx + GRID_WORLD_OFFSET) / GRID_CELL);
        const pgy = Math.floor((sy + GRID_WORLD_OFFSET) / GRID_CELL);
        const rCell = Math.ceil(hitRadius / GRID_CELL);

        for (let ox = -rCell; ox <= rCell; ox++) {
            const row = (pgy + ox);
            if (row < 0 || row >= GRID_DIM) continue;
            const cellRow = row * GRID_DIM;

            for (let oy = -rCell; oy <= rCell; oy++) {
                const col = (pgx + oy);
                if (col < 0 || col >= GRID_DIM) continue;

                const cell = cellRow + col;
                let ptr = heads[cell];
                while (ptr !== -1) {
                    const eIdx = ptr * STRIDE;
                    if (data[eIdx + 8] > 0) {
                        const ex = data[eIdx], ey = data[eIdx + 1];
                        const dSq = (sx - ex) ** 2 + (sy - ey) ** 2;
                        if (dSq < rSq) {
                            const isLucky = Math.random() < LUCKY_HIT_CHANCE;
                            data[eIdx + 8] -= dmg;
                            spawnDamageNumber(ex, ey - 50, Math.floor(dmg), isLucky);

                            if (data[eIdx + 8] <= 0) {
                                killCount++; stageKillCount++;
                                data[eIdx + 8] = 0; data[eIdx + 9] = 0.001;
                                spawnFX(ex, ey, 0, 0, 500, FX_TYPES.EXPLOSION, 80);
                                handleEnemyDrop(enemyKeys[data[eIdx + 11] | 0], data[eIdx + 12] | 0, isLucky);
                            }
                        }
                    }
                    ptr = next[ptr];
                }
            }
        }
    }
}

/**
 * PLAYER DAMAGE HANDLING
 */
function applyDamageToPlayer(dmg) {
    if (!player.shieldActive && player.shieldCooldownRemaining <= 0) {
        player.shieldActive = true; player.shieldAnimState = 'TURNING_ON';
        player.shieldFrame = 0; player.shieldHP = player.shieldMaxHP;
        player.shieldDurationRemaining = SHIP_CONFIG.shieldDuration;
        // Start cooldown immediately when shield activates
        player.shieldCooldownRemaining = SHIP_CONFIG.shieldCooldown;
    }

    if (player.shieldActive) {
        player.shieldHP -= dmg;
        if (player.shieldHP <= 0) {
            player.shieldActive = false;
            player.shieldAnimState = 'OFF';
            // Cooldown already started when shield activated
        }
    } else {
        player.health -= dmg;
        if (player.health <= 0) softReset();
    }
}

/**
 * ENEMY SPAWNER
 */
function spawnEnemy(i, typeKey, far = false) {
    const cfg = Enemy[typeKey];
    const idx = i * STRIDE;
    const angle = Math.random() * Math.PI * 2;
    const dist = (cfg.startDist + (Math.random() * cfg.startDist * 0.5)) * (far ? 1.5 : 1);
    const stageCoords = STAGE_CONFIG?.CLOCKWISE_GRID?.[currentStage - 1];
    if (!stageCoords) return;

    const [gx, gy] = stageCoords;
    const centerX = (gx - 1) * STAGE_CONFIG.GRID_SIZE, centerY = (gy - 1) * STAGE_CONFIG.GRID_SIZE;

    // Multi-Tier Logic (Standard, Arch, God, Alpha, Omega)
    const stageCfg = STAGE_CONFIG.STAGES[currentStage];
    const chances = stageCfg?.tierChances || { Arch: 0.02, God: 0.0, Alpha: 0.0, Omega: 0.0 };

    let tierIndex = 0; // Standard
    const roll = Math.random();

    // Check from rarest to most common
    if (roll < chances.Omega) tierIndex = 4;
    else if (roll < (chances.Omega + chances.Alpha)) tierIndex = 3;
    else if (roll < (chances.Omega + chances.Alpha + chances.God)) tierIndex = 2;
    else if (roll < (chances.Omega + chances.Alpha + chances.God + chances.Arch)) tierIndex = 1;

    // Stat Scaling from config
    const tierCfg = LOOT_CONFIG.TIERS[tierIndex];

    data[idx] = centerX + Math.cos(angle) * dist;
    data[idx + 1] = centerY + Math.sin(angle) * dist;
    data[idx + 6] = cfg.moveSpeed * (0.8 + Math.random() * 0.4); // Base

    // Scale moveSpeed if tier specific exists
    if (tierIndex === 1) data[idx + 6] = cfg.archMoveSpeed || data[idx + 6];
    else if (tierIndex === 2) data[idx + 6] = cfg.godMoveSpeed || data[idx + 6];
    else if (tierIndex === 3) data[idx + 6] = cfg.alphaMoveSpeed || data[idx + 6];
    else if (tierIndex === 4) data[idx + 6] = cfg.omegaMoveSpeed || data[idx + 6];

    data[idx + 8] = cfg.healthMax * tierCfg.healthMult;
    data[idx + 9] = 0;
    data[idx + 5] = Math.random() * cfg.walkFrames;
    data[idx + 10] = 0;
    data[idx + 11] = enemyKeys.indexOf(typeKey);
    data[idx + 12] = tierIndex; // Store Tier Index
}
/**
 * WEAPON SPAWNING (Single Shot)
 */
function fireWeapon(weaponKey, type) {
    const wcfg = WEAPON_CONFIG[weaponKey];
    const rot = player.rotation;
    const cos = Math.cos(rot), sin = Math.sin(rot);

    const sideX = -sin * wcfg.offsetSide, sideY = cos * wcfg.offsetSide;
    const frontX = cos * wcfg.offsetFront, frontY = sin * wcfg.offsetFront;

    createBullet(
        player.x + frontX + sideX,
        player.y + frontY + sideY,
        cos * wcfg.speed,
        sin * wcfg.speed,
        type,
        wcfg.damage || 10,
        wcfg.life || 75000,
        wcfg.penetration || 1
    );
}

function createBullet(x, y, vx, vy, type = 0, damage = 10, life = 75000, penetration = 1) {
    if (activeBulletCount >= totalBullets) return;

    // Find first inactive slot
    for (let i = 0; i < totalBullets; i++) {
        const idx = i * BULLET_STRIDE;
        if (bulletData[idx + 5] === 0) {
            bulletData[idx] = x; bulletData[idx + 1] = y;
            bulletData[idx + 2] = vx; bulletData[idx + 3] = vy;
            bulletData[idx + 4] = life;
            bulletData[idx + 5] = 1;
            bulletData[idx + 6] = type;
            bulletData[idx + 7] = penetration;
            // We'll store damage in a separate array if needed, but for now we can 
            // use a simple global mult or store it in the data if we expand stride.
            // ACTUALLY, let's just use the config during update based on type for damage.
            activeBulletIndices[activeBulletCount++] = i;
            return;
        }
    }
}

/**
 * PROJECTILE SIMULATION & COLLISION
 */
function updateBullets(dt) {
    const spd = PERFORMANCE.GAME_SPEED;

    for (let i = activeBulletCount - 1; i >= 0; i--) {
        const bulletIdx = activeBulletIndices[i];
        const idx = bulletIdx * BULLET_STRIDE;
        const bType = bulletData[idx + 6];

        // Get config based on type
        let wcfg;
        if (bType === 0) wcfg = WEAPON_CONFIG.bullet_left_side;
        else if (bType === 1) wcfg = WEAPON_CONFIG.bullet_right_side;
        else wcfg = WEAPON_CONFIG.laser;

        const dmg = wcfg.damage || 10;

        // Move
        bulletData[idx] += bulletData[idx + 2] * (dt / 16.6) * spd;
        bulletData[idx + 1] += bulletData[idx + 3] * (dt / 16.6) * spd;
        bulletData[idx + 4] -= dt * spd;

        let bulletDead = bulletData[idx + 4] <= 0;

        if (!bulletDead) {
            const bx = bulletData[idx], by = bulletData[idx + 1];
            const gx = Math.floor((bx + GRID_WORLD_OFFSET) / GRID_CELL);
            const gy = Math.floor((by + GRID_WORLD_OFFSET) / GRID_CELL);

            if (gx >= 0 && gx < GRID_DIM && gy >= 0 && gy < GRID_DIM) {
                const cell = gy * GRID_DIM + gx;
                let ptr = heads[cell];
                while (ptr !== -1) {
                    const eIdx = ptr * STRIDE;
                    if (data[eIdx + 8] > 0) {
                        const ex = data[eIdx], ey = data[eIdx + 1];
                        const cfg = Enemy[enemyKeys[data[eIdx + 11] | 0]];
                        const dSq = (bx - ex) ** 2 + (by - ey) ** 2;
                        const r = cfg.size * 0.4;
                        if (dSq < r * r) {
                            const isLucky = Math.random() < LUCKY_HIT_CHANCE;
                            data[eIdx + 8] -= dmg;
                            spawnDamageNumber(bx, by - 50, dmg, isLucky);
                            if (data[eIdx + 8] <= 0) {
                                killCount++; stageKillCount++;
                                data[eIdx + 8] = 0; data[eIdx + 9] = 0.001;
                                spawnFX(bx, by, 0, 0, 500, FX_TYPES.EXPLOSION, 80);
                                handleEnemyDrop(enemyKeys[data[eIdx + 11] | 0], data[eIdx + 12] | 0, isLucky);
                                for (let k = 0; k < 5; k++) spawnFX(bx, by, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 300, FX_TYPES.SPARK, 10);
                            }

                            // Penetration Logic
                            bulletData[idx + 7]--;
                            if (bulletData[idx + 7] <= 0) {
                                bulletDead = true;
                                break;
                            }
                        }
                    }
                    ptr = next[ptr];
                }
            }
        }

        if (bulletDead) {
            bulletData[idx + 5] = 0;
            activeBulletIndices[i] = activeBulletIndices[activeBulletCount - 1];
            activeBulletCount--;
        }
    }
}

/**
 * DAMAGE SYSTEM (Floating Numbers)
 */
function spawnDamageNumber(x, y, val, lucky = false) {
    if (activeDamageCount >= DAMAGE_POOL_SIZE) return;
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
        if (!damageNumbers[i].active) {
            const dn = damageNumbers[i];
            dn.active = true; dn.x = x; dn.y = y; dn.val = val;
            dn.isLucky = lucky;
            dn.life = 1.0;
            dn.vx = (Math.random() - 0.5) * 5;
            dn.vy = -5 - Math.random() * 2;
            activeDamageIndices[activeDamageCount++] = i;
            return;
        }
    }
}
