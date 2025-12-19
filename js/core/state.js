// Game State
let killCount = 0;
let stageKillCount = 0;
let currentStage = 1;
let highestStageCleared = 0;
let isTraveling = false;
let travelTargetX = 0;
let travelTargetY = 0;
let bossMode = false;

// Entities
const enemyKeys = Object.keys(Enemy);
const totalEnemies = enemyKeys.reduce((sum, key) => sum + Enemy[key].count, 0);
const data = new Float32Array(totalEnemies * STRIDE);
const spawnList = [];
let spawnIndex = 0;

// Player
const player = {
    x: 0,
    y: 0,
    rotation: -Math.PI / 2,
    shipFrame: 0,
    shipState: 'IDLE',
    targetIdx: -1,
    lastDamageTime: 0,
    health: PLAYER_HEALTH_MAX,
    shieldHP: 0,
    shieldMaxHP: PLAYER_HEALTH_MAX * SHIP_CONFIG.shieldMaxHealthMult,
    shieldActive: false,
    shieldCooldownRemaining: 0,
    shieldDurationRemaining: 0,
    shieldAnimState: 'OFF', // OFF, TURNING_ON, ON
    shieldFrame: 0,
    lastTargetTime: 0
};

// Skills
const activeSkills = [];
let skillCooldownRemaining = 0;

// Damage Numbers
const damageNumbers = []; // {x, y, val, life, vx, vy}

// Spatial Grid
const heads = new Int32Array(GRID_DIM * GRID_DIM).fill(-1);
const next = new Int32Array(totalEnemies);
const occupiedCells = new Int32Array(GRID_DIM * GRID_DIM);
let occupiedCount = 0;

// Rendering State
let zoom = 0.05;
let targetZoom = 0.05;
let smoothedEnemies = 0;
let onScreenCount = 0;
let readyMapDirty = true;

// Performance Logging
let workerTasksCount = 0;
let loadedCt = 0;
