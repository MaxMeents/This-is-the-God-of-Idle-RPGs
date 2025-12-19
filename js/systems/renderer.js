function draw() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2, cy = canvas.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-player.x, -player.y);

    const margin = 100 + (3200 * 2); // Max potential size
    const left = player.x - (cx / zoom) - margin;
    const right = player.x + (cx / zoom) + margin;
    const top = player.y - (cy / zoom) - margin;
    const bottom = player.y + (cy / zoom) + margin;

    // Dynamic Smoothing
    smoothedEnemies += (onScreenCount - smoothedEnemies) * 0.15;
    let activeTierIdx = PERFORMANCE.LOD_TIERS.length - 1;
    for (let i = 0; i < PERFORMANCE.LOD_TIERS.length; i++) {
        if (smoothedEnemies <= PERFORMANCE.LOD_TIERS[i].max) {
            activeTierIdx = i; break;
        }
    }
    const activeTierID = PERFORMANCE.LOD_TIERS[activeTierIdx].id;

    if (!this.cachedReadyMap || readyMapDirty) {
        this.cachedReadyMap = {};
        for (const type of enemyKeys) {
            if (!this.cachedReadyMap[type]) this.cachedReadyMap[type] = { walk: [], death: [], attack: [] };
            const cache = enemyAssets[type].caches;
            ["walk", "death", "attack"].forEach(anim => {
                this.cachedReadyMap[type][anim] = PERFORMANCE.LOD_TIERS.map(t => ({ id: t.id, frames: cache[anim][t.id] }));
            });
        }
        readyMapDirty = false;
    }

    const readyMap = this.cachedReadyMap;
    const gridOffset = (GRID_DIM * GRID_CELL) / 2;
    const gxMin = Math.max(0, Math.floor((left - player.x + gridOffset) / GRID_CELL)), gxMax = Math.min(GRID_DIM - 1, Math.floor((right - player.x + gridOffset) / GRID_CELL));
    const gyMin = Math.max(0, Math.floor((top - player.y + gridOffset) / GRID_CELL)), gyMax = Math.min(GRID_DIM - 1, Math.floor((bottom - player.y + gridOffset) / GRID_CELL));

    onScreenCount = 0;
    const sizeMult = currentStage > 2 ? 2 + (currentStage - 2) * 0.2 : (currentStage === 2 ? 2 : 1);

    for (let gy = gyMin; gy <= gyMax; gy++) {
        for (let gx = gxMin; gx <= gxMax; gx++) {
            let ptr = heads[gy * GRID_DIM + gx];
            while (ptr !== -1) {
                const idx = ptr * STRIDE;
                const x = data[idx], y = data[idx + 1];
                if (x > left && x < right && y > top && y < bottom) {
                    const h = data[idx + 8], currentDeathF = data[idx + 9];
                    if (h > 0 || currentDeathF > 0) {
                        onScreenCount++;
                        const f = Math.floor(data[idx + 5]), rot = data[idx + 4], look = data[idx + 7], af = Math.floor(data[idx + 10]);
                        const dfIdx = Math.floor(currentDeathF);
                        const typeKey = enemyKeys[data[idx + 11] | 0];
                        const cfg = Enemy[typeKey], assets = enemyAssets[typeKey];

                        const animType = (h <= 0 && currentDeathF > 0) ? 'death' : (af > 0 ? 'attack' : 'walk');
                        const frameIdx = (h <= 0 && currentDeathF > 0) ? dfIdx : (af > 0 ? af : f);
                        const tiers = readyMap[typeKey][animType];

                        let frameToDraw = null;
                        if (tiers[activeTierIdx].frames && tiers[activeTierIdx].frames[frameIdx]) {
                            frameToDraw = tiers[activeTierIdx].frames[frameIdx];
                        }

                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(rot);
                        if (cfg.isSideways && Math.abs(look) < Math.PI / 2) ctx.scale(1, -1);

                        if (h <= 0 && currentDeathF > 0) {
                            ctx.globalAlpha = Math.max(0, Math.min(1, 1 - (currentDeathF / cfg.deathFrames - 0.7) * 3.3));
                        } else {
                            ctx.globalAlpha = 1.0;
                        }

                        const drawSize = cfg.size * sizeMult;
                        if (frameToDraw) {
                            ctx.drawImage(frameToDraw, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
                        } else {
                            const sheet = assets[animType];
                            const sCols = cfg[animType + 'Cols'], sSize = cfg[animType + 'Size'];
                            ctx.drawImage(sheet, (frameIdx % sCols) * sSize, Math.floor(frameIdx / sCols) * sSize, sSize, sSize, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
                        }
                        ctx.restore();
                    }
                }
                ptr = next[ptr];
            }
        }
    }

    // Skills
    if (skillAssets.baked) {
        const sCfg = SKILLS.MulticolorXFlame;
        for (const s of activeSkills) {
            const f = Math.floor(s.frame) % sCfg.skillFrames;
            const sx = player.x + Math.cos(s.angle) * sCfg.orbitRadius;
            const sy = player.y + Math.sin(s.angle) * sCfg.orbitRadius;
            const frameImg = skillAssets.skillCache[f];
            if (frameImg) {
                ctx.drawImage(frameImg, sx - sCfg.visualSize / 2, sy - sCfg.visualSize / 2, sCfg.visualSize, sCfg.visualSize);
            }
        }
    }

    // Ship
    ctx.setTransform(zoom, 0, 0, zoom, cx, cy);
    ctx.save();
    ctx.rotate(player.rotation);
    const sc = SHIP_CONFIG;
    const sf = Math.floor(player.shipFrame);
    const isFull = player.shipState === 'FULL' || player.shipState === 'THRUST';
    const sCache = isFull ? shipAssets.fullCache : shipAssets.onCache;
    const curFrame = sf % (isFull ? sc.fullFrames : sc.onFrames);

    if (shipAssets.baked && sCache[curFrame]) {
        ctx.drawImage(sCache[curFrame], -sc.visualSize / 2, -sc.visualSize / 2, sc.visualSize, sc.visualSize);
    }

    // Shield
    if (player.shieldActive && player.shieldAnimState !== 'OFF') {
        const isIsOn = player.shieldAnimState === 'ON';
        const shCache = isIsOn ? shipAssets.shieldOnCache : shipAssets.shieldTurnOnCache;
        const shf = Math.floor(player.shieldFrame) % (isIsOn ? sc.shieldOnFrames : sc.shieldTurnOnFrames);
        if (shipAssets.baked && shCache[shf]) {
            ctx.drawImage(shCache[shf], -sc.shieldVisualSize / 2, -sc.shieldVisualSize / 2, sc.shieldVisualSize, sc.shieldVisualSize);
        }
    }
    ctx.restore();

    // Damage Numbers & UI
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = "bold 24px Arial";
    for (const dn of damageNumbers) {
        const sx = (dn.x - player.x) * zoom + cx;
        const sy = (dn.y - player.y) * zoom + cy;
        ctx.fillStyle = `rgba(255, 0, 0, ${dn.life})`;
        ctx.fillText(dn.val, sx, sy);
    }
}
