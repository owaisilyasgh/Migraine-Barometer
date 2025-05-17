// filename: js/db.js
// js/db.js - Simple localStorage wrapper as an ES6 module
import * as G_CONFIG from './config.js'; // G_CONFIG stands for Global Config

/**
 * Saves data to localStorage.
 * @param {string} key - The key under which to store the data.
 * @param {any} data - The data to store (will be JSON.stringified).
 */
export function saveData(key, data) {
    if (typeof key !== 'string' || key.trim() === '') {
        if (G_CONFIG.DEBUG_MODE) console.error('DB Error: Key must be a non-empty string for saveData.');
        return;
    }
    try {
        localStorage.setItem(key, JSON.stringify(data));
        if (G_CONFIG.DEBUG_MODE) console.log(`DB: Data saved for key "${key}"`, data);
    } catch (error) {
        if (G_CONFIG.DEBUG_MODE) console.error(`DB Error: Saving data for key "${key}":`, error);
        // Potentially handle quota exceeded errors more gracefully
    }
}

/**
 * Loads data from localStorage.
 * @param {string} key - The key for the data to retrieve.
 * @returns {any|null} The parsed data, or null if not found or if parsing fails.
 */
export function loadData(key) {
    if (typeof key !== 'string' || key.trim() === '') {
        if (G_CONFIG.DEBUG_MODE) console.error('DB Error: Key must be a non-empty string for loadData.');
        return null;
    }
    try {
        const dataString = localStorage.getItem(key);
        if (dataString === null) {
            if (G_CONFIG.DEBUG_MODE) console.log(`DB: No data found for key "${key}".`);
            return null; // Key not found
        }
        const parsedData = JSON.parse(dataString);
        if (G_CONFIG.DEBUG_MODE) console.log(`DB: Data loaded for key "${key}"`, parsedData);
        return parsedData;
    } catch (error) {
        if (G_CONFIG.DEBUG_MODE) console.error(`DB Error: Loading or parsing data for key "${key}":`, error);
        return null; // Return null on parsing error or other issues
    }
}

/**
 * Removes data from localStorage.
 * @param {string} key - The key for the data to remove.
 */
export function removeData(key) {
    if (typeof key !== 'string' || key.trim() === '') {
        if (G_CONFIG.DEBUG_MODE) console.error('DB Error: Key must be a non-empty string for removeData.');
        return;
    }
    try {
        localStorage.removeItem(key);
        if (G_CONFIG.DEBUG_MODE) console.log(`DB: Data removed for key "${key}".`);
    } catch (error) {
        if (G_CONFIG.DEBUG_MODE) console.error(`DB Error: Removing data for key "${key}":`, error);
    }
}
// filename: js/db.js