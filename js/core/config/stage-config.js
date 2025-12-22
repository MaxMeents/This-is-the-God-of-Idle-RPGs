/**
 * STAGE & WORLD CONFIGURATION
 * 
 * Defines the progression path for the game, including kill requirements,
 * enemy variety per stage, and the likelihood of encountering elite (Tiered) enemies.
 * 
 * LOCATED IN: js/core/config/stage-config.js
 */

const STAGE_CONFIG = {
    // PHYSICS BOUNDARIES
    GRID_SIZE: 150000,   // Total world bounds

    // NAVIGATION PATH (Clockwise loop coordinates)
    CLOCKWISE_GRID: [
        [1, 1], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [0, 0], [1, 1]
    ],

    /**
     * STAGE DEFINITIONS
     * Each index corresponds to a game stage (1-10).
     */
    STAGES: {
        1: {
            kills: 300,
            enemies: {
                GalaxyDragon: 40,
                PhoenixSurrender: 40,
                BlueDragon: 40,
                BlackRedButterfly: 40,
                BlueWhiteButterfly: 40,
                GoldButterfly: 40,
                GreenBlackButterfly: 30,
                GalaxyButterfly: 30
            },
            tierChances: { Arch: 0.05, God: 0.005, Omega: 0.001, Alpha: 0.0 } // Low chance for > ARC
        },
        2: {
            kills: 500,
            enemies: { PhoenixSurrender: 200, GalaxyDragon: 300 },
            tierChances: { Arch: 0.03, God: 0.03, Omega: 0.0, Alpha: 0.0 }
        },
        3: {
            kills: 700,
            enemies: { GalaxyDragon: 500, BlueDragon: 100 },
            tierChances: { Arch: 0.04, God: 0.04, Omega: 0.0, Alpha: 0.0 }
        },
        4: {
            kills: 900,
            enemies: { GalaxyDragon: 600, PhoenixSurrender: 200, GalaxyButterfly: 200 },
            tierChances: { Arch: 0.05, God: 0.05, Omega: 0.0, Alpha: 0.0 }
        },
        5: {
            kills: 1100,
            enemies: { BlueDragon: 400, PhoenixSurrender: 400, BlackRedButterfly: 300, BlueWhiteButterfly: 300 },
            tierChances: { Arch: 0.06, God: 0.06, Omega: 0.0, Alpha: 0.0 }
        },
        6: {
            kills: 1300,
            enemies: { BlueDragon: 600, PhoenixSurrender: 400, GoldButterfly: 400, GreenBlackButterfly: 400 },
            tierChances: { Arch: 0.07, God: 0.07, Omega: 0.0, Alpha: 0.0 }
        },
        7: {
            kills: 1500,
            enemies: { GalaxyDragon: 800, PhoenixSurrender: 500, GalaxyButterfly: 500 },
            tierChances: { Arch: 0.08, God: 0.08, Omega: 0.0, Alpha: 0.0 }
        },
        8: {
            kills: 1700,
            enemies: { BlueDragon: 800, GalaxyDragon: 500, BlackRedButterfly: 400, BlueWhiteButterfly: 400 },
            tierChances: { Arch: 0.09, God: 0.09, Omega: 0.0, Alpha: 0.0 }
        },
        9: {
            kills: 2000,
            enemies: { PhoenixSurrender: 800, BlueDragon: 1000, GoldButterfly: 500, GreenBlackButterfly: 500 },
            tierChances: { Arch: 0.10, God: 0.10, Omega: 0.0, Alpha: 0.0 }
        },
        10: {
            kills: 1,
            enemies: { PhoenixSurrender: 1500, BlueDragon: 1500, GalaxyButterfly: 1000 },
            tierChances: { Arch: 0.15, God: 0.15, Omega: 0.0, Alpha: 0.0 }
        }
    }
};
