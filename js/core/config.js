/**
 * PERFORMANCE CONFIGURATION
 */
const PERFORMANCE = {
    LOD_TIERS: [
        { id: 'Ultra', size: 1024, max: 10 },
        { id: 'High', size: 1024, max: 30 },
        { id: 'MidHigh', size: 768, max: 60 },
        { id: 'Med', size: 512, max: 150 },
        { id: 'MedLow', size: 256, max: 350 },
        { id: 'Low', size: 128, max: 700 },
        { id: 'VLow', size: 64, max: 1200 },
        { id: 'Tiny', size: 32, max: 2000 },
        { id: 'Micro', size: 16, max: 9999 }
    ],
    LOD_INIT_TIME_SLICE: 1,
    SPAWNS_PER_FRAME: 20,
    GAME_SPEED: 1.0
};

/**
 * SHIP CONFIGURATION
 */
const SHIP_CONFIG = {
    onPath: 'img/Ship/Ship Engines on/Spritesheet/768x768/Ship Engines on_768x768_sheet.png',
    fullPath: 'img/Ship/Ship Full Engine Power/Spritesheet/768x768/Ship Full Engine Power_768x768_sheet.png',
    onFrames: 27, onCols: 6, onSize: 768,
    fullFrames: 18, fullCols: 5, fullSize: 768,
    idleFrames: 3,
    animSpeed: 0.5,
    fullPowerDist: 8000,
    thrustDist: 1500,
    reachDist: 200,
    visualSize: 800,
    stopRange: 10,
    turnSpeed: Math.PI * 3,
    shieldOnPath: 'img/Ship/Ship Shield Is On/Spritesheet/1024x1024/Ship Shield Is On_1024x1024_sheet.png',
    shieldTurnOnPath: 'img/Ship/Ship Shield Turn On/Spritesheet/768x768/Ship Shield Turn On_768x768_sheet.png',
    shieldOnFrames: 14, shieldOnCols: 4, shieldOnSize: 1024,
    shieldTurnOnFrames: 145, shieldTurnOnCols: 13, shieldTurnOnSize: 768,
    shieldMaxHealthMult: 3,
    shieldDuration: 10000,
    shieldCooldown: 15000,
    shieldVisualSize: 1200
};

/**
 * SKILLS CONFIGURATION
 */
const SKILLS = {
    MulticolorXFlame: {
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.png',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.png',
        buttonFrames: 121, buttonCols: 11, buttonSize: 768,
        skillFrames: 109, skillCols: 11, skillSize: 512,
        visualSize: 1600,
        orbitRadius: 1000,
        animSpeedButton: 0.9,
        animSpeedSkill: 2,
        cooldownTime: 2000,
        instanceCount: 12,
        damageMult: 30.0,
        aoeMult: 1.25,
    }
};

/**
 * WEAPON CONFIGURATION
 */
const WEAPON_CONFIG = {
    laserPath: 'img/Laser Sprites/01.png',
    fireRate: 10,        // Shots per second
    damage: 10,
    bulletSpeed: 100,    // Very fast, but visible
    bulletLife: 3000,    // Disappear after 3 seconds if no hit
    bulletSize: 180,     // Visual scale
    offsetSide: 140,     // Left/Right shift from ship center
    offsetFront: 80      // Forward shift from center
};

/**
 * WORLD / STAGE MAP
 */
const STAGE_CONFIG = {
    GRID_SIZE: 150000,
    CLOCKWISE_GRID: [
        [1, 1], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [0, 0], [1, 1]
    ],
    STAGES: {
        1: { kills: 35, enemies: { BlueDragon: 10, GalaxyDragon: 10, PhoenixSurrender: 15 } },
        2: { kills: 500, enemies: { PhoenixSurrender: 200, GalaxyDragon: 300 } },
        3: { kills: 700, enemies: { GalaxyDragon: 500, BlueDragon: 100 } },
        4: { kills: 900, enemies: { GalaxyDragon: 600, PhoenixSurrender: 200 } },
        5: { kills: 1100, enemies: { BlueDragon: 400, PhoenixSurrender: 400 } },
        6: { kills: 1300, enemies: { BlueDragon: 600, PhoenixSurrender: 400 } },
        7: { kills: 1500, enemies: { GalaxyDragon: 800, PhoenixSurrender: 500 } },
        8: { kills: 1700, enemies: { BlueDragon: 800, GalaxyDragon: 500 } },
        9: { kills: 2000, enemies: { PhoenixSurrender: 800, BlueDragon: 1000 } },
        10: { kills: 1, enemies: { PhoenixSurrender: 1500, BlueDragon: 1500 } }
    }
};

// GLOBAL CONSTANTS
const FLOOR_PATH = 'img/Texture Floor/maxmaxmax_333_Ocean_temple_floor_tile_design_wave_patterns_biol_31b2bdc2-1580-4081-86b9-2f7b711e9005_1.png';
const PLAYER_HEALTH_MAX = 35000;
const MIN_ZOOM = 0.0001;
const MAX_ZOOM = 2590.0;
const DAMAGE_PER_POP = 10;
const DAMAGE_INTERVAL = 100;
const AOE_RADIUS = 900;
const PLAYER_SPEED = 20;

/**
 * SPATIAL PARTITIONING
 */
const GRID_CELL = 4800;
const GRID_DIM = 400;
const GRID_WORLD_OFFSET = (GRID_DIM * GRID_CELL) / 2;

/**
 * DATA STRIDE
 */
const STRIDE = 12;
