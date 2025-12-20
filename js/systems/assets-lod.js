/**
 * LOD ASSET LOADING SYSTEM - "CORE-ISOLATED" VERSION (STABLE LOD)
 */

"use strict";

const LOD_WORKER_CODE = `
    self.onmessage = async (e) => {
        const { id, path, frameCount, cols, size, throttleDelay } = e.data;
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error("Network response was not ok");
            const blob = await response.blob();
            const fullBitmap = await createImageBitmap(blob);
            const bitmaps = [];
            for (let i = 0; i < frameCount; i++) {
                const x = (i % cols) * size;
                const y = Math.floor(i / cols) * size;
                const frameBitmap = await createImageBitmap(fullBitmap, x, y, size, size);
                bitmaps.push(frameBitmap);
                if (throttleDelay > 0 && i % 15 === 0) await new Promise(r => setTimeout(r, throttleDelay));
            }
            fullBitmap.close();
            self.postMessage({ id, success: true, bitmaps }, bitmaps);
        } catch (err) {
            self.postMessage({ id, success: false, error: err.message });
        }
    };
`;

const lodWorkerBlob = new Blob([LOD_WORKER_CODE], { type: 'application/javascript' });
const lodWorkerURL = URL.createObjectURL(lodWorkerBlob);
const lodWorker = new Worker(lodWorkerURL);

const LOD_SIZE_TO_FOLDER = {
    16: '16x16', 32: '32x32', 64: '64x64', 128: '128x128', 256: '256x256',
    512: '512x512', 768: '768x768', 1024: '1024x1024', 2048: '2048x2048'
};

function getSheetPath(enemyName, animationType, size) {
    const folder = LOD_SIZE_TO_FOLDER[size];
    if (!folder) return null;
    const cfg = Enemy[enemyName];
    if (!cfg) return null;
    const folderName = cfg.folderName || enemyName;
    const animFolderMap = { 'walk': 'Flying Forward', 'death': 'Death', 'attack': 'Attack' };
    const animFolder = animFolderMap[animationType];
    const subfolderPrefix = enemyName === 'PhoenixSurrender' ? 'Surrender' : folderName;
    const basePath = `img/Enemies/${folderName}/${subfolderPrefix} ${animFolder}/Spritesheet/${folder}`;
    const fileName = `${subfolderPrefix} ${animFolder}_${folder}_sheet.png`;
    return `${basePath}/${fileName}`;
}

const enemyLODAssets = {};
let lodPriorityLoadCount = 0;
let lodPriorityLoadedCount = 0;
let isPriorityLODStarted = false;
let backgroundLoadQueue = [];

function initEnemyLODAssets() {
    console.log("[LOD] Initializing Multi-Res Assets...");
    enemyKeys.forEach(typeKey => {
        enemyLODAssets[typeKey] = { walk: {}, death: {}, attack: {} };
    });

    const priorityTiers = PERFORMANCE.LOD_TIERS.filter(t => t.priority);
    const bkgdTiers = PERFORMANCE.LOD_TIERS.filter(t => !t.priority);

    priorityTiers.forEach(tier => {
        enemyKeys.forEach(typeKey => {
            ['walk', 'death', 'attack'].forEach(animType => {
                const path = getSheetPath(typeKey, animType, tier.size);
                if (path) {
                    const img = Object.assign(new Image(), { crossOrigin: "anonymous" });
                    img.src = path;
                    enemyLODAssets[typeKey][animType][tier.id] = { img, tierID: tier.id };
                    lodPriorityLoadCount++;
                    img.onload = () => handlePriorityLoad();
                    img.onerror = () => handlePriorityLoad();
                }
            });
        });
    });

    bkgdTiers.forEach(tier => {
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
        const priorityTiers = PERFORMANCE.LOD_TIERS.filter(t => t.priority);
        startAsyncLODPipeline(priorityTiers, true, () => {
            setTimeout(processNextBackgroundLoad, 1000);
        });
    }
}

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
            const frames = e.data.bitmaps.map(bm => new PIXI.Texture({ source: PIXI.Texture.from(bm) }));
            enemyAssets[task.typeKey].caches[task.animType][task.tier.id] = frames;
            if (typeof conversionCt !== 'undefined') conversionCt++;
            readyMapDirty = true;
            if (typeof updateLoadingProgress === 'function') updateLoadingProgress();
            warmSplitTextures(frames, task.typeKey, task.tier.id, () => { });
            setTimeout(processNextBackgroundLoad, PERFORMANCE.BACKGROUND_THROTTLE.msBetweenDownloads);
        } else {
            console.error("[LOD] Worker failed", taskID, e.data.error);
            setTimeout(processNextBackgroundLoad, 1000);
        }
    };
    lodWorker.postMessage({ id: taskID, path: fullPath, frameCount: cfg[task.animType + 'Frames'], cols: cfg[task.animType + 'Cols'], size: task.tier.size, throttleDelay: PERFORMANCE.BACKGROUND_THROTTLE.msBetweenSliceBatches });
}

function warmSplitTextures(frames, enemyType, tierID, onDone) {
    if (!frames || frames.length === 0) { if (typeof prewarmCt !== 'undefined') prewarmCt++; onDone(); return; }
    let idx = 0;
    const throttle = PERFORMANCE.BACKGROUND_THROTTLE;
    function nextBatch() {
        if (!app || !app.renderer) { setTimeout(nextBatch, 500); return; }
        if (idx >= frames.length) {
            if (typeof prewarmCt !== 'undefined') prewarmCt++;
            if (typeof updateLoadingProgress === 'function') updateLoadingProgress();
            onDone(); return;
        }
        for (let i = 0; i < (throttle.framesPerWarmBatch || 30) && idx < frames.length; i++) {
            try { app.renderer.texture.initSource(frames[idx].source); } catch (e) { }
            idx++;
        }
        if (typeof updateLoadingProgress === 'function') updateLoadingProgress();
        setTimeout(nextBatch, throttle.msBetweenWarming);
    }
    nextBatch();
}

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

        if (data && data.img && (data.img.complete || data.img.naturalWidth > 0)) {
            const frames = [];
            const size = tier.size;
            const cols = cfg[animType + 'Cols'];
            // Create a SHARED BaseTexture for the sheet to avoid duplication
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
