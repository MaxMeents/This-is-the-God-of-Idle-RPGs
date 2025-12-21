/**
 * SKILLS CONFIGURATION
 * 
 * Defines the active skills available to the player, including their cooldowns,
 * damage multipliers, AOE ranges, and complex multi-part visual data.
 * 
 * LOCATED IN: js/core/config/skill-config.js
 */

const SKILLS = {
    /**
     * TIER 1 SKILL (Supernova)
     * Rapid circular solar flare expansion.
     */
    Tier1: {
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.webp',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.webp',
        buttonFrames: 121, buttonCols: 11, buttonSize: 768,
        skillFrames: 109, skillCols: 11, skillSize: 512,
        visualSize: 12000,
        orbitRadius: 10000,
        animSpeedButton: 0.9,
        animSpeedSkill: 2,
        cooldownTime: 25000,
        instanceCount: 22,   // Number of flame markers spawned in the ring
        damageMult: 100.0,
        aoeMult: 3.0,
        skillRange: 15000,
        rings: 25           // Sequence of expanding rings
    },

    /**
     * TIER 2 SKILL (Sustain Flare)
     * Moderate cooldown expansion.
     */
    Tier2: {
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.webp',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.webp',
        buttonFrames: 121, buttonCols: 11, buttonSize: 768,
        skillFrames: 109, skillCols: 11, skillSize: 512,
        visualSize: 9500,
        orbitRadius: 10000,
        animSpeedButton: 0.9,
        animSpeedSkill: 2,
        cooldownTime: 12000,
        instanceCount: 22,
        damageMult: 50.0,
        aoeMult: 1.75,
        skillRange: 12000,
        rings: 8
    },

    /**
     * TIER 3 SKILL (Core Pulsar)
     * Fast cooldown defense skill.
     */
    Tier3: {
        buttonSheet: 'img/Skills/Buttons/Multicolor X Flame Button/Spritesheet/768x768/Multicolor X Flame Button_768x768_sheet.webp',
        skillSheet: 'img/Skills/Multicolor X Flame/Spritesheet/512x512/Multicolor X Flame_512x512_sheet.webp',
        buttonFrames: 121, buttonCols: 11, buttonSize: 768,
        skillFrames: 109, skillCols: 11, skillSize: 512,
        visualSize: 8600,
        orbitRadius: 10000,
        animSpeedButton: 0.9,
        animSpeedSkill: 2,
        cooldownTime: 8000,
        instanceCount: 22,
        damageMult: 30.0,
        aoeMult: 1.25,
        skillRange: 10000,
        rings: 3
    },

    /**
     * SWORD OF LIGHT (Ultimate)
     * Spawns massive orbiting swords that deal destructive AOE damage.
     */
    SwordOfLight: {
        skillSheet: 'img/Skills/Sword of Light/Spritesheet/1024x1024/Sword of Light_1024x1024_sheet.webp',
        skillFrames: 16, skillCols: 4, skillSize: 1024,
        visualSize: 7000,   // Sprite scaling
        orbitRadius: 5000,  // Distance from ship center
        animSpeedSkill: 1.2,
        cooldownTime: 5000, // Recover in 5s
        duration: 2000,     // Stays active for 2s
        damageMult: 500.0,  // Massive damage multiplier
        aoeMult: 5.0,       // Large hit detection radius
        skillRange: 9000    // Area around each sword impacted
    }
};
