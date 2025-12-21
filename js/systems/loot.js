/**
 * LOOT SYSTEM
 * Handles drop logic and UI history updates
 */

const lootHistory = [];

/**
 * Initializes the loot container
 */
function initLootSystem() {
    // Prevent double init
    if (document.getElementById('loot-history-container')) return;

    const ui = document.getElementById('ui');
    const container = document.createElement('div');
    container.id = 'loot-history-container';
    ui.appendChild(container);

    console.log("[LOOT] System Initialized");
}

/**
 * Processes a potential drop from a defeated enemy
 * @param {string} enemyType - e.g. 'Dragon'
 * @param {number} tierIndex - 0: Standard, 1: Arch, 2: God, 3: Alpha, 4: Omega
 */
function handleEnemyDrop(enemyType, tierIndex = 0) {
    // Access tier via array index
    const tierCfg = LOOT_CONFIG.TIERS[tierIndex] || LOOT_CONFIG.TIERS[0];

    // 1. Roll for Global Drops (Currency, rare Crystals, etc.)
    LOOT_CONFIG.GLOBAL_DROPS.forEach(itemKey => {
        rollForItem(itemKey, tierCfg);
    });

    // 2. Roll for Enemy-Specific Drops
    const possibleDrops = LOOT_CONFIG.ENEMY_DROPS[enemyType];
    if (possibleDrops) {
        possibleDrops.forEach(itemKey => {
            rollForItem(itemKey, tierCfg);
        });
    }
}

/**
 * Rolls for an individual item drop based on tier multipliers
 */
function rollForItem(itemKey, tierCfg) {
    const itemCfg = LOOT_CONFIG.ITEMS[itemKey];
    if (!itemCfg) return;

    const finalChance = itemCfg.baseChance * tierCfg.chanceMult;
    if (Math.random() < finalChance) {
        const baseMin = itemCfg.min;
        const baseMax = itemCfg.max;
        // Calculate amount: random(min, max) * multiplier
        const amount = Math.floor((baseMin + Math.random() * (baseMax - baseMin + 1)) * tierCfg.amountMult);
        if (amount > 0) {
            addLootToHistory(itemKey, amount);
        }
    }
}

/**
 * Adds an item to the history UI with specific amount
 */
function addLootToHistory(itemKey, amount) {
    const itemCfg = LOOT_CONFIG.ITEMS[itemKey];
    if (!itemCfg) return;

    const container = document.getElementById('loot-history-container');
    if (!container) return;

    // Create element
    const el = document.createElement('div');
    el.className = 'loot-item';
    el.innerHTML = `
        <div class="loot-box">
            <div class="loot-text">
                <span class="loot-amount">${amount.toLocaleString()}</span>
                <span class="loot-name">${itemCfg.name}</span>
            </div>
        </div>
        <div class="loot-icon-wrapper">
            <div class="loot-icon-bg"></div>
            <img src="${itemCfg.icon}" class="loot-icon" alt="${itemCfg.name}">
        </div>
    `;

    // Add to bottom
    container.appendChild(el);
    lootHistory.push(el);

    // Maintain max history (shift up / remove top)
    if (lootHistory.length > LOOT_CONFIG.MAX_HISTORY) {
        const oldest = lootHistory.shift();
        oldest.classList.add('removing');
        setTimeout(() => {
            if (oldest.parentNode) oldest.parentNode.removeChild(oldest);
        }, 300);
    }
}

// Global exposure
window.handleEnemyDrop = handleEnemyDrop;
window.initLootSystem = initLootSystem;
