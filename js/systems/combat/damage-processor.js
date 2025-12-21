/**
 * DAMAGE PROCESSOR
 * 
 * Handles all damage interactions EXCEPT basic projectiles.
 * Contains AOE logic, Skill damage calculations, and the advanced Crit-on-Crit UI system.
 * 
 * LOCATED IN: js/systems/combat/damage-processor.js
 * DEPENDS ON: js/core/config/combat-config.js, js/systems/loot/loot-manager.js
 */

/**
 * AOE COMBAT ENGINE (Passive Player Attack)
 * Deals continuous damage to enemies touching the player's aura.
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
                            if (typeof spawnFX === 'function') spawnFX(data[idx], data[idx + 1], 0, 0, 500, FX_TYPES.EXPLOSION, 80);
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
 * SKILL COMBAT ENGINE (Triple Ring / Sword Hits)
 * Loops through active skill instances and checks for AOE collisions.
 */
function processSkillDamage() {
    if (activeSkillCount === 0) return;

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

        // Calculate world position of this skill instance
        const sx = player.x + Math.cos(skillData[idx]) * skillData[idx + 2];
        const sy = player.y + Math.sin(skillData[idx]) * skillData[idx + 2];

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
                                if (typeof spawnFX === 'function') spawnFX(ex, ey, 0, 0, 500, FX_TYPES.EXPLOSION, 80);
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
 * DAMAGE SYSTEM (Floating Numbers)
 * Implements the "Crit-on-Crit" logic where damage can recursively multiply.
 * 
 * @param {number} x, y - Position
 * @param {number} val - Base damage value
 * @param {boolean} lucky - Lucky hit flag
 */
function spawnDamageNumber(x, y, val, lucky = false) {
    if (activeDamageCount >= DAMAGE_POOL_SIZE) return;

    // RECURSIVE CRIT LOGIC
    let critTier = 0;
    if (Math.random() < CRIT_CONFIG.BASE_CHANCE) {
        critTier = 1; // First Tier reached (Arch)
        // Recursive rolls (Arch -> God -> Omega -> Alpha)
        while (critTier < 4 && Math.random() < CRIT_CONFIG.RECURSIVE_CHANCE) {
            critTier++;
        }
    }

    // MULTIPLY DAMAGE BASED ON CRIT TIER
    const finalVal = val * CRIT_CONFIG.MULTIPLIERS[critTier];

    // ALLOCATE TO DAMAGE POOL
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
        if (!damageNumbers[i].active) {
            const dn = damageNumbers[i];
            dn.active = true;
            dn.x = x;
            dn.y = y;
            dn.val = finalVal;
            dn.isLucky = lucky;
            dn.critTier = critTier;
            dn.life = 1.0;
            dn.vx = (Math.random() - 0.5) * 5;
            dn.vy = -5 - Math.random() * 2;

            activeDamageIndices[activeDamageCount++] = i;
            return;
        }
    }
}
/**
 * UPDATE DAMAGE NUMBERS
 * Moves and ages floating text in the pool.
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
