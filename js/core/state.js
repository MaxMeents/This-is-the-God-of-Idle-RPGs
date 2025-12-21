/**
 * GAME PROGRESSION STATE
 * Tracks current world level, kill counts, and travel status.
 */
let killCount = 0;             // Total enemies defeated ever
let stageKillCount = 0;        // Enemies defeated on the current stage
let currentStage = 1;          // Current active stage ID
let highestStageCleared = 0;   // Controls unlocking of navigational arrows
let isTraveling = false;       // When true, movement and combat are paused/redirected
let travelTargetX = 0;         // Target world coordinates for stage transition
let travelTargetY = 0;
let bossMode = false;          // True if the current stage is a boss stage
let gamePaused = true;         // Simulation state controller

/**
 * GLOBAL GAME STATE (Explicitly Exposed via window)
 * -------------------------------------------------------------------------
 * To ensure absolute modular stability, we attach these variables to the 
 * window object. This fulfills the requirement of making data accessible 
 * across boundaries without changing function logic.
 * -------------------------------------------------------------------------
 */
window.autoSkills = true;      // Controls automated skill activation
window.workerTasksCount = 0;   // Active worker threads
window.loadedCt = 0;           // Assets downloaded
window.conversionCt = 0;       // Images converted to bitmaps
window.prewarmCt = 0;          // Textures uploaded to GPU
window.bakesCt = 0;            // Total successful bakes
window.isPriorityDone = false; // Loading threshold flag

/**
 * CAMERA & ZOOM STATE (Shared via window)
 * -------------------------------------------------------------------------
 * CRITICAL ARCHITECTURAL NOTE:
 * These variables MUST be pinned to the 'window' object. 
 * 
 * WHY? 
 * The project uses a modular script loading pattern (index.html). If these are 
 * declared as local 'let' variables, they become shadowed or inaccessible 
 * across boundaries. 
 * 
 * 1. window.targetZoom is updated by index.js in the 'wheel' listener.
 * 2. window.zoom is interpolated in combat-core.js.
 * 3. window.zoom is consumed by pixi-renderer.js for camera scaling.
 * 
 * IF YOU CHANGE THESE TO LOCAL VARIABLES, THE MOUSE WHEEL WILL BREAK.
 * -------------------------------------------------------------------------
 */
window.zoom = 0.05;
window.targetZoom = 0.05;

/**
 * ENTITY DATA (HIGH PERFORMANCE FLAT BUFFERS)
 */
const enemyKeys = Object.keys(Enemy);
const allConfigs = enemyKeys.map(k => Enemy[k]); // Cache configs for direct indexing

// totalEnemies: The fixed capacity of the physics engine
const totalEnemies = 15000;

/**
 * DATA BUFFER
 * This single array contains EVERY enemy's position, health, and frame.
 * To find an enemy's X position: data[enemyIndex * STRIDE]
 */
const data = new Float32Array(totalEnemies * STRIDE);

const spawnList = []; // Ordered list of enemy names to spawn (ensures specific proportions)
let spawnIndex = 0;   // Tracks how many enemies from the pool are currently 'alive' in the world

/**
 * PLAYER STATE
 */
const player = {
    x: 0,
    y: 0,
    rotation: -Math.PI / 2,
    shipFrame: 0,
    shipState: 'IDLE',   // IDLE, THRUST, or FULL
    targetIdx: -1,       // The index of the enemy currently being targeted
    lastDamageTime: 0,
    health: PLAYER_HEALTH_MAX,
    shieldHP: 0,
    shieldMaxHP: PLAYER_HEALTH_MAX * SHIP_CONFIG.shieldMaxHealthMult,
    shieldActive: false,
    shieldCooldownRemaining: 0,
    shieldDurationRemaining: 0,
    shieldAnimState: 'OFF', // OFF, TURNING_ON, or ON (Controls the sprite sheet)
    shieldFrame: 0,
    lastTargetTime: 0
};

// Ability State
// Ability State (High Performance)
const SKILL_STRIDE = 10; // [angle, frame, radius, size, orbitSpd, tier, type, elapsed, duration, active]
const totalSkillParticles = 4000;
const skillData = new Float32Array(totalSkillParticles * SKILL_STRIDE);
const activeSkillIndices = new Uint16Array(totalSkillParticles);
let activeSkillCount = 0;
let skillCooldowns = [0, 0, 0, 0]; // Cooldowns for Tier 1, 2, 3, 4

// Bullet State (High Performance)
const BULLET_STRIDE = 8; // [x, y, vx, vy, life, active, type, penetration]
const totalBullets = 2000;
const bulletData = new Float32Array(totalBullets * BULLET_STRIDE);
const activeBulletIndices = new Int32Array(totalBullets);
let activeBulletCount = 0;
let weaponTimers = { bullet_left_side: 0, bullet_right_side: 0, laser: 0 };
let weaponAmmo = {
    bullet_left_side: WEAPON_CONFIG.bullet_left_side.maxAmmo,
    bullet_right_side: WEAPON_CONFIG.bullet_right_side.maxAmmo,
    laser: WEAPON_CONFIG.laser.maxAmmo
};
let weaponRechargeMode = {
    bullet_left_side: false,
    bullet_right_side: false,
    laser: false
};

// Damage Numbers Pool (Prevents Garbage Collection lag)
const DAMAGE_POOL_SIZE = 1000;
const damageNumbers = Array.from({ length: DAMAGE_POOL_SIZE }, () => ({
    x: 0, y: 0, val: 0, life: 0, vx: 0, vy: 0, active: false, isLucky: false, critTier: 0
}));
const activeDamageIndices = new Int32Array(DAMAGE_POOL_SIZE);
let activeDamageCount = 0;

// Effects Pool (High Performance Particles)
const FX_STRIDE = 8; // [x, y, vx, vy, life, type, frame, size]
const MAX_FX = 2000;
const fxData = new Float32Array(MAX_FX * FX_STRIDE);
const activeFxIndices = new Int32Array(MAX_FX);
let activeFxCount = 0;

/**
 * SPATIAL GRID STATE (Linked-List Grid)
 * This is the 'Secret Sauce' for 60FPS with thousands of enemies.
 * 'heads' stores the index of the first enemy in each grid cell.
 * 'next' allows us to follow a chain to the next enemy in that same cell.
 */
const heads = new Int32Array(GRID_DIM * GRID_DIM).fill(-1);
const next = new Int32Array(totalEnemies);
const occupiedCells = new Int32Array(GRID_DIM * GRID_DIM); // Optimized cleanup list
let occupiedCount = 0;

/**
 * RENDERING STATE (PixiJS)
 */
let app;
let worldContainer, enemyContainer, bulletContainer, fxContainer, playerContainer, uiContainer;
let smoothedEnemies = 0;  // Lag-capping value to smoothly transition LOD levels
let onScreenCount = 0;    // Number of enemies currently within the camera view
let readyMapDirty = true; // Flag for rebuilding the sprite caches if assets change

/**
 * PERFORMANCE MONITORING & LOADING STATE
 * initialized in index.html head
 */
