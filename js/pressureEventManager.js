// js/pressureEventManager.js
import * as Config from './config.js';
// Note: UIRenderer.showNotification and ChartManager functions will be passed or handled by app.js

let allAutomatedEvents = []; // Stores all detected/merged events
let hourlyTimesCache = []; // Stores the 'time' array from pressure data for calculations
let hourlyPressuresCache = []; // Stores the 'surface_pressure' array for calculations

/**
 * Assigns a severity score based on the absolute rate of pressure change.
 * @param {number} absoluteRateOfChange - The absolute rate of pressure change in hPa/hour.
 * @returns {string} The severity score ('Low', 'Medium', 'High').
 */
function getSeverityScore(absoluteRateOfChange) {
    if (absoluteRateOfChange >= (Config.MIN_PRESSURE_CHANGE_HPA * 1.5 / Config.MIN_DURATION_HOURS) && absoluteRateOfChange >= 0.8) return 'High'; // e.g. > 0.8 hPa/hr
    if (absoluteRateOfChange >= (Config.MIN_PRESSURE_CHANGE_HPA / Config.MIN_DURATION_HOURS) && absoluteRateOfChange >= 0.4) return 'Medium'; // e.g. > 0.4 hPa/hr
    if (absoluteRateOfChange > 0) return 'Low';
    return 'Stable';
}

/**
 * Calculates rate of change and severity for an event object.
 * Modifies the event object in place.
 * @param {object} event - The event object.
 */
function calculateRateAndSeverity(event) {
    if (event.durationHours > 0 && typeof event.pressureChange === 'number') {
        event.rateOfChange = parseFloat((event.pressureChange / event.durationHours).toFixed(2)); // Signed rate
        const absoluteRate = Math.abs(event.rateOfChange);
        event.severity = getSeverityScore(absoluteRate);
    } else {
        event.rateOfChange = 0;
        event.severity = 'N/A';
    }
}

/**
 * Detects and stores automated pressure events from timeseries data.
 * @param {Array<number>} times - Array of Unix timestamps (seconds).
 * @param {Array<number>} pressures - Array of pressure values.
 * @param {Function} showNotificationCallback - Function to show notifications.
 * @returns {Array<Object>} Array of detected event objects.
 */
export function detectAndStoreAutomatedPressureEvents(times, pressures, showNotificationCallback) {
    allAutomatedEvents = []; // Reset
    hourlyTimesCache = [...times]; 
    hourlyPressuresCache = [...pressures]; 

    if (!times || !pressures || times.length !== pressures.length || times.length < 2) {
        console.error("Insufficient or invalid data for event detection in pressureEventManager.");
        if(showNotificationCallback) showNotificationCallback("Error: Cannot detect events due to invalid pressure data.", "error");
        return allAutomatedEvents;
    }
    if (times.length < (Config.MIN_DURATION_HOURS + 1)) { // Need enough points for min duration
        if(showNotificationCallback) showNotificationCallback(`Not enough data points for a ${Config.MIN_DURATION_HOURS}hr event.`, "info");
        return allAutomatedEvents;
    }

    let ongoingEventType = null; // 'rise' or 'fall'
    let eventStartTime = times[0];
    let eventStartPressure = pressures[0];

    for (let i = 1; i < times.length; i++) {
        const pressureDiff = pressures[i] - pressures[i-1];
        let currentTrend = null;
        if (pressureDiff > 0) currentTrend = 'rise';
        else if (pressureDiff < 0) currentTrend = 'fall';

        if (currentTrend !== ongoingEventType && ongoingEventType !== null) {
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
                    type: ongoingEventType,
                    isMerged: false,
                    originalEventsData: null
                };
                calculateRateAndSeverity(newEvent);
                allAutomatedEvents.push(newEvent);
            }
            // Start new event segment regardless of significance of old one
            eventStartTime = times[i-1]; // New event starts where old one ended
            eventStartPressure = pressures[i-1];
            ongoingEventType = currentTrend;
        } else if (ongoingEventType === null && currentTrend !== null) {
            // Start of the very first trend
            ongoingEventType = currentTrend;
            eventStartTime = times[i-1]; // Trend starts from previous point
            eventStartPressure = pressures[i-1];
        }
    }

    // Finalize any ongoing event at the end of the data
    if (ongoingEventType !== null) {
        const eventEndTime = times[times.length - 1];
        const eventEndPressure = pressures[times.length - 1];
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
                isMerged: false,
                originalEventsData: null
            };
            calculateRateAndSeverity(newEvent);
            allAutomatedEvents.push(newEvent);
        }
    }

    allAutomatedEvents.sort((a, b) => a.startTime - b.startTime);
    
    if (showNotificationCallback) {
        if (allAutomatedEvents.length > 0) {
            showNotificationCallback(`${allAutomatedEvents.length} automated pressure events detected.`, "info", 2000);
        } else {
            showNotificationCallback("No significant automated pressure events detected.", "info", 2000);
        }
    }
    return [...allAutomatedEvents]; // Return a copy
}

/** @returns {Array<Object>} A copy of all current automated events. */
export function getAllAutomatedEvents() {
    return [...allAutomatedEvents];
}

/**
 * Handles merging of selected automated events.
 * @param {Array<string>} selectedEventIds - IDs of events to merge.
 * @param {Function} showNotificationCallback - For displaying messages.
 * @returns {{success: boolean, newMergedEventId: string|null, originalEvents: Array<Object>|null, highlightNeedsClear: boolean}} Result object.
 */
export function handleMergeAutomatedEvents(selectedEventIds, showNotificationCallback) {
    if (selectedEventIds.length < 2) {
        if(showNotificationCallback) showNotificationCallback("Please select at least two automated events to merge.", "error");
        return { success: false, newMergedEventId: null, originalEvents: null, highlightNeedsClear: false };
    }

    const eventsToMergeDetails = allAutomatedEvents
        .filter(event => selectedEventIds.includes(event.id))
        .sort((a, b) => a.startTime - b.startTime);

    if (eventsToMergeDetails.length !== selectedEventIds.length) {
        if(showNotificationCallback) showNotificationCallback("Error: Some selected events for merging were not found.", "error");
        return { success: false, newMergedEventId: null, originalEvents: null, highlightNeedsClear: false };
    }
    if (eventsToMergeDetails.some(e => e.isMerged)) {
        if(showNotificationCallback) showNotificationCallback("Cannot merge: one or more selected events are already merged. Please unmerge them first.", "error");
        return { success: false, newMergedEventId: null, originalEvents: null, highlightNeedsClear: false };
    }

    const mergedStartTime = eventsToMergeDetails[0].startTime;
    const mergedEndTime = eventsToMergeDetails[eventsToMergeDetails.length - 1].endTime;
    
    // Find start and end pressures from cached hourly data
    const startIdx = hourlyTimesCache.indexOf(mergedStartTime);
    const endIdx = hourlyTimesCache.indexOf(mergedEndTime);
    let mergedStartP = eventsToMergeDetails[0].startPressure; // Fallback
    let mergedEndP = eventsToMergeDetails[eventsToMergeDetails.length-1].endPressure; // Fallback
    let mergedPChange = null;

    if (startIdx !== -1) mergedStartP = hourlyPressuresCache[startIdx];
    if (endIdx !== -1) mergedEndP = hourlyPressuresCache[endIdx];
    
    if (startIdx !== -1 && endIdx !== -1) {
        mergedPChange = parseFloat((mergedEndP - mergedStartP).toFixed(1));
    } else {
        console.warn("Could not find exact start/end pressures for merged event in hourly data. Pressure change will be sum of parts.");
        mergedPChange = eventsToMergeDetails.reduce((sum, event) => sum + event.pressureChange, 0);
    }


    const mergedDurSecs = mergedEndTime - mergedStartTime;
    const mergedDurHrs = parseFloat((mergedDurSecs / 3600).toFixed(1));
    const mergedType = mergedPChange > 0 ? 'rise' : (mergedPChange < 0 ? 'fall' : 'mixed');
    
    const originalEventsData = eventsToMergeDetails.map(e => JSON.parse(JSON.stringify(e))); // Deep copy

    const mergedEvent = {
        id: Date.now().toString() + '-merged-' + Math.random().toString(36).substr(2, 5),
        startTime: mergedStartTime,
        endTime: mergedEndTime,
        startPressure: mergedStartP,
        endPressure: mergedEndP,
        durationHours: mergedDurHrs,
        pressureChange: mergedPChange,
        type: mergedType,
        isMerged: true,
        originalEventsData: originalEventsData 
    };
    calculateRateAndSeverity(mergedEvent);

    // Update event list
    allAutomatedEvents = allAutomatedEvents.filter(event => !selectedEventIds.includes(event.id));
    allAutomatedEvents.push(mergedEvent);
    allAutomatedEvents.sort((a, b) => a.startTime - b.startTime);
    
    if(showNotificationCallback) showNotificationCallback("Automated events merged successfully!", "success");
    return { success: true, newMergedEventId: mergedEvent.id, originalEvents: originalEventsData, highlightNeedsClear: true };
}


/**
 * Handles unmerging a previously merged event.
 * @param {string} eventIdToUnmerge - The ID of the merged event.
 * @param {Function} showNotificationCallback - For displaying messages.
 * @returns {{success: boolean, unmergedEventIds: Array<string>|null, highlightNeedsClear: boolean}} Result object
 */
export function handleUnmergeAutomatedEvent(eventIdToUnmerge, showNotificationCallback) {
    const eventToUnmerge = allAutomatedEvents.find(event => event.id === eventIdToUnmerge);

    if (!eventToUnmerge) {
        if(showNotificationCallback) showNotificationCallback("Error: Event to unmerge not found.", "error");
        return { success: false, unmergedEventIds: null, highlightNeedsClear: false };
    }
    if (!eventToUnmerge.isMerged || !eventToUnmerge.originalEventsData) {
        if(showNotificationCallback) showNotificationCallback("Selected event is not a merged event or has no original data to restore.", "error");
        return { success: false, unmergedEventIds: null, highlightNeedsClear: false };
    }

    // Remove the merged event
    allAutomatedEvents = allAutomatedEvents.filter(event => event.id !== eventIdToUnmerge);

    const unmergedEventIds = [];
    // Add back the original events (deep copies)
    eventToUnmerge.originalEventsData.forEach(originalEvent => {
        // Ensure original events are not marked as merged and don't contain originalEventsData themselves
        const restoredEvent = JSON.parse(JSON.stringify(originalEvent));
        restoredEvent.isMerged = false;
        restoredEvent.originalEventsData = null;
        allAutomatedEvents.push(restoredEvent);
        unmergedEventIds.push(restoredEvent.id);
    });
    allAutomatedEvents.sort((a, b) => a.startTime - b.startTime);

    if(showNotificationCallback) showNotificationCallback("Event unmerged successfully!", "success");
    return { success: true, unmergedEventIds: unmergedEventIds, highlightNeedsClear: true };
}
// filename: js/pressureEventManager.js