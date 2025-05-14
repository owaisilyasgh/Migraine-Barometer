// js/app.js
import * as ChartManager from './chartManager.js';
import db from './db.js';
import * as Config from './config.js';
import * as PressureEventManager from './pressureEventManager.js';
import * as UIRenderer from './uiRenderer.js';
import { createRipple } from './utils.js';

// Module-level state
let currentPressureHourlyTimes = null;
let currentPressureHourlyValues = null;
let currentPressureDataSourceInfo = null;
let currentAutomatedEvents = null;
let eventMigraineLogs = {};
let currentlyHighlightedAutomatedEventId = null;
let currentThemeId = Config.DEFAULT_THEME_ID;

// Define functions once at the top level of the module scope

function registerServiceWorker() { // Defined ONCE
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('SW registered:', registration.scope))
            .catch(error => console.error('SW registration failed:', error));
    }
}

function applyTheme(themeId) { // Defined ONCE
    currentThemeId = themeId;
    db.saveData(Config.THEME_STORAGE_KEY, themeId);
    const selectedTheme = Config.THEMES.find(t => t.id === themeId);
    const oldThemeScript = document.getElementById(Config.DYNAMIC_THEME_SCRIPT_ID);
    if (oldThemeScript) oldThemeScript.remove();

    if (Highcharts) {
        Highcharts.setOptions(ChartManager.HIGHCHARTS_EXPLICIT_DEFAULT_STYLES);
        Highcharts.setOptions(ChartManager.BASE_HIGHCHARTS_OPTIONS);
    }

    const finalizeThemeAndProcessData = () => {
        if (Highcharts && selectedTheme && selectedTheme.url) {
            Highcharts.setOptions(ChartManager.BASE_HIGHCHARTS_OPTIONS);
        }
        if (currentPressureHourlyTimes && currentPressureHourlyValues) {
            ChartManager.destroyChart();
            processAndDisplayPressureData(currentPressureHourlyTimes, currentPressureHourlyValues);
        } else {
            initiateFreshDataLoad();
        }
    };

    if (selectedTheme && selectedTheme.url) {
        UIRenderer.showNotification(`Loading ${selectedTheme.name} theme...`, "info", 2000);
        const script = document.createElement('script');
        script.id = Config.DYNAMIC_THEME_SCRIPT_ID;
        script.src = selectedTheme.url;
        script.onload = () => {
            UIRenderer.showNotification(`${selectedTheme.name} theme applied.`, "success", 1500);
            finalizeThemeAndProcessData();
        };
        script.onerror = () => {
            UIRenderer.showNotification(`Error loading ${selectedTheme.name}. Reverting to Default.`, "error");
            currentThemeId = Config.DEFAULT_THEME_ID;
            db.saveData(Config.THEME_STORAGE_KEY, currentThemeId);
            finalizeThemeAndProcessData();
        };
        document.head.appendChild(script);
    } else {
        finalizeThemeAndProcessData();
    }
}

async function fetchPressureDataFromAPI(latitude, longitude) { // Defined ONCE
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

async function fetchPressureDataFromMock() { // Defined ONCE
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

async function initiateFreshDataLoad() { // Defined ONCE
    UIRenderer.showNotification("Fetching latest pressure data...", "info", 2500);
    let pressureDataJson = null;
    let sourceInfo = { type: 'unknown', fetchTimestamp: Date.now() };

    if (Config.USE_LIVE_DATA) {
        sourceInfo.type = 'api';
        if ('geolocation' in navigator) {
            try {
                const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
                sourceInfo.lat = position.coords.latitude;
                sourceInfo.lon = position.coords.longitude;
                pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon);
            } catch (geoError) {
                UIRenderer.showNotification(`Geolocation failed: ${geoError.message}. Using default.`, "warning", 4000);
                sourceInfo.lat = Config.DEFAULT_LATITUDE; sourceInfo.lon = Config.DEFAULT_LONGITUDE;
                pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon);
            }
        } else {
            UIRenderer.showNotification("Geolocation N/A. Using default.", "warning", 4000);
            sourceInfo.lat = Config.DEFAULT_LATITUDE; sourceInfo.lon = Config.DEFAULT_LONGITUDE;
            pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon);
        }
        if (!pressureDataJson) {
            UIRenderer.showNotification("Live data failed. Using mock as fallback.", "warning", 3000);
            sourceInfo.type = 'mock-fallback'; pressureDataJson = await fetchPressureDataFromMock();
        }
    } else {
        sourceInfo.type = 'mock'; pressureDataJson = await fetchPressureDataFromMock();
    }

    if (pressureDataJson && pressureDataJson.hourly && pressureDataJson.hourly.time && pressureDataJson.hourly.surface_pressure) {
        currentPressureHourlyTimes = pressureDataJson.hourly.time;
        currentPressureHourlyValues = pressureDataJson.hourly.surface_pressure;
        currentPressureDataSourceInfo = sourceInfo;
        db.saveData(Config.CACHED_PRESSURE_DATA_KEY, { times: currentPressureHourlyTimes, values: currentPressureHourlyValues, sourceInfo: currentPressureDataSourceInfo });
        processAndDisplayPressureData(currentPressureHourlyTimes, currentPressureHourlyValues);
    } else {
        UIRenderer.showNotification("Failed to load any pressure data.", "error");
        ChartManager.destroyChart();
        const tableBody = document.getElementById(Config.EVENTS_TABLE_BODY_ID)?.getElementsByTagName('tbody')[0];
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="9">No pressure data available.</td></tr>';
        db.removeData(Config.CACHED_PRESSURE_DATA_KEY);
        currentPressureHourlyTimes = null; currentPressureHourlyValues = null; currentPressureDataSourceInfo = null;
    }
    UIRenderer.updateAutomatedEventActionButtonsState();
}

function processAndDisplayPressureData(times, values) { // Defined ONCE
    if (!times || !values) {
        UIRenderer.showNotification("No data to display.", "error");
        ChartManager.destroyChart();
        const tableBody = document.getElementById(Config.EVENTS_TABLE_BODY_ID)?.getElementsByTagName('tbody')[0];
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="9">No pressure data to display.</td></tr>';
        return;
    }
    const chartInstance = ChartManager.initializeChart(times, values, Config.THEMES, currentThemeId, applyTheme);
    if (chartInstance) {
        currentAutomatedEvents = PressureEventManager.detectAndStoreAutomatedPressureEvents(times, values, UIRenderer.showNotification, ChartManager.updateChartPlotBand);
        rerenderAutomatedEventsUI();
    } else {
        UIRenderer.showNotification("Error initializing chart.", "error");
    }
}

function handleEventMigraineChange(eventId, selectElement) { // Defined ONCE
    const newSeverity = selectElement.value;
    if (newSeverity === "none" || newSeverity === "") {
        if (eventMigraineLogs[eventId]) {
            delete eventMigraineLogs[eventId];
            db.saveData(Config.EVENT_MIGRAINE_LOGS_KEY, eventMigraineLogs);
            UIRenderer.showNotification("Migraine log cleared for event.", "info", 1500);
        }
    } else {
        eventMigraineLogs[eventId] = { severity: newSeverity, loggedAt: Date.now() };
        db.saveData(Config.EVENT_MIGRAINE_LOGS_KEY, eventMigraineLogs);
        UIRenderer.showNotification(`Migraine as '${newSeverity}' logged for event.`, "success", 1500);
    }
}

function rerenderAutomatedEventsUI() { // Defined ONCE
    UIRenderer.renderAutomatedEventsTable(
        currentAutomatedEvents || [],
        currentlyHighlightedAutomatedEventId,
        handleAutomatedEventRowClick,
        UIRenderer.updateAutomatedEventActionButtonsState,
        eventMigraineLogs,
        handleEventMigraineChange
    );
}

function handleAutomatedEventRowClick(eventId, clickedRowElement) { // Defined ONCE
    const allEvents = currentAutomatedEvents || [];
    const eventData = allEvents.find(e => e.id === eventId);
    if (currentlyHighlightedAutomatedEventId === eventId) {
        currentlyHighlightedAutomatedEventId = null;
        ChartManager.updateChartPlotBand(null);
        if (clickedRowElement) clickedRowElement.classList.remove('highlighted-automated-event-row');
    } else {
        currentlyHighlightedAutomatedEventId = eventId;
        if (eventData) ChartManager.updateChartPlotBand({ startTime: eventData.startTime, endTime: eventData.endTime });
        else ChartManager.updateChartPlotBand(null);
        document.querySelectorAll(`#${Config.EVENTS_TABLE_BODY_ID} tbody tr.highlighted-automated-event-row`).forEach(row => row.classList.remove('highlighted-automated-event-row'));
        if (clickedRowElement) clickedRowElement.classList.add('highlighted-automated-event-row');
    }
    UIRenderer.updateAutomatedEventActionButtonsState();
}

function setupEventListeners() { // Defined ONCE
    const mergeBtn = document.getElementById(Config.MERGE_EVENTS_BTN_ID);
    if (mergeBtn) {
        mergeBtn.addEventListener('click', createRipple);
        mergeBtn.addEventListener('click', () => {
            if (PressureEventManager.handleMergeAutomatedEvents(() => currentlyHighlightedAutomatedEventId, UIRenderer.showNotification, ChartManager.updateChartPlotBand)) {
                currentlyHighlightedAutomatedEventId = null;
            }
            currentAutomatedEvents = PressureEventManager.getAllAutomatedEvents();
            rerenderAutomatedEventsUI();
        });
    }

    const unmergeBtn = document.getElementById(Config.UNMERGE_EVENT_BTN_ID);
    if (unmergeBtn) {
        unmergeBtn.addEventListener('click', createRipple);
        unmergeBtn.addEventListener('click', () => {
            if (PressureEventManager.handleUnmergeAutomatedEvent(() => currentlyHighlightedAutomatedEventId, UIRenderer.showNotification, ChartManager.updateChartPlotBand)) {
                currentlyHighlightedAutomatedEventId = null;
            }
            currentAutomatedEvents = PressureEventManager.getAllAutomatedEvents();
            rerenderAutomatedEventsUI();
        });
    }
}


// DOMContentLoaded listener is the main entry point
document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker(); // Call the single definition
    setupEventListeners(); // Call the single definition
    UIRenderer.setCurrentHighlightHandler(handleAutomatedEventRowClick);

    currentThemeId = db.loadData(Config.THEME_STORAGE_KEY) || Config.DEFAULT_THEME_ID;
    eventMigraineLogs = db.loadData(Config.EVENT_MIGRAINE_LOGS_KEY) || {};

    const cachedData = db.loadData(Config.CACHED_PRESSURE_DATA_KEY);
    if (cachedData && cachedData.times && cachedData.values && cachedData.sourceInfo) {
        currentPressureHourlyTimes = cachedData.times;
        currentPressureHourlyValues = cachedData.values;
        currentPressureDataSourceInfo = cachedData.sourceInfo;
        UIRenderer.showNotification("Displaying cached pressure data.", "info", 2000);
        applyTheme(currentThemeId); // Call the single definition
    } else {
        applyTheme(currentThemeId); // Call the single definition
    }
});
// filename: js/app.js