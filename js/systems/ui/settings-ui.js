/**
 * SETTINGS UI SYSTEM
 * 
 * Manages the rendered modal, tab switching, and button events.
 * Binds DOM elements to SettingsState.
 * 
 * LOCATED IN: js/systems/ui/settings-ui.js
 */

const SettingsUI = {
    isOpen: false,

    init() {
        console.log("[SETTINGS UI] Initializing...");
        this.injectHTML();
        this.setupListeners();
        this.updateTogglesFromState();
    },

    /**
     * INJECT MODAL HTML & GEAR BUTTON
     */
    injectHTML() {
        // 1. Gear Button
        const gearBtn = document.createElement('div');
        gearBtn.id = 'settings-gear-btn';
        gearBtn.title = "Game Settings";
        // SVG Icon
        gearBtn.innerHTML = `
            <svg id="settings-gear-icon" viewBox="0 0 24 24">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L6.14 7.55c-.12.21-.07.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
        `;
        document.body.appendChild(gearBtn);

        // 2. Modal Overlay
        const overlay = document.createElement('div');
        overlay.id = 'settings-modal-overlay';
        overlay.innerHTML = `
            <div class="settings-panel">
                <div class="settings-header">
                    <div class="settings-title">System Configuration</div>
                    <button class="settings-close-btn">&times;</button>
                </div>
                
                <div class="settings-tabs">
                    <button class="settings-tab-btn active" data-tab="visuals">Visuals</button>
                    <button class="settings-tab-btn" data-tab="interface">Interface</button>
                    <button class="settings-tab-btn" data-tab="gameplay">Gameplay</button>
                </div>

                <div class="settings-content">
                    <!-- VISUALS TAB -->
                    <div id="tab-visuals" class="settings-section active">
                        ${this.createToggle('mouseEffects', 'Cursor Effects', 'Enable the Poly-Art Stream trail and click bursts.')}
                        ${this.createSlider('trailLength', 'Trail Length', 'Adjust the length of the cursor stream.', 2, 10, 1)}
                        ${this.createToggle('damageNumbers', 'Damage Numbers', 'Show floating damage values on hit.')}
                        ${this.createDropdown('damageFont', 'Damage Font', 'Choose the typeface for floating damage.', ['Orbitron', 'Tektur', 'Silkscreen', 'Press Start 2P', 'Bungee', 'Monoton', 'Righteous', 'Russo One', 'Wallpoet', 'Audiowide', 'Syncopate', 'Michroma', 'Stalinist One', 'Racing Sans One'])}
                        ${this.createToggle('lootStairs', 'Loot Notification', 'Show the scrolling loot log on the right side.')}
                    </div>

                    <!-- INTERFACE TAB -->
                    <div id="tab-interface" class="settings-section">
                        ${this.createToggle('healthBar', 'Player Health Bar', 'Display the main health pillar (Bottom Left).')}
                        ${this.createToggle('shieldBar', 'Player Shield Bar', 'Display the shield overlay on health bar.')}
                        ${this.createToggle('laserBar', 'Laser Ammo', 'Display the laser energy bar.')}
                        ${this.createToggle('bulletBar', 'Bullet Ammo', 'Display the bullet count bar.')}
                        ${this.createToggle('radarEnabled', 'Tactical Radar', 'Display the tactical map overlay (Bottom Left).')}
                        ${this.createDropdown('radarTheme', 'Radar Theme', 'Choose the color scheme for the tactical radar.', ['Cyber Blue', 'Emerald Green', 'Amber Alert', 'Blood Moon', 'Neon Orchid', 'Monochrome'])}
                        ${this.createToggle('enemyHp', 'Enemy Health Bars', 'Show health bars above enemies (Performance Heavy).')}
                    </div>

                    <!-- GAMEPLAY TAB (Placeholder for now) -->
                    <div id="tab-gameplay" class="settings-section">
                        <div style="color: #666; font-style: italic; text-align: center; padding: 20px;">
                            More gameplay settings coming soon...
                        </div>
                    </div>
                </div>
            </div>

            <!-- Radar Preview Sidebar (Now outside panel but inside overlay) -->
            <div id="radar-preview-container">
                <div class="radar-preview-label">Live Preview</div>
                <canvas id="radar-theme-preview" width="200" height="200"></canvas>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    createToggle(key, label, desc) {
        return `
            <div class="setting-row">
                <div>
                    <div class="setting-label">${label}</div>
                    <div class="setting-desc">${desc}</div>
                </div>
                <div class="setting-switch" data-key="${key}" onclick="SettingsUI.toggle('${key}')"></div>
            </div>
        `;
    },

    createSlider(key, label, desc, min, max, step) {
        const current = SettingsState.get(key) || min;
        return `
            <div class="setting-row">
                <div>
                    <div class="setting-label">${label}</div>
                    <div class="setting-desc">${desc}</div>
                </div>
                <div class="setting-slider-group" style="display: flex; align-items: center; gap: 10px;">
                    <input type="range" class="setting-slider" data-key="${key}" 
                        min="${min}" max="${max}" step="${step}" value="${current}"
                        oninput="SettingsUI.updateSlider('${key}', this.value)"
                        style="width: 100px; accent-color: #ffd700;">
                    <span class="slider-value" id="val-${key}" style="width: 30px; text-align: right; color: #ffd700; font-family: 'Orbitron';">${current}</span>
                </div>
            </div>
        `;
    },

    createDropdown(key, label, desc, options) {
        const current = SettingsState.get(key) || options[0];
        const optionsHtml = options.map(opt => {
            const style = key === 'damageFont' ? `style="font-family: '${opt}', sans-serif;"` : '';
            return `<div class="setting-dropdown-option ${opt === current ? 'active' : ''}" 
                        data-value="${opt}" 
                        ${style}
                        onmouseenter="SettingsUI.previewOption('${key}', '${opt}')"
                        onmouseleave="SettingsUI.revertPreview('${key}')"
                        onclick="SettingsUI.selectOption('${key}', '${opt}')">${opt}</div>`;
        }).join('');

        return `
            <div class="setting-row">
                <div>
                    <div class="setting-label">${label}</div>
                    <div class="setting-desc">${desc}</div>
                </div>
                <div class="setting-dropdown-container" id="dropdown-${key}" data-key="${key}" data-options='${JSON.stringify(options)}'>
                    <div class="setting-dropdown-trigger" 
                         ${key === 'damageFont' ? `style="font-family: '${current}', sans-serif;"` : ''} 
                         onclick="SettingsUI.toggleDropdown('${key}')">
                        ${current}
                    </div>
                    <div class="setting-dropdown-options">
                        ${optionsHtml}
                    </div>
                </div>
            </div>
        `;
    },

    toggleDropdown(key) {
        const container = document.getElementById(`dropdown-${key}`);
        const isOpen = container.classList.contains('open');

        // Close all others first
        document.querySelectorAll('.setting-dropdown-container').forEach(c => c.classList.remove('open'));

        if (!isOpen) {
            container.classList.add('open');
            this.highlightActive(container);
        }
    },

    selectOption(key, value) {
        SettingsState.set(key, value);
        const container = document.getElementById(`dropdown-${key}`);
        const trigger = container.querySelector('.setting-dropdown-trigger');
        trigger.innerText = value;
        if (key === 'damageFont') {
            trigger.style.fontFamily = `'${value}', sans-serif`;
        }
        container.classList.remove('open');
        this.updateTogglesFromState();
    },

    previewOption(key, value) {
        if (key === 'radarTheme' && typeof RadarSystem !== 'undefined') {
            // HUD Update
            RadarSystem.updateTheme(value);

            // Modal Preview Update
            const previewContainer = document.getElementById('radar-preview-container');
            if (previewContainer) {
                previewContainer.classList.add('active');
                RadarSystem.drawPreview('radar-theme-preview', value);
            }
        } else if (key === 'damageFont') {
            const container = document.getElementById(`dropdown-${key}`);
            const trigger = container.querySelector('.setting-dropdown-trigger');
            if (trigger) {
                trigger.style.fontFamily = `'${value}', sans-serif`;
                trigger.innerText = value;
            }
        }
    },

    revertPreview(key) {
        const current = SettingsState.get(key);
        if (key === 'radarTheme' && typeof RadarSystem !== 'undefined') {
            RadarSystem.updateTheme(current);

            // Hide Modal Preview
            const previewContainer = document.getElementById('radar-preview-container');
            if (previewContainer) {
                previewContainer.classList.remove('active');
            }
        } else if (key === 'damageFont') {
            const container = document.getElementById(`dropdown-${key}`);
            const trigger = container.querySelector('.setting-dropdown-trigger');
            if (trigger) {
                trigger.style.fontFamily = `'${current}', sans-serif`;
                trigger.innerText = current;
            }
        }
    },

    highlightActive(container) {
        const options = container.querySelectorAll('.setting-dropdown-option');
        const current = SettingsState.get(container.dataset.key);
        options.forEach(opt => {
            if (opt.dataset.value === current) opt.classList.add('highlighted');
            else opt.classList.remove('highlighted');
        });
    },

    setupListeners() {
        // Open
        document.getElementById('settings-gear-btn').addEventListener('click', () => {
            this.isOpen = true;
            document.getElementById('settings-modal-overlay').classList.add('active');
            document.body.classList.add('settings-active');
            // Pause game only if not already paused? 
            // Ideally settings should pause game logic.
            if (window.gamePaused === false && typeof window.togglePause === 'function') {
                window.togglePause();
            }
        });

        // Close
        const close = () => {
            this.isOpen = false;
            document.getElementById('settings-modal-overlay').classList.remove('active');
            document.body.classList.remove('settings-active');
            // Unpause? Maybe user wants to stay paused. Let's leave manual unpause for now or unpause if we auto-paused.
            // For safety, let the user decide when to unpause via the existing large pause overlay.
        };

        document.querySelector('.settings-close-btn').addEventListener('click', close);

        // Click outside closes
        document.getElementById('settings-modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'settings-modal-overlay') close();
        });

        // Tab Switching
        document.querySelectorAll('.settings-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Deactivate all
                document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));

                // Activate clicked
                e.target.classList.add('active');
                const targetId = `tab-${e.target.dataset.tab}`;
                document.getElementById(targetId).classList.add('active');

                // Close any open dropdowns when switching tabs
                document.querySelectorAll('.setting-dropdown-container').forEach(c => c.classList.remove('open'));
            });
        });

        // Global Click to close dropdowns
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.setting-dropdown-container')) {
                document.querySelectorAll('.setting-dropdown-container').forEach(c => c.classList.remove('open'));
            }
        });

        // Keyboard Support for open dropdown
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            const openDropdown = document.querySelector('.setting-dropdown-container.open');
            if (!openDropdown) return;

            const key = openDropdown.dataset.key;
            const options = JSON.parse(openDropdown.dataset.options);
            const highlighted = openDropdown.querySelector('.setting-dropdown-option.highlighted');
            let currentIndex = highlighted ? options.indexOf(highlighted.dataset.value) : options.indexOf(SettingsState.get(key));

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = (currentIndex + 1) % options.length;
                this.updateHighlighted(openDropdown, options[currentIndex]);
                this.previewOption(key, options[currentIndex]);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = (currentIndex - 1 + options.length) % options.length;
                this.updateHighlighted(openDropdown, options[currentIndex]);
                this.previewOption(key, options[currentIndex]);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (highlighted) this.selectOption(key, highlighted.dataset.value);
            } else if (e.key === 'Escape') {
                openDropdown.classList.remove('open');
                this.revertPreview(key);
            }
        });
    },

    updateHighlighted(container, value) {
        const options = container.querySelectorAll('.setting-dropdown-option');
        options.forEach(opt => {
            if (opt.dataset.value === value) {
                opt.classList.add('highlighted');
                opt.scrollIntoView({ block: 'nearest' });
            } else {
                opt.classList.remove('highlighted');
            }
        });
    },

    /**
     * TOGGLE HANDLER (Called from HTML onclick)
     */
    toggle(key) {
        const currentVal = SettingsState.get(key);
        const newVal = !currentVal;

        // Update State
        SettingsState.set(key, newVal);

        // Update UI
        this.updateTogglesFromState();
    },

    updateSlider(key, value) {
        SettingsState.set(key, parseInt(value));
        const valDisplay = document.getElementById(`val-${key}`);
        if (valDisplay) valDisplay.innerText = value;
    },

    /**
     * CYCLE OPTION HANDLER
     */
    cycleOption(key, btnEl) {
        const options = btnEl.dataset.options.split(',');
        const currentVal = SettingsState.get(key);
        let idx = options.indexOf(currentVal);

        // Next Option
        idx = (idx + 1) % options.length;
        const newVal = options[idx];

        // Update State
        SettingsState.set(key, newVal);

        // Update UI
        this.updateTogglesFromState();
    },

    updateTogglesFromState() {
        // Sync all switches
        const switches = document.querySelectorAll('.setting-switch');
        switches.forEach(sw => {
            const key = sw.dataset.key;
            const val = SettingsState.get(key);
            if (val) sw.classList.add('active');
            else sw.classList.remove('active');
        });

        // Sync selectors
        const selectors = document.querySelectorAll('.setting-selector');
        selectors.forEach(sel => {
            const key = sel.dataset.key;
            const val = SettingsState.get(key);
            sel.innerText = val;
        });

        // Sync Sliders
        const sliders = document.querySelectorAll('.setting-slider');
        sliders.forEach(sl => {
            const key = sl.dataset.key;
            const val = SettingsState.get(key);
            sl.value = val;
            const valDisplay = document.getElementById(`val-${key}`);
            if (valDisplay) valDisplay.innerText = val;
        });
    }
};
