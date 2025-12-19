function updateUI() {
    const hpPct = player.health / PLAYER_HEALTH_MAX;
    const hpBar = document.getElementById('player-health-bar');
    hpBar.style.width = (hpPct * 100) + '%';

    // Dynamic Color Interpolation (Redder Sooner)
    let topR, topG, topB, botR, botG, botB;
    if (hpPct > 0.7) {
        // Transition: Blue -> Black (100% to 70%)
        const f = (hpPct - 0.7) / 0.3; // 1.0 at 100%, 0.0 at 70%
        topR = 65 * f; topG = 105 * f; topB = 225 * f;
        botR = 0; botG = 0; botB = 139 * f;
    } else {
        // Transition: Black -> Blood Red (70% to 0%)
        // Starts faster, becomes more intense sooner
        const f = hpPct / 0.7; // 1.0 at 70%, 0.0 at 0%
        const inv = Math.pow(1 - f, 0.8); // Slightly accelerated curve
        topR = 200 * inv; topG = 0; topB = 0;
        botR = 80 * inv; botG = 0; botB = 0;
    }
    hpBar.style.setProperty('--hp-top', `rgb(${topR},${topG},${topB})`);
    hpBar.style.setProperty('--hp-bot', `rgb(${botR},${botG},${botB})`);

    // Shield Bar
    const shieldBar = document.getElementById('player-shield-bar');
    if (player.shieldActive) {
        shieldBar.style.width = (player.shieldHP / player.shieldMaxHP * 100) + '%';
    } else {
        shieldBar.style.width = '0%';
    }

    // Shield Charge Bar
    const chargeBar = document.getElementById('shield-charge-bar');
    if (player.shieldActive) {
        chargeBar.style.width = '100%'; // Full while active
    } else {
        const pct = 1 - (player.shieldCooldownRemaining / SHIP_CONFIG.shieldCooldown);
        chargeBar.style.width = (pct * 100) + '%';
    }

    const targetKills = STAGE_CONFIG.MAX_KILLS[currentStage] || 300;

    // Stage Info
    document.getElementById('stage-display').innerText = `Stage ${currentStage} - ${stageKillCount}/${targetKills}`;

    // Navigation Arrows
    const prevArrow = document.getElementById('nav-left');
    const nextArrow = document.getElementById('nav-right');

    if (currentStage > 1) {
        prevArrow.classList.remove('disabled');
    } else {
        prevArrow.classList.add('disabled');
    }

    if (currentStage <= highestStageCleared && currentStage < 9) {
        nextArrow.classList.remove('disabled');
    } else {
        nextArrow.classList.add('disabled');
    }

    // Challenge Button
    const challengeBtn = document.getElementById('challenge-btn');
    if (currentStage > highestStageCleared && !isTraveling) {
        challengeBtn.style.display = 'block';
    } else {
        challengeBtn.style.display = 'none';
    }

    // Boss Health
    const bossContainer = document.getElementById('boss-health-container');
    if (bossMode) {
        bossContainer.style.display = 'block';
    } else {
        bossContainer.style.display = 'none';
    }

    // Skill Button Drawing
    const skillBtnCanvas = document.getElementById('skill-button-canvas');
    if (skillBtnCanvas && skillAssets.baked) {
        const btnCtx = skillBtnCanvas.getContext('2d');
        const cfg = SKILLS.MulticolorXFlame;

        // Use high-dpi logic for the button canvas
        const dpr = window.devicePixelRatio || 1;
        const rect = skillBtnCanvas.getBoundingClientRect();
        if (skillBtnCanvas.width !== rect.width * dpr) {
            skillBtnCanvas.width = rect.width * dpr;
            skillBtnCanvas.height = rect.height * dpr;
        }

        btnCtx.clearRect(0, 0, skillBtnCanvas.width, skillBtnCanvas.height);

        // 1. Draw animated icon
        const bFrame = Math.floor((performance.now() * cfg.animSpeedButton / 16.6) % cfg.buttonFrames);
        const frameImg = skillAssets.buttonCache[bFrame];

        if (frameImg) {
            btnCtx.drawImage(frameImg, 0, 0, skillBtnCanvas.width, skillBtnCanvas.height);
        }

        // 2. Draw Cooldown Overlay & Number
        if (skillCooldownRemaining > 0) {
            // Darkened Circle
            btnCtx.save();
            btnCtx.beginPath();
            btnCtx.arc(skillBtnCanvas.width / 2, skillBtnCanvas.height / 2, skillBtnCanvas.width / 2, 0, Math.PI * 2);
            btnCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            btnCtx.fill();

            // Centered Number
            const timerVal = Math.ceil(skillCooldownRemaining / 1000);
            btnCtx.fillStyle = '#fff';
            // Use a slightly smaller font for better framing
            btnCtx.font = `900 ${skillBtnCanvas.width * 0.55}px Outfit, Arial`;
            btnCtx.textAlign = 'center';
            btnCtx.textBaseline = 'middle';

            // Glow Effect
            btnCtx.shadowColor = '#ffcc00';
            btnCtx.shadowBlur = 25 * dpr;
            btnCtx.shadowOffsetX = 0;
            btnCtx.shadowOffsetY = 0;

            // Micro-nudge for Optical Centering:
            // Numbers (especially 2) can look heavy on the right. 
            // Shifting -4% Left to counteract the visual drift.
            const nudgeX = skillBtnCanvas.width * -0.04;
            const nudgeY = skillBtnCanvas.height * 0.035;

            btnCtx.fillText(timerVal, skillBtnCanvas.width / 2 + nudgeX, skillBtnCanvas.height / 2 + nudgeY);
            btnCtx.restore();
        }
    }
}

function initUIListeners() {
    const slider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-val');
    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        PERFORMANCE.GAME_SPEED = val;
        speedVal.innerText = val.toFixed(1) + 'x';
    });

    document.getElementById('skill-button-container').addEventListener('click', () => {
        const cfg = SKILLS.MulticolorXFlame;
        if (skillCooldownRemaining > 0) return;
        skillCooldownRemaining = cfg.cooldownTime;
        for (let i = 0; i < cfg.instanceCount; i++) {
            activeSkills.push({ angle: (i / cfg.instanceCount) * Math.PI * 2, frame: 0, done: false });
        }
    });

    // Stage Nav
    document.getElementById('nav-left').addEventListener('click', () => {
        if (currentStage > 1) changeStage(currentStage - 1);
    });
    document.getElementById('nav-right').addEventListener('click', () => {
        if (currentStage <= highestStageCleared && currentStage < 9) changeStage(currentStage + 1);
    });

    document.getElementById('challenge-btn').addEventListener('click', () => {
        // Redo current uncleared stage? or go to next?
        // User said: "challenge button where if you press it, you'll speed off to the next section"
        if (currentStage < 9) changeStage(currentStage + 1);
    });
}
