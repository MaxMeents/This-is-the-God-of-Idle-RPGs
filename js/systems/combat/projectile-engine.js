/**
 * PROJECTILE ENGINE
 * 
 * Handles the spawning, movement, and collision detection for all player-fired
 * projectiles (Bullets and Lasers).
 * 
 * LOCATED IN: js/systems/combat/projectile-engine.js
 * DEPENDS ON: js/core/config/weapon-config.js, js/systems/combat/damage-processor.js
 */

/**
 * WEAPON SPAWNING (Single Shot)
 * Converts turret-relative coordinates to world space and spawns a bullet.
 * 
 * @param {string} weaponKey - 'bullet_left_side', 'bullet_right_side', or 'laser'
 * @param {number} type - 0: Left, 1: Right, 2: Laser (used by renderer)
 */
function fireWeapon(weaponKey, type) {
    const wcfg = WEAPON_CONFIG[weaponKey];
    const rot = player.rotation;
    const cos = Math.cos(rot), sin = Math.sin(rot);

    // Calculate bullet spawn position based on turret offsets in ship space
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

/**
 * LOW-LEVEL BULLET CREATION
 * Assigns data to the bulletData Float32Array.
 */
function createBullet(x, y, vx, vy, type = 0, damage = 10, life = 75000, penetration = 1) {
    if (activeBulletCount >= totalBullets) return;

    // FIND AN INACTIVE SLOT in the pre-allocated pool
    // Note: BULLET_STRIDE is defined in js/systems/renderer.js
    for (let i = 0; i < totalBullets; i++) {
        const idx = i * BULLET_STRIDE;
        if (bulletData[idx + 5] === 0) { // 5 is 'active' flag
            bulletData[idx] = x;
            bulletData[idx + 1] = y;
            bulletData[idx + 2] = vx;
            bulletData[idx + 3] = vy;
            bulletData[idx + 4] = life;
            bulletData[idx + 5] = 1; // Mark as active
            bulletData[idx + 6] = type;
            bulletData[idx + 7] = penetration;

            activeBulletIndices[activeBulletCount++] = i;
            return;
        }
    }
}

/**
 * PROJECTILE SIMULATION & COLLISION
 * Updates bullet positions, checks lifespans, and handles enemy collisions.
 */
function updateBullets(dt) {
    const spd = PERFORMANCE.GAME_SPEED;

    for (let i = activeBulletCount - 1; i >= 0; i--) {
        const bulletIdx = activeBulletIndices[i];
        const idx = bulletIdx * BULLET_STRIDE;
        const bType = bulletData[idx + 6];

        // Retrieve weapon config for damage lookup
        let wcfg;
        if (bType === 0) wcfg = WEAPON_CONFIG.bullet_left_side;
        else if (bType === 1) wcfg = WEAPON_CONFIG.bullet_right_side;
        else wcfg = WEAPON_CONFIG.laser;

        const dmg = wcfg.damage || 10;

        // MOVE BULLET
        bulletData[idx] += bulletData[idx + 2] * (dt / 16.6) * spd;
        bulletData[idx + 1] += bulletData[idx + 3] * (dt / 16.6) * spd;
        bulletData[idx + 4] -= dt * spd; // Reduce life

        let bulletDead = bulletData[idx + 4] <= 0;

        if (!bulletDead) {
            const bx = bulletData[idx], by = bulletData[idx + 1];

            // SPATIAL GRID LOOKUP (COLLISION)
            const gx = Math.floor((bx + GRID_WORLD_OFFSET) / GRID_CELL);
            const gy = Math.floor((by + GRID_WORLD_OFFSET) / GRID_CELL);

            if (gx >= 0 && gx < GRID_DIM && gy >= 0 && gy < GRID_DIM) {
                const cell = gy * GRID_DIM + gx;
                let ptr = heads[cell];
                while (ptr !== -1) {
                    const eIdx = ptr * STRIDE;
                    if (data[eIdx + 8] > 0) { // Health check
                        const ex = data[eIdx], ey = data[eIdx + 1];
                        const cfg = Enemy[enemyKeys[data[eIdx + 11] | 0]];
                        const dSq = (bx - ex) ** 2 + (by - ey) ** 2;
                        const r = cfg.size * 0.4;

                        // HIT CONFIRMED
                        if (dSq < r * r) {
                            const isLucky = Math.random() < LUCKY_HIT_CHANCE;
                            data[eIdx + 8] -= dmg; // Health reduction

                            // Visual feedback (Defined in damage-processor.js)
                            spawnDamageNumber(bx, by - 50, dmg, isLucky);

                            // DEATH HANDLING
                            if (data[eIdx + 8] <= 0) {
                                killCount++;
                                stageKillCount++;
                                data[eIdx + 8] = 0;
                                data[eIdx + 9] = 0.001; // Start death animation

                                // FX and Drops (Defined in renderer.js and loot.js)
                                if (typeof spawnFX === 'function') spawnFX(bx, by, 0, 0, 500, FX_TYPES.EXPLOSION, 80);
                                handleEnemyDrop(enemyKeys[data[eIdx + 11] | 0], data[eIdx + 12] | 0, isLucky);

                                for (let k = 0; k < 5; k++) {
                                    if (typeof spawnFX === 'function') spawnFX(bx, by, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 300, FX_TYPES.SPARK, 10);
                                }
                            }

                            // PENETRATION LOGIC
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

        // REMOVE DEAD BULLETS
        if (bulletDead) {
            bulletData[idx + 5] = 0;
            activeBulletIndices[i] = activeBulletIndices[activeBulletCount - 1];
            activeBulletCount--;
        }
    }
}
