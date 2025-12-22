/**
 * SHIP CONFIGURATION
 * 
 * Defines the visual assets, movement physics, and defensive stats for the player's ship.
 * 
 * LOCATED IN: js/core/config/ship-config.js
 */

const SHIP_CONFIG = {
    // ENGINE VISUALS (WebP Spritesheets)
    onPath: 'img/Ship/Ship Engines on/Spritesheet/768x768/Ship Engines on_768x768_sheet.webp',
    fullPath: 'img/Ship/Ship Full Engine Power/Spritesheet/768x768/Ship Full Engine Power_768x768_sheet.webp',

    // FRAME DATA (Columns and frame counts for the sheets)
    onFrames: 27,
    onCols: 6,
    onSize: 768,
    fullFrames: 18,
    fullCols: 5,
    fullSize: 768,
    idleFrames: 3,
    animSpeed: 0.5,

    // MOVEMENT PHYSICS
    fullPowerDist: 8000,    // Distance at which full engine power kicks in
    thrustDist: 1500,       // Distance at which engines start firing
    reachDist: 200,         // "Near enough" distance to target
    visualSize: 3200,       // Scaling of the ship sprite
    stopRange: 10,          // Pixel radius to snap to a complete stop
    turnSpeed: Math.PI * 3, // Radians per second

    // SHIELD CONFIGURATION (Protective Dome)
    shieldOnPath: 'img/Ship/Ship Shield Is On/Spritesheet/1024x1024/Ship Shield Is On_1024x1024_sheet.webp',
    shieldTurnOnPath: 'img/Ship/Ship Shield Turn On/Spritesheet/768x768/Ship Shield Turn On_768x768_sheet.webp',
    shieldOnFrames: 14,
    shieldOnCols: 4,
    shieldOnSize: 1024,
    shieldTurnOnFrames: 145,
    shieldTurnOnCols: 13,
    shieldTurnOnSize: 768,

    // SHIELD STATS
    shieldMaxHealthMult: 3, // Shield total Health = PlayerMaxHealth * 3
    shieldDuration: 10000,  // How long the shield stays up (ms)
    shieldCooldown: 15000,  // Recovery time after shield expires (ms)
    shieldVisualSize: 4800, // Scaling of the shield effect

    // SENSORS
    detectionRadius: 100000 // Max distance to look for enemies
};

/**
 * PLAYER VITAL STATS
 */
const PLAYER_HEALTH_MAX = 35000;
const PLAYER_SPEED = 240; // Base engine acceleration force (3x speed)
