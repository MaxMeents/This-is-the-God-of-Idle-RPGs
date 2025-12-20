/**
 * RENDERING ENGINE (World & Entity Drawing)
 * This system converts the abstract simulation data into pixels on your screen.
 * It uses several advanced techniques to maintain 60FPS with 2,000+ entities.
 */

"use strict";

let cachedReadyMap = null; // High-speed lookup table for the baked animation tiers

function draw() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2, cy = canvas.height / 2;

    // 1. WORLD SPACE TRANSFORM
    // Everything drawn here is relative to the player's position.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-player.x, -player.y);

    // OCCLUSION CULLING: Calculate the camera's boundaries in world units.
    // We only spend CPU cycles drawing enemies that are actually VISIBLE.
    const margin = 100 + (3200 * 2);
    const left = player.x - (cx / zoom) - margin;
    const right = player.x + (cx / zoom) + margin;
    const top = player.y - (cy / zoom) - margin;
    const bottom = player.y + (cy / zoom) + margin;

    // 2. LEVEL OF DETAIL (LOD) SELECTION
    // We calculate how many enemies are on screen and pick a 'Tier'.
    // High numbers of enemies = Smaller, lower-res sprites.
    smoothedEnemies += (onScreenCount - smoothedEnemies) * 0.15;
    let activeTierIdx = PERFORMANCE.LOD_TIERS.length - 1;
    for (let i = 0; i < PERFORMANCE.LOD_TIERS.length; i++) {
        if (smoothedEnemies <= PERFORMANCE.LOD_TIERS[i].max) {
            activeTierIdx = i;
            break;
        }
    }

    // Update the readyMap (LOD shortcuts) if anything changed
    if (!cachedReadyMap || readyMapDirty) {
        if (!cachedReadyMap) {
            cachedReadyMap = {};
            for (const type of enemyKeys) {
                cachedReadyMap[type] = { walk: [], death: [], attack: [] };
            }
        }
        for (const type of enemyKeys) {
            const cache = enemyAssets[type].caches;
            ["walk", "death", "attack"].forEach(anim => {
                const tiers = PERFORMANCE.LOD_TIERS;
                const tierList = cachedReadyMap[type][anim];
                for (let i = 0; i < tiers.length; i++) {
                    if (!tierList[i]) tierList[i] = { id: tiers[i].id, frames: null };
                    tierList[i].frames = cache[anim][tiers[i].id];
                }
            });
        }
        readyMapDirty = false;
    }

    // 3. GRID-BASED RENDERING
    // We only iterate over the spatial grid cells that are currently on camera.
    // Fixed to use the same WORLD_OFFSET as the physics engine.
    const gxMin = Math.max(0, Math.floor((left + GRID_WORLD_OFFSET) / GRID_CELL));
    const gxMax = Math.min(GRID_DIM - 1, Math.floor((right + GRID_WORLD_OFFSET) / GRID_CELL));
    const gyMin = Math.max(0, Math.floor((top + GRID_WORLD_OFFSET) / GRID_CELL));
    const gyMax = Math.min(GRID_DIM - 1, Math.floor((bottom + GRID_WORLD_OFFSET) / GRID_CELL));

    const visibleCellCount = (gxMax - gxMin + 1) * (gyMax - gyMin + 1);
    // If the camera is zoomed out too far, we switch to a simple linear loop for speed.
    const useGrid = visibleCellCount < spawnIndex * 0.5;

    onScreenCount = 0;
    const stageGrowthFactor = currentStage > 2 ? 2 + (currentStage - 2) * 0.2 : (currentStage === 2 ? 2 : 1);

    /**
     * INDIVIDUAL ENTITY DRAWING
     * Optimized to avoid ctx.save()/ctx.restore() which is very slow in loops.
     */
    const drawEntity = (ptr) => {
        const idx = ptr * STRIDE;
        const x = data[idx], y = data[idx + 1];

        // Final visibility check
        if (x > left && x < right && y > top && y < bottom) {
            const h = data[idx + 8], currentDeathF = data[idx + 9], af = Math.floor(data[idx + 10]);

            // Only draw if enemy is alive OR playing its death animation
            if (h > 0 || (currentDeathF > 0 && currentDeathF < 145)) {
                onScreenCount++;
                const typeIdx = data[idx + 11] | 0;
                const typeKey = enemyKeys[typeIdx];
                const cfg = allConfigs[typeIdx];
                const assets = enemyAssets[typeKey];

                const animType = (h <= 0) ? 'death' : (af > 0 ? 'attack' : 'walk');
                const frameIdx = (h <= 0) ? Math.floor(currentDeathF) : (af > 0 ? af : Math.floor(data[idx + 5]));

                // Get the pre-baked frame for the current LOD tier
                const tiers = cachedReadyMap[typeKey][animType];
                const frameToDraw = (tiers[activeTierIdx].frames && tiers[activeTierIdx].frames[frameIdx]) ? tiers[activeTierIdx].frames[frameIdx] : null;

                const rot = data[idx + 4], look = data[idx + 7];

                // --- FAST TRANSFORMATION START ---
                ctx.translate(x, y);
                ctx.rotate(rot);

                // SPRITE FLIP: Only for sideways monsters (like the Tiyger)
                let isFlipped = false;
                if (cfg.isSideways && Math.abs(look) < 1.57) {
                    ctx.scale(1, -1);
                    isFlipped = true;
                }

                // FADE OUT: Smoothly transparency for dying enemies
                if (h <= 0) {
                    ctx.globalAlpha = Math.max(0, Math.min(1, 1 - (currentDeathF / cfg.deathFrames - 0.7) * 3.3));
                }

                const drawSize = cfg.size * stageGrowthFactor;
                // MAIN DRAW CALL: Uses the pre-baked frame if it exists, otherwise falls back to the sheet.
                if (frameToDraw) {
                    ctx.drawImage(frameToDraw, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
                } else {
                    const sheet = assets[animType];
                    const sCols = cfg[animType + 'Cols'], sSize = cfg[animType + 'Size'];
                    ctx.drawImage(sheet, (frameIdx % sCols) * sSize, Math.floor(frameIdx / sCols) * sSize, sSize, sSize, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
                }

                // --- FAST TRANSFORMATION CLEANUP ---
                // We manually undo our changes instead of using ctx.restore()—it's ~4x faster in loops.
                if (h <= 0) ctx.globalAlpha = 1.0;
                if (isFlipped) ctx.scale(1, -1);
                ctx.rotate(-rot);
                ctx.translate(-x, -y);
            }
        }
    };

    // Execute the drawing loop using the spatial check
    if (useGrid) {
        for (let gy = gyMin; gy <= gyMax; gy++) {
            const row = gy * GRID_DIM;
            for (let gx = gxMin; gx <= gxMax; gx++) {
                let ptr = heads[row + gx];
                while (ptr !== -1) {
                    drawEntity(ptr);
                    ptr = next[ptr];
                }
            }
        }
    } else {
        for (let i = 0; i < spawnIndex; i++) {
            drawEntity(i);
        }
    }

    // DRAW SKILL PARTICLES
    if (skillAssets.baked) {
        const sCfg = SKILLS.MulticolorXFlame;
        for (let i = 0; i < activeSkills.length; i++) {
            const s = activeSkills[i];
            const f = Math.floor(s.frame) % sCfg.skillFrames;
            const sx = player.x + Math.cos(s.angle) * sCfg.orbitRadius;
            const sy = player.y + Math.sin(s.angle) * sCfg.orbitRadius;
            const frameImg = skillAssets.skillCache[f];
            if (frameImg) ctx.drawImage(frameImg, sx - sCfg.visualSize / 2, sy - sCfg.visualSize / 2, sCfg.visualSize, sCfg.visualSize);
        }
    }
    ctx.restore();

    // 4. PLAYER & OVERLAY DRAWING
    // The ship is drawn at a fixed size regardless of camera zoom to keep it clear.
    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, cx, cy);
    ctx.rotate(player.rotation);
    const sc = SHIP_CONFIG;
    const sf = Math.floor(player.shipFrame);
    const isFull = player.shipState === 'FULL' || player.shipState === 'THRUST';
    const sCache = isFull ? shipAssets.fullCache : shipAssets.onCache;
    const curFrame = sf % (isFull ? sc.fullFrames : sc.onFrames);

    if (shipAssets.baked && sCache[curFrame]) {
        ctx.drawImage(sCache[curFrame], -sc.visualSize / 2, -sc.visualSize / 2, sc.visualSize, sc.visualSize);
    }

    // Render Shield Overlay
    if (player.shieldActive && player.shieldAnimState !== 'OFF') {
        const isIsOn = player.shieldAnimState === 'ON';
        const shCache = isIsOn ? shipAssets.shieldOnCache : shipAssets.shieldTurnOnCache;
        const shf = Math.floor(player.shieldFrame) % (isIsOn ? sc.shieldOnFrames : sc.shieldTurnOnFrames);
        if (shipAssets.baked && shCache[shf]) {
            ctx.drawImage(shCache[shf], -sc.shieldVisualSize / 2, -sc.shieldVisualSize / 2, sc.shieldVisualSize, sc.shieldVisualSize);
        }
    }
    ctx.restore();

    // 5. UI ELEMENTS (DAMAGE NUMBERS)
    // Damage numbers are drawn in 1:1 pixel space (not zoomed) so they stay readable.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = "bold 24px Arial";
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
        const dn = damageNumbers[i];
        if (!dn.active) continue;
        const sx = (dn.x - player.x) * zoom + cx;
        const sy = (dn.y - player.y) * zoom + cy;
        ctx.fillStyle = `rgba(255, 0, 0, ${dn.life})`;
        ctx.fillText(dn.val, sx, sy);
    }
}
