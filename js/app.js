// filename: js/app.js
import * as DataService from './dataService.js';
import * as ChartManager from './chartManager.js';
import * as PressureEventManager from './pressureEventManager.js';
import * as _UIRenderer from './uiRenderer.js'; // Corrected import
const UIRenderer = _UIRenderer; // Use the alias
import * as db from './db.js';
import * as G_CONFIG from './config.js';

// Module-level state
let currentPressureData = { times: [], values: [], sourceInfo: {} };
let allProcessedEvents = []; // Pressure events and calm periods
let eventMigraineLogs = {}; // { eventId: { severity: 'mild', loggedAt: timestamp } }
let isShowAllEventsOnChartActive = false;
let currentlyFocusedEventId = null; // For mobile carousel and desktop table highlight
let resizeTimeout;
let currentAppStatus = { status: 'loading', message: 'Initializing application...' }; // Overall app/data status

/** Registers the service worker. */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                if (G_CONFIG.DEBUG_MODE) console.log('App: SW registered:', registration.scope);
                // Optional: Listen for controller change
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (G_CONFIG.DEBUG_MODE) console.log('App: New service worker activated.');
                    // May prompt user to refresh page if critical SW update.
                });
            })
            .catch(error => {
                if (G_CONFIG.DEBUG_MODE) console.error('App: SW registration failed:', error);
            });
    }
}

/**
 * Determines the initial event/card to focus on page load or data refresh.
 */
function determineInitialFocusedEvent() {
    if (!allProcessedEvents || allProcessedEvents.length === 0) {
        return null;
    }
    const nowMs = Date.now();

    // Priority 1a: Current Active Pressure Event
    const activePressureEvent = allProcessedEvents.find(event =>
        event.isPressureEvent && (event.startTime * 1000) <= nowMs && (event.endTime * 1000) > nowMs
    );
    if (activePressureEvent) {
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Active Pressure Event:", activePressureEvent.id);
        return activePressureEvent.id;
    }

    // Priority 1b: Current "Calm" Period
    const activeCalmPeriod = allProcessedEvents.find(event =>
        !event.isPressureEvent && (event.startTime * 1000) <= nowMs && (event.endTime * 1000) > nowMs
    );
    if (activeCalmPeriod) {
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Active Calm Period:", activeCalmPeriod.id);
        return activeCalmPeriod.id;
    }

    // Priority 2: Most Recent Concluded Event/Calm (if current time is past all data, but data is fresh)
    const pastEvents = allProcessedEvents.filter(event => (event.endTime * 1000) < nowMs);
    if (pastEvents.length > 0) {
        const mostRecentPast = pastEvents.sort((a, b) => b.endTime - a.endTime)[0];
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Most Recent Past Event/Calm:", mostRecentPast.id);
        return mostRecentPast.id;
    }

    // Priority 3: Next Upcoming Event/Calm (if current time is before all data)
    const upcomingEvents = allProcessedEvents.filter(event => (event.startTime * 1000) > nowMs);
    if (upcomingEvents.length > 0) {
        const nextUpcoming = upcomingEvents.sort((a, b) => a.startTime - b.startTime)[0];
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Next Upcoming Event/Calm:", nextUpcoming.id);
        return nextUpcoming.id;
    }

    // Fallback to the first event if any exist
    if (allProcessedEvents.length > 0) {
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Fallback to first event in list:", allProcessedEvents[0].id);
        return allProcessedEvents[0].id;
    }

    if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - No suitable event found to focus.");
    return null;
}


async function initializeApp(isManualRefresh = false) {
    if (G_CONFIG.DEBUG_MODE) console.log(`App: Initializing. Manual Refresh: ${isManualRefresh}`);
    currentAppStatus = { status: 'loading', message: 'Fetching latest pressure data...' };
    renderUI(); // Show loading state

    const dataResult = await DataService.loadPressureData(UIRenderer.showNotification, isManualRefresh);

    if (dataResult && dataResult.times && dataResult.values && dataResult.sourceInfo) {
        currentPressureData = {
            times: dataResult.times, // original times in seconds
            values: dataResult.values,
            sourceInfo: dataResult.sourceInfo
        };
        currentAppStatus = { status: dataResult.status, message: dataResult.message };
        if (G_CONFIG.DEBUG_MODE) console.log("App: Pressure data loaded successfully. Status:", currentAppStatus.status, "Message:", currentAppStatus.message, "Source:", currentPressureData.sourceInfo);

        // Process events only if data is considered usable (not a hard error status)
        if (!currentAppStatus.status.startsWith('error_') && currentPressureData.times.length > 0) {
            allProcessedEvents = PressureEventManager.detectAndInterleaveEvents(
                currentPressureData.times,
                currentPressureData.values,
                UIRenderer.showNotification
            );
            // Enrich calm periods with next event info
            enrichCalmPeriodsWithNextEventInfo();

            const oldFocusedEventId = currentlyFocusedEventId;
            if (!isManualRefresh || !currentlyFocusedEventId || !allProcessedEvents.find(e => e.id === currentlyFocusedEventId)) {
                currentlyFocusedEventId = determineInitialFocusedEvent();
            }

            if (oldFocusedEventId !== currentlyFocusedEventId && G_CONFIG.DEBUG_MODE) {
                console.log("App: Focused event ID changed/determined:", currentlyFocusedEventId);
            }

            // If focused ID no longer valid, redetermine
            if (currentlyFocusedEventId && !allProcessedEvents.find(e => e.id === currentlyFocusedEventId)) {
                if (G_CONFIG.DEBUG_MODE) console.log("App: Previous focused ID no longer valid, redetermining focus.");
                currentlyFocusedEventId = determineInitialFocusedEvent();
            }

        } else {
            // Data load resulted in an error status or no data, clear events
            allProcessedEvents = [];
            currentlyFocusedEventId = null; // Reset focus if no events
            ChartManager.destroyChart(); // Clear chart if data load failed hard
            if (G_CONFIG.DEBUG_MODE) console.log("App: Data load issue, events cleared, chart destroyed. Status:", currentAppStatus.status);
        }
    } else { // DataService returned null or unexpected structure
        currentPressureData = { times: [], values: [], sourceInfo: {} };
        allProcessedEvents = [];
        currentlyFocusedEventId = null;
        currentAppStatus = { status: dataResult?.status || 'error_no_data', message: dataResult?.message || "Failed to load pressure data." };
        ChartManager.destroyChart(); // Clear chart
        if (G_CONFIG.DEBUG_MODE) console.error("App: Failed to load pressure data from DataService. Result:", dataResult);
        UIRenderer.showNotification(currentAppStatus.message || "Data loading failed.", "error");
    }
    renderUI(); // Render with new data or error state
}


function enrichCalmPeriodsWithNextEventInfo() {
    allProcessedEvents.forEach((event, index) => {
        if (!event.isPressureEvent) { // It's a calm period
            const nextPressureEvent = allProcessedEvents.find((nextEvent, nextIndex) => nextIndex > index && nextEvent.isPressureEvent);
            if (nextPressureEvent) {
                event.nextEventInfo = {
                    type: nextPressureEvent.type,
                    severity: nextPressureEvent.severity,
                    startTime: nextPressureEvent.startTime
                };
                // Update card content if it exists
                UIRenderer.updateCarouselCardContent(event.id, event, eventMigraineLogs);
            } else {
                event.nextEventInfo = {}; // No upcoming pressure event
            }
        }
    });
}

function renderUI() {
    if (G_CONFIG.DEBUG_MODE) console.log("App: Rendering UI. FocusedEventID:", currentlyFocusedEventId, "AppStatus:", currentAppStatus.status);

    // Chart Rendering/Update
    if (currentPressureData.times.length > 0 && !currentAppStatus.status.startsWith('error_')) {
        if (!ChartManager.getChartInstance() || ChartManager.getChartInstance().series.length === 0) { // Ensure chart is created or re-created if series are gone
            ChartManager.initializeChart(currentPressureData.times.map(t => t * 1000), currentPressureData.values);
        } else {
            // Chart already exists, potentially update data or highlights
            // For now, full re-init on data change might be simpler if data spans change significantly
            // Consider a more nuanced update if performance becomes an issue.
            // ChartManager.updateChartData(currentPressureData.times.map(t => t * 1000), currentPressureData.values);
            // Quick re-init if data source fundamentally changed (e.g. different day span)
             ChartManager.destroyChart();
             ChartManager.initializeChart(currentPressureData.times.map(t => t * 1000), currentPressureData.values);
        }
        updateChartHighlights();
    } else {
        ChartManager.destroyChart(); // Ensure chart is cleared if no data or error
    }

    // Events Display (Carousel)
    UIRenderer.renderEventsDisplay(
        allProcessedEvents,
        eventMigraineLogs,
        currentlyFocusedEventId,
        isShowAllEventsOnChartActive,
        currentAppStatus // Pass app status for special card rendering
    );

    // Update toggle state visually (already done by renderEventsDisplay if it renders controls)
    // UIRenderer.updateShowAllEventsToggleState(isShowAllEventsOnChartActive);

    // If initial load/refresh, cycle to focused card
    // This is now better handled by renderEventsDisplay -> renderFocusedEventCarousel -> updateCarouselView(true)
    if (currentlyFocusedEventId && allProcessedEvents.length > 0) {
        const targetIndex = allProcessedEvents.findIndex(e => e.id === currentlyFocusedEventId);
        if (targetIndex !== -1) {
            // UIRenderer.cycleToCard(targetIndex, true); // true for page load like animation // This might be redundant
        }
    }
}


function handleEventMigraineChange(eventId, selectElement) {
    const newSeverity = selectElement.value;
    if (G_CONFIG.DEBUG_MODE) console.log(`App: Migraine severity changed for event ${eventId} to ${newSeverity}`);

    if (!newSeverity || newSeverity === "") { // "Log Migraine..." or empty option selected
        delete eventMigraineLogs[eventId];
        UIRenderer.showNotification("Migraine log cleared for event.", "info", 1500);
    } else {
        eventMigraineLogs[eventId] = { severity: newSeverity, loggedAt: Date.now() };
        UIRenderer.showNotification(`Migraine as '${newSeverity}' logged for event.`, "success", 1500);
    }
    db.saveData(G_CONFIG.EVENT_MIGRAINE_LOGS_KEY, eventMigraineLogs);
    // No need to re-render full UI, select element already reflects change.
    // Potentially update card visuals if severity changes card appearance beyond select.
}

function updateChartHighlights() {
    if (!ChartManager.getChartInstance() || currentPressureData.times.length === 0) return;

    ChartManager.clearAllAutomatedEventPlotBands();
    ChartManager.clearSingleEventHighlight(); // Also clears active focus band

    if (isShowAllEventsOnChartActive) {
        const pressureEventsOnly = allProcessedEvents.filter(e => e.isPressureEvent);
        ChartManager.displayAllEventsOnChart(pressureEventsOnly, currentlyFocusedEventId);
    } else if (currentlyFocusedEventId) { // Show only the single focused event
        const eventData = allProcessedEvents.find(e => e.id === currentlyFocusedEventId);
        if (eventData && eventData.isPressureEvent) { // Only highlight pressure events, not calm periods
            ChartManager.highlightSingleEventOnChart(eventData);
        }
    }
    if (G_CONFIG.DEBUG_MODE) console.log("App: Chart highlights updated. ShowAll:", isShowAllEventsOnChartActive, "FocusedID:", currentlyFocusedEventId);
}


function handleEventFocusChange(eventId) { // Called by carousel swipe
    if (G_CONFIG.DEBUG_MODE) console.log(`App: Event focus changed to: ${eventId}`);
    if (currentlyFocusedEventId !== eventId) {
        currentlyFocusedEventId = eventId;
        updateChartHighlights(); // Update chart highlights based on new focused event
        // The carousel itself updates its visual focus.
        // No need to call renderUI() here as it would re-render everything.
        // If other parts of the UI depend on focused event, update them selectively.
        // UIRenderer.renderEventsDisplay(allProcessedEvents, eventMigraineLogs, currentlyFocusedEventId, isShowAllEventsOnChartActive, currentAppStatus);
    }
}

function handleShowAllEventsToggle(event) {
    isShowAllEventsOnChartActive = event.target.checked;
    db.saveData(G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_STATE_KEY, isShowAllEventsOnChartActive);
    if (G_CONFIG.DEBUG_MODE) console.log(`App: Show All Events Toggled: ${isShowAllEventsOnChartActive}`);
    updateChartHighlights();
    // No need to re-render full UI
}

function handleReturnToCurrent() {
    if (G_CONFIG.DEBUG_MODE) console.log("App: 'Return to Current' clicked.");
    const initialFocusId = determineInitialFocusedEvent(); // Re-determine what "current" is now
    if (initialFocusId) {
        currentlyFocusedEventId = initialFocusId;
        const targetIndex = allProcessedEvents.findIndex(e => e.id === currentlyFocusedEventId);
        if (targetIndex !== -1) {
            UIRenderer.cycleToCard(targetIndex, true); // Animate to the card
        }
        updateChartHighlights(); // Update chart for the new "current" focus
    } else {
        UIRenderer.showNotification("No current event identified.", "info");
    }
}


function handleRefreshDataRequest() {
    if (G_CONFIG.DEBUG_MODE) console.log("App: Manual 'Refresh Data' requested by user.");
    UIRenderer.showNotification("Attempting to refresh data...", "info", 2000);
    initializeApp(true); // true for manual refresh
}


function setupEventListeners() {
    // Note: The toggle switch is dynamically created by UIRenderer.
    // Event listener needs to be attached via event delegation on a static parent,
    // or re-attached IF UIRenderer replaces the entire controls section.
    // UIRenderer now creates a new toggle each time, so direct attachment here won't work.
    // The 'change' event for the toggle should be handled by the onShowAllEventsToggleAppCallback via UIRenderer.
    // So, this direct listener setup is removed as app.js passes the callback to uiRenderer.
    // The actual listener for the toggle input is set up in uiRenderer.js (implicitly via framework or explicitly)
    // No, UIRenderer does not set up the listener. app.js needs to get the element after UIRenderer creates it.
    // This is tricky. A better pattern is for UIRenderer to take the callback and attach it.
    // For now, let's assume that `renderUI` is called, controls are created, then we try to attach.
    // This is still fragile. The callback pattern for UIRenderer is better.

    // The callbacks are passed to UIRenderer.setAppCallbacks.
    // UIRenderer then uses these callbacks when it creates the elements. Example:
    // showAllEventsToggle.addEventListener('change', onShowAllEventsToggleAppCallback);
    // This is done in UIRenderer.setAppCallbacks now.

    // The only listener truly set up here is window resize.
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (G_CONFIG.DEBUG_MODE) console.log("App: Window resized, re-rendering UI for new view.");
            // Full re-render on resize might be heavy. Could optimize chart.reflow or specific UI parts.
            // ChartManager.reflowChart(); // If only chart needs reflow
            renderUI(); // Re-render the whole UI for now, adapts carousel etc.
        }, 250);
    });
}


document.addEventListener('DOMContentLoaded', async () => {
    if (G_CONFIG.DEBUG_MODE) console.log("App: DOMContentLoaded event fired.");
    registerServiceWorker();

    UIRenderer.setAppCallbacks({
        onEventMigraineChange: handleEventMigraineChange,
        onShowAllEventsToggle: handleShowAllEventsToggle, // UIRenderer attaches this to the toggle
        onReturnToCurrent: handleReturnToCurrent,     // UIRenderer attaches this to the button
        onSwipeEvent: handleEventFocusChange,         // UIRenderer attaches this to carousel
        onRefreshData: handleRefreshDataRequest     // UIRenderer attaches this to refresh button on special cards
    });

    eventMigraineLogs = db.loadData(G_CONFIG.EVENT_MIGRAINE_LOGS_KEY) || {};
    const persistedToggleState = db.loadData(G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_STATE_KEY);
    isShowAllEventsOnChartActive = typeof persistedToggleState === 'boolean' ? persistedToggleState : false; // Default to false

    setupEventListeners(); // Mainly for window resize now
    await initializeApp(false); // Initial app load (not a manual refresh)
});
// filename: js/app.js