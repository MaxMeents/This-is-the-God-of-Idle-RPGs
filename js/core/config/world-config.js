/**
 * WORLD & VIEW CONFIGURATION
 * 
 * Handles static world assets and camera/visual limits.
 * 
 * LOCATED IN: js/core/config/world-config.js
 */

/**
 * BACKGROUND ENVIRONMENT
 */
const FLOOR_PATH = 'img/Texture Floor/bg_seamless.png';
const FLOOR_TILE_SIZE = 4600; // Pixel width/height of a single tiling floor sprite

/**
 * CAMERA & ZOOM LIMITS
 * Defines the range for the visual zoom levels.
 */
const MIN_ZOOM = 0.0001; // Deep wide-scope view
const MAX_ZOOM = 2590.0; // Extreme close-up
