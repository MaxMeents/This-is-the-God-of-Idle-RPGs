/**
 * COMBAT & CRIT CONFIGURATION
 * 
 * Defines the damage calculation rules, crit probabilities, 
 * and visual metadata for damage numbers and lucky hits.
 * 
 * LOCATED IN: js/core/config/combat-config.js
 */

const CRIT_CONFIG = {
    // TIERED RECURSION RULES
    BASE_CHANCE: 0.75,      // 75% for first crit level (Always starts with Arch)
    RECURSIVE_CHANCE: 0.05, // 5% chance to "ascend" to the next crit tier

    /**
     * TIER VISUALS
     * Colors used for the damage number pops.
     */
    TIER_COLORS: [
        0xffffff, // 0: Normal (White)
        0x00ffff, // 1: Arch (Cyan/Blue)
        0xffd700, // 2: God (Gold/Rainbow)
        0xff0000, // 3: Omega (Red/Omega)
        0xff00ff  // 4: Alpha (Magenta/Alpha) - HIGHEST
    ],

    // LABEL PREFIXES
    TIER_PREFIXES: ["", "CRIT", "GODLY CRIT", "OMEGA CRIT", "ALPHA CRIT"],
    LUCKY_PREFIXES: ["LUCKY", "LUCKY CRIT", "LUCKY GODLY CRIT", "LUCKY OMEGA CRIT", "LUCKY ALPHA CRIT"],

    // POWER SCALING
    MULTIPLIERS: [1, 2, 4, 8, 16] // Each crit tier doubles the damage of the previous
};

/**
 * COMBAT ENGINE CONSTANTS
 */
const DAMAGE_PER_POP = 10;     // Number of damage instances tracked in pool
const DAMAGE_INTERVAL = 100;   // ms between sustained damage ticks (AOE)
const AOE_RADIUS = 900;        // Base "Touch" damage radius around player
const LUCKY_HIT_CHANCE = 0.1;  // 10% chance for a Lucky Hit (Double Drops/Shimmer)
