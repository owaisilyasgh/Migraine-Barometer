// js/pressureEventManager.js
import * as G_CONFIG from './config.js';
// Note: `utils.js` for formatting or other utilities can be imported if needed.
// import { formatUnixTimestamp } from './utils.js';

// Module-level cache for pressure data (times in seconds, pressures in hPa)
let hourlyTimesCache = [];
let hourlyPressuresCache = [];
let allProcessedEventsInternal = []; // Stores combined pressure events and calm periods

/**
 * Updates the local cache of pressure data used for event detection.
 * @param {Array<number>} times - Array of Unix timestamps (seconds).
 * @param {Array<number>} pressures - Array of pressure values.
 */
export function updatePressureDataCache(times, pressures) {
    hourlyTimesCache = [...times];
    hourlyPressuresCache = [...pressures];
    if (G_CONFIG.DEBUG_MODE) console.log("PressureEventManager: Pressure data cache updated.", { timesCount: hourlyTimesCache.length, pressuresCount: hourlyPressuresCache.length });
}

function getSeverityScore(absoluteRateOfChange) {
    if (absoluteRateOfChange >= G_CONFIG.SEVERITY_THRESHOLDS.HIGH) return 'High';
    if (absoluteRateOfChange >= G_CONFIG.SEVERITY_THRESHOLDS.MEDIUM) return 'Medium';
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
        event.severity = 'Low'; // Or 'N/A', 'Minimal'
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
    allProcessedEventsInternal = []; // Reset for new detection run
    if (!times || !pressures || times.length < 2 || times.length !== pressures.length) {
        if (G_CONFIG.DEBUG_MODE) console.error("PressureEventManager: Insufficient or invalid data for event detection.");
        if (showNotificationCallback) showNotificationCallback("Error: Cannot detect events due to invalid pressure data.", "error");
        return [];
    }

    updatePressureDataCache(times, pressures); // Update internal cache

    // If not enough data points for the minimum event duration, consider the whole period calm.
    if (times.length < G_CONFIG.MIN_DURATION_HOURS +1) { // +1 because duration is between points
        if (G_CONFIG.DEBUG_MODE) console.log(`PressureEventManager: Not enough data points for a ${G_CONFIG.MIN_DURATION_HOURS}hr event. Period marked as calm.`);
        allProcessedEventsInternal.push({
            id: times[0].toString() + '-calm-fullduration-' + Math.random().toString(36).substr(2, 5),
            isPressureEvent: false,
            type: 'Calm Period',
            startTime: times[0],
            endTime: times[times.length - 1],
            startPressure: pressures[0],
            endPressure: pressures[times.length -1],
            pressureChange: parseFloat((pressures[times.length - 1] - pressures[0]).toFixed(1)),
            durationHours: parseFloat(((times[times.length - 1] - times[0]) / 3600).toFixed(1)),
            severity: 'N/A',
            rateOfChange: 0
        });
        if (showNotificationCallback) showNotificationCallback("Conditions appear stable (short data span).", "info", 2500);
        return [...allProcessedEventsInternal];
    }

    let ongoingEventType = null; // 'rise', 'fall'
    let eventStartTime = times[0];
    let eventStartPressure = pressures[0];
    let lastEventEndTime = times[0]; // Track end of last pressure event to define start of calm period

    // Detect pressure events
    for (let i = 1; i < times.length; i++) {
        const currentPressureChange = pressures[i] - pressures[i-1];
        let currentTrend = null;
        if (currentPressureChange > 0) currentTrend = 'rise';
        else if (currentPressureChange < 0) currentTrend = 'fall';

        if (ongoingEventType && currentTrend !== ongoingEventType && currentTrend !== null) { // Trend changed (and not to stable)
            const eventEndTime = times[i-1];
            const eventEndPressure = pressures[i-1];
            const durationHrs = (eventEndTime - eventStartTime) / 3600;
            const pChange = parseFloat((eventEndPressure - eventStartPressure).toFixed(1));

            if (durationHrs >= G_CONFIG.MIN_DURATION_HOURS && Math.abs(pChange) >= G_CONFIG.MIN_PRESSURE_CHANGE_HPA) {
                // Add calm period before this significant event
                if (eventStartTime > lastEventEndTime) {
                    allProcessedEventsInternal.push({
                        id: lastEventEndTime.toString() + '-calm-' + Math.random().toString(36).substr(2, 5),
                        isPressureEvent: false, type: 'Calm Period',
                        startTime: lastEventEndTime, endTime: eventStartTime,
                        startPressure: pressures[times.indexOf(lastEventEndTime)],
                        endPressure: eventStartPressure,
                        pressureChange: parseFloat((eventStartPressure - pressures[times.indexOf(lastEventEndTime)]).toFixed(1)),
                        durationHours: parseFloat(((eventStartTime - lastEventEndTime) / 3600).toFixed(1)),
                        severity: 'N/A', rateOfChange: 0
                    });
                }
                const newEvent = {
                    id: eventStartTime.toString() + '-' + ongoingEventType + '-' + Math.random().toString(36).substr(2, 5),
                    isPressureEvent: true, type: ongoingEventType,
                    startTime: eventStartTime, endTime: eventEndTime,
                    startPressure: eventStartPressure, endPressure: eventEndPressure,
                    pressureChange: pChange,
                    durationHours: parseFloat(durationHrs.toFixed(1))
                };
                calculateRateAndSeverity(newEvent);
                allProcessedEventsInternal.push(newEvent);
                lastEventEndTime = eventEndTime;
            }
            // Start new potential event segment
            eventStartTime = times[i-1];
            eventStartPressure = pressures[i-1];
        }
        if (currentTrend) ongoingEventType = currentTrend; // Assign new trend if not null
        if (!ongoingEventType && currentTrend) { // Start of a new trend after a flat period
             eventStartTime = times[i-1];
             eventStartPressure = pressures[i-1];
        }
    }

    // Finalize any ongoing event at the end of the data
    if (ongoingEventType) {
        const eventEndTime = times[times.length - 1];
        const eventEndPressure = pressures[pressures.length - 1];
        const durationHrs = (eventEndTime - eventStartTime) / 3600;
        const pChange = parseFloat((eventEndPressure - eventStartPressure).toFixed(1));

        if (durationHrs >= G_CONFIG.MIN_DURATION_HOURS && Math.abs(pChange) >= G_CONFIG.MIN_PRESSURE_CHANGE_HPA) {
            if (eventStartTime > lastEventEndTime) {
                 allProcessedEventsInternal.push({
                    id: lastEventEndTime.toString() + '-calm-final-' + Math.random().toString(36).substr(2, 5),
                    isPressureEvent: false, type: 'Calm Period',
                    startTime: lastEventEndTime, endTime: eventStartTime,
                    startPressure: pressures[times.indexOf(lastEventEndTime)],
                    endPressure: eventStartPressure,
                    pressureChange: parseFloat((eventStartPressure - pressures[times.indexOf(lastEventEndTime)]).toFixed(1)),
                    durationHours: parseFloat(((eventStartTime - lastEventEndTime) / 3600).toFixed(1)),
                    severity: 'N/A', rateOfChange: 0
                });
            }
            const newEvent = {
                id: eventStartTime.toString() + '-' + ongoingEventType + '-final-' + Math.random().toString(36).substr(2, 5),
                isPressureEvent: true, type: ongoingEventType,
                startTime: eventStartTime, endTime: eventEndTime,
                startPressure: eventStartPressure, endPressure: eventEndPressure,
                pressureChange: pChange,
                durationHours: parseFloat(durationHrs.toFixed(1)),
            };
            calculateRateAndSeverity(newEvent);
            allProcessedEventsInternal.push(newEvent);
            lastEventEndTime = eventEndTime;
        }
    }
    
    // Add final calm period if space between last event and end of data
    if (times[times.length - 1] > lastEventEndTime) {
        allProcessedEventsInternal.push({
            id: lastEventEndTime.toString() + '-calm-beforeend-' + Math.random().toString(36).substr(2, 5),
            isPressureEvent: false, type: 'Calm Period',
            startTime: lastEventEndTime, endTime: times[times.length - 1],
            startPressure: pressures[times.indexOf(lastEventEndTime)],
            endPressure: pressures[times.length - 1],
            pressureChange: parseFloat((pressures[times.length - 1] - pressures[times.indexOf(lastEventEndTime)]).toFixed(1)),
            durationHours: parseFloat(((times[times.length - 1] - lastEventEndTime) / 3600).toFixed(1)),
            severity: 'N/A', rateOfChange: 0
        });
    }

    // If allProcessedEvents is empty, it means no significant pressure events were found, so the whole period is calm.
    if (allProcessedEventsInternal.length === 0 && times.length > 1) {
         allProcessedEventsInternal.push({
            id: times[0].toString() + '-calm-nosig-' + Math.random().toString(36).substr(2, 5),
            isPressureEvent: false, type: 'Calm Period',
            startTime: times[0], endTime: times[times.length - 1],
            startPressure: pressures[0], endPressure: pressures[times.length -1],
            pressureChange: parseFloat((pressures[times.length - 1] - pressures[0]).toFixed(1)),
            durationHours: parseFloat(((times[times.length - 1] - times[0]) / 3600).toFixed(1)),
            severity: 'N/A', rateOfChange: 0
        });
    }
    
    allProcessedEventsInternal.sort((a, b) => a.startTime - b.startTime);
    
    const pressureEventCount = allProcessedEventsInternal.filter(e => e.isPressureEvent).length;
    if (showNotificationCallback) {
        if (pressureEventCount > 0) {
            showNotificationCallback(`${pressureEventCount} significant pressure events detected.`, "info", 2500);
        } else {
            showNotificationCallback("No significant pressure changes detected. Conditions stable.", "info", 2500);
        }
    }

    if (G_CONFIG.DEBUG_MODE) console.log("PressureEventManager: All processed events (pressure & calm):", allProcessedEventsInternal);
    return [...allProcessedEventsInternal]; // Return a copy
}

/** @returns {Array<Object>} A copy of all current processed events (pressure and calm). */
export function getAllProcessedEvents() {
    return [...allProcessedEventsInternal];
}
// filename: js/pressureEventManager.js