/**
 * BACKGROUND BARKER SYSTEM
 * To handle 2,000+ enemies, we cannot slice monster sprite sheets in real-time.
 * Instead, this system 'bakes' every animation frame into a specific pixel size (Tier)
 * and stores it as an ImageBitmap.
 */

// WEB WORKER (Parallel Processing)
// We use a blob to create a separate background thread. 
// This keeps the main game loop at 60FPS even while generating thousands of tiny images.
const bakerWorker = (() => {
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
                    results.push(canvas.transferToImageBitmap()); // Transfer memory directly (Zero-copy)
                }
                self.postMessage({ typeKey, animType, tierID: tier.id, results }, results);
            };
        `], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob));
    } catch (e) {
        console.warn("[Baker] Worker disabled.");
        return null;
    }
})();

if (bakerWorker) {
    bakerWorker.onmessage = (e) => {
        const { typeKey, animType, tierID, results } = e.data;
        // Optimization: Cleanup old textures if they exist to free GPU memory
        const oldCaches = enemyAssets[typeKey].caches[animType][tierID];
        if (oldCaches && Array.isArray(oldCaches)) {
            oldCaches.forEach(tex => {
                if (tex && typeof tex.destroy === 'function') tex.destroy(true);
            });
        }
        // Convert to PIXI textures for WebGL rendering
        enemyAssets[typeKey].caches[animType][tierID] = results.map(r => PIXI.Texture.from(r));
        workerTasksCount--;
        bakesCt++;
        updateLoadingProgress();
    };
}

// FALLBACK BAKER (For browsers where Workers are unavailable)
const fallbackQueue = [];
let isFallbackRunning = false;
const bakedStatus = {}; // Tracks which enemy:anim:tier pairs are finished
const inQueue = new Set();
let lastRequestedType = null;
let lastRequestedTier = null;
let needsSort = false;

/**
 * TIME-SLICED BAKER
 * If we can't use a worker, we do a tiny bit of image processing (2ms max)
 * every 10ms. This prevents the browser from freezing during loading.
 */
function runFallbackBaker() {
    if (fallbackQueue.length === 0) { isFallbackRunning = false; return; }
    isFallbackRunning = true;

    // Priority Sorting: Bake what the camera sees first!
    if (needsSort) {
        fallbackQueue.sort((a, b) => {
            const aNeeded = (a.typeKey === lastRequestedType && a.tier.id === lastRequestedTier) ? 0 : 1;
            const bNeeded = (b.typeKey === lastRequestedType && b.tier.id === lastRequestedTier) ? 0 : 1;
            return aNeeded - bNeeded || a.tier.size - b.tier.size;
        });
        needsSort = false;
    }

    const startTime = performance.now();
    // Only process for a very short window to avoid Dropped Frames
    while (fallbackQueue.length > 0 && (performance.now() - startTime < 2)) {
        const task = fallbackQueue[0];
        const assets = enemyAssets[task.typeKey];
        if (!assets.caches[task.animType][task.tier.id]) assets.caches[task.animType][task.tier.id] = [];

        const i = task.currentFrame;
        const canvas = document.createElement('canvas');
        canvas.width = task.tier.size; canvas.height = task.tier.size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(assets[task.animType], (i % task.cols) * task.sourceSize, Math.floor(i / task.cols) * task.sourceSize, task.sourceSize, task.sourceSize, 0, 0, task.tier.size, task.tier.size);

        assets.caches[task.animType][task.tier.id][i] = PIXI.Texture.from(canvas);
        task.currentFrame++;

        // Check if finished with this tier
        if (task.currentFrame >= task.frameCount) {
            if (!bakedStatus[task.typeKey]) bakedStatus[task.typeKey] = {};
            if (!bakedStatus[task.typeKey][task.animType]) bakedStatus[task.typeKey][task.animType] = {};
            bakedStatus[task.typeKey][task.animType][task.tier.id] = true;
            inQueue.delete(`${task.typeKey}:${task.animType}:${task.tier.id}`);
            fallbackQueue.shift();
            workerTasksCount--;
            bakesCt++;
            updateLoadingProgress();
            readyMapDirty = true; // Tell renderer to refresh its shortcuts
        }
    }
    if (fallbackQueue.length > 0) setTimeout(runFallbackBaker, 10);
    else isFallbackRunning = false;
}

async function buildEnemyCache(typeKey, fullBake = false) {
    const cfg = Enemy[typeKey];
    const tiersToQueue = fullBake ? PERFORMANCE.LOD_TIERS : PERFORMANCE.LOD_TIERS.filter(t => t.size <= 128);
    for (let tier of tiersToQueue) {
        for (const anim of ['walk', 'death', 'attack']) {
            const key = `${typeKey}:${anim}:${tier.id}`;
            if (bakedStatus[typeKey]?.[anim]?.[tier.id] || inQueue.has(key)) continue;

            if (bakerWorker) {
                inQueue.add(key);
                workerTasksCount++;

                // FIX: HTMLImageElement cannot be sent directly to workers. 
                // We convert it to an ImageBitmap (Transferable/Cloneable) first.
                const sheetImg = enemyAssets[typeKey][anim];
                let bitmap = sheetImg._bitmap;
                if (!bitmap) {
                    bitmap = await createImageBitmap(sheetImg);
                    sheetImg._bitmap = bitmap;
                }

                bakerWorker.postMessage({
                    typeKey, animType: anim, tier,
                    frameCount: cfg[anim + 'Frames'],
                    cols: cfg[anim + 'Cols'],
                    sourceSize: cfg[anim + 'Size'],
                    sheet: bitmap
                });
            } else {
                workerTasksCount++;
                inQueue.add(key);
                fallbackQueue.push({ typeKey, animType: anim, tier, frameCount: cfg[anim + 'Frames'], cols: cfg[anim + 'Cols'], sourceSize: cfg[anim + 'Size'], currentFrame: 0 });
            }
        }
    }
    if (!bakerWorker) {
        needsSort = true;
        if (!isFallbackRunning) runFallbackBaker();
    }
}

/**
 * ON-DEMAND BAKING
 * If the camera zooms in and we don't have High-Res frames yet,
 * this function bumps them to the front of the line.
 */
async function ensureTierBaking(typeKey, tierID) {
    if (lastRequestedType === typeKey && lastRequestedTier === tierID) return;
    const tier = PERFORMANCE.LOD_TIERS.find(t => t.id === tierID);
    if (!tier) return;
    lastRequestedType = typeKey;
    lastRequestedTier = tierID;

    const cfg = Enemy[typeKey];
    for (const anim of ['walk', 'death', 'attack']) {
        const key = `${typeKey}:${anim}:${tier.id}`;
        if (bakedStatus[typeKey]?.[anim]?.[tier.id] || inQueue.has(key)) continue;

        if (bakerWorker) {
            inQueue.add(key);
            workerTasksCount++;

            const sheetImg = enemyAssets[typeKey][anim];
            let bitmap = sheetImg._bitmap;
            if (!bitmap) {
                bitmap = await createImageBitmap(sheetImg);
                sheetImg._bitmap = bitmap;
            }

            bakerWorker.postMessage({
                typeKey, animType: anim, tier,
                frameCount: cfg[anim + 'Frames'],
                cols: cfg[anim + 'Cols'],
                sourceSize: cfg[anim + 'Size'],
                sheet: bitmap
            });
        } else {
            workerTasksCount++;
            inQueue.add(key);
            fallbackQueue.push({ typeKey, animType: anim, tier, frameCount: cfg[anim + 'Frames'], cols: cfg[anim + 'Cols'], sourceSize: cfg[anim + 'Size'], currentFrame: 0 });
        }
    }

    if (!bakerWorker) {
        needsSort = true;
        if (!isFallbackRunning) runFallbackBaker();
    }
}
