/**
 * VISUAL EFFECTS SYSTEM
 * A high-performance particle engine using typed arrays.
 * Designed to handle thousands of simultaneous effects with zero garbage collection.
 */

const FX_TYPES = {
    EXPLOSION: 1,
    SPARK: 2,
    GLOW: 3
};

/**
 * SPAWN A NEW PARTICLE
 */
function spawnFX(x, y, vx, vy, life, type, size = 50) {
    if (activeFxCount >= MAX_FX) return;

    // Find first inactive slot
    for (let i = 0; i < MAX_FX; i++) {
        const idx = i * FX_STRIDE;
        if (fxData[idx + 4] <= 0) { // If life is 0, it's inactive
            fxData[idx] = x;
            fxData[idx + 1] = y;
            fxData[idx + 2] = vx;
            fxData[idx + 3] = vy;
            fxData[idx + 4] = life;
            fxData[idx + 5] = type;
            fxData[idx + 6] = 0; // frame
            fxData[idx + 7] = size;

            activeFxIndices[activeFxCount++] = i;
            return;
        }
    }
}

/**
 * UPDATE ALL PARTICLES
 */
function updateFX(dt) {
    const spd = PERFORMANCE.GAME_SPEED;

    for (let i = activeFxCount - 1; i >= 0; i--) {
        const fxIdx = activeFxIndices[i];
        const idx = fxIdx * FX_STRIDE;

        // Move
        fxData[idx] += fxData[idx + 2] * (dt / 16.6) * spd;
        fxData[idx + 1] += fxData[idx + 3] * (dt / 16.6) * spd;

        // Age
        fxData[idx + 4] -= dt * spd;

        // Animate (frame increment)
        fxData[idx + 6] += 0.5 * (dt / 16.6) * spd;

        if (fxData[idx + 4] <= 0) {
            // Swap with last active and decrement
            activeFxIndices[i] = activeFxIndices[activeFxCount - 1];
            activeFxCount--;
        }
    }
}

let fxGraphics;

/**
 * DRAW ALL PARTICLES
 */
function drawFX() {
    if (!fxGraphics) {
        fxGraphics = new PIXI.Graphics();
        fxContainer.addChild(fxGraphics);
    }
    fxGraphics.clear();

    for (let i = 0; i < activeFxCount; i++) {
        const fxIdx = activeFxIndices[i];
        const idx = fxIdx * FX_STRIDE;

        const x = fxData[idx], y = fxData[idx + 1];
        const size = fxData[idx + 7];
        const type = fxData[idx + 5];
        const life = fxData[idx + 4];
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
