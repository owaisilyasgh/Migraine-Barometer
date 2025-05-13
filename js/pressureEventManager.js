// js/pressureEventManager.js
import { MIN_PRESSURE_CHANGE_HPA, MIN_DURATION_HOURS, EVENTS_TABLE_BODY_ID } from './config.js';
// Note: showNotification and updateChartPlotBand will be passed in from app.js

let allAutomatedEvents = [];
let hourlyTimesCache = [];
let hourlyPressuresCache = [];

/**
 * Assigns a severity score based on the absolute rate of pressure change.
 * @param {number} absoluteRateOfChange - The absolute rate of pressure change in hPa/hour.
 * @returns {string} The severity score ('Low', 'Medium', 'High').
 */
function getSeverityScore(absoluteRateOfChange) {
    if (absoluteRateOfChange >= 1.0) {
        return 'High';
    } else if (absoluteRateOfChange >= 0.5) {
        return 'Medium';
    } else {
        return 'Low';
    }
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
        event.rateOfChange = 'N/A';
        event.severity = 'N/A';
    }
}


export function detectAndStoreAutomatedPressureEvents(times, pressures, showNotification, updateChartPlotBand) {
    allAutomatedEvents = []; // Reset
    hourlyTimesCache = [...times];
    hourlyPressuresCache = [...pressures];

    if (!times || !pressures || times.length < 2 || pressures.length < 2 || times.length !== pressures.length) {
        console.error("Insufficient or invalid data for event detection in pressureEventManager.");
        return allAutomatedEvents;
    }

    let ongoingEventType = null; // 'rise' or 'fall'
    let eventSegmentStartIdx = 0;

    for (let i = 1; i < times.length; i++) {
        const pressureDiff = pressures[i] - pressures[i - 1];
        let currentTrend = null;
        if (pressureDiff > 0) currentTrend = 'rise';
        else if (pressureDiff < 0) currentTrend = 'fall';

        if (ongoingEventType === null && currentTrend !== null) {
            ongoingEventType = currentTrend;
            eventSegmentStartIdx = i - 1;
        } else if (currentTrend !== null && ongoingEventType !== currentTrend) {
            // Trend changed, finalize previous event if significant
            const eventEndTime = times[i - 1];
            const eventDurationSecs = eventEndTime - times[eventSegmentStartIdx];
            const durationHrs = eventDurationSecs / 3600;
            const endP = pressures[i - 1];
            const pChange = parseFloat((endP - pressures[eventSegmentStartIdx]).toFixed(1));

            if (durationHrs >= MIN_DURATION_HOURS && Math.abs(pChange) >= MIN_PRESSURE_CHANGE_HPA) {
                const newEvent = {
                    id: `auto_${times[eventSegmentStartIdx]}_${eventEndTime}`,
                    startTime: times[eventSegmentStartIdx],
                    endTime: eventEndTime,
                    durationHours: parseFloat(durationHrs.toFixed(1)),
                    pressureChange: pChange,
                    type: ongoingEventType,
                    isMerged: false,
                    originalEventsData: null
                };
                calculateRateAndSeverity(newEvent); // Calculate and add rate/severity
                allAutomatedEvents.push(newEvent);
            }
            // Start new event segment
            ongoingEventType = currentTrend;
            eventSegmentStartIdx = i - 1;
        }
    }

    // Finalize any ongoing event at the end of the data
    if (ongoingEventType !== null) {
        const eventEndTime = times[times.length - 1];
        const eventDurationSecs = eventEndTime - times[eventSegmentStartIdx];
        const durationHrs = eventDurationSecs / 3600;
        const endP = pressures[pressures.length - 1];
        const pChange = parseFloat((endP - pressures[eventSegmentStartIdx]).toFixed(1));

        if (durationHrs >= MIN_DURATION_HOURS && Math.abs(pChange) >= MIN_PRESSURE_CHANGE_HPA) {
             const newEvent = {
                id: `auto_${times[eventSegmentStartIdx]}_${eventEndTime}`,
                startTime: times[eventSegmentStartIdx],
                endTime: eventEndTime,
                durationHours: parseFloat(durationHrs.toFixed(1)),
                pressureChange: pChange,
                type: ongoingEventType,
                isMerged: false,
                originalEventsData: null
            };
            calculateRateAndSeverity(newEvent); // Calculate and add rate/severity
            allAutomatedEvents.push(newEvent);
        }
    }
    allAutomatedEvents.sort((a, b) => a.startTime - b.startTime);
    return allAutomatedEvents;
}

export function getAllAutomatedEvents() {
    return [...allAutomatedEvents];
}

export function handleMergeAutomatedEvents(getCurrentlyHighlightedEventId, showNotification, updateChartPlotBand) {
    const tableElement = document.getElementById(EVENTS_TABLE_BODY_ID);
    if (!tableElement) return false;

    const selectedCheckboxes = Array.from(tableElement.querySelectorAll('tbody input[type="checkbox"]:checked'));
    const eventIdsToMerge = selectedCheckboxes.map(cb => cb.dataset.eventId);

    if (eventIdsToMerge.length !== 2) {
        showNotification("Please select exactly two automated events to merge.", "error");
        return false;
    }

    const eventsToMerge = allAutomatedEvents.filter(event => eventIdsToMerge.includes(event.id));
    if (eventsToMerge.some(e => e.isMerged)) {
        showNotification("Cannot merge: one or more selected events are already merged events.", "error");
        return false;
    }
     if (eventsToMerge.length !== 2) { // Should be caught by previous check, but good for safety
        showNotification("Error: Could not find two distinct events to merge.", "error");
        return false;
    }

    const [event1, event2] = eventsToMerge.sort((a, b) => a.startTime - b.startTime);

    // Clear highlight if one of the merged events was highlighted
    const currentlyHighlightedId = getCurrentlyHighlightedEventId();
    let highlightNeedsClear = false;
    if (eventIdsToMerge.includes(currentlyHighlightedId)) {
        updateChartPlotBand(null);
        highlightNeedsClear = true; // Signal to app.js to clear its state
    }

    const mergedStartTime = event1.startTime; // Since sorted
    const mergedEndTime = event2.endTime;     // Since sorted, event2 is later or same
    const mergedDurSecs = mergedEndTime - mergedStartTime;
    const mergedDurHrs = parseFloat((mergedDurSecs / 3600).toFixed(1));

    // Find pressure at start of event1 and end of event2 from cached data
    let mergedStartP = hourlyPressuresCache[hourlyTimesCache.indexOf(event1.startTime)];
    let mergedEndP = hourlyPressuresCache[hourlyTimesCache.indexOf(event2.endTime)];
    let mergedPChange = 'N/A';

    if (typeof mergedStartP === 'number' && typeof mergedEndP === 'number') {
        mergedPChange = parseFloat((mergedEndP - mergedStartP).toFixed(1));
    } else {
        console.warn("Could not find exact start/end pressures for merged event in hourly data. Pressure change might be N/A.");
    }

    const mergedEvent = {
        id: `merged_${event1.id}_${event2.id}`,
        startTime: mergedStartTime,
        endTime: mergedEndTime,
        durationHours: mergedDurHrs,
        pressureChange: mergedPChange,
        type: mergedPChange > 0 ? 'rise' : (mergedPChange < 0 ? 'fall' : 'stable'), // Determine type based on overall change
        isMerged: true,
        originalEventsData: [JSON.parse(JSON.stringify(event1)), JSON.parse(JSON.stringify(event2))]
    };
    calculateRateAndSeverity(mergedEvent); // Calculate rate/severity for the new merged event

    allAutomatedEvents = allAutomatedEvents.filter(event => !eventIdsToMerge.includes(event.id));
    allAutomatedEvents.push(mergedEvent);
    allAutomatedEvents.sort((a, b) => a.startTime - b.startTime);

    showNotification("Automated events merged successfully!", "success");
    return highlightNeedsClear;
}

export function handleUnmergeAutomatedEvent(getCurrentlyHighlightedEventId, showNotification, updateChartPlotBand) {
    const tableElement = document.getElementById(EVENTS_TABLE_BODY_ID);
    if (!tableElement) return false;

    const selectedCheckboxes = Array.from(tableElement.querySelectorAll('tbody input[type="checkbox"]:checked'));
    if (selectedCheckboxes.length !== 1) {
        showNotification("Please select exactly one merged event to unmerge.", "error");
        return false;
    }
    const eventIdToUnmerge = selectedCheckboxes[0].dataset.eventId;
    const eventToUnmerge = allAutomatedEvents.find(event => event.id === eventIdToUnmerge);

    if (!eventToUnmerge || !eventToUnmerge.isMerged || !eventToUnmerge.originalEventsData) {
        showNotification("Selected event is not a merged event or has no original data to restore.", "error");
        return false;
    }

    // Clear highlight if the unmerged event was highlighted
    let highlightNeedsClear = false;
    if (getCurrentlyHighlightedEventId() === eventIdToUnmerge) {
        updateChartPlotBand(null);
        highlightNeedsClear = true;
    }

    allAutomatedEvents = allAutomatedEvents.filter(event => event.id !== eventIdToUnmerge);
    eventToUnmerge.originalEventsData.forEach(originalEvent => {
        // Original events already have their rate/severity calculated
        allAutomatedEvents.push(originalEvent);
    });
    allAutomatedEvents.sort((a, b) => a.startTime - b.startTime);

    showNotification("Event unmerged successfully!", "success");
    return highlightNeedsClear;
}
// filename: js/pressureEventManager.js