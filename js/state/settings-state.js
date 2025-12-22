/**
 * SETTINGS STATE MANAGEMENT
 * 
 * Central store for all user-configurable game options.
 * Handles persistence to localStorage.
 * 
 * LOCATED IN: js/state/settings-state.js
 */

const SettingsState = {
    // Default Configuration
    defaults: {
        damageNumbers: true,
        mouseEffects: true,
        lootStairs: true,
        healthBar: true,
        healthBar: true,
        healthBar: true,
        shieldBar: true,
        laserBar: true,
        bulletBar: true,
        enemyHp: true,
        damageFont: 'Orbitron', // 'Orbitron' or 'Tektur'
        trailLength: 6, // Range 2-10
        radarEnabled: true,
        radarRange: 60000,
        radarTheme: 'Cyber Blue'
    },

    // Current Active Settings
    current: {},

    /**
     * INITIALIZE SETTINGS
     * Loads from storage or applies defaults.
     */
    init() {
        console.log("[SETTINGS] Initializing State...");
        const stored = localStorage.getItem('GOD_RPG_SETTINGS');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure new keys exist
                this.current = { ...this.defaults, ...parsed };
            } catch (e) {
                console.error("Failed to parse settings, resetting.");
                this.current = { ...this.defaults };
            }
        } else {
            this.current = { ...this.defaults };
        }

        console.log("[SETTINGS] Loaded:", this.current);
    },

    /**
     * GET SETTING
     */
    get(key) {
        return this.current[key];
    },

    /**
     * SET SETTING
     * Updates value and persists to storage.
     */
    set(key, value) {
        if (key in this.current) {
            this.current[key] = value;
            this.save();

            // Trigger immediate updates if necessary
            this.applyImmediateChanges(key, value);
        }
    },

    /**
     * SAVE TO STORAGE
     */
    save() {
        localStorage.setItem('GOD_RPG_SETTINGS', JSON.stringify(this.current));
    },

    /**
     * APPLY IMMEDIATE SIDE EFFECTS
     * Some settings need to trigger logic right away (like hiding a bar).
     */
    applyImmediateChanges(key, value) {
        // MOUSE EFFECTS
        if (key === 'mouseEffects') {
            if (typeof CursorOverlaySystem !== 'undefined') {
                CursorOverlaySystem.active = value;
                // If turning off, clear canvas
                if (!value && CursorOverlaySystem.ctx && CursorOverlaySystem.canvas) {
                    CursorOverlaySystem.ctx.clearRect(0, 0, CursorOverlaySystem.canvas.width, CursorOverlaySystem.canvas.height);
                }
            }
        }

        // UI BARS (Health, Shield, EnemyHP)
        // These are handled by the UI Orchestrator usually on the next frame, 
        // but we can force a check or rely on the render loop reading this state.

        // LOOT STAIRS
        // Changing this just stops new ones from spawning. Existing ones might stay or be cleared.

        // RADAR
        if (key === 'radarEnabled') {
            if (typeof RadarSystem !== 'undefined') {
                RadarSystem.toggle(value);
            }
        }

        if (key === 'radarTheme') {
            if (typeof RadarSystem !== 'undefined') {
                RadarSystem.updateTheme(value);
            }
        }
    }
};

// Global Shortcut for easy access in other files
window.GAME_SETTINGS = SettingsState;
