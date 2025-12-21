/**
 * LOOT LOGIC MANAGER
 * 
 * Handles the high-level logic for drop rolling, tier scaling, and quantity calculation
 * when an enemy dies.
 * 
 * LOCATED IN: js/systems/loot/loot-logic.js
 * 
 * -------------------------------------------------------------------------
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [Enemy AI]: Calls .handleEnemyDrop() in enemy-ai.js when an enemy is killed.
 * 2. [Loot Config]: Uses LOOT_CONFIG (loot-config.js) for base chances and multipliers.
 * 3. [Loot Renderer]: addLootToHistory() depends on visual styles in loot-stairs-visuals.css.
 * 4. [Persistence]: Calls LootPersistence.add() to save drops for the ledger.
 * -------------------------------------------------------------------------
 */

/**
 * HANDLE ENEMY DROP
 * Orchestrates global and specific drops for a defeated entity.
 * 
 * @param {string} enemyType - e.g., 'BlueDragon' (Matched keys in stage-config.js)
 * @param {number} tierIndex - 0-4 (Standard to Omega)
 * @param {boolean} isLucky - Influenced by LUCKY_HIT_CHANCE in combat-config.js
 */
function handleEnemyDrop(enemyType, tierIndex = 0, isLucky = false) {
    const tierCfg = LOOT_CONFIG.TIERS[tierIndex] || LOOT_CONFIG.TIERS[0];

    // 1. GLOBAL POOL (Currency, rare items)
    LOOT_CONFIG.GLOBAL_DROPS.forEach(itemKey => {
        rollForItem(itemKey, tierCfg, isLucky);
    });

    // 2. ENEMY SPECIFIC POOL (Defined in loot-config.js)
    const possibleDrops = LOOT_CONFIG.ENEMY_DROPS[enemyType];
    if (possibleDrops) {
        possibleDrops.forEach(itemKey => {
            rollForItem(itemKey, tierCfg, isLucky);
        });
    }
}

/**
 * ROLL FOR ITEM
 * Calculates success and final quantity based on tiered multipliers.
 */
function rollForItem(itemKey, tierCfg, isLucky = false) {
    const itemCfg = LOOT_CONFIG.ITEMS[itemKey];
    if (!itemCfg) return;

    // Chance scaling: Base * Tier Multiplier
    const finalChance = itemCfg.baseChance * tierCfg.chanceMult;

    if (Math.random() < finalChance) {
        // Amount calculation: random(min, max) * Tier Amount Multiplier
        let amount = Math.floor((itemCfg.min + Math.random() * (itemCfg.max - itemCfg.min + 1)) * tierCfg.amountMult);

        // LUKCY HIT: Doubles final loot amount (Defined in combat-config.js)
        if (isLucky) amount *= 2;

        if (amount > 0) {
            // Send to visual history (Stairs) - Note: this is intercepted by loot-batching.js
            addLootToHistory(itemKey, amount, isLucky, tierCfg.id);
        }
    }
}

/**
 * ADD LOOT TO HISTORY (Visual Spawner)
 * Creates the "Stairs" notification element when an item is found.
 * 
 * AFFECTED BY: 
 * - loot-stairs-visuals.css: Provides the shimmering and bounce animations.
 * - MAX_HISTORY (loot-config.js): Caps the number of items on screen at once.
 */
function addLootToHistory(itemKey, amount, isLucky = false, forcedTier = null) {
    const itemCfg = LOOT_CONFIG.ITEMS[itemKey];
    if (!itemCfg) return;

    // DOM placement (Container initialized in loot-ui.js)
    const container = document.getElementById('loot-history-container');
    if (!container) return;

    const tier = forcedTier || itemCfg.tier || 'normal';

    // ELEMENT CREATION
    const el = document.createElement('div');
    el.className = `loot-item loot-tier-${tier}`;

    // RANDOMIZED ANIMATION DIRECTIONS (Balanced for visual variety)
    let boxClass = '';
    let flowClass = '';
    if (tier === 'god' || tier === 'alpha' || tier === 'omega') {
        boxClass = Math.random() > 0.5 ? 'box-cw' : 'box-ccw';
        flowClass = (boxClass === 'box-cw') ? 'flow-down' : 'flow-up';
    } else if (tier === 'epic') {
        flowClass = Math.random() > 0.5 ? 'flow-up' : 'flow-down';
    }

    // BOUNCE PHYSICS (Magnitude based on Amount)
    let amtStyle = '';
    if (amount > 10) {
        const factor = Math.min(1, (amount - 10) / 90);
        const dist = -0.75 - (2.5 * factor);
        const scale = 1.0125 + (0.0875 * factor);
        const dur = 2.66 - (1.33 * factor);
        amtStyle = `style="--bounce-dist: ${dist}px; --bounce-scale: ${scale}; --bounce-dur: ${dur}s;"`;
    }

    el.innerHTML = `
        <div class="loot-box ${boxClass}">
            <div class="loot-text">
                <span class="loot-amount ${amount > 10 ? 'bouncing' : ''}" ${amtStyle}>${amount.toLocaleString()}</span>
                <span class="loot-name ${flowClass}">${itemCfg.name}</span>
            </div>
        </div>
        <div class="loot-icon-wrapper">
            <div class="loot-icon-bg"></div>
            <img src="${itemCfg.icon}" class="loot-icon" alt="${itemCfg.name}" loading="lazy">
        </div>
    `;

    container.appendChild(el);
    lootHistory.push(el);

    // PERSISTENCE SYNC (Saves to ledger)
    if (typeof LootPersistence !== 'undefined') {
        LootPersistence.add(itemCfg.id, amount, isLucky, tier);
    }

    // LIST MAINTENANCE (Pop top if limit reached)
    if (lootHistory.length > LOOT_CONFIG.MAX_HISTORY) {
        const oldest = lootHistory.shift();
        oldest.classList.add('removing');
        setTimeout(() => oldest.parentNode?.removeChild(oldest), 300);
    }

    // LIFESPAN: Fade out and remove after 3 seconds
    setTimeout(() => {
        if (el.parentNode) {
            el.classList.add('removing');
            setTimeout(() => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                    const idx = lootHistory.indexOf(el);
                    if (idx !== -1) lootHistory.splice(idx, 1);
                }
            }, 300);
        }
    }, 3000);
}
