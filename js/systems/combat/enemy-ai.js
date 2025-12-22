/**
 * ENEMY AI & PHYSICS
 * 
 * Manages individual enemy behavior, multi-tiered stat scaling, 
 * advanced charge attacks, and localized spatial avoidance.
 * 
 * LOCATED IN: js/systems/combat/enemy-ai.js
 * DEPENDS ON: js/core/config/stage-config.js, js/systems/combat/damage-processor.js
 */

/**
 * MAIN ENEMY UPDATE LOOP
 * Processes movement, AI states, and animation for all active entities.
 */
function updateEnemies(dt, now, isFirstStep) {
    if (isTraveling) return;

    const isSim = currentStage > 2000;
    const sId = isSim ? (currentStage - 2000) : currentStage;

    // MASTER SCALING (2500 Stages Logic)
    let statsMultiplier = sId;
    if (isSim) {
        const diffIdx = SIMULATION_CONFIG.DIFFICULTY.findIndex(d => d.id === (window.simulationDifficulty?.id || 'normal'));
        statsMultiplier = SIMULATION_CONFIG.getStatScale(sId, diffIdx);
    }

    const sizeMult = currentStage > 2 ? 2 + (currentStage - 2) * 0.2 : (currentStage === 2 ? 2 : 1);
    const dmgMult = statsMultiplier;
    const gameSpd = PERFORMANCE.GAME_SPEED;

    // ANIMATION DECIMATION: Sync with global simulation speed
    let animStride = 1.0;
    if (gameSpd >= 25) animStride = 6.0;
    else if (gameSpd >= 20) animStride = 5.0;
    else if (gameSpd >= 15) animStride = 2.5;
    else if (gameSpd >= 10) animStride = 1.66;
    else if (gameSpd >= 5) animStride = 1.25;

    const objectiveMet = isSim ?
        (stageKillCount >= (window.simulationLevel?.kills || 300)) :
        (stageKillCount >= (STAGE_CONFIG.STAGES[currentStage]?.kills || 300));

    for (let i = 0; i < spawnIndex; i++) {
        const idx = i * STRIDE;
        const typeIdx = data[idx + 11] | 0;
        const typeKey = enemyKeys[typeIdx];
        const cfg = allConfigs[typeIdx]; // Using index-cached configs for speed

        // 1. DEATH STATE PROCESSING
        if (data[idx + 8] <= 0) {
            if (data[idx + 9] > 0) {
                data[idx + 9] += cfg.deathAnimSpeed * (dt / 16.6) * gameSpd;
                // Respawn once animation finishes
                if (data[idx + 9] >= cfg.deathFrames) spawnEnemy(i, typeKey, true);
            }
            continue;
        }

        const px = data[idx], py = data[idx + 1];
        let dx = player.x - px, dy = player.y - py;
        const dSq = dx * dx + dy * dy;
        const d = Math.sqrt(dSq);
        const invD = 1 / d;

        const isCharging = data[idx + 10] > 0;

        // 2. OFF-SCREEN CLEANUP
        if (objectiveMet && currentStage < 10) {
            // Retreat from player if stage clear
            if (!isCharging && dSq > 1000000000000) {
                spawnEnemy(i, typeKey, true);
                continue;
            }
            dx = -dx; dy = -dy;
        }

        const lookX = dx * invD, lookY = dy * invD;

        // 3. TIERED STAT LOOKUP
        const tierIndex = data[idx + 12] | 0;
        let targetRadius = cfg.attackRange;

        if (tierIndex === 1) targetRadius = cfg.archAttackRange || targetRadius;
        else if (tierIndex === 2) targetRadius = cfg.godAttackRange || targetRadius;
        else if (tierIndex === 3) targetRadius = cfg.omegaAttackRange || targetRadius;
        else if (tierIndex === 4) targetRadius = cfg.alphaAttackRange || targetRadius;

        const pSpace = (cfg.size * sizeMult * (LOOT_CONFIG.TIERS[tierIndex].sizeMult || 1)) + cfg.spacing;
        const pSpaceSq = pSpace * pSpace;

        const hasChargeAttack = cfg.enemyType === 'Dragon' || cfg.enemyType === 'Phoenix' || cfg.enemyType === 'Butterfly';

        // 4. STEERING LOGIC
        let distDiff, pullFactor;
        if (isCharging) {
            const chargeTargetDist = -(targetRadius * cfg.chargeDistanceMult);
            distDiff = d - chargeTargetDist;
            pullFactor = cfg.chargeSpeed;
        } else {
            distDiff = d - (objectiveMet ? 20000 : targetRadius);
            pullFactor = (distDiff > 0 ? 0.5 : -0.25) * Math.abs(distDiff);
        }

        let steerX, steerY;
        if (isCharging) {
            // CRITICAL: Use STORED direction for charge to maintain straight path
            const chargeDirX = data[idx + 13];
            const chargeDirY = data[idx + 14];

            let chargeSpd = cfg.chargeSpeed;
            if (tierIndex === 1) chargeSpd = cfg.archChargeSpeed || chargeSpd;
            else if (tierIndex === 2) chargeSpd = cfg.godChargeSpeed || chargeSpd;
            else if (tierIndex === 3) chargeSpd = cfg.omegaChargeSpeed || chargeSpd;
            else if (tierIndex === 4) chargeSpd = cfg.alphaChargeSpeed || chargeSpd;

            steerX = chargeDirX * chargeSpd;
            steerY = chargeDirY * chargeSpd;
        } else {
            steerX = lookX * pullFactor;
            steerY = lookY * pullFactor;
        }

        // 5. SEPARATION FORCE (Localized Avoidance)
        if (!isCharging && dSq < 144000000 && (isFirstStep || i % 2 === 0)) {
            const gx = Math.floor((px + GRID_WORLD_OFFSET) / GRID_CELL);
            const gy = Math.floor((py + GRID_WORLD_OFFSET) / GRID_CELL);
            const NEIGHBOR_CAP = 4;
            const HARD_SCAN_CAP = 20;
            let neighbors = 0;
            let checks = 0;

            for (let ox = -1; ox <= 1; ox++) {
                const row = (gy + ox);
                if (row < 0 || row >= GRID_DIM) continue;
                for (let oy = -1; oy <= 1; oy++) {
                    const col = (gx + oy);
                    if (col < 0 || col >= GRID_DIM) continue;
                    let nIdx = heads[row * GRID_DIM + col];
                    while (nIdx !== -1) {
                        if (++checks > HARD_SCAN_CAP) break;
                        if (nIdx !== i) {
                            const oIdx = nIdx * STRIDE;
                            const vx = px - data[oIdx], vy = py - data[oIdx + 1];
                            const ndSq = vx * vx + vy * vy;
                            if (ndSq < pSpaceSq && ndSq > 0) {
                                const dist = Math.sqrt(ndSq);
                                steerX += vx * (((pSpace - dist) / (pSpace * dist)) * 40);
                                steerY += vy * (((pSpace - dist) / (pSpace * dist)) * 40);
                                if (++neighbors > NEIGHBOR_CAP) break;
                            }
                        }
                        nIdx = next[nIdx];
                    }
                    if (neighbors > NEIGHBOR_CAP) break;
                }
            }
        }

        // 6. APPLY MOVEMENT
        const magSq = steerX * steerX + steerY * steerY;
        if (magSq > 0.01) {
            const mag = Math.sqrt(magSq);
            let speedCap = data[idx + 6] * 2;
            if (isCharging) {
                speedCap = cfg.chargeSpeed;
                if (tierIndex === 1) speedCap = cfg.archChargeSpeed || speedCap;
                else if (tierIndex === 2) speedCap = cfg.godChargeSpeed || speedCap;
                else if (tierIndex === 3) speedCap = cfg.omegaChargeSpeed || speedCap;
                else if (tierIndex === 4) speedCap = cfg.alphaChargeSpeed || speedCap;
            }

            const timeScale = (dt / 16.6) * gameSpd;
            const moveX = steerX * (Math.min(speedCap, mag * 20) / mag) * timeScale;
            const moveY = steerY * (Math.min(speedCap, mag * 20) / mag) * timeScale;

            data[idx] += moveX;
            data[idx + 1] += moveY;

            // Rotation
            const rotDirX = isCharging ? data[idx + 13] : dy;
            const rotDirY = isCharging ? data[idx + 14] : dx;
            const look = isCharging ? Math.atan2(rotDirY, rotDirX) : Math.atan2(dy, dx);
            data[idx + 7] = look;
            data[idx + 4] = look + cfg.baseRotation;

            // Animation
            const walkSpd = [cfg.walkAnimSpeed, cfg.archWalkAnimSpeed, cfg.godWalkAnimSpeed, cfg.omegaWalkAnimSpeed, cfg.alphaWalkAnimSpeed][tierIndex] || cfg.walkAnimSpeed;
            data[idx + 5] = (data[idx + 5] + Math.sqrt(moveX ** 2 + moveY ** 2) * walkSpd * animStride * (0.8 + Math.random() * 0.4)) % cfg.walkFrames;
        }

        // 7. ATTACK TRIGGERING
        if (!objectiveMet && hasChargeAttack && (isCharging || d <= targetRadius * 1.2)) {
            processEnemyAttack(idx, cfg, dmgMult, d, animStride, tierIndex, targetRadius);
        }
    }
}

/**
 * CHARGE ATTACK LOGIC
 */
function processEnemyAttack(idx, cfg, dmgMult, d, animStride, tierIndex, targetRadius) {
    if (data[idx + 10] === 0) {
        // INITIALIZE CHARGE
        data[idx + 10] = 0.1;
        const dx = player.x - data[idx], dy = player.y - data[idx + 1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        data[idx + 13] = dx / dist; // Normalized X
        data[idx + 14] = dy / dist; // Normalized Y
        data[idx + 15] = data[idx]; // Start X
        data[idx + 16] = data[idx + 1]; // Start Y
    } else {
        const prevF = Math.floor(data[idx + 10]);
        const atkSpd = [cfg.attackAnimSpeed, cfg.archAttackAnimSpeed, cfg.godAttackAnimSpeed, cfg.omegaAttackAnimSpeed, cfg.alphaAttackAnimSpeed][tierIndex] || cfg.attackAnimSpeed;
        data[idx + 10] += atkSpd * animStride * (0.8 + Math.random() * 0.4);

        if (data[idx + 10] >= cfg.attackFrames) data[idx + 10] %= cfg.attackFrames;

        // Damage Tick
        if (prevF < (cfg.attackFrames / 2) && Math.floor(data[idx + 10]) >= (cfg.attackFrames / 2)) {
            applyDamageToPlayer((cfg.damageMin + Math.random() * (cfg.damageMax - cfg.damageMin)) * dmgMult);
        }

        // Cleanup
        const chargeMult = [cfg.chargeDistanceMult, cfg.archChargeDistanceMult, cfg.godChargeDistanceMult, cfg.omegaChargeDistanceMult, cfg.alphaChargeDistanceMult][tierIndex] || cfg.chargeDistanceMult;
        const traveled = Math.sqrt((data[idx] - data[idx + 15]) ** 2 + (data[idx + 1] - data[idx + 16]) ** 2);

        if (traveled >= targetRadius * chargeMult) {
            data[idx + 10] = 0; data[idx + 13] = 0; data[idx + 14] = 0;
        }
    }
}

/**
 * ENEMY SPAWNER
 */
function spawnEnemy(i, typeKey, far = false) {
    const cfg = Enemy[typeKey];
    const idx = i * STRIDE;
    const isSim = currentStage > 2000;
    const navStageId = isSim ? 1 : currentStage;
    const stageCoords = STAGE_CONFIG?.CLOCKWISE_GRID?.[navStageId - 1];
    if (!stageCoords) return;

    const angle = Math.random() * Math.PI * 2;
    const dist = (cfg.startDist + (Math.random() * cfg.startDist * 0.5)) * (far ? 1.5 : 1);
    const centerX = (stageCoords[0] - 1) * STAGE_CONFIG.GRID_SIZE;
    const centerY = (stageCoords[1] - 1) * STAGE_CONFIG.GRID_SIZE;

    const chances = isSim ? { Arch: 0.1, God: 0.05, Omega: 0.02, Alpha: 0.01 } : (STAGE_CONFIG.STAGES[currentStage]?.tierChances || {});
    const roll = Math.random();
    let tier = 0;
    if (roll < (chances.Alpha || 0)) tier = 4;
    else if (roll < ((chances.Alpha || 0) + (chances.Omega || 0))) tier = 3;
    else if (roll < ((chances.Alpha || 0) + (chances.Omega || 0) + (chances.God || 0))) tier = 2;
    else if (roll < ((chances.Alpha || 0) + (chances.Omega || 0) + (chances.God || 0) + (chances.Arch || chances.Epic || 0))) tier = 1;
    const sId = isSim ? (currentStage - 2000) : currentStage;

    let hMult = sId;
    if (isSim) {
        const diffIdx = SIMULATION_CONFIG.DIFFICULTY.findIndex(d => d.id === (window.simulationDifficulty?.id || 'normal'));
        hMult = SIMULATION_CONFIG.getStatScale(sId, diffIdx);
    }

    const baseSpeed = [cfg.moveSpeed, cfg.archMoveSpeed, cfg.godMoveSpeed, cfg.omegaMoveSpeed, cfg.alphaMoveSpeed][tier] || cfg.moveSpeed;
    // Speed increases slightly with level (0.1% per level)
    const speedScale = 1 + (sId * 0.001);

    data[idx] = centerX + Math.cos(angle) * dist;
    data[idx + 1] = centerY + Math.sin(angle) * dist;
    data[idx + 6] = baseSpeed * speedScale;
    data[idx + 8] = cfg.healthMax * LOOT_CONFIG.TIERS[tier].healthMult * hMult;
    data[idx + 9] = 0;
    data[idx + 5] = Math.random() * cfg.walkFrames;
    data[idx + 10] = 0;
    data[idx + 11] = enemyKeys.indexOf(typeKey);
    data[idx + 12] = tier;
}
