// js/pressureEventManager.js
import * as Config from './config.js';
import * as db from './db.js'; // Used for saving/loading events if persistence is added

// Note: UIRenderer.showNotification will be passed as a callback by app.js

let allAutomatedEvents = []; // Stores all detected events
let hourlyTimesCache = []; // Stores the 'time' array from pressure data for calculations
let hourlyPressuresCache = []; // Stores the 'surface_pressure' array for calculations

/**
 * Updates the local cache of pressure data.
 * @param {Array<number>} times - Array of Unix timestamps (seconds).
 * @param {Array<number>} pressures - Array of pressure values.
 */
export function updatePressureDataCache(times, pressures) {
    hourlyTimesCache = times ? [...times] : [];
    hourlyPressuresCache = pressures ? [...pressures] : [];
}

/**
 * Assigns a severity score based on the absolute rate of pressure change.
 * @param {number} absoluteRateOfChange - The absolute rate of pressure change in hPa/hour.
 * @returns {string} The severity score ('Low', 'Medium', 'High').
 */
function getSeverityScore(absoluteRateOfChange) {
    // Example thresholds, adjust based on medical literature or desired sensitivity
    // These thresholds should consider both Config.MIN_PRESSURE_CHANGE_HPA and Config.MIN_DURATION_HOURS implicitly
    // A more robust approach might use a combination of absolute change and rate.
    if (absoluteRateOfChange >= (Config.MIN_PRESSURE_CHANGE_HPA * 1.5 / Config.MIN_DURATION_HOURS) && absoluteRateOfChange >= 0.8) return 'High'; // e.g. > 0.8 hPa/hr
    if (absoluteRateOfChange >= (Config.MIN_PRESSURE_CHANGE_HPA / Config.MIN_DURATION_HOURS) && absoluteRateOfChange >= 0.4) return 'Medium'; // e.g. > 0.4 hPa/hr
    return 'Low';
}

/**
 * Calculates rate of change and severity for an event object.
 * Modifies the event object in place.
 * @param {object} event - The event object.
 */
function calculateRateAndSeverity(event) {
    if (event.durationHours > 0) {
        event.rateOfChange = parseFloat((event.pressureChange / event.durationHours).toFixed(2)); // Signed rate
        const absoluteRate = Math.abs(event.rateOfChange);
        event.severity = getSeverityScore(absoluteRate);
    } else {
        event.rateOfChange = 0; // Or Infinity, or handle as error. For now, 0.
        event.severity = 'Low'; // Or 'N/A'
    }
}

/**
 * Detects and stores automated pressure events from timeseries data.
 * @param {Array<number>} times - Array of Unix timestamps (seconds). Should be from hourlyTimesCache.
 * @param {Array<number>} pressures - Array of pressure values. Should be from hourlyPressuresCache.
 * @param {Function} showNotificationCallback - Function to show notifications.
 * @returns {Array<Object>} Array of detected event objects.
 */
export function detectAndStoreAutomatedPressureEvents(times, pressures, showNotificationCallback) {
    allAutomatedEvents = []; // Reset

    if (!times || !pressures || times.length !== pressures.length || times.length < 2) {
        console.error("Insufficient or invalid data for event detection in pressureEventManager.");
        if(showNotificationCallback) showNotificationCallback("Error: Cannot detect events due to invalid pressure data.", "error");
        return [];
    }

    // Ensure local cache is up-to-date if this function is called directly with new data
    updatePressureDataCache(times, pressures);

    if (times.length < (Config.MIN_DURATION_HOURS + 1)) { // Need enough points for min duration
        if(showNotificationCallback) showNotificationCallback(`Not enough data points for a ${Config.MIN_DURATION_HOURS}hr event.`, "info");
        return [];
    }

    let ongoingEventType = null; // 'rise' or 'fall'
    let eventStartTime = null;
    let eventStartPressure = null;

    for (let i = 1; i < times.length; i++) {
        const lastPressure = pressures[i-1];
        const currentPressure = pressures[i];
        const currentTrend = currentPressure > lastPressure ? 'rise' : (currentPressure < lastPressure ? 'fall' : ongoingEventType); // Maintain trend if pressure is flat

        if (ongoingEventType === null && currentTrend !== null) { // Start of the very first trend
            ongoingEventType = currentTrend;
            eventStartTime = times[i-1]; // Trend starts from previous point
            eventStartPressure = pressures[i-1];
        } else if (currentTrend !== ongoingEventType && ongoingEventType !== null) {
            // Trend changed, finalize previous event if significant
            const eventEndTime = times[i-1]; // Event ended at the previous point
            const eventEndPressure = pressures[i-1];
            const durationSecs = eventEndTime - eventStartTime;
            const durationHrs = durationSecs / 3600;
            const pChange = parseFloat((eventEndPressure - eventStartPressure).toFixed(1));

            if (durationHrs >= Config.MIN_DURATION_HOURS && Math.abs(pChange) >= Config.MIN_PRESSURE_CHANGE_HPA) {
                const newEvent = {
                    id: eventStartTime.toString() + '-' + ongoingEventType + '-' + Math.random().toString(36).substr(2, 5), // Unique ID
                    startTime: eventStartTime,
                    endTime: eventEndTime,
                    startPressure: eventStartPressure,
                    endPressure: eventEndPressure,
                    durationHours: parseFloat(durationHrs.toFixed(1)),
                    pressureChange: pChange,
                    type: ongoingEventType, // 'rise' or 'fall'
                    // No isMerged or originalEventsData needed
                };
                calculateRateAndSeverity(newEvent);
                allAutomatedEvents.push(newEvent);
            }

            // Start new event segment regardless of significance of old one
            eventStartTime = times[i-1]; // New event starts where old one ended
            eventStartPressure = pressures[i-1];
            ongoingEventType = currentTrend; // The new trend
        }
    }

    // Finalize any ongoing event at the end of the data
    if (ongoingEventType !== null && eventStartTime !== null) {
        const eventEndTime = times[times.length - 1];
        const eventEndPressure = pressures[pressures.length - 1];
        const durationSecs = eventEndTime - eventStartTime;
        const durationHrs = durationSecs / 3600;
        const pChange = parseFloat((eventEndPressure - eventStartPressure).toFixed(1));

        if (durationHrs >= Config.MIN_DURATION_HOURS && Math.abs(pChange) >= Config.MIN_PRESSURE_CHANGE_HPA) {
            const newEvent = {
                id: eventStartTime.toString() + '-' + ongoingEventType + '-final-' + Math.random().toString(36).substr(2, 5),
                startTime: eventStartTime,
                endTime: eventEndTime,
                startPressure: eventStartPressure,
                endPressure: eventEndPressure,
                durationHours: parseFloat(durationHrs.toFixed(1)),
                pressureChange: pChange,
                type: ongoingEventType,
            };
            calculateRateAndSeverity(newEvent);
            allAutomatedEvents.push(newEvent);
        }
    }

    allAutomatedEvents.sort((a, b) => a.startTime - b.startTime); // Sort by start time

    if (showNotificationCallback) {
        if (allAutomatedEvents.length > 0) {
            showNotificationCallback(`${allAutomatedEvents.length} automated pressure events detected.`, "info", 2000);
        } else {
            showNotificationCallback("No significant automated pressure events detected.", "info", 2000);
        }
    }
    // Persist events (optional, could be added here if desired)
    // db.saveData(Config.PRESSURE_EVENTS_STORAGE_KEY, allAutomatedEvents);
    return [...allAutomatedEvents]; // Return a copy
}

/** @returns {Array<Object>} A copy of all current automated events. */
export function getAllAutomatedEvents() {
    // Optionally load from persistence if empty and feature is enabled
    // if (allAutomatedEvents.length === 0) {
    //     const storedEvents = db.loadData(Config.PRESSURE_EVENTS_STORAGE_KEY);
    //     if (storedEvents) allAutomatedEvents = storedEvents;
    // }
    return [...allAutomatedEvents];
}

// handleMergeAutomatedEvents function removed
// handleUnmergeAutomatedEvent function removed

// filename: js/pressureEventManager.js