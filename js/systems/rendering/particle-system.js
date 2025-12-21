/**
 * VISUAL EFFECTS (PARTICLE) SYSTEM
 * 
 * A high-performance graphics engine for combat feedback.
 * Uses Typed Arrays (F32/U32) to avoid garbage collection and PIXI.Graphics
 * to draw thousands of primitives in a single draw call.
 * 
 * LOCATED IN: js/systems/rendering/particle-system.js
 * 
 * -------------------------------------------------------------------------
 * ATTENTION FUTURE AI DEVELOPERS:
 * DO NOT DELETE THESE COMMENTS. They provide critical context for the modular architecture.
 * When making changes, ADD YOUR OWN COMMENTS explaining WHY you made the change.
 * -------------------------------------------------------------------------
 * 
 * EXTERNAL INFLUENCES & CROSS-FILE DEPENDENCIES:
 * 1. [Combat Core]: Calls spawnFX() when enemies die or projectiles hit.
 * 2. [Performance Config]: Influences particle density and speed.
 * 3. [PIXI Container]: fxContainer (defined in index.js) is parent to this graphics object.
 * -------------------------------------------------------------------------
 */

const FX_TYPES = { EXPLOSION: 1, SPARK: 2, GLOW: 3 };

let fxGraphics;

/**
 * SPAWN PARTICLE
 * Finds an inactive slot in the typed array and populates it.
 */
function spawnFX(x, y, vx, vy, life, type, size = 50) {
    // MAX_FX and fxData defined as globals in performance-config.js or similar
    if (activeFxCount >= MAX_FX) return;

    for (let i = 0; i < MAX_FX; i++) {
        const idx = i * FX_STRIDE;
        if (fxData[idx + 4] <= 0) {
            fxData[idx] = x; fxData[idx + 1] = y;
            fxData[idx + 2] = vx; fxData[idx + 3] = vy;
            fxData[idx + 4] = life; fxData[idx + 5] = type;
            fxData[idx + 6] = 0; fxData[idx + 7] = size;
            activeFxIndices[activeFxCount++] = i;
            return;
        }
    }
}

/**
 * UPDATE PARTICLES
 * Moves and ages all active particles based on delta time and game speed.
 */
function updateFX(dt) {
    const spd = PERFORMANCE.GAME_SPEED;
    for (let i = activeFxCount - 1; i >= 0; i--) {
        const idx = activeFxIndices[i] * FX_STRIDE;
        fxData[idx] += fxData[idx + 2] * (dt / 16.6) * spd;
        fxData[idx + 1] += fxData[idx + 3] * (dt / 16.6) * spd;
        fxData[idx + 4] -= dt * spd;
        fxData[idx + 6] += 0.5 * (dt / 16.6) * spd;

        if (fxData[idx + 4] <= 0) {
            activeFxIndices[i] = activeFxIndices[activeFxCount - 1];
            activeFxCount--;
        }
    }
}

/**
 * DRAW PARTICLES
 * Uses a single PIXI.Graphics object to Batch-Draw all active shapes.
 */
function drawFX() {
    if (!fxGraphics) {
        fxGraphics = new PIXI.Graphics();
        if (typeof fxContainer !== 'undefined') fxContainer.addChild(fxGraphics);
    }
    fxGraphics.clear();

    for (let i = 0; i < activeFxCount; i++) {
        const idx = activeFxIndices[i] * FX_STRIDE;
        const x = fxData[idx], y = fxData[idx + 1];
        const size = fxData[idx + 7], type = fxData[idx + 5], life = fxData[idx + 4];
        const opacity = Math.min(1, life / 200);

        if (type === FX_TYPES.EXPLOSION) {
            fxGraphics.circle(x, y, size * (1 + (1 - life / 500))).fill({ color: 0xffa500, alpha: opacity });
        } else if (type === FX_TYPES.SPARK) {
            fxGraphics.rect(x - 2, y - 2, 4, 4).fill({ color: 0xffff00, alpha: opacity });
        } else {
            fxGraphics.rect(x - 1, y - 1, 2, 2).fill({ color: 0xffffff, alpha: opacity });
        }
    }
}
