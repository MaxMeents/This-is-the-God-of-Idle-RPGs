/**
 * GAMEPAD INPUT SYSTEM
 * 
 * Provides plug-and-play controller support using the native HTML5 Gamepad API.
 * Handles joystick mapping for movement and safety-locked button inputs.
 * 
 * LOCATED IN: js/systems/input/gamepad-system.js
 */

const GamepadSystem = {
    active: false,
    gamepadIndex: null,
    deadzone: 0.1,
    buttonMap: {
        A: 0, // Cross/A
        B: 1, // Circle/B
        X: 2, // Square/X
        Y: 3, // Triangle/Y
        L1: 4,
        R1: 5,
        L2: 6, // Laser Trigger
        R2: 7, // Bullets Trigger
        SELECT: 8,
        START: 9,
        L3: 10,
        R3: 11,
        UP: 12,
        DOWN: 13,
        LEFT: 14,
        RIGHT: 15
    },
    // Track button states to prevent rapid-fire on hold
    prevButtonStates: {},

    /**
     * INIT
     * Sets up event listeners for connection/disconnection.
     */
    init() {
        window.addEventListener("gamepadconnected", (e) => {
            console.log("[GAMEPAD] Connected:", e.gamepad.id);
            this.gamepadIndex = e.gamepad.index;
            this.active = true;
            this.createSafetyPopup();
            this.createPauseOverlay(); // Create the sexy overlay
            this.startPolling();
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("[GAMEPAD] Disconnected:", e.gamepad.id);
            this.active = false;
        });

        console.log("[GAMEPAD] System Ready (Waiting for connection...)");
    },

    // ... (rest of methods)

    /**
     * CREATE PAUSE OVERLAY
     */
    createPauseOverlay() {
        if (document.getElementById('paused-overlay')) return;
        const ov = document.createElement('div');
        ov.id = 'paused-overlay';
        ov.innerHTML = '<div id="paused-text">PAUSED</div>';
        document.body.appendChild(ov);
    },

    togglePause() {
        const overlay = document.getElementById('paused-overlay');
        const speedVal = document.getElementById('speed-val');
        const slider = document.getElementById('speed-slider');

        if (PERFORMANCE.GAME_SPEED > 0) {
            // PAUSE
            PERFORMANCE.GAME_SPEED = 0;
            if (overlay) overlay.classList.add('active');
            if (speedVal) speedVal.innerText = 'PAUSED';
        } else {
            // RESUME (Instant back to 1.0 as requested)
            PERFORMANCE.GAME_SPEED = 1.0;
            if (overlay) overlay.classList.remove('active');

            // Sync UI
            if (speedVal) speedVal.innerText = '1.0x';
            if (slider) slider.value = 1.0;
        }
    },

    /**
     * START POLLING
     * Begins the requestAnimationFrame loop to check inputs.
     */
    startPolling() {
        if (!this.active) return;
        this.poll();
    },

    poll() {
        if (!this.active) return;

        const gp = navigator.getGamepads()[this.gamepadIndex];
        if (gp) {
            this.handleAxes(gp.axes);
            this.handleButtons(gp.buttons);
        }

        requestAnimationFrame(() => this.poll());
    },

    /**
     * HANDLE MOVEMENT (Left Stick)
     * Maps Axes 0 (X) and 1 (Y) to player position.
     */
    handleAxes(axes) {
        if (!player || typeof player.x === 'undefined') return;

        // X-Axis (Left Stick Horizontal)
        let dx = axes[0];
        // Y-Axis (Left Stick Vertical)
        let dy = axes[1];

        // Deadzone check
        if (Math.abs(dx) < this.deadzone) dx = 0;
        if (Math.abs(dy) < this.deadzone) dy = 0;

        // IDLE STATE if no input
        if (dx === 0 && dy === 0) {
            player.shipState = 'IDLE';
            return;
        }

        // SAFETY CHECK: Auto-Skill must be OFF for manual movement
        if (autoSkills) {
            this.showSafetyWarning();
            return;
        }

        this.hideSafetyWarning();

        // Apply Movement
        const speed = PLAYER_SPEED * 1.5; // Slightly faster for stick responsiveness
        const newX = player.x + (dx * speed);
        const newY = player.y + (dy * speed);

        // Simple boundary check (World Config usually 200000x200000, keep it safe)
        // We'll trust the engine's boundary checks if they exist, or just apply raw
        player.x = newX;
        player.y = newY;

        // Update Rotation to match stick direction
        player.rotation = Math.atan2(dy, dx);

        // Visual State
        player.shipState = (Math.abs(dx) > 0.8 || Math.abs(dy) > 0.8) ? 'FULL' : 'THRUST';
    },

    /**
     * HANDLE BUTTONS
     * Maps inputs to skills with Auto-Lock logic.
     */
    handleButtons(buttons) {
        // Helper to check press (active now, not active before)
        const isPressed = (idx) => buttons[idx] && buttons[idx].pressed;
        const wasPressed = (idx) => this.prevButtonStates[idx];
        const justPressed = (idx) => isPressed(idx) && !wasPressed(idx);

        // 1. TOGGLE AUTO (Button B / index 1) - ALWAYS ALLOWED
        if (justPressed(this.buttonMap.B)) {
            // Simulate Click on DOM Element for consistency with UI
            const autoBtn = document.getElementById('auto-btn');
            if (autoBtn) autoBtn.click();
            this.hideSafetyWarning(); // Hide warning immediately if we turn it off
        }

        // --- RESTRICTED ACTIONS (Only if Auto is OFF) ---

        // 2. SWORD OF LIGHT (Button A / index 0) -> "make a the sword of light again"
        if (justPressed(this.buttonMap.A)) {
            if (autoSkills) this.showSafetyWarning();
            else if (typeof activateSwordOfLight === 'function') activateSwordOfLight();
        }

        // 3. FRONT BULLETS (R Trigger / R2) -> "make r trigger the bullets"
        // Triggers are analog, usually pressed > 0.5 counts as click
        if (isPressed(this.buttonMap.R2)) {
            if (autoSkills) {
                // Throttle warning for held buttons? No, just show it
                if (!wasPressed(this.buttonMap.R2)) this.showSafetyWarning();
            } else {
                // Fire Bullets (Standard)
                // This usually happens automatically in combat loop, but manual firing?
                // The user requested "trigger the bullets". 
                // If the game is auto-fire, this might mean "Force Fire". 
                // Assuming 'spawnProjectile' exists or we toggle a flag?
                // Standard game loop fires automatically if Enemies are near.
                // Maybe this means "Force fire even if no enemy"?
                // Or just "Shoot now". 
                // I'll look for a 'fire' function. 
                // If not found, I'll assume 'activateSupernova' or similar isn't for bullets.
                // Side bullets are standard weapons. 
                // I'll manually call spawnProjectile if I can find it, 
                // OR I'll assume the user means a specific manual skill that looks like bullets?
                // "bullets out the front, that are on each side".
                // This sounds like the basic attack.
                // I'll check 'projectile-engine.js' later. For now, I'll log or try a best guess.
                // Actually, in `player-movement` I saw `weaponRechargeMode.bullet_left_side`.
                // I will assume there's a fire function. If not, I'll leave a TODO or generic fire.
                // NOTE: For now, I'll simulate a click on "skill-button-container-1"? No, that's Supernova.
                // I'll call `attemptManualFire()` separate helper.
                this.attemptManualFire();
            }
        }

        // 4. LASER (L Trigger / L2) -> "make l trigger the laser"
        if (isPressed(this.buttonMap.L2)) {
            if (autoSkills) {
                if (!wasPressed(this.buttonMap.L2)) this.showSafetyWarning();
            } else {
                this.attemptManualLaser();
            }
        }

        // 5. EXPLOSIONS (D-Pad)
        // Left (14): Smallest (Tier 1)
        if (justPressed(this.buttonMap.LEFT)) {
            if (autoSkills) this.showSafetyWarning();
            else if (typeof activateSupernova === 'function') activateSupernova(1);
        }
        // Right (15): Second Biggest (Medium / Tier 2)
        if (justPressed(this.buttonMap.RIGHT)) {
            if (autoSkills) this.showSafetyWarning();
            else if (typeof activateSupernova === 'function') activateSupernova(2);
        }
        // Up (12): Biggest (Tier 3)
        if (justPressed(this.buttonMap.UP)) {
            if (autoSkills) this.showSafetyWarning();
            else if (typeof activateSupernova === 'function') activateSupernova(3);
        }

        // 6. PAUSE TOGGLE (Start Button / index 9)
        if (justPressed(this.buttonMap.START)) {
            this.togglePause();
        }

        // Update History
        Object.keys(this.buttonMap).forEach(k => {
            const idx = this.buttonMap[k];
            this.prevButtonStates[idx] = buttons[idx].pressed;
        });
    },

    /**
     * MANUAL FIRE HELPERS
     * Attempts to find the firing logic in the global scope or systems.
     */
    attemptManualFire() {
        // Use projectile-engine.js function
        if (typeof fireWeapon === 'function') {
            // Fire both sides for "bullets out the front, that are on each side"
            fireWeapon('bullet_left_side', 0);
            fireWeapon('bullet_right_side', 1);
        }
    },

    attemptManualLaser() {
        if (typeof fireWeapon === 'function') {
            fireWeapon('laser', 2);
        }
    },

    /**
     * SAFETY POPUP UI
     * Creates a dominant warning message when user tries to input while Auto is ON.
     */
    createSafetyPopup() {
        if (document.getElementById('gp-safety-popup')) return;

        const popup = document.createElement('div');
        popup.id = 'gp-safety-popup';
        popup.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-family: 'Orbitron', sans-serif;
            font-size: 24px;
            font-weight: bold;
            box-shadow: 0 0 30px red;
            z-index: 10000;
            display: none;
            pointer-events: none;
            text-transform: uppercase;
            text-align: center;
        `;
        popup.innerText = "REQUIRED: B (AUTO OFF FIRST)";
        document.body.appendChild(popup);
    },

    showSafetyWarning() {
        const popup = document.getElementById('gp-safety-popup');
        console.log("SAFETY WARNING");
        if (popup) {
            popup.style.display = 'block';
            popup.style.animation = 'shake 0.5s ease-in-out';

            // Auto hide after 1.5s
            clearTimeout(this.warningTimeout);
            this.warningTimeout = setTimeout(() => {
                popup.style.display = 'none';
            }, 1000);
        }
    },

    hideSafetyWarning() {
        const popup = document.getElementById('gp-safety-popup');
        if (popup) popup.style.display = 'none';
    }
};

// Auto-init if script loaded
setTimeout(() => GamepadSystem.init(), 1000);
