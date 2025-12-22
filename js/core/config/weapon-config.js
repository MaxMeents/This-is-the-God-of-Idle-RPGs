/**
 * WEAPON CONFIGURATION
 * 
 * Defines the automated turret systems on the ship.
 * Each weapon has unique fire rates, damage values, and resource (ammo) requirements.
 * 
 * LOCATED IN: js/core/config/weapon-config.js
 */

const WEAPON_CONFIG = {
    /*
     * BULLET TURRETS (Sides)
     * High fire-rate projectile weapons.
     */
    bullet_left_side: {
        path: 'img/Laser Sprites/09.webp',
        fireRate: 5,        // Ticks between shots
        damage: 10,
        speed: 340,         // Projectile travel speed (1.7x faster)
        life: 8000,          // Time until projectile expires (ms)
        size: 1980,           // Projectile visual scaling
        offsetSide: -180,    // Positioning on ship (Left)
        offsetFront: 80,     // Positioning on ship (Forward)
        penetration: 5,      // How many enemies it can pass through
        visualStretch: 1,  // Stretching factor for high-speed effect
        maxAmmo: 50,         // Total capacity
        recoveryRate: 5,     // Recovery per tick
        tint: 0x00ffff,      // Laser color (Cyan)
        minAmmoToFire: 10    // Safety buffer before resuming fire
    },

    bullet_right_side: {
        path: 'img/Laser Sprites/09.webp',
        fireRate: 5,
        damage: 10,
        speed: 340,
        life: 8000,
        size: 1980,
        offsetSide: 180,     // Positioning on ship (Right)
        offsetFront: 80,
        penetration: 5,
        visualStretch: 1,
        maxAmmo: 50,
        recoveryRate: 5,
        tint: 0x00ffff,
        minAmmoToFire: 10
    },

    /**
     * MAIN LASER (Center)
     * High-penetration heavy weapon.
     */
    laser: {
        path: 'img/Laser Sprites/02.webp',
        fireRate: 95,
        damage: 10,
        speed: 500,
        life: 4000,
        size: 380,
        visualStretch: 5.0,
        offsetSide: 0,
        offsetFront: 80,
        penetration: 25,
        maxAmmo: 200,
        recoveryRate: 1,
        tint: 0xff00ff,      // Laser color (Magenta)
        minAmmoToFire: 50
    }
};
