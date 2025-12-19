function updateUI() {
    document.getElementById('player-health-bar').style.width = (player.health / PLAYER_HEALTH_MAX * 100) + '%';

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

        // Match canvas logical size to container for high-res
        if (skillBtnCanvas.width !== cfg.buttonSize) {
            skillBtnCanvas.width = cfg.buttonSize;
            skillBtnCanvas.height = cfg.buttonSize;
        }

        btnCtx.clearRect(0, 0, skillBtnCanvas.width, skillBtnCanvas.height);

        // Loop button animation based on performance.now
        const bFrame = Math.floor((performance.now() * cfg.animSpeedButton / 16.6) % cfg.buttonFrames);
        const frameImg = skillAssets.buttonCache[bFrame];

        if (frameImg) {
            btnCtx.drawImage(frameImg, 0, 0);
        }

        // Timer Overlay
        const timerTxt = document.getElementById('skill-timer');
        if (skillCooldownRemaining > 0) {
            timerTxt.style.display = 'block';
            timerTxt.innerText = Math.ceil(skillCooldownRemaining / 1000);
            btnCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            btnCtx.fillRect(0, 0, skillBtnCanvas.width, skillBtnCanvas.height);
        } else {
            timerTxt.style.display = 'none';
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
