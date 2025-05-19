// js/app.js
import * as G_CONFIG from './config.js';
import * as DataService from './dataService.js';
import * as PressureEventManager from './pressureEventManager.js';
import * as ChartManager from './chartManager.js';
import * as UIRenderer from './uiRenderer.js';
import * as db from './db.js';
import { createRipple, formatUnixTimestamp } from './utils.js';

// Global Application State
let currentPressureData = {
    times: [], // Original times in seconds
    values: [], // Pressure values
    sourceInfo: {} // {lat, lon, source, fetchTimestamp, lastDataPointTimestamp}
};
let currentAppStatus = {
    status: "loading", // e.g., "loading", "fresh", "stale_ui_only", "stale_api_cooldown", "error_geolocation", "error_api", "error_no_data"
    message: "Initializing..."
};
let allProcessedEvents = []; // Array of detected event objects (pressure changes and calm periods)
let eventMigraineLogs = {}; // { eventId: { severity: 'severe', loggedAt: timestamp }, ... }
let currentlyFocusedEventId = null; // ID of the event currently focused in the carousel
let isShowAllEventsOnChartActive = false; // State for the "Show all events on chart" toggle
let resizeTimeout;

// --- Service Worker ---
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                if (G_CONFIG.DEBUG_MODE) console.log('App: SW registered:', registration.scope);
                registration.addEventListener('updatefound', () => {
                    // A new service worker is installing.
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New content is available, prompt user to refresh.
                                // UIRenderer.showNotification("New version available! Refresh to update.", "info", 0); // 0 for persistent
                                if (G_CONFIG.DEBUG_MODE) console.log('App: New SW installed. Refresh needed.');
                            }
                        });
                    }
                });
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    // This event fires when the service worker controlling this page changes.
                    // Typically, this means a new service worker has activated.
                    if (G_CONFIG.DEBUG_MODE) console.log('App: New service worker activated.');
                    // At this point, it's safe to reload the page to use the new SW's cache.
                    // window.location.reload(); // Or prompt the user
                });
            })
            .catch(error => {
                if (G_CONFIG.DEBUG_MODE) console.error('App: SW registration failed:', error);
            });
    }
}


// --- Initial Focus Logic ---
function determineInitialFocusedEvent() {
    if (!allProcessedEvents || allProcessedEvents.length === 0) {
        if (G_CONFIG.DEBUG_MODE) console.log("App: No events available to determine initial focus.");
        return null;
    }

    const nowMs = Date.now();

    // 1. Active Pressure Event
    const activePressureEvent = allProcessedEvents.find(event =>
        event.isPressureEvent && (event.startTime * 1000) <= nowMs && (event.endTime * 1000) >= nowMs
    );
    if (activePressureEvent) {
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Active Pressure Event:", activePressureEvent.id);
        return activePressureEvent.id;
    }

    // 2. Active Calm Period
    const activeCalmPeriod = allProcessedEvents.find(event =>
        !event.isPressureEvent && (event.startTime * 1000) <= nowMs && (event.endTime * 1000) >= nowMs
    );
    if (activeCalmPeriod) {
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Active Calm Period:", activeCalmPeriod.id);
        return activeCalmPeriod.id;
    }

    // 3. Most Recent Past Event or Calm Period
    const pastEvents = allProcessedEvents.filter(event => (event.endTime * 1000) < nowMs);
    if (pastEvents.length > 0) {
        const mostRecentPast = pastEvents.sort((a, b) => b.endTime - a.endTime)[0];
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Most Recent Past Event/Calm:", mostRecentPast.id);
        return mostRecentPast.id;
    }

    // 4. Next Upcoming Event or Calm Period
    const upcomingEvents = allProcessedEvents.filter(event => (event.startTime * 1000) > nowMs);
    if (upcomingEvents.length > 0) {
        const nextUpcoming = upcomingEvents.sort((a, b) => a.startTime - b.startTime)[0];
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Next Upcoming Event/Calm:", nextUpcoming.id);
        return nextUpcoming.id;
    }

    // 5. Fallback to the first event in the list if none of the above match
    if (allProcessedEvents.length > 0) {
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Fallback to first event in list:", allProcessedEvents[0].id);
        return allProcessedEvents[0].id;
    }

    if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - No suitable event found to focus.");
    return null;
}


// --- Core Application Logic ---
async function initializeApp(isManualRefresh = false) {
    if (G_CONFIG.DEBUG_MODE) console.log(`App: Initializing. Manual Refresh: ${isManualRefresh}`);
    currentAppStatus = { status: 'loading', message: "Fetching pressure data..." };

    // Initial minimal render or loading state.
    // UI rendering happens again more completely after data load.
    renderUI(); // Initial render with loading state

    const dataResult = await DataService.loadPressureData(UIRenderer.showNotification, isManualRefresh);

    if (dataResult && dataResult.times && dataResult.values) {
        currentPressureData = {
            times: dataResult.times, // original times in seconds
            values: dataResult.values,
            sourceInfo: dataResult.sourceInfo || {}
        };
        currentAppStatus = { status: dataResult.status, message: dataResult.message };

        if (G_CONFIG.DEBUG_MODE) console.log("App: Pressure data loaded. Status:", currentAppStatus.status, "Message:", currentAppStatus.message, "Source:", currentPressureData.sourceInfo);

        if (!currentAppStatus.status.startsWith('error_') && currentPressureData.times.length > 0) {
            allProcessedEvents = PressureEventManager.detectAndInterleaveEvents(
                currentPressureData.times,
                currentPressureData.values,
                UIRenderer.showNotification
            );
            enrichCalmPeriodsWithNextEventInfo(); // Add next event info to calm periods

            // Determine initial focus only if not manual refresh OR current focused event is now invalid.
            if (!isManualRefresh || !currentlyFocusedEventId || !allProcessedEvents.find(e => e.id === currentlyFocusedEventId)) {
                currentlyFocusedEventId = determineInitialFocusedEvent();
                if (G_CONFIG.DEBUG_MODE) console.log("App: Focused event ID determined/redetermined:", currentlyFocusedEventId);
            } else if (currentlyFocusedEventId && !allProcessedEvents.find(e => e.id === currentlyFocusedEventId)) {
                // Focused ID gone after refresh, re-determine
                if (G_CONFIG.DEBUG_MODE) console.log("App: Previous focused ID no longer valid, redetermining focus.");
                currentlyFocusedEventId = determineInitialFocusedEvent();
            }

        } else { // Data load resulted in an error or no data points
            allProcessedEvents = [];
            currentlyFocusedEventId = null;
            ChartManager.destroyChart();
            if (G_CONFIG.DEBUG_MODE) console.log("App: Data load issue, events cleared, chart destroyed. Status:", currentAppStatus.status);
        }
    } else {
        currentAppStatus = { status: 'error_no_data', message: 'Failed to load any pressure data.' };
        currentPressureData = { times: [], values: [], sourceInfo: {} };
        allProcessedEvents = [];
        currentlyFocusedEventId = null;
        ChartManager.destroyChart();
        if (G_CONFIG.DEBUG_MODE) console.error("App: Failed to load pressure data from DataService. Result:", dataResult);
        UIRenderer.showNotification(currentAppStatus.message, "error");
    }
    renderUI(); // Re-render with new data and state
}

function enrichCalmPeriodsWithNextEventInfo() {
    allProcessedEvents.forEach((event, index) => {
        if (!event.isPressureEvent) { // It's a calm period
            const nextPressureEvent = allProcessedEvents.find((nextEvent, nextIndex) => nextIndex > index && nextEvent.isPressureEvent);
            if (nextPressureEvent) {
                event.nextEventInfo = {
                    startTime: nextPressureEvent.startTime,
                    type: nextPressureEvent.type,
                    severity: nextPressureEvent.severity
                };
                // If UIRenderer can update individual cards:
                // UIRenderer.updateCarouselCardContent(event.id, event, eventMigraineLogs);
            } else {
                event.nextEventInfo = {}; // No upcoming pressure event
            }
        }
    });
}

// --- UI Rendering Logic ---
export function renderUI() {
    if (G_CONFIG.DEBUG_MODE) console.log("App: Rendering UI. FocusedEventID:", currentlyFocusedEventId, "AppStatus:", currentAppStatus.status);

    // The base HTML structure (index.html) is static.
    // UIRenderer functions will populate the content areas within this structure.

    // Render Chart Controls and Events Display based on data availability
    if (currentPressureData.times.length > 0 && !currentAppStatus.status.startsWith('error_')) {
        // Create or update the chart
        if (!ChartManager.getChartInstance() || ChartManager.getChartInstance().series.length === 0) {
            ChartManager.initializeChart(currentPressureData.times.map(t => t * 1000), currentPressureData.values);
        } else {
            // ChartManager.updateChartData(...) // If partial updates were implemented
            // For now, full re-init if data structure implies significant change
            // ChartManager.initializeChart(currentPressureData.times.map(t => t * 1000), currentPressureData.values); // Potentially needed if data format changes
        }
        updateChartHighlights(); // This now applies all highlights based on state
    } else if (!currentAppStatus.status.startsWith('loading')) { // Not loading and no data / error
        // If no data, clear/hide chart and show appropriate messages in events display.
        ChartManager.destroyChart(); // Clean up existing chart if any
        if (G_CONFIG.DEBUG_MODE) console.log("App: No pressure data for chart in renderUI, ensuring chart is destroyed.");
    }

    UIRenderer.renderEventsDisplay(
        allProcessedEvents,
        eventMigraineLogs,
        currentlyFocusedEventId,
        isShowAllEventsOnChartActive, // Pass the current toggle state
        currentAppStatus // Pass current app status for error/loading/stale states
    );

    UIRenderer.updateShowAllEventsToggleState(isShowAllEventsOnChartActive);
    // Other UI updates that depend on the latest data
}


// --- Event Handlers & Callbacks from UI ---
function handleEventMigraineChange(eventId, newSeverity) {
    if (G_CONFIG.DEBUG_MODE) console.log(`App: Migraine severity changed for event ${eventId} to ${newSeverity}`);
    const event = allProcessedEvents.find(e => e.id === eventId);
    if (!event) return;

    if (newSeverity === "cleared" || newSeverity === "") { // "cleared" or empty value from select means remove
        delete eventMigraineLogs[eventId];
        UIRenderer.showNotification("Migraine log cleared for event.", "info", 1500);
    } else {
        eventMigraineLogs[eventId] = { severity: newSeverity, loggedAt: Date.now() };
        UIRenderer.showNotification(`Migraine as '${newSeverity}' logged for event.`, "success", 1500);
    }
    db.saveData(G_CONFIG.EVENT_MIGRAINE_LOGS_KEY, eventMigraineLogs);
    // UIRenderer.updateCarouselCardContent(eventId, event, eventMigraineLogs); // Potentially re-render card if visual changes
    // Chart doesn't directly show migraine data, so no chart update needed for this.
}

function updateChartHighlights() {
    if (!ChartManager.getChartInstance() || currentPressureData.times.length === 0) return;

    ChartManager.clearAllAutomatedEventPlotBands(); // Clears all multi, single, and active focus bands

    if (isShowAllEventsOnChartActive) {
        const pressureEventsOnly = allProcessedEvents.filter(e => e.isPressureEvent);
        ChartManager.displayAllEventsOnChart(pressureEventsOnly, null); // Display base pressure events, no prominent one here

        const focusedEventData = allProcessedEvents.find(e => e.id === currentlyFocusedEventId);
        if (focusedEventData) {
            // Explicitly highlight the single focused event (pressure or calm) on top.
            // `false` for isFocusBandOnly makes it use PLOT_BAND_HIGHLIGHT_COLOR (yellow).
             ChartManager.highlightSingleEventOnChart(focusedEventData, false);
        }
    } else { // "Show All" is OFF: Only highlight the single focused event
        const eventData = allProcessedEvents.find(e => e.id === currentlyFocusedEventId);
        if (eventData) {
            // if it's a pressure event, !eventData.isPressureEvent is false (use yellow highlight)
            // if it's a calm period, !eventData.isPressureEvent is true (use purple focus band)
            ChartManager.highlightSingleEventOnChart(eventData, !eventData.isPressureEvent);
        }
    }
    if (G_CONFIG.DEBUG_MODE) console.log("App: Chart highlights updated. ShowAll:", isShowAllEventsOnChartActive, "FocusedID:", currentlyFocusedEventId);
}


function handleEventFocusChange(eventId) {
    if (G_CONFIG.DEBUG_MODE) console.log(`App: Event focus changed to: ${eventId}`);
    if (eventId && currentlyFocusedEventId !== eventId) {
        currentlyFocusedEventId = eventId;
        updateChartHighlights();
        // UIRenderer updates dot states internally
    }
}

function handleShowAllEventsToggle(event) {
    isShowAllEventsOnChartActive = event.target.checked;
    db.saveData(G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_STATE_KEY, isShowAllEventsOnChartActive);
    if (G_CONFIG.DEBUG_MODE) console.log(`App: Show All Events Toggled: ${isShowAllEventsOnChartActive}`);
    updateChartHighlights(); // Re-apply highlights based on new toggle state
}

function handleReturnToCurrent() {
    if (G_CONFIG.DEBUG_MODE) console.log("App: 'Return to Current' clicked.");
    const initialFocusId = determineInitialFocusedEvent();
    if (initialFocusId) {
        if (currentlyFocusedEventId !== initialFocusId) {
            const targetIndex = allProcessedEvents.findIndex(e => e.id === initialFocusId);
            if (targetIndex !== -1) {
                UIRenderer.cycleToCard(targetIndex, true); // Animate to the card
                // handleEventFocusChange will call updateChartHighlights if ID changes.
                // If ID is already the current one, but chart state might need refresh, call explicitly.
                // updateChartHighlights(); // cycleToCard eventually calls handleEventFocusChange which updates highlights.
            }
        } else {
            // Already on current, but ensure highlights are correct if something was off
            updateChartHighlights();
            UIRenderer.showNotification("Already at the current event.", "info");
        }
    } else {
        UIRenderer.showNotification("No current event identified.", "info");
    }
}

function handleRefreshDataRequest() {
    if (G_CONFIG.DEBUG_MODE) console.log("App: Manual 'Refresh Data' requested by user.");
    UIRenderer.showNotification("Attempting to refresh data...", "info", 2000);
    initializeApp(true);
}

// --- Global Event Listeners ---
function setupGlobalEventListeners() {
    // Ripple effect for buttons
    document.addEventListener('click', function (e) {
        const button = e.target.closest('.m3-button, .m3-button-icon');
        if (button && !button.disabled) {
            createRipple(e);
        }
        const dotButton = e.target.closest('.carousel-dots-container .dot');
        if (dotButton) { // Ripple for dots, simplified
             // createRipple(e); // Optionally add ripple to dots
        }
    });

    // Window resize handler for chart reflow / UI re-render
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (G_CONFIG.DEBUG_MODE) console.log("App: Window resized, re-rendering UI.");
            // ChartManager.reflowChart(); // Highcharts typically reflows well with its container
            renderUI(); // Full UI re-render to adjust layout dynamically
            if (ChartManager.getChartInstance()) ChartManager.reflowChart(); // Reflow after UI is stable
        }, G_CONFIG.CHART_RESIZE_DEBOUNCE_MS);
    });
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    if (G_CONFIG.DEBUG_MODE) console.log("App: DOMContentLoaded event fired.");
    registerServiceWorker();

    UIRenderer.setAppCallbacks({
        onEventMigraineChange: handleEventMigraineChange,
        onShowAllEventsToggle: handleShowAllEventsToggle,
        onReturnToCurrent: handleReturnToCurrent,
        onSwipeEvent: handleEventFocusChange, // swipe/carousel change sets focus
        onRefreshDataRequest: handleRefreshDataRequest,
        onDotClickEvent: handleEventFocusChange // Same handler for swipe and dot click
    });

    // Load persisted data
    eventMigraineLogs = db.loadData(G_CONFIG.EVENT_MIGRAINE_LOGS_KEY) || {};
    const persistedToggleState = db.loadData(G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_STATE_KEY);
    isShowAllEventsOnChartActive = typeof persistedToggleState === 'boolean' ? persistedToggleState : false; // Default to false

    setupGlobalEventListeners();
    await initializeApp(false); // Initial app load

    // Check for updates periodically or on visibility change
    // Consider navigator.serviceWorker.getRegistration().then(reg => reg.update());
});

// Ensure the utils functions are available if called directly (e.g., from inline HTML, though not best practice)
window.AppUtils = { formatUnixTimestamp, createRipple };
// filename: js/app.js