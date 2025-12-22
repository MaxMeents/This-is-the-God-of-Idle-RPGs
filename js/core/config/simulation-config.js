/**
 * TRAINING SIMULATION CONFIGURATION
 * GOD MODE EDITION
 * 
 * Defines the 500-level progression system, procedural naming, and difficulty modifiers.
 * difficulty curves are set to EXTREME for high tiers.
 */

const SIMULATION_CONFIG = {
    TOTAL_LEVELS: 500,
    SECTORS: 5, // 100 Levels per Sector
    LEVELS_PER_SECTOR: 100,

    // Difficulty Tiers (Aligned with Loot Ledger Logic)
    DIFFICULTY: [
        { id: 'normal', name: 'Standard', desc: 'Baseline Simulation', color: '#aaaaaa', hpMod: 1.0, dmgMod: 1.0, dropMod: 1.0 },
        { id: 'epic', name: 'Advanced', desc: 'Tactical Warfare', color: '#ffd700', hpMod: 10.0, dmgMod: 5.0, dropMod: 2.5 },
        { id: 'god', name: 'Nightmare', desc: 'IMPOSSIBLE', color: '#ff00ff', hpMod: 100.0, dmgMod: 25.0, dropMod: 5.0 },
        { id: 'alpha', name: 'Lethal', desc: 'EXTINCTION', color: '#00ffff', hpMod: 1000.0, dmgMod: 100.0, dropMod: 10.0 },
        { id: 'omega', name: 'Extinction', desc: 'REALITY COLLAPSE', color: '#ff0000', hpMod: 10000.0, dmgMod: 1000.0, dropMod: 25.0 }
    ],

    // Procedural Name Components (Thematic: God Training)
    KEYWORDS: {
        PREFIX: [
            "Initiate's", "Acolyte's", "Disciple's", "Zealot's", "Templar's",
            "Crusader's", "Paladin's", "Warlord's", "Imperator's", "Sovereign's",
            "Demigod's", "Divine", "Celestial", "Seraphic", "Astral",
            "Cosmic", "Infinite", "Omnipotent", "Transcendent", "Eternal"
        ],
        NOUN: [
            "Calibration", "Warmup", "Exercise", "Gauntlet", "Crucible",
            "Trial", "Judgement", "Penance", "Tribulation", "Ordeal",
            "Massacre", "Cataclysm", "Apocalypse", "Singularity", "Void",
            "Ascension", "Rebirth", "Genesis", "Revelation", "Absolution"
        ],
        SUFFIX: [
            "Alpha", "Beta", "Gamma", "Delta", "Epsilon",
            "Zeta", "Eta", "Theta", "Iota", "Kappa",
            "Lambda", "Mu", "Nu", "Xi", "Omicron",
            "Pi", "Rho", "Sigma", "Tau", "Omega"
        ]
    },

    // Fixed "Boss" levels every 50 stages
    BOSS_LEVELS: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500],

    // Procedural Generator
    generateLevels() {
        const levels = [];
        // Enemy Mapping aligned with actual asset keys found in asset-loader.js / enemies.js
        const enemies = ['GalaxyButterfly', 'BlueWhiteButterfly', 'GoldButterfly', 'GreenBlackButterfly', 'BlackRedButterfly', 'GalaxyDragon', 'BlueDragon', 'PhoenixSurrender'];

        for (let i = 1; i <= this.TOTAL_LEVELS; i++) {
            const sectorIdx = Math.floor((i - 1) / 100);

            // Generate Name
            const pIdx = Math.min(this.KEYWORDS.PREFIX.length - 1, Math.floor((i - 1) / 25));
            const nIdx = i % this.KEYWORDS.NOUN.length;
            const suffix = this.KEYWORDS.SUFFIX[i % this.KEYWORDS.SUFFIX.length];
            const name = `${this.KEYWORDS.PREFIX[pIdx]} ${this.KEYWORDS.NOUN[nIdx]} // ${suffix}`;

            // Determine Enemy Composition
            // Cycle through enemies based on 50-level blocks
            const enemyType = enemies[Math.floor((i - 1) / 20) % enemies.length];

            // Count scales with level
            const count = 5 + Math.floor(i * 0.5);

            // Calculate Base Drops based on LOOT_CONFIG
            // This relies on LOOT_CONFIG being loaded. 
            // We reference global LOOT_CONFIG if available, or just store keys.
            let potentialDrops = [];
            if (typeof LOOT_CONFIG !== 'undefined') {
                potentialDrops = (LOOT_CONFIG.ENEMY_DROPS[enemyType] || []).concat(LOOT_CONFIG.GLOBAL_DROPS);
            }

            levels.push({
                id: i,
                name: name,
                sector: sectorIdx + 1,
                enemies: { [enemyType]: count }, // Main enemy type + count
                potentialDrops: potentialDrops,
                powerLevel: i * 500 // Base DMG
            });
        }
        return levels;
    }
};
