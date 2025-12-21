/**
 * LOOT PERSISTENCE SERVICE
 * 
 * This module manages the permanent storage of the "God's Loot Ledger" using localStorage.
 * It handles raw data compression (Base36/CSV) and memory synchronization.
 * 
 * LOCATED IN: js/systems/loot/loot-persistence.js
 * 
 * -------------------------------------------------------------------------
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [Loot Manager]: Calls .add() whenever an item is dropped to persist it.
 * 2. [Loot Ledger UI]: Uses .syncMemory() and .syncEntry() to populate the modal.
 * 3. [Loot Logic]: Uses item IDs defined in js/core/config/loot-config.js for storage efficiency.
 * -------------------------------------------------------------------------
 */

const LootPersistence = {
    STORAGE_KEY: 'god_loot_ledger_v1',
    BUFFER: '', // Raw CSV-like string: "id:time:amt:lucky:tier,..."

    /**
     * INITIALIZE PERSISTENCE
     * Loads the raw buffer from localStorage on game start.
     * Affected by: Browser privacy settings (localStorage availability).
     */
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
     * PERSIST NEW DROP
     * Saves a drop to the buffer and triggers UI updates if the ledger is open.
     * 
     * @param {number} id - Item ID (from loot-config.js)
     * @param {number} amount - Quantity
     * @param {boolean} isLucky - Lucky hit flag
     * @param {string} tier - Tier ID (normal, epic, etc)
     * 
     * AFFECTED BY: 
     * - logViewState (Global state in loot-filters.js) - determines if live UI updates happen.
     * - lootLogHistory (Array in this file) - updated in memory for fast retrieval.
     */
    add(id, amount, isLucky = false, tier = 'normal') {
        const timeBase36 = Date.now().toString(36);
        const amtBase36 = amount.toString(36);
        const luckyFlag = isLucky ? '1' : '0';
        const entry = `${id}:${timeBase36}:${amtBase36}:${luckyFlag}:${tier}`;

        if (this.BUFFER) this.BUFFER += ',';
        this.BUFFER += entry;

        // Save to browser storage
        localStorage.setItem(this.STORAGE_KEY, this.BUFFER);

        // LIVE UI UPDATE: If the ledger modal is currently visible
        const modal = document.getElementById('loot-log-modal');
        if (modal) {
            this.syncEntry(id, Date.now(), amount, isLucky, tier);

            // Update hour counts in the Index View (Defined in loot-renderer.js)
            const now = new Date();
            const hourLabel = now.toLocaleTimeString([], { hour: '2-digit', hour12: false }) + ":00";
            const safeHour = hourLabel.replace(':', '-');

            if (typeof logViewState !== 'undefined' && logViewState.currentView === 'index') {
                const countEl = document.getElementById(`log-count-${safeHour}`);
                if (countEl) {
                    const hourCount = lootLogHistory.filter(item => item.hourLabel === hourLabel).length;
                    countEl.innerText = `${hourCount} Drops Recorded`;

                    const btn = countEl.closest('.loot-log-hour-btn');
                    if (btn && btn.classList.contains('disabled')) {
                        btn.classList.remove('disabled');
                        // viewHourLog defined in loot-filters.js
                        if (typeof viewHourLog === 'function') btn.onclick = () => viewHourLog(hourLabel);
                    }
                }
            } else if (typeof logViewState !== 'undefined' && logViewState.currentView === 'detail' && logViewState.currentHour === hourLabel) {
                // Refresh list if looking at the current hour (Defined in loot-renderer.js)
                if (typeof renderLootLog === 'function') renderLootLog();
            }
        }
    },

    /**
     * SYNC MEMORY FROM BUFFER
     * Parses the raw string into the 'lootLogHistory' array for active use.
     * Typically called when opening the Ledger (openLootLog in loot-ui.js).
     */
    syncMemory() {
        lootLogHistory.length = 0; // Clear current memory array
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
            const lucky = luckyFlag === '1';
            const finalTier = tier || 'normal';

            this.syncEntry(id, time, amt, lucky, finalTier, false);
        });

        // Sort newest first
        lootLogHistory.sort((a, b) => b.rawTime - a.rawTime);
    },

    /**
     * SYNC SINGLE ENTRY
     * Internal helper to format a raw entry for the memory array.
     */
    syncEntry(id, time, amt, isLucky = false, tier = 'normal', sort = true) {
        // Reverse lookup itemKey from ID (Depends on loot-config.js)
        const itemKey = Object.keys(LOOT_CONFIG.ITEMS).find(k => LOOT_CONFIG.ITEMS[k].id === id);
        if (!itemKey) return;

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

// GLOBAL LOOT HISTORY ARRAYS
const lootLogHistory = []; // Master parsed log
const lootHistory = [];    // Temporary "Stairs" overlay log (length 5)
const sessionStartTime = Date.now();
