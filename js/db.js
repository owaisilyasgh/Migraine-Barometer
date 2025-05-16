// js/db.js - Simple localStorage wrapper as an ES6 module

/**
 * Saves data to localStorage.
 * @param {string} key - The key under which to store the data.
 * @param {any} data - The data to store (will be JSON.stringified).
 */
export function saveData(key, data) {
    if (typeof key !== 'string' || key.trim() === '') {
        console.error('Error saving data: Key must be a non-empty string.');
        return;
    }
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving data for key "${key}":`, error);
        // Potentially handle quota exceeded errors more gracefully
        // For example, by notifying the user or attempting to clear older, less critical data.
    }
}

/**
 * Loads data from localStorage.
 * @param {string} key - The key for the data to retrieve.
 * @returns {any|null} The parsed data, or null if not found or if parsing fails.
 */
export function loadData(key) {
    if (typeof key !== 'string' || key.trim() === '') {
        console.error('Error loading data: Key must be a non-empty string.');
        return null;
    }
    try {
        const dataString = localStorage.getItem(key);
        if (dataString === null) {
            return null; // Key not found
        }
        return JSON.parse(dataString);
    } catch (error) {
        console.error(`Error loading or parsing data for key "${key}":`, error);
        return null; // Return null on parsing error or other issues
    }
}

/**
 * Removes data from localStorage.
 * @param {string} key - The key for the data to remove.
 */
export function removeData(key) {
    if (typeof key !== 'string' || key.trim() === '') {
        console.error('Error removing data: Key must be a non-empty string.');
        return;
    }
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error removing data for key "${key}":`, error);
    }
}

// filename: js/db.js