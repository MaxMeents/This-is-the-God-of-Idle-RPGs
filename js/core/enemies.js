/**
 * ENEMY DEFINITIONS
 * Defines the stats and animation data for every enemy type in the game.
 * To add a new enemy, simply add an object here with the required paths and stats.
 */
const Enemy = {

    GalaxyDragon: {
        size: 3200,
        healthMax: 50,
        moveSpeed: 12,
        spacing: 200,
        closestDist: 600,
        startDist: 55000,
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
        size: 3000,
        healthMax: 85,
        moveSpeed: 16,
        spacing: 180,
        closestDist: 500,
        startDist: 50000,
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
    },
    BlueDragon: {
        size: 3500,
        healthMax: 120,
        moveSpeed: 14,
        spacing: 250,
        closestDist: 700,
        startDist: 60000,
        attackRange: 2200,
        damageMin: 40,
        damageMax: 90,
        walkPath: 'img/Enemies/Blue Dragon/Blue Dragon Flying Forward/Spritesheet/1024x1024/Blue Dragon Flying Forward_1024x1024_sheet.png',
        deathPath: 'img/Enemies/Blue Dragon/Blue Dragon Death/Spritesheet/512x512/Blue Dragon Death_512x512_sheet.png',
        attackPath: 'img/Enemies/Blue Dragon/Blue Dragon Attack/Spritesheet/512x512/Blue Dragon Attack_512x512_sheet.png',
        walkFrames: 32, deathFrames: 138, attackFrames: 90,
        walkCols: 6, deathCols: 12, attackCols: 10,
        walkSize: 1024, deathSize: 512, attackSize: 512,
        walkAnimSpeed: 0.025, attackAnimSpeed: 1.8, deathAnimSpeed: 1.2,
        baseRotation: Math.PI / 2,
        isSideways: false
    }
};
