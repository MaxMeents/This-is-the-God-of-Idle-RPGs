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
function update(dt, now, isFirstStep) {
    if (player.health <= 0) return;
    const sc = SHIP_CONFIG;

    if (!isTraveling && stageKillCount >= (STAGE_CONFIG.MAX_KILLS[currentStage] || 300) && currentStage < 10) {
        startTravelToNextStage();
    }

    // 2. SPATIAL GRID REBUILD (Throttled to Once Per Frame)
    if (isFirstStep) {
        // We use an ABSOLUTE world grid now centered at GRID_WORLD_OFFSET. 
        // This means we don't need to rebuild it every time the player moves.
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
                const cIdx = gy * GRID_DIM + gx;
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
    updateEnemies(dt, now);

    // 5. COMBAT TICK
    if (!isTraveling && now - lastCombatUpdate > DAMAGE_INTERVAL) {
        lastCombatUpdate = now;
        processAOEDamage();
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
    // Localized search based on player's current grid cell
    const pgx = Math.floor((player.x + GRID_WORLD_OFFSET) / GRID_CELL);
    const pgy = Math.floor((player.y + GRID_WORLD_OFFSET) / GRID_CELL);
    const searchRadius = 2;

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
                    if (dSq < closestDistSq) { closestDistSq = dSq; found = ptr; }
                }
                ptr = next[ptr];
            }
        }
    }
    player.targetIdx = found;
}

/**
 * PLAYER MOVEMENT
 */
function updatePlayerMovement(dt, sc) {
    const gameSpd = PERFORMANCE.GAME_SPEED;

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
        player.shipFrame = (player.shipFrame + sc.animSpeed * (dt / 16.6) * gameSpd) % sc.fullFrames;
    }
    else if (player.targetIdx !== -1) {
        const tIdx = player.targetIdx * STRIDE;
        const dx = data[tIdx] - player.x, dy = data[tIdx + 1] - player.y;
        const dSq = dx * dx + dy * dy;
        const d = Math.sqrt(dSq);

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
function updateEnemies(dt, now) {
    if (isTraveling) return;

    const sizeMult = currentStage > 2 ? 2 + (currentStage - 2) * 0.2 : (currentStage === 2 ? 2 : 1);
    const dmgMult = currentStage >= 2 ? 2 : 1;
    const gameSpd = PERFORMANCE.GAME_SPEED;
    const objectiveMet = stageKillCount >= (STAGE_CONFIG.MAX_KILLS[currentStage] || 300);

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

        if (objectiveMet && currentStage < 10) {
            if (dSq > 225000000) {
                spawnEnemy(i, typeKey, true);
                continue;
            }
            dx = -dx; dy = -dy;
        }

        const lookX = dx * invD, lookY = dy * invD;
        const targetRadius = cfg.closestDist;
        const pSpace = (cfg.size * sizeMult) + cfg.spacing;
        const pSpaceSq = pSpace * pSpace;

        const distDiff = d - (objectiveMet ? 20000 : targetRadius);
        const pullFactor = (distDiff > 0 ? 0.5 : -0.25) * Math.abs(distDiff);

        let steerX = lookX * pullFactor;
        let steerY = lookY * pullFactor;

        // SEPARATION FORCE
        if (dSq < 144000000) {
            const gx = Math.floor((px + GRID_WORLD_OFFSET) / GRID_CELL);
            const gy = Math.floor((py + GRID_WORLD_OFFSET) / GRID_CELL);
            const NEIGHBOR_CAP = 4;
            let neighbors = 0;

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
            const speedCap = data[idx + 6] * 2;
            const speed = Math.min(speedCap, mag * 20);
            const moveFactor = speed / mag;

            const moveX = steerX * moveFactor;
            const moveY = steerY * moveFactor;

            data[idx] += moveX;
            data[idx + 1] += moveY;

            const look = Math.atan2(dy, dx);
            data[idx + 7] = look;
            data[idx + 4] = look + cfg.baseRotation;

            const moveDist = Math.sqrt(moveX * moveX + moveY * moveY);
            data[idx + 5] = (data[idx + 5] + moveDist * cfg.walkAnimSpeed) % cfg.walkFrames;
        }

        if (!objectiveMet && d < cfg.attackRange) processEnemyAttack(idx, cfg, dmgMult, d);
    }
}

/**
 * ATTACK LOGIC
 */
function processEnemyAttack(idx, cfg, dmgMult, d) {
    if (data[idx + 10] === 0) data[idx + 10] = 0.1;
    else {
        const prevF = Math.floor(data[idx + 10]);
        data[idx + 10] += cfg.attackAnimSpeed;
        const currF = Math.floor(data[idx + 10]);

        if (prevF < (cfg.attackFrames / 2) && currF >= (cfg.attackFrames / 2)) {
            applyDamageToPlayer((cfg.damageMin + Math.random() * (cfg.damageMax - cfg.damageMin)) * dmgMult);
        }

        if (data[idx + 10] >= cfg.attackFrames) data[idx + 10] = 0.1;
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

                        for (let p = 0; p < DAMAGE_POOL_SIZE; p++) {
                            if (!damageNumbers[p].active) {
                                const dn = damageNumbers[p];
                                dn.active = true;
                                dn.x = data[idx];
                                dn.y = data[idx + 1] - 50;
                                dn.val = DAMAGE_PER_POP;
                                dn.life = 1.0;
                                dn.vx = (Math.random() - 0.5) * 2;
                                dn.vy = -2 - Math.random() * 2;
                                break;
                            }
                        }

                        if (data[idx + 8] <= 0) {
                            killCount++;
                            stageKillCount++;
                            data[idx + 8] = 0;
                            data[idx + 9] = 0.001;
                        }
                    }
                }
                ptr = next[ptr];
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
    const [gx, gy] = STAGE_CONFIG.CLOCKWISE_GRID[currentStage - 1];
    const centerX = (gx - 1) * STAGE_CONFIG.GRID_SIZE, centerY = (gy - 1) * STAGE_CONFIG.GRID_SIZE;

    data[idx] = centerX + Math.cos(angle) * dist; data[idx + 1] = centerY + Math.sin(angle) * dist;
    data[idx + 6] = cfg.moveSpeed * (0.8 + Math.random() * 0.4);
    data[idx + 8] = cfg.healthMax; data[idx + 9] = 0;
    data[idx + 5] = Math.random() * cfg.walkFrames;
    data[idx + 10] = 0; data[idx + 11] = enemyKeys.indexOf(typeKey);
}
