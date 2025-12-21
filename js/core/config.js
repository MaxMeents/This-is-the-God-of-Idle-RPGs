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

    // THE THROTTLE: Spread loading over time to prevent ANY lag
    BACKGROUND_THROTTLE: {
        msBetweenDownloads: 2000,   // Wait 2 seconds between each spritesheet download
        msBetweenDecodes: 500,      // Wait 500ms between image decodes in worker
        msBetweenWarming: 2000,     // Wait 2 seconds between GPU texture upload batches
        framesPerWarmBatch: 10,     // Only upload 10 frames at a time (was 30)
        msBetweenSliceBatches: 50   // Slower worker slicing to reduce CPU load
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
    },
    SwordOfLight: {
        skillSheet: 'img/Skills/Sword of Light/Spritesheet/1024x1024/Sword of Light_1024x1024_sheet.png',
        skillFrames: 16, skillCols: 4, skillSize: 1024,
        visualSize: 7000,
        orbitRadius: 5000,
        animSpeedSkill: 1.2,
        cooldownTime: 5000,
        duration: 2000,
        damageMult: 500.0,
        aoeMult: 5.0,
        skillRange: 9000
    }
};

/**
 * WEAPON CONFIGURATION
 */
const WEAPON_CONFIG = {
    bullet_left_side: {
        path: 'img/Laser Sprites/01.png',
        fireRate: 10,
        damage: 10,
        speed: 500,
        life: 2000,
        size: 980,
        offsetSide: -140,
        offsetFront: 80,
        penetration: 5,
        visualStretch: 1.0,
        maxAmmo: 50,
        recoveryRate: 5,
        tint: 0x00ffff,
        minAmmoToFire: 10
    },
    bullet_right_side: {
        path: 'img/Laser Sprites/01.png',
        fireRate: 10,
        damage: 10,
        speed: 500,
        life: 2000,
        size: 980,
        offsetSide: 140,
        offsetFront: 80,
        penetration: 5,
        visualStretch: 1.0,
        maxAmmo: 50,
        recoveryRate: 5,
        tint: 0x00ffff,
        minAmmoToFire: 10
    },
    laser: {
        path: 'img/Laser Sprites/02.png',
        fireRate: 95,
        damage: 10,
        speed: 500,
        life: 4000,
        size: 380,
        visualStretch: 5.0,
        offsetSide: 0,
        offsetFront: 80,
        penetration: 25,
        maxAmmo: 200,
        recoveryRate: 1,
        tint: 0xff00ff,
        minAmmoToFire: 50
    }
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
            enemies: { BlueDragon: 1000, GalaxyDragon: 1000, PhoenixSurrender: 1500, BlackRedButterfly: 500, BlueWhiteButterfly: 500, GoldButterfly: 500, GreenBlackButterfly: 500, GalaxyButterfly: 500 },
            tierChances: { Arch: 0.02, God: 0.001, Alpha: 0.0, Omega: 0.0 }
        },
        2: {
            kills: 500,
            enemies: { PhoenixSurrender: 200, GalaxyDragon: 300, BlackRedButterfly: 100, BlueWhiteButterfly: 100 },
            tierChances: { Arch: 0.03, God: 0.002, Alpha: 0.0, Omega: 0.0 }
        },
        3: {
            kills: 700,
            enemies: { GalaxyDragon: 500, BlueDragon: 100, GoldButterfly: 150, GreenBlackButterfly: 150 },
            tierChances: { Arch: 0.04, God: 0.003, Alpha: 0.0, Omega: 0.0 }
        },
        4: {
            kills: 900,
            enemies: { GalaxyDragon: 600, PhoenixSurrender: 200, GalaxyButterfly: 200 },
            tierChances: { Arch: 0.05, God: 0.004, Alpha: 0.0, Omega: 0.0 }
        },
        5: {
            kills: 1100,
            enemies: { BlueDragon: 400, PhoenixSurrender: 400, BlackRedButterfly: 300, BlueWhiteButterfly: 300 },
            tierChances: { Arch: 0.06, God: 0.005, Alpha: 0.0, Omega: 0.0 }
        },
        6: {
            kills: 1300,
            enemies: { BlueDragon: 600, PhoenixSurrender: 400, GoldButterfly: 400, GreenBlackButterfly: 400 },
            tierChances: { Arch: 0.07, God: 0.007, Alpha: 0.0, Omega: 0.0 }
        },
        7: {
            kills: 1500,
            enemies: { GalaxyDragon: 800, PhoenixSurrender: 500, GalaxyButterfly: 500 },
            tierChances: { Arch: 0.08, God: 0.01, Alpha: 0.0, Omega: 0.0 }
        },
        8: {
            kills: 1700,
            enemies: { BlueDragon: 800, GalaxyDragon: 500, BlackRedButterfly: 400, BlueWhiteButterfly: 400 },
            tierChances: { Arch: 0.09, God: 0.012, Alpha: 0.0, Omega: 0.0 }
        },
        9: {
            kills: 2000,
            enemies: { PhoenixSurrender: 800, BlueDragon: 1000, GoldButterfly: 500, GreenBlackButterfly: 500 },
            tierChances: { Arch: 0.10, God: 0.015, Alpha: 0.0, Omega: 0.0 }
        },
        10: {
            kills: 1,
            enemies: { PhoenixSurrender: 1500, BlueDragon: 1500, GalaxyButterfly: 1000 },
            tierChances: { Arch: 0.15, God: 0.05, Alpha: 0.0, Omega: 0.0 }
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
 * LOOT & DROPS CONFIGURATION
 */
const LOOT_CONFIG = {
    MAX_HISTORY: 5,
    ITEMS: {
        'Dragon Claw': { name: 'Dragon Claw', icon: 'img/Enemy Drops/Dragon Claw.png', baseChance: 0.15, min: 1, max: 2 },
        'Dragon Heart': { name: 'Dragon Heart', icon: 'img/Enemy Drops/Dragon Heart.png', baseChance: 0.05, min: 1, max: 1 },
        'Dragon Horn': { name: 'Dragon Horn', icon: 'img/Enemy Drops/Dragon Horn.png', baseChance: 0.10, min: 1, max: 2 },
        'Phoenix Feather': { name: 'Phoenix Feather', icon: 'img/Enemy Drops/Phoenix Feather.png', baseChance: 0.15, min: 1, max: 3 },
        'Butterfly Wing': { name: 'Butterfly Wing', icon: 'img/Enemy Drops/Butterfly Wing.png', baseChance: 0.20, min: 2, max: 5 },
        'Main Game Currency': { name: 'Currency', icon: 'img/Enemy Drops/Main Game Currency.png', baseChance: 1.0, min: 10, max: 50 },
        'Crystal': { name: 'Crystal', icon: 'img/Enemy Drops/Crystal.png', baseChance: 0.01, min: 1, max: 1 }
    },
    // Tier multipliers (Standard < Arch < God < Alpha < Omega)
    TIERS: [
        { id: 'Standard', chanceMult: 1.0, amountMult: 1.0, healthMult: 1, sizeMult: 1 },
        { id: 'Arch', chanceMult: 2.5, amountMult: 10.0, healthMult: 30, sizeMult: 5 },
        { id: 'God', chanceMult: 5.0, amountMult: 100.0, healthMult: 200, sizeMult: 8 },
        { id: 'Alpha', chanceMult: 10.0, amountMult: 1000.0, healthMult: 1000, sizeMult: 12 },
        { id: 'Omega', chanceMult: 25.0, amountMult: 10000.0, healthMult: 10000, sizeMult: 20 }
    ],
    ENEMY_DROPS: {
        'Dragon': ['Dragon Claw', 'Dragon Heart', 'Dragon Horn'],
        'Phoenix': ['Phoenix Feather'],
        'Butterfly': ['Butterfly Wing']
    },
    GLOBAL_DROPS: ['Main Game Currency', 'Crystal']
};

/**
 * SPATIAL PARTITIONING
 */
const GRID_CELL = 4800;
const GRID_DIM = 400;
const GRID_WORLD_OFFSET = (GRID_DIM * GRID_CELL) / 2;

/**
 * DATA STRIDE
 * 0-1: x, y | 2-3: vx, vy | 4: rotation | 5: frame | 6: speed | 7: look | 8: health | 9: death | 10: attack
 * 11: type | 12: tier (0-4) | 13-14: chargeDir | 15-16: chargeStart
 */
const STRIDE = 17;
