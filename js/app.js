// js/app.js
import * as ChartManager from './chartManager.js';
import db from './db.js';
import * as Config from './config.js';
import * as PressureEventManager from './pressureEventManager.js';
import * as UIRenderer from './uiRenderer.js';

// Module-level state for current data
let currentPressureHourlyTimes = null;
let currentPressureHourlyValues = null;
let currentPressureDataSourceInfo = null; // { type: 'api'/'mock', lat?, lon?, fetchTimestamp: Date.now() }
let currentAutomatedEvents = null;

let currentlyHighlightedAutomatedEventId = null;
let currentThemeId = Config.DEFAULT_THEME_ID;

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Cache Check] DOMContentLoaded: Initializing application.");
    registerServiceWorker();
    setupEventListeners();
    UIRenderer.setCurrentHighlightHandler(handleAutomatedEventRowClick);
    UIRenderer.loadAndDisplayMigraines(db);

    currentThemeId = db.loadData(Config.THEME_STORAGE_KEY) || Config.DEFAULT_THEME_ID;
    console.log(`[Cache Check] Initial theme ID: ${currentThemeId}`);

    const cachedData = db.loadData(Config.CACHED_PRESSURE_DATA_KEY);
    // --- Enhanced Logging for Cache Retrieval ---
    if (cachedData) {
        console.log("[Cache Check] Raw cachedData object retrieved from localStorage:", JSON.parse(JSON.stringify(cachedData)));
        if (cachedData.times && cachedData.values && cachedData.sourceInfo) {
            console.log("[Cache Check] Valid cached data structure found.");
            console.log(`[Cache Check] Cached data source: ${cachedData.sourceInfo.type}, Fetched at: ${new Date(cachedData.sourceInfo.fetchTimestamp).toLocaleString()}`);
            currentPressureHourlyTimes = cachedData.times;
            currentPressureHourlyValues = cachedData.values;
            currentPressureDataSourceInfo = cachedData.sourceInfo;
            console.log("[Cache Check] currentPressureHourlyTimes populated from cache:", currentPressureHourlyTimes ? `Array with ${currentPressureHourlyTimes.length} items` : null);
            console.log("[Cache Check] currentPressureHourlyValues populated from cache:", currentPressureHourlyValues ? `Array with ${currentPressureHourlyValues.length} items` : null);
            console.log("[Cache Check] currentPressureDataSourceInfo populated from cache:", currentPressureDataSourceInfo);
            UIRenderer.showNotification("Displaying cached pressure data.", "info", 2000);
            applyTheme(currentThemeId);
        } else {
            console.warn("[Cache Check] Cached data found but structure is invalid. Proceeding to fresh load.", cachedData);
            db.removeData(Config.CACHED_PRESSURE_DATA_KEY); // Clear invalid cache
            applyTheme(currentThemeId);
        }
    } else {
        console.log("[Cache Check] No cached data found in localStorage. Proceeding to fresh load.");
        applyTheme(currentThemeId);
    }
    // --- End Enhanced Logging ---
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('SW registered:', registration.scope))
            .catch(error => console.error('SW registration failed:', error));
    }
}

function applyTheme(themeId) {
    console.log(`[Theme Apply] Called for themeId: ${themeId}`);
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
        // --- Enhanced Logging for finalizeThemeAndProcessData ---
        console.log("[Theme Apply/finalize] currentPressureHourlyTimes:", currentPressureHourlyTimes ? `Array with ${currentPressureHourlyTimes.length} items` : null);
        console.log("[Theme Apply/finalize] currentPressureHourlyValues:", currentPressureHourlyValues ? `Array with ${currentPressureHourlyValues.length} items` : null);
        // --- End Enhanced Logging ---

        if (Highcharts && selectedTheme && selectedTheme.url) {
            Highcharts.setOptions(ChartManager.BASE_HIGHCHARTS_OPTIONS);
        }
        if (currentPressureHourlyTimes && currentPressureHourlyValues) {
            console.log("[Theme Apply/finalize] Data in memory. Re-rendering chart with existing data for new theme.");
            ChartManager.destroyChart();
            processAndDisplayPressureData(currentPressureHourlyTimes, currentPressureHourlyValues);
        } else {
            console.log("[Theme Apply/finalize] No data in memory. Initiating fresh data load.");
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
        console.log(`[Theme Apply] Applying ${selectedTheme ? selectedTheme.name : 'Default (or invalid)'} theme (no external script).`);
        finalizeThemeAndProcessData();
    }
}

async function initiateFreshDataLoad() {
    console.log("[Data Load] initiateFreshDataLoad: Starting fresh data fetch.");
    UIRenderer.showNotification("Fetching latest pressure data...", "info", 2500);
    let pressureDataJson = null;
    let sourceInfo = { type: 'unknown', fetchTimestamp: Date.now() };

    if (Config.USE_LIVE_DATA) {
        sourceInfo.type = 'api';
        console.log("[Data Load] Attempting API fetch.");
        if ('geolocation' in navigator) {
            try {
                const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
                sourceInfo.lat = position.coords.latitude;
                sourceInfo.lon = position.coords.longitude;
                console.log(`[Data Load] Geolocation success: Lat ${sourceInfo.lat}, Lon ${sourceInfo.lon}`);
                pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon);
            } catch (geoError) {
                UIRenderer.showNotification(`Geolocation failed: ${geoError.message}. Using default.`, "warning", 4000);
                console.warn(`[Data Load] Geolocation error: ${geoError.message}. Using default coordinates.`);
                sourceInfo.lat = Config.DEFAULT_LATITUDE;
                sourceInfo.lon = Config.DEFAULT_LONGITUDE;
                pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon);
            }
        } else {
            UIRenderer.showNotification("Geolocation N/A. Using default location.", "warning", 4000);
            console.log("[Data Load] Geolocation not available. Using default coordinates.");
            sourceInfo.lat = Config.DEFAULT_LATITUDE;
            sourceInfo.lon = Config.DEFAULT_LONGITUDE;
            pressureDataJson = await fetchPressureDataFromAPI(sourceInfo.lat, sourceInfo.lon);
        }
        if (!pressureDataJson) {
            UIRenderer.showNotification("Live data fetch failed. Using mock data as fallback.", "warning", 3000);
            console.warn("[Data Load] API fetch failed. Falling back to mock data.");
            sourceInfo.type = 'mock-fallback';
            pressureDataJson = await fetchPressureDataFromMock();
        }
    } else {
        sourceInfo.type = 'mock';
        console.log("[Data Load] USE_LIVE_DATA is false. Fetching mock data.");
        pressureDataJson = await fetchPressureDataFromMock();
    }

    if (pressureDataJson && pressureDataJson.hourly && pressureDataJson.hourly.time && pressureDataJson.hourly.surface_pressure) {
        currentPressureHourlyTimes = pressureDataJson.hourly.time;
        currentPressureHourlyValues = pressureDataJson.hourly.surface_pressure;
        currentPressureDataSourceInfo = sourceInfo;

        console.log(`[Data Load] New data fetched from ${sourceInfo.type}. Caching data at ${new Date(sourceInfo.fetchTimestamp).toLocaleTimeString()}.`);
        db.saveData(Config.CACHED_PRESSURE_DATA_KEY, {
            times: currentPressureHourlyTimes,
            values: currentPressureHourlyValues,
            sourceInfo: currentPressureDataSourceInfo
        });
        processAndDisplayPressureData(currentPressureHourlyTimes, currentPressureHourlyValues);
    } else {
        UIRenderer.showNotification("Failed to load any pressure data. Chart cannot be displayed.", "error");
        console.error("[Data Load] Failed to load any pressure data (API or mock).");
        ChartManager.destroyChart();
        const tableBody = document.getElementById(Config.EVENTS_TABLE_BODY_ID)?.getElementsByTagName('tbody')[0];
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="8">No pressure data available.</td></tr>';
        db.removeData(Config.CACHED_PRESSURE_DATA_KEY);
        currentPressureHourlyTimes = null;
        currentPressureHourlyValues = null;
        currentPressureDataSourceInfo = null;
    }
    UIRenderer.updateAutomatedEventActionButtonsState();
}

function processAndDisplayPressureData(times, values) {
    console.log("[Display Process] processAndDisplayPressureData: Rendering chart and events table with data.");
    if (!times || !values) {
        console.error("[Display Process] No times or values provided to processAndDisplayPressureData.");
        UIRenderer.showNotification("No data to display on chart.", "error");
        ChartManager.destroyChart();
        const tableBody = document.getElementById(Config.EVENTS_TABLE_BODY_ID)?.getElementsByTagName('tbody')[0];
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="8">No pressure data to display.</td></tr>';
        return;
    }
    const chartInstance = ChartManager.initializeChart(
        times,
        values,
        Config.THEMES,
        currentThemeId,
        applyTheme
    );
    if (chartInstance) {
        currentAutomatedEvents = PressureEventManager.detectAndStoreAutomatedPressureEvents(
            times,
            values,
            UIRenderer.showNotification,
            ChartManager.updateChartPlotBand
        );
        rerenderAutomatedEventsUI();
    } else {
        console.error("[Display Process] ChartManager.initializeChart returned null.");
        UIRenderer.showNotification("Error initializing chart with current data.", "error");
    }
}

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

function rerenderAutomatedEventsUI() {
    UIRenderer.renderAutomatedEventsTable(currentAutomatedEvents || [], currentlyHighlightedAutomatedEventId, handleAutomatedEventRowClick, UIRenderer.updateAutomatedEventActionButtonsState);
}

function handleAutomatedEventRowClick(eventId, clickedRowElement) {
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

function setupEventListeners() {
    const migraineForm = document.getElementById(Config.MIGRAINE_FORM_ID);
    if (migraineForm) migraineForm.addEventListener('submit', handleMigraineSubmit);
    const mergeBtn = document.getElementById(Config.MERGE_EVENTS_BTN_ID);
    if (mergeBtn) mergeBtn.addEventListener('click', () => {
        if (PressureEventManager.handleMergeAutomatedEvents(() => currentlyHighlightedAutomatedEventId, UIRenderer.showNotification, ChartManager.updateChartPlotBand)) {
            currentlyHighlightedAutomatedEventId = null;
        }
        currentAutomatedEvents = PressureEventManager.getAllAutomatedEvents();
        rerenderAutomatedEventsUI();
    });
    const unmergeBtn = document.getElementById(Config.UNMERGE_EVENT_BTN_ID);
    if (unmergeBtn) unmergeBtn.addEventListener('click', () => {
        if (PressureEventManager.handleUnmergeAutomatedEvent(() => currentlyHighlightedAutomatedEventId, UIRenderer.showNotification, ChartManager.updateChartPlotBand)) {
            currentlyHighlightedAutomatedEventId = null;
        }
        currentAutomatedEvents = PressureEventManager.getAllAutomatedEvents();
        rerenderAutomatedEventsUI();
    });
}

function handleMigraineSubmit(event) {
    event.preventDefault();
    const startTimeInput = document.getElementById(Config.MIGRAINE_START_TIME_ID);
    const endTimeInput = document.getElementById(Config.MIGRAINE_END_TIME_ID);
    if (!startTimeInput.value || !endTimeInput.value) { UIRenderer.showNotification("Please select both start and end times.", "error"); return; }
    const startTimeUnix = Math.floor(new Date(startTimeInput.value).getTime() / 1000);
    const endTimeUnix = Math.floor(new Date(endTimeInput.value).getTime() / 1000);
    if (endTimeUnix <= startTimeUnix) { UIRenderer.showNotification("End time cannot be before or same as start time.", "error"); return; }
    const newMigraine = { id: `migraine_${Date.now()}`, startTime: startTimeUnix, endTime: endTimeUnix };
    const migraines = db.loadData('migraines') || [];
    migraines.push(newMigraine);
    db.saveData('migraines', migraines);
    UIRenderer.loadAndDisplayMigraines(db);
    if (migraineForm) migraineForm.reset();
    UIRenderer.showNotification("Migraine event logged!", "success");
}
// filename: js/app.js