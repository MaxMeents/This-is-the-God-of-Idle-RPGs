/**
 * SKILLS SYSTEM
 * 
 * Handles the low-level data allocation for active skills when buttons are clicked.
 * Decouples skill logic from the main update tick.
 * 
 * LOCATED IN: js/systems/combat/skills-system.js
 * DEPENDS ON: js/core/config/skill-config.js
 */

/**
 * ACTIVATE SUPERNOVA
 * Triggers a sequence of expanding rings of flame.
 * 
 * @param {number} tier - Skill tier (1-3)
 */
function activateSupernova(tier = 1) {
    const tierKey = 'Tier' + tier;
    const cfg = SKILLS[tierKey];

    // Cooldown check (cooldowns managed in combat-core.js)
    if (skillCooldowns[tier - 1] > 0) return;
    skillCooldowns[tier - 1] = cfg.cooldownTime;

    /**
     * SPAWN RING HELPER
     * Local delay-based spawning to create the expansion effect.
     */
    const spawnRing = (count, radius, size, delay) => {
        setTimeout(() => {
            for (let i = 0; i < count; i++) {
                if (activeSkillCount >= totalSkillParticles) return;

                // DATA ALLOCATION (Floating Point Buffer)
                for (let j = 0; j < totalSkillParticles; j++) {
                    const idx = j * SKILL_STRIDE;
                    if (skillData[idx + 9] === 0) { // Active flag
                        skillData[idx] = (i / count) * Math.PI * 2; // Angle
                        skillData[idx + 1] = 0;      // Animation Frame
                        skillData[idx + 2] = radius; // Orbit distance
                        skillData[idx + 3] = size;   // Sprite scaling
                        skillData[idx + 4] = 0.02 + (Math.random() * 0.02); // Orbit Speed
                        skillData[idx + 5] = tier;   // Tier ID
                        skillData[idx + 6] = 0;      // Type (0: Supernova)
                        skillData[idx + 7] = 0;      // Elapsed time
                        skillData[idx + 8] = 0;      // Duration
                        skillData[idx + 9] = 1;      // ACTIVE

                        activeSkillIndices[activeSkillCount++] = j;
                        break;
                    }
                }
            }
        }, delay);
    };

    // CONSTRUCT FLAME RINGS
    const baseRadius = 1200;
    const baseSize = 1400;
    for (let r = 0; r < cfg.rings; r++) {
        const radius = baseRadius + (r * 1300);
        const size = baseSize + (r * 800);
        const count = 15 + (r * 3);
        const delay = r * 80;
        spawnRing(count, radius, size, delay);
    }
}

/**
 * ACTIVATE SWORD OF LIGHT (Ultimate)
 * Spawns 8 fixed orbiting swords that deal massive AOE.
 */
function activateSwordOfLight() {
    if (skillCooldowns[3] > 0) return;
    const cfg = SKILLS.SwordOfLight;
    skillCooldowns[3] = cfg.cooldownTime;

    // Fixed 8-point compass directions
    const dirs = [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4];

    dirs.forEach(angle => {
        if (activeSkillCount >= totalSkillParticles) return;

        for (let j = 0; j < totalSkillParticles; j++) {
            const idx = j * SKILL_STRIDE;
            if (skillData[idx + 9] === 0) {
                skillData[idx] = angle;
                skillData[idx + 1] = 0;
                skillData[idx + 2] = cfg.orbitRadius;
                skillData[idx + 3] = cfg.visualSize;
                skillData[idx + 4] = 0;      // Orbit Speed (Sword hangs in place)
                skillData[idx + 5] = 4;      // Tier (Alpha-equivalent)
                skillData[idx + 6] = 1;      // Type (1: SwordOfLight)
                skillData[idx + 7] = 0;      // Elapsed
                skillData[idx + 8] = cfg.duration;
                skillData[idx + 9] = 1;      // ACTIVE

                activeSkillIndices[activeSkillCount++] = j;
                break;
            }
        }
    });
}
