/**
 * PERFORMANCE CONFIGURATION
 * These settings control the game's optimization systems.
 */
const PERFORMANCE = {
    /**
     * LEVEL OF DETAIL (LOD) TIERS
     * To handle thousands of enemies, we don't render them all at full resolution.
     * The game automatically switches to smaller, 'baked' versions of the sprites
     * based on how many enemies are currently on screen.
     */
    LOD_TIERS: [
        { id: 'Ultra', size: 1024, max: 10 },   // Full detail only for a few enemies
        { id: 'High', size: 1024, max: 30 },
        { id: 'MidHigh', size: 768, max: 60 },
        { id: 'Med', size: 512, max: 150 },
        { id: 'MedLow', size: 256, max: 350 },
        { id: 'Low', size: 128, max: 700 },
        { id: 'VLow', size: 64, max: 1200 },
        { id: 'Tiny', size: 32, max: 2000 },    // Tiny pixels for massive swarms
        { id: 'Micro', size: 16, max: 9999 }
    ],
    LOD_INIT_TIME_SLICE: 1, // How many ms per frame to spend on background 'baking'
    SPAWNS_PER_FRAME: 20,    // Throttles enemy spawning to prevent frame spikes
    GAME_SPEED: 1.0         // Initial simulation speed multiplier
};

/**
 * SHIP CONFIGURATION
 * Defines everything about the player's ship, its animations, and shield mechanics.
 */
const SHIP_CONFIG = {
    onPath: 'img/Ship/Ship Engines on/Spritesheet/768x768/Ship Engines on_768x768_sheet.png',
    fullPath: 'img/Ship/Ship Full Engine Power/Spritesheet/768x768/Ship Full Engine Power_768x768_sheet.png',
    onFrames: 27, onCols: 6, onSize: 768,
    fullFrames: 18, fullCols: 5, fullSize: 768,
    idleFrames: 3,
    animSpeed: 0.5,
    fullPowerDist: 8000,    // Distance at which the ship reaches "Full" engine state
    thrustDist: 1500,       // Distance at which engines kick in
    reachDist: 200,         // Distance to stop moving toward target
    visualSize: 800,        // Pixel size on the world canvas
    stopRange: 10,
    turnSpeed: Math.PI * 3, // Radians per second for ship rotation

    // SHIELD SETTINGS
    shieldOnPath: 'img/Ship/Ship Shield Is On/Spritesheet/1024x1024/Ship Shield Is On_1024x1024_sheet.png',
    shieldTurnOnPath: 'img/Ship/Ship Shield Turn On/Spritesheet/768x768/Ship Shield Turn On_768x768_sheet.png',
    shieldOnFrames: 14, shieldOnCols: 4, shieldOnSize: 1024,
    shieldTurnOnFrames: 145, shieldTurnOnCols: 13, shieldTurnOnSize: 768,
    shieldMaxHealthMult: 3,  // Shield HP is a multiple of player Health
    shieldDuration: 10000,  // Active time in ms
    shieldCooldown: 15000,  // Recovery time in ms
    shieldVisualSize: 1200  // Size of the glowing shield effect
};

/**
 * SKILLS CONFIGURATION
 * Stores definitions for player abilities and their visual particle systems.
 */
const SKILLS = {
    MulticolorXFlame: {
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.png',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.png',
        buttonFrames: 121, buttonCols: 11, buttonSize: 768,
        skillFrames: 109, skillCols: 11, skillSize: 512,
        visualSize: 1600,   // Size of each particle
        orbitRadius: 1000,  // Distance from player center
        animSpeedButton: 0.9,
        animSpeedSkill: 2,
        cooldownTime: 2000,
        instanceCount: 12,  // Number of particles spawned per cast
        damageMult: 30.0,
        aoeMult: 1.25,
    }
};

/**
 * ENEMY DEFINITIONS
 * Defines the stats and animation data for every enemy type in the game.
 */
const Enemy = {
    Tiyger: {
        count: 0,
        size: 2500,
        healthMax: 35,
        moveSpeed: 15,
        spacing: 120,       // Minimum distance between individual enemies
        closestDist: 400,   // How close they try to get to the player
        startDist: 10000,   // Spawning distance
        attackRange: 1500,  // Range at which they start their attack animation
        damageMin: 25,
        damageMax: 100,
        walkPath: 'img/Figer Walking/Spritesheet/1024x1024/grok-video-c940ad13-8ea0-454d-8b91-76e181b1f208 (10)_1024x1024_sheet.png',
        deathPath: 'img/Figer Death/Spritesheet/512x512/Figer Death_512x512_sheet.png',
        attackPath: 'img/Fiyger Forward Attack/Spritesheet/512x512/Fiyger Forward Attack_512x512_sheet.png',
        walkFrames: 52, deathFrames: 145, attackFrames: 77,
        walkCols: 8, deathCols: 13, attackCols: 9,
        walkSize: 1024, deathSize: 512, attackSize: 512,
        walkAnimSpeed: 0.04, attackAnimSpeed: 4.0, deathAnimSpeed: 1.5,
        baseRotation: Math.PI, // Offset rotation (some sprites face the wrong way)
        isSideways: true       // Whether to use 'Flip' logic for left/right movement
    },
    GalaxyDragon: {
        count: 1800,
        size: 3200,
        healthMax: 50,
        moveSpeed: 12,
        spacing: 200,
        closestDist: 600,
        startDist: 12000,
        attackRange: 2000,
        damageMin: 10,
        damageMax: 30,
        walkPath: 'img/Enemies/Galaxy Dragon/Galaxy Dragon Flying Forward/Spritesheet/512x512/Galaxy Dragon Flying Forward_512x512_sheet.png',
        deathPath: 'img/Enemies/Galaxy Dragon/Galaxy Dragon Death/Spritesheet/512x512/Galaxy Dragon Death_512x512_sheet.png',
        attackPath: 'img/Enemies/Galaxy Dragon/Galaxy Dragon Attack/Spritesheet/512x512/Galaxy Dragon Attack_512x512_sheet.png',
        walkFrames: 53, deathFrames: 145, attackFrames: 13,
        walkCols: 8, deathCols: 13, attackCols: 4,
        walkSize: 512, deathSize: 512, attackSize: 512,
        walkAnimSpeed: 0.02, attackAnimSpeed: 1.0, deathAnimSpeed: 1.0,
        baseRotation: Math.PI / 2,
        isSideways: false
    },
    PhoenixSurrender: {
        count: 200,
        size: 3000,
        healthMax: 85,
        moveSpeed: 16,
        spacing: 180,
        closestDist: 500,
        startDist: 11000,
        attackRange: 1800,
        damageMin: 25,
        damageMax: 70,
        walkPath: 'img/Enemies/Phoenix Surrender/Surrender Flying Forward/Spritesheet/512x512/Surrender Flying Forward_512x512_sheet.png',
        deathPath: 'img/Enemies/Phoenix Surrender/Surrender Death/Spritesheet/512x512/Surrender Death_512x512_sheet.png',
        attackPath: 'img/Enemies/Phoenix Surrender/Surrender Attack/Spritesheet/512x512/Surrender Attack_512x512_sheet.png',
        walkFrames: 23, deathFrames: 145, attackFrames: 84,
        walkCols: 5, deathCols: 13, attackCols: 10,
        walkSize: 512, deathSize: 512, attackSize: 512,
        walkAnimSpeed: 0.03, attackAnimSpeed: 2.0, deathAnimSpeed: 1.5,
        baseRotation: Math.PI / 2,
        isSideways: false
    }
};

/**
 * WORLD / STAGE MAP
 * Dictates how stages are laid out and when players can progress.
 */
const STAGE_CONFIG = {
    // Kill requirements per stage
    MAX_KILLS: [0, 300, 500, 700, 900, 1100, 1300, 1500, 1700, 2000],
    GRID_SIZE: 150000, // Distance (in game units) between stage center points

    /**
     * CLOCKWISE STAGE GRID
     * Maps stage IDs to grid coordinates [X, Y].
     * Stage 1 is the center, Stage 2 is North, and they spiral outward.
     */
    CLOCKWISE_GRID: [
        [1, 1], // Stage 1 (Center)
        [1, 0], // Stage 2 (North)
        [2, 0], // Stage 3 (NE)
        [2, 1], // Stage 4 (East)
        [2, 2], // Stage 5 (SE)
        [1, 2], // Stage 6 (South)
        [0, 2], // Stage 7 (SW)
        [0, 1], // Stage 8 (West)
        [0, 0], // Stage 9 (NW)
        [1, 1], // Stage 10 (Final Boss back at Center)
    ]
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
 * The world is divided into a grid of 'cells'. Every frame, enemies are assigned
 * to a cell. This allows us to only check collisions/avoidance with nearby enemies,
 * turning a 4,000,000-check problem into a ~4,000-check problem (massive lag saver!).
 */
const GRID_CELL = 4800; // Size of one grid cell
const GRID_DIM = 400;   // Number of cells in each direction (400x400)
const GRID_WORLD_OFFSET = (GRID_DIM * GRID_CELL) / 2; // Offset to handle negative coords

/**
 * DATA STRIDE
 * We store all enemy data in a single Float32Array for maximum speed.
 * The 'STRIDE' is number of slots per enemy.
 * [0]x, [1]y, [2]vx, [3]vy, [4]rotation, [5]walkFrame, [6]moveSpeed, [7]lookAngle, 
 * [8]health, [9]deathFrame, [10]attackFrame, [11]typeIndex
 */
const STRIDE = 12;
