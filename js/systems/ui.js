/**
 * USER INTERFACE SYSTEM (HUD & Buttons)
 * This system bridges the game simulation and the DOM (HTML/CSS).
 */

// DOM Cache: We grab pointers to HTML elements once to avoid expensive document searches.
let elHPBar, elShieldBar, elChargeBar, elStageDisp, elPrevArr, elNextArr, elChallengeBtn, elBossCont, elSkillCanvas, elFPS;
let uiInitialized = false;

function initUICache() {
    elHPBar = document.getElementById('player-health-bar');
    elShieldBar = document.getElementById('player-shield-bar');
    elChargeBar = document.getElementById('shield-charge-bar');
    elStageDisp = document.getElementById('stage-display');
    elPrevArr = document.getElementById('nav-left');
    elNextArr = document.getElementById('nav-right');
    elChallengeBtn = document.getElementById('challenge-btn');
    elBossCont = document.getElementById('boss-health-container');
    elSkillCanvas = document.getElementById('skill-button-canvas');
    elFPS = document.getElementById('fps');
    uiInitialized = true;
}

// Dirty-Checking Cache: Prevents the UI from updating unless the values have actually changed.
let lastHP = -1;
let lastShield = -1;
let lastCharge = -1;
let lastStageTxt = "";
let lastBossMode = null;

/**
 * MAIN UI REFRESH
 * Optimized for minimum layout thrashing (avoids expensive DOM writes when possible).
 */
function updateUI() {
    if (!uiInitialized) initUICache();

    // 1. HEALTH BAR (Vertical)
    const hpPct = player.health / PLAYER_HEALTH_MAX;
    if (hpPct !== lastHP) {
        elHPBar.style.height = (hpPct * 100) + '%';

        // DYNAMIC COLOR INTERPOLATION
        // Smoothly blends colors based on health percentage. 
        // 100% = Blue, 70% = Black, 0% = Ominous Blood Red.
        let topR, topG, topB, botR, botG, botB;
        if (hpPct > 0.7) {
            const f = (hpPct - 0.7) / 0.3;
            topR = 65 * f; topG = 105 * f; topB = 225 * f;
            botR = 0; botG = 0; botB = 139 * f;
        } else {
            const f = hpPct / 0.7;
            const inv = Math.pow(1 - f, 0.8);
            topR = 200 * inv; topG = 0; topB = 0;
            botR = 80 * inv; botG = 0; botB = 0;
        }
        elHPBar.style.setProperty('--hp-top', `rgb(${topR},${topG},${topB})`);
        elHPBar.style.setProperty('--hp-bot', `rgb(${botR},${botG},${botB})`);
        lastHP = hpPct;
    }

    // 2. SHIELD BARS (Vertical)
    const targetShieldHeight = player.shieldActive ? (player.shieldHP / player.shieldMaxHP * 100) : 0;
    if (targetShieldHeight !== lastShield) {
        elShieldBar.style.height = targetShieldHeight + '%';
        lastShield = targetShieldHeight;
    }

    const chargePct = player.shieldActive ? 1 : (1 - (player.shieldCooldownRemaining / SHIP_CONFIG.shieldCooldown));
    if (chargePct !== lastCharge) {
        elChargeBar.style.height = (chargePct * 100) + '%';
        lastCharge = chargePct;
    }

    // 3. STAGE TEXT & NAVIGATION
    const targetKills = STAGE_CONFIG.MAX_KILLS[currentStage] || 300;
    const stageTxt = `Stage ${currentStage} - ${stageKillCount}/${targetKills}`;
    if (stageTxt !== lastStageTxt) {
        elStageDisp.innerText = stageTxt;
        elPrevArr.classList.toggle('disabled', currentStage <= 1);
        elNextArr.classList.toggle('disabled', !(currentStage <= highestStageCleared && currentStage < 9));
        elChallengeBtn.style.display = (currentStage > highestStageCleared && !isTraveling) ? 'block' : 'none';
        lastStageTxt = stageTxt;
    }

    // 4. BOSS OVERLAY
    if (bossMode !== lastBossMode) {
        elBossCont.style.display = bossMode ? 'block' : 'none';
        lastBossMode = bossMode;
    }

    // 5. SKILL BUTTON CANVAS
    // Draws the animated rainbow icon and the CD timer directly to a mini-canvas.
    if (elSkillCanvas && skillAssets.baked) {
        const btnCtx = elSkillCanvas.getContext('2d');
        const cfg = SKILLS.MulticolorXFlame;

        // Auto-scaling for High-DPI (Retina) screens
        if (!elSkillCanvas._w) {
            const dpr = window.devicePixelRatio || 1;
            const rect = elSkillCanvas.getBoundingClientRect();
            elSkillCanvas._w = rect.width * dpr;
            elSkillCanvas._h = rect.height * dpr;
            elSkillCanvas.width = elSkillCanvas._w;
            elSkillCanvas.height = elSkillCanvas._h;
        }

        btnCtx.clearRect(0, 0, elSkillCanvas.width, elSkillCanvas.height);

        // Draw animated icon frame from the cache
        const bFrame = Math.floor((performance.now() * cfg.animSpeedButton / 16.6) % cfg.buttonFrames);
        const frameImg = skillAssets.buttonCache[bFrame];
        if (frameImg) {
            btnCtx.drawImage(frameImg, 0, 0, elSkillCanvas.width, elSkillCanvas.height);
        }

        // Draw the dark cooldown overlay and the numeric timer
        if (skillCooldownRemaining > 0) {
            btnCtx.save();
            btnCtx.beginPath();
            btnCtx.arc(elSkillCanvas.width / 2, elSkillCanvas.height / 2, elSkillCanvas.width / 2, 0, Math.PI * 2);
            btnCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            btnCtx.fill();

            const timerVal = Math.ceil(skillCooldownRemaining / 1000);
            btnCtx.fillStyle = '#fff';
            btnCtx.font = `900 ${elSkillCanvas.width * 0.55}px Outfit, Arial`; // Dynamic font sizing
            btnCtx.textAlign = 'center';
            btnCtx.textBaseline = 'middle';
            btnCtx.shadowColor = '#ffcc00';
            btnCtx.shadowBlur = 25 * (window.devicePixelRatio || 1);

            // Optical centering adjustment
            const nudgeX = elSkillCanvas.width * -0.04;
            const nudgeY = elSkillCanvas.height * 0.035;
            btnCtx.fillText(timerVal, elSkillCanvas.width / 2 + nudgeX, elSkillCanvas.height / 2 + nudgeY);
            btnCtx.restore();
        }
    }
}

/**
 * INITIALIZE EVENT LISTENERS
 * Connects the buttons and sliders to the game core.
 */
function initUIListeners() {
    const slider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-val');

    // Game Speed Control
    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        PERFORMANCE.GAME_SPEED = val;
        speedVal.innerText = val.toFixed(1) + 'x';
    });

    // Skill Activation click
    document.getElementById('skill-button-container').addEventListener('click', () => {
        const cfg = SKILLS.MulticolorXFlame;
        if (skillCooldownRemaining > 0) return;
        skillCooldownRemaining = cfg.cooldownTime;
        // Spawn the particle data in the physics engine
        for (let i = 0; i < cfg.instanceCount; i++) {
            activeSkills.push({ angle: (i / cfg.instanceCount) * Math.PI * 2, frame: 0, done: false });
        }
    });

    // NAVIGATION SYSTEM
    document.getElementById('nav-left').addEventListener('click', () => {
        if (currentStage > 1) changeStage(currentStage - 1);
    });

    document.getElementById('nav-right').addEventListener('click', () => {
        if (currentStage <= highestStageCleared && currentStage < 9) changeStage(currentStage + 1);
    });

    // CHALLENGE (Auto-Nav to next level)
    document.getElementById('challenge-btn').addEventListener('click', () => {
        if (currentStage < 9) changeStage(currentStage + 1);
    });
}
