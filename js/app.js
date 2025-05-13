// js/app.js
import * as ChartManager from './chartManager.js';
import db from './db.js';
import * as Config from './config.js';
import * as PressureEventManager from './pressureEventManager.js';
import * as UIRenderer from './uiRenderer.js';

// Application state
let currentlyHighlightedAutomatedEventId = null;

document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    setupEventListeners();
    UIRenderer.setCurrentHighlightHandler(handleAutomatedEventRowClick);
    UIRenderer.loadAndDisplayMigraines(db);
    loadPressureData(); // Initial load of pressure data
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('Service Worker registered with scope:', registration.scope))
            .catch(error => console.error('Service Worker registration failed:', error));
    }
}

async function fetchPressureDataFromAPI(latitude, longitude) {
    // Log the coordinates being used for this specific API call
    console.log(`[GPS Info] Calling API with Latitude: ${latitude}, Longitude: ${longitude}`);
    const apiUrl = Config.API_URL_TEMPLATE
        .replace('{LAT}', latitude)
        .replace('{LON}', longitude);
    UIRenderer.showNotification("Fetching live pressure data...", "info", 5000);
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API error! status: ${response.status}`);
        }
        const data = await response.json();
        UIRenderer.showNotification("Live pressure data fetched successfully!", "success", 2000);
        return data;
    } catch (error) {
        console.error('Error fetching live pressure data:', error);
        UIRenderer.showNotification(`Error fetching live data: ${error.message}. Check console.`, "error");
        return null;
    }
}

async function fetchPressureDataFromMock() {
    UIRenderer.showNotification("Fetching mock pressure data...", "info", 3000);
    try {
        const response = await fetch(Config.MOCK_DATA_PATH);
        if (!response.ok) {
            throw new Error(`Mock data HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        UIRenderer.showNotification("Mock pressure data loaded.", "success", 1500);
        return data;
    } catch (error) {
        console.error('Error fetching mock pressure data:', error);
        UIRenderer.showNotification(`Error loading mock data: ${error.message}. Check console.`, "error");
        return null;
    }
}


async function loadPressureData() {
    let pressureDataJson = null;
    let finalLatitude = Config.DEFAULT_LATITUDE; // Initialize with defaults
    let finalLongitude = Config.DEFAULT_LONGITUDE;

    if (Config.USE_LIVE_DATA) {
        if ('geolocation' in navigator) {
            UIRenderer.showNotification("Attempting to get your location...", "info", 4000);
            console.log("[GPS Info] Attempting geolocation...");
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
                });
                finalLatitude = position.coords.latitude;
                finalLongitude = position.coords.longitude;
                console.log(`[GPS Info] Geolocation successful. Latitude: ${finalLatitude}, Longitude: ${finalLongitude}`);
                pressureDataJson = await fetchPressureDataFromAPI(finalLatitude, finalLongitude);

                if (!pressureDataJson) { // Fallback if API call failed with user location
                    UIRenderer.showNotification("Failed to fetch live data with your location. Trying default location.", "info", 4000);
                    console.log("[GPS Info] API call with geolocated coords failed. Falling back to default coordinates for API.");
                    finalLatitude = Config.DEFAULT_LATITUDE; // Reset to default for the next attempt
                    finalLongitude = Config.DEFAULT_LONGITUDE;
                    pressureDataJson = await fetchPressureDataFromAPI(finalLatitude, finalLongitude);
                }
            } catch (geoError) {
                console.warn('[GPS Info] Geolocation error:', geoError.message);
                UIRenderer.showNotification(`Geolocation failed: ${geoError.message}. Using default location for live data.`, "warning", 5000);
                console.log("[GPS Info] Falling back to default coordinates for API due to geolocation error.");
                // finalLatitude and finalLongitude are already set to default initially, so they remain default.
                pressureDataJson = await fetchPressureDataFromAPI(finalLatitude, finalLongitude);
            }
        } else {
            UIRenderer.showNotification("Geolocation is not available. Using default location for live data.", "warning", 5000);
            console.log("[GPS Info] Geolocation not available in navigator. Using default coordinates for API.");
            // finalLatitude and finalLongitude are already set to default initially.
            pressureDataJson = await fetchPressureDataFromAPI(finalLatitude, finalLongitude);
        }
        // If live data fetch (even with defaults) fails, as a final fallback, try mock data
        if (!pressureDataJson) {
            UIRenderer.showNotification("Live data failed. Attempting to load mock data as fallback.", "warning", 4000);
            console.log("[GPS Info] All live data attempts failed. Falling back to mock data.");
            pressureDataJson = await fetchPressureDataFromMock();
        }
    } else {
        console.log("[GPS Info] USE_LIVE_DATA is false. Using mock data.");
        pressureDataJson = await fetchPressureDataFromMock();
    }

    if (pressureDataJson && pressureDataJson.hourly && pressureDataJson.hourly.time && pressureDataJson.hourly.surface_pressure) {
        const hourlyTimes = pressureDataJson.hourly.time;
        const hourlyPressures = pressureDataJson.hourly.surface_pressure;

        const chartInstance = ChartManager.initializeChart(hourlyTimes, hourlyPressures);
        if (!chartInstance) {
            UIRenderer.showNotification("Error: Could not initialize pressure chart.", "error");
        } else {
            PressureEventManager.detectAndStoreAutomatedPressureEvents(hourlyTimes, hourlyPressures, UIRenderer.showNotification, ChartManager.updateChartPlotBand);
            rerenderAutomatedEventsUI();
            UIRenderer.showNotification("Pressure data loaded and chart updated.", "info", 2000);
        }
    } else {
        console.error("No hourly data available, data is malformed, or failed to fetch any data.");
        UIRenderer.showNotification("Error: No pressure data loaded or data is malformed. Chart cannot be displayed.", "error");
        ChartManager.destroyChart();
        const tableElement = document.getElementById(Config.EVENTS_TABLE_BODY_ID);
        const autoTableBody = tableElement ? tableElement.getElementsByTagName('tbody')[0] : null;
        if (autoTableBody) autoTableBody.innerHTML = '<tr><td colspan="6">No pressure data available.</td></tr>';
    }
    UIRenderer.updateAutomatedEventActionButtonsState();
}


function rerenderAutomatedEventsUI() {
    UIRenderer.renderAutomatedEventsTable(
        PressureEventManager.getAllAutomatedEvents(),
        currentlyHighlightedAutomatedEventId,
        handleAutomatedEventRowClick,
        UIRenderer.updateAutomatedEventActionButtonsState
    );
}

function handleAutomatedEventRowClick(eventId, clickedRowElement) {
    const allEvents = PressureEventManager.getAllAutomatedEvents();
    const eventData = allEvents.find(e => e.id === eventId);

    if (currentlyHighlightedAutomatedEventId === eventId) {
        currentlyHighlightedAutomatedEventId = null;
        ChartManager.updateChartPlotBand(null);
        if (clickedRowElement) clickedRowElement.classList.remove('highlighted-automated-event-row');
    } else {
        currentlyHighlightedAutomatedEventId = eventId;
        if (eventData) {
            ChartManager.updateChartPlotBand({ startTime: eventData.startTime, endTime: eventData.endTime });
        } else {
            ChartManager.updateChartPlotBand(null);
        }
        document.querySelectorAll(`#${Config.EVENTS_TABLE_BODY_ID} tbody tr.highlighted-automated-event-row`).forEach(row => {
            row.classList.remove('highlighted-automated-event-row');
        });
        if (clickedRowElement) clickedRowElement.classList.add('highlighted-automated-event-row');
    }
    UIRenderer.updateAutomatedEventActionButtonsState();
}

function setupEventListeners() {
    const migraineForm = document.getElementById(Config.MIGRAINE_FORM_ID);
    if (migraineForm) migraineForm.addEventListener('submit', handleMigraineSubmit);

    const mergeBtn = document.getElementById(Config.MERGE_EVENTS_BTN_ID);
    if (mergeBtn) mergeBtn.addEventListener('click', () => {
        const highlightCleared = PressureEventManager.handleMergeAutomatedEvents(
            () => currentlyHighlightedAutomatedEventId,
            UIRenderer.showNotification,
            ChartManager.updateChartPlotBand
        );
        if (highlightCleared) {
            currentlyHighlightedAutomatedEventId = null;
        }
        rerenderAutomatedEventsUI();
    });

    const unmergeBtn = document.getElementById(Config.UNMERGE_EVENT_BTN_ID);
    if (unmergeBtn) unmergeBtn.addEventListener('click', () => {
        const highlightCleared = PressureEventManager.handleUnmergeAutomatedEvent(
            () => currentlyHighlightedAutomatedEventId,
            UIRenderer.showNotification,
            ChartManager.updateChartPlotBand
        );
        if (highlightCleared) {
            currentlyHighlightedAutomatedEventId = null;
        }
        rerenderAutomatedEventsUI();
    });
}

function handleMigraineSubmit(event) {
    event.preventDefault();
    const startTimeInput = document.getElementById(Config.MIGRAINE_START_TIME_ID);
    const endTimeInput = document.getElementById(Config.MIGRAINE_END_TIME_ID);

    if (!startTimeInput.value || !endTimeInput.value) {
        UIRenderer.showNotification("Please select both start and end times for the migraine.", "error");
        return;
    }

    const startTimeUnix = Math.floor(new Date(startTimeInput.value).getTime() / 1000);
    const endTimeUnix = Math.floor(new Date(endTimeInput.value).getTime() / 1000);

    if (endTimeUnix <= startTimeUnix) {
        UIRenderer.showNotification("Migraine end time cannot be before or same as start time.", "error");
        return;
    }

    const newMigraine = {
        id: `migraine_${Date.now()}`,
        startTime: startTimeUnix,
        endTime: endTimeUnix,
    };

    const migraines = db.loadData('migraines') || [];
    migraines.push(newMigraine);
    db.saveData('migraines', migraines);

    UIRenderer.loadAndDisplayMigraines(db);
    if(migraineForm) migraineForm.reset();
    UIRenderer.showNotification("Migraine event logged!", "success");
}
// filename: js/app.js