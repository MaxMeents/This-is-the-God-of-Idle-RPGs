/**
 * LOD ASSET LOADING SYSTEM - "STUTTER-FREE" VERSION
 * 
 * Philosophy: Start with the absolute minimum (16px Micro) to get the game running.
 * Then, use a secondary CPU core (Web Worker) to chew through the massive 20MB+ 
 * sprite sheets. Finally, "drip-feed" the finished pieces to the GPU over several 
 * minutes to ensure the player never feels a single frame drop.
 */

"use strict";

// --- THE WORKER (Secondary CPU Core) ---
const LOD_WORKER_CODE = `
    self.onmessage = async (e) => {
        const { id, path, frameCount, cols, size, throttleDelay } = e.data;
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error("Fetch failed");
            const blob = await response.blob();
            
            // Heavy decompression happens here, away from the game loop
            const fullBitmap = await createImageBitmap(blob);
            const bitmaps = [];
            
            for (let i = 0; i < frameCount; i++) {
                const x = (i % cols) * size;
                const y = Math.floor(i / cols) * size;
                // Slicing also happens off-thread
                const frameBitmap = await createImageBitmap(fullBitmap, x, y, size, size);
                bitmaps.push(frameBitmap);
                
                // Keep the worker core cool
                if (throttleDelay > 0 && i % 20 === 0) await new Promise(r => setTimeout(r, throttleDelay));
            }
            
            fullBitmap.close();
            // Ownership transfer (Zero copy)
            self.postMessage({ id, success: true, bitmaps }, bitmaps);
        } catch (err) {
            self.postMessage({ id, success: false, error: err.message });
        }
    };
`;

const lodWorkerBlob = new Blob([LOD_WORKER_CODE], { type: 'application/javascript' });
const lodWorkerURL = URL.createObjectURL(lodWorkerBlob);
const lodWorker = new Worker(lodWorkerURL);

// --- MAIN SYSTEM ---

const LOD_SIZE_TO_FOLDER = {
    16: '16x16', 32: '32x32', 64: '64x64', 128: '128x128', 256: '256x256',
    512: '512x512', 768: '768x768', 1024: '1024x1024'
};

function getSheetPath(enemyName, animationType, size) {
    const folder = LOD_SIZE_TO_FOLDER[size];
    if (!folder) return null;
    const cfg = Enemy[enemyName];
    if (!cfg || !cfg[animationType + 'Path']) return null;

    // USE TEMPLATE-BASED PATH RECONSTRUCTION
    // This is much more robust as it uses the path defined in enemies.js as a base.
    const templatePath = cfg[animationType + 'Path'];

    // The pattern is always ".../Spritesheet/ORIGINAL_SIZE/FILENAME_ORIGINAL_SIZE_sheet.webp"
    const splitKey = '/Spritesheet/';
    const parts = templatePath.split(splitKey);
    if (parts.length < 2) return null;

    const basePath = parts[0];
    const pathAfterSpritesheet = parts[1]; // e.g. "512x512/Galaxy Dragon Death_512x512_sheet.webp"

    const pathParts = pathAfterSpritesheet.split('/');
    if (pathParts.length < 2) return null;

    const originalSizeFolder = pathParts[0]; // "512x512"
    const originalFilename = pathParts[1]; // "Galaxy Dragon Death_512x512_sheet.webp"

    // Construct the new path by replacing the size folder and the size suffix in the filename
    const newFilename = originalFilename.replace(`_${originalSizeFolder}_`, `_${folder}_`);
    return `${basePath}${splitKey}${folder}/${newFilename}`;
}

const enemyLODAssets = {};
let lodPriorityLoadCount = 0;
let lodPriorityLoadedCount = 0;
let isPriorityLODStarted = false;
let backgroundLoadQueue = [];

/**
 * PHASE 1: BOOTSTRAP
 * Load only the absolute minimum required to unlock the "Begin Combat" button.
 */
function initEnemyLODAssets() {
    console.log("[LOD] Initializing Stutter-Free Pipeline...");
    enemyKeys.forEach(typeKey => {
        enemyLODAssets[typeKey] = { walk: {}, death: {}, attack: {} };
    });

    // In this version, we treat ONLY the lowest tier as mandatory to start
    const lowestTier = PERFORMANCE.LOD_TIERS[PERFORMANCE.LOD_TIERS.length - 1];
    const otherTiers = PERFORMANCE.LOD_TIERS.slice(0, -1);

    // Mandatory (Micro 16px)
    enemyKeys.forEach(typeKey => {
        ['walk', 'death', 'attack'].forEach(animType => {
            const path = getSheetPath(typeKey, animType, lowestTier.size);
            if (path) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = path;
                enemyLODAssets[typeKey][animType][lowestTier.id] = { img, tierID: lowestTier.id };
                lodPriorityLoadCount++;
                img.onload = () => handlePriorityLoad();
                img.onerror = () => handlePriorityLoad();
            }
        });
    });

    // Everything else goes to the background worker
    otherTiers.forEach(tier => {
        enemyKeys.forEach(typeKey => {
            ['walk', 'death', 'attack'].forEach(animType => {
                backgroundLoadQueue.push({ typeKey, tier, animType });
            });
        });
    });

    if (lodPriorityLoadCount === 0) handlePriorityLoad();
}

function handlePriorityLoad() {
    if (lodPriorityLoadCount > 0) lodPriorityLoadedCount++;
    if (typeof loadedCt !== 'undefined') loadedCt++;
    if (typeof updateLoadingProgress === 'function') updateLoadingProgress();

    if (lodPriorityLoadedCount >= lodPriorityLoadCount && !isPriorityLODStarted) {
        isPriorityLODStarted = true;

        // Build the 16px cache immediately (it's tiny, no lag)
        const lowestTier = [PERFORMANCE.LOD_TIERS[PERFORMANCE.LOD_TIERS.length - 1]];
        startAsyncLODPipeline(lowestTier, true, () => {
            console.log("[LOD] Minimum resolution ready. Streaming high-res in background...");
            // Now unlock the background stream
            setTimeout(processNextBackgroundLoad, 1000);
        });
    }
}

/**
 * PHASE 2: BACKGROUND STREAMING
 * Uses the Web Worker to decode and slice while the game is running.
 */
let isWorkerBusy = false;

function processNextBackgroundLoad() {
    if (backgroundLoadQueue.length === 0 || isWorkerBusy) return;
    const task = backgroundLoadQueue.shift();
    const path = getSheetPath(task.typeKey, task.animType, task.tier.size);
    const cfg = Enemy[task.typeKey];
    if (!path) { processNextBackgroundLoad(); return; }

    isWorkerBusy = true;
    const taskID = `${task.typeKey}_${task.animType}_${task.tier.id}`;
    const fullPath = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/') + '/' + path;

    lodWorker.onmessage = (e) => {
        if (e.data.id !== taskID) return;
        isWorkerBusy = false;

        if (e.data.success) {
            // Bitmaps are ready. Convert to PIXI textures (main thread, but light)
            const frames = e.data.bitmaps.map(bm => {
                const tex = new PIXI.Texture({ source: PIXI.Texture.from(bm) });
                return tex;
            });

            enemyAssets[task.typeKey].caches[task.animType][task.tier.id] = frames;
            if (typeof conversionCt !== 'undefined') conversionCt++;
            readyMapDirty = true;
            if (typeof updateLoadingProgress === 'function') updateLoadingProgress();

            // DRIP-FEED to GPU
            warmDripFeed(frames, () => {
                setTimeout(processNextBackgroundLoad, PERFORMANCE.BACKGROUND_THROTTLE.msBetweenDownloads);
            });
        } else {
            isWorkerBusy = false;
            setTimeout(processNextBackgroundLoad, 1000);
        }
    };

    lodWorker.postMessage({
        id: taskID,
        path: fullPath,
        frameCount: cfg[task.animType + 'Frames'],
        cols: cfg[task.animType + 'Cols'],
        size: task.tier.size,
        throttleDelay: 16
    });
}

/**
 * DRIP-FEED GPU WARMING
 * Uploads very small batches to the GPU to ensure consistent 60FPS.
 */
function warmDripFeed(frames, onDone) {
    if (!frames || frames.length === 0) {
        if (typeof prewarmCt !== 'undefined') prewarmCt++;
        onDone(); return;
    }

    let idx = 0;
    // Ultra conservative: 5 textures per 500ms
    const BATCH_SIZE = 5;
    const DELAY = 500;

    function drip() {
        if (!app || !app.renderer) { setTimeout(drip, 1000); return; }

        if (idx >= frames.length) {
            if (typeof prewarmCt !== 'undefined') prewarmCt++;
            if (typeof updateLoadingProgress === 'function') updateLoadingProgress();
            onDone(); return;
        }

        for (let i = 0; i < BATCH_SIZE && idx < frames.length; i++) {
            try { app.renderer.texture.initSource(frames[idx].source); } catch (e) { }
            idx++;
        }

        if (typeof updateLoadingProgress === 'function') updateLoadingProgress();
        setTimeout(drip, DELAY);
    }
    drip();
}

/**
 * SYNC PIPELINE (Only for initial Micro assets)
 */
function startAsyncLODPipeline(tiers, aggressive, onComplete) {
    const taskQueue = [];
    enemyKeys.forEach(typeKey => {
        tiers.forEach(tier => {
            ['walk', 'death', 'attack'].forEach(animType => {
                taskQueue.push({ typeKey, tier, animType });
            });
        });
    });

    let taskIndex = 0;
    function runConversion() {
        if (taskIndex >= taskQueue.length) {
            readyMapDirty = true;
            taskIndex = 0;
            runPrewarm(); return;
        }
        const { typeKey, tier, animType } = taskQueue[taskIndex];
        const data = enemyLODAssets[typeKey][animType][tier.id];
        const cfg = Enemy[typeKey];

        if (data && data.img && data.img.naturalWidth > 0) {
            const frames = [];
            const size = tier.size;
            const cols = cfg[animType + 'Cols'];
            const baseTexture = PIXI.Texture.from(data.img);
            for (let i = 0; i < cfg[animType + 'Frames']; i++) {
                frames.push(new PIXI.Texture({
                    source: baseTexture.source,
                    frame: new PIXI.Rectangle((i % cols) * size, Math.floor(i / cols) * size, size, size)
                }));
            }
            enemyAssets[typeKey].caches[animType][tier.id] = frames;
        }
        if (typeof conversionCt !== 'undefined') conversionCt++;
        if (typeof updateLoadingProgress === 'function') updateLoadingProgress();
        taskIndex++;
        requestAnimationFrame(runConversion);
    }

    function runPrewarm() {
        if (taskIndex >= taskQueue.length) { onComplete(); return; }
        const { typeKey, tier, animType } = taskQueue[taskIndex];
        const frames = enemyAssets[typeKey].caches[animType][tier.id];
        if (frames && frames.length > 0) {
            try { app.renderer.texture.initSource(frames[0].source); } catch (e) { }
        }
        if (typeof prewarmCt !== 'undefined') prewarmCt++;
        if (typeof updateLoadingProgress === 'function') updateLoadingProgress();
        taskIndex++;
        requestAnimationFrame(runPrewarm);
    }
    runConversion();
}

function convertLODToPIXI() { }
