/**
 * INTENSIFIED ELECTRICITY SYSTEM (JS)
 * 
 * Generates organic, high-density lightning bolts behind the game floor.
 * Layered: Body (Black) < This Canvas < Floor Overlay < PIXI Game
 * 
 * LOCATED IN: js/systems/visual/electricity-system.js
 */

const ElectricitySystem = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    activeBolts: [],
    lastPulse: 0,
    pulseDelay: 1000, // Faster pulse rate for "more electricity"

    init() {
        console.log("[ELECTRICITY] Restoring High-Voltage JS Core...");

        // 1. Setup Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'electricity-canvas';

        // Inject into mount point for correct layering
        const mount = document.getElementById('electricity-mount');
        if (mount) {
            mount.parentNode.insertBefore(this.canvas, mount);
        } else {
            document.body.prepend(this.canvas);
        }

        this.ctx = this.canvas.getContext('2d');
        this.handleResize();

        window.addEventListener('resize', () => this.handleResize());

        // 2. Start Intensive Loop
        this.loop();
    },

    handleResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },

    /**
     * GENERATE BOLT
     * Recursive jagged line generator.
     */
    createBolt(x1, y1, x2, y2, displace, depth) {
        if (depth <= 0) {
            this.ctx.lineTo(x2, y2);
            return;
        }

        const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * displace;
        const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * displace;

        this.createBolt(x1, y1, midX, midY, displace / 2, depth - 1);
        this.createBolt(midX, midY, x2, y2, displace / 2, depth - 1);
    },

    /**
     * TRIGGER HIGH-DENSITY ELECTRIC PULSE
     */
    triggerPulse() {
        // High density: Spawn 2-6 bolts per pulse
        const boltCount = 2 + Math.floor(Math.random() * 5);

        for (let i = 0; i < boltCount; i++) {
            const side = Math.random();
            let x1, y1, x2, y2;

            if (side < 0.4) { // Vertical Bolt
                x1 = Math.random() * this.width;
                y1 = 0;
                x2 = x1 + (Math.random() - 0.5) * 400;
                y2 = this.height;
            } else if (side < 0.7) { // Horizontal Bolt
                x1 = 0;
                y1 = Math.random() * this.height;
                x2 = this.width;
                y2 = y1 + (Math.random() - 0.5) * 400;
            } else { // Diagonal/Random Burst
                x1 = Math.random() * this.width;
                y1 = Math.random() * this.height;
                x2 = x1 + (Math.random() - 0.5) * 800;
                y2 = y1 + (Math.random() - 0.5) * 800;
            }

            this.activeBolts.push({
                x1, y1, x2, y2,
                alpha: 1.0,
                fadeSpeed: 0.03 + Math.random() * 0.08,
                width: 2.0 + Math.random() * 10.0, // 4x Thicker (was 0.5 - 3.0)
                // Rich Cobalt Blue Palette
                color: Math.random() > 0.5 ? '#007BFF' : '#0056b3'
            });
        }

        // Intense frequency: every 1-4 seconds
        this.pulseDelay = 1000 + Math.random() * 3000;
        this.lastPulse = Date.now();
    },

    /**
     * RENDER LOOP
     */
    loop() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        const now = Date.now();
        if (now - this.lastPulse > this.pulseDelay) {
            this.triggerPulse();
        }

        for (let i = this.activeBolts.length - 1; i >= 0; i--) {
            const b = this.activeBolts[i];

            this.ctx.save();
            this.ctx.globalAlpha = b.alpha;
            this.ctx.strokeStyle = b.color;
            this.ctx.lineWidth = b.width;

            // Neon Glow
            this.ctx.shadowBlur = 10 + Math.random() * 10;
            this.ctx.shadowColor = b.color;

            this.ctx.beginPath();
            this.ctx.moveTo(b.x1, b.y1);
            this.createBolt(b.x1, b.y1, b.x2, b.y2, 120, 6);
            this.ctx.stroke();
            this.ctx.restore();

            // Flickering Fade
            b.alpha -= b.fadeSpeed;
            if (b.alpha <= 0) {
                this.activeBolts.splice(i, 1);
            }
        }

        requestAnimationFrame(() => this.loop());
    }
};

window.addEventListener('DOMContentLoaded', () => ElectricitySystem.init());
