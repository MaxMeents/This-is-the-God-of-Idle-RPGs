function update(dt, now) {
    if (player.health <= 0) return;
    const sc = SHIP_CONFIG;

    // 1. STAGE PROGRESSION & TRAVEL LOGIC
    const targetKills = STAGE_CONFIG.MAX_KILLS[currentStage] || 300;
    const stageObjectiveMet = stageKillCount >= targetKills;

    if (stageObjectiveMet && !isTraveling && currentStage < 10) {
        startTravelToNextStage();
    }

    // Shield Cooldown
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

    // Skill Cooldown
    if (skillCooldownRemaining > 0) {
        skillCooldownRemaining -= dt * PERFORMANCE.GAME_SPEED;
        if (skillCooldownRemaining < 0) skillCooldownRemaining = 0;
    }

    // Enemy Spawning
    const targetCap = STAGE_CONFIG.MAX_KILLS[currentStage] || 300;
    for (let i = 0; i < PERFORMANCE.SPAWNS_PER_FRAME && spawnIndex < targetCap; i++) {
        spawnEnemy(spawnIndex, spawnList[spawnIndex], true);
        spawnIndex++;
    }

    // Camera Smoothing
    zoom += (targetZoom - zoom) * 0.1;

    // Grid Management
    const gridOffset = (GRID_DIM * GRID_CELL) / 2;
    for (let i = 0; i < occupiedCount; i++) heads[occupiedCells[i]] = -1;
    occupiedCount = 0;

    for (let i = 0; i < spawnIndex; i++) {
        const idx = i * STRIDE;
        if (data[idx + 8] <= 0 && data[idx + 9] <= 0) continue;
        const gx = Math.floor((data[idx] - player.x + gridOffset) / GRID_CELL);
        const gy = Math.floor((data[idx + 1] - player.y + gridOffset) / GRID_CELL);
        const cIdx = gy * GRID_DIM + gx;
        if (cIdx >= 0 && cIdx < heads.length) {
            if (heads[cIdx] === -1) occupiedCells[occupiedCount++] = cIdx;
            next[i] = heads[cIdx];
            heads[cIdx] = i;
        }
    }

    // Targeting
    if (!isTraveling && (now - player.lastTargetTime > 100)) {
        player.lastTargetTime = now;
        let closestDist = Infinity;
        let found = -1;
        const searchRadius = 2;
        const pgx = Math.floor(gridOffset / GRID_CELL);
        const pgy = Math.floor(gridOffset / GRID_CELL);

        for (let ox = -searchRadius; ox <= searchRadius; ox++) {
            for (let oy = -searchRadius; oy <= searchRadius; oy++) {
                const cell = (pgy + oy) * GRID_DIM + (pgx + ox);
                if (cell < 0 || cell >= heads.length) continue;
                let ptr = heads[cell];
                while (ptr !== -1) {
                    const idx = ptr * STRIDE;
                    if (data[idx + 8] > 0) {
                        const dx = data[idx] - player.x, dy = data[idx + 1] - player.y;
                        const dSq = dx * dx + dy * dy;
                        if (dSq < closestDist) { closestDist = dSq; found = ptr; }
                    }
                    ptr = next[ptr];
                }
            }
        }
        player.targetIdx = found;
    }

    // Movement
    let currentSpeed = PLAYER_SPEED;
    let targetX = player.x, targetY = player.y;

    if (isTraveling) {
        currentSpeed = PLAYER_SPEED * 50; // Super fast travel
        targetX = travelTargetX;
        targetY = travelTargetY;

        const dx = targetX - player.x, dy = targetY - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const targetRot = Math.atan2(dy, dx);
        player.rotation = targetRot; // Direct lock during hyperspace

        if (dist < 1000) {
            arriveAtNewStage();
        } else {
            player.x += (dx / dist) * currentSpeed;
            player.y += (dy / dist) * currentSpeed;
        }
    } else if (player.targetIdx !== -1) {
        const tIdx = player.targetIdx * STRIDE;
        const dx = data[tIdx] - player.x;
        const dy = data[tIdx + 1] - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const targetRot = Math.atan2(dy, dx);
        let diff = targetRot - player.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const turnStep = sc.turnSpeed * (dt / 1000) * PERFORMANCE.GAME_SPEED;
        if (Math.abs(diff) < turnStep) player.rotation = targetRot;
        else player.rotation += Math.sign(diff) * turnStep;

        if (dist > 10) {
            player.x += (dx / dist) * PLAYER_SPEED;
            player.y += (dy / dist) * PLAYER_SPEED;
        }
    }

    // Animation Ticks
    const animSpd = sc.animSpeed * (dt / 16.6) * PERFORMANCE.GAME_SPEED;
    if (isTraveling) {
        player.shipState = 'FULL';
        player.shipFrame = (player.shipFrame + animSpd) % sc.fullFrames;
    } else if (player.targetIdx !== -1) {
        const tIdx = player.targetIdx * STRIDE;
        const dx = data[tIdx] - player.x, dy = data[tIdx + 1] - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > sc.fullPowerDist) {
            player.shipState = 'FULL';
            player.shipFrame = (player.shipFrame + animSpd) % sc.fullFrames;
        } else if (dist > sc.thrustDist) {
            player.shipState = 'THRUST';
            player.shipFrame = (player.shipFrame + animSpd) % sc.onFrames;
        } else {
            player.shipState = 'IDLE';
            player.shipFrame = (player.shipFrame + animSpd) % sc.idleFrames;
        }
    }

    // Combat & Enemy Update
    if (!isTraveling && now - player.lastDamageTime > DAMAGE_INTERVAL) {
        player.lastDamageTime = now;
        processAOEDamage();
    }

    updateEnemies(dt, now, stageObjectiveMet);
}

function processAOEDamage() {
    const rSq = AOE_RADIUS * AOE_RADIUS;
    const gridOffset = (GRID_DIM * GRID_CELL) / 2;
    const pgx = Math.floor(gridOffset / GRID_CELL);
    const pgy = Math.floor(gridOffset / GRID_CELL);
    const rCell = Math.ceil(AOE_RADIUS / GRID_CELL);

    for (let ox = -rCell; ox <= rCell; ox++) {
        for (let oy = -rCell; oy <= rCell; oy++) {
            const cell = (pgy + oy) * GRID_DIM + (pgx + ox);
            if (cell < 0 || cell >= heads.length) continue;
            let ptr = heads[cell];
            while (ptr !== -1) {
                const idx = ptr * STRIDE;
                if (data[idx + 8] <= 0) { ptr = next[ptr]; continue; }
                const ddx = data[idx] - player.x, ddy = data[idx + 1] - player.y;
                if (ddx * ddx + ddy * ddy < rSq) {
                    data[idx + 8] -= DAMAGE_PER_POP;
                    if (damageNumbers.length < 100) {
                        damageNumbers.push({ x: data[idx], y: data[idx + 1] - 50, val: DAMAGE_PER_POP, life: 1.0, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 2 });
                    }
                    if (data[idx + 8] <= 0) {
                        killCount++;
                        stageKillCount++;
                        data[idx + 8] = 0;
                        data[idx + 9] = 0.001;
                    }
                }
                ptr = next[ptr];
            }
        }
    }
}

function updateEnemies(dt, now, objectiveMet) {
    const gridOffset = (GRID_DIM * GRID_CELL) / 2;
    // Objective met in Stage 2+ causes enemies to flee
    const stageScaling = currentStage >= 2 ? currentStage : 1;
    const sizeMult = currentStage > 2 ? 2 + (currentStage - 2) * 0.2 : (currentStage === 2 ? 2 : 1);
    const dmgMult = currentStage >= 2 ? 2 : 1;

    for (let i = 0; i < spawnIndex; i++) {
        const idx = i * STRIDE;
        const typeKey = enemyKeys[data[idx + 11] | 0];
        const cfg = Enemy[typeKey];

        if (data[idx + 8] <= 0) {
            if (data[idx + 9] > 0) {
                data[idx + 9] += cfg.deathAnimSpeed * (dt / 16.6) * PERFORMANCE.GAME_SPEED;
                if (data[idx + 9] >= cfg.deathFrames) spawnEnemy(i, typeKey, true);
            }
            continue;
        }

        const px = data[idx], py = data[idx + 1];
        let dx = player.x - px, dy = player.y - py;
        let d = Math.sqrt(dx * dx + dy * dy);

        // Flee logic if objective met
        if (objectiveMet && currentStage < 10) {
            dx = -dx; dy = -dy; // Reverse direction
            if (d > 15000) {
                spawnEnemy(i, typeKey, true); // Recycle and effectively "delete" from view
                continue;
            }
        }

        const look = Math.atan2(dy, dx);
        const lookX = Math.cos(look), lookY = Math.sin(look);

        const targetRadius = cfg.closestDist;
        const pSpace = (cfg.size * sizeMult) + cfg.spacing;
        const pSpaceSq = pSpace * pSpace;

        const distToTarget = Math.abs(d - (objectiveMet ? 20000 : targetRadius));
        const pullDir = d > targetRadius ? 1 : -0.5;
        let steerX = lookX * distToTarget * 0.5 * pullDir;
        let steerY = lookY * distToTarget * 0.5 * pullDir;

        const gx = Math.floor((px - player.x + gridOffset) / GRID_CELL);
        const gy = Math.floor((py - player.y + gridOffset) / GRID_CELL);
        let neighbors = 0;
        const NEIGHBOR_CAP = 8;

        for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
                const cell = (gy + oy) * GRID_DIM + (gx + ox);
                if (cell < 0 || cell >= heads.length) continue;
                let nIdx = heads[cell];
                while (nIdx !== -1) {
                    if (nIdx !== i) {
                        const oIdx = nIdx * STRIDE;
                        const vx = px - data[oIdx], vy = py - data[oIdx + 1];
                        const dSq = vx * vx + vy * vy;
                        if (dSq < pSpaceSq && dSq > 0) {
                            const dist = Math.sqrt(dSq);
                            const force = ((pSpace - dist) / pSpace) * 40;
                            steerX += (vx / dist) * force;
                            steerY += (vy / dist) * force;
                            neighbors++;
                            if (neighbors > NEIGHBOR_CAP) break;
                        }
                    }
                    nIdx = next[nIdx];
                }
            }
        }

        // Apply movement
        const mag = Math.sqrt(steerX * steerX + steerY * steerY);
        if (mag > 0.1) {
            const speed = Math.min(data[idx + 6] * 2, mag * 20);
            const moveAngle = Math.atan2(steerY, steerX);
            data[idx] += Math.cos(moveAngle) * speed;
            data[idx + 1] += Math.sin(moveAngle) * speed;
            data[idx + 7] = look;
            data[idx + 4] = look + cfg.baseRotation;
            data[idx + 5] = (data[idx + 5] + speed * cfg.walkAnimSpeed) % cfg.walkFrames;
        }

        // Attack Logic (skip if fleeing)
        if (!objectiveMet && d < cfg.attackRange) {
            processEnemyAttack(i, idx, cfg, dmgMult);
        }
    }
}

function processEnemyAttack(i, idx, cfg, dmgMult) {
    if (data[idx + 10] === 0) data[idx + 10] = 0.1;
    else {
        const prevF = Math.floor(data[idx + 10]);
        data[idx + 10] += cfg.attackAnimSpeed;
        const currF = Math.floor(data[idx + 10]);
        if (prevF < (cfg.attackFrames / 2) && currF >= (cfg.attackFrames / 2)) {
            const dmg = (cfg.damageMin + Math.random() * (cfg.damageMax - cfg.damageMin)) * dmgMult;
            applyDamageToPlayer(dmg);
        }
        if (data[idx + 10] >= cfg.attackFrames) data[idx + 10] = 0.1;
    }
}

function applyDamageToPlayer(dmg) {
    if (!player.shieldActive && player.shieldCooldownRemaining <= 0) {
        player.shieldActive = true;
        player.shieldAnimState = 'TURNING_ON';
        player.shieldFrame = 0;
        player.shieldHP = player.shieldMaxHP;
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
        if (player.health <= 0) {
            softReset();
        }
    }
}

function spawnEnemy(i, typeKey, far = false) {
    const cfg = Enemy[typeKey];
    const idx = i * STRIDE;
    const angle = Math.random() * Math.PI * 2;
    const distBase = cfg.startDist + (Math.random() * cfg.startDist * 0.5);
    const dist = far ? distBase * 1.5 : distBase;

    // Reset position relative to player based on current stage
    const [gx, gy] = STAGE_CONFIG.CLOCKWISE_GRID[currentStage - 1];
    const centerX = (gx - 1) * STAGE_CONFIG.GRID_SIZE;
    const centerY = (gy - 1) * STAGE_CONFIG.GRID_SIZE;

    data[idx] = centerX + Math.cos(angle) * dist;
    data[idx + 1] = centerY + Math.sin(angle) * dist;
    data[idx + 6] = cfg.moveSpeed * (0.8 + Math.random() * 0.4);
    data[idx + 8] = cfg.healthMax;
    data[idx + 9] = 0;
    data[idx + 5] = Math.random() * cfg.walkFrames;
    data[idx + 10] = 0;
    data[idx + 11] = enemyKeys.indexOf(typeKey);
}

