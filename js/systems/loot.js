/**
 * LOOT SYSTEM
 * Handles drop logic and UI history updates
 */

const lootHistory = [];
const lootLogHistory = [];
const sessionStartTime = Date.now();

// Permanent High-Capacity Log
const LootPersistence = {
    STORAGE_KEY: 'god_loot_ledger_v1',
    BUFFER: '',

    init() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            this.BUFFER = stored;
            console.log(`[LOOT] Persistence loaded: ${this.BUFFER.split(',').length} entries`);
        } else {
            console.log("[LOOT] No existing persistence found");
        }
    },

    /**
     * @param {number} id - Item ID
     * @param {number} amount - Quantity
     * @param {boolean} isLucky - Lucky hit flag
     * @param {string} tier - Tier ID (normal, epic, etc)
     */
    add(id, amount, isLucky = false, tier = 'normal') {
        const timeBase36 = Date.now().toString(36);
        const amtBase36 = amount.toString(36);
        const luckyFlag = isLucky ? '1' : '0';
        const entry = `${id}:${timeBase36}:${amtBase36}:${luckyFlag}:${tier}`;

        if (this.BUFFER) this.BUFFER += ',';
        this.BUFFER += entry;

        // Save to localStorage immediately (or we could throttle)
        localStorage.setItem(this.STORAGE_KEY, this.BUFFER);

        // LIVE UI UPDATE (Only if open)
        const modal = document.getElementById('loot-log-modal');
        if (modal) {
            this.syncEntry(id, Date.now(), amount, isLucky, tier);

            const now = new Date();
            const hourLabel = now.toLocaleTimeString([], { hour: '2-digit', hour12: false }) + ":00";
            const safeHour = hourLabel.replace(':', '-');

            if (logViewState.currentView === 'hours') {
                const countEl = document.getElementById(`log-count-${safeHour}`);
                if (countEl) {
                    const hourCount = lootLogHistory.filter(item => item.hourLabel === hourLabel).length;
                    countEl.innerText = `${hourCount} Drops Recorded`;

                    const btn = countEl.closest('.loot-log-hour-btn');
                    if (btn && btn.classList.contains('disabled')) {
                        btn.classList.remove('disabled');
                        btn.onclick = () => viewHourLog(hourLabel);
                    }
                }
            } else if (logViewState.currentView === 'detail' && logViewState.selectedHour === hourLabel) {
                // IMPORTANT: Go through renderLootLog to respect current Filters
                renderLootLog();
            }
        }
    },

    syncMemory() {
        lootLogHistory.length = 0;
        if (!this.BUFFER) return;

        const entries = this.BUFFER.split(',');
        console.log(`[LOOT] Syncing ${entries.length} persistent entries...`);

        entries.forEach(e => {
            if (!e) return;
            const parts = e.split(':');
            if (parts.length < 3) return;

            const [idStr, timeBase36, amtBase36, luckyFlag, tier] = parts;
            const id = parseInt(idStr);
            const time = parseInt(timeBase36, 36);
            const amt = parseInt(amtBase36, 36);
            const lucky = luckyFlag === '1'; // Handles old 3-part format as false
            const finalTier = tier || 'normal';

            this.syncEntry(id, time, amt, lucky, finalTier, false);
        });
        lootLogHistory.sort((a, b) => b.rawTime - a.rawTime);
        console.log(`[LOOT] Memory synced: ${lootLogHistory.length} items parsed`);
    },

    syncEntry(id, time, amt, isLucky = false, tier = 'normal', sort = true) {
        // Reverse lookup itemKey from ID
        const itemKey = Object.keys(LOOT_CONFIG.ITEMS).find(k => LOOT_CONFIG.ITEMS[k].id === id);
        if (!itemKey) return;

        const itemCfg = LOOT_CONFIG.ITEMS[itemKey];
        const date = new Date(time);

        lootLogHistory.push({
            itemKey,
            amount: amt,
            tier: tier,
            rawTime: time,
            timestamp: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
            hourLabel: date.toLocaleTimeString([], { hour: '2-digit', hour12: false }) + ":00",
            dateLabel: date.toLocaleDateString(),
            isLucky: isLucky
        });
        if (sort) lootLogHistory.sort((a, b) => b.rawTime - a.rawTime);
    }
};

let logViewState = {
    // State for the Log View
    currentView: 'index', // 'index' (hours) or 'detail' (specific hour)
    currentHour: null,
    timeScope: 'all', // 'session', 'today', 'all'
    activeTiers: new Set(['normal', 'epic', 'god', 'alpha', 'omega']),
    activeCategory: 'drops', // 'spending', 'drops', 'rewards'
    zoom: 1.0, // 0.0 to 1.0 (1.0 = Max Size, 0.0 = Grid Mode)
    clusterize: null,
    scrollPos: 0
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

    // Initialize persistence
    LootPersistence.init();

    // Initialize the historical log UI
    const btn = document.createElement('div');
    btn.id = 'loot-log-trigger';
    btn.className = 'premium-hud-btn';
    btn.innerHTML = '<span>Loot Log</span>';
    btn.onclick = openLootLog;
    ui.appendChild(btn);
}

/**
 * Creates the modal structure only when needed
 */
function createLootLogModal() {
    if (document.getElementById('loot-log-modal')) return document.getElementById('loot-log-modal');

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
            <div id="ledger-filter-bar" class="ledger-filter-bar">
                <div class="time-filters">
                    <button class="filter-btn" data-scope="session" onclick="setLogTimeScope('session')">Session</button>
                    <button class="filter-btn" data-scope="today" onclick="setLogTimeScope('today')">Today</button>
                    <button class="filter-btn active" data-scope="all" onclick="setLogTimeScope('all')">All Time</button>
                </div>
                <!-- Category Filters -->
                <div class="category-filters">
                    <button class="cat-btn" onclick="setLogCategory('spending')">Spending</button>
                    <button class="cat-btn active" onclick="setLogCategory('drops')">Monster Drops</button>
                    <button class="cat-btn" onclick="setLogCategory('rewards')">Rewards</button>
                </div>
                <div class="tier-filters">
                    <div class="tier-circle tier-normal active" onclick="toggleLogTier('normal')"></div>
                    <div class="tier-circle tier-epic active" onclick="toggleLogTier('epic')"></div>
                    <div class="tier-circle tier-god active" onclick="toggleLogTier('god')"></div>
                    <div class="tier-circle tier-omega active" onclick="toggleLogTier('omega')"></div>
                    <div class="tier-circle tier-alpha active" onclick="toggleLogTier('alpha')"></div>
                </div>
            </div>
            <!-- Zoom Controls -->
            <div class="zoom-controls">
                <span class="zoom-label">View Size</span>
                <input type="range" min="0" max="100" value="100" class="zoom-slider" oninput="handleLogZoom(this.value)">
                <span class="zoom-label">Grid Mode</span>
            </div>
            <div id="loot-log-content" class="modal-body custom-scrollbar">
                <!-- Items built on the fly -->
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

/**
 * Processes a potential drop from a defeated enemy
 * @param {string} enemyType - e.g. 'Dragon'
 * @param {number} tierIndex - 0: Standard, 1: Arch, 2: God, 3: Alpha, 4: Omega
 * @param {boolean} isLucky - Whether it was a lucky hit
 */
function handleEnemyDrop(enemyType, tierIndex = 0, isLucky = false) {
    // Access tier via array index
    const tierCfg = LOOT_CONFIG.TIERS[tierIndex] || LOOT_CONFIG.TIERS[0];

    // 1. Roll for Global Drops (Currency, rare Crystals, etc.)
    LOOT_CONFIG.GLOBAL_DROPS.forEach(itemKey => {
        rollForItem(itemKey, tierCfg, isLucky);
    });

    // 2. Roll for Enemy-Specific Drops
    const possibleDrops = LOOT_CONFIG.ENEMY_DROPS[enemyType];
    if (possibleDrops) {
        possibleDrops.forEach(itemKey => {
            rollForItem(itemKey, tierCfg, isLucky);
        });
    }
}

/**
 * Rolls for an individual item drop based on tier multipliers
 */
function rollForItem(itemKey, tierCfg, isLucky = false) {
    const itemCfg = LOOT_CONFIG.ITEMS[itemKey];
    if (!itemCfg) return;

    const finalChance = itemCfg.baseChance * tierCfg.chanceMult;
    if (Math.random() < finalChance) {
        const baseMin = itemCfg.min;
        const baseMax = itemCfg.max;

        // Calculate amount: random(min, max) * multiplier
        let amount = Math.floor((baseMin + Math.random() * (baseMax - baseMin + 1)) * tierCfg.amountMult);

        // LITERALLY LUCKY: Double loot
        if (isLucky) {
            amount *= 2;
        }

        if (amount > 0) {
            addLootToHistory(itemKey, amount, isLucky, tierCfg.id);
        }
    }
}

/**
 * Adds an item to the history UI with specific amount
 */
function addLootToHistory(itemKey, amount, isLucky = false, forcedTier = null) {
    const itemCfg = LOOT_CONFIG.ITEMS[itemKey];
    if (!itemCfg) return;

    const container = document.getElementById('loot-history-container');
    if (!container) return;

    const tier = forcedTier || itemCfg.tier || 'epic';

    // Create element
    const el = document.createElement('div');
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

        const dist = -0.75 - (2.5 * factor);    // Halved again: -0.75px to -3.25px
        const scale = 1.0125 + (0.0875 * factor); // Reduced scale match
        const dur = 2.66 - (1.33 * factor);    // Maintain slow speed

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

    // Save to persistence
    LootPersistence.add(itemCfg.id, amount, isLucky, tier);

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

// --- Zoom & Category Logic ---

function handleLogZoom(val) {
    const zoomLevel = parseInt(val) / 100;
    logViewState.zoom = zoomLevel;

    // Re-render to apply new scale/grid mode immediately
    // If in detail view, we likely want to re-render the detail log
    if (logViewState.currentView === 'detail') {
        // We need to re-render the detail log with the current data
        // renderLootLog handles all filtering and view logic
        renderLootLog();
    }
}

function setLogCategory(cat) {
    logViewState.activeCategory = cat;
    // Update UI active state
    $('.category-filters .cat-btn').removeClass('active');
    $(`.category-filters .cat-btn:contains('${cat === 'drops' ? 'Monster Drops' : cat.charAt(0).toUpperCase() + cat.slice(1)}')`).addClass('active'); // Simple text match for demo

    renderLootLog();
}

// --- Filtering & Rendering ---
/**
 * Logic for opening/closing and rendering the log
 */
function openLootLog() {
    const modal = createLootLogModal();

    // Defer parsing until looking
    LootPersistence.syncMemory();

    logViewState.currentView = 'index';
    logViewState.currentHour = null;

    renderLootLog();

    // Small timeout for CSS transition
    requestAnimationFrame(() => {
        modal.classList.remove('hidden');
        modal.classList.add('visible');
    });
}

function closeLootLog() {
    const modal = document.getElementById('loot-log-modal');
    if (!modal) return;

    modal.classList.remove('visible');

    // Destroy clusterize if active
    if (logViewState.clusterize) {
        logViewState.clusterize.destroy();
        logViewState.clusterize = null;
    }

    setTimeout(() => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
        // Clear memory to save RAM when not looking
        lootLogHistory.length = 0;
    }, 300);
}

function viewHourLog(hour) {
    logViewState.currentView = 'detail';
    logViewState.currentHour = hour;

    // Cleanup old clusterize
    if (logViewState.clusterize) {
        logViewState.clusterize.destroy();
        logViewState.clusterize = null;
    }

    const $content = $('#loot-log-content');
    $content.empty(); // Force full clear on view change
    renderLootLog();
}

function viewHoursIndex() {
    logViewState.currentView = 'index';
    logViewState.currentHour = null;

    // Cleanup old clusterize
    if (logViewState.clusterize) {
        logViewState.clusterize.destroy();
        logViewState.clusterize = null;
    }

    const $content = $('#loot-log-content');
    $content.empty(); // Force full clear on view change
    renderLootLog();
}

/**
 * Filter Actions
 */
function setLogTimeScope(scope) {
    logViewState.timeScope = scope;

    // Update button active states
    $('.time-filters .filter-btn').each(function () {
        $(this).toggleClass('active', $(this).data('scope') === scope);
    });

    // If they click a time scope while in detail view, return to index
    if (logViewState.currentView === 'detail') {
        viewHoursIndex();
    } else {
        renderLootLog();
    }
}

function toggleLogTier(tier) {
    if (logViewState.activeTiers.has(tier)) {
        logViewState.activeTiers.delete(tier);
    } else {
        logViewState.activeTiers.add(tier);
    }

    // Update circle active states
    $(`.tier-filters .tier-circle.tier-${tier}`).toggleClass('active', logViewState.activeTiers.has(tier));

    renderLootLog();
}

function renderLootLog() {
    const content = document.getElementById('loot-log-content');
    const headerTitle = document.querySelector('.modal-header h2');
    if (!content) return;

    // 1. Get Base Data Filtered by Time Scope
    let filteredHistory = lootLogHistory;
    const now = new Date();

    if (logViewState.timeScope === 'session') {
        filteredHistory = filteredHistory.filter(item => item.rawTime >= sessionStartTime);
    } else if (logViewState.timeScope === 'today') {
        const todayStr = now.toLocaleDateString();
        filteredHistory = filteredHistory.filter(item => item.dateLabel === todayStr);
    }

    // 2. Filter by Active Tiers
    filteredHistory = filteredHistory.filter(item => {
        const has = logViewState.activeTiers.has(item.tier);
        return has;
    });

    // 3. Filter by Active Category (currently only 'drops' is populated)
    // This is a placeholder for future categories like 'spending', 'rewards'
    if (logViewState.activeCategory === 'drops') {
        // No additional filtering needed as lootLogHistory only contains drops
    } else {
        filteredHistory = []; // Clear if category is not 'drops' for now
    }


    console.log(`[LOOT] Rendering Log: ${filteredHistory.length} items (Tiers: ${Array.from(logViewState.activeTiers).join(',')})`);

    if (filteredHistory.length === 0) {
        headerTitle.innerHTML = "God's Loot Ledger";
        content.innerHTML = `<div class="empty-log-msg">Your ledger is empty for these filters, God.</div>`;

        // Clean up Clusterize if items are gone, so it re-inits correctly later
        if (logViewState.clusterize) {
            logViewState.clusterize.destroy();
            logViewState.clusterize = null;
        }
        return;
    }

    if (logViewState.currentView === 'index') {
        renderHoursIndex(content, headerTitle, filteredHistory);
    } else {
        renderDetailLog(content, headerTitle, filteredHistory);
    }
}

function renderHoursIndex(content, headerTitle, data) {
    headerTitle.innerHTML = "God's Loot Ledger";
    content.innerHTML = ''; // Explicit clear for hours index

    // Group logs by hourLabel for count mapping
    const hoursMap = {};
    data.forEach(item => {
        if (!hoursMap[item.hourLabel]) hoursMap[item.hourLabel] = 0;
        hoursMap[item.hourLabel]++;
    });

    // Generate last 24 hours window for logical display
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

        const safeHour = hour.replace(':', '-');
        btn.className = `loot-log-hour-btn ${isDisabled ? 'disabled' : ''}`;
        btn.setAttribute('data-hour', hour);
        btn.innerHTML = `
            <span class="hour-text">${hour} ${i === 0 ? '<small>(Current)</small>' : ''}</span>
            <span class="hour-count" id="log-count-${safeHour}">${isDisabled ? 'No History' : count + ' Drops Recorded'}</span>
            <div class="fleur-de-lis">📜</div>
        `;

        if (!isDisabled) {
            btn.onclick = () => viewHourLog(hour);
        }
        content.appendChild(btn);
    });
}

function renderDetailLog(content, headerTitle, data) {
    const $content = $(content);
    headerTitle.innerHTML = `Loot Log: ${logViewState.currentHour}`;

    const filteredHistory = data.filter(item => item.hourLabel === logViewState.currentHour);

    // 1. Initial Setup for Clusterize
    if (!$content.find('.clusterize-scroll').length) {
        $content.empty();

        const $backBtn = $('<div class="log-back-btn">← Back to Ledger Index</div>')
            .on('click', viewHoursIndex);
        $content.append($backBtn);

        const $scrollArea = $('<div id="loot-log-scroll-area" class="clusterize-scroll"></div>');
        const $contentArea = $('<div id="loot-log-content-area" class="clusterize-content"></div>'); // Renamed to avoid ID conflict
        $scrollArea.append($contentArea);
        $content.append($scrollArea);
    }

    // Destroy existing clusterize instance before creating a new one
    if (logViewState.clusterize) {
        logViewState.clusterize.destroy();
        logViewState.clusterize = null;
    }

    // Grid Mode Logic (Zoom < 0.4)
    if (logViewState.zoom < 0.4) {
        // Render 2 items per row
        const gridRows = [];
        for (let i = 0; i < filteredHistory.length; i += 2) {
            const item1 = filteredHistory[i];
            const item2 = filteredHistory[i + 1];

            let rowHtml = `<div class="loot-log-row-grid">`;
            rowHtml += renderGridItem(item1);
            if (item2) rowHtml += renderGridItem(item2);
            rowHtml += `</div>`;
            gridRows.push(rowHtml);
        }

        logViewState.clusterize = new Clusterize({
            rows: gridRows,
            scrollId: 'loot-log-scroll-area',
            contentId: 'loot-log-content-area',
            rows_in_block: 20
        });
        return;

    }

    // Standard List Mode
    // Calculate dynamic sizes based on Zoom (1.0 = 110px row, 90px icon)
    // Min Size (at zoom 0.4): ~60px row, 40px icon
    const baseHeight = 110;
    const minHeight = 60;
    const rowHeight = Math.max(minHeight, minHeight + (baseHeight - minHeight) * ((logViewState.zoom - 0.4) / 0.6));

    // Pass scale info to renderDetailLogRows
    const listRows = filteredHistory.map(item => renderDetailRow(item, rowHeight, logViewState.zoom));

    // 4. Init Clusterize
    logViewState.clusterize = new Clusterize({
        rows: listRows,
        scrollId: 'loot-log-scroll-area',
        contentId: 'loot-log-content-area',
        rows_in_block: 50 // Render more rows since they might be smaller
    });
}

function renderGridItem(itemData) {
    const itemCfg = LOOT_CONFIG.ITEMS[itemData.id];
    if (!itemCfg) return '';

    return `
        <div class="loot-grid-item loot-tier-${itemData.tier}">
             <div class="loot-icon-wrapper">
                <div class="loot-icon-bg"></div>
                <img src="${itemCfg.icon}" class="loot-icon" alt="${itemCfg.name}" style="width: 40px; height: 40px;">
            </div>
            <div class="loot-text">
                <span class="loot-amount" style="font-size: 14px;">${itemData.amount.toLocaleString()}</span>
                <span class="loot-name shimmer-text" style="font-size: 11px;">${itemCfg.name}</span>
            </div>
        </div>
    `;
}

function renderDetailRow(itemData, height, zoom) {
    const itemCfg = LOOT_CONFIG.ITEMS[itemData.id];
    if (!itemCfg) return '';

    // Calculate dynamic icon sizes
    // Base Icon Wrapper: 90px, Min: 40px
    const baseWrapper = 90;
    const minWrapper = 40;
    const wrapperSize = Math.floor(minWrapper + (baseWrapper - minWrapper) * ((zoom - 0.4) / 0.6));

    // Scale white center (ratio ~0.86)
    const whiteCenter = Math.floor(wrapperSize * 0.86);

    // Scale image (ratio ~0.77)
    const imgSize = Math.floor(wrapperSize * 0.77);

    return `
        <div class="loot-log-row loot-tier-${itemData.tier}">
            <div class="log-timestamp" style="line-height: ${height}px;">${itemData.timestamp}</div>
            <div class="loot-item in-log" style="height: ${height}px !important;">
                <div class="loot-box">
                    <div class="loot-text">
                        <span class="loot-amount">${itemData.amount.toLocaleString()}</span>
                        <span class="loot-name shimmer-text">${itemCfg.name}</span>
                    </div>
                </div>
                <div class="loot-icon-wrapper" style="width: ${wrapperSize}px !important; height: ${wrapperSize}px !important;">
                    <div class="loot-icon-bg"><style>.in-log .loot-icon-wrapper[style*="width: ${wrapperSize}px"] .loot-icon-bg::before { width: ${whiteCenter}px !important; height: ${whiteCenter}px !important; }</style></div>
                    <img src="${itemCfg.icon}" class="loot-icon" alt="${itemCfg.name}" style="width: ${imgSize}px !important; height: ${imgSize}px !important;">
                </div>
            </div>
        </div>
    `;
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
