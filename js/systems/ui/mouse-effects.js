/**
 * CURSOR OVERLAY SYSTEM (THREADED)
 * 
 * Proxies mouse events and state to a Web Worker for high-performance rendering.
 * Uses OffscreenCanvas to prevent UI freezes.
 * 
 * LOCATED IN: js/systems/ui/mouse-effects.js
 */

const CursorOverlaySystem = {
    worker: null,
    canvas: null,
    active: true,
    lastMode: 'MENU',

    /**
     * INITIALIZATION
     */
    init() {
        console.log("[CURSOR FX] Initializing Threaded Renderer...");

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

        // 2. Initialize Worker
        if (window.Worker && this.canvas.transferControlToOffscreen) {
            const offscreen = this.canvas.transferControlToOffscreen();
            this.worker = new Worker('js/workers/mouse-effects-worker.js');

            this.worker.postMessage({
                type: 'INIT',
                payload: {
                    canvas: offscreen,
                    w: window.innerWidth,
                    h: window.innerHeight
                }
            }, [offscreen]);

            // 3. Bind Events
            this.bindEvents();

            // 4. Start State Monitoring Loop
            this.monitorState();
        } else {
            console.error("Web Workers or OffscreenCanvas not supported.");
        }
    },

    bindEvents() {
        // Resize
        window.addEventListener('resize', () => {
            this.worker.postMessage({
                type: 'RESIZE',
                payload: { w: window.innerWidth, h: window.innerHeight }
            });
        });

        // Mouse Move (Throttled slightly if needed, but modern browsers handle postMessage fast)
        window.addEventListener('mousemove', e => {
            this.worker.postMessage({
                type: 'MOUSE_MOVE',
                payload: { x: e.clientX, y: e.clientY }
            });
        });

        // Click
        window.addEventListener('mousedown', () => {
            this.worker.postMessage({ type: 'CLICK', payload: {} });
        });
    },

    /**
     * State Monitor Loop (replaces local render loop)
     * Checks for Mode and Settings changes at 10fps (sufficient)
     */
    monitorState() {
        setInterval(() => {
            // 1. Settings Check
            const enabled = (typeof SettingsState !== 'undefined') ? SettingsState.get('mouseEffects') : true;
            this.worker.postMessage({
                type: 'UPDATE_SETTINGS',
                payload: { enabled }
            });

            // 2. Mode Check (Loading Screen = MENU)
            const loadingScreen = document.getElementById('loading-screen');
            let currentMode = 'GAME';

            if (loadingScreen && getComputedStyle(loadingScreen).display !== 'none' && getComputedStyle(loadingScreen).opacity > 0.1) {
                currentMode = 'MENU';
            }

            if (currentMode !== this.lastMode) {
                this.lastMode = currentMode;
                this.worker.postMessage({
                    type: 'SET_MODE',
                    payload: { mode: currentMode }
                });
            }

        }, 200); // Check every 200ms
    }
};
