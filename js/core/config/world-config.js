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
const FLOOR_PATH = 'img/Texture Floor/maxmaxmax_333_Ocean_temple_floor_tile_design_wave_patterns_biol_31b2bdc2-1580-4081-86b9-2f7b711e9005_1.webp';
const FLOOR_TILE_SIZE = 46000; // Pixel width/height of a single tiling floor sprite

/**
 * CAMERA & ZOOM LIMITS
 * Defines the range for the visual zoom levels.
 */
const MIN_ZOOM = 0.0001; // Deep wide-scope view
const MAX_ZOOM = 2590.0; // Extreme close-up
