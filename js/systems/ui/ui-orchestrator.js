/**
 * UI ORCHESTRATOR
 * 
 * The main high-level update loop for the game's User Interface.
 * Synchronizes the game's internal state (Player Health, Ammo, Targeting) 
 * with the visual DOM elements.
 * 
 * LOCATED IN: js/systems/ui/ui-orchestrator.js
 * 
 * -------------------------------------------------------------------------
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [UI Cache]: Depends on elHPBar, elShieldBar, etc., being initialized.
 * 2. [Combat Config]: Reads PLAYER_HEALTH_MAX and SHIP_CONFIG for scaling.
 * 3. [Skills Config]: Reads animSpeedSkill and skillFrames for button animations.
 * 4. [Assets]: Depends on skillAssets.baked to be TRUE before rendering buttons.
 * 5. [Physics]: Reads player.targetIdx and entity data[] for the Target HUD.
 * -------------------------------------------------------------------------
 */

/**
 * MAIN UI REFRESH
 * Typically called at 60fps from the main game loop (index.js).
 */
function updateUI() {
    // Lazy-init cache on first run
    if (!uiInitialized) initUICache();

    // 1. PLAYER VITAL BARS (Health & Shield)
    updateVitalsUI();

    // 2. WEAPON & SKILL AMMO/COOLDOWNS
    updateAmmoAndSkillsUI();

    // 3. STAGE & NAVIGATION
    updateStageNavigationUI();

    // 4. TARGETING HUD (Dynamic Enemy Info)
    updateTargetHUD();
}

/**
 * VITALS HANDLER
 * Updates HP, Shield, and Ghost health bars.
 */
function updateVitalsUI() {
    // PLAYER HEALTH BAR SETTING
    const showHealth = (typeof SettingsState !== 'undefined') ? SettingsState.get('healthBar') : true;
    if (!showHealth) {
        // If hidden, force height 0 or display none
        elHPBar.parentElement.style.display = 'none';
        // Note: parentElement is #player-health-container usually
    } else {
        elHPBar.parentElement.style.display = 'block';

        const hpPct = player.health / PLAYER_HEALTH_MAX;
        if (hpPct !== lastHP) {
            elHPBar.style.height = (hpPct * 100) + '%';

            // GHOST LOGIC: Lingering damage effect
            if (hpPct < lastHP) {
                setTimeout(() => {
                    if (elHPGhost) elHPGhost.style.height = (hpPct * 100) + '%';
                    lastHPGhost = hpPct;
                }, 300);
            } else {
                if (elHPGhost) elHPGhost.style.height = (hpPct * 100) + '%';
                lastHPGhost = hpPct;
            }

            // DYNAMIC COLOR: Blue (Good) -> Red (Danger)
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
    }

    // SHIELD BAR SETTING
    // SHIELD BAR OVERLAY (Always active based on gameplay, user wants setting to control the skinny ticker)
    // Removed setting check for the main overlap bar per user request
    elShieldBar.style.display = 'block';
    const targetShieldHeight = player.shieldActive ? (player.shieldHP / player.shieldMaxHP * 100) : 0;
    if (targetShieldHeight !== lastShield) {
        elShieldBar.style.height = targetShieldHeight + '%';
        lastShield = targetShieldHeight;
    }

    // SHIELD RECHARGE (The "Skinny Bar" - Controlled by Setting)
    const showShieldTicker = (typeof SettingsState !== 'undefined') ? SettingsState.get('shieldBar') : true;
    let isRecharging = false;

    if (!showShieldTicker) {
        elChargeBar.parentElement.style.display = 'none';
        isRecharging = player.shieldCooldownRemaining > 0; // Still track state potentially, or default to false
    } else {
        elChargeBar.parentElement.style.display = 'block';

        isRecharging = player.shieldCooldownRemaining > 0;
        const chgPct = isRecharging ? (1 - (player.shieldCooldownRemaining / SHIP_CONFIG.shieldCooldown)) : 1.0;
        if (chgPct !== lastCharge) {
            elChargeBar.style.height = (Math.max(0, Math.min(1, chgPct)) * 100) + '%';
            lastCharge = chgPct;
        }
    }
    if (isRecharging !== lastShieldRecharge) {
        elChargeBar.classList.toggle('recharging', isRecharging);
        lastShieldRecharge = isRecharging;
    }
}

/**
 * AMMO & SKILLS HANDLER
 */
function updateAmmoAndSkillsUI() {
    // LASER AMMO SETTING
    const showLaser = (typeof SettingsState !== 'undefined') ? SettingsState.get('laserBar') : true;
    if (!showLaser) {
        elLaserBar.parentElement.style.display = 'none';
    } else {
        elLaserBar.parentElement.style.display = 'block';
        const laserPct = weaponAmmo.laser / WEAPON_CONFIG.laser.maxAmmo;
        if (laserPct !== lastLaserAmmo) { elLaserBar.style.height = (laserPct * 100) + '%'; lastLaserAmmo = laserPct; }
        if (weaponRechargeMode.laser !== lastLaserRecharge) {
            elLaserBar.classList.toggle('recharging', weaponRechargeMode.laser);
            lastLaserRecharge = weaponRechargeMode.laser;
        }
    }

    // BULLET AMMO SETTING
    const showBullet = (typeof SettingsState !== 'undefined') ? SettingsState.get('bulletBar') : true;
    if (!showBullet) {
        elBulletBar.parentElement.style.display = 'none';
    } else {
        elBulletBar.parentElement.style.display = 'block';
        const bullPct = weaponAmmo.bullet_left_side / WEAPON_CONFIG.bullet_left_side.maxAmmo;
        if (bullPct !== lastBulletAmmo) { elBulletBar.style.height = (bullPct * 100) + '%'; lastBulletAmmo = bullPct; }
        if (weaponRechargeMode.bullet_left_side !== lastBulletRecharge) {
            elBulletBar.classList.toggle('recharging', weaponRechargeMode.bullet_left_side);
            lastBulletRecharge = weaponRechargeMode.bullet_left_side;
        }
    }

    // SKILL CANVASES (Animation Rendering)
    if (typeof skillAssets !== 'undefined' && skillAssets.baked) {
        for (let i = 0; i < 4; i++) {
            const canv = elSkillCanvases[i];
            if (!canv) continue;
            const btnCtx = canv.getContext('2d');

            let cfg, frameImg;
            if (i === 3) { // Sword of Light
                cfg = SKILLS.SwordOfLight;
                const bFrame = Math.floor((performance.now() * cfg.animSpeedSkill / 16.6) % cfg.skillFrames);
                frameImg = skillAssets.swordOfLightCache[bFrame];
            } else { // Supernova Tiers
                const tierKey = 'Tier' + (i + 1);
                cfg = SKILLS[tierKey];
                const bFrame = Math.floor((performance.now() * cfg.animSpeedButton / 16.6) % cfg.buttonFrames);
                frameImg = skillAssets.buttonCache[bFrame];
            }

            // Lazy DPR Scaling
            if (!canv._w) {
                const dpr = window.devicePixelRatio || 1;
                const rect = canv.getBoundingClientRect();
                canv.width = (canv._w = rect.width * dpr);
                canv.height = (canv._h = rect.height * dpr);
            }

            btnCtx.clearRect(0, 0, canv.width, canv.height);
            if (frameImg) {
                if (i === 3) btnCtx.drawImage(frameImg, 0, 0, canv.width, canv.height);
                else btnCtx.drawImage(frameImg, 0, -15 * (canv.height / 140), canv.width, canv.height);
            }

            // COOLDOWN OVERLAY
            const cd = skillCooldowns[i];
            if (cd > 0) {
                btnCtx.save();
                btnCtx.beginPath();
                const scale = (i === 3) ? 2 : 1;
                const divisor = (i === 3) ? 2 : 2.5;
                btnCtx.arc(canv.width / divisor, canv.height / divisor, (canv.width / 2.5) * scale, 0, Math.PI * 2);
                btnCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                btnCtx.fill();

                btnCtx.fillStyle = '#fff';
                btnCtx.font = `900 ${canv.width * 0.45 * scale}px Orbitron`;
                btnCtx.textAlign = 'center'; btnCtx.textBaseline = 'middle';
                btnCtx.shadowColor = '#0055ff'; btnCtx.shadowBlur = 15 * (window.devicePixelRatio || 1) * scale;
                btnCtx.fillText(Math.ceil(cd / 1000), canv.width / divisor, canv.height / divisor);
                btnCtx.restore();
            }
        }
    }
}

/**
 * NAV & STAGE HANDLER
 */
function updateStageNavigationUI() {
    const isSim = currentStage > 2000;
    let targetKills, mainTxt, subTxt;

    if (isSim) {
        const level = window.simulationLevel || SIMULATION_CONFIG.generateLevels()[(currentStage - 2000) - 1];
        targetKills = level?.kills || 300;

        // Find sector name from config
        const sectors = [
            { id: 1, name: 'GENESIS' },
            { id: 2, name: 'AWAKENING' },
            { id: 3, name: 'ASCENSION' },
            { id: 4, name: 'DIVINITY' },
            { id: 5, name: 'ETERNITY' }
        ];
        const sectorName = sectors.find(s => s.id === level.sector)?.name || "UNKNOWN";

        mainTxt = `SECTOR ${sectorName} // AREA ${level.id}`;
        subTxt = level.name;
    } else {
        targetKills = STAGE_CONFIG.STAGES[currentStage]?.kills || 300;
        mainTxt = `STAGE ${currentStage}`;
        subTxt = `${stageKillCount} / ${targetKills} TARGETS`;
    }

    const fullCheck = `${mainTxt}|${subTxt}|${stageKillCount}`;
    if (fullCheck !== lastStageTxt) {
        const elMain = elStageDisp.querySelector('.stage-main');
        const elSub = elStageDisp.querySelector('.stage-sub');

        if (elMain) elMain.innerText = isSim ? mainTxt : `${mainTxt} - ${formatGodNumber(stageKillCount)}/${formatGodNumber(targetKills)}`;
        if (elSub) elSub.innerText = subTxt;

        elPrevArr.classList.toggle('disabled', currentStage <= 1 || isSim);
        elNextArr.classList.toggle('disabled', isSim || !(currentStage <= highestStageCleared && currentStage < 9));
        elChallengeBtn.style.display = (currentStage > highestStageCleared && !isTraveling && !isSim) ? 'block' : 'none';
        lastStageTxt = fullCheck;
    }

    if (bossMode !== lastBossMode) {
        elBossCont.style.display = bossMode ? 'block' : 'none';
        lastBossMode = bossMode;
    }
}

/**
 * TARGET HUD HANDLER (Enemy Vitals)
 */
function updateTargetHUD() {
    // ENEMY HP SETTING
    const showEnemyHp = (typeof SettingsState !== 'undefined') ? SettingsState.get('enemyHp') : true;
    if (!showEnemyHp) {
        if (elTargetCont.style.display !== 'none') elTargetCont.style.display = 'none';
        return;
    }

    if (player.targetIdx !== -1) {
        const idx = player.targetIdx * STRIDE;
        if (idx < 0 || idx >= data.length) { player.targetIdx = -1; return; }

        const hp = data[idx + 8];
        if (hp > 0) {
            if (!lastTargetVisible) {
                elTargetCont.style.display = 'block';
                lastTargetVisible = true;
                lastTargetWidth = -1;
                elTargetCont.classList.toggle('rev', Math.random() > 0.5);
            }

            const typeKey = enemyKeys[data[idx + 11] | 0];
            const tierIdx = data[idx + 12] | 0;
            const tierCfg = LOOT_CONFIG.TIERS[tierIdx] || { id: 'Standard', healthMult: 1 };

            const baseName = Enemy[typeKey]?.folderName || typeKey;
            const displayName = (tierCfg.id && tierCfg.id !== 'Standard') ? `${tierCfg.id} ${baseName}` : baseName;

            if (lastTargetName !== displayName) { elTargetName.innerText = displayName; lastTargetName = displayName; }

            // Theme switching
            const currentTier = tierCfg.id?.toLowerCase() || 'standard';
            if (lastTargetTier !== currentTier) {
                if (lastTargetTier && lastTargetTier !== 'standard') elTargetCont.classList.remove(`tier-${lastTargetTier}`);
                if (currentTier !== 'standard') elTargetCont.classList.add(`tier-${currentTier}`);
                lastTargetTier = currentTier;
            }

            // Percent Calculation
            const maxHp = Enemy[typeKey].healthMax * tierCfg.healthMult;
            let pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

            if (Math.abs(pct - lastTargetWidth) > 0.1) {
                elTargetBar.style.width = pct + '%';
                if (pct < lastTargetWidth) setTimeout(() => { elTargetBarGhost.style.width = pct + '%'; lastTargetWidthGhost = pct; }, 300);
                else { elTargetBarGhost.style.width = pct + '%'; lastTargetWidthGhost = pct; }
                lastTargetWidth = pct;
            }
        } else {
            if (lastTargetVisible) elTargetCont.style.display = 'none';
            lastTargetVisible = false;
            player.targetIdx = -1;
        }
    } else if (lastTargetVisible) {
        elTargetCont.style.display = 'none';
        lastTargetVisible = false;
        if (lastTargetTier && lastTargetTier !== 'standard') elTargetCont.classList.remove(`tier-${lastTargetTier}`);
        lastTargetTier = "";
    }
}
