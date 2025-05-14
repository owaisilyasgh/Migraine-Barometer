// js/app.js
import * as Config from './config.js';
import db from './db.js';
import * as ChartManager from './chartManager.js';
import * as UIRenderer from './uiRenderer.js';
import * as PressureEventManager from './pressureEventManager.js';
import { createRipple } from './utils.js';

// Module-level state
let currentPressureHourlyTimes = [];
let currentPressureHourlyValues = [];
let currentPressureDataSourceInfo = null; 
let currentThemeId = Config.DEFAULT_THEME_ID;
let currentAutomatedEvents = [];
let currentlyHighlightedAutomatedEventId = null;
let eventMigraineLogs = {}; 
let isShowAllEventsOnChartActive = false; 
let showAllEventsBtn = null; // To store the button element


/** Registers the service worker. */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('SW registered:', registration.scope))
            .catch(error => console.error('SW registration failed:', error));
    }
}

/**
 * Applies the selected theme.
 * @param {string} themeId - The ID of the theme to apply.
 */
function applyTheme(themeId) {
    currentThemeId = themeId;
    db.saveData(Config.THEME_STORAGE_KEY, themeId);

    const selectedTheme = Config.THEMES.find(t => t.id === themeId);
    if (!selectedTheme) {
        console.error(`Theme with id ${themeId} not found.`);
        UIRenderer.showNotification(`Theme ${themeId} not found. Using default.`, "error");
        if (themeId !== Config.DEFAULT_THEME_ID) { 
            applyTheme(Config.DEFAULT_THEME_ID);
        }
        return;
    }

    const oldThemeScript = document.getElementById(Config.DYNAMIC_THEME_SCRIPT_ID);
    if (oldThemeScript) oldThemeScript.remove();

    Highcharts.setOptions(ChartManager.HIGHCHARTS_EXPLICIT_DEFAULT_STYLES);
    Highcharts.setOptions(ChartManager.BASE_HIGHCHARTS_OPTIONS);
    
    const finalizeThemeAndProcessData = () => {
        if (currentPressureHourlyTimes.length > 0 && currentPressureHourlyValues.length > 0) {
            ChartManager.destroyChart(); 
            processAndDisplayPressureData(currentPressureHourlyTimes, currentPressureHourlyValues);
        } else if (currentThemeId !== Config.DEFAULT_THEME_ID && !selectedTheme.path) {
            initiateFreshDataLoad();
        }
        if(ChartManager.getChartInstance()) ChartManager.getChartInstance().redraw();
    };

    if (selectedTheme.path) { 
        UIRenderer.showNotification(`Loading ${selectedTheme.name} theme...`, "info", 2000);
        const script = document.createElement('script');
        script.id = Config.DYNAMIC_THEME_SCRIPT_ID;
        script.src = selectedTheme.path;
        script.async = true;
        script.onload = () => {
            UIRenderer.showNotification(`${selectedTheme.name} theme applied.`, "success", 1500);
            finalizeThemeAndProcessData();
        };
        script.onerror = () => {
            UIRenderer.showNotification(`Error loading ${selectedTheme.name}. Reverting to Default.`, "error");
            db.saveData(Config.THEME_STORAGE_KEY, Config.DEFAULT_THEME_ID); 
            if (currentThemeId !== Config.DEFAULT_THEME_ID) applyTheme(Config.DEFAULT_THEME_ID); 
        };
        document.head.appendChild(script);
    } else { 
        UIRenderer.showNotification(`${selectedTheme.name} theme applied.`, "info", 1000);
        finalizeThemeAndProcessData();
    }
}


/** Fetches pressure data from the live API. */
async function fetchPressureDataFromAPI(latitude, longitude) {
    const apiUrl = Config.API_URL_TEMPLATE.replace('{LAT}', latitude).replace('{LON}', longitude);
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API error! status: ${response.status}`);
        const data = await response.json();
        UIRenderer.showNotification("Live pressure data fetched!", "success", 1500);
        return data;
    } catch (error) {
        console.error('Error fetching live data:', error);
        UIRenderer.showNotification(`Error fetching live data: ${error.message}.`, "error");
        return null;
    }
}

/** Fetches pressure data from the mock JSON file. */
async function fetchPressureDataFromMock() {
    try {
        const response = await fetch(Config.MOCK_DATA_PATH);
        if (!response.ok) throw new Error(`Mock data HTTP error! status: ${response.status}`);
        const data = await response.json();
        UIRenderer.showNotification("Mock data loaded.", "success", 1000);
        return data;
    } catch (error) {
        console.error('Error fetching mock data:', error);
        UIRenderer.showNotification(`Error loading mock data: ${error.message}.`, "error");
        return null;
    }
}

/** Initiates loading of fresh pressure data, trying geolocation then falling back. */
async function initiateFreshDataLoad() {
    UIRenderer.showNotification("Fetching latest pressure data...", "info", 2500);
    let pressureDataJson = null;
    let sourceInfo = { type: 'unknown', fetchTimestamp: Date.now() };

    if (Config.USE_MOCK_DATA) {
        sourceInfo.type = 'mock'; pressureDataJson = await fetchPressureDataFromMock();
    } else {
        if (Config.ENABLE_GEOLOCATION && navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
                sourceInfo.lat = position.coords.latitude;
                sourceInfo.lon = position.coords.longitude;
                sourceInfo.type = 'live-geo';
                pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon);
            } catch (geoError) {
                UIRenderer.showNotification(`Geolocation failed: ${geoError.message}. Using default coords.`, "warning", 4000);
                sourceInfo.type = 'live-default-coords';
                pressureDataJson = await fetchPressureDataFromAPI(Config.DEFAULT_LATITUDE, Config.DEFAULT_LONGITUDE);
            }
        } else {
             UIRenderer.showNotification("Geolocation N/A or disabled. Using default coords for live data.", "warning", 4000);
            sourceInfo.type = 'live-default-coords';
            pressureDataJson = await fetchPressureDataFromAPI(Config.DEFAULT_LATITUDE, Config.DEFAULT_LONGITUDE);
        }
        if (!pressureDataJson) {
            UIRenderer.showNotification("Live data failed. Using mock as fallback.", "warning", 3000);
            sourceInfo.type = 'mock-fallback'; pressureDataJson = await fetchPressureDataFromMock();
        }
    }
    
    if (pressureDataJson && pressureDataJson.hourly && pressureDataJson.hourly.time && pressureDataJson.hourly.surface_pressure) {
        currentPressureHourlyTimes = pressureDataJson.hourly.time;
        currentPressureHourlyValues = pressureDataJson.hourly.surface_pressure;
        currentPressureDataSourceInfo = sourceInfo;
        db.saveData(Config.CACHED_PRESSURE_DATA_KEY, { 
            times: currentPressureHourlyTimes, 
            values: currentPressureHourlyValues, 
            sourceInfo: currentPressureDataSourceInfo 
        });
        processAndDisplayPressureData(currentPressureHourlyTimes, currentPressureHourlyValues);
    } else {
        UIRenderer.showNotification("Failed to load any pressure data. Check console.", "error");
    }
}

/** Processes and displays the fetched pressure data. */
function processAndDisplayPressureData(times, values) {
    if (!times || !values || times.length === 0 || values.length === 0) {
        UIRenderer.showNotification("No data to display.", "error");
        return;
    }
    try {
        ChartManager.initializeChart(times, values, Config.THEMES, currentThemeId, applyTheme);
        currentAutomatedEvents = PressureEventManager.detectAndStoreAutomatedPressureEvents(
            times, 
            values,
            UIRenderer.showNotification 
        );
        rerenderAutomatedEventsUI(); 
    } catch (error) {
        console.error("Error processing or displaying pressure data:", error);
        UIRenderer.showNotification("Error initializing chart or processing events.", "error");
    }
}

/** Handles changes to a migraine log select dropdown. */
function handleEventMigraineChange(eventId, selectElement) {
    const newSeverity = selectElement.value;
    if (newSeverity === "") { 
        delete eventMigraineLogs[eventId];
        db.saveData(Config.EVENT_MIGRAINE_LOGS_KEY, eventMigraineLogs);
        UIRenderer.showNotification("Migraine log cleared for event.", "info", 1500);
    } else {
        eventMigraineLogs[eventId] = { severity: newSeverity, loggedAt: Date.now() };
        db.saveData(Config.EVENT_MIGRAINE_LOGS_KEY, eventMigraineLogs);
        UIRenderer.showNotification(`Migraine as '${newSeverity}' logged for event.`, "success", 1500);
    }
}


/** Updates the chart based on current toggle and selection state. */
function refreshChartHighlights() {
    if (isShowAllEventsOnChartActive) {
        ChartManager.displayAllEventsOnChart(currentAutomatedEvents, currentlyHighlightedAutomatedEventId);
    } else {
        if (currentlyHighlightedAutomatedEventId) {
            const eventData = currentAutomatedEvents.find(e => e.id === currentlyHighlightedAutomatedEventId);
            ChartManager.highlightSingleEventOnChart(eventData); // This will also clear all multi-bands
        } else {
            // Explicitly clear both if toggle is off and no specific event is highlighted
            ChartManager.clearSingleEventHighlight();
            ChartManager.clearAllAutomatedEventPlotBands();
        }
    }
}

/** Rerenders the automated events UI (table and chart highlights). */
function rerenderAutomatedEventsUI() {
    UIRenderer.renderAutomatedEventsTable(
        currentAutomatedEvents,
        currentlyHighlightedAutomatedEventId,
        eventMigraineLogs,
        handleEventMigraineChange,
        updateMergeUnmergeButtonStates,
        isShowAllEventsOnChartActive 
    );
    refreshChartHighlights(); 
    updateMergeUnmergeButtonStates(); 
}

/** Handles click on an automated event row for highlighting. */
function handleAutomatedEventRowClick(eventId, clickedRowElement) {
    if (currentlyHighlightedAutomatedEventId === eventId && !isShowAllEventsOnChartActive) {
        currentlyHighlightedAutomatedEventId = null;
    } else {
        currentlyHighlightedAutomatedEventId = eventId;
    }
    rerenderAutomatedEventsUI(); 
}


/** Updates the state of merge/unmerge buttons based on table selection. */
function updateMergeUnmergeButtonStates() {
    const tableBody = document.getElementById(Config.EVENTS_TABLE_BODY_ID);
    if (!tableBody) return;

    const selectedCheckboxes = Array.from(tableBody.querySelectorAll('input[type="checkbox"]:checked'));
    const numberOfSelected = selectedCheckboxes.length;
    let isSingleSelectedEventMerged = false;

    if (numberOfSelected === 1) {
        const selectedEventId = selectedCheckboxes[0].dataset.eventId;
        const selectedEvent = currentAutomatedEvents.find(event => event.id === selectedEventId);
        if (selectedEvent) {
            isSingleSelectedEventMerged = selectedEvent.isMerged;
        }
    }
    UIRenderer.updateAutomatedEventActionButtonsState(numberOfSelected, isSingleSelectedEventMerged);
}

/** Handles the "Show All Events on Chart" toggle button click. */
function toggleShowAllEventsDisplay() {
    isShowAllEventsOnChartActive = !isShowAllEventsOnChartActive;
    db.saveData(Config.SHOW_ALL_EVENTS_TOGGLE_STATE_KEY, isShowAllEventsOnChartActive);
    UIRenderer.updateShowAllEventsButtonState(isShowAllEventsOnChartActive);
    refreshChartHighlights(); // Update chart immediately
     // When turning "Show All" OFF, if a single event was prominent, it stays highlighted.
    // If no event was prominent, the chart clears.
    // The table row highlight logic in renderAutomatedEventsTable respects isShowAllEventsActive.
    rerenderAutomatedEventsUI(); // Ensure table row highlights are also updated
}


/** Sets up all event listeners for the application. */
function setupEventListeners() {
    const mergeBtn = document.getElementById(Config.MERGE_EVENTS_BTN_ID);
    if (mergeBtn) {
        mergeBtn.addEventListener('click', createRipple);
        mergeBtn.addEventListener('click', () => {
            const tableBody = document.getElementById(Config.EVENTS_TABLE_BODY_ID);
            if (!tableBody) return;
            const selectedCheckboxes = Array.from(tableBody.querySelectorAll('input[type="checkbox"]:checked'));
            const selectedEventIds = selectedCheckboxes.map(cb => cb.dataset.eventId);
            
            const result = PressureEventManager.handleMergeAutomatedEvents(selectedEventIds, UIRenderer.showNotification);
            if (result.success) {
                currentAutomatedEvents = PressureEventManager.getAllAutomatedEvents();
                if (result.highlightNeedsClear) currentlyHighlightedAutomatedEventId = null; 
                if (result.newMergedEventId) currentlyHighlightedAutomatedEventId = result.newMergedEventId; 
                rerenderAutomatedEventsUI();
            }
        });
    }

    const unmergeBtn = document.getElementById(Config.UNMERGE_EVENT_BTN_ID);
    if (unmergeBtn) {
        unmergeBtn.addEventListener('click', createRipple);
        unmergeBtn.addEventListener('click', () => {
            const tableBody = document.getElementById(Config.EVENTS_TABLE_BODY_ID);
            if (!tableBody) return;
            const selectedCheckbox = tableBody.querySelector('input[type="checkbox"]:checked'); 
            if (selectedCheckbox) {
                const eventIdToUnmerge = selectedCheckbox.dataset.eventId;
                const result = PressureEventManager.handleUnmergeAutomatedEvent(eventIdToUnmerge, UIRenderer.showNotification);
                if (result.success) {
                    currentAutomatedEvents = PressureEventManager.getAllAutomatedEvents();
                     if (result.highlightNeedsClear) currentlyHighlightedAutomatedEventId = null;
                    rerenderAutomatedEventsUI();
                }
            }
        });
    }

    showAllEventsBtn = document.getElementById(Config.SHOW_ALL_EVENTS_BTN_ID);
    if (showAllEventsBtn) {
        showAllEventsBtn.addEventListener('click', createRipple);
        showAllEventsBtn.addEventListener('click', toggleShowAllEventsDisplay);
    }
}

// DOMContentLoaded listener is the main entry point
document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    UIRenderer.setCurrentHighlightHandler(handleAutomatedEventRowClick);
    setupEventListeners(); 

    currentThemeId = db.loadData(Config.THEME_STORAGE_KEY) || Config.DEFAULT_THEME_ID;
    eventMigraineLogs = db.loadData(Config.EVENT_MIGRAINE_LOGS_KEY) || {};
    
    const persistedToggleState = db.loadData(Config.SHOW_ALL_EVENTS_TOGGLE_STATE_KEY);
    if (typeof persistedToggleState === 'boolean') {
        isShowAllEventsOnChartActive = persistedToggleState;
    }
    UIRenderer.updateShowAllEventsButtonState(isShowAllEventsOnChartActive); // Set initial button state

    const cachedData = db.loadData(Config.CACHED_PRESSURE_DATA_KEY);
    if (cachedData && cachedData.times && cachedData.values) {
        UIRenderer.showNotification("Displaying cached pressure data.", "info", 2000);
        currentPressureHourlyTimes = cachedData.times;
        currentPressureHourlyValues = cachedData.values;
        currentPressureDataSourceInfo = cachedData.sourceInfo;
        applyTheme(currentThemeId); 
    } else {
        applyTheme(currentThemeId); 
        if (!currentPressureHourlyTimes.length) { 
            initiateFreshDataLoad();
        }
    }
    
    updateMergeUnmergeButtonStates();
});

// filename: js/app.js