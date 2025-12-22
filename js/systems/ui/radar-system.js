/**
 * RADAR SYSTEM
 * 
 * Provides a tactical HUD element showing enemy positions relative to the player.
 * Optimized for performance by updating at 1Hz (once per second).
 * 
 * LOCATED IN: js/systems/ui/radar-system.js
 */

const RadarSystem = {
    canvas: null,
    ctx: null,
    interval: null,
    range: 60000, // World units covered (Increased to catch far spawns)
    size: 200,    // CSS Size (Canvas resolution matches)

    // Theme Definitions
    THEMES: {
        'Cyber Blue': {
            accent: 'rgba(255, 255, 255, 0.9)', // White Accent
            glow: 'rgba(0, 150, 255, 0.4)',     // Blue Glow
            grid: 'rgba(0, 150, 255, 0.15)',    // Blue Grid
            bg: 'rgba(0, 20, 50, 0.9)',        // Deep Blue BG
            player: '#ffffff',
            arrow: '#00ffff'
        },
        'Emerald Green': {
            accent: 'rgba(0, 255, 136, 0.8)',
            glow: 'rgba(0, 255, 136, 0.3)',
            grid: 'rgba(0, 255, 136, 0.1)',
            bg: 'rgba(0, 15, 5, 0.9)',
            player: '#ffffff',
            arrow: '#00ff88'
        },
        'Amber Alert': {
            accent: 'rgba(255, 170, 0, 0.8)',
            glow: 'rgba(255, 170, 0, 0.3)',
            grid: 'rgba(255, 170, 0, 0.1)',
            bg: 'rgba(20, 10, 0, 0.9)',
            player: '#ffffff',
            arrow: '#ffaa00'
        },
        'Blood Moon': {
            accent: 'rgba(255, 0, 68, 0.8)',
            glow: 'rgba(255, 0, 68, 0.3)',
            grid: 'rgba(255, 0, 68, 0.1)',
            bg: 'rgba(20, 0, 5, 0.9)',
            player: '#ffffff',
            arrow: '#ff0044'
        },
        'Neon Orchid': {
            accent: 'rgba(221, 0, 255, 0.8)',
            glow: 'rgba(221, 0, 255, 0.3)',
            grid: 'rgba(221, 0, 255, 0.1)',
            bg: 'rgba(15, 0, 20, 0.9)',
            player: '#ffffff',
            arrow: '#dd00ff'
        },
        'Monochrome': {
            accent: 'rgba(255, 255, 255, 0.6)',
            glow: 'rgba(255, 255, 255, 0.2)',
            grid: 'rgba(255, 255, 255, 0.05)',
            bg: 'rgba(10, 10, 10, 0.9)',
            player: '#ffffff',
            arrow: '#cccccc'
        }
    },

    currentTheme: 'Cyber Blue',

    init() {
        if (document.getElementById('radar-canvas')) return;

        // Create Container
        const container = document.createElement('div');
        container.id = 'radar-container';

        // Create Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'radar-canvas';
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.ctx = this.canvas.getContext('2d');

        container.appendChild(this.canvas);
        document.getElementById('ui').appendChild(container);

        // Add Zoom Control
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const currentRange = SettingsState.get('radarRange') || this.range;
            const delta = e.deltaY > 0 ? 5000 : -5000;
            let newRange = currentRange + delta;

            // Constrain
            newRange = Math.max(5000, Math.min(150000, newRange));

            // Update State
            SettingsState.set('radarRange', newRange);

            // Force redraw immediately
            this.draw();
        }, { passive: false });

        console.log("[RADAR] Initialized");

        // Respect setting
        if (typeof SettingsState !== 'undefined') {
            const isEnabled = SettingsState.get('radarEnabled');
            this.toggle(isEnabled);

            const theme = SettingsState.get('radarTheme');
            if (theme) this.updateTheme(theme);
        } else {
            // Start Update Loop (1Hz)
            this.start();
        }
    },

    start() {
        if (this.interval) clearInterval(this.interval);
        // Updates once per second as requested
        this.interval = setInterval(() => this.draw(), 1000);
        // Also draw immediately
        this.draw();
    },

    stop() {
        if (this.interval) clearInterval(this.interval);
    },

    toggle(isOn) {
        const container = document.getElementById('radar-container');
        if (container) {
            container.style.display = isOn ? 'block' : 'none';
        }

        if (isOn) {
            this.start();
        } else {
            this.stop();
        }
    },

    updateTheme(themeName) {
        this.currentTheme = themeName;
        const theme = this.THEMES[themeName] || this.THEMES['Cyber Blue'];

        // Update CSS Variables on the container
        const container = document.getElementById('radar-container');
        if (container) {
            container.style.setProperty('--radar-accent', theme.accent);
            container.style.setProperty('--radar-glow', theme.glow);
            container.style.setProperty('--radar-grid', theme.grid);
            container.style.setProperty('--radar-bg', theme.bg);
        }

        // Force redraw to update canvas elements (player dot, arrow)
        this.draw();
    },

    /**
     * DRAW PREVIEW
     * Renders a static preview of the radar to a specific canvas
     */
    drawPreview(canvasId, themeName) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const theme = this.THEMES[themeName] || this.THEMES['Cyber Blue'];
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // Apply Colors to CSS variables for the preview container if it exists
        const container = canvas.parentElement;
        if (container) {
            container.style.setProperty('--prev-accent', theme.accent);
            container.style.setProperty('--prev-glow', theme.glow);
            container.style.setProperty('--prev-grid', theme.grid);
            container.style.setProperty('--prev-bg', theme.bg);
        }

        // Draw Background Circle (Canvas level)
        ctx.clearRect(0, 0, w, h);

        ctx.beginPath();
        ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
        ctx.fillStyle = theme.bg;
        ctx.fill();

        // Draw Grid
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, (cx / 4) * i, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Horizontal/Vertical lines
        ctx.beginPath();
        ctx.moveTo(0, cy); ctx.lineTo(w, cy);
        ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
        ctx.stroke();

        // Draw Player
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = theme.player;
        ctx.fill();

        // Draw Facing Arrow
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 8);
        ctx.lineTo(cx, cy - 16);
        ctx.lineTo(cx + 5, cy - 8);
        ctx.strokeStyle = theme.arrow;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw a few dummy enemy dots
        const dummyDots = [
            { x: cx + 40, y: cy - 30 },
            { x: cx - 50, y: cy + 20 },
            { x: cx + 20, y: cy + 60 }
        ];

        ctx.fillStyle = '#ff3300'; // Generic enemy red
        dummyDots.forEach(dot => {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    draw() {
        if (!player || !this.ctx) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // Use setting if available
        const currentRange = (typeof SettingsState !== 'undefined') ? SettingsState.get('radarRange') : this.range;
        const scale = (w / 2) / (currentRange || this.range);

        // Clear
        ctx.clearRect(0, 0, w, h);

        const theme = this.THEMES[this.currentTheme] || this.THEMES['Cyber Blue'];

        // Draw Player (Center Dot)
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = theme.player;
        ctx.fill();

        // Draw Player Facing Arrow
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(player.rotation + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.lineTo(0, -12);
        ctx.lineTo(4, -6);
        ctx.strokeStyle = theme.arrow;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Draw Enemies
        if (typeof data !== 'undefined' && typeof spawnIndex !== 'undefined') {
            const currentStride = (typeof STRIDE !== 'undefined') ? STRIDE : 17;
            for (let i = 0; i < spawnIndex; i++) {
                const idx = i * currentStride;

                // Active Check locally (Health > 0)
                if (data[idx + 8] <= 0) continue;

                const ex = data[idx];
                const ey = data[idx + 1];
                const dx = ex - player.x;
                const dy = ey - player.y;

                if (Math.abs(dx) > (currentRange || this.range) || Math.abs(dy) > (currentRange || this.range)) continue;

                const rx = cx + (dx * scale);
                const ry = cy + (dy * scale);

                const distFromCenterSq = (rx - cx) ** 2 + (ry - cy) ** 2;
                if (distFromCenterSq > (w / 2 - 2) ** 2) continue;

                // Size and Color based on Rank (data[idx + 12] is tier)
                const rank = data[idx + 12] | 0;
                let radius = 2;
                let color = '#ff0000';

                if (rank === 1) { radius = 4; color = '#ffff00'; }
                else if (rank === 2) { radius = 6; color = '#00ffff'; }
                else if (rank === 3) { radius = 8; color = '#ff00ff'; }
                else if (rank >= 4) { radius = 10; color = '#0000ff'; }

                ctx.beginPath();
                ctx.arc(rx, ry, radius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            }
        }
    }
};

// Auto-init logic if UI exists, otherwise wait
setTimeout(() => {
    if (document.getElementById('ui')) RadarSystem.init();
}, 1000);
