// js/pressureEventManager.js
import { MIN_DURATION_HOURS, MIN_PRESSURE_CHANGE_HPA } from './config.js';
import { showNotification } from './utils.js';
import { updateChartPlotBand } from './chartManager.js';
// We'll need a way to re-render the table, so uiRenderer will be imported by app.js
// and app.js will pass a reference or make it callable.

let allAutomatedEvents = [];
let hourlyTimesCache = []; // Cache hourlyTimes for pressure calculation if needed
let hourlyPressuresCache = []; // Cache hourlyPressures

/**
 * Detects and stores automated pressure events.
 * @param {number[]} times - Array of Unix timestamps.
 * @param {number[]} pressures - Array of pressure values.
 * @returns {object[]} The array of detected events.
 */
export function detectAndStoreAutomatedPressureEvents(times, pressures) {
    allAutomatedEvents = []; // Reset
    hourlyTimesCache = [...times]; // Store for merge/unmerge pressure lookups
    hourlyPressuresCache = [...pressures];

    if (!times || !pressures || times.length < 2 || pressures.length < 2 || times.length !== pressures.length) {
        console.error("Insufficient or invalid data for event detection in pressureEventManager.");
        return [];
    }

    const n = times.length;
    let eventSegmentStartIdx = 0;

    for (let i = 1; i < n; i++) {
        const pressureAtEventSegmentStart = pressures[eventSegmentStartIdx];
        const pressureAtPotentialEventEnd = pressures[i - 1];
        const pressureAtCurrentPoint = pressures[i];
        const trendOfEventSegment = Math.sign(pressureAtPotentialEventEnd - pressureAtEventSegmentStart);
        const changeAfterPotentialEventEnd = Math.sign(pressureAtCurrentPoint - pressureAtPotentialEventEnd);

        if (trendOfEventSegment !== 0 && changeAfterPotentialEventEnd !== 0 && trendOfEventSegment !== changeAfterPotentialEventEnd) {
            const startTime = times[eventSegmentStartIdx];
            const endTime = times[i - 1];
            const endP = pressures[i - 1];
            const durationHrs = (endTime - startTime) / 3600;
            const pChange = parseFloat((endP - pressureAtEventSegmentStart).toFixed(1));
            let eventType = (trendOfEventSegment === 1) ? "Rise" : "Fall";

            if (durationHrs >= MIN_DURATION_HOURS && Math.abs(pChange) >= MIN_PRESSURE_CHANGE_HPA) {
                allAutomatedEvents.push({
                    id: 'auto-' + startTime + '-' + endTime,
                    startTime: startTime, endTime: endTime,
                    durationHours: parseFloat(durationHrs.toFixed(1)),
                    pressureChange: pChange, type: eventType,
                    isMerged: false, originalEventsData: null
                });
            }
            eventSegmentStartIdx = i - 1;
        } else if (trendOfEventSegment === 0 && changeAfterPotentialEventEnd !== 0) {
            eventSegmentStartIdx = i - 1;
        }
    }

    if (eventSegmentStartIdx < n - 1) {
        const startTime = times[eventSegmentStartIdx];
        const endTime = times[n - 1];
        const endP = pressures[n - 1];
        const durationHrs = (endTime - startTime) / 3600;
        const pChange = parseFloat((endP - pressures[eventSegmentStartIdx]).toFixed(1));
        let ongoingEventType = "";
        if (pChange > 0) ongoingEventType = "Ongoing Rise";
        else if (pChange < 0) ongoingEventType = "Ongoing Fall";

        if (ongoingEventType && Math.abs(pChange) >= MIN_PRESSURE_CHANGE_HPA) {
            allAutomatedEvents.push({
                id: 'auto-' + startTime + '-' + endTime,
                startTime: startTime, endTime: endTime,
                durationHours: parseFloat(durationHrs.toFixed(1)),
                pressureChange: pChange, type: ongoingEventType,
                isMerged: false, originalEventsData: null
            });
        }
    }
    allAutomatedEvents.sort((a, b) => a.startTime - b.startTime);
    return allAutomatedEvents;
}

export function getAllAutomatedEvents() {
    return [...allAutomatedEvents]; // Return a copy
}

export function handleMergeAutomatedEvents(getCurrentlyHighlightedEventId, rerenderTableCallback) {
    const selectedCheckboxes = Array.from(document.querySelectorAll(`#${'pressureEventsTable'} tbody input[type="checkbox"]:checked`)); // Using ID from config
    const eventIdsToMerge = selectedCheckboxes.map(cb => cb.dataset.eventId);

    const eventsToMerge = allAutomatedEvents.filter(event => eventIdsToMerge.includes(event.id));
    if (eventsToMerge.some(e => e.isMerged) || eventsToMerge.length !== 2) {
        showNotification("Cannot merge: select two original (non-merged) events.", "error");
        return false;
    }
    const currentlyHighlightedId = getCurrentlyHighlightedEventId();
    if (eventIdsToMerge.includes(currentlyHighlightedId)) {
        updateChartPlotBand(null);
        // currentHighlightState will be reset in app.js
    }

    const event1 = eventsToMerge[0];
    const event2 = eventsToMerge[1];
    const mergedStartTime = Math.min(event1.startTime, event2.startTime);
    const mergedEndTime = Math.max(event1.endTime, event2.endTime);

    const startIdx = hourlyTimesCache.indexOf(mergedStartTime);
    const endIdx = hourlyTimesCache.indexOf(mergedEndTime);
    let mergedPChange = null;

    if (startIdx !== -1 && endIdx !== -1 && startIdx < hourlyPressuresCache.length && endIdx < hourlyPressuresCache.length) {
        const mergedStartP = hourlyPressuresCache[startIdx];
        const mergedEndP = hourlyPressuresCache[endIdx];
        if (mergedStartP !== null && mergedEndP !== null) {
             mergedPChange = parseFloat((mergedEndP - mergedStartP).toFixed(1));
        }
    } else {
        console.warn("Could not find exact start/end pressures for merged event in hourly data. Pressure change might be N/A.");
    }

    const mergedDurSecs = mergedEndTime - mergedStartTime;
    const mergedDurHrs = parseFloat((mergedDurSecs / 3600).toFixed(1));
    const newMergedId = 'merged-' + mergedStartTime + '-' + mergedEndTime;

    const mergedEvent = {
        id: newMergedId, startTime: mergedStartTime, endTime: mergedEndTime,
        durationHours: mergedDurHrs, pressureChange: mergedPChange,
        type: "Merged", isMerged: true,
        originalEventsData: [JSON.parse(JSON.stringify(event1)), JSON.parse(JSON.stringify(event2))]
    };

    allAutomatedEvents = allAutomatedEvents.filter(event => !eventIdsToMerge.includes(event.id));
    allAutomatedEvents.push(mergedEvent);
    allAutomatedEvents.sort((a,b) => a.startTime - b.startTime);

    rerenderTableCallback();
    showNotification("Automated events merged successfully!", "success");
    return true; // Indicates highlight might need to be cleared
}

export function handleUnmergeAutomatedEvent(getCurrentlyHighlightedEventId, rerenderTableCallback) {
    const selectedCheckboxes = Array.from(document.querySelectorAll(`#${'pressureEventsTable'} tbody input[type="checkbox"]:checked`));
     if (selectedCheckboxes.length !== 1) {
        showNotification("Please select exactly one merged event to unmerge.", "error");
        return false;
    }
    const eventIdToUnmerge = selectedCheckboxes[0].dataset.eventId;
    const eventToUnmerge = allAutomatedEvents.find(event => event.id === eventIdToUnmerge);

    if (!eventToUnmerge || !eventToUnmerge.isMerged || !eventToUnmerge.originalEventsData) {
        showNotification("Selected event is not a merged event or has no original data.", "error");
        return false;
    }
    const currentlyHighlightedId = getCurrentlyHighlightedEventId();
    if (eventIdToUnmerge === currentlyHighlightedId) {
        updateChartPlotBand(null);
         // currentHighlightState will be reset in app.js
    }

    allAutomatedEvents = allAutomatedEvents.filter(event => event.id !== eventIdToUnmerge);
    eventToUnmerge.originalEventsData.forEach(originalEvent => {
        allAutomatedEvents.push(originalEvent);
    });
    allAutomatedEvents.sort((a,b) => a.startTime - b.startTime);

    rerenderTableCallback();
    showNotification("Event unmerged successfully!", "success");
    return true; // Indicates highlight might need to be cleared
}