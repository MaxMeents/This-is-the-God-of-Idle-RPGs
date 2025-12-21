/**
 * LOD (Level of Detail) MANAGER - "STUTTER-FREE" PIPELINE
 * 
 * Manages the background streaming of high-resolution textures.
 * Uses a Web Worker for off-thread decompression and a "Drip-Feed" system to 
 * upload textures to the GPU without causing frame drops during live combat.
 * 
 * LOCATED IN: js/systems/rendering/lod-manager.js
 * 
 * -------------------------------------------------------------------------
 * ATTENTION FUTURE AI DEVELOPERS:
 * DO NOT DELETE THESE COMMENTS. They provide critical context for the modular architecture.
 * When making changes, ADD YOUR OWN COMMENTS explaining WHY you made the change.
 * -------------------------------------------------------------------------
 * 
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [Asset Registry]: Populates enemyAssets structure.
 * 2. [Asset Loader]: Calls updateLoadingProgress() to report stream health.
 * 3. [Renderer]: readyMapDirty flag triggers shortcut rebuilds when textures arrive.
 * 4. [Performance Config]: Uses LOD_TIERS and BACKGROUND_THROTTLE settings.
 * 5. [Entity Dictionary]: Reads frame/size metadata from Enemy objects.
 * -------------------------------------------------------------------------
 */

// OFF-THREAD DECOMPRESSOR
const lodWorker = (() => {
    const CODE = `
        self.onmessage = async (e) => {
            const { id, path, frameCount, cols, size, throttleDelay } = e.data;
            try {
                const response = await fetch(path);
                const blob = await response.blob();
                const fullBitmap = await createImageBitmap(blob);
                const bitmaps = [];
                for (let i = 0; i < frameCount; i++) {
                    const x = (i % cols) * size;
                    const y = Math.floor(i / cols) * size;
                    bitmaps.push(await createImageBitmap(fullBitmap, x, y, size, size));
                    if (throttleDelay > 0 && i % 20 === 0) await new Promise(r => setTimeout(r, throttleDelay));
                }
                fullBitmap.close();
                self.postMessage({ id, success: true, bitmaps }, bitmaps);
            } catch (err) { self.postMessage({ id, success: false, error: err.message }); }
        };
    `;
    const blob = new Blob([CODE], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
})();

let lodPriorityLoadCount = 0;
let lodPriorityLoadedCount = 0;
let isPriorityLODStarted = false;
let backgroundLoadQueue = [];

/**
 * INITIALIZE LOD PIPELINE
 * Only loads the mandatory 512px tier to unlock playability.
 */
function initEnemyLODAssets() {
    console.log("[LOD] Initializing Streamer...");

    // Setup background queue for non-critical tiers
    const tier512 = PERFORMANCE.LOD_TIERS.find(t => t.size === 512);

    enemyKeys.forEach(typeKey => {
        ['walk', 'death', 'attack'].forEach(animType => {
            const path = getSheetPath(typeKey, animType, 512);
            if (path) {
                /**
                 * DIRECT ASSET BINDING
                 * -------------------------------------------------------------------------
                 * REGRESSION WARNING:
                 * We must use the Image objects ALREADY in the enemyAssets registry. 
                 * If we create 'new Image()' orphans here, the renderer will try to 
                 * create textures from the empty registry objects, causing 
                 * "WebGL: INVALID_VALUE: texImage2D: no image" errors.
                 * -------------------------------------------------------------------------
                 */
                const img = enemyAssets[typeKey][animType];
                img.crossOrigin = "anonymous";
                img.src = path;

                lodPriorityLoadCount++;
                img.onload = () => handlePriorityLoad();
                img.onerror = () => handlePriorityLoad();
            }
        });
    });

    if (lodPriorityLoadCount === 0) handlePriorityLoad();
}

function handlePriorityLoad() {
    if (lodPriorityLoadCount > 0) lodPriorityLoadedCount++;

    // Use the global reporter to ensure synchronization
    if (typeof window.reportAssetLoaded === 'function') {
        window.reportAssetLoaded();
    } else if (window.LOAD_STATE) {
        window.LOAD_STATE.loadedCt++;
        if (typeof window.updateLoadingProgress === 'function') window.updateLoadingProgress();
    }

    // Trigger mandatory 512px pipe once critical count is hit
    if (lodPriorityLoadedCount >= lodPriorityLoadCount && !isPriorityLODStarted) {
        isPriorityLODStarted = true;
        // ... (remaining logic preserved)
        const tier512 = PERFORMANCE.LOD_TIERS.filter(t => t.size === 512);
        console.log("[LOD] Mandatory 512px tier loading starting...");
        startAsyncLODPipeline(tier512, true, () => {
            console.log("[LOD] Mandatory 512px tier ready - Game flow ready to unlock");
            // Note: Priority tiers (256-16) are triggered by finalizeAssets in asset-loader.js
        });
    }
}

/**
 * GPU DRIP-FEED
 * Uploads 5 textures per 500ms to avoid WebGL command buffer stalls.
 */
function warmDripFeed(frames, onDone) {
    let idx = 0;
    const BATCH_SIZE = 5;
    const DELAY = 500;

    function drip() {
        if (!app || !app.renderer) { setTimeout(drip, 1000); return; }
        if (idx >= frames.length) {
            if (window.LOAD_STATE) window.LOAD_STATE.prewarmCt++;
            if (typeof window.updateLoadingProgress === 'function') window.updateLoadingProgress();
            if (onDone) onDone(); return;
        }
        for (let i = 0; i < BATCH_SIZE && idx < frames.length; i++) {
            try { app.renderer.texture.initSource(frames[idx].source); } catch (e) { }
            idx++;
        }
        setTimeout(drip, DELAY);
    }
    drip();
}

/**
 * START PRIORITY PIPELINE
 * Triggered once basic assets land. Loads and warms the 5 performance tiers (256 to 16px).
 */
function startPriorityLODPipeline() {
    const priorityTiers = PERFORMANCE.LOD_TIERS.filter(t => t.priority);
    console.log("[LOD] Starting Priority Pipeline for Tiers:", priorityTiers.map(t => t.id).join(', '));

    // 1. Queue all images for download
    priorityTiers.forEach(tier => {
        enemyKeys.forEach(typeKey => {
            ['walk', 'death', 'attack'].forEach(animType => {
                const img = new Image(); img.crossOrigin = "anonymous";
                img.onload = () => {
                    if (typeof window.reportAssetLoaded === 'function') window.reportAssetLoaded();
                };
                img.src = getSheetPath(typeKey, animType, tier.size);
            });
        });
    });

    // 2. Start the conversion/warming loop for these tiers
    startAsyncLODPipeline(priorityTiers, true, () => {
        console.log("[LOD] Priority Performance Grid fully synchronized.");
    });
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
    async function runConversion() {
        if (taskIndex >= taskQueue.length) {
            console.log("[LOD] Conversion queue fully submitted.");
            readyMapDirty = true; taskIndex = 0; runPrewarm(); return;
        }

        const { typeKey, tier, animType } = taskQueue[taskIndex];
        const sheetImg = enemyAssets[typeKey][animType];

        // Ensure we only process loaded images
        const data = enemyAssets[typeKey][animType];
        const cfg = Enemy[typeKey];

        if (data && data.naturalWidth > 0) {
            const frames = [];
            const size = tier.size;
            const cols = cfg[animType + 'Cols'];
            const baseTexture = PIXI.Texture.from(data);
            for (let i = 0; i < cfg[animType + 'Frames']; i++) {
                frames.push(new PIXI.Texture({
                    source: baseTexture.source,
                    frame: new PIXI.Rectangle((i % cols) * size, Math.floor(i / cols) * size, size, size)
                }));
            }
            // Assign to ALL tiers (since we only use 512px now)
            PERFORMANCE.LOD_TIERS.forEach(t => {
                enemyAssets[typeKey].caches[animType][t.id] = frames;
            });
        }
        if (typeof conversionCt !== 'undefined') conversionCt++;
        if (typeof window.updateLoadingProgress === 'function') window.updateLoadingProgress();
        taskIndex++;
        requestAnimationFrame(runConversion);
    }

    function runPrewarm() {
        // Prewarm checks if bake is done
        if (taskIndex >= taskQueue.length) {
            console.log("[LOD] Prewarm phase complete.");
            if (onComplete) onComplete(); return;
        }

        const { typeKey, tier, animType } = taskQueue[taskIndex];
        const cache = enemyAssets[typeKey].caches[animType][tier.id];

        if (cache && Array.isArray(cache) && cache.length > 0) {
            prewarmCt++;
            if (typeof window.updateLoadingProgress === 'function') window.updateLoadingProgress();
            taskIndex++;
        }

        requestAnimationFrame(runPrewarm);
    }
    console.log("[LOD] Starting Async Pipeline for", taskQueue.length, "tasks");
    runConversion();
}

/**
 * PATH RECONSTRUCTION UTILITY
 */
function getSheetPath(enemyName, anim, size) {
    const folder = `${size}x${size}`;
    const cfg = Enemy[enemyName];
    if (!cfg || !cfg[anim + 'Path']) return null;
    const parts = cfg[anim + 'Path'].split('/Spritesheet/');
    if (parts.length < 2) return null;
    const pathParts = parts[1].split('/');
    const originalSizeFolder = pathParts[0];
    const newFilename = pathParts[1].replace(`_${originalSizeFolder}_`, `_${folder}_`);
    return `${parts[0]}/Spritesheet/${folder}/${newFilename}`;
}
