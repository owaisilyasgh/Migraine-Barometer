// js/app.js
import * as DataService from './dataService.js';
import * as ChartManager from './chartManager.js';
import * as UIRenderer from './uiRenderer.js';
import * as PressureEventManager from './pressureEventManager.js';
import * as db from './db.js';
import * as G_CONFIG from './config.js';
import { formatUnixTimestamp } from './utils.js';

let currentPressureData = { times: [], values: [], sourceInfo: {} };
let allProcessedEvents = [];
let eventMigraineLogs = {};
let isShowAllEventsOnChartActive = false;
let currentlyFocusedEventId = null;
let currentAppStatus = { status: 'loading', message: 'Initializing application...' };
let resizeTimeout;

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                if (G_CONFIG.DEBUG_MODE) console.log('App: SW registered:', registration.scope);
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (G_CONFIG.DEBUG_MODE) console.log('App: New service worker activated.');
                });
            })
            .catch(error => {
                if (G_CONFIG.DEBUG_MODE) console.error('App: SW registration failed:', error);
            });
    }
}

function determineInitialFocusedEvent() {
    if (!allProcessedEvents || allProcessedEvents.length === 0) {
        if (G_CONFIG.DEBUG_MODE) console.log("App: No events available to determine initial focus.");
        return null;
    }

    const nowMs = Date.now();

    const activePressureEvent = allProcessedEvents.find(event =>
        event.isPressureEvent && (event.startTime * 1000) <= nowMs && (event.endTime * 1000) > nowMs
    );
    if (activePressureEvent) {
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Active Pressure Event:", activePressureEvent.id);
        return activePressureEvent.id;
    }

    const activeCalmPeriod = allProcessedEvents.find(event =>
        !event.isPressureEvent && (event.startTime * 1000) <= nowMs && (event.endTime * 1000) > nowMs
    );
    if (activeCalmPeriod) {
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Active Calm Period:", activeCalmPeriod.id);
        return activeCalmPeriod.id;
    }

    const pastEvents = allProcessedEvents.filter(event => (event.endTime * 1000) < nowMs);
    if (pastEvents.length > 0) {
        const mostRecentPast = pastEvents.sort((a, b) => b.endTime - a.endTime)[0];
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Most Recent Past Event/Calm:", mostRecentPast.id);
        return mostRecentPast.id;
    }

    const upcomingEvents = allProcessedEvents.filter(event => (event.startTime * 1000) > nowMs);
    if (upcomingEvents.length > 0) {
        const nextUpcoming = upcomingEvents.sort((a, b) => a.startTime - b.startTime)[0];
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Next Upcoming Event/Calm:", nextUpcoming.id);
        return nextUpcoming.id;
    }
    
    if (allProcessedEvents.length > 0) {
        if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - Fallback to first event in list:", allProcessedEvents[0].id);
        return allProcessedEvents[0].id;
    }

    if (G_CONFIG.DEBUG_MODE) console.log("App: Initial focus - No suitable event found to focus.");
    return null;
}

async function initializeApp(isManualRefresh = false) {
    if (G_CONFIG.DEBUG_MODE) console.log(`App: Initializing. Manual Refresh: ${isManualRefresh}`);
    currentAppStatus = { status: 'loading', message: 'Loading pressure data...' };
    renderUI();

    const dataResult = await DataService.loadPressureData(UIRenderer.showNotification, isManualRefresh);

    if (dataResult && dataResult.times && dataResult.values && dataResult.sourceInfo) {
        currentPressureData = {
            times: dataResult.times, // original times in seconds
            values: dataResult.values,
            sourceInfo: dataResult.sourceInfo
        };
        currentAppStatus = { status: dataResult.status, message: dataResult.message || "Data loaded." };
        if (G_CONFIG.DEBUG_MODE) console.log("App: Pressure data loaded. Status:", currentAppStatus.status, "Message:", currentAppStatus.message, "Source:", currentPressureData.sourceInfo);

        if (!currentAppStatus.status.startsWith('error_') && currentPressureData.times.length > 0) {
            allProcessedEvents = PressureEventManager.detectAndInterleaveEvents(
                currentPressureData.times,
                currentPressureData.values,
                UIRenderer.showNotification
            );
            enrichCalmPeriodsWithNextEventInfo();

            if (!isManualRefresh || !currentlyFocusedEventId || !allProcessedEvents.find(e => e.id === currentlyFocusedEventId)) {
                 currentlyFocusedEventId = determineInitialFocusedEvent();
                if (G_CONFIG.DEBUG_MODE) console.log("App: Focused event ID determined/redetermined:", currentlyFocusedEventId);
            } else if (currentlyFocusedEventId && !allProcessedEvents.find(e => e.id === currentlyFocusedEventId)) {
                // Focused ID gone after refresh, re-determine
                if (G_CONFIG.DEBUG_MODE) console.log("App: Previous focused ID no longer valid, redetermining focus.");
                currentlyFocusedEventId = determineInitialFocusedEvent();
            }

        } else {
            allProcessedEvents = [];
            currentlyFocusedEventId = null;
            ChartManager.destroyChart();
            if (G_CONFIG.DEBUG_MODE) console.log("App: Data load issue, events cleared, chart destroyed. Status:", currentAppStatus.status);
        }
    } else {
        currentPressureData = { times: [], values: [], sourceInfo: {} };
        allProcessedEvents = [];
        currentlyFocusedEventId = null;
        currentAppStatus = { status: 'error_critical', message: dataResult?.message || 'Failed to load pressure data structure.' };
        ChartManager.destroyChart();
        if (G_CONFIG.DEBUG_MODE) console.error("App: Failed to load pressure data from DataService. Result:", dataResult);
        UIRenderer.showNotification(currentAppStatus.message, "error");
    }
    renderUI();
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
                // If UIRenderer can update individual cards:
                 UIRenderer.updateCarouselCardContent(event.id, event, eventMigraineLogs);
            } else {
                event.nextEventInfo = {}; // No upcoming pressure event
            }
        }
    });
}

function renderUI() {
    if (G_CONFIG.DEBUG_MODE) console.log("App: Rendering UI. FocusedEventID:", currentlyFocusedEventId, "AppStatus:", currentAppStatus.status);

    if (currentPressureData.times.length > 0 && !currentAppStatus.status.startsWith('error_')) {
        if (!ChartManager.getChartInstance() || ChartManager.getChartInstance().series.length === 0) {
            ChartManager.initializeChart(currentPressureData.times.map(t => t * 1000), currentPressureData.values);
        } else {
             // ChartManager.updateChartData(...) // If partial updates were implemented
             // For now, full re-init if data structure implies significant change
             ChartManager.destroyChart();
             ChartManager.initializeChart(currentPressureData.times.map(t => t * 1000), currentPressureData.values);
        }
        updateChartHighlights(); // This now applies all highlights based on state
    } else if (!currentAppStatus.status.startsWith('loading')) { // Not loading and no data / error
        ChartManager.destroyChart(); 
    }
    
    UIRenderer.renderEventsDisplay(
        allProcessedEvents,
        eventMigraineLogs,
        currentlyFocusedEventId,
        isShowAllEventsOnChartActive,
        currentAppStatus
    );

    if (allProcessedEvents.length > 0 && currentlyFocusedEventId) {
        const targetIndex = allProcessedEvents.findIndex(e => e.id === currentlyFocusedEventId);
        if (targetIndex !== -1 && !UIRenderer.isCarouselInitialized()) {
            // This initial cycle is usually handled by renderEventsDisplay
            // UIRenderer.cycleToCard(targetIndex, true); // Let renderEventsDisplay handle this
        }
    }
    UIRenderer.updateShowAllEventsToggleState(isShowAllEventsOnChartActive);
}

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
    } else {
        // "Show All" is OFF: Only highlight the single focused event
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
    if (currentlyFocusedEventId !== eventId) {
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
    if (initialFocusId && initialFocusId !== currentlyFocusedEventId) {
        currentlyFocusedEventId = initialFocusId;
        const targetIndex = allProcessedEvents.findIndex(e => e.id === currentlyFocusedEventId);
        if (targetIndex !== -1) {
            UIRenderer.cycleToCard(targetIndex, true); // Animate to the card
        }
        // handleEventFocusChange will call updateChartHighlights if ID changes.
        // If ID is already the current one, but chart state might need refresh, call explicitly.
        // updateChartHighlights(); // cycleToCard eventually calls handleEventFocusChange which updates highlights.
    } else if (initialFocusId && initialFocusId === currentlyFocusedEventId) {
        // Already on current, but ensure highlights are correct if something was off
        updateChartHighlights();
        UIRenderer.showNotification("Already at the current event.", "info");
    } else {
        UIRenderer.showNotification("No current event identified.", "info");
    }
}

function handleRefreshDataRequest() {
    if (G_CONFIG.DEBUG_MODE) console.log("App: Manual 'Refresh Data' requested by user.");
    UIRenderer.showNotification("Attempting to refresh data...", "info", 2000);
    initializeApp(true);
}

function setupGlobalEventListeners() {
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (G_CONFIG.DEBUG_MODE) console.log("App: Window resized, re-rendering UI.");
            // ChartManager.reflowChart(); // Highcharts typically reflows well with its container
            renderUI(); // Full UI re-render to adjust layout dynamically
        }, 250);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (G_CONFIG.DEBUG_MODE) console.log("App: DOMContentLoaded event fired.");
    registerServiceWorker();

    UIRenderer.setAppCallbacks({
        onEventMigraineChange: handleEventMigraineChange,
        onShowAllEventsToggle: handleShowAllEventsToggle,
        onReturnToCurrent: handleReturnToCurrent,
        onRefreshDataRequest: handleRefreshDataRequest,
        onSwipeEvent: handleEventFocusChange,
        onDotClickEvent: handleEventFocusChange // Same handler for swipe and dot click
    });

    eventMigraineLogs = db.loadData(G_CONFIG.EVENT_MIGRAINE_LOGS_KEY) || {};
    const persistedToggleState = db.loadData(G_CONFIG.SHOW_ALL_EVENTS_TOGGLE_STATE_KEY);
    isShowAllEventsOnChartActive = typeof persistedToggleState === 'boolean' ? persistedToggleState : false; // Default to false

    setupGlobalEventListeners();
    await initializeApp(false); // Initial app load
});
// filename: js/app.js