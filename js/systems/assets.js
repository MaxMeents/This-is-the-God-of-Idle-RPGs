const shipAssets = {
    onImg: new Image(),
    fullImg: new Image(),
    shieldOnImg: new Image(),
    shieldTurnOnImg: new Image(),
    onCache: [],
    fullCache: [],
    shieldOnCache: [],
    shieldTurnOnCache: [],
    baked: false
};

const skillAssets = {
    buttonImg: new Image(),
    skillImg: new Image(),
    buttonCache: [],
    skillCache: [],
    baked: false,
    ready: false
};

const enemyAssets = {};
enemyKeys.forEach(k => {
    enemyAssets[k] = {
        walk: new Image(),
        death: new Image(),
        attack: new Image(),
        caches: { walk: {}, death: {}, attack: {} }
    };
});

const floorImg = new Image();
let floorPattern = null;

function bakeShip() {
    if (shipAssets.baked) return;
    const sc = SHIP_CONFIG;
    const bake = (img, frames, cols, size, targetCache, targetSize) => {
        for (let i = 0; i < frames; i++) {
            const can = document.createElement('canvas'); can.width = targetSize; can.height = targetSize;
            const cctx = can.getContext('2d');
            cctx.drawImage(img, (i % cols) * size, Math.floor(i / cols) * size, size, size, 0, 0, targetSize, targetSize);
            targetCache.push(can);
        }
    };
    bake(shipAssets.onImg, sc.onFrames, sc.onCols, sc.onSize, shipAssets.onCache, 512);
    bake(shipAssets.fullImg, sc.fullFrames, sc.fullCols, sc.fullSize, shipAssets.fullCache, 512);
    bake(shipAssets.shieldOnImg, sc.shieldOnFrames, sc.shieldOnCols, sc.shieldOnSize, shipAssets.shieldOnCache, 768);
    bake(shipAssets.shieldTurnOnImg, sc.shieldTurnOnFrames, sc.shieldTurnOnCols, sc.shieldTurnOnSize, shipAssets.shieldTurnOnCache, 512);
    shipAssets.baked = true;
}

function bakeSkills() {
    if (skillAssets.baked) return;
    const cfg = SKILLS.MulticolorXFlame;
    for (let i = 0; i < cfg.buttonFrames; i++) {
        const can = document.createElement('canvas'); can.width = 256; can.height = 256;
        const cctx = can.getContext('2d');
        cctx.drawImage(skillAssets.buttonImg, (i % cfg.buttonCols) * cfg.buttonSize, Math.floor(i / cfg.buttonCols) * cfg.buttonSize, cfg.buttonSize, cfg.buttonSize, 0, 0, 256, 256);
        skillAssets.buttonCache.push(can);
    }
    for (let i = 0; i < cfg.skillFrames; i++) {
        const can = document.createElement('canvas'); can.width = 512; can.height = 512;
        const cctx = can.getContext('2d');
        cctx.drawImage(skillAssets.skillImg, (i % cfg.skillCols) * cfg.skillSize, Math.floor(i / cfg.skillCols) * cfg.skillSize, cfg.skillSize, cfg.skillSize, 0, 0, 512, 512);
        skillAssets.skillCache.push(can);
    }
    skillAssets.baked = true;
}

function onAssetLoad() {
    loadedCt++;
    const totalToLoad = (enemyKeys.length * 3) + 1 + 4 + 2; // enemies(3x) + floor(1) + ship(4) + skill(2)
    // Actually, skillAssets.ready handles skill baking.
    if (loadedCt >= totalToLoad) {
        document.getElementById('loading').style.display = 'none';
        document.body.style.backgroundImage = `url("${FLOOR_PATH}")`;
        floorPattern = true;
        enemyKeys.forEach(k => buildEnemyCache(k));
        bakeShip();
        init(true);
    }
}
