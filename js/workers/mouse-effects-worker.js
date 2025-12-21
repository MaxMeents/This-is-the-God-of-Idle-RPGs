/**
 * MOUSE EFFECTS WORKER (AAA PERFORMANCE)
 * 
 * Runs the "Poly-Art" and "Constellation" visual effects on a separate thread.
 * This prevents UI freeze during heavy main-thread operations (loading, crypto, logic).
 * 
 * MESSAGES RECEIVED:
 * - INIT: { canvas: OffscreenCanvas, width, height }
 * - RESIZE: { width, height }
 * - MOUSE_MOVE: { x, y }
 * - CLICK: {} (Triggers visual explosion)
 * - SET_MODE: { mode: 'MENU' | 'GAME' }
 * - UPDATE_SETTINGS: { enabled: boolean }
 */

const ctx = null;
let canvas = null;
let width = 0;
let height = 0;

let animationId = null;
let lastTime = 0;
let enabled = true;
let mode = 'MENU'; // 'MENU' | 'GAME'

// STATE
const state = {
    mouse: { x: 0, y: 0, vx: 0, vy: 0 },
    lastMouse: { x: 0, y: 0 },
    nodes: [],
    config: {
        nodeCount: 16,
        spring: 0.15,
        friction: 0.5,
        baseSize: 6
    }
};

/**
 * INITIALIZE WORKER
 */
self.onmessage = function (e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT':
            init(payload);
            break;
        case 'RESIZE':
            resize(payload);
            break;
        case 'MOUSE_MOVE':
            updateMouse(payload);
            break;
        case 'CLICK':
            triggerExplosion();
            break;
        case 'SET_MODE':
            mode = payload.mode;
            break;
        case 'UPDATE_SETTINGS':
            enabled = payload.enabled;
            if (!enabled) clearCanvas();
            break;
    }
};

function init({ canvas: offscreenCanvas, w, h }) {
    canvas = offscreenCanvas;
    width = w;
    height = h;

    // Get Context (Alpha enabled for transparency)
    const context = canvas.getContext('2d', { alpha: true });

    // Assign to global (or closure scope)
    // We used 'const ctx = null' above which is invalid re-assignment
    // So let's attach to state or just overwrite a let variable.
    // Actually, 'const ctx' at top scope cant be reassigned. 
    // I will fix this by using 'let context2d' or similar.
    state.ctx = context;

    // Init Nodes
    initNodes();

    // Start Loop
    lastTime = performance.now();
    loop();

    console.log("[WORKER] Mouse Effects Worker Initialized.");
}

function resize({ w, h }) {
    width = w;
    height = h;
    if (canvas) {
        canvas.width = width;
        canvas.height = height;
    }
}

function updateMouse({ x, y }) {
    state.mouse.x = x;
    state.mouse.y = y;

    // Velocity
    state.mouse.vx = x - state.lastMouse.x;
    state.mouse.vy = y - state.lastMouse.y;

    state.lastMouse = { x, y };
}

function initNodes() {
    state.nodes = [];
    for (let i = 0; i < state.config.nodeCount; i++) {
        state.nodes.push({
            x: width / 2,
            y: height / 2,
            vx: 0, vy: 0,
            size: state.config.baseSize * (1 - i / state.config.nodeCount),
            angle: 0,
            spin: (Math.random() - 0.5) * 0.2,
            shape: Math.random() > 0.5 ? 'TRI' : 'DIAMOND',
            color: i % 2 === 0 ? '#00FFFF' : '#FFD700' // Cyan / Gold
        });
    }
}

function triggerExplosion() {
    state.nodes.forEach(n => {
        const angle = Math.random() * Math.PI * 2;
        const force = Math.random() * 20 + 10;
        n.vx += Math.cos(angle) * force;
        n.vy += Math.sin(angle) * force;
    });
}

function clearCanvas() {
    if (state.ctx) {
        state.ctx.clearRect(0, 0, width, height);
    }
}

/**
 * MAIN LOOP
 */
function loop() {
    // 1. Request Next Frame
    animationId = requestAnimationFrame(loop);

    // 2. Settings Check
    if (!enabled || !state.ctx) {
        return;
    }

    // 3. Clear & Prep
    state.ctx.clearRect(0, 0, width, height);
    state.ctx.globalCompositeOperation = 'lighter'; // NEON GLOW

    // 4. Update based on Mode
    if (mode === 'MENU') {
        updateConstellation();
    } else {
        updateStream();
    }
}

/**
 * MODE: GAME - POLY-ART STREAM
 */
function updateStream() {
    const { nodes, config } = state;
    const { ctx } = state;
    let targetX = state.mouse.x;
    let targetY = state.mouse.y;

    nodes.forEach((n, i) => {
        // Spring Physics
        const ax = (targetX - n.x) * config.spring;
        const ay = (targetY - n.y) * config.spring;

        n.vx += ax;
        n.vy += ay;
        n.vx *= config.friction;
        n.vy *= config.friction;

        n.x += n.vx;
        n.y += n.vy;
        n.angle += n.spin;

        drawShape(ctx, n.x, n.y, n.size, n.shape, n.color, n.angle);

        // Connection Line
        if (i > 0) {
            const prev = nodes[i - 1];
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(n.x, n.y);
            ctx.strokeStyle = n.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Ideally spring targets mouse, but for chain effect, let's keep simple spring
        // Actually the original logic had them distinct.
        // But in strict spring chain, n follows n-1? 
        // Original code: all followed mouse with varied physics?
        // Let's stick to the original logic: "targetX = mouse.x" (all follow mouse).
        // WAIT, original code inside the loop:
        // n follows targetX, then targetX becomes n.x ???
        // Yes, "targetX = n.x" at end of loop means NEXT node follows THIS node.
        // So it IS a chain.
        targetX = n.x;
        targetY = n.y;
    });

    // Connection to mouse
    if (nodes.length > 0) {
        ctx.beginPath();
        ctx.moveTo(state.mouse.x, state.mouse.y);
        ctx.lineTo(nodes[0].x, nodes[0].y);
        ctx.strokeStyle = '#fff';
        ctx.globalAlpha = 0.5;
        ctx.stroke();
    }
}

/**
 * MODE: MENU - CONSTELLATION
 */
function updateConstellation() {
    const { nodes, ctx } = state;

    nodes.forEach(n => {
        // Wander
        n.vx += (Math.random() - 0.5) * 0.2;
        n.vy += (Math.random() - 0.5) * 0.2;

        // Central Gravity
        const dx = (width / 2) - n.x;
        const dy = (height / 2) - n.y;
        n.vx += dx * 0.0001;
        n.vy += dy * 0.0001;

        n.x += n.vx;
        n.y += n.vy;
        n.angle += n.spin * 0.5;

        // Dampen
        n.vx *= 0.98;
        n.vy *= 0.98;

        // Mouse Repel
        const mdx = n.x - state.mouse.x;
        const mdy = n.y - state.mouse.y;
        const dist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (dist < 200) {
            const force = (200 - dist) * 0.05;
            n.vx += (mdx / dist) * force;
            n.vy += (mdy / dist) * force;
        }

        drawShape(ctx, n.x, n.y, n.size * 1.5, n.shape, n.color, n.angle);
    });

    // Connections
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#00FFFF';

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const n1 = nodes[i];
            const n2 = nodes[j];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < 20000) {
                const alpha = 1 - (distSq / 20000);
                ctx.globalAlpha = alpha * 0.4;
                ctx.beginPath();
                ctx.moveTo(n1.x, n1.y);
                ctx.lineTo(n2.x, n2.y);
                ctx.stroke();
            }
        }
    }
    ctx.globalAlpha = 1;
}

function drawShape(ctx, x, y, size, shape, color, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    if (shape === 'TRI') {
        ctx.moveTo(0, -size);
        ctx.lineTo(size, size);
        ctx.lineTo(-size, size);
        ctx.closePath();
    } else {
        // DIAMOND
        ctx.moveTo(0, -size);
        ctx.lineTo(size, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size, 0);
        ctx.closePath();
    }

    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
}
