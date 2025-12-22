/**
 * SIMULATION UI SYSTEM
 * Handles the "Training Simulation" modal, level selection, and live previews.
 * Refined for AAA Aesthetic & 'Loot Ledger' Integration.
 */

const SimulationUI = {
    isOpen: false,
    selectedSector: 1,
    selectedLevelId: 1,
    selectedDifficulty: 'normal', // Default: Normal (Index 0)

    // Preview PIXI Application
    previewApp: null,
    previewContainer: null,
    previewSprites: [], // Array to hold the "crowd"

    // Cache for drop icons
    dropContainer: null,

    async init() {
        console.log("[SIM UI] Initializing Training System (God Mode)...");

        this.cacheDOM();
        this.setupListeners();
        await this.initPreview();
        this.buildDifficultySelector(); // Now uses Loot Ledger circles
        this.selectDifficulty(this.selectedDifficulty); // Initialize CSS Variables
    },

    cacheDOM() {
        this.overlay = document.getElementById('training-sim-overlay');
        this.openBtn = document.getElementById('open-sim-btn');
        this.closeBtn = document.getElementById('close-sim-btn');
        this.sectorsList = document.getElementById('sim-sectors-list');
        this.levelGrid = document.getElementById('sim-level-grid');
        this.sectorTitle = document.getElementById('sim-sector-title');

        // Stats
        this.levelName = document.getElementById('sim-level-name');
        this.enemyCount = document.getElementById('sim-enemy-count');
        this.dmgEst = document.getElementById('sim-dmg-est');
        this.rewardMult = document.getElementById('sim-reward-mult');

        // Difficulty
        this.difficultySelector = document.getElementById('sim-difficulty-selector');

        this.engageBtn = document.getElementById('engage-btn');
    },

    setupListeners() {
        if (this.openBtn) this.openBtn.addEventListener('click', () => this.open());
        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
        if (this.engageBtn) this.engageBtn.addEventListener('click', () => this.engage());
    },

    /**
     * INIT PREVIEW PIXI APP
     * Creates a lightweight PIXI instance just for the sector enemy crowd preview.
     */
    async initPreview() {
        const canvas = document.getElementById('sim-preview-canvas');
        if (!canvas) return;

        this.previewApp = new PIXI.Application();
        await this.previewApp.init({
            canvas: canvas,
            backgroundAlpha: 0, // Transparent for CSS grid background
            width: canvas.clientWidth,
            height: canvas.clientHeight,
            antialias: true
        });

        this.previewContainer = new PIXI.Container();
        this.previewApp.stage.addChild(this.previewContainer);

        // Center Coordinate container
        this.previewContainer.x = this.previewApp.screen.width / 2;
        this.previewContainer.y = this.previewApp.screen.height / 2;
    },

    open() {
        this.isOpen = true;
        this.overlay.style.display = 'block';
        requestAnimationFrame(() => this.overlay.classList.add('active'));

        // Generate Content if first load
        if (this.sectorsList.children.length === 0) {
            this.buildSectors();
            this.renderGrid(1); // Default to Sector 1
        }
    },

    close() {
        this.isOpen = false;
        this.overlay.classList.remove('active');
        setTimeout(() => {
            this.overlay.style.display = 'none';
        }, 400);
    },

    buildSectors() {
        this.sectorsList.innerHTML = '';
        const sectors = [
            { id: 1, name: 'GENESIS', range: '1-100' },
            { id: 2, name: 'AWAKENING', range: '101-200' },
            { id: 3, name: 'ASCENSION', range: '201-300' },
            { id: 4, name: 'DIVINITY', range: '301-400' },
            { id: 5, name: 'ETERNITY', range: '401-500' }
        ];

        const tiers = ['normal', 'arch', 'god', 'alpha', 'omega'];

        sectors.forEach((sec, idx) => {
            const tier = tiers[idx];
            const btn = document.createElement('div');
            btn.className = `sector-btn tier-${tier} ${sec.id === this.selectedSector ? 'active' : ''}`;
            btn.innerHTML = `
                <div class="sector-title">SECTOR ${sec.id} // ${sec.range}</div>
                <div class="sector-name">${sec.name}</div>
            `;
            btn.addEventListener('click', () => this.switchSector(sec.id, sec.name));
            this.sectorsList.appendChild(btn);
        });
    },

    switchSector(id, name) {
        this.selectedSector = id;
        this.sectorTitle.innerText = `SECTOR ${id}: ${name}`;

        // Update UI visuals
        Array.from(this.sectorsList.children).forEach((el, idx) => {
            el.classList.toggle('active', idx + 1 === id);
        });

        this.renderGrid(id);
    },

    renderGrid(sectorId) {
        this.levelGrid.innerHTML = '';
        const start = (sectorId - 1) * 100 + 1;
        const end = start + 99;

        // Ensure levels exist
        const allLevels = SIMULATION_CONFIG.generateLevels();

        for (let i = start; i <= end; i++) {
            const levelData = SIMULATION_CONFIG.generateLevels()[i - 1];

            const node = document.createElement('div');
            // If Level ID matches selected, add active class
            node.className = `level-node ${i % 50 === 0 ? 'boss' : ''} ${i === this.selectedLevelId ? 'active' : ''}`;
            node.innerText = i;

            node.addEventListener('click', () => this.selectLevel(i));
            this.levelGrid.appendChild(node);
        }
    },

    selectLevel(id) {
        this.selectedLevelId = id;

        // Update Grid UI
        const nodes = this.levelGrid.children;
        Array.from(nodes).forEach(n => {
            n.classList.toggle('active', parseInt(n.innerText) === id);
        });

        this.updateCommandDeck(id);
    },

    updateCommandDeck(id) {
        const allLevels = SIMULATION_CONFIG.generateLevels();
        const levelData = allLevels[id - 1];
        if (!levelData) return;

        this.levelName.innerHTML = `<span class="text-tech-grid" style="font-size: 24px;">${levelData.name}</span>`;

        const totalCount = Object.values(levelData.enemies).reduce((a, b) => a + b, 0);
        this.enemyCount.innerText = formatGodNumber(totalCount);

        // Intensity scaling for DMG Est
        const diffIdx = SIMULATION_CONFIG.DIFFICULTY.findIndex(d => d.id === this.selectedDifficulty);
        const diff = SIMULATION_CONFIG.DIFFICULTY[diffIdx];

        // MASTER CALCULATION
        const masterScale = SIMULATION_CONFIG.getStatScale(id, diffIdx);

        const estDmg = 10 * masterScale; // Base 10 * scale
        this.dmgEst.innerText = `${formatGodNumber(estDmg)} DPS`;

        // REWARD MULTIPLIER: Also scales with master logic
        const rewardMult = SIMULATION_CONFIG.getRewardScale(id, diffIdx);
        this.rewardMult.innerText = `x${formatGodNumber(rewardMult)}`;
        this.rewardMult.style.color = diff.color; // Dynamic color

        this.renderSectorPreview(levelData, totalCount);
        this.updateDrops(levelData);
    },

    updateDrops(levelData) {
        const container = document.getElementById('sim-drops-list');
        if (!container) return;
        container.innerHTML = '';

        if (!levelData.potentialDrops || levelData.potentialDrops.length === 0) {
            container.innerHTML = '<span style="color: #444; font-size: 12px;">NO GUARANTEED DROPS</span>';
            return;
        }

        levelData.potentialDrops.forEach(dropId => {
            const drop = LOOT_CONFIG.ITEMS[dropId];
            if (!drop) return;

            const img = document.createElement('img');
            img.src = drop.icon;
            img.title = drop.name;
            img.className = 'sim-drop-icon';

            // Add tier-specific glow mapping
            const tier = drop.tier || 'normal';
            const tierColor = SIMULATION_CONFIG.DIFFICULTY.find(d => d.id === tier)?.color || '#fff';
            img.style.border = `1px solid ${tierColor}`;
            img.style.boxShadow = `0 0 5px ${tierColor}44`;

            container.appendChild(img);
        });
    },

    renderSectorPreview(levelData, count) {
        if (!this.previewContainer) return;
        // Clear previous
        this.previewContainer.removeChildren();
        this.previewSprites = [];

        // All available types for the swarm
        const allTypes = ['GalaxyDragon', 'BlueDragon', 'PhoenixSurrender', 'GalaxyButterfly', 'BlueWhiteButterfly', 'GoldButterfly', 'GreenBlackButterfly', 'BlackRedButterfly'];

        const assetKeyMap = {
            'GalaxyDragon': 'img/Enemies/GalaxyDragon.png',
            'BlueDragon': 'img/Enemies/BlueDragon.png',
            'PhoenixSurrender': 'img/Enemies/PhoenixSurrender.png',
            'GalaxyButterfly': 'img/Enemies/GalaxyButterfly.png',
            'BlueWhiteButterfly': 'img/Enemies/BlueWhiteButterfly.png',
            'GoldButterfly': 'img/Enemies/GoldButterfly.png',
            'GreenBlackButterfly': 'img/Enemies/GreenBlackButterfly.png',
            'BlackRedButterfly': 'img/Enemies/BlackRedButterfly.png'
        };

        // User requested 4000 enemies.
        const displayCount = 4000;

        for (let i = 0; i < displayCount; i++) {
            // Randomly select a texture for diversity
            const randomType = allTypes[Math.floor(Math.random() * allTypes.length)];
            const path = assetKeyMap[randomType];
            const texture = PIXI.Texture.from(path);

            const sprite = new PIXI.Sprite(texture);
            sprite.anchor.set(0.5);

            // Randomize position in a larger cloud for 4000 units
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 250; // Larger radius

            sprite.x = Math.cos(angle) * dist;
            sprite.y = Math.sin(angle) * dist;

            // Randomize Scale (Smaller to fit 4000)
            const scaleBase = 0.08;
            sprite.scale.set(scaleBase + Math.random() * 0.1);

            // Store specialized animation data
            sprite.animData = {
                speed: 0.05 + Math.random() * 0.1,
                range: 5 + Math.random() * 10,
                offset: Math.random() * Math.PI * 2,
                startX: sprite.x,
                startY: sprite.y
            };

            this.previewContainer.addChild(sprite);
            this.previewSprites.push(sprite);
        }
    },

    buildDifficultySelector() {
        const container = this.difficultySelector;
        container.innerHTML = '';

        SIMULATION_CONFIG.DIFFICULTY.forEach(diff => {
            const node = document.createElement('div');
            node.className = `tier-circle tier-${diff.id} ${diff.id === this.selectedDifficulty ? 'active' : ''}`;

            // Interaction
            node.addEventListener('click', () => this.selectDifficulty(diff.id));
            container.appendChild(node);
        });
    },

    selectDifficulty(diffId) {
        this.selectedDifficulty = diffId;
        const diff = SIMULATION_CONFIG.DIFFICULTY.find(d => d.id === diffId);

        this.buildDifficultySelector(); // Update Active State
        this.updateCommandDeck(this.selectedLevelId); // Refresh Stats

        // DYNAMIC COLOR & GRADIENT UPDATE
        this.overlay.style.setProperty('--sim-accent', diff.color);

        const TEXT_GRADIENTS = {
            'normal': 'linear-gradient(90deg, #fff, #ccc, #fff)',
            'arch': 'linear-gradient(0deg, #ffd700 0%, #ffffff 50%, #ffd700 100%)',
            'god': 'linear-gradient(0deg, #ff0000 0%, #ffff00 15%, #00ff00 30%, #00ffff 50%, #0000ff 70%, #ff00ff 85%, #ff0000 100%)',
            'alpha': 'linear-gradient(0deg, #ff0000 0%, #ffff00 15%, #00ff00 30%, #00ffff 50%, #0000ff 70%, #ff00ff 85%, #ff0000 100%)',
            'omega': 'linear-gradient(0deg, #ff00ff 0%, #ffffff 50%, #ff00ff 100%)'
        };

        const CONIC_GRADIENTS = {
            'normal': '#fff',
            'arch': 'conic-gradient(from 0deg, #ffd700, #ffffff, #ffd700, #ffffff, #ffd700)',
            'god': 'conic-gradient(from 0deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff, #ff0000)',
            'alpha': 'conic-gradient(from 0deg, #00ffff, #fff, #00ffff, #fff, #00ffff)',
            'omega': 'conic-gradient(from 0deg, #fff, #ff00ff, #fff, #ff00ff, #fff)'
        };

        const gradient = TEXT_GRADIENTS[diff.id] || TEXT_GRADIENTS['normal'];
        const conic = CONIC_GRADIENTS[diff.id] || CONIC_GRADIENTS['normal'];

        this.overlay.style.setProperty('--sim-text-gradient', gradient);
        this.overlay.style.setProperty('--sim-conic-gradient', conic);
    },

    engage() {
        if (!this.selectedLevelId) return;

        const diffObj = SIMULATION_CONFIG.DIFFICULTY.find(d => d.id === this.selectedDifficulty);
        const allLevels = SIMULATION_CONFIG.generateLevels();
        const levelData = allLevels[this.selectedLevelId - 1];

        console.log(`[SIM] Engaging Level ${this.selectedLevelId} [${diffObj.name}]`);

        window.simulationMode = true;
        window.simulationLevel = levelData;
        window.simulationDifficulty = diffObj;

        this.close();

        if (typeof changeStage === 'function') {
            changeStage(2000 + this.selectedLevelId);
        }
    }
};

// Animation Loop for Preview Crowd
window.requestAnimationFrame(function animateSimPreview() {
    if (SimulationUI.isOpen && SimulationUI.previewSprites.length > 0) {
        const now = Date.now() / 1000;

        SimulationUI.previewSprites.forEach(sprite => {
            const d = sprite.animData;
            // "Attacking in place" motion: Aggressive hover/lunge
            sprite.y = d.startY + Math.sin(now * 5 + d.offset) * (d.range / 2); // Fast bob
            sprite.x = d.startX + Math.cos(now * 3 + d.offset) * (d.range / 4); // Slight sway

            // Face center (roughly)
            sprite.rotation = Math.sin(now + d.offset) * 0.1;
        });
    }
    window.requestAnimationFrame(animateSimPreview);
});
