const PERFORMANCE = {
    LOD_TIERS: [
        { id: 'Ultra', size: 1024, max: 10 },
        { id: 'High', size: 1024, max: 20 },
        { id: 'MidHigh', size: 768, max: 30 },
        { id: 'Med', size: 512, max: 60 },
        { id: 'MedLow', size: 256, max: 200 },
        { id: 'Low', size: 128, max: 500 },
        { id: 'VLow', size: 64, max: 1000 },
        { id: 'Tiny', size: 32, max: 2000 },
        { id: 'Micro', size: 16, max: 3333 }
    ],
    LOD_INIT_TIME_SLICE: 1,
    SPAWNS_PER_FRAME: 50,
    GAME_SPEED: 1.0
};

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

const Enemy = {
    Tiyger: {
        count: 0,
        size: 2500,
        healthMax: 35,
        moveSpeed: 15,
        spacing: 120,
        closestDist: 400,
        startDist: 10000,
        attackRange: 1500,
        damageMin: 25,
        damageMax: 100,
        walkPath: 'img/Figer Walking/Spritesheet/1024x1024/grok-video-c940ad13-8ea0-454d-8b91-76e181b1f208 (10)_1024x1024_sheet.png',
        deathPath: 'img/Figer Death/Spritesheet/512x512/Figer Death_512x512_sheet.png',
        attackPath: 'img/Fiyger Forward Attack/Spritesheet/512x512/Fiyger Forward Attack_512x512_sheet.png',
        walkFrames: 52, deathFrames: 145, attackFrames: 77,
        walkCols: 8, deathCols: 13, attackCols: 9,
        walkSize: 1024, deathSize: 512, attackSize: 512,
        walkAnimSpeed: 0.04, attackAnimSpeed: 4.0, deathAnimSpeed: 1.5,
        baseRotation: Math.PI,
        isSideways: true
    },
    GalaxyDragon: {
        count: 2000,
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
    }
};

const STAGE_CONFIG = {
    // Stage counts
    MAX_KILLS: [0, 300, 500, 700, 900, 1100, 1300, 1500, 1700, 2000],
    GRID_SIZE: 150000, // Distance between stage centers
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
        [1, 1], // Stage 10 (Final Boss at Center)
    ]
};

const FLOOR_PATH = 'img/Texture Floor/maxmaxmax_333_Ocean_temple_floor_tile_design_wave_patterns_biol_31b2bdc2-1580-4081-86b9-2f7b711e9005_1.png';
const PLAYER_HEALTH_MAX = 35000;
const MIN_ZOOM = 0.0001;
const MAX_ZOOM = 2590.0;
const DAMAGE_PER_POP = 10;
const DAMAGE_INTERVAL = 100;
const AOE_RADIUS = 900;
const PLAYER_SPEED = 20;
const GRID_CELL = 4800;
const GRID_DIM = 400;
const STRIDE = 12; // x, y, vx, vy, rot, frame, speed, look, health, deathFrame, attackFrame, typeIndex
