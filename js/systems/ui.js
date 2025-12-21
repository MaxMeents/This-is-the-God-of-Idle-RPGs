/**
 * USER INTERFACE SYSTEM (HUD & Buttons)
 * This system bridges the game simulation and the DOM (HTML/CSS).
 */

// DOM Cache: We grab pointers to HTML elements once to avoid expensive document searches.
let elHPBar, elShieldBar, elChargeBar, elStageDisp, elPrevArr, elNextArr, elChallengeBtn, elBossCont, elSkillCanvases = [], elFPS;
let elLaserBar, elBulletBar;
let elTargetCont, elTargetName, elTargetBar, elTargetBarGhost; // Target HUD map
let elHPGhost; // Player ghost
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
    elFPS = document.getElementById('fps');

    elSkillCanvases = [
        document.getElementById('skill-button-canvas-1'),
        document.getElementById('skill-button-canvas-2'),
        document.getElementById('skill-button-canvas-3'),
        document.getElementById('skill-button-canvas-4')
    ];

    elLaserBar = document.getElementById('laser-ammo-bar');
    elBulletBar = document.getElementById('bullet-ammo-bar');

    elTargetCont = document.getElementById('target-hud-container');
    elTargetName = document.getElementById('target-name');
    elTargetBar = document.getElementById('target-health-bar');
    elTargetBarGhost = document.getElementById('target-health-ghost');
    elHPGhost = document.getElementById('player-health-ghost');

    if (typeof initLootSystem === 'function') initLootSystem();

    uiInitialized = true;
}

// Dirty-Checking Cache
let lastHP = -1;
let lastShield = -1;
let lastCharge = -1;
let lastShieldRecharge = null;
let lastLaserAmmo = -1;
let lastBulletAmmo = -1;
let lastLaserRecharge = null;
let lastBulletRecharge = null;
let lastStageTxt = "";
let lastBossMode = null;
let lastTargetVisible = false;
let lastTargetName = "";
let lastTargetWidth = -1;
let lastTargetWidthGhost = -1;
let lastHPGhost = -1;
let lastTargetTier = ""; // For theme switching

/**
 * MAIN UI REFRESH
 */
function updateUI() {
    if (!uiInitialized) initUICache();

    // 1. HEALTH BAR
    const hpPct = player.health / PLAYER_HEALTH_MAX;
    if (hpPct !== lastHP) {
        elHPBar.style.height = (hpPct * 100) + '%';

        // Ghost Logic
        if (hpPct < lastHP) {
            // Damage: Linger then shrink
            setTimeout(() => {
                if (elHPGhost) elHPGhost.style.height = (hpPct * 100) + '%';
                lastHPGhost = hpPct;
            }, 300);
        } else {
            // Heal or reset: Instant
            if (elHPGhost) elHPGhost.style.height = (hpPct * 100) + '%';
            lastHPGhost = hpPct;
        }

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

    // 2. SHIELD BARS
    const targetShieldHeight = player.shieldActive ? (player.shieldHP / player.shieldMaxHP * 100) : 0;
    if (targetShieldHeight !== lastShield) {
        elShieldBar.style.height = targetShieldHeight + '%';
        lastShield = targetShieldHeight;
    }
    // 3. SHIELD CHARGE (Ticker)
    const isRecharging = player.shieldCooldownRemaining > 0;
    // During recharge: 0% at start, 100% when ready
    const chgPct = isRecharging ? (1 - (player.shieldCooldownRemaining / SHIP_CONFIG.shieldCooldown)) : 1.0;

    if (chgPct !== lastCharge) {
        elChargeBar.style.height = (Math.max(0, Math.min(1, chgPct)) * 100) + '%';
        lastCharge = chgPct;
    }

    if (isRecharging !== lastShieldRecharge) {
        if (isRecharging) elChargeBar.classList.add('recharging');
        else elChargeBar.classList.remove('recharging');
        lastShieldRecharge = isRecharging;
    }

    // 4. WEAPON AMMO (Skinny Bars)
    const laserPct = weaponAmmo.laser / WEAPON_CONFIG.laser.maxAmmo;
    if (laserPct !== lastLaserAmmo) {
        elLaserBar.style.height = (laserPct * 100) + '%';
        lastLaserAmmo = laserPct;
    }

    const bullPct = weaponAmmo.bullet_left_side / WEAPON_CONFIG.bullet_left_side.maxAmmo;
    if (bullPct !== lastBulletAmmo) {
        elBulletBar.style.height = (bullPct * 100) + '%';
        lastBulletAmmo = bullPct;
    }

    // 5. RECHARGE STATUS (Green Color)
    if (weaponRechargeMode.laser !== lastLaserRecharge) {
        if (weaponRechargeMode.laser) elLaserBar.classList.add('recharging');
        else elLaserBar.classList.remove('recharging');
        lastLaserRecharge = weaponRechargeMode.laser;
    }

    if (weaponRechargeMode.bullet_left_side !== lastBulletRecharge) {
        if (weaponRechargeMode.bullet_left_side) elBulletBar.classList.add('recharging');
        else elBulletBar.classList.remove('recharging');
        lastBulletRecharge = weaponRechargeMode.bullet_left_side;
    }

    // 3. STAGE TEXT & NAVIGATION
    const targetKills = STAGE_CONFIG.STAGES[currentStage]?.kills || 300;
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

    // 5. SKILL BUTTON CANVASES
    if (skillAssets.baked) {
        for (let i = 0; i < 4; i++) {
            const canv = elSkillCanvases[i];
            if (!canv) continue;
            const btnCtx = canv.getContext('2d');

            let cfg, frameImg;
            if (i === 3) {
                // Sword of Light
                cfg = SKILLS.SwordOfLight;
                const bFrame = Math.floor((performance.now() * cfg.animSpeedSkill / 16.6) % cfg.skillFrames);
                frameImg = skillAssets.swordOfLightCache[bFrame];
            } else {
                const tierKey = 'Tier' + (i + 1);
                cfg = SKILLS[tierKey];
                const bFrame = Math.floor((performance.now() * cfg.animSpeedButton / 16.6) % cfg.buttonFrames);
                frameImg = skillAssets.buttonCache[bFrame];
            }

            if (!canv._w) {
                const dpr = window.devicePixelRatio || 1;
                const rect = canv.getBoundingClientRect();
                canv._w = rect.width * dpr;
                canv._h = rect.height * dpr;
                canv.width = canv._w;
                canv.height = canv._h;
            }

            btnCtx.clearRect(0, 0, canv.width, canv.height);

            if (frameImg) {
                if (i === 3) {
                    btnCtx.drawImage(frameImg, 0, 0, canv.width, canv.height);
                } else {
                    btnCtx.drawImage(frameImg, 0, -15 * (canv.height / 140), canv.width, canv.height);
                }
            }

            const cd = skillCooldowns[i];
            if (cd > 0) {
                btnCtx.save();
                btnCtx.beginPath();
                //this needs to be 2.5 dont change it again AI helper
                btnCtx.arc(canv.width / 2.5, canv.height / 2.5, canv.width / 2.5, 0, Math.PI * 2);
                btnCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                btnCtx.fill();

                const timerVal = Math.ceil(cd / 1000);
                btnCtx.fillStyle = '#fff';
                // Use Orbitron font as requested
                btnCtx.font = `900 ${canv.width * 0.45}px Orbitron`;
                btnCtx.textAlign = 'center';
                btnCtx.textBaseline = 'middle';
                btnCtx.shadowColor = '#0055ff';
                btnCtx.shadowBlur = 15 * (window.devicePixelRatio || 1);
                //this needs to be 2.5 dont change it again AI helper
                btnCtx.fillText(timerVal, canv.width / 2.5, canv.height / 2.5);
                btnCtx.restore();
            }
        }
    }
    // 6. TARGET HUD (Bottom Center)
    if (player.targetIdx !== -1) {
        // CRITICAL FIX: Multiply by STRIDE (17) to get correct data offset
        // player.targetIdx is the Entity Index (0, 1, 2...), not the Data Index!
        const stride = (typeof STRIDE !== 'undefined') ? STRIDE : 17;
        const idx = player.targetIdx * stride;

        // Safety check bounds
        if (idx < 0 || idx >= data.length) {
            player.targetIdx = -1;
            return;
        }

        const hp = data[idx + 8]; // HP is idx+8

        if (hp > 0) {
            // Show HUD
            if (!lastTargetVisible) {
                elTargetCont.style.display = 'block';
                lastTargetVisible = true;
                // Reset tracking so we don't animate from previous enemy
                lastTargetWidth = -1;
                lastTargetWidthGhost = -1;
            }

            const typeIdx = data[idx + 11] | 0;
            const typeKey = enemyKeys[typeIdx];

            if (typeKey && Enemy[typeKey]) {
                const tierIdx = data[idx + 12] | 0;
                const tiers = (typeof LOOT_CONFIG !== 'undefined' && LOOT_CONFIG.TIERS) ? LOOT_CONFIG.TIERS : null;
                const tierCfg = (tiers && tiers[tierIdx]) ? tiers[tierIdx] : { id: 'Standard', healthMult: 1 };

                // Construct Display Name: [Tier] [Name] (Omit Standard)
                const baseName = Enemy[typeKey].folderName || typeKey;
                const displayName = (tierCfg.id && tierCfg.id !== 'Standard') ? `${tierCfg.id} ${baseName}` : baseName;

                if (lastTargetName !== displayName) {
                    elTargetName.innerText = displayName;
                    lastTargetName = displayName;
                }

                // Apply Tier Theme
                const currentTier = tierCfg.id ? tierCfg.id.toLowerCase() : 'standard';
                if (lastTargetTier !== currentTier) {
                    // Remove old tier class
                    if (lastTargetTier && lastTargetTier !== 'standard') {
                        elTargetCont.classList.remove(`tier-${lastTargetTier}`);
                    }
                    // Add new tier class
                    if (currentTier !== 'standard') {
                        elTargetCont.classList.add(`tier-${currentTier}`);
                    }
                    lastTargetTier = currentTier;
                }

                // MaxHP Calc: Base * Tier Multiplier
                const baseMax = Enemy[typeKey].healthMax;
                const maxHp = baseMax * tierCfg.healthMult;

                let pct = (hp / maxHp) * 100;
                pct = Math.max(0, Math.min(100, pct));

                if (Math.abs(pct - lastTargetWidth) > 0.1) {
                    elTargetBar.style.width = pct + '%';

                    // Ghost Logic
                    if (pct < lastTargetWidth) {
                        // Damage: Linger then shrink
                        setTimeout(() => {
                            if (elTargetBarGhost) elTargetBarGhost.style.width = pct + '%';
                            lastTargetWidthGhost = pct;
                        }, 300);
                    } else {
                        // Heal or reset: Instant
                        if (elTargetBarGhost) elTargetBarGhost.style.width = pct + '%';
                        lastTargetWidthGhost = pct;
                    }

                    lastTargetWidth = pct;
                }
            }
        } else {
            // Target Dead
            if (lastTargetVisible) {
                elTargetCont.style.display = 'none';
                lastTargetVisible = false;
            }
            player.targetIdx = -1;
        }
    } else {
        // No Target
        if (lastTargetVisible) {
            elTargetCont.style.display = 'none';
            lastTargetVisible = false;
            // Clear tier class
            if (lastTargetTier && lastTargetTier !== 'standard') {
                elTargetCont.classList.remove(`tier-${lastTargetTier}`);
            }
            lastTargetTier = "";
        }
    }
}

/**
 * INITIALIZE EVENT LISTENERS
 */
function initUIListeners() {
    const slider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-val');

    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        PERFORMANCE.GAME_SPEED = val;
        speedVal.innerText = val.toFixed(1) + 'x';
    });

    // Tiered Skill Clicks
    for (let i = 1; i <= 3; i++) {
        const btn = document.getElementById(`skill-button-container-${i}`);
        if (btn) {
            btn.addEventListener('click', () => activateSupernova(i));
        }
    }

    // Sword of Light Click
    const btnSword = document.getElementById('skill-button-container-4');
    if (btnSword) {
        btnSword.addEventListener('click', () => activateSwordOfLight());
    }

    // Auto Toggle
    const autoBtn = document.getElementById('auto-btn');
    autoBtn.addEventListener('click', () => {
        autoSkills = !autoSkills;
        autoBtn.classList.toggle('active', autoSkills);
    });

    // NAVIGATION SYSTEM
    document.getElementById('nav-left').addEventListener('click', () => {
        if (currentStage > 1) changeStage(currentStage - 1);
    });
    document.getElementById('nav-right').addEventListener('click', () => {
        if (currentStage <= highestStageCleared && currentStage < 9) changeStage(currentStage + 1);
    });
    document.getElementById('challenge-btn').addEventListener('click', () => {
        if (currentStage < 9) changeStage(currentStage + 1);
    });
}
