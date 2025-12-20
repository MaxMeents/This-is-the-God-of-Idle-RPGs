/**
 * ENEMY DEFINITIONS
 * Defines the stats and animation data for every enemy type in the game.
 * To add a new enemy, simply add an object here with the required paths and stats.
 */
const Enemy = {

    GalaxyDragon: {
        size: 3200,
        healthMax: 50,
        moveSpeed: 18,
        archMoveSpeed: 17,
        spacing: 200,
        startDist: 50000,
        attackRange: 5000,  // Distance to maintain from ship
        archAttackRange: 10000,  // Arch enemies stay farther away
        damageMin: 10,
        damageMax: 30,
        walkPath: 'img/Enemies/Galaxy Dragon/Galaxy Dragon Flying Forward/Spritesheet/512x512/Galaxy Dragon Flying Forward_512x512_sheet.png',
        deathPath: 'img/Enemies/Galaxy Dragon/Galaxy Dragon Death/Spritesheet/512x512/Galaxy Dragon Death_512x512_sheet.png',
        attackPath: 'img/Enemies/Galaxy Dragon/Galaxy Dragon Attack/Spritesheet/512x512/Galaxy Dragon Attack_512x512_sheet.png',
        walkFrames: 53, deathFrames: 145, attackFrames: 13,
        walkCols: 8, deathCols: 13, attackCols: 4,
        walkSize: 512, deathSize: 512, attackSize: 512,
        walkAnimSpeed: 0.02, attackAnimSpeed: 1.0, deathAnimSpeed: 1.0,
        archWalkAnimSpeed: 0.05, archAttackAnimSpeed: 2.5, archDeathAnimSpeed: 2.5,
        baseRotation: Math.PI / 2,
        isSideways: false,
        archChance: 1 / 50,  // 2% chance to spawn as Arch (30x HP, 5x size)
        enemyType: 'Dragon',  // Used for charge attack behavior
        chargeSpeed: 250,  // Speed when charging through ship
        archChargeSpeed: 500,  // Arch enemies charge faster
        chargeDistanceMult: 1.5,  // Charge to 25x attackRange on opposite side
        archChargeDistanceMult: 2  // Arch enemies charge 2x farther
    },
    PhoenixSurrender: {
        size: 3000,
        healthMax: 85,
        moveSpeed: 16,
        archMoveSpeed: 32,  // Arch enemies move faster
        spacing: 180,
        startDist: 50000,
        attackRange: 9000,  // Distance to maintain from ship
        archAttackRange: 18000,  // Arch enemies stay farther away
        damageMin: 25,
        damageMax: 70,
        walkPath: 'img/Enemies/Phoenix Surrender/Surrender Flying Forward/Spritesheet/512x512/Surrender Flying Forward_512x512_sheet.png',
        deathPath: 'img/Enemies/Phoenix Surrender/Surrender Death/Spritesheet/512x512/Surrender Death_512x512_sheet.png',
        attackPath: 'img/Enemies/Phoenix Surrender/Surrender Attack/Spritesheet/512x512/Surrender Attack_512x512_sheet.png',
        walkFrames: 23, deathFrames: 145, attackFrames: 84,
        walkCols: 5, deathCols: 13, attackCols: 10,
        walkSize: 512, deathSize: 512, attackSize: 512,
        walkAnimSpeed: 0.03, attackAnimSpeed: 2.0, deathAnimSpeed: 1.5,
        archWalkAnimSpeed: 0.075, archAttackAnimSpeed: 5.0, archDeathAnimSpeed: 3.75,
        baseRotation: Math.PI / 2,
        isSideways: false,
        archChance: 1 / 50,  // 2% chance to spawn as Arch (30x HP, 5x size)
        enemyType: 'Phoenix',  // Used for charge attack behavior
        chargeSpeed: 300,  // Speed when charging through ship
        archChargeSpeed: 600,  // Arch enemies charge faster
        chargeDistanceMult: 1.5,  // Charge to 25x attackRange on opposite side
        archChargeDistanceMult: 2  // Arch enemies charge 2x farther
    },
    BlueDragon: {
        size: 3500,
        healthMax: 120,
        moveSpeed: 14,
        archMoveSpeed: 28,  // Arch enemies move faster
        spacing: 250,
        startDist: 60000,
        attackRange: 2200,  // Distance to maintain from ship
        archAttackRange: 4400,  // Arch enemies stay farther away
        damageMin: 40,
        damageMax: 90,
        walkPath: 'img/Enemies/Blue Dragon/Blue Dragon Flying Forward/Spritesheet/1024x1024/Blue Dragon Flying Forward_1024x1024_sheet.png',
        deathPath: 'img/Enemies/Blue Dragon/Blue Dragon Death/Spritesheet/512x512/Blue Dragon Death_512x512_sheet.png',
        attackPath: 'img/Enemies/Blue Dragon/Blue Dragon Attack/Spritesheet/512x512/Blue Dragon Attack_512x512_sheet.png',
        walkFrames: 32, deathFrames: 138, attackFrames: 90,
        walkCols: 6, deathCols: 12, attackCols: 10,
        walkSize: 1024, deathSize: 512, attackSize: 512,
        walkAnimSpeed: 0.025, attackAnimSpeed: 1.8, deathAnimSpeed: 1.2,
        archWalkAnimSpeed: 0.0625, archAttackAnimSpeed: 4.5, archDeathAnimSpeed: 3.0,
        baseRotation: Math.PI / 2,
        isSideways: false,
        archChance: 1 / 50,  // 2% chance to spawn as Arch (30x HP, 5x size)
        enemyType: 'Dragon',  // Used for charge attack behavior
        chargeSpeed: 200,  // Speed when charging through ship
        archChargeSpeed: 400,  // Arch enemies charge faster
        chargeDistanceMult: 25,  // Charge to 25x attackRange on opposite side
        archChargeDistanceMult: 50  // Arch enemies charge 2x farther
    }
};
