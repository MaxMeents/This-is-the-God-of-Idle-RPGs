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
        { id: 'normal', name: 'Standard', desc: 'Baseline Simulation', color: '#aaaaaa' },
        { id: 'epic', name: 'Arch', desc: 'Tactical Warfare', color: '#ffd700' },
        { id: 'god', name: 'Nightmare', desc: 'IMPOSSIBLE', color: '#ff00ff' },
        { id: 'alpha', name: 'Lethal', desc: 'EXTINCTION', color: '#00ffff' },
        { id: 'omega', name: 'Extinction', desc: 'REALITY COLLAPSE', color: '#ff0000' }
    ],

    /**
     * MASTER SCALING LOGIC (The "2500 Level" Rule)
     * Calculates the true power of a scenario based on (TierIndex * 500) + LevelID.
     */
    getStatScale(levelId, tierIndex) {
        const globalId = (tierIndex * 500) + levelId;

        // 1. DIFFICULTY DELTA: 1.2x delta between each difficulty level index
        let factor = Math.pow(1.2, globalId);

        // 2. EXPONENTIAL HURDLES (Milestones)
        // Multiples of 100: 25x
        // Multiples of 25: 10x
        // Multiples of 10: 5x
        // Multiples of 5: 2x
        // and so on...
        if (globalId % 2500 === 0) factor *= 500;
        else if (globalId % 1000 === 0) factor *= 250;
        else if (globalId % 500 === 0) factor *= 100;
        else if (globalId % 250 === 0) factor *= 50;
        else if (globalId % 100 === 0) factor *= 25;
        else if (globalId % 25 === 0) factor *= 10;
        else if (globalId % 10 === 0) factor *= 5;
        else if (globalId % 5 === 0) factor *= 2;

        return factor;
    },

    /**
     * REWARD SCALING
     * Calculates the drop multiplier based on the stat scale.
     */
    getRewardScale(levelId, tierIndex) {
        const statsScale = this.getStatScale(levelId, tierIndex);
        // Logarithmic scaling for rewards: 1 + log10(scale + 1) * 2
        return 1.0 + (Math.log10(statsScale + 1) * 2);
    },

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
        const enemies = ['GalaxyButterfly', 'BlueWhiteButterfly', 'GoldButterfly', 'GreenBlackButterfly', 'BlackRedButterfly', 'GalaxyDragon', 'BlueDragon', 'PhoenixSurrender'];

        for (let i = 1; i <= this.TOTAL_LEVELS; i++) {
            const sectorIdx = Math.floor((i - 1) / 100);

            // Archetype logic
            let archetype = 'mixed';
            if (i % 10 === 0) archetype = 'titan';
            else if (i % 5 === 0) archetype = 'swarm';

            let levelEnemies = {};
            let archetypePrefix = "";

            if (archetype === 'titan') {
                const dragon = enemies[5 + (i % 3)]; // Pick a Dragon
                levelEnemies[dragon] = 1;
                archetypePrefix = "Titan ";
            } else if (archetype === 'swarm') {
                const butterfly = enemies[i % 5]; // Pick a Butterfly
                levelEnemies[butterfly] = 50 + (i * 2);
                archetypePrefix = "Swarm ";
            } else {
                const e1 = enemies[i % enemies.length];
                const e2 = enemies[(i + 3) % enemies.length];
                levelEnemies[e1] = 10 + Math.floor(i * 0.5);
                levelEnemies[e2] = 5 + Math.floor(i * 0.2);
            }

            // Generate Name
            const pIdx = Math.min(this.KEYWORDS.PREFIX.length - 1, Math.floor((i - 1) / 25));
            const nIdx = i % this.KEYWORDS.NOUN.length;
            const suffix = this.KEYWORDS.SUFFIX[i % this.KEYWORDS.SUFFIX.length];
            const name = `${archetypePrefix}${this.KEYWORDS.PREFIX[pIdx]} ${this.KEYWORDS.NOUN[nIdx]} // ${suffix}`;

            // Calculate Base Drops
            let potentialDrops = [];
            const mainEnemy = Object.keys(levelEnemies)[0];
            if (typeof LOOT_CONFIG !== 'undefined') {
                potentialDrops = (LOOT_CONFIG.ENEMY_DROPS[mainEnemy] || []).slice(0, 3).concat(LOOT_CONFIG.GLOBAL_DROPS.slice(0, 2));
            }

            // Calculate total enemy count for this level
            const totalEnemies = Object.values(levelEnemies).reduce((sum, count) => sum + count, 0);

            levels.push({
                id: i,
                name: name,
                sector: sectorIdx + 1,
                enemies: levelEnemies,
                kills: totalEnemies, // Total enemies = kill requirement
                potentialDrops: potentialDrops,
                powerLevel: i * 500
            });
        }
        return levels;
    }
};
