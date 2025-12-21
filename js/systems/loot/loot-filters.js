/**
 * LOOT FILTERS & STATE
 * 
 * Manages the interactive state of the Ledger, including zoom levels, 
 * active categories, and tier-specific visibility toggles.
 * 
 * LOCATED IN: js/systems/loot/loot-filters.js
 * 
 * -------------------------------------------------------------------------
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [Loot UI]: createLootLogModal() uses this state for the initial build.
 * 2. [Loot Renderer]: renderLootLog() depends on this state for all filtering logic.
 * 3. [Loot Persistence]: syncMemory() is called by openLootLog to prepare data.
 * 4. [Clusterize.js]: Virtual list instance is stored and managed here.
 * -------------------------------------------------------------------------
 */

/**
 * GLOBAL LEDGER STATE
 * Shared metadata used to control what is displayed in the modal.
 */
let logViewState = {
    currentView: 'index',   // 'index' (Hours List) or 'detail' (Item list for specific hour)
    currentHour: null,
    timeScope: 'all',       // 'session', 'today', 'all'
    activeTiers: new Set(['normal', 'epic', 'god', 'alpha', 'omega']),
    activeCategory: 'drops',
    zoom: 1.0,              // 0.0 (Minimal/Grid) to 1.0 (Detailed/List)
    clusterize: null,       // Pointer to the active Virtual Scroll instance
    scrollPos: 0
};

/**
 * OPEN LOOT LEDGER
 * Triggered by the "Loot Log" button in the HUD.
 */
function openLootLog() {
    const modal = createLootLogModal(); // Defined in loot-ui.js

    // Load hour counts (instant from localStorage)
    if (typeof LootPersistence !== 'undefined') {
        LootPersistence.syncMemory();
    }

    logViewState.currentView = 'index';
    logViewState.currentHour = null;

    // Trigger router render (Defined in loot-renderer.js)
    if (typeof renderLootLog === 'function') renderLootLog();

    // Fade-in animation
    requestAnimationFrame(() => {
        modal.classList.remove('hidden');
        modal.classList.add('visible');
    });
}

/**
 * CLOSE LOOT LEDGER
 * Dismisses the modal and cleans up high-memory objects.
 */
function closeLootLog() {
    const modal = document.getElementById('loot-log-modal');
    if (!modal) return;

    modal.classList.remove('visible');

    // PERFORMANCE: Destroy Virtual List instance and clear memory arrays
    if (logViewState.clusterize) {
        logViewState.clusterize.destroy();
        logViewState.clusterize = null;
    }

    setTimeout(() => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
        // Clear heavy memory array since we aren't looking at it
        if (typeof lootLogHistory !== 'undefined') lootLogHistory.length = 0;
    }, 300);
}

/**
 * HANDLE ZOOM (View Resize)
 * Updates a global CSS variable for zero-latency UI scaling.
 * 
 * @param {number} val - Slider value (0-100)
 * 
 * AFFECTED BY: 
 * - loot-ledger-modal.css: Uses --loot-zoom to scale font-size and row height.
 */
function handleLogZoom(val) {
    const prevZoom = logViewState.zoom;
    const zoomLevel = parseInt(val) / 100;
    logViewState.zoom = zoomLevel;

    const modal = document.getElementById('loot-log-modal');
    if (modal) {
        modal.style.setProperty('--loot-zoom', zoomLevel);
    }

    // GRID SWITCH: If zoom crosses below 40%, we switch row templates
    const GRID_THRESHOLD = 0.4;
    const wasGrid = prevZoom < GRID_THRESHOLD;
    const isGrid = zoomLevel < GRID_THRESHOLD;

    if (wasGrid !== isGrid && logViewState.currentView === 'detail') {
        renderLootLog(); // Force re-construction of virtual rows
    }
}

/**
 * INTERACTION HANDLERS
 */
function viewHourLog(hour) {
    logViewState.currentView = 'detail';
    logViewState.currentHour = hour;
    if (logViewState.clusterize) logViewState.clusterize.destroy();

    // Load hour details on-demand (only if not already cached)
    if (typeof LootPersistence !== 'undefined') {
        // Clear lootLogHistory and load only this hour's entries
        lootLogHistory.length = 0;
        LootPersistence.syncHourDetails(hour);
    }

    if (typeof renderLootLog === 'function') renderLootLog();
}

function viewHoursIndex() {
    logViewState.currentView = 'index';
    logViewState.currentHour = null;
    if (logViewState.clusterize) logViewState.clusterize.destroy();
    if (typeof renderLootLog === 'function') renderLootLog();
}

function setLogTimeScope(scope) {
    logViewState.timeScope = scope;
    $('.time-filters .filter-btn').each(function () {
        $(this).toggleClass('active', $(this).data('scope') === scope);
    });
    // Return to dashboard if scope changes
    if (logViewState.currentView === 'detail') viewHoursIndex();
    else if (typeof renderLootLog === 'function') renderLootLog();
}

function toggleLogTier(tier) {
    if (logViewState.activeTiers.has(tier)) logViewState.activeTiers.delete(tier);
    else logViewState.activeTiers.add(tier);

    $(`.tier-filters .tier-circle.tier-${tier}`).toggleClass('active', logViewState.activeTiers.has(tier));
    if (typeof renderLootLog === 'function') renderLootLog();
}

// NEW: Reward filter active state
function toggleRewardFilter(filter) {
    if (logViewState.rewardFilter === filter) return; // Already active
    logViewState.rewardFilter = filter;

    // Visual Update
    $('.reward-filters .reward-btn').removeClass('active');
    $(`.reward-filters .reward-btn:contains('${filter.charAt(0).toUpperCase() + filter.slice(1)}')`).addClass('active'); // Simple text match or specific ID needed?
    // Better: Add data attributes in HTML or just use index.
    // Let's assume the button click passed the string.
    // Actually, let's just re-select by onclick since I didn't add IDs.
    // Or just look for the text content.
    // User asked for "Daily", "Monthly".
    // I'll assume the button update happens in the renderer or here via simple class toggle.

    // Manual class toggle for now (since no renderer logic for this yet)
    const btns = document.querySelectorAll('.reward-filters .reward-btn');
    btns.forEach(b => {
        if (b.innerText.toLowerCase().includes(filter) || (filter === 'special' && b.innerText.includes('Special'))) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });

    if (typeof renderLootLog === 'function') renderLootLog();
}

function setLogCategory(cat) {
    logViewState.activeCategory = cat;

    // Toggle Button Active State
    $('.category-filters .cat-btn').removeClass('active');
    $(`.category-filters .cat-btn`).each(function () {
        const txt = $(this).text().toLowerCase();
        if (txt.includes(cat) || (cat === 'drops' && txt.includes('monster'))) $(this).addClass('active');
    });

    // Toggle Filter Containers
    if (cat === 'rewards') {
        $('#filters-drops').hide();
        $('#filters-rewards').css('display', 'flex'); // Flex for alignment
    } else if (cat === 'drops') {
        $('#filters-rewards').hide();
        $('#filters-drops').css('display', 'flex');
    } else {
        // Other cats (Spending) might not have filters?
        $('#filters-drops').hide();
        $('#filters-rewards').hide();
    }

    if (typeof renderLootLog === 'function') renderLootLog();
}
