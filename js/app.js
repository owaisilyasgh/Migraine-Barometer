// js/app.js
import * as Config from './config.js';
import * as db from './db.js';
import * as dataService from './dataService.js';
import * as ChartManager from './chartManager.js';
import * as PressureEventManager from './pressureEventManager.js';
import * as UIRenderer from './uiRenderer.js';
// createRipple is no longer used for the toggle, can be removed if not used elsewhere

// Module-level state
let currentPressureHourlyTimes = [];
let currentPressureHourlyValues = [];
let currentAutomatedEvents = [];
let eventMigraineLogs = {};
let currentlyHighlightedAutomatedEventId = null;
let isShowAllEventsOnChartActive = false;
let isDataLoaded = false;
let isThemeApplied = false;

/** Registers the service worker. */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('SW registered:', registration.scope))
            .catch(error => console.error('SW registration failed:', error));
    }
}

function tryInitializeChartAndEvents() {
    if (isDataLoaded && isThemeApplied) {
        console.log("Both data loaded and theme applied. Attempting to initialize/update chart.");
        if (currentPressureHourlyTimes.length > 0 && currentPressureHourlyValues.length > 0) {
            processAndDisplayPressureData(currentPressureHourlyTimes, currentPressureHourlyValues);
        } else {
            console.log("No data available for chart. Clearing chart and events table.");
            ChartManager.destroyChart();
            currentAutomatedEvents = [];
            rerenderAutomatedEventsUI();
        }
    }
}

function applyCosmeticThemeSettings() {
    document.body.classList.remove('theme-mode-dark');
    document.body.classList.add('theme-mode-light');
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', Config.META_THEME_COLOR);
    }
    console.log("Cosmetic theme settings applied.");
    isThemeApplied = true;
    setTimeout(tryInitializeChartAndEvents, 0);
}

function processAndDisplayPressureData(times, values) {
    console.log("processAndDisplayPressureData called.");
    if (!times || times.length === 0 || !values || values.length === 0) {
        console.log("No data for processAndDisplayPressureData.");
        ChartManager.destroyChart();
        currentAutomatedEvents = [];
        rerenderAutomatedEventsUI();
        return;
    }
    try {
        console.log("Initializing chart with data.");
        ChartManager.initializeChart(currentPressureHourlyTimes, currentPressureHourlyValues);
        PressureEventManager.updatePressureDataCache(currentPressureHourlyTimes, currentPressureHourlyValues);
        currentAutomatedEvents = PressureEventManager.detectAndStoreAutomatedPressureEvents(
            currentPressureHourlyTimes,
            currentPressureHourlyValues,
            UIRenderer.showNotification
        );
        rerenderAutomatedEventsUI();
    } catch (error) {
        console.error("Error in processAndDisplayPressureData:", error);
        UIRenderer.showNotification("Error displaying chart or processing events.", "error");
    }
}

function handleEventMigraineChange(eventId, selectElement) {
    const newSeverity = selectElement.value;
    if (newSeverity === "") {
        delete eventMigraineLogs[eventId];
        UIRenderer.showNotification("Migraine log cleared for event.", "info", 1500);
    } else {
        eventMigraineLogs[eventId] = { severity: newSeverity, loggedAt: Date.now() };
        UIRenderer.showNotification(`Migraine as '${newSeverity}' logged for event.`, "success", 1500);
    }
    db.saveData(Config.EVENT_MIGRAINE_LOGS_KEY, eventMigraineLogs);
}

function refreshChartHighlights() {
    if (!ChartManager.getChartInstance()) return;
    if (isShowAllEventsOnChartActive) {
        ChartManager.displayAllEventsOnChart(currentAutomatedEvents, currentlyHighlightedAutomatedEventId);
    } else {
        if (currentlyHighlightedAutomatedEventId) {
            const eventData = currentAutomatedEvents.find(e => e.id === currentlyHighlightedAutomatedEventId);
            ChartManager.highlightSingleEventOnChart(eventData);
        } else {
            ChartManager.clearSingleEventHighlight();
            ChartManager.clearAllAutomatedEventPlotBands();
        }
    }
}

function rerenderAutomatedEventsUI() {
    UIRenderer.renderAutomatedEventsTable(
        currentAutomatedEvents,
        currentlyHighlightedAutomatedEventId,
        eventMigraineLogs,
        handleEventMigraineChange,
        isShowAllEventsOnChartActive
    );
    refreshChartHighlights();
}

function handleAutomatedEventRowClick(eventId) {
    if (currentlyHighlightedAutomatedEventId === eventId && !isShowAllEventsOnChartActive) {
        currentlyHighlightedAutomatedEventId = null;
    } else {
        currentlyHighlightedAutomatedEventId = eventId;
    }
    rerenderAutomatedEventsUI();
}

/** Handles the "Show All Events on Chart" toggle switch change. */
function handleShowAllEventsToggle(event) {
    isShowAllEventsOnChartActive = event.target.checked; // Get state from checkbox
    db.saveData(Config.SHOW_ALL_EVENTS_TOGGLE_STATE_KEY, isShowAllEventsOnChartActive);
    // UIRenderer.updateShowAllEventsToggleState is implicitly handled by CSS via :checked
    // but if direct manipulation were needed, it would go here.
    // For this implementation, direct call to UIRenderer to update visual state is not strictly necessary
    // as CSS handles it based on the 'checked' property, which we update below if loading from persistence.
    console.log(`Show All Events Toggled: ${isShowAllEventsOnChartActive}`);
    refreshChartHighlights();
    rerenderAutomatedEventsUI(); // Re-render table which might depend on this state for row highlights
}

function setupEventListeners() {
    const showAllEventsToggle = document.getElementById(Config.SHOW_ALL_EVENTS_TOGGLE_ID);
    if (showAllEventsToggle) {
        showAllEventsToggle.addEventListener('change', handleShowAllEventsToggle);
    } else {
        console.warn(`Toggle switch with ID ${Config.SHOW_ALL_EVENTS_TOGGLE_ID} not found.`);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded event fired.");
    registerServiceWorker();
    UIRenderer.setCurrentHighlightHandler(handleAutomatedEventRowClick);
    setupEventListeners();
    applyCosmeticThemeSettings();

    eventMigraineLogs = db.loadData(Config.EVENT_MIGRAINE_LOGS_KEY) || {};
    const persistedToggleState = db.loadData(Config.SHOW_ALL_EVENTS_TOGGLE_STATE_KEY);
    if (typeof persistedToggleState === 'boolean') {
        isShowAllEventsOnChartActive = persistedToggleState;
        UIRenderer.updateShowAllEventsToggleState(isShowAllEventsOnChartActive); // Ensure toggle reflects persisted state
    }

    try {
        UIRenderer.showNotification("Fetching latest pressure data...", "info", 2500);
        const data = await dataService.loadPressureData(UIRenderer.showNotification, Config.ENABLE_GEOLOCATION);
        if (data && data.times && data.values) {
            console.log("Pressure data loaded. Source:", data.sourceInfo);
            currentPressureHourlyTimes = data.times;
            currentPressureHourlyValues = data.values;
        } else {
            console.log("No pressure data loaded from dataService.");
            currentPressureHourlyTimes = [];
            currentPressureHourlyValues = [];
        }
    } catch (error) {
        console.error("Error during initial data load:", error);
        UIRenderer.showNotification(`Initial data load failed: ${error.message}. Check console.`, "error");
        currentPressureHourlyTimes = [];
        currentPressureHourlyValues = [];
    } finally {
        isDataLoaded = true;
        tryInitializeChartAndEvents();
    }
});
// filename: js/app.js