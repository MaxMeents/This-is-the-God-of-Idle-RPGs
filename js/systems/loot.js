/**
 * LOOT SYSTEM
 * Handles drop logic and UI history updates
 */

const lootHistory = [];
const lootLogHistory = [];
const MAX_LOG_HISTORY = 100;

// Log UI State
let logViewState = {
    currentView: 'hours', // 'hours' or 'detail'
    selectedHour: null    // e.g. "13:00"
};

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

    // Initialize the historical log UI
    initLootLogUI();

    console.log("[LOOT] System Initialized");
}

/**
 * Injects the Loot Log button and modal on-the-fly
 */
function initLootLogUI() {
    const ui = document.getElementById('ui');
    if (!ui || document.getElementById('loot-log-trigger')) return;

    // 1. Create Floating Button
    const btn = document.createElement('div');
    btn.id = 'loot-log-trigger';
    btn.className = 'premium-hud-btn';
    btn.innerHTML = '<span>Loot Log</span>';
    btn.onclick = openLootLog;
    ui.appendChild(btn);

    // 2. Create Modal Structure
    const modal = document.createElement('div');
    modal.id = 'loot-log-modal';
    modal.className = 'modal-backdrop hidden';
    modal.onclick = (e) => { if (e.target === modal) closeLootLog(); };

    modal.innerHTML = `
        <div class="modal-panel loot-log-panel">
            <div class="modal-header">
                <h2>God\'s Loot Ledger</h2>
                <div class="close-btn" onclick="closeLootLog()">×</div>
            </div>
            <div id="loot-log-content" class="modal-body custom-scrollbar">
                <!-- Items built on the fly -->
            </div>
        </div>
    `;
    document.body.appendChild(modal);
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
    const tier = itemCfg.tier || 'epic';
    el.className = `loot-item loot-tier-${tier}`;

    // Direction Randomization
    let boxClass = '';
    let flowClass = '';

    if (tier === 'god' || tier === 'alpha' || tier === 'omega') {
        // High Tiers: Opposite Directions
        boxClass = Math.random() > 0.5 ? 'box-cw' : 'box-ccw';
        flowClass = (boxClass === 'box-cw') ? 'flow-down' : 'flow-up';
    } else if (tier === 'epic') {
        // Mid Tier: Random Flow (No box animation)
        flowClass = Math.random() > 0.5 ? 'flow-up' : 'flow-down';
    }

    // Dynamic Amount-based bounce logic (Ramp from 10 to 100)
    let amtClass = '';
    let amtStyle = '';
    if (amount > 10) {
        amtClass = 'bouncing';
        // factor 0.0 at 10, 1.0 at 100+
        const factor = Math.min(1, (amount - 10) / 90);

        const dist = -1.5 - (5 * factor);      // Halved height: -1.5px to -6.5px
        const scale = 1.025 + (0.175 * factor); // Reduced scale to match
        const dur = 2.66 - (1.33 * factor);    // 25% Slower: 2.66s to 1.33s

        amtStyle = `style="--bounce-dist: ${dist}px; --bounce-scale: ${scale}; --bounce-dur: ${dur}s;"`;
    }

    el.innerHTML = `
        <div class="loot-box ${boxClass}">
            <div class="loot-text">
                <span class="loot-amount ${amtClass}" ${amtStyle}>${amount.toLocaleString()}</span>
                <span class="loot-name ${flowClass}">${itemCfg.name}</span>
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

    // Record to the permanent Log (Build a simplified data object for the log)
    const now = new Date();
    const logData = {
        itemKey,
        amount,
        boxClass,
        flowClass,
        amtClass,
        amtStyle,
        tier,
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        hourLabel: now.toLocaleTimeString([], { hour: '2-digit', hour12: false }) + ":00"
    };
    lootLogHistory.unshift(logData); // Newest first
    if (lootLogHistory.length > MAX_LOG_HISTORY) lootLogHistory.pop();

    // Maintain max history (shift up / remove top)
    if (lootHistory.length > LOOT_CONFIG.MAX_HISTORY) {
        const oldest = lootHistory.shift();
        oldest.classList.add('removing');
        setTimeout(() => {
            if (oldest.parentNode) oldest.parentNode.removeChild(oldest);
        }, 300);
    }

    // Auto-remove after 3 seconds (clean up old items)
    setTimeout(() => {
        // Only remove if it hasn't been removed already (check parentNode)
        if (el.parentNode) {
            el.classList.add('removing');
            setTimeout(() => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                    // Also remove from array if present
                    const idx = lootHistory.indexOf(el);
                    if (idx !== -1) lootHistory.splice(idx, 1);
                }
            }, 300);
        }
    }, 3000);
}

/**
 * Logic for opening/closing and rendering the log
 */
function openLootLog() {
    const modal = document.getElementById('loot-log-modal');
    if (!modal) return;

    // Always reset to hours index when opening
    logViewState.currentView = 'hours';
    logViewState.selectedHour = null;

    renderLootLog();
    modal.classList.remove('hidden');
    modal.classList.add('visible');
}

function closeLootLog() {
    const modal = document.getElementById('loot-log-modal');
    if (!modal) return;
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function viewHourLog(hour) {
    logViewState.currentView = 'detail';
    logViewState.selectedHour = hour;
    renderLootLog();
}

function viewHoursIndex() {
    logViewState.currentView = 'hours';
    logViewState.selectedHour = null;
    renderLootLog();
}

function renderLootLog() {
    const content = document.getElementById('loot-log-content');
    const headerTitle = document.querySelector('.modal-header h2');
    if (!content) return;

    content.innerHTML = '';

    if (lootLogHistory.length === 0) {
        headerTitle.innerHTML = "God's Loot Ledger";
        content.innerHTML = `<div class="empty-log-msg">Your ledger is empty, God. Go forth and claim your prizes.</div>`;
        return;
    }

    if (logViewState.currentView === 'hours') {
        renderHoursIndex(content, headerTitle);
    } else {
        renderDetailLog(content, headerTitle);
    }
}

function renderHoursIndex(content, headerTitle) {
    headerTitle.innerHTML = "God's Loot Ledger";

    // Group logs by hourLabel for count mapping
    const hoursMap = {};
    lootLogHistory.forEach(item => {
        if (!hoursMap[item.hourLabel]) hoursMap[item.hourLabel] = 0;
        hoursMap[item.hourLabel]++;
    });

    // Generate last 24 hours of window
    const now = new Date();
    const displayHours = [];
    for (let i = 0; i < 24; i++) {
        const d = new Date(now);
        d.setHours(now.getHours() - i);
        const label = d.toLocaleTimeString([], { hour: '2-digit', hour12: false }) + ":00";
        displayHours.push(label);
    }

    displayHours.forEach((hour, i) => {
        const count = hoursMap[hour] || 0;
        const btn = document.createElement('div');
        const isDisabled = count === 0;

        btn.className = `loot-log-hour-btn ${isDisabled ? 'disabled' : ''}`;
        btn.innerHTML = `
            <span class="hour-text">${hour} ${i === 0 ? '<small>(Current)</small>' : ''}</span>
            <span class="hour-count">${isDisabled ? 'No History' : count + ' Drops Recorded'}</span>
            <div class="fleur-de-lis">📜</div>
        `;

        if (!isDisabled) {
            btn.onclick = () => viewHourLog(hour);
        }
        content.appendChild(btn);
    });
}

function renderDetailLog(content, headerTitle) {
    headerTitle.innerHTML = `Loot Log: ${logViewState.selectedHour}`;

    // Add Back Button
    const backBtn = document.createElement('div');
    backBtn.className = 'log-back-btn';
    backBtn.innerHTML = '← Back to Ledger Index';
    backBtn.onclick = viewHoursIndex;
    content.appendChild(backBtn);

    const filtered = lootLogHistory.filter(item => item.hourLabel === logViewState.selectedHour);

    filtered.forEach(data => {
        const itemCfg = LOOT_CONFIG.ITEMS[data.itemKey];
        if (!itemCfg) return;

        const row = document.createElement('div');
        row.className = `loot-log-row loot-tier-${data.tier}`;

        row.innerHTML = `
            <div class="log-timestamp">${data.timestamp}</div>
            <div class="loot-item in-log">
                <div class="loot-box ${data.boxClass}">
                    <div class="loot-text">
                        <span class="loot-amount ${data.amtClass}" ${data.amtStyle}>${data.amount.toLocaleString()}</span>
                        <span class="loot-name ${data.flowClass}">${itemCfg.name}</span>
                    </div>
                </div>
                <div class="loot-icon-wrapper">
                    <div class="loot-icon-bg"></div>
                    <img src="${itemCfg.icon}" class="loot-icon" alt="${itemCfg.name}">
                </div>
            </div>
        `;
        content.appendChild(row);
    });
}

/**
 * BATCHING SYSTEM
 * queues drops effectively decoupling logic from DOM updates
 */
let lootQueue = {};
let lastLootProcess = 0;

function queueLoot(itemKey, amount) {
    if (!lootQueue[itemKey]) lootQueue[itemKey] = 0;
    lootQueue[itemKey] += amount;

    // Process queue if we haven't in a while (e.g. 250ms)
    // We rely on the game loop or interval for main processing but this is a failsafe
    const now = performance.now();
    if (now - lastLootProcess > 250) {
        processLootQueue();
        lastLootProcess = now;
    }
}

// Override original addLoot to use queue
const originalAddLoot = addLootToHistory;
// We redefine the internal function used by checks
addLootToHistory = (itemKey, amount) => {
    queueLoot(itemKey, amount);
};

// Also override the exported function name if it was used directly
// But 'rollForItem' uses local 'addLootToHistory' reference, so redefining it here works for local calls

function processLootQueue() {
    const keys = Object.keys(lootQueue);
    if (keys.length === 0) return;

    keys.forEach(key => {
        const amount = lootQueue[key];
        if (amount > 0) {
            // Call the REAL DOM update with aggregated amount
            // We need to bypass the override.
            // Wait, we overwrote 'addLootToHistory'. We need 'originalAddLoot'
            originalAddLoot(key, amount);
        }
    });

    // Clear queue
    lootQueue = {};
}

// Hook into game loop via global access or setInterval fallback
// Update UI 4 times a second max to keep DOM thrashing low
setInterval(processLootQueue, 250);

// Global exposure
window.handleEnemyDrop = handleEnemyDrop;
window.initLootSystem = initLootSystem;
