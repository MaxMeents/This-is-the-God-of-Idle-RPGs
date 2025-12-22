/**
 * LOOT RENDERER
 * 
 * The visual engine for the Ledger. Handles high-performance list rendering
 * using Clusterize.js and manages view state switching.
 * 
 * LOCATED IN: js/systems/loot/loot-renderer.js
 * 
 * -------------------------------------------------------------------------
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [loot-filters.js]: Reads 'logViewState' to determine filters and zoom.
 * 2. [loot-persistence.js]: Reads 'lootLogHistory' as the primary data source.
 * 3. [loot-ledger-modal.css]: Styles for row layouts (Grid vs List).
 * 4. [Clusterize.js]: Required globally for virtual scrolling.
 * 5. [jQuery]: Required for efficient DOM manipulation in these functions.
 * -------------------------------------------------------------------------
 */

/**
 * MAIN LOG ROUTER
 * Orchestrates filtering and selects whether to show the Hour Index or the Item Detail.
 * 
 * AFFECTED BY: logViewState (TimeScope, ActiveTiers, Category)
 */
function renderLootLog() {
    const content = document.getElementById('loot-log-content');
    const headerTitle = document.querySelector('.modal-header h2');
    if (!content) return;

    // INDEX VIEW: Just show hour counts (no data filtering needed)
    if (logViewState.currentView === 'index') {
        renderHoursIndex(content, headerTitle, null);
        return;
    }

    // DETAIL VIEW: Filter lootLogHistory for the specific hour
    let filteredHistory = lootLogHistory;
    if (logViewState.timeScope === 'session') {
        filteredHistory = filteredHistory.filter(item => item.rawTime >= sessionStartTime);
    } else if (logViewState.timeScope === 'today') {
        const todayStr = new Date().toLocaleDateString();
        filteredHistory = filteredHistory.filter(item => item.dateLabel === todayStr);
    }

    // FILTER BY TIER TOGGLES (Set in loot-filters.js)
    filteredHistory = filteredHistory.filter(item => logViewState.activeTiers.has(item.tier));

    // CATEGORY SWITCHING (Placeholder for spending/rewards)
    if (logViewState.activeCategory !== 'drops') filteredHistory = [];

    // EMPTY STATE HANDLING
    if (filteredHistory.length === 0) {
        headerTitle.innerHTML = "God's Loot Ledger";
        content.innerHTML = `<div class="empty-log-msg">Your ledger is empty for these filters, God.</div>`;
        if (logViewState.clusterize) {
            logViewState.clusterize.destroy();
            logViewState.clusterize = null;
        }
        return;
    }

    // DETAIL VIEW
    renderDetailLog(content, headerTitle, filteredHistory);
}

/**
 * RENDER HOURS INDEX
 * Dashboard view showing individual hour buttons with drop counts.
 */
function renderHoursIndex(content, headerTitle, data) {
    headerTitle.innerHTML = "God's Loot Ledger";
    content.innerHTML = '';

    // Use cached hour counts (FAST - no array filtering needed)
    const hoursMap = (typeof LootPersistence !== 'undefined' && LootPersistence.hourCounts)
        ? LootPersistence.hourCounts
        : {};

    // Display window for last 24 hours
    const now = new Date();
    for (let i = 0; i < 24; i++) {
        const d = new Date(now);
        d.setHours(now.getHours() - i);
        const hour = d.toLocaleTimeString([], { hour: '2-digit', hour12: false }) + ":00";
        const count = hoursMap[hour] || 0;
        const isDisabled = count === 0;

        const btn = document.createElement('div');
        btn.className = `loot-log-hour-btn ${isDisabled ? 'disabled' : ''}`;
        btn.innerHTML = `
            <span class="hour-text">${hour} ${i === 0 ? '<small>(Current)</small>' : ''}</span>
            <span class="hour-count" id="log-count-${hour.replace(':', '-')}">${isDisabled ? 'No History' : formatGodNumber(count) + ' Drops Recorded'}</span>
            <div class="fleur-de-lis">📜</div>
        `;

        if (!isDisabled) {
            // viewHourLog defined in loot-filters.js
            btn.onclick = () => viewHourLog(hour);
        }
        content.appendChild(btn);
    }
}

/**
 * RENDER DETAIL LOG (Virtual List)
 * Uses Clusterize.js to render thousands of rows with zero lag.
 */
function renderDetailLog(content, headerTitle, data) {
    const $content = $(content);
    headerTitle.innerHTML = `Loot Log: ${logViewState.currentHour}`;

    // Filter to specific selected hour (Set when clicking hour button)
    const filteredHistory = data.filter(item => item.hourLabel === logViewState.currentHour);

    // SCRUB & SETUP SCROLL AREA
    if (!$content.find('.clusterize-scroll').length) {
        $content.empty();
        const $backBtn = $('<div class="log-back-btn">← Back to Ledger Index</div>').on('click', viewHoursIndex);
        $content.append($backBtn);
        $content.append('<div id="loot-log-scroll-area" class="clusterize-scroll"><div id="loot-log-content-area" class="clusterize-content"></div></div>');
    }

    // GRID MODE ROUTING (Triggered by Zoom Slider in loot-filters.js)
    if (logViewState.zoom < 0.4) {
        const gridRows = [];
        for (let i = 0; i < filteredHistory.length; i += 2) {
            let rowHtml = `<div class="loot-log-row-grid">${renderGridItem(filteredHistory[i])}`;
            if (filteredHistory[i + 1]) rowHtml += renderGridItem(filteredHistory[i + 1]);
            rowHtml += `</div>`;
            gridRows.push(rowHtml);
        }

        // PERFORMANCE: Use update() instead of destroy/recreate
        if (logViewState.clusterize) {
            logViewState.clusterize.update(gridRows);
        } else {
            logViewState.clusterize = new Clusterize({
                rows: gridRows,
                scrollId: 'loot-log-scroll-area',
                contentId: 'loot-log-content-area',
                rows_in_block: 100, // Increased for larger pre-load buffer
                callbacks: {
                    clusterChanged: () => {
                        if (window.lootObserver) window.lootObserver.observe();
                    }
                }
            });
        }
        return;
    }

    // STANDARD LIST MODE
    const listRows = filteredHistory.map(item => renderDetailRow(item));

    // PERFORMANCE: Use update() instead of destroy/recreate
    if (logViewState.clusterize) {
        logViewState.clusterize.update(listRows);
    } else {
        logViewState.clusterize = new Clusterize({
            rows: listRows,
            scrollId: 'loot-log-scroll-area',
            contentId: 'loot-log-content-area',
            rows_in_block: 100, // Increased for larger pre-load buffer
            callbacks: {
                clusterChanged: () => {
                    if (window.lootObserver) window.lootObserver.observe();
                }
            }
        });
    }
}

/**
 * HTML TEMPLATES
 * Controlled by --loot-zoom (CSS Variable) for instant scaling.
 */
function renderGridItem(itemData) {
    const itemCfg = LOOT_CONFIG.ITEMS[itemData.itemKey];
    return `
        <div class="loot-grid-item loot-tier-${itemData.tier}">
            <div class="loot-text">
                <span class="loot-amount" style="font-size: 14px;">${formatGodNumber(itemData.amount)}</span>
                <span class="loot-name shimmer-text" style="font-size: 11px;">${itemCfg.name}</span>
            </div>
             <div class="loot-icon-wrapper">
                <div class="loot-icon-bg"></div>
                <img data-src="${itemCfg.icon}" class="loot-icon lozad" alt="${itemCfg.name}" style="width: 40px; height: 40px;">
            </div>
        </div>
    `;
}

function renderDetailRow(itemData) {
    const itemCfg = LOOT_CONFIG.ITEMS[itemData.itemKey];
    return `
        <div class="loot-log-row loot-tier-${itemData.tier}">
            <div class="log-timestamp">${itemData.timestamp}</div>
            <div class="loot-item in-log">
                <div class="loot-box">
                    <div class="loot-text">
                        <span class="loot-amount">${formatGodNumber(itemData.amount)}</span>
                        <span class="loot-name shimmer-text">${itemCfg.name}</span>
                    </div>
                </div>
                <div class="loot-icon-wrapper">
                    <div class="loot-icon-bg"></div>
                    <img data-src="${itemCfg.icon}" class="loot-icon lozad" alt="${itemCfg.name}">
                </div>
            </div>
        </div>
    `;
}
