/**
 * LOOT UI SYSTEM
 * 
 * Manages the high-level DOM structures for notifications and the Ledger modal.
 * 
 * LOCATED IN: js/systems/loot/loot-ui.js
 * 
 * -------------------------------------------------------------------------
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [index.html]: Requires script tags for Clusterize.js and Lozad.js.
 * 2. [Loot Renderer]: renderLootLog() is called when the modal opens.
 * 3. [Loot Filters]: openLootLog and closeLootLog manage the modal state.
 * 4. [main.css]: Uses premium-hud-btn styles for the trigger.
 * -------------------------------------------------------------------------
 */

// GLOBAL OBSERVER for Lazy Loading (Lozad.js)
window.lootObserver = null;

/**
 * INITIALIZE LOOT HUD
 * Creates the hidden container for the "Stairs" and the specialized trigger button.
 * Called once during game startup.
 */
function initLootSystem() {
    if (document.getElementById('loot-history-container')) return;

    const ui = document.getElementById('ui');

    // Container for active drop notifications
    const container = document.createElement('div');
    container.id = 'loot-history-container';
    ui.appendChild(container);

    // Initialize the storage service (loot-persistence.js)
    if (typeof LootPersistence !== 'undefined') LootPersistence.init();

    // Initialize Lozad Observer (Lazy Loading)
    if (typeof lozad === 'function' && !window.lootObserver) {
        window.lootObserver = lozad('.lozad', {
            rootMargin: '800px 0px', // Significantly increased for faster pre-loading
            threshold: 0.1
        });
        window.lootObserver.observe();
    }

    // Create the "God's Loot Ledger" trigger button
    // PLACED INSIDE SPEED CONTROLS (Requested by User)
    const speedControls = document.getElementById('speed-ctrl-container');
    if (speedControls) {
        // Add a separator/container if needed, or just append since flex-gap handles it
        const btn = document.createElement('div');
        btn.id = 'loot-log-trigger';
        // We set the text directly, CSS will handle the rest
        btn.innerText = "GOD'S LOOT LEDGER";
        btn.onclick = openLootLog;
        speedControls.appendChild(btn);
    } else {
        // Fallback to main UI if speed controls missing
        const btn = document.createElement('div');
        btn.id = 'loot-log-trigger';
        btn.className = 'premium-hud-btn';
        btn.innerText = "GOD'S LOOT LEDGER";
        btn.onclick = openLootLog;
        ui.appendChild(btn);
    }
}

/**
 * CREATE MODAL STRUCTURE
 * Injects the massive Ledger modal HTML into the body.
 * Deferred until the user actually opens the log to save initial load memory.
 * 
 * AFFECTED BY:
 * - logViewState: Initial --loot-zoom and filter states are injected here.
 * - loot-ledger-modal.css: Provides the structure and glassmorphism styling.
 */
function createLootLogModal() {
    let modal = document.getElementById('loot-log-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'loot-log-modal';
    modal.className = 'modal-backdrop hidden';

    // Set initial scale from state (Defined in loot-filters.js)
    if (typeof logViewState !== 'undefined') {
        modal.style.setProperty('--loot-zoom', logViewState.zoom);
    }

    // Dismiss on backdrop click
    modal.onclick = (e) => { if (e.target === modal) closeLootLog(); };

    modal.innerHTML = `
        <div class="modal-panel loot-log-panel">
            <div class="modal-header">
                <h2>God's Loot Ledger</h2>
                <div class="close-btn" onclick="closeLootLog()">×</div>
            </div>
            
            <!-- FILTER BAR (Actions handled in loot-filters.js) -->
            <div id="ledger-filter-bar" class="ledger-filter-bar">
                <div class="time-filters">
                    <button class="filter-btn" data-scope="session" onclick="setLogTimeScope('session')">Session</button>
                    <button class="filter-btn" data-scope="today" onclick="setLogTimeScope('today')">Today</button>
                    <button class="filter-btn active" data-scope="all" onclick="setLogTimeScope('all')">All Time</button>
                </div>
                
                <div class="category-filters">
                    <button class="cat-btn" onclick="setLogCategory('spending')">Spending</button>
                    <button class="cat-btn active" onclick="setLogCategory('drops')">Monster Drops</button>
                    <button class="cat-btn" onclick="setLogCategory('rewards')">Rewards</button>
                </div>
                
                <div id="filters-drops" class="tier-filters">
                    <div class="tier-circle tier-normal active" onclick="toggleLogTier('normal')"></div>
                    <div class="tier-circle tier-epic active" onclick="toggleLogTier('epic')"></div>
                    <div class="tier-circle tier-god active" onclick="toggleLogTier('god')"></div>
                    <div class="tier-circle tier-omega active" onclick="toggleLogTier('omega')"></div>
                    <div class="tier-circle tier-alpha active" onclick="toggleLogTier('alpha')"></div>
                </div>

                <!-- REWARDS FILTERS (Hidden by default, shown when 'Rewards' cat is active) -->
                <div id="filters-rewards" class="reward-filters" style="display: none;">
                    <button class="reward-btn" onclick="toggleRewardFilter('daily')">Daily</button>
                    <button class="reward-btn" onclick="toggleRewardFilter('monthly')">Monthly</button>
                    <button class="reward-btn" onclick="toggleRewardFilter('yearly')">Yearly</button>
                    <button class="reward-btn special" onclick="toggleRewardFilter('special')">Special Chance</button>
                </div>
            </div>
            
            <!-- ZOOM INTERFACE -->
            <div class="zoom-controls">
                <span class="zoom-label">View Size</span>
                <input type="range" min="0" max="100" value="${(typeof logViewState !== 'undefined' ? logViewState.zoom : 1) * 100}" class="zoom-slider" oninput="handleLogZoom(this.value)">
                <span class="zoom-label">Grid Mode</span>
            </div>
            
            <!-- CONTENT AREA (Populated by loot-renderer.js) -->
            <div id="loot-log-content" class="modal-body custom-scrollbar">
                <!-- Hour buttons or Item list dynamically injected -->
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
}
