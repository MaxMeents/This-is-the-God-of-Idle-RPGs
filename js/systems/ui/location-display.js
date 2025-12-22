/**
 * LOCATION DISPLAY SYSTEM
 * 
 * Handles the "Decryption" scramble animation for cinematic titles.
 * Triggers when the simulation starts.
 */

class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.update = this.update.bind(this);
    }

    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);
        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }
        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }

    update() {
        let output = '';
        let complete = 0;
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="scramble-char" style="opacity: 0.5; color: #00ffff;">${char}</span>`;
            } else {
                output += from;
            }
        }
        this.el.innerHTML = output;
        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }

    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

// Initialization and automatic boot sequence
document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('location-display');
    if (!el) return;

    // Create Matrix Background
    const canvas = document.createElement('canvas');
    canvas.id = 'location-matrix-bg';
    el.appendChild(canvas);
    initMatrix(canvas);

    const fx = new TextScramble(el.querySelector('span') || el);
    // Note: Scramble will now target the text span to avoid clearing the canvas

    // Delayed boot to feel like system initialization
    setTimeout(() => {
        fx.setText('LOCATION: THE TRAINING SIMULATION');
    }, 1500);

    window.LocationDisplay = fx;
});

function initMatrix(canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, cols, ypos;

    function reset() {
        w = canvas.width = canvas.parentElement.offsetWidth;
        h = canvas.height = canvas.parentElement.offsetHeight;
        cols = Math.floor(w / 12) + 1; // Slightly wider spacing for clarity
        ypos = Array(cols).fill(0).map(() => Math.random() * h); // Start at random heights
    }

    reset();

    function matrix() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'; // Slightly deeper fade
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#0ff';
        ctx.font = '700 10pt monospace'; // Slightly larger for impact

        ypos.forEach((y, ind) => {
            const text = String.fromCharCode(0x30A0 + Math.random() * 96);
            const x = ind * 12;
            ctx.fillText(text, x, y);
            if (y > 100 + Math.random() * 10000) ypos[ind] = 0;
            else ypos[ind] = y + 12;
        });
    }

    setInterval(matrix, 50);

    // Resize observer to handle dynamic width changes
    new ResizeObserver(() => {
        if (canvas.parentElement.offsetWidth !== w) {
            reset();
        }
    }).observe(canvas.parentElement);
}
