/**
 * color.js
 * 
 * Shared color manipulation utilities for the BTOB mobile application.
 */

/**
 * Adjusts a hex color by a given amount (positive to lighten, negative to darken).
 * @param {string} hex - The hex color string (e.g., "#3B82F6").
 * @param {number} amount - The amount to adjust each RGB channel.
 * @returns {string} - The adjusted hex color string.
 */
export function adjustColor(hex, amount) {
    if (!hex) return '#000000';
    try {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const b = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        const g = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return '#' + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    } catch (e) {
        return hex;
    }
}
