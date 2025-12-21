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
    onPath: 'img/Ship/Ship Engines on/Spritesheet/768x768/Ship Engines on_768x768_sheet.webp',
    fullPath: 'img/Ship/Ship Full Engine Power/Spritesheet/768x768/Ship Full Engine Power_768x768_sheet.webp',
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
    shieldOnPath: 'img/Ship/Ship Shield Is On/Spritesheet/1024x1024/Ship Shield Is On_1024x1024_sheet.webp',
    shieldTurnOnPath: 'img/Ship/Ship Shield Turn On/Spritesheet/768x768/Ship Shield Turn On_768x768_sheet.webp',
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
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.webp',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.webp',
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
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.webp',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.webp',
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
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.webp',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.webp',
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
        // We use the same sheet for both button and skill
        skillSheet: 'img/Skills/Sword of Light/Spritesheet/1024x1024/Sword of Light_1024x1024_sheet.webp',
        skillFrames: 16, skillCols: 4, skillSize: 1024,
        visualSize: 7000,   // "Enormous"
        orbitRadius: 5000,   // "Fair distance from the ship"
        animSpeedSkill: 1.2,
        cooldownTime: 5000, // 5 seconds
        duration: 2000,     // 2 seconds
        damageMult: 500.0,  // "Massive damage"
        aoeMult: 5.0,
        skillRange: 9000    // Area around the sword
    }
};

/**
 * WEAPON CONFIGURATION
 */
const WEAPON_CONFIG = {
    bullet_left_side: {
        path: 'img/Laser Sprites/01.webp',
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
        recoveryRate: 5,     // Lowered so it actually goes down
        tint: 0x00ffff,
        minAmmoToFire: 10    // Must recover to 200 before firing again after depletion
    },
    bullet_right_side: {
        path: 'img/Laser Sprites/01.webp',
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
        path: 'img/Laser Sprites/02.webp',
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
        recoveryRate: 1,    // Lowered so it actually goes down
        tint: 0xff00ff,
        minAmmoToFire: 50     // Must recover to 50 before firing again
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
            enemies: { BlueDragon: 1000, GalaxyDragon: 1000, PhoenixSurrender: 1500 },
            tierChances: { epic: 0.02, god: 0.02, omega: 0.02, alpha: 0.02 }
        },
        2: {
            kills: 500,
            enemies: { PhoenixSurrender: 200, GalaxyDragon: 300 },
            tierChances: { epic: 0.03, god: 0.03, omega: 0.0, alpha: 0.0 }
        },
        3: {
            kills: 700,
            enemies: { GalaxyDragon: 500, BlueDragon: 100 },
            tierChances: { epic: 0.04, god: 0.04, omega: 0.0, alpha: 0.0 }
        },
        4: {
            kills: 900,
            enemies: { GalaxyDragon: 600, PhoenixSurrender: 200, GalaxyButterfly: 200 },
            tierChances: { epic: 0.05, god: 0.05, omega: 0.0, alpha: 0.0 }
        },
        5: {
            kills: 1100,
            enemies: { BlueDragon: 400, PhoenixSurrender: 400, BlackRedButterfly: 300, BlueWhiteButterfly: 300 },
            tierChances: { epic: 0.06, god: 0.06, omega: 0.0, alpha: 0.0 }
        },
        6: {
            kills: 1300,
            enemies: { BlueDragon: 600, PhoenixSurrender: 400, GoldButterfly: 400, GreenBlackButterfly: 400 },
            tierChances: { epic: 0.07, god: 0.07, omega: 0.0, alpha: 0.0 }
        },
        7: {
            kills: 1500,
            enemies: { GalaxyDragon: 800, PhoenixSurrender: 500, GalaxyButterfly: 500 },
            tierChances: { epic: 0.08, god: 0.08, omega: 0.0, alpha: 0.0 }
        },
        8: {
            kills: 1700,
            enemies: { BlueDragon: 800, GalaxyDragon: 500, BlackRedButterfly: 400, BlueWhiteButterfly: 400 },
            tierChances: { epic: 0.09, god: 0.09, omega: 0.0, alpha: 0.0 }
        },
        9: {
            kills: 2000,
            enemies: { PhoenixSurrender: 800, BlueDragon: 1000, GoldButterfly: 500, GreenBlackButterfly: 500 },
            tierChances: { epic: 0.10, god: 0.10, omega: 0.0, alpha: 0.0 }
        },
        10: {
            kills: 1,
            enemies: { PhoenixSurrender: 1500, BlueDragon: 1500, GalaxyButterfly: 1000 },
            tierChances: { epic: 0.15, god: 0.15, omega: 0.0, alpha: 0.0 }
        }
    }
}

// GLOBAL CONSTANTS
const FLOOR_PATH = 'img/Texture Floor/maxmaxmax_333_Ocean_temple_floor_tile_design_wave_patterns_biol_31b2bdc2-1580-4081-86b9-2f7b711e9005_1.webp';
const PLAYER_HEALTH_MAX = 35000;
const MIN_ZOOM = 0.0001;
const MAX_ZOOM = 2590.0;
const DAMAGE_PER_POP = 10;
const DAMAGE_INTERVAL = 100;
const AOE_RADIUS = 900;
const PLAYER_SPEED = 80;
const FLOOR_TILE_SIZE = 46000;
const LUCKY_HIT_CHANCE = 0.1;

// CRIT SYSTEM CONFIG
const CRIT_CONFIG = {
    BASE_CHANCE: 0.75,      // 75% for 1st tier (Arch)
    RECURSIVE_CHANCE: 0.05, // 5% for each subsequent tier
    TIER_COLORS: [
        0xffffff, // 0: Normal (White)
        0x00ffff, // 1: Arch (Cyan/Blue)
        0xffd700, // 2: God (Gold/Rainbow)
        0xff0000, // 3: Omega (Red/Omega)
        0xff00ff  // 4: Alpha (Magenta/Alpha) - HIGHEST
    ],
    TIER_PREFIXES: ["", "CRIT", "GODLY CRIT", "OMEGA CRIT", "ALPHA CRIT"],
    LUCKY_PREFIXES: ["LUCKY", "LUCKY CRIT", "LUCKY GODLY CRIT", "LUCKY OMEGA CRIT", "LUCKY ALPHA CRIT"],
    MULTIPLIERS: [1, 2, 4, 8, 16] // Each tier doubles damage
};
// 10% chance for a lucky hit

/**
 * LOOT & DROPS CONFIGURATION
 */
const LOOT_CONFIG = {
    MAX_HISTORY: 5,
    ITEMS: {
        'Dragon Claw': { id: 1, name: 'Dragon Claw', icon: 'img/Enemy Drops/Dragon Claw.webp', baseChance: 0.15, min: 1, max: 2, tier: 'epic' },
        'Dragon Heart': { id: 2, name: 'Dragon Heart', icon: 'img/Enemy Drops/Dragon Heart.webp', baseChance: 0.05, min: 1, max: 1, tier: 'god' },
        'Dragon Horn': { id: 3, name: 'Dragon Horn', icon: 'img/Enemy Drops/Dragon Horn.webp', baseChance: 0.10, min: 1, max: 2, tier: 'epic' },
        'Galaxy Dragon Claw': { id: 4, name: 'Galaxy Dragon Claw', icon: 'img/Enemy Drops/Galaxy Dragon Claw.webp', baseChance: 0.15, min: 1, max: 2, tier: 'omega' },
        'Galaxy Dragon Horn': { id: 5, name: 'Galaxy Dragon Horn', icon: 'img/Enemy Drops/Galaxy Dragon Horn.webp', baseChance: 0.10, min: 1, max: 2, tier: 'alpha' },
        'Blue Dragon Claw': { id: 6, name: 'Blue Dragon Claw', icon: 'img/Enemy Drops/Blue Dragon Claw.webp', baseChance: 0.15, min: 1, max: 2, tier: 'god' },
        'Blue Dragon Horn': { id: 7, name: 'Blue Dragon Horn', icon: 'img/Enemy Drops/Blue Dragon Horn.webp', baseChance: 0.10, min: 1, max: 2, tier: 'god' },
        'Phoenix Feather': { id: 8, name: 'Phoenix Feather', icon: 'img/Enemy Drops/Phoenix Feather.webp', baseChance: 0.15, min: 1, max: 3, tier: 'normal' },
        'Butterfly Wing': { id: 9, name: 'Butterfly Wing', icon: 'img/Enemy Drops/Butterfly Wing.webp', baseChance: 0.20, min: 2, max: 5, tier: 'normal' },
        'Blue White Butterfly Wing': { id: 10, name: 'Blue White Butterfly Wing', icon: 'img/Enemy Drops/Blue White Butterfly Wing.webp', baseChance: 0.20, min: 2, max: 5, tier: 'god' },
        'Gold Butterfly Wing': { id: 11, name: 'Gold Butterfly Wing', icon: 'img/Enemy Drops/Gold Butterfly Wing.webp', baseChance: 0.20, min: 2, max: 5, tier: 'epic' },
        'Green Black Butterfly Wing': { id: 12, name: 'Green Black Butterfly Wing', icon: 'img/Enemy Drops/Green Black Butterfly Wing.webp', baseChance: 0.20, min: 2, max: 5, tier: 'epic' },
        'Black Red Butterfly Wing': { id: 13, name: 'Black Red Butterfly Wing', icon: 'img/Enemy Drops/Black Red Butterfly Wing.webp', baseChance: 0.20, min: 2, max: 5, tier: 'epic' },
        'Main Game Currency': { id: 14, name: 'Currency', icon: 'img/Enemy Drops/Main Game Currency.webp', baseChance: .05, min: 10, max: 50, tier: 'god' },
        'Crystal': { id: 15, name: 'Crystal', icon: 'img/Enemy Drops/Crystal.webp', baseChance: 0.01, min: 1, max: 1, tier: 'epic' }
    },
    // Tier multipliers (Standard < Arch < God < Alpha < Omega)
    TIERS: [
        { id: 'normal', chanceMult: 1.0, amountMult: 1.0, healthMult: 1, sizeMult: 1 },
        { id: 'epic', chanceMult: 2.5, amountMult: 10.0, healthMult: 30, sizeMult: 5 },
        { id: 'god', chanceMult: 5.0, amountMult: 100.0, healthMult: 200, sizeMult: 8 },
        { id: 'alpha', chanceMult: 10.0, amountMult: 1000.0, healthMult: 1000, sizeMult: 12 },
        { id: 'omega', chanceMult: 25.0, amountMult: 10000.0, healthMult: 10000, sizeMult: 20 }
    ],
    ENEMY_DROPS: {
        'GalaxyDragon': ['Galaxy Dragon Claw', 'Dragon Heart', 'Galaxy Dragon Horn'],
        'BlueDragon': ['Blue Dragon Claw', 'Dragon Heart', 'Blue Dragon Horn'],
        'PhoenixSurrender': ['Phoenix Feather'],
        'GalaxyButterfly': ['Butterfly Wing'],
        'BlueWhiteButterfly': ['Blue White Butterfly Wing'],
        'GoldButterfly': ['Gold Butterfly Wing'],
        'GreenBlackButterfly': ['Green Black Butterfly Wing'],
        'BlackRedButterfly': ['Black Red Butterfly Wing']
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

/*

const PERFORMANCE = {
    LOD_TIERS: [
        { id: 'Ultra', size: 512, max: 0, priority: false },
        { id: 'High', size: 512, max: 0, priority: false },
        { id: 'MidHigh', size: 512, max: 0, priority: false },
        { id: 'Med', size: 512, max: 1200, priority: false },
        { id: 'MedLow', size: 512, max: 25000, priority: true },
        { id: 'Low', size: 512, max: 2500, priority: true },
        { id: 'VLow', size: 512, max: 7000, priority: true },
        { id: 'Tiny', size: 512, max: 10000, priority: true },
        { id: 'Micro', size: 512, max: 15000, priority: true }
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

const SHIP_CONFIG = {
    onPath: 'img/Ship/Ship Engines on/Spritesheet/768x768/Ship Engines on_768x768_sheet.webp',
    fullPath: 'img/Ship/Ship Full Engine Power/Spritesheet/768x768/Ship Full Engine Power_768x768_sheet.webp',
    onFrames: 27, onCols: 6, onSize: 768,
    fullFrames: 18, fullCols: 5, fullSize: 768,
    idleFrames: 3,
    animSpeed: 0.5,
    fullPowerDist: 8000,
    thrustDist: 1500,
    reachDist: 200,
    visualSize: 800,
    stopRange: 10000,
    turnSpeed: Math.PI * 3,
    shieldOnPath: 'img/Ship/Ship Shield Is On/Spritesheet/1024x1024/Ship Shield Is On_1024x1024_sheet.webp',
    shieldTurnOnPath: 'img/Ship/Ship Shield Turn On/Spritesheet/768x768/Ship Shield Turn On_768x768_sheet.webp',
    shieldOnFrames: 14, shieldOnCols: 4, shieldOnSize: 1024,
    shieldTurnOnFrames: 145, shieldTurnOnCols: 13, shieldTurnOnSize: 768,
    shieldMaxHealthMult: 3,
    shieldDuration: 10000,
    shieldCooldown: 15000,
    shieldVisualSize: 1200,
    detectionRadius: 100000  // How far the ship can detect enemies
};

const SKILLS = {
    Tier1: {
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.webp',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.webp',
        buttonFrames: 121, buttonCols: 11, buttonSize: 768,
        skillFrames: 109, skillCols: 11, skillSize: 512,
        visualSize: 12000,
        orbitRadius: 10000,
        animSpeedButton: 0.9,
        animSpeedSkill: 2,
        cooldownTime: 250000,
        instanceCount: 22,
        damageMult: 100.0,
        aoeMult: 3.0,
        skillRange: 15000,
        rings: 25
    },
    Tier2: {
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.webp',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.webp',
        buttonFrames: 121, buttonCols: 11, buttonSize: 768,
        skillFrames: 109, skillCols: 11, skillSize: 512,
        visualSize: 9500,
        orbitRadius: 10000,
        animSpeedButton: 0.9,
        animSpeedSkill: 2,
        cooldownTime: 120000,
        instanceCount: 22,
        damageMult: 50.0,
        aoeMult: 1.75,
        skillRange: 12000,
        rings: 8
    },
    Tier3: {
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.webp',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.webp',
        buttonFrames: 121, buttonCols: 11, buttonSize: 768,
        skillFrames: 109, skillCols: 11, skillSize: 512,
        visualSize: 8600,
        orbitRadius: 10000,
        animSpeedButton: 0.9,
        animSpeedSkill: 2,
        cooldownTime: 80000,
        instanceCount: 22,
        damageMult: 30.0,
        aoeMult: 1.25,
        skillRange: 10000,
        rings: 3
    },
    SwordOfLight: {
        skillSheet: 'img/Skills/Sword of Light/Spritesheet/1024x1024/Sword of Light_1024x1024_sheet.webp',
        skillFrames: 16, skillCols: 4, skillSize: 1024,
        visualSize: 7000,
        orbitRadius: 5000,
        animSpeedSkill: 1.2,
        cooldownTime: 180000,
        duration: 2000,
        damageMult: 5.0,
        aoeMult: 5.0,
        skillRange: 9000
    }
};

const WEAPON_CONFIG = {
    bullet_left_side: {
        path: 'img/Laser Sprites/01.webp',
        fireRate: 3,
        damage: 3,
        speed: 500,
        life: 2000,
        size: 980,
        offsetSide: -140,
        offsetFront: 80,
        penetration: 1,
        visualStretch: 1.0,
        maxAmmo: 5000,
        recoveryRate: 1,
        tint: 0x00ffff,
        minAmmoToFire: 10
    },
    bullet_right_side: {
        path: 'img/Laser Sprites/01.webp',
        fireRate: 3,
        damage: 3,
        speed: 500,
        life: 2000,
        size: 980,
        offsetSide: 140,
        offsetFront: 80,
        penetration: 1,
        visualStretch: 1.0,
        maxAmmo: 5000,
        recoveryRate: 1,
        tint: 0x00ffff,
        minAmmoToFire: 10
    },
    laser: {
        path: 'img/Laser Sprites/02.webp',
        fireRate: 95,
        damage: .01,
        speed: 500,
        life: 4000,
        size: 380,
        visualStretch: 5.0,
        offsetSide: 0,
        offsetFront: 80,
        penetration: 25,
        maxAmmo: 1000,
        recoveryRate: 1,
        tint: 0xff00ff,
        minAmmoToFire: 50
    }
};

const STAGE_CONFIG = {
    GRID_SIZE: 150000,
    CLOCKWISE_GRID: [
        [1, 1], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [0, 0], [1, 1]
    ],
    STAGES: {
        1: {
            kills: 25,
            enemies: { BlueDragon: 0, GalaxyDragon: 0, PhoenixSurrender: 30, BlackRedButterfly: 0, BlueWhiteButterfly: 0, GoldButterfly: 0, GreenBlackButterfly: 0, GalaxyButterfly: 0 },
            tierChances: { epic: 0.02, god: 0.001, omega: 0.0, alpha: 0.0 }
        },
        2: {
            kills: 50,
            enemies: { BlueDragon: 0, GalaxyDragon: 0, PhoenixSurrender: 0, BlackRedButterfly: 0, BlueWhiteButterfly: 0, GoldButterfly: 0, GreenBlackButterfly: 0, GalaxyButterfly: 0 },
            tierChances: { epic: 0.03, god: 0.002, omega: 0.0, alpha: 0.0 }
        },
        3: {
            kills: 100,
            enemies: { BlueDragon: 0, GalaxyDragon: 0, PhoenixSurrender: 0, BlackRedButterfly: 0, BlueWhiteButterfly: 0, GoldButterfly: 0, GreenBlackButterfly: 0, GalaxyButterfly: 0 },
            tierChances: { epic: 0.04, god: 0.003, omega: 0.0, alpha: 0.0 }
        },
        4: {
            kills: 150,
            enemies: { BlueDragon: 0, GalaxyDragon: 0, PhoenixSurrender: 0, BlackRedButterfly: 0, BlueWhiteButterfly: 0, GoldButterfly: 0, GreenBlackButterfly: 0, GalaxyButterfly: 0 },
            tierChances: { epic: 0.05, god: 0.004, omega: 0.0, alpha: 0.0 }
        },
        5: {
            kills: 200,
            enemies: { BlueDragon: 0, GalaxyDragon: 0, PhoenixSurrender: 0, BlackRedButterfly: 0, BlueWhiteButterfly: 0, GoldButterfly: 0, GreenBlackButterfly: 0, GalaxyButterfly: 0 },
            tierChances: { epic: 0.06, god: 0.005, omega: 0.0, alpha: 0.0 }
        },
        6: {
            kills: 250,
            enemies: { BlueDragon: 0, GalaxyDragon: 0, PhoenixSurrender: 0, BlackRedButterfly: 0, BlueWhiteButterfly: 0, GoldButterfly: 0, GreenBlackButterfly: 0, GalaxyButterfly: 0 },
            tierChances: { epic: 0.07, god: 0.007, omega: 0.0, alpha: 0.0 }
        },
        7: {
            kills: 300,
            enemies: { BlueDragon: 0, GalaxyDragon: 0, PhoenixSurrender: 0, BlackRedButterfly: 0, BlueWhiteButterfly: 0, GoldButterfly: 0, GreenBlackButterfly: 0, GalaxyButterfly: 0 },
            tierChances: { epic: 0.08, god: 0.01, omega: 0.0, alpha: 0.0 }
        },
        8: {
            kills: 350,
            enemies: { BlueDragon: 0, GalaxyDragon: 0, PhoenixSurrender: 0, BlackRedButterfly: 0, BlueWhiteButterfly: 0, GoldButterfly: 0, GreenBlackButterfly: 0, GalaxyButterfly: 0 },
            tierChances: { epic: 0.09, god: 0.012, omega: 0.0, alpha: 0.0 }
        },
        9: {
            kills: 400,
            enemies: { BlueDragon: 0, GalaxyDragon: 0, PhoenixSurrender: 0, BlackRedButterfly: 0, BlueWhiteButterfly: 0, GoldButterfly: 0, GreenBlackButterfly: 0, GalaxyButterfly: 0 },
            tierChances: { epic: 0.10, god: 0.015, omega: 0.0, alpha: 0.0 }
        },
        10: {
            kills: 1,
            enemies: { BlueDragon: 0, GalaxyDragon: 0, PhoenixSurrender: 0, BlackRedButterfly: 0, BlueWhiteButterfly: 0, GoldButterfly: 0, GreenBlackButterfly: 0, GalaxyButterfly: 1 },
            tierChances: { epic: 0, god: 0, omega: 0.0, alpha: 1 }
        }
    }
};

// GLOBAL CONSTANTS
const FLOOR_PATH = 'img/Texture Floor/maxmaxmax_333_Ocean_temple_floor_tile_design_wave_patterns_biol_31b2bdc2-1580-4081-86b9-2f7b711e9005_1.webp';
const PLAYER_HEALTH_MAX = 100;
const MIN_ZOOM = 0.005;
const MAX_ZOOM = 1.0;
const DAMAGE_PER_POP = 10;
const DAMAGE_INTERVAL = 100;
const AOE_RADIUS = 900;
const PLAYER_SPEED = 80;
const FLOOR_TILE_SIZE = 46000;

const LOOT_CONFIG = {
    MAX_HISTORY: 3,
    ITEMS: {
        'Dragon Claw': { name: 'Dragon Claw', icon: 'img/Enemy Drops/Dragon Claw.webp', baseChance: 0.15, min: 1, max: 2 },
        'Dragon Heart': { name: 'Dragon Heart', icon: 'img/Enemy Drops/Dragon Heart.webp', baseChance: 0.05, min: 1, max: 1 },
        'Dragon Horn': { name: 'Dragon Horn', icon: 'img/Enemy Drops/Dragon Horn.webp', baseChance: 0.10, min: 1, max: 2 },
        'Galaxy Dragon Claw': { name: 'Galaxy Dragon Claw', icon: 'img/Enemy Drops/Galaxy Dragon Claw.png', baseChance: 0.15, min: 1, max: 2 },
        'Galaxy Dragon Horn': { name: 'Galaxy Dragon Horn', icon: 'img/Enemy Drops/Galaxy Dragon Horn.png', baseChance: 0.10, min: 1, max: 2 },
        'Blue Dragon Claw': { name: 'Blue Dragon Claw', icon: 'img/Enemy Drops/Blue Dragon Claw.png', baseChance: 0.15, min: 1, max: 2 },
        'Blue Dragon Horn': { name: 'Blue Dragon Horn', icon: 'img/Enemy Drops/Blue Dragon Horn.png', baseChance: 0.10, min: 1, max: 2 },
        'Phoenix Feather': { name: 'Phoenix Feather', icon: 'img/Enemy Drops/Phoenix Feather.webp', baseChance: 0.15, min: 1, max: 3 },
        'Butterfly Wing': { name: 'Butterfly Wing', icon: 'img/Enemy Drops/Butterfly Wing.webp', baseChance: 0.20, min: 2, max: 5 },
        'Blue White Butterfly Wing': { name: 'Blue White Butterfly Wing', icon: 'img/Enemy Drops/Blue White Butterfly Wing.png', baseChance: 0.20, min: 2, max: 5 },
        'Gold Butterfly Wing': { name: 'Gold Butterfly Wing', icon: 'img/Enemy Drops/Gold Butterfly Wing.png', baseChance: 0.20, min: 2, max: 5 },
        'Green Black Butterfly Wing': { name: 'Green Black Butterfly Wing', icon: 'img/Enemy Drops/Green Black Butterfly Wing.png', baseChance: 0.20, min: 2, max: 5 },
        'Black Red Butterfly Wing': { name: 'Black Red Butterfly Wing', icon: 'img/Enemy Drops/Black Red Butterfly Wing.png', baseChance: 0.20, min: 2, max: 5 },
        'Main Game Currency': { name: 'Currency', icon: 'img/Enemy Drops/Main Game Currency.webp', baseChance: .05, min: 10, max: 50 },
        'Crystal': { name: 'Crystal', icon: 'img/Enemy Drops/Crystal.webp', baseChance: 0.01, min: 1, max: 1 }
    },
    // Tier multipliers (Standard < Arch < God < Alpha < Omega)
    TIERS: [
        { id: 'normal', chanceMult: 1.0, amountMult: 1.0, healthMult: 1, sizeMult: 1 },
        { id: 'epic', chanceMult: 2.5, amountMult: 10.0, healthMult: 30, sizeMult: 5 },
        { id: 'god', chanceMult: 5.0, amountMult: 100.0, healthMult: 200, sizeMult: 8 },
        { id: 'alpha', chanceMult: 10.0, amountMult: 1000.0, healthMult: 1000, sizeMult: 12 },
        { id: 'omega', chanceMult: 25.0, amountMult: 10000.0, healthMult: 10000, sizeMult: 20 }
    ],
    ENEMY_DROPS: {
        'GalaxyDragon': ['Galaxy Dragon Claw', 'Dragon Heart', 'Galaxy Dragon Horn'],
        'BlueDragon': ['Blue Dragon Claw', 'Dragon Heart', 'Blue Dragon Horn'],
        'PhoenixSurrender': ['Phoenix Feather'],
        'GalaxyButterfly': ['Butterfly Wing'],
        'BlueWhiteButterfly': ['Blue White Butterfly Wing'],
        'GoldButterfly': ['Gold Butterfly Wing'],
        'GreenBlackButterfly': ['Green Black Butterfly Wing'],
        'BlackRedButterfly': ['Black Red Butterfly Wing']
    },
    GLOBAL_DROPS: ['Main Game Currency', 'Crystal']
};

const GRID_CELL = 4800;
const GRID_DIM = 400;
const GRID_WORLD_OFFSET = (GRID_DIM * GRID_CELL) / 2;


const STRIDE = 17;
*/