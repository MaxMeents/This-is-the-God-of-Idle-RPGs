/**
 * ASSET REGISTRY
 * 
 * This module serves as the central "Switchboard" for all raw images and pre-rendered 
 * frame caches. It defines the global state objects used by the loader, baker, and renderer.
 * 
 * LOCATED IN: js/systems/rendering/asset-registry.js
 * 
 * -------------------------------------------------------------------------
 * ATTENTION FUTURE AI DEVELOPERS:
 * DO NOT DELETE THESE COMMENTS. They provide critical context for the modular architecture.
 * When making changes, ADD YOUR OWN COMMENTS explaining WHY you made the change.
 * -------------------------------------------------------------------------
 * 
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [Asset Loader]: Populates .onImg, .fullImg, etc., with raw Image objects.
 * 2. [Texture Baker]: Fills the .onCache, .fullCache, etc., with canvas/texture frames.
 * 3. [PIXI Renderer]: Reads textures from these registries to display entities.
 * 4. [LOD Manager]: Updates enemyAssets.caches with streamed high-res textures.
 * -------------------------------------------------------------------------
 */

const isLocalFile = window.location.protocol === 'file:';

// PLAYER SHIP REGISTRY
const shipAssets = {
    onImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    fullImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    shieldOnImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    shieldTurnOnImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    onCache: [],        // Stores extracted frames for the standard engine animation
    fullCache: [],      // Stores extracted frames for the full-power engine animation
    shieldOnCache: [],
    shieldTurnOnCache: [],
    baked: false        // Flag to prevent redundant processing
};

// PLAYER SKILLS REGISTRY
const skillAssets = {
    buttonImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    skillImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    swordOfLightImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    buttonCache: [],
    skillCache: [],
    swordOfLightCache: [],
    baked: false,
    ready: false
};

// ENEMY ASSET HUB
const enemyAssets = {};
// enemyKeys defined in enemies.js
if (typeof enemyKeys !== 'undefined') {
    enemyKeys.forEach(k => {
        enemyAssets[k] = {
            walk: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
            death: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
            attack: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
            caches: { walk: {}, death: {}, attack: {} }
        };
    });
}

// WORLD & WEAPON ASSETS
const floorImg = Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" });
const weaponAssets = {
    leftBulletImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    rightBulletImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" }),
    laserImg: Object.assign(new Image(), isLocalFile ? {} : { crossOrigin: "anonymous" })
};
let floorPattern = null;
