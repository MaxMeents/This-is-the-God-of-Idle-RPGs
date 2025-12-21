/**
 * PERFORMANCE & GRID CONFIGURATION
 * 
 * This file handles high-level engine settings, Level of Detail (LOD) tiers,
 * and spatial partitioning constants used for collision and rendering optimization.
 * 
 * LOCATED IN: js/core/config/performance-config.js
 */

/**
 * Level of Detail (LOD) Tiers
 * Defines how spritesheets are downscaled and cached based on their distance/importance.
 */
const PERFORMANCE = {
    // Tiers used by assets-lod.js to manage memory
    LOD_TIERS: [
        { id: 'Ultra', size: 1024, max: 150, priority: false },
        { id: 'High', size: 1024, max: 400, priority: false },
        { id: 'MidHigh', size: 768, max: 800, priority: false },
        { id: 'Med', size: 512, max: 1200, priority: false },
        { id: 'MedLow', size: 256, max: 2000, priority: true },
        { id: 'Low', size: 128, max: 2500, priority: true },
        { id: 'VLow', size: 64, max: 7000, priority: true },
        { id: 'Tiny', size: 32, max: 10000, priority: true },
        { id: 'Micro', size: 16, max: 15000, priority: true }
    ],

    // Core Engine Throttling
    LOD_INIT_TIME_SLICE: 1,      // Target ms per frame during initialization
    SPAWNS_PER_FRAME: 500,       // Max enemies processed for spawning per tick
    GAME_SPEED: 1.0,             // Global simulation speed multiplier

    /**
     * THE THROTTLE: Background asset processing
     * Controls timing for downloads, decodes, and GPU uploads.
     */
    BACKGROUND_THROTTLE: {
        msBetweenDownloads: 1000,   // Delay after a high-res file pipeline completes
        msBetweenDecodes: 200,      // Delay between off-thread image decodes
        msBetweenWarming: 1000,     // Delay between GPU texture uploads
        framesPerWarmBatch: 30,     // How many frames to warm per 'breath'
        msBetweenSliceBatches: 16   // Wait between slicing next frames in worker
    }
};

/**
 * SPATIAL PARTITIONING (Grid System)
 * Used by physics.js and renderer.js to quickly find entities in specific areas.
 */
const GRID_CELL = 4800; // Pixel size of a single grid cell
const GRID_DIM = 400;  // Number of cells along one axis (Total grid is DIMxDIM)
const GRID_WORLD_OFFSET = (GRID_DIM * GRID_CELL) / 2; // Offset to center the grid at 0,0

/**
 * DATA STRIDE
 * Defines the Float32Array index offsets for entity data.
 * Used heavily in physics.js and renderer.js for high-performance updates.
 * 
 * 0-1: x, y | 2-3: vx, vy | 4: rotation | 5: frame | 6: speed | 7: look | 8: health | 9: death | 10: attack
 * 11: type | 12: tier (0-4) | 13-14: chargeDir | 15-16: chargeStart
 */
const STRIDE = 17;
