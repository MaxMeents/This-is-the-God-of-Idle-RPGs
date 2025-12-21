/**
 * LOOT BATCHING SYSTEM
 * 
 * Prevents DOM "thrashing" (performance lag) during extreme high-speed combat
 * by aggregating rapid drops and updating the UI in batches.
 * 
 * LOCATED IN: js/systems/loot/loot-batching.js
 * 
 * -------------------------------------------------------------------------
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [Loot Logic]: Overrides addLootToHistory() so it queues instead of creating DOM.
 * 2. [Performance Config]: Influences how many items might hit the queue per frame.
 * -------------------------------------------------------------------------
 */

// REGISTRY FOR BATCHED ITEMS
let lootQueue = {};
let lastLootProcess = 0;

/**
 * QUEUE LOOT
 * Temporarily stores a drop and its amount without touching the DOM.
 */
function queueLoot(itemKey, amount) {
    if (!lootQueue[itemKey]) lootQueue[itemKey] = 0;
    lootQueue[itemKey] += amount;

    // Failsafe: Instant process if the interval (250ms) has passed
    const now = performance.now();
    if (now - lastLootProcess > 250) {
        processLootQueue();
        lastLootProcess = now;
    }
}

/**
 * INTERCEPTOR SETUP
 * We replace the global addLootToHistory with our queue logic
 * to automatically decouple dropROLLING from dropDISPLAY.
 */
const originalAddLoot = addLootToHistory; // Pointer to the real spawner in loot-logic.js

addLootToHistory = (itemKey, amount) => {
    queueLoot(itemKey, amount);
};

/**
 * PROCESS QUEUE (The Flush)
 * Aggregates all quantities for identical items and calls the REAL DOM spawner.
 * This runs on a 250ms interval (4 times per second).
 */
function processLootQueue() {
    const keys = Object.keys(lootQueue);
    if (keys.length === 0) return;

    keys.forEach(key => {
        const amount = lootQueue[key];
        if (amount > 0) {
            // CALL THE REAL DOM SPAWNER with aggregated amount
            if (typeof originalAddLoot === 'function') {
                originalAddLoot(key, amount);
            }
        }
    });

    // WIPE QUEUE
    lootQueue = {};
}

/**
 * TICK RATE
 * 4Hz update rate is the "sweet spot" for human readability 
 * while keeping main thread overhead extremely low.
 */
setInterval(processLootQueue, 250);
