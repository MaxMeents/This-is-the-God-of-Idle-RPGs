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

    // RE-SYNC ALL PERSISTENT DATA before viewing
    if (typeof LootPersistence !== 'undefined') LootPersistence.syncMemory();

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

function setLogCategory(cat) {
    logViewState.activeCategory = cat;
    $('.category-filters .cat-btn').removeClass('active');
    // jQuery text match for active state
    $(`.category-filters .cat-btn`).each(function () {
        const txt = $(this).text().toLowerCase();
        if (txt.includes(cat) || (cat === 'drops' && txt.includes('monster'))) $(this).addClass('active');
    });
    if (typeof renderLootLog === 'function') renderLootLog();
}
