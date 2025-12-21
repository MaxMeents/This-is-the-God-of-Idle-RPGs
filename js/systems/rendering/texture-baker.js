/**
 * TEXTURE BAKER SYSTEM
 * 
 * Handles the extraction of individual animation frames from monolithic sprite sheets.
 * Combines standard procedural baking (Main Thread) with worker-based slicing (Parallel Thread)
 * to ensure 2,000+ entities don't choke the browser.
 * 
 * LOCATED IN: js/systems/rendering/texture-baker.js
 * 
 * -------------------------------------------------------------------------
 * ATTENTION FUTURE AI DEVELOPERS:
 * DO NOT DELETE THESE COMMENTS. They provide critical context for the modular architecture.
 * When making changes, ADD YOUR OWN COMMENTS explaining WHY you made the change.
 * -------------------------------------------------------------------------
 * 
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [Asset Registry]: Reads raw images and writes to .onCache, .skillCache, etc.
 * 2. [Asset Loader]: Calls bakeShip() and bakeSkills() after images land.
 * 3. [Config]: Reads SHIP_CONFIG and SKILLS for frame/size metadata.
 * 4. [Renderer]: Reads PIXI textures generated here for hardware acceleration.
 * -------------------------------------------------------------------------
 */

/**
 * SHIP BAKING (Sequential)
 */
function bakeShip() {
    if (shipAssets.baked) return;

    const allImagesLoaded =
        shipAssets.onImg.complete && shipAssets.onImg.naturalWidth > 0 &&
        shipAssets.fullImg.complete && shipAssets.fullImg.naturalWidth > 0 &&
        shipAssets.shieldOnImg.complete && shipAssets.shieldOnImg.naturalWidth > 0 &&
        shipAssets.shieldTurnOnImg.complete && shipAssets.shieldTurnOnImg.naturalWidth > 0;

    if (!allImagesLoaded) return;

    console.log('[SHIP] Baking textures...');
    const sc = SHIP_CONFIG;
    const bake = (img, frames, cols, size, targetCache, targetSize) => {
        for (let i = 0; i < frames; i++) {
            const can = document.createElement('canvas'); can.width = targetSize; can.height = targetSize;
            const cctx = can.getContext('2d');
            cctx.drawImage(img, (i % cols) * size, Math.floor(i / cols) * size, size, size, 0, 0, targetSize, targetSize);
            targetCache.push(can);
        }
    };

    bake(shipAssets.onImg, sc.onFrames, sc.onCols, sc.onSize, shipAssets.onCache, 512);
    bake(shipAssets.fullImg, sc.fullFrames, sc.fullCols, sc.fullSize, shipAssets.fullCache, 512);
    bake(shipAssets.shieldOnImg, sc.shieldOnFrames, sc.shieldOnCols, sc.shieldOnSize, shipAssets.shieldOnCache, 768);
    bake(shipAssets.shieldTurnOnImg, sc.shieldTurnOnFrames, sc.shieldTurnOnCols, sc.shieldTurnOnSize, shipAssets.shieldTurnOnCache, 512);

    shipAssets.pixiOn = shipAssets.onCache.map(c => PIXI.Texture.from(c));
    shipAssets.pixiFull = shipAssets.fullCache.map(c => PIXI.Texture.from(c));
    shipAssets.pixiShieldOn = shipAssets.shieldOnCache.map(c => PIXI.Texture.from(c));
    shipAssets.pixiShieldTurnOn = shipAssets.shieldTurnOnCache.map(c => PIXI.Texture.from(c));
    shipAssets.baked = true;
    console.log('[SHIP] Ship textures ready');
}

/**
 * SKILL BAKING (Sequential)
 */
function bakeSkills() {
    if (skillAssets.baked) return;
    const cfg = SKILLS.Tier3;
    for (let i = 0; i < cfg.buttonFrames; i++) {
        const can = document.createElement('canvas'); can.width = 512; can.height = 512;
        const cctx = can.getContext('2d');
        cctx.drawImage(skillAssets.buttonImg, (i % cfg.buttonCols) * cfg.buttonSize, Math.floor(i / cfg.buttonCols) * cfg.buttonSize, cfg.buttonSize, cfg.buttonSize, 0, 0, 512, 512);
        skillAssets.buttonCache.push(can);
    }
    for (let i = 0; i < cfg.skillFrames; i++) {
        const can = document.createElement('canvas'); can.width = 512; can.height = 512;
        const cctx = can.getContext('2d');
        cctx.drawImage(skillAssets.skillImg, (i % cfg.skillCols) * cfg.skillSize, Math.floor(i / cfg.skillCols) * cfg.skillSize, cfg.skillSize, cfg.skillSize, 0, 0, 512, 512);
        skillAssets.skillCache.push(can);
    }
    skillAssets.pixiButton = skillAssets.buttonCache.map(c => PIXI.Texture.from(c));
    skillAssets.pixiSkill = skillAssets.skillCache.map(c => PIXI.Texture.from(c));

    // Sword of Light
    const socfg = SKILLS.SwordOfLight;
    for (let i = 0; i < socfg.skillFrames; i++) {
        const can = document.createElement('canvas'); can.width = 512; can.height = 512;
        const cctx = can.getContext('2d');
        cctx.drawImage(skillAssets.swordOfLightImg, (i % socfg.skillCols) * socfg.skillSize, Math.floor(i / socfg.skillCols) * socfg.skillSize, socfg.skillSize, socfg.skillSize, 0, 0, 512, 512);
        skillAssets.swordOfLightCache.push(can);
    }
    skillAssets.pixiSwordOfLight = skillAssets.swordOfLightCache.map(c => PIXI.Texture.from(c));

    skillAssets.baked = true;
}

// BAKER WORKER (Parallel)
window.BAKER_WORKER = (() => {
    try {
        const blob = new Blob([`
            self.onmessage = (e) => {
                const { typeKey, animType, tier, frameCount, cols, sourceSize, sheet } = e.data;
                const results = [];
                const size = tier.size;
                for (let i = 0; i < frameCount; i++) {
                    const canvas = new OffscreenCanvas(size, size);
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.drawImage(sheet, (i % cols) * sourceSize, Math.floor(i / cols) * sourceSize, sourceSize, sourceSize, 0, 0, size, size);
                    results.push(canvas.transferToImageBitmap()); 
                }
                self.postMessage({ typeKey, animType, tierID: tier.id, results }, results);
            };
        `], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob));
    } catch (e) { return null; }
})();

if (window.BAKER_WORKER) {
    window.BAKER_WORKER.onmessage = (e) => {
        const { typeKey, animType, tierID, results } = e.data;
        if (!enemyAssets[typeKey] || !enemyAssets[typeKey].caches) {
            console.warn("[BAKER] Dropping result for invalid entity:", typeKey);
            return;
        }
        const oldCaches = enemyAssets[typeKey].caches[animType][tierID];
        if (oldCaches && Array.isArray(oldCaches)) {
            oldCaches.forEach(tex => { if (tex && tex.destroy) tex.destroy(true); });
        }
        enemyAssets[typeKey].caches[animType][tierID] = results.map(r => PIXI.Texture.from(r));

        workerTasksCount--;
        bakesCt++;

        if (typeof window.updateLoadingProgress === 'function') window.updateLoadingProgress();
    };
}

/**
 * ENSURE TIER BAKING
 * Bumps specific enemy/tier pairs to the front of the line (Used during camera zooms).
 */
window.ensureTierBaking = async function (typeKey, tierID) {
    const tier = PERFORMANCE.LOD_TIERS.find(t => t.id === tierID);
    if (!tier || !window.BAKER_WORKER) return;

    for (const anim of ['walk', 'death', 'attack']) {
        const sheetImg = enemyAssets[typeKey][anim];
        let bitmap = sheetImg._bitmap;
        if (!bitmap) {
            if (!sheetImg.complete || sheetImg.naturalWidth === 0) continue;
            bitmap = await createImageBitmap(sheetImg); sheetImg._bitmap = bitmap;
        }
        workerTasksCount++;

        window.BAKER_WORKER.postMessage({
            typeKey, animType: anim, tier,
            frameCount: Enemy[typeKey][anim + 'Frames'],
            cols: Enemy[typeKey][anim + 'Cols'],
            sourceSize: Enemy[typeKey][anim + 'Size'],
            sheet: bitmap
        });
    }
}
