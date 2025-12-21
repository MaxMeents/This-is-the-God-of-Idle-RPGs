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
        const now = Date.now();
        const date = new Date(now);
        const timeBase36 = now.toString(36);
        const amtBase36 = amount.toString(36);
        const luckyFlag = isLucky ? '1' : '0';
        const entry = `${id}:${timeBase36}:${amtBase36}:${luckyFlag}:${tier}`;

        // 1. RAW BUFFER UPDATE (The Source of Truth)
        if (this.BUFFER) this.BUFFER += ',';
        this.BUFFER += entry;
        localStorage.setItem(this.STORAGE_KEY, this.BUFFER);

        // 2. LIVE CACHE UPDATE (Fixes the delay/missed drops issue)
        // We must update the hourCounts and specific Hour Data in localStorage immediately
        // so that if the user opens the log or switches views, it reads FRESH data.

        const hourLabel = date.toLocaleTimeString([], { hour: '2-digit', hour12: false }) + ":00";

        // Ensure hourCounts is loaded/ready
        if (!this.hourCounts) this.syncMemory();

        // Increment Count
        if (!this.hourCounts[hourLabel]) this.hourCounts[hourLabel] = 0;
        this.hourCounts[hourLabel]++;
        localStorage.setItem(this.STORAGE_KEY + '_counts', JSON.stringify(this.hourCounts));

        // Update Specific Hour Data Cache
        const itemKey = Object.keys(LOOT_CONFIG.ITEMS).find(k => LOOT_CONFIG.ITEMS[k].id === id);
        if (itemKey) {
            const hourKey = this.STORAGE_KEY + '_hour_' + hourLabel.replace(':', '_');
            let hourList = [];

            // Try to read existing cache
            const storedHour = localStorage.getItem(hourKey);
            if (storedHour) {
                try { hourList = JSON.parse(storedHour); } catch (e) { }
            }

            // Create new entry object
            const newEntry = {
                itemKey,
                amount,
                tier,
                rawTime: now,
                timestamp: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
                hourLabel: hourLabel,
                dateLabel: date.toLocaleDateString(),
                isLucky
            };

            // Add and Sort (Newest first)
            hourList.push(newEntry);
            hourList.sort((a, b) => b.rawTime - a.rawTime);

            // Write back to LS
            localStorage.setItem(hourKey, JSON.stringify(hourList));
        }

        // 3. LIVE UI UPDATE (If modal is visible)
        const modal = document.getElementById('loot-log-modal');
        if (modal) {
            this.syncEntry(id, now, amount, isLucky, tier);

            // Update hour counts in the Index View
            const safeHour = hourLabel.replace(':', '-');

            if (typeof logViewState !== 'undefined' && logViewState.currentView === 'index') {
                const countEl = document.getElementById(`log-count-${safeHour}`);
                if (countEl) {
                    countEl.innerText = `${this.hourCounts[hourLabel]} Drops Recorded`; // Use live count

                    const btn = countEl.closest('.loot-log-hour-btn');
                    if (btn && btn.classList.contains('disabled')) {
                        btn.classList.remove('disabled');
                        if (typeof viewHourLog === 'function') btn.onclick = () => viewHourLog(hourLabel);
                    }
                }
            } else if (typeof logViewState !== 'undefined' && logViewState.currentView === 'detail' && logViewState.currentHour === hourLabel) {
                // Refresh list if looking at the current hour
                if (typeof renderLootLog === 'function') renderLootLog();
            }
        }
    },

    /**
     * SYNC MEMORY FROM BUFFER
     * Only loads hour counts from localStorage - no parsing needed!
     */
    syncMemory() {
        // Load pre-computed hour counts from localStorage
        const countsKey = this.STORAGE_KEY + '_counts';
        const storedCounts = localStorage.getItem(countsKey);

        if (storedCounts) {
            this.hourCounts = JSON.parse(storedCounts);
            console.log(`[LOOT] Loaded hour counts for ${Object.keys(this.hourCounts).length} hours (instant)`);
        } else {
            // First time - need to build counts
            this.rebuildHourCounts();
        }
    },

    /**
     * REBUILD HOUR COUNTS
     * Only called once when counts don't exist in localStorage
     */
    rebuildHourCounts() {
        if (!this.BUFFER) return;

        const entries = this.BUFFER.split(',');
        console.log(`[LOOT] Building hour counts for ${entries.length} entries...`);

        this.hourCounts = {};
        const hourData = {}; // Store parsed entries by hour

        entries.forEach(e => {
            if (!e) return;
            const parts = e.split(':');
            if (parts.length < 3) return;

            const [idStr, timeBase36, amtBase36, luckyFlag, tier] = parts;
            const time = parseInt(timeBase36, 36);
            const date = new Date(time);
            const hourLabel = date.toLocaleTimeString([], { hour: '2-digit', hour12: false }) + ":00";

            // Increment count
            if (!this.hourCounts[hourLabel]) this.hourCounts[hourLabel] = 0;
            this.hourCounts[hourLabel]++;

            // Store parsed entry for this hour
            if (!hourData[hourLabel]) hourData[hourLabel] = [];

            const id = parseInt(idStr);
            const amt = parseInt(amtBase36, 36);
            const lucky = luckyFlag === '1';
            const finalTier = tier || 'normal';

            // Reverse lookup itemKey
            const itemKey = Object.keys(LOOT_CONFIG.ITEMS).find(k => LOOT_CONFIG.ITEMS[k].id === id);
            if (itemKey) {
                hourData[hourLabel].push({
                    itemKey,
                    amount: amt,
                    tier: finalTier,
                    rawTime: time,
                    timestamp: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
                    hourLabel: hourLabel,
                    dateLabel: date.toLocaleDateString(),
                    isLucky: lucky
                });
            }
        });

        // Save counts to localStorage
        localStorage.setItem(this.STORAGE_KEY + '_counts', JSON.stringify(this.hourCounts));

        // Save each hour's data separately
        Object.keys(hourData).forEach(hourLabel => {
            const hourKey = this.STORAGE_KEY + '_hour_' + hourLabel.replace(':', '_');
            hourData[hourLabel].sort((a, b) => b.rawTime - a.rawTime);
            localStorage.setItem(hourKey, JSON.stringify(hourData[hourLabel]));
        });

        console.log(`[LOOT] Cached ${Object.keys(this.hourCounts).length} hours to localStorage`);
    },

    /**
     * SYNC HOUR DETAILS
     * Loads pre-parsed hour data from localStorage (instant!)
     */
    syncHourDetails(hourLabel) {
        const hourKey = this.STORAGE_KEY + '_hour_' + hourLabel.replace(':', '_');
        const storedHour = localStorage.getItem(hourKey);

        lootLogHistory.length = 0;

        if (storedHour) {
            // Load pre-parsed data (INSTANT)
            const hourData = JSON.parse(storedHour);
            lootLogHistory.push(...hourData);
            console.log(`[LOOT] Loaded ${lootLogHistory.length} entries from localStorage for hour ${hourLabel} (instant)`);
        } else {
            console.warn(`[LOOT] No cached data for hour ${hourLabel}`);
        }
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
