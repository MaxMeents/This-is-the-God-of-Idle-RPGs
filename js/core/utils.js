/**
 * GOD NUMBER FORMATTER
 * 
 * Implements the "3-digit fixed-width" notation:
 * - Below 1k: 123
 * - Above 1k: 1.23k, 12.3k, 123k
 * - Suffixes: k, m, b, t, a, b, c, d, ... z
 */

const formatGodNumber = (val) => {
    if (val === undefined || val === null || isNaN(val)) return "0";
    if (val < 1000) return Math.floor(val).toString();

    // Suffixes starting from k (10^3)
    // 1:k, 2:m, 3:b, 4:t, 5:a, 6:b, 7:c ...
    const SUFFIXES = ["", "k", "m", "b", "t", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];

    const exp = Math.floor(Math.log10(val) / 3);
    const suffix = SUFFIXES[exp] || "!!"; // !! indicates beyond 'z'

    const shortVal = val / Math.pow(1000, exp);

    // Always 3 digits logic
    if (shortVal >= 100) {
        // e.g. 252.3 -> 252
        return Math.floor(shortVal) + suffix;
    } else if (shortVal >= 10) {
        // e.g. 25.23 -> 25.2
        return shortVal.toFixed(1) + suffix;
    } else {
        // e.g. 2.523 -> 2.52
        return shortVal.toFixed(2) + suffix;
    }
};

window.formatGodNumber = formatGodNumber;
