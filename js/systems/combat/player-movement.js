/**
 * PLAYER MOVEMENT SYSTEM
 * 
 * Handles all player-controlled navigation, tactical steering, and 
 * high-speed travel between game stages.
 * 
 * LOCATED IN: js/systems/combat/player-movement.js
 * DEPENDS ON: js/core/config/ship-config.js, js/systems/combat/combat-core.js
 */

/**
 * UPDATE PLAYER MOVEMENT
 * Orchestrates ship rotation and engine acceleration based on state.
 */
function updatePlayerMovement(dt, sc) {
    const gameSpd = PERFORMANCE.GAME_SPEED;

    // ANIMATION DECIMATION: Skips frames at high speeds to prevent GPU thrashing
    let animStride = 1.0;
    if (gameSpd >= 25) animStride = 6.0;
    else if (gameSpd >= 20) animStride = 5.0;
    else if (gameSpd >= 15) animStride = 2.5;
    else if (gameSpd >= 10) animStride = 1.66;
    else if (gameSpd >= 5) animStride = 1.25;

    /**
     * STATE: INTER-STAGE TRAVEL
     * High-speed rush to the next objective coordinate.
     */
    if (isTraveling) {
        const dx = travelTargetX - player.x, dy = travelTargetY - player.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        player.rotation = Math.atan2(dy, dx);

        if (d < 1000) {
            // ARRIVAL (Defined in index.js)
            if (typeof arriveAtNewStage === 'function') arriveAtNewStage();
        } else {
            const speed = PLAYER_SPEED * 50; // Massively accelerated
            const travelStep = speed * (dt / 16.6) * gameSpd;
            const moveDist = Math.min(d, travelStep);

            if (d > 0.1) {
                player.x += (dx / d) * moveDist;
                player.y += (dy / d) * moveDist;
            } else {
                player.x = travelTargetX;
                player.y = travelTargetY;
            }
        }
        player.shipState = 'FULL';
        const jitter = 0.8 + Math.random() * 0.4;
        player.shipFrame = (player.shipFrame + sc.animSpeed * (dt / 16.6) * gameSpd * animStride * jitter) % sc.fullFrames;
    }

    /**
     * STATE: ENGAGED / HUNTING
     * Navigates toward the current targetIdx with tactical awareness.
     * ONLY ACTIVE IF AUTO-SKILLS ARE ENABLED.
     */
    else if (window.autoSkills && player.targetIdx !== -1) {
        const tIdx = player.targetIdx * STRIDE;
        const dx = data[tIdx] - player.x, dy = data[tIdx + 1] - player.y;
        const dSq = dx * dx + dy * dy;
        const d = Math.sqrt(dSq);

        /**
         * TACTICAL RETREAT CHECK
         * If all weapons are currenty in 'recharge mode', face AWAY to stay safe.
         */
        const allWeaponsRecharging = weaponRechargeMode.bullet_left_side &&
            weaponRechargeMode.bullet_right_side &&
            weaponRechargeMode.laser;

        const baseTargetRot = Math.atan2(dy, dx);
        const targetRot = allWeaponsRecharging ? baseTargetRot + Math.PI : baseTargetRot;

        // ANGLE SMOOTHING
        let diff = targetRot - player.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turnStep = sc.turnSpeed * (dt / 1000) * gameSpd;

        if (Math.abs(diff) < turnStep) player.rotation = targetRot;
        else player.rotation += Math.sign(diff) * turnStep;

        // BALANCED DEADZONE - Prevents jitter while allowing movement
        const idealRange = sc.fullPowerDist * 1.2; // Target distance
        const deadzone = sc.fullPowerDist * .1;   // Moderate tolerance

        let shouldMove = false;
        let moveDirection = 1;

        if (allWeaponsRecharging) {
            // Retreat mode: only move if dangerously close
            if (d < idealRange * 0.3) {
                shouldMove = true;
                moveDirection = -1;
            }
        } else {
            // Combat mode: only move if WAY out of position
            if (d < idealRange - deadzone) {
                // Extremely close - back up
                shouldMove = true;
                moveDirection = -1;
            } else if (d > idealRange + deadzone) {
                // Extremely far - approach
                shouldMove = true;
                moveDirection = 1;
            }
            // Huge deadzone: player stays still unless distance is extreme
        }

        if (shouldMove && d > 0.1) {
            const timeScale = (dt / 16.6) * gameSpd;
            player.x += (dx / d) * PLAYER_SPEED * moveDirection * timeScale;
            player.y += (dy / d) * PLAYER_SPEED * moveDirection * timeScale;
        }

        // VISUAL STATE MANAGEMENT
        const animSpd = sc.animSpeed * (dt / 16.6) * gameSpd;
        if (d > sc.fullPowerDist) {
            player.shipState = 'FULL';
            player.shipFrame = (player.shipFrame + animSpd) % sc.fullFrames;
        }
        else if (d > sc.thrustDist) {
            player.shipState = 'THRUST';
            player.shipFrame = (player.shipFrame + animSpd) % sc.onFrames;
        }
        else {
            player.shipState = 'IDLE';
            player.shipFrame = (player.shipFrame + animSpd) % sc.idleFrames;
        }
    }

    // FINAL CATCH-ALL SAFETY: Emergency Recovery
    if (isNaN(player.x) || isNaN(player.y)) {
        player.x = travelTargetX;
        player.y = travelTargetY;
    }
}
