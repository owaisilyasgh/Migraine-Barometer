// filename: js/pressureEventManager.js
import * as G_CONFIG from './config.js';
// import * as db from './db.js'; // Not directly used for saving events in this version

// Module-level state for pressure events
let allProcessedEvents = []; // Stores combined pressure events and calm periods
let hourlyTimesCache = [];
let hourlyPressuresCache = [];

/**
 * Updates the local cache of pressure data.
 * @param {Array<number>} times - Array of Unix timestamps (seconds).
 * @param {Array<number>} pressures - Array of pressure values.
 */
export function updatePressureDataCache(times, pressures) {
    hourlyTimesCache = times || [];
    hourlyPressuresCache = pressures || [];
    if (G_CONFIG.DEBUG_MODE) console.log("PressureEventManager: Pressure data cache updated.", { timesCount: hourlyTimesCache.length, pressuresCount: hourlyPressuresCache.length });
}

function getSeverityScore(absoluteRateOfChange) {
    if (absoluteRateOfChange >= (G_CONFIG.MIN_PRESSURE_CHANGE_HPA * 1.5 / G_CONFIG.MIN_DURATION_HOURS) && absoluteRateOfChange >= 0.8) return 'High';
    if (absoluteRateOfChange >= (G_CONFIG.MIN_PRESSURE_CHANGE_HPA / G_CONFIG.MIN_DURATION_HOURS) && absoluteRateOfChange >= 0.4) return 'Medium';
    if (Math.abs(absoluteRateOfChange) > 0) return 'Low'; // Any change that meets other criteria but not medium/high
    return 'Minimal'; // For very small changes if they are somehow passed here
}

function calculateRateAndSeverity(event) {
    if (event.durationHours > 0) {
        event.rateOfChange = parseFloat((event.pressureChange / event.durationHours).toFixed(2));
        const absoluteRate = Math.abs(event.rateOfChange);
        event.severity = getSeverityScore(absoluteRate);
    } else {
        event.rateOfChange = 0;
        event.severity = 'Low'; // Or 'N/A'
    }
}

/**
 * Detects significant pressure events and interleaves calm periods.
 * @param {Array<number>} times - Array of Unix timestamps (seconds).
 * @param {Array<number>} pressures - Array of pressure values.
 * @param {Function} showNotificationCallback - Function to show notifications.
 * @returns {Array<Object>} Array of detected event objects (pressure changes and calm periods).
 */
export function detectAndInterleaveEvents(times, pressures, showNotificationCallback) {
    allProcessedEvents = [];
    if (!times || !pressures || times.length !== pressures.length || times.length < 2) {
        if (G_CONFIG.DEBUG_MODE) console.error("PressureEventManager: Insufficient or invalid data for event detection.");
        if (showNotificationCallback) showNotificationCallback("Error: Cannot detect events due to invalid pressure data.", "error");
        return [];
    }

    updatePressureDataCache(times, pressures);

    if (times.length < (G_CONFIG.MIN_DURATION_HOURS + 1)) {
        if (G_CONFIG.DEBUG_MODE) console.log(`PressureEventManager: Not enough data points for a ${G_CONFIG.MIN_DURATION_HOURS}hr event. Will mark as calm if applicable.`);
        // If not enough data for an event, the whole period is considered calm
        allProcessedEvents.push({
            id: 'calm-insufficient-data-' + times[0],
            type: 'calm',
            startTime: times[0],
            endTime: times[times.length - 1],
            durationHours: parseFloat(((times[times.length - 1] - times[0]) / 3600).toFixed(1)),
            isPressureEvent: false
        });
        return [...allProcessedEvents];
    }

    let lastEventEndTime = times[0]; // Track end of last pressure event to define start of calm period

    // Detect pressure events
    let ongoingEventType = null;
    let eventStartIndex = 0;
    let eventStartPressure = pressures[0];

    for (let i = 1; i < times.length; i++) {
        const currentPressure = pressures[i];
        const lastPressure = pressures[i-1];
        const currentTrend = currentPressure > lastPressure ? 'rise' : (currentPressure < lastPressure ? 'fall' : ongoingEventType);

        if (ongoingEventType === null && currentTrend !== null) {
            ongoingEventType = currentTrend;
            eventStartIndex = i - 1;
            eventStartPressure = pressures[i-1];
        } else if (currentTrend !== ongoingEventType && ongoingEventType !== null) {
            // Trend changed, finalize previous event if significant
            const eventEndIndex = i - 1;
            const eventStartTime = times[eventStartIndex];
            const eventEndTime = times[eventEndIndex];
            const eventEndPressure = pressures[eventEndIndex];
            const durationHrs = (eventEndTime - eventStartTime) / 3600;
            const pChange = parseFloat((eventEndPressure - eventStartPressure).toFixed(1));

            if (durationHrs >= G_CONFIG.MIN_DURATION_HOURS && Math.abs(pChange) >= G_CONFIG.MIN_PRESSURE_CHANGE_HPA) {
                // Add calm period before this significant event
                if (eventStartTime > lastEventEndTime) {
                    allProcessedEvents.push({
                        id: 'calm-' + lastEventEndTime + '-' + eventStartTime,
                        type: 'calm',
                        startTime: lastEventEndTime,
                        endTime: eventStartTime,
                        durationHours: parseFloat(((eventStartTime - lastEventEndTime) / 3600).toFixed(1)),
                        isPressureEvent: false
                    });
                }

                const newEvent = {
                    id: eventStartTime.toString() + '-' + ongoingEventType + '-' + Math.random().toString(36).substr(2, 5),
                    type: ongoingEventType,
                    startTime: eventStartTime,
                    endTime: eventEndTime,
                    startPressure: eventStartPressure,
                    endPressure: eventEndPressure,
                    pressureChange: pChange,
                    durationHours: parseFloat(durationHrs.toFixed(1)),
                    isPressureEvent: true
                };
                calculateRateAndSeverity(newEvent);
                allProcessedEvents.push(newEvent);
                lastEventEndTime = eventEndTime;
            }
            // Start new potential event segment
            ongoingEventType = currentTrend;
            eventStartIndex = i - 1;
            eventStartPressure = pressures[i-1];
        }
    }

    // Finalize any ongoing event at the end of the data
    if (ongoingEventType !== null) {
        const eventStartTime = times[eventStartIndex];
        const eventEndTime = times[times.length - 1];
        const eventEndPressure = pressures[pressures.length - 1];
        const durationHrs = (eventEndTime - eventStartTime) / 3600;
        const pChange = parseFloat((eventEndPressure - eventStartPressure).toFixed(1));

        if (durationHrs >= G_CONFIG.MIN_DURATION_HOURS && Math.abs(pChange) >= G_CONFIG.MIN_PRESSURE_CHANGE_HPA) {
            if (eventStartTime > lastEventEndTime) {
                allProcessedEvents.push({
                    id: 'calm-' + lastEventEndTime + '-' + eventStartTime,
                    type: 'calm',
                    startTime: lastEventEndTime,
                    endTime: eventStartTime,
                    durationHours: parseFloat(((eventStartTime - lastEventEndTime) / 3600).toFixed(1)),
                    isPressureEvent: false
                });
            }
            const newEvent = {
                id: eventStartTime.toString() + '-' + ongoingEventType + '-final-' + Math.random().toString(36).substr(2, 5),
                type: ongoingEventType,
                startTime: eventStartTime,
                endTime: eventEndTime,
                startPressure: eventStartPressure,
                endPressure: eventEndPressure,
                pressureChange: pChange,
                durationHours: parseFloat(durationHrs.toFixed(1)),
                isPressureEvent: true
            };
            calculateRateAndSeverity(newEvent);
            allProcessedEvents.push(newEvent);
            lastEventEndTime = eventEndTime;
        }
    }

    // Add final calm period if space between last event and end of data
    if (times[times.length - 1] > lastEventEndTime) {
        allProcessedEvents.push({
            id: 'calm-' + lastEventEndTime + '-end',
            type: 'calm',
            startTime: lastEventEndTime,
            endTime: times[times.length - 1],
            durationHours: parseFloat(((times[times.length - 1] - lastEventEndTime) / 3600).toFixed(1)),
            isPressureEvent: false
        });
    }
    
    // If allProcessedEvents is empty, it means no significant pressure events were found, so the whole period is calm.
    if (allProcessedEvents.length === 0 && times.length > 0) {
        allProcessedEvents.push({
            id: 'calm-entire-period-' + times[0],
            type: 'calm',
            startTime: times[0],
            endTime: times[times.length - 1],
            durationHours: parseFloat(((times[times.length - 1] - times[0]) / 3600).toFixed(1)),
            isPressureEvent: false
        });
    }


    allProcessedEvents.sort((a, b) => a.startTime - b.startTime);

    const pressureEventCount = allProcessedEvents.filter(e => e.isPressureEvent).length;
    if (pressureEventCount > 0) {
        if (showNotificationCallback) showNotificationCallback(`${pressureEventCount} significant pressure events detected.`, "info", 2500);
    } else {
        if (showNotificationCallback) showNotificationCallback("No significant pressure changes detected. Conditions stable.", "info", 2500);
    }
    if (G_CONFIG.DEBUG_MODE) console.log("PressureEventManager: All processed events (pressure & calm):", allProcessedEvents);
    return [...allProcessedEvents]; // Return a copy
}

/** @returns {Array<Object>} A copy of all current processed events (pressure and calm). */
export function getAllProcessedEvents() {
    return [...allProcessedEvents];
}
// filename: js/pressureEventManager.js