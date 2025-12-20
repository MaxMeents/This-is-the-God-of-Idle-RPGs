/**
 * PERFORMANCE CONFIGURATION
 */
const PERFORMANCE = {
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
    LOD_INIT_TIME_SLICE: 1,
    SPAWNS_PER_FRAME: 500,
    GAME_SPEED: 1.0,

    // THE THROTTLE: Adjust these values to control high-res loading 'power'
    BACKGROUND_THROTTLE: {
        msBetweenDownloads: 1000,   // Delay after a high-res file pipeline completes
        msBetweenDecodes: 200,      // Delay between off-thread image decodes
        msBetweenWarming: 1000,     // Delay between GPU texture uploads
        framesPerWarmBatch: 30,     // How many frames to warm per 'breath' (much faster with bitmaps)
        msBetweenSliceBatches: 16   // Wait between slicing next frames in worker
    }
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
    shieldVisualSize: 1200,
    detectionRadius: 100000  // How far the ship can detect enemies
};

/**
 * SKILLS CONFIGURATION
 */
const SKILLS = {
    Tier1: {
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.png',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.png',
        buttonFrames: 121, buttonCols: 11, buttonSize: 768,
        skillFrames: 109, skillCols: 11, skillSize: 512,
        visualSize: 12000,
        orbitRadius: 10000,
        animSpeedButton: 0.9,
        animSpeedSkill: 2,
        cooldownTime: 25000,
        instanceCount: 22,
        damageMult: 100.0,
        aoeMult: 3.0,
        skillRange: 15000,
        rings: 25
    },
    Tier2: {
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.png',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.png',
        buttonFrames: 121, buttonCols: 11, buttonSize: 768,
        skillFrames: 109, skillCols: 11, skillSize: 512,
        visualSize: 9500,
        orbitRadius: 10000,
        animSpeedButton: 0.9,
        animSpeedSkill: 2,
        cooldownTime: 12000,
        instanceCount: 22,
        damageMult: 50.0,
        aoeMult: 1.75,
        skillRange: 12000,
        rings: 8
    },
    Tier3: {
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.png',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.png',
        buttonFrames: 121, buttonCols: 11, buttonSize: 768,
        skillFrames: 109, skillCols: 11, skillSize: 512,
        visualSize: 8600,
        orbitRadius: 10000,
        animSpeedButton: 0.9,
        animSpeedSkill: 2,
        cooldownTime: 8000,
        instanceCount: 22,
        damageMult: 30.0,
        aoeMult: 1.25,
        skillRange: 10000,
        rings: 3
    }
};

/**
 * WEAPON CONFIGURATION
 */
const WEAPON_CONFIG = {
    laserPath: 'img/Laser Sprites/01.png',
    fireRate: 40,        // Shots per second
    damage: 10,
    bulletSpeed: 500,   // 10x faster - reaches distant enemies
    bulletLife: 75000,   // 25x longer - 75 seconds range
    bulletSize: 980,     // Visual scale
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
        1: {
            kills: 3500,
            enemies: { BlueDragon: 1000, GalaxyDragon: 1000, PhoenixSurrender: 1500 },
            archChance: { ArchBlueDragon: 0.02, ArchGalaxyDragon: 0.02, ArchPhoenixSurrender: 0.02 }
        },
        2: {
            kills: 500,
            enemies: { PhoenixSurrender: 200, GalaxyDragon: 300 },
            archChance: { ArchPhoenixSurrender: 0.03, ArchGalaxyDragon: 0.03 }
        },
        3: {
            kills: 700,
            enemies: { GalaxyDragon: 500, BlueDragon: 100 },
            archChance: { ArchGalaxyDragon: 0.04, ArchBlueDragon: 0.04 }
        },
        4: {
            kills: 900,
            enemies: { GalaxyDragon: 600, PhoenixSurrender: 200 },
            archChance: { ArchGalaxyDragon: 0.05, ArchPhoenixSurrender: 0.05 }
        },
        5: {
            kills: 1100,
            enemies: { BlueDragon: 400, PhoenixSurrender: 400 },
            archChance: { ArchBlueDragon: 0.06, ArchPhoenixSurrender: 0.06 }
        },
        6: {
            kills: 1300,
            enemies: { BlueDragon: 600, PhoenixSurrender: 400 },
            archChance: { ArchBlueDragon: 0.07, ArchPhoenixSurrender: 0.07 }
        },
        7: {
            kills: 1500,
            enemies: { GalaxyDragon: 800, PhoenixSurrender: 500 },
            archChance: { ArchGalaxyDragon: 0.08, ArchPhoenixSurrender: 0.08 }
        },
        8: {
            kills: 1700,
            enemies: { BlueDragon: 800, GalaxyDragon: 500 },
            archChance: { ArchBlueDragon: 0.09, ArchGalaxyDragon: 0.09 }
        },
        9: {
            kills: 2000,
            enemies: { PhoenixSurrender: 800, BlueDragon: 1000 },
            archChance: { ArchPhoenixSurrender: 0.10, ArchBlueDragon: 0.10 }
        },
        10: {
            kills: 1,
            enemies: { PhoenixSurrender: 1500, BlueDragon: 1500 },
            archChance: { ArchPhoenixSurrender: 0.15, ArchBlueDragon: 0.15 }
        }
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
const PLAYER_SPEED = 80;
const FLOOR_TILE_SIZE = 46000;

/**
 * SPATIAL PARTITIONING
 */
const GRID_CELL = 4800;
const GRID_DIM = 400;
const GRID_WORLD_OFFSET = (GRID_DIM * GRID_CELL) / 2;

/**
 * DATA STRIDE
 * Each enemy uses 17 floats:
 * 0-1: x, y position
 * 2-3: velocity x, y
 * 4: rotation
 * 5: animation frame
 * 6: move speed
 * 7: look direction
 * 8: health
 * 9: death frame
 * 10: attack frame
 * 11: enemy type index
 * 12: isArch flag (1.0 = Arch, 0.0 = normal)
 * 13-14: charge direction x, y (stored when attack starts)
 * 15-16: charge start position x, y (to calculate distance traveled)
 */
const STRIDE = 17;
