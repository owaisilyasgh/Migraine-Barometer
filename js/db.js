// js/db.js - Simple localStorage wrapper as an ES6 module

const db = {
    /**
     * Saves data to localStorage.
     * @param {string} key - The key under which to store the data.
     * @param {any} data - The data to store (will be JSON.stringified).
     */
    saveData(key, data) {
        if (typeof key !== 'string' || key.trim() === '') {
            console.error('Error saving data: Key must be a non-empty string.');
            return;
        }
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving data for key "${key}":`, error);
            // Potentially handle quota exceeded errors more gracefully
        }
    },

    /**
     * Loads data from localStorage.
     * @param {string} key - The key for the data to retrieve.
     * @returns {any|null} The parsed data, or null if not found or if parsing fails.
     */
    loadData(key) {
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
            return null;
        }
    },

    /**
     * Removes data from localStorage.
     * @param {string} key - The key for the data to remove.
     */
    removeData(key) {
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
};

export default db;
// filename: js/db.js