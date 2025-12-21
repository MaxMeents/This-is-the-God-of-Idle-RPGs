/**
 * CURSOR OVERLAY SYSTEM (AAA EFFECTS)
 * 
 * Replaces standard particle trails with a high-performance Canvas 2D overlay.
 * Renders "Poly-Art" streams and "Constellations" on top of the entire UI.
 * 
 * DESIGN:
 * - Z-Index 99999: Sits above Loading Screen, Loot Ledger, and Game Canvas.
 * - Canvas 2D: Uses 'lighter' blend mode for intense neon glow.
 * - Stream Logic: Nodes are sprung towards the mouse, creating a "tail".
 * 
 * LOCATED IN: js/systems/ui/mouse-effects.js
 */

const CursorOverlaySystem = {
    canvas: null,
    ctx: null,
    active: true,
    mode: 'MENU',

    // Physics & State
    nodes: [],
    mouse: { x: 0, y: 0, vx: 0, vy: 0 },
    lastMouse: { x: 0, y: 0 },

    config: {
        nodeCount: 16,
        spring: 0.15,
        friction: 0.5,
        baseSize: 6
    },

    /**
     * INITIALIZATION
     */
    init() {
        console.log("[CURSOR FX] Initializing Poly-Art Stream (Main Thread)...");

        // 1. Create Overlay Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'cursor-fx-overlay';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.pointerEvents = 'none'; // Passthrough
        this.canvas.style.zIndex = '99999'; // TOP LEVEL
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d', { alpha: true });

        // 2. Handle Resize
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 3. Track Mouse
        window.addEventListener('mousemove', e => this.handleMouseMove(e));
        window.addEventListener('mousedown', e => this.handleClick(e));

        // 4. Init Nodes
        this.initNodes();

        // 5. Start Loop
        this.startTime = performance.now();
        this.loop();
    },

    initNodes() {
        // Sync with settings if available
        if (typeof SettingsState !== 'undefined') {
            const len = SettingsState.get('trailLength');
            if (len) this.config.nodeCount = Math.max(2, Math.min(10, len));
        }

        this.nodes = [];
        for (let i = 0; i < this.config.nodeCount; i++) {
            this.nodes.push({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                vx: 0, vy: 0,
                size: this.config.baseSize * (1 - i / this.config.nodeCount),
                angle: 0,
                spin: (Math.random() - 0.5) * 0.2, // Rotation speed
                shape: Math.random() > 0.5 ? 'TRI' : 'DIAMOND',
                color: i % 2 === 0 ? '#00FFFF' : '#FFD700' // Cyan / Gold
            });
        }
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    handleMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;

        // Velocity calc
        this.mouse.vx = e.clientX - this.lastMouse.x;
        this.mouse.vy = e.clientY - this.lastMouse.y;
        this.lastMouse = { x: e.clientX, y: e.clientY };
    },

    handleClick(e) {
        // "Fractal Deconstruction": Scatter nodes
        this.nodes.forEach(n => {
            const angle = Math.random() * Math.PI * 2;
            const force = Math.random() * 20 + 10;
            n.vx += Math.cos(angle) * force;
            n.vy += Math.sin(angle) * force;
        });
    },

    /**
     * MAIN RENDER LOOP
     */
    loop() {
        requestAnimationFrame(() => this.loop());

        // SETTINGS CHECK
        if (typeof SettingsState !== 'undefined') {
            if (!SettingsState.get('mouseEffects')) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                return;
            }

            // Live Update Trail Length
            const targetLen = SettingsState.get('trailLength') || 16;
            if (this.nodes.length !== targetLen) {
                this.config.nodeCount = targetLen;
                // Gracefully resize array instead of full reset? 
                // Full reset is safer/easier for now to avoid jumpy resizing logic
                this.initNodes();
            }
        }

        // Detect Mode (Start Screen = Menu)
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen && getComputedStyle(loadingScreen).display !== 'none' && getComputedStyle(loadingScreen).opacity > 0.1) {
            this.mode = 'MENU';
        } else {
            this.mode = 'GAME';
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = 'lighter'; // NEON GLOW BLEND

        if (this.mode === 'MENU') {
            // User requested NO effect on start screen to prevent pile-up
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        } else {
            this.updateStream();
        }
    },

    /**
     * MODE: GAME - POLY-ART STREAM
     * Nodes trailing behind mouse in a spring chain.
     */
    updateStream() {
        let targetX = this.mouse.x;
        let targetY = this.mouse.y;

        this.nodes.forEach((n, i) => {
            // Spring Physics
            const ax = (targetX - n.x) * this.config.spring;
            const ay = (targetY - n.y) * this.config.spring;

            n.vx += ax;
            n.vy += ay;
            n.vx *= this.config.friction;
            n.vy *= this.config.friction;

            n.x += n.vx;
            n.y += n.vy;
            n.angle += n.spin;

            // Draw Node
            this.drawShape(n.x, n.y, n.size, n.shape, n.color, n.angle);

            // Draw Connection Line
            if (i > 0) {
                const prev = this.nodes[i - 1];
                this.ctx.beginPath();
                this.ctx.moveTo(prev.x, prev.y);
                this.ctx.lineTo(n.x, n.y);
                this.ctx.strokeStyle = n.color;
                this.ctx.lineWidth = 1;
                this.ctx.globalAlpha = 0.3;
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }

            // Chain Target
            targetX = n.x;
            targetY = n.y;
        });

        // Draw connection to mouse
        if (this.nodes.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.mouse.x, this.mouse.y);
            this.ctx.lineTo(this.nodes[0].x, this.nodes[0].y);
            this.ctx.strokeStyle = '#fff';
            this.ctx.globalAlpha = 0.5;
            this.ctx.stroke();
        }
    },

    /**
     * MODE: MENU - CONSTELLATION
     * Nodes drift and connect.
     */
    updateConstellation() {
        // Update drifters
        this.nodes.forEach(n => {
            // Add some "wander"
            n.vx += (Math.random() - 0.5) * 0.2;
            n.vy += (Math.random() - 0.5) * 0.2;

            // Central Gravity (Keep them on screen)
            const dx = (this.canvas.width / 2) - n.x;
            const dy = (this.canvas.height / 2) - n.y;
            n.vx += dx * 0.0001;
            n.vy += dy * 0.0001;

            n.x += n.vx;
            n.y += n.vy;
            n.angle += n.spin * 0.5;

            // Dampen
            n.vx *= 0.98;
            n.vy *= 0.98;

            // Mouse Repel (Interactive)
            const mdx = n.x - this.mouse.x;
            const mdy = n.y - this.mouse.y;
            const dist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (dist < 200) {
                const force = (200 - dist) * 0.05;
                n.vx += (mdx / dist) * force;
                n.vy += (mdy / dist) * force;
            }

            this.drawShape(n.x, n.y, n.size * 1.5, n.shape, n.color, n.angle);
        });

        // Connect nearby nodes
        this.ctx.lineWidth = 0.5;
        this.ctx.strokeStyle = '#00FFFF';

        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const n1 = this.nodes[i];
                const n2 = this.nodes[j];
                const dx = n1.x - n2.x;
                const dy = n1.y - n2.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < 20000) { // 140px
                    const alpha = 1 - (distSq / 20000);
                    this.ctx.globalAlpha = alpha * 0.4;
                    this.ctx.beginPath();
                    this.ctx.moveTo(n1.x, n1.y);
                    this.ctx.lineTo(n2.x, n2.y);
                    this.ctx.stroke();
                }
            }
        }
        this.ctx.globalAlpha = 1;
    },

    drawShape(x, y, size, shape, color, angle) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();

        if (shape === 'TRI') {
            this.ctx.moveTo(0, -size);
            this.ctx.lineTo(size, size);
            this.ctx.lineTo(-size, size);
            this.ctx.closePath();
        } else {
            // DIAMOND
            this.ctx.moveTo(0, -size);
            this.ctx.lineTo(size, 0);
            this.ctx.lineTo(0, size);
            this.ctx.lineTo(-size, 0);
            this.ctx.closePath();
        }

        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 10;
        this.ctx.stroke();
        this.ctx.restore();
    }
};
