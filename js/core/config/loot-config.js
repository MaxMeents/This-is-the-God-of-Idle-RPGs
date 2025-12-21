/**
 * LOOT & DROPS CONFIGURATION
 * 
 * Central registry for all collectible items, their drop tables, 
 * and scaling multipliers for elite (tiered) enemy drops.
 * 
 * LOCATED IN: js/core/config/loot-config.js
 */

const LOOT_CONFIG = {
    MAX_HISTORY: 5, // Number of items shown in the "Stairs" overlay

    /**
     * ITEM DATABASE
     * All items that can be dropped by monsters or rewarded.
     */
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

    /**
     * TIER MULTIPLIERS
     * Elite enemies (higher tiers) drop more items and have significantly more health.
     */
    TIERS: [
        { id: 'normal', chanceMult: 1.0, amountMult: 1.0, healthMult: 1, sizeMult: 1 },
        { id: 'epic', chanceMult: 2.5, amountMult: 10.0, healthMult: 30, sizeMult: 5 },
        { id: 'god', chanceMult: 5.0, amountMult: 100.0, healthMult: 200, sizeMult: 8 },
        { id: 'alpha', chanceMult: 10.0, amountMult: 1000.0, healthMult: 1000, sizeMult: 12 },
        { id: 'omega', chanceMult: 25.0, amountMult: 10000.0, healthMult: 10000, sizeMult: 20 }
    ],

    /**
     * DROP TABLES
     * Maps enemy internal keys to the pool of items they can drop.
     */
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

    // Pooled drops for any enemy death
    GLOBAL_DROPS: ['Main Game Currency', 'Crystal']
};
