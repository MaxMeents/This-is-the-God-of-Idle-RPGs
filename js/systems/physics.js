/**
 * PHYSICS & SIMULATION ENGINE
 * This is the 'Brain' of the game. It handles movement, collision avoidance, 
 * combat, and stage progression.
 */

let lastGridUpdate = 0;
let lastTargetUpdate = 0;
let lastCombatUpdate = 0;

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
    if (skillCooldownRemaining > 0) {
        skillCooldownRemaining -= dt * PERFORMANCE.GAME_SPEED;
        if (skillCooldownRemaining < 0) skillCooldownRemaining = 0;
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
        if (now - lastFireTime > (1000 / WEAPON_CONFIG.fireRate)) {
            spawnLasers();
            lastFireTime = now;
        }
    }
    // Sub-step Throttle for Bullets: At high speed (25x), update every 2nd step to save CPU.
    // Use the sub-step index 's' to ensure balanced load across the frame.
    if (!isTraveling && (PERFORMANCE.GAME_SPEED < 10 || isFirstStep || s % 2 === 0)) {
        updateBullets(dt);
    }
}

/**
 * SHIELD LOGIC
 */
function updatePlayerShield(dt, sc) {
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
            player.shieldCooldownRemaining = sc.shieldCooldown;
        }
    } else if (player.shieldCooldownRemaining > 0) {
        player.shieldCooldownRemaining -= dt * PERFORMANCE.GAME_SPEED;
        if (player.shieldCooldownRemaining < 0) player.shieldCooldownRemaining = 0;
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
        const speed = PLAYER_SPEED * 50;
        const dx = travelTargetX - player.x, dy = travelTargetY - player.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        player.rotation = Math.atan2(dy, dx);

        if (d < 1000) arriveAtNewStage();
        else {
            player.x += (dx / d) * speed;
            player.y += (dy / d) * speed;
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

        const targetRot = Math.atan2(dy, dx);
        let diff = targetRot - player.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turnStep = sc.turnSpeed * (dt / 1000) * gameSpd;

        if (Math.abs(diff) < turnStep) player.rotation = targetRot;
        else player.rotation += Math.sign(diff) * turnStep;

        if (d > 10) {
            player.x += (dx / d) * PLAYER_SPEED;
            player.y += (dy / d) * PLAYER_SPEED;
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

        // Use attackRange as stopping distance, archAttackRange for Arch enemies
        const isArch = data[idx + 12] > 0.5;
        const targetRadius = isArch ? cfg.archAttackRange : cfg.attackRange;

        const pSpace = (cfg.size * sizeMult) + cfg.spacing;
        const pSpaceSq = pSpace * pSpace;

        // Check if currently attacking (charge state)
        // Only Dragon and Phoenix types have charge attacks
        const hasChargeAttack = cfg.enemyType === 'Dragon' || cfg.enemyType === 'Phoenix';
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

            // Use Arch charge speed if Arch enemy
            const chargeSpd = isArch ? cfg.archChargeSpeed : cfg.chargeSpeed;

            // Move in the stored direction at charge speed
            steerX = chargeDirX * chargeSpd;
            steerY = chargeDirY * chargeSpd;

            if (Math.random() < 0.01) {
                console.log(`[CHARGE] Using stored dir: (${chargeDirX.toFixed(2)}, ${chargeDirY.toFixed(2)}), speed=${chargeSpd}, isArch=${isArch}`);
            }
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
            // Use charge speed cap when attacking, normal speed otherwise
            const speedCap = isCharging ? cfg.chargeSpeed : data[idx + 6] * 2;
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
            // Apply randomized skip: stride * jitter factor
            const jitter = 0.8 + Math.random() * 0.4;
            data[idx + 5] = (data[idx + 5] + moveDist * cfg.walkAnimSpeed * animStride * jitter) % cfg.walkFrames;
        }

        // Progress attack animation for Dragon/Phoenix types
        // Start new attack when at stopping distance, OR continue existing attack
        if (!objectiveMet && hasChargeAttack && (isCharging || d <= targetRadius * 1.2)) {
            processEnemyAttack(idx, cfg, dmgMult, d, animStride, isArch, targetRadius);
        }
    }
}

/**
 * ATTACK LOGIC (Charge Attack)
 * Enemies charge through the ship when attacking
 */
function processEnemyAttack(idx, cfg, dmgMult, d, animStride, isArch, targetRadius) {
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

        // Use faster attack speed for Arch enemies
        const attackSpeed = isArch ? cfg.archAttackAnimSpeed : cfg.attackAnimSpeed;

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

        // Calculate how far enemy should charge (Arch enemies charge farther)
        const chargeMult = isArch ? cfg.archChargeDistanceMult : cfg.chargeDistanceMult;
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
                console.log(`[CHARGE] Attack ended! Traveled: ${distanceTraveled.toFixed(0)}, Target: ${chargeTargetDist.toFixed(0)}, isArch: ${isArch}`);
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
                        data[idx + 8] -= DAMAGE_PER_POP;
                        spawnDamageNumber(data[idx], data[idx + 1] - 50, DAMAGE_PER_POP);

                        if (data[idx + 8] <= 0) {
                            killCount++;
                            stageKillCount++;
                            data[idx + 8] = 0;
                            data[idx + 9] = 0.001;
                            spawnFX(data[idx], data[idx + 1], 0, 0, 500, FX_TYPES.EXPLOSION, 80);
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
    if (activeSkills.length === 0) return;
    const cfg = SKILLS.MulticolorXFlame;
    const dmg = cfg.damageMult * DAMAGE_PER_POP;

    // We iterate through each active flame instance
    for (const skill of activeSkills) {
        // Calculate world position of this flame
        const sx = player.x + Math.cos(skill.angle) * skill.radius;
        const sy = player.y + Math.sin(skill.angle) * skill.radius;

        // Define hit radius for this specific flame
        const hitRadius = skill.size * 0.4;
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
                    const idx = ptr * STRIDE;
                    if (data[idx + 8] > 0) {
                        const dx = data[idx] - sx, dy = data[idx + 1] - sy;
                        const dSq = dx * dx + dy * dy;
                        if (dSq < rSq) {
                            data[idx + 8] -= dmg;
                            spawnDamageNumber(data[idx], data[idx + 1] - 50, Math.floor(dmg));

                            if (data[idx + 8] <= 0) {
                                killCount++;
                                stageKillCount++;
                                data[idx + 8] = 0;
                                data[idx + 9] = 0.001; // Trigger death animation
                                spawnFX(data[idx], data[idx + 1], 0, 0, 500, FX_TYPES.EXPLOSION, 100);
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
    }

    if (player.shieldActive) {
        player.shieldHP -= dmg;
        if (player.shieldHP <= 0) {
            player.shieldActive = false;
            player.shieldAnimState = 'OFF';
            player.shieldCooldownRemaining = SHIP_CONFIG.shieldCooldown;
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
    if (!stageCoords) return; // Guard against initialization race conditions

    const [gx, gy] = stageCoords;
    const centerX = (gx - 1) * STAGE_CONFIG.GRID_SIZE, centerY = (gy - 1) * STAGE_CONFIG.GRID_SIZE;


    // Arch enemy logic: Use stage-specific chance if available, otherwise use enemy default
    const stageCfg = STAGE_CONFIG.STAGES[currentStage];
    const archKey = `Arch${typeKey}`;
    const archChance = stageCfg?.archChance?.[archKey] ?? cfg.archChance;

    const isArch = Math.random() < archChance;
    const healthMult = isArch ? 30 : 1;
    const sizeMult = isArch ? 5 : 1;

    data[idx] = centerX + Math.cos(angle) * dist;
    data[idx + 1] = centerY + Math.sin(angle) * dist;
    data[idx + 6] = cfg.moveSpeed * (0.8 + Math.random() * 0.4);
    data[idx + 8] = cfg.healthMax * healthMult;
    data[idx + 9] = 0;
    data[idx + 5] = Math.random() * cfg.walkFrames;
    data[idx + 10] = 0;
    data[idx + 11] = enemyKeys.indexOf(typeKey);
    data[idx + 12] = isArch ? 1.0 : 0.0; // Arch flag

    if (isArch) {
        console.log(`[ARCH] Stage ${currentStage} - Spawned ARCH ${typeKey}! HP: ${data[idx + 8]}, Size: ${cfg.size * sizeMult}, Chance: ${(archChance * 100).toFixed(1)}%`);
    }
}
/**
 * WEAPON SPAWNING (Dual Lasers)
 */
function spawnLasers() {
    const cfg = WEAPON_CONFIG;
    const rot = player.rotation;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const sideX = -sin * cfg.offsetSide, sideY = cos * cfg.offsetSide;
    const frontX = cos * cfg.offsetFront, frontY = sin * cfg.offsetFront;

    // Spawn Left and Right
    createBullet(player.x + frontX + sideX, player.y + frontY + sideY, cos * cfg.bulletSpeed, sin * cfg.bulletSpeed);
    createBullet(player.x + frontX - sideX, player.y + frontY - sideY, cos * cfg.bulletSpeed, sin * cfg.bulletSpeed);
}

function createBullet(x, y, vx, vy) {
    if (activeBulletCount >= totalBullets) return;

    // Find first inactive slot
    for (let i = 0; i < totalBullets; i++) {
        const idx = i * BULLET_STRIDE;
        if (bulletData[idx + 5] === 0) {
            bulletData[idx] = x; bulletData[idx + 1] = y;
            bulletData[idx + 2] = vx; bulletData[idx + 3] = vy;
            bulletData[idx + 4] = WEAPON_CONFIG.bulletLife;
            bulletData[idx + 5] = 1;
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
    const dmg = WEAPON_CONFIG.damage;

    for (let i = activeBulletCount - 1; i >= 0; i--) {
        const bulletIdx = activeBulletIndices[i];
        const idx = bulletIdx * BULLET_STRIDE;

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
                            data[eIdx + 8] -= dmg;
                            spawnDamageNumber(bx, by - 50, dmg);
                            if (data[eIdx + 8] <= 0) {
                                killCount++; stageKillCount++;
                                data[eIdx + 8] = 0; data[eIdx + 9] = 0.001;
                                spawnFX(bx, by, 0, 0, 500, FX_TYPES.EXPLOSION, 80);
                                for (let k = 0; k < 5; k++) spawnFX(bx, by, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 300, FX_TYPES.SPARK, 10);
                            }
                            bulletDead = true; break;
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
function spawnDamageNumber(x, y, val) {
    if (activeDamageCount >= DAMAGE_POOL_SIZE) return;
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
        if (!damageNumbers[i].active) {
            const dn = damageNumbers[i];
            dn.active = true; dn.x = x; dn.y = y; dn.val = val;
            dn.life = 1.0;
            dn.vx = (Math.random() - 0.5) * 5;
            dn.vy = -5 - Math.random() * 2;
            activeDamageIndices[activeDamageCount++] = i;
            return;
        }
    }
}
