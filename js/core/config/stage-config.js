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
            kills: 3500, // Total kills needed to clear
            enemies: { BlueDragon: 1000, GalaxyDragon: 1000, PhoenixSurrender: 1500 },
            tierChances: { epic: 0.02, god: 0.02, omega: 0.02, alpha: 0.02 } // Base % for elites
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
};
