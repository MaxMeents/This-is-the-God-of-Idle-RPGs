/**
 * UI EVENT LISTENERS
 * 
 * Attaches JavaScript behavior to DOM elements for user interaction.
 * Bridges user inputs (clicks, sliders) to game simulation changes.
 * 
 * LOCATED IN: js/systems/ui/ui-listeners.js
 * 
 * -------------------------------------------------------------------------
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [Performance Config]: Updates PERFORMANCE.GAME_SPEED directly.
 * 2. [Skills System]: Calls activateSupernova() and activateSwordOfLight().
 * 3. [Physics]: Calls changeStage() and toggles autoSkills flag.
 * 4. [Main Script]: Depends on global variables like autoSkills, currentStage.
 * -------------------------------------------------------------------------
 */

/**
 * INITIALIZE INTERACTION BINDINGS
 * Called once during the boot sequence.
 */
function initUIListeners() {
    // 1. PERFORMANCE / SPEED CONTROL
    const slider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-val');

    if (slider) {
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            // Global speed influence (Read by physics loops)
            PERFORMANCE.GAME_SPEED = val;
            speedVal.innerText = val.toFixed(1) + 'x';
        });
    }

    // 2. SKILL ACTIVATIONS (Buttons 1-3 are Supernova, 4 is Ultimate)
    for (let i = 1; i <= 3; i++) {
        const btn = document.getElementById(`skill-button-container-${i}`);
        if (btn) {
            btn.addEventListener('click', () => {
                if (typeof activateSupernova === 'function') activateSupernova(i);
            });
        }
    }

    const btnSword = document.getElementById('skill-button-container-4');
    if (btnSword) {
        btnSword.addEventListener('click', () => {
            if (typeof activateSwordOfLight === 'function') activateSwordOfLight();
        });
    }

    // 3. AUTO-SKILL TOGGLE
    const autoBtn = document.getElementById('auto-btn');
    if (autoBtn) {
        autoBtn.addEventListener('click', () => {
            autoSkills = !autoSkills; // Toggles global boolean
            autoBtn.classList.toggle('active', autoSkills);

            // Randomize direction when activated (Visual polish)
            if (autoSkills) autoBtn.classList.toggle('rev', Math.random() > 0.5);
            else autoBtn.classList.remove('rev');
        });
    }

    // 4. NAVIGATION SYSTEM (Stage Switching)
    const btnLeft = document.getElementById('nav-left');
    const btnRight = document.getElementById('nav-right');
    const btnChal = document.getElementById('challenge-btn');

    if (btnLeft) {
        btnLeft.addEventListener('click', () => {
            if (currentStage > 1 && typeof changeStage === 'function') changeStage(currentStage - 1);
        });
    }

    if (btnRight) {
        btnRight.addEventListener('click', () => {
            if (currentStage <= highestStageCleared && currentStage < 9 && typeof changeStage === 'function') {
                changeStage(currentStage + 1);
            }
        });
    }

    if (btnChal) {
        btnChal.addEventListener('click', () => {
            if (currentStage < 9 && typeof changeStage === 'function') changeStage(currentStage + 1);
        });
    }

    console.log("[UI] Event listeners attached");
}
